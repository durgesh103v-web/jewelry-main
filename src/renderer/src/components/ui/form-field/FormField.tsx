import React from 'react'

export interface FormFieldProps {
  label?: string
  required?: boolean
  description?: string
  error?: string
  children: React.ReactNode
  className?: string
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  description,
  error,
  children,
  className = ''
}) => {
  return (
    <div className={`flex flex-col gap-1 w-full ${className}`.trim()}>
      {label && (
        <label className="text-xs font-semibold text-foreground flex items-center gap-1 select-none">
          {label}
          {required && <span className="text-error">*</span>}
        </label>
      )}

      {children}

      {description && !error && <p className="text-[11px] text-foreground-muted">{description}</p>}
      {error && <p className="text-[11px] text-error font-medium">{error}</p>}
    </div>
  )
}
