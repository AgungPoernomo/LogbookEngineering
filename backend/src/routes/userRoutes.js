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

// GET /api/v1/users diizinkan untuk Admin, Supervisor, dan Teknisi (read-only).
// Teknisi secara paksa di-scope hanya ke plant-nya sendiri & akun aktif (lihat getUsers)
// untuk keperluan card "Teknisi di Line Ini" pada Dashboard Teknisi.
router.get('/', requireRoles('Admin', 'Supervisor', 'Teknisi'), getUsers)

// Operasi manajemen akun (CRUD) tetap eksklusif hanya untuk Admin
router.post('/', requireRoles('Admin'), createUser)
router.put('/:id', requireRoles('Admin'), updateUser)
router.delete('/:id', requireRoles('Admin'), toggleUserStatus)

export default router
