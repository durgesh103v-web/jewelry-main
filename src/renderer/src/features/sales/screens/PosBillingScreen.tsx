import React, { useState, useEffect, useCallback } from 'react'
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

interface PosBillingScreenProps {
  onClose?: () => void
}

export const PosBillingScreen: React.FC<PosBillingScreenProps> = () => {
  const {
    customer,
    setCustomer,
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
    summary,
    isCalculating,
    isSubmitting,
    error,
    setError,
    completedInvoice,
    submitSale,
    resetPos
  } = usePosBilling()

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

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

  // 4. Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault()
        setIsSearchOpen(true)
      } else if (e.key === 'F8') {
        e.preventDefault()
        if (items.length > 0 && customer) {
          setIsConfirmOpen(true)
        }
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false)
        if (!completedInvoice) {
          setIsConfirmOpen(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [items.length, customer, completedInvoice])

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top POS Header */}
      <header className="h-13 px-4 border-b border-border bg-card flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💎</span>
            <h1 className="font-bold text-sm text-foreground tracking-tight">
              POS & Retail Billing Counter
            </h1>
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
              Gold Billing
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
              Silver Billing
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={resetPos}
              className="text-xs px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground rounded-lg transition-colors font-medium border border-border"
            >
              Clear Bill
            </button>
          )}
        </div>
      </header>

      {/* Global POS Alerts */}
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

      {/* Main Workspace Layout (2 Columns) */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left Column: Items, Barcode, Breakdown, Credits */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
          {/* Barcode & Search Bar */}
          <div className="bg-card p-3 rounded-xl border border-border shadow-sm shrink-0">
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
            isCalculating={isCalculating}
          />

          {/* Bottom Left Panels (Breakdown, Advances, Exchanges) */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
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

        {/* Right Column: Customer Context, Payments, Summary, Checkout */}
        <div className="w-80 flex flex-col gap-3 shrink-0 overflow-y-auto pr-0.5">
          {/* Customer Selection */}
          <div className="bg-card p-3 rounded-xl border border-border shadow-sm space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>👤</span>
              <span>Customer Context</span>
            </div>
            <CustomerSelector
              customer={customer}
              onSelectCustomer={setCustomer}
              disabled={isSubmitting}
            />
            <OrderSelector
              customerId={customer?.id}
              currentOrder={order}
              onSelectOrder={loadOrder}
              onClearOrder={() => {}}
            />
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
            onOpenCompleteDialog={() => setIsConfirmOpen(true)}
            disabled={isSubmitting || items.length === 0 || !customer}
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
    </div>
  )
}

export default PosBillingScreen
