import { roundNumber } from '../../shared/jewelleryFormula'
import { goldRateService } from './goldRate.service'
import { ValidationError } from '../ipc/errors'
import type {
  OldGoldValuationRequest,
  OldGoldValuationResult
} from '../../shared/types/oldGold'

export const oldGoldValuationService = {
  calculate(request: OldGoldValuationRequest): OldGoldValuationResult {
    const grossWeight = Number(request.grossWeight || 0)
    const lessWeight = Number(request.lessWeight || 0)

    if (grossWeight <= 0) {
      throw new ValidationError('Gross weight must be greater than 0')
    }
    if (lessWeight < 0 || lessWeight > grossWeight) {
      throw new ValidationError('Less weight must be between 0 and gross weight')
    }

    const netWeight = roundNumber(grossWeight - lessWeight, 3)
    const tunch = Number(request.tunch !== undefined ? request.tunch : 100)
    if (tunch <= 0 || tunch > 100) {
      throw new ValidationError('Tunch/Purity must be between 0 and 100%')
    }

    const recoveryPercent = Number(
      request.recoveryPercent !== undefined ? request.recoveryPercent : 100
    )
    if (recoveryPercent <= 0 || recoveryPercent > 100) {
      throw new ValidationError('Recovery percent must be between 0 and 100%')
    }

    // 1. Fine weight calculation
    const fineWeight = roundNumber((netWeight * tunch) / 100, 3)
    const recoverableFineWeight = roundNumber((fineWeight * recoveryPercent) / 100, 3)

    // 2. Applicable gold rate
    let goldRate = Number(request.goldRate || 0)
    if (!goldRate) {
      const rateRecord = request.rateDate
        ? goldRateService.getRateAtDate(request.metalType, request.rateDate, request.purityName)
        : goldRateService.getCurrentRate(request.metalType, request.purityName)

      goldRate = rateRecord ? rateRecord.ratePerGram : 0
    }

    // 3. Valuation math
    const metalValue = roundNumber(recoverableFineWeight * goldRate, 2)
    const deductionAmount = Number(request.deductionAmount || 0)
    const valuationAmount = Math.max(0, roundNumber(metalValue - deductionAmount, 2))

    // 4. Traceability Breakdown
    const breakdown: string[] = [
      `Gross Weight: ${grossWeight.toFixed(3)} g`,
      `Less Weight: ${lessWeight.toFixed(3)} g`,
      `Net Weight: ${netWeight.toFixed(3)} g`,
      `Purity / Tunch: ${tunch.toFixed(2)}%`,
      `Fine Weight: ${fineWeight.toFixed(3)} g`,
      `Recovery: ${recoveryPercent.toFixed(2)}% | Recoverable Fine: ${recoverableFineWeight.toFixed(3)} g`,
      `Applicable Rate: ₹${goldRate.toFixed(2)} / g (${request.metalType})`,
      `Metal Value: ₹${metalValue.toFixed(2)}`
    ]

    if (deductionAmount > 0) {
      breakdown.push(`Deductions: -₹${deductionAmount.toFixed(2)}`)
    }

    breakdown.push(`Final Old Gold Valuation: ₹${valuationAmount.toFixed(2)}`)

    return {
      weights: {
        grossWeight,
        lessWeight,
        netWeight,
        fineWeight,
        recoverableFineWeight
      },
      purity: {
        purityName: request.purityName,
        tunch,
        recoveryPercent
      },
      rate: {
        metalType: request.metalType,
        goldRate
      },
      valuation: {
        metalValue,
        deductionAmount,
        valuationAmount
      },
      breakdown
    }
  }
}
