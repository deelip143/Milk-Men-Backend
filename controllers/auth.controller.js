import User from '../models/User.js';
import { generateOtp } from '../utils/generateOtp.js';
import { generateToken } from '../utils/jwt.js';
import { sendOtp } from '../utils/sendOtp.js';

/* -------------------------------- REGISTER -------------------------------- */
export const register = async(req, res) => {
    try {
        const { name, mobile, password, role } = req.body;

        const existingUser = await User.findOne({ mobile });
        if (existingUser)
            return res.status(400).json({ success: false, message: 'Mobile already registered' });

        const user = await User.create({ name, mobile, password, role });
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                uniqueId: user.uniqueId,
                name: user.name,
                mobile: user.mobile,
                role: user.role,
                gender: user.gender || '',
                dob: user.dob || '',
                address: user.address || '',
                profilePic: user.profilePic || '',
                rememberMe: user.rememberMe || false
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/* --------------------------------- LOGIN ---------------------------------- */
export const login = async(req, res) => {
    try {
        const { mobile, password, rememberMe } = req.body;

        const user = await User.findOne({ mobile });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid mobile or password' });
        }

        const token = generateToken(user);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                uniqueId: user.uniqueId,
                name: user.name,
                mobile: user.mobile,
                role: user.role,
                gender: user.gender || '',
                dob: user.dob || '',
                address: user.address || '',
                profilePic: user.profilePic || '',
                rememberMe: rememberMe || false
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/* ---------------------------- FORGOT PASSWORD ----------------------------- */
export const forgotPassword = async (req, res) => {
  try {
    const { mobile } = req.body;

    const user = await User.findOne({ mobile });
    if (!user)
      return res.status(404).json({ success: false, message: "Mobile not registered" });

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpire = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
    await user.save();

    console.log(`📱 OTP for ${mobile}: ${otp}`);
    const sent = await sendOtp(mobile, otp);
    if (!sent) return res.status(500).json({ success: false, message: "Failed to send OTP" });

    return res.json({
      success: true,
      message: "OTP sent successfully to your registered mobile number",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ------------------------------- VERIFY OTP ------------------------------- */
export const verifyOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    const user = await User.findOne({
      mobile,
      otp,
      otpExpire: { $gt: Date.now() }, // not expired
    });

    if (!user)
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    // OTP verified successfully — mark it as verified temporarily
    user.isOtpVerified = true;
    await user.save();

    res.json({
      success: true,
      message: "OTP verified successfully. You may now reset your password.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ----------------------------- RESET PASSWORD ----------------------------- */
export const resetPassword = async (req, res) => {
  try {
    const { mobile, newPassword } = req.body;

    const user = await User.findOne({ mobile });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    // ensure OTP was verified before reset
    if (!user.isOtpVerified)
      return res.status(400).json({ success: false, message: "OTP not verified" });

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpire = undefined;
    user.isOtpVerified = false;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successful. Please login again.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------------------------- CHANGE PASSWORD ----------------------------- */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?.id; // comes from auth middleware (after JWT verification)

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Old and new passwords are required" });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // ✅ Verify old password
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Old password is incorrect" });
    }

    // ✅ Set new password
    user.password = newPassword;
    await user.save();

    // (Optional) generate a new token after password change
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
      token,
    });

  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
