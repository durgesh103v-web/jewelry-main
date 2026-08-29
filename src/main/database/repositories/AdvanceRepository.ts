import { BaseRepository } from './BaseRepository'
import type {
  CustomerAdvanceRecord,
  AdvanceAllocationRecord,
  CustomerAdvanceFilter,
  AdvanceStatus,
  PaymentMethod
} from '../../../shared/types/advance'

export interface CustomerAdvanceRow {
  id: string
  advance_number: string
  customer_id: string | null
  customer_name: string | null
  customer_code: string | null
  account_id: string
  account_name: string | null
  order_id: string | null
  order_number: string | null
  amount: number
  allocated_amount: number
  payment_method: PaymentMethod
  payment_reference: string | null
  advance_date: string
  status: AdvanceStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface AdvanceAllocationRow {
  id: string
  advance_id: string
  order_id: string
  order_number: string | null
  allocated_amount: number
  allocation_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

const advanceSelectSql = `
  SELECT
    ca.id,
    ca.advance_number,
    ca.customer_id,
    c.name AS customer_name,
    c.customer_code,
    ca.account_id,
    a.account_name,
    ca.order_id,
    co.order_number,
    ca.amount,
    ca.allocated_amount,
    ca.payment_method,
    ca.payment_reference,
    ca.advance_date,
    ca.status,
    ca.notes,
    ca.created_by,
    ca.created_at,
    ca.updated_at,
    ca.deleted_at
  FROM customer_advances ca
  LEFT JOIN customers c ON c.id = ca.customer_id
  LEFT JOIN accounts a ON a.id = ca.account_id
  LEFT JOIN customer_orders co ON co.id = ca.order_id
`

function mapAdvanceRow(row: CustomerAdvanceRow): CustomerAdvanceRecord {
  const amount = Number(row.amount ?? 0)
  const allocatedAmount = Number(row.allocated_amount ?? 0)
  const unallocatedAmount = Math.max(0, amount - allocatedAmount)

  return {
    id: row.id,
    advanceNumber: row.advance_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerCode: row.customer_code,
    accountId: row.account_id,
    accountName: row.account_name,
    orderId: row.order_id,
    orderNumber: row.order_number,
    amount,
    allocatedAmount,
    unallocatedAmount,
    paymentMethod: row.payment_method,
    paymentReference: row.payment_reference,
    advanceDate: row.advance_date,
    status: row.status,
    notes: row.notes ?? '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

function mapAllocationRow(row: AdvanceAllocationRow): AdvanceAllocationRecord {
  return {
    id: row.id,
    advanceId: row.advance_id,
    orderId: row.order_id,
    orderNumber: row.order_number,
    allocatedAmount: Number(row.allocated_amount ?? 0),
    allocationDate: row.allocation_date,
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class AdvanceRepository extends BaseRepository {
  findAll(filter?: CustomerAdvanceFilter): CustomerAdvanceRecord[] {
    const conditions = ['ca.deleted_at IS NULL']
    const params: unknown[] = []

    if (filter?.status) {
      conditions.push('ca.status = ?')
      params.push(filter.status)
    }

    if (filter?.customerId) {
      conditions.push('ca.customer_id = ?')
      params.push(filter.customerId)
    }

    if (filter?.accountId) {
      conditions.push('ca.account_id = ?')
      params.push(filter.accountId)
    }

    if (filter?.orderId) {
      conditions.push('ca.order_id = ?')
      params.push(filter.orderId)
    }

    if (filter?.paymentMethod) {
      conditions.push('ca.payment_method = ?')
      params.push(filter.paymentMethod)
    }

    if (filter?.startDate) {
      conditions.push('ca.advance_date >= ?')
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      conditions.push('ca.advance_date <= ?')
      params.push(filter.endDate)
    }

    if (filter?.search) {
      const pattern = `%${filter.search.trim().toLowerCase()}%`
      conditions.push(
        `(LOWER(ca.advance_number) LIKE ? OR LOWER(COALESCE(c.name, '')) LIKE ? OR LOWER(COALESCE(a.account_name, '')) LIKE ? OR LOWER(COALESCE(ca.payment_reference, '')) LIKE ?)`
      )
      params.push(pattern, pattern, pattern, pattern)
    }

    const rows = this.db
      .prepare(
        `
        ${advanceSelectSql}
        WHERE ${conditions.join(' AND ')}
        ORDER BY ca.advance_date DESC, ca.created_at DESC
      `
      )
      .all(...params) as CustomerAdvanceRow[]

    return rows.map(mapAdvanceRow)
  }

  findById(id: string): CustomerAdvanceRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${advanceSelectSql}
        WHERE ca.id = ? AND ca.deleted_at IS NULL
      `
      )
      .get(id) as CustomerAdvanceRow | undefined

    if (!row) return undefined

    const advance = mapAdvanceRow(row)
    advance.allocations = this.getAllocationsByAdvance(id)
    return advance
  }

  findByNumber(number: string): CustomerAdvanceRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${advanceSelectSql}
        WHERE LOWER(ca.advance_number) = LOWER(?) AND ca.deleted_at IS NULL
      `
      )
      .get(number) as CustomerAdvanceRow | undefined

    if (!row) return undefined

    const advance = mapAdvanceRow(row)
    advance.allocations = this.getAllocationsByAdvance(row.id)
    return advance
  }

  findByCustomer(customerId: string): CustomerAdvanceRecord[] {
    return this.findAll({ customerId })
  }

  findByOrder(orderId: string): CustomerAdvanceRecord[] {
    return this.findAll({ orderId })
  }

  getAllocationsByAdvance(advanceId: string): AdvanceAllocationRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT
          aa.*,
          co.order_number
        FROM advance_allocations aa
        LEFT JOIN customer_orders co ON co.id = aa.order_id
        WHERE aa.advance_id = ?
        ORDER BY aa.allocation_date ASC, aa.created_at ASC
      `
      )
      .all(advanceId) as AdvanceAllocationRow[]

    return rows.map(mapAllocationRow)
  }

  getAllocationsByOrder(orderId: string): AdvanceAllocationRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT
          aa.*,
          co.order_number
        FROM advance_allocations aa
        LEFT JOIN customer_orders co ON co.id = aa.order_id
        WHERE aa.order_id = ?
        ORDER BY aa.allocation_date ASC, aa.created_at ASC
      `
      )
      .all(orderId) as AdvanceAllocationRow[]

    return rows.map(mapAllocationRow)
  }

  insert(data: {
    id: string
    advanceNumber: string
    customerId?: string | null
    accountId: string
    orderId?: string | null
    amount: number
    allocatedAmount?: number
    paymentMethod: PaymentMethod
    paymentReference?: string | null
    advanceDate: string
    status: AdvanceStatus
    notes?: string | null
    createdBy?: string | null
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO customer_advances (
          id, advance_number, customer_id, account_id, order_id,
          amount, allocated_amount, payment_method, payment_reference,
          advance_date, status, notes, created_by, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.advanceNumber,
        data.customerId ?? null,
        data.accountId,
        data.orderId ?? null,
        data.amount,
        data.allocatedAmount ?? 0,
        data.paymentMethod,
        data.paymentReference ?? '',
        data.advanceDate,
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
      status?: AdvanceStatus
      notes?: string | null
      updatedAt: string
    }
  ): void {
    this.db
      .prepare(
        `
        UPDATE customer_advances
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

  updateStatus(id: string, status: AdvanceStatus, updatedAt?: string): void {
    const time = updatedAt || new Date().toISOString()
    this.db
      .prepare(`UPDATE customer_advances SET status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(status, time, id)
  }

  insertAllocation(data: {
    id: string
    advanceId: string
    orderId: string
    allocatedAmount: number
    allocationDate: string
    notes?: string | null
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO advance_allocations (
          id, advance_id, order_id, allocated_amount, allocation_date,
          notes, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.advanceId,
        data.orderId,
        data.allocatedAmount,
        data.allocationDate,
        data.notes ?? '',
        data.createdAt,
        data.updatedAt
      )
  }

  deleteAllocationsByAdvance(advanceId: string): void {
    this.db.prepare(`DELETE FROM advance_allocations WHERE advance_id = ?`).run(advanceId)
  }

  softDelete(id: string, now: string): void {
    this.db
      .prepare(`UPDATE customer_advances SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(now, now, id)
  }
}
