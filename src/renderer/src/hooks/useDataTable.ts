import { useState, useCallback } from 'react'

export interface UseDataTableOptions {
  initialPageSize?: number
}

export interface UseDataTableReturn<T> {
  searchText: string
  setSearchText: (text: string) => void
  page: number
  setPage: (page: number) => void
  pageSize: number
  setPageSize: (size: number) => void
  sortKey: string | null
  sortDirection: 'asc' | 'desc'
  handleSort: (key: string) => void
  selectedIds: Set<string | number>
  toggleSelect: (id: string | number) => void
  toggleSelectAll: (allIds: Array<string | number>) => void
  clearSelection: () => void
  filterData: (data: T[], searchFields: Array<keyof T>) => T[]
}

export function useDataTable<T extends Record<string, unknown>>({
  initialPageSize = 25
}: UseDataTableOptions = {}): UseDataTableReturn<T> {
  const [searchText, setSearchText] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())

  const handleSort = useCallback((key: string) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'))
        return key
      }
      setSortDirection('asc')
      return key
    })
  }, [])

  const toggleSelect = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleSelectAll = useCallback((allIds: Array<string | number>) => {
    setSelectedIds((prev) => {
      if (prev.size === allIds.length) {
        return new Set()
      }
      return new Set(allIds)
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const filterData = useCallback(
    (data: T[], searchFields: Array<keyof T>): T[] => {
      const keyword = searchText.trim().toLowerCase()
      if (!keyword) return data

      return data.filter((row) =>
        searchFields.some((field) => {
          const val = row[field]
          if (val === null || val === undefined) return false
          return String(val).toLowerCase().includes(keyword)
        })
      )
    },
    [searchText]
  )

  return {
    searchText,
    setSearchText,
    page,
    setPage,
    pageSize,
    setPageSize,
    sortKey,
    sortDirection,
    handleSort,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    filterData
  }
}
