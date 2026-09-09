import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration020: Migration = {
  id: '020_seed_standard_account_groups',
  name: 'Seed Standard Jewellery Account Groups',
  up: (database: Database.Database) => {
    const defaultGroups = [
      { id: 'grp-retail-cust', name: 'Retail Customers', type: 'Customer', desc: 'Walk-in & local retail customers' },
      { id: 'grp-wholesale-cust', name: 'Wholesale Customers', type: 'Customer', desc: 'B2B & wholesale trade clients' },
      { id: 'grp-bullion-supp', name: 'Bullion Suppliers', type: 'Supplier', desc: 'Gold & silver bullion / bar dealers' },
      { id: 'grp-karagirs', name: 'Karagirs / Artisans', type: 'Karagir', desc: 'Goldsmiths, stone setters & workshop karagirs' },
      { id: 'grp-cash-accounts', name: 'Cash Accounts', type: 'Cash', desc: 'Counter cash-in-hand and vault cash' },
      { id: 'grp-bank-accounts', name: 'Bank Accounts', type: 'Bank', desc: 'Business current & savings bank accounts' },
      { id: 'grp-shop-expenses', name: 'Shop Expenses', type: 'Expense', desc: 'Shop maintenance, staff salary & utility expenses' }
    ]

    const insertStmt = database.prepare(`
      INSERT OR IGNORE INTO account_groups (
        id, group_name, group_type, description, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `)

    for (const g of defaultGroups) {
      // Only insert if no group with this name already exists
      const existing = database
        .prepare(`SELECT id FROM account_groups WHERE LOWER(group_name) = LOWER(?) AND deleted_at IS NULL`)
        .get(g.name)

      if (!existing) {
        insertStmt.run(g.id, g.name, g.type, g.desc)
      }
    }
  }
}
