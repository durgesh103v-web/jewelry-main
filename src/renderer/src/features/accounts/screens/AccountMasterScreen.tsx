import React from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { ConfirmDialog } from '@components/ui'
import { AccountForm } from '../components/AccountForm'
import { AccountFilters } from '../components/AccountFilters'
import { AccountTable } from '../components/AccountTable'
import { useAccountMaster } from '../hooks/useAccountMaster'

export interface AccountMasterScreenProps {
  onClose: () => void
}

export function AccountMasterScreen({ onClose: _onClose }: AccountMasterScreenProps): React.JSX.Element {
  const {
    alert,
    clearAlert,
    form,
    setForm,
    accounts,
    editingId,
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
    openEditForm,
    openNewForm,
    closeForm,
    requestDelete,
    handleSave,
    handleConfirmDelete,
    handleCancelDelete,
    handlePrint,
    handleExportCsv,
    accountNameRef
  } = useAccountMaster()

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Alert */}
      {alert && (
        <div className="px-6 pt-4 shrink-0">
          <AppAlert type={alert.type} message={alert.message} onClose={clearAlert} />
        </div>
      )}

      {/* Toolbar + Filters */}
      <AccountFilters
        formOpen={formOpen}
        selectedAccountName={selectedAccount ? selectedAccount.accountName : null}
        accountTypeFilter={accountTypeFilter}
        setAccountTypeFilter={setAccountTypeFilter}
        accountGroupFilter={accountGroupFilter}
        setAccountGroupFilter={setAccountGroupFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        balanceFilter={balanceFilter}
        setBalanceFilter={setBalanceFilter}
        accountGroups={accountGroups}
        searchText={searchText}
        setSearchText={setSearchText}
        totalCount={accounts.length}
        activeCount={activeCount}
        showingCount={filteredAccounts.length}
        onAddNew={openNewForm}
        onPrint={handlePrint}
        onExportCsv={handleExportCsv}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Body */}
      <div className="flex-1 overflow-hidden flex flex-col px-6 pb-5 pt-2 gap-4 min-h-0">
        {formOpen ? (
          <div className="flex-1 overflow-hidden flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm">
            <AccountForm
              form={form}
              setForm={setForm}
              activeGroups={activeGroups}
              editingId={editingId}
              saving={saving}
              onSave={() => void handleSave()}
              onCancel={closeForm}
              accountNameRef={accountNameRef}
            />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-hidden min-h-0 border border-slate-200 rounded-xl bg-white shadow-sm">
              <AccountTable
                accounts={filteredAccounts}
                loading={loading}
                searchText={searchText}
                selectedId={selectedAccount?.id}
                onSelect={(id) => setSelectedAccountId(id)}
                onDoubleClick={(account) => openEditForm(account)}
                onEdit={(account) => openEditForm(account)}
                onDelete={(account) => requestDelete(account)}
              />
            </div>
           
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Account?"
        description={deleteTarget ? `Are you sure you want to delete "${deleteTarget.accountName}"? This action cannot be undone.` : ''}
        confirmLabel="Delete Account"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}

export default AccountMasterScreen