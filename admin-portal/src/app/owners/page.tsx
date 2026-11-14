'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Header } from '@/components/layout/Header'
import { adminApi } from '@/lib/api'
import { OwnerAccountRecord } from '@/types'
import {
  Search,
  Filter,
  Users,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Clock,
  Key,
  ExternalLink,
  Store,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Lock
} from 'lucide-react'

export default function OwnersPage() {
  const [owners, setOwners] = useState<OwnerAccountRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [provisioningFilter, setProvisioningFilter] = useState('')
  const [accountStatusFilter, setAccountStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const loadOwners = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getOwners({
        page,
        limit: 15,
        search: search.trim() || undefined,
        provisioningStatus: provisioningFilter || undefined,
        accountStatus: accountStatusFilter || undefined
      })
      if (res.success) {
        setOwners(res.owners)
        setTotal(res.total)
      }
    } catch (err) {
      console.error('Failed to load owner accounts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOwners()
  }, [page, provisioningFilter, accountStatusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadOwners()
  }

  return (
    <DashboardLayout>
      <Header title="Owner Accounts &amp; Credential Management" />

      <main className="p-8 space-y-6 max-w-7xl">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by shop name, shop ID, username..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3">
            {/* Provisioning Status Filter */}
            <select
              value={provisioningFilter}
              onChange={(e) => {
                setProvisioningFilter(e.target.value)
                setPage(1)
              }}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">All Provisioning</option>
              <option value="PROVISIONED">Provisioned (Activated)</option>
              <option value="PENDING">Pending Setup</option>
            </select>

            {/* Account Status Filter */}
            <select
              value={accountStatusFilter}
              onChange={(e) => {
                setAccountStatusFilter(e.target.value)
                setPage(1)
              }}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">All Shop Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Shop &amp; Node ID</th>
                  <th className="py-3.5 px-6">Owner Username</th>
                  <th className="py-3.5 px-6">Account Status</th>
                  <th className="py-3.5 px-6">Provisioning Status</th>
                  <th className="py-3.5 px-6">Password State</th>
                  <th className="py-3.5 px-6">Registered On</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading owner accounts...
                    </td>
                  </tr>
                ) : owners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No matching owner accounts found.
                    </td>
                  </tr>
                ) : (
                  owners.map((o) => {
                    const shop = o.shopId
                    return (
                      <tr key={o._id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Shop Info */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{shop?.shopName || 'Unknown Shop'}</div>
                          <div className="text-[11px] font-mono text-amber-600 font-semibold mt-0.5">
                            {o.shopIdentifier || shop?.shopId || 'N/A'}
                          </div>
                          <div className="text-[10px] text-slate-400">{shop?.ownerName}</div>
                        </td>

                        {/* Owner Username */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{o.username}</span>
                          </div>
                        </td>

                        {/* Account Status */}
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              shop?.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : shop?.status === 'SUSPENDED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                shop?.status === 'ACTIVE'
                                  ? 'bg-emerald-500'
                                  : shop?.status === 'SUSPENDED'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            {shop?.status || 'UNKNOWN'}
                          </span>
                        </td>

                        {/* Provisioning Status */}
                        <td className="py-4 px-6">
                          {o.isProvisioned ? (
                            <div className="flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Provisioned</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-700 font-semibold text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              <span>Pending Terminal Setup</span>
                            </div>
                          )}
                          {o.provisionedAt && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(o.provisionedAt).toLocaleDateString()}
                            </div>
                          )}
                        </td>

                        {/* Password State */}
                        <td className="py-4 px-6">
                          {o.isTemporaryPassword ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                              <Lock className="w-3 h-3 text-amber-600" />
                              Temporary (Must Change)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Permanent
                            </span>
                          )}
                        </td>

                        {/* Created Date */}
                        <td className="py-4 px-6 text-slate-500">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <Link
                            href={`/owners/${o._id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
                          >
                            <span>Manage</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {owners.length} of {total} owner accounts
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold px-2">Page {page}</span>
              <button
                disabled={owners.length < 15}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}