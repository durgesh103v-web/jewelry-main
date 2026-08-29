import { createIpcHandler } from './wrapper'
import { taxCalculationService } from '../services/taxCalculation.service'
import type { TaxCalculationRequest } from '../../shared/types/tax'

export function registerTaxIpc(): void {
  createIpcHandler('tax:get-states', () => {
    return taxCalculationService.getStates()
  })

  createIpcHandler('tax:get-hsn-codes', () => {
    return taxCalculationService.getHsnCodes()
  })

  createIpcHandler('tax:get-tax-rates', () => {
    return taxCalculationService.getTaxRates()
  })

  createIpcHandler('tax:calculate', (_event, request: TaxCalculationRequest) => {
    return taxCalculationService.calculateTax(request)
  })

  createIpcHandler('tax:gstr1-report', (_event, payload?: { startDate?: string; endDate?: string }) => {
    return taxCalculationService.getGstr1Report(payload?.startDate, payload?.endDate)
  })

  createIpcHandler('tax:gstr3b-report', (_event, payload?: { startDate?: string; endDate?: string }) => {
    return taxCalculationService.getGstr3BReport(payload?.startDate, payload?.endDate)
  })

  createIpcHandler('tax:hsn-summary', (_event, payload?: { startDate?: string; endDate?: string }) => {
    return taxCalculationService.getHsnSummaryReport(payload?.startDate, payload?.endDate)
  })

  createIpcHandler(
    'tax:tax-register',
    (_event, payload: { type: 'SALES' | 'PURCHASE'; startDate?: string; endDate?: string }) => {
      return taxCalculationService.getTaxRegister(payload.type, payload.startDate, payload.endDate)
    }
  )

  createIpcHandler('tax:dashboard', (_event, payload?: { startDate?: string; endDate?: string }) => {
    return taxCalculationService.getTaxDashboard(payload?.startDate, payload?.endDate)
  })
}
