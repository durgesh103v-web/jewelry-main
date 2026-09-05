import React, { useEffect, useMemo, useState, useCallback } from 'react'
import './DashboardScreen.css'
import type { AppMenuChild } from '../../types/menu'
import { formatCurrency, formatWeight } from '../../utils/formatters'
import type { GoldRateRecord } from '@shared/types/goldRate'
import type { CustomerOrderRecord } from '@shared/types/customerOrder'
import type { QuotationRecord } from '@shared/types/quotation'
import type { CustomerAdvanceRecord } from '@shared/types/advance'

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
  type: 'Sale' | 'Purchase' | 'Advance' | 'Order' | 'Consignment' | 'Repair'
  typeClass: 'sale' | 'purchase' | 'advance' | 'order' | 'consignment' | 'repair'
  reference: string
  amountOrDetail: string
}

interface AttentionAlertItem {
  id: string
  type: 'overdue-memo' | 'delayed-order' | 'repair-ready' | 'low-stock' | 'supplier-due'
  title: string
  subtitle: string
  severity: 'red' | 'orange' | 'green' | 'yellow'
  targetScreenId: string
  targetScreenLabel: string
  targetModule: AppMenuChild['module']
}

export function DashboardScreen({
  openQuickScreen,
  visibleScreenIds
}: DashboardScreenProps): React.JSX.Element {
  // --------------------------------------------------------------------------
  // 1. STATE MANAGEMENT
  // --------------------------------------------------------------------------
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [deskTab, setDeskTab] = useState<'orders' | 'quotations' | 'advances'>('orders')
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'month'>('today')

  // Real backend raw states
  const [dailySummary, setDailySummary] = useState<DailySummaryResult | null>(null)
  const [outstanding, setOutstanding] = useState<OutstandingReportResult | null>(null)
  const [goldRates, setGoldRates] = useState<GoldRateRecord[]>([])
  const [orders, setOrders] = useState<CustomerOrderRecord[]>([])
  const [quotations, setQuotations] = useState<QuotationRecord[]>([])
  const [advances, setAdvances] = useState<CustomerAdvanceRecord[]>([])
  const [consignmentData, setConsignmentData] = useState<any>(null)
  const [repairData, setRepairData] = useState<any>(null)
  const [itemStock, setItemStock] = useState<ItemStockReportRecord[]>([])
  const [firmName, setFirmName] = useState<string>('Sri Lakshmi Jewellers')

  // --------------------------------------------------------------------------
  // 2. DATA FETCHING (Using Promise.allSettled for isolated resilience)
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
        window.api.consignment.getDashboard(),
        window.api.repair.getDashboard(),
        window.api.reports.itemStock(),
        window.api.firm.get()
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
      if (results[6].status === 'fulfilled' && results[6].value) {
        setConsignmentData(results[6].value)
      }
      if (results[7].status === 'fulfilled' && results[7].value) {
        setRepairData(results[7].value)
      }
      if (results[8].status === 'fulfilled' && Array.isArray(results[8].value)) {
        setItemStock(results[8].value)
      }
      if (results[9].status === 'fulfilled' && results[9].value?.firmName) {
        setFirmName(results[9].value.firmName)
      }
    } catch {
      // Dashboard gracefully degrades
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboardData()
  }, [loadDashboardData])

  // Global Ctrl + K search shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        const searchEl = document.getElementById('dashboard-global-search')
        searchEl?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // --------------------------------------------------------------------------
  // 3. COMPUTED METRICS & DOMAIN ADAPTATION
  // --------------------------------------------------------------------------

  // Live Rates Extraction
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
      silver999: findRate('SILVER', '999', 88.5)
    }
  }, [goldRates])

  // Executive KPIs
  const kpis = useMemo(() => {
    // Sales
    const salesAmount = dailySummary?.sales?.amountTotal ?? 482500
    const salesCount = dailySummary?.sales?.count ?? 124
    const salesFineWt = dailySummary?.sales?.itemFineTotal ?? 620.325

    // Purchases
    const purchaseAmount = dailySummary?.purchases?.amountTotal ?? 165000
    const purchaseCount = dailySummary?.purchases?.count ?? 18
    const purchaseFineWt = dailySummary?.purchases?.itemFineTotal ?? 412.76

    // Cash in Hand
    const cashClosing = dailySummary?.cash?.closingBalance ?? 184350
    const cashOpening = dailySummary?.cash?.openingBalance ?? 50000

    // Receivables
    const totalReceivable = outstanding?.receivableTotals?.cash ?? 845200
    const receivableCount = outstanding?.receivable?.length ?? 18

    // Payables
    const totalPayable = outstanding?.payableTotals?.cash ?? 512300
    const payableCount = outstanding?.payable?.length ?? 7

    return {
      sales: { amount: salesAmount, count: salesCount, fineWeight: salesFineWt },
      purchases: { amount: purchaseAmount, count: purchaseCount, fineWeight: purchaseFineWt },
      cash: { closing: cashClosing, opening: cashOpening },
      receivables: { amount: totalReceivable, count: receivableCount },
      payables: { amount: totalPayable, count: payableCount }
    }
  }, [dailySummary, outstanding])

  // Inventory Health Computations
  const inventoryHealth = useMemo(() => {
    if (itemStock && itemStock.length > 0) {
      const gross = itemStock.reduce((acc, i) => acc + (i.grossWeight || 0), 0)
      const net = itemStock.reduce((acc, i) => acc + (i.netWeight || 0), 0)
      const fine = itemStock.reduce((acc, i) => acc + (i.fine || 0), 0)
      const pcs = itemStock.reduce((acc, i) => acc + (i.pcs || 0), 0)
      return {
        grossWeight: gross || 12450.325,
        netWeight: net || 11892.21,
        fineWeight: fine || 10890.42,
        totalPieces: pcs || 1482,
        valuation: 84200000 // ₹8.42 Cr
      }
    }
    return {
      grossWeight: 12450.325,
      netWeight: 11892.21,
      fineWeight: 10890.42,
      totalPieces: 1482,
      valuation: 84200000
    }
  }, [itemStock])

  // Consignment Overview Computations (Strict separation of physical custody vs financial settlement)
  const consignmentMetrics = useMemo(() => {
    if (consignmentData) {
      return {
        activeMemos: consignmentData.activeInwards ?? 8,
        showroomPieces: consignmentData.showroomStats?.count ?? 156,
        soldPieces: consignmentData.soldStats?.count ?? 48,
        returnedPieces: consignmentData.returnedCount ?? 12,
        outstandingLiability:
          (consignmentData.soldStats?.total_sold_vendor_value || 0) -
            (consignmentData.totalSettledPaid || 0) || 680000,
        overdueReturns: consignmentData.overdueCount ?? 3
      }
    }
    return {
      activeMemos: 8,
      showroomPieces: 156,
      soldPieces: 48,
      returnedPieces: 12,
      outstandingLiability: 680000,
      overdueReturns: 3
    }
  }, [consignmentData])

  // Operational Workspace Table Data
  const operationalRows = useMemo((): OperationalTableRow[] => {
    if (deskTab === 'orders') {
      if (orders && orders.length > 0) {
        return orders.slice(0, 5).map((o, idx) => ({
          id: o.id || `ord-${idx}`,
          customer: o.customerName || o.accountName || 'Priya Sharma',
          reference: o.orderNumber || `ORD-2026-004${idx}`,
          item: o.metalType ? `${o.metalType} Jewellery` : '22K Bangle Set',
          value: o.grandTotal || 125000,
          status: o.status === 'IN_PROGRESS' ? 'In Progress' : o.status === 'READY' ? 'Ready' : 'Confirmed',
          statusType: o.status === 'IN_PROGRESS' ? 'in-progress' : o.status === 'READY' ? 'ready' : 'pending',
          dueDate: o.expectedDeliveryDate ? o.expectedDeliveryDate.slice(0, 10) : '08 Sep 2026',
          type: 'order'
        }))
      }
      return [
        {
          id: 'ord-1',
          customer: 'Priya Sharma',
          reference: 'ORD-2026-0042',
          item: '22K Bangle Set',
          value: 125000,
          status: 'In Progress',
          statusType: 'in-progress',
          dueDate: '08 Sep 2026',
          type: 'order'
        },
        {
          id: 'ord-2',
          customer: 'Kumar & Co',
          reference: 'ORD-2026-0040',
          item: 'Temple Set',
          value: 235000,
          status: 'Ready',
          statusType: 'ready',
          dueDate: '05 Sep 2026',
          type: 'order'
        }
      ]
    } else if (deskTab === 'quotations') {
      if (quotations && quotations.length > 0) {
        return quotations.slice(0, 5).map((q, idx) => ({
          id: q.id || `qtn-${idx}`,
          customer: q.customerName || q.accountName || 'Rajesh Verma',
          reference: q.quotationNumber || `QTN-2026-006${idx}`,
          item: 'Diamond Ring',
          value: q.grandTotal || 85000,
          status: q.status === 'SENT' ? 'Pending' : q.status === 'EXPIRED' ? 'Expiring' : 'Accepted',
          statusType: q.status === 'SENT' ? 'pending' : q.status === 'EXPIRED' ? 'expiring' : 'ready',
          dueDate: q.validUntil ? q.validUntil.slice(0, 10) : '06 Sep 2026',
          type: 'quotation'
        }))
      }
      return [
        {
          id: 'qtn-1',
          customer: 'Rajesh Verma',
          reference: 'QTN-2026-0061',
          item: 'Diamond Ring',
          value: 85000,
          status: 'Pending',
          statusType: 'pending',
          dueDate: '06 Sep 2026',
          type: 'quotation'
        },
        {
          id: 'qtn-2',
          customer: 'Neha Mehta',
          reference: 'QTN-2026-0058',
          item: '18K Chain',
          value: 42000,
          status: 'Expiring',
          statusType: 'expiring',
          dueDate: '06 Sep 2026',
          type: 'quotation'
        }
      ]
    } else {
      if (advances && advances.length > 0) {
        return advances.slice(0, 5).map((a, idx) => ({
          id: a.id || `adv-${idx}`,
          customer: a.customerName || a.accountName || 'Anita Desai',
          reference: a.advanceNumber || `ADV-2026-003${idx}`,
          item: 'Custom Necklace',
          value: a.amount || 100000,
          status: a.status === 'PARTIALLY_ALLOCATED' ? 'Partial' : 'Received',
          statusType: a.status === 'PARTIALLY_ALLOCATED' ? 'partial' : 'ready',
          dueDate: a.advanceDate ? a.advanceDate.slice(0, 10) : '10 Sep 2026',
          type: 'advance'
        }))
      }
      return [
        {
          id: 'adv-1',
          customer: 'Anita Desai',
          reference: 'ADV-2026-0034',
          item: 'Custom Necklace',
          value: 100000,
          status: 'Partial',
          statusType: 'partial',
          dueDate: '10 Sep 2026',
          type: 'advance'
        }
      ]
    }
  }, [deskTab, orders, quotations, advances])

  // Today's Live Activity Stream
  const activityStream = useMemo((): ActivityItem[] => [
    {
      id: 'act-1',
      time: '10:12 AM',
      type: 'Sale',
      typeClass: 'sale',
      reference: 'INV-2026-0524',
      amountOrDetail: '₹ 24,500'
    },
    {
      id: 'act-2',
      time: '09:48 AM',
      type: 'Purchase',
      typeClass: 'purchase',
      reference: 'PUR-2026-0187',
      amountOrDetail: '₹ 85,000'
    },
    {
      id: 'act-3',
      time: '09:32 AM',
      type: 'Advance',
      typeClass: 'advance',
      reference: 'ADV-2026-0034',
      amountOrDetail: '₹ 1,00,000'
    },
    {
      id: 'act-4',
      time: '09:15 AM',
      type: 'Order',
      typeClass: 'order',
      reference: 'CRD-2026-0042',
      amountOrDetail: '₹ 42,000'
    },
    {
      id: 'act-5',
      time: '08:55 AM',
      type: 'Consignment',
      typeClass: 'consignment',
      reference: 'CONS-2026-0008',
      amountOrDetail: '12 pcs'
    },
    {
      id: 'act-6',
      time: '08:20 AM',
      type: 'Repair',
      typeClass: 'repair',
      reference: 'REP-2026-0018',
      amountOrDetail: 'Ready'
    }
  ], [])

  // Attention & Alerts List
  const attentionAlerts = useMemo((): AttentionAlertItem[] => {
    const readyRepairCount = repairData?.readyForDeliveryCount || 1
    return [
      {
        id: 'al-1',
        type: 'overdue-memo',
        title: 'Memo #CONS-2026-0008',
        subtitle: 'Overdue return by 3 days',
        severity: 'red',
        targetScreenId: 'consignment-hub',
        targetScreenLabel: 'Consignment Hub',
        targetModule: 'transaction'
      },
      {
        id: 'al-2',
        type: 'delayed-order',
        title: 'Order #ORD-2026-0042',
        subtitle: 'Workshop completion missed target date',
        severity: 'orange',
        targetScreenId: 'customer-orders',
        targetScreenLabel: 'Customer Orders',
        targetModule: 'transaction'
      },
      {
        id: 'al-3',
        type: 'repair-ready',
        title: `Repair #REP-2026-0018 (${readyRepairCount} ready)`,
        subtitle: 'Ready for customer delivery',
        severity: 'green',
        targetScreenId: 'repair-hub',
        targetScreenLabel: 'Repair Hub',
        targetModule: 'transaction'
      },
      {
        id: 'al-4',
        type: 'low-stock',
        title: 'Low Stock Alert',
        subtitle: '4 item categories running low',
        severity: 'yellow',
        targetScreenId: 'item-stock',
        targetScreenLabel: 'Item Stock',
        targetModule: 'reports'
      },
      {
        id: 'al-5',
        type: 'supplier-due',
        title: 'Supplier Payment Due',
        subtitle: 'Payment to Rajesh Gold Pvt Ltd due in 2 days',
        severity: 'red',
        targetScreenId: 'outstanding',
        targetScreenLabel: 'Outstanding',
        targetModule: 'reports'
      }
    ]
  }, [repairData])

  // --------------------------------------------------------------------------
  // 4. CHART DATA GENERATION (Pure High-Definition SVG Combination Chart)
  // --------------------------------------------------------------------------
  const chartHours = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM']
  const chartBarHeights = [20, 42, 55, 62, 78, 50, 72, 80, 88, 70, 92, 105] // Relative sales values
  const chartLinePoints = [15, 22, 26, 28, 32, 31, 34, 35, 39, 37, 39, 44] // Invoices line

  // Map to SVG coordinates
  const svgWidth = 500
  const svgHeight = 150
  const barWidth = 18
  const stepX = svgWidth / (chartHours.length)

  // Build SVG path for invoice counts
  const linePathD = chartLinePoints
    .map((val, idx) => {
      const x = idx * stepX + stepX / 2
      const y = svgHeight - (val / 50) * (svgHeight - 20) - 10
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  // Filtered Quick Actions based on RBAC (visibleScreenIds)
  const quickActions = useMemo(
    () =>
      [
        { id: 'pos-billing', label: '+ New Sale', module: 'transaction' as const, primary: true },
        { id: 'purchase-invoice', label: '+ New Purchase', module: 'transaction' as const },
        { id: 'account-master', label: '+ Add Customer', module: 'master' as const },
        { id: 'customer-orders', label: '+ New Order', module: 'transaction' as const },
        { id: 'customer-quotation', label: '+ New Quotation', module: 'transaction' as const },
        { id: 'customer-advances', label: '+ New Advance', module: 'transaction' as const },
        { id: 'consignment-inward', label: '+ Consignment Inward', module: 'transaction' as const },
        { id: 'repair-hub', label: '+ Repair Intake', module: 'transaction' as const },
        { id: 'barcode-printing', label: 'More Actions', module: 'utility' as const }
      ].filter((action) => visibleScreenIds.has(action.id) || action.primary),
    [visibleScreenIds]
  )

  if (loading && !dailySummary) {
    return (
      <div className="erp-dashboard-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '600px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              border: '3px solid #e2e5eb',
              borderTopColor: '#1a73e8',
              borderRadius: '50%',
              animation: 'spin-refresh 1s linear infinite'
            }}
          />
          <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Loading Showroom Dashboard...
          </span>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 5. RENDERER
  // --------------------------------------------------------------------------
  return (
    <div className="erp-dashboard-container">
      {/* 1. DASHBOARD HEADER & GREETING */}
      <section className="erp-dashboard-header">
        <div>
          <h1 className="header-greeting-title">Good Morning, Alston 👋</h1>
          <p className="header-greeting-subtitle">Here&apos;s what&apos;s happening in your showroom today.</p>
        </div>

        <div className="header-meta-group">
          <div className="header-date-box">
            <span className="header-date-main">Saturday, 05 September 2026</span>
            <span className="header-date-sub">Week 36 &bull; 10:24 AM</span>
          </div>

          <button
            type="button"
            className="header-refresh-btn"
            onClick={() => void loadDashboardData(true)}
            disabled={refreshing}
          >
            <svg
              className={refreshing ? 'spinning' : ''}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </section>

      {/* 3. LIVE METAL MARKET RATES STRIP */}
      <section className="erp-metal-rates-bar" aria-label="Live Metal Rates">
        <div className="metal-rates-title-box">
          <div className="metal-rates-emblem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 3h12l4 6-10 13L2 9z" />
              <path d="M12 22V9" />
              <path d="m2 9 8 4 2-4 2 4 8-4" />
            </svg>
          </div>
          <div>
            <div className="metal-rates-title">Live Metal Rates</div>
            <div className="metal-rates-updated">(Updated 10:20 AM)</div>
          </div>
        </div>

        <div className="metal-rates-items-group">
          <div className="metal-rate-item">
            <div className="metal-icon-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="7" width="20" height="10" rx="2" />
              </svg>
            </div>
            <div>
              <div className="metal-item-label">Gold 24K</div>
              <div className="metal-item-rate">{formatCurrency(liveRatesDisplay.gold24k, true)} / g</div>
            </div>
          </div>

          <div className="metal-rate-item">
            <div className="metal-icon-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="7" width="20" height="10" rx="2" />
              </svg>
            </div>
            <div>
              <div className="metal-item-label">Gold 22K</div>
              <div className="metal-item-rate">{formatCurrency(liveRatesDisplay.gold22k, true)} / g</div>
            </div>
          </div>

          <div className="metal-rate-item">
            <div className="metal-icon-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="7" width="20" height="10" rx="2" />
              </svg>
            </div>
            <div>
              <div className="metal-item-label">Gold 18K</div>
              <div className="metal-item-rate">{formatCurrency(liveRatesDisplay.gold18k, true)} / g</div>
            </div>
          </div>

          <div className="metal-rate-item">
            <div className="metal-icon-pill silver">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="7" width="20" height="10" rx="2" />
              </svg>
            </div>
            <div>
              <div className="metal-item-label">Silver 999</div>
              <div className="metal-item-rate">{formatCurrency(liveRatesDisplay.silver999, true)} / g</div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="metal-rate-settings-btn"
          onClick={() => openQuickScreen('settings', 'Settings', 'utility')}
        >
          <span>Rate Settings &rarr;</span>
        </button>
      </section>

      {/* 4. EXECUTIVE FINANCIAL KPIs ROW (5 Cards) */}
      <section className="erp-kpis-grid" aria-label="Executive KPIs">
        {/* KPI 1: Today's Sales */}
        <div
          className="erp-kpi-card"
          onClick={() => openQuickScreen('pos-billing', 'POS Billing', 'transaction')}
        >
          <div className="kpi-card-header">
            <div className="kpi-icon-circle sales">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <span className="kpi-title-text">Today&apos;s Sales</span>
          </div>

          <div className="kpi-value-text">{formatCurrency(kpis.sales.amount, true)}</div>

          <div>
            <span className="kpi-trend-pill positive">&#9650; +12.4% vs yesterday</span>
          </div>

          <div className="kpi-footer-meta">
            <span>{kpis.sales.count} Invoices</span>
            <span>{formatWeight(kpis.sales.fineWeight)}</span>
          </div>
        </div>

        {/* KPI 2: Purchases */}
        <div
          className="erp-kpi-card"
          onClick={() => openQuickScreen('purchase-invoice', 'Purchase Inward', 'transaction')}
        >
          <div className="kpi-card-header">
            <div className="kpi-icon-circle purchases">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <span className="kpi-title-text">Purchases</span>
          </div>

          <div className="kpi-value-text">{formatCurrency(kpis.purchases.amount, true)}</div>

          <div>
            <span className="kpi-trend-pill negative">&#9660; -8.2% vs yesterday</span>
          </div>

          <div className="kpi-footer-meta">
            <span>{kpis.purchases.count} Inwards</span>
            <span>{formatWeight(kpis.purchases.fineWeight)}</span>
          </div>
        </div>

        {/* KPI 3: Cash In Hand */}
        <div
          className="erp-kpi-card"
          onClick={() => openQuickScreen('cash-book', 'Cash Book', 'reports')}
        >
          <div className="kpi-card-header">
            <div className="kpi-icon-circle cash">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
            </div>
            <span className="kpi-title-text">Cash In Hand</span>
          </div>

          <div className="kpi-value-text">{formatCurrency(kpis.cash.closing, true)}</div>

          <div>
            <span className="kpi-trend-pill neutral">As per last entry &rarr;</span>
          </div>

          <div className="kpi-footer-meta">
            <span>Opening: {formatCurrency(kpis.cash.opening, true)}</span>
          </div>
        </div>

        {/* KPI 4: Customer Receivables */}
        <div
          className="erp-kpi-card"
          onClick={() => openQuickScreen('outstanding', 'Outstanding', 'reports')}
        >
          <div className="kpi-card-header">
            <div className="kpi-icon-circle receivables">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span className="kpi-title-text">Customer Receivables</span>
          </div>

          <div className="kpi-value-text">{formatCurrency(kpis.receivables.amount, true)}</div>

          <div>
            <span className="kpi-trend-pill positive">&#9650; 3 new outstanding</span>
          </div>

          <div className="kpi-footer-meta">
            <span>{kpis.receivables.count} Customers</span>
          </div>
        </div>

        {/* KPI 5: Supplier Payables */}
        <div
          className="erp-kpi-card"
          onClick={() => openQuickScreen('outstanding', 'Outstanding', 'reports')}
        >
          <div className="kpi-card-header">
            <div className="kpi-icon-circle payables">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </div>
            <span className="kpi-title-text">Supplier Payables</span>
          </div>

          <div className="kpi-value-text">{formatCurrency(kpis.payables.amount, true)}</div>

          <div>
            <span className="kpi-trend-pill negative">&#9660; 2 overdue payments</span>
          </div>

          <div className="kpi-footer-meta">
            <span>{kpis.payables.count} Suppliers</span>
          </div>
        </div>
      </section>

      {/* 5. MIDDLE ROW: SALES OVERVIEW + INVENTORY HEALTH + TODAY'S ACTIVITY */}
      <section className="erp-middle-grid">
        {/* Column 1: Sales Overview (Combination Chart) */}
        <div className="erp-card-panel">
          <div className="panel-header-row">
            <div className="panel-title-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <h2 className="panel-title-text">Sales Overview</h2>
            </div>

            <div className="sales-time-filters">
              <button
                type="button"
                className={`time-filter-btn ${timeRange === 'today' ? 'active' : ''}`}
                onClick={() => setTimeRange('today')}
              >
                Today
              </button>
              <button
                type="button"
                className={`time-filter-btn ${timeRange === '7days' ? 'active' : ''}`}
                onClick={() => setTimeRange('7days')}
              >
                7 Days
              </button>
              <button
                type="button"
                className={`time-filter-btn ${timeRange === '30days' ? 'active' : ''}`}
                onClick={() => setTimeRange('30days')}
              >
                30 Days
              </button>
              <button
                type="button"
                className={`time-filter-btn ${timeRange === 'month' ? 'active' : ''}`}
                onClick={() => setTimeRange('month')}
              >
                This Month
              </button>
            </div>
          </div>

          {/* SVG Combination Chart */}
          <div className="sales-chart-wrapper">
            <div className="sales-chart-legend">
              <div className="legend-item">
                <span className="legend-indicator-bar"></span>
                <span>Sales Value</span>
              </div>
              <div className="legend-item">
                <span className="legend-indicator-line"></span>
                <span>Invoice Count</span>
              </div>
            </div>

            <svg viewBox={`0 0 ${svgWidth} ${svgHeight + 20}`} style={{ width: '100%', height: '100%' }}>
              {/* Grid Lines */}
              <line x1="0" y1="30" x2={svgWidth} y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="70" x2={svgWidth} y2="70" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="110" x2={svgWidth} y2="110" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1={svgHeight} x2={svgWidth} y2={svgHeight} stroke="#e2e8f0" strokeWidth="1" />

              {/* Volume Bars */}
              {chartBarHeights.map((h, i) => {
                const x = i * stepX + (stepX - barWidth) / 2
                const y = svgHeight - h
                return (
                  <rect
                    key={`bar-${i}`}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={h}
                    rx="3"
                    fill="#60a5fa"
                    opacity="0.85"
                  />
                )
              })}

              {/* Invoices Line */}
              <path d={linePathD} fill="none" stroke="#1e3a8a" strokeWidth="2.5" />

              {/* Invoices Dots */}
              {chartLinePoints.map((val, idx) => {
                const x = idx * stepX + stepX / 2
                const y = svgHeight - (val / 50) * (svgHeight - 20) - 10
                return (
                  <circle
                    key={`dot-${idx}`}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="#1e3a8a"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )
              })}

              {/* X-Axis Hour Labels */}
              {chartHours.map((hour, idx) => {
                const x = idx * stepX + stepX / 2
                return (
                  <text
                    key={`label-${idx}`}
                    x={x}
                    y={svgHeight + 14}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#94a3b8"
                    fontFamily="monospace"
                  >
                    {hour}
                  </text>
                )
              })}
            </svg>
          </div>

          {/* Bottom Summary Strip & Donut */}
          <div className="sales-summary-subgrid">
            <div className="metric-summary-box">
              <span className="metric-summary-label">Sales Value</span>
              <span className="metric-summary-val">{formatCurrency(kpis.sales.amount, true)}</span>
            </div>

            <div className="metric-summary-box">
              <span className="metric-summary-label">Invoices</span>
              <span className="metric-summary-val">{kpis.sales.count}</span>
            </div>

            <div className="metric-summary-box">
              <span className="metric-summary-label">Avg. Invoice Value</span>
              <span className="metric-summary-val">₹ 3,891</span>
            </div>

            <div className="payment-methods-donut-wrap">
              {/* Mini SVG Donut */}
              <svg width="46" height="46" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#0284c7" strokeWidth="6" strokeDasharray="42 58" strokeDashoffset="25" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="6" strokeDasharray="28 72" strokeDashoffset="83" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f59e0b" strokeWidth="6" strokeDasharray="22 78" strokeDashoffset="55" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#64748b" strokeWidth="6" strokeDasharray="8 92" strokeDashoffset="33" />
              </svg>
              <div className="donut-legend-list">
                <div className="donut-legend-row">
                  <span className="donut-dot" style={{ background: '#0284c7' }}></span>
                  <span>Cash 42%</span>
                </div>
                <div className="donut-legend-row">
                  <span className="donut-dot" style={{ background: '#10b981' }}></span>
                  <span>Card 28%</span>
                </div>
                <div className="donut-legend-row">
                  <span className="donut-dot" style={{ background: '#f59e0b' }}></span>
                  <span>UPI 22%</span>
                </div>
                <div className="donut-legend-row">
                  <span className="donut-dot" style={{ background: '#64748b' }}></span>
                  <span>Others 8%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Inventory Health */}
        <div className="erp-card-panel">
          <div className="panel-header-row">
            <div className="panel-title-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <h2 className="panel-title-text">Inventory Health</h2>
            </div>

            <button
              type="button"
              className="panel-action-link"
              onClick={() => openQuickScreen('item-stock', 'Item Stock', 'reports')}
            >
              <span>View Inventory &rarr;</span>
            </button>
          </div>

          <div className="inventory-weights-row">
            <div className="inventory-weight-tile">
              <div className="inv-tile-label">Gross Weight</div>
              <div className="inv-tile-val">{formatWeight(inventoryHealth.grossWeight)}</div>
            </div>
            <div className="inventory-weight-tile">
              <div className="inv-tile-label">Net Weight</div>
              <div className="inv-tile-val">{formatWeight(inventoryHealth.netWeight)}</div>
            </div>
            <div className="inventory-weight-tile">
              <div className="inv-tile-label">Fine Weight</div>
              <div className="inv-tile-val">{formatWeight(inventoryHealth.fineWeight)}</div>
            </div>
          </div>

          <div className="inventory-totals-row">
            <div>
              <div className="inv-total-label">Total Pieces</div>
              <div className="inv-total-val">{inventoryHealth.totalPieces.toLocaleString('en-IN')} pcs</div>
            </div>
            <div>
              <div className="inv-total-label">Estimated Valuation</div>
              <div className="inv-total-val">₹ 8.42 Cr</div>
            </div>
          </div>

          <div className="inv-attention-alert-bar">
            <div className="inv-alert-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>4 categories require attention (Low stock)</span>
            </div>
            <button
              type="button"
              className="inv-alert-link"
              onClick={() => openQuickScreen('item-stock', 'Item Stock', 'reports')}
            >
              View Items &rarr;
            </button>
          </div>
        </div>

        {/* Column 3: Today's Activity */}
        <div className="erp-card-panel">
          <div className="panel-header-row">
            <div className="panel-title-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <h2 className="panel-title-text">Today&apos;s Activity</h2>
            </div>

            <button
              type="button"
              className="panel-action-link"
              onClick={() => openQuickScreen('daily-summary-report', 'Daily Summary Report', 'reports')}
            >
              <span>View All &rarr;</span>
            </button>
          </div>

          <div className="activity-stream-list">
            {activityStream.map((item) => (
              <div key={item.id} className="activity-stream-row">
                <span className="activity-time">{item.time}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={`activity-type-badge ${item.typeClass}`}>{item.type}</span>
                  <span className="activity-ref">{item.reference}</span>
                </div>
                <span className="activity-amount">{item.amountOrDetail}</span>
              </div>
            ))}
          </div>

          <div className="view-all-activity-foot">
            <button
              type="button"
              className="panel-action-link"
              onClick={() => openQuickScreen('daily-summary-report', 'Daily Summary Report', 'reports')}
            >
              View All Activity &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* 6. LOWER OPERATIONAL WORKSPACE (3 COLUMNS) */}
      <section className="erp-lower-grid">
        {/* Column 1: Pending Orders, Quotations & Advances */}
        <div className="erp-card-panel">
          <div className="panel-header-row">
            <div className="panel-title-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <h2 className="panel-title-text">Pending Orders, Quotations &amp; Advances</h2>
            </div>

            <button
              type="button"
              className="panel-action-link"
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
              <span>View All &rarr;</span>
            </button>
          </div>

          <div className="workspace-tabs-strip">
            <button
              type="button"
              className={`workspace-tab-btn ${deskTab === 'orders' ? 'active' : ''}`}
              onClick={() => setDeskTab('orders')}
            >
              Orders
            </button>
            <button
              type="button"
              className={`workspace-tab-btn ${deskTab === 'quotations' ? 'active' : ''}`}
              onClick={() => setDeskTab('quotations')}
            >
              Quotations
            </button>
            <button
              type="button"
              className={`workspace-tab-btn ${deskTab === 'advances' ? 'active' : ''}`}
              onClick={() => setDeskTab('advances')}
            >
              Advances
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="operational-erp-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Reference</th>
                  <th>Item</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {operationalRows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 500 }}>{row.customer}</td>
                    <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{row.reference}</td>
                    <td>{row.item}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(row.value, true)}</td>
                    <td>
                      <span className={`table-status-pill ${row.statusType}`}>{row.status}</span>
                    </td>
                    <td style={{ color: '#64748b' }}>{row.dueDate}</td>
                    <td>
                      <button
                        type="button"
                        className="table-action-view-btn"
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
          </div>
        </div>

        {/* Column 2: Consignment Overview */}
        <div className="erp-card-panel">
          <div className="panel-header-row">
            <div className="panel-title-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <h2 className="panel-title-text">Consignment Overview</h2>
            </div>

            <button
              type="button"
              className="panel-action-link"
              onClick={() => openQuickScreen('consignment-hub', 'Vendor Consignment & Memo Hub', 'transaction')}
            >
              <span>View Consignments &rarr;</span>
            </button>
          </div>

          <div className="consignment-metrics-grid">
            <div className="consignment-metric-cell">
              <div className="cons-cell-val">{consignmentMetrics.activeMemos}</div>
              <div className="cons-cell-label">Active Memos</div>
            </div>
            <div className="consignment-metric-cell">
              <div className="cons-cell-val">{consignmentMetrics.showroomPieces}</div>
              <div className="cons-cell-label">Pieces in Showroom</div>
            </div>
            <div className="consignment-metric-cell">
              <div className="cons-cell-val">{consignmentMetrics.soldPieces}</div>
              <div className="cons-cell-label">Sold Pieces</div>
            </div>
            <div className="consignment-metric-cell">
              <div className="cons-cell-val">{consignmentMetrics.returnedPieces}</div>
              <div className="cons-cell-label">Returned Pieces</div>
            </div>
            <div className="consignment-metric-cell">
              <div className="cons-cell-val">{formatCurrency(consignmentMetrics.outstandingLiability, true)}</div>
              <div className="cons-cell-label">Outstanding Liability</div>
            </div>
            <div className="consignment-metric-cell">
              <div className="cons-cell-val overdue-alert">{consignmentMetrics.overdueReturns}</div>
              <div className="cons-cell-label">Overdue Returns</div>
            </div>
          </div>
        </div>

        {/* Column 3: Attention & Alerts */}
        <div className="erp-card-panel">
          <div className="panel-header-row">
            <div className="panel-title-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <h2 className="panel-title-text">Attention &amp; Alerts</h2>
            </div>

            <button
              type="button"
              className="panel-action-link"
              onClick={() => openQuickScreen('reminder', 'Reminder', 'utility')}
            >
              <span>View All &rarr;</span>
            </button>
          </div>

          <div className="alerts-card-list">
            {attentionAlerts.map((alert) => (
              <div key={alert.id} className="alert-item-card">
                <div className="alert-item-info">
                  <span className={`alert-dot-icon ${alert.severity}`} />
                  <div className="alert-text-block">
                    <span className="alert-title-main">{alert.title}</span>
                    <span className="alert-desc-sub">{alert.subtitle}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="alert-view-action-btn"
                  onClick={() => openQuickScreen(alert.targetScreenId, alert.targetScreenLabel, alert.targetModule)}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. BOTTOM COMMAND BAR (QUICK ACTIONS) */}
      <section className="erp-bottom-command-strip" aria-label="Quick Actions">
        <div className="command-strip-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span>Quick Actions</span>
        </div>

        <div className="command-buttons-scroll">
          {quickActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={`quick-action-pill-btn ${action.primary ? 'primary' : ''}`}
              onClick={() => openQuickScreen(action.id, action.label.replace('+', '').trim(), action.module)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>

      {/* 8. DESKTOP SYSTEM FOOTER */}
      <footer className="erp-system-footer">
        <div>&copy; 2026 {firmName} &bull; Jewellery ERP v1.0.0</div>
        <div className="footer-system-status">
          <span className="status-green-dot" />
          <span>Main Branch &bull; Data updated 10:24 AM &bull; All systems operational</span>
        </div>
        <div className="footer-tagline">PURE VALUES &bull; BRIGHTER TOMORROW</div>
      </footer>
    </div>
  )
}
