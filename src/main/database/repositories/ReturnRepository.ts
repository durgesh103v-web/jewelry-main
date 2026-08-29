import { BaseRepository } from './BaseRepository'
import type {
  ReturnRecord,
  ReturnItemRecord,
  ReturnRefundRecord,
  ReturnFilter,
  ReturnStatus,
  ReturnType
} from '../../../shared/types/returnTransaction'

export class ReturnRepository extends BaseRepository {
  findAll(filter?: ReturnFilter): ReturnRecord[] {
    let query = `
      SELECT
        rt.id,
        rt.return_number,
        rt.return_type,
        rt.note_type,
        rt.original_sales_invoice_id,
        rt.original_purchase_invoice_id,
        rt.original_invoice_number,
        rt.customer_id,
        c.name AS customer_name,
        rt.supplier_id,
        s.name AS supplier_name,
        rt.account_id,
        a.account_name,
        rt.return_date,
        rt.metal_type,
        rt.total_pcs,
        rt.gross_weight,
        rt.net_weight,
        rt.fine_weight,
        rt.subtotal,
        rt.discount_amount,
        rt.taxable_amount,
        rt.tax_amount,
        rt.round_off,
        rt.return_total,
        rt.refund_amount,
        rt.adjustment_amount,
        rt.status,
        rt.reason,
        rt.notes,
        rt.created_by,
        rt.created_at,
        rt.updated_at,
        rt.deleted_at
      FROM return_transactions rt
      LEFT JOIN customers c ON c.id = rt.customer_id
      LEFT JOIN suppliers s ON s.id = rt.supplier_id
      JOIN accounts a ON a.id = rt.account_id
      WHERE rt.deleted_at IS NULL
    `
    const params: any[] = []

    if (filter?.returnType) {
      query += ` AND rt.return_type = ?`
      params.push(filter.returnType)
    }

    if (filter?.noteType) {
      query += ` AND rt.note_type = ?`
      params.push(filter.noteType)
    }

    if (filter?.customerId) {
      query += ` AND rt.customer_id = ?`
      params.push(filter.customerId)
    }

    if (filter?.supplierId) {
      query += ` AND rt.supplier_id = ?`
      params.push(filter.supplierId)
    }

    if (filter?.accountId) {
      query += ` AND rt.account_id = ?`
      params.push(filter.accountId)
    }

    if (filter?.status) {
      query += ` AND rt.status = ?`
      params.push(filter.status)
    }

    if (filter?.startDate) {
      query += ` AND rt.return_date >= ?`
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      query += ` AND rt.return_date <= ?`
      params.push(filter.endDate)
    }

    if (filter?.search) {
      query += ` AND (rt.return_number LIKE ? OR rt.original_invoice_number LIKE ? OR c.name LIKE ? OR s.name LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s, s, s)
    }

    query += ` ORDER BY rt.return_date DESC, rt.created_at DESC`

    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map(this.mapHeaderRow)
  }

  findById(id: string): ReturnRecord | null {
    const row = this.db
      .prepare(
        `
        SELECT
          rt.id,
          rt.return_number,
          rt.return_type,
          rt.note_type,
          rt.original_sales_invoice_id,
          rt.original_purchase_invoice_id,
          rt.original_invoice_number,
          rt.customer_id,
          c.name AS customer_name,
          rt.supplier_id,
          s.name AS supplier_name,
          rt.account_id,
          a.account_name,
          rt.return_date,
          rt.metal_type,
          rt.total_pcs,
          rt.gross_weight,
          rt.net_weight,
          rt.fine_weight,
          rt.subtotal,
          rt.discount_amount,
          rt.taxable_amount,
          rt.tax_amount,
          rt.round_off,
          rt.return_total,
          rt.refund_amount,
          rt.adjustment_amount,
          rt.status,
          rt.reason,
          rt.notes,
          rt.created_by,
          rt.created_at,
          rt.updated_at,
          rt.deleted_at
        FROM return_transactions rt
        LEFT JOIN customers c ON c.id = rt.customer_id
        LEFT JOIN suppliers s ON s.id = rt.supplier_id
        JOIN accounts a ON a.id = rt.account_id
        WHERE rt.id = ? AND rt.deleted_at IS NULL
      `
      )
      .get(id) as any

    if (!row) return null
    const header = this.mapHeaderRow(row)
    header.items = this.getItems(id)
    header.refunds = this.getRefunds(id)
    return header
  }

  findByNumber(returnNumber: string): ReturnRecord | null {
    const row = this.db
      .prepare(
        `
        SELECT
          rt.id,
          rt.return_number,
          rt.return_type,
          rt.note_type,
          rt.original_sales_invoice_id,
          rt.original_purchase_invoice_id,
          rt.original_invoice_number,
          rt.customer_id,
          c.name AS customer_name,
          rt.supplier_id,
          s.name AS supplier_name,
          rt.account_id,
          a.account_name,
          rt.return_date,
          rt.metal_type,
          rt.total_pcs,
          rt.gross_weight,
          rt.net_weight,
          rt.fine_weight,
          rt.subtotal,
          rt.discount_amount,
          rt.taxable_amount,
          rt.tax_amount,
          rt.round_off,
          rt.return_total,
          rt.refund_amount,
          rt.adjustment_amount,
          rt.status,
          rt.reason,
          rt.notes,
          rt.created_by,
          rt.created_at,
          rt.updated_at,
          rt.deleted_at
        FROM return_transactions rt
        LEFT JOIN customers c ON c.id = rt.customer_id
        LEFT JOIN suppliers s ON s.id = rt.supplier_id
        JOIN accounts a ON a.id = rt.account_id
        WHERE rt.return_number = ? AND rt.deleted_at IS NULL
      `
      )
      .get(returnNumber) as any

    if (!row) return null
    const header = this.mapHeaderRow(row)
    header.items = this.getItems(header.id)
    header.refunds = this.getRefunds(header.id)
    return header
  }

  findBySalesInvoice(salesInvoiceId: string): ReturnRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT id FROM return_transactions
        WHERE original_sales_invoice_id = ? AND status != 'CANCELLED' AND deleted_at IS NULL
        ORDER BY return_date DESC
      `
      )
      .all(salesInvoiceId) as any[]

    return rows.map((r) => this.findById(r.id)!).filter(Boolean)
  }

  findByPurchaseInvoice(purchaseInvoiceId: string): ReturnRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT id FROM return_transactions
        WHERE original_purchase_invoice_id = ? AND status != 'CANCELLED' AND deleted_at IS NULL
        ORDER BY return_date DESC
      `
      )
      .all(purchaseInvoiceId) as any[]

    return rows.map((r) => this.findById(r.id)!).filter(Boolean)
  }

  getItems(returnId: string): ReturnItemRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT
          rti.id,
          rti.return_id,
          rti.original_item_id,
          rti.item_id,
          i.item_name,
          i.item_code,
          rti.description,
          rti.stamp_id,
          rti.design_id,
          rti.barcode,
          rti.return_pcs,
          rti.gross_weight,
          rti.pack_weight,
          rti.less_weight,
          rti.add_weight,
          rti.net_weight,
          rti.metal_type,
          rti.purity_name,
          rti.tunch,
          rti.wastage,
          rti.fine_weight,
          rti.gold_rate,
          rti.metal_value,
          rti.labour_rate,
          rti.labour_rate_type,
          rti.making_charges,
          rti.stone_charges,
          rti.diamond_charges,
          rti.discount_amount,
          rti.taxable_amount,
          rti.tax_percent,
          rti.tax_amount,
          rti.line_total,
          rti.pricing_breakdown,
          rti.created_at,
          rti.updated_at
        FROM return_transaction_items rti
        LEFT JOIN items i ON i.id = rti.item_id
        WHERE rti.return_id = ?
        ORDER BY rti.created_at ASC
      `
      )
      .all(returnId) as any[]

    return rows.map((r) => ({
      id: r.id,
      returnId: r.return_id,
      originalItemId: r.original_item_id,
      itemId: r.item_id,
      itemName: r.item_name,
      itemCode: r.item_code,
      description: r.description,
      stampId: r.stamp_id,
      designId: r.design_id,
      barcode: r.barcode,
      returnPcs: Number(r.return_pcs || 0),
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

  getRefunds(returnId: string): ReturnRefundRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT
          id,
          return_id,
          payment_method,
          amount,
          payment_reference,
          refund_date,
          notes,
          created_at,
          updated_at
        FROM return_transaction_refunds
        WHERE return_id = ?
        ORDER BY created_at ASC
      `
      )
      .all(returnId) as any[]

    return rows.map((r) => ({
      id: r.id,
      returnId: r.return_id,
      paymentMethod: r.payment_method,
      amount: Number(r.amount || 0),
      paymentReference: r.payment_reference,
      refundDate: r.refund_date,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  }

  getReturnedItemsSummaryForInvoice(
    invoiceId: string,
    returnType: ReturnType
  ): Map<string, { returnedPcs: number; returnedGrossWeight: number }> {
    const invoiceColumn =
      returnType === 'SALES_RETURN' ? 'original_sales_invoice_id' : 'original_purchase_invoice_id'

    const rows = this.db
      .prepare(
        `
        SELECT
          rti.original_item_id,
          SUM(rti.return_pcs) AS total_returned_pcs,
          SUM(rti.gross_weight) AS total_returned_weight
        FROM return_transaction_items rti
        JOIN return_transactions rt ON rt.id = rti.return_id
        WHERE rt.${invoiceColumn} = ?
          AND rt.status != 'CANCELLED'
          AND rt.deleted_at IS NULL
        GROUP BY rti.original_item_id
      `
      )
      .all(invoiceId) as any[]

    const map = new Map<string, { returnedPcs: number; returnedGrossWeight: number }>()
    for (const r of rows) {
      map.set(r.original_item_id, {
        returnedPcs: Number(r.total_returned_pcs || 0),
        returnedGrossWeight: Number(r.total_returned_weight || 0)
      })
    }
    return map
  }

  insertHeader(data: {
    id: string
    returnNumber: string
    returnType: ReturnType
    noteType: string
    originalSalesInvoiceId?: string | null
    originalPurchaseInvoiceId?: string | null
    originalInvoiceNumber?: string | null
    customerId?: string | null
    supplierId?: string | null
    accountId: string
    returnDate: string
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
    returnTotal: number
    refundAmount: number
    adjustmentAmount: number
    status: ReturnStatus
    reason?: string | null
    notes?: string | null
    createdBy?: string | null
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO return_transactions (
          id,
          return_number,
          return_type,
          note_type,
          original_sales_invoice_id,
          original_purchase_invoice_id,
          original_invoice_number,
          customer_id,
          supplier_id,
          account_id,
          return_date,
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
          return_total,
          refund_amount,
          adjustment_amount,
          status,
          reason,
          notes,
          created_by,
          created_at,
          updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `
      )
      .run(
        data.id,
        data.returnNumber,
        data.returnType,
        data.noteType,
        data.originalSalesInvoiceId || null,
        data.originalPurchaseInvoiceId || null,
        data.originalInvoiceNumber || '',
        data.customerId || null,
        data.supplierId || null,
        data.accountId,
        data.returnDate,
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
        data.returnTotal,
        data.refundAmount,
        data.adjustmentAmount,
        data.status,
        data.reason || '',
        data.notes || '',
        data.createdBy || null,
        data.createdAt,
        data.updatedAt
      )
  }

  insertItem(item: {
    id: string
    returnId: string
    originalItemId: string
    itemId: string
    description?: string | null
    stampId?: string | null
    designId?: string | null
    barcode?: string | null
    returnPcs: number
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
        INSERT INTO return_transaction_items (
          id,
          return_id,
          original_item_id,
          item_id,
          description,
          stamp_id,
          design_id,
          barcode,
          return_pcs,
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
          ?, ?, ?, ?
        )
      `
      )
      .run(
        item.id,
        item.returnId,
        item.originalItemId,
        item.itemId,
        item.description || '',
        item.stampId || null,
        item.designId || null,
        item.barcode || null,
        item.returnPcs,
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

  insertRefund(refund: {
    id: string
    returnId: string
    paymentMethod: string
    amount: number
    paymentReference?: string | null
    refundDate: string
    notes?: string | null
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO return_transaction_refunds (
          id,
          return_id,
          payment_method,
          amount,
          payment_reference,
          refund_date,
          notes,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        refund.id,
        refund.returnId,
        refund.paymentMethod,
        refund.amount,
        refund.paymentReference || '',
        refund.refundDate,
        refund.notes || '',
        refund.createdAt,
        refund.updatedAt
      )
  }

  updateStatus(id: string, status: ReturnStatus): void {
    this.db
      .prepare(
        `
        UPDATE return_transactions
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
        UPDATE return_transactions
        SET deleted_at = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(new Date().toISOString(), new Date().toISOString(), id)
  }

  private mapHeaderRow(r: any): ReturnRecord {
    return {
      id: r.id,
      returnNumber: r.return_number,
      returnType: r.return_type,
      noteType: r.note_type,
      originalSalesInvoiceId: r.original_sales_invoice_id,
      originalPurchaseInvoiceId: r.original_purchase_invoice_id,
      originalInvoiceNumber: r.original_invoice_number,
      customerId: r.customer_id,
      customerName: r.customer_name,
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      accountId: r.account_id,
      accountName: r.account_name,
      returnDate: r.return_date,
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
      returnTotal: Number(r.return_total || 0),
      refundAmount: Number(r.refund_amount || 0),
      adjustmentAmount: Number(r.adjustment_amount || 0),
      status: r.status,
      reason: r.reason,
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      deletedAt: r.deleted_at
    }
  }
}
