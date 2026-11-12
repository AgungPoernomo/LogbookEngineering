import { Router } from 'express'
import {
  getUnmappedAssets,
  promoteUnmappedAsset
} from '../controllers/adminUnmappedAssetController.js'
import { authenticate } from '../middlewares/auth.js'
import { requireRoles } from '../middlewares/rbac.js'

// FASE 5.1 — Radar Aset Belum Terdaftar (F5.1).
// Router dipasang di app.js pada prefix `/api/v1/admin`, sehingga seluruh rute di
// sini ditulis relatif terhadap prefix tersebut. Seluruh rute eksklusif Admin.
const router = Router()

router.use(authenticate)
router.use(requireRoles('Admin'))

// GET /api/v1/admin/unmapped-assets?plant_id=X
router.get('/unmapped-assets', getUnmappedAssets)

// POST /api/v1/admin/unmapped-assets/promote
router.post('/unmapped-assets/promote', promoteUnmappedAsset)

export default router
