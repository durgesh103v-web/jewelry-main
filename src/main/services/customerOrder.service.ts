import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { CustomerOrderRepository } from '../database/repositories/CustomerOrderRepository'
import { CustomerRepository } from '../database/repositories/CustomerRepository'
import { AccountRepository } from '../database/repositories/AccountRepository'
import { ItemRepository } from '../database/repositories/ItemRepository'
import { TransactionRepository } from '../database/repositories/TransactionRepository'
import { documentSequenceService } from './documentSequence.service'
import { pricingService } from './pricing.service'
import { ValidationError, NotFoundError } from '../ipc/errors'
import type {
  CustomerOrderRecord,
  CustomerOrderPayload,
  CustomerOrderFilter,
  OrderStatus
} from '../../shared/types/customerOrder'
import { roundNumber } from '../../shared/jewelleryFormula'

const orderRepository = new CustomerOrderRepository()
const customerRepository = new CustomerRepository()
const accountRepository = new AccountRepository()
const itemRepository = new ItemRepository()
const transactionRepository = new TransactionRepository()

const orderItemSchema = z.object({
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

const orderSchema = z.object({
  orderNumber: z.string().trim().optional().default(''),
  quotationId: z.string().trim().optional().default(''),
  customerId: z.string().trim().optional().default(''),
  accountId: z.string().trim().min(1, 'Account is required'),
  orderDate: z.string().trim().optional().default(''),
  expectedDeliveryDate: z.string().trim().optional().default(''),
  status: z.enum(['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED']).optional().default('CONFIRMED'),
  metalType: z.string().trim().optional().default('Gold'),
  advanceAmount: z.coerce.number().optional().default(0),
  notes: z.string().trim().optional().default(''),
  items: z.array(orderItemSchema).min(1, 'At least one item is required in order')
})

export const customerOrderService = {
  getNextNumber(): string {
    return documentSequenceService.getNextNumber('ORDER')
  },

  list(filter?: CustomerOrderFilter): CustomerOrderRecord[] {
    return orderRepository.findAll(filter)
  },

  getById(id: string): CustomerOrderRecord {
    const order = orderRepository.findById(id)
    if (!order) {
      throw new NotFoundError('Order not found')
    }
    return order
  },

  getByNumber(number: string): CustomerOrderRecord {
    const order = orderRepository.findByNumber(number)
    if (!order) {
      throw new NotFoundError('Order not found')
    }
    return order
  },

  create(payload: CustomerOrderPayload, createdBy?: string): CustomerOrderRecord {
    const parseResult = orderSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid order payload')
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

    const orderId = uuidv4()
    const orderNumber = data.orderNumber || documentSequenceService.getNextNumber('ORDER')
    const now = dayjs()
    const orderDate = data.orderDate || now.format('YYYY-MM-DD')
    const expectedDeliveryDate = data.expectedDeliveryDate || now.add(7, 'day').format('YYYY-MM-DD')
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
        rateDate: orderDate,
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
        orderId,
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
      orderRepository.insertHeader({
        id: orderId,
        orderNumber,
        quotationId: data.quotationId || null,
        customerId,
        accountId: data.accountId,
        orderDate,
        expectedDeliveryDate,
        status: data.status || 'CONFIRMED',
        metalType: data.metalType || 'Gold',
        totalPcs,
        totalGrossWeight,
        totalNetWeight,
        totalFineWeight,
        totalMajuri,
        metalValue: totalMetalValue,
        totalCharges,
        discountAmount: totalDiscount,
        taxableAmount: totalTaxable,
        taxAmount: totalTax,
        grandTotal,
        roundedTotal,
        advanceAmount: data.advanceAmount || 0,
        pricingSnapshot: JSON.stringify(pricingSnapshot),
        notes: data.notes,
        createdBy: createdBy || null,
        createdAt: timestamp,
        updatedAt: timestamp
      })

      for (const item of processedItems) {
        orderRepository.insertItem(item)
      }
    })

    return this.getById(orderId)
  },

  updateStatus(id: string, status: OrderStatus): CustomerOrderRecord {
    this.getById(id)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    orderRepository.updateStatus(id, status, now)
    return this.getById(id)
  },

  delete(id: string): { success: boolean } {
    this.getById(id)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    orderRepository.softDelete(id, now)
    return { success: true }
  }
}
