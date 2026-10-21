import { Router } from 'express'
import {
  processApproval,
  getApprovalHistory,
  processTechnicianApproval,
  getPendingApprovalsByTechnician
} from '../controllers/approvalController.js'
import { authenticate } from '../middlewares/auth.js'
import { requireRoles } from '../middlewares/rbac.js'

const router = Router()

// Logika Approval Per User (Teknisi)
router.get('/approvals/technicians', authenticate, requireRoles('Supervisor', 'Admin'), getPendingApprovalsByTechnician)
router.post('/approvals/technician/:userId', authenticate, requireRoles('Supervisor', 'Admin'), processTechnicianApproval)
router.post('/approvals/users/:userId', authenticate, requireRoles('Supervisor', 'Admin'), processTechnicianApproval)

// Approval individual (Backward compatibility)
router.post('/logbooks/:id/approval', authenticate, requireRoles('Supervisor', 'Admin'), processApproval)
router.get('/logbooks/:id/approvals', authenticate, getApprovalHistory)

export default router
