import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'
import { AccountRepository } from '../database/repositories/AccountRepository'
import { AccountLedgerRepository } from '../database/repositories/AccountLedgerRepository'
import { TransactionRepository } from '../database/repositories/TransactionRepository'
import { ValidationError, NotFoundError } from '../ipc/errors'
import type {
  CashVoucher,
  CashVoucherFilter,
  CashVoucherPayload,
  CashVoucherType
} from '../../shared/types/cashVoucher'

const accountRepository = new AccountRepository()
const accountLedgerRepository = new AccountLedgerRepository()
const transactionRepository = new TransactionRepository()

type RawCashVoucherPayload = CashVoucherPayload & {
  id?: string
  voucher_type?: CashVoucherType
  voucher_date?: string
  account_id?: string
}

type RawCashVoucherFilter = CashVoucherFilter & {
  voucher_type?: CashVoucherType | 'ALL'
  account_id?: string
}

type CashVoucherRow = {
  id: string
  voucher_type: CashVoucherType
  voucher_no: string
  voucher_date: string
  account_id: string
  account_name: string | null
  amount: number
  narration: string | null
  created_at: string
  updated_at: string
}

const cashVoucherSchema = z.object({
  voucherType: z.enum(['RECEIPT', 'PAYMENT']),
  voucherDate: z.string().trim().min(1, 'Voucher date is required'),
  accountId: z.string().trim().min(1, 'Account is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  narration: z.string().trim().optional().default('')
})

function normalizePayload(payload: RawCashVoucherPayload): CashVoucherPayload {
  return {
    voucherType: payload.voucherType ?? payload.voucher_type ?? 'RECEIPT',
    voucherDate: payload.voucherDate ?? payload.voucher_date ?? '',
    accountId: payload.accountId ?? payload.account_id ?? '',
    amount: payload.amount,
    narration: payload.narration ?? ''
  }
}

function normalizeFilter(filter: RawCashVoucherFilter = {}): CashVoucherFilter {
  return {
    fromDate: filter.fromDate,
    toDate: filter.toDate,
    voucherType: filter.voucherType ?? filter.voucher_type ?? 'ALL',
    accountId: filter.accountId ?? filter.account_id ?? ''
  }
}

function mapRow(row: CashVoucherRow): CashVoucher {
  return {
    id: row.id,
    voucherType: row.voucher_type,
    voucherNo: row.voucher_no,
    voucherDate: row.voucher_date,
    accountId: row.account_id,
    accountName: row.account_name ?? '',
    amount: Number(row.amount ?? 0),
    narration: row.narration ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function getNextVoucherNo(voucherType: CashVoucherType): string {
  const db = getDatabase()
  const prefix = voucherType === 'RECEIPT' ? 'CR' : 'CP'

  const rows = db
    .prepare(
      `
      SELECT voucher_no
      FROM cash_vouchers
      WHERE voucher_type = ?
      ORDER BY created_at DESC
    `
    )
    .all(voucherType) as { voucher_no: string }[]

  const maxNumber = rows.reduce((max, row) => {
    const cleanVoucherNo = String(row.voucher_no || '').trim()
    const numberPart = cleanVoucherNo.startsWith(`${prefix}-`)
      ? cleanVoucherNo.replace(`${prefix}-`, '')
      : '0'
    const parsed = Number(numberPart)

    return Number.isFinite(parsed) ? Math.max(max, parsed) : max
  }, 0)

  return `${prefix}-${String(maxNumber + 1).padStart(4, '0')}`
}

function postLedgerEntry(input: {
  voucherId: string
  voucherType: CashVoucherType
  voucherNo: string
  voucherDate: string
  accountId: string
  amount: number
  narration: string
  createdAt: string
}): void {
  const sourceType = input.voucherType === 'RECEIPT' ? 'CASH_RECEIPT' : 'CASH_PAYMENT'
  const cashJama = input.voucherType === 'RECEIPT' ? input.amount : 0
  const cashNave = input.voucherType === 'PAYMENT' ? input.amount : 0
  const label = input.voucherType === 'RECEIPT' ? 'Cash Receipt' : 'Cash Payment'
  const narration = input.narration || `${label} ${input.voucherNo}`

  accountLedgerRepository.insert({
    id: uuidv4(),
    sourceType,
    sourceId: input.voucherId,
    entryDate: input.voucherDate,
    accountId: input.accountId,
    cashJama,
    cashNave,
    narration,
    createdAt: input.createdAt
  })
}

export const cashVoucherService = {
  getNextVoucherNo(voucherType: CashVoucherType) {
    return getNextVoucherNo(voucherType)
  },

  create(payload: RawCashVoucherPayload) {
    const parseResult = cashVoucherSchema.safeParse(normalizePayload(payload))
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid cash voucher payload')
    }
    const data = parseResult.data

    const account = accountRepository.findById(data.accountId)
    if (!account) {
      throw new NotFoundError('Account not found')
    }

    const db = getDatabase()
    const id = uuidv4()
    const voucherNo = getNextVoucherNo(data.voucherType)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    transactionRepository.executeAtomic(() => {
      db.prepare(
        `
        INSERT INTO cash_vouchers (
          id, voucher_type, voucher_no, voucher_date, account_id,
          amount, narration, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        id,
        data.voucherType,
        voucherNo,
        data.voucherDate,
        data.accountId,
        data.amount,
        data.narration,
        now,
        now
      )

      postLedgerEntry({
        voucherId: id,
        voucherType: data.voucherType,
        voucherNo,
        voucherDate: data.voucherDate,
        accountId: data.accountId,
        amount: data.amount,
        narration: data.narration,
        createdAt: now
      })
    })

    return this.getById(id)
  },

  update(id: string, payload: RawCashVoucherPayload) {
    const parseResult = cashVoucherSchema.safeParse(normalizePayload(payload))
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid cash voucher payload')
    }
    const data = parseResult.data

    const account = accountRepository.findById(data.accountId)
    if (!account) {
      throw new NotFoundError('Account not found')
    }

    const existing = this.getById(id)
    const voucherNo =
      existing.voucherType === data.voucherType
        ? existing.voucherNo
        : getNextVoucherNo(data.voucherType)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const db = getDatabase()

    transactionRepository.executeAtomic(() => {
      db.prepare(
        `
        UPDATE cash_vouchers
        SET
          voucher_type = ?, voucher_no = ?, voucher_date = ?,
          account_id = ?, amount = ?, narration = ?, updated_at = ?
        WHERE id = ?
        AND deleted_at IS NULL
      `
      ).run(
        data.voucherType,
        voucherNo,
        data.voucherDate,
        data.accountId,
        data.amount,
        data.narration,
        now,
        id
      )

      accountLedgerRepository.deleteBySource(['CASH_RECEIPT', 'CASH_PAYMENT'], id)

      postLedgerEntry({
        voucherId: id,
        voucherType: data.voucherType,
        voucherNo,
        voucherDate: data.voucherDate,
        accountId: data.accountId,
        amount: data.amount,
        narration: data.narration,
        createdAt: now
      })
    })

    return this.getById(id)
  },

  delete(id: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    this.getById(id)

    transactionRepository.executeAtomic(() => {
      db.prepare(
        `
        UPDATE cash_vouchers
        SET deleted_at = ?, updated_at = ?
        WHERE id = ?
        AND deleted_at IS NULL
      `
      ).run(now, now, id)

      accountLedgerRepository.deleteBySource(['CASH_RECEIPT', 'CASH_PAYMENT'], id)
    })

    return { success: true }
  },

  getById(id: string): CashVoucher {
    const db = getDatabase()

    const row = db
      .prepare(
        `
        SELECT
          cv.id, cv.voucher_type, cv.voucher_no, cv.voucher_date,
          cv.account_id, a.account_name, cv.amount, cv.narration,
          cv.created_at, cv.updated_at
        FROM cash_vouchers cv
        INNER JOIN accounts a ON a.id = cv.account_id
        WHERE cv.id = ?
        AND cv.deleted_at IS NULL
      `
      )
      .get(id) as CashVoucherRow | undefined

    if (!row) {
      throw new NotFoundError('Cash voucher not found')
    }

    return mapRow(row)
  },

  list(filterPayload: RawCashVoucherFilter = {}): CashVoucher[] {
    const db = getDatabase()
    const filter = normalizeFilter(filterPayload)
    const conditions = ['cv.deleted_at IS NULL']
    const params: unknown[] = []

    if (filter.fromDate) {
      conditions.push('cv.voucher_date >= ?')
      params.push(filter.fromDate)
    }

    if (filter.toDate) {
      conditions.push('cv.voucher_date <= ?')
      params.push(filter.toDate)
    }

    if (filter.voucherType && filter.voucherType !== 'ALL') {
      conditions.push('cv.voucher_type = ?')
      params.push(filter.voucherType)
    }

    if (filter.accountId) {
      conditions.push('cv.account_id = ?')
      params.push(filter.accountId)
    }

    const rows = db
      .prepare(
        `
        SELECT
          cv.id, cv.voucher_type, cv.voucher_no, cv.voucher_date,
          cv.account_id, a.account_name, cv.amount, cv.narration,
          cv.created_at, cv.updated_at
        FROM cash_vouchers cv
        INNER JOIN accounts a ON a.id = cv.account_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY cv.voucher_date DESC, cv.created_at DESC
      `
      )
      .all(...params) as CashVoucherRow[]

    return rows.map(mapRow)
  }
}
