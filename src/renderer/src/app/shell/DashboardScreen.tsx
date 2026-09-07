import React, { useEffect, useMemo, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import './DashboardScreen.css'
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
  const [lastSynced, setLastSynced] = useState<Date>(new Date())

  // Canonical backend raw states
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
  const [salesHeaders, setSalesHeaders] = useState<any[]>([])
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoiceRecord[]>([])
  const [purchaseHeaders, setPurchaseHeaders] = useState<any[]>([])

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
      if (results[10].status === 'fulfilled' && Array.isArray(results[10].value)) setSalesHeaders(results[10].value)
      if (results[11].status === 'fulfilled' && Array.isArray(results[11].value)) setPurchaseInvoices(results[11].value)
      if (results[12].status === 'fulfilled' && Array.isArray(results[12].value)) setPurchaseHeaders(results[12].value)

      setLastSynced(new Date())
    } catch {
      // Handle silently
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
      gold24k: findRate('GOLD', '24K', 7485),
      gold22k: findRate('GOLD', '22K', 6860),
      gold18k: findRate('GOLD', '18K', 5615),
      silver999: findRate('SILVER', '999', 88.5),
      silver925: findRate('SILVER', '925', 81.8)
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
        closing: dailySummary?.cash?.closingBalance ?? 0, 
        opening: dailySummary?.cash?.openingBalance ?? 0, 
        net: dailySummary?.cash?.netMovement ?? ((dailySummary?.cash?.closingBalance ?? 0) - (dailySummary?.cash?.openingBalance ?? 0)) 
      },
      receivables: { 
        amount: outstanding?.receivableTotals?.cash ?? 0, 
        count: outstanding?.receivable?.length ?? 0 
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
      if (r.fineAmount && r.fineAmount > 0) amountText = formatWeight(r.fineAmount)
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

      const valuation = Math.round(fine * (liveRatesDisplay.gold24k || 7485))

      return { grossWeight: gross, netWeight: net, fineWeight: fine, totalPieces: pcs, valuation }
    }
    return { grossWeight: 0, netWeight: 0, fineWeight: 0, totalPieces: 0, valuation: 0 }
  }, [itemStock, liveRatesDisplay.gold24k])

  const operationalRows = useMemo((): OperationalTableRow[] => {
    if (deskTab === 'orders') {
      return orders.slice(0, 6).map((o) => ({
        id: o.id,
        customer: o.customerName || o.accountName || 'Customer',
        reference: o.orderNumber || '-',
        item: o.metalType ? `${o.metalType} Jewellery` : 'Jewellery Article',
        value: Number(o.grandTotal || 0),
        status: o.status === 'IN_PROGRESS' ? 'In Progress' : o.status === 'READY' ? 'Ready' : o.status === 'COMPLETED' ? 'Completed' : o.status || 'Confirmed',
        statusType: o.status === 'IN_PROGRESS' ? 'in-progress' : o.status === 'READY' || o.status === 'COMPLETED' ? 'ready' : 'pending',
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
        status: q.status === 'ACCEPTED' ? 'Accepted' : q.status === 'CONVERTED' ? 'Converted' : q.status === 'EXPIRED' ? 'Expired' : q.status || 'Pending',
        statusType: q.status === 'ACCEPTED' || q.status === 'CONVERTED' ? 'ready' : q.status === 'EXPIRED' ? 'expiring' : 'pending',
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
        status: a.status === 'FULLY_ALLOCATED' ? 'Allocated' : a.status === 'PARTIALLY_ALLOCATED' ? 'Partial' : 'Available',
        statusType: a.status === 'FULLY_ALLOCATED' ? 'ready' : a.status === 'PARTIALLY_ALLOCATED' ? 'partial' : 'in-progress',
        dueDate: a.advanceDate ? a.advanceDate.slice(0, 10) : '-',
        type: 'advance'
      }))
    }
  }, [deskTab, orders, quotations, advances])

  const activityStream = useMemo((): ActivityItem[] => {
    const stream: ActivityItem[] = []
    
    for (const inv of salesInvoices) {
      const ts = inv.createdAt ? new Date(inv.createdAt).getTime() : inv.invoiceDate ? new Date(inv.invoiceDate).getTime() : 0
      stream.push({
        id: `sinv-${inv.id}`, time: formatActivityTime(inv.createdAt || inv.invoiceDate),
        type: 'Sale', typeClass: 'sale', reference: inv.invoiceNumber || 'INV',
        partyName: inv.customerName || 'Customer', amountOrDetail: formatCurrency(Number(inv.grandTotal || 0), true), timestamp: ts
      })
    }

    for (const pinv of purchaseInvoices) {
      const ts = pinv.createdAt ? new Date(pinv.createdAt).getTime() : pinv.invoiceDate ? new Date(pinv.invoiceDate).getTime() : 0
      stream.push({
        id: `pinv-${pinv.id}`, time: formatActivityTime(pinv.createdAt || pinv.invoiceDate),
        type: 'Purchase', typeClass: 'purchase', reference: pinv.invoiceNumber || 'PINV',
        partyName: pinv.supplierName || 'Supplier', amountOrDetail: formatCurrency(Number(pinv.grandTotal || 0), true), timestamp: ts
      })
    }

    for (const adv of advances) {
      const ts = adv.createdAt ? new Date(adv.createdAt).getTime() : adv.advanceDate ? new Date(adv.advanceDate).getTime() : 0
      stream.push({
        id: `adv-${adv.id}`, time: formatActivityTime(adv.createdAt || adv.advanceDate),
        type: 'Advance', typeClass: 'advance', reference: adv.advanceNumber || 'ADV',
        partyName: adv.customerName || adv.accountName || 'Customer', amountOrDetail: formatCurrency(Number(adv.amount || 0), true), timestamp: ts
      })
    }

    stream.sort((a, b) => b.timestamp - a.timestamp)
    return stream.slice(0, 6)
  }, [salesInvoices, purchaseInvoices, advances])

  if (loading && !dailySummary) {
    return (
      <div className="erp-dashboard-loading-state">
        <div className="dashboard-spinner" />
        <span>Syncing Showroom Dashboard...</span>
      </div>
    )
  }

  return (
    <div className="erp-dashboard-container">
      
      {/* 1. EXECUTIVE KPI CARDS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 w-full" aria-label="Executive KPI Overview">
        {/* KPI 1: TODAY'S SALE */}
        <div
          className="erp-card-panel p-3 border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md hover:-translate-y-px transition-all"
          onClick={() => openQuickScreen('sale-register', 'Sale Register', 'reports')}
        >
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Today&apos;s Sale</div>
          <div className="text-lg font-bold text-slate-800 erp-mono-num leading-tight mt-1 truncate">{kpis.sales.count} Bills</div>
          <div className="text-[11px] font-medium text-slate-500 truncate mt-1">
            {kpis.sales.fineWeight > 0 ? `${formatWeight(kpis.sales.fineWeight)} fine · ` : ''}
            {formatCurrency(kpis.sales.amount, true)}
          </div>
        </div>

        {/* KPI 2: TODAY'S PURCHASE */}
        <div
          className="erp-card-panel p-3 border-l-4 border-l-emerald-600 cursor-pointer hover:shadow-md hover:-translate-y-px transition-all"
          onClick={() => openQuickScreen('purchase-register', 'Purchase Register', 'reports')}
        >
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Today&apos;s Purchase</div>
          <div className="text-lg font-bold text-slate-800 erp-mono-num leading-tight mt-1 truncate">{kpis.purchases.count} Bills</div>
          <div className="text-[11px] font-medium text-slate-500 truncate mt-1">
            {kpis.purchases.fineWeight > 0 ? `${formatWeight(kpis.purchases.fineWeight)} fine · ` : ''}
            {formatCurrency(kpis.purchases.amount, true)}
          </div>
        </div>

        {/* KPI 3: CASH IN HAND */}
        <div
          className="erp-card-panel p-3 border-l-4 border-l-sky-500 cursor-pointer hover:shadow-md hover:-translate-y-px transition-all"
          onClick={() => openQuickScreen('cash-book', 'Cash Book', 'reports')}
        >
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Cash in Hand</div>
          <div className="text-lg font-bold text-slate-800 erp-mono-num leading-tight mt-1 truncate">
            ₹{Math.round(kpis.cash.closing).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] font-medium text-slate-500 truncate mt-1">
            Today&apos;s net ₹{Math.round(kpis.cash.net).toLocaleString('en-IN')}
          </div>
        </div>

        {/* KPI 4: RECEIVABLE */}
        <div
          className="erp-card-panel p-3 border-l-4 border-l-rose-500 cursor-pointer hover:shadow-md hover:-translate-y-px transition-all"
          onClick={() => openQuickScreen('outstanding', 'Outstanding', 'reports')}
        >
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Receivable</div>
          <div className="text-lg font-bold text-slate-800 erp-mono-num leading-tight mt-1 truncate">{kpis.receivables.count} A/c</div>
          <div className="text-[11px] font-medium text-slate-500 truncate mt-1">
            Owing {formatCurrency(kpis.receivables.amount, true)}
          </div>
        </div>

        {/* KPI 5: PAYABLE */}
        <div
          className="erp-card-panel p-3 border-l-4 border-l-slate-400 cursor-pointer hover:shadow-md hover:-translate-y-px transition-all"
          onClick={() => openQuickScreen('outstanding', 'Outstanding', 'reports')}
        >
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Payable</div>
          <div className="text-lg font-bold text-slate-800 erp-mono-num leading-tight mt-1 truncate">{kpis.payables.count} A/c</div>
          <div className="text-[11px] font-medium text-slate-500 truncate mt-1">
            Owed {formatCurrency(kpis.payables.amount, true)}
          </div>
        </div>

        {/* KPI 6: REMINDERS */}
        <div
          className="erp-card-panel p-3 border-l-4 border-l-amber-600 cursor-pointer hover:shadow-md hover:-translate-y-px transition-all"
          onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}
        >
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Reminders</div>
          <div className="text-lg font-bold text-slate-800 erp-mono-num leading-tight mt-1 truncate">{overdueCount} Overdue</div>
          <div className="text-[11px] font-medium text-slate-500 truncate mt-1">{upcomingCount} upcoming</div>
        </div>
      </div>

      {/* 2. QUICK ACTION LAUNCHPAD */}
      <section className="erp-quick-launchpad" aria-label="Quick Navigation Launchpad">
        <button type="button" className="launchpad-card" onClick={() => openQuickScreen('pos-billing', 'POS Billing', 'transaction')}>
          <div className="launchpad-icon">🛒</div>
          <div className="launchpad-label">Sale</div>
        </button>
        <button type="button" className="launchpad-card" onClick={() => openQuickScreen('purchase-invoice', 'Purchase Inward', 'transaction')}>
          <div className="launchpad-icon">📥</div>
          <div className="launchpad-label">Purchase</div>
        </button>
        <button type="button" className="launchpad-card" onClick={() => openQuickScreen('cash-receipt-jama', 'Cash Receipt / Jama', 'transaction')}>
          <div className="launchpad-icon">💰</div>
          <div className="launchpad-label">Receipt</div>
        </button>
        <button type="button" className="launchpad-card" onClick={() => openQuickScreen('cash-payment-nave', 'Cash Payment / Nave', 'transaction')}>
          <div className="launchpad-icon">💵</div>
          <div className="launchpad-label">Payment</div>
        </button>
        <button type="button" className="launchpad-card" onClick={() => openQuickScreen('account-master', 'Account Master', 'master')}>
          <div className="launchpad-icon">👥</div>
          <div className="launchpad-label">Accounts</div>
        </button>
        <button type="button" className="launchpad-card" onClick={() => openQuickScreen('item-master', 'Item Master', 'master')}>
          <div className="launchpad-icon">💍</div>
          <div className="launchpad-label">Items</div>
        </button>
        <button type="button" className="launchpad-card" onClick={() => openQuickScreen('financial-reports-hub', 'Financial Reports', 'reports')}>
          <div className="launchpad-icon">📊</div>
          <div className="launchpad-label">Reports</div>
        </button>
        <button type="button" className="launchpad-card" onClick={() => openQuickScreen('backup', 'Backup', 'utility')}>
          <div className="launchpad-icon">💾</div>
          <div className="launchpad-label">Backup</div>
        </button>
        <button type="button" className="launchpad-card" onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}>
          <div className="launchpad-icon">🔔</div>
          <div className="launchpad-label">Reminders</div>
        </button>
      </section>

      {/* 3. MAIN WORKSPACE: 2-COLUMN LAYOUT */}
      <section className="erp-dashboard-body-grid">
        
        {/* LEFT / CENTER REGION */}
        <div className="body-center-column">
          {/* Live Bullion Market Rates Strip */}
          <div className="dashboard-rates-strip">
            <div className="rates-strip-badge">
              <span className="gold-gem-dot">●</span>
              <span className="rates-strip-title">Live Bullion</span>
            </div>
            <div className="rates-ticker-container">
              <div className="rate-ticker-pill">
                <span className="rate-name">Gold 24K:</span>
                <span className="rate-value">{formatCurrency(liveRatesDisplay.gold24k, true)}/g</span>
              </div>
              <div className="rate-ticker-pill">
                <span className="rate-name">Gold 22K:</span>
                <span className="rate-value">{formatCurrency(liveRatesDisplay.gold22k, true)}/g</span>
              </div>
              <div className="rate-ticker-pill">
                <span className="rate-name">Gold 18K:</span>
                <span className="rate-value">{formatCurrency(liveRatesDisplay.gold18k, true)}/g</span>
              </div>
              <div className="rate-ticker-pill">
                <span className="rate-name">Silver 999:</span>
                <span className="rate-value">{formatCurrency(liveRatesDisplay.silver999, true)}/g</span>
              </div>
            </div>
            <button
              type="button"
              className="quick-action-pill-btn"
              onClick={() => void loadDashboardData(true)}
              disabled={refreshing}
              title={`Last synced: ${dayjs(lastSynced).format('hh:mm A')}`}
            >
              {refreshing ? 'Syncing...' : '↻ Refresh'}
            </button>
          </div>

          {/* Showroom Inventory Health Summary */}
          <div className="erp-card-panel">
            <div className="erp-card-panel-header">
              <div className="erp-card-panel-title">
                <span>Inventory Valuation</span>
                <span className="ml-2 px-2 py-0.5 text-[9px] uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">Verified Data</span>
              </div>
              <button type="button" className="quick-action-pill-btn" onClick={() => openQuickScreen('item-stock', 'Item Stock', 'reports')}>
                View Stock
              </button>
            </div>
            <div className="inventory-summary-metrics">
              <div className="inv-metric-box">
                <span className="inv-metric-label">Gross Wt</span>
                <span className="inv-metric-val">{formatWeight(inventoryHealth.grossWeight)}</span>
              </div>
              <div className="inv-metric-box">
                <span className="inv-metric-label">Net Wt</span>
                <span className="inv-metric-val">{formatWeight(inventoryHealth.netWeight)}</span>
              </div>
              <div className="inv-metric-box">
                <span className="inv-metric-label">Fine Wt</span>
                <span className="inv-metric-val">{formatWeight(inventoryHealth.fineWeight)}</span>
              </div>
              <div className="inv-metric-box">
                <span className="inv-metric-label">Pieces</span>
                <span className="inv-metric-val">{inventoryHealth.totalPieces}</span>
              </div>
              <div className="inv-metric-box">
                <span className="inv-metric-label">Est. Value</span>
                <span className="inv-metric-val text-amber-700">{formatCurrency(inventoryHealth.valuation, true)}</span>
              </div>
            </div>
          </div>

          {/* Operational Pending Desks */}
          <div className="erp-card-panel p-0 overflow-hidden">
            <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-slate-200">
              <div className="erp-filter-strip p-1 bg-slate-100 rounded-md inline-flex">
                <button type="button" className={`erp-filter-pill-btn ${deskTab === 'orders' ? 'active shadow-sm bg-white' : ''}`} onClick={() => setDeskTab('orders')}>
                  Orders ({orders.length})
                </button>
                <button type="button" className={`erp-filter-pill-btn ${deskTab === 'quotations' ? 'active shadow-sm bg-white' : ''}`} onClick={() => setDeskTab('quotations')}>
                  Quotations ({quotations.length})
                </button>
                <button type="button" className={`erp-filter-pill-btn ${deskTab === 'advances' ? 'active shadow-sm bg-white' : ''}`} onClick={() => setDeskTab('advances')}>
                  Advances ({advances.length})
                </button>
              </div>
            </div>

            <div className="erp-table-container max-h-[300px]">
              {operationalRows.length === 0 ? (
                <div className="activity-empty-state">No active {deskTab} found.</div>
              ) : (
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Reference</th>
                      <th>Item</th>
                      <th className="text-right">Value</th>
                      <th className="text-center">Status</th>
                      <th className="text-center">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operationalRows.map((row) => (
                      <tr key={row.id}>
                        <td className="font-semibold text-slate-800">{row.customer}</td>
                        <td className="erp-mono-num text-slate-500">{row.reference}</td>
                        <td>{row.item}</td>
                        <td className="erp-mono-num text-right font-semibold">{formatCurrency(row.value, true)}</td>
                        <td className="text-center">
                          <span className={`erp-status-pill ${row.statusType}`}>{row.status}</span>
                        </td>
                        <td className="text-center erp-mono-num text-slate-500">{row.dueDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Activity Stream */}
          <div className="erp-card-panel">
            <div className="erp-card-panel-header">
              <div className="erp-card-panel-title">Recent Transactions</div>
              <button type="button" className="quick-action-pill-btn" onClick={() => openQuickScreen('daily-summary-report', 'Daily Summary Report', 'reports')}>
                Day Book
              </button>
            </div>
            <div className="activity-stream-container">
              {activityStream.length === 0 ? (
                <div className="activity-empty-state">No recent transactions recorded.</div>
              ) : (
                activityStream.map((item) => (
                  <div key={item.id} className="activity-stream-item">
                    <span className="activity-time">{item.time}</span>
                    <span className={`table-status-pill ${item.typeClass === 'sale' ? 'ready' : item.typeClass === 'purchase' ? 'in-progress' : 'pending'}`}>
                      {item.type}
                    </span>
                    <span className="activity-ref">{item.reference}</span>
                    <span className="activity-party">{item.partyName}</span>
                    <span className="activity-amount">{item.amountOrDetail}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR COLUMN */}
        <div className="body-right-column">
          
          {/* Brand Showcase Card */}
          <div className="right-brand-showcase-card">
            <div className="brand-diamond-icon">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="1.5">
                <path d="M6 3h12l4 6-10 13L2 9z" />
                <path d="M12 22V9" />
                <path d="m2 9 8 4 2-4 2 4 8-4" />
              </svg>
            </div>
            <h2 className="brand-showcase-title">{firmName ? firmName.toUpperCase() : 'JEWELLERY ERP'}</h2>
            <p className="brand-showcase-subtitle">Showroom Management System</p>
            <div className="system-status-indicator">
              <span className="status-live-dot" />
              <span>System Active • Live Database</span>
            </div>
          </div>

          {/* Upcoming Reminders Card */}
          <div className="erp-card-panel flex-1">
            <div className="erp-card-panel-header">
              <span className="erp-card-panel-title text-brand-primary text-[12px] uppercase tracking-wider">Reminders</span>
              <button type="button" className="text-xs font-semibold text-brand-primary hover:underline" onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}>
                View All
              </button>
            </div>
            <div className="flex-1">
              {upcomingList.length === 0 ? (
                <div className="text-xs text-slate-400 py-2 text-center">No pending reminders.</div>
              ) : (
                <div className="reminders-list">
                  {upcomingList.slice(0, 5).map((r) => (
                    <div key={r.id} className="reminder-item-row" onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}>
                      <div className="flex items-center justify-between">
                        <span className="reminder-item-title">{r.title}</span>
                        {r.isOverdue ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold uppercase">Overdue</span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-bold uppercase">{r.type}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="reminder-item-date erp-mono-num">{r.date}</span>
                        {r.amountText && <span className="text-[11px] font-bold text-slate-800 erp-mono-num">{r.amountText}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
        </div>
      </section>
    </div>
  )
} 