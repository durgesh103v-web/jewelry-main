import Database from 'better-sqlite3'
import { Migration } from './types'

function addColumnIfMissing(
  database: Database.Database,
  tableName: string,
  columnName: string,
  columnDefinition: string
): void {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[]
  const exists = columns.some((column) => column.name === columnName)

  if (!exists) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`)
  }
}

export const migration013: Migration = {
  id: '013_gst_and_tax_engine',
  name: 'GST and Tax Compliance Engine Schema',
  up: (database: Database.Database) => {
    // 1. GST State Master
    database.exec(`
      CREATE TABLE IF NOT EXISTS gst_states (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tin_code TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS gst_hsn_master (
        id TEXT PRIMARY KEY,
        hsn_code TEXT NOT NULL,
        description TEXT NOT NULL,
        default_gst_rate REAL NOT NULL DEFAULT 3.0,
        type TEXT NOT NULL DEFAULT 'GOODS',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_gst_hsn_code
      ON gst_hsn_master(hsn_code);

      CREATE TABLE IF NOT EXISTS gst_tax_rates (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        igst_rate REAL NOT NULL,
        cgst_rate REAL NOT NULL,
        sgst_rate REAL NOT NULL,
        cess_rate REAL NOT NULL DEFAULT 0,
        is_default INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `)

    // 2. Add GST columns to sales_invoices
    addColumnIfMissing(database, 'sales_invoices', 'place_of_supply', "TEXT DEFAULT '24'")
    addColumnIfMissing(database, 'sales_invoices', 'tax_mode', "TEXT NOT NULL DEFAULT 'INTRA_STATE'")
    addColumnIfMissing(database, 'sales_invoices', 'cgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'sales_invoices', 'sgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'sales_invoices', 'igst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'sales_invoices', 'cess_amount', 'REAL NOT NULL DEFAULT 0')

    // 3. Add GST columns to sales_invoice_items
    addColumnIfMissing(database, 'sales_invoice_items', 'hsn_code', "TEXT DEFAULT '7113'")
    addColumnIfMissing(database, 'sales_invoice_items', 'cgst_rate', 'REAL NOT NULL DEFAULT 1.5')
    addColumnIfMissing(database, 'sales_invoice_items', 'sgst_rate', 'REAL NOT NULL DEFAULT 1.5')
    addColumnIfMissing(database, 'sales_invoice_items', 'igst_rate', 'REAL NOT NULL DEFAULT 3.0')
    addColumnIfMissing(database, 'sales_invoice_items', 'cgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'sales_invoice_items', 'sgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'sales_invoice_items', 'igst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'sales_invoice_items', 'cess_amount', 'REAL NOT NULL DEFAULT 0')

    // 4. Add GST columns to purchase_invoices
    addColumnIfMissing(database, 'purchase_invoices', 'place_of_supply', "TEXT DEFAULT '24'")
    addColumnIfMissing(database, 'purchase_invoices', 'tax_mode', "TEXT NOT NULL DEFAULT 'INTRA_STATE'")
    addColumnIfMissing(database, 'purchase_invoices', 'cgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'purchase_invoices', 'sgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'purchase_invoices', 'igst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'purchase_invoices', 'cess_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'purchase_invoices', 'is_itc_eligible', 'INTEGER NOT NULL DEFAULT 1')

    // 5. Add GST columns to purchase_invoice_items
    addColumnIfMissing(database, 'purchase_invoice_items', 'hsn_code', "TEXT DEFAULT '7113'")
    addColumnIfMissing(database, 'purchase_invoice_items', 'cgst_rate', 'REAL NOT NULL DEFAULT 1.5')
    addColumnIfMissing(database, 'purchase_invoice_items', 'sgst_rate', 'REAL NOT NULL DEFAULT 1.5')
    addColumnIfMissing(database, 'purchase_invoice_items', 'igst_rate', 'REAL NOT NULL DEFAULT 3.0')
    addColumnIfMissing(database, 'purchase_invoice_items', 'cgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'purchase_invoice_items', 'sgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'purchase_invoice_items', 'igst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'purchase_invoice_items', 'cess_amount', 'REAL NOT NULL DEFAULT 0')

    // 6. Add GST columns to return_transactions
    addColumnIfMissing(database, 'return_transactions', 'place_of_supply', "TEXT DEFAULT '24'")
    addColumnIfMissing(database, 'return_transactions', 'tax_mode', "TEXT NOT NULL DEFAULT 'INTRA_STATE'")
    addColumnIfMissing(database, 'return_transactions', 'cgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'return_transactions', 'sgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'return_transactions', 'igst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'return_transactions', 'cess_amount', 'REAL NOT NULL DEFAULT 0')

    // 7. Add GST columns to return_transaction_items
    addColumnIfMissing(database, 'return_transaction_items', 'hsn_code', "TEXT DEFAULT '7113'")
    addColumnIfMissing(database, 'return_transaction_items', 'cgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'return_transaction_items', 'sgst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'return_transaction_items', 'igst_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfMissing(database, 'return_transaction_items', 'cess_amount', 'REAL NOT NULL DEFAULT 0')

    // 8. Seed Indian States
    const stateCount = database.prepare(`SELECT COUNT(*) as count FROM gst_states`).get() as any
    if (stateCount.count === 0) {
      const states = [
        ['01', 'Jammu & Kashmir', '01'],
        ['02', 'Himachal Pradesh', '02'],
        ['03', 'Punjab', '03'],
        ['04', 'Chandigarh', '04'],
        ['05', 'Uttarakhand', '05'],
        ['06', 'Haryana', '06'],
        ['07', 'Delhi', '07'],
        ['08', 'Rajasthan', '08'],
        ['09', 'Uttar Pradesh', '09'],
        ['10', 'Bihar', '10'],
        ['11', 'Sikkim', '11'],
        ['12', 'Arunachal Pradesh', '12'],
        ['13', 'Nagaland', '13'],
        ['14', 'Manipur', '14'],
        ['15', 'Mizoram', '15'],
        ['16', 'Tripura', '16'],
        ['17', 'Meghalaya', '17'],
        ['18', 'Assam', '18'],
        ['19', 'West Bengal', '19'],
        ['20', 'Jharkhand', '20'],
        ['21', 'Odisha', '21'],
        ['22', 'Chhattisgarh', '22'],
        ['23', 'Madhya Pradesh', '23'],
        ['24', 'Gujarat', '24'],
        ['26', 'Dadra & Nagar Haveli and Daman & Diu', '26'],
        ['27', 'Maharashtra', '27'],
        ['29', 'Karnataka', '29'],
        ['30', 'Goa', '30'],
        ['31', 'Lakshadweep', '31'],
        ['32', 'Kerala', '32'],
        ['33', 'Tamil Nadu', '33'],
        ['34', 'Puducherry', '34'],
        ['35', 'Andaman & Nicobar Islands', '35'],
        ['36', 'Telangana', '36'],
        ['37', 'Andhra Pradesh', '37'],
        ['38', 'Ladakh', '38'],
        ['97', 'Other Territory', '97']
      ]
      const insertState = database.prepare(
        `INSERT OR IGNORE INTO gst_states (code, name, tin_code) VALUES (?, ?, ?)`
      )
      for (const s of states) {
        insertState.run(s[0], s[1], s[2])
      }
    }

    // 9. Seed Default Jewellery HSN Codes
    const hsnCount = database.prepare(`SELECT COUNT(*) as count FROM gst_hsn_master`).get() as any
    if (hsnCount.count === 0) {
      const now = new Date().toISOString()
      const hsns = [
        ['hsn-001', '7113', 'Articles of jewellery and parts thereof of precious metal', 3.0, 'GOODS'],
        ['hsn-002', '7108', 'Gold (including gold plated with platinum) unwrought or in semi-manufactured forms', 3.0, 'GOODS'],
        ['hsn-003', '7106', 'Silver (including silver plated with gold or platinum) unwrought or in semi-manufactured forms', 3.0, 'GOODS'],
        ['hsn-004', '7102', 'Diamonds, whether or not worked, but not mounted or set', 1.5, 'GOODS'],
        ['hsn-005', '7118', 'Coin of legal tender or precious metals', 3.0, 'GOODS'],
        ['hsn-006', '9988', 'Manufacturing services on physical inputs owned by others (Job work on jewellery)', 5.0, 'SERVICES'],
        ['hsn-007', '9987', 'Maintenance, repair and installation services (Jewellery repairs)', 18.0, 'SERVICES']
      ]
      const insertHsn = database.prepare(
        `INSERT OR IGNORE INTO gst_hsn_master (id, hsn_code, description, default_gst_rate, type, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
      )
      for (const h of hsns) {
        insertHsn.run(h[0], h[1], h[2], h[3], h[4], now, now)
      }
    }

    // 10. Seed Default Tax Rates
    const taxCount = database.prepare(`SELECT COUNT(*) as count FROM gst_tax_rates`).get() as any
    if (taxCount.count === 0) {
      const now = new Date().toISOString()
      const rates = [
        ['tax-001', 'GST_3', 'Jewellery Gold & Silver GST 3%', 3.0, 1.5, 1.5, 0, 1],
        ['tax-002', 'GST_1_5', 'Precious Stones & Loose Diamonds GST 1.5%', 1.5, 0.75, 0.75, 0, 0],
        ['tax-003', 'GST_5', 'Job Work GST 5%', 5.0, 2.5, 2.5, 0, 0],
        ['tax-004', 'GST_18', 'Repairs & General Services GST 18%', 18.0, 9.0, 9.0, 0, 0],
        ['tax-005', 'GST_0', 'Exempt / Zero Rated GST 0%', 0, 0, 0, 0, 0]
      ]
      const insertRate = database.prepare(
        `INSERT OR IGNORE INTO gst_tax_rates (id, code, name, igst_rate, cgst_rate, sgst_rate, cess_rate, is_default, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      for (const r of rates) {
        insertRate.run(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], now, now)
      }
    }
  }
}
