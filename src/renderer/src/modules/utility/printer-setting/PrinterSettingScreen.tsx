import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiFileText,
  FiInfo,
  FiLayout,
  FiPrinter,
  FiRefreshCw,
  FiSave,
  FiSliders,
  FiX,
  FiZap
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { toNumber, isValidAmountInput } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'
type PaperSize = 'A4' | '80MM' | '58MM'
type PrintLayout = 'STANDARD' | 'COMPACT'
type PreviewType = 'SALE' | 'ESTIMATE'

type PrinterSettingForm = {
  paperSize: PaperSize
  printLayout: PrintLayout
  printCopies: string
  marginTopMm: string
  marginRightMm: string
  marginBottomMm: string
  marginLeftMm: string
  showFirmHeader: boolean
  showGstPan: boolean
  showTerms: boolean
  showSignature: boolean
  showPaymentSection: boolean
  autoPrintAfterSave: boolean
}

const initialForm: PrinterSettingForm = {
  paperSize: 'A4',
  printLayout: 'STANDARD',
  printCopies: '1',
  marginTopMm: '10',
  marginRightMm: '10',
  marginBottomMm: '10',
  marginLeftMm: '10',
  showFirmHeader: true,
  showGstPan: true,
  showTerms: true,
  showSignature: true,
  showPaymentSection: true,
  autoPrintAfterSave: false
}





function isValidIntegerInput(value: string): boolean {
  return /^\d*$/.test(value)
}

function PrinterSettingScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [form, setForm] = useState<PrinterSettingForm>(initialForm)
  const [firm, setFirm] = useState<FirmRecord | null>(null)
  const [previewType, setPreviewType] = useState<PreviewType>('SALE')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
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

  const loadSettingsAndFirm = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const [printerData, firmData] = await Promise.all([
        window.api.printerSetting.get(),
        window.api.firm.get().catch(() => null)
      ])

      if (firmData) {
        setFirm(firmData)
      }

      setForm({
        paperSize: (printerData.paperSize as PaperSize) || 'A4',
        printLayout: (printerData.printLayout as PrintLayout) || 'STANDARD',
        printCopies: String(printerData.printCopies ?? 1),
        marginTopMm: String(printerData.marginTopMm ?? 10),
        marginRightMm: String(printerData.marginRightMm ?? 10),
        marginBottomMm: String(printerData.marginBottomMm ?? 10),
        marginLeftMm: String(printerData.marginLeftMm ?? 10),
        showFirmHeader: printerData.showFirmHeader ?? true,
        showGstPan: printerData.showGstPan ?? true,
        showTerms: printerData.showTerms ?? true,
        showSignature: printerData.showSignature ?? true,
        showPaymentSection: printerData.showPaymentSection ?? true,
        autoPrintAfterSave: printerData.autoPrintAfterSave ?? false
      })
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    void loadSettingsAndFirm()

    return () => {
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadSettingsAndFirm])

  const validateForm = (): boolean => {
    const copies = toNumber(form.printCopies)
    if (copies < 1 || copies > 5) {
      showAlert('warning', 'Print copies must be between 1 and 5.')
      return false
    }

    const margins = [
      toNumber(form.marginTopMm),
      toNumber(form.marginRightMm),
      toNumber(form.marginBottomMm),
      toNumber(form.marginLeftMm)
    ]

    if (margins.some((margin) => margin < 0 || margin > 30)) {
      showAlert('warning', 'Margins must be between 0 and 30 mm.')
      return false
    }

    return true
  }

  const handleSave = async (): Promise<void> => {
    if (!validateForm()) return

    try {
      setSaving(true)

      await window.api.printerSetting.save({
        paperSize: form.paperSize,
        printLayout: form.printLayout,
        printCopies: toNumber(form.printCopies),
        marginTopMm: toNumber(form.marginTopMm),
        marginRightMm: toNumber(form.marginRightMm),
        marginBottomMm: toNumber(form.marginBottomMm),
        marginLeftMm: toNumber(form.marginLeftMm),
        showFirmHeader: form.showFirmHeader,
        showGstPan: form.showGstPan,
        showTerms: form.showTerms,
        showSignature: form.showSignature,
        showPaymentSection: form.showPaymentSection,
        autoPrintAfterSave: form.autoPrintAfterSave
      })

      showAlert('success', 'Printer & Bill Format settings saved successfully.')
      await loadSettingsAndFirm()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleDecimalChange = (
    value: string,
    fieldName: 'marginTopMm' | 'marginRightMm' | 'marginBottomMm' | 'marginLeftMm'
  ): void => {
    if (!isValidAmountInput(value)) return
    setForm((current) => ({
      ...current,
      [fieldName]: value
    }))
  }

  const applyPreset = (preset: 'A4_STANDARD' | 'THERMAL_80' | 'COMPACT_A4'): void => {
    if (preset === 'A4_STANDARD') {
      setForm((prev) => ({
        ...prev,
        paperSize: 'A4',
        printLayout: 'STANDARD',
        marginTopMm: '10',
        marginRightMm: '10',
        marginBottomMm: '10',
        marginLeftMm: '10',
        showFirmHeader: true,
        showGstPan: true,
        showTerms: true,
        showSignature: true,
        showPaymentSection: true
      }))
      showAlert('success', 'Applied A4 Standard Laser/Inkjet preset.')
    } else if (preset === 'THERMAL_80') {
      setForm((prev) => ({
        ...prev,
        paperSize: '80MM',
        printLayout: 'COMPACT',
        marginTopMm: '5',
        marginRightMm: '5',
        marginBottomMm: '5',
        marginLeftMm: '5',
        showFirmHeader: true,
        showGstPan: false,
        showTerms: false,
        showSignature: true,
        showPaymentSection: true
      }))
      showAlert('success', 'Applied 80mm POS Thermal Receipt preset.')
    } else if (preset === 'COMPACT_A4') {
      setForm((prev) => ({
        ...prev,
        paperSize: 'A4',
        printLayout: 'COMPACT',
        marginTopMm: '8',
        marginRightMm: '8',
        marginBottomMm: '8',
        marginLeftMm: '8',
        showFirmHeader: true,
        showGstPan: true,
        showTerms: true,
        showSignature: true,
        showPaymentSection: true
      }))
      showAlert('success', 'Applied A4 Compact Summary preset.')
    }
  }

  const handleTestPrint = (): void => {
    window.print()
  }

  const previewFirmName = useMemo(() => {
    return firm?.firmName || 'SHREE GANESH JEWELLERS'
  }, [firm])

  const previewAddress = useMemo(() => {
    if (!firm) return 'Shop No. 12, Sarafa Bazar, M.G. Road, Rajkot, Gujarat - 360001'
    const parts = [firm.address, firm.city, firm.state, firm.pincode].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : 'Sarafa Bazar, Jewellery Market, Rajkot'
  }, [firm])

  const previewContact = useMemo(() => {
    const phone = firm?.mobileNumber || '9876543210'
    const gst = firm?.gstNo || '24ABCDE1234F1Z5'
    const pan = firm?.panNo || 'ABCDE1234F'
    return { phone, gst, pan }
  }, [firm])

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiPrinter className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Printer & Bill Format Settings</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                {form.paperSize} · {form.printLayout}
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Configure paper dimensions, print margins, tax invoice templates, and ledger breakdowns
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestPrint}
            title="Test actual print output via system dialog"
            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <FiPrinter className="w-3.5 h-3.5 text-amber-600" />
            <span>Test Print</span>
          </button>

          <button
            type="button"
            onClick={() => void loadSettingsAndFirm()}
            disabled={loading || saving}
            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-amber-600 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <FiSave className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
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
          {/* Left Column: Configuration Controls (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-3 overflow-y-auto pr-1">
            {/* Quick Presets Bar */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <FiZap className="w-4 h-4 text-amber-600" />
                <span>Quick Format Presets:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('A4_STANDARD')}
                  className="h-7 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                >
                  A4 Laser / Inkjet
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('THERMAL_80')}
                  className="h-7 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                >
                  80mm Thermal POS
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('COMPACT_A4')}
                  className="h-7 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                >
                  A4 Compact
                </button>
              </div>
            </div>

            {/* Section 1: Paper & Layout Engine */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col gap-3.5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  <FiLayout className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Paper & Output Layout
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Paper Sizing
                  </label>
                  <select
                    value={form.paperSize}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, paperSize: e.target.value as PaperSize }))
                    }
                    className="w-full h-8.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-2xs"
                  >
                    <option value="A4">A4 (Full Sheet · 210×297 mm)</option>
                    <option value="80MM">80mm Thermal POS Roll</option>
                    <option value="58MM">58mm Thermal Mini Roll</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Print Layout Mode
                  </label>
                  <select
                    value={form.printLayout}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, printLayout: e.target.value as PrintLayout }))
                    }
                    className="w-full h-8.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-2xs"
                  >
                    <option value="STANDARD">Standard (Detailed Item Grid)</option>
                    <option value="COMPACT">Compact (Summary Breakdown)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Print Copies
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={form.printCopies}
                      onChange={(e) => {
                        if (isValidIntegerInput(e.target.value)) {
                          setForm((prev) => ({ ...prev, printCopies: e.target.value }))
                        }
                      }}
                      placeholder="1"
                      className="w-full h-8.5 px-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Margins */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Page Margins (in millimeters)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Range: 0 - 30 mm</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">Top Margin</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={form.marginTopMm}
                        onChange={(e) => handleDecimalChange(e.target.value, 'marginTopMm')}
                        className="w-full h-7 px-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded text-slate-800 text-center focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-slate-400 font-mono">mm</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">Right Margin</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={form.marginRightMm}
                        onChange={(e) => handleDecimalChange(e.target.value, 'marginRightMm')}
                        className="w-full h-7 px-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded text-slate-800 text-center focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-slate-400 font-mono">mm</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">Bottom Margin</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={form.marginBottomMm}
                        onChange={(e) => handleDecimalChange(e.target.value, 'marginBottomMm')}
                        className="w-full h-7 px-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded text-slate-800 text-center focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-slate-400 font-mono">mm</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">Left Margin</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={form.marginLeftMm}
                        onChange={(e) => handleDecimalChange(e.target.value, 'marginLeftMm')}
                        className="w-full h-7 px-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded text-slate-800 text-center focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-slate-400 font-mono">mm</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Bill Sections & Content Controls */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col gap-3.5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  <FiSliders className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Bill Content & Section Controls
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.showFirmHeader}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, showFirmHeader: e.target.checked }))
                    }
                    className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                  />
                  <div>
                    <strong className="text-xs text-slate-800 block">Show Firm Header</strong>
                    <span className="text-[11px] text-slate-500 block">
                      Print firm name, tagline, address, and contact numbers on invoice top.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.showGstPan}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, showGstPan: e.target.checked }))
                    }
                    className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                  />
                  <div>
                    <strong className="text-xs text-slate-800 block">Show GST & PAN Info</strong>
                    <span className="text-[11px] text-slate-500 block">
                      Include GSTIN and Income Tax PAN in firm header meta block.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.showPaymentSection}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, showPaymentSection: e.target.checked }))
                    }
                    className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                  />
                  <div>
                    <strong className="text-xs text-slate-800 block">
                      Show Dar / Jama Ledger Section
                    </strong>
                    <span className="text-[11px] text-slate-500 block">
                      Print old metal balance, current bill dues, received payments, and closing balances.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.showTerms}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, showTerms: e.target.checked }))
                    }
                    className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                  />
                  <div>
                    <strong className="text-xs text-slate-800 block">Terms & Conditions</strong>
                    <span className="text-[11px] text-slate-500 block">
                      Display legal notice, subject to local jurisdiction, and return policies.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.showSignature}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, showSignature: e.target.checked }))
                    }
                    className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                  />
                  <div>
                    <strong className="text-xs text-slate-800 block">Signature Placeholders</strong>
                    <span className="text-[11px] text-slate-500 block">
                      Print customer receiver acknowledgment & authorized sign boxes.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.autoPrintAfterSave}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, autoPrintAfterSave: e.target.checked }))
                    }
                    className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                  />
                  <div>
                    <strong className="text-xs text-slate-800 block">Auto-Print on Save</strong>
                    <span className="text-[11px] text-slate-500 block">
                      Automatically trigger print dialog after saving a new transaction.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: High-Fidelity Authentic Jewelry Bill Preview (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 overflow-hidden">
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <FiFileText className="w-4 h-4 text-amber-600" />
                <span>Print Bill Format Preview</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewType('SALE')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      previewType === 'SALE'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sale Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewType('ESTIMATE')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      previewType === 'ESTIMATE'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Estimate Memo
                  </button>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-bold border border-amber-200">
                  {form.paperSize}
                </span>
              </div>
            </div>

            {/* Simulated Authentic Paper Sheet Container */}
            <div className="flex-1 bg-slate-300/80 rounded-xl border border-slate-300 p-3.5 overflow-y-auto flex items-start justify-center shadow-inner">
              {form.paperSize === 'A4' ? (
                /* ============================================================ */
                /* AUTHENTIC A4 JEWELRY TAX INVOICE FORMAT                      */
                /* ============================================================ */
                <div
                  className="bg-white shadow-2xl border-2 border-slate-900 w-full max-w-[560px] text-slate-900 font-sans transition-all duration-150"
                  style={{
                    paddingTop: `${Math.max(toNumber(form.marginTopMm) * 1.2, 10)}px`,
                    paddingRight: `${Math.max(toNumber(form.marginRightMm) * 1.2, 10)}px`,
                    paddingBottom: `${Math.max(toNumber(form.marginBottomMm) * 1.2, 10)}px`,
                    paddingLeft: `${Math.max(toNumber(form.marginLeftMm) * 1.2, 10)}px`
                  }}
                >
                  {/* Firm Header */}
                  {form.showFirmHeader && (
                    <div className="text-center pb-2 border-b-2 border-slate-900 mb-2">
                      <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">
                        || श्री गणेशाय नमः ||
                      </div>
                      <h2 className="font-black tracking-tight text-lg uppercase text-slate-950 leading-tight mt-0.5">
                        {previewFirmName}
                      </h2>
                      <p className="text-[10px] text-slate-700 font-medium leading-snug mt-0.5">
                        {previewAddress}
                      </p>
                      <div className="text-[9.5px] text-slate-800 font-mono mt-1 flex flex-wrap justify-center gap-3 font-semibold">
                        <span>Mob: {previewContact.phone}</span>
                        {form.showGstPan && (
                          <>
                            <span>GSTIN: <strong>{previewContact.gst}</strong></span>
                            <span>PAN: <strong>{previewContact.pan}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Title Banner */}
                  <div className="text-center font-black text-xs uppercase tracking-wider py-1 border-y-2 border-slate-900 bg-slate-100 mb-2">
                    {previewType === 'SALE' ? 'TAX INVOICE / SALE BILL' : 'RETAIL SALE ESTIMATE (QUOTATION)'}
                  </div>

                  {/* Invoice & Customer Meta Grid Box */}
                  <div className="grid grid-cols-2 border border-slate-900 text-[9.5px] font-mono mb-2">
                    <div className="p-2 border-r border-slate-900 flex flex-col justify-between">
                      <div>
                        <div className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                          Buyer / Customer Details:
                        </div>
                        <strong className="text-[11px] font-bold text-slate-950 block">
                          Rameshchandra S. Patel
                        </strong>
                        <div className="text-slate-700 leading-tight">
                          104, Royal Palace, M.G. Road, Rajkot
                        </div>
                        <div className="text-slate-800 mt-1">
                          Phone: <strong>+91 98251 00000</strong>
                        </div>
                      </div>
                      <div className="text-[8.5px] text-slate-500 mt-1 border-t border-slate-200 pt-0.5">
                        State: Gujarat (Code: 24)
                      </div>
                    </div>

                    <div className="p-2 flex flex-col justify-between bg-slate-50/50">
                      <div>
                        <div className="flex justify-between py-0.5 border-b border-slate-200">
                          <span className="text-slate-600">Invoice No:</span>
                          <strong className="text-slate-950 font-bold">SL-2026/0482</strong>
                        </div>
                        <div className="flex justify-between py-0.5 border-b border-slate-200">
                          <span className="text-slate-600">Date:</span>
                          <strong>14/09/2026</strong>
                        </div>
                        <div className="flex justify-between py-0.5 border-b border-slate-200">
                          <span className="text-slate-600">Time:</span>
                          <span>11:45 AM</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-600">Metal Type:</span>
                          <strong className="text-amber-900">Gold 916 (22K)</strong>
                        </div>
                      </div>
                      <div className="text-[8.5px] text-slate-500 mt-1 border-t border-slate-200 pt-0.5 flex justify-between">
                        <span>Place of Supply:</span>
                        <strong>Gujarat (24)</strong>
                      </div>
                    </div>
                  </div>

                  {/* Standard Detailed Jewelry Item Table */}
                  <table className="w-full text-left border-collapse border border-slate-900 text-[9px] font-mono mb-2">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-900 font-bold text-slate-900 text-center">
                        <th className="p-1 border-r border-slate-900 w-6">Sr No</th>
                        <th className="p-1 border-r border-slate-900 text-left">Item Description</th>
                        <th className="p-1 border-r border-slate-900 w-8">Pcs</th>
                        <th className="p-1 border-r border-slate-900 text-right w-13">Gr Wt</th>
                        <th className="p-1 border-r border-slate-900 text-right w-11">Less</th>
                        <th className="p-1 border-r border-slate-900 text-right w-13">Net Wt</th>
                        <th className="p-1 border-r border-slate-900 text-right w-10">Tunch</th>
                        <th className="p-1 border-r border-slate-900 text-right w-13">Fine Wt</th>
                        <th className="p-1 border-r border-slate-900 text-right w-12">Rate</th>
                        <th className="p-1 text-right w-15">Majuri (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      <tr>
                        <td className="p-1 border-r border-slate-900 text-center">1</td>
                        <td className="p-1 border-r border-slate-900 font-bold text-slate-950">
                          Gold Choker Necklace 916 (HM)
                        </td>
                        <td className="p-1 border-r border-slate-900 text-center">1</td>
                        <td className="p-1 border-r border-slate-900 text-right">24.500</td>
                        <td className="p-1 border-r border-slate-900 text-right text-slate-500">0.300</td>
                        <td className="p-1 border-r border-slate-900 text-right font-semibold">24.200</td>
                        <td className="p-1 border-r border-slate-900 text-right">91.60</td>
                        <td className="p-1 border-r border-slate-900 text-right font-bold text-amber-950">22.167</td>
                        <td className="p-1 border-r border-slate-900 text-right">₹200/g</td>
                        <td className="p-1 text-right font-bold">4,840.00</td>
                      </tr>
                      <tr>
                        <td className="p-1 border-r border-slate-900 text-center">2</td>
                        <td className="p-1 border-r border-slate-900 font-bold text-slate-950">
                          Gold Jhumka Earrings (Antique)
                        </td>
                        <td className="p-1 border-r border-slate-900 text-center">1</td>
                        <td className="p-1 border-r border-slate-900 text-right">12.100</td>
                        <td className="p-1 border-r border-slate-900 text-right text-slate-500">0.100</td>
                        <td className="p-1 border-r border-slate-900 text-right font-semibold">12.000</td>
                        <td className="p-1 border-r border-slate-900 text-right">91.60</td>
                        <td className="p-1 border-r border-slate-900 text-right font-bold text-amber-950">10.992</td>
                        <td className="p-1 border-r border-slate-900 text-right">₹200/g</td>
                        <td className="p-1 text-right font-bold">2,400.00</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 border-t-2 border-slate-900 font-black text-slate-950">
                        <td colSpan={2} className="p-1 border-r border-slate-900 text-center uppercase">
                          TOTAL BILL WEIGHTS:
                        </td>
                        <td className="p-1 border-r border-slate-900 text-center">2</td>
                        <td className="p-1 border-r border-slate-900 text-right">36.600g</td>
                        <td className="p-1 border-r border-slate-900 text-right text-slate-600">0.400g</td>
                        <td className="p-1 border-r border-slate-900 text-right font-black">36.200g</td>
                        <td className="p-1 border-r border-slate-900 text-right">-</td>
                        <td className="p-1 border-r border-slate-900 text-right font-black text-amber-950">
                          33.159g
                        </td>
                        <td className="p-1 border-r border-slate-900 text-right">-</td>
                        <td className="p-1 text-right font-black text-blue-950">
                          ₹7,240.00
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Dar / Jama Ledger Balance Breakdown Box */}
                  {form.showPaymentSection && (
                    <div className="border border-slate-900 text-[9px] font-mono mb-2">
                      <div className="bg-slate-100 px-2 py-0.5 border-b border-slate-900 font-bold flex justify-between text-slate-900">
                        <span>ACCOUNT LEDGER & DAR / JAMA SETTLEMENT</span>
                        <span className="text-[8px] text-slate-500 uppercase">Dual Metal & Cash Ledger</span>
                      </div>
                      <div className="grid grid-cols-4 divide-x divide-slate-900 p-1 bg-white">
                        <div className="px-1.5 py-0.5">
                          <span className="text-[8px] text-slate-500 block uppercase">1. Old Opening Balance</span>
                          <div className="font-bold text-slate-900">Fine: 0.000g</div>
                          <div className="font-bold text-slate-900">Cash: ₹0.00</div>
                        </div>

                        <div className="px-1.5 py-0.5">
                          <span className="text-[8px] text-slate-500 block uppercase">2. Current Bill Due</span>
                          <div className="font-bold text-amber-950">Fine: +33.159g</div>
                          <div className="font-bold text-blue-950">Majuri: +₹7,240.00</div>
                        </div>

                        <div className="px-1.5 py-0.5">
                          <span className="text-[8px] text-slate-500 block uppercase">3. Old Metal & Cash Jama</span>
                          <div className="font-bold text-emerald-800">Old Gold: -15.000g</div>
                          <div className="font-bold text-emerald-800">Cash Recv: -₹5,000.00</div>
                        </div>

                        <div className="px-1.5 py-0.5 bg-amber-50/50">
                          <span className="text-[8px] font-bold text-amber-900 block uppercase">4. Net Closing Balance</span>
                          <div className="font-black text-amber-950">Fine Due: 18.159g</div>
                          <div className="font-black text-blue-950">Cash Due: ₹2,240.00</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Amount in words & Tax summary */}
                  <div className="flex items-center justify-between text-[8.5px] font-mono border-t border-slate-900 pt-1 mb-2">
                    <div>
                      <span className="text-slate-500">Amount in Words: </span>
                      <strong className="text-slate-900">Seven Thousand Two Hundred Forty Rupees Only</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">E. & O.E.</span>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  {form.showTerms && (
                    <div className="text-[8px] text-slate-600 border border-slate-300 p-1.5 rounded bg-slate-50/80 mb-2 font-sans leading-tight">
                      <div className="font-bold text-slate-800 mb-0.5">Terms & Conditions:</div>
                      <p>1. Certified 100% BIS Hallmarked Jewellery. Weight and purity verified before dispatch.</p>
                      <p>2. Old gold melting loss and testing subject to trade custom. Goods once sold are not returnable without bill.</p>
                      <p>3. Subject to Rajkot jurisdiction only.</p>
                    </div>
                  )}

                  {/* Signatures */}
                  {form.showSignature && (
                    <div className="grid grid-cols-2 pt-6 text-[8.5px] font-bold font-sans border-t border-slate-300">
                      <div className="text-center">
                        <div className="w-32 border-b border-slate-900 mx-auto mb-1" />
                        <span className="text-slate-800">Customer Receiver Signature</span>
                      </div>
                      <div className="text-center">
                        <div className="w-36 border-b border-slate-900 mx-auto mb-1" />
                        <span className="text-slate-900 font-extrabold uppercase">For {previewFirmName}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ============================================================ */
                /* AUTHENTIC 80MM / 58MM POS THERMAL RECEIPT FORMAT             */
                /* ============================================================ */
                <div
                  className={`bg-white shadow-2xl border border-slate-400 text-slate-900 font-mono transition-all duration-150 ${
                    form.paperSize === '80MM' ? 'w-[290px] text-[9.5px] p-3' : 'w-[220px] text-[8.5px] p-2'
                  }`}
                  style={{
                    paddingTop: `${Math.max(toNumber(form.marginTopMm) * 0.8, 6)}px`,
                    paddingRight: `${Math.max(toNumber(form.marginRightMm) * 0.8, 6)}px`,
                    paddingBottom: `${Math.max(toNumber(form.marginBottomMm) * 0.8, 6)}px`,
                    paddingLeft: `${Math.max(toNumber(form.marginLeftMm) * 0.8, 6)}px`
                  }}
                >
                  {/* Thermal Header */}
                  {form.showFirmHeader && (
                    <div className="text-center pb-1.5 border-b border-dashed border-slate-800 mb-2">
                      <h2 className="font-black text-xs uppercase tracking-tight leading-tight">
                        {previewFirmName}
                      </h2>
                      <p className="text-[8.5px] text-slate-600 mt-0.5 leading-tight">
                        {previewAddress}
                      </p>
                      <div className="text-[8px] font-bold text-slate-800 mt-0.5">
                        Mob: {previewContact.phone}
                      </div>
                      {form.showGstPan && (
                        <div className="text-[8px] text-slate-600">
                          GSTIN: {previewContact.gst}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Thermal Title */}
                  <div className="text-center font-bold text-[10px] uppercase tracking-widest border-b border-dashed border-slate-800 pb-1 mb-1.5">
                    {previewType === 'SALE' ? '* TAX INVOICE *' : '* ESTIMATE MEMO *'}
                  </div>

                  {/* Thermal Meta */}
                  <div className="text-[8.5px] border-b border-dashed border-slate-800 pb-1 mb-1.5 leading-tight">
                    <div className="flex justify-between">
                      <span>Bill: <strong>SL-0482</strong></span>
                      <span>14/09/2026 11:45</span>
                    </div>
                    <div>Cust: <strong>Rameshchandra S. Patel</strong></div>
                    <div>Phone: 9825100000</div>
                    <div>Metal: <strong>Gold 916 (22K)</strong></div>
                  </div>

                  {/* Thermal Items List */}
                  <div className="border-b border-dashed border-slate-800 pb-1 mb-1.5">
                    <div className="font-bold flex justify-between border-b border-slate-300 pb-0.5 mb-1 text-[8.5px]">
                      <span>Item / Wt</span>
                      <span>Fine / Majuri</span>
                    </div>

                    <div className="mb-1">
                      <div className="font-bold">1. Gold Choker Necklace 916</div>
                      <div className="flex justify-between text-slate-600 text-[8px]">
                        <span>Gr: 24.500g · Net: 24.200g</span>
                        <strong className="text-slate-900 font-bold">22.167g | ₹4,840</strong>
                      </div>
                    </div>

                    <div className="mb-0.5">
                      <div className="font-bold">2. Gold Jhumka Earrings</div>
                      <div className="flex justify-between text-slate-600 text-[8px]">
                        <span>Gr: 12.100g · Net: 12.000g</span>
                        <strong className="text-slate-900 font-bold">10.992g | ₹2,400</strong>
                      </div>
                    </div>
                  </div>

                  {/* Thermal Totals */}
                  <div className="border-b border-dashed border-slate-800 pb-1 mb-1.5 text-[9px] font-bold">
                    <div className="flex justify-between">
                      <span>Total Net Wt:</span>
                      <span>36.200g</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Fine Wt:</span>
                      <span className="text-amber-950 font-black">33.159g</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Majuri:</span>
                      <span className="text-blue-950 font-black">₹7,240.00</span>
                    </div>
                  </div>

                  {/* Thermal Ledger & Jama */}
                  {form.showPaymentSection && (
                    <div className="border-b border-dashed border-slate-800 pb-1 mb-1.5 text-[8.5px]">
                      <div className="font-bold text-slate-700 uppercase mb-0.5">Settlement:</div>
                      <div className="flex justify-between text-slate-600">
                        <span>Old Gold Recv:</span>
                        <span>-15.000g</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Cash Paid:</span>
                        <span>-₹5,000.00</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-950 pt-0.5 border-t border-slate-300 mt-0.5">
                        <span>Net Fine Due:</span>
                        <span>18.159g</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-950">
                        <span>Net Cash Due:</span>
                        <span>₹2,240.00</span>
                      </div>
                    </div>
                  )}

                  {/* Thermal Terms & Footer */}
                  {form.showTerms && (
                    <div className="text-[7.5px] text-center text-slate-500 py-1 leading-tight">
                      Subject to Rajkot jurisdiction.
                      <br />
                      Goods once sold not returnable without bill.
                    </div>
                  )}

                  {/* Thermal Footer Greeting */}
                  <div className="text-center font-bold text-[8.5px] pt-1 border-t border-dashed border-slate-800">
                    *** THANK YOU, VISIT AGAIN! ***
                  </div>
                </div>
              )}
            </div>

            {/* Footnote advice */}
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-lg p-2 flex items-start gap-2 text-[11px] text-amber-950 shadow-2xs shrink-0">
              <FiInfo className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                These exact margins and formatting are applied directly when printing Sale Invoices, Estimation Memos, and Vouchers.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrinterSettingScreen
