import React from 'react'
import { DataTable, Column, Badge, Button } from '@components/ui'

export interface ItemRecord {
  id: string
  itemName: string
  metalType: string
  itemGroupId: string
  groupName: string
  defaultStampId: string
  stampName: string
  defaultDesignId: string
  designName: string
  barcodeItem: boolean
  barcodeType: string
  labourChargesBy: string
  salePurchaseBy: string
  gstHsnCode: string
  fixedWeightPerPcs: number
  defaultTanch: number
  defaultWastage: number
  defaultLabourRate: number
  labourRateType: string
  active: boolean
}

function formatOptionalNumber(value: number): string {
  return value === 0 ? '' : String(value)
}

function calculateHishob(tunch: number, wastage: number): number {
  return Number((tunch + wastage).toFixed(3))
}

export interface ItemTableProps {
  items: ItemRecord[]
  loading: boolean
  searchText: string
  onEdit: (item: ItemRecord) => void
  onDelete: (item: ItemRecord) => void
}

export function ItemTable({
  items,
  loading,
  searchText,
  onEdit,
  onDelete
}: ItemTableProps): React.JSX.Element {
  const columns: Column<ItemRecord>[] = [
    { key: 'sr', header: 'Sr', render: (_, i) => i + 1, width: '45px' },
    { key: 'itemName', header: 'Item Name', render: (r) => r.itemName },
    { key: 'metalType', header: 'Metal', render: (r) => r.metalType },
    { key: 'groupName', header: 'Group', render: (r) => r.groupName },
    { key: 'stampName', header: 'Stamp', render: (r) => r.stampName || '-' },
    { key: 'designName', header: 'Design', render: (r) => r.designName || '-' },
    {
      key: 'fixedWeightPerPcs',
      header: 'Pack Wt.',
      align: 'right',
      render: (r) => formatOptionalNumber(r.fixedWeightPerPcs)
    },
    {
      key: 'defaultTanch',
      header: 'Tunch',
      align: 'right',
      render: (r) => formatOptionalNumber(r.defaultTanch)
    },
    {
      key: 'defaultWastage',
      header: 'Wstg',
      align: 'right',
      render: (r) => formatOptionalNumber(r.defaultWastage)
    },
    {
      key: 'hishob',
      header: 'Hishob',
      align: 'right',
      render: (r) => formatOptionalNumber(calculateHishob(r.defaultTanch, r.defaultWastage))
    },
    {
      key: 'defaultLabourRate',
      header: 'Lab Rate',
      align: 'right',
      render: (r) => formatOptionalNumber(r.defaultLabourRate)
    },
    { key: 'labourRateType', header: 'Lab Type', render: (r) => r.labourRateType },
    {
      key: 'barcodeItem',
      header: 'Barcode',
      render: (r) => (r.barcodeItem ? 'Yes' : 'No')
    },
    { key: 'gstHsnCode', header: 'HSN', render: (r) => r.gstHsnCode || '-' },
    {
      key: 'active',
      header: 'Active',
      render: (r) => (
        <Badge variant={r.active ? 'success' : 'neutral'} size="small">
          {r.active ? 'Yes' : 'No'}
        </Badge>
      )
    },
    {
      key: 'action',
      header: 'Action',
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
      data={items}
      keyExtractor={(r) => r.id}
      loading={loading}
      emptyMessage={searchText ? 'No matching item found.' : 'No item added yet.'}
      onRowClick={(r) => onEdit(r)}
    />
  )
}
