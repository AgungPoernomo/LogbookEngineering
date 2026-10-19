import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOCAL_UPLOADS_DIR = path.resolve(__dirname, '../../public/uploads/avatars')

// Inisialisasi folder upload lokal jika belum ada
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true })
}

/**
 * Mengecek apakah konfigurasi Cloudflare R2 / S3 Object Storage tersedia.
 */
function isCloudStorageConfigured() {
  const hasR2 = Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  )

  const hasS3 = Boolean(
    process.env.S3_ENDPOINT &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET_NAME
  )

  return hasR2 || hasS3
}

/**
 * Membuat S3Client untuk Cloudflare R2 atau S3-compatible Object Storage
 */
function getS3Client() {
  const endpoint = process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : process.env.S3_ENDPOINT

  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY

  return new S3Client({
    region: process.env.R2_REGION || process.env.S3_REGION || 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  })
}

/**
 * Mengunggah file WebP ke Cloudflare R2 (jika terkonfigurasi) atau ke Local Storage (fallback)
 * @param {Object} param
 * @param {Buffer} param.buffer
 * @param {string} param.fileName
 * @param {string} [param.contentType='image/webp']
 * @returns {Promise<string>} URL publik foto yang tersimpan
 */
export async function saveAvatar({ buffer, fileName, contentType = 'image/webp' }) {
  if (isCloudStorageConfigured()) {
    const s3 = getS3Client()
    const bucketName = process.env.R2_BUCKET_NAME || process.env.S3_BUCKET_NAME
    const key = `avatars/${fileName}`

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable'
    })

    await s3.send(command)

    // Bentuk URL publik
    const publicUrlBase = process.env.R2_PUBLIC_URL || process.env.S3_PUBLIC_URL
    if (publicUrlBase) {
      const cleanBase = publicUrlBase.replace(/\/+$/, '')
      return `${cleanBase}/${key}`
    }

    // Jika belum ada public URL custom domain, gunakan format default R2 dev
    return `https://${bucketName}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`
  }

  // Fallback: Local Storage (Cocok untuk development lokal dan preview offline)
  const filePath = path.join(LOCAL_UPLOADS_DIR, fileName)
  await fs.promises.writeFile(filePath, buffer)

  // Kembalikan path relatif yang dapat diakses melalui Express static middleware (/uploads/avatars/...)
  return `/uploads/avatars/${fileName}`
}

/**
 * Menghapus avatar lama jika ada
 * @param {string} photoUrl
 */
export async function removeAvatar(photoUrl) {
  if (!photoUrl) return

  try {
    if (photoUrl.startsWith('/uploads/avatars/')) {
      const fileName = path.basename(photoUrl)
      const filePath = path.join(LOCAL_UPLOADS_DIR, fileName)
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
      }
    } else if (isCloudStorageConfigured() && (photoUrl.includes('.r2.') || photoUrl.includes('/avatars/'))) {
      const s3 = getS3Client()
      const bucketName = process.env.R2_BUCKET_NAME || process.env.S3_BUCKET_NAME
      const key = `avatars/${path.basename(photoUrl)}`

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key
      })
      await s3.send(command)
    }
  } catch (err) {
    console.warn('Gagal menghapus file avatar lama:', err.message)
  }
}
