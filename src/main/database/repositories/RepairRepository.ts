import { BaseRepository } from './BaseRepository'
import type {
  RepairJobRecord,
  CreateRepairJobPayload,
  RepairMaterialIssuePayload,
  ReceiveFromKarigarPayload,
  DeliverRepairPayload,
  RepairTimelineEventRecord,
  RepairDashboardSummary,
  RepairStatus
} from '../../../shared/types/repair'

export class RepairRepository extends BaseRepository {
  createJob(
    id: string,
    repairNumber: string,
    payload: CreateRepairJobPayload,
    now: string
  ): RepairJobRecord {
    const beforeFine =
      payload.beforeFineWeight !== undefined
        ? payload.beforeFineWeight
        : payload.beforeNetWeight
    const estLabour = payload.estimateLabour || 0
    const estMaterial = payload.estimateMaterial || 0
    const estStone = payload.estimateStone || 0
    const estOther = payload.estimateOther || 0
    const estTotal = estLabour + estMaterial + estStone + estOther

    this.db
      .prepare(
        `
        INSERT INTO repair_jobs (
          id, repair_number, customer_id, ownership_type, stock_item_id,
          customer_item_description, metal_type, purity_name, repair_type,
          status, priority, received_date, expected_delivery_date,
          before_gross_weight, before_net_weight, before_fine_weight,
          before_stone_count, before_diamond_count, intake_condition,
          estimate_labour, estimate_material, estimate_stone, estimate_other,
          estimate_total, is_estimate_approved, notes, created_by, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          'RECEIVED', ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, 1, ?, 'Admin', ?, ?
        )
      `
      )
      .run(
        id,
        repairNumber,
        payload.customerId,
        payload.ownershipType,
        payload.stockItemId || null,
        payload.customerItemDescription || '',
        payload.metalType || 'GOLD',
        payload.purityName || '22K',
        payload.repairType,
        payload.priority || 'NORMAL',
        payload.receivedDate || now.slice(0, 10),
        payload.expectedDeliveryDate || null,
        payload.beforeGrossWeight,
        payload.beforeNetWeight,
        beforeFine,
        payload.beforeStoneCount || 0,
        payload.beforeDiamondCount || 0,
        payload.intakeCondition || '',
        estLabour,
        estMaterial,
        estStone,
        estOther,
        estTotal,
        payload.notes || '',
        now,
        now
      )

    return this.getJobById(id)!
  }

  getJobById(id: string): RepairJobRecord | null {
    const query = `
      SELECT
        rj.*,
        c.name AS customer_name,
        c.mobile AS customer_mobile,
        si.stock_item_code,
        si.barcode,
        k.name AS karigar_name
      FROM repair_jobs rj
      JOIN customers c ON c.id = rj.customer_id
      LEFT JOIN jewellery_stock_items si ON si.id = rj.stock_item_id
      LEFT JOIN karigars k ON k.id = rj.assigned_karigar_id
      WHERE rj.id = ? AND rj.deleted_at IS NULL
    `
    const row = this.db.prepare(query).get(id) as any
    return row ? this.mapRow(row) : null
  }

  listJobs(filter?: {
    status?: string
    customerId?: string
    karigarId?: string
    ownershipType?: string
    search?: string
  }): RepairJobRecord[] {
    let query = `
      SELECT
        rj.*,
        c.name AS customer_name,
        c.mobile AS customer_mobile,
        si.stock_item_code,
        si.barcode,
        k.name AS karigar_name
      FROM repair_jobs rj
      JOIN customers c ON c.id = rj.customer_id
      LEFT JOIN jewellery_stock_items si ON si.id = rj.stock_item_id
      LEFT JOIN karigars k ON k.id = rj.assigned_karigar_id
      WHERE rj.deleted_at IS NULL
    `
    const params: any[] = []

    if (filter?.status && filter.status !== 'ALL') {
      query += ` AND rj.status = ?`
      params.push(filter.status)
    }

    if (filter?.customerId) {
      query += ` AND rj.customer_id = ?`
      params.push(filter.customerId)
    }

    if (filter?.karigarId) {
      query += ` AND rj.assigned_karigar_id = ?`
      params.push(filter.karigarId)
    }

    if (filter?.ownershipType && filter.ownershipType !== 'ALL') {
      query += ` AND rj.ownership_type = ?`
      params.push(filter.ownershipType)
    }

    if (filter?.search) {
      query += ` AND (rj.repair_number LIKE ? OR c.name LIKE ? OR c.mobile LIKE ? OR rj.customer_item_description LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s, s, s)
    }

    query += ` ORDER BY rj.created_at DESC`
    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => this.mapRow(r))
  }

  assignKarigar(
    repairJobId: string,
    karigarId: string,
    now: string
  ): void {
    this.db
      .prepare(
        `
        UPDATE repair_jobs
        SET assigned_karigar_id = ?,
            status = 'ASSIGNED',
            updated_at = ?
        WHERE id = ?
      `
      )
      .run(karigarId, now, repairJobId)
  }

  recordMaterialIssue(
    issueId: string,
    issueNumber: string,
    payload: RepairMaterialIssuePayload,
    now: string
  ): void {
    const fineWeight =
      payload.fineWeight !== undefined
        ? payload.fineWeight
        : (payload.netWeight * payload.tunch) / 100

    this.db
      .prepare(
        `
        INSERT INTO repair_material_issues (
          id, issue_number, repair_job_id, karigar_id, metal_type, purity_name,
          tunch, gross_weight, net_weight, fine_weight, stone_weight, stone_pcs,
          diamond_carats, diamond_pcs, issue_date, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        issueId,
        issueNumber,
        payload.repairJobId,
        payload.karigarId,
        payload.metalType,
        payload.purityName,
        payload.tunch,
        payload.grossWeight,
        payload.netWeight,
        fineWeight,
        payload.stoneWeight || 0,
        payload.stonePcs || 0,
        payload.diamondCarats || 0,
        payload.diamondPcs || 0,
        payload.issueDate || now.slice(0, 10),
        payload.notes || '',
        now
      )

    // Update Repair Job status and issued totals
    this.db
      .prepare(
        `
        UPDATE repair_jobs
        SET material_issued_gross = material_issued_gross + ?,
            material_issued_fine = material_issued_fine + ?,
            status = 'IN_REPAIR',
            updated_at = ?
        WHERE id = ?
      `
      )
      .run(payload.grossWeight, fineWeight, now, payload.repairJobId)
  }

  receiveFromKarigar(
    repairJobId: string,
    payload: ReceiveFromKarigarPayload,
    weightDiff: number,
    afterFine: number,
    now: string
  ): void {
    this.db
      .prepare(
        `
        UPDATE repair_jobs
        SET after_gross_weight = ?,
            after_net_weight = ?,
            after_fine_weight = ?,
            after_stone_count = ?,
            after_diamond_count = ?,
            weight_difference = ?,
            material_returned_fine = ?,
            material_consumed_fine = ?,
            karigar_labour_amount = ?,
            qc_status = 'PENDING',
            qc_notes = ?,
            status = 'RECEIVED_FROM_KARIGAR',
            updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        payload.afterGrossWeight,
        payload.afterNetWeight,
        afterFine,
        payload.afterStoneCount || 0,
        payload.afterDiamondCount || 0,
        weightDiff,
        payload.materialReturnedFine || 0,
        payload.materialConsumedFine || 0,
        payload.karigarLabourAmount || 0,
        payload.qcNotes || '',
        now,
        repairJobId
      )
  }

  updateQcStatus(
    repairJobId: string,
    qcStatus: 'APPROVED' | 'REJECTED',
    notes: string,
    now: string
  ): void {
    const nextStatus: RepairStatus =
      qcStatus === 'APPROVED' ? 'READY_FOR_DELIVERY' : 'QC_REJECTED'

    this.db
      .prepare(
        `
        UPDATE repair_jobs
        SET qc_status = ?,
            qc_notes = ?,
            status = ?,
            updated_at = ?
        WHERE id = ?
      `
      )
      .run(qcStatus, notes, nextStatus, now, repairJobId)
  }

  recordDelivery(
    repairJobId: string,
    payload: DeliverRepairPayload,
    now: string
  ): void {
    const balanceDue = Math.max(
      0,
      payload.finalRepairCharge -
        (payload.advanceAdjusted || 0) -
        payload.amountPaid
    )

    this.db
      .prepare(
        `
        UPDATE repair_jobs
        SET final_repair_charge = ?,
            advance_adjusted = ?,
            amount_paid = ?,
            balance_due = ?,
            payment_method = ?,
            payment_reference = ?,
            delivered_at = ?,
            delivered_by = ?,
            received_by = ?,
            status = 'DELIVERED',
            updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        payload.finalRepairCharge,
        payload.advanceAdjusted || 0,
        payload.amountPaid,
        balanceDue,
        payload.paymentMethod || 'CASH',
        payload.paymentReference || '',
        now,
        payload.deliveredBy || 'Staff',
        payload.receivedBy || 'Customer',
        now,
        repairJobId
      )
  }

  addTimelineEvent(
    id: string,
    repairJobId: string,
    eventType: string,
    description: string,
    performedBy: string,
    now: string
  ): void {
    this.db
      .prepare(
        `
        INSERT INTO repair_timeline_events (id, repair_job_id, event_type, description, performed_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      .run(id, repairJobId, eventType, description, performedBy, now)
  }

  getTimelineEvents(repairJobId: string): RepairTimelineEventRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM repair_timeline_events WHERE repair_job_id = ? ORDER BY created_at ASC`
      )
      .all(repairJobId) as any[]
    return rows.map((r) => ({
      id: r.id,
      repairJobId: r.repair_job_id,
      eventType: r.event_type,
      description: r.description,
      performedBy: r.performed_by,
      createdAt: r.created_at
    }))
  }

  getDashboardSummary(): RepairDashboardSummary {
    const today = new Date().toISOString().slice(0, 10)

    const receivedTodayRow = this.db
      .prepare(
        `SELECT COUNT(*) as c FROM repair_jobs WHERE received_date = ? AND deleted_at IS NULL`
      )
      .get(today) as any
    const inRepairRow = this.db
      .prepare(
        `SELECT COUNT(*) as c FROM repair_jobs WHERE status IN ('ASSIGNED', 'IN_REPAIR') AND deleted_at IS NULL`
      )
      .get() as any
    const awaitingApprovalRow = this.db
      .prepare(
        `SELECT COUNT(*) as c FROM repair_jobs WHERE status = 'ESTIMATE_PENDING' AND deleted_at IS NULL`
      )
      .get() as any
    const awaitingQcRow = this.db
      .prepare(
        `SELECT COUNT(*) as c FROM repair_jobs WHERE status = 'RECEIVED_FROM_KARIGAR' AND deleted_at IS NULL`
      )
      .get() as any
    const readyForDeliveryRow = this.db
      .prepare(
        `SELECT COUNT(*) as c FROM repair_jobs WHERE status = 'READY_FOR_DELIVERY' AND deleted_at IS NULL`
      )
      .get() as any
    const deliveredTodayRow = this.db
      .prepare(
        `SELECT COUNT(*) as c FROM repair_jobs WHERE status = 'DELIVERED' AND delivered_at LIKE ? AND deleted_at IS NULL`
      )
      .get(`${today}%`) as any
    const outstandingRow = this.db
      .prepare(
        `SELECT COALESCE(SUM(balance_due), 0) as s FROM repair_jobs WHERE status = 'DELIVERED' AND balance_due > 0 AND deleted_at IS NULL`
      )
      .get() as any

    return {
      receivedToday: Number(receivedTodayRow?.c || 0),
      inRepair: Number(inRepairRow?.c || 0),
      awaitingApproval: Number(awaitingApprovalRow?.c || 0),
      awaitingQc: Number(awaitingQcRow?.c || 0),
      readyForDelivery: Number(readyForDeliveryRow?.c || 0),
      deliveredToday: Number(deliveredTodayRow?.c || 0),
      totalOutstandingAmount: Number(outstandingRow?.s || 0)
    }
  }

  private mapRow(r: any): RepairJobRecord {
    return {
      id: r.id,
      repairNumber: r.repair_number,
      customerId: r.customer_id,
      customerName: r.customer_name || 'Customer',
      customerMobile: r.customer_mobile,
      ownershipType: r.ownership_type,
      stockItemId: r.stock_item_id,
      stockItemCode: r.stock_item_code,
      barcode: r.barcode,
      customerItemDescription: r.customer_item_description,
      metalType: r.metal_type,
      purityName: r.purity_name,
      repairType: r.repair_type,
      status: r.status,
      priority: r.priority,
      receivedDate: r.received_date,
      expectedDeliveryDate: r.expected_delivery_date,
      assignedKarigarId: r.assigned_karigar_id,
      karigarName: r.karigar_name,
      beforeGrossWeight: Number(r.before_gross_weight || 0),
      beforeNetWeight: Number(r.before_net_weight || 0),
      beforeFineWeight: Number(r.before_fine_weight || 0),
      beforeStoneCount: Number(r.before_stone_count || 0),
      beforeDiamondCount: Number(r.before_diamond_count || 0),
      intakeCondition: r.intake_condition,
      afterGrossWeight: Number(r.after_gross_weight || 0),
      afterNetWeight: Number(r.after_net_weight || 0),
      afterFineWeight: Number(r.after_fine_weight || 0),
      afterStoneCount: Number(r.after_stone_count || 0),
      afterDiamondCount: Number(r.after_diamond_count || 0),
      weightDifference: Number(r.weight_difference || 0),
      estimateLabour: Number(r.estimate_labour || 0),
      estimateMaterial: Number(r.estimate_material || 0),
      estimateStone: Number(r.estimate_stone || 0),
      estimateOther: Number(r.estimate_other || 0),
      estimateTax: Number(r.estimate_tax || 0),
      estimateTotal: Number(r.estimate_total || 0),
      isEstimateApproved: Boolean(r.is_estimate_approved),
      approvedBy: r.approved_by,
      approvalDate: r.approval_date,
      materialIssuedGross: Number(r.material_issued_gross || 0),
      materialIssuedFine: Number(r.material_issued_fine || 0),
      materialReturnedFine: Number(r.material_returned_fine || 0),
      materialConsumedFine: Number(r.material_consumed_fine || 0),
      karigarLabourAmount: Number(r.karigar_labour_amount || 0),
      finalRepairCharge: Number(r.final_repair_charge || 0),
      advanceAdjusted: Number(r.advance_adjusted || 0),
      amountPaid: Number(r.amount_paid || 0),
      balanceDue: Number(r.balance_due || 0),
      paymentMethod: r.payment_method || 'CASH',
      paymentReference: r.payment_reference,
      qcStatus: r.qc_status,
      qcNotes: r.qc_notes,
      deliveredAt: r.delivered_at,
      deliveredBy: r.delivered_by,
      receivedBy: r.received_by,
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }
  }
}
