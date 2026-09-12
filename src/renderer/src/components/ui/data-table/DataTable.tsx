import React from 'react'

export interface Column<T> {
  key: string
  header: React.ReactNode
  render?: (row: T, index: number) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  width?: string
  minWidth?: string
  className?: string
  headerClassName?: string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor?: (row: T, index: number) => string | number
  loading?: boolean
  loadingMessage?: string
  searchText?: string
  emptyTitle?: string
  emptyMessage?: string
  emptyActionText?: string
  error?: string
  selectedId?: string | number | null
  onRowClick?: (row: T, index: number) => void
  onSelect?: (id: string | number) => void
  onDoubleClick?: (row: T, index: number) => void
  stickyHeader?: boolean
  className?: string
  theadClassName?: string
  printTitle?: string
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  keyExtractor = (r, i) => (r && r.id !== undefined ? r.id : i),
  loading = false,
  loadingMessage = 'Loading records...',
  searchText,
  emptyTitle,
  emptyMessage,
  emptyActionText,
  error,
  selectedId,
  onRowClick,
  onSelect,
  onDoubleClick,
  stickyHeader = true,
  className = '',
  theadClassName = '',
  printTitle
}: DataTableProps<T>): React.JSX.Element {
  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center'
    if (align === 'right') return 'text-right'
    return 'text-left'
  }

  return (
    <div className={`w-full h-full overflow-auto bg-white flex flex-col ${className}`.trim()}>
      {/* Print-only title */}
      {printTitle && (
        <div className="hidden print:block p-4 border-b border-slate-300 text-center">
          <h2 className="text-xl font-bold text-slate-900">{printTitle}</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Generated on {new Date().toLocaleDateString()} · Total Records: {data.length}
          </p>
        </div>
      )}

      <table className="w-full text-xs text-left border-collapse print:text-[10px]">
        <thead
          className={`bg-slate-200 border-b border-slate-300 text-slate-800 font-bold uppercase tracking-wider select-none shadow-xs print:static print:bg-slate-100 print:text-slate-800 ${
            stickyHeader ? 'sticky top-0 z-10' : ''
          } ${theadClassName || ''}`.trim()}
        >
          <tr className="bg-slate-200 border-l-4 border-l-slate-200">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width, minWidth: col.minWidth }}
                className={`bg-slate-200 py-3 px-3 text-[10px] font-bold text-slate-800 whitespace-nowrap border-b border-slate-300 ${getAlignClass(col.align)} ${col.headerClassName || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-20 text-center text-slate-500">
                <div className="inline-flex flex-col items-center gap-3">
                  <span className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="font-medium text-sm">{loadingMessage}</span>
                </div>
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-rose-600 font-medium">
                {error}
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-20 text-center text-slate-500">
                <div className="flex flex-col items-center gap-2">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-slate-300"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {searchText ? (
                    <p className="text-sm">
                      No records matching <span className="font-semibold text-slate-700">"{searchText}"</span>
                    </p>
                  ) : (
                    <p className="text-sm">
                      {emptyTitle || emptyMessage || 'No records found.'}
                      {emptyActionText && (
                        <span>
                          {' '}
                          Click <span className="font-semibold text-amber-600">"{emptyActionText}"</span> to create one.
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
               const rowKey = keyExtractor(row, index)
              const isSelected = selectedId !== undefined && selectedId !== null && selectedId === rowKey

              return (
                <tr
                  key={rowKey}
                  onClick={() => {
                    onRowClick?.(row, index)
                    onSelect?.(rowKey)
                  }}
                  onDoubleClick={() => onDoubleClick?.(row, index)}
                  className={`transition-all duration-100 cursor-pointer select-none group ${isSelected
                      ? 'bg-amber-50/90 border-l-4 border-l-amber-500 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] relative'
                      : 'border-l-4 border-l-transparent hover:bg-slate-100 hover:border-l-amber-300 hover:shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.015)]'
                    }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-2.5 px-3 align-middle ${getAlignClass(col.align)} ${col.className || ''}`}
                    >
                      {col.render
                        ? col.render(row, index)
                        : ((row as unknown as Record<string, unknown>)[col.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
