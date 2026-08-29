import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { ItemStampRepository, ItemStampRow } from '../database/repositories/ItemStampRepository'
import { ValidationError, NotFoundError, ConflictError } from '../ipc/errors'

const itemStampRepository = new ItemStampRepository()

const itemStampSchema = z.object({
  stampName: z.string().trim().min(1, 'Stamp name is required').max(80),
  metalType: z.enum(['Gold', 'Silver', 'Diamond', 'Platinum', 'Other']).default('Gold'),
  description: z.string().trim().max(255).optional().default(''),
  active: z.boolean().default(true)
})

export type ItemStampPayload = z.infer<typeof itemStampSchema>

export interface ItemStampRecord {
  id: string
  stampName: string
  metalType: string
  description: string
  active: boolean
  createdAt: string
  updatedAt: string
}

function mapRow(row: ItemStampRow): ItemStampRecord {
  return {
    id: row.id,
    stampName: row.stamp_name,
    metalType: row.metal_type,
    description: row.description ?? '',
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const itemStampService = {
  list(): ItemStampRecord[] {
    return itemStampRepository.findAll().map(mapRow)
  },

  create(payload: ItemStampPayload): ItemStampRecord {
    const parseResult = itemStampSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid item stamp payload')
    }
    const data = parseResult.data

    if (itemStampRepository.findDuplicate(data.stampName, data.metalType)) {
      throw new ConflictError('Item stamp already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    itemStampRepository.insert({
      id,
      stampName: data.stampName,
      metalType: data.metalType,
      description: data.description,
      active: data.active,
      createdAt: now,
      updatedAt: now
    })

    return this.getById(id)
  },

  update(id: string, payload: ItemStampPayload): ItemStampRecord {
    const parseResult = itemStampSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid item stamp payload')
    }
    const data = parseResult.data

    const existing = itemStampRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Item stamp not found')
    }

    if (itemStampRepository.findDuplicate(data.stampName, data.metalType, id)) {
      throw new ConflictError('Another item stamp with this name already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    itemStampRepository.update(id, {
      stampName: data.stampName,
      metalType: data.metalType,
      description: data.description,
      active: data.active,
      updatedAt: now
    })

    return this.getById(id)
  },

  delete(id: string): { success: boolean } {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    itemStampRepository.delete(id, now)
    return { success: true }
  },

  getById(id: string): ItemStampRecord {
    const row = itemStampRepository.findById(id)
    if (!row) {
      throw new NotFoundError('Item stamp not found')
    }
    return mapRow(row)
  }
}
