import mongoose from 'mongoose';
import Counter from './counter.model.js';

const milkEntrySchema = new mongoose.Schema({
  date: { type: String, required: true },
  morning: { type: Number, default: 0 },
  evening: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
});

const billSchema = new mongoose.Schema({
  billId: {
    type: String,
    unique: true,
    trim: true
  },
  customerId: {
    type: String,
    required: [true, 'Customer ID is required.'],
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required.']
  },
  month: {
    type: String,
    required: [true, 'Month is required.'], // Format: 2025-10
  },
  milkType: {
    type: String,
    enum: ['cow', 'buffalo', 'other'],
    required: true
  },
  ratePerLiter: {
    type: Number,
    required: true,
    min: [0, 'Rate cannot be negative.']
  },
  totalMilk: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paymentDate: {
    type: Date,
    default: null
  },
  milkEntries: [milkEntrySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

billSchema.index({ customerId: 1, month: 1 }, { unique: true });

// Auto-generate Bill ID (like CUST-0001)
billSchema.pre('save', async function(next) {
  const doc = this;
  if (!doc.isNew || doc.billId) return next();

  try {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'billId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const paddedSeq = String(counter.seq).padStart(4, '0');
    doc.billId = `BILL-${paddedSeq}`;
    next();
  } catch (error) {
    doc.invalidate('billId', 'Bill ID generation failed.', doc.billId);
    next(error);
  }
});

const Bill = mongoose.model('Bill', billSchema);
export default Bill;