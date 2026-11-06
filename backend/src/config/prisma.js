import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

// Polyfill serialization BigInt to JSON
BigInt.prototype.toJSON = function () {
  return Number(this)
}

// F1.2: Singleton Prisma untuk mencegah kebocoran koneksi pada lingkungan serverless
// (Vercel) maupun saat hot-reload di dev. Instance disimpan di globalThis.
const globalForPrisma = globalThis

const prisma = globalForPrisma.__satoriaPrismaClient || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
})

if (!globalForPrisma.__satoriaPrismaClient) {
  globalForPrisma.__satoriaPrismaClient = prisma
}

export default prisma
