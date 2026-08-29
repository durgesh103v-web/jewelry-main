import Database from 'better-sqlite3'
import { Migration } from './migrations/types'

export function runMigrations(db: Database.Database, migrations: Migration[]): void {
  // PRAGMA setup
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA cache_size = -16000;
    PRAGMA temp_store = MEMORY;
  `)

  // Ensure migration tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      executed_at TEXT NOT NULL
    );
  `)

  const executed = new Set<string>(
    (db.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]).map((r) => r.id)
  )

  for (const migration of migrations) {
    if (!executed.has(migration.id)) {
      const run = db.transaction(() => {
        migration.up(db)
        db.prepare('INSERT INTO schema_migrations (id, name, executed_at) VALUES (?, ?, ?)').run(
          migration.id,
          migration.name,
          new Date().toISOString()
        )
      })
      run()
    }
  }
}
