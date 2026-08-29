import { useMemo } from 'react'
import {
  calculateLessWeight,
  calculateNetWeight,
  calculateHishob,
  calculateFineFromHishob,
  calculateFine,
  calculateMajuri,
  calculateSaleItemTotals,
  roundNumber,
  LabourRateType
} from '@shared/jewelleryFormula'

export interface JewelleryMathParams {
  pcs: number
  grossWeight: number
  addWeight?: number
  packWeight: number
  tunch: number
  wastage: number
  labourRate: number
  labourRateType: LabourRateType
}

export function useJewelleryMath(params?: JewelleryMathParams) {
  const totals = useMemo(() => {
    if (!params) return null
    return calculateSaleItemTotals(params)
  }, [params])

  return {
    totals,
    calculateLessWeight,
    calculateNetWeight,
    calculateHishob,
    calculateFineFromHishob,
    calculateFine,
    calculateMajuri,
    roundNumber
  }
}
