import User from '../models/User.model.js';
import Playlist from '../models/Playlist.model.js';
import { asyncHandler, sendSuccess } from '../utils/apiHelpers.js';
import { verifyRefreshToken, generateTokenPair as tokenPair } from '../utils/jwt.js';
import crypto from 'crypto';

// ─── Helper: Set refresh token in httpOnly cookie ──────────
const getCookieOptions = (maxAge = 0) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  ...(maxAge ? { maxAge } : {}),
});

const setRefreshCookie = (res, token, rememberMe = true) => {
  const maxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  res.cookie('refreshToken', token, getCookieOptions(maxAge));
};

// POST /api/v1/auth/register
export const register = asyncHandler(async (req, res) => {
  const { username, email, password, displayName } = req.body;

  if (!username || !email || !password || !displayName) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const user = await User.create({ username, email, password, displayName });

  // Create system playlists for new user
  await Promise.all([
    Playlist.create({ name: 'Watch Later', owner: user._id, visibility: 'private', isSystem: true, systemType: 'watch_later' }),
    Playlist.create({ name: 'Liked Videos', owner: user._id, visibility: 'private', isSystem: true, systemType: 'liked_videos' }),
  ]);

  const { accessToken, refreshToken } = tokenPair(user);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, refreshToken);

  return sendSuccess(res, { accessToken, user: user.toPublicProfile() }, 'Account created successfully', 201);
});

// POST /api/v1/auth/login
export const login = asyncHandler(async (req, res) => {
  const identifier = (req.body.email || req.body.username || req.body.identifier || '').trim();
  const { password, rememberMe } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ success: false, message: 'Email or username and password are required.' });
  }

  // Support login via either email or username (case-insensitive)
  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() },
    ],
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email/username or password.' });
  }

  const { accessToken, refreshToken } = tokenPair(user);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, refreshToken, rememberMe);

  return sendSuccess(res, { accessToken, user: user.toPublicProfile() }, 'Logged in successfully');
});

// POST /api/v1/auth/logout
export const logout = asyncHandler(async (req, res) => {
  if (req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: '' });
  }
  res.clearCookie('refreshToken', getCookieOptions(0));
  return sendSuccess(res, {}, 'Logged out successfully');
});

// POST /api/v1/auth/refresh
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  if (!token) return res.status(401).json({ success: false, message: 'No refresh token provided.' });

  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded._id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
  }

  const { accessToken, refreshToken: newRefreshToken } = tokenPair(user);
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, newRefreshToken);
  return sendSuccess(res, { accessToken }, 'Token refreshed');
});

// GET /api/v1/auth/me
export const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, { user: req.user.toPublicProfile() });
});

// PATCH /api/v1/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  }

  user.password = newPassword;
  await user.save();

  return sendSuccess(res, {}, 'Password changed successfully');
});

// POST /api/v1/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, message: 'Please provide an email address.' });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    // For security, do not disclose whether user exists
    return sendSuccess(res, {}, 'If an account exists with that email, password reset instructions have been generated.');
  }

  // Generate reset token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientBaseUrl}/reset-password/${resetToken}`;

  // Log audit info safely without leaking credentials
  console.log(`[auth]: Password reset token created for user ${user._id}`);

  const responseData = {
    message: 'If an account exists with that email, password reset instructions have been generated.',
  };
  if (process.env.NODE_ENV !== 'production') {
    responseData.resetToken = resetToken;
    responseData.resetUrl = resetUrl;
  }

  return sendSuccess(res, responseData, 'Password reset instructions generated.');
});

// POST /api/v1/auth/reset-password/:token
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }

  // Hash the token from url to match stored hash
  const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpire');

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired password reset token.' });
  }

  // Set new password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save(); // triggers bcrypt hash in pre-save

  // Issue new token pair
  const { accessToken, refreshToken: newRefreshToken } = tokenPair(user);
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, newRefreshToken);

  return sendSuccess(res, { accessToken, user: user.toPublicProfile() }, 'Password reset successfully');
});
