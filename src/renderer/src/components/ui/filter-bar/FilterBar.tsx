import React from 'react'

export interface FilterBarProps {
  children: React.ReactNode
  className?: string
}

export const FilterBar: React.FC<FilterBarProps> = ({ children, className = '' }) => {
  return (
    <div className={`p-3 bg-background-muted rounded-md border border-border flex flex-wrap items-center gap-3 ${className}`.trim()}>
      {children}
    </div>
  )
}
