import { BaseRepository } from './BaseRepository'
import type {
  PurchaseInvoiceRecord,
  PurchaseInvoiceItemRecord,
  PurchaseInvoicePaymentRecord,
  PurchaseInvoiceFilter,
  PurchaseInvoiceStatus
} from '../../../shared/types/purchaseInvoice'

export class PurchaseInvoiceRepository extends BaseRepository {
  findAll(filter?: PurchaseInvoiceFilter): PurchaseInvoiceRecord[] {
    let query = `
      SELECT
        pi.id,
        pi.invoice_number,
        pi.supplier_id,
        s.name AS supplier_name,
        s.supplier_code,
        pi.account_id,
        a.account_name,
        pi.supplier_invoice_number,
        pi.invoice_date,
        pi.metal_type,
        pi.total_pcs,
        pi.gross_weight,
        pi.net_weight,
        pi.fine_weight,
        pi.subtotal,
        pi.discount_amount,
        pi.taxable_amount,
        pi.tax_amount,
        pi.round_off,
        pi.grand_total,
        pi.paid_amount,
        pi.balance_due,
        pi.pricing_snapshot,
        pi.status,
        pi.notes,
        pi.created_by,
        pi.created_at,
        pi.updated_at,
        pi.deleted_at
      FROM purchase_invoices pi
      LEFT JOIN suppliers s ON s.id = pi.supplier_id
      JOIN accounts a ON a.id = pi.account_id
      WHERE pi.deleted_at IS NULL
    `
    const params: any[] = []

    if (filter?.supplierId) {
      query += ` AND pi.supplier_id = ?`
      params.push(filter.supplierId)
    }

    if (filter?.accountId) {
      query += ` AND pi.account_id = ?`
      params.push(filter.accountId)
    }

    if (filter?.metalType) {
      query += ` AND pi.metal_type = ?`
      params.push(filter.metalType)
    }

    if (filter?.status) {
      query += ` AND pi.status = ?`
      params.push(filter.status)
    }

    if (filter?.startDate) {
      query += ` AND pi.invoice_date >= ?`
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      query += ` AND pi.invoice_date <= ?`
      params.push(filter.endDate)
    }

    if (filter?.search) {
      query += ` AND (pi.invoice_number LIKE ? OR pi.supplier_invoice_number LIKE ? OR s.name LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s, s)
    }

    query += ` ORDER BY pi.invoice_date DESC, pi.created_at DESC`

    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map(this.mapHeaderRow)
  }

  findById(id: string): PurchaseInvoiceRecord | null {
    const row = this.db
      .prepare(
        `
        SELECT
          pi.id,
          pi.invoice_number,
          pi.supplier_id,
          s.name AS supplier_name,
          s.supplier_code,
          pi.account_id,
          a.account_name,
          pi.supplier_invoice_number,
          pi.invoice_date,
          pi.metal_type,
          pi.total_pcs,
          pi.gross_weight,
          pi.net_weight,
          pi.fine_weight,
          pi.subtotal,
          pi.discount_amount,
          pi.taxable_amount,
          pi.tax_amount,
          pi.round_off,
          pi.grand_total,
          pi.paid_amount,
          pi.balance_due,
          pi.pricing_snapshot,
          pi.status,
          pi.notes,
          pi.created_by,
          pi.created_at,
          pi.updated_at,
          pi.deleted_at
        FROM purchase_invoices pi
        LEFT JOIN suppliers s ON s.id = pi.supplier_id
        JOIN accounts a ON a.id = pi.account_id
        WHERE pi.id = ? AND pi.deleted_at IS NULL
      `
      )
      .get(id) as any

    if (!row) return null
    const header = this.mapHeaderRow(row)
    header.items = this.getItems(id)
    header.payments = this.getPayments(id)
    return header
  }

  findByNumber(invoiceNumber: string): PurchaseInvoiceRecord | null {
    const row = this.db
      .prepare(
        `
        SELECT
          pi.id,
          pi.invoice_number,
          pi.supplier_id,
          s.name AS supplier_name,
          s.supplier_code,
          pi.account_id,
          a.account_name,
          pi.supplier_invoice_number,
          pi.invoice_date,
          pi.metal_type,
          pi.total_pcs,
          pi.gross_weight,
          pi.net_weight,
          pi.fine_weight,
          pi.subtotal,
          pi.discount_amount,
          pi.taxable_amount,
          pi.tax_amount,
          pi.round_off,
          pi.grand_total,
          pi.paid_amount,
          pi.balance_due,
          pi.pricing_snapshot,
          pi.status,
          pi.notes,
          pi.created_by,
          pi.created_at,
          pi.updated_at,
          pi.deleted_at
        FROM purchase_invoices pi
        LEFT JOIN suppliers s ON s.id = pi.supplier_id
        JOIN accounts a ON a.id = pi.account_id
        WHERE pi.invoice_number = ? AND pi.deleted_at IS NULL
      `
      )
      .get(invoiceNumber) as any

    if (!row) return null
    const header = this.mapHeaderRow(row)
    header.items = this.getItems(header.id)
    header.payments = this.getPayments(header.id)
    return header
  }

  findBySupplierInvoice(supplierId: string, supplierInvoiceNumber: string): PurchaseInvoiceRecord | null {
    const row = this.db
      .prepare(
        `
        SELECT id, invoice_number
        FROM purchase_invoices
        WHERE supplier_id = ? AND supplier_invoice_number = ? AND deleted_at IS NULL
      `
      )
      .get(supplierId, supplierInvoiceNumber) as any

    if (!row) return null
    return this.findById(row.id)
  }

  getItems(invoiceId: string): PurchaseInvoiceItemRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT
          pii.id,
          pii.invoice_id,
          pii.item_id,
          i.item_name,
          i.item_code,
          pii.description,
          pii.stamp_id,
          pii.design_id,
          pii.barcode,
          pii.pcs,
          pii.gross_weight,
          pii.pack_weight,
          pii.less_weight,
          pii.add_weight,
          pii.net_weight,
          pii.metal_type,
          pii.purity_name,
          pii.tunch,
          pii.wastage,
          pii.fine_weight,
          pii.gold_rate,
          pii.metal_value,
          pii.labour_rate,
          pii.labour_rate_type,
          pii.making_charges,
          pii.stone_charges,
          pii.diamond_charges,
          pii.discount_amount,
          pii.taxable_amount,
          pii.tax_percent,
          pii.tax_amount,
          pii.line_total,
          pii.pricing_breakdown,
          pii.created_at,
          pii.updated_at
        FROM purchase_invoice_items pii
        LEFT JOIN items i ON i.id = pii.item_id
        WHERE pii.invoice_id = ?
        ORDER BY pii.created_at ASC
      `
      )
      .all(invoiceId) as any[]

    return rows.map((r) => ({
      id: r.id,
      invoiceId: r.invoice_id,
      itemId: r.item_id,
      itemName: r.item_name,
      itemCode: r.item_code,
      description: r.description,
      stampId: r.stamp_id,
      designId: r.design_id,
      barcode: r.barcode,
      pcs: Number(r.pcs || 0),
      grossWeight: Number(r.gross_weight || 0),
      packWeight: Number(r.pack_weight || 0),
      lessWeight: Number(r.less_weight || 0),
      addWeight: Number(r.add_weight || 0),
      netWeight: Number(r.net_weight || 0),
      metalType: r.metal_type,
      purityName: r.purity_name,
      tunch: Number(r.tunch || 0),
      wastage: Number(r.wastage || 0),
      fineWeight: Number(r.fine_weight || 0),
      goldRate: Number(r.gold_rate || 0),
      metalValue: Number(r.metal_value || 0),
      labourRate: Number(r.labour_rate || 0),
      labourRateType: r.labour_rate_type,
      makingCharges: Number(r.making_charges || 0),
      stoneCharges: Number(r.stone_charges || 0),
      diamondCharges: Number(r.diamond_charges || 0),
      discountAmount: Number(r.discount_amount || 0),
      taxableAmount: Number(r.taxable_amount || 0),
      taxPercent: Number(r.tax_percent || 0),
      taxAmount: Number(r.tax_amount || 0),
      lineTotal: Number(r.line_total || 0),
      pricingBreakdown: r.pricing_breakdown,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  }

  getPayments(invoiceId: string): PurchaseInvoicePaymentRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT
          id,
          invoice_id,
          payment_method,
          amount,
          payment_reference,
          payment_date,
          notes,
          created_at,
          updated_at
        FROM purchase_invoice_payments
        WHERE invoice_id = ?
        ORDER BY created_at ASC
      `
      )
      .all(invoiceId) as any[]

    return rows.map((r) => ({
      id: r.id,
      invoiceId: r.invoice_id,
      paymentMethod: r.payment_method,
      amount: Number(r.amount || 0),
      paymentReference: r.payment_reference,
      paymentDate: r.payment_date,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  }

  insertHeader(data: {
    id: string
    invoiceNumber: string
    supplierId?: string | null
    accountId: string
    supplierInvoiceNumber?: string | null
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
    roundOff: number
    grandTotal: number
    paidAmount: number
    balanceDue: number
    pricingSnapshot?: string | null
    status: PurchaseInvoiceStatus
    notes?: string | null
    createdBy?: string | null
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO purchase_invoices (
          id,
          invoice_number,
          supplier_id,
          account_id,
          supplier_invoice_number,
          invoice_date,
          metal_type,
          total_pcs,
          gross_weight,
          net_weight,
          fine_weight,
          subtotal,
          discount_amount,
          taxable_amount,
          tax_amount,
          round_off,
          grand_total,
          paid_amount,
          balance_due,
          pricing_snapshot,
          status,
          notes,
          created_by,
          created_at,
          updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `
      )
      .run(
        data.id,
        data.invoiceNumber,
        data.supplierId || null,
        data.accountId,
        data.supplierInvoiceNumber || '',
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
        data.roundOff,
        data.grandTotal,
        data.paidAmount,
        data.balanceDue,
        data.pricingSnapshot || null,
        data.status,
        data.notes || '',
        data.createdBy || null,
        data.createdAt,
        data.updatedAt
      )
  }

  insertItem(item: {
    id: string
    invoiceId: string
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
    metalType: string
    purityName?: string | null
    tunch: number
    wastage: number
    fineWeight: number
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
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO purchase_invoice_items (
          id,
          invoice_id,
          item_id,
          description,
          stamp_id,
          design_id,
          barcode,
          pcs,
          gross_weight,
          pack_weight,
          less_weight,
          add_weight,
          net_weight,
          metal_type,
          purity_name,
          tunch,
          wastage,
          fine_weight,
          gold_rate,
          metal_value,
          labour_rate,
          labour_rate_type,
          making_charges,
          stone_charges,
          diamond_charges,
          discount_amount,
          taxable_amount,
          tax_percent,
          tax_amount,
          line_total,
          pricing_breakdown,
          created_at,
          updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?
        )
      `
      )
      .run(
        item.id,
        item.invoiceId,
        item.itemId,
        item.description || '',
        item.stampId || null,
        item.designId || null,
        item.barcode || null,
        item.pcs,
        item.grossWeight,
        item.packWeight,
        item.lessWeight,
        item.addWeight,
        item.netWeight,
        item.metalType,
        item.purityName || '',
        item.tunch,
        item.wastage,
        item.fineWeight,
        item.goldRate,
        item.metalValue,
        item.labourRate,
        item.labourRateType,
        item.makingCharges,
        item.stoneCharges,
        item.diamondCharges,
        item.discountAmount,
        item.taxableAmount,
        item.taxPercent,
        item.taxAmount,
        item.lineTotal,
        item.pricingBreakdown || '',
        item.createdAt,
        item.updatedAt
      )
  }

  insertPayment(payment: {
    id: string
    invoiceId: string
    paymentMethod: string
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
        INSERT INTO purchase_invoice_payments (
          id,
          invoice_id,
          payment_method,
          amount,
          payment_reference,
          payment_date,
          notes,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        payment.id,
        payment.invoiceId,
        payment.paymentMethod,
        payment.amount,
        payment.paymentReference || '',
        payment.paymentDate,
        payment.notes || '',
        payment.createdAt,
        payment.updatedAt
      )
  }

  updateStatus(id: string, status: PurchaseInvoiceStatus): void {
    this.db
      .prepare(
        `
        UPDATE purchase_invoices
        SET status = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(status, new Date().toISOString(), id)
  }

  softDelete(id: string): void {
    this.db
      .prepare(
        `
        UPDATE purchase_invoices
        SET deleted_at = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(new Date().toISOString(), new Date().toISOString(), id)
  }

  private mapHeaderRow(r: any): PurchaseInvoiceRecord {
    return {
      id: r.id,
      invoiceNumber: r.invoice_number,
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      supplierCode: r.supplier_code,
      accountId: r.account_id,
      accountName: r.account_name,
      supplierInvoiceNumber: r.supplier_invoice_number,
      invoiceDate: r.invoice_date,
      metalType: r.metal_type,
      totalPcs: Number(r.total_pcs || 0),
      grossWeight: Number(r.gross_weight || 0),
      netWeight: Number(r.net_weight || 0),
      fineWeight: Number(r.fine_weight || 0),
      subtotal: Number(r.subtotal || 0),
      discountAmount: Number(r.discount_amount || 0),
      taxableAmount: Number(r.taxable_amount || 0),
      taxAmount: Number(r.tax_amount || 0),
      roundOff: Number(r.round_off || 0),
      grandTotal: Number(r.grand_total || 0),
      paidAmount: Number(r.paid_amount || 0),
      balanceDue: Number(r.balance_due || 0),
      pricingSnapshot: r.pricing_snapshot,
      status: r.status,
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      deletedAt: r.deleted_at
    }
  }
}
