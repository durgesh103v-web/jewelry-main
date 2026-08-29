import { BaseRepository } from './BaseRepository'
import type {
  MetalExchangeRecord,
  MetalExchangeFilter,
  ExchangeStatus
} from '../../../shared/types/metalExchange'

export interface MetalExchangeRow {
  id: string
  exchange_number: string
  old_gold_receipt_id: string
  receipt_number: string | null
  customer_id: string | null
  customer_name: string | null
  customer_code: string | null
  account_id: string
  account_name: string | null
  order_id: string | null
  order_number: string | null
  sale_id: string | null
  exchange_date: string
  exchange_amount: number
  status: ExchangeStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

const exchangeSelectSql = `
  SELECT
    me.id,
    me.exchange_number,
    me.old_gold_receipt_id,
    og.receipt_number,
    me.customer_id,
    c.name AS customer_name,
    c.customer_code,
    me.account_id,
    a.account_name,
    me.order_id,
    co.order_number,
    me.sale_id,
    me.exchange_date,
    me.exchange_amount,
    me.status,
    me.notes,
    me.created_by,
    me.created_at,
    me.updated_at,
    me.deleted_at
  FROM metal_exchanges me
  LEFT JOIN old_gold_receipts og ON og.id = me.old_gold_receipt_id
  LEFT JOIN customers c ON c.id = me.customer_id
  LEFT JOIN accounts a ON a.id = me.account_id
  LEFT JOIN customer_orders co ON co.id = me.order_id
`

function mapRow(row: MetalExchangeRow): MetalExchangeRecord {
  return {
    id: row.id,
    exchangeNumber: row.exchange_number,
    oldGoldReceiptId: row.old_gold_receipt_id,
    oldGoldReceiptNumber: row.receipt_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerCode: row.customer_code,
    accountId: row.account_id,
    accountName: row.account_name,
    orderId: row.order_id,
    orderNumber: row.order_number,
    saleId: row.sale_id,
    exchangeDate: row.exchange_date,
    exchangeAmount: Number(row.exchange_amount ?? 0),
    status: row.status,
    notes: row.notes ?? '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

export class MetalExchangeRepository extends BaseRepository {
  findAll(filter?: MetalExchangeFilter): MetalExchangeRecord[] {
    const conditions = ['me.deleted_at IS NULL']
    const params: unknown[] = []

    if (filter?.status) {
      conditions.push('me.status = ?')
      params.push(filter.status)
    }

    if (filter?.oldGoldReceiptId) {
      conditions.push('me.old_gold_receipt_id = ?')
      params.push(filter.oldGoldReceiptId)
    }

    if (filter?.customerId) {
      conditions.push('me.customer_id = ?')
      params.push(filter.customerId)
    }

    if (filter?.accountId) {
      conditions.push('me.account_id = ?')
      params.push(filter.accountId)
    }

    if (filter?.orderId) {
      conditions.push('me.order_id = ?')
      params.push(filter.orderId)
    }

    if (filter?.startDate) {
      conditions.push('me.exchange_date >= ?')
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      conditions.push('me.exchange_date <= ?')
      params.push(filter.endDate)
    }

    if (filter?.search) {
      const pattern = `%${filter.search.trim().toLowerCase()}%`
      conditions.push(
        `(LOWER(me.exchange_number) LIKE ? OR LOWER(COALESCE(c.name, '')) LIKE ? OR LOWER(COALESCE(a.account_name, '')) LIKE ?)`
      )
      params.push(pattern, pattern, pattern)
    }

    const rows = this.db
      .prepare(
        `
        ${exchangeSelectSql}
        WHERE ${conditions.join(' AND ')}
        ORDER BY me.exchange_date DESC, me.created_at DESC
      `
      )
      .all(...params) as MetalExchangeRow[]

    return rows.map(mapRow)
  }

  findById(id: string): MetalExchangeRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${exchangeSelectSql}
        WHERE me.id = ? AND me.deleted_at IS NULL
      `
      )
      .get(id) as MetalExchangeRow | undefined

    return row ? mapRow(row) : undefined
  }

  findByNumber(number: string): MetalExchangeRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${exchangeSelectSql}
        WHERE LOWER(me.exchange_number) = LOWER(?) AND me.deleted_at IS NULL
      `
      )
      .get(number) as MetalExchangeRow | undefined

    return row ? mapRow(row) : undefined
  }

  findByOldGoldReceipt(receiptId: string): MetalExchangeRecord[] {
    return this.findAll({ oldGoldReceiptId: receiptId })
  }

  findByOrder(orderId: string): MetalExchangeRecord[] {
    return this.findAll({ orderId })
  }

  insert(data: {
    id: string
    exchangeNumber: string
    oldGoldReceiptId: string
    customerId?: string | null
    accountId: string
    orderId?: string | null
    saleId?: string | null
    exchangeDate: string
    exchangeAmount: number
    status: ExchangeStatus
    notes?: string | null
    createdBy?: string | null
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO metal_exchanges (
          id, exchange_number, old_gold_receipt_id, customer_id, account_id,
          order_id, sale_id, exchange_date, exchange_amount, status, notes,
          created_by, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.exchangeNumber,
        data.oldGoldReceiptId,
        data.customerId ?? null,
        data.accountId,
        data.orderId ?? null,
        data.saleId ?? null,
        data.exchangeDate,
        data.exchangeAmount,
        data.status,
        data.notes ?? '',
        data.createdBy ?? null,
        data.createdAt,
        data.updatedAt
      )
  }

  updateStatus(id: string, status: ExchangeStatus, updatedAt?: string): void {
    const time = updatedAt || new Date().toISOString()
    this.db
      .prepare(`UPDATE metal_exchanges SET status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(status, time, id)
  }

  softDelete(id: string, now: string): void {
    this.db
      .prepare(`UPDATE metal_exchanges SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(now, now, id)
  }
}
