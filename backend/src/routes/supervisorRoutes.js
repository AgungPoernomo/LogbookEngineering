import { Router } from 'express'
import { getTeamOverview } from '../controllers/supervisorController.js'
import { getReliabilityAnalytics } from '../controllers/reliabilityAnalyticsController.js'
import { authenticate } from '../middlewares/auth.js'
import { requireRoles } from '../middlewares/rbac.js'

const router = Router()

router.use(authenticate)
router.use(requireRoles('Supervisor', 'Admin'))

router.get('/team-overview', getTeamOverview)

// Fase 4.4 — Pareto Bad Actor & Skill Matrix (agregasi dilakukan di database).
// RBAC plant-level divalidasi di dalam controller: Supervisor selalu terkunci ke
// plant pada JWT, Admin boleh memilih plant lewat query `plant_id`.
router.get('/reliability-analytics', getReliabilityAnalytics)

export default router
