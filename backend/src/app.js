import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'

import authRoutes from './routes/authRoutes.js'
import logbookRoutes from './routes/logbookRoutes.js'
import approvalRoutes from './routes/approvalRoutes.js'
import masterRoutes from './routes/masterRoutes.js'
import userRoutes from './routes/userRoutes.js'
import reportRoutes from './routes/reportRoutes.js'
import auditRoutes from './routes/auditRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import supervisorRoutes from './routes/supervisorRoutes.js'
import overviewRoutes from './routes/overviewRoutes.js'
import handoverRoutes from './routes/handoverRoutes.js'
import machineRoutes from './routes/machineRoutes.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { successResponse, errorResponse } from './utils/response.js'

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { initSentry } from './config/sentry.js'

dotenv.config()
initSentry()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Middleware konfigurasi CORS
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map(o => o.trim())

app.use(cors({
  origin: (origin, callback) => {
    // Izinkan permintaan tanpa origin (seperti Postman, curl, server-to-server) atau yang ada di allowedOrigins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true)
    } else {
      callback(null, true) // Fleksibel di development
    }
  },
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Static file serving untuk upload lokal (Avatar WebP)
app.use('/uploads', express.static(path.resolve(__dirname, '../public/uploads')))

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'))
}

// Health check endpoint
app.get('/health', (req, res) => {
  return successResponse(res, {
    message: 'Satoria Logbook Backend API is running healthy',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
  })
})

app.get('/api/v1/health', (req, res) => {
  return successResponse(res, {
    message: 'API v1 is operational',
    data: { version: '1.0.0' }
  })
})

// Base API Routes per README Section 13.1
const API_PREFIX = '/api/v1'

app.use(`${API_PREFIX}/auth`, authRoutes)
app.use(`${API_PREFIX}/logbooks`, logbookRoutes)
app.use(API_PREFIX, approvalRoutes)
app.use(`${API_PREFIX}/master`, masterRoutes)
app.use(`${API_PREFIX}/users`, userRoutes)
app.use(`${API_PREFIX}/reports`, reportRoutes)
app.use(`${API_PREFIX}/admin`, auditRoutes)
// FASE 5.1 — Radar Aset Belum Terdaftar (rute /unmapped-assets, format JSON murni).
// Dipasang SETELAH auditRoutes agar rute /admin/audit-logs tetap ditangani auditRoutes;
// kedua router berbagi prefix /api/v1/admin sehingga pola "1 domain = 1 file route" terjaga.
app.use(`${API_PREFIX}/admin`, adminRoutes)
app.use(`${API_PREFIX}/notifications`, notificationRoutes)
app.use(`${API_PREFIX}/supervisor`, supervisorRoutes)
app.use(API_PREFIX, overviewRoutes)
app.use(API_PREFIX, handoverRoutes)
app.use(API_PREFIX, machineRoutes)

// 404 Route Handler
app.use((req, res) => {
  return errorResponse(res, {
    message: `Rute '${req.method} ${req.originalUrl}' tidak ditemukan pada server API.`,
    statusCode: 404
  })
})

// Central Error Handler
app.use(errorHandler)

export default app
