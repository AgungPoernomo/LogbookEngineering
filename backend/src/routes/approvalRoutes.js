import { Router } from 'express'
import { processApproval, getApprovalHistory } from '../controllers/approvalController.js'
import { authenticate } from '../middlewares/auth.js'
import { requireRoles } from '../middlewares/rbac.js'

const router = Router()

// Process approval action (Supervisor / Admin only)
router.post('/logbooks/:id/approval', authenticate, requireRoles('Supervisor', 'Admin'), processApproval)
router.get('/logbooks/:id/approvals', authenticate, getApprovalHistory)

export default router
