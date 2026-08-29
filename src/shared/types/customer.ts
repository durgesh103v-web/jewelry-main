export interface CustomerRecord {
  id: string
  customerCode: string
  accountId?: string | null
  accountName?: string | null
  name: string
  displayName?: string | null
  mobile?: string | null
  alternateMobile?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  dateOfBirth?: string | null
  anniversaryDate?: string | null
  gstin?: string | null
  pan?: string | null
  preferredMetal?: string | null
  preferredPurity?: string | null
  notes?: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface CustomerPayload {
  customerCode?: string
  accountId?: string
  name: string
  displayName?: string
  mobile?: string
  alternateMobile?: string
  email?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  dateOfBirth?: string
  anniversaryDate?: string
  gstin?: string
  pan?: string
  preferredMetal?: string
  preferredPurity?: string
  notes?: string
  active?: boolean
  autoCreateAccount?: boolean
  accountGroupId?: string
}

export interface CustomerFilter {
  search?: string
  city?: string
  state?: string
  active?: boolean
}
