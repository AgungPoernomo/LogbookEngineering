import { errorResponse } from '../utils/response.js'
import { captureException } from '../config/sentry.js'

export function errorHandler(err, req, res, next) {
  console.error('[SERVER ERROR]:', err)

  // Prisma unique constraint violation error
  if (err.code === 'P2002') {
    const target = err.meta?.target || 'Bidang'
    return errorResponse(res, {
      message: `Data duplikat: Nilai ${target} sudah terdaftar dalam sistem.`,
      statusCode: 409
    })
  }

  // Prisma record not found error
  if (err.code === 'P2025') {
    return errorResponse(res, {
      message: 'Data yang diminta tidak ditemukan.',
      statusCode: 404
    })
  }

  const statusCode = err.statusCode || 500
  const message = err.message || 'Terjadi kesalahan internal pada server.'

  // Laporkan galat tak terduga (500) ke Sentry
  if (statusCode >= 500) {
    captureException(err, {
      user: req.user ? { id: req.user.id, email: req.user.email, role: req.user.role } : null,
      tags: {
        method: req.method,
        path: req.originalUrl || req.path
      },
      extra: {
        body: req.body,
        query: req.query,
        params: req.params
      }
    })
  }

  return errorResponse(res, {
    message,
    errors: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    statusCode
  })
}
