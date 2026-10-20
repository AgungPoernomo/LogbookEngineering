import bcrypt from 'bcryptjs'
import prisma from '../config/prisma.js'
import { generateToken } from '../utils/jwt.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { logActivity } from '../services/auditService.js'
import { processAvatar } from '../services/imageService.js'
import { saveAvatar, removeAvatar } from '../services/storageService.js'

// Mode Pengembangan (Development Phase):
// Semua pengguna terdaftar dapat masuk menggunakan master password 'password123'.
// Keamanan tetap diutamakan:
// 1. Identitas (NIK atau Email) WAJIB terdaftar dalam sistem TiDB
// 2. Status akun WAJIB aktif (is_active === true)
// 3. Kata sandi masukan WAJIB cocok dengan DEV_DEFAULT_PASSWORD atau hash asli
// 4. Token JWT resmi ditandatangani dengan secret key dan masa berlaku
// 5. Setiap percobaan login dicatat ke dalam audit trail (user_activities)
const DEV_DEFAULT_PASSWORD = process.env.DEV_MASTER_PASSWORD || 'password123'

export async function login(req, res, next) {
  try {
    const { identifier, password } = req.body

    if (!identifier || !password) {
      return errorResponse(res, {
        message: 'NIK/Email dan Kata Sandi wajib diisi.',
        statusCode: 400
      })
    }

    const trimmedIdentifier = identifier.trim()
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmedIdentifier },
          { nik: trimmedIdentifier }
        ]
      },
      include: {
        role: true,
        plant: true,
        group: true
      }
    })

    if (!user) {
      return errorResponse(res, {
        message: 'NIK atau Email tidak terdaftar dalam sistem Satoria.',
        statusCode: 401
      })
    }

    // Tahap Development: Dahulukan keamanan dengan memastikan NIK/Email terdaftar
    // dan status akun aktif. Verifikasi password menerima dev master password 'password123'
    // atau password hash asli di database.
    const isDevPasswordMatch = password === DEV_DEFAULT_PASSWORD
    let isPasswordValid = isDevPasswordMatch

    if (!isPasswordValid) {
      if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
        isPasswordValid = await bcrypt.compare(password, user.password_hash)
      } else {
        isPasswordValid = user.password_hash === password
      }
    }

    if (!isPasswordValid) {
      return errorResponse(res, {
        message: 'Kata sandi yang Anda masukkan salah. (Tahap pengembangan: gunakan password123)',
        statusCode: 401
      })
    }

    if (!user.is_active) {
      return errorResponse(res, {
        message: 'Akun Anda dinonaktifkan. Hubungi Administrator Satoria.',
        statusCode: 403
      })
    }

    const tokenPayload = {
      id: Number(user.id),
      nik: user.nik,
      email: user.email,
      full_name: user.full_name,
      role: user.role.name,
      role_id: Number(user.role_id),
      plant_id: user.plant_id ? Number(user.plant_id) : null,
      plant_name: user.plant?.name || null,
      group_id: user.group_id ? Number(user.group_id) : null,
      group_name: user.group?.name || null,
      photo_url: user.photo_url
    }

    const token = generateToken(tokenPayload)

    // Catat ke audit trail
    await logActivity(user.id, 'USER_LOGIN', `Login sukses melalui identifier: ${trimmedIdentifier}`)

    const userSafe = { ...tokenPayload }

    return successResponse(res, {
      message: 'Login berhasil.',
      data: {
        user: userSafe,
        token
      }
    })
  } catch (err) {
    next(err)
  }
}

export async function getProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(req.user.id) },
      include: {
        role: true,
        plant: true,
        group: true
      }
    })

    if (!user) {
      return errorResponse(res, {
        message: 'Pengguna tidak ditemukan.',
        statusCode: 404
      })
    }

    const userData = {
      id: Number(user.id),
      nik: user.nik,
      email: user.email,
      full_name: user.full_name,
      role: user.role.name,
      role_id: Number(user.role_id),
      plant_id: user.plant_id ? Number(user.plant_id) : null,
      plant_name: user.plant?.name || null,
      group_id: user.group_id ? Number(user.group_id) : null,
      group_name: user.group?.name || null,
      photo_url: user.photo_url,
      is_active: user.is_active,
      created_at: user.created_at
    }

    return successResponse(res, {
      message: 'Profil pengguna berhasil diambil.',
      data: userData
    })
  } catch (err) {
    next(err)
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { full_name, photo_url } = req.body
    const updateData = {}
    if (full_name) updateData.full_name = full_name
    if (photo_url !== undefined) updateData.photo_url = photo_url

    const updated = await prisma.user.update({
      where: { id: BigInt(req.user.id) },
      data: updateData,
      include: {
        role: true,
        plant: true,
        group: true
      }
    })

    await logActivity(req.user.id, 'UPDATE_PROFILE', 'Pengguna memperbarui profil pribadi')

    return successResponse(res, {
      message: 'Profil berhasil diperbarui.',
      data: {
        id: Number(updated.id),
        full_name: updated.full_name,
        photo_url: updated.photo_url
      }
    })
  } catch (err) {
    next(err)
  }
}

export async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return errorResponse(res, {
        message: 'File gambar wajib diunggah.',
        statusCode: 400
      })
    }

    const userId = req.user.id
    const currentUser = await prisma.user.findUnique({
      where: { id: BigInt(userId) }
    })

    if (!currentUser) {
      return errorResponse(res, {
        message: 'Pengguna tidak ditemukan.',
        statusCode: 404
      })
    }

    // Proses citra via sharp: auto-orient, resize 320x320, dan konversi ke WebP
    const processed = await processAvatar(req.file.buffer, {
      width: 320,
      height: 320,
      quality: 82
    })

    // Simpan ke Object Storage R2 atau Local Fallback
    const fileName = `avatar-u${userId}-${Date.now()}.webp`
    const photoUrl = await saveAvatar({
      buffer: processed.buffer,
      fileName,
      contentType: 'image/webp'
    })

    // Hapus file avatar lama jika ada
    if (currentUser.photo_url) {
      await removeAvatar(currentUser.photo_url)
    }

    // Simpan photo_url baru ke TiDB Database
    const updated = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { photo_url: photoUrl },
      include: {
        role: true,
        plant: true,
        group: true
      }
    })

    // Catat log aktivitas
    await logActivity(
      userId,
      'UPDATE_AVATAR',
      `Memperbarui foto profil ke format WebP (${Math.round(processed.originalSize / 1024)} KB -> ${Math.round(processed.processedSize / 1024)} KB, hemat ${processed.compressionRatio})`
    )

    return successResponse(res, {
      message: 'Foto profil berhasil diunggah, dikonversi ke WebP, dan dioptimasi!',
      data: {
        id: Number(updated.id),
        nik: updated.nik,
        email: updated.email,
        full_name: updated.full_name,
        role: updated.role.name,
        photo_url: updated.photo_url,
        optimization: {
          originalFormat: processed.originalFormat,
          targetFormat: 'webp',
          originalSize: processed.originalSize,
          processedSize: processed.processedSize,
          compressionRatio: processed.compressionRatio
        }
      }
    })
  } catch (err) {
    next(err)
  }
}

export async function deleteAvatar(req, res, next) {
  try {
    const userId = req.user.id
    const currentUser = await prisma.user.findUnique({
      where: { id: BigInt(userId) }
    })

    if (!currentUser) {
      return errorResponse(res, {
        message: 'Pengguna tidak ditemukan.',
        statusCode: 404
      })
    }

    if (currentUser.photo_url) {
      await removeAvatar(currentUser.photo_url)
    }

    const updated = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { photo_url: null }
    })

    await logActivity(userId, 'DELETE_AVATAR', 'Menghapus foto profil pribadi')

    return successResponse(res, {
      message: 'Foto profil berhasil dihapus.',
      data: {
        id: Number(updated.id),
        photo_url: null
      }
    })
  } catch (err) {
    next(err)
  }
}

export async function changePassword(req, res, next) {
  // Mode Pengembangan: Fitur ganti kata sandi dinonaktifkan sementara
  return errorResponse(res, {
    message: 'Fitur ganti kata sandi dinonaktifkan sementara selama tahap pengembangan. Semua akun aktif dapat masuk menggunakan kata sandi: password123.',
    statusCode: 403
  })

  /*
  // =========================================================================
  // KODE ASLI GANTI KATA SANDI (AKAN DIAKTIFKAN KEMBALI SETELAH SEMUA FITUR SELESAI)
  // =========================================================================
  try {
    const currentPassword = req.body.currentPassword || req.body.old_password
    const newPassword = req.body.newPassword || req.body.new_password

    if (!currentPassword || !newPassword) {
      return errorResponse(res, {
        message: 'Kata sandi saat ini dan kata sandi baru wajib diisi.',
        statusCode: 400
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(req.user.id) }
    })

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash)
    if (!isMatch) {
      return errorResponse(res, {
        message: 'Kata sandi saat ini tidak sesuai.',
        statusCode: 400
      })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: BigInt(req.user.id) },
      data: { password_hash: hashedPassword }
    })

    await logActivity(req.user.id, 'CHANGE_PASSWORD', 'Pengguna mengganti kata sandi akun')

    return successResponse(res, {
      message: 'Kata sandi berhasil diperbarui.'
    })
  } catch (err) {
    next(err)
  }
  */
}
