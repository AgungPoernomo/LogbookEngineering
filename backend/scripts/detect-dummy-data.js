/**
 * detect-dummy-data.js — DETEKSI DATA DUMMY/TESTING (READ-ONLY)
 * ------------------------------------------------------------------
 * Script ini HANYA MEMBACA database dan MENAMPILKAN laporan ke terminal
 * (+ opsional menyimpan salinan laporan ke `backend/audit/report-dummy-data.json`
 *  bila dijalankan dengan flag --json).
 *
 * DILARANG KERAS melakukan operasi create / update / delete pada database.
 * Script ini juga memverifikasi source-code-nya sendiri sebelum menyentuh DB
 * (lihat assertReadOnlySource) sehingga jika ada yang menambahkan operasi tulis,
 * script akan menolak berjalan.
 *
 * Yang dideteksi (audit sebelum deploy produksi):
 *   1. logbooks  — activity_description mengandung kata kunci testing
 *   2. users     — email bukan domain perusahaan ATAU nama/email mengandung kata kunci dummy
 *   3. machines  — name mengandung kata kunci dummy
 *   4. logbooks  — duplikat persis (user_id + task_date + activity_description sama)
 *
 * Catatan teknis:
 *   - TiDB (MySQL) umumnya memakai collation case-insensitive (utf8mb4_general_ci),
 *     sehingga `contains` sudah case-insensitive. Provider MySQL TIDAK mendukung
 *     `mode: 'insensitive'` (akan error validasi Prisma), jadi hasil filter Prisma
 *     tetap diverifikasi ulang di aplikasi (case-insensitive) sebagai lapis kedua.
 *   - Deteksi duplikat memakai `prisma.logbook.groupBy` (read-only) agar agregasi
 *     dilakukan oleh database, bukan dengan memuat 12rb+ baris ke memori.
 *
 * Cara pakai:
 *   cd backend
 *   node scripts/detect-dummy-data.js              -> laporan ke terminal
 *   node scripts/detect-dummy-data.js --json       -> + simpan backend/audit/report-dummy-data.json
 *   node scripts/detect-dummy-data.js --full       -> tampilkan semua baris (tanpa batas preview)
 *   node scripts/detect-dummy-data.js --limit=500  -> ubah batas preview per kategori (default 50)
 *
 * Batasan: tidak mengubah schema.prisma dan tidak mengubah/menghapus data apa pun.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import prisma from '../src/config/prisma.js'
import { getWIBDateString, getWIBTime } from '../src/utils/date.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const AUDIT_DIR = path.resolve(__dirname, '../audit')

// ============================================================
// Konfigurasi deteksi
// ============================================================
const COMPANY_EMAIL_DOMAIN = 'satoria.co.id'

const LOGBOOK_TESTING_KEYWORDS = ['test', 'e2e', 'tes ', 'coba', 'dummy', 'asdf']
const USER_NAME_KEYWORDS = ['uji', 'test', 'dummy', 'admin1', 'teknisi1']
const MACHINE_NAME_KEYWORDS = ['test', 'e2e', 'promoted', 'coba', 'mesin baru']

// Batas preview baris per kategori di terminal (agar output tetap terbaca)
const DEFAULT_PREVIEW_LIMIT = 50
const DESCRIPTION_PREVIEW_LENGTH = 80

// ============================================================
// Pengaman: pastikan script ini murni READ-ONLY
// (nama method dirakit dari potongan string agar detektor tidak salah menandai dirinya sendiri,
//  sama seperti pola yang dipakai scripts/01-audit-data.js)
// ============================================================
const READ_ONLY_PRISMA_METHODS = ['findMany', 'findFirst', 'findUnique', 'count', 'groupBy', 'aggregate']
const MUTATING_METHODS = [
  'cre' + 'ate', 'cre' + 'ateMany', 'upd' + 'ate', 'upd' + 'ateMany',
  'del' + 'ete', 'del' + 'eteMany', 'ups' + 'ert', 'exec' + 'uteRaw'
]

function assertReadOnlySource() {
  const source = fs.readFileSync(__filename, 'utf-8')
  const forbidden = MUTATING_METHODS.filter(method =>
    new RegExp(`prisma\\s*\\.\\s*[a-zA-Z]+\\s*\\.\\s*${method}\\b`).test(source) ||
    new RegExp(`\\$\\s*${method}`).test(source)
  )
  if (forbidden.length > 0) {
    throw new Error(`[ABORT] Script deteksi tidak boleh memakai operasi tulis: ${forbidden.join(', ')}`)
  }

  const usedMethods = (source.match(/prisma\.[a-zA-Z]+\.([a-zA-Z]+)\s*\(/g) || [])
    .map(call => call.replace(/^prisma\.[a-zA-Z]+\./, '').replace(/[\s(]/g, ''))
  const notAllowed = usedMethods.filter(method => !READ_ONLY_PRISMA_METHODS.includes(method))
  if (notAllowed.length > 0) {
    throw new Error(`[ABORT] Method Prisma non read-only terdeteksi: ${[...new Set(notAllowed)].join(', ')}`)
  }
}

// ============================================================
// Helper umum
// ============================================================
function parseArgs(argv) {
  const options = { json: false, full: false, limit: DEFAULT_PREVIEW_LIMIT }
  for (const arg of argv) {
    if (arg === '--json') options.json = true
    else if (arg === '--full') options.full = true
    else if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.split('=')[1])
      if (Number.isFinite(parsed) && parsed > 0) options.limit = Math.floor(parsed)
    }
  }
  if (options.full) options.limit = Number.POSITIVE_INFINITY
  return options
}

/** Ubah BigInt (id TiDB) menjadi Number agar aman di JSON & template string. */
function toNum(value) {
  if (value === null || value === undefined) return null
  return Number(value)
}

/** Cek kata kunci (case-insensitive) pada sebuah nilai; kembalikan daftar keyword yang cocok. */
function matchKeywords(rawValue, keywords) {
  const value = String(rawValue ?? '').toLowerCase()
  if (!value) return []
  return keywords.filter(keyword => value.includes(keyword.toLowerCase()))
}

/** Potong teks panjang agar laporan terminal tetap rapi (satu baris per temuan). */
function truncate(text, maxLength = DESCRIPTION_PREVIEW_LENGTH) {
  const value = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1)}…`
}

/** Email dianggap resmi bila berakhiran @satoria.co.id (case-insensitive). */
function isCompanyEmail(email) {
  return String(email ?? '').trim().toLowerCase().endsWith(`@${COMPANY_EMAIL_DOMAIN}`)
}

// ============================================================
// Query (SEMUA READ-ONLY: findMany / groupBy)
// ============================================================

/** 1. Logbook yang activity_description-nya mengandung kata kunci testing. */
async function findTestingLogbooks() {
  const rows = await prisma.logbook.findMany({
    where: {
      // OR antar-keyword: bila satu deskripsi memuat beberapa keyword, baris tetap muncul sekali.
      OR: LOGBOOK_TESTING_KEYWORDS.map(keyword => ({
        activity_description: { contains: keyword }
      }))
    },
    select: {
      id: true,
      user_id: true,
      task_date: true,
      activity_description: true,
      created_at: true,
      user: { select: { full_name: true } }
    },
    orderBy: { id: 'asc' }
  })

  // Verifikasi ulang di aplikasi (case-insensitive) agar hasil tetap benar
  // walaupun collation kolom di TiDB bukan case-insensitive.
  return rows
    .map(row => ({
      id: toNum(row.id),
      user_id: toNum(row.user_id),
      user_name: row.user?.full_name ?? null,
      task_date: row.task_date,
      created_at: row.created_at,
      activity_description: row.activity_description,
      matched_keywords: matchKeywords(row.activity_description, LOGBOOK_TESTING_KEYWORDS)
    }))
    .filter(row => row.matched_keywords.length > 0)
}

/** 2. User dummy: email bukan @satoria.co.id ATAU nama/email mengandung kata kunci dummy. */
async function findDummyUsers() {
  const rows = await prisma.user.findMany({
    where: {
      OR: [
        // (a) Di luar domain perusahaan (email kosong / tanpa '@' juga ikut terjaring).
        { NOT: { email: { endsWith: `@${COMPANY_EMAIL_DOMAIN}` } } },
        // (b) Nama atau email mengandung kata kunci dummy.
        ...USER_NAME_KEYWORDS.flatMap(keyword => [
          { full_name: { contains: keyword } },
          { email: { contains: keyword } }
        ])
      ]
    },
    select: {
      id: true,
      nik: true,
      full_name: true,
      email: true,
      is_active: true,
      role: { select: { name: true } }
    },
    orderBy: { id: 'asc' }
  })

  return rows.map(row => {
    const reasons = []
    if (!isCompanyEmail(row.email)) reasons.push(`email bukan @${COMPANY_EMAIL_DOMAIN}`)

    const nameHits = matchKeywords(row.full_name, USER_NAME_KEYWORDS)
    if (nameHits.length > 0) reasons.push(`nama mengandung "${nameHits.join('", "')}"`)

    const emailHits = matchKeywords(row.email, USER_NAME_KEYWORDS)
    if (emailHits.length > 0) reasons.push(`email mengandung "${emailHits.join('", "')}"`)

    return {
      id: toNum(row.id),
      nik: row.nik,
      full_name: row.full_name,
      email: row.email,
      role: row.role?.name ?? null,
      is_active: row.is_active,
      reasons
    }
  })
}

/** 3. Mesin dummy: name mengandung kata kunci testing. */
async function findDummyMachines() {
  const rows = await prisma.machine.findMany({
    where: {
      OR: MACHINE_NAME_KEYWORDS.map(keyword => ({
        name: { contains: keyword }
      }))
    },
    select: {
      id: true,
      name: true,
      plant_id: true,
      plant: { select: { name: true } }
    },
    orderBy: { id: 'asc' }
  })

  return rows
    .map(row => ({
      id: toNum(row.id),
      name: row.name,
      plant_id: toNum(row.plant_id),
      plant_name: row.plant?.name ?? null,
      matched_keywords: matchKeywords(row.name, MACHINE_NAME_KEYWORDS)
    }))
    .filter(row => row.matched_keywords.length > 0)
}

/**
 * 4. Logbook duplikat: user_id + task_date + activity_description identik persis
 *    dan muncul lebih dari satu kali (indikasi testing repeat failure / spam klik).
 *    Memakai groupBy (read-only) → agregasi dilakukan TiDB, bukan di memori.
 */
async function findDuplicateLogbooks() {
  const groups = await prisma.logbook.groupBy({
    by: ['user_id', 'task_date', 'activity_description'],
    where: {
      // Abaikan deskripsi kosong: bukan indikasi spam, melainkan data tidak lengkap.
      NOT: { activity_description: '' }
    },
    _count: { _all: true },
    having: {
      activity_description: {
        _count: { gt: 1 }
      }
    },
    orderBy: [
      { user_id: 'asc' },
      { task_date: 'asc' }
    ]
  })

  const duplicates = groups
    .map(group => ({
      user_id: toNum(group.user_id),
      task_date: group.task_date,
      activity_description: group.activity_description,
      duplicate_count: group._count?._all ?? 0
    }))
    .filter(group => group.duplicate_count > 1)

  if (duplicates.length === 0) return []

  // Ambil seluruh ID logbook yang tergabung dalam kelompok duplikat (satu query, read-only).
  const rows = await prisma.logbook.findMany({
    where: {
      OR: duplicates.map(group => ({
        user_id: BigInt(group.user_id),
        task_date: group.task_date,
        activity_description: group.activity_description
      }))
    },
    select: { id: true, user_id: true, task_date: true, activity_description: true },
    orderBy: { id: 'asc' }
  })

  const idMap = new Map()
  for (const row of rows) {
    const key = `${toNum(row.user_id)}|${row.task_date}|${row.activity_description}`
    if (!idMap.has(key)) idMap.set(key, [])
    idMap.get(key).push(toNum(row.id))
  }

  // Lengkapi nama user agar laporan lebih mudah dibaca.
  const userIds = [...new Set(duplicates.map(group => group.user_id))]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds.map(id => BigInt(id)) } },
    select: { id: true, full_name: true }
  })
  const userNameMap = new Map(users.map(user => [toNum(user.id), user.full_name]))

  return duplicates.map(group => ({
    ...group,
    user_name: userNameMap.get(group.user_id) ?? null,
    logbook_ids: idMap.get(`${group.user_id}|${group.task_date}|${group.activity_description}`) ?? []
  }))
}

// ============================================================
// Penyusun laporan terminal
// ============================================================

/** Info jumlah baris yang disembunyikan karena batas preview. */
function previewNote(total, shown) {
  return total > shown ? `  … dan ${total - shown} baris lainnya (jalankan dengan --full untuk melihat semua)` : null
}

function buildUserSection(users) {
  const lines = []
  lines.push(`🚨 [USER DUMMY] Ditemukan ${users.length} akun dummy:`)
  if (users.length === 0) {
    lines.push('   ✅ Tidak ada akun dummy terdeteksi.')
    return lines
  }
  const statusLabel = user => (user.is_active === false ? ' (nonaktif)' : '')
  for (const user of users) {
    lines.push(`- ID: ${user.id} | ${user.email} | ${user.full_name} | ${user.role ?? '-'}${statusLabel(user)}`)
    lines.push(`   ↳ alasan: ${user.reasons.join('; ')}`)
  }
  return lines
}

function buildMachineSection(machines) {
  const lines = []
  lines.push(`🚨 [MESIN DUMMY] Ditemukan ${machines.length} mesin dummy:`)
  if (machines.length === 0) {
    lines.push('   ✅ Tidak ada mesin dummy terdeteksi.')
    return lines
  }
  for (const machine of machines) {
    const plantLabel = machine.plant_id === null
      ? 'Tanpa Plant'
      : `${machine.plant_name ?? 'Plant'} (ID: ${machine.plant_id})`
    lines.push(`- ID: ${machine.id} | ${machine.name} | ${plantLabel}`)
  }
  return lines
}

function buildLogbookTestingSection(logbooks, limit) {
  const lines = []
  lines.push(`🚨 [LOGBOOK TESTING] Ditemukan ${logbooks.length} logbook dengan kata kunci test:`)
  if (logbooks.length === 0) {
    lines.push('   ✅ Tidak ada logbook testing terdeteksi.')
    return lines
  }
  const shown = logbooks.slice(0, limit)
  for (const logbook of shown) {
    const owner = logbook.user_name ? `User: ${logbook.user_id} (${logbook.user_name})` : `User: ${logbook.user_id}`
    lines.push(`- ID: ${logbook.id} | "${truncate(logbook.activity_description)}" | ${owner} | Tanggal: ${logbook.task_date}`)
  }
  const note = previewNote(logbooks.length, shown.length)
  if (note) lines.push(note)
  return lines
}

function buildDuplicateSection(duplicates, limit) {
  const lines = []
  const totalRows = duplicates.reduce((sum, group) => sum + group.duplicate_count, 0)
  lines.push(`⚠️  [LOGBOOK DUPLIKAT] Ditemukan deskripsi identik pada user & tanggal yang sama:`)
  lines.push(`   ${duplicates.length} kelompok duplikat | ${totalRows} baris logbook terlibat`)
  if (duplicates.length === 0) {
    lines.push('   ✅ Tidak ada logbook duplikat terdeteksi.')
    return lines
  }
  const shown = duplicates.slice(0, limit)
  for (const group of shown) {
    const owner = group.user_name ? `User ${group.user_id} (${group.user_name})` : `User ${group.user_id}`
    lines.push(`- ${owner}, Tanggal ${group.task_date}, Desc: "${truncate(group.activity_description)}" (${group.duplicate_count}x)`)
    if (group.logbook_ids.length > 0) {
      lines.push(`   ↳ ID logbook: ${group.logbook_ids.join(', ')}`)
    }
  }
  const note = previewNote(duplicates.length, shown.length)
  if (note) lines.push(note)
  return lines
}

function buildSummaryLines(report) {
  const { meta, users, machines, testingLogbooks, duplicateLogbooks } = report
  const affectedLogbooks = new Set([
    ...testingLogbooks.map(row => row.id),
    ...duplicateLogbooks.flatMap(group => group.logbook_ids)
  ])
  const duplicateRows = duplicateLogbooks.reduce((sum, group) => sum + group.duplicate_count, 0)

  return [
    '============================================================',
    ' RINGKASAN',
    '============================================================',
    ` Users dummy          : ${users.length}`,
    ` Mesin dummy          : ${machines.length}`,
    ` Logbook testing      : ${testingLogbooks.length}`,
    ` Kelompok duplikat    : ${duplicateLogbooks.length} (${duplicateRows} baris)`,
    ` Logbook unik tersentuh: ${affectedLogbooks.size}`,
    ` Mode                 : READ-ONLY (tidak ada data diubah/dihapus)`,
    ` Waktu audit          : ${meta.run_at_wib} WIB`
  ]
}

function printReport(report, options) {
  const lines = []
  lines.push('')
  lines.push('=== LAPORAN DETEKSI DATA DUMMY ===')
  lines.push('')
  lines.push(...buildUserSection(report.users))
  lines.push('')
  lines.push(...buildMachineSection(report.machines))
  lines.push('')
  lines.push(...buildLogbookTestingSection(report.testingLogbooks, options.limit))
  lines.push('')
  lines.push(...buildDuplicateSection(report.duplicateLogbooks, options.limit))
  lines.push('')
  lines.push(...buildSummaryLines(report))
  lines.push('')
  console.log(lines.join('\n'))
}
