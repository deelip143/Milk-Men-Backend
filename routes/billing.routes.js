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
  markBillAsPaid,
  updateMilkEntries
} from '../controllers/billing.controller.js';

const router = express.Router();

router.route('/').post(createBill).get(getAllBills);

router.route('/:customerId/:month').get(getBillByCustomerAndMonth);

router.route('/update-milk-entries').put(updateMilkEntries);

router.route('/reports/summary').get(getAccountingReport);

router.route('/payment-status/:id').put(updatePaymentStatus);

router.route('/customers').get(getCustomers);

router.route('/milk-entries').get(getMilkEntryDetails);

router.route('/monthly-report').get(getMonthlyReport);

router.route('/mark-paid/:id').put(markBillAsPaid);

router.route('/:id').put(updateBill);

export default router;