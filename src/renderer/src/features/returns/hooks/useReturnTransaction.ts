import { useState, useCallback, useMemo, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type {
  ReturnType,
  ReturnRecord,
  ReturnableInvoiceItem,
  ReturnRefundPayload
} from '@shared/types/returnTransaction'
import type { SelectedReturnItem, ReturnLifecycleStage } from '../types'
import { roundNumber } from '@shared/jewelleryFormula'

function getTodayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useReturnTransaction(returnType: ReturnType) {
  const [originalInvoice, setOriginalInvoice] = useState<any | null>(null)
  const [returnableItems, setReturnableItems] = useState<ReturnableInvoiceItem[]>([])
  const [selectedItems, setSelectedItems] = useState<SelectedReturnItem[]>([])
  const [refunds, setRefunds] = useState<(ReturnRefundPayload & { id: string })[]>([])
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [returnDate, setReturnDate] = useState<string>(getTodayISO())
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [completedReturn, setCompletedReturn] = useState<ReturnRecord | null>(null)

  const isSubmittingRef = useRef(false)

  // 1. Load Original Invoice & Fetch Returnable Items
  const selectInvoice = useCallback(
    async (invoice: any) => {
      setOriginalInvoice(invoice)
      setSelectedItems([])
      setRefunds([])
      setError(null)
      setCompletedReturn(null)

      try {
        const items: ReturnableInvoiceItem[] = await window.api.returns.getReturnableItems({
          invoiceId: invoice.id,
          returnType
        })
        setReturnableItems(items)
      } catch (err: any) {
        console.error('Failed to load returnable items:', err)
        setError(err.message || 'Failed to load returnable items')
        setReturnableItems([])
      }
    },
    [returnType]
  )

  // 2. Toggle or update return item
  const setItemReturnQuantity = useCallback(
    (item: ReturnableInvoiceItem, returnPcs: number, grossWeight?: number) => {
      if (returnPcs <= 0) {
        setSelectedItems((prev) => prev.filter((it) => it.originalItemId !== item.invoiceItemId))
        return
      }

      const clampedPcs = Math.min(item.returnablePcs, returnPcs)
      const calculatedWeight =
        grossWeight !== undefined
          ? Math.min(item.returnableGrossWeight, grossWeight)
          : roundNumber((item.originalGrossWeight / item.originalPcs) * clampedPcs, 3)

      const lineTotal = roundNumber(item.unitLineTotal * clampedPcs, 2)

      setSelectedItems((prev) => {
        const idx = prev.findIndex((it) => it.originalItemId === item.invoiceItemId)
        const newItem: SelectedReturnItem = {
          originalItemId: item.invoiceItemId,
          itemId: item.itemId,
          itemName: item.itemName,
          itemCode: item.itemCode,
          description: item.description,
          stampId: item.stampId,
          designId: item.designId,
          barcode: item.barcode,
          returnPcs: clampedPcs,
          grossWeight: calculatedWeight,
          originalPcs: item.originalPcs,
          returnablePcs: item.returnablePcs,
          originalGrossWeight: item.originalGrossWeight,
          returnableGrossWeight: item.returnableGrossWeight,
          unitLineTotal: item.unitLineTotal,
          calculatedLineTotal: lineTotal,
          metalType: item.metalType,
          goldRate: item.goldRate,
          purityName: item.purityName
        }

        if (idx >= 0) {
          return prev.map((it, i) => (i === idx ? newItem : it))
        } else {
          return [...prev, newItem]
        }
      })
    },
    []
  )

  // 3. Derived Return Summary
  const summary = useMemo(() => {
    let totalPcs = 0
    let totalGrossWeight = 0
    let returnTotal = 0

    for (const it of selectedItems) {
      totalPcs += it.returnPcs
      totalGrossWeight = roundNumber(totalGrossWeight + it.grossWeight, 3)
      returnTotal = roundNumber(returnTotal + it.calculatedLineTotal, 2)
    }

    const totalRefund = refunds.reduce((sum, r) => roundNumber(sum + Number(r.amount || 0), 2), 0)
    const adjustmentAmount = Math.max(0, roundNumber(returnTotal - totalRefund, 2))

    return {
      totalPcs,
      totalGrossWeight,
      returnTotal,
      totalRefund,
      adjustmentAmount
    }
  }, [selectedItems, refunds])

  // 4. Refund helpers
  const addRefundLine = useCallback(() => {
    const remaining = summary.adjustmentAmount
    setRefunds((prev) => [
      ...prev,
      { id: uuidv4(), paymentMethod: 'CASH', amount: remaining > 0 ? remaining : 0, paymentReference: '', notes: '' }
    ])
  }, [summary.adjustmentAmount])

  const updateRefundLine = useCallback((id: string, updates: Partial<ReturnRefundPayload>) => {
    setRefunds((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }, [])

  const removeRefundLine = useCallback((id: string) => {
    setRefunds((prev) => prev.filter((r) => r.id !== id))
  }, [])

  // 5. Lifecycle Stage
  const lifecycleStage: ReturnLifecycleStage = useMemo(() => {
    if (completedReturn) return 'COMPLETED'
    if (isSubmitting) return 'PROCESSING'
    if (error) return 'ERROR'
    if (!originalInvoice) return 'SELECT_INVOICE'
    if (selectedItems.length === 0) return 'SELECT_ITEMS'
    if (refunds.some((r) => r.amount > 0)) return 'REFUND_ENTRY'
    return 'ITEMS_SELECTED'
  }, [completedReturn, isSubmitting, error, originalInvoice, selectedItems.length, refunds])

  const hasUnsavedChanges = useMemo(
    () => (originalInvoice !== null || selectedItems.length > 0) && completedReturn === null,
    [originalInvoice, selectedItems.length, completedReturn]
  )

  // 6. Submit Return
  const submitReturn = useCallback(async () => {
    if (isSubmittingRef.current) return null

    if (!originalInvoice) {
      setError('Please select an original invoice')
      return null
    }
    if (selectedItems.length === 0) {
      setError('Please select at least one item to return')
      return null
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setError(null)
    try {
      const payload = {
        returnType,
        returnDate,
        originalInvoiceId: originalInvoice.id,
        reason,
        notes,
        items: selectedItems.map((it) => ({
          originalItemId: it.originalItemId,
          itemId: it.itemId,
          description: it.description,
          stampId: it.stampId,
          designId: it.designId,
          barcode: it.barcode,
          returnPcs: it.returnPcs,
          grossWeight: it.grossWeight,
          lessWeight: 0
        })),
        refunds: refunds
          .filter((r) => r.amount > 0)
          .map((r) => ({
            paymentMethod: r.paymentMethod,
            amount: r.amount,
            paymentReference: r.paymentReference,
            notes: r.notes
          }))
      }

      const result: ReturnRecord = await window.api.returns.create(payload)

      if (!result || !result.id || !result.returnNumber) {
        throw new Error('Backend returned invalid return confirmation')
      }

      setCompletedReturn(result)
      return result
    } catch (err: any) {
      console.error('Return submission failed:', err)
      setError(err.message || 'Failed to complete return transaction')
      return null
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }, [returnType, returnDate, originalInvoice, selectedItems, refunds, reason, notes])

  // 7. Reset Return
  const resetReturn = useCallback(() => {
    setOriginalInvoice(null)
    setReturnableItems([])
    setSelectedItems([])
    setRefunds([])
    setReason('')
    setNotes('')
    setReturnDate(getTodayISO())
    setError(null)
    setCompletedReturn(null)
    isSubmittingRef.current = false
    setIsSubmitting(false)
  }, [])

  return {
    returnType,
    lifecycleStage,
    originalInvoice,
    selectInvoice,
    returnableItems,
    selectedItems,
    setItemReturnQuantity,
    refunds,
    addRefundLine,
    updateRefundLine,
    removeRefundLine,
    reason,
    setReason,
    notes,
    setNotes,
    returnDate,
    setReturnDate,
    summary,
    hasUnsavedChanges,
    isSubmitting,
    error,
    setError,
    completedReturn,
    submitReturn,
    resetReturn
  }
}
