import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDatabase } from '../database/connection'
import { ManufacturingRepository } from '../database/repositories/ManufacturingRepository'
import { AccountLedgerRepository } from '../database/repositories/AccountLedgerRepository'
import { inventoryMovementService } from './inventoryMovement.service'
import { itemTagService } from './itemTag.service'
import {
  calculateHishob,
  calculateFineFromHishob,
  calculateMajuri,
  roundNumber
} from './jewelleryFormula.service'
import { NotFoundError, ValidationError } from '../ipc/errors'
import type {
  KarigarRecord,
  CreateKarigarPayload,
  ManufacturingOrderRecord,
  CreateManufacturingOrderPayload,
  MaterialIssuePayload,
  MaterialIssueRecord,
  MaterialReturnPayload,
  MaterialReturnRecord,
  FinishedReceiptPayload,
  FinishedReceiptRecord,
  KarigarMetalLedgerRecord,
  KarigarSettlementPayload,
  KarigarSettlementRecord,
  ManufacturingReconciliationSummary
} from '../../shared/types/manufacturing'

const mfgRepo = new ManufacturingRepository()
const accountLedgerRepo = new AccountLedgerRepository()

export const manufacturingService = {
  // ===================== 1. KARIGARS =====================

  createKarigar(payload: CreateKarigarPayload): KarigarRecord {
    if (!payload.name || !payload.name.trim()) {
      throw new ValidationError('Karigar name is required')
    }

    const id = uuidv4()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const randomCode = Math.floor(1000 + Math.random() * 9000)
    const karigarCode = `KRG-${randomCode}`

    return mfgRepo.createKarigar(id, karigarCode, payload, now)
  },

  listKarigars(filter?: { activeOnly?: boolean; search?: string }): KarigarRecord[] {
    return mfgRepo.listKarigars(filter)
  },

  getKarigarById(id: string): KarigarRecord {
    const k = mfgRepo.getKarigarById(id)
    if (!k) throw new NotFoundError(`Karigar with ID ${id} not found`)
    return k
  },

  getKarigarMetalLedger(karigarId: string, metalType?: string): KarigarMetalLedgerRecord[] {
    return mfgRepo.getKarigarMetalLedger(karigarId, metalType)
  },

  // ===================== 2. MANUFACTURING ORDERS =====================

  createOrder(payload: CreateManufacturingOrderPayload): ManufacturingOrderRecord {
    if (!payload.itemId) throw new ValidationError('Item is required for manufacturing order')
    if (!payload.karigarId) throw new ValidationError('Karigar is required')
    if (payload.plannedPcs <= 0) throw new ValidationError('Planned pcs must be greater than zero')

    const id = uuidv4()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const orderNumber = `MO-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`

    return mfgRepo.createOrder(id, orderNumber, payload, now)
  },

  listOrders(filter?: { status?: string; karigarId?: string; search?: string }): ManufacturingOrderRecord[] {
    return mfgRepo.listOrders(filter)
  },

  getOrderById(id: string): ManufacturingOrderRecord {
    const o = mfgRepo.getOrderById(id)
    if (!o) throw new NotFoundError(`Manufacturing order with ID ${id} not found`)
    return o
  },

  // ===================== 3. MATERIAL ISSUE =====================

  issueMaterial(payload: MaterialIssuePayload): MaterialIssueRecord {
    const db = getDatabase()
    const order = this.getOrderById(payload.orderId)
    const karigar = this.getKarigarById(payload.karigarId)

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new ValidationError(`Cannot issue material to order with status ${order.status}`)
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const issueDate = payload.issueDate || dayjs().format('YYYY-MM-DD')
    const issueId = uuidv4()
    const issueNumber = `MI-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`

    const tunch = payload.tunch || 100
    const fineWeight = roundNumber((payload.netWeight * tunch) / 100, 3)

    const issueRecord: MaterialIssueRecord = {
      id: issueId,
      issueNumber,
      orderId: payload.orderId,
      orderNumber: order.orderNumber,
      karigarId: payload.karigarId,
      karigarName: karigar.name,
      issueType: payload.issueType || 'INITIAL',
      metalType: payload.metalType,
      purityName: payload.purityName,
      tunch,
      grossWeight: payload.grossWeight,
      netWeight: payload.netWeight,
      fineWeight,
      stoneWeight: payload.stoneWeight || 0,
      stonePcs: payload.stonePcs || 0,
      diamondCarats: payload.diamondCarats || 0,
      diamondPcs: payload.diamondPcs || 0,
      issueDate,
      notes: payload.notes || '',
      createdAt: now
    }

    const runningBalance = karigar.fineGoldBalance + fineWeight

    const execute = db.transaction(() => {
      // 1. Insert Material Issue
      mfgRepo.insertMaterialIssue(issueRecord)

      // 2. Post Outward Movement from Inventory
      inventoryMovementService.postMovement({
        sourceType: 'JOB_WORK_ISSUE',
        sourceId: issueId,
        movementType: 'JOB_WORK_OUT',
        entryDate: issueDate,
        itemId: order.itemId,
        metalType: payload.metalType,
        pcsDelta: 0,
        grossWeightDelta: payload.grossWeight,
        netWeightDelta: payload.netWeight,
        fineDelta: fineWeight,
        narration: `Material Issue ${issueNumber} to ${karigar.name} for Order ${order.orderNumber}`
      })

      // 3. Post to Karigar Metal Ledger
      mfgRepo.insertMetalLedgerEntry({
        id: uuidv4(),
        karigarId: karigar.id,
        karigarName: karigar.name,
        entryDate: issueDate,
        metalType: payload.metalType,
        documentType: 'ISSUE',
        documentId: issueId,
        documentNumber: issueNumber,
        fineIssued: fineWeight,
        fineReturned: 0,
        fineReceived: 0,
        approvedLoss: 0,
        runningFineBalance: runningBalance,
        narration: `Issued for Order ${order.orderNumber}`,
        createdAt: now
      })

      // 4. Update Karigar Fine Balance
      mfgRepo.updateKarigarBalances(karigar.id, fineWeight, 0, now)

      // 5. Update Order Status and Totals
      mfgRepo.updateOrderStatus(order.id, 'IN_PROGRESS', now)
      this.recalculateOrderTotals(order.id, now)
    })

    execute()
    return issueRecord
  },

  // ===================== 4. MATERIAL RETURN =====================

  returnMaterial(payload: MaterialReturnPayload): MaterialReturnRecord {
    const db = getDatabase()
    const order = this.getOrderById(payload.orderId)
    const karigar = this.getKarigarById(payload.karigarId)

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const returnDate = payload.returnDate || dayjs().format('YYYY-MM-DD')
    const returnId = uuidv4()
    const returnNumber = `MR-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`

    const fineWeight = roundNumber(payload.fineWeight, 3)

    const returnRecord: MaterialReturnRecord = {
      id: returnId,
      returnNumber,
      orderId: payload.orderId,
      orderNumber: order.orderNumber,
      karigarId: payload.karigarId,
      karigarName: karigar.name,
      metalType: payload.metalType,
      grossWeight: payload.grossWeight,
      netWeight: payload.netWeight,
      fineWeight,
      returnDate,
      notes: payload.notes || '',
      createdAt: now
    }

    const runningBalance = karigar.fineGoldBalance - fineWeight

    const execute = db.transaction(() => {
      // 1. Insert Material Return
      mfgRepo.insertMaterialReturn(returnRecord)

      // 2. Post Inward Movement to Inventory (Raw metal returned)
      inventoryMovementService.postMovement({
        sourceType: 'JOB_WORK_RETURN',
        sourceId: returnId,
        movementType: 'JOB_WORK_IN',
        entryDate: returnDate,
        itemId: order.itemId,
        metalType: payload.metalType,
        pcsDelta: 0,
        grossWeightDelta: payload.grossWeight,
        netWeightDelta: payload.netWeight,
        fineDelta: fineWeight,
        narration: `Unused Material Return ${returnNumber} from ${karigar.name}`
      })

      // 3. Post to Karigar Metal Ledger
      mfgRepo.insertMetalLedgerEntry({
        id: uuidv4(),
        karigarId: karigar.id,
        karigarName: karigar.name,
        entryDate: returnDate,
        metalType: payload.metalType,
        documentType: 'RETURN',
        documentId: returnId,
        documentNumber: returnNumber,
        fineIssued: 0,
        fineReturned: fineWeight,
        fineReceived: 0,
        approvedLoss: 0,
        runningFineBalance: runningBalance,
        narration: `Returned unused metal for Order ${order.orderNumber}`,
        createdAt: now
      })

      // 4. Update Karigar Fine Balance
      mfgRepo.updateKarigarBalances(karigar.id, -fineWeight, 0, now)

      // 5. Update Order Totals
      this.recalculateOrderTotals(order.id, now)
    })

    execute()
    return returnRecord
  },

  // ===================== 5. FINISHED GOODS RECEIPT =====================

  receiveFinishedGoods(payload: FinishedReceiptPayload): FinishedReceiptRecord {
    const db = getDatabase()
    const order = this.getOrderById(payload.orderId)
    const karigar = this.getKarigarById(payload.karigarId)

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new ValidationError(`Order is already ${order.status}`)
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const receiptDate = payload.receiptDate || dayjs().format('YYYY-MM-DD')
    const receiptId = uuidv4()
    const receiptNumber = `FR-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`

    const tunch = payload.tunch || 100
    const wastage = payload.wastagePercent || 0
    const hishob = calculateHishob(tunch, wastage)
    const fineWeight = calculateFineFromHishob(payload.netWeight, hishob)

    const labourAmount = calculateMajuri({
      netWeight: payload.netWeight,
      pcs: payload.pcs,
      labourRate: payload.labourRate,
      labourRateType: payload.labourRateType
    })

    const actualWastageWeight = payload.actualWastageWeight || 0
    const processLossWeight = payload.processLossWeight || 0
    const scrapWeight = payload.scrapWeight || 0
    const totalLossAndWastageFine = actualWastageWeight + processLossWeight

    let stockItemId: string | null = null
    let stockItemCode: string | null = null
    let barcode: string | null = null

    // 1. Create Serialized Physical Stock Item in Tagging Engine (Phase 17)
    if (payload.qcStatus !== 'REJECTED') {
      const stockItem = itemTagService.createStockItem({
        itemId: payload.itemId,
        grossWeight: payload.grossWeight,
        netWeight: payload.netWeight,
        fineWeight,
        purityName: payload.purityName,
        tunch
      })
      stockItemId = stockItem.id
      stockItemCode = stockItem.stockItemCode
      barcode = stockItem.barcode || null
    }

    const receiptRecord: FinishedReceiptRecord = {
      id: receiptId,
      receiptNumber,
      orderId: payload.orderId,
      orderNumber: order.orderNumber,
      karigarId: payload.karigarId,
      karigarName: karigar.name,
      itemId: payload.itemId,
      itemName: order.itemName,
      stockItemId,
      stockItemCode,
      barcode,
      pcs: payload.pcs,
      grossWeight: payload.grossWeight,
      lessWeight: payload.lessWeight || 0,
      netWeight: payload.netWeight,
      fineWeight,
      purityName: payload.purityName,
      tunch,
      wastagePercent: wastage,
      actualWastageWeight,
      processLossWeight,
      scrapWeight,
      labourRate: payload.labourRate,
      labourRateType: payload.labourRateType,
      labourAmount,
      qcStatus: payload.qcStatus || 'APPROVED',
      receiptDate,
      notes: payload.notes || '',
      createdAt: now
    }

    const fineDeduction = fineWeight + totalLossAndWastageFine
    const runningBalance = karigar.fineGoldBalance - fineDeduction

    const execute = db.transaction(() => {
      // 1. Insert Finished Receipt
      mfgRepo.insertFinishedReceipt(receiptRecord)

      // 2. Inward Movement to Finished Inventory
      inventoryMovementService.postMovement({
        sourceType: 'JOB_WORK_RECEIPT',
        sourceId: receiptId,
        movementType: 'JOB_WORK_IN',
        entryDate: receiptDate,
        itemId: payload.itemId,
        metalType: order.metalType,
        pcsDelta: payload.pcs,
        grossWeightDelta: payload.grossWeight,
        netWeightDelta: payload.netWeight,
        fineDelta: fineWeight,
        narration: `Finished Jewellery Receipt ${receiptNumber} against MO ${order.orderNumber}`
      })

      // 3. Post Labour Charges (Majuri) to Financial Ledger (Credit Karigar Payable)
      if (labourAmount > 0 && karigar.accountId) {
        accountLedgerRepo.insert({
          id: uuidv4(),
          sourceType: 'JOB_WORK_RECEIPT',
          sourceId: receiptId,
          entryDate: receiptDate,
          accountId: karigar.accountId,
          metalType: order.metalType,
          cashJama: labourAmount,
          narration: `Labour for MO ${order.orderNumber} (${receiptNumber})`,
          createdAt: now
        })
      }

      // 4. Post to Karigar Metal Ledger
      mfgRepo.insertMetalLedgerEntry({
        id: uuidv4(),
        karigarId: karigar.id,
        karigarName: karigar.name,
        entryDate: receiptDate,
        metalType: order.metalType,
        documentType: 'RECEIPT',
        documentId: receiptId,
        documentNumber: receiptNumber,
        fineIssued: 0,
        fineReturned: 0,
        fineReceived: fineWeight,
        approvedLoss: totalLossAndWastageFine,
        runningFineBalance: runningBalance,
        narration: `Received finished pieces for MO ${order.orderNumber}`,
        createdAt: now
      })

      // 5. Update Karigar Fine Balance
      mfgRepo.updateKarigarBalances(karigar.id, -fineDeduction, 0, now)

      // 6. Recalculate Order and check for completion
      this.recalculateOrderTotals(order.id, now)
    })

    execute()
    return receiptRecord
  },

  // ===================== 6. KARIGAR SETTLEMENT =====================

  settleKarigar(payload: KarigarSettlementPayload): KarigarSettlementRecord {
    const db = getDatabase()
    const karigar = this.getKarigarById(payload.karigarId)

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const settlementDate = payload.settlementDate || dayjs().format('YYYY-MM-DD')
    const id = uuidv4()
    const settlementNumber = `STLM-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`

    const amountPaid = payload.amountPaid || 0
    const fineMetalSettled = payload.fineMetalSettled || 0

    const settlementRecord: KarigarSettlementRecord = {
      id,
      settlementNumber,
      karigarId: karigar.id,
      karigarName: karigar.name,
      settlementDate,
      settlementType: payload.settlementType,
      amountPaid,
      fineMetalSettled,
      paymentReference: payload.paymentReference || '',
      notes: payload.notes || '',
      createdAt: now
    }

    const execute = db.transaction(() => {
      mfgRepo.insertSettlement(settlementRecord)

      // Cash/Bank Payment: Post Debit (cashNave) to Account Ledger to reduce payable
      if (amountPaid > 0 && karigar.accountId) {
        accountLedgerRepo.insert({
          id: uuidv4(),
          sourceType: 'PAYMENT',
          sourceId: id,
          entryDate: settlementDate,
          accountId: karigar.accountId,
          metalType: 'OTHER',
          cashNave: amountPaid,
          narration: `Settlement ${settlementNumber} (${payload.settlementType})`,
          createdAt: now
        })
      }

      // Fine Metal Settlement
      if (fineMetalSettled !== 0) {
        const runningBalance = karigar.fineGoldBalance - fineMetalSettled
        mfgRepo.insertMetalLedgerEntry({
          id: uuidv4(),
          karigarId: karigar.id,
          karigarName: karigar.name,
          entryDate: settlementDate,
          metalType: 'GOLD',
          documentType: 'SETTLEMENT',
          documentId: id,
          documentNumber: settlementNumber,
          fineIssued: 0,
          fineReturned: 0,
          fineReceived: 0,
          approvedLoss: fineMetalSettled,
          runningFineBalance: runningBalance,
          narration: `Metal Settlement ${settlementNumber}`,
          createdAt: now
        })

        mfgRepo.updateKarigarBalances(karigar.id, -fineMetalSettled, 0, now)
      }
    })

    execute()
    return settlementRecord
  },

  // ===================== RECONCILIATION =====================

  getOrderReconciliation(orderId: string): ManufacturingReconciliationSummary {
    return mfgRepo.getOrderReconciliation(orderId)
  },

  recalculateOrderTotals(orderId: string, now: string): void {
    const recon = mfgRepo.getOrderReconciliation(orderId)
    const issues = mfgRepo.listIssuesByOrder(orderId)
    const totalIssuedGross = issues.reduce((acc, i) => acc + i.grossWeight, 0)
    const totalReceiptPcs = recon.receipts.reduce((acc, r) => acc + r.pcs, 0)

    mfgRepo.updateOrderReconciliation(
      orderId,
      totalIssuedGross,
      recon.totalFineIssued,
      recon.totalFineReturned,
      recon.totalFineReceived,
      recon.totalApprovedLoss,
      recon.unreconciledDifference,
      now
    )

    if (totalReceiptPcs >= recon.order.plannedPcs && recon.isReconciled) {
      mfgRepo.updateOrderStatus(orderId, 'COMPLETED', now)
    } else if (totalReceiptPcs > 0) {
      mfgRepo.updateOrderStatus(orderId, 'PARTIALLY_RECEIVED', now)
    }
  }
}
