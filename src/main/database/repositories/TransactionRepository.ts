import { BaseRepository } from './BaseRepository'

export class TransactionRepository extends BaseRepository {
  executeAtomic<T>(fn: () => T): T {
    return this.runInTransaction(fn)
  }

  insertStockLedger(data: {
    id: string
    sourceType: string
    sourceId: string
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
          id, source_type, source_id, entry_date, item_id, stamp_id, design_id,
          metal_type, pcs_delta, gross_weight_delta, net_weight_delta, fine_delta,
          narration, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.sourceType,
        data.sourceId,
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

  insertAccountLedger(data: {
    id: string
    sourceType: string
    sourceId: string
    sourceLineId?: string | null
    entryDate: string
    accountId: string
    metalType?: string
    fineJama: number
    fineNave: number
    cashJama: number
    cashNave: number
    bankJama: number
    bankNave: number
    anamatJama: number
    anamatNave: number
    narration?: string
    createdAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO account_ledger (
          id, source_type, source_id, source_line_id, entry_date, account_id,
          metal_type, fine_jama, fine_nave, cash_jama, cash_nave, bank_jama,
          bank_nave, anamat_jama, anamat_nave, narration, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.sourceType,
        data.sourceId,
        data.sourceLineId ?? null,
        data.entryDate,
        data.accountId,
        data.metalType ?? '',
        data.fineJama,
        data.fineNave,
        data.cashJama,
        data.cashNave,
        data.bankJama,
        data.bankNave,
        data.anamatJama,
        data.anamatNave,
        data.narration ?? '',
        data.createdAt
      )
  }

  deleteLedgerEntries(sourceType: string, sourceId: string): void {
    this.db
      .prepare(`DELETE FROM stock_ledger WHERE source_type = ? AND source_id = ?`)
      .run(sourceType, sourceId)
    this.db
      .prepare(`DELETE FROM account_ledger WHERE source_type = ? AND source_id = ?`)
      .run(sourceType, sourceId)
  }
}
