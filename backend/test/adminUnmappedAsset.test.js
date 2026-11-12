import { describe, it, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildNoteKey,
  groupUnmappedAssetRows,
  selectRowsForPromotion,
  promoteUnmappedAsset,
  __setPrismaClientForTest
} from '../src/controllers/adminUnmappedAssetController.js'

// Prisma tiruan agar handler `promoteUnmappedAsset` dapat diuji tanpa database
// (fokus: bentuk payload nested write sub-mesin default).
const machineCreateCalls = []
const logbookUpdateManyCalls = []
const userActivityCreateCalls = []

const transactionClient = {
  machine: {
    create: async (args) => {
      machineCreateCalls.push(args)
      return {
        id: BigInt(77),
        name: args.data.name,
        plant_id: args.data.plant_id,
        criticality: args.data.criticality,
        is_unmapped_other: args.data.is_unmapped_other,
        subMachines: [{ id: BigInt(501), name: args.data.subMachines.create[0].name }]
      }
    }
  },
  logbook: {
    updateMany: async (args) => {
      logbookUpdateManyCalls.push(args)
      return { count: args.where.id.in.length }
    }
  },
  userActivity: {
    create: async (args) => {
      userActivityCreateCalls.push(args)
      return { id: BigInt(1) }
    }
  }
}

const fakePrisma = {
  plant: { findUnique: async () => ({ id: BigInt(3), name: 'Line 3' }) },
  machine: { findFirst: async () => null },
  logbook: {
    findMany: async () => [
      { id: BigInt(11), unmapped_asset_note: 'Mesin Filling Baru', machine: null },
      { id: BigInt(12), unmapped_asset_note: '  mesin filling baru ', machine: null }
    ]
  },
  $transaction: async (callback) => callback(transactionClient)
}

// Kembalikan controller ke singleton Prisma asli setelah seluruh tes selesai.
after(() => __setPrismaClientForTest(null))

// ============================================================================
// FASE 5.1 — Radar Aset Belum Terdaftar.
// Pengujian MURNI (tanpa database): mengunci kontrak grouping catatan aset
// (trim + case-insensitive), pemilihan Line acuan dari logbook terbaru, dan
// pemilihan baris yang di-relink saat promote agar tidak salah sasaran.
// ============================================================================

describe('Fase 5.1 - buildNoteKey', () => {
  it('menormalkan trim & huruf besar/kecil', () => {
    assert.equal(buildNoteKey('  Mesin Filling Baru  '), 'mesin filling baru')
    assert.equal(buildNoteKey('MESIN FILLING BARU'), 'mesin filling baru')
  })

  it('null / undefined / kosong → string kosong', () => {
    assert.equal(buildNoteKey(null), '')
    assert.equal(buildNoteKey(undefined), '')
    assert.equal(buildNoteKey('   '), '')
  })
})

describe('Fase 5.1 - groupUnmappedAssetRows', () => {
  it('menggabungkan catatan yang sama walau beda casing/spasi', () => {
    const groups = groupUnmappedAssetRows([
      { id: 1, unmapped_asset_note: 'Mesin Filling Baru', task_date: '2026-10-01', plant_id: 1, plant: { name: 'Line 1' } },
      { id: 2, unmapped_asset_note: '  mesin filling baru ', task_date: '2026-10-05', plant_id: 1, plant: { name: 'Line 1' } },
      { id: 3, unmapped_asset_note: 'MESIN FILLING BARU', task_date: '2026-10-03', plant_id: 1, plant: { name: 'Line 1' } }
    ])

    assert.equal(groups.length, 1)
    assert.equal(groups[0].count, 3)
    assert.equal(groups[0].latest_date, '2026-10-05')
    // Label yang ditampilkan = penulisan pertama (sudah di-trim).
    assert.equal(groups[0].note, 'Mesin Filling Baru')
  })

  it('plant_id/plant_name mengikuti logbook terbaru (preselect modal promote)', () => {
    const groups = groupUnmappedAssetRows([
      { id: 1, unmapped_asset_note: 'Vacuum Packer', task_date: '2026-09-01', plant_id: 1, plant: { name: 'Line 1' } },
      { id: 2, unmapped_asset_note: 'Vacuum Packer', task_date: '2026-09-20', plant_id: 2, plant: { name: 'Line 2' } }
    ])

    assert.equal(groups[0].plant_id, 2)
    assert.equal(groups[0].plant_name, 'Line 2')
    assert.equal(groups[0].latest_date, '2026-09-20')
  })

  it('mengurutkan grup berdasarkan jumlah logbook terbanyak', () => {
    const groups = groupUnmappedAssetRows([
      { id: 1, unmapped_asset_note: 'Aset A', task_date: '2026-10-01', plant_id: 1, plant: { name: 'Line 1' } },
      { id: 2, unmapped_asset_note: 'Aset B', task_date: '2026-10-01', plant_id: 1, plant: { name: 'Line 1' } },
      { id: 3, unmapped_asset_note: 'Aset B', task_date: '2026-10-02', plant_id: 1, plant: { name: 'Line 1' } }
    ])

    assert.deepEqual(groups.map(g => g.note), ['Aset B', 'Aset A'])
    assert.deepEqual(groups.map(g => g.count), [2, 1])
  })

  it('mengumpulkan maksimal 3 sampel nama mesin tanpa duplikasi', () => {
    const groups = groupUnmappedAssetRows([
      { id: 1, unmapped_asset_note: 'Aset X', task_date: '2026-10-01', plant_id: 1, plant: { name: 'Line 1' }, machine: { name: 'Mesin A' } },
      { id: 2, unmapped_asset_note: 'Aset X', task_date: '2026-10-01', plant_id: 1, plant: { name: 'Line 1' }, machine: { name: 'Mesin A' } },
      { id: 3, unmapped_asset_note: 'Aset X', task_date: '2026-10-01', plant_id: 1, plant: { name: 'Line 1' }, machine: { name: 'Mesin B' } },
      { id: 4, unmapped_asset_note: 'Aset X', task_date: '2026-10-01', plant_id: 1, plant: { name: 'Line 1' }, machine: { name: 'Mesin C' } },
      { id: 5, unmapped_asset_note: 'Aset X', task_date: '2026-10-01', plant_id: 1, plant: { name: 'Line 1' }, machine: { name: 'Mesin D' } }
    ])

    assert.deepEqual(groups[0].sample_machine_names, ['Mesin A', 'Mesin B', 'Mesin C'])
  })

  it('mengabaikan catatan null / kosong dan aman untuk input non-array', () => {
    const groups = groupUnmappedAssetRows([
      { id: 1, unmapped_asset_note: null, task_date: '2026-10-01', plant_id: 1 },
      { id: 2, unmapped_asset_note: '   ', task_date: '2026-10-01', plant_id: 1 },
      { id: 3, unmapped_asset_note: 'Aset Nyata', task_date: '2026-10-01', plant_id: 1, plant: { name: 'Line 1' } }
    ])

    assert.equal(groups.length, 1)
    assert.equal(groups[0].note, 'Aset Nyata')
    assert.deepEqual(groupUnmappedAssetRows(null), [])
    assert.deepEqual(groupUnmappedAssetRows(undefined), [])
  })

  it('mengisi plant_name "-" bila relasi plant tidak ikut dimuat', () => {
    const groups = groupUnmappedAssetRows([
      { id: 1, unmapped_asset_note: 'Aset Tanpa Plant', task_date: '2026-10-01', plant_id: null }
    ])

    assert.equal(groups[0].plant_id, null)
    assert.equal(groups[0].plant_name, '-')
  })
})

describe('Fase 5.1 - selectRowsForPromotion', () => {
  const rows = [
    // Kasus normal D12: belum tertaut mesin → selalu ikut.
    { id: 1, unmapped_asset_note: 'Mesin Filling Baru', machine: null },
    // Casing beda + spasi berlebih → tetap ikut (case-insensitive trim).
    { id: 2, unmapped_asset_note: 'MESIN FILLING BARU ', machine: null },
    // Catatan berbeda → tidak boleh ikut.
    { id: 3, unmapped_asset_note: 'Mesin Capping Lama', machine: null },
    // Sudah tertaut mesin lain yang tidak relevan → tidak ikut.
    { id: 4, unmapped_asset_note: 'Mesin Filling Baru', machine: { name: 'Autoclave A' } },
    // Sudah tertaut mesin relevan → ikut.
    { id: 5, unmapped_asset_note: 'Mesin Filling Baru', machine: { name: 'Filling Station 2' } }
  ]

  it('memilih baris case-insensitive dan mengabaikan catatan lain', () => {
    const matched = selectRowsForPromotion(rows, {
      noteKey: 'mesin filling baru',
      machineNames: ['mesin filling baru'],
      tokenKeywords: ['filling']
    })

    assert.deepEqual(matched.map(r => r.id), [1, 2, 5])
  })

  it('baris yang sudah menempel ke mesin lain tidak ikut di-relink', () => {
    const matched = selectRowsForPromotion(
      [{ id: 4, unmapped_asset_note: 'Mesin Filling Baru', machine: { name: 'Autoclave A' } }],
      { noteKey: 'mesin filling baru', machineNames: ['mesin filling baru'], tokenKeywords: ['filling'] }
    )

    assert.deepEqual(matched, [])
  })

  it('noteKey kosong / input bukan array → daftar kosong', () => {
    assert.deepEqual(selectRowsForPromotion(rows, { noteKey: '' }), [])
    assert.deepEqual(selectRowsForPromotion(null, { noteKey: 'x' }), [])
    assert.deepEqual(selectRowsForPromotion(undefined, {}), [])
  })
})

// ----------------------------------------------------------------------------
// BUGFIX — mesin hasil promote wajib punya sub-mesin default.
//
// Tanpa sub-mesin, dropdown Sub-Mesin pada form Input Logbook kosong sehingga
// teknisi tidak bisa menyimpan logbook kategori MACHINE_TROUBLE (validasi Fase 2
// mewajibkan `sub_machine_id`). Tes ini menjalankan handler asli dengan Prisma
// tiruan dan memeriksa bentuk payload `machine.create`.
// ----------------------------------------------------------------------------
describe('Bugfix - promoteUnmappedAsset membuat sub-mesin default', () => {
  const buildRes = () => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code
        return this
      },
      json(payload) {
        this.body = payload
        return this
      }
    }
    return res
  }

  const resetCalls = () => {
    machineCreateCalls.length = 0
    logbookUpdateManyCalls.length = 0
    userActivityCreateCalls.length = 0
  }

  const promoteBody = {
    body: { note_text: 'Mesin Filling Baru', plant_id: 3, new_machine_name: 'Filling Baru' },
    user: { id: '1' }
  }

  it('machine.create memakai nested write subMachines.create + include', async () => {
    resetCalls()
    __setPrismaClientForTest(fakePrisma)

    const res = buildRes()
    let nextError = null
    await promoteUnmappedAsset(promoteBody, res, (err) => { nextError = err })

    assert.equal(nextError, null)
    assert.equal(res.statusCode, 201)
    assert.equal(machineCreateCalls.length, 1)

    const createArgs = machineCreateCalls[0]
    // Nested write: tepat 1 sub-mesin default.
    assert.deepEqual(createArgs.data.subMachines, {
      create: [{ name: 'Bagian Utama' }]
    })
    // Nilai master mesin tetap sesuai konstanta controller.
    assert.equal(createArgs.data.criticality, 'B_ESSENTIAL')
    assert.equal(createArgs.data.is_unmapped_other, false)
    assert.equal(typeof createArgs.data.plant_id, 'bigint')
    // Include agar sub-mesin bisa diverifikasi pada response.
    assert.equal(createArgs.include?.subMachines, true)
  })

  it('relink logbook & audit trail tetap berjalan, response memuat sub_machines', async () => {
    resetCalls()
    __setPrismaClientForTest(fakePrisma)

    const res = buildRes()
    await promoteUnmappedAsset(promoteBody, res, (err) => { throw err })

    // Relink: machine_id baru + catatan dibersihkan (D12 selesai).
    assert.deepEqual(logbookUpdateManyCalls[0].data, {
      machine_id: BigInt(77),
      unmapped_asset_note: null
    })
    assert.equal(res.body.data.affected_logbooks_count, 2)

    // Audit trail menyertakan id sub-mesin default.
    const detail = JSON.parse(userActivityCreateCalls[0].data.detail)
    assert.deepEqual(detail.sub_machine_ids, [501])

    // Response: sub-mesin tersedia untuk verifikasi admin.
    assert.deepEqual(res.body.data.created_machine.sub_machines, [
      { id: 501, name: 'Bagian Utama' }
    ])
    // BigInt tidak bocor ke JSON response.
    assert.equal(res.body.data.created_machine.id, 77)
  })
})
