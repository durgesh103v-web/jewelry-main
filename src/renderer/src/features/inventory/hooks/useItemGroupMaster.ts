import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { useAlert, useConfirmModal } from '@renderer/hooks'
import type { ItemGroupFormValues } from '../components/ItemGroupForm'
import type { ItemGroupRecord } from '../components/ItemGroupTable'

const initialForm: ItemGroupFormValues = {
  groupName: '',
  metalType: 'Gold',
  description: '',
  active: true,
  prefix: '',
  hsnCode: '7113',
  gstRate: '3.0',
  defaultPurity: '22K',
  defaultLabourRate: '',
  defaultLabourType: 'PER_GRAM',
  defaultWastage: ''
}

export function useItemGroupMaster() {
  const { alert, showAlert, clearAlert } = useAlert()
  const {
    target: deleteTarget,
    loading: deleting,
    requestConfirm: requestDelete,
    handleConfirm: confirmDelete,
    handleCancel: handleCancelDelete
  } = useConfirmModal<ItemGroupRecord>()

  const [form, setForm] = useState<ItemGroupFormValues>(initialForm)
  const [itemGroups, setItemGroups] = useState<ItemGroupRecord[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [metalTypeFilter, setMetalTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const groupNameRef = useRef<HTMLInputElement | null>(null)

  const selectedGroup = useMemo(() => {
    return itemGroups.find((g) => g.id === selectedGroupId) || null
  }, [itemGroups, selectedGroupId])

  const hasActiveFilters = useMemo(() => {
    return Boolean(searchText.trim()) || metalTypeFilter !== 'ALL' || statusFilter !== 'ALL'
  }, [searchText, metalTypeFilter, statusFilter])

  const handleClearFilters = useCallback(() => {
    setSearchText('')
    setMetalTypeFilter('ALL')
    setStatusFilter('ALL')
  }, [])

  const filteredGroups = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return itemGroups.filter((group) => {
      const metalMatch =
        metalTypeFilter === 'ALL' || group.metalType.toLowerCase() === metalTypeFilter.toLowerCase()

      const statusMatch =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && group.active) ||
        (statusFilter === 'INACTIVE' && !group.active)

      const keywordMatch =
        !keyword ||
        group.groupName.toLowerCase().includes(keyword) ||
        group.metalType.toLowerCase().includes(keyword) ||
        (group.prefix && group.prefix.toLowerCase().includes(keyword)) ||
        (group.hsnCode && group.hsnCode.toLowerCase().includes(keyword)) ||
        (group.defaultPurity && group.defaultPurity.toLowerCase().includes(keyword)) ||
        group.description.toLowerCase().includes(keyword)

      return metalMatch && statusMatch && keywordMatch
    })
  }, [itemGroups, metalTypeFilter, statusFilter, searchText])

  const activeCount = useMemo(() => {
    return itemGroups.filter((group) => group.active).length
  }, [itemGroups])

  const focusGroupName = useCallback((): void => {
    window.setTimeout(() => {
      groupNameRef.current?.focus()
    }, 50)
  }, [])

  const loadItemGroups = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.itemGroups.list()
      setItemGroups(data)
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
    focusGroupName()
  }, [focusGroupName])

  const openEditForm = useCallback(
    (group: ItemGroupRecord): void => {
      setEditingId(group.id)
      setSelectedGroupId(group.id)
      setForm({
        groupName: group.groupName,
        metalType: group.metalType,
        description: group.description,
        active: group.active,
        prefix: group.prefix ?? '',
        hsnCode: group.hsnCode ?? '7113',
        gstRate: String(group.gstRate ?? 3.0),
        defaultPurity: group.defaultPurity ?? '',
        defaultLabourRate: group.defaultLabourRate ? String(group.defaultLabourRate) : '',
        defaultLabourType: (group.defaultLabourType as 'PER_GRAM' | 'PER_PIECE' | 'PERCENT') || 'PER_GRAM',
        defaultWastage: group.defaultWastage ? String(group.defaultWastage) : ''
      })
      setFormOpen(true)
      focusGroupName()
    },
    [focusGroupName]
  )

  const closeForm = useCallback((): void => {
    setFormOpen(false)
    setEditingId(null)
    setForm(initialForm)
  }, [])

  const handleSave = useCallback(
    async (andNew = false): Promise<void> => {
      if (saving) return

      if (!form.groupName.trim()) {
        showAlert('warning', 'Please enter item group name.')
        groupNameRef.current?.focus()
        return
      }

      try {
        setSaving(true)

        const payload = {
          groupName: form.groupName.trim(),
          metalType: form.metalType,
          description: form.description.trim(),
          active: form.active,
          prefix: form.prefix.trim().toUpperCase(),
          hsnCode: form.hsnCode.trim() || '7113',
          gstRate: Number(form.gstRate || 3.0),
          defaultPurity: form.defaultPurity.trim(),
          defaultLabourRate: Number(form.defaultLabourRate || 0),
          defaultLabourType: form.defaultLabourType || 'PER_GRAM',
          defaultWastage: Number(form.defaultWastage || 0)
        }

        const successMessage = editingId
          ? 'Item group updated successfully.'
          : 'Item group saved successfully.'

        if (editingId) {
          await window.api.itemGroups.update(editingId, payload as any)
        } else {
          await window.api.itemGroups.create(payload as any)
        }

        await loadItemGroups()
        showAlert('success', successMessage)

        if (andNew) {
          setEditingId(null)
          setForm(initialForm)
          focusGroupName()
        } else {
          closeForm()
        }
      } catch (error) {
        showAlert('error', getFriendlyErrorMessage(error))
      } finally {
        setSaving(false)
      }
    },
    [closeForm, editingId, focusGroupName, form, loadItemGroups, saving, showAlert]
  )

  const handleConfirmDelete = async (): Promise<void> => {
    await confirmDelete(async (target) => {
      try {
        await window.api.itemGroups.remove(target.id)
        if (editingId === target.id) {
          closeForm()
        }
        await loadItemGroups()
        showAlert('success', 'Item group deleted successfully.')
      } catch (error) {
        showAlert('error', getFriendlyErrorMessage(error))
      }
    })
  }

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleExportCsv = useCallback(() => {
    if (filteredGroups.length === 0) {
      showAlert('warning', 'No item groups to export.')
      return
    }

    const headers = ['Sr No', 'Prefix', 'Group Name', 'Metal Type', 'HSN Code', 'GST %', 'Default Purity', 'Making Rate', 'Wastage %', 'Description', 'Status']
    const rows = filteredGroups.map((g, idx) => [
      idx + 1,
      `"${g.prefix || ''}"`,
      `"${g.groupName.replace(/"/g, '""')}"`,
      `"${g.metalType}"`,
      `"${g.hsnCode || '7113'}"`,
      g.gstRate ?? 3.0,
      `"${g.defaultPurity || ''}"`,
      g.defaultLabourRate ?? 0,
      g.defaultWastage ?? 0,
      `"${(g.description || '').replace(/"/g, '""')}"`,
      g.active ? 'Active' : 'Inactive'
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `item_groups_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showAlert('success', 'Item groups exported to CSV successfully.')
  }, [filteredGroups, showAlert])

  useEffect(() => {
    let cancelled = false

    window.api.itemGroups
      .list()
      .then((data) => {
        if (!cancelled) setItemGroups(data)
      })
      .catch((error: unknown) => {
        if (!cancelled) showAlert('error', getFriendlyErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [showAlert])

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        openNewForm()
      }

      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        if (formOpen) {
          event.preventDefault()
          void handleSave(false)
        }
      }

      if (event.key === 'Escape') {
        if (deleteTarget) {
          handleCancelDelete()
          return
        }

        if (formOpen) {
          closeForm()
        }
      }
    }

    window.addEventListener('keydown', handleKeyboard)

    return () => {
      window.removeEventListener('keydown', handleKeyboard)
    }
  }, [closeForm, deleteTarget, formOpen, handleCancelDelete, handleSave, openNewForm])

  return {
    alert,
    clearAlert,
    form,
    setForm,
    itemGroups,
    editingId,
    selectedGroupId,
    setSelectedGroupId,
    selectedGroup,
    deleteTarget,
    formOpen,
    loading,
    saving,
    deleting,
    searchText,
    setSearchText,
    metalTypeFilter,
    setMetalTypeFilter,
    statusFilter,
    setStatusFilter,
    hasActiveFilters,
    handleClearFilters,
    filteredGroups,
    activeCount,
    openNewForm,
    openEditForm,
    closeForm,
    handleSave,
    requestDelete,
    handleConfirmDelete,
    handleCancelDelete,
    handlePrint,
    handleExportCsv,
    groupNameRef
  }
}
