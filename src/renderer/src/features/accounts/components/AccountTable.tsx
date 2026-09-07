import React from 'react'
import { Badge } from '@components/ui'
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
  selectedId?: string
  onSelect: (id: string) => void
  onDoubleClick?: (account: AccountRecord) => void
}

export function AccountTable({
  accounts,
  loading,
  searchText,
  selectedId,
  onSelect,
  onDoubleClick
}: AccountTableProps): React.JSX.Element {
  return (
    <div className="w-full h-full overflow-auto bg-white flex flex-col">
      <table className="w-full text-xs text-left border-collapse">
        <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <tr>
            <th className="py-3 px-4 w-12 text-center text-[10px] text-slate-400">#</th>
            <th className="py-3 px-4 min-w-[200px]">Account Name</th>
            <th className="py-3 px-4 min-w-[130px]">Type</th>
            <th className="py-3 px-4 min-w-[130px]">Group</th>
            <th className="py-3 px-4 text-right min-w-[100px]">Gold Fine</th>
            <th className="py-3 px-4 text-right min-w-[100px]">Silver Fine</th>
            <th className="py-3 px-4 text-right min-w-[100px]">Cash</th>
            <th className="py-3 px-4 text-right min-w-[90px]">Anamat</th>
            <th className="py-3 px-4 text-right min-w-[90px]">Bank</th>
            <th className="py-3 px-4 text-center min-w-[100px]">Last Date</th>
            <th className="py-3 px-4 min-w-[130px]">Contact</th>
            <th className="py-3 px-4 min-w-[110px]">City</th>
            <th className="py-3 px-4 text-center w-24">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td colSpan={13} className="py-20 text-center text-slate-500">
                <div className="inline-flex flex-col items-center gap-3">
                  <span className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="font-medium text-sm">Loading accounts...</span>
                </div>
              </td>
            </tr>
          ) : accounts.length === 0 ? (
            <tr>
              <td colSpan={13} className="py-20 text-center text-slate-500">
                <div className="flex flex-col items-center gap-2">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-300">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {searchText ? (
                    <p className="text-sm">No accounts matching <span className="font-semibold text-slate-700">"{searchText}"</span></p>
                  ) : (
                    <p className="text-sm">No accounts found. Click <span className="font-semibold text-amber-600">"Add New"</span> to create one.</p>
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
                      ? 'bg-amber-50/80 border-l-4 border-l-amber-500 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] relative'
                      : 'border-l-4 border-l-transparent hover:bg-slate-50'
                  }`}
                >
                  <td className="py-2.5 px-4 text-center text-slate-400 text-[10px] tabular-nums">{i + 1}</td>
                  <td className="py-2.5 px-4">
                    <div className={`font-semibold ${isSelected ? 'text-amber-900' : 'text-slate-900'}`}>{r.accountName}</div>
                    {r.otherName && (
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{r.otherName}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      {r.accountType || '-'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-700">{r.groupName || '-'}</td>
                  
                  {/* Financial Columns - using tabular-nums for perfect decimal alignment */}
                  <td className="py-2.5 px-4 text-right tabular-nums">
                    {r.openingGoldFine !== 0 ? (
                      <span className={r.openingGoldFine < 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-semibold'}>
                        {formatNumber(r.openingGoldFine, 3)} g
                      </span>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums">
                    {r.openingSilverFine !== 0 ? (
                      <span className={r.openingSilverFine < 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-semibold'}>
                        {formatNumber(r.openingSilverFine, 3)} g
                      </span>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums">
                    {r.openingCash !== 0 ? (
                      <span className={r.openingCash < 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-semibold'}>
                        ₹{formatNumber(r.openingCash, 2)}
                      </span>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums">
                    {r.openingAnamat !== 0 ? (
                      <span className="font-semibold text-slate-700">₹{formatNumber(r.openingAnamat, 2)}</span>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums">
                    {r.openingBank !== 0 ? (
                      <span className="font-semibold text-slate-700">₹{formatNumber(r.openingBank, 2)}</span>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                  
                  <td className="py-2.5 px-4 text-center text-slate-500 tabular-nums">
                    {r.lastDate ? formatDate(r.lastDate) : '-'}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="text-slate-800 font-medium tabular-nums">{r.whatsappNumber || r.mobileNumber || '-'}</div>
                    {r.phone2 && <div className="text-[10px] text-slate-400 tabular-nums">Alt: {r.phone2}</div>}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 font-medium">{r.city || '-'}</td>
                  <td className="py-2.5 px-4 text-center">
                    <Badge variant={r.active ? 'success' : 'neutral'} size="small">
                      {r.active ? 'Active' : 'Inactive'}
                    </Badge>
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