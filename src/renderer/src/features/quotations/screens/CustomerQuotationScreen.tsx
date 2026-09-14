import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import type { QuotationRecord, QuotationStatus } from '../types'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { CreateQuotationScreen } from './CreateQuotationScreen'
import { QuotationDetailModal } from '../components/QuotationDetailModal'
import { QuotationPrintView } from '../components/QuotationPrintView'
import { MetalRatesStrip } from '../../../components/ui'

export interface CustomerQuotationScreenProps {
  onClose?: () => void
  onNavigate?: (
    id: string,
    label: string,
    module: 'home' | 'master' | 'transaction' | 'reports' | 'gst' | 'utility'
  ) => void
}

type TabFilter = 'ALL' | QuotationStatus
type ViewMode = 'list' | 'create'

const STATUS_BADGE_MAP: Record<QuotationStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
  SENT: { label: 'Sent', className: 'bg-blue-50 text-blue-800 border-blue-200' },
  ACCEPTED: { label: 'Accepted', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  CONVERTED: { label: 'Converted', className: 'bg-purple-50 text-purple-800 border-purple-200 font-semibold' },
  EXPIRED: { label: 'Expired', className: 'bg-rose-50 text-rose-800 border-rose-200' },
  REJECTED: { label: 'Rejected', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  CANCELLED: { label: 'Cancelled', className: 'bg-slate-100 text-slate-500 border-slate-200' }
}

export const CustomerQuotationScreen: React.FC<CustomerQuotationScreenProps> = ({
  onClose,
  onNavigate
}) => {
  // Navigation / View State ('list' = Quotation Register, 'create' = Full Page Create Desk)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Quotations List State
  const [quotations, setQuotations] = useState<QuotationRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Filters State
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Modal Views State
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null)
  const [printQuotation, setPrintQuotation] = useState<QuotationRecord | null>(null)

  // Load Quotations from Backend
  const loadQuotations = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const filter: any = {}
      if (activeTab !== 'ALL') {
        filter.status = activeTab
      }
      if (searchQuery.trim()) {
        filter.search = searchQuery.trim()
      }
      if (startDate) {
        filter.startDate = startDate
      }
      if (endDate) {
        filter.endDate = endDate
      }

      const list = await window.api.quotations.list(filter)
      setQuotations(list || [])
    } catch (err) {
      console.error('Failed to load customer quotations:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, searchQuery, startDate, endDate])

  useEffect(() => {
    void loadQuotations()
  }, [loadQuotations])

  // Computed Metrics
  const metrics = useMemo(() => {
    const total = quotations.length
    let active = 0
    let converted = 0
    let totalValue = 0

    quotations.forEach((q) => {
      if (q.status === 'DRAFT' || q.status === 'SENT' || q.status === 'ACCEPTED') {
        active++
      }
      if (q.status === 'CONVERTED') {
        converted++
      }
      totalValue += q.grandTotal || 0
    })

    const winRate = total > 0 ? Math.round((converted / total) * 100) : 0

    return { total, active, converted, totalValue, winRate }
  }, [quotations])

  // Tab counts for quick status visibility
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: quotations.length }
    quotations.forEach((q) => {
      counts[q.status] = (counts[q.status] || 0) + 1
    })
    return counts
  }, [quotations])

  // Quick Date Range Presets
  const setPreset = (preset: 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_FY') => {
    const today = dayjs()
    if (preset === 'TODAY') {
      const d = today.format('YYYY-MM-DD')
      setStartDate(d)
      setEndDate(d)
    } else if (preset === 'YESTERDAY') {
      const d = today.subtract(1, 'day').format('YYYY-MM-DD')
      setStartDate(d)
      setEndDate(d)
    } else if (preset === 'THIS_WEEK') {
      setStartDate(today.startOf('week').format('YYYY-MM-DD'))
      setEndDate(today.endOf('week').format('YYYY-MM-DD'))
    } else if (preset === 'THIS_MONTH') {
      setStartDate(today.startOf('month').format('YYYY-MM-DD'))
      setEndDate(today.endOf('month').format('YYYY-MM-DD'))
    } else if (preset === 'THIS_FY') {
      const currentYear = today.month() >= 3 ? today.year() : today.year() - 1
      setStartDate(`${currentYear}-04-01`)
      setEndDate(`${currentYear + 1}-03-31`)
    }
  }

  // Quick Convert to Order
  const handleQuickConvert = async (q: QuotationRecord) => {
    const confirmConvert = window.confirm(
      `Convert Quotation #${q.quotationNumber} (${q.customerName || q.accountName}) to a confirmed Customer Order?`
    )
    if (!confirmConvert) return

    try {
      const order = await window.api.quotations.convertToOrder(q.id)
      setToastMessage(`✓ Quotation #${q.quotationNumber} successfully converted to Order #${order.orderNumber}!`)
      await loadQuotations()
    } catch (err) {
      console.error('Failed to convert quotation:', err)
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Export to CSV
  const handleExportCsv = () => {
    if (!quotations.length) return
    const headers = [
      'Quotation #',
      'Date',
      'Customer Name',
      'Customer Code',
      'Valid Until',
      'Metal Type',
      'Items (Pcs)',
      'Gross Weight (g)',
      'Net Weight (g)',
      'Estimated Total (INR)',
      'Status',
      'Converted Order #'
    ]

    const rows = quotations.map((q) => [
      q.quotationNumber,
      q.quotationDate,
      `"${(q.customerName || q.accountName || 'Counter Customer').replace(/"/g, '""')}"`,
      q.customerCode || '',
      q.validUntil || '',
      q.metalType || 'Gold',
      q.totalPcs || 1,
      Number(q.totalGrossWeight || 0).toFixed(3),
      Number(q.totalNetWeight || 0).toFixed(3),
      Number(q.roundedTotal || q.grandTotal || 0).toFixed(2),
      q.status,
      q.convertedOrderId || ''
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `quotations-register-${dayjs().format('YYYY-MM-DD')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Quick WhatsApp Share summary
  const handleShareWhatsApp = (q: QuotationRecord) => {
    const amount = formatCurrency(q.roundedTotal || q.grandTotal)
    const validStr = q.validUntil ? formatDate(q.validUntil) : '7 Days'
    const text = `*Estimate / Quotation #${q.quotationNumber}*\nCustomer: ${q.customerName || 'Customer'}\nItems: ${q.totalPcs} pcs | Gross Wt: ${formatWeight(q.totalGrossWeight)}\nEstimated Total: ${amount}\nValid Until: ${validStr}\nThank you!`

    navigator.clipboard?.writeText(text)
    setToastMessage(`✓ Estimate summary for #${q.quotationNumber} copied to clipboard!`)
  }

  // Render Full Page Create Quotation Desk
  if (viewMode === 'create') {
    return (
      <CreateQuotationScreen
        onBack={() => setViewMode('list')}
        onSuccess={(newQuote) => {
          setToastMessage(`✓ Quotation #${newQuote.quotationNumber} created and saved successfully!`)
          setViewMode('list')
          void loadQuotations()
          setSelectedQuotationId(newQuote.id)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-800 select-none font-sans overflow-hidden">
      {/* ── TOP HEADER BAR ── */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 shadow-2xs">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-slate-900 tracking-tight">
                Customer Quotation / Estimate Desk
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                ESTIMATES
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Live pricing estimates, customer quotation tracking, and direct conversion to confirmed orders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadQuotations()}
            disabled={isLoading}
            className="h-8 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            title="Reload Quotations"
          >
            <svg className={`w-3.5 h-3.5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reload</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('create')}
            className="h-8 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            style={{ color: '#ffffff' }}
          >
            <span className="text-sm font-bold leading-none">+</span>
            <span className="!text-white font-bold" style={{ color: '#ffffff' }}>New Quotation / Estimate</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold ml-1"
              title="Close Tab"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* ── WORKSPACE CONTENT ── */}
      <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        {/* Toast / Notification Banner */}
        {toastMessage && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs shrink-0">
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-emerald-700 hover:bg-emerald-100 px-2 py-0.5 rounded font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs shrink-0">
            <span>⚠️ {error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-700 hover:bg-rose-100 px-2 py-0.5 rounded font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Live Showroom Metal Rates Reference */}
        <MetalRatesStrip />

        {/* Executive 5-Column KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 shrink-0">
          {/* 1. Total Quotations */}
          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Quotations
              </span>
              <span className="text-[10px] text-slate-400 font-medium">All time</span>
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
              {metrics.total}
            </div>
          </div>

          {/* 2. Active Estimates */}
          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Active Estimates
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                In Pipeline
              </span>
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
              {metrics.active}
            </div>
          </div>

          {/* 3. Converted to Orders */}
          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Converted
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                Orders Made
              </span>
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
              {metrics.converted}
            </div>
          </div>

          {/* 4. Conversion Win Rate */}
          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Win Rate
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Conversion
              </span>
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
              {metrics.winRate}%
            </div>
          </div>

          {/* 5. Total Estimated Value */}
          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Pipeline Value
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Total
              </span>
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalValue)}
            </div>
          </div>
        </div>

        {/* ── STATUS TABS ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs shrink-0">
          {(
            [
              'ALL',
              'DRAFT',
              'SENT',
              'ACCEPTED',
              'CONVERTED',
              'EXPIRED',
              'REJECTED',
              'CANCELLED'
            ] as TabFilter[]
          ).map((tab) => {
            const count = tabCounts[tab] || 0
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-500 !text-white font-bold shadow-2xs border border-amber-600'
                    : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{tab === 'ALL' ? 'All Quotations' : STATUS_BADGE_MAP[tab]?.label || tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                    isActive ? 'bg-white/20 text-white font-bold' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── SEARCH & FILTER TOOLBAR ── */}
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            {(['TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_FY'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setPreset(preset)}
                className="px-2.5 py-1 rounded text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
              >
                {preset === 'TODAY'
                  ? 'Today'
                  : preset === 'YESTERDAY'
                    ? 'Yesterday'
                    : preset === 'THIS_WEEK'
                      ? 'This Week'
                      : preset === 'THIS_MONTH'
                        ? 'This Month'
                        : 'This FY'}
              </button>
            ))}
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-medium shadow-2xs"
            />
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-medium shadow-2xs"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="Clear Dates"
              >
                Clear
              </button>
            )}
          </div>

          {/* Search Box and Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative flex items-center">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by quote #, customer, mobile..."
                className="w-56 h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              />
              <svg className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="h-8 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Export Quotations to CSV"
            >
              <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="h-8 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Print Register"
            >
              <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* ── QUOTATIONS REGISTER TABLE ── */}
        <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="p-3">Quotation #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Customer / Party</th>
                <th className="p-3">Valid Until</th>
                <th className="p-3 text-center">Items</th>
                <th className="p-3 text-right">Gross Wt (g)</th>
                <th className="p-3 text-right">Estimated Total</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Order #</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 animate-pulse font-semibold">
                    Loading quotation register...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="text-sm font-bold text-slate-900">No quotations found</p>
                      <p className="text-xs text-slate-500">
                        {searchQuery || activeTab !== 'ALL' || startDate || endDate
                          ? 'No records match your active search and filter criteria.'
                          : 'Create your first customer estimate by clicking "+ New Quotation / Estimate".'}
                      </p>
                      {!searchQuery && activeTab === 'ALL' && !startDate && !endDate && (
                        <button
                          type="button"
                          onClick={() => setViewMode('create')}
                          className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs shadow-2xs cursor-pointer"
                          style={{ color: '#ffffff' }}
                        >
                          + New Quotation / Estimate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                quotations.map((q) => {
                  const isExpired =
                    q.status === 'EXPIRED' ||
                    (q.validUntil && dayjs(q.validUntil).isBefore(dayjs(), 'day') && q.status !== 'CONVERTED')
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Quotation Number */}
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setSelectedQuotationId(q.id)}
                          className="font-bold text-slate-900 hover:text-amber-600 hover:underline text-left cursor-pointer font-sans"
                        >
                          {q.quotationNumber}
                        </button>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {q.metalType || 'Gold'}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="p-3 tabular-nums text-slate-700 whitespace-nowrap font-medium font-sans">
                        {formatDate(q.quotationDate)}
                      </td>

                      {/* Customer */}
                      <td className="p-3 font-sans">
                        <div className="font-bold text-slate-900">
                          {q.customerName || q.accountName || 'Counter Customer'}
                        </div>
                        {q.customerCode && (
                          <div className="text-[10px] text-slate-500 font-medium">
                            {q.customerCode}
                          </div>
                        )}
                      </td>

                      {/* Validity */}
                      <td className="p-3 whitespace-nowrap font-sans">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`tabular-nums text-xs font-medium ${
                              isExpired && q.status !== 'CONVERTED' ? 'text-rose-700 font-semibold' : 'text-slate-700'
                            }`}
                          >
                            {formatDate(q.validUntil)}
                          </span>
                          {isExpired && q.status !== 'CONVERTED' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Past Due
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="p-3 text-center tabular-nums font-semibold text-slate-800 font-sans">
                        {q.totalPcs}
                      </td>

                      {/* Gross Wt */}
                      <td className="p-3 text-right tabular-nums text-slate-800 font-medium font-sans">
                        {formatWeight(q.totalGrossWeight)}
                      </td>

                      {/* Grand Total */}
                      <td className="p-3 text-right tabular-nums font-bold text-slate-900 text-xs font-sans">
                        {formatCurrency(q.roundedTotal || q.grandTotal)}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        {(() => {
                          const badge = STATUS_BADGE_MAP[q.status] || { label: q.status, className: 'bg-slate-100 text-slate-700 border-slate-200' }
                          return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.className}`}>
                              {badge.label}
                            </span>
                          )
                        })()}
                      </td>

                      {/* Converted Order # */}
                      <td className="p-3 text-center text-xs font-sans">
                        {q.convertedOrderId ? (
                          onNavigate ? (
                            <button
                              type="button"
                              onClick={() =>
                                onNavigate('customer-orders', 'Customer Custom Orders Desk', 'transaction')
                              }
                              className="text-purple-700 font-bold hover:underline cursor-pointer bg-purple-50 px-2 py-0.5 rounded border border-purple-200"
                              title="View in Customer Orders Desk"
                            >
                              Converted ↗
                            </button>
                          ) : (
                            <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              Converted
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 font-medium">-</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Detail */}
                          <button
                            type="button"
                            onClick={() => setSelectedQuotationId(q.id)}
                            className="px-2.5 py-1 text-xs border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-semibold shadow-2xs transition-colors cursor-pointer"
                          >
                            View
                          </button>

                          {/* Print */}
                          <button
                            type="button"
                            onClick={() => setPrintQuotation(q)}
                            className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-lg shadow-2xs transition-colors cursor-pointer"
                            title="Print Quotation Voucher"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(q)}
                            className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-emerald-600 hover:text-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                            title="Copy Estimate Summary for WhatsApp"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.98-.275-.1-.475-.15-.675.15-.2.3-.776.98-.951 1.18-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.414-1.489-.893-.796-1.496-1.78-1.671-2.08-.175-.3-.019-.462.131-.611.136-.134.301-.35.451-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.225-.244-.585-.493-.505-.675-.515-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.026-1.05 2.501 0 1.475 1.075 2.899 1.225 3.1.15.2 2.115 3.23 5.124 4.53.716.31 1.275.495 1.71.633.719.229 1.373.197 1.89.12.577-.087 1.78-.727 2.03-1.43.25-.702.25-1.304.175-1.43-.075-.125-.275-.2-.575-.35z" />
                              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.176L2 22l4.982-1.308A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2a8.163 8.163 0 01-4.22-1.168l-.303-.18-2.96.776.79-2.885-.198-.315A8.168 8.168 0 1112 20.2z" />
                            </svg>
                          </button>

                          {/* Convert to Order */}
                          {q.status !== 'CONVERTED' && q.status !== 'CANCELLED' && q.status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => handleQuickConvert(q)}
                              className="px-2.5 py-1 text-xs bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 rounded-lg font-bold shadow-2xs transition-colors cursor-pointer"
                              title="Convert Quotation to Confirmed Order"
                            >
                              Convert
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quotation Detail Modal */}
      {selectedQuotationId && (
        <QuotationDetailModal
          quotationId={selectedQuotationId}
          onClose={() => setSelectedQuotationId(null)}
          onStatusUpdated={() => void loadQuotations()}
          onConverted={(_orderId, orderNumber) => {
            setToastMessage(`✓ Converted to Order #${orderNumber}!`)
            void loadQuotations()
          }}
        />
      )}

      {/* Print View Modal */}
      {printQuotation && (
        <QuotationPrintView
          quotation={printQuotation}
          onClose={() => setPrintQuotation(null)}
        />
      )}
    </div>
  )
}

export default CustomerQuotationScreen
