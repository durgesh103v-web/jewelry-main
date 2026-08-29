import React from 'react'
import { Input, InputProps } from '../input/Input'

export interface SearchInputProps extends Omit<InputProps, 'onChange'> {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  loading?: boolean
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  loading = false,
  placeholder = 'Search...',
  className = '',
  ...props
}) => {
  return (
    <div className="relative flex items-center w-full">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        prefix={<span className="text-xs">🔍</span>}
        suffix={
          loading ? (
            <span className="animate-spin text-xs">⏳</span>
          ) : value && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-foreground-muted hover:text-foreground cursor-pointer p-0.5"
              aria-label="Clear search"
            >
              ✕
            </button>
          ) : undefined
        }
        className={className}
        {...props}
      />
    </div>
  )
}
