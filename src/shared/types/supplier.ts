export interface SupplierRecord {
  id: string
  supplierCode: string
  accountId?: string | null
  accountName?: string | null
  name: string
  displayName?: string | null
  supplierType?: string | null
  mobile?: string | null
  alternateMobile?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  gstin?: string | null
  pan?: string | null
  notes?: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface SupplierPayload {
  supplierCode?: string
  accountId?: string
  name: string
  displayName?: string
  supplierType?: string
  mobile?: string
  alternateMobile?: string
  email?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  gstin?: string
  pan?: string
  notes?: string
  active?: boolean
  autoCreateAccount?: boolean
  accountGroupId?: string
}

export interface SupplierFilter {
  search?: string
  supplierType?: string
  city?: string
  state?: string
  active?: boolean
}
