import type { LabourRateType } from '../jewelleryFormula'
import type { PricingResult, StoneChargeInput, DiamondChargeInput } from './pricing'

export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'CONVERTED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'CANCELLED'

export interface QuotationItemRecord {
  id: string
  quotationId: string
  itemId: string
  itemName?: string | null
  description?: string | null
  stampId?: string | null
  designId?: string | null
  barcode?: string | null
  pcs: number
  grossWeight: number
  packWeight: number
  lessWeight: number
  addWeight: number
  netWeight: number
  fineWeight: number
  metalType: string
  purityName?: string | null
  tunch: number
  wastage: number
  hishob: number
  goldRate: number
  metalValue: number
  labourRate: number
  labourRateType: LabourRateType
  makingCharges: number
  stoneCharges: number
  diamondCharges: number
  discountAmount: number
  taxableAmount: number
  taxPercent: number
  taxAmount: number
  lineTotal: number
  pricingBreakdown?: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface QuotationRecord {
  id: string
  quotationNumber: string
  customerId?: string | null
  customerName?: string | null
  customerCode?: string | null
  accountId: string
  accountName?: string | null
  quotationDate: string
  validUntil?: string | null
  status: QuotationStatus
  metalType: string
  totalPcs: number
  totalGrossWeight: number
  totalNetWeight: number
  totalFineWeight: number
  totalMajuri: number
  metalRateApplied: number
  metalValue: number
  totalCharges: number
  discountAmount: number
  taxableAmount: number
  taxAmount: number
  grandTotal: number
  roundedTotal: number
  pricingSnapshot?: PricingResult | null
  notes?: string | null
  convertedOrderId?: string | null
  convertedSaleId?: string | null
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  items?: QuotationItemRecord[]
}

export interface QuotationItemPayload {
  itemId: string
  description?: string
  stampId?: string
  designId?: string
  barcode?: string
  pcs: number
  grossWeight: number
  packWeight?: number
  lessWeight?: number
  addWeight?: number
  metalType?: string
  purityName?: string
  tunch?: number
  wastage?: number
  goldRate?: number
  labourRate?: number
  labourRateType?: LabourRateType
  stoneCharges?: StoneChargeInput[]
  diamondCharges?: DiamondChargeInput[]
  discountAmount?: number
  discountPercent?: number
  taxPercent?: number
}

export interface QuotationPayload {
  quotationNumber?: string
  customerId?: string
  accountId: string
  quotationDate?: string
  validUntil?: string
  status?: QuotationStatus
  metalType?: string
  notes?: string
  items: QuotationItemPayload[]
}

export interface QuotationFilter {
  search?: string
  customerId?: string
  accountId?: string
  status?: QuotationStatus
  startDate?: string
  endDate?: string
}
