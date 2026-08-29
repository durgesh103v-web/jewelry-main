import { TaxRepository } from '../database/repositories/TaxRepository'
import { roundNumber } from '../../shared/jewelleryFormula'
import type {
  GstState,
  GstHsnCode,
  GstTaxRate,
  TaxCalculationRequest,
  TaxCalculationResult,
  TaxMode,
  Gstr1Report,
  Gstr3BReport,
  HsnSummaryReport,
  TaxRegisterReport,
  TaxDashboardReport
} from '../../shared/types/tax'

const taxRepo = new TaxRepository()

export const taxCalculationService = {
  /**
   * Get all states
   */
  getStates(): GstState[] {
    return taxRepo.getStates()
  },

  /**
   * Get HSN Codes
   */
  getHsnCodes(): GstHsnCode[] {
    return taxRepo.getHsnCodes()
  },

  /**
   * Get Tax Rates
   */
  getTaxRates(): GstTaxRate[] {
    return taxRepo.getTaxRates()
  },

  /**
   * Canonical Tax Calculation Engine
   */
  calculateTax(request: TaxCalculationRequest): TaxCalculationResult {
    const { stateCode: businessState } = taxRepo.getFirmState()
    const partyState = request.placeOfSupply || request.partyStateCode || businessState

    // 1. Determine Tax Mode (Intra-State vs Inter-State)
    const taxMode: TaxMode = partyState === businessState ? 'INTRA_STATE' : 'INTER_STATE'

    // 2. Resolve Tax Rate
    let taxPercent = request.customTaxPercent !== undefined ? request.customTaxPercent : 3.0
    let cessRate = 0

    if (request.taxRateCode) {
      const rates = taxRepo.getTaxRates()
      const matched = rates.find((r) => r.code === request.taxRateCode)
      if (matched) {
        taxPercent = matched.igstRate
        cessRate = matched.cessRate
      }
    }

    const taxableAmount = Math.max(0, request.taxableAmount)

    let cgstRate = 0
    let sgstRate = 0
    let igstRate = 0

    let cgstAmount = 0
    let sgstAmount = 0
    let igstAmount = 0
    let cessAmount = 0

    if (taxMode === 'INTRA_STATE') {
      cgstRate = roundNumber(taxPercent / 2, 2)
      sgstRate = roundNumber(taxPercent / 2, 2)
      igstRate = 0

      cgstAmount = roundNumber((taxableAmount * cgstRate) / 100, 2)
      sgstAmount = roundNumber((taxableAmount * sgstRate) / 100, 2)
      igstAmount = 0
    } else {
      cgstRate = 0
      sgstRate = 0
      igstRate = taxPercent

      cgstAmount = 0
      sgstAmount = 0
      igstAmount = roundNumber((taxableAmount * igstRate) / 100, 2)
    }

    if (cessRate > 0) {
      cessAmount = roundNumber((taxableAmount * cessRate) / 100, 2)
    }

    const totalTaxAmount = roundNumber(cgstAmount + sgstAmount + igstAmount + cessAmount, 2)
    const finalAmount = roundNumber(taxableAmount + totalTaxAmount, 2)

    return {
      taxMode,
      taxableAmount,
      taxPercent,
      cgstRate,
      sgstRate,
      igstRate,
      cessRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      cessAmount,
      totalTaxAmount,
      finalAmount
    }
  },

  /**
   * GSTR-1 Report
   */
  getGstr1Report(startDate?: string, endDate?: string): Gstr1Report {
    const start = startDate || '1970-01-01'
    const end = endDate || '2099-12-31'
    return taxRepo.getGstr1Report(start, end)
  },

  /**
   * GSTR-3B Summary Report
   */
  getGstr3BReport(startDate?: string, endDate?: string): Gstr3BReport {
    const start = startDate || '1970-01-01'
    const end = endDate || '2099-12-31'
    return taxRepo.getGstr3BReport(start, end)
  },

  /**
   * HSN Summary Report
   */
  getHsnSummaryReport(startDate?: string, endDate?: string): HsnSummaryReport {
    const start = startDate || '1970-01-01'
    const end = endDate || '2099-12-31'
    return taxRepo.getHsnSummaryReport(start, end)
  },

  /**
   * Tax Register Report
   */
  getTaxRegister(type: 'SALES' | 'PURCHASE', startDate?: string, endDate?: string): TaxRegisterReport {
    const start = startDate || '1970-01-01'
    const end = endDate || '2099-12-31'
    return taxRepo.getTaxRegister(type, start, end)
  },

  /**
   * Tax Dashboard Summary
   */
  getTaxDashboard(startDate?: string, endDate?: string): TaxDashboardReport {
    const start = startDate || '1970-01-01'
    const end = endDate || '2099-12-31'
    return taxRepo.getTaxDashboard(start, end)
  }
}
