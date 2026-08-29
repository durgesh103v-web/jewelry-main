import { BaseRepository } from './BaseRepository'
import type {
  StockTakeSessionRecord,
  StockTakeScanRecord,
  StockTakeSummary,
  JewelleryStockItemRecord,
  ScanIdentifierType
} from '../../../shared/types/tagging'

export class StockTakeRepository extends BaseRepository {
  createSession(id: string, sessionNumber: string, location: string, createdBy: string, now: string): StockTakeSessionRecord {
    // Count expected items in this location
    const countRow = this.db
      .prepare(`SELECT COUNT(*) as count FROM jewellery_stock_items WHERE location = ? AND status = 'IN_STOCK' AND deleted_at IS NULL`)
      .get(location) as any
    const totalExpected = Number(countRow?.count || 0)

    const query = `
      INSERT INTO stock_take_sessions (
        id, session_number, location, status, total_expected, total_scanned,
        total_matched, total_missing, total_unexpected, created_by, created_at
      ) VALUES (?, ?, ?, 'IN_PROGRESS', ?, 0, 0, ?, 0, ?, ?)
    `
    this.db.prepare(query).run(id, sessionNumber, location, totalExpected, totalExpected, createdBy, now)
    return this.getSessionById(id)!
  }

  getSessionById(id: string): StockTakeSessionRecord | null {
    const row = this.db.prepare(`SELECT * FROM stock_take_sessions WHERE id = ?`).get(id) as any
    return row ? this.mapSession(row) : null
  }

  getActiveSession(): StockTakeSessionRecord | null {
    const row = this.db
      .prepare(`SELECT * FROM stock_take_sessions WHERE status = 'IN_PROGRESS' ORDER BY created_at DESC LIMIT 1`)
      .get() as any
    return row ? this.mapSession(row) : null
  }

  listSessions(): StockTakeSessionRecord[] {
    const rows = this.db.prepare(`SELECT * FROM stock_take_sessions ORDER BY created_at DESC`).all() as any[]
    return rows.map((r) => this.mapSession(r))
  }

  recordScan(
    scanId: string,
    sessionId: string,
    stockItemId: string | null,
    identifierType: ScanIdentifierType,
    identifierValue: string,
    scanResult: 'MATCHED' | 'MISSING' | 'UNEXPECTED' | 'WRONG_LOCATION' | 'WRONG_STATUS',
    operator: string,
    now: string
  ): StockTakeScanRecord {
    const query = `
      INSERT INTO stock_take_scans (
        id, session_id, stock_item_id, identifier_type, identifier_value,
        scan_result, scanned_at, operator
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    this.db.prepare(query).run(scanId, sessionId, stockItemId, identifierType, identifierValue, scanResult, now, operator)

    // Recalculate session counters
    const matchedCount = this.db
      .prepare(`SELECT COUNT(DISTINCT stock_item_id) as c FROM stock_take_scans WHERE session_id = ? AND scan_result = 'MATCHED'`)
      .get(sessionId) as any
    const unexpectedCount = this.db
      .prepare(`SELECT COUNT(*) as c FROM stock_take_scans WHERE session_id = ? AND scan_result = 'UNEXPECTED'`)
      .get(sessionId) as any
    const totalScans = this.db
      .prepare(`SELECT COUNT(*) as c FROM stock_take_scans WHERE session_id = ?`)
      .get(sessionId) as any

    const session = this.getSessionById(sessionId)!
    const matched = Number(matchedCount?.c || 0)
    const unexpected = Number(unexpectedCount?.c || 0)
    const missing = Math.max(0, session.totalExpected - matched)

    this.db
      .prepare(
        `
        UPDATE stock_take_sessions
        SET total_scanned = ?, total_matched = ?, total_missing = ?, total_unexpected = ?
        WHERE id = ?
      `
      )
      .run(Number(totalScans?.c || 0), matched, missing, unexpected, sessionId)

    return {
      id: scanId,
      sessionId,
      stockItemId,
      identifierType,
      identifierValue,
      scanResult,
      scannedAt: now,
      operator
    }
  }

  completeSession(id: string, notes: string, now: string): StockTakeSessionRecord {
    this.db
      .prepare(`UPDATE stock_take_sessions SET status = 'COMPLETED', notes = ?, completed_at = ? WHERE id = ?`)
      .run(notes, now, id)
    return this.getSessionById(id)!
  }

  getSessionSummary(sessionId: string): StockTakeSummary {
    const session = this.getSessionById(sessionId)!

    const scanRows = this.db
      .prepare(
        `
        SELECT
          sts.*,
          si.stock_item_code,
          i.item_name
        FROM stock_take_scans sts
        LEFT JOIN jewellery_stock_items si ON si.id = sts.stock_item_id
        LEFT JOIN items i ON i.id = si.item_id
        WHERE sts.session_id = ?
        ORDER BY sts.scanned_at DESC
      `
      )
      .all(sessionId) as any[]

    const scans: StockTakeScanRecord[] = scanRows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      stockItemId: r.stock_item_id,
      stockItemCode: r.stock_item_code,
      itemName: r.item_name,
      identifierType: r.identifier_type as ScanIdentifierType,
      identifierValue: r.identifier_value,
      scanResult: r.scan_result,
      scannedAt: r.scanned_at,
      operator: r.operator
    }))

    // Missing Items: In stock at this location that have not been scanned as matched
    const missingQuery = `
      SELECT
        si.*,
        i.item_name,
        i.item_code,
        i.metal_type,
        c.category_name,
        s.stamp_name,
        d.design_name
      FROM jewellery_stock_items si
      JOIN items i ON i.id = si.item_id
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN item_stamps s ON s.id = i.stamp_id
      LEFT JOIN item_designs d ON d.id = i.design_id
      WHERE si.location = ? AND si.status = 'IN_STOCK' AND si.deleted_at IS NULL
        AND si.id NOT IN (
          SELECT stock_item_id FROM stock_take_scans WHERE session_id = ? AND stock_item_id IS NOT NULL AND scan_result = 'MATCHED'
        )
    `
    const missingRows = this.db.prepare(missingQuery).all(session.location, sessionId) as any[]
    const missingItems: JewelleryStockItemRecord[] = missingRows.map((r) => ({
      id: r.id,
      stockItemCode: r.stock_item_code,
      itemId: r.item_id,
      itemName: r.item_name,
      itemCode: r.item_code,
      metalType: r.metal_type,
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
      status: r.status,
      location: r.location,
      counter: r.counter,
      tray: r.tray,
      tagStatus: r.tag_status,
      lastScannedAt: r.last_scanned_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))

    return {
      session,
      scans,
      missingItems
    }
  }

  private mapSession(r: any): StockTakeSessionRecord {
    return {
      id: r.id,
      sessionNumber: r.session_number,
      location: r.location,
      status: r.status,
      totalExpected: Number(r.total_expected || 0),
      totalScanned: Number(r.total_scanned || 0),
      totalMatched: Number(r.total_matched || 0),
      totalMissing: Number(r.total_missing || 0),
      totalUnexpected: Number(r.total_unexpected || 0),
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: r.created_at,
      completedAt: r.completed_at
    }
  }
}
