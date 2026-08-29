import { BaseRepository } from './BaseRepository'

export interface AccountLedgerEntry {
  id: string
  sourceType: string
  sourceId: string
  entryDate: string
  accountId: string
  metalType?: string | null
  fineJama?: number
  fineNave?: number
  cashJama?: number
  cashNave?: number
  bankJama?: number
  bankNave?: number
  anamatJama?: number
  anamatNave?: number
  narration?: string | null
  createdAt: string
}

export interface LedgerSumRow {
  gold_fine_nave: number
  gold_fine_jama: number
  silver_fine_nave: number
  silver_fine_jama: number
  cash_nave: number
  cash_jama: number
  bank_nave: number
  bank_jama: number
  anamat_nave: number
  anamat_jama: number
}

export interface AccountLedgerRow {
  id: string
  source_type: string
  source_id: string
  entry_date: string
  account_id: string
  metal_type: string | null
  fine_jama: number
  fine_nave: number
  cash_jama: number
  cash_nave: number
  bank_jama: number
  bank_nave: number
  anamat_jama: number
  anamat_nave: number
  narration: string | null
  created_at: string
  bill_no?: string | null
}

export class AccountLedgerRepository extends BaseRepository {
  insert(entry: AccountLedgerEntry): void {
    this.db
      .prepare(
        `
        INSERT INTO account_ledger (
          id, source_type, source_id, entry_date, account_id,
          metal_type, fine_jama, fine_nave, cash_jama, cash_nave,
          bank_jama, bank_nave, anamat_jama, anamat_nave, narration, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entry.id,
        entry.sourceType,
        entry.sourceId,
        entry.entryDate,
        entry.accountId,
        entry.metalType ?? null,
        entry.fineJama ?? 0,
        entry.fineNave ?? 0,
        entry.cashJama ?? 0,
        entry.cashNave ?? 0,
        entry.bankJama ?? 0,
        entry.bankNave ?? 0,
        entry.anamatJama ?? 0,
        entry.anamatNave ?? 0,
        entry.narration ?? null,
        entry.createdAt
      )
  }

  deleteBySource(sourceType: string | string[], sourceId: string): void {
    if (Array.isArray(sourceType)) {
      const placeholders = sourceType.map(() => '?').join(', ')
      this.db
        .prepare(`DELETE FROM account_ledger WHERE source_type IN (${placeholders}) AND source_id = ?`)
        .run(...sourceType, sourceId)
    } else {
      this.db
        .prepare(`DELETE FROM account_ledger WHERE source_type = ? AND source_id = ?`)
        .run(sourceType, sourceId)
    }
  }

  getAccountSums(accountId: string): LedgerSumRow {
    const sums = this.db
      .prepare(
        `
        SELECT
          COALESCE(SUM(CASE WHEN metal_type = 'Gold' THEN fine_nave ELSE 0 END), 0) AS gold_fine_nave,
          COALESCE(SUM(CASE WHEN metal_type = 'Gold' THEN fine_jama ELSE 0 END), 0) AS gold_fine_jama,
          COALESCE(SUM(CASE WHEN metal_type = 'Silver' THEN fine_nave ELSE 0 END), 0) AS silver_fine_nave,
          COALESCE(SUM(CASE WHEN metal_type = 'Silver' THEN fine_jama ELSE 0 END), 0) AS silver_fine_jama,
          COALESCE(SUM(cash_nave), 0) AS cash_nave,
          COALESCE(SUM(cash_jama), 0) AS cash_jama,
          COALESCE(SUM(bank_nave), 0) AS bank_nave,
          COALESCE(SUM(bank_jama), 0) AS bank_jama,
          COALESCE(SUM(anamat_nave), 0) AS anamat_nave,
          COALESCE(SUM(anamat_jama), 0) AS anamat_jama
        FROM account_ledger
        WHERE account_id = ?
      `
      )
      .get(accountId) as LedgerSumRow

    return sums
  }

  getAllAccountSums(): (LedgerSumRow & { account_id: string })[] {
    return this.db
      .prepare(
        `
        SELECT
          account_id,
          COALESCE(SUM(CASE WHEN metal_type = 'Gold' THEN fine_nave ELSE 0 END), 0) AS gold_fine_nave,
          COALESCE(SUM(CASE WHEN metal_type = 'Gold' THEN fine_jama ELSE 0 END), 0) AS gold_fine_jama,
          COALESCE(SUM(CASE WHEN metal_type = 'Silver' THEN fine_nave ELSE 0 END), 0) AS silver_fine_nave,
          COALESCE(SUM(CASE WHEN metal_type = 'Silver' THEN fine_jama ELSE 0 END), 0) AS silver_fine_jama,
          COALESCE(SUM(cash_nave), 0) AS cash_nave,
          COALESCE(SUM(cash_jama), 0) AS cash_jama,
          COALESCE(SUM(bank_nave), 0) AS bank_nave,
          COALESCE(SUM(bank_jama), 0) AS bank_jama,
          COALESCE(SUM(anamat_nave), 0) AS anamat_nave,
          COALESCE(SUM(anamat_jama), 0) AS anamat_jama
        FROM account_ledger
        GROUP BY account_id
      `
      )
      .all() as (LedgerSumRow & { account_id: string })[]
  }

  getLastEntryDateByAccount(): { account_id: string; last_entry_date: string }[] {
    return this.db
      .prepare(
        `
        SELECT
          account_id,
          MAX(entry_date) AS last_entry_date
        FROM account_ledger
        GROUP BY account_id
      `
      )
      .all() as { account_id: string; last_entry_date: string }[]
  }

  getPriorLedgerEntries(accountId: string, fromDate: string): AccountLedgerRow[] {
    return this.db
      .prepare(
        `
        SELECT
          al.id, al.source_type, al.source_id, al.entry_date, al.account_id,
          al.metal_type, al.fine_jama, al.fine_nave, al.cash_jama, al.cash_nave,
          al.bank_jama, al.bank_nave, al.anamat_jama, al.anamat_nave,
          al.narration, al.created_at
        FROM account_ledger al
        WHERE al.account_id = ? AND al.entry_date < ?
      `
      )
      .all(accountId, fromDate) as AccountLedgerRow[]
  }

  getLedgerDetails(
    accountId: string,
    fromDate?: string,
    toDate?: string
  ): AccountLedgerRow[] {
    const conditions = ['al.account_id = ?']
    const params: string[] = [accountId]

    if (fromDate) {
      conditions.push('al.entry_date >= ?')
      params.push(fromDate)
    }

    if (toDate) {
      conditions.push('al.entry_date <= ?')
      params.push(toDate)
    }

    const query = `
      SELECT
        al.id, al.source_type, al.source_id, al.entry_date, al.account_id,
        al.metal_type, al.fine_jama, al.fine_nave, al.cash_jama, al.cash_nave,
        al.bank_jama, al.bank_nave, al.anamat_jama, al.anamat_nave,
        al.narration, al.created_at,
        COALESCE(sh.sale_no, ph.purchase_no, srh.return_no, prh.return_no, cv.voucher_no, '') AS bill_no
      FROM account_ledger al
      LEFT JOIN sale_headers sh ON sh.id = al.source_id AND al.source_type IN ('SALE', 'SALE_PAYMENT')
      LEFT JOIN purchase_headers ph ON ph.id = al.source_id AND al.source_type IN ('PURCHASE', 'PURCHASE_PAYMENT')
      LEFT JOIN sale_return_headers srh ON srh.id = al.source_id AND al.source_type = 'SALE_RETURN'
      LEFT JOIN purchase_return_headers prh ON prh.id = al.source_id AND al.source_type = 'PURCHASE_RETURN'
      LEFT JOIN cash_vouchers cv ON cv.id = al.source_id AND al.source_type IN ('CASH_RECEIPT', 'CASH_PAYMENT')
      WHERE ${conditions.join(' AND ')}
      ORDER BY al.entry_date ASC, al.created_at ASC
    `

    return this.db.prepare(query).all(...params) as AccountLedgerRow[]
  }
}
