import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration016: Migration = {
  id: '016_repair_and_customer_service',
  name: 'Canonical Jewellery Repair, Alteration and Customer Service Management Schema',
  up: (database: Database.Database) => {
    database.exec(`
      -- 1. Canonical Repair Jobs
      CREATE TABLE IF NOT EXISTS repair_jobs (
        id TEXT PRIMARY KEY,
        repair_number TEXT NOT NULL UNIQUE,
        customer_id TEXT NOT NULL REFERENCES customers(id),
        ownership_type TEXT NOT NULL DEFAULT 'CUSTOMER_OWNED', -- CUSTOMER_OWNED, SHOP_OWNED
        stock_item_id TEXT REFERENCES jewellery_stock_items(id),
        customer_item_description TEXT DEFAULT '',
        metal_type TEXT NOT NULL DEFAULT 'GOLD',
        purity_name TEXT DEFAULT '22K',
        repair_type TEXT NOT NULL DEFAULT 'Resizing', -- Resizing, Polishing, Cleaning, Stone Replacement, Soldering, Rhodium, etc.
        status TEXT NOT NULL DEFAULT 'RECEIVED', -- RECEIVED, ESTIMATE_PENDING, APPROVED, ASSIGNED, IN_REPAIR, RECEIVED_FROM_KARIGAR, QC_APPROVED, QC_REJECTED, READY_FOR_DELIVERY, DELIVERED, CANCELLED
        priority TEXT NOT NULL DEFAULT 'NORMAL', -- NORMAL, URGENT, HIGH
        received_date TEXT NOT NULL,
        expected_delivery_date TEXT,
        assigned_karigar_id TEXT REFERENCES karigars(id),

        -- Before Measurements (Intake Snapshot - Immutable)
        before_gross_weight REAL NOT NULL DEFAULT 0,
        before_net_weight REAL NOT NULL DEFAULT 0,
        before_fine_weight REAL NOT NULL DEFAULT 0,
        before_stone_count INTEGER NOT NULL DEFAULT 0,
        before_diamond_count INTEGER NOT NULL DEFAULT 0,
        intake_condition TEXT DEFAULT '',

        -- After Measurements (Post-Repair Measurement)
        after_gross_weight REAL NOT NULL DEFAULT 0,
        after_net_weight REAL NOT NULL DEFAULT 0,
        after_fine_weight REAL NOT NULL DEFAULT 0,
        after_stone_count INTEGER NOT NULL DEFAULT 0,
        after_diamond_count INTEGER NOT NULL DEFAULT 0,
        weight_difference REAL NOT NULL DEFAULT 0,

        -- Estimate & Approval
        estimate_labour REAL NOT NULL DEFAULT 0,
        estimate_material REAL NOT NULL DEFAULT 0,
        estimate_stone REAL NOT NULL DEFAULT 0,
        estimate_other REAL NOT NULL DEFAULT 0,
        estimate_tax REAL NOT NULL DEFAULT 0,
        estimate_total REAL NOT NULL DEFAULT 0,
        is_estimate_approved INTEGER NOT NULL DEFAULT 1,
        approved_by TEXT DEFAULT '',
        approval_date TEXT,

        -- Shop Material Tracking & Karigar Labour
        material_issued_gross REAL NOT NULL DEFAULT 0,
        material_issued_fine REAL NOT NULL DEFAULT 0,
        material_returned_fine REAL NOT NULL DEFAULT 0,
        material_consumed_fine REAL NOT NULL DEFAULT 0,
        karigar_labour_amount REAL NOT NULL DEFAULT 0,

        -- Final Charges & Billing
        final_repair_charge REAL NOT NULL DEFAULT 0,
        advance_adjusted REAL NOT NULL DEFAULT 0,
        amount_paid REAL NOT NULL DEFAULT 0,
        balance_due REAL NOT NULL DEFAULT 0,
        payment_method TEXT DEFAULT 'CASH',
        payment_reference TEXT DEFAULT '',

        -- QC & Delivery
        qc_status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
        qc_notes TEXT DEFAULT '',
        delivered_at TEXT,
        delivered_by TEXT DEFAULT '',
        received_by TEXT DEFAULT '',

        notes TEXT DEFAULT '',
        created_by TEXT DEFAULT 'Admin',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_repair_number ON repair_jobs(repair_number);
      CREATE INDEX IF NOT EXISTS idx_repair_customer ON repair_jobs(customer_id);
      CREATE INDEX IF NOT EXISTS idx_repair_karigar ON repair_jobs(assigned_karigar_id);
      CREATE INDEX IF NOT EXISTS idx_repair_status ON repair_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_repair_ownership ON repair_jobs(ownership_type);
      CREATE INDEX IF NOT EXISTS idx_repair_stock_item ON repair_jobs(stock_item_id);

      -- 2. Repair Shop Material Issues
      CREATE TABLE IF NOT EXISTS repair_material_issues (
        id TEXT PRIMARY KEY,
        issue_number TEXT NOT NULL UNIQUE,
        repair_job_id TEXT NOT NULL REFERENCES repair_jobs(id),
        karigar_id TEXT NOT NULL REFERENCES karigars(id),
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

      CREATE INDEX IF NOT EXISTS idx_rmi_repair_job ON repair_material_issues(repair_job_id);

      -- 3. Repair Timeline / Custody Audit
      CREATE TABLE IF NOT EXISTS repair_timeline_events (
        id TEXT PRIMARY KEY,
        repair_job_id TEXT NOT NULL REFERENCES repair_jobs(id),
        event_type TEXT NOT NULL,
        description TEXT NOT NULL,
        performed_by TEXT DEFAULT 'Admin',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_rte_repair_job ON repair_timeline_events(repair_job_id);
    `)
  }
}
