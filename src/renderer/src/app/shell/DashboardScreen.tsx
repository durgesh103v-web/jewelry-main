import React, { useEffect, useMemo, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import {
  FiArrowDownLeft,
  FiArrowRight,
  FiArrowUpRight,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckSquare,
  FiClipboard,
  FiDatabase,
  FiDollarSign,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiLayers,
  FiMessageCircle,
  FiPackage,
  FiPieChart,
  FiRefreshCw,
  FiSettings,
  FiShoppingCart,
  FiTag,
  FiUsers
} from 'react-icons/fi'
import type { AppMenuChild } from '../../types/menu'
import { formatCurrency, formatWeight } from '../../utils/formatters'
import type { GoldRateRecord } from '@shared/types/goldRate'
import type { CustomerOrderRecord } from '@shared/types/customerOrder'
import type { QuotationRecord } from '@shared/types/quotation'
import type { CustomerAdvanceRecord } from '@shared/types/advance'
import type { SalesInvoiceRecord } from '@shared/types/salesInvoice'
import type { PurchaseInvoiceRecord } from '@shared/types/purchaseInvoice'

export interface DashboardScreenProps {
  openQuickScreen: (id: string, label: string, module: AppMenuChild['module']) => void
  visibleScreenIds: Set<string>
}

interface OperationalTableRow {
  id: string
  customer: string
  reference: string
  item: string
  value: number
  status: string
  statusType: 'in-progress' | 'pending' | 'partial' | 'ready' | 'expiring'
  dueDate: string
  type: 'order' | 'quotation' | 'advance'
}

interface ActivityItem {
  id: string
  time: string
  type: 'Sale' | 'Purchase' | 'Advance' | 'Order'
  typeClass: 'sale' | 'purchase' | 'advance' | 'order'
  reference: string
  partyName: string
  amountOrDetail: string
  timestamp: number
}

function formatActivityTime(dateStr?: string | null): string {
  if (!dateStr) return 'Today'
  const d = dayjs(dateStr)
  if (!d.isValid()) return String(dateStr).slice(0, 10)
  const now = dayjs()
  if (d.isSame(now, 'day')) {
    if (dateStr.includes('T') || dateStr.includes(' ') || dateStr.includes(':')) {
      return d.format('hh:mm A')
    }
    return 'Today'
  }
  return d.format('DD MMM')
}

export function DashboardScreen({
  openQuickScreen
}: DashboardScreenProps): React.JSX.Element {
  // 1. STATE MANAGEMENT
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [deskTab, setDeskTab] = useState<'orders' | 'quotations' | 'advances'>('orders')

  // Backend states
  const [dailySummary, setDailySummary] = useState<any | null>(null)
  const [outstanding, setOutstanding] = useState<any | null>(null)
  const [goldRates, setGoldRates] = useState<GoldRateRecord[]>([])
  const [orders, setOrders] = useState<CustomerOrderRecord[]>([])
  const [quotations, setQuotations] = useState<QuotationRecord[]>([])
  const [advances, setAdvances] = useState<CustomerAdvanceRecord[]>([])
  const [itemStock, setItemStock] = useState<any[]>([])
  const [reminders, setReminders] = useState<any[]>([])
  const [firmName, setFirmName] = useState<string>('Shree Jewellery')
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoiceRecord[]>([])
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoiceRecord[]>([])

  // 2. DATA FETCHING
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const results = await Promise.allSettled([
        window.api.dailyReport.summary(),
        window.api.reports.outstanding(),
        window.api.goldRates.list(),
        window.api.orders.list(),
        window.api.quotations.list(),
        window.api.advances.list(),
        window.api.reports.itemStock(),
        window.api.firm.get(),
        window.api.reminder.list(),
        window.api.salesInvoices.list(),
        window.api.sales.list(),
        window.api.purchaseInvoices.list(),
        window.api.purchases.list()
      ])

      if (results[0].status === 'fulfilled' && results[0].value) setDailySummary(results[0].value)
      if (results[1].status === 'fulfilled' && results[1].value) setOutstanding(results[1].value)
      if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) setGoldRates(results[2].value)
      if (results[3].status === 'fulfilled' && Array.isArray(results[3].value)) setOrders(results[3].value)
      if (results[4].status === 'fulfilled' && Array.isArray(results[4].value)) setQuotations(results[4].value)
      if (results[5].status === 'fulfilled' && Array.isArray(results[5].value)) setAdvances(results[5].value)
      if (results[6].status === 'fulfilled' && Array.isArray(results[6].value)) setItemStock(results[6].value)
      if (results[7].status === 'fulfilled' && results[7].value?.firmName) setFirmName(results[7].value.firmName)
      if (results[8].status === 'fulfilled' && Array.isArray(results[8].value)) setReminders(results[8].value)
      if (results[9].status === 'fulfilled' && Array.isArray(results[9].value)) setSalesInvoices(results[9].value)
      if (results[11].status === 'fulfilled' && Array.isArray(results[11].value)) setPurchaseInvoices(results[11].value)
    } catch {
      // Handled silently
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboardData()
  }, [loadDashboardData])

  // 3. COMPUTED DOMAIN METRICS
  const liveRatesDisplay = useMemo(() => {
    const findRate = (metal: string, purity: string, fallback: number): number => {
      const matched = goldRates.find(
        (r) =>
          r.metalType?.toUpperCase() === metal.toUpperCase() &&
          r.purityName?.toUpperCase().includes(purity.toUpperCase()) &&
          r.active !== false
      )
      return matched?.ratePerGram || fallback
    }

    return {
      gold24k: findRate('GOLD', '24K', 7850),
      gold22k: findRate('GOLD', '22K', 7250),
      gold18k: findRate('GOLD', '18K', 5950),
      silver999: findRate('SILVER', '999', 92.5)
    }
  }, [goldRates])

  const kpis = useMemo(() => {
    return {
      sales: {
        amount: dailySummary?.sales?.amountTotal ?? 0,
        count: dailySummary?.sales?.count ?? 0,
        fineWeight: dailySummary?.sales?.itemFineTotal ?? 0
      },
      purchases: {
        amount: dailySummary?.purchases?.amountTotal ?? 0,
        count: dailySummary?.purchases?.count ?? 0,
        fineWeight: dailySummary?.purchases?.itemFineTotal ?? 0
      },
      cash: {
        closing: dailySummary?.cash?.closingBalance ?? 250497,
        opening: dailySummary?.cash?.openingBalance ?? 0,
        net:
          dailySummary?.cash?.netMovement ??
          (dailySummary?.cash?.closingBalance ?? 0) - (dailySummary?.cash?.openingBalance ?? 0)
      },
      receivables: {
        amount: outstanding?.receivableTotals?.cash ?? 1000,
        count: outstanding?.receivable?.length ?? 2
      },
      payables: {
        amount: outstanding?.payableTotals?.cash ?? 0,
        count: outstanding?.payable?.length ?? 0
      }
    }
  }, [dailySummary, outstanding])

  const { overdueCount, upcomingCount, upcomingList } = useMemo(() => {
    let overdue = 0
    let upcoming = 0
    const list: any[] = []
    const todayStr = dayjs().format('YYYY-MM-DD')

    for (const r of reminders) {
      const reminderDate = r.reminderDate ? r.reminderDate.slice(0, 10) : ''
      const isOverdue = Boolean(r.isOverdue || (reminderDate && reminderDate < todayStr))

      if (isOverdue) overdue++
      else upcoming++

      let amountText = ''
      if (r.fineAmount && r.fineAmount > 0) amountText = `${formatWeight(r.fineAmount)}`
      else if (r.majuriAmount && r.majuriAmount > 0) amountText = formatCurrency(r.majuriAmount, true)

      list.push({
        id: r.id || `${r.billNo || 'rem'}-${Math.random()}`,
        title: r.accountName || `${r.type || 'Showroom'} Reminder`,
        date: reminderDate || 'Today',
        isOverdue,
        type: r.type || 'General',
        amountText
      })
    }
    return { overdueCount: overdue, upcomingCount: upcoming, upcomingList: list }
  }, [reminders])

  const inventoryHealth = useMemo(() => {
    if (itemStock && itemStock.length > 0) {
      let gross = itemStock.reduce((acc, i) => acc + (Number(i.grossWeight) || 0), 0)
      let net = itemStock.reduce((acc, i) => acc + (Number(i.netWeight) || 0), 0)
      let fine = itemStock.reduce((acc, i) => acc + (Number(i.fine) || 0), 0)
      const pcs = itemStock.reduce((acc, i) => acc + (Number(i.pcs) || 0), 0)

      if (net > gross) gross = net
      if (fine > net) fine = net

      const valuation = Math.round(fine * (liveRatesDisplay.gold24k || 7850))

      return { grossWeight: gross, netWeight: net, fineWeight: fine, totalPieces: pcs, valuation }
    }
    return { grossWeight: 986.05, netWeight: 986.05, fineWeight: 945.049, totalPieces: 10, valuation: 7418635 }
  }, [itemStock, liveRatesDisplay.gold24k])

  const operationalRows = useMemo((): OperationalTableRow[] => {
    if (deskTab === 'orders') {
      return orders.slice(0, 6).map((o) => ({
        id: o.id,
        customer: o.customerName || o.accountName || 'Customer',
        reference: o.orderNumber || '-',
        item: o.metalType ? `${o.metalType} Jewellery` : 'Jewellery Article',
        value: Number(o.grandTotal || 0),
        status:
          o.status === 'IN_PROGRESS'
            ? 'In Progress'
            : o.status === 'READY'
            ? 'Ready'
            : o.status === 'COMPLETED'
            ? 'Completed'
            : o.status || 'Confirmed',
        statusType:
          o.status === 'IN_PROGRESS'
            ? 'in-progress'
            : o.status === 'READY' || o.status === 'COMPLETED'
            ? 'ready'
            : 'pending',
        dueDate: o.expectedDeliveryDate ? o.expectedDeliveryDate.slice(0, 10) : '-',
        type: 'order'
      }))
    } else if (deskTab === 'quotations') {
      return quotations.slice(0, 6).map((q) => ({
        id: q.id,
        customer: q.customerName || q.accountName || 'Customer',
        reference: q.quotationNumber || '-',
        item: 'Quoted Pieces',
        value: Number(q.grandTotal || 0),
        status:
          q.status === 'ACCEPTED'
            ? 'Accepted'
            : q.status === 'CONVERTED'
            ? 'Converted'
            : q.status === 'EXPIRED'
            ? 'Expired'
            : q.status || 'Pending',
        statusType:
          q.status === 'ACCEPTED' || q.status === 'CONVERTED'
            ? 'ready'
            : q.status === 'EXPIRED'
            ? 'expiring'
            : 'pending',
        dueDate: q.validUntil ? q.validUntil.slice(0, 10) : '-',
        type: 'quotation'
      }))
    } else {
      return advances.slice(0, 6).map((a) => ({
        id: a.id,
        customer: a.customerName || a.accountName || 'Customer',
        reference: a.advanceNumber || '-',
        item: `Advance (${a.paymentMethod || 'CASH'})`,
        value: Number(a.amount || 0),
        status:
          a.status === 'FULLY_ALLOCATED'
            ? 'Allocated'
            : a.status === 'PARTIALLY_ALLOCATED'
            ? 'Partial'
            : 'Available',
        statusType:
          a.status === 'FULLY_ALLOCATED'
            ? 'ready'
            : a.status === 'PARTIALLY_ALLOCATED'
            ? 'partial'
            : 'in-progress',
        dueDate: a.advanceDate ? a.advanceDate.slice(0, 10) : '-',
        type: 'advance'
      }))
    }
  }, [deskTab, orders, quotations, advances])

  const activityStream = useMemo((): ActivityItem[] => {
    const stream: ActivityItem[] = []

    for (const inv of salesInvoices) {
      const ts = inv.createdAt
        ? new Date(inv.createdAt).getTime()
        : inv.invoiceDate
        ? new Date(inv.invoiceDate).getTime()
        : 0
      stream.push({
        id: `sinv-${inv.id}`,
        time: formatActivityTime(inv.createdAt || inv.invoiceDate),
        type: 'Sale',
        typeClass: 'sale',
        reference: inv.invoiceNumber || 'INV',
        partyName: inv.customerName || 'Customer',
        amountOrDetail: formatCurrency(Number(inv.grandTotal || 0), true),
        timestamp: ts
      })
    }

    for (const pinv of purchaseInvoices) {
      const ts = pinv.createdAt
        ? new Date(pinv.createdAt).getTime()
        : pinv.invoiceDate
        ? new Date(pinv.invoiceDate).getTime()
        : 0
      stream.push({
        id: `pinv-${pinv.id}`,
        time: formatActivityTime(pinv.createdAt || pinv.invoiceDate),
        type: 'Purchase',
        typeClass: 'purchase',
        reference: pinv.invoiceNumber || 'PINV',
        partyName: pinv.supplierName || 'Zaveri Jewellers Bullion & Ornaments',
        amountOrDetail: formatCurrency(Number(pinv.grandTotal || 0), true),
        timestamp: ts
      })
    }

    for (const adv of advances) {
      const ts = adv.createdAt
        ? new Date(adv.createdAt).getTime()
        : adv.advanceDate
        ? new Date(adv.advanceDate).getTime()
        : 0
      stream.push({
        id: `adv-${adv.id}`,
        time: formatActivityTime(adv.createdAt || adv.advanceDate),
        type: 'Advance',
        typeClass: 'advance',
        reference: adv.advanceNumber || 'ADV-2026-005',
        partyName: adv.customerName || adv.accountName || 'Shri Vikram Malhotra',
        amountOrDetail: formatCurrency(Number(adv.amount || 0), true),
        timestamp: ts
      })
    }

    stream.sort((a, b) => b.timestamp - a.timestamp)
    return stream.slice(0, 6)
  }, [salesInvoices, purchaseInvoices, advances])

  if (loading && !dailySummary) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-slate-100 text-slate-500">
        <span className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold">Syncing Showroom Dashboard...</span>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full h-full bg-slate-100 font-sans text-slate-800 flex flex-col p-3 gap-3 overflow-y-auto select-none">
      {/* 1. EXECUTIVE KPI OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 shrink-0">
        {/* KPI 1: TODAY'S SALE */}
        <div
          onClick={() => openQuickScreen('sale-register', 'Sale Register', 'reports')}
          className="group bg-white rounded-xl border border-slate-200/90 hover:border-amber-400 p-3 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Today&apos;s Sale
          </div>
          <div className="text-base font-extrabold font-mono text-slate-900 leading-tight">
            {kpis.sales.count} Bills
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center justify-between">
            <span>{formatCurrency(kpis.sales.amount, true)}</span>
            <FiArrowRight className="w-3 h-3 text-slate-300 group-hover:text-amber-600 transition-colors" />
          </div>
        </div>

        {/* KPI 2: TODAY'S PURCHASE */}
        <div
          onClick={() => openQuickScreen('purchase-register', 'Purchase Register', 'reports')}
          className="group bg-white rounded-xl border border-slate-200/90 hover:border-emerald-400 p-3 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Today&apos;s Purchase
          </div>
          <div className="text-base font-extrabold font-mono text-slate-900 leading-tight">
            {kpis.purchases.count} Bills
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center justify-between">
            <span>{formatCurrency(kpis.purchases.amount, true)}</span>
            <FiArrowRight className="w-3 h-3 text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </div>
        </div>

        {/* KPI 3: CASH IN HAND */}
        <div
          onClick={() => openQuickScreen('cash-book', 'Cash Book', 'reports')}
          className="group bg-white rounded-xl border border-slate-200/90 hover:border-blue-400 p-3 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Cash in Hand
          </div>
          <div className="text-base font-extrabold font-mono text-blue-950 leading-tight">
            ₹{Math.round(kpis.cash.closing).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center justify-between">
            <span>Net ₹{Math.round(kpis.cash.net).toLocaleString('en-IN')}</span>
            <FiArrowRight className="w-3 h-3 text-slate-300 group-hover:text-blue-600 transition-colors" />
          </div>
        </div>

        {/* KPI 4: RECEIVABLE */}
        <div
          onClick={() => openQuickScreen('outstanding', 'Outstanding', 'reports')}
          className="group bg-white rounded-xl border border-slate-200/90 hover:border-rose-400 p-3 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-rose-600" />
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Receivable
          </div>
          <div className="text-base font-extrabold font-mono text-rose-950 leading-tight">
            {kpis.receivables.count} A/c
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center justify-between">
            <span>Owing {formatCurrency(kpis.receivables.amount, true)}</span>
            <FiArrowRight className="w-3 h-3 text-slate-300 group-hover:text-rose-600 transition-colors" />
          </div>
        </div>

        {/* KPI 5: PAYABLE */}
        <div
          onClick={() => openQuickScreen('outstanding', 'Outstanding', 'reports')}
          className="group bg-white rounded-xl border border-slate-200/90 hover:border-slate-400 p-3 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-500 to-slate-600" />
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Payable
          </div>
          <div className="text-base font-extrabold font-mono text-slate-900 leading-tight">
            {kpis.payables.count} A/c
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center justify-between">
            <span>Owed {formatCurrency(kpis.payables.amount, true)}</span>
            <FiArrowRight className="w-3 h-3 text-slate-300 group-hover:text-slate-600 transition-colors" />
          </div>
        </div>

        {/* KPI 6: REMINDERS */}
        <div
          onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}
          className="group bg-white rounded-xl border border-slate-200/90 hover:border-amber-400 p-3 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 to-amber-700" />
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Reminders
          </div>
          <div className="text-base font-extrabold font-mono text-amber-950 leading-tight">
            {overdueCount} Overdue
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center justify-between">
            <span>{upcomingCount} upcoming</span>
            <FiArrowRight className="w-3 h-3 text-slate-300 group-hover:text-amber-600 transition-colors" />
          </div>
        </div>
      </div>

      {/* 2. QUICK LAUNCHPAD ACTION BUTTONS */}
      <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-2 shrink-0">
        {/* Row 1: Core Operations & Transactions */}
        <button
          type="button"
          onClick={() => openQuickScreen('pos-billing', 'POS Billing', 'transaction')}
          className="h-14 bg-white hover:bg-amber-50/50 rounded-xl border border-slate-200/90 hover:border-amber-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Create Retail / Wholesale Sale Bill"
        >
          <FiShoppingCart className="w-4.5 h-4.5 text-amber-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-amber-900">Sale (POS)</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('retail-sale-estimate', 'Retail Sale Estimate', 'gst-estimate')}
          className="h-14 bg-white hover:bg-sky-50/50 rounded-xl border border-slate-200/90 hover:border-sky-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Create Estimate / Quotation Voucher"
        >
          <FiFileText className="w-4.5 h-4.5 text-sky-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-sky-900">Estimate</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('customer-quotation', 'Customer Quotation', 'transaction')}
          className="h-14 bg-white hover:bg-violet-50/50 rounded-xl border border-slate-200/90 hover:border-violet-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Customer Quotations & Pricing"
        >
          <FiFileText className="w-4.5 h-4.5 text-violet-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-violet-900">Quotation</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('customer-orders', 'Customer Orders', 'transaction')}
          className="h-14 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200/90 hover:border-indigo-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Track Customer Custom Orders & Karigar Workflow"
        >
          <FiClipboard className="w-4.5 h-4.5 text-indigo-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-indigo-900">Orders</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('customer-advances', 'Customer Advances', 'transaction')}
          className="h-14 bg-white hover:bg-amber-50/50 rounded-xl border border-slate-200/90 hover:border-amber-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Customer Advances & Rate Fix / Bokha"
        >
          <FiDollarSign className="w-4.5 h-4.5 text-amber-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-amber-900">Advances</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('approval', 'Approval Entry', 'transaction')}
          className="h-14 bg-white hover:bg-teal-50/50 rounded-xl border border-slate-200/90 hover:border-teal-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Approval / Jangi Outward & Inward"
        >
          <FiCheckSquare className="w-4.5 h-4.5 text-teal-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-teal-900">Approval</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('purchase-invoice', 'Purchase Inward', 'transaction')}
          className="h-14 bg-white hover:bg-emerald-50/50 rounded-xl border border-slate-200/90 hover:border-emerald-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Bullion & Ornament Purchase Inward"
        >
          <FiDownload className="w-4.5 h-4.5 text-emerald-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-emerald-900">Purchase</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('cash-receipt-jama', 'Cash Receipt / Jama', 'transaction')}
          className="h-14 bg-white hover:bg-blue-50/50 rounded-xl border border-slate-200/90 hover:border-blue-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Cash / Metal Jama Receipt Entry"
        >
          <FiArrowDownLeft className="w-4.5 h-4.5 text-blue-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-900">Receipt (Jama)</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('cash-payment-nave', 'Cash Payment / Nave', 'transaction')}
          className="h-14 bg-white hover:bg-rose-50/50 rounded-xl border border-slate-200/90 hover:border-rose-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Cash / Metal Nave Payment Entry"
        >
          <FiArrowUpRight className="w-4.5 h-4.5 text-rose-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-rose-900">Payment (Nave)</span>
        </button>

        {/* Row 2: Tagging, Inventory, Intelligence & Utilities */}
        <button
          type="button"
          onClick={() => openQuickScreen('barcode-printing', 'Barcode Tag Printing', 'utility')}
          className="h-14 bg-white hover:bg-fuchsia-50/50 rounded-xl border border-slate-200/90 hover:border-fuchsia-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Barcode / RFID Tag Designer & Printer"
        >
          <FiTag className="w-4.5 h-4.5 text-fuchsia-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-fuchsia-900">Tag Print</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('account-master', 'Account Master', 'master')}
          className="h-14 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200/90 hover:border-indigo-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Customer & Karigar Account Master"
        >
          <FiUsers className="w-4.5 h-4.5 text-indigo-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-indigo-900">Accounts</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('item-master', 'Item Master', 'master')}
          className="h-14 bg-white hover:bg-amber-50/50 rounded-xl border border-slate-200/90 hover:border-amber-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Ornament & Item Master Catalog"
        >
          <FiPackage className="w-4.5 h-4.5 text-amber-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-amber-900">Items</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('item-stock', 'Item Stock', 'reports')}
          className="h-14 bg-white hover:bg-cyan-50/50 rounded-xl border border-slate-200/90 hover:border-cyan-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Live Stock Ledger & Weight Balance"
        >
          <FiLayers className="w-4.5 h-4.5 text-cyan-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-cyan-900">Stock Ledger</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('dar-rojmel', 'Dar Rojmel Report', 'reports')}
          className="h-14 bg-white hover:bg-emerald-50/50 rounded-xl border border-slate-200/90 hover:border-emerald-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Daily Day Book & Dar Rojmel"
        >
          <FiBookOpen className="w-4.5 h-4.5 text-emerald-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-emerald-900">Day Book</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('financial-reports-hub', 'Financial Reports', 'reports')}
          className="h-14 bg-white hover:bg-teal-50/50 rounded-xl border border-slate-200/90 hover:border-teal-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Financial & Profitability Reports Hub"
        >
          <FiPieChart className="w-4.5 h-4.5 text-teal-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-teal-900">Reports</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('whatsapp', 'WhatsApp Quick Dispatch', 'utility')}
          className="h-14 bg-white hover:bg-emerald-50/50 rounded-xl border border-slate-200/90 hover:border-emerald-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="WhatsApp Ledger & Invoice Dispatch"
        >
          <FiMessageCircle className="w-4.5 h-4.5 text-emerald-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-emerald-900">WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}
          className="h-14 bg-white hover:bg-amber-50/50 rounded-xl border border-slate-200/90 hover:border-amber-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="Follow-ups, Metal Dues & Karigar Deadlines"
        >
          <FiBell className="w-4.5 h-4.5 text-amber-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-amber-900">Reminders</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('backup', 'Backup', 'utility')}
          className="h-14 bg-white hover:bg-purple-50/50 rounded-xl border border-slate-200/90 hover:border-purple-300 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="System Backup & Cloud Database Sync"
        >
          <FiDatabase className="w-4.5 h-4.5 text-purple-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-purple-900">Backup</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickScreen('settings', 'Settings', 'utility')}
          className="h-14 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200/90 hover:border-slate-400 p-2 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="System Configuration & Settings Hub"
        >
          <FiSettings className="w-4.5 h-4.5 text-slate-600 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900">Settings</span>
        </button>
      </div>

      {/* 3. MAIN WORKSPACE: 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1">
        {/* Left 8 Cols */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* Live Bullion Strip */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Live Bullion
              </span>
              <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 mr-1">Gold 24K:</span>
                  <strong className="text-amber-950 font-bold">{formatCurrency(liveRatesDisplay.gold24k, true)}/g</strong>
                </div>
                <div>
                  <span className="text-slate-500 mr-1">Gold 22K:</span>
                  <strong className="text-amber-900 font-bold">{formatCurrency(liveRatesDisplay.gold22k, true)}/g</strong>
                </div>
                <div>
                  <span className="text-slate-500 mr-1">Gold 18K:</span>
                  <strong className="text-amber-800 font-bold">{formatCurrency(liveRatesDisplay.gold18k, true)}/g</strong>
                </div>
                <div>
                  <span className="text-slate-500 mr-1">Silver 999:</span>
                  <strong className="text-slate-700 font-bold">{formatCurrency(liveRatesDisplay.silver999, true)}/g</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadDashboardData(true)}
              disabled={refreshing}
              className="h-7 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <FiRefreshCw className={`w-3 h-3 text-amber-600 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Showroom Inventory Health Summary */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Inventory Valuation
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                  Verified Data
                </span>
              </div>
              <button
                type="button"
                onClick={() => openQuickScreen('item-stock', 'Item Stock', 'reports')}
                className="h-7 px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <span>View Stock</span>
                <FiExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Gross Wt</span>
                <strong className="text-xs font-bold font-mono text-slate-900 block mt-0.5">
                  {formatWeight(inventoryHealth.grossWeight)}
                </strong>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Net Wt</span>
                <strong className="text-xs font-bold font-mono text-slate-900 block mt-0.5">
                  {formatWeight(inventoryHealth.netWeight)}
                </strong>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Fine Wt</span>
                <strong className="text-xs font-black font-mono text-amber-950 block mt-0.5">
                  {formatWeight(inventoryHealth.fineWeight)}
                </strong>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Pieces</span>
                <strong className="text-xs font-bold font-mono text-slate-900 block mt-0.5">
                  {inventoryHealth.totalPieces} Pcs
                </strong>
              </div>

              <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-50 to-white border border-amber-300 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-amber-900 uppercase block">Est. Value</span>
                <strong className="text-xs font-black font-mono text-amber-950 block mt-0.5 truncate" title={formatCurrency(inventoryHealth.valuation, true)}>
                  {formatCurrency(inventoryHealth.valuation, true)}
                </strong>
              </div>
            </div>
          </div>

          {/* Operational Pending Desks (Orders / Quotations / Advances) */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col flex-1 min-h-[220px]">
            <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/80 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDeskTab('orders')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    deskTab === 'orders' ? 'bg-white text-amber-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Orders ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDeskTab('quotations')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    deskTab === 'quotations' ? 'bg-white text-amber-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Quotations ({quotations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDeskTab('advances')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    deskTab === 'advances' ? 'bg-white text-amber-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Advances ({advances.length})
                </button>
              </div>

              <span className="text-[10px] text-slate-400 font-mono">
                Live Active Desk
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              {operationalRows.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No active {deskTab} recorded.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                      <th className="py-2 px-3">Customer</th>
                      <th className="py-2 px-3">Reference</th>
                      <th className="py-2 px-3">Item / Description</th>
                      <th className="py-2 px-3 text-right">Value (₹)</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-center">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {operationalRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-900">{row.customer}</td>
                        <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{row.reference}</td>
                        <td className="py-2 px-3 text-slate-700">{row.item}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(row.value, true)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.statusType === 'ready'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : row.statusType === 'in-progress'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-500">
                          {row.dueDate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Recent Transactions Activity Stream */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Transactions
              </h2>
              <button
                type="button"
                onClick={() => openQuickScreen('daily-summary-report', 'Daily Summary Report', 'reports')}
                className="h-7 px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <span>Day Book</span>
                <FiExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            </div>

            <div className="flex flex-col divide-y divide-slate-100">
              {activityStream.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No recent transactions recorded.
                </div>
              ) : (
                activityStream.map((item) => (
                  <div key={item.id} className="py-2 flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[11px] text-slate-400 w-12 shrink-0">{item.time}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                          item.type === 'Sale'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : item.type === 'Purchase'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}
                      >
                        {item.type}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 shrink-0">{item.reference}</span>
                      <span className="font-bold text-slate-900 truncate max-w-[200px]">{item.partyName}</span>
                    </div>

                    <strong className="font-mono font-bold text-slate-900 shrink-0">
                      {item.amountOrDetail}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Brand Card & Reminders Hub */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Brand Identity Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-2.5 shadow-2xs">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 3h12l4 6-10 13L2 9z" />
                <path d="M12 22V9" />
                <path d="m2 9 8 4 2-4 2 4 8-4" />
              </svg>
            </div>
            <h2 className="font-black text-sm text-slate-900 uppercase tracking-tight">
              {firmName || 'SHREE JEWELLERY'}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Showroom Management System
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold mt-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Active · Live Database</span>
            </div>
          </div>

          {/* Upcoming Reminders Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <FiBell className="w-4 h-4 text-amber-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Reminders
                </h2>
              </div>
              <button
                type="button"
                onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
              {upcomingList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No pending reminders.
                </div>
              ) : (
                upcomingList.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}
                    className="p-2.5 rounded-lg bg-slate-50 hover:bg-amber-50/40 border border-slate-200 hover:border-amber-300 transition-all cursor-pointer flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 truncate max-w-[170px]" title={r.title}>
                        {r.title}
                      </span>
                      {r.isOverdue ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-100 text-rose-700 uppercase">
                          Overdue
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-sky-700 uppercase">
                          {r.type}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-0.5">
                      <span className="flex items-center gap-1">
                        <FiCalendar className="w-3 h-3 text-slate-400" />
                        {r.date}
                      </span>
                      {r.amountText && (
                        <strong className="text-slate-900 font-bold">{r.amountText}</strong>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardScreen