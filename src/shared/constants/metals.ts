export const METALS = {
  GOLD: 'Gold',
  SILVER: 'Silver',
  PLATINUM: 'Platinum',
  DIAMOND: 'Diamond'
} as const

export type MetalConstant = (typeof METALS)[keyof typeof METALS]

export const METAL_OPTIONS: MetalConstant[] = [
  METALS.GOLD,
  METALS.SILVER,
  METALS.PLATINUM,
  METALS.DIAMOND
]
