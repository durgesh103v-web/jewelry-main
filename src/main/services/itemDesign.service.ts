import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { ItemDesignRepository, ItemDesignRow } from '../database/repositories/ItemDesignRepository'
import { ValidationError, NotFoundError, ConflictError } from '../ipc/errors'

const itemDesignRepository = new ItemDesignRepository()

const itemDesignSchema = z.object({
  designName: z.string().trim().min(1, 'Design name is required').max(80),
  metalType: z.enum(['Gold', 'Silver', 'Diamond', 'Platinum', 'Other']).default('Gold'),
  description: z.string().trim().max(255).optional().default(''),
  active: z.boolean().default(true)
})

export type ItemDesignPayload = z.infer<typeof itemDesignSchema>

export interface ItemDesignRecord {
  id: string
  designName: string
  metalType: string
  description: string
  active: boolean
  createdAt: string
  updatedAt: string
}

function mapRow(row: ItemDesignRow): ItemDesignRecord {
  return {
    id: row.id,
    designName: row.design_name,
    metalType: row.metal_type,
    description: row.description ?? '',
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const itemDesignService = {
  list(): ItemDesignRecord[] {
    return itemDesignRepository.findAll().map(mapRow)
  },

  create(payload: ItemDesignPayload): ItemDesignRecord {
    const parseResult = itemDesignSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid item design payload')
    }
    const data = parseResult.data

    if (itemDesignRepository.findDuplicate(data.designName, data.metalType)) {
      throw new ConflictError('Item design already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    itemDesignRepository.insert({
      id,
      designName: data.designName,
      metalType: data.metalType,
      description: data.description,
      active: data.active,
      createdAt: now,
      updatedAt: now
    })

    return this.getById(id)
  },

  update(id: string, payload: ItemDesignPayload): ItemDesignRecord {
    const parseResult = itemDesignSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid item design payload')
    }
    const data = parseResult.data

    const existing = itemDesignRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Item design not found')
    }

    if (itemDesignRepository.findDuplicate(data.designName, data.metalType, id)) {
      throw new ConflictError('Another item design with this name already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    itemDesignRepository.update(id, {
      designName: data.designName,
      metalType: data.metalType,
      description: data.description,
      active: data.active,
      updatedAt: now
    })

    return this.getById(id)
  },

  delete(id: string): { success: boolean } {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    itemDesignRepository.delete(id, now)
    return { success: true }
  },

  getById(id: string): ItemDesignRecord {
    const row = itemDesignRepository.findById(id)
    if (!row) {
      throw new NotFoundError('Item design not found')
    }
    return mapRow(row)
  }
}
