import React from 'react'

export interface PageHeaderProps {
  title: string
  description?: string
  breadcrumb?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumb,
  actions,
  className = ''
}) => {
  return (
    <div className={`flex flex-col gap-2 pb-3 mb-4 border-b border-border ${className}`.trim()}>
      {breadcrumb && <div className="text-xs text-foreground-muted">{breadcrumb}</div>}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-foreground m-0 tracking-tight">{title}</h1>
          {description && <p className="text-xs text-foreground-muted m-0 mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
