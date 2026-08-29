import React from 'react'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  description?: string
  error?: string
  fullWidth?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      description,
      error,
      fullWidth = true,
      disabled,
      required,
      rows = 3,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    const baseStyles =
      'p-2.5 text-sm text-foreground bg-background-surface border border-border-strong rounded-sm transition-colors focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary disabled:bg-background-muted disabled:text-foreground-muted disabled:cursor-not-allowed w-full resize-y'

    const errorStyles = error ? 'border-error focus:border-error focus:ring-error' : ''

    return (
      <div className={`flex flex-col gap-1 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-foreground flex items-center gap-1 select-none">
            {label}
            {required && <span className="text-error">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          disabled={disabled}
          required={required}
          className={`${baseStyles} ${errorStyles} ${className}`.trim()}
          {...props}
        />

        {description && !error && <p className="text-[11px] text-foreground-muted">{description}</p>}
        {error && <p className="text-[11px] text-error font-medium">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
