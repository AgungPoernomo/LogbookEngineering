/**
 * 01-audit-data.js — AUDIT DATA TESTING/DUMMY (READ-ONLY)
 * -------------------------------------------------------
 * Script ini HANYA MEMBACA database dan menulis laporan ke folder `backend/audit/`.
 * DILARANG KERAS memuat perintah delete / update / create terhadap database.
 *
 * Aturan suspicion_score (0-100) — dipakai untuk plants, machines, users, dan logbooks:
 *   +40  Nama/NIK/Email mengandung kata kunci testing (test, dummy, coba, asdf, qwerty, karawang)
 *   +30  created_at jatuh pada tanggal hari ini (WIB) -> indikasi baru dibuat untuk testing
 *   +30  users / machines yang total logbook-nya 0 (tidak pernah dipakai)
 *   +20  Email domain aneh (@test.com, @example.com, @gmail.com, dst)
 *   +10  NIK tidak mengikuti pola angka / kurang dari 5 digit
 *
 * Cara pakai:
 *   cd backend
 *   node scripts/01-audit-data.js
 *
 * Batasan: tidak mengubah schema.prisma dan tidak mengubah/menghapus data apa pun.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import prisma from '../src/config/prisma.js'
import { getWIBDateString } from '../src/utils/date.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const AUDIT_DIR = path.resolve(__dirname, '../audit')

// ============================================================
// Pengaman: pastikan script ini murni READ-ONLY
// (nama method dirakit dari potongan string agar detektor tidak salah menandai dirinya sendiri)
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
    throw new Error(`[ABORT] Script audit tidak boleh memakai operasi tulis: ${forbidden.join(', ')}`)
  }

  const usedMethods = (source.match(/prisma\.[a-zA-Z]+\.([a-zA-Z]+)\s*\(/g) || [])
    .map(call => call.replace(/^prisma\.[a-zA-Z]+\./, '').replace(/[\s(]/g, ''))
  const notAllowed = usedMethods.filter(method => !READ_ONLY_PRISMA_METHODS.includes(method))
  if (notAllowed.length > 0) {
    throw new Error(`[ABORT] Method Prisma non read-only terdeteksi: ${[...new Set(notAllowed)].join(', ')}`)
  }
}

// ============================================================
// Aturan skoring
// ============================================================
const SUSPICIOUS_KEYWORDS = ['test', 'dummy', 'coba', 'asdf', 'qwerty', 'karawang']
const WEIRD_EMAIL_DOMAINS = [
  'test.com', 'example.com', 'example.org', 'example.net',
  'mailinator.com', 'tempmail.com', 'temp-mail.org', 'yopmail.com',
  'guerrillamail.com', '10minutemail.com', 'trashmail.com',
  'gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com'
]
const MIN_NIK_DIGITS = 5
const MAX_SCORE = 100

// Tanggal acuan hari ini dalam zona waktu operasional (WIB), konsisten dengan src/utils/date.js
const todayWIB = getWIBDateString()

/** Ambil domain email, atau null bila bukan email valid sama sekali. */
function getEmailDomain(email) {
  const value = String(email ?? '').trim().toLowerCase()
  const atIndex = value.lastIndexOf('@')
  if (atIndex <= 0 || atIndex === value.length - 1) return null
  return value.slice(atIndex + 1)
}

/**
 * Domain dianggap wajar bila berpola `nama.tld` (tld >= 2 huruf),
 * mis. `satoria.co.id`, `gmail.com`. Domain seperti `a` atau `localhost` dianggap tidak wajar.
 */
function isPlausibleDomain(domain) {
  if (!domain) return false
  return /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)
}

/**
 * Cek kata kunci testing pada satu atau beberapa field sekaligus.
 * @param {Record<string, unknown>} fields — label field -> nilai
 * @returns {string[]} daftar temuan (mis. 'name mengandung "test"')
 */
function findKeywordHits(fields) {
  const hits = []
  for (const [label, rawValue] of Object.entries(fields)) {
    const value = String(rawValue ?? '').toLowerCase()
    if (!value) continue
    for (const keyword of SUSPICIOUS_KEYWORDS) {
      if (value.includes(keyword)) hits.push(`${label} mengandung "${keyword}"`)
    }
  }
  return hits
}

/** @returns {boolean} true bila created_at berada pada tanggal hari ini (WIB) */
function isCreatedToday(createdAt) {
  if (!createdAt) return false
  return getWIBDateString(createdAt) === todayWIB
}

function clampScore(score) {
  return Math.max(0, Math.min(MAX_SCORE, score))
}

function toIsoOrNull(value) {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

// ============================================================
// Auditor generik — satu instance per baris
// ============================================================
class SuspicionAuditor {
  constructor(entityLabel) {
    this.entityLabel = entityLabel
    this.score = 0
    this.reasons = []
  }

  add(points, reason) {
    this.score += points
    this.reasons.push(`[+${points}] ${reason}`)
  }

  /** +40 — nama / nik / email mengandung kata kunci testing (case-insensitive) */
  checkKeywords(fields) {
    const hits = findKeywordHits(fields)
    if (hits.length > 0) {
      this.add(40, `Nama/NIK/Email mengandung kata kunci testing: ${hits.join('; ')}`)
    }
  }

  /** +30 — dibuat pada tanggal hari ini (WIB) */
  checkCreatedToday(createdAt) {
    if (isCreatedToday(createdAt)) {
      this.add(30, `Dibuat pada tanggal hari ini (${todayWIB} WIB) — indikasi data testing baru`)
    }
  }

  /** +30 — users / machines yang total logbook-nya 0 (tidak pernah dipakai) */
  checkNoLogbook(logbookCount) {
    if (logbookCount === 0) {
      this.add(30, `Tidak pernah dipakai: total logbook ${this.entityLabel} ini = 0`)
    }
  }

  /** +20 — email domain aneh / bukan domain perusahaan */
  checkEmailDomain(email) {
    const raw = String(email ?? '').trim()
    if (!raw) return
    const domain = getEmailDomain(raw)
    if (!isPlausibleDomain(domain)) {
      this.add(20, `Email tidak valid / domain tidak wajar: "${raw}"`)
      return
    }
    const isWeird = WEIRD_EMAIL_DOMAINS.some(item => domain === item || domain.endsWith(`.${item}`))
    if (isWeird) {
      this.add(20, `Email domain tidak lazim untuk akun perusahaan (@${domain})`)
    }
  }

  /** +10 — NIK tidak mengikuti pola angka / kurang dari 5 digit */
  checkNikPattern(nik) {
    const value = String(nik ?? '').trim()
    if (!value) {
      this.add(10, 'NIK kosong')
      return
    }
    const digitCount = (value.match(/\d/g) || []).length
    if (!/^\d+$/.test(value)) {
      this.add(10, `NIK tidak murni angka ("${value}")`)
    } else if (digitCount < MIN_NIK_DIGITS) {
      this.add(10, `NIK kurang dari ${MIN_NIK_DIGITS} digit ("${value}" = ${digitCount} digit)`)
    }
  }

  toResult(base) {
    const score = clampScore(this.score)
    return {
      ...base,
      suspicion_score: score,
      suspicion_reasons: score > 0 ? this.reasons : ['Tidak ada indikasi data testing']
    }
  }
}

// ============================================================
// Builder laporan per tabel
// ============================================================
function buildPlantsReport(plants) {
  return plants.map(plant => {
    const auditor = new SuspicionAuditor('plant')
    const logbookCount = plant._count?.logbooks ?? 0
    const machineCount = plant._count?.machines ?? 0
    const userCount = plant._count?.users ?? 0

    auditor.checkKeywords({ name: plant.name })
    if (logbookCount === 0 && machineCount === 0 && userCount === 0) {
      auditor.add(30, 'Tidak pernah dipakai: plant tanpa logbook, tanpa mesin, dan tanpa user')
    }

    return auditor.toResult({
      id: Number(plant.id),
      name: plant.name,
      created_at: null, // tabel plants tidak memiliki kolom created_at
      logbook_count: logbookCount,
      machine_count: machineCount,
      user_count: userCount
    })
  })
}

function buildMachinesReport(machines) {
  return machines.map(machine => {
    const auditor = new SuspicionAuditor('machine')
    const logbookCount = machine._count?.logbooks ?? 0

    auditor.checkKeywords({ name: machine.name })
    auditor.checkNoLogbook(logbookCount)

    return auditor.toResult({
      id: Number(machine.id),
      name: machine.name,
      created_at: null, // tabel machines tidak memiliki kolom created_at
      plant_id: machine.plant_id === null || machine.plant_id === undefined ? null : Number(machine.plant_id),
      plant_name: machine.plant?.name ?? null,
      logbook_count: logbookCount
    })
  })
}

function buildUsersReport(users) {
  return users.map(user => {
    const auditor = new SuspicionAuditor('user')
    const logbookCount = user._count?.logbooks ?? 0

    auditor.checkKeywords({ full_name: user.full_name, nik: user.nik, email: user.email })
    auditor.checkCreatedToday(user.created_at)
    auditor.checkNoLogbook(logbookCount)
    auditor.checkEmailDomain(user.email)
    auditor.checkNikPattern(user.nik)

    return auditor.toResult({
      id: Number(user.id),
      name: user.full_name,
      nik: user.nik,
      email: user.email,
      created_at: toIsoOrNull(user.created_at),
      logbook_count: logbookCount,
      plant_name: user.plant?.name ?? null
    })
  })
}

function buildLogbooksReport(logbooks) {
  return logbooks.map(logbook => {
    const auditor = new SuspicionAuditor('logbook')

    auditor.checkKeywords({
      activity_description: logbook.activity_description,
      sparepart: logbook.sparepart,
      unmapped_asset_note: logbook.unmapped_asset_note,
      user_name: logbook.user?.full_name,
      user_nik: logbook.user?.nik,
      user_email: logbook.user?.email
    })
    auditor.checkCreatedToday(logbook.created_at)

    return auditor.toResult({
      id: Number(logbook.id),
      name: logbook.activity_description,
      created_at: toIsoOrNull(logbook.created_at),
      task_date: logbook.task_date,
      user_id: Number(logbook.user_id),
      user_name: logbook.user?.full_name ?? null,
      user_nik: logbook.user?.nik ?? null,
      plant_id: Number(logbook.plant_id),
      plant_name: logbook.plant?.name ?? null,
      machine_id: logbook.machine_id === null || logbook.machine_id === undefined ? null : Number(logbook.machine_id),
      machine_name: logbook.machine?.name ?? null,
      status: logbook.status
    })
  })
}

// ============================================================
// Helper output
// ============================================================
function summarizeScores(rows) {
  const distribution = { skor_0: 0, skor_1_29: 0, skor_30_59: 0, skor_60_99: 0, skor_100: 0 }
  for (const row of rows) {
    const score = row.suspicion_score
    if (score === 0) distribution.skor_0++
    else if (score < 30) distribution.skor_1_29++
    else if (score < 60) distribution.skor_30_59++
    else if (score < 100) distribution.skor_60_99++
    else distribution.skor_100++
  }
  return distribution
}

function writeReport(fileName, rows) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true })
  const filePath = path.join(AUDIT_DIR, fileName)
  fs.writeFileSync(filePath, `${JSON.stringify(rows, null, 2)}\n`, 'utf-8')
  return filePath
}

function collectTopSuspicious(label, rows, limit = 5) {
  const flagged = rows
    .filter(row => row.suspicion_score > 0)
    .sort((a, b) => b.suspicion_score - a.suspicion_score)
    .slice(0, limit)

  if (flagged.length === 0) {
    return [`  ${label}: tidak ada data mencurigakan.`]
  }

  return flagged.flatMap(row => {
    const identity = row.nik ? `${row.name} (NIK: ${row.nik})` : `${row.name} [id ${row.id}]`
    const reason = row.suspicion_reasons.find(item => item.startsWith('[+')) || '-'
    return `  - skor ${row.suspicion_score} | ${identity} -> ${reason}`
  })
}

// ============================================================
// Runner utama (READ-ONLY)
// ============================================================
async function runAudit() {
  assertReadOnlySource()

  // ---- Baca data (read-only) ----
  const plants = await prisma.plant.findMany({
    select: {
      id: true,
      name: true,
      _count: { select: { logbooks: true, machines: true, users: true } }
    },
    orderBy: { id: 'asc' }
  })

  const machines = await prisma.machine.findMany({
    select: {
      id: true,
      name: true,
      plant_id: true,
      plant: { select: { name: true } },
      _count: { select: { logbooks: true } }
    },
    orderBy: { id: 'asc' }
  })

  const users = await prisma.user.findMany({
    select: {
      id: true,
      nik: true,
      email: true,
      full_name: true,
      created_at: true,
      plant: { select: { name: true } },
      _count: { select: { logbooks: true } }
    },
    orderBy: { id: 'asc' }
  })

  const logbooks = await prisma.logbook.findMany({
    select: {
      id: true,
      user_id: true,
      plant_id: true,
      machine_id: true,
      task_date: true,
      activity_description: true,
      sparepart: true,
      unmapped_asset_note: true,
      status: true,
      created_at: true,
      user: { select: { full_name: true, nik: true, email: true } },
      plant: { select: { name: true } },
      machine: { select: { name: true } }
    },
    orderBy: { id: 'asc' }
  })

  // ---- Susun laporan ----
  const reports = {
    plants: buildPlantsReport(plants),
    machines: buildMachinesReport(machines),
    users: buildUsersReport(users),
    logbooks: buildLogbooksReport(logbooks)
  }

  const writtenFiles = [
    writeReport('report-plants.json', reports.plants),
    writeReport('report-machines.json', reports.machines),
    writeReport('report-users.json', reports.users),
    writeReport('report-logbooks.json', reports.logbooks)
  ]

  // ---- Ringkasan terminal ----
  const lines = []
  lines.push('')
  lines.push('============================================================')
  lines.push(' HASIL AUDIT DATA TESTING (READ-ONLY — tidak ada data diubah)')
  lines.push('============================================================')
  lines.push(` Tanggal acuan "hari ini" : ${todayWIB} (WIB)`)
  lines.push(` Plants   : ${reports.plants.length} baris  | distribusi skor: ${JSON.stringify(summarizeScores(reports.plants))}`)
  lines.push(` Machines : ${reports.machines.length} baris  | distribusi skor: ${JSON.stringify(summarizeScores(reports.machines))}`)
  lines.push(` Users    : ${reports.users.length} baris  | distribusi skor: ${JSON.stringify(summarizeScores(reports.users))}`)
  lines.push(` Logbooks : ${reports.logbooks.length} baris  | distribusi skor: ${JSON.stringify(summarizeScores(reports.logbooks))}`)
  lines.push('')
  lines.push(' Top kandidat data testing:')
  lines.push(...collectTopSuspicious('Plants', reports.plants))
  lines.push(...collectTopSuspicious('Machines', reports.machines))
  lines.push(...collectTopSuspicious('Users', reports.users))
  lines.push(...collectTopSuspicious('Logbooks', reports.logbooks))
  lines.push('')
  lines.push(' File laporan:')
  writtenFiles.forEach(file => lines.push(`  - ${path.relative(process.cwd(), file)}`))
  lines.push(` File laporan (absolut):`)
  writtenFiles.forEach(file => lines.push(`  - ${file}`))
  lines.push('')
  console.log(lines.join('\n'))

  console.log(`Audit selesai. ${reports.plants.length} plant, ${reports.machines.length} machine, ${reports.users.length} user, ${reports.logbooks.length} logbook berhasil diperiksa. Silakan buka folder backend/audit/.`)
}

runAudit()
  .catch(error => {
    console.error('\n[GAGAL] Audit dibatalkan:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
