import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiPrinter,
  FiDownload,
  FiSearch,
  FiX,
  FiLayers,
  FiRotateCcw,
  FiChevronDown,
  FiCheck
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { ConfirmDialog } from '../../../components/ui'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

export interface AccountGroup {
  id: string
  groupName: string
  groupType: string
  description: string
  active: boolean
  accountCount?: number
}

export interface GroupTypeOption {
  value: string
  label: string
  subtitle: string
  color: string
  dotClass: string
}

export const GROUP_TYPES_DATA: GroupTypeOption[] = [
  {
    value: 'Customer',
    label: 'Customer',
    subtitle: 'Retail buyers & wholesale client accounts',
    color: 'emerald',
    dotClass: 'bg-emerald-500'
  },
  {
    value: 'Supplier',
    label: 'Supplier',
    subtitle: 'Gold/Silver bullion & material vendors',
    color: 'purple',
    dotClass: 'bg-purple-500'
  },
  {
    value: 'Karagir',
    label: 'Karagir',
    subtitle: 'Goldsmiths (Dhadi), stone setters & polishers',
    color: 'amber',
    dotClass: 'bg-amber-500'
  },
  {
    value: 'Cash',
    label: 'Cash',
    subtitle: 'Counter cash drawer & vault cash accounts',
    color: 'indigo',
    dotClass: 'bg-indigo-500'
  },
  {
    value: 'Bank',
    label: 'Bank',
    subtitle: 'Commercial current, savings & OD accounts',
    color: 'sky',
    dotClass: 'bg-sky-500'
  },
  {
    value: 'Expense',
    label: 'Expense',
    subtitle: 'Shop rent, staff salaries, utilities & tea',
    color: 'rose',
    dotClass: 'bg-rose-500'
  },
  {
    value: 'Other',
    label: 'Other',
    subtitle: 'Capital, drawings & general ledger heads',
    color: 'slate',
    dotClass: 'bg-slate-400'
  }
]

export const GROUP_TYPES = GROUP_TYPES_DATA.map((g) => g.value)

export const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active Only' },
  { value: 'INACTIVE', label: 'Inactive Only' }
]

const initialForm = {
  groupName: '',
  groupType: 'Customer',
  description: '',
  active: true
}

function renderGroupTypeBadge(type: string): React.JSX.Element {
  const normalized = (type || '').toLowerCase()

  if (normalized.includes('customer')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200 whitespace-nowrap">
        Customer
      </span>
    )
  }

  if (normalized.includes('supplier') || normalized.includes('bullion')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200 whitespace-nowrap">
        Supplier
      </span>
    )
  }

  if (normalized.includes('karagir') || normalized.includes('artisan')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
        Karagir
      </span>
    )
  }

  if (normalized.includes('cash')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 whitespace-nowrap">
        Cash
      </span>
    )
  }

  if (normalized.includes('bank')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
        Bank
      </span>
    )
  }

  if (normalized.includes('expense')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200 whitespace-nowrap">
        Expense
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap">
      {type || 'Other'}
    </span>
  )
}

function renderStatus(active: boolean): React.JSX.Element {
  if (active) {
    return (
      <span className="text-emerald-600 font-bold text-xs whitespace-nowrap">
        Active
      </span>
    )
  }

  return (
    <span className="text-slate-400 font-medium text-xs whitespace-nowrap">
      Inactive
    </span>
  )
}

/**
 * Custom Styled Group Type Dropdown Component
 */
interface GroupTypeSelectProps {
  value: string
  onChange: (val: string) => void
  onSelectNext?: () => void
}

function CustomGroupTypeDropdown({ value, onChange, onSelectNext }: GroupTypeSelectProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const selectedOption = useMemo(() => {
    return GROUP_TYPES_DATA.find((g) => g.value.toLowerCase() === value.toLowerCase()) || GROUP_TYPES_DATA[0]
  }, [value])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-10 px-3.5 flex items-center justify-between text-xs font-medium border rounded-lg bg-white transition-all cursor-pointer ${
          isOpen
            ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
            : 'border-slate-200 hover:border-slate-300 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${selectedOption.dotClass} shrink-0`} />
          <span className="font-semibold text-slate-800">{selectedOption.label}</span>
          <span className="text-slate-400 text-[11px] font-normal hidden sm:inline truncate max-w-[240px]">
            — {selectedOption.subtitle}
          </span>
        </div>

        <FiChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-600' : ''}`}
        />
      </button>

      {/* Floating Custom Dropdown Card */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden py-1 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Select Category / Group Type
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
            {GROUP_TYPES_DATA.map((opt) => {
              const isSelected = opt.value.toLowerCase() === value.toLowerCase()
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                    onSelectNext?.()
                  }}
                  className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer group ${
                    isSelected
                      ? 'bg-amber-50/70 text-amber-950 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${opt.dotClass} shrink-0`} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold leading-tight">{opt.label}</div>
                      <div className="text-[11px] text-slate-400 font-normal leading-tight mt-0.5 truncate">
                        {opt.subtitle}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="text-amber-600 font-bold ml-2 shrink-0">
                      <FiCheck size={16} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function AccountGroupScreen({ onClose: _onClose }: { onClose?: () => void }): React.JSX.Element {
  const [form, setForm] = useState(initialForm)
  const [groups, setGroups] = useState<AccountGroup[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AccountGroup | null>(null)
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)

  // Filters
  const [searchText, setSearchText] = useState('')
  const [groupTypeFilter, setGroupTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const groupNameInputRef = useRef<HTMLInputElement | null>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null)

  const selectedGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedId) || null
  }, [groups, selectedId])

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      // Type Filter
      if (groupTypeFilter !== 'ALL' && group.groupType.toLowerCase() !== groupTypeFilter.toLowerCase()) {
        return false
      }

      // Status Filter
      if (statusFilter === 'ACTIVE' && !group.active) return false
      if (statusFilter === 'INACTIVE' && group.active) return false

      // Search Query
      const query = searchText.trim().toLowerCase()
      if (!query) return true

      return (
        group.groupName.toLowerCase().includes(query) ||
        group.groupType.toLowerCase().includes(query) ||
        group.description.toLowerCase().includes(query)
      )
    })
  }, [groups, searchText, groupTypeFilter, statusFilter])

  const activeCount = useMemo(() => {
    return groups.filter((g) => g.active).length
  }, [groups])

  const hasActiveFilters = searchText.trim() !== '' || groupTypeFilter !== 'ALL' || statusFilter !== 'ALL'

  const handleClearFilters = useCallback(() => {
    setSearchText('')
    setGroupTypeFilter('ALL')
    setStatusFilter('ALL')
  }, [])

  const showAlert = useCallback((type: 'success' | 'error' | 'warning', message: string): void => {
    setAlert({ type, message })
  }, [])

  const clearAlert = useCallback((): void => {
    setAlert(null)
  }, [])

  const loadGroups = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.accountGroups.list()
      setGroups(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const openNewForm = useCallback((): void => {
    setEditingId(null)
    setForm(initialForm)
    setFormOpen(true)
    window.setTimeout(() => groupNameInputRef.current?.focus(), 50)
  }, [])

  const openEditForm = useCallback((group: AccountGroup): void => {
    setEditingId(group.id)
    setSelectedId(group.id)
    setForm({
      groupName: group.groupName,
      groupType: group.groupType,
      description: group.description,
      active: group.active
    })
    setFormOpen(true)
    window.setTimeout(() => groupNameInputRef.current?.focus(), 50)
  }, [])

  const closeForm = useCallback((): void => {
    setFormOpen(false)
    setEditingId(null)
    setForm(initialForm)
  }, [])

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return

    if (!form.groupName.trim()) {
      showAlert('warning', 'Please enter a valid Group Name.')
      groupNameInputRef.current?.focus()
      return
    }

    try {
      setSaving(true)

      const successMessage = editingId
        ? `Account group "${form.groupName}" updated successfully.`
        : `Account group "${form.groupName}" created successfully.`

      if (editingId) {
        await window.api.accountGroups.update(editingId, form)
      } else {
        await window.api.accountGroups.create(form)
      }

      closeForm()
      await loadGroups()
      showAlert('success', successMessage)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [closeForm, editingId, form, loadGroups, saving, showAlert])

  const requestDelete = useCallback((group: AccountGroup): void => {
    setDeleteTarget(group)
  }, [])

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await window.api.accountGroups.remove(deleteTarget.id)

      if (selectedId === deleteTarget.id) {
        setSelectedId(null)
      }

      if (editingId === deleteTarget.id) {
        closeForm()
      }

      setDeleteTarget(null)
      await loadGroups()
      showAlert('success', `Account group "${deleteTarget.groupName}" deleted successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelDelete = useCallback((): void => {
    if (deleting) return
    setDeleteTarget(null)
  }, [deleting])

  const handlePrint = useCallback((): void => {
    window.print()
  }, [])

  const handleExportCsv = useCallback((): void => {
    if (filteredGroups.length === 0) {
      showAlert('warning', 'No account groups to export.')
      return
    }

    const headers = ['Sr No', 'Group Name', 'Group Type', 'Linked Accounts', 'Description', 'Status']
    const rows = filteredGroups.map((g, i) => [
      i + 1,
      `"${g.groupName.replace(/"/g, '""')}"`,
      `"${g.groupType.replace(/"/g, '""')}"`,
      g.accountCount ?? 0,
      `"${(g.description || '').replace(/"/g, '""')}"`,
      g.active ? 'Active' : 'Inactive'
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `account_groups_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showAlert('success', `Exported ${filteredGroups.length} account groups to CSV.`)
  }, [filteredGroups, showAlert])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        openNewForm()
      } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        if (formOpen) {
          e.preventDefault()
          void handleSave()
        }
      } else if (e.key === 'Escape') {
        if (deleteTarget) {
          handleCancelDelete()
        } else if (formOpen) {
          closeForm()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeForm, deleteTarget, formOpen, handleCancelDelete, handleSave, openNewForm])

  // Load initial data
  useEffect(() => {
    void loadGroups()
  }, [loadGroups])



  return (
    <div className="flex flex-col h-full bg-[var(--color-background-app,#eef2f6)]">
      {/* Alert */}
      {alert && (
        <div className="px-6 pt-4 shrink-0">
          <AppAlert type={alert.type} message={alert.message} onClose={clearAlert} />
        </div>
      )}

      {/* Top Action Toolbar & Filter Bar */}
      <div className="px-6 pt-4 pb-2 shrink-0 space-y-3 no-print">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={openNewForm}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-amber-600 hover:bg-amber-700 active:bg-amber-800 !text-white text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-amber-500/20"
              style={{ color: '#ffffff' }}
            >
              <FiPlus size={15} className="stroke-[2.5]" />
              <span className="!text-white text-white font-semibold" style={{ color: '#ffffff' }}>
                Add New Group
              </span>
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-200 hover:border-slate-400 hover:text-slate-900 transition-colors shadow-sm"
              title="Print Account Groups"
            >
              <FiPrinter size={14} />
              Print
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 hover:border-emerald-400 hover:text-emerald-900 transition-colors shadow-sm"
              title="Export filtered groups to CSV"
            >
              <FiDownload size={14} />
              Export CSV
            </button>
          </div>

          <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 text-slate-500 select-none">
            Selected:{' '}
            <span className={`font-bold ${selectedGroup ? 'text-amber-700' : 'text-slate-400'}`}>
              {selectedGroup ? selectedGroup.groupName : 'None'}
            </span>
          </div>
        </div>

        {/* Filter Bar (Table View Only) */}
        {!formOpen && (
          <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex-wrap">
            {/* Group Type Filter */}
            <div className="relative">
              <select
                value={groupTypeFilter}
                onChange={(e) => setGroupTypeFilter(e.target.value)}
                className="h-9 text-xs border border-slate-200 rounded-md pl-3 pr-8 bg-slate-50 hover:bg-white text-slate-700 cursor-pointer min-w-[145px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium transition-colors appearance-none"
              >
                <option value="ALL">All Group Types</option>
                {GROUP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <FiChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 text-xs border border-slate-200 rounded-md pl-3 pr-8 bg-slate-50 hover:bg-white text-slate-700 cursor-pointer min-w-[120px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium transition-colors appearance-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <FiChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by group name, type, description..."
                className="w-full h-9 pl-9 pr-8 text-xs border border-slate-200 rounded-md bg-slate-50 hover:bg-white focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-0.5 transition-colors"
                >
                  <FiX size={12} />
                </button>
              )}
            </div>

            {/* Clear Filters button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="h-9 px-3 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="Reset all search filters"
              >
                <FiRotateCcw size={12} />
                Reset
              </button>
            )}

            {/* Count Badges */}
            <div className="flex items-center gap-2.5 text-[11px] text-slate-500 select-none ml-auto whitespace-nowrap bg-slate-50 px-3 py-1.5 rounded border border-slate-100">
              <span>
                Total <strong className="text-slate-700">{groups.length}</strong>
              </span>
              <div className="w-px h-3 bg-slate-300"></div>
              <span>
                Active <strong className="text-emerald-600">{activeCount}</strong>
              </span>
              <div className="w-px h-3 bg-slate-300"></div>
              <span>
                Showing <strong className="text-amber-700">{filteredGroups.length}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-hidden flex flex-col px-6 pb-5 pt-2 gap-4 min-h-0">
        {formOpen ? (
          /* Form View */
          <div className="flex-1 overflow-hidden flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                {editingId ? `Edit Account Group: ${form.groupName || 'Untitled'}` : 'Create New Account Group'}
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">Fields marked with * are mandatory</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Horizontal Row: Group Name & Group Type (2 Columns) */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Group Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="groupName" className="block text-xs font-bold text-slate-700">
                      Group Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="groupName"
                      ref={groupNameInputRef}
                      type="text"
                      value={form.groupName}
                      onChange={(e) => setForm({ ...form, groupName: e.target.value })}
                      placeholder="e.g. Retail Customers, Bullion Dealers, Karagirs"
                      className="w-full h-10 px-3.5 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-800"
                    />
                   
                  </div>

                  {/* Group Type (Horizontal side-by-side with Group Name) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Group Type <span className="text-rose-500">*</span>
                    </label>
                    <CustomGroupTypeDropdown
                      value={form.groupType}
                      onChange={(newVal) => setForm({ ...form, groupType: newVal })}
                      onSelectNext={() => descriptionInputRef.current?.focus()}
                    />
                    
                  </div>
                </div>

                {/* Description (Below the horizontal row) */}
                <div className="space-y-1.5">
                  <label htmlFor="description" className="block text-xs font-bold text-slate-700">
                    Description / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    id="description"
                    ref={descriptionInputRef}
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Enter short purpose, notes or details for this group..."
                    className="w-full p-3 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-800 resize-none"
                  />
                 
                </div>

                {/* Active Toggle Switch */}
                <div className="pt-1">
                  <label className="inline-flex items-start gap-3 cursor-pointer select-none p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="w-4 h-4 mt-0.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer shrink-0"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Active Status</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Active groups are enabled and selectable when creating or editing accounts in Account Master
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Form Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="h-9 px-4 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 h-9 px-5 rounded-md bg-amber-600 hover:bg-amber-700 !text-white text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
                style={{ color: '#ffffff' }}
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="!text-white text-white font-semibold">Saving...</span>
                  </>
                ) : (
                  <span className="!text-white text-white font-semibold">
                    {editingId ? 'Update Group' : 'Save Group'}
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Table View */
          <>
            <div className="flex-1 overflow-hidden min-h-0 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col">
              {/* Print-only title */}
              <div className="hidden print:block p-4 border-b border-slate-300 text-center">
                <h2 className="text-xl font-bold text-slate-900">ACCOUNT GROUP DIRECTORY</h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Generated on {new Date().toLocaleDateString()} · Total Records: {groups.length}
                </p>
              </div>

              <div className="w-full h-full overflow-auto">
                <table className="w-full text-xs text-left border-collapse print:text-[10px]">
                  <thead className="sticky top-0 z-10 bg-slate-200 text-slate-800 border-b border-slate-300 font-bold uppercase tracking-wider select-none print:static">
                    <tr className="border-l-4 border-l-slate-200">
                      <th className="py-3 px-3 w-16 text-center text-[10px] font-bold text-slate-700">Sr No</th>
                      <th className="py-3 px-4 min-w-[200px]">Group Name</th>
                      <th className="py-3 px-3 min-w-[130px]">Group Type</th>
                      <th className="py-3 px-3 text-center min-w-[120px]">Linked Accounts</th>
                      <th className="py-3 px-4 min-w-[240px]">Description</th>
                      <th className="py-3 px-3 text-center w-24">Status</th>
                      <th className="py-3 px-3 text-center w-24 no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-20 text-center text-slate-500">
                          <div className="inline-flex flex-col items-center gap-3">
                            <span className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            <span className="font-medium text-sm">Loading account groups...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredGroups.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-20 text-center text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <FiLayers size={36} className="text-slate-300" />
                            {searchText ? (
                              <p className="text-sm">
                                No account groups matching <span className="font-semibold text-slate-700">"{searchText}"</span>
                              </p>
                            ) : (
                              <p className="text-sm">
                                No account groups found. Click <span className="font-semibold text-amber-600">"Add New Group"</span> to create one.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredGroups.map((group, index) => {
                        const isSelected = selectedId === group.id
                        return (
                          <tr
                            key={group.id}
                            onClick={() => setSelectedId(group.id)}
                            onDoubleClick={() => openEditForm(group)}
                            className={`transition-colors cursor-pointer select-none group ${
                              isSelected
                                ? 'bg-amber-50/90 border-l-4 border-l-amber-500 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] relative'
                                : 'border-l-4 border-l-transparent hover:bg-slate-100 hover:border-l-amber-300 hover:shadow-[0_2px_4px_rgba(0,0,0,0.02)]'
                            }`}
                          >
                            {/* Sr No */}
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block min-w-[22px] text-center font-semibold text-[11px] text-slate-500 bg-slate-100/80 px-1.5 py-0.5 rounded">
                                {index + 1}
                              </span>
                            </td>

                            {/* Group Name */}
                            <td className="py-3 px-4">
                              <div className={`font-semibold ${isSelected ? 'text-amber-950' : 'text-slate-900'}`}>
                                {group.groupName}
                              </div>
                            </td>

                            {/* Group Type Badge */}
                            <td className="py-3 px-3">
                              {renderGroupTypeBadge(group.groupType)}
                            </td>

                            {/* Linked Accounts Count */}
                            <td className="py-3 px-3 text-center">
                              {group.accountCount && group.accountCount > 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  {group.accountCount} {group.accountCount === 1 ? 'account' : 'accounts'}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono text-xs">-</span>
                              )}
                            </td>

                            {/* Description */}
                            <td className="py-3 px-4 text-slate-600">
                              {group.description ? (
                                <span className="line-clamp-1">{group.description}</span>
                              ) : (
                                <span className="text-slate-300 font-mono">-</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3 text-center">
                              {renderStatus(group.active)}
                            </td>

                            {/* Actions */}
                            <td className="py-2.5 px-2 text-center no-print">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openEditForm(group)
                                  }}
                                  className="p-1.5 rounded-md text-amber-600 hover:text-amber-900 hover:bg-amber-100 transition-all"
                                  title="Edit Account Group"
                                >
                                  <FiEdit2 size={16} className="stroke-[2.2]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    requestDelete(group)
                                  }}
                                  className="p-1.5 rounded-md text-rose-500 hover:text-rose-800 hover:bg-rose-100 transition-all"
                                  title="Delete Account Group"
                                >
                                  <FiTrash2 size={16} className="stroke-[2.2]" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation / In-Use Warning Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={
          deleteTarget && deleteTarget.accountCount && deleteTarget.accountCount > 0
            ? 'Cannot Delete Group (In Use)'
            : 'Delete Account Group?'
        }
        description={
          deleteTarget
            ? deleteTarget.accountCount && deleteTarget.accountCount > 0
              ? `Cannot delete "${deleteTarget.groupName}" because ${deleteTarget.accountCount} active account(s) are linked to this group in Account Master. Please reassign or delete those accounts first.`
              : `Are you sure you want to delete "${deleteTarget.groupName}"? This action cannot be undone.`
            : ''
        }
        confirmLabel={
          deleteTarget && deleteTarget.accountCount && deleteTarget.accountCount > 0
            ? undefined
            : 'Delete Group'
        }
        cancelLabel={
          deleteTarget && deleteTarget.accountCount && deleteTarget.accountCount > 0
            ? 'Close'
            : 'Cancel'
        }
        variant={
          deleteTarget && deleteTarget.accountCount && deleteTarget.accountCount > 0
            ? 'warning'
            : 'danger'
        }
        loading={deleting}
        onConfirm={() => {
          if (deleteTarget && deleteTarget.accountCount && deleteTarget.accountCount > 0) {
            handleCancelDelete()
            return
          }
          void handleConfirmDelete()
        }}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}

export default AccountGroupScreen
