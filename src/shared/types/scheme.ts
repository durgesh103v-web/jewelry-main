export type SchemeType = 'MONEY_BASED' | 'GOLD_WEIGHT_BASED'
export type SchemeInstallmentType = 'FIXED' | 'VARIABLE'
export type SchemeBonusType = 'FIXED_AMOUNT' | 'PERCENTAGE' | 'ONE_MONTH_INSTALLMENT' | 'NONE'

export type SchemeAccountStatus = 'ACTIVE' | 'MATURED' | 'REDEEMED' | 'CANCELLED' | 'CLOSED'
export type SchemeInstallmentStatus = 'DUE' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'WAIVED'

export interface SchemeMasterRecord {
  id: string
  schemeCode: string
  schemeName: string
  schemeType: SchemeType
  durationMonths: number
  installmentType: SchemeInstallmentType
  fixedInstallmentAmount: number
  bonusType: SchemeBonusType
  bonusValue: number
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSchemePayload {
  schemeCode?: string
  schemeName: string
  schemeType: SchemeType
  durationMonths: number
  installmentType: SchemeInstallmentType
  fixedInstallmentAmount?: number
  bonusType: SchemeBonusType
  bonusValue?: number
  description?: string
}

export interface SchemeAccountRecord {
  id: string
  accountNumber: string
  schemeId: string
  schemeName: string
  schemeType: SchemeType
  customerId: string
  customerName: string
  customerMobile?: string | null
  startDate: string
  maturityDate: string
  installmentAmount: number
  status: SchemeAccountStatus
  installmentsExpected: number
  installmentsPaid: number
  totalAmountPaid: number
  bonusAmount: number
  goldEntitlementGrams: number
  totalRedeemedAmount: number
  balanceAmount: number
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface EnrollCustomerPayload {
  schemeId: string
  customerId: string
  startDate?: string
  installmentAmount?: number
  notes?: string
}

export interface SchemeInstallmentRecord {
  id: string
  schemeAccountId: string
  installmentNumber: number
  dueDate: string
  paidDate?: string | null
  dueAmount: number
  paidAmount: number
  goldRate: number
  goldEntitlementGrams: number
  paymentMethod: string
  paymentReference?: string | null
  status: SchemeInstallmentStatus
  notes?: string | null
  createdAt: string
}

export interface PayInstallmentPayload {
  schemeAccountId: string
  installmentNumber?: number
  amount: number
  paymentMethod?: string
  paymentReference?: string
  paidDate?: string
  notes?: string
}

export interface SchemeRedemptionRecord {
  id: string
  redemptionNumber: string
  schemeAccountId: string
  customerId: string
  customerName?: string
  redemptionDate: string
  redeemedAmount: number
  bonusAmountApplied: number
  goldGramsRedeemed: number
  salesInvoiceId?: string | null
  status: 'COMPLETED' | 'REVERSED'
  notes?: string | null
  createdAt: string
}

export interface RedeemSchemePayload {
  schemeAccountId: string
  redeemedAmount: number
  salesInvoiceId?: string
  notes?: string
}

export interface SchemeRefundRecord {
  id: string
  refundNumber: string
  schemeAccountId: string
  customerId: string
  refundDate: string
  refundAmount: number
  deductionAmount: number
  paymentMethod: string
  paymentReference?: string | null
  notes?: string | null
  createdAt: string
}

export interface RefundSchemePayload {
  schemeAccountId: string
  refundAmount: number
  deductionAmount?: number
  paymentMethod?: string
  paymentReference?: string
  notes?: string
}

export interface SchemeTimelineEventRecord {
  id: string
  schemeAccountId: string
  eventType: string
  description: string
  performedBy: string
  createdAt: string
}

export interface SchemeDashboardSummary {
  activeSchemes: number
  dueThisMonth: number
  overdueInstallments: number
  maturingSoon: number
  maturedSchemes: number
  totalDeposits: number
  totalSchemeLiability: number
  totalRedemptions: number
}
