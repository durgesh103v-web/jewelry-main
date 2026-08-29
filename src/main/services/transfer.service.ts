import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'
import { AccountRepository } from '../database/repositories/AccountRepository'
import { AccountLedgerRepository } from '../database/repositories/AccountLedgerRepository'
import { TransactionRepository } from '../database/repositories/TransactionRepository'
import { ValidationError, NotFoundError } from '../ipc/errors'

const accountRepository = new AccountRepository()
const accountLedgerRepository = new AccountLedgerRepository()
const transactionRepository = new TransactionRepository()

const transferSchema = z.object({
  transferDate: z.string().trim().min(1, 'Transfer date is required'),
  fromAccountId: z.string().trim().min(1, 'From account is required'),
  toAccountId: z.string().trim().min(1, 'To account is required'),
  metalType: z.string().trim().optional().default(''),
  goldFine: z.coerce.number().default(0),
  silverFine: z.coerce.number().default(0),
  cash: z.coerce.number().default(0),
  bank: z.coerce.number().default(0),
  anamat: z.coerce.number().default(0),
  narration: z.string().trim().optional().default('')
})

export type TransferPayload = z.infer<typeof transferSchema>

function getNextTransferNo(): string {
  const db = getDatabase()
  const rows = db
    .prepare(`SELECT transfer_no FROM transfers ORDER BY created_at DESC`)
    .all() as { transfer_no: string }[]

  const maxNumber = rows.reduce((max, row) => {
    const clean = String(row.transfer_no || '').replace('TR-', '')
    const parsed = Number(clean)
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max
  }, 0)

  return `TR-${String(maxNumber + 1).padStart(4, '0')}`
}

function postLedgerPair(input: {
  transferId: string
  transferNo: string
  transferDate: string
  fromAccountId: string
  toAccountId: string
  metalType: string
  goldFine: number
  silverFine: number
  cash: number
  bank: number
  anamat: number
  narration: string
  createdAt: string
}): void {
  const narration = input.narration || `Transfer ${input.transferNo}`

  if (input.goldFine > 0) {
    accountLedgerRepository.insert({
      id: uuidv4(),
      sourceType: 'TRANSFER_OUT',
      sourceId: input.transferId,
      entryDate: input.transferDate,
      accountId: input.fromAccountId,
      metalType: 'Gold',
      fineNave: input.goldFine,
      narration,
      createdAt: input.createdAt
    })
    accountLedgerRepository.insert({
      id: uuidv4(),
      sourceType: 'TRANSFER_IN',
      sourceId: input.transferId,
      entryDate: input.transferDate,
      accountId: input.toAccountId,
      metalType: 'Gold',
      fineJama: input.goldFine,
      narration,
      createdAt: input.createdAt
    })
  }

  if (input.silverFine > 0) {
    accountLedgerRepository.insert({
      id: uuidv4(),
      sourceType: 'TRANSFER_OUT',
      sourceId: input.transferId,
      entryDate: input.transferDate,
      accountId: input.fromAccountId,
      metalType: 'Silver',
      fineNave: input.silverFine,
      narration,
      createdAt: input.createdAt
    })
    accountLedgerRepository.insert({
      id: uuidv4(),
      sourceType: 'TRANSFER_IN',
      sourceId: input.transferId,
      entryDate: input.transferDate,
      accountId: input.toAccountId,
      metalType: 'Silver',
      fineJama: input.silverFine,
      narration,
      createdAt: input.createdAt
    })
  }

  if (input.cash > 0) {
    accountLedgerRepository.insert({
      id: uuidv4(),
      sourceType: 'TRANSFER_OUT',
      sourceId: input.transferId,
      entryDate: input.transferDate,
      accountId: input.fromAccountId,
      cashNave: input.cash,
      narration,
      createdAt: input.createdAt
    })
    accountLedgerRepository.insert({
      id: uuidv4(),
      sourceType: 'TRANSFER_IN',
      sourceId: input.transferId,
      entryDate: input.transferDate,
      accountId: input.toAccountId,
      cashJama: input.cash,
      narration,
      createdAt: input.createdAt
    })
  }

  if (input.bank > 0) {
    accountLedgerRepository.insert({
      id: uuidv4(),
      sourceType: 'TRANSFER_OUT',
      sourceId: input.transferId,
      entryDate: input.transferDate,
      accountId: input.fromAccountId,
      bankNave: input.bank,
      narration,
      createdAt: input.createdAt
    })
    accountLedgerRepository.insert({
      id: uuidv4(),
      sourceType: 'TRANSFER_IN',
      sourceId: input.transferId,
      entryDate: input.transferDate,
      accountId: input.toAccountId,
      bankJama: input.bank,
      narration,
      createdAt: input.createdAt
    })
  }

  if (input.anamat > 0) {
    accountLedgerRepository.insert({
      id: uuidv4(),
      sourceType: 'TRANSFER_OUT',
      sourceId: input.transferId,
      entryDate: input.transferDate,
      accountId: input.fromAccountId,
      anamatNave: input.anamat,
      narration,
      createdAt: input.createdAt
    })
    accountLedgerRepository.insert({
      id: uuidv4(),
      sourceType: 'TRANSFER_IN',
      sourceId: input.transferId,
      entryDate: input.transferDate,
      accountId: input.toAccountId,
      anamatJama: input.anamat,
      narration,
      createdAt: input.createdAt
    })
  }
}

export const transferService = {
  getNextNumber() {
    return getNextTransferNo()
  },

  create(payload: TransferPayload) {
    const parseResult = transferSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid transfer payload')
    }
    const data = parseResult.data

    if (data.fromAccountId === data.toAccountId) {
      throw new ValidationError('From and To accounts must be different')
    }

    const total =
      data.goldFine + data.silverFine + data.cash + data.bank + data.anamat
    if (total <= 0) {
      throw new ValidationError('Enter at least one transfer amount')
    }

    const fromAcc = accountRepository.findById(data.fromAccountId)
    if (!fromAcc) throw new NotFoundError('From account not found')

    const toAcc = accountRepository.findById(data.toAccountId)
    if (!toAcc) throw new NotFoundError('To account not found')

    const db = getDatabase()
    const id = uuidv4()
    const transferNo = getNextTransferNo()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    transactionRepository.executeAtomic(() => {
      db.prepare(
        `INSERT INTO transfers (
          id, transfer_no, transfer_date, from_account_id, to_account_id,
          metal_type, gold_fine, silver_fine, cash, bank, anamat, narration,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        transferNo,
        data.transferDate,
        data.fromAccountId,
        data.toAccountId,
        data.metalType,
        data.goldFine,
        data.silverFine,
        data.cash,
        data.bank,
        data.anamat,
        data.narration,
        now,
        now
      )

      postLedgerPair({
        transferId: id,
        transferNo,
        transferDate: data.transferDate,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        metalType: data.metalType,
        goldFine: data.goldFine,
        silverFine: data.silverFine,
        cash: data.cash,
        bank: data.bank,
        anamat: data.anamat,
        narration: data.narration,
        createdAt: now
      })
    })

    return this.getById(id)
  },

  list() {
    const db = getDatabase()
    return db
      .prepare(
        `SELECT t.id, t.transfer_no AS transferNo, t.transfer_date AS transferDate,
                t.from_account_id AS fromAccountId, fa.account_name AS fromAccountName,
                t.to_account_id AS toAccountId, ta.account_name AS toAccountName,
                t.metal_type AS metalType, t.gold_fine AS goldFine, t.silver_fine AS silverFine,
                t.cash, t.bank, t.anamat, t.narration, t.created_at AS createdAt
         FROM transfers t
         INNER JOIN accounts fa ON fa.id = t.from_account_id
         INNER JOIN accounts ta ON ta.id = t.to_account_id
         WHERE t.deleted_at IS NULL
         ORDER BY t.transfer_date DESC, t.created_at DESC`
      )
      .all()
  },

  getById(id: string) {
    const db = getDatabase()
    const row = db
      .prepare(
        `SELECT t.id, t.transfer_no AS transferNo, t.transfer_date AS transferDate,
                t.from_account_id AS fromAccountId, fa.account_name AS fromAccountName,
                t.to_account_id AS toAccountId, ta.account_name AS toAccountName,
                t.metal_type AS metalType, t.gold_fine AS goldFine, t.silver_fine AS silverFine,
                t.cash, t.bank, t.anamat, t.narration, t.created_at AS createdAt
         FROM transfers t
         INNER JOIN accounts fa ON fa.id = t.from_account_id
         INNER JOIN accounts ta ON ta.id = t.to_account_id
         WHERE t.id = ? AND t.deleted_at IS NULL`
      )
      .get(id)

    if (!row) throw new NotFoundError('Transfer not found')
    return row
  },

  delete(id: string) {
    this.getById(id)
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    transactionRepository.executeAtomic(() => {
      db.prepare(`UPDATE transfers SET deleted_at = ?, updated_at = ? WHERE id = ?`).run(now, now, id)
      accountLedgerRepository.deleteBySource(['TRANSFER_IN', 'TRANSFER_OUT'], id)
    })

    return { success: true }
  }
}
