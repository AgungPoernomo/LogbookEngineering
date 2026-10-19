import multer from 'multer'

// Gunakan MemoryStorage agar buffer file langsung diproses oleh sharp tanpa I/O disk sementara
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    const error = new Error('Format file tidak didukung! Hanya diperbolehkan format gambar JPG, PNG, atau WebP.')
    error.statusCode = 400
    cb(error, false)
  }
}

export const uploadAvatarMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Maksimal 10MB file mentah dari kamera/ponsel pengguna
  },
  fileFilter
})
