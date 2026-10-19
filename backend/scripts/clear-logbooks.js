import prisma from '../src/config/prisma.js'

async function clearLogbooks() {
  console.log('🧹 Membersihkan seluruh data logbook dari database TiDB...')

  try {
    // 1. Hapus approval terkait logbook
    const deletedApprovals = await prisma.logbookApproval.deleteMany({})
    console.log(`- Berhasil menghapus ${deletedApprovals.count} data logbook_approvals.`)

    // 2. Hapus notifikasi terkait logbook
    const deletedNotifs = await prisma.notification.deleteMany({})
    console.log(`- Berhasil menghapus ${deletedNotifs.count} data notifications.`)

    // 3. Hapus sparepart used jika ada
    try {
      const deletedSpareparts = await prisma.sparepartUsed.deleteMany({})
      console.log(`- Berhasil menghapus ${deletedSpareparts.count} data sparepart_used.`)
    } catch (e) {
      // Table may be optional or empty
    }

    // 4. Hapus seluruh data logbook
    const deletedLogbooks = await prisma.logbook.deleteMany({})
    console.log(`- Berhasil menghapus ${deletedLogbooks.count} data logbooks.`)

    // 5. Hapus aktivitas logbook di user_activities
    const deletedActivities = await prisma.userActivity.deleteMany({
      where: {
        activity: {
          in: [
            'SUBMIT_LOGBOOK',
            'SAVE_DRAFT_LOGBOOK',
            'UPDATE_LOGBOOK',
            'DELETE_LOGBOOK',
            'APPROVE_LOGBOOK',
            'REJECT_LOGBOOK',
            'SUBMIT_ALL_DRAFTS'
          ]
        }
      }
    })
    console.log(`- Berhasil membersihkan ${deletedActivities.count} catatan audit aktivitas logbook.`)

    console.log('✅ SELURUH DATA DUMMY LOGBOOK TELAH BERHASIL DIBERSIHKAN DARI DATABASE!')
  } catch (error) {
    console.error('❌ Gagal membersihkan logbook:', error)
  } finally {
    await prisma.$disconnect()
    process.exit(0)
  }
}

clearLogbooks()
