import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  QR_IMAGE_SIZE,
  QR_MARGIN,
  QR_ERROR_CORRECTION_LEVEL,
  DEFAULT_FRONTEND_URL,
  normalizeFrontendUrl,
  buildMachinePublicUrl,
  buildQrOptions,
  buildQrFilename,
  parseMachineId,
  mapMachineQrData,
  renderQrPng
} from '../src/controllers/machineQrController.js'

// ============================================================================
// FASE 5.3 — Generator QR Code Mesin (Admin).
// Pengujian MURNI (tanpa database): mengunci kontrak isi QR (URL absolut
// `/mesin/:id`), parameter gambar (300x300, margin 2, ECC M), parsing id,
// mapping payload `qr-data`, dan signature PNG hasil generator.
// ============================================================================

describe('Fase 5.3 - normalizeFrontendUrl', () => {
  it('membuang garis miring di akhir URL', () => {
    assert.equal(normalizeFrontendUrl('https://logbook.satoria.co.id/'), 'https://logbook.satoria.co.id')
    assert.equal(normalizeFrontendUrl('  https://logbook.satoria.co.id//  '), 'https://logbook.satoria.co.id')
  })

  it('fallback ke localhost:5173 bila kosong / bukan string', () => {
    assert.equal(normalizeFrontendUrl(''), DEFAULT_FRONTEND_URL)
    assert.equal(normalizeFrontendUrl('   '), DEFAULT_FRONTEND_URL)
    assert.equal(normalizeFrontendUrl(undefined), DEFAULT_FRONTEND_URL)
    assert.equal(normalizeFrontendUrl(null), DEFAULT_FRONTEND_URL)
    assert.equal(DEFAULT_FRONTEND_URL, 'http://localhost:5173')
  })
})

describe('Fase 5.3 - buildMachinePublicUrl', () => {
  it('menyusun URL Buku Pintar Mesin (default FRONTEND_URL)', () => {
    assert.equal(buildMachinePublicUrl(12, undefined), 'http://localhost:5173/mesin/12')
  })

  it('memakai FRONTEND_URL kustom tanpa garis miring ganda', () => {
    assert.equal(
      buildMachinePublicUrl(7n, 'https://logbook.satoria.co.id/'),
      'https://logbook.satoria.co.id/mesin/7'
    )
  })
})

describe('Fase 5.3 - buildQrOptions', () => {
  it('sesuai spesifikasi: 300x300 px, margin 2, error correction M', () => {
    assert.deepEqual(buildQrOptions(), {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M'
    })
    assert.equal(QR_IMAGE_SIZE, 300)
    assert.equal(QR_MARGIN, 2)
    assert.equal(QR_ERROR_CORRECTION_LEVEL, 'M')
  })
})

describe('Fase 5.3 - parseMachineId', () => {
  it('menerima bilangan bulat positif dan mengubahnya ke BigInt', () => {
    assert.equal(parseMachineId('12'), 12n)
    assert.equal(parseMachineId(5), 5n)
  })

  it('menolak id tidak valid', () => {
    assert.equal(parseMachineId('abc'), null)
    assert.equal(parseMachineId('0'), null)
    assert.equal(parseMachineId('-3'), null)
    assert.equal(parseMachineId('1.5'), null)
    assert.equal(parseMachineId(undefined), null)
  })
})

describe('Fase 5.3 - mapMachineQrData', () => {
  const record = {
    id: 42n,
    name: 'Filling Machine 2',
    plant_id: 3n,
    plant: { id: 3n, name: 'Line 3' },
    subMachines: [{ id: 9n, name: 'Nozzle' }, { id: 10n, name: 'Conveyor' }]
  }

  it('mengubah BigInt ke Number & menyusun string QR', () => {
    const mapped = mapMachineQrData(record, 'http://localhost:5173')
    assert.deepEqual(mapped, {
      id: 42,
      name: 'Filling Machine 2',
      plant_id: 3,
      plant_name: 'Line 3',
      sub_machines: [
        { id: 9, name: 'Nozzle' },
        { id: 10, name: 'Conveyor' }
      ],
      qr_url_string: 'http://localhost:5173/mesin/42'
    })
    assert.equal(typeof mapped.id, 'number')
  })

  it('tahan record tanpa plant / sub-mesin', () => {
    const mapped = mapMachineQrData({ id: 1n, name: 'Mesin Baru', plant_id: null }, 'http://localhost:5173')
    assert.equal(mapped.plant_id, null)
    assert.equal(mapped.plant_name, 'Belum ditentukan')
    assert.deepEqual(mapped.sub_machines, [])
  })

  it('record kosong → null', () => {
    assert.equal(mapMachineQrData(null), null)
    assert.equal(mapMachineQrData(undefined), null)
  })
})

describe('Fase 5.3 - buildQrFilename', () => {
  it('membentuk nama file aman dari nama mesin', () => {
    assert.equal(
      buildQrFilename({ id: 42n, name: 'Filling Machine #2 (Line 1)' }),
      'qr-mesin-42-filling-machine-2-line-1.png'
    )
  })

  it('nama mesin kosong tetap menghasilkan nama file valid', () => {
    assert.equal(buildQrFilename({ id: 7n, name: '   ' }), 'qr-mesin-7-mesin.png')
  })
})

describe('Fase 5.3 - renderQrPng', () => {
  it('menghasilkan buffer PNG yang valid', async () => {
    const png = await renderQrPng('http://localhost:5173/mesin/1')
    assert.ok(Buffer.isBuffer(png))
    // Signature PNG 8 byte pertama.
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  })
})
