import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import TransferPrintPreview from './TransferPrintPreview'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatDate, formatAmount, formatWeight } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'

type TransferForm = {
  transferDate: string
  fromAccountId: string
  toAccountId: string
  metalType: string
  goldFine: string
  silverFine: string
  cash: string
  bank: string
  anamat: string
  narration: string
}

const today = new Date().toISOString().slice(0, 10)

function createInitialForm(): TransferForm {
  return {
    transferDate: today,
    fromAccountId: '',
    toAccountId: '',
    metalType: '',
    goldFine: '',
    silverFine: '',
    cash: '',
    bank: '',
    anamat: '',
    narration: ''
  }
}




const COMMON_NARRATIONS = [
  'Transfer of fine gold',
  'Karigar silver settlement',
  'Cash adjustment transfer',
  'Inter-account bank transfer',
  'Anamat deposit settlement'
]

function TransferScreen({ onClose }: { onClose?: () => void }): React.JSX.Element {
  const [form, setForm] = useState<TransferForm>(() => createInitialForm())
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [transfers, setTransfers] = useState<TransferRecord[]>([])
  const [transferNo, setTransferNo] = useState('')
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GOLD' | 'SILVER' | 'CASH'>('ALL')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TransferRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [printTransfer, setPrintTransfer] = useState<TransferRecord | null>(null)
  const [autoPrintTransfer, setAutoPrintTransfer] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const fromAccountRef = useRef<HTMLSelectElement | null>(null)
  const toAccountRef = useRef<HTMLSelectElement | null>(null)
  const goldFineRef = useRef<HTMLInputElement | null>(null)
  const silverFineRef = useRef<HTMLInputElement | null>(null)
  const cashRef = useRef<HTMLInputElement | null>(null)
  const bankRef = useRef<HTMLInputElement | null>(null)
  const anamatRef = useRef<HTMLInputElement | null>(null)
  const narrationRef = useRef<HTMLInputElement | null>(null)

  const activeAccounts = useMemo(() => accounts.filter((account) => account.active), [accounts])

  const selectedFromAccount = useMemo(() => {
    return accounts.find((a) => a.id === form.fromAccountId)
  }, [accounts, form.fromAccountId])

  const selectedToAccount = useMemo(() => {
    return accounts.find((a) => a.id === form.toAccountId)
  }, [accounts, form.toAccountId])

  const filteredTransfers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return transfers.filter((transfer) => {
      let filterMatch = true
      if (typeFilter === 'GOLD') {
        filterMatch = transfer.goldFine > 0
      } else if (typeFilter === 'SILVER') {
        filterMatch = transfer.silverFine > 0
      } else if (typeFilter === 'CASH') {
        filterMatch = transfer.cash > 0 || transfer.bank > 0 || transfer.anamat > 0
      }

      if (!filterMatch) return false
      if (!keyword) return true

      return (
        transfer.transferNo.toLowerCase().includes(keyword) ||
        (transfer.fromAccountName || '').toLowerCase().includes(keyword) ||
        (transfer.toAccountName || '').toLowerCase().includes(keyword) ||
        (transfer.narration || '').toLowerCase().includes(keyword) ||
        transfer.transferDate.toLowerCase().includes(keyword)
      )
    })
  }, [searchText, transfers, typeFilter])

  const filterCounts = useMemo(() => {
    return transfers.reduce(
      (acc, t) => {
        acc.all += 1
        if (t.goldFine > 0) acc.gold += 1
        if (t.silverFine > 0) acc.silver += 1
        if (t.cash > 0 || t.bank > 0 || t.anamat > 0) acc.cash += 1
        return acc
      },
      { all: 0, gold: 0, silver: 0, cash: 0 }
    )
  }, [transfers])

  const totals = useMemo(() => {
    return filteredTransfers.reduce(
      (acc, t) => {
        acc.gold += Number(t.goldFine || 0)
        acc.silver += Number(t.silverFine || 0)
        acc.cash += Number(t.cash || 0)
        acc.bank += Number(t.bank || 0)
        acc.anamat += Number(t.anamat || 0)
        return acc
      },
      { gold: 0, silver: 0, cash: 0, bank: 0, anamat: 0 }
    )
  }, [filteredTransfers])

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

  const loadNextNumber = useCallback(async (): Promise<void> => {
    try {
      const nextNumber = await window.api.transfers.getNextNumber()
      setTransferNo(nextNumber)
    } catch {
      setTransferNo('TR-0001')
    }
  }, [])

  const loadTransfers = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.transfers.list()
      setTransfers(Array.isArray(data) ? data : [])
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
      await Promise.all([loadAccounts(), loadTransfers(), loadNextNumber()])
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadTransfers, loadNextNumber])

  const handleNew = useCallback((): void => {
    setForm(createInitialForm())
    setAlertMessage('')
    void loadNextNumber()

    window.setTimeout(() => {
      dateInputRef.current?.focus()
    }, 0)
  }, [loadNextNumber])

  const focusNextOnEnter = (
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    nextElement?: HTMLElement | null
  ): void => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    nextElement?.focus()
  }

  const handleSwapAccounts = (): void => {
    setForm((prev) => ({
      ...prev,
      fromAccountId: prev.toAccountId,
      toAccountId: prev.fromAccountId
    }))
  }

  const validateForm = (): boolean => {
    if (!form.transferDate) {
      showAlert('warning', 'Please select transfer date.')
      dateInputRef.current?.focus()
      return false
    }

    if (!form.fromAccountId) {
      showAlert('warning', 'Please select From Account (Nave / Debit).')
      fromAccountRef.current?.focus()
      return false
    }

    if (!form.toAccountId) {
      showAlert('warning', 'Please select To Account (Jama / Credit).')
      toAccountRef.current?.focus()
      return false
    }

    if (form.fromAccountId === form.toAccountId) {
      showAlert('warning', 'From Account and To Account must be different.')
      toAccountRef.current?.focus()
      return false
    }

    const totalTransfer =
      Number(form.goldFine || 0) +
      Number(form.silverFine || 0) +
      Number(form.cash || 0) +
      Number(form.bank || 0) +
      Number(form.anamat || 0)

    if (!Number.isFinite(totalTransfer) || totalTransfer <= 0) {
      showAlert('warning', 'Please enter at least one transfer amount (Gold, Silver, Cash, Bank, or Anamat).')
      goldFineRef.current?.focus()
      return false
    }

    return true
  }

  const handleSave = async (): Promise<void> => {
    if (saving || !validateForm()) return

    try {
      setSaving(true)

      const payload: TransferPayload = {
        transferDate: form.transferDate,
        fromAccountId: form.fromAccountId,
        toAccountId: form.toAccountId,
        metalType:
          form.metalType ||
          (Number(form.goldFine) > 0 ? 'Gold' : Number(form.silverFine) > 0 ? 'Silver' : ''),
        goldFine: Number(form.goldFine || 0),
        silverFine: Number(form.silverFine || 0),
        cash: Number(form.cash || 0),
        bank: Number(form.bank || 0),
        anamat: Number(form.anamat || 0),
        narration: form.narration.trim()
      }

      const created = await window.api.transfers.create(payload)

      await loadTransfers()
      handleNew()
      showAlert('success', `Transfer ${transferNo} saved successfully.`)
      setAutoPrintTransfer(false)
      setPrintTransfer(created)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
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

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await window.api.transfers.remove(deleteTarget.id)
      const targetNo = deleteTarget.transferNo
      setDeleteTarget(null)
      await loadTransfers()
      showAlert('success', `Transfer ${targetNo} deleted successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

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

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* ── TOP HEADER BAR ── */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 flex items-center justify-center text-lg shadow-2xs font-bold transition-colors">
            🔁
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                Transfer Voucher
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100/90 text-amber-900 border border-amber-300">
                {transferNo || 'TR-0001'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Move gold/silver fine, cash, bank, or anamat balance between accounts with automated ledger posting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
        {/* ── LEFT PANEL: TRANSFER ENTRY FORM (370px) ── */}
        <div className="w-full lg:w-[370px] xl:w-[390px] bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col shrink-0 overflow-y-auto">
          {/* Card Title */}
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-3">
            <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              New Transfer Voucher
            </h2>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 flex-1">
            {/* Voucher No & Date Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Transfer No.
                </label>
                <input
                  value={transferNo || '-'}
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
                  value={form.transferDate}
                  onChange={(e) => setForm((c) => ({ ...c, transferDate: e.target.value }))}
                  onKeyDown={(e) => focusNextOnEnter(e, fromAccountRef.current)}
                  disabled={saving}
                  className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
                />
              </div>
            </div>

            {/* From Account Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  From Account (Nave / Dr) *
                </label>
                {selectedFromAccount?.mobileNumber && (
                  <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200 font-mono">
                    📱 {selectedFromAccount.mobileNumber}
                  </span>
                )}
              </div>
              <select
                ref={fromAccountRef}
                value={form.fromAccountId}
                onChange={(e) => setForm((c) => ({ ...c, fromAccountId: e.target.value }))}
                onKeyDown={(e) => focusNextOnEnter(e, toAccountRef.current)}
                disabled={saving}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              >
                <option value="">Select From Account (Debit / Out)</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountName}
                    {account.city ? ` • ${account.city}` : ''}
                    {account.groupName ? ` (${account.groupName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button Divider */}
            <div className="flex items-center justify-center my-0.5">
              <button
                type="button"
                onClick={handleSwapAccounts}
                disabled={saving || !form.fromAccountId || !form.toAccountId}
                className="px-3 py-0.5 text-[10px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full transition-colors cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-40"
                title="Swap From and To Accounts"
              >
                <span>⇄</span> Swap Accounts
              </button>
            </div>

            {/* To Account Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  To Account (Jama / Cr) *
                </label>
                {selectedToAccount?.mobileNumber && (
                  <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200 font-mono">
                    📱 {selectedToAccount.mobileNumber}
                  </span>
                )}
              </div>
              <select
                ref={toAccountRef}
                value={form.toAccountId}
                onChange={(e) => setForm((c) => ({ ...c, toAccountId: e.target.value }))}
                onKeyDown={(e) => focusNextOnEnter(e, goldFineRef.current)}
                disabled={saving}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              >
                <option value="">Select To Account (Credit / In)</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountName}
                    {account.city ? ` • ${account.city}` : ''}
                    {account.groupName ? ` (${account.groupName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Metal Type Selector */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Metal Type (Optional)
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/70">
                {['', 'Gold', 'Silver'].map((type) => {
                  const isSelected = form.metalType === type
                  const label = type === '' ? 'None / Auto' : type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((c) => ({ ...c, metalType: type }))}
                      disabled={saving}
                      className={`h-7 text-xs font-semibold rounded transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-white text-slate-900 shadow-2xs border-slate-200 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Transfer Amounts Box */}
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Transfer Particulars (Enter at least one)
              </span>

              {/* Gold & Silver Fine Row */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-amber-800 block mb-1">
                    🪙 Gold Fine (g)
                  </label>
                  <input
                    ref={goldFineRef}
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.goldFine}
                    onChange={(e) => setForm((c) => ({ ...c, goldFine: e.target.value }))}
                    onKeyDown={(e) => focusNextOnEnter(e, silverFineRef.current)}
                    placeholder="0.000"
                    disabled={saving}
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-amber-200 rounded-lg text-amber-900 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    🥈 Silver Fine (g)
                  </label>
                  <input
                    ref={silverFineRef}
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.silverFine}
                    onChange={(e) => setForm((c) => ({ ...c, silverFine: e.target.value }))}
                    onKeyDown={(e) => focusNextOnEnter(e, cashRef.current)}
                    placeholder="0.000"
                    disabled={saving}
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  />
                </div>
              </div>

              {/* Cash & Bank Row */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-emerald-800 block mb-1">
                    💵 Cash (₹)
                  </label>
                  <input
                    ref={cashRef}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cash}
                    onChange={(e) => setForm((c) => ({ ...c, cash: e.target.value }))}
                    onKeyDown={(e) => focusNextOnEnter(e, bankRef.current)}
                    placeholder="0.00"
                    disabled={saving}
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-emerald-200 rounded-lg text-emerald-900 font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-blue-800 block mb-1">
                    🏦 Bank (₹)
                  </label>
                  <input
                    ref={bankRef}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.bank}
                    onChange={(e) => setForm((c) => ({ ...c, bank: e.target.value }))}
                    onKeyDown={(e) => focusNextOnEnter(e, anamatRef.current)}
                    placeholder="0.00"
                    disabled={saving}
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-blue-200 rounded-lg text-blue-900 font-mono font-bold focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-2xs"
                  />
                </div>
              </div>

              {/* Anamat Row */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  📦 Anamat / Deposit (₹)
                </label>
                <input
                  ref={anamatRef}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.anamat}
                  onChange={(e) => setForm((c) => ({ ...c, anamat: e.target.value }))}
                  onKeyDown={(e) => focusNextOnEnter(e, narrationRef.current)}
                  placeholder="0.00"
                  disabled={saving}
                  className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                />
              </div>
            </div>

            {/* Narration & Suggestions */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Narration / Remarks
              </label>
              <input
                ref={narrationRef}
                value={form.narration}
                onChange={(e) => setForm((c) => ({ ...c, narration: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleSave()
                  }
                }}
                placeholder="e.g. Fine gold transfer to karigar account... (Enter to save)"
                disabled={saving}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />

              {/* Quick Suggestions */}
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
          <div className="flex items-center justify-end gap-2.5 mt-4 pt-3 border-t border-slate-100">
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
              ) : (
                <>
                  <span>＋</span> Save Transfer
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL: TRANSFERS REGISTER (FLEX-1) ── */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          {/* Section Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Transfers Register
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                ({filteredTransfers.length} of {transfers.length} transfers)
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
                  All ({filterCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('GOLD')}
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    typeFilter === 'GOLD'
                      ? 'bg-amber-100/90 text-amber-900 shadow-2xs border-amber-300 font-bold'
                      : 'border-transparent text-amber-800 hover:text-amber-950 hover:bg-amber-50'
                  }`}
                >
                  Gold ({filterCounts.gold})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('SILVER')}
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    typeFilter === 'SILVER'
                      ? 'bg-slate-200 text-slate-900 shadow-2xs border-slate-300 font-bold'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Silver ({filterCounts.silver})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('CASH')}
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    typeFilter === 'CASH'
                      ? 'bg-emerald-100/90 text-emerald-900 shadow-2xs border-emerald-300 font-bold'
                      : 'border-transparent text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  Cash/Bank ({filterCounts.cash})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search transfer no, account, note..."
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
                title="Reload Transfers"
              >
                <span className={loading ? 'animate-spin' : ''}>🔄</span> Refresh
              </button>
            </div>
          </div>

          {/* Metric Totals Cards */}
          <div className="grid grid-cols-3 gap-3 px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase block">
                  Total Gold Fine Transferred
                </span>
                <strong className="text-sm font-mono font-bold text-amber-900">
                  {totals.gold.toFixed(3)} g
                </strong>
              </div>
              <span className="text-base text-amber-600 font-bold">🪙</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase block">
                  Total Silver Fine Transferred
                </span>
                <strong className="text-sm font-mono font-bold text-slate-800">
                  {totals.silver.toFixed(3)} g
                </strong>
              </div>
              <span className="text-base font-bold">🥈</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                  Total Cash & Bank Transferred
                </span>
                <strong className="text-sm font-mono font-bold text-emerald-800">
                  ₹{formatAmount(totals.cash + totals.bank + totals.anamat)}
                </strong>
              </div>
              <span className="text-base text-emerald-600 font-bold">💳</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[460px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center whitespace-nowrap">Sr</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Transfer No</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">From Account (Dr)</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">To Account (Cr)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Gold Fine (g)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Silver Fine (g)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Cash (₹)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Bank (₹)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Anamat (₹)</th>
                  <th className="py-2.5 px-3">Narration</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap w-28">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400">
                      <span className="inline-block animate-spin text-base mr-2">⏳</span>
                      Loading transfers...
                    </td>
                  </tr>
                ) : filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-10 text-center text-slate-400">
                      <div className="text-2xl mb-1">🔁</div>
                      {searchText || typeFilter !== 'ALL'
                        ? 'No matching transfer found.'
                        : 'No transfer recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((transfer, index) => (
                    <tr
                      key={transfer.id}
                      className="hover:bg-amber-50/30 transition-colors duration-75"
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600 font-medium">
                        {formatDate(transfer.transferDate)}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {transfer.transferNo}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {transfer.fromAccountName}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {transfer.toAccountName}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-800 whitespace-nowrap">
                        {formatWeight(transfer.goldFine)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                        {formatWeight(transfer.silverFine)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                        {formatAmount(transfer.cash)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-800 whitespace-nowrap">
                        {formatAmount(transfer.bank)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-800 whitespace-nowrap">
                        {formatAmount(transfer.anamat)}
                      </td>
                      <td className="py-2 px-3 text-slate-600 max-w-[180px] truncate" title={transfer.narration}>
                        {transfer.narration || '-'}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setAutoPrintTransfer(false)
                              setPrintTransfer(transfer)
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
                            onClick={() => setDeleteTarget(transfer)}
                            disabled={saving || deleting}
                            className="h-6.5 w-6.5 text-[11px] font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-md transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap shadow-2xs active:scale-95 disabled:opacity-50"
                            title="Delete Transfer"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Table Summary Footer */}
              {filteredTransfers.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800 text-[11px] shadow-xs">
                  <tr>
                    <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-600">
                      Total ({filteredTransfers.length} transfers):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-900">
                      {totals.gold > 0 ? totals.gold.toFixed(3) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {totals.silver > 0 ? totals.silver.toFixed(3) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                      {totals.cash > 0 ? formatAmount(totals.cash) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-800">
                      {totals.bank > 0 ? formatAmount(totals.bank) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                      {totals.anamat > 0 ? formatAmount(totals.anamat) : '-'}
                    </td>
                    <td colSpan={2} className="py-2.5 px-3 text-slate-600 text-[10px]">
                      Net Items: {filteredTransfers.length}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Informative Footnote */}
          <div className="p-3 bg-amber-50/50 border-t border-amber-100/60 text-[11px] text-amber-900/80 flex items-center gap-2">
            <span className="text-sm">ℹ️</span>
            <span>
              <strong>Double-Entry Posting Note:</strong> Transfer moves gold/silver fine, cash, bank or anamat balance from one account to another. Posts <strong>Nave (Debit)</strong> on From account and <strong>Jama (Credit)</strong> on To account.
            </span>
          </div>
        </div>
      </div>

      {/* ── CONFIRM DELETE DIALOG ── */}
      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Transfer?"
        message={
          deleteTarget
            ? `Transfer ${deleteTarget.transferNo} from ${deleteTarget.fromAccountName} to ${deleteTarget.toAccountName} will be deleted and its double-entry ledger effect will be reversed.`
            : ''
        }
        confirmText="Delete Transfer"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── PRINT PREVIEW MODAL ── */}
      {printTransfer && (
        <TransferPrintPreview
          transfer={printTransfer}
          autoPrintOnOpen={autoPrintTransfer}
          onClose={() => setPrintTransfer(null)}
        />
      )}
    </div>
  )
}

export default TransferScreen
