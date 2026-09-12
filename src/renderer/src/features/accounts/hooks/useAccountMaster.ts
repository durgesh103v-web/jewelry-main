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
  creditLimit: '',
  mobileNumber: '',
  whatsappNumber: '',
  phone2: '',
  email: '',
  address: '',
  city: '',
  state: 'Maharashtra',
  pincode: '',
  bankName: '',
  bankAccountNumber: '',
  bankIfsc: '',
  bankBranch: '',
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
  const [accountGroupFilter, setAccountGroupFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [balanceFilter, setBalanceFilter] = useState('ALL')

  const accountNameRef = useRef<HTMLInputElement | null>(null)

  const activeGroups = useMemo(() => {
    return accountGroups.filter((group) => group.active)
  }, [accountGroups])

  const selectedAccount = useMemo(() => {
    return accounts.find((account) => account.id === selectedAccountId) || null
  }, [accounts, selectedAccountId])

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(searchText.trim()) ||
      accountTypeFilter !== 'All' ||
      accountGroupFilter !== 'All' ||
      statusFilter !== 'ALL' ||
      balanceFilter !== 'ALL'
    )
  }, [searchText, accountTypeFilter, accountGroupFilter, statusFilter, balanceFilter])

  const handleClearFilters = useCallback(() => {
    setSearchText('')
    setAccountTypeFilter('All')
    setAccountGroupFilter('All')
    setStatusFilter('ALL')
    setBalanceFilter('ALL')
  }, [])

  const filteredAccounts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return accounts.filter((account) => {
      // 1. Account Type
      const typeMatch = accountTypeFilter === 'All' || account.accountType === accountTypeFilter

      // 2. Account Group
      const groupMatch =
        accountGroupFilter === 'All' ||
        account.accountGroupId === accountGroupFilter ||
        account.groupName === accountGroupFilter

      // 3. Status
      const statusMatch =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && account.active) ||
        (statusFilter === 'INACTIVE' && !account.active)

      // 4. Balance Filter
      let balanceMatch = true
      if (balanceFilter === 'HAS_CASH') {
        balanceMatch = Number(account.openingCash || 0) !== 0
      } else if (balanceFilter === 'HAS_GOLD') {
        balanceMatch = Number(account.openingGoldFine || 0) !== 0
      } else if (balanceFilter === 'HAS_SILVER') {
        balanceMatch = Number(account.openingSilverFine || 0) !== 0
      } else if (balanceFilter === 'ANY_OUTSTANDING') {
        balanceMatch =
          Number(account.openingCash || 0) !== 0 ||
          Number(account.openingGoldFine || 0) !== 0 ||
          Number(account.openingSilverFine || 0) !== 0
      }

      // 5. Keyword search
      const keywordMatch =
        !keyword ||
        account.accountName.toLowerCase().includes(keyword) ||
        (account.otherName && account.otherName.toLowerCase().includes(keyword)) ||
        (account.accountType && account.accountType.toLowerCase().includes(keyword)) ||
        (account.groupName && account.groupName.toLowerCase().includes(keyword)) ||
        (account.mobileNumber && account.mobileNumber.toLowerCase().includes(keyword)) ||
        (account.whatsappNumber && account.whatsappNumber.toLowerCase().includes(keyword)) ||
        (account.phone2 && account.phone2.toLowerCase().includes(keyword)) ||
        (account.email && account.email.toLowerCase().includes(keyword)) ||
        (account.address && account.address.toLowerCase().includes(keyword)) ||
        (account.city && account.city.toLowerCase().includes(keyword)) ||
        (account.state && account.state.toLowerCase().includes(keyword)) ||
        (account.pincode && account.pincode.toLowerCase().includes(keyword)) ||
        (account.gstNo && account.gstNo.toLowerCase().includes(keyword)) ||
        (account.panNo && account.panNo.toLowerCase().includes(keyword)) ||
        (account.bankName && account.bankName.toLowerCase().includes(keyword)) ||
        (account.bankAccountNumber && account.bankAccountNumber.toLowerCase().includes(keyword)) ||
        (account.bankIfsc && account.bankIfsc.toLowerCase().includes(keyword)) ||
        (account.notification && account.notification.toLowerCase().includes(keyword))

      return typeMatch && groupMatch && statusMatch && balanceMatch && keywordMatch
    })
  }, [accounts, searchText, accountTypeFilter, accountGroupFilter, statusFilter, balanceFilter])

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
    setAccounts(accountData as unknown as AccountRecord[])
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
      creditLimit: toNumber(form.creditLimit),
      mobileNumber: form.mobileNumber.trim(),
      whatsappNumber: form.whatsappNumber.trim(),
      phone2: form.phone2.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      bankName: form.bankName.trim(),
      bankAccountNumber: form.bankAccountNumber.trim(),
      bankIfsc: form.bankIfsc.trim().toUpperCase(),
      bankBranch: form.bankBranch.trim(),
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
      creditLimit: Number(account.creditLimit || 0) === 0 ? '' : String(account.creditLimit),
      mobileNumber: account.mobileNumber || '',
      whatsappNumber: account.whatsappNumber || '',
      phone2: account.phone2 || '',
      email: account.email || '',
      address: account.address || '',
      city: account.city || '',
      state: account.state || 'Maharashtra',
      pincode: account.pincode || '',
      bankName: account.bankName || '',
      bankAccountNumber: account.bankAccountNumber || '',
      bankIfsc: account.bankIfsc || '',
      bankBranch: account.bankBranch || '',
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

  const handleExportCsv = useCallback((): void => {
    if (filteredAccounts.length === 0) {
      showAlert('warning', 'No accounts to export.')
      return
    }

    const headers = [
      '#',
      'Account Name',
      'Other Name',
      'Account Type',
      'Group Name',
      'Gold Fine (g)',
      'Silver Fine (g)',
      'Cash (INR)',
      'Anamat (INR)',
      'Bank (INR)',
      'As On Date',
      'Mobile Number',
      'WhatsApp Number',
      'Phone 2',
      'Email',
      'Address',
      'City',
      'State',
      'Pincode',
      'GSTIN',
      'PAN',
      'Bank Name',
      'Bank A/C No',
      'IFSC Code',
      'Branch',
      'Gold Limit (g)',
      'Silver Limit (g)',
      'Credit Limit (INR)',
      'Status'
    ]

    const rows = filteredAccounts.map((acc, index) => [
      index + 1,
      `"${(acc.accountName || '').replace(/"/g, '""')}"`,
      `"${(acc.otherName || '').replace(/"/g, '""')}"`,
      `"${acc.accountType || ''}"`,
      `"${acc.groupName || ''}"`,
      acc.openingGoldFine || 0,
      acc.openingSilverFine || 0,
      acc.openingCash || 0,
      acc.openingAnamat || 0,
      acc.openingBank || 0,
      acc.lastDate || '',
      `"${acc.mobileNumber || ''}"`,
      `"${acc.whatsappNumber || ''}"`,
      `"${acc.phone2 || ''}"`,
      `"${acc.email || ''}"`,
      `"${(acc.address || '').replace(/"/g, '""')}"`,
      `"${acc.city || ''}"`,
      `"${acc.state || ''}"`,
      `"${acc.pincode || ''}"`,
      `"${acc.gstNo || ''}"`,
      `"${acc.panNo || ''}"`,
      `"${acc.bankName || ''}"`,
      `"${acc.bankAccountNumber || ''}"`,
      `"${acc.bankIfsc || ''}"`,
      `"${acc.bankBranch || ''}"`,
      acc.goldFineLimit || 0,
      acc.silverFineLimit || 0,
      acc.creditLimit || 0,
      acc.active ? 'Active' : 'Inactive'
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `accounts_export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showAlert('success', `Exported ${filteredAccounts.length} accounts to CSV.`)
  }, [filteredAccounts, showAlert])

  useEffect(() => {
    let cancelled = false

    Promise.all([window.api.accountGroups.list(), window.api.accounts.list()])
      .then(([groupData, accountData]) => {
        if (cancelled) return
        setAccountGroups(groupData)
        setAccounts(accountData as unknown as AccountRecord[])
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
    accountGroupFilter,
    setAccountGroupFilter,
    statusFilter,
    setStatusFilter,
    balanceFilter,
    setBalanceFilter,
    hasActiveFilters,
    handleClearFilters,
    accountGroups,
    activeGroups,
    filteredAccounts,
    activeCount,
    openNewForm,
    closeForm,
    openEditForm,
    handleToolbarEdit,
    handleToolbarDelete,
    requestDelete,
    handleSave,
    handleConfirmDelete,
    handleCancelDelete,
    handlePrint,
    handleExportCsv,
    accountNameRef
  }
}
