import express from 'express';
import { 
  createBill,
  getAllBills,
  getBillByCustomerAndMonth,
  updateBill,
  getAccountingReport,
  updatePaymentStatus,
  getCustomers,
  getMilkEntryDetails,
  getMonthlyReport,
  markBillAsPaid
} from '../controllers/billing.controller.js';

const router = express.Router();

// Create bill / Get all bills
router.route('/')
  .post(createBill)
  .get(getAllBills);

// Get bill by customer and month
router.route('/:customerId/:month')
  .get(getBillByCustomerAndMonth);

// Update existing bill
router.route('/:id')
  .put(updateBill);

// Accounting report
router.route('/reports/summary')
  .get(getAccountingReport);

// Update payment status
router.route('/payment-status/:id')
  .put(updatePaymentStatus);

// Get Customer List
router.route('/customers')
    .get(getCustomers);

// Get Milk Entries
router.route('/milk-entries')
    .get(getMilkEntryDetails);

router.route('/monthly-report')
    .get(getMonthlyReport);

router.route('/mark-paid/:id')
    .put(markBillAsPaid);

export default router;
