import React, { useState, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import type { CustomerRecord } from '@shared/types/customer'
import type { CustomerOrderRecord } from '../../orders/types'
import type { CustomerAdvanceRecord, CustomerAdvancePayload, PaymentMethod, OrderAdvanceSummary } from '../types'
import { CustomerSelector } from '../../sales/components/CustomerSelector'
import { formatCurrency, formatDate } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

interface NewAdvanceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (advance: CustomerAdvanceRecord) => void
  initialCustomerId?: string
  initialOrderId?: string
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'CASH', label: 'Cash', icon: '💵' },
  { value: 'BANK', label: 'Bank Transfer', icon: '🏦' },
  { value: 'UPI', label: 'UPI / QR', icon: '📱' },
  { value: 'CARD', label: 'Debit / Credit Card', icon: '💳' },
  { value: 'CHEQUE', label: 'Cheque', icon: '📄' },
  { value: 'OTHER', label: 'Other Mode', icon: '🔄' }
]

export const NewAdvanceModal: React.FC<NewAdvanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCustomerId,
  initialOrderId
}) => {
  const [advanceNumber, setAdvanceNumber] = useState<string>('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null)
  const [advanceDate, setAdvanceDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [amount, setAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
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

  // Initialize or reset form
  useEffect(() => {
    if (!isOpen) {
      setSelectedCustomer(null)
      setCustomerOrders([])
      setSelectedOrderId('')
      setOrderBalanceSummary(null)
      setAmount('')
      setPaymentMethod('CASH')
      setPaymentReference('')
      setNotes('')
      setErrorMessage(null)
      submitLockRef.current = false
      return
    }

    let active = true

    const loadNextNumber = async () => {
      setIsLoadingNumber(true)
      try {
        if (window.api.advances && typeof window.api.advances.getNextNumber === 'function') {
          const nextNum = await window.api.advances.getNextNumber()
          if (active) setAdvanceNumber(nextNum)
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
  }, [isOpen, initialCustomerId, initialOrderId])

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
            // Filter only active orders (exclude CANCELLED and COMPLETED)
            const activeOrders = (orders || []).filter(
              (o) => o.status !== 'CANCELLED' && o.status !== 'COMPLETED'
            )
            setCustomerOrders(activeOrders)

            // If an initialOrderId was set and matches an active order, keep it; otherwise check validity
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
        'The selected customer does not have an associated financial account. Please check the customer master record.'
      )
      return
    }

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Please enter a valid advance amount greater than zero.')
      return
    }

    if (paymentMethod !== 'CASH' && !paymentReference.trim()) {
      // Warning / requirement for audit trail
      if (['BANK', 'UPI', 'CARD', 'CHEQUE'].includes(paymentMethod)) {
        setErrorMessage(`Payment reference (UTR / Cheque / Auth #) is required for ${paymentMethod} advances.`)
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
      onClose()
    } catch (err) {
      console.error('Failed to record customer advance:', err)
      setErrorMessage(getFriendlyErrorMessage(err))
      submitLockRef.current = false
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const selectedOrder = customerOrders.find((o) => o.id === selectedOrderId)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
      <div className="bg-background text-foreground max-w-2xl w-full max-h-[92vh] flex flex-col rounded-xl shadow-2xl border border-border overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Record Customer Advance Receipt</h2>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-primary/10 text-primary font-semibold border border-primary/20">
                {isLoadingNumber ? '...' : advanceNumber || 'Auto-generated on Save'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Issue an authoritative advance receipt voucher and credit customer liability
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none p-1 rounded-md hover:bg-accent"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg text-xs flex justify-between items-center">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-600 hover:text-rose-800 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Customer Selection */}
          <div className="space-y-1.5 p-4 rounded-xl border border-border bg-card">
            <label className="block text-xs font-semibold text-foreground">
              Customer <span className="text-rose-500">*</span>
            </label>
            <CustomerSelector
              customer={selectedCustomer}
              onSelectCustomer={(c) => {
                setSelectedCustomer(c)
                setSelectedOrderId('')
              }}
            />
            {selectedCustomer && (
              <div className="mt-2 pt-2 border-t border-border flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Code: </span>
                  {selectedCustomer.customerCode}
                </div>
                {selectedCustomer.mobile && (
                  <div>
                    <span className="font-medium text-foreground">Mobile: </span>
                    {selectedCustomer.mobile}
                  </div>
                )}
                {selectedCustomer.accountName && (
                  <div>
                    <span className="font-medium text-foreground">Account: </span>
                    {selectedCustomer.accountName}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Optional Order Linkage */}
          {selectedCustomer && (
            <div className="space-y-2 p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-foreground">
                  Link to Custom Order (Optional)
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {isLoadingOrders
                    ? 'Checking customer orders...'
                    : customerOrders.length > 0
                    ? `${customerOrders.length} active order(s) found`
                    : 'No pending custom orders'}
                </span>
              </div>

              {customerOrders.length > 0 ? (
                <div className="space-y-3">
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- General Unlinked Advance (Usable in POS / Orders) --</option>
                    {customerOrders.map((ord) => (
                      <option key={ord.id} value={ord.id}>
                        {ord.orderNumber} (Booked: {formatDate(ord.orderDate)} | Total:{' '}
                        {formatCurrency(ord.grandTotal)} | Status: {ord.status})
                      </option>
                    ))}
                  </select>

                  {/* Order Advance & Balance Context Card */}
                  {selectedOrder && (
                    <div className="p-3 bg-muted/50 rounded-lg border border-border text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-foreground">
                          Order #{selectedOrder.orderNumber}
                        </span>
                        <span className="text-primary font-semibold">
                          Total: {formatCurrency(selectedOrder.grandTotal)}
                        </span>
                      </div>
                      {orderBalanceSummary ? (
                        <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-border/60 text-[11px]">
                          <div>
                            <span className="text-muted-foreground block">Allocated Advance</span>
                            <span className="font-semibold text-emerald-600">
                              {formatCurrency(orderBalanceSummary.totalAdvanceAllocated)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Balance Due</span>
                            <span className="font-semibold text-amber-600">
                              {formatCurrency(orderBalanceSummary.balanceDue)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Delivery Target</span>
                            <span className="font-medium text-foreground">
                              {selectedOrder.expectedDeliveryDate
                                ? formatDate(selectedOrder.expectedDeliveryDate)
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-muted-foreground">
                          Loading authoritative order balance...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  This advance will be recorded as a general deposit and can be adjusted against future POS invoices or custom orders.
                </p>
              )}
            </div>
          )}

          {/* Amount & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-card">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Advance Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground text-sm font-semibold">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 text-sm font-semibold text-foreground bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Receipt Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={advanceDate}
                onChange={(e) => setAdvanceDate(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <label className="block text-xs font-semibold text-foreground">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method.value
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary'
                        : 'border-input bg-background hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <span className="text-base mb-1">{method.icon}</span>
                    <span className="text-[11px] leading-tight text-center">{method.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Reference Number / Cheque Details */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Transaction Reference / Cheque No. / UTR
                {paymentMethod !== 'CASH' && <span className="text-rose-500"> *</span>}
              </label>
              <input
                type="text"
                placeholder={
                  paymentMethod === 'CASH'
                    ? 'Optional cash voucher or memo ref'
                    : paymentMethod === 'CHEQUE'
                    ? 'Cheque number & bank name'
                    : paymentMethod === 'UPI'
                    ? 'UPI Transaction ID / UTR number'
                    : paymentMethod === 'CARD'
                    ? 'Card last 4 digits / Auth code'
                    : 'Bank transfer reference number'
                }
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Notes / Remarks */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              Voucher Remarks / Internal Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Booking deposit against bridal set, wedding delivery on 15th..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/40">
          <div className="text-xs text-muted-foreground">
            {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 ? (
              <span>
                Recording advance receipt of{' '}
                <strong className="text-foreground">{formatCurrency(parseFloat(amount))}</strong> via{' '}
                <strong className="text-foreground">{paymentMethod}</strong>
              </span>
            ) : (
              'Fill required fields to issue receipt'
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-input bg-background hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || !selectedCustomer || !amount}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                'Save Advance Receipt'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
