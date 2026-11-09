import { Router } from 'express'
import { getMachineHistory } from '../controllers/machineHistoryController.js'
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

export default router
