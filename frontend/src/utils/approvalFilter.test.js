import { describe, it, expect } from 'vitest'
import {
  matchesTechnicianTab,
  canBulkReview,
  getReviewableLogs,
  technicianKey,
  buildTechnicianCards,
  countTechniciansForTab
} from './approvalFilter'
import { LOG_STATUS } from '../constants/logStatus'

// ============================================================================
// Halaman /approval — tab status HARUS sinkron dengan rincian logbook.
// Bug yang dikunci: tab "Perlu Approval" (PENDING) sebelumnya menampilkan
// SELURUH logbook teknisi (termasuk APPROVED/REJECTED) di rincian kartu,
// sehingga "Setujui Semua Log" berisiko menyentuh logbook yang sudah diproses.
// ============================================================================

const log = (id, status, extra = {}) => ({
  id,
  status,
  machine_name: 'Pompa',
  duration_minutes: 30,
  ...extra
})

// Teknisi A: 2 PENDING + 1 APPROVED + 1 REJECTED
const techA = {
  user_id: 1,
  logs: [
    log(101, LOG_STATUS.PENDING),
    log(102, LOG_STATUS.PENDING),
    log(103, LOG_STATUS.APPROVED),
    log(104, LOG_STATUS.REJECTED)
  ]
}

// Teknisi B: hanya APPROVED & REJECTED (tidak punya PENDING)
const techB = {
  user_id: 2,
  logs: [log(201, LOG_STATUS.APPROVED), log(202, LOG_STATUS.REJECTED)]
}

describe('matchesTechnicianTab', () => {
  it('tab PENDING hanya meloloskan logbook PENDING', () => {
    expect(matchesTechnicianTab(log(1, LOG_STATUS.PENDING), LOG_STATUS.PENDING)).toBe(true)
    expect(matchesTechnicianTab(log(2, LOG_STATUS.APPROVED), LOG_STATUS.PENDING)).toBe(false)
    expect(matchesTechnicianTab(log(3, LOG_STATUS.REJECTED), LOG_STATUS.PENDING)).toBe(false)
  })

  it('tab APPROVED hanya meloloskan APPROVED', () => {
    expect(matchesTechnicianTab(log(1, LOG_STATUS.APPROVED), LOG_STATUS.APPROVED)).toBe(true)
    expect(matchesTechnicianTab(log(2, LOG_STATUS.PENDING), LOG_STATUS.APPROVED)).toBe(false)
  })

  it('tab REJECTED hanya meloloskan REJECTED', () => {
    expect(matchesTechnicianTab(log(1, LOG_STATUS.REJECTED), LOG_STATUS.REJECTED)).toBe(true)
    expect(matchesTechnicianTab(log(2, LOG_STATUS.APPROVED), LOG_STATUS.REJECTED)).toBe(false)
  })

  it('tab ALL meloloskan semua status', () => {
    for (const status of [LOG_STATUS.PENDING, LOG_STATUS.APPROVED, LOG_STATUS.REJECTED]) {
      expect(matchesTechnicianTab(log(1, status), 'ALL')).toBe(true)
    }
  })
})
describe('buildTechnicianCards', () => {
  it('tab PENDING: rincian hanya berisi logbook PENDING', () => {
    const cards = buildTechnicianCards([techA, techB], LOG_STATUS.PENDING)
    expect(cards).toHaveLength(1)
    expect(cards[0].user_id).toBe(1)
    expect(cards[0].logs.map((l) => l.status)).toEqual([
      LOG_STATUS.PENDING,
      LOG_STATUS.PENDING
    ])
  })

  it('tab PENDING: kartu teknisi tanpa PENDING dihilangkan (tidak ada kartu kosong)', () => {
    const cards = buildTechnicianCards([techA, techB], LOG_STATUS.PENDING)
    expect(cards.some((c) => c.user_id === 2)).toBe(false)
  })

  it('tab APPROVED: kartu menampilkan hanya logbook APPROVED', () => {
    const cards = buildTechnicianCards([techA, techB], LOG_STATUS.APPROVED)
    expect(cards).toHaveLength(2)
    for (const card of cards) {
      expect(card.logs.every((l) => l.status === LOG_STATUS.APPROVED)).toBe(true)
    }
    expect(cards.find((c) => c.user_id === 1).logs.map((l) => l.id)).toEqual([103])
  })

  it('tab REJECTED: kartu menampilkan hanya logbook REJECTED', () => {
    const cards = buildTechnicianCards([techA, techB], LOG_STATUS.REJECTED)
    expect(cards).toHaveLength(2)
    for (const card of cards) {
      expect(card.logs.every((l) => l.status === LOG_STATUS.REJECTED)).toBe(true)
    }
  })

  it('tab ALL: seluruh logbook tampil', () => {
    const cards = buildTechnicianCards([techA, techB], 'ALL')
    expect(cards).toHaveLength(2)
    expect(cards.find((c) => c.user_id === 1).logs).toHaveLength(4)
  })

  it('metrik ringkas mengikuti logbook yang tampil (bukan seluruh riwayat)', () => {
    const cards = buildTechnicianCards([techA], LOG_STATUS.PENDING)
    expect(cards[0].visibleLogCount).toBe(2)
    expect(cards[0].visibleDurationMinutes).toBe(60)
  })

  it('tidak memutasi objek teknisi sumber', () => {
    buildTechnicianCards([techA], LOG_STATUS.PENDING)
    expect(techA.logs).toHaveLength(4)
  })
})

describe('bulk action (Setujui / Tolak semua log)', () => {
  it('canBulkReview hanya aktif pada tab PENDING & ALL', () => {
    expect(canBulkReview(LOG_STATUS.PENDING)).toBe(true)
    expect(canBulkReview('ALL')).toBe(true)
    expect(canBulkReview(LOG_STATUS.APPROVED)).toBe(false)
    expect(canBulkReview(LOG_STATUS.REJECTED)).toBe(false)
  })

  it('mengirim hanya logbook PENDING pada tab PENDING', () => {
    const target = getReviewableLogs(techA.logs, LOG_STATUS.PENDING)
    expect(target.map((l) => l.id)).toEqual([101, 102])
    expect(target.every((l) => l.status === LOG_STATUS.PENDING)).toBe(true)
  })

  it('tidak mengirim apa pun pada tab riwayat (APPROVED / REJECTED)', () => {
    expect(getReviewableLogs(techA.logs, LOG_STATUS.APPROVED)).toEqual([])
    expect(getReviewableLogs(techA.logs, LOG_STATUS.REJECTED)).toEqual([])
  })

  it('reviewableCount pada kartu = jumlah PENDING yang tampil', () => {
    const [card] = buildTechnicianCards([techA], LOG_STATUS.PENDING)
    expect(card.reviewableCount).toBe(2)
    expect(card.reviewableLogs.map((l) => l.id)).toEqual([101, 102])
  })
})

describe('countTechniciansForTab', () => {
  it('PENDING = jumlah teknisi yang punya PENDING (1)', () => {
    expect(countTechniciansForTab([techA, techB], LOG_STATUS.PENDING)).toBe(1)
  })

  it('APPROVED / REJECTED menghitung teknisi yang punya status tsb (2)', () => {
    expect(countTechniciansForTab([techA, techB], LOG_STATUS.APPROVED)).toBe(2)
    expect(countTechniciansForTab([techA, techB], LOG_STATUS.REJECTED)).toBe(2)
  })

  it('ALL = seluruh teknisi unik (2)', () => {
    expect(countTechniciansForTab([techA, techB], 'ALL')).toBe(2)
  })

  it('badge tab selalu sama dengan jumlah kartu yang dirender', () => {
    const techs = [techA, techB]
    for (const tab of [LOG_STATUS.PENDING, LOG_STATUS.APPROVED, LOG_STATUS.REJECTED, 'ALL']) {
      expect(countTechniciansForTab(techs, tab)).toBe(
        buildTechnicianCards(techs, tab).length
      )
    }
  })
})

describe('technicianKey', () => {
  it('memakai fallback berurutan user_id -> nik -> nama', () => {
    expect(technicianKey({ user_id: 7 })).toBe(7)
    expect(technicianKey({ user_nik: 'NIK1' })).toBe('NIK1')
    expect(technicianKey({ user_name: 'Budi' })).toBe('Budi')
    expect(technicianKey({})).toBe('unknown')
  })
})

