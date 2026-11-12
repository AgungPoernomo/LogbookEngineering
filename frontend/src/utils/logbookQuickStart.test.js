import { describe, it, expect } from 'vitest'
import {
  ACTIVITY_CATEGORIES,
  buildMachineQuickStartRoute,
  isTechnicianRole,
  parseMachineId,
  resolveAutoSubMachineId,
  resolveQueryMachine,
  resolveQuerySubMachine,
  resolveQuickStartCategory
} from './logbookQuickStart'

// ============================================================================
// TODO H1 — Tombol "Catat Logbook untuk Mesin Ini" + auto-pre-fill form.
// Mengunci kontrak query `/logbook/input?machine=<id>&task_type=MACHINE_TROUBLE`
// agar flow "scan QR → Buku Pintar → catat logbook" tidak putus diam-diam.
// ============================================================================

const MACHINES = [
  { id: 1, name: 'Autoclave 1', plant_id: 10 },
  { id: 2, name: 'Filling Line 2', plant_id: 20 },
  { id: 3, name: 'Mesin Tanpa Line', plant_id: null },
  { id: 4, name: 'Conveyor 4', plant_id: '20' }
]

const SUB_MACHINES = [
  { id: 7, machine_id: 1, name: 'Door Autoclave' },
  { id: 8, machine_id: 2, name: 'Nozzle Filling' }
]

describe('isTechnicianRole', () => {
  it('hanya mengizinkan Teknisi mengisi logbook', () => {
    expect(isTechnicianRole('Teknisi')).toBe(true)
    expect(isTechnicianRole('Supervisor')).toBe(false)
    expect(isTechnicianRole('Admin')).toBe(false)
    expect(isTechnicianRole(null)).toBe(false)
  })
})

describe('parseMachineId', () => {
  it('menerima angka dan string ID positif', () => {
    expect(parseMachineId(12)).toBe(12)
    expect(parseMachineId('12')).toBe(12)
    expect(parseMachineId(['9'])).toBe(9)
  })

  it('menolak nilai kosong, nol, negatif, desimal, dan teks', () => {
    expect(parseMachineId(undefined)).toBeNull()
    expect(parseMachineId(null)).toBeNull()
    expect(parseMachineId('')).toBeNull()
    expect(parseMachineId(0)).toBeNull()
    expect(parseMachineId('-3')).toBeNull()
    expect(parseMachineId('1.5')).toBeNull()
    expect(parseMachineId('abc')).toBeNull()
  })
})

describe('resolveQuickStartCategory', () => {
  it('memetakan task_type ke kategori aktivitas yang valid', () => {
    expect(resolveQuickStartCategory('MACHINE_TROUBLE')).toBe('MACHINE_TROUBLE')
    expect(resolveQuickStartCategory('preventive_pm')).toBe('PREVENTIVE_PM')
    expect(resolveQuickStartCategory(['kereta_tray_repair'])).toBe('KERETA_TRAY_REPAIR')
  })

  it('jatuh ke MACHINE_TROUBLE bila kosong atau tak dikenal', () => {
    expect(resolveQuickStartCategory(undefined)).toBe('MACHINE_TROUBLE')
    expect(resolveQuickStartCategory('')).toBe('MACHINE_TROUBLE')
    expect(resolveQuickStartCategory('SOMETHING_ELSE')).toBe('MACHINE_TROUBLE')
    expect(ACTIVITY_CATEGORIES).toContain(resolveQuickStartCategory('SOMETHING_ELSE'))
  })
})


describe('resolveQueryMachine', () => {
  it('empty bila tidak ada param machine', () => {
    expect(resolveQueryMachine(undefined, MACHINES, 10).status).toBe('empty')
    expect(resolveQueryMachine('', MACHINES, 10).status).toBe('empty')
  })

  it('invalid bila param bukan ID valid', () => {
    const result = resolveQueryMachine('abc', MACHINES, 10)
    expect(result.status).toBe('invalid')
    expect(result.machineId).toBeNull()
    expect(result.message).toMatch(/tidak valid/i)
  })

  it('pending saat master mesin belum termuat', () => {
    const result = resolveQueryMachine('1', [], 10)
    expect(result.status).toBe('pending')
    expect(result.machineId).toBe(1)
  })

  it('applied untuk mesin pada Line milik user', () => {
    const result = resolveQueryMachine('1', MACHINES, 10)
    expect(result.status).toBe('applied')
    expect(result.machineId).toBe(1)
    expect(result.plantId).toBe(10)
    expect(result.machine.name).toBe('Autoclave 1')
    expect(result.message).toBe('')
  })

  it('membandingkan Line secara numerik (plant_id string dari API)', () => {
    expect(resolveQueryMachine('4', MACHINES, 20).status).toBe('applied')
  })

  it('denied bila mesin milik Line lain (param diabaikan, ada pesan)', () => {
    const result = resolveQueryMachine('2', MACHINES, 10)
    expect(result.status).toBe('denied')
    expect(result.machineId).toBeNull()
    expect(result.plantId).toBe(20)
    expect(result.message).toMatch(/Line lain/i)
  })

  it('applied bila mesin tidak punya Line (dianggap milik semua Line)', () => {
    const result = resolveQueryMachine('3', MACHINES, 10)
    expect(result.status).toBe('applied')
    expect(result.machineId).toBe(3)
  })

  it('unknown bila ID tidak ada pada master mesin', () => {
    const result = resolveQueryMachine('99', MACHINES, 10)
    expect(result.status).toBe('unknown')
    expect(result.machineId).toBeNull()
    expect(result.message).toMatch(/tidak ditemukan/i)
  })
})

describe('resolveQuerySubMachine', () => {
  it('menerapkan sub-mesin yang memang milik mesin terpilih', () => {
    expect(resolveQuerySubMachine('7', 1, SUB_MACHINES)).toEqual({
      subMachineId: 7,
      applied: true
    })
  })

  it('menolak sub-mesin milik mesin lain', () => {
    expect(resolveQuerySubMachine('8', 1, SUB_MACHINES)).toEqual({
      subMachineId: null,
      applied: false
    })
  })

  it('menolak bila mesin belum terpilih atau sub tidak valid', () => {
    expect(resolveQuerySubMachine('7', null, SUB_MACHINES).subMachineId).toBeNull()
    expect(resolveQuerySubMachine('abc', 1, SUB_MACHINES).subMachineId).toBeNull()
    expect(resolveQuerySubMachine(undefined, 1, SUB_MACHINES).subMachineId).toBeNull()
  })
})

// ============================================================================
// Auto-select sub-mesin: mesin dengan TEPAT satu bagian langsung mengisi
// `form.sub_machine_id` agar teknisi tidak lupa memilih (sub-mesin wajib).
// ============================================================================
describe('resolveAutoSubMachineId', () => {
  const oneSubMachine = [{ id: 7, machine_id: 1, name: 'Door Autoclave' }]
  const manySubMachines = [
    { id: 7, machine_id: 1, name: 'Door Autoclave' },
    { id: 9, machine_id: 1, name: 'Panel Kontrol' },
    { id: 8, machine_id: 2, name: 'Nozzle Filling' }
  ]

  it('mengembalikan ID sub-mesin bila mesin hanya punya satu bagian', () => {
    expect(resolveAutoSubMachineId(1, oneSubMachine)).toBe(7)
    expect(resolveAutoSubMachineId('1', oneSubMachine)).toBe(7)
  })

  it('tidak memilih otomatis bila bagian mesin lebih dari satu', () => {
    expect(resolveAutoSubMachineId(1, manySubMachines)).toBeNull()
  })

  it('mengabaikan sub-mesin milik mesin lain', () => {
    expect(resolveAutoSubMachineId(2, manySubMachines)).toBe(8)
    expect(resolveAutoSubMachineId(3, manySubMachines)).toBeNull()
  })

  it('mengembalikan null untuk mesin kosong/tidak valid', () => {
    expect(resolveAutoSubMachineId(null, oneSubMachine)).toBeNull()
    expect(resolveAutoSubMachineId(0, oneSubMachine)).toBeNull()
    expect(resolveAutoSubMachineId('abc', oneSubMachine)).toBeNull()
    expect(resolveAutoSubMachineId(1)).toBeNull()
  })

  it('tidak memilih otomatis bila sub-mesin belum termuat di master', () => {
    expect(resolveAutoSubMachineId(1, [])).toBeNull()
  })
})

describe('buildMachineQuickStartRoute', () => {
  it('menyusun URL form logbook dengan mesin & kategori default', () => {
    expect(buildMachineQuickStartRoute(12)).toEqual({
      path: '/logbook/input',
      query: { machine: '12', task_type: 'MACHINE_TROUBLE' }
    })
  })

  it('menyertakan sub-mesin bila diberikan', () => {
    expect(buildMachineQuickStartRoute('12', { sub: 7, task_type: 'PREVENTIVE_PM' })).toEqual({
      path: '/logbook/input',
      query: { machine: '12', task_type: 'PREVENTIVE_PM', sub: '7' }
    })
  })

  it('menormalkan task_type tak dikenal ke MACHINE_TROUBLE', () => {
    expect(buildMachineQuickStartRoute(3, { task_type: 'UNKNOWN' }).query.task_type).toBe(
      'MACHINE_TROUBLE'
    )
  })

  it('melempar error untuk ID mesin tidak valid', () => {
    expect(() => buildMachineQuickStartRoute(null)).toThrow(/tidak valid/i)
    expect(() => buildMachineQuickStartRoute(0)).toThrow(/tidak valid/i)
  })
})
