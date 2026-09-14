import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiLock,
  FiPlus,
  FiRefreshCw,
  FiRotateCcw,
  FiSearch,
  FiTrash2,
  FiUnlock,
  FiX
} from 'react-icons/fi'
import { DataTable, type Column } from '@components/ui'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatDate } from '@utils/formatters'

type AlertType = 'success' | 'error' | 'warning'

type FinancialYearForm = {
  yearLabel: string
  startDate: string
  endDate: string
  narration: string
}

const initialForm: FinancialYearForm = {
  yearLabel: '',
  startDate: '',
  endDate: '',
  narration: ''
}

function FinancialYearScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [years, setYears] = useState<FinancialYearRecord[]>([])
  const [form, setForm] = useState<FinancialYearForm>(initialForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OPEN' | 'CLOSED'>('ALL')

  const [deleteTarget, setDeleteTarget] = useState<FinancialYearRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const yearLabelInputRef = useRef<HTMLInputElement | null>(null)
  const startDateInputRef = useRef<HTMLInputElement | null>(null)
  const endDateInputRef = useRef<HTMLInputElement | null>(null)
  const narrationInputRef = useRef<HTMLInputElement | null>(null)

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

  const loadYears = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.financialYears.list()
      setYears(data || [])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    void loadYears()

    return () => {
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadYears])

  const currentYear = useMemo(() => years.find((year) => year.isCurrent) ?? null, [years])

  const filteredYears = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return years.filter((year) => {
      if (statusFilter === 'ACTIVE' && !year.isCurrent) return false
      if (statusFilter === 'CLOSED' && !year.isClosed) return false
      if (statusFilter === 'OPEN' && (year.isClosed || year.isCurrent)) return false

      if (!keyword) return true
      return (
        year.yearLabel.toLowerCase().includes(keyword) ||
        (year.narration || '').toLowerCase().includes(keyword)
      )
    })
  }, [years, searchText, statusFilter])

  const handleNew = (): void => {
    setEditingId(null)
    setForm(initialForm)
    yearLabelInputRef.current?.focus()
  }

  const handleQuickDates = (startYear: number): void => {
    const nextYearShort = String(startYear + 1).slice(-2)
    setForm({
      yearLabel: `${startYear}-${nextYearShort}`,
      startDate: `${startYear}-04-01`,
      endDate: `${startYear + 1}-03-31`,
      narration: `Financial Year ${startYear}-${startYear + 1}`
    })
  }

  const handleEdit = (year: FinancialYearRecord): void => {
    setEditingId(year.id)
    setForm({
      yearLabel: year.yearLabel,
      startDate: year.startDate,
      endDate: year.endDate,
      narration: year.narration || ''
    })
    yearLabelInputRef.current?.focus()
  }

  const handleSave = async (): Promise<void> => {
    if (saving) return

    if (!form.yearLabel.trim()) {
      showAlert('warning', 'Please enter a Financial Year label (e.g. 2026-27).')
      yearLabelInputRef.current?.focus()
      return
    }

    if (!form.startDate || !form.endDate) {
      showAlert('warning', 'Please select both start date and end date.')
      return
    }

    if (new Date(form.startDate) >= new Date(form.endDate)) {
      showAlert('warning', 'Start date must be earlier than the end date.')
      return
    }

    try {
      setSaving(true)
      const payload = {
        yearLabel: form.yearLabel.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        narration: form.narration.trim()
      }

      if (editingId) {
        await window.api.financialYears.update(editingId, payload)
        showAlert('success', `Financial year "${form.yearLabel}" updated successfully.`)
      } else {
        await window.api.financialYears.create(payload)
        showAlert('success', `Financial year "${form.yearLabel}" created successfully.`)
      }

      setEditingId(null)
      setForm(initialForm)
      await loadYears()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleSetCurrent = async (year: FinancialYearRecord): Promise<void> => {
    try {
      await window.api.financialYears.setCurrent(year.id)
      await loadYears()
      showAlert('success', `"${year.yearLabel}" set as current active financial year.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }

  const handleToggleClosed = async (year: FinancialYearRecord): Promise<void> => {
    try {
      await window.api.financialYears.toggleClosed(year.id, !year.isClosed)
      await loadYears()
      showAlert(
        'success',
        `"${year.yearLabel}" ${year.isClosed ? 'reopened' : 'closed'} successfully.`
      )
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await window.api.financialYears.remove(deleteTarget.id)
      if (editingId === deleteTarget.id) {
        setEditingId(null)
        setForm(initialForm)
      }
      setDeleteTarget(null)
      await loadYears()
      showAlert('success', `Financial year "${deleteTarget.yearLabel}" deleted successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const focusNextOnEnter = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    nextElement?: HTMLElement | null
  ): void => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    nextElement?.focus()
  }

  const columns: Column<FinancialYearRecord>[] = useMemo(
    () => [
      {
        key: 'srNo',
        header: 'Sr No',
        align: 'center',
        width: '55px',
        render: (_, index) => (
          <span className="text-slate-400 font-mono text-[11px] font-semibold">{index + 1}</span>
        )
      },
      {
        key: 'yearLabel',
        header: 'Financial Year',
        width: '160px',
        render: (y) => (
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-900 text-xs">{y.yearLabel}</span>
            {y.isCurrent && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                Current
              </span>
            )}
          </div>
        )
      },
      {
        key: 'period',
        header: 'Fiscal Period',
        render: (y) => (
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
            <FiCalendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{formatDate(y.startDate)}</span>
            <span className="text-slate-400">➔</span>
            <span>{formatDate(y.endDate)}</span>
          </div>
        )
      },
      {
        key: 'status',
        header: 'Status',
        align: 'center',
        width: '110px',
        render: (y) => {
          if (y.isCurrent) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            )
          }
          if (y.isClosed) {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <FiLock className="w-3 h-3" />
                Closed
              </span>
            )
          }
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <FiUnlock className="w-3 h-3" />
              Open
            </span>
          )
        }
      },
      {
        key: 'narration',
        header: 'Narration / Notes',
        render: (y) => (
          <span className="text-slate-600 text-xs truncate max-w-[200px] block">
            {y.narration || '-'}
          </span>
        )
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        width: '240px',
        render: (y) => (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => handleEdit(y)}
              className="h-7 px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
            >
              <FiEdit2 className="w-3 h-3 text-slate-500" />
              <span>Edit</span>
            </button>

            {!y.isCurrent && !y.isClosed && (
              <button
                type="button"
                onClick={() => void handleSetCurrent(y)}
                className="h-7 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <FiCheck className="w-3 h-3 text-emerald-700" />
                <span>Set Current</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleToggleClosed(y)}
              className={`h-7 px-2.5 rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-all shadow-2xs border cursor-pointer ${
                y.isClosed
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {y.isClosed ? <FiUnlock className="w-3 h-3" /> : <FiLock className="w-3 h-3" />}
              <span>{y.isClosed ? 'Reopen' : 'Close'}</span>
            </button>

            {!y.isCurrent && (
              <button
                type="button"
                onClick={() => setDeleteTarget(y)}
                className="h-7 px-2 bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 hover:border-rose-300 rounded-md text-[11px] font-bold inline-flex items-center transition-all shadow-2xs cursor-pointer"
                title={`Delete ${y.yearLabel}`}
              >
                <FiTrash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )
      }
    ],
    []
  )

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiCalendar className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Financial Year Management</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                Active FY: {currentYear ? currentYear.yearLabel : 'Not Set'}
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Manage accounting periods, fiscal closures, date boundaries, and active billing year
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNew}
            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <FiPlus className="w-3.5 h-3.5 text-amber-600" />
            <span>New FY</span>
          </button>

          <button
            type="button"
            onClick={() => void loadYears()}
            disabled={loading}
            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
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

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Current Active FY
              </span>
              <strong className="text-base font-extrabold font-mono text-emerald-950 block mt-0.5">
                {currentYear ? currentYear.yearLabel : 'None Set'}
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 font-bold">
              <FiCheckCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Total FY Periods
              </span>
              <strong className="text-base font-extrabold font-mono text-amber-950 block mt-0.5">
                {years.length} Years
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
              <FiCalendar className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                Closed / Audited
              </span>
              <strong className="text-base font-extrabold font-mono text-rose-950 block mt-0.5">
                {years.filter((y) => y.isClosed).length} Periods
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200">
              <FiLock className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                Fiscal Format
              </span>
              <strong className="text-xs font-bold text-slate-800 block mt-1">
                Apr 01 ➔ Mar 31
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <FiClock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Add / Edit Financial Year Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                <FiEdit2 className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {editingId ? 'Edit Financial Year' : 'Add Financial Year Period'}
              </h2>
            </div>

            {/* Quick Auto Fill Presets */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Quick Generate:</span>
              <button
                type="button"
                onClick={() => handleQuickDates(2025)}
                className="h-6 px-2 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 rounded text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
              >
                2025-26
              </button>
              <button
                type="button"
                onClick={() => handleQuickDates(2026)}
                className="h-6 px-2 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 rounded text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
              >
                2026-27
              </button>
              <button
                type="button"
                onClick={() => handleQuickDates(2027)}
                className="h-6 px-2 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 rounded text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
              >
                2027-28
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Year Label <span className="text-rose-600">*</span>
              </label>
              <input
                ref={yearLabelInputRef}
                type="text"
                value={form.yearLabel}
                onChange={(e) => setForm((prev) => ({ ...prev, yearLabel: e.target.value }))}
                onKeyDown={(e) => focusNextOnEnter(e, startDateInputRef.current)}
                placeholder="e.g. 2026-27"
                className="w-full h-8.5 px-3 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Start Date <span className="text-rose-600">*</span>
              </label>
              <input
                ref={startDateInputRef}
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                onKeyDown={(e) => focusNextOnEnter(e, endDateInputRef.current)}
                className="w-full h-8.5 px-3 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                End Date <span className="text-rose-600">*</span>
              </label>
              <input
                ref={endDateInputRef}
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                onKeyDown={(e) => focusNextOnEnter(e, narrationInputRef.current)}
                className="w-full h-8.5 px-3 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex-1">
              <input
                ref={narrationInputRef}
                type="text"
                value={form.narration}
                onChange={(e) => setForm((prev) => ({ ...prev, narration: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleSave()
                  }
                }}
                placeholder="Narration or optional audit notes (e.g. Primary GST Accounting Year)..."
                className="w-full h-8.5 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleNew}
                disabled={saving}
                className="h-8.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <FiRotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>{editingId ? 'Cancel Edit' : 'Clear Form'}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="h-8.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-amber-600 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <FiCheck className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : editingId ? 'Update FY' : 'Save Financial Year'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar Filter */}
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 no-print">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-72">
              <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by year label or narration..."
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
              <span className="text-slate-700 font-bold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-2xs"
              >
                <option value="ALL">All Periods ({years.length})</option>
                <option value="ACTIVE">Current Active FY</option>
                <option value="OPEN">Open Periods</option>
                <option value="CLOSED">Closed / Audited</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Total: <strong className="font-mono text-slate-800">{years.length}</strong></span>
            <span>•</span>
            <span>Showing: <strong className="font-mono text-slate-800">{filteredYears.length}</strong></span>
          </div>
        </div>

        {/* DataTable Container */}
        <div className="flex-1 overflow-hidden border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          <DataTable<FinancialYearRecord>
            columns={columns}
            data={filteredYears}
            keyExtractor={(y) => y.id}
            loading={loading}
            loadingMessage="Loading financial years..."
            onRowClick={(y) => handleEdit(y)}
            emptyTitle="No Financial Years Found"
            emptyMessage={
              searchText
                ? 'No financial year matched your search query.'
                : 'Add a new financial year using the form above.'
            }
          />

          {filteredYears.length > 0 && (
            <div className="bg-slate-100 border-t border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-500 shrink-0 no-print">
              <span>
                Tip: Only one financial year can be active at a time. The current year cannot be closed or deleted directly.
              </span>
              <span className="font-mono font-semibold text-slate-700">
                Showing {filteredYears.length} of {years.length} Periods
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <FiAlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Financial Year</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to permanently delete{' '}
                  <strong className="font-mono text-slate-900 font-bold">{deleteTarget.yearLabel}</strong>?
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-900">
              This action cannot be undone. Transactions logged under this fiscal period may require reassignment.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="h-8.5 px-3.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={deleting}
                className="h-8.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinancialYearScreen
