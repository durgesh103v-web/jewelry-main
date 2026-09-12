import React, { useMemo } from 'react'
import { Select, SearchInput, SelectOption } from '@components/ui'
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
  showingCount: _showingCount,
  onAddNew,
  onPrint,
  onExportCsv,
  onClearFilters,
  hasActiveFilters
}: AccountFiltersProps): React.JSX.Element {
  const accountTypeOptions: SelectOption[] = useMemo(
    () => [
      { label: 'All Account Types', value: 'All' },
      ...ACCOUNT_TYPES.map((t) => ({ label: t, value: t }))
    ],
    []
  )

  const accountGroupOptions: SelectOption[] = useMemo(
    () => [
      { label: 'All Groups', value: 'All' },
      ...accountGroups.map((g) => ({
        label: `${g.groupName} (${g.groupType})`,
        value: g.id
      }))
    ],
    [accountGroups]
  )

  const statusOptions: SelectOption[] = useMemo(
    () => STATUS_FILTERS.map((s) => ({ label: s.label, value: s.value })),
    []
  )

  const balanceOptions: SelectOption[] = useMemo(
    () => BALANCE_FILTERS.map((b) => ({ label: b.label, value: b.value })),
    []
  )

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
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-200 hover:border-slate-400 hover:text-slate-900 transition-colors shadow-sm"
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
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 hover:border-emerald-400 hover:text-emerald-900 transition-colors shadow-sm"
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
          <div className="min-w-[155px]">
            <Select
              options={accountTypeOptions}
              value={accountTypeFilter}
              onChange={(e) => setAccountTypeFilter(e.target.value)}
              size="md"
              fullWidth={true}
            />
          </div>

          {/* Account Group Filter */}
          <div className="min-w-[155px]">
            <Select
              options={accountGroupOptions}
              value={accountGroupFilter}
              onChange={(e) => setAccountGroupFilter(e.target.value)}
              size="md"
              fullWidth={true}
            />
          </div>

          {/* Status Filter */}
          <div className="min-w-[125px]">
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="md"
              fullWidth={true}
            />
          </div>

          {/* Balance Filter */}
          <div className="min-w-[155px]">
            <Select
              options={balanceOptions}
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value)}
              size="md"
              fullWidth={true}
            />
          </div>

          {/* Search Input */}
          <div className="flex-1 min-w-[200px]">
            <SearchInput
              value={searchText}
              onChange={setSearchText}
              placeholder="Search by name, phone, city, GST, bank A/C..."
            />
          </div>

          {/* Clear Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="h-9 px-3 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
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
          <div className="flex items-center gap-2.5 text-[11px] text-slate-500 select-none ml-auto whitespace-nowrap bg-slate-50 px-3 py-1.5 rounded border border-slate-100 shrink-0">
            <span>
              Total <strong className="text-slate-700">{totalCount}</strong>
            </span>
            <div className="w-px h-3 bg-slate-300"></div>
            <span>
              Active <strong className="text-emerald-600">{activeCount}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}