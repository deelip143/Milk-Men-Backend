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

export const createBill = async (req, res) => {
  try {
    const nextBillNo = await getNextSequence('billingId');
    const billNumber = `BILL-${nextBillNo.toString().padStart(4, '0')}`;

    const bill = new Billing({
      billNumber,
      customerId: req.body.customerId,
      month: req.body.month,
      totalAmount: req.body.totalAmount,
      milkEntries: req.body.milkEntries,
      isPaid: false,
      ratePerLiter: req.body.ratePerLiter,
      milkType: req.body.milkType,
      customerName: req.body.customerName,
      totalMilk: req.body.totalMilk
    });
    await bill.save();

    res.status(201).json({
      success: true,
      message: 'Bill generated successfully',
      data: bill,
    });
  } catch (err) {
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

export const getBillByCustomerAndMonth = async (req, res) => {
  try {
    const { customerId, month } = req.params;
    const bill = await Billing.findOne({ customerId, month });

    if (!bill) {
      // Return success = true but no data
      return res.status(200).json({ success: false, data: null, message: 'Bill not found.' });
    }

    res.status(200).json({ success: true, data: bill });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error: Could not fetch bill.' });
  }
};

export const updateBill = async (req, res) => {
  try {
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found.' });
    }

    await DailyMilk.updateMany(
      { customerId, month },
      { $set: { milkEntries } }
    );

    res.status(200).json({
      success: true,
      data: bill,
      message: 'Bill updated successfully.'
    });
  } catch (err) {
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
