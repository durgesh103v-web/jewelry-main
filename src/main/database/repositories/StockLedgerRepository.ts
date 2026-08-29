import { BaseRepository } from './BaseRepository'

export interface StockLedgerRow {
  id: string
  source_type: string
  source_id: string
  movement_type: string | null
  location_id: string | null
  entry_date: string
  item_id: string
  item_name?: string
  stamp_id: string | null
  design_id: string | null
  metal_type: string
  pcs_delta: number
  gross_weight_delta: number
  net_weight_delta: number
  fine_delta: number
  narration: string | null
  created_at: string
}

export class StockLedgerRepository extends BaseRepository {
  insert(data: {
    id: string
    sourceType: string
    sourceId: string
    movementType?: string
    locationId?: string | null
    entryDate: string
    itemId: string
    stampId?: string | null
    designId?: string | null
    metalType: string
    pcsDelta: number
    grossWeightDelta: number
    netWeightDelta: number
    fineDelta: number
    narration?: string
    createdAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO stock_ledger (
          id, source_type, source_id, movement_type, location_id, entry_date, item_id,
          stamp_id, design_id, metal_type, pcs_delta, gross_weight_delta, net_weight_delta,
          fine_delta, narration, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.sourceType,
        data.sourceId,
        data.movementType ?? data.sourceType,
        data.locationId ?? null,
        data.entryDate,
        data.itemId,
        data.stampId ?? null,
        data.designId ?? null,
        data.metalType,
        data.pcsDelta,
        data.grossWeightDelta,
        data.netWeightDelta,
        data.fineDelta,
        data.narration ?? '',
        data.createdAt
      )
  }

  deleteBySource(sourceType: string, sourceId: string): void {
    this.db.prepare(`DELETE FROM stock_ledger WHERE source_type = ? AND source_id = ?`).run(sourceType, sourceId)
  }

  getItemBalance(itemId: string): {
    totalPcs: number
    totalGrossWeight: number
    totalNetWeight: number
    totalFine: number
  } {
    const row = this.db
      .prepare(
        `
        SELECT
          COALESCE(SUM(pcs_delta), 0) AS total_pcs,
          COALESCE(SUM(gross_weight_delta), 0) AS total_gross_weight,
          COALESCE(SUM(net_weight_delta), 0) AS total_net_weight,
          COALESCE(SUM(fine_delta), 0) AS total_fine
        FROM stock_ledger
        WHERE item_id = ?
      `
      )
      .get(itemId) as {
      total_pcs: number
      total_gross_weight: number
      total_net_weight: number
      total_fine: number
    }

    return {
      totalPcs: Number(row?.total_pcs ?? 0),
      totalGrossWeight: Number(row?.total_gross_weight ?? 0),
      totalNetWeight: Number(row?.total_net_weight ?? 0),
      totalFine: Number(row?.total_fine ?? 0)
    }
  }

  getItemMovementHistory(itemId: string): StockLedgerRow[] {
    return this.db
      .prepare(
        `
        SELECT sl.*, i.item_name
        FROM stock_ledger sl
        LEFT JOIN items i ON i.id = sl.item_id
        WHERE sl.item_id = ?
        ORDER BY sl.entry_date DESC, sl.created_at DESC
      `
      )
      .all(itemId) as StockLedgerRow[]
  }
}
