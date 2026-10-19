import sharp from 'sharp'

/**
 * Service pemrosesan citra performa tinggi berbasis libvips (sharp).
 * Mengonversi citra apapun (JPG/PNG/dll.) menjadi WebP teroptimasi dan mengubah dimensi ke ukuran avatar ideal.
 */
export async function processAvatar(buffer, options = {}) {
  const {
    width = 320,
    height = 320,
    quality = 82
  } = options

  const originalMetadata = await sharp(buffer).metadata()
  const originalSize = buffer.length

  // Auto-rotate berdasarkan EXIF (penting untuk foto kamera HP), resize persegi, dan konversi ke WebP
  const processedBuffer = await sharp(buffer)
    .rotate() // Auto-orient berdasarkan EXIF
    .resize(width, height, {
      fit: 'cover',
      position: 'center'
    })
    .webp({
      quality,
      effort: 4 // kompresi optimal tanpa membebani latency CPU berlebih
    })
    .toBuffer()

  const processedSize = processedBuffer.length
  const compressionRatio = ((1 - (processedSize / originalSize)) * 100).toFixed(1)

  return {
    buffer: processedBuffer,
    format: 'webp',
    width,
    height,
    originalSize,
    processedSize,
    compressionRatio: `${compressionRatio}%`,
    originalFormat: originalMetadata.format || 'unknown'
  }
}
