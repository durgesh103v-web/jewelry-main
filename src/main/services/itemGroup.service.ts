import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { ItemGroupRepository, ItemGroupRow } from '../database/repositories/ItemGroupRepository'
import { ValidationError, NotFoundError, ConflictError } from '../ipc/errors'

const itemGroupRepository = new ItemGroupRepository()

const itemGroupSchema = z.object({
  groupName: z.string().trim().min(1, 'Item group name is required').max(80),
  metalType: z.enum(['Gold', 'Silver', 'Diamond', 'Platinum', 'Other']).default('Silver'),
  description: z.string().trim().max(255).optional().default(''),
  active: z.boolean().default(true)
})

export type ItemGroupPayload = z.infer<typeof itemGroupSchema>

export interface ItemGroupRecord {
  id: string
  groupName: string
  metalType: string
  description: string
  active: boolean
  createdAt: string
  updatedAt: string
}

function mapRow(row: ItemGroupRow): ItemGroupRecord {
  return {
    id: row.id,
    groupName: row.group_name,
    metalType: row.metal_type,
    description: row.description ?? '',
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const itemGroupService = {
  list(): ItemGroupRecord[] {
    return itemGroupRepository.findAll().map(mapRow)
  },

  create(payload: ItemGroupPayload): ItemGroupRecord {
    const parseResult = itemGroupSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid item group payload')
    }
    const data = parseResult.data

    if (itemGroupRepository.findDuplicate(data.groupName, data.metalType)) {
      throw new ConflictError('Item group already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    itemGroupRepository.insert({
      id,
      groupName: data.groupName,
      metalType: data.metalType,
      description: data.description,
      active: data.active,
      createdAt: now,
      updatedAt: now
    })

    return this.getById(id)
  },

  update(id: string, payload: ItemGroupPayload): ItemGroupRecord {
    const parseResult = itemGroupSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid item group payload')
    }
    const data = parseResult.data

    const existing = itemGroupRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Item group not found')
    }

    if (itemGroupRepository.findDuplicate(data.groupName, data.metalType, id)) {
      throw new ConflictError('Another item group with this name already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    itemGroupRepository.update(id, {
      groupName: data.groupName,
      metalType: data.metalType,
      description: data.description,
      active: data.active,
      updatedAt: now
    })

    return this.getById(id)
  },

  delete(id: string): { success: boolean } {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    itemGroupRepository.delete(id, now)
    return { success: true }
  },

  getById(id: string): ItemGroupRecord {
    const row = itemGroupRepository.findById(id)
    if (!row) {
      throw new NotFoundError('Item group not found')
    }
    return mapRow(row)
  }
}
