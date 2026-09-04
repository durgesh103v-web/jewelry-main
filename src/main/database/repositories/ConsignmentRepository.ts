import { BaseRepository } from './BaseRepository'
import type {
  ConsignmentInwardRecord,
  ConsignmentItemRecord,
  ConsignmentSettlementRecord,
  ConsignmentDashboardSummary,
  ConsignmentStatus,
  ConsignmentSettlementStatus
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
        status, settlement_status, total_pieces, total_gross_weight, total_vendor_cost,
        total_settled_amount, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', 'UNSETTLED', ?, ?, ?, 0, ?, ?, ?, ?)
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
    const totalSoldVendorCost = items
      .filter((i) => i.status === 'SOLD')
      .reduce((sum, i) => sum + i.vendorCost, 0)
    const totalSettled = Number(row.total_settled_amount || 0)
    const outstandingLiability = Math.max(0, Number((totalSoldVendorCost - totalSettled).toFixed(2)))
    const soldPieces = items.filter((i) => i.status === 'SOLD').length
    const returnedPieces = items.filter((i) => i.status === 'RETURNED').length

    return {
      ...this.mapInwardRow(row),
      totalSoldVendorCost: Number(totalSoldVendorCost.toFixed(2)),
      outstandingLiability,
      soldPieces,
      returnedPieces,
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

  listInwards(filters?: {
    status?: string
    settlementStatus?: string
    supplierId?: string
    startDate?: string
    endDate?: string
    search?: string
  }): ConsignmentInwardRecord[] {
    let query = `
      SELECT 
        ci.*,
        s.name as supplier_name,
        s.phone as supplier_mobile,
        COALESCE((
          SELECT SUM(vendor_cost) FROM consignment_items 
          WHERE consignment_inward_id = ci.id AND status = 'SOLD'
        ), 0) as total_sold_vendor_cost,
        COALESCE((
          SELECT COUNT(*) FROM consignment_items 
          WHERE consignment_inward_id = ci.id AND status = 'SOLD'
        ), 0) as sold_pieces_count,
        COALESCE((
          SELECT COUNT(*) FROM consignment_items 
          WHERE consignment_inward_id = ci.id AND status = 'RETURNED'
        ), 0) as returned_pieces_count
      FROM consignment_inwards ci
      JOIN suppliers s ON s.id = ci.supplier_id
      WHERE ci.deleted_at IS NULL
    `
    const params: any[] = []

    if (filters?.status && filters.status !== 'ALL') {
      query += ` AND ci.status = ?`
      params.push(filters.status)
    }

    if (filters?.settlementStatus && filters.settlementStatus !== 'ALL') {
      query += ` AND ci.settlement_status = ?`
      params.push(filters.settlementStatus)
    }

    if (filters?.supplierId) {
      query += ` AND ci.supplier_id = ?`
      params.push(filters.supplierId)
    }

    if (filters?.startDate) {
      query += ` AND ci.inward_date >= ?`
      params.push(filters.startDate)
    }

    if (filters?.endDate) {
      query += ` AND ci.inward_date <= ?`
      params.push(filters.endDate)
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

  insertSettlement(
    id: string,
    settlementNumber: string,
    supplierId: string,
    consignmentInwardId: string,
    settlementDate: string,
    settledAmount: number,
    paymentMethod: string,
    paymentReference: string,
    notes: string,
    createdBy: string,
    now: string
  ): void {
    this.db
      .prepare(
        `
      INSERT INTO consignment_settlements (
        id, settlement_number, supplier_id, consignment_inward_id,
        settlement_date, settled_amount, payment_method, payment_reference,
        notes, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        settlementNumber,
        supplierId,
        consignmentInwardId,
        settlementDate,
        settledAmount,
        paymentMethod,
        paymentReference,
        notes,
        createdBy,
        now
      )
  }

  getSettlementsByInwardId(
    inwardId?: string,
    filters?: { supplierId?: string; startDate?: string; endDate?: string; search?: string }
  ): ConsignmentSettlementRecord[] {
    let query = `
      SELECT 
        cs.*,
        ci.consignment_number,
        s.name as supplier_name
      FROM consignment_settlements cs
      JOIN consignment_inwards ci ON ci.id = cs.consignment_inward_id
      JOIN suppliers s ON s.id = cs.supplier_id
      WHERE 1=1
    `
    const params: any[] = []

    if (inwardId && inwardId !== 'ALL') {
      query += ` AND cs.consignment_inward_id = ?`
      params.push(inwardId)
    }

    if (filters?.supplierId) {
      query += ` AND cs.supplier_id = ?`
      params.push(filters.supplierId)
    }

    if (filters?.startDate) {
      query += ` AND cs.settlement_date >= ?`
      params.push(filters.startDate)
    }

    if (filters?.endDate) {
      query += ` AND cs.settlement_date <= ?`
      params.push(filters.endDate)
    }

    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`
      query += ` AND (cs.settlement_number LIKE ? OR ci.consignment_number LIKE ? OR s.name LIKE ? OR cs.payment_reference LIKE ?)`
      params.push(term, term, term, term)
    }

    query += ` ORDER BY cs.settlement_date DESC, cs.created_at DESC`

    const rows = this.db.prepare(query).all(...params) as any[]

    return rows.map((r) => ({
      id: r.id,
      settlementNumber: r.settlement_number,
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      consignmentInwardId: r.consignment_inward_id,
      consignmentNumber: r.consignment_number,
      settlementDate: r.settlement_date,
      settledAmount: Number(r.settled_amount),
      paymentMethod: r.payment_method,
      paymentReference: r.payment_reference,
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: r.created_at
    }))
  }

  listConsignmentItems(filters?: {
    status?: string
    supplierId?: string
    inwardId?: string
    startDate?: string
    endDate?: string
    search?: string
  }): ConsignmentItemRecord[] {
    let query = `
      SELECT 
        citem.*,
        ci.consignment_number,
        ci.inward_date,
        ci.expected_return_date,
        ci.settlement_status as inward_settlement_status,
        s.name as supplier_name,
        si.stock_item_code,
        si.barcode,
        i.item_name,
        i.item_code,
        inv.invoice_number as sales_invoice_number,
        inv.created_at as sale_date
      FROM consignment_items citem
      JOIN consignment_inwards ci ON ci.id = citem.consignment_inward_id
      JOIN suppliers s ON s.id = citem.supplier_id
      JOIN jewellery_stock_items si ON si.id = citem.stock_item_id
      JOIN items i ON i.id = citem.item_id
      LEFT JOIN sales_invoices inv ON inv.id = citem.sales_invoice_id
      WHERE ci.deleted_at IS NULL
    `
    const params: any[] = []

    if (filters?.status && filters.status !== 'ALL') {
      query += ` AND citem.status = ?`
      params.push(filters.status)
    }

    if (filters?.supplierId) {
      query += ` AND citem.supplier_id = ?`
      params.push(filters.supplierId)
    }

    if (filters?.inwardId) {
      query += ` AND citem.consignment_inward_id = ?`
      params.push(filters.inwardId)
    }

    if (filters?.startDate) {
      if (filters.status === 'SOLD') {
        query += ` AND (citem.sold_at >= ? OR date(citem.sold_at) >= ?)`
        params.push(filters.startDate, filters.startDate)
      } else {
        query += ` AND ci.inward_date >= ?`
        params.push(filters.startDate)
      }
    }

    if (filters?.endDate) {
      if (filters.status === 'SOLD') {
        query += ` AND (citem.sold_at <= ? OR date(citem.sold_at) <= ?)`
        params.push(filters.endDate + ' 23:59:59', filters.endDate)
      } else {
        query += ` AND ci.inward_date <= ?`
        params.push(filters.endDate)
      }
    }

    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`
      query += ` AND (si.barcode LIKE ? OR si.stock_item_code LIKE ? OR i.item_name LIKE ? OR ci.consignment_number LIKE ? OR s.name LIKE ? OR citem.vendor_item_code LIKE ?)`
      params.push(term, term, term, term, term, term)
    }

    if (filters?.status === 'SOLD') {
      query += ` ORDER BY citem.sold_at DESC, citem.created_at DESC`
    } else {
      query += ` ORDER BY ci.inward_date DESC, citem.created_at DESC`
    }

    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => this.mapItemRow(r))
  }

  revertItemToInShowroom(citemId: string, now: string): void {
    this.db
      .prepare(
        `
      UPDATE consignment_items
      SET status = 'IN_SHOWROOM',
          sales_invoice_id = NULL,
          sold_at = NULL,
          updated_at = ?
      WHERE id = ?
    `
      )
      .run(now, citemId)
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

  updateInwardSettledAmount(
    inwardId: string,
    totalSettledAmount: number,
    settlementStatus: ConsignmentSettlementStatus,
    now: string
  ): void {
    this.db
      .prepare(
        `
      UPDATE consignment_inwards
      SET total_settled_amount = ?,
          settlement_status = ?,
          updated_at = ?
      WHERE id = ?
    `
      )
      .run(totalSettledAmount, settlementStatus, now, inwardId)
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
        COALESCE(SUM(vendor_cost), 0) as total_sold_vendor_value
      FROM consignment_items
      WHERE status = 'SOLD'
    `
        )
        .get() as any
    ) || { count: 0, total_sold_vendor_value: 0 }

    const totalSettledPaid = (
      this.db
        .prepare(
          `
      SELECT COALESCE(SUM(settled_amount), 0) as total_paid
      FROM consignment_settlements
    `
        )
        .get() as any
    )?.total_paid || 0

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

    const totalSoldValue = Number(soldStats.total_sold_vendor_value)
    const totalPaidValue = Number(totalSettledPaid)
    const totalDue = Math.max(0, Number((totalSoldValue - totalPaidValue).toFixed(2)))

    return {
      activeConsignmentsCount: activeInwards,
      piecesInShowroomCount: showroomStats.count,
      totalShowroomGrossWeight: Number(Number(showroomStats.total_gross_weight).toFixed(3)),
      totalShowroomVendorValue: Number(Number(showroomStats.total_vendor_cost).toFixed(2)),
      piecesSoldTotal: soldStats.count,
      totalSoldVendorValue: Number(totalSoldValue.toFixed(2)),
      totalSettlementPaid: Number(totalPaidValue.toFixed(2)),
      totalSettlementDueToSuppliers: totalDue,
      piecesReturnedTotal: returnedCount,
      overdueMemosCount: overdueCount
    }
  }

  private mapInwardRow(row: any): ConsignmentInwardRecord {
    const totalSoldVendorCost =
      row.total_sold_vendor_cost !== undefined ? Number(row.total_sold_vendor_cost) : undefined
    const totalSettled = Number(row.total_settled_amount || 0)
    const outstandingLiability =
      totalSoldVendorCost !== undefined
        ? Math.max(0, Number((totalSoldVendorCost - totalSettled).toFixed(2)))
        : undefined

    return {
      id: row.id,
      consignmentNumber: row.consignment_number,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      supplierMobile: row.supplier_mobile,
      inwardDate: row.inward_date,
      expectedReturnDate: row.expected_return_date,
      status: row.status,
      settlementStatus: row.settlement_status || 'UNSETTLED',
      totalPieces: row.total_pieces,
      totalGrossWeight: Number(row.total_gross_weight),
      totalVendorCost: Number(row.total_vendor_cost),
      totalSettledAmount: totalSettled,
      totalSoldVendorCost,
      outstandingLiability,
      soldPieces: row.sold_pieces_count !== undefined ? Number(row.sold_pieces_count) : undefined,
      returnedPieces: row.returned_pieces_count !== undefined ? Number(row.returned_pieces_count) : undefined,
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
      inwardDate: row.inward_date,
      expectedReturnDate: row.expected_return_date,
      inwardSettlementStatus: row.inward_settlement_status,
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
      saleDate: row.sale_date || row.sold_at,
      returnedAt: row.returned_at,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}
