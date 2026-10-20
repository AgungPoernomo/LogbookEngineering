import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

// Polyfill serialization BigInt to JSON
BigInt.prototype.toJSON = function () {
  return Number(this)
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
})

export default prisma
