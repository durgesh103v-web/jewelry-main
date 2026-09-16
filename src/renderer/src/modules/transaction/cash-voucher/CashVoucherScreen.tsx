import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import CashVoucherPrintPreview from './CashVoucherPrintPreview'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatDate, formatCurrency } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'

type CashVoucherForm = {
  voucherType: CashVoucherType
  voucherDate: string
  accountId: string
  amount: string
  narration: string
}

const today = new Date().toISOString().slice(0, 10)



function createInitialForm(voucherType: CashVoucherType): CashVoucherForm {
  return {
    voucherType,
    voucherDate: today,
    accountId: '',
    amount: '',
    narration: ''
  }
}

const COMMON_NARRATIONS = [
  'Cash received towards bill',
  'Advance received for order',
  'Labour payment to karigar',
  'Cash payment against invoice',
  'Full & final settlement'
]

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000, 50000]

function CashVoucherScreen({
  initialVoucherType,
  onClose
}: {
  initialVoucherType: CashVoucherType
  onClose?: () => void
}): React.JSX.Element {
  const [form, setForm] = useState<CashVoucherForm>(() => createInitialForm(initialVoucherType))
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [vouchers, setVouchers] = useState<CashVoucherRecord[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CashVoucherRecord | null>(null)
  const [voucherNo, setVoucherNo] = useState('')
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | CashVoucherType>('ALL')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [printVoucher, setPrintVoucher] = useState<CashVoucherRecord | null>(null)
  const [autoPrintVoucher, setAutoPrintVoucher] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const accountSelectRef = useRef<HTMLSelectElement | null>(null)
  const amountInputRef = useRef<HTMLInputElement | null>(null)
  const narrationInputRef = useRef<HTMLInputElement | null>(null)

  const activeAccounts = useMemo(() => {
    return accounts.filter((account) => account.active)
  }, [accounts])

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === form.accountId)
  }, [accounts, form.accountId])

  const filteredVouchers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return vouchers.filter((voucher) => {
      const typeMatch = typeFilter === 'ALL' || voucher.voucherType === typeFilter
      const keywordMatch =
        !keyword ||
        voucher.voucherNo.toLowerCase().includes(keyword) ||
        (voucher.accountName || '').toLowerCase().includes(keyword) ||
        voucher.voucherDate.toLowerCase().includes(keyword) ||
        (voucher.narration || '').toLowerCase().includes(keyword) ||
        (voucher.voucherType === 'RECEIPT' ? 'cash receipt jama' : 'cash payment nave').includes(
          keyword
        )

      return typeMatch && keywordMatch
    })
  }, [searchText, typeFilter, vouchers])

  const statusCounts = useMemo(() => {
    return vouchers.reduce(
      (acc, v) => {
        acc.total += 1
        if (v.voucherType === 'RECEIPT') acc.receipts += 1
        else if (v.voucherType === 'PAYMENT') acc.payments += 1
        return acc
      },
      { total: 0, receipts: 0, payments: 0 }
    )
  }, [vouchers])

  const totals = useMemo(() => {
    return filteredVouchers.reduce(
      (acc, voucher) => {
        const val = Number(voucher.amount || 0)
        if (voucher.voucherType === 'RECEIPT') {
          acc.jama += val
        } else {
          acc.nave += val
        }
        return acc
      },
      { jama: 0, nave: 0 }
    )
  }, [filteredVouchers])

  const netBalance = totals.jama - totals.nave

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 3500)
  }, [])

  const loadNextNumber = useCallback(async (voucherType: CashVoucherType): Promise<void> => {
    try {
      const nextNumber = await window.api.cashVoucher.getNextNumber(voucherType)
      setVoucherNo(nextNumber)
    } catch {
      setVoucherNo(voucherType === 'RECEIPT' ? 'CR-0001' : 'CP-0001')
    }
  }, [])

  const loadVouchers = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.cashVoucher.list()
      setVouchers(Array.isArray(data) ? data : [])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }, [showAlert])

  const loadAccounts = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.accounts.list()
      setAccounts(Array.isArray(data) ? data : [])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }, [showAlert])

  const loadScreenData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await Promise.all([loadAccounts(), loadVouchers(), loadNextNumber(form.voucherType)])
    } finally {
      setLoading(false)
    }
  }, [form.voucherType, loadAccounts, loadNextNumber, loadVouchers])

  const handleNew = useCallback((): void => {
    const nextForm = createInitialForm(initialVoucherType)
    setEditingId(null)
    setAlertMessage('')
    setForm(nextForm)
    void loadNextNumber(nextForm.voucherType)

    window.setTimeout(() => {
      dateInputRef.current?.focus()
    }, 0)
  }, [initialVoucherType, loadNextNumber])

  const focusNextOnEnter = (
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    nextElement?: HTMLElement | null
  ): void => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    nextElement?.focus()
  }

  const handleVoucherTypeChange = (voucherType: CashVoucherType): void => {
    if (editingId) return
    setForm((current) => ({ ...current, voucherType }))
    void loadNextNumber(voucherType)
  }

  const validateForm = (): boolean => {
    if (!form.voucherDate) {
      showAlert('warning', 'Please select voucher date.')
      dateInputRef.current?.focus()
      return false
    }

    if (!form.accountId) {
      showAlert('warning', 'Please select an account.')
      accountSelectRef.current?.focus()
      return false
    }

    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      showAlert('warning', 'Amount must be greater than 0.')
      amountInputRef.current?.focus()
      return false
    }

    return true
  }

  const handleSave = async (): Promise<void> => {
    if (saving || !validateForm()) return

    try {
      setSaving(true)

      const payload: CashVoucherPayload = {
        voucherType: form.voucherType,
        voucherDate: form.voucherDate,
        accountId: form.accountId,
        amount: Number(form.amount),
        narration: form.narration.trim()
      }

      const successMessage = editingId
        ? `Cash voucher ${voucherNo} updated successfully.`
        : `Cash voucher ${voucherNo} saved successfully.`

      const saved = editingId
        ? await window.api.cashVoucher.update(editingId, payload)
        : await window.api.cashVoucher.create(payload)

      await loadVouchers()
      handleNew()
      showAlert('success', successMessage)
      setAutoPrintVoucher(false)
      setPrintVoucher(saved)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (voucher: CashVoucherRecord): void => {
    setEditingId(voucher.id)
    setAlertMessage('')
    setVoucherNo(voucher.voucherNo)
    setForm({
      voucherType: voucher.voucherType,
      voucherDate: voucher.voucherDate,
      accountId: voucher.accountId,
      amount: String(voucher.amount),
      narration: voucher.narration || ''
    })

    window.setTimeout(() => {
      amountInputRef.current?.focus()
    }, 0)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await window.api.cashVoucher.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        handleNew()
      }

      setDeleteTarget(null)
      await loadVouchers()
      showAlert('success', `Cash voucher ${deleteTarget.voucherNo} deleted successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelDelete = (): void => {
    if (deleting) return
    setDeleteTarget(null)
  }

  const handleAddQuickAmount = (val: number): void => {
    const current = Number(form.amount) || 0
    setForm((prev) => ({ ...prev, amount: String(current + val) }))
  }

  const handleSaveRef = useRef(handleSave)
  useEffect(() => {
    handleSaveRef.current = handleSave
  })

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSaveRef.current()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadScreenData()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadScreenData])

  const isReceipt = form.voucherType === 'RECEIPT'

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* ── TOP HEADER BAR ── */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 flex items-center justify-center text-lg shadow-2xs font-bold transition-colors">
            💵
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                Cash Receipt / Cash Payment
              </h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border transition-colors ${
                  isReceipt
                    ? 'bg-emerald-100/80 text-emerald-900 border-emerald-300'
                    : 'bg-amber-100/90 text-amber-900 border-amber-300'
                }`}
              >
                {editingId ? `Editing ${voucherNo}` : voucherNo || (isReceipt ? 'CR-0001' : 'CP-0001')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Post cash receipts (Jama) and cash payments (Nave) directly to double-entry ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editingId && (
            <button
              type="button"
              onClick={handleNew}
              className="h-8 px-3 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>✕</span> Clear Edit
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
              title="Close Tab"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Global Alert Notification */}
      <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

      {/* ── TWO-PANEL CONTENT WORKSPACE ── */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col lg:flex-row gap-4">
        {/* ── LEFT PANEL: VOUCHER ENTRY FORM (350px) ── */}
        <div className="w-full lg:w-[350px] xl:w-[370px] bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col shrink-0 overflow-y-auto">
          {/* Card Title */}
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <span
              className={`w-1.5 h-4 rounded-full inline-block transition-colors ${
                isReceipt ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {editingId ? 'Edit Cash Voucher' : 'New Voucher'}
            </h2>
          </div>

          {/* Full-width 2-Segment Switch (Zero text wrap, ample breathing room) */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1 mt-3 mb-3 border border-slate-200/70 shrink-0">
            <button
              type="button"
              onClick={() => handleVoucherTypeChange('RECEIPT')}
              disabled={Boolean(editingId) || saving}
              className={`h-8 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                isReceipt
                  ? 'bg-emerald-600 text-white shadow-2xs border-emerald-600'
                  : 'border-transparent text-slate-600 hover:text-emerald-700 hover:bg-white/60'
              }`}
            >
              <span>＋</span> Receipt (Jama)
            </button>
            <button
              type="button"
              onClick={() => handleVoucherTypeChange('PAYMENT')}
              disabled={Boolean(editingId) || saving}
              className={`h-8 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                !isReceipt
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs border-amber-600'
                  : 'border-transparent text-slate-600 hover:text-amber-700 hover:bg-white/60'
              }`}
            >
              <span>−</span> Payment (Nave)
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-3.5 flex-1">
            {/* Voucher No & Date Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Voucher No.
                </label>
                <input
                  value={voucherNo || '-'}
                  disabled
                  className="w-full h-8.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Date *
                </label>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={form.voucherDate}
                  onChange={(e) => setForm((c) => ({ ...c, voucherDate: e.target.value }))}
                  onKeyDown={(e) => focusNextOnEnter(e, accountSelectRef.current)}
                  disabled={saving}
                  className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
                />
              </div>
            </div>

            {/* Account Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Account / Party *
                </label>
                {selectedAccount?.mobileNumber && (
                  <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200 font-mono">
                    📱 {selectedAccount.mobileNumber}
                  </span>
                )}
              </div>
              <select
                ref={accountSelectRef}
                value={form.accountId}
                onChange={(e) => setForm((c) => ({ ...c, accountId: e.target.value }))}
                onKeyDown={(e) => focusNextOnEnter(e, amountInputRef.current)}
                disabled={saving}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              >
                <option value="">Select Account (Customer / Supplier / Karigar)</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountName}
                    {account.city ? ` • ${account.city}` : ''}
                    {account.groupName ? ` (${account.groupName})` : ''}
                  </option>
                ))}
              </select>

              {/* Selected Account Info Card */}
              {selectedAccount && (
                <div className="mt-1.5 p-2 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-slate-700 truncate">
                      {selectedAccount.groupName || 'General Account'}
                    </span>
                    {selectedAccount.city && (
                      <span className="text-slate-400 shrink-0">📍 {selectedAccount.city}</span>
                    )}
                  </div>
                  {selectedAccount.mobileNumber && (
                    <span className="font-mono text-slate-500 shrink-0">
                      📱 {selectedAccount.mobileNumber}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Amount Field & Quick Chips */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Cash Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                <input
                  ref={amountInputRef}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))}
                  onKeyDown={(e) => focusNextOnEnter(e, narrationInputRef.current)}
                  placeholder="0.00"
                  disabled={saving}
                  className={`w-full h-9 pl-7 pr-3 text-sm font-mono font-bold rounded-lg border focus:ring-1 shadow-2xs transition-colors ${
                    isReceipt
                      ? 'bg-emerald-50/40 border-emerald-200 text-emerald-900 focus:border-emerald-500 focus:ring-emerald-500'
                      : 'bg-amber-50/40 border-amber-200 text-amber-900 focus:border-amber-500 focus:ring-amber-500'
                  }`}
                />
              </div>

              {/* Quick Amount Increment Pills */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleAddQuickAmount(val)}
                    className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    +{val.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            {/* Narration & Quick Suggestions */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Narration / Details
              </label>
              <input
                ref={narrationInputRef}
                value={form.narration}
                onChange={(e) => setForm((c) => ({ ...c, narration: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleSave()
                  }
                }}
                placeholder="e.g. Cash received towards bill, Karigar making advance... (Enter to save)"
                disabled={saving}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />

              {/* Quick Narration Pills */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_NARRATIONS.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, narration: text }))}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer truncate max-w-[170px]"
                    title={text}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Button Row */}
          <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleNew}
              disabled={saving}
              className="h-9 px-4 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="h-9 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="animate-spin text-sm">⏳</span> Saving...
                </>
              ) : editingId ? (
                <>
                  <span>✓</span> Update Voucher
                </>
              ) : (
                <>
                  <span>＋</span> Save {isReceipt ? 'Receipt' : 'Payment'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL: CASH VOUCHERS REGISTER (FLEX-1) ── */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          {/* Section Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Cash Vouchers Register
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                ({filteredVouchers.length} of {vouchers.length} vouchers)
              </span>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Type Filter Pills */}
              <div className="inline-flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setTypeFilter('ALL')}
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    typeFilter === 'ALL'
                      ? 'bg-white text-slate-800 shadow-2xs border-slate-200/90 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                  }`}
                >
                  All ({statusCounts.total})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('RECEIPT')}
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    typeFilter === 'RECEIPT'
                      ? 'bg-emerald-100/90 text-emerald-900 shadow-2xs border-emerald-300 font-bold'
                      : 'border-transparent text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  Receipts ({statusCounts.receipts})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('PAYMENT')}
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    typeFilter === 'PAYMENT'
                      ? 'bg-amber-100/90 text-amber-900 shadow-2xs border-amber-300 font-bold'
                      : 'border-transparent text-amber-800 hover:text-amber-950 hover:bg-amber-50'
                  }`}
                >
                  Payments ({statusCounts.payments})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search voucher no, account, note..."
                  className="w-52 h-8 pl-7 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                />
                <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText('')}
                    className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => void loadScreenData()}
                disabled={loading}
                className="h-8 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                title="Reload Vouchers"
              >
                <span className={loading ? 'animate-spin' : ''}>🔄</span> Refresh
              </button>
            </div>
          </div>

          {/* Metric Totals Cards */}
          <div className="grid grid-cols-3 gap-3 px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                  Total Cash In (Jama)
                </span>
                <strong className="text-sm font-mono font-bold text-emerald-800">
                  ₹{formatCurrency(totals.jama)}
                </strong>
              </div>
              <span className="text-base text-emerald-600 font-bold">📥</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase block">
                  Total Cash Out (Nave)
                </span>
                <strong className="text-sm font-mono font-bold text-amber-900">
                  ₹{formatCurrency(totals.nave)}
                </strong>
              </div>
              <span className="text-base text-amber-600 font-bold">📤</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Net Cash (Jama − Nave)
                </span>
                <strong
                  className={`text-sm font-mono font-bold ${
                    netBalance >= 0 ? 'text-blue-800' : 'text-amber-900'
                  }`}
                >
                  ₹{formatCurrency(netBalance)}
                </strong>
              </div>
              <span className="text-base font-bold">💰</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[460px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center whitespace-nowrap">Sr</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Voucher No</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Type</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Account Name</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Payment Nave (₹)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Receipt Jama (₹)</th>
                  <th className="py-2.5 px-3">Narration</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap w-36">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      <span className="inline-block animate-spin text-base mr-2">⏳</span>
                      Loading vouchers...
                    </td>
                  </tr>
                ) : filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <div className="text-2xl mb-1">💵</div>
                      {searchText || typeFilter !== 'ALL'
                        ? 'No matching cash voucher found.'
                        : 'No cash voucher recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((voucher, index) => {
                    const isRec = voucher.voucherType === 'RECEIPT'
                    const nave = !isRec ? voucher.amount : 0
                    const jama = isRec ? voucher.amount : 0

                    return (
                      <tr
                        key={voucher.id}
                        onDoubleClick={() => handleEdit(voucher)}
                        className="hover:bg-amber-50/30 transition-colors duration-75 cursor-pointer"
                        title="Double-click to edit"
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-600 font-medium">
                          {formatDate(voucher.voucherDate)}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {voucher.voucherNo}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isRec
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {isRec ? 'Receipt (Jama)' : 'Payment (Nave)'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {voucher.accountName}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-800 whitespace-nowrap">
                          {nave ? `₹${formatCurrency(nave)}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {jama ? `₹${formatCurrency(jama)}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 max-w-[180px] truncate" title={voucher.narration}>
                          {voucher.narration || '-'}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div
                            className="inline-flex items-center justify-center gap-1.5"
                            onDoubleClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleEdit(voucher)}
                              disabled={saving || deleting}
                              className="h-6.5 px-2.5 text-[11px] font-semibold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100/90 border border-amber-300/80 rounded-md transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shadow-2xs active:scale-95 disabled:opacity-50"
                              title="Edit Voucher"
                            >
                              <span className="text-[11px]">✏️</span>
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setAutoPrintVoucher(false)
                                setPrintVoucher(voucher)
                              }}
                              disabled={saving || deleting}
                              className="h-6.5 px-2.5 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-300/80 rounded-md transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shadow-2xs active:scale-95 disabled:opacity-50"
                              title="Print Slip"
                            >
                              <span className="text-[11px]">🖨️</span>
                              <span>Print</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(voucher)}
                              disabled={saving || deleting}
                              className="h-6.5 w-6.5 text-[11px] font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-md transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap shadow-2xs active:scale-95 disabled:opacity-50"
                              title="Delete Voucher"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>

              {/* Table Summary Footer */}
              {filteredVouchers.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800 text-[11px] shadow-xs">
                  <tr>
                    <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-600">
                      Total ({filteredVouchers.length} vouchers):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-900">
                      ₹{formatCurrency(totals.nave)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                      ₹{formatCurrency(totals.jama)}
                    </td>
                    <td colSpan={2} className="py-2.5 px-3 text-slate-600 text-[10px]">
                      Net: ₹{formatCurrency(netBalance)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Informative Note */}
          <div className="p-3 bg-amber-50/50 border-t border-amber-100/60 text-[11px] text-amber-900/80 flex items-center gap-2">
            <span className="text-sm">ℹ️</span>
            <span>
              <strong>Double-Entry Posting Note:</strong> Cash Receipt posts <strong>Jama (+)</strong> to the customer/supplier ledger, reducing their outstanding dues. Cash Payment posts <strong>Nave (−)</strong>, crediting their account.
            </span>
          </div>
        </div>
      </div>

      {/* ── CONFIRM DELETE DIALOG ── */}
      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Cash Voucher?"
        message={
          deleteTarget
            ? `Voucher ${deleteTarget.voucherNo} for ${deleteTarget.accountName} (₹${formatCurrency(
                deleteTarget.amount
              )}) will be deleted and its ledger effect reversed.`
            : ''
        }
        confirmText="Delete Voucher"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />

      {/* ── PRINT PREVIEW MODAL ── */}
      {printVoucher && (
        <CashVoucherPrintPreview
          voucher={printVoucher}
          autoPrintOnOpen={autoPrintVoucher}
          onClose={() => setPrintVoucher(null)}
        />
      )}
    </div>
  )
}

export default CashVoucherScreen
