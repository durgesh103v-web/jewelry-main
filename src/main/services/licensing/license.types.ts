export type LicenseProduct = 'JEWELLERY_ERP'

export type LicenseEdition = 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'

export type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'INVALID' | 'UNLICENSED'

export type LicenseFeature =
  | 'FEATURE_SALES'
  | 'FEATURE_PURCHASE'
  | 'FEATURE_INVENTORY'
  | 'FEATURE_ACCOUNTING'
  | 'FEATURE_REPORTS'
  | 'FEATURE_GST'
  | 'FEATURE_BARCODE'
  | 'FEATURE_JOB_WORK'
  | 'FEATURE_APPROVALS'
  | 'FEATURE_ORDERS'
  | 'FEATURE_ADVANCED_REPORTS'
  | 'FEATURE_CONSIGNMENT'
  | 'FEATURE_MANUFACTURING'
  | 'FEATURE_TAGGING_RFID'

export type LicensePayload = {
  licenseId: string
  product: LicenseProduct
  edition: LicenseEdition
  status: 'ACTIVE' | 'SUSPENDED'
  machineId: string
  customerName?: string
  firmName?: string
  activatedAt: string
  expiresAt: string | null // null for perpetual license
  features: LicenseFeature[]
  version: number
}

export type SignedLicense = {
  payload: LicensePayload
  signature: string // Hex-encoded Ed25519 signature
}

export type StoredLicenseData = {
  signedLicense: SignedLicense
  lastVerifiedTimestamp: number
  storedMachineId: string
  activatedAt: string
}

export type LicenseInfo = {
  licenseId: string
  product: LicenseProduct
  edition: LicenseEdition
  status: LicenseStatus
  machineId: string
  customerName?: string
  firmName?: string
  activatedAt: string
  expiresAt: string | null
  features: LicenseFeature[]
  isExpired: boolean
  daysRemaining: number | null
}

export type LicenseStatusResult = {
  status: LicenseStatus
  isLicensed: boolean
  license: LicenseInfo | null
  machineId: string
  message?: string
}

export type LicenseActivationResult = {
  success: boolean
  status: LicenseStatus
  license?: LicenseInfo
  message: string
}

export const EDITION_FEATURES: Record<LicenseEdition, LicenseFeature[]> = {
  BASIC: [
    'FEATURE_SALES',
    'FEATURE_PURCHASE',
    'FEATURE_INVENTORY',
    'FEATURE_ACCOUNTING',
    'FEATURE_REPORTS',
    'FEATURE_GST'
  ],
  PROFESSIONAL: [
    'FEATURE_SALES',
    'FEATURE_PURCHASE',
    'FEATURE_INVENTORY',
    'FEATURE_ACCOUNTING',
    'FEATURE_REPORTS',
    'FEATURE_GST',
    'FEATURE_BARCODE',
    'FEATURE_JOB_WORK',
    'FEATURE_APPROVALS',
    'FEATURE_ORDERS',
    'FEATURE_ADVANCED_REPORTS'
  ],
  ENTERPRISE: [
    'FEATURE_SALES',
    'FEATURE_PURCHASE',
    'FEATURE_INVENTORY',
    'FEATURE_ACCOUNTING',
    'FEATURE_REPORTS',
    'FEATURE_GST',
    'FEATURE_BARCODE',
    'FEATURE_JOB_WORK',
    'FEATURE_APPROVALS',
    'FEATURE_ORDERS',
    'FEATURE_ADVANCED_REPORTS',
    'FEATURE_CONSIGNMENT',
    'FEATURE_MANUFACTURING',
    'FEATURE_TAGGING_RFID'
  ]
}
