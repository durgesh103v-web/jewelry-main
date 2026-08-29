export type TaxMode = 'INTRA_STATE' | 'INTER_STATE'

export interface GstState {
  code: string
  name: string
  tinCode: string
}

export interface GstHsnCode {
  id: string
  hsnCode: string
  description: string
  defaultGstRate: number
  type: 'GOODS' | 'SERVICES'
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface GstTaxRate {
  id: string
  code: string
  name: string
  igstRate: number
  cgstRate: number
  sgstRate: number
  cessRate: number
  isDefault: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface TaxCalculationRequest {
  taxableAmount: number
  businessStateCode?: string
  partyStateCode?: string
  placeOfSupply?: string
  taxRateCode?: string
  hsnCode?: string
  customTaxPercent?: number
}

export interface TaxCalculationResult {
  taxMode: TaxMode
  taxableAmount: number
  taxPercent: number
  cgstRate: number
  sgstRate: number
  igstRate: number
  cessRate: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  cessAmount: number
  totalTaxAmount: number
  finalAmount: number
}

export interface Gstr1B2BInvoice {
  gstin: string
  customerName: string
  invoiceNumber: string
  invoiceDate: string
  invoiceValue: number
  placeOfSupply: string
  reverseCharge: boolean
  taxableValue: number
  taxRate: number
  igstAmount: number
  cgstAmount: number
  sgstAmount: number
  cessAmount: number
}

export interface Gstr1B2CSummary {
  placeOfSupply: string
  taxRate: number
  taxableValue: number
  cessAmount: number
  igstAmount: number
  cgstAmount: number
  sgstAmount: number
}

export interface Gstr1CreditNote {
  gstin?: string | null
  partyName: string
  creditNoteNumber: string
  creditNoteDate: string
  originalInvoiceNumber: string
  originalInvoiceDate?: string | null
  noteType: 'CREDIT_NOTE' | 'DEBIT_NOTE'
  placeOfSupply: string
  reverseCharge: boolean
  taxableValue: number
  taxRate: number
  igstAmount: number
  cgstAmount: number
  sgstAmount: number
  cessAmount: number
}

export interface Gstr1Report {
  startDate: string
  endDate: string
  b2bInvoices: Gstr1B2BInvoice[]
  b2cSummaries: Gstr1B2CSummary[]
  creditDebitNotes: Gstr1CreditNote[]
  totalTaxableValue: number
  totalIgst: number
  totalCgst: number
  totalSgst: number
  totalCess: number
  totalTax: number
}

export interface Gstr3BSection {
  natureOfSupplies: string
  totalTaxableValue: number
  integratedTax: number
  centralTax: number
  stateTax: number
  cess: number
}

export interface Gstr3BReport {
  startDate: string
  endDate: string
  outwardTaxableSupplies: Gstr3BSection
  outwardZeroRated: Gstr3BSection
  inwardReverseCharge: Gstr3BSection
  eligibleItc: {
    allOtherItc: Gstr3BSection
    netItcAvailable: Gstr3BSection
  }
  netTaxPayable: {
    integratedTax: number
    centralTax: number
    stateTax: number
    cess: number
    totalPayable: number
  }
}

export interface HsnSummaryItem {
  hsnCode: string
  description: string
  uom: string
  totalQuantity: number
  totalGrossWeight: number
  totalFineWeight: number
  totalValue: number
  taxableValue: number
  integratedTax: number
  centralTax: number
  stateTax: number
  cess: number
}

export interface HsnSummaryReport {
  startDate: string
  endDate: string
  items: HsnSummaryItem[]
  totalTaxableValue: number
  totalIgst: number
  totalCgst: number
  totalSgst: number
  totalTax: number
}

export interface TaxRegisterRow {
  id: string
  invoiceNumber: string
  invoiceDate: string
  partyName: string
  partyGstin?: string | null
  taxMode: TaxMode
  placeOfSupply: string
  taxableAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  cessAmount: number
  totalTax: number
  grandTotal: number
}

export interface TaxRegisterReport {
  startDate: string
  endDate: string
  rows: TaxRegisterRow[]
  totalTaxable: number
  totalCgst: number
  totalSgst: number
  totalIgst: number
  totalCess: number
  totalTax: number
  totalGrandTotal: number
}

export interface TaxDashboardReport {
  periodStart: string
  periodEnd: string
  outputCgst: number
  outputSgst: number
  outputIgst: number
  totalOutputTax: number
  inputCgst: number
  inputSgst: number
  inputIgst: number
  totalInputTax: number
  netPayableTax: number
  totalTaxableSales: number
  totalTaxablePurchases: number
  totalCreditNotesTaxReversed: number
  totalDebitNotesTaxReversed: number
}
