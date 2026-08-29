import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { MetalExchangeRepository } from '../database/repositories/MetalExchangeRepository'
import { OldGoldRepository } from '../database/repositories/OldGoldRepository'
import { CustomerOrderRepository } from '../database/repositories/CustomerOrderRepository'
import { CustomerRepository } from '../database/repositories/CustomerRepository'
import { AccountRepository } from '../database/repositories/AccountRepository'
import { TransactionRepository } from '../database/repositories/TransactionRepository'
import { documentSequenceService } from './documentSequence.service'
import { ValidationError, NotFoundError } from '../ipc/errors'
import type {
  MetalExchangeRecord,
  MetalExchangePayload,
  MetalExchangeFilter
} from '../../shared/types/metalExchange'
import type { OldGoldStatus } from '../../shared/types/oldGold'
import { roundNumber } from '../../shared/jewelleryFormula'

const exchangeRepository = new MetalExchangeRepository()
const oldGoldRepository = new OldGoldRepository()
const orderRepository = new CustomerOrderRepository()
const customerRepository = new CustomerRepository()
const accountRepository = new AccountRepository()
const transactionRepository = new TransactionRepository()

const exchangeSchema = z.object({
  exchangeNumber: z.string().trim().optional().default(''),
  oldGoldReceiptId: z.string().trim().min(1, 'Old gold receipt ID is required'),
  customerId: z.string().trim().optional().default(''),
  accountId: z.string().trim().min(1, 'Account is required'),
  orderId: z.string().trim().optional().default(''),
  saleId: z.string().trim().optional().default(''),
  exchangeDate: z.string().trim().optional().default(''),
  exchangeAmount: z.coerce.number().positive('Exchange amount must be greater than 0'),
  notes: z.string().trim().optional().default('')
})

export const metalExchangeService = {
  getNextNumber(): string {
    return documentSequenceService.getNextNumber('EXCHANGE')
  },

  list(filter?: MetalExchangeFilter): MetalExchangeRecord[] {
    return exchangeRepository.findAll(filter)
  },

  getById(id: string): MetalExchangeRecord {
    const exchange = exchangeRepository.findById(id)
    if (!exchange) {
      throw new NotFoundError('Metal exchange not found')
    }
    return exchange
  },

  getByNumber(number: string): MetalExchangeRecord {
    const exchange = exchangeRepository.findByNumber(number)
    if (!exchange) {
      throw new NotFoundError('Metal exchange not found')
    }
    return exchange
  },

  getByOrder(orderId: string): MetalExchangeRecord[] {
    return exchangeRepository.findByOrder(orderId)
  },

  applyExchange(payload: MetalExchangePayload, createdBy?: string): MetalExchangeRecord {
    const parseResult = exchangeSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid exchange payload')
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

    const receipt = oldGoldRepository.findById(data.oldGoldReceiptId)
    if (!receipt) {
      throw new NotFoundError('Old gold receipt not found')
    }
    if (receipt.status === 'CANCELLED') {
      throw new ValidationError('Cannot apply exchange against a cancelled old gold receipt')
    }

    const unallocated = receipt.unallocatedAmount
    const exchangeAmount = roundNumber(data.exchangeAmount, 2)
    if (exchangeAmount > unallocated) {
      throw new ValidationError(
        `Requested exchange amount (₹${exchangeAmount}) exceeds available unallocated credit (₹${unallocated})`
      )
    }

    if (data.orderId) {
      const order = orderRepository.findById(data.orderId)
      if (!order) {
        throw new NotFoundError('Order not found')
      }
      if (order.accountId !== data.accountId) {
        throw new ValidationError('Order does not belong to the specified customer account')
      }
    }

    const exchangeId = uuidv4()
    const exchangeNumber = data.exchangeNumber || documentSequenceService.getNextNumber('EXCHANGE')
    const now = dayjs()
    const exchangeDate = data.exchangeDate || now.format('YYYY-MM-DD')
    const timestamp = now.format('YYYY-MM-DD HH:mm:ss')

    const newAllocatedTotal = roundNumber(receipt.allocatedAmount + exchangeAmount, 2)
    const newReceiptStatus: OldGoldStatus =
      newAllocatedTotal >= receipt.valuationAmount ? 'EXCHANGED' : 'PARTIALLY_EXCHANGED'

    transactionRepository.executeAtomic(() => {
      // 1. Insert metal exchange record
      exchangeRepository.insert({
        id: exchangeId,
        exchangeNumber,
        oldGoldReceiptId: data.oldGoldReceiptId,
        customerId,
        accountId: data.accountId,
        orderId: data.orderId || null,
        saleId: data.saleId || null,
        exchangeDate,
        exchangeAmount,
        status: 'APPLIED',
        notes: data.notes,
        createdBy: createdBy || null,
        createdAt: timestamp,
        updatedAt: timestamp
      })

      // 2. Update allocated amount & status on old gold receipt
      oldGoldRepository.update(receipt.id, {
        allocatedAmount: newAllocatedTotal,
        status: newReceiptStatus,
        updatedAt: timestamp
      })
    })

    return this.getById(exchangeId)
  },

  cancelExchange(id: string): { success: boolean } {
    const exchange = this.getById(id)
    if (exchange.status === 'CANCELLED') {
      throw new ValidationError('Exchange is already cancelled')
    }

    const receipt = oldGoldRepository.findById(exchange.oldGoldReceiptId)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    transactionRepository.executeAtomic(() => {
      exchangeRepository.updateStatus(id, 'CANCELLED', now)

      if (receipt) {
        const newAllocated = Math.max(
          0,
          roundNumber(receipt.allocatedAmount - exchange.exchangeAmount, 2)
        )
        const newStatus: OldGoldStatus = newAllocated === 0 ? 'VALUED' : 'PARTIALLY_EXCHANGED'
        oldGoldRepository.update(receipt.id, {
          allocatedAmount: newAllocated,
          status: newStatus,
          updatedAt: now
        })
      }
    })

    return { success: true }
  },

  delete(id: string): { success: boolean } {
    this.cancelExchange(id)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    exchangeRepository.softDelete(id, now)
    return { success: true }
  }
}
