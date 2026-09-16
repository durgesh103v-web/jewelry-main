import type {
  LicenseActivationResult,
  LicenseFeature,
  LicenseInfo,
  LicenseStatus,
  LicenseStatusResult
} from './license.types'
import { verifyLicenseSignature } from './license.crypto'
import { machineIdentityService } from './machine-identity.service'
import { licenseStorageService } from './license-storage.service'
import { licenseServerClient, type ILicenseServerClient, isValidProductKeyFormat } from './license-server.client'

// Grace period for clock jitter: 24 hours in milliseconds
const CLOCK_ROLLBACK_TOLERANCE_MS = 24 * 60 * 60 * 1000

class LicenseService {
  private serverClient: ILicenseServerClient

  constructor(client: ILicenseServerClient = licenseServerClient) {
    this.serverClient = client
  }

  setServerClient(client: ILicenseServerClient): void {
    this.serverClient = client
  }

  getMachineId(): string {
    return machineIdentityService.getMachineId()
  }

  /**
   * Validates the local license on disk.
   * Completely offline, no internet connection required.
   */
  validateLocalLicense(): LicenseStatusResult {
    const machineId = this.getMachineId()

    if (!licenseStorageService.hasLicenseFile()) {
      return {
        status: 'UNLICENSED',
        isLicensed: false,
        license: null,
        machineId,
        message: 'No license found. Initial activation is required.'
      }
    }

    const storedData = licenseStorageService.loadLicense()
    if (!storedData || !storedData.signedLicense) {
      return {
        status: 'INVALID',
        isLicensed: false,
        license: null,
        machineId,
        message: 'License file is corrupted or cannot be read.'
      }
    }

    const { payload, signature } = storedData.signedLicense

    // 1. Verify Ed25519 Cryptographic Signature
    const isSignatureValid = verifyLicenseSignature(payload, signature)
    if (!isSignatureValid) {
      return {
        status: 'INVALID',
        isLicensed: false,
        license: null,
        machineId,
        message: 'Cryptographic signature verification failed. License has been tampered with.'
      }
    }

    // 2. Verify Machine Binding
    if (!machineIdentityService.matchesCurrentMachine(payload.machineId)) {
      return {
        status: 'INVALID',
        isLicensed: false,
        license: null,
        machineId,
        message: 'License machine mismatch. This license is bound to another device.'
      }
    }

    // 3. Verify Server Status
    if (payload.status === 'SUSPENDED') {
      return {
        status: 'SUSPENDED',
        isLicensed: false,
        license: null,
        machineId,
        message: 'This license has been suspended.'
      }
    }

    // 4. Anti-Clock Rollback Detection
    const now = Date.now()
    if (storedData.lastVerifiedTimestamp && now < storedData.lastVerifiedTimestamp - CLOCK_ROLLBACK_TOLERANCE_MS) {
      return {
        status: 'INVALID',
        isLicensed: false,
        license: null,
        machineId,
        message: 'System clock tampering detected. Please correct your system clock.'
      }
    }

    // Update monotonic last-verified timestamp
    licenseStorageService.updateLastVerifiedTimestamp(Math.max(now, storedData.lastVerifiedTimestamp || 0))

    // 5. Expiry Check
    let isExpired = false
    let daysRemaining: number | null = null

    if (payload.expiresAt) {
      const expiryDate = new Date(payload.expiresAt)
      const diffMs = expiryDate.getTime() - now
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

      if (diffMs <= 0) {
        isExpired = true
      }
    }

    const currentStatus: LicenseStatus = isExpired ? 'EXPIRED' : 'ACTIVE'

    const licenseInfo: LicenseInfo = {
      licenseId: payload.licenseId,
      product: payload.product,
      edition: payload.edition,
      status: currentStatus,
      machineId: payload.machineId,
      customerName: payload.customerName,
      firmName: payload.firmName,
      activatedAt: payload.activatedAt,
      expiresAt: payload.expiresAt,
      features: payload.features || [],
      isExpired,
      daysRemaining
    }

    return {
      status: currentStatus,
      isLicensed: !isExpired,
      license: licenseInfo,
      machineId,
      message: isExpired ? 'Your license has expired. Please renew your subscription.' : undefined
    }
  }

  getLicenseStatus(): LicenseStatusResult {
    return this.validateLocalLicense()
  }

  getLicenseInfo(): LicenseInfo | null {
    const status = this.getLicenseStatus()
    return status.license
  }

  isFeatureLicensed(feature: LicenseFeature): boolean {
    const status = this.getLicenseStatus()
    if (!status.isLicensed || !status.license) {
      return false
    }
    return status.license.features.includes(feature)
  }

  /**
   * Activates a product key.
   * Requires network access only during this initial step.
   */
  async activateLicense(productKey: string): Promise<LicenseActivationResult> {
    const trimmedKey = (productKey || '').trim().toUpperCase()

    if (!isValidProductKeyFormat(trimmedKey)) {
      return {
        success: false,
        status: 'INVALID',
        message: 'Invalid product key format. Please enter a valid key (e.g. JERP-PRO-7K4M-92XA-PL8Q).'
      }
    }

    const machineId = this.getMachineId()

    try {
      const response = await this.serverClient.activate({
        productKey: trimmedKey,
        machineId,
        product: 'JEWELLERY_ERP',
        appVersion: '1.0.0'
      })

      if (!response.success || !response.signedLicense) {
        return {
          success: false,
          status: 'UNLICENSED',
          message: response.message || 'Activation failed. Please check your product key and internet connection.'
        }
      }

      const { payload, signature } = response.signedLicense

      // Validate signature returned by server
      if (!verifyLicenseSignature(payload, signature)) {
        return {
          success: false,
          status: 'INVALID',
          message: 'Server returned an invalid license signature.'
        }
      }

      // Validate machine binding returned by server
      if (!machineIdentityService.matchesCurrentMachine(payload.machineId)) {
        return {
          success: false,
          status: 'INVALID',
          message: 'Server license machine binding does not match this device.'
        }
      }

      // Store license locally with DPAPI encryption
      licenseStorageService.saveLicense(response.signedLicense, machineId)

      // Re-validate to refresh memory state
      const validation = this.validateLocalLicense()

      return {
        success: validation.isLicensed,
        status: validation.status,
        license: validation.license ?? undefined,
        message: 'Jewellery ERP activated successfully.'
      }
    } catch (err: unknown) {
      const error = err as Error
      return {
        success: false,
        status: 'UNLICENSED',
        message: error.message || 'Unable to connect to license activation server.'
      }
    }
  }

  deactivateLicense(): { success: boolean } {
    licenseStorageService.clearLicense()
    return { success: true }
  }
}

export const licenseService = new LicenseService()
