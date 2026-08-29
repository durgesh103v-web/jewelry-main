export type OldGoldStatus =
  | 'RECEIVED'
  | 'VALUED'
  | 'EXCHANGED'
  | 'PARTIALLY_EXCHANGED'
  | 'CANCELLED'

export interface OldGoldValuationRequest {
  metalType: string
  grossWeight: number
  lessWeight?: number
  purityName?: string
  tunch?: number
  recoveryPercent?: number
  goldRate?: number
  rateDate?: string
  deductionAmount?: number
}

export interface OldGoldValuationResult {
  weights: {
    grossWeight: number
    lessWeight: number
    netWeight: number
    fineWeight: number
    recoverableFineWeight: number
  }
  purity: {
    purityName?: string
    tunch: number
    recoveryPercent: number
  }
  rate: {
    metalType: string
    goldRate: number
  }
  valuation: {
    metalValue: number
    deductionAmount: number
    valuationAmount: number
  }
  breakdown: string[]
}

export interface OldGoldReceiptRecord {
  id: string
  receiptNumber: string
  customerId?: string | null
  customerName?: string | null
  customerCode?: string | null
  accountId: string
  accountName?: string | null
  receiptDate: string
  metalType: string
  description?: string | null
  grossWeight: number
  lessWeight: number
  netWeight: number
  purityName?: string | null
  tunch: number
  fineWeight: number
  recoveryPercent: number
  recoverableFineWeight: number
  goldRate: number
  metalValue: number
  deductionAmount: number
  valuationAmount: number
  allocatedAmount: number
  unallocatedAmount: number
  status: OldGoldStatus
  notes?: string | null
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface OldGoldReceiptPayload {
  receiptNumber?: string
  customerId?: string
  accountId: string
  receiptDate?: string
  metalType?: string
  description?: string
  grossWeight: number
  lessWeight?: number
  purityName?: string
  tunch?: number
  recoveryPercent?: number
  goldRate?: number
  deductionAmount?: number
  notes?: string
}

export interface OldGoldFilter {
  search?: string
  customerId?: string
  accountId?: string
  metalType?: string
  status?: OldGoldStatus
  startDate?: string
  endDate?: string
}
