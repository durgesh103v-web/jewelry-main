import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { AccountRepository, AccountRow } from '../database/repositories/AccountRepository'
import { ValidationError, NotFoundError, ConflictError } from '../ipc/errors'

const accountRepository = new AccountRepository()

const accountTypeSchema = z.enum([
  'Wholesale Customer',
  'Supplier / Karagir / Dhadi',
  'Other / Expense / Pigmi / Kharch',
  'Bank Account',
  'Retail Customer'
])

const accountSchema = z.object({
  accountName: z.string().trim().min(1, 'Account name is required').max(120),
  otherName: z.string().trim().max(120).optional().default(''),
  accountType: accountTypeSchema.default('Wholesale Customer'),
  accountGroupId: z.string().trim().min(1, 'Account group is required'),
  mobileNumber: z.string().trim().max(20).optional().default(''),
  whatsappNumber: z.string().trim().max(20).optional().default(''),
  phone2: z.string().trim().max(20).optional().default(''),
  address: z.string().trim().max(250).optional().default(''),
  city: z.string().trim().max(80).optional().default(''),
  state: z.string().trim().max(80).optional().default(''),
  pincode: z.string().trim().max(10).optional().default(''),
  email: z.string().trim().max(120).optional().default(''),
  gstNo: z.string().trim().max(30).optional().default(''),
  panNo: z.string().trim().max(30).optional().default(''),
  bankName: z.string().trim().max(100).optional().default(''),
  bankAccountNumber: z.string().trim().max(40).optional().default(''),
  bankIfsc: z.string().trim().max(20).optional().default(''),
  bankBranch: z.string().trim().max(100).optional().default(''),
  lastDate: z.string().trim().optional().default(''),
  openingGoldFine: z.coerce.number().default(0),
  openingSilverFine: z.coerce.number().default(0),
  openingCash: z.coerce.number().default(0),
  openingAnamat: z.coerce.number().default(0),
  openingBank: z.coerce.number().default(0),
  goldFineLimit: z.coerce.number().default(0),
  silverFineLimit: z.coerce.number().default(0),
  creditLimit: z.coerce.number().default(0),
  notification: z.string().trim().optional().default(''),
  active: z.boolean().default(true)
})

export type AccountPayload = z.infer<typeof accountSchema>

export type AccountRecord = {
  id: string
  accountName: string
  otherName: string
  accountType: string
  accountGroupId: string
  groupName: string
  groupType: string
  mobileNumber: string
  whatsappNumber: string
  phone2: string
  address: string
  city: string
  state: string
  pincode: string
  email: string
  gstNo: string
  panNo: string
  bankName: string
  bankAccountNumber: string
  bankIfsc: string
  bankBranch: string
  lastDate: string
  openingGoldFine: number
  openingSilverFine: number
  openingCash: number
  openingAnamat: number
  openingBank: number
  goldFineLimit: number
  silverFineLimit: number
  creditLimit: number
  notification: string
  active: boolean
  createdAt: string
  updatedAt: string
}

function mapRow(row: AccountRow): AccountRecord {
  return {
    id: row.id,
    accountName: row.account_name,
    otherName: row.other_name ?? '',
    accountType: row.account_type ?? 'Wholesale Customer',
    accountGroupId: row.account_group_id,
    groupName: row.group_name,
    groupType: row.group_type,
    mobileNumber: row.mobile_number ?? '',
    whatsappNumber: row.whatsapp_number ?? '',
    phone2: row.phone2 ?? '',
    address: row.address ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    pincode: row.pincode ?? '',
    email: row.email ?? '',
    gstNo: row.gst_no ?? '',
    panNo: row.pan_no ?? '',
    bankName: row.bank_name ?? '',
    bankAccountNumber: row.bank_account_number ?? '',
    bankIfsc: row.bank_ifsc ?? '',
    bankBranch: row.bank_branch ?? '',
    lastDate: row.last_date ?? '',
    openingGoldFine: Number(row.opening_gold_fine ?? 0),
    openingSilverFine: Number(row.opening_silver_fine ?? 0),
    openingCash: Number(row.opening_cash ?? 0),
    openingAnamat: Number(row.opening_anamat ?? 0),
    openingBank: Number(row.opening_bank ?? 0),
    goldFineLimit: Number(row.gold_fine_limit ?? 0),
    silverFineLimit: Number(row.silver_fine_limit ?? 0),
    creditLimit: Number(row.credit_limit ?? 0),
    notification: row.notification ?? '',
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const accountService = {
  list() {
    const rows = accountRepository.findAll()
    return rows.map(mapRow)
  },

  create(payload: AccountPayload) {
    const parseResult = accountSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid account payload')
    }
    const data = parseResult.data

    if (!accountRepository.groupExists(data.accountGroupId)) {
      throw new NotFoundError('Account group not found')
    }

    if (accountRepository.findDuplicate(data.accountName)) {
      throw new ConflictError('Account already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    accountRepository.insert({
      id,
      ...data,
      createdAt: now,
      updatedAt: now
    })

    return this.getById(id)
  },

  update(id: string, payload: AccountPayload) {
    const parseResult = accountSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid account payload')
    }
    const data = parseResult.data

    const existing = accountRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Account not found')
    }

    if (!accountRepository.groupExists(data.accountGroupId)) {
      throw new NotFoundError('Account group not found')
    }

    if (accountRepository.findDuplicate(data.accountName, id)) {
      throw new ConflictError('Another account with this name already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    accountRepository.update(id, {
      ...data,
      updatedAt: now
    })

    return this.getById(id)
  },

  delete(id: string) {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    accountRepository.delete(id, now)
    return { success: true }
  },

  getById(id: string) {
    const row = accountRepository.findById(id)
    if (!row) {
      throw new NotFoundError('Account not found')
    }
    return mapRow(row)
  }
}
