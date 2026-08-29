import { BaseRepository } from './BaseRepository'
import type {
  ReportDateFilter,
  DayBookRow,
  CashBookRow,
  BankBookRow,
  SalesRegisterRow,
  PurchaseRegisterRow,
  ReturnRegisterRow,
  PartyLedgerRow,
  PartyOutstandingRow,
  AdvanceReportRow,
  OldGoldReportRow,
  MetalExchangeReportRow,
  StockMovementReportRow,
  StockValuationReportRow,
  TrialBalanceRow
} from '../../../shared/types/reports'

export class FinancialReportRepository extends BaseRepository {
  /**
   * Day Book - Chronological transactions across all ledger entries
   */
  getDayBook(filter?: ReportDateFilter): DayBookRow[] {
    let query = `
      SELECT
        al.id,
        al.entry_date,
        al.source_type,
        al.source_id,
        COALESCE(si.invoice_number, pi.invoice_number, rt.return_number, sh.sale_no, ph.purchase_no, cv.voucher_no, al.source_id) AS bill_no,
        al.account_id,
        a.account_name,
        ag.group_name,
        al.metal_type,
        al.cash_nave,
        al.cash_jama,
        al.bank_nave,
        al.bank_jama,
        al.narration,
        al.created_at
      FROM account_ledger al
      JOIN accounts a ON a.id = al.account_id
      LEFT JOIN account_groups ag ON ag.id = a.account_group_id
      LEFT JOIN sales_invoices si ON si.id = al.source_id AND al.source_type IN ('SALES_INVOICE', 'POS_SALE')
      LEFT JOIN purchase_invoices pi ON pi.id = al.source_id AND al.source_type = 'PURCHASE_INVOICE'
      LEFT JOIN return_transactions rt ON rt.id = al.source_id AND al.source_type IN ('SALES_RETURN', 'PURCHASE_RETURN')
      LEFT JOIN sale_headers sh ON sh.id = al.source_id AND al.source_type = 'SALE'
      LEFT JOIN purchase_headers ph ON ph.id = al.source_id AND al.source_type = 'PURCHASE'
      LEFT JOIN cash_vouchers cv ON cv.id = al.source_id AND al.source_type IN ('CASH_PAYMENT', 'CASH_RECEIPT')
      WHERE 1=1
    `
    const params: any[] = []

    if (filter?.startDate) {
      query += ` AND al.entry_date >= ?`
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      query += ` AND al.entry_date <= ?`
      params.push(filter.endDate)
    }

    if (filter?.accountId) {
      query += ` AND al.account_id = ?`
      params.push(filter.accountId)
    }

    if (filter?.search) {
      query += ` AND (a.account_name LIKE ? OR al.narration LIKE ? OR bill_no LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s, s)
    }

    query += ` ORDER BY al.entry_date ASC, al.created_at ASC`

    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => ({
      id: r.id,
      entryDate: r.entry_date,
      sourceType: r.source_type,
      sourceId: r.source_id,
      billNo: r.bill_no || '',
      accountId: r.account_id,
      accountName: r.account_name,
      groupName: r.group_name || 'General',
      metalType: r.metal_type,
      cashNave: Number(r.cash_nave || 0),
      cashJama: Number(r.cash_jama || 0),
      bankNave: Number(r.bank_nave || 0),
      bankJama: Number(r.bank_jama || 0),
      narration: r.narration,
      createdAt: r.created_at
    }))
  }

  /**
   * Cash Book Opening Balance prior to startDate
   */
  getCashOpening(startDate?: string): number {
    let openingFromAccounts = 0
    const accountsRow = this.db
      .prepare(`SELECT SUM(opening_cash) as total FROM accounts WHERE deleted_at IS NULL`)
      .get() as any
    openingFromAccounts = Number(accountsRow?.total || 0)

    if (!startDate) return openingFromAccounts

    const priorRow = this.db
      .prepare(
        `
        SELECT
          SUM(cash_nave) as total_nave,
          SUM(cash_jama) as total_jama
        FROM account_ledger
        WHERE entry_date < ?
      `
      )
      .get(startDate) as any

    const priorNave = Number(priorRow?.total_nave || 0)
    const priorJama = Number(priorRow?.total_jama || 0)

    return openingFromAccounts + priorNave - priorJama
  }

  /**
   * Cash Book Rows
   */
  getCashBookRows(filter?: ReportDateFilter): CashBookRow[] {
    let query = `
      SELECT
        al.id,
        al.entry_date,
        al.source_type,
        al.source_id,
        COALESCE(si.invoice_number, pi.invoice_number, rt.return_number, sh.sale_no, ph.purchase_no, cv.voucher_no, al.source_id) AS bill_no,
        al.account_id,
        a.account_name,
        al.narration,
        al.cash_jama AS cash_in,
        al.cash_nave AS cash_out
      FROM account_ledger al
      JOIN accounts a ON a.id = al.account_id
      LEFT JOIN sales_invoices si ON si.id = al.source_id AND al.source_type IN ('SALES_INVOICE', 'POS_SALE')
      LEFT JOIN purchase_invoices pi ON pi.id = al.source_id AND al.source_type = 'PURCHASE_INVOICE'
      LEFT JOIN return_transactions rt ON rt.id = al.source_id AND al.source_type IN ('SALES_RETURN', 'PURCHASE_RETURN')
      LEFT JOIN sale_headers sh ON sh.id = al.source_id AND al.source_type = 'SALE'
      LEFT JOIN purchase_headers ph ON ph.id = al.source_id AND al.source_type = 'PURCHASE'
      LEFT JOIN cash_vouchers cv ON cv.id = al.source_id AND al.source_type IN ('CASH_PAYMENT', 'CASH_RECEIPT')
      WHERE (al.cash_jama > 0 OR al.cash_nave > 0)
    `
    const params: any[] = []

    if (filter?.startDate) {
      query += ` AND al.entry_date >= ?`
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      query += ` AND al.entry_date <= ?`
      params.push(filter.endDate)
    }

    if (filter?.search) {
      query += ` AND (a.account_name LIKE ? OR al.narration LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s)
    }

    query += ` ORDER BY al.entry_date ASC, al.created_at ASC`

    const rows = this.db.prepare(query).all(...params) as any[]
    let running = this.getCashOpening(filter?.startDate)

    return rows.map((r) => {
      const inAmt = Number(r.cash_in || 0)
      const outAmt = Number(r.cash_out || 0)
      running += outAmt - inAmt // nave adds to cash position, jama reduces
      return {
        id: r.id,
        entryDate: r.entry_date,
        sourceType: r.source_type,
        sourceId: r.source_id,
        billNo: r.bill_no || '',
        accountId: r.account_id,
        accountName: r.account_name,
        narration: r.narration,
        cashIn: inAmt,
        cashOut: outAmt,
        runningBalance: running
      }
    })
  }

  /**
   * Bank Book Opening Balance prior to startDate
   */
  getBankOpening(startDate?: string): number {
    let openingFromAccounts = 0
    const accountsRow = this.db
      .prepare(`SELECT SUM(opening_bank) as total FROM accounts WHERE deleted_at IS NULL`)
      .get() as any
    openingFromAccounts = Number(accountsRow?.total || 0)

    if (!startDate) return openingFromAccounts

    const priorRow = this.db
      .prepare(
        `
        SELECT
          SUM(bank_nave) as total_nave,
          SUM(bank_jama) as total_jama
        FROM account_ledger
        WHERE entry_date < ?
      `
      )
      .get(startDate) as any

    const priorNave = Number(priorRow?.total_nave || 0)
    const priorJama = Number(priorRow?.total_jama || 0)

    return openingFromAccounts + priorNave - priorJama
  }

  /**
   * Bank Book Rows
   */
  getBankBookRows(filter?: ReportDateFilter): BankBookRow[] {
    let query = `
      SELECT
        al.id,
        al.entry_date,
        al.source_type,
        al.source_id,
        COALESCE(si.invoice_number, pi.invoice_number, rt.return_number, sh.sale_no, ph.purchase_no, al.source_id) AS bill_no,
        al.account_id,
        a.account_name,
        al.narration,
        al.bank_jama AS bank_in,
        al.bank_nave AS bank_out
      FROM account_ledger al
      JOIN accounts a ON a.id = al.account_id
      LEFT JOIN sales_invoices si ON si.id = al.source_id AND al.source_type IN ('SALES_INVOICE', 'POS_SALE')
      LEFT JOIN purchase_invoices pi ON pi.id = al.source_id AND al.source_type = 'PURCHASE_INVOICE'
      LEFT JOIN return_transactions rt ON rt.id = al.source_id AND al.source_type IN ('SALES_RETURN', 'PURCHASE_RETURN')
      LEFT JOIN sale_headers sh ON sh.id = al.source_id AND al.source_type = 'SALE'
      LEFT JOIN purchase_headers ph ON ph.id = al.source_id AND al.source_type = 'PURCHASE'
      WHERE (al.bank_jama > 0 OR al.bank_nave > 0)
    `
    const params: any[] = []

    if (filter?.startDate) {
      query += ` AND al.entry_date >= ?`
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      query += ` AND al.entry_date <= ?`
      params.push(filter.endDate)
    }

    if (filter?.search) {
      query += ` AND (a.account_name LIKE ? OR al.narration LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s)
    }

    query += ` ORDER BY al.entry_date ASC, al.created_at ASC`

    const rows = this.db.prepare(query).all(...params) as any[]
    let running = this.getBankOpening(filter?.startDate)

    return rows.map((r) => {
      const inAmt = Number(r.bank_in || 0)
      const outAmt = Number(r.bank_out || 0)
      running += outAmt - inAmt
      return {
        id: r.id,
        entryDate: r.entry_date,
        sourceType: r.source_type,
        sourceId: r.source_id,
        billNo: r.bill_no || '',
        accountId: r.account_id,
        accountName: r.account_name,
        narration: r.narration,
        bankIn: inAmt,
        bankOut: outAmt,
        runningBalance: running
      }
    })
  }

  /**
   * Sales Register
   */
  getSalesRegister(filter?: ReportDateFilter): SalesRegisterRow[] {
    let query = `
      SELECT
        si.id,
        si.invoice_number,
        si.invoice_date,
        si.customer_id,
        c.name AS customer_name,
        si.account_id,
        a.account_name,
        si.metal_type,
        si.total_pcs,
        si.gross_weight,
        si.net_weight,
        si.fine_weight,
        si.subtotal,
        si.discount_amount,
        si.taxable_amount,
        si.tax_amount,
        si.grand_total,
        si.paid_amount,
        si.balance_due,
        si.status
      FROM sales_invoices si
      LEFT JOIN customers c ON c.id = si.customer_id
      JOIN accounts a ON a.id = si.account_id
      WHERE si.deleted_at IS NULL
    `
    const params: any[] = []

    if (filter?.startDate) {
      query += ` AND si.invoice_date >= ?`
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      query += ` AND si.invoice_date <= ?`
      params.push(filter.endDate)
    }

    if (filter?.customerId) {
      query += ` AND si.customer_id = ?`
      params.push(filter.customerId)
    }

    if (filter?.accountId) {
      query += ` AND si.account_id = ?`
      params.push(filter.accountId)
    }

    if (filter?.metalType) {
      query += ` AND si.metal_type = ?`
      params.push(filter.metalType)
    }

    if (filter?.search) {
      query += ` AND (si.invoice_number LIKE ? OR c.name LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s)
    }

    query += ` ORDER BY si.invoice_date DESC, si.created_at DESC`

    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoice_number,
      invoiceDate: r.invoice_date,
      customerId: r.customer_id,
      customerName: r.customer_name,
      accountId: r.account_id,
      accountName: r.account_name,
      metalType: r.metal_type,
      totalPcs: Number(r.total_pcs || 0),
      grossWeight: Number(r.gross_weight || 0),
      netWeight: Number(r.net_weight || 0),
      fineWeight: Number(r.fine_weight || 0),
      subtotal: Number(r.subtotal || 0),
      discountAmount: Number(r.discount_amount || 0),
      taxableAmount: Number(r.taxable_amount || 0),
      taxAmount: Number(r.tax_amount || 0),
      grandTotal: Number(r.grand_total || 0),
      paidAmount: Number(r.paid_amount || 0),
      balanceDue: Number(r.balance_due || 0),
      status: r.status
    }))
  }

  /**
   * Purchase Register
   */
  getPurchaseRegister(filter?: ReportDateFilter): PurchaseRegisterRow[] {
    let query = `
      SELECT
        pi.id,
        pi.invoice_number,
        pi.supplier_invoice_number,
        pi.invoice_date,
        pi.supplier_id,
        s.name AS supplier_name,
        pi.account_id,
        a.account_name,
        pi.metal_type,
        pi.total_pcs,
        pi.gross_weight,
        pi.net_weight,
        pi.fine_weight,
        pi.subtotal,
        pi.discount_amount,
        pi.taxable_amount,
        pi.tax_amount,
        pi.grand_total,
        pi.paid_amount,
        pi.balance_due,
        pi.status
      FROM purchase_invoices pi
      LEFT JOIN suppliers s ON s.id = pi.supplier_id
      JOIN accounts a ON a.id = pi.account_id
      WHERE pi.deleted_at IS NULL
    `
    const params: any[] = []

    if (filter?.startDate) {
      query += ` AND pi.invoice_date >= ?`
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      query += ` AND pi.invoice_date <= ?`
      params.push(filter.endDate)
    }

    if (filter?.supplierId) {
      query += ` AND pi.supplier_id = ?`
      params.push(filter.supplierId)
    }

    if (filter?.accountId) {
      query += ` AND pi.account_id = ?`
      params.push(filter.accountId)
    }

    if (filter?.metalType) {
      query += ` AND pi.metal_type = ?`
      params.push(filter.metalType)
    }

    if (filter?.search) {
      query += ` AND (pi.invoice_number LIKE ? OR pi.supplier_invoice_number LIKE ? OR s.name LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s, s)
    }

    query += ` ORDER BY pi.invoice_date DESC, pi.created_at DESC`

    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoice_number,
      supplierInvoiceNumber: r.supplier_invoice_number,
      invoiceDate: r.invoice_date,
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      accountId: r.account_id,
      accountName: r.account_name,
      metalType: r.metal_type,
      totalPcs: Number(r.total_pcs || 0),
      grossWeight: Number(r.gross_weight || 0),
      netWeight: Number(r.net_weight || 0),
      fineWeight: Number(r.fine_weight || 0),
      subtotal: Number(r.subtotal || 0),
      discountAmount: Number(r.discount_amount || 0),
      taxableAmount: Number(r.taxable_amount || 0),
      taxAmount: Number(r.tax_amount || 0),
      grandTotal: Number(r.grand_total || 0),
      paidAmount: Number(r.paid_amount || 0),
      balanceDue: Number(r.balance_due || 0),
      status: r.status
    }))
  }

  /**
   * Return Registers (Sales Return & Purchase Return)
   */
  getReturnRegister(
    returnType: 'SALES_RETURN' | 'PURCHASE_RETURN',
    filter?: ReportDateFilter
  ): ReturnRegisterRow[] {
    let query = `
      SELECT
        rt.id,
        rt.return_number,
        rt.return_type,
        rt.note_type,
        rt.original_invoice_number,
        rt.return_date,
        COALESCE(c.name, s.name, a.account_name) AS party_name,
        a.account_name,
        rt.metal_type,
        rt.total_pcs,
        rt.gross_weight,
        rt.net_weight,
        rt.fine_weight,
        rt.return_total,
        rt.refund_amount,
        rt.adjustment_amount,
        rt.status,
        rt.reason
      FROM return_transactions rt
      LEFT JOIN customers c ON c.id = rt.customer_id
      LEFT JOIN suppliers s ON s.id = rt.supplier_id
      JOIN accounts a ON a.id = rt.account_id
      WHERE rt.return_type = ? AND rt.deleted_at IS NULL
    `
    const params: any[] = [returnType]

    if (filter?.startDate) {
      query += ` AND rt.return_date >= ?`
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      query += ` AND rt.return_date <= ?`
      params.push(filter.endDate)
    }

    if (filter?.search) {
      query += ` AND (rt.return_number LIKE ? OR rt.original_invoice_number LIKE ? OR party_name LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s, s)
    }

    query += ` ORDER BY rt.return_date DESC, rt.created_at DESC`

    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => ({
      id: r.id,
      returnNumber: r.return_number,
      returnType: r.return_type,
      noteType: r.note_type,
      originalInvoiceNumber: r.original_invoice_number,
      returnDate: r.return_date,
      partyName: r.party_name || 'Party',
      accountName: r.account_name,
      metalType: r.metal_type,
      totalPcs: Number(r.total_pcs || 0),
      grossWeight: Number(r.gross_weight || 0),
      netWeight: Number(r.net_weight || 0),
      fineWeight: Number(r.fine_weight || 0),
      returnTotal: Number(r.return_total || 0),
      refundAmount: Number(r.refund_amount || 0),
      adjustmentAmount: Number(r.adjustment_amount || 0),
      status: r.status,
      reason: r.reason
    }))
  }

  /**
   * Party Ledger Statement for an Account
   */
  getPartyLedger(accountId: string, filter?: ReportDateFilter): { openingBalance: number; rows: PartyLedgerRow[] } {
    const acc = this.db.prepare(`SELECT opening_cash FROM accounts WHERE id = ?`).get(accountId) as any
    const baseOpening = Number(acc?.opening_cash || 0)

    let priorNave = 0
    let priorJama = 0

    if (filter?.startDate) {
      const prior = this.db
        .prepare(
          `
          SELECT SUM(cash_nave) as nave, SUM(cash_jama) as jama
          FROM account_ledger
          WHERE account_id = ? AND entry_date < ?
        `
        )
        .get(accountId, filter.startDate) as any
      priorNave = Number(prior?.nave || 0)
      priorJama = Number(prior?.jama || 0)
    }

    const openingBalance = baseOpening + priorNave - priorJama

    let query = `
      SELECT
        al.id,
        al.entry_date,
        al.source_type,
        al.source_id,
        COALESCE(si.invoice_number, pi.invoice_number, rt.return_number, sh.sale_no, ph.purchase_no, cv.voucher_no, al.source_id) AS bill_no,
        al.narration,
        al.cash_nave AS debit,
        al.cash_jama AS credit
      FROM account_ledger al
      LEFT JOIN sales_invoices si ON si.id = al.source_id AND al.source_type IN ('SALES_INVOICE', 'POS_SALE')
      LEFT JOIN purchase_invoices pi ON pi.id = al.source_id AND al.source_type = 'PURCHASE_INVOICE'
      LEFT JOIN return_transactions rt ON rt.id = al.source_id AND al.source_type IN ('SALES_RETURN', 'PURCHASE_RETURN')
      LEFT JOIN sale_headers sh ON sh.id = al.source_id AND al.source_type = 'SALE'
      LEFT JOIN purchase_headers ph ON ph.id = al.source_id AND al.source_type = 'PURCHASE'
      LEFT JOIN cash_vouchers cv ON cv.id = al.source_id AND al.source_type IN ('CASH_PAYMENT', 'CASH_RECEIPT')
      WHERE al.account_id = ?
    `
    const params: any[] = [accountId]

    if (filter?.startDate) {
      query += ` AND al.entry_date >= ?`
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      query += ` AND al.entry_date <= ?`
      params.push(filter.endDate)
    }

    query += ` ORDER BY al.entry_date ASC, al.created_at ASC`

    const rows = this.db.prepare(query).all(...params) as any[]
    let running = openingBalance

    const mappedRows: PartyLedgerRow[] = rows.map((r) => {
      const d = Number(r.debit || 0)
      const c = Number(r.credit || 0)
      running += d - c
      return {
        id: r.id,
        entryDate: r.entry_date,
        sourceType: r.source_type,
        sourceId: r.source_id,
        billNo: r.bill_no || '',
        narration: r.narration,
        debit: d,
        credit: c,
        runningBalance: running
      }
    })

    return { openingBalance, rows: mappedRows }
  }

  /**
   * Outstanding Summary for Customers or Suppliers
   */
  getPartyOutstanding(partyType: 'CUSTOMER' | 'SUPPLIER', filter?: ReportDateFilter): PartyOutstandingRow[] {
    const isCustomer = partyType === 'CUSTOMER'
    const table = isCustomer ? 'customers' : 'suppliers'

    let query = `
      SELECT
        p.id AS party_id,
        p.name,
        p.mobile,
        p.city,
        a.id AS account_id,
        a.opening_cash,
        COALESCE(SUM(al.cash_nave), 0) AS total_nave,
        COALESCE(SUM(al.cash_jama), 0) AS total_jama
      FROM ${table} p
      JOIN accounts a ON a.id = p.account_id
      LEFT JOIN account_ledger al ON al.account_id = a.id
      WHERE p.deleted_at IS NULL
    `
    const params: any[] = []

    if (filter?.search) {
      query += ` AND (p.name LIKE ? OR p.mobile LIKE ? OR p.city LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s, s)
    }

    query += ` GROUP BY p.id, a.id ORDER BY p.name ASC`

    const rows = this.db.prepare(query).all(...params) as any[]

    return rows.map((r) => {
      const open = Number(r.opening_cash || 0)
      const nave = Number(r.total_nave || 0)
      const jama = Number(r.total_jama || 0)
      const closing = open + nave - jama

      let status: 'RECEIVABLE' | 'PAYABLE' | 'SETTLED' = 'SETTLED'
      if (closing > 0.01) {
        status = isCustomer ? 'RECEIVABLE' : 'PAYABLE'
      } else if (closing < -0.01) {
        status = isCustomer ? 'PAYABLE' : 'RECEIVABLE'
      }

      return {
        accountId: r.account_id,
        partyId: r.party_id,
        name: r.name,
        partyType,
        mobile: r.mobile,
        city: r.city,
        openingBalance: open,
        periodDebit: nave,
        periodCredit: jama,
        closingBalance: closing,
        status
      }
    })
  }

  /**
   * Advances Report
   */
  getAdvances(filter?: ReportDateFilter): AdvanceReportRow[] {
    let query = `
      SELECT
        ca.id,
        ca.advance_number,
        ca.advance_date,
        ca.customer_id,
        c.name AS customer_name,
        ca.metal_type,
        ca.advance_amount,
        ca.allocated_amount,
        ca.balance_amount,
        ca.rate_fixed,
        ca.fixed_gold_rate,
        ca.status
      FROM customer_advances ca
      JOIN customers c ON c.id = ca.customer_id
      WHERE ca.deleted_at IS NULL
    `
    const params: any[] = []

    if (filter?.startDate) {
      query += ` AND ca.advance_date >= ?`
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      query += ` AND ca.advance_date <= ?`
      params.push(filter.endDate)
    }

    if (filter?.customerId) {
      query += ` AND ca.customer_id = ?`
      params.push(filter.customerId)
    }

    if (filter?.search) {
      query += ` AND (ca.advance_number LIKE ? OR c.name LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s)
    }

    query += ` ORDER BY ca.advance_date DESC, ca.created_at DESC`

    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => ({
      id: r.id,
      advanceNumber: r.advance_number,
      advanceDate: r.advance_date,
      customerId: r.customer_id,
      customerName: r.customer_name,
      metalType: r.metal_type,
      advanceAmount: Number(r.advance_amount || 0),
      allocatedAmount: Number(r.allocated_amount || 0),
      balanceAmount: Number(r.balance_amount || 0),
      rateFixed: Boolean(r.rate_fixed),
      fixedGoldRate: r.fixed_gold_rate ? Number(r.fixed_gold_rate) : null,
      status: r.status
    }))
  }

  /**
   * Old Gold Receipts Report
   */
  getOldGoldReceipts(filter?: ReportDateFilter): OldGoldReportRow[] {
    let query = `
      SELECT
        og.id,
        og.receipt_number,
        og.receipt_date,
        og.customer_id,
        c.name AS customer_name,
        og.metal_type,
        og.gross_weight,
        og.net_weight,
        og.fine_weight,
        og.purity_name,
        og.valuation_rate,
        og.net_valuation,
        og.exchange_applied_amount,
        og.cash_paid_amount,
        og.balance_amount,
        og.status
      FROM old_gold_receipts og
      JOIN customers c ON c.id = og.customer_id
      WHERE og.deleted_at IS NULL
    `
    const params: any[] = []

    if (filter?.startDate) {
      query += ` AND og.receipt_date >= ?`
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      query += ` AND og.receipt_date <= ?`
      params.push(filter.endDate)
    }

    if (filter?.customerId) {
      query += ` AND og.customer_id = ?`
      params.push(filter.customerId)
    }

    if (filter?.search) {
      query += ` AND (og.receipt_number LIKE ? OR c.name LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s)
    }

    query += ` ORDER BY og.receipt_date DESC, og.created_at DESC`

    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => ({
      id: r.id,
      receiptNumber: r.receipt_number,
      receiptDate: r.receipt_date,
      customerId: r.customer_id,
      customerName: r.customer_name,
      metalType: r.metal_type,
      grossWeight: Number(r.gross_weight || 0),
      netWeight: Number(r.net_weight || 0),
      fineWeight: Number(r.fine_weight || 0),
      purityName: r.purity_name,
      valuationRate: Number(r.valuation_rate || 0),
      netValuation: Number(r.net_valuation || 0),
      exchangeAppliedAmount: Number(r.exchange_applied_amount || 0),
      cashPaidAmount: Number(r.cash_paid_amount || 0),
      balanceAmount: Number(r.balance_amount || 0),
      status: r.status
    }))
  }

  /**
   * Metal Exchanges Report
   */
  getMetalExchanges(filter?: ReportDateFilter): MetalExchangeReportRow[] {
    let query = `
      SELECT
        me.id,
        me.exchange_number,
        me.exchange_date,
        me.customer_id,
        c.name AS customer_name,
        si.invoice_number AS sales_invoice_number,
        co.order_number,
        me.exchange_amount,
        me.status
      FROM metal_exchanges me
      JOIN customers c ON c.id = me.customer_id
      LEFT JOIN sales_invoices si ON si.id = me.sales_invoice_id
      LEFT JOIN customer_orders co ON co.id = me.order_id
      WHERE me.deleted_at IS NULL
    `
    const params: any[] = []

    if (filter?.startDate) {
      query += ` AND me.exchange_date >= ?`
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      query += ` AND me.exchange_date <= ?`
      params.push(filter.endDate)
    }

    if (filter?.search) {
      query += ` AND (me.exchange_number LIKE ? OR c.name LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s)
    }

    query += ` ORDER BY me.exchange_date DESC, me.created_at DESC`

    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => ({
      id: r.id,
      exchangeNumber: r.exchange_number,
      exchangeDate: r.exchange_date,
      customerId: r.customer_id,
      customerName: r.customer_name,
      salesInvoiceNumber: r.sales_invoice_number,
      orderNumber: r.order_number,
      exchangeAmount: Number(r.exchange_amount || 0),
      status: r.status
    }))
  }

  /**
   * Stock Movements
   */
  getStockMovements(filter?: ReportDateFilter): StockMovementReportRow[] {
    let query = `
      SELECT
        sl.id,
        sl.entry_date,
        sl.source_type,
        sl.source_id,
        COALESCE(si.invoice_number, pi.invoice_number, rt.return_number, sh.sale_no, ph.purchase_no, sl.source_id) AS bill_no,
        sl.item_id,
        i.item_name,
        i.item_code,
        sl.metal_type,
        s.stamp_name,
        d.design_name,
        sl.pcs_delta,
        sl.gross_weight_delta,
        sl.net_weight_delta,
        sl.fine_delta,
        sl.narration
      FROM stock_ledger sl
      JOIN items i ON i.id = sl.item_id
      LEFT JOIN item_stamps s ON s.id = sl.stamp_id
      LEFT JOIN item_designs d ON d.id = sl.design_id
      LEFT JOIN sales_invoices si ON si.id = sl.source_id AND sl.source_type IN ('SALES_INVOICE', 'POS_SALE')
      LEFT JOIN purchase_invoices pi ON pi.id = sl.source_id AND sl.source_type = 'PURCHASE'
      LEFT JOIN return_transactions rt ON rt.id = sl.source_id AND sl.source_type IN ('SALE_RETURN', 'PURCHASE_RETURN')
      LEFT JOIN sale_headers sh ON sh.id = sl.source_id AND sl.source_type = 'SALE'
      LEFT JOIN purchase_headers ph ON ph.id = sl.source_id AND sl.source_type = 'PURCHASE'
      WHERE 1=1
    `
    const params: any[] = []

    if (filter?.startDate) {
      query += ` AND sl.entry_date >= ?`
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      query += ` AND sl.entry_date <= ?`
      params.push(filter.endDate)
    }

    if (filter?.itemId) {
      query += ` AND sl.item_id = ?`
      params.push(filter.itemId)
    }

    if (filter?.metalType) {
      query += ` AND sl.metal_type = ?`
      params.push(filter.metalType)
    }

    if (filter?.search) {
      query += ` AND (i.item_name LIKE ? OR i.item_code LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s)
    }

    query += ` ORDER BY sl.entry_date DESC, sl.created_at DESC`

    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => ({
      id: r.id,
      entryDate: r.entry_date,
      sourceType: r.source_type,
      sourceId: r.source_id,
      billNo: r.bill_no || '',
      itemId: r.item_id,
      itemName: r.item_name,
      itemCode: r.item_code,
      metalType: r.metal_type,
      stampName: r.stamp_name,
      designName: r.design_name,
      pcsDelta: Number(r.pcs_delta || 0),
      grossWeightDelta: Number(r.gross_weight_delta || 0),
      netWeightDelta: Number(r.net_weight_delta || 0),
      fineDelta: Number(r.fine_delta || 0),
      narration: r.narration
    }))
  }

  /**
   * Stock Valuation by Item
   */
  getStockValuation(filter?: ReportDateFilter): StockValuationReportRow[] {
    let query = `
      SELECT
        i.id AS item_id,
        i.item_name,
        i.item_code,
        c.category_name,
        i.metal_type,
        COALESCE(SUM(sl.pcs_delta), 0) AS current_pcs,
        COALESCE(SUM(sl.gross_weight_delta), 0) AS current_gross_weight,
        COALESCE(SUM(sl.net_weight_delta), 0) AS current_net_weight,
        COALESCE(SUM(sl.fine_delta), 0) AS current_fine_weight,
        COALESCE(gr.rate_per_gram, 7000) AS standard_gold_rate
      FROM items i
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN stock_ledger sl ON sl.item_id = i.id
      LEFT JOIN (
        SELECT metal_type, rate_per_gram
        FROM gold_rates
        WHERE effective_date <= date('now')
        ORDER BY effective_date DESC LIMIT 1
      ) gr ON gr.metal_type = i.metal_type
      WHERE i.deleted_at IS NULL
    `
    const params: any[] = []

    if (filter?.metalType) {
      query += ` AND i.metal_type = ?`
      params.push(filter.metalType)
    }

    if (filter?.search) {
      query += ` AND (i.item_name LIKE ? OR i.item_code LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s)
    }

    query += ` GROUP BY i.id ORDER BY i.item_name ASC`

    const rows = this.db.prepare(query).all(...params) as any[]

    return rows.map((r) => {
      const netWeight = Number(r.current_net_weight || 0)
      const fineWeight = Number(r.current_fine_weight || 0)
      const rate = Number(r.standard_gold_rate || 7000)
      const estValue = (fineWeight > 0 ? fineWeight : netWeight) * rate

      return {
        itemId: r.item_id,
        itemName: r.item_name,
        itemCode: r.item_code,
        categoryName: r.category_name,
        metalType: r.metal_type,
        currentPcs: Number(r.current_pcs || 0),
        currentGrossWeight: Number(r.current_gross_weight || 0),
        currentNetWeight: netWeight,
        currentFineWeight: fineWeight,
        standardGoldRate: rate,
        estimatedMetalValue: estValue
      }
    })
  }

  /**
   * Trial Balance
   */
  getTrialBalance(filter?: ReportDateFilter): TrialBalanceRow[] {
    let query = `
      SELECT
        a.id AS account_id,
        a.account_name,
        ag.group_name,
        ag.group_type,
        a.opening_cash,
        COALESCE(SUM(CASE WHEN al.entry_date < ? THEN al.cash_nave ELSE 0 END), 0) AS prior_nave,
        COALESCE(SUM(CASE WHEN al.entry_date < ? THEN al.cash_jama ELSE 0 END), 0) AS prior_jama,
        COALESCE(SUM(CASE WHEN al.entry_date >= ? AND al.entry_date <= ? THEN al.cash_nave ELSE 0 END), 0) AS period_nave,
        COALESCE(SUM(CASE WHEN al.entry_date >= ? AND al.entry_date <= ? THEN al.cash_jama ELSE 0 END), 0) AS period_jama
      FROM accounts a
      JOIN account_groups ag ON ag.id = a.account_group_id
      LEFT JOIN account_ledger al ON al.account_id = a.id
      WHERE a.deleted_at IS NULL
    `
    const start = filter?.startDate || '1970-01-01'
    const end = filter?.endDate || '2099-12-31'
    const params: any[] = [start, start, start, end, start, end]

    if (filter?.search) {
      query += ` AND (a.account_name LIKE ? OR ag.group_name LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s)
    }

    query += ` GROUP BY a.id ORDER BY ag.group_type ASC, ag.group_name ASC, a.account_name ASC`

    const rows = this.db.prepare(query).all(...params) as any[]

    return rows.map((r) => {
      const openBase = Number(r.opening_cash || 0)
      const priorN = Number(r.prior_nave || 0)
      const priorJ = Number(r.prior_jama || 0)
      const openBal = openBase + priorN - priorJ

      const periodNave = Number(r.period_nave || 0)
      const periodJama = Number(r.period_jama || 0)
      const closingBal = openBal + periodNave - periodJama

      return {
        accountId: r.account_id,
        accountName: r.account_name,
        groupName: r.group_name,
        groupType: r.group_type,
        openingDebit: openBal > 0 ? openBal : 0,
        openingCredit: openBal < 0 ? Math.abs(openBal) : 0,
        periodDebit: periodNave,
        periodCredit: periodJama,
        closingDebit: closingBal > 0 ? closingBal : 0,
        closingCredit: closingBal < 0 ? Math.abs(closingBal) : 0
      }
    })
  }
}
