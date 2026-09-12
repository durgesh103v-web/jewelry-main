import React from 'react'
import { FiSearch, FiX } from 'react-icons/fi'

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  loading?: boolean
  placeholder?: string
  className?: string
  containerClassName?: string
  disabled?: boolean
  id?: string
  autoFocus?: boolean
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  loading = false,
  placeholder = 'Search...',
  className = '',
  containerClassName = '',
  disabled = false,
  id,
  autoFocus = false
}) => {
  return (
    <div className={`relative flex items-center ${containerClassName || 'w-full'}`}>
      <FiSearch
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none stroke-[2.2]"
      />
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`w-full h-9 pl-9 pr-8 text-xs border border-slate-200 rounded-md bg-slate-50 hover:bg-white focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors ${className}`.trim()}
      />
      {loading ? (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin inline-block" />
        </div>
      ) : value ? (
        <button
          type="button"
          onClick={() => {
            onChange('')
            onClear?.()
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-0.5 transition-colors cursor-pointer"
          aria-label="Clear search"
        >
          <FiX size={12} className="stroke-[2.5]" />
        </button>
      ) : null}
    </div>
  )
}

export default SearchInput

