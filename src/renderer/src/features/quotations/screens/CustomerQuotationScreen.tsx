import React, { useState, useEffect, useCallback, useMemo } from 'react'
import type { QuotationRecord, QuotationStatus } from '../types'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { CreateQuotationScreen } from './CreateQuotationScreen'
import { QuotationDetailModal } from '../components/QuotationDetailModal'
import { QuotationPrintView } from '../components/QuotationPrintView'
import { StatusPill, MetalRatesStrip } from '../../../components/ui'

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
  DRAFT: { label: 'Draft', className: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200' },
  SENT: { label: 'Sent', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  ACCEPTED: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  CONVERTED: { label: 'Converted', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 font-semibold' },
  EXPIRED: { label: 'Expired', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  REJECTED: { label: 'Rejected', className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' },
  CANCELLED: { label: 'Cancelled', className: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' }
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

    return { total, active, converted, totalValue }
  }, [quotations])

  // Handle Quick Convert to Order from Register
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
    <div className="flex flex-col h-full bg-[var(--color-background-app,#f8fafc)] text-slate-900 overflow-hidden select-none font-sans">
      {/* Top Banner & Header */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-3 shadow-2xs shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📋</span>
            <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Customer Quotation / Estimate Desk</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono font-bold">
                ESTIMATES
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Create customer quotations with live pricing, manage estimates, and convert directly to confirmed orders
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadQuotations()}
            disabled={isLoading}
            className="h-8 px-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Refresh Quotations"
          >
            <svg
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-500' : 'text-slate-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reload</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('create')}
            className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            style={{ color: '#ffffff' }}
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="!text-white font-bold" style={{ color: '#ffffff' }}>New Quotation / Estimate</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              title="Close Screen"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Toast / Notification Banner */}
        {toastMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs">
            <span>{toastMessage}</span>
            <button type="button" onClick={() => setToastMessage(null)} className="text-emerald-700 hover:bg-emerald-100 px-2 py-0.5 rounded font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs">
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => setError(null)} className="text-rose-700 hover:bg-rose-100 px-2 py-0.5 rounded font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Live Showroom Metal Rates Reference */}
        <MetalRatesStrip />

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Quotations</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold font-mono text-slate-900">{metrics.total}</span>
              <span className="text-[11px] text-slate-500 font-medium">All time</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Estimates</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold font-mono text-blue-700">
                {metrics.active}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Draft/Sent/Accepted</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Converted to Orders</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold font-mono text-purple-700">
                {metrics.converted}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Orders generated</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Estimated Value</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black font-mono text-amber-900">
                {formatCurrency(metrics.totalValue)}
              </span>
              <span className="text-[11px] text-amber-700 font-semibold">Pipeline value</span>
            </div>
          </div>
        </div>

        {/* Filter Controls & Tabs */}
        <div className="space-y-2.5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
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
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${activeTab === tab
                    ? 'bg-amber-500 !text-white shadow-2xs font-bold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                {tab === 'ALL' ? 'All Quotations' : STATUS_BADGE_MAP[tab]?.label || tab}
              </button>
            ))}
          </div>

          {/* Search and Date Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex-1 min-w-[240px]">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Quotation #, Customer Name, Account, Mobile..."
                  className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800 transition-all font-medium"
                />
                <div className="absolute left-2.5 top-2 text-slate-400 text-xs">
                  🔍
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold text-[11px]">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 text-slate-800"
              />
              <span className="text-slate-500 font-semibold text-[11px]">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 text-slate-800"
              />
              {(startDate || endDate || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                    setSearchQuery('')
                  }}
                  className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors font-semibold cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quotation Register Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px] tracking-tight">
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
              <tbody className="divide-y divide-slate-100">
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
                          {searchQuery || activeTab !== 'ALL'
                            ? 'No records match your active search and filter criteria.'
                            : 'Create your first customer estimate by clicking "+ New Quotation / Estimate".'}
                        </p>
                        {!searchQuery && activeTab === 'ALL' && (
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
                  quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-amber-50/30 transition-colors">
                      {/* Quotation Number */}
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setSelectedQuotationId(q.id)}
                          className="font-mono font-bold text-amber-700 hover:text-amber-900 hover:underline text-left cursor-pointer"
                        >
                          {q.quotationNumber}
                        </button>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{q.metalType}</div>
                      </td>

                      {/* Date */}
                      <td className="p-3 font-mono text-slate-800 whitespace-nowrap font-medium">
                        {formatDate(q.quotationDate)}
                      </td>

                      {/* Customer */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900">
                          {q.customerName || q.accountName || 'Counter Customer'}
                        </div>
                        {q.customerCode && (
                          <div className="text-[10px] text-slate-500 font-mono font-semibold">
                            {q.customerCode}
                          </div>
                        )}
                      </td>

                      {/* Validity */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-700 font-medium">
                          {formatDate(q.validUntil)}
                        </span>
                      </td>

                      {/* Items */}
                      <td className="p-3 text-center font-mono font-bold text-slate-800">{q.totalPcs}</td>

                      {/* Gross Wt */}
                      <td className="p-3 text-right font-mono text-slate-900 font-bold">
                        {formatWeight(q.totalGrossWeight)}
                      </td>

                      {/* Grand Total */}
                      <td className="p-3 text-right font-mono font-extrabold text-amber-900 text-xs">
                        {formatCurrency(q.roundedTotal || q.grandTotal)}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <StatusPill statusText={STATUS_BADGE_MAP[q.status]?.label || q.status} />
                      </td>

                      {/* Converted Order # */}
                      <td className="p-3 text-center font-mono text-xs">
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
                            className="px-2.5 py-1 text-xs border border-slate-300 rounded-md hover:bg-slate-100 text-slate-700 font-semibold transition-colors cursor-pointer"
                          >
                            View
                          </button>

                          {/* Print */}
                          <button
                            type="button"
                            onClick={() => setPrintQuotation(q)}
                            className="p-1 border border-slate-300 rounded-md hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors cursor-pointer"
                            title="Print Voucher"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>

                          {/* Convert to Order */}
                          {q.status !== 'CONVERTED' && q.status !== 'CANCELLED' && q.status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => handleQuickConvert(q)}
                              className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors font-bold cursor-pointer"
                              title="Convert Quotation to Confirmed Order"
                            >
                              Convert
                            </button>
                          )}
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
