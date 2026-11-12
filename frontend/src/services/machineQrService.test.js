import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getMachineQrEndpoint,
  getMachineQrData,
  getMachineQrImage,
  clearMachineQrCache
} from './machineQrService'

// ============================================================================
// FASE 5.3 (hotfix) — Cache buster QR Code mesin.
// Regresi: setelah `FRONTEND_URL` backend diubah, browser menyajikan PNG lama
// (QR berisi URL localhost) karena `Cache-Control: private, max-age=3600`.
// Test ini mengunci kontrak: setiap request QR wajib membawa `?t=<timestamp>`
// dan `cache: 'no-store'`, serta `force` melewati cache sesi.
// ============================================================================

let fetchMock
let objectUrlSeq = 0

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    json: async () => payload
  }
}

function blobResponse() {
  return {
    ok: true,
    status: 200,
    blob: async () => new Blob(['fake-png'], { type: 'image/png' })
  }
}

function parseUrl(raw) {
  return new URL(raw, 'http://localhost')
}

class FakeFileReader {
  readAsDataURL() {
    this.result = 'data:image/png;base64,ZmFrZQ=='
    setTimeout(() => {
      if (typeof this.onload === 'function') this.onload()
    }, 0)
  }
}

beforeEach(() => {
  objectUrlSeq = 0
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  }
  globalThis.FileReader = FakeFileReader
  URL.createObjectURL = vi.fn(() => `blob:qr-${++objectUrlSeq}`)
  URL.revokeObjectURL = vi.fn()

  fetchMock = vi.fn()
  globalThis.fetch = fetchMock
})

afterEach(() => {
  clearMachineQrCache()
  vi.restoreAllMocks()
})

describe('getMachineQrEndpoint', () => {
  it('menambahkan query timestamp agar URL tidak diambil dari cache browser', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000123)

    expect(getMachineQrEndpoint(7)).toMatch(/\/machines\/7\/qr\?t=1700000000123$/)
    expect(getMachineQrEndpoint(7, { cacheBust: false })).toMatch(/\/machines\/7\/qr$/)
  })
})

describe('getMachineQrData', () => {
  it('mengirim ?t= + no-store, memakai cache sesi, dan force melewati cache', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000)
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { id: 7, qr_url_string: 'https://baru.example/mesin/7' } })
    )

    const data = await getMachineQrData(7)
    expect(data.qr_url_string).toBe('https://baru.example/mesin/7')

    const [rawUrl, init] = fetchMock.mock.calls[0]
    const url = parseUrl(rawUrl)
    expect(url.pathname).toMatch(/\/machines\/7\/qr-data$/)
    expect(url.searchParams.get('t')).toBe('1000')
    expect(init.cache).toBe('no-store')

    // Panggilan kedua masih cache sesi → tidak ada request baru.
    await getMachineQrData(7)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // force → request baru dengan timestamp baru.
    now.mockReturnValue(2000)
    await getMachineQrData(7, { force: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(parseUrl(fetchMock.mock.calls[1][0]).searchParams.get('t')).toBe('2000')
  })
})

describe('getMachineQrImage', () => {
  it('mengunduh PNG dengan cache buster & melepas object URL lama saat force', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(5000)
    fetchMock.mockResolvedValue(blobResponse())

    const first = await getMachineQrImage(9)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [rawUrl, init] = fetchMock.mock.calls[0]
    const url = parseUrl(rawUrl)
    expect(url.pathname).toMatch(/\/machines\/9\/qr$/)
    expect(url.searchParams.get('t')).toBe('5000')
    expect(init.cache).toBe('no-store')
    expect(first.blobUrl).toBeTruthy()
    expect(first.dataUrl).toContain('data:image/png')

    // Cache sesi dipakai ulang.
    await getMachineQrImage(9)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // force → fetch ulang dengan timestamp baru + object URL lama di-revoke.
    now.mockReturnValue(6000)
    const second = await getMachineQrImage(9, { force: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(parseUrl(fetchMock.mock.calls[1][0]).searchParams.get('t')).toBe('6000')
    expect(second.blobUrl).not.toBe(first.blobUrl)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(first.blobUrl)
  })
})
