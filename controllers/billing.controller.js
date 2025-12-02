import DailyMilkEntry from '../models/MilkRecord.js';
import Customer from '../models/Customer.js';
import Billing from '../models/Bill.js';
import getNextSequence from '../utils/getNextSequence.js';

export const getCustomers = async (req, res) => {
    try {
        const customers = await Customer.find({ isActive: true }).sort({ deliverySequence: 1 });
        res.status(200).json({
            success: true,
            count: customers.length,
            data: customers,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error: Could not fetch customers.' });
    }
};

export const getMilkEntryDetails = async (req, res) => {
    const { customerId, month } = req.query;
    const start = new Date(`${month}-01T00:00:00Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const entries = await DailyMilkEntry.find({
        customerId,
        date: { $gte: start, $lt: end }
    }).sort({ date: 1 });

    res.json(entries);
};

export const updateMilkEntries = async (req, res) => {
  try {
    const { customerId, month, milkEntries } = req.body;

    if (!customerId || !month || !Array.isArray(milkEntries)) {
      return res.status(400).json({
        success: false,
        message: 'customerId, month and milkEntries are required'
      });
    }

    const monthStart = new Date(`${month}-01T00:00:00.000Z`);
    
    const bulkOps = milkEntries.map(e => {
      const day = e.date;       // 1..31 from frontend
      if (!day) return null;    // ignore bad rows

      const entryDate = new Date(monthStart);
      entryDate.setUTCDate(day);       // keep month/year, change day
      entryDate.setUTCHours(0, 0, 0, 0);

      return {
        updateOne: {
          filter: {
            customerId,
            date: entryDate
          },
          update: {
            $set: {
              customerId,
              date: entryDate,
              morningMilk: e.morning ?? 0,
              eveningMilk: e.evening ?? 0,
              totalMilk: e.total ?? (Number(e.morning || 0) + Number(e.evening || 0)),
              amount: e.amount ?? 0,
              milkType: e.milkType,     // optional: pass from FE or fetch from Customer
              pricePerLiter: e.pricePerLiter
            }
          },
          upsert: true
        }
      };
    }).filter(Boolean);

    if (!bulkOps.length) {
      return res.status(400).json({
        success: false,
        message: 'No valid entries to update'
      });
    }

    const result = await DailyMilkEntry.bulkWrite(bulkOps);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Milk entries updated/inserted successfully'
    });
  } catch (err) {
    console.error('Error updating milk entries:', err);
    return res.status(500).json({
      success: false,
      message: 'Server Error: Could not update milk entries.'
    });
  }
};

export const getBillByCustomerAndMonth = async (req, res) => {
  try {
    const { customerId, month } = req.params;
    const bill = await Billing.findOne({ customerId, month });

    if (!bill) {
      return res.status(200).json({ success: false, data: null, message: 'Bill not found.' });
    }

    res.status(200).json({ success: true, data: bill });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error: Could not fetch bill.' });
  }
};

export const createBill = async (req, res) => {
  try {
    const { customerId, month } = req.body;

    const existing = await Billing.findOne({ customerId, month });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Bill already exists for this customer and month',
        data: existing
      });
    }

    const nextBillNo = await getNextSequence('billingId');
    const billNumber = `BILL-${nextBillNo.toString().padStart(4, '0')}`;

    const bill = new Billing({
      billNumber,
      customerId: req.body.customerId,
      customerName: req.body.customerName,
      month: req.body.month,
      milkType: req.body.milkType,
      ratePerLiter: req.body.ratePerLiter,
      totalMilk: req.body.totalMilk,
      totalAmount: req.body.totalAmount,
      isPaid: false,
      milkEntries: req.body.milkEntries
    });

    await bill.save();

    res.status(201).json({
      success: true,
      message: 'Bill generated successfully',
      data: bill,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Bill already exists for this customer and month',
      });
    }

    console.error('Error generating bill:', err);
    res.status(500).json({ success: false, message: 'Error generating bill' });
  }
};

export const getAllBills = async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: bills.length,
      data: bills
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error: Could not fetch bills.' });
  }
};

export const updateBill = async (req, res) => {
  try {
    const { customerId, month, milkEntries } = req.body;

    // 1) Update BILL document
    const bill = await Billing.findOneAndUpdate(
      { _id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found.' });
    }

    // 2) Option A: just update the Bill, nothing in DailyMilkEntry
    // return res.status(200).json({ success: true, data: bill, message: 'Bill updated successfully.' });

    // 2) Option B: if you really want to sync DailyMilkEntry too, do it entry‑by‑entry:
    if (customerId && month && Array.isArray(milkEntries)) {
      const monthStart = new Date(`${month}-01T00:00:00.000Z`);
      
      const bulkOps = milkEntries.map(e => {
        const day = e.date;
        if (!day) return null;

        const entryDate = new Date(monthStart);
        entryDate.setUTCDate(day);
        entryDate.setUTCHours(0, 0, 0, 0);

        return {
          updateOne: {
            filter: { customerId, date: entryDate },
            update: {
              $set: {
                customerId,
                date: entryDate,
                morningMilk: e.morning ?? 0,
                eveningMilk: e.evening ?? 0,
                totalMilk: e.total ?? (Number(e.morning || 0) + Number(e.evening || 0)),
                amount: e.amount ?? 0
              }
            },
            upsert: true
          }
        };
      }).filter(Boolean);

      if (bulkOps.length) {
        await DailyMilkEntry.bulkWrite(bulkOps);
      }
    }

    return res.status(200).json({
      success: true,
      data: bill,
      message: 'Bill updated successfully.'
    });
  } catch (err) {
    console.error('Error updating bill:', err);
    res.status(500).json({ success: false, error: 'Server Error: Could not update bill.' });
  }
};

export const getAccountingReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = {};

    if (month) filter.month = month;
    if (year) filter.month = { $regex: `^${year}` };

    const bills = await Billing.find(filter);

    const totalCustomers = new Set(bills.map(b => b.customerId)).size;
    const paidBills = bills.filter(b => b.isPaid).length;
    const unpaidBills = bills.filter(b => !b.isPaid).length;

    res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        totalBills: bills.length,
        paidBills,
        unpaidBills,
        bills
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error: Could not fetch accounting report.' });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPaid } = req.body;

    const bill = await Bill.findByIdAndUpdate(id, { isPaid }, { new: true });
    if (!bill) return res.status(404).json({ success: false, error: 'Bill not found.' });

    res.status(200).json({
      success: true,
      data: bill,
      message: `Bill marked as ${isPaid ? 'Paid' : 'Unpaid'}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error: Could not update payment status.' });
  }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

    const bills = await Billing.find({ month: monthKey }).lean();

    if (!bills.length) {
      return res.status(200).json({ success: true, data: [], message: 'No bills found for this month.' });
    }

    const data = bills.map(b => ({
      _id: b._id,
      billId: b.billId,
      customerId: b.customerId,
      customerName: b.customerName,
      milkType: b.milkType,
      ratePerLiter: b.ratePerLiter,
      totalMilk: b.totalMilk,
      totalAmount: b.totalAmount,
      isPaid: b.isPaid,
      paymentDate: b.paymentDate || null,
      createdAt: b.createdAt
    }));

    res.status(200).json({
      success: true,
      data,
      message: 'Monthly report fetched successfully.'
    });
  } catch (err) {
    console.error('Error fetching monthly report:', err);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching monthly report.'
    });
  }
};

export const markBillAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBill = await Billing.findByIdAndUpdate(id,{ isPaid: true, paymentDate: new Date(), updatedAt: new Date()},
    { new: true });
    if (!updatedBill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    res.status(200).json({ success: true,updatedBill });
  } catch (err) {
    console.error('Error marking bill as paid:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
