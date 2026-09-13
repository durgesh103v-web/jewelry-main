import React, { useEffect } from 'react'
import { FiAlertTriangle, FiInfo, FiTrash2, FiX } from 'react-icons/fi'

export interface ConfirmDialogProps {
  open?: boolean
  isOpen?: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description?: React.ReactNode
  message?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'primary'
  loading?: boolean
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open: openProp,
  isOpen: isOpenProp,
  onConfirm,
  onCancel,
  title,
  description: descriptionProp,
  message: messageProp,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false
}) => {
  const isDialogOpen = Boolean(openProp ?? isOpenProp ?? false)
  const dialogDescription = descriptionProp ?? messageProp ?? null

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (isDialogOpen && e.key === 'Escape' && !loading) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDialogOpen, onCancel, loading])

  if (!isDialogOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={() => !loading && onCancel()}
      />

      {/* Dialog Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close dialog"
        >
          <FiX size={16} />
        </button>

        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Variant Icon */}
            {variant === 'danger' ? (
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                <FiTrash2 size={20} className="stroke-[2.2]" />
              </div>
            ) : variant === 'warning' ? (
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                <FiAlertTriangle size={20} className="stroke-[2.2]" />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                <FiInfo size={20} className="stroke-[2.2]" />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 pr-4">
              <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                {title}
              </h3>
              <div className="text-xs text-slate-600 leading-relaxed mt-1.5 font-normal">
                {dialogDescription}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-9 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>

          {variant === 'danger' ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 !text-white text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50 cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="!text-white text-white font-semibold">Deleting...</span>
                </>
              ) : (
                <span className="!text-white text-white font-semibold">{confirmLabel}</span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 !text-white text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="!text-white text-white font-semibold">Processing...</span>
                </>
              ) : (
                <span className="!text-white text-white font-semibold">{confirmLabel}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
