import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { ItemRepository, ItemRow } from '../database/repositories/ItemRepository'
import { ValidationError, NotFoundError, ConflictError } from '../ipc/errors'

const itemRepository = new ItemRepository()

const itemSchema = z.object({
  itemName: z.string().trim().min(1, 'Item name is required').max(120),
  metalType: z.enum(['Gold', 'Silver', 'Diamond', 'Other']),
  itemGroupId: z.string().trim().min(1, 'Item group is required'),
  defaultStampId: z.string().trim().optional().default(''),
  defaultDesignId: z.string().trim().optional().default(''),
  barcodeItem: z.boolean().default(false),
  barcodeType: z.string().trim().max(50).optional().default(''),
  labourChargesBy: z.enum(['Kg', 'Gm', 'Pcs']).default('Kg'),
  salePurchaseBy: z.enum(['Fine', 'Weight', 'Pcs']).default('Fine'),
  gstHsnCode: z.string().trim().max(30).optional().default(''),
  fixedWeightPerPcs: z.coerce.number().default(0),
  defaultTanch: z.coerce.number().default(0),
  defaultWastage: z.coerce.number().default(0),
  defaultLabourRate: z.coerce.number().default(0),
  labourRateType: z.enum(['Kg', 'Gm', 'Pcs']).default('Kg'),
  active: z.boolean().default(true)
})

export type ItemPayload = z.infer<typeof itemSchema>

export type ItemRecord = {
  id: string
  itemName: string
  metalType: string
  itemGroupId: string
  groupName: string
  defaultStampId: string
  stampName: string
  defaultDesignId: string
  designName: string
  barcodeItem: boolean
  barcodeType: string
  barcodeValue: string
  labourChargesBy: string
  salePurchaseBy: string
  gstHsnCode: string
  fixedWeightPerPcs: number
  defaultTanch: number
  defaultWastage: number
  defaultLabourRate: number
  labourRateType: string
  active: boolean
  createdAt: string
  updatedAt: string
}

function mapRow(row: ItemRow): ItemRecord {
  return {
    id: row.id,
    itemName: row.item_name,
    metalType: row.metal_type,
    itemGroupId: row.item_group_id,
    groupName: row.group_name,
    defaultStampId: row.default_stamp_id ?? '',
    stampName: row.stamp_name ?? '',
    defaultDesignId: row.default_design_id ?? '',
    designName: row.design_name ?? '',
    barcodeItem: Boolean(row.barcode_item),
    barcodeType: row.barcode_type ?? '',
    barcodeValue: row.barcode_value ?? '',
    labourChargesBy: row.labour_charges_by,
    salePurchaseBy: row.sale_purchase_by,
    gstHsnCode: row.gst_hsn_code ?? '',
    fixedWeightPerPcs: Number(row.fixed_weight_per_pcs ?? 0),
    defaultTanch: Number(row.default_tanch ?? 0),
    defaultWastage: Number(row.default_wastage ?? 0),
    defaultLabourRate: Number(row.default_labour_rate ?? 0),
    labourRateType: row.labour_rate_type ?? 'Kg',
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const itemService = {
  list() {
    const rows = itemRepository.findAll()
    return rows.map(mapRow)
  },

  create(payload: ItemPayload) {
    const parseResult = itemSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid item payload')
    }
    const data = parseResult.data

    if (!itemRepository.checkReferenceExists('item_groups', data.itemGroupId)) {
      throw new NotFoundError('Item group not found')
    }
    if (data.defaultStampId && !itemRepository.checkReferenceExists('item_stamps', data.defaultStampId)) {
      throw new NotFoundError('Item stamp not found')
    }
    if (data.defaultDesignId && !itemRepository.checkReferenceExists('item_designs', data.defaultDesignId)) {
      throw new NotFoundError('Item design not found')
    }

    if (itemRepository.findDuplicate(data.itemName, data.metalType)) {
      throw new ConflictError('Item already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    itemRepository.insert({
      id,
      ...data,
      createdAt: now,
      updatedAt: now
    })

    return this.getById(id)
  },

  update(id: string, payload: ItemPayload) {
    const parseResult = itemSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid item payload')
    }
    const data = parseResult.data

    const existing = itemRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Item not found')
    }

    if (!itemRepository.checkReferenceExists('item_groups', data.itemGroupId)) {
      throw new NotFoundError('Item group not found')
    }
    if (data.defaultStampId && !itemRepository.checkReferenceExists('item_stamps', data.defaultStampId)) {
      throw new NotFoundError('Item stamp not found')
    }
    if (data.defaultDesignId && !itemRepository.checkReferenceExists('item_designs', data.defaultDesignId)) {
      throw new NotFoundError('Item design not found')
    }

    if (itemRepository.findDuplicate(data.itemName, data.metalType, id)) {
      throw new ConflictError('Another item with this name already exists')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    itemRepository.update(id, {
      ...data,
      updatedAt: now
    })

    return this.getById(id)
  },

  delete(id: string) {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    itemRepository.delete(id, now)
    return { success: true }
  },

  getById(id: string) {
    const row = itemRepository.findById(id)
    if (!row) {
      throw new NotFoundError('Item not found')
    }
    return mapRow(row)
  },

  assignBarcode(id: string) {
    const existing = itemRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Item not found')
    }
    if (existing.barcode_value) {
      return mapRow(existing)
    }

    const barcodeValue = itemRepository.generateBarcode(existing.metal_type)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    itemRepository.updateBarcode(id, barcodeValue, now)
    return this.getById(id)
  },

  regenerateBarcode(id: string) {
    const existing = itemRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Item not found')
    }

    const barcodeValue = itemRepository.generateBarcode(existing.metal_type)
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    itemRepository.updateBarcode(id, barcodeValue, now)
    return this.getById(id)
  }
}
