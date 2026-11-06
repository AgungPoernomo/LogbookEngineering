import prisma from '../config/prisma.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { logActivity } from '../services/auditService.js'

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

      default:
        return errorResponse(res, { message: `Tipe '${type}' tidak didukung.`, statusCode: 400 })
    }

    await logActivity(req.user.id, `CREATE_MASTER_${type.toUpperCase()}`, `Tambah data master ${type}: ${body.name}`)

    return successResponse(res, {
      message: `Master data ${type} berhasil ditambahkan.`,
      data: { ...created, id: Number(created.id) },
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

      default:
        return errorResponse(res, { message: `Tipe '${type}' tidak didukung.`, statusCode: 400 })
    }

    await logActivity(req.user.id, `UPDATE_MASTER_${type.toUpperCase()}`, `Perbarui master ${type} #${id}`)

    return successResponse(res, {
      message: `Master data ${type} berhasil diperbarui.`,
      data: { ...updated, id: Number(updated.id) }
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
