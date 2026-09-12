import React from 'react'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { DataTable, Column } from '@components/ui'
import { formatNumber, formatDate } from '../../../utils/formatters'

export interface AccountRecord {
  id: string
  accountName: string
  otherName: string
  accountType: string
  accountGroupId: string
  groupName: string
  openingGoldFine: number
  openingSilverFine: number
  openingCash: number
  openingAnamat: number
  openingBank: number
  lastDate: string
  goldFineLimit: number
  silverFineLimit: number
  creditLimit: number
  mobileNumber: string
  whatsappNumber: string
  phone2: string
  email: string
  address: string
  city: string
  state: string
  pincode: string
  bankName: string
  bankAccountNumber: string
  bankIfsc: string
  bankBranch: string
  gstNo: string
  panNo: string
  notification: string
  active: boolean
}

export interface AccountTableProps {
  accounts: AccountRecord[]
  loading: boolean
  searchText: string
  selectedId?: string | null
  onSelect: (id: string) => void
  onDoubleClick?: (account: AccountRecord) => void
  onEdit?: (account: AccountRecord) => void
  onDelete?: (account: AccountRecord) => void
}

function renderAccountTypeBadge(accountType: string): React.JSX.Element {
  const norm = (accountType || '').toLowerCase()

  if (norm.includes('wholesale')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">

        Customer
      </span>
    )
  }

  if (norm.includes('supplier') || norm.includes('karagir')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200">

        Supplier
      </span>
    )
  }

  if (norm.includes('bank')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">

        Bank
      </span>
    )
  }

  if (norm.includes('expense') || norm.includes('other')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">

        Expense
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">

      Retail
    </span>
  )
}

function renderBalance(val: number, unit = '', isCash = false): React.JSX.Element {
  if (val === 0) {
    return <span className="text-slate-300 font-mono">-</span>
  }

  const isDr = val > 0
  const absVal = Math.abs(val)
  const formatted = isCash ? `₹${formatNumber(absVal, 2)}` : `${formatNumber(absVal, 3)}${unit}`

  return (
    <div className="flex items-center justify-end gap-1 font-semibold">
      <span className={isDr ? 'text-amber-800' : 'text-emerald-700'}>{formatted}</span>
      <span
        className={`text-[9px] font-bold px-1 rounded uppercase tracking-tighter ${isDr ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
          }`}
      >
        {isDr ? 'Dr' : 'Cr'}
      </span>
    </div>
  )
}

function renderStatus(active: boolean): React.JSX.Element {
  if (active) {
    return <span className="text-emerald-600 font-bold text-xs whitespace-nowrap">Active</span>
  }

  return <span className="text-slate-400 font-medium text-xs whitespace-nowrap">Inactive</span>
}

export function AccountTable({
  accounts,
  loading,
  searchText,
  selectedId,
  onSelect,
  onDoubleClick,
  onEdit,
  onDelete
}: AccountTableProps): React.JSX.Element {
  const columns: Column<AccountRecord>[] = [
    {
      key: 'sr',
      header: 'Sr No',
      align: 'center',
      width: '68px',
      minWidth: '68px',
      render: (_, i) => (
        <span className="inline-block min-w-[22px] text-center font-semibold text-[11px] text-slate-500 bg-slate-100/80 px-1.5 py-0.5 rounded">
          {i + 1}
        </span>
      )
    },
    {
      key: 'accountName',
      header: 'Account Name',
      minWidth: '190px',
      render: (r) => (
        <div>
          <div className="font-semibold text-slate-900">{r.accountName}</div>
          {r.otherName ? (
            <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{r.otherName}</div>
          ) : r.bankAccountNumber ? (
            <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
              A/C: {r.bankAccountNumber} ({r.bankIfsc || r.bankName})
            </div>
          ) : null}
        </div>
      )
    },
    {
      key: 'accountType',
      header: 'Type',
      minWidth: '130px',
      render: (r) => renderAccountTypeBadge(r.accountType)
    },
    {
      key: 'groupName',
      header: 'Group',
      minWidth: '110px',
      render: (r) => (
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 bg-slate-100/70 border border-slate-200/60 whitespace-nowrap">
          {r.groupName || '-'}
        </span>
      )
    },
    {
      key: 'openingGoldFine',
      header: 'Gold Fine',
      align: 'right',
      minWidth: '120px',
      render: (r) => renderBalance(r.openingGoldFine, 'g')
    },
    {
      key: 'openingSilverFine',
      header: 'Silver Fine',
      align: 'right',
      minWidth: '120px',
      render: (r) => renderBalance(r.openingSilverFine, 'g')
    },
    {
      key: 'openingCash',
      header: 'Cash',
      align: 'right',
      minWidth: '120px',
      render: (r) => renderBalance(r.openingCash, '', true)
    },
    {
      key: 'openingAnamat',
      header: 'Anamat',
      align: 'right',
      minWidth: '90px',
      render: (r) =>
        r.openingAnamat !== 0 ? (
          <span className="font-semibold text-slate-700">₹{formatNumber(r.openingAnamat, 2)}</span>
        ) : (
          <span className="text-slate-300 font-mono">-</span>
        )
    },
    {
      key: 'openingBank',
      header: 'Bank Bal',
      align: 'right',
      minWidth: '90px',
      render: (r) =>
        r.openingBank !== 0 ? (
          <span className="font-semibold text-slate-700">₹{formatNumber(r.openingBank, 2)}</span>
        ) : (
          <span className="text-slate-300 font-mono">-</span>
        )
    },
    {
      key: 'lastDate',
      header: 'As On',
      align: 'center',
      minWidth: '90px',
      render: (r) => (
        <span className="text-slate-500 tabular-nums">{r.lastDate ? formatDate(r.lastDate) : '-'}</span>
      )
    },
    {
      key: 'contact',
      header: 'Contact / Email',
      minWidth: '130px',
      render: (r) => (
        <div>
          <div className="text-slate-800 font-medium tabular-nums">
            {r.whatsappNumber || r.mobileNumber || '-'}
          </div>
          {r.email && <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{r.email}</div>}
        </div>
      )
    },
    {
      key: 'location',
      header: 'Location',
      minWidth: '110px',
      render: (r) => (
        <div className="text-slate-600 font-medium">
          <div>{r.city || '-'}</div>
          {r.pincode && <div className="text-[10px] text-slate-400">{r.pincode}</div>}
        </div>
      )
    },
    {
      key: 'active',
      header: 'Status',
      align: 'center',
      width: '100px',
      render: (r) => renderStatus(r.active)
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      width: '90px',
      headerClassName: 'no-print',
      className: 'no-print',
      render: (r) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.(r)
            }}
            className="p-1.5 rounded-md text-amber-600 hover:text-amber-900 hover:bg-amber-100 transition-all"
            title="Edit Account Master"
          >
            <FiEdit2 size={16} className="stroke-[2.2]" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.(r)
            }}
            className="p-1.5 rounded-md text-rose-500 hover:text-rose-800 hover:bg-rose-100 transition-all"
            title="Delete Account"
          >
            <FiTrash2 size={16} className="stroke-[2.2]" />
          </button>
        </div>
      )
    }
  ]

  return (
    <DataTable
      columns={columns}
      data={accounts}
      keyExtractor={(r) => r.id}
      loading={loading}
      loadingMessage="Loading accounts..."
      searchText={searchText}
      emptyTitle="No accounts found."
      emptyActionText="Add New"
      selectedId={selectedId}
      onSelect={(id) => onSelect(String(id))}
      onDoubleClick={(r) => onDoubleClick?.(r)}
      printTitle="ACCOUNT MASTER DIRECTORY"
    />
  )
}