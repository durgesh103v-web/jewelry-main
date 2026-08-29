import React from 'react'

export interface SwitchProps {
  label?: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className = '',
  id
}) => {
  const switchId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={`flex flex-col gap-0.5 select-none ${className}`}>
      <label htmlFor={switchId} className={`inline-flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <button
          type="button"
          role="switch"
          id={switchId}
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary/20 ${
            checked ? 'bg-brand-primary' : 'bg-border-strong'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
              checked ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
        {label}
      </label>
      {description && <p className="text-[11px] text-foreground-muted pl-11.5">{description}</p>}
    </div>
  )
}
