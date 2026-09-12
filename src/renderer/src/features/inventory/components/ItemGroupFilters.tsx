import React from 'react'
import { Select, SearchInput } from '@components/ui'

export const ITEM_GROUP_STATUS_FILTERS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active Only' },
  { value: 'INACTIVE', label: 'Inactive Only' }
]

export const ITEM_GROUP_METAL_FILTERS = [
  { value: 'ALL', label: 'All Metals' },
  { value: 'Gold', label: 'Gold' },
  { value: 'Silver', label: 'Silver' },
  { value: 'Platinum', label: 'Platinum' },
  { value: 'Diamond', label: 'Diamond' },
  { value: 'Other', label: 'Other' }
]

export interface ItemGroupFiltersProps {
  formOpen: boolean
  selectedGroupName: string | null
  metalTypeFilter: string
  setMetalTypeFilter: (metal: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
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

export function ItemGroupFilters({
  formOpen,
  selectedGroupName,
  metalTypeFilter,
  setMetalTypeFilter,
  statusFilter,
  setStatusFilter,
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
}: ItemGroupFiltersProps): React.JSX.Element {
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
              Add New Group
            </span>
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-200 hover:border-slate-400 hover:text-slate-900 transition-colors shadow-sm"
            title="Print Item Groups list"
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
            title="Export filtered groups to CSV"
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

        {/* Selected group pill */}
        <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 text-slate-500 select-none">
          Selected:{' '}
          <span className={`font-bold ${selectedGroupName ? 'text-amber-700' : 'text-slate-400'}`}>
            {selectedGroupName || 'None'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {!formOpen && (
        <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex-wrap">
          <div className="w-40">
            <Select
              value={metalTypeFilter}
              onChange={(e) => setMetalTypeFilter(e.target.value)}
              options={ITEM_GROUP_METAL_FILTERS}
            />
          </div>

          <div className="w-36">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={ITEM_GROUP_STATUS_FILTERS}
            />
          </div>

          <div className="flex-1 min-w-[220px]">
            <SearchInput
              value={searchText}
              onChange={setSearchText}
              placeholder="Search by group name, code, metal, HSN..."
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md font-medium transition-colors cursor-pointer"
              title="Clear all filters"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Reset
            </button>
          )}

          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium ml-auto pr-1 select-none">
            <span>
              Total <strong className="text-slate-700 font-bold">{totalCount}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Active <strong className="text-emerald-700 font-bold">{activeCount}</strong>
            </span>
            {showingCount !== totalCount && (
              <>
                <span className="text-slate-300">|</span>
                <span>
                  Showing <strong className="text-amber-700 font-bold">{showingCount}</strong>
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
