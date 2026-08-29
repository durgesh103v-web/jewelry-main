import React from 'react'
import { Button, SearchInput, Select } from '@components/ui'
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
  onDelete,
  onClose
}: AccountFiltersProps): React.JSX.Element {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-background-muted p-2.5 rounded-sm border border-border no-print">
        <div className="flex items-center gap-2">
          <Button variant="success" size="small" onClick={onAddNew}>
            Add New
          </Button>
          <Button variant="secondary" size="small" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="outline" size="small" onClick={onPrint}>
            Print
          </Button>
          <Button variant="danger" size="small" onClick={onDelete}>
            Delete
          </Button>
          <Button variant="ghost" size="small" onClick={onClose}>
            Exit
          </Button>
        </div>

        <div className="text-xs text-foreground-muted select-none">
          Selected: <strong className="text-foreground">{selectedAccountName || 'None'}</strong>
        </div>
      </div>

      {!formOpen && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 bg-background-muted p-2.5 rounded-sm border border-border no-print">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="w-56">
                <Select
                  value={accountTypeFilter}
                  onChange={(e) => setAccountTypeFilter(e.target.value)}
                  options={[
                    { label: 'All Types', value: 'All' },
                    ...ACCOUNT_TYPES.map((t) => ({ label: t, value: t }))
                  ]}
                />
              </div>

              <div className="w-72">
                <SearchInput
                  value={searchText}
                  onChange={setSearchText}
                  onClear={() => setSearchText('')}
                  placeholder="Search account, mobile, type, city, GST, PAN"
                />
              </div>
            </div>

            <div className="text-xs text-foreground-muted select-none">
              Total: <strong className="text-foreground">{totalCount}</strong> | Active:{' '}
              <strong className="text-success font-bold">{activeCount}</strong> | Showing:{' '}
              <strong className="text-foreground">{showingCount}</strong>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
