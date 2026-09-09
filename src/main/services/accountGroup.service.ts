import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'

const accountGroupSchema = z.object({
  groupName: z.string().trim().min(1, 'Group name is required').max(80),
  groupType: z.enum(['Customer', 'Supplier', 'Karagir', 'Cash', 'Bank', 'Expense', 'Other']),
  description: z.string().trim().max(255).optional().default(''),
  active: z.boolean().default(true)
})

type AccountGroupPayload = z.infer<typeof accountGroupSchema>

export type AccountGroupRecord = {
  id: string
  groupName: string
  groupType: string
  description: string
  active: boolean
  accountCount: number
  createdAt: string
  updatedAt: string
}

type AccountGroupRow = {
  id: string
  group_name: string
  group_type: string
  description: string | null
  active: number
  account_count?: number
  created_at: string
  updated_at: string
}

function mapRow(row: AccountGroupRow): AccountGroupRecord {
  return {
    id: row.id,
    groupName: row.group_name,
    groupType: row.group_type,
    description: row.description ?? '',
    active: Boolean(row.active),
    accountCount: Number(row.account_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const accountGroupService = {
  list() {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT
          ag.id,
          ag.group_name,
          ag.group_type,
          ag.description,
          ag.active,
          ag.created_at,
          ag.updated_at,
          COUNT(a.id) AS account_count
        FROM account_groups ag
        LEFT JOIN accounts a ON a.account_group_id = ag.id AND a.deleted_at IS NULL
        WHERE ag.deleted_at IS NULL
        GROUP BY ag.id
        ORDER BY ag.group_name ASC
      `
      )
      .all() as AccountGroupRow[]

    return rows.map(mapRow)
  },

  create(payload: AccountGroupPayload) {
    const data = accountGroupSchema.parse(payload)
    const db = getDatabase()

    const duplicate = db
      .prepare(
        `
        SELECT id
        FROM account_groups
        WHERE LOWER(group_name) = LOWER(?)
        AND deleted_at IS NULL
      `
      )
      .get(data.groupName)

    if (duplicate) {
      throw new Error('Account group already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    db.prepare(
      `
      INSERT INTO account_groups (
        id,
        group_name,
        group_type,
        description,
        active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(id, data.groupName, data.groupType, data.description, data.active ? 1 : 0, now, now)

    return this.getById(id)
  },

  update(id: string, payload: AccountGroupPayload) {
    const data = accountGroupSchema.parse(payload)
    const db = getDatabase()

    const existing = db
      .prepare(
        `
        SELECT id
        FROM account_groups
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id)

    if (!existing) {
      throw new Error('Account group not found')
    }

    const duplicate = db
      .prepare(
        `
        SELECT id
        FROM account_groups
        WHERE LOWER(group_name) = LOWER(?)
        AND id != ?
        AND deleted_at IS NULL
      `
      )
      .get(data.groupName, id)

    if (duplicate) {
      throw new Error('Another account group with this name already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE account_groups
      SET
        group_name = ?,
        group_type = ?,
        description = ?,
        active = ?,
        updated_at = ?
      WHERE id = ?
    `
    ).run(data.groupName, data.groupType, data.description, data.active ? 1 : 0, now, id)

    return this.getById(id)
  },

  delete(id: string) {
    const db = getDatabase()

    const existing = db
      .prepare(
        `
        SELECT id, group_name
        FROM account_groups
        WHERE id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id) as { id: string; group_name: string } | undefined

    if (!existing) {
      throw new Error('Account group not found')
    }

    // Safety check: ensure no active accounts are linked to this group
    const linkRow = db
      .prepare(
        `
        SELECT COUNT(*) AS count
        FROM accounts
        WHERE account_group_id = ?
        AND deleted_at IS NULL
      `
      )
      .get(id) as { count: number } | undefined

    if (linkRow && linkRow.count > 0) {
      throw new Error(
        `Cannot delete "${existing.group_name}" because ${linkRow.count} active account(s) are linked to it. Please reassign or delete those accounts first.`
      )
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE account_groups
      SET deleted_at = ?, updated_at = ?
      WHERE id = ?
      AND deleted_at IS NULL
    `
    ).run(now, now, id)

    return { success: true }
  },

  getById(id: string) {
    const db = getDatabase()

    const row = db
      .prepare(
        `
        SELECT
          ag.id,
          ag.group_name,
          ag.group_type,
          ag.description,
          ag.active,
          ag.created_at,
          ag.updated_at,
          COUNT(a.id) AS account_count
        FROM account_groups ag
        LEFT JOIN accounts a ON a.account_group_id = ag.id AND a.deleted_at IS NULL
        WHERE ag.id = ?
        AND ag.deleted_at IS NULL
        GROUP BY ag.id
      `
      )
      .get(id) as AccountGroupRow | undefined

    if (!row) {
      throw new Error('Account group not found')
    }

    return mapRow(row)
  }
}
