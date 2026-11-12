import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  deriveMaintenanceType,
  normalizeMachineEndStatus,
  validateActivityCategory,
  ACTIVITY_CATEGORIES
} from '../src/utils/reliability.js'

// ============================================================================
// FASE 2 - Bagian 4.2: Penurunan maintenance_type (dilakukan backend)
// ============================================================================
describe('Bagian 4.2 - deriveMaintenanceType', () => {
  it('MACHINE_TROUBLE + is_downtime=true => BREAKDOWN', () => {
    assert.equal(
      deriveMaintenanceType({ activity_category: 'MACHINE_TROUBLE', is_downtime: true }),
      'BREAKDOWN'
    )
  })

  it('MACHINE_TROUBLE + is_downtime=false => CORRECTIVE', () => {
    assert.equal(
      deriveMaintenanceType({ activity_category: 'MACHINE_TROUBLE', is_downtime: false }),
      'CORRECTIVE'
    )
  })

  it('PREVENTIVE_PM + chip "Cek Rutin" => INSPECTION', () => {
    assert.equal(
      deriveMaintenanceType({ activity_category: 'PREVENTIVE_PM', quick_action_tag: 'Cek Rutin' }),
      'INSPECTION'
    )
  })

  it('PREVENTIVE_PM + chip lain (Lubrikasi/Cleaning/Backwash) => PREVENTIVE', () => {
    assert.equal(
      deriveMaintenanceType({ activity_category: 'PREVENTIVE_PM', quick_action_tag: 'Lubrikasi' }),
      'PREVENTIVE'
    )
    assert.equal(
      deriveMaintenanceType({ activity_category: 'PREVENTIVE_PM', quick_action_tag: 'Cleaning' }),
      'PREVENTIVE'
    )
    assert.equal(
      deriveMaintenanceType({ activity_category: 'PREVENTIVE_PM', quick_action_tag: 'Backwash' }),
      'PREVENTIVE'
    )
  })

  it('KERETA_TRAY_REPAIR / FABRICATION_PROJECT / SUPPORT_NON_MACHINE => NULL', () => {
    assert.equal(deriveMaintenanceType({ activity_category: 'KERETA_TRAY_REPAIR' }), null)
    assert.equal(deriveMaintenanceType({ activity_category: 'FABRICATION_PROJECT' }), null)
    assert.equal(deriveMaintenanceType({ activity_category: 'SUPPORT_NON_MACHINE' }), null)
  })
})

describe('Bagian 4.3 - normalizeMachineEndStatus', () => {
  it('PREVENTIVE_PM selalu dipaksa NORMAL_RESOLVED', () => {
    assert.equal(normalizeMachineEndStatus('PREVENTIVE_PM', 'WAITING_SPAREPART'), 'NORMAL_RESOLVED')
  })

  it('status valid dipertahankan, status tak dikenal jatuh ke NORMAL_RESOLVED', () => {
    assert.equal(normalizeMachineEndStatus('MACHINE_TROUBLE', 'TEMPORARY_FIX'), 'TEMPORARY_FIX')
    assert.equal(normalizeMachineEndStatus('MACHINE_TROUBLE', 'NGACO'), 'NORMAL_RESOLVED')
    assert.equal(normalizeMachineEndStatus('MACHINE_TROUBLE', undefined), 'NORMAL_RESOLVED')
  })
})

// ============================================================================
// FASE 2 - Bagian 4.3: Validasi server per kategori
// ============================================================================
describe('Bagian 4.3 - validateActivityCategory', () => {
  it('menolak activity_category yang tidak dikenal', () => {
    const res = validateActivityCategory({ activity_category: 'NGACO', quick_action_tag: 'X' })
    assert.equal(res.valid, false)
    assert.match(res.message, /kategori aktivitas/i)
  })

  it('semua kategori wajib mengisi quick_action_tag', () => {
    for (const category of ACTIVITY_CATEGORIES) {
      const res = validateActivityCategory({ activity_category: category, quick_action_tag: '  ' })
      assert.equal(res.valid, false, `kategori ${category} harus menolak tag kosong`)
    }
  })

  it('MACHINE_TROUBLE tanpa mesin/sub-mesin ditolak', () => {
    const res = validateActivityCategory({
      activity_category: 'MACHINE_TROUBLE',
      quick_action_tag: 'Ganti Bearing'
    })
    assert.equal(res.valid, false)
    assert.match(res.message, /mesin/i)
  })

  it('MACHINE_TROUBLE valid + maintenance_type CORRECTIVE (bukan downtime)', () => {
    const res = validateActivityCategory({
      activity_category: 'MACHINE_TROUBLE',
      quick_action_tag: 'Ganti Bearing',
      machine_id: 1,
      sub_machine_id: 2,
      is_downtime: false
    })
    assert.equal(res.valid, true)
    assert.equal(res.data.maintenance_type, 'CORRECTIVE')
    assert.equal(res.data.machine_end_status, 'NORMAL_RESOLVED')
  })

  it('MACHINE_TROUBLE + downtime => BREAKDOWN', () => {
    const res = validateActivityCategory({
      activity_category: 'MACHINE_TROUBLE',
      quick_action_tag: 'Overhaul',
      machine_id: 1,
      sub_machine_id: 2,
      is_downtime: true,
      machine_end_status: 'TEMPORARY_FIX'
    })
    assert.equal(res.valid, true)
    assert.equal(res.data.maintenance_type, 'BREAKDOWN')
    assert.equal(res.data.machine_end_status, 'TEMPORARY_FIX')
  })

  it('MACHINE_TROUBLE boleh tanpa mesin bila unmapped_asset_note terisi (D12)', () => {
    const res = validateActivityCategory({
      activity_category: 'MACHINE_TROUBLE',
      quick_action_tag: 'Cek',
      unmapped_asset_note: 'Mesin belum terdaftar: Blower B3'
    })
    assert.equal(res.valid, true)
    assert.equal(res.data.unmapped_asset_note, 'Mesin belum terdaftar: Blower B3')
  })

  it('PREVENTIVE_PM + "Cek Rutin" => INSPECTION & status dipaksa NORMAL', () => {
    const res = validateActivityCategory({
      activity_category: 'PREVENTIVE_PM',
      quick_action_tag: 'Cek Rutin',
      machine_id: 1,
      sub_machine_id: 2,
      machine_end_status: 'MONITORING_NEEDED'
    })
    assert.equal(res.valid, true)
    assert.equal(res.data.maintenance_type, 'INSPECTION')
    assert.equal(res.data.machine_end_status, 'NORMAL_RESOLVED')
  })

  it('KERETA_TRAY_REPAIR wajib unit_repaired_qty >= 1', () => {
    const invalid = validateActivityCategory({
      activity_category: 'KERETA_TRAY_REPAIR',
      quick_action_tag: 'Las Rangka'
    })
    assert.equal(invalid.valid, false)
    assert.match(invalid.message, /unit/i)

    const valid = validateActivityCategory({
      activity_category: 'KERETA_TRAY_REPAIR',
      quick_action_tag: 'Las Rangka',
      unit_repaired_qty: 3
    })
    assert.equal(valid.valid, true)
    assert.equal(valid.data.unit_repaired_qty, 3)
    assert.equal(valid.data.maintenance_type, null)
  })

  it('SUPPORT_NON_MACHINE dilarang mesin, sub-mesin, dan sparepart', () => {
    const withMachine = validateActivityCategory({
      activity_category: 'SUPPORT_NON_MACHINE',
      quick_action_tag: 'Bersih-bersih',
      machine_id: 1
    })
    assert.equal(withMachine.valid, false)

    const withSparepart = validateActivityCategory({
      activity_category: 'SUPPORT_NON_MACHINE',
      quick_action_tag: 'Bersih-bersih',
      sparepart_items: [{ sparepart_id: 5, qty_used: 2 }]
    })
    assert.equal(withSparepart.valid, false)
    assert.match(withSparepart.message, /sparepart/i)

    const clean = validateActivityCategory({
      activity_category: 'SUPPORT_NON_MACHINE',
      quick_action_tag: 'Bersih-bersih'
    })
    assert.equal(clean.valid, true)
    assert.equal(clean.data.maintenance_type, null)
  })

  it('FABRICATION_PROJECT: mesin opsional & menerima sparepart', () => {
    const res = validateActivityCategory({
      activity_category: 'FABRICATION_PROJECT',
      quick_action_tag: 'Buat jig baru',
      sparepart_items: [{ sparepart_id: 7, qty_used: 1.5 }]
    })
    assert.equal(res.valid, true)
    assert.equal(res.data.maintenance_type, null)
    assert.equal(res.data.sparepart_items.length, 1)
  })
})
