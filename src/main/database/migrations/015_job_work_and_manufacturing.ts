import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration015: Migration = {
  id: '015_job_work_and_manufacturing',
  name: 'Canonical Karigar, Manufacturing Order, Material Issue, Receipt and Metal Ledger Schema',
  up: (database: Database.Database) => {
    database.exec(`
      -- 1. Canonical Karigar / Artisan Master
      CREATE TABLE IF NOT EXISTS karigars (
        id TEXT PRIMARY KEY,
        karigar_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        mobile TEXT DEFAULT '',
        address TEXT DEFAULT '',
        specialization TEXT DEFAULT 'General',
        account_id TEXT REFERENCES accounts(id),
        fine_gold_balance REAL NOT NULL DEFAULT 0,
        fine_silver_balance REAL NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_karigars_code ON karigars(karigar_code);
      CREATE INDEX IF NOT EXISTS idx_karigars_account ON karigars(account_id);

      -- 2. Manufacturing / Production Orders
      CREATE TABLE IF NOT EXISTS manufacturing_orders (
        id TEXT PRIMARY KEY,
        order_number TEXT NOT NULL UNIQUE,
        design_id TEXT REFERENCES item_designs(id),
        item_id TEXT NOT NULL REFERENCES items(id),
        karigar_id TEXT NOT NULL REFERENCES karigars(id),
        planned_pcs INTEGER NOT NULL DEFAULT 1,
        planned_gross_weight REAL NOT NULL DEFAULT 0,
        planned_net_weight REAL NOT NULL DEFAULT 0,
        metal_type TEXT NOT NULL DEFAULT 'GOLD',
        purity_name TEXT DEFAULT '22K',
        target_fine_weight REAL NOT NULL DEFAULT 0,
        expected_delivery_date TEXT,
        status TEXT NOT NULL DEFAULT 'APPROVED',
        total_issued_gross REAL NOT NULL DEFAULT 0,
        total_issued_fine REAL NOT NULL DEFAULT 0,
        total_returned_fine REAL NOT NULL DEFAULT 0,
        total_finished_fine REAL NOT NULL DEFAULT 0,
        total_approved_loss REAL NOT NULL DEFAULT 0,
        unreconciled_fine REAL NOT NULL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_by TEXT DEFAULT 'Admin',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_mo_order_number ON manufacturing_orders(order_number);
      CREATE INDEX IF NOT EXISTS idx_mo_karigar ON manufacturing_orders(karigar_id);
      CREATE INDEX IF NOT EXISTS idx_mo_status ON manufacturing_orders(status);

      -- 3. Material Issue Transactions
      CREATE TABLE IF NOT EXISTS manufacturing_material_issues (
        id TEXT PRIMARY KEY,
        issue_number TEXT NOT NULL UNIQUE,
        order_id TEXT NOT NULL REFERENCES manufacturing_orders(id),
        karigar_id TEXT NOT NULL REFERENCES karigars(id),
        issue_type TEXT NOT NULL DEFAULT 'INITIAL', -- INITIAL, ADDITIONAL
        metal_type TEXT NOT NULL DEFAULT 'GOLD',
        purity_name TEXT DEFAULT '22K',
        tunch REAL NOT NULL DEFAULT 100,
        gross_weight REAL NOT NULL DEFAULT 0,
        net_weight REAL NOT NULL DEFAULT 0,
        fine_weight REAL NOT NULL DEFAULT 0,
        stone_weight REAL NOT NULL DEFAULT 0,
        stone_pcs INTEGER NOT NULL DEFAULT 0,
        diamond_carats REAL NOT NULL DEFAULT 0,
        diamond_pcs INTEGER NOT NULL DEFAULT 0,
        issue_date TEXT NOT NULL,
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_mmi_order ON manufacturing_material_issues(order_id);
      CREATE INDEX IF NOT EXISTS idx_mmi_karigar ON manufacturing_material_issues(karigar_id);

      -- 4. Material Return (Unused metal returned by Karigar)
      CREATE TABLE IF NOT EXISTS manufacturing_material_returns (
        id TEXT PRIMARY KEY,
        return_number TEXT NOT NULL UNIQUE,
        order_id TEXT NOT NULL REFERENCES manufacturing_orders(id),
        karigar_id TEXT NOT NULL REFERENCES karigars(id),
        metal_type TEXT NOT NULL DEFAULT 'GOLD',
        gross_weight REAL NOT NULL DEFAULT 0,
        net_weight REAL NOT NULL DEFAULT 0,
        fine_weight REAL NOT NULL DEFAULT 0,
        return_date TEXT NOT NULL,
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_mmr_order ON manufacturing_material_returns(order_id);
      CREATE INDEX IF NOT EXISTS idx_mmr_karigar ON manufacturing_material_returns(karigar_id);

      -- 5. Finished Goods Receipts
      CREATE TABLE IF NOT EXISTS manufacturing_receipts (
        id TEXT PRIMARY KEY,
        receipt_number TEXT NOT NULL UNIQUE,
        order_id TEXT NOT NULL REFERENCES manufacturing_orders(id),
        karigar_id TEXT NOT NULL REFERENCES karigars(id),
        item_id TEXT NOT NULL REFERENCES items(id),
        stock_item_id TEXT REFERENCES jewellery_stock_items(id),
        pcs INTEGER NOT NULL DEFAULT 1,
        gross_weight REAL NOT NULL DEFAULT 0,
        less_weight REAL NOT NULL DEFAULT 0,
        net_weight REAL NOT NULL DEFAULT 0,
        fine_weight REAL NOT NULL DEFAULT 0,
        purity_name TEXT DEFAULT '22K',
        tunch REAL NOT NULL DEFAULT 100,
        wastage_percent REAL NOT NULL DEFAULT 0,
        actual_wastage_weight REAL NOT NULL DEFAULT 0,
        process_loss_weight REAL NOT NULL DEFAULT 0,
        scrap_weight REAL NOT NULL DEFAULT 0,
        labour_rate REAL NOT NULL DEFAULT 0,
        labour_rate_type TEXT NOT NULL DEFAULT 'Gm',
        labour_amount REAL NOT NULL DEFAULT 0,
        qc_status TEXT NOT NULL DEFAULT 'APPROVED', -- APPROVED, REJECTED, REWORK
        receipt_date TEXT NOT NULL,
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_mr_order ON manufacturing_receipts(order_id);
      CREATE INDEX IF NOT EXISTS idx_mr_karigar ON manufacturing_receipts(karigar_id);

      -- 6. Karigar Metal / Fine Ledger (Independent from cash accounting)
      CREATE TABLE IF NOT EXISTS karigar_metal_ledger (
        id TEXT PRIMARY KEY,
        karigar_id TEXT NOT NULL REFERENCES karigars(id),
        entry_date TEXT NOT NULL,
        metal_type TEXT NOT NULL DEFAULT 'GOLD',
        document_type TEXT NOT NULL, -- ISSUE, RETURN, RECEIPT, LOSS_ADJUSTMENT, SETTLEMENT
        document_id TEXT NOT NULL,
        document_number TEXT NOT NULL,
        fine_issued REAL NOT NULL DEFAULT 0,
        fine_returned REAL NOT NULL DEFAULT 0,
        fine_received REAL NOT NULL DEFAULT 0,
        approved_loss REAL NOT NULL DEFAULT 0,
        running_fine_balance REAL NOT NULL DEFAULT 0,
        narration TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_kml_karigar ON karigar_metal_ledger(karigar_id);
      CREATE INDEX IF NOT EXISTS idx_kml_date ON karigar_metal_ledger(entry_date);

      -- 7. Karigar Settlements
      CREATE TABLE IF NOT EXISTS karigar_settlements (
        id TEXT PRIMARY KEY,
        settlement_number TEXT NOT NULL UNIQUE,
        karigar_id TEXT NOT NULL REFERENCES karigars(id),
        settlement_date TEXT NOT NULL,
        settlement_type TEXT NOT NULL, -- CASH, BANK, METAL, ADJUSTMENT
        amount_paid REAL NOT NULL DEFAULT 0,
        fine_metal_settled REAL NOT NULL DEFAULT 0,
        payment_reference TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ks_karigar ON karigar_settlements(karigar_id);
    `)
  }
}
