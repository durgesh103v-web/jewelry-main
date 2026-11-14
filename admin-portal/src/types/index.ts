export interface AdminUser {
  id: string
  username: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN'
  status: 'ACTIVE' | 'LOCKED' | 'SUSPENDED'
  lastLoginAt?: string
  createdAt?: string
}

export interface DashboardStats {
  shops: {
    total: number
    active: number
    suspended: number
    archived: number
  }
  licenses: {
    total: number
    active: number
    available: number
    expired: number
    revoked: number
  }
  recentShops: Array<{
    _id: string
    shopId: string
    shopName: string
    ownerName: string
    phone: string
    status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
    createdAt: string
  }>
  recentAuditLogs: Array<{
    _id: string
    adminUsername: string
    action: string
    targetType: string
    targetId?: string
    createdAt: string
  }>
}

export interface ShopRecord {
  _id: string
  shopId: string
  shopName: string
  ownerName: string
  phone: string
  email?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  gstin?: string
  businessType: 'WHOLESALE' | 'RETAIL'
  edition: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
  maxAllowedMachines: number
  notes?: string
  createdAt: string
  ownerAccountId?: {
    username: string
    isProvisioned: boolean
    isTemporaryPassword: boolean
    provisionedAt?: string
  }
  licenseId?: {
    productKeyMasked: string
    status: string
    boundMachineId?: string
    expiresAt?: string
    activations?: Array<unknown>
  }
}

export interface ActivationRecord {
  machineId: string
  activatedAt: string
  ipAddress?: string
  appVersion?: string
}

export interface LicenseRecord {
  _id: string
  shopId?: {
    _id: string
    shopId: string
    shopName: string
    ownerName: string
    phone: string
    email?: string
    status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
    edition: string
    businessType: string
    maxAllowedMachines: number
    ownerAccountId?: {
      username: string
      isProvisioned: boolean
    }
  }
  productKeyMasked: string
  edition: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'
  status: 'AVAILABLE' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED' | 'ARCHIVED'
  customerName?: string
  customerEmail?: string
  firmName?: string
  phone?: string
  boundMachineId?: string | null
  maxAllowedMachines: number
  activations: ActivationRecord[]
  activatedAt?: string
  expiresAt?: string | null
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  [key: string]: unknown
}

export interface CreateShopPayload {
  shopName: string
  ownerName: string
  phone: string
  email?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  gstin?: string
  businessType: 'RETAIL' | 'WHOLESALE'
  edition: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'
  maxAllowedMachines?: number
  validityDays?: number | null
  customUsername?: string
  notes?: string
}

export interface OneTimeCredentials {
  shopId: string
  shopName: string
  ownerName: string
  username: string
  temporaryPassword: string
  recoveryKey: string
  productKey: string
  edition: string
  maxAllowedMachines?: number
  warning: string
}

export interface CreateShopResponse {
  success: boolean
  message: string
  shop: {
    id: string
    shopId: string
    shopName: string
    ownerName: string
    businessType: string
    edition: string
    status: string
    createdAt: string
  }
  oneTimeCredentials: OneTimeCredentials
}

export interface OwnerAccountRecord {
  _id: string
  shopId: {
    _id: string
    shopId: string
    shopName: string
    ownerName: string
    phone: string
    email?: string
    status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
    edition: string
    businessType: string
    maxAllowedMachines: number
    licenseId?: {
      productKeyMasked: string
      status: string
      boundMachineId?: string
    }
    createdAt: string
  }
  shopIdentifier: string
  username: string
  isTemporaryPassword: boolean
  isProvisioned: boolean
  provisionedAt?: string
  provisionedMachineId?: string
  lastPasswordChangeAt?: string
  createdAt: string
  updatedAt: string
}
