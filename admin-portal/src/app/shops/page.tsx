'use client'

import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Header } from '@/components/layout/Header'
import { adminApi } from '@/lib/api'
import { ShopRecord } from '@/types'
import { Search, Plus, Filter, Store, CheckCircle, AlertTriangle, Cpu } from 'lucide-react'
import Link from 'next/link'

export default function ShopsPage() {
  const [shops, setShops] = useState<ShopRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const loadShops = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getShops({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter || undefined
      })
      if (res.success) {
        setShops(res.shops)
        setTotal(res.total)
      }
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShops()
  }, [page, statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadShops()
  }

  return (
    <DashboardLayout>
      <Header title="Showroom Management" />

      <main className="p-8 space-y-6 max-w-7xl">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by shop name, ID, owner, phone..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
            />
          </form>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            <Link
              href="/shops/create"
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Shop</span>
            </Link>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Shop Details</th>
                  <th className="py-3.5 px-6">Owner Account</th>
                  <th className="py-3.5 px-6">License &amp; Device</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Loading showrooms...
                    </td>
                  </tr>
                ) : shops.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No matching shops found.
                    </td>
                  </tr>
                ) : (
                  shops.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900 block">{s.shopName}</span>
                        <div className="flex items-center gap-2 mt-0.5 text-slate-500 text-[11px]">
                          <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-semibold">
                            {s.shopId}
                          </span>
                          <span>•</span>
                          <span>{s.businessType}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-800 block">{s.ownerName}</span>
                        <span className="text-slate-500 text-[11px] block">
                          User: {s.ownerAccountId?.username || '-'} • {s.phone}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-mono text-slate-700 text-[11px] block font-semibold">
                          {s.licenseId?.productKeyMasked || 'No License Assigned'}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Cpu className="w-3 h-3 text-slate-400" />
                          {s.licenseId?.boundMachineId ? 'Hardware Bound' : 'Unbound / Available'}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            s.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : s.status === 'SUSPENDED'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {s.status === 'ACTIVE' && <CheckCircle className="w-2.5 h-2.5" />}
                          {s.status === 'SUSPENDED' && <AlertTriangle className="w-2.5 h-2.5" />}
                          <span>{s.status}</span>
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <span className="text-slate-400 font-mono text-[11px]">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Showrooms: {total}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-50 font-semibold"
              >
                Previous
              </button>
              <span className="font-semibold text-slate-700">Page {page}</span>
              <button
                disabled={shops.length < 15}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-50 font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}
