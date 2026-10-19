/**
 * Standardized API Response Helper per README Section 13.1
 * 
 * Format:
 * {
 *   "success": true,
 *   "message": "Pesan status",
 *   "data": {},
 *   "meta": { "page": 1, "limit": 10, "total": 0 }
 * }
 */

export function successResponse(res, { message = 'Operasi berhasil', data = {}, meta = null, statusCode = 200 }) {
  const payload = {
    success: true,
    message,
    data
  }
  if (meta) {
    payload.meta = meta
  }
  return res.status(statusCode).json(payload)
}

export function errorResponse(res, { message = 'Terjadi kesalahan sistem', errors = null, statusCode = 500 }) {
  const payload = {
    success: false,
    message
  }
  if (errors) {
    payload.errors = errors
  }
  return res.status(statusCode).json(payload)
}
