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

const settlementSchema = z.object({
  settlementDate: z.string().trim().min(1, 'Settlement date is required'),
  accountId: z.string().trim().min(1, 'Account is required'),
  metalType: z.enum(['Gold', 'Silver']).default('Gold'),
  goldFine: z.coerce.number().default(0),
  silverFine: z.coerce.number().default(0),
  cash: z.coerce.number().default(0),
  bank: z.coerce.number().default(0),
  anamat: z.coerce.number().default(0),
  narration: z.string().trim().optional().default('')
})

export type SettlementPayload = z.infer<typeof settlementSchema>

type SettlementRow = {
  id: string
  settlement_no: string
  settlement_date: string
  account_id: string
  account_name: string
  metal_type: string
  gold_fine: number
  silver_fine: number
  cash: number
  bank: number
  anamat: number
  narration: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: SettlementRow) {
  return {
    id: row.id,
    settlementNo: row.settlement_no,
    settlementDate: row.settlement_date,
    accountId: row.account_id,
    accountName: row.account_name,
    metalType: row.metal_type,
    goldFine: Number(row.gold_fine ?? 0),
    silverFine: Number(row.silver_fine ?? 0),
    cash: Number(row.cash ?? 0),
    bank: Number(row.bank ?? 0),
    anamat: Number(row.anamat ?? 0),
    narration: row.narration ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function getNextSettlementNo(): string {
  const db = getDatabase()
  const row = db
    .prepare(
      `
      SELECT MAX(CAST(SUBSTR(settlement_no, 4) AS INTEGER)) AS max_num
      FROM settlements
      WHERE settlement_no LIKE 'ST-%'
    `
    )
    .get() as { max_num: number | null } | undefined

  const maxNumber = Number(row?.max_num ?? 0)
  return `ST-${String(maxNumber + 1).padStart(4, '0')}`
}

function postSettlementLedger(input: {
  settlementId: string
  settlementNo: string
  settlementDate: string
  accountId: string
  goldFine: number
  silverFine: number
  cash: number
  bank: number
  anamat: number
  narration: string
  createdAt: string
}): void {
  const narration = input.narration || `Settlement ${input.settlementNo}`

  if (input.goldFine > 0) {
    accountLedgerRepository.insert({
      id: uuidv4(),
      sourceType: 'SETTLEMENT',
      sourceId: input.settlementId,
      entryDate: input.settlementDate,
      accountId: input.accountId,
      metalType: 'Gold',
      fineJama: input.goldFine,
      narration,
      createdAt: input.createdAt
    })
  }

  if (input.silverFine > 0) {
    accountLedgerRepository.insert({
      id: uuidv4(),
      sourceType: 'SETTLEMENT',
      sourceId: input.settlementId,
      entryDate: input.settlementDate,
      accountId: input.accountId,
      metalType: 'Silver',
      fineJama: input.silverFine,
      narration,
      createdAt: input.createdAt
    })
  }

  if (input.cash > 0) {
    accountLedgerRepository.insert({
      id: uuidv4(),
      sourceType: 'SETTLEMENT',
      sourceId: input.settlementId,
      entryDate: input.settlementDate,
      accountId: input.accountId,
      cashJama: input.cash,
      narration,
      createdAt: input.createdAt
    })
  }

  if (input.bank > 0) {
    accountLedgerRepository.insert({
      id: uuidv4(),
      sourceType: 'SETTLEMENT',
      sourceId: input.settlementId,
      entryDate: input.settlementDate,
      accountId: input.accountId,
      bankJama: input.bank,
      narration,
      createdAt: input.createdAt
    })
  }

  if (input.anamat > 0) {
    accountLedgerRepository.insert({
      id: uuidv4(),
      sourceType: 'SETTLEMENT',
      sourceId: input.settlementId,
      entryDate: input.settlementDate,
      accountId: input.accountId,
      anamatJama: input.anamat,
      narration,
      createdAt: input.createdAt
    })
  }
}

export const settlementService = {
  getNextNumber() {
    return getNextSettlementNo()
  },

  create(payload: SettlementPayload) {
    const parseResult = settlementSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid settlement payload')
    }
    const data = parseResult.data

    const total = data.goldFine + data.silverFine + data.cash + data.bank + data.anamat
    if (total <= 0) {
      throw new ValidationError('Enter at least one settlement amount')
    }

    const account = accountRepository.findById(data.accountId)
    if (!account) {
      throw new NotFoundError('Account not found')
    }

    const db = getDatabase()
    const id = uuidv4()
    const settlementNo = getNextSettlementNo()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    transactionRepository.executeAtomic(() => {
      db.prepare(
        `INSERT INTO settlements (
          id, settlement_no, settlement_date, account_id, metal_type,
          gold_fine, silver_fine, cash, bank, anamat, narration, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        settlementNo,
        data.settlementDate,
        data.accountId,
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

      postSettlementLedger({
        settlementId: id,
        settlementNo,
        settlementDate: data.settlementDate,
        accountId: data.accountId,
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
    const rows = db
      .prepare(
        `SELECT
          s.id, s.settlement_no, s.settlement_date, s.account_id,
          a.account_name, s.metal_type, s.gold_fine, s.silver_fine,
          s.cash, s.bank, s.anamat, s.narration, s.created_at, s.updated_at
        FROM settlements s
        INNER JOIN accounts a ON a.id = s.account_id
        WHERE s.deleted_at IS NULL
        ORDER BY s.settlement_date DESC, s.created_at DESC`
      )
      .all() as SettlementRow[]

    return rows.map(mapRow)
  },

  getById(id: string) {
    const db = getDatabase()
    const row = db
      .prepare(
        `SELECT
          s.id, s.settlement_no, s.settlement_date, s.account_id,
          a.account_name, s.metal_type, s.gold_fine, s.silver_fine,
          s.cash, s.bank, s.anamat, s.narration, s.created_at, s.updated_at
        FROM settlements s
        INNER JOIN accounts a ON a.id = s.account_id
        WHERE s.id = ? AND s.deleted_at IS NULL`
      )
      .get(id) as SettlementRow | undefined

    if (!row) throw new NotFoundError('Settlement not found')

    return mapRow(row)
  },

  delete(id: string) {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    this.getById(id)

    transactionRepository.executeAtomic(() => {
      db.prepare(`UPDATE settlements SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`).run(
        now,
        now,
        id
      )

      accountLedgerRepository.deleteBySource('SETTLEMENT', id)
    })

    return { success: true }
  }
}
