import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatDate } from '@utils/formatters'
import {
  Button,
  Input,
  SearchInput,
  Badge,
  DataTable,
  Column,
  ConfirmDialog,
  FormSection,
  FormActions
} from '@components/ui'

type AlertType = 'success' | 'error' | 'warning'

type FinancialYearForm = {
  yearLabel: string
  startDate: string
  endDate: string
  narration: string
}

const initialForm: FinancialYearForm = {
  yearLabel: '',
  startDate: '',
  endDate: '',
  narration: ''
}

function FinancialYearScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState<FinancialYearForm>(initialForm)
  const [years, setYears] = useState<FinancialYearRecord[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FinancialYearRecord | null>(null)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')
  const [searchText, setSearchText] = useState('')

  const alertTimerRef = useRef<number | null>(null)
  const yearLabelInputRef = useRef<HTMLInputElement | null>(null)
  const startDateInputRef = useRef<HTMLInputElement | null>(null)
  const endDateInputRef = useRef<HTMLInputElement | null>(null)
  const narrationInputRef = useRef<HTMLInputElement | null>(null)

  const filteredYears = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return years

    return years.filter((year) => {
      return (
        year.yearLabel.toLowerCase().includes(keyword) ||
        year.narration.toLowerCase().includes(keyword)
      )
    })
  }, [years, searchText])

  const currentYear = useMemo(() => years.find((year) => year.isCurrent) ?? null, [years])

  const focusYearLabel = useCallback((): void => {
    window.setTimeout(() => {
      yearLabelInputRef.current?.focus()
    }, 0)
  }, [])

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 3000)
  }, [])

  const loadYears = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.financialYears.list()
      setYears(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const handleNew = useCallback((): void => {
    setEditingId(null)
    setAlertMessage('')
    setForm(initialForm)
    focusYearLabel()
  }, [focusYearLabel])

  const focusNextOnEnter = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    nextElement?: HTMLElement | null
  ): void => {
    if (event.key !== 'Enter') return

    event.preventDefault()
    nextElement?.focus()
  }

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return

    if (!form.yearLabel.trim()) {
      showAlert('warning', 'Please enter financial year label, e.g. 2025-26.')
      yearLabelInputRef.current?.focus()
      return
    }

    if (!form.startDate || !form.endDate) {
      showAlert('warning', 'Please select start and end date.')
      return
    }

    try {
      setSaving(true)

      const payload = {
        yearLabel: form.yearLabel.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        narration: form.narration.trim()
      }

      const successMessage = editingId
        ? 'Financial year updated successfully.'
        : 'Financial year created successfully.'

      if (editingId) {
        await window.api.financialYears.update(editingId, payload)
      } else {
        await window.api.financialYears.create(payload)
      }

      setEditingId(null)
      setForm(initialForm)
      await loadYears()
      showAlert('success', successMessage)
      focusYearLabel()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [editingId, focusYearLabel, form, loadYears, saving, showAlert])

  const handleEdit = (year: FinancialYearRecord): void => {
    setEditingId(year.id)
    setAlertMessage('')
    setForm({
      yearLabel: year.yearLabel,
      startDate: year.startDate,
      endDate: year.endDate,
      narration: year.narration
    })
    focusYearLabel()
  }

  const handleSetCurrent = async (year: FinancialYearRecord): Promise<void> => {
    try {
      await window.api.financialYears.setCurrent(year.id)
      await loadYears()
      showAlert('success', `${year.yearLabel} set as current financial year.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }

  const handleToggleClosed = async (year: FinancialYearRecord): Promise<void> => {
    try {
      await window.api.financialYears.toggleClosed(year.id, !year.isClosed)
      await loadYears()
      showAlert(
        'success',
        `${year.yearLabel} ${year.isClosed ? 'reopened' : 'closed'} successfully.`
      )
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }

  const requestDelete = (year: FinancialYearRecord): void => {
    setDeleteTarget(year)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)

      await window.api.financialYears.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        setEditingId(null)
        setForm(initialForm)
      }

      setDeleteTarget(null)
      await loadYears()
      showAlert('success', 'Financial year deleted successfully.')
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

  useEffect(() => {
    let cancelled = false

    window.api.financialYears
      .list()
      .then((data) => {
        if (!cancelled) setYears(data)
      })
      .catch((error: unknown) => {
        if (!cancelled) showAlert('error', getFriendlyErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    focusYearLabel()

    return () => {
      cancelled = true

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [focusYearLabel, showAlert])

  const columns: Column<FinancialYearRecord>[] = [
    { key: 'srNo', header: 'Sr No', render: (_, i) => i + 1, width: '60px' },
    { key: 'yearLabel', header: 'Year', render: (y) => y.yearLabel },
    { key: 'startDate', header: 'Start Date', render: (y) => formatDate(y.startDate) },
    { key: 'endDate', header: 'End Date', render: (y) => formatDate(y.endDate) },
    {
      key: 'status',
      header: 'Status',
      render: (y) => (
        <div className="flex gap-1">
          {y.isCurrent && <Badge variant="success" size="small">Current</Badge>}
          {y.isClosed && <Badge variant="error" size="small">Closed</Badge>}
          {!y.isCurrent && !y.isClosed && <Badge variant="neutral" size="small">Open</Badge>}
        </div>
      )
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (y) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="small" variant="ghost" onClick={() => handleEdit(y)}>
            Edit
          </Button>
          {!y.isCurrent && !y.isClosed && (
            <Button size="small" variant="outline" onClick={() => void handleSetCurrent(y)}>
              Set Current
            </Button>
          )}
          <Button size="small" variant="outline" onClick={() => void handleToggleClosed(y)}>
            {y.isClosed ? 'Reopen' : 'Close'}
          </Button>
          {!y.isCurrent && (
            <Button size="small" variant="danger" onClick={() => requestDelete(y)}>
              Delete
            </Button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="account-group-screen financial-year-screen">
      <div className="account-group-window">
        <div className="form-title-bar">
          <span>Financial Year</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="account-group-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="cash-voucher-no-box">
            <span>Current Financial Year</span>
            <strong>{currentYear ? currentYear.yearLabel : 'Not set'}</strong>
          </div>

          <FormSection title={editingId ? 'Edit Financial Year' : 'Add Financial Year'}>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Year Label"
                ref={yearLabelInputRef}
                value={form.yearLabel}
                onChange={(e) => setForm((curr) => ({ ...curr, yearLabel: e.target.value }))}
                onKeyDown={(e) => focusNextOnEnter(e, startDateInputRef.current)}
                placeholder="e.g. 2025-26"
                required
              />
              <Input
                label="Start Date"
                ref={startDateInputRef}
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((curr) => ({ ...curr, startDate: e.target.value }))}
                onKeyDown={(e) => focusNextOnEnter(e, endDateInputRef.current)}
                required
              />
              <Input
                label="End Date"
                ref={endDateInputRef}
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((curr) => ({ ...curr, endDate: e.target.value }))}
                onKeyDown={(e) => focusNextOnEnter(e, narrationInputRef.current)}
                required
              />
            </div>

            <Input
              label="Narration"
              ref={narrationInputRef}
              value={form.narration}
              onChange={(e) => setForm((curr) => ({ ...curr, narration: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleSave()
                }
              }}
              placeholder="Optional note"
            />

            <FormActions
              onSave={() => void handleSave()}
              saveLabel={editingId ? 'Update' : 'Save'}
              loading={saving}
              customActions={
                <>
                  <Button variant="secondary" onClick={handleNew} disabled={saving}>
                    New
                  </Button>
                  {editingId && (
                    <Button variant="outline" onClick={handleNew} disabled={saving}>
                      Cancel Edit
                    </Button>
                  )}
                </>
              }
            />
          </FormSection>

          <div className="flex items-center justify-between gap-3 my-3 bg-background-muted p-2.5 rounded-sm border border-border">
            <div className="w-64">
              <SearchInput
                value={searchText}
                onChange={setSearchText}
                onClear={() => setSearchText('')}
                placeholder="Search by year label"
              />
            </div>

            <div className="text-xs text-foreground-muted select-none">
              Total: <strong className="text-foreground">{years.length}</strong> | Showing:{' '}
              <strong className="text-foreground">{filteredYears.length}</strong>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredYears}
            keyExtractor={(y) => y.id}
            loading={loading}
            emptyMessage={
              searchText ? 'No matching financial year found.' : 'No financial year added yet.'
            }
            onRowClick={(y) => handleEdit(y)}
          />

          <div className="screen-help-text mt-3">
            Tip: Only one financial year can be current at a time. The current year cannot be
            closed or deleted directly — set another year as current first.
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Financial Year?"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.yearLabel}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}

export default FinancialYearScreen
