export function apiError(message, statusCode = 400, errors = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
}

export function sendError(res, error, fallback = 'Operation failed') {
  const status = error.statusCode || 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({
    success: false,
    message: status >= 500 ? fallback : error.message,
    errors: error.errors || [],
  });
}

export function ok(res, data = {}, message = 'Operation completed successfully', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function required(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || String(body[field]).trim() === '');
  if (missing.length) throw apiError('Required fields are missing', 400, missing.map((field) => ({ field, message: 'Required' })));
}

export function pick(source, allowed) {
  return Object.fromEntries(allowed.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
}
