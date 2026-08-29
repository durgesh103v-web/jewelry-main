import React from 'react'

export interface FormSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className = ''
}) => {
  return (
    <div className={`flex flex-col gap-3 p-4 bg-background-surface rounded-md border border-border ${className}`.trim()}>
      {(title || description) && (
        <div className="border-b border-border pb-2">
          {title && <h3 className="text-sm font-bold text-foreground m-0 tracking-tight">{title}</h3>}
          {description && <p className="text-xs text-foreground-muted m-0 mt-0.5">{description}</p>}
        </div>
      )}
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}
