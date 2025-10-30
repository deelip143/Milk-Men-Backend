import express from 'express';
import { getSellerProfile, updateSellerProfile, getDailyMilkSummary, getYtdSummary } from '../controllers/seller.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = express.Router();

router.get('/profile', protect, getSellerProfile);
router.put('/profile', protect, upload.single('profilePic'), updateSellerProfile);
router.route('/summary/:date').get(getDailyMilkSummary);
router.route('/ytdsummary').get(getYtdSummary);

export default router;
