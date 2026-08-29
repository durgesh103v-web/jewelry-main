import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatDate, formatNumber } from '@utils/formatters'
import { Button, SearchInput, Select, Badge, DataTable, Column } from '@components/ui'

type AlertType = 'success' | 'error' | 'warning'

function daysLabel(reminder: ReminderRecord): string {
  if (reminder.daysUntil === 0) return 'Due today'
  if (reminder.daysUntil < 0) return `${Math.abs(reminder.daysUntil)} day(s) overdue`
  return `Due in ${reminder.daysUntil} day(s)`
}

function ReminderScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [reminders, setReminders] = useState<ReminderRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Sale' | 'Approval'>('ALL')
  const [loading, setLoading] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 3500)
  }, [])

  const loadReminders = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.reminder.list()
      setReminders(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadReminders()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)

      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadReminders])

  const filteredReminders = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return reminders.filter((reminder) => {
      if (typeFilter !== 'ALL' && reminder.type !== typeFilter) return false

      if (!keyword) return true

      return (
        reminder.billNo.toLowerCase().includes(keyword) ||
        reminder.accountName.toLowerCase().includes(keyword) ||
        reminder.mobileNumber.toLowerCase().includes(keyword)
      )
    })
  }, [reminders, searchText, typeFilter])

  const overdueCount = useMemo(
    () => reminders.filter((reminder) => reminder.isOverdue).length,
    [reminders]
  )

  const columns: Column<ReminderRecord>[] = [
    { key: 'sr', header: 'Sr', render: (_, index) => index + 1, width: '50px' },
    { key: 'type', header: 'Type', render: (r) => r.type },
    { key: 'billNo', header: 'Bill No', render: (r) => r.billNo },
    { key: 'billDate', header: 'Bill Date', render: (r) => formatDate(r.billDate) },
    { key: 'accountName', header: 'Account', render: (r) => r.accountName },
    { key: 'mobileNumber', header: 'Phone', render: (r) => r.mobileNumber || '-' },
    { key: 'reminderDate', header: 'Reminder Date', render: (r) => formatDate(r.reminderDate) },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge variant={r.isOverdue ? 'error' : 'warning'} size="small">
          {daysLabel(r)}
        </Badge>
      )
    },
    { key: 'metalType', header: 'Metal', render: (r) => r.metalType },
    { key: 'fineAmount', header: 'Fine Due', align: 'right', render: (r) => formatNumber(r.fineAmount) },
    { key: 'majuriAmount', header: 'Majuri Due', align: 'right', render: (r) => formatNumber(r.majuriAmount) }
  ]

  return (
    <div className="sale-register-screen">
      <div className="sale-register-window">
        <div className="form-title-bar">
          <span>Reminder</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="sale-register-body">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 bg-background-muted p-2.5 rounded-sm border border-border">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="w-64">
                <SearchInput
                  value={searchText}
                  onChange={setSearchText}
                  onClear={() => setSearchText('')}
                  placeholder="Search bill no, account, mobile"
                />
              </div>

              <div className="w-40">
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'Sale' | 'Approval')}
                  options={[
                    { label: 'All Types', value: 'ALL' },
                    { label: 'Sale', value: 'Sale' },
                    { label: 'Approval', value: 'Approval' }
                  ]}
                />
              </div>

              <Button size="small" variant="secondary" onClick={() => void loadReminders()} loading={loading}>
                Refresh
              </Button>
            </div>

            <div className="text-xs text-foreground-muted select-none">
              Total: <strong className="text-foreground">{reminders.length}</strong> | Overdue:{' '}
              <strong className="text-error font-bold">{overdueCount}</strong> | Showing:{' '}
              <strong className="text-foreground">{filteredReminders.length}</strong>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredReminders}
            keyExtractor={(r) => `${r.type}-${r.id}`}
            loading={loading}
            emptyMessage={
              searchText || typeFilter !== 'ALL'
                ? 'No matching reminder found.'
                : 'No pending reminders. Set a reminder date on a Sale or Approval bill to see it here.'
            }
          />

          <div className="screen-help-text mt-3">
            Sorted by reminder date, soonest first. Overdue reminders are highlighted in red.
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReminderScreen
