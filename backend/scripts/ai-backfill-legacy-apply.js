/**
 * ============================================================
 * AI Backfill Legacy Logbook (APPLY / WRITE TO DB)
 * ============================================================
 * Script ini akan mengupdate database secara nyata.
 * Pastikan Anda sudah memiliki backup (backup_data_penting.sql).
 *
 * Jalankan:
 *   node scripts/ai-backfill-legacy-apply.js
 *   npm run ai:backfill:apply
 */
import "dotenv/config";
import prisma from "../src/config/prisma.js";

const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = (
  process.env.LLM_BASE_URL || "https://api.appverse.dev/v1"
).replace(/\/+$/, "");
const LLM_MODEL = process.env.LLM_MODEL || "glm-5.3";
const LLM_TIMEOUT_MS = 60000;

const LEGACY_CUTOFF_DATE = "2026-10-23";
const LIMIT = 50; // Bisa disesuaikan, atau hapus take: untuk semua data

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

const log = (msg) => console.log(msg);
const sep = () => log("─".repeat(72));
const truncate = (text, max = 100) =>
  text?.length > max ? `${text.slice(0, max)}...` : text;

function extractJson(raw) {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start)
    throw new Error("Tidak ditemukan objek JSON");
  return JSON.parse(candidate.slice(start, end + 1));
}

function validateAiOutput(parsed, failureCodes) {
  const warnings = [];
  const byId = new Map(failureCodes.map((fc) => [Number(fc.id), fc]));
  const byName = new Map(failureCodes.map((fc) => [fc.name.toLowerCase(), fc]));
  const result = {};

  const category = String(parsed.activity_category || "").toUpperCase();
  result.activity_category = VALID_ACTIVITY_CATEGORY.includes(category)
    ? category
    : "MACHINE_TROUBLE";

  if (
    typeof parsed.quick_action_tag === "string" &&
    parsed.quick_action_tag.trim()
  ) {
    result.quick_action_tag = parsed.quick_action_tag.trim().slice(0, 100);
  } else {
    result.quick_action_tag = null;
  }

  const mt =
    parsed.maintenance_type == null
      ? ""
      : String(parsed.maintenance_type).toUpperCase();
  result.maintenance_type = VALID_MAINTENANCE_TYPE.includes(mt) ? mt : null;

  const mes = String(parsed.machine_end_status || "").toUpperCase();
  result.machine_end_status = VALID_MACHINE_END_STATUS.includes(mes)
    ? mes
    : "NORMAL_RESOLVED";

  result.is_downtime =
    parsed.is_downtime === true || parsed.is_downtime === "true";

  const fcid =
    parsed.failure_code_id == null ? NaN : Number(parsed.failure_code_id);
  if (!Number.isNaN(fcid) && byId.has(fcid)) {
    result.failure_code_id = fcid;
  } else if (
    typeof parsed.failure_code === "string" &&
    byName.has(parsed.failure_code.toLowerCase())
  ) {
    result.failure_code_id = Number(
      byName.get(parsed.failure_code.toLowerCase()).id,
    );
  } else {
    result.failure_code_id = null;
  }

  return result;
}

function buildPrompt(logbook, failureCodes) {
  const failureCodeList = failureCodes
    .map(
      (fc) =>
        `- id: ${fc.id} | code: ${fc.code} | name: ${fc.name} (${fc.category})`,
    )
    .join("\n");
  const systemPrompt = `Anda adalah asisten klasifikasi data logbook maintenance pabrik farmasi.
Tugas: baca deskripsi aktivitas lama dan petakan ke taksonomi v6 baru.
Balas HANYA dengan JSON murni dengan struktur persis:
{
  "activity_category": "<MACHINE_TROUBLE|PREVENTIVE_PM|KERETA_TRAY_REPAIR|FABRICATION_PROJECT|SUPPORT_NON_MACHINE>",
  "quick_action_tag": "<string singkat bahasa Indonesia, max 100 karakter>",
  "maintenance_type": "<PREVENTIVE|CORRECTIVE|BREAKDOWN|AUTONOMOUS_TPM|INSPECTION>",
  "machine_end_status": "<NORMAL_RESOLVED|MONITORING_NEEDED|TEMPORARY_FIX|WAITING_SPAREPART>",
  "is_downtime": <true|false>,
  "failure_code_id": <id angka dari daftar, atau null>
}
Aturan:
1. MACHINE_TROUBLE: perbaikan/setting mesin.
2. PREVENTIVE_PM: rawat rutin, inspeksi, monitoring.
3. KERETA_TRAY_REPAIR: repair kereta/trolley/tray.
4. FABRICATION_PROJECT: bengkel, las, fabrikasi.
5. SUPPORT_NON_MACHINE: non-mesin (rapat, training, TOR).
6. maintenance_type: BREAKDOWN jika mati mendadak; CORRECTIVE jika perbaikan; PREVENTIVE/INSPECTION untuk rutin; null jika tidak relevan.
7. is_downtime: true jika mesin berhenti produksi.
8. failure_code_id: pilih dari daftar; null jika tidak relevan.

Daftar failure_codes:
${failureCodeList}`;

  const userPrompt = `Logbook:
- id: ${logbook.id}
- tanggal: ${logbook.task_date}
- mesin: ${logbook.machine ? logbook.machine.name : "-"} | sub-mesin: ${logbook.subMachine ? logbook.subMachine.name : "-"}
- sparepart (teks legacy): ${logbook.sparepart || "-"}
- deskripsi aktivitas: ${logbook.activity_description}

Balas HANYA JSON.`;
  return { systemPrompt, userPrompt };
}

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
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data?.choices?.[0]?.message?.content;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  log("🚀 AI BACKFILL LEGACY — APPLY MODE (UPDATE DATABASE)");
  sep();

  if (!LLM_API_KEY) {
    console.error("❌ LLM_API_KEY kosong.");
    process.exit(1);
  }

  const failureCodes = await prisma.failureCode.findMany({
    where: { is_active: true },
    select: { id: true, code: true, name: true, category: true },
  });
  log(`✔ ${failureCodes.length} failure codes siap.`);

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
  log(`✔ ${legacyLogbooks.length} logbook legacy akan diproses.\n`);

  let ok = 0,
    failed = 0;

  for (const [index, lb] of legacyLogbooks.entries()) {
    log(`[${index + 1}/${legacyLogbooks.length}] Logbook #${lb.id}...`);
    try {
      const { systemPrompt, userPrompt } = buildPrompt(lb, failureCodes);
      const raw = await callLlm(systemPrompt, userPrompt);
      const parsed = extractJson(raw);
      const result = validateAiOutput(parsed, failureCodes);

      // 💾 SIMPAN KE DATABASE
      await prisma.logbook.update({
        where: { id: lb.id },
        data: {
          activity_category: result.activity_category,
          quick_action_tag: result.quick_action_tag,
          maintenance_type: result.maintenance_type,
          machine_end_status: result.machine_end_status,
          is_downtime: result.is_downtime,
          failure_code_id: result.failure_code_id,
        },
      });

      log(`    ✔ Berhasil diupdate (${result.activity_category})`);
      ok++;
    } catch (err) {
      failed++;
      log(`    ❌ Gagal: ${err.message}`);
    }

    // Jeda sedikit agar tidak kena rate-limit API
    await new Promise((r) => setTimeout(r, 1000));
  }

  sep();
  log("📊 RINGKASAN APPLY");
  log(`   Total diproses : ${legacyLogbooks.length}`);
  log(`   Sukses (Update): ${ok}`);
  log(`   Gagal          : ${failed}`);
  sep();
}

main()
  .catch((e) => {
    console.error("❌ Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
