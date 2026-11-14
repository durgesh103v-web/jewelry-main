'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Header } from '@/components/layout/Header'
import { adminApi } from '@/lib/api'
import { LicenseRecord } from '@/types'
import {
  Search,
  Filter,
  Key,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Store
} from 'lucide-react'

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<LicenseRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editionFilter, setEditionFilter] = useState('')
  const [bindingFilter, setBindingFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const loadLicenses = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getLicenses({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        edition: editionFilter || undefined,
        bindingStatus: bindingFilter || undefined
      })
      if (res.success) {
        setLicenses(res.licenses)
        setTotal(res.total)
      }
    } catch (err) {
      console.error('Failed to load licenses:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLicenses()
  }, [page, statusFilter, editionFilter, bindingFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadLicenses()
  }

  return (
    <DashboardLayout>
      <Header title="Product License &amp; Machine Binding Management" />

      <main className="p-8 space-y-6 max-w-7xl">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by shop name, node ID, masked key..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ACTIVE">Active (Bound)</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REVOKED">Revoked</option>
              <option value="EXPIRED">Expired</option>
            </select>

            {/* Edition Filter */}
            <select
              value={editionFilter}
              onChange={(e) => {
                setEditionFilter(e.target.value)
                setPage(1)
              }}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">All Editions</option>
              <option value="BASIC">Basic</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>

            {/* Binding Filter */}
            <select
              value={bindingFilter}
              onChange={(e) => {
                setBindingFilter(e.target.value)
                setPage(1)
              }}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">All Bindings</option>
              <option value="BOUND">Machine Bound</option>
              <option value="UNBOUND">Unbound / Available</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Product Key (Masked)</th>
                  <th className="py-3.5 px-6">Showroom / Node ID</th>
                  <th className="py-3.5 px-6">Edition</th>
                  <th className="py-3.5 px-6">License Status</th>
                  <th className="py-3.5 px-6">Machine Binding</th>
                  <th className="py-3.5 px-6">Validity Expiration</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading product licenses...
                    </td>
                  </tr>
                ) : licenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No matching product licenses found.
                    </td>
                  </tr>
                ) : (
                  licenses.map((lic) => {
                    const shop = lic.shopId
                    return (
                      <tr key={lic._id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Masked Key */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-sky-800 text-xs">
                            <Key className="w-3.5 h-3.5 text-sky-600" />
                            <span>{lic.productKeyMasked || '••••-••••-••••-••••'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Created: {new Date(lic.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        {/* Shop Info */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{shop?.shopName || lic.firmName || 'Unassigned'}</div>
                          <div className="text-[11px] font-mono text-amber-600 font-semibold mt-0.5">
                            {shop?.shopId || 'N/A'}
                          </div>
                          {shop?.ownerAccountId?.username && (
                            <div className="text-[10px] text-slate-400">
                              User: {shop.ownerAccountId.username}
                            </div>
                          )}
                        </td>

                        {/* Edition */}
                        <td className="py-4 px-6">
                          <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                            {lic.edition}
                          </span>
                        </td>

                        {/* License Status */}
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              lic.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : lic.status === 'AVAILABLE'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : lic.status === 'SUSPENDED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : lic.status === 'EXPIRED'
                                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                lic.status === 'ACTIVE'
                                  ? 'bg-emerald-500'
                                  : lic.status === 'AVAILABLE'
                                  ? 'bg-sky-500'
                                  : lic.status === 'SUSPENDED'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            {lic.status}
                          </span>
                        </td>

                        {/* Machine Binding */}
                        <td className="py-4 px-6">
                          {lic.boundMachineId ? (
                            <div>
                              <div className="flex items-center gap-1 text-slate-800 font-mono text-[11px] font-semibold">
                                <Laptop className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{lic.boundMachineId.slice(0, 16)}...</span>
                              </div>
                              <div className="text-[10px] text-emerald-600 font-medium">
                                Locked (1 of {lic.maxAllowedMachines || 1} PC)
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-400 font-medium text-[11px]">
                              Unbound (Ready for PC)
                            </div>
                          )}
                        </td>

                        {/* Expiration */}
                        <td className="py-4 px-6 text-slate-600">
                          {lic.expiresAt ? (
                            <span className="font-semibold text-slate-800">
                              {new Date(lic.expiresAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-semibold text-[11px]">
                              Perpetual Lifetime
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <Link
                            href={`/licenses/${lic._id}`}
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
              Showing {licenses.length} of {total} product licenses
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
                disabled={licenses.length < 15}
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