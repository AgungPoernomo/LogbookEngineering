import { Router } from 'express'
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus
} from '../controllers/userController.js'
import { authenticate } from '../middlewares/auth.js'
import { requireRoles } from '../middlewares/rbac.js'

const router = Router()

router.use(authenticate)

// GET /api/v1/users diizinkan untuk Admin dan Supervisor (read-only untuk keperluan dashboard & aktivitas tim)
router.get('/', requireRoles('Admin', 'Supervisor'), getUsers)

// Operasi manajemen akun (CRUD) tetap eksklusif hanya untuk Admin
router.post('/', requireRoles('Admin'), createUser)
router.put('/:id', requireRoles('Admin'), updateUser)
router.delete('/:id', requireRoles('Admin'), toggleUserStatus)

export default router
