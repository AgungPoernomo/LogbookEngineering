import prisma from '../config/prisma.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { logActivity } from '../services/auditService.js'

// ============================================================================
// FASE 5.2 — Master Sparepart (MACHINE_PART | CONSUMABLE_WORKSHOP)
// Helper murni (tanpa database) agar kontrak validasi & mapping dapat diuji.
// ============================================================================

export const SPAREPART_ITEM_TYPES = ['MACHINE_PART', 'CONSUMABLE_WORKSHOP']
export const SPAREPART_DEFAULT_UNIT = 'pcs'

/**
 * Normalisasi teks opsional: trim, string kosong → null.
 */
function optionalText(value) {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Validasi & normalisasi payload sparepart.
 * Mengembalikan { errors, data }. `data` hanya berisi field yang dikirim
 * (partial update) agar PUT tidak menghapus kolom yang tidak disertakan.
 *
 * Aturan:
 * - part_name wajib (create), maks 150 karakter.
 * - item_type hanya MACHINE_PART | CONSUMABLE_WORKSHOP.
 * - unit default 'pcs' bila kosong/tidak dikirim (create), maks 20 karakter.
 * - part_code & specification opsional (null bila kosong), masker 50/200 karakter.
 * - is_active boolean opsional (dipakai untuk soft delete / aktifkan kembali).
 */
export function buildSparepartPayload(body = {}, { partial = false } = {}) {
  const errors = []
  const data = {}
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key)
  // Saat partial update hanya field yang benar-benar dikirim yang diproses;
  // saat create, field wajib tetap divalidasi walau tidak dikirim.
  const includes = (key) => (partial ? has(key) : true)

  // ── part_name (wajib saat create) ──
  if (includes('part_name')) {
    const partName = optionalText(body.part_name)
    if (!partName) {
      errors.push('Nama sparepart wajib diisi.')
    } else if (partName.length > 150) {
      errors.push('Nama sparepart maksimal 150 karakter.')
    } else {
      data.part_name = partName
    }
  }

  // ── part_code (opsional, unik bila diisi) ──
  if (has('part_code')) {
    const partCode = optionalText(body.part_code)
    if (partCode && partCode.length > 50) {
      errors.push('Kode part maksimal 50 karakter.')
    } else {
      data.part_code = partCode
    }
  }

  // ── specification (opsional) ──
  if (has('specification')) {
    const specification = optionalText(body.specification)
    if (specification && specification.length > 200) {
      errors.push('Spesifikasi maksimal 200 karakter.')
    } else {
      data.specification = specification
    }
  }

  // ── item_type (wajib saat create, enum) ──
  if (includes('item_type')) {
    const itemType = optionalText(body.item_type)
    if (!itemType) {
      errors.push('Tipe item wajib dipilih (Suku Cadang Mesin atau Bahan Habis Pakai).')
    } else if (!SPAREPART_ITEM_TYPES.includes(itemType)) {
      errors.push(`Tipe item '${itemType}' tidak valid. Gunakan ${SPAREPART_ITEM_TYPES.join(' atau ')}.`)
    } else {
      data.item_type = itemType
    }
  }

  // ── unit (default 'pcs' saat create) ──
  if (includes('unit')) {
    const unit = optionalText(body.unit)
    if (!unit) {
      // Saat partial update unit kosong → abaikan (jangan hapus satuan lama)
      if (!partial) data.unit = SPAREPART_DEFAULT_UNIT
    } else if (unit.length > 20) {
      errors.push('Satuan maksimal 20 karakter.')
    } else {
      data.unit = unit
    }
  }

  // ── is_active (opsional, untuk soft delete / re-aktifkan) ──
  if (has('is_active')) {
    if (typeof body.is_active === 'boolean') {
      data.is_active = body.is_active
    } else {
      const normalized = String(body.is_active).toLowerCase().trim()
      if (['true', '1', 'aktif'].includes(normalized)) data.is_active = true
      else if (['false', '0', 'nonaktif'].includes(normalized)) data.is_active = false
      else errors.push('Status aktif tidak valid (gunakan true/false).')
    }
  }

  return { errors, data }
}

/**
 * Mapping record Prisma → JSON response (BigInt → Number agar aman di JSON).
 */
export function mapSparepart(record) {
  if (!record) return null
  return {
    id: Number(record.id),
    part_code: record.part_code || null,
    part_name: record.part_name,
    specification: record.specification || null,
    item_type: record.item_type,
    unit: record.unit || SPAREPART_DEFAULT_UNIT,
    is_active: record.is_active !== false,
    created_at: record.created_at || null
  }
}

/**
 * WHERE klausa daftar sparepart:
 * - item_type (enum) bila dikirim & valid → 1 query terindeks.
 * - search → OR pada part_name / part_code / specification (substring).
 * - include_inactive=true → tampilkan semua; selain itu HANYA yang aktif
 *   (dipakai dropdown form teknisi agar part nonaktif tidak bisa dipilih).
 */
export function buildSparepartWhere({ item_type, search, include_inactive } = {}) {
  const where = {}
  const itemType = optionalText(item_type)
  if (itemType && SPAREPART_ITEM_TYPES.includes(itemType)) where.item_type = itemType

  const keyword = optionalText(search)
  if (keyword) {
    where.OR = [
      { part_name: { contains: keyword } },
      { part_code: { contains: keyword } },
      { specification: { contains: keyword } }
    ]
  }

  const includeInactive = ['true', '1'].includes(String(include_inactive ?? '').toLowerCase())
  if (!includeInactive) where.is_active = true

  return where
}

/**
 * Cek duplikat part_code secara case-insensitive dengan satu query.
 * `excludeId` dipakai saat update agar record itu sendiri tidak dianggap duplikat.
 */
async function findDuplicatePartCode(client, partCode, excludeId = null) {
  if (!partCode) return null
  const where = { part_code: { equals: partCode } }
  if (excludeId !== null) where.id = { not: BigInt(excludeId) }
  return client.sparepart.findFirst({ where, select: { id: true, part_code: true } })
}

export async function getMasterData(req, res, next) {
  try {
    const { type } = req.params
    const { plant_id, machine_id } = req.query

    // F1.2: HTTP cache sesuai D7 untuk data master non-sensitif (mendukung SWR klien).
    // Gunakan 'private' (bukan 'public') karena respons terautentikasi.
    res.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=86400')

    switch (type.toLowerCase()) {
      case 'plants': {
        const plants = await prisma.plant.findMany({
          orderBy: { id: 'asc' },
          include: {
            _count: {
              select: { machines: true, users: true }
            }
          }
        })
        const data = plants.map(p => ({
          id: Number(p.id),
          name: p.name,
          machine_count: p._count.machines,
          user_count: p._count.users
        }))
        return successResponse(res, { data })
      }

      case 'shifts': {
        const shifts = await prisma.shift.findMany({
          orderBy: { id: 'asc' }
        })
        const data = shifts.map(s => ({
          id: Number(s.id),
          name: s.name,
          start_time: s.start_time,
          end_time: s.end_time
        }))
        return successResponse(res, { data })
      }

      case 'machines': {
        const where = {}
        if (plant_id) where.plant_id = BigInt(plant_id)

        const machines = await prisma.machine.findMany({
          where,
          orderBy: { id: 'asc' },
          include: {
            plant: { select: { id: true, name: true } },
            subMachines: { select: { id: true, name: true } }
          }
        })
        const data = machines.map(m => ({
          id: Number(m.id),
          name: m.name,
          plant_id: m.plant_id ? Number(m.plant_id) : null,
          plant_name: m.plant?.name || '-',
          sub_machines: m.subMachines.map(sm => ({
            id: Number(sm.id),
            name: sm.name
          }))
        }))
        return successResponse(res, { data })
      }

      case 'sub-machines':
      case 'sub_machines': {
        const where = {}
        if (machine_id) where.machine_id = BigInt(machine_id)

        const subMachines = await prisma.subMachine.findMany({
          where,
          orderBy: { id: 'asc' },
          include: {
            machine: {
              select: {
                id: true,
                name: true,
                plant_id: true,
                plant: { select: { name: true } }
              }
            }
          }
        })
        const data = subMachines.map(sm => ({
          id: Number(sm.id),
          name: sm.name,
          machine_id: Number(sm.machine_id),
          machine_name: sm.machine?.name,
          plant_name: sm.machine?.plant?.name
        }))
        return successResponse(res, { data })
      }

      case 'groups':
      case 'work_groups': {
        const groups = await prisma.workGroup.findMany({
          orderBy: { id: 'asc' },
          include: {
            _count: { select: { users: true } }
          }
        })
        const data = groups.map(g => ({
          id: Number(g.id),
          name: g.name,
          user_count: g._count.users
        }))
        return successResponse(res, { data })
      }

      case 'roles': {
        const roles = await prisma.role.findMany({
          orderBy: { id: 'asc' }
        })
        const data = roles.map(r => ({
          id: Number(r.id),
          name: r.name,
          description: r.description
        }))
        return successResponse(res, { data })
      }

      // FASE 5.2 — Katalog sparepart & bahan habis pakai (F5.3).
      // Satu query dengan filter opsional `?item_type=` dan `?search=` (tanpa N+1).
      // Default hanya part AKTIF (konsumsi dropdown form teknisi);
      // Admin memakai `?include_inactive=true` untuk halaman Master Sparepart.
      case 'spareparts': {
        const where = buildSparepartWhere(req.query)
        const spareparts = await prisma.sparepart.findMany({
          where,
          orderBy: [{ part_name: 'asc' }, { id: 'asc' }]
        })
        const data = spareparts.map(mapSparepart)
        return successResponse(res, { data })
      }

      default:
        return errorResponse(res, {
          message: `Tipe master data '${type}' tidak dikenal.`,
          statusCode: 400
        })
    }
  } catch (err) {
    next(err)
  }
}

export async function createMasterData(req, res, next) {
  try {
    const { type } = req.params
    const body = req.body

    let created = null

    switch (type.toLowerCase()) {
      case 'plants':
        if (!body.name) return errorResponse(res, { message: 'Nama plant wajib diisi', statusCode: 400 })
        created = await prisma.plant.create({ data: { name: body.name } })
        break

      case 'shifts':
        if (!body.name || !body.start_time || !body.end_time) {
          return errorResponse(res, { message: 'Nama, jam mulai, dan jam selesai shift wajib diisi', statusCode: 400 })
        }
        created = await prisma.shift.create({
          data: {
            name: body.name,
            start_time: body.start_time,
            end_time: body.end_time
          }
        })
        break

      case 'machines':
        if (!body.name) return errorResponse(res, { message: 'Nama mesin wajib diisi', statusCode: 400 })
        // BUG-005 (MST-02): cegah duplikat nama mesin pada Line/Plant yang sama
        {
          const machinePlantId = body.plant_id ? BigInt(body.plant_id) : null
          const existingMachine = await prisma.machine.findFirst({
            where: { name: body.name.trim(), plant_id: machinePlantId }
          })
          if (existingMachine) {
            return errorResponse(res, {
              message: `Mesin "${body.name.trim()}" sudah terdaftar pada Line/Plant yang sama. Gunakan nama yang berbeda.`,
              statusCode: 409
            })
          }
          created = await prisma.machine.create({
            data: {
              name: body.name.trim(),
              plant_id: machinePlantId
            }
          })
        }
        break

      case 'sub-machines':
      case 'sub_machines':
        if (!body.name || !body.machine_id) {
          return errorResponse(res, { message: 'Nama sub-mesin dan machine_id wajib diisi', statusCode: 400 })
        }
        // BUG-005 (MST-03): cegah duplikat nama sub-mesin pada mesin induk yang sama
        {
          const existingSubMachine = await prisma.subMachine.findFirst({
            where: { name: body.name.trim(), machine_id: BigInt(body.machine_id) }
          })
          if (existingSubMachine) {
            return errorResponse(res, {
              message: `Sub-mesin "${body.name.trim()}" sudah terdaftar pada mesin induk yang sama. Gunakan nama yang berbeda.`,
              statusCode: 409
            })
          }
          created = await prisma.subMachine.create({
            data: {
              name: body.name.trim(),
              machine_id: BigInt(body.machine_id)
            }
          })
        }
        break

      case 'groups':
      case 'work_groups':
        if (!body.name) return errorResponse(res, { message: 'Nama work group wajib diisi', statusCode: 400 })
        created = await prisma.workGroup.create({ data: { name: body.name } })
        break

      // FASE 5.2 — Tambah sparepart/bahan habis pakai.
      case 'spareparts': {
        const { errors, data } = buildSparepartPayload(body)
        if (errors.length > 0) {
          return errorResponse(res, { message: errors[0], errors, statusCode: 400 })
        }

        const duplicate = await findDuplicatePartCode(prisma, data.part_code)
        if (duplicate) {
          return errorResponse(res, {
            message: `Kode part "${data.part_code}" sudah digunakan. Gunakan kode lain atau kosongkan kode.`,
            statusCode: 409
          })
        }

        created = await prisma.sparepart.create({
          data: {
            part_name: data.part_name,
            part_code: data.part_code ?? null,
            specification: data.specification ?? null,
            item_type: data.item_type,
            unit: data.unit || SPAREPART_DEFAULT_UNIT,
            is_active: data.is_active ?? true
          }
        })
        break
      }

      default:
        return errorResponse(res, { message: `Tipe '${type}' tidak didukung.`, statusCode: 400 })
    }

    await logActivity(req.user.id, `CREATE_MASTER_${type.toUpperCase()}`, `Tambah data master ${type}: ${body.name || body.part_name}`)

    return successResponse(res, {
      message: `Master data ${type} berhasil ditambahkan.`,
      data: type.toLowerCase() === 'spareparts'
        ? mapSparepart(created)
        : { ...created, id: Number(created.id) },
      statusCode: 201
    })
  } catch (err) {
    next(err)
  }
}

export async function updateMasterData(req, res, next) {
  try {
    const { type, id } = req.params
    const body = req.body
    let updated = null

    switch (type.toLowerCase()) {
      case 'plants':
        updated = await prisma.plant.update({
          where: { id: BigInt(id) },
          data: { name: body.name }
        })
        break

      case 'shifts':
        updated = await prisma.shift.update({
          where: { id: BigInt(id) },
          data: {
            name: body.name,
            start_time: body.start_time,
            end_time: body.end_time
          }
        })
        break

      case 'machines':
        updated = await prisma.machine.update({
          where: { id: BigInt(id) },
          data: {
            name: body.name,
            plant_id: body.plant_id ? BigInt(body.plant_id) : null
          }
        })
        break

      case 'sub-machines':
      case 'sub_machines':
        updated = await prisma.subMachine.update({
          where: { id: BigInt(id) },
          data: {
            name: body.name,
            machine_id: body.machine_id ? BigInt(body.machine_id) : undefined
          }
        })
        break

      case 'groups':
      case 'work_groups':
        updated = await prisma.workGroup.update({
          where: { id: BigInt(id) },
          data: { name: body.name }
        })
        break

      // FASE 5.2 — Update sparepart (partial) + toggle is_active (soft delete).
      case 'spareparts': {
        const targetId = BigInt(id)
        const { errors, data } = buildSparepartPayload(body, { partial: true })
        if (errors.length > 0) {
          return errorResponse(res, { message: errors[0], errors, statusCode: 400 })
        }

        const existing = await prisma.sparepart.findUnique({
          where: { id: targetId },
          select: { id: true, part_code: true, is_active: true }
        })
        if (!existing) {
          return errorResponse(res, { message: 'Sparepart tidak ditemukan.', statusCode: 404 })
        }

        // Duplikat dicek hanya bila part_code diubah & diisi.
        if (Object.prototype.hasOwnProperty.call(data, 'part_code') && data.part_code) {
          const duplicate = await findDuplicatePartCode(prisma, data.part_code, targetId)
          if (duplicate) {
            return errorResponse(res, {
              message: `Kode part "${data.part_code}" sudah digunakan part lain. Gunakan kode berbeda.`,
              statusCode: 409
            })
          }
        }

        if (Object.keys(data).length === 0) {
          return errorResponse(res, { message: 'Tidak ada perubahan data yang dikirim.', statusCode: 400 })
        }

        updated = await prisma.sparepart.update({
          where: { id: targetId },
          data
        })
        break
      }

      default:
        return errorResponse(res, { message: `Tipe '${type}' tidak didukung.`, statusCode: 400 })
    }

    await logActivity(req.user.id, `UPDATE_MASTER_${type.toUpperCase()}`, `Perbarui master ${type} #${id}`)

    return successResponse(res, {
      message: `Master data ${type} berhasil diperbarui.`,
      data: type.toLowerCase() === 'spareparts'
        ? mapSparepart(updated)
        : { ...updated, id: Number(updated.id) }
    })
  } catch (err) {
    next(err)
  }
}

export async function deleteMasterData(req, res, next) {
  try {
    const { type, id } = req.params
    const targetId = BigInt(id)

    switch (type.toLowerCase()) {
      case 'plants':
        await prisma.plant.delete({ where: { id: targetId } })
        break
      case 'shifts':
        await prisma.shift.delete({ where: { id: targetId } })
        break
      case 'machines':
        await prisma.machine.delete({ where: { id: targetId } })
        break
      case 'sub-machines':
      case 'sub_machines':
        await prisma.subMachine.delete({ where: { id: targetId } })
        break
      case 'groups':
      case 'work_groups':
        await prisma.workGroup.delete({ where: { id: targetId } })
        break

      // FASE 5.2 — Soft delete sparepart: JANGAN hapus baris karena
      // `logbook_spareparts` masih mereferensikan part ini (histori pemakaian).
      case 'spareparts': {
        const existing = await prisma.sparepart.findUnique({
          where: { id: targetId },
          select: { id: true, part_name: true, is_active: true }
        })
        if (!existing) {
          return errorResponse(res, { message: 'Sparepart tidak ditemukan.', statusCode: 404 })
        }

        if (existing.is_active === false) {
          return successResponse(res, {
            message: `Sparepart #${id} sudah berstatus nonaktif.`,
            data: mapSparepart(existing)
          })
        }

        const updated = await prisma.sparepart.update({
          where: { id: targetId },
          data: { is_active: false }
        })

        await logActivity(
          req.user.id,
          `DELETE_MASTER_${type.toUpperCase()}`,
          `Nonaktifkan (soft delete) master ${type} #${id}: ${updated.part_name}`
        )

        return successResponse(res, {
          message: `Sparepart "${updated.part_name}" berhasil dinonaktifkan.`,
          data: mapSparepart(updated)
        })
      }

      default:
        return errorResponse(res, { message: `Tipe '${type}' tidak didukung.`, statusCode: 400 })
    }

    await logActivity(req.user.id, `DELETE_MASTER_${type.toUpperCase()}`, `Hapus master ${type} #${id}`)

    return successResponse(res, {
      message: `Master data ${type} #${id} berhasil dihapus.`
    })
  } catch (err) {
    next(err)
  }
}
