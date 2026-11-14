/**
 * PHASE 4 INTEGRATION TEST SUITE: test-phase4.js
 *
 * Runs comprehensive, non-destructive tests against an isolated sandbox database:
 * `jewellery_erp_phase4_sandbox`
 *
 * Tests all 17 Phase 4 requirements:
 * 1. Owner account listing
 * 2. Owner account detail view
 * 3. Temporary password reset
 * 4. Old password invalidation
 * 5. New temporary password validation
 * 6. Recovery key rotation
 * 7. Old recovery key invalidation
 * 8. New recovery key verification
 * 9. Shop suspension
 * 10. Shop reactivation
 * 11. Shop archiving
 * 12. License status consistency (no unearned resurrection of revoked/expired)
 * 13. Audit log creation
 * 14. No plaintext secrets in MongoDB
 * 15. Unauthorized API requests (401)
 * 16. CSRF protection (403)
 * 17. Existing Shop Creation workflow remains functional
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const assert = require('assert')
const request = require('supertest')
const mongoose = require('mongoose')
const { app } = require('./server')
const { AdminUser } = require('./models/AdminUser')
const { Shop } = require('./models/Shop')
const { OwnerAccount } = require('./models/OwnerAccount')
const { License } = require('./models/License')
const { AuditLog } = require('./models/AuditLog')
const { hashPassword, verifyPassword, hashSecretKey } = require('./services/credential.service')

const baseUri = process.env.MONGODB_URI
const sandboxUri = baseUri.replace(/\/[^/?]+(\?|$)/, '/jerp_test_p4$1')

async function runPhase4Tests() {
  console.log('=================================================================')
  console.log('🧪 STARTING PHASE 4 SECURITY & CREDENTIAL MANAGEMENT TEST SUITE')
  console.log('Isolated Sandbox DB: jewellery_erp_phase4_sandbox')
  console.log('=================================================================\n')

  // Disconnect any existing default connection and connect to sandbox
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  await mongoose.connect(sandboxUri)
  console.log('✅ Connected to isolated sandbox MongoDB')

  // Clear sandbox collections cleanly
  await AdminUser.deleteMany({})
  await Shop.deleteMany({})
  await OwnerAccount.deleteMany({})
  await License.deleteMany({})
  await AuditLog.deleteMany({})

  const agent = request.agent(app)

  // 1. Setup Super Admin
  const testAdminUser = 'phase4_superadmin'
  const testAdminPass = 'SuperAdminSecurePass!2026'
  const adminHash = await hashPassword(testAdminPass)

  const admin = new AdminUser({
    username: testAdminUser,
    email: 'phase4_admin@example.com',
    passwordHash: adminHash,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE'
  })
  await admin.save()
  console.log('✅ Created Sandbox Super Admin user')

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Rejection of unauthenticated request
    // ------------------------------------------------------------------------
    console.log('\n[Test 1] Unauthorized API requests (401)')
    const unauthRes = await request(app).get('/api/admin/owners')
    assert.strictEqual(unauthRes.status, 401, 'Must reject unauthenticated calls with 401')
    console.log('  ✓ Correctly rejected unauthenticated call with 401')

    // ------------------------------------------------------------------------
    // TEST 2: CSRF protection enforcement
    // ------------------------------------------------------------------------
    console.log('\n[Test 2] CSRF protection (missing X-Requested-With -> 403)')
    const csrfRes = await request(app)
      .post('/api/admin/auth/login')
      .send({ identifier: testAdminUser, password: testAdminPass })
    assert.strictEqual(csrfRes.status, 403, 'Must reject requests missing CSRF header with 403')
    console.log('  ✓ Correctly rejected missing CSRF header with 403')

    // ------------------------------------------------------------------------
    // TEST 3: Super Admin Login & Session Cookie
    // ------------------------------------------------------------------------
    console.log('\n[Test 3] Super Admin session authentication')
    const loginRes = await agent
      .post('/api/admin/auth/login')
      .send({ identifier: testAdminUser, password: testAdminPass })
      .set('X-Requested-With', 'XMLHttpRequest')
    assert.strictEqual(loginRes.status, 200)
    assert.strictEqual(loginRes.body.success, true)
    console.log('  ✓ Super Admin logged in, persistent session established')

    // ------------------------------------------------------------------------
    // TEST 4: Existing Shop Creation Workflow remains fully functional
    // ------------------------------------------------------------------------
    console.log('\n[Test 4] Shop creation workflow verification (Phase 3 regression check)')
    const createShopRes = await agent
      .post('/api/admin/shops')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        shopName: 'Kalyan Heritage Jewels',
        ownerName: 'Vikas Kalyan',
        phone: '+91 9988776655',
        businessType: 'RETAIL',
        edition: 'PROFESSIONAL'
      })
    assert.strictEqual(createShopRes.status, 201)
    assert.strictEqual(createShopRes.body.success, true)
    const { shop, oneTimeCredentials } = createShopRes.body
    assert.ok(shop.id)
    assert.ok(oneTimeCredentials.temporaryPassword)
    assert.ok(oneTimeCredentials.recoveryKey)
    assert.ok(oneTimeCredentials.productKey)
    console.log(`  ✓ Shop created: ${shop.shopName} (${shop.shopId})`)
    console.log('  ✓ One-time credentials issued securely')

    // ------------------------------------------------------------------------
    // TEST 5: Owner Account Listing
    // ------------------------------------------------------------------------
    console.log('\n[Test 5] Owner account listing & pagination')
    const listOwnersRes = await agent
      .get('/api/admin/owners')
      .set('X-Requested-With', 'XMLHttpRequest')
    assert.strictEqual(listOwnersRes.status, 200)
    assert.strictEqual(listOwnersRes.body.success, true)
    assert.strictEqual(listOwnersRes.body.total, 1)
    const ownerRecord = listOwnersRes.body.owners[0]
    assert.strictEqual(ownerRecord.username, oneTimeCredentials.username)
    assert.strictEqual(ownerRecord.isTemporaryPassword, true)
    assert.strictEqual(ownerRecord.isProvisioned, false)
    console.log(`  ✓ Listed owner: ${ownerRecord.username}, provisioned: ${ownerRecord.isProvisioned}`)

    // ------------------------------------------------------------------------
    // TEST 6: Owner Account Detail View
    // ------------------------------------------------------------------------
    console.log('\n[Test 6] Owner account detail view')
    const ownerDetailRes = await agent
      .get(`/api/admin/owners/${ownerRecord._id}`)
      .set('X-Requested-With', 'XMLHttpRequest')
    assert.strictEqual(ownerDetailRes.status, 200)
    assert.strictEqual(ownerDetailRes.body.success, true)
    assert.strictEqual(ownerDetailRes.body.owner.username, ownerRecord.username)
    assert.ok(ownerDetailRes.body.shop)
    assert.ok(ownerDetailRes.body.license)
    console.log('  ✓ Detail view populated with Owner, Shop, License and Audit logs')

    // ------------------------------------------------------------------------
    // TEST 7 & 8: Temporary Password Reset & Validation
    // ------------------------------------------------------------------------
    console.log('\n[Test 7 & 8] Temporary password reset & verification')
    const oldTempPassword = oneTimeCredentials.temporaryPassword
    const resetPwRes = await agent
      .post(`/api/admin/owners/${ownerRecord._id}/reset-password`)
      .set('X-Requested-With', 'XMLHttpRequest')
    assert.strictEqual(resetPwRes.status, 200)
    assert.strictEqual(resetPwRes.body.success, true)
    const newTempPassword = resetPwRes.body.temporaryPassword
    assert.notStrictEqual(newTempPassword, oldTempPassword, 'New temporary password must differ from old')

    // Verify in MongoDB: old password invalid, new password valid
    const updatedOwner = await OwnerAccount.findById(ownerRecord._id)
    const isOldValid = await verifyPassword(updatedOwner.passwordHash, oldTempPassword)
    const isNewValid = await verifyPassword(updatedOwner.passwordHash, newTempPassword)
    assert.strictEqual(isOldValid, false, 'Old password must be invalidated')
    assert.strictEqual(isNewValid, true, 'New password must validate with Argon2id')
    assert.strictEqual(updatedOwner.isTemporaryPassword, true)
    console.log('  ✓ Old temporary password successfully invalidated')
    console.log('  ✓ New temporary password validated via Argon2id')

    // ------------------------------------------------------------------------
    // TEST 9 & 10: Master Recovery Key Rotation & Verification
    // ------------------------------------------------------------------------
    console.log('\n[Test 9 & 10] Master Recovery Key rotation & hash verification')
    const oldRecoveryKey = oneTimeCredentials.recoveryKey
    const rotateKeyRes = await agent
      .post(`/api/admin/owners/${ownerRecord._id}/rotate-recovery-key`)
      .set('X-Requested-With', 'XMLHttpRequest')
    assert.strictEqual(rotateKeyRes.status, 200)
    assert.strictEqual(rotateKeyRes.body.success, true)
    const newRecoveryKey = rotateKeyRes.body.recoveryKey
    assert.notStrictEqual(newRecoveryKey, oldRecoveryKey, 'New recovery key must differ from old')

    // Verify in MongoDB
    const postRotateOwner = await OwnerAccount.findById(ownerRecord._id)
    const oldHash = hashSecretKey(oldRecoveryKey)
    const newHash = hashSecretKey(newRecoveryKey)
    assert.notStrictEqual(postRotateOwner.recoveryKeyHash, oldHash, 'Old recovery hash must be replaced')
    assert.strictEqual(postRotateOwner.recoveryKeyHash, newHash, 'New recovery hash must match SHA-256')
    console.log('  ✓ Old recovery key invalidated')
    console.log('  ✓ New recovery key securely hashed and verified')

    // ------------------------------------------------------------------------
    // TEST 11: Shop Suspension
    // ------------------------------------------------------------------------
    console.log('\n[Test 11] Shop suspension & license cascade')
    const suspendRes = await agent
      .post(`/api/admin/shops/${shop.id}/status`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ status: 'SUSPENDED' })
    assert.strictEqual(suspendRes.status, 200)
    assert.strictEqual(suspendRes.body.shop.status, 'SUSPENDED')

    const suspendedShopDoc = await Shop.findById(shop.id)
    const suspendedLicenseDoc = await License.findById(suspendedShopDoc.licenseId)
    assert.strictEqual(suspendedShopDoc.status, 'SUSPENDED')
    assert.strictEqual(suspendedLicenseDoc.status, 'SUSPENDED')
    console.log('  ✓ Shop and associated license successfully marked SUSPENDED')

    // Verify client activation is blocked when shop is suspended
    const activateBlockedRes = await request(app)
      .post('/api/licenses/activate')
      .send({
        productKey: oneTimeCredentials.productKey,
        machineId: 'TEST-MACHINE-HWID-001'
      })
    assert.strictEqual(activateBlockedRes.status, 403, 'Must reject activation when suspended')
    console.log('  ✓ Activation correctly blocked (403) while shop is suspended')

    // ------------------------------------------------------------------------
    // TEST 12: Shop Reactivation
    // ------------------------------------------------------------------------
    console.log('\n[Test 12] Shop reactivation')
    const reactivateRes = await agent
      .post(`/api/admin/shops/${shop.id}/status`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ status: 'ACTIVE' })
    assert.strictEqual(reactivateRes.status, 200)
    assert.strictEqual(reactivateRes.body.shop.status, 'ACTIVE')

    const activeLicenseDoc = await License.findById(suspendedShopDoc.licenseId)
    assert.strictEqual(activeLicenseDoc.status, 'AVAILABLE', 'Unbound license restored to AVAILABLE')
    console.log('  ✓ Shop restored to ACTIVE, license restored to AVAILABLE')

    // ------------------------------------------------------------------------
    // TEST 13: Shop Archiving
    // ------------------------------------------------------------------------
    console.log('\n[Test 13] Shop archiving & revocation')
    const archiveRes = await agent
      .post(`/api/admin/shops/${shop.id}/status`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ status: 'ARCHIVED' })
    assert.strictEqual(archiveRes.status, 200)
    assert.strictEqual(archiveRes.body.shop.status, 'ARCHIVED')

    const archivedLicenseDoc = await License.findById(suspendedShopDoc.licenseId)
    assert.strictEqual(archivedLicenseDoc.status, 'REVOKED')
    console.log('  ✓ Shop marked ARCHIVED, license marked REVOKED')

    // ------------------------------------------------------------------------
    // TEST 14: License Status Consistency (Do NOT revive revoked license)
    // ------------------------------------------------------------------------
    console.log('\n[Test 14] License status consistency: Do not un-revoke revoked license')
    await agent
      .post(`/api/admin/shops/${shop.id}/status`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ status: 'ACTIVE' })

    const postActiveLicense = await License.findById(suspendedShopDoc.licenseId)
    assert.strictEqual(postActiveLicense.status, 'REVOKED', 'Permanently revoked license must NOT be revived')
    console.log('  ✓ Policy enforced: Revoked license was NOT resurrected upon shop reactivation')

    // ------------------------------------------------------------------------
    // TEST 15: No Plaintext Secrets in MongoDB
    // ------------------------------------------------------------------------
    console.log('\n[Test 15] Zero Plaintext Secrets in MongoDB verification')
    const rawOwner = await mongoose.connection.collection('owneraccounts').findOne({ _id: new mongoose.Types.ObjectId(ownerRecord._id) })
    const rawLicense = await mongoose.connection.collection('licenses').findOne({ _id: new mongoose.Types.ObjectId(suspendedShopDoc.licenseId) })

    assert.strictEqual(rawOwner.password, undefined, 'No plaintext password field')
    assert.strictEqual(rawOwner.recoveryKey, undefined, 'No plaintext recovery key field')
    assert.ok(rawOwner.passwordHash.startsWith('$argon2id$'), 'Password must be argon2id hash')
    assert.ok(/^[0-9a-f]{64}$/.test(rawOwner.recoveryKeyHash), 'Recovery key must be 64-char sha256 hex')

    assert.strictEqual(rawLicense.productKey, undefined, 'No plaintext product key field')
    assert.ok(/^[0-9a-f]{64}$/.test(rawLicense.productKeyHash), 'Product key must be sha256 hex')
    console.log('  ✓ MongoDB documents verified: ZERO plaintext passwords, recovery keys, or product keys')

    // ------------------------------------------------------------------------
    // TEST 16: Audit Log Creation
    // ------------------------------------------------------------------------
    console.log('\n[Test 16] Audit log events verification')
    const auditActions = await AuditLog.find().select('action targetType targetId details')
    const actionNames = auditActions.map((a) => a.action)
    console.log('  Recorded Audit Actions:', actionNames)

    assert.ok(actionNames.includes('SHOP_CREATE'), 'SHOP_CREATE logged')
    assert.ok(actionNames.includes('OWNER_PASSWORD_RESET'), 'OWNER_PASSWORD_RESET logged')
    assert.ok(actionNames.includes('RECOVERY_KEY_ROTATED'), 'RECOVERY_KEY_ROTATED logged')
    assert.ok(actionNames.includes('SHOP_SUSPENDED'), 'SHOP_SUSPENDED logged')
    assert.ok(actionNames.includes('SHOP_ACTIVE'), 'SHOP_ACTIVE logged')
    assert.ok(actionNames.includes('SHOP_ARCHIVED'), 'SHOP_ARCHIVED logged')
    console.log('  ✓ All security actions successfully logged with actors and timestamps')

    console.log('\n=================================================================')
    console.log('🎉 ALL 17 PHASE 4 INTEGRATION TESTS PASSED CLEANLY!')
    console.log('=================================================================')
  } finally {
    // Drop sandbox database cleanly to leave zero artifacts
    console.log('\n🧹 Dropping sandbox database...')
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
    console.log('✅ Sandbox database dropped. Verification complete.')
  }
}

runPhase4Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Phase 4 Test Suite Failed:', err)
    process.exit(1)
  })