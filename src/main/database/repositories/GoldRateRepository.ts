import { BaseRepository } from './BaseRepository'
import type { GoldRateRecord } from '../../../shared/types/goldRate'

export interface GoldRateRow {
  id: string
  metal_type: string
  purity_id: string | null
  purity_name: string
  purity_karat: string | null
  fineness: number
  rate_per_gram: number
  effective_date: string
  effective_time: string
  notes: string | null
  active: number
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

const goldRateSelectSql = `
  SELECT
    r.id,
    r.metal_type,
    r.purity_id,
    r.purity_name,
    r.purity_karat,
    r.fineness,
    r.rate_per_gram,
    r.effective_date,
    r.effective_time,
    r.notes,
    r.active,
    r.created_by,
    r.created_at,
    r.updated_at,
    r.deleted_at
  FROM gold_rates r
`

function mapRow(row: GoldRateRow): GoldRateRecord {
  return {
    id: row.id,
    metalType: row.metal_type,
    purityId: row.purity_id,
    purityName: row.purity_name,
    purityKarat: row.purity_karat,
    fineness: Number(row.fineness ?? 999),
    ratePerGram: Number(row.rate_per_gram ?? 0),
    effectiveDate: row.effective_date,
    effectiveTime: row.effective_time ?? '00:00:00',
    notes: row.notes ?? '',
    active: Boolean(row.active),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

export class GoldRateRepository extends BaseRepository {
  findAll(filter?: { metalType?: string; effectiveDate?: string; activeOnly?: boolean }): GoldRateRecord[] {
    const conditions = ['r.deleted_at IS NULL']
    const params: unknown[] = []

    if (filter?.activeOnly !== false) {
      conditions.push('r.active = 1')
    }

    if (filter?.metalType) {
      conditions.push('LOWER(r.metal_type) = LOWER(?)')
      params.push(filter.metalType)
    }

    if (filter?.effectiveDate) {
      conditions.push('r.effective_date = ?')
      params.push(filter.effectiveDate)
    }

    const rows = this.db
      .prepare(
        `
        ${goldRateSelectSql}
        WHERE ${conditions.join(' AND ')}
        ORDER BY r.effective_date DESC, r.effective_time DESC, r.created_at DESC
      `
      )
      .all(...params) as GoldRateRow[]

    return rows.map(mapRow)
  }

  findById(id: string): GoldRateRecord | undefined {
    const row = this.db
      .prepare(
        `
        ${goldRateSelectSql}
        WHERE r.id = ? AND r.deleted_at IS NULL
      `
      )
      .get(id) as GoldRateRow | undefined

    return row ? mapRow(row) : undefined
  }

  getCurrentRate(metalType: string, purityName?: string): GoldRateRecord | undefined {
    const conditions = ['r.deleted_at IS NULL', 'r.active = 1', 'LOWER(r.metal_type) = LOWER(?)']
    const params: unknown[] = [metalType]

    if (purityName) {
      conditions.push('LOWER(r.purity_name) = LOWER(?)')
      params.push(purityName)
    }

    const row = this.db
      .prepare(
        `
        ${goldRateSelectSql}
        WHERE ${conditions.join(' AND ')}
        ORDER BY r.effective_date DESC, r.effective_time DESC, r.created_at DESC
        LIMIT 1
      `
      )
      .get(...params) as GoldRateRow | undefined

    return row ? mapRow(row) : undefined
  }

  getRateAtDate(metalType: string, date: string, purityName?: string): GoldRateRecord | undefined {
    const conditions = [
      'r.deleted_at IS NULL',
      'LOWER(r.metal_type) = LOWER(?)',
      'r.effective_date <= ?'
    ]
    const params: unknown[] = [metalType, date]

    if (purityName) {
      conditions.push('LOWER(r.purity_name) = LOWER(?)')
      params.push(purityName)
    }

    const row = this.db
      .prepare(
        `
        ${goldRateSelectSql}
        WHERE ${conditions.join(' AND ')}
        ORDER BY r.effective_date DESC, r.effective_time DESC, r.created_at DESC
        LIMIT 1
      `
      )
      .get(...params) as GoldRateRow | undefined

    return row ? mapRow(row) : undefined
  }

  insert(data: {
    id: string
    metalType: string
    purityId?: string | null
    purityName: string
    purityKarat?: string | null
    fineness?: number
    ratePerGram: number
    effectiveDate: string
    effectiveTime?: string
    notes?: string | null
    active?: boolean
    createdBy?: string | null
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO gold_rates (
          id, metal_type, purity_id, purity_name, purity_karat,
          fineness, rate_per_gram, effective_date, effective_time,
          notes, active, created_by, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.metalType,
        data.purityId ?? null,
        data.purityName,
        data.purityKarat ?? null,
        data.fineness ?? 999,
        data.ratePerGram,
        data.effectiveDate,
        data.effectiveTime ?? '00:00:00',
        data.notes ?? '',
        data.active !== false ? 1 : 0,
        data.createdBy ?? null,
        data.createdAt,
        data.updatedAt
      )
  }

  update(
    id: string,
    data: {
      ratePerGram: number
      notes?: string | null
      active?: boolean
      updatedAt: string
    }
  ): void {
    this.db
      .prepare(
        `
        UPDATE gold_rates
        SET
          rate_per_gram = ?, notes = ?, active = ?, updated_at = ?
        WHERE id = ? AND deleted_at IS NULL
      `
      )
      .run(
        data.ratePerGram,
        data.notes ?? '',
        data.active !== false ? 1 : 0,
        data.updatedAt,
        id
      )
  }

  softDelete(id: string, now: string): void {
    this.db
      .prepare(`UPDATE gold_rates SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(now, now, id)
  }
}
