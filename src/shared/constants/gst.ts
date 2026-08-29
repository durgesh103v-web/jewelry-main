export const GST_TYPES = {
  CGST: 'CGST',
  SGST: 'SGST',
  IGST: 'IGST'
} as const

export const GST_RATES = [0, 0.25, 1.5, 3, 5, 12, 18, 28] as const

export const DEFAULT_JEWELLERY_GST_RATE = 3 // 3% standard rate for jewellery in India (1.5% CGST + 1.5% SGST)
