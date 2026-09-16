import crypto from 'crypto'
import type { LicensePayload } from './license.types'
import { LICENSE_ED25519_PUBLIC_KEY } from './license.public-key'

/**
 * Serializes an object to a deterministic canonical JSON string.
 * Ensures consistent key ordering so signatures are reproducible.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj)
  }

  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalizeJson(item)).join(',')}]`
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort()
  const keyValues = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalizeJson((obj as Record<string, unknown>)[key])}`
  )
  return `{${keyValues.join(',')}}`
}

/**
 * Verifies the Ed25519 signature of a license payload using the embedded public key.
 */
export function verifyLicenseSignature(
  payload: LicensePayload,
  signatureHex: string,
  publicKeyPem: string = LICENSE_ED25519_PUBLIC_KEY
): boolean {
  try {
    const canonicalData = Buffer.from(canonicalizeJson(payload), 'utf8')
    const signatureBuffer = Buffer.from(signatureHex, 'hex')

    return crypto.verify(null, canonicalData, publicKeyPem, signatureBuffer)
  } catch {
    return false
  }
}

/**
 * Signs a license payload using an Ed25519 private key.
 * (Used by license server or in automated tests).
 */
export function signLicensePayload(payload: LicensePayload, privateKeyPem: string): string {
  const canonicalData = Buffer.from(canonicalizeJson(payload), 'utf8')
  const signatureBuffer = crypto.sign(null, canonicalData, privateKeyPem)
  return signatureBuffer.toString('hex')
}
