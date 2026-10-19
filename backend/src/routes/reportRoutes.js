import { Router } from 'express'
import { exportReport } from '../controllers/reportController.js'
import { authenticate } from '../middlewares/auth.js'
import { requireRoles } from '../middlewares/rbac.js'

const router = Router()

router.use(authenticate)
router.use(requireRoles('Supervisor', 'Admin'))

router.get('/export', exportReport)

export default router
