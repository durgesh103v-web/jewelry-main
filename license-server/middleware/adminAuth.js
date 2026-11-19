const rateLimit = require('express-rate-limit')
const crypto = require('crypto')
const { AdminUser } = require('../models/AdminUser')

function generateAdminToken(admin) {
  const payload = {
    adminId: admin._id ? admin._id.toString() : String(admin),
    username: admin.username || '',
    role: admin.role || 'SUPER_ADMIN',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days validity
  }
  const secret = process.env.SESSION_SECRET || 'jewel_sec_sess_99338877_production_grade_secret'
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${sig}`
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [data, sig] = token.split('.')
  const secret = process.env.SESSION_SECRET || 'jewel_sec_sess_99338877_production_grade_secret'
  const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url')
  if (sig !== expectedSig) return null
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    if (payload.exp && Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

/**
 * Strict Rate Limiter for Login Attempts:
 * Maximum 10 attempts per IP per 15 minutes.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
})

/**
 * Rate Limiter for Sensitive Administrative Operations:
 * Maximum 150 calls per 15 minutes.
 */
const adminActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Rate limit exceeded for administrative actions. Please slow down.'
  }
})

/**
 * CSRF Protection Middleware:
 * For state-mutating requests (POST, PUT, DELETE, PATCH), verifies that a custom
 * X-Requested-With or X-CSRF-Protection header is present. Browsers prevent cross-origin
 * websites from attaching custom headers without explicit CORS preflight permission.
 */
function verifyCsrfHeader(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  // Exempt public client endpoints like activation that are called directly from desktop Electron
  if (req.path.startsWith('/api/licenses/activate')) {
    return next()
  }

  // For administrative mutations, require anti-CSRF custom header
  const customHeader = req.headers['x-requested-with'] || req.headers['x-csrf-protection']
  if (!customHeader) {
    return res.status(403).json({
      success: false,
      message: 'CSRF validation failed: Missing required anti-CSRF request header.'
    })
  }
  next()
}

/**
 * Session-based Super Admin Authentication Middleware.
 * Enforces authenticated session stored in persistent session store.
 * Verifies that the administrator account is still ACTIVE in MongoDB.
 * Immediately invalidates sessions if the administrator account is suspended or locked.
 */
async function requireSuperAdmin(req, res, next) {
  let adminId = req.session?.adminId

  // Fallback to Bearer token in Authorization header (bypasses cross-site cookie restrictions)
  if (!adminId) {
    const authHeader = req.headers['authorization'] || req.headers['x-admin-token']
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : String(authHeader).trim()
      const verified = verifyAdminToken(token)
      if (verified && verified.adminId) {
        adminId = verified.adminId
      }
    }
  }

  if (!adminId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: No active Super Admin session.'
    })
  }

  try {
    const admin = await AdminUser.findById(adminId)
    if (!admin) {
      if (req.session) req.session.destroy(() => {})
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Administrator account no longer exists.'
      })
    }

    if (admin.status !== 'ACTIVE') {
      if (req.session) req.session.destroy(() => {})
      return res.status(403).json({
        success: false,
        message: 'Administrator account has been suspended or locked. Session terminated.'
      })
    }

    // Attach verified admin to request
    req.admin = admin
    next()
  } catch (err) {
    console.error('Admin authentication error:', err.message)
    return res.status(500).json({
      success: false,
      message: 'Internal authentication error.'
    })
  }
}

/**
 * Rate Limiter for Client License Activations:
 * Maximum 30 attempts per IP per 15 minutes.
 */
const activationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many license activation attempts from this IP. Please try again after 15 minutes.'
  }
})

/**
 * Rate Limiter for Desktop Owner Account Provisioning:
 * Maximum 20 attempts per IP per 15 minutes.
 */
const provisioningLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many owner provisioning attempts from this IP. Please try again after 15 minutes.'
  }
})

/**
 * Rate Limiter for Password & Recovery Key Verifications:
 * Maximum 30 attempts per IP per 15 minutes.
 */
const verifyCredentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many credential verification attempts. Please try again after 15 minutes.'
  }
})

/**
 * Rate Limiter for Telemetric Synchronization Checks:
 * Maximum 200 calls per 15 minutes per IP.
 */
const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many synchronization requests. Please try again later.'
  }
})

module.exports = {
  loginLimiter,
  adminActionLimiter,
  activationLimiter,
  provisioningLimiter,
  verifyCredentialsLimiter,
  syncLimiter,
  verifyCsrfHeader,
  requireSuperAdmin,
  generateAdminToken,
  verifyAdminToken
}
