import { Router } from 'express'
import {
  getLogbooks,
  createLogbook,
  getLogbookById,
  updateLogbook,
  deleteLogbook,
  submitAllDrafts
} from '../controllers/logbookController.js'
import { authenticate } from '../middlewares/auth.js'
import { requireRoles } from '../middlewares/rbac.js'

const router = Router()

router.use(authenticate)

router.get('/', getLogbooks)
router.post('/', requireRoles('Teknisi', 'Admin'), createLogbook)
router.post('/submit-all-drafts', requireRoles('Teknisi'), submitAllDrafts)
router.get('/:id', getLogbookById)
router.put('/:id', requireRoles('Teknisi', 'Admin'), updateLogbook)
router.delete('/:id', requireRoles('Teknisi', 'Admin'), deleteLogbook)

export default router
