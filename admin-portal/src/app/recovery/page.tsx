'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Header } from '@/components/layout/Header'
import { adminApi } from '@/lib/api'
import { OwnerAccountRecord } from '@/types'
import {
  RotateCcw,
  Search,
  Key,
  Lock,
  ShieldAlert,
  Users,
  ExternalLink,
  ChevronRight,
  AlertTriangle
} from 'lucide-react'

export default function RecoveryManagementPage() {
  const [search, setSearch] = useState('')
  const [owners, setOwners] = useState<OwnerAccountRecord[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    try {
      setLoading(true)
      const res = await adminApi.getOwners({
        search: search.trim() || undefined,
        limit: 10
      })
      if (res.success) {
        setOwners(res.owners)
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    handleSearch()
  }, [])

  return (
    <DashboardLayout>
      <Header title="Master Recovery &amp; Credential Rotation Hub" />

      <main className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Security Policy Advisory Banner */}
        <div className="p-6 bg-slate-900 rounded-2xl text-slate-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
            <RotateCcw className="w-5 h-5 text-amber-400" />
            Master Recovery &amp; Key Governance Policy
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
            The Master Recovery Key is strictly reserved for showroom owner account recovery. In accordance with zero-trust security principles, recovery keys and temporary passwords are saved only as cryptographic hashes (Argon2id and SHA-256). Rotations immediately invalidate old credentials and produce a single-use plaintext reveal.
          </p>
        </div>

        {/* Quick Search Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-4 h-4 text-amber-600" />
            Find Showroom for Password Reset or Key Rotation
          </h2>

          <form onSubmit={handleSearch} className="flex gap-3 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by shop name, shop ID, or username..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
              />
            </div>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Search
            </button>
          </form>

          {/* Search Results Table */}
          <div className="pt-2">
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-5">Showroom / Node ID</th>
                    <th className="py-3 px-5">Owner Username</th>
                    <th className="py-3 px-5">Shop Status</th>
                    <th className="py-3 px-5">Password State</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Searching...
                      </td>
                    </tr>
                  ) : owners.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No showroom accounts matching query.
                      </td>
                    </tr>
                  ) : (
                    owners.map((o) => (
                      <tr key={o._id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-5">
                          <span className="font-bold text-slate-900 block">{o.shopId?.shopName}</span>
                          <span className="font-mono text-[11px] text-amber-600 font-semibold">
                            {o.shopIdentifier}
                          </span>
                        </td>
                        <td className="py-3 px-5 font-mono font-bold text-slate-800">
                          {o.username}
                        </td>
                        <td className="py-3 px-5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              o.shopId?.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : o.shopId?.status === 'SUSPENDED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {o.shopId?.status || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          {o.isTemporaryPassword ? (
                            <span className="text-amber-700 font-semibold text-[11px]">
                              Temporary Required
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-semibold text-[11px]">
                              Permanent Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <Link
                            href={`/owners/${o._id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all"
                          >
                            <span>Manage Credentials</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}