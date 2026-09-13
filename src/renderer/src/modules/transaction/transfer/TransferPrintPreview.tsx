import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { amountInWords } from '../../../utils/amountInWords'
import { formatAmount, formatDate } from '../../../utils/printFormat'

const defaultPrinterSetting: PrinterSettingPayload = {
  paperSize: 'A4',
  printLayout: 'STANDARD',
  printCopies: 1,
  marginTopMm: 10,
  marginRightMm: 10,
  marginBottomMm: 10,
  marginLeftMm: 10,
  showFirmHeader: true,
  showGstPan: true,
  showTerms: true,
  showSignature: true,
  showPaymentSection: true,
  autoPrintAfterSave: false
}

type TransferPrintPreviewProps = {
  transfer: TransferRecord
  onClose: () => void
  autoPrintOnOpen?: boolean
}

function TransferPrintPreview({
  transfer,
  onClose,
  autoPrintOnOpen = false
}: TransferPrintPreviewProps): React.JSX.Element {
  const [firm, setFirm] = useState<FirmRecord | null>(null)
  const [printerSetting, setPrinterSetting] = useState<PrinterSettingPayload>(defaultPrinterSetting)
  const [loadedSettings, setLoadedSettings] = useState(false)

  const copyCount = useMemo(() => {
    const count = Number(printerSetting.printCopies || 1)
    return Math.min(Math.max(count, 1), 5)
  }, [printerSetting.printCopies])

  const pageClassName = [
    'sale-print-page',
    `sale-print-paper-${String(printerSetting.paperSize || 'A4').toLowerCase()}`,
    `sale-print-layout-${String(printerSetting.printLayout || 'STANDARD').toLowerCase()}`
  ].join(' ')

  const pageStyle: CSSProperties = {
    paddingTop: `${printerSetting.marginTopMm ?? 10}mm`,
    paddingRight: `${printerSetting.marginRightMm ?? 10}mm`,
    paddingBottom: `${printerSetting.marginBottomMm ?? 10}mm`,
    paddingLeft: `${printerSetting.marginLeftMm ?? 10}mm`
  }

  const totalAmount = (transfer.cash || 0) + (transfer.bank || 0) + (transfer.anamat || 0)

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const loadPrintData = async (): Promise<void> => {
        try {
          const [firmData, printerData] = await Promise.all([
            window.api.firm.get(),
            window.api.printerSetting.get()
          ])

          setFirm(firmData)
          setPrinterSetting({ ...defaultPrinterSetting, ...printerData })
        } catch {
          setFirm(null)
          setPrinterSetting(defaultPrinterSetting)
        } finally {
          setLoadedSettings(true)
        }
      }

      void loadPrintData()
    }, 0)

    return () => window.clearTimeout(loadTimer)
  }, [])

  useEffect(() => {
    if (!loadedSettings || !autoPrintOnOpen || !printerSetting.autoPrintAfterSave) return

    const printTimer = window.setTimeout(() => {
      window.print()
    }, 300)

    return () => window.clearTimeout(printTimer)
  }, [autoPrintOnOpen, loadedSettings, printerSetting.autoPrintAfterSave])

  return (
    <div className="print-preview-overlay">
      <div className="print-preview-window">
        <div className="print-preview-toolbar">
          <strong>
            Transfer Voucher Slip - {printerSetting.paperSize} / {printerSetting.printLayout}
          </strong>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer"
              onClick={() => window.print()}
            >
              🖨️ Print Slip
            </button>
            <button
              type="button"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              onClick={onClose}
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div className="print-preview-content">
          {Array.from({ length: copyCount }).map((_, copyIndex) => (
            <div key={`transfer-slip-${copyIndex}`} className={pageClassName} style={pageStyle}>
              {/* Header */}
              <div className="sale-print-header">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{firm?.firmName || 'SHREE JEWELLERS'}</h2>
                  {printerSetting.showFirmHeader && firm?.tagline && (
                    <p className="text-[11px] text-slate-500">{firm.tagline}</p>
                  )}
                  {printerSetting.showFirmHeader && firm?.address && (
                    <p className="text-[10px] text-slate-500">{firm.address}</p>
                  )}
                  {printerSetting.showGstPan && (
                    <div className="text-[10px] text-slate-600 flex gap-3 mt-0.5">
                      {firm?.gstNo && <span>GST: {firm.gstNo}</span>}
                      {firm?.panNo && <span>PAN: {firm.panNo}</span>}
                      {firm?.mobileNumber && <span>MOB: {firm.mobileNumber}</span>}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
                    TRANSFER VOUCHER
                  </span>
                  <p className="text-[11px] font-mono font-bold mt-1">Voucher No: {transfer.transferNo}</p>
                  <p className="text-[11px] text-slate-600">Date: {formatDate(transfer.transferDate)}</p>
                </div>
              </div>

              {/* Accounts Involved */}
              <div className="grid grid-cols-2 gap-4 my-3 p-2.5 bg-slate-50 rounded border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">From Account (Nave / Dr)</span>
                  <strong className="text-sm text-slate-900">{transfer.fromAccountName}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">To Account (Jama / Cr)</span>
                  <strong className="text-sm text-slate-900">{transfer.toAccountName}</strong>
                </div>
              </div>

              {/* Transfer Details Table */}
              <table className="w-full text-xs border-collapse border border-slate-300 my-2">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold">
                    <th className="border border-slate-300 p-2 text-left">Transfer Particulars</th>
                    <th className="border border-slate-300 p-2 text-right">Value / Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {transfer.goldFine > 0 && (
                    <tr>
                      <td className="border border-slate-300 p-2 font-medium">🪙 Gold Fine Transfer</td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold text-amber-800">
                        {transfer.goldFine.toFixed(3)} g
                      </td>
                    </tr>
                  )}
                  {transfer.silverFine > 0 && (
                    <tr>
                      <td className="border border-slate-300 p-2 font-medium">🥈 Silver Fine Transfer</td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold text-slate-800">
                        {transfer.silverFine.toFixed(3)} g
                      </td>
                    </tr>
                  )}
                  {transfer.cash > 0 && (
                    <tr>
                      <td className="border border-slate-300 p-2 font-medium">💵 Cash Amount Transfer</td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold text-emerald-800">
                        ₹{formatAmount(transfer.cash)}
                      </td>
                    </tr>
                  )}
                  {transfer.bank > 0 && (
                    <tr>
                      <td className="border border-slate-300 p-2 font-medium">🏦 Bank Amount Transfer</td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold text-blue-800">
                        ₹{formatAmount(transfer.bank)}
                      </td>
                    </tr>
                  )}
                  {transfer.anamat > 0 && (
                    <tr>
                      <td className="border border-slate-300 p-2 font-medium">📦 Anamat (Deposit) Transfer</td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold text-amber-800">
                        ₹{formatAmount(transfer.anamat)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Total In Words if cash/bank involved */}
              {totalAmount > 0 && (
                <div className="text-[11px] text-slate-600 italic my-1">
                  Amount in words: {amountInWords(totalAmount)}
                </div>
              )}

              {/* Narration */}
              {transfer.narration && (
                <div className="text-xs text-slate-700 my-2 p-2 bg-slate-50 rounded border border-slate-200">
                  <strong>Narration:</strong> {transfer.narration}
                </div>
              )}

              {/* Signature Section */}
              {printerSetting.showSignature && (
                <div className="flex justify-between items-end mt-12 pt-4 border-t border-slate-200 text-xs">
                  <div className="text-center">
                    <p className="text-slate-400 font-semibold mb-8">Verified By</p>
                    <p className="border-t border-slate-300 pt-1 font-semibold">From Account Signature</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400 font-semibold mb-8">For {firm?.firmName || 'SHREE JEWELLERS'}</p>
                    <p className="border-t border-slate-300 pt-1 font-semibold">Authorized Signatory</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TransferPrintPreview
