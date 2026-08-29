import React from 'react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📭',
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`p-8 text-center bg-background-surface rounded-md border border-border flex flex-col items-center justify-center gap-2 ${className}`.trim()}>
      <div className="text-3xl text-foreground-muted mb-1 select-none">{icon}</div>
      <h3 className="text-sm font-bold text-foreground m-0">{title}</h3>
      {description && <p className="text-xs text-foreground-muted m-0 max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
