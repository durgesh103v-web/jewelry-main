import { BaseRepository } from './BaseRepository'

export interface PurityRow {
  id: string
  metal_type: string
  name: string
  karat: string | null
  fineness: number
  percentage: number
  active: number
  created_at: string
  updated_at: string
}

export class PurityRepository extends BaseRepository {
  findAll(metalType?: string): PurityRow[] {
    if (metalType) {
      return this.db
        .prepare(
          `
          SELECT id, metal_type, name, karat, fineness, percentage, active, created_at, updated_at
          FROM purity_masters
          WHERE metal_type = ?
          ORDER BY fineness DESC
        `
        )
        .all(metalType) as PurityRow[]
    }

    return this.db
      .prepare(
        `
        SELECT id, metal_type, name, karat, fineness, percentage, active, created_at, updated_at
        FROM purity_masters
        ORDER BY metal_type ASC, fineness DESC
      `
      )
      .all() as PurityRow[]
  }

  findById(id: string): PurityRow | undefined {
    return this.db
      .prepare(
        `
        SELECT id, metal_type, name, karat, fineness, percentage, active, created_at, updated_at
        FROM purity_masters
        WHERE id = ?
      `
      )
      .get(id) as PurityRow | undefined
  }
}
