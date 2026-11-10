import QRCode from 'qrcode'
import prisma from '../config/prisma.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { logActivity } from '../services/auditService.js'

// ============================================================================
// FASE 5.3 — Generator QR Code Mesin (Admin)
//
// Stiker QR fisik masih ditunda (Fase 3.2), namun generator-nya sudah disiapkan:
// setiap QR berisi URL ABSOLUT ke halaman "Buku Pintar Mesin" di frontend
// (`${FRONTEND_URL}/mesin/:id`). Saat stiker ditempel di mesin dan di-scan
// teknisi lewat HP, browser langsung membuka rekam medis mesin tersebut.
//
// Endpoint (semua KHUSUS ADMIN — dijaga `requireRoles('Admin')` di route):
//   GET /api/v1/machines/:id/qr       → PNG 300x300 (Content-Type: image/png)
//   GET /api/v1/machines/:id/qr-data  → JSON info mesin + string QR (preview cetak)
//   GET /api/v1/machines/qr-batch     → JSON info banyak mesin (cetak batch per Line)
//
// Catatan implementasi:
// - Library `qrcode` adalah JavaScript murni (tanpa native binding seperti canvas).
// - Respons PNG TIDAK memakai wrapper successResponse (bukan JSON); error tetap
//   memakai errorResponse agar kontrak API konsisten.
// - Tanpa perubahan schema.prisma (data mesin dibaca apa adanya dari tabel yang ada).
// ============================================================================

// Dimensi & parameter QR akhir (spesifikasi Fase 5.3).
export const QR_IMAGE_SIZE = 300
export const QR_MARGIN = 2
export const QR_ERROR_CORRECTION_LEVEL = 'M'

// Fallback bila FRONTEND_URL belum di-set (sama dengan default Vite dev server).
export const DEFAULT_FRONTEND_URL = 'http://localhost:5173'

// Batas jumlah mesin per permintaan cetak batch (mencegah payload membengkak).
export const QR_BATCH_MAX = 200

/**
 * Normalisasi base URL frontend: trim, buang garis miring di akhir.
 * Nilai kosong / tidak valid → fallback DEFAULT_FRONTEND_URL.
 *
 * @param {string|undefined|null} rawUrl
 * @returns {string}
 */
export function normalizeFrontendUrl(rawUrl) {
  const raw = typeof rawUrl === 'string' ? rawUrl.trim() : ''
  if (!raw) return DEFAULT_FRONTEND_URL
  return raw.replace(/\/+$/, '')
}

/**
 * Susun URL absolut Buku Pintar Mesin yang akan disandikan ke QR.
 * Contoh: http://localhost:5173/mesin/12
 *
 * @param {number|string} machineId
 * @param {string} [frontendUrl]
 * @returns {string}
 */
export function buildMachinePublicUrl(machineId, frontendUrl = process.env.FRONTEND_URL) {
  const id = Number(machineId)
  return `${normalizeFrontendUrl(frontendUrl)}/mesin/${id}`
}

/**
 * Opsi generator QR (dipakai oleh PNG buffer).
 * Ukuran 300x300 px, quiet zone 2 modul, error correction level M (~15%).
 */
export function buildQrOptions() {
  return {
    type: 'png',
    width: QR_IMAGE_SIZE,
    margin: QR_MARGIN,
    errorCorrectionLevel: QR_ERROR_CORRECTION_LEVEL
  }
}

/**
 * Render PNG buffer QR dari sebuah string.
 * Dipisah dari handler agar mudah diuji tanpa Express/database.
 *
 * @param {string} content
 * @returns {Promise<Buffer>}
 */
export function renderQrPng(content) {
  return QRCode.toBuffer(String(content), buildQrOptions())
}

/**
 * Parse ID mesin dari parameter path menjadi BigInt.
 * Mengembalikan null bila bukan bilangan bulat positif.
 *
 * @param {unknown} rawId
 * @returns {bigint|null}
 */
export function parseMachineId(rawId) {
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) return null
  return BigInt(id)
}

/**
 * Mapping record Prisma (include plant + subMachines) → payload JSON siap konsumsi UI.
 * BigInt dikonversi ke Number agar aman diserialisasi JSON.
 *
 * @param {object} machine
 * @param {string} [frontendUrl]
 * @returns {{ id:number, name:string, plant_id:number|null, plant_name:string,
 *             sub_machines:Array<{id:number, name:string}>, qr_url_string:string }|null}
 */
export function mapMachineQrData(machine, frontendUrl = process.env.FRONTEND_URL) {
  if (!machine) return null
  const id = Number(machine.id)
  return {
    id,
    name: machine.name,
    plant_id: machine.plant_id !== null && machine.plant_id !== undefined
      ? Number(machine.plant_id)
      : null,
    plant_name: machine.plant?.name || 'Belum ditentukan',
    sub_machines: Array.isArray(machine.subMachines)
      ? machine.subMachines.map(sm => ({ id: Number(sm.id), name: sm.name }))
      : [],
    qr_url_string: buildMachinePublicUrl(id, frontendUrl)
  }
}

// Field minimal yang dibutuhkan generator QR (hindari SELECT *).
const MACHINE_QR_SELECT = {
  id: true,
  name: true,
  plant_id: true,
  plant: { select: { id: true, name: true } },
  subMachines: { select: { id: true, name: true }, orderBy: { id: 'asc' } }
}

/**
 * Nama file unduhan QR: qr-mesin-<id>-<slug-nama>.png (karakter non-aman dibuang).
 *
 * @param {{ id: bigint|number, name?: string }} machine
 * @returns {string}
 */
export function buildQrFilename(machine) {
  const slug = String(machine?.name || 'mesin')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'mesin'
  return `qr-mesin-${Number(machine?.id)}-${slug}.png`
}

/**
 * GET /api/v1/machines/:id/qr
 * Mengembalikan QR Code (PNG) berisi URL Buku Pintar Mesin.
 * Respons: Content-Type image/png, ukuran 300x300 px, margin 2, ECC level M.
 */
export async function getMachineQrImage(req, res, next) {
  try {
    const machineId = parseMachineId(req.params.id)
    if (machineId === null) {
      return errorResponse(res, { message: 'ID mesin tidak valid.', statusCode: 400 })
    }

    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true, name: true, plant_id: true, plant: { select: { name: true } } }
    })

    if (!machine) {
      return errorResponse(res, { message: 'Mesin tidak ditemukan', statusCode: 404 })
    }

    const qrUrlString = buildMachinePublicUrl(machine.id)
    const png = await renderQrPng(qrUrlString)
    const filename = buildQrFilename(machine)

    // Isi QR stabil (bergantung pada id mesin & FRONTEND_URL) → boleh di-cache
    // privat oleh browser agar modal tidak memicu request ulang di sesi yang sama.
    res.set('Cache-Control', 'private, max-age=3600')
    res.set('Content-Type', 'image/png')
    res.set('Content-Length', String(png.length))
    res.set(
      'Content-Disposition',
      `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    )
    res.set('X-QR-Content', qrUrlString)

    return res.status(200).end(png)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/v1/machines/:id/qr-data
 * Info mesin + string QR untuk ditampilkan pada modal sebelum mencetak.
 */
export async function getMachineQrData(req, res, next) {
  try {
    const machineId = parseMachineId(req.params.id)
    if (machineId === null) {
      return errorResponse(res, { message: 'ID mesin tidak valid.', statusCode: 400 })
    }

    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: MACHINE_QR_SELECT
    })

    if (!machine) {
      return errorResponse(res, { message: 'Mesin tidak ditemukan', statusCode: 404 })
    }

    // Audit trail: label QR hanya dicetak Admin sehingga jejak aktivitas berguna.
    await logActivity(
      req.user.id,
      'GENERATE_MACHINE_QR',
      `Buka generator QR mesin #${Number(machine.id)}: ${machine.name}`
    )

    return successResponse(res, {
      message: 'Data QR mesin berhasil diambil.',
      data: mapMachineQrData(machine)
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/v1/machines/qr-batch?plant_id=X[&machine_ids=1,2,3]
 * Daftar mesin beserta string QR untuk halaman cetak batch (grid kartu QR).
 * - `plant_id` wajib bila `machine_ids` tidak dikirim (cetak per Line/Plant).
 * - `machine_ids` opsional: batasi ke mesin tertentu (dipisah koma).
 */
export async function getMachineQrBatch(req, res, next) {
  try {
    const rawPlantId = req.query.plant_id ?? req.query.plantId
    const rawMachineIds = req.query.machine_ids ?? req.query.machineIds

    const where = {}

    const plantIdNum = Number(rawPlantId)
    if (rawPlantId !== undefined && rawPlantId !== '' && plantIdNum > 0) {
      where.plant_id = BigInt(plantIdNum)
    }

    const idList = String(rawMachineIds ?? '')
      .split(',')
      .map(part => Number(part.trim()))
      .filter(num => Number.isInteger(num) && num > 0)

    if (idList.length > 0) {
      where.id = { in: idList.map(id => BigInt(id)) }
    } else if (where.plant_id === undefined) {
      return errorResponse(res, {
        message: 'Parameter plant_id atau machine_ids wajib dikirim untuk cetak batch QR.',
        statusCode: 400
      })
    }

    const machines = await prisma.machine.findMany({
      where,
      select: MACHINE_QR_SELECT,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: QR_BATCH_MAX
    })

    const frontendUrl = normalizeFrontendUrl(process.env.FRONTEND_URL)
    const data = machines.map(machine => mapMachineQrData(machine, frontendUrl))

    return successResponse(res, {
      message: `${data.length} mesin siap dicetak QR-nya.`,
      data,
      meta: {
        total: data.length,
        plant_id: where.plant_id !== undefined ? Number(where.plant_id) : null,
        limit: QR_BATCH_MAX,
        frontend_url: frontendUrl
      }
    })
  } catch (err) {
    next(err)
  }
}
