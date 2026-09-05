import type {
  QuotationRecord,
  QuotationItemRecord,
  QuotationPayload,
  QuotationItemPayload,
  QuotationFilter,
  QuotationStatus
} from '@shared/types/quotation'
import type { PricingResult, StoneChargeInput, DiamondChargeInput } from '@shared/types/pricing'
import type { LabourRateType } from '@shared/jewelleryFormula'

export type {
  QuotationRecord,
  QuotationItemRecord,
  QuotationPayload,
  QuotationItemPayload,
  QuotationFilter,
  QuotationStatus,
  PricingResult,
  StoneChargeInput,
  DiamondChargeInput,
  LabourRateType
}

export interface QuotationDraftItem {
  tempId: string
  itemId: string
  itemName: string
  itemCode?: string
  description?: string
  stampId?: string
  designId?: string
  barcode?: string
  metalType: string
  purityName?: string
  pcs: number
  grossWeight: number
  packWeight: number
  lessWeight: number
  addWeight: number
  netWeight: number
  fineWeight: number
  tunch: number
  wastage: number
  goldRate: number
  labourRate: number
  labourRateType: LabourRateType
  stoneCharges: StoneChargeInput[]
  diamondCharges: DiamondChargeInput[]
  discountAmount: number
  discountPercent: number
  taxPercent: number
  lineTotal: number
  taxAmount: number
  makingCharges: number
  metalValue: number
  pricingBreakdown: string[]
  isCalculating?: boolean
}

export interface QuotationSummaryTotals {
  totalPcs: number
  totalGrossWeight: number
  totalNetWeight: number
  totalFineWeight: number
  totalMaking: number
  totalMetalValue: number
  totalCharges: number
  discountAmount: number
  taxableAmount: number
  taxAmount: number
  grandTotal: number
  roundedTotal: number
}
