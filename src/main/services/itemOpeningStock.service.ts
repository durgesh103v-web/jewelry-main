import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getDatabase } from '../database/connection'
import {
  calculateFine,
  calculateHishob,
  calculateMajuri,
  calculateNetWeight
} from './jewelleryFormula.service'
import { inventoryMovementService } from './inventoryMovement.service'
import { ValidationError, NotFoundError } from '../ipc/errors'

const openingStockUnitSchema = z.preprocess(
  (value) => {
    const unit = String(value || 'Kg')
      .trim()
      .toUpperCase()

    if (unit === 'GM') return 'Gm'
    if (unit === 'KG') return 'Kg'
    if (unit === 'PCS') return 'Pcs'

    return value
  },
  z.enum(['Kg', 'Gm', 'Pcs'])
)

const openingStockSchema = z.object({
  stockDate: z.string().trim().optional().default(''),
  itemId: z.string().trim().min(1, 'Item is required'),
  stampId: z.string().trim().optional().default(''),
  designId: z.string().trim().optional().default(''),
  barcode: z.string().trim().max(80).optional().default(''),
  huid: z.string().trim().max(30).optional().default(''),
  location: z.string().trim().max(50).optional().default(''),
  diamondCarats: z.coerce.number().default(0),
  diamondPcs: z.coerce.number().default(0),
  stoneAmount: z.coerce.number().default(0),
  remark: z.string().trim().max(255).optional().default(''),
  pcs: z.coerce.number().default(0),
  grossWeight: z.coerce.number().default(0),
  lessWeight: z.coerce.number().default(0),
  addWeight: z.coerce.number().default(0),
  tanch: z.coerce.number().default(0),
  wastage: z.coerce.number().default(0),
  hishob: z.coerce.number().default(0),
  unit: openingStockUnitSchema.default('Kg'),
  majuriRate: z.coerce.number().default(0),
  active: z.boolean().default(true)
})

export type OpeningStockPayload = z.infer<typeof openingStockSchema>

type ItemMetaRow = {
  id: string
  metal_type: string
}

type OpeningStockRow = {
  id: string
  stock_date: string
  item_id: string
  item_name: string
  metal_type: string
  stamp_id: string | null
  stamp_name: string | null
  design_id: string | null
  design_name: string | null
  barcode: string | null
  huid: string | null
  location: string | null
  diamond_carats: number | null
  diamond_pcs: number | null
  stone_amount: number | null
  remark: string | null
  pcs: number
  gross_weight: number
  less_weight: number
  add_weight: number
  net_weight: number
  tanch: number
  wastage: number
  hishob: number
  unit: string | null
  fine: number
  majuri_rate: number
  majuri: number
  active: number
  created_at: string
  updated_at: string
}

export type OpeningStockRecord = {
  id: string
  stockDate: string
  itemId: string
  itemName: string
  metalType: string
  stampId: string
  stampName: string
  designId: string
  designName: string
  barcode: string
  huid: string
  location: string
  diamondCarats: number
  diamondPcs: number
  stoneAmount: number
  remark: string
  pcs: number
  grossWeight: number
  lessWeight: number
  addWeight: number
  netWeight: number
  tanch: number
  wastage: number
  hishob: number
  unit: string
  fine: number
  majuriRate: number
  majuri: number
  active: boolean
  createdAt: string
  updatedAt: string
}

function emptyToNull(value: string): string | null {
  return value.trim() ? value.trim() : null
}

function mapRow(row: OpeningStockRow): OpeningStockRecord {
  return {
    id: row.id,
    stockDate: row.stock_date,
    itemId: row.item_id,
    itemName: row.item_name,
    metalType: row.metal_type,
    stampId: row.stamp_id ?? '',
    stampName: row.stamp_name ?? '',
    designId: row.design_id ?? '',
    designName: row.design_name ?? '',
    barcode: row.barcode ?? '',
    huid: row.huid ?? '',
    location: row.location ?? '',
    diamondCarats: Number(row.diamond_carats ?? 0),
    diamondPcs: Number(row.diamond_pcs ?? 0),
    stoneAmount: Number(row.stone_amount ?? 0),
    remark: row.remark ?? '',
    pcs: Number(row.pcs ?? 0),
    grossWeight: Number(row.gross_weight ?? 0),
    lessWeight: Number(row.less_weight ?? 0),
    addWeight: Number(row.add_weight ?? 0),
    netWeight: Number(row.net_weight ?? 0),
    tanch: Number(row.tanch ?? 0),
    wastage: Number(row.wastage ?? 0),
    hishob: Number(row.hishob ?? 0),
    unit: row.unit ?? 'Kg',
    fine: Number(row.fine ?? 0),
    majuriRate: Number(row.majuri_rate ?? 0),
    majuri: Number(row.majuri ?? 0),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function getItemMeta(itemId: string): ItemMetaRow {
  const db = getDatabase()
  const item = db
    .prepare(
      `
      SELECT id, metal_type
      FROM items
      WHERE id = ?
      AND deleted_at IS NULL
    `
    )
    .get(itemId) as ItemMetaRow | undefined

  if (!item) {
    throw new NotFoundError('Item not found')
  }

  return item
}

export const itemOpeningStockService = {
  list(): OpeningStockRecord[] {
    const db = getDatabase()

    const rows = db
      .prepare(
        `
        SELECT
          os.id,
          os.stock_date,
          os.item_id,
          i.item_name,
          i.metal_type,
          os.stamp_id,
          ist.stamp_name,
          os.design_id,
          idg.design_name,
          os.barcode,
          os.huid,
          os.location,
          os.diamond_carats,
          os.diamond_pcs,
          os.stone_amount,
          os.remark,
          os.pcs,
          os.gross_weight,
          os.less_weight,
          os.add_weight,
          os.net_weight,
          os.tanch,
          os.wastage,
          os.hishob,
          os.unit,
          os.fine,
          os.majuri_rate,
          os.majuri,
          os.active,
          os.created_at,
          os.updated_at
        FROM item_opening_stock os
        INNER JOIN items i ON i.id = os.item_id
        LEFT JOIN item_stamps ist ON ist.id = os.stamp_id
        LEFT JOIN item_designs idg ON idg.id = os.design_id
        WHERE os.deleted_at IS NULL
        ORDER BY os.created_at DESC
      `
      )
      .all() as OpeningStockRow[]

    return rows.map(mapRow)
  },

  create(payload: OpeningStockPayload): OpeningStockRecord {
    const parseResult = openingStockSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid opening stock payload')
    }
    const data = parseResult.data
    const db = getDatabase()
    const item = getItemMeta(data.itemId)

    const netWeight = calculateNetWeight(data.grossWeight, data.lessWeight, data.addWeight)
    const hishob = calculateHishob(data.tanch, data.wastage)
    const fine = calculateFine(netWeight, data.tanch, data.wastage)
    const majuri = calculateMajuri({
      netWeight,
      pcs: data.pcs,
      labourRate: data.majuriRate,
      labourRateType: data.unit
    })

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const stockDate = data.stockDate || dayjs().format('YYYY-MM-DD')
    const id = uuidv4()

    const transaction = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO item_opening_stock (
          id, stock_date, item_id, stamp_id, design_id, barcode, huid, location,
          diamond_carats, diamond_pcs, stone_amount, remark,
          pcs, gross_weight, less_weight, add_weight, net_weight, tanch,
          wastage, hishob, unit, fine, majuri_rate, majuri, active,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        id,
        stockDate,
        data.itemId,
        emptyToNull(data.stampId),
        emptyToNull(data.designId),
        data.barcode,
        data.huid,
        data.location,
        data.diamondCarats,
        data.diamondPcs,
        data.stoneAmount,
        data.remark,
        data.pcs,
        data.grossWeight,
        data.lessWeight,
        data.addWeight,
        netWeight,
        data.tanch,
        data.wastage,
        hishob,
        data.unit,
        fine,
        data.majuriRate,
        majuri,
        data.active ? 1 : 0,
        now,
        now
      )

      inventoryMovementService.postMovement({
        sourceType: 'OPENING_STOCK',
        sourceId: id,
        movementType: 'OPENING_STOCK',
        entryDate: stockDate,
        itemId: data.itemId,
        stampId: emptyToNull(data.stampId),
        designId: emptyToNull(data.designId),
        metalType: item.metal_type,
        pcsDelta: data.pcs,
        grossWeightDelta: data.grossWeight,
        netWeightDelta: netWeight,
        fineDelta: fine,
        narration: 'Item opening stock'
      })
    })

    transaction()

    return this.getById(id)
  },

  update(id: string, payload: OpeningStockPayload): OpeningStockRecord {
    const parseResult = openingStockSchema.safeParse(payload)
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message || 'Invalid opening stock payload')
    }
    const data = parseResult.data
    const db = getDatabase()
    const item = getItemMeta(data.itemId)

    const existing = db
      .prepare(`SELECT id FROM item_opening_stock WHERE id = ? AND deleted_at IS NULL`)
      .get(id)

    if (!existing) {
      throw new NotFoundError('Opening stock not found')
    }

    const netWeight = calculateNetWeight(data.grossWeight, data.lessWeight, data.addWeight)
    const hishob = calculateHishob(data.tanch, data.wastage)
    const fine = calculateFine(netWeight, data.tanch, data.wastage)
    const majuri = calculateMajuri({
      netWeight,
      pcs: data.pcs,
      labourRate: data.majuriRate,
      labourRateType: data.unit
    })

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const stockDate = data.stockDate || dayjs().format('YYYY-MM-DD')

    const transaction = db.transaction(() => {
      db.prepare(
        `
        UPDATE item_opening_stock
        SET
          stock_date = ?, item_id = ?, stamp_id = ?, design_id = ?, barcode = ?,
          huid = ?, location = ?, diamond_carats = ?, diamond_pcs = ?, stone_amount = ?,
          remark = ?, pcs = ?, gross_weight = ?, less_weight = ?, add_weight = ?,
          net_weight = ?, tanch = ?, wastage = ?, hishob = ?, unit = ?, fine = ?,
          majuri_rate = ?, majuri = ?, active = ?, updated_at = ?
        WHERE id = ?
      `
      ).run(
        stockDate,
        data.itemId,
        emptyToNull(data.stampId),
        emptyToNull(data.designId),
        data.barcode,
        data.huid,
        data.location,
        data.diamondCarats,
        data.diamondPcs,
        data.stoneAmount,
        data.remark,
        data.pcs,
        data.grossWeight,
        data.lessWeight,
        data.addWeight,
        netWeight,
        data.tanch,
        data.wastage,
        hishob,
        data.unit,
        fine,
        data.majuriRate,
        majuri,
        data.active ? 1 : 0,
        now,
        id
      )

      inventoryMovementService.revertMovement('OPENING_STOCK', id)

      inventoryMovementService.postMovement({
        sourceType: 'OPENING_STOCK',
        sourceId: id,
        movementType: 'OPENING_STOCK',
        entryDate: stockDate,
        itemId: data.itemId,
        stampId: emptyToNull(data.stampId),
        designId: emptyToNull(data.designId),
        metalType: item.metal_type,
        pcsDelta: data.pcs,
        grossWeightDelta: data.grossWeight,
        netWeightDelta: netWeight,
        fineDelta: fine,
        narration: 'Item opening stock (updated)'
      })
    })

    transaction()

    return this.getById(id)
  },

  delete(id: string): { success: boolean } {
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const transaction = db.transaction(() => {
      db.prepare(
        `
        UPDATE item_opening_stock
        SET deleted_at = ?, updated_at = ?
        WHERE id = ?
        AND deleted_at IS NULL
      `
      ).run(now, now, id)

      inventoryMovementService.revertMovement('OPENING_STOCK', id)
    })

    transaction()

    return { success: true }
  },

  getById(id: string): OpeningStockRecord {
    const db = getDatabase()

    const row = db
      .prepare(
        `
        SELECT
          os.id,
          os.stock_date,
          os.item_id,
          i.item_name,
          i.metal_type,
          os.stamp_id,
          ist.stamp_name,
          os.design_id,
          idg.design_name,
          os.barcode,
          os.huid,
          os.location,
          os.diamond_carats,
          os.diamond_pcs,
          os.stone_amount,
          os.remark,
          os.pcs,
          os.gross_weight,
          os.less_weight,
          os.add_weight,
          os.net_weight,
          os.tanch,
          os.wastage,
          os.hishob,
          os.unit,
          os.fine,
          os.majuri_rate,
          os.majuri,
          os.active,
          os.created_at,
          os.updated_at
        FROM item_opening_stock os
        INNER JOIN items i ON i.id = os.item_id
        LEFT JOIN item_stamps ist ON ist.id = os.stamp_id
        LEFT JOIN item_designs idg ON idg.id = os.design_id
        WHERE os.id = ?
        AND os.deleted_at IS NULL
      `
      )
      .get(id) as OpeningStockRow | undefined

    if (!row) {
      throw new NotFoundError('Opening stock not found')
    }

    return mapRow(row)
  }
}
