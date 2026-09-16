import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { getDatabase } from '../database/connection'
import { hashPassword, verifyPassword } from './user.service'
import { firmService } from './firm.service'

export type BusinessType = 'WHOLESALE' | 'RETAIL'

const BUSINESS_TYPE_KEY = 'business_type'
const RECOVERY_CODE_KEY = 'master_recovery_code_hash'
const DEFAULT_RECOVERY_CODE = 'JEWEL-ADMIN-RESET'

const registerSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(60),
  password: z.string().min(4, 'Password must be at least 4 characters').max(255),
  firmName: z.string().trim().min(1, 'Shop / firm name is required').max(120),
  businessType: z.enum(['WHOLESALE', 'RETAIL'])
})

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(4, 'New password must be at least 4 characters').max(255)
})

const resetPasswordSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  recoveryCode: z.string().trim().min(1, 'Master recovery code is required'),
  newPassword: z.string().min(4, 'New password must be at least 4 characters').max(255)
})

type SingleUserRow = {
  id: string
  username: string
  password_hash: string
  role: string
}

export type AuthSession = {
  userId: string
  username: string
  role: string
  businessType: BusinessType
  recoveryCode?: string
}

let currentSession: AuthSession | null = null

function getRecoveryCodeHash(): string | null {
  const db = getDatabase()
  const row = db
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(RECOVERY_CODE_KEY) as { value: string } | undefined
  return row?.value ?? null
}

function setRecoveryCodeHash(hash: string): void {
  const db = getDatabase()
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  db.prepare(
    `
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `
  ).run(RECOVERY_CODE_KEY, hash, now)
}

function getBusinessType(): BusinessType | null {
  const db = getDatabase()

  const row = db
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(BUSINESS_TYPE_KEY) as { value: string } | undefined

  const value = row?.value

  return value === 'WHOLESALE' || value === 'RETAIL' ? value : null
}

function setBusinessType(type: BusinessType): void {
  const db = getDatabase()
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  db.prepare(
    `
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `
  ).run(BUSINESS_TYPE_KEY, type, now)
}

function getSingleUser(): SingleUserRow | undefined {
  const db = getDatabase()

  return db
    .prepare(
      `
      SELECT id, username, password_hash, role
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT 1
    `
    )
    .get() as SingleUserRow | undefined
}

let failedLoginAttempts = 0
let lockoutUntil = 0
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 5 * 60 * 1000 // 5 minutes

function checkLockout(): void {
  const now = Date.now()
  if (lockoutUntil > now) {
    const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000)
    throw new Error(`Too many failed login attempts. Account locked. Please try again in ${remainingSeconds} seconds.`)
  }
}

function recordFailedAttempt(): void {
  failedLoginAttempts += 1
  if (failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    lockoutUntil = Date.now() + LOCKOUT_DURATION_MS
    failedLoginAttempts = 0
    throw new Error('Too many failed login attempts. Account locked for 5 minutes.')
  }
}

function recordSuccessfulAttempt(): void {
  failedLoginAttempts = 0
  lockoutUntil = 0
}

export const authService = {
  getState() {
    const user = getSingleUser()

    return {
      registered: Boolean(user),
      username: user?.username ?? null,
      businessType: getBusinessType(),
      authenticated: Boolean(currentSession)
    }
  },

  register(payload: unknown): AuthSession {
    const data = registerSchema.parse(payload)
    const db = getDatabase()

    if (getSingleUser()) {
      throw new Error('An account already exists on this computer. Please log in instead.')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()
    const recoveryCodeRaw =
      randomBytes(8)
        .toString('hex')
        .toUpperCase()
        .match(/.{1,4}/g)
        ?.join('-') || 'JEWEL-RECOVERY-KEY'

    const transaction = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO users (
          id, username, password_hash, full_name, role, active, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(id, data.username, hashPassword(data.password), '', 'ADMIN', 1, now, now)

      setBusinessType(data.businessType)
      setRecoveryCodeHash(hashPassword(recoveryCodeRaw))

      const firm = firmService.get()
      firmService.save({ ...firm, firmName: data.firmName })
    })

    transaction()

    currentSession = {
      userId: id,
      username: data.username,
      role: 'ADMIN',
      businessType: data.businessType,
      recoveryCode: recoveryCodeRaw
    }

    return currentSession
  },

  login(payload: unknown): AuthSession {
    checkLockout()

    const data = loginSchema.parse(payload)

    const user = getSingleUser()

    if (!user || user.username.toLowerCase() !== data.username.toLowerCase()) {
      recordFailedAttempt()
      throw new Error('Invalid username or password')
    }

    if (!verifyPassword(data.password, user.password_hash)) {
      recordFailedAttempt()
      throw new Error('Invalid username or password')
    }

    recordSuccessfulAttempt()

    let businessType = getBusinessType()
    if (!businessType) {
      businessType = 'WHOLESALE'
      setBusinessType(businessType)
    }

    currentSession = {
      userId: user.id,
      username: user.username,
      role: user.role,
      businessType
    }

    return currentSession
  },

  logout() {
    currentSession = null
    return { success: true }
  },

  getSession(): AuthSession | null {
    return currentSession
  },

  changePassword(payload: unknown) {
    const data = changePasswordSchema.parse(payload)
    const db = getDatabase()

    const user = getSingleUser()

    if (!user) {
      throw new Error('No account found')
    }

    if (!verifyPassword(data.currentPassword, user.password_hash)) {
      throw new Error('Current password is incorrect')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE users
      SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `
    ).run(hashPassword(data.newPassword), now, user.id)

    return { success: true }
  },

  resetPassword(payload: unknown) {
    checkLockout()

    const data = resetPasswordSchema.parse(payload)
    const user = getSingleUser()

    if (!user || user.username.toLowerCase() !== data.username.toLowerCase()) {
      recordFailedAttempt()
      throw new Error('Invalid username or recovery code')
    }

    const storedRecoveryHash = getRecoveryCodeHash()
    let isValid = false
    const inputCode = data.recoveryCode.trim().toUpperCase()

    if (storedRecoveryHash) {
      isValid = verifyPassword(inputCode, storedRecoveryHash)
    } else {
      // Fallback for installations created prior to recovery code support
      isValid = inputCode === DEFAULT_RECOVERY_CODE
    }

    if (!isValid) {
      recordFailedAttempt()
      throw new Error('Invalid master recovery code. Please check and try again.')
    }

    recordSuccessfulAttempt()

    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE users
      SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `
    ).run(hashPassword(data.newPassword), now, user.id)

    return { success: true }
  }
}

