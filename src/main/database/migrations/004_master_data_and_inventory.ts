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

export const migration004: Migration = {
  id: '004_master_data_and_inventory',
  name: 'Master Data & Inventory Foundation',
  up: (database: Database.Database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT DEFAULT '',
        parent_id TEXT,
        metal_type TEXT NOT NULL DEFAULT 'Gold',
        active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (parent_id) REFERENCES categories(id)
      );

      CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
      CREATE INDEX IF NOT EXISTS idx_categories_metal ON categories(metal_type);

      CREATE TABLE IF NOT EXISTS purity_masters (
        id TEXT PRIMARY KEY,
        metal_type TEXT NOT NULL,
        name TEXT NOT NULL,
        karat TEXT DEFAULT '',
        fineness REAL NOT NULL DEFAULT 0,
        percentage REAL NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        location_name TEXT NOT NULL UNIQUE,
        location_code TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `)

    addColumnIfMissing(database, 'items', 'category_id', 'TEXT REFERENCES categories(id)')
    addColumnIfMissing(database, 'items', 'location_id', 'TEXT REFERENCES locations(id)')
    addColumnIfMissing(database, 'items', 'item_status', "TEXT NOT NULL DEFAULT 'IN_STOCK'")
    addColumnIfMissing(database, 'items', 'sku', "TEXT DEFAULT ''")
    addColumnIfMissing(database, 'stock_ledger', 'location_id', 'TEXT')
    addColumnIfMissing(database, 'stock_ledger', 'movement_type', "TEXT NOT NULL DEFAULT 'OPENING_STOCK'")

    // Seed default locations if empty
    const locCount = database.prepare(`SELECT COUNT(*) AS count FROM locations`).get() as { count: number }
    if (!locCount || locCount.count === 0) {
      const now = new Date().toISOString()
      const insertLoc = database.prepare(
        `INSERT INTO locations (id, location_name, location_code, description, active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)`
      )
      insertLoc.run('loc-showroom', 'Showroom Floor', 'SHOWROOM', 'Main sales floor and display counters', now, now)
      insertLoc.run('loc-vault', 'Main Vault / Safe', 'VAULT', 'Secure primary inventory storage', now, now)
      insertLoc.run('loc-workshop', 'Karagir / Workshop', 'WORKSHOP', 'Internal manufacturing and repair workspace', now, now)
      insertLoc.run('loc-transit', 'In Transit', 'TRANSIT', 'Transfers and external approvals', now, now)
    }

    // Seed default purities if empty
    const purityCount = database.prepare(`SELECT COUNT(*) AS count FROM purity_masters`).get() as { count: number }
    if (!purityCount || purityCount.count === 0) {
      const now = new Date().toISOString()
      const insertPurity = database.prepare(
        `INSERT INTO purity_masters (id, metal_type, name, karat, fineness, percentage, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      insertPurity.run('pur-g24k', 'Gold', '24 Karat (999)', '24K', 999, 99.9, now, now)
      insertPurity.run('pur-g22k', 'Gold', '22 Karat (916)', '22K', 916, 91.6, now, now)
      insertPurity.run('pur-g20k', 'Gold', '20 Karat (833)', '20K', 833, 83.3, now, now)
      insertPurity.run('pur-g18k', 'Gold', '18 Karat (750)', '18K', 750, 75.0, now, now)
      insertPurity.run('pur-g14k', 'Gold', '14 Karat (585)', '14K', 585, 58.5, now, now)
      insertPurity.run('pur-s999', 'Silver', '999 Fine Silver', '999', 999, 99.9, now, now)
      insertPurity.run('pur-s925', 'Silver', '925 Sterling Silver', '925', 925, 92.5, now, now)
      insertPurity.run('pur-s800', 'Silver', '800 Standard Silver', '800', 800, 80.0, now, now)
      insertPurity.run('pur-pt950', 'Platinum', '950 Platinum', '950', 950, 95.0, now, now)
    }

    // Seed root category if empty
    const catCount = database.prepare(`SELECT COUNT(*) AS count FROM categories`).get() as { count: number }
    if (!catCount || catCount.count === 0) {
      const now = new Date().toISOString()
      const insertCat = database.prepare(
        `INSERT INTO categories (id, name, code, parent_id, metal_type, active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`
      )
      insertCat.run('cat-jewellery', 'Jewellery', 'JWL', null, 'Gold', 1, now, now)
      insertCat.run('cat-rings', 'Rings', 'RNG', 'cat-jewellery', 'Gold', 2, now, now)
      insertCat.run('cat-necklaces', 'Necklaces', 'NCK', 'cat-jewellery', 'Gold', 3, now, now)
      insertCat.run('cat-bracelets', 'Bracelets', 'BRC', 'cat-jewellery', 'Gold', 4, now, now)
      insertCat.run('cat-bangles', 'Bangles', 'BNG', 'cat-jewellery', 'Gold', 5, now, now)
      insertCat.run('cat-earrings', 'Earrings', 'EAR', 'cat-jewellery', 'Gold', 6, now, now)
      insertCat.run('cat-pendants', 'Pendants', 'PND', 'cat-jewellery', 'Gold', 7, now, now)
      insertCat.run('cat-chains', 'Chains', 'CHN', 'cat-jewellery', 'Gold', 8, now, now)
      insertCat.run('cat-mangalsutra', 'Mangalsutra', 'MNG', 'cat-jewellery', 'Gold', 9, now, now)
      insertCat.run('cat-custom', 'Custom Jewellery', 'CST', 'cat-jewellery', 'Gold', 10, now, now)
    }
  }
}
