/**
 * Wraps async route handlers to automatically catch errors
 * and pass them to Express's next() error handler.
 * Eliminates try/catch boilerplate in controllers.
 *
 * @param {Function} fn - async express route handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Standard API success response.
 */
export const sendSuccess = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Construct a MongoDB pagination object from query params.
 * @param {object} query - Express req.query
 * @returns {{ page, limit, skip }}
 */
export const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build paginated response metadata.
 */
export const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});
