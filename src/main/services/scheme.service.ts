import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDatabase } from '../database/connection'
import { SchemeRepository } from '../database/repositories/SchemeRepository'
import { AccountLedgerRepository } from '../database/repositories/AccountLedgerRepository'
import { NotFoundError, ValidationError } from '../ipc/errors'
import type {
  SchemeMasterRecord,
  CreateSchemePayload,
  SchemeAccountRecord,
  EnrollCustomerPayload,
  SchemeInstallmentRecord,
  PayInstallmentPayload,
  SchemeRedemptionRecord,
  RedeemSchemePayload,
  SchemeRefundRecord,
  RefundSchemePayload,
  SchemeTimelineEventRecord,
  SchemeDashboardSummary
} from '../../shared/types/scheme'

const schemeRepo = new SchemeRepository()
const accountLedgerRepo = new AccountLedgerRepository()

export const schemeService = {
  // ================= 1. SCHEMES =================

  createScheme(payload: CreateSchemePayload): SchemeMasterRecord {
    if (!payload.schemeName || !payload.schemeName.trim()) {
      throw new ValidationError('Scheme name is required')
    }
    if (payload.durationMonths <= 0) {
      throw new ValidationError('Duration in months must be greater than zero')
    }

    const id = uuidv4()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const schemeCode =
      payload.schemeCode ||
      `SCH-${dayjs().format('YYYYMM')}-${Math.floor(100 + Math.random() * 900)}`

    return schemeRepo.createScheme(id, schemeCode, payload, now)
  },

  getSchemeById(id: string): SchemeMasterRecord {
    const s = schemeRepo.getSchemeById(id)
    if (!s) throw new NotFoundError(`Scheme with ID ${id} not found`)
    return s
  },

  listSchemes(filter?: { activeOnly?: boolean }): SchemeMasterRecord[] {
    return schemeRepo.listSchemes(filter)
  },

  // ================= 2. CUSTOMER ENROLLMENT =================

  enrollCustomer(payload: EnrollCustomerPayload): SchemeAccountRecord {
    const scheme = this.getSchemeById(payload.schemeId)
    if (!scheme.isActive) {
      throw new ValidationError(`Scheme ${scheme.schemeName} is not active`)
    }
    if (!payload.customerId) {
      throw new ValidationError('Customer is required for scheme enrollment')
    }

    const db = getDatabase()
    const id = uuidv4()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const accountNumber = `SA-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`
    const startDate = payload.startDate || dayjs().format('YYYY-MM-DD')
    const maturityDate = dayjs(startDate).add(scheme.durationMonths, 'month').format('YYYY-MM-DD')
    const installmentAmount =
      scheme.installmentType === 'FIXED'
        ? scheme.fixedInstallmentAmount
        : payload.installmentAmount || 0

    let createdAccount: SchemeAccountRecord

    const execute = db.transaction(() => {
      // 1. Create Scheme Account
      createdAccount = schemeRepo.createAccount(
        id,
        accountNumber,
        scheme.id,
        payload.customerId,
        startDate,
        maturityDate,
        installmentAmount,
        scheme.durationMonths,
        payload.notes || '',
        now
      )

      // 2. Generate Scheduled Installments
      const installments: any[] = []
      for (let i = 1; i <= scheme.durationMonths; i++) {
        installments.push({
          id: uuidv4(),
          schemeAccountId: id,
          installmentNumber: i,
          dueDate: dayjs(startDate).add(i - 1, 'month').format('YYYY-MM-DD'),
          dueAmount: installmentAmount,
          now
        })
      }
      schemeRepo.insertInstallmentSchedule(installments)

      // 3. Add Timeline Event
      schemeRepo.addTimelineEvent(
        uuidv4(),
        id,
        'ENROLLMENT',
        `Customer enrolled in ${scheme.schemeName} (${scheme.durationMonths} Months, ₹${installmentAmount}/mo). Maturity: ${maturityDate}`,
        'Admin',
        now
      )
    })

    execute()
    return createdAccount!
  },

  getAccountById(id: string): SchemeAccountRecord {
    const acc = schemeRepo.getAccountById(id)
    if (!acc) throw new NotFoundError(`Scheme account with ID ${id} not found`)
    return acc
  },

  listAccounts(filter?: {
    status?: string
    customerId?: string
    schemeId?: string
    search?: string
  }): SchemeAccountRecord[] {
    return schemeRepo.listAccounts(filter)
  },

  getInstallments(schemeAccountId: string): SchemeInstallmentRecord[] {
    return schemeRepo.getInstallmentsByAccount(schemeAccountId)
  },

  // ================= 3. INSTALLMENT PAYMENT =================

  payInstallment(payload: PayInstallmentPayload): SchemeAccountRecord {
    if (payload.amount <= 0) {
      throw new ValidationError('Payment amount must be greater than zero')
    }

    const db = getDatabase()
    const account = this.getAccountById(payload.schemeAccountId)
    const scheme = this.getSchemeById(account.schemeId)

    if (account.status !== 'ACTIVE') {
      throw new ValidationError(`Cannot accept payments for scheme account with status ${account.status}`)
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const paidDate = payload.paidDate || dayjs().format('YYYY-MM-DD')
    const paymentMethod = payload.paymentMethod || 'CASH'
    const paymentReference = payload.paymentReference || ''

    const execute = db.transaction(() => {
      const installments = schemeRepo.getInstallmentsByAccount(account.id)
      let remainingToAllocate = payload.amount
      let newlyPaidCount = 0

      // Allocate payment to installments sequentially
      for (const inst of installments) {
        if (remainingToAllocate <= 0) break

        if (inst.status === 'DUE' || inst.status === 'PARTIAL' || inst.status === 'OVERDUE') {
          const needed = inst.dueAmount - inst.paidAmount
          const alloc = Math.min(remainingToAllocate, needed)
          const newStatus = alloc >= needed ? 'PAID' : 'PARTIAL'

          let goldGrams = 0
          if (scheme.schemeType === 'GOLD_WEIGHT_BASED') {
            const simulatedGoldRate = 7200 // ₹/g
            goldGrams = Number((alloc / simulatedGoldRate).toFixed(3))
          }

          schemeRepo.recordInstallmentPayment(
            inst.id,
            alloc,
            7200,
            goldGrams,
            paidDate,
            paymentMethod,
            paymentReference,
            newStatus,
            payload.notes || ''
          )

          remainingToAllocate -= alloc
          if (newStatus === 'PAID') newlyPaidCount++
        }
      }

      // Financial Posting: Credit Customer Scheme Deposit (Liability)
      accountLedgerRepo.insert({
        id: uuidv4(),
        sourceType: 'PAYMENT',
        sourceId: account.id,
        entryDate: paidDate,
        accountId: account.customerId,
        metalType: 'OTHER',
        cashJama: payload.amount,
        narration: `Scheme Installment Payment for ${account.accountNumber} (${scheme.schemeName})`,
        createdAt: now
      })

      // Recalculate Account Totals
      const updatedInstallments = schemeRepo.getInstallmentsByAccount(account.id)
      const totalPaid = updatedInstallments.reduce((acc, i) => acc + i.paidAmount, 0)
      const paidInstallmentsCount = updatedInstallments.filter((i) => i.status === 'PAID').length
      const totalGoldGrams = updatedInstallments.reduce((acc, i) => acc + i.goldEntitlementGrams, 0)

      let bonus = account.bonusAmount
      let newStatus = account.status

      // Check if all expected installments paid -> calculate bonus and mature
      if (paidInstallmentsCount >= account.installmentsExpected && account.status === 'ACTIVE') {
        bonus = this.calculateBonus(scheme, totalPaid, account.installmentAmount)
        newStatus = 'MATURED'
      }

      const balance = totalPaid + bonus - account.totalRedeemedAmount

      schemeRepo.updateAccountTotals(
        account.id,
        paidInstallmentsCount,
        totalPaid,
        bonus,
        totalGoldGrams,
        account.totalRedeemedAmount,
        balance,
        now
      )

      if (newStatus !== account.status) {
        schemeRepo.updateAccountStatus(account.id, newStatus, now)
      }

      // Add Timeline Event
      schemeRepo.addTimelineEvent(
        uuidv4(),
        account.id,
        'INSTALLMENT_PAID',
        `Received installment payment of ₹${payload.amount.toLocaleString()} via ${paymentMethod}. Total paid: ₹${totalPaid.toLocaleString()}${
          newStatus === 'MATURED' ? ` (Scheme Matured! Bonus: ₹${bonus.toLocaleString()})` : ''
        }`,
        'Admin',
        now
      )
    })

    execute()
    return this.getAccountById(account.id)
  },

  // ================= 4. REDEMPTION =================

  redeemScheme(payload: RedeemSchemePayload): SchemeRedemptionRecord {
    if (payload.redeemedAmount <= 0) {
      throw new ValidationError('Redemption amount must be greater than zero')
    }

    const db = getDatabase()
    const account = this.getAccountById(payload.schemeAccountId)

    if (account.status === 'CANCELLED' || account.status === 'CLOSED') {
      throw new ValidationError(`Cannot redeem scheme account with status ${account.status}`)
    }
    if (payload.redeemedAmount > account.balanceAmount) {
      throw new ValidationError(
        `Redemption amount (₹${payload.redeemedAmount}) exceeds available balance (₹${account.balanceAmount})`
      )
    }

    const id = uuidv4()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const redemptionDate = now.slice(0, 10)
    const redemptionNumber = `RED-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`

    const redemptionRecord: SchemeRedemptionRecord = {
      id,
      redemptionNumber,
      schemeAccountId: account.id,
      customerId: account.customerId,
      redemptionDate,
      redeemedAmount: payload.redeemedAmount,
      bonusAmountApplied: account.bonusAmount,
      goldGramsRedeemed: account.goldEntitlementGrams,
      salesInvoiceId: payload.salesInvoiceId || null,
      status: 'COMPLETED',
      notes: payload.notes || '',
      createdAt: now
    }

    const execute = db.transaction(() => {
      // 1. Insert Redemption Record
      schemeRepo.insertRedemption(redemptionRecord)

      // 2. Update Scheme Account Balance & Totals
      const newRedeemedTotal = account.totalRedeemedAmount + payload.redeemedAmount
      const newBalance = account.balanceAmount - payload.redeemedAmount
      const newStatus = newBalance <= 0 ? 'REDEEMED' : account.status

      schemeRepo.updateAccountTotals(
        account.id,
        account.installmentsPaid,
        account.totalAmountPaid,
        account.bonusAmount,
        account.goldEntitlementGrams,
        newRedeemedTotal,
        newBalance,
        now
      )

      if (newStatus !== account.status) {
        schemeRepo.updateAccountStatus(account.id, newStatus, now)
      }

      // 3. Post to Account Ledger (Debit customer liability)
      accountLedgerRepo.insert({
        id: uuidv4(),
        sourceType: 'SCHEME_REDEMPTION',
        sourceId: id,
        entryDate: redemptionDate,
        accountId: account.customerId,
        metalType: 'OTHER',
        cashNave: payload.redeemedAmount,
        narration: `Scheme Redemption ${redemptionNumber} for ${account.accountNumber}`,
        createdAt: now
      })

      // 4. Add Timeline Event
      schemeRepo.addTimelineEvent(
        uuidv4(),
        account.id,
        'REDEMPTION',
        `Redeemed ₹${payload.redeemedAmount.toLocaleString()} against jewellery purchase (Redemption No: ${redemptionNumber}). Remaining balance: ₹${newBalance.toLocaleString()}`,
        'Admin',
        now
      )
    })

    execute()
    return redemptionRecord
  },

  // ================= 5. REFUND / CANCELLATION =================

  refundScheme(payload: RefundSchemePayload): SchemeRefundRecord {
    if (payload.refundAmount <= 0) {
      throw new ValidationError('Refund amount must be greater than zero')
    }

    const db = getDatabase()
    const account = this.getAccountById(payload.schemeAccountId)

    if (account.status === 'REDEEMED' || account.status === 'CLOSED') {
      throw new ValidationError(`Cannot refund scheme account with status ${account.status}`)
    }
    if (payload.refundAmount > account.totalAmountPaid) {
      throw new ValidationError(
        `Refund amount (₹${payload.refundAmount}) cannot exceed total paid amount (₹${account.totalAmountPaid})`
      )
    }

    const id = uuidv4()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const refundDate = now.slice(0, 10)
    const refundNumber = `REF-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`

    const refundRecord: SchemeRefundRecord = {
      id,
      refundNumber,
      schemeAccountId: account.id,
      customerId: account.customerId,
      refundDate,
      refundAmount: payload.refundAmount,
      deductionAmount: payload.deductionAmount || 0,
      paymentMethod: payload.paymentMethod || 'CASH',
      paymentReference: payload.paymentReference || '',
      notes: payload.notes || '',
      createdAt: now
    }

    const execute = db.transaction(() => {
      // 1. Insert Refund Record
      schemeRepo.insertRefund(refundRecord)

      // 2. Mark Account Closed
      schemeRepo.updateAccountStatus(account.id, 'CLOSED', now)
      schemeRepo.updateAccountTotals(
        account.id,
        account.installmentsPaid,
        account.totalAmountPaid,
        0, // Forfeit bonus on early cancellation
        0,
        payload.refundAmount,
        0,
        now
      )

      // 3. Post to Account Ledger (Debit customer liability)
      accountLedgerRepo.insert({
        id: uuidv4(),
        sourceType: 'REFUND',
        sourceId: id,
        entryDate: refundDate,
        accountId: account.customerId,
        metalType: 'OTHER',
        cashNave: payload.refundAmount,
        narration: `Scheme Cancellation Refund ${refundNumber} for ${account.accountNumber}`,
        createdAt: now
      })

      // 4. Add Timeline Event
      schemeRepo.addTimelineEvent(
        uuidv4(),
        account.id,
        'REFUND_PROCESSED',
        `Scheme cancelled. Refunded ₹${payload.refundAmount.toLocaleString()} via ${
          payload.paymentMethod || 'CASH'
        }. Account closed.`,
        'Admin',
        now
      )
    })

    execute()
    return refundRecord
  },

  getTimelineEvents(schemeAccountId: string): SchemeTimelineEventRecord[] {
    return schemeRepo.getTimelineEvents(schemeAccountId)
  },

  getDashboardSummary(): SchemeDashboardSummary {
    return schemeRepo.getDashboardSummary()
  },

  calculateBonus(
    scheme: SchemeMasterRecord,
    totalPaid: number,
    installmentAmount: number
  ): number {
    switch (scheme.bonusType) {
      case 'ONE_MONTH_INSTALLMENT':
        return installmentAmount
      case 'PERCENTAGE':
        return Number(((totalPaid * (scheme.bonusValue || 0)) / 100).toFixed(2))
      case 'FIXED_AMOUNT':
        return scheme.bonusValue || 0
      case 'NONE':
      default:
        return 0
    }
  }
}
