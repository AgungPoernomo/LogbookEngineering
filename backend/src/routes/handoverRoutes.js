import { Router } from 'express'
import { getHandoverBoard } from '../controllers/handoverController.js'
import { authenticate } from '../middlewares/auth.js'
import { requireRoles } from '../middlewares/rbac.js'

const router = Router()

router.get(
  '/handover',
  authenticate,
  requireRoles('Teknisi', 'Supervisor', 'Admin'),
  getHandoverBoard
)

export default router