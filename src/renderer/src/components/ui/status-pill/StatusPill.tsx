import React from 'react'

export type StatusVariant =
  | 'in-progress'
  | 'pending'
  | 'partial'
  | 'ready'
  | 'expiring'
  | 'completed'
  | 'cancelled'
  | 'neutral'
  | 'blue'
  | 'amber'
  | 'green'
  | 'red'
  | 'purple'
  | 'gray'

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusVariant
  statusText?: string
  dot?: boolean
  size?: 'small' | 'medium'
  children?: React.ReactNode
}

const VARIANT_STYLES: Record<string, { bg: string; text: string; border: string; dotColor: string }> = {
  'in-progress': { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dotColor: '#3b82f6' },
  blue: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dotColor: '#3b82f6' },
  pending: { bg: '#fef3c7', text: '#b45309', border: '#fde68a', dotColor: '#f59e0b' },
  amber: { bg: '#fef3c7', text: '#b45309', border: '#fde68a', dotColor: '#f59e0b' },
  partial: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe', dotColor: '#8b5cf6' },
  purple: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe', dotColor: '#8b5cf6' },
  ready: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', dotColor: '#10b981' },
  completed: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', dotColor: '#10b981' },
  green: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', dotColor: '#10b981' },
  expiring: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', dotColor: '#ef4444' },
  cancelled: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', dotColor: '#ef4444' },
  red: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', dotColor: '#ef4444' },
  neutral: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', dotColor: '#94a3b8' },
  gray: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', dotColor: '#94a3b8' }
}

export function mapStatusToVariant(status: string): StatusVariant {
  const norm = status.toUpperCase().replace(/\s+/g, '_')
  switch (norm) {
    case 'ACTIVE':
    case 'CONFIRMED':
    case 'IN_PROGRESS':
    case 'PROCESSING':
    case 'WORKSHOP':
      return 'in-progress'
    case 'PENDING':
    case 'AWAITING':
    case 'UNPAID':
    case 'PARTIAL':
      return 'pending'
    case 'READY':
    case 'DELIVERED':
    case 'COMPLETED':
    case 'CLOSED':
    case 'APPROVED':
    case 'PAID':
      return 'ready'
    case 'EXPIRING':
    case 'EXPIRED':
    case 'OVERDUE':
    case 'CANCELLED':
    case 'REJECTED':
      return 'expiring'
    case 'DRAFT':
    default:
      return 'neutral'
  }
}

export const StatusPill: React.FC<StatusPillProps> = ({
  variant,
  statusText,
  dot = true,
  size = 'small',
  children,
  className = '',
  style,
  ...props
}) => {
  const effectiveVariant: StatusVariant =
    variant || (statusText ? mapStatusToVariant(statusText) : 'neutral')
  const palette = VARIANT_STYLES[effectiveVariant] || VARIANT_STYLES['neutral']

  const isSmall = size === 'small'

  return (
    <span
      className={`table-status-pill inline-flex items-center gap-1.5 font-semibold select-none whitespace-nowrap ${className}`.trim()}
      style={{
        backgroundColor: palette.bg,
        color: palette.text,
        border: `1px solid ${palette.border}`,
        borderRadius: '9999px',
        padding: isSmall ? '2px 8px' : '4px 10px',
        fontSize: isSmall ? '11px' : '12px',
        lineHeight: 1.2,
        ...style
      }}
      {...props}
    >
      {dot && (
        <span
          style={{
            width: isSmall ? '6px' : '7px',
            height: isSmall ? '6px' : '7px',
            borderRadius: '50%',
            backgroundColor: palette.dotColor,
            flexShrink: 0
          }}
        />
      )}
      {children || statusText}
    </span>
  )
}
