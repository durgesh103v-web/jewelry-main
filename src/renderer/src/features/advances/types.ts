import type {
  CustomerAdvanceRecord,
  CustomerAdvancePayload,
  AdvanceAllocationRecord,
  AdvanceAllocationPayload,
  CustomerAdvanceFilter,
  OrderAdvanceSummary,
  AdvanceStatus,
  PaymentMethod
} from '@shared/types/advance'

export type {
  CustomerAdvanceRecord,
  CustomerAdvancePayload,
  AdvanceAllocationRecord,
  AdvanceAllocationPayload,
  CustomerAdvanceFilter,
  OrderAdvanceSummary,
  AdvanceStatus,
  PaymentMethod
}

export interface AdvanceSummaryKPIs {
  totalCollected: number
  totalAvailable: number
  totalAllocated: number
  activeCount: number
}
