import { migration001 } from './001_initial_schema'
import { migration002 } from './002_indexes'
import { migration003 } from './003_add_columns'
import { Migration } from './types'

export const allMigrations: Migration[] = [migration001, migration002, migration003]
