import { BaseRepository } from './BaseRepository'

export interface ItemDesignRow {
  id: string
  design_name: string
  metal_type: string
  description: string | null
  active: number
  created_at: string
  updated_at: string
}

export class ItemDesignRepository extends BaseRepository {
  findAll(): ItemDesignRow[] {
    return this.db
      .prepare(
        `
        SELECT id, design_name, metal_type, description, active, created_at, updated_at
        FROM item_designs
        WHERE deleted_at IS NULL
        ORDER BY design_name ASC
      `
      )
      .all() as ItemDesignRow[]
  }

  findById(id: string): ItemDesignRow | undefined {
    return this.db
      .prepare(
        `
        SELECT id, design_name, metal_type, description, active, created_at, updated_at
        FROM item_designs
        WHERE id = ? AND deleted_at IS NULL
      `
      )
      .get(id) as ItemDesignRow | undefined
  }

  findDuplicate(designName: string, metalType: string, excludeId?: string): { id: string } | undefined {
    if (excludeId) {
      return this.db
        .prepare(
          `
          SELECT id FROM item_designs
          WHERE LOWER(design_name) = LOWER(?) AND metal_type = ? AND id != ? AND deleted_at IS NULL
        `
        )
        .get(designName, metalType, excludeId) as { id: string } | undefined
    }

    return this.db
      .prepare(
        `
        SELECT id FROM item_designs
        WHERE LOWER(design_name) = LOWER(?) AND metal_type = ? AND deleted_at IS NULL
      `
      )
      .get(designName, metalType) as { id: string } | undefined
  }

  insert(data: {
    id: string
    designName: string
    metalType: string
    description?: string
    active: boolean
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO item_designs (id, design_name, metal_type, description, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.designName,
        data.metalType,
        data.description ?? '',
        data.active ? 1 : 0,
        data.createdAt,
        data.updatedAt
      )
  }

  update(
    id: string,
    data: {
      designName: string
      metalType: string
      description?: string
      active: boolean
      updatedAt: string
    }
  ): void {
    this.db
      .prepare(
        `
        UPDATE item_designs
        SET design_name = ?, metal_type = ?, description = ?, active = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(data.designName, data.metalType, data.description ?? '', data.active ? 1 : 0, data.updatedAt, id)
  }

  delete(id: string, now: string): void {
    this.db
      .prepare(`UPDATE item_designs SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(now, now, id)
  }
}
