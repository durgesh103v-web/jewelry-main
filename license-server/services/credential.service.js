const crypto = require('crypto')
const argon2 = require('argon2')

/**
 * Computes a deterministic SHA-256 hash of a string (uppercase trimmed).
 * Used for indexing and looking up Product Keys and Master Recovery Keys
 * without storing them in plaintext.
 */
function hashSecretKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') {
    throw new Error('A valid string is required to compute secret key hash')
  }
  const normalized = rawKey.trim().toUpperCase()
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex')
}

/**
 * Hashes passwords using Argon2id with recommended OWASP security parameters.
 */
async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string' || plainPassword.length < 6) {
    throw new Error('Password must be at least 6 characters')
  }
  return argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 1
  })
}

/**
 * Verifies an Argon2id password hash against a plaintext candidate.
 */
async function verifyPassword(hash, plainPassword) {
  if (!hash || !plainPassword) return false
  try {
    return await argon2.verify(hash, plainPassword)
  } catch {
    return false
  }
}

/**
 * Generates cryptographically secure alphanumeric characters using crypto.randomBytes.
 * Uses Base32 unambiguous charset (excludes 0, 1, I, O).
 */
function generateSecureSegment(length = 4) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const bytes = crypto.randomBytes(length)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

/**
 * Generates a unique, cryptographically random Product Key.
 * Format: JERP-<BAS|PRO|ENT>-XXXX-XXXX-XXXX
 */
function generateProductKey(edition = 'PROFESSIONAL') {
  const prefixMap = {
    BASIC: 'BAS',
    PROFESSIONAL: 'PRO',
    ENTERPRISE: 'ENT'
  }
  const tag = prefixMap[edition] || 'PRO'
  return `JERP-${tag}-${generateSecureSegment(4)}-${generateSecureSegment(4)}-${generateSecureSegment(4)}`
}

/**
 * Generates a cryptographically random Master Recovery Key.
 * Format: REC-XXXX-XXXX-XXXX
 */
function generateRecoveryKey() {
  return `REC-${generateSecureSegment(4)}-${generateSecureSegment(4)}-${generateSecureSegment(4)}`
}

/**
 * Generates a cryptographically secure random temporary password.
 * Format: 12 chars containing letters, numbers, and symbol.
 */
function generateTemporaryPassword() {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*'
  const bytes = crypto.randomBytes(12)
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars[bytes[i] % chars.length]
  }
  return password
}

/**
 * Generates a standard sequential-style unique Shop ID.
 * Format: SHOP-<YEAR>-<5-RANDOM-HEX>
 */
function generateShopId() {
  const year = new Date().getFullYear()
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5)
  return `SHOP-${year}-${randomHex}`
}

/**
 * Generates a suggested clean username for a shop owner.
 */
function generateSuggestedUsername(shopName) {
  const sanitized = (shopName || 'owner')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10)
  const suffix = crypto.randomBytes(2).toString('hex')
  return `${sanitized || 'shop'}_admin_${suffix}`
}

module.exports = {
  hashSecretKey,
  hashPassword,
  verifyPassword,
  generateProductKey,
  generateRecoveryKey,
  generateTemporaryPassword,
  generateShopId,
  generateSuggestedUsername
}
