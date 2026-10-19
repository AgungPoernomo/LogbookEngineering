import app from './app.js'
import dotenv from 'dotenv'

dotenv.config()

const PORT = process.env.PORT || 3000

const server = app.listen(PORT, () => {
  console.log(`=================================================`)
  console.log(`🚀 Satoria Engineer Logbook Backend Server Ready!`)
  console.log(`📡 URL: http://localhost:${PORT}`)
  console.log(`🩺 Health: http://localhost:${PORT}/health`)
  console.log(`📚 Base API: http://localhost:${PORT}/api/v1`)
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`=================================================`)
})

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`\n[${signal}] Menutup server secara aman...`)
  server.close(() => {
    console.log('Server ditutup. Selesai.')
    process.exit(0)
  })
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'))
process.on('SIGINT', () => handleShutdown('SIGINT'))
