import { BaseRepository } from './BaseRepository'

export interface ItemStampRow {
  id: string
  stamp_name: string
  metal_type: string
  purity_karat?: string | null
  purity_tanch?: number | null
  short_code?: string | null
  is_hallmarked?: number | null
  description: string | null
  active: number
  created_at: string
  updated_at: string
}

export class ItemStampRepository extends BaseRepository {
  findAll(): ItemStampRow[] {
    return this.db
      .prepare(
        `
        SELECT id, stamp_name, metal_type, purity_karat, purity_tanch, short_code, is_hallmarked, description, active, created_at, updated_at
        FROM item_stamps
        WHERE deleted_at IS NULL
        ORDER BY stamp_name ASC
      `
      )
      .all() as ItemStampRow[]
  }

  findById(id: string): ItemStampRow | undefined {
    return this.db
      .prepare(
        `
        SELECT id, stamp_name, metal_type, purity_karat, purity_tanch, short_code, is_hallmarked, description, active, created_at, updated_at
        FROM item_stamps
        WHERE id = ? AND deleted_at IS NULL
      `
      )
      .get(id) as ItemStampRow | undefined
  }

  findDuplicate(stampName: string, metalType: string, excludeId?: string): { id: string } | undefined {
    if (excludeId) {
      return this.db
        .prepare(
          `
          SELECT id FROM item_stamps
          WHERE LOWER(stamp_name) = LOWER(?) AND metal_type = ? AND id != ? AND deleted_at IS NULL
        `
        )
        .get(stampName, metalType, excludeId) as { id: string } | undefined
    }

    return this.db
      .prepare(
        `
        SELECT id FROM item_stamps
        WHERE LOWER(stamp_name) = LOWER(?) AND metal_type = ? AND deleted_at IS NULL
      `
      )
      .get(stampName, metalType) as { id: string } | undefined
  }

  insert(data: {
    id: string
    stampName: string
    metalType: string
    purityKarat?: string
    purityTanch?: number
    shortCode?: string
    isHallmarked?: boolean
    description?: string
    active: boolean
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO item_stamps (id, stamp_name, metal_type, purity_karat, purity_tanch, short_code, is_hallmarked, description, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.stampName,
        data.metalType,
        data.purityKarat ?? '',
        data.purityTanch ?? 0,
        data.shortCode ?? '',
        data.isHallmarked !== false ? 1 : 0,
        data.description ?? '',
        data.active ? 1 : 0,
        data.createdAt,
        data.updatedAt
      )
  }

  update(
    id: string,
    data: {
      stampName: string
      metalType: string
      purityKarat?: string
      purityTanch?: number
      shortCode?: string
      isHallmarked?: boolean
      description?: string
      active: boolean
      updatedAt: string
    }
  ): void {
    this.db
      .prepare(
        `
        UPDATE item_stamps
        SET stamp_name = ?, metal_type = ?, purity_karat = ?, purity_tanch = ?, short_code = ?, is_hallmarked = ?, description = ?, active = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        data.stampName,
        data.metalType,
        data.purityKarat ?? '',
        data.purityTanch ?? 0,
        data.shortCode ?? '',
        data.isHallmarked !== false ? 1 : 0,
        data.description ?? '',
        data.active ? 1 : 0,
        data.updatedAt,
        id
      )
  }

  delete(id: string, now: string): void {
    this.db
      .prepare(`UPDATE item_stamps SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(now, now, id)
  }
}
