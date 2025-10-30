import express from 'express';
import { createCustomer, getCustomerById, updateCustomer, deleteCustomer, getCustomers, updateCustomerSequences } from '../controllers/customer.controller.js';

const router = express.Router();

// Route for creating a customer and fetching all customers
router.route('/').post(createCustomer).get(getCustomers);

// NEW ROUTE: Sequence Batch Update
router.route('/sequence-update').put(updateCustomerSequences);

// Routes for specific customer by ID
router.route('/:id').get(getCustomerById).put(updateCustomer).delete(deleteCustomer);

export default router;
