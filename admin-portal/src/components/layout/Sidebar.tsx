'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard,
  Store,
  Users,
  Key,
  ShieldAlert,
  Cpu,
  RotateCcw,
  History,
  Settings,
  LogOut,
  Gem
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Shops', href: '/shops', icon: Store },
  { name: 'Owner Accounts', href: '/owners', icon: Users },
  { name: 'Product Keys', href: '/keys', icon: Key },
  { name: 'Licenses', href: '/licenses', icon: ShieldAlert },
  { name: 'Activations', href: '/activations', icon: Cpu },
  { name: 'Recovery Mgmt', href: '/recovery', icon: RotateCcw },
  { name: 'Audit Logs', href: '/audit-logs', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings }
]

export function Sidebar() {
  const pathname = usePathname()
  const { logout, admin } = useAuth()

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-200/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-[1px] shadow-sm flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center text-amber-600">
              <Gem className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-900 block">
              Jewellery ERP
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-600 block">
              Super Admin
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all',
                  isActive
                    ? 'bg-amber-50/80 text-amber-800 font-bold border border-amber-200/70 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-amber-600' : 'text-slate-400')} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Admin Profile Footer */}
      <div className="p-3 border-t border-slate-200/80 space-y-2">
        <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/60">
          <span className="text-[11px] font-bold text-slate-900 block truncate">
            {admin?.username || 'Super Admin'}
          </span>
          <span className="text-[10px] text-slate-500 block truncate">
            {admin?.email || 'admin@jewelleryerp.com'}
          </span>
        </div>

        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
