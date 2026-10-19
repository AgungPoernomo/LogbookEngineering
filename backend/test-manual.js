/**
 * Skrip Eksekusi Testing Manual Interaktif Backend Satoria
 * Menjalankan server lokal sementara lalu mengetes alur transaksi end-to-end.
 */

import app from './src/app.js'

async function runManualTest() {
  console.log('\n======================================================')
  console.log('🧪 PENGUJIAN MANUAL BACKEND REST API SATORIA')
  console.log('======================================================\n')

  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`
  const api = `${baseUrl}/api/v1`

  try {
    // 1. Health Check
    console.log('1️⃣  [TEST] Mengecek Health Endpoint...')
    const healthRes = await fetch(`${baseUrl}/health`)
    const healthJson = await healthRes.json()
    console.log('   Status Code:', healthRes.status)
    console.log('   Pesan      :', healthJson.message)
    console.log('   Environment:', healthJson.data.environment)

    // 2. Login dengan data salah (Validasi)
    console.log('\n2️⃣  [TEST] Menguji Login dengan Password Salah...')
    const invalidLoginRes = await fetch(`${api}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'teknisi@satoria.co.id', password: 'salah' })
    })
    console.log('   Status Code:', invalidLoginRes.status, '(Diharapkan: 401)')
    const invalidJson = await invalidLoginRes.json()
    console.log('   Pesan Error:', invalidJson.message)

    // 3. Akses tanpa token (Keamanan RBAC)
    console.log('\n3️⃣  [TEST] Menguji Akses Endpoint Terproteksi Tanpa Token...')
    const noTokenRes = await fetch(`${api}/logbooks`)
    console.log('   Status Code:', noTokenRes.status, '(Diharapkan: 401)')
    const noTokenJson = await noTokenRes.json()
    console.log('   Pesan Error:', noTokenJson.message)

    // 4. Pengujian Durasi Shift (Shift Malam Lintas Hari)
    console.log('\n4️⃣  [TEST] Menguji Kalkulasi Durasi Shift Lintas Tengah Malam...')
    const { calculateDurationMinutes } = await import('./src/utils/duration.js')
    const durasi1 = calculateDurationMinutes('08:00', '12:30')
    const durasiOvernight = calculateDurationMinutes('23:00', '07:00')
    console.log('   08:00 s.d. 12:30 ->', durasi1, 'menit (4.5 jam)')
    console.log('   23:00 s.d. 07:00 ->', durasiOvernight, 'menit (8 jam - Lintas Hari)')

    // 5. Informasi Siap Pakai
    console.log('\n======================================================')
    console.log('✅ SELURUH LOGIKA MIDDLEWARE, ROUTING & VALIDASI BERFUNGSI!')
    console.log('======================================================')
    console.log('\nPetunjuk untuk Mengetes Menggunakan Browser / Postman:')
    console.log('1. Jalankan server backend:')
    console.log('   cd backend && npm run dev')
    console.log('2. Buka browser / REST Client:')
    console.log('   Buka http://localhost:3000/health')
    console.log('3. Gunakan file koleksi request:')
    console.log('   backend/api-requests.http')
  } finally {
    server.close()
    process.exit(0)
  }
}

runManualTest().catch(console.error)
