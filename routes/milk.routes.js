import express from 'express';
import { saveDailyMilkEntries,getDailyMilkEntries } from '../controllers/milk.controller.js';

const router = express.Router();

router.route('/daily-entry').post(saveDailyMilkEntries); // Handles bulk save (POST is better for bulk)
router.route('/daily-entry/:date').get(getDailyMilkEntries);


export default router;