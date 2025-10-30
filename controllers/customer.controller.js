import Customer from '../models/Customer.js';

export const createCustomer = async (req, res) => {
    try {
        const customer = await Customer.create(req.body);
        res.status(201).json({
            success: true,
            data: customer,
            message: 'Customer added successfully.',
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ success: false, error: messages.join(', ') });
        }
        if (err.code === 11000) {
            return res.status(400).json({ success: false, error: 'Phone number already exists.' });
        }
        res.status(500).json({ success: false, error: 'Server Error: Could not create customer.' });
    }
};

export const updateCustomer = async (req, res) => {
    try {
        const updateFields = { ...req.body };
        delete updateFields.customerId;
        delete updateFields._id;
        delete updateFields.createdAt;

        const customer = await Customer.findOneAndUpdate(
            { customerId: req.params.id }, 
            updateFields,                  
            {
                new: true,          // Return the updated document
                runValidators: true, // Run Mongoose validators on update
            }
        );

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found.' });
        }

        res.status(200).json({
            success: true,
            data: customer,
            message: 'Customer updated successfully.',
        });
    } catch (err) {
        console.error("Mongoose Update Error:", err); 
        
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ success: false, error: messages.join(', ') });
        }
        if (err.code === 11000) {
            return res.status(400).json({ success: false, error: 'Phone number already exists.' });
        }
        res.status(500).json({ success: false, error: 'Server Error: Could not update customer.' });
    }
};

export const deleteCustomer = async (req, res) => {
    try {
        const customerIdToDelete = req.params.id;
        console.log('Attempting to delete CustomerId:',customerIdToDelete);
        const customer = await Customer.findOneAndDelete({ 
            customerId: customerIdToDelete 
        });

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found.' });
        }

        res.status(200).json({
            success: true,
            data: {}, // Return empty data on successful deletion
            message: 'Customer deleted successfully.',
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error: Could not delete customer.' });
    }
};

export const getCustomers = async (req, res) => {
    try {
        const customers = await Customer.find().sort('deliverySequence');
        res.status(200).json({
            success: true,
            count: customers.length,
            data: customers,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error: Could not fetch customers.' });
    }
};

export const getCustomerById = async (req, res) => {
    try {
        const customerIdFromParam = req.params.id;
        console.log('CustomerId (from param) =', customerIdFromParam);
        const customer = await Customer.findOne({ customerId: customerIdFromParam });

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found.' });
        }

        res.status(200).json({
            success: true,
            data: customer,
        });
    } catch (err) {
        // Handle invalid MongoDB ID format error (CastError)
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, error: 'Invalid customer ID format.' });
        }
        res.status(500).json({ success: false, error: 'Server Error: Could not fetch customer.' });
    }
};

export const updateCustomerSequences = async (req, res) => {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No sequence updates provided.' });
    }

    try {
        const updatePromises = updates.map(update => {
            if (!update.customerId || typeof update.deliverySequence !== 'number') {
                return null; 
            }
            
            return Customer.updateOne(
                { customerId: update.customerId },
                { $set: { deliverySequence: update.deliverySequence } }
            ).exec();
        }).filter(p => p !== null); // Filter out any invalid promises

        const results = await Promise.all(updatePromises);
        
        const updatedCount = results.reduce((sum, result) => sum + (result.modifiedCount || 0), 0);

        res.status(200).json({
            success: true,
            updatedCount: updatedCount,
            message: `${updatedCount} customer sequences updated successfully.`,
        });

    } catch (err) {
        console.error("Sequence Update Error:", err);
        res.status(500).json({ success: false, error: 'Server Error: Could not update customer sequences.' });
    }
};