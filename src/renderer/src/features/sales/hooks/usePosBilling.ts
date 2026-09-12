import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { PosBillItem, PosPaymentLine, PosLifecycleStage } from '../types'
import type { CustomerRecord } from '@shared/types/customer'
import type { CustomerOrderRecord } from '@shared/types/customerOrder'
import type { CustomerAdvanceRecord } from '@shared/types/advance'
import type { MetalExchangeRecord } from '@shared/types/metalExchange'
import type { SalesInvoiceRecord } from '@shared/types/salesInvoice'
import type { PricingResult } from '@shared/types/pricing'
import { roundNumber } from '@shared/jewelleryFormula'

export function usePosBilling() {
  const [customer, setCustomer] = useState<CustomerRecord | null>(null)
  const [salespersonId, setSalespersonId] = useState<string>('')
  const [salespersonName, setSalespersonName] = useState<string>('Main Staff')
  const [deliveryStatus, setDeliveryStatus] = useState<string>('Delivered')
  const [order, setOrder] = useState<CustomerOrderRecord | null>(null)
  const [items, setItems] = useState<PosBillItem[]>([])
  const [availableAdvances, setAvailableAdvances] = useState<CustomerAdvanceRecord[]>([])
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState<string[]>([])
  const [availableExchanges, setAvailableExchanges] = useState<MetalExchangeRecord[]>([])
  const [selectedExchangeIds, setSelectedExchangeIds] = useState<string[]>([])
  const [payments, setPayments] = useState<PosPaymentLine[]>([
    { id: uuidv4(), paymentMethod: 'CASH', amount: 0, paymentReference: '', notes: '' }
  ])
  const [metalType, setMetalType] = useState<string>('Gold')
  const [notes, setNotes] = useState<string>('')
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [completedInvoice, setCompletedInvoice] = useState<SalesInvoiceRecord | null>(null)

  const calculationReqId = useRef(0)
  const isSubmittingRef = useRef(false)

  // 1. Fetch available advances & exchanges when customer changes
  useEffect(() => {
    if (!customer?.id) {
      setAvailableAdvances([])
      setSelectedAdvanceIds([])
      setAvailableExchanges([])
      setSelectedExchangeIds([])
      return
    }

    let active = true

    const fetchCustomerCredits = async () => {
      try {
        const [advances, exchanges] = await Promise.all([
          window.api.advances.getByCustomer(customer.id),
          window.api.metalExchange.list({ customerId: customer.id, status: 'APPLIED' })
        ])

        if (!active) return

        const activeAdvances = (advances || []).filter(
          (a) => a.status !== 'CANCELLED' && a.status !== 'REFUNDED' && a.unallocatedAmount > 0
        )
        setAvailableAdvances(activeAdvances)

        const activeExchanges = (exchanges || []).filter(
          (e) => e.status === 'APPLIED'
        )
        setAvailableExchanges(activeExchanges)
      } catch (err: any) {
        console.error('Failed to load customer advances/exchanges:', err)
      }
    }

    fetchCustomerCredits()

    return () => {
      active = false
    }
  }, [customer?.id])

  // 2. Pricing recalculation for an item via backend
  const recalculateItemPrice = useCallback(
    async (item: PosBillItem): Promise<PosBillItem> => {
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
            ? [{ stoneName: 'STONE', pcs: item.diamondPcs || 1, carat: item.diamondCarats || 0, weightGm: 0, ratePerUnit: item.stoneCharges, unit: 'Pcs' }]
            : item.stoneAmount
              ? [{ stoneName: 'STONE', pcs: 1, carat: 0, weightGm: 0, ratePerUnit: item.stoneAmount, unit: 'Pcs' }]
              : [],
          diamondCharges: item.diamondCharges
            ? [{ diamondDescription: 'DIAMOND', carat: item.diamondCarats || 1, ratePerCarat: item.diamondCharges, clarity: '', color: '' }]
            : [],
          discountAmount: roundNumber((item.discountAmount || 0) + (item.makingDiscount || 0), 2),
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
        console.error('Error calculating item price:', err)
        return {
          ...item,
          pricingStatus: 'ERROR',
          pricingError: err.message || 'Unable to calculate price'
        }
      }
    },
    [metalType]
  )

  // 3. Add Item to POS bill
  const addItem = useCallback(
    async (rawItem: Partial<PosBillItem> & { itemId: string; itemName: string; grossWeight: number }) => {
      const existingIdx = rawItem.barcode
        ? items.findIndex((it) => it.barcode && it.barcode === rawItem.barcode)
        : -1

      if (existingIdx >= 0) {
        const existing = items[existingIdx]
        const newPcs = existing.pcs + (rawItem.pcs || 1)
        const unitGrossWeight = existing.pcs > 0 ? existing.grossWeight / existing.pcs : existing.grossWeight
        const newGrossWeight = roundNumber(unitGrossWeight * newPcs, 3)

        const updatedLine: PosBillItem = {
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

      const newItem: PosBillItem = {
        id: uuidv4(),
        itemId: rawItem.itemId,
        itemName: rawItem.itemName,
        itemCode: rawItem.itemCode,
        description: rawItem.description || rawItem.itemName,
        stampId: rawItem.stampId || '',
        designId: rawItem.designId || '',
        barcode: rawItem.barcode || '',
        huid: rawItem.huid || '',
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
        makingDiscount: rawItem.makingDiscount || 0,
        stoneCharges: rawItem.stoneCharges || 0,
        diamondCharges: rawItem.diamondCharges || 0,
        diamondCarats: rawItem.diamondCarats || 0,
        diamondPcs: rawItem.diamondPcs || 0,
        stoneAmount: rawItem.stoneAmount || 0,
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

  // 4. Update Item
  const updateItem = useCallback(
    async (id: string, updates: Partial<PosBillItem>) => {
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

  // 5. Remove Item
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }, [])

  // 6. Safe Customer Selection
  const setCustomerWithSafety = useCallback((newCustomer: CustomerRecord | null) => {
    setCustomer(newCustomer)
    if (!newCustomer) {
      setOrder(null)
      setSelectedAdvanceIds([])
      setSelectedExchangeIds([])
    } else {
      setSelectedAdvanceIds([])
      setSelectedExchangeIds([])
      if (order && order.customerId !== newCustomer.id) {
        setOrder(null)
      }
    }
  }, [order])

  // 7. Load Customer Order
  const loadOrder = useCallback(
    async (orderId: string) => {
      setError(null)
      try {
        const ord: CustomerOrderRecord = await window.api.orders.getById(orderId)
        if (!ord) throw new Error('Order not found')

        setOrder(ord)
        if (ord.customerId) {
          const cust = await window.api.customers.getById(ord.customerId)
          if (cust) setCustomer(cust)
        }

        if (ord.items && ord.items.length > 0) {
          const mappedItems: PosBillItem[] = ord.items.map((oi) => ({
            id: uuidv4(),
            itemId: oi.itemId,
            itemName: oi.description || 'Order Item',
            description: oi.description || undefined,
            stampId: oi.stampId || '',
            designId: oi.designId || '',
            barcode: oi.barcode || '',
            pcs: oi.pcs,
            grossWeight: oi.grossWeight,
            packWeight: oi.packWeight,
            lessWeight: oi.lessWeight,
            addWeight: oi.addWeight,
            metalType: oi.metalType,
            purityName: oi.purityName || '',
            tunch: oi.tunch,
            wastage: oi.wastage,
            goldRate: oi.goldRate,
            labourRate: oi.labourRate,
            labourRateType: oi.labourRateType,
            stoneCharges: oi.stoneCharges,
            diamondCharges: oi.diamondCharges,
            discountAmount: oi.discountAmount,
            taxPercent: oi.taxPercent,
            pricingStatus: 'CALCULATING'
          }))

          setItems(mappedItems)
          const recalculated = await Promise.all(mappedItems.map(recalculateItemPrice))
          setItems(recalculated)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load order')
      }
    },
    [recalculateItemPrice]
  )

  // 8. Derived Totals & Reconciled Calculation
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

    // Advance Total
    const totalAdvanceApplied = availableAdvances
      .filter((a) => selectedAdvanceIds.includes(a.id))
      .reduce((sum, a) => roundNumber(sum + a.unallocatedAmount, 2), 0)
    const advanceDeducted = Math.min(grandTotal, totalAdvanceApplied)

    // Exchange Total
    const totalExchangeApplied = availableExchanges
      .filter((e) => selectedExchangeIds.includes(e.id))
      .reduce((sum, e) => roundNumber(sum + e.exchangeAmount, 2), 0)
    const exchangeDeducted = Math.min(roundNumber(grandTotal - advanceDeducted, 2), totalExchangeApplied)

    const netPayable = Math.max(0, roundNumber(grandTotal - advanceDeducted - exchangeDeducted - invoiceDiscount, 2))

    // Total Payments
    const totalPaid = payments.reduce((sum, p) => roundNumber(sum + Number(p.amount || 0), 2), 0)
    const balanceDue = Math.max(0, roundNumber(netPayable - totalPaid, 2))

    return {
      totalPcs,
      totalGrossWeight,
      totalNetWeight,
      totalFineWeight,
      subtotal,
      totalDiscount,
      invoiceDiscount,
      totalTaxable,
      totalTax,
      grandTotal,
      advanceDeducted,
      exchangeDeducted,
      netPayable,
      totalPaid,
      balanceDue
    }
  }, [items, availableAdvances, selectedAdvanceIds, availableExchanges, selectedExchangeIds, payments, invoiceDiscount])

  // 9. Auto-fill payment amount when single payment line is untouched
  useEffect(() => {
    if (payments.length === 1 && payments[0].amount === 0 && summary.netPayable > 0) {
      setPayments([{ ...payments[0], amount: summary.netPayable }])
    }
  }, [summary.netPayable])

  // 10. Status checks
  const isAnyItemCalculating = useMemo(
    () => items.some((it) => it.pricingStatus === 'CALCULATING'),
    [items]
  )

  const hasPricingErrors = useMemo(
    () => items.some((it) => it.pricingStatus === 'ERROR'),
    [items]
  )

  const hasUnsavedChanges = useMemo(
    () => (customer !== null || items.length > 0) && completedInvoice === null,
    [customer, items.length, completedInvoice]
  )

  const lifecycleStage: PosLifecycleStage = useMemo(() => {
    if (completedInvoice) return 'COMPLETED'
    if (isSubmitting) return 'PROCESSING'
    if (error) return 'ERROR'
    if (items.length === 0) {
      return customer ? 'CUSTOMER_SELECTED' : 'EMPTY'
    }
    if (isAnyItemCalculating) return 'ITEMS_ADDED'
    if (payments.some((p) => p.amount > 0)) return 'PAYMENT_ENTRY'
    return 'READY_FOR_PAYMENT'
  }, [completedInvoice, isSubmitting, error, items.length, customer, isAnyItemCalculating, payments])

  // 11. Payment Helpers
  const addPaymentLine = useCallback(() => {
    const remaining = summary.balanceDue
    setPayments((prev) => [
      ...prev,
      { id: uuidv4(), paymentMethod: 'CASH', amount: remaining > 0 ? remaining : 0, paymentReference: '', notes: '' }
    ])
  }, [summary.balanceDue])

  const updatePaymentLine = useCallback((id: string, updates: Partial<PosPaymentLine>) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )
  }, [])

  const removePaymentLine = useCallback((id: string) => {
    setPayments((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev))
  }, [])

  // 12. Complete Sale Submission
  const submitSale = useCallback(async () => {
    if (isSubmittingRef.current) {
      return null
    }

    if (!customer?.accountId) {
      setError('Please select a valid customer with an active account')
      return null
    }
    if (items.length === 0) {
      setError('Please add at least one item to the sales invoice')
      return null
    }
    if (isAnyItemCalculating) {
      setError('Please wait for item pricing calculations to finish')
      return null
    }
    if (hasPricingErrors) {
      setError('One or more items have pricing errors. Please verify item weights and rates.')
      return null
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setError(null)
    try {
      const payload = {
        customerId: customer.id,
        salespersonId: salespersonId || undefined,
        salespersonName: salespersonName || undefined,
        deliveryStatus: deliveryStatus || 'Delivered',
        accountId: customer.accountId,
        orderId: order?.id || undefined,
        metalType,
        notes,
        invoiceDiscount,
        advanceIds: selectedAdvanceIds,
        metalExchangeIds: selectedExchangeIds,
        items: items.map((it) => ({
          itemId: it.itemId,
          description: it.description,
          stampId: it.stampId || undefined,
          designId: it.designId || undefined,
          barcode: it.barcode || undefined,
          huid: it.huid || undefined,
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
          makingDiscount: it.makingDiscount,
          stoneCharges: it.stoneCharges,
          diamondCharges: it.diamondCharges,
          diamondCarats: it.diamondCarats,
          diamondPcs: it.diamondPcs,
          stoneAmount: it.stoneAmount,
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

      const invoice: SalesInvoiceRecord = await window.api.salesInvoices.create(payload)

      if (!invoice || !invoice.id || !invoice.invoiceNumber) {
        throw new Error('Backend returned invalid invoice confirmation')
      }

      setCompletedInvoice(invoice)
      return invoice
    } catch (err: any) {
      console.error('Sale checkout failed:', err)
      const errorMsg = err.message || 'Failed to complete sales invoice'
      if (errorMsg.includes('stock') || errorMsg.includes('Inventory')) {
        setError('One or more items are no longer available in stock. Please refresh the bill.')
      } else if (errorMsg.includes('advance') || errorMsg.includes('Advance')) {
        setError('Selected customer advance is no longer available. Please refresh the advance selection.')
      } else if (errorMsg.includes('exchange') || errorMsg.includes('Exchange')) {
        setError('Selected Old Gold exchange is no longer available. Please refresh the exchange selection.')
      } else {
        setError(errorMsg)
      }
      return null
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }, [
    customer,
    salespersonId,
    salespersonName,
    deliveryStatus,
    items,
    order,
    metalType,
    notes,
    invoiceDiscount,
    selectedAdvanceIds,
    selectedExchangeIds,
    payments,
    isAnyItemCalculating,
    hasPricingErrors
  ])

  // 13. Full Transient State Reset
  const resetPos = useCallback(() => {
    setCustomer(null)
    setOrder(null)
    setItems([])
    setAvailableAdvances([])
    setSelectedAdvanceIds([])
    setAvailableExchanges([])
    setSelectedExchangeIds([])
    setPayments([{ id: uuidv4(), paymentMethod: 'CASH', amount: 0, paymentReference: '', notes: '' }])
    setNotes('')
    setInvoiceDiscount(0)
    setError(null)
    setCompletedInvoice(null)
    isSubmittingRef.current = false
    setIsSubmitting(false)
  }, [])

  return {
    lifecycleStage,
    customer,
    setCustomer: setCustomerWithSafety,
    salespersonId,
    setSalespersonId,
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
    notes,
    setNotes,
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
  }
}
