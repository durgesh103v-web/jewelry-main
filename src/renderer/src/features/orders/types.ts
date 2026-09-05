import type {
  CustomerOrderRecord,
  CustomerOrderItemRecord,
  CustomerOrderPayload,
  CustomerOrderItemPayload,
  CustomerOrderFilter,
  OrderStatus
} from '@shared/types/customerOrder'
import type { PricingResult, StoneChargeInput, DiamondChargeInput } from '@shared/types/pricing'
import type { LabourRateType } from '@shared/jewelleryFormula'

export type {
  CustomerOrderRecord,
  CustomerOrderItemRecord,
  CustomerOrderPayload,
  CustomerOrderItemPayload,
  CustomerOrderFilter,
  OrderStatus,
  PricingResult,
  StoneChargeInput,
  DiamondChargeInput,
  LabourRateType
}

export interface OrderDraftItem {
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

export interface OrderSummaryTotals {
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
  advanceAmount: number
}
