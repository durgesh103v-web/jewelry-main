import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration008: Migration = {
  id: '008_customer_advances',
  name: 'Customer Advance, Order Booking & Payment Allocation',
  up: (database: Database.Database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS customer_advances (
        id TEXT PRIMARY KEY,
        advance_number TEXT UNIQUE NOT NULL,
        customer_id TEXT,
        account_id TEXT NOT NULL,
        order_id TEXT,
        amount REAL NOT NULL,
        allocated_amount REAL NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'CASH',
        payment_reference TEXT DEFAULT '',
        advance_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'RECEIVED',
        notes TEXT DEFAULT '',
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (account_id) REFERENCES accounts(id),
        FOREIGN KEY (order_id) REFERENCES customer_orders(id)
      );

      CREATE INDEX IF NOT EXISTS idx_customer_advances_number ON customer_advances(advance_number);
      CREATE INDEX IF NOT EXISTS idx_customer_advances_customer ON customer_advances(customer_id);
      CREATE INDEX IF NOT EXISTS idx_customer_advances_account ON customer_advances(account_id);
      CREATE INDEX IF NOT EXISTS idx_customer_advances_order ON customer_advances(order_id);
      CREATE INDEX IF NOT EXISTS idx_customer_advances_status ON customer_advances(status);
      CREATE INDEX IF NOT EXISTS idx_customer_advances_date ON customer_advances(advance_date);

      CREATE TABLE IF NOT EXISTS advance_allocations (
        id TEXT PRIMARY KEY,
        advance_id TEXT NOT NULL,
        order_id TEXT NOT NULL,
        allocated_amount REAL NOT NULL,
        allocation_date TEXT NOT NULL,
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (advance_id) REFERENCES customer_advances(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES customer_orders(id)
      );

      CREATE INDEX IF NOT EXISTS idx_advance_allocations_advance ON advance_allocations(advance_id);
      CREATE INDEX IF NOT EXISTS idx_advance_allocations_order ON advance_allocations(order_id);
    `)
  }
}
