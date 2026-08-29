import React, { lazy } from 'react'

// Direct static imports for fast/smaller screens
import AccountGroupScreen from '../../modules/master/account-group/AccountGroupScreen'
import ItemGroupScreen from '../../modules/master/item-group/ItemGroupScreen'
import ItemStampScreen from '../../modules/master/item-stamp/ItemStampScreen'
import ItemDesignScreen from '../../modules/master/item-design/ItemDesignScreen'
import ItemOpeningStockScreen from '../../modules/master/item-opening-stock/ItemOpeningStockScreen'
import FirmMasterScreen from '../../modules/master/firm-master/FirmMasterScreen'
import CashFineOpeningScreen from '../../modules/master/cash-fine-opening/CashFineOpeningScreen'
import TransferScreen from '../../modules/transaction/transfer/TransferScreen'
import WeightScanScreen from '../../modules/transaction/weight-scan/WeightScanScreen'
import SaudaBookScreen from '../../modules/transaction/sauda-book/SaudaBookScreen'
import OrderPayalScreen from '../../modules/transaction/order-payal/OrderPayalScreen'
import SettlementScreen from '../../modules/transaction/settlement/SettlementScreen'
import PurchaseRegisterScreen from '../../modules/transaction/purchase-register/PurchaseRegisterScreen'
import CashVoucherScreen from '../../modules/transaction/cash-voucher/CashVoucherScreen'
import SaleRegisterScreen from '../../modules/transaction/sale-register/SaleRegisterScreen'
import BankTransactionsReportScreen from '../../modules/reports/bank-transactions/BankTransactionsReportScreen'
import AccountwiseDetailsReportScreen from '../../modules/reports/accountwise-details/AccountwiseDetailsReportScreen'
import PartyStatementScreen from '../../modules/reports/party-statement/PartyStatementScreen'
import AccountWiseSalePurchaseReportScreen from '../../modules/reports/account-wise-sale-purchase/AccountWiseSalePurchaseReportScreen'
import DarRojmelReportScreen from '../../modules/reports/dar-rojmel/DarRojmelReportScreen'
import AccountwiseSummaryReportScreen from '../../modules/reports/accountwise-summary/AccountwiseSummaryReportScreen'
import ItemwiseSalePurchaseReportScreen from '../../modules/reports/itemwise-sale-purchase/ItemwiseSalePurchaseReportScreen'
import ItemSalePurchaseCityWiseReportScreen from '../../modules/reports/item-sale-purchase-city-wise/ItemSalePurchaseCityWiseReportScreen'
import PaymentReceiptReportScreen from '../../modules/reports/payment-receipt/PaymentReceiptReportScreen'
import ItemStockReportScreen from '../../modules/reports/item-stock/ItemStockReportScreen'
import ItemTransactionReportScreen from '../../modules/reports/item-transaction/ItemTransactionReportScreen'
import StockLedgerScreen from '../../modules/reports/stock-ledger/StockLedgerScreen'
import GstPurchaseReportScreen from '../../modules/gst/gst-purchase/GstPurchaseReportScreen'
import GstSaleReportScreen from '../../modules/gst/gst-sale/GstSaleReportScreen'
import RetailSaleEstimateScreen from '../../modules/gst/retail-sale-estimate/RetailSaleEstimateScreen'
import EstimateRegisterScreen from '../../modules/gst/estimate-register/EstimateRegisterScreen'
import FineRojmelReportScreen from '../../modules/reports/fine-rojmel/FineRojmelReportScreen'
import FineMarginReportScreen from '../../modules/reports/fine-margin/FineMarginReportScreen'
import DailySummaryReportScreen from '../../modules/reports/daily-summary/DailySummaryReportScreen'
import BackupRestoreScreen from '../../modules/utility/backup-restore/BackupRestoreScreen'
import PrinterSettingScreen from '../../modules/utility/printer-setting/PrinterSettingScreen'
import ChangePasswordScreen from '../../modules/utility/change-password/ChangePasswordScreen'
import FinancialYearScreen from '../../modules/utility/financial-year/FinancialYearScreen'
import BarcodePrintingScreen from '../../modules/utility/barcode-printing/BarcodePrintingScreen'
import DeleteSaleBillsScreen from '../../modules/utility/delete-sale-bills/DeleteSaleBillsScreen'
import ReminderScreen from '../../modules/utility/reminder/ReminderScreen'
import WhatsAppScreen from '../../modules/utility/whatsapp/WhatsAppScreen'
import ScreenshotScreen from '../../modules/utility/screenshot/ScreenshotScreen'
import SettingsScreen from '../../modules/utility/settings/SettingsScreen'

// React.lazy imports for heavy transaction & report screens
const SaleScreen = lazy(() => import('../../modules/transaction/sale/SaleScreen'))
const SaleReturnScreen = lazy(() => import('../../modules/transaction/sale-return/SaleReturnScreen'))
const ApprovalScreen = lazy(() => import('../../modules/transaction/approval/ApprovalScreen'))
const PurchaseScreen = lazy(() => import('../../modules/transaction/purchase/PurchaseScreen'))
const PurchaseReturnScreen = lazy(() => import('../../modules/transaction/purchase-return/PurchaseReturnScreen'))
const JobWorkScreen = lazy(() => import('../../modules/transaction/job-work/JobWorkScreen'))
const RepairEntryScreen = lazy(() => import('../../modules/transaction/repair-entry/RepairEntryScreen'))
const AccountMasterScreen = lazy(() => import('../../modules/master/account-master/AccountMasterScreen'))
const ItemMasterScreen = lazy(() => import('../../modules/master/item-master/ItemMasterScreen'))
const AccountBalanceReportScreen = lazy(() => import('../../modules/reports/account-balance/AccountBalanceReportScreen'))
const OutstandingReportScreen = lazy(() => import('../../modules/reports/outstanding/OutstandingReportScreen'))
const CashBookReportScreen = lazy(() => import('../../modules/reports/cash-book/CashBookReportScreen'))

export type ScreenComponentProps = {
  onClose: () => void
  onNavigate?: (id: string, label: string, module: 'home' | 'master' | 'transaction' | 'reports' | 'gst' | 'utility') => void
  initialVoucherType?: 'PAYMENT' | 'RECEIPT'
  title?: string
  helpText?: string
  [key: string]: unknown
}

export type ScreenMapValue = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>
  defaultProps?: Record<string, unknown>
}

export const screenRegistry: Record<string, ScreenMapValue> = {
  'account-group': { component: AccountGroupScreen },
  'account-master': { component: AccountMasterScreen },
  'item-group': { component: ItemGroupScreen },
  'item-stamp': { component: ItemStampScreen },
  'item-design': { component: ItemDesignScreen },
  'item-master': { component: ItemMasterScreen },
  'item-opening-stock': { component: ItemOpeningStockScreen },
  'firm-master': { component: FirmMasterScreen },
  'cash-fine-opening': { component: CashFineOpeningScreen },
  sale: { component: SaleScreen },
  'sale-return': { component: SaleReturnScreen },
  approval: { component: ApprovalScreen },
  purchase: { component: PurchaseScreen },
  'purchase-return': { component: PurchaseReturnScreen },
  'job-work': { component: JobWorkScreen },
  'repair-entry': { component: RepairEntryScreen },
  'cash-payment-nave': {
    component: CashVoucherScreen,
    defaultProps: { initialVoucherType: 'PAYMENT' }
  },
  'cash-receipt-jama': {
    component: CashVoucherScreen,
    defaultProps: { initialVoucherType: 'RECEIPT' }
  },
  transfer: { component: TransferScreen },
  'weight-scan': { component: WeightScanScreen },
  'sauda-book': { component: SaudaBookScreen },
  'order-payal': { component: OrderPayalScreen },
  settlement: { component: SettlementScreen },
  'purchase-register': { component: PurchaseRegisterScreen },
  'sale-register': { component: SaleRegisterScreen },
  'account-balance': { component: AccountBalanceReportScreen },
  outstanding: { component: OutstandingReportScreen },
  'cash-book': { component: CashBookReportScreen },
  'bank-transactions': { component: BankTransactionsReportScreen },
  'fine-rojmel': { component: FineRojmelReportScreen },
  'fine-margin': { component: FineMarginReportScreen },
  'daily-summary-report': { component: DailySummaryReportScreen },
  'accountwise-details': { component: AccountwiseDetailsReportScreen },
  'party-statement': { component: PartyStatementScreen },
  'account-wise-sale-purchase': { component: AccountWiseSalePurchaseReportScreen },
  'dar-rojmel': { component: DarRojmelReportScreen },
  'accountwise-summary': { component: AccountwiseSummaryReportScreen },
  'itemwise-sale-purchase': { component: ItemwiseSalePurchaseReportScreen },
  'item-sale-purchase-city-wise': { component: ItemSalePurchaseCityWiseReportScreen },
  'payment-receipt': { component: PaymentReceiptReportScreen },
  'item-stock': { component: ItemStockReportScreen },
  'item-transaction': { component: ItemTransactionReportScreen },
  'stock-ledger': { component: StockLedgerScreen },
  'gst-purchase': { component: GstPurchaseReportScreen },
  'retail-sale-gst': {
    component: GstSaleReportScreen,
    defaultProps: {
      title: 'Retail Sale GST',
      helpText:
        'Retail Sale GST lists retail sale bills with taxable amount and CGST / SGST / IGST split. Amounts show zero until GST fields are captured during Sale entry.'
    }
  },
  'gst-sale-register': {
    component: GstSaleReportScreen,
    defaultProps: {
      title: 'GST Sale Register',
      helpText:
        'GST Sale Register lists all sale bills with taxable amount and CGST / SGST / IGST split. Amounts show zero until GST fields are captured during Sale entry.'
    }
  },
  'retail-sale-estimate': { component: RetailSaleEstimateScreen },
  'estimate-register': { component: EstimateRegisterScreen },
  backup: { component: BackupRestoreScreen },
  'restore-backup': { component: BackupRestoreScreen },
  'printer-setting': { component: PrinterSettingScreen },
  'barcode-printing': { component: BarcodePrintingScreen },
  'change-password': { component: ChangePasswordScreen },
  'financial-year': { component: FinancialYearScreen },
  'delete-sale-bills': { component: DeleteSaleBillsScreen },
  reminder: { component: ReminderScreen },
  whatsapp: { component: WhatsAppScreen },
  screenshot: { component: ScreenshotScreen },
  settings: { component: SettingsScreen }
}
