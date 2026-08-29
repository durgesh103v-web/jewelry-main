import { app } from 'electron'
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { runMigrations } from './migrationRunner'
import { allMigrations } from './migrations'

let db: Database.Database | null = null

export function getDatabasePath(): string {
  const dataDir = join(app.getPath('userData'), 'data')

  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  return join(dataDir, 'jewellery-erp.db')
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function getDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDatabasePath()
  db = new Database(dbPath)

  runMigrations(db, allMigrations)

  return db
}
