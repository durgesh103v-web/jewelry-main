import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import dayjs from 'dayjs'
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

  const pending = migrations.filter((m) => !executed.has(m.id))

  // Production Safety: Automatic Pre-Migration Consistent Backup
  // If there are pending migrations on a persistent disk database, create an automatic verified backup
  if (pending.length > 0 && db.name && db.name !== ':memory:') {
    try {
      const dbFile = db.name
      const baseDir = path.dirname(dbFile)
      const backupDir = path.join(baseDir, 'backups')
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      const timestamp = dayjs().format('YYYY-MM-DD-HH-mm-ss')
      const backupPath = path.join(backupDir, `pre_migration_${timestamp}.db`)

      // Ensure WAL journal is checkpointed before taking snapshot
      db.pragma('wal_checkpoint(FULL)')

      // Consistent synchronous snapshot via VACUUM INTO
      const normalizedPath = backupPath.replace(/\\/g, '/')
      db.exec(`VACUUM INTO '${normalizedPath}'`)

      // Backup Integrity Verification: verify that the snapshot file opens and passes PRAGMA integrity_check
      const backupCheck = new Database(backupPath)
      const checkResult = backupCheck.pragma('integrity_check') as { integrity_check: string }[]
      backupCheck.close()

      if (!checkResult || checkResult[0]?.integrity_check !== 'ok') {
        console.warn('[BACKUP WARNING] Pre-migration backup integrity check did not return ok')
      } else {
        console.log(`[DATABASE BACKUP] Created verified pre-migration backup: ${backupPath}`)
      }

      // Retention policy: Keep the latest 10 pre-migration backups, prune older
      const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.startsWith('pre_migration_') && f.endsWith('.db'))
        .sort()
      if (files.length > 10) {
        for (let i = 0; i < files.length - 10; i++) {
          try {
            fs.unlinkSync(path.join(backupDir, files[i]))
          } catch {
            // Ignore deletion errors
          }
        }
      }
    } catch (backupErr: any) {
      console.warn('[BACKUP NOTICE] Automatic pre-migration backup skipped or failed:', backupErr.message)
    }
  }

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
