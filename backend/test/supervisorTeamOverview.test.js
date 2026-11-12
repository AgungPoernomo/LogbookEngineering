import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveOverviewPlantScope,
  isDirectTeamMember
} from '../src/controllers/supervisorController.js'

// ============================================================================
// GET /api/v1/supervisor/team-overview — scope plant (RBAC).
// Controller dulu SELALU memakai `req.user.plant_id`, sehingga Admin tanpa plant
// hanya melihat teknisi tanpa plant dan query groupBy menghitung logbook
// se-pabrik. Pengujian ini mengunci aturan:
//   - Supervisor : selalu terkunci ke plant JWT (query diabaikan).
//   - Admin      : kosong / 'ALL' → seluruh plant; angka → plant terpilih.
// ============================================================================

describe('F4.5 - resolveOverviewPlantScope (Supervisor)', () => {
  it('mengunci ke plant pada JWT', () => {
    const scope = resolveOverviewPlantScope({ role: 'Supervisor', plant_id: 3 }, undefined)
    assert.deepEqual(scope, { plantId: 3, isAdmin: false })
  })

  it('mengabaikan query plant_id dari Supervisor (tidak bisa intip plant lain)', () => {
    const scope = resolveOverviewPlantScope({ role: 'Supervisor', plant_id: 3 }, '7')
    assert.equal(scope.plantId, 3)
    assert.equal(scope.isAdmin, false)
  })

  it('menerima plant_id bertipe string dari JWT', () => {
    const scope = resolveOverviewPlantScope({ role: 'Supervisor', plant_id: '12' }, null)
    assert.equal(scope.plantId, 12)
  })

  it('Supervisor tanpa plant di JWT → tidak ter-scope (null)', () => {
    const scope = resolveOverviewPlantScope({ role: 'Supervisor', plant_id: null }, '7')
    assert.equal(scope.plantId, null)
    assert.equal(scope.isAdmin, false)
  })
})

describe('F4.5 - resolveOverviewPlantScope (Admin)', () => {
  it('tanpa query → seluruh plant (is_global)', () => {
    assert.deepEqual(resolveOverviewPlantScope({ role: 'Admin', plant_id: 1 }, undefined), {
      plantId: null,
      isAdmin: true
    })
  })

  it('query "ALL" → seluruh plant', () => {
    assert.equal(resolveOverviewPlantScope({ role: 'Admin', plant_id: 1 }, 'ALL').plantId, null)
  })

  it('query plant_id valid → plant terpilih', () => {
    assert.equal(resolveOverviewPlantScope({ role: 'Admin', plant_id: 1 }, '5').plantId, 5)
  })

  it('query tidak valid / negatif → jatuh ke seluruh plant (bukan filter sampah)', () => {
    assert.equal(resolveOverviewPlantScope({ role: 'Admin' }, 'abc').plantId, null)
    assert.equal(resolveOverviewPlantScope({ role: 'Admin' }, '-3').plantId, null)
  })

  it('tidak membatasi Admin ke plant milik akunnya sendiri', () => {
    const scope = resolveOverviewPlantScope({ role: 'Admin', plant_id: 2 }, '9')
    assert.equal(scope.plantId, 9)
  })
})

// ============================================================================
// isDirectTeamMember — penentuan anggota "Tim Pimpinan Saya".
//
// Bug yang dikunci: dulu plant & group digabung dengan `||`, sehingga SEMUA
// teknisi di plant yang sama dianggap tim supervisor. Kasus nyata: SPV `spv.uji`
// (group_id 30001) melihat 95 teknisi di kedua tab, padahal hanya 29 yang
// benar-benar berada di group 30001.
// ============================================================================

describe('isDirectTeamMember — supervisor dengan group (plant 1, group 30001)', () => {
  const supervisor = { role: 'Supervisor', plant_id: 1, group_id: 30001 }
  const scope = { scopedPlantId: 1 }

  it('teknisi dengan group SAMA dihitung tim langsung', () => {
    assert.equal(isDirectTeamMember(supervisor, { plant_id: 1, group_id: 30001 }, scope), true)
  })

  it('teknisi plant sama tapi group BEDA bukan tim langsung', () => {
    assert.equal(isDirectTeamMember(supervisor, { plant_id: 1, group_id: 30002 }, scope), false)
    assert.equal(isDirectTeamMember(supervisor, { plant_id: 1, group_id: null }, scope), false)
  })

  it('teknisi group sama tapi plant BEDA bukan tim langsung (cek plant lebih ketat)', () => {
    assert.equal(isDirectTeamMember(supervisor, { plant_id: 2, group_id: 30001 }, scope), false)
  })

  it('menerima group_id/plant_id bertipe string (BigInt dari Prisma)', () => {
    assert.equal(
      isDirectTeamMember(supervisor, { plant_id: '1', group_id: '30001' }, scope),
      true
    )
  })

  it('menerima group_id bertipe string pada JWT (req.user)', () => {
    assert.equal(
      isDirectTeamMember(
        { plant_id: '1', group_id: '30001' },
        { plant_id: 1, group_id: 30001 },
        scope
      ),
      true
    )
  })

  it('plant_id kosong/null pada teknisi tidak lolos saat SPV punya plant', () => {
    assert.equal(isDirectTeamMember(supervisor, { plant_id: null, group_id: 30001 }, scope), false)
  })
})

describe('isDirectTeamMember — fallback supervisor tanpa group', () => {
  it('memakai plant pada scope overview', () => {
    const supervisor = { role: 'Supervisor', plant_id: 1, group_id: null }
    assert.equal(isDirectTeamMember(supervisor, { plant_id: 1, group_id: 9 }, { scopedPlantId: 1 }), true)
    assert.equal(isDirectTeamMember(supervisor, { plant_id: 2, group_id: 9 }, { scopedPlantId: 1 }), false)
  })

  it('tanpa group & tanpa plant → tidak ada tim langsung (tidak semua orang lolos)', () => {
    assert.equal(isDirectTeamMember({}, { plant_id: 1, group_id: 1 }, { scopedPlantId: null }), false)
  })

  it('Admin (tanpa group) memakai plant terpilih pada scope', () => {
    const admin = { role: 'Admin', plant_id: null, group_id: null }
    assert.equal(isDirectTeamMember(admin, { plant_id: 5, group_id: 1 }, { scopedPlantId: 5 }), true)
    assert.equal(isDirectTeamMember(admin, { plant_id: 6, group_id: 1 }, { scopedPlantId: 5 }), false)
  })
})

describe('isDirectTeamMember — simulasi data lapangan (95 teknisi, 29 di group SPV)', () => {
  const supervisor = { role: 'Supervisor', plant_id: 1, group_id: 30001 }
  const scope = { scopedPlantId: 1 }

  // 29 teknisi di group 30001 + 66 teknisi di grup lain (A, B, C, ...), semua plant 1.
  const technicians = [
    ...Array.from({ length: 29 }, (_, i) => ({ plant_id: 1, group_id: 30001, id: i + 1 })),
    ...Array.from({ length: 66 }, (_, i) => ({
      plant_id: 1,
      group_id: 40000 + i,
      id: 1000 + i
    }))
  ]

  it('tab Tim Saya = 29, tab Seluruh Teknisi Pabrik = 95', () => {
    const directTeam = technicians.filter((t) => isDirectTeamMember(supervisor, t, scope))
    assert.equal(directTeam.length, 29)
    assert.equal(technicians.length, 95)
    assert.equal(directTeam.length !== technicians.length, true)
  })
})
