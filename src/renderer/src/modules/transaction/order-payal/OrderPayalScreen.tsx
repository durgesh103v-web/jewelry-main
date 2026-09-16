import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatDate, formatWeight } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'

type OrderPayalForm = {
  orderDate: string
  accountId: string
  itemId: string
  pcs: string
  weight: string
  deliveryDate: string
  narration: string
}

const today = new Date().toISOString().slice(0, 10)

function createInitialForm(): OrderPayalForm {
  return {
    orderDate: today,
    accountId: '',
    itemId: '',
    pcs: '1',
    weight: '',
    deliveryDate: '',
    narration: ''
  }
}



const COMMON_SPECIFICATIONS = [
  'Size 10.5 inch with ghungroo bells',
  'Double hook locking mechanism',
  'Antique rhodium polish finish',
  '925 hallmarked silver stamp',
  'Urgent delivery for wedding',
  'Light-weight hollow casting'
]

function OrderPayalScreen({ onClose }: { onClose?: () => void }): React.JSX.Element {
  const [form, setForm] = useState<OrderPayalForm>(() => createInitialForm())
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [items, setItems] = useState<ItemRecord[]>([])
  const [orders, setOrders] = useState<OrderPayalRecord[]>([])
  const [orderNo, setOrderNo] = useState('')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DELIVERED'>('ALL')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deliverTarget, setDeliverTarget] = useState<OrderPayalRecord | null>(null)
  const [delivering, setDelivering] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<OrderPayalRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [printTarget, setPrintTarget] = useState<OrderPayalRecord | null>(null)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const accountSelectRef = useRef<HTMLSelectElement | null>(null)
  const itemSelectRef = useRef<HTMLSelectElement | null>(null)
  const pcsInputRef = useRef<HTMLInputElement | null>(null)
  const weightInputRef = useRef<HTMLInputElement | null>(null)
  const deliveryDateRef = useRef<HTMLInputElement | null>(null)
  const narrationInputRef = useRef<HTMLInputElement | null>(null)

  const activeAccounts = useMemo(() => accounts.filter((account) => account.active), [accounts])
  const activeItems = useMemo(() => items.filter((item) => item.active), [items])

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === form.accountId)
  }, [accounts, form.accountId])

  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === form.itemId)
  }, [items, form.itemId])

  const filteredOrders = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return orders.filter((order) => {
      let filterMatch = true
      if (statusFilter === 'PENDING') filterMatch = order.status === 'PENDING'
      else if (statusFilter === 'DELIVERED') filterMatch = order.status === 'DELIVERED'

      if (!filterMatch) return false
      if (!keyword) return true

      return (
        order.orderNo.toLowerCase().includes(keyword) ||
        (order.accountName || '').toLowerCase().includes(keyword) ||
        (order.itemName || '').toLowerCase().includes(keyword) ||
        (order.narration || '').toLowerCase().includes(keyword) ||
        order.orderDate.toLowerCase().includes(keyword) ||
        (order.deliveryDate || '').toLowerCase().includes(keyword)
      )
    })
  }, [searchText, orders, statusFilter])

  const filterCounts = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.all += 1
        if (order.status === 'PENDING') acc.pending += 1
        if (order.status === 'DELIVERED') acc.delivered += 1
        return acc
      },
      { all: 0, pending: 0, delivered: 0 }
    )
  }, [orders])

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        if (order.status === 'PENDING') {
          acc.pendingCount += 1
          acc.pendingPcs += Number(order.pcs || 0)
          acc.pendingWeight += Number(order.weight || 0)
        } else if (order.status === 'DELIVERED') {
          acc.deliveredCount += 1
        }
        acc.totalPcs += Number(order.pcs || 0)
        acc.totalWeight += Number(order.weight || 0)
        return acc
      },
      { pendingCount: 0, pendingPcs: 0, pendingWeight: 0, deliveredCount: 0, totalPcs: 0, totalWeight: 0 }
    )
  }, [orders])

  // Filtered Table Totals
  const filteredTotals = useMemo(() => {
    return filteredOrders.reduce(
      (acc, order) => {
        acc.pcs += Number(order.pcs || 0)
        acc.weight += Number(order.weight || 0)
        return acc
      },
      { pcs: 0, weight: 0 }
    )
  }, [filteredOrders])

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
      const nextNumber = await window.api.orderPayal.getNextNumber()
      setOrderNo(nextNumber)
    } catch {
      setOrderNo('OP-0001')
    }
  }, [])

  const loadOrders = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.orderPayal.list()
      setOrders(data)
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

  const loadItems = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.items.list()
      setItems(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }, [showAlert])

  const loadScreenData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await Promise.all([loadAccounts(), loadItems(), loadOrders(), loadNextNumber()])
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadItems, loadOrders, loadNextNumber])

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
    if (!form.orderDate) {
      showAlert('warning', 'Please select order booking date.')
      dateInputRef.current?.focus()
      return false
    }

    if (!form.accountId) {
      showAlert('warning', 'Please select customer / party.')
      accountSelectRef.current?.focus()
      return false
    }

    if (!form.itemId) {
      showAlert('warning', 'Please select jewelry item.')
      itemSelectRef.current?.focus()
      return false
    }

    if (Number(form.pcs || 0) <= 0 && Number(form.weight || 0) <= 0) {
      showAlert('warning', 'Please specify either pieces or estimated weight.')
      pcsInputRef.current?.focus()
      return false
    }

    return true
  }

  const handleSave = async (): Promise<void> => {
    if (saving || !validateForm()) return

    try {
      setSaving(true)

      await window.api.orderPayal.create({
        orderDate: form.orderDate,
        accountId: form.accountId,
        itemId: form.itemId,
        pcs: Number(form.pcs || 0),
        weight: Number(form.weight || 0),
        deliveryDate: form.deliveryDate,
        narration: form.narration.trim()
      })

      await loadOrders()
      handleNew()
      showAlert('success', 'Custom jewelry order booked successfully.')
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

  const handleConfirmDeliver = async (): Promise<void> => {
    if (!deliverTarget) return

    try {
      setDelivering(true)
      await window.api.orderPayal.markDelivered(deliverTarget.id)
      setDeliverTarget(null)
      await loadOrders()
      showAlert('success', `Order ${deliverTarget.orderNo} marked as Delivered.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDelivering(false)
    }
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await window.api.orderPayal.remove(deleteTarget.id)
      setDeleteTarget(null)
      await loadOrders()
      showAlert('success', `Order ${deleteTarget.orderNo} deleted successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  // Quick delivery date setter
  const setQuickDelivery = (days: number): void => {
    const target = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
    setForm((c) => ({ ...c, deliveryDate: target }))
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
            📿
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                Order Payal & Custom Orders
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100/90 text-amber-900 border border-amber-300">
                ✨ {orderNo || 'OP-0001'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Customer advance order booking for anklets, payal & custom crafted jewellery items
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
                New Custom Order
              </h2>
              <p className="text-[10px] text-slate-500">Book customer specifications & target</p>
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
            {/* Order No & Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Order No.
                </label>
                <div className="h-8.5 px-2.5 bg-amber-50/60 border border-amber-200/80 rounded-lg text-amber-900 font-mono font-bold text-xs flex items-center shadow-2xs">
                  {orderNo || 'OP-0001'}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Order Date *
                </label>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={form.orderDate}
                  onChange={(e) => setForm((c) => ({ ...c, orderDate: e.target.value }))}
                  onKeyDown={(e) => focusNextOnEnter(e, accountSelectRef.current)}
                  disabled={saving}
                  className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
                />
              </div>
            </div>

            {/* Customer / Account Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Customer / Party *
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
                onKeyDown={(e) => focusNextOnEnter(e, itemSelectRef.current)}
                disabled={saving}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              >
                <option value="">Select Customer (Party / Retail Client)</option>
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
                      {selectedAccount.groupName || 'Customer'}
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

            {/* Item Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Jewelry Item / Category *
                </label>
                {selectedItem?.metalType && (
                  <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-medium">
                    {selectedItem.metalType}
                  </span>
                )}
              </div>
              <select
                ref={itemSelectRef}
                value={form.itemId}
                onChange={(e) => setForm((c) => ({ ...c, itemId: e.target.value }))}
                onKeyDown={(e) => focusNextOnEnter(e, pcsInputRef.current)}
                disabled={saving}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              >
                <option value="">Select Item (Payal, Anklet, Kada, Ring...)</option>
                {activeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.itemName}
                    {item.metalType ? ` • ${item.metalType}` : ''}
                  </option>
                ))}
              </select>

              {/* Selected Item Info Card */}
              {selectedItem && (
                <div className="mt-1.5 p-2 bg-amber-50/40 border border-amber-200/60 rounded-lg flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📿</span>
                    <span className="font-semibold text-slate-800">{selectedItem.itemName}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    {selectedItem.metalType || 'Gold / Silver'}
                  </span>
                </div>
              )}
            </div>

            {/* Pcs & Estimated Weight */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                    Pieces (Pcs)
                  </label>
                  <span className="text-[10px] text-slate-400">Qty</span>
                </div>
                <input
                  ref={pcsInputRef}
                  type="number"
                  min="1"
                  step="1"
                  value={form.pcs}
                  onChange={(e) => setForm((c) => ({ ...c, pcs: e.target.value }))}
                  onKeyDown={(e) => focusNextOnEnter(e, weightInputRef.current)}
                  placeholder="1"
                  disabled={saving}
                  className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                />
                {/* Quick Pcs Chips */}
                <div className="flex gap-1 mt-1">
                  {[1, 2, 4, 10].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setForm((c) => ({ ...c, pcs: String(qty) }))}
                      className="flex-1 py-0.5 text-[10px] bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600 rounded border border-slate-200 font-mono transition-colors"
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                    Est. Weight (g)
                  </label>
                  <span className="text-[10px] text-slate-400">Approx</span>
                </div>
                <div className="relative">
                  <input
                    ref={weightInputRef}
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={form.weight}
                    onChange={(e) => setForm((c) => ({ ...c, weight: e.target.value }))}
                    onKeyDown={(e) => focusNextOnEnter(e, deliveryDateRef.current)}
                    placeholder="0.000"
                    disabled={saving}
                    className="w-full h-8.5 pr-8 pl-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">
                    g
                  </span>
                </div>
              </div>
            </div>

            {/* Promised Delivery Date & Quick Shortcuts */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Target Delivery Date
                </label>
                <span className="text-[10px] text-slate-400">Customer promise</span>
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
              {/* Quick Delivery Shortcuts */}
              <div className="flex gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setQuickDelivery(7)}
                  className="flex-1 py-0.5 text-[10px] bg-slate-50 hover:bg-amber-100 hover:text-amber-800 text-slate-600 rounded border border-slate-200 transition-colors"
                >
                  +7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDelivery(14)}
                  className="flex-1 py-0.5 text-[10px] bg-slate-50 hover:bg-amber-100 hover:text-amber-800 text-slate-600 rounded border border-slate-200 transition-colors"
                >
                  +14 Days
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDelivery(30)}
                  className="flex-1 py-0.5 text-[10px] bg-slate-50 hover:bg-amber-100 hover:text-amber-800 text-slate-600 rounded border border-slate-200 transition-colors"
                >
                  +1 Month
                </button>
              </div>
            </div>

            {/* Quick Specification Chips */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Quick Specifications
                </label>
                <span className="text-[10px] text-slate-400">Click to append</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {COMMON_SPECIFICATIONS.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() =>
                      setForm((c) => ({
                        ...c,
                        narration: c.narration ? `${c.narration}, ${spec}` : spec
                      }))
                    }
                    className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600 rounded-full border border-slate-200 transition-colors truncate max-w-full"
                  >
                    + {spec}
                  </button>
                ))}
              </div>
              <textarea
                ref={narrationInputRef as unknown as React.RefObject<HTMLTextAreaElement>}
                rows={3}
                value={form.narration}
                onChange={(e) => setForm((c) => ({ ...c, narration: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    void handleSave()
                  }
                }}
                placeholder="Size, design style, polish type, special locking, bell details..."
                disabled={saving}
                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs resize-none"
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
                  <span>Saving Order...</span>
                </>
              ) : (
                <>
                  <span>+ Save Customer Order</span>
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
                onClick={() => setStatusFilter('PENDING')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending <span className="text-[10px] opacity-80">({filterCounts.pending})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('DELIVERED')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  statusFilter === 'DELIVERED'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Delivered <span className="text-[10px] opacity-80">({filterCounts.delivered})</span>
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
                  placeholder="Search order no, customer, item, specs..."
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
                  Pending Orders
                </span>
                <span className="text-base font-bold text-amber-700">
                  {summaryMetrics.pendingCount}{' '}
                  <span className="text-[10px] font-normal text-slate-400">in-crafting</span>
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                ⏳
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Pending Pcs
                </span>
                <span className="text-base font-bold text-slate-800 font-mono">
                  {summaryMetrics.pendingPcs}{' '}
                  <span className="text-[10px] font-normal text-slate-400">pcs</span>
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                📦
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Pending Approx Wt
                </span>
                <span className="text-base font-bold text-slate-800 font-mono">
                  {formatWeight(summaryMetrics.pendingWeight)}{' '}
                  <span className="text-[10px] font-normal text-slate-400">g</span>
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                ⚖️
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Delivered Orders
                </span>
                <span className="text-base font-bold text-emerald-700 font-mono">
                  {summaryMetrics.deliveredCount}{' '}
                  <span className="text-[10px] font-normal text-slate-400">fulfilled</span>
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                ✅
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
                  <th className="py-2.5 px-3 w-24">Order No</th>
                  <th className="py-2.5 px-3">Customer / Account</th>
                  <th className="py-2.5 px-3">Jewelry Item</th>
                  <th className="py-2.5 px-3 w-16 text-center">Pcs</th>
                  <th className="py-2.5 px-3 w-24 text-right">Approx Wt (g)</th>
                  <th className="py-2.5 px-3 w-24 text-center">Target Delivery</th>
                  <th className="py-2.5 px-3 w-22 text-center">Status</th>
                  <th className="py-2.5 px-3 w-40 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <div className="inline-block animate-spin text-lg mb-1">⏳</div>
                      <p className="text-xs">Loading customer orders...</p>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <div className="text-2xl mb-1">📿</div>
                      <p className="text-xs font-semibold text-slate-600">No custom orders found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {searchText ? 'Try adjusting your search criteria' : 'Book a new customer order on the left'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, idx) => (
                    <tr
                      key={order.id}
                      className="hover:bg-amber-50/40 transition-colors group"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                        {formatDate(order.orderDate)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-900 whitespace-nowrap">
                        {order.orderNo}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{order.accountName}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{order.itemName}</div>
                        {order.narration && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">
                            {order.narration}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {order.pcs || 1}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium whitespace-nowrap">
                        {formatWeight(order.weight)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-medium text-slate-600">
                        {formatDate(order.deliveryDate)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {order.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            PENDING
                          </span>
                        ) : order.status === 'DELIVERED' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ DELIVERED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            CANCELLED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap w-40">
                        <div className="flex items-center justify-center gap-1">
                          {order.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => setDeliverTarget(order)}
                              title="Mark Order as Delivered"
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors shadow-2xs flex items-center gap-0.5"
                            >
                              <span>✓</span>
                              <span>Deliver</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setPrintTarget(order)}
                            title="View Job Sheet Slip"
                            className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors shadow-2xs"
                          >
                            🖨️ Slip
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(order)}
                            title="Delete Order"
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
              {filteredOrders.length > 0 && (
                <tfoot className="bg-slate-100/80 font-bold text-slate-800 border-t-2 border-slate-300 sticky bottom-0 z-10">
                  <tr>
                    <td colSpan={5} className="py-2 px-3 text-right uppercase text-[11px]">
                      Total ({filteredOrders.length} orders):
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">
                      {filteredTotals.pcs} pcs
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {formatWeight(filteredTotals.weight)} g
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
              <strong>Order Payal</strong> books customer advance custom crafting orders.
              It is an order planning record only — no inventory stock or financial ledger debt is posted here.
              Mark it <strong>Delivered</strong> once the crafted ornaments are handed over and billed.
            </p>
          </div>
        </div>
      </div>

      {/* ── ORDER JOB SHEET PRINT PREVIEW MODAL ── */}
      {printTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📿</span>
                <span className="font-bold text-sm">Customer Order Job Sheet</span>
              </div>
              <button
                type="button"
                onClick={() => setPrintTarget(null)}
                className="text-white/80 hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs" id="printable-order-slip">
              {/* Header Details */}
              <div className="border-b border-slate-200 pb-3 text-center">
                <h3 className="font-bold text-base text-slate-800 uppercase tracking-wide">
                  Customer Order Confirmation Slip
                </h3>
                <p className="text-[11px] text-slate-500">Custom Anklet / Jewellery Crafting Order</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Order Number</span>
                  <span className="font-mono font-bold text-amber-900">{printTarget.orderNo}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase">Order Date</span>
                  <span className="font-medium">{formatDate(printTarget.orderDate)}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">Customer / Client</span>
                <span className="font-bold text-slate-800 text-sm">{printTarget.accountName}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2.5 bg-amber-50/50 rounded-lg border border-amber-200 text-center font-mono">
                <div>
                  <span className="text-amber-800 block text-[10px] uppercase font-sans">Item</span>
                  <span className="font-bold text-slate-900">{printTarget.itemName}</span>
                </div>
                <div>
                  <span className="text-amber-800 block text-[10px] uppercase font-sans">Pieces</span>
                  <span className="font-bold text-slate-900">{printTarget.pcs || 1} pcs</span>
                </div>
                <div>
                  <span className="text-amber-800 block text-[10px] uppercase font-sans">Est. Weight</span>
                  <span className="font-bold text-slate-900">{formatWeight(printTarget.weight)} g</span>
                </div>
              </div>

              {printTarget.deliveryDate && (
                <div className="p-2 bg-slate-900 text-white rounded-lg flex items-center justify-between font-mono">
                  <span className="text-xs uppercase font-sans tracking-wide text-slate-300">
                    Promise Delivery Date
                  </span>
                  <span className="text-sm font-bold text-amber-400">
                    {formatDate(printTarget.deliveryDate)}
                  </span>
                </div>
              )}

              {printTarget.narration && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">
                    Customer Custom Specifications
                  </span>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                    "{printTarget.narration}"
                  </p>
                </div>
              )}

              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-[10px] text-slate-400">
                <div>
                  <div className="border-b border-slate-300 w-3/4 mx-auto mb-1" />
                  <span>Customer Signature</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 w-3/4 mx-auto mb-1" />
                  <span>Authorised Jeweller</span>
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
                🖨️ Print Job Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <AppConfirmDialog
        open={Boolean(deliverTarget)}
        title="Mark Order as Delivered?"
        message={
          deliverTarget
            ? `Order ${deliverTarget.orderNo} for ${deliverTarget.accountName} (${deliverTarget.itemName}, ${deliverTarget.pcs || 1} pcs) will be marked as Delivered.`
            : ''
        }
        confirmText="Confirm Delivery"
        cancelText="Cancel"
        type="info"
        loading={delivering}
        onConfirm={() => void handleConfirmDeliver()}
        onCancel={() => setDeliverTarget(null)}
      />

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Order?"
        message={
          deleteTarget
            ? `Are you sure you want to delete Order ${deleteTarget.orderNo}? This action cannot be undone.`
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

export default OrderPayalScreen
