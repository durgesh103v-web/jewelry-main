import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { CustomerRepository } from '../database/repositories/CustomerRepository'
import { AccountRepository } from '../database/repositories/AccountRepository'
import { TransactionRepository } from '../database/repositories/TransactionRepository'
import { accountBalanceService } from './accountBalance.service'
import { ValidationError, NotFoundError, ConflictError } from '../ipc/errors'
import type { CustomerRecord, CustomerPayload, CustomerFilter } from '../../shared/types/customer'

const customerRepository = new CustomerRepository()
const accountRepository = new AccountRepository()
const transactionRepository = new TransactionRepository()

const customerSchema = z.object({
  customerCode: z.string().trim().optional().default(''),
  accountId: z.string().trim().optional().default(''),
  name: z.string().trim().min(1, 'Customer name is required').max(120),
  displayName: z.string().trim().max(120).optional().default(''),
  mobile: z.string().trim().max(20).optional().default(''),
  alternateMobile: z.string().trim().max(20).optional().default(''),
  email: z.string().trim().max(100).optional().default(''),
  address: z.string().trim().max(250).optional().default(''),
  city: z.string().trim().max(80).optional().default(''),
  state: z.string().trim().max(80).optional().default(''),
  pincode: z.string().trim().max(10).optional().default(''),
  dateOfBirth: z.string().trim().optional().default(''),
  anniversaryDate: z.string().trim().optional().default(''),
  gstin: z.string().trim().max(30).optional().default(''),
  pan: z.string().trim().max(30).optional().default(''),
  preferredMetal: z.string().trim().optional().default('Gold'),
  preferredPurity: z.string().trim().optional().default(''),
  notes: z.string().trim().optional().default(''),
  active: z.boolean().default(true),
  autoCreateAccount: z.boolean().optional().default(false),
  accountGroupId: z.string().trim().optional().default('')
})

export const customerService = {
  getNextCode(): string {
    return customerRepository.getNextCode()
  },

  list(filter?: CustomerFilter): CustomerRecord[] {
    return customerRepository.findAll({
      activeOnly: filter?.active,
      city: filter?.city,
      state: filter?.state
    })
  },

  search(query: string, limit = 50): CustomerRecord[] {
    if (!query || !query.trim()) {
      return customerRepository.findAll().slice(0, limit)
    }
    return customerRepository.search(query, limit)
  },

  getById(id: string): CustomerRecord {
    const customer = customerRepository.findById(id)
    if (!customer) {
      throw new NotFoundError('Customer not found')
    }
    return customer
  },

  getByCode(code: string): CustomerRecord {
    const customer = customerRepository.findByCode(code)
    if (!customer) {
      throw new NotFoundError('Customer not found')
    }
    return customer
  },

  getBalance(customerId: string) {
    const customer = this.getById(customerId)
    if (!customer.accountId) {
      return {
        goldFine: 0,
        silverFine: 0,
        cash: 0,
        anamat: 0,
        bank: 0
      }
    }
    return accountBalanceService.getAccountBalance(customer.accountId)
  },

  create(payload: CustomerPayload): CustomerRecord {
    const parseResult = customerSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid customer payload')
    }
    const data = parseResult.data

    const customerCode = data.customerCode || customerRepository.getNextCode()
    const existing = customerRepository.findByCode(customerCode)
    if (existing) {
      throw new ConflictError(`Customer code "${customerCode}" already exists`)
    }

    const id = uuidv4()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    let linkedAccountId: string | null = data.accountId || null

    transactionRepository.executeAtomic(() => {
      // Auto create accounting account if requested and group provided
      if ((data.autoCreateAccount || !linkedAccountId) && data.accountGroupId) {
        const accountId = uuidv4()
        accountRepository.insert({
          id: accountId,
          accountName: data.name,
          otherName: data.displayName || data.name,
          accountType: 'Retail Customer',
          accountGroupId: data.accountGroupId,
          mobileNumber: data.mobile,
          whatsappNumber: data.alternateMobile,
          phone2: '',
          address: data.address,
          city: data.city,
          state: data.state,
          gstNo: data.gstin,
          panNo: data.pan,
          lastDate: '',
          openingGoldFine: 0,
          openingSilverFine: 0,
          openingCash: 0,
          openingAnamat: 0,
          openingBank: 0,
          goldFineLimit: 0,
          silverFineLimit: 0,
          notification: '',
          active: data.active,
          createdAt: now,
          updatedAt: now
        })
        linkedAccountId = accountId
      }

      customerRepository.insert({
        id,
        customerCode,
        accountId: linkedAccountId,
        name: data.name,
        displayName: data.displayName || data.name,
        mobile: data.mobile,
        alternateMobile: data.alternateMobile,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        dateOfBirth: data.dateOfBirth,
        anniversaryDate: data.anniversaryDate,
        gstin: data.gstin,
        pan: data.pan,
        preferredMetal: data.preferredMetal,
        preferredPurity: data.preferredPurity,
        notes: data.notes,
        active: data.active,
        createdAt: now,
        updatedAt: now
      })
    })

    return this.getById(id)
  },

  update(id: string, payload: CustomerPayload): CustomerRecord {
    const parseResult = customerSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid customer payload')
    }
    const data = parseResult.data

    const existing = this.getById(id)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    transactionRepository.executeAtomic(() => {
      customerRepository.update(id, {
        name: data.name,
        displayName: data.displayName || data.name,
        mobile: data.mobile,
        alternateMobile: data.alternateMobile,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        dateOfBirth: data.dateOfBirth,
        anniversaryDate: data.anniversaryDate,
        gstin: data.gstin,
        pan: data.pan,
        preferredMetal: data.preferredMetal,
        preferredPurity: data.preferredPurity,
        notes: data.notes,
        active: data.active,
        accountId: data.accountId || existing.accountId,
        updatedAt: now
      })
    })

    return this.getById(id)
  },

  delete(id: string): { success: boolean } {
    this.getById(id)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    customerRepository.softDelete(id, now)
    return { success: true }
  }
}
