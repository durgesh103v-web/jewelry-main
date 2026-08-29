import { getDatabase } from '../database/connection'

export type DocumentType =
  | 'SALE'
  | 'PURCHASE'
  | 'PURCHASE_RETURN'
  | 'SALE_RETURN'
  | 'APPROVAL'
  | 'ESTIMATE'
  | 'JOB_WORK'
  | 'REPAIR'
  | 'QUOTATION'
  | 'ORDER'
  | 'ADVANCE'
  | 'OLD_GOLD'
  | 'EXCHANGE'

interface DocumentConfig {
  table: string
  column: string
  defaultPrefix: string
}

const DOCUMENT_CONFIGS: Record<DocumentType, DocumentConfig> = {
  SALE: { table: 'sale_headers', column: 'sale_no', defaultPrefix: 'SL' },
  PURCHASE: { table: 'purchase_headers', column: 'purchase_no', defaultPrefix: 'PR' },
  PURCHASE_RETURN: { table: 'purchase_return_headers', column: 'return_no', defaultPrefix: 'PR-RET' },
  SALE_RETURN: { table: 'sale_return_headers', column: 'return_no', defaultPrefix: 'SL-RET' },
  APPROVAL: { table: 'approval_headers', column: 'approval_no', defaultPrefix: 'AP' },
  ESTIMATE: { table: 'estimate_headers', column: 'estimate_no', defaultPrefix: 'EST' },
  JOB_WORK: { table: 'job_work_orders', column: 'order_no', defaultPrefix: 'JW' },
  REPAIR: { table: 'repair_entries', column: 'repair_no', defaultPrefix: 'REP' },
  QUOTATION: { table: 'quotations', column: 'quotation_number', defaultPrefix: 'QT' },
  ORDER: { table: 'customer_orders', column: 'order_number', defaultPrefix: 'ORD' },
  ADVANCE: { table: 'customer_advances', column: 'advance_number', defaultPrefix: 'ADV' },
  OLD_GOLD: { table: 'old_gold_receipts', column: 'receipt_number', defaultPrefix: 'OG' },
  EXCHANGE: { table: 'metal_exchanges', column: 'exchange_number', defaultPrefix: 'EX' }
}

function getSaleBillPrefix(): string {
  const db = getDatabase()
  const row = db
    .prepare(`SELECT bill_prefix FROM firm_settings WHERE id = 'default-firm'`)
    .get() as { bill_prefix?: string } | undefined

  const prefix = row?.bill_prefix?.trim()
  return prefix ? prefix.toUpperCase() : 'SL'
}

function extractSequenceNumber(documentNo: string, prefix: string): number {
  const clean = String(documentNo || '').trim()
  const expectedPrefix = `${prefix}-`

  if (!clean.startsWith(expectedPrefix)) {
    return 0
  }

  const numberPart = clean.replace(expectedPrefix, '')
  const parsed = Number(numberPart)
  return Number.isFinite(parsed) ? parsed : 0
}

export const documentSequenceService = {
  getNextNumber(type: DocumentType): string {
    const db = getDatabase()
    const config = DOCUMENT_CONFIGS[type]
    if (!config) {
      throw new Error(`Unsupported document type: ${type}`)
    }

    const prefix = type === 'SALE' ? getSaleBillPrefix() : config.defaultPrefix

    const rows = db
      .prepare(
        `
        SELECT ${config.column} AS doc_no
        FROM ${config.table}
        WHERE ${config.column} LIKE ?
        ORDER BY created_at DESC
      `
      )
      .all(`${prefix}-%`) as { doc_no: string }[]

    const maxNumber = rows.reduce((max, row) => {
      const num = extractSequenceNumber(row.doc_no, prefix)
      return Math.max(max, num)
    }, 0)

    const nextNumber = maxNumber + 1
    return `${prefix}-${String(nextNumber).padStart(4, '0')}`
  }
}
