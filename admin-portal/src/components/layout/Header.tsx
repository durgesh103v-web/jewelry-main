'use client'

import React from 'react'
import { useAuth } from '@/lib/auth'
import { ShieldCheck } from 'lucide-react'

export function Header({ title }: { title: string }) {
  const { admin } = useAuth()

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Central License Engine Connected</span>
        </div>

        <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center font-bold text-xs uppercase">
          {admin?.username?.charAt(0) || 'A'}
        </div>
      </div>
    </header>
  )
}
