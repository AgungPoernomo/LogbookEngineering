import { Router } from 'express'
import { getDashboardOverview } from '../controllers/overviewController.js'
import { authenticate } from '../middlewares/auth.js'
import { requireRoles } from '../middlewares/rbac.js'

const router = Router()

router.get(
  '/overview/dashboard',
  authenticate,
  requireRoles('Supervisor', 'Admin'),
  getDashboardOverview
)

export default router

