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

  // Handle ISO formatted timestamp strings (e.g. 2026-09-16T17:37:26.533Z)
  if (strValue.includes('T') || strValue.includes('Z')) {
    const parsed = new Date(strValue)
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0')
      const month = String(parsed.getMonth() + 1).padStart(2, '0')
      const year = parsed.getFullYear()
      return `${day}/${month}/${year}`
    }
  }

  const [datePart] = strValue.split(' ')
  const parts = datePart.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
  }

  return strValue
}

/**
 * Formats a date into a human-friendly readable string, e.g. "16 Sep 2026"
 */
export function formatDatePretty(value: string | Date | null | undefined): string {
  if (!value) return '-'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
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

/**
 * Formats a number for Indian locale display (en-IN) with 2 decimal places.
 * Identical to formatCurrency but without the ₹ symbol.
 */
export function formatAmount(value: number | string | null | undefined): string {
  const num = toNumber(value)
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Returns today's date in YYYY-MM-DD format (suitable for HTML date inputs).
 */
export function getTodayDate(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Normalizes a labour rate type string to a valid LabourRateType union.
 */
export function getLabourRateType(value: string): 'Kg' | 'Gm' | 'Pcs' {
  if (value === 'Gm' || value === 'Pcs') return value
  return 'Kg'
}
