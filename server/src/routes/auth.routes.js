import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.patch('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;
