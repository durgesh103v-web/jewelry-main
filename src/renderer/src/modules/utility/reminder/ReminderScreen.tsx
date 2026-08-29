import React, { useEffect, useMemo, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { formatDate, formatNumber } from '@utils/formatters'
import { Button, SearchInput, Select, Badge, DataTable, Column } from '@components/ui'
import { useAlert, useAsync } from '@renderer/hooks'

function daysLabel(reminder: ReminderRecord): string {
  if (reminder.daysUntil === 0) return 'Due today'
  if (reminder.daysUntil < 0) return `${Math.abs(reminder.daysUntil)} day(s) overdue`
  return `Due in ${reminder.daysUntil} day(s)`
}

function ReminderScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { alert, showAlert, clearAlert } = useAlert()
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Sale' | 'Approval'>('ALL')

  const {
    data: reminders,
    loading,
    execute: fetchReminders
  } = useAsync(async () => {
    return window.api.reminder.list()
  })

  const loadReminders = async (): Promise<void> => {
    const result = await fetchReminders()
    if (result === null) {
      showAlert('error', 'Failed to load reminders.')
    }
  }

  useEffect(() => {
    void loadReminders()
  }, [])

  const reminderList = useMemo(() => reminders || [], [reminders])

  const filteredReminders = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return reminderList.filter((reminder) => {
      if (typeFilter !== 'ALL' && reminder.type !== typeFilter) return false

      if (!keyword) return true

      return (
        reminder.billNo.toLowerCase().includes(keyword) ||
        reminder.accountName.toLowerCase().includes(keyword) ||
        reminder.mobileNumber.toLowerCase().includes(keyword)
      )
    })
  }, [reminderList, searchText, typeFilter])

  const overdueCount = useMemo(
    () => reminderList.filter((reminder) => reminder.isOverdue).length,
    [reminderList]
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
          {alert && <AppAlert type={alert.type} message={alert.message} onClose={clearAlert} />}

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
              Total: <strong className="text-foreground">{reminderList.length}</strong> | Overdue:{' '}
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
