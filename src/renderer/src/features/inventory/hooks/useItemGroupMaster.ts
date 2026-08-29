import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { useAlert, useConfirmModal } from '@renderer/hooks'
import type { ItemGroupFormValues } from '../components/ItemGroupForm'
import type { ItemGroupRecord } from '../components/ItemGroupTable'

const initialForm: ItemGroupFormValues = {
  groupName: '',
  metalType: 'Silver',
  description: '',
  active: true
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchText, setSearchText] = useState('')

  const groupNameInputRef = useRef<HTMLInputElement | null>(null)
  const metalTypeSelectRef = useRef<HTMLSelectElement | null>(null)
  const descriptionInputRef = useRef<HTMLInputElement | null>(null)
  const activeCheckboxRef = useRef<HTMLInputElement | null>(null)

  const filteredGroups = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return itemGroups

    return itemGroups.filter((group) => {
      return (
        group.groupName.toLowerCase().includes(keyword) ||
        group.metalType.toLowerCase().includes(keyword) ||
        group.description.toLowerCase().includes(keyword) ||
        (group.active ? 'yes' : 'no').includes(keyword)
      )
    })
  }, [itemGroups, searchText])

  const activeCount = useMemo(() => {
    return itemGroups.filter((group) => group.active).length
  }, [itemGroups])

  const focusGroupName = useCallback((): void => {
    window.setTimeout(() => {
      groupNameInputRef.current?.focus()
    }, 0)
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

  const handleNew = useCallback((): void => {
    setEditingId(null)
    setForm(initialForm)
    focusGroupName()
  }, [focusGroupName])

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return

    if (!form.groupName.trim()) {
      showAlert('warning', 'Please enter item group name.')
      groupNameInputRef.current?.focus()
      return
    }

    try {
      setSaving(true)

      const payload = {
        ...form,
        groupName: form.groupName.trim(),
        description: form.description.trim()
      }

      const successMessage = editingId
        ? 'Item group updated successfully.'
        : 'Item group saved successfully.'

      if (editingId) {
        await window.api.itemGroups.update(editingId, payload)
      } else {
        await window.api.itemGroups.create(payload)
      }

      await loadItemGroups()
      handleNew()
      showAlert('success', successMessage)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [editingId, form, handleNew, loadItemGroups, saving, showAlert])

  const handleEdit = (group: ItemGroupRecord): void => {
    setEditingId(group.id)
    setForm({
      groupName: group.groupName,
      metalType: group.metalType,
      description: group.description,
      active: group.active
    })
    focusGroupName()
  }

  const handleConfirmDelete = async (): Promise<void> => {
    await confirmDelete(async (target) => {
      try {
        await window.api.itemGroups.remove(target.id)
        if (editingId === target.id) {
          handleNew()
        }
        await loadItemGroups()
        showAlert('success', 'Item group deleted successfully.')
      } catch (error) {
        showAlert('error', getFriendlyErrorMessage(error))
      }
    })
  }

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

    focusGroupName()

    return () => {
      cancelled = true
    }
  }, [focusGroupName, showAlert])

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        handleNew()
      }

      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handleSave()
      }

      if (event.key === 'Escape') {
        if (deleteTarget) {
          handleCancelDelete()
          return
        }

        if (editingId) {
          handleNew()
        }
      }
    }

    window.addEventListener('keydown', handleKeyboard)

    return () => {
      window.removeEventListener('keydown', handleKeyboard)
    }
  }, [deleteTarget, editingId, handleCancelDelete, handleNew, handleSave])

  return {
    alert,
    clearAlert,
    form,
    setForm,
    itemGroups,
    editingId,
    deleteTarget,
    loading,
    saving,
    deleting,
    searchText,
    setSearchText,
    filteredGroups,
    activeCount,
    handleNew,
    handleSave,
    handleEdit,
    requestDelete,
    handleConfirmDelete,
    handleCancelDelete,
    groupNameInputRef,
    metalTypeSelectRef,
    descriptionInputRef,
    activeCheckboxRef
  }
}
