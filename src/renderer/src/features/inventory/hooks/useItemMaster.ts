import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { useAlert, useConfirmModal } from '@renderer/hooks'
import type { ItemFormValues, ItemGroupOption, ItemStampOption, ItemDesignOption } from '../components/ItemForm'
import type { ItemRecord } from '../components/ItemTable'

const initialForm: ItemFormValues = {
  itemName: '',
  metalType: 'Silver',
  itemGroupId: '',
  defaultStampId: '',
  defaultDesignId: '',
  barcodeItem: false,
  barcodeType: '',
  labourChargesBy: 'Kg',
  salePurchaseBy: 'Fine',
  gstHsnCode: '',
  fixedWeightPerPcs: '',
  defaultTanch: '',
  defaultWastage: '',
  defaultLabourRate: '',
  labourRateType: 'Kg',
  active: true
}

function toNumber(value: string | number): number {
  if (value === '') return 0
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

export function useItemMaster() {
  const { alert, showAlert, clearAlert } = useAlert()
  const {
    target: deleteTarget,
    loading: deleting,
    requestConfirm: requestDelete,
    handleConfirm: confirmDelete,
    handleCancel: handleCancelDelete
  } = useConfirmModal<ItemRecord>()

  const [form, setForm] = useState<ItemFormValues>(initialForm)
  const [items, setItems] = useState<ItemRecord[]>([])
  const [itemGroups, setItemGroups] = useState<ItemGroupOption[]>([])
  const [itemStamps, setItemStamps] = useState<ItemStampOption[]>([])
  const [itemDesigns, setItemDesigns] = useState<ItemDesignOption[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchText, setSearchText] = useState('')

  const itemNameInputRef = useRef<HTMLInputElement | null>(null)
  const metalTypeSelectRef = useRef<HTMLSelectElement | null>(null)
  const itemGroupSelectRef = useRef<HTMLSelectElement | null>(null)
  const stampSelectRef = useRef<HTMLSelectElement | null>(null)
  const designSelectRef = useRef<HTMLSelectElement | null>(null)
  const barcodeItemSelectRef = useRef<HTMLSelectElement | null>(null)
  const barcodeTypeSelectRef = useRef<HTMLSelectElement | null>(null)
  const labourChargesSelectRef = useRef<HTMLSelectElement | null>(null)
  const salePurchaseSelectRef = useRef<HTMLSelectElement | null>(null)
  const hsnInputRef = useRef<HTMLInputElement | null>(null)
  const packWeightInputRef = useRef<HTMLInputElement | null>(null)
  const tanchInputRef = useRef<HTMLInputElement | null>(null)
  const wastageInputRef = useRef<HTMLInputElement | null>(null)
  const labourRateInputRef = useRef<HTMLInputElement | null>(null)
  const labourRateTypeSelectRef = useRef<HTMLSelectElement | null>(null)
  const activeCheckboxRef = useRef<HTMLInputElement | null>(null)

  const activeGroups = useMemo(() => {
    return itemGroups.filter((group) => group.active && group.metalType === form.metalType)
  }, [itemGroups, form.metalType])

  const activeStamps = useMemo(() => {
    return itemStamps.filter((stamp) => stamp.active && stamp.metalType === form.metalType)
  }, [itemStamps, form.metalType])

  const activeDesigns = useMemo(() => {
    return itemDesigns.filter((design) => design.active && design.metalType === form.metalType)
  }, [itemDesigns, form.metalType])

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return items

    return items.filter((item) => {
      return (
        item.itemName.toLowerCase().includes(keyword) ||
        item.metalType.toLowerCase().includes(keyword) ||
        item.groupName.toLowerCase().includes(keyword) ||
        item.stampName.toLowerCase().includes(keyword) ||
        item.designName.toLowerCase().includes(keyword) ||
        item.gstHsnCode.toLowerCase().includes(keyword) ||
        item.labourChargesBy.toLowerCase().includes(keyword) ||
        item.salePurchaseBy.toLowerCase().includes(keyword) ||
        item.labourRateType.toLowerCase().includes(keyword)
      )
    })
  }, [items, searchText])

  const activeCount = useMemo(() => {
    return items.filter((item) => item.active).length
  }, [items])

  const focusItemName = useCallback((): void => {
    window.setTimeout(() => {
      itemNameInputRef.current?.focus()
    }, 0)
  }, [])

  const getFirstGroupId = useCallback(
    (metalType: string): string => {
      const firstGroup = itemGroups.find((group) => group.active && group.metalType === metalType)
      return firstGroup?.id ?? ''
    },
    [itemGroups]
  )

  const loadItems = useCallback(async (): Promise<void> => {
    const data = await window.api.items.list()
    setItems(data)
  }, [])

  const handleNew = useCallback((): void => {
    const defaultMetal = 'Silver'
    setEditingId(null)
    setForm({
      ...initialForm,
      metalType: defaultMetal,
      itemGroupId: getFirstGroupId(defaultMetal)
    })
    focusItemName()
  }, [focusItemName, getFirstGroupId])

  const handleMetalChange = useCallback(
    (metalType: string): void => {
      const firstGroupId = getFirstGroupId(metalType)
      setForm((current) => ({
        ...current,
        metalType,
        itemGroupId: firstGroupId,
        defaultStampId: '',
        defaultDesignId: ''
      }))
    },
    [getFirstGroupId]
  )

  const validateForm = useCallback((): boolean => {
    if (!form.itemName.trim()) {
      showAlert('warning', 'Please enter item name.')
      itemNameInputRef.current?.focus()
      return false
    }

    if (!form.itemGroupId) {
      showAlert('warning', 'Please select item group.')
      itemGroupSelectRef.current?.focus()
      return false
    }

    return true
  }, [form.itemGroupId, form.itemName, showAlert])

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return
    if (!validateForm()) return

    try {
      setSaving(true)

      const payload = {
        itemName: form.itemName.trim(),
        metalType: form.metalType,
        itemGroupId: form.itemGroupId,
        defaultStampId: form.defaultStampId,
        defaultDesignId: form.defaultDesignId,
        barcodeItem: form.barcodeItem,
        barcodeType: form.barcodeItem ? form.barcodeType : '',
        labourChargesBy: form.labourChargesBy,
        salePurchaseBy: form.salePurchaseBy,
        gstHsnCode: form.gstHsnCode.trim(),
        fixedWeightPerPcs: toNumber(form.fixedWeightPerPcs),
        defaultTanch: toNumber(form.defaultTanch),
        defaultWastage: toNumber(form.defaultWastage),
        defaultLabourRate: toNumber(form.defaultLabourRate),
        labourRateType: form.labourRateType,
        active: form.active
      }

      const successMessage = editingId ? 'Item updated successfully.' : 'Item saved successfully.'

      if (editingId) {
        await window.api.items.update(editingId, payload)
      } else {
        await window.api.items.create(payload)
      }

      await loadItems()
      handleNew()
      showAlert('success', successMessage)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [editingId, form, handleNew, loadItems, saving, showAlert, validateForm])

  const handleEdit = (item: ItemRecord): void => {
    setEditingId(item.id)
    setForm({
      itemName: item.itemName,
      metalType: item.metalType,
      itemGroupId: item.itemGroupId,
      defaultStampId: item.defaultStampId,
      defaultDesignId: item.defaultDesignId,
      barcodeItem: item.barcodeItem,
      barcodeType: item.barcodeType,
      labourChargesBy: ['Kg', 'Gm', 'Pcs'].includes(item.labourChargesBy)
        ? item.labourChargesBy
        : 'Kg',
      salePurchaseBy: ['Fine', 'Weight', 'Pcs'].includes(item.salePurchaseBy)
        ? item.salePurchaseBy
        : 'Fine',
      gstHsnCode: item.gstHsnCode,
      fixedWeightPerPcs: item.fixedWeightPerPcs === 0 ? '' : String(item.fixedWeightPerPcs),
      defaultTanch: item.defaultTanch === 0 ? '' : String(item.defaultTanch),
      defaultWastage: item.defaultWastage === 0 ? '' : String(item.defaultWastage),
      defaultLabourRate: item.defaultLabourRate === 0 ? '' : String(item.defaultLabourRate),
      labourRateType: item.labourRateType || 'Kg',
      active: item.active
    })
    focusItemName()
  }

  const handleConfirmDelete = async (): Promise<void> => {
    await confirmDelete(async (target) => {
      try {
        await window.api.items.remove(target.id)
        if (editingId === target.id) {
          handleNew()
        }
        await loadItems()
        showAlert('success', 'Item deleted successfully.')
      } catch (error) {
        showAlert('error', getFriendlyErrorMessage(error))
      }
    })
  }

  useEffect(() => {
    let cancelled = false

    Promise.all([
      window.api.itemGroups.list(),
      window.api.itemStamps.list(),
      window.api.itemDesigns.list(),
      window.api.items.list()
    ])
      .then(([groups, stamps, designs, itemData]) => {
        if (cancelled) return

        setItemGroups(groups)
        setItemStamps(stamps)
        setItemDesigns(designs)
        setItems(itemData)

        const firstSilverGroup = groups.find(
          (group) => group.active && group.metalType === 'Silver'
        )
        if (firstSilverGroup) {
          setForm((current) => ({
            ...current,
            itemGroupId: current.itemGroupId || firstSilverGroup.id
          }))
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) showAlert('error', getFriendlyErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    focusItemName()

    return () => {
      cancelled = true
    }
  }, [focusItemName, showAlert])

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
    items,
    editingId,
    deleteTarget,
    loading,
    saving,
    deleting,
    searchText,
    setSearchText,
    activeGroups,
    activeStamps,
    activeDesigns,
    filteredItems,
    activeCount,
    handleNew,
    handleMetalChange,
    handleSave,
    handleEdit,
    requestDelete,
    handleConfirmDelete,
    handleCancelDelete,
    itemNameInputRef,
    metalTypeSelectRef,
    itemGroupSelectRef,
    stampSelectRef,
    designSelectRef,
    barcodeItemSelectRef,
    barcodeTypeSelectRef,
    labourChargesSelectRef,
    salePurchaseSelectRef,
    hsnInputRef,
    packWeightInputRef,
    tanchInputRef,
    wastageInputRef,
    labourRateInputRef,
    labourRateTypeSelectRef,
    activeCheckboxRef
  }
}
