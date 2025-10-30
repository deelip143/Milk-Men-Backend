import mongoose from 'mongoose';
import Counter from './counter.model.js';

const customerSchema = new mongoose.Schema({
    customerId: {
        type: String,
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: [true, 'Customer name is required.'],
        trim: true,
    },
    address: {
        type: String,
        required: [true, 'Address is required.'],
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required.'],
        unique: true, 
        maxlength: [10, 'Phone number cannot be more than 10 digits.'],
        match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number.'],
    },
    deliverySequence: {
        type: Number,
        required: [true, 'Delivery sequence number is required.'],
        min: [1, 'Sequence number must be 1 or greater.'],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    milkType: {
        type: String,
        required: [true, 'Milk type is required.'],
        enum: ['cow', 'buffalo', 'other'],
    },
    milkTimePreference: {
        type: String,
        enum: ['morning', 'evening', 'both'],
        default: 'both'
    },
    pricePerLiter: {
        type: Number,
        required: [true, 'Price per liter is required.'],
        min: [0, 'Price cannot be negative.'],
    },
    morningMilk: {
        type: Number,
        min: [0, 'Quantity cannot be negative.'],
    },
    eveningMilk: {
        type: Number,
        min: [0, 'Quantity cannot be negative.'],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

customerSchema.pre('save', async function(next) {
    const doc = this;
    if (!doc.isNew || doc.customerId) { // Only run for new documents
        return next();
    }

    try {
        const counter = await Counter.findByIdAndUpdate(
            { _id: 'customerId' }, // Unique ID for this counter
            { $inc: { seq: 1 } }, // Increment the sequence
            { new: true, upsert: true } // Create if not exists, return new value
        );
        
        const paddedSeq = String(counter.seq).padStart(4, '0');
        doc.customerId = `CUST-${paddedSeq}`;
        next();
    } catch (error) {
        doc.invalidate('customerId', 'Customer ID generation failed.', doc.customerId);
        next(error);
    }
});

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;