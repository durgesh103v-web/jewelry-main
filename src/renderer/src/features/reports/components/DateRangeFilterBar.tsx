import React from 'react'
import dayjs from 'dayjs'

interface DateRangeFilterBarProps {
  startDate: string
  endDate: string
  search: string
  onDateChange: (start: string, end: string) => void
  onSearchChange: (search: string) => void
  onExportCsv?: () => void
  onPrint?: () => void
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
  isLoading = false
}) => {
  const setPreset = (preset: 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_FY') => {
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
      // Indian Financial Year: April 1 to March 31
      const currentYear = today.month() >= 3 ? today.year() : today.year() - 1
      const fyStart = `${currentYear}-04-01`
      const fyEnd = `${currentYear + 1}-03-31`
      onDateChange(fyStart, fyEnd)
    }
  }

  return (
    <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Date Presets */}
      <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border/50">
        <button
          type="button"
          onClick={() => setPreset('TODAY')}
          className="px-2.5 py-1 rounded hover:bg-background transition-colors font-medium text-foreground"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setPreset('YESTERDAY')}
          className="px-2.5 py-1 rounded hover:bg-background transition-colors font-medium text-foreground"
        >
          Yesterday
        </button>
        <button
          type="button"
          onClick={() => setPreset('THIS_WEEK')}
          className="px-2.5 py-1 rounded hover:bg-background transition-colors font-medium text-foreground"
        >
          This Week
        </button>
        <button
          type="button"
          onClick={() => setPreset('THIS_MONTH')}
          className="px-2.5 py-1 rounded hover:bg-background transition-colors font-medium text-foreground"
        >
          This Month
        </button>
        <button
          type="button"
          onClick={() => setPreset('THIS_FY')}
          className="px-2.5 py-1 rounded hover:bg-background transition-colors font-medium text-foreground"
        >
          This FY
        </button>
      </div>

      {/* Date Pickers */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground font-medium">From:</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onDateChange(e.target.value, endDate)}
          className="h-8 px-2.5 text-xs bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary font-mono"
        />
        <span className="text-muted-foreground font-medium">To:</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onDateChange(startDate, e.target.value)}
          className="h-8 px-2.5 text-xs bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary font-mono"
        />
      </div>

      {/* Search Input */}
      <div className="relative min-w-[200px] flex-1 max-w-xs">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter by party, bill no..."
          className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary"
        />
        <div className="absolute left-2.5 top-2 text-muted-foreground">🔍</div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            className="h-8 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-border"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
        )}
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            className="h-8 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-border"
          >
            <span>🖨️</span>
            <span>Print</span>
          </button>
        )}
        {isLoading && <span className="text-xs text-muted-foreground animate-pulse font-mono">Loading...</span>}
      </div>
    </div>
  )
}
