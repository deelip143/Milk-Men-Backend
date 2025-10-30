import express from 'express';
import { register, login, forgotPassword, resetPassword, verifyOtp, changePassword } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js'
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.put("/change-password", protect, changePassword);

export default router;