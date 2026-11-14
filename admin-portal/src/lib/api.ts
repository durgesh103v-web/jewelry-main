const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface RequestOptions extends RequestInit {
  data?: unknown
}

export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.status = status
    this.data = data
    this.name = 'ApiError'
  }
}

/**
 * Centralized API client:
 * 1. Automatically includes credentials: 'include' for session cookies
 * 2. Injects anti-CSRF custom header: 'X-Requested-With': 'XMLHttpRequest'
 * 3. Handles JSON serialization and error parsing
 */
export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { data, headers = {}, ...customConfig } = options

  const config: RequestInit = {
    ...customConfig,
    credentials: 'include', // Include HTTP-only session cookies
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // Anti-CSRF protection
      ...headers
    }
  }

  if (data !== undefined) {
    config.body = JSON.stringify(data)
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, config)

  let responseData: any = null
  try {
    responseData = await response.json()
  } catch {
    // If not JSON
  }

  if (!response.ok) {
    const errorMessage = responseData?.message || `Request failed with status ${response.status}`
    throw new ApiError(errorMessage, response.status, responseData)
  }

  return responseData as T
}

export const adminApi = {
  // Authentication
  login: (identifier: string, password: string) =>
    apiRequest<{ success: boolean; admin: any }>('/admin/auth/login', {
      method: 'POST',
      data: { identifier, password }
    }),

  logout: () =>
    apiRequest<{ success: boolean }>('/admin/auth/logout', {
      method: 'POST'
    }),

  getMe: () =>
    apiRequest<{ success: boolean; admin: any }>('/admin/auth/me', {
      method: 'GET'
    }),

  // Dashboard
  getDashboardStats: () =>
    apiRequest<{ success: boolean; stats: any }>('/admin/dashboard/stats', {
      method: 'GET'
    }),

  // Shops
  getShops: (params: { page?: number; limit?: number; search?: string; status?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    return apiRequest<{ success: boolean; total: number; page: number; pages: number; shops: any[] }>(
      `/admin/shops?${query.toString()}`,
      { method: 'GET' }
    )
  },

  getShopById: (id: string) =>
    apiRequest<{ success: boolean; shop: any }>(`/admin/shops/${id}`, {
      method: 'GET'
    }),

  createShop: (data: any) =>
    apiRequest<any>('/admin/shops', {
      method: 'POST',
      data
    }),

  downloadOnboardingPdf: async (credentials: any) => {
    const response = await fetch(`${API_BASE_URL}/admin/shops/generate-onboarding-pdf`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(credentials)
    })

    if (!response.ok) {
      let errMessage = 'Failed to generate PDF'
      try {
        const errJson = await response.json()
        if (errJson.message) errMessage = errJson.message
      } catch {}
      throw new Error(errMessage)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `onboarding-${credentials.shopId || 'credentials'}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  updateShopStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED') =>
    apiRequest<{ success: boolean; shop: any }>(`/admin/shops/${id}/status`, {
      method: 'POST',
      data: { status }
    }),

  // Owner Accounts & Credential Management
  getOwners: (params: { page?: number; limit?: number; search?: string; provisioningStatus?: string; accountStatus?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.search) query.set('search', params.search)
    if (params.provisioningStatus) query.set('provisioningStatus', params.provisioningStatus)
    if (params.accountStatus) query.set('accountStatus', params.accountStatus)
    return apiRequest<{ success: boolean; total: number; page: number; pages: number; owners: any[] }>(
      `/admin/owners?${query.toString()}`,
      { method: 'GET' }
    )
  },

  getOwnerById: (id: string) =>
    apiRequest<{ success: boolean; owner: any; shop: any; license: any; auditLogs: any[] }>(
      `/admin/owners/${id}`,
      { method: 'GET' }
    ),

  resetOwnerPassword: (id: string) =>
    apiRequest<{ success: boolean; message: string; temporaryPassword: string; username: string; shopIdentifier: string }>(
      `/admin/owners/${id}/reset-password`,
      { method: 'POST' }
    ),

  rotateOwnerRecoveryKey: (id: string) =>
    apiRequest<{ success: boolean; message: string; recoveryKey: string; username: string; shopIdentifier: string }>(
      `/admin/owners/${id}/rotate-recovery-key`,
      { method: 'POST' }
    ),

  // Licenses & Machine Management
  getLicenses: (params: { page?: number; limit?: number; search?: string; status?: string; edition?: string; bindingStatus?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    if (params.edition) query.set('edition', params.edition)
    if (params.bindingStatus) query.set('bindingStatus', params.bindingStatus)
    return apiRequest<{ success: boolean; total: number; page: number; pages: number; licenses: any[] }>(
      `/admin/licenses?${query.toString()}`,
      { method: 'GET' }
    )
  },

  getLicenseById: (id: string) =>
    apiRequest<{ success: boolean; license: any; shop: any; auditLogs: any[] }>(
      `/admin/licenses/${id}`,
      { method: 'GET' }
    ),

  resetMachineBinding: (id: string, reason?: string) =>
    apiRequest<{ success: boolean; message: string; license: any }>(
      `/admin/licenses/${id}/reset-machine`,
      {
        method: 'POST',
        data: { reason }
      }
    ),

  updateLicenseStatus: (id: string, status: 'ACTIVE' | 'AVAILABLE' | 'SUSPENDED' | 'REVOKED', reason?: string) =>
    apiRequest<{ success: boolean; message: string; license: any }>(
      `/admin/licenses/${id}/status`,
      {
        method: 'POST',
        data: { status, reason }
      }
    ),

  // Audit Logs
  getAuditLogs: (params: { page?: number; limit?: number; action?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.action) query.set('action', params.action)
    return apiRequest<{ success: boolean; total: number; logs: any[] }>(
      `/admin/audit-logs?${query.toString()}`,
      { method: 'GET' }
    )
  }
}
