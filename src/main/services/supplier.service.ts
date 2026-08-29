import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { SupplierRepository } from '../database/repositories/SupplierRepository'
import { AccountRepository } from '../database/repositories/AccountRepository'
import { TransactionRepository } from '../database/repositories/TransactionRepository'
import { accountBalanceService } from './accountBalance.service'
import { ValidationError, NotFoundError, ConflictError } from '../ipc/errors'
import type { SupplierRecord, SupplierPayload, SupplierFilter } from '../../shared/types/supplier'

const supplierRepository = new SupplierRepository()
const accountRepository = new AccountRepository()
const transactionRepository = new TransactionRepository()

const supplierSchema = z.object({
  supplierCode: z.string().trim().optional().default(''),
  accountId: z.string().trim().optional().default(''),
  name: z.string().trim().min(1, 'Supplier name is required').max(120),
  displayName: z.string().trim().max(120).optional().default(''),
  supplierType: z.string().trim().optional().default('Supplier'),
  mobile: z.string().trim().max(20).optional().default(''),
  alternateMobile: z.string().trim().max(20).optional().default(''),
  email: z.string().trim().max(100).optional().default(''),
  address: z.string().trim().max(250).optional().default(''),
  city: z.string().trim().max(80).optional().default(''),
  state: z.string().trim().max(80).optional().default(''),
  pincode: z.string().trim().max(10).optional().default(''),
  gstin: z.string().trim().max(30).optional().default(''),
  pan: z.string().trim().max(30).optional().default(''),
  notes: z.string().trim().optional().default(''),
  active: z.boolean().default(true),
  autoCreateAccount: z.boolean().optional().default(false),
  accountGroupId: z.string().trim().optional().default('')
})

export const supplierService = {
  getNextCode(): string {
    return supplierRepository.getNextCode()
  },

  list(filter?: SupplierFilter): SupplierRecord[] {
    return supplierRepository.findAll({
      activeOnly: filter?.active,
      supplierType: filter?.supplierType,
      city: filter?.city,
      state: filter?.state
    })
  },

  search(query: string, limit = 50): SupplierRecord[] {
    if (!query || !query.trim()) {
      return supplierRepository.findAll().slice(0, limit)
    }
    return supplierRepository.search(query, limit)
  },

  getById(id: string): SupplierRecord {
    const supplier = supplierRepository.findById(id)
    if (!supplier) {
      throw new NotFoundError('Supplier not found')
    }
    return supplier
  },

  getByCode(code: string): SupplierRecord {
    const supplier = supplierRepository.findByCode(code)
    if (!supplier) {
      throw new NotFoundError('Supplier not found')
    }
    return supplier
  },

  getBalance(supplierId: string) {
    const supplier = this.getById(supplierId)
    if (!supplier.accountId) {
      return {
        goldFine: 0,
        silverFine: 0,
        cash: 0,
        anamat: 0,
        bank: 0
      }
    }
    return accountBalanceService.getAccountBalance(supplier.accountId)
  },

  create(payload: SupplierPayload): SupplierRecord {
    const parseResult = supplierSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid supplier payload')
    }
    const data = parseResult.data

    const supplierCode = data.supplierCode || supplierRepository.getNextCode()
    const existing = supplierRepository.findByCode(supplierCode)
    if (existing) {
      throw new ConflictError(`Supplier code "${supplierCode}" already exists`)
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
          accountType: 'Supplier / Karagir / Dhadi',
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

      supplierRepository.insert({
        id,
        supplierCode,
        accountId: linkedAccountId,
        name: data.name,
        displayName: data.displayName || data.name,
        supplierType: data.supplierType,
        mobile: data.mobile,
        alternateMobile: data.alternateMobile,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        gstin: data.gstin,
        pan: data.pan,
        notes: data.notes,
        active: data.active,
        createdAt: now,
        updatedAt: now
      })
    })

    return this.getById(id)
  },

  update(id: string, payload: SupplierPayload): SupplierRecord {
    const parseResult = supplierSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid supplier payload')
    }
    const data = parseResult.data

    const existing = this.getById(id)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    transactionRepository.executeAtomic(() => {
      supplierRepository.update(id, {
        name: data.name,
        displayName: data.displayName || data.name,
        supplierType: data.supplierType,
        mobile: data.mobile,
        alternateMobile: data.alternateMobile,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        gstin: data.gstin,
        pan: data.pan,
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
    supplierRepository.softDelete(id, now)
    return { success: true }
  }
}
