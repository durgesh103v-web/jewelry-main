import { BaseRepository } from './BaseRepository'
import type { CustomerRecord } from '../../../shared/types/customer'

export interface CustomerRow {
  id: string
  customer_code: string
  account_id: string | null
  account_name: string | null
  name: string
  display_name: string | null
  mobile: string | null
  alternate_mobile: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  date_of_birth: string | null
  anniversary_date: string | null
  gstin: string | null
  pan: string | null
  preferred_metal: string | null
  preferred_purity: string | null
  notes: string | null
  active: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

const customerSelectSql = `
  SELECT
    c.id,
    c.customer_code,
    c.account_id,
    a.account_name,
    c.name,
    c.display_name,
    c.mobile,
    c.alternate_mobile,
    c.email,
    c.address,
    c.city,
    c.state,
    c.pincode,
    c.date_of_birth,
    c.anniversary_date,
    c.gstin,
    c.pan,
    c.preferred_metal,
    c.preferred_purity,
    c.notes,
    c.active,
    c.created_at,
    c.updated_at,
    c.deleted_at
  FROM customers c
  LEFT JOIN accounts a ON a.id = c.account_id
`

function mapRow(row: CustomerRow): CustomerRecord {
  return {
    id: row.id,
    customerCode: row.customer_code,
    accountId: row.account_id,
    accountName: row.account_name ?? null,
    name: row.name,
    displayName: row.display_name,
    mobile: row.mobile,
    alternateMobile: row.alternate_mobile,
    email: row.email,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    dateOfBirth: row.date_of_birth,
    anniversaryDate: row.anniversary_date,
    gstin: row.gstin,
    pan: row.pan,
    preferredMetal: row.preferred_metal ?? 'Gold',
    preferredPurity: row.preferred_purity ?? '',
    notes: row.notes ?? '',
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

export class CustomerRepository extends BaseRepository {
  findAll(filter?: { activeOnly?: boolean; city?: string; state?: string }): CustomerRecord[] {
    const conditions = ['c.deleted_at IS NULL']
    const params: unknown[] = []

    if (filter?.activeOnly !== false) {
      conditions.push('c.active = 1')
    }

    if (filter?.city) {
      conditions.push('LOWER(c.city) = LOWER(?)')
      params.push(filter.city)
    }

    if (filter?.state) {
      conditions.push('LOWER(c.state) = LOWER(?)')
      params.push(filter.state)
    }

    const rows = this.db
      .prepare(
        `
        ${customerSelectSql}
        WHERE ${conditions.join(' AND ')}
        ORDER BY c.name ASC
      `
      )
      .all(...params) as CustomerRow[]

    return rows.map(mapRow)
  }

  findById(id: string): CustomerRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${customerSelectSql}
        WHERE c.id = ? AND c.deleted_at IS NULL
      `
      )
      .get(id) as CustomerRow | undefined

    return row ? mapRow(row) : undefined
  }

  findByCode(code: string): CustomerRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${customerSelectSql}
        WHERE LOWER(c.customer_code) = LOWER(?) AND c.deleted_at IS NULL
      `
      )
      .get(code) as CustomerRow | undefined

    return row ? mapRow(row) : undefined
  }

  findByAccountId(accountId: string): CustomerRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${customerSelectSql}
        WHERE c.account_id = ? AND c.deleted_at IS NULL
      `
      )
      .get(accountId) as CustomerRow | undefined

    return row ? mapRow(row) : undefined
  }

  search(query: string, limit = 50): CustomerRecord[] {
    const pattern = `%${query.trim().toLowerCase()}%`
    const rows = this.db
      .prepare(
        `
        ${customerSelectSql}
        WHERE c.deleted_at IS NULL
        AND (
          LOWER(c.name) LIKE ?
          OR LOWER(c.customer_code) LIKE ?
          OR c.mobile LIKE ?
          OR LOWER(COALESCE(c.city, '')) LIKE ?
          OR LOWER(COALESCE(c.email, '')) LIKE ?
          OR LOWER(COALESCE(a.account_name, '')) LIKE ?
        )
        ORDER BY c.name ASC
        LIMIT ?
      `
      )
      .all(pattern, pattern, pattern, pattern, pattern, pattern, limit) as CustomerRow[]

    return rows.map(mapRow)
  }

  getNextCode(): string {
    const rows = this.db
      .prepare(`SELECT customer_code FROM customers ORDER BY created_at DESC`)
      .all() as { customer_code: string }[]

    const maxNumber = rows.reduce((max, row) => {
      const clean = String(row.customer_code || '').trim()
      const numberPart = clean.startsWith('CUST-') ? clean.replace('CUST-', '') : '0'
      const parsed = Number(numberPart)
      return Number.isFinite(parsed) ? Math.max(max, parsed) : max
    }, 0)

    return `CUST-${String(maxNumber + 1).padStart(4, '0')}`
  }

  insert(data: {
    id: string
    customerCode: string
    accountId?: string | null
    name: string
    displayName?: string | null
    mobile?: string | null
    alternateMobile?: string | null
    email?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    pincode?: string | null
    dateOfBirth?: string | null
    anniversaryDate?: string | null
    gstin?: string | null
    pan?: string | null
    preferredMetal?: string | null
    preferredPurity?: string | null
    notes?: string | null
    active?: boolean
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO customers (
          id, customer_code, account_id, name, display_name, mobile,
          alternate_mobile, email, address, city, state, pincode,
          date_of_birth, anniversary_date, gstin, pan, preferred_metal,
          preferred_purity, notes, active, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.customerCode,
        data.accountId ?? null,
        data.name,
        data.displayName ?? data.name,
        data.mobile ?? null,
        data.alternateMobile ?? null,
        data.email ?? null,
        data.address ?? null,
        data.city ?? null,
        data.state ?? null,
        data.pincode ?? null,
        data.dateOfBirth ?? null,
        data.anniversaryDate ?? null,
        data.gstin ?? null,
        data.pan ?? null,
        data.preferredMetal ?? 'Gold',
        data.preferredPurity ?? null,
        data.notes ?? '',
        data.active !== false ? 1 : 0,
        data.createdAt,
        data.updatedAt
      )
  }

  update(
    id: string,
    data: {
      customerCode?: string
      accountId?: string | null
      name: string
      displayName?: string | null
      mobile?: string | null
      alternateMobile?: string | null
      email?: string | null
      address?: string | null
      city?: string | null
      state?: string | null
      pincode?: string | null
      dateOfBirth?: string | null
      anniversaryDate?: string | null
      gstin?: string | null
      pan?: string | null
      preferredMetal?: string | null
      preferredPurity?: string | null
      notes?: string | null
      active?: boolean
      updatedAt: string
    }
  ): void {
    this.db
      .prepare(
        `
        UPDATE customers
        SET
          name = ?, display_name = ?, mobile = ?, alternate_mobile = ?,
          email = ?, address = ?, city = ?, state = ?, pincode = ?,
          date_of_birth = ?, anniversary_date = ?, gstin = ?, pan = ?,
          preferred_metal = ?, preferred_purity = ?, notes = ?,
          active = ?, account_id = COALESCE(?, account_id), updated_at = ?
        WHERE id = ? AND deleted_at IS NULL
      `
      )
      .run(
        data.name,
        data.displayName ?? data.name,
        data.mobile ?? null,
        data.alternateMobile ?? null,
        data.email ?? null,
        data.address ?? null,
        data.city ?? null,
        data.state ?? null,
        data.pincode ?? null,
        data.dateOfBirth ?? null,
        data.anniversaryDate ?? null,
        data.gstin ?? null,
        data.pan ?? null,
        data.preferredMetal ?? 'Gold',
        data.preferredPurity ?? null,
        data.notes ?? '',
        data.active !== false ? 1 : 0,
        data.accountId ?? null,
        data.updatedAt,
        id
      )
  }

  softDelete(id: string, now: string): void {
    this.db
      .prepare(`UPDATE customers SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(now, now, id)
  }
}
