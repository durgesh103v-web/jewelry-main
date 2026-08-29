import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { AdvanceRepository } from '../database/repositories/AdvanceRepository'
import { CustomerOrderRepository } from '../database/repositories/CustomerOrderRepository'
import { CustomerRepository } from '../database/repositories/CustomerRepository'
import { AccountRepository } from '../database/repositories/AccountRepository'
import { AccountLedgerRepository } from '../database/repositories/AccountLedgerRepository'
import { TransactionRepository } from '../database/repositories/TransactionRepository'
import { documentSequenceService } from './documentSequence.service'
import { ValidationError, NotFoundError } from '../ipc/errors'
import type {
  CustomerAdvanceRecord,
  CustomerAdvancePayload,
  AdvanceAllocationPayload,
  CustomerAdvanceFilter,
  OrderAdvanceSummary,
  AdvanceStatus
} from '../../shared/types/advance'
import type { CustomerOrderRecord } from '../../shared/types/customerOrder'
import { roundNumber } from '../../shared/jewelleryFormula'

const advanceRepository = new AdvanceRepository()
const orderRepository = new CustomerOrderRepository()
const customerRepository = new CustomerRepository()
const accountRepository = new AccountRepository()
const accountLedgerRepository = new AccountLedgerRepository()
const transactionRepository = new TransactionRepository()

const advanceSchema = z.object({
  advanceNumber: z.string().trim().optional().default(''),
  customerId: z.string().trim().optional().default(''),
  accountId: z.string().trim().min(1, 'Account is required'),
  orderId: z.string().trim().optional().default(''),
  amount: z.coerce.number().positive('Advance amount must be greater than 0'),
  paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'CARD', 'CHEQUE', 'OTHER']).optional().default('CASH'),
  paymentReference: z.string().trim().optional().default(''),
  advanceDate: z.string().trim().optional().default(''),
  notes: z.string().trim().optional().default('')
})

const allocationSchema = z.object({
  advanceId: z.string().trim().min(1, 'Advance ID is required'),
  orderId: z.string().trim().min(1, 'Order ID is required'),
  allocatedAmount: z.coerce.number().positive('Allocated amount must be greater than 0'),
  notes: z.string().trim().optional().default('')
})

export const advanceService = {
  getNextNumber(): string {
    return documentSequenceService.getNextNumber('ADVANCE')
  },

  list(filter?: CustomerAdvanceFilter): CustomerAdvanceRecord[] {
    return advanceRepository.findAll(filter)
  },

  getById(id: string): CustomerAdvanceRecord {
    const advance = advanceRepository.findById(id)
    if (!advance) {
      throw new NotFoundError('Customer advance not found')
    }
    return advance
  },

  getByNumber(number: string): CustomerAdvanceRecord {
    const advance = advanceRepository.findByNumber(number)
    if (!advance) {
      throw new NotFoundError('Customer advance not found')
    }
    return advance
  },

  getByCustomer(customerId: string): CustomerAdvanceRecord[] {
    return advanceRepository.findByCustomer(customerId)
  },

  getByOrder(orderId: string): CustomerAdvanceRecord[] {
    return advanceRepository.findByOrder(orderId)
  },

  receiveAdvance(payload: CustomerAdvancePayload, createdBy?: string): CustomerAdvanceRecord {
    const parseResult = advanceSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid advance payload')
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

    let order: CustomerOrderRecord | null = null
    if (data.orderId) {
      const found = orderRepository.findById(data.orderId)
      if (!found) {
        throw new NotFoundError('Order not found')
      }
      if (found.accountId !== data.accountId) {
        throw new ValidationError('Order does not belong to the specified customer account')
      }
      order = found
    }

    const advanceId = uuidv4()
    const advanceNumber = data.advanceNumber || documentSequenceService.getNextNumber('ADVANCE')
    const now = dayjs()
    const advanceDate = data.advanceDate || now.format('YYYY-MM-DD')
    const timestamp = now.format('YYYY-MM-DD HH:mm:ss')

    const amount = roundNumber(data.amount, 2)
    const isDirectOrderAdvance = Boolean(data.orderId)
    const initialAllocatedAmount = isDirectOrderAdvance ? amount : 0
    const initialStatus: AdvanceStatus = isDirectOrderAdvance ? 'FULLY_ALLOCATED' : 'RECEIVED'

    transactionRepository.executeAtomic(() => {
      // 1. Insert advance header
      advanceRepository.insert({
        id: advanceId,
        advanceNumber,
        customerId,
        accountId: data.accountId,
        orderId: data.orderId || null,
        amount,
        allocatedAmount: initialAllocatedAmount,
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference,
        advanceDate,
        status: initialStatus,
        notes: data.notes,
        createdBy: createdBy || null,
        createdAt: timestamp,
        updatedAt: timestamp
      })

      // 2. If order was specified, allocate automatically
      if (data.orderId) {
        advanceRepository.insertAllocation({
          id: uuidv4(),
          advanceId,
          orderId: data.orderId,
          allocatedAmount: amount,
          allocationDate: advanceDate,
          notes: `Auto-allocated on receipt for Order ${order?.orderNumber}`,
          createdAt: timestamp,
          updatedAt: timestamp
        })
      }

      // 3. Post to Account Ledger (Jama increases customer credit with firm)
      const isBank = ['BANK', 'UPI', 'CARD', 'CHEQUE'].includes(data.paymentMethod)
      const narration = `Customer Advance ${advanceNumber}${order ? ` for Order ${order.orderNumber}` : ''}${data.paymentReference ? ` (${data.paymentMethod}: ${data.paymentReference})` : ''}`

      accountLedgerRepository.insert({
        id: uuidv4(),
        sourceType: 'CUSTOMER_ADVANCE',
        sourceId: advanceId,
        entryDate: advanceDate,
        accountId: data.accountId,
        metalType: null,
        cashJama: isBank ? 0 : amount,
        cashNave: 0,
        bankJama: isBank ? amount : 0,
        bankNave: 0,
        narration,
        createdAt: timestamp
      })
    })

    return this.getById(advanceId)
  },

  allocateAdvance(payload: AdvanceAllocationPayload): CustomerAdvanceRecord {
    const parseResult = allocationSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid allocation payload')
    }
    const data = parseResult.data

    const advance = this.getById(data.advanceId)
    if (advance.status === 'CANCELLED' || advance.status === 'REFUNDED') {
      throw new ValidationError(`Cannot allocate a ${advance.status.toLowerCase()} advance`)
    }

    const unallocated = advance.unallocatedAmount
    const toAllocate = roundNumber(data.allocatedAmount, 2)
    if (toAllocate > unallocated) {
      throw new ValidationError(
        `Requested allocation (₹${toAllocate}) exceeds available unallocated advance (₹${unallocated})`
      )
    }

    const order = orderRepository.findById(data.orderId)
    if (!order) {
      throw new NotFoundError('Order not found')
    }
    if (order.accountId !== advance.accountId) {
      throw new ValidationError('Order does not belong to the same account as the advance')
    }

    const newAllocatedTotal = roundNumber(advance.allocatedAmount + toAllocate, 2)
    const newStatus: AdvanceStatus =
      newAllocatedTotal >= advance.amount ? 'FULLY_ALLOCATED' : 'PARTIALLY_ALLOCATED'

    const now = dayjs()
    const allocationDate = now.format('YYYY-MM-DD')
    const timestamp = now.format('YYYY-MM-DD HH:mm:ss')

    transactionRepository.executeAtomic(() => {
      advanceRepository.insertAllocation({
        id: uuidv4(),
        advanceId: advance.id,
        orderId: data.orderId,
        allocatedAmount: toAllocate,
        allocationDate,
        notes: data.notes || `Allocated to Order ${order.orderNumber}`,
        createdAt: timestamp,
        updatedAt: timestamp
      })

      advanceRepository.update(advance.id, {
        allocatedAmount: newAllocatedTotal,
        status: newStatus,
        updatedAt: timestamp
      })
    })

    return this.getById(advance.id)
  },

  getOrderAdvanceSummary(orderId: string): OrderAdvanceSummary {
    const order = orderRepository.findById(orderId)
    if (!order) {
      throw new NotFoundError('Order not found')
    }

    const allocations = advanceRepository.getAllocationsByOrder(orderId)
    const totalAdvanceAllocated = allocations.reduce(
      (sum, alloc) => roundNumber(sum + alloc.allocatedAmount, 2),
      0
    )

    const orderAdvances = advanceRepository.findByOrder(orderId)
    const totalAdvanceReceived = orderAdvances.reduce(
      (sum, adv) => roundNumber(sum + adv.amount, 2),
      0
    )

    const balanceDue = Math.max(0, roundNumber(order.grandTotal - totalAdvanceAllocated, 2))

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      grandTotal: order.grandTotal,
      totalAdvanceReceived,
      totalAdvanceAllocated,
      balanceDue,
      advances: orderAdvances
    }
  },

  cancelAdvance(id: string): { success: boolean } {
    const advance = this.getById(id)
    if (advance.status === 'CANCELLED') {
      throw new ValidationError('Advance is already cancelled')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    transactionRepository.executeAtomic(() => {
      // 1. Update advance status
      advanceRepository.updateStatus(id, 'CANCELLED', now)

      // 2. Remove all allocations
      advanceRepository.deleteAllocationsByAdvance(id)

      // 3. Remove accounting ledger entry
      accountLedgerRepository.deleteBySource('CUSTOMER_ADVANCE', id)
    })

    return { success: true }
  },

  delete(id: string): { success: boolean } {
    this.cancelAdvance(id)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    advanceRepository.softDelete(id, now)
    return { success: true }
  }
}
