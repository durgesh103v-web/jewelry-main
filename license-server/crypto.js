const crypto = require('crypto')

/**
 * Deterministically serializes JSON object with alphabetical key sorting
 */
function canonicalizeJson(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj)
  }

  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalizeJson(item)).join(',')}]`
  }

  const sortedKeys = Object.keys(obj).sort()
  const keyValues = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalizeJson(obj[key])}`
  )
  return `{${keyValues.join(',')}}`
}

/**
 * Signs a license payload with the Ed25519 private key.
 * Returns a hex-encoded Ed25519 signature.
 */
function signLicensePayload(payload, privateKeyPem) {
  const canonicalData = Buffer.from(canonicalizeJson(payload), 'utf8')
  // Format private key if needed (replace escaped newlines if loaded from .env)
  const normalizedKey = privateKeyPem.replace(/\\n/g, '\n')
  const signatureBuffer = crypto.sign(null, canonicalData, normalizedKey)
  return signatureBuffer.toString('hex')
}

/**
 * Generates formatted Product Keys (e.g. JERP-ENT-A8B9-C3D4-E5F6)
 */
function generateFormattedProductKey(edition = 'PROFESSIONAL') {
  const prefixMap = {
    BASIC: 'BAS',
    PROFESSIONAL: 'PRO',
    ENTERPRISE: 'ENT'
  }
  const tag = prefixMap[edition] || 'PRO'
  const randomChars = (len) => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' // Base32 unambiguous
    let result = ''
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  return `JERP-${tag}-${randomChars(4)}-${randomChars(4)}-${randomChars(4)}`
}

module.exports = {
  canonicalizeJson,
  signLicensePayload,
  generateFormattedProductKey
}
