import type {
  SalesInvoiceItemPayload,
  SalesInvoicePaymentPayload,
  SalesInvoiceRecord
} from '@shared/types/salesInvoice'
import type { CustomerRecord } from '@shared/types/customer'
import type { CustomerOrderRecord } from '@shared/types/customerOrder'
import type { CustomerAdvanceRecord } from '@shared/types/advance'
import type { MetalExchangeRecord } from '@shared/types/metalExchange'
import type { PricingResult } from '@shared/types/pricing'

export type ItemPricingStatus = 'CALCULATING' | 'READY' | 'ERROR'

export type PosLifecycleStage =
  | 'EMPTY'
  | 'CUSTOMER_SELECTED'
  | 'ITEMS_ADDED'
  | 'PRICED'
  | 'READY_FOR_PAYMENT'
  | 'PAYMENT_ENTRY'
  | 'CHECKOUT_CONFIRMATION'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'ERROR'

export interface PosBillItem extends SalesInvoiceItemPayload {
  id: string
  itemName: string
  itemCode?: string
  huid?: string
  diamondCarats?: number
  diamondPcs?: number
  stoneAmount?: number
  makingDiscount?: number
  pricingResult?: PricingResult
  pricingStatus?: ItemPricingStatus
  pricingError?: string
}

export interface PosPaymentLine extends SalesInvoicePaymentPayload {
  id: string
}

export interface PosBillingState {
  lifecycleStage: PosLifecycleStage
  customer: CustomerRecord | null
  salespersonId: string
  salespersonName: string
  deliveryStatus: string
  order: CustomerOrderRecord | null
  items: PosBillItem[]
  availableAdvances: CustomerAdvanceRecord[]
  selectedAdvanceIds: string[]
  availableExchanges: MetalExchangeRecord[]
  selectedExchangeIds: string[]
  payments: PosPaymentLine[]
  metalType: string
  notes: string
  invoiceDiscount: number
  isCalculating: boolean
  isSubmitting: boolean
  error: string | null
  completedInvoice: SalesInvoiceRecord | null
}
