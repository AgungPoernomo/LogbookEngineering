import prisma from "../config/prisma.js";
import { successResponse, errorResponse } from "../utils/response.js";

// ============================================================================
// FASE 5.1 — Radar Aset Belum Terdaftar (Admin)
//
// Teknisi dapat mencatat pekerjaan pada aset/mesin yang BELUM ada di master data
// melalui field `logbooks.unmapped_asset_note` (D12). Endpoint di file ini:
//   1. Mengelompokkan catatan tersebut (grouping di memori Node, satu query saja
//      → tanpa N+1) agar Admin tahu aset mana yang paling sering dilaporkan.
//   2. Mempromosikan satu catatan menjadi MESIN RESMI di master data, lalu
//      menautkan ulang (relink) seluruh logbook lama ke mesin baru tersebut.
//
// Aturan proyek yang dijaga: P1 (bukan alat HR — data hanya tentang ASET, tidak
// membandingkan teknisi), tanpa perubahan schema.prisma, dan response selalu
// memakai wrapper successResponse / errorResponse.
//
// Catatan implementasi: `unmapped_asset_note` TIDAK ter-index dan collation TiDB
// `contains` bisa case-sensitive, sehingga grouping (case-insensitive + trim)
// dilakukan di memori setelah satu `findMany` dengan `select` minimal. Untuk
// relink, kandidat id diambil dari hasil filter in-memory yang sama (bukan LIKE
// case-sensitive) sehingga perilaku konsisten dengan tampilan radar.
// ============================================================================

// Status logbook yang dianggap "laporan sah" untuk radar.
// DRAFT sengaja dikecualikan: belum dikirim teknisi sehingga masih bisa berubah.
const RADAR_STATUSES = ["PENDING", "APPROVED"];

// Batas sampel nama mesin yang ditampilkan per grup (UI cukup 3 contoh).
const SAMPLE_MACHINE_LIMIT = 3;

// Nilai default master mesin baru hasil promote (kolom `machines`).
// Tabel `machines` tidak punya kolom is_active / kode mesin (lihat schema.prisma v6).
const PROMOTED_MACHINE_CRITICALITY = "B_ESSENTIAL";
const PROMOTED_MACHINE_IS_UNMAPPED_OTHER = false;

/**
 * Kunci grouping: trim + case-insensitive.
 * Dipakai untuk GET (grouping) dan POST (relink) agar keduanya identik.
 */
export function buildNoteKey(note) {
  if (note === null || note === undefined) return "";
  return String(note).trim().toLowerCase();
}

/**
 * Pembanding tanggal descending untuk string YYYY-MM-DD.
 */
function compareDateDesc(a, b) {
  const left = a || "";
  const right = b || "";
  if (left === right) return 0;
  return left < right ? 1 : -1;
}

/**
 * Pecah teks catatan menjadi kata kunci (untuk pencocokan nama mesin).
 * Contoh: "Mesin Filling Baru #2 (Line 1)" → ['mesin', 'filling', 'baru', 'line']
 */
function tokenizeNote(note) {
  return String(note || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((token) => token.length >= 3);
}

/**
 * Kelompokkan baris logbook mentah menjadi daftar grup radar.
 * PURE FUNCTION — tidak menyentuh database, mudah diuji terpisah.
 *
 * Baris dianggap satu aset yang sama bila `unmapped_asset_note` identik setelah
 * trim + lowercase. Line/plant acuan = Line pada logbook terbaru grup tersebut.
 *
 * @param {Array<{ id?: bigint|number, unmapped_asset_note?: string|null,
 *                 task_date?: string, plant_id?: bigint|number|null,
 *                 plant?: { name?: string }|null, machine?: { name?: string }|null }>} rows
 * @returns {Array<{ note: string, count: number, latest_date: string|null,
 *                   plant_id: number|null, plant_name: string,
 *                   sample_machine_names: string[] }>}
 */
export function groupUnmappedAssetRows(rows = []) {
  if (!Array.isArray(rows)) return [];

  const groups = new Map();

  for (const row of rows) {
    const key = buildNoteKey(row?.unmapped_asset_note);
    if (!key) continue;

    const plantId =
      row?.plant_id !== null && row?.plant_id !== undefined
        ? Number(row.plant_id)
        : null;
    const plantName = row?.plant?.name || "-";

    if (!groups.has(key)) {
      groups.set(key, {
        note: String(row.unmapped_asset_note).trim(),
        count: 0,
        latest_date: null,
        plant_id: plantId,
        plant_name: plantName,
        machineNames: new Set(),
      });
    }

    const group = groups.get(key);
    group.count += 1;

    const taskDate = row?.task_date ? String(row.task_date) : null;
    // Line/plant mengikuti logbook terbaru → modal promote langsung ter-preselect.
    if (
      taskDate &&
      (!group.latest_date || compareDateDesc(taskDate, group.latest_date) < 0)
    ) {
      group.latest_date = taskDate;
      if (plantId !== null) group.plant_id = plantId;
      if (plantName !== "-") group.plant_name = plantName;
    }
    if (group.plant_id === null && plantId !== null) {
      group.plant_id = plantId;
      group.plant_name = plantName;
    }

    const machineName = row?.machine?.name;
    if (machineName && group.machineNames.size < SAMPLE_MACHINE_LIMIT) {
      group.machineNames.add(String(machineName));
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return compareDateDesc(a.latest_date, b.latest_date);
    })
    .map((group) => ({
      note: group.note,
      count: group.count,
      latest_date: group.latest_date,
      plant_id: group.plant_id,
      plant_name: group.plant_name || "-",
      sample_machine_names: Array.from(group.machineNames),
    }));
}

/**
 * Filter baris logbook yang benar-benar cocok dengan catatan yang dipromosikan.
 * Dicocokkan case-insensitive (trim); baris yang sudah tertaut ke mesin LAIN hanya
 * ikut bila nama mesin tersebut relevan (menghindari relink salah sasaran).
 * PURE FUNCTION.
 *
 * @param {Array<{ unmapped_asset_note?: string|null, machine?: { name?: string }|null }>} rows
 * @param {{ noteKey?: string, machineNames?: string[], tokenKeywords?: string[] }} options
 */
export function selectRowsForPromotion(rows = [], options = {}) {
  if (!Array.isArray(rows)) return [];
  const noteKey = buildNoteKey(options.noteKey);
  if (!noteKey) return [];

  const machineNames = new Set(
    (options.machineNames || [])
      .map((name) => String(name).toLowerCase().trim())
      .filter(Boolean),
  );
  const keywords = (options.tokenKeywords || [])
    .map((k) => String(k).toLowerCase())
    .filter(Boolean);

  return rows.filter((row) => {
    if (buildNoteKey(row?.unmapped_asset_note) !== noteKey) return false;

    const currentMachineName = row?.machine?.name
      ? String(row.machine.name).toLowerCase().trim()
      : "";

    // Kasus normal D12: logbook belum punya mesin (machine_id NULL) → selalu ikut.
    if (!currentMachineName) return true;
    if (machineNames.has(currentMachineName)) return true;
    return keywords.some((keyword) => currentMachineName.includes(keyword));
  });
}

/**
 * Bangun klausa `OR` Prisma untuk mengambil kandidat baris yang akan di-relink.
 * `unmapped_asset_note` tidak ter-index dan `contains` bisa case-sensitive pada
 * TiDB, sehingga dipakai kombinasi equals persis + varian casing + kata kunci.
 * Pemfilteran FINAL tetap dilakukan di memori (selectRowsForPromotion).
 */
function buildPromoteCandidateWhere(noteKey, tokenKeywords, plantId) {
  const variants = Array.from(
    new Set([
      noteKey,
      noteKey.toUpperCase(),
      noteKey.charAt(0).toUpperCase() + noteKey.slice(1),
    ]),
  ).filter(Boolean);

  const orClauses = [
    { unmapped_asset_note: { equals: noteKey } },
    ...variants.map((variant) => ({
      unmapped_asset_note: { contains: variant },
    })),
    ...tokenKeywords.map((keyword) => ({
      unmapped_asset_note: { contains: keyword },
    })),
  ];

  const where = {
    unmapped_asset_note: { not: null },
    OR: orClauses,
  };
  if (plantId) where.plant_id = plantId;
  return where;
}

/**
 * GET /api/v1/admin/unmapped-assets
 *
 * Radar aset belum terdaftar. Hanya logbook berstatus PENDING / APPROVED yang
 * sudah dikirim teknisi. Query opsional: ?plant_id=X
 */
export async function getUnmappedAssets(req, res, next) {
  try {
    const { plant_id } = req.query;
    const hasPlantFilter =
      plant_id !== undefined && plant_id !== null && plant_id !== "";

    if (hasPlantFilter && !/^\d+$/.test(String(plant_id))) {
      return errorResponse(res, {
        message: "Parameter plant_id tidak valid.",
        statusCode: 400,
      });
    }

    const where = {
      unmapped_asset_note: { not: null },
      status: { in: RADAR_STATUSES },
    };
    if (hasPlantFilter) where.plant_id = BigInt(String(plant_id));

    // Satu query saja (select minimal) → grouping di memori, tanpa N+1.
    const rows = await prisma.logbook.findMany({
      where,
      select: {
        id: true,
        unmapped_asset_note: true,
        task_date: true,
        plant_id: true,
        plant: { select: { name: true } },
        machine: { select: { name: true } },
      },
      orderBy: { task_date: "desc" },
    });

    const groups = groupUnmappedAssetRows(rows);
    const totalLogbooks = groups.reduce((sum, group) => sum + group.count, 0);

    return successResponse(res, {
      message:
        groups.length > 0
          ? `${groups.length} aset belum terdaftar menunggu tindak lanjut.`
          : "Tidak ada aset belum terdaftar. Semua laporan sudah tertaut ke master mesin.",
      data: groups,
      meta: {
        total_groups: groups.length,
        total_logbooks: totalLogbooks,
        plant_id: hasPlantFilter ? Number(plant_id) : null,
        statuses: RADAR_STATUSES,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/unmapped-assets/promote
 *
 * Body: { note_text, plant_id, new_machine_name }
 * 1. Buat mesin baru di master data (criticality B_GENERAL, bukan OTHER legacy).
 * 2. Relink seluruh logbook dengan catatan tersebut → { machine_id, unmapped_asset_note: null }
 * 3. Catat user_activities: PROMOTE_UNMAPPED_ASSET
 */
export async function promoteUnmappedAsset(req, res, next) {
  try {
    const { note_text, plant_id, new_machine_name } = req.body || {};

    // ── Validasi input ────────────────────────────────────────────────
    const errors = {};
    const trimmedNote = typeof note_text === "string" ? note_text.trim() : "";
    const trimmedMachineName =
      typeof new_machine_name === "string" ? new_machine_name.trim() : "";
    const plantIdRaw =
      plant_id !== undefined && plant_id !== null
        ? String(plant_id).trim()
        : "";

    if (!trimmedNote) {
      errors.note_text = "Teks catatan aset wajib diisi.";
    } else if (trimmedNote.length > 150) {
      // `logbooks.unmapped_asset_note` adalah @db.VarChar(150)
      errors.note_text = "Teks catatan aset maksimal 150 karakter.";
    }
    if (!plantIdRaw) {
      errors.plant_id = "Line/Plant wajib dipilih.";
    } else if (!/^\d+$/.test(plantIdRaw)) {
      errors.plant_id = "Line/Plant tidak valid.";
    }
    if (!trimmedMachineName) {
      errors.new_machine_name = "Nama mesin baru wajib diisi.";
    } else if (trimmedMachineName.length < 3) {
      errors.new_machine_name = "Nama mesin minimal 3 karakter.";
    } else if (trimmedMachineName.length > 100) {
      // `machines.name` adalah @db.VarChar(100)
      errors.new_machine_name = "Nama mesin maksimal 100 karakter.";
    }

    if (Object.keys(errors).length > 0) {
      return errorResponse(res, {
        message: "Data promosi aset belum lengkap atau tidak valid.",
        errors,
        statusCode: 400,
      });
    }

    const plantIdBigInt = BigInt(plantIdRaw);
    const plant = await prisma.plant.findUnique({
      where: { id: plantIdBigInt },
      select: { id: true, name: true },
    });
    if (!plant) {
      return errorResponse(res, {
        message: "Line/Plant yang dipilih tidak ditemukan.",
        statusCode: 404,
      });
    }

    // ── Cegah duplikat master mesin pada Line yang sama (409) ─────────
    const duplicateMachine = await prisma.machine.findFirst({
      where: { name: trimmedMachineName, plant_id: plantIdBigInt },
      select: { id: true, name: true },
    });
    if (duplicateMachine) {
      return errorResponse(res, {
        message: `Mesin "${duplicateMachine.name}" sudah terdaftar di ${plant.name}. Gunakan nama lain atau tautkan lewat Master Mesin.`,
        statusCode: 409,
      });
    }

    // ── Kumpulkan logbook yang akan di-relink ─────────────────────────
    const noteKey = buildNoteKey(trimmedNote);
    const tokenKeywords = tokenizeNote(trimmedNote);
    const newMachineNameLower = trimmedMachineName.toLowerCase();

    const candidateRows = await prisma.logbook.findMany({
      where: buildPromoteCandidateWhere(noteKey, tokenKeywords, plantIdBigInt),
      select: {
        id: true,
        unmapped_asset_note: true,
        machine: { select: { name: true } },
      },
    });

    // Filter final case-insensitive (trim) di memori — sumber kebenaran grouping.
    const matchedRows = selectRowsForPromotion(candidateRows, {
      noteKey,
      machineNames: [newMachineNameLower],
      tokenKeywords: [newMachineNameLower, ...tokenKeywords],
    });

    if (matchedRows.length === 0) {
      return errorResponse(res, {
        message:
          "Logbook dengan catatan aset tersebut tidak ditemukan atau sudah dipromosikan sebelumnya.",
        statusCode: 404,
      });
    }

    const matchedIds = matchedRows.map((row) => row.id);

    // ── Transaksi atomik: mesin → relink logbook → audit trail ────────
    const { createdMachine, affectedCount } = await prisma.$transaction(
      async (tx) => {
        const machine = await tx.machine.create({
          data: {
            name: trimmedMachineName,
            plant_id: plantIdBigInt,
            criticality: PROMOTED_MACHINE_CRITICALITY,
            is_unmapped_other: PROMOTED_MACHINE_IS_UNMAPPED_OTHER,
          },
        });

        const updateResult = await tx.logbook.updateMany({
          where: { id: { in: matchedIds } },
          data: {
            machine_id: machine.id,
            unmapped_asset_note: null,
          },
        });

        await tx.userActivity.create({
          data: {
            user_id: BigInt(req.user.id),
            activity: "PROMOTE_UNMAPPED_ASSET",
            detail: JSON.stringify({
              note_text: trimmedNote,
              new_machine_id: Number(machine.id),
              new_machine_name: machine.name,
              plant_id: Number(plantIdBigInt),
              plant_name: plant.name,
              affected_logbooks_count: updateResult.count,
              // Sampel id agar audit trail tetap ringkas.
              logbook_ids_sample: matchedIds.slice(0, 50).map(Number),
            }),
          },
        });

        return { createdMachine: machine, affectedCount: updateResult.count };
      },
    );

    return successResponse(res, {
      message: `Aset "${trimmedNote}" berhasil didaftarkan sebagai mesin "${createdMachine.name}". ${affectedCount} logbook otomatis ditautkan.`,
      data: {
        created_machine: {
          id: Number(createdMachine.id),
          name: createdMachine.name,
          plant_id:
            createdMachine.plant_id !== null
              ? Number(createdMachine.plant_id)
              : null,
          plant_name: plant.name,
          criticality: createdMachine.criticality,
          is_unmapped_other: createdMachine.is_unmapped_other,
        },
        affected_logbooks_count: affectedCount,
      },
      statusCode: 201,
    });
  } catch (err) {
    next(err);
  }
}
