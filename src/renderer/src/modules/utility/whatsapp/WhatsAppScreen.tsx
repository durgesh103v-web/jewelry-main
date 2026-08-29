import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatNumber } from '@utils/formatters'
import { Button, Input, Textarea, Select, FormField, FormSection } from '@components/ui'
import { useAlert } from '@renderer/hooks'

type TemplateId = 'PAYMENT_REMINDER' | 'BILL_COPY' | 'GENERAL'

function buildTemplateMessage(
  templateId: TemplateId,
  accountName: string,
  balance: AccountBalanceRecord | null
): string {
  const name = accountName || 'Customer'

  if (templateId === 'PAYMENT_REMINDER') {
    const dueParts: string[] = []

    if (balance) {
      if (Math.abs(balance.goldFine) > 0.001) {
        dueParts.push(`Gold Fine: ${formatNumber(balance.goldFine)} gm`)
      }
      if (Math.abs(balance.silverFine) > 0.001) {
        dueParts.push(`Silver Fine: ${formatNumber(balance.silverFine)} gm`)
      }
      if (Math.abs(balance.cash) > 0.001) {
        dueParts.push(`Cash: Rs. ${formatNumber(balance.cash)}`)
      }
    }

    const dueText = dueParts.length > 0 ? dueParts.join(', ') : 'your outstanding balance'

    return `Dear ${name}, this is a gentle reminder that ${dueText} is due against your account. Please arrange payment at your earliest convenience. Thank you.`
  }

  if (templateId === 'BILL_COPY') {
    return `Dear ${name}, your bill copy is ready. Please visit our shop or reply here to receive it. Thank you for your business.`
  }

  return `Dear ${name}, `
}

function WhatsAppScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { alert, showAlert, clearAlert } = useAlert()
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [template, setTemplate] = useState<TemplateId>('GENERAL')
  const [message, setMessage] = useState('')
  const [balance, setBalance] = useState<AccountBalanceRecord | null>(null)

  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [sending, setSending] = useState(false)

  const templateRef = useRef(template)

  useEffect(() => {
    templateRef.current = template
  }, [template])

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  )

  const resolvedPhone = useMemo(() => {
    if (manualPhone.trim()) return manualPhone.trim()
    return selectedAccount?.whatsappNumber || selectedAccount?.mobileNumber || ''
  }, [manualPhone, selectedAccount])

  useEffect(() => {
    let cancelled = false

    window.api.accounts
      .list()
      .then((data) => {
        if (!cancelled) setAccounts(data)
      })
      .catch((error: unknown) => {
        if (!cancelled) showAlert('error', getFriendlyErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoadingAccounts(false)
      })

    return () => {
      cancelled = true
    }
  }, [showAlert])

  useEffect(() => {
    let cancelled = false

    const accountName = accounts.find((account) => account.id === selectedAccountId)?.accountName || ''

    const balanceRequest = selectedAccountId
      ? window.api.sales.getAccountBalance(selectedAccountId)
      : Promise.resolve(null)

    balanceRequest
      .then((data) => {
        if (cancelled) return
        setBalance(data)
        setMessage(buildTemplateMessage(templateRef.current, accountName, data))
      })
      .catch(() => {
        if (!cancelled) setBalance(null)
      })

    return () => {
      cancelled = true
    }
  }, [selectedAccountId, accounts])

  const applyTemplate = useCallback(
    (templateId: TemplateId): void => {
      setTemplate(templateId)
      setMessage(buildTemplateMessage(templateId, selectedAccount?.accountName || '', balance))
    },
    [selectedAccount, balance]
  )

  const handleSend = async (): Promise<void> => {
    const phone = resolvedPhone.replace(/\D/g, '')

    if (!phone) {
      showAlert('warning', 'Please select an account with a phone number, or enter a phone number.')
      return
    }

    if (!message.trim()) {
      showAlert('warning', 'Please enter a message to send.')
      return
    }

    try {
      setSending(true)
      await window.api.whatsapp.send({ phone: resolvedPhone, message: message.trim() })
      showAlert('success', 'WhatsApp opened in your browser with the message pre-filled.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSending(false)
    }
  }

  const accountOptions = useMemo(
    () => [
      { label: '-- Select account (optional) --', value: '' },
      ...accounts.map((a) => ({
        label: `${a.accountName} ${a.mobileNumber ? `(${a.mobileNumber})` : ''}`,
        value: a.id
      }))
    ],
    [accounts]
  )

  return (
    <div className="account-group-screen whatsapp-screen">
      <div className="account-group-window">
        <div className="form-title-bar">
          <span>WhatsApp Quick Send</span>
          <button className="module-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="account-group-body">
          {alert && <AppAlert type={alert.type} message={alert.message} onClose={clearAlert} />}

          <FormSection>
            <Select
              label="Account"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              disabled={loadingAccounts}
              options={accountOptions}
            />

            <Input
              label="Phone Number"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              placeholder={
                selectedAccount
                  ? `Leave blank to use ${selectedAccount.whatsappNumber || selectedAccount.mobileNumber || 'account number'}`
                  : 'e.g. 9876543210'
              }
            />

            <Select
              label="Message Template"
              value={template}
              onChange={(e) => applyTemplate(e.target.value as TemplateId)}
              options={[
                { label: 'General', value: 'GENERAL' },
                { label: 'Payment Reminder', value: 'PAYMENT_REMINDER' },
                { label: 'Bill Copy Ready', value: 'BILL_COPY' }
              ]}
            />

            {selectedAccount && (
              <FormField label="Outstanding Balance">
                <div className="p-2 text-xs bg-background-muted border border-border rounded-xs font-mono">
                  {balance
                    ? `Gold Fine: ${formatNumber(balance.goldFine)} gm | Silver Fine: ${formatNumber(balance.silverFine)} gm | Cash: Rs. ${formatNumber(balance.cash)}`
                    : 'Loading balance...'}
                </div>
              </FormField>
            )}

            <Textarea
              label="Message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => applyTemplate(template)} disabled={sending}>
                Reset to Template
              </Button>
              <Button variant="success" onClick={() => void handleSend()} loading={sending}>
                {sending ? 'Opening WhatsApp...' : 'Send via WhatsApp'}
              </Button>
            </div>
          </FormSection>

          <div className="screen-help-text mt-3">
            This app has no WhatsApp Business API integration. Send opens WhatsApp Web/Desktop (via
            your browser) with the phone number and message pre-filled - you confirm and press send
            there. 10-digit numbers are assumed to be Indian mobile numbers and get a +91 prefix
            automatically.
          </div>
        </div>
      </div>
    </div>
  )
}

export default WhatsAppScreen
