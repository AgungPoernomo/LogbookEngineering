/**
 * Validasi umum (v6 - BUG-009).
 */

// Email valid: local@domain.tld dengan TLD minimal 2 huruf.
// Contoh ditolak: "ab@c", "a@b", "a@b.c" (TLD 1 huruf), "a b@c.com".
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/

/**
 * Memeriksa apakah email berbentuk valid.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false
  return EMAIL_REGEX.test(email.trim())
}

export const ACTIVITY_DESCRIPTION_MAX_LENGTH = 1000
