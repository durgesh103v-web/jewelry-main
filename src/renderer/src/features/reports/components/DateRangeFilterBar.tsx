import React, { useState } from 'react'
import dayjs from 'dayjs'
import { FiSearch, FiDownload, FiPrinter, FiRefreshCw, FiCalendar } from 'react-icons/fi'

export type DatePreset = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_FY' | 'CUSTOM'

interface DateRangeFilterBarProps {
  startDate: string
  endDate: string
  search: string
  onDateChange: (start: string, end: string) => void
  onSearchChange: (search: string) => void
  onExportCsv?: () => void
  onPrint?: () => void
  onRefresh?: () => void
  isLoading?: boolean
}

export const DateRangeFilterBar: React.FC<DateRangeFilterBarProps> = ({
  startDate,
  endDate,
  search,
  onDateChange,
  onSearchChange,
  onExportCsv,
  onPrint,
  onRefresh,
  isLoading = false
}) => {
  const [activePreset, setActivePreset] = useState<DatePreset | null>('THIS_MONTH')

  const setPreset = (preset: DatePreset) => {
    setActivePreset(preset)
    const today = dayjs()
    if (preset === 'TODAY') {
      const d = today.format('YYYY-MM-DD')
      onDateChange(d, d)
    } else if (preset === 'YESTERDAY') {
      const d = today.subtract(1, 'day').format('YYYY-MM-DD')
      onDateChange(d, d)
    } else if (preset === 'THIS_WEEK') {
      onDateChange(today.startOf('week').format('YYYY-MM-DD'), today.endOf('week').format('YYYY-MM-DD'))
    } else if (preset === 'THIS_MONTH') {
      onDateChange(today.startOf('month').format('YYYY-MM-DD'), today.endOf('month').format('YYYY-MM-DD'))
    } else if (preset === 'LAST_MONTH') {
      const lastMonth = today.subtract(1, 'month')
      onDateChange(lastMonth.startOf('month').format('YYYY-MM-DD'), lastMonth.endOf('month').format('YYYY-MM-DD'))
    } else if (preset === 'THIS_FY') {
      const currentYear = today.month() >= 3 ? today.year() : today.year() - 1
      const fyStart = `${currentYear}-04-01`
      const fyEnd = `${currentYear + 1}-03-31`
      onDateChange(fyStart, fyEnd)
    }
  }

  const handleCustomDateChange = (start: string, end: string) => {
    setActivePreset('CUSTOM')
    onDateChange(start, end)
  }

  const presets: { id: DatePreset; label: string }[] = [
    { id: 'TODAY', label: 'Today' },
    { id: 'YESTERDAY', label: 'Yesterday' },
    { id: 'THIS_WEEK', label: 'This Week' },
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'THIS_FY', label: 'This FY' }
  ]

  return (
    <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
      {/* Date Presets */}
      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
        {presets.map((p) => {
          const isSelected = activePreset === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-amber-500 text-white font-bold border-amber-600 shadow-2xs'
                  : 'text-slate-700 hover:text-amber-900 hover:bg-amber-50/70 border-transparent font-medium'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* Date Pickers */}
      <div className="flex items-center gap-2">
        <span className="text-slate-600 font-semibold flex items-center gap-1">
          <FiCalendar className="w-3.5 h-3.5 text-amber-600" />
          From:
        </span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
          className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-semibold shadow-2xs"
        />
        <span className="text-slate-600 font-semibold">To:</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
          className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-semibold shadow-2xs"
        />
      </div>

      {/* Search Input */}
      <div className="relative min-w-[220px] flex-1 max-w-sm">
        <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter by party, bill no..."
          className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh Data"
            disabled={isLoading}
            className="h-8 px-3 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLoading ? 'Fetching...' : 'Refresh'}</span>
          </button>
        )}

        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            disabled={isLoading}
            className="h-8 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 active:to-amber-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 border border-amber-600 cursor-pointer disabled:opacity-50"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        )}

        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            disabled={isLoading}
            className="h-8 px-3 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <FiPrinter className="w-3.5 h-3.5 text-slate-600" />
            <span>Print</span>
          </button>
        )}

        {isLoading && (
          <span className="text-xs text-amber-600 animate-pulse font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Loading...
          </span>
        )}
      </div>
    </div>
  )
}

