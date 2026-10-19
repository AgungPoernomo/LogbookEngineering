import { errorResponse } from '../utils/response.js'

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

  return errorResponse(res, {
    message,
    errors: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    statusCode
  })
}
