import "dotenv/config";
import prisma from "../src/config/prisma.js";

async function main() {
  console.log("🕵️‍♂️ VERIFIKASI HASIL BACKFILL DATA LAMA");
  console.log("────────────────────────────────────────────────────────────");

  const total = await prisma.logbook.count();
  const nullTag = await prisma.logbook.count({
    where: { quick_action_tag: null },
  });

  console.log(`📊 Total Seluruh Logbook di DB : ${total}`);
  console.log(`✅ Null di activity_category   : 0 (DB memaksa NOT NULL)`);
  console.log(`✅ Null di machine_end_status  : 0 (DB memaksa NOT NULL)`);
  console.log(`❌ Null di quick_action_tag    : ${nullTag} (Harus 0)`);

  if (nullTag > 0) {
    console.log(
      "\n⚠️ PERINGATAN: Masih ada data yang belum terisi quick_action_tag!",
    );
  } else {
    console.log("\n✅ AMAN: Semua kolom wajib sudah terisi 100%.");
  }

  console.log("\n────────────────────────────────────────────────────────────");
  console.log("📈 DISTRIBUSI KATEGORI (Apakah masuk akal?)");

  const distCat = await prisma.logbook.groupBy({
    by: ["activity_category"],
    _count: { _all: true },
  });
  console.table(
    distCat.map((d) => ({
      Kategori: d.activity_category,
      Jumlah: d._count._all,
    })),
  );

  console.log("\n────────────────────────────────────────────────────────────");
  console.log("🔎 SAMPEL ACAK DATA LAMA (Cek Manual)");

  const sample = await prisma.logbook.findMany({
    where: { task_date: { lt: "2026-10-23" } },
    take: 10,
    skip: Math.floor(Math.random() * 5000),
    select: {
      task_date: true,
      activity_description: true,
      activity_category: true,
      quick_action_tag: true,
      maintenance_type: true,
    },
  });

  sample.forEach((s, i) => {
    // Perbaikan: Cek apakah string atau Date
    const formattedDate =
      s.task_date instanceof Date
        ? s.task_date.toISOString().split("T")[0]
        : s.task_date;

    console.log(`\n[${i + 1}] Tanggal: ${formattedDate}`);
    console.log(
      `    Deskripsi : ${s.activity_description ? s.activity_description.substring(0, 80) + "..." : "(kosong)"}`,
    );
    console.log(
      `    Kategori  : ${s.activity_category} | Tag: ${s.quick_action_tag} | Maint: ${s.maintenance_type || "-"}`,
    );
  });

  console.log("\n────────────────────────────────────────────────────────────");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
