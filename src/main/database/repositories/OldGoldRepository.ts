import { BaseRepository } from './BaseRepository'
import type {
  OldGoldReceiptRecord,
  OldGoldFilter,
  OldGoldStatus
} from '../../../shared/types/oldGold'

export interface OldGoldReceiptRow {
  id: string
  receipt_number: string
  customer_id: string | null
  customer_name: string | null
  customer_code: string | null
  account_id: string
  account_name: string | null
  receipt_date: string
  metal_type: string
  description: string | null
  gross_weight: number
  less_weight: number
  net_weight: number
  purity_name: string | null
  tunch: number
  fine_weight: number
  recovery_percent: number
  recoverable_fine_weight: number
  gold_rate: number
  metal_value: number
  deduction_amount: number
  valuation_amount: number
  allocated_amount: number
  status: OldGoldStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

const oldGoldSelectSql = `
  SELECT
    og.id,
    og.receipt_number,
    og.customer_id,
    c.name AS customer_name,
    c.customer_code,
    og.account_id,
    a.account_name,
    og.receipt_date,
    og.metal_type,
    og.description,
    og.gross_weight,
    og.less_weight,
    og.net_weight,
    og.purity_name,
    og.tunch,
    og.fine_weight,
    og.recovery_percent,
    og.recoverable_fine_weight,
    og.gold_rate,
    og.metal_value,
    og.deduction_amount,
    og.valuation_amount,
    og.allocated_amount,
    og.status,
    og.notes,
    og.created_by,
    og.created_at,
    og.updated_at,
    og.deleted_at
  FROM old_gold_receipts og
  LEFT JOIN customers c ON c.id = og.customer_id
  LEFT JOIN accounts a ON a.id = og.account_id
`

function mapRow(row: OldGoldReceiptRow): OldGoldReceiptRecord {
  const valuationAmount = Number(row.valuation_amount ?? 0)
  const allocatedAmount = Number(row.allocated_amount ?? 0)
  const unallocatedAmount = Math.max(0, valuationAmount - allocatedAmount)

  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerCode: row.customer_code,
    accountId: row.account_id,
    accountName: row.account_name,
    receiptDate: row.receipt_date,
    metalType: row.metal_type,
    description: row.description ?? '',
    grossWeight: Number(row.gross_weight ?? 0),
    lessWeight: Number(row.less_weight ?? 0),
    netWeight: Number(row.net_weight ?? 0),
    purityName: row.purity_name ?? '',
    tunch: Number(row.tunch ?? 100),
    fineWeight: Number(row.fine_weight ?? 0),
    recoveryPercent: Number(row.recovery_percent ?? 100),
    recoverableFineWeight: Number(row.recoverable_fine_weight ?? 0),
    goldRate: Number(row.gold_rate ?? 0),
    metalValue: Number(row.metal_value ?? 0),
    deductionAmount: Number(row.deduction_amount ?? 0),
    valuationAmount,
    allocatedAmount,
    unallocatedAmount,
    status: row.status,
    notes: row.notes ?? '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

export class OldGoldRepository extends BaseRepository {
  findAll(filter?: OldGoldFilter): OldGoldReceiptRecord[] {
    const conditions = ['og.deleted_at IS NULL']
    const params: unknown[] = []

    if (filter?.status) {
      conditions.push('og.status = ?')
      params.push(filter.status)
    }

    if (filter?.customerId) {
      conditions.push('og.customer_id = ?')
      params.push(filter.customerId)
    }

    if (filter?.accountId) {
      conditions.push('og.account_id = ?')
      params.push(filter.accountId)
    }

    if (filter?.metalType) {
      conditions.push('LOWER(og.metal_type) = LOWER(?)')
      params.push(filter.metalType)
    }

    if (filter?.startDate) {
      conditions.push('og.receipt_date >= ?')
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      conditions.push('og.receipt_date <= ?')
      params.push(filter.endDate)
    }

    if (filter?.search) {
      const pattern = `%${filter.search.trim().toLowerCase()}%`
      conditions.push(
        `(LOWER(og.receipt_number) LIKE ? OR LOWER(COALESCE(c.name, '')) LIKE ? OR LOWER(COALESCE(a.account_name, '')) LIKE ? OR LOWER(COALESCE(og.description, '')) LIKE ?)`
      )
      params.push(pattern, pattern, pattern, pattern)
    }

    const rows = this.db
      .prepare(
        `
        ${oldGoldSelectSql}
        WHERE ${conditions.join(' AND ')}
        ORDER BY og.receipt_date DESC, og.created_at DESC
      `
      )
      .all(...params) as OldGoldReceiptRow[]

    return rows.map(mapRow)
  }

  findById(id: string): OldGoldReceiptRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${oldGoldSelectSql}
        WHERE og.id = ? AND og.deleted_at IS NULL
      `
      )
      .get(id) as OldGoldReceiptRow | undefined

    return row ? mapRow(row) : undefined
  }

  findByNumber(number: string): OldGoldReceiptRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${oldGoldSelectSql}
        WHERE LOWER(og.receipt_number) = LOWER(?) AND og.deleted_at IS NULL
      `
      )
      .get(number) as OldGoldReceiptRow | undefined

    return row ? mapRow(row) : undefined
  }

  findByCustomer(customerId: string): OldGoldReceiptRecord[] {
    return this.findAll({ customerId })
  }

  insert(data: {
    id: string
    receiptNumber: string
    customerId?: string | null
    accountId: string
    receiptDate: string
    metalType: string
    description?: string | null
    grossWeight: number
    lessWeight: number
    netWeight: number
    purityName?: string | null
    tunch: number
    fineWeight: number
    recoveryPercent: number
    recoverableFineWeight: number
    goldRate: number
    metalValue: number
    deductionAmount: number
    valuationAmount: number
    allocatedAmount?: number
    status: OldGoldStatus
    notes?: string | null
    createdBy?: string | null
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO old_gold_receipts (
          id, receipt_number, customer_id, account_id, receipt_date,
          metal_type, description, gross_weight, less_weight, net_weight,
          purity_name, tunch, fine_weight, recovery_percent,
          recoverable_fine_weight, gold_rate, metal_value, deduction_amount,
          valuation_amount, allocated_amount, status, notes, created_by,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.receiptNumber,
        data.customerId ?? null,
        data.accountId,
        data.receiptDate,
        data.metalType,
        data.description ?? '',
        data.grossWeight,
        data.lessWeight,
        data.netWeight,
        data.purityName ?? '',
        data.tunch,
        data.fineWeight,
        data.recoveryPercent,
        data.recoverableFineWeight,
        data.goldRate,
        data.metalValue,
        data.deductionAmount,
        data.valuationAmount,
        data.allocatedAmount ?? 0,
        data.status,
        data.notes ?? '',
        data.createdBy ?? null,
        data.createdAt,
        data.updatedAt
      )
  }

  update(
    id: string,
    data: {
      allocatedAmount?: number
      status?: OldGoldStatus
      notes?: string | null
      updatedAt: string
    }
  ): void {
    this.db
      .prepare(
        `
        UPDATE old_gold_receipts
        SET
          allocated_amount = COALESCE(?, allocated_amount),
          status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          updated_at = ?
        WHERE id = ? AND deleted_at IS NULL
      `
      )
      .run(data.allocatedAmount ?? null, data.status ?? null, data.notes ?? null, data.updatedAt, id)
  }

  updateStatus(id: string, status: OldGoldStatus, updatedAt?: string): void {
    const time = updatedAt || new Date().toISOString()
    this.db
      .prepare(`UPDATE old_gold_receipts SET status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(status, time, id)
  }

  softDelete(id: string, now: string): void {
    this.db
      .prepare(`UPDATE old_gold_receipts SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(now, now, id)
  }
}
