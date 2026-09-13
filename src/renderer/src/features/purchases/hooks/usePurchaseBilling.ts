import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type {
  PurchaseBillItem,
  PurchasePaymentLine,
  PurchaseLifecycleStage
} from '../types'
import type { SupplierRecord } from '@shared/types/supplier'
import type { PurchaseInvoiceRecord } from '@shared/types/purchaseInvoice'
import type { PricingResult } from '@shared/types/pricing'
import { roundNumber } from '@shared/jewelleryFormula'

function getTodayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function usePurchaseBilling() {
  const [supplier, setSupplier] = useState<SupplierRecord | null>(null)
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState<string>('')
  const [invoiceDate, setInvoiceDate] = useState<string>(getTodayISO())
  const [items, setItems] = useState<PurchaseBillItem[]>([])
  const [payments, setPayments] = useState<PurchasePaymentLine[]>([
    { id: uuidv4(), paymentMethod: 'CASH', amount: 0, paymentReference: '', notes: '' }
  ])
  const [metalType, setMetalType] = useState<string>('Gold')
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [completedInvoice, setCompletedInvoice] = useState<PurchaseInvoiceRecord | null>(null)

  const calculationReqId = useRef(0)
  const isSubmittingRef = useRef(false)

  // 1. Pricing recalculation for a purchase item via backend
  const recalculateItemPrice = useCallback(
    async (item: PurchaseBillItem): Promise<PurchaseBillItem> => {
      const currentReq = ++calculationReqId.current
      try {
        const res: PricingResult = await window.api.pricing.calculate({
          metalType: item.metalType || metalType,
          purityName: item.purityName,
          tunch: item.tunch ?? 100,
          wastage: item.wastage ?? 0,
          pcs: item.pcs || 1,
          grossWeight: item.grossWeight,
          packWeight: item.packWeight || 0,
          lessWeight: item.lessWeight || 0,
          addWeight: item.addWeight || 0,
          labourRate: item.labourRate ?? 0,
          labourRateType: item.labourRateType || 'Kg',
          ratePerGram: item.goldRate,
          stoneCharges: item.stoneCharges
            ? [{ stoneName: 'STONE', pcs: 1, carat: 0, weightGm: 0, ratePerUnit: item.stoneCharges, unit: 'Pcs' }]
            : [],
          diamondCharges: item.diamondCharges
            ? [{ diamondDescription: 'DIAMOND', carat: 1, ratePerCarat: item.diamondCharges, clarity: '', color: '' }]
            : [],
          discountAmount: item.discountAmount || 0,
          discountPercent: item.discountPercent || 0,
          taxPercent: item.taxPercent || 0
        })

        if (currentReq !== calculationReqId.current) {
          return item
        }

        return {
          ...item,
          goldRate: res.metal.ratePerGram,
          pricingResult: res,
          pricingStatus: 'READY',
          pricingError: undefined
        }
      } catch (err: any) {
        console.error('Error calculating purchase item price:', err)
        return {
          ...item,
          pricingStatus: 'ERROR',
          pricingError: err.message || 'Unable to calculate price'
        }
      }
    },
    [metalType]
  )

  // 2. Add Item to Purchase bill
  const addItem = useCallback(
    async (rawItem: Partial<PurchaseBillItem> & { itemId: string; itemName: string; grossWeight: number }) => {
      const existingIdx = rawItem.barcode
        ? items.findIndex((it) => it.barcode && it.barcode === rawItem.barcode)
        : -1

      if (existingIdx >= 0) {
        const existing = items[existingIdx]
        const newPcs = existing.pcs + (rawItem.pcs || 1)
        const unitGrossWeight = existing.pcs > 0 ? existing.grossWeight / existing.pcs : existing.grossWeight
        const newGrossWeight = roundNumber(unitGrossWeight * newPcs, 3)

        const updatedLine: PurchaseBillItem = {
          ...existing,
          pcs: newPcs,
          grossWeight: newGrossWeight,
          pricingStatus: 'CALCULATING'
        }

        setItems((prev) => prev.map((it, idx) => (idx === existingIdx ? updatedLine : it)))
        const recalculated = await recalculateItemPrice(updatedLine)
        setItems((prev) => prev.map((it, idx) => (idx === existingIdx ? recalculated : it)))
        return
      }

      const newItem: PurchaseBillItem = {
        id: uuidv4(),
        itemId: rawItem.itemId,
        itemName: rawItem.itemName,
        itemCode: rawItem.itemCode,
        description: rawItem.description || rawItem.itemName,
        stampId: rawItem.stampId || '',
        designId: rawItem.designId || '',
        barcode: rawItem.barcode || '',
        pcs: rawItem.pcs || 1,
        grossWeight: rawItem.grossWeight,
        packWeight: rawItem.packWeight || 0,
        lessWeight: rawItem.lessWeight || 0,
        addWeight: rawItem.addWeight || 0,
        metalType: rawItem.metalType || metalType,
        purityName: rawItem.purityName || '',
        tunch: rawItem.tunch ?? 100,
        wastage: rawItem.wastage ?? 0,
        goldRate: rawItem.goldRate || 0,
        labourRate: rawItem.labourRate ?? 0,
        labourRateType: rawItem.labourRateType || 'Kg',
        stoneCharges: rawItem.stoneCharges || 0,
        diamondCharges: rawItem.diamondCharges || 0,
        discountAmount: rawItem.discountAmount || 0,
        discountPercent: rawItem.discountPercent || 0,
        taxPercent: rawItem.taxPercent || 0,
        pricingStatus: 'CALCULATING'
      }

      setItems((prev) => [...prev, newItem])
      const calculated = await recalculateItemPrice(newItem)
      setItems((prev) => prev.map((it) => (it.id === newItem.id ? calculated : it)))
    },
    [items, metalType, recalculateItemPrice]
  )

  // 3. Update Item
  const updateItem = useCallback(
    async (id: string, updates: Partial<PurchaseBillItem>) => {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...updates, pricingStatus: 'CALCULATING' } : it))
      )

      const target = items.find((it) => it.id === id)
      if (!target) return

      const updated = { ...target, ...updates }
      const recalculated = await recalculateItemPrice(updated)

      setItems((prev) =>
        prev.map((it) => (it.id === id ? recalculated : it))
      )
    },
    [items, recalculateItemPrice]
  )

  // 4. Remove Item
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }, [])

  // 5. Derived Totals & Reconciled Calculation
  const summary = useMemo(() => {
    let totalPcs = 0
    let totalGrossWeight = 0
    let totalNetWeight = 0
    let totalFineWeight = 0
    let subtotal = 0
    let totalDiscount = 0
    let totalTaxable = 0
    let totalTax = 0
    let grandTotal = 0

    for (const it of items) {
      if (it.pricingResult) {
        totalPcs += it.pricingResult.weights.grossWeight > 0 ? it.pcs : 0
        totalGrossWeight = roundNumber(totalGrossWeight + it.pricingResult.weights.grossWeight, 3)
        totalNetWeight = roundNumber(totalNetWeight + it.pricingResult.weights.netWeight, 3)
        totalFineWeight = roundNumber(totalFineWeight + it.pricingResult.weights.fineWeight, 3)
        subtotal = roundNumber(
          subtotal + it.pricingResult.metal.metalValue + it.pricingResult.charges.totalCharges,
          2
        )
        totalDiscount = roundNumber(totalDiscount + it.pricingResult.discount.amount, 2)
        totalTaxable = roundNumber(totalTaxable + it.pricingResult.tax.taxableAmount, 2)
        totalTax = roundNumber(totalTax + it.pricingResult.tax.taxAmount, 2)
        grandTotal = roundNumber(grandTotal + it.pricingResult.total.finalAmount, 2)
      } else {
        totalGrossWeight = roundNumber(totalGrossWeight + it.grossWeight, 3)
      }
    }

    const totalPaid = payments.reduce((sum, p) => roundNumber(sum + Number(p.amount || 0), 2), 0)
    const balanceDue = Math.max(0, roundNumber(grandTotal - totalPaid, 2))

    return {
      totalPcs,
      totalGrossWeight,
      totalNetWeight,
      totalFineWeight,
      subtotal,
      totalDiscount,
      totalTaxable,
      totalTax,
      grandTotal,
      totalPaid,
      balanceDue
    }
  }, [items, payments])

  // 6. Auto-fill payment amount when single payment line is untouched
  useEffect(() => {
    if (payments.length === 1 && payments[0].amount === 0 && summary.grandTotal > 0) {
      setPayments([{ ...payments[0], amount: summary.grandTotal }])
    }
  }, [summary.grandTotal])

  // 7. Status checks
  const isAnyItemCalculating = useMemo(
    () => items.some((it) => it.pricingStatus === 'CALCULATING'),
    [items]
  )

  const hasPricingErrors = useMemo(
    () => items.some((it) => it.pricingStatus === 'ERROR'),
    [items]
  )

  const hasUnsavedChanges = useMemo(
    () => (supplier !== null || items.length > 0) && completedInvoice === null,
    [supplier, items.length, completedInvoice]
  )

  const lifecycleStage: PurchaseLifecycleStage = useMemo(() => {
    if (completedInvoice) return 'COMPLETED'
    if (isSubmitting) return 'PROCESSING'
    if (error) return 'ERROR'
    if (items.length === 0) {
      return supplier ? 'SUPPLIER_SELECTED' : 'EMPTY'
    }
    if (isAnyItemCalculating) return 'ITEMS_ADDED'
    if (payments.some((p) => p.amount > 0)) return 'PAYMENT_ENTRY'
    return 'READY_FOR_PAYMENT'
  }, [completedInvoice, isSubmitting, error, items.length, supplier, isAnyItemCalculating, payments])

  // 8. Payment Helpers
  const addPaymentLine = useCallback(() => {
    const remaining = summary.balanceDue
    setPayments((prev) => [
      ...prev,
      { id: uuidv4(), paymentMethod: 'CASH', amount: remaining > 0 ? remaining : 0, paymentReference: '', notes: '' }
    ])
  }, [summary.balanceDue])

  const updatePaymentLine = useCallback((id: string, updates: Partial<PurchasePaymentLine>) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )
  }, [])

  const removePaymentLine = useCallback((id: string) => {
    setPayments((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev))
  }, [])

  // 9. Complete Purchase Submission
  const submitPurchase = useCallback(async () => {
    if (isSubmittingRef.current) return null

    if (!supplier?.accountId) {
      setError('Please select a valid supplier with an active ledger account')
      return null
    }
    if (items.length === 0) {
      setError('Please add at least one item to inward stock')
      return null
    }
    if (isAnyItemCalculating) {
      setError('Please wait for pricing calculations to complete')
      return null
    }
    if (hasPricingErrors) {
      setError('One or more items have pricing errors')
      return null
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setError(null)
    try {
      const payload = {
        supplierId: supplier.id,
        accountId: supplier.accountId,
        supplierInvoiceNumber,
        invoiceDate,
        metalType,
        notes,
        items: items.map((it) => ({
          itemId: it.itemId,
          description: it.description,
          stampId: it.stampId || undefined,
          designId: it.designId || undefined,
          barcode: it.barcode || undefined,
          pcs: it.pcs,
          grossWeight: it.grossWeight,
          packWeight: it.packWeight,
          lessWeight: it.lessWeight,
          addWeight: it.addWeight,
          metalType: it.metalType,
          purityName: it.purityName,
          tunch: it.tunch,
          wastage: it.wastage,
          goldRate: it.goldRate,
          labourRate: it.labourRate,
          labourRateType: it.labourRateType,
          stoneCharges: it.stoneCharges,
          diamondCharges: it.diamondCharges,
          discountAmount: it.discountAmount,
          discountPercent: it.discountPercent,
          taxPercent: it.taxPercent
        })),
        payments: payments
          .filter((p) => p.amount > 0)
          .map((p) => ({
            paymentMethod: p.paymentMethod,
            amount: p.amount,
            paymentReference: p.paymentReference,
            notes: p.notes
          }))
      }

      const invoice: PurchaseInvoiceRecord = await window.api.purchaseInvoices.create(payload)

      if (!invoice || !invoice.id || !invoice.invoiceNumber) {
        throw new Error('Backend returned invalid purchase invoice confirmation')
      }

      setCompletedInvoice(invoice)
      return invoice
    } catch (err: any) {
      console.error('Purchase invoice submission failed:', err)
      setError(err.message || 'Failed to complete purchase invoice')
      return null
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }, [
    supplier,
    items,
    supplierInvoiceNumber,
    invoiceDate,
    metalType,
    notes,
    payments,
    isAnyItemCalculating,
    hasPricingErrors
  ])

  // 10. Reset State
  const resetPurchase = useCallback(() => {
    setSupplier(null)
    setSupplierInvoiceNumber('')
    setInvoiceDate(getTodayISO())
    setItems([])
    setPayments([{ id: uuidv4(), paymentMethod: 'CASH', amount: 0, paymentReference: '', notes: '' }])
    setNotes('')
    setError(null)
    setCompletedInvoice(null)
    isSubmittingRef.current = false
    setIsSubmitting(false)
  }, [])

  return {
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
    notes,
    setNotes,
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
  }
}
