import { BaseRepository } from './BaseRepository'

export interface ItemGroupRow {
  id: string
  group_name: string
  metal_type: string
  description: string | null
  active: number
  prefix?: string | null
  hsn_code?: string | null
  gst_rate?: number | null
  default_purity?: string | null
  default_labour_rate?: number | null
  default_labour_type?: string | null
  default_wastage?: number | null
  created_at: string
  updated_at: string
}

export class ItemGroupRepository extends BaseRepository {
  findAll(): ItemGroupRow[] {
    return this.db
      .prepare(
        `
        SELECT id, group_name, metal_type, description, active,
               prefix, hsn_code, gst_rate, default_purity, default_labour_rate, default_labour_type, default_wastage,
               created_at, updated_at
        FROM item_groups
        WHERE deleted_at IS NULL
        ORDER BY group_name ASC
      `
      )
      .all() as ItemGroupRow[]
  }

  findById(id: string): ItemGroupRow | undefined {
    return this.db
      .prepare(
        `
        SELECT id, group_name, metal_type, description, active,
               prefix, hsn_code, gst_rate, default_purity, default_labour_rate, default_labour_type, default_wastage,
               created_at, updated_at
        FROM item_groups
        WHERE id = ? AND deleted_at IS NULL
      `
      )
      .get(id) as ItemGroupRow | undefined
  }

  findDuplicate(groupName: string, metalType: string, excludeId?: string): { id: string } | undefined {
    if (excludeId) {
      return this.db
        .prepare(
          `
          SELECT id FROM item_groups
          WHERE LOWER(group_name) = LOWER(?) AND metal_type = ? AND id != ? AND deleted_at IS NULL
        `
        )
        .get(groupName, metalType, excludeId) as { id: string } | undefined
    }

    return this.db
      .prepare(
        `
        SELECT id FROM item_groups
        WHERE LOWER(group_name) = LOWER(?) AND metal_type = ? AND deleted_at IS NULL
      `
      )
      .get(groupName, metalType) as { id: string } | undefined
  }

  insert(data: {
    id: string
    groupName: string
    metalType: string
    description?: string
    active: boolean
    prefix?: string
    hsnCode?: string
    gstRate?: number
    defaultPurity?: string
    defaultLabourRate?: number
    defaultLabourType?: string
    defaultWastage?: number
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO item_groups (
          id, group_name, metal_type, description, active,
          prefix, hsn_code, gst_rate, default_purity, default_labour_rate, default_labour_type, default_wastage,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.groupName,
        data.metalType,
        data.description ?? '',
        data.active ? 1 : 0,
        data.prefix ?? '',
        data.hsnCode ?? '7113',
        data.gstRate ?? 3.0,
        data.defaultPurity ?? '',
        data.defaultLabourRate ?? 0,
        data.defaultLabourType ?? 'PER_GRAM',
        data.defaultWastage ?? 0,
        data.createdAt,
        data.updatedAt
      )
  }

  update(
    id: string,
    data: {
      groupName: string
      metalType: string
      description?: string
      active: boolean
      prefix?: string
      hsnCode?: string
      gstRate?: number
      defaultPurity?: string
      defaultLabourRate?: number
      defaultLabourType?: string
      defaultWastage?: number
      updatedAt: string
    }
  ): void {
    this.db
      .prepare(
        `
        UPDATE item_groups
        SET group_name = ?, metal_type = ?, description = ?, active = ?,
            prefix = ?, hsn_code = ?, gst_rate = ?, default_purity = ?,
            default_labour_rate = ?, default_labour_type = ?, default_wastage = ?,
            updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        data.groupName,
        data.metalType,
        data.description ?? '',
        data.active ? 1 : 0,
        data.prefix ?? '',
        data.hsnCode ?? '7113',
        data.gstRate ?? 3.0,
        data.defaultPurity ?? '',
        data.defaultLabourRate ?? 0,
        data.defaultLabourType ?? 'PER_GRAM',
        data.defaultWastage ?? 0,
        data.updatedAt,
        id
      )
  }

  delete(id: string, now: string): void {
    this.db
      .prepare(`UPDATE item_groups SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(now, now, id)
  }
}
