export const GENERAL_STATUSES = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive'
} as const

export const DOCUMENT_STATUSES = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected'
} as const

export const PAYMENT_STATUSES = {
  PAID: 'Paid',
  UNPAID: 'Unpaid',
  OVERDUE: 'Overdue',
  PARTIAL: 'Partial'
} as const

export type GeneralStatus = (typeof GENERAL_STATUSES)[keyof typeof GENERAL_STATUSES]
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[keyof typeof DOCUMENT_STATUSES]
export type PaymentStatus = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES]
