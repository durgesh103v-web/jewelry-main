import React, { useState, useEffect, useCallback, useMemo } from 'react'
import type { QuotationRecord, QuotationStatus } from '../types'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { NewQuotationModal } from '../components/NewQuotationModal'
import { QuotationDetailModal } from '../components/QuotationDetailModal'
import { QuotationPrintView } from '../components/QuotationPrintView'

export interface CustomerQuotationScreenProps {
  onClose?: () => void
  onNavigate?: (
    id: string,
    label: string,
    module: 'home' | 'master' | 'transaction' | 'reports' | 'gst' | 'utility'
  ) => void
}

type TabFilter = 'ALL' | QuotationStatus

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
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false)
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

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Top Banner & Header */}
      <div className="px-6 py-4 border-b border-border bg-card/60 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">Customer Quotation / Estimate Desk</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Phase 22
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create customer quotations with live pricing, manage estimates, and convert directly to confirmed orders
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadQuotations()}
            disabled={isLoading}
            className="p-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Refresh Quotations"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Quotation / Estimate
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Close Screen"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Toast / Notification Banner */}
        {toastMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-medium flex justify-between items-center animate-fade-in">
            <span>{toastMessage}</span>
            <button type="button" onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg text-xs flex justify-between items-center">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
            <span className="text-xs font-medium text-muted-foreground">Total Quotations</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-foreground">{metrics.total}</span>
              <span className="text-xs text-muted-foreground">All time</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
            <span className="text-xs font-medium text-muted-foreground">Active Estimates</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {metrics.active}
              </span>
              <span className="text-xs text-muted-foreground">Draft/Sent/Accepted</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
            <span className="text-xs font-medium text-muted-foreground">Converted to Orders</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                {metrics.converted}
              </span>
              <span className="text-xs text-muted-foreground">Orders generated</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
            <span className="text-xs font-medium text-muted-foreground">Total Estimated Value</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-primary">
                {formatCurrency(metrics.totalValue)}
              </span>
              <span className="text-xs text-muted-foreground">Pipeline value</span>
            </div>
          </div>
        </div>

        {/* Filter Controls & Tabs */}
        <div className="space-y-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border text-xs">
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
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {tab === 'ALL' ? 'All Quotations' : STATUS_BADGE_MAP[tab]?.label || tab}
              </button>
            ))}
          </div>

          {/* Search and Date Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
            <div className="flex-1 min-w-[240px]">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Quotation #, Customer Name, Account, Mobile..."
                  className="w-full h-9 pl-9 pr-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <svg
                  className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 px-2.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-muted-foreground">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 px-2.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {(startDate || endDate || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                    setSearchQuery('')
                  }}
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg border border-border transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quotation Register Table */}
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
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
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-muted-foreground animate-pulse">
                      Loading quotation register...
                    </td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-muted-foreground">
                      <div className="max-w-sm mx-auto space-y-2">
                        <p className="text-sm font-semibold text-foreground">No quotations found</p>
                        <p className="text-xs">
                          {searchQuery || activeTab !== 'ALL'
                            ? 'No records match your active search and filter criteria.'
                            : 'Create your first customer estimate by clicking "+ New Quotation".'}
                        </p>
                        {!searchQuery && activeTab === 'ALL' && (
                          <button
                            type="button"
                            onClick={() => setIsNewModalOpen(true)}
                            className="mt-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg text-xs"
                          >
                            + New Quotation
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-accent/40 transition-colors">
                      {/* Quotation Number */}
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setSelectedQuotationId(q.id)}
                          className="font-mono font-bold text-primary hover:underline text-left"
                        >
                          {q.quotationNumber}
                        </button>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{q.metalType}</div>
                      </td>

                      {/* Date */}
                      <td className="p-3 font-mono text-foreground whitespace-nowrap">
                        {formatDate(q.quotationDate)}
                      </td>

                      {/* Customer */}
                      <td className="p-3">
                        <div className="font-semibold text-foreground">
                          {q.customerName || q.accountName || 'Counter Customer'}
                        </div>
                        {q.customerCode && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {q.customerCode}
                          </div>
                        )}
                      </td>

                      {/* Validity */}
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(q.validUntil)}
                      </td>

                      {/* Items */}
                      <td className="p-3 text-center font-mono">{q.totalPcs}</td>

                      {/* Gross Wt */}
                      <td className="p-3 text-right font-mono text-foreground">
                        {formatWeight(q.totalGrossWeight)}
                      </td>

                      {/* Grand Total */}
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        {formatCurrency(q.roundedTotal || q.grandTotal)}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            STATUS_BADGE_MAP[q.status]?.className || 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {STATUS_BADGE_MAP[q.status]?.label || q.status}
                        </span>
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
                              className="text-purple-600 dark:text-purple-400 font-medium hover:underline cursor-pointer"
                              title="View in Customer Orders Desk"
                            >
                              Converted ↗
                            </button>
                          ) : (
                            <span className="text-purple-600 dark:text-purple-400 font-medium">
                              Converted
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Detail */}
                          <button
                            type="button"
                            onClick={() => setSelectedQuotationId(q.id)}
                            className="px-2.5 py-1 text-xs border border-border rounded-md hover:bg-accent text-foreground transition-colors"
                          >
                            View
                          </button>

                          {/* Print */}
                          <button
                            type="button"
                            onClick={() => setPrintQuotation(q)}
                            className="p-1 border border-border rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
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
                              className="px-2.5 py-1 text-xs bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-600/20 hover:bg-emerald-600/20 rounded-md transition-colors font-medium"
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

      {/* New Quotation Modal */}
      <NewQuotationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={(newQuote) => {
          setToastMessage(`✓ Quotation #${newQuote.quotationNumber} saved successfully!`)
          void loadQuotations()
          setSelectedQuotationId(newQuote.id)
        }}
      />

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
