import { verifyToken } from '../utils/jwt.js'
import { errorResponse } from '../utils/response.js'

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, {
      message: 'Akses ditolak. Token otentikasi tidak ditemukan.',
      statusCode: 401
    })
  }

  const token = authHeader.split(' ')[1]
  const decoded = verifyToken(token)

  if (!decoded) {
    return errorResponse(res, {
      message: 'Sesi Anda telah kedaluwarsa atau token tidak valid.',
      statusCode: 401
    })
  }

  req.user = decoded
  next()
}
