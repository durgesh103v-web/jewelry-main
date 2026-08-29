import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration012: Migration = {
  id: '012_return_transactions',
  name: 'Sales Return, Purchase Return & Credit/Debit Note Engine',
  up: (database: Database.Database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS return_transactions (
        id TEXT PRIMARY KEY,
        return_number TEXT UNIQUE NOT NULL,
        return_type TEXT NOT NULL,
        note_type TEXT NOT NULL,
        original_sales_invoice_id TEXT,
        original_purchase_invoice_id TEXT,
        original_invoice_number TEXT DEFAULT '',
        customer_id TEXT,
        supplier_id TEXT,
        account_id TEXT NOT NULL,
        return_date TEXT NOT NULL,
        metal_type TEXT NOT NULL DEFAULT 'Gold',
        total_pcs INTEGER NOT NULL DEFAULT 0,
        gross_weight REAL NOT NULL DEFAULT 0,
        net_weight REAL NOT NULL DEFAULT 0,
        fine_weight REAL NOT NULL DEFAULT 0,
        subtotal REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        taxable_amount REAL NOT NULL DEFAULT 0,
        tax_amount REAL NOT NULL DEFAULT 0,
        round_off REAL NOT NULL DEFAULT 0,
        return_total REAL NOT NULL DEFAULT 0,
        refund_amount REAL NOT NULL DEFAULT 0,
        adjustment_amount REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        reason TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (original_sales_invoice_id) REFERENCES sales_invoices(id),
        FOREIGN KEY (original_purchase_invoice_id) REFERENCES purchase_invoices(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_return_tx_number ON return_transactions(return_number);
      CREATE INDEX IF NOT EXISTS idx_return_tx_type ON return_transactions(return_type);
      CREATE INDEX IF NOT EXISTS idx_return_tx_sales_inv ON return_transactions(original_sales_invoice_id);
      CREATE INDEX IF NOT EXISTS idx_return_tx_purch_inv ON return_transactions(original_purchase_invoice_id);
      CREATE INDEX IF NOT EXISTS idx_return_tx_customer ON return_transactions(customer_id);
      CREATE INDEX IF NOT EXISTS idx_return_tx_supplier ON return_transactions(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_return_tx_account ON return_transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_return_tx_date ON return_transactions(return_date);

      CREATE TABLE IF NOT EXISTS return_transaction_items (
        id TEXT PRIMARY KEY,
        return_id TEXT NOT NULL,
        original_item_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        description TEXT DEFAULT '',
        stamp_id TEXT,
        design_id TEXT,
        barcode TEXT,
        return_pcs INTEGER NOT NULL DEFAULT 1,
        gross_weight REAL NOT NULL,
        pack_weight REAL NOT NULL DEFAULT 0,
        less_weight REAL NOT NULL DEFAULT 0,
        add_weight REAL NOT NULL DEFAULT 0,
        net_weight REAL NOT NULL,
        metal_type TEXT NOT NULL DEFAULT 'Gold',
        purity_name TEXT DEFAULT '',
        tunch REAL NOT NULL DEFAULT 100,
        wastage REAL NOT NULL DEFAULT 0,
        fine_weight REAL NOT NULL,
        gold_rate REAL NOT NULL,
        metal_value REAL NOT NULL,
        labour_rate REAL NOT NULL DEFAULT 0,
        labour_rate_type TEXT NOT NULL DEFAULT 'Kg',
        making_charges REAL NOT NULL DEFAULT 0,
        stone_charges REAL NOT NULL DEFAULT 0,
        diamond_charges REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        taxable_amount REAL NOT NULL,
        tax_percent REAL NOT NULL DEFAULT 0,
        tax_amount REAL NOT NULL DEFAULT 0,
        line_total REAL NOT NULL,
        pricing_breakdown TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (return_id) REFERENCES return_transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON return_transaction_items(return_id);
      CREATE INDEX IF NOT EXISTS idx_return_items_orig_item ON return_transaction_items(original_item_id);
      CREATE INDEX IF NOT EXISTS idx_return_items_item_id ON return_transaction_items(item_id);

      CREATE TABLE IF NOT EXISTS return_transaction_refunds (
        id TEXT PRIMARY KEY,
        return_id TEXT NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'CASH',
        amount REAL NOT NULL,
        payment_reference TEXT DEFAULT '',
        refund_date TEXT NOT NULL,
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (return_id) REFERENCES return_transactions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_return_refunds_return_id ON return_transaction_refunds(return_id);
    `)
  }
}
