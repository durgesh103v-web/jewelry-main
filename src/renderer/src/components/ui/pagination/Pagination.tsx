import React from 'react'
import { Button } from '../button/Button'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems?: number
  pageSize?: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  className?: string
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = ''
}) => {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 text-xs text-foreground-muted select-none py-2 px-1 ${className}`.trim()}>
      <div className="flex items-center gap-2">
        {totalItems !== undefined && (
          <span>
            Total: <strong className="text-foreground">{totalItems}</strong> items
          </span>
        )}
        {onPageSizeChange && pageSize && (
          <div className="flex items-center gap-1.5 ml-2">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 text-xs bg-background-surface border border-border-strong rounded-xs px-1.5 focus:outline-none"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button size="small" variant="outline" disabled={currentPage <= 1} onClick={() => onPageChange(1)}>
          «
        </Button>
        <Button size="small" variant="outline" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          ‹
        </Button>
        <span className="px-2 text-foreground font-medium">
          Page {currentPage} of {Math.max(1, totalPages)}
        </span>
        <Button size="small" variant="outline" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
          ›
        </Button>
        <Button size="small" variant="outline" disabled={currentPage >= totalPages} onClick={() => onPageChange(totalPages)}>
          »
        </Button>
      </div>
    </div>
  )
}
