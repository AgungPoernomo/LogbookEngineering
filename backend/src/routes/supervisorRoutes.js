import { Router } from 'express'
import { getTeamOverview } from '../controllers/supervisorController.js'
import { authenticate } from '../middlewares/auth.js'
import { requireRoles } from '../middlewares/rbac.js'

const router = Router()

router.use(authenticate)
router.use(requireRoles('Supervisor', 'Admin'))

router.get('/team-overview', getTeamOverview)

export default router
