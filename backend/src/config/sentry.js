import * as Sentry from '@sentry/node'

/**
 * Inisialisasi Sentry Error Monitoring untuk Express Backend
 * Mendukung Tier Gratis Sentry (10.000 error events / bulan)
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN

  if (!dsn) {
    // Sentry dinonaktifkan secara otomatis jika SENTRY_DSN belum diisi
    return false
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    debug: false
  })

  console.log('[Sentry] Error monitoring berhasil diinisialisasi.')
  return true
}

/**
 * Tangkap exception dan kirimkan ke dashboard Sentry
 */
export function captureException(err, context = {}) {
  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context.user) scope.setUser(context.user)
      if (context.tags) {
        for (const [k, v] of Object.entries(context.tags)) {
          scope.setTag(k, v)
        }
      }
      if (context.extra) scope.setExtras(context.extra)
      Sentry.captureException(err)
    })
  }
}

export default Sentry
