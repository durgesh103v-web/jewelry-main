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

export function AccountMasterScreen({ onClose }: AccountMasterScreenProps): React.JSX.Element {
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
    activeGroups,
    filteredAccounts,
    activeCount,
    openNewForm,
    closeForm,
    handleToolbarEdit,
    handleToolbarDelete,
    handleSave,
    handleConfirmDelete,
    handleCancelDelete,
    handlePrint,
    accountNameRef
  } = useAccountMaster()

  return (
    <div className="account-master-screen">
      <div className="account-master-window account-master-modern-window">
        <div className="form-title-bar">
          <span>Account Master</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="account-master-body space-y-3 p-3">
          {alert && <AppAlert type={alert.type} message={alert.message} onClose={clearAlert} />}

          <AccountFilters
            formOpen={formOpen}
            selectedAccountName={selectedAccount ? selectedAccount.accountName : null}
            accountTypeFilter={accountTypeFilter}
            setAccountTypeFilter={setAccountTypeFilter}
            searchText={searchText}
            setSearchText={setSearchText}
            totalCount={accounts.length}
            activeCount={activeCount}
            showingCount={filteredAccounts.length}
            onAddNew={openNewForm}
            onEdit={handleToolbarEdit}
            onPrint={handlePrint}
            onDelete={handleToolbarDelete}
            onClose={onClose}
          />

          {formOpen ? (
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
          ) : (
            <>
              <AccountTable
                accounts={filteredAccounts}
                loading={loading}
                searchText={searchText}
                onSelect={(id) => setSelectedAccountId(id)}
              />

              <div className="screen-help-text no-print mt-2">
                Click a row to select. Double-click to edit. Opening balances support positive and
                negative values like 8000 or -8000.
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Account?"
        description={
          deleteTarget ? `Are you sure you want to delete "${deleteTarget.accountName}"?` : ''
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

export default AccountMasterScreen
