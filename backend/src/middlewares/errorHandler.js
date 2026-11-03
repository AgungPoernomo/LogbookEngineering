import { errorResponse } from '../utils/response.js'
import { captureException } from '../config/sentry.js'

const isProduction = process.env.NODE_ENV === 'production'

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

  let statusCode = err.statusCode || 500
  let message = err.message || 'Terjadi kesalahan internal pada server.'

  // Prisma error spesifik → mask
  if (err.name?.startsWith('Prisma') || err.code?.startsWith('P') || err.message?.includes('prisma') || err.message?.includes('Prisma')) {
    statusCode = 500
    message = isProduction
      ? 'Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.'
      : err.message
  } else if (statusCode >= 500) {
    // JANGAN pernah bocorkan detail internal ke client di production
    message = isProduction
      ? 'Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.'
      : err.message
  }

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
    errors: !isProduction ? err.stack : undefined,
    statusCode
  })
}
