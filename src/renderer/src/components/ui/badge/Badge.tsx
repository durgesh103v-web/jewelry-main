import React from 'react'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
export type BadgeSize = 'small' | 'medium'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'medium',
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-full select-none'

  const sizeStyles: Record<BadgeSize, string> = {
    small: 'px-2 py-0.5 text-[10px] leading-tight',
    medium: 'px-2.5 py-0.5 text-xs leading-normal'
  }

  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-brand-soft text-brand-primary border border-brand-primary/20',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    error: 'bg-red-50 text-red-700 border border-red-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
    neutral: 'bg-background-muted text-foreground-secondary border border-border-default'
  }

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`.trim()} {...props}>
      {children}
    </span>
  )
}
