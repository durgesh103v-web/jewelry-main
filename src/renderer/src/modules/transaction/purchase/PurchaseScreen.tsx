import React, { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import PurchasePrintPreview from './PurchasePrintPreview'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import {
  calculateFine,
  calculateHishob,
  calculateSaleItemTotals,
  type LabourRateType
} from '../../../utils/jewelleryFormula'

type AlertType = 'success' | 'error' | 'warning'
type MetalType = 'Gold' | 'Silver' | 'Diamond' | 'Other'

type Balance = {
  goldFine: number
  silverFine: number
  cash: number
  bank: number
  anamat: number
}

type PurchaseItemLine = {
  lineNo: number
  itemId: string
  stampId: string
  stampName?: string
  designId: string
  designName?: string
  itemName: string
  barcode: string
  remark: string
  pcs: number
  grossWeight: number
  packWeight: number
  lessWeight: number
  addWeight: number
  netWeight: number
  tunch: number
  wastage: number
  hishob: number
  labourRate: number
  labourRateType: LabourRateType
  fine: number
  majuri: number
}

type PurchasePaymentLine = {
  lineNo: number
  type: string
  details: string
  pcs: number
  weight: number
  tanch: number
  wastage: number
  hishob: number
  fine: number
  rate: number
  fineAmount: number
  anamat: number
  cash: number
  bank: number
}

const emptyBalance: Balance = { goldFine: 0, silverFine: 0, cash: 0, bank: 0, anamat: 0 }

const initialItemForm = {
  itemId: '',
  stampId: '',
  designId: '',
  barcode: '',
  remark: '',
  pcs: '',
  grossWeight: '',
  packWeight: '',
  addWeight: '',
  tunch: '',
  wastage: '',
  labourRate: '',
  labourRateType: 'Kg' as LabourRateType
}

const initialPaymentForm = {
  type: 'CASH NAVE',
  details: '',
  pcs: '',
  weight: '',
  tanch: '',
  wastage: '',
  rate: '',
  fineAmount: '',
  anamat: '',
  cash: '',
  bank: ''
}

function getTodayDate(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toNumber(value: string | number): number {
  if (value === '') return 0
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function isValidAmountInput(value: string): boolean {
  return /^-?\d*\.?\d*$/.test(value)
}

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function formatDate(value: string): string {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function getLabourRateType(value: string): LabourRateType {
  if (value === 'Gm' || value === 'Pcs') return value
  return 'Kg'
}

function PurchaseScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [purchaseNo, setPurchaseNo] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(getTodayDate())
  const [accountId, setAccountId] = useState('')
  const [phone, setPhone] = useState('')
  const [metalType, setMetalType] = useState<MetalType>('Silver')
  const [reminderDate, setReminderDate] = useState('')
  const [haste, setHaste] = useState('')
  const [dpNo, setDpNo] = useState('')
  const [narration, setNarration] = useState('')

  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [items, setItems] = useState<ItemRecord[]>([])
  const [stamps, setStamps] = useState<ItemStampRecord[]>([])
  const [designs, setDesigns] = useState<ItemDesignRecord[]>([])
  const [recentPurchases, setRecentPurchases] = useState<any[]>([])

  const [itemForm, setItemForm] = useState(initialItemForm)
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm)
  const [itemLines, setItemLines] = useState<PurchaseItemLine[]>([])
  const [paymentLines, setPaymentLines] = useState<PurchasePaymentLine[]>([])
  const [oldBalance, setOldBalance] = useState<Balance>(emptyBalance)

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [savedPurchase, setSavedPurchase] = useState<SavedPurchaseRecord | null>(null)
  const [itemDeleteIndex, setItemDeleteIndex] = useState<number | null>(null)
  const [paymentDeleteIndex, setPaymentDeleteIndex] = useState<number | null>(null)

  const [searchPurchaseText, setSearchPurchaseText] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const accountSelectRef = useRef<HTMLSelectElement | null>(null)
  const itemSelectRef = useRef<HTMLSelectElement | null>(null)
  const pcsInputRef = useRef<HTMLInputElement | null>(null)

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId),
    [accounts, accountId]
  )
  const activeAccounts = useMemo(() => accounts.filter((account) => account.active), [accounts])
  const filteredItems = useMemo(
    () => items.filter((item) => item.metalType === metalType && item.active),
    [items, metalType]
  )
  const filteredStamps = useMemo(
    () => stamps.filter((stamp) => stamp.metalType === metalType && stamp.active),
    [stamps, metalType]
  )
  const filteredDesigns = useMemo(
    () => designs.filter((design) => design.metalType === metalType && design.active),
    [designs, metalType]
  )

  const itemPreview = useMemo(() => {
    return calculateSaleItemTotals({
      pcs: toNumber(itemForm.pcs),
      grossWeight: toNumber(itemForm.grossWeight),
      addWeight: toNumber(itemForm.addWeight),
      packWeight: toNumber(itemForm.packWeight),
      tunch: toNumber(itemForm.tunch),
      wastage: toNumber(itemForm.wastage),
      labourRate: toNumber(itemForm.labourRate),
      labourRateType: itemForm.labourRateType
    })
  }, [itemForm])

  const paymentPreview = useMemo(() => {
    const hishob = calculateHishob(toNumber(paymentForm.tanch), toNumber(paymentForm.wastage))
    const fine = calculateFine(
      toNumber(paymentForm.weight),
      toNumber(paymentForm.tanch),
      toNumber(paymentForm.wastage)
    )
    return { hishob, fine }
  }, [paymentForm])

  const totals = useMemo(() => {
    const itemPcsTotal = itemLines.reduce((sum, line) => sum + Number(line.pcs || 0), 0)
    const itemGrossTotal = itemLines.reduce((sum, line) => sum + Number(line.grossWeight || 0), 0)
    const itemNetTotal = itemLines.reduce((sum, line) => sum + Number(line.netWeight || 0), 0)
    const itemFineTotal = itemLines.reduce((sum, line) => sum + Number(line.fine || 0), 0)
    const itemMajuriTotal = itemLines.reduce((sum, line) => sum + Number(line.majuri || 0), 0)

    const paymentFineNaveTotal = paymentLines.reduce((sum, line) => sum + Number(line.fine || 0), 0)
    const paymentCashNaveTotal = paymentLines.reduce((sum, line) => sum + Number(line.cash || 0), 0)
    const paymentBankNaveTotal = paymentLines.reduce((sum, line) => sum + Number(line.bank || 0), 0)
    const paymentAnamatNaveTotal = paymentLines.reduce(
      (sum, line) => sum + Number(line.anamat || 0),
      0
    )

    const closingGoldFine =
      metalType === 'Gold'
        ? oldBalance.goldFine - itemFineTotal + paymentFineNaveTotal
        : oldBalance.goldFine
    const closingSilverFine =
      metalType === 'Silver'
        ? oldBalance.silverFine - itemFineTotal + paymentFineNaveTotal
        : oldBalance.silverFine
    const closingCash = oldBalance.cash - itemMajuriTotal + paymentCashNaveTotal
    const closingBank = oldBalance.bank + paymentBankNaveTotal
    const closingAnamat = oldBalance.anamat + paymentAnamatNaveTotal

    return {
      itemPcsTotal,
      itemGrossTotal,
      itemNetTotal,
      itemFineTotal,
      itemMajuriTotal,
      paymentFineNaveTotal,
      paymentCashNaveTotal,
      paymentBankNaveTotal,
      paymentAnamatNaveTotal,
      closingGoldFine,
      closingSilverFine,
      closingCash,
      closingBank,
      closingAnamat
    }
  }, [itemLines, paymentLines, oldBalance, metalType])

  const filteredPurchases = useMemo(() => {
    const q = searchPurchaseText.trim().toLowerCase()
    if (!q) return recentPurchases

    return recentPurchases.filter((p: any) => {
      return (
        (p.purchase_no || '').toLowerCase().includes(q) ||
        (p.account_name || '').toLowerCase().includes(q) ||
        (p.mobile_number || '').toLowerCase().includes(q) ||
        (p.metal_type || '').toLowerCase().includes(q) ||
        (p.purchase_date || '').toLowerCase().includes(q)
      )
    })
  }, [recentPurchases, searchPurchaseText])

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 3000)
  }, [])

  const loadAccountBalance = useCallback(
    async (selectedAccountId: string): Promise<void> => {
      if (!selectedAccountId) {
        setOldBalance(emptyBalance)
        return
      }

      try {
        const balance = await window.api.purchases.getAccountBalance(selectedAccountId)
        setOldBalance(balance)
      } catch (error) {
        showAlert('error', getFriendlyErrorMessage(error))
      }
    },
    [showAlert]
  )

  const loadRecentPurchases = useCallback(async (): Promise<void> => {
    try {
      if (window.api.purchases.list) {
        const list = await window.api.purchases.list()
        setRecentPurchases(list || [])
      }
    } catch {
      // ignore
    }
  }, [])

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const [nextNo, accountData, itemData, stampData, designData] = await Promise.all([
        window.api.purchases.getNextNumber(),
        window.api.accounts.list(),
        window.api.items.list(),
        window.api.itemStamps.list(),
        window.api.itemDesigns.list()
      ])

      setPurchaseNo(nextNo)
      setAccounts(accountData)
      setItems(itemData)
      setStamps(stampData)
      setDesigns(designData)
      await loadRecentPurchases()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert, loadRecentPurchases])

  const handleAccountChange = (selectedAccountId: string): void => {
    setAccountId(selectedAccountId)
    const account = accounts.find((item) => item.id === selectedAccountId)
    setPhone(account?.mobileNumber || '')
    void loadAccountBalance(selectedAccountId)
  }

  const handleMetalChange = (value: MetalType): void => {
    if (metalType === value) return
    setMetalType(value)
    setItemForm(initialItemForm)
    if (itemLines.length === 0) {
      setPaymentLines([])
    }
  }

  const handleNumberChange = (value: string, setter: (value: string) => void): void => {
    if (!isValidAmountInput(value)) return
    setter(value)
  }

  const handleItemChange = (selectedItemId: string): void => {
    const selectedItem = items.find((item) => item.id === selectedItemId)

    setItemForm((current) => ({
      ...current,
      itemId: selectedItemId,
      stampId: selectedItem?.defaultStampId || '',
      designId: selectedItem?.defaultDesignId || '',
      barcode: current.barcode || (selectedItem as any)?.barcodeValue || (selectedItem as any)?.barcode || '',
      packWeight: String(selectedItem?.fixedWeightPerPcs || ''),
      tunch: String(selectedItem?.defaultTanch || ''),
      wastage: String(selectedItem?.defaultWastage || ''),
      labourRate: String(selectedItem?.defaultLabourRate || ''),
      labourRateType: getLabourRateType(selectedItem?.labourRateType || 'Kg')
    }))
  }

  const handleBarcodeKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && itemForm.barcode.trim()) {
      e.preventDefault()
      const query = itemForm.barcode.trim().toLowerCase()
      const matched = filteredItems.find(
        (item) =>
          item.itemName.toLowerCase() === query ||
          (item as any).barcodeValue?.toLowerCase() === query ||
          (item as any).barcode?.toLowerCase() === query
      )
      if (matched) {
        handleItemChange(matched.id)
        showAlert('success', `Item selected: ${matched.itemName}`)
        pcsInputRef.current?.focus()
      } else {
        showAlert('warning', `No item matching barcode "${itemForm.barcode}"`)
      }
    }
  }

  const addItemLine = (): void => {
    if (!itemForm.itemId) {
      showAlert('warning', 'Please select item.')
      itemSelectRef.current?.focus()
      return
    }

    if (toNumber(itemForm.pcs) <= 0) {
      showAlert('warning', 'Please enter pcs.')
      pcsInputRef.current?.focus()
      return
    }

    if (toNumber(itemForm.grossWeight) <= 0) {
      showAlert('warning', 'Please enter gross weight.')
      return
    }

    const selectedItem = items.find((item) => item.id === itemForm.itemId)
    const selectedStamp = stamps.find((s) => s.id === itemForm.stampId)
    const selectedDesign = designs.find((d) => d.id === itemForm.designId)

    if (!selectedItem) {
      showAlert('warning', 'Selected item not found.')
      return
    }

    setItemLines((current) => [
      ...current,
      {
        lineNo: current.length + 1,
        itemId: itemForm.itemId,
        stampId: itemForm.stampId,
        stampName: selectedStamp?.stampName || '',
        designId: itemForm.designId,
        designName: selectedDesign?.designName || '',
        itemName: selectedItem.itemName,
        barcode: itemForm.barcode,
        remark: itemForm.remark,
        pcs: toNumber(itemForm.pcs),
        grossWeight: toNumber(itemForm.grossWeight),
        packWeight: toNumber(itemForm.packWeight),
        lessWeight: itemPreview.lessWeight,
        addWeight: toNumber(itemForm.addWeight),
        netWeight: itemPreview.netWeight,
        tunch: toNumber(itemForm.tunch),
        wastage: toNumber(itemForm.wastage),
        hishob: itemPreview.hishob,
        labourRate: toNumber(itemForm.labourRate),
        labourRateType: itemForm.labourRateType,
        fine: itemPreview.fine,
        majuri: itemPreview.majuri
      }
    ])
    setItemForm(initialItemForm)
    itemSelectRef.current?.focus()
  }

  const removeItemLine = (lineNo: number): void => {
    setItemLines((current) =>
      current
        .filter((line) => line.lineNo !== lineNo)
        .map((line, index) => ({ ...line, lineNo: index + 1 }))
    )
    setItemDeleteIndex(null)
  }

  const addPaymentLine = (): void => {
    const hasValue =
      toNumber(paymentForm.weight) > 0 ||
      toNumber(paymentForm.cash) > 0 ||
      toNumber(paymentForm.bank) > 0 ||
      toNumber(paymentForm.anamat) > 0

    if (!hasValue) {
      showAlert('warning', 'Please enter payment fine/cash/bank/anamat.')
      return
    }

    setPaymentLines((current) => [
      ...current,
      {
        lineNo: current.length + 1,
        type: paymentForm.type,
        details: paymentForm.details,
        pcs: toNumber(paymentForm.pcs),
        weight: toNumber(paymentForm.weight),
        tanch: toNumber(paymentForm.tanch),
        wastage: toNumber(paymentForm.wastage),
        hishob: paymentPreview.hishob,
        fine: paymentPreview.fine,
        rate: toNumber(paymentForm.rate),
        fineAmount: toNumber(paymentForm.fineAmount),
        anamat: toNumber(paymentForm.anamat),
        cash: toNumber(paymentForm.cash),
        bank: toNumber(paymentForm.bank)
      }
    ])
    setPaymentForm(initialPaymentForm)
  }

  const removePaymentLine = (lineNo: number): void => {
    setPaymentLines((current) =>
      current
        .filter((line) => line.lineNo !== lineNo)
        .map((line, index) => ({ ...line, lineNo: index + 1 }))
    )
    setPaymentDeleteIndex(null)
  }

  const resetPurchase = useCallback(async (): Promise<void> => {
    setPurchaseDate(getTodayDate())
    setAccountId('')
    setPhone('')
    setMetalType('Silver')
    setReminderDate('')
    setHaste('')
    setDpNo('')
    setNarration('')
    setItemForm(initialItemForm)
    setPaymentForm(initialPaymentForm)
    setItemLines([])
    setPaymentLines([])
    setOldBalance(emptyBalance)

    const nextNo = await window.api.purchases.getNextNumber()
    setPurchaseNo(nextNo)
    accountSelectRef.current?.focus()
  }, [])

  const handleSave = async (): Promise<void> => {
    if (!purchaseDate) {
      showAlert('warning', 'Please select purchase date.')
      return
    }

    if (!accountId) {
      showAlert('warning', 'Please select supplier account.')
      accountSelectRef.current?.focus()
      return
    }

    if (itemLines.length === 0) {
      showAlert('warning', 'Please add at least one purchase item line.')
      itemSelectRef.current?.focus()
      return
    }

    try {
      setSaving(true)

      const saved = await window.api.purchases.create({
        purchaseNo,
        purchaseDate,
        accountId,
        phone,
        metalType,
        haste,
        dpNo,
        narration,
        reminderDate,
        itemLines: itemLines.map((line) => ({
          itemId: line.itemId,
          stampId: line.stampId,
          designId: line.designId,
          barcode: line.barcode,
          remark: line.remark,
          pcs: line.pcs,
          grossWeight: line.grossWeight,
          packWeight: line.packWeight,
          addWeight: line.addWeight,
          tunch: line.tunch,
          wastage: line.wastage,
          labourRate: line.labourRate,
          labourRateType: line.labourRateType
        })),
        paymentLines: paymentLines.map((line) => ({
          type: line.type,
          details: line.details,
          pcs: line.pcs,
          weight: line.weight,
          tanch: line.tanch,
          wastage: line.wastage,
          rate: line.rate,
          fineAmount: line.fineAmount,
          anamat: line.anamat,
          cash: line.cash,
          bank: line.bank
        }))
      })

      setSavedPurchase(saved)
      showAlert('success', `Purchase bill ${purchaseNo} saved successfully.`)
      await resetPurchase()
      await loadRecentPurchases()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleViewPurchase = async (recordId: string): Promise<void> => {
    try {
      const record = await window.api.purchases.getById(recordId)
      setSavedPurchase(record)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadInitialData()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadInitialData])

  return (
    <div className="h-full flex flex-col bg-[var(--color-background-app,#f8fafc)] text-slate-900 overflow-hidden font-sans select-none">
      {/* ── TOP HEADER BAR ── */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-xs shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            📥
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Purchase Transaction</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 font-mono font-bold">
                {purchaseNo || 'NEW'}
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Wholesale bullion &amp; ornament purchase inward with supplier Jama / Nave ledger integration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {itemLines.length > 0 && (
            <button
              type="button"
              onClick={() => void resetPurchase()}
              className="h-8 px-3 text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              ✕ Clear Form
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
              title="Close Tab"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Global Alert Notification */}
      <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

      {/* ── MAIN SCROLLABLE CONTENT WORKSPACE ── */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* Top Section: Two-Column Form & Summary */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          {/* Left Column (8 cols): Header & Item Entry & Tables */}
          <div className="xl:col-span-8 flex flex-col gap-4">
            {/* Purchase Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Purchase Header
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Metal:</span>
                  <div className="inline-flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                    {(['Gold', 'Silver', 'Diamond', 'Other'] as MetalType[]).map((m) => {
                      const isSelected = metalType === m
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleMetalChange(m)}
                          className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors duration-100 cursor-pointer flex items-center border ${
                            isSelected
                              ? 'bg-white text-amber-800 shadow-2xs border-slate-200/90 font-bold'
                              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                          }`}
                        >
                          {m}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    Purchase No
                  </label>
                  <input
                    value={purchaseNo}
                    onChange={(e) => setPurchaseNo(e.target.value)}
                    className="w-full h-8.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    Date
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    Supplier Account *
                  </label>
                  <select
                    ref={accountSelectRef}
                    value={accountId}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
                  >
                    <option value="">Select Supplier</option>
                    {activeAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    Phone No
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Supplier contact"
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    Reminder Date
                  </label>
                  <input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    Haste (Agent / Bearer)
                  </label>
                  <input
                    value={haste}
                    onChange={(e) => setHaste(e.target.value)}
                    placeholder="Courier / person name"
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    DP / Invoice No
                  </label>
                  <input
                    value={dpNo}
                    onChange={(e) => setDpNo(e.target.value)}
                    placeholder="Supplier bill reference"
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    Narration
                  </label>
                  <input
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    placeholder="Remarks / lot notes"
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Item Entry Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Purchase Item Entry
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  Scan barcode or select ornament from inventory master
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2.5 items-end">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Barcode
                  </label>
                  <input
                    value={itemForm.barcode}
                    onChange={(e) => setItemForm((c) => ({ ...c, barcode: e.target.value }))}
                    onKeyDown={handleBarcodeKeyDown}
                    placeholder="Scan & ↵"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Item *
                  </label>
                  <select
                    ref={itemSelectRef}
                    value={itemForm.itemId}
                    onChange={(e) => handleItemChange(e.target.value)}
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  >
                    <option value="">Select Item</option>
                    {filteredItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.itemName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Stamp
                  </label>
                  <select
                    value={itemForm.stampId}
                    onChange={(e) => setItemForm((c) => ({ ...c, stampId: e.target.value }))}
                    className="w-full h-8 px-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  >
                    <option value="">None</option>
                    {filteredStamps.map((stamp) => (
                      <option key={stamp.id} value={stamp.id}>
                        {stamp.stampName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Design
                  </label>
                  <select
                    value={itemForm.designId}
                    onChange={(e) => setItemForm((c) => ({ ...c, designId: e.target.value }))}
                    className="w-full h-8 px-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  >
                    <option value="">None</option>
                    {filteredDesigns.map((design) => (
                      <option key={design.id} value={design.id}>
                        {design.designName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Pcs *
                  </label>
                  <input
                    ref={pcsInputRef}
                    value={itemForm.pcs}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setItemForm((c) => ({ ...c, pcs: v })))}
                    placeholder="0"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Gr. Wt *
                  </label>
                  <input
                    value={itemForm.grossWeight}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setItemForm((c) => ({ ...c, grossWeight: v })))}
                    placeholder="0.000"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Pack Wt
                  </label>
                  <input
                    value={itemForm.packWeight}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setItemForm((c) => ({ ...c, packWeight: v })))}
                    placeholder="0.000"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Less Wt
                  </label>
                  <input
                    value={formatNumber(itemPreview.lessWeight)}
                    disabled
                    className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-slate-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Add Wt
                  </label>
                  <input
                    value={itemForm.addWeight}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setItemForm((c) => ({ ...c, addWeight: v })))}
                    placeholder="0.000"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                    Net Wt
                  </label>
                  <input
                    value={formatNumber(itemPreview.netWeight)}
                    disabled
                    className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Tunch %
                  </label>
                  <input
                    value={itemForm.tunch}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setItemForm((c) => ({ ...c, tunch: v })))}
                    placeholder="91.6"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Wstg %
                  </label>
                  <input
                    value={itemForm.wastage}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setItemForm((c) => ({ ...c, wastage: v })))}
                    placeholder="0.00"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Hishob
                  </label>
                  <input
                    value={formatNumber(itemPreview.hishob)}
                    disabled
                    className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-slate-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-amber-800 block mb-1 uppercase tracking-wider">
                    Fine (Jama)
                  </label>
                  <input
                    value={formatNumber(itemPreview.fine)}
                    disabled
                    className="w-full h-8 px-2 text-xs bg-amber-50 border border-amber-200 rounded-lg text-right font-mono text-amber-900 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Lab Rate
                  </label>
                  <input
                    value={itemForm.labourRate}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setItemForm((c) => ({ ...c, labourRate: v })))}
                    placeholder="0.00"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Lab Type
                  </label>
                  <select
                    value={itemForm.labourRateType}
                    onChange={(e) =>
                      setItemForm((c) => ({
                        ...c,
                        labourRateType: getLabourRateType(e.target.value)
                      }))
                    }
                    className="w-full h-8 px-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  >
                    <option value="Kg">Kg</option>
                    <option value="Gm">Gm</option>
                    <option value="Pcs">Pcs</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                    Majuri
                  </label>
                  <input
                    value={formatNumber(itemPreview.majuri)}
                    disabled
                    className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-slate-800 font-bold"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Remark
                  </label>
                  <input
                    value={itemForm.remark}
                    onChange={(e) => setItemForm((c) => ({ ...c, remark: e.target.value }))}
                    placeholder="Supplier lot / purity note"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={addItemLine}
                  className="h-9 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  style={{ color: '#ffffff' }}
                >
                  <span>➕</span>
                  <span>Add Item to Purchase</span>
                </button>
                <button
                  type="button"
                  onClick={() => setItemForm(initialItemForm)}
                  className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Clear Fields
                </button>
              </div>
            </div>

            {/* Added Purchase Items Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Purchased Items ({itemLines.length})
                  </h2>
                </div>
                {itemLines.length > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold text-slate-700">
                      Net Wt: <strong className="font-mono text-slate-900">{formatNumber(totals.itemNetTotal)}</strong>
                    </span>
                    <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Fine: {formatNumber(totals.itemFineTotal)}
                    </span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto max-h-[280px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Barcode</th>
                      <th className="py-2.5 px-3">Stamp</th>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3">Design</th>
                      <th className="py-2.5 px-3 text-right">Pcs</th>
                      <th className="py-2.5 px-3 text-right">Gr. Wt</th>
                      <th className="py-2.5 px-3 text-right">Net Wt</th>
                      <th className="py-2.5 px-3 text-right">Tunch</th>
                      <th className="py-2.5 px-3 text-right">Wstg</th>
                      <th className="py-2.5 px-3 text-right text-amber-800 font-bold">Fine</th>
                      <th className="py-2.5 px-3 text-right">M. Rate</th>
                      <th className="py-2.5 px-3 text-right">Majuri</th>
                      <th className="py-2.5 px-3">Remark</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {itemLines.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="py-8 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className="text-2xl">📦</span>
                            <span className="font-semibold text-xs text-slate-500">
                              No purchase items added yet
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Use the item entry form above to add bullion or ornaments
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      itemLines.map((line) => (
                        <tr key={line.lineNo} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{line.lineNo}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{line.barcode || '-'}</td>
                          <td className="py-2 px-3 text-slate-600">{line.stampName || '-'}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{line.itemName}</td>
                          <td className="py-2 px-3 text-slate-600">{line.designName || '-'}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatNumber(line.pcs)}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatNumber(line.grossWeight)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatNumber(line.netWeight)}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatNumber(line.tunch)}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatNumber(line.wastage)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">{formatNumber(line.fine)}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatNumber(line.labourRate)}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">{formatNumber(line.majuri)}</td>
                          <td className="py-2 px-3 text-slate-500 text-[11px] max-w-[120px] truncate">{line.remark || '-'}</td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setItemDeleteIndex(line.lineNo)}
                              className="px-2 py-1 text-[11px] font-bold rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  {itemLines.length > 0 && (
                    <tfoot className="bg-slate-50 font-semibold text-slate-800 border-t-2 border-slate-200 sticky bottom-0">
                      <tr>
                        <td colSpan={5} className="py-2.5 px-3 text-right font-bold uppercase text-[11px] text-slate-600">
                          Total Summary:
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">{formatNumber(totals.itemPcsTotal)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">{formatNumber(totals.itemGrossTotal)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatNumber(totals.itemNetTotal)}</td>
                        <td colSpan={2}></td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">{formatNumber(totals.itemFineTotal)}</td>
                        <td></td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatNumber(totals.itemMajuriTotal)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Payment Nave Section Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-emerald-500 rounded-full inline-block" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Payment Nave (Outward Settlement)
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  Record fine gold/silver or cash/bank payments to supplier against this purchase
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-2.5 items-end">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Type *
                  </label>
                  <select
                    value={paymentForm.type}
                    onChange={(e) => setPaymentForm((c) => ({ ...c, type: e.target.value }))}
                    className="w-full h-8 px-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                  >
                    <option value="CASH NAVE">CASH NAVE</option>
                    <option value="BANK NAVE">BANK NAVE</option>
                    <option value="FINE NAVE">FINE NAVE</option>
                    <option value="ANAMAT NAVE">ANAMAT NAVE</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Weight
                  </label>
                  <input
                    value={paymentForm.weight}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setPaymentForm((c) => ({ ...c, weight: v })))}
                    placeholder="0.000"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Tanch %
                  </label>
                  <input
                    value={paymentForm.tanch}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setPaymentForm((c) => ({ ...c, tanch: v })))}
                    placeholder="0.00"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Wstg %
                  </label>
                  <input
                    value={paymentForm.wastage}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setPaymentForm((c) => ({ ...c, wastage: v })))}
                    placeholder="0.00"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-emerald-800 block mb-1 uppercase tracking-wider">
                    Fine (Nave)
                  </label>
                  <input
                    value={formatNumber(paymentPreview.fine)}
                    disabled
                    className="w-full h-8 px-2 text-xs bg-emerald-50 border border-emerald-200 rounded-lg text-right font-mono text-emerald-900 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Cash Amount
                  </label>
                  <input
                    value={paymentForm.cash}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setPaymentForm((c) => ({ ...c, cash: v })))}
                    placeholder="0.00"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Bank Amount
                  </label>
                  <input
                    value={paymentForm.bank}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setPaymentForm((c) => ({ ...c, bank: v })))}
                    placeholder="0.00"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Anamat
                  </label>
                  <input
                    value={paymentForm.anamat}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setPaymentForm((c) => ({ ...c, anamat: v })))}
                    placeholder="0.00"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Details / Ref
                  </label>
                  <input
                    value={paymentForm.details}
                    onChange={(e) => setPaymentForm((c) => ({ ...c, details: e.target.value }))}
                    placeholder="Cheque / RTGS / Note"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={addPaymentLine}
                  className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  style={{ color: '#ffffff' }}
                >
                  <span>➕</span>
                  <span>Add Payment Entry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentForm(initialPaymentForm)}
                  className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Clear Fields
                </button>
              </div>

              {/* Payment Lines Table */}
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 max-h-[220px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3 text-right">Weight</th>
                      <th className="py-2 px-3 text-right text-emerald-800 font-bold">Fine (Nave)</th>
                      <th className="py-2 px-3 text-right">Cash</th>
                      <th className="py-2 px-3 text-right">Bank</th>
                      <th className="py-2 px-3 text-right">Anamat</th>
                      <th className="py-2 px-3">Details</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {paymentLines.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-4 text-center text-slate-400">
                          No payment entries added yet.
                        </td>
                      </tr>
                    ) : (
                      paymentLines.map((line) => (
                        <tr key={line.lineNo} className="hover:bg-slate-50/70">
                          <td className="py-1.5 px-3 text-slate-400 font-mono text-[11px]">{line.lineNo}</td>
                          <td className="py-1.5 px-3 font-semibold text-slate-800">{line.type}</td>
                          <td className="py-1.5 px-3 text-right font-mono">{formatNumber(line.weight)}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-800">{formatNumber(line.fine)}</td>
                          <td className="py-1.5 px-3 text-right font-mono">{formatNumber(line.cash)}</td>
                          <td className="py-1.5 px-3 text-right font-mono">{formatNumber(line.bank)}</td>
                          <td className="py-1.5 px-3 text-right font-mono">{formatNumber(line.anamat)}</td>
                          <td className="py-1.5 px-3 text-slate-500 text-[11px] max-w-[120px] truncate">{line.details || '-'}</td>
                          <td className="py-1.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setPaymentDeleteIndex(line.lineNo)}
                              className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Supplier Balance & Actions Sidebar */}
          <div className="xl:col-span-4 flex flex-col gap-4">
            {/* Supplier Balance Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Supplier Balance
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-slate-900 truncate max-w-[150px]">
                  {selectedAccount?.accountName || 'No account selected'}
                </span>
              </div>

              {/* Balance Breakdown Section */}
              <div className="space-y-2 text-xs">
                {/* 1. Old Balances */}
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider pt-1">
                  Previous Balance (Jama / Nave)
                </div>
                <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>Old Gold Fine:</span>
                    <strong className="font-mono text-slate-900">{formatNumber(oldBalance.goldFine)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Old Silver Fine:</span>
                    <strong className="font-mono text-slate-900">{formatNumber(oldBalance.silverFine)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Old Cash:</span>
                    <strong className="font-mono text-slate-900">{formatNumber(oldBalance.cash)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Old Bank:</span>
                    <strong className="font-mono text-slate-900">{formatNumber(oldBalance.bank)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Old Anamat:</span>
                    <strong className="font-mono text-slate-900">{formatNumber(oldBalance.anamat)}</strong>
                  </div>
                </div>

                {/* 2. Current Inward Transaction Totals */}
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider pt-2">
                  Current Inward &amp; Payments
                </div>
                <div className="space-y-1 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/80">
                  <div className="flex justify-between text-amber-900">
                    <span>Purchase Fine (Jama):</span>
                    <strong className="font-mono text-amber-950 font-bold">{formatNumber(totals.itemFineTotal)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Purchase Majuri (Jama):</span>
                    <strong className="font-mono text-slate-900">{formatNumber(totals.itemMajuriTotal)}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span>Payment Fine (Nave):</span>
                    <strong className="font-mono text-emerald-950 font-bold">{formatNumber(totals.paymentFineNaveTotal)}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span>Payment Cash (Nave):</span>
                    <strong className="font-mono text-emerald-950 font-bold">{formatNumber(totals.paymentCashNaveTotal)}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span>Payment Bank (Nave):</span>
                    <strong className="font-mono text-emerald-950 font-bold">{formatNumber(totals.paymentBankNaveTotal)}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span>Payment Anamat (Nave):</span>
                    <strong className="font-mono text-emerald-950 font-bold">{formatNumber(totals.paymentAnamatNaveTotal)}</strong>
                  </div>
                </div>

                {/* 3. Final Closing Balances */}
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider pt-2">
                  Net Closing Balance
                </div>
                <div className="space-y-1.5 bg-slate-900 text-white p-3 rounded-xl shadow-xs">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">Closing Gold Fine:</span>
                    <strong className="font-mono text-amber-300 text-sm font-bold">
                      {formatNumber(totals.closingGoldFine)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">Closing Silver Fine:</span>
                    <strong className="font-mono text-slate-200 text-sm font-bold">
                      {formatNumber(totals.closingSilverFine)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">Closing Cash:</span>
                    <strong className="font-mono text-emerald-400 text-sm font-bold">
                      {formatNumber(totals.closingCash)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">Closing Bank:</span>
                    <strong className="font-mono text-sky-400 text-sm font-bold">
                      {formatNumber(totals.closingBank)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">Closing Anamat:</span>
                    <strong className="font-mono text-slate-300 text-sm font-bold">
                      {formatNumber(totals.closingAnamat)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || loading}
                  className="w-full h-10 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  style={{ color: '#ffffff' }}
                >
                  <span>💾</span>
                  <span>{saving ? 'Saving Purchase...' : 'Save & Post Purchase'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void resetPurchase()}
                  disabled={saving}
                  className="w-full h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span>✨</span>
                  <span>New Blank Purchase</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 font-medium leading-tight mt-3 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/60">
                💡 <strong>Ledger Rule:</strong> Purchase inward posts stock increase &amp; supplier Jama credit. Outward payment posts Nave debit to settle account.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Saved Purchases Register */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Recent Purchases Register
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <input
                  id="purchase-search"
                  value={searchPurchaseText}
                  onChange={(e) => setSearchPurchaseText(e.target.value)}
                  placeholder="Search bill no, supplier, phone..."
                  className="w-full h-8 px-2.5 pr-7 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                />
                {searchPurchaseText && (
                  <button
                    type="button"
                    onClick={() => setSearchPurchaseText('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => void loadRecentPurchases()}
                disabled={loading}
                className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>

              <div className="text-xs text-slate-500 font-medium">
                Showing: <strong className="text-amber-800">{filteredPurchases.length}</strong>
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Purchase No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Supplier Account</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Metal</th>
                  <th className="py-2.5 px-3 text-right">Fine Total</th>
                  <th className="py-2.5 px-3 text-right">Majuri Total</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {loading && recentPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400">
                      Loading purchases...
                    </td>
                  </tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400">
                      {searchPurchaseText ? 'No matching purchase found.' : 'No purchase records saved yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase, index) => (
                    <tr key={purchase.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-amber-800">{purchase.purchase_no}</td>
                      <td className="py-2 px-3 font-mono">{formatDate(purchase.purchase_date)}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{purchase.account_name}</td>
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{purchase.mobile_number || '-'}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {purchase.metal_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">
                        {formatNumber(purchase.item_fine_total || purchase.fine_total || 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                        {formatNumber(purchase.item_majuri_total || purchase.majuri_total || 0)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => void handleViewPurchase(purchase.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                        >
                          Print / View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <AppConfirmDialog
        open={itemDeleteIndex !== null}
        title="Remove Purchase Item Line?"
        message={`Are you sure you want to remove item line #${itemDeleteIndex} from this purchase?`}
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => {
          if (itemDeleteIndex !== null) removeItemLine(itemDeleteIndex)
        }}
        onCancel={() => setItemDeleteIndex(null)}
      />

      <AppConfirmDialog
        open={paymentDeleteIndex !== null}
        title="Remove Payment Entry?"
        message={`Are you sure you want to remove payment entry #${paymentDeleteIndex}?`}
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => {
          if (paymentDeleteIndex !== null) removePaymentLine(paymentDeleteIndex)
        }}
        onCancel={() => setPaymentDeleteIndex(null)}
      />

      {/* Print Preview Modal */}
      {savedPurchase && (
        <PurchasePrintPreview
          purchase={savedPurchase}
          autoPrintOnOpen={false}
          onClose={() => setSavedPurchase(null)}
        />
      )}
    </div>
  )
}

export default PurchaseScreen
