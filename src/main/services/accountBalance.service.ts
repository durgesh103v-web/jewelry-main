import dayjs from 'dayjs'
import { AccountRepository } from '../database/repositories/AccountRepository'
import { AccountLedgerRepository } from '../database/repositories/AccountLedgerRepository'
import { NotFoundError } from '../ipc/errors'

const accountRepository = new AccountRepository()
const accountLedgerRepository = new AccountLedgerRepository()

export type AccountBalanceListRecord = {
  id: string
  accountName: string
  otherName: string
  mobileNumber: string
  city: string
  groupName: string
  openingGoldFine: number
  openingSilverFine: number
  openingCash: number
  openingAnamat: number
  openingBank: number
  goldFine: number
  silverFine: number
  cash: number
  anamat: number
  bank: number
}

export type OutstandingRecord = AccountBalanceListRecord & {
  status: 'RECEIVABLE' | 'PAYABLE'
  sortValue: number
  lastTransactionDate: string | null
  daysSinceLastTransaction: number | null
}

const OUTSTANDING_EPSILON = 0.0005

export const accountBalanceService = {
  getAccountBalance(accountId: string) {
    const account = accountRepository.findById(accountId)
    if (!account) {
      throw new NotFoundError('Account not found')
    }

    const sums = accountLedgerRepository.getAccountSums(accountId)

    return {
      goldFine:
        Number(account.opening_gold_fine ?? 0) +
        Number(sums.gold_fine_nave ?? 0) -
        Number(sums.gold_fine_jama ?? 0),
      silverFine:
        Number(account.opening_silver_fine ?? 0) +
        Number(sums.silver_fine_nave ?? 0) -
        Number(sums.silver_fine_jama ?? 0),
      cash:
        Number(account.opening_cash ?? 0) +
        Number(sums.cash_nave ?? 0) -
        Number(sums.cash_jama ?? 0),
      anamat:
        Number(account.opening_anamat ?? 0) +
        Number(sums.anamat_nave ?? 0) -
        Number(sums.anamat_jama ?? 0),
      bank:
        Number(account.opening_bank ?? 0) +
        Number(sums.bank_nave ?? 0) -
        Number(sums.bank_jama ?? 0)
    }
  },

  listAccountBalances(): AccountBalanceListRecord[] {
    const accounts = accountRepository.findAll()
    const ledgerSums = accountLedgerRepository.getAllAccountSums()
    const sumsByAccountId = new Map(ledgerSums.map((row) => [row.account_id, row]))

    return accounts.map((account) => {
      const sums = sumsByAccountId.get(account.id)

      const openingGoldFine = Number(account.opening_gold_fine ?? 0)
      const openingSilverFine = Number(account.opening_silver_fine ?? 0)
      const openingCash = Number(account.opening_cash ?? 0)
      const openingAnamat = Number(account.opening_anamat ?? 0)
      const openingBank = Number(account.opening_bank ?? 0)

      return {
        id: account.id,
        accountName: account.account_name,
        otherName: account.other_name ?? '',
        mobileNumber: account.mobile_number ?? '',
        city: account.city ?? '',
        groupName: account.group_name ?? '',
        openingGoldFine,
        openingSilverFine,
        openingCash,
        openingAnamat,
        openingBank,
        goldFine:
          openingGoldFine +
          Number(sums?.gold_fine_nave ?? 0) -
          Number(sums?.gold_fine_jama ?? 0),
        silverFine:
          openingSilverFine +
          Number(sums?.silver_fine_nave ?? 0) -
          Number(sums?.silver_fine_jama ?? 0),
        cash: openingCash + Number(sums?.cash_nave ?? 0) - Number(sums?.cash_jama ?? 0),
        anamat: openingAnamat + Number(sums?.anamat_nave ?? 0) - Number(sums?.anamat_jama ?? 0),
        bank: openingBank + Number(sums?.bank_nave ?? 0) - Number(sums?.bank_jama ?? 0)
      }
    })
  },

  getOutstandingBalances() {
    const balances = this.listAccountBalances()
    const lastEntryRows = accountLedgerRepository.getLastEntryDateByAccount()
    const lastEntryByAccountId = new Map(
      lastEntryRows.map((row) => [row.account_id, row.last_entry_date])
    )

    const today = dayjs()

    const outstanding = balances.reduce<OutstandingRecord[]>((list, account) => {
      const fields = [account.goldFine, account.silverFine, account.cash, account.anamat, account.bank]
      const hasOutstanding = fields.some((value) => Math.abs(value) > OUTSTANDING_EPSILON)

      if (!hasOutstanding) {
        return list
      }

      const dominant = fields.reduce(
        (max, value) => (Math.abs(value) > Math.abs(max) ? value : max),
        0
      )
      const sortValue = fields.reduce((sum, value) => sum + Math.abs(value), 0)
      const lastTransactionDate = lastEntryByAccountId.get(account.id) ?? null
      const daysSinceLastTransaction = lastTransactionDate
        ? Math.max(0, today.diff(dayjs(lastTransactionDate), 'day'))
        : null

      list.push({
        ...account,
        status: dominant >= 0 ? 'RECEIVABLE' : 'PAYABLE',
        sortValue,
        lastTransactionDate,
        daysSinceLastTransaction
      })

      return list
    }, [])

    outstanding.sort((a, b) => b.sortValue - a.sortValue)

    const receivable = outstanding.filter((account) => account.status === 'RECEIVABLE')
    const payable = outstanding.filter((account) => account.status === 'PAYABLE')

    const sumTotals = (list: OutstandingRecord[]) =>
      list.reduce(
        (total, account) => {
          total.goldFine += account.goldFine
          total.silverFine += account.silverFine
          total.cash += account.cash
          total.anamat += account.anamat
          total.bank += account.bank
          return total
        },
        { goldFine: 0, silverFine: 0, cash: 0, anamat: 0, bank: 0 }
      )

    return {
      receivable,
      payable,
      receivableTotals: sumTotals(receivable),
      payableTotals: sumTotals(payable)
    }
  },

  getAccountLedgerDetails(
    accountId: string,
    filter?: { fromDate?: string; toDate?: string }
  ) {
    const account = accountRepository.findById(accountId)
    if (!account) {
      throw new NotFoundError('Account not found')
    }

    const fromDate = filter?.fromDate || ''
    const toDate = filter?.toDate || ''

    let runningGoldFine = Number(account.opening_gold_fine ?? 0)
    let runningSilverFine = Number(account.opening_silver_fine ?? 0)
    let runningCash = Number(account.opening_cash ?? 0)
    let runningBank = Number(account.opening_bank ?? 0)
    let runningAnamat = Number(account.opening_anamat ?? 0)

    if (fromDate) {
      const priorRows = accountLedgerRepository.getPriorLedgerEntries(accountId, fromDate)

      for (const row of priorRows) {
        const fineJama = Number(row.fine_jama ?? 0)
        const fineNave = Number(row.fine_nave ?? 0)

        if (row.metal_type === 'Gold') {
          runningGoldFine = runningGoldFine + fineNave - fineJama
        }

        if (row.metal_type === 'Silver') {
          runningSilverFine = runningSilverFine + fineNave - fineJama
        }

        runningCash = runningCash + Number(row.cash_nave ?? 0) - Number(row.cash_jama ?? 0)
        runningBank = runningBank + Number(row.bank_nave ?? 0) - Number(row.bank_jama ?? 0)
        runningAnamat = runningAnamat + Number(row.anamat_nave ?? 0) - Number(row.anamat_jama ?? 0)
      }
    }

    const periodOpeningBalance = {
      goldFine: runningGoldFine,
      silverFine: runningSilverFine,
      cash: runningCash,
      anamat: runningAnamat,
      bank: runningBank
    }

    const ledgerRows = accountLedgerRepository.getLedgerDetails(accountId, fromDate, toDate)

    const rows = ledgerRows.map((row, index) => {
      const fineJama = Number(row.fine_jama ?? 0)
      const fineNave = Number(row.fine_nave ?? 0)

      if (row.metal_type === 'Gold') {
        runningGoldFine = runningGoldFine + fineNave - fineJama
      }

      if (row.metal_type === 'Silver') {
        runningSilverFine = runningSilverFine + fineNave - fineJama
      }

      const cashJama = Number(row.cash_jama ?? 0)
      const cashNave = Number(row.cash_nave ?? 0)
      const bankJama = Number(row.bank_jama ?? 0)
      const bankNave = Number(row.bank_nave ?? 0)
      const anamatJama = Number(row.anamat_jama ?? 0)
      const anamatNave = Number(row.anamat_nave ?? 0)

      runningCash = runningCash + cashNave - cashJama
      runningBank = runningBank + bankNave - bankJama
      runningAnamat = runningAnamat + anamatNave - anamatJama

      return {
        id: row.id,
        srNo: index + 1,
        sourceType: row.source_type,
        sourceId: row.source_id,
        saleNo: row.bill_no ?? '',
        billNo: row.bill_no ?? '',
        entryDate: row.entry_date,
        metalType: row.metal_type ?? '',
        fineJama,
        fineNave,
        cashJama,
        cashNave,
        bankJama,
        bankNave,
        anamatJama,
        anamatNave,
        narration: row.narration ?? '',
        runningGoldFine,
        runningSilverFine,
        runningCash,
        runningBank,
        runningAnamat
      }
    })

    return {
      account: {
        id: account.id,
        accountName: account.account_name,
        otherName: account.other_name ?? '',
        mobileNumber: account.mobile_number ?? '',
        city: account.city ?? '',
        groupName: account.group_name ?? ''
      },
      openingBalance: {
        goldFine: Number(account.opening_gold_fine ?? 0),
        silverFine: Number(account.opening_silver_fine ?? 0),
        cash: Number(account.opening_cash ?? 0),
        anamat: Number(account.opening_anamat ?? 0),
        bank: Number(account.opening_bank ?? 0)
      },
      periodOpeningBalance,
      rows,
      closingBalance: {
        goldFine: runningGoldFine,
        silverFine: runningSilverFine,
        cash: runningCash,
        anamat: runningAnamat,
        bank: runningBank
      }
    }
  }
}
