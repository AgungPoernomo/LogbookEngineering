import test from 'node:test'
import assert from 'node:assert/strict'
import app from '../src/app.js'
import sharp from 'sharp'
import { generateToken } from '../src/utils/jwt.js'

test('API Avatar: POST /api/v1/auth/avatar menolak permintaan tanpa token (401)', async () => {
  const server = app.listen(0)
  const port = server.address().port

  try {
    const res = await fetch(`http://localhost:${port}/api/v1/auth/avatar`, {
      method: 'POST'
    })
    assert.equal(res.status, 401)
    const json = await res.json()
    assert.equal(json.success, false)
  } finally {
    server.close()
  }
})

test('API Avatar: POST /api/v1/auth/avatar menolak jika tidak ada file yang dikirim (400)', async () => {
  const server = app.listen(0)
  const port = server.address().port
  const token = generateToken({ id: 1, email: 'teknisi@satoria.co.id', role: 'Teknisi' })

  try {
    const res = await fetch(`http://localhost:${port}/api/v1/auth/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    assert.equal(res.status, 400)
    const json = await res.json()
    assert.equal(json.success, false)
  } finally {
    server.close()
  }
})
