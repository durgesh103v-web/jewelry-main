import React from 'react'
import { DataTable, Column, Badge } from '@components/ui'
import { formatDate, formatNumber } from '@utils/formatters'

export interface AccountRecord {
  id: string
  accountName: string
  otherName: string
  accountType: string
  accountGroupId: string
  groupName: string
  groupType: string
  openingGoldFine: number
  openingSilverFine: number
  openingCash: number
  openingAnamat: number
  openingBank: number
  lastDate: string
  goldFineLimit: number
  silverFineLimit: number
  mobileNumber: string
  whatsappNumber: string
  phone2: string
  address: string
  city: string
  state: string
  gstNo: string
  panNo: string
  notification: string
  active: boolean
}

export interface AccountTableProps {
  accounts: AccountRecord[]
  loading: boolean
  searchText: string
  onSelect: (id: string) => void
}

export function AccountTable({
  accounts,
  loading,
  searchText,
  onSelect
}: AccountTableProps): React.JSX.Element {
  const columns: Column<AccountRecord>[] = [
    { key: 'sr', header: 'Sr', render: (_, i) => i + 1, width: '45px' },
    {
      key: 'accountName',
      header: 'Name',
      render: (r) => (
        <div>
          <strong className="font-semibold text-foreground">{r.accountName}</strong>
          {r.otherName && <div className="text-[11px] text-foreground-muted">{r.otherName}</div>}
        </div>
      )
    },
    { key: 'accountType', header: 'Type', render: (r) => r.accountType || '-' },
    { key: 'groupName', header: 'Group', render: (r) => r.groupName || '-' },
    {
      key: 'openingGoldFine',
      header: 'Gold Fine',
      align: 'right',
      render: (r) => formatNumber(r.openingGoldFine, 3)
    },
    {
      key: 'openingSilverFine',
      header: 'Silver Fine',
      align: 'right',
      render: (r) => formatNumber(r.openingSilverFine, 3)
    },
    {
      key: 'openingCash',
      header: 'Cash',
      align: 'right',
      render: (r) => formatNumber(r.openingCash, 2)
    },
    {
      key: 'openingAnamat',
      header: 'Anamat',
      align: 'right',
      render: (r) => formatNumber(r.openingAnamat, 2)
    },
    {
      key: 'openingBank',
      header: 'Bank',
      align: 'right',
      render: (r) => formatNumber(r.openingBank, 2)
    },
    { key: 'lastDate', header: 'Last Date', render: (r) => formatDate(r.lastDate) },
    {
      key: 'contact',
      header: 'Mobile',
      render: (r) => (
        <div>
          <div>{r.whatsappNumber || r.mobileNumber || '-'}</div>
          {r.phone2 && <div className="text-[11px] text-foreground-muted">P2: {r.phone2}</div>}
        </div>
      )
    },
    { key: 'city', header: 'City', render: (r) => r.city || '-' },
    {
      key: 'active',
      header: 'Active',
      render: (r) => (
        <Badge variant={r.active ? 'success' : 'neutral'} size="small">
          {r.active ? 'Yes' : 'No'}
        </Badge>
      )
    }
  ]

  return (
    <DataTable
      columns={columns}
      data={accounts}
      keyExtractor={(r) => r.id}
      loading={loading}
      emptyMessage={searchText ? 'No matching account found.' : 'No account added yet.'}
      onRowClick={(r) => {
        onSelect(r.id)
      }}
    />
  )
}
