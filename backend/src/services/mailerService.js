import nodemailer from 'nodemailer'
import prisma from '../config/prisma.js'

const isSmtpEnabled = process.env.SMTP_ENABLED === 'true'

let transporter = null
if (isSmtpEnabled) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })
}

/**
 * Mengirim notifikasi email dan menyimpan catatan ke tabel notifications
 */
export async function sendNotification({
  userId,
  logbookId = null,
  type,
  recipientEmail,
  subject,
  message,
  channel = 'INAPP'
}) {
  let status = 'SENT'
  let errorMessage = null

  if (channel === 'EMAIL' && isSmtpEnabled && transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Engineer Logbook Satoria" <noreply@satoria.co.id>',
        to: recipientEmail,
        subject,
        text: message,
        html: `<div style="font-family: sans-serif; padding: 20px; color: #111827;">
          <h2 style="color: #2563EB;">Engineer Logbook Satoria</h2>
          <p>${message}</p>
          <hr style="border: 0; border-top: 1px solid #E6E9F0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #6B7280;">Ini adalah notifikasi otomatis sistem. Mohon tidak membalas email ini.</p>
        </div>`
      })
    } catch (err) {
      console.error('[MAILER ERROR]:', err.message)
      status = 'FAILED'
      errorMessage = err.message
    }
  } else if (channel === 'EMAIL') {
    // Mode simulasi/development jika SMTP belum aktif
    console.log(`[SIMULASI EMAIL NOTIFIKASI ke ${recipientEmail}]: ${subject} - ${message}`)
  }

  // Simpan record ke tabel notifications (In-App notification tracking)
  try {
    const notification = await prisma.notification.create({
      data: {
        user_id: BigInt(userId),
        logbook_id: logbookId ? BigInt(logbookId) : null,
        type,
        channel,
        recipient_email: recipientEmail,
        subject,
        message,
        status,
        error_message: errorMessage,
        sent_at: new Date()
      }
    })
    return notification
  } catch (err) {
    console.error('[NOTIFICATION DB LOG ERROR]:', err.message)
    return null
  }
}
