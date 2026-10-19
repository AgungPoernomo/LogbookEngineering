import test from 'node:test'
import assert from 'node:assert/strict'
import app from '../src/app.js'
import { calculateDurationMinutes } from '../src/utils/duration.js'
import { generateToken, verifyToken } from '../src/utils/jwt.js'

test('Utility: calculateDurationMinutes menangani shift normal dan tengah malam', () => {
  // Shift normal pagi
  assert.equal(calculateDurationMinutes('08:00', '10:30'), 150)
  // Shift melintasi tengah malam (23:00 - 07:00)
  assert.equal(calculateDurationMinutes('23:00', '07:00'), 480)
  // Shift sore ke malam (22:30 - 01:15)
  assert.equal(calculateDurationMinutes('22:30', '01:15'), 165)
  // Input kosong
  assert.equal(calculateDurationMinutes('', ''), 0)
})

test('Utility: JWT generate & verify berfungsi dengan benar', () => {
  const payload = { id: 10, email: 'teknisi@satoria.co.id', role: 'Teknisi' }
  const token = generateToken(payload)
  assert.ok(token && typeof token === 'string')

  const decoded = verifyToken(token)
  assert.equal(decoded.id, 10)
  assert.equal(decoded.email, 'teknisi@satoria.co.id')
  assert.equal(decoded.role, 'Teknisi')

  // Token palsu
  const invalid = verifyToken('token-palsu-ngawur')
  assert.equal(invalid, null)
})

test('API Endpoint: GET /health mengembalikan status 200 dan format standar', async () => {
  const server = app.listen(0)
  const port = server.address().port

  try {
    const res = await fetch(`http://localhost:${port}/health`)
    assert.equal(res.status, 200)

    const json = await res.json()
    assert.equal(json.success, true)
    assert.ok(json.data.uptime >= 0)
  } finally {
    server.close()
  }
})

test('API Endpoint: GET /api/v1/health mengembalikan versi 1.0.0', async () => {
  const server = app.listen(0)
  const port = server.address().port

  try {
    const res = await fetch(`http://localhost:${port}/api/v1/health`)
    assert.equal(res.status, 200)

    const json = await res.json()
    assert.equal(json.success, true)
    assert.equal(json.data.version, '1.0.0')
  } finally {
    server.close()
  }
})

test('API Security: Endpoint terproteksi menolak permintaan tanpa token (401)', async () => {
  const server = app.listen(0)
  const port = server.address().port

  try {
    const resLogbooks = await fetch(`http://localhost:${port}/api/v1/logbooks`)
    assert.equal(resLogbooks.status, 401)
    const jsonLogbooks = await resLogbooks.json()
    assert.equal(jsonLogbooks.success, false)

    const resMaster = await fetch(`http://localhost:${port}/api/v1/master/plants`)
    assert.equal(resMaster.status, 401)
    const jsonMaster = await resMaster.json()
    assert.equal(jsonMaster.success, false)
  } finally {
    server.close()
  }
})

test('API Validation: POST /api/v1/auth/login menolak jika identifier/password kosong (400)', async () => {
  const server = app.listen(0)
  const port = server.address().port

  try {
    const res = await fetch(`http://localhost:${port}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    assert.equal(res.status, 400)
    const json = await res.json()
    assert.equal(json.success, false)
  } finally {
    server.close()
  }
})

test('API Routing: Endpoint tak terdaftar menghasilkan 404 berformat standar', async () => {
  const server = app.listen(0)
  const port = server.address().port

  try {
    const res = await fetch(`http://localhost:${port}/api/v1/endpoint-ngawur`)
    assert.equal(res.status, 404)
    const json = await res.json()
    assert.equal(json.success, false)
  } finally {
    server.close()
  }
})

test('API Notifications: Endpoint GET /api/v1/notifications menolak akses tanpa token (401)', async () => {
  const server = app.listen(0)
  const port = server.address().port

  try {
    const res = await fetch(`http://localhost:${port}/api/v1/notifications`)
    assert.equal(res.status, 401)
    const json = await res.json()
    assert.equal(json.success, false)
  } finally {
    server.close()
  }
})

