import { describe, it, expect } from 'vitest'
import {
  filterTechniciansByScope,
  countTechniciansByScope,
  SCOPE_MY_TEAM,
  SCOPE_ALL
} from './technicianScope'

// ============================================================================
// Halaman /supervisor/teknisi — tab "Tim Pimpinan Saya" vs "Seluruh Teknisi Pabrik".
//
// Bug yang dikunci: kedua tab menampilkan jumlah teknisi yang sama (95) karena
// backend lama memakai `plant SAMA || group SAMA`. Setelah perbaikan, tabel
// pengujian ini memastikan tab Tim Saya HANYA memuat `isDirectTeam === true`
// dan tab Seluruh Teknisi memuat semua baris API.
// ============================================================================

// SPV group 30001 (NON GROUP): 29 teknisi di group sama, 66 teknisi grup lain,
// seluruhnya berada di plant yang sama → total 95.
const tech = (id, groupId, isDirectTeam) => ({
  id,
  full_name: `Teknisi ${id}`,
  group_id: groupId,
  isDirectTeam
})

const technicians = [
  ...Array.from({ length: 29 }, (_, i) => tech(i + 1, 30001, true)),
  ...Array.from({ length: 66 }, (_, i) => tech(1000 + i, 40000 + i, false))
]

describe('filterTechniciansByScope', () => {
  it('tab "Tim Pimpinan Saya" hanya memuat isDirectTeam === true', () => {
    const list = filterTechniciansByScope(technicians, SCOPE_MY_TEAM)
    expect(list).toHaveLength(29)
    expect(list.every((t) => t.isDirectTeam === true)).toBe(true)
  })

  it('tab "Seluruh Teknisi Pabrik" memuat semua teknisi dari API (95)', () => {
    const list = filterTechniciansByScope(technicians, SCOPE_ALL)
    expect(list).toHaveLength(95)
    expect(list).toHaveLength(technicians.length)
  })

  it('kedua tab tidak lagi menampilkan jumlah yang sama', () => {
    expect(countTechniciansByScope(technicians, SCOPE_MY_TEAM)).toBe(29)
    expect(countTechniciansByScope(technicians, SCOPE_ALL)).toBe(95)
    expect(countTechniciansByScope(technicians, SCOPE_MY_TEAM)).not.toBe(
      countTechniciansByScope(technicians, SCOPE_ALL)
    )
  })

  it('mengabaikan flag truthy non-boolean (strict === true)', () => {
    const mix = [
      { id: 1, isDirectTeam: true },
      { id: 2, isDirectTeam: 'true' },
      { id: 3, isDirectTeam: 1 },
      { id: 4, isDirectTeam: undefined },
      { id: 5 }
    ]
    expect(filterTechniciansByScope(mix, SCOPE_MY_TEAM).map((t) => t.id)).toEqual([1])
  })

  it('tidak memutasi array sumber', () => {
    const source = [...technicians]
    filterTechniciansByScope(source, SCOPE_MY_TEAM)
    expect(source).toHaveLength(95)
  })

  it('aman untuk input yang tidak valid', () => {
    expect(filterTechniciansByScope(undefined, SCOPE_MY_TEAM)).toEqual([])
    expect(filterTechniciansByScope(null, SCOPE_ALL)).toEqual([])
    expect(countTechniciansByScope(null, SCOPE_ALL)).toBe(0)
  })
})

describe('countTechniciansByScope', () => {
  it('badge tab sama dengan jumlah baris yang dirender', () => {
    for (const scope of [SCOPE_MY_TEAM, SCOPE_ALL]) {
      expect(countTechniciansByScope(technicians, scope)).toBe(
        filterTechniciansByScope(technicians, scope).length
      )
    }
  })

  it('empty state (0 teknisi) tetap konsisten', () => {
    expect(countTechniciansByScope([], SCOPE_MY_TEAM)).toBe(0)
    expect(countTechniciansByScope([], SCOPE_ALL)).toBe(0)
  })
})
