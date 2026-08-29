import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import {
  PurchaseInvoiceRepository,
  AccountRepository,
  SupplierRepository,
  AccountLedgerRepository,
  TransactionRepository,
  ItemRepository
} from '../database/repositories'
import { pricingService } from './pricing.service'
import { inventoryMovementService } from './inventoryMovement.service'
import { documentSequenceService } from './documentSequence.service'
import { ValidationError, NotFoundError, BusinessRuleError } from '../ipc/errors'
import { roundNumber } from '../../shared/jewelleryFormula'
import type {
  PurchaseInvoiceRecord,
  PurchaseInvoicePayload,
  PurchaseInvoiceFilter
} from '../../shared/types/purchaseInvoice'

const purchaseInvoiceRepository = new PurchaseInvoiceRepository()
const accountRepository = new AccountRepository()
const supplierRepository = new SupplierRepository()
const accountLedgerRepository = new AccountLedgerRepository()
const transactionRepository = new TransactionRepository()
const itemRepository = new ItemRepository()

const purchaseItemSchema = z.object({
  itemId: z.string().trim().min(1, 'Item ID is required'),
  description: z.string().optional().default(''),
  stampId: z.string().optional().default(''),
  designId: z.string().optional().default(''),
  barcode: z.string().optional().default(''),
  pcs: z.number().int().positive('Pcs must be at least 1').default(1),
  grossWeight: z.number().positive('Gross weight must be positive'),
  packWeight: z.number().nonnegative().optional().default(0),
  lessWeight: z.number().nonnegative().optional().default(0),
  addWeight: z.number().nonnegative().optional().default(0),
  metalType: z.string().optional().default('Gold'),
  purityName: z.string().optional().default(''),
  tunch: z.number().min(0).max(100).optional().default(100),
  wastage: z.number().nonnegative().optional().default(0),
  goldRate: z.number().nonnegative().optional().default(0),
  labourRate: z.number().nonnegative().optional().default(0),
  labourRateType: z.enum(['Kg', 'Gm', 'Pcs']).optional().default('Kg'),
  stoneCharges: z.number().nonnegative().optional().default(0),
  diamondCharges: z.number().nonnegative().optional().default(0),
  discountAmount: z.number().nonnegative().optional().default(0),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  taxPercent: z.number().min(0).max(100).optional().default(0)
})

const purchasePaymentSchema = z.object({
  paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'CARD', 'CHEQUE', 'OTHER']).default('CASH'),
  amount: z.number().positive('Payment amount must be positive'),
  paymentReference: z.string().optional().default(''),
  notes: z.string().optional().default('')
})

const purchaseInvoiceSchema = z.object({
  supplierId: z.string().optional(),
  accountId: z.string().trim().min(1, 'Account ID is required'),
  supplierInvoiceNumber: z.string().optional().default(''),
  invoiceDate: z.string().optional(),
  metalType: z.string().optional().default('Gold'),
  notes: z.string().optional().default(''),
  items: z.array(purchaseItemSchema).min(1, 'At least one purchase item is required'),
  payments: z.array(purchasePaymentSchema).optional().default([])
})

export const purchaseInvoiceService = {
  /**
   * List purchase invoices with optional filters
   */
  list(filter?: PurchaseInvoiceFilter): PurchaseInvoiceRecord[] {
    return purchaseInvoiceRepository.findAll(filter)
  },

  /**
   * Get purchase invoice by ID
   */
  getById(id: string): PurchaseInvoiceRecord {
    const invoice = purchaseInvoiceRepository.findById(id)
    if (!invoice) {
      throw new NotFoundError(`Purchase invoice with ID ${id} not found`)
    }
    return invoice
  },

  /**
   * Get purchase invoice by number
   */
  getByNumber(invoiceNumber: string): PurchaseInvoiceRecord {
    const invoice = purchaseInvoiceRepository.findByNumber(invoiceNumber)
    if (!invoice) {
      throw new NotFoundError(`Purchase invoice number ${invoiceNumber} not found`)
    }
    return invoice
  },

  /**
   * Generate next purchase invoice number preview
   */
  getNextNumber(): string {
    return documentSequenceService.getNextNumber('PURCHASE')
  },

  /**
   * Create and finalize a complete purchase invoice atomically
   */
  create(payload: PurchaseInvoicePayload): PurchaseInvoiceRecord {
    const data = purchaseInvoiceSchema.parse(payload)

    // 1. Validate Supplier / Account
    const account = accountRepository.findById(data.accountId)
    if (!account) {
      throw new ValidationError(`Account with ID ${data.accountId} does not exist`)
    }

    if (data.supplierId) {
      const supplier = supplierRepository.findById(data.supplierId)
      if (!supplier) {
        throw new ValidationError(`Supplier with ID ${data.supplierId} does not exist`)
      }
      if (!supplier.active) {
        throw new BusinessRuleError(`Supplier "${supplier.name}" is inactive`)
      }

      // Check duplicate supplier invoice number if provided
      if (data.supplierInvoiceNumber && data.supplierInvoiceNumber.trim()) {
        const existing = purchaseInvoiceRepository.findBySupplierInvoice(
          data.supplierId,
          data.supplierInvoiceNumber.trim()
        )
        if (existing) {
          throw new BusinessRuleError(
            `Supplier invoice "${data.supplierInvoiceNumber}" already exists under purchase ${existing.invoiceNumber}`
          )
        }
      }
    }

    const invoiceId = uuidv4()
    const invoiceDate = data.invoiceDate || dayjs().format('YYYY-MM-DD')
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    return transactionRepository.executeAtomic(() => {
      const invoiceNumber = documentSequenceService.getNextNumber('PURCHASE')

      let totalPcs = 0
      let totalGrossWeight = 0
      let totalNetWeight = 0
      let totalFineWeight = 0
      let subtotal = 0
      let totalDiscount = 0
      let totalTaxable = 0
      let totalTax = 0
      let grandTotal = 0

      const calculatedItems: any[] = []

      // 2. Process and Calculate Each Purchase Item
      for (const line of data.items) {
        const itemMeta = itemRepository.findById(line.itemId)
        if (!itemMeta) {
          throw new NotFoundError(`Inventory item with ID ${line.itemId} not found`)
        }

        const pricingRes = pricingService.calculate({
          metalType: line.metalType || data.metalType || 'Gold',
          purityName: line.purityName,
          tunch: line.tunch ?? 100,
          wastage: line.wastage ?? 0,
          pcs: line.pcs,
          grossWeight: line.grossWeight,
          packWeight: line.packWeight || 0,
          lessWeight: line.lessWeight || 0,
          addWeight: line.addWeight || 0,
          labourRate: line.labourRate ?? 0,
          labourRateType: line.labourRateType || 'Kg',
          ratePerGram: line.goldRate,
          rateDate: invoiceDate,
          stoneCharges: line.stoneCharges
            ? [{ stoneName: 'STONE', pcs: 1, carat: 0, weightGm: 0, ratePerUnit: line.stoneCharges, unit: 'Pcs' }]
            : [],
          diamondCharges: line.diamondCharges
            ? [{ diamondDescription: 'DIAMOND', carat: 1, ratePerCarat: line.diamondCharges, clarity: '', color: '' }]
            : [],
          discountAmount: line.discountAmount,
          discountPercent: line.discountPercent,
          taxPercent: line.taxPercent
        })

        const itemLineTotal = pricingRes.total.finalAmount
        const itemNetWeight = pricingRes.weights.netWeight
        const itemFineWeight = pricingRes.weights.fineWeight
        const itemMetalValue = pricingRes.metal.metalValue
        const itemMaking = pricingRes.charges.making
        const itemTaxable = pricingRes.tax.taxableAmount
        const itemTaxAmount = pricingRes.tax.taxAmount
        const itemDiscountAmt = pricingRes.discount.amount

        totalPcs += line.pcs
        totalGrossWeight = roundNumber(totalGrossWeight + line.grossWeight, 3)
        totalNetWeight = roundNumber(totalNetWeight + itemNetWeight, 3)
        totalFineWeight = roundNumber(totalFineWeight + itemFineWeight, 3)
        subtotal = roundNumber(subtotal + itemMetalValue + pricingRes.charges.totalCharges, 2)
        totalDiscount = roundNumber(totalDiscount + itemDiscountAmt, 2)
        totalTaxable = roundNumber(totalTaxable + itemTaxable, 2)
        totalTax = roundNumber(totalTax + itemTaxAmount, 2)
        grandTotal = roundNumber(grandTotal + itemLineTotal, 2)

        const itemId = uuidv4()
        calculatedItems.push({
          id: itemId,
          invoiceId,
          itemId: line.itemId,
          description: line.description || itemMeta.item_name,
          stampId: line.stampId || itemMeta.default_stamp_id,
          designId: line.designId || itemMeta.default_design_id,
          barcode: line.barcode || null,
          pcs: line.pcs,
          grossWeight: line.grossWeight,
          packWeight: line.packWeight || 0,
          lessWeight: line.lessWeight || 0,
          addWeight: line.addWeight || 0,
          netWeight: itemNetWeight,
          metalType: line.metalType || data.metalType || 'Gold',
          purityName: line.purityName || '',
          tunch: line.tunch ?? 100,
          wastage: line.wastage ?? 0,
          fineWeight: itemFineWeight,
          goldRate: pricingRes.metal.ratePerGram,
          metalValue: itemMetalValue,
          labourRate: line.labourRate ?? 0,
          labourRateType: line.labourRateType || 'Kg',
          makingCharges: itemMaking,
          stoneCharges: line.stoneCharges || 0,
          diamondCharges: line.diamondCharges || 0,
          discountAmount: itemDiscountAmt,
          taxableAmount: itemTaxable,
          taxPercent: line.taxPercent || 0,
          taxAmount: itemTaxAmount,
          lineTotal: itemLineTotal,
          pricingBreakdown: JSON.stringify(pricingRes.breakdown),
          createdAt: now,
          updatedAt: now
        })
      }

      // 3. Process Payments
      let totalPaid = 0
      const calculatedPayments: any[] = []

      for (const p of data.payments) {
        if (p.amount > 0) {
          const paymentId = uuidv4()
          totalPaid = roundNumber(totalPaid + p.amount, 2)
          calculatedPayments.push({
            id: paymentId,
            invoiceId,
            paymentMethod: p.paymentMethod,
            amount: p.amount,
            paymentReference: p.paymentReference || '',
            paymentDate: invoiceDate,
            notes: p.notes || '',
            createdAt: now,
            updatedAt: now
          })
        }
      }

      const balanceDue = Math.max(0, roundNumber(grandTotal - totalPaid, 2))

      // 4. Create Purchase Invoice Header
      purchaseInvoiceRepository.insertHeader({
        id: invoiceId,
        invoiceNumber,
        supplierId: data.supplierId || null,
        accountId: data.accountId,
        supplierInvoiceNumber: data.supplierInvoiceNumber || '',
        invoiceDate,
        metalType: data.metalType || 'Gold',
        totalPcs,
        grossWeight: totalGrossWeight,
        netWeight: totalNetWeight,
        fineWeight: totalFineWeight,
        subtotal,
        discountAmount: totalDiscount,
        taxableAmount: totalTaxable,
        taxAmount: totalTax,
        roundOff: 0,
        grandTotal,
        paidAmount: totalPaid,
        balanceDue,
        pricingSnapshot: JSON.stringify({
          subtotal,
          totalDiscount,
          totalTaxable,
          totalTax,
          grandTotal,
          totalPaid,
          balanceDue
        }),
        status: 'COMPLETED',
        notes: data.notes || '',
        createdBy: 'SYSTEM',
        createdAt: now,
        updatedAt: now
      })

      // 5. Insert Item Rows & Stock Inward Movements
      for (const item of calculatedItems) {
        purchaseInvoiceRepository.insertItem(item)

        // Positive stock movement (INWARD)
        inventoryMovementService.postMovement({
          sourceType: 'PURCHASE',
          sourceId: invoiceId,
          itemId: item.itemId,
          stampId: item.stampId,
          designId: item.designId,
          metalType: item.metalType,
          pcsDelta: Math.abs(item.pcs),
          grossWeightDelta: Math.abs(item.grossWeight),
          netWeightDelta: Math.abs(item.netWeight),
          fineDelta: Math.abs(item.fineWeight),
          entryDate: invoiceDate,
          narration: `Inward from Purchase ${invoiceNumber}`
        })
      }

      // 6. Insert Payments
      for (const payment of calculatedPayments) {
        purchaseInvoiceRepository.insertPayment(payment)
      }

      // 7. Post Double-Entry Account Ledger
      // Supplier Payable Credit (cashJama = grandTotal)
      accountLedgerRepository.insert({
        id: uuidv4(),
        sourceType: 'PURCHASE_INVOICE',
        sourceId: invoiceId,
        entryDate: invoiceDate,
        accountId: data.accountId,
        metalType: data.metalType,
        cashJama: grandTotal,
        narration: `Purchase Invoice ${invoiceNumber}${data.supplierInvoiceNumber ? ` (Ref: ${data.supplierInvoiceNumber})` : ''}`,
        createdAt: now
      })

      // Payment Credits / Outflow (Debit to Supplier Account: cashNave / bankNave)
      for (const payment of calculatedPayments) {
        const isBank = payment.paymentMethod === 'BANK' || payment.paymentMethod === 'UPI' || payment.paymentMethod === 'CARD' || payment.paymentMethod === 'CHEQUE'
        accountLedgerRepository.insert({
          id: uuidv4(),
          sourceType: 'PURCHASE_INVOICE',
          sourceId: invoiceId,
          entryDate: invoiceDate,
          accountId: data.accountId,
          metalType: data.metalType,
          cashNave: !isBank ? payment.amount : 0,
          bankNave: isBank ? payment.amount : 0,
          narration: `Payment for Purchase ${invoiceNumber} via ${payment.paymentMethod}${payment.paymentReference ? ` (${payment.paymentReference})` : ''}`,
          createdAt: now
        })
      }

      const result = purchaseInvoiceRepository.findById(invoiceId)
      if (!result) {
        throw new Error('Failed to retrieve created purchase invoice')
      }
      return result
    })
  },

  /**
   * Cancel a completed purchase invoice and cleanly reverse stock & ledger
   */
  cancel(id: string): PurchaseInvoiceRecord {
    const invoice = purchaseInvoiceRepository.findById(id)
    if (!invoice) {
      throw new NotFoundError(`Purchase invoice with ID ${id} not found`)
    }

    if (invoice.status === 'CANCELLED') {
      throw new BusinessRuleError(`Purchase invoice ${invoice.invoiceNumber} is already cancelled`)
    }

    return transactionRepository.executeAtomic(() => {
      // 1. Update Status
      purchaseInvoiceRepository.updateStatus(id, 'CANCELLED')

      // 2. Revert Stock Movement
      inventoryMovementService.revertMovement('PURCHASE', id)

      // 3. Revert Ledger Postings
      accountLedgerRepository.deleteBySource('PURCHASE_INVOICE', id)

      const updated = purchaseInvoiceRepository.findById(id)
      if (!updated) {
        throw new Error('Failed to retrieve cancelled purchase invoice')
      }
      return updated
    })
  },

  /**
   * Soft delete purchase invoice
   */
  delete(id: string): { success: boolean } {
    const invoice = purchaseInvoiceRepository.findById(id)
    if (!invoice) {
      throw new NotFoundError(`Purchase invoice with ID ${id} not found`)
    }

    if (invoice.status === 'COMPLETED') {
      throw new BusinessRuleError(
        `Cannot delete completed purchase invoice ${invoice.invoiceNumber}. Cancel it first.`
      )
    }

    purchaseInvoiceRepository.softDelete(id)
    return { success: true }
  }
}
