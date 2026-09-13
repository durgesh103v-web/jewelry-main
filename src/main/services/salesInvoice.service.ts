import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { SalesInvoiceRepository } from '../database/repositories/SalesInvoiceRepository'
import { CustomerOrderRepository } from '../database/repositories/CustomerOrderRepository'
import { CustomerRepository } from '../database/repositories/CustomerRepository'
import { AccountRepository } from '../database/repositories/AccountRepository'
import { ItemRepository } from '../database/repositories/ItemRepository'
import { AdvanceRepository } from '../database/repositories/AdvanceRepository'
import { MetalExchangeRepository } from '../database/repositories/MetalExchangeRepository'
import { AccountLedgerRepository } from '../database/repositories/AccountLedgerRepository'
import { TransactionRepository } from '../database/repositories/TransactionRepository'
import { documentSequenceService } from './documentSequence.service'
import { pricingService } from './pricing.service'
import { inventoryMovementService } from './inventoryMovement.service'
import { ValidationError, NotFoundError } from '../ipc/errors'
import type {
  SalesInvoiceRecord,
  SalesInvoicePayload,
  SalesInvoiceFilter
} from '../../shared/types/salesInvoice'
import type { CustomerOrderRecord } from '../../shared/types/customerOrder'
import { JewelleryStockItemRepository } from '../database/repositories/JewelleryStockItemRepository'
import { consignmentService } from './consignment.service'
import { roundNumber } from '../../shared/jewelleryFormula'

const salesInvoiceRepository = new SalesInvoiceRepository()
const orderRepository = new CustomerOrderRepository()
const customerRepository = new CustomerRepository()
const accountRepository = new AccountRepository()
const itemRepository = new ItemRepository()
const advanceRepository = new AdvanceRepository()
const exchangeRepository = new MetalExchangeRepository()
const accountLedgerRepository = new AccountLedgerRepository()
const transactionRepository = new TransactionRepository()
const stockItemRepository = new JewelleryStockItemRepository()

const invoiceItemSchema = z.object({
  itemId: z.string().trim().min(1, 'Item is required'),
  description: z.string().trim().optional().default(''),
  stampId: z.string().trim().optional().default(''),
  designId: z.string().trim().optional().default(''),
  barcode: z.string().trim().optional().default(''),
  huid: z.string().trim().optional().default(''),
  pcs: z.coerce.number().int().positive('Pieces must be greater than 0'),
  grossWeight: z.coerce.number().positive('Gross weight must be greater than 0'),
  packWeight: z.coerce.number().optional().default(0),
  lessWeight: z.coerce.number().optional().default(0),
  addWeight: z.coerce.number().optional().default(0),
  metalType: z.string().trim().optional().default('Gold'),
  purityName: z.string().trim().optional().default(''),
  tunch: z.coerce.number().optional(),
  wastage: z.coerce.number().optional(),
  goldRate: z.coerce.number().optional().default(0),
  labourRate: z.coerce.number().optional(),
  labourRateType: z.enum(['Kg', 'Gm', 'Pcs']).optional().default('Kg'),
  makingDiscount: z.coerce.number().optional().default(0),
  stoneCharges: z.coerce.number().optional().default(0),
  diamondCharges: z.coerce.number().optional().default(0),
  diamondCarats: z.coerce.number().optional().default(0),
  diamondPcs: z.coerce.number().optional().default(0),
  stoneAmount: z.coerce.number().optional().default(0),
  discountAmount: z.coerce.number().optional().default(0),
  discountPercent: z.coerce.number().optional().default(0),
  taxPercent: z.coerce.number().optional().default(0)
})

const invoicePaymentSchema = z.object({
  paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'CARD', 'CHEQUE', 'OTHER']).default('CASH'),
  amount: z.coerce.number().positive('Payment amount must be greater than 0'),
  paymentReference: z.string().trim().optional().default(''),
  notes: z.string().trim().optional().default('')
})

const invoiceSchema = z.object({
  invoiceNumber: z.string().trim().optional().default(''),
  customerId: z.string().trim().optional().default(''),
  salespersonId: z.string().trim().optional().default(''),
  salespersonName: z.string().trim().optional().default(''),
  deliveryStatus: z.string().trim().optional().default('Delivered'),
  accountId: z.string().trim().min(1, 'Account is required'),
  orderId: z.string().trim().optional().default(''),
  invoiceDate: z.string().trim().optional().default(''),
  metalType: z.string().trim().optional().default('Gold'),
  notes: z.string().trim().optional().default(''),
  invoiceDiscount: z.coerce.number().optional().default(0),
  advanceIds: z.array(z.string().trim()).optional().default([]),
  metalExchangeIds: z.array(z.string().trim()).optional().default([]),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required on invoice'),
  payments: z.array(invoicePaymentSchema).optional().default([])
})

export const salesInvoiceService = {
  getNextInvoiceNumber(): string {
    return documentSequenceService.getNextNumber('SALE')
  },

  list(filter?: SalesInvoiceFilter): SalesInvoiceRecord[] {
    return salesInvoiceRepository.findAll(filter)
  },

  getById(id: string): SalesInvoiceRecord {
    const invoice = salesInvoiceRepository.findById(id)
    if (!invoice) {
      throw new NotFoundError('Sales invoice not found')
    }
    return invoice
  },

  getByNumber(number: string): SalesInvoiceRecord {
    const invoice = salesInvoiceRepository.findByNumber(number)
    if (!invoice) {
      throw new NotFoundError('Sales invoice not found')
    }
    return invoice
  },

  createInvoice(payload: SalesInvoicePayload, createdBy?: string): SalesInvoiceRecord {
    const parseResult = invoiceSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid sales invoice payload')
    }
    const data = parseResult.data

    const account = accountRepository.findById(data.accountId)
    if (!account) {
      throw new NotFoundError('Account not found')
    }

    let customerId = data.customerId || null
    if (!customerId) {
      const customer = customerRepository.findByAccountId(data.accountId)
      if (customer) {
        customerId = customer.id
      }
    }

    let linkedOrder: CustomerOrderRecord | null = null
    if (data.orderId) {
      const found = orderRepository.findById(data.orderId)
      if (!found) {
        throw new NotFoundError('Linked customer order not found')
      }
      if (found.accountId !== data.accountId) {
        throw new ValidationError('Order does not belong to the selected customer account')
      }
      linkedOrder = found
    }

    const invoiceId = uuidv4()
    const invoiceNumber = data.invoiceNumber || documentSequenceService.getNextNumber('SALE')
    const now = dayjs()
    const invoiceDate = data.invoiceDate || now.format('YYYY-MM-DD')
    const timestamp = now.format('YYYY-MM-DD HH:mm:ss')

    let totalPcs = 0
    let totalGrossWeight = 0
    let totalNetWeight = 0
    let totalFineWeight = 0
    let totalSubtotal = 0
    let totalDiscount = 0
    let totalTaxable = 0
    let totalTax = 0
    let grandTotal = 0

    const processedItems: any[] = []

    for (let i = 0; i < data.items.length; i++) {
      const line = data.items[i]
      const itemMaster = itemRepository.findById(line.itemId)

      const tunch = line.tunch !== undefined ? line.tunch : itemMaster?.default_tanch ?? 100
      const wastage = line.wastage !== undefined ? line.wastage : itemMaster?.default_wastage ?? 0
      const labourRate = line.labourRate !== undefined ? line.labourRate : itemMaster?.default_labour_rate ?? 0
      const labourRateType = (line.labourRateType || itemMaster?.labour_rate_type || 'Kg') as any

      const priceResult = pricingService.calculate({
        metalType: line.metalType || data.metalType || 'Gold',
        purityName: line.purityName,
        tunch,
        wastage,
        pcs: line.pcs,
        grossWeight: line.grossWeight,
        packWeight: line.packWeight,
        lessWeight: line.lessWeight,
        addWeight: line.addWeight,
        labourRate,
        labourRateType,
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

      const itemSubtotal = roundNumber(priceResult.metal.metalValue + priceResult.charges.totalCharges, 2)

      totalPcs += priceResult.weights.grossWeight > 0 ? line.pcs : 0
      totalGrossWeight = roundNumber(totalGrossWeight + priceResult.weights.grossWeight, 3)
      totalNetWeight = roundNumber(totalNetWeight + priceResult.weights.netWeight, 3)
      totalFineWeight = roundNumber(totalFineWeight + priceResult.weights.fineWeight, 3)
      totalSubtotal = roundNumber(totalSubtotal + itemSubtotal, 2)
      totalDiscount = roundNumber(totalDiscount + priceResult.discount.amount, 2)
      totalTaxable = roundNumber(totalTaxable + priceResult.tax.taxableAmount, 2)
      totalTax = roundNumber(totalTax + priceResult.tax.taxAmount, 2)
      grandTotal = roundNumber(grandTotal + priceResult.total.finalAmount, 2)

      processedItems.push({
        id: uuidv4(),
        invoiceId,
        itemId: line.itemId,
        description: line.description || itemMaster?.item_name || '',
        stampId: line.stampId || itemMaster?.default_stamp_id || null,
        designId: line.designId || itemMaster?.default_design_id || null,
        barcode: line.barcode || null,
        huid: line.huid || '',
        pcs: line.pcs,
        grossWeight: priceResult.weights.grossWeight,
        packWeight: priceResult.weights.packWeight,
        lessWeight: priceResult.weights.lessWeight,
        addWeight: priceResult.weights.addWeight,
        netWeight: priceResult.weights.netWeight,
        metalType: line.metalType || data.metalType || 'Gold',
        purityName: line.purityName || '',
        tunch: priceResult.purity.tunch,
        wastage: priceResult.purity.wastage,
        fineWeight: priceResult.weights.fineWeight,
        goldRate: priceResult.metal.ratePerGram,
        metalValue: priceResult.metal.metalValue,
        labourRate: priceResult.charges.labourRate,
        labourRateType: priceResult.charges.labourRateType,
        makingCharges: priceResult.charges.making,
        makingDiscount: line.makingDiscount || 0,
        stoneCharges: priceResult.charges.stoneTotal,
        diamondCharges: priceResult.charges.diamondTotal,
        diamondCarats: line.diamondCarats || 0,
        diamondPcs: line.diamondPcs || 0,
        stoneAmount: line.stoneAmount || 0,
        discountAmount: priceResult.discount.amount,
        taxableAmount: priceResult.tax.taxableAmount,
        taxPercent: priceResult.tax.taxPercent,
        taxAmount: priceResult.tax.taxAmount,
        lineTotal: priceResult.total.finalAmount,
        pricingBreakdown: priceResult.breakdown.join(' | '),
        createdAt: timestamp,
        updatedAt: timestamp
      })
    }

    // Advance Calculation
    let totalAdvanceApplied = 0
    if (data.advanceIds && data.advanceIds.length > 0) {
      for (const advId of data.advanceIds) {
        const adv = advanceRepository.findById(advId)
        if (adv && adv.status !== 'CANCELLED' && adv.status !== 'REFUNDED') {
          totalAdvanceApplied = roundNumber(totalAdvanceApplied + adv.unallocatedAmount, 2)
        }
      }
    } else if (data.orderId) {
      const orderAdvances = advanceRepository.findByOrder(data.orderId)
      for (const adv of orderAdvances) {
        if (adv.status !== 'CANCELLED' && adv.status !== 'REFUNDED') {
          totalAdvanceApplied = roundNumber(totalAdvanceApplied + adv.allocatedAmount, 2)
        }
      }
    }
    totalAdvanceApplied = Math.min(grandTotal, totalAdvanceApplied)

    // Old Gold Exchange Calculation
    let totalExchangeApplied = 0
    if (data.metalExchangeIds && data.metalExchangeIds.length > 0) {
      for (const exId of data.metalExchangeIds) {
        const ex = exchangeRepository.findById(exId)
        if (ex && ex.status !== 'CANCELLED') {
          totalExchangeApplied = roundNumber(totalExchangeApplied + ex.exchangeAmount, 2)
        }
      }
    }
    totalExchangeApplied = Math.min(roundNumber(grandTotal - totalAdvanceApplied, 2), totalExchangeApplied)

    // Payments Calculation
    const processedPayments: any[] = []
    let totalPaid = 0
    for (let i = 0; i < (data.payments || []).length; i++) {
      const p = data.payments![i]
      const amt = roundNumber(p.amount, 2)
      totalPaid = roundNumber(totalPaid + amt, 2)
      processedPayments.push({
        id: uuidv4(),
        invoiceId,
        paymentMethod: p.paymentMethod,
        amount: amt,
        paymentReference: p.paymentReference || '',
        paymentDate: invoiceDate,
        notes: p.notes || '',
        createdAt: timestamp,
        updatedAt: timestamp
      })
    }

    const invoiceDiscount = data.invoiceDiscount || 0
    const netPayable = Math.max(0, roundNumber(grandTotal - totalAdvanceApplied - totalExchangeApplied - invoiceDiscount, 2))
    const balanceDue = Math.max(0, roundNumber(netPayable - totalPaid, 2))

    const pricingSnapshot = JSON.stringify({
      itemCount: processedItems.length,
      totalPcs,
      totalGrossWeight,
      totalNetWeight,
      totalFineWeight,
      subtotal: totalSubtotal,
      discountAmount: totalDiscount,
      invoiceDiscount,
      taxableAmount: totalTaxable,
      taxAmount: totalTax,
      grandTotal,
      advanceAmount: totalAdvanceApplied,
      oldGoldExchangeAmount: totalExchangeApplied,
      netPayable,
      paidAmount: totalPaid,
      balanceDue,
      invoiceDate
    })

    transactionRepository.executeAtomic(() => {
      // 1. Insert invoice header
      salesInvoiceRepository.insertHeader({
        id: invoiceId,
        invoiceNumber,
        customerId,
        salespersonId: data.salespersonId || '',
        salespersonName: data.salespersonName || '',
        deliveryStatus: data.deliveryStatus || 'Delivered',
        accountId: data.accountId,
        orderId: data.orderId || null,
        invoiceDate,
        metalType: data.metalType,
        totalPcs,
        grossWeight: totalGrossWeight,
        netWeight: totalNetWeight,
        fineWeight: totalFineWeight,
        subtotal: totalSubtotal,
        discountAmount: totalDiscount,
        invoiceDiscount,
        taxableAmount: totalTaxable,
        taxAmount: totalTax,
        oldGoldExchangeAmount: totalExchangeApplied,
        advanceAmount: totalAdvanceApplied,
        roundOff: 0,
        grandTotal,
        paidAmount: totalPaid,
        balanceDue,
        pricingSnapshot,
        status: 'COMPLETED',
        notes: data.notes,
        createdBy: createdBy || null,
        createdAt: timestamp,
        updatedAt: timestamp
      })

      // 2. Insert items and post inventory movements
      for (const item of processedItems) {
        salesInvoiceRepository.insertItem(item)

        inventoryMovementService.postMovement({
          itemId: item.itemId,
          metalType: item.metalType,
          stampId: item.stampId,
          designId: item.designId,
          pcsDelta: -Math.abs(item.pcs),
          grossWeightDelta: -Math.abs(item.grossWeight),
          netWeightDelta: -Math.abs(item.netWeight),
          fineDelta: -Math.abs(item.fineWeight),
          sourceType: 'SALE',
          sourceId: invoiceId,
          entryDate: invoiceDate,
          narration: `Sale Invoice ${invoiceNumber}`
        })

        // 2b. If serialized physical stock / consignment item, transition status
        if (item.barcode) {
          const stockItem = stockItemRepository.findByIdentifier(item.barcode)
          if (stockItem) {
            if (stockItem.status === 'CONSIGNMENT') {
              consignmentService.processConsignmentSale(stockItem.id, invoiceId, invoiceNumber)
            } else if (stockItem.status === 'IN_STOCK') {
              stockItemRepository.updateStatus(stockItem.id, 'SOLD', timestamp)
              stockItemRepository.logTagHistory(
                uuidv4(),
                stockItem.id,
                'SOLD',
                stockItem.barcode || null,
                stockItem.barcode || null,
                `Sold on Sales Invoice #${invoiceNumber}`,
                timestamp
              )
            }
          }
        }
      }

      // 3. Insert payments
      for (const p of processedPayments) {
        salesInvoiceRepository.insertPayment(p)
      }

      // 4. Post customer account ledger entries
      // 4a. Sale Invoice Debit (Nave = Customer Receivable)
      accountLedgerRepository.insert({
        id: uuidv4(),
        sourceType: 'SALE_INVOICE',
        sourceId: invoiceId,
        entryDate: invoiceDate,
        accountId: data.accountId,
        metalType: data.metalType,
        cashJama: 0,
        cashNave: grandTotal,
        bankJama: 0,
        bankNave: 0,
        narration: `Sale Invoice ${invoiceNumber} (Total Amount)`,
        createdAt: timestamp
      })

      // 4b. Payment Credit (Jama = Amount Received)
      for (const p of processedPayments) {
        const isBank = ['BANK', 'UPI', 'CARD', 'CHEQUE'].includes(p.paymentMethod)
        accountLedgerRepository.insert({
          id: uuidv4(),
          sourceType: 'SALE_INVOICE',
          sourceId: invoiceId,
          entryDate: invoiceDate,
          accountId: data.accountId,
          metalType: null,
          cashJama: isBank ? 0 : p.amount,
          cashNave: 0,
          bankJama: isBank ? p.amount : 0,
          bankNave: 0,
          narration: `Payment for Sale Invoice ${invoiceNumber} (${p.paymentMethod}${p.paymentReference ? `: ${p.paymentReference}` : ''})`,
          createdAt: timestamp
        })
      }

      // 5. Update linked order to COMPLETED if applicable
      if (linkedOrder) {
        orderRepository.updateStatus(linkedOrder.id, 'COMPLETED', timestamp)
      }
    })

    return this.getById(invoiceId)
  },

  cancelInvoice(id: string): { success: boolean } {
    const invoice = this.getById(id)
    if (invoice.status === 'CANCELLED') {
      throw new ValidationError('Invoice is already cancelled')
    }

    transactionRepository.executeAtomic(() => {
      // 1. Mark status cancelled
      salesInvoiceRepository.updateStatus(id, 'CANCELLED')

      // 2. Reverse inventory movements
      inventoryMovementService.revertMovement('SALE', id)

      // 3. Remove accounting ledger entries
      accountLedgerRepository.deleteBySource('SALE_INVOICE', id)
    })

    return { success: true }
  },

  delete(id: string): { success: boolean } {
    this.cancelInvoice(id)
    salesInvoiceRepository.softDelete(id)
    return { success: true }
  }
}
