import { PurityRepository, PurityRow } from '../database/repositories/PurityRepository'
import { NotFoundError } from '../ipc/errors'

const purityRepository = new PurityRepository()

export interface PurityRecord {
  id: string
  metalType: string
  name: string
  karat: string
  fineness: number
  percentage: number
  active: boolean
  createdAt: string
  updatedAt: string
}

function mapRow(row: PurityRow): PurityRecord {
  return {
    id: row.id,
    metalType: row.metal_type,
    name: row.name,
    karat: row.karat ?? '',
    fineness: Number(row.fineness),
    percentage: Number(row.percentage),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const purityService = {
  list(metalType?: string): PurityRecord[] {
    return purityRepository.findAll(metalType).map(mapRow)
  },

  getById(id: string): PurityRecord {
    const row = purityRepository.findById(id)
    if (!row) {
      throw new NotFoundError('Purity definition not found')
    }
    return mapRow(row)
  }
}
