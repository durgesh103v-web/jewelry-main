import React from 'react'
import { ACCOUNT_TYPES, AccountGroupOption } from './AccountForm'

export const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active Only' },
  { value: 'INACTIVE', label: 'Inactive Only' }
]

export const BALANCE_FILTERS = [
  { value: 'ALL', label: 'All Balances' },
  { value: 'HAS_CASH', label: 'Has Cash Balance' },
  { value: 'HAS_GOLD', label: 'Has Gold Fine' },
  { value: 'HAS_SILVER', label: 'Has Silver Fine' },
  { value: 'ANY_OUTSTANDING', label: 'Any Outstanding (Dr/Cr)' }
]

export interface AccountFiltersProps {
  formOpen: boolean
  selectedAccountName: string | null
  accountTypeFilter: string
  setAccountTypeFilter: (type: string) => void
  accountGroupFilter: string
  setAccountGroupFilter: (groupId: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  balanceFilter: string
  setBalanceFilter: (balance: string) => void
  accountGroups: AccountGroupOption[]
  searchText: string
  setSearchText: (text: string) => void
  totalCount: number
  activeCount: number
  showingCount: number
  onAddNew: () => void
  onPrint: () => void
  onExportCsv: () => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function AccountFilters({
  formOpen,
  selectedAccountName,
  accountTypeFilter,
  setAccountTypeFilter,
  accountGroupFilter,
  setAccountGroupFilter,
  statusFilter,
  setStatusFilter,
  balanceFilter,
  setBalanceFilter,
  accountGroups,
  searchText,
  setSearchText,
  totalCount,
  activeCount,
  showingCount,
  onAddNew,
  onPrint,
  onExportCsv,
  onClearFilters,
  hasActiveFilters
}: AccountFiltersProps): React.JSX.Element {
  return (
    <div className="px-6 pt-4 pb-2 shrink-0 space-y-3 no-print">
      {/* Action Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-amber-600 hover:bg-amber-700 !text-white text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-amber-500/20"
            style={{ color: '#ffffff' }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="!text-white text-white font-semibold" style={{ color: '#ffffff' }}>
              Add New
            </span>
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-colors shadow-sm"
            title="Export filtered accounts to CSV"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        </div>

        <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 text-slate-500 select-none">
          Selected:{' '}
          <span className={`font-bold ${selectedAccountName ? 'text-amber-700' : 'text-slate-400'}`}>
            {selectedAccountName ?? 'None'}
          </span>
        </div>
      </div>

      {/* Search + Filter Bar (table view only) */}
      {!formOpen && (
        <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex-wrap">
          {/* Account Type Filter */}
          <select
            value={accountTypeFilter}
            onChange={(e) => setAccountTypeFilter(e.target.value)}
            className="h-9 text-xs border border-slate-200 rounded-md px-2.5 bg-slate-50 hover:bg-white text-slate-700 cursor-pointer min-w-[145px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium transition-colors"
          >
            <option value="All">All Account Types</option>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Account Group Filter */}
          <select
            value={accountGroupFilter}
            onChange={(e) => setAccountGroupFilter(e.target.value)}
            className="h-9 text-xs border border-slate-200 rounded-md px-2.5 bg-slate-50 hover:bg-white text-slate-700 cursor-pointer min-w-[140px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium transition-colors"
          >
            <option value="All">All Groups</option>
            {accountGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.groupName} ({g.groupType})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-xs border border-slate-200 rounded-md px-2.5 bg-slate-50 hover:bg-white text-slate-700 cursor-pointer min-w-[110px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium transition-colors"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Balance Filter */}
          <select
            value={balanceFilter}
            onChange={(e) => setBalanceFilter(e.target.value)}
            className="h-9 text-xs border border-slate-200 rounded-md px-2.5 bg-slate-50 hover:bg-white text-slate-700 cursor-pointer min-w-[135px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium transition-colors"
          >
            {BALANCE_FILTERS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by name, phone, city, GST, bank A/C..."
              className="w-full h-9 pl-9 pr-8 text-xs border border-slate-200 rounded-md bg-slate-50 hover:bg-white focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-0.5 transition-colors"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Clear Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="h-9 px-3 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Reset all search filters"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Reset
            </button>
          )}

          {/* Count Badges */}
          <div className="flex items-center gap-2.5 text-[11px] text-slate-500 select-none ml-auto whitespace-nowrap bg-slate-50 px-3 py-1.5 rounded border border-slate-100">
            <span>
              Total <strong className="text-slate-700">{totalCount}</strong>
            </span>
            <div className="w-px h-3 bg-slate-300"></div>
            <span>
              Active <strong className="text-emerald-600">{activeCount}</strong>
            </span>
            <div className="w-px h-3 bg-slate-300"></div>
            <span>
              Showing <strong className="text-amber-700">{showingCount}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}