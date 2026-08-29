export const UNITS = {
  KG: 'Kg',
  GM: 'Gm',
  PCS: 'Pcs'
} as const

export type UnitConstant = (typeof UNITS)[keyof typeof UNITS]

export const UNIT_OPTIONS: UnitConstant[] = [UNITS.KG, UNITS.GM, UNITS.PCS]
