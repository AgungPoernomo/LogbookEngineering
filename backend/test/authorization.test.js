import test from 'node:test'
import assert from 'node:assert/strict'
import app from '../src/app.js'
import prisma from '../src/config/prisma.js'
import { generateToken } from '../src/utils/jwt.js'

test('Otorisasi: Matriks RBAC & Keamanan Hak Akses Logbook, Approval, dan Master Data', async (t) => {
  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`

  // Kredensial pengujian
  const tokenTeknisiA = generateToken({ id: 101, email: 'teknisi.a@satoria.co.id', full_name: 'Teknisi A', role: 'Teknisi' })
  const tokenTeknisiB = generateToken({ id: 102, email: 'teknisi.b@satoria.co.id', full_name: 'Teknisi B', role: 'Teknisi' })
  const tokenSupervisor = generateToken({ id: 201, email: 'spv.hendra@satoria.co.id', full_name: 'Supervisor Hendra', role: 'Supervisor' })
  const tokenAdmin = generateToken({ id: 301, email: 'admin.utama@satoria.co.id', full_name: 'Admin Sistem', role: 'Admin' })

  // Mock data logbook milik Teknisi B (user_id: 102)
  const mockLogbookB = {
    id: BigInt(99999),
    user_id: BigInt(102),
    plant_id: BigInt(1),
    shift_id: BigInt(1),
    machine_id: BigInt(1),
    sub_machine_id: null,
    task_date: '2026-10-21',
    start_time: '08:00',
    end_time: '16:00',
    duration_minutes: 480,
    activity_description: 'Pekerjaan rahasia Teknisi B',
    sparepart: '-',
    status: 'DRAFT',
    created_at: new Date(),
    updated_at: new Date(),
    user: { id: 102, nik: 'TK-102', full_name: 'Teknisi B', email: 'teknisi.b@satoria.co.id', photo_url: null },
    plant: { id: 1, name: 'Plant 1' },
    shift: { id: 1, name: 'Shift 1' },
    machine: { id: 1, name: 'Autoclave' },
    subMachine: null,
    approvals: []
  }

  // Intercept prisma.logbook.findUnique agar deterministik untuk id 99999
  const originalFindUnique = prisma.logbook.findUnique
  prisma.logbook.findUnique = async (args) => {
    if (args?.where?.id === BigInt(99999)) {
      return { ...mockLogbookB }
    }
    return originalFindUnique.call(prisma.logbook, args)
  }

  try {
    // -------------------------------------------------------------
    // SKENARIO 1: Apakah Teknisi A bisa membuka / mengubah logbook Teknisi B?
    // -------------------------------------------------------------
    await t.test('1.1 Teknisi A TIDAK BISA membuka logbook Teknisi B (GET /logbooks/:id -> 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/logbooks/99999`, {
        headers: { Authorization: `Bearer ${tokenTeknisiA}` }
      })
      assert.equal(res.status, 403, 'Harus mengembalikan HTTP 403 Forbidden')
      const json = await res.json()
      assert.equal(json.success, false)
      assert.match(json.message, /Akses ditolak.*tidak berhak melihat logbook ini/i)
    })

    await t.test('1.2 Teknisi A TIDAK BISA mengedit logbook Teknisi B (PUT /logbooks/:id -> 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/logbooks/99999`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokenTeknisiA}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ activity_description: 'Upaya sabotase oleh Teknisi A' })
      })
      assert.equal(res.status, 403, 'Harus mengembalikan HTTP 403 Forbidden')
      const json = await res.json()
      assert.equal(json.success, false)
      assert.match(json.message, /Akses ditolak.*bukan pemilik logbook ini/i)
    })

    await t.test('1.3 Teknisi A TIDAK BISA menghapus logbook Teknisi B (DELETE /logbooks/:id -> 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/logbooks/99999`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenTeknisiA}` }
      })
      assert.equal(res.status, 403, 'Harus mengembalikan HTTP 403 Forbidden')
      const json = await res.json()
      assert.equal(json.success, false)
      assert.match(json.message, /Akses ditolak.*bukan pemilik logbook ini/i)
    })

    await t.test('1.4 Teknisi B (Pemilik Sah) BISA membuka logbook miliknya sendiri (GET /logbooks/:id -> 200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/logbooks/99999`, {
        headers: { Authorization: `Bearer ${tokenTeknisiB}` }
      })
      assert.equal(res.status, 200)
      const json = await res.json()
      assert.equal(json.success, true)
      assert.equal(json.data.id, 99999)
      assert.equal(json.data.user_id, 102)
    })

    await t.test('1.5 Supervisor & Admin BISA meninjau logbook teknisi (GET /logbooks/:id -> 200 OK)', async () => {
      const resSpv = await fetch(`${baseUrl}/api/v1/logbooks/99999`, {
        headers: { Authorization: `Bearer ${tokenSupervisor}` }
      })
      assert.equal(resSpv.status, 200, 'Supervisor harus bisa membuka logbook teknisi')

      const resAdmin = await fetch(`${baseUrl}/api/v1/logbooks/99999`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      })
      assert.equal(resAdmin.status, 200, 'Admin harus bisa membuka logbook teknisi')
    })

    // -------------------------------------------------------------
    // SKENARIO 2: Apakah Teknisi bisa memanggil endpoint approval?
    // -------------------------------------------------------------
    await t.test('2.1 Teknisi TIDAK BISA memanggil endpoint approval (POST /logbooks/:id/approval -> 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/logbooks/99999/approval`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenTeknisiA}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'APPROVED',
          notes: 'Teknisi menyetujui logbook sendiri secara ilegal'
        })
      })
      assert.equal(res.status, 403, 'Harus ditolak 403 oleh RBAC middleware')
      const json = await res.json()
      assert.equal(json.success, false)
      assert.match(json.message, /Akses ditolak.*Supervisor, Admin/i)
    })

    await t.test('2.2 Supervisor DIIZINKAN mengakses endpoint approval (tidak ditolak 403)', async () => {
      // Menguji bahwa RBAC mengizinkan Supervisor lolos ke controller
      const res = await fetch(`${baseUrl}/api/v1/logbooks/99999/approval`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenSupervisor}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'INVALID_STATUS'
        })
      })
      // Status bukan 403 (bisa 400 karena validasi status di controller, membuktikan RBAC lolos)
      assert.notEqual(res.status, 403, 'Supervisor tidak boleh diblokir oleh 403')
    })

    await t.test('2.3 Teknisi TIDAK BISA memanggil approval per teknisi (POST /approvals/technician/:userId -> 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/approvals/technician/102`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenTeknisiA}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'APPROVED',
          notes: 'Teknisi menyetujui logbook sendiri'
        })
      })
      assert.equal(res.status, 403, 'Harus ditolak 403 Forbidden oleh RBAC middleware')
      const json = await res.json()
      assert.equal(json.success, false)
      assert.match(json.message, /Akses ditolak.*Supervisor, Admin/i)
    })

    await t.test('2.4 Supervisor DIIZINKAN memanggil approval per teknisi (tidak ditolak 403)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/approvals/technician/102`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenSupervisor}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'INVALID_STATUS'
        })
      })
      assert.notEqual(res.status, 403, 'Supervisor tidak boleh diblokir oleh 403')
    })

    await t.test('2.5 Supervisor BISA mengambil daftar approval per teknisi (GET /approvals/technicians -> 200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/approvals/technicians`, {
        headers: {
          Authorization: `Bearer ${tokenSupervisor}`
        }
      })
      assert.equal(res.status, 200, 'Supervisor harus sukses mengambil daftar per teknisi')
      const json = await res.json()
      assert.equal(json.success, true)
      assert.ok(Array.isArray(json.data), 'Data harus berupa array teknisi')
    })

    // -------------------------------------------------------------
    // SKENARIO 3: Apakah Supervisor bisa mengubah master data?
    // -------------------------------------------------------------
    await t.test('3.1 Supervisor TIDAK BISA menambah Master Data Plant (POST /master/plants -> 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/master/plants`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenSupervisor}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Plant Ilegal Baru' })
      })
      assert.equal(res.status, 403, 'Supervisor dilarang menambah master data')
      const json = await res.json()
      assert.equal(json.success, false)
      assert.match(json.message, /Akses ditolak.*Admin/i)
    })

    await t.test('3.2 Supervisor TIDAK BISA mengedit Master Data Shift (PUT /master/shifts/:id -> 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/master/shifts/1`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokenSupervisor}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Shift Ilegal' })
      })
      assert.equal(res.status, 403, 'Supervisor dilarang mengedit master data')
      const json = await res.json()
      assert.equal(json.success, false)
      assert.match(json.message, /Akses ditolak.*Admin/i)
    })

    await t.test('3.3 Supervisor TIDAK BISA menghapus Master Data Machine (DELETE /master/machines/:id -> 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/master/machines/1`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenSupervisor}` }
      })
      assert.equal(res.status, 403, 'Supervisor dilarang menghapus master data')
      const json = await res.json()
      assert.equal(json.success, false)
      assert.match(json.message, /Akses ditolak.*Admin/i)
    })

    await t.test('3.4 Supervisor BISA membaca Master Data (GET /master/plants -> 200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/master/plants`, {
        headers: { Authorization: `Bearer ${tokenSupervisor}` }
      })
      assert.equal(res.status, 200, 'Supervisor diizinkan membaca master data untuk kebutuhan form/monitoring')
      const json = await res.json()
      assert.equal(json.success, true)
    })

  } finally {
    prisma.logbook.findUnique = originalFindUnique
    server.close()
  }
})
