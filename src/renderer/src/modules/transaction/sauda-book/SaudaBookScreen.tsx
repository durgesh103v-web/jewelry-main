import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatDate, formatAmount, formatWeight } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'

type SaudaForm = {
  saudaDate: string
  accountId: string
  metalType: 'Gold' | 'Silver'
  transactionType: 'BUY' | 'SELL'
  fine: string
  rate: string
  deliveryDate: string
  narration: string
}

const today = new Date().toISOString().slice(0, 10)

function createInitialForm(): SaudaForm {
  return {
    saudaDate: today,
    accountId: '',
    metalType: 'Gold',
    transactionType: 'BUY',
    fine: '',
    rate: '',
    deliveryDate: '',
    narration: ''
  }
}




const COMMON_NARRATIONS = [
  'Bullion rate lock booking',
  'Customer gold advance booking',
  'Hedge rate cut with refiner',
  'Forward contract booking',
  'Market rate fix for workshop casting'
]

function SaudaBookScreen({ onClose }: { onClose?: () => void }): React.JSX.Element {
  const [form, setForm] = useState<SaudaForm>(() => createInitialForm())
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [entries, setEntries] = useState<SaudaRecord[]>([])
  const [saudaNo, setSaudaNo] = useState('')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED' | 'BUY' | 'SELL'>('ALL')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [closeTarget, setCloseTarget] = useState<SaudaRecord | null>(null)
  const [closing, setClosing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SaudaRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [printTarget, setPrintTarget] = useState<SaudaRecord | null>(null)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const accountSelectRef = useRef<HTMLSelectElement | null>(null)
  const fineInputRef = useRef<HTMLInputElement | null>(null)
  const rateInputRef = useRef<HTMLInputElement | null>(null)
  const deliveryDateRef = useRef<HTMLInputElement | null>(null)
  const narrationInputRef = useRef<HTMLInputElement | null>(null)

  const activeAccounts = useMemo(() => accounts.filter((account) => account.active), [accounts])

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === form.accountId)
  }, [accounts, form.accountId])

  const filteredEntries = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return entries.filter((entry) => {
      let filterMatch = true
      if (statusFilter === 'OPEN') filterMatch = entry.status === 'OPEN'
      else if (statusFilter === 'CLOSED') filterMatch = entry.status === 'CLOSED'
      else if (statusFilter === 'BUY') filterMatch = entry.transactionType === 'BUY'
      else if (statusFilter === 'SELL') filterMatch = entry.transactionType === 'SELL'

      if (!filterMatch) return false
      if (!keyword) return true

      return (
        entry.saudaNo.toLowerCase().includes(keyword) ||
        (entry.accountName || '').toLowerCase().includes(keyword) ||
        (entry.narration || '').toLowerCase().includes(keyword) ||
        entry.saudaDate.toLowerCase().includes(keyword) ||
        (entry.metalType || '').toLowerCase().includes(keyword)
      )
    })
  }, [searchText, entries, statusFilter])

  const filterCounts = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc.all += 1
        if (entry.status === 'OPEN') acc.open += 1
        if (entry.status === 'CLOSED') acc.closed += 1
        if (entry.transactionType === 'BUY') acc.buy += 1
        if (entry.transactionType === 'SELL') acc.sell += 1
        return acc
      },
      { all: 0, open: 0, closed: 0, buy: 0, sell: 0 }
    )
  }, [entries])

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        if (entry.status === 'OPEN') {
          acc.openCount += 1
          if (entry.metalType === 'Gold') {
            acc.openGoldFine += Number(entry.fine || 0)
          } else if (entry.metalType === 'Silver') {
            acc.openSilverFine += Number(entry.fine || 0)
          }
          acc.openAmount += Number(entry.amount || 0)
        }
        acc.totalAmount += Number(entry.amount || 0)
        return acc
      },
      { openCount: 0, openGoldFine: 0, openSilverFine: 0, openAmount: 0, totalAmount: 0 }
    )
  }, [entries])

  // Filtered Table Totals
  const filteredTotals = useMemo(() => {
    return filteredEntries.reduce(
      (acc, entry) => {
        acc.fine += Number(entry.fine || 0)
        acc.amount += Number(entry.amount || 0)
        return acc
      },
      { fine: 0, amount: 0 }
    )
  }, [filteredEntries])

  // Live Deal Amount
  const liveDealAmount = useMemo(() => {
    const fineVal = Number(form.fine || 0)
    const rateVal = Number(form.rate || 0)
    if (fineVal > 0 && rateVal > 0) {
      return Math.round(fineVal * rateVal * 100) / 100
    }
    return 0
  }, [form.fine, form.rate])

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
      const nextNumber = await window.api.sauda.getNextNumber()
      setSaudaNo(nextNumber)
    } catch {
      setSaudaNo('SD-0001')
    }
  }, [])

  const loadEntries = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.sauda.list()
      setEntries(data)
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
      await Promise.all([loadAccounts(), loadEntries(), loadNextNumber()])
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadEntries, loadNextNumber])

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
    if (!form.saudaDate) {
      showAlert('warning', 'Please select sauda date.')
      dateInputRef.current?.focus()
      return false
    }

    if (!form.accountId) {
      showAlert('warning', 'Please select account / party.')
      accountSelectRef.current?.focus()
      return false
    }

    if (!Number(form.fine || 0) || Number(form.fine) <= 0) {
      showAlert('warning', 'Enter fine weight greater than 0.')
      fineInputRef.current?.focus()
      return false
    }

    if (!Number(form.rate || 0) || Number(form.rate) <= 0) {
      showAlert('warning', 'Enter rate greater than 0.')
      rateInputRef.current?.focus()
      return false
    }

    return true
  }

  const handleSave = async (): Promise<void> => {
    if (saving || !validateForm()) return

    try {
      setSaving(true)

      await window.api.sauda.create({
        saudaDate: form.saudaDate,
        accountId: form.accountId,
        metalType: form.metalType,
        transactionType: form.transactionType,
        fine: Number(form.fine || 0),
        rate: Number(form.rate || 0),
        deliveryDate: form.deliveryDate,
        narration: form.narration.trim()
      })

      await loadEntries()
      handleNew()
      showAlert('success', 'Sauda deal booked successfully.')
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

  const handleConfirmClose = async (): Promise<void> => {
    if (!closeTarget) return

    try {
      setClosing(true)
      await window.api.sauda.close(closeTarget.id)
      setCloseTarget(null)
      await loadEntries()
      showAlert('success', `Sauda deal ${closeTarget.saudaNo} marked as Closed.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setClosing(false)
    }
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await window.api.sauda.remove(deleteTarget.id)
      setDeleteTarget(null)
      await loadEntries()
      showAlert('success', `Sauda entry ${deleteTarget.saudaNo} deleted successfully.`)
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
            📜
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                Sauda Book & Forward Contracts
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100/90 text-amber-900 border border-amber-300">
                📖 {saudaNo || 'SD-0001'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Forward metal rate-lock booking register • Deals are fulfilled through Purchase/Sale entries
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
        {/* ── LEFT FORM PANEL (Booking Entry) ── */}
        <div className="w-96 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0">
          {/* Card Header */}
          <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                New Sauda Booking
              </h2>
              <p className="text-[10px] text-slate-500">Lock in forward rate and quantity</p>
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
            {/* Sauda Deal No & Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Deal No.
                </label>
                <div className="h-8.5 px-2.5 bg-amber-50/60 border border-amber-200/80 rounded-lg text-amber-900 font-mono font-bold text-xs flex items-center shadow-2xs">
                  {saudaNo || 'SD-0001'}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Sauda Date *
                </label>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={form.saudaDate}
                  onChange={(e) => setForm((c) => ({ ...c, saudaDate: e.target.value }))}
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
                onKeyDown={(e) => focusNextOnEnter(e, fineInputRef.current)}
                disabled={saving}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              >
                <option value="">Select Account (Party / Customer / Refiner)</option>
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

            {/* Metal Type & Transaction Type */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Metal Type
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

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setForm((c) => ({ ...c, transactionType: 'BUY' }))}
                    className={`py-1 text-[11px] font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                      form.transactionType === 'BUY'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>📥</span>
                    <span>BUY</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((c) => ({ ...c, transactionType: 'SELL' }))}
                    className={`py-1 text-[11px] font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                      form.transactionType === 'SELL'
                        ? 'bg-amber-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>📤</span>
                    <span>SELL</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Fine Weight & Rate per Gram */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                    Fine Wt (g) *
                  </label>
                  <span className="text-[10px] text-slate-400">Pure weight</span>
                </div>
                <div className="relative">
                  <input
                    ref={fineInputRef}
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={form.fine}
                    onChange={(e) => setForm((c) => ({ ...c, fine: e.target.value }))}
                    onKeyDown={(e) => focusNextOnEnter(e, rateInputRef.current)}
                    placeholder="0.000"
                    disabled={saving}
                    className="w-full h-8.5 pr-8 pl-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">
                    g
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                    Rate (₹/g) *
                  </label>
                  <span className="text-[10px] text-slate-400">Lock rate</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">
                    ₹
                  </span>
                  <input
                    ref={rateInputRef}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.rate}
                    onChange={(e) => setForm((c) => ({ ...c, rate: e.target.value }))}
                    onKeyDown={(e) => focusNextOnEnter(e, deliveryDateRef.current)}
                    placeholder="0.00"
                    disabled={saving}
                    className="w-full h-8.5 pl-6 pr-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Live Amount Calculation Card */}
            <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wide text-amber-800 block">
                  Calculated Booking Amount
                </span>
                <span className="text-[10px] text-amber-600/80">
                  {form.fine && form.rate ? `${form.fine} g × ₹${form.rate}/g` : 'Enter fine weight & rate'}
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs text-amber-700 font-semibold mr-1">₹</span>
                <span className="text-base font-bold text-amber-900">
                  {formatAmount(liveDealAmount)}
                </span>
              </div>
            </div>

            {/* Delivery Target Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Delivery / Target Date
                </label>
                <span className="text-[10px] text-slate-400">Optional</span>
              </div>
              <input
                ref={deliveryDateRef}
                type="date"
                value={form.deliveryDate}
                onChange={(e) => setForm((c) => ({ ...c, deliveryDate: e.target.value }))}
                onKeyDown={(e) => focusNextOnEnter(e, narrationInputRef.current)}
                disabled={saving}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              />
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
                ref={narrationInputRef}
                type="text"
                value={form.narration}
                onChange={(e) => setForm((c) => ({ ...c, narration: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleSave()
                  }
                }}
                placeholder="Contract reference, remarks, purpose..."
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
                  <span>Saving Deal...</span>
                </>
              ) : (
                <>
                  <span>+ Save Sauda Deal</span>
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
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All <span className="text-[10px] text-slate-400">({filterCounts.all})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('OPEN')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  statusFilter === 'OPEN'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Open <span className="text-[10px] opacity-80">({filterCounts.open})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('CLOSED')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  statusFilter === 'CLOSED'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Closed <span className="text-[10px] opacity-80">({filterCounts.closed})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('BUY')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  statusFilter === 'BUY'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Buy <span className="text-[10px] opacity-80">({filterCounts.buy})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('SELL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  statusFilter === 'SELL'
                    ? 'bg-purple-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sell <span className="text-[10px] opacity-80">({filterCounts.sell})</span>
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
                  placeholder="Search deal no, party, remarks..."
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
                  Open Deals
                </span>
                <span className="text-base font-bold text-amber-700">
                  {summaryMetrics.openCount}{' '}
                  <span className="text-[10px] font-normal text-slate-400">active</span>
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                ⏳
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Open Gold Fine
                </span>
                <span className="text-base font-bold text-slate-800 font-mono">
                  {formatWeight(summaryMetrics.openGoldFine)}{' '}
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
                  Open Silver Fine
                </span>
                <span className="text-base font-bold text-slate-800 font-mono">
                  {formatWeight(summaryMetrics.openSilverFine)}{' '}
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
                  Total Deal Value
                </span>
                <span className="text-base font-bold text-emerald-700 font-mono">
                  ₹{formatAmount(summaryMetrics.totalAmount)}
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
                  <th className="py-2.5 px-3 w-24">Deal No</th>
                  <th className="py-2.5 px-3">Party Name</th>
                  <th className="py-2.5 px-3 w-20 text-center">Type</th>
                  <th className="py-2.5 px-3 w-18 text-center">Metal</th>
                  <th className="py-2.5 px-3 w-24 text-right">Fine (g)</th>
                  <th className="py-2.5 px-3 w-24 text-right">Rate (₹/g)</th>
                  <th className="py-2.5 px-3 w-28 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3 w-22 text-center">Delivery</th>
                  <th className="py-2.5 px-3 w-20 text-center">Status</th>
                  <th className="py-2.5 px-3 w-40 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      <div className="inline-block animate-spin text-lg mb-1">⏳</div>
                      <p className="text-xs">Loading Sauda entries...</p>
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      <div className="text-2xl mb-1">📜</div>
                      <p className="text-xs font-semibold text-slate-600">No sauda entries found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {searchText ? 'Try adjusting your search criteria' : 'Create a new forward deal on the left'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry, idx) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-amber-50/40 transition-colors group"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                        {formatDate(entry.saudaDate)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-900 whitespace-nowrap">
                        {entry.saudaNo}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{entry.accountName}</div>
                        {entry.narration && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">
                            {entry.narration}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {entry.transactionType === 'BUY' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            📥 BUY
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            📤 SELL
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {entry.metalType === 'Gold' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
                            🟡 Gold
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            ⚪ Silver
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium whitespace-nowrap">
                        {formatWeight(entry.fine)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        ₹{formatAmount(entry.rate)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{formatAmount(entry.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500 whitespace-nowrap">
                        {formatDate(entry.deliveryDate)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {entry.status === 'OPEN' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            OPEN
                          </span>
                        ) : entry.status === 'CLOSED' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ CLOSED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            CANCELLED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap w-40">
                        <div className="flex items-center justify-center gap-1">
                          {entry.status === 'OPEN' && (
                            <button
                              type="button"
                              onClick={() => setCloseTarget(entry)}
                              title="Mark Deal as Closed / Fulfilled"
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors shadow-2xs flex items-center gap-0.5"
                            >
                              <span>✓</span>
                              <span>Close</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setPrintTarget(entry)}
                            title="View Deal Slip"
                            className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors shadow-2xs"
                          >
                            🖨️ Slip
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(entry)}
                            title="Delete Sauda Deal"
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
              {filteredEntries.length > 0 && (
                <tfoot className="bg-slate-100/80 font-bold text-slate-800 border-t-2 border-slate-300 sticky bottom-0 z-10">
                  <tr>
                    <td colSpan={6} className="py-2 px-3 text-right uppercase text-[11px]">
                      Total ({filteredEntries.length} deals):
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {formatWeight(filteredTotals.fine)} g
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500">
                      -
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-900">
                      ₹{formatAmount(filteredTotals.amount)}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Bottom Informational Note */}
          <div className="px-3 py-2 bg-amber-50/60 border-t border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2 shrink-0">
            <span className="text-base shrink-0">ℹ️</span>
            <p>
              <strong>Sauda Book</strong> records a forward rate-lock deal at a fixed rate for future delivery.
              It is a booking record only — no inventory stock or financial ledger is posted here.
              Mark it <strong>Closed</strong> once the contract is settled through an actual Purchase or Sale invoice entry.
            </p>
          </div>
        </div>
      </div>

      {/* ── DEAL SLIP PRINT PREVIEW MODAL ── */}
      {printTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📜</span>
                <span className="font-bold text-sm">Sauda Deal Voucher</span>
              </div>
              <button
                type="button"
                onClick={() => setPrintTarget(null)}
                className="text-white/80 hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs" id="printable-sauda-slip">
              {/* Header Details */}
              <div className="border-b border-slate-200 pb-3 text-center">
                <h3 className="font-bold text-base text-slate-800 uppercase tracking-wide">
                  Bullion Forward Rate Confirmation
                </h3>
                <p className="text-[11px] text-slate-500">Rate Lock Contract Slip</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Deal Number</span>
                  <span className="font-mono font-bold text-amber-900">{printTarget.saudaNo}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase">Deal Date</span>
                  <span className="font-medium">{formatDate(printTarget.saudaDate)}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">Party / Account</span>
                <span className="font-bold text-slate-800 text-sm">{printTarget.accountName}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2.5 bg-amber-50/50 rounded-lg border border-amber-200 text-center font-mono">
                <div>
                  <span className="text-amber-800 block text-[10px] uppercase font-sans">Type</span>
                  <span className="font-bold text-slate-900">
                    {printTarget.transactionType} ({printTarget.metalType})
                  </span>
                </div>
                <div>
                  <span className="text-amber-800 block text-[10px] uppercase font-sans">Fine Wt</span>
                  <span className="font-bold text-slate-900">{formatWeight(printTarget.fine)} g</span>
                </div>
                <div>
                  <span className="text-amber-800 block text-[10px] uppercase font-sans">Locked Rate</span>
                  <span className="font-bold text-slate-900">₹{formatAmount(printTarget.rate)}/g</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-900 text-white rounded-lg flex items-center justify-between font-mono">
                <span className="text-xs uppercase font-sans tracking-wide text-slate-300">
                  Total Deal Value
                </span>
                <span className="text-base font-bold text-amber-400">
                  ₹{formatAmount(printTarget.amount)}
                </span>
              </div>

              {printTarget.deliveryDate && (
                <div className="flex items-center justify-between text-[11px] text-slate-600 px-1">
                  <span>Target Delivery Date:</span>
                  <span className="font-semibold">{formatDate(printTarget.deliveryDate)}</span>
                </div>
              )}

              {printTarget.narration && (
                <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-200">
                  "{printTarget.narration}"
                </div>
              )}

              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-[10px] text-slate-400">
                <div>
                  <div className="border-b border-slate-300 w-3/4 mx-auto mb-1" />
                  <span>Customer / Broker Signature</span>
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
        open={Boolean(closeTarget)}
        title="Mark Sauda Deal as Closed?"
        message={
          closeTarget
            ? `Deal ${closeTarget.saudaNo} for ${closeTarget.accountName} (${formatWeight(closeTarget.fine)}g ${closeTarget.metalType}) will be marked as fulfilled/closed.`
            : ''
        }
        confirmText="Confirm Close"
        cancelText="Cancel"
        type="info"
        loading={closing}
        onConfirm={() => void handleConfirmClose()}
        onCancel={() => setCloseTarget(null)}
      />

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Sauda Deal?"
        message={
          deleteTarget
            ? `Are you sure you want to delete Sauda Deal ${deleteTarget.saudaNo}? This action cannot be undone.`
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

export default SaudaBookScreen
