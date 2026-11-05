import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import {
  getAdminStats,
  getReports,
  getReportById,
  updateReport,
  takedownReportedContent,
} from '../controllers/report.controller.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(protect, authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/reports', getReports);
router.get('/reports/:reportId', getReportById);
router.patch('/reports/:reportId', updateReport);
router.post('/reports/:reportId/takedown', takedownReportedContent);

export default router;
