import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { CategoryRepository, CategoryRow } from '../database/repositories/CategoryRepository'
import { ValidationError, NotFoundError, ConflictError } from '../ipc/errors'

const categoryRepository = new CategoryRepository()

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  code: z.string().trim().max(30).optional().default(''),
  parentId: z.string().trim().optional().nullable().default(null),
  metalType: z.enum(['Gold', 'Silver', 'Platinum', 'Diamond', 'Other']).default('Gold'),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().default(0)
})

export type CategoryPayload = z.infer<typeof categorySchema>

export interface CategoryRecord {
  id: string
  name: string
  code: string
  parentId: string | null
  metalType: string
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CategoryNode extends CategoryRecord {
  children: CategoryNode[]
}

function mapRow(row: CategoryRow): CategoryRecord {
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? '',
    parentId: row.parent_id,
    metalType: row.metal_type,
    active: Boolean(row.active),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const categoryService = {
  list(): CategoryRecord[] {
    return categoryRepository.findAll().map(mapRow)
  },

  getTree(): CategoryNode[] {
    const all = this.list()
    const map = new Map<string, CategoryNode>()
    const roots: CategoryNode[] = []

    for (const item of all) {
      map.set(item.id, { ...item, children: [] })
    }

    for (const item of all) {
      const node = map.get(item.id)!
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    return roots
  },

  create(payload: CategoryPayload): CategoryRecord {
    const parseResult = categorySchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid category payload')
    }
    const data = parseResult.data

    if (categoryRepository.findDuplicate(data.name, data.parentId)) {
      throw new ConflictError('A category with this name already exists under the same parent')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    categoryRepository.insert({
      id,
      name: data.name,
      code: data.code,
      parentId: data.parentId,
      metalType: data.metalType,
      active: data.active,
      sortOrder: data.sortOrder,
      createdAt: now,
      updatedAt: now
    })

    return this.getById(id)
  },

  update(id: string, payload: CategoryPayload): CategoryRecord {
    const parseResult = categorySchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid category payload')
    }
    const data = parseResult.data

    const existing = categoryRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Category not found')
    }

    if (categoryRepository.findDuplicate(data.name, data.parentId, id)) {
      throw new ConflictError('Another category with this name already exists under the same parent')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    categoryRepository.update(id, {
      name: data.name,
      code: data.code,
      parentId: data.parentId,
      metalType: data.metalType,
      active: data.active,
      sortOrder: data.sortOrder,
      updatedAt: now
    })

    return this.getById(id)
  },

  delete(id: string): { success: boolean } {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    categoryRepository.delete(id, now)
    return { success: true }
  },

  getById(id: string): CategoryRecord {
    const row = categoryRepository.findById(id)
    if (!row) {
      throw new NotFoundError('Category not found')
    }
    return mapRow(row)
  }
}
