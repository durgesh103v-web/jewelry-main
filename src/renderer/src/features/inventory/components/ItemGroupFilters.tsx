import React from 'react'
import { SearchInput } from '@components/ui'

export interface ItemGroupFiltersProps {
  searchText: string
  setSearchText: (text: string) => void
  totalCount: number
  activeCount: number
  showingCount: number
}

export function ItemGroupFilters({
  searchText,
  setSearchText,
  totalCount,
  activeCount,
  showingCount
}: ItemGroupFiltersProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-background-muted p-2.5 rounded-md border border-border">
      <div className="w-80">
        <SearchInput
          value={searchText}
          onChange={setSearchText}
          onClear={() => setSearchText('')}
          placeholder="Search by group name or metal type..."
        />
      </div>

      <div className="flex items-center gap-3 text-xs text-foreground-muted select-none">
        <span>
          Total: <strong className="text-foreground font-semibold">{totalCount}</strong>
        </span>
        <span className="text-border">|</span>
        <span>
          Active: <strong className="text-success font-bold">{activeCount}</strong>
        </span>
        <span className="text-border">|</span>
        <span>
          Showing: <strong className="text-foreground font-semibold">{showingCount}</strong>
        </span>
      </div>
    </div>
  )
}
