require('dotenv').config()
const express = require('express')
const helmet = require('helmet')
const mongoose = require('mongoose')
const cors = require('cors')
const session = require('express-session')
let MongoStore = require('connect-mongo')
if (MongoStore.default) MongoStore = MongoStore.default
const cookieParser = require('cookie-parser')
const { License } = require('./models/License')
const { Shop } = require('./models/Shop')
const { OwnerAccount } = require('./models/OwnerAccount')
const { signLicensePayload } = require('./crypto')
const { hashSecretKey, verifyPassword } = require('./services/credential.service')
const { logAudit } = require('./services/audit.service')
const {
  activationLimiter,
  provisioningLimiter,
  verifyCredentialsLimiter,
  syncLimiter
} = require('./middleware/adminAuth')
const adminRoutes = require('./routes/admin.routes')

const app = express()

// Trust proxy for production reverse proxies (Nginx, Cloudflare, Render, AWS ALB)
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1)
}

// ----------------------------------------------------------------------------
// 0. HELMET SECURITY HEADERS
// ----------------------------------------------------------------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
  })
)

// ----------------------------------------------------------------------------
// 1. CORS CONFIGURATION
// ----------------------------------------------------------------------------
const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://admin.jewelleryerp.com'
]
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : defaultOrigins

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. mobile apps, curl, Electron desktop client)
      if (!origin) return callback(null, true)
      if (CORS_ORIGINS.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error(`CORS blocked request from unauthorized origin: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Protection']
  })
)

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// ----------------------------------------------------------------------------
// 2. PERSISTENT PRODUCTION-READY SESSION STORE
// ----------------------------------------------------------------------------
const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jewellery_erp_licensing'
const SESSION_SECRET = process.env.SESSION_SECRET || 'jewel_sec_sess_99338877_production_grade_secret'

// Connect-Mongo Persistent Store
const mongoSessionStore = MongoStore.create({
  mongoUrl: MONGODB_URI,
  collectionName: 'admin_sessions',
  ttl: 8 * 60 * 60, // 8 hours
  autoRemove: 'native',
  crypto: {
    secret: SESSION_SECRET
  }
})

mongoSessionStore.on('error', (err) => {
  console.error('MongoSessionStore Error:', err.message)
})

app.use(
  session({
    store: mongoSessionStore,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'jewel_admin_sid',
    rolling: true, // Refresh session on every request
    cookie: {
      httpOnly: true, // Prevents XSS theft
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' needed for separate cross-domain hosting with secure: true
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    }
  })
)

// Private Ed25519 signing key (PEM) - Server-side only
const PRIVATE_KEY = process.env.ED25519_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIOlBcKxNlSkKKoDHRx6/Fou1Cj2vSh4mZ8VUhT5mO8tk
-----END PRIVATE KEY-----`

// Mount Protected Super Admin API
app.use('/api/admin', adminRoutes)

// Root Welcome / Discovery Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Jewellery ERP Licensing & Security API',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      admin: '/api/admin',
      licenses: '/api/licenses'
    }
  })
})

// Production Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

// ----------------------------------------------------------------------------
// 3. DESKTOP CLIENT ACTIVATION ENDPOINT (ATOMIC & CONCURRENCY-SAFE)
// ----------------------------------------------------------------------------
app.post('/api/licenses/activate', activationLimiter, async (req, res) => {
  try {
    const { productKey, machineId, product, appVersion } = req.body
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'

    if (!productKey || !machineId) {
      return res.status(400).json({
        success: false,
        message: 'Product Key and Machine ID are required for activation.'
      })
    }

    const key = productKey.trim().toUpperCase()
    const keyHash = hashSecretKey(key)

    // Lookup license by productKeyHash (primary) OR legacy productKey (compatibility)
    let licenseDoc = await License.findOne({
      $or: [{ productKeyHash: keyHash }, { productKey: key }]
    }).populate('shopId')

    if (!licenseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Product key not found. Please verify your product key or contact support.'
      })
    }

    // Auto-backfill productKeyHash if legacy record
    if (!licenseDoc.productKeyHash) {
      licenseDoc.productKeyHash = keyHash
      await licenseDoc.save()
    }

    // Check linked Shop status
    if (licenseDoc.shopId) {
      if (licenseDoc.shopId.status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          message: 'The associated shop showroom has been suspended. Activation cannot proceed.'
        })
      }
      if (licenseDoc.shopId.status === 'ARCHIVED') {
        return res.status(403).json({
          success: false,
          message: 'The associated shop has been archived.'
        })
      }
    }

    // Check License Status
    if (licenseDoc.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'This license has been suspended. Please contact customer support.'
      })
    }

    if (licenseDoc.status === 'REVOKED') {
      return res.status(403).json({
        success: false,
        message: 'This license has been permanently revoked.'
      })
    }

    // Check Expiration
    if (licenseDoc.expiresAt && new Date(licenseDoc.expiresAt) < new Date()) {
      licenseDoc.status = 'EXPIRED'
      await licenseDoc.save()
      return res.status(403).json({
        success: false,
        message: `License expired on ${licenseDoc.expiresAt.toISOString().split('T')[0]}.`
      })
    }

    // Machine Binding Validation
    if (!licenseDoc.boundMachineId) {
      // ATOMIC FIRST ACTIVATION:
      // Uses atomic findOneAndUpdate with condition `boundMachineId: null` to prevent race conditions
      const now = new Date()
      const atomicBound = await License.findOneAndUpdate(
        {
          _id: licenseDoc._id,
          boundMachineId: null
        },
        {
          $set: {
            boundMachineId: machineId,
            status: 'ACTIVE',
            activatedAt: now
          },
          $push: {
            activations: {
              machineId,
              activatedAt: now,
              ipAddress: String(clientIp),
              appVersion: appVersion || '1.0.0'
            }
          }
        },
        { new: true }
      )

      if (!atomicBound) {
        // Lost race condition: another concurrent request claimed this license
        return res.status(403).json({
          success: false,
          message: 'Concurrent activation detected. This product key has already been claimed.'
        })
      }

      licenseDoc = atomicBound

      await logAudit({
        action: 'LICENSE_INITIAL_ACTIVATION',
        targetType: 'LICENSE',
        targetId: licenseDoc._id.toString(),
        details: { machineId, clientIp, appVersion },
        ipAddress: clientIp,
        userAgent: req.headers['user-agent']
      })
    } else if (licenseDoc.boundMachineId !== machineId) {
      // Machine mismatch
      return res.status(403).json({
        success: false,
        message:
          'License is already activated on a different computer. If you have replaced your hardware, contact support to reset your license.'
      })
    } else {
      // Re-activation on the same authorized machine (e.g. app reinstall)
      licenseDoc.activations.push({
        machineId,
        activatedAt: new Date(),
        ipAddress: String(clientIp),
        appVersion: appVersion || '1.0.0'
      })
      await licenseDoc.save()
    }

    // Construct the canonical signed license payload
    const payload = {
      licenseId: `LIC-${licenseDoc._id.toString().toUpperCase()}`,
      product: 'JEWELLERY_ERP',
      edition: licenseDoc.edition,
      status: 'ACTIVE',
      machineId: licenseDoc.boundMachineId,
      customerName: licenseDoc.customerName || (licenseDoc.shopId?.ownerName) || 'Authorized Customer',
      firmName: licenseDoc.firmName || (licenseDoc.shopId?.shopName) || 'Jewellery Showroom',
      activatedAt: (licenseDoc.activatedAt || new Date()).toISOString(),
      expiresAt: licenseDoc.expiresAt ? licenseDoc.expiresAt.toISOString() : null,
      features: licenseDoc.getAllFeatures(),
      version: 1
    }

    // Sign payload with server-side Ed25519 Private Key
    const signature = signLicensePayload(payload, PRIVATE_KEY)

    return res.json({
      success: true,
      message: 'License activated successfully.',
      signedLicense: {
        payload,
        signature
      }
    })
  } catch (err) {
    console.error('Activation error:', err)
    return res.status(500).json({
      success: false,
      message: 'Internal license server error during activation.'
    })
  }
})

// ----------------------------------------------------------------------------
// 3.1. DESKTOP CLIENT OWNER ONBOARDING PROVISIONING ENDPOINT
// ----------------------------------------------------------------------------
app.post('/api/licenses/provision-owner', provisioningLimiter, async (req, res) => {
  try {
    const { shopId, username, temporaryPassword, recoveryKey, machineId } = req.body
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'

    if (!shopId || !username || !temporaryPassword || !recoveryKey || !machineId) {
      return res.status(400).json({
        success: false,
        message: 'All fields (shopId, username, temporaryPassword, recoveryKey, machineId) are required.'
      })
    }

    const cleanShopId = String(shopId).trim().toUpperCase()
    const cleanUsername = String(username).trim().toLowerCase()

    // 1. Validate Shop
    const shop = await Shop.findOne({ shopId: cleanShopId })
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: `Showroom with identifier ${cleanShopId} not found.`
      })
    }

    if (shop.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'This showroom has been suspended. Provisioning cannot proceed.'
      })
    }

    if (shop.status === 'ARCHIVED') {
      return res.status(403).json({
        success: false,
        message: 'This showroom has been archived.'
      })
    }

    // 2. Validate Linked License & Machine Binding
    const license = await License.findById(shop.licenseId)
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'No commercial license found for this showroom.'
      })
    }

    if (license.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'The showroom license is suspended.'
      })
    }

    if (license.status === 'REVOKED') {
      return res.status(403).json({
        success: false,
        message: 'The showroom license has been revoked.'
      })
    }

    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      return res.status(403).json({
        success: false,
        message: 'The showroom license has expired.'
      })
    }

    if (license.boundMachineId !== machineId) {
      return res.status(403).json({
        success: false,
        message: 'Hardware mismatch: This computer does not match the workstation bound to this showroom license.'
      })
    }

    // 3. Validate Owner Account
    const owner = await OwnerAccount.findOne({ shopId: shop._id })
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Owner account configuration missing for this showroom.'
      })
    }

    if (owner.username.toLowerCase() !== cleanUsername) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator username for this showroom.'
      })
    }

    // 4. Duplicate / Concurrent Provisioning Check
    if (owner.isProvisioned) {
      // Idempotent retry on the same bound machine is permitted
      if (owner.provisionedMachineId && owner.provisionedMachineId !== machineId) {
        return res.status(409).json({
          success: false,
          message: 'This showroom owner account has already been provisioned on another workstation terminal.'
        })
      }
    }

    // 5. Verify Temporary Password (Argon2id)
    const isPasswordValid = await verifyPassword(owner.passwordHash, temporaryPassword)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid temporary password. Please verify the credentials on your onboarding document.'
      })
    }

    // 6. Verify Master Recovery Key (SHA-256)
    const inputRecHash = hashSecretKey(String(recoveryKey).trim().toUpperCase())
    if (inputRecHash !== owner.recoveryKeyHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Master Recovery Key. Please check the 16-character code on your onboarding document.'
      })
    }

    // 7. Atomic Provisioning State Update
    owner.isProvisioned = true
    owner.provisionedAt = owner.provisionedAt || new Date()
    owner.provisionedMachineId = machineId
    owner.lastSyncAcknowledgedAt = new Date()
    await owner.save()

    // 8. Audit Log
    await logAudit({
      action: 'OWNER_ACCOUNT_PROVISIONED',
      targetType: 'OWNER_ACCOUNT',
      targetId: owner.username,
      details: {
        shopId: shop.shopId,
        machineId,
        clientIp
      },
      ipAddress: clientIp,
      userAgent: req.headers['user-agent']
    })

    return res.json({
      success: true,
      message: 'Owner account successfully verified and provisioned.',
      shop: {
        shopId: shop.shopId,
        shopName: shop.shopName,
        businessType: shop.businessType,
        edition: shop.edition
      },
      isTemporaryPassword: Boolean(owner.isTemporaryPassword),
      credentialVersion: owner.credentialVersion || 1
    })
  } catch (err) {
    console.error('Owner provisioning error:', err)
    return res.status(500).json({
      success: false,
      message: 'Internal server error during owner account provisioning.'
    })
  }
})

// ----------------------------------------------------------------------------
// 3.2. CREDENTIAL SYNCHRONIZATION TELEMETRY & ACKNOWLEDGEMENT
// ----------------------------------------------------------------------------
app.post('/api/licenses/check-sync', syncLimiter, async (req, res) => {
  try {
    const { shopId, username, machineId, localCredentialVersion = 1 } = req.body

    if (!shopId || !username || !machineId) {
      return res.status(400).json({ success: false, message: 'Missing parameters.' })
    }

    const shop = await Shop.findOne({ shopId: String(shopId).trim().toUpperCase() })
    if (!shop || shop.status !== 'ACTIVE') {
      return res.json({ success: true, syncPending: false, status: shop?.status || 'NOT_FOUND' })
    }

    const license = await License.findById(shop.licenseId)
    if (!license || license.boundMachineId !== machineId || license.status !== 'ACTIVE') {
      return res.json({ success: true, syncPending: false })
    }

    const owner = await OwnerAccount.findOne({ shopId: shop._id })
    if (!owner) {
      return res.json({ success: true, syncPending: false })
    }

    const serverVersion = owner.credentialVersion || 1
    const syncPending = serverVersion > Number(localCredentialVersion)

    return res.json({
      success: true,
      syncPending,
      serverCredentialVersion: serverVersion,
      lastAcknowledgedVersion: owner.lastAcknowledgedVersion || 0,
      isTemporaryPassword: Boolean(owner.isTemporaryPassword),
      passwordVersion: owner.passwordVersion || 1,
      recoveryKeyVersion: owner.recoveryKeyVersion || 1,
      message: syncPending
        ? 'Central credentials have been updated by Super Admin. Verification required.'
        : 'Credentials synchronized.'
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * POST /api/licenses/verify-password
 * Verifies newly supplied password against central Argon2id hash without exposing hashes or passwords.
 */
app.post('/api/licenses/verify-password', verifyCredentialsLimiter, async (req, res) => {
  try {
    const { shopId, username, password, machineId } = req.body

    if (!shopId || !username || !password || !machineId) {
      return res.status(400).json({ success: false, message: 'All fields (shopId, username, password, machineId) are required.' })
    }

    const cleanShopId = String(shopId).trim().toUpperCase()
    const cleanUsername = String(username).trim().toLowerCase()

    const shop = await Shop.findOne({ shopId: cleanShopId })
    if (!shop || shop.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Shop is not active.' })
    }

    const license = await License.findById(shop.licenseId)
    if (!license || license.status !== 'ACTIVE' || license.boundMachineId !== machineId) {
      return res.status(403).json({ success: false, message: 'License hardware binding mismatch or license inactive.' })
    }

    const owner = await OwnerAccount.findOne({ shopId: shop._id })
    if (!owner || owner.username.toLowerCase() !== cleanUsername) {
      return res.status(401).json({ success: false, message: 'Invalid username for this showroom.' })
    }

    const isValid = await verifyPassword(owner.passwordHash, password)
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid password.' })
    }

    return res.json({
      success: true,
      serverCredentialVersion: owner.credentialVersion || 1,
      isTemporaryPassword: Boolean(owner.isTemporaryPassword),
      passwordVersion: owner.passwordVersion || 1,
      message: 'Password verified with central licensing authority.'
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * POST /api/licenses/verify-recovery-key
 * Verifies newly supplied recovery key against central SHA-256 hash without exposing hashes or keys.
 */
app.post('/api/licenses/verify-recovery-key', verifyCredentialsLimiter, async (req, res) => {
  try {
    const { shopId, username, recoveryKey, machineId } = req.body

    if (!shopId || !username || !recoveryKey || !machineId) {
      return res.status(400).json({ success: false, message: 'All fields (shopId, username, recoveryKey, machineId) are required.' })
    }

    const cleanShopId = String(shopId).trim().toUpperCase()
    const cleanUsername = String(username).trim().toLowerCase()

    const shop = await Shop.findOne({ shopId: cleanShopId })
    if (!shop || shop.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Shop is not active.' })
    }

    const license = await License.findById(shop.licenseId)
    if (!license || license.status !== 'ACTIVE' || license.boundMachineId !== machineId) {
      return res.status(403).json({ success: false, message: 'License hardware binding mismatch or license inactive.' })
    }

    const owner = await OwnerAccount.findOne({ shopId: shop._id })
    if (!owner || owner.username.toLowerCase() !== cleanUsername) {
      return res.status(401).json({ success: false, message: 'Invalid username for this showroom.' })
    }

    const inputHash = hashSecretKey(String(recoveryKey).trim().toUpperCase())
    if (inputHash !== owner.recoveryKeyHash) {
      return res.status(401).json({ success: false, message: 'Invalid master recovery key.' })
    }

    return res.json({
      success: true,
      serverCredentialVersion: owner.credentialVersion || 1,
      recoveryKeyVersion: owner.recoveryKeyVersion || 1,
      message: 'Master recovery key verified with central licensing authority.'
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

app.post('/api/licenses/ack-sync', syncLimiter, async (req, res) => {
  try {
    const { shopId, username, machineId, acknowledgedVersion } = req.body

    if (!shopId || !machineId || acknowledgedVersion === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required acknowledgment fields.' })
    }

    const shop = await Shop.findOne({ shopId: String(shopId).trim().toUpperCase() })
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' })

    const license = await License.findById(shop.licenseId)
    if (!license || license.boundMachineId !== machineId) {
      return res.status(403).json({ success: false, message: 'Machine not authorized for this shop.' })
    }

    const owner = await OwnerAccount.findOne({ shopId: shop._id })
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found.' })

    const ackVer = parseInt(acknowledgedVersion, 10)
    if (isNaN(ackVer) || ackVer < 1) {
      return res.status(400).json({ success: false, message: 'Invalid acknowledgedVersion format.' })
    }

    // Rule 1: Cannot acknowledge a future version
    const serverVer = owner.credentialVersion || 1
    if (ackVer > serverVer) {
      return res.status(400).json({
        success: false,
        message: `Cannot acknowledge future version ${ackVer}. Server is on version ${serverVer}.`
      })
    }

    // Rule 2: Cannot overwrite a newer version with a stale acknowledgment
    const currentAck = owner.lastAcknowledgedVersion || 0
    if (ackVer < currentAck) {
      return res.status(400).json({
        success: false,
        message: `Cannot acknowledge stale version ${ackVer}. Current acknowledged version is ${currentAck}.`
      })
    }

    // Update state (idempotent if ackVer === currentAck)
    owner.lastAcknowledgedVersion = ackVer
    owner.lastSyncAcknowledgedAt = new Date()
    await owner.save()

    return res.json({
      success: true,
      message: 'Credential version synchronization acknowledged.',
      acknowledgedVersion: ackVer,
      serverCredentialVersion: serverVer,
      inSync: ackVer === serverVer
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// ----------------------------------------------------------------------------
// 4. PRODUCTION ERROR HANDLING & 404 HANDLER
// ----------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Resource not found.' })
})

app.use((err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production'
  console.error('[SERVER ERROR]', err.message)
  if (!isProd && err.stack) {
    console.error(err.stack)
  }

  const statusCode = err.status || err.statusCode || 500
  // In production, mask internal 500 errors to avoid exposing internal paths/stack traces
  const safeMessage =
    isProd && statusCode === 500
      ? 'An unexpected internal server error occurred.'
      : err.message || 'An unexpected error occurred.'

  res.status(statusCode).json({
    success: false,
    message: safeMessage
  })
})

// ----------------------------------------------------------------------------
// 5. PRODUCTION ENVIRONMENT VALIDATION
// ----------------------------------------------------------------------------
function validateProductionEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    const missing = []
    if (!process.env.MONGODB_URI) missing.push('MONGODB_URI')
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.includes('default') || process.env.SESSION_SECRET.length < 32) {
      missing.push('SESSION_SECRET (must be >= 32 characters)')
    }
    if (!process.env.ED25519_PRIVATE_KEY) missing.push('ED25519_PRIVATE_KEY')
    if (!process.env.CORS_ORIGINS) missing.push('CORS_ORIGINS')

    if (missing.length > 0) {
      const errorMsg = `CRITICAL: Production startup failed. Insecure/missing environment variables: ${missing.join(', ')}`
      console.error(errorMsg)
      throw new Error(errorMsg)
    }
  }
}

// ----------------------------------------------------------------------------
// 6. SERVER INITIALIZATION & CONNECTION POOLING
// ----------------------------------------------------------------------------
async function startServer() {
  try {
    validateProductionEnvironment()

    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 25,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    })
    console.log('✅ Connected to MongoDB with production connection pooling')

    app.listen(PORT, () => {
      console.log(`🚀 Jewellery ERP License & Management Server running on port ${PORT}`)
      console.log(`🔐 Super Admin API endpoint: http://localhost:${PORT}/api/admin`)
    })
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB / initialize server:', err.message)
    process.exit(1)
  }
}

if (require.main === module) {
  startServer()
}

module.exports = { app, startServer, validateProductionEnvironment }
