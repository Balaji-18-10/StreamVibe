import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { createReport, getMyReports } from '../controllers/report.controller.js';

const router = Router();

// Authenticated users can submit reports and view their own reports
router.post('/', protect, createReport);
router.get('/my', protect, getMyReports);

export default router;
