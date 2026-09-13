import React, { Suspense } from 'react'
import { FiArrowLeft, FiBox, FiCompass, FiX } from 'react-icons/fi'
import { screenRegistry } from '../navigation/screenRegistry'
import { DashboardScreen } from './DashboardScreen'
import { LoadingState } from '@components/ui'
import type { WorkspaceTab } from '../navigation/navigation.types'
import type { AppMenuChild } from '../../types/menu'

export interface ScreenRendererProps {
  activeTab: WorkspaceTab
  onCloseTab: (tabId: string) => void
  onNavigate: (id: string, label: string, module: AppMenuChild['module'] | 'home') => void
  visibleScreenIds: Set<string>
}

function ModulePlaceholder({
  tab,
  onClose,
  onNavigate
}: {
  tab: WorkspaceTab
  onClose: () => void
  onNavigate: (id: string, label: string, module: AppMenuChild['module'] | 'home') => void
}): React.JSX.Element {
  return (
    <div className="w-full h-full min-h-[480px] flex-1 flex flex-col items-center justify-center p-6 select-none bg-[var(--color-background-app,#f8fafc)]">
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200/90 shadow-xl p-8 flex flex-col items-center text-center overflow-hidden">
        {/* Decorative Top Amber Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

        {/* Close Button Top-Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close tab"
        >
          <FiX size={16} />
        </button>

        {/* Module Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-50 text-amber-900 border border-amber-200 mb-4">
          <FiBox size={13} className="text-amber-600" />
          <span>Module: {String(tab.module).toUpperCase()}</span>
        </div>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shadow-xs mb-4">
          <FiCompass size={28} className="stroke-[2.2]" />
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-2">
          {tab.label}
        </h2>
        
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-6 font-normal">
          This dedicated workflow module is registered in your enterprise configuration. You can navigate back to Dashboard or open related active transactions.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('dashboard', 'Dashboard', 'home')}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
            style={{ color: '#ffffff' }}
          >
            <FiArrowLeft size={14} />
            <span>Go to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            Close Tab
          </button>
        </div>
      </div>
    </div>
  )
}

export function ScreenRenderer({
  activeTab,
  onCloseTab,
  onNavigate,
  visibleScreenIds
}: ScreenRendererProps): React.JSX.Element {
  if (activeTab.id === 'dashboard') {
    return <DashboardScreen openQuickScreen={onNavigate} visibleScreenIds={visibleScreenIds} />
  }

  const screenEntry = screenRegistry[activeTab.id]

  if (!screenEntry) {
    return (
      <ModulePlaceholder
        tab={activeTab}
        onClose={() => onCloseTab(activeTab.id)}
        onNavigate={onNavigate}
      />
    )
  }

  const Component = screenEntry.component
  const defaultProps = screenEntry.defaultProps || {}

  return (
    <Suspense
      fallback={
        <LoadingState
          message={`Loading ${activeTab.label}...`}
          subMessage="Preparing workspace canvas, database queries & valuation state..."
          onCancel={() => onNavigate('dashboard', 'Dashboard', 'home')}
        />
      }
    >
      <Component
        {...defaultProps}
        onClose={() => onCloseTab(activeTab.id)}
        onNavigate={onNavigate}
      />
    </Suspense>
  )
}

