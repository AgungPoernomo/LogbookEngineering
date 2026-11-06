import bcrypt from 'bcryptjs'
import prisma from '../config/prisma.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { logActivity } from '../services/auditService.js'
import { sendNotification } from '../services/mailerService.js'
import { isValidEmail } from '../utils/validation.js'

export async function getUsers(req, res, next) {
  try {
    const {
      role_id,
      plant_id,
      group_id,
      is_active,
      search,
      role,
      page = 1,
      limit = 25,
      sort_by = 'created_at',
      sort_dir = 'desc'
    } = req.query
    const where = {}

    if (role_id) where.role_id = BigInt(role_id)
    if (plant_id) where.plant_id = BigInt(plant_id)
    if (group_id) where.group_id = BigInt(group_id)
    if (is_active !== undefined && is_active !== '') where.is_active = is_active === 'true' || is_active === true
    // BUG-010: filter berdasarkan nama peran (RBAC)
    if (role && role !== 'ALL') where.role = { name: role }

    if (search) {
      where.OR = [
        { full_name: { contains: search } },
        { nik: { contains: search } },
        { email: { contains: search } }
      ]
    }

    // BUG-011: server-side sorting pada kolom tabel akun
    const SORTABLE = {
      id: 'id',
      nik: 'nik',
      full_name: 'full_name',
      email: 'email',
      role: 'role_id',
      plant: 'plant_id',
      group: 'group_id',
      is_active: 'is_active',
      created_at: 'created_at'
    }
    const orderField = SORTABLE[sort_by] || 'created_at'
    const orderDir = String(sort_dir).toLowerCase() === 'asc' ? 'asc' : 'desc'

    // BUG-011: server-side pagination
    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = String(limit).toLowerCase() === 'all'
      ? 1000
      : Math.min(1000, Math.max(1, Number(limit) || 25))
    const skip = (pageNum - 1) * limitNum

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [orderField]: orderDir },
        include: {
          role: true,
          plant: true,
          group: true
        }
      })
    ])

    const formatted = users.map(u => ({
      id: Number(u.id),
      nik: u.nik,
      email: u.email,
      full_name: u.full_name,
      role_id: Number(u.role_id),
      role_name: u.role?.name,
      plant_id: u.plant_id ? Number(u.plant_id) : null,
      plant_name: u.plant?.name || '-',
      group_id: u.group_id ? Number(u.group_id) : null,
      group_name: u.group?.name || '-',
      photo_url: u.photo_url,
      is_active: u.is_active,
      created_at: u.created_at
    }))

    return successResponse(res, {
      message: 'Daftar pengguna berhasil diambil.',
      data: formatted,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      }
    })
  } catch (err) {
    next(err)
  }
}

export async function createUser(req, res, next) {
  try {
    const {
      nik,
      email,
      full_name,
      password = 'password123',
      role_id,
      plant_id,
      group_id,
      photo_url
    } = req.body

    if (!nik || !email || !full_name || !role_id) {
      return errorResponse(res, {
        message: 'NIK, Email, Nama Lengkap, dan Peran (Role) wajib diisi.',
        statusCode: 400
      })
    }

    // BUG-009 (ACC-04): validasi format email ketat (local@domain.tld)
    if (!isValidEmail(email)) {
      return errorResponse(res, {
        message: 'Format email tidak valid. Contoh: nama@domain.co.id',
        statusCode: 400
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        nik: nik.trim(),
        email: email.trim().toLowerCase(),
        full_name: full_name.trim(),
        password_hash: hashedPassword,
        role_id: BigInt(role_id),
        plant_id: plant_id ? BigInt(plant_id) : null,
        group_id: group_id ? BigInt(group_id) : null,
        photo_url: photo_url || null,
        is_active: true
      },
      include: {
        role: true,
        plant: true,
        group: true
      }
    })

    await logActivity(req.user.id, 'CREATE_USER', `Admin membuat akun pengguna baru: ${user.full_name} (${user.nik})`)

    // Kirim notifikasi selamat datang ke user baru
    await sendNotification({
      userId: user.id,
      type: 'USER_CREATED',
      recipientEmail: user.email,
      subject: 'Selamat Datang di Engineer Logbook Satoria',
      message: `Halo ${user.full_name}, akun Anda telah berhasil didaftarkan sebagai ${user.role?.name || 'Pengguna'} di sistem Engineer Logbook Satoria (NIK: ${user.nik}).`,
      channel: 'INAPP'
    })

    // Kirim konfirmasi ke Admin
    await sendNotification({
      userId: req.user.id,
      type: 'USER_CREATED',
      recipientEmail: req.user.email,
      subject: `[Manajemen Akun] Pengguna Baru Dibuat: ${user.full_name}`,
      message: `Akun baru atas nama ${user.full_name} (${user.nik}) dengan peran ${user.role?.name || '-'} berhasil dibuat.`,
      channel: 'INAPP'
    })

    return successResponse(res, {
      message: 'Pengguna baru berhasil dibuat.',
      data: {
        id: Number(user.id),
        nik: user.nik,
        email: user.email,
        full_name: user.full_name,
        role_name: user.role?.name,
        plant_name: user.plant?.name,
        group_name: user.group?.name,
        is_active: user.is_active
      },
      statusCode: 201
    })
  } catch (err) {
    next(err)
  }
}

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params
    const {
      nik,
      email,
      full_name,
      role_id,
      plant_id,
      group_id,
      photo_url,
      is_active,
      password
    } = req.body

    const updateData = {}
    if (nik) updateData.nik = nik.trim()
    if (email) {
      // BUG-009 (ACC-04): validasi format email ketat saat pembaruan akun
      if (!isValidEmail(email)) {
        return errorResponse(res, {
          message: 'Format email tidak valid. Contoh: nama@domain.co.id',
          statusCode: 400
        })
      }
      updateData.email = email.trim().toLowerCase()
    }
    if (full_name) updateData.full_name = full_name.trim()
    if (role_id) updateData.role_id = BigInt(role_id)
    if (plant_id !== undefined) updateData.plant_id = plant_id ? BigInt(plant_id) : null
    if (group_id !== undefined) updateData.group_id = group_id ? BigInt(group_id) : null
    if (photo_url !== undefined) updateData.photo_url = photo_url
    if (is_active !== undefined) updateData.is_active = Boolean(is_active)
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10)
    }

    const updated = await prisma.user.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: { role: true, plant: true, group: true }
    })

    await logActivity(req.user.id, 'UPDATE_USER', `Admin memperbarui akun: ${updated.full_name} (#${id})`)

    // Kirim notifikasi ke pengguna yang akunnya diperbarui
    await sendNotification({
      userId: updated.id,
      type: 'USER_UPDATED',
      recipientEmail: updated.email,
      subject: 'Pembaruan Data Akun Sistem',
      message: `Halo ${updated.full_name}, data profil atau status akun Anda baru saja diperbarui oleh Administrator Sistem.`,
      channel: 'INAPP'
    })

    return successResponse(res, {
      message: 'Data pengguna berhasil diperbarui.',
      data: {
        id: Number(updated.id),
        nik: updated.nik,
        email: updated.email,
        full_name: updated.full_name,
        role_name: updated.role?.name,
        plant_name: updated.plant?.name,
        group_name: updated.group?.name,
        is_active: updated.is_active
      }
    })
  } catch (err) {
    next(err)
  }
}

export async function toggleUserStatus(req, res, next) {
  try {
    const { id } = req.params
    const user = await prisma.user.findUnique({ where: { id: BigInt(id) } })
    if (!user) {
      return errorResponse(res, { message: 'Pengguna tidak ditemukan', statusCode: 404 })
    }

    const newStatus = !user.is_active
    const updated = await prisma.user.update({
      where: { id: BigInt(id) },
      data: { is_active: newStatus }
    })

    const statusText = newStatus ? 'diaktifkan' : 'dinonaktifkan'
    await logActivity(req.user.id, 'TOGGLE_USER_STATUS', `Akun ${user.full_name} (${user.nik}) ${statusText}`)

    return successResponse(res, {
      message: `Pengguna berhasil ${statusText}.`,
      data: { id: Number(updated.id), is_active: updated.is_active }
    })
  } catch (err) {
    next(err)
  }
}
