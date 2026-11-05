import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.model.js';
import { asyncHandler } from '../utils/apiHelpers.js';

/**
 * Protect routes — verifies JWT from Authorization header or cookie.
 * Attaches req.user with full user document (minus password).
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Try Authorization header
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Fallback to httpOnly cookie
  else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const decoded = verifyAccessToken(token);
  const user = await User.findById(decoded._id).select('-password -refreshToken');

  if (!user) {
    return res.status(401).json({ success: false, message: 'User no longer exists.' });
  }

  req.user = user;
  next();
});

/**
 * Optional auth — attaches req.user if token present, but doesn't block.
 * Use for routes where auth changes response (e.g., like status).
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded._id).select('-password -refreshToken');
    req.user = user || null;
  } catch {
    req.user = null;
  }
  next();
});

/**
 * Role-based access control. Must be used after protect().
 * @param {...string} roles - Allowed roles
 */
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
  }
  next();
};
