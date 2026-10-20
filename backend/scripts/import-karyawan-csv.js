import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import prisma from '../src/config/prisma.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function importKaryawan() {
  console.log('===============================================================')
  console.log('🔄 MEMULAI PROSES RESET USER LAMA & IMPORT DATA KARYAWAN CSV')
  console.log('===============================================================\n')

  // 1. Temukan file CSV
  const possiblePaths = [
    path.resolve(__dirname, '../../karyawan.csv'),
    path.resolve(__dirname, '../karyawan.csv'),
    path.resolve(process.cwd(), 'karyawan.csv'),
    path.resolve(process.cwd(), '../karyawan.csv')
  ]

  let csvPath = null
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      csvPath = p
      break
    }
  }

  if (!csvPath) {
    console.error('❌ File karyawan.csv tidak ditemukan di:', possiblePaths)
    process.exit(1)
  }

  console.log(`📂 Membaca file CSV dari: ${csvPath}`)
  const rawCsv = fs.readFileSync(csvPath, 'utf-8')
  const lines = rawCsv
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  if (lines.length <= 1) {
    console.error('❌ File CSV kosong atau hanya berisi header.')
    process.exit(1)
  }

  const [headerLine, ...dataRows] = lines
  console.log(`📋 Header: ${headerLine}`)
  console.log(`📊 Ditemukan total ${dataRows.length} baris data karyawan.\n`)

  // 2. Bersihkan seluruh transaksi lama dan user lama sesuai instruksi
  console.log('🧹 [1/4] Membersihkan data transaksi lama & seluruh user lama...')
  await prisma.logbookApproval.deleteMany({})
  await prisma.notification.deleteMany({})
  await prisma.userActivity.deleteMany({})
  await prisma.logbook.deleteMany({})
  const deletedUsers = await prisma.user.deleteMany({})
  console.log(`   -> Berhasil menghapus ${deletedUsers.count} user lama dari database TiDB.\n`)

  // 3. Pastikan Master Data (Roles, Plants, WorkGroups) siap
  console.log('🏢 [2/4] Menyiapkan Master Roles, Plants, dan Work Groups...')

  // Roles
  const roles = await prisma.role.findMany()
  const roleMap = {}
  for (const r of roles) {
    roleMap[r.name.toLowerCase()] = r.id
  }

  // Plants
  const plants = await prisma.plant.findMany()
  const plantMap = {}
  for (const p of plants) {
    plantMap[p.name.toLowerCase()] = p.id
  }

  // Work Groups
  const groups = await prisma.workGroup.findMany()
  const groupMap = {}
  for (const g of groups) {
    groupMap[g.name.toLowerCase()] = g.id
  }

  // Helper upsert group jika belum ada (misal NS, Admin, dll.)
  async function ensureGroup(groupName) {
    if (!groupName) return null
    const key = groupName.trim().toLowerCase()
    if (groupMap[key]) return groupMap[key]

    // Normalisasi nama
    let normalized = groupName.trim()
    if (normalized.toUpperCase() === 'NON GROUP') normalized = 'NON GROUP'

    const created = await prisma.workGroup.upsert({
      where: { name: normalized },
      update: {},
      create: { name: normalized }
    })
    groupMap[key] = created.id
    return created.id
  }

  // Helper upsert plant jika belum ada
  async function ensurePlant(plantName) {
    if (!plantName) return null
    const key = plantName.trim().toLowerCase()
    if (plantMap[key]) return plantMap[key]

    const created = await prisma.plant.upsert({
      where: { name: plantName.trim() },
      update: {},
      create: { name: plantName.trim() }
    })
    plantMap[key] = created.id
    return created.id
  }

  console.log('   -> Master Data siap.\n')

  // 4. Hash password default 'password123'
  console.log('🔑 [3/4] Mengenkripsi kata sandi default ("password123")...')
  const defaultPasswordHash = await bcrypt.hash('password123', 10)
  console.log('   -> Hash bcrypt siap.\n')

  // 5. Parsing & Insert Users
  console.log('👥 [4/4] Mengimpor data karyawan ke TiDB...')

  const usedNiks = new Set()
  const usedEmails = new Set()
  let importedCount = 0
  let adminCount = 0
  let spvCount = 0
  let teknisiCount = 0

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    // Parsing CSV handling simple commas
    const parts = row.split(',').map(p => p.trim())
    const [rawName, rawNik, rawEmail, rawJabatan, rawGroup, rawPlant] = parts

    const fullName = rawName || `Karyawan ${i + 1}`

    // 1. Tentukan Role
    let roleId = roleMap['teknisi']
    const jabatanLower = (rawJabatan || '').toLowerCase()
    if (jabatanLower.includes('admin')) {
      roleId = roleMap['admin']
      adminCount++
    } else if (jabatanLower.includes('supervisor') || jabatanLower.includes('spv')) {
      roleId = roleMap['supervisor']
      spvCount++
    } else {
      roleId = roleMap['teknisi']
      teknisiCount++
    }

    // 2. Tentukan Plant & Group
    const plantId = await ensurePlant(rawPlant || 'General')
    const groupId = await ensureGroup(rawGroup || 'NON GROUP')

    // 3. Tentukan NIK Unik
    let nik = rawNik && rawNik !== '-' ? rawNik : ''
    if (!nik || usedNiks.has(nik)) {
      // Generate standard format NIK jika kosong/duplikat
      let autoNikNum = i + 1
      nik = `EMP-${String(autoNikNum).padStart(4, '0')}`
      while (usedNiks.has(nik)) {
        autoNikNum++
        nik = `EMP-${String(autoNikNum).padStart(4, '0')}`
      }
    }
    usedNiks.add(nik)

    // 4. Tentukan Email Unik
    let email = rawEmail && rawEmail !== '-' && rawEmail.includes('@') ? rawEmail.toLowerCase() : ''
    if (!email || usedEmails.has(email)) {
      // Buat email berbasis nama bersih atau NIK
      const cleanName = fullName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '')

      let candidate = `${cleanName || 'karyawan'}@satoria.co.id`
      if (usedEmails.has(candidate)) {
        candidate = `${cleanName}.${nik.toLowerCase().replace(/[^a-z0-9]/g, '')}@satoria.co.id`
      }
      if (usedEmails.has(candidate)) {
        candidate = `emp.${nik.toLowerCase().replace(/[^a-z0-9]/g, '')}@satoria.co.id`
      }
      email = candidate
    }
    usedEmails.add(email)

    // 5. Simpan ke Database TiDB
    await prisma.user.create({
      data: {
        nik,
        email,
        full_name: fullName,
        password_hash: defaultPasswordHash,
        role_id: roleId,
        plant_id: plantId,
        group_id: groupId,
        is_active: true
      }
    })

    importedCount++
  }

  console.log('\n===============================================================')
  console.log('✅ IMPORT KARYAWAN BERHASIL SELESAI!')
  console.log('===============================================================')
  console.log(`📊 Total Karyawan Masuk Database : ${importedCount}`)
  console.log(`👑 Admin                         : ${adminCount}`)
  console.log(`👔 Supervisor                    : ${spvCount}`)
  console.log(`🔧 Teknisi                       : ${teknisiCount}`)
  console.log(`🔑 Kata Sandi Default Seluruh Akun: password123`)
  console.log('===============================================================\n')
}

importKaryawan()
  .catch(err => {
    console.error('❌ Terjadi kesalahan saat import:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
