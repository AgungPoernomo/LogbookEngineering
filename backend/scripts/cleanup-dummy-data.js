/**
 * cleanup-dummy-data.js — PEMBERSIHAN DATA DUMMY (SURGICAL, DAFTAR HARDCODED)
 * -----------------------------------------------------------------------------
 * Tindak lanjut dari `scripts/detect-dummy-data.js`. Setelah hasil audit direview
 * user, daftar target di bawah ini DIPUTUSKAN MANUAL oleh user dan HARUS diikuti
 * apa adanya (bukan hasil hitung otomatis / heuristik).
 *
 * PRINSIP (jangan dilanggar):
 *   1. Hanya menyentuh ID yang ada di daftar TARGET. Tidak ada pola, keyword,
 *      atau rentang liar di luar daftar ini. Operasi surgical, bukan "hapus semua".
 *   2. Tanpa flag `--execute` script 100% READ-ONLY: hanya query + laporan.
 *      Tidak ada delete/deleteMany/update sama sekali.
 *   3. Dengan `--execute`: BACKUP dulu (snapshot JSON lengkap) -> VERIFIKASI FK
 *      -> hapus dalam satu transaksi dengan urutan FK-safe.
 *   4. Jika masih ada record LAIN yang mereferensikan target (mis. logbook asli
 *      milik user non-target memakai mesin target), eksekusi DIGAGALKAN dan
 *      dilaporkan. Data sah tidak boleh rusak / hilang diam-diam.
 *
 * CARA PAKAI (dari folder `backend/`):
 *   node scripts/cleanup-dummy-data.js            # DRY-RUN (default) — tidak menghapus apa pun
 *   node scripts/cleanup-dummy-data.js --execute  # backup -> verifikasi FK -> hapus
 *   node scripts/cleanup-dummy-data.js --verbose  # tampilkan rincian per-record
 *
 * OUTPUT:
 *   - Terminal : tabel "APA YANG AKAN DIHAPUS"
 *   - backend/audit/cleanup-preview.json
 *                (dipakai dry-run; saat --execute berisi snapshot rencana + path backup)
 *   - backend/audit/backup-before-cleanup-YYYYMMDD-HHmmss.json (hanya mode --execute)
 *
 * BATASAN: tidak mengubah `schema.prisma`; tidak menyentuh master lain
 * (roles, work_groups, shifts, failure_codes, spareparts) dan tidak menghapus
 * logbook milik user non-target.
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
// DAFTAR TARGET — HARDCODED, DISETUJUI USER
// ============================================================

/** Range 60041..60073 (33 user EMP-xxxx). Dibuat eksplisit agar laporan bisa dicek per ID. */
const USER_ID_RANGE_START = 60041
const USER_ID_RANGE_END = 60073

/** User individual (akun testing) di luar range EMP. */
const USER_ID_EXTRA = [120002, 150011, 90001, 90002, 210001]

/** User seed 240001..240007 (7 user seed). */
const USER_ID_SEED_START = 240001
const USER_ID_SEED_END = 240007

/** 13 mesin target. */
const MACHINE_IDS = [60015, 60016, 60017, 60018, 60019, 60020, 60021, 60022, 60023, 60024, 60025, 60026, 60027]

/** 2 plant target. */
const PLANT_IDS = [60001, 60007]

/**
 * Daftar user target final (45 ID sesuai spesifikasi).
 * Urutan: range EMP -> extra -> seed 240xxx.
 */
const TARGET_USER_IDS = [
  ...buildIdRange(USER_ID_RANGE_START, USER_ID_RANGE_END),
  ...USER_ID_EXTRA,
  ...buildIdRange(USER_ID_SEED_START, USER_ID_SEED_END)
]

/** Total ID user sesuai spesifikasi (sanity-check, bukan kriteria hapus). */
const EXPECTED_USER_ID_COUNT = 45

// ============================================================
// KONFIGURASI
// ============================================================
const EXECUTE_MODE = process.argv.includes('--execute')
const VERBOSE_MODE = process.argv.includes('--verbose')

const PREVIEW_FILE = path.join(AUDIT_DIR, 'cleanup-preview.json')
const BACKUP_FILE_PREFIX = 'backup-before-cleanup-'

/** Batas baris rincian yang dicetak ke terminal (--verbose menampilkan semua). */
const DEFAULT_DETAIL_LIMIT = 100

/** Urutan FK-safe untuk tabel yang disentuh (dipakai laporan & eksekusi). */
const TABLE_ORDER = [
  'logbook_approvals',
  'notifications',
  'user_activities',
  'logbook_spareparts',
  'logbooks',
  'sub_machines',
  'users',
  'machines',
  'plants'
]

// ============================================================
// HELPER UMUM
// ============================================================

/** Buat array integer inklusif [start..end]. */
function buildIdRange(start, end) {
  const out = []
  for (let value = start; value <= end; value++) out.push(value)
  return out
}

/** Ubah BigInt (id TiDB) menjadi Number agar aman di JSON & template string. */
function toNum(value) {
  if (value === null || value === undefined) return null
  return Number(value)
}

/** Ubah array Number menjadi array BigInt untuk query Prisma. */
function toBigIntIds(ids) {
  return ids.map(id => BigInt(id))
}

/** Buang duplikat + urutkan menaik. */
function uniqueSorted(ids) {
  return [...new Set(ids.map(Number))].sort((a, b) => a - b)
}

/** Format angka gaya Indonesia (mis. 12.345). */
function formatNumber(value) {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num)) return String(value ?? '-')
  return num.toLocaleString('id-ID')
}

/** Potong daftar ID agar satu baris terminal tetap terbaca. */
function previewIdList(ids, limit = 20) {
  const shown = ids.slice(0, limit).join(', ')
  return ids.length > limit ? `${shown}, … (+${ids.length - limit} lagi)` : shown || '-'
}

/** Detik WIB saat ini (2 digit). */
function getWIBSeconds(now = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    second: '2-digit'
  }).format(now).padStart(2, '0')
}

/** Stempel waktu file backup: YYYYMMDD-HHmmss (WIB). */
function buildTimestamp() {
  const now = new Date()
  const datePart = getWIBDateString(now).replace(/-/g, '')
  const timePart = getWIBTime(now).replace(':', '')
  return `${datePart}-${timePart}${getWIBSeconds(now)}`
}

/** Waktu lengkap untuk laporan: 'YYYY-MM-DD HH:mm:ss'. */
function buildRunAtWib() {
  const now = new Date()
  return `${getWIBDateString(now)} ${getWIBTime(now)}:${getWIBSeconds(now)}`
}

/** Pastikan folder audit ada sebelum menulis file. */
function ensureAuditDir() {
  if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true })
}

/** Tulis JSON rapi (BigInt sudah ditangani polyfill toJSON di src/config/prisma.js). */
function writeJsonFile(filePath, payload) {
  ensureAuditDir()
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8')
}

/** Sembunyikan kredensial pada DATABASE_URL sebelum dicetak. */
function maskDatabaseUrl(url) {
  if (!url) return '(DATABASE_URL tidak diset)'
  return String(url).replace(/:\/\/[^@]*@/, '://***:***@')
}

/** Relative path agar pesan terminal ringkas. */
function relativePath(filePath) {
  return path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/')
}


// ============================================================
// ANALISIS (READ-ONLY) — susun rencana hapus
// ============================================================

/**
 * Kumpulkan seluruh ID terdampak, MURNI dari daftar target hardcoded.
 * Tidak ada heuristik: satu-satunya sumber ID adalah konstanta di atas.
 *
 * Definisi "logbook target":
 *   - dimiliki user target (`user_id` in target), ATAU
 *   - tercatat pada plant target (`plant_id` in target).
 * Logbook yang hanya memakai mesin target TIDAK otomatis dihapus — itu data
 * milik user sah, sehingga diperlakukan sebagai KONFLIK FK (lihat verifikasi).
 */
async function buildPlan() {
  const targetUsers = await prisma.user.findMany({
    where: { id: { in: toBigIntIds(TARGET_USER_IDS) } },
    select: {
      id: true,
      nik: true,
      email: true,
      full_name: true,
      is_active: true,
      plant_id: true,
      role: { select: { name: true } }
    },
    orderBy: { id: 'asc' }
  })

  const targetMachines = await prisma.machine.findMany({
    where: { id: { in: toBigIntIds(MACHINE_IDS) } },
    select: { id: true, name: true, plant_id: true },
    orderBy: { id: 'asc' }
  })

  const targetPlants = await prisma.plant.findMany({
    where: { id: { in: toBigIntIds(PLANT_IDS) } },
    select: { id: true, name: true },
    orderBy: { id: 'asc' }
  })

  // ID yang benar-benar ADA di database (yang tidak ada = sudah bersih / salah ID).
  const existingUserIds = targetUsers.map(user => toNum(user.id))
  const existingMachineIds = targetMachines.map(machine => toNum(machine.id))
  const existingPlantIds = targetPlants.map(plant => toNum(plant.id))

  const missingTargets = {
    users: TARGET_USER_IDS.filter(id => !existingUserIds.includes(id)),
    machines: MACHINE_IDS.filter(id => !existingMachineIds.includes(id)),
    plants: PLANT_IDS.filter(id => !existingPlantIds.includes(id))
  }

  // ---- Logbook target: milik user target ATAU tercatat pada plant target ----
  const logbookConditions = []
  if (existingUserIds.length > 0) logbookConditions.push({ user_id: { in: toBigIntIds(existingUserIds) } })
  if (existingPlantIds.length > 0) logbookConditions.push({ plant_id: { in: toBigIntIds(existingPlantIds) } })

  const targetLogbooks = logbookConditions.length > 0
    ? await prisma.logbook.findMany({
      where: { OR: logbookConditions },
      select: {
        id: true,
        user_id: true,
        plant_id: true,
        machine_id: true,
        sub_machine_id: true,
        task_date: true,
        status: true,
        created_at: true
      },
      orderBy: { id: 'asc' }
    })
    : []

  const logbookIdFilter = uniqueSorted(targetLogbooks.map(logbook => toNum(logbook.id)))
  const userFilter = existingUserIds.length > 0 ? toBigIntIds(existingUserIds) : null
  const machineFilter = existingMachineIds.length > 0 ? toBigIntIds(existingMachineIds) : null
  const logbookFilter = logbookIdFilter.length > 0 ? toBigIntIds(logbookIdFilter) : null

  // ---- Record anak yang akan ikut terhapus ----
  const approvalConditions = []
  if (logbookFilter) approvalConditions.push({ logbook_id: { in: logbookFilter } })
  if (userFilter) approvalConditions.push({ supervisor_id: { in: userFilter } })

  const targetApprovals = approvalConditions.length > 0
    ? await prisma.logbookApproval.findMany({
      where: { OR: approvalConditions },
      select: { id: true, logbook_id: true, supervisor_id: true, status: true, reviewed_at: true },
      orderBy: { id: 'asc' }
    })
    : []

  const targetNotifications = userFilter
    ? await prisma.notification.findMany({
      where: { user_id: { in: userFilter } },
      select: { id: true, user_id: true, logbook_id: true, type: true, channel: true, created_at: true },
      orderBy: { id: 'asc' }
    })
    : []

  const targetActivities = userFilter
    ? await prisma.userActivity.findMany({
      where: { user_id: { in: userFilter } },
      select: { id: true, user_id: true, activity: true, created_at: true },
      orderBy: { id: 'asc' }
    })
    : []

  const targetSparepartUsages = logbookFilter
    ? await prisma.logbookSparepart.findMany({
      where: { logbook_id: { in: logbookFilter } },
      select: { id: true, logbook_id: true, sparepart_id: true, qty_used: true },
      orderBy: { id: 'asc' }
    })
    : []

  // sub_machines milik mesin target (FK onDelete: Cascade; dihapus eksplisit agar terhitung).
  const targetSubMachines = machineFilter
    ? await prisma.subMachine.findMany({
      where: { machine_id: { in: machineFilter } },
      select: { id: true, machine_id: true, name: true },
      orderBy: { id: 'asc' }
    })
    : []

  const plan = {
    targetUsers,
    targetMachines,
    targetPlants,
    targetLogbooks,
    targetApprovals,
    targetNotifications,
    targetActivities,
    targetSparepartUsages,
    targetSubMachines,
    existingUserIds,
    existingMachineIds,
    existingPlantIds,
    missingTargets,
    logbookIdFilter
  }

  plan.conflicts = await findForeignKeyConflicts(plan)
  return plan
}


// ============================================================
// VERIFIKASI FK — cegah data di luar daftar ikut rusak/hilang
// ============================================================

/** Ambil contoh ID (maks 10) dari sebuah model untuk laporan konflik. */
async function sampleIds(model, where) {
  const rows = await model.findMany({ where, select: { id: true }, take: 10, orderBy: { id: 'asc' } })
  return rows.map(row => toNum(row.id))
}

/**
 * Cari record NON-target yang masih mereferensikan record target.
 *
 * Kenapa perlu: beberapa FK memakai `onDelete: SetNull` (logbook.machine_id,
 * user.plant_id, notification.logbook_id). Tanpa pemeriksaan ini, menghapus
 * mesin/plant target akan DIAM-DIAM mengosongkan kolom pada data sah milik user
 * asli — kerusakan yang tidak terlihat pada laporan hitungan. Konflik seperti ini
 * harus DIGAGALKAN, bukan "diperbaiki" otomatis.
 *
 * @returns {Promise<Array<{ table: string, column: string, target: string, count: number,
 *   sample_ids: number[], action: 'AUTO_DELETE'|'BLOCKER', detail: string }>>}
 */
async function findForeignKeyConflicts(plan) {
  const { existingUserIds, existingMachineIds, existingPlantIds, logbookIdFilter } = plan
  const conflicts = []

  const userFilter = existingUserIds.length > 0 ? toBigIntIds(existingUserIds) : null
  const machineFilter = existingMachineIds.length > 0 ? toBigIntIds(existingMachineIds) : null
  const plantFilter = existingPlantIds.length > 0 ? toBigIntIds(existingPlantIds) : null
  const logbookFilter = logbookIdFilter.length > 0 ? toBigIntIds(logbookIdFilter) : null

  // ---- 1. USER target: approval sebagai supervisor pada logbook NON-target ----
  if (userFilter) {
    const where = logbookFilter
      ? { supervisor_id: { in: userFilter }, logbook_id: { notIn: logbookFilter } }
      : { supervisor_id: { in: userFilter } }
    const count = await prisma.logbookApproval.count({ where })
    if (count > 0) {
      // FK logbook_approvals.supervisor_id TIDAK punya onDelete -> DELETE users gagal.
      conflicts.push({
        table: 'logbook_approvals',
        column: 'supervisor_id -> users.id',
        target: 'USER target',
        count,
        sample_ids: await sampleIds(prisma.logbookApproval, where),
        action: 'BLOCKER',
        detail: 'Supervisor TARGET punya riwayat approval pada logbook user LAIN. FK supervisor_id tidak punya onDelete (DELETE users akan gagal) dan menghapusnya berarti menghilangkan jejak audit logbook sah.'
      })
    }
  }

  // ---- 2. MACHINE target masih dipakai logbook NON-target ----
  if (machineFilter) {
    const where = logbookFilter
      ? { machine_id: { in: machineFilter }, id: { notIn: logbookFilter } }
      : { machine_id: { in: machineFilter } }
    const count = await prisma.logbook.count({ where })
    if (count > 0) {
      conflicts.push({
        table: 'logbooks',
        column: 'machine_id -> machines.id',
        target: 'MACHINE target',
        count,
        sample_ids: await sampleIds(prisma.logbook, where),
        action: 'BLOCKER',
        detail: 'Ada logbook milik user NON-target yang memakai mesin target. FK-nya onDelete: SetNull — bila diteruskan, mesin pada logbook sah akan kosong tanpa jejak.'
      })
    }
  }


  // ---- 3. PLANT target masih direferensikan user / mesin / logbook NON-target ----
  if (plantFilter) {
    const userWhere = userFilter
      ? { plant_id: { in: plantFilter }, id: { notIn: userFilter } }
      : { plant_id: { in: plantFilter } }
    const userCount = await prisma.user.count({ where: userWhere })
    if (userCount > 0) {
      conflicts.push({
        table: 'users',
        column: 'plant_id -> plants.id',
        target: 'PLANT target',
        count: userCount,
        sample_ids: await sampleIds(prisma.user, userWhere),
        action: 'BLOCKER',
        detail: 'Ada user NON-target yang masih ditempatkan pada plant target. FK-nya onDelete: SetNull — plant user sah akan kosong bila plant dihapus paksa.'
      })
    }

    const machineWhere = machineFilter
      ? { plant_id: { in: plantFilter }, id: { notIn: machineFilter } }
      : { plant_id: { in: plantFilter } }
    const machineCount = await prisma.machine.count({ where: machineWhere })
    if (machineCount > 0) {
      conflicts.push({
        table: 'machines',
        column: 'plant_id -> plants.id',
        target: 'PLANT target',
        count: machineCount,
        sample_ids: await sampleIds(prisma.machine, machineWhere),
        action: 'BLOCKER',
        detail: 'Ada mesin NON-target yang masih terdaftar pada plant target. FK-nya onDelete: SetNull — plant mesin sah akan kosong bila plant dihapus.'
      })
    }

    const logbookWhere = logbookFilter
      ? { plant_id: { in: plantFilter }, id: { notIn: logbookFilter } }
      : { plant_id: { in: plantFilter } }
    const logbookCount = await prisma.logbook.count({ where: logbookWhere })
    if (logbookCount > 0) {
      conflicts.push({
        table: 'logbooks',
        column: 'plant_id -> plants.id',
        target: 'PLANT target',
        count: logbookCount,
        sample_ids: await sampleIds(prisma.logbook, logbookWhere),
        action: 'BLOCKER',
        detail: 'Ada logbook NON-target pada plant target. FK logbooks.plant_id tidak punya onDelete (DELETE plant akan gagal) dan menghapus logbook tersebut berarti menghapus data sah.'
      })
    }
  }

  // ---- 4. NOTIFICATION NON-target yang menunjuk logbook target ----
  if (logbookFilter) {
    const where = {
      logbook_id: { in: logbookFilter },
      ...(userFilter ? { user_id: { notIn: userFilter } } : {})
    }
    const count = await prisma.notification.count({ where })
    if (count > 0) {
      conflicts.push({
        table: 'notifications',
        column: 'logbook_id -> logbooks.id',
        target: 'LOGBOOK target',
        count,
        sample_ids: await sampleIds(prisma.notification, where),
        action: 'BLOCKER',
        detail: 'Ada notifikasi milik user NON-target yang mereferensikan logbook target. FK-nya onDelete: SetNull — referensinya akan kosong bila logbook dihapus.'
      })
    }
  }

  // ---- 5. Pemakaian sparepart pada logbook target (informasi, ikut dihapus) ----
  if (logbookFilter) {
    const usage = await prisma.logbookSparepart.count({ where: { logbook_id: { in: logbookFilter } } })
    if (usage > 0) {
      conflicts.push({
        table: 'logbook_spareparts',
        column: 'logbook_id -> logbooks.id',
        target: 'LOGBOOK target',
        count: usage,
        sample_ids: [],
        action: 'AUTO_DELETE',
        detail: 'Pemakaian sparepart pada logbook target dihapus lebih dulu (FK-safe). Master spareparts TIDAK berubah.'
      })
    }
  }

  return conflicts
}

/** Konflik yang benar-benar memblokir eksekusi. */
function getBlockingConflicts(conflicts) {
  return conflicts.filter(conflict => conflict.action === 'BLOCKER')
}


// ============================================================
// LAPORAN — susun data untuk terminal & JSON
// ============================================================

/** Label urutan hapus sesuai spesifikasi (a..h) per tabel. */
const STEP_LABEL = {
  logbook_approvals: 'a',
  notifications: 'b',
  user_activities: 'c',
  logbook_spareparts: 'd',
  logbooks: 'e',
  sub_machines: 'e2',
  users: 'f',
  machines: 'g',
  plants: 'h'
}

/** Jumlah record per tabel yang akan dihapus. */
function getCounts(plan) {
  return {
    logbook_approvals: plan.targetApprovals.length,
    notifications: plan.targetNotifications.length,
    user_activities: plan.targetActivities.length,
    logbook_spareparts: plan.targetSparepartUsages.length,
    logbooks: plan.targetLogbooks.length,
    sub_machines: plan.targetSubMachines.length,
    users: plan.existingUserIds.length,
    machines: plan.existingMachineIds.length,
    plants: plan.existingPlantIds.length
  }
}

/** Total record yang akan dihapus. */
function getTotalRecords(plan) {
  return Object.values(getCounts(plan)).reduce((sum, count) => sum + Number(count ?? 0), 0)
}

/** Baris tabel ringkasan per tabel. */
function buildCountRows(plan) {
  const counts = getCounts(plan)
  return TABLE_ORDER.map(table => ({
    Urutan: STEP_LABEL[table] ?? '-',
    Tabel: table,
    'Record dihapus': counts[table] ?? 0
  }))
}

/** Baris target yang diminta tapi TIDAK ADA di DB (sudah bersih / salah ID). */
function buildMissingRows(plan) {
  const rows = []
  const add = (entity, requested, missing) => {
    if (missing.length === 0) return
    rows.push({
      Entitas: entity,
      'Diminta': requested,
      'Tidak ditemukan': missing.length,
      'ID tidak ditemukan': previewIdList(missing, 15)
    })
  }
  add('users', TARGET_USER_IDS.length, plan.missingTargets.users)
  add('machines', MACHINE_IDS.length, plan.missingTargets.machines)
  add('plants', PLANT_IDS.length, plan.missingTargets.plants)
  return rows
}

/** Payload `backend/audit/cleanup-preview.json`. */
function buildPreviewPayload(plan) {
  return {
    meta: {
      script: 'scripts/cleanup-dummy-data.js',
      generated_at_wib: buildRunAtWib(),
      mode: EXECUTE_MODE ? 'PRE-EXECUTE (snapshot sebelum hapus)' : 'DRY-RUN (read-only)',
      note: 'Daftar target hardcoded & disetujui user. Tidak ada data lain yang disentuh.'
    },
    targets_requested: {
      user_ids: TARGET_USER_IDS,
      user_id_groups: {
        range_emp: {
          start: USER_ID_RANGE_START,
          end: USER_ID_RANGE_END,
          count: USER_ID_RANGE_END - USER_ID_RANGE_START + 1
        },
        extra: USER_ID_EXTRA,
        seed: {
          start: USER_ID_SEED_START,
          end: USER_ID_SEED_END,
          count: USER_ID_SEED_END - USER_ID_SEED_START + 1
        }
      },
      total_user_ids: TARGET_USER_IDS.length,
      expected_total_user_ids: EXPECTED_USER_ID_COUNT,
      machine_ids: MACHINE_IDS,
      plant_ids: PLANT_IDS
    },
    found_in_database: {
      users: plan.targetUsers.map(user => ({
        id: toNum(user.id),
        nik: user.nik,
        email: user.email,
        full_name: user.full_name,
        role: user.role?.name ?? null,
        plant_id: toNum(user.plant_id),
        is_active: user.is_active
      })),
      machines: plan.targetMachines.map(machine => ({
        id: toNum(machine.id),
        name: machine.name,
        plant_id: toNum(machine.plant_id)
      })),
      plants: plan.targetPlants.map(plant => ({ id: toNum(plant.id), name: plant.name }))
    },
    delete_summary: getCounts(plan),
    total_records_to_delete: getTotalRecords(plan),
    deletion_order: TABLE_ORDER,
    related_records: {
      logbook_ids: plan.logbookIdFilter,
      approval_ids: plan.targetApprovals.map(row => toNum(row.id)),
      notification_ids: plan.targetNotifications.map(row => toNum(row.id)),
      user_activity_ids: plan.targetActivities.map(row => toNum(row.id)),
      logbook_sparepart_ids: plan.targetSparepartUsages.map(row => toNum(row.id)),
      sub_machine_ids: plan.targetSubMachines.map(row => toNum(row.id))
    },
    missing_targets: plan.missingTargets,
    fk_verification: {
      status: getBlockingConflicts(plan.conflicts).length > 0 ? 'BLOCKED' : 'PASSED',
      conflicts: plan.conflicts
    }
  }
}


// ============================================================
// TAMPILAN TERMINAL
// ============================================================

/** Header blok laporan. */
function printHeader() {
  console.log('')
  console.log('============================================================')
  console.log(' cleanup-dummy-data.js — PEMBERSIHAN DATA DUMMY (SURGICAL)')
  console.log('============================================================')
  console.log(` Mode      : ${EXECUTE_MODE ? 'EKSEKUSI (--execute)' : 'DRY-RUN (tidak ada yang dihapus)'}`)
  console.log(` Waktu WIB : ${buildRunAtWib()}`)
  console.log(` Database  : ${maskDatabaseUrl(process.env.DATABASE_URL)}`)
  console.log(' Target    : user/mesin/plant dari daftar HARDCODED (bukan hitung otomatis)')
}

/** Bagian 1: daftar target yang diminta vs yang ditemukan. */
function printTargetAudit(plan) {
  console.log('')
  console.log('------------------------------------------------------------')
  console.log(' 1. TARGET DARI DAFTAR (HARDCODED)')
  console.log('------------------------------------------------------------')
  console.log(` User diminta   : ${TARGET_USER_IDS.length} ID (range ${USER_ID_RANGE_START}-${USER_ID_RANGE_END}, ` +
    `extra ${USER_ID_EXTRA.length}, seed ${USER_ID_SEED_START}-${USER_ID_SEED_END})`)
  console.log(` User ditemukan : ${plan.existingUserIds.length} dari ${TARGET_USER_IDS.length}`)
  console.log(`   - ${previewIdList(plan.existingUserIds, 50)}`)
  console.log(` Mesin diminta  : ${MACHINE_IDS.length} ID | ditemukan: ${plan.existingMachineIds.length}`)
  console.log(`   - ${previewIdList(plan.existingMachineIds, 20)}`)
  console.log(` Plant diminta  : ${PLANT_IDS.length} ID | ditemukan: ${plan.existingPlantIds.length}`)
  console.log(`   - ${previewIdList(plan.existingPlantIds, 20)}`)

  const missingRows = buildMissingRows(plan)
  if (missingRows.length > 0) {
    console.log('')
    console.log(' ⚠️  Sebagian target TIDAK ditemukan di database (diabaikan, bukan error):')
    console.table(missingRows)
    console.log('    Bila angka ini tidak sesuai harapan, periksa ulang daftar ID sebelum --execute.')
  }
}

/** Bagian 2: tabel "APA YANG AKAN DIHAPUS" + rincian master. */
function printDeletionPlan(plan) {
  console.log('')
  console.log('------------------------------------------------------------')
  console.log(' 2. APA YANG AKAN DIHAPUS (urutan FK-safe)')
  console.log('------------------------------------------------------------')
  console.table(buildCountRows(plan))
  console.log(` TOTAL record    : ${formatNumber(getTotalRecords(plan))}`)

  console.log('')
  console.log(' Rincian target master:')
  const userRows = plan.targetUsers.map(user => ({
    ID: toNum(user.id),
    NIK: user.nik,
    Email: user.email,
    Nama: user.full_name,
    Role: user.role?.name ?? '-',
    'Plant ID': toNum(user.plant_id) ?? '-',
    Status: user.is_active ? 'aktif' : 'nonaktif'
  }))
  if (userRows.length > 0) {
    const limit = VERBOSE_MODE ? userRows.length : Math.min(userRows.length, 15)
    console.table(userRows.slice(0, limit))
    if (userRows.length > limit) {
      console.log(`   … dan ${userRows.length - limit} user lainnya (jalankan dengan --verbose)`)
    }
  } else {
    console.log('   (tidak ada user target di database)')
  }

  if (plan.targetMachines.length > 0) {
    console.table(plan.targetMachines.map(machine => ({
      ID: toNum(machine.id),
      Nama: machine.name,
      'Plant ID': toNum(machine.plant_id) ?? '-'
    })))
  } else {
    console.log('   (tidak ada mesin target di database)')
  }

  if (plan.targetPlants.length > 0) {
    console.table(plan.targetPlants.map(plant => ({ ID: toNum(plant.id), Nama: plant.name })))
  } else {
    console.log('   (tidak ada plant target di database)')
  }
}


/** Bagian 3: record terkait (anak) yang ikut terhapus. */
function printRelatedRecords(plan) {
  console.log('')
  console.log('------------------------------------------------------------')
  console.log(' 3. RECORD TERKAIT YANG IKUT DIHAPUS')
  console.log('------------------------------------------------------------')
  console.table([
    { Tabel: 'logbook_approvals', Keterangan: 'approval pada logbook target / oleh supervisor target', Jumlah: plan.targetApprovals.length },
    { Tabel: 'notifications', Keterangan: 'notifikasi milik user target', Jumlah: plan.targetNotifications.length },
    { Tabel: 'user_activities', Keterangan: 'audit trail milik user target', Jumlah: plan.targetActivities.length },
    { Tabel: 'logbook_spareparts', Keterangan: 'pemakaian sparepart pada logbook target', Jumlah: plan.targetSparepartUsages.length },
    { Tabel: 'logbooks', Keterangan: 'logbook milik user target ATAU pada plant target', Jumlah: plan.targetLogbooks.length },
    { Tabel: 'sub_machines', Keterangan: 'sub-mesin milik mesin target', Jumlah: plan.targetSubMachines.length }
  ])

  if (plan.targetLogbooks.length > 0) {
    const limit = VERBOSE_MODE ? plan.targetLogbooks.length : Math.min(plan.targetLogbooks.length, 15)
    console.log(' Logbook target (perhatian: ini data kerja, bukan master):')
    console.table(plan.targetLogbooks.slice(0, limit).map(logbook => ({
      ID: toNum(logbook.id),
      'User ID': toNum(logbook.user_id),
      'Plant ID': toNum(logbook.plant_id),
      'Machine ID': toNum(logbook.machine_id) ?? '-',
      Tanggal: logbook.task_date,
      Status: logbook.status
    })))
    if (plan.targetLogbooks.length > limit) {
      console.log(`   … dan ${plan.targetLogbooks.length - limit} logbook lainnya (jalankan dengan --verbose)`)
    }
  }
}

/** Bagian 4: verifikasi FK — inti pengaman "jangan rusak data lain". */
function printForeignKeyVerification(plan) {
  const blockers = getBlockingConflicts(plan.conflicts)
  const informational = plan.conflicts.filter(conflict => conflict.action !== 'BLOCKER')

  console.log('')
  console.log('------------------------------------------------------------')
  console.log(' 4. VERIFIKASI FOREIGN KEY (READ-ONLY)')
  console.log('------------------------------------------------------------')

  if (informational.length > 0) {
    console.table(informational.map(conflict => ({
      Tabel: conflict.table,
      FK: conflict.column,
      Aksi: conflict.action,
      Jumlah: conflict.count
    })))
  }

  if (blockers.length === 0) {
    console.log(' ✅ TIDAK ADA konflik FK. Tidak ada record di luar daftar yang rusak/yatim.')
    return
  }

  console.log(` ❌ DITEMUKAN ${blockers.length} KONFLIK FK — eksekusi akan DIGAGALKAN.`)
  console.table(blockers.map(conflict => ({
    Tabel: conflict.table,
    FK: conflict.column,
    Target: conflict.target,
    Jumlah: conflict.count,
    'Contoh ID': conflict.sample_ids.join(', ') || '-'
  })))
  for (const conflict of blockers) {
    console.log(`  - [${conflict.table}.${conflict.column}] ${conflict.detail}`)
  }
  console.log('')
  console.log(' Tindakan: SELESAIKAN dulu referensi di atas (pindahkan/bersihkan manual oleh admin),')
  console.log(' lalu jalankan ulang script. Script sengaja TIDAK memperbaiki otomatis agar data di')
  console.log(' luar daftar tidak berubah tanpa persetujuan.')
}

/** Ringkasan penutup + info file laporan. */
function printFooter(plan, files) {
  console.log('')
  console.log('============================================================')
  console.log(' RINGKASAN')
  console.log('============================================================')
  console.log(` User target      : ${plan.existingUserIds.length} dari ${TARGET_USER_IDS.length} ID`)
  console.log(` Mesin target     : ${plan.existingMachineIds.length} dari ${MACHINE_IDS.length} ID`)
  console.log(` Plant target     : ${plan.existingPlantIds.length} dari ${PLANT_IDS.length} ID`)
  console.log(` Total record     : ${formatNumber(getTotalRecords(plan))}`)
  console.log(` Status FK        : ${getBlockingConflicts(plan.conflicts).length > 0 ? 'BLOCKED' : 'PASSED'}`)
  console.log(` Mode             : ${EXECUTE_MODE ? 'EKSEKUSI (--execute)' : 'DRY-RUN — tidak ada data dihapus'}`)
  for (const [label, filePath] of Object.entries(files)) {
    if (filePath) console.log(` ${label.padEnd(17)}: ${relativePath(filePath)}`)
  }
  console.log('============================================================')
}


// ============================================================
// BACKUP — snapshot JSON lengkap SEBELUM menghapus
// ============================================================

/**
 * Ambil record LENGKAP (semua kolom) dari setiap tabel yang akan dihapus.
 * Jalur pemulihan bila hasil eksekusi tidak sesuai harapan: baris bisa di-insert
 * kembali dari file ini karena ID asli dan relasi antar-record tetap utuh.
 */
async function buildBackupSnapshot(plan) {
  const userFilter = plan.existingUserIds.length > 0 ? toBigIntIds(plan.existingUserIds) : null
  const machineFilter = plan.existingMachineIds.length > 0 ? toBigIntIds(plan.existingMachineIds) : null
  const plantFilter = plan.existingPlantIds.length > 0 ? toBigIntIds(plan.existingPlantIds) : null
  const logbookFilter = plan.logbookIdFilter.length > 0 ? toBigIntIds(plan.logbookIdFilter) : null

  const approvalConditions = []
  if (logbookFilter) approvalConditions.push({ logbook_id: { in: logbookFilter } })
  if (userFilter) approvalConditions.push({ supervisor_id: { in: userFilter } })

  const logbookConditions = []
  if (userFilter) logbookConditions.push({ user_id: { in: userFilter } })
  if (plantFilter) logbookConditions.push({ plant_id: { in: plantFilter } })

  const snapshot = {
    meta: {
      script: 'scripts/cleanup-dummy-data.js',
      created_at_wib: buildRunAtWib(),
      purpose: 'Snapshot sebelum penghapusan data dummy. SIMPAN file ini — jalur pemulihan.',
      database: maskDatabaseUrl(process.env.DATABASE_URL),
      targets: {
        user_ids: plan.existingUserIds,
        user_ids_requested: TARGET_USER_IDS,
        machine_ids: plan.existingMachineIds,
        machine_ids_requested: MACHINE_IDS,
        plant_ids: plan.existingPlantIds,
        plant_ids_requested: PLANT_IDS
      },
      counts: {}
    },
    logbookApprovals: approvalConditions.length > 0
      ? await prisma.logbookApproval.findMany({ where: { OR: approvalConditions }, orderBy: { id: 'asc' } })
      : [],
    notifications: userFilter
      ? await prisma.notification.findMany({ where: { user_id: { in: userFilter } }, orderBy: { id: 'asc' } })
      : [],
    userActivities: userFilter
      ? await prisma.userActivity.findMany({ where: { user_id: { in: userFilter } }, orderBy: { id: 'asc' } })
      : [],
    logbookSpareparts: logbookFilter
      ? await prisma.logbookSparepart.findMany({ where: { logbook_id: { in: logbookFilter } }, orderBy: { id: 'asc' } })
      : [],
    logbooks: logbookConditions.length > 0
      ? await prisma.logbook.findMany({ where: { OR: logbookConditions }, orderBy: { id: 'asc' } })
      : [],
    subMachines: machineFilter
      ? await prisma.subMachine.findMany({ where: { machine_id: { in: machineFilter } }, orderBy: { id: 'asc' } })
      : [],
    users: userFilter
      ? await prisma.user.findMany({ where: { id: { in: userFilter } }, orderBy: { id: 'asc' } })
      : [],
    machines: machineFilter
      ? await prisma.machine.findMany({ where: { id: { in: machineFilter } }, orderBy: { id: 'asc' } })
      : [],
    plants: plantFilter
      ? await prisma.plant.findMany({ where: { id: { in: plantFilter } }, orderBy: { id: 'asc' } })
      : []
  }

  for (const key of Object.keys(snapshot)) {
    if (key !== 'meta') snapshot.meta.counts[key] = snapshot[key].length
  }

  return snapshot
}


// ============================================================
// EKSEKUSI — urutan FK-safe dalam SATU transaksi
// ============================================================

/**
 * Hapus target sesuai urutan spesifikasi:
 *   a. logbookApproval  (FK ke logbook & user)
 *   b. notification     (milik user target)
 *   c. userActivity     (milik user target)
 *   d. logbookSparepart (FK ke logbook)
 *   e. logbook          (milik user target / pada plant target)
 *   f. user             (45 user target)
 *   g. machine          (13 mesin target; sub-mesin dihapus lebih dulu)
 *   h. plant            (2 plant target)
 *
 * Semua langkah memakai client `tx`: bila satu langkah gagal, seluruh perubahan
 * di-rollback dan database kembali seperti sebelum eksekusi.
 */
async function executeCleanup(plan) {
  const summary = {}
  const userFilter = plan.existingUserIds.length > 0 ? toBigIntIds(plan.existingUserIds) : null
  const machineFilter = plan.existingMachineIds.length > 0 ? toBigIntIds(plan.existingMachineIds) : null
  const plantFilter = plan.existingPlantIds.length > 0 ? toBigIntIds(plan.existingPlantIds) : null
  const logbookFilter = plan.logbookIdFilter.length > 0 ? toBigIntIds(plan.logbookIdFilter) : null

  await prisma.$transaction(async tx => {
    // ---- (a) logbook_approvals ----
    const approvalConditions = []
    if (logbookFilter) approvalConditions.push({ logbook_id: { in: logbookFilter } })
    if (userFilter) approvalConditions.push({ supervisor_id: { in: userFilter } })
    summary.logbookApprovals = approvalConditions.length > 0
      ? (await tx.logbookApproval.deleteMany({ where: { OR: approvalConditions } })).count
      : 0

    // ---- (b) notifications milik user target ----
    summary.notifications = userFilter
      ? (await tx.notification.deleteMany({ where: { user_id: { in: userFilter } } })).count
      : 0

    // ---- (c) user_activities milik user target ----
    summary.userActivities = userFilter
      ? (await tx.userActivity.deleteMany({ where: { user_id: { in: userFilter } } })).count
      : 0

    // ---- (d) logbook_spareparts milik logbook target ----
    summary.logbookSpareparts = logbookFilter
      ? (await tx.logbookSparepart.deleteMany({ where: { logbook_id: { in: logbookFilter } } })).count
      : 0

    // ---- (e) logbooks target (milik user target / pada plant target) ----
    const logbookConditions = []
    if (userFilter) logbookConditions.push({ user_id: { in: userFilter } })
    if (plantFilter) logbookConditions.push({ plant_id: { in: plantFilter } })
    summary.logbooks = logbookConditions.length > 0
      ? (await tx.logbook.deleteMany({ where: { OR: logbookConditions } })).count
      : 0

    // ---- (e2) sub_machines milik mesin target (FK Cascade; eksplisit agar terhitung) ----
    summary.subMachines = machineFilter
      ? (await tx.subMachine.deleteMany({ where: { machine_id: { in: machineFilter } } })).count
      : 0

    // ---- (f) users target ----
    summary.users = userFilter
      ? (await tx.user.deleteMany({ where: { id: { in: userFilter } } })).count
      : 0

    // ---- (g) machines target ----
    summary.machines = machineFilter
      ? (await tx.machine.deleteMany({ where: { id: { in: machineFilter } } })).count
      : 0

    // ---- (h) plants target ----
    summary.plants = plantFilter
      ? (await tx.plant.deleteMany({ where: { id: { in: plantFilter } } })).count
      : 0
  }, { timeout: 120000 })

  return summary
}


/** Cetak hasil eksekusi + bandingkan dengan rencana. */
function printExecutionSummary(summary, plan, backupPath) {
  console.log('')
  console.log('============================================================')
  console.log(' HASIL EKSEKUSI')
  console.log('============================================================')
  console.table([
    { Urutan: 'a', Tabel: 'logbook_approvals', Dihapus: summary.logbookApprovals ?? 0, Rencana: plan.targetApprovals.length },
    { Urutan: 'b', Tabel: 'notifications', Dihapus: summary.notifications ?? 0, Rencana: plan.targetNotifications.length },
    { Urutan: 'c', Tabel: 'user_activities', Dihapus: summary.userActivities ?? 0, Rencana: plan.targetActivities.length },
    { Urutan: 'd', Tabel: 'logbook_spareparts', Dihapus: summary.logbookSpareparts ?? 0, Rencana: plan.targetSparepartUsages.length },
    { Urutan: 'e', Tabel: 'logbooks', Dihapus: summary.logbooks ?? 0, Rencana: plan.targetLogbooks.length },
    { Urutan: 'e2', Tabel: 'sub_machines', Dihapus: summary.subMachines ?? 0, Rencana: plan.targetSubMachines.length },
    { Urutan: 'f', Tabel: 'users', Dihapus: summary.users ?? 0, Rencana: plan.existingUserIds.length },
    { Urutan: 'g', Tabel: 'machines', Dihapus: summary.machines ?? 0, Rencana: plan.existingMachineIds.length },
    { Urutan: 'h', Tabel: 'plants', Dihapus: summary.plants ?? 0, Rencana: plan.existingPlantIds.length }
  ])
  const totalDeleted = Object.values(summary).reduce((sum, value) => sum + Number(value ?? 0), 0)
  console.log(` TOTAL dihapus   : ${formatNumber(totalDeleted)} record`)
  console.log(` Backup tersimpan: ${relativePath(backupPath)}`)
  console.log('')
  console.log(' ✅ SELESAI. Tabel lain (roles, work_groups, shifts, failure_codes, spareparts,')
  console.log('    sub_machines di luar mesin target) TIDAK disentuh.')
}

/** Verifikasi pasca-hapus: pastikan semua target benar-benar sudah hilang. */
async function verifyAfterCleanup(plan) {
  const userFilter = plan.existingUserIds.length > 0 ? toBigIntIds(plan.existingUserIds) : null
  const machineFilter = plan.existingMachineIds.length > 0 ? toBigIntIds(plan.existingMachineIds) : null
  const plantFilter = plan.existingPlantIds.length > 0 ? toBigIntIds(plan.existingPlantIds) : null
  const logbookFilter = plan.logbookIdFilter.length > 0 ? toBigIntIds(plan.logbookIdFilter) : null

  return {
    users: userFilter ? await prisma.user.count({ where: { id: { in: userFilter } } }) : 0,
    machines: machineFilter ? await prisma.machine.count({ where: { id: { in: machineFilter } } }) : 0,
    plants: plantFilter ? await prisma.plant.count({ where: { id: { in: plantFilter } } }) : 0,
    logbooks: logbookFilter ? await prisma.logbook.count({ where: { id: { in: logbookFilter } } }) : 0
  }
}

/** Cetak hasil verifikasi pasca-hapus (semua harus 0). */
function printPostVerification(remaining) {
  console.log('')
  console.log('------------------------------------------------------------')
  console.log(' VERIFIKASI PASCA-HAPUS (semua harus 0)')
  console.log('------------------------------------------------------------')
  console.table([remaining])
  const leftover = Object.values(remaining).reduce((sum, value) => sum + Number(value ?? 0), 0)
  if (leftover === 0) {
    console.log(' ✅ Semua target sudah tidak ada di database.')
  } else {
    console.log(` ⚠️  Masih ada ${leftover} record target tersisa. Periksa sebelum deploy.`)
  }
}


// ============================================================
// RUNNER UTAMA
// ============================================================

/** Sanity check daftar hardcoded (mencegah salah edit konstanta di masa depan). */
function validateTargetList() {
  if (TARGET_USER_IDS.length !== EXPECTED_USER_ID_COUNT) {
    throw new Error(
      `[ABORT] Daftar user target berisi ${TARGET_USER_IDS.length} ID, seharusnya ${EXPECTED_USER_ID_COUNT}. ` +
      'Periksa konstanta USER_ID_RANGE_*, USER_ID_EXTRA, atau USER_ID_SEED_* di bagian atas script.'
    )
  }
  const duplicateUsers = TARGET_USER_IDS.filter((id, index) => TARGET_USER_IDS.indexOf(id) !== index)
  if (duplicateUsers.length > 0) {
    throw new Error(`[ABORT] ID user duplikat pada daftar target: ${[...new Set(duplicateUsers)].join(', ')}`)
  }
  if (MACHINE_IDS.length !== 13) {
    throw new Error(`[ABORT] Daftar mesin target berisi ${MACHINE_IDS.length} ID, seharusnya 13.`)
  }
  if (PLANT_IDS.length !== 2) {
    throw new Error(`[ABORT] Daftar plant target berisi ${PLANT_IDS.length} ID, seharusnya 2.`)
  }
}

/**
 * Alur utama:
 *   1. validasi daftar target + header
 *   2. analisis READ-ONLY + laporan (kedua mode)
 *   3. DRY-RUN: simpan cleanup-preview.json lalu selesai (tanpa operasi tulis DB)
 *   4. --execute: cek konflik FK -> backup -> hapus -> verifikasi
 */
async function run() {
  validateTargetList()
  printHeader()

  // ---- 1. Analisis read-only ----
  const plan = await buildPlan()

  printTargetAudit(plan)
  printDeletionPlan(plan)
  printRelatedRecords(plan)
  printForeignKeyVerification(plan)

  const blockers = getBlockingConflicts(plan.conflicts)
  const totalRecords = getTotalRecords(plan)

  // ---- 2. DRY-RUN: tidak ada perintah tulis ke database ----
  if (!EXECUTE_MODE) {
    writeJsonFile(PREVIEW_FILE, buildPreviewPayload(plan))
    printFooter(plan, { 'Laporan JSON': PREVIEW_FILE })
    console.log('')
    console.log(' DRY-RUN selesai. TIDAK ADA DATA YANG DIHAPUS.')
    console.log(' Untuk benar-benar menghapus, jalankan ulang dengan flag --execute.')
    return
  }

  // ---- 3. Mode eksekusi: gerbang verifikasi FK ----
  if (blockers.length > 0) {
    writeJsonFile(PREVIEW_FILE, { ...buildPreviewPayload(plan), aborted: true })
    printFooter(plan, { 'Laporan JSON': PREVIEW_FILE })
    console.log('')
    console.log(' ❌ EKSEKUSI DIGAGALKAN: verifikasi FK gagal (lihat bagian 4).')
    console.log('    Tidak ada record yang dihapus. Selesaikan referensi di atas lebih dulu.')
    process.exitCode = 1
    return
  }

  if (totalRecords === 0) {
    writeJsonFile(PREVIEW_FILE, { ...buildPreviewPayload(plan), nothing_to_delete: true })
    printFooter(plan, { 'Laporan JSON': PREVIEW_FILE })
    console.log('')
    console.log(' Tidak ada record target yang perlu dihapus (database sudah bersih).')
    return
  }

  // ---- 3a. BACKUP dulu, baru hapus ----
  const backupPayload = await buildBackupSnapshot(plan)
  const backupPath = path.join(AUDIT_DIR, `${BACKUP_FILE_PREFIX}${buildTimestamp()}.json`)
  writeJsonFile(backupPath, backupPayload)
  writeJsonFile(PREVIEW_FILE, { ...buildPreviewPayload(plan), backup_file: relativePath(backupPath) })

  console.log('')
  console.log('------------------------------------------------------------')
  console.log(' 5. BACKUP')
  console.log('------------------------------------------------------------')
  console.log(` ✅ Snapshot tersimpan: ${relativePath(backupPath)}`)
  console.log(`    ${formatNumber(backupPayload.logbooks.length)} logbook, ` +
    `${formatNumber(backupPayload.notifications.length)} notifikasi, ` +
    `${formatNumber(backupPayload.users.length)} user, ` +
    `${formatNumber(backupPayload.machines.length)} mesin, ` +
    `${formatNumber(backupPayload.plants.length)} plant`)

  // ---- 3b. Eksekusi FK-safe ----
  const summary = await executeCleanup(plan)
  printExecutionSummary(summary, plan, backupPath)

  // ---- 3c. Verifikasi pasca-hapus ----
  const remaining = await verifyAfterCleanup(plan)
  printPostVerification(remaining)
  printFooter(plan, { 'Laporan JSON': PREVIEW_FILE, 'File backup': backupPath })
}

run()
  .catch(error => {
    console.error('')
    console.error('❌ GAGAL:', error?.message ?? error)
    if (error?.stack) console.error(error.stack.split('\n').slice(1, 4).join('\n'))
    console.error(' Tidak ada perubahan permanen: seluruh penghapusan berjalan dalam satu transaksi.')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

