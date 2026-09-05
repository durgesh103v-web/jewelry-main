import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration018: Migration = {
  id: '018_vendor_consignment_and_memo',
  name: 'Canonical Vendor Consignment, Approval Inward, Memo and Settlement Management Schema',
  up: (database: Database.Database) => {
    database.exec(`
      -- 1. Consignment Inward Header
      CREATE TABLE IF NOT EXISTS consignment_inwards (
        id TEXT PRIMARY KEY,
        consignment_number TEXT NOT NULL UNIQUE,
        supplier_id TEXT NOT NULL REFERENCES suppliers(id),
        inward_date TEXT NOT NULL,
        expected_return_date TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PARTIALLY_SETTLED, COMPLETED, CLOSED
        settlement_status TEXT NOT NULL DEFAULT 'UNSETTLED', -- UNSETTLED, PARTIALLY_SETTLED, SETTLED
        total_pieces INTEGER NOT NULL DEFAULT 0,
        total_gross_weight REAL NOT NULL DEFAULT 0,
        total_vendor_cost REAL NOT NULL DEFAULT 0,
        total_settled_amount REAL NOT NULL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_by TEXT DEFAULT 'Admin',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_ci_number ON consignment_inwards(consignment_number);
      CREATE INDEX IF NOT EXISTS idx_ci_supplier ON consignment_inwards(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_ci_status ON consignment_inwards(status);
      CREATE INDEX IF NOT EXISTS idx_ci_settlement_status ON consignment_inwards(settlement_status);
      CREATE INDEX IF NOT EXISTS idx_ci_inward_date ON consignment_inwards(inward_date);

      -- 2. Consignment Items (Lines linking to Physical Jewellery Stock)
      CREATE TABLE IF NOT EXISTS consignment_items (
        id TEXT PRIMARY KEY,
        consignment_inward_id TEXT NOT NULL REFERENCES consignment_inwards(id),
        supplier_id TEXT NOT NULL REFERENCES suppliers(id),
        stock_item_id TEXT NOT NULL REFERENCES jewellery_stock_items(id),
        item_id TEXT NOT NULL REFERENCES items(id),
        vendor_item_code TEXT DEFAULT '',
        gross_weight REAL NOT NULL,
        net_weight REAL NOT NULL,
        fine_weight REAL NOT NULL,
        purity_name TEXT DEFAULT '22K',
        tunch REAL NOT NULL DEFAULT 100,
        vendor_cost REAL NOT NULL DEFAULT 0,
        retail_price REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'IN_SHOWROOM', -- IN_SHOWROOM, SOLD, RETURNED
        sales_invoice_id TEXT,
        sold_at TEXT,
        returned_at TEXT,
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_citem_inward ON consignment_items(consignment_inward_id);
      CREATE INDEX IF NOT EXISTS idx_citem_supplier ON consignment_items(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_citem_stock_item ON consignment_items(stock_item_id);
      CREATE INDEX IF NOT EXISTS idx_citem_status ON consignment_items(status);

      -- 3. Consignment Return Header (Unsold items returned to supplier)
      CREATE TABLE IF NOT EXISTS consignment_returns (
        id TEXT PRIMARY KEY,
        return_number TEXT NOT NULL UNIQUE,
        consignment_inward_id TEXT NOT NULL REFERENCES consignment_inwards(id),
        supplier_id TEXT NOT NULL REFERENCES suppliers(id),
        return_date TEXT NOT NULL,
        total_pieces INTEGER NOT NULL DEFAULT 0,
        total_gross_weight REAL NOT NULL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cr_number ON consignment_returns(return_number);
      CREATE INDEX IF NOT EXISTS idx_cr_inward ON consignment_returns(consignment_inward_id);
      CREATE INDEX IF NOT EXISTS idx_cr_supplier ON consignment_returns(supplier_id);

      -- 4. Consignment Return Items (Line-level return traceability)
      CREATE TABLE IF NOT EXISTS consignment_return_items (
        id TEXT PRIMARY KEY,
        consignment_return_id TEXT NOT NULL REFERENCES consignment_returns(id),
        consignment_item_id TEXT NOT NULL REFERENCES consignment_items(id),
        stock_item_id TEXT NOT NULL REFERENCES jewellery_stock_items(id),
        gross_weight REAL NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cri_return ON consignment_return_items(consignment_return_id);
      CREATE INDEX IF NOT EXISTS idx_cri_citem ON consignment_return_items(consignment_item_id);

      -- 5. Consignment Vendor Settlements
      CREATE TABLE IF NOT EXISTS consignment_settlements (
        id TEXT PRIMARY KEY,
        settlement_number TEXT NOT NULL UNIQUE,
        supplier_id TEXT NOT NULL REFERENCES suppliers(id),
        consignment_inward_id TEXT NOT NULL REFERENCES consignment_inwards(id),
        settlement_date TEXT NOT NULL,
        settled_amount REAL NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'CASH', -- CASH, BANK, UPI, CARD, CHEQUE
        payment_reference TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_by TEXT DEFAULT 'Admin',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cset_number ON consignment_settlements(settlement_number);
      CREATE INDEX IF NOT EXISTS idx_cset_supplier ON consignment_settlements(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_cset_inward ON consignment_settlements(consignment_inward_id);
      CREATE INDEX IF NOT EXISTS idx_cset_date ON consignment_settlements(settlement_date);
    `)

    const itemColumns = database.prepare(`PRAGMA table_info(items)`).all() as { name: string }[]
    if (!itemColumns.some((col) => col.name === 'item_code')) {
      database.exec(`ALTER TABLE items ADD COLUMN item_code TEXT DEFAULT ''`)
    }
  }
}
