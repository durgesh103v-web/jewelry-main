import React from 'react'

export interface Column<T> {
  key: string
  header: React.ReactNode
  render?: (row: T, index: number) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  width?: string
  className?: string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T, index: number) => string | number
  loading?: boolean
  emptyMessage?: string
  error?: string
  onRowClick?: (row: T, index: number) => void
  stickyHeader?: boolean
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = 'No records found.',
  error,
  onRowClick,
  stickyHeader = false,
  className = ''
}: DataTableProps<T>): React.JSX.Element {
  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center'
    if (align === 'right') return 'text-right'
    return 'text-left'
  }

  return (
    <div className={`w-full overflow-x-auto border border-border rounded-md bg-background-surface ${className}`.trim()}>
      <table className="w-full text-xs text-foreground border-collapse">
        <thead className={`bg-background-muted border-b border-border text-foreground-secondary select-none ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`py-2.5 px-3 font-semibold uppercase tracking-wider ${getAlignClass(col.align)} ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-foreground-muted">
                <span className="animate-spin inline-block mr-2">⏳</span> Loading data...
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={columns.length} className="py-6 text-center text-error font-medium">
                {error}
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-foreground-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={keyExtractor(row, index)}
                onClick={() => onRowClick && onRowClick(row, index)}
                className={`transition-colors hover:bg-background-muted/60 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`py-2 px-3 align-middle ${getAlignClass(col.align)} ${col.className || ''}`}>
                    {col.render ? col.render(row, index) : (row as unknown as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
