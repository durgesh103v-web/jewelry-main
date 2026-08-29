import React from 'react'

export interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: string
  trendDirection?: 'up' | 'down'
  description?: string
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendDirection = 'up',
  description,
  className = ''
}) => {
  return (
    <div className={`p-4 bg-background-surface rounded-md border border-border shadow-xs flex flex-col gap-1.5 ${className}`.trim()}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground-muted tracking-wide uppercase">{title}</span>
        {icon && <div className="text-foreground-muted text-base">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-foreground tracking-tight">{value}</span>
        {trend && (
          <span className={`text-xs font-medium flex items-center ${trendDirection === 'up' ? 'text-success' : 'text-error'}`}>
            {trendDirection === 'up' ? '▲' : '▼'} {trend}
          </span>
        )}
      </div>

      {subtitle && <span className="text-xs text-foreground-secondary font-medium">{subtitle}</span>}
      {description && <p className="text-[11px] text-foreground-muted m-0">{description}</p>}
    </div>
  )
}
