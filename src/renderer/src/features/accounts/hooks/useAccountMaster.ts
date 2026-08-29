import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { useAlert, useConfirmModal } from '@renderer/hooks'
import type { AccountFormValues, AccountGroupOption } from '../components/AccountForm'
import type { AccountRecord } from '../components/AccountTable'

const today = new Date().toISOString().slice(0, 10)

const initialForm: AccountFormValues = {
  accountName: '',
  otherName: '',
  accountType: 'Wholesale Customer',
  accountGroupId: '',
  openingGoldFine: '',
  openingSilverFine: '',
  openingCash: '',
  openingAnamat: '',
  openingBank: '',
  lastDate: today,
  goldFineLimit: '',
  silverFineLimit: '',
  mobileNumber: '',
  whatsappNumber: '',
  phone2: '',
  address: '',
  city: '',
  state: 'Maharashtra',
  gstNo: '',
  panNo: '',
  notification: '',
  active: true
}

function toNumber(value: string | number): number {
  if (value === '') return 0
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

export function useAccountMaster() {
  const { alert, showAlert, clearAlert } = useAlert()
  const {
    target: deleteTarget,
    loading: deleting,
    requestConfirm: requestDelete,
    handleConfirm: confirmDelete,
    handleCancel: handleCancelDelete
  } = useConfirmModal<AccountRecord>()

  const [form, setForm] = useState<AccountFormValues>(initialForm)
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [accountGroups, setAccountGroups] = useState<AccountGroupOption[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [accountTypeFilter, setAccountTypeFilter] = useState('All')

  const accountNameRef = useRef<HTMLInputElement | null>(null)

  const activeGroups = useMemo(() => {
    return accountGroups.filter((group) => group.active)
  }, [accountGroups])

  const selectedAccount = useMemo(() => {
    return accounts.find((account) => account.id === selectedAccountId) || null
  }, [accounts, selectedAccountId])

  const filteredAccounts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return accounts.filter((account) => {
      const typeMatch = accountTypeFilter === 'All' || account.accountType === accountTypeFilter
      const keywordMatch =
        !keyword ||
        account.accountName.toLowerCase().includes(keyword) ||
        account.otherName.toLowerCase().includes(keyword) ||
        account.accountType.toLowerCase().includes(keyword) ||
        account.groupName.toLowerCase().includes(keyword) ||
        account.groupType.toLowerCase().includes(keyword) ||
        account.mobileNumber.toLowerCase().includes(keyword) ||
        account.whatsappNumber.toLowerCase().includes(keyword) ||
        account.phone2.toLowerCase().includes(keyword) ||
        account.address.toLowerCase().includes(keyword) ||
        account.city.toLowerCase().includes(keyword) ||
        account.state.toLowerCase().includes(keyword) ||
        account.gstNo.toLowerCase().includes(keyword) ||
        account.panNo.toLowerCase().includes(keyword) ||
        account.notification.toLowerCase().includes(keyword)

      return typeMatch && keywordMatch
    })
  }, [accounts, searchText, accountTypeFilter])

  const activeCount = useMemo(() => {
    return accounts.filter((account) => account.active).length
  }, [accounts])

  const focusName = useCallback((): void => {
    window.setTimeout(() => {
      accountNameRef.current?.focus()
    }, 0)
  }, [])

  const loadAccounts = useCallback(async (): Promise<void> => {
    const [groupData, accountData] = await Promise.all([
      window.api.accountGroups.list(),
      window.api.accounts.list()
    ])

    setAccountGroups(groupData)
    setAccounts(accountData)
  }, [])

  const openNewForm = useCallback((): void => {
    const firstActiveGroup = activeGroups[0]

    setEditingId(null)
    setSelectedAccountId('')
    setForm({
      ...initialForm,
      lastDate: new Date().toISOString().slice(0, 10),
      accountGroupId: firstActiveGroup?.id || ''
    })
    setFormOpen(true)
    focusName()
  }, [activeGroups, focusName])

  const closeForm = useCallback((): void => {
    setFormOpen(false)
    setEditingId(null)
    setForm(initialForm)
  }, [])

  const validateForm = useCallback((): boolean => {
    if (!form.accountName.trim()) {
      showAlert('warning', 'Please enter account name.')
      accountNameRef.current?.focus()
      return false
    }

    if (!form.accountGroupId) {
      showAlert('warning', 'Please select account group.')
      return false
    }

    return true
  }, [form.accountGroupId, form.accountName, showAlert])

  const buildPayload = useCallback(() => {
    return {
      accountName: form.accountName.trim(),
      otherName: form.otherName.trim(),
      accountType: form.accountType,
      accountGroupId: form.accountGroupId,
      openingGoldFine: toNumber(form.openingGoldFine),
      openingSilverFine: toNumber(form.openingSilverFine),
      openingCash: toNumber(form.openingCash),
      openingAnamat: toNumber(form.openingAnamat),
      openingBank: toNumber(form.openingBank),
      lastDate: form.lastDate,
      goldFineLimit: toNumber(form.goldFineLimit),
      silverFineLimit: toNumber(form.silverFineLimit),
      mobileNumber: form.mobileNumber.trim(),
      whatsappNumber: form.whatsappNumber.trim(),
      phone2: form.phone2.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      gstNo: form.gstNo.trim().toUpperCase(),
      panNo: form.panNo.trim().toUpperCase(),
      notification: form.notification.trim(),
      active: form.active
    }
  }, [form])

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return
    if (!validateForm()) return

    try {
      setSaving(true)
      const payload = buildPayload()

      if (editingId) {
        await window.api.accounts.update(editingId, payload)
        showAlert('success', 'Account updated successfully.')
      } else {
        await window.api.accounts.create(payload)
        showAlert('success', 'Account saved successfully.')
      }

      await loadAccounts()
      closeForm()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [buildPayload, closeForm, editingId, loadAccounts, saving, showAlert, validateForm])

  const openEditForm = (account: AccountRecord): void => {
    setSelectedAccountId(account.id)
    setEditingId(account.id)
    setForm({
      accountName: account.accountName || '',
      otherName: account.otherName || '',
      accountType: account.accountType || 'Wholesale Customer',
      accountGroupId: account.accountGroupId || '',
      openingGoldFine:
        Number(account.openingGoldFine || 0) === 0 ? '' : String(account.openingGoldFine),
      openingSilverFine:
        Number(account.openingSilverFine || 0) === 0 ? '' : String(account.openingSilverFine),
      openingCash: Number(account.openingCash || 0) === 0 ? '' : String(account.openingCash),
      openingAnamat: Number(account.openingAnamat || 0) === 0 ? '' : String(account.openingAnamat),
      openingBank: Number(account.openingBank || 0) === 0 ? '' : String(account.openingBank),
      lastDate: account.lastDate || new Date().toISOString().slice(0, 10),
      goldFineLimit: Number(account.goldFineLimit || 0) === 0 ? '' : String(account.goldFineLimit),
      silverFineLimit:
        Number(account.silverFineLimit || 0) === 0 ? '' : String(account.silverFineLimit),
      mobileNumber: account.mobileNumber || '',
      whatsappNumber: account.whatsappNumber || '',
      phone2: account.phone2 || '',
      address: account.address || '',
      city: account.city || '',
      state: account.state || 'Maharashtra',
      gstNo: account.gstNo || '',
      panNo: account.panNo || '',
      notification: account.notification || '',
      active: Boolean(account.active)
    })
    setFormOpen(true)
    focusName()
  }

  const handleToolbarEdit = (): void => {
    if (!selectedAccount) {
      showAlert('warning', 'Please select an account to edit.')
      return
    }
    openEditForm(selectedAccount)
  }

  const handleToolbarDelete = (): void => {
    if (!selectedAccount) {
      showAlert('warning', 'Please select an account to delete.')
      return
    }
    requestDelete(selectedAccount)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    await confirmDelete(async (target) => {
      try {
        await window.api.accounts.remove(target.id)
        if (editingId === target.id) {
          closeForm()
        }
        setSelectedAccountId('')
        await loadAccounts()
        showAlert('success', 'Account deleted successfully.')
      } catch (error) {
        showAlert('error', getFriendlyErrorMessage(error))
      }
    })
  }

  const handlePrint = (): void => {
    window.print()
  }

  useEffect(() => {
    let cancelled = false

    Promise.all([window.api.accountGroups.list(), window.api.accounts.list()])
      .then(([groupData, accountData]) => {
        if (cancelled) return
        setAccountGroups(groupData)
        setAccounts(accountData)
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

      if (event.ctrlKey && event.key.toLowerCase() === 's' && formOpen) {
        event.preventDefault()
        void handleSave()
      }

      if (event.key === 'Escape') {
        if (deleteTarget && !deleting) {
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
  }, [closeForm, deleteTarget, deleting, formOpen, handleCancelDelete, handleSave, openNewForm])

  return {
    alert,
    clearAlert,
    form,
    setForm,
    accounts,
    editingId,
    selectedAccountId,
    setSelectedAccountId,
    selectedAccount,
    deleteTarget,
    formOpen,
    loading,
    saving,
    deleting,
    searchText,
    setSearchText,
    accountTypeFilter,
    setAccountTypeFilter,
    activeGroups,
    filteredAccounts,
    activeCount,
    openNewForm,
    closeForm,
    openEditForm,
    handleToolbarEdit,
    handleToolbarDelete,
    handleSave,
    handleConfirmDelete,
    handleCancelDelete,
    handlePrint,
    accountNameRef
  }
}
