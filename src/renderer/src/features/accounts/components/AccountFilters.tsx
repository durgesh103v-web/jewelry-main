import React from 'react'
import { ACCOUNT_TYPES } from './AccountForm'

export interface AccountFiltersProps {
  formOpen: boolean
  selectedAccountName: string | null
  accountTypeFilter: string
  setAccountTypeFilter: (type: string) => void
  searchText: string
  setSearchText: (text: string) => void
  totalCount: number
  activeCount: number
  showingCount: number
  onAddNew: () => void
  onEdit: () => void
  onPrint: () => void
  onDelete: () => void
  onClose: () => void
}

export function AccountFilters({
  formOpen,
  selectedAccountName,
  accountTypeFilter,
  setAccountTypeFilter,
  searchText,
  setSearchText,
  totalCount,
  activeCount,
  showingCount,
  onAddNew,
  onEdit,
  onPrint,
  onDelete
}: AccountFiltersProps): React.JSX.Element {
  return (
    <div className="px-6 pt-4 pb-2 shrink-0 space-y-3 no-print">
      {/* Action Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-amber-600 hover:bg-amber-700 !text-white text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-amber-500/20"
            style={{ color: '#ffffff' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="!text-white text-white font-semibold" style={{ color: '#ffffff' }}>Add New</span>
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>

          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white border border-slate-200 text-slate-600 text-xs font-medium hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            Delete
          </button>
        </div>

        <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 text-slate-500 select-none">
          Selected:{' '}
          <span className={`font-bold ${selectedAccountName ? 'text-amber-700' : 'text-slate-400'}`}>
            {selectedAccountName ?? 'None'}
          </span>
        </div>
      </div>

      {/* Search + Filter (table view only) */}
      {!formOpen && (
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <select
            value={accountTypeFilter}
            onChange={(e) => setAccountTypeFilter(e.target.value)}
            className="h-9 text-xs border border-slate-200 rounded-md px-3 bg-slate-50 hover:bg-white text-slate-700 cursor-pointer min-w-[160px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium transition-colors"
          >
            <option value="All">All Account Types</option>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by name, mobile, city, GST..."
              className="w-full h-9 pl-9 pr-8 text-xs border border-slate-200 rounded-md bg-slate-50 hover:bg-white focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-0.5 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500 select-none ml-auto whitespace-nowrap bg-slate-50 px-3 py-1.5 rounded border border-slate-100">
            <span>Total <strong className="text-slate-700">{totalCount}</strong></span>
            <div className="w-px h-3 bg-slate-300"></div>
            <span>Active <strong className="text-emerald-600">{activeCount}</strong></span>
            <div className="w-px h-3 bg-slate-300"></div>
            <span>Showing <strong className="text-amber-700">{showingCount}</strong></span>
          </div>
        </div>
      )}
    </div>
  )
}