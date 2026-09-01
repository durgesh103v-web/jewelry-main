import { BaseRepository } from './BaseRepository'
import type {
  ConsignmentInwardRecord,
  ConsignmentItemRecord,
  ConsignmentDashboardSummary,
  ConsignmentStatus
} from '../../../shared/types/consignment'

export class ConsignmentRepository extends BaseRepository {
  insertInward(
    id: string,
    consignmentNumber: string,
    supplierId: string,
    inwardDate: string,
    expectedReturnDate: string | null,
    totalPieces: number,
    totalGrossWeight: number,
    totalVendorCost: number,
    notes: string,
    createdBy: string,
    now: string
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO consignment_inwards (
        id, consignment_number, supplier_id, inward_date, expected_return_date,
        status, total_pieces, total_gross_weight, total_vendor_cost, notes,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      id,
      consignmentNumber,
      supplierId,
      inwardDate,
      expectedReturnDate,
      totalPieces,
      totalGrossWeight,
      totalVendorCost,
      notes,
      createdBy,
      now,
      now
    )
  }

  insertConsignmentItems(
    items: Array<{
      id: string
      consignmentInwardId: string
      supplierId: string
      stockItemId: string
      itemId: string
      vendorItemCode: string
      grossWeight: number
      netWeight: number
      fineWeight: number
      purityName: string
      tunch: number
      vendorCost: number
      retailPrice: number
      notes: string
      now: string
    }>
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO consignment_items (
        id, consignment_inward_id, supplier_id, stock_item_id, item_id,
        vendor_item_code, gross_weight, net_weight, fine_weight, purity_name,
        tunch, vendor_cost, retail_price, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN_SHOWROOM', ?, ?, ?)
    `)

    for (const item of items) {
      stmt.run(
        item.id,
        item.consignmentInwardId,
        item.supplierId,
        item.stockItemId,
        item.itemId,
        item.vendorItemCode,
        item.grossWeight,
        item.netWeight,
        item.fineWeight,
        item.purityName,
        item.tunch,
        item.vendorCost,
        item.retailPrice,
        item.notes,
        item.now,
        item.now
      )
    }
  }

  getInwardById(id: string): ConsignmentInwardRecord | null {
    const row = this.db
      .prepare(
        `
      SELECT 
        ci.*,
        s.name as supplier_name,
        s.phone as supplier_mobile
      FROM consignment_inwards ci
      JOIN suppliers s ON s.id = ci.supplier_id
      WHERE ci.id = ? AND ci.deleted_at IS NULL
    `
      )
      .get(id) as any

    if (!row) return null

    const items = this.getItemsByInwardId(id)
    return {
      ...this.mapInwardRow(row),
      items
    }
  }

  getInwardByNumber(consignmentNumber: string): ConsignmentInwardRecord | null {
    const row = this.db
      .prepare(
        `
      SELECT 
        ci.*,
        s.name as supplier_name,
        s.phone as supplier_mobile
      FROM consignment_inwards ci
      JOIN suppliers s ON s.id = ci.supplier_id
      WHERE ci.consignment_number = ? AND ci.deleted_at IS NULL
    `
      )
      .get(consignmentNumber) as any

    if (!row) return null
    return this.getInwardById(row.id)
  }

  listInwards(filters?: { status?: string; supplierId?: string; search?: string }): ConsignmentInwardRecord[] {
    let query = `
      SELECT 
        ci.*,
        s.name as supplier_name,
        s.phone as supplier_mobile
      FROM consignment_inwards ci
      JOIN suppliers s ON s.id = ci.supplier_id
      WHERE ci.deleted_at IS NULL
    `
    const params: any[] = []

    if (filters?.status && filters.status !== 'ALL') {
      query += ` AND ci.status = ?`
      params.push(filters.status)
    }

    if (filters?.supplierId) {
      query += ` AND ci.supplier_id = ?`
      params.push(filters.supplierId)
    }

    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`
      query += ` AND (ci.consignment_number LIKE ? OR s.name LIKE ? OR s.phone LIKE ?)`
      params.push(term, term, term)
    }

    query += ` ORDER BY ci.inward_date DESC, ci.created_at DESC`

    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => this.mapInwardRow(r))
  }

  getItemsByInwardId(inwardId: string): ConsignmentItemRecord[] {
    const query = `
      SELECT 
        citem.*,
        ci.consignment_number,
        s.name as supplier_name,
        si.stock_item_code,
        si.barcode,
        i.item_name,
        i.item_code,
        inv.invoice_number as sales_invoice_number
      FROM consignment_items citem
      JOIN consignment_inwards ci ON ci.id = citem.consignment_inward_id
      JOIN suppliers s ON s.id = citem.supplier_id
      JOIN jewellery_stock_items si ON si.id = citem.stock_item_id
      JOIN items i ON i.id = citem.item_id
      LEFT JOIN sales_invoices inv ON inv.id = citem.sales_invoice_id
      WHERE citem.consignment_inward_id = ?
      ORDER BY citem.created_at ASC
    `
    const rows = this.db.prepare(query).all(inwardId) as any[]
    return rows.map((r) => this.mapItemRow(r))
  }

  getItemById(id: string): ConsignmentItemRecord | null {
    const query = `
      SELECT 
        citem.*,
        ci.consignment_number,
        s.name as supplier_name,
        si.stock_item_code,
        si.barcode,
        i.item_name,
        i.item_code,
        inv.invoice_number as sales_invoice_number
      FROM consignment_items citem
      JOIN consignment_inwards ci ON ci.id = citem.consignment_inward_id
      JOIN suppliers s ON s.id = citem.supplier_id
      JOIN jewellery_stock_items si ON si.id = citem.stock_item_id
      JOIN items i ON i.id = citem.item_id
      LEFT JOIN sales_invoices inv ON inv.id = citem.sales_invoice_id
      WHERE citem.id = ?
    `
    const row = this.db.prepare(query).get(id) as any
    return row ? this.mapItemRow(row) : null
  }

  getItemByStockItemId(stockItemId: string): ConsignmentItemRecord | null {
    const query = `
      SELECT 
        citem.*,
        ci.consignment_number,
        s.name as supplier_name,
        si.stock_item_code,
        si.barcode,
        i.item_name,
        i.item_code,
        inv.invoice_number as sales_invoice_number
      FROM consignment_items citem
      JOIN consignment_inwards ci ON ci.id = citem.consignment_inward_id
      JOIN suppliers s ON s.id = citem.supplier_id
      JOIN jewellery_stock_items si ON si.id = citem.stock_item_id
      JOIN items i ON i.id = citem.item_id
      LEFT JOIN sales_invoices inv ON inv.id = citem.sales_invoice_id
      WHERE citem.stock_item_id = ?
      LIMIT 1
    `
    const row = this.db.prepare(query).get(stockItemId) as any
    return row ? this.mapItemRow(row) : null
  }

  getActiveItemByBarcode(barcode: string): ConsignmentItemRecord | null {
    const query = `
      SELECT 
        citem.*,
        ci.consignment_number,
        s.name as supplier_name,
        si.stock_item_code,
        si.barcode,
        i.item_name,
        i.item_code,
        inv.invoice_number as sales_invoice_number
      FROM consignment_items citem
      JOIN consignment_inwards ci ON ci.id = citem.consignment_inward_id
      JOIN suppliers s ON s.id = citem.supplier_id
      JOIN jewellery_stock_items si ON si.id = citem.stock_item_id
      JOIN items i ON i.id = citem.item_id
      LEFT JOIN sales_invoices inv ON inv.id = citem.sales_invoice_id
      WHERE si.barcode = ? AND citem.status = 'IN_SHOWROOM'
      LIMIT 1
    `
    const row = this.db.prepare(query).get(barcode.trim()) as any
    return row ? this.mapItemRow(row) : null
  }

  markItemSold(id: string, salesInvoiceId: string, soldAt: string): void {
    this.db
      .prepare(
        `
      UPDATE consignment_items
      SET status = 'SOLD',
          sales_invoice_id = ?,
          sold_at = ?,
          updated_at = ?
      WHERE id = ?
    `
      )
      .run(salesInvoiceId, soldAt, soldAt, id)
  }

  insertReturn(
    id: string,
    returnNumber: string,
    consignmentInwardId: string,
    supplierId: string,
    returnDate: string,
    totalPieces: number,
    totalGrossWeight: number,
    notes: string,
    now: string
  ): void {
    this.db
      .prepare(
        `
      INSERT INTO consignment_returns (
        id, return_number, consignment_inward_id, supplier_id,
        return_date, total_pieces, total_gross_weight, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        returnNumber,
        consignmentInwardId,
        supplierId,
        returnDate,
        totalPieces,
        totalGrossWeight,
        notes,
        now
      )
  }

  insertReturnItems(
    returnItems: Array<{
      id: string
      consignmentReturnId: string
      consignmentItemId: string
      stockItemId: string
      grossWeight: number
      now: string
    }>
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO consignment_return_items (
        id, consignment_return_id, consignment_item_id, stock_item_id, gross_weight, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    const updateItemStmt = this.db.prepare(`
      UPDATE consignment_items
      SET status = 'RETURNED',
          returned_at = ?,
          updated_at = ?
      WHERE id = ?
    `)

    for (const item of returnItems) {
      stmt.run(
        item.id,
        item.consignmentReturnId,
        item.consignmentItemId,
        item.stockItemId,
        item.grossWeight,
        item.now
      )
      updateItemStmt.run(item.now, item.now, item.consignmentItemId)
    }
  }

  updateInwardStatus(inwardId: string, status: ConsignmentStatus, now: string): void {
    this.db
      .prepare(
        `
      UPDATE consignment_inwards
      SET status = ?,
          updated_at = ?
      WHERE id = ?
    `
      )
      .run(status, now, inwardId)
  }

  getDashboardSummary(): ConsignmentDashboardSummary {
    const activeInwards = (
      this.db
        .prepare(
          `
      SELECT COUNT(*) as count 
      FROM consignment_inwards 
      WHERE status IN ('ACTIVE', 'PARTIALLY_SETTLED') AND deleted_at IS NULL
    `
        )
        .get() as any
    )?.count || 0

    const showroomStats = (
      this.db
        .prepare(
          `
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(gross_weight), 0) as total_gross_weight,
        COALESCE(SUM(vendor_cost), 0) as total_vendor_cost
      FROM consignment_items
      WHERE status = 'IN_SHOWROOM'
    `
        )
        .get() as any
    ) || { count: 0, total_gross_weight: 0, total_vendor_cost: 0 }

    const soldStats = (
      this.db
        .prepare(
          `
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(vendor_cost), 0) as total_settlement_due
      FROM consignment_items
      WHERE status = 'SOLD'
    `
        )
        .get() as any
    ) || { count: 0, total_settlement_due: 0 }

    const returnedCount = (
      this.db
        .prepare(
          `
      SELECT COUNT(*) as count 
      FROM consignment_items 
      WHERE status = 'RETURNED'
    `
        )
        .get() as any
    )?.count || 0

    const today = new Date().toISOString().split('T')[0]
    const overdueCount = (
      this.db
        .prepare(
          `
      SELECT COUNT(*) as count 
      FROM consignment_inwards 
      WHERE status IN ('ACTIVE', 'PARTIALLY_SETTLED')
        AND expected_return_date IS NOT NULL 
        AND expected_return_date < ?
        AND deleted_at IS NULL
    `
        )
        .get(today) as any
    )?.count || 0

    return {
      activeConsignmentsCount: activeInwards,
      piecesInShowroomCount: showroomStats.count,
      totalShowroomGrossWeight: Number(Number(showroomStats.total_gross_weight).toFixed(3)),
      totalShowroomVendorValue: Number(Number(showroomStats.total_vendor_cost).toFixed(2)),
      piecesSoldTotal: soldStats.count,
      totalSettlementDueToSuppliers: Number(Number(soldStats.total_settlement_due).toFixed(2)),
      piecesReturnedTotal: returnedCount,
      overdueMemosCount: overdueCount
    }
  }

  private mapInwardRow(row: any): ConsignmentInwardRecord {
    return {
      id: row.id,
      consignmentNumber: row.consignment_number,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      supplierMobile: row.supplier_mobile,
      inwardDate: row.inward_date,
      expectedReturnDate: row.expected_return_date,
      status: row.status,
      totalPieces: row.total_pieces,
      totalGrossWeight: Number(row.total_gross_weight),
      totalVendorCost: Number(row.total_vendor_cost),
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at
    }
  }

  private mapItemRow(row: any): ConsignmentItemRecord {
    return {
      id: row.id,
      consignmentInwardId: row.consignment_inward_id,
      consignmentNumber: row.consignment_number,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      stockItemId: row.stock_item_id,
      stockItemCode: row.stock_item_code,
      barcode: row.barcode,
      itemId: row.item_id,
      itemName: row.item_name,
      itemCode: row.item_code,
      vendorItemCode: row.vendor_item_code,
      grossWeight: Number(row.gross_weight),
      netWeight: Number(row.net_weight),
      fineWeight: Number(row.fine_weight),
      purityName: row.purity_name,
      tunch: Number(row.tunch),
      vendorCost: Number(row.vendor_cost),
      retailPrice: Number(row.retail_price),
      status: row.status,
      salesInvoiceId: row.sales_invoice_id,
      salesInvoiceNumber: row.sales_invoice_number,
      soldAt: row.sold_at,
      returnedAt: row.returned_at,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}
