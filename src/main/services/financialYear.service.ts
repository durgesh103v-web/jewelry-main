import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'
import { TransactionRepository } from '../database/repositories/TransactionRepository'
import { ValidationError, NotFoundError, ConflictError } from '../ipc/errors'

const transactionRepository = new TransactionRepository()

const financialYearSchema = z
  .object({
    yearLabel: z.string().trim().min(1, 'Financial year label is required').max(20),
    startDate: z.string().trim().min(1, 'Start date is required'),
    endDate: z.string().trim().min(1, 'End date is required'),
    narration: z.string().trim().max(255).optional().default('')
  })
  .refine((data) => data.startDate < data.endDate, {
    message: 'Start date must be before end date',
    path: ['endDate']
  })

export type FinancialYearPayload = z.infer<typeof financialYearSchema>

export type FinancialYearRecord = {
  id: string
  yearLabel: string
  startDate: string
  endDate: string
  isCurrent: boolean
  isClosed: boolean
  narration: string
  createdAt: string
  updatedAt: string
}

type FinancialYearRow = {
  id: string
  year_label: string
  start_date: string
  end_date: string
  is_current: number
  is_closed: number
  narration: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: FinancialYearRow): FinancialYearRecord {
  return {
    id: row.id,
    yearLabel: row.year_label,
    startDate: row.start_date,
    endDate: row.end_date,
    isCurrent: Boolean(row.is_current),
    isClosed: Boolean(row.is_closed),
    narration: row.narration ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const financialYearService = {
  list(): FinancialYearRecord[] {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT id, year_label, start_date, end_date, is_current, is_closed, narration, created_at, updated_at
        FROM financial_years
        ORDER BY start_date DESC
      `
      )
      .all() as FinancialYearRow[]

    return rows.map(mapRow)
  },

  getCurrent(): FinancialYearRecord | null {
    const db = getDatabase()

    const row = db
      .prepare(
        `
        SELECT id, year_label, start_date, end_date, is_current, is_closed, narration, created_at, updated_at
        FROM financial_years
        WHERE is_current = 1
      `
      )
      .get() as FinancialYearRow | undefined

    return row ? mapRow(row) : null
  },

  create(payload: FinancialYearPayload): FinancialYearRecord {
    const parseResult = financialYearSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid financial year payload')
    }
    const data = parseResult.data
    const db = getDatabase()

    const duplicate = db
      .prepare(`SELECT id FROM financial_years WHERE LOWER(year_label) = LOWER(?)`)
      .get(data.yearLabel)

    if (duplicate) {
      throw new ConflictError('This financial year already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()
    const isFirst = (db.prepare(`SELECT COUNT(*) AS count FROM financial_years`).get() as {
      count: number
    }).count === 0

    db.prepare(
      `
      INSERT INTO financial_years (
        id, year_label, start_date, end_date, is_current, is_closed, narration, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
    `
    ).run(id, data.yearLabel, data.startDate, data.endDate, isFirst ? 1 : 0, data.narration, now, now)

    return this.getById(id)
  },

  update(id: string, payload: FinancialYearPayload): FinancialYearRecord {
    const parseResult = financialYearSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid financial year payload')
    }
    const data = parseResult.data
    const db = getDatabase()

    const existing = db.prepare(`SELECT id FROM financial_years WHERE id = ?`).get(id)
    if (!existing) {
      throw new NotFoundError('Financial year not found')
    }

    const duplicate = db
      .prepare(`SELECT id FROM financial_years WHERE LOWER(year_label) = LOWER(?) AND id != ?`)
      .get(data.yearLabel, id)

    if (duplicate) {
      throw new ConflictError('Another financial year with this label already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE financial_years
      SET year_label = ?, start_date = ?, end_date = ?, narration = ?, updated_at = ?
      WHERE id = ?
    `
    ).run(data.yearLabel, data.startDate, data.endDate, data.narration, now, id)

    return this.getById(id)
  },

  setCurrent(id: string): FinancialYearRecord {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const existing = db.prepare(`SELECT id, is_closed FROM financial_years WHERE id = ?`).get(id) as
      | { id: string; is_closed: number }
      | undefined

    if (!existing) {
      throw new NotFoundError('Financial year not found')
    }

    if (existing.is_closed) {
      throw new ValidationError('Cannot set a closed financial year as current')
    }

    transactionRepository.executeAtomic(() => {
      db.prepare(`UPDATE financial_years SET is_current = 0, updated_at = ?`).run(now)
      db.prepare(`UPDATE financial_years SET is_current = 1, updated_at = ? WHERE id = ?`).run(
        now,
        id
      )
    })

    return this.getById(id)
  },

  toggleClosed(id: string, isClosed: boolean): FinancialYearRecord {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const existing = db.prepare(`SELECT id, is_current FROM financial_years WHERE id = ?`).get(id) as
      | { id: string; is_current: number }
      | undefined

    if (!existing) {
      throw new NotFoundError('Financial year not found')
    }

    if (isClosed && existing.is_current) {
      throw new ValidationError('Cannot close the current financial year. Set another year as current first.')
    }

    db.prepare(`UPDATE financial_years SET is_closed = ?, updated_at = ? WHERE id = ?`).run(
      isClosed ? 1 : 0,
      now,
      id
    )

    return this.getById(id)
  },

  delete(id: string): { success: boolean } {
    const db = getDatabase()

    const existing = db.prepare(`SELECT id, is_current FROM financial_years WHERE id = ?`).get(
      id
    ) as { id: string; is_current: number } | undefined

    if (!existing) {
      throw new NotFoundError('Financial year not found')
    }

    if (existing.is_current) {
      throw new ValidationError('Cannot delete the current financial year')
    }

    db.prepare(`DELETE FROM financial_years WHERE id = ?`).run(id)

    return { success: true }
  },

  getById(id: string): FinancialYearRecord {
    const db = getDatabase()

    const row = db
      .prepare(
        `
        SELECT id, year_label, start_date, end_date, is_current, is_closed, narration, created_at, updated_at
        FROM financial_years
        WHERE id = ?
      `
      )
      .get(id) as FinancialYearRow | undefined

    if (!row) {
      throw new NotFoundError('Financial year not found')
    }

    return mapRow(row)
  }
}
