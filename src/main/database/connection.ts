import { app } from 'electron'
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { runMigrations } from './migrationRunner'
import { allMigrations } from './migrations'

let db: Database.Database | null = null

export function getDatabasePath(): string {
  const baseDir = app?.getPath
    ? app.getPath('userData')
    : process.env.APPDATA
      ? join(process.env.APPDATA, 'jewellery-erp-desktop')
      : '.'
  const dataDir = join(baseDir, 'data')

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

export function setDatabase(customDb: Database.Database | null): void {
  db = customDb
}

export function getDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDatabasePath()
  db = new Database(dbPath)

  runMigrations(db, allMigrations)

  return db
}
