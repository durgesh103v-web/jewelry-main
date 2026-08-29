import { BaseRepository } from './BaseRepository'

export interface CategoryRow {
  id: string
  name: string
  code: string | null
  parent_id: string | null
  metal_type: string
  active: number
  sort_order: number
  created_at: string
  updated_at: string
}

export class CategoryRepository extends BaseRepository {
  findAll(): CategoryRow[] {
    return this.db
      .prepare(
        `
        SELECT id, name, code, parent_id, metal_type, active, sort_order, created_at, updated_at
        FROM categories
        WHERE deleted_at IS NULL
        ORDER BY sort_order ASC, name ASC
      `
      )
      .all() as CategoryRow[]
  }

  findById(id: string): CategoryRow | undefined {
    return this.db
      .prepare(
        `
        SELECT id, name, code, parent_id, metal_type, active, sort_order, created_at, updated_at
        FROM categories
        WHERE id = ? AND deleted_at IS NULL
      `
      )
      .get(id) as CategoryRow | undefined
  }

  findDuplicate(name: string, parentId?: string | null, excludeId?: string): { id: string } | undefined {
    if (excludeId) {
      return this.db
        .prepare(
          `
          SELECT id FROM categories
          WHERE LOWER(name) = LOWER(?)
          AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL))
          AND id != ?
          AND deleted_at IS NULL
        `
        )
        .get(name, parentId ?? null, parentId ?? null, excludeId) as { id: string } | undefined
    }

    return this.db
      .prepare(
        `
        SELECT id FROM categories
        WHERE LOWER(name) = LOWER(?)
        AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL))
        AND deleted_at IS NULL
      `
      )
      .get(name, parentId ?? null, parentId ?? null) as { id: string } | undefined
  }

  insert(data: {
    id: string
    name: string
    code?: string
    parentId?: string | null
    metalType: string
    active: boolean
    sortOrder?: number
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO categories (id, name, code, parent_id, metal_type, active, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.name,
        data.code ?? '',
        data.parentId ?? null,
        data.metalType,
        data.active ? 1 : 0,
        data.sortOrder ?? 0,
        data.createdAt,
        data.updatedAt
      )
  }

  update(
    id: string,
    data: {
      name: string
      code?: string
      parentId?: string | null
      metalType: string
      active: boolean
      sortOrder?: number
      updatedAt: string
    }
  ): void {
    this.db
      .prepare(
        `
        UPDATE categories
        SET name = ?, code = ?, parent_id = ?, metal_type = ?, active = ?, sort_order = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        data.name,
        data.code ?? '',
        data.parentId ?? null,
        data.metalType,
        data.active ? 1 : 0,
        data.sortOrder ?? 0,
        data.updatedAt,
        id
      )
  }

  delete(id: string, now: string): void {
    this.db
      .prepare(`UPDATE categories SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(now, now, id)
  }
}
