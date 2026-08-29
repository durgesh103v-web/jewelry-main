import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration007: Migration = {
  id: '007_quotations_and_orders',
  name: 'Quotations, Estimates & Customer Orders Foundation',
  up: (database: Database.Database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS quotations (
        id TEXT PRIMARY KEY,
        quotation_number TEXT UNIQUE NOT NULL,
        customer_id TEXT,
        account_id TEXT NOT NULL,
        quotation_date TEXT NOT NULL,
        valid_until TEXT,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        metal_type TEXT NOT NULL DEFAULT 'Gold',
        total_pcs INTEGER NOT NULL DEFAULT 0,
        total_gross_weight REAL NOT NULL DEFAULT 0,
        total_net_weight REAL NOT NULL DEFAULT 0,
        total_fine_weight REAL NOT NULL DEFAULT 0,
        total_majuri REAL NOT NULL DEFAULT 0,
        metal_rate_applied REAL NOT NULL DEFAULT 0,
        metal_value REAL NOT NULL DEFAULT 0,
        total_charges REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        taxable_amount REAL NOT NULL DEFAULT 0,
        tax_amount REAL NOT NULL DEFAULT 0,
        grand_total REAL NOT NULL DEFAULT 0,
        rounded_total REAL NOT NULL DEFAULT 0,
        pricing_snapshot TEXT,
        notes TEXT DEFAULT '',
        converted_order_id TEXT,
        converted_sale_id TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);
      CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
      CREATE INDEX IF NOT EXISTS idx_quotations_account ON quotations(account_id);
      CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
      CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(quotation_date);

      CREATE TABLE IF NOT EXISTS quotation_items (
        id TEXT PRIMARY KEY,
        quotation_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        description TEXT DEFAULT '',
        stamp_id TEXT,
        design_id TEXT,
        barcode TEXT,
        pcs INTEGER NOT NULL DEFAULT 1,
        gross_weight REAL NOT NULL DEFAULT 0,
        pack_weight REAL NOT NULL DEFAULT 0,
        less_weight REAL NOT NULL DEFAULT 0,
        add_weight REAL NOT NULL DEFAULT 0,
        net_weight REAL NOT NULL DEFAULT 0,
        fine_weight REAL NOT NULL DEFAULT 0,
        metal_type TEXT NOT NULL DEFAULT 'Gold',
        purity_name TEXT DEFAULT '',
        tunch REAL NOT NULL DEFAULT 100,
        wastage REAL NOT NULL DEFAULT 0,
        hishob REAL NOT NULL DEFAULT 100,
        gold_rate REAL NOT NULL DEFAULT 0,
        metal_value REAL NOT NULL DEFAULT 0,
        labour_rate REAL NOT NULL DEFAULT 0,
        labour_rate_type TEXT NOT NULL DEFAULT 'Kg',
        making_charges REAL NOT NULL DEFAULT 0,
        stone_charges REAL NOT NULL DEFAULT 0,
        diamond_charges REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        taxable_amount REAL NOT NULL DEFAULT 0,
        tax_percent REAL NOT NULL DEFAULT 0,
        tax_amount REAL NOT NULL DEFAULT 0,
        line_total REAL NOT NULL DEFAULT 0,
        pricing_breakdown TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);
      CREATE INDEX IF NOT EXISTS idx_quotation_items_item ON quotation_items(item_id);

      CREATE TABLE IF NOT EXISTS customer_orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        quotation_id TEXT,
        customer_id TEXT,
        account_id TEXT NOT NULL,
        order_date TEXT NOT NULL,
        expected_delivery_date TEXT,
        status TEXT NOT NULL DEFAULT 'CONFIRMED',
        metal_type TEXT NOT NULL DEFAULT 'Gold',
        total_pcs INTEGER NOT NULL DEFAULT 0,
        total_gross_weight REAL NOT NULL DEFAULT 0,
        total_net_weight REAL NOT NULL DEFAULT 0,
        total_fine_weight REAL NOT NULL DEFAULT 0,
        total_majuri REAL NOT NULL DEFAULT 0,
        metal_value REAL NOT NULL DEFAULT 0,
        total_charges REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        taxable_amount REAL NOT NULL DEFAULT 0,
        tax_amount REAL NOT NULL DEFAULT 0,
        grand_total REAL NOT NULL DEFAULT 0,
        rounded_total REAL NOT NULL DEFAULT 0,
        advance_amount REAL NOT NULL DEFAULT 0,
        pricing_snapshot TEXT,
        notes TEXT DEFAULT '',
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (quotation_id) REFERENCES quotations(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_customer_orders_number ON customer_orders(order_number);
      CREATE INDEX IF NOT EXISTS idx_customer_orders_quotation ON customer_orders(quotation_id);
      CREATE INDEX IF NOT EXISTS idx_customer_orders_customer ON customer_orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_customer_orders_account ON customer_orders(account_id);
      CREATE INDEX IF NOT EXISTS idx_customer_orders_status ON customer_orders(status);
      CREATE INDEX IF NOT EXISTS idx_customer_orders_date ON customer_orders(order_date);

      CREATE TABLE IF NOT EXISTS customer_order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        description TEXT DEFAULT '',
        stamp_id TEXT,
        design_id TEXT,
        barcode TEXT,
        pcs INTEGER NOT NULL DEFAULT 1,
        gross_weight REAL NOT NULL DEFAULT 0,
        pack_weight REAL NOT NULL DEFAULT 0,
        less_weight REAL NOT NULL DEFAULT 0,
        add_weight REAL NOT NULL DEFAULT 0,
        net_weight REAL NOT NULL DEFAULT 0,
        fine_weight REAL NOT NULL DEFAULT 0,
        metal_type TEXT NOT NULL DEFAULT 'Gold',
        purity_name TEXT DEFAULT '',
        tunch REAL NOT NULL DEFAULT 100,
        wastage REAL NOT NULL DEFAULT 0,
        hishob REAL NOT NULL DEFAULT 100,
        gold_rate REAL NOT NULL DEFAULT 0,
        metal_value REAL NOT NULL DEFAULT 0,
        labour_rate REAL NOT NULL DEFAULT 0,
        labour_rate_type TEXT NOT NULL DEFAULT 'Kg',
        making_charges REAL NOT NULL DEFAULT 0,
        stone_charges REAL NOT NULL DEFAULT 0,
        diamond_charges REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        taxable_amount REAL NOT NULL DEFAULT 0,
        tax_percent REAL NOT NULL DEFAULT 0,
        tax_amount REAL NOT NULL DEFAULT 0,
        line_total REAL NOT NULL DEFAULT 0,
        pricing_breakdown TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES customer_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      CREATE INDEX IF NOT EXISTS idx_customer_order_items_order ON customer_order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_customer_order_items_item ON customer_order_items(item_id);
    `)
  }
}
