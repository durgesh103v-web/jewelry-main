import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

type SettlementForm = {
  settlementDate: string
  accountId: string
  metalType: 'Gold' | 'Silver'
  goldFine: string
  silverFine: string
  cash: string
  bank: string
  anamat: string
  narration: string
}

const today = new Date().toISOString().slice(0, 10)

function createInitialForm(): SettlementForm {
  return {
    settlementDate: today,
    accountId: '',
    metalType: 'Gold',
    goldFine: '',
    silverFine: '',
    cash: '',
    bank: '',
    anamat: '',
    narration: ''
  }
}

function formatWeight(value: number): string {
  if (!value) return '-'
  return Number(value || 0).toFixed(3)
}

function formatAmount(value: number): string {
  if (!value) return '-'
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDate(value: string): string {
  if (!value) return '-'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

const COMMON_NARRATIONS = [
  'Account balance write-off / discount round-off',
  'Metal balance fine conversion settlement',
  'Year-end annual account final settlement',
  'Karigar wastage & balance settlement',
  'Settlement against old bullion contract'
]

function SettlementScreen({ onClose }: { onClose?: () => void }): React.JSX.Element {
  const [form, setForm] = useState<SettlementForm>(() => createInitialForm())
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [settlements, setSettlements] = useState<SettlementRecord[]>([])
  const [settlementNo, setSettlementNo] = useState('')
  const [searchText, setSearchText] = useState('')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'GOLD' | 'SILVER' | 'CASH' | 'BANK'>('ALL')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SettlementRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [printTarget, setPrintTarget] = useState<SettlementRecord | null>(null)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const accountSelectRef = useRef<HTMLSelectElement | null>(null)
  const goldFineRef = useRef<HTMLInputElement | null>(null)
  const silverFineRef = useRef<HTMLInputElement | null>(null)
  const cashRef = useRef<HTMLInputElement | null>(null)
  const bankRef = useRef<HTMLInputElement | null>(null)
  const anamatRef = useRef<HTMLInputElement | null>(null)
  const narrationRef = useRef<HTMLInputElement | null>(null)

  const activeAccounts = useMemo(() => accounts.filter((account) => account.active), [accounts])

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === form.accountId)
  }, [accounts, form.accountId])

  const filteredSettlements = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return settlements.filter((s) => {
      let filterMatch = true
      if (activeFilter === 'GOLD') filterMatch = Number(s.goldFine || 0) > 0
      else if (activeFilter === 'SILVER') filterMatch = Number(s.silverFine || 0) > 0
      else if (activeFilter === 'CASH') filterMatch = Number(s.cash || 0) > 0
      else if (activeFilter === 'BANK') filterMatch = Number(s.bank || 0) > 0

      if (!filterMatch) return false
      if (!keyword) return true

      return (
        s.settlementNo.toLowerCase().includes(keyword) ||
        (s.accountName || '').toLowerCase().includes(keyword) ||
        (s.narration || '').toLowerCase().includes(keyword) ||
        s.settlementDate.toLowerCase().includes(keyword)
      )
    })
  }, [searchText, settlements, activeFilter])

  const filterCounts = useMemo(() => {
    return settlements.reduce(
      (acc, s) => {
        acc.all += 1
        if (Number(s.goldFine || 0) > 0) acc.gold += 1
        if (Number(s.silverFine || 0) > 0) acc.silver += 1
        if (Number(s.cash || 0) > 0) acc.cash += 1
        if (Number(s.bank || 0) > 0) acc.bank += 1
        return acc
      },
      { all: 0, gold: 0, silver: 0, cash: 0, bank: 0 }
    )
  }, [settlements])

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    return settlements.reduce(
      (acc, s) => {
        acc.totalCount += 1
        acc.totalGoldFine += Number(s.goldFine || 0)
        acc.totalSilverFine += Number(s.silverFine || 0)
        acc.totalFinancial += Number(s.cash || 0) + Number(s.bank || 0) + Number(s.anamat || 0)
        return acc
      },
      { totalCount: 0, totalGoldFine: 0, totalSilverFine: 0, totalFinancial: 0 }
    )
  }, [settlements])

  // Filtered Table Totals
  const filteredTotals = useMemo(() => {
    return filteredSettlements.reduce(
      (acc, s) => {
        acc.goldFine += Number(s.goldFine || 0)
        acc.silverFine += Number(s.silverFine || 0)
        acc.cash += Number(s.cash || 0)
        acc.bank += Number(s.bank || 0)
        acc.anamat += Number(s.anamat || 0)
        return acc
      },
      { goldFine: 0, silverFine: 0, cash: 0, bank: 0, anamat: 0 }
    )
  }, [filteredSettlements])

  // Form Live Totals
  const formMetalTotal = useMemo(() => {
    return Number(form.goldFine || 0) + Number(form.silverFine || 0)
  }, [form.goldFine, form.silverFine])

  const formFinancialTotal = useMemo(() => {
    return Number(form.cash || 0) + Number(form.bank || 0) + Number(form.anamat || 0)
  }, [form.cash, form.bank, form.anamat])

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
      const nextNumber = await window.api.settlements.getNextNumber()
      setSettlementNo(nextNumber)
    } catch {
      setSettlementNo('ST-0001')
    }
  }, [])

  const loadSettlements = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.settlements.list()
      setSettlements(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }, [showAlert])

  const loadAccounts = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.accounts.list()
      setAccounts(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }, [showAlert])

  const loadScreenData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await Promise.all([loadAccounts(), loadSettlements(), loadNextNumber()])
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadSettlements, loadNextNumber])

  const handleNew = useCallback((): void => {
    setForm(createInitialForm())
    setAlertMessage('')
    void loadNextNumber()

    window.setTimeout(() => {
      dateInputRef.current?.focus()
    }, 50)
  }, [loadNextNumber])

  const focusNextOnEnter = (
    e: KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    nextElement: HTMLElement | null
  ): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      nextElement?.focus()
    }
  }

  const validateForm = (): boolean => {
    if (!form.settlementDate) {
      showAlert('warning', 'Please select settlement date.')
      dateInputRef.current?.focus()
      return false
    }

    if (!form.accountId) {
      showAlert('warning', 'Please select account / party.')
      accountSelectRef.current?.focus()
      return false
    }

    const total =
      Number(form.goldFine || 0) +
      Number(form.silverFine || 0) +
      Number(form.cash || 0) +
      Number(form.bank || 0) +
      Number(form.anamat || 0)

    if (!Number.isFinite(total) || total <= 0) {
      showAlert('warning', 'Enter at least one settlement amount (Fine, Cash, Bank, or Anamat).')
      goldFineRef.current?.focus()
      return false
    }

    return true
  }

  const handleSave = async (): Promise<void> => {
    if (saving || !validateForm()) return

    try {
      setSaving(true)

      await window.api.settlements.create({
        settlementDate: form.settlementDate,
        accountId: form.accountId,
        metalType: form.metalType,
        goldFine: Number(form.goldFine || 0),
        silverFine: Number(form.silverFine || 0),
        cash: Number(form.cash || 0),
        bank: Number(form.bank || 0),
        anamat: Number(form.anamat || 0),
        narration: form.narration.trim()
      })

      await loadSettlements()
      handleNew()
      showAlert('success', 'Account settlement posted successfully.')
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

  // Global Ctrl+S listener
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
      await window.api.settlements.remove(deleteTarget.id)
      setDeleteTarget(null)
      await loadSettlements()
      showAlert('success', `Settlement ${deleteTarget.settlementNo} deleted & ledger effect reversed.`)
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
            🤝
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                Account Settlement & Adjustments
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100/90 text-amber-900 border border-amber-300">
                🤝 {settlementNo || 'ST-0001'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Manual balance adjustment, discount round-off & metal fine conversion (posts Jama / credit to party)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200/90 transition-colors flex items-center gap-1.5"
            >
              <span>✕</span>
              <span>Close Tab</span>
            </button>
          )}
        </div>
      </header>

      {/* Alert Banner */}
      {alertMessage && (
        <div className="px-3 pt-2">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />
        </div>
      )}

      {/* ── MAIN WORKSPACE CONTAINER ── */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* ── LEFT FORM PANEL (Settlement Entry) ── */}
        <div className="w-96 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0">
          {/* Card Header */}
          <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                New Settlement Voucher
              </h2>
              <p className="text-[10px] text-slate-500">Record fine or cash balance adjustment</p>
            </div>
            <button
              type="button"
              onClick={handleNew}
              disabled={saving}
              className="px-2 py-0.5 text-xs text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded font-medium transition-colors border border-transparent hover:border-amber-200"
            >
              ↺ Reset
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {/* Voucher No & Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Voucher No.
                </label>
                <div className="h-8.5 px-2.5 bg-amber-50/60 border border-amber-200/80 rounded-lg text-amber-900 font-mono font-bold text-xs flex items-center shadow-2xs">
                  {settlementNo || 'ST-0001'}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Date *
                </label>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={form.settlementDate}
                  onChange={(e) => setForm((c) => ({ ...c, settlementDate: e.target.value }))}
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
                  Party / Account *
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
                onKeyDown={(e) => focusNextOnEnter(e, goldFineRef.current)}
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

            {/* Primary Metal Type */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Primary Metal
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setForm((c) => ({ ...c, metalType: 'Gold' }))}
                  className={`py-1 text-[11px] font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                    form.metalType === 'Gold'
                      ? 'bg-amber-500 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🟡</span>
                  <span>Gold</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm((c) => ({ ...c, metalType: 'Silver' }))}
                  className={`py-1 text-[11px] font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                    form.metalType === 'Silver'
                      ? 'bg-slate-700 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>⚪</span>
                  <span>Silver</span>
                </button>
              </div>
            </div>

            {/* Section: Fine Metal Settlement */}
            <div className="p-2.5 rounded-lg border border-amber-200/80 bg-amber-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1">
                  <span>🪙</span>
                  <span>Metal Fine Settlement (Credit / Jama)</span>
                </span>
                {formMetalTotal > 0 && (
                  <span className="text-[10px] font-mono font-bold text-amber-800">
                    Total: {formatWeight(formMetalTotal)}g
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5 uppercase">
                    Gold Fine (g)
                  </label>
                  <div className="relative">
                    <input
                      ref={goldFineRef}
                      type="number"
                      step="0.001"
                      min="0"
                      value={form.goldFine}
                      onChange={(e) => setForm((c) => ({ ...c, goldFine: e.target.value }))}
                      onKeyDown={(e) => focusNextOnEnter(e, silverFineRef.current)}
                      placeholder="0.000"
                      disabled={saving}
                      className="w-full h-8 pr-7 pl-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                      g
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5 uppercase">
                    Silver Fine (g)
                  </label>
                  <div className="relative">
                    <input
                      ref={silverFineRef}
                      type="number"
                      step="0.001"
                      min="0"
                      value={form.silverFine}
                      onChange={(e) => setForm((c) => ({ ...c, silverFine: e.target.value }))}
                      onKeyDown={(e) => focusNextOnEnter(e, cashRef.current)}
                      placeholder="0.000"
                      disabled={saving}
                      className="w-full h-8 pr-7 pl-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                      g
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Financial Settlement */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                  <span>💵</span>
                  <span>Financial Settlement (Credit / Jama)</span>
                </span>
                {formFinancialTotal > 0 && (
                  <span className="text-[10px] font-mono font-bold text-emerald-800">
                    Total: ₹{formatAmount(formFinancialTotal)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5 uppercase">
                    Cash (₹)
                  </label>
                  <input
                    ref={cashRef}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cash}
                    onChange={(e) => setForm((c) => ({ ...c, cash: e.target.value }))}
                    onKeyDown={(e) => focusNextOnEnter(e, bankRef.current)}
                    placeholder="0.00"
                    disabled={saving}
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5 uppercase">
                    Bank (₹)
                  </label>
                  <input
                    ref={bankRef}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.bank}
                    onChange={(e) => setForm((c) => ({ ...c, bank: e.target.value }))}
                    onKeyDown={(e) => focusNextOnEnter(e, anamatRef.current)}
                    placeholder="0.00"
                    disabled={saving}
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5 uppercase">
                    Anamat (₹)
                  </label>
                  <input
                    ref={anamatRef}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.anamat}
                    onChange={(e) => setForm((c) => ({ ...c, anamat: e.target.value }))}
                    onKeyDown={(e) => focusNextOnEnter(e, narrationRef.current)}
                    placeholder="0.00"
                    disabled={saving}
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Quick Narration Chips */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Quick Narration
                </label>
                <span className="text-[10px] text-slate-400">Click to apply</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {COMMON_NARRATIONS.slice(0, 4).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm((c) => ({ ...c, narration: n }))}
                    className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600 rounded-full border border-slate-200 transition-colors truncate max-w-full"
                  >
                    + {n}
                  </button>
                ))}
              </div>
              <input
                ref={narrationRef}
                type="text"
                value={form.narration}
                onChange={(e) => setForm((c) => ({ ...c, narration: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleSave()
                  }
                }}
                placeholder="Reason, discount percentage, bill reference..."
                disabled={saving}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* Form Action Footer */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
            <button
              type="button"
              onClick={handleNew}
              disabled={saving}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 shadow-2xs transition-colors shrink-0"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex-1 py-2 px-3 text-xs font-bold rounded-lg shadow-md shadow-amber-500/20 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] text-white transition-all flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <>
                  <span className="animate-spin text-xs">⏳</span>
                  <span>Posting Settlement...</span>
                </>
              ) : (
                <>
                  <span>+ Save Settlement</span>
                  <span className="text-[10px] opacity-80 font-normal">(Ctrl+S)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL (Register & Analytics) ── */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* Top Search & Filter Bar */}
          <div className="p-2.5 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  activeFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All <span className="text-[10px] text-slate-400">({filterCounts.all})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('GOLD')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  activeFilter === 'GOLD'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gold Fine <span className="text-[10px] opacity-80">({filterCounts.gold})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('SILVER')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  activeFilter === 'SILVER'
                    ? 'bg-slate-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Silver Fine <span className="text-[10px] opacity-80">({filterCounts.silver})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('CASH')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  activeFilter === 'CASH'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cash <span className="text-[10px] opacity-80">({filterCounts.cash})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('BANK')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  activeFilter === 'BANK'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bank <span className="text-[10px] opacity-80">({filterCounts.bank})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  🔍
                </span>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search settlement no, party, remarks..."
                  className="w-full h-8 pl-7 pr-7 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => void loadScreenData()}
                disabled={loading}
                title="Refresh Register"
                className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 shadow-2xs transition-colors flex items-center gap-1"
              >
                <span className={loading ? 'animate-spin' : ''}>🔄</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-4 gap-2.5 p-2.5 bg-slate-50/30 border-b border-slate-200 shrink-0">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Total Settlements
                </span>
                <span className="text-base font-bold text-slate-800">
                  {summaryMetrics.totalCount}{' '}
                  <span className="text-[10px] font-normal text-slate-400">vouchers</span>
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                🤝
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Total Gold Fine
                </span>
                <span className="text-base font-bold text-amber-800 font-mono">
                  {formatWeight(summaryMetrics.totalGoldFine)}{' '}
                  <span className="text-[10px] font-normal text-slate-400">g</span>
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                🟡
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Total Silver Fine
                </span>
                <span className="text-base font-bold text-slate-700 font-mono">
                  {formatWeight(summaryMetrics.totalSilverFine)}{' '}
                  <span className="text-[10px] font-normal text-slate-400">g</span>
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                ⚪
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Total Cash/Bank Value
                </span>
                <span className="text-base font-bold text-emerald-700 font-mono">
                  ₹{formatAmount(summaryMetrics.totalFinancial)}
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                💵
              </div>
            </div>
          </div>

          {/* Table Register */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 w-22">Date</th>
                  <th className="py-2.5 px-3 w-24">Voucher No</th>
                  <th className="py-2.5 px-3">Party Name</th>
                  <th className="py-2.5 px-3 w-16 text-center">Metal</th>
                  <th className="py-2.5 px-3 w-22 text-right">Gold Fine</th>
                  <th className="py-2.5 px-3 w-22 text-right">Silver Fine</th>
                  <th className="py-2.5 px-3 w-22 text-right">Cash (₹)</th>
                  <th className="py-2.5 px-3 w-22 text-right">Bank (₹)</th>
                  <th className="py-2.5 px-3 w-20 text-right">Anamat (₹)</th>
                  <th className="py-2.5 px-3">Narration</th>
                  <th className="py-2.5 px-3 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      <div className="inline-block animate-spin text-lg mb-1">⏳</div>
                      <p className="text-xs">Loading settlements...</p>
                    </td>
                  </tr>
                ) : filteredSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      <div className="text-2xl mb-1">🤝</div>
                      <p className="text-xs font-semibold text-slate-600">No settlements found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {searchText ? 'Try adjusting your search criteria' : 'Create a new settlement voucher on the left'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSettlements.map((s, idx) => (
                    <tr
                      key={s.id}
                      className="hover:bg-amber-50/40 transition-colors group"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                        {formatDate(s.settlementDate)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-900 whitespace-nowrap">
                        {s.settlementNo}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{s.accountName}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {s.metalType === 'Gold' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
                            Gold
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            Silver
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap font-medium text-amber-950">
                        {s.goldFine ? `${formatWeight(s.goldFine)} g` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap font-medium text-slate-700">
                        {s.silverFine ? `${formatWeight(s.silverFine)} g` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap font-semibold text-emerald-800">
                        {s.cash ? `₹${formatAmount(s.cash)}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap text-blue-800">
                        {s.bank ? `₹${formatAmount(s.bank)}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap text-purple-800">
                        {s.anamat ? `₹${formatAmount(s.anamat)}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate text-[11px]">
                        {s.narration || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap w-28">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPrintTarget(s)}
                            title="View Settlement Slip"
                            className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors shadow-2xs"
                          >
                            🖨️ Slip
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(s)}
                            title="Delete Settlement & Reverse Ledger"
                            className="px-1.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition-colors shadow-2xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredSettlements.length > 0 && (
                <tfoot className="bg-slate-100/80 font-bold text-slate-800 border-t-2 border-slate-300 sticky bottom-0 z-10">
                  <tr>
                    <td colSpan={5} className="py-2 px-3 text-right uppercase text-[11px]">
                      Total ({filteredSettlements.length} vouchers):
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-950">
                      {filteredTotals.goldFine > 0 ? `${formatWeight(filteredTotals.goldFine)} g` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">
                      {filteredTotals.silverFine > 0 ? `${formatWeight(filteredTotals.silverFine)} g` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-900">
                      {filteredTotals.cash > 0 ? `₹${formatAmount(filteredTotals.cash)}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-900">
                      {filteredTotals.bank > 0 ? `₹${formatAmount(filteredTotals.bank)}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-purple-900">
                      {filteredTotals.anamat > 0 ? `₹${formatAmount(filteredTotals.anamat)}` : '-'}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Bottom Informational Note */}
          <div className="px-3 py-2 bg-amber-50/60 border-t border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2 shrink-0">
            <span className="text-base shrink-0">ℹ️</span>
            <p>
              <strong>Settlement</strong> records a manual balance adjustment for a single account (write-off, rounding, or agreed conversion).
              It immediately posts a <strong>Jama (Credit)</strong> entry in the party's account ledger across the specified metal fine or cash balances.
            </p>
          </div>
        </div>
      </div>

      {/* ── SETTLEMENT VOUCHER PRINT PREVIEW MODAL ── */}
      {printTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤝</span>
                <span className="font-bold text-sm">Account Settlement Voucher</span>
              </div>
              <button
                type="button"
                onClick={() => setPrintTarget(null)}
                className="text-white/80 hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs" id="printable-settlement-slip">
              {/* Header Details */}
              <div className="border-b border-slate-200 pb-3 text-center">
                <h3 className="font-bold text-base text-slate-800 uppercase tracking-wide">
                  Account Settlement Confirmation
                </h3>
                <p className="text-[11px] text-slate-500">Balance Adjustment & Round-off Voucher</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Voucher No</span>
                  <span className="font-mono font-bold text-amber-900">{printTarget.settlementNo}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase">Date</span>
                  <span className="font-medium">{formatDate(printTarget.settlementDate)}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">Party / Account</span>
                <span className="font-bold text-slate-800 text-sm">{printTarget.accountName}</span>
              </div>

              {/* Metal Fine Breakdown */}
              {(printTarget.goldFine > 0 || printTarget.silverFine > 0) && (
                <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-200 space-y-1">
                  <span className="text-amber-800 block text-[10px] uppercase font-bold font-sans">
                    Metal Fine Settled (Jama Credit)
                  </span>
                  <div className="grid grid-cols-2 text-center font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans">Gold Fine</span>
                      <span className="font-bold text-amber-950">
                        {printTarget.goldFine ? `${formatWeight(printTarget.goldFine)} g` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans">Silver Fine</span>
                      <span className="font-bold text-slate-700">
                        {printTarget.silverFine ? `${formatWeight(printTarget.silverFine)} g` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Breakdown */}
              {(printTarget.cash > 0 || printTarget.bank > 0 || printTarget.anamat > 0) && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-600 block text-[10px] uppercase font-bold font-sans">
                    Financial Balance Settled (Jama Credit)
                  </span>
                  <div className="grid grid-cols-3 text-center font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Cash</span>
                      <span className="font-bold text-emerald-800">
                        {printTarget.cash ? `₹${formatAmount(printTarget.cash)}` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Bank</span>
                      <span className="font-bold text-blue-800">
                        {printTarget.bank ? `₹${formatAmount(printTarget.bank)}` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Anamat</span>
                      <span className="font-bold text-purple-800">
                        {printTarget.anamat ? `₹${formatAmount(printTarget.anamat)}` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {printTarget.narration && (
                <div className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-200">
                  "{printTarget.narration}"
                </div>
              )}

              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-[10px] text-slate-400">
                <div>
                  <div className="border-b border-slate-300 w-3/4 mx-auto mb-1" />
                  <span>Party Signature</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 w-3/4 mx-auto mb-1" />
                  <span>Authorised Signatory</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPrintTarget(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-2xs font-medium"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-lg shadow-md shadow-amber-500/20"
              >
                🖨️ Print Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Settlement Voucher?"
        message={
          deleteTarget
            ? `Settlement ${deleteTarget.settlementNo} for ${deleteTarget.accountName} will be deleted and its ledger effect will be permanently reversed.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default SettlementScreen
