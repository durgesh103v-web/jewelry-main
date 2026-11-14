import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { getDatabase } from '../database/connection'
import { hashPassword, verifyPassword } from './user.service'
import { firmService } from './firm.service'
import { machineIdentityService } from './licensing/machine-identity.service'
import { licenseServerClient } from './licensing/license-server.client'

export type BusinessType = 'WHOLESALE' | 'RETAIL'

const BUSINESS_TYPE_KEY = 'business_type'
const RECOVERY_CODE_KEY = 'master_recovery_code_hash'
const CENTRAL_SHOP_ID_KEY = 'central_shop_id'

const provisionSchema = z.object({
  shopId: z.string().trim().min(1, 'Showroom Node ID is required'),
  username: z.string().trim().min(1, 'Username is required').max(60),
  temporaryPassword: z.string().min(1, 'Temporary password is required'),
  recoveryKey: z.string().trim().min(1, 'Master recovery key is required')
})

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
  is_temporary_password?: number
  central_shop_id?: string
  credential_version?: number
}

export type AuthSession = {
  userId: string
  username: string
  role: string
  businessType: BusinessType
  recoveryCode?: string
  isTemporaryPassword?: boolean
  centralShopId?: string
  credentialVersion?: number
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

function getCentralShopId(): string | null {
  const db = getDatabase()
  const row = db
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(CENTRAL_SHOP_ID_KEY) as { value: string } | undefined
  return row?.value ?? null
}

function setCentralShopId(shopId: string): void {
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
  ).run(CENTRAL_SHOP_ID_KEY, shopId, now)
}

function getSingleUser(): SingleUserRow | undefined {
  const db = getDatabase()
  try {
    return db
      .prepare(
        `
        SELECT id, username, password_hash, role, is_temporary_password, central_shop_id, credential_version
        FROM users
        WHERE deleted_at IS NULL
        ORDER BY created_at ASC
        LIMIT 1
      `
      )
      .get() as SingleUserRow | undefined
  } catch {
    // Backward compatibility for databases before migration 031 columns
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
    const centralShop = getCentralShopId() || user?.central_shop_id || null

    return {
      registered: Boolean(user),
      username: user?.username ?? null,
      businessType: getBusinessType(),
      authenticated: Boolean(currentSession),
      isTemporaryPassword: Boolean(user?.is_temporary_password),
      centralShopId: centralShop,
      credentialVersion: user?.credential_version || 1
    }
  },

  /**
   * Centrally authorized owner provisioning workflow.
   * Validates Shop ID, username, temporary password, and recovery key against the licensing backend.
   * On success, creates the initial SQLite admin account and stores scrypt-hashed credentials locally.
   */
  async provisionOwner(payload: unknown): Promise<AuthSession> {
    const data = provisionSchema.parse(payload)
    const db = getDatabase()
    const existing = getSingleUser()

    if (existing) {
      if (existing.central_shop_id && existing.central_shop_id !== data.shopId) {
        throw new Error(`This computer is already bound to showroom ${existing.central_shop_id}.`)
      }
    }

    const machineId = machineIdentityService.getMachineId()

    // 1. Central Backend Verification
    const centralResult = await licenseServerClient.provisionOwner({
      shopId: data.shopId,
      username: data.username,
      temporaryPassword: data.temporaryPassword,
      recoveryKey: data.recoveryKey,
      machineId
    })

    if (!centralResult.success) {
      throw new Error(centralResult.message || 'Showroom owner credentials could not be verified by central licensing authority.')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = existing?.id || uuidv4()
    const shopBusiness = centralResult.shop?.businessType || 'RETAIL'
    const shopName = centralResult.shop?.shopName || 'Jewellery Showroom'
    const credVer = centralResult.credentialVersion || 1

    // 2. Atomic SQLite Owner Provisioning
    const transaction = db.transaction(() => {
      if (existing) {
        db.prepare(
          `
          UPDATE users
          SET username = ?,
              password_hash = ?,
              full_name = ?,
              is_temporary_password = 1,
              central_shop_id = ?,
              credential_version = ?,
              updated_at = ?
          WHERE id = ?
        `
        ).run(data.username, hashPassword(data.temporaryPassword), shopName, data.shopId, credVer, now, existing.id)
      } else {
        db.prepare(
          `
          INSERT INTO users (
            id, username, password_hash, full_name, role, active,
            is_temporary_password, central_shop_id, credential_version,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          id,
          data.username,
          hashPassword(data.temporaryPassword),
          shopName,
          'ADMIN',
          1,
          1,
          data.shopId,
          credVer,
          now,
          now
        )
      }

      setBusinessType(shopBusiness)
      setCentralShopId(data.shopId)
      // Store local scrypt hash of the master recovery key
      setRecoveryCodeHash(hashPassword(data.recoveryKey.trim().toUpperCase()))

      const firm = firmService.get()
      firmService.save({ ...firm, firmName: shopName })
    })

    transaction()

    currentSession = {
      userId: id,
      username: data.username,
      role: 'ADMIN',
      businessType: shopBusiness,
      isTemporaryPassword: true,
      centralShopId: data.shopId,
      credentialVersion: credVer
    }

    return currentSession
  },

  /**
   * Internal / development registration with production safety guard.
   */
  register(payload: unknown): AuthSession {
    if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_DEV_SELF_REGISTER) {
      throw new Error(
        'Self-registration is disabled in production. Please onboard using your official showroom credentials.'
      )
    }

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

  async login(payload: unknown): Promise<AuthSession> {
    checkLockout()

    const data = loginSchema.parse(payload)
    const user = getSingleUser()

    if (!user || user.username.toLowerCase() !== data.username.toLowerCase()) {
      recordFailedAttempt()
      throw new Error('Invalid username or password')
    }

    const centralShopId = user.central_shop_id || getCentralShopId()
    const machineId = machineIdentityService.getMachineId()

    // 1. Primary check: Verify against local scrypt password hash
    let isValid = verifyPassword(data.password, user.password_hash)

    // 2. Online Central Credential Synchronization Strategy
    if (centralShopId) {
      if (isValid) {
        // Local hash matched. If online, check whether central server has pending credential updates.
        try {
          const syncStatus = await licenseServerClient.checkSync({
            shopId: centralShopId,
            username: user.username,
            machineId,
            localCredentialVersion: user.credential_version || 1
          })

          if (syncStatus.success && syncStatus.syncPending) {
            // Central server has a newer credential version!
            // Test if the password entered matches the newly issued central credentials.
            const verifyRes = await licenseServerClient.verifyPassword({
              shopId: centralShopId,
              username: user.username,
              password: data.password,
              machineId
            })

            if (verifyRes.success) {
              // The entered password matches the central version!
              // Atomically update local version and temporary status
              const db = getDatabase()
              const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
              const newVer = verifyRes.serverCredentialVersion || (user.credential_version || 1) + 1
              const isTemp = verifyRes.isTemporaryPassword ? 1 : 0

              db.prepare(
                `
                UPDATE users
                SET is_temporary_password = ?, credential_version = ?, updated_at = ?
                WHERE id = ?
              `
              ).run(isTemp, newVer, now, user.id)

              user.is_temporary_password = isTemp
              user.credential_version = newVer

              // Acknowledge exact version to central server
              await licenseServerClient.ackSync({
                shopId: centralShopId,
                username: user.username,
                machineId,
                acknowledgedVersion: newVer
              })
            } else {
              // The password entered matches old local credentials, but Super Admin reset the password remotely!
              // Block stale login when online with a clear instruction to use new credentials.
              throw new Error('Central administrator has updated showroom credentials. Please sign in with the new credentials issued by your administrator.')
            }
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.message.includes('Central administrator has updated')) {
            throw err
          }
          // Network offline / unreachable: preserve documented offline durability without disruption
        }
      } else {
        // Local verification failed. Check if user is entering newly issued central credentials (e.g. after Super Admin password reset)
        try {
          const verifyRes = await licenseServerClient.verifyPassword({
            shopId: centralShopId,
            username: user.username,
            password: data.password,
            machineId
          })

          if (verifyRes.success) {
            // Central server validated the newly entered password!
            // Update local SQLite using scrypt hashing with fresh salt
            const db = getDatabase()
            const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
            const newVer = verifyRes.serverCredentialVersion || (user.credential_version || 1) + 1
            const isTemp = verifyRes.isTemporaryPassword ? 1 : 0
            const newHash = hashPassword(data.password)

            db.prepare(
              `
              UPDATE users
              SET password_hash = ?, is_temporary_password = ?, credential_version = ?, updated_at = ?
              WHERE id = ?
            `
            ).run(newHash, isTemp, newVer, now, user.id)

            user.password_hash = newHash
            user.is_temporary_password = isTemp
            user.credential_version = newVer
            isValid = true

            // Acknowledge exact version to central server
            await licenseServerClient.ackSync({
              shopId: centralShopId,
              username: user.username,
              machineId,
              acknowledgedVersion: newVer
            })
          }
        } catch {
          // Offline or network error: fall back to local verification result
        }
      }
    }

    if (!isValid) {
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
      businessType,
      isTemporaryPassword: Boolean(user.is_temporary_password),
      centralShopId: user.central_shop_id,
      credentialVersion: user.credential_version || 1
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
      SET password_hash = ?, is_temporary_password = 0, updated_at = ?
      WHERE id = ?
    `
    ).run(hashPassword(data.newPassword), now, user.id)

    if (currentSession) {
      currentSession.isTemporaryPassword = false
    }

    return { success: true }
  },

  async resetPassword(payload: unknown) {
    checkLockout()

    const data = resetPasswordSchema.parse(payload)
    const user = getSingleUser()

    if (!user || user.username.toLowerCase() !== data.username.toLowerCase()) {
      recordFailedAttempt()
      throw new Error('Invalid username or recovery code')
    }

    const centralShopId = user.central_shop_id || getCentralShopId()
    const inputCode = data.recoveryCode.trim().toUpperCase()
    const storedRecoveryHash = getRecoveryCodeHash()
    const machineId = machineIdentityService.getMachineId()

    let isRecoveryValid = storedRecoveryHash ? verifyPassword(inputCode, storedRecoveryHash) : false

    // Central recovery-key synchronization strategy
    if (centralShopId) {
      if (!isRecoveryValid) {
        // Not valid locally: Check if Super Admin rotated the master recovery key centrally
        try {
          const recRes = await licenseServerClient.verifyRecoveryKey({
            shopId: centralShopId,
            username: user.username,
            recoveryKey: inputCode,
            machineId
          })

          if (recRes.success) {
            // Central server verified the newly rotated recovery key!
            // Securely update local scrypt recovery verifier without exposing key in logs
            const newVer = recRes.serverCredentialVersion || (user.credential_version || 1) + 1
            setRecoveryCodeHash(hashPassword(inputCode))

            const db = getDatabase()
            const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
            db.prepare(
              `
              UPDATE users
              SET credential_version = ?, updated_at = ?
              WHERE id = ?
            `
            ).run(newVer, now, user.id)

            user.credential_version = newVer
            isRecoveryValid = true

            // Acknowledge exact synchronized version
            await licenseServerClient.ackSync({
              shopId: centralShopId,
              username: user.username,
              machineId,
              acknowledgedVersion: newVer
            })
          }
        } catch {
          // Offline / network failure: keep local evaluation
        }
      } else {
        // Valid locally: If online, check if central key was rotated to ensure exact version sync
        try {
          const recRes = await licenseServerClient.verifyRecoveryKey({
            shopId: centralShopId,
            username: user.username,
            recoveryKey: inputCode,
            machineId
          })

          if (recRes.success && recRes.serverCredentialVersion) {
            const newVer = recRes.serverCredentialVersion
            if (newVer > (user.credential_version || 1)) {
              const db = getDatabase()
              const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
              db.prepare(
                `
                UPDATE users
                SET credential_version = ?, updated_at = ?
                WHERE id = ?
              `
              ).run(newVer, now, user.id)
              user.credential_version = newVer

              await licenseServerClient.ackSync({
                shopId: centralShopId,
                username: user.username,
                machineId,
                acknowledgedVersion: newVer
              })
            }
          }
        } catch {
          // Offline: ignore network failure, proceed with valid local recovery
        }
      }
    }

    if (!isRecoveryValid) {
      recordFailedAttempt()
      throw new Error('Invalid master recovery code. Please check and try again.')
    }

    recordSuccessfulAttempt()

    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    db.prepare(
      `
      UPDATE users
      SET password_hash = ?, is_temporary_password = 0, updated_at = ?
      WHERE id = ?
    `
    ).run(hashPassword(data.newPassword), now, user.id)

    return { success: true }
  },

  async checkSync() {
    const user = getSingleUser()
    const centralShop = getCentralShopId() || user?.central_shop_id
    if (!centralShop || !user) {
      return { success: true, syncPending: false }
    }

    const machineId = machineIdentityService.getMachineId()
    return await licenseServerClient.checkSync({
      shopId: centralShop,
      username: user.username,
      machineId,
      localCredentialVersion: user.credential_version || 1
    })
  }
}
