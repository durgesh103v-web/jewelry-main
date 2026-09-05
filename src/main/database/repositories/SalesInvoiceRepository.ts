import { BaseRepository } from './BaseRepository'
import type {
  SalesInvoiceRecord,
  SalesInvoiceItemRecord,
  SalesInvoicePaymentRecord,
  SalesInvoiceFilter,
  SalesInvoiceStatus
} from '../../../shared/types/salesInvoice'
import type { PaymentMethod } from '../../../shared/types/advance'

export interface SalesInvoiceRow {
  id: string
  invoice_number: string
  customer_id: string | null
  customer_name: string | null
  customer_code: string | null
  customer_phone: string | null
  account_id: string
  account_name: string | null
  order_id: string | null
  order_number: string | null
  invoice_date: string
  metal_type: string
  total_pcs: number
  gross_weight: number
  net_weight: number
  fine_weight: number
  subtotal: number
  discount_amount: number
  taxable_amount: number
  tax_amount: number
  old_gold_exchange_amount: number
  advance_amount: number
  round_off: number
  grand_total: number
  paid_amount: number
  balance_due: number
  pricing_snapshot: string | null
  status: SalesInvoiceStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface SalesInvoiceItemRow {
  id: string
  invoice_id: string
  item_id: string
  item_name: string | null
  item_code: string | null
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
  metal_type: string
  purity_name: string | null
  tunch: number
  wastage: number
  fine_weight: number
  gold_rate: number
  metal_value: number
  labour_rate: number
  labour_rate_type: 'Kg' | 'Gm' | 'Pcs'
  making_charges: number
  stone_charges: number
  diamond_charges: number
  discount_amount: number
  taxable_amount: number
  tax_percent: number
  tax_amount: number
  line_total: number
  pricing_breakdown: string | null
  created_at: string
  updated_at: string
}

export interface SalesInvoicePaymentRow {
  id: string
  invoice_id: string
  payment_method: PaymentMethod
  amount: number
  payment_reference: string | null
  payment_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

const invoiceSelectSql = `
  SELECT
    si.id,
    si.invoice_number,
    si.customer_id,
    c.name AS customer_name,
    c.customer_code,
    c.mobile AS customer_phone,
    si.account_id,
    a.account_name,
    si.order_id,
    co.order_number,
    si.invoice_date,
    si.metal_type,
    si.total_pcs,
    si.gross_weight,
    si.net_weight,
    si.fine_weight,
    si.subtotal,
    si.discount_amount,
    si.taxable_amount,
    si.tax_amount,
    si.old_gold_exchange_amount,
    si.advance_amount,
    si.round_off,
    si.grand_total,
    si.paid_amount,
    si.balance_due,
    si.pricing_snapshot,
    si.status,
    si.notes,
    si.created_by,
    si.created_at,
    si.updated_at,
    si.deleted_at
  FROM sales_invoices si
  LEFT JOIN customers c ON c.id = si.customer_id
  LEFT JOIN accounts a ON a.id = si.account_id
  LEFT JOIN customer_orders co ON co.id = si.order_id
`

function mapInvoiceRow(row: SalesInvoiceRow): SalesInvoiceRecord {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerCode: row.customer_code,
    customerPhone: row.customer_phone,
    accountId: row.account_id,
    accountName: row.account_name,
    orderId: row.order_id,
    orderNumber: row.order_number,
    invoiceDate: row.invoice_date,
    metalType: row.metal_type,
    totalPcs: Number(row.total_pcs ?? 0),
    grossWeight: Number(row.gross_weight ?? 0),
    netWeight: Number(row.net_weight ?? 0),
    fineWeight: Number(row.fine_weight ?? 0),
    subtotal: Number(row.subtotal ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    taxableAmount: Number(row.taxable_amount ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    oldGoldExchangeAmount: Number(row.old_gold_exchange_amount ?? 0),
    advanceAmount: Number(row.advance_amount ?? 0),
    roundOff: Number(row.round_off ?? 0),
    grandTotal: Number(row.grand_total ?? 0),
    paidAmount: Number(row.paid_amount ?? 0),
    balanceDue: Number(row.balance_due ?? 0),
    pricingSnapshot: row.pricing_snapshot,
    status: row.status,
    notes: row.notes ?? '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

function mapItemRow(row: SalesInvoiceItemRow): SalesInvoiceItemRecord {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    itemId: row.item_id,
    itemName: row.item_name,
    itemCode: row.item_code,
    description: row.description ?? '',
    stampId: row.stamp_id,
    designId: row.design_id,
    barcode: row.barcode,
    pcs: Number(row.pcs ?? 1),
    grossWeight: Number(row.gross_weight ?? 0),
    packWeight: Number(row.pack_weight ?? 0),
    lessWeight: Number(row.less_weight ?? 0),
    addWeight: Number(row.add_weight ?? 0),
    netWeight: Number(row.net_weight ?? 0),
    metalType: row.metal_type,
    purityName: row.purity_name ?? '',
    tunch: Number(row.tunch ?? 100),
    wastage: Number(row.wastage ?? 0),
    fineWeight: Number(row.fine_weight ?? 0),
    goldRate: Number(row.gold_rate ?? 0),
    metalValue: Number(row.metal_value ?? 0),
    labourRate: Number(row.labour_rate ?? 0),
    labourRateType: row.labour_rate_type || 'Kg',
    makingCharges: Number(row.making_charges ?? 0),
    stoneCharges: Number(row.stone_charges ?? 0),
    diamondCharges: Number(row.diamond_charges ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    taxableAmount: Number(row.taxable_amount ?? 0),
    taxPercent: Number(row.tax_percent ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    lineTotal: Number(row.line_total ?? 0),
    pricingBreakdown: row.pricing_breakdown ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapPaymentRow(row: SalesInvoicePaymentRow): SalesInvoicePaymentRecord {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    paymentMethod: row.payment_method,
    amount: Number(row.amount ?? 0),
    paymentReference: row.payment_reference,
    paymentDate: row.payment_date,
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class SalesInvoiceRepository extends BaseRepository {
  findAll(filter?: SalesInvoiceFilter): SalesInvoiceRecord[] {
    const conditions = ['si.deleted_at IS NULL']
    const params: unknown[] = []

    if (filter?.status) {
      conditions.push('si.status = ?')
      params.push(filter.status)
    }

    if (filter?.customerId) {
      conditions.push('si.customer_id = ?')
      params.push(filter.customerId)
    }

    if (filter?.accountId) {
      conditions.push('si.account_id = ?')
      params.push(filter.accountId)
    }

    if (filter?.orderId) {
      conditions.push('si.order_id = ?')
      params.push(filter.orderId)
    }

    if (filter?.metalType) {
      conditions.push('LOWER(si.metal_type) = LOWER(?)')
      params.push(filter.metalType)
    }

    if (filter?.startDate) {
      conditions.push('si.invoice_date >= ?')
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      conditions.push('si.invoice_date <= ?')
      params.push(filter.endDate)
    }

    if (filter?.search) {
      const pattern = `%${filter.search.trim().toLowerCase()}%`
      conditions.push(
        `(LOWER(si.invoice_number) LIKE ? OR LOWER(COALESCE(c.name, '')) LIKE ? OR LOWER(COALESCE(c.mobile, '')) LIKE ? OR LOWER(COALESCE(a.account_name, '')) LIKE ?)`
      )
      params.push(pattern, pattern, pattern, pattern)
    }

    const rows = this.db
      .prepare(
        `
        ${invoiceSelectSql}
        WHERE ${conditions.join(' AND ')}
        ORDER BY si.invoice_date DESC, si.created_at DESC
      `
      )
      .all(...params) as SalesInvoiceRow[]

    return rows.map(mapInvoiceRow)
  }

  findById(id: string): SalesInvoiceRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${invoiceSelectSql}
        WHERE si.id = ? AND si.deleted_at IS NULL
      `
      )
      .get(id) as SalesInvoiceRow | undefined

    if (!row) return undefined

    const invoice = mapInvoiceRow(row)
    invoice.items = this.getItems(id)
    invoice.payments = this.getPayments(id)
    return invoice
  }

  findByNumber(number: string): SalesInvoiceRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${invoiceSelectSql}
        WHERE LOWER(si.invoice_number) = LOWER(?) AND si.deleted_at IS NULL
      `
      )
      .get(number) as SalesInvoiceRow | undefined

    if (!row) return undefined

    const invoice = mapInvoiceRow(row)
    invoice.items = this.getItems(row.id)
    invoice.payments = this.getPayments(row.id)
    return invoice
  }

  getItems(invoiceId: string): SalesInvoiceItemRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT
          sii.*,
          i.item_name,
          i.item_code
        FROM sales_invoice_items sii
        LEFT JOIN items i ON i.id = sii.item_id
        WHERE sii.invoice_id = ?
        ORDER BY sii.created_at ASC
      `
      )
      .all(invoiceId) as SalesInvoiceItemRow[]

    return rows.map(mapItemRow)
  }

  getPayments(invoiceId: string): SalesInvoicePaymentRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT *
        FROM sales_invoice_payments
        WHERE invoice_id = ?
        ORDER BY payment_date ASC, created_at ASC
      `
      )
      .all(invoiceId) as SalesInvoicePaymentRow[]

    return rows.map(mapPaymentRow)
  }

  insertHeader(data: {
    id: string
    invoiceNumber: string
    customerId?: string | null
    accountId: string
    orderId?: string | null
    invoiceDate: string
    metalType: string
    totalPcs: number
    grossWeight: number
    netWeight: number
    fineWeight: number
    subtotal: number
    discountAmount: number
    taxableAmount: number
    taxAmount: number
    oldGoldExchangeAmount: number
    advanceAmount: number
    roundOff: number
    grandTotal: number
    paidAmount: number
    balanceDue: number
    pricingSnapshot?: string | null
    status: SalesInvoiceStatus
    notes?: string | null
    createdBy?: string | null
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO sales_invoices (
          id, invoice_number, customer_id, account_id, order_id,
          invoice_date, metal_type, total_pcs, gross_weight, net_weight,
          fine_weight, subtotal, discount_amount, taxable_amount, tax_amount,
          old_gold_exchange_amount, advance_amount, round_off, grand_total,
          paid_amount, balance_due, pricing_snapshot, status, notes,
          created_by, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.invoiceNumber,
        data.customerId ?? null,
        data.accountId,
        data.orderId ?? null,
        data.invoiceDate,
        data.metalType,
        data.totalPcs,
        data.grossWeight,
        data.netWeight,
        data.fineWeight,
        data.subtotal,
        data.discountAmount,
        data.taxableAmount,
        data.taxAmount,
        data.oldGoldExchangeAmount,
        data.advanceAmount,
        data.roundOff,
        data.grandTotal,
        data.paidAmount,
        data.balanceDue,
        data.pricingSnapshot ?? null,
        data.status,
        data.notes ?? '',
        data.createdBy ?? null,
        data.createdAt,
        data.updatedAt
      )
  }

  insertItem(data: {
    id: string
    invoiceId: string
    itemId: string
    description?: string | null
    stampId?: string | null
    designId?: string | null
    barcode?: string | null
    pcs: number
    grossWeight: number
    packWeight?: number
    lessWeight?: number
    addWeight?: number
    netWeight: number
    metalType: string
    purityName?: string | null
    tunch: number
    wastage: number
    fineWeight: number
    goldRate: number
    metalValue: number
    labourRate: number
    labourRateType: 'Kg' | 'Gm' | 'Pcs'
    makingCharges: number
    stoneCharges: number
    diamondCharges: number
    discountAmount: number
    taxableAmount: number
    taxPercent: number
    taxAmount: number
    lineTotal: number
    pricingBreakdown?: string | null
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO sales_invoice_items (
          id, invoice_id, item_id, description, stamp_id, design_id,
          barcode, pcs, gross_weight, pack_weight, less_weight,
          add_weight, net_weight, metal_type, purity_name, tunch,
          wastage, fine_weight, gold_rate, metal_value, labour_rate,
          labour_rate_type, making_charges, stone_charges, diamond_charges,
          discount_amount, taxable_amount, tax_percent, tax_amount,
          line_total, pricing_breakdown, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.invoiceId,
        data.itemId,
        data.description ?? '',
        data.stampId ?? null,
        data.designId ?? null,
        data.barcode ?? null,
        data.pcs,
        data.grossWeight,
        data.packWeight ?? 0,
        data.lessWeight ?? 0,
        data.addWeight ?? 0,
        data.netWeight,
        data.metalType,
        data.purityName ?? '',
        data.tunch,
        data.wastage,
        data.fineWeight,
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
        data.pricingBreakdown ?? '',
        data.createdAt || new Date().toISOString(),
        data.updatedAt || new Date().toISOString()
      )
  }

  insertPayment(data: {
    id: string
    invoiceId: string
    paymentMethod: PaymentMethod
    amount: number
    paymentReference?: string | null
    paymentDate: string
    notes?: string | null
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO sales_invoice_payments (
          id, invoice_id, payment_method, amount, payment_reference,
          payment_date, notes, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.invoiceId,
        data.paymentMethod,
        data.amount,
        data.paymentReference ?? '',
        data.paymentDate,
        data.notes ?? '',
        data.createdAt,
        data.updatedAt
      )
  }

  updateStatus(id: string, status: SalesInvoiceStatus, updatedAt?: string): void {
    const time = updatedAt || new Date().toISOString()
    this.db
      .prepare(`UPDATE sales_invoices SET status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(status, time, id)
  }

  softDelete(id: string, now: string): void {
    this.db
      .prepare(`UPDATE sales_invoices SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(now, now, id)
  }
}
