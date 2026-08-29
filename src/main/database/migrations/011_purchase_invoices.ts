import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration011: Migration = {
  id: '011_purchase_invoices',
  name: 'Purchase, Inward Stock & Supplier Invoicing Engine',
  up: (database: Database.Database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS purchase_invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT UNIQUE NOT NULL,
        supplier_id TEXT,
        account_id TEXT NOT NULL,
        supplier_invoice_number TEXT DEFAULT '',
        invoice_date TEXT NOT NULL,
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
        grand_total REAL NOT NULL DEFAULT 0,
        paid_amount REAL NOT NULL DEFAULT 0,
        balance_due REAL NOT NULL DEFAULT 0,
        pricing_snapshot TEXT,
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        notes TEXT DEFAULT '',
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_purchase_invoices_number ON purchase_invoices(invoice_number);
      CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON purchase_invoices(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_invoices_account ON purchase_invoices(account_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date ON purchase_invoices(invoice_date);
      CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON purchase_invoices(status);

      CREATE TABLE IF NOT EXISTS purchase_invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        description TEXT DEFAULT '',
        stamp_id TEXT,
        design_id TEXT,
        barcode TEXT,
        pcs INTEGER NOT NULL DEFAULT 1,
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
        FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_invoice ON purchase_invoice_items(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_item ON purchase_invoice_items(item_id);

      CREATE TABLE IF NOT EXISTS purchase_invoice_payments (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'CASH',
        amount REAL NOT NULL,
        payment_reference TEXT DEFAULT '',
        payment_date TEXT NOT NULL,
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_purchase_invoice_payments_invoice ON purchase_invoice_payments(invoice_id);
    `)
  }
}
