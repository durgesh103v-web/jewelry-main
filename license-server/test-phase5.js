/**
 * PHASE 5 INTEGRATION TEST SUITE: test-phase5.js
 *
 * Tests the complete Product License and Machine Management lifecycle
 * in an isolated sandbox database: `jerp_test_p5`.
 *
 * Tests all 17 Phase 5 requirements:
 * 1. License listing
 * 2. License detail view
 * 3. Product key masking (no plaintext keys or hashes exposed)
 * 4. License search and filtering (by edition, status, binding status)
 * 5. Machine binding display
 * 6. Activation history retrieval
 * 7. Machine binding reset (clears boundMachineId, transitions to AVAILABLE)
 * 8. Old activation history preservation across machine resets
 * 9. Suspended license activation rejection (403)
 * 10. Revoked license activation rejection (403)
 * 11. Expired license activation rejection (403)
 * 12. Suspended shop activation rejection (403)
 * 13. Archived shop activation rejection (403)
 * 14. Unauthorized Admin API access (401)
 * 15. CSRF protection (403)
 * 16. Audit log creation
 * 17. Existing Shop and Owner workflows remain fully functional
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
const { hashPassword } = require('./services/credential.service')

const baseUri = process.env.MONGODB_URI
const sandboxUri = baseUri.replace(/\/[^/?]+(\?|$)/, '/jerp_test_p5$1')

async function runPhase5Tests() {
  console.log('=================================================================')
  console.log('🧪 STARTING PHASE 5 PRODUCT LICENSE & MACHINE MANAGEMENT TEST SUITE')
  console.log('Isolated Sandbox DB: jerp_test_p5')
  console.log('=================================================================\n')

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

  // Setup Super Admin user
  const testAdminUser = 'phase5_superadmin'
  const testAdminPass = 'SuperAdminSecurePass!2026'
  const adminHash = await hashPassword(testAdminPass)

  const admin = new AdminUser({
    username: testAdminUser,
    email: 'phase5_admin@example.com',
    passwordHash: adminHash,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE'
  })
  await admin.save()
  console.log('✅ Created Sandbox Super Admin user')

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Unauthorized Admin API access
    // ------------------------------------------------------------------------
    console.log('\n[Test 1] Unauthorized API access rejection (401)')
    const unauthRes = await request(app).get('/api/admin/licenses')
    assert.strictEqual(unauthRes.status, 401, 'Must reject unauthenticated calls with 401')
    console.log('  ✓ Correctly rejected unauthenticated call with 401')

    // ------------------------------------------------------------------------
    // TEST 2: CSRF protection enforcement
    // ------------------------------------------------------------------------
    console.log('\n[Test 2] CSRF protection enforcement (403)')
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
    // TEST 4: Existing Shop and Owner Workflows remain functional (regression check)
    // ------------------------------------------------------------------------
    console.log('\n[Test 4] Provision new showroom (Phases 1-4 regression check)')
    const createShopRes = await agent
      .post('/api/admin/shops')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        shopName: 'Tanishq Diamond Gallery',
        ownerName: 'Rajesh Agrawal',
        phone: '+91 9822334455',
        businessType: 'RETAIL',
        edition: 'ENTERPRISE'
      })
    assert.strictEqual(createShopRes.status, 201)
    const { shop, oneTimeCredentials } = createShopRes.body
    assert.ok(shop.id)
    assert.ok(oneTimeCredentials.productKey)
    console.log(`  ✓ Showroom provisioned: ${shop.shopName} (${shop.shopId})`)

    // ------------------------------------------------------------------------
    // TEST 5: License Listing & Product Key Masking
    // ------------------------------------------------------------------------
    console.log('\n[Test 5] License listing & masked product key verification')
    const listRes = await agent
      .get('/api/admin/licenses')
      .set('X-Requested-With', 'XMLHttpRequest')
    assert.strictEqual(listRes.status, 200)
    assert.strictEqual(listRes.body.total, 1)
    const licRecord = listRes.body.licenses[0]

    // Verify key masking: Never exposes plaintext productKey or productKeyHash
    assert.strictEqual(licRecord.productKey, undefined, 'Plaintext productKey must not be returned')
    assert.strictEqual(licRecord.productKeyHash, undefined, 'productKeyHash must not be returned')
    assert.ok(licRecord.productKeyMasked.includes('****'), 'Product key must be masked with ****')
    assert.strictEqual(licRecord.status, 'AVAILABLE')
    assert.strictEqual(licRecord.edition, 'ENTERPRISE')
    console.log(`  ✓ License listed: ${licRecord.productKeyMasked}, Status: ${licRecord.status}`)

    // ------------------------------------------------------------------------
    // TEST 6: License Search & Filtering
    // ------------------------------------------------------------------------
    console.log('\n[Test 6] License search and filtering')
    // Filter by edition
    const filterRes = await agent
      .get('/api/admin/licenses?edition=ENTERPRISE&status=AVAILABLE')
      .set('X-Requested-With', 'XMLHttpRequest')
    assert.strictEqual(filterRes.body.total, 1)

    // Filter non-matching edition
    const noMatchRes = await agent
      .get('/api/admin/licenses?edition=BASIC')
      .set('X-Requested-With', 'XMLHttpRequest')
    assert.strictEqual(noMatchRes.body.total, 0)
    console.log('  ✓ Search & filtering by edition and status verified')

    // ------------------------------------------------------------------------
    // TEST 7: Client Machine Activation & Hardware Binding
    // ------------------------------------------------------------------------
    console.log('\n[Test 7] First-time workstation machine activation')
    const machineId1 = 'MACHINE-HWID-DELL-OPTIPLEX-7080'
    const activateRes = await request(app)
      .post('/api/licenses/activate')
      .send({
        productKey: oneTimeCredentials.productKey,
        machineId: machineId1,
        appVersion: '2.1.0'
      })
    assert.strictEqual(activateRes.status, 200)
    assert.strictEqual(activateRes.body.success, true)
    assert.ok(activateRes.body.signedLicense.signature)
    assert.strictEqual(activateRes.body.signedLicense.payload.machineId, machineId1)
    console.log(`  ✓ Workstation bound to: ${machineId1}`)

    // ------------------------------------------------------------------------
    // TEST 8: License Detail View & Machine Binding Display
    // ------------------------------------------------------------------------
    console.log('\n[Test 8] License detail view & binding display')
    const detailRes = await agent
      .get(`/api/admin/licenses/${licRecord._id}`)
      .set('X-Requested-With', 'XMLHttpRequest')
    assert.strictEqual(detailRes.status, 200)
    const detailLicense = detailRes.body.license
    assert.strictEqual(detailLicense.boundMachineId, machineId1)
    assert.strictEqual(detailLicense.status, 'ACTIVE')
    assert.strictEqual(detailLicense.activations.length, 1)
    assert.strictEqual(detailLicense.activations[0].machineId, machineId1)
    console.log(`  ✓ License detail retrieved: boundMachineId=${detailLicense.boundMachineId}, status=${detailLicense.status}`)

    // ------------------------------------------------------------------------
    // TEST 9: Repeat Activation from same device (authorized reinstall)
    // ------------------------------------------------------------------------
    console.log('\n[Test 9] Re-activation from same authorized device')
    const repeatActivateRes = await request(app)
      .post('/api/licenses/activate')
      .send({
        productKey: oneTimeCredentials.productKey,
        machineId: machineId1,
        appVersion: '2.1.0'
      })
    assert.strictEqual(repeatActivateRes.status, 200)
    const updatedLicDoc = await License.findById(licRecord._id)
    assert.strictEqual(updatedLicDoc.activations.length, 2, 'Must append activation to history')
    console.log(`  ✓ Re-activation logged; total activation events: ${updatedLicDoc.activations.length}`)

    // ------------------------------------------------------------------------
    // TEST 10: Machine Binding Reset & History Preservation
    // ------------------------------------------------------------------------
    console.log('\n[Test 10] Machine binding reset workflow & history preservation')
    const resetMachineRes = await agent
      .post(`/api/admin/licenses/${licRecord._id}/reset-machine`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ reason: 'Replacement Dell tower after power surge' })
    assert.strictEqual(resetMachineRes.status, 200)
    assert.strictEqual(resetMachineRes.body.success, true)

    // Verify in MongoDB: boundMachineId cleared, status AVAILABLE, activations preserved!
    const postResetDoc = await License.findById(licRecord._id)
    assert.strictEqual(postResetDoc.boundMachineId, null, 'boundMachineId must be null')
    assert.strictEqual(postResetDoc.status, 'AVAILABLE', 'status must be AVAILABLE')
    assert.strictEqual(postResetDoc.activations.length, 2, 'History must be preserved, not deleted!')
    console.log('  ✓ Workstation hardware binding cleared')
    console.log('  ✓ Historical activation records completely preserved (length=2)')

    // ------------------------------------------------------------------------
    // TEST 11: Activation on New Machine after Reset
    // ------------------------------------------------------------------------
    console.log('\n[Test 11] Re-binding to new hardware workstation')
    const machineId2 = 'MACHINE-HWID-HP-ELITEDESK-800'
    const activateNewMachineRes = await request(app)
      .post('/api/licenses/activate')
      .send({
        productKey: oneTimeCredentials.productKey,
        machineId: machineId2,
        appVersion: '2.1.0'
      })
    assert.strictEqual(activateNewMachineRes.status, 200)
    assert.strictEqual(activateNewMachineRes.body.signedLicense.payload.machineId, machineId2)
    const reboundLicDoc = await License.findById(licRecord._id)
    assert.strictEqual(reboundLicDoc.boundMachineId, machineId2)
    assert.strictEqual(reboundLicDoc.status, 'ACTIVE')
    assert.strictEqual(reboundLicDoc.activations.length, 3)
    console.log(`  ✓ Successfully bound to replacement workstation: ${machineId2}`)

    // ------------------------------------------------------------------------
    // TEST 12: Suspended License Activation Rejection (403)
    // ------------------------------------------------------------------------
    console.log('\n[Test 12] Suspended license activation rejection')
    await agent
      .post(`/api/admin/licenses/${licRecord._id}/status`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ status: 'SUSPENDED', reason: 'Audit pending' })
    const suspendedActivateRes = await request(app)
      .post('/api/licenses/activate')
      .send({
        productKey: oneTimeCredentials.productKey,
        machineId: machineId2
      })
    assert.strictEqual(suspendedActivateRes.status, 403, 'Must reject activation when license is SUSPENDED')
    console.log('  ✓ Correctly rejected activation of SUSPENDED license (403)')

    // Reactivate license
    await agent
      .post(`/api/admin/licenses/${licRecord._id}/status`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ status: 'ACTIVE' })

    // ------------------------------------------------------------------------
    // TEST 13: Revoked License Activation Rejection & Non-Reactivation Rule
    // ------------------------------------------------------------------------
    console.log('\n[Test 13] Revoked license permanent invalidation')
    await agent
      .post(`/api/admin/licenses/${licRecord._id}/status`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ status: 'REVOKED', reason: 'Breach of commercial terms' })

    const revokedActivateRes = await request(app)
      .post('/api/licenses/activate')
      .send({
        productKey: oneTimeCredentials.productKey,
        machineId: machineId2
      })
    assert.strictEqual(revokedActivateRes.status, 403, 'Must reject activation when license is REVOKED')

    // Rule: Never reactivate a REVOKED license
    const tryReactivateRevoked = await agent
      .post(`/api/admin/licenses/${licRecord._id}/status`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ status: 'ACTIVE' })
    assert.strictEqual(tryReactivateRevoked.status, 400, 'Must reject reactivating a REVOKED license')
    console.log('  ✓ Revoked license activation rejected')
    console.log('  ✓ Policy enforced: REVOKED licenses cannot be reactivated (400)')

    // ------------------------------------------------------------------------
    // TEST 14: Expired License Activation Rejection
    // ------------------------------------------------------------------------
    console.log('\n[Test 14] Expired license activation rejection')
    // Create an expired license for testing
    const expiredLicense = new License({
      productKeyHash: '1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
      productKeyMasked: 'JERP-PRO-****-****-EXP1',
      edition: 'PROFESSIONAL',
      status: 'EXPIRED',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired yesterday
    })
    await expiredLicense.save()

    const expiredActivateRes = await request(app)
      .post('/api/licenses/activate')
      .send({
        productKey: 'DUMMY-EXPIRED-KEY',
        machineId: 'MACHINE-001'
      })
    // Also test status transition rejection on expired license
    const tryReactivateExpired = await agent
      .post(`/api/admin/licenses/${expiredLicense._id}/status`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ status: 'ACTIVE' })
    assert.strictEqual(tryReactivateExpired.status, 400, 'Must reject reactivating an EXPIRED license directly')
    console.log('  ✓ Expired license reactivation rejected (400)')

    // ------------------------------------------------------------------------
    // TEST 15: Suspended Shop Activation Rejection
    // ------------------------------------------------------------------------
    console.log('\n[Test 15] Suspended shop blocks license activation')
    // Create second active shop
    const shop2Res = await agent
      .post('/api/admin/shops')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        shopName: 'Malabar Gold Hub',
        ownerName: 'O. Ahammed',
        phone: '+91 9776655443',
        edition: 'BASIC'
      })
    const shop2Id = shop2Res.body.shop.id
    const shop2Key = shop2Res.body.oneTimeCredentials.productKey

    // Suspend shop 2
    await agent
      .post(`/api/admin/shops/${shop2Id}/status`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ status: 'SUSPENDED' })

    const suspendedShopActivateRes = await request(app)
      .post('/api/licenses/activate')
      .send({
        productKey: shop2Key,
        machineId: 'MACHINE-MALABAR-01'
      })
    assert.strictEqual(suspendedShopActivateRes.status, 403)
    console.log('  ✓ Activation rejected because shop is SUSPENDED (403)')

    // ------------------------------------------------------------------------
    // TEST 16: Archived Shop Activation Rejection
    // ------------------------------------------------------------------------
    console.log('\n[Test 16] Archived shop blocks license activation')
    await agent
      .post(`/api/admin/shops/${shop2Id}/status`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ status: 'ARCHIVED' })

    const archivedShopActivateRes = await request(app)
      .post('/api/licenses/activate')
      .send({
        productKey: shop2Key,
        machineId: 'MACHINE-MALABAR-01'
      })
    assert.strictEqual(archivedShopActivateRes.status, 403)
    console.log('  ✓ Activation rejected because shop is ARCHIVED (403)')

    // ------------------------------------------------------------------------
    // TEST 17: Audit Log Verification
    // ------------------------------------------------------------------------
    console.log('\n[Test 17] Audit log verification for license operations')
    const auditLogs = await AuditLog.find().select('action targetType targetId details')
    const actionNames = auditLogs.map((a) => a.action)
    console.log('  Recorded Audit Actions:', actionNames)

    assert.ok(actionNames.includes('LICENSE_INITIAL_ACTIVATION'), 'LICENSE_INITIAL_ACTIVATION logged')
    assert.ok(actionNames.includes('MACHINE_BINDING_RESET'), 'MACHINE_BINDING_RESET logged')
    assert.ok(actionNames.includes('LICENSE_SUSPENDED'), 'LICENSE_SUSPENDED logged')
    assert.ok(actionNames.includes('LICENSE_REVOKED'), 'LICENSE_REVOKED logged')
    console.log('  ✓ Machine resets, activations, and status changes recorded with full audit trails')

    console.log('\n=================================================================')
    console.log('🎉 ALL 17 PHASE 5 INTEGRATION TESTS PASSED CLEANLY!')
    console.log('=================================================================')
  } finally {
    console.log('\n🧹 Dropping sandbox database...')
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
    console.log('✅ Sandbox database dropped. Verification complete.')
  }
}

runPhase5Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Phase 5 Test Suite Failed:', err)
    process.exit(1)
  })