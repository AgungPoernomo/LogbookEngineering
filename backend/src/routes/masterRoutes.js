import { Router } from 'express'
import {
  getMasterData,
  createMasterData,
  updateMasterData,
  deleteMasterData
} from '../controllers/masterController.js'
import { authenticate } from '../middlewares/auth.js'
import { requireRoles } from '../middlewares/rbac.js'

const router = Router()

router.use(authenticate)

// Read master data (Semua peran)
router.get('/:type', getMasterData)

// Create, update, delete master data (Admin only)
router.post('/:type', requireRoles('Admin'), createMasterData)
router.put('/:type/:id', requireRoles('Admin'), updateMasterData)
router.delete('/:type/:id', requireRoles('Admin'), deleteMasterData)

export default router
