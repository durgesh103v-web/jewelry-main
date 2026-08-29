import React from 'react'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
  error?: string
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, disabled, className = '', id, ...props }, ref) => {
    const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="flex flex-col gap-0.5 select-none">
        <label htmlFor={checkboxId} className={`inline-flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            disabled={disabled}
            className={`w-4 h-4 rounded-xs border-border-strong text-brand-primary focus:ring-brand-primary focus:ring-offset-0 disabled:cursor-not-allowed cursor-pointer ${className}`.trim()}
            {...props}
          />
          {label}
        </label>
        {description && <p className="text-[11px] text-foreground-muted pl-6">{description}</p>}
        {error && <p className="text-[11px] text-error font-medium pl-6">{error}</p>}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
