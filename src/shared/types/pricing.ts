import type { LabourRateType } from '../jewelleryFormula'

export interface StoneChargeInput {
  stoneName?: string
  pcs?: number
  carat?: number
  weightGm?: number
  ratePerUnit: number
  unit?: 'Carat' | 'Gm' | 'Pcs'
}

export interface DiamondChargeInput {
  diamondDescription?: string
  carat: number
  ratePerCarat: number
  clarity?: string
  color?: string
}

export interface PricingRequest {
  metalType: string
  purityName?: string
  tunch: number
  wastage?: number
  pcs: number
  grossWeight: number
  packWeight?: number
  lessWeight?: number
  addWeight?: number
  labourRate: number
  labourRateType: LabourRateType
  ratePerGram?: number
  rateDate?: string
  stoneCharges?: StoneChargeInput[]
  diamondCharges?: DiamondChargeInput[]
  discountAmount?: number
  discountPercent?: number
  taxPercent?: number
}

export interface PricingResult {
  weights: {
    grossWeight: number
    packWeight: number
    lessWeight: number
    addWeight: number
    netWeight: number
    fineWeight: number
  }
  purity: {
    tunch: number
    wastage: number
    hishob: number
  }
  metal: {
    metalType: string
    ratePerGram: number
    metalValue: number
  }
  charges: {
    making: number
    labourRate: number
    labourRateType: LabourRateType
    stoneTotal: number
    diamondTotal: number
    totalCharges: number
  }
  discount: {
    amount: number
    percent: number
  }
  tax: {
    taxableAmount: number
    taxPercent: number
    taxAmount: number
  }
  total: {
    finalAmount: number
    roundedTotal: number
  }
  breakdown: string[]
}
