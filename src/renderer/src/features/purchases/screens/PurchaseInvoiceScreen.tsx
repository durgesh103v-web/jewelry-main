import React, { useState, useEffect, useCallback, useRef } from 'react'
import { usePurchaseBilling } from '../hooks/usePurchaseBilling'
import { SupplierSelector } from '../components/SupplierSelector'
import { PurchaseItemTable } from '../components/PurchaseItemTable'
import { PurchaseSummaryPanel } from '../components/PurchaseSummaryPanel'
import { CompletePurchaseDialog } from '../components/CompletePurchaseDialog'
import { BarcodeInput } from '../../sales/components/BarcodeInput'
import { ItemSearchModal } from '../../sales/components/ItemSearchModal'
import { PaymentPanel } from '../../sales/components/PaymentPanel'
import { PricingBreakdownPanel } from '../../sales/components/PricingBreakdownPanel'

interface PurchaseInvoiceScreenProps {
  onClose?: () => void
}

export const PurchaseInvoiceScreen: React.FC<PurchaseInvoiceScreenProps> = ({ onClose }) => {
  const {
    lifecycleStage,
    supplier,
    setSupplier,
    supplierInvoiceNumber,
    setSupplierInvoiceNumber,
    invoiceDate,
    setInvoiceDate,
    items,
    addItem,
    updateItem,
    removeItem,
    payments,
    addPaymentLine,
    updatePaymentLine,
    removePaymentLine,
    metalType,
    setMetalType,
    summary,
    isAnyItemCalculating,
    hasPricingErrors,
    hasUnsavedChanges,
    isSubmitting,
    error,
    setError,
    completedInvoice,
    submitPurchase,
    resetPurchase
  } = usePurchaseBilling()

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false)
  const [pendingClose, setPendingClose] = useState(false)

  const supplierInputRef = useRef<HTMLInputElement>(null)

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
        console.error('Failed to scan item for purchase:', err)
        return false
      }
    },
    [addItem, metalType]
  )

  // 2. Keyboard Navigation (F2, F4, F6, F8, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        supplierInputRef.current?.focus()
      } else if (e.key === 'F4') {
        e.preventDefault()
        setIsSearchOpen(true)
      } else if (e.key === 'F6') {
        e.preventDefault()
        const paymentInput = document.querySelector<HTMLInputElement>('input[placeholder="Amount"]')
        paymentInput?.focus()
      } else if (e.key === 'F8') {
        e.preventDefault()
        if (items.length > 0 && supplier && !isAnyItemCalculating && !hasPricingErrors && !isSubmitting) {
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
    supplier,
    isAnyItemCalculating,
    hasPricingErrors,
    isSubmitting,
    completedInvoice
  ])

  // 3. Clear / Close with unsaved protection
  const handleRequestClear = useCallback(() => {
    if (hasUnsavedChanges) {
      setPendingClose(false)
      setShowUnsavedPrompt(true)
    } else {
      resetPurchase()
    }
  }, [hasUnsavedChanges, resetPurchase])

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
    resetPurchase()
    if (pendingClose && onClose) {
      onClose()
    }
    setPendingClose(false)
  }, [pendingClose, resetPurchase, onClose])

  const stageBadgeClass =
    lifecycleStage === 'COMPLETED'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : lifecycleStage === 'PROCESSING'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-100 text-slate-600 border-slate-200'

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="h-13 px-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📥</span>
            <div>
              <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
                <span>Purchase & Inward Stock Counter</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-semibold ${stageBadgeClass}`}>
                  {lifecycleStage}
                </span>
              </h1>
            </div>
          </div>

          {/* Metal Type Switcher */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium border border-slate-200">
            <button
              type="button"
              onClick={() => setMetalType('Gold')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                metalType === 'Gold'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gold Inward
            </button>
            <button
              type="button"
              onClick={() => setMetalType('Silver')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                metalType === 'Silver'
                  ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Silver Inward
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono">
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Stock Engine Inward Ready
            </span>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleRequestClear}
              className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-lg transition-colors font-medium border border-slate-200 cursor-pointer"
            >
              Clear Inward
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={handleRequestClose}
              className="text-xs px-2.5 py-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close Purchase"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Global Alerts */}
      {error && (
        <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-700 font-bold text-xs hover:text-rose-900 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left Column: Barcode & Item Table */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs shrink-0">
            <BarcodeInput
              onScanItem={handleScanBarcode}
              onOpenSearch={() => setIsSearchOpen(true)}
              disabled={isSubmitting}
            />
          </div>

          <PurchaseItemTable
            items={items}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
          />

          <div className="shrink-0">
            <PricingBreakdownPanel summary={summary} />
          </div>
        </div>

        {/* Right Column: Supplier Context, Inward Details, Payment, Summary */}
        <div className="w-80 flex flex-col gap-3 shrink-0 overflow-y-auto pr-0.5">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <span>🏢</span>
              <span>Supplier Context</span>
            </div>

            <SupplierSelector
              supplier={supplier}
              onSelectSupplier={setSupplier}
              disabled={isSubmitting}
              inputRef={supplierInputRef}
            />

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1 uppercase tracking-wide">
                  Inward Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono text-slate-800 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1 uppercase tracking-wide">
                  Supplier Bill Ref No
                </label>
                <input
                  type="text"
                  value={supplierInvoiceNumber}
                  onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-9821"
                  disabled={isSubmitting}
                  className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono text-slate-800 placeholder:text-slate-400 disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>

          <PaymentPanel
            payments={payments}
            netPayable={summary.grandTotal}
            onAddPayment={addPaymentLine}
            onUpdatePayment={updatePaymentLine}
            onRemovePayment={removePaymentLine}
          />

          <PurchaseSummaryPanel
            summary={summary}
            onOpenCompleteDialog={() => setIsConfirmOpen(true)}
            disabled={
              isSubmitting ||
              items.length === 0 ||
              !supplier ||
              isAnyItemCalculating ||
              hasPricingErrors
            }
          />
        </div>
      </div>

      {/* Catalog Search Modal */}
      <ItemSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectItem={addItem}
        metalType={metalType}
      />

      {/* Confirmation Dialog */}
      <CompletePurchaseDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        supplier={supplier}
        supplierInvoiceNumber={supplierInvoiceNumber}
        items={items}
        payments={payments}
        summary={summary}
        isSubmitting={isSubmitting}
        error={error}
        completedInvoice={completedInvoice}
        onConfirmPurchase={submitPurchase}
        onNewPurchase={() => {
          resetPurchase()
          setIsConfirmOpen(false)
        }}
      />

      {/* Unsaved Prompt */}
      {showUnsavedPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm p-5 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="text-3xl mb-2">⚠️</div>
            <h3 className="font-bold text-slate-900 text-sm">Discard Active Inward Bill?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              You have supplier and item details in progress. Clearing will reset all transient inward state.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedPrompt(false)
                  setPendingClose(false)
                }}
                className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Keep Bill
              </button>
              <button
                type="button"
                onClick={handleConfirmUnsavedAction}
                className="flex-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
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

export default PurchaseInvoiceScreen
