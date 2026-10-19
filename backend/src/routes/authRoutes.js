import { Router } from 'express'
import {
  login,
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  deleteAvatar
} from '../controllers/authController.js'
import { authenticate } from '../middlewares/auth.js'
import { uploadAvatarMiddleware } from '../middlewares/upload.js'

const router = Router()

// Public
router.post('/login', login)

// Protected
router.get('/me', authenticate, getProfile)
router.put('/profile', authenticate, updateProfile)
router.put('/password', authenticate, changePassword)
router.post('/change-password', authenticate, changePassword) // Alias endpoint

// Avatar Upload & Delete
router.post('/avatar', authenticate, uploadAvatarMiddleware.single('avatar'), uploadAvatar)
router.delete('/avatar', authenticate, deleteAvatar)

export default router
