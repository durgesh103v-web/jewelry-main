import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration002: Migration = {
  id: '002_indexes',
  name: 'Performance Indexes Definition',
  up: (database: Database.Database) => {
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_stock_ledger_item ON stock_ledger(item_id);
      CREATE INDEX IF NOT EXISTS idx_stock_ledger_source ON stock_ledger(source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_sale_headers_account ON sale_headers(account_id);
      CREATE INDEX IF NOT EXISTS idx_sale_headers_date ON sale_headers(sale_date);
      CREATE INDEX IF NOT EXISTS idx_sale_item_lines_sale ON sale_item_lines(sale_id);
      CREATE INDEX IF NOT EXISTS idx_sale_payment_lines_sale ON sale_payment_lines(sale_id);
      CREATE INDEX IF NOT EXISTS idx_account_ledger_account ON account_ledger(account_id);
      CREATE INDEX IF NOT EXISTS idx_account_ledger_source ON account_ledger(source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_account_ledger_account_date ON account_ledger(account_id, entry_date);
      CREATE INDEX IF NOT EXISTS idx_account_ledger_date ON account_ledger(entry_date);
      CREATE INDEX IF NOT EXISTS idx_stock_ledger_item_date ON stock_ledger(item_id, entry_date);
      CREATE INDEX IF NOT EXISTS idx_stock_ledger_date ON stock_ledger(entry_date);
      CREATE INDEX IF NOT EXISTS idx_purchase_headers_account ON purchase_headers(account_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_headers_date ON purchase_headers(purchase_date);
      CREATE INDEX IF NOT EXISTS idx_purchase_item_lines_purchase ON purchase_item_lines(purchase_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_payment_lines_purchase ON purchase_payment_lines(purchase_id);
      CREATE INDEX IF NOT EXISTS idx_cash_vouchers_account ON cash_vouchers(account_id);
      CREATE INDEX IF NOT EXISTS idx_cash_vouchers_date ON cash_vouchers(voucher_date);
      CREATE INDEX IF NOT EXISTS idx_cash_fine_opening_lines_metal ON cash_fine_opening_lines(metal_type);
      CREATE INDEX IF NOT EXISTS idx_approval_headers_account ON approval_headers(account_id);
      CREATE INDEX IF NOT EXISTS idx_approval_headers_date ON approval_headers(approval_date);
      CREATE INDEX IF NOT EXISTS idx_approval_headers_status ON approval_headers(status);
      CREATE INDEX IF NOT EXISTS idx_approval_item_lines_approval ON approval_item_lines(approval_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_return_headers_account ON purchase_return_headers(account_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_return_headers_date ON purchase_return_headers(return_date);
      CREATE INDEX IF NOT EXISTS idx_purchase_return_headers_against_purchase ON purchase_return_headers(against_purchase_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_return_item_lines_return ON purchase_return_item_lines(purchase_return_id);
      CREATE INDEX IF NOT EXISTS idx_sale_return_headers_account ON sale_return_headers(account_id);
      CREATE INDEX IF NOT EXISTS idx_sale_return_headers_date ON sale_return_headers(return_date);
      CREATE INDEX IF NOT EXISTS idx_sale_return_headers_against_sale ON sale_return_headers(against_sale_id);
      CREATE INDEX IF NOT EXISTS idx_sale_return_item_lines_return ON sale_return_item_lines(sale_return_id);
      CREATE INDEX IF NOT EXISTS idx_job_work_orders_karigar ON job_work_orders(karigar_account_id);
      CREATE INDEX IF NOT EXISTS idx_job_work_orders_item ON job_work_orders(item_id);
      CREATE INDEX IF NOT EXISTS idx_job_work_orders_status ON job_work_orders(status);
      CREATE INDEX IF NOT EXISTS idx_job_work_orders_date ON job_work_orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_job_work_receipt_lines_order ON job_work_receipt_lines(job_work_order_id);
      CREATE INDEX IF NOT EXISTS idx_repair_entries_account ON repair_entries(account_id);
      CREATE INDEX IF NOT EXISTS idx_repair_entries_status ON repair_entries(status);
      CREATE INDEX IF NOT EXISTS idx_repair_entries_date ON repair_entries(receipt_date);
      CREATE INDEX IF NOT EXISTS idx_financial_years_current ON financial_years(is_current);
    `)
  }
}
