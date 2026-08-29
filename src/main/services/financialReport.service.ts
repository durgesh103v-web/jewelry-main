import { FinancialReportRepository, AccountRepository, CustomerRepository, SupplierRepository } from '../database/repositories'
import { roundNumber } from '../../shared/jewelleryFormula'
import { NotFoundError } from '../ipc/errors'
import type {
  ReportDateFilter,
  DayBookReport,
  CashBookReport,
  BankBookReport,
  SalesRegisterReport,
  PurchaseRegisterReport,
  ReturnRegisterReport,
  PartyLedgerReport,
  PartyOutstandingReport,
  AdvanceSummaryReport,
  OldGoldSummaryReport,
  MetalExchangeSummaryReport,
  StockMovementReport,
  StockValuationReport,
  TrialBalanceReport,
  ProfitAndLossReport,
  BalanceSheetReport
} from '../../shared/types/reports'

const reportRepo = new FinancialReportRepository()
const accountRepo = new AccountRepository()
const customerRepo = new CustomerRepository()
const supplierRepo = new SupplierRepository()

export const financialReportService = {
  /**
   * Day Book
   */
  getDayBook(filter?: ReportDateFilter): DayBookReport {
    const rows = reportRepo.getDayBook(filter)

    let totalCashNave = 0
    let totalCashJama = 0
    let totalBankNave = 0
    let totalBankJama = 0

    for (const r of rows) {
      totalCashNave = roundNumber(totalCashNave + r.cashNave, 2)
      totalCashJama = roundNumber(totalCashJama + r.cashJama, 2)
      totalBankNave = roundNumber(totalBankNave + r.bankNave, 2)
      totalBankJama = roundNumber(totalBankJama + r.bankJama, 2)
    }

    return {
      rows,
      totalCashNave,
      totalCashJama,
      totalBankNave,
      totalBankJama,
      netCashMovement: roundNumber(totalCashNave - totalCashJama, 2),
      netBankMovement: roundNumber(totalBankNave - totalBankJama, 2)
    }
  },

  /**
   * Cash Book
   */
  getCashBook(filter?: ReportDateFilter): CashBookReport {
    const openingBalance = reportRepo.getCashOpening(filter?.startDate)
    const rows = reportRepo.getCashBookRows(filter)

    let totalCashIn = 0
    let totalCashOut = 0

    for (const r of rows) {
      totalCashIn = roundNumber(totalCashIn + r.cashIn, 2)
      totalCashOut = roundNumber(totalCashOut + r.cashOut, 2)
    }

    const closingBalance = rows.length > 0 ? rows[rows.length - 1].runningBalance : openingBalance

    return {
      openingBalance,
      rows,
      totalCashIn,
      totalCashOut,
      closingBalance
    }
  },

  /**
   * Bank Book
   */
  getBankBook(filter?: ReportDateFilter): BankBookReport {
    const openingBalance = reportRepo.getBankOpening(filter?.startDate)
    const rows = reportRepo.getBankBookRows(filter)

    let totalBankIn = 0
    let totalBankOut = 0

    for (const r of rows) {
      totalBankIn = roundNumber(totalBankIn + r.bankIn, 2)
      totalBankOut = roundNumber(totalBankOut + r.bankOut, 2)
    }

    const closingBalance = rows.length > 0 ? rows[rows.length - 1].runningBalance : openingBalance

    return {
      openingBalance,
      rows,
      totalBankIn,
      totalBankOut,
      closingBalance
    }
  },

  /**
   * Sales Register
   */
  getSalesRegister(filter?: ReportDateFilter): SalesRegisterReport {
    const rows = reportRepo.getSalesRegister(filter)

    let totalPcs = 0
    let totalGrossWeight = 0
    let totalNetWeight = 0
    let totalFineWeight = 0
    let totalSubtotal = 0
    let totalDiscount = 0
    let totalTaxable = 0
    let totalTax = 0
    let totalGrandTotal = 0
    let totalPaid = 0
    let totalBalanceDue = 0

    for (const r of rows) {
      totalPcs += r.totalPcs
      totalGrossWeight = roundNumber(totalGrossWeight + r.grossWeight, 3)
      totalNetWeight = roundNumber(totalNetWeight + r.netWeight, 3)
      totalFineWeight = roundNumber(totalFineWeight + r.fineWeight, 3)
      totalSubtotal = roundNumber(totalSubtotal + r.subtotal, 2)
      totalDiscount = roundNumber(totalDiscount + r.discountAmount, 2)
      totalTaxable = roundNumber(totalTaxable + r.taxableAmount, 2)
      totalTax = roundNumber(totalTax + r.taxAmount, 2)
      totalGrandTotal = roundNumber(totalGrandTotal + r.grandTotal, 2)
      totalPaid = roundNumber(totalPaid + r.paidAmount, 2)
      totalBalanceDue = roundNumber(totalBalanceDue + r.balanceDue, 2)
    }

    return {
      rows,
      totalPcs,
      totalGrossWeight,
      totalNetWeight,
      totalFineWeight,
      totalSubtotal,
      totalDiscount,
      totalTaxable,
      totalTax,
      totalGrandTotal,
      totalPaid,
      totalBalanceDue
    }
  },

  /**
   * Purchase Register
   */
  getPurchaseRegister(filter?: ReportDateFilter): PurchaseRegisterReport {
    const rows = reportRepo.getPurchaseRegister(filter)

    let totalPcs = 0
    let totalGrossWeight = 0
    let totalNetWeight = 0
    let totalFineWeight = 0
    let totalSubtotal = 0
    let totalDiscount = 0
    let totalTaxable = 0
    let totalTax = 0
    let totalGrandTotal = 0
    let totalPaid = 0
    let totalBalanceDue = 0

    for (const r of rows) {
      totalPcs += r.totalPcs
      totalGrossWeight = roundNumber(totalGrossWeight + r.grossWeight, 3)
      totalNetWeight = roundNumber(totalNetWeight + r.netWeight, 3)
      totalFineWeight = roundNumber(totalFineWeight + r.fineWeight, 3)
      totalSubtotal = roundNumber(totalSubtotal + r.subtotal, 2)
      totalDiscount = roundNumber(totalDiscount + r.discountAmount, 2)
      totalTaxable = roundNumber(totalTaxable + r.taxableAmount, 2)
      totalTax = roundNumber(totalTax + r.taxAmount, 2)
      totalGrandTotal = roundNumber(totalGrandTotal + r.grandTotal, 2)
      totalPaid = roundNumber(totalPaid + r.paidAmount, 2)
      totalBalanceDue = roundNumber(totalBalanceDue + r.balanceDue, 2)
    }

    return {
      rows,
      totalPcs,
      totalGrossWeight,
      totalNetWeight,
      totalFineWeight,
      totalSubtotal,
      totalDiscount,
      totalTaxable,
      totalTax,
      totalGrandTotal,
      totalPaid,
      totalBalanceDue
    }
  },

  /**
   * Returns Register (Sales Return / Purchase Return)
   */
  getReturnRegister(
    returnType: 'SALES_RETURN' | 'PURCHASE_RETURN',
    filter?: ReportDateFilter
  ): ReturnRegisterReport {
    const rows = reportRepo.getReturnRegister(returnType, filter)

    let totalPcs = 0
    let totalGrossWeight = 0
    let totalNetWeight = 0
    let totalFineWeight = 0
    let totalReturnAmount = 0
    let totalRefundAmount = 0
    let totalAdjustmentAmount = 0

    for (const r of rows) {
      totalPcs += r.totalPcs
      totalGrossWeight = roundNumber(totalGrossWeight + r.grossWeight, 3)
      totalNetWeight = roundNumber(totalNetWeight + r.netWeight, 3)
      totalFineWeight = roundNumber(totalFineWeight + r.fineWeight, 3)
      totalReturnAmount = roundNumber(totalReturnAmount + r.returnTotal, 2)
      totalRefundAmount = roundNumber(totalRefundAmount + r.refundAmount, 2)
      totalAdjustmentAmount = roundNumber(totalAdjustmentAmount + r.adjustmentAmount, 2)
    }

    return {
      rows,
      totalPcs,
      totalGrossWeight,
      totalNetWeight,
      totalFineWeight,
      totalReturnAmount,
      totalRefundAmount,
      totalAdjustmentAmount
    }
  },

  /**
   * Party Ledger Statement
   */
  getPartyLedger(accountId: string, filter?: ReportDateFilter): PartyLedgerReport {
    const acc = accountRepo.findById(accountId)
    if (!acc) {
      throw new NotFoundError(`Account with ID ${accountId} not found`)
    }

    const { openingBalance, rows } = reportRepo.getPartyLedger(accountId, filter)

    let totalDebit = 0
    let totalCredit = 0

    for (const r of rows) {
      totalDebit = roundNumber(totalDebit + r.debit, 2)
      totalCredit = roundNumber(totalCredit + r.credit, 2)
    }

    const closingBalance = rows.length > 0 ? rows[rows.length - 1].runningBalance : openingBalance

    // Check party linkage
    let partyName: string | null = null
    let partyType: 'CUSTOMER' | 'SUPPLIER' | 'GENERAL' = 'GENERAL'

    const customer = customerRepo.findByAccountId(accountId)
    if (customer) {
      partyName = customer.name
      partyType = 'CUSTOMER'
    } else {
      const supplier = supplierRepo.findByAccountId(accountId)
      if (supplier) {
        partyName = supplier.name
        partyType = 'SUPPLIER'
      }
    }

    return {
      accountId,
      accountName: acc.account_name,
      partyName,
      partyType,
      openingBalance,
      rows,
      totalDebit,
      totalCredit,
      closingBalance
    }
  },

  /**
   * Outstanding Summary for Customers or Suppliers
   */
  getPartyOutstanding(partyType: 'CUSTOMER' | 'SUPPLIER', filter?: ReportDateFilter): PartyOutstandingReport {
    const rows = reportRepo.getPartyOutstanding(partyType, filter)

    let totalReceivable = 0
    let totalPayable = 0

    for (const r of rows) {
      if (r.closingBalance > 0) {
        totalReceivable = roundNumber(totalReceivable + r.closingBalance, 2)
      } else if (r.closingBalance < 0) {
        totalPayable = roundNumber(totalPayable + Math.abs(r.closingBalance), 2)
      }
    }

    return {
      rows,
      totalReceivable,
      totalPayable,
      netOutstanding: roundNumber(totalReceivable - totalPayable, 2)
    }
  },

  /**
   * Advances Summary
   */
  getAdvances(filter?: ReportDateFilter): AdvanceSummaryReport {
    const rows = reportRepo.getAdvances(filter)

    let totalAdvanceAmount = 0
    let totalAllocatedAmount = 0
    let totalUnallocatedBalance = 0

    for (const r of rows) {
      totalAdvanceAmount = roundNumber(totalAdvanceAmount + r.advanceAmount, 2)
      totalAllocatedAmount = roundNumber(totalAllocatedAmount + r.allocatedAmount, 2)
      totalUnallocatedBalance = roundNumber(totalUnallocatedBalance + r.balanceAmount, 2)
    }

    return {
      rows,
      totalAdvanceAmount,
      totalAllocatedAmount,
      totalUnallocatedBalance
    }
  },

  /**
   * Old Gold Summary
   */
  getOldGold(filter?: ReportDateFilter): OldGoldSummaryReport {
    const rows = reportRepo.getOldGoldReceipts(filter)

    let totalGrossWeight = 0
    let totalNetWeight = 0
    let totalFineWeight = 0
    let totalValuation = 0
    let totalExchangeApplied = 0
    let totalCashPaid = 0

    for (const r of rows) {
      totalGrossWeight = roundNumber(totalGrossWeight + r.grossWeight, 3)
      totalNetWeight = roundNumber(totalNetWeight + r.netWeight, 3)
      totalFineWeight = roundNumber(totalFineWeight + r.fineWeight, 3)
      totalValuation = roundNumber(totalValuation + r.netValuation, 2)
      totalExchangeApplied = roundNumber(totalExchangeApplied + r.exchangeAppliedAmount, 2)
      totalCashPaid = roundNumber(totalCashPaid + r.cashPaidAmount, 2)
    }

    return {
      rows,
      totalGrossWeight,
      totalNetWeight,
      totalFineWeight,
      totalValuation,
      totalExchangeApplied,
      totalCashPaid
    }
  },

  /**
   * Metal Exchanges Summary
   */
  getMetalExchanges(filter?: ReportDateFilter): MetalExchangeSummaryReport {
    const rows = reportRepo.getMetalExchanges(filter)
    const totalExchangeAmount = rows.reduce((sum, r) => roundNumber(sum + r.exchangeAmount, 2), 0)
    return { rows, totalExchangeAmount }
  },

  /**
   * Stock Movements
   */
  getStockMovements(filter?: ReportDateFilter): StockMovementReport {
    const rows = reportRepo.getStockMovements(filter)

    let totalInPcs = 0
    let totalOutPcs = 0
    let totalInGrossWeight = 0
    let totalOutGrossWeight = 0
    let totalInFineWeight = 0
    let totalOutFineWeight = 0

    for (const r of rows) {
      if (r.pcsDelta > 0) totalInPcs += r.pcsDelta
      else totalOutPcs += Math.abs(r.pcsDelta)

      if (r.grossWeightDelta > 0) totalInGrossWeight = roundNumber(totalInGrossWeight + r.grossWeightDelta, 3)
      else totalOutGrossWeight = roundNumber(totalOutGrossWeight + Math.abs(r.grossWeightDelta), 3)

      if (r.fineDelta > 0) totalInFineWeight = roundNumber(totalInFineWeight + r.fineDelta, 3)
      else totalOutFineWeight = roundNumber(totalOutFineWeight + Math.abs(r.fineDelta), 3)
    }

    return {
      rows,
      totalInPcs,
      totalOutPcs,
      netPcs: totalInPcs - totalOutPcs,
      totalInGrossWeight,
      totalOutGrossWeight,
      netGrossWeight: roundNumber(totalInGrossWeight - totalOutGrossWeight, 3),
      totalInFineWeight,
      totalOutFineWeight,
      netFineWeight: roundNumber(totalInFineWeight - totalOutFineWeight, 3)
    }
  },

  /**
   * Stock Valuation
   */
  getStockValuation(filter?: ReportDateFilter): StockValuationReport {
    const rows = reportRepo.getStockValuation(filter)

    let totalPcs = 0
    let totalGrossWeight = 0
    let totalNetWeight = 0
    let totalFineWeight = 0
    let totalEstimatedValue = 0

    for (const r of rows) {
      totalPcs += r.currentPcs
      totalGrossWeight = roundNumber(totalGrossWeight + r.currentGrossWeight, 3)
      totalNetWeight = roundNumber(totalNetWeight + r.currentNetWeight, 3)
      totalFineWeight = roundNumber(totalFineWeight + r.currentFineWeight, 3)
      totalEstimatedValue = roundNumber(totalEstimatedValue + r.estimatedMetalValue, 2)
    }

    return {
      rows,
      totalPcs,
      totalGrossWeight,
      totalNetWeight,
      totalFineWeight,
      totalEstimatedValue
    }
  },

  /**
   * Trial Balance
   */
  getTrialBalance(filter?: ReportDateFilter): TrialBalanceReport {
    const rows = reportRepo.getTrialBalance(filter)

    let totalOpeningDebit = 0
    let totalOpeningCredit = 0
    let totalPeriodDebit = 0
    let totalPeriodCredit = 0
    let totalClosingDebit = 0
    let totalClosingCredit = 0

    for (const r of rows) {
      totalOpeningDebit = roundNumber(totalOpeningDebit + r.openingDebit, 2)
      totalOpeningCredit = roundNumber(totalOpeningCredit + r.openingCredit, 2)
      totalPeriodDebit = roundNumber(totalPeriodDebit + r.periodDebit, 2)
      totalPeriodCredit = roundNumber(totalPeriodCredit + r.periodCredit, 2)
      totalClosingDebit = roundNumber(totalClosingDebit + r.closingDebit, 2)
      totalClosingCredit = roundNumber(totalClosingCredit + r.closingCredit, 2)
    }

    const isBalanced = Math.abs(totalClosingDebit - totalClosingCredit) < 0.05

    return {
      rows,
      totalOpeningDebit,
      totalOpeningCredit,
      totalPeriodDebit,
      totalPeriodCredit,
      totalClosingDebit,
      totalClosingCredit,
      isBalanced
    }
  },

  /**
   * Profit & Loss Statement
   */
  getProfitAndLoss(filter?: ReportDateFilter): ProfitAndLossReport {
    const sales = this.getSalesRegister(filter)
    const purchases = this.getPurchaseRegister(filter)
    const salesReturns = this.getReturnRegister('SALES_RETURN', filter)
    const purchaseReturns = this.getReturnRegister('PURCHASE_RETURN', filter)

    const salesRevenue = sales.totalGrandTotal
    const sReturns = salesReturns.totalReturnAmount
    const netSales = roundNumber(salesRevenue - sReturns, 2)

    const costOfPurchases = purchases.totalGrandTotal
    const pReturns = purchaseReturns.totalReturnAmount
    const netPurchases = roundNumber(costOfPurchases - pReturns, 2)

    const directExpenses = 0
    const grossProfit = roundNumber(netSales - netPurchases - directExpenses, 2)

    const indirectExpenses = 0
    const indirectIncomes = 0
    const netProfit = roundNumber(grossProfit + indirectIncomes - indirectExpenses, 2)

    return {
      startDate: filter?.startDate || 'All Time',
      endDate: filter?.endDate || 'Present',
      salesRevenue,
      salesReturns: sReturns,
      netSales,
      costOfPurchases,
      purchaseReturns: pReturns,
      netPurchases,
      directExpenses,
      grossProfit,
      indirectExpenses,
      indirectIncomes,
      netProfit
    }
  },

  /**
   * Balance Sheet
   */
  getBalanceSheet(asOfDate?: string): BalanceSheetReport {
    const tb = this.getTrialBalance({ endDate: asOfDate })

    const assetRows: { accountName: string; amount: number }[] = []
    const liabilityRows: { accountName: string; amount: number }[] = []
    const capitalRows: { accountName: string; amount: number }[] = []

    let totalAssets = 0
    let totalLiabilities = 0
    let totalCapital = 0

    for (const r of tb.rows) {
      const type = (r.groupType || '').toUpperCase()
      const netAmount = r.closingDebit - r.closingCredit

      if (type.includes('ASSET') || type.includes('CUSTOMER') || type.includes('BANK') || type.includes('CASH')) {
        if (netAmount !== 0) {
          assetRows.push({ accountName: `${r.accountName} (${r.groupName})`, amount: netAmount })
          totalAssets = roundNumber(totalAssets + netAmount, 2)
        }
      } else if (type.includes('LIABILITY') || type.includes('SUPPLIER')) {
        const liabAmt = -netAmount
        if (liabAmt !== 0) {
          liabilityRows.push({ accountName: `${r.accountName} (${r.groupName})`, amount: liabAmt })
          totalLiabilities = roundNumber(totalLiabilities + liabAmt, 2)
        }
      } else if (type.includes('CAPITAL')) {
        const capAmt = -netAmount
        if (capAmt !== 0) {
          capitalRows.push({ accountName: `${r.accountName} (${r.groupName})`, amount: capAmt })
          totalCapital = roundNumber(totalCapital + capAmt, 2)
        }
      }
    }

    const totalLiabilitiesAndCapital = roundNumber(totalLiabilities + totalCapital, 2)
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndCapital) < 1.0

    return {
      asOfDate: asOfDate || new Date().toISOString().slice(0, 10),
      assets: [{ title: 'Current & Fixed Assets', rows: assetRows, total: totalAssets }],
      liabilities: [{ title: 'Current Liabilities & Payables', rows: liabilityRows, total: totalLiabilities }],
      capital: [{ title: 'Capital & Reserves', rows: capitalRows, total: totalCapital }],
      totalAssets,
      totalLiabilitiesAndCapital,
      isBalanced
    }
  }
}
