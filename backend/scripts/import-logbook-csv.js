import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import prisma from '../src/config/prisma.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Robust CSV parser yang mendukung koma dan multiline strings di dalam tanda kutip
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
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ''
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++
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

function padTime(t) {
  if (!t) return '08:00'
  const clean = t.trim()
  const p = clean.split(':')
  if (p.length >= 2) {
    return `${p[0].padStart(2, '0')}:${p[1].padStart(2, '0')}`
  }
  return clean
}

function parseDurationMinutes(durStr, startTime, endTime) {
  if (durStr) {
    const normalized = durStr.replace(',', '.').replace(/"/g, '').trim()
    const hours = parseFloat(normalized)
    if (!isNaN(hours) && hours > 0) {
      return Math.round(hours * 60)
    }
  }
  if (startTime && endTime) {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
      let diff = (eh * 60 + em) - (sh * 60 + sm)
      if (diff < 0) diff += 1440
      return diff
    }
  }
  return 30
}

function parseDateTime(dtStr, fallbackDate) {
  if (!dtStr) return new Date(fallbackDate || Date.now())
  const parts = dtStr.trim().split(' ')
  const dateParts = parts[0].split('/')
  if (dateParts.length === 3) {
    const [d, m, y] = dateParts
    const timePart = parts[1] || '08:00:00'
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${timePart.padStart(8, '0')}`
    const parsed = new Date(iso)
    if (!isNaN(parsed.getTime())) return parsed
  }
  return new Date(fallbackDate || Date.now())
}

function normalizeTaskDate(dateStr) {
  if (!dateStr) return new Date().toISOString().slice(0, 10)
  const clean = dateStr.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean
  if (clean.includes('/')) {
    const parts = clean.split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }
  return clean.slice(0, 10)
}

async function importLogbooks() {
  console.log('===============================================================')
  console.log('🚀 MEMULAI PROSES IMPORT MASSAL LOGBOOK RIIL KE TIDB CLOUD')
  console.log('===============================================================\n')

  const csvPath = path.resolve(__dirname, '../../logbook.csv')
  if (!fs.existsSync(csvPath)) {
    console.error('❌ File logbook.csv tidak ditemukan di:', csvPath)
    process.exit(1)
  }

  console.log(`📂 Membaca file CSV dari: ${csvPath}`)
  const rawContent = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseFullCSV(rawContent)

  if (rows.length <= 1) {
    console.error('❌ File CSV logbook kosong.')
    process.exit(1)
  }

  const [header, ...dataRows] = rows
  console.log(`📋 Header: ${header.join(' | ')}`)
  console.log(`📊 Ditemukan total ${dataRows.length} baris logbook.\n`)

  // 1. Siapkan Master Plants
  console.log('🏭 [1/5] Memeriksa Master Plants...')
  const dbPlants = await prisma.plant.findMany()
  const plantMap = new Map()
  dbPlants.forEach(p => {
    plantMap.set(p.name.toLowerCase().trim(), p.id)
  })

  // Fallback plant default (Line 1 / General)
  const defaultPlantId = plantMap.get('line 1') || plantMap.get('general') || dbPlants[0]?.id

  // 2. Siapkan Master Shifts
  console.log('⏰ [2/5] Memeriksa & Menginisialisasi Master Shifts...')
  const shiftsNeeded = [
    { name: 'Shift 1', start_time: '07:00', end_time: '15:00' },
    { name: 'Shift 2', start_time: '15:00', end_time: '23:00' },
    { name: 'Shift 3', start_time: '23:00', end_time: '07:00' },
    { name: 'Non Shift', start_time: '08:00', end_time: '16:00' },
    { name: 'Overtime', start_time: '16:00', end_time: '20:00' },
    { name: 'LongShift 1', start_time: '07:00', end_time: '19:00' },
    { name: 'LongShift 2', start_time: '19:00', end_time: '07:00' },
    { name: 'Others', start_time: '08:00', end_time: '17:00' }
  ]

  for (const s of shiftsNeeded) {
    let existing = await prisma.shift.findFirst({ where: { name: s.name } })
    if (!existing) {
      await prisma.shift.create({ data: s })
    }
  }

  const dbShifts = await prisma.shift.findMany()
  const shiftMap = new Map()
  dbShifts.forEach(s => {
    shiftMap.set(s.name.toLowerCase().trim(), s.id)
    // Alias shorthand
    if (s.name.startsWith('Shift ')) {
      shiftMap.set(s.name.replace('Shift ', '').toLowerCase(), s.id)
    }
  })
  const defaultShiftId = shiftMap.get('shift 1') || dbShifts[0]?.id

  // 3. Siapkan Master Users
  console.log('👥 [3/5] Memeriksa Daftar Pengguna Database...')
  const dbUsers = await prisma.user.findMany({ select: { id: true, full_name: true, nik: true, plant_id: true } })
  const userMap = new Map()
  dbUsers.forEach(u => {
    userMap.set(u.full_name.toLowerCase().trim(), u)
  })

  // Alias koreksi nama ketik
  const nameAliases = {
    'sayyid muhhamad': 'sayyid muhammad',
    'muhammed akmal raditya': 'muhammad achmal triaditya'
  }

  // Daftarkan Aditya Nanda Yudistira jika belum ada (agar 10 log miliknya masuk 100%)
  if (!userMap.has('aditya nanda yudistira')) {
    console.log('   -> Mendaftarkan user Aditya Nanda Yudistira...')
    const teknisiRole = await prisma.role.findFirst({ where: { name: 'Teknisi' } })
    const createdUser = await prisma.user.create({
      data: {
        nik: '331299',
        email: 'aditya.nanda.yudistira@satoria.co.id',
        full_name: 'Aditya Nanda Yudistira',
        password_hash: await bcrypt.hash('password123', 10),
        role_id: teknisiRole.id,
        plant_id: defaultPlantId,
        is_active: true
      }
    })
    userMap.set('aditya nanda yudistira', createdUser)
  }

  const defaultUser = dbUsers[0]

  // 4. Siapkan Master Mesin & Sub-Mesin Cache
  console.log('⚙️  [4/5] Mengindeks Master Mesin & Sub-Mesin...')
  const dbMachines = await prisma.machine.findMany()
  const machineCache = new Map() // `${name}__${plantId}` -> machineId
  dbMachines.forEach(m => {
    machineCache.set(`${m.name.toUpperCase().trim()}__${m.plant_id}`, m.id)
  })

  const dbSubMachines = await prisma.subMachine.findMany()
  const subMachineCache = new Map() // `${machineId}__${areaName}` -> subMachineId
  dbSubMachines.forEach(sm => {
    subMachineCache.set(`${sm.machine_id}__${sm.name.toUpperCase().trim()}`, sm.id)
  })

  async function getOrCreateMachine(rawName, plantId) {
    const cleanName = (rawName || 'OTHER').toUpperCase().trim().slice(0, 100)
    const key = `${cleanName}__${plantId}`
    if (machineCache.has(key)) return machineCache.get(key)

    let record = await prisma.machine.findFirst({
      where: { name: cleanName, plant_id: plantId }
    })
    if (!record) {
      record = await prisma.machine.create({
        data: { name: cleanName, plant_id: plantId }
      })
    }
    machineCache.set(key, record.id)
    return record.id
  }

  async function getOrCreateSubMachine(machineId, rawArea) {
    if (!rawArea || rawArea === '-' || (rawArea === rawArea.toUpperCase() && rawArea === 'OTHER')) {
      return null
    }
    const cleanArea = rawArea.trim().slice(0, 100)
    const key = `${machineId}__${cleanArea.toUpperCase()}`
    if (subMachineCache.has(key)) return subMachineCache.get(key)

    let record = await prisma.subMachine.findFirst({
      where: { machine_id: machineId, name: cleanArea }
    })
    if (!record) {
      record = await prisma.subMachine.create({
        data: { machine_id: machineId, name: cleanArea }
      })
    }
    subMachineCache.set(key, record.id)
    return record.id
  }

  // 5. Transform & Batch Insert Logbooks
  console.log('📥 [5/5] Melakukan transformasi dan batch insert 12.335 logbook ke TiDB Cloud...')

  const BATCH_SIZE = 500
  let currentBatch = []
  let totalInserted = 0
  const startTime = Date.now()

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    if (row.length < 8) continue

    const [tglKirim, plant, nama, shift, group, tglTugas, mesin, area, sparepart, aktivitas, start, end, durasi] = row

    // Resolusi User
    let cleanName = (nama || '').toLowerCase().trim()
    if (nameAliases[cleanName]) cleanName = nameAliases[cleanName]
    const user = userMap.get(cleanName) || defaultUser

    // Resolusi Plant
    const cleanPlant = (plant || '').toLowerCase().trim()
    const plantId = plantMap.get(cleanPlant) || user.plant_id || defaultPlantId

    // Resolusi Shift
    const cleanShift = (shift || '').toLowerCase().trim()
    const shiftId = shiftMap.get(cleanShift) || defaultShiftId

    // Resolusi Mesin & Sub-Mesin
    const machineId = await getOrCreateMachine(mesin || 'OTHER', plantId)
    const subMachineId = await getOrCreateSubMachine(machineId, area)

    // Waktu, Tanggal & Durasi
    const startTimeFormatted = padTime(start)
    const endTimeFormatted = padTime(end)
    const taskDate = normalizeTaskDate(tglTugas)
    const durationMinutes = parseDurationMinutes(durasi, startTimeFormatted, endTimeFormatted)
    const createdAt = parseDateTime(tglKirim, taskDate)

    const logbookItem = {
      user_id: user.id,
      plant_id: plantId,
      shift_id: shiftId,
      machine_id: machineId,
      sub_machine_id: subMachineId,
      task_date: taskDate,
      sparepart: (sparepart && sparepart !== '-') ? sparepart.trim().slice(0, 255) : null,
      activity_description: (aktivitas && aktivitas.trim().length > 0) ? aktivitas.trim() : 'Pekerjaan pemeliharaan dan inspeksi operasional',
      start_time: startTimeFormatted,
      end_time: endTimeFormatted,
      duration_minutes: durationMinutes,
      status: 'APPROVED',
      created_at: createdAt
    }

    currentBatch.push(logbookItem)

    if (currentBatch.length >= BATCH_SIZE) {
      await prisma.logbook.createMany({
        data: currentBatch
      })
      totalInserted += currentBatch.length
      currentBatch = []
      const percent = Math.round((totalInserted / dataRows.length) * 100)
      console.log(`   -> Terkirim: ${totalInserted.toLocaleString()} / ${dataRows.length.toLocaleString()} logbook (${percent}%)`)
    }
  }

  // Sisa batch terakhir
  if (currentBatch.length > 0) {
    await prisma.logbook.createMany({
      data: currentBatch
    })
    totalInserted += currentBatch.length
    console.log(`   -> Terkirim: ${totalInserted.toLocaleString()} / ${dataRows.length.toLocaleString()} logbook (100%)`)
  }

  const elapsedSeconds = Math.round((Date.now() - startTime) / 1000)

  console.log('\n===============================================================')
  console.log('🎉 SELURUH DATA LOGBOOK BERHASIL MASUK KE TIDB CLOUD!')
  console.log('===============================================================')
  console.log(`✅ Total Logbook Masuk Database : ${totalInserted.toLocaleString()} entri`)
  console.log(`⏱️  Waktu Eksekusi              : ${elapsedSeconds} detik`)
  console.log(`📊 Status Logbook               : Seluruhnya berstatus APPROVED`)
  console.log('===============================================================\n')
}

importLogbooks()
  .catch(err => {
    console.error('❌ Terjadi kesalahan saat import logbook:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
