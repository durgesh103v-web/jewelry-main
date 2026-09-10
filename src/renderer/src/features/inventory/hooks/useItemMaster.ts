import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { useAlert, useConfirmModal } from '@renderer/hooks'
import type { ItemFormValues, ItemGroupOption, ItemStampOption, ItemDesignOption } from '../components/ItemForm'
import type { ItemRecord } from '../components/ItemTable'

const initialForm: ItemFormValues = {
  itemCode: '',
  itemName: '',
  metalType: 'Gold',
  itemGroupId: '',
  defaultStampId: '',
  defaultDesignId: '',
  purityKarat: '22K',
  isStudded: false,
  stoneDeductionType: 'None',
  huidRequired: false,
  minStockQty: '',
  minStockWeight: '',
  description: '',
  barcodeItem: false,
  barcodeType: '',
  labourChargesBy: 'Gm',
  salePurchaseBy: 'Fine',
  gstHsnCode: '7113',
  gstRate: '3',
  fixedWeightPerPcs: '',
  defaultTanch: '91.6',
  defaultWastage: '',
  defaultLabourRate: '',
  labourRateType: 'Gm',
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
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [metalTypeFilter, setMetalTypeFilter] = useState('ALL')
  const [itemGroupFilter, setItemGroupFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [barcodeFilter, setBarcodeFilter] = useState('ALL')

  const itemNameRef = useRef<HTMLInputElement | null>(null)

  const activeGroups = useMemo(() => {
    return itemGroups.filter((group) => group.active && (group.metalType === form.metalType || !group.metalType))
  }, [itemGroups, form.metalType])

  const activeStamps = useMemo(() => {
    return itemStamps.filter((stamp) => stamp.active && (stamp.metalType === form.metalType || !stamp.metalType))
  }, [itemStamps, form.metalType])

  const activeDesigns = useMemo(() => {
    return itemDesigns.filter((design) => design.active && (design.metalType === form.metalType || !design.metalType))
  }, [itemDesigns, form.metalType])

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === selectedItemId) || null
  }, [items, selectedItemId])

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(searchText.trim()) ||
      metalTypeFilter !== 'ALL' ||
      itemGroupFilter !== 'ALL' ||
      statusFilter !== 'ALL' ||
      barcodeFilter !== 'ALL'
    )
  }, [searchText, metalTypeFilter, itemGroupFilter, statusFilter, barcodeFilter])

  const handleClearFilters = useCallback(() => {
    setSearchText('')
    setMetalTypeFilter('ALL')
    setItemGroupFilter('ALL')
    setStatusFilter('ALL')
    setBarcodeFilter('ALL')
  }, [])

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return items.filter((item) => {
      // 1. Metal Type
      const metalMatch = metalTypeFilter === 'ALL' || item.metalType.toLowerCase() === metalTypeFilter.toLowerCase()

      // 2. Group
      const groupMatch =
        itemGroupFilter === 'ALL' ||
        item.itemGroupId === itemGroupFilter ||
        item.groupName === itemGroupFilter

      // 3. Status
      const statusMatch =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && item.active) ||
        (statusFilter === 'INACTIVE' && !item.active)

      // 4. Barcode
      const barcodeMatch =
        barcodeFilter === 'ALL' ||
        (barcodeFilter === 'BARCODED' && item.barcodeItem) ||
        (barcodeFilter === 'NON_BARCODED' && !item.barcodeItem)

      // 5. Search keyword
      const keywordMatch =
        !keyword ||
        item.itemCode.toLowerCase().includes(keyword) ||
        item.itemName.toLowerCase().includes(keyword) ||
        item.metalType.toLowerCase().includes(keyword) ||
        item.groupName.toLowerCase().includes(keyword) ||
        item.purityKarat.toLowerCase().includes(keyword) ||
        item.gstHsnCode.toLowerCase().includes(keyword) ||
        item.stampName.toLowerCase().includes(keyword) ||
        item.designName.toLowerCase().includes(keyword)

      return metalMatch && groupMatch && statusMatch && barcodeMatch && keywordMatch
    })
  }, [items, metalTypeFilter, itemGroupFilter, statusFilter, barcodeFilter, searchText])

  const activeCount = useMemo(() => {
    return items.filter((item) => item.active).length
  }, [items])

  const focusItemName = useCallback((): void => {
    window.setTimeout(() => {
      itemNameRef.current?.focus()
    }, 50)
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

  const openNewForm = useCallback((): void => {
    const defaultMetal = 'Gold'
    setEditingId(null)
    setForm({
      ...initialForm,
      metalType: defaultMetal,
      itemGroupId: getFirstGroupId(defaultMetal)
    })
    setFormOpen(true)
    focusItemName()
  }, [focusItemName, getFirstGroupId])

  const openEditForm = useCallback((item: ItemRecord): void => {
    setEditingId(item.id)
    setSelectedItemId(item.id)
    setForm({
      itemCode: item.itemCode || '',
      itemName: item.itemName,
      metalType: item.metalType,
      itemGroupId: item.itemGroupId,
      defaultStampId: item.defaultStampId || '',
      defaultDesignId: item.defaultDesignId || '',
      purityKarat: item.purityKarat || '',
      isStudded: Boolean(item.isStudded),
      stoneDeductionType: item.stoneDeductionType || 'None',
      huidRequired: Boolean(item.huidRequired),
      minStockQty: item.minStockQty === 0 ? '' : String(item.minStockQty),
      minStockWeight: item.minStockWeight === 0 ? '' : String(item.minStockWeight),
      description: item.description || '',
      barcodeItem: item.barcodeItem,
      barcodeType: item.barcodeType || '',
      labourChargesBy: item.labourChargesBy || 'Gm',
      salePurchaseBy: item.salePurchaseBy || 'Fine',
      gstHsnCode: item.gstHsnCode || '7113',
      gstRate: String(item.gstRate ?? 3),
      fixedWeightPerPcs: item.fixedWeightPerPcs === 0 ? '' : String(item.fixedWeightPerPcs),
      defaultTanch: item.defaultTanch === 0 ? '' : String(item.defaultTanch),
      defaultWastage: item.defaultWastage === 0 ? '' : String(item.defaultWastage),
      defaultLabourRate: item.defaultLabourRate === 0 ? '' : String(item.defaultLabourRate),
      labourRateType: item.labourRateType || 'Gm',
      active: item.active
    })
    setFormOpen(true)
    focusItemName()
  }, [focusItemName])

  const closeForm = useCallback((): void => {
    setFormOpen(false)
    setEditingId(null)
  }, [])

  const handleMetalChange = useCallback(
    (metalType: string): void => {
      const firstGroupId = getFirstGroupId(metalType)
      let defaultKarat = ''
      let defaultTanch = ''
      if (metalType === 'Gold') {
        defaultKarat = '22K'
        defaultTanch = '91.6'
      } else if (metalType === 'Silver') {
        defaultKarat = '925'
        defaultTanch = '92.5'
      } else if (metalType === 'Platinum') {
        defaultKarat = 'Pt950'
        defaultTanch = '95.0'
      }

      setForm((current) => ({
        ...current,
        metalType,
        itemGroupId: firstGroupId,
        defaultStampId: '',
        defaultDesignId: '',
        purityKarat: defaultKarat,
        defaultTanch: defaultTanch || current.defaultTanch
      }))
    },
    [getFirstGroupId]
  )

  const validateForm = useCallback((): boolean => {
    if (!form.itemName.trim()) {
      showAlert('warning', 'Please enter item name.')
      itemNameRef.current?.focus()
      return false
    }

    if (!form.itemGroupId) {
      showAlert('warning', 'Please select item group.')
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
        itemCode: form.itemCode.trim(),
        itemName: form.itemName.trim(),
        metalType: form.metalType,
        itemGroupId: form.itemGroupId,
        defaultStampId: form.defaultStampId,
        defaultDesignId: form.defaultDesignId,
        purityKarat: form.purityKarat,
        isStudded: form.isStudded,
        stoneDeductionType: form.stoneDeductionType,
        huidRequired: form.huidRequired,
        minStockQty: toNumber(form.minStockQty),
        minStockWeight: toNumber(form.minStockWeight),
        description: form.description.trim(),
        barcodeItem: form.barcodeItem,
        barcodeType: form.barcodeItem ? form.barcodeType : '',
        labourChargesBy: form.labourChargesBy,
        salePurchaseBy: form.salePurchaseBy,
        gstHsnCode: form.gstHsnCode.trim(),
        gstRate: toNumber(form.gstRate) || 3.0,
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
      closeForm()
      showAlert('success', successMessage)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [closeForm, editingId, form, loadItems, saving, showAlert, validateForm])

  const handleConfirmDelete = async (): Promise<void> => {
    await confirmDelete(async (target) => {
      try {
        await window.api.items.remove(target.id)
        if (editingId === target.id) {
          closeForm()
        }
        await loadItems()
        showAlert('success', 'Item deleted successfully.')
      } catch (error) {
        showAlert('error', getFriendlyErrorMessage(error))
      }
    })
  }

  const handlePrint = useCallback((): void => {
    window.print()
  }, [])

  const handleExportCsv = useCallback((): void => {
    if (filteredItems.length === 0) {
      showAlert('warning', 'No items to export.')
      return
    }

    const headers = [
      'Item Code',
      'Item Name',
      'Metal Type',
      'Group Name',
      'Purity Karat',
      'Default Tunch %',
      'Default Wastage %',
      'Making Rate',
      'Making Unit',
      'GST %',
      'HSN Code',
      'Barcode Item',
      'Barcode Type',
      'HUID Required',
      'Is Studded',
      'Status'
    ]

    const rows = filteredItems.map((item) => [
      `"${item.itemCode || ''}"`,
      `"${item.itemName.replace(/"/g, '""')}"`,
      `"${item.metalType}"`,
      `"${item.groupName}"`,
      `"${item.purityKarat || ''}"`,
      item.defaultTanch,
      item.defaultWastage,
      item.defaultLabourRate,
      `"${item.labourRateType}"`,
      item.gstRate,
      `"${item.gstHsnCode || ''}"`,
      item.barcodeItem ? 'Yes' : 'No',
      `"${item.barcodeType || ''}"`,
      item.huidRequired ? 'Yes' : 'No',
      item.isStudded ? 'Yes' : 'No',
      item.active ? 'Active' : 'Inactive'
    ])

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `item_master_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showAlert('success', 'Items exported to CSV successfully.')
  }, [filteredItems, showAlert])

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
          void handleSave()
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
    items,
    editingId,
    selectedItemId,
    setSelectedItemId,
    selectedItem,
    deleteTarget,
    formOpen,
    loading,
    saving,
    deleting,
    searchText,
    setSearchText,
    metalTypeFilter,
    setMetalTypeFilter,
    itemGroupFilter,
    setItemGroupFilter,
    statusFilter,
    setStatusFilter,
    barcodeFilter,
    setBarcodeFilter,
    hasActiveFilters,
    handleClearFilters,
    itemGroups,
    activeGroups,
    activeStamps,
    activeDesigns,
    filteredItems,
    activeCount,
    openNewForm,
    openEditForm,
    closeForm,
    handleMetalChange,
    handleSave,
    requestDelete,
    handleConfirmDelete,
    handleCancelDelete,
    handlePrint,
    handleExportCsv,
    itemNameRef
  }
}
