import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import prisma from '../src/config/prisma.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Robust CSV parser that handles newlines and escaped quotes inside quoted cells
function parseFullCSV(text) {
  const rows = []
  let currentRow = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"'
        i++ // Lewati escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ''
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++ // Lewati \n
      }
      currentRow.push(currentCell.trim())
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentCell = ''
    } else {
      currentCell += char
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow)
    }
  }

  return rows
}

async function analyze() {
  const csvPath = path.resolve(__dirname, '../../logbook.csv')
  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseFullCSV(content)
  
  console.log('Total baris CSV riil (dengan multiline quote handling):', rows.length)
  const header = rows[0]
  console.log('Header:', header)

  // Ambil users dari DB
  const users = await prisma.user.findMany({ select: { id: true, full_name: true, nik: true } })
  const userMap = new Map()
  users.forEach(u => {
    userMap.set(u.full_name.toLowerCase().trim(), u)
  })

  // Fuzzy / alias mapping untuk nama dengan salah ketik umum
  const nameAliases = {
    'sayyid muhhamad': 'sayyid muhammad',
    'muhammed akmal raditya': 'muhammad achmal triaditya',
    'm. ridho zerico': 'm. ridho zerico',
    'm. m. baihaqi': 'm. m. baihaqi'
  }

  const plants = new Set()
  const shifts = new Set()
  const machines = new Set()
  const subMachines = new Set()
  const unmatchedUsers = new Map()
  let matchedCount = 0

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i]
    if (cols.length < 8) continue

    const [tglKirim, plant, nama, shift, group, tglTugas, mesin, area] = cols

    if (plant) plants.add(plant)
    if (shift) shifts.add(shift)
    if (mesin) machines.add(mesin)
    if (mesin && area) subMachines.add(`${mesin} -> ${area}`)

    let cleanName = (nama || '').toLowerCase().trim()
    if (nameAliases[cleanName]) {
      cleanName = nameAliases[cleanName]
    }

    if (userMap.has(cleanName)) {
      matchedCount++
    } else {
      unmatchedUsers.set(nama, (unmatchedUsers.get(nama) || 0) + 1)
    }
  }

  console.log('\n--- ANALISIS DATA BERSIH ---')
  console.log('Total entri valid:', rows.length - 1)
  console.log('Plants riil:', Array.from(plants))
  console.log('Shifts riil:', Array.from(shifts))
  console.log('Total Mesin Unik:', machines.size, Array.from(machines))
  console.log('Total Sub-Mesin / Area Unik:', subMachines.size)
  console.log('\n--- KESESUAIAN PENGGUNA ---')
  console.log(`Cocok dengan user database: ${matchedCount} dari ${rows.length - 1} (${Math.round(matchedCount / (rows.length - 1) * 100)}%)`)
  console.log('Nama yang belum ada di DB:', Array.from(unmatchedUsers.entries()))

  await prisma.$disconnect()
}

analyze().catch(console.error)
