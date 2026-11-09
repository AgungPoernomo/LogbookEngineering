/**
 * 02-cleanup-obvious.js — PEMBERSIHAN DATA TESTING YANG "JELAS SAMPAH" (PARANOID)
 * -----------------------------------------------------------------------------
 * Melanjutkan `01-audit-data.js` (READ-ONLY) dengan aksi hapus yang SANGAT selektif.
 *
 * PRINSIP (jangan dilanggar):
 *   1. Hanya menyentuh data yang LOLOS salah satu kriteria berikut:
 *        a. `suspicion_score >= 80` (sangat yakin sampah), ATAU
 *        b. namanya mengandung BLACKLIST_KEYWORDS (kata iseng: test, dummy, bunda, dll).
 *   2. "Belum pernah dipakai" (logbook_count === 0) BUKAN alasan untuk menghapus.
 *      Mesin "Conveyor Line 3" tanpa logbook tetap AMAN karena namanya wajar.
 *   3. Data yang masih ambigu (mis. plant "Karanganyar" skor 30) TIDAK dihapus,
 *      hanya DITAMPILKAN di preview sebagai bahan keputusan admin.
 *   4. Tanpa flag `--execute` script ini 100% READ-ONLY (hanya baca laporan + DB).
 *
 * CARA PAKAI (dari folder `backend/`):
 *   node scripts/02-cleanup-obvious.js              # DRY-RUN (default, tidak menghapus apa pun)
 *   node scripts/02-cleanup-obvious.js --execute    # tampilkan preview -> konfirmasi Y/N -> hapus
 *
 * PRASYARAT:
 *   File laporan `backend/audit/report-{plants,machines,users}.json` sudah ada.
 *   Jika belum: node scripts/01-audit-data.js
 *
 * BATASAN: tidak mengubah `schema.prisma` dan tidak menyentuh tabel master lain
 * (roles, work_groups, shifts, failure_codes, spareparts).
 */
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import prisma from '../src/config/prisma.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const AUDIT_DIR = path.resolve(__dirname, '../audit')

// ============================================================
// KONFIGURASI
// ============================================================
const EXECUTE_MODE = process.argv.includes('--execute')

/**
 * Ambang skor minimal agar data dianggap "SANGAT yakin sampah".
 * Skor 30 (mis. plant kosong "OKe") TIDAK otomatis dihapus lewat jalur skor.
 */
const SUSPICION_THRESHOLD = 80

/**
 * Kata kunci iseng/nyeleneh. Data yang namanya mengandung kata ini masuk daftar
 * hapus meskipun `suspicion_score`-nya rendah (mis. mesin "Bunda tedi" skor 30).
 *
 * CATATAN PARANOID: pencocokan memakai BATAS KATA (word boundary), bukan substring
 * mentah. Tanpa batas kata, "abc" akan memakan "Abcdef Workshop" dan "123" akan
 * memakan NIK "12345" — itu bisa menghapus data yang legitimate.
 */
const BLACKLIST_KEYWORDS = ['test', 'dummy', 'asdf', 'qwerty', 'bunda', 'tedi', 'coba', 'lorem', 'abc', '123']

/**
 * Kata kunci tambahan khusus PLANT (nama fasilitas/pabrik), mengikuti contoh perilaku
 * yang diminta: plant "OKe" harus DIHAPUS walau skornya hanya 30 (nama tidak standar).
 * Sengaja dipisah dari BLACKLIST_KEYWORDS agar tidak menular ke mesin/user.
 */
const PLANT_NON_STANDARD_NAMES = ['oke', 'ok', 'okey', 'okay', 'hai', 'halo', 'hello', 'qwerty']

/** Nama mesin/user/plant yang formatnya aneh: hanya angka, hanya jam ("8:57"), dsb. */
const ODD_NAME_PATTERNS = [
  { regex: /^\d{1,2}\s*[:.]\s*\d{2}$/, label: 'hanya berisi jam (mis. "8:57")' },
  { regex: /^[\d\s.,\-_/\\|]+$/, label: 'hanya berisi angka/simbol' },
  { regex: /^[\W_]+$/, label: 'hanya berisi simbol tanpa huruf/angka' },
  // Karakter diulang TANPA spasi, mis. "xxxx"/"aaaa". Nama sah seperti "Naufal Hapreda A."
  // atau "Mesin Filling Cair A" tidak boleh terkena -> wajib ada spasi/titik di sekitarnya.
  { regex: /(^|[\s.])(.)\2{2,}([\s.]|$)/i, label: 'satu karakter diulang (mis. "xxxx")' }
]

/**
 * Minimal karakter nama yang wajar.
 * Sengaja hanya 2 agar singkatan resmi seperti "QC" tetap aman; nama 1 karakter
 * ("A", "x") dianggap tidak standar.
 */
const MIN_REASONABLE_NAME_LENGTH = 2

/** Nama file laporan audit (hasil `01-audit-data.js`). */
const REPORT_FILES = {
  plants: 'report-plants.json',
  machines: 'report-machines.json',
  users: 'report-users.json'
}

// ============================================================
// HELPER TEKS
// ============================================================

/** Bangun regex batas-kata dari daftar kata kunci (case-insensitive). */
function buildKeywordRegex(keywords) {
  const escaped = keywords.map(keyword => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`(^|[^a-z0-9])(${escaped.join('|')})([^a-z0-9]|$)`, 'i')
}

const BLACKLIST_REGEX = buildKeywordRegex(BLACKLIST_KEYWORDS)
const PLANT_NON_STANDARD_REGEX = buildKeywordRegex(PLANT_NON_STANDARD_NAMES)

/** Rapikan spasi berlebih, atau string kosong bila null/undefined. */
function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

/** Kembalikan kata kunci blacklist yang cocok (dengan batas kata), atau null. */
function findBlacklistHit(text) {
  const value = normalizeText(text).toLowerCase()
  if (!value) return null
  const match = value.match(BLACKLIST_REGEX)
  return match ? match[2] : null
}

/**
 * Nilai-nilai teks yang diperiksa untuk satu baris laporan.
 * Plant/machine hanya punya `name`; user juga punya `nik` dan `email`.
 */
function getInspectableFields(entity, row) {
  const fields = [{ label: 'nama', value: normalizeText(row.name) }]
  if (entity === 'users') {
    fields.push({ label: 'NIK', value: normalizeText(row.nik) })
    fields.push({ label: 'email', value: normalizeText(row.email) })
  }
  return fields.filter(field => field.value !== '')
}

/** Ambil hanya baris alasan yang relevan dari laporan audit (yang berawalan "[+"). */
function getAuditReasons(row) {
  const reasons = Array.isArray(row.suspicion_reasons) ? row.suspicion_reasons : []
  return reasons.map(reason => String(reason).trim()).filter(reason => reason.startsWith('[+'))
}

// ============================================================
// ATURAN KLASIFIKASI PER ENTITAS
// ============================================================

/**
 * Tentukan status satu baris laporan audit.
 *
 * @returns {{ verdict: 'delete'|'review'|'keep', reasons: string[] }}
 *   - delete : masuk daftar hapus (skor >= 80, ATAU nama kena blacklist / format aneh / plant non-standar)
 *   - review : tidak layak dihapus otomatis, hanya ditampilkan agar admin memutuskan
 *   - keep   : tidak diminati sama sekali (tidak ditampilkan)
 */
function classifyRow(entity, row) {
  const reasons = []
  const name = normalizeText(row.name)
  const score = Number(row.suspicion_score ?? 0)

  // ---- 1. Blacklist kata kunci (berlaku untuk semua entitas) ----
  let keywordHit = false
  for (const field of getInspectableFields(entity, row)) {
    const hit = findBlacklistHit(field.value)
    if (hit) {
      keywordHit = true
      reasons.push(`Kata kunci blacklist "${hit}" pada ${field.label}: "${field.value}"`)
      break // satu temuan sudah cukup untuk menandai sampah
    }
  }

  // ---- 2. Nama plant tidak standar (mis. "OKe") ----
  let plantNameOdd = false
  if (entity === 'plants' && name) {
    const plantMatch = name.toLowerCase().match(PLANT_NON_STANDARD_REGEX)
    if (plantMatch) {
      plantNameOdd = true
      reasons.push(`Nama plant tidak standar: "${name}" hanya kata informal ("${plantMatch[2]}") tanpa identitas fasilitas`)
    }
  }

  // ---- 3. Format nama aneh (jam, hanya angka, karakter berulang, terlalu pendek) ----
  let oddFormatLabel = null
  if (name) {
    const oddPattern = ODD_NAME_PATTERNS.find(pattern => pattern.regex.test(name))
    if (oddPattern) {
      oddFormatLabel = oddPattern.label
      reasons.push(`Format nama tidak standar: ${oddPattern.label}`)
    } else if (name.length < MIN_REASONABLE_NAME_LENGTH) {
      oddFormatLabel = 'terlalu pendek'
      reasons.push(`Format nama tidak standar: terlalu pendek ("${name}" = ${name.length} karakter)`)
    }
  }

  // ---- 4. Ambang skor audit (>= 80) ----
  const scoreQualified = score >= SUSPICION_THRESHOLD
  if (scoreQualified) {
    reasons.push(`suspicion_score ${score} >= ${SUSPICION_THRESHOLD} (hasil 01-audit-data.js)`)
    for (const auditReason of getAuditReasons(row)) reasons.push(`audit ${auditReason}`)
  }

  // ---- 5. Keputusan ----
  // PENTING: `logbook_count === 0` sengaja TIDAK dipakai sebagai alasan hapus.
  if (keywordHit || plantNameOdd || oddFormatLabel || scoreQualified) {
    return { verdict: 'delete', reasons }
  }

  // Ambigu: nama wajar tapi belum pernah dipakai / skor rendah -> hanya untuk di-review admin.
  if (score > 0) {
    return {
      verdict: 'review',
      reasons: [
        ...getAuditReasons(row),
        `Nama terlihat wajar & skor ${score} < ${SUSPICION_THRESHOLD} -> TIDAK dihapus otomatis, silakan putuskan manual`
      ]
    }
  }

  return { verdict: 'keep', reasons: [] }
}

// ============================================================
// MEMBACA LAPORAN AUDIT
// ============================================================

/** Baca satu file laporan JSON; lempar error yang jelas bila tidak ada/rusak. */
function readReportFile(fileName) {
  const filePath = path.join(AUDIT_DIR, fileName)
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Laporan "${fileName}" tidak ditemukan di ${AUDIT_DIR}. ` +
      'Jalankan dulu: node scripts/01-audit-data.js'
    )
  }

  let parsed
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (error) {
    throw new Error(`Laporan "${fileName}" tidak bisa dibaca sebagai JSON: ${error.message}`)
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Laporan "${fileName}" harus berupa array JSON.`)
  }
  return parsed
}

/**
 * Susun daftar kandidat hapus + daftar review dari ketiga laporan audit.
 * TIDAK menyentuh database sama sekali.
 */
function buildCandidateSets() {
  const result = {
    deleteTargets: { plants: [], machines: [], users: [] },
    reviewTargets: { plants: [], machines: [], users: [] }
  }

  for (const entity of ['plants', 'machines', 'users']) {
    const rows = readReportFile(REPORT_FILES[entity])

    for (const row of rows) {
      const { verdict, reasons } = classifyRow(entity, row)
      if (verdict === 'keep') continue

      const target = {
        id: Number(row.id),
        name: normalizeText(row.name),
        entity,
        // Konteks tambahan supaya admin yakin saat membaca preview
        context: buildTargetContext(entity, row),
        reasons
      }

      if (verdict === 'delete') result.deleteTargets[entity].push(target)
      else result.reviewTargets[entity].push(target)
    }
  }

  return result
}

/** Ringkasan konteks baris: plant/mesin asal, skor audit, dan jumlah logbook. */
function buildTargetContext(entity, row) {
  if (entity === 'plants') {
    return `${row.logbook_count ?? 0} logbook, ${row.machine_count ?? 0} mesin, ${row.user_count ?? 0} user`
  }
  if (entity === 'machines') {
    const plant = normalizeText(row.plant_name) || '(tanpa plant)'
    return `plant: ${plant} | ${row.logbook_count ?? 0} logbook`
  }
  const plant = normalizeText(row.plant_name) || '(tanpa plant)'
  return `NIK: ${normalizeText(row.nik) || '-'} | plant: ${plant} | ${row.logbook_count ?? 0} logbook`
}

// ============================================================
// TAMPILAN PREVIEW (DRY-RUN & SEBELUM KONFIRMASI)
// ============================================================

const ENTITY_LABELS = { plants: 'PLANTS', machines: 'MACHINES', users: 'USERS' }

/** Ganti newline dalam alasan agar rapi di console.table. */
function joinReasons(reasons) {
  return reasons.length > 0 ? reasons.join(' | ') : '-'
}

/** Cetak tabel preview untuk satu entitas. */
function printEntityTable(entity, targets) {
  const label = ENTITY_LABELS[entity]
  console.log('')
  console.log(`--- ${label} — akan DIHAPUS (${targets.length}) ---`)

  if (targets.length === 0) {
    console.log(`  (tidak ada ${label.toLowerCase()} yang memenuhi kriteria hapus)`)
    return
  }

  console.table(
    targets.map(target => ({
      ID: target.id,
      Nama: target.name,
      Konteks: target.context,
      Alasan: joinReasons(target.reasons)
    }))
  )
}

/** Cetak tabel data ambigu (TIDAK dihapus) agar admin bisa memutuskan manual. */
function printReviewTable(entity, targets) {
  const label = ENTITY_LABELS[entity]
  console.log('')
  console.log(`--- ${label} — PERLU KEPUTUSAN ADMIN (tidak dihapus otomatis: ${targets.length}) ---`)

  if (targets.length === 0) {
    console.log(`  (tidak ada ${label.toLowerCase()} yang ambigu)`)
    return
  }

  console.table(
    targets.map(target => ({
      ID: target.id,
      Nama: target.name,
      Konteks: target.context,
      Catatan: joinReasons(target.reasons)
    }))
  )
}

/** Cetak total per entitas + keseluruhan. */
function printTotals(candidateSets) {
  const { deleteTargets, reviewTargets } = candidateSets
  const totals = {
    Plants: deleteTargets.plants.length,
    Machines: deleteTargets.machines.length,
    Users: deleteTargets.users.length
  }
  const reviewTotals = {
    Plants: reviewTargets.plants.length,
    Machines: reviewTargets.machines.length,
    Users: reviewTargets.users.length
  }
  const grandTotal = totals.Plants + totals.Machines + totals.Users

  console.log('')
  console.log('============================================================')
  console.log(' TOTAL PER ENTITAS — kandidat HAPUS')
  console.log('============================================================')
  console.table([totals])
  console.log(`Total yang akan dihapus: ${grandTotal} baris ` +
    `(${totals.Plants} plant, ${totals.Machines} machine, ${totals.Users} user)`)

  console.log('')
  console.log('============================================================')
  console.log(' TOTAL PER ENTITAS — hanya PREVIEW (keputusan admin)')
  console.log('============================================================')
  console.table([reviewTotals])
  console.log('Data di tabel preview TIDAK akan dihapus oleh script ini.')

  return { totals, reviewTotals, grandTotal }
}

/** Tampilan lengkap preview (dipakai dry-run maupun sebelum konfirmasi). */
function printPreview(candidateSets, modeLabel) {
  console.log('')
  console.log('============================================================')
  console.log(` PREVIEW PEMBERSIHAN — MODE: ${modeLabel}`)
  console.log('============================================================')
  console.log(` Kriteria hapus : suspicion_score >= ${SUSPICION_THRESHOLD} ATAU nama mengandung kata blacklist`)
  console.log(` Blacklist      : ${BLACKLIST_KEYWORDS.join(', ')}`)
  console.log(' Catatan        : logbook_count = 0 BUKAN alasan hapus.')

  for (const entity of ['plants', 'machines', 'users']) {
    printEntityTable(entity, candidateSets.deleteTargets[entity])
  }

  for (const entity of ['plants', 'machines', 'users']) {
    printReviewTable(entity, candidateSets.reviewTargets[entity])
  }

  return printTotals(candidateSets)
}

// ============================================================
// KONFIRMASI & HELPER EKSEKUSI
// ============================================================

/** Tanya konfirmasi Y/N lewat readline. Default = TIDAK (apa pun selain "y" = batal). */
function askConfirmation(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    let answered = false

    const finish = answer => {
      if (answered) return
      answered = true
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    }

    rl.question(question, finish)
    // Ctrl+C / stdin ditutup -> anggap BATAL demi keamanan.
    rl.on('SIGINT', () => finish('n'))
    rl.on('close', () => finish('n'))
  })
}

/** Normalisasi ID hasil laporan audit -> array BigInt (aman untuk Prisma MySQL). */
function toBigIntIds(targets) {
  return [...new Set(targets.map(target => Number(target.id)).filter(id => Number.isFinite(id)))]
    .map(id => BigInt(id))
}

/** Hitung baris pada tabel tertentu untuk ID yang diberikan (null bila tidak ada ID). */
async function countWhere(delegate, idField, ids) {
  if (ids.length === 0) return 0
  return prisma[delegate].count({ where: { [idField]: { in: ids } } })
}

/** Ambil ID logbook yang akan dihapus karena terkait target (tanpa menulis apa pun). */
async function collectAffectedLogbookIds({ plantIds, machineIds, userIds }) {
  const affected = new Set()

  /** Gabungkan ID logbook dari satu kondisi query. */
  const addFrom = async where => {
    const rows = await prisma.logbook.findMany({ where, select: { id: true } })
    rows.forEach(row => affected.add(row.id.toString()))
  }

  if (plantIds.length > 0) await addFrom({ plant_id: { in: plantIds } })
  if (machineIds.length > 0) await addFrom({ machine_id: { in: machineIds } })
  if (userIds.length > 0) await addFrom({ user_id: { in: userIds } })

  return [...affected].map(id => BigInt(id))
}

// ============================================================
// VERIFIKASI PARANOID TERHADAP DATABASE (READ-ONLY)
// ============================================================

/**
 * Periksa kondisi FK & risiko sebelum menghapus. Tidak menulis apa pun.
 *
 * Yang diperiksa:
 *  - Logbook milik plant/mesin target yang ternyata dikerjakan user LAIN (bukan target).
 *  - User target yang pernah meng-approve logbook LAIN atau punya `user_activities`
 *    (FK tanpa onDelete -> harus diputus manual sebelum DELETE users).
 *  - Plant/mesin yang masih dirujuk tabel lain (akan jadi NULL, bukan terhapus).
 *  - Target yang memuat SELURUH akun Admin/Supervisor -> BLOCKER.
 *  - Data skor >= 80 tapi namanya wajar -> hanya preview.
 */
async function inspectDatabaseRisks({ plantIds, machineIds, userIds }, candidateSets) {
  const risks = []
  const targetUserSet = new Set(userIds.map(id => id.toString()))

  // ---- A. Approval oleh supervisor LAIN pada logbook yang akan dihapus ----
  const affectedLogbookIds = await collectAffectedLogbookIds({ plantIds, machineIds, userIds })
  if (affectedLogbookIds.length > 0) {
    const approvals = await prisma.logbookApproval.findMany({
      where: { logbook_id: { in: affectedLogbookIds } },
      select: { supervisor_id: true }
    })
    const foreignSupervisors = approvals.filter(row => !targetUserSet.has(row.supervisor_id.toString())).length
    if (foreignSupervisors > 0) {
      risks.push({
        level: 'INFO',
        message: `${foreignSupervisors} riwayat logbook_approvals milik supervisor LAIN ikut terhapus (logbook-nya dihapus)`
      })
    }
  }

  // ---- B. Logbook plant/mesin target yang dikerjakan user yang TIDAK dihapus ----
  const conditions = []
  if (plantIds.length > 0) conditions.push({ plant_id: { in: plantIds } })
  if (machineIds.length > 0) conditions.push({ machine_id: { in: machineIds } })
  if (conditions.length > 0) {
    const foreignLogbooks = await prisma.logbook.findMany({
      where: { OR: conditions },
      select: {
        id: true,
        user_id: true,
        status: true,
        task_date: true,
        user: { select: { full_name: true } },
        machine: { select: { name: true } },
        plant: { select: { name: true } }
      }
    })

    // Logbook yang penulisnya BUKAN user target -> ikut terhapus meski datanya bukan sampah.
    const kept = foreignLogbooks.filter(row => !targetUserSet.has(row.user_id.toString()))
    if (kept.length > 0) {
      const detail = kept
        .slice(0, 5)
        .map(row => `#${row.id} [${row.status}] ${row.user?.full_name ?? '-'} @ ${row.machine?.name ?? row.plant?.name ?? '-'}`)
        .join('; ')
      risks.push({
        level: 'WARNING',
        message: `${kept.length} logbook milik user LAIN (bukan user target) akan ikut terhapus -> ${detail}` +
          (kept.length > 5 ? '; ...' : '')
      })
    }
  }

  // ---- C. Relasi yang akan menjadi NULL (data legitimate diselamatkan) ----
  if (machineIds.length > 0) {
    const nulledByMachine = await prisma.logbook.count({ where: { machine_id: { in: machineIds } } })
    if (nulledByMachine > 0) {
      risks.push({
        level: 'WARNING',
        message: `${nulledByMachine} logbook non-target: machine_id akan di-NULL-kan (logbook tetap disimpan)`
      })
    }
  }

  if (plantIds.length > 0) {
    const [machinesInPlants, usersInPlants] = await Promise.all([
      prisma.machine.count({ where: { plant_id: { in: plantIds } } }),
      prisma.user.count({ where: { plant_id: { in: plantIds } } })
    ])
    if (machinesInPlants > 0 || usersInPlants > 0) {
      risks.push({
        level: 'WARNING',
        message: `Plant target masih dirujuk ${machinesInPlants} mesin & ${usersInPlants} user (akan jadi NULL, bukan terhapus)`
      })
    }
  }

  // ---- D. Dampak pada tabel yang tidak punya onDelete terhadap users ----
  if (userIds.length > 0) {
    const [silentActivities, notifications, otherApprovals] = await Promise.all([
      countWhere('userActivity', 'user_id', userIds),
      countWhere('notification', 'user_id', userIds),
      countWhere('logbookApproval', 'supervisor_id', userIds)
    ])

    if (silentActivities > 0) {
      risks.push({
        level: 'WARNING',
        message: `${silentActivities} user_activities milik user target (FK tanpa onDelete -> dibersihkan di step 0)`
      })
    }
    if (notifications > 0) {
      risks.push({ level: 'INFO', message: `${notifications} notifications milik user target ikut terhapus` })
    }
    if (otherApprovals > 0) {
      risks.push({
        level: 'WARNING',
        message: `${otherApprovals} logbook_approvals diapprove user target untuk logbook LAIN (FK tanpa onDelete -> dibersihkan di step 0)`
      })
    }

    // Jangan pernah menghapus SELURUH akun Admin/Supervisor -> sistem tidak bisa dioperasikan.
    const targetUsers = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { role: { select: { name: true } } }
    })
    for (const roleName of ['admin', 'supervisor']) {
      const targeted = targetUsers.filter(user => String(user.role?.name ?? '').toLowerCase() === roleName).length
      if (targeted === 0) continue
      const total = await prisma.user.count({ where: { role: { name: { equals: roleName } } } })
      if (total - targeted <= 0) {
        risks.push({
          level: 'BLOCKER',
          message: `Target memuat SELURUH akun ${roleName} (${total} akun) -> penghapusan dibatalkan demi keamanan`
        })
      }
    }
  }

  // ---- E. Pengaman tambahan: skor tinggi tapi nama wajar tidak boleh ikut terhapus ----
  const reviewWithHighScore = [
    ...candidateSets.reviewTargets.plants,
    ...candidateSets.reviewTargets.machines,
    ...candidateSets.reviewTargets.users
  ].filter(target => target.reasons.some(reason => reason.includes(`>= ${SUSPICION_THRESHOLD}`)))
  if (reviewWithHighScore.length > 0) {
    risks.push({
      level: 'WARNING',
      message: `${reviewWithHighScore.length} data skor tinggi tapi nama WAJAR -> hanya preview, TIDAK dihapus otomatis`
    })
  }

  return risks
}

// ============================================================
// EKSEKUSI PENGHAPUSAN (URUTAN FK AMAN, DALAM SATU TRANSAKSI)
// ============================================================

/**
 * Hapus data target dengan urutan FK yang aman. Semua langkah dibungkus SATU
 * transaksi: bila satu langkah gagal, seluruh perubahan di-rollback.
 *
 * Urutan (sesuai spesifikasi, plus pra-langkah yang WAJIB demi integritas FK):
 *   step 0 : putus FK yang tidak punya onDelete (logbook_spareparts, user_activities,
 *            logbook_approvals milik user target) -> supaya DELETE users tidak gagal
 *            dan tidak menyisakan baris yatim.
 *   a. notifications & logbook_approvals milik logbook target
 *   b. logbooks milik plant/mesin/user target
 *   b2. NULL-kan machine_id/sub_machine_id pada logbook NON-target (data sah diselamatkan)
 *   c. sub_machines milik mesin target
 *   d. machines target
 *   e. plants target
 *   f. users target
 */
async function executeCleanup({ plantIds, machineIds, userIds }) {
  const summary = {}

  await prisma.$transaction(async tx => {
    // ---- Pra-langkah: tabel anak TANPA onDelete cascade terhadap induknya ----
    const affectedLogbookIds = await collectAffectedLogbookIdsTx(tx, { plantIds, machineIds, userIds })
    const logbookFilter = affectedLogbookIds.length > 0 ? { in: affectedLogbookIds } : null

    // logbook_spareparts: FK ke logbooks tanpa onDelete -> akan menghalangi DELETE logbooks.
    summary.logbookSpareparts = logbookFilter
      ? (await tx.logbookSparepart.deleteMany({ where: { logbook_id: logbookFilter } })).count
      : 0

    if (userIds.length > 0) {
      // user_activities: FK ke users tanpa onDelete -> akan menghalangi DELETE users.
      summary.userActivities = (await tx.userActivity.deleteMany({ where: { user_id: { in: userIds } } })).count
      // logbook_approvals: supervisor_id -> users tanpa onDelete -> hapus riwayat approval user target.
      summary.userApprovals = (await tx.logbookApproval.deleteMany({ where: { supervisor_id: { in: userIds } } })).count
      // notifications.user_id punya onDelete Cascade, tapi dihapus eksplisit agar hitungan jelas.
      summary.userNotifications = (await tx.notification.deleteMany({ where: { user_id: { in: userIds } } })).count
    }

    // ---- (a) notifications & logbook_approvals milik logbook target ----
    summary.notifications = logbookFilter
      ? (await tx.notification.deleteMany({ where: { logbook_id: logbookFilter } })).count
      : 0
    summary.logbookApprovals = logbookFilter
      ? (await tx.logbookApproval.deleteMany({ where: { logbook_id: logbookFilter } })).count
      : 0

    // ---- (b) logbooks milik plant / mesin / user target ----
    const logbookConditions = []
    if (plantIds.length > 0) logbookConditions.push({ plant_id: { in: plantIds } })
    if (machineIds.length > 0) logbookConditions.push({ machine_id: { in: machineIds } })
    if (userIds.length > 0) logbookConditions.push({ user_id: { in: userIds } })
    summary.logbooks = logbookConditions.length > 0
      ? (await tx.logbook.deleteMany({ where: { OR: logbookConditions } })).count
      : 0

    // ---- (b2) Logbook LAIN yang masih menunjuk mesin/sub-mesin target ----
    // Tanpa langkah ini DELETE machines gagal (FK) atau logbook sah ikut hilang.
    // Relasi `onDelete: SetNull` dipakai eksplisit: logbook tetap tersimpan.
    if (machineIds.length > 0) {
      summary.logbooksMachineUnlinked = (await tx.logbook.updateMany({
        where: { machine_id: { in: machineIds } },
        data: { machine_id: null, sub_machine_id: null }
      })).count
    }

    // ---- (c) sub_machines milik mesin target ----
    summary.subMachines = machineIds.length > 0
      ? (await tx.subMachine.deleteMany({ where: { machine_id: { in: machineIds } } })).count
      : 0

    // ---- (d) machines target ----
    summary.machines = machineIds.length > 0
      ? (await tx.machine.deleteMany({ where: { id: { in: machineIds } } })).count
      : 0

    // ---- (e) plants target ----
    summary.plants = plantIds.length > 0
      ? (await tx.plant.deleteMany({ where: { id: { in: plantIds } } })).count
      : 0

    // ---- (f) users target ----
    summary.users = userIds.length > 0
      ? (await tx.user.deleteMany({ where: { id: { in: userIds } } })).count
      : 0
  }, { timeout: 120000 })

  return summary
}

/** Versi transaksional dari `collectAffectedLogbookIds` (memakai client `tx`). */
async function collectAffectedLogbookIdsTx(tx, { plantIds, machineIds, userIds }) {
  const affected = new Set()

  /** Tambahkan ID logbook dari satu kondisi query. */
  const addFrom = async where => {
    const rows = await tx.logbook.findMany({ where, select: { id: true } })
    rows.forEach(row => affected.add(row.id.toString()))
  }

  if (plantIds.length > 0) await addFrom({ plant_id: { in: plantIds } })
  if (machineIds.length > 0) await addFrom({ machine_id: { in: machineIds } })
  if (userIds.length > 0) await addFrom({ user_id: { in: userIds } })

  return [...affected].map(id => BigInt(id))
}

// ============================================================
// RUNNER UTAMA
// ============================================================

/** Tampilkan daftar risiko hasil verifikasi DB. */
function printRisks(risks) {
  console.log('')
  console.log('============================================================')
  console.log(' PEMERIKSAAN DAMPAK (READ-ONLY, dari database)')
  console.log('============================================================')

  if (risks.length === 0) {
    console.log(' Tidak ada dampak sampingan yang terdeteksi.')
    return
  }

  for (const risk of risks) console.log(` [${risk.level}] ${risk.message}`)
}

/** Tampilkan ringkasan hasil penghapusan. */
function printSummary(summary, expected) {
  console.log('')
  console.log('============================================================')
  console.log(' RINGKASAN HASIL PENGHAPUSAN')
  console.log('============================================================')
  console.table([{
    plants: summary.plants ?? 0,
    machines: summary.machines ?? 0,
    sub_machines: summary.subMachines ?? 0,
    users: summary.users ?? 0,
    logbooks: summary.logbooks ?? 0,
    logbook_approvals: summary.logbookApprovals ?? 0,
    notifications: summary.notifications ?? 0,
    logbook_spareparts: summary.logbookSpareparts ?? 0,
    user_activities: summary.userActivities ?? 0,
    logbook_machine_dilepas: summary.logbooksMachineUnlinked ?? 0
  }])
  console.log(` Selesai: ${summary.plants ?? 0} plant, ${summary.machines ?? 0} mesin, ${summary.users ?? 0} user dihapus.`)
  console.log(' Logbook terkait target juga dihapus beserta approval & notifikasinya.')

  // Laporan audit bisa lebih lama dari database (mis. target sudah dibersihkan manual).
  // Tampilkan selisihnya agar admin tidak bingung melihat angka yang lebih kecil.
  const gaps = [
    { entity: 'PLANTS', expected: expected.plants, actual: summary.plants ?? 0 },
    { entity: 'MACHINES', expected: expected.machines, actual: summary.machines ?? 0 },
    { entity: 'USERS', expected: expected.users, actual: summary.users ?? 0 }
  ].filter(gap => gap.actual < gap.expected)

  if (gaps.length > 0) {
    console.log('')
    console.log(' CATATAN: sebagian target dari laporan audit sudah TIDAK ADA di database')
    console.log(' (kemungkinan sudah dibersihkan sebelumnya). Selisih terhapus:')
    for (const gap of gaps) {
      console.log(`  - ${gap.entity}: ${gap.expected - gap.actual} dari ${gap.expected} target tidak ditemukan (sudah bersih)`)
    }
    console.log(' Saran: jalankan ulang "node scripts/01-audit-data.js" agar laporan sinkron.')
  }
}

/** Alur utama: baca laporan -> preview -> (opsional) konfirmasi -> hapus. */
async function runCleanup() {
  console.log('')
  console.log('============================================================')
  console.log(' 02-cleanup-obvious.js — PEMBERSIHAN DATA TESTING (PARANOID)')
  console.log('============================================================')
  console.log(` Mode: ${EXECUTE_MODE ? 'EKSEKUSI (--execute)' : 'DRY-RUN (tidak ada yang dihapus)'}`)

  // ---- 1. Baca laporan audit & susun kandidat (tanpa menyentuh DB) ----
  const candidateSets = buildCandidateSets()
  const { grandTotal } = printPreview(
    candidateSets,
    EXECUTE_MODE ? 'EKSEKUSI (--execute)' : 'DRY-RUN — tidak ada data dihapus'
  )

  // ---- 2. DRY-RUN berhenti di sini. Tidak ada perintah tulis sama sekali. ----
  if (!EXECUTE_MODE) {
    console.log('')
    console.log(' DRY-RUN selesai. TIDAK ADA DATA YANG DIHAPUS.')
    console.log(' Untuk benar-benar menghapus, jalankan ulang dengan flag --execute.')
    return
  }

  if (grandTotal === 0) {
    console.log('')
    console.log(' Tidak ada kandidat yang memenuhi kriteria. Tidak ada yang perlu dihapus.')
    return
  }

  // ---- 3. Verifikasi dampak ke database (READ-ONLY) ----
  const ids = {
    plantIds: toBigIntIds(candidateSets.deleteTargets.plants),
    machineIds: toBigIntIds(candidateSets.deleteTargets.machines),
    userIds: toBigIntIds(candidateSets.deleteTargets.users)
  }

  const risks = await inspectDatabaseRisks(ids, candidateSets)
  printRisks(risks)

  if (risks.some(risk => risk.level === 'BLOCKER')) {
    console.log('')
    console.log(' [DIBATALKAN] Ada BLOCKER pada pemeriksaan dampak. Tidak ada data yang dihapus.')
    return
  }

  // ---- 3b. Pengaman ekstra: dampak destruktif pada data milik pihak lain ----
  // Bila ada logbook NON-target (milik user lain) yang akan ikut terhapus, minta
  // konfirmasi KEDUA. Script tidak boleh "diam-diam" menghapus riwayat kerja orang lain.
  const destructiveRisks = risks.filter(risk => risk.message.includes('milik user LAIN'))
  if (destructiveRisks.length > 0) {
    console.log('')
    console.log('!! PERHATIAN: operasi ini akan MENGHAPUS logbook yang BUKAN milik user target.')
    console.log('   Periksa daftar di atas. Bila ragu, jawab "n" dan bersihkan manual.')
    const doubleConfirm = await askConfirmation(' Lanjutkan tetap? Ketik "y" untuk konfirmasi kedua: ')
    if (!doubleConfirm) {
      console.log('')
      console.log(' [DIBATALKAN] Tidak ada data yang dihapus.')
      return
    }
  }

  // ---- 4. Konfirmasi Y/N (default: BATAL) ----
  const confirmed = await askConfirmation(
    `\n Hapus ${grandTotal} baris (${ids.plantIds.length} plant, ${ids.machineIds.length} mesin, ${ids.userIds.length} user) ` +
    'beserta data terkait? Ketik "y" untuk lanjut, selain itu dibatalkan: '
  )

  if (!confirmed) {
    console.log('')
    console.log(' [DIBATALKAN] Tidak ada data yang dihapus.')
    return
  }

  // ---- 5. Eksekusi dalam satu transaksi ----
  console.log('')
  console.log(' Menghapus data (satu transaksi)...')
  const summary = await executeCleanup(ids)
  printSummary(summary, {
    plants: ids.plantIds.length,
    machines: ids.machineIds.length,
    users: ids.userIds.length
  })
}

runCleanup()
  .catch(error => {
    console.error('')
    // Pesan ramah untuk gangguan koneksi database (TiDB Cloud bisa putus sementara).
    const isConnectionError = /Can't reach database server|P1001|P1017|ECONNRESET|ETIMEDOUT/i
      .test(String(error.message))
    if (isConnectionError) {
      console.error('[GAGAL] Database tidak dapat dihubungi (jaringan/TiDB sedang down).')
      console.error('        Tidak ada data yang dihapus. Coba lagi beberapa saat lagi.')
    } else {
      console.error('[GAGAL] Pembersihan dibatalkan (semua perubahan di-rollback):', error.message)
    }
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

