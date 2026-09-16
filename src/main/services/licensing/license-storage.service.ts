import { app, safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { SignedLicense, StoredLicenseData } from './license.types'
import { generateMachineId } from './machine-identity.service'

function getLicenseDirPath(): string {
  const baseDir = app?.getPath
    ? app.getPath('userData')
    : process.env.APPDATA
      ? path.join(process.env.APPDATA, 'jewellery-erp-desktop')
      : '.'
  return path.join(baseDir, 'license')
}

function getLicenseFilePath(): string {
  return path.join(getLicenseDirPath(), 'license.dat')
}

// Fallback AES-256-GCM encryption when Electron safeStorage DPAPI is unavailable (e.g. CI/Tests)
function fallbackEncrypt(plaintext: string): Buffer {
  const key = crypto.createHash('sha256').update(`fallback-key-${generateMachineId()}`).digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Prefix with 0x01 indicator, 12-byte IV, 16-byte Tag, followed by encrypted ciphertext
  return Buffer.concat([Buffer.from([0x01]), iv, tag, encrypted])
}

function fallbackDecrypt(buffer: Buffer): string {
  if (buffer.length < 29 || buffer[0] !== 0x01) {
    throw new Error('Invalid fallback encrypted format')
  }
  const key = crypto.createHash('sha256').update(`fallback-key-${generateMachineId()}`).digest()
  const iv = buffer.subarray(1, 13)
  const tag = buffer.subarray(13, 29)
  const ciphertext = buffer.subarray(29)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8')
}

function encryptString(text: string): Buffer {
  if (safeStorage && safeStorage.isEncryptionAvailable && safeStorage.isEncryptionAvailable()) {
    try {
      const dpapiBuffer = safeStorage.encryptString(text)
      // Prefix 0x00 for DPAPI buffer
      return Buffer.concat([Buffer.from([0x00]), dpapiBuffer])
    } catch {
      // Fallback if safeStorage fails
    }
  }
  return fallbackEncrypt(text)
}

function decryptString(buffer: Buffer): string {
  if (buffer.length > 1 && buffer[0] === 0x00 && safeStorage?.decryptString) {
    try {
      return safeStorage.decryptString(buffer.subarray(1))
    } catch {
      // Fall through
    }
  }
  return fallbackDecrypt(buffer)
}

export const licenseStorageService = {
  getFilePath(): string {
    return getLicenseFilePath()
  },

  hasLicenseFile(): boolean {
    return fs.existsSync(getLicenseFilePath())
  },

  saveLicense(signedLicense: SignedLicense, machineId: string): void {
    const dir = getLicenseDirPath()
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const data: StoredLicenseData = {
      signedLicense,
      lastVerifiedTimestamp: Date.now(),
      storedMachineId: machineId,
      activatedAt: new Date().toISOString()
    }

    const json = JSON.stringify(data)
    const encrypted = encryptString(json)
    fs.writeFileSync(getLicenseFilePath(), encrypted)
  },

  loadLicense(): StoredLicenseData | null {
    const filePath = getLicenseFilePath()
    if (!fs.existsSync(filePath)) {
      return null
    }

    try {
      const encryptedBuffer = fs.readFileSync(filePath)
      const json = decryptString(encryptedBuffer)
      const data = JSON.parse(json) as StoredLicenseData

      if (!data.signedLicense || !data.signedLicense.payload || !data.signedLicense.signature) {
        return null
      }

      return data
    } catch {
      return null
    }
  },

  updateLastVerifiedTimestamp(timestamp: number): void {
    const existing = this.loadLicense()
    if (!existing) return

    existing.lastVerifiedTimestamp = timestamp
    const json = JSON.stringify(existing)
    const encrypted = encryptString(json)
    fs.writeFileSync(getLicenseFilePath(), encrypted)
  },

  clearLicense(): void {
    const filePath = getLicenseFilePath()
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
      } catch {
        // Ignore deletion errors
      }
    }
  }
}
