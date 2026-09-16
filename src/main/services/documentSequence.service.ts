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
  | 'CONSIGNMENT_INWARD'
  | 'CONSIGNMENT_RETURN'
  | 'CONSIGNMENT_SETTLEMENT'

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
  EXCHANGE: { table: 'metal_exchanges', column: 'exchange_number', defaultPrefix: 'EX' },
  CONSIGNMENT_INWARD: { table: 'consignment_inwards', column: 'consignment_number', defaultPrefix: 'CON' },
  CONSIGNMENT_RETURN: { table: 'consignment_returns', column: 'return_number', defaultPrefix: 'CNR' },
  CONSIGNMENT_SETTLEMENT: { table: 'consignment_settlements', column: 'settlement_number', defaultPrefix: 'SET' }
}

function getSaleBillPrefix(): string {
  const db = getDatabase()
  const row = db
    .prepare(`SELECT bill_prefix FROM firm_settings WHERE id = 'default-firm'`)
    .get() as { bill_prefix?: string } | undefined

  const prefix = row?.bill_prefix?.trim()
  return prefix ? prefix.toUpperCase() : 'SL'
}

export const documentSequenceService = {
  getNextNumber(type: DocumentType): string {
    const db = getDatabase()
    const config = DOCUMENT_CONFIGS[type]
    if (!config) {
      throw new Error(`Unsupported document type: ${type}`)
    }

    const prefix = type === 'SALE' ? getSaleBillPrefix() : config.defaultPrefix

    const sources = [{ table: config.table, column: config.column }]
    if (type === 'SALE') {
      sources.push({ table: 'sales_invoices', column: 'invoice_number' })
    } else if (type === 'PURCHASE') {
      sources.push({ table: 'purchase_invoices', column: 'invoice_number' })
    } else if (type === 'SALE_RETURN' || type === 'PURCHASE_RETURN') {
      sources.push({ table: 'return_transactions', column: 'return_number' })
    }

    let maxNumber = 0
    for (const src of sources) {
      try {
        const row = db
          .prepare(
            `
            SELECT MAX(CAST(SUBSTR(${src.column}, LENGTH(?) + 2) AS INTEGER)) AS max_num
            FROM ${src.table}
            WHERE ${src.column} LIKE ?
          `
          )
          .get(prefix, `${prefix}-%`) as { max_num: number | null } | undefined

        const num = Number(row?.max_num ?? 0)
        if (num > maxNumber) maxNumber = num
      } catch {
        // Table or column may not exist in legacy schema; ignore
      }
    }

    const nextNumber = maxNumber + 1
    return `${prefix}-${String(nextNumber).padStart(4, '0')}`
  }
}
