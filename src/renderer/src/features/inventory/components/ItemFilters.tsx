import React from 'react'
import { SearchInput } from '@components/ui'

export interface ItemFiltersProps {
  searchText: string
  setSearchText: (text: string) => void
  totalCount: number
  activeCount: number
  showingCount: number
}

export function ItemFilters({
  searchText,
  setSearchText,
  totalCount,
  activeCount,
  showingCount
}: ItemFiltersProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 my-3 bg-background-muted p-2.5 rounded-sm border border-border">
      <div className="w-72">
        <SearchInput
          value={searchText}
          onChange={setSearchText}
          onClear={() => setSearchText('')}
          placeholder="Search item, group, stamp, design, HSN"
        />
      </div>

      <div className="text-xs text-foreground-muted select-none">
        Total: <strong className="text-foreground">{totalCount}</strong> | Active:{' '}
        <strong className="text-success font-bold">{activeCount}</strong> | Showing:{' '}
        <strong className="text-foreground">{showingCount}</strong>
      </div>
    </div>
  )
}
