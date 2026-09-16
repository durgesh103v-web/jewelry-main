import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatDate, formatWeight } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'

type WeightScanForm = {
  scanDate: string
  barcode: string
  itemId: string
  grossWeight: string
  netWeight: string
  fine: string
  narration: string
}

const today = new Date().toISOString().slice(0, 10)

function createInitialForm(): WeightScanForm {
  return {
    scanDate: today,
    barcode: '',
    itemId: '',
    grossWeight: '',
    netWeight: '',
    fine: '',
    narration: ''
  }
}



const COMMON_NARRATIONS = [
  'Counter stock physical audit',
  'Weight verification before delivery',
  'Pre-sale scale cross-check',
  'Gross weight deviation check',
  'Karigar job work weight verification'
]

function WeightScanScreen({ onClose }: { onClose?: () => void }): React.JSX.Element {
  const [form, setForm] = useState<WeightScanForm>(() => createInitialForm())
  const [items, setItems] = useState<ItemRecord[]>([])
  const [logs, setLogs] = useState<WeightScanRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GOLD' | 'SILVER' | 'BARCODE'>('ALL')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WeightScanRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const barcodeInputRef = useRef<HTMLInputElement | null>(null)
  const itemSelectRef = useRef<HTMLSelectElement | null>(null)
  const grossWeightRef = useRef<HTMLInputElement | null>(null)
  const netWeightRef = useRef<HTMLInputElement | null>(null)
  const fineRef = useRef<HTMLInputElement | null>(null)
  const narrationRef = useRef<HTMLInputElement | null>(null)

  const activeItems = useMemo(() => items.filter((item) => item.active), [items])

  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === form.itemId)
  }, [items, form.itemId])

  const filteredLogs = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return logs.filter((log) => {
      let filterMatch = true
      const matchedItem = items.find((i) => i.id === log.itemId)
      const metalType = (matchedItem?.metalType || '').toLowerCase()

      if (typeFilter === 'GOLD') {
        filterMatch = metalType.includes('gold')
      } else if (typeFilter === 'SILVER') {
        filterMatch = metalType.includes('silver')
      } else if (typeFilter === 'BARCODE') {
        filterMatch = Boolean(log.barcode && log.barcode.trim())
      }

      if (!filterMatch) return false
      if (!keyword) return true

      return (
        log.barcode.toLowerCase().includes(keyword) ||
        (log.itemName || '').toLowerCase().includes(keyword) ||
        (log.narration || '').toLowerCase().includes(keyword) ||
        log.scanDate.toLowerCase().includes(keyword)
      )
    })
  }, [searchText, logs, typeFilter, items])

  const filterCounts = useMemo(() => {
    return logs.reduce(
      (acc, log) => {
        acc.all += 1
        const matched = items.find((i) => i.id === log.itemId)
        const metal = (matched?.metalType || '').toLowerCase()
        if (metal.includes('gold')) acc.gold += 1
        if (metal.includes('silver')) acc.silver += 1
        if (log.barcode && log.barcode.trim()) acc.barcode += 1
        return acc
      },
      { all: 0, gold: 0, silver: 0, barcode: 0 }
    )
  }, [logs, items])

  const totals = useMemo(() => {
    return filteredLogs.reduce(
      (acc, log) => {
        acc.grossWeight += Number(log.grossWeight || 0)
        acc.netWeight += Number(log.netWeight || 0)
        acc.fine += Number(log.fine || 0)
        return acc
      },
      { grossWeight: 0, netWeight: 0, fine: 0 }
    )
  }, [filteredLogs])

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

  const loadLogs = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.weightScans.list()
      setLogs(Array.isArray(data) ? data : [])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }, [showAlert])

  const loadItems = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.items.list()
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }, [showAlert])

  const loadScreenData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await Promise.all([loadItems(), loadLogs()])
    } finally {
      setLoading(false)
    }
  }, [loadItems, loadLogs])

  const handleNew = useCallback((): void => {
    setForm(createInitialForm())
    setAlertMessage('')

    window.setTimeout(() => {
      barcodeInputRef.current?.focus()
    }, 0)
  }, [])

  const focusNextOnEnter = (
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    nextElement?: HTMLElement | null
  ): void => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    nextElement?.focus()
  }

  const handleBarcodeLookup = useCallback(
    (barcodeValue: string): void => {
      const clean = barcodeValue.trim()
      if (!clean) return

      const cleanLower = clean.toLowerCase()
      const matched = items.find(
        (item) =>
          item.id.toLowerCase() === cleanLower ||
          (item.barcodeValue && item.barcodeValue.toLowerCase() === cleanLower) ||
          (item.itemCode && item.itemCode.toLowerCase() === cleanLower) ||
          item.itemName.toLowerCase() === cleanLower
      )

      if (matched) {
        setForm((prev) => {
          const defaultTanch = Number(matched.defaultTanch || 0)
          const gross = prev.grossWeight || (matched.fixedWeightPerPcs ? String(matched.fixedWeightPerPcs) : '')
          const net = prev.netWeight || gross
          const fineVal = defaultTanch && net ? (Number(net) * defaultTanch) / 100 : Number(net) || 0

          return {
            ...prev,
            barcode: clean,
            itemId: matched.id,
            grossWeight: gross,
            netWeight: net,
            fine: fineVal > 0 ? fineVal.toFixed(3) : prev.fine
          }
        })
        showAlert('success', `Item identified: ${matched.itemName}`)
        window.setTimeout(() => {
          grossWeightRef.current?.focus()
        }, 0)
      } else {
        showAlert('warning', `No catalog item found matching "${clean}". You can manually select an item.`)
      }
    },
    [items, showAlert]
  )

  const handleBarcodeKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (form.barcode.trim()) {
        handleBarcodeLookup(form.barcode)
      } else {
        itemSelectRef.current?.focus()
      }
    }
  }

  const handleItemChange = (itemId: string): void => {
    const item = items.find((i) => i.id === itemId)
    setForm((prev) => {
      if (!item) return { ...prev, itemId: '' }
      const defaultTanch = Number(item.defaultTanch || 0)
      const gross = prev.grossWeight || (item.fixedWeightPerPcs ? String(item.fixedWeightPerPcs) : '')
      const net = prev.netWeight || gross
      const fineVal = defaultTanch && net ? (Number(net) * defaultTanch) / 100 : Number(net) || 0

      return {
        ...prev,
        itemId,
        barcode: prev.barcode || item.barcodeValue || item.itemCode || '',
        grossWeight: gross,
        netWeight: net,
        fine: fineVal > 0 ? fineVal.toFixed(3) : prev.fine
      }
    })
  }

  const handleGrossChange = (val: string): void => {
    setForm((prev) => {
      const net = prev.netWeight ? prev.netWeight : val
      const item = items.find((i) => i.id === prev.itemId)
      const tanch = Number(item?.defaultTanch || 0)
      const fineVal = tanch && net ? (Number(net) * tanch) / 100 : Number(net) || 0

      return {
        ...prev,
        grossWeight: val,
        netWeight: net,
        fine: fineVal > 0 ? fineVal.toFixed(3) : prev.fine
      }
    })
  }

  const handleNetChange = (val: string): void => {
    setForm((prev) => {
      const item = items.find((i) => i.id === prev.itemId)
      const tanch = Number(item?.defaultTanch || 0)
      const fineVal = tanch && val ? (Number(val) * tanch) / 100 : Number(val) || 0

      return {
        ...prev,
        netWeight: val,
        fine: fineVal > 0 ? fineVal.toFixed(3) : prev.fine
      }
    })
  }

  const handleAutoCalculateFine = (): void => {
    const net = Number(form.netWeight) || 0
    if (net <= 0) {
      showAlert('warning', 'Please enter Net Weight first.')
      return
    }
    const tanch = Number(selectedItem?.defaultTanch || 0)
    const fineVal = tanch ? (net * tanch) / 100 : net
    setForm((prev) => ({ ...prev, fine: fineVal.toFixed(3) }))
    showAlert('success', `Fine weight calculated (${tanch ? `${tanch}% tunch` : '100%'}): ${fineVal.toFixed(3)}g`)
  }

  const validateForm = (): boolean => {
    if (!form.scanDate) {
      showAlert('warning', 'Please select scan date.')
      dateInputRef.current?.focus()
      return false
    }

    if (!form.barcode.trim() && !form.itemId) {
      showAlert('warning', 'Please scan/enter a barcode or select an item from the list.')
      barcodeInputRef.current?.focus()
      return false
    }

    const gross = Number(form.grossWeight || 0)
    const net = Number(form.netWeight || 0)

    if (gross <= 0 && net <= 0) {
      showAlert('warning', 'Please enter Gross Weight or Net Weight from the scale.')
      grossWeightRef.current?.focus()
      return false
    }

    return true
  }

  const handleSave = async (): Promise<void> => {
    if (saving || !validateForm()) return

    try {
      setSaving(true)

      const payload = {
        scanDate: form.scanDate,
        barcode: form.barcode.trim(),
        itemId: form.itemId,
        grossWeight: Number(form.grossWeight || 0),
        netWeight: Number(form.netWeight || form.grossWeight || 0),
        fine: Number(form.fine || 0),
        narration: form.narration.trim()
      }

      await window.api.weightScans.create(payload)

      await loadLogs()
      handleNew()
      showAlert('success', 'Weight scan reading recorded successfully.')
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
      await window.api.weightScans.remove(deleteTarget.id)
      setDeleteTarget(null)
      await loadLogs()
      showAlert('success', 'Weight scan reading deleted successfully.')
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

  const stoneWeightDiff = useMemo(() => {
    const gross = Number(form.grossWeight || 0)
    const net = Number(form.netWeight || 0)
    if (gross > 0 && net > 0 && gross > net) {
      return (gross - net).toFixed(3)
    }
    return null
  }, [form.grossWeight, form.netWeight])

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* ── TOP HEADER BAR ── */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 flex items-center justify-center text-lg shadow-2xs font-bold transition-colors">
            ⚖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                Weight Scan & Scale Verification
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100/90 text-amber-900 border border-amber-300">
                ⚖️ Scale Audit
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Audit and record physical weighing scale readings against barcode items for inventory verification
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
        {/* ── LEFT PANEL: SCALE ENTRY FORM (370px) ── */}
        <div className="w-full lg:w-[370px] xl:w-[390px] bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col shrink-0 overflow-y-auto">
          {/* Card Title */}
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-3">
            <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              New Scale Reading
            </h2>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 flex-1">
            {/* Scan Date & Barcode Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Scan Date *
                </label>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={form.scanDate}
                  onChange={(e) => setForm((c) => ({ ...c, scanDate: e.target.value }))}
                  onKeyDown={(e) => focusNextOnEnter(e, barcodeInputRef.current)}
                  disabled={saving}
                  className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Barcode / Tag
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400">🏷️</span>
                  <input
                    ref={barcodeInputRef}
                    value={form.barcode}
                    onChange={(e) => setForm((c) => ({ ...c, barcode: e.target.value }))}
                    onKeyDown={handleBarcodeKeyDown}
                    placeholder="Scan & Enter..."
                    disabled={saving}
                    className="w-full h-8.5 pl-7 pr-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Item Dropdown */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Ornament / Item *
              </label>
              <select
                ref={itemSelectRef}
                value={form.itemId}
                onChange={(e) => handleItemChange(e.target.value)}
                onKeyDown={(e) => focusNextOnEnter(e, grossWeightRef.current)}
                disabled={saving}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              >
                <option value="">Select Item from Catalog</option>
                {activeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.itemName} • {item.metalType} {item.stampName ? `(${item.stampName})` : ''}
                  </option>
                ))}
              </select>

              {/* Item Details Info Card */}
              {selectedItem && (
                <div className="mt-1.5 p-2 bg-amber-50/50 border border-amber-200/80 rounded-lg flex items-center justify-between text-[11px] text-amber-900">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-amber-800">{selectedItem.metalType}</span>
                    {selectedItem.stampName && (
                      <span className="text-slate-600">• {selectedItem.stampName}</span>
                    )}
                  </div>
                  {selectedItem.defaultTanch ? (
                    <span className="font-mono font-semibold text-amber-800">
                      Tanch: {selectedItem.defaultTanch}%
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Scale Readings Box */}
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Scale Readings (Grams)
                </span>
                {stoneWeightDiff && (
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100/60 px-1.5 py-0.2 rounded border border-amber-200">
                    Less Wt: {stoneWeightDiff}g
                  </span>
                )}
              </div>

              {/* Gross Weight & Net Weight Row */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    📦 Gross Weight (g) *
                  </label>
                  <input
                    ref={grossWeightRef}
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.grossWeight}
                    onChange={(e) => handleGrossChange(e.target.value)}
                    onKeyDown={(e) => focusNextOnEnter(e, netWeightRef.current)}
                    placeholder="0.000"
                    disabled={saving}
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    ⚖️ Net Weight (g) *
                  </label>
                  <input
                    ref={netWeightRef}
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.netWeight}
                    onChange={(e) => handleNetChange(e.target.value)}
                    onKeyDown={(e) => focusNextOnEnter(e, fineRef.current)}
                    placeholder="0.000"
                    disabled={saving}
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  />
                </div>
              </div>

              {/* Fine Weight Row */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-amber-800">
                    🪙 Fine Weight (g)
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoCalculateFine}
                    className="text-[10px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer underline"
                  >
                    ⚡ Auto Calculate Fine
                  </button>
                </div>
                <input
                  ref={fineRef}
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.fine}
                  onChange={(e) => setForm((c) => ({ ...c, fine: e.target.value }))}
                  onKeyDown={(e) => focusNextOnEnter(e, narrationRef.current)}
                  placeholder="0.000"
                  disabled={saving}
                  className="w-full h-8.5 px-2.5 text-xs bg-white border border-amber-200 rounded-lg text-amber-900 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                />
              </div>
            </div>

            {/* Narration & Suggestions */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Remarks / Purpose
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
                placeholder="e.g. Counter physical audit... (Enter to save)"
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
                  <span className="animate-spin text-sm">⏳</span> Recording...
                </>
              ) : (
                <>
                  <span>＋</span> Save Scale Reading
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL: AUDIT REGISTER (FLEX-1) ── */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          {/* Section Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Weight Scan Audit Register
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                ({filteredLogs.length} of {logs.length} readings)
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
                  onClick={() => setTypeFilter('BARCODE')}
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    typeFilter === 'BARCODE'
                      ? 'bg-blue-100/90 text-blue-900 shadow-2xs border-blue-300 font-bold'
                      : 'border-transparent text-blue-700 hover:text-blue-900 hover:bg-blue-50'
                  }`}
                >
                  With Barcode ({filterCounts.barcode})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search barcode, item, note..."
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
                title="Reload Readings"
              >
                <span className={loading ? 'animate-spin' : ''}>🔄</span> Refresh
              </button>
            </div>
          </div>

          {/* Metric Totals Cards */}
          <div className="grid grid-cols-4 gap-3 px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Total Readings
                </span>
                <strong className="text-sm font-mono font-bold text-slate-800">
                  {filteredLogs.length}
                </strong>
              </div>
              <span className="text-base font-bold">⚖️</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase block">
                  Total Gross Wt
                </span>
                <strong className="text-sm font-mono font-bold text-slate-800">
                  {totals.grossWeight.toFixed(3)} g
                </strong>
              </div>
              <span className="text-base font-bold">📦</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                  Total Net Wt
                </span>
                <strong className="text-sm font-mono font-bold text-emerald-800">
                  {totals.netWeight.toFixed(3)} g
                </strong>
              </div>
              <span className="text-base text-emerald-600 font-bold">✨</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase block">
                  Total Fine Wt
                </span>
                <strong className="text-sm font-mono font-bold text-amber-900">
                  {totals.fine.toFixed(3)} g
                </strong>
              </div>
              <span className="text-base text-amber-600 font-bold">🪙</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[460px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center whitespace-nowrap">Sr</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Barcode / Tag</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Item Description</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Gross Wt (g)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Net Wt (g)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Fine Wt (g)</th>
                  <th className="py-2.5 px-3">Remarks / Purpose</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap w-20">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      <span className="inline-block animate-spin text-base mr-2">⏳</span>
                      Loading scale readings...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <div className="text-2xl mb-1">⚖️</div>
                      {searchText || typeFilter !== 'ALL'
                        ? 'No matching weight scan log found.'
                        : 'No weight scan log recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => (
                    <tr
                      key={log.id}
                      className="hover:bg-amber-50/30 transition-colors duration-75"
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600 font-medium">
                        {formatDate(log.scanDate)}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {log.barcode ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                            {log.barcode}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {log.itemName || '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {formatWeight(log.grossWeight)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                        {formatWeight(log.netWeight)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-800 whitespace-nowrap">
                        {formatWeight(log.fine)}
                      </td>
                      <td className="py-2 px-3 text-slate-600 max-w-[200px] truncate" title={log.narration}>
                        {log.narration || '-'}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(log)}
                          disabled={saving || deleting}
                          className="h-6.5 w-6.5 text-[11px] font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-md transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap shadow-2xs active:scale-95 disabled:opacity-50"
                          title="Delete Reading"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Table Summary Footer */}
              {filteredLogs.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800 text-[11px] shadow-xs">
                  <tr>
                    <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-600">
                      Total ({filteredLogs.length} readings):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                      {totals.grossWeight.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                      {totals.netWeight.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-900">
                      {totals.fine.toFixed(3)}
                    </td>
                    <td colSpan={2} className="py-2.5 px-3 text-slate-600 text-[10px]">
                      Net Count: {filteredLogs.length}
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
              <strong>Physical Audit Note:</strong> Weight Scan is an audit log of items weighed on the digital scale for stock verification. It acts as an audit trail and does not post financial ledger debt or alter general stock quantities.
            </span>
          </div>
        </div>
      </div>

      {/* ── CONFIRM DELETE DIALOG ── */}
      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Weight Scan Reading?"
        message={
          deleteTarget
            ? `Weight scan reading for ${deleteTarget.itemName || deleteTarget.barcode || 'item'} (${formatWeight(
                deleteTarget.netWeight
              )}g) dated ${formatDate(deleteTarget.scanDate)} will be deleted.`
            : ''
        }
        confirmText="Delete Reading"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default WeightScanScreen
