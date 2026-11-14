'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Header } from '@/components/layout/Header'
import { adminApi } from '@/lib/api'
import { LicenseRecord } from '@/types'
import {
  Key,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Laptop
} from 'lucide-react'

export default function ProductKeysPage() {
  const [licenses, setLicenses] = useState<LicenseRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getLicenses({
        page,
        limit: 15,
        search: search.trim() || undefined
      })
      if (res.success) {
        setLicenses(res.licenses)
        setTotal(res.total)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page])

  return (
    <DashboardLayout>
      <Header title="Product Key Registry" />

      <main className="p-8 space-y-6 max-w-7xl">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setPage(1)
              loadData()
            }}
            className="flex-1 max-w-md relative"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product keys, shop name, or ID..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
            />
          </form>

          <Link
            href="/shops/create"
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
          >
            <Key className="w-4 h-4" />
            <span>Issue New Product Key</span>
          </Link>
        </div>

        {/* Keys Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Product Key (Masked)</th>
                  <th className="py-3.5 px-6">Showroom Node</th>
                  <th className="py-3.5 px-6">Edition</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Hardware Machine</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading product keys...
                    </td>
                  </tr>
                ) : licenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No matching keys found.
                    </td>
                  </tr>
                ) : (
                  licenses.map((lic) => (
                    <tr key={lic._id} className="hover:bg-slate-50/60">
                      <td className="py-4 px-6 font-mono font-bold text-sky-800">
                        {lic.productKeyMasked}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900 block">{lic.shopId?.shopName || 'Unassigned'}</span>
                        <span className="font-mono text-[11px] text-amber-600 font-semibold">{lic.shopId?.shopId || 'N/A'}</span>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-700">
                        {lic.edition}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {lic.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-700 text-[11px]">
                        {lic.boundMachineId ? lic.boundMachineId.slice(0, 16) + '...' : 'Unbound'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/licenses/${lic._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs"
                        >
                          <span>Manage</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}