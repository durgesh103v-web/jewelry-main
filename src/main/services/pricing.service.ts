import {
  calculateLessWeight,
  calculateNetWeight,
  calculateHishob,
  calculateFineFromHishob,
  calculateMajuri,
  roundNumber
} from '../../shared/jewelleryFormula'
import { goldRateService } from './goldRate.service'
import { ValidationError } from '../ipc/errors'
import type { PricingRequest, PricingResult } from '../../shared/types/pricing'

export const pricingService = {
  calculate(request: PricingRequest): PricingResult {
    const pcs = Math.max(1, request.pcs || 1)
    const grossWeight = Number(request.grossWeight || 0)
    const packWeight = Number(request.packWeight || 0)
    const addWeight = Number(request.addWeight || 0)

    if (grossWeight <= 0) {
      throw new ValidationError('Gross weight must be greater than 0')
    }

    const tunch = Number(request.tunch ?? 100)
    const wastage = Number(request.wastage ?? 0)
    const labourRate = Number(request.labourRate || 0)
    const labourRateType = request.labourRateType || 'Kg'

    // 1. Weight math
    const lessWeight =
      request.lessWeight !== undefined
        ? Number(request.lessWeight)
        : calculateLessWeight(packWeight, pcs)
    const netWeight = calculateNetWeight(grossWeight, lessWeight, addWeight)

    if (netWeight <= 0) {
      throw new ValidationError('Net weight must be greater than 0')
    }

    // 2. Purity & Fine math
    const hishob = calculateHishob(tunch, wastage)
    const fineWeight = calculateFineFromHishob(netWeight, hishob)

    // 3. Applicable Rate
    let ratePerGram = request.ratePerGram ? Number(request.ratePerGram) : 0
    if (!ratePerGram) {
      const rateRecord = request.rateDate
        ? goldRateService.getRateAtDate(request.metalType, request.rateDate, request.purityName)
        : goldRateService.getCurrentRate(request.metalType, request.purityName)

      ratePerGram = rateRecord ? rateRecord.ratePerGram : 0
    }

    // 4. Metal Valuation
    // Metal value is based on fine weight and the pure metal rate per gram
    const metalValue = roundNumber(fineWeight * ratePerGram, 2)

    // 5. Making Charges
    const making = calculateMajuri({
      netWeight,
      pcs,
      labourRate,
      labourRateType
    })

    // 6. Stone Charges
    let stoneTotal = 0
    if (request.stoneCharges && request.stoneCharges.length > 0) {
      for (const stone of request.stoneCharges) {
        const qty =
          stone.unit === 'Carat'
            ? Number(stone.carat || 0)
            : stone.unit === 'Gm'
              ? Number(stone.weightGm || 0)
              : Number(stone.pcs || 1)
        const amount = roundNumber(qty * Number(stone.ratePerUnit || 0), 2)
        stoneTotal = roundNumber(stoneTotal + amount, 2)
      }
    }

    // 7. Diamond Charges
    let diamondTotal = 0
    if (request.diamondCharges && request.diamondCharges.length > 0) {
      for (const diamond of request.diamondCharges) {
        const carat = Number(diamond.carat || 0)
        const rate = Number(diamond.ratePerCarat || 0)
        const amount = roundNumber(carat * rate, 2)
        diamondTotal = roundNumber(diamondTotal + amount, 2)
      }
    }

    const totalCharges = roundNumber(making + stoneTotal + diamondTotal, 2)
    const grossTotal = roundNumber(metalValue + totalCharges, 2)

    // 8. Discount
    let discountAmount = Number(request.discountAmount || 0)
    let discountPercent = Number(request.discountPercent || 0)
    if (discountPercent > 0 && !discountAmount) {
      discountAmount = roundNumber((grossTotal * discountPercent) / 100, 2)
    } else if (discountAmount > 0 && !discountPercent && grossTotal > 0) {
      discountPercent = roundNumber((discountAmount / grossTotal) * 100, 2)
    }

    const taxableAmount = Math.max(0, roundNumber(grossTotal - discountAmount, 2))

    // 9. Tax Calculation
    const taxPercent = Number(request.taxPercent || 0)
    const taxAmount =
      taxPercent > 0 ? roundNumber((taxableAmount * taxPercent) / 100, 2) : 0

    const finalAmount = roundNumber(taxableAmount + taxAmount, 2)
    const roundedTotal = roundNumber(finalAmount, 0)

    // 10. Traceability Breakdown
    const breakdown: string[] = [
      `Gross Weight: ${grossWeight.toFixed(3)} g`,
      `Less / Pack Weight: ${lessWeight.toFixed(3)} g`,
      `Net Weight: ${netWeight.toFixed(3)} g`,
      `Tunch: ${tunch.toFixed(2)}% | Wastage: ${wastage.toFixed(2)}% | Hishob: ${hishob.toFixed(2)}%`,
      `Fine Weight: ${fineWeight.toFixed(3)} g`,
      `Applicable Rate: ₹${ratePerGram.toFixed(2)} / g (${request.metalType})`,
      `Metal Value: ₹${metalValue.toFixed(2)}`,
      `Making Charges (${labourRateType} @ ₹${labourRate}): ₹${making.toFixed(2)}`
    ]

    if (stoneTotal > 0) {
      breakdown.push(`Stone Charges: ₹${stoneTotal.toFixed(2)}`)
    }
    if (diamondTotal > 0) {
      breakdown.push(`Diamond Charges: ₹${diamondTotal.toFixed(2)}`)
    }
    if (discountAmount > 0) {
      breakdown.push(`Discount: -₹${discountAmount.toFixed(2)} (${discountPercent.toFixed(2)}%)`)
    }
    breakdown.push(`Taxable Amount: ₹${taxableAmount.toFixed(2)}`)
    if (taxPercent > 0) {
      breakdown.push(`Tax (${taxPercent}%): ₹${taxAmount.toFixed(2)}`)
    }
    breakdown.push(`Final Amount: ₹${finalAmount.toFixed(2)} (Rounded: ₹${roundedTotal})`)

    return {
      weights: {
        grossWeight,
        packWeight,
        lessWeight,
        addWeight,
        netWeight,
        fineWeight
      },
      purity: {
        tunch,
        wastage,
        hishob
      },
      metal: {
        metalType: request.metalType,
        ratePerGram,
        metalValue
      },
      charges: {
        making,
        labourRate,
        labourRateType,
        stoneTotal,
        diamondTotal,
        totalCharges
      },
      discount: {
        amount: discountAmount,
        percent: discountPercent
      },
      tax: {
        taxableAmount,
        taxPercent,
        taxAmount
      },
      total: {
        finalAmount,
        roundedTotal
      },
      breakdown
    }
  }
}
