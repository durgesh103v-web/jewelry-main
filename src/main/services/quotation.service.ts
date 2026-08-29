import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { QuotationRepository } from '../database/repositories/QuotationRepository'
import { CustomerOrderRepository } from '../database/repositories/CustomerOrderRepository'
import { CustomerRepository } from '../database/repositories/CustomerRepository'
import { AccountRepository } from '../database/repositories/AccountRepository'
import { ItemRepository } from '../database/repositories/ItemRepository'
import { TransactionRepository } from '../database/repositories/TransactionRepository'
import { documentSequenceService } from './documentSequence.service'
import { pricingService } from './pricing.service'
import { ValidationError, NotFoundError } from '../ipc/errors'
import type {
  QuotationRecord,
  QuotationPayload,
  QuotationFilter,
  QuotationStatus
} from '../../shared/types/quotation'
import type { CustomerOrderRecord } from '../../shared/types/customerOrder'
import { roundNumber } from '../../shared/jewelleryFormula'

const quotationRepository = new QuotationRepository()
const orderRepository = new CustomerOrderRepository()
const customerRepository = new CustomerRepository()
const accountRepository = new AccountRepository()
const itemRepository = new ItemRepository()
const transactionRepository = new TransactionRepository()

const quotationItemSchema = z.object({
  itemId: z.string().trim().min(1, 'Item is required'),
  description: z.string().trim().optional().default(''),
  stampId: z.string().trim().optional().default(''),
  designId: z.string().trim().optional().default(''),
  barcode: z.string().trim().optional().default(''),
  pcs: z.coerce.number().min(1, 'Pcs must be at least 1').default(1),
  grossWeight: z.coerce.number().positive('Gross weight must be greater than 0'),
  packWeight: z.coerce.number().optional().default(0),
  lessWeight: z.coerce.number().optional(),
  addWeight: z.coerce.number().optional().default(0),
  metalType: z.string().trim().optional().default('Gold'),
  purityName: z.string().trim().optional().default(''),
  tunch: z.coerce.number().optional(),
  wastage: z.coerce.number().optional().default(0),
  goldRate: z.coerce.number().optional().default(0),
  labourRate: z.coerce.number().optional().default(0),
  labourRateType: z.enum(['Kg', 'Gm', 'Pcs']).optional().default('Kg'),
  stoneCharges: z.array(z.any()).optional().default([]),
  diamondCharges: z.array(z.any()).optional().default([]),
  discountAmount: z.coerce.number().optional().default(0),
  discountPercent: z.coerce.number().optional().default(0),
  taxPercent: z.coerce.number().optional().default(0)
})

const quotationSchema = z.object({
  quotationNumber: z.string().trim().optional().default(''),
  customerId: z.string().trim().optional().default(''),
  accountId: z.string().trim().min(1, 'Account is required'),
  quotationDate: z.string().trim().optional().default(''),
  validUntil: z.string().trim().optional().default(''),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'CONVERTED', 'EXPIRED', 'REJECTED', 'CANCELLED']).optional().default('DRAFT'),
  metalType: z.string().trim().optional().default('Gold'),
  notes: z.string().trim().optional().default(''),
  items: z.array(quotationItemSchema).min(1, 'At least one item is required in quotation')
})

export const quotationService = {
  getNextNumber(): string {
    return documentSequenceService.getNextNumber('QUOTATION')
  },

  list(filter?: QuotationFilter): QuotationRecord[] {
    return quotationRepository.findAll(filter)
  },

  getById(id: string): QuotationRecord {
    const quote = quotationRepository.findById(id)
    if (!quote) {
      throw new NotFoundError('Quotation not found')
    }
    return quote
  },

  getByNumber(number: string): QuotationRecord {
    const quote = quotationRepository.findByNumber(number)
    if (!quote) {
      throw new NotFoundError('Quotation not found')
    }
    return quote
  },

  create(payload: QuotationPayload, createdBy?: string): QuotationRecord {
    const parseResult = quotationSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid quotation payload')
    }
    const data = parseResult.data

    // Verify account exists
    const account = accountRepository.findById(data.accountId)
    if (!account) {
      throw new NotFoundError('Account not found')
    }

    // Resolve customerId if not provided
    let customerId = data.customerId || null
    if (!customerId) {
      const customer = customerRepository.findByAccountId(data.accountId)
      if (customer) {
        customerId = customer.id
      }
    }

    const quotationId = uuidv4()
    const quotationNumber = data.quotationNumber || documentSequenceService.getNextNumber('QUOTATION')
    const now = dayjs()
    const quotationDate = data.quotationDate || now.format('YYYY-MM-DD')
    const validUntil = data.validUntil || now.add(7, 'day').format('YYYY-MM-DD')
    const timestamp = now.format('YYYY-MM-DD HH:mm:ss')

    let totalPcs = 0
    let totalGrossWeight = 0
    let totalNetWeight = 0
    let totalFineWeight = 0
    let totalMajuri = 0
    let totalMetalValue = 0
    let totalCharges = 0
    let totalDiscount = 0
    let totalTaxable = 0
    let totalTax = 0
    let grandTotal = 0
    let primaryRate = 0

    const processedItems: any[] = []

    for (let i = 0; i < data.items.length; i++) {
      const line = data.items[i]
      const itemMaster = itemRepository.findById(line.itemId)

      const tunch = line.tunch !== undefined ? line.tunch : itemMaster?.default_tanch ?? 100
      const wastage = line.wastage !== undefined ? line.wastage : itemMaster?.default_wastage ?? 0
      const labourRate = line.labourRate !== undefined ? line.labourRate : itemMaster?.default_labour_rate ?? 0
      const labourRateType = (line.labourRateType || itemMaster?.labour_rate_type || 'Kg') as any

      // Call canonical pricing engine
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
        rateDate: quotationDate,
        stoneCharges: line.stoneCharges,
        diamondCharges: line.diamondCharges,
        discountAmount: line.discountAmount,
        discountPercent: line.discountPercent,
        taxPercent: line.taxPercent
      })

      if (priceResult.metal.ratePerGram && !primaryRate) {
        primaryRate = priceResult.metal.ratePerGram
      }

      totalPcs += priceResult.weights.grossWeight > 0 ? line.pcs : 0
      totalGrossWeight = roundNumber(totalGrossWeight + priceResult.weights.grossWeight, 3)
      totalNetWeight = roundNumber(totalNetWeight + priceResult.weights.netWeight, 3)
      totalFineWeight = roundNumber(totalFineWeight + priceResult.weights.fineWeight, 3)
      totalMajuri = roundNumber(totalMajuri + priceResult.charges.making, 2)
      totalMetalValue = roundNumber(totalMetalValue + priceResult.metal.metalValue, 2)
      totalCharges = roundNumber(totalCharges + priceResult.charges.totalCharges, 2)
      totalDiscount = roundNumber(totalDiscount + priceResult.discount.amount, 2)
      totalTaxable = roundNumber(totalTaxable + priceResult.tax.taxableAmount, 2)
      totalTax = roundNumber(totalTax + priceResult.tax.taxAmount, 2)
      grandTotal = roundNumber(grandTotal + priceResult.total.finalAmount, 2)

      processedItems.push({
        id: uuidv4(),
        quotationId,
        itemId: line.itemId,
        description: line.description || itemMaster?.item_name || '',
        stampId: line.stampId || itemMaster?.default_stamp_id || null,
        designId: line.designId || itemMaster?.default_design_id || null,
        barcode: line.barcode || null,
        pcs: line.pcs,
        grossWeight: priceResult.weights.grossWeight,
        packWeight: priceResult.weights.packWeight,
        lessWeight: priceResult.weights.lessWeight,
        addWeight: priceResult.weights.addWeight,
        netWeight: priceResult.weights.netWeight,
        fineWeight: priceResult.weights.fineWeight,
        metalType: priceResult.metal.metalType,
        purityName: line.purityName || null,
        tunch: priceResult.purity.tunch,
        wastage: priceResult.purity.wastage,
        hishob: priceResult.purity.hishob,
        goldRate: priceResult.metal.ratePerGram,
        metalValue: priceResult.metal.metalValue,
        labourRate: priceResult.charges.labourRate,
        labourRateType: priceResult.charges.labourRateType,
        makingCharges: priceResult.charges.making,
        stoneCharges: priceResult.charges.stoneTotal,
        diamondCharges: priceResult.charges.diamondTotal,
        discountAmount: priceResult.discount.amount,
        taxableAmount: priceResult.tax.taxableAmount,
        taxPercent: priceResult.tax.taxPercent,
        taxAmount: priceResult.tax.taxAmount,
        lineTotal: priceResult.total.finalAmount,
        pricingBreakdown: priceResult.breakdown.join('\n'),
        sortOrder: i + 1,
        createdAt: timestamp,
        updatedAt: timestamp
      })
    }

    const roundedTotal = roundNumber(grandTotal, 0)

    const pricingSnapshot = {
      weights: {
        grossWeight: totalGrossWeight,
        netWeight: totalNetWeight,
        fineWeight: totalFineWeight
      },
      metal: {
        ratePerGram: primaryRate,
        metalValue: totalMetalValue
      },
      charges: {
        making: totalMajuri,
        totalCharges
      },
      discount: {
        amount: totalDiscount
      },
      tax: {
        taxableAmount: totalTaxable,
        taxAmount: totalTax
      },
      total: {
        finalAmount: grandTotal,
        roundedTotal
      }
    }

    transactionRepository.executeAtomic(() => {
      quotationRepository.insertHeader({
        id: quotationId,
        quotationNumber,
        customerId,
        accountId: data.accountId,
        quotationDate,
        validUntil,
        status: data.status || 'DRAFT',
        metalType: data.metalType || 'Gold',
        totalPcs,
        totalGrossWeight,
        totalNetWeight,
        totalFineWeight,
        totalMajuri,
        metalRateApplied: primaryRate,
        metalValue: totalMetalValue,
        totalCharges,
        discountAmount: totalDiscount,
        taxableAmount: totalTaxable,
        taxAmount: totalTax,
        grandTotal,
        roundedTotal,
        pricingSnapshot: JSON.stringify(pricingSnapshot),
        notes: data.notes,
        createdBy: createdBy || null,
        createdAt: timestamp,
        updatedAt: timestamp
      })

      for (const item of processedItems) {
        quotationRepository.insertItem(item)
      }
    })

    return this.getById(quotationId)
  },

  updateStatus(id: string, status: QuotationStatus): QuotationRecord {
    this.getById(id)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    quotationRepository.updateStatus(id, status, { updatedAt: now })
    return this.getById(id)
  },

  convertToOrder(quotationId: string, createdBy?: string): CustomerOrderRecord {
    const quote = this.getById(quotationId)
    if (quote.status === 'CONVERTED') {
      throw new ValidationError(`Quotation ${quote.quotationNumber} is already converted`)
    }
    if (quote.status === 'CANCELLED' || quote.status === 'REJECTED') {
      throw new ValidationError(`Cannot convert ${quote.status.toLowerCase()} quotation`)
    }

    const orderId = uuidv4()
    const orderNumber = documentSequenceService.getNextNumber('ORDER')
    const now = dayjs()
    const orderDate = now.format('YYYY-MM-DD')
    const expectedDeliveryDate = now.add(7, 'day').format('YYYY-MM-DD')
    const timestamp = now.format('YYYY-MM-DD HH:mm:ss')

    transactionRepository.executeAtomic(() => {
      orderRepository.insertHeader({
        id: orderId,
        orderNumber,
        quotationId: quote.id,
        customerId: quote.customerId,
        accountId: quote.accountId,
        orderDate,
        expectedDeliveryDate,
        status: 'CONFIRMED',
        metalType: quote.metalType,
        totalPcs: quote.totalPcs,
        totalGrossWeight: quote.totalGrossWeight,
        totalNetWeight: quote.totalNetWeight,
        totalFineWeight: quote.totalFineWeight,
        totalMajuri: quote.totalMajuri,
        metalValue: quote.metalValue,
        totalCharges: quote.totalCharges,
        discountAmount: quote.discountAmount,
        taxableAmount: quote.taxableAmount,
        taxAmount: quote.taxAmount,
        grandTotal: quote.grandTotal,
        roundedTotal: quote.roundedTotal,
        advanceAmount: 0,
        pricingSnapshot: JSON.stringify(quote.pricingSnapshot),
        notes: `Converted from Quotation ${quote.quotationNumber}. ${quote.notes || ''}`,
        createdBy: createdBy || null,
        createdAt: timestamp,
        updatedAt: timestamp
      })

      if (quote.items) {
        for (const item of quote.items) {
          orderRepository.insertItem({
            id: uuidv4(),
            orderId,
            itemId: item.itemId,
            description: item.description,
            stampId: item.stampId,
            designId: item.designId,
            barcode: item.barcode,
            pcs: item.pcs,
            grossWeight: item.grossWeight,
            packWeight: item.packWeight,
            lessWeight: item.lessWeight,
            addWeight: item.addWeight,
            netWeight: item.netWeight,
            fineWeight: item.fineWeight,
            metalType: item.metalType,
            purityName: item.purityName,
            tunch: item.tunch,
            wastage: item.wastage,
            hishob: item.hishob,
            goldRate: item.goldRate,
            metalValue: item.metalValue,
            labourRate: item.labourRate,
            labourRateType: item.labourRateType,
            makingCharges: item.makingCharges,
            stoneCharges: item.stoneCharges,
            diamondCharges: item.diamondCharges,
            discountAmount: item.discountAmount,
            taxableAmount: item.taxableAmount,
            taxPercent: item.taxPercent,
            taxAmount: item.taxAmount,
            lineTotal: item.lineTotal,
            pricingBreakdown: item.pricingBreakdown,
            sortOrder: item.sortOrder,
            createdAt: timestamp,
            updatedAt: timestamp
          })
        }
      }

      quotationRepository.updateStatus(quote.id, 'CONVERTED', {
        convertedOrderId: orderId,
        updatedAt: timestamp
      })
    })

    const order = orderRepository.findById(orderId)
    if (!order) {
      throw new NotFoundError('Failed to retrieve newly created order')
    }
    return order
  },

  delete(id: string): { success: boolean } {
    this.getById(id)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    quotationRepository.softDelete(id, now)
    return { success: true }
  }
}
