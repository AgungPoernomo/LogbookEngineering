import { describe, it, expect } from 'vitest'
import {
  INSPECTION_CHIP,
  isFailureCodeRequired,
  isFailureCodeVisible,
  isInspectionChip
} from './failureCodeVisibility'

// ============================================================================
// Dropdown "Kode Kerusakan" di form Input Logbook (FASE 4.1a / revisi F3.1).
// MACHINE_TROUBLE → selalu tampil & wajib; PREVENTIVE_PM → hanya tampil untuk
// chip "Cek Rutin"; kategori lain → tidak pernah tampil.
// ============================================================================

describe('isInspectionChip', () => {
  it('mengenali chip "Cek Rutin" sebagai inspeksi', () => {
    expect(isInspectionChip('Cek Rutin')).toBe(true)
    expect(isInspectionChip(INSPECTION_CHIP)).toBe(true)
  })

  it('menerima variasi huruf besar/kecil & spasi', () => {
    expect(isInspectionChip('  cek rutin ')).toBe(true)
    expect(isInspectionChip('CEK RUTIN')).toBe(true)
  })

  it('chip perawatan rutin lain bukan inspeksi', () => {
    expect(isInspectionChip('Lubrikasi / Greasing')).toBe(false)
    expect(isInspectionChip('Cleaning Mesin / Area')).toBe(false)
    expect(isInspectionChip('Backwash / Kuras')).toBe(false)
    expect(isInspectionChip('Ganti Part Rusak')).toBe(false)
  })

  it('chip kosong / bukan string bukan inspeksi', () => {
    expect(isInspectionChip('')).toBe(false)
    expect(isInspectionChip('   ')).toBe(false)
    expect(isInspectionChip(null)).toBe(false)
    expect(isInspectionChip(undefined)).toBe(false)
    expect(isInspectionChip(['Cek Rutin'])).toBe(false)
  })
})

describe('isFailureCodeVisible', () => {
  it('MACHINE_TROUBLE selalu menampilkan dropdown (meski chip belum dipilih)', () => {
    expect(isFailureCodeVisible('MACHINE_TROUBLE', '')).toBe(true)
    expect(isFailureCodeVisible('MACHINE_TROUBLE', 'Ganti Part Rusak')).toBe(true)
    expect(isFailureCodeVisible('MACHINE_TROUBLE', 'Cek Rutin')).toBe(true)
  })

  it('PREVENTIVE_PM tanpa chip / chip rutin menyembunyikan dropdown', () => {
    expect(isFailureCodeVisible('PREVENTIVE_PM', '')).toBe(false)
    expect(isFailureCodeVisible('PREVENTIVE_PM', 'Lubrikasi / Greasing')).toBe(false)
    expect(isFailureCodeVisible('PREVENTIVE_PM', 'Cleaning Mesin / Area')).toBe(false)
    expect(isFailureCodeVisible('PREVENTIVE_PM', 'Backwash / Kuras')).toBe(false)
  })

  it('PREVENTIVE_PM + chip "Cek Rutin" menampilkan kembali dropdown', () => {
    expect(isFailureCodeVisible('PREVENTIVE_PM', 'Cek Rutin')).toBe(true)
  })

  it('kategori non-perawatan-mesin tidak pernah menampilkan dropdown', () => {
    expect(isFailureCodeVisible('KERETA_TRAY_REPAIR', 'Ganti Bearing Roda/Tray')).toBe(false)
    expect(isFailureCodeVisible('FABRICATION_PROJECT', 'Pengelasan (Las)')).toBe(false)
    expect(isFailureCodeVisible('SUPPORT_NON_MACHINE', 'Standby Jaga Line')).toBe(false)
    expect(isFailureCodeVisible('SUPPORT_NON_MACHINE', 'Cek Rutin')).toBe(false)
  })

  it('kategori kosong / tak dikenal menyembunyikan dropdown', () => {
    expect(isFailureCodeVisible(null, 'Cek Rutin')).toBe(false)
    expect(isFailureCodeVisible(undefined, '')).toBe(false)
    expect(isFailureCodeVisible('UNKNOWN', 'Cek Rutin')).toBe(false)
  })
})

describe('isFailureCodeRequired', () => {
  it('wajib hanya saat dropdown tampil', () => {
    expect(isFailureCodeRequired('MACHINE_TROUBLE', '')).toBe(true)
    expect(isFailureCodeRequired('PREVENTIVE_PM', 'Cek Rutin')).toBe(true)
    expect(isFailureCodeRequired('PREVENTIVE_PM', 'Lubrikasi / Greasing')).toBe(false)
    expect(isFailureCodeRequired('SUPPORT_NON_MACHINE', 'Standby Jaga Line')).toBe(false)
  })
})
