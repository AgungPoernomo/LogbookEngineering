import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveHandoverPlantScope } from '../src/utils/handoverScope.js'

// ============================================================================
// FASE 4.1b — Antrean Handover Supervisor
// Memastikan `GET /api/v1/handover` TIDAK membocorkan data lintas Line:
//   - Supervisor selalu ter-scope ke `plant_id` JWT (tidak bisa override via query)
//   - Teknisi  selalu ter-scope ke `plant_id` JWT
//   - Admin    bebas lintas Line (query `plant_id` / `ALL`)
// ============================================================================
describe('F4.1b - resolveHandoverPlantScope: Supervisor dikunci ke Line-nya', () => {
  it('Supervisor plant 1 tanpa query => plantId 1', () => {
    const { plantId, isAdmin } = resolveHandoverPlantScope(
      { role: 'Supervisor', plant_id: 1 },
      {}
    )
    assert.equal(plantId, 1)
    assert.equal(isAdmin, false)
  })

  it('Supervisor plant 1 TIDAK boleh override ke plant 2 lewat ?plant_id=2', () => {
    const { plantId } = resolveHandoverPlantScope(
      { role: 'Supervisor', plant_id: 1 },
      { plant_id: '2' }
    )
    assert.equal(plantId, 1, 'Supervisor harus tetap di Line miliknya')
  })

  it('Supervisor plant 1 TIDAK boleh membuka semua Line lewat ?plant_id=ALL', () => {
    const { plantId } = resolveHandoverPlantScope(
      { role: 'Supervisor', plant_id: 1 },
      { plant_id: 'ALL' }
    )
    assert.equal(plantId, 1, 'ALL hanya berlaku untuk Admin')
  })

  it('Supervisor tanpa plant_id => plantId null (hasil kosong, bukan error)', () => {
    const { plantId, isAdmin } = resolveHandoverPlantScope(
      { role: 'Supervisor', plant_id: null },
      {}
    )
    assert.equal(plantId, null)
    assert.equal(isAdmin, false)
  })

  it('plant_id JWT berupa string (hasil decode) tetap dipertahankan', () => {
    const { plantId } = resolveHandoverPlantScope(
      { role: 'Supervisor', plant_id: '3' },
      { plant_id: '4' }
    )
    assert.equal(plantId, '3')
  })
})

describe('F4.1b - resolveHandoverPlantScope: Teknisi dikunci ke Line-nya', () => {
  it('Teknisi plant 2 => plantId 2 walau query plant lain', () => {
    const { plantId } = resolveHandoverPlantScope(
      { role: 'Teknisi', plant_id: 2 },
      { plant_id: '1' }
    )
    assert.equal(plantId, 2)
  })

  it('Teknisi tanpa plant => null', () => {
    const { plantId } = resolveHandoverPlantScope({ role: 'Teknisi', plant_id: null }, {})
    assert.equal(plantId, null)
  })
})

describe('F4.1b - resolveHandoverPlantScope: Admin lintas Line', () => {
  it('Admin tanpa query => null (semua Line)', () => {
    const { plantId, isAdmin } = resolveHandoverPlantScope(
      { role: 'Admin', plant_id: null },
      {}
    )
    assert.equal(plantId, null)
    assert.equal(isAdmin, true)
  })

  it('Admin + ?plant_id=ALL => null (semua Line)', () => {
    const { plantId } = resolveHandoverPlantScope({ role: 'Admin', plant_id: null }, { plant_id: 'ALL' })
    assert.equal(plantId, null)
  })

  it('Admin + ?plant_id=2 => 2 (filter Line tertentu)', () => {
    const { plantId } = resolveHandoverPlantScope({ role: 'Admin', plant_id: null }, { plant_id: '2' })
    assert.equal(plantId, '2')
  })

  it('Admin punya plant_id di JWT tapi tanpa query => tetap semua Line', () => {
    const { plantId } = resolveHandoverPlantScope({ role: 'Admin', plant_id: 1 }, {})
    assert.equal(plantId, null)
  })
})

describe('F4.1b - resolveHandoverPlantScope: input tidak lengkap', () => {
  it('req.user kosong tidak melempar error', () => {
    const { plantId, isAdmin } = resolveHandoverPlantScope(undefined, undefined)
    assert.equal(plantId, null)
    assert.equal(isAdmin, false)
  })

  it('req.query kosong tidak melempar error', () => {
    const { plantId } = resolveHandoverPlantScope({ role: 'Supervisor', plant_id: 1 })
    assert.equal(plantId, 1)
  })

  it('plant_id 0 / string kosong dianggap tidak ada plant', () => {
    assert.equal(resolveHandoverPlantScope({ role: 'Supervisor', plant_id: 0 }, {}).plantId, null)
    assert.equal(resolveHandoverPlantScope({ role: 'Supervisor', plant_id: '' }, {}).plantId, null)
  })
})
