import { Router } from 'express'
import { getAuditLogs } from '../controllers/auditController.js'
import { authenticate } from '../middlewares/auth.js'
import { requireRoles } from '../middlewares/rbac.js'

const router = Router()

router.use(authenticate)
router.use(requireRoles('Admin'))

router.get('/audit-logs', getAuditLogs)

export default router
