import React from 'react'

export type SelectOption = {
  label: string
  value: string | number
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'options'> {
  label?: string
  description?: string
  error?: string
  options: Array<string | SelectOption>
  placeholder?: string
  fullWidth?: boolean
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      description,
      error,
      options,
      placeholder,
      fullWidth = true,
      disabled,
      required,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    const baseStyles =
      'h-8 px-3 text-sm text-foreground bg-background-surface border border-border-strong rounded-sm transition-colors focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary disabled:bg-background-muted disabled:text-foreground-muted disabled:cursor-not-allowed w-full cursor-pointer'

    const errorStyles = error ? 'border-error focus:border-error focus:ring-error' : ''

    const formattedOptions: SelectOption[] = options.map((opt) =>
      typeof opt === 'string' ? { label: opt, value: opt } : opt
    )

    return (
      <div className={`flex flex-col gap-1 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-foreground flex items-center gap-1 select-none">
            {label}
            {required && <span className="text-error">*</span>}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          className={`${baseStyles} ${errorStyles} ${className}`.trim()}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {formattedOptions.map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {description && !error && <p className="text-[11px] text-foreground-muted">{description}</p>}
        {error && <p className="text-[11px] text-error font-medium">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
