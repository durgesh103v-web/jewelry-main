import crypto from 'crypto'
import os from 'os'
import { execSync } from 'child_process'

let cachedMachineId: string | null = null

function getWindowsMachineGuid(): string | null {
  if (process.platform !== 'win32') return null

  try {
    const output = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 2000
    })

    const match = output.match(/MachineGuid\s+REG_SZ\s+([a-zA-Z0-9-]+)/i)
    return match ? match[1].trim() : null
  } catch {
    return null
  }
}

function getPrimaryMacAddress(): string {
  try {
    const interfaces = os.networkInterfaces()
    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name]
      if (!iface) continue

      for (const info of iface) {
        // Skip loopback and dummy interfaces
        if (!info.internal && info.mac && info.mac !== '00:00:00:00:00:00') {
          return info.mac.toLowerCase()
        }
      }
    }
  } catch {
    // Ignore network error
  }
  return 'default-mac'
}

function getNormalizedCpuModel(): string {
  try {
    const cpus = os.cpus()
    if (cpus && cpus.length > 0) {
      // Normalize model string by removing variable clock speeds (e.g. "@ 2.40GHz")
      return (cpus[0].model || '').replace(/@\s*[\d.]+\s*GHz/gi, '').trim()
    }
  } catch {
    // Ignore error
  }
  return 'generic-cpu'
}

/**
 * Generates a stable, deterministic hardware ID for this installation.
 * Robust against RAM, GPU, and peripheral upgrades.
 */
export function generateMachineId(): string {
  if (cachedMachineId) {
    return cachedMachineId
  }

  const windowsGuid = getWindowsMachineGuid()
  const primaryMac = getPrimaryMacAddress()
  const cpuModel = getNormalizedCpuModel()
  const platform = process.platform
  const arch = process.arch
  const hostname = os.hostname().toLowerCase().trim()

  const rawFingerprint = [
    windowsGuid || 'no-guid',
    primaryMac,
    cpuModel,
    platform,
    arch,
    hostname
  ].join('|#|')

  const hashHex = crypto.createHash('sha256').update(rawFingerprint, 'utf8').digest('hex')

  // Format as readable 16-character identifier: MID-XXXX-XXXX-XXXX-XXXX
  const shortPart = hashHex.substring(0, 16).toUpperCase()
  const formatted = `MID-${shortPart.substring(0, 4)}-${shortPart.substring(4, 8)}-${shortPart.substring(8, 12)}-${shortPart.substring(12, 16)}`

  cachedMachineId = formatted
  return formatted
}

export const machineIdentityService = {
  getMachineId(): string {
    return generateMachineId()
  },

  matchesCurrentMachine(targetMachineId: string): boolean {
    if (!targetMachineId) return false
    const current = generateMachineId()
    return current.toUpperCase() === targetMachineId.toUpperCase()
  },

  // For testing only: allows resetting cached machine ID
  _resetCache(): void {
    cachedMachineId = null
  }
}
