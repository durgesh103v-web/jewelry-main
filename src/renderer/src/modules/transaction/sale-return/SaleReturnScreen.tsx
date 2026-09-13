import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import {
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

type SaleReturnItemLine = {
  lineNo: number
  itemId: string
  stampId: string
  designId: string
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

const emptyBalance: Balance = { goldFine: 0, silverFine: 0, cash: 0, bank: 0, anamat: 0 }

const initialHeader = {
  returnNo: '',
  returnDate: getTodayDate(),
  accountId: '',
  phone: '',
  metalType: 'Silver' as MetalType,
  againstSaleId: '',
  narration: ''
}

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
  return /^\d*\.?\d*$/.test(value)
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

function SaleReturnScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [header, setHeader] = useState(initialHeader)
  const [itemForm, setItemForm] = useState(initialItemForm)

  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [items, setItems] = useState<ItemRecord[]>([])
  const [stamps, setStamps] = useState<ItemStampRecord[]>([])
  const [designs, setDesigns] = useState<ItemDesignRecord[]>([])
  const [sales, setSales] = useState<SaleRegisterRecord[]>([])
  const [returns, setReturns] = useState<SaleReturnRegisterRecord[]>([])

  const [itemLines, setItemLines] = useState<SaleReturnItemLine[]>([])
  const [oldBalance, setOldBalance] = useState<Balance>(emptyBalance)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [itemDeleteIndex, setItemDeleteIndex] = useState<number | null>(null)
  const [returnDeleteTarget, setReturnDeleteTarget] = useState<SaleReturnRegisterRecord | null>(
    null
  )
  const [detailRecord, setDetailRecord] = useState<SavedSaleReturnRecord | null>(null)

  const [searchText, setSearchText] = useState('')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [opening, setOpening] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === header.accountId),
    [accounts, header.accountId]
  )
  const activeAccounts = useMemo(() => accounts.filter((account) => account.active), [accounts])
  const filteredItems = useMemo(
    () => items.filter((item) => item.metalType === header.metalType && item.active),
    [items, header.metalType]
  )
  const filteredStamps = useMemo(
    () => stamps.filter((stamp) => stamp.metalType === header.metalType && stamp.active),
    [stamps, header.metalType]
  )
  const filteredDesigns = useMemo(
    () => designs.filter((design) => design.metalType === header.metalType && design.active),
    [designs, header.metalType]
  )
  const salesForAccount = useMemo(
    () => sales.filter((sale) => !header.accountId || sale.accountId === header.accountId),
    [sales, header.accountId]
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

  const totals = useMemo(() => {
    const itemFineTotal = itemLines.reduce((sum, line) => sum + Number(line.fine || 0), 0)
    const itemMajuriTotal = itemLines.reduce((sum, line) => sum + Number(line.majuri || 0), 0)
    const totalPcs = itemLines.reduce((sum, line) => sum + Number(line.pcs || 0), 0)
    const totalGross = itemLines.reduce((sum, line) => sum + Number(line.grossWeight || 0), 0)
    const totalNet = itemLines.reduce((sum, line) => sum + Number(line.netWeight || 0), 0)

    // Sale Return reverses a Sale's Nave (debit): it posts the same totals
    // as a Jama (credit), so they SUBTRACT from the balance the customer
    // owes instead of adding to it.
    const closingGoldFine =
      header.metalType === 'Gold' ? oldBalance.goldFine - itemFineTotal : oldBalance.goldFine
    const closingSilverFine =
      header.metalType === 'Silver' ? oldBalance.silverFine - itemFineTotal : oldBalance.silverFine
    const closingCash = oldBalance.cash - itemMajuriTotal

    return {
      totalPcs,
      totalGross,
      totalNet,
      itemFineTotal,
      itemMajuriTotal,
      closingGoldFine,
      closingSilverFine,
      closingCash,
      closingBank: oldBalance.bank,
      closingAnamat: oldBalance.anamat
    }
  }, [itemLines, oldBalance, header.metalType])

  const filteredReturns = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return returns.filter((record) => {
      return (
        !keyword ||
        record.returnNo.toLowerCase().includes(keyword) ||
        record.accountName.toLowerCase().includes(keyword) ||
        record.mobileNumber.toLowerCase().includes(keyword) ||
        record.metalType.toLowerCase().includes(keyword) ||
        record.returnDate.toLowerCase().includes(keyword) ||
        (record.againstSaleNo || '').toLowerCase().includes(keyword)
      )
    })
  }, [returns, searchText])

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
        const balance = await window.api.saleReturns.getAccountBalance(selectedAccountId)
        setOldBalance(balance)
      } catch (error) {
        showAlert('error', getFriendlyErrorMessage(error))
      }
    },
    [showAlert]
  )

  const loadReturns = useCallback(async (): Promise<void> => {
    const data = await window.api.saleReturns.list()
    setReturns(data)
  }, [])

  const loadNextNumber = useCallback(async (): Promise<void> => {
    const nextNumber = await window.api.saleReturns.getNextNumber()
    setHeader((current) => ({ ...current, returnNo: nextNumber }))
  }, [])

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const [accountData, itemData, stampData, designData, saleData] = await Promise.all([
        window.api.accounts.list(),
        window.api.items.list(),
        window.api.itemStamps.list(),
        window.api.itemDesigns.list(),
        window.api.sales.list()
      ])

      setAccounts(accountData)
      setItems(itemData)
      setStamps(stampData)
      setDesigns(designData)
      setSales(saleData)

      await Promise.all([loadReturns(), loadNextNumber()])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [loadReturns, loadNextNumber, showAlert])

  const handleAccountChange = (selectedAccountId: string): void => {
    const account = accounts.find((item) => item.id === selectedAccountId)

    setHeader((current) => ({
      ...current,
      accountId: selectedAccountId,
      phone: account?.mobileNumber || '',
      againstSaleId: ''
    }))
    void loadAccountBalance(selectedAccountId)
  }

  const handleMetalChange = (value: MetalType): void => {
    setHeader((current) => ({ ...current, metalType: value }))
    setItemForm(initialItemForm)
    setItemLines([])
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
          item.barcodeValue?.toLowerCase() === query ||
          item.itemName.toLowerCase() === query
      )
      if (matched) {
        handleItemChange(matched.id)
        showAlert('success', `Item selected: ${matched.itemName}`)
      } else {
        showAlert('warning', `No item matching barcode "${itemForm.barcode}"`)
      }
    }
  }

  const addItemLine = (): void => {
    if (!itemForm.itemId) {
      showAlert('warning', 'Please select item.')
      return
    }

    if (toNumber(itemForm.pcs) <= 0) {
      showAlert('warning', 'Please enter pcs.')
      return
    }

    if (toNumber(itemForm.grossWeight) <= 0) {
      showAlert('warning', 'Please enter gross weight.')
      return
    }

    const selectedItem = items.find((item) => item.id === itemForm.itemId)

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
        designId: itemForm.designId,
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
  }

  const handleConfirmRemoveItemLine = (): void => {
    if (itemDeleteIndex === null) return

    setItemLines((current) =>
      current
        .filter((_, index) => index !== itemDeleteIndex)
        .map((line, index) => ({ ...line, lineNo: index + 1 }))
    )
    setItemDeleteIndex(null)
  }

  const resetForm = useCallback(async (): Promise<void> => {
    setEditingId(null)
    setHeader(initialHeader)
    setItemForm(initialItemForm)
    setItemLines([])
    setOldBalance(emptyBalance)
    await loadNextNumber()
  }, [loadNextNumber])

  const buildPayload = (): SaleReturnPayload => {
    return {
      returnDate: header.returnDate,
      accountId: header.accountId,
      phone: header.phone,
      metalType: header.metalType,
      againstSaleId: header.againstSaleId,
      narration: header.narration,
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
      }))
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!header.returnDate) {
      showAlert('warning', 'Please select return date.')
      return
    }

    if (!header.accountId) {
      showAlert('warning', 'Please select account.')
      return
    }

    if (itemLines.length === 0) {
      showAlert('warning', 'Please add at least one item.')
      return
    }

    try {
      setSaving(true)

      const payload = buildPayload()

      if (editingId) {
        await window.api.saleReturns.update(editingId, payload)
      } else {
        await window.api.saleReturns.create(payload)
      }

      showAlert(
        'success',
        editingId ? 'Sale return updated successfully.' : 'Sale return saved successfully.'
      )
      await resetForm()
      await loadReturns()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEditReturn = async (record: SaleReturnRegisterRecord): Promise<void> => {
    try {
      setOpening(true)
      const data = await window.api.saleReturns.getById(record.id)

      setEditingId(data.header.id)
      setHeader({
        returnNo: data.header.return_no,
        returnDate: data.header.return_date,
        accountId: data.header.account_id,
        phone: data.header.mobile_number,
        metalType: data.header.metal_type as MetalType,
        againstSaleId: data.header.against_sale_id || '',
        narration: data.header.narration
      })

      setItemLines(
        data.itemLines.map((line, index) => ({
          lineNo: index + 1,
          itemId: line.item_id,
          stampId: '',
          designId: '',
          itemName: line.item_name_snapshot,
          barcode: line.barcode,
          remark: line.remark,
          pcs: Number(line.pcs || 0),
          grossWeight: Number(line.gross_weight || 0),
          packWeight: Number(line.pack_weight || 0),
          lessWeight: Number(line.less_weight || 0),
          addWeight: Number(line.add_weight || 0),
          netWeight: Number(line.net_weight || 0),
          tunch: Number(line.tunch || 0),
          wastage: Number(line.wastage || 0),
          hishob: Number(line.hishob || 0),
          labourRate: Number(line.labour_rate || 0),
          labourRateType: getLabourRateType(line.labour_rate_type),
          fine: Number(line.fine || 0),
          majuri: Number(line.majuri || 0)
        }))
      )

      await loadAccountBalance(data.header.account_id)
      showAlert('success', `Editing sale return ${data.header.return_no}.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleOpenDetail = async (record: SaleReturnRegisterRecord): Promise<void> => {
    try {
      setOpening(true)
      const data = await window.api.saleReturns.getById(record.id)
      setDetailRecord(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleConfirmDeleteReturn = async (): Promise<void> => {
    if (!returnDeleteTarget) return

    try {
      setDeleting(true)
      const result = await window.api.saleReturns.remove(returnDeleteTarget.id)

      if (editingId === returnDeleteTarget.id) {
        await resetForm()
      }

      setReturnDeleteTarget(null)
      await loadReturns()
      showAlert('success', `Sale return ${result.returnNo} voided successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
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
            🔄
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>{editingId ? `Edit Sale Return ${header.returnNo}` : 'Sale Return Transaction'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 font-mono font-bold">
                {header.returnNo || 'NEW'}
              </span>
              {editingId && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700 font-bold uppercase">
                  Editing Mode
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Process customer item returns &amp; post Jama credit effect to ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {itemLines.length > 0 && (
            <button
              type="button"
              onClick={() => void resetForm()}
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
          {/* Left Column (8 cols): Header & Item Entry & Table */}
          <div className="xl:col-span-8 flex flex-col gap-4">
            {/* Sale Return Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Sale Return Header
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Metal:</span>
                  <div className="inline-flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                    {(['Gold', 'Silver', 'Diamond', 'Other'] as MetalType[]).map((m) => {
                      const isSelected = header.metalType === m
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
                    Return No
                  </label>
                  <input
                    value={header.returnNo}
                    disabled
                    className="w-full h-8.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    Date
                  </label>
                  <input
                    type="date"
                    value={header.returnDate}
                    onChange={(e) => setHeader((c) => ({ ...c, returnDate: e.target.value }))}
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    Customer Account
                  </label>
                  <select
                    value={header.accountId}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
                  >
                    <option value="">Select Account</option>
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    Phone No
                  </label>
                  <input
                    value={header.phone}
                    onChange={(e) => setHeader((c) => ({ ...c, phone: e.target.value }))}
                    placeholder="Mobile number"
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    Against Sale (Optional)
                  </label>
                  <select
                    value={header.againstSaleId}
                    onChange={(e) => setHeader((c) => ({ ...c, againstSaleId: e.target.value }))}
                    className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  >
                    <option value="">Standalone Return (No previous bill)</option>
                    {salesForAccount.map((sale) => (
                      <option key={sale.id} value={sale.id}>
                        {sale.sale_no} - {formatDate(sale.sale_date)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    Narration / Notes
                  </label>
                  <input
                    value={header.narration}
                    onChange={(e) => setHeader((c) => ({ ...c, narration: e.target.value }))}
                    placeholder="Optional notes or return remarks"
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
                    Item Entry
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  Scan barcode or select an item from stock
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2.5 items-end">
                <div className="col-span-2 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Barcode
                  </label>
                  <input
                    value={itemForm.barcode}
                    onChange={(e) => setItemForm((c) => ({ ...c, barcode: e.target.value }))}
                    onKeyDown={handleBarcodeKeyDown}
                    placeholder="Scan / Enter"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono text-slate-800 shadow-2xs"
                  />
                </div>

                <div className="col-span-2 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Item Name *
                  </label>
                  <select
                    value={itemForm.itemId}
                    onChange={(e) => handleItemChange(e.target.value)}
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-medium text-slate-800 shadow-2xs"
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
                    {filteredStamps.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.stampName}
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
                    {filteredDesigns.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.designName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Pcs *
                  </label>
                  <input
                    value={itemForm.pcs}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setItemForm((c) => ({ ...c, pcs: v })))}
                    placeholder="1"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono text-slate-800 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Gross Wt *
                  </label>
                  <input
                    value={itemForm.grossWeight}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setItemForm((c) => ({ ...c, grossWeight: v })))}
                    placeholder="0.000"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono text-slate-800 shadow-2xs font-semibold"
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
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono text-slate-800 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                    Less Wt
                  </label>
                  <input
                    value={formatNumber(itemPreview.lessWeight)}
                    readOnly
                    className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-slate-700"
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
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono text-slate-800 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                    Net Wt
                  </label>
                  <input
                    value={formatNumber(itemPreview.netWeight)}
                    readOnly
                    className="w-full h-8 px-2 text-xs bg-amber-50/50 border border-amber-200 rounded-lg text-right font-mono text-amber-900 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Tunch
                  </label>
                  <input
                    value={itemForm.tunch}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setItemForm((c) => ({ ...c, tunch: v })))}
                    placeholder="100"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono text-slate-800 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Wstg
                  </label>
                  <input
                    value={itemForm.wastage}
                    onChange={(e) => handleNumberChange(e.target.value, (v) => setItemForm((c) => ({ ...c, wastage: v })))}
                    placeholder="0"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono text-slate-800 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                    Hishob
                  </label>
                  <input
                    value={formatNumber(itemPreview.hishob)}
                    readOnly
                    className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-slate-700"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-amber-800 block mb-1 uppercase tracking-wider">
                    Fine
                  </label>
                  <input
                    value={formatNumber(itemPreview.fine)}
                    readOnly
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
                    placeholder="0"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono text-slate-800 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Lab Type
                  </label>
                  <select
                    value={itemForm.labourRateType}
                    onChange={(e) => setItemForm((c) => ({ ...c, labourRateType: getLabourRateType(e.target.value) }))}
                    className="w-full h-8 px-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                  >
                    <option>Kg</option>
                    <option>Gm</option>
                    <option>Pcs</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                    Majuri
                  </label>
                  <input
                    value={formatNumber(itemPreview.majuri)}
                    readOnly
                    className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-slate-800 font-bold"
                  />
                </div>

                <div className="col-span-2 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Remark
                  </label>
                  <input
                    value={itemForm.remark}
                    onChange={(e) => setItemForm((c) => ({ ...c, remark: e.target.value }))}
                    placeholder="Note / remark"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-slate-800 shadow-2xs"
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
                  <span>Add Item to Return</span>
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

            {/* Added Return Items Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Return Items ({itemLines.length})
                  </h2>
                </div>
                {itemLines.length > 0 && (
                  <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Fine Total: {formatNumber(totals.itemFineTotal)}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto max-h-[280px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Barcode</th>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3 text-right">Pcs</th>
                      <th className="py-2.5 px-3 text-right">Gross</th>
                      <th className="py-2.5 px-3 text-right">Less</th>
                      <th className="py-2.5 px-3 text-right">Net</th>
                      <th className="py-2.5 px-3 text-right">Tunch</th>
                      <th className="py-2.5 px-3 text-right">Wstg</th>
                      <th className="py-2.5 px-3 text-right text-amber-800 font-bold">Fine</th>
                      <th className="py-2.5 px-3 text-right">Majuri</th>
                      <th className="py-2.5 px-3">Remark</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {itemLines.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-8 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className="text-2xl">📦</span>
                            <span className="font-semibold text-xs text-slate-500">
                              No items added to return yet
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Use the item entry form above to add items
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      itemLines.map((line, index) => (
                        <tr key={line.lineNo} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{line.lineNo}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{line.barcode || '-'}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{line.itemName}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatNumber(line.pcs)}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatNumber(line.grossWeight)}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">{formatNumber(line.lessWeight)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatNumber(line.netWeight)}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatNumber(line.tunch)}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatNumber(line.wastage)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">{formatNumber(line.fine)}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">{formatNumber(line.majuri)}</td>
                          <td className="py-2 px-3 text-slate-500 text-[11px] max-w-[120px] truncate">{line.remark || '-'}</td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setItemDeleteIndex(index)}
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
                    <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200 text-slate-900 sticky bottom-0">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-right font-semibold text-slate-600">
                          Total ({itemLines.length} items):
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatNumber(totals.totalPcs)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatNumber(totals.totalGross)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">-</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">{formatNumber(totals.totalNet)}</td>
                        <td colSpan={2} className="py-2.5 px-3 text-right">-</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">{formatNumber(totals.itemFineTotal)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatNumber(totals.itemMajuriTotal)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Customer Balance & Action Card */}
          <div className="xl:col-span-4 flex flex-col gap-4">
            {/* Customer Balance Breakdown Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Customer Balance
                  </h2>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Jama (Credit) Effect
                </span>
              </div>

              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <span className="text-base">👤</span>
                <div className="truncate">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Selected Account</span>
                  <span className="font-bold text-xs text-slate-900 truncate block">
                    {selectedAccount?.accountName || 'No account selected'}
                  </span>
                </div>
              </div>

              {/* Balances List */}
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1">
                  Previous Ledger Balances
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Old Gold Fine</span>
                  <span className="font-mono font-medium">{formatNumber(oldBalance.goldFine)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Old Silver Fine</span>
                  <span className="font-mono font-medium">{formatNumber(oldBalance.silverFine)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Old Cash</span>
                  <span className="font-mono font-medium">{formatNumber(oldBalance.cash)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Old Bank</span>
                  <span className="font-mono font-medium">{formatNumber(oldBalance.bank)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Old Anamat</span>
                  <span className="font-mono font-medium">{formatNumber(oldBalance.anamat)}</span>
                </div>

                <div className="my-2 border-t border-dashed border-slate-200" />

                <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider pt-0.5">
                  This Return Transaction (Jama)
                </div>
                <div className="flex items-center justify-between text-amber-800 font-semibold bg-amber-50/60 px-2 py-1 rounded-lg">
                  <span>Return Fine Jama</span>
                  <span className="font-mono">{formatNumber(totals.itemFineTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-800 font-semibold bg-slate-50 px-2 py-1 rounded-lg">
                  <span>Return Majuri Jama</span>
                  <span className="font-mono">{formatNumber(totals.itemMajuriTotal)}</span>
                </div>

                <div className="my-2 border-t border-slate-200" />

                <div className="text-[10px] font-bold text-slate-800 uppercase tracking-wider pt-0.5">
                  Net Closing Balance
                </div>
                <div className="flex items-center justify-between font-bold text-slate-900 bg-slate-100/80 px-2 py-1 rounded-lg">
                  <span>Closing Gold Fine</span>
                  <span className="font-mono text-amber-800">{formatNumber(totals.closingGoldFine)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-slate-900 bg-slate-100/80 px-2 py-1 rounded-lg">
                  <span>Closing Silver Fine</span>
                  <span className="font-mono text-slate-900">{formatNumber(totals.closingSilverFine)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-slate-900 px-2 py-0.5">
                  <span>Closing Cash</span>
                  <span className="font-mono">{formatNumber(totals.closingCash)}</span>
                </div>
                <div className="flex items-center justify-between font-semibold text-slate-700 px-2 py-0.5">
                  <span>Closing Bank</span>
                  <span className="font-mono">{formatNumber(totals.closingBank)}</span>
                </div>
                <div className="flex items-center justify-between font-semibold text-slate-700 px-2 py-0.5">
                  <span>Closing Anamat</span>
                  <span className="font-mono">{formatNumber(totals.closingAnamat)}</span>
                </div>
              </div>
            </div>

            {/* Post / Save Action Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || loading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mb-2.5"
                style={{ color: '#ffffff' }}
              >
                <span>💾</span>
                <span>{saving ? 'Saving Return...' : editingId ? 'Update Sale Return' : 'Post & Save Sale Return'}</span>
              </button>

              <button
                type="button"
                onClick={() => void resetForm()}
                disabled={saving}
                className="w-full h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>✨</span>
                <span>New Blank Return</span>
              </button>

              <div className="text-[11px] text-slate-500 leading-relaxed mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                💡 <strong>Ledger Effect:</strong> Items are returned back into stock. The customer account receives a <em>Jama (Credit)</em>, reversing the <em>Nave (Debit)</em> generated by the original sale.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Saved Sale Returns Register */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Saved Sale Returns Register
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <input
                  id="sale-return-search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search returns, account, mobile..."
                  className="w-full h-8 px-2.5 pr-7 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => void loadReturns()}
                disabled={loading}
                className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>

              <div className="text-xs text-slate-500 font-medium">
                Total: <strong className="text-slate-800">{returns.length}</strong> | Showing:{' '}
                <strong className="text-amber-800">{filteredReturns.length}</strong>
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Return No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer Account</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Metal</th>
                  <th className="py-2.5 px-3">Against Sale</th>
                  <th className="py-2.5 px-3 text-right">Fine Total</th>
                  <th className="py-2.5 px-3 text-right">Majuri Total</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-400">
                      Loading sale returns...
                    </td>
                  </tr>
                ) : filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-400">
                      {searchText ? 'No matching returns found.' : 'No sale returns saved yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((record, index) => (
                    <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-amber-800">{record.returnNo}</td>
                      <td className="py-2 px-3 font-mono">{formatDate(record.returnDate)}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{record.accountName}</td>
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{record.mobileNumber || '-'}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {record.metalType}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{record.againstSaleNo || 'Standalone'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">{formatNumber(record.itemFineTotal)}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">{formatNumber(record.itemMajuriTotal)}</td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleOpenDetail(record)}
                            disabled={opening}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleEditReturn(record)}
                            disabled={opening || saving}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setReturnDeleteTarget(record)}
                            disabled={deleting}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                          >
                            Void
                          </button>
                        </div>
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
        title="Remove Item Line?"
        message={
          itemDeleteIndex !== null && itemLines[itemDeleteIndex]
            ? `Are you sure you want to remove "${itemLines[itemDeleteIndex].itemName}" from this return?`
            : ''
        }
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmRemoveItemLine}
        onCancel={() => setItemDeleteIndex(null)}
      />

      <AppConfirmDialog
        open={Boolean(returnDeleteTarget)}
        title="Void Sale Return?"
        message={
          returnDeleteTarget
            ? `Sale return "${returnDeleteTarget.returnNo}" for "${returnDeleteTarget.accountName}" will be voided. Stock and account ledger effect will be removed.`
            : ''
        }
        confirmText="Void"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDeleteReturn()}
        onCancel={() => {
          if (!deleting) setReturnDeleteTarget(null)
        }}
      />

      {/* Detail Record Modal */}
      {detailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="h-13 px-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🔄</span>
                <span className="font-bold text-sm text-slate-900">
                  Sale Return Details: {detailRecord.header.return_no}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailRecord(null)}
                className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Account</span>
                  <span className="font-bold text-slate-900 block">{detailRecord.header.account_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Date</span>
                  <span className="font-bold text-slate-900 block">{formatDate(detailRecord.header.return_date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Metal</span>
                  <span className="font-bold text-slate-900 block">{detailRecord.header.metal_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Against Sale</span>
                  <span className="font-bold text-slate-900 block">{detailRecord.header.against_sale_no || 'Standalone'}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Barcode</th>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3 text-right">Pcs</th>
                      <th className="py-2.5 px-3 text-right">Net Wt</th>
                      <th className="py-2.5 px-3 text-right">Fine</th>
                      <th className="py-2.5 px-3 text-right">Majuri</th>
                      <th className="py-2.5 px-3">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {detailRecord.itemLines.map((line, index) => (
                      <tr key={line.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{line.barcode || '-'}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{line.item_name_snapshot}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatNumber(line.pcs)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatNumber(line.net_weight)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">{formatNumber(line.fine)}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">{formatNumber(line.majuri)}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">{line.remark || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 text-right font-semibold text-slate-600">Total:</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">
                        {formatNumber(detailRecord.header.item_fine_total)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatNumber(detailRecord.header.item_majuri_total)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SaleReturnScreen
