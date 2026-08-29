import React from 'react'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  description?: string
  error?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  fullWidth?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      description,
      error,
      prefix,
      suffix,
      fullWidth = true,
      disabled,
      required,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    const baseInputStyles =
      'h-8 px-3 text-sm text-foreground bg-background-surface border border-border-strong rounded-sm transition-colors focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary disabled:bg-background-muted disabled:text-foreground-muted disabled:cursor-not-allowed w-full'

    const errorBorderStyles = error ? 'border-error focus:border-error focus:ring-error' : ''
    const paddingLeft = prefix ? 'pl-8' : ''
    const paddingRight = suffix ? 'pr-8' : ''

    return (
      <div className={`flex flex-col gap-1 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-foreground flex items-center gap-1 select-none">
            {label}
            {required && <span className="text-error">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {prefix && <div className="absolute left-2.5 text-foreground-muted text-sm pointer-events-none flex items-center">{prefix}</div>}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            className={`${baseInputStyles} ${errorBorderStyles} ${paddingLeft} ${paddingRight} ${className}`.trim()}
            {...props}
          />
          {suffix && <div className="absolute right-2.5 text-foreground-muted text-sm pointer-events-none flex items-center">{suffix}</div>}
        </div>

        {description && !error && <p className="text-[11px] text-foreground-muted">{description}</p>}
        {error && <p className="text-[11px] text-error font-medium">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
