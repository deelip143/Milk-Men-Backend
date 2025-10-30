import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const userSchema = new mongoose.Schema({
    uniqueId: {
        type: String,
        default: () => 'USER-' + uuidv4().split('-')[0].toUpperCase(),
        unique: true,
    },
    name: {
        type: String,
        required: [true, 'Please enter name'],
    },
    mobile: {
        type: String,
        required: [true, 'Please enter mobile number'],
        unique: true,
        match: [/^\d{10}$/, 'Please enter valid 10 digit mobile number'],
    },
    password: {
        type: String,
        required: [true, 'Please enter password'],
        minlength: 6,
    },
    role: {
        type: String,
        enum: ['admin', 'seller', 'customer'],
        default: 'seller',
    },
    gender: {
        type: String,
    },
    dob: {
        type: String,
    },
    address: {
        type: String,
    },
    profilePic: {
        type: String,
        default: '',
    },
    rememberMe: {
        type: Boolean,
        default: false
    },
    otp: {
        type : String
    },
    otpExpire: {
        type: Date
    },
    isOtpVerified: {
        type: Boolean
    }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Password verification
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;