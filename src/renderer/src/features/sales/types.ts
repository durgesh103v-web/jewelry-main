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

export interface PosBillItem extends SalesInvoiceItemPayload {
  id: string
  itemName: string
  itemCode?: string
  pricingResult?: PricingResult
}

export interface PosPaymentLine extends SalesInvoicePaymentPayload {
  id: string
}

export interface PosBillingState {
  customer: CustomerRecord | null
  order: CustomerOrderRecord | null
  items: PosBillItem[]
  availableAdvances: CustomerAdvanceRecord[]
  selectedAdvanceIds: string[]
  availableExchanges: MetalExchangeRecord[]
  selectedExchangeIds: string[]
  payments: PosPaymentLine[]
  metalType: string
  notes: string
  isCalculating: boolean
  isSubmitting: boolean
  error: string | null
  completedInvoice: SalesInvoiceRecord | null
}
