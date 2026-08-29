import { createIpcHandler } from './wrapper'
import { financialReportService } from '../services/financialReport.service'
import type { ReportDateFilter } from '../../shared/types/reports'

export function registerFinancialReportIpc(): void {
  createIpcHandler('reports:day-book', (_event, filter?: ReportDateFilter) => {
    return financialReportService.getDayBook(filter)
  })

  createIpcHandler('reports:cash-book', (_event, filter?: ReportDateFilter) => {
    return financialReportService.getCashBook(filter)
  })

  createIpcHandler('reports:bank-book', (_event, filter?: ReportDateFilter) => {
    return financialReportService.getBankBook(filter)
  })

  createIpcHandler('reports:sales-register', (_event, filter?: ReportDateFilter) => {
    return financialReportService.getSalesRegister(filter)
  })

  createIpcHandler('reports:purchase-register', (_event, filter?: ReportDateFilter) => {
    return financialReportService.getPurchaseRegister(filter)
  })

  createIpcHandler(
    'reports:return-register',
    (_event, payload: { returnType: 'SALES_RETURN' | 'PURCHASE_RETURN'; filter?: ReportDateFilter }) => {
      return financialReportService.getReturnRegister(payload.returnType, payload.filter)
    }
  )

  createIpcHandler(
    'reports:party-ledger',
    (_event, payload: { accountId: string; filter?: ReportDateFilter }) => {
      return financialReportService.getPartyLedger(payload.accountId, payload.filter)
    }
  )

  createIpcHandler(
    'reports:party-outstanding',
    (_event, payload: { partyType: 'CUSTOMER' | 'SUPPLIER'; filter?: ReportDateFilter }) => {
      return financialReportService.getPartyOutstanding(payload.partyType, payload.filter)
    }
  )

  createIpcHandler('reports:advances', (_event, filter?: ReportDateFilter) => {
    return financialReportService.getAdvances(filter)
  })

  createIpcHandler('reports:old-gold', (_event, filter?: ReportDateFilter) => {
    return financialReportService.getOldGold(filter)
  })

  createIpcHandler('reports:metal-exchanges', (_event, filter?: ReportDateFilter) => {
    return financialReportService.getMetalExchanges(filter)
  })

  createIpcHandler('reports:stock-movements', (_event, filter?: ReportDateFilter) => {
    return financialReportService.getStockMovements(filter)
  })

  createIpcHandler('reports:stock-valuation', (_event, filter?: ReportDateFilter) => {
    return financialReportService.getStockValuation(filter)
  })

  createIpcHandler('reports:trial-balance', (_event, filter?: ReportDateFilter) => {
    return financialReportService.getTrialBalance(filter)
  })

  createIpcHandler('reports:profit-and-loss', (_event, filter?: ReportDateFilter) => {
    return financialReportService.getProfitAndLoss(filter)
  })

  createIpcHandler('reports:balance-sheet', (_event, asOfDate?: string) => {
    return financialReportService.getBalanceSheet(asOfDate)
  })
}
