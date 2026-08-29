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

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Header */}
      <header className="h-13 px-4 border-b border-border bg-card flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📥</span>
            <div>
              <h1 className="font-bold text-sm text-foreground tracking-tight flex items-center gap-2">
                <span>Purchase & Inward Stock Counter</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                  {lifecycleStage}
                </span>
              </h1>
            </div>
          </div>
          <div className="flex items-center bg-muted/60 rounded-lg p-0.5 text-xs font-medium border border-border/50">
            <button
              type="button"
              onClick={() => setMetalType('Gold')}
              className={`px-3 py-1 rounded-md transition-all ${
                metalType === 'Gold'
                  ? 'bg-amber-500 text-white font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Gold Inward
            </button>
            <button
              type="button"
              onClick={() => setMetalType('Silver')}
              className={`px-3 py-1 rounded-md transition-all ${
                metalType === 'Silver'
                  ? 'bg-slate-500 text-white font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Silver Inward
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Stock Engine Inward Ready
            </span>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleRequestClear}
              className="text-xs px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground rounded-lg transition-colors font-medium border border-border"
            >
              Clear Inward
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={handleRequestClose}
              className="text-xs px-2.5 py-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              title="Close Purchase"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Global Alerts */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-destructive font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left Column: Barcode & Item Table */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
          <div className="bg-card p-3 rounded-xl border border-border shadow-sm shrink-0">
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

        {/* Right Column: Supplier Context, Payment, Summary */}
        <div className="w-80 flex flex-col gap-3 shrink-0 overflow-y-auto pr-0.5">
          <div className="bg-card p-3 rounded-xl border border-border shadow-sm space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>🏢</span>
              <span>Supplier Context</span>
            </div>
            <SupplierSelector
              supplier={supplier}
              onSelectSupplier={setSupplier}
              disabled={isSubmitting}
              inputRef={supplierInputRef}
            />
            <div className="pt-1">
              <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                Supplier Invoice / Bill Ref No:
              </label>
              <input
                type="text"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-9821..."
                className="w-full h-8 px-2.5 text-xs bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary font-mono"
              />
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-5 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="text-3xl mb-2">⚠️</div>
            <h3 className="font-bold text-foreground text-sm">Discard Active Inward Bill?</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              You have supplier and item details in progress. Clearing will reset all transient inward state.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedPrompt(false)
                  setPendingClose(false)
                }}
                className="flex-1 px-3 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-xs font-semibold"
              >
                Keep Bill
              </button>
              <button
                type="button"
                onClick={handleConfirmUnsavedAction}
                className="flex-1 px-3 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg text-xs font-bold"
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
