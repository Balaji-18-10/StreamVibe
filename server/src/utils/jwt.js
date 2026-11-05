import jwt from 'jsonwebtoken';

/**
 * Generate a short-lived access token (default 15m).
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
};

/**
 * Generate a long-lived refresh token (default 7d).
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

/**
 * Verify an access token. Throws on invalid/expired.
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

/**
 * Verify a refresh token. Throws on invalid/expired.
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

/**
 * Generate both tokens and return them with expiry info.
 */
export const generateTokenPair = (user) => {
  const payload = {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
  };
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken({ _id: user._id }),
  };
};
