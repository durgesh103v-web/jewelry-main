import { BaseRepository } from './BaseRepository'
import type {
  CustomerOrderRecord,
  CustomerOrderItemRecord,
  CustomerOrderFilter,
  OrderStatus
} from '../../../shared/types/customerOrder'
import type { LabourRateType } from '../../../shared/jewelleryFormula'

export interface CustomerOrderHeaderRow {
  id: string
  order_number: string
  quotation_id: string | null
  quotation_number: string | null
  customer_id: string | null
  customer_name: string | null
  customer_code: string | null
  account_id: string
  account_name: string | null
  order_date: string
  expected_delivery_date: string | null
  status: OrderStatus
  metal_type: string
  total_pcs: number
  total_gross_weight: number
  total_net_weight: number
  total_fine_weight: number
  total_majuri: number
  metal_value: number
  total_charges: number
  discount_amount: number
  taxable_amount: number
  tax_amount: number
  grand_total: number
  rounded_total: number
  advance_amount: number
  pricing_snapshot: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CustomerOrderItemRow {
  id: string
  order_id: string
  item_id: string
  item_name: string | null
  description: string | null
  stamp_id: string | null
  design_id: string | null
  barcode: string | null
  pcs: number
  gross_weight: number
  pack_weight: number
  less_weight: number
  add_weight: number
  net_weight: number
  fine_weight: number
  metal_type: string
  purity_name: string | null
  tunch: number
  wastage: number
  hishob: number
  gold_rate: number
  metal_value: number
  labour_rate: number
  labour_rate_type: string
  making_charges: number
  stone_charges: number
  diamond_charges: number
  discount_amount: number
  taxable_amount: number
  tax_percent: number
  tax_amount: number
  line_total: number
  pricing_breakdown: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

const orderHeaderSelectSql = `
  SELECT
    o.id,
    o.order_number,
    o.quotation_id,
    q.quotation_number,
    o.customer_id,
    c.name AS customer_name,
    c.customer_code,
    o.account_id,
    a.account_name,
    o.order_date,
    o.expected_delivery_date,
    o.status,
    o.metal_type,
    o.total_pcs,
    o.total_gross_weight,
    o.total_net_weight,
    o.total_fine_weight,
    o.total_majuri,
    o.metal_value,
    o.total_charges,
    o.discount_amount,
    o.taxable_amount,
    o.tax_amount,
    o.grand_total,
    o.rounded_total,
    o.advance_amount,
    o.pricing_snapshot,
    o.notes,
    o.created_by,
    o.created_at,
    o.updated_at,
    o.deleted_at
  FROM customer_orders o
  LEFT JOIN quotations q ON q.id = o.quotation_id
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN accounts a ON a.id = o.account_id
`

function mapHeaderRow(row: CustomerOrderHeaderRow): CustomerOrderRecord {
  let pricingSnapshot = null
  if (row.pricing_snapshot) {
    try {
      pricingSnapshot = JSON.parse(row.pricing_snapshot)
    } catch {
      pricingSnapshot = null
    }
  }

  return {
    id: row.id,
    orderNumber: row.order_number,
    quotationId: row.quotation_id,
    quotationNumber: row.quotation_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerCode: row.customer_code,
    accountId: row.account_id,
    accountName: row.account_name,
    orderDate: row.order_date,
    expectedDeliveryDate: row.expected_delivery_date,
    status: row.status,
    metalType: row.metal_type,
    totalPcs: Number(row.total_pcs ?? 0),
    totalGrossWeight: Number(row.total_gross_weight ?? 0),
    totalNetWeight: Number(row.total_net_weight ?? 0),
    totalFineWeight: Number(row.total_fine_weight ?? 0),
    totalMajuri: Number(row.total_majuri ?? 0),
    metalValue: Number(row.metal_value ?? 0),
    totalCharges: Number(row.total_charges ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    taxableAmount: Number(row.taxable_amount ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    grandTotal: Number(row.grand_total ?? 0),
    roundedTotal: Number(row.rounded_total ?? 0),
    advanceAmount: Number(row.advance_amount ?? 0),
    pricingSnapshot,
    notes: row.notes ?? '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

function mapItemRow(row: CustomerOrderItemRow): CustomerOrderItemRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    itemId: row.item_id,
    itemName: row.item_name,
    description: row.description,
    stampId: row.stamp_id,
    designId: row.design_id,
    barcode: row.barcode,
    pcs: Number(row.pcs ?? 1),
    grossWeight: Number(row.gross_weight ?? 0),
    packWeight: Number(row.pack_weight ?? 0),
    lessWeight: Number(row.less_weight ?? 0),
    addWeight: Number(row.add_weight ?? 0),
    netWeight: Number(row.net_weight ?? 0),
    fineWeight: Number(row.fine_weight ?? 0),
    metalType: row.metal_type,
    purityName: row.purity_name,
    tunch: Number(row.tunch ?? 100),
    wastage: Number(row.wastage ?? 0),
    hishob: Number(row.hishob ?? 100),
    goldRate: Number(row.gold_rate ?? 0),
    metalValue: Number(row.metal_value ?? 0),
    labourRate: Number(row.labour_rate ?? 0),
    labourRateType: (row.labour_rate_type as LabourRateType) || 'Kg',
    makingCharges: Number(row.making_charges ?? 0),
    stoneCharges: Number(row.stone_charges ?? 0),
    diamondCharges: Number(row.diamond_charges ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    taxableAmount: Number(row.taxable_amount ?? 0),
    taxPercent: Number(row.tax_percent ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    lineTotal: Number(row.line_total ?? 0),
    pricingBreakdown: row.pricing_breakdown,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class CustomerOrderRepository extends BaseRepository {
  findAll(filter?: CustomerOrderFilter): CustomerOrderRecord[] {
    const conditions = ['o.deleted_at IS NULL']
    const params: unknown[] = []

    if (filter?.status) {
      conditions.push('o.status = ?')
      params.push(filter.status)
    }

    if (filter?.customerId) {
      conditions.push('o.customer_id = ?')
      params.push(filter.customerId)
    }

    if (filter?.accountId) {
      conditions.push('o.account_id = ?')
      params.push(filter.accountId)
    }

    if (filter?.startDate) {
      conditions.push('o.order_date >= ?')
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      conditions.push('o.order_date <= ?')
      params.push(filter.endDate)
    }

    if (filter?.search) {
      const pattern = `%${filter.search.trim().toLowerCase()}%`
      conditions.push(
        `(LOWER(o.order_number) LIKE ? OR LOWER(COALESCE(c.name, '')) LIKE ? OR LOWER(COALESCE(a.account_name, '')) LIKE ?)`
      )
      params.push(pattern, pattern, pattern)
    }

    const rows = this.db
      .prepare(
        `
        ${orderHeaderSelectSql}
        WHERE ${conditions.join(' AND ')}
        ORDER BY o.order_date DESC, o.created_at DESC
      `
      )
      .all(...params) as CustomerOrderHeaderRow[]

    return rows.map(mapHeaderRow)
  }

  findById(id: string): CustomerOrderRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${orderHeaderSelectSql}
        WHERE o.id = ? AND o.deleted_at IS NULL
      `
      )
      .get(id) as CustomerOrderHeaderRow | undefined

    if (!row) return undefined

    const order = mapHeaderRow(row)
    order.items = this.getItems(id)
    return order
  }

  findByNumber(number: string): CustomerOrderRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${orderHeaderSelectSql}
        WHERE LOWER(o.order_number) = LOWER(?) AND o.deleted_at IS NULL
      `
      )
      .get(number) as CustomerOrderHeaderRow | undefined

    if (!row) return undefined

    const order = mapHeaderRow(row)
    order.items = this.getItems(row.id)
    return order
  }

  getItems(orderId: string): CustomerOrderItemRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT
          oi.*,
          i.item_name
        FROM customer_order_items oi
        LEFT JOIN items i ON i.id = oi.item_id
        WHERE oi.order_id = ?
        ORDER BY oi.sort_order ASC, oi.created_at ASC
      `
      )
      .all(orderId) as CustomerOrderItemRow[]

    return rows.map(mapItemRow)
  }

  insertHeader(data: {
    id: string
    orderNumber: string
    quotationId?: string | null
    customerId?: string | null
    accountId: string
    orderDate: string
    expectedDeliveryDate?: string | null
    status: OrderStatus
    metalType: string
    totalPcs: number
    totalGrossWeight: number
    totalNetWeight: number
    totalFineWeight: number
    totalMajuri: number
    metalValue: number
    totalCharges: number
    discountAmount: number
    taxableAmount: number
    taxAmount: number
    grandTotal: number
    roundedTotal: number
    advanceAmount: number
    pricingSnapshot?: string | null
    notes?: string | null
    createdBy?: string | null
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO customer_orders (
          id, order_number, quotation_id, customer_id, account_id, order_date,
          expected_delivery_date, status, metal_type, total_pcs, total_gross_weight,
          total_net_weight, total_fine_weight, total_majuri, metal_value,
          total_charges, discount_amount, taxable_amount, tax_amount, grand_total,
          rounded_total, advance_amount, pricing_snapshot, notes, created_by,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.orderNumber,
        data.quotationId ?? null,
        data.customerId ?? null,
        data.accountId,
        data.orderDate,
        data.expectedDeliveryDate ?? null,
        data.status,
        data.metalType,
        data.totalPcs,
        data.totalGrossWeight,
        data.totalNetWeight,
        data.totalFineWeight,
        data.totalMajuri,
        data.metalValue,
        data.totalCharges,
        data.discountAmount,
        data.taxableAmount,
        data.taxAmount,
        data.grandTotal,
        data.roundedTotal,
        data.advanceAmount,
        data.pricingSnapshot ?? null,
        data.notes ?? '',
        data.createdBy ?? null,
        data.createdAt,
        data.updatedAt
      )
  }

  insertItem(data: {
    id: string
    orderId: string
    itemId: string
    description?: string | null
    stampId?: string | null
    designId?: string | null
    barcode?: string | null
    pcs: number
    grossWeight: number
    packWeight: number
    lessWeight: number
    addWeight: number
    netWeight: number
    fineWeight: number
    metalType: string
    purityName?: string | null
    tunch: number
    wastage: number
    hishob: number
    goldRate: number
    metalValue: number
    labourRate: number
    labourRateType: string
    makingCharges: number
    stoneCharges: number
    diamondCharges: number
    discountAmount: number
    taxableAmount: number
    taxPercent: number
    taxAmount: number
    lineTotal: number
    pricingBreakdown?: string | null
    sortOrder: number
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO customer_order_items (
          id, order_id, item_id, description, stamp_id, design_id,
          barcode, pcs, gross_weight, pack_weight, less_weight, add_weight,
          net_weight, fine_weight, metal_type, purity_name, tunch, wastage,
          hishob, gold_rate, metal_value, labour_rate, labour_rate_type,
          making_charges, stone_charges, diamond_charges, discount_amount,
          taxable_amount, tax_percent, tax_amount, line_total, pricing_breakdown,
          sort_order, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.orderId,
        data.itemId,
        data.description ?? '',
        data.stampId ?? null,
        data.designId ?? null,
        data.barcode ?? null,
        data.pcs,
        data.grossWeight,
        data.packWeight,
        data.lessWeight,
        data.addWeight,
        data.netWeight,
        data.fineWeight,
        data.metalType,
        data.purityName ?? null,
        data.tunch,
        data.wastage,
        data.hishob,
        data.goldRate,
        data.metalValue,
        data.labourRate,
        data.labourRateType,
        data.makingCharges,
        data.stoneCharges,
        data.diamondCharges,
        data.discountAmount,
        data.taxableAmount,
        data.taxPercent,
        data.taxAmount,
        data.lineTotal,
        data.pricingBreakdown ?? null,
        data.sortOrder,
        data.createdAt,
        data.updatedAt
      )
  }

  deleteItems(orderId: string): void {
    this.db.prepare(`DELETE FROM customer_order_items WHERE order_id = ?`).run(orderId)
  }

  updateStatus(id: string, status: OrderStatus, updatedAt?: string): void {
    const time = updatedAt || new Date().toISOString()
    this.db
      .prepare(`UPDATE customer_orders SET status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(status, time, id)
  }

  softDelete(id: string, now: string): void {
    this.db
      .prepare(`UPDATE customer_orders SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(now, now, id)
  }
}
