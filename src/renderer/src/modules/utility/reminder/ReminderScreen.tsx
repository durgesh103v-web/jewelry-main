import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiAlertTriangle,
  FiBell,
  FiClock,
  FiDollarSign,
  FiDownload,
  FiFilter,
  FiInbox,
  FiPhone,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiTag,
  FiX
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })
}

function formatAmount(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDate(value: string): string {
  if (!value) return '-'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function daysLabel(reminder: ReminderRecord): string {
  if (reminder.daysUntil === 0) return 'Due Today'
  if (reminder.daysUntil < 0) return `${Math.abs(reminder.daysUntil)} day(s) overdue`
  return `Due in ${reminder.daysUntil} day(s)`
}

function ReminderScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [reminders, setReminders] = useState<ReminderRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Sale' | 'Approval'>('ALL')
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING'>('ALL')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 3500)
  }, [])

  const loadReminders = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.reminder.list()
      setReminders(data || [])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    void loadReminders()

    return () => {
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadReminders])

  const filteredReminders = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return reminders.filter((reminder) => {
      if (typeFilter !== 'ALL' && reminder.type !== typeFilter) return false

      if (urgencyFilter === 'OVERDUE' && !reminder.isOverdue) return false
      if (urgencyFilter === 'TODAY' && reminder.daysUntil !== 0) return false
      if (urgencyFilter === 'UPCOMING' && (reminder.isOverdue || reminder.daysUntil <= 0)) return false

      if (!keyword) return true

      return (
        reminder.billNo.toLowerCase().includes(keyword) ||
        reminder.accountName.toLowerCase().includes(keyword) ||
        (reminder.mobileNumber || '').toLowerCase().includes(keyword) ||
        (reminder.metalType || '').toLowerCase().includes(keyword)
      )
    })
  }, [reminders, searchText, typeFilter, urgencyFilter])

  const totals = useMemo(() => {
    return filteredReminders.reduce(
      (acc, r) => {
        acc.fineDue += Number(r.fineAmount || 0)
        acc.majuriDue += Number(r.majuriAmount || 0)
        if (r.isOverdue) acc.overdueCount += 1
        if (r.daysUntil === 0) acc.dueTodayCount += 1
        return acc
      },
      { fineDue: 0, majuriDue: 0, overdueCount: 0, dueTodayCount: 0 }
    )
  }, [filteredReminders])

  const handleExportCsv = () => {
    if (filteredReminders.length === 0) {
      showAlert('warning', 'No reminders to export.')
      return
    }
    const headers = [
      'Sr',
      'Type',
      'Bill No',
      'Bill Date',
      'Account',
      'Phone',
      'Reminder Date',
      'Urgency',
      'Metal',
      'Fine Due (g)',
      'Majuri Due (INR)'
    ]
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const csvRows = [
      ...filteredReminders.map((r, idx) => [
        idx + 1,
        escapeCsv(r.type),
        escapeCsv(r.billNo),
        escapeCsv(formatDate(r.billDate)),
        escapeCsv(r.accountName),
        escapeCsv(r.mobileNumber || '-'),
        escapeCsv(formatDate(r.reminderDate)),
        escapeCsv(daysLabel(r)),
        escapeCsv(r.metalType),
        formatNumber(r.fineAmount),
        formatAmount(r.majuriAmount)
      ]),
      [
        'Total',
        '',
        '',
        '',
        `${filteredReminders.length} Reminders`,
        '',
        '',
        `${totals.overdueCount} Overdue`,
        '',
        formatNumber(totals.fineDue),
        formatAmount(totals.majuriDue)
      ]
    ]

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reminders_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Reminders list successfully.')
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiBell className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Payment & Approval Reminders</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                {filteredReminders.length} Active Reminders
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Track upcoming customer return deadlines, payment due dates, and overdue follow-ups
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadReminders()}
            disabled={loading}
            className="h-8 px-3 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 text-amber-600 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Loading...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || filteredReminders.length === 0}
            className="h-8 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-amber-600 cursor-pointer disabled:opacity-50"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={filteredReminders.length === 0}
            className="h-8 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FiPrinter className="w-3.5 h-3.5 text-slate-600" />
            <span>Print</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col p-3 gap-2.5 overflow-hidden">
        {alertMessage && (
          <div className="shrink-0 no-print">
            <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />
          </div>
        )}

        {/* Filter Controls Toolbar */}
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 no-print">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-72">
              <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search bill no, account, mobile..."
                className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs font-medium"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              {searchText && (
                <button
                  type="button"
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  onClick={() => setSearchText('')}
                >
                  &times;
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-700 font-bold flex items-center gap-1">
                <FiFilter className="w-3.5 h-3.5 text-amber-600" /> Type:
              </span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'Sale' | 'Approval')}
                className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-2xs"
              >
                <option value="ALL">All Bill Types</option>
                <option value="Sale">Sale Invoices</option>
                <option value="Approval">Approval Memos</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-700 font-bold flex items-center gap-1">
                <FiClock className="w-3.5 h-3.5 text-amber-600" /> Urgency:
              </span>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value as 'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING')}
                className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-2xs"
              >
                <option value="ALL">All Urgencies</option>
                <option value="OVERDUE">Overdue Deadlines</option>
                <option value="TODAY">Due Today</option>
                <option value="UPCOMING">Upcoming Follow-ups</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Total: <strong className="font-mono text-slate-800">{reminders.length}</strong></span>
            <span>•</span>
            <span className="text-rose-700 font-bold">Overdue: <strong className="font-mono">{totals.overdueCount}</strong></span>
            <span>•</span>
            <span>Showing: <strong className="font-mono text-slate-800">{filteredReminders.length}</strong></span>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3.5 rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                Overdue Follow-ups
              </span>
              <strong className="text-base font-extrabold font-mono text-rose-900 block mt-0.5">
                {totals.overdueCount} Invoices
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200">
              <FiAlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Due Today
              </span>
              <strong className="text-base font-extrabold font-mono text-amber-900 block mt-0.5">
                {totals.dueTodayCount} Invoices
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
              <FiClock className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Total Fine Due
              </span>
              <strong className="text-base font-extrabold font-mono text-amber-900 block mt-0.5">
                {formatNumber(totals.fineDue)}g
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
              <FiTag className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                Total Majuri Due
              </span>
              <strong className="text-base font-extrabold font-mono text-blue-900 block mt-0.5">
                ₹{formatAmount(totals.majuriDue)}
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200">
              <FiDollarSign className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Reminders Data Table */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Bill No</th>
                <th className="py-2.5 px-3">Bill Date</th>
                <th className="py-2.5 px-3">Account Name</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Reminder Date</th>
                <th className="py-2.5 px-3 text-center">Urgency Status</th>
                <th className="py-2.5 px-3">Metal</th>
                <th className="py-2.5 px-3 text-right">Fine Due (g)</th>
                <th className="py-2.5 px-3 text-right">Majuri Due (₹)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                    <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading reminders...
                  </td>
                </tr>
              ) : filteredReminders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2">
                        <FiInbox className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm text-slate-800 mb-0.5">No Pending Reminders</span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {searchText || typeFilter !== 'ALL' || urgencyFilter !== 'ALL'
                          ? 'No matching reminders for your selected filters.'
                          : 'Set a reminder date on a Sale or Approval memo to track it here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReminders.map((r, index) => {
                  const isOverdue = r.isOverdue
                  const isDueToday = r.daysUntil === 0
                  return (
                    <tr
                      key={`${r.type}-${r.id}-${index}`}
                      className={`hover:bg-amber-50/40 text-slate-700 font-medium transition-colors ${
                        isOverdue ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{index + 1}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${
                            r.type === 'Sale'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          }`}
                        >
                          {r.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.billNo}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{formatDate(r.billDate)}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{r.accountName}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                        {r.mobileNumber ? (
                          <span className="flex items-center gap-1">
                            <FiPhone className="w-3 h-3 text-slate-400" />
                            {r.mobileNumber}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{formatDate(r.reminderDate)}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                            isOverdue
                              ? 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold animate-pulse'
                              : isDueToday
                              ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {daysLabel(r)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{r.metalType}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-900 bg-amber-50/20">
                        {r.fineAmount ? `${formatNumber(r.fineAmount)}g` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-900 bg-blue-50/20">
                        {r.majuriAmount ? `₹${formatAmount(r.majuriAmount)}` : '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>

            {filteredReminders.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0 z-10 shadow-inner">
                <tr>
                  <td colSpan={7} className="py-2.5 px-3 text-right text-xs uppercase tracking-wider">
                    Total:
                  </td>
                  <td colSpan={2} className="py-2.5 px-3 text-center text-xs text-rose-700 font-bold">
                    {totals.overdueCount} Overdue / {totals.dueTodayCount} Due Today
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-amber-900 bg-amber-100/50">
                    {formatNumber(totals.fineDue)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-blue-900 bg-blue-100/50">
                    ₹{formatAmount(totals.majuriDue)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

export default ReminderScreen
