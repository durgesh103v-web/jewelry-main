import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration009: Migration = {
  id: '009_old_gold_and_exchange',
  name: 'Old Gold, Metal Exchange & Melting Valuation Engine',
  up: (database: Database.Database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS old_gold_receipts (
        id TEXT PRIMARY KEY,
        receipt_number TEXT UNIQUE NOT NULL,
        customer_id TEXT,
        account_id TEXT NOT NULL,
        receipt_date TEXT NOT NULL,
        metal_type TEXT NOT NULL DEFAULT 'Gold',
        description TEXT DEFAULT '',
        gross_weight REAL NOT NULL,
        less_weight REAL NOT NULL DEFAULT 0,
        net_weight REAL NOT NULL,
        purity_name TEXT DEFAULT '',
        tunch REAL NOT NULL DEFAULT 100,
        fine_weight REAL NOT NULL,
        recovery_percent REAL NOT NULL DEFAULT 100,
        recoverable_fine_weight REAL NOT NULL,
        gold_rate REAL NOT NULL,
        metal_value REAL NOT NULL,
        deduction_amount REAL NOT NULL DEFAULT 0,
        valuation_amount REAL NOT NULL,
        allocated_amount REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'VALUED',
        notes TEXT DEFAULT '',
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_old_gold_receipts_number ON old_gold_receipts(receipt_number);
      CREATE INDEX IF NOT EXISTS idx_old_gold_receipts_customer ON old_gold_receipts(customer_id);
      CREATE INDEX IF NOT EXISTS idx_old_gold_receipts_account ON old_gold_receipts(account_id);
      CREATE INDEX IF NOT EXISTS idx_old_gold_receipts_status ON old_gold_receipts(status);
      CREATE INDEX IF NOT EXISTS idx_old_gold_receipts_date ON old_gold_receipts(receipt_date);

      CREATE TABLE IF NOT EXISTS metal_exchanges (
        id TEXT PRIMARY KEY,
        exchange_number TEXT UNIQUE NOT NULL,
        old_gold_receipt_id TEXT NOT NULL,
        customer_id TEXT,
        account_id TEXT NOT NULL,
        order_id TEXT,
        sale_id TEXT,
        exchange_date TEXT NOT NULL,
        exchange_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'APPLIED',
        notes TEXT DEFAULT '',
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (old_gold_receipt_id) REFERENCES old_gold_receipts(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (account_id) REFERENCES accounts(id),
        FOREIGN KEY (order_id) REFERENCES customer_orders(id)
      );

      CREATE INDEX IF NOT EXISTS idx_metal_exchanges_number ON metal_exchanges(exchange_number);
      CREATE INDEX IF NOT EXISTS idx_metal_exchanges_receipt ON metal_exchanges(old_gold_receipt_id);
      CREATE INDEX IF NOT EXISTS idx_metal_exchanges_order ON metal_exchanges(order_id);
      CREATE INDEX IF NOT EXISTS idx_metal_exchanges_customer ON metal_exchanges(customer_id);
      CREATE INDEX IF NOT EXISTS idx_metal_exchanges_account ON metal_exchanges(account_id);
      CREATE INDEX IF NOT EXISTS idx_metal_exchanges_status ON metal_exchanges(status);
    `)
  }
}
