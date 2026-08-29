export interface ReportDateFilter {
  startDate?: string
  endDate?: string
  accountId?: string
  customerId?: string
  supplierId?: string
  itemId?: string
  metalType?: string
  search?: string
  page?: number
  limit?: number
}

// 1. Day Book
export interface DayBookRow {
  id: string
  entryDate: string
  sourceType: string
  sourceId: string
  billNo: string
  accountId: string
  accountName: string
  groupName: string
  metalType?: string | null
  cashNave: number // Debit
  cashJama: number // Credit
  bankNave: number
  bankJama: number
  narration?: string | null
  createdAt: string
}

export interface DayBookReport {
  rows: DayBookRow[]
  totalCashNave: number
  totalCashJama: number
  totalBankNave: number
  totalBankJama: number
  netCashMovement: number
  netBankMovement: number
}

// 2. Cash Book
export interface CashBookRow {
  id: string
  entryDate: string
  sourceType: string
  sourceId: string
  billNo: string
  accountId: string
  accountName: string
  narration?: string | null
  cashIn: number  // Jama
  cashOut: number // Nave
  runningBalance: number
}

export interface CashBookReport {
  openingBalance: number
  rows: CashBookRow[]
  totalCashIn: number
  totalCashOut: number
  closingBalance: number
}

// 3. Bank Book
export interface BankBookRow {
  id: string
  entryDate: string
  sourceType: string
  sourceId: string
  billNo: string
  accountId: string
  accountName: string
  narration?: string | null
  bankIn: number  // Jama
  bankOut: number // Nave
  runningBalance: number
}

export interface BankBookReport {
  openingBalance: number
  rows: BankBookRow[]
  totalBankIn: number
  totalBankOut: number
  closingBalance: number
}

// 4. Sales Register
export interface SalesRegisterRow {
  id: string
  invoiceNumber: string
  invoiceDate: string
  customerId?: string | null
  customerName?: string | null
  accountId: string
  accountName: string
  metalType: string
  totalPcs: number
  grossWeight: number
  netWeight: number
  fineWeight: number
  subtotal: number
  discountAmount: number
  taxableAmount: number
  taxAmount: number
  grandTotal: number
  paidAmount: number
  balanceDue: number
  status: string
}

export interface SalesRegisterReport {
  rows: SalesRegisterRow[]
  totalPcs: number
  totalGrossWeight: number
  totalNetWeight: number
  totalFineWeight: number
  totalSubtotal: number
  totalDiscount: number
  totalTaxable: number
  totalTax: number
  totalGrandTotal: number
  totalPaid: number
  totalBalanceDue: number
}

// 5. Purchase Register
export interface PurchaseRegisterRow {
  id: string
  invoiceNumber: string
  supplierInvoiceNumber?: string | null
  invoiceDate: string
  supplierId?: string | null
  supplierName?: string | null
  accountId: string
  accountName: string
  metalType: string
  totalPcs: number
  grossWeight: number
  netWeight: number
  fineWeight: number
  subtotal: number
  discountAmount: number
  taxableAmount: number
  taxAmount: number
  grandTotal: number
  paidAmount: number
  balanceDue: number
  status: string
}

export interface PurchaseRegisterReport {
  rows: PurchaseRegisterRow[]
  totalPcs: number
  totalGrossWeight: number
  totalNetWeight: number
  totalFineWeight: number
  totalSubtotal: number
  totalDiscount: number
  totalTaxable: number
  totalTax: number
  totalGrandTotal: number
  totalPaid: number
  totalBalanceDue: number
}

// 6. Return Registers
export interface ReturnRegisterRow {
  id: string
  returnNumber: string
  returnType: 'SALES_RETURN' | 'PURCHASE_RETURN'
  noteType: 'CREDIT_NOTE' | 'DEBIT_NOTE'
  originalInvoiceNumber?: string | null
  returnDate: string
  partyName: string
  accountName: string
  metalType: string
  totalPcs: number
  grossWeight: number
  netWeight: number
  fineWeight: number
  returnTotal: number
  refundAmount: number
  adjustmentAmount: number
  status: string
  reason?: string | null
}

export interface ReturnRegisterReport {
  rows: ReturnRegisterRow[]
  totalPcs: number
  totalGrossWeight: number
  totalNetWeight: number
  totalFineWeight: number
  totalReturnAmount: number
  totalRefundAmount: number
  totalAdjustmentAmount: number
}

// 7. Party Ledger
export interface PartyLedgerRow {
  id: string
  entryDate: string
  sourceType: string
  sourceId: string
  billNo: string
  narration?: string | null
  debit: number  // Nave
  credit: number // Jama
  runningBalance: number
}

export interface PartyLedgerReport {
  accountId: string
  accountName: string
  partyName?: string | null
  partyType: 'CUSTOMER' | 'SUPPLIER' | 'GENERAL'
  openingBalance: number
  rows: PartyLedgerRow[]
  totalDebit: number
  totalCredit: number
  closingBalance: number
}

// 8. Outstanding Summary
export interface PartyOutstandingRow {
  accountId: string
  partyId?: string | null
  name: string
  partyType: 'CUSTOMER' | 'SUPPLIER'
  mobile?: string | null
  city?: string | null
  openingBalance: number
  periodDebit: number
  periodCredit: number
  closingBalance: number
  status: 'RECEIVABLE' | 'PAYABLE' | 'SETTLED'
}

export interface PartyOutstandingReport {
  rows: PartyOutstandingRow[]
  totalReceivable: number
  totalPayable: number
  netOutstanding: number
}

// 9. Advances
export interface AdvanceReportRow {
  id: string
  advanceNumber: string
  advanceDate: string
  customerId: string
  customerName: string
  metalType: string
  advanceAmount: number
  allocatedAmount: number
  balanceAmount: number
  rateFixed: boolean
  fixedGoldRate?: number | null
  status: string
}

export interface AdvanceSummaryReport {
  rows: AdvanceReportRow[]
  totalAdvanceAmount: number
  totalAllocatedAmount: number
  totalUnallocatedBalance: number
}

// 10. Old Gold & Exchange
export interface OldGoldReportRow {
  id: string
  receiptNumber: string
  receiptDate: string
  customerId: string
  customerName: string
  metalType: string
  grossWeight: number
  netWeight: number
  fineWeight: number
  purityName?: string | null
  valuationRate: number
  netValuation: number
  exchangeAppliedAmount: number
  cashPaidAmount: number
  balanceAmount: number
  status: string
}

export interface OldGoldSummaryReport {
  rows: OldGoldReportRow[]
  totalGrossWeight: number
  totalNetWeight: number
  totalFineWeight: number
  totalValuation: number
  totalExchangeApplied: number
  totalCashPaid: number
}

export interface MetalExchangeReportRow {
  id: string
  exchangeNumber: string
  exchangeDate: string
  customerId: string
  customerName: string
  salesInvoiceNumber?: string | null
  orderNumber?: string | null
  exchangeAmount: number
  status: string
}

export interface MetalExchangeSummaryReport {
  rows: MetalExchangeReportRow[]
  totalExchangeAmount: number
}

// 11. Stock Movement & Valuation
export interface StockMovementReportRow {
  id: string
  entryDate: string
  sourceType: string
  sourceId: string
  billNo: string
  itemId: string
  itemName: string
  itemCode?: string | null
  metalType: string
  stampName?: string | null
  designName?: string | null
  pcsDelta: number
  grossWeightDelta: number
  netWeightDelta: number
  fineDelta: number
  narration?: string | null
}

export interface StockMovementReport {
  rows: StockMovementReportRow[]
  totalInPcs: number
  totalOutPcs: number
  netPcs: number
  totalInGrossWeight: number
  totalOutGrossWeight: number
  netGrossWeight: number
  totalInFineWeight: number
  totalOutFineWeight: number
  netFineWeight: number
}

export interface StockValuationReportRow {
  itemId: string
  itemName: string
  itemCode?: string | null
  categoryName?: string | null
  metalType: string
  currentPcs: number
  currentGrossWeight: number
  currentNetWeight: number
  currentFineWeight: number
  standardGoldRate: number
  estimatedMetalValue: number
}

export interface StockValuationReport {
  rows: StockValuationReportRow[]
  totalPcs: number
  totalGrossWeight: number
  totalNetWeight: number
  totalFineWeight: number
  totalEstimatedValue: number
}

// 12. Financial Accounting Statements
export interface TrialBalanceRow {
  accountId: string
  accountName: string
  groupName: string
  groupType: string
  openingDebit: number
  openingCredit: number
  periodDebit: number
  periodCredit: number
  closingDebit: number
  closingCredit: number
}

export interface TrialBalanceReport {
  rows: TrialBalanceRow[]
  totalOpeningDebit: number
  totalOpeningCredit: number
  totalPeriodDebit: number
  totalPeriodCredit: number
  totalClosingDebit: number
  totalClosingCredit: number
  isBalanced: boolean
}

export interface ProfitAndLossReport {
  startDate: string
  endDate: string
  salesRevenue: number
  salesReturns: number
  netSales: number
  costOfPurchases: number
  purchaseReturns: number
  netPurchases: number
  directExpenses: number
  grossProfit: number
  indirectExpenses: number
  indirectIncomes: number
  netProfit: number
}

export interface BalanceSheetSection {
  title: string
  rows: { accountName: string; amount: number }[]
  total: number
}

export interface BalanceSheetReport {
  asOfDate: string
  assets: BalanceSheetSection[]
  liabilities: BalanceSheetSection[]
  capital: BalanceSheetSection[]
  totalAssets: number
  totalLiabilitiesAndCapital: number
  isBalanced: boolean
}
