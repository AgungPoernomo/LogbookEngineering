import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  FAILURE_CODE_CATEGORIES,
  buildFailureCodePayload,
  buildFailureCodeWhere,
  isFailureCodeType,
  mapFailureCode
} from '../src/controllers/masterController.js'

// ============================================================================
// FASE 4.1a — Master Kode Kerusakan (ISO 14224).
// Pengujian MURNI (tanpa database): mengunci kontrak respons
// `GET /api/v1/master/failure-codes` yang dikonsumsi dropdown
// "Kode Kerusakan" pada form Input Logbook teknisi.
// ============================================================================

describe('Fase 4.1a - mapFailureCode', () => {
  it('mengubah id BigInt menjadi Number (JSON-safe untuk v-model select)', () => {
    const mapped = mapFailureCode({
      id: 7n,
      code: 'MECH-01',
      name: 'Bearing aus/overheat/macet',
      category: 'MECHANICAL'
    })

    assert.equal(mapped.id, 7)
    assert.equal(typeof mapped.id, 'number')
    assert.equal(mapped.code, 'MECH-01')
    assert.equal(mapped.name, 'Bearing aus/overheat/macet')
    assert.equal(mapped.category, 'MECHANICAL')
  })

  it('description kosong / hanya spasi dinormalkan menjadi null', () => {
    assert.equal(
      mapFailureCode({ id: 1, code: 'MECH-02', name: 'Kebocoran seal', category: 'MECHANICAL' })
        .description,
      null
    )
    assert.equal(
      mapFailureCode({
        id: 1,
        code: 'MECH-02',
        name: 'Kebocoran seal',
        category: 'MECHANICAL',
        description: '   '
      }).description,
      null
    )
  })

  it('description terisi dikembalikan apa adanya (di-trim)', () => {
    const mapped = mapFailureCode({
      id: 2,
      code: 'ELEC-01',
      name: 'Motor overload/trip',
      category: 'ELECTRICAL',
      description: '  Motor trip karena beban lebih  '
    })

    assert.equal(mapped.description, 'Motor trip karena beban lebih')
  })

  it('hanya mengekspos field kontrak + status aktif (tanpa created_at)', () => {
    const mapped = mapFailureCode({
      id: 3,
      code: 'UTIL-01',
      name: 'Tekanan angin/vacuum drop',
      category: 'UTILITY',
      description: null,
      is_active: true,
      created_at: new Date()
    })

    assert.deepEqual(
      Object.keys(mapped).sort(),
      ['category', 'code', 'description', 'id', 'is_active', 'name']
    )
    assert.equal(mapped.is_active, true)
  })

  it('is_active default true bila kolom tidak dikirim / null', () => {
    assert.equal(mapFailureCode({ id: 1, code: 'MECH-03', name: 'X', category: 'MECHANICAL' }).is_active, true)
    assert.equal(
      mapFailureCode({ id: 1, code: 'MECH-03', name: 'X', category: 'MECHANICAL', is_active: null }).is_active,
      true
    )
    assert.equal(
      mapFailureCode({ id: 1, code: 'MECH-03', name: 'X', category: 'MECHANICAL', is_active: false }).is_active,
      false
    )
  })

  it('setiap baris hasil mapping bisa dipakai sebagai opsi select (id unik, code & name terisi)', () => {
    const rows = [
      { id: 1n, code: 'MECH-01', name: 'Bearing aus/overheat/macet', category: 'MECHANICAL' },
      { id: 2n, code: 'ELEC-02', name: 'Inverter/VFD/servo fault', category: 'ELECTRICAL' }
    ].map(mapFailureCode)

    const ids = rows.map((r) => r.id)
    assert.equal(new Set(ids).size, rows.length)
    rows.forEach((row) => {
      assert.equal(Number.isInteger(row.id), true)
      assert.ok(row.code.length > 0)
      assert.ok(row.name.length > 0)
    })
  })
})

// ============================================================================
// FASE 5 — CRUD Master Failure Code (Admin).
// ============================================================================

describe('Fase 5 - FAILURE_CODE_CATEGORIES', () => {
  it('berisi tepat 5 kategori ISO 14224 sesuai enum pada schema.prisma', () => {
    assert.deepEqual(FAILURE_CODE_CATEGORIES, [
      'MECHANICAL',
      'ELECTRICAL',
      'INSTRUMENTATION',
      'UTILITY',
      'PROCESS'
    ])
  })
})

describe('Fase 5 - isFailureCodeType', () => {
  it('mengenali slug `failure-codes` dan alias `failure_codes` (case-insensitive)', () => {
    assert.equal(isFailureCodeType('failure-codes'), true)
    assert.equal(isFailureCodeType('failure_codes'), true)
    assert.equal(isFailureCodeType('FAILURE-CODES'), true)
    assert.equal(isFailureCodeType('spareparts'), false)
    assert.equal(isFailureCodeType(undefined), false)
  })
})

describe('Fase 5 - buildFailureCodePayload (POST / create)', () => {
  it('menormalisasi payload valid: trim + code uppercase', () => {
    const { errors, data } = buildFailureCodePayload({
      code: '  mech-01 ',
      category: 'MECHANICAL',
      name: '  Bearing aus/overheat/macet ',
      description: '  Bearing bunyi kasar & panas berlebih  '
    })

    assert.deepEqual(errors, [])
    assert.equal(data.code, 'MECH-01')
    assert.equal(data.category, 'MECHANICAL')
    assert.equal(data.name, 'Bearing aus/overheat/macet')
    assert.equal(data.description, 'Bearing bunyi kasar & panas berlebih')
  })

  it('code, category, dan name wajib diisi', () => {
    const errors = buildFailureCodePayload({}).errors

    assert.equal(errors.length, 3)
    assert.match(errors[0], /Kode kerusakan wajib diisi/i)
    assert.match(errors[1], /Kategori kerusakan wajib dipilih/i)
    assert.match(errors[2], /Nama kerusakan wajib diisi/i)
  })

  it('category di luar enum ditolak', () => {
    const { errors, data } = buildFailureCodePayload({
      code: 'MECH-01',
      category: 'HYDRAULIC',
      name: 'Bearing aus'
    })

    assert.equal(errors.length, 1)
    assert.match(errors[0], /tidak valid/i)
    assert.equal(data.category, undefined)
  })

  it('description kosong → null (opsional)', () => {
    const { errors, data } = buildFailureCodePayload({
      code: 'ELEC-01',
      category: 'ELECTRICAL',
      name: 'Motor overload/trip',
      description: '   '
    })

    assert.deepEqual(errors, [])
    assert.equal(data.description, null)
  })

  it('menolak nilai melebihi batas kolom (code 30 / name 150)', () => {
    const tooLongCode = buildFailureCodePayload({
      code: 'X'.repeat(31),
      category: 'MECHANICAL',
      name: 'Bearing aus'
    })
    assert.match(tooLongCode.errors[0], /maksimal 30/i)

    const tooLongName = buildFailureCodePayload({
      code: 'MECH-01',
      category: 'MECHANICAL',
      name: 'x'.repeat(151)
    })
    assert.match(tooLongName.errors[0], /maksimal 150/i)
  })

  it('is_active opsional (default Prisma true bila tidak dikirim)', () => {
    const { data } = buildFailureCodePayload({
      code: 'MECH-01',
      category: 'MECHANICAL',
      name: 'Bearing aus'
    })
    assert.equal('is_active' in data, false)

    const explicit = buildFailureCodePayload({
      code: 'MECH-01',
      category: 'MECHANICAL',
      name: 'Bearing aus',
      is_active: false
    })
    assert.equal(explicit.data.is_active, false)
  })
})

describe('Fase 5 - buildFailureCodePayload (PUT / partial update)', () => {
  it('hanya mengembalikan field yang dikirim', () => {
    const { errors, data } = buildFailureCodePayload({ name: ' Seal bocor ' }, { partial: true })

    assert.deepEqual(errors, [])
    assert.deepEqual(data, { name: 'Seal bocor' })
  })

  it('code di-trim + uppercase, category tetap divalidasi enum', () => {
    const codeOnly = buildFailureCodePayload({ code: ' mech-07 ' }, { partial: true })
    assert.equal(codeOnly.data.code, 'MECH-07')

    const invalidCategory = buildFailureCodePayload({ category: 'NOPE' }, { partial: true })
    assert.match(invalidCategory.errors[0], /tidak valid/i)
  })

  it('description boleh dikosongkan (null) saat update', () => {
    const { errors, data } = buildFailureCodePayload({ description: '' }, { partial: true })
    assert.deepEqual(errors, [])
    assert.equal(data.description, null)
  })

  it('toggle is_active diterima sebagai boolean & string', () => {
    assert.deepEqual(buildFailureCodePayload({ is_active: false }, { partial: true }).data, {
      is_active: false
    })
    assert.deepEqual(buildFailureCodePayload({ is_active: 'true' }, { partial: true }).data, {
      is_active: true
    })

    const invalid = buildFailureCodePayload({ is_active: 'kadang-kadang' }, { partial: true })
    assert.match(invalid.errors[0], /Status aktif tidak valid/i)
  })

  it('payload kosong tanpa error (ditolak handler sebagai 400)', () => {
    const { errors, data } = buildFailureCodePayload({}, { partial: true })
    assert.deepEqual(errors, [])
    assert.deepEqual(data, {})
  })
})

describe('Fase 5 - buildFailureCodeWhere', () => {
  it('default hanya kode aktif (dropdown form teknisi)', () => {
    assert.deepEqual(buildFailureCodeWhere({}), { is_active: true })
  })

  it('include_inactive=true menampilkan semua status (halaman Admin)', () => {
    assert.deepEqual(buildFailureCodeWhere({ include_inactive: 'true' }), {})
    assert.deepEqual(buildFailureCodeWhere({ include_inactive: true }), {})
  })

  it('filter category valid diterapkan, nilai tak dikenal diabaikan', () => {
    assert.equal(buildFailureCodeWhere({ category: 'UTILITY' }).category, 'UTILITY')
    assert.equal(buildFailureCodeWhere({ category: 'BOGUS' }).category, undefined)
  })

  it('search mencakup kode dan nama kerusakan (substring)', () => {
    const where = buildFailureCodeWhere({ search: '  bearing ' })
    assert.equal(where.OR.length, 2)
    assert.deepEqual(where.OR[0], { code: { contains: 'bearing' } })
    assert.deepEqual(where.OR[1], { name: { contains: 'bearing' } })
  })

  it('kombinasi category + search + include_inactive', () => {
    const where = buildFailureCodeWhere({
      category: 'MECHANICAL',
      search: 'bearing',
      include_inactive: 'true'
    })
    assert.equal(where.category, 'MECHANICAL')
    assert.equal(where.OR.length, 2)
    assert.equal('is_active' in where, false)
  })
})

// ============================================================================
// Pengujian HTTP (POST/PUT/DELETE) dengan Prisma di-stub pada runtime.
// Memastikan: validasi 400, duplikat 409, update parsial, dan
// SOFT DELETE (`is_active = false`, baris TIDAK dihapus).
// ============================================================================

describe('Fase 5 - HTTP CRUD /master/failure-codes', () => {
  let app
  let prisma
  let generateToken
  let server
  let baseUrl
  let request
  let rows
  let nextId
  let deletedIds

  const seedRow = (overrides = {}) => ({
    id: BigInt(nextId++),
    code: 'MECH-01',
    category: 'MECHANICAL',
    name: 'Bearing aus/overheat/macet',
    description: null,
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides
  })

  before(async () => {
    // Import dinamis agar stub Prisma terpasang SEBELUM app dimuat.
    prisma = (await import('../src/config/prisma.js')).default
    ;({ generateToken } = await import('../src/utils/jwt.js'))

    nextId = 100
    deletedIds = []
    rows = [
      seedRow(),
      seedRow({ code: 'ELEC-01', category: 'ELECTRICAL', name: 'Motor overload/trip' }),
      seedRow({ code: 'UTIL-01', category: 'UTILITY', name: 'Tekanan angin drop', is_active: false })
    ]

    // Stub minimal model `failureCode` (in-memory, tanpa database).
    prisma.failureCode = {
      async findMany({ where = {} } = {}) {
        return rows.filter((row) => {
          if (where.is_active !== undefined && row.is_active !== where.is_active) return false
          if (where.category !== undefined && row.category !== where.category) return false
          if (where.OR) {
            const keyword = (where.OR[0]?.code?.contains ?? '').toLowerCase()
            if (!`${row.code} ${row.name}`.toLowerCase().includes(keyword)) return false
          }
          return true
        })
      },
      async findFirst({ where = {} } = {}) {
        return (
          rows.find((row) => {
            if (where.code?.equals && row.code !== where.code.equals) return false
            if (where.id?.not !== undefined && row.id === where.id.not) return false
            return true
          }) || null
        )
      },
      async findUnique({ where }) {
        return rows.find((row) => row.id === where.id) || null
      },
      async create({ data }) {
        const row = seedRow({ ...data, description: data.description ?? null })
        rows.push(row)
        return row
      },
      async update({ where, data }) {
        const row = rows.find((r) => r.id === where.id)
        if (!row) {
          const err = new Error('Record not found')
          err.code = 'P2025'
          throw err
        }
        Object.assign(row, data)
        return row
      },
      async delete({ where }) {
        deletedIds.push(where.id)
        rows = rows.filter((r) => r.id !== where.id)
        return {}
      }
    }

    // Audit trail (logActivity) ikut di-stub agar pengujian tidak menulis ke
    // tabel `user_activities` (dan tidak bergantung pada data user ter-seed).
    if (prisma.userActivity) {
      prisma.userActivity.create = async () => ({ id: 1n })
    }

    app = (await import('../src/app.js')).default
    const tokenAdmin = generateToken({
      id: 301,
      email: 'admin.utama@satoria.co.id',
      full_name: 'Admin Sistem',
      role: 'Admin'
    })

    server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    baseUrl = `http://localhost:${server.address().port}/api/v1/master/failure-codes`

    request = (method, path = '', body) =>
      fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
          'Content-Type': 'application/json'
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      })
  })

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve))
  })

  // ── POST ──
  it('POST menyimpan kode baru dengan is_active default true', async () => {
    const res = await request('POST', '', {
      code: 'inst-01',
      category: 'INSTRUMENTATION',
      name: '  Transmitter drift/error ',
      description: '  Kalibrasi ulang sensor  '
    })

    assert.equal(res.status, 201)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.equal(json.data.code, 'INST-01')
    assert.equal(json.data.category, 'INSTRUMENTATION')
    assert.equal(json.data.name, 'Transmitter drift/error')
    assert.equal(json.data.description, 'Kalibrasi ulang sensor')
    assert.equal(json.data.is_active, true)
    assert.equal(typeof json.data.id, 'number')
  })

  it('POST menolak payload tidak lengkap (400) dengan daftar error', async () => {
    const res = await request('POST', '', { code: '' })
    assert.equal(res.status, 400)

    const json = await res.json()
    assert.equal(json.success, false)
    assert.ok(Array.isArray(json.errors))
    assert.ok(json.errors.length >= 3)
  })

  it('POST menolak kategori di luar enum (400)', async () => {
    const res = await request('POST', '', {
      code: 'MECH-99',
      category: 'HYDRAULIC',
      name: 'Bocor oli'
    })
    assert.equal(res.status, 400)
    assert.match((await res.json()).message, /tidak valid/i)
  })

  it('POST menolak kode duplikat (409) termasuk beda huruf besar/kecil', async () => {
    const res = await request('POST', '', {
      code: 'mech-01',
      category: 'MECHANICAL',
      name: 'Duplikat'
    })
    assert.equal(res.status, 409)
    assert.match((await res.json()).message, /sudah terdaftar/i)
  })

  // ── PUT ──
  it('PUT memperbarui hanya field yang dikirim (partial update)', async () => {
    const target = rows.find((row) => row.code === 'ELEC-01')

    const res = await request('PUT', `/${target.id}`, {
      name: '  Motor overload / trip MCB ',
      description: 'Motor trip karena beban lebih'
    })
    assert.equal(res.status, 200)

    const json = await res.json()
    assert.equal(json.data.name, 'Motor overload / trip MCB')
    assert.equal(json.data.description, 'Motor trip karena beban lebih')
    // Kolom yang tidak dikirim tidak berubah.
    assert.equal(json.data.code, 'ELEC-01')
    assert.equal(json.data.category, 'ELECTRICAL')
    assert.equal(json.data.is_active, true)
  })

  it('PUT bisa mengubah code (uppercase) & menolak duplikat (409)', async () => {
    const target = rows.find((row) => row.code === 'ELEC-01')

    const ok = await request('PUT', `/${target.id}`, { code: ' elec-02 ' })
    assert.equal(ok.status, 200)
    assert.equal((await ok.json()).data.code, 'ELEC-02')

    const duplicate = await request('PUT', `/${target.id}`, { code: 'MECH-01' })
    assert.equal(duplicate.status, 409)
    assert.match((await duplicate.json()).message, /sudah terdaftar/i)
  })

  it('PUT menolak category tidak valid (400) dan id tidak dikenal (404)', async () => {
    const target = rows.find((row) => row.code === 'MECH-01')

    const invalid = await request('PUT', `/${target.id}`, { category: 'ROBOTICS' })
    assert.equal(invalid.status, 400)

    const notFound = await request('PUT', '/999999', { name: 'Tidak ada' })
    assert.equal(notFound.status, 404)
  })

  it('PUT mengaktifkan kembali kode nonaktif (toggle is_active)', async () => {
    const target = rows.find((row) => row.code === 'UTIL-01')
    assert.equal(target.is_active, false)

    const res = await request('PUT', `/${target.id}`, { is_active: true })
    assert.equal(res.status, 200)
    assert.equal((await res.json()).data.is_active, true)
  })

  // ── DELETE ──
  it('DELETE = soft delete: is_active=false dan baris TIDAK dihapus', async () => {
    const target = rows.find((row) => row.code === 'MECH-01')
    const totalBefore = rows.length

    const res = await request('DELETE', `/${target.id}`)
    assert.equal(res.status, 200)

    const json = await res.json()
    assert.equal(json.success, true)
    assert.equal(json.data.is_active, false)
    assert.match(json.message, /dinonaktifkan/i)

    assert.equal(rows.length, totalBefore, 'baris tidak boleh terhapus (hard delete)')
    assert.equal(rows.find((row) => row.id === target.id).is_active, false)
    assert.deepEqual(deletedIds, [], 'tidak boleh memanggil prisma.failureCode.delete')
  })

  it('DELETE kode yang sudah nonaktif bersifat idempoten (200)', async () => {
    const target = rows.find((row) => row.code === 'MECH-01')

    const res = await request('DELETE', `/${target.id}`)
    assert.equal(res.status, 200)
    assert.match((await res.json()).message, /sudah berstatus nonaktif/i)
  })

  it('DELETE id tidak dikenal → 404', async () => {
    const res = await request('DELETE', '/999999')
    assert.equal(res.status, 404)
    assert.match((await res.json()).message, /tidak ditemukan/i)
  })

  it('GET default menyembunyikan kode nonaktif; include_inactive=true menampilkan semua', async () => {
    const activeOnly = await (await request('GET')).json()
    assert.equal(activeOnly.data.every((row) => row.is_active !== false), true)
    assert.equal(activeOnly.data.some((row) => row.code === 'MECH-01'), false)

    const all = await (await request('GET', '?include_inactive=true')).json()
    assert.equal(all.data.some((row) => row.code === 'MECH-01' && row.is_active === false), true)
  })
})
