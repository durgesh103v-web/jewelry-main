export interface GoldRateRecord {
  id: string
  metalType: string
  purityId?: string | null
  purityName: string
  purityKarat?: string | null
  fineness: number
  ratePerGram: number
  effectiveDate: string
  effectiveTime: string
  notes?: string | null
  active: boolean
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface GoldRatePayload {
  metalType: string
  purityId?: string
  purityName: string
  purityKarat?: string
  fineness?: number
  ratePerGram: number
  effectiveDate?: string
  effectiveTime?: string
  notes?: string
  active?: boolean
}

export interface GoldRateFilter {
  metalType?: string
  effectiveDate?: string
  active?: boolean
}
