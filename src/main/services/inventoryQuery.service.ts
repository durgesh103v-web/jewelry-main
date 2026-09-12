import { getDatabase } from '../database/connection'
import { StockLedgerRepository, StockLedgerRow } from '../database/repositories/StockLedgerRepository'
import { ItemRepository, ItemRow } from '../database/repositories/ItemRepository'
import { NotFoundError } from '../ipc/errors'

const stockLedgerRepository = new StockLedgerRepository()
const itemRepository = new ItemRepository()

export interface LocationRecord {
  id: string
  locationName: string
  locationCode: string
  description: string
  active: boolean
}

export const inventoryQueryService = {
  findItemByBarcode(barcode: string): ItemRow {
    const clean = barcode.trim()
    if (!clean) {
      throw new NotFoundError('Barcode is required')
    }

    const db = getDatabase()
    const row = db
      .prepare(
        `
        SELECT
          i.id, i.item_name, i.metal_type, i.item_group_id, ig.group_name,
          i.default_stamp_id, ist.stamp_name, i.default_design_id, idg.design_name,
          i.barcode_item, i.barcode_type, i.barcode_value, i.labour_charges_by,
          i.sale_purchase_by, i.gst_hsn_code, i.fixed_weight_per_pcs, i.default_tanch,
          i.default_wastage, i.default_labour_rate, i.labour_rate_type, i.active,
          i.created_at, i.updated_at
        FROM items i
        INNER JOIN item_groups ig ON ig.id = i.item_group_id
        LEFT JOIN item_stamps ist ON ist.id = i.default_stamp_id
        LEFT JOIN item_designs idg ON idg.id = i.default_design_id
        WHERE (i.barcode_value = ? OR i.id = ? OR LOWER(i.item_name) = LOWER(?)) AND i.deleted_at IS NULL
        LIMIT 1
      `
      )
      .get(clean, clean, clean) as ItemRow | undefined

    if (!row) {
      throw new NotFoundError(`No item found for barcode: ${clean}`)
    }

    return row
  },

  findItemBySku(sku: string): ItemRow {
    const clean = sku.trim()
    if (!clean) {
      throw new NotFoundError('SKU is required')
    }

    const db = getDatabase()
    const row = db
      .prepare(
        `
        SELECT
          i.id, i.item_name, i.metal_type, i.item_group_id, ig.group_name,
          i.default_stamp_id, ist.stamp_name, i.default_design_id, idg.design_name,
          i.barcode_item, i.barcode_type, i.barcode_value, i.labour_charges_by,
          i.sale_purchase_by, i.gst_hsn_code, i.fixed_weight_per_pcs, i.default_tanch,
          i.default_wastage, i.default_labour_rate, i.labour_rate_type, i.active,
          i.created_at, i.updated_at
        FROM items i
        INNER JOIN item_groups ig ON ig.id = i.item_group_id
        LEFT JOIN item_stamps ist ON ist.id = i.default_stamp_id
        LEFT JOIN item_designs idg ON idg.id = i.default_design_id
        WHERE i.sku = ? AND i.deleted_at IS NULL
      `
      )
      .get(clean) as ItemRow | undefined

    if (!row) {
      throw new NotFoundError(`No item found for SKU: ${clean}`)
    }

    return row
  },

  findItemById(id: string): ItemRow {
    const row = itemRepository.findById(id)
    if (!row) {
      throw new NotFoundError('Item not found')
    }
    return row
  },

  getItemStock(itemId: string) {
    return stockLedgerRepository.getItemBalance(itemId)
  },

  getItemMovementHistory(itemId: string): StockLedgerRow[] {
    return stockLedgerRepository.getItemMovementHistory(itemId)
  },

  getLocations(): LocationRecord[] {
    const db = getDatabase()
    const rows = db
      .prepare(`SELECT id, location_name, location_code, description, active FROM locations WHERE active = 1 ORDER BY location_name ASC`)
      .all() as { id: string; location_name: string; location_code: string; description: string | null; active: number }[]

    return rows.map((r) => ({
      id: r.id,
      locationName: r.location_name,
      locationCode: r.location_code,
      description: r.description ?? '',
      active: Boolean(r.active)
    }))
  }
}
