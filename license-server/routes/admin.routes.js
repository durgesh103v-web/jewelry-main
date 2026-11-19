const express = require('express')
const router = express.Router()
const { AdminUser } = require('../models/AdminUser')
const { Shop } = require('../models/Shop')
const { OwnerAccount } = require('../models/OwnerAccount')
const { License } = require('../models/License')
const { AuditLog } = require('../models/AuditLog')
const {
  verifyPassword,
  generateProductKey,
  generateRecoveryKey,
  generateTemporaryPassword,
  generateShopId,
  generateSuggestedUsername,
  hashPassword,
  hashSecretKey
} = require('../services/credential.service')
const { logAudit } = require('../services/audit.service')
const { generateOnboardingPdf } = require('../services/pdf.service')
const { loginLimiter, adminActionLimiter, verifyCsrfHeader, requireSuperAdmin, generateAdminToken } = require('../middleware/adminAuth')

// Enforce CSRF protection on all state-mutating Admin routes
router.use(verifyCsrfHeader)

// Helper for client IP
function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'
}

// ----------------------------------------------------------------------------
// 1. ADMIN AUTHENTICATION
// ----------------------------------------------------------------------------

/**
 * POST /api/admin/auth/login
 * Body: { identifier (username or email), password }
 */
router.post('/auth/login', loginLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body
    const ip = getClientIp(req)
    const userAgent = req.headers['user-agent']

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Identifier (username/email) and password are required.'
      })
    }

    const trimmed = String(identifier).trim().toLowerCase()
    const admin = await AdminUser.findOne({
      $or: [{ username: trimmed }, { email: trimmed }]
    })

    if (!admin) {
      await logAudit({
        action: 'ADMIN_LOGIN_FAILED',
        targetType: 'ADMIN_USER',
        targetId: trimmed,
        details: { reason: 'User not found' },
        ipAddress: ip,
        userAgent
      })
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials.'
      })
    }

    // Check account lockout
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const waitMin = Math.ceil((admin.lockedUntil - new Date()) / 60000)
      return res.status(403).json({
        success: false,
        message: `Account temporarily locked due to failed attempts. Try again in ${waitMin} minutes.`
      })
    }

    const isValid = await verifyPassword(admin.passwordHash, password)
    if (!isValid) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1
      if (admin.failedLoginAttempts >= 5) {
        admin.lockedUntil = new Date(Date.now() + 15 * 60 * 1000) // 15 min lock
        admin.failedLoginAttempts = 0
      }
      await admin.save()

      await logAudit({
        adminId: admin._id,
        adminUsername: admin.username,
        action: 'ADMIN_LOGIN_FAILED',
        targetType: 'ADMIN_USER',
        targetId: admin._id,
        details: { reason: 'Incorrect password', failedAttempts: admin.failedLoginAttempts },
        ipAddress: ip,
        userAgent
      })

      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials.'
      })
    }

    // Successful login: reset failed counter
    admin.failedLoginAttempts = 0
    admin.lockedUntil = null
    admin.lastLoginAt = new Date()
    admin.lastLoginIp = ip
    await admin.save()

    // Establish secure session
    req.session.adminId = admin._id.toString()
    req.session.adminUsername = admin.username
    req.session.role = admin.role

    const token = generateAdminToken(admin)

    await logAudit({
      adminId: admin._id,
      adminUsername: admin.username,
      action: 'ADMIN_LOGIN_SUCCESS',
      targetType: 'ADMIN_USER',
      targetId: admin._id,
      details: { role: admin.role },
      ipAddress: ip,
      userAgent
    })

    return res.json({
      success: true,
      message: 'Super Admin authenticated successfully.',
      token,
      admin: admin.toJSON()
    })
  } catch (err) {
    console.error('Admin login error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error during authentication.' })
  }
})

/**
 * POST /api/admin/auth/logout
 */
router.post('/auth/logout', async (req, res) => {
  const adminId = req.session?.adminId
  const adminUsername = req.session?.adminUsername
  const ip = getClientIp(req)

  if (adminId) {
    await logAudit({
      adminId,
      adminUsername,
      action: 'ADMIN_LOGOUT',
      targetType: 'ADMIN_USER',
      targetId: adminId,
      ipAddress: ip
    })
  }

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out.' })
    }
    res.clearCookie('connect.sid')
    return res.json({ success: true, message: 'Logged out successfully.' })
  })
})

/**
 * GET /api/admin/auth/me
 */
router.get('/auth/me', requireSuperAdmin, async (req, res) => {
  return res.json({
    success: true,
    admin: req.admin.toJSON()
  })
})

// ----------------------------------------------------------------------------
// 2. DASHBOARD METRICS
// ----------------------------------------------------------------------------

/**
 * GET /api/admin/dashboard/stats
 */
router.get('/dashboard/stats', requireSuperAdmin, async (req, res) => {
  try {
    const [
      totalShops,
      activeShops,
      suspendedShops,
      archivedShops,
      totalLicenses,
      activeLicenses,
      availableLicenses,
      expiredLicenses,
      revokedLicenses,
      recentShops,
      recentAuditLogs
    ] = await Promise.all([
      Shop.countDocuments(),
      Shop.countDocuments({ status: 'ACTIVE' }),
      Shop.countDocuments({ status: 'SUSPENDED' }),
      Shop.countDocuments({ status: 'ARCHIVED' }),
      License.countDocuments(),
      License.countDocuments({ status: 'ACTIVE' }),
      License.countDocuments({ status: 'AVAILABLE' }),
      License.countDocuments({ status: 'EXPIRED' }),
      License.countDocuments({ status: 'REVOKED' }),
      Shop.find().sort({ createdAt: -1 }).limit(5).select('shopId shopName ownerName phone status createdAt'),
      AuditLog.find().sort({ createdAt: -1 }).limit(10)
    ])

    return res.json({
      success: true,
      stats: {
        shops: {
          total: totalShops,
          active: activeShops,
          suspended: suspendedShops,
          archived: archivedShops
        },
        licenses: {
          total: totalLicenses,
          active: activeLicenses,
          available: availableLicenses,
          expired: expiredLicenses,
          revoked: revokedLicenses
        },
        recentShops,
        recentAuditLogs
      }
    })
  } catch (err) {
    console.error('Dashboard stats error:', err)
    return res.status(500).json({ success: false, message: 'Failed to aggregate dashboard metrics.' })
  }
})

// ----------------------------------------------------------------------------
// 3. SHOP & ONBOARDING PROVISIONING
// ----------------------------------------------------------------------------

/**
 * POST /api/admin/shops
 * Creates a brand new Shop + OwnerAccount + License atomically.
 * Returns generated plain secrets ONCE for Super Admin export.
 */
router.post('/shops', requireSuperAdmin, adminActionLimiter, async (req, res) => {
  try {
    const {
      shopName,
      ownerName,
      phone,
      email = '',
      address = '',
      city = '',
      state = '',
      pincode = '',
      gstin = '',
      businessType = 'WHOLESALE',
      edition = 'PROFESSIONAL',
      maxAllowedMachines = 1,
      validityDays = null,
      customUsername = '',
      notes = ''
    } = req.body

    if (!shopName || !ownerName || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Shop name, owner name, and phone number are required.'
      })
    }

    // 1. Generate unique identifiers & secrets
    const shopId = generateShopId()
    const username = (customUsername && customUsername.trim())
      ? customUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
      : generateSuggestedUsername(shopName)

    // Check if username already exists
    const existingOwner = await OwnerAccount.findOne({ username })
    if (existingOwner) {
      return res.status(409).json({
        success: false,
        message: `Username '${username}' is already taken. Please choose another or let it generate automatically.`
      })
    }

    const rawTemporaryPassword = generateTemporaryPassword()
    const rawRecoveryKey = generateRecoveryKey()
    const rawProductKey = generateProductKey(edition)

    // 2. Hash secrets securely
    const passwordHash = await hashPassword(rawTemporaryPassword)
    const recoveryKeyHash = hashSecretKey(rawRecoveryKey)
    const productKeyHash = hashSecretKey(rawProductKey)

    // Mask product key for display (JERP-PRO-****-****-PL8Q)
    const keyParts = rawProductKey.split('-')
    const productKeyMasked = `${keyParts[0]}-${keyParts[1]}-****-****-${keyParts[4]}`

    // Expiry calculation
    let expiresAt = null
    if (validityDays && Number(validityDays) > 0) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + Number(validityDays))
    }

    // 3. Create Shop, OwnerAccount, and License atomically (with compensation cleanup on error)
    let createdShop = null
    let createdOwner = null
    let createdLicense = null

    try {
      createdShop = new Shop({
        shopId,
        shopName: shopName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        gstin: gstin.trim().toUpperCase(),
        businessType,
        edition,
        maxAllowedMachines: Math.max(1, Number(maxAllowedMachines) || 1),
        status: 'ACTIVE',
        notes
      })
      await createdShop.save()

      createdOwner = new OwnerAccount({
        shopId: createdShop._id,
        shopIdentifier: createdShop.shopId,
        username,
        passwordHash,
        recoveryKeyHash,
        isTemporaryPassword: true,
        isProvisioned: false
      })
      await createdOwner.save()

      createdLicense = new License({
        shopId: createdShop._id,
        productKeyHash,
        productKeyMasked,
        edition,
        customerName: ownerName.trim(),
        firmName: shopName.trim(),
        phone: phone.trim(),
        status: 'AVAILABLE',
        maxAllowedMachines: createdShop.maxAllowedMachines,
        expiresAt,
        notes: `Issued to ${shopName} (${shopId})`
      })
      await createdLicense.save()

      createdShop.ownerAccountId = createdOwner._id
      createdShop.licenseId = createdLicense._id
      await createdShop.save()
    } catch (saveError) {
      // Automatic compensation rollback: clean up partially saved documents
      if (createdLicense && createdLicense._id) await License.findByIdAndDelete(createdLicense._id)
      if (createdOwner && createdOwner._id) await OwnerAccount.findByIdAndDelete(createdOwner._id)
      if (createdShop && createdShop._id) await Shop.findByIdAndDelete(createdShop._id)
      throw saveError
    }

    const shop = createdShop

    // 7. Audit log
    await logAudit({
      adminId: req.admin._id,
      adminUsername: req.admin.username,
      action: 'SHOP_CREATE',
      targetType: 'SHOP',
      targetId: shop.shopId,
      details: {
        shopName: shop.shopName,
        edition: shop.edition,
        username
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    })

    // Return the one-time generated credentials package
    return res.status(201).json({
      success: true,
      message: 'Shop, Owner Account, and License created successfully.',
      shop: {
        id: shop._id,
        shopId: shop.shopId,
        shopName: shop.shopName,
        ownerName: shop.ownerName,
        businessType: shop.businessType,
        edition: shop.edition,
        status: shop.status,
        createdAt: shop.createdAt
      },
      // IMPORTANT: Returned ONCE for Super Admin onboarding document creation
      oneTimeCredentials: {
        shopId: shop.shopId,
        shopName: shop.shopName,
        ownerName: shop.ownerName,
        username,
        temporaryPassword: rawTemporaryPassword,
        recoveryKey: rawRecoveryKey,
        productKey: rawProductKey,
        edition: shop.edition,
        maxAllowedMachines: shop.maxAllowedMachines,
        warning: 'Store these credentials securely. They cannot be retrieved again in plaintext.'
      }
    })
  } catch (err) {
    console.error('Shop creation error:', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to create shop.' })
  }
})

/**
 * POST /api/admin/shops/generate-onboarding-pdf
 * Generates an official onboarding PDF on demand using the oneTimeCredentials package.
 * Protected by requireSuperAdmin and CSRF check.
 */
router.post('/shops/generate-onboarding-pdf', requireSuperAdmin, async (req, res) => {
  try {
    const {
      shopName,
      shopId,
      ownerName,
      username,
      temporaryPassword,
      recoveryKey,
      productKey,
      edition,
      maxAllowedMachines
    } = req.body

    if (!shopName || !shopId || !username || !temporaryPassword || !recoveryKey || !productKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing required credential parameters for PDF generation.'
      })
    }

    const pdfBuffer = await generateOnboardingPdf({
      shopName,
      shopId,
      ownerName: ownerName || 'Valued Partner',
      username,
      temporaryPassword,
      recoveryKey,
      productKey,
      edition: edition || 'PROFESSIONAL',
      maxAllowedMachines: maxAllowedMachines || 1
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="onboarding-${shopId}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    return res.end(pdfBuffer)
  } catch (err) {
    console.error('PDF generation route error:', err)
    return res.status(500).json({ success: false, message: 'Failed to generate onboarding PDF document.' })
  }
})

/**
 * GET /api/admin/shops
 * List / search shops
 */
router.get('/shops', requireSuperAdmin, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 25 } = req.query
    const query = {}

    if (status) query.status = status
    if (search) {
      const rx = new RegExp(search.trim(), 'i')
      query.$or = [{ shopId: rx }, { shopName: rx }, { ownerName: rx }, { phone: rx }]
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10)
    const [total, shops] = await Promise.all([
      Shop.countDocuments(query),
      Shop.find(query)
        .populate('ownerAccountId', 'username isProvisioned isTemporaryPassword provisionedAt')
        .populate('licenseId', 'productKeyMasked status boundMachineId expiresAt activations')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
    ])

    return res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      shops
    })
  } catch (err) {
    console.error('List shops error:', err)
    return res.status(500).json({ success: false, message: 'Failed to retrieve shops.' })
  }
})

/**
 * GET /api/admin/shops/:id
 * Retrieve shop details with associated owner and license
 */
router.get('/shops/:id', requireSuperAdmin, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id)
      .populate('ownerAccountId', 'username isProvisioned isTemporaryPassword provisionedAt provisionedMachineId lastPasswordChangeAt createdAt')
      .populate('licenseId', 'productKeyMasked edition status boundMachineId maxAllowedMachines expiresAt activations createdAt')

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found.' })
    }

    return res.json({ success: true, shop })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * PUT /api/admin/shops/:id
 * Update shop details
 */
router.put('/shops/:id', requireSuperAdmin, adminActionLimiter, async (req, res) => {
  try {
    const { shopName, ownerName, phone, email, address, city, state, pincode, gstin, notes } = req.body

    const shop = await Shop.findById(req.params.id)
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found.' })
    }

    if (shopName) shop.shopName = shopName.trim()
    if (ownerName) shop.ownerName = ownerName.trim()
    if (phone) shop.phone = phone.trim()
    if (email !== undefined) shop.email = String(email).trim().toLowerCase()
    if (address !== undefined) shop.address = String(address).trim()
    if (city !== undefined) shop.city = String(city).trim()
    if (state !== undefined) shop.state = String(state).trim()
    if (pincode !== undefined) shop.pincode = String(pincode).trim()
    if (gstin !== undefined) shop.gstin = String(gstin).trim().toUpperCase()
    if (notes !== undefined) shop.notes = String(notes)

    await shop.save()

    await logAudit({
      adminId: req.admin._id,
      adminUsername: req.admin.username,
      action: 'SHOP_UPDATE',
      targetType: 'SHOP',
      targetId: shop.shopId,
      details: { shopName: shop.shopName },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    })

    return res.json({ success: true, message: 'Shop updated successfully.', shop })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * POST /api/admin/shops/:id/status
 * Suspend, Reactivate, or Archive a shop
 */
router.post('/shops/:id/status', requireSuperAdmin, adminActionLimiter, async (req, res) => {
  try {
    const { status } = req.body
    if (!['ACTIVE', 'SUSPENDED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be ACTIVE, SUSPENDED, or ARCHIVED.' })
    }

    const shop = await Shop.findById(req.params.id)
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found.' })
    }

    const previousStatus = shop.status
    shop.status = status
    await shop.save()

    // Cascade status to linked license carefully:
    // When suspended: license is SUSPENDED (unless already EXPIRED or REVOKED)
    // When archived: license is REVOKED (unless EXPIRED)
    // When reactivated: restore authorized license state (ACTIVE if bound, AVAILABLE if not bound).
    // NEVER automatically reactivate REVOKED or EXPIRED licenses!
    if (shop.licenseId) {
      const linkedLicense = await License.findById(shop.licenseId)
      if (linkedLicense) {
        if (status === 'SUSPENDED') {
          if (linkedLicense.status !== 'EXPIRED' && linkedLicense.status !== 'REVOKED') {
            linkedLicense.status = 'SUSPENDED'
            await linkedLicense.save()
          }
        } else if (status === 'ARCHIVED') {
          if (linkedLicense.status !== 'EXPIRED') {
            linkedLicense.status = 'REVOKED'
            await linkedLicense.save()
          }
        } else if (status === 'ACTIVE') {
          // Only restore if license was suspended due to shop suspension
          if (linkedLicense.status === 'SUSPENDED') {
            linkedLicense.status = linkedLicense.boundMachineId ? 'ACTIVE' : 'AVAILABLE'
            await linkedLicense.save()
          }
        }
      }
    }

    await logAudit({
      adminId: req.admin._id,
      adminUsername: req.admin.username,
      action: `SHOP_${status}`,
      targetType: 'SHOP',
      targetId: shop.shopId,
      details: { previousStatus, newStatus: status, shopName: shop.shopName },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    })

    return res.json({
      success: true,
      message: `Shop status updated to ${status}.`,
      shop
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * POST /api/admin/shops/:id/rotate-credentials
 * Safely generates replacement temporary password or recovery key if customer lost original
 */
router.post('/shops/:id/rotate-credentials', requireSuperAdmin, adminActionLimiter, async (req, res) => {
  try {
    const { rotatePassword = false, rotateRecoveryKey = false } = req.body

    if (!rotatePassword && !rotateRecoveryKey) {
      return res.status(400).json({ success: false, message: 'Specify at least rotatePassword or rotateRecoveryKey.' })
    }

    const shop = await Shop.findById(req.params.id).populate('ownerAccountId')
    if (!shop || !shop.ownerAccountId) {
      return res.status(404).json({ success: false, message: 'Shop or linked Owner Account not found.' })
    }

    const owner = shop.ownerAccountId
    const result = { shopId: shop.shopId, username: owner.username }

    if (rotatePassword) {
      const newTempPassword = generateTemporaryPassword()
      owner.passwordHash = await hashPassword(newTempPassword)
      owner.isTemporaryPassword = true
      owner.passwordVersion = (owner.passwordVersion || 1) + 1
      result.newTemporaryPassword = newTempPassword
    }

    if (rotateRecoveryKey) {
      const newRecoveryKey = generateRecoveryKey()
      owner.recoveryKeyHash = hashSecretKey(newRecoveryKey)
      owner.recoveryKeyVersion = (owner.recoveryKeyVersion || 1) + 1
      result.newRecoveryKey = newRecoveryKey
    }

    owner.credentialVersion = (owner.credentialVersion || 1) + 1
    await owner.save()

    await logAudit({
      adminId: req.admin._id,
      adminUsername: req.admin.username,
      action: 'CREDENTIAL_ROTATION',
      targetType: 'OWNER_ACCOUNT',
      targetId: owner.username,
      details: {
        shopId: shop.shopId,
        rotatedPassword: Boolean(rotatePassword),
        rotatedRecoveryKey: Boolean(rotateRecoveryKey)
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    })

    return res.json({
      success: true,
      message: 'Credentials rotated successfully. Secrets are shown once below.',
      credentials: result
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// ----------------------------------------------------------------------------
// 3.5. OWNER ACCOUNTS & DIRECT CREDENTIAL MANAGEMENT
// ----------------------------------------------------------------------------

/**
 * GET /api/admin/owners
 * List and search owner accounts with filtering and pagination
 */
router.get('/owners', requireSuperAdmin, async (req, res) => {
  try {
    const { search, provisioningStatus, accountStatus, page = 1, limit = 25 } = req.query
    const query = {}

    if (provisioningStatus === 'PROVISIONED') {
      query.isProvisioned = true
    } else if (provisioningStatus === 'PENDING') {
      query.isProvisioned = false
    }

    if (search && search.trim()) {
      const rx = new RegExp(search.trim(), 'i')
      const matchingShops = await Shop.find({
        $or: [{ shopName: rx }, { ownerName: rx }, { shopId: rx }]
      }).select('_id')
      const shopIds = matchingShops.map((s) => s._id)

      query.$or = [
        { username: rx },
        { shopIdentifier: rx },
        { shopId: { $in: shopIds } }
      ]
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10)

    let owners = await OwnerAccount.find(query)
      .select('-passwordHash -recoveryKeyHash')
      .populate({
        path: 'shopId',
        select: 'shopId shopName ownerName phone email status edition businessType maxAllowedMachines createdAt',
        populate: {
          path: 'licenseId',
          select: 'productKeyMasked status boundMachineId'
        }
      })
      .sort({ createdAt: -1 })
      .exec()

    if (accountStatus) {
      owners = owners.filter((o) => o.shopId && o.shopId.status === accountStatus)
    }

    const total = owners.length
    const paginatedOwners = owners.slice(skip, skip + parseInt(limit, 10))

    return res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      owners: paginatedOwners
    })
  } catch (err) {
    console.error('List owners error:', err)
    return res.status(500).json({ success: false, message: 'Failed to retrieve owner accounts.' })
  }
})

/**
 * GET /api/admin/owners/:id
 * Retrieve single owner account details by Owner ID
 */
router.get('/owners/:id', requireSuperAdmin, async (req, res) => {
  try {
    const owner = await OwnerAccount.findById(req.params.id)
      .select('-passwordHash -recoveryKeyHash')
      .populate({
        path: 'shopId',
        populate: {
          path: 'licenseId'
        }
      })

    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner account not found.' })
    }

    const auditLogs = await AuditLog.find({
      $or: [
        { targetId: owner.username },
        { targetId: owner.shopIdentifier }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(20)

    return res.json({
      success: true,
      owner,
      shop: owner.shopId,
      license: owner.shopId?.licenseId,
      auditLogs
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * POST /api/admin/owners/:id/reset-password
 * Securely regenerates a temporary password using crypto.randomBytes() & Argon2id
 */
router.post('/owners/:id/reset-password', requireSuperAdmin, adminActionLimiter, async (req, res) => {
  try {
    const owner = await OwnerAccount.findById(req.params.id).populate('shopId')
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner account not found.' })
    }

    const newTempPassword = generateTemporaryPassword()
    owner.passwordHash = await hashPassword(newTempPassword)
    owner.isTemporaryPassword = true
    owner.passwordVersion = (owner.passwordVersion || 1) + 1
    owner.credentialVersion = (owner.credentialVersion || 1) + 1
    await owner.save()

    await logAudit({
      adminId: req.admin._id,
      adminUsername: req.admin.username,
      action: 'OWNER_PASSWORD_RESET',
      targetType: 'OWNER_ACCOUNT',
      targetId: owner.username,
      details: {
        shopId: owner.shopIdentifier,
        shopName: owner.shopId?.shopName,
        resetBy: req.admin.username
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    })

    return res.json({
      success: true,
      message: 'Temporary password reset successfully.',
      temporaryPassword: newTempPassword,
      username: owner.username,
      shopIdentifier: owner.shopIdentifier
    })
  } catch (err) {
    console.error('Password reset error:', err)
    return res.status(500).json({ success: false, message: 'Failed to reset temporary password.' })
  }
})

/**
 * POST /api/admin/owners/:id/rotate-recovery-key
 * Securely rotates master recovery key using crypto.randomBytes() & SHA-256
 */
router.post('/owners/:id/rotate-recovery-key', requireSuperAdmin, adminActionLimiter, async (req, res) => {
  try {
    const owner = await OwnerAccount.findById(req.params.id).populate('shopId')
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner account not found.' })
    }

    const newRecoveryKey = generateRecoveryKey()
    owner.recoveryKeyHash = hashSecretKey(newRecoveryKey)
    owner.recoveryKeyVersion = (owner.recoveryKeyVersion || 1) + 1
    owner.credentialVersion = (owner.credentialVersion || 1) + 1
    await owner.save()

    await logAudit({
      adminId: req.admin._id,
      adminUsername: req.admin.username,
      action: 'RECOVERY_KEY_ROTATED',
      targetType: 'OWNER_ACCOUNT',
      targetId: owner.username,
      details: {
        shopId: owner.shopIdentifier,
        shopName: owner.shopId?.shopName,
        rotatedBy: req.admin.username
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    })

    return res.json({
      success: true,
      message: 'Master Recovery Key rotated successfully.',
      recoveryKey: newRecoveryKey,
      username: owner.username,
      shopIdentifier: owner.shopIdentifier
    })
  } catch (err) {
    console.error('Recovery key rotation error:', err)
    return res.status(500).json({ success: false, message: 'Failed to rotate master recovery key.' })
  }
})

// ----------------------------------------------------------------------------
// 4. LICENSES & MACHINE MANAGEMENT
// ----------------------------------------------------------------------------

/**
 * GET /api/admin/licenses
 * List licenses with search, filtering, and pagination
 */
router.get('/licenses', requireSuperAdmin, async (req, res) => {
  try {
    const { status, edition, bindingStatus, search, page = 1, limit = 25 } = req.query
    const query = {}

    if (status) query.status = status
    if (edition) query.edition = edition

    if (bindingStatus === 'BOUND') {
      query.boundMachineId = { $ne: null }
    } else if (bindingStatus === 'UNBOUND') {
      query.boundMachineId = null
    }

    if (search && search.trim()) {
      const rx = new RegExp(search.trim(), 'i')
      const matchingShops = await Shop.find({
        $or: [{ shopName: rx }, { shopId: rx }]
      }).select('_id')
      const shopIds = matchingShops.map((s) => s._id)

      query.$or = [
        { productKeyMasked: rx },
        { customerName: rx },
        { firmName: rx },
        { boundMachineId: rx },
        { shopId: { $in: shopIds } }
      ]
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10)
    const [total, licenses] = await Promise.all([
      License.countDocuments(query),
      License.find(query)
        .select('-productKey -productKeyHash')
        .populate({
          path: 'shopId',
          select: 'shopId shopName ownerName phone email status edition businessType maxAllowedMachines createdAt',
          populate: {
            path: 'ownerAccountId',
            select: 'username isProvisioned'
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
    ])

    return res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      licenses
    })
  } catch (err) {
    console.error('List licenses error:', err)
    return res.status(500).json({ success: false, message: 'Failed to retrieve licenses.' })
  }
})

/**
 * GET /api/admin/licenses/:id
 * Retrieve detailed license information with activation history and audit events
 */
router.get('/licenses/:id', requireSuperAdmin, async (req, res) => {
  try {
    const license = await License.findById(req.params.id)
      .select('-productKey -productKeyHash')
      .populate({
        path: 'shopId',
        populate: {
          path: 'ownerAccountId',
          select: 'username isProvisioned isTemporaryPassword'
        }
      })

    if (!license) {
      return res.status(404).json({ success: false, message: 'License not found.' })
    }

    const auditLogs = await AuditLog.find({
      $or: [
        { targetId: license._id.toString() },
        { targetId: license.shopId?.shopId || '' }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(30)

    return res.json({
      success: true,
      license,
      shop: license.shopId,
      auditLogs
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * POST /api/admin/licenses/:id/reset-machine
 * Clears machine binding to authorize hardware replacement
 * Preserves activation history and validates license status
 */
router.post('/licenses/:id/reset-machine', requireSuperAdmin, adminActionLimiter, async (req, res) => {
  try {
    const { reason = 'Authorized hardware replacement' } = req.body

    const license = await License.findById(req.params.id)
    if (!license) {
      return res.status(404).json({ success: false, message: 'License not found.' })
    }

    if (license.status === 'REVOKED') {
      return res.status(400).json({ success: false, message: 'Cannot reset machine binding for a revoked license.' })
    }

    if (license.status === 'EXPIRED') {
      return res.status(400).json({ success: false, message: 'Cannot reset machine binding for an expired license.' })
    }

    const previousMachine = license.boundMachineId
    license.boundMachineId = null
    if (license.status === 'ACTIVE') {
      license.status = 'AVAILABLE'
    }
    await license.save()

    await logAudit({
      adminId: req.admin._id,
      adminUsername: req.admin.username,
      action: 'MACHINE_BINDING_RESET',
      targetType: 'LICENSE',
      targetId: license._id.toString(),
      details: { previousMachine, reason },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    })

    return res.json({
      success: true,
      message: 'Machine binding reset successfully. License can now be activated on a new device.',
      license
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * POST /api/admin/licenses/:id/status
 * Updates license status with strict transition validation
 */
router.post('/licenses/:id/status', requireSuperAdmin, adminActionLimiter, async (req, res) => {
  try {
    const { status, reason = '' } = req.body
    if (!['ACTIVE', 'AVAILABLE', 'SUSPENDED', 'REVOKED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid license status specified.' })
    }

    const license = await License.findById(req.params.id).populate('shopId')
    if (!license) {
      return res.status(404).json({ success: false, message: 'License not found.' })
    }

    // Rule 1: Never automatically reactivate a REVOKED license
    if (license.status === 'REVOKED' && status !== 'REVOKED') {
      return res.status(400).json({
        success: false,
        message: 'Revoked licenses cannot be reactivated. A new license must be issued.'
      })
    }

    // Rule 2: Never reactivate an EXPIRED license without authorized renewal
    const isLicenseExpired = license.status === 'EXPIRED' || (license.expiresAt && new Date(license.expiresAt) < new Date())
    if (isLicenseExpired && status !== 'EXPIRED') {
      return res.status(400).json({
        success: false,
        message: 'Expired licenses cannot be reactivated directly. Renew validity horizon first.'
      })
    }

    // Rule 3: A suspended or archived shop must not have an ACTIVE or AVAILABLE license
    if (['ACTIVE', 'AVAILABLE'].includes(status) && license.shopId) {
      if (license.shopId.status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          message: 'Cannot activate license for a suspended showroom. Reactivate the shop first.'
        })
      }
      if (license.shopId.status === 'ARCHIVED') {
        return res.status(403).json({
          success: false,
          message: 'Cannot activate license for an archived showroom.'
        })
      }
    }

    const previousStatus = license.status
    if (status === 'ACTIVE' || status === 'AVAILABLE') {
      license.status = license.boundMachineId ? 'ACTIVE' : 'AVAILABLE'
    } else {
      license.status = status
    }

    await license.save()

    await logAudit({
      adminId: req.admin._id,
      adminUsername: req.admin.username,
      action: `LICENSE_${license.status}`,
      targetType: 'LICENSE',
      targetId: license._id.toString(),
      details: { previousStatus, newStatus: license.status, reason },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    })

    return res.json({
      success: true,
      message: `License status updated to ${license.status}.`,
      license
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// ----------------------------------------------------------------------------
// 5. AUDIT LOGS
// ----------------------------------------------------------------------------

/**
 * GET /api/admin/audit-logs
 * Filterable administrative audit trail
 */
router.get('/audit-logs', requireSuperAdmin, async (req, res) => {
  try {
    const { action, targetType, page = 1, limit = 50 } = req.query
    const query = {}

    if (action) query.action = action
    if (targetType) query.targetType = targetType

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10)
    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10))
    ])

    return res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      logs
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
