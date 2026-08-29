export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'KARAGIR' | 'OTHER'

export interface PartyContact {
  mobile?: string
  alternateMobile?: string
  email?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
}

export interface PartyTaxInfo {
  gstin?: string
  pan?: string
}
