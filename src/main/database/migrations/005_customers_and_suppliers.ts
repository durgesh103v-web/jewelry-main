import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration005: Migration = {
  id: '005_customers_and_suppliers',
  name: 'Customer & Supplier Foundation',
  up: (database: Database.Database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        customer_code TEXT UNIQUE NOT NULL,
        account_id TEXT,
        name TEXT NOT NULL,
        display_name TEXT,
        mobile TEXT,
        alternate_mobile TEXT,
        email TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        date_of_birth TEXT,
        anniversary_date TEXT,
        gstin TEXT,
        pan TEXT,
        preferred_metal TEXT DEFAULT 'Gold',
        preferred_purity TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
      CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
      CREATE INDEX IF NOT EXISTS idx_customers_account ON customers(account_id);
      CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(active);

      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        supplier_code TEXT UNIQUE NOT NULL,
        account_id TEXT,
        name TEXT NOT NULL,
        display_name TEXT,
        supplier_type TEXT DEFAULT 'Supplier',
        mobile TEXT,
        alternate_mobile TEXT,
        email TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        gstin TEXT,
        pan TEXT,
        notes TEXT DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);
      CREATE INDEX IF NOT EXISTS idx_suppliers_mobile ON suppliers(mobile);
      CREATE INDEX IF NOT EXISTS idx_suppliers_account ON suppliers(account_id);
      CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active);
    `)

    // Backfill customers from existing accounts with customer type if empty
    const custCount = database.prepare(`SELECT COUNT(*) AS count FROM customers`).get() as { count: number }
    if (!custCount || custCount.count === 0) {
      const customerAccounts = database
        .prepare(
          `SELECT id, account_name, other_name, mobile_number, whatsapp_number, address, city, state, gst_no, pan_no, active, created_at, updated_at
           FROM accounts
           WHERE account_type IN ('Wholesale Customer', 'Retail Customer') OR account_type IS NULL`
        )
        .all() as {
          id: string
          account_name: string
          other_name: string | null
          mobile_number: string | null
          whatsapp_number: string | null
          address: string | null
          city: string | null
          state: string | null
          gst_no: string | null
          pan_no: string | null
          active: number
          created_at: string
          updated_at: string
        }[]

      const insertCust = database.prepare(
        `INSERT INTO customers (
          id, customer_code, account_id, name, display_name, mobile, alternate_mobile,
          address, city, state, gstin, pan, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )

      let codeIndex = 1
      for (const acc of customerAccounts) {
        const code = `CUST-${String(codeIndex).padStart(4, '0')}`
        insertCust.run(
          `cust-${acc.id}`,
          code,
          acc.id,
          acc.account_name,
          acc.other_name || acc.account_name,
          acc.mobile_number || '',
          acc.whatsapp_number || '',
          acc.address || '',
          acc.city || '',
          acc.state || '',
          acc.gst_no || '',
          acc.pan_no || '',
          acc.active ?? 1,
          acc.created_at,
          acc.updated_at
        )
        codeIndex++
      }
    }

    // Backfill suppliers from existing accounts with supplier type if empty
    const suppCount = database.prepare(`SELECT COUNT(*) AS count FROM suppliers`).get() as { count: number }
    if (!suppCount || suppCount.count === 0) {
      const supplierAccounts = database
        .prepare(
          `SELECT id, account_name, other_name, mobile_number, whatsapp_number, address, city, state, gst_no, pan_no, active, created_at, updated_at
           FROM accounts
           WHERE account_type = 'Supplier / Karagir / Dhadi'`
        )
        .all() as {
          id: string
          account_name: string
          other_name: string | null
          mobile_number: string | null
          whatsapp_number: string | null
          address: string | null
          city: string | null
          state: string | null
          gst_no: string | null
          pan_no: string | null
          active: number
          created_at: string
          updated_at: string
        }[]

      const insertSupp = database.prepare(
        `INSERT INTO suppliers (
          id, supplier_code, account_id, name, display_name, supplier_type, mobile, alternate_mobile,
          address, city, state, gstin, pan, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'Supplier', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )

      let suppCodeIndex = 1
      for (const acc of supplierAccounts) {
        const code = `SUPP-${String(suppCodeIndex).padStart(4, '0')}`
        insertSupp.run(
          `supp-${acc.id}`,
          code,
          acc.id,
          acc.account_name,
          acc.other_name || acc.account_name,
          acc.mobile_number || '',
          acc.whatsapp_number || '',
          acc.address || '',
          acc.city || '',
          acc.state || '',
          acc.gst_no || '',
          acc.pan_no || '',
          acc.active ?? 1,
          acc.created_at,
          acc.updated_at
        )
        suppCodeIndex++
      }
    }
  }
}
