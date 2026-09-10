import React, { useState, useRef, useEffect, useCallback } from 'react'

export type SelectOption = {
  label: string
  value: string | number
  disabled?: boolean
  badge?: string
}

export interface SelectProps {
  name?: string
  id?: string
  label?: string
  description?: string
  error?: string
  options: Array<string | SelectOption>
  value?: string | number
  defaultValue?: string | number
  onChange?: (e: { target: { value: string; name?: string } }) => void
  placeholder?: string
  fullWidth?: boolean
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  disabled?: boolean
  required?: boolean
  searchable?: boolean
  className?: string
  onKeyDown?: (e: React.KeyboardEvent<any>) => void
}

export const Select = React.forwardRef<any, SelectProps>(
  (
    {
      name,
      id,
      label,
      description,
      error,
      options,
      value: controlledValue,
      defaultValue,
      onChange,
      placeholder = 'Select option',
      fullWidth = true,
      size = 'md',
      icon,
      disabled = false,
      required = false,
      searchable = false,
      className = '',
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false)
    const [internalValue, setInternalValue] = useState<string | number>(defaultValue ?? '')
    const [searchQuery, setSearchQuery] = useState('')
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)

    const containerRef = useRef<HTMLDivElement | null>(null)
    const buttonRef = useRef<HTMLButtonElement | null>(null)
    const searchInputRef = useRef<HTMLInputElement | null>(null)
    const listRef = useRef<HTMLUListElement | null>(null)

    const isControlled = controlledValue !== undefined
    const currentValue = isControlled ? controlledValue : internalValue

    // Format options uniformly
    const formattedOptions: SelectOption[] = React.useMemo(() => {
      return options.map((opt) => (typeof opt === 'string' ? { label: opt, value: opt } : opt))
    }, [options])

    // Find selected option
    const selectedOption = formattedOptions.find((opt) => String(opt.value) === String(currentValue))

    // Filter options for searchable mode
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery.trim()) return formattedOptions
      const q = searchQuery.toLowerCase()
      return formattedOptions.filter((opt) => opt.label.toLowerCase().includes(q))
    }, [formattedOptions, searchQuery])

    const selectId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined)

    // Close on click outside
    useEffect(() => {
      if (!isOpen) return

      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
          setSearchQuery('')
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isOpen])

    // Auto focus search input when opened
    useEffect(() => {
      if (isOpen && (searchable || formattedOptions.length > 8)) {
        setTimeout(() => {
          searchInputRef.current?.focus()
        }, 50)
      }
    }, [isOpen, searchable, formattedOptions.length])

    const handleSelect = useCallback(
      (option: SelectOption) => {
        if (option.disabled) return

        if (!isControlled) {
          setInternalValue(option.value)
        }

        if (onChange) {
          onChange({
            target: {
              value: String(option.value),
              name
            }
          })
        }

        setIsOpen(false)
        setSearchQuery('')
        buttonRef.current?.focus()
      },
      [isControlled, name, onChange]
    )

    // Keyboard navigation
    const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (onKeyDown) {
        onKeyDown(e)
      }

      if (disabled) return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        if (!isOpen) {
          e.preventDefault()
          setIsOpen(true)
          const currIdx = formattedOptions.findIndex((o) => String(o.value) === String(currentValue))
          setHighlightedIndex(currIdx >= 0 ? currIdx : 0)
        }
      } else if (e.key === 'Escape') {
        if (isOpen) {
          e.preventDefault()
          setIsOpen(false)
        }
      }
    }

    const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        buttonRef.current?.focus()
      } else if (e.key === 'Tab') {
        setIsOpen(false)
      }
    }

    const sizeStyles = {
      sm: 'h-8 text-xs pl-2.5 pr-7',
      md: 'h-9 text-xs pl-3 pr-8',
      lg: 'h-10 text-sm pl-3.5 pr-9'
    }[size]

    const errorStyles = error
      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900 bg-rose-50/30'
      : ''
    const iconPadding = icon ? (size === 'sm' ? 'pl-8' : size === 'lg' ? 'pl-10' : 'pl-9') : ''

    const isSearchVisible = searchable || formattedOptions.length > 8

    return (
      <div ref={containerRef} className={`relative flex flex-col ${fullWidth ? 'w-full' : ''}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide select-none"
          >
            {label}
            {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
          </label>
        )}

        {/* Dropdown Trigger Button */}
        <div className="relative w-full">
          {icon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors">
              {icon}
            </div>
          )}

          <button
            ref={(node) => {
              buttonRef.current = node
              if (typeof ref === 'function') ref(node)
              else if (ref) ref.current = node
            }}
            id={selectId}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            onKeyDown={handleTriggerKeyDown}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            className={`w-full flex items-center justify-between text-left font-medium bg-slate-50 hover:bg-slate-100/70 border rounded-md transition-all cursor-pointer shadow-2xs text-slate-800 ${
              isOpen
                ? 'bg-white border-amber-500 ring-2 ring-amber-500/20'
                : 'border-slate-200 hover:border-slate-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''} ${sizeStyles} ${iconPadding} ${errorStyles} ${className}`.trim()}
            {...props}
          >
            <span className="truncate pr-2">
              {selectedOption ? (
                <span className="text-slate-900 font-semibold">{selectedOption.label}</span>
              ) : (
                <span className="text-slate-400 font-normal">{placeholder}</span>
              )}
            </span>

            {/* Rotating SVG Chevron */}
            <div
              className={`pointer-events-none transition-transform duration-200 shrink-0 ${
                isOpen ? 'rotate-180 text-amber-600' : 'text-slate-400'
              }`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>
        </div>

        {/* Custom Floating Dropdown Menu Container */}
        {isOpen && (
          <div
            onKeyDown={handleMenuKeyDown}
            className="absolute top-full left-0 mt-1.5 w-full min-w-[200px] max-w-sm bg-white border border-slate-200/90 rounded-xl shadow-xl z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in duration-100"
            style={{
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08)'
            }}
          >
            {/* Search filter inside dropdown if more than 8 options */}
            {isSearchVisible && (
              <div className="p-2 border-b border-slate-100 bg-slate-50/70 sticky top-0 z-10">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setHighlightedIndex(0)
                    }}
                    placeholder="Search options..."
                    className="w-full h-7 pl-7 pr-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <svg
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
              </div>
            )}

            {/* List of Options */}
            <ul
              ref={listRef}
              role="listbox"
              className="max-h-60 overflow-y-auto py-1 divide-y-0"
              style={{ scrollbarWidth: 'thin' }}
            >
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-3 text-center text-xs text-slate-400 font-medium select-none">
                  No matching options
                </li>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = String(option.value) === String(currentValue)
                  const isHighlighted = highlightedIndex === index

                  return (
                    <li
                      key={`${option.value}-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(option)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`flex items-center justify-between px-3 py-2 mx-1 my-0.5 rounded-lg text-xs cursor-pointer transition-colors select-none ${
                        isSelected
                          ? 'bg-amber-100/80 text-amber-950 font-bold'
                          : isHighlighted
                          ? 'bg-amber-50/70 text-amber-900 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                      } ${option.disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{option.label}</span>
                        {option.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-900 font-bold">
                            {option.badge}
                          </span>
                        )}
                      </div>

                      {/* Active Checkmark Icon */}
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 ml-2 shadow-2xs">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        )}

        {/* Error / Description */}
        {description && !error && (
          <p className="mt-1 text-[11px] text-slate-500 leading-tight">{description}</p>
        )}
        {error && (
          <p className="mt-1 text-[11px] text-rose-500 font-semibold leading-tight">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
export default Select
