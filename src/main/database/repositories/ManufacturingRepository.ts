import { BaseRepository } from './BaseRepository'
import type {
  KarigarRecord,
  CreateKarigarPayload,
  ManufacturingOrderRecord,
  CreateManufacturingOrderPayload,
  MaterialIssueRecord,
  MaterialReturnRecord,
  FinishedReceiptRecord,
  KarigarMetalLedgerRecord,
  KarigarSettlementRecord,
  ManufacturingReconciliationSummary
} from '../../../shared/types/manufacturing'

export class ManufacturingRepository extends BaseRepository {
  // ===================== 1. KARIGARS =====================

  createKarigar(id: string, code: string, payload: CreateKarigarPayload, now: string): KarigarRecord {
    this.db
      .prepare(
        `
        INSERT INTO karigars (
          id, karigar_code, name, mobile, address, specialization, account_id,
          fine_gold_balance, fine_silver_balance, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?, ?)
      `
      )
      .run(
        id,
        code,
        payload.name,
        payload.mobile || '',
        payload.address || '',
        payload.specialization || 'General',
        payload.accountId || null,
        now,
        now
      )

    return this.getKarigarById(id)!
  }

  getKarigarById(id: string): KarigarRecord | null {
    const row = this.db
      .prepare(
        `
        SELECT k.*, a.account_name
        FROM karigars k
        LEFT JOIN accounts a ON a.id = k.account_id
        WHERE k.id = ? AND k.deleted_at IS NULL
      `
      )
      .get(id) as any
    return row ? this.mapKarigar(row) : null
  }

  listKarigars(filter?: { activeOnly?: boolean; search?: string }): KarigarRecord[] {
    let query = `
      SELECT k.*, a.account_name
      FROM karigars k
      LEFT JOIN accounts a ON a.id = k.account_id
      WHERE k.deleted_at IS NULL
    `
    const params: any[] = []

    if (filter?.activeOnly) {
      query += ` AND k.active = 1`
    }

    if (filter?.search) {
      query += ` AND (k.name LIKE ? OR k.karigar_code LIKE ? OR k.mobile LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s, s)
    }

    query += ` ORDER BY k.name ASC`
    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => this.mapKarigar(r))
  }

  updateKarigarBalances(karigarId: string, goldFineDelta: number, silverFineDelta: number, now: string): void {
    this.db
      .prepare(
        `
        UPDATE karigars
        SET fine_gold_balance = fine_gold_balance + ?,
            fine_silver_balance = fine_silver_balance + ?,
            updated_at = ?
        WHERE id = ?
      `
      )
      .run(goldFineDelta, silverFineDelta, now, karigarId)
  }

  // ===================== 2. MANUFACTURING ORDERS =====================

  createOrder(id: string, orderNumber: string, payload: CreateManufacturingOrderPayload, now: string): ManufacturingOrderRecord {
    const targetFine = payload.targetFineWeight || payload.plannedNetWeight
    this.db
      .prepare(
        `
        INSERT INTO manufacturing_orders (
          id, order_number, design_id, item_id, karigar_id, planned_pcs,
          planned_gross_weight, planned_net_weight, metal_type, purity_name,
          target_fine_weight, expected_delivery_date, status, notes, created_by,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, 'Admin', ?, ?)
      `
      )
      .run(
        id,
        orderNumber,
        payload.designId || null,
        payload.itemId,
        payload.karigarId,
        payload.plannedPcs,
        payload.plannedGrossWeight,
        payload.plannedNetWeight,
        payload.metalType,
        payload.purityName,
        targetFine,
        payload.expectedDeliveryDate || null,
        payload.notes || '',
        now,
        now
      )

    return this.getOrderById(id)!
  }

  getOrderById(id: string): ManufacturingOrderRecord | null {
    const row = this.db
      .prepare(
        `
        SELECT
          mo.*,
          i.item_name,
          k.name AS karigar_name,
          d.design_name
        FROM manufacturing_orders mo
        JOIN items i ON i.id = mo.item_id
        JOIN karigars k ON k.id = mo.karigar_id
        LEFT JOIN item_designs d ON d.id = mo.design_id
        WHERE mo.id = ? AND mo.deleted_at IS NULL
      `
      )
      .get(id) as any
    return row ? this.mapOrder(row) : null
  }

  listOrders(filter?: { status?: string; karigarId?: string; search?: string }): ManufacturingOrderRecord[] {
    let query = `
      SELECT
        mo.*,
        i.item_name,
        k.name AS karigar_name,
        d.design_name
      FROM manufacturing_orders mo
      JOIN items i ON i.id = mo.item_id
      JOIN karigars k ON k.id = mo.karigar_id
      LEFT JOIN item_designs d ON d.id = mo.design_id
      WHERE mo.deleted_at IS NULL
    `
    const params: any[] = []

    if (filter?.status && filter.status !== 'ALL') {
      query += ` AND mo.status = ?`
      params.push(filter.status)
    }

    if (filter?.karigarId) {
      query += ` AND mo.karigar_id = ?`
      params.push(filter.karigarId)
    }

    if (filter?.search) {
      query += ` AND (mo.order_number LIKE ? OR i.item_name LIKE ? OR k.name LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s, s)
    }

    query += ` ORDER BY mo.created_at DESC`
    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => this.mapOrder(r))
  }

  updateOrderStatus(orderId: string, status: string, now: string): void {
    this.db.prepare(`UPDATE manufacturing_orders SET status = ?, updated_at = ? WHERE id = ?`).run(status, now, orderId)
  }

  updateOrderReconciliation(
    orderId: string,
    totalIssuedGross: number,
    totalIssuedFine: number,
    totalReturnedFine: number,
    totalFinishedFine: number,
    totalApprovedLoss: number,
    unreconciledFine: number,
    now: string
  ): void {
    this.db
      .prepare(
        `
        UPDATE manufacturing_orders
        SET total_issued_gross = ?,
            total_issued_fine = ?,
            total_returned_fine = ?,
            total_finished_fine = ?,
            total_approved_loss = ?,
            unreconciled_fine = ?,
            updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        totalIssuedGross,
        totalIssuedFine,
        totalReturnedFine,
        totalFinishedFine,
        totalApprovedLoss,
        unreconciledFine,
        now,
        orderId
      )
  }

  // ===================== 3. MATERIAL ISSUES =====================

  insertMaterialIssue(record: MaterialIssueRecord): void {
    this.db
      .prepare(
        `
        INSERT INTO manufacturing_material_issues (
          id, issue_number, order_id, karigar_id, issue_type, metal_type,
          purity_name, tunch, gross_weight, net_weight, fine_weight,
          stone_weight, stone_pcs, diamond_carats, diamond_pcs,
          issue_date, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        record.id,
        record.issueNumber,
        record.orderId,
        record.karigarId,
        record.issueType,
        record.metalType,
        record.purityName,
        record.tunch,
        record.grossWeight,
        record.netWeight,
        record.fineWeight,
        record.stoneWeight,
        record.stonePcs,
        record.diamondCarats,
        record.diamondPcs,
        record.issueDate,
        record.notes || '',
        record.createdAt
      )
  }

  listIssuesByOrder(orderId: string): MaterialIssueRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT mmi.*, mo.order_number, k.name AS karigar_name
        FROM manufacturing_material_issues mmi
        JOIN manufacturing_orders mo ON mo.id = mmi.order_id
        JOIN karigars k ON k.id = mmi.karigar_id
        WHERE mmi.order_id = ?
        ORDER BY mmi.created_at ASC
      `
      )
      .all(orderId) as any[]
    return rows.map((r) => this.mapIssue(r))
  }

  // ===================== 4. MATERIAL RETURNS =====================

  insertMaterialReturn(record: MaterialReturnRecord): void {
    this.db
      .prepare(
        `
        INSERT INTO manufacturing_material_returns (
          id, return_number, order_id, karigar_id, metal_type,
          gross_weight, net_weight, fine_weight, return_date, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        record.id,
        record.returnNumber,
        record.orderId,
        record.karigarId,
        record.metalType,
        record.grossWeight,
        record.netWeight,
        record.fineWeight,
        record.returnDate,
        record.notes || '',
        record.createdAt
      )
  }

  listReturnsByOrder(orderId: string): MaterialReturnRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT mmr.*, mo.order_number, k.name AS karigar_name
        FROM manufacturing_material_returns mmr
        JOIN manufacturing_orders mo ON mo.id = mmr.order_id
        JOIN karigars k ON k.id = mmr.karigar_id
        WHERE mmr.order_id = ?
        ORDER BY mmr.created_at ASC
      `
      )
      .all(orderId) as any[]
    return rows.map((r) => this.mapReturn(r))
  }

  // ===================== 5. FINISHED GOODS RECEIPTS =====================

  insertFinishedReceipt(record: FinishedReceiptRecord): void {
    this.db
      .prepare(
        `
        INSERT INTO manufacturing_receipts (
          id, receipt_number, order_id, karigar_id, item_id, stock_item_id,
          pcs, gross_weight, less_weight, net_weight, fine_weight, purity_name,
          tunch, wastage_percent, actual_wastage_weight, process_loss_weight,
          scrap_weight, labour_rate, labour_rate_type, labour_amount,
          qc_status, receipt_date, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        record.id,
        record.receiptNumber,
        record.orderId,
        record.karigarId,
        record.itemId,
        record.stockItemId || null,
        record.pcs,
        record.grossWeight,
        record.lessWeight,
        record.netWeight,
        record.fineWeight,
        record.purityName,
        record.tunch,
        record.wastagePercent,
        record.actualWastageWeight,
        record.processLossWeight,
        record.scrapWeight,
        record.labourRate,
        record.labourRateType,
        record.labourAmount,
        record.qcStatus,
        record.receiptDate,
        record.notes || '',
        record.createdAt
      )
  }

  listReceiptsByOrder(orderId: string): FinishedReceiptRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT mr.*, mo.order_number, k.name AS karigar_name, i.item_name, si.stock_item_code, si.barcode
        FROM manufacturing_receipts mr
        JOIN manufacturing_orders mo ON mo.id = mr.order_id
        JOIN karigars k ON k.id = mr.karigar_id
        JOIN items i ON i.id = mr.item_id
        LEFT JOIN jewellery_stock_items si ON si.id = mr.stock_item_id
        WHERE mr.order_id = ?
        ORDER BY mr.created_at ASC
      `
      )
      .all(orderId) as any[]
    return rows.map((r) => this.mapReceipt(r))
  }

  // ===================== 6. METAL LEDGER =====================

  insertMetalLedgerEntry(entry: KarigarMetalLedgerRecord): void {
    this.db
      .prepare(
        `
        INSERT INTO karigar_metal_ledger (
          id, karigar_id, entry_date, metal_type, document_type,
          document_id, document_number, fine_issued, fine_returned,
          fine_received, approved_loss, running_fine_balance,
          narration, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entry.id,
        entry.karigarId,
        entry.entryDate,
        entry.metalType,
        entry.documentType,
        entry.documentId,
        entry.documentNumber,
        entry.fineIssued,
        entry.fineReturned,
        entry.fineReceived,
        entry.approvedLoss,
        entry.runningFineBalance,
        entry.narration || '',
        entry.createdAt
      )
  }

  getKarigarMetalLedger(karigarId: string, metalType?: string): KarigarMetalLedgerRecord[] {
    let query = `
      SELECT kml.*, k.name AS karigar_name
      FROM karigar_metal_ledger kml
      JOIN karigars k ON k.id = kml.karigar_id
      WHERE kml.karigar_id = ?
    `
    const params: any[] = [karigarId]

    if (metalType) {
      query += ` AND kml.metal_type = ?`
      params.push(metalType)
    }

    query += ` ORDER BY kml.entry_date ASC, kml.created_at ASC`
    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => this.mapMetalLedger(r))
  }

  // ===================== 7. KARIGAR SETTLEMENTS =====================

  insertSettlement(record: KarigarSettlementRecord): void {
    this.db
      .prepare(
        `
        INSERT INTO karigar_settlements (
          id, settlement_number, karigar_id, settlement_date,
          settlement_type, amount_paid, fine_metal_settled,
          payment_reference, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        record.id,
        record.settlementNumber,
        record.karigarId,
        record.settlementDate,
        record.settlementType,
        record.amountPaid,
        record.fineMetalSettled,
        record.paymentReference || '',
        record.notes || '',
        record.createdAt
      )
  }

  listSettlementsByKarigar(karigarId: string): KarigarSettlementRecord[] {
    const rows = this.db
      .prepare(
        `
        SELECT ks.*, k.name AS karigar_name
        FROM karigar_settlements ks
        JOIN karigars k ON k.id = ks.karigar_id
        WHERE ks.karigar_id = ?
        ORDER BY ks.created_at DESC
      `
      )
      .all(karigarId) as any[]
    return rows.map((r) => this.mapSettlement(r))
  }

  // ===================== RECONCILIATION SUMMARY =====================

  getOrderReconciliation(orderId: string): ManufacturingReconciliationSummary {
    const order = this.getOrderById(orderId)!
    const issues = this.listIssuesByOrder(orderId)
    const returns = this.listReturnsByOrder(orderId)
    const receipts = this.listReceiptsByOrder(orderId)

    const totalFineIssued = issues.reduce((acc, i) => acc + i.fineWeight, 0)
    const totalFineReturned = returns.reduce((acc, r) => acc + r.fineWeight, 0)
    const totalFineReceived = receipts.reduce((acc, rc) => acc + rc.fineWeight, 0)
    const totalApprovedLoss = receipts.reduce((acc, rc) => acc + rc.processLossWeight + rc.actualWastageWeight, 0)

    const unreconciledDifference = Number(
      (totalFineIssued - totalFineReturned - totalFineReceived - totalApprovedLoss).toFixed(3)
    )

    return {
      order,
      materialIssues: issues,
      materialReturns: returns,
      receipts,
      totalFineIssued,
      totalFineReturned,
      totalFineReceived,
      totalApprovedLoss,
      unreconciledDifference,
      isReconciled: Math.abs(unreconciledDifference) < 0.005
    }
  }

  // ===================== MAPPERS =====================

  private mapKarigar(r: any): KarigarRecord {
    return {
      id: r.id,
      karigarCode: r.karigar_code,
      name: r.name,
      mobile: r.mobile,
      address: r.address,
      specialization: r.specialization,
      accountId: r.account_id,
      accountName: r.account_name,
      fineGoldBalance: Number(r.fine_gold_balance || 0),
      fineSilverBalance: Number(r.fine_silver_balance || 0),
      active: Boolean(r.active),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }
  }

  private mapOrder(r: any): ManufacturingOrderRecord {
    return {
      id: r.id,
      orderNumber: r.order_number,
      designId: r.design_id,
      designName: r.design_name,
      itemId: r.item_id,
      itemName: r.item_name,
      karigarId: r.karigar_id,
      karigarName: r.karigar_name,
      plannedPcs: Number(r.planned_pcs || 1),
      plannedGrossWeight: Number(r.planned_gross_weight || 0),
      plannedNetWeight: Number(r.planned_net_weight || 0),
      metalType: r.metal_type,
      purityName: r.purity_name,
      targetFineWeight: Number(r.target_fine_weight || 0),
      expectedDeliveryDate: r.expected_delivery_date,
      status: r.status,
      totalIssuedGross: Number(r.total_issued_gross || 0),
      totalIssuedFine: Number(r.total_issued_fine || 0),
      totalReturnedFine: Number(r.total_returned_fine || 0),
      totalFinishedFine: Number(r.total_finished_fine || 0),
      totalApprovedLoss: Number(r.total_approved_loss || 0),
      unreconciledFine: Number(r.unreconciled_fine || 0),
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }
  }

  private mapIssue(r: any): MaterialIssueRecord {
    return {
      id: r.id,
      issueNumber: r.issue_number,
      orderId: r.order_id,
      orderNumber: r.order_number,
      karigarId: r.karigar_id,
      karigarName: r.karigar_name,
      issueType: r.issue_type,
      metalType: r.metal_type,
      purityName: r.purity_name,
      tunch: Number(r.tunch || 100),
      grossWeight: Number(r.gross_weight || 0),
      netWeight: Number(r.net_weight || 0),
      fineWeight: Number(r.fine_weight || 0),
      stoneWeight: Number(r.stone_weight || 0),
      stonePcs: Number(r.stone_pcs || 0),
      diamondCarats: Number(r.diamond_carats || 0),
      diamondPcs: Number(r.diamond_pcs || 0),
      issueDate: r.issue_date,
      notes: r.notes,
      createdAt: r.created_at
    }
  }

  private mapReturn(r: any): MaterialReturnRecord {
    return {
      id: r.id,
      returnNumber: r.return_number,
      orderId: r.order_id,
      orderNumber: r.order_number,
      karigarId: r.karigar_id,
      karigarName: r.karigar_name,
      metalType: r.metal_type,
      grossWeight: Number(r.gross_weight || 0),
      netWeight: Number(r.net_weight || 0),
      fineWeight: Number(r.fine_weight || 0),
      returnDate: r.return_date,
      notes: r.notes,
      createdAt: r.created_at
    }
  }

  private mapReceipt(r: any): FinishedReceiptRecord {
    return {
      id: r.id,
      receiptNumber: r.receipt_number,
      orderId: r.order_id,
      orderNumber: r.order_number,
      karigarId: r.karigar_id,
      karigarName: r.karigar_name,
      itemId: r.item_id,
      itemName: r.item_name,
      stockItemId: r.stock_item_id,
      stockItemCode: r.stock_item_code,
      barcode: r.barcode,
      pcs: Number(r.pcs || 1),
      grossWeight: Number(r.gross_weight || 0),
      lessWeight: Number(r.less_weight || 0),
      netWeight: Number(r.net_weight || 0),
      fineWeight: Number(r.fine_weight || 0),
      purityName: r.purity_name,
      tunch: Number(r.tunch || 100),
      wastagePercent: Number(r.wastage_percent || 0),
      actualWastageWeight: Number(r.actual_wastage_weight || 0),
      processLossWeight: Number(r.process_loss_weight || 0),
      scrapWeight: Number(r.scrap_weight || 0),
      labourRate: Number(r.labour_rate || 0),
      labourRateType: r.labour_rate_type,
      labourAmount: Number(r.labour_amount || 0),
      qcStatus: r.qc_status,
      receiptDate: r.receipt_date,
      notes: r.notes,
      createdAt: r.created_at
    }
  }

  private mapMetalLedger(r: any): KarigarMetalLedgerRecord {
    return {
      id: r.id,
      karigarId: r.karigar_id,
      karigarName: r.karigar_name,
      entryDate: r.entry_date,
      metalType: r.metal_type,
      documentType: r.document_type,
      documentId: r.document_id,
      documentNumber: r.document_number,
      fineIssued: Number(r.fine_issued || 0),
      fineReturned: Number(r.fine_returned || 0),
      fineReceived: Number(r.fine_received || 0),
      approvedLoss: Number(r.approved_loss || 0),
      runningFineBalance: Number(r.running_fine_balance || 0),
      narration: r.narration,
      createdAt: r.created_at
    }
  }

  private mapSettlement(r: any): KarigarSettlementRecord {
    return {
      id: r.id,
      settlementNumber: r.settlement_number,
      karigarId: r.karigar_id,
      karigarName: r.karigar_name,
      settlementDate: r.settlement_date,
      settlementType: r.settlement_type,
      amountPaid: Number(r.amount_paid || 0),
      fineMetalSettled: Number(r.fine_metal_settled || 0),
      paymentReference: r.payment_reference,
      notes: r.notes,
      createdAt: r.created_at
    }
  }
}
