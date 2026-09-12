import React, { useState, useEffect, useCallback, useRef } from 'react'
import { usePosBilling } from '../hooks/usePosBilling'
import { CustomerSelector } from '../components/CustomerSelector'
import { OrderSelector } from '../components/OrderSelector'
import { BarcodeInput } from '../components/BarcodeInput'
import { ItemSearchModal } from '../components/ItemSearchModal'
import { SalesItemTable } from '../components/SalesItemTable'
import { PricingBreakdownPanel } from '../components/PricingBreakdownPanel'
import { AdvancePanel } from '../components/AdvancePanel'
import { OldGoldExchangePanel } from '../components/OldGoldExchangePanel'
import { PaymentPanel } from '../components/PaymentPanel'
import { InvoiceSummaryPanel } from '../components/InvoiceSummaryPanel'
import { CompleteSaleDialog } from '../components/CompleteSaleDialog'
import { FiUser, FiTruck, FiRotateCcw, FiX } from 'react-icons/fi'

interface PosBillingScreenProps {
  onClose?: () => void
}

const SALESPERSON_OPTIONS = [
  'Main Sales Staff',
  'Counter Executive 1',
  'Counter Executive 2',
  'Floor Manager',
  'Store Director'
]

const DELIVERY_STATUS_OPTIONS = [
  'Delivered',
  'Pending Sizing',
  'Pending Polishing',
  'Store Pickup Later'
]

export const PosBillingScreen: React.FC<PosBillingScreenProps> = ({ onClose }) => {
  const {
    lifecycleStage,
    customer,
    setCustomer,
    salespersonName,
    setSalespersonName,
    deliveryStatus,
    setDeliveryStatus,
    order,
    loadOrder,
    items,
    addItem,
    updateItem,
    removeItem,
    availableAdvances,
    selectedAdvanceIds,
    setSelectedAdvanceIds,
    availableExchanges,
    selectedExchangeIds,
    setSelectedExchangeIds,
    payments,
    addPaymentLine,
    updatePaymentLine,
    removePaymentLine,
    metalType,
    setMetalType,
    invoiceDiscount,
    setInvoiceDiscount,
    summary,
    isAnyItemCalculating,
    hasPricingErrors,
    hasUnsavedChanges,
    isSubmitting,
    error,
    setError,
    completedInvoice,
    submitSale,
    resetPos
  } = usePosBilling()

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false)
  const [pendingClose, setPendingClose] = useState(false)

  const customerInputRef = useRef<HTMLInputElement>(null)

  // 1. Scan item by barcode
  const handleScanBarcode = useCallback(
    async (barcode: string): Promise<boolean> => {
      try {
        const item = await window.api.items.getByBarcode(barcode)
        if (!item) return false

        await addItem({
          itemId: item.id,
          itemName: item.itemName || item.item_name,
          itemCode: item.itemCode || item.item_code,
          barcode: item.barcode,
          huid: item.huid || '',
          metalType: item.metalType || item.metal_type || metalType,
          stampId: item.defaultStampId || item.default_stamp_id,
          designId: item.defaultDesignId || item.default_design_id,
          grossWeight: item.fixedWeightPerPcs || item.fixed_weight_per_pcs || 1.0,
          tunch: item.defaultTanch || item.default_tanch || 100,
          wastage: item.defaultWastage || item.default_wastage || 0,
          labourRate: item.defaultLabourRate || item.default_labour_rate || 0,
          labourRateType: item.labourRateType || item.labour_rate_type || 'Kg'
        })
        return true
      } catch (err) {
        console.error('Failed to scan item:', err)
        return false
      }
    },
    [addItem, metalType]
  )

  // 2. Toggle Advance Selection
  const handleToggleAdvance = useCallback((id: string) => {
    setSelectedAdvanceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }, [setSelectedAdvanceIds])

  // 3. Toggle Exchange Selection
  const handleToggleExchange = useCallback((id: string) => {
    setSelectedExchangeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }, [setSelectedExchangeIds])

  // 4. Keyboard Navigation (F2, F4, F6, F8, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        customerInputRef.current?.focus()
      } else if (e.key === 'F4') {
        e.preventDefault()
        setIsSearchOpen(true)
      } else if (e.key === 'F6') {
        e.preventDefault()
        const paymentInput = document.querySelector<HTMLInputElement>('input[placeholder="Amount"]')
        paymentInput?.focus()
      } else if (e.key === 'F8') {
        e.preventDefault()
        if (items.length > 0 && customer && !isAnyItemCalculating && !hasPricingErrors && !isSubmitting) {
          setIsConfirmOpen(true)
        }
      } else if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false)
        } else if (isConfirmOpen && !completedInvoice && !isSubmitting) {
          setIsConfirmOpen(false)
        } else if (showUnsavedPrompt) {
          setShowUnsavedPrompt(false)
          setPendingClose(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isSearchOpen,
    isConfirmOpen,
    showUnsavedPrompt,
    items.length,
    customer,
    isAnyItemCalculating,
    hasPricingErrors,
    isSubmitting,
    completedInvoice
  ])

  // 5. Handle Clear / Close with unsaved protection
  const handleRequestClear = useCallback(() => {
    if (hasUnsavedChanges) {
      setPendingClose(false)
      setShowUnsavedPrompt(true)
    } else {
      resetPos()
    }
  }, [hasUnsavedChanges, resetPos])

  const handleRequestClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setPendingClose(true)
      setShowUnsavedPrompt(true)
    } else if (onClose) {
      onClose()
    }
  }, [hasUnsavedChanges, onClose])

  const handleConfirmUnsavedAction = useCallback(() => {
    setShowUnsavedPrompt(false)
    resetPos()
    if (pendingClose && onClose) {
      onClose()
    }
    setPendingClose(false)
  }, [pendingClose, resetPos, onClose])

  return (
    <div className="h-full flex flex-col bg-[var(--color-background-app,#f8fafc)] text-slate-900 overflow-hidden select-none">
      {/* Top POS Header */}
      <header className="min-h-[48px] py-2 px-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 shadow-2xs shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💎</span>
            <div>
              <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
                <span>POS & Retail Billing Counter</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-semibold uppercase">
                  {lifecycleStage}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium border border-slate-200">
            <button
              type="button"
              onClick={() => setMetalType('Gold')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                metalType === 'Gold'
                  ? 'bg-amber-500 !text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gold Billing
            </button>
            <button
              type="button"
              onClick={() => setMetalType('Silver')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                metalType === 'Silver'
                  ? 'bg-slate-700 !text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Silver Billing
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex text-[11px] text-slate-500 items-center gap-2 font-mono">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Scanner Ready
            </span>
            <span>•</span>
            <span className="text-slate-500 font-medium">Print Bridge Ready</span>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleRequestClear}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 rounded-lg transition-colors font-semibold cursor-pointer shadow-2xs"
            >
              <FiRotateCcw size={12} />
              <span>Clear Bill</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={handleRequestClose}
              className="h-8 w-8 inline-flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close POS"
            >
              <FiX size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Global POS Alerts */}
      {error && (
        <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span className="font-medium">⚠️ {error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-700 font-bold text-xs p-1 hover:bg-rose-100 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col xl:flex-row gap-3 p-3 overflow-y-auto xl:overflow-hidden">
        {/* Left Column: Items, Barcode, Breakdown, Credits */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 xl:overflow-hidden">
          {/* Barcode & Search Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs shrink-0">
            <BarcodeInput
              onScanItem={handleScanBarcode}
              onOpenSearch={() => setIsSearchOpen(true)}
              disabled={isSubmitting}
            />
          </div>

          {/* Line Items Table */}
          <SalesItemTable
            items={items}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            onOpenSearch={() => setIsSearchOpen(true)}
            onQuickAddItem={handleScanBarcode}
          />

          {/* Bottom Left Panels (Breakdown, Advances, Exchanges) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 shrink-0">
            <PricingBreakdownPanel summary={summary} />
            <AdvancePanel
              advances={availableAdvances}
              selectedAdvanceIds={selectedAdvanceIds}
              onToggleAdvance={handleToggleAdvance}
            />
            <OldGoldExchangePanel
              exchanges={availableExchanges}
              selectedExchangeIds={selectedExchangeIds}
              onToggleExchange={handleToggleExchange}
            />
          </div>
        </div>

        {/* Right Column: Customer Context, Staff Tag, Payments, Summary, Checkout */}
        <div className="w-full xl:w-80 flex flex-col gap-3 shrink-0 overflow-y-auto pr-0.5">
          {/* Customer Selection & Salesperson Box */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>👤</span>
              <span>Customer Context</span>
            </div>

            <CustomerSelector
              customer={customer}
              onSelectCustomer={setCustomer}
              disabled={isSubmitting}
              inputRef={customerInputRef}
            />

            <OrderSelector
              customerId={customer?.id}
              currentOrder={order}
              onSelectOrder={loadOrder}
              onClearOrder={() => {}}
            />

            {/* Salesperson & Delivery Details */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                  <FiUser size={11} className="text-amber-600" />
                  <span>Attendant</span>
                </label>
                <select
                  value={salespersonName}
                  onChange={(e) => setSalespersonName(e.target.value)}
                  className="w-full h-7 text-xs bg-slate-50 border border-slate-200 rounded px-1.5 font-medium text-slate-800 focus:bg-white focus:border-amber-500"
                >
                  {SALESPERSON_OPTIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                  <FiTruck size={11} className="text-indigo-600" />
                  <span>Delivery</span>
                </label>
                <select
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value)}
                  className="w-full h-7 text-xs bg-slate-50 border border-slate-200 rounded px-1.5 font-medium text-slate-800 focus:bg-white focus:border-amber-500"
                >
                  {DELIVERY_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Split Payment Panel */}
          <PaymentPanel
            payments={payments}
            netPayable={summary.netPayable}
            onAddPayment={addPaymentLine}
            onUpdatePayment={updatePaymentLine}
            onRemovePayment={removePaymentLine}
          />

          {/* Net Payable & Checkout Panel */}
          <InvoiceSummaryPanel
            summary={summary}
            invoiceDiscount={invoiceDiscount}
            onUpdateInvoiceDiscount={setInvoiceDiscount}
            onOpenCompleteDialog={() => setIsConfirmOpen(true)}
            disabled={
              isSubmitting ||
              items.length === 0 ||
              !customer ||
              isAnyItemCalculating ||
              hasPricingErrors
            }
          />
        </div>
      </div>

      {/* Item Search Catalog Modal */}
      <ItemSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectItem={addItem}
        metalType={metalType}
      />

      {/* Confirmation & Completion Dialog */}
      <CompleteSaleDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        customer={customer}
        items={items}
        payments={payments}
        summary={summary}
        isSubmitting={isSubmitting}
        error={error}
        completedInvoice={completedInvoice}
        onConfirmSale={submitSale}
        onNewSale={() => {
          resetPos()
          setIsConfirmOpen(false)
        }}
      />

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedPrompt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-sm p-5 text-center">
            <div className="text-3xl mb-2">⚠️</div>
            <h3 className="font-bold text-slate-900 text-sm">Discard Active Bill?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              You have customer and item details in progress. Clearing will reset all transient billing state.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedPrompt(false)
                  setPendingClose(false)
                }}
                className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Keep Bill
              </button>
              <button
                type="button"
                onClick={handleConfirmUnsavedAction}
                className="flex-1 px-3 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Discard & Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PosBillingScreen
