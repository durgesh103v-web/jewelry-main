import React, { useState, useEffect, useRef } from 'react'
import {
  FiBell,
  FiDownloadCloud,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiArrowUpRight,
  FiShield,
  FiHardDrive,
  FiClock
} from 'react-icons/fi'

interface UpdateInfoPayload {
  version: string
  releaseDate?: string
  releaseNotes?: string
  totalBytes?: number
}

interface DownloadProgressPayload {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

interface UpdaterState {
  currentVersion: string
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  updateInfo: UpdateInfoPayload | null
  progress: DownloadProgressPayload | null
  error: string | null
  lastCheckedAt: string | null
  dismissedVersion: string | null
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Unknown size'
  const mb = bytes / (1024 * 1024)
  if (mb >= 1000) {
    return `${(mb / 1024).toFixed(2)} GB`
  }
  return `${mb.toFixed(1)} MB`
}

function formatSpeed(bytesPerSec?: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return ''
  const mb = bytesPerSec / (1024 * 1024)
  if (mb < 0.1) {
    return `${Math.round(bytesPerSec / 1024)} KB/s`
  }
  return `${mb.toFixed(1)} MB/s`
}

export const UpdateNotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [state, setState] = useState<UpdaterState>({
    currentVersion: '1.0.0',
    status: 'idle',
    updateInfo: null,
    progress: null,
    error: null,
    lastCheckedAt: null,
    dismissedVersion: null
  })
  const [actionLoading, setActionLoading] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)

  // Load initial state and subscribe to updater events
  useEffect(() => {
    let isMounted = true

    if (window.api?.updater) {
      window.api.updater
        .getState()
        .then((s) => {
          if (isMounted && s) setState(s)
        })
        .catch(() => {})

      // Subscribe to status changes
      const unsubscribe = window.api.updater.onStatusChange((nextState) => {
        if (isMounted) {
          setState(nextState)
        }
      })

      return () => {
        isMounted = false
        if (typeof unsubscribe === 'function') {
          unsubscribe()
        }
      }
    }

    return () => {
      isMounted = false
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const hasUnseenUpdate =
    state.status === 'available' &&
    state.updateInfo?.version &&
    state.updateInfo.version !== state.dismissedVersion

  const isDownloading = state.status === 'downloading'
  const isDownloaded = state.status === 'downloaded'

  const handleManualCheck = async (): Promise<void> => {
    if (!window.api?.updater) return
    setActionLoading(true)
    try {
      await window.api.updater.checkForUpdates()
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownload = async (): Promise<void> => {
    if (!window.api?.updater) return
    setActionLoading(true)
    try {
      await window.api.updater.downloadUpdate()
    } finally {
      setActionLoading(false)
    }
  }

  const handleInstallNow = async (): Promise<void> => {
    if (!window.api?.updater) return
    setActionLoading(true)
    try {
      await window.api.updater.installUpdate()
    } finally {
      setActionLoading(false)
    }
  }

  const handleDismiss = (): void => {
    if (window.api?.updater) {
      window.api.updater.dismissUpdate().catch(() => {})
    }
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-1.5 rounded-lg text-slate-600 hover:text-amber-800 hover:bg-amber-50/80 transition-all duration-150 cursor-pointer select-none"
        title="Check for Software Updates"
        aria-label="Software Updates"
        aria-expanded={isOpen}
      >
        <FiBell size={15} className={isDownloading ? 'animate-bounce text-amber-600' : ''} />

        {/* Badge Indicator */}
        {hasUnseenUpdate && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 border border-white" />
          </span>
        )}

        {isDownloaded && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 border border-white" />
          </span>
        )}

        {isDownloading && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white shadow">
            ↓
          </span>
        )}
      </button>

      {/* Popover Notification Flyout Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-150 font-sans text-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 border border-amber-200/80 text-amber-700">
                <FiDownloadCloud size={15} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Software Updates</h3>
                <p className="text-[10px] text-slate-400">Current Build: v{state.currentVersion}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="Close panel"
            >
              <FiX size={15} />
            </button>
          </div>

          {/* Panel Body */}
          <div className="mt-3.5 space-y-3">
            {/* 1. UPDATE AVAILABLE */}
            {state.status === 'available' && state.updateInfo && (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950">New Version Available</span>
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                      v{state.updateInfo.version}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-amber-800/80 font-medium">
                    {state.updateInfo.totalBytes && (
                      <span className="flex items-center gap-1">
                        <FiHardDrive size={11} />
                        {formatBytes(state.updateInfo.totalBytes)}
                      </span>
                    )}
                    {state.updateInfo.releaseDate && (
                      <span className="flex items-center gap-1">
                        <FiClock size={11} />
                        {state.updateInfo.releaseDate.slice(0, 10)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Release Notes */}
                {state.updateInfo.releaseNotes && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                      What's New
                    </label>
                    <div className="max-h-28 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-sans">
                      {state.updateInfo.releaseNotes}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3 text-xs font-bold text-white shadow-sm hover:from-amber-600 hover:to-amber-700 active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
                  >
                    <FiDownloadCloud size={14} />
                    <span>Download Update</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="px-3 h-9 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Later
                  </button>
                </div>
              </div>
            )}

            {/* 2. DOWNLOADING PROGRESS */}
            {state.status === 'downloading' && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-950 flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    Downloading Update...
                  </span>
                  <span className="font-mono font-bold text-blue-900">
                    {state.progress?.percent || 0}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-amber-500 transition-all duration-300"
                    style={{ width: `${state.progress?.percent || 0}%` }}
                  />
                </div>

                {/* Details */}
                <div className="flex items-center justify-between text-[10px] text-blue-700/80 font-mono">
                  <span>
                    {formatBytes(state.progress?.transferred)} / {formatBytes(state.progress?.total)}
                  </span>
                  {state.progress?.bytesPerSecond && (
                    <span>{formatSpeed(state.progress.bytesPerSecond)}</span>
                  )}
                </div>
              </div>
            )}

            {/* 3. DOWNLOADED & READY TO INSTALL */}
            {state.status === 'downloaded' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-emerald-950">
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold">Update Ready to Install!</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-800">
                    Version <strong>v{state.updateInfo?.version || 'Latest'}</strong> has been downloaded and verified. Restart the ERP to apply the update.
                  </p>
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 text-[11px] text-slate-600">
                  <FiShield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>
                    Safe restart: A verified database backup snapshot is created and integrity-checked before installation. Your existing business records and license activation remain securely intact.
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleInstallNow}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-3 text-xs font-bold text-white shadow-sm hover:from-emerald-700 hover:to-emerald-800 active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
                  >
                    <FiArrowUpRight size={14} />
                    <span>Restart & Install Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 h-9 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Later
                  </button>
                </div>
              </div>
            )}

            {/* 4. UP-TO-DATE OR IDLE */}
            {(state.status === 'idle' || state.status === 'not-available') && (
              <div className="text-center py-2 space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <FiCheckCircle size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Your ERP is up to date</h4>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Jewellery ERP Desktop version <strong>v{state.currentVersion}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleManualCheck}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  <FiRefreshCw size={12} className={actionLoading ? 'animate-spin' : ''} />
                  <span>Check for Updates</span>
                </button>
              </div>
            )}

            {/* 5. CHECKING IN PROGRESS */}
            {state.status === 'checking' && (
              <div className="text-center py-4 space-y-2">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                <p className="text-xs font-medium text-slate-600">Connecting to release server...</p>
              </div>
            )}

            {/* 6. ERROR STATE */}
            {state.status === 'error' && (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 leading-relaxed">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <div>
                    <span className="font-bold block">Update Check Failed</span>
                    <span>{state.error || 'Unable to check for updates.'}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleManualCheck}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition cursor-pointer"
                  >
                    <FiRefreshCw size={12} className={actionLoading ? 'animate-spin' : ''} />
                    <span>Retry</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>HTTPS Encrypted Release Feed</span>
            <span>Ed25519 Verified</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default UpdateNotificationBell
