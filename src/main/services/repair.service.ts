import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDatabase } from '../database/connection'
import { RepairRepository } from '../database/repositories/RepairRepository'
import { JewelleryStockItemRepository } from '../database/repositories/JewelleryStockItemRepository'
import { AccountLedgerRepository } from '../database/repositories/AccountLedgerRepository'
import { inventoryMovementService } from './inventoryMovement.service'
import { NotFoundError, ValidationError } from '../ipc/errors'
import type {
  RepairJobRecord,
  CreateRepairJobPayload,
  AssignKarigarPayload,
  RepairMaterialIssuePayload,
  ReceiveFromKarigarPayload,
  DeliverRepairPayload,
  RepairTimelineEventRecord,
  RepairDashboardSummary
} from '../../shared/types/repair'

const repairRepo = new RepairRepository()
const stockItemRepo = new JewelleryStockItemRepository()
const accountLedgerRepo = new AccountLedgerRepository()

export const repairService = {
  createRepairJob(payload: CreateRepairJobPayload): RepairJobRecord {
    if (!payload.customerId) {
      throw new ValidationError('Customer is required for repair intake')
    }
    if (payload.beforeGrossWeight <= 0) {
      throw new ValidationError('Intake gross weight must be greater than zero')
    }

    const db = getDatabase()
    const id = uuidv4()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const repairNumber = `REP-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`

    let createdRecord: RepairJobRecord

    const execute = db.transaction(() => {
      // 1. If SHOP_OWNED, validate and update stock item status to REPAIR
      if (payload.ownershipType === 'SHOP_OWNED' && payload.stockItemId) {
        const stockItem = stockItemRepo.findById(payload.stockItemId)
        if (!stockItem) {
          throw new NotFoundError(`Stock item ${payload.stockItemId} not found`)
        }
        stockItemRepo.updateStatus(payload.stockItemId, 'REPAIR', now)
      }

      // 2. Insert Repair Job
      createdRecord = repairRepo.createJob(id, repairNumber, payload, now)

      // 3. Add Intake Timeline Event
      const description =
        payload.ownershipType === 'SHOP_OWNED'
          ? `Shop inventory item (${createdRecord.stockItemCode || 'Serialized'}) received for ${payload.repairType} (${payload.beforeGrossWeight.toFixed(3)}g)`
          : `Customer jewellery received for custody & ${payload.repairType}: "${payload.customerItemDescription || 'Customer Piece'}" (${payload.beforeGrossWeight.toFixed(3)}g)`

      repairRepo.addTimelineEvent(uuidv4(), id, 'INTAKE_RECEIVED', description, 'Admin', now)
    })

    execute()
    return createdRecord!
  },

  getRepairJobById(id: string): RepairJobRecord {
    const job = repairRepo.getJobById(id)
    if (!job) throw new NotFoundError(`Repair job with ID ${id} not found`)
    return job
  },

  listRepairJobs(filter?: {
    status?: string
    customerId?: string
    karigarId?: string
    ownershipType?: string
    search?: string
  }): RepairJobRecord[] {
    return repairRepo.listJobs(filter)
  },

  assignKarigar(payload: AssignKarigarPayload): RepairJobRecord {
    const db = getDatabase()
    const job = this.getRepairJobById(payload.repairJobId)

    if (job.status === 'DELIVERED' || job.status === 'CANCELLED') {
      throw new ValidationError(`Cannot assign karigar to repair with status ${job.status}`)
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const execute = db.transaction(() => {
      repairRepo.assignKarigar(payload.repairJobId, payload.karigarId, now)
      repairRepo.addTimelineEvent(
        uuidv4(),
        payload.repairJobId,
        'KARIGAR_ASSIGNED',
        `Assigned to Karigar for servicing. Expected return: ${payload.expectedReturnDate || 'Not specified'}`,
        'Admin',
        now
      )
    })

    execute()
    return this.getRepairJobById(payload.repairJobId)
  },

  issueMaterial(payload: RepairMaterialIssuePayload): RepairJobRecord {
    const db = getDatabase()
    const job = this.getRepairJobById(payload.repairJobId)

    if (job.status === 'DELIVERED' || job.status === 'CANCELLED') {
      throw new ValidationError(`Cannot issue material for repair with status ${job.status}`)
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const issueId = uuidv4()
    const issueNumber = `RMI-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`
    const tunch = payload.tunch || 100
    const fineWeight = (payload.netWeight * tunch) / 100

    const execute = db.transaction(() => {
      // 1. Record Material Issue
      repairRepo.recordMaterialIssue(issueId, issueNumber, payload, now)

      // 2. Deduct raw metal from shop inventory
      inventoryMovementService.postMovement({
        sourceType: 'REPAIR_MATERIAL_ISSUE',
        sourceId: issueId,
        movementType: 'REPAIR_OUT',
        entryDate: payload.issueDate || now.slice(0, 10),
        itemId: job.stockItemId || 'RAW_METAL',
        metalType: payload.metalType,
        pcsDelta: 0,
        grossWeightDelta: payload.grossWeight,
        netWeightDelta: payload.netWeight,
        fineDelta: fineWeight,
        narration: `Repair Material Issue ${issueNumber} for Repair ${job.repairNumber}`
      })

      // 3. Add timeline event
      repairRepo.addTimelineEvent(
        uuidv4(),
        payload.repairJobId,
        'MATERIAL_ISSUED',
        `Issued ${payload.grossWeight.toFixed(3)}g ${payload.metalType} (${fineWeight.toFixed(3)}g fine) for repair work`,
        'Admin',
        now
      )
    })

    execute()
    return this.getRepairJobById(payload.repairJobId)
  },

  receiveFromKarigar(payload: ReceiveFromKarigarPayload): RepairJobRecord {
    const db = getDatabase()
    const job = this.getRepairJobById(payload.repairJobId)

    if (job.status === 'DELIVERED' || job.status === 'CANCELLED') {
      throw new ValidationError(`Cannot receive repair with status ${job.status}`)
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const weightDiff = Number((payload.afterGrossWeight - job.beforeGrossWeight).toFixed(3))
    const afterFine = payload.afterNetWeight // simplified snapshot

    const execute = db.transaction(() => {
      // 1. Update Repair Job
      repairRepo.receiveFromKarigar(payload.repairJobId, payload, weightDiff, afterFine, now)

      // 2. If unused material was returned, post inventory movement IN
      if (payload.materialReturnedFine && payload.materialReturnedFine > 0) {
        inventoryMovementService.postMovement({
          sourceType: 'REPAIR_MATERIAL_RETURN',
          sourceId: job.id,
          movementType: 'REPAIR_IN',
          entryDate: now.slice(0, 10),
          itemId: job.stockItemId || 'RAW_METAL',
          metalType: job.metalType,
          pcsDelta: 0,
          grossWeightDelta: payload.materialReturnedFine,
          netWeightDelta: payload.materialReturnedFine,
          fineDelta: payload.materialReturnedFine,
          narration: `Unused metal returned from Karigar for Repair ${job.repairNumber}`
        })
      }

      // 3. Add timeline event
      repairRepo.addTimelineEvent(
        uuidv4(),
        payload.repairJobId,
        'RECEIVED_FROM_KARIGAR',
        `Received from Karigar. Post-repair Gross Wt: ${payload.afterGrossWeight.toFixed(3)}g (Diff: ${weightDiff >= 0 ? '+' : ''}${weightDiff.toFixed(3)}g)`,
        'Admin',
        now
      )
    })

    execute()
    return this.getRepairJobById(payload.repairJobId)
  },

  updateQcStatus(repairJobId: string, qcStatus: 'APPROVED' | 'REJECTED', notes: string = ''): RepairJobRecord {
    const db = getDatabase()
    const job = this.getRepairJobById(repairJobId)
    if (job.status === 'DELIVERED' || job.status === 'CANCELLED') {
      throw new ValidationError(`Cannot update QC on repair with status ${job.status}`)
    }
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const execute = db.transaction(() => {
      repairRepo.updateQcStatus(repairJobId, qcStatus, notes, now)
      repairRepo.addTimelineEvent(
        uuidv4(),
        repairJobId,
        qcStatus === 'APPROVED' ? 'QC_APPROVED' : 'QC_REJECTED',
        `Quality check ${qcStatus.toLowerCase()}: ${notes || 'Verified measurements and craftsmanship'}`,
        'Admin',
        now
      )
    })

    execute()
    return this.getRepairJobById(repairJobId)
  },

  deliverRepair(payload: DeliverRepairPayload): RepairJobRecord {
    const db = getDatabase()
    const job = this.getRepairJobById(payload.repairJobId)

    if (job.status === 'DELIVERED') {
      throw new ValidationError(`Repair job ${job.repairNumber} has already been delivered`)
    }
    if (job.qcStatus !== 'APPROVED') {
      throw new ValidationError(`Cannot deliver repair with QC status "${job.qcStatus}". QC must be Approved first.`)
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const deliveryDate = now.slice(0, 10)

    const execute = db.transaction(() => {
      // 1. Record Delivery on Repair Job
      repairRepo.recordDelivery(payload.repairJobId, payload, now)

      // 2. If SHOP_OWNED, restore physical stock item status to IN_STOCK
      if (job.ownershipType === 'SHOP_OWNED' && job.stockItemId) {
        stockItemRepo.updateStatus(job.stockItemId, 'IN_STOCK', now)
      }

      // 3. Post Financial Entries to Account Ledger
      // A. Post Repair Service Charge as Debit (cashNave - customer owes the store)
      if (payload.finalRepairCharge > 0) {
        accountLedgerRepo.insert({
          id: uuidv4(),
          sourceType: 'REPAIR_CHARGE',
          sourceId: job.id,
          entryDate: deliveryDate,
          accountId: job.customerId,
          metalType: job.metalType,
          cashNave: payload.finalRepairCharge,
          narration: `Repair Charge for ${job.repairNumber} (${job.repairType})`,
          createdAt: now
        })
      }

      // B. Post Customer Payment as Credit (cashJama - customer payment received)
      if (payload.amountPaid > 0) {
        accountLedgerRepo.insert({
          id: uuidv4(),
          sourceType: 'PAYMENT',
          sourceId: job.id,
          entryDate: deliveryDate,
          accountId: job.customerId,
          metalType: 'OTHER',
          cashJama: payload.amountPaid,
          narration: `Payment received for Repair ${job.repairNumber} (${payload.paymentMethod || 'CASH'})`,
          createdAt: now
        })
      }

      // 4. Add Delivery Timeline Event
      const custodyNote =
        job.ownershipType === 'CUSTOMER_OWNED'
          ? `Customer jewellery returned to ${payload.receivedBy || 'Customer'}. Custody closed.`
          : `Shop inventory restored to IN_STOCK.`

      repairRepo.addTimelineEvent(
        uuidv4(),
        payload.repairJobId,
        'DELIVERED_TO_CUSTOMER',
        `Repair completed and delivered. ${custodyNote} Paid: ₹${payload.amountPaid.toLocaleString()}`,
        payload.deliveredBy || 'Admin',
        now
      )
    })

    execute()
    return this.getRepairJobById(payload.repairJobId)
  },

  cancelRepair(repairJobId: string, reason: string = ''): RepairJobRecord {
    const db = getDatabase()
    const job = this.getRepairJobById(repairJobId)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const execute = db.transaction(() => {
      // If SHOP_OWNED, restore physical stock item status to IN_STOCK
      if (job.ownershipType === 'SHOP_OWNED' && job.stockItemId) {
        stockItemRepo.updateStatus(job.stockItemId, 'IN_STOCK', now)
      }

      db.prepare(`UPDATE repair_jobs SET status = 'CANCELLED', notes = ?, updated_at = ? WHERE id = ?`).run(
        `Cancelled: ${reason}`,
        now,
        repairJobId
      )

      repairRepo.addTimelineEvent(
        uuidv4(),
        repairJobId,
        'REPAIR_CANCELLED',
        `Repair cancelled. Reason: ${reason || 'No reason specified'}`,
        'Admin',
        now
      )
    })

    execute()
    return this.getRepairJobById(repairJobId)
  },

  getTimelineEvents(repairJobId: string): RepairTimelineEventRecord[] {
    return repairRepo.getTimelineEvents(repairJobId)
  },

  getDashboardSummary(): RepairDashboardSummary {
    return repairRepo.getDashboardSummary()
  }
}
