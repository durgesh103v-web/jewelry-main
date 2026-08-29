import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { OldGoldRepository } from '../database/repositories/OldGoldRepository'
import { CustomerRepository } from '../database/repositories/CustomerRepository'
import { AccountRepository } from '../database/repositories/AccountRepository'
import { TransactionRepository } from '../database/repositories/TransactionRepository'
import { documentSequenceService } from './documentSequence.service'
import { oldGoldValuationService } from './oldGoldValuation.service'
import { ValidationError, NotFoundError } from '../ipc/errors'
import type {
  OldGoldReceiptRecord,
  OldGoldReceiptPayload,
  OldGoldFilter,
  OldGoldValuationRequest,
  OldGoldValuationResult
} from '../../shared/types/oldGold'

const oldGoldRepository = new OldGoldRepository()
const customerRepository = new CustomerRepository()
const accountRepository = new AccountRepository()
const transactionRepository = new TransactionRepository()

const oldGoldSchema = z.object({
  receiptNumber: z.string().trim().optional().default(''),
  customerId: z.string().trim().optional().default(''),
  accountId: z.string().trim().min(1, 'Account is required'),
  receiptDate: z.string().trim().optional().default(''),
  metalType: z.string().trim().optional().default('Gold'),
  description: z.string().trim().optional().default(''),
  grossWeight: z.coerce.number().positive('Gross weight must be greater than 0'),
  lessWeight: z.coerce.number().optional().default(0),
  purityName: z.string().trim().optional().default(''),
  tunch: z.coerce.number().optional().default(100),
  recoveryPercent: z.coerce.number().optional().default(100),
  goldRate: z.coerce.number().optional().default(0),
  deductionAmount: z.coerce.number().optional().default(0),
  notes: z.string().trim().optional().default('')
})

export const oldGoldService = {
  getNextNumber(): string {
    return documentSequenceService.getNextNumber('OLD_GOLD')
  },

  calculateValuation(request: OldGoldValuationRequest): OldGoldValuationResult {
    return oldGoldValuationService.calculate(request)
  },

  list(filter?: OldGoldFilter): OldGoldReceiptRecord[] {
    return oldGoldRepository.findAll(filter)
  },

  getById(id: string): OldGoldReceiptRecord {
    const receipt = oldGoldRepository.findById(id)
    if (!receipt) {
      throw new NotFoundError('Old gold receipt not found')
    }
    return receipt
  },

  getByNumber(number: string): OldGoldReceiptRecord {
    const receipt = oldGoldRepository.findByNumber(number)
    if (!receipt) {
      throw new NotFoundError('Old gold receipt not found')
    }
    return receipt
  },

  getByCustomer(customerId: string): OldGoldReceiptRecord[] {
    return oldGoldRepository.findByCustomer(customerId)
  },

  createReceipt(payload: OldGoldReceiptPayload, createdBy?: string): OldGoldReceiptRecord {
    const parseResult = oldGoldSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid old gold payload')
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

    const receiptId = uuidv4()
    const receiptNumber = data.receiptNumber || documentSequenceService.getNextNumber('OLD_GOLD')
    const now = dayjs()
    const receiptDate = data.receiptDate || now.format('YYYY-MM-DD')
    const timestamp = now.format('YYYY-MM-DD HH:mm:ss')

    // Perform canonical valuation
    const valResult = oldGoldValuationService.calculate({
      metalType: data.metalType,
      grossWeight: data.grossWeight,
      lessWeight: data.lessWeight,
      purityName: data.purityName,
      tunch: data.tunch,
      recoveryPercent: data.recoveryPercent,
      goldRate: data.goldRate,
      rateDate: receiptDate,
      deductionAmount: data.deductionAmount
    })

    transactionRepository.executeAtomic(() => {
      oldGoldRepository.insert({
        id: receiptId,
        receiptNumber,
        customerId,
        accountId: data.accountId,
        receiptDate,
        metalType: data.metalType,
        description: data.description,
        grossWeight: valResult.weights.grossWeight,
        lessWeight: valResult.weights.lessWeight,
        netWeight: valResult.weights.netWeight,
        purityName: data.purityName,
        tunch: valResult.purity.tunch,
        fineWeight: valResult.weights.fineWeight,
        recoveryPercent: valResult.purity.recoveryPercent,
        recoverableFineWeight: valResult.weights.recoverableFineWeight,
        goldRate: valResult.rate.goldRate,
        metalValue: valResult.valuation.metalValue,
        deductionAmount: valResult.valuation.deductionAmount,
        valuationAmount: valResult.valuation.valuationAmount,
        allocatedAmount: 0,
        status: 'VALUED',
        notes: data.notes,
        createdBy: createdBy || null,
        createdAt: timestamp,
        updatedAt: timestamp
      })
    })

    return this.getById(receiptId)
  },

  cancelReceipt(id: string): { success: boolean } {
    const receipt = this.getById(id)
    if (receipt.status === 'CANCELLED') {
      throw new ValidationError('Receipt is already cancelled')
    }
    if (receipt.allocatedAmount > 0) {
      throw new ValidationError('Cannot cancel an old gold receipt that has already been exchanged')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    oldGoldRepository.updateStatus(id, 'CANCELLED', now)
    return { success: true }
  },

  delete(id: string): { success: boolean } {
    this.cancelReceipt(id)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    oldGoldRepository.softDelete(id, now)
    return { success: true }
  }
}
