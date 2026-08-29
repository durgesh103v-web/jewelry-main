/**
 * Centralized formatting utilities for the Jewellery ERP Desktop application.
 * All functions guarantee safe handling of null, undefined, empty string, and numeric values.
 */

/**
 * Formats a date string (YYYY-MM-DD or ISO) into DD/MM/YYYY format.
 * Returns '-' if value is empty/falsy.
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-'

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '-'
    const day = String(value.getDate()).padStart(2, '0')
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const year = value.getFullYear()
    return `${day}/${month}/${year}`
  }

  const strValue = String(value).trim()
  if (!strValue) return '-'

  const [datePart] = strValue.split(' ')
  const [year, month, day] = datePart.split('-')

  if (!year || !month || !day) return strValue

  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
}

/**
 * Safely parses any value to a finite number. Returns 0 if invalid or empty.
 */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

/**
 * Validates if an input string is a valid numeric pattern (e.g., allow positive/negative decimals).
 */
export function isValidAmountInput(value: string): boolean {
  return /^-?\d*\.?\d*$/.test(value)
}

/**
 * Formats a number to specified decimal places (default: 3) trimming trailing zeros.
 */
export function formatNumber(value: number | string | null | undefined, decimals = 3): string {
  const num = toNumber(value)
  return num.toFixed(decimals).replace(/\.?0+$/, '')
}

/**
 * Formats currency in Indian Number System (en-IN), e.g. ₹12,50,000.00
 */
export function formatCurrency(value: number | string | null | undefined, includeSymbol = true): string {
  const num = toNumber(value)
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return includeSymbol ? `₹${formatted}` : formatted
}

/**
 * Formats weight with unit suffix, e.g. 42.580 g
 */
export function formatWeight(value: number | string | null | undefined, unit = 'g', decimals = 3): string {
  const num = toNumber(value)
  return `${num.toFixed(decimals)} ${unit}`.trim()
}

/**
 * Formats percentage with suffix, e.g. 91.60%
 */
export function formatPercentage(value: number | string | null | undefined, decimals = 2): string {
  const num = toNumber(value)
  return `${num.toFixed(decimals)}%`
}
