export const BUSINESS_TYPES = {
  WHOLESALE: 'WHOLESALE',
  RETAIL: 'RETAIL'
} as const

export type BusinessTypeConstant = (typeof BUSINESS_TYPES)[keyof typeof BUSINESS_TYPES]
