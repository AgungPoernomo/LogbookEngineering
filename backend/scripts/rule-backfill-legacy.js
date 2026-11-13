import "dotenv/config";
import prisma from "../src/config/prisma.js";

function classifyByRule(desc) {
  const text = (desc || "").toLowerCase();

  let activity_category = "MACHINE_TROUBLE";
  let quick_action_tag = "Perbaikan Mesin";
  let maintenance_type = "CORRECTIVE";
  let machine_end_status = "NORMAL_RESOLVED";
  let is_downtime = false;

  if (
    text.includes("kereta") ||
    text.includes("tray") ||
    text.includes("roda")
  ) {
    activity_category = "KERETA_TRAY_REPAIR";
    quick_action_tag = "Repair Kereta/Tray";
  } else if (
    text.includes("monitoring") ||
    text.includes("standby") ||
    text.includes("cek") ||
    text.includes("inspeksi")
  ) {
    activity_category = "PREVENTIVE_PM";
    quick_action_tag = "Monitoring / Inspeksi";
    maintenance_type = "INSPECTION";
  } else if (
    text.includes("las") ||
    text.includes("fabrikasi") ||
    text.includes("scafolding") ||
    text.includes("modif") ||
    text.includes("bengkel")
  ) {
    activity_category = "FABRICATION_PROJECT";
    quick_action_tag = "Fabrikasi / Modifikasi";
    maintenance_type = null;
  } else if (
    text.includes("rapat") ||
    text.includes("training") ||
    text.includes("5s") ||
    text.includes("tor") ||
    text.includes("administrasi")
  ) {
    activity_category = "SUPPORT_NON_MACHINE";
    quick_action_tag = "Tugas Non-Mesin";
    maintenance_type = null;
  } else if (
    text.includes("rusak") ||
    text.includes("bocor") ||
    text.includes("mati") ||
    text.includes("error") ||
    text.includes("ganti")
  ) {
    is_downtime = text.includes("mati") || text.includes("rusak");
  }

  return {
    activity_category,
    quick_action_tag,
    maintenance_type,
    machine_end_status,
    is_downtime,
  };
}

async function main() {
  console.log("⚡ RULE-BASED BACKFILL (BATCH MODE - NO TRANSACTION)");
  console.log("────────────────────────────────────────────────────────────");

  // Ambil data yang belum diproses
  const legacyLogbooks = await prisma.logbook.findMany({
    where: { quick_action_tag: null },
    select: { id: true, activity_description: true },
  });

  const total = legacyLogbooks.length;
  console.log(`Total data tersisa: ${total}`);

  if (total === 0) {
    console.log("✅ Semua data sudah bersih!");
    return;
  }

  // Kita proses 50 data per kelompok secara paralel (cepat tapi aman)
  const CHUNK_SIZE = 50;
  let processed = 0;

  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = legacyLogbooks.slice(i, i + CHUNK_SIZE);

    const updatePromises = chunk.map((lb) => {
      const result = classifyByRule(lb.activity_description);
      return prisma.logbook.update({
        where: { id: lb.id },
        data: {
          activity_category: result.activity_category,
          quick_action_tag: result.quick_action_tag,
          maintenance_type: result.maintenance_type,
          machine_end_status: result.machine_end_status,
          is_downtime: result.is_downtime,
        },
      });
    });

    try {
      // Eksekusi 50 update sekaligus TANPA membungkusnya dalam 1 transaksi raksasa
      await Promise.all(updatePromises);
      processed += chunk.length;
      console.log(`  ✔ ${processed} / ${total} data berhasil diperbarui...`);
    } catch (err) {
      console.error(`  ❌ Gagal di kelompok ${i}:`, err.message);
    }

    // Jeda 0.5 detik agar TiDB tidak "kaget" dan memutus koneksi
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("────────────────────────────────────────────────────────────");
  console.log(`✅ SELESAI! Total ${processed} data telah diisi.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
