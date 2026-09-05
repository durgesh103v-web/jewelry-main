import { BaseRepository } from './BaseRepository'
import type {
  JewelleryStockItemRecord,
  CreateStockItemPayload,
  StockItemStatus,
  TagStatus,
  ItemTimelineEvent
} from '../../../shared/types/tagging'

export class JewelleryStockItemRepository extends BaseRepository {
  /**
   * Resolve item by any unique identifier (Barcode, QR, RFID, Stock Code, Serial)
   */
  findByIdentifier(identifier: string): JewelleryStockItemRecord | null {
    const trimmed = identifier.trim()
    const query = `
      SELECT
        si.*,
        i.item_name,
        i.item_code,
        i.metal_type,
        c.name as category_name,
        s.stamp_name,
        d.design_name
      FROM jewellery_stock_items si
      JOIN items i ON i.id = si.item_id
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN item_stamps s ON s.id = i.default_stamp_id
      LEFT JOIN item_designs d ON d.id = i.default_design_id
      WHERE (
        si.barcode = ? OR
        si.qr_code = ? OR
        si.rfid_epc = ? OR
        si.stock_item_code = ? OR
        si.serial_number = ?
      ) AND si.deleted_at IS NULL
      LIMIT 1
    `
    const row = this.db.prepare(query).get(trimmed, trimmed, trimmed, trimmed, trimmed) as any
    return row ? this.mapRow(row) : null
  }

  findById(id: string): JewelleryStockItemRecord | null {
    const query = `
      SELECT
        si.*,
        i.item_name,
        i.item_code,
        i.metal_type,
        c.name as category_name,
        s.stamp_name,
        d.design_name
      FROM jewellery_stock_items si
      JOIN items i ON i.id = si.item_id
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN item_stamps s ON s.id = i.default_stamp_id
      LEFT JOIN item_designs d ON d.id = i.default_design_id
      WHERE si.id = ? AND si.deleted_at IS NULL
    `
    const row = this.db.prepare(query).get(id) as any
    return row ? this.mapRow(row) : null
  }

  findAll(filter?: { status?: StockItemStatus; itemId?: string; search?: string; location?: string }): JewelleryStockItemRecord[] {
    let query = `
      SELECT
        si.*,
        i.item_name,
        i.item_code,
        i.metal_type,
        c.name as category_name,
        s.stamp_name,
        d.design_name
      FROM jewellery_stock_items si
      JOIN items i ON i.id = si.item_id
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN item_stamps s ON s.id = i.default_stamp_id
      LEFT JOIN item_designs d ON d.id = i.default_design_id
      WHERE si.deleted_at IS NULL
    `
    const params: any[] = []

    if (filter?.status) {
      query += ` AND si.status = ?`
      params.push(filter.status)
    }

    if (filter?.itemId) {
      query += ` AND si.item_id = ?`
      params.push(filter.itemId)
    }

    if (filter?.location) {
      query += ` AND si.location = ?`
      params.push(filter.location)
    }

    if (filter?.search) {
      query += ` AND (si.stock_item_code LIKE ? OR si.barcode LIKE ? OR i.item_name LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s, s)
    }

    query += ` ORDER BY si.created_at DESC`

    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => this.mapRow(r))
  }

  insert(id: string, code: string, payload: CreateStockItemPayload, now: string): JewelleryStockItemRecord {
    const query = `
      INSERT INTO jewellery_stock_items (
        id, stock_item_code, item_id, barcode, qr_code, rfid_epc, serial_number,
        gross_weight, net_weight, fine_weight, purity_name, tunch,
        status, location, counter, tray, tag_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const fineWeight = payload.fineWeight !== undefined ? payload.fineWeight : payload.netWeight
    const tunch = payload.tunch !== undefined ? payload.tunch : 100
    const location = payload.location || 'MAIN_STORE'

    this.db.prepare(query).run(
      id,
      code,
      payload.itemId,
      payload.barcode || null,
      payload.qrCode || null,
      payload.rfidEpc || null,
      payload.serialNumber || null,
      payload.grossWeight,
      payload.netWeight,
      fineWeight,
      payload.purityName || '',
      tunch,
      'IN_STOCK',
      location,
      payload.counter || '',
      payload.tray || '',
      'ACTIVE',
      now,
      now
    )

    return this.findById(id)!
  }

  updateStatus(id: string, status: StockItemStatus, now: string): void {
    this.db
      .prepare(`UPDATE jewellery_stock_items SET status = ?, updated_at = ? WHERE id = ?`)
      .run(status, now, id)
  }

  updateBarcode(id: string, barcode: string, tagStatus: TagStatus, now: string): void {
    this.db
      .prepare(`UPDATE jewellery_stock_items SET barcode = ?, tag_status = ?, updated_at = ? WHERE id = ?`)
      .run(barcode, tagStatus, now, id)
  }

  updateRfid(id: string, rfidEpc: string, now: string): void {
    this.db
      .prepare(`UPDATE jewellery_stock_items SET rfid_epc = ?, updated_at = ? WHERE id = ?`)
      .run(rfidEpc, now, id)
  }

  recordScanTime(id: string, now: string): void {
    this.db
      .prepare(`UPDATE jewellery_stock_items SET last_scanned_at = ?, updated_at = ? WHERE id = ?`)
      .run(now, now, id)
  }

  logTagHistory(id: string, stockItemId: string, eventType: string, oldBarcode: string | null, newBarcode: string | null, reason: string, now: string): void {
    this.db
      .prepare(
        `
        INSERT INTO item_tag_history (id, stock_item_id, event_type, old_barcode, new_barcode, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(id, stockItemId, eventType, oldBarcode, newBarcode, reason, now)
  }

  getItemTimeline(stockItemId: string): ItemTimelineEvent[] {
    const item = this.findById(stockItemId)
    if (!item) return []

    const events: ItemTimelineEvent[] = [
      {
        date: item.createdAt,
        eventType: 'STOCK_INITIALIZED',
        description: `Physical stock item initialized (${item.stockItemCode}) with weight ${item.grossWeight.toFixed(3)}g`,
        performedBy: 'System',
        statusAfter: 'IN_STOCK'
      }
    ]

    // Tag history
    const tagRows = this.db
      .prepare(`SELECT * FROM item_tag_history WHERE stock_item_id = ? ORDER BY created_at ASC`)
      .all(stockItemId) as any[]

    for (const t of tagRows) {
      events.push({
        date: t.created_at,
        eventType: t.event_type,
        description: `Tag action: ${t.event_type} (${t.reason || 'No reason provided'})`,
        performedBy: t.performed_by || 'Admin',
        statusAfter: item.status
      })
    }

    return events.sort((a, b) => (a.date > b.date ? 1 : -1))
  }

  private mapRow(r: any): JewelleryStockItemRecord {
    return {
      id: r.id,
      stockItemCode: r.stock_item_code,
      itemId: r.item_id,
      itemName: r.item_name || 'Jewellery Item',
      itemCode: r.item_code,
      metalType: r.metal_type || 'GOLD',
      categoryName: r.category_name,
      stampName: r.stamp_name,
      designName: r.design_name,
      barcode: r.barcode,
      qrCode: r.qr_code,
      rfidEpc: r.rfid_epc,
      serialNumber: r.serial_number,
      grossWeight: Number(r.gross_weight || 0),
      netWeight: Number(r.net_weight || 0),
      fineWeight: Number(r.fine_weight || 0),
      purityName: r.purity_name,
      tunch: Number(r.tunch || 100),
      status: r.status as StockItemStatus,
      location: r.location || 'MAIN_STORE',
      counter: r.counter,
      tray: r.tray,
      tagStatus: r.tag_status as TagStatus,
      lastScannedAt: r.last_scanned_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }
  }
}
