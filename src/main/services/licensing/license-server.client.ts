import https from 'https'
import http from 'http'
import { URL } from 'url'
import type { LicenseEdition, SignedLicense } from './license.types'

export interface ProvisionOwnerParams {
  shopId: string
  username: string
  temporaryPassword: string
  recoveryKey: string
  machineId: string
}

export interface ProvisionOwnerResult {
  success: boolean
  message?: string
  shop?: {
    shopId: string
    shopName: string
    businessType: 'WHOLESALE' | 'RETAIL'
    edition: string
  }
  isTemporaryPassword?: boolean
  credentialVersion?: number
}

export interface CheckSyncParams {
  shopId: string
  username: string
  machineId: string
  localCredentialVersion?: number
}

export interface CheckSyncResult {
  success: boolean
  syncPending: boolean
  serverCredentialVersion?: number
  lastAcknowledgedVersion?: number
  isTemporaryPassword?: boolean
  passwordVersion?: number
  recoveryKeyVersion?: number
  message?: string
}

export interface VerifyPasswordResult {
  success: boolean
  serverCredentialVersion?: number
  isTemporaryPassword?: boolean
  passwordVersion?: number
  message?: string
}

export interface VerifyRecoveryKeyResult {
  success: boolean
  serverCredentialVersion?: number
  recoveryKeyVersion?: number
  message?: string
}

export interface AckSyncResult {
  success: boolean
  acknowledgedVersion?: number
  serverCredentialVersion?: number
  inSync?: boolean
  message?: string
}

export interface ILicenseServerClient {
  activate(params: {
    productKey: string
    machineId: string
    product: string
    appVersion: string
  }): Promise<{ success: boolean; signedLicense?: SignedLicense; message?: string }>

  provisionOwner(params: ProvisionOwnerParams): Promise<ProvisionOwnerResult>
  checkSync(params: CheckSyncParams): Promise<CheckSyncResult>
  verifyPassword(params: {
    shopId: string
    username: string
    password: string
    machineId: string
  }): Promise<VerifyPasswordResult>
  verifyRecoveryKey(params: {
    shopId: string
    username: string
    recoveryKey: string
    machineId: string
  }): Promise<VerifyRecoveryKeyResult>
  ackSync(params: {
    shopId: string
    username: string
    machineId: string
    acknowledgedVersion: number
  }): Promise<AckSyncResult>
}

/**
 * Parses an edition from a product key format, e.g. JERP-PRO-XXXX-XXXX-XXXX -> PROFESSIONAL
 */
export function extractEditionFromKey(productKey: string): LicenseEdition {
  const upper = productKey.toUpperCase().trim()
  if (upper.includes('-ENT-') || upper.startsWith('ENT-')) return 'ENTERPRISE'
  if (upper.includes('-BAS-') || upper.startsWith('BAS-')) return 'BASIC'
  return 'PROFESSIONAL'
}

/**
 * Validates product key format (e.g., JERP-PRO-7K4M-92XA-PL8Q or 16-25 char hyphenated alphanumeric).
 */
export function isValidProductKeyFormat(key: string): boolean {
  if (!key) return false
  const trimmed = key.trim().toUpperCase()
  return /^[A-Z0-9]{3,5}(-[A-Z0-9]{3,5}){2,4}$/.test(trimmed)
}

/**
 * Production-ready HTTP/HTTPS client for connecting to the remote licensing API.
 * NO embedded private keys exist in this client or application.
 */
export class HttpLicenseServerClient implements ILicenseServerClient {
  private serverUrl: string

  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl || process.env.LICENSE_SERVER_URL || 'https://jewelry-main.onrender.com'
  }

  setServerUrl(url: string): void {
    this.serverUrl = url
  }

  getServerUrl(): string {
    return this.serverUrl
  }

  private postJson<T>(endpoint: string, postData: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(endpoint, this.serverUrl)
        const isHttps = parsedUrl.protocol === 'https:'
        const transport = isHttps ? https : http

        const bodyString = JSON.stringify(postData)

        const req = transport.request(
          parsedUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(bodyString),
              'User-Agent': 'JewelleryERP-Desktop-Client/1.0'
            },
            timeout: 10000
          },
          (res) => {
            let data = ''
            res.on('data', (chunk) => {
              data += chunk
            })
            res.on('end', () => {
              try {
                const response = JSON.parse(data)
                resolve(response as T)
              } catch {
                resolve({
                  success: false,
                  message: `Invalid JSON response from licensing server (HTTP ${res.statusCode}).`
                } as unknown as T)
              }
            })
          }
        )

        req.on('error', (e) => {
          reject(new Error(`License server connection error: ${e.message}`))
        })

        req.on('timeout', () => {
          req.destroy()
          reject(new Error('Connection to licensing server timed out. Check internet connection.'))
        })

        req.write(bodyString)
        req.end()
      } catch (err) {
        reject(err)
      }
    })
  }

  async activate(params: {
    productKey: string
    machineId: string
    product: string
    appVersion: string
  }): Promise<{ success: boolean; signedLicense?: SignedLicense; message?: string }> {
    const key = params.productKey.trim().toUpperCase()

    if (!isValidProductKeyFormat(key)) {
      return {
        success: false,
        message: 'Invalid product key format. Please check and try again.'
      }
    }

    try {
      const response = await this.postJson<{
        success: boolean
        signedLicense?: SignedLicense
        message?: string
      }>('/api/licenses/activate', {
        productKey: key,
        machineId: params.machineId,
        product: params.product,
        appVersion: params.appVersion
      })

      return response
    } catch (err: unknown) {
      const error = err as Error
      return {
        success: false,
        message: error.message || 'Unable to connect to license server. Please verify your internet connection.'
      }
    }
  }

  async provisionOwner(params: ProvisionOwnerParams): Promise<ProvisionOwnerResult> {
    try {
      const response = await this.postJson<ProvisionOwnerResult>(
        '/api/licenses/provision-owner',
        params as unknown as Record<string, unknown>
      )
      return response
    } catch (err: unknown) {
      const error = err as Error
      return {
        success: false,
        message: error.message || 'Unable to connect to central licensing server during owner provisioning.'
      }
    }
  }

  async checkSync(params: CheckSyncParams): Promise<CheckSyncResult> {
    try {
      const response = await this.postJson<CheckSyncResult>(
        '/api/licenses/check-sync',
        params as unknown as Record<string, unknown>
      )
      return response
    } catch (err: unknown) {
      const error = err as Error
      return {
        success: false,
        syncPending: false,
        message: error.message
      }
    }
  }

  async verifyPassword(params: {
    shopId: string
    username: string
    password: string
    machineId: string
  }): Promise<VerifyPasswordResult> {
    try {
      return await this.postJson<VerifyPasswordResult>(
        '/api/licenses/verify-password',
        params as unknown as Record<string, unknown>
      )
    } catch (err: unknown) {
      const error = err as Error
      return {
        success: false,
        message: error.message || 'Unable to verify password centrally.'
      }
    }
  }

  async verifyRecoveryKey(params: {
    shopId: string
    username: string
    recoveryKey: string
    machineId: string
  }): Promise<VerifyRecoveryKeyResult> {
    try {
      return await this.postJson<VerifyRecoveryKeyResult>(
        '/api/licenses/verify-recovery-key',
        params as unknown as Record<string, unknown>
      )
    } catch (err: unknown) {
      const error = err as Error
      return {
        success: false,
        message: error.message || 'Unable to verify master recovery key centrally.'
      }
    }
  }

  async ackSync(params: {
    shopId: string
    username: string
    machineId: string
    acknowledgedVersion: number
  }): Promise<AckSyncResult> {
    try {
      return await this.postJson<AckSyncResult>(
        '/api/licenses/ack-sync',
        params as unknown as Record<string, unknown>
      )
    } catch (err: unknown) {
      const error = err as Error
      return {
        success: false,
        message: error.message || 'Unable to acknowledge credential synchronization.'
      }
    }
  }
}

export const licenseServerClient = new HttpLicenseServerClient()