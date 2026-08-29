import Database from 'better-sqlite3'
import { Migration } from './types'

export const migration006: Migration = {
  id: '006_gold_rates_and_pricing',
  name: 'Jewellery Pricing & Gold Rate Calculation Engine',
  up: (database: Database.Database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS gold_rates (
        id TEXT PRIMARY KEY,
        metal_type TEXT NOT NULL DEFAULT 'Gold',
        purity_id TEXT,
        purity_name TEXT NOT NULL,
        purity_karat TEXT DEFAULT '',
        fineness REAL NOT NULL DEFAULT 999,
        rate_per_gram REAL NOT NULL,
        effective_date TEXT NOT NULL,
        effective_time TEXT DEFAULT '00:00:00',
        notes TEXT DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (purity_id) REFERENCES purity_masters(id)
      );

      CREATE INDEX IF NOT EXISTS idx_gold_rates_metal ON gold_rates(metal_type);
      CREATE INDEX IF NOT EXISTS idx_gold_rates_effective ON gold_rates(effective_date, effective_time);
      CREATE INDEX IF NOT EXISTS idx_gold_rates_purity ON gold_rates(purity_name);
      CREATE INDEX IF NOT EXISTS idx_gold_rates_active ON gold_rates(active);
    `)

    // Seed default baseline gold/silver rates if empty
    const rateCount = database.prepare(`SELECT COUNT(*) AS count FROM gold_rates`).get() as { count: number }
    if (!rateCount || rateCount.count === 0) {
      const now = new Date().toISOString()
      const today = now.slice(0, 10)
      const insertRate = database.prepare(
        `INSERT INTO gold_rates (
          id, metal_type, purity_id, purity_name, purity_karat, fineness,
          rate_per_gram, effective_date, effective_time, notes, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '09:00:00', ?, 1, ?, ?)`
      )

      insertRate.run('rate-g24k-today', 'Gold', 'pur-g24k', '24 Karat (999)', '24K', 999, 7450.0, today, 'Standard 24K Opening Rate', now, now)
      insertRate.run('rate-g22k-today', 'Gold', 'pur-g22k', '22 Karat (916)', '22K', 916, 6830.0, today, 'Standard 22K 916 Opening Rate', now, now)
      insertRate.run('rate-g18k-today', 'Gold', 'pur-g18k', '18 Karat (750)', '18K', 750, 5585.0, today, 'Standard 18K Opening Rate', now, now)
      insertRate.run('rate-s999-today', 'Silver', 'pur-s999', '999 Fine Silver', '999', 999, 88.5, today, 'Standard 999 Silver Opening Rate', now, now)
      insertRate.run('rate-s925-today', 'Silver', 'pur-s925', '925 Sterling Silver', '925', 925, 82.0, today, 'Standard 925 Silver Opening Rate', now, now)
    }
  }
}
