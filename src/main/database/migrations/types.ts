import Database from 'better-sqlite3'

export interface Migration {
  id: string
  name: string
  up: (db: Database.Database) => void
}
