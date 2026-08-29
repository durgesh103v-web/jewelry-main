import React from 'react'

export interface LoadingStateProps {
  message?: string
  className?: string
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading...', className = '' }) => {
  return (
    <div className={`p-8 text-center bg-background-surface rounded-md border border-border flex flex-col items-center justify-center gap-2 select-none ${className}`.trim()}>
      <span className="animate-spin text-2xl text-brand-primary">⏳</span>
      <span className="text-xs font-medium text-foreground-muted">{message}</span>
    </div>
  )
}
