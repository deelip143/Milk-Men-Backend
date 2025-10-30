import mongoose from 'mongoose';

const DailyMilkEntrySchema = new mongoose.Schema({
    customerId: {
        type: String,
        required: [true, 'Customer ID is required.'],
        trim: true,
    },

    date: {
        type: Date,
        required: [true, 'Date of entry is required.'],
        default: Date.now,
    },

    morningMilk: {
        type: Number,
        min: [0, 'Milk quantity cannot be negative.'],
        default: 0.0,
    },

    eveningMilk: {
        type: Number,
        min: [0, 'Milk quantity cannot be negative.'],
        default: 0.0,
    },

    milkType: {
        type: String,
        required: [true, 'MilkType is required.'],
        trim: true,
    },

    pricePerLiter: {
        type: Number,
        required: [true, 'PricePerLiter is required.'],
        trim: true,
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },
});

DailyMilkEntrySchema.index({ customerId: 1, date: 1 }, { unique: true });

const DailyMilkEntry = mongoose.model('DailyMilkEntry', DailyMilkEntrySchema);

export default DailyMilkEntry;