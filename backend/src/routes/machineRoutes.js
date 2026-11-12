import { Router } from 'express'
import { getMachineHistory } from '../controllers/machineHistoryController.js'
import {
  getMachineQrImage,
  getMachineQrData,
  getMachineQrBatch
} from '../controllers/machineQrController.js'
import { authenticate } from '../middlewares/auth.js'
import { requireRoles } from '../middlewares/rbac.js'

// Catatan: router ini dipasang di root API (`app.use(API_PREFIX, machineRoutes)`),
// sehingga prefix `/machines` ditulis eksplisit di sini agar pola rute tetap utuh
// (satu segmen statis + parameter) pada semua versi path-to-regexp.
const router = Router()

// F3.4 "Buku Pintar Mesin" - rekam medis mesin (timeline, top failure code, top sparepart).
// RBAC plant-level divalidasi di dalam controller (Teknisi/Supervisor hanya Line sendiri).
router.get(
  '/machines/:id/history',
  authenticate,
  requireRoles('Teknisi', 'Supervisor', 'Admin'),
  getMachineHistory
)

// ============================================================================
// FASE 5.3 — Generator QR Code Mesin (KHUSUS ADMIN)
// QR berisi URL absolut frontend `/mesin/:id` (Buku Pintar Mesin) sehingga
// stiker QR yang di-scan teknisi lewat HP langsung membuka rekam medis mesin.
// `qr-batch` memakai segmen statis (tanpa `:id`) sehingga tidak bertabrakan
// dengan `/machines/:id/qr`; diletakkan lebih dulu agar urutan rute jelas.
// ============================================================================
router.get(
  '/machines/qr-batch',
  authenticate,
  requireRoles('Admin'),
  getMachineQrBatch
)

// Respons PNG (Content-Type: image/png, 300x300 px) — bukan JSON.
router.get(
  '/machines/:id/qr',
  authenticate,
  requireRoles('Admin'),
  getMachineQrImage
)

// Info mesin + string QR untuk modal preview sebelum cetak (JSON standar).
router.get(
  '/machines/:id/qr-data',
  authenticate,
  requireRoles('Admin'),
  getMachineQrData
)

export default router
