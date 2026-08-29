import React, { useEffect } from 'react'

export type DrawerPosition = 'left' | 'right'
export type DrawerSize = 'small' | 'medium' | 'large'

export interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: React.ReactNode
  position?: DrawerPosition
  size?: DrawerSize
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onOpenChange,
  title,
  position = 'right',
  size = 'medium',
  children,
  footer,
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

  const sizeStyles: Record<DrawerSize, string> = {
    small: 'w-72',
    medium: 'w-96',
    large: 'w-[500px]'
  }

  const positionStyles: Record<DrawerPosition, string> = {
    left: 'left-0 animate-in slide-in-from-left',
    right: 'right-0 animate-in slide-in-from-right'
  }

  return (
    <div className="fixed inset-0 z-modal flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => onOpenChange(false)} />

      {/* Drawer Content */}
      <div
        className={`fixed top-0 bottom-0 z-modal bg-background-surface border-border shadow-xl flex flex-col h-full ${positionStyles[position]} ${sizeStyles[size]} ${
          position === 'left' ? 'border-r' : 'border-l'
        } ${className}`.trim()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground m-0">{title}</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-foreground-muted hover:text-foreground p-1 text-base leading-none rounded-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && <div className="p-3 bg-background-muted border-t border-border flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
