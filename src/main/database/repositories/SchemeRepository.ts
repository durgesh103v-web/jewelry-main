import { BaseRepository } from './BaseRepository'
import type {
  SchemeMasterRecord,
  CreateSchemePayload,
  SchemeAccountRecord,
  SchemeInstallmentRecord,
  SchemeRedemptionRecord,
  SchemeRefundRecord,
  SchemeTimelineEventRecord,
  SchemeDashboardSummary
} from '../../../shared/types/scheme'

export class SchemeRepository extends BaseRepository {
  // ================= 1. SCHEMES MASTER =================

  createScheme(
    id: string,
    schemeCode: string,
    payload: CreateSchemePayload,
    now: string
  ): SchemeMasterRecord {
    this.db
      .prepare(
        `
        INSERT INTO schemes (
          id, scheme_code, scheme_name, scheme_type, duration_months,
          installment_type, fixed_installment_amount, bonus_type, bonus_value,
          description, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `
      )
      .run(
        id,
        schemeCode,
        payload.schemeName,
        payload.schemeType,
        payload.durationMonths,
        payload.installmentType,
        payload.fixedInstallmentAmount || 0,
        payload.bonusType,
        payload.bonusValue || 0,
        payload.description || '',
        now,
        now
      )

    return this.getSchemeById(id)!
  }

  getSchemeById(id: string): SchemeMasterRecord | null {
    const row = this.db.prepare(`SELECT * FROM schemes WHERE id = ?`).get(id) as any
    return row ? this.mapSchemeRow(row) : null
  }

  listSchemes(filter?: { activeOnly?: boolean }): SchemeMasterRecord[] {
    let query = `SELECT * FROM schemes`
    if (filter?.activeOnly) {
      query += ` WHERE is_active = 1`
    }
    query += ` ORDER BY created_at DESC`
    const rows = this.db.prepare(query).all() as any[]
    return rows.map((r) => this.mapSchemeRow(r))
  }

  // ================= 2. SCHEME ACCOUNTS =================

  createAccount(
    id: string,
    accountNumber: string,
    schemeId: string,
    customerId: string,
    startDate: string,
    maturityDate: string,
    installmentAmount: number,
    expectedInstallments: number,
    notes: string,
    now: string
  ): SchemeAccountRecord {
    this.db
      .prepare(
        `
        INSERT INTO scheme_accounts (
          id, account_number, scheme_id, customer_id, start_date, maturity_date,
          installment_amount, status, installments_expected, installments_paid,
          total_amount_paid, bonus_amount, gold_entitlement_grams,
          total_redeemed_amount, balance_amount, notes, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, 'ACTIVE', ?, 0,
          0, 0, 0,
          0, 0, ?, ?, ?
        )
      `
      )
      .run(
        id,
        accountNumber,
        schemeId,
        customerId,
        startDate,
        maturityDate,
        installmentAmount,
        expectedInstallments,
        notes || '',
        now,
        now
      )

    return this.getAccountById(id)!
  }

  getAccountById(id: string): SchemeAccountRecord | null {
    const query = `
      SELECT
        sa.*,
        s.scheme_name,
        s.scheme_type,
        c.name AS customer_name,
        c.mobile AS customer_mobile
      FROM scheme_accounts sa
      JOIN schemes s ON s.id = sa.scheme_id
      JOIN customers c ON c.id = sa.customer_id
      WHERE sa.id = ? AND sa.deleted_at IS NULL
    `
    const row = this.db.prepare(query).get(id) as any
    return row ? this.mapAccountRow(row) : null
  }

  listAccounts(filter?: {
    status?: string
    customerId?: string
    schemeId?: string
    search?: string
  }): SchemeAccountRecord[] {
    let query = `
      SELECT
        sa.*,
        s.scheme_name,
        s.scheme_type,
        c.name AS customer_name,
        c.mobile AS customer_mobile
      FROM scheme_accounts sa
      JOIN schemes s ON s.id = sa.scheme_id
      JOIN customers c ON c.id = sa.customer_id
      WHERE sa.deleted_at IS NULL
    `
    const params: any[] = []

    if (filter?.status && filter.status !== 'ALL') {
      query += ` AND sa.status = ?`
      params.push(filter.status)
    }

    if (filter?.customerId) {
      query += ` AND sa.customer_id = ?`
      params.push(filter.customerId)
    }

    if (filter?.schemeId) {
      query += ` AND sa.scheme_id = ?`
      params.push(filter.schemeId)
    }

    if (filter?.search) {
      query += ` AND (sa.account_number LIKE ? OR c.name LIKE ? OR c.mobile LIKE ?)`
      const s = `%${filter.search}%`
      params.push(s, s, s)
    }

    query += ` ORDER BY sa.created_at DESC`
    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => this.mapAccountRow(r))
  }

  updateAccountStatus(id: string, status: string, now: string): void {
    this.db
      .prepare(`UPDATE scheme_accounts SET status = ?, updated_at = ? WHERE id = ?`)
      .run(status, now, id)
  }

  updateAccountTotals(
    id: string,
    paidInstallments: number,
    totalPaid: number,
    bonus: number,
    goldGrams: number,
    redeemed: number,
    balance: number,
    now: string
  ): void {
    this.db
      .prepare(
        `
        UPDATE scheme_accounts
        SET installments_paid = ?,
            total_amount_paid = ?,
            bonus_amount = ?,
            gold_entitlement_grams = ?,
            total_redeemed_amount = ?,
            balance_amount = ?,
            updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        paidInstallments,
        totalPaid,
        bonus,
        goldGrams,
        redeemed,
        balance,
        now,
        id
      )
  }

  // ================= 3. INSTALLMENTS =================

  insertInstallmentSchedule(
    installments: {
      id: string
      schemeAccountId: string
      installmentNumber: number
      dueDate: string
      dueAmount: number
      now: string
    }[]
  ): void {
    const insert = this.db.prepare(`
      INSERT INTO scheme_installments (
        id, scheme_account_id, installment_number, due_date,
        due_amount, paid_amount, gold_rate, gold_entitlement_grams,
        payment_method, payment_reference, status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 'CASH', '', 'DUE', '', ?)
    `)

    for (const inst of installments) {
      insert.run(
        inst.id,
        inst.schemeAccountId,
        inst.installmentNumber,
        inst.dueDate,
        inst.dueAmount,
        inst.now
      )
    }
  }

  getInstallmentsByAccount(schemeAccountId: string): SchemeInstallmentRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM scheme_installments WHERE scheme_account_id = ? ORDER BY installment_number ASC`
      )
      .all(schemeAccountId) as any[]
    return rows.map((r) => this.mapInstallmentRow(r))
  }

  recordInstallmentPayment(
    installmentId: string,
    paidAmount: number,
    goldRate: number,
    goldGrams: number,
    paidDate: string,
    paymentMethod: string,
    paymentReference: string,
    status: string,
    notes: string
  ): void {
    this.db
      .prepare(
        `
        UPDATE scheme_installments
        SET paid_amount = paid_amount + ?,
            gold_rate = ?,
            gold_entitlement_grams = gold_entitlement_grams + ?,
            paid_date = ?,
            payment_method = ?,
            payment_reference = ?,
            status = ?,
            notes = ?
        WHERE id = ?
      `
      )
      .run(
        paidAmount,
        goldRate,
        goldGrams,
        paidDate,
        paymentMethod,
        paymentReference,
        status,
        notes,
        installmentId
      )
  }

  // ================= 4. REDEMPTIONS =================

  insertRedemption(redemption: SchemeRedemptionRecord): void {
    this.db
      .prepare(
        `
        INSERT INTO scheme_redemptions (
          id, redemption_number, scheme_account_id, customer_id, redemption_date,
          redeemed_amount, bonus_amount_applied, gold_grams_redeemed,
          sales_invoice_id, status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        redemption.id,
        redemption.redemptionNumber,
        redemption.schemeAccountId,
        redemption.customerId,
        redemption.redemptionDate,
        redemption.redeemedAmount,
        redemption.bonusAmountApplied,
        redemption.goldGramsRedeemed,
        redemption.salesInvoiceId || null,
        redemption.status,
        redemption.notes || '',
        redemption.createdAt
      )
  }

  listRedemptions(schemeAccountId?: string): SchemeRedemptionRecord[] {
    let query = `
      SELECT sr.*, c.name AS customer_name
      FROM scheme_redemptions sr
      JOIN customers c ON c.id = sr.customer_id
    `
    const params: any[] = []
    if (schemeAccountId) {
      query += ` WHERE sr.scheme_account_id = ?`
      params.push(schemeAccountId)
    }
    query += ` ORDER BY sr.created_at DESC`
    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map((r) => ({
      id: r.id,
      redemptionNumber: r.redemption_number,
      schemeAccountId: r.scheme_account_id,
      customerId: r.customer_id,
      customerName: r.customer_name,
      redemptionDate: r.redemption_date,
      redeemedAmount: Number(r.redeemed_amount || 0),
      bonusAmountApplied: Number(r.bonus_amount_applied || 0),
      goldGramsRedeemed: Number(r.gold_grams_redeemed || 0),
      salesInvoiceId: r.sales_invoice_id,
      status: r.status,
      notes: r.notes,
      createdAt: r.created_at
    }))
  }

  // ================= 5. REFUNDS =================

  insertRefund(refund: SchemeRefundRecord): void {
    this.db
      .prepare(
        `
        INSERT INTO scheme_refunds (
          id, refund_number, scheme_account_id, customer_id, refund_date,
          refund_amount, deduction_amount, payment_method, payment_reference, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        refund.id,
        refund.refundNumber,
        refund.schemeAccountId,
        refund.customerId,
        refund.refundDate,
        refund.refundAmount,
        refund.deductionAmount,
        refund.paymentMethod,
        refund.paymentReference || '',
        refund.notes || '',
        refund.createdAt
      )
  }

  // ================= 6. TIMELINE & DASHBOARD =================

  addTimelineEvent(
    id: string,
    schemeAccountId: string,
    eventType: string,
    description: string,
    performedBy: string,
    now: string
  ): void {
    this.db
      .prepare(
        `
        INSERT INTO scheme_timeline_events (id, scheme_account_id, event_type, description, performed_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      .run(id, schemeAccountId, eventType, description, performedBy, now)
  }

  getTimelineEvents(schemeAccountId: string): SchemeTimelineEventRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM scheme_timeline_events WHERE scheme_account_id = ? ORDER BY created_at ASC`
      )
      .all(schemeAccountId) as any[]
    return rows.map((r) => ({
      id: r.id,
      schemeAccountId: r.scheme_account_id,
      eventType: r.event_type,
      description: r.description,
      performedBy: r.performed_by,
      createdAt: r.created_at
    }))
  }

  getDashboardSummary(): SchemeDashboardSummary {
    const today = new Date().toISOString().slice(0, 10)
    const currentMonth = today.slice(0, 7)

    const activeRow = this.db
      .prepare(`SELECT COUNT(*) as c FROM scheme_accounts WHERE status = 'ACTIVE' AND deleted_at IS NULL`)
      .get() as any
    const dueMonthRow = this.db
      .prepare(
        `SELECT COUNT(*) as c FROM scheme_installments WHERE due_date LIKE ? AND status = 'DUE'`
      )
      .get(`${currentMonth}%`) as any
    const overdueRow = this.db
      .prepare(
        `SELECT COUNT(*) as c FROM scheme_installments WHERE due_date < ? AND status = 'DUE'`
      )
      .get(today) as any
    const maturedRow = this.db
      .prepare(`SELECT COUNT(*) as c FROM scheme_accounts WHERE status = 'MATURED' AND deleted_at IS NULL`)
      .get() as any
    const totalsRow = this.db
      .prepare(
        `SELECT
          COALESCE(SUM(total_amount_paid), 0) as deposits,
          COALESCE(SUM(balance_amount), 0) as liability,
          COALESCE(SUM(total_redeemed_amount), 0) as redemptions
        FROM scheme_accounts WHERE deleted_at IS NULL`
      )
      .get() as any

    return {
      activeSchemes: Number(activeRow?.c || 0),
      dueThisMonth: Number(dueMonthRow?.c || 0),
      overdueInstallments: Number(overdueRow?.c || 0),
      maturingSoon: 0,
      maturedSchemes: Number(maturedRow?.c || 0),
      totalDeposits: Number(totalsRow?.deposits || 0),
      totalSchemeLiability: Number(totalsRow?.liability || 0),
      totalRedemptions: Number(totalsRow?.redemptions || 0)
    }
  }

  private mapSchemeRow(r: any): SchemeMasterRecord {
    return {
      id: r.id,
      schemeCode: r.scheme_code,
      schemeName: r.scheme_name,
      schemeType: r.scheme_type,
      durationMonths: Number(r.duration_months || 11),
      installmentType: r.installment_type,
      fixedInstallmentAmount: Number(r.fixed_installment_amount || 0),
      bonusType: r.bonus_type,
      bonusValue: Number(r.bonus_value || 0),
      description: r.description,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }
  }

  private mapAccountRow(r: any): SchemeAccountRecord {
    return {
      id: r.id,
      accountNumber: r.account_number,
      schemeId: r.scheme_id,
      schemeName: r.scheme_name || 'Scheme',
      schemeType: r.scheme_type || 'MONEY_BASED',
      customerId: r.customer_id,
      customerName: r.customer_name || 'Customer',
      customerMobile: r.customer_mobile,
      startDate: r.start_date,
      maturityDate: r.maturity_date,
      installmentAmount: Number(r.installment_amount || 0),
      status: r.status,
      installmentsExpected: Number(r.installments_expected || 0),
      installmentsPaid: Number(r.installments_paid || 0),
      totalAmountPaid: Number(r.total_amount_paid || 0),
      bonusAmount: Number(r.bonus_amount || 0),
      goldEntitlementGrams: Number(r.gold_entitlement_grams || 0),
      totalRedeemedAmount: Number(r.total_redeemed_amount || 0),
      balanceAmount: Number(r.balance_amount || 0),
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }
  }

  private mapInstallmentRow(r: any): SchemeInstallmentRecord {
    return {
      id: r.id,
      schemeAccountId: r.scheme_account_id,
      installmentNumber: Number(r.installment_number),
      dueDate: r.due_date,
      paidDate: r.paid_date,
      dueAmount: Number(r.due_amount || 0),
      paidAmount: Number(r.paid_amount || 0),
      goldRate: Number(r.gold_rate || 0),
      goldEntitlementGrams: Number(r.gold_entitlement_grams || 0),
      paymentMethod: r.payment_method || 'CASH',
      paymentReference: r.payment_reference,
      status: r.status,
      notes: r.notes,
      createdAt: r.created_at
    }
  }
}
