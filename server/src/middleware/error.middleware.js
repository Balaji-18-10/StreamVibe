import logger from '../utils/logger.js';

/**
 * Global error handler — must be last middleware in Express chain.
 * Handles Mongoose errors, JWT errors, and generic errors.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // ── Mongoose Duplicate Key ─────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    message = `${field ? `'${field}'` : 'A field'} already exists.`;
    statusCode = 409;
  }

  // ── Mongoose Validation Error ──────────────────────────
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map((e) => e.message).join('. ');
    statusCode = 400;
  }

  // ── Mongoose CastError (invalid ObjectId) ─────────────
  if (err.name === 'CastError') {
    message = `Invalid ${err.path}: ${err.value}`;
    statusCode = 400;
  }

  // ── JWT Errors ─────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token. Please log in again.';
    statusCode = 401;
  }
  if (err.name === 'TokenExpiredError') {
    message = 'Token expired. Please log in again.';
    statusCode = 401;
  }

  // ── Multer Errors ──────────────────────────────────────
  if (err.name === 'MulterError') {
    message = err.message;
    statusCode = 400;
  }

  if (statusCode === 500) {
    logger.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
