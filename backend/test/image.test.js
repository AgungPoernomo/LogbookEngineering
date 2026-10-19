import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { processAvatar } from '../src/services/imageService.js'

test('Image Service: Mengonversi citra mentah ke WebP dan meresize ke dimensi 320x320', async () => {
  // Buat sample gambar JPEG berukuran 800x600 di memori
  const sampleJpeg = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 37, g: 99, b: 235 }
    }
  })
  .jpeg({ quality: 90 })
  .toBuffer()

  assert.ok(sampleJpeg.length > 0)

  // Proses melalui imageService
  const result = await processAvatar(sampleJpeg, { width: 320, height: 320, quality: 80 })

  assert.equal(result.format, 'webp')
  assert.equal(result.width, 320)
  assert.equal(result.height, 320)
  assert.ok(result.processedSize > 0)
  assert.ok(result.processedSize <= result.originalSize)

  // Verifikasi metadata hasil WebP menggunakan sharp
  const metadata = await sharp(result.buffer).metadata()
  assert.equal(metadata.format, 'webp')
  assert.equal(metadata.width, 320)
  assert.equal(metadata.height, 320)
})
