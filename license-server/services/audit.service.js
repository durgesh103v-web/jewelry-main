const { AuditLog } = require('../models/AuditLog')

/**
 * Dispatches an immutable audit entry for sensitive administrative operations.
 * Redacts any accidental sensitive keys before writing.
 */
async function logAudit({
  adminId = null,
  adminUsername = 'system',
  action,
  targetType,
  targetId = null,
  details = {},
  ipAddress = null,
  userAgent = null
}) {
  try {
    // Sanitize details to ensure no secrets are recorded
    const sanitizedDetails = { ...details }
    const forbiddenKeys = ['password', 'passwordHash', 'recoveryKey', 'productKey', 'cookie', 'secret', 'token']

    for (const key of Object.keys(sanitizedDetails)) {
      if (forbiddenKeys.some((f) => key.toLowerCase().includes(f))) {
        sanitizedDetails[key] = '[REDACTED]'
      }
    }

    const log = new AuditLog({
      adminId,
      adminUsername,
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      details: sanitizedDetails,
      ipAddress,
      userAgent
    })

    await log.save()
    return log
  } catch (err) {
    // Non-blocking: failure to audit should log to stderr but not crash caller
    console.error('Failed to write audit log:', err.message)
    return null
  }
}

module.exports = { logAudit }
