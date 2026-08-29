import React, { useEffect } from 'react'

export type DialogSize = 'small' | 'medium' | 'large' | 'extraLarge'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: DialogSize
  className?: string
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'medium',
  className = ''
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (open && event.key === 'Escape') {
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  const sizeStyles: Record<DialogSize, string> = {
    small: 'max-w-sm',
    medium: 'max-w-md',
    large: 'max-w-xl',
    extraLarge: 'max-w-3xl'
  }

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Dialog Content */}
      <div
        className={`relative w-full bg-background-surface rounded-md border border-border shadow-xl overflow-hidden flex flex-col max-h-[90vh] z-modal ${sizeStyles[size]} ${className}`.trim()}
      >
        {/* Header */}
        {(title || description) && (
          <div className="p-4 border-b border-border flex items-start justify-between gap-4">
            <div>
              {title && <h2 className="text-base font-bold text-foreground m-0 tracking-tight">{title}</h2>}
              {description && <p className="text-xs text-foreground-muted m-0 mt-0.5">{description}</p>}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-foreground-muted hover:text-foreground p-1 text-base leading-none rounded-xs cursor-pointer"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && <div className="p-3 bg-background-muted border-t border-border flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
