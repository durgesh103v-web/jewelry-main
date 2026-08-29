import Database from 'better-sqlite3'
import { getDatabase } from '../connection'

export abstract class BaseRepository {
  protected get db(): Database.Database {
    return getDatabase()
  }

  protected runInTransaction<R>(fn: () => R): R {
    const tx = this.db.transaction(fn)
    return tx()
  }
}
