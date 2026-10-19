import { errorResponse } from '../utils/response.js'

/**
 * Middleware Otorisasi Berbasis Peran (RBAC) per README Section 4
 * @param  {...string} allowedRoles Contoh: 'Admin', 'Supervisor', 'Teknisi'
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, {
        message: 'Pengguna belum terautentikasi.',
        statusCode: 401
      })
    }

    const userRole = req.user.role || (req.user.role_name ? req.user.role_name : null)

    // Periksa apakah peran pengguna diizinkan
    const isAllowed = allowedRoles.some(role => 
      role.toLowerCase() === (userRole || '').toLowerCase()
    )

    if (!isAllowed) {
      return errorResponse(res, {
        message: `Akses ditolak. Anda tidak memiliki hak akses [${allowedRoles.join(', ')}] untuk sumber daya ini.`,
        statusCode: 403
      })
    }

    next()
  }
}
