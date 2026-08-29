import React from 'react'
import { DataTable, Column, Badge, Button } from '@components/ui'

export interface ItemGroupRecord {
  id: string
  groupName: string
  metalType: string
  description: string
  active: boolean
}

export interface ItemGroupTableProps {
  groups: ItemGroupRecord[]
  loading: boolean
  searchText: string
  onEdit: (group: ItemGroupRecord) => void
  onDelete: (group: ItemGroupRecord) => void
}

export function ItemGroupTable({
  groups,
  loading,
  searchText,
  onEdit,
  onDelete
}: ItemGroupTableProps): React.JSX.Element {
  const columns: Column<ItemGroupRecord>[] = [
    { key: 'sr', header: 'Sr No', render: (_, i) => i + 1, width: '60px' },
    {
      key: 'groupName',
      header: 'Group Name',
      render: (r) => <strong className="font-semibold text-foreground">{r.groupName}</strong>
    },
    { key: 'metalType', header: 'Metal Type', render: (r) => r.metalType },
    { key: 'description', header: 'Description', render: (r) => r.description || '-' },
    {
      key: 'active',
      header: 'Status',
      render: (r) => (
        <Badge variant={r.active ? 'success' : 'neutral'} size="small">
          {r.active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'action',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="small" variant="ghost" onClick={() => onEdit(r)}>
            Edit
          </Button>
          <Button size="small" variant="danger" onClick={() => onDelete(r)}>
            Delete
          </Button>
        </div>
      )
    }
  ]

  return (
    <DataTable
      columns={columns}
      data={groups}
      keyExtractor={(r) => r.id}
      loading={loading}
      emptyMessage={searchText ? 'No matching item group found.' : 'No item group added yet.'}
      onRowClick={(r) => onEdit(r)}
    />
  )
}
