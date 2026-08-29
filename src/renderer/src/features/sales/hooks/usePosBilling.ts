import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { PosBillItem, PosPaymentLine } from '../types'
import type { CustomerRecord } from '@shared/types/customer'
import type { CustomerOrderRecord } from '@shared/types/customerOrder'
import type { CustomerAdvanceRecord } from '@shared/types/advance'
import type { MetalExchangeRecord } from '@shared/types/metalExchange'
import type { SalesInvoiceRecord } from '@shared/types/salesInvoice'
import type { PricingResult } from '@shared/types/pricing'
import { roundNumber } from '@shared/jewelleryFormula'

export function usePosBilling() {
  const [customer, setCustomer] = useState<CustomerRecord | null>(null)
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
  const [isCalculating, setIsCalculating] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [completedInvoice, setCompletedInvoice] = useState<SalesInvoiceRecord | null>(null)

  const calculationReqId = useRef(0)

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
      try {
        const currentReq = ++calculationReqId.current
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
          pricingResult: res
        }
      } catch (err: any) {
        console.error('Error calculating item price:', err)
        return item
      }
    },
    [metalType]
  )

  // 3. Add Item to POS bill
  const addItem = useCallback(
    async (rawItem: Partial<PosBillItem> & { itemId: string; itemName: string; grossWeight: number }) => {
      setIsCalculating(true)
      try {
        const newItem: PosBillItem = {
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
          taxPercent: rawItem.taxPercent || 0
        }

        const calculated = await recalculateItemPrice(newItem)
        setItems((prev) => [...prev, calculated])
      } finally {
        setIsCalculating(false)
      }
    },
    [metalType, recalculateItemPrice]
  )

  // 4. Update Item
  const updateItem = useCallback(
    async (id: string, updates: Partial<PosBillItem>) => {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...updates } : it))
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

  // 6. Load Customer Order
  const loadOrder = useCallback(
    async (orderId: string) => {
      setIsCalculating(true)
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
            taxPercent: oi.taxPercent
          }))

          const recalculated = await Promise.all(mappedItems.map(recalculateItemPrice))
          setItems(recalculated)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load order')
      } finally {
        setIsCalculating(false)
      }
    },
    [recalculateItemPrice]
  )

  // 7. Derived Totals & Reconciled Calculation
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

    // Selected Advance Total
    const totalAdvanceApplied = availableAdvances
      .filter((a) => selectedAdvanceIds.includes(a.id))
      .reduce((sum, a) => roundNumber(sum + a.unallocatedAmount, 2), 0)
    const advanceDeducted = Math.min(grandTotal, totalAdvanceApplied)

    // Selected Exchange Total
    const totalExchangeApplied = availableExchanges
      .filter((e) => selectedExchangeIds.includes(e.id))
      .reduce((sum, e) => roundNumber(sum + e.exchangeAmount, 2), 0)
    const exchangeDeducted = Math.min(roundNumber(grandTotal - advanceDeducted, 2), totalExchangeApplied)

    const netPayable = Math.max(0, roundNumber(grandTotal - advanceDeducted - exchangeDeducted, 2))

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
      totalTaxable,
      totalTax,
      grandTotal,
      advanceDeducted,
      exchangeDeducted,
      netPayable,
      totalPaid,
      balanceDue
    }
  }, [items, availableAdvances, selectedAdvanceIds, availableExchanges, selectedExchangeIds, payments])

  // 8. Auto-fill payment amount when single payment line is untouched
  useEffect(() => {
    if (payments.length === 1 && payments[0].amount === 0 && summary.netPayable > 0) {
      setPayments([{ ...payments[0], amount: summary.netPayable }])
    }
  }, [summary.netPayable])

  // 9. Payment Helpers
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

  // 10. Complete Sale Submission
  const submitSale = useCallback(async () => {
    if (!customer?.accountId) {
      setError('Please select a valid customer with an active account')
      return null
    }
    if (items.length === 0) {
      setError('Please add at least one item to the sales invoice')
      return null
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const payload = {
        customerId: customer.id,
        accountId: customer.accountId,
        orderId: order?.id || undefined,
        metalType,
        notes,
        advanceIds: selectedAdvanceIds,
        metalExchangeIds: selectedExchangeIds,
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

      const invoice: SalesInvoiceRecord = await window.api.salesInvoices.create(payload)
      setCompletedInvoice(invoice)
      return invoice
    } catch (err: any) {
      console.error('Sale checkout failed:', err)
      setError(err.message || 'Failed to complete sales invoice')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [customer, items, order, metalType, notes, selectedAdvanceIds, selectedExchangeIds, payments])

  // 11. Reset POS
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
    setError(null)
    setCompletedInvoice(null)
  }, [])

  return {
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
    notes,
    setNotes,
    summary,
    isCalculating,
    isSubmitting,
    error,
    setError,
    completedInvoice,
    submitSale,
    resetPos
  }
}
