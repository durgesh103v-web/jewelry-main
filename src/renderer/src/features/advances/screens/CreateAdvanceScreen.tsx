import React, { useState, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import type { CustomerRecord } from '@shared/types/customer'
import type { CustomerOrderRecord } from '../../orders/types'
import type { CustomerAdvanceRecord, CustomerAdvancePayload, PaymentMethod, OrderAdvanceSummary } from '../types'
import { CustomerSelector } from '../../sales/components/CustomerSelector'
import { formatCurrency, formatDate } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

export interface CreateAdvanceScreenProps {
  onBack: () => void
  onSuccess: (advance: CustomerAdvanceRecord) => void
  initialCustomerId?: string
  initialOrderId?: string
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; description: string }[] = [
  { value: 'UPI', label: 'UPI / QR', icon: '📱', description: 'GPay, PhonePe, Paytm, BHIM' },
  { value: 'BANK', label: 'Bank Transfer', icon: '🏦', description: 'NEFT, RTGS, IMPS' },
  { value: 'CASH', label: 'Cash', icon: '💵', description: 'Showroom Cash Desk' },
  { value: 'CARD', label: 'Card (POS)', icon: '💳', description: 'Credit / Debit Card swipe' },
  { value: 'CHEQUE', label: 'Cheque', icon: '📄', description: 'Bank clearing cheque' },
  { value: 'OTHER', label: 'Other Mode', icon: '🔄', description: 'Voucher / Cust Adjustment' }
]

const QUICK_AMOUNT_PRESETS = [10000, 25000, 50000, 100000, 200000]

export const CreateAdvanceScreen: React.FC<CreateAdvanceScreenProps> = ({
  onBack,
  onSuccess,
  initialCustomerId,
  initialOrderId
}) => {
  const [advanceNumber, setAdvanceNumber] = useState<string>('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null)
  const [advanceDate, setAdvanceDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [amount, setAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI')
  const [paymentReference, setPaymentReference] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Order Linkage State
  const [customerOrders, setCustomerOrders] = useState<CustomerOrderRecord[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrderId || '')
  const [orderBalanceSummary, setOrderBalanceSummary] = useState<OrderAdvanceSummary | null>(null)
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false)

  // Loading & Submission State
  const [isLoadingNumber, setIsLoadingNumber] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Double-submission guard
  const submitLockRef = useRef<boolean>(false)

  // Fetch next advance voucher number
  useEffect(() => {
    let active = true
    const loadNextNumber = async () => {
      setIsLoadingNumber(true)
      try {
        if (window.api.advances && typeof window.api.advances.getNextNumber === 'function') {
          const nextNum = await window.api.advances.getNextNumber()
          if (active && nextNum) setAdvanceNumber(nextNum)
        }
      } catch (err) {
        console.error('Failed to fetch next advance number:', err)
      } finally {
        if (active) setIsLoadingNumber(false)
      }
    }

    void loadNextNumber()

    // Handle initial preselected customer if passed
    if (initialCustomerId) {
      const loadCustomer = async () => {
        try {
          if (window.api.customers && typeof window.api.customers.getById === 'function') {
            const cust = await window.api.customers.getById(initialCustomerId)
            if (active && cust) {
              setSelectedCustomer(cust)
            }
          }
        } catch (err) {
          console.error('Failed to load initial customer:', err)
        }
      }
      void loadCustomer()
    }

    if (initialOrderId) {
      setSelectedOrderId(initialOrderId)
    }

    return () => {
      active = false
    }
  }, [initialCustomerId, initialOrderId])

  // Load customer orders whenever selected customer changes
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerOrders([])
      setSelectedOrderId('')
      setOrderBalanceSummary(null)
      return
    }

    let active = true
    const loadOrders = async () => {
      setIsLoadingOrders(true)
      try {
        if (window.api.orders && typeof window.api.orders.list === 'function') {
          const orders = await window.api.orders.list({ customerId: selectedCustomer.id })
          if (active) {
            const activeOrders = (orders || []).filter(
              (o) => o.status !== 'CANCELLED' && o.status !== 'COMPLETED'
            )
            setCustomerOrders(activeOrders)

            if (initialOrderId && activeOrders.some((o) => o.id === initialOrderId)) {
              setSelectedOrderId(initialOrderId)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load customer orders:', err)
      } finally {
        if (active) setIsLoadingOrders(false)
      }
    }

    void loadOrders()
    return () => {
      active = false
    }
  }, [selectedCustomer, initialOrderId])

  // Load order balance summary when an order is selected
  useEffect(() => {
    if (!selectedOrderId) {
      setOrderBalanceSummary(null)
      return
    }

    let active = true
    const loadOrderBalance = async () => {
      try {
        if (window.api.advances && typeof window.api.advances.getOrderBalance === 'function') {
          const summary = await window.api.advances.getOrderBalance(selectedOrderId)
          if (active) {
            setOrderBalanceSummary(summary)
          }
        }
      } catch (err) {
        console.error('Failed to load order advance balance summary:', err)
      }
    }

    void loadOrderBalance()
    return () => {
      active = false
    }
  }, [selectedOrderId])

  const selectedOrder = customerOrders.find((o) => o.id === selectedOrderId)

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (submitLockRef.current || isSubmitting) return

    setErrorMessage(null)

    if (!selectedCustomer) {
      setErrorMessage('Please select a customer for this advance receipt.')
      return
    }

    const accountId = selectedCustomer.accountId || (selectedCustomer as any).account_id
    if (!accountId) {
      setErrorMessage(
        'The selected customer does not have an associated financial account. Please check customer master record.'
      )
      return
    }

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Please enter a valid advance amount greater than zero.')
      return
    }

    if (paymentMethod !== 'CASH' && !paymentReference.trim()) {
      if (['BANK', 'UPI', 'CARD', 'CHEQUE'].includes(paymentMethod)) {
        setErrorMessage(`Payment reference (UTR / Cheque / Auth #) is required for ${paymentMethod} advance.`)
        return
      }
    }

    submitLockRef.current = true
    setIsSubmitting(true)

    try {
      const payload: CustomerAdvancePayload = {
        advanceNumber: advanceNumber || undefined,
        customerId: selectedCustomer.id,
        accountId,
        orderId: selectedOrderId || undefined,
        amount: numericAmount,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        advanceDate,
        notes: notes.trim() || undefined
      }

      const created = await window.api.advances.receive(payload)
      onSuccess(created)
    } catch (err) {
      console.error('Failed to record customer advance:', err)
      setErrorMessage(getFriendlyErrorMessage(err))
      submitLockRef.current = false
    } finally {
      setIsSubmitting(false)
    }
  }

  const numericAmount = parseFloat(amount) || 0

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-app,#f8fafc)] text-slate-900 overflow-hidden select-none font-sans">
      {/* ── Top Header Bar ── */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-3 shadow-2xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Issue Customer Advance Receipt
            </h1>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200">
              {isLoadingNumber ? '...' : advanceNumber || 'NEW'}
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline ml-2">
              Record customer advance credit, link custom jewellery orders &amp; issue receipt
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="h-8 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors border border-slate-300 shadow-2xs cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting || !selectedCustomer || numericAmount <= 0}
            onClick={() => void handleSubmit()}
            className="h-8 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{ color: '#ffffff' }}
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="!text-white font-bold" style={{ color: '#ffffff' }}>Saving Receipt...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="!text-white font-bold" style={{ color: '#ffffff' }}>Save &amp; Print Receipt</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Scrollable Page Body ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-600 hover:text-rose-800 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 2 Columns: Input Controls */}
            <div className="lg:col-span-2 space-y-4">
              {/* 1. Customer Selection Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span>👤</span>
                    <span>Customer / Party Selection</span>
                    <span className="text-rose-500">*</span>
                  </h3>
                  {selectedCustomer && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      ✓ Verified
                    </span>
                  )}
                </div>

                <CustomerSelector
                  customer={selectedCustomer}
                  onSelectCustomer={(c) => {
                    setSelectedCustomer(c)
                    setSelectedOrderId('')
                  }}
                />

                {selectedCustomer && (
                  <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-lg">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Customer Code</span>
                      <span className="font-mono font-bold text-slate-900">{selectedCustomer.customerCode}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Mobile</span>
                      <span className="font-mono font-semibold text-slate-900">{selectedCustomer.mobile || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Account Ledger</span>
                      <span className="font-semibold text-slate-900 truncate block">
                        {selectedCustomer.accountName || 'Primary Customer Ledger'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Custom Order Linkage Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span>📋</span>
                    <span>Custom Order Linkage (Optional)</span>
                  </h3>
                  <span className="text-xs text-slate-500">
                    {isLoadingOrders
                      ? 'Loading orders...'
                      : selectedCustomer
                      ? `${customerOrders.length} active order(s)`
                      : 'Select customer first'}
                  </span>
                </div>

                {selectedCustomer ? (
                  customerOrders.length > 0 ? (
                    <div className="space-y-3">
                      <select
                        value={selectedOrderId}
                        onChange={(e) => {
                          const val = e.target.value
                          setSelectedOrderId(val)
                          if (val) {
                            const found = customerOrders.find((o) => o.id === val)
                            if (found && !amount) {
                              const bal = (found.roundedTotal || found.grandTotal) - (found.advanceAmount || 0)
                              if (bal > 0) {
                                setAmount(bal.toString())
                              }
                            }
                          }
                        }}
                        className="w-full h-8 px-2.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium"
                      >
                        <option value="">-- General Unlinked Advance (Usable across POS &amp; future orders) --</option>
                        {customerOrders.map((ord) => (
                          <option key={ord.id} value={ord.id}>
                            Order #{ord.orderNumber} (Booked: {formatDate(ord.orderDate)} | Total: {formatCurrency(ord.grandTotal)} | Status: {ord.status})
                          </option>
                        ))}
                      </select>

                      {/* Selected Order Insight Banner */}
                      {selectedOrder && (
                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2 text-xs">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-amber-900">
                              Order #{selectedOrder.orderNumber} Details
                            </span>
                            <span className="text-amber-800 font-mono">
                              Total: {formatCurrency(selectedOrder.roundedTotal || selectedOrder.grandTotal)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200/80 text-[11px]">
                            <div>
                              <span className="text-slate-500 block">Items / Weight</span>
                              <span className="font-semibold text-slate-900">
                                {selectedOrder.totalPcs} pcs | {selectedOrder.totalGrossWeight}g
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Already Allocated</span>
                              <span className="font-semibold text-emerald-700">
                                {formatCurrency(orderBalanceSummary?.totalAdvanceAllocated ?? selectedOrder.advanceAmount ?? 0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Remaining Due</span>
                              <span className="font-bold text-amber-800 font-mono">
                                {formatCurrency(
                                  orderBalanceSummary?.balanceDue ??
                                    Math.max(0, (selectedOrder.roundedTotal || selectedOrder.grandTotal) - (selectedOrder.advanceAmount || 0))
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Delivery Date</span>
                              <span className="font-semibold text-slate-900">
                                {selectedOrder.expectedDeliveryDate ? formatDate(selectedOrder.expectedDeliveryDate) : 'Not specified'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                      ℹ️ Customer currently has no pending custom orders. This deposit will be recorded as a general credit.
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Select a customer above to view active custom orders eligible for direct advance allocation.
                  </p>
                )}
              </div>

              {/* 3. Payment Mode & Amount Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span>💵</span>
                    <span>Deposit Amount &amp; Payment Method</span>
                    <span className="text-rose-500">*</span>
                  </h3>
                </div>

                {/* Amount & Date Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Advance Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 text-sm font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full h-9 pl-7 pr-3 text-sm font-bold text-slate-900 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>

                    {/* Quick Amount Presets */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {QUICK_AMOUNT_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAmount(preset.toString())}
                          className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors cursor-pointer"
                        >
                          +{formatCurrency(preset, false)}
                        </button>
                      ))}
                      {orderBalanceSummary && orderBalanceSummary.balanceDue > 0 && (
                        <button
                          type="button"
                          onClick={() => setAmount(orderBalanceSummary.balanceDue.toString())}
                          className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded border border-amber-300 transition-colors cursor-pointer"
                        >
                          Full Due ({formatCurrency(orderBalanceSummary.balanceDue)})
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Receipt Voucher Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={advanceDate}
                      onChange={(e) => setAdvanceDate(e.target.value)}
                      className="w-full h-9 px-2.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Payment Method Grid */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Payment Method <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((method) => {
                      const isSelected = paymentMethod === method.value
                      return (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setPaymentMethod(method.value)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/80 shadow-2xs ring-1 ring-amber-500/50'
                              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className="text-lg">{method.icon}</span>
                          <div className="min-w-0">
                            <div className={`text-xs font-bold ${isSelected ? 'text-amber-900' : 'text-slate-900'}`}>
                              {method.label}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {method.description}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Dynamic Reference Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Transaction Reference / UTR / Cheque Details
                    {paymentMethod !== 'CASH' && <span className="text-rose-500"> *</span>}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      paymentMethod === 'CASH'
                        ? 'Optional cash memo / teller voucher ref'
                        : paymentMethod === 'CHEQUE'
                        ? 'Cheque # & issuing bank name (e.g. CHQ#128941 / HDFC Bank)'
                        : paymentMethod === 'UPI'
                        ? 'UPI Transaction ID / 12-digit UTR (e.g. UPI/42918012901)'
                        : paymentMethod === 'CARD'
                        ? 'Card last 4 digits & approval code (e.g. VISA 8812 Auth#9901)'
                        : 'NEFT / RTGS Reference Number'
                    }
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium"
                  />
                </div>

                {/* Notes & Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Special Remarks / Internal Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Advance token for wedding delivery, customer requested hallmark inspection on receipt..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Live Summary & Action Confirmation */}
            <div className="space-y-4">
              {/* Financial Snapshot Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Advance Receipt Summary
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Live accounting breakdown &amp; credit impact
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Customer:</span>
                    <span className="font-bold text-slate-900 text-right truncate max-w-[160px]">
                      {selectedCustomer ? selectedCustomer.name : 'Not selected'}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Voucher Date:</span>
                    <span className="font-semibold text-slate-900">{formatDate(advanceDate)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Payment Mode:</span>
                    <span className="font-bold text-slate-900">{paymentMethod}</span>
                  </div>

                  {paymentReference && (
                    <div className="flex justify-between text-slate-600">
                      <span>Reference:</span>
                      <span className="font-mono text-slate-900 truncate max-w-[140px]">
                        {paymentReference}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-2">
                    <span>Allocation Target:</span>
                    <span className="font-bold text-amber-800 text-right">
                      {selectedOrder ? `Order #${selectedOrder.orderNumber}` : 'General Ledger Credit'}
                    </span>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex justify-between items-center text-xs font-bold text-amber-900 pt-2">
                    <span>Advance Total:</span>
                    <span className="text-base font-mono font-extrabold text-amber-800">
                      {formatCurrency(numericAmount)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isSubmitting || !selectedCustomer || numericAmount <= 0}
                  className="w-full h-10 px-4 rounded-lg font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  style={{ color: '#ffffff' }}
                >
                  {isSubmitting ? (
                    'Recording Advance...'
                  ) : (
                    <>
                      <span>✓</span>
                      <span>Save &amp; Print Advance Receipt</span>
                    </>
                  )}
                </button>
              </div>

              {/* Accounting Safeguards Notice */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2 text-slate-600">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <span>🛡️</span>
                  <span>GST &amp; Accounting Safeguards</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                  <li>Advance credits customer ledger liability under GST Rule 49.</li>
                  <li>Linked order advances automatically adjust at POS billing checkout.</li>
                  <li>Unlinked deposits remain available for one-click settlement on future bills.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
