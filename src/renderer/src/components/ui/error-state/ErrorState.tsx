import React from 'react'
import { Button } from '../button/Button'

export interface ErrorStateProps {
  title?: string
  message: string
  retryAction?: () => void
  className?: string
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  retryAction,
  className = ''
}) => {
  return (
    <div className={`p-6 text-center bg-red-50/50 rounded-md border border-red-200 flex flex-col items-center justify-center gap-2 ${className}`.trim()}>
      <span className="text-2xl text-error">⚠️</span>
      <h3 className="text-sm font-bold text-error m-0">{title}</h3>
      <p className="text-xs text-foreground-secondary m-0 max-w-md">{message}</p>
      {retryAction && (
        <div className="mt-2">
          <Button size="small" variant="outline" onClick={retryAction}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}
