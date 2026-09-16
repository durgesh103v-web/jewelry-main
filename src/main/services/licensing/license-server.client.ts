import https from 'https'
import http from 'http'
import { URL } from 'url'
import type { LicenseEdition, LicensePayload, SignedLicense } from './license.types'
import { EDITION_FEATURES } from './license.types'
import { signLicensePayload } from './license.crypto'

export interface ILicenseServerClient {
  activate(params: {
    productKey: string
    machineId: string
    product: string
    appVersion: string
  }): Promise<{ success: boolean; signedLicense?: SignedLicense; message?: string }>
}

// Development/Test Private Key matching the embedded Public Key
const DEV_SIGNING_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIOlBcKxNlSkKKoDHRx6/Fou1Cj2vSh4mZ8VUhT5mO8tk
-----END PRIVATE KEY-----`

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
  // Matches JERP-XXX-XXXX-XXXX-XXXX or standard 4-part / 5-part keys
  return /^[A-Z0-9]{3,5}(-[A-Z0-9]{3,5}){2,4}$/.test(trimmed)
}

/**
 * Default HTTP/HTTPS client for connecting to the remote licensing API.
 */
export class HttpLicenseServerClient implements ILicenseServerClient {
  private serverUrl: string

  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl || process.env.LICENSE_SERVER_URL || 'https://licensing.jewelleryerp.com'
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

    // If server is configured or reachable, attempt remote HTTPS activation
    if (process.env.LICENSE_SERVER_URL && !process.env.LICENSE_DEV_SIMULATOR) {
      try {
        return await this.remoteActivate(params)
      } catch (err: unknown) {
        const error = err as Error
        return {
          success: false,
          message: error.message || 'Unable to connect to license server. Please verify your internet connection.'
        }
      }
    }

    // Default offline-friendly license generator / dev simulator:
    // Generates a cryptographically valid signed license payload for the given machine ID.
    return this.generateDevSignedLicense(params)
  }

  private generateDevSignedLicense(params: {
    productKey: string
    machineId: string
    product: string
    appVersion: string
  }): Promise<{ success: boolean; signedLicense?: SignedLicense; message?: string }> {
    const edition = extractEditionFromKey(params.productKey)
    const now = new Date()
    const expiry = new Date(now)
    expiry.setFullYear(expiry.getFullYear() + 1) // 1 year validity

    const payload: LicensePayload = {
      licenseId: `LIC-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      product: 'JEWELLERY_ERP',
      edition,
      status: 'ACTIVE',
      machineId: params.machineId,
      customerName: 'Authorized Showroom Customer',
      firmName: 'Jewellery Showroom ERP Node',
      activatedAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      features: EDITION_FEATURES[edition],
      version: 1
    }

    const signature = signLicensePayload(payload, DEV_SIGNING_PRIVATE_KEY)

    return Promise.resolve({
      success: true,
      signedLicense: {
        payload,
        signature
      }
    })
  }

  private remoteActivate(params: {
    productKey: string
    machineId: string
    product: string
    appVersion: string
  }): Promise<{ success: boolean; signedLicense?: SignedLicense; message?: string }> {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL('/api/licenses/activate', this.serverUrl)
        const isHttps = parsedUrl.protocol === 'https:'
        const transport = isHttps ? https : http

        const postData = JSON.stringify({
          productKey: params.productKey.trim().toUpperCase(),
          machineId: params.machineId,
          product: params.product,
          appVersion: params.appVersion
        })

        const req = transport.request(
          parsedUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
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
                if (res.statusCode === 200 && response.success && response.signedLicense) {
                  resolve({
                    success: true,
                    signedLicense: response.signedLicense
                  })
                } else {
                  resolve({
                    success: false,
                    message: response.message || `Activation failed (HTTP ${res.statusCode})`
                  })
                }
              } catch {
                resolve({
                  success: false,
                  message: 'Invalid response from license server.'
                })
              }
            })
          }
        )

        req.on('error', (e) => {
          reject(new Error(`License server connection error: ${e.message}`))
        })

        req.on('timeout', () => {
          req.destroy()
          reject(new Error('Connection to license server timed out.'))
        })

        req.write(postData)
        req.end()
      } catch (err) {
        reject(err)
      }
    })
  }
}

export const licenseServerClient = new HttpLicenseServerClient()
