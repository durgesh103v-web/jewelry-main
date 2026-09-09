import React from 'react'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
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
  selectedId?: string
  onSelect: (id: string) => void
  onDoubleClick?: (account: AccountRecord) => void
  onEdit?: (account: AccountRecord) => void
  onDelete?: (account: AccountRecord) => void
}

function renderAccountTypeBadge(type: string): React.JSX.Element {
  const normalized = (type || '').toLowerCase()

  if (normalized.includes('wholesale')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
        Wholesale Customer
      </span>
    )
  }

  if (normalized.includes('karagir') || normalized.includes('dhadi') || normalized.includes('artisan')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        Karagir / Artisan
      </span>
    )
  }

  if (normalized.includes('supplier') || normalized.includes('bullion')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
        Supplier / Bullion
      </span>
    )
  }

  if (normalized.includes('retail') || normalized.includes('customer')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        Retail Customer
      </span>
    )
  }

  if (normalized.includes('bank')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
        Bank Account
      </span>
    )
  }

  if (normalized.includes('expense')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
        Expense Account
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 whitespace-nowrap shadow-2xs">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
      {type || 'General'}
    </span>
  )
}

function renderBalance(amount: number, unit = '', isCurrency = false): React.JSX.Element {
  if (amount === 0 || isNaN(amount)) {
    return <span className="text-slate-300 font-mono text-xs">-</span>
  }

  const isDr = amount > 0 // Debit / Payable / देणे
  const absVal = Math.abs(amount)
  const formattedVal = isCurrency
    ? `₹${formatNumber(absVal, 2)}`
    : `${formatNumber(absVal, 3)} ${unit}`

  return (
    <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
      <span className="font-semibold text-slate-800 tabular-nums text-xs">{formattedVal}</span>
      <span
        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-wide uppercase shadow-2xs ${
          isDr
            ? 'bg-amber-100 text-amber-900 border-amber-300/90'
            : 'bg-emerald-100 text-emerald-900 border-emerald-300/90'
        }`}
        title={isDr ? 'Debit / Payable (देणे)' : 'Credit / Receivable (घेणे)'}
      >
        {isDr ? 'Dr' : 'Cr'}
      </span>
    </div>
  )
}

function renderStatusBadge(active: boolean): React.JSX.Element {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs whitespace-nowrap">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Active
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
      <span className="inline-block h-2 w-2 rounded-full bg-slate-400"></span>
      Inactive
    </span>
  )
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
  return (
    <div className="w-full h-full overflow-auto bg-white flex flex-col">
      {/* Print-only title */}
      <div className="hidden print:block p-4 border-b border-slate-300 text-center">
        <h2 className="text-xl font-bold text-slate-900">ACCOUNT MASTER DIRECTORY</h2>
        <p className="text-xs text-slate-600 mt-0.5">
          Generated on {new Date().toLocaleDateString()} · Total Records: {accounts.length}
        </p>
      </div>

      <table className="w-full text-xs text-left border-collapse print:text-[10px]">
        <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)] print:static">
          <tr>
            <th className="py-3 px-3 w-14 text-center text-[10px] font-bold text-slate-500">Sr No</th>
            <th className="py-3 px-4 min-w-[190px]">Account Name</th>
            <th className="py-3 px-3 min-w-[150px]">Type</th>
            <th className="py-3 px-3 min-w-[110px]">Group</th>
            <th className="py-3 px-3 text-right min-w-[130px]">Gold Fine</th>
            <th className="py-3 px-3 text-right min-w-[130px]">Silver Fine</th>
            <th className="py-3 px-3 text-right min-w-[130px]">Cash</th>
            <th className="py-3 px-3 text-right min-w-[90px]">Anamat</th>
            <th className="py-3 px-3 text-right min-w-[90px]">Bank Bal</th>
            <th className="py-3 px-3 text-center min-w-[90px]">As On</th>
            <th className="py-3 px-3 min-w-[130px]">Contact / Email</th>
            <th className="py-3 px-3 min-w-[110px]">Location</th>
            <th className="py-3 px-3 text-center w-28">Status</th>
            <th className="py-3 px-3 text-center w-24 no-print">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td colSpan={14} className="py-20 text-center text-slate-500">
                <div className="inline-flex flex-col items-center gap-3">
                  <span className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="font-medium text-sm">Loading accounts...</span>
                </div>
              </td>
            </tr>
          ) : accounts.length === 0 ? (
            <tr>
              <td colSpan={14} className="py-20 text-center text-slate-500">
                <div className="flex flex-col items-center gap-2">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-slate-300"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {searchText ? (
                    <p className="text-sm">
                      No accounts matching <span className="font-semibold text-slate-700">"{searchText}"</span>
                    </p>
                  ) : (
                    <p className="text-sm">
                      No accounts found. Click <span className="font-semibold text-amber-600">"Add New"</span> to create one.
                    </p>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            accounts.map((r, i) => {
              const isSelected = selectedId === r.id
              return (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r.id)}
                  onDoubleClick={() => onDoubleClick && onDoubleClick(r)}
                  className={`transition-colors cursor-pointer select-none group ${
                    isSelected
                      ? 'bg-amber-50/90 border-l-4 border-l-amber-500 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] relative'
                      : 'border-l-4 border-l-transparent hover:bg-slate-50/80'
                  }`}
                >
                  {/* Serial Number */}
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-block min-w-[22px] text-center font-semibold text-[11px] text-slate-500 bg-slate-100/80 px-1.5 py-0.5 rounded">
                      {i + 1}
                    </span>
                  </td>

                  {/* Account Name */}
                  <td className="py-2.5 px-4">
                    <div className={`font-semibold ${isSelected ? 'text-amber-950' : 'text-slate-900'}`}>
                      {r.accountName}
                    </div>
                    {r.otherName ? (
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{r.otherName}</div>
                    ) : r.bankAccountNumber ? (
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        A/C: {r.bankAccountNumber} ({r.bankIfsc || r.bankName})
                      </div>
                    ) : null}
                  </td>

                  {/* Account Type Badge */}
                  <td className="py-2.5 px-3">
                    {renderAccountTypeBadge(r.accountType)}
                  </td>

                  {/* Group */}
                  <td className="py-2.5 px-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 bg-slate-100/70 border border-slate-200/60 whitespace-nowrap">
                      {r.groupName || '-'}
                    </span>
                  </td>

                  {/* Opening Gold Fine */}
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {renderBalance(r.openingGoldFine, 'g')}
                  </td>

                  {/* Opening Silver Fine */}
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {renderBalance(r.openingSilverFine, 'g')}
                  </td>

                  {/* Opening Cash */}
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {renderBalance(r.openingCash, '', true)}
                  </td>

                  {/* Anamat */}
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {r.openingAnamat !== 0 ? (
                      <span className="font-semibold text-slate-700">₹{formatNumber(r.openingAnamat, 2)}</span>
                    ) : (
                      <span className="text-slate-300 font-mono">-</span>
                    )}
                  </td>

                  {/* Bank Balance */}
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {r.openingBank !== 0 ? (
                      <span className="font-semibold text-slate-700">₹{formatNumber(r.openingBank, 2)}</span>
                    ) : (
                      <span className="text-slate-300 font-mono">-</span>
                    )}
                  </td>

                  {/* As On Date */}
                  <td className="py-2.5 px-3 text-center text-slate-500 tabular-nums">
                    {r.lastDate ? formatDate(r.lastDate) : '-'}
                  </td>

                  {/* Contact / Email */}
                  <td className="py-2.5 px-3">
                    <div className="text-slate-800 font-medium tabular-nums">
                      {r.whatsappNumber || r.mobileNumber || '-'}
                    </div>
                    {r.email && <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{r.email}</div>}
                  </td>

                  {/* Location */}
                  <td className="py-2.5 px-3 text-slate-600 font-medium">
                    <div>{r.city || '-'}</div>
                    {r.pincode && <div className="text-[10px] text-slate-400">{r.pincode}</div>}
                  </td>

                  {/* Status Badge */}
                  <td className="py-2.5 px-3 text-center">
                    {renderStatusBadge(r.active)}
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-2 text-center no-print">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit?.(r)
                        }}
                        className="p-1.5 rounded-md text-slate-500 hover:text-amber-800 hover:bg-amber-100 transition-all shadow-none hover:shadow-sm"
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
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-700 hover:bg-rose-100 transition-all shadow-none hover:shadow-sm"
                        title="Delete Account"
                      >
                        <FiTrash2 size={16} className="stroke-[2.2]" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}