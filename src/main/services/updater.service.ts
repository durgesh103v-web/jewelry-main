import { app, BrowserWindow } from 'electron'
import { autoUpdater, UpdateInfo } from 'electron-updater'
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import path from 'path'
import dayjs from 'dayjs'
import Database from 'better-sqlite3'
import { closeDatabase, getDatabase } from '../database/connection'

export function isTrustedUpdateUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr)
    if (parsed.protocol !== 'https:' && !urlStr.startsWith('http://127.0.0.1') && !urlStr.startsWith('http://localhost')) {
      return false
    }
    const hostname = parsed.hostname.toLowerCase()
    return (
      hostname === 'releases.jewelleryerp.com' ||
      hostname.endsWith('.jewelleryerp.com') ||
      hostname.endsWith('.onrender.com') ||
      hostname === 'github.com' ||
      hostname.endsWith('.github.com') ||
      hostname.endsWith('.githubusercontent.com') ||
      hostname === '127.0.0.1' ||
      hostname === 'localhost'
    )
  } catch {
    return false
  }
}

export function createPreUpdateBackup(db: Database.Database): { success: boolean; backupPath?: string; error?: string } {
  if (!db || !db.name || db.name === ':memory:') {
    return { success: true }
  }

  try {
    // 1. Force FULL checkpoint of write-ahead log to disk
    db.pragma('wal_checkpoint(FULL)')

    const baseDir = path.dirname(db.name)
    const backupDir = path.join(baseDir, 'backups')
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true })
    }

    const timestamp = dayjs().format('YYYY-MM-DD-HH-mm-ss')
    const backupPath = path.join(backupDir, `pre_update_${timestamp}.db`)
    const normalizedPath = backupPath.replace(/\\/g, '/')

    // 2. Atomic consistent point-in-time snapshot via VACUUM INTO
    console.log(`[UpdaterService] Creating verified pre-update backup snapshot: ${backupPath}`)
    db.exec(`VACUUM INTO '${normalizedPath.replace(/'/g, "''")}'`)

    if (!existsSync(backupPath)) {
      throw new Error(`Backup file was not created on disk: ${backupPath}`)
    }

    // 3. PRAGMA integrity_check validation
    const checkDb = new Database(backupPath)
    const checkResult = checkDb.pragma('integrity_check') as { integrity_check: string }[]

    if (!checkResult || checkResult[0]?.integrity_check !== 'ok') {
      checkDb.close()
      try { unlinkSync(backupPath) } catch (_) {}
      throw new Error(`Pre-update backup failed integrity check. Expected 'ok', got: ${JSON.stringify(checkResult)}`)
    }

    // 4. Verify snapshot contains database tables
    const tables = checkDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[]
    checkDb.close()

    if (tables.length === 0) {
      try { unlinkSync(backupPath) } catch (_) {}
      throw new Error('Pre-update backup verification failed: Snapshot contains 0 database tables.')
    }

    console.log(`[UpdaterService] Pre-update backup verified successfully (${tables.length} tables confirmed): ${backupPath}`)

    // 5. Enforce rolling 10-backup retention policy (prune older pre_update_*.db)
    try {
      const files = readdirSync(backupDir)
        .filter((f) => f.startsWith('pre_update_') && f.endsWith('.db'))
        .sort()
      if (files.length > 10) {
        for (let i = 0; i < files.length - 10; i++) {
          try {
            unlinkSync(path.join(backupDir, files[i]))
          } catch (_) {}
        }
      }
    } catch (_) {}

    return { success: true, backupPath }
  } catch (err: any) {
    console.error('[UpdaterService] CRITICAL: Pre-update backup failed:', err.message)
    return { success: false, error: err.message }
  }
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface UpdateInfoPayload {
  version: string
  releaseDate?: string
  releaseNotes?: string
  totalBytes?: number
}

export interface DownloadProgressPayload {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export interface UpdaterState {
  currentVersion: string
  status: UpdateStatus
  updateInfo: UpdateInfoPayload | null
  progress: DownloadProgressPayload | null
  error: string | null
  lastCheckedAt: string | null
  dismissedVersion: string | null
}

class UpdaterService {
  private state: UpdaterState = {
    currentVersion: app?.getVersion ? app.getVersion() : '1.0.0',
    status: 'idle',
    updateInfo: null,
    progress: null,
    error: null,
    lastCheckedAt: null,
    dismissedVersion: null
  }

  private checkTimer: NodeJS.Timeout | null = null
  private startupTimer: NodeJS.Timeout | null = null
  private isCheckingOrDownloading = false

  constructor() {
    this.configureUpdater()
    this.setupEventListeners()
  }

  private configureUpdater(): void {
    // 1. Enforce explicit customer control (no auto download or silent install)
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false

    // 2. Production Release Feed Configuration
    if (process.env.UPDATE_FEED_URL) {
      const updateUrl = process.env.UPDATE_FEED_URL
      if (!isTrustedUpdateUrl(updateUrl)) {
        console.error(`[UpdaterService] Untrusted update feed URL rejected: ${updateUrl}`)
        throw new Error(`Untrusted update feed URL: ${updateUrl}. Must be an approved HTTPS release origin.`)
      }
      try {
        autoUpdater.setFeedURL({
          provider: 'generic',
          url: updateUrl,
          channel: 'latest'
        })
      } catch (err: any) {
        console.warn('[UpdaterService] Note on custom Feed URL configuration:', err.message)
      }
    } else {
      // Default to GitHub Releases for durgesh103v-web/jewelry-main
      try {
        autoUpdater.setFeedURL({
          provider: 'github',
          owner: 'durgesh103v-web',
          repo: 'jewelry-main'
        })
      } catch (err: any) {
        console.warn('[UpdaterService] Note on GitHub Feed URL configuration:', err.message)
      }
    }

    // 3. Logger setup
    autoUpdater.logger = {
      info: (msg: string) => console.log('[AutoUpdater Info]', msg),
      warn: (msg: string) => console.warn('[AutoUpdater Warn]', msg),
      error: (msg: string) => console.error('[AutoUpdater Error]', msg),
      debug: () => {}
    }
  }

  private setupEventListeners(): void {
    autoUpdater.on('checking-for-update', () => {
      this.state.status = 'checking'
      this.state.error = null
      this.broadcastState()
    })

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.isCheckingOrDownloading = false
      this.state.status = 'available'
      this.state.lastCheckedAt = new Date().toISOString()
      this.state.error = null

      let totalBytes: number | undefined
      if (Array.isArray(info.files) && info.files.length > 0 && info.files[0].size) {
        totalBytes = info.files[0].size
      }

      let notes = ''
      if (typeof info.releaseNotes === 'string') {
        notes = info.releaseNotes
      } else if (Array.isArray(info.releaseNotes)) {
        notes = info.releaseNotes.map((n) => (typeof n === 'string' ? n : n.note || '')).join('\n')
      }

      this.state.updateInfo = {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: notes,
        totalBytes
      }

      this.broadcastState()
      this.broadcast('updater:available', this.state.updateInfo)
    })

    autoUpdater.on('update-not-available', () => {
      this.isCheckingOrDownloading = false
      this.state.status = 'not-available'
      this.state.lastCheckedAt = new Date().toISOString()
      this.state.error = null
      this.broadcastState()
    })

    autoUpdater.on('download-progress', (progressObj) => {
      this.state.status = 'downloading'
      this.state.progress = {
        percent: Math.round(progressObj.percent * 10) / 10,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      }
      this.broadcastState()
      this.broadcast('updater:progress', this.state.progress)
    })

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.isCheckingOrDownloading = false
      this.state.status = 'downloaded'
      this.state.progress = null
      this.state.error = null
      this.broadcastState()
      this.broadcast('updater:downloaded', this.state.updateInfo || { version: info.version })
    })

    autoUpdater.on('error', (err: Error) => {
      this.isCheckingOrDownloading = false
      this.state.status = 'error'
      this.state.error = this.sanitizeErrorMessage(err)
      this.broadcastState()
      this.broadcast('updater:error', this.state.error)
    })
  }

  private sanitizeErrorMessage(err: Error): string {
    const msg = err.message || 'Unknown update service error.'
    if (
      msg.includes('net::ERR_NAME_NOT_RESOLVED') ||
      msg.includes('net::ERR_INTERNET_DISCONNECTED') ||
      msg.includes('ENOTFOUND')
    ) {
      return 'Unable to reach the release server. Please check your internet connection or DNS.'
    }
    if (msg.includes('net::ERR_CONNECTION_TIMED_OUT') || msg.includes('ETIMEDOUT')) {
      return 'Connection timed out while contacting update server.'
    }
    if (
      msg.includes('404') ||
      msg.includes('HttpError: 404') ||
      msg.includes('No published versions') ||
      msg.includes('cannot find channel')
    ) {
      return 'No updates currently available. You are running the latest version.'
    }
    return msg
  }

  private broadcast(channel: string, payload: any): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, payload)
      }
    }
  }

  private broadcastState(): void {
    this.broadcast('updater:status-changed', this.getState())
  }

  public getState(): UpdaterState {
    return {
      ...this.state,
      currentVersion: app?.getVersion ? app.getVersion() : '1.0.0'
    }
  }

  public getCurrentVersion(): string {
    return app?.getVersion ? app.getVersion() : '1.0.0'
  }

  public dismissCurrentUpdate(): void {
    if (this.state.updateInfo?.version) {
      this.state.dismissedVersion = this.state.updateInfo.version
      this.broadcastState()
    }
  }

  public async checkForUpdates(_manual = false): Promise<{ success: boolean; message?: string }> {
    if (this.isCheckingOrDownloading) {
      return { success: false, message: 'Update check or download is already in progress.' }
    }

    this.isCheckingOrDownloading = true
    this.state.status = 'checking'
    this.state.error = null
    this.broadcastState()

    try {
      // In development mode, autoUpdater will fail unless dev-app-update.yml exists.
      // If running unpackaged, check if file exists or catch gracefully.
      const isPackaged = app?.isPackaged ?? false
      if (!isPackaged && !existsSync(path.join(process.cwd(), 'dev-app-update.yml'))) {
        this.isCheckingOrDownloading = false
        this.state.status = 'not-available'
        this.state.lastCheckedAt = new Date().toISOString()
        this.broadcastState()
        return {
          success: true,
          message: 'Development environment detected: updater check completed (no update in dev mode).'
        }
      }

      await autoUpdater.checkForUpdates()
      return { success: true }
    } catch (err: any) {
      this.isCheckingOrDownloading = false
      const errorMsg = err?.message || ''
      if (
        errorMsg.includes('404') ||
        errorMsg.includes('HttpError: 404') ||
        errorMsg.includes('No published versions on GitHub')
      ) {
        this.state.status = 'not-available'
        this.state.error = null
        this.state.lastCheckedAt = new Date().toISOString()
        this.broadcastState()
        return { success: true, message: 'Your ERP is up to date.' }
      }

      this.state.status = 'error'
      this.state.error = this.sanitizeErrorMessage(err)
      this.broadcastState()
      return { success: false, message: this.state.error }
    }
  }

  public async downloadUpdate(): Promise<{ success: boolean; message?: string }> {
    if (this.state.status !== 'available' && this.state.status !== 'error') {
      return { success: false, message: 'No downloadable update is currently available.' }
    }

    this.isCheckingOrDownloading = true
    this.state.status = 'downloading'
    this.state.error = null
    this.state.progress = { percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 }
    this.broadcastState()

    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (err: any) {
      this.isCheckingOrDownloading = false
      this.state.status = 'error'
      this.state.error = this.sanitizeErrorMessage(err)
      this.broadcastState()
      return { success: false, message: this.state.error }
    }
  }

  /**
   * Safe Installation Flow:
   * 1. Ensure active database transactions are completed and WAL journal checkpointed.
   * 2. Take a verified pre-update SQLite backup snapshot via VACUUM INTO.
   * 3. Close SQLite database connection cleanly.
   * 4. Trigger quitAndInstall through electron-updater.
   */
  public async installUpdate(): Promise<{ success: boolean; message?: string }> {
    if (this.state.status !== 'downloaded') {
      return { success: false, message: 'Update has not been downloaded yet.' }
    }

    console.log('[UpdaterService] Initiating safe pre-installation procedures...')

    try {
      // 1. Create and verify pre-update snapshot. If fails, BLOCK INSTALLATION.
      const db = getDatabase()
      const backupResult = createPreUpdateBackup(db)
      if (!backupResult.success) {
        const blockMsg = `Installation blocked: Pre-update database backup failed (${backupResult.error}). Installation aborted to protect customer data.`
        console.error(`[UpdaterService] ${blockMsg}`)
        this.state.status = 'error'
        this.state.error = blockMsg
        this.broadcastState()
        return { success: false, message: blockMsg }
      }

      // 2. Close database connection cleanly
      console.log('[UpdaterService] Closing SQLite database connection before update restart...')
      closeDatabase()

      // 3. Trigger quitAndInstall (isSilent: false, isForceRunAfter: true)
      // Gives customer a visual installation dialog and restarts application automatically
      setImmediate(() => {
        autoUpdater.quitAndInstall(false, true)
      })

      return { success: true }
    } catch (err: any) {
      console.error('[UpdaterService] Error during safe update installation:', err)
      return { success: false, message: `Failed to safely apply update: ${err.message}` }
    }
  }

  /**
   * Schedule non-blocking periodic update checks (every 6 hours)
   * with a 10-second delay after initial startup.
   */
  public startPeriodicChecks(): void {
    // 10-second initial startup delay to let the app load without competition for bandwidth
    this.startupTimer = setTimeout(() => {
      this.checkForUpdates(false).catch(() => {})
    }, 10 * 1000)

    // Periodic check every 6 hours
    const SIX_HOURS = 6 * 60 * 60 * 1000
    this.checkTimer = setInterval(() => {
      this.checkForUpdates(false).catch(() => {})
    }, SIX_HOURS)
  }

  public stopPeriodicChecks(): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer)
      this.startupTimer = null
    }
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
      this.checkTimer = null
    }
  }
}

export const updaterService = new UpdaterService()
