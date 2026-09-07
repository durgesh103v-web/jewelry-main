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
    openEditForm,
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
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm shrink-0 z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 flex items-center justify-center shadow-inner shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Account Master</h1>
            <p className="text-xs text-slate-500 mt-1">Manage customers, suppliers, karagirs & bank accounts</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

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
              />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 select-none shrink-0 no-print font-medium bg-slate-100/50 p-2 rounded-lg border border-slate-200">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              Click a row to select · Double-click to edit · Opening balances support positive (Payable) and negative (Receivable, e.g. -8000) values.
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