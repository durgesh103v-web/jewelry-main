import { BaseRepository } from './BaseRepository'
import type { SupplierRecord } from '../../../shared/types/supplier'

export interface SupplierRow {
  id: string
  supplier_code: string
  account_id: string | null
  account_name: string | null
  name: string
  display_name: string | null
  supplier_type: string | null
  mobile: string | null
  alternate_mobile: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  gstin: string | null
  pan: string | null
  notes: string | null
  active: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

const supplierSelectSql = `
  SELECT
    s.id,
    s.supplier_code,
    s.account_id,
    a.account_name,
    s.name,
    s.display_name,
    s.supplier_type,
    s.mobile,
    s.alternate_mobile,
    s.email,
    s.address,
    s.city,
    s.state,
    s.pincode,
    s.gstin,
    s.pan,
    s.notes,
    s.active,
    s.created_at,
    s.updated_at,
    s.deleted_at
  FROM suppliers s
  LEFT JOIN accounts a ON a.id = s.account_id
`

function mapRow(row: SupplierRow): SupplierRecord {
  return {
    id: row.id,
    supplierCode: row.supplier_code,
    accountId: row.account_id,
    accountName: row.account_name ?? null,
    name: row.name,
    displayName: row.display_name,
    supplierType: row.supplier_type ?? 'Supplier',
    mobile: row.mobile,
    alternateMobile: row.alternate_mobile,
    email: row.email,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    gstin: row.gstin,
    pan: row.pan,
    notes: row.notes ?? '',
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

export class SupplierRepository extends BaseRepository {
  findAll(filter?: { activeOnly?: boolean; supplierType?: string; city?: string; state?: string }): SupplierRecord[] {
    const conditions = ['s.deleted_at IS NULL']
    const params: unknown[] = []

    if (filter?.activeOnly !== false) {
      conditions.push('s.active = 1')
    }

    if (filter?.supplierType) {
      conditions.push('s.supplier_type = ?')
      params.push(filter.supplierType)
    }

    if (filter?.city) {
      conditions.push('LOWER(s.city) = LOWER(?)')
      params.push(filter.city)
    }

    if (filter?.state) {
      conditions.push('LOWER(s.state) = LOWER(?)')
      params.push(filter.state)
    }

    const rows = this.db
      .prepare(
        `
        ${supplierSelectSql}
        WHERE ${conditions.join(' AND ')}
        ORDER BY s.name ASC
      `
      )
      .all(...params) as SupplierRow[]

    return rows.map(mapRow)
  }

  findById(id: string): SupplierRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${supplierSelectSql}
        WHERE s.id = ? AND s.deleted_at IS NULL
      `
      )
      .get(id) as SupplierRow | undefined

    return row ? mapRow(row) : undefined
  }

  findByCode(code: string): SupplierRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${supplierSelectSql}
        WHERE LOWER(s.supplier_code) = LOWER(?) AND s.deleted_at IS NULL
      `
      )
      .get(code) as SupplierRow | undefined

    return row ? mapRow(row) : undefined
  }

  findByAccountId(accountId: string): SupplierRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${supplierSelectSql}
        WHERE s.account_id = ? AND s.deleted_at IS NULL
      `
      )
      .get(accountId) as SupplierRow | undefined

    return row ? mapRow(row) : undefined
  }

  search(query: string, limit = 50): SupplierRecord[] {
    const pattern = `%${query.trim().toLowerCase()}%`
    const rows = this.db
      .prepare(
        `
        ${supplierSelectSql}
        WHERE s.deleted_at IS NULL
        AND (
          LOWER(s.name) LIKE ?
          OR LOWER(s.supplier_code) LIKE ?
          OR s.mobile LIKE ?
          OR LOWER(COALESCE(s.city, '')) LIKE ?
          OR LOWER(COALESCE(s.email, '')) LIKE ?
          OR LOWER(COALESCE(a.account_name, '')) LIKE ?
        )
        ORDER BY s.name ASC
        LIMIT ?
      `
      )
      .all(pattern, pattern, pattern, pattern, pattern, pattern, limit) as SupplierRow[]

    return rows.map(mapRow)
  }

  getNextCode(): string {
    const rows = this.db
      .prepare(`SELECT supplier_code FROM suppliers ORDER BY created_at DESC`)
      .all() as { supplier_code: string }[]

    const maxNumber = rows.reduce((max, row) => {
      const clean = String(row.supplier_code || '').trim()
      const numberPart = clean.startsWith('SUPP-') ? clean.replace('SUPP-', '') : '0'
      const parsed = Number(numberPart)
      return Number.isFinite(parsed) ? Math.max(max, parsed) : max
    }, 0)

    return `SUPP-${String(maxNumber + 1).padStart(4, '0')}`
  }

  insert(data: {
    id: string
    supplierCode: string
    accountId?: string | null
    name: string
    displayName?: string | null
    supplierType?: string | null
    mobile?: string | null
    alternateMobile?: string | null
    email?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    pincode?: string | null
    gstin?: string | null
    pan?: string | null
    notes?: string | null
    active?: boolean
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO suppliers (
          id, supplier_code, account_id, name, display_name, supplier_type,
          mobile, alternate_mobile, email, address, city, state, pincode,
          gstin, pan, notes, active, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.supplierCode,
        data.accountId ?? null,
        data.name,
        data.displayName ?? data.name,
        data.supplierType ?? 'Supplier',
        data.mobile ?? null,
        data.alternateMobile ?? null,
        data.email ?? null,
        data.address ?? null,
        data.city ?? null,
        data.state ?? null,
        data.pincode ?? null,
        data.gstin ?? null,
        data.pan ?? null,
        data.notes ?? '',
        data.active !== false ? 1 : 0,
        data.createdAt,
        data.updatedAt
      )
  }

  update(
    id: string,
    data: {
      supplierCode?: string
      accountId?: string | null
      name: string
      displayName?: string | null
      supplierType?: string | null
      mobile?: string | null
      alternateMobile?: string | null
      email?: string | null
      address?: string | null
      city?: string | null
      state?: string | null
      pincode?: string | null
      gstin?: string | null
      pan?: string | null
      notes?: string | null
      active?: boolean
      updatedAt: string
    }
  ): void {
    this.db
      .prepare(
        `
        UPDATE suppliers
        SET
          name = ?, display_name = ?, supplier_type = ?, mobile = ?,
          alternate_mobile = ?, email = ?, address = ?, city = ?,
          state = ?, pincode = ?, gstin = ?, pan = ?, notes = ?,
          active = ?, account_id = COALESCE(?, account_id), updated_at = ?
        WHERE id = ? AND deleted_at IS NULL
      `
      )
      .run(
        data.name,
        data.displayName ?? data.name,
        data.supplierType ?? 'Supplier',
        data.mobile ?? null,
        data.alternateMobile ?? null,
        data.email ?? null,
        data.address ?? null,
        data.city ?? null,
        data.state ?? null,
        data.pincode ?? null,
        data.gstin ?? null,
        data.pan ?? null,
        data.notes ?? '',
        data.active !== false ? 1 : 0,
        data.accountId ?? null,
        data.updatedAt,
        id
      )
  }

  softDelete(id: string, now: string): void {
    this.db
      .prepare(`UPDATE suppliers SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(now, now, id)
  }
}
