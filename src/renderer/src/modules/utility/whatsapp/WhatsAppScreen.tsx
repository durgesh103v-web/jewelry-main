import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiCheck,
  FiInfo,
  FiMessageSquare,
  FiPhone,
  FiRotateCcw,
  FiSend,
  FiUser,
  FiX
} from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatNumber } from '@utils/formatters'

type AlertType = 'success' | 'error' | 'warning'
type TemplateId = 'GENERAL' | 'PAYMENT_REMINDER' | 'BILL_COPY' | 'GREETING'

function buildTemplateMessage(
  templateId: TemplateId,
  accountName: string,
  balance: AccountBalanceRecord | null
): string {
  const name = accountName || 'Valued Customer'

  if (templateId === 'PAYMENT_REMINDER') {
    const dueParts: string[] = []

    if (balance) {
      if (Math.abs(balance.goldFine) > 0.001) {
        dueParts.push(`Gold Fine: *${formatNumber(balance.goldFine)}g*`)
      }
      if (Math.abs(balance.silverFine) > 0.001) {
        dueParts.push(`Silver Fine: *${formatNumber(balance.silverFine)}g*`)
      }
      if (Math.abs(balance.cash) > 0.001) {
        dueParts.push(`Cash: *₹${formatNumber(balance.cash)}*`)
      }
    }

    const dueText = dueParts.length > 0 ? dueParts.join(', ') : 'your outstanding ledger balance'

    return `Dear ${name},\n\nThis is a gentle reminder that ${dueText} is due against your account.\n\nPlease arrange the clearance at your earliest convenience.\n\nThank you,\n*Shree Jewellery*`
  }

  if (templateId === 'BILL_COPY') {
    return `Dear ${name},\n\nYour purchase invoice / estimation memo is ready. Please reply to this message or visit our store to collect your copy.\n\nThank you for choosing us!\n*Shree Jewellery*`
  }

  if (templateId === 'GREETING') {
    return `Dear ${name},\n\nWishing you and your family good health, prosperity, and happiness on this auspicious occasion!\n\nWarm regards,\n*Shree Jewellery*`
  }

  return `Dear ${name},\n\n`
}

function WhatsAppScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [template, setTemplate] = useState<TemplateId>('GENERAL')
  const [message, setMessage] = useState('')
  const [balance, setBalance] = useState<AccountBalanceRecord | null>(null)

  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [sending, setSending] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)
  const templateRef = useRef(template)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    templateRef.current = template
  }, [template])

  const showAlert = useCallback((type: AlertType, msg: string): void => {
    setAlertType(type)
    setAlertMessage(msg)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 4000)
  }, [])

  useEffect(() => {
    let cancelled = false

    window.api.accounts
      .list()
      .then((data) => {
        if (!cancelled) setAccounts(data || [])
      })
      .catch((error: unknown) => {
        if (!cancelled) showAlert('error', getFriendlyErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setLoadingAccounts(false)
      })

    return () => {
      cancelled = true
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [showAlert])

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

    if (!selectedAccountId) {
      setBalance(null)
      setMessage(buildTemplateMessage(templateRef.current, '', null))
      return
    }

    setLoadingBalance(true)
    const accountName = accounts.find((a) => a.id === selectedAccountId)?.accountName || ''

    window.api.sales
      .getAccountBalance(selectedAccountId)
      .then((data) => {
        if (cancelled) return
        setBalance(data)
        setMessage(buildTemplateMessage(templateRef.current, accountName, data))
      })
      .catch(() => {
        if (!cancelled) setBalance(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingBalance(false)
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

  const insertPlaceholder = (textToInsert: string): void => {
    if (!textareaRef.current) {
      setMessage((prev) => prev + textToInsert)
      return
    }
    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const newText = message.substring(0, start) + textToInsert + message.substring(end)
    setMessage(newText)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
          start + textToInsert.length
        textareaRef.current.focus()
      }
    }, 0)
  }

  const handleSend = async (): Promise<void> => {
    const phone = resolvedPhone.replace(/\D/g, '')

    if (!phone) {
      showAlert('warning', 'Please select an account with a mobile number or enter a phone number.')
      return
    }

    if (!message.trim()) {
      showAlert('warning', 'Please enter a message before sending.')
      return
    }

    try {
      setSending(true)
      await window.api.whatsapp.send({ phone: resolvedPhone, message: message.trim() })
      showAlert('success', 'WhatsApp opened in your browser with message pre-filled.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSending(false)
    }
  }

  const currentTime = useMemo(() => {
    const d = new Date()
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [])

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 text-base shadow-2xs font-bold">
            <FaWhatsapp className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>WhatsApp Quick Dispatch</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Instant Chat Launcher
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Draft and dispatch customer payment reminders, billing notifications, and greetings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => applyTemplate(template)}
            disabled={sending}
            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FiRotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Template</span>
          </button>

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending}
            className="h-8 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-emerald-600 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <FiSend className={`w-3.5 h-3.5 ${sending ? 'animate-pulse' : ''}`} />
            <span>{sending ? 'Opening WhatsApp...' : 'Send Message'}</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Split Layout */}
      <div className="flex-1 flex flex-col p-3 gap-2.5 overflow-hidden">
        {alertMessage && (
          <div className="shrink-0 no-print">
            <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
          {/* Left Column: Form & Message Composer (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3 overflow-y-auto pr-1">
            {/* Customer & Phone Card */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col gap-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                    <FiUser className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Customer & Destination
                  </h2>
                </div>
                {selectedAccount && (
                  <span className="text-[11px] font-mono font-semibold text-slate-500">
                    City: {selectedAccount.city || 'N/A'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Account Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Select Customer Account
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    disabled={loadingAccounts}
                    className="w-full h-8.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium shadow-2xs truncate"
                  >
                    <option value="">-- Direct Number (No Account) --</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountName} {a.mobileNumber ? `(${a.mobileNumber})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone Number Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    WhatsApp Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-2.5 top-2 flex items-center gap-1 text-[11px] font-bold text-slate-500 select-none">
                      <FiPhone className="w-3 h-3 text-emerald-600" />
                      <span>+91</span>
                    </div>
                    <input
                      type="text"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      placeholder={
                        selectedAccount
                          ? selectedAccount.whatsappNumber ||
                            selectedAccount.mobileNumber ||
                            'Enter 10-digit number'
                          : '9876543210'
                      }
                      className="w-full h-8.5 pl-13 pr-3 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Template Selector & Message Composer */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    <FiMessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Message Templates & Content
                  </h2>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {message.length} characters
                </span>
              </div>

              {/* Template Buttons */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Quick Message Template
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyTemplate('GENERAL')}
                    className={`h-8 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer truncate ${
                      template === 'GENERAL'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    General
                  </button>

                  <button
                    type="button"
                    onClick={() => applyTemplate('PAYMENT_REMINDER')}
                    className={`h-8 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer truncate ${
                      template === 'PAYMENT_REMINDER'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    Payment Reminder
                  </button>

                  <button
                    type="button"
                    onClick={() => applyTemplate('BILL_COPY')}
                    className={`h-8 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer truncate ${
                      template === 'BILL_COPY'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    Bill Ready
                  </button>

                  <button
                    type="button"
                    onClick={() => applyTemplate('GREETING')}
                    className={`h-8 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer truncate ${
                      template === 'GREETING'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    Greetings
                  </button>
                </div>
              </div>

              {/* Quick Tag Insert Bar */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">
                  Insert Tag:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    insertPlaceholder(selectedAccount?.accountName || 'Customer Name')
                  }
                  className="h-6 px-2 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 rounded text-[10px] font-bold shadow-2xs cursor-pointer"
                >
                  + Name
                </button>
                {balance && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        insertPlaceholder(`Gold Fine: *${formatNumber(balance.goldFine)}g*`)
                      }
                      className="h-6 px-2 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 rounded text-[10px] font-bold shadow-2xs cursor-pointer"
                    >
                      + Gold Fine
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertPlaceholder(`Cash Due: *₹${formatNumber(balance.cash)}*`)
                      }
                      className="h-6 px-2 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200 rounded text-[10px] font-bold shadow-2xs cursor-pointer"
                    >
                      + Cash Due
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => insertPlaceholder('*Shree Jewellery*')}
                  className="h-6 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-bold shadow-2xs cursor-pointer"
                >
                  + Shop Name
                </button>
              </div>

              {/* Main Message Textarea */}
              <div className="flex-1 flex flex-col">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Message Content
                </label>
                <textarea
                  ref={textareaRef}
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your WhatsApp message here..."
                  className="w-full flex-1 p-3 text-xs font-sans leading-relaxed bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs resize-none"
                />
              </div>

              {/* Formatting Helper */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-mono">
                <span>
                  Formatting: <strong>*bold*</strong> · <em>_italic_</em> · ~strikethrough~
                </span>
                <span className="text-emerald-700 font-bold">Ready to dispatch</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Chat Simulation & Account Overview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto">
            {/* Customer Ledger Snapshot Card (if account selected) */}
            {selectedAccount && (
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Customer Ledger Balance
                  </span>
                  {loadingBalance && (
                    <span className="text-[10px] text-amber-600 font-bold animate-pulse">
                      Updating...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">
                      Gold Fine
                    </span>
                    <strong className="text-xs font-black font-mono text-amber-950 block mt-0.5">
                      {balance ? `${formatNumber(balance.goldFine)}g` : '-'}
                    </strong>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 uppercase block">
                      Silver Fine
                    </span>
                    <strong className="text-xs font-black font-mono text-slate-800 block mt-0.5">
                      {balance ? `${formatNumber(balance.silverFine)}g` : '-'}
                    </strong>
                  </div>

                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                    <span className="text-[10px] font-bold text-blue-800 uppercase block">
                      Cash Due
                    </span>
                    <strong className="text-xs font-black font-mono text-blue-950 block mt-0.5">
                      {balance ? `₹${formatNumber(balance.cash)}` : '-'}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Simulated WhatsApp Phone Mockup Card */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col flex-1">
              {/* WhatsApp Mockup Header */}
              <div className="bg-[#075e54] text-white px-3.5 py-2.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs uppercase border border-white/30">
                    {selectedAccount
                      ? selectedAccount.accountName.slice(0, 2)
                      : resolvedPhone.slice(0, 2) || 'WA'}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs leading-tight truncate max-w-[170px]">
                      {selectedAccount?.accountName || resolvedPhone || 'Customer'}
                    </h3>
                    <p className="text-[10px] text-emerald-200 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      online
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-white/80">
                  <FaWhatsapp className="w-4 h-4 text-emerald-300" />
                </div>
              </div>

              {/* WhatsApp Chat Canvas */}
              <div className="flex-1 bg-[#efeae2] p-4 flex flex-col justify-end overflow-y-auto min-h-[220px]">
                {/* Date separator pill */}
                <div className="text-center mb-3">
                  <span className="bg-white/80 text-slate-600 text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-2xs">
                    TODAY
                  </span>
                </div>

                {/* Speech Bubble */}
                <div className="self-end max-w-[90%] bg-[#dcf8c6] rounded-xl rounded-tr-xs p-3 shadow-xs border border-emerald-200/60 text-slate-800 text-xs">
                  <div className="whitespace-pre-wrap leading-relaxed select-text font-sans">
                    {message ? (
                      message
                    ) : (
                      <span className="text-slate-400 italic">
                        Message preview will appear here...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 mt-1 font-mono">
                    <span>{currentTime}</span>
                    <span className="text-emerald-700 flex">
                      <FiCheck className="w-3 h-3 -mr-1" />
                      <FiCheck className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Mockup Footer Input */}
              <div className="bg-[#f0f2f5] px-3 py-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate max-w-[200px]">
                  Recipient: <strong className="font-mono text-slate-700">{resolvedPhone || 'None'}</strong>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 uppercase">
                  Encrypted
                </span>
              </div>
            </div>

            {/* Quick Dispatch Info Note */}
            <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-950 shadow-2xs shrink-0">
              <FiInfo className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Clicking <strong>Send Message</strong> opens your native WhatsApp Desktop app or WhatsApp Web with the number and message pre-filled. 10-digit Indian numbers automatically receive the <strong>+91</strong> prefix.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WhatsAppScreen
