import { createIpcHandler } from './wrapper'
import { accountBalanceService } from '../services/accountBalance.service'
import { stockReportService } from '../services/stockReport.service'
import { salePurchaseReportService } from '../services/salePurchaseReport.service'
import { getCashBookReport } from '../services/cashBookReport.service'
import { getBankTransactionsReport } from '../services/bankTransactionsReport.service'
import { getDarRojmelReport } from '../services/darRojmelReport.service'
import { accountwiseSummaryReportService } from '../services/accountwiseSummaryReport.service'
import { itemwiseSalePurchaseReportService } from '../services/itemwiseSalePurchaseReport.service'
import { itemSalePurchaseCityWiseReportService } from '../services/itemSalePurchaseCityWiseReport.service'
import { getPaymentReceiptReport } from '../services/paymentReceiptReport.service'

export function registerReportIpc(): void {
  createIpcHandler('reports:account-balance', () => {
    return accountBalanceService.listAccountBalances()
  })

  createIpcHandler(
    'reports:account-ledger-details',
    (_event, accountId: string, filter?: { fromDate?: string; toDate?: string }) => {
      return accountBalanceService.getAccountLedgerDetails(accountId, filter)
    }
  )

  createIpcHandler('reports:outstanding', () => {
    return accountBalanceService.getOutstandingBalances()
  })

  createIpcHandler('reports:item-stock', () => {
    return stockReportService.listItemStock()
  })

  createIpcHandler('reports:item-transactions', () => {
    return stockReportService.listItemTransactions()
  })

  createIpcHandler(
    'reports:item-stock-ledger',
    (_event, itemId: string, filter?: { fromDate?: string; toDate?: string }) => {
      return stockReportService.getItemStockLedger(itemId, filter)
    }
  )

  createIpcHandler('reports:account-wise-sale-purchase', () => {
    return salePurchaseReportService.listAccountWiseSalePurchase()
  })

  createIpcHandler('cashBookReport:get', (_event, filter: any) => {
    return getCashBookReport(filter)
  })

  createIpcHandler('reports:bank-transactions', (_event, filter: any) => {
    return getBankTransactionsReport(filter)
  })

  createIpcHandler('reports:dar-rojmel', (_event, filter: any) => {
    return getDarRojmelReport(filter)
  })

  createIpcHandler('reports:accountwise-summary', () => {
    return accountwiseSummaryReportService.listAccountwiseSummary()
  })

  createIpcHandler('reports:itemwise-sale-purchase', () => {
    return itemwiseSalePurchaseReportService.listItemwiseSalePurchase()
  })

  createIpcHandler('reports:item-sale-purchase-city-wise', () => {
    return itemSalePurchaseCityWiseReportService.listItemSalePurchaseCityWise()
  })

  createIpcHandler('reports:payment-receipt', (_event, filter: any) => {
    return getPaymentReceiptReport(filter)
  })
}
