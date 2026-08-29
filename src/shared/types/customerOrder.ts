import type { LabourRateType } from '../jewelleryFormula'
import type { PricingResult, StoneChargeInput, DiamondChargeInput } from './pricing'

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'

export interface CustomerOrderItemRecord {
  id: string
  orderId: string
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

export interface CustomerOrderRecord {
  id: string
  orderNumber: string
  quotationId?: string | null
  quotationNumber?: string | null
  customerId?: string | null
  customerName?: string | null
  customerCode?: string | null
  accountId: string
  accountName?: string | null
  orderDate: string
  expectedDeliveryDate?: string | null
  status: OrderStatus
  metalType: string
  totalPcs: number
  totalGrossWeight: number
  totalNetWeight: number
  totalFineWeight: number
  totalMajuri: number
  metalValue: number
  totalCharges: number
  discountAmount: number
  taxableAmount: number
  taxAmount: number
  grandTotal: number
  roundedTotal: number
  advanceAmount: number
  pricingSnapshot?: PricingResult | null
  notes?: string | null
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  items?: CustomerOrderItemRecord[]
}

export interface CustomerOrderItemPayload {
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

export interface CustomerOrderPayload {
  orderNumber?: string
  quotationId?: string
  customerId?: string
  accountId: string
  orderDate?: string
  expectedDeliveryDate?: string
  status?: OrderStatus
  metalType?: string
  advanceAmount?: number
  notes?: string
  items: CustomerOrderItemPayload[]
}

export interface CustomerOrderFilter {
  search?: string
  customerId?: string
  accountId?: string
  status?: OrderStatus
  startDate?: string
  endDate?: string
}
