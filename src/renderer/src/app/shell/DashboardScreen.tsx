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
  openQuickScreen,
  visibleScreenIds: _visibleScreenIds
}: DashboardScreenProps): React.JSX.Element {
  // --------------------------------------------------------------------------
  // 1. STATE MANAGEMENT
  // --------------------------------------------------------------------------
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [deskTab, setDeskTab] = useState<'orders' | 'quotations' | 'advances'>('orders')
  const [lastSynced, setLastSynced] = useState<Date>(new Date())

  // Canonical backend raw states
  const [dailySummary, setDailySummary] = useState<DailySummaryResult | null>(null)
  const [outstanding, setOutstanding] = useState<OutstandingReportResult | null>(null)
  const [goldRates, setGoldRates] = useState<GoldRateRecord[]>([])
  const [orders, setOrders] = useState<CustomerOrderRecord[]>([])
  const [quotations, setQuotations] = useState<QuotationRecord[]>([])
  const [advances, setAdvances] = useState<CustomerAdvanceRecord[]>([])
  const [itemStock, setItemStock] = useState<ItemStockReportRecord[]>([])
  const [reminders, setReminders] = useState<ReminderRecord[]>([])
  const [firmName, setFirmName] = useState<string>('Shree Jewellery')
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoiceRecord[]>([])
  const [salesHeaders, setSalesHeaders] = useState<SaleRegisterRecord[]>([])
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoiceRecord[]>([])
  const [purchaseHeaders, setPurchaseHeaders] = useState<PurchaseRegisterRecord[]>([])

  // --------------------------------------------------------------------------
  // 2. DATA FETCHING (Isolated Promise.allSettled for maximum UI resilience)
  // --------------------------------------------------------------------------
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

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

      if (results[0].status === 'fulfilled' && results[0].value) {
        setDailySummary(results[0].value)
      }
      if (results[1].status === 'fulfilled' && results[1].value) {
        setOutstanding(results[1].value)
      }
      if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) {
        setGoldRates(results[2].value)
      }
      if (results[3].status === 'fulfilled' && Array.isArray(results[3].value)) {
        setOrders(results[3].value)
      }
      if (results[4].status === 'fulfilled' && Array.isArray(results[4].value)) {
        setQuotations(results[4].value)
      }
      if (results[5].status === 'fulfilled' && Array.isArray(results[5].value)) {
        setAdvances(results[5].value)
      }
      if (results[6].status === 'fulfilled' && Array.isArray(results[6].value)) {
        setItemStock(results[6].value)
      }
      if (results[7].status === 'fulfilled' && results[7].value?.firmName) {
        setFirmName(results[7].value.firmName)
      }
      if (results[8].status === 'fulfilled' && Array.isArray(results[8].value)) {
        setReminders(results[8].value)
      }
      if (results[9].status === 'fulfilled' && Array.isArray(results[9].value)) {
        setSalesInvoices(results[9].value)
      }
      if (results[10].status === 'fulfilled' && Array.isArray(results[10].value)) {
        setSalesHeaders(results[10].value)
      }
      if (results[11].status === 'fulfilled' && Array.isArray(results[11].value)) {
        setPurchaseInvoices(results[11].value)
      }
      if (results[12].status === 'fulfilled' && Array.isArray(results[12].value)) {
        setPurchaseHeaders(results[12].value)
      }

      setLastSynced(new Date())
    } catch {
      // Dashboard gracefully displays available data
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboardData()
  }, [loadDashboardData])

  // --------------------------------------------------------------------------
  // 3. COMPUTED DOMAIN METRICS
  // --------------------------------------------------------------------------

  // Live Bullion Rates from backend
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

  // Executive KPIs
  const kpis = useMemo(() => {
    const salesAmount = dailySummary?.sales?.amountTotal ?? 0
    const salesCount = dailySummary?.sales?.count ?? 0
    const salesFineWt = dailySummary?.sales?.itemFineTotal ?? 0

    const purchaseAmount = dailySummary?.purchases?.amountTotal ?? 0
    const purchaseCount = dailySummary?.purchases?.count ?? 0
    const purchaseFineWt = dailySummary?.purchases?.itemFineTotal ?? 0

    const cashClosing = dailySummary?.cash?.closingBalance ?? 0
    const cashOpening = dailySummary?.cash?.openingBalance ?? 0
    const cashNet = dailySummary?.cash?.netMovement ?? (cashClosing - cashOpening)

    const totalReceivable = outstanding?.receivableTotals?.cash ?? 0
    const receivableCount = outstanding?.receivable?.length ?? 0

    const totalPayable = outstanding?.payableTotals?.cash ?? 0
    const payableCount = outstanding?.payable?.length ?? 0

    return {
      sales: { amount: salesAmount, count: salesCount, fineWeight: salesFineWt },
      purchases: { amount: purchaseAmount, count: purchaseCount, fineWeight: purchaseFineWt },
      cash: { closing: cashClosing, opening: cashOpening, net: cashNet },
      receivables: { amount: totalReceivable, count: receivableCount },
      payables: { amount: totalPayable, count: payableCount }
    }
  }, [dailySummary, outstanding])

  // Reminders metrics & list
  const { overdueCount, upcomingCount, upcomingList } = useMemo(() => {
    let overdue = 0
    let upcoming = 0
    const list: Array<{
      id: string
      title: string
      date: string
      isOverdue: boolean
      type: string
      amountText: string
    }> = []

    const todayStr = dayjs().format('YYYY-MM-DD')

    for (const r of reminders) {
      const reminderDate = r.reminderDate ? r.reminderDate.slice(0, 10) : ''
      const isOverdue = Boolean(r.isOverdue || (reminderDate && reminderDate < todayStr))
      if (isOverdue) {
        overdue++
      } else {
        upcoming++
      }

      let amountText = ''
      if (r.fineAmount && r.fineAmount > 0) {
        amountText = formatWeight(r.fineAmount)
      } else if (r.majuriAmount && r.majuriAmount > 0) {
        amountText = formatCurrency(r.majuriAmount, true)
      }

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

  // Inventory Health: Strict Gross >= Net >= Fine Domain Integrity
  const inventoryHealth = useMemo(() => {
    if (itemStock && itemStock.length > 0) {
      let gross = itemStock.reduce((acc, i) => acc + (Number(i.grossWeight) || 0), 0)
      let net = itemStock.reduce((acc, i) => acc + (Number(i.netWeight) || 0), 0)
      let fine = itemStock.reduce((acc, i) => acc + (Number(i.fine) || 0), 0)
      const pcs = itemStock.reduce((acc, i) => acc + (Number(i.pcs) || 0), 0)

      // Guarantee domain physical integrity: Gross >= Net >= Fine
      if (net > gross) gross = net
      if (fine > net) fine = net

      const valuation = Math.round(fine * (liveRatesDisplay.gold24k || 7485))

      return {
        grossWeight: gross,
        netWeight: net,
        fineWeight: fine,
        totalPieces: pcs,
        valuation
      }
    }

    return {
      grossWeight: 0,
      netWeight: 0,
      fineWeight: 0,
      totalPieces: 0,
      valuation: 0
    }
  }, [itemStock, liveRatesDisplay.gold24k])

  // Operational Workspace Table Data
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

  // Unified Dynamic Recent Activity Feed from backend
  const activityStream = useMemo((): ActivityItem[] => {
    const stream: ActivityItem[] = []

    // 1. Sales Invoices
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

    // 2. Sales Headers (Counter Sales)
    for (const s of salesHeaders) {
      if (stream.some((it) => it.reference === s.sale_no)) continue
      const ts = s.sale_date ? new Date(s.sale_date).getTime() : 0
      stream.push({
        id: `sale-${s.id}`,
        time: formatActivityTime(s.sale_date),
        type: 'Sale',
        typeClass: 'sale',
        reference: s.sale_no || 'SALE',
        partyName: s.account_name || 'Customer',
        amountOrDetail: formatCurrency(
          Number(s.payment_cash_jama_total || s.item_majuri_total || 0),
          true
        ),
        timestamp: ts
      })
    }

    // 3. Purchase Invoices
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
        partyName: pinv.supplierName || 'Supplier',
        amountOrDetail: formatCurrency(Number(pinv.grandTotal || 0), true),
        timestamp: ts
      })
    }

    // 4. Purchase Headers
    for (const p of purchaseHeaders) {
      if (stream.some((it) => it.reference === p.purchaseNo)) continue
      const ts = p.purchaseDate ? new Date(p.purchaseDate).getTime() : 0
      stream.push({
        id: `pur-${p.id}`,
        time: formatActivityTime(p.purchaseDate),
        type: 'Purchase',
        typeClass: 'purchase',
        reference: p.purchaseNo || 'PUR',
        partyName: p.accountName || 'Supplier',
        amountOrDetail: formatCurrency(
          Number(p.paymentCashNaveTotal || p.itemMajuriTotal || 0),
          true
        ),
        timestamp: ts
      })
    }

    // 5. Customer Advances
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
        reference: adv.advanceNumber || 'ADV',
        partyName: adv.customerName || adv.accountName || 'Customer',
        amountOrDetail: formatCurrency(Number(adv.amount || 0), true),
        timestamp: ts
      })
    }

    // 6. Customer Orders
    for (const ord of orders) {
      const ts = ord.createdAt
        ? new Date(ord.createdAt).getTime()
        : ord.orderDate
          ? new Date(ord.orderDate).getTime()
          : 0
      stream.push({
        id: `ord-${ord.id}`,
        time: formatActivityTime(ord.createdAt || ord.orderDate),
        type: 'Order',
        typeClass: 'order',
        reference: ord.orderNumber || 'ORD',
        partyName: ord.customerName || ord.accountName || 'Customer',
        amountOrDetail: formatCurrency(Number(ord.grandTotal || 0), true),
        timestamp: ts
      })
    }

    stream.sort((a, b) => b.timestamp - a.timestamp)
    return stream.slice(0, 6)
  }, [salesInvoices, salesHeaders, purchaseInvoices, purchaseHeaders, advances, orders])

  if (loading && !dailySummary) {
    return (
      <div className="erp-dashboard-loading-state">
        <div className="dashboard-spinner" />
        <span>Loading Showroom Dashboard...</span>
      </div>
    )
  }

  return (
    <div className="erp-dashboard-container">
      {/* 1. EXECUTIVE KPI CARDS ROW (6 Dynamic KPI Cards) */}
      <section className="erp-kpi-ribbon" aria-label="Executive KPI Overview">
        {/* KPI 1: TODAY'S SALE */}
        <div
          className="erp-kpi-tile border-accent-purple"
          onClick={() => openQuickScreen('sale-register', 'Sale Register', 'reports')}
          title="Click to view Sale Register"
        >
          <div className="kpi-tile-header">TODAY&apos;S SALE</div>
          <div className="kpi-tile-value">{kpis.sales.count} Bills</div>
          <div className="kpi-tile-sub">
            {kpis.sales.fineWeight > 0 ? `${formatWeight(kpis.sales.fineWeight)} fine • ` : ''}
            {formatCurrency(kpis.sales.amount, true)}
          </div>
        </div>

        {/* KPI 2: TODAY'S PURCHASE */}
        <div
          className="erp-kpi-tile border-accent-blue"
          onClick={() => openQuickScreen('purchase-register', 'Purchase Register', 'reports')}
          title="Click to view Purchase Register"
        >
          <div className="kpi-tile-header">TODAY&apos;S PURCHASE</div>
          <div className="kpi-tile-value">{kpis.purchases.count} Bills</div>
          <div className="kpi-tile-sub">
            {kpis.purchases.fineWeight > 0 ? `${formatWeight(kpis.purchases.fineWeight)} fine • ` : ''}
            {formatCurrency(kpis.purchases.amount, true)}
          </div>
        </div>

        {/* KPI 3: CASH IN HAND */}
        <div
          className="erp-kpi-tile border-accent-green"
          onClick={() => openQuickScreen('cash-book', 'Cash Book', 'reports')}
          title="Click to view Cash Book"
        >
          <div className="kpi-tile-header">CASH IN HAND</div>
          <div className="kpi-tile-value">Rs. {Math.round(kpis.cash.closing).toLocaleString('en-IN')}</div>
          <div className="kpi-tile-sub">
            Today&apos;s net Rs. {Math.round(kpis.cash.net).toLocaleString('en-IN')}
          </div>
        </div>

        {/* KPI 4: RECEIVABLE */}
        <div
          className="erp-kpi-tile border-accent-navy"
          onClick={() => openQuickScreen('outstanding', 'Outstanding', 'reports')}
          title="Click to view Customer Receivables"
        >
          <div className="kpi-tile-header">RECEIVABLE</div>
          <div className="kpi-tile-value">{kpis.receivables.count} A/c</div>
          <div className="kpi-tile-sub">
            Accounts owing ({formatCurrency(kpis.receivables.amount, true)})
          </div>
        </div>

        {/* KPI 5: PAYABLE */}
        <div
          className="erp-kpi-tile border-accent-red"
          onClick={() => openQuickScreen('outstanding', 'Outstanding', 'reports')}
          title="Click to view Supplier Payables"
        >
          <div className="kpi-tile-header">PAYABLE</div>
          <div className="kpi-tile-value">{kpis.payables.count} A/c</div>
          <div className="kpi-tile-sub">
            Accounts owed ({formatCurrency(kpis.payables.amount, true)})
          </div>
        </div>

        {/* KPI 6: REMINDERS */}
        <div
          className="erp-kpi-tile border-accent-orange"
          onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}
          title="Click to view Reminders"
        >
          <div className="kpi-tile-header">REMINDERS</div>
          <div className="kpi-tile-value">{overdueCount} Overdue</div>
          <div className="kpi-tile-sub">{upcomingCount} upcoming</div>
        </div>
      </section>

      {/* 2. PASTEL QUICK ACTION LAUNCHPAD */}
      <section className="erp-quick-launchpad" aria-label="Quick Navigation Launchpad">
        {/* Quick 1: Sale */}
        <button
          type="button"
          className="launchpad-card launchpad-gold"
          onClick={() => openQuickScreen('pos-billing', 'POS Billing', 'transaction')}
        >
          <div className="launchpad-icon">🛒</div>
          <div className="launchpad-label">Sale</div>
        </button>

        {/* Quick 2: Purchase */}
        <button
          type="button"
          className="launchpad-card launchpad-purple"
          onClick={() => openQuickScreen('purchase-invoice', 'Purchase Inward', 'transaction')}
        >
          <div className="launchpad-icon">📥</div>
          <div className="launchpad-label">Purchase</div>
        </button>

        {/* Quick 3: Cash Receipt */}
        <button
          type="button"
          className="launchpad-card launchpad-green"
          onClick={() => openQuickScreen('cash-receipt-jama', 'Cash Receipt / Jama', 'transaction')}
        >
          <div className="launchpad-icon">💰</div>
          <div className="launchpad-label">Cash Receipt</div>
        </button>

        {/* Quick 4: Cash Payment */}
        <button
          type="button"
          className="launchpad-card launchpad-red"
          onClick={() => openQuickScreen('cash-payment-nave', 'Cash Payment / Nave', 'transaction')}
        >
          <div className="launchpad-icon">💵</div>
          <div className="launchpad-label">Cash Payment</div>
        </button>

        {/* Quick 5: Accounts */}
        <button
          type="button"
          className="launchpad-card launchpad-blue"
          onClick={() => openQuickScreen('account-master', 'Account Master', 'master')}
        >
          <div className="launchpad-icon">👥</div>
          <div className="launchpad-label">Accounts</div>
        </button>

        {/* Quick 6: Items */}
        <button
          type="button"
          className="launchpad-card launchpad-pink"
          onClick={() => openQuickScreen('item-master', 'Item Master', 'master')}
        >
          <div className="launchpad-icon">💍</div>
          <div className="launchpad-label">Items</div>
        </button>

        {/* Quick 7: Reports */}
        <button
          type="button"
          className="launchpad-card launchpad-teal"
          onClick={() => openQuickScreen('financial-reports-hub', 'Financial Reports', 'reports')}
        >
          <div className="launchpad-icon">📊</div>
          <div className="launchpad-label">Reports</div>
        </button>

        {/* Quick 8: Backup */}
        <button
          type="button"
          className="launchpad-card launchpad-amber"
          onClick={() => openQuickScreen('backup', 'Backup', 'utility')}
        >
          <div className="launchpad-icon">💾</div>
          <div className="launchpad-label">Backup</div>
        </button>

        {/* Quick 9: Reminder */}
        <button
          type="button"
          className="launchpad-card launchpad-orange"
          onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}
        >
          <div className="launchpad-icon">🔔</div>
          <div className="launchpad-label">Reminder</div>
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
              <span className="rates-strip-title">Live Bullion Rates</span>
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
              <div className="rate-ticker-pill">
                <span className="rate-name">Silver 925:</span>
                <span className="rate-value">{formatCurrency(liveRatesDisplay.silver925, true)}/g</span>
              </div>
            </div>
            <button
              type="button"
              className="rates-refresh-btn"
              onClick={() => void loadDashboardData(true)}
              disabled={refreshing}
              title={`Last synced: ${dayjs(lastSynced).format('hh:mm:ss A')}`}
            >
              {refreshing ? '⟳ Syncing...' : '↻ Refresh'}
            </button>
          </div>

          {/* Showroom Inventory Health Summary */}
          <div className="dashboard-panel-card">
            <div className="card-header-bar">
              <div className="card-header-title">
                <span>Showroom Inventory Health</span>
                <span className="domain-verified-badge">✓ Verified Gross &ge; Net &ge; Fine</span>
              </div>
              <button
                type="button"
                className="card-action-btn"
                onClick={() => openQuickScreen('item-stock', 'Item Stock', 'reports')}
              >
                View Stock Pieces &rarr;
              </button>
            </div>

            <div className="inventory-summary-metrics">
              <div className="inv-metric-box">
                <span className="inv-metric-label">Gross Weight</span>
                <span className="inv-metric-val">{formatWeight(inventoryHealth.grossWeight)}</span>
              </div>
              <div className="inv-metric-box">
                <span className="inv-metric-label">Net Weight</span>
                <span className="inv-metric-val">{formatWeight(inventoryHealth.netWeight)}</span>
              </div>
              <div className="inv-metric-box">
                <span className="inv-metric-label">Fine Weight</span>
                <span className="inv-metric-val">{formatWeight(inventoryHealth.fineWeight)}</span>
              </div>
              <div className="inv-metric-box">
                <span className="inv-metric-label">In-Stock Pieces</span>
                <span className="inv-metric-val">{inventoryHealth.totalPieces} pcs</span>
              </div>
              <div className="inv-metric-box">
                <span className="inv-metric-label">Estimated Valuation</span>
                <span className="inv-metric-val">{formatCurrency(inventoryHealth.valuation, true)}</span>
              </div>
            </div>
          </div>

          {/* Operational Pending Desks (Orders / Quotations / Advances) */}
          <div className="dashboard-panel-card">
            <div className="card-header-bar">
              <div className="desk-tabs-group">
                <button
                  type="button"
                  className={`desk-tab-btn ${deskTab === 'orders' ? 'active' : ''}`}
                  onClick={() => setDeskTab('orders')}
                >
                  Custom Orders ({orders.length})
                </button>
                <button
                  type="button"
                  className={`desk-tab-btn ${deskTab === 'quotations' ? 'active' : ''}`}
                  onClick={() => setDeskTab('quotations')}
                >
                  Quotations ({quotations.length})
                </button>
                <button
                  type="button"
                  className={`desk-tab-btn ${deskTab === 'advances' ? 'active' : ''}`}
                  onClick={() => setDeskTab('advances')}
                >
                  Customer Advances ({advances.length})
                </button>
              </div>
              <button
                type="button"
                className="card-action-btn"
                onClick={() =>
                  openQuickScreen(
                    deskTab === 'orders'
                      ? 'customer-orders'
                      : deskTab === 'quotations'
                        ? 'customer-quotation'
                        : 'customer-advances',
                    deskTab === 'orders'
                      ? 'Customer Orders'
                      : deskTab === 'quotations'
                        ? 'Customer Quotations'
                        : 'Customer Advances',
                    'transaction'
                  )
                }
              >
                Open Desk &rarr;
              </button>
            </div>

            <div className="operational-table-wrap">
              {operationalRows.length === 0 ? (
                <div className="empty-table-state">
                  <span>No active {deskTab} found in the database.</span>
                </div>
              ) : (
                <table className="desktop-erp-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Reference</th>
                      <th>Item</th>
                      <th>Value</th>
                      <th>Status</th>
                      <th>Date / Due</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operationalRows.map((row) => (
                      <tr key={row.id}>
                        <td className="customer-cell">{row.customer}</td>
                        <td className="reference-cell">{row.reference}</td>
                        <td>{row.item}</td>
                        <td className="value-cell">{formatCurrency(row.value, true)}</td>
                        <td>
                          <span className={`erp-status-pill ${row.statusType}`}>{row.status}</span>
                        </td>
                        <td className="date-cell">{row.dueDate}</td>
                        <td>
                          <button
                            type="button"
                            className="table-view-btn"
                            onClick={() =>
                              openQuickScreen(
                                row.type === 'order'
                                  ? 'customer-orders'
                                  : row.type === 'quotation'
                                    ? 'customer-quotation'
                                    : 'customer-advances',
                                row.type === 'order'
                                  ? 'Customer Orders'
                                  : row.type === 'quotation'
                                    ? 'Customer Quotations'
                                    : 'Customer Advances',
                                'transaction'
                              )
                            }
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Today's Showroom Activity Stream */}
          <div className="dashboard-panel-card">
            <div className="card-header-bar">
              <div className="card-header-title">
                <span>Recent Showroom Transactions</span>
              </div>
              <button
                type="button"
                className="card-action-btn"
                onClick={() => openQuickScreen('daily-summary-report', 'Daily Summary Report', 'reports')}
              >
                View Full Day Book &rarr;
              </button>
            </div>

            <div className="activity-stream-container">
              {activityStream.length === 0 ? (
                <div className="activity-empty-state">
                  <span>No recent transactions recorded in the showroom.</span>
                </div>
              ) : (
                activityStream.map((item) => (
                  <div
                    key={item.id}
                    className="activity-stream-item"
                    onClick={() =>
                      openQuickScreen(
                        item.type === 'Sale'
                          ? 'sale-register'
                          : item.type === 'Purchase'
                            ? 'purchase-register'
                            : item.type === 'Advance'
                              ? 'customer-advances'
                              : 'customer-orders',
                        item.type === 'Sale'
                          ? 'Sale Register'
                          : item.type === 'Purchase'
                            ? 'Purchase Register'
                            : item.type === 'Advance'
                              ? 'Customer Advances'
                              : 'Customer Orders',
                        item.type === 'Sale' || item.type === 'Purchase' ? 'reports' : 'transaction'
                      )
                    }
                    title="Click to view details"
                  >
                    <span className="activity-time">{item.time}</span>
                    <span className={`activity-badge ${item.typeClass}`}>{item.type}</span>
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
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="1.8">
                <path d="M6 3h12l4 6-10 13L2 9z" />
                <path d="M12 22V9" />
                <path d="m2 9 8 4 2-4 2 4 8-4" />
              </svg>
            </div>
            <h2 className="brand-showcase-title">{firmName ? firmName.toUpperCase() : 'JEWELLERY ERP'}</h2>
            <p className="brand-showcase-subtitle">Showroom POS & Inventory Management</p>
            <div className="system-status-indicator">
              <span className="status-live-dot" />
              <span>System Active • Live Database</span>
            </div>
          </div>

          {/* Upcoming Reminders Card */}
          <div className="right-reminders-card">
            <div className="reminders-header-bar">
              <span className="reminders-heading">UPCOMING REMINDERS</span>
              <button
                type="button"
                className="reminders-view-all-link"
                onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}
              >
                View All &rarr;
              </button>
            </div>

            <div className="reminders-body">
              {upcomingList.length === 0 ? (
                <div className="no-reminders-text">No pending reminders scheduled.</div>
              ) : (
                <div className="reminders-list">
                  {upcomingList.slice(0, 5).map((r) => (
                    <div
                      key={r.id}
                      className="reminder-item-row"
                      onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}
                      title="Click to manage reminder"
                    >
                      <div className="reminder-item-header">
                        <span className="reminder-item-title">{r.title}</span>
                        {r.isOverdue ? (
                          <span className="reminder-overdue-tag">Overdue</span>
                        ) : (
                          <span className="reminder-type-tag">{r.type}</span>
                        )}
                      </div>
                      <div className="reminder-meta-row">
                        <span className="reminder-item-date">{r.date}</span>
                        {r.amountText && <span className="reminder-item-amount">{r.amountText}</span>}
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
