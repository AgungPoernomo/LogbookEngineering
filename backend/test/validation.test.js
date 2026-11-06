import test from 'node:test'
import assert from 'node:assert/strict'
import { validateLogbookTime, validateActivityDescription } from '../src/utils/timeValidation.js'
import { isValidEmail } from '../src/utils/validation.js'

// ============================================================================
// BUG-003: urutan waktu lintas tengah malam hanya untuk Shift Malam
// ============================================================================
test('BUG-003: 08:00 -> 07:00 ditolak pada shift siang (bukan shift malam)', () => {
  const dayShift = { start_time: '07:00', end_time: '15:00' }
  const result = validateLogbookTime('08:00', '07:00', dayShift)
  assert.equal(result.valid, false)
})

test('BUG-003: 23:00 -> 07:00 valid pada shift malam', () => {
  const nightShift = { start_time: '23:00', end_time: '07:00' }
  const result = validateLogbookTime('23:00', '07:00', nightShift)
  assert.equal(result.valid, true)
})

test('BUG-003: rentang normal (08:00 -> 10:30) valid', () => {
  const dayShift = { start_time: '07:00', end_time: '15:00' }
  assert.equal(validateLogbookTime('08:00', '10:30', dayShift).valid, true)
})

// ============================================================================
// BUG-004: waktu selesai sama dengan waktu mulai (durasi 0) ditolak
// ============================================================================
test('BUG-004: waktu selesai sama dengan waktu mulai ditolak', () => {
  const result = validateLogbookTime('08:00', '08:00', { start_time: '07:00', end_time: '15:00' })
  assert.equal(result.valid, false)
  assert.match(result.message, /sama dengan waktu mulai/i)
})

test('BUG-003: format waktu tidak valid ditolak', () => {
  assert.equal(validateLogbookTime('8:00', '10:00', null).valid, false)
  assert.equal(validateLogbookTime('25:00', '10:00', null).valid, false)
})

// ============================================================================
// BUG-012: uraian aktivitas maksimal 1000 karakter
// ============================================================================
test('BUG-012: uraian aktivitas lebih dari 1000 karakter ditolak', () => {
  const longText = 'a'.repeat(1001)
  assert.equal(validateActivityDescription(longText).valid, false)
  assert.equal(validateActivityDescription('a'.repeat(1000)).valid, true)
  assert.equal(validateActivityDescription('   ').valid, false)
})

// ============================================================================
// BUG-009: validasi email ketat (local@domain.tld, TLD >= 2 huruf)
// ============================================================================
test('BUG-009: email "ab@c" ditolak', () => {
  assert.equal(isValidEmail('ab@c'), false)
  assert.equal(isValidEmail('a@b'), false)
  assert.equal(isValidEmail('a@b.c'), false)
  assert.equal(isValidEmail('tanpa-at.com'), false)
})

test('BUG-009: email valid diterima', () => {
  assert.equal(isValidEmail('teknisi@satoria.co.id'), true)
  assert.equal(isValidEmail('nama@domain.com'), true)
})
