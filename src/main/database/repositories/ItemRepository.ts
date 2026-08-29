import { BaseRepository } from './BaseRepository'

export interface ItemRow {
  id: string
  item_name: string
  metal_type: string
  item_group_id: string
  group_name: string
  default_stamp_id: string | null
  stamp_name: string | null
  default_design_id: string | null
  design_name: string | null
  barcode_item: number
  barcode_type: string | null
  barcode_value: string | null
  labour_charges_by: string
  sale_purchase_by: string
  gst_hsn_code: string | null
  fixed_weight_per_pcs: number
  default_tanch: number
  default_wastage: number
  default_labour_rate: number
  labour_rate_type: string
  active: number
  created_at: string
  updated_at: string
}

function emptyToNull(value?: string): string | null {
  if (!value) return null
  return value.trim() ? value.trim() : null
}

const itemSelectSql = `
  SELECT
    i.id,
    i.item_name,
    i.metal_type,
    i.item_group_id,
    ig.group_name,
    i.default_stamp_id,
    ist.stamp_name,
    i.default_design_id,
    idg.design_name,
    i.barcode_item,
    i.barcode_type,
    i.barcode_value,
    i.labour_charges_by,
    i.sale_purchase_by,
    i.gst_hsn_code,
    i.fixed_weight_per_pcs,
    i.default_tanch,
    i.default_wastage,
    i.default_labour_rate,
    i.labour_rate_type,
    i.active,
    i.created_at,
    i.updated_at
  FROM items i
  INNER JOIN item_groups ig ON ig.id = i.item_group_id
  LEFT JOIN item_stamps ist ON ist.id = i.default_stamp_id
  LEFT JOIN item_designs idg ON idg.id = i.default_design_id
`

export class ItemRepository extends BaseRepository {
  findAll(): ItemRow[] {
    return this.db
      .prepare(
        `
        ${itemSelectSql}
        WHERE i.deleted_at IS NULL
        ORDER BY i.metal_type ASC, i.item_name ASC
      `
      )
      .all() as ItemRow[]
  }

  findById(id: string): ItemRow | undefined {
    return this.db
      .prepare(
        `
        ${itemSelectSql}
        WHERE i.id = ?
        AND i.deleted_at IS NULL
      `
      )
      .get(id) as ItemRow | undefined
  }

  findDuplicate(name: string, metalType: string, excludeId?: string): { id: string } | undefined {
    if (excludeId) {
      return this.db
        .prepare(
          `
          SELECT id FROM items
          WHERE LOWER(item_name) = LOWER(?)
          AND metal_type = ?
          AND id != ?
          AND deleted_at IS NULL
        `
        )
        .get(name, metalType, excludeId) as { id: string } | undefined
    }

    return this.db
      .prepare(
        `
        SELECT id FROM items
        WHERE LOWER(item_name) = LOWER(?)
        AND metal_type = ?
        AND deleted_at IS NULL
      `
      )
      .get(name, metalType) as { id: string } | undefined
  }

  checkReferenceExists(tableName: string, id: string): boolean {
    if (!id || !id.trim()) return true
    const row = this.db
      .prepare(`SELECT id FROM ${tableName} WHERE id = ? AND deleted_at IS NULL`)
      .get(id)
    return Boolean(row)
  }

  generateBarcode(metalType: string): string {
    const firstChar = (metalType || '').trim().charAt(0).toUpperCase() || 'X'
    const totalRow = this.db.prepare(`SELECT COUNT(*) AS count FROM items`).get() as { count: number }
    let sequence = Number(totalRow.count ?? 0) + 1
    const existsStmt = this.db.prepare(`SELECT id FROM items WHERE barcode_value = ?`)

    let candidate = `${firstChar}${String(sequence).padStart(6, '0')}`
    while (existsStmt.get(candidate)) {
      sequence += 1
      candidate = `${firstChar}${String(sequence).padStart(6, '0')}`
    }
    return candidate
  }

  insert(data: {
    id: string
    itemName: string
    metalType: string
    itemGroupId: string
    defaultStampId?: string
    defaultDesignId?: string
    barcodeItem: boolean
    barcodeType?: string
    labourChargesBy: string
    salePurchaseBy: string
    gstHsnCode?: string
    fixedWeightPerPcs: number
    defaultTanch: number
    defaultWastage: number
    defaultLabourRate: number
    labourRateType: string
    active: boolean
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO items (
          id, item_name, metal_type, item_group_id, default_stamp_id, default_design_id,
          barcode_item, barcode_type, labour_charges_by, sale_purchase_by, gst_hsn_code,
          fixed_weight_per_pcs, default_tanch, default_wastage, default_labour_rate,
          labour_rate_type, active, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.itemName,
        data.metalType,
        data.itemGroupId,
        emptyToNull(data.defaultStampId),
        emptyToNull(data.defaultDesignId),
        data.barcodeItem ? 1 : 0,
        data.barcodeType ?? '',
        data.labourChargesBy,
        data.salePurchaseBy,
        data.gstHsnCode ?? '',
        data.fixedWeightPerPcs,
        data.defaultTanch,
        data.defaultWastage,
        data.defaultLabourRate,
        data.labourRateType,
        data.active ? 1 : 0,
        data.createdAt,
        data.updatedAt
      )
  }

  update(
    id: string,
    data: {
      itemName: string
      metalType: string
      itemGroupId: string
      defaultStampId?: string
      defaultDesignId?: string
      barcodeItem: boolean
      barcodeType?: string
      labourChargesBy: string
      salePurchaseBy: string
      gstHsnCode?: string
      fixedWeightPerPcs: number
      defaultTanch: number
      defaultWastage: number
      defaultLabourRate: number
      labourRateType: string
      active: boolean
      updatedAt: string
    }
  ): void {
    this.db
      .prepare(
        `
        UPDATE items
        SET
          item_name = ?, metal_type = ?, item_group_id = ?, default_stamp_id = ?, default_design_id = ?,
          barcode_item = ?, barcode_type = ?, labour_charges_by = ?, sale_purchase_by = ?, gst_hsn_code = ?,
          fixed_weight_per_pcs = ?, default_tanch = ?, default_wastage = ?, default_labour_rate = ?,
          labour_rate_type = ?, active = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        data.itemName,
        data.metalType,
        data.itemGroupId,
        emptyToNull(data.defaultStampId),
        emptyToNull(data.defaultDesignId),
        data.barcodeItem ? 1 : 0,
        data.barcodeType ?? '',
        data.labourChargesBy,
        data.salePurchaseBy,
        data.gstHsnCode ?? '',
        data.fixedWeightPerPcs,
        data.defaultTanch,
        data.defaultWastage,
        data.defaultLabourRate,
        data.labourRateType,
        data.active ? 1 : 0,
        data.updatedAt,
        id
      )
  }

  updateBarcode(id: string, barcodeValue: string, updatedAt: string): void {
    this.db
      .prepare(`UPDATE items SET barcode_value = ?, updated_at = ? WHERE id = ?`)
      .run(barcodeValue, updatedAt, id)
  }

  delete(id: string, now: string): void {
    this.db
      .prepare(`UPDATE items SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(now, now, id)
  }
}
