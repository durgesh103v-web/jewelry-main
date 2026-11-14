'use client'

import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Header } from '@/components/layout/Header'
import { adminApi } from '@/lib/api'
import { DashboardStats } from '@/types'
import {
  Store,
  CheckCircle,
  AlertTriangle,
  Archive,
  Key,
  ShieldCheck,
  Cpu,
  History,
  ArrowUpRight
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true)
        const res = await adminApi.getDashboardStats()
        if (res.success && res.stats) {
          setStats(res.stats)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  return (
    <DashboardLayout>
      <Header title="Executive Overview" />

      <main className="p-8 space-y-8 max-w-7xl">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Shops */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Showrooms
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '-' : stats?.shops.total ?? 0}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                <CheckCircle className="w-3 h-3" /> {stats?.shops.active ?? 0} Active
              </span>
              <span>•</span>
              <span className="text-amber-600 font-semibold">
                {stats?.shops.suspended ?? 0} Suspended
              </span>
            </div>
          </div>

          {/* Active Licenses */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active Licenses
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '-' : stats?.licenses.active ?? 0}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Out of {stats?.licenses.total ?? 0} total commercial licenses
            </div>
          </div>

          {/* Available Licenses */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Available Inventory
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Key className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '-' : stats?.licenses.available ?? 0}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Unclaimed Product Keys ready for deployment
            </div>
          </div>

          {/* Revoked / Suspended */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Revoked / Expired
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '-' : (stats?.licenses.revoked ?? 0) + (stats?.licenses.expired ?? 0)}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Terminated or non-renewed seats
            </div>
          </div>
        </div>

        {/* 2-Column Section: Recent Showrooms & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Showrooms */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Recently Registered Shops</h3>
                <p className="text-xs text-slate-500">Customer showrooms onboarded via Super Admin</p>
              </div>
              <Link
                href="/shops"
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading shops...</div>
            ) : !stats?.recentShops || stats.recentShops.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No shops registered yet. Click &quot;Shops&quot; to create your first client.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentShops.map((s) => (
                  <div
                    key={s._id}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{s.shopName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                          {s.shopId}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Owner: {s.ownerName} • {s.phone}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Audit Activities */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Administrative Audit Trail</h3>
                <p className="text-xs text-slate-500">Recent security and provisioning actions</p>
              </div>
              <Link
                href="/audit-logs"
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                <span>Full Audit Log</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading audit trail...</div>
            ) : !stats?.recentAuditLogs || stats.recentAuditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No activity logged yet.</div>
            ) : (
              <div className="space-y-3">
                {stats.recentAuditLogs.map((log) => (
                  <div
                    key={log._id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/40 flex items-start justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Target: {log.targetType} {log.targetId ? `(${log.targetId})` : ''} • By:{' '}
                        {log.adminUsername}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}
