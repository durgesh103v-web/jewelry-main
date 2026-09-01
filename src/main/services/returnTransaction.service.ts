import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import {
  ReturnRepository,
  SalesInvoiceRepository,
  PurchaseInvoiceRepository,
  AccountLedgerRepository,
  TransactionRepository,
  JewelleryStockItemRepository
} from '../database/repositories'
import { inventoryMovementService } from './inventoryMovement.service'
import { documentSequenceService } from './documentSequence.service'
import { consignmentService } from './consignment.service'
import { ValidationError, NotFoundError, BusinessRuleError } from '../ipc/errors'
import { roundNumber } from '../../shared/jewelleryFormula'
import type {
  ReturnRecord,
  ReturnableInvoiceItem,
  CreateReturnPayload,
  ReturnFilter,
  ReturnType
} from '../../shared/types/returnTransaction'

const returnRepository = new ReturnRepository()
const salesInvoiceRepository = new SalesInvoiceRepository()
const purchaseInvoiceRepository = new PurchaseInvoiceRepository()
const accountLedgerRepository = new AccountLedgerRepository()
const transactionRepository = new TransactionRepository()

const returnItemPayloadSchema = z.object({
  originalItemId: z.string().trim().min(1, 'Original item ID is required'),
  itemId: z.string().trim().min(1, 'Item ID is required'),
  description: z.string().optional().default(''),
  stampId: z.string().optional().default(''),
  designId: z.string().optional().default(''),
  barcode: z.string().optional().default(''),
  returnPcs: z.number().int().positive('Return pcs must be at least 1').default(1),
  grossWeight: z.number().positive('Return gross weight must be positive'),
  lessWeight: z.number().nonnegative().optional().default(0)
})

const returnRefundPayloadSchema = z.object({
  paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'CARD', 'CHEQUE', 'OTHER']).default('CASH'),
  amount: z.number().positive('Refund amount must be positive'),
  paymentReference: z.string().optional().default(''),
  notes: z.string().optional().default('')
})

const createReturnSchema = z.object({
  returnType: z.enum(['SALES_RETURN', 'PURCHASE_RETURN']),
  originalInvoiceId: z.string().trim().min(1, 'Original invoice ID is required'),
  returnDate: z.string().optional(),
  reason: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  items: z.array(returnItemPayloadSchema).min(1, 'At least one return item is required'),
  refunds: z.array(returnRefundPayloadSchema).optional().default([])
})

export const returnTransactionService = {
  /**
   * List return transactions with optional filtering
   */
  list(filter?: ReturnFilter): ReturnRecord[] {
    return returnRepository.findAll(filter)
  },

  /**
   * Get return by ID
   */
  getById(id: string): ReturnRecord {
    const record = returnRepository.findById(id)
    if (!record) {
      throw new NotFoundError(`Return transaction with ID ${id} not found`)
    }
    return record
  },

  /**
   * Get return by return number
   */
  getByNumber(returnNumber: string): ReturnRecord {
    const record = returnRepository.findByNumber(returnNumber)
    if (!record) {
      throw new NotFoundError(`Return transaction number ${returnNumber} not found`)
    }
    return record
  },

  /**
   * Get all returns for an original sales invoice
   */
  getBySalesInvoice(salesInvoiceId: string): ReturnRecord[] {
    return returnRepository.findBySalesInvoice(salesInvoiceId)
  },

  /**
   * Get all returns for an original purchase invoice
   */
  getByPurchaseInvoice(purchaseInvoiceId: string): ReturnRecord[] {
    return returnRepository.findByPurchaseInvoice(purchaseInvoiceId)
  },

  /**
   * Calculate returnable remaining quantities and historical item snapshots for an invoice
   */
  getReturnableItems(invoiceId: string, returnType: ReturnType): ReturnableInvoiceItem[] {
    const returnedMap = returnRepository.getReturnedItemsSummaryForInvoice(invoiceId, returnType)

    if (returnType === 'SALES_RETURN') {
      const invoice = salesInvoiceRepository.findById(invoiceId)
      if (!invoice) {
        throw new NotFoundError(`Sales invoice with ID ${invoiceId} not found`)
      }
      if (invoice.status === 'CANCELLED') {
        throw new BusinessRuleError(`Cannot create return against cancelled sales invoice ${invoice.invoiceNumber}`)
      }

      const items = invoice.items || []
      return items.map((it) => {
        const returned = returnedMap.get(it.id) || { returnedPcs: 0, returnedGrossWeight: 0 }
        const returnablePcs = Math.max(0, it.pcs - returned.returnedPcs)
        const returnableGrossWeight = Math.max(0, roundNumber(it.grossWeight - returned.returnedGrossWeight, 3))
        const pcsDiv = it.pcs > 0 ? it.pcs : 1

        return {
          invoiceItemId: it.id,
          itemId: it.itemId,
          itemName: it.itemName || it.description || 'Jewellery Item',
          itemCode: it.itemCode || undefined,
          description: it.description || undefined,
          stampId: it.stampId || undefined,
          designId: it.designId || undefined,
          barcode: it.barcode || undefined,
          metalType: it.metalType,
          purityName: it.purityName || undefined,
          tunch: it.tunch,
          wastage: it.wastage,
          goldRate: it.goldRate,
          labourRate: it.labourRate,
          labourRateType: it.labourRateType,
          originalPcs: it.pcs,
          returnedPcs: returned.returnedPcs,
          returnablePcs,
          originalGrossWeight: it.grossWeight,
          returnedGrossWeight: returned.returnedGrossWeight,
          returnableGrossWeight,
          originalNetWeight: it.netWeight,
          originalFineWeight: it.fineWeight,
          unitMetalValue: roundNumber(it.metalValue / pcsDiv, 2),
          unitMakingCharges: roundNumber(it.makingCharges / pcsDiv, 2),
          unitStoneCharges: roundNumber(it.stoneCharges / pcsDiv, 2),
          unitDiamondCharges: roundNumber(it.diamondCharges / pcsDiv, 2),
          unitDiscount: roundNumber(it.discountAmount / pcsDiv, 2),
          unitTax: roundNumber(it.taxAmount / pcsDiv, 2),
          unitLineTotal: roundNumber(it.lineTotal / pcsDiv, 2),
          taxPercent: it.taxPercent,
          pricingBreakdown: it.pricingBreakdown || undefined
        }
      })
    } else {
      const invoice = purchaseInvoiceRepository.findById(invoiceId)
      if (!invoice) {
        throw new NotFoundError(`Purchase invoice with ID ${invoiceId} not found`)
      }
      if (invoice.status === 'CANCELLED') {
        throw new BusinessRuleError(`Cannot create return against cancelled purchase invoice ${invoice.invoiceNumber}`)
      }

      const items = invoice.items || []
      return items.map((it) => {
        const returned = returnedMap.get(it.id) || { returnedPcs: 0, returnedGrossWeight: 0 }
        const returnablePcs = Math.max(0, it.pcs - returned.returnedPcs)
        const returnableGrossWeight = Math.max(0, roundNumber(it.grossWeight - returned.returnedGrossWeight, 3))
        const pcsDiv = it.pcs > 0 ? it.pcs : 1

        return {
          invoiceItemId: it.id,
          itemId: it.itemId,
          itemName: it.itemName || it.description || 'Jewellery Item',
          itemCode: it.itemCode || undefined,
          description: it.description || undefined,
          stampId: it.stampId || undefined,
          designId: it.designId || undefined,
          barcode: it.barcode || undefined,
          metalType: it.metalType,
          purityName: it.purityName || undefined,
          tunch: it.tunch,
          wastage: it.wastage,
          goldRate: it.goldRate,
          labourRate: it.labourRate,
          labourRateType: it.labourRateType,
          originalPcs: it.pcs,
          returnedPcs: returned.returnedPcs,
          returnablePcs,
          originalGrossWeight: it.grossWeight,
          returnedGrossWeight: returned.returnedGrossWeight,
          returnableGrossWeight,
          originalNetWeight: it.netWeight,
          originalFineWeight: it.fineWeight,
          unitMetalValue: roundNumber(it.metalValue / pcsDiv, 2),
          unitMakingCharges: roundNumber(it.makingCharges / pcsDiv, 2),
          unitStoneCharges: roundNumber(it.stoneCharges / pcsDiv, 2),
          unitDiamondCharges: roundNumber(it.diamondCharges / pcsDiv, 2),
          unitDiscount: roundNumber(it.discountAmount / pcsDiv, 2),
          unitTax: roundNumber(it.taxAmount / pcsDiv, 2),
          unitLineTotal: roundNumber(it.lineTotal / pcsDiv, 2),
          taxPercent: it.taxPercent,
          pricingBreakdown: it.pricingBreakdown || undefined
        }
      })
    }
  },

  /**
   * Create and execute a canonical return transaction atomically
   */
  create(payload: CreateReturnPayload): ReturnRecord {
    const data = createReturnSchema.parse(payload)

    const returnableItems = this.getReturnableItems(data.originalInvoiceId, data.returnType)
    const returnableMap = new Map<string, ReturnableInvoiceItem>()
    for (const r of returnableItems) {
      returnableMap.set(r.invoiceItemId, r)
    }

    const returnId = uuidv4()
    const returnDate = data.returnDate || dayjs().format('YYYY-MM-DD')
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    return transactionRepository.executeAtomic(() => {
      // 1. Resolve Original Invoice Header Info
      let originalInvoiceNumber = ''
      let customerId: string | null = null
      let supplierId: string | null = null
      let accountId = ''
      let noteType: 'CREDIT_NOTE' | 'DEBIT_NOTE' = 'CREDIT_NOTE'
      let documentSequenceType: 'SALE_RETURN' | 'PURCHASE_RETURN' = 'SALE_RETURN'

      if (data.returnType === 'SALES_RETURN') {
        const salesInv = salesInvoiceRepository.findById(data.originalInvoiceId)
        if (!salesInv) {
          throw new NotFoundError(`Sales invoice ${data.originalInvoiceId} not found`)
        }
        originalInvoiceNumber = salesInv.invoiceNumber
        customerId = salesInv.customerId || null
        accountId = salesInv.accountId
        noteType = 'CREDIT_NOTE'
        documentSequenceType = 'SALE_RETURN'
      } else {
        const purchInv = purchaseInvoiceRepository.findById(data.originalInvoiceId)
        if (!purchInv) {
          throw new NotFoundError(`Purchase invoice ${data.originalInvoiceId} not found`)
        }
        originalInvoiceNumber = purchInv.invoiceNumber
        supplierId = purchInv.supplierId || null
        accountId = purchInv.accountId
        noteType = 'DEBIT_NOTE'
        documentSequenceType = 'PURCHASE_RETURN'
      }

      const returnNumber = documentSequenceService.getNextNumber(documentSequenceType)

      // 2. Validate Items & Preserve Historical Pricing Proportions
      let totalPcs = 0
      let totalGrossWeight = 0
      let totalNetWeight = 0
      let totalFineWeight = 0
      let subtotal = 0
      let totalDiscount = 0
      let totalTaxable = 0
      let totalTax = 0
      let returnTotal = 0

      const calculatedItems: any[] = []

      for (const line of data.items) {
        const orig = returnableMap.get(line.originalItemId)
        if (!orig) {
          throw new ValidationError(`Item ${line.originalItemId} does not belong to original invoice ${originalInvoiceNumber}`)
        }

        if (line.returnPcs > orig.returnablePcs) {
          throw new BusinessRuleError(
            `Cannot return ${line.returnPcs} pcs for "${orig.itemName}". Only ${orig.returnablePcs} pcs available to return.`
          )
        }

        if (line.grossWeight > roundNumber(orig.returnableGrossWeight + 0.001, 3)) {
          throw new BusinessRuleError(
            `Cannot return ${line.grossWeight}g for "${orig.itemName}". Maximum returnable weight is ${orig.returnableGrossWeight}g.`
          )
        }

        // Proportional net & fine weight from original item
        const weightRatio = orig.originalGrossWeight > 0 ? line.grossWeight / orig.originalGrossWeight : 1
        const lineNetWeight = roundNumber(orig.originalNetWeight * weightRatio, 3)
        const lineFineWeight = roundNumber(orig.originalFineWeight * weightRatio, 3)

        // Historical proportional valuation
        const lineMetalValue = roundNumber(orig.unitMetalValue * line.returnPcs, 2)
        const lineMaking = roundNumber(orig.unitMakingCharges * line.returnPcs, 2)
        const lineStone = roundNumber(orig.unitStoneCharges * line.returnPcs, 2)
        const lineDiamond = roundNumber(orig.unitDiamondCharges * line.returnPcs, 2)
        const lineDiscount = roundNumber(orig.unitDiscount * line.returnPcs, 2)
        const lineTaxable = roundNumber(lineMetalValue + lineMaking + lineStone + lineDiamond - lineDiscount, 2)
        const lineTax = roundNumber(orig.unitTax * line.returnPcs, 2)
        const lineTotal = roundNumber(lineTaxable + lineTax, 2)

        totalPcs += line.returnPcs
        totalGrossWeight = roundNumber(totalGrossWeight + line.grossWeight, 3)
        totalNetWeight = roundNumber(totalNetWeight + lineNetWeight, 3)
        totalFineWeight = roundNumber(totalFineWeight + lineFineWeight, 3)
        subtotal = roundNumber(subtotal + lineMetalValue + lineMaking + lineStone + lineDiamond, 2)
        totalDiscount = roundNumber(totalDiscount + lineDiscount, 2)
        totalTaxable = roundNumber(totalTaxable + lineTaxable, 2)
        totalTax = roundNumber(totalTax + lineTax, 2)
        returnTotal = roundNumber(returnTotal + lineTotal, 2)

        const itemId = uuidv4()
        calculatedItems.push({
          id: itemId,
          returnId,
          originalItemId: line.originalItemId,
          itemId: line.itemId,
          description: line.description || orig.description || orig.itemName,
          stampId: line.stampId || orig.stampId || null,
          designId: line.designId || orig.designId || null,
          barcode: line.barcode || orig.barcode || null,
          returnPcs: line.returnPcs,
          grossWeight: line.grossWeight,
          packWeight: 0,
          lessWeight: line.lessWeight || 0,
          addWeight: 0,
          netWeight: lineNetWeight,
          metalType: orig.metalType,
          purityName: orig.purityName || '',
          tunch: orig.tunch,
          wastage: orig.wastage,
          fineWeight: lineFineWeight,
          goldRate: orig.goldRate,
          metalValue: lineMetalValue,
          labourRate: orig.labourRate,
          labourRateType: orig.labourRateType,
          makingCharges: lineMaking,
          stoneCharges: lineStone,
          diamondCharges: lineDiamond,
          discountAmount: lineDiscount,
          taxableAmount: lineTaxable,
          taxPercent: orig.taxPercent,
          taxAmount: lineTax,
          lineTotal,
          pricingBreakdown: orig.pricingBreakdown || '',
          createdAt: now,
          updatedAt: now
        })
      }

      // 3. Process Immediate Refunds
      let refundAmount = 0
      const calculatedRefunds: any[] = []

      for (const ref of data.refunds) {
        if (ref.amount > 0) {
          const refId = uuidv4()
          refundAmount = roundNumber(refundAmount + ref.amount, 2)
          calculatedRefunds.push({
            id: refId,
            returnId,
            paymentMethod: ref.paymentMethod,
            amount: ref.amount,
            paymentReference: ref.paymentReference || '',
            refundDate: returnDate,
            notes: ref.notes || '',
            createdAt: now,
            updatedAt: now
          })
        }
      }

      const adjustmentAmount = Math.max(0, roundNumber(returnTotal - refundAmount, 2))

      // 4. Create Return Transaction Header
      returnRepository.insertHeader({
        id: returnId,
        returnNumber,
        returnType: data.returnType,
        noteType,
        originalSalesInvoiceId: data.returnType === 'SALES_RETURN' ? data.originalInvoiceId : null,
        originalPurchaseInvoiceId: data.returnType === 'PURCHASE_RETURN' ? data.originalInvoiceId : null,
        originalInvoiceNumber,
        customerId,
        supplierId,
        accountId,
        returnDate,
        metalType: calculatedItems[0]?.metalType || 'Gold',
        totalPcs,
        grossWeight: totalGrossWeight,
        netWeight: totalNetWeight,
        fineWeight: totalFineWeight,
        subtotal,
        discountAmount: totalDiscount,
        taxableAmount: totalTaxable,
        taxAmount: totalTax,
        roundOff: 0,
        returnTotal,
        refundAmount,
        adjustmentAmount,
        status: 'COMPLETED',
        reason: data.reason || '',
        notes: data.notes || '',
        createdBy: 'SYSTEM',
        createdAt: now,
        updatedAt: now
      })

      // 5. Insert Return Items & Inventory Movements
      for (const item of calculatedItems) {
        returnRepository.insertItem(item)

        if (data.returnType === 'SALES_RETURN') {
          // Stock comes back IN
          inventoryMovementService.postMovement({
            sourceType: 'SALE_RETURN',
            sourceId: returnId,
            itemId: item.itemId,
            stampId: item.stampId,
            designId: item.designId,
            metalType: item.metalType,
            pcsDelta: Math.abs(item.returnPcs),
            grossWeightDelta: Math.abs(item.grossWeight),
            netWeightDelta: Math.abs(item.netWeight),
            fineDelta: Math.abs(item.fineWeight),
            entryDate: returnDate,
            narration: `Sales Return ${returnNumber} against ${originalInvoiceNumber}`
          })

          // Handle physical stock / consignment customer return
          if (item.barcode) {
            const stockItemRepo = new JewelleryStockItemRepository()
            const stockItem = stockItemRepo.findByIdentifier(item.barcode)
            if (stockItem) {
              consignmentService.processCustomerReturn(stockItem.id, returnId, returnNumber)
            }
          }
        } else {
          // Stock goes back OUT to supplier
          inventoryMovementService.postMovement({
            sourceType: 'PURCHASE_RETURN',
            sourceId: returnId,
            itemId: item.itemId,
            stampId: item.stampId,
            designId: item.designId,
            metalType: item.metalType,
            pcsDelta: -Math.abs(item.returnPcs),
            grossWeightDelta: -Math.abs(item.grossWeight),
            netWeightDelta: -Math.abs(item.netWeight),
            fineDelta: -Math.abs(item.fineWeight),
            entryDate: returnDate,
            narration: `Purchase Return ${returnNumber} against ${originalInvoiceNumber}`
          })
        }
      }

      // 6. Insert Refunds
      for (const refund of calculatedRefunds) {
        returnRepository.insertRefund(refund)
      }

      // 7. Double-Entry Accounting Ledger Postings
      if (data.returnType === 'SALES_RETURN') {
        // Customer Credit Note (Credit to Customer: cashJama = returnTotal)
        accountLedgerRepository.insert({
          id: uuidv4(),
          sourceType: 'SALES_RETURN',
          sourceId: returnId,
          entryDate: returnDate,
          accountId,
          metalType: calculatedItems[0]?.metalType || 'Gold',
          cashJama: returnTotal,
          narration: `Sales Return & Credit Note ${returnNumber} (Ref Invoice: ${originalInvoiceNumber})`,
          createdAt: now
        })

        // Immediate Refund paid to Customer (Debit Outflow: cashNave / bankNave)
        for (const ref of calculatedRefunds) {
          const isBank = ref.paymentMethod === 'BANK' || ref.paymentMethod === 'UPI' || ref.paymentMethod === 'CARD' || ref.paymentMethod === 'CHEQUE'
          accountLedgerRepository.insert({
            id: uuidv4(),
            sourceType: 'SALES_RETURN',
            sourceId: returnId,
            entryDate: returnDate,
            accountId,
            metalType: calculatedItems[0]?.metalType || 'Gold',
            cashNave: !isBank ? ref.amount : 0,
            bankNave: isBank ? ref.amount : 0,
            narration: `Refund for Sales Return ${returnNumber} via ${ref.paymentMethod}${ref.paymentReference ? ` (${ref.paymentReference})` : ''}`,
            createdAt: now
          })
        }
      } else {
        // Supplier Debit Note (Debit to Supplier: cashNave = returnTotal)
        accountLedgerRepository.insert({
          id: uuidv4(),
          sourceType: 'PURCHASE_RETURN',
          sourceId: returnId,
          entryDate: returnDate,
          accountId,
          metalType: calculatedItems[0]?.metalType || 'Gold',
          cashNave: returnTotal,
          narration: `Purchase Return & Debit Note ${returnNumber} (Ref Invoice: ${originalInvoiceNumber})`,
          createdAt: now
        })

        // Immediate Refund received from Supplier (Credit Inflow: cashJama / bankJama)
        for (const ref of calculatedRefunds) {
          const isBank = ref.paymentMethod === 'BANK' || ref.paymentMethod === 'UPI' || ref.paymentMethod === 'CARD' || ref.paymentMethod === 'CHEQUE'
          accountLedgerRepository.insert({
            id: uuidv4(),
            sourceType: 'PURCHASE_RETURN',
            sourceId: returnId,
            entryDate: returnDate,
            accountId,
            metalType: calculatedItems[0]?.metalType || 'Gold',
            cashJama: !isBank ? ref.amount : 0,
            bankJama: isBank ? ref.amount : 0,
            narration: `Refund received for Purchase Return ${returnNumber} via ${ref.paymentMethod}${ref.paymentReference ? ` (${ref.paymentReference})` : ''}`,
            createdAt: now
          })
        }
      }

      const result = returnRepository.findById(returnId)
      if (!result) {
        throw new Error('Failed to retrieve created return transaction')
      }
      return result
    })
  },

  /**
   * Cancel return transaction and cleanly reverse stock & ledger postings
   */
  cancel(id: string): ReturnRecord {
    const ret = returnRepository.findById(id)
    if (!ret) {
      throw new NotFoundError(`Return transaction with ID ${id} not found`)
    }

    if (ret.status === 'CANCELLED') {
      throw new BusinessRuleError(`Return transaction ${ret.returnNumber} is already cancelled`)
    }

    return transactionRepository.executeAtomic(() => {
      // 1. Update status
      returnRepository.updateStatus(id, 'CANCELLED')

      // 2. Revert Stock Movement
      const sourceType = ret.returnType === 'SALES_RETURN' ? 'SALE_RETURN' : 'PURCHASE_RETURN'
      inventoryMovementService.revertMovement(sourceType, id)

      // 3. Revert Ledger Postings
      accountLedgerRepository.deleteBySource(ret.returnType, id)

      const updated = returnRepository.findById(id)
      if (!updated) {
        throw new Error('Failed to retrieve cancelled return transaction')
      }
      return updated
    })
  },

  /**
   * Soft delete return transaction
   */
  delete(id: string): { success: boolean } {
    const ret = returnRepository.findById(id)
    if (!ret) {
      throw new NotFoundError(`Return transaction with ID ${id} not found`)
    }

    if (ret.status === 'COMPLETED') {
      throw new BusinessRuleError(
        `Cannot delete completed return ${ret.returnNumber}. Cancel it first.`
      )
    }

    returnRepository.softDelete(id)
    return { success: true }
  }
}
