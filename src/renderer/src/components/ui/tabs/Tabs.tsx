import React from 'react'

export type TabItem = {
  key: string
  label: React.ReactNode
  icon?: React.ReactNode
  badge?: React.ReactNode
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  activeKey: string
  onChange: (key: string) => void
  variant?: 'line' | 'pills'
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeKey,
  onChange,
  variant = 'line',
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-1 border-b border-border select-none ${className}`.trim()}>
      {items.map((tab) => {
        const isActive = tab.key === activeKey

        if (variant === 'pills') {
          return (
            <button
              key={tab.key}
              type="button"
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onChange(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-brand-primary text-white'
                  : 'bg-background-muted text-foreground-secondary hover:bg-border-default'
              } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge}
            </button>
          )
        }

        return (
          <button
            key={tab.key}
            type="button"
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.key)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer -mb-px ${
              isActive
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border-strong'
            } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge}
          </button>
        )
      })}
    </div>
  )
}
