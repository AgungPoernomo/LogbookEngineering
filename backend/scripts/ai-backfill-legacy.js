/**
 * ============================================================
 * AI Backfill Legacy Logbook (DRY-RUN ONLY)
 * ============================================================
 * Membaca logbook lama (sebelum 23 Oktober 2026 / kolom v6 kosong),
 * memetakan `activity_description` ke enum v6 (ActivityCategory,
 * MachineEndStatus, MaintenanceType, QuickActionTag, FailureCode)
 * menggunakan AI AppVerse (model GLM-5.3).
 *
 * ⚠️  DRY-RUN: hasil HANYA dicetak ke konsol, TIDAK disimpan ke DB.
 *
 * Env vars (lihat .env / .env.example):
 *   - LLM_API_KEY   : API Key AppVerse
 *   - LLM_BASE_URL  : Base URL endpoint (OpenAI-compatible, tanpa trailing slash)
 *   - LLM_MODEL     : Nama model (default: glm-5.3)
 *
 * Jalankan:
 *   node scripts/ai-backfill-legacy.js
 *   npm run ai:backfill:dry
 */
import prisma from "../src/config/prisma.js";

// ============================================================
// Konfigurasi
// ============================================================
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = (
  process.env.LLM_BASE_URL || "https://api.appverse.dev/v1"
).replace(/\/+$/, "");
const LLM_MODEL = process.env.LLM_MODEL || "glm-5.3";
const LLM_TIMEOUT_MS = 60000;

// Tanggal cutoff migrasi v6 (data sebelum tanggal ini = legacy)
const LEGACY_CUTOFF_DATE = "2026-10-23";
const LIMIT = 10;

// Nilai valid untuk validasi output AI (sesuai enum di prisma/schema.prisma)
const VALID_ACTIVITY_CATEGORY = [
  "MACHINE_TROUBLE",
  "PREVENTIVE_PM",
  "KERETA_TRAY_REPAIR",
  "FABRICATION_PROJECT",
  "SUPPORT_NON_MACHINE",
];
const VALID_MACHINE_END_STATUS = [
  "NORMAL_RESOLVED",
  "MONITORING_NEEDED",
  "TEMPORARY_FIX",
  "WAITING_SPAREPART",
];
const VALID_MAINTENANCE_TYPE = [
  "PREVENTIVE",
  "CORRECTIVE",
  "BREAKDOWN",
  "AUTONOMOUS_TPM",
  "INSPECTION",
];

// ============================================================
// Util
// ============================================================
const log = (msg) => console.log(msg);
const sep = () => log("─".repeat(72));

function truncate(text, max = 100) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

/**
 * Ekstrak JSON murni dari respons AI (robust terhadap code-fence ```json
 * maupun teks sambutan di sekitar JSON).
 */
function extractJson(raw) {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Tidak ditemukan objek JSON dalam respons AI");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Validasi & normalisasi hasil AI terhadap enum Prisma + master failure code.
 * Mengembalikan { result, warnings }.
 */
function validateAiOutput(parsed, failureCodes) {
  const warnings = [];
  const byId = new Map(failureCodes.map((fc) => [Number(fc.id), fc]));
  const byName = new Map(failureCodes.map((fc) => [fc.name.toLowerCase(), fc]));
  const result = {};

  // activity_category (wajib)
  const category = String(parsed.activity_category || "").toUpperCase();
  if (VALID_ACTIVITY_CATEGORY.includes(category)) {
    result.activity_category = category;
  } else {
    result.activity_category = "MACHINE_TROUBLE"; // default schema
    warnings.push(
      `activity_category tidak valid "${parsed.activity_category}" -> fallback MACHINE_TROUBLE`,
    );
  }

  // quick_action_tag (opsional, string bebas max 100 char)
  if (
    typeof parsed.quick_action_tag === "string" &&
    parsed.quick_action_tag.trim()
  ) {
    result.quick_action_tag = parsed.quick_action_tag.trim().slice(0, 100);
  } else {
    result.quick_action_tag = null;
    warnings.push("quick_action_tag kosong/tidak valid");
  }

  // maintenance_type (opsional, enum)
  const mt =
    parsed.maintenance_type == null
      ? ""
      : String(parsed.maintenance_type).toUpperCase();
  if (mt === "") {
    result.maintenance_type = null;
    warnings.push("maintenance_type kosong (null)");
  } else if (VALID_MAINTENANCE_TYPE.includes(mt)) {
    result.maintenance_type = mt;
  } else {
    result.maintenance_type = null;
    warnings.push(
      `maintenance_type tidak valid "${parsed.maintenance_type}" -> null`,
    );
  }

  // machine_end_status (enum, default NORMAL_RESOLVED)
  const mes = String(parsed.machine_end_status || "").toUpperCase();
  if (VALID_MACHINE_END_STATUS.includes(mes)) {
    result.machine_end_status = mes;
  } else {
    result.machine_end_status = "NORMAL_RESOLVED"; // default schema
    warnings.push(
      `machine_end_status tidak valid "${parsed.machine_end_status}" -> fallback NORMAL_RESOLVED`,
    );
  }

  // is_downtime (boolean)
  result.is_downtime =
    parsed.is_downtime === true || parsed.is_downtime === "true";

  // failure_code_id (opsional, harus cocok dengan master failure_codes)
  const fcid =
    parsed.failure_code_id == null ? NaN : Number(parsed.failure_code_id);
  if (!Number.isNaN(fcid) && byId.has(fcid)) {
    result.failure_code_id = fcid;
    result._failure_code = byId.get(fcid).code;
  } else if (
    typeof parsed.failure_code === "string" &&
    byName.has(parsed.failure_code.toLowerCase())
  ) {
    const fc = byName.get(parsed.failure_code.toLowerCase());
    result.failure_code_id = Number(fc.id);
    result._failure_code = fc.code;
  } else {
    result.failure_code_id = null;
    result._failure_code = null;
    if (parsed.failure_code_id != null) {
      warnings.push(
        `failure_code_id "${parsed.failure_code_id}" tidak ditemukan di master -> null`,
      );
    }
  }

  return { result, warnings };
}

/**
 * Bangun prompt (system + user) untuk satu logbook.
 */
function buildPrompt(logbook, failureCodes) {
  const failureCodeList = failureCodes
    .map(
      (fc) =>
        `- id: ${fc.id} | code: ${fc.code} | name: ${fc.name} (${fc.category})`,
    )
    .join("\n");

  const systemPrompt = `Anda adalah asisten klasifikasi data logbook maintenance pabrik farmasi.
Tugas: baca deskripsi aktivitas lama dan petakan ke taksonomi v6 baru.
Balas HANYA dengan JSON murni (tanpa penjelasan, tanpa markdown/code fence) dengan struktur persis:
{
  "activity_category": "<MACHINE_TROUBLE|PREVENTIVE_PM|KERETA_TRAY_REPAIR|FABRICATION_PROJECT|SUPPORT_NON_MACHINE>",
  "quick_action_tag": "<string singkat bahasa Indonesia, max 100 karakter, misal 'Ganti Part Rusak'>",
  "maintenance_type": "<PREVENTIVE|CORRECTIVE|BREAKDOWN|AUTONOMOUS_TPM|INSPECTION>",
  "machine_end_status": "<NORMAL_RESOLVED|MONITORING_NEEDED|TEMPORARY_FIX|WAITING_SPAREPART>",
  "is_downtime": <true|false>,
  "failure_code_id": <id angka dari daftar, atau null jika tidak relevan>
}

Aturan:
1. MACHINE_TROUBLE: perbaikan/setting mesin yang rusak/abnormal.
2. PREVENTIVE_PM: rawat rutin, kebersihan, pelumasan, inspeksi terjadwal.
3. KERETA_TRAY_REPAIR: repair kereta/trolley/tray/dolly (sering disebut "kereta" atau "tray").
4. FABRICATION_PROJECT: bengkel, las, modifikasi, fabrikasi, project.
5. SUPPORT_NON_MACHINE: tugas non-mesin tanpa sparepart (rapat, training, 5S area, dsb).
6. maintenance_type: BREAKDOWN jika mesin mati total mendadak; CORRECTIVE jika perbaikan kerusakan;
   PREVENTIVE/AUTONOMOUS_TPM/INSPECTION untuk rawat rutin; null hanya jika benar-benar tidak relevan.
7. is_downtime: true jika mesin berhenti produksi saat penanganan.
8. failure_code_id: pilih yang paling mendekati dari daftar; null jika tidak relevan (misal PM/SUPPORT).

Daftar failure_codes:
${failureCodeList}`;

  const userPrompt = `Logbook lama:
- id: ${logbook.id}
- tanggal: ${logbook.task_date}
- mesin: ${logbook.machine ? logbook.machine.name : "-"} | sub-mesin: ${logbook.subMachine ? logbook.subMachine.name : "-"}
- sparepart (teks legacy): ${logbook.sparepart || "-"}
- deskripsi aktivitas: ${logbook.activity_description}

Petakan ke JSON taksonomi v6. Balas HANYA JSON.`;

  return { systemPrompt, userPrompt };
}

/**
 * Panggil AppVerse AI API (OpenAI-compatible /chat/completions) via fetch.
 */
async function callLlm(systemPrompt, userPrompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `HTTP ${response.status} ${response.statusText} — ${truncate(body, 300)}`,
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(
        `Struktur respons AI tidak dikenali: ${truncate(JSON.stringify(data), 300)}`,
      );
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  log("🤖 AI BACKFILL LEGACY LOGBOOK — DRY-RUN (tidak ada data disimpan)");
  sep();
  log(`Model       : ${LLM_MODEL}`);
  log(`Endpoint    : ${LLM_BASE_URL}/chat/completions`);
  log(
    `API Key     : ${LLM_API_KEY ? `${LLM_API_KEY.slice(0, 6)}...${LLM_API_KEY.slice(-4)}` : "(KOSONG!)"}`,
  );
  log(`Cutoff v6   : sebelum ${LEGACY_CUTOFF_DATE}`);
  log(`Limit baris : ${LIMIT}`);
  sep();

  if (!LLM_API_KEY) {
    console.error(
      "❌ LLM_API_KEY kosong. Isi di backend/.env terlebih dahulu:\n" +
        "    LLM_API_KEY=...\n" +
        "    LLM_BASE_URL=https://api.appverse.dev/v1\n" +
        "    LLM_MODEL=glm-5.3",
    );
    process.exit(1);
  }

  // 1. Ambil daftar failure_codes sebagai referensi AI
  log("→ Mengambil daftar failure_codes dari database...");
  const failureCodes = await prisma.failureCode.findMany({
    where: { is_active: true },
    select: { id: true, code: true, name: true, category: true },
    orderBy: { id: "asc" },
  });
  log(
    `  ✔ ${failureCodes.length} failure codes aktif (${failureCodes.map((f) => f.code).join(", ")})`,
  );

  // 2. Fetch logbook legacy terbaru
  log("→ Mengambil logbook legacy terbaru...");
  const legacyLogbooks = await prisma.logbook.findMany({
    where: {
      OR: [
        { task_date: { lt: LEGACY_CUTOFF_DATE } },
        { quick_action_tag: null },
      ],
    },
    include: {
      machine: { select: { name: true } },
      subMachine: { select: { name: true } },
    },
    orderBy: [{ task_date: "desc" }, { id: "desc" }],
    take: LIMIT,
  });

  if (legacyLogbooks.length === 0) {
    log("✅ Tidak ada logbook legacy yang perlu di-backfill. Selesai.");
    return;
  }
  log(`  ✔ ${legacyLogbooks.length} logbook legacy ditemukan.`);
  sep();

  // 3. Proses tiap logbook lewat AI
  let ok = 0;
  let failed = 0;

  for (const [index, lb] of legacyLogbooks.entries()) {
    log(
      `\n[${index + 1}/${legacyLogbooks.length}] Logbook #${lb.id} — ${lb.task_date} — mesin: ${lb.machine ? lb.machine.name : "-"}`,
    );
    log(`    Deskripsi: ${truncate(lb.activity_description, 120)}`);
    log(
      `    Sparepart: ${lb.sparepart || "-"} | Durasi: ${lb.duration_minutes}m`,
    );

    try {
      const { systemPrompt, userPrompt } = buildPrompt(lb, failureCodes);
      const raw = await callLlm(systemPrompt, userPrompt);
      const parsed = extractJson(raw);
      const { result, warnings } = validateAiOutput(parsed, failureCodes);

      log("    📋 Hasil pemetaan AI (DRY-RUN, tidak disimpan):");
      log(
        `       ${JSON.stringify(result, null, 2).replace(/\n/g, "\n       ")}`,
      );
      if (warnings.length > 0) {
        log("    ⚠️  Peringatan validasi:");
        for (const w of warnings) log(`       - ${w}`);
      }
      ok++;
    } catch (err) {
      failed++;
      log(`    ❌ Gagal: ${err.message}`);
    }
  }

  // 4. Ringkasan
  sep();
  log("📊 RINGKASAN DRY-RUN");
  log(`   Total diproses : ${legacyLogbooks.length}`);
  log(`   Sukses         : ${ok}`);
  log(`   Gagal          : ${failed}`);
  log("   Data tersimpan : 0 (dry-run, tidak ada write ke database)");
  sep();
  log(
    "✅ Dry-run selesai. Jika hasil sudah sesuai, lanjutkan ke versi apply (script terpisah).",
  );
}

main()
  .catch((e) => {
    console.error("❌ Gagal dry-run AI backfill:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
