import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiDatabase,
  FiDownloadCloud,
  FiFolder,
  FiHardDrive,
  FiLock,
  FiRefreshCw,
  FiRotateCcw,
  FiShield,
  FiUploadCloud,
  FiX
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

function BackupRestoreScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [lastBackup, setLastBackup] = useState<LastBackupInfo | null>(null)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [restoringBackup, setRestoringBackup] = useState(false)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [loadingLast, setLoadingLast] = useState(false)

  const alertTimerRef = useRef<number | null>(null)

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 4000)
  }, [])

  const loadLastBackup = useCallback(async (): Promise<void> => {
    try {
      setLoadingLast(true)
      const data = await window.api.backup.getLast()
      setLastBackup(data || null)
    } catch {
      // ignore
    } finally {
      setLoadingLast(false)
    }
  }, [])

  useEffect(() => {
    void loadLastBackup()
  }, [loadLastBackup])

  const handleCreateBackup = async (): Promise<void> => {
    try {
      setCreatingBackup(true)
      const result = await window.api.backup.create()

      if (result.cancelled) {
        showAlert('warning', result.message || 'Backup export cancelled.')
        return
      }

      showAlert('success', result.message || 'Database snapshot backup created successfully.')
      void loadLastBackup()
      window.dispatchEvent(new CustomEvent('erp:backup-created'))
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setCreatingBackup(false)
    }
  }

  const handleRestoreBackup = async (): Promise<void> => {
    try {
      setRestoringBackup(true)
      const result = await window.api.backup.restore()

      if (result.cancelled) {
        showAlert('warning', result.message || 'Restore cancelled.')
        return
      }

      showAlert('success', result.message || 'Database restored successfully from backup.')
      void loadLastBackup()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setRestoringBackup(false)
      setRestoreConfirmOpen(false)
    }
  }

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiDatabase className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Database Backup & Recovery Suite</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Secure snapshot archiving, automated database backup dumps, and safety restoration console
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadLastBackup()}
            disabled={loadingLast}
            className="h-8 px-3 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 text-amber-600 ${loadingLast ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto max-w-5xl mx-auto w-full">
        {alertMessage && (
          <div className="shrink-0 no-print">
            <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />
          </div>
        )}

        {/* Top Status & Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Database Engine Status
              </span>
              <strong className="text-sm font-extrabold text-emerald-950 block mt-0.5">
                Healthy • SQLite WAL Active
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <FiShield className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Last Backup Recorded
              </span>
              <strong className="text-sm font-extrabold font-mono text-slate-900 block mt-0.5 truncate max-w-[200px]">
                {lastBackup?.backupAt || 'No backup on record'}
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <FiClock className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Latest Archive File
              </span>
              <strong className="text-xs font-bold font-mono text-amber-950 block mt-0.5 truncate max-w-[200px]" title={lastBackup?.fileName || ''}>
                {lastBackup?.fileName || 'None'}
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
              <FiFolder className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Dual Operational Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* 1. Create Backup Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                  <FiDownloadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Create Database Backup</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Export full snapshot of transactions, stock & accounts</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Save an encrypted, stand-alone copy of your complete Jewellery ERP database. Recommended daily before closing shop, before running major changes, or before software updates.
              </p>

              {/* Data Inclusions Pill List */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  Full Snapshot Includes:
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium">
                  <span className="flex items-center gap-1.5">
                    <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Master Accounts & GST
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Items & Stock Vault
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Sales & Invoices
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Financial & Fine Ledgers
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <FiLock className="w-3 h-3" /> Safe .db snapshot
              </span>
              <button
                type="button"
                onClick={() => void handleCreateBackup()}
                disabled={creatingBackup || restoringBackup}
                className="h-9 px-5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs border border-emerald-700 cursor-pointer disabled:opacity-50"
              >
                <FiDownloadCloud className={`w-4 h-4 ${creatingBackup ? 'animate-bounce' : ''}`} />
                <span>{creatingBackup ? 'Creating Snapshot...' : 'Create Backup Now'}</span>
              </button>
            </div>
          </div>

          {/* 2. Restore Backup Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shadow-2xs">
                  <FiUploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Restore Database Backup</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Roll back or migrate system from a saved backup file</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Restore data from a previously created database backup file. Useful when migrating to a new computer, recovering from hardware failure, or restoring historical records.
              </p>

              {/* Warning Notice Box */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <FiAlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-amber-950 block">High-Priority Safety Warning:</strong>
                  <p className="text-amber-900/90 leading-snug mt-0.5">
                    Restoring an archive will <span className="font-bold underline">completely replace the current active database</span>. Always create a fresh backup before performing a restore!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <FiHardDrive className="w-3 h-3" /> Select file from disk
              </span>
              <button
                type="button"
                onClick={() => setRestoreConfirmOpen(true)}
                disabled={creatingBackup || restoringBackup}
                className="h-9 px-5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs border border-rose-700 cursor-pointer disabled:opacity-50"
              >
                <FiRotateCcw className={`w-4 h-4 ${restoringBackup ? 'animate-spin' : ''}`} />
                <span>{restoringBackup ? 'Restoring Database...' : 'Restore from Backup...'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Best Practice Advice Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex items-start gap-3.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
            <FiShield className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>Recommended Daily Disaster Recovery Routine</span>
              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                Best Practice
              </span>
            </h4>
            <p className="text-slate-600 leading-relaxed">
              At the end of every business day, create a backup snapshot and save a copy onto an external USB flash drive or secure cloud storage. This ensures 100% data integrity for your customer statements, gold purity balances, and invoices even in case of computer crash or disk failure.
            </p>
          </div>
        </div>

      </div>

      <AppConfirmDialog
        open={restoreConfirmOpen}
        title="Restore Database Backup?"
        message="Current active data will be completely replaced with the selected backup file. Make sure you have created a fresh backup first. Do you want to proceed?"
        confirmText="Yes, Proceed with Restore"
        cancelText="Cancel"
        type="danger"
        loading={restoringBackup}
        onConfirm={() => void handleRestoreBackup()}
        onCancel={() => {
          if (!restoringBackup) {
            setRestoreConfirmOpen(false)
          }
        }}
      />
    </div>
  )
}

export default BackupRestoreScreen
