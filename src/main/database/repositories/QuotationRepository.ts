import { BaseRepository } from './BaseRepository'
import type {
  QuotationRecord,
  QuotationItemRecord,
  QuotationFilter,
  QuotationStatus
} from '../../../shared/types/quotation'
import type { LabourRateType } from '../../../shared/jewelleryFormula'

export interface QuotationHeaderRow {
  id: string
  quotation_number: string
  customer_id: string | null
  customer_name: string | null
  customer_code: string | null
  account_id: string
  account_name: string | null
  quotation_date: string
  valid_until: string | null
  status: QuotationStatus
  metal_type: string
  total_pcs: number
  total_gross_weight: number
  total_net_weight: number
  total_fine_weight: number
  total_majuri: number
  metal_rate_applied: number
  metal_value: number
  total_charges: number
  discount_amount: number
  taxable_amount: number
  tax_amount: number
  grand_total: number
  rounded_total: number
  pricing_snapshot: string | null
  notes: string | null
  converted_order_id: string | null
  converted_sale_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface QuotationItemRow {
  id: string
  quotation_id: string
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

const quotationHeaderSelectSql = `
  SELECT
    q.id,
    q.quotation_number,
    q.customer_id,
    c.name AS customer_name,
    c.customer_code,
    q.account_id,
    a.account_name,
    q.quotation_date,
    q.valid_until,
    q.status,
    q.metal_type,
    q.total_pcs,
    q.total_gross_weight,
    q.total_net_weight,
    q.total_fine_weight,
    q.total_majuri,
    q.metal_rate_applied,
    q.metal_value,
    q.total_charges,
    q.discount_amount,
    q.taxable_amount,
    q.tax_amount,
    q.grand_total,
    q.rounded_total,
    q.pricing_snapshot,
    q.notes,
    q.converted_order_id,
    q.converted_sale_id,
    q.created_by,
    q.created_at,
    q.updated_at,
    q.deleted_at
  FROM quotations q
  LEFT JOIN customers c ON c.id = q.customer_id
  LEFT JOIN accounts a ON a.id = q.account_id
`

function mapHeaderRow(row: QuotationHeaderRow): QuotationRecord {
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
    quotationNumber: row.quotation_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerCode: row.customer_code,
    accountId: row.account_id,
    accountName: row.account_name,
    quotationDate: row.quotation_date,
    validUntil: row.valid_until,
    status: row.status,
    metalType: row.metal_type,
    totalPcs: Number(row.total_pcs ?? 0),
    totalGrossWeight: Number(row.total_gross_weight ?? 0),
    totalNetWeight: Number(row.total_net_weight ?? 0),
    totalFineWeight: Number(row.total_fine_weight ?? 0),
    totalMajuri: Number(row.total_majuri ?? 0),
    metalRateApplied: Number(row.metal_rate_applied ?? 0),
    metalValue: Number(row.metal_value ?? 0),
    totalCharges: Number(row.total_charges ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    taxableAmount: Number(row.taxable_amount ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    grandTotal: Number(row.grand_total ?? 0),
    roundedTotal: Number(row.rounded_total ?? 0),
    pricingSnapshot,
    notes: row.notes ?? '',
    convertedOrderId: row.converted_order_id,
    convertedSaleId: row.converted_sale_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

function mapItemRow(row: QuotationItemRow): QuotationItemRecord {
  return {
    id: row.id,
    quotationId: row.quotation_id,
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

export class QuotationRepository extends BaseRepository {
  findAll(filter?: QuotationFilter): QuotationRecord[] {
    const conditions = ['q.deleted_at IS NULL']
    const params: unknown[] = []

    if (filter?.status) {
      conditions.push('q.status = ?')
      params.push(filter.status)
    }

    if (filter?.customerId) {
      conditions.push('q.customer_id = ?')
      params.push(filter.customerId)
    }

    if (filter?.accountId) {
      conditions.push('q.account_id = ?')
      params.push(filter.accountId)
    }

    if (filter?.startDate) {
      conditions.push('q.quotation_date >= ?')
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      conditions.push('q.quotation_date <= ?')
      params.push(filter.endDate)
    }

    if (filter?.search) {
      const pattern = `%${filter.search.trim().toLowerCase()}%`
      conditions.push(
        `(LOWER(q.quotation_number) LIKE ? OR LOWER(COALESCE(c.name, '')) LIKE ? OR LOWER(COALESCE(a.account_name, '')) LIKE ?)`
      )
      params.push(pattern, pattern, pattern)
    }

    const rows = this.db
      .prepare(
        `
        ${quotationHeaderSelectSql}
        WHERE ${conditions.join(' AND ')}
        ORDER BY q.quotation_date DESC, q.created_at DESC
      `
      )
      .all(...params) as QuotationHeaderRow[]

    return rows.map(mapHeaderRow)
  }

  findById(id: string): QuotationRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${quotationHeaderSelectSql}
        WHERE q.id = ? AND q.deleted_at IS NULL
      `
      )
      .get(id) as QuotationHeaderRow | undefined

    if (!row) return undefined

    const quotation = mapHeaderRow(row)
    quotation.items = this.getItems(id)
    return quotation
  }

  findByNumber(number: string): QuotationRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${quotationHeaderSelectSql}
        WHERE LOWER(q.quotation_number) = LOWER(?) AND q.deleted_at IS NULL
      `
      )
      .get(number) as QuotationHeaderRow | undefined

    if (!row) return undefined

    const quotation = mapHeaderRow(row)
    quotation.items = this.getItems(row.id)
    return quotation
  }

  getItems(quotationId: string): QuotationItemRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT
          qi.*,
          i.item_name
        FROM quotation_items qi
        LEFT JOIN items i ON i.id = qi.item_id
        WHERE qi.quotation_id = ?
        ORDER BY qi.sort_order ASC, qi.created_at ASC
      `
      )
      .all(quotationId) as QuotationItemRow[]

    return rows.map(mapItemRow)
  }

  insertHeader(data: {
    id: string
    quotationNumber: string
    customerId?: string | null
    accountId: string
    quotationDate: string
    validUntil?: string | null
    status: QuotationStatus
    metalType: string
    totalPcs: number
    totalGrossWeight: number
    totalNetWeight: number
    totalFineWeight: number
    totalMajuri: number
    metalRateApplied: number
    metalValue: number
    totalCharges: number
    discountAmount: number
    taxableAmount: number
    taxAmount: number
    grandTotal: number
    roundedTotal: number
    pricingSnapshot?: string | null
    notes?: string | null
    createdBy?: string | null
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO quotations (
          id, quotation_number, customer_id, account_id, quotation_date,
          valid_until, status, metal_type, total_pcs, total_gross_weight,
          total_net_weight, total_fine_weight, total_majuri, metal_rate_applied,
          metal_value, total_charges, discount_amount, taxable_amount, tax_amount,
          grand_total, rounded_total, pricing_snapshot, notes, created_by,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.quotationNumber,
        data.customerId ?? null,
        data.accountId,
        data.quotationDate,
        data.validUntil ?? null,
        data.status,
        data.metalType,
        data.totalPcs,
        data.totalGrossWeight,
        data.totalNetWeight,
        data.totalFineWeight,
        data.totalMajuri,
        data.metalRateApplied,
        data.metalValue,
        data.totalCharges,
        data.discountAmount,
        data.taxableAmount,
        data.taxAmount,
        data.grandTotal,
        data.roundedTotal,
        data.pricingSnapshot ?? null,
        data.notes ?? '',
        data.createdBy ?? null,
        data.createdAt,
        data.updatedAt
      )
  }

  insertItem(data: {
    id: string
    quotationId: string
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
        INSERT INTO quotation_items (
          id, quotation_id, item_id, description, stamp_id, design_id,
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
        data.quotationId,
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

  deleteItems(quotationId: string): void {
    this.db.prepare(`DELETE FROM quotation_items WHERE quotation_id = ?`).run(quotationId)
  }

  updateStatus(
    id: string,
    status: QuotationStatus,
    extra?: { convertedOrderId?: string; convertedSaleId?: string; updatedAt: string }
  ): void {
    const updatedAt = extra?.updatedAt || new Date().toISOString()
    this.db
      .prepare(
        `
        UPDATE quotations
        SET
          status = ?,
          converted_order_id = COALESCE(?, converted_order_id),
          converted_sale_id = COALESCE(?, converted_sale_id),
          updated_at = ?
        WHERE id = ? AND deleted_at IS NULL
      `
      )
      .run(status, extra?.convertedOrderId ?? null, extra?.convertedSaleId ?? null, updatedAt, id)
  }

  softDelete(id: string, now: string): void {
    this.db
      .prepare(`UPDATE quotations SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(now, now, id)
  }
}
