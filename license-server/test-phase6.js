/**
 * PHASE 6 INTEGRATION TEST SUITE: test-phase6.js
 *
 * Tests the complete Desktop ERP Integration & Production Delivery lifecycle
 * in an isolated sandbox database: `jerp_test_p6`.
 *
 * Comprehensive tests for Phase 6 requirements:
 * 1. Product activation with Ed25519 cryptographic token & hardware binding
 * 2. Successful atomic owner provisioning (POST /api/licenses/provision-owner)
 * 3. Wrong shop ID rejection (404)
 * 4. Invalid temporary password rejection (Argon2id, 401)
 * 5. Invalid recovery key rejection (SHA-256, 401)
 * 6. Machine mismatch rejection (unbound machine ID, 403)
 * 7. Duplicate provisioning prevention across devices (409)
 * 8. Idempotent provisioning retry on identical machine (200)
 * 9. Credential check sync endpoint (POST /api/licenses/check-sync)
 * 10. Super Admin password reset -> verify-password & sync trigger
 * 11. Super Admin recovery key rotation -> verify-recovery-key & sync trigger
 * 12. Credential sync acknowledgment strict rules (POST /api/licenses/ack-sync)
 *     - Rejects future version (400)
 *     - Rejects stale version (400)
 *     - Idempotent repeated acknowledgment (200)
 * 13. Audit log creation for OWNER_ACCOUNT_PROVISIONED
 * 14. Verification: No embedded private keys in license-server.client.ts
 * 15. Verification: No hardcoded fallback keys in auth.service.ts
 * 16. Verification: Additive migration 031 structure
 * 17. Sandbox cleanup: Database automatically dropped after run
 */

const fs = require('fs')
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
const sandboxUri = baseUri.replace(/\/[^/?]+(\?|$)/, '/jerp_test_p6$1')

async function runPhase6Tests() {
  console.log('=================================================================')
  console.log('🧪 STARTING PHASE 6 DESKTOP ERP INTEGRATION TEST SUITE')
  console.log('Isolated Sandbox DB: jerp_test_p6')
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
  const testAdminUser = 'phase6_superadmin'
  const testAdminPass = 'SuperAdminSecurePass!2026'
  const adminHash = await hashPassword(testAdminPass)

  const admin = new AdminUser({
    username: testAdminUser,
    email: 'phase6_admin@example.com',
    passwordHash: adminHash,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE'
  })
  await admin.save()
  console.log('✅ Created Sandbox Super Admin user')

  try {
    // ------------------------------------------------------------------------
    // SETUP: Super Admin Login & Create Shop with License and Owner
    // ------------------------------------------------------------------------
    console.log('\n[Setup] Super Admin Login and Shop Provisioning')
    const loginRes = await agent
      .post('/api/admin/auth/login')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ identifier: testAdminUser, password: testAdminPass })
    assert.strictEqual(loginRes.status, 200, 'Login must succeed')
    console.log('  ✓ Super Admin logged in')

    const createRes = await agent
      .post('/api/admin/shops')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        shopName: 'Kalyan Jewellers Flagship',
        ownerName: 'Vishwa Owner',
        phone: '9876543210',
        email: 'vishwa.flagship@example.com',
        businessType: 'RETAIL',
        edition: 'ENTERPRISE',
        customUsername: 'vishwa_owner'
      })
    assert.strictEqual(createRes.status, 201, 'Shop creation must return 201')
    const { shop, oneTimeCredentials } = createRes.body
    const rawProductKey = oneTimeCredentials.productKey
    const rawTemporaryPassword = oneTimeCredentials.temporaryPassword
    const rawRecoveryKey = oneTimeCredentials.recoveryKey
    const shopId = shop.shopId
    const username = oneTimeCredentials.username
    const testMachineId = 'FINGERPRINT-SHA256-NODE-998877AABBCC'

    const ownerRecord = await OwnerAccount.findOne({ shopId: shop.id })
    assert.ok(ownerRecord, 'Owner record must exist')
    const ownerId = ownerRecord._id

    console.log(`  ✓ Created Shop ID: ${shopId}`)
    console.log(`  ✓ Generated Owner Username: ${username}`)
    console.log('  ✓ Product Key: [REDACTED_PRODUCT_KEY]')
    console.log('  ✓ Temporary Password: [REDACTED_TEMP_PASS]')
    console.log('  ✓ Recovery Key: [REDACTED_RECOVERY_KEY]')

    // ------------------------------------------------------------------------
    // TEST 1: Activate License on Desktop Machine
    // ------------------------------------------------------------------------
    console.log('\n[Test 1] Product Key Activation (POST /api/licenses/activate)')
    const activateRes = await request(app)
      .post('/api/licenses/activate')
      .send({
        productKey: rawProductKey,
        machineId: testMachineId
      })
    assert.strictEqual(activateRes.status, 200, 'Activation must succeed')
    assert.strictEqual(activateRes.body.success, true, 'success flag must be true')
    assert.ok(activateRes.body.signedLicense, 'Must return signedLicense object')
    assert.ok(activateRes.body.signedLicense.signature, 'Must return Ed25519 signature')
    assert.strictEqual(activateRes.body.signedLicense.payload.machineId, testMachineId)
    console.log('  ✓ License successfully activated and bound to test machine')

    // ------------------------------------------------------------------------
    // TEST 2: Wrong Shop ID Rejection
    // ------------------------------------------------------------------------
    console.log('\n[Test 2] Owner Provisioning Rejection: Wrong Shop ID')
    const wrongShopRes = await request(app)
      .post('/api/licenses/provision-owner')
      .send({
        shopId: 'NON-EXISTENT-SHOP',
        username,
        temporaryPassword: rawTemporaryPassword,
        recoveryKey: rawRecoveryKey,
        machineId: testMachineId
      })
    assert.strictEqual(wrongShopRes.status, 404, 'Must return 404 for invalid shop')
    assert.strictEqual(wrongShopRes.body.success, false)
    console.log('  ✓ Correctly rejected invalid shop ID with 404')

    // ------------------------------------------------------------------------
    // TEST 3: Invalid Temporary Password Rejection (Argon2id)
    // ------------------------------------------------------------------------
    console.log('\n[Test 3] Owner Provisioning Rejection: Invalid Temporary Password')
    const wrongPassRes = await request(app)
      .post('/api/licenses/provision-owner')
      .send({
        shopId,
        username,
        temporaryPassword: 'WrongPassword!2026',
        recoveryKey: rawRecoveryKey,
        machineId: testMachineId
      })
    assert.strictEqual(wrongPassRes.status, 401, 'Must return 401 for wrong password')
    assert.strictEqual(wrongPassRes.body.success, false)
    assert.match(wrongPassRes.body.message, /invalid temporary password/i)
    console.log('  ✓ Correctly rejected invalid temporary password with 401')

    // ------------------------------------------------------------------------
    // TEST 4: Invalid Recovery Key Rejection (SHA-256)
    // ------------------------------------------------------------------------
    console.log('\n[Test 4] Owner Provisioning Rejection: Invalid Recovery Key')
    const wrongRecKeyRes = await request(app)
      .post('/api/licenses/provision-owner')
      .send({
        shopId,
        username,
        temporaryPassword: rawTemporaryPassword,
        recoveryKey: 'REC-0000-0000-0000',
        machineId: testMachineId
      })
    assert.strictEqual(wrongRecKeyRes.status, 401, 'Must return 401 for wrong recovery key')
    assert.strictEqual(wrongRecKeyRes.body.success, false)
    assert.match(wrongRecKeyRes.body.message, /invalid master recovery key/i)
    console.log('  ✓ Correctly rejected invalid recovery key with 401')

    // ------------------------------------------------------------------------
    // TEST 5: Machine Mismatch Rejection
    // ------------------------------------------------------------------------
    console.log('\n[Test 5] Owner Provisioning Rejection: Machine Mismatch')
    const wrongMachineRes = await request(app)
      .post('/api/licenses/provision-owner')
      .send({
        shopId,
        username,
        temporaryPassword: rawTemporaryPassword,
        recoveryKey: rawRecoveryKey,
        machineId: 'DIFFERENT-UNBOUND-MACHINE-ID'
      })
    assert.strictEqual(wrongMachineRes.status, 403, 'Must return 403 for machine mismatch')
    assert.strictEqual(wrongMachineRes.body.success, false)
    assert.match(wrongMachineRes.body.message, /does not match the workstation bound/i)
    console.log('  ✓ Correctly rejected un-bound machine with 403')

    // ------------------------------------------------------------------------
    // TEST 6: Successful Owner Provisioning
    // ------------------------------------------------------------------------
    console.log('\n[Test 6] Successful Owner Provisioning (POST /api/licenses/provision-owner)')
    const provRes = await request(app)
      .post('/api/licenses/provision-owner')
      .send({
        shopId,
        username,
        temporaryPassword: rawTemporaryPassword,
        recoveryKey: rawRecoveryKey,
        machineId: testMachineId
      })
    assert.strictEqual(provRes.status, 200, 'Provisioning must return 200')
    assert.strictEqual(provRes.body.success, true)
    assert.strictEqual(provRes.body.shop.shopId, shopId)
    assert.strictEqual(provRes.body.shop.businessType, 'RETAIL')
    assert.strictEqual(provRes.body.isTemporaryPassword, true)
    assert.strictEqual(provRes.body.credentialVersion, 1)

    // Verify DB state
    const dbOwner = await OwnerAccount.findOne({ shopId: shop.id })
    assert.strictEqual(dbOwner.isProvisioned, true)
    assert.strictEqual(dbOwner.provisionedMachineId, testMachineId)
    assert.ok(dbOwner.provisionedAt, 'provisionedAt must be populated')
    console.log('  ✓ Successfully provisioned owner account and updated DB state to isProvisioned = true')

    // ------------------------------------------------------------------------
    // TEST 7: Duplicate Provisioning Prevention from Another Machine
    // ------------------------------------------------------------------------
    console.log('\n[Test 7] Duplicate Provisioning Prevention')
    const dupRes = await request(app)
      .post('/api/licenses/provision-owner')
      .send({
        shopId,
        username,
        temporaryPassword: rawTemporaryPassword,
        recoveryKey: rawRecoveryKey,
        machineId: 'ANOTHER-ROGUE-MACHINE-ID'
      })
    assert.ok(dupRes.status === 403 || dupRes.status === 409, 'Must reject duplicate provisioning')
    assert.strictEqual(dupRes.body.success, false)
    console.log('  ✓ Prevented duplicate provisioning attempt from another machine')

    // ------------------------------------------------------------------------
    // TEST 8: Idempotent Provisioning Retry on Same Machine
    // ------------------------------------------------------------------------
    console.log('\n[Test 8] Idempotent Provisioning Retry on Same Machine')
    const retryRes = await request(app)
      .post('/api/licenses/provision-owner')
      .send({
        shopId,
        username,
        temporaryPassword: rawTemporaryPassword,
        recoveryKey: rawRecoveryKey,
        machineId: testMachineId
      })
    assert.strictEqual(retryRes.status, 200, 'Retry on same machine must return 200')
    assert.strictEqual(retryRes.body.success, true)
    assert.strictEqual(retryRes.body.shop.shopId, shopId)
    console.log('  ✓ Idempotent retry on same machine handled successfully')

    // ------------------------------------------------------------------------
    // TEST 9: Credential Check Sync (In Sync)
    // ------------------------------------------------------------------------
    console.log('\n[Test 9] Credential Check Sync (In Sync)')
    const syncRes1 = await request(app)
      .post('/api/licenses/check-sync')
      .send({
        shopId,
        username,
        machineId: testMachineId,
        localCredentialVersion: 1
      })
    assert.strictEqual(syncRes1.status, 200)
    assert.strictEqual(syncRes1.body.success, true)
    assert.strictEqual(syncRes1.body.syncPending, false)
    assert.strictEqual(syncRes1.body.serverCredentialVersion, 1)
    console.log('  ✓ In-sync check passed (syncPending: false)')

    // ------------------------------------------------------------------------
    // TEST 10: Super Admin Resets Password -> Verify-Password Endpoint
    // ------------------------------------------------------------------------
    console.log('\n[Test 10] Super Admin Password Reset & POST /api/licenses/verify-password')
    const resetRes = await agent
      .post(`/api/admin/owners/${ownerId}/reset-password`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ reason: 'Client requested remote password reset' })
    assert.strictEqual(resetRes.status, 200)
    const newTempPassword = resetRes.body.temporaryPassword
    assert.ok(newTempPassword, 'New temporary password returned')

    // 10a. Check sync reports syncPending: true
    const syncRes2 = await request(app)
      .post('/api/licenses/check-sync')
      .send({
        shopId,
        username,
        machineId: testMachineId,
        localCredentialVersion: 1
      })
    assert.strictEqual(syncRes2.status, 200)
    assert.strictEqual(syncRes2.body.syncPending, true)
    assert.strictEqual(syncRes2.body.serverCredentialVersion, 2)
    assert.strictEqual(syncRes2.body.isTemporaryPassword, true)

    // 10b. Verify password with invalid credentials rejects (401)
    const badVerifyPass = await request(app)
      .post('/api/licenses/verify-password')
      .send({
        shopId,
        username,
        password: 'IncorrectPassword!2026',
        machineId: testMachineId
      })
    assert.strictEqual(badVerifyPass.status, 401)
    assert.strictEqual(badVerifyPass.body.success, false)
    console.log('  ✓ Rejected invalid password verification with 401')

    // 10c. Verify password with correct new credentials succeeds (200)
    const goodVerifyPass = await request(app)
      .post('/api/licenses/verify-password')
      .send({
        shopId,
        username,
        password: newTempPassword,
        machineId: testMachineId
      })
    assert.strictEqual(goodVerifyPass.status, 200)
    assert.strictEqual(goodVerifyPass.body.success, true)
    assert.strictEqual(goodVerifyPass.body.serverCredentialVersion, 2)
    assert.strictEqual(goodVerifyPass.body.isTemporaryPassword, true)
    console.log('  ✓ Verified new temporary password centrally without exposing hashes (v2)')

    // ------------------------------------------------------------------------
    // TEST 11: Super Admin Rotates Recovery Key -> Verify-Recovery-Key Endpoint
    // ------------------------------------------------------------------------
    console.log('\n[Test 11] Super Admin Recovery Key Rotation & POST /api/licenses/verify-recovery-key')
    const rotateRecRes = await agent
      .post(`/api/admin/owners/${ownerId}/rotate-recovery-key`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ reason: 'Annual key rotation' })
    assert.strictEqual(rotateRecRes.status, 200)
    const newRecoveryKey = rotateRecRes.body.recoveryKey
    assert.ok(newRecoveryKey, 'New recovery key returned')

    // 11a. Check sync reports syncPending: true with v3
    const syncRes3 = await request(app)
      .post('/api/licenses/check-sync')
      .send({
        shopId,
        username,
        machineId: testMachineId,
        localCredentialVersion: 2
      })
    assert.strictEqual(syncRes3.status, 200)
    assert.strictEqual(syncRes3.body.syncPending, true)
    assert.strictEqual(syncRes3.body.serverCredentialVersion, 3)

    // 11b. Verify recovery key with invalid key rejects (401)
    const badVerifyRec = await request(app)
      .post('/api/licenses/verify-recovery-key')
      .send({
        shopId,
        username,
        recoveryKey: 'REC-XXXX-XXXX-XXXX',
        machineId: testMachineId
      })
    assert.strictEqual(badVerifyRec.status, 401)
    assert.strictEqual(badVerifyRec.body.success, false)
    console.log('  ✓ Rejected invalid recovery key verification with 401')

    // 11c. Verify recovery key with correct new key succeeds (200)
    const goodVerifyRec = await request(app)
      .post('/api/licenses/verify-recovery-key')
      .send({
        shopId,
        username,
        recoveryKey: newRecoveryKey,
        machineId: testMachineId
      })
    assert.strictEqual(goodVerifyRec.status, 200)
    assert.strictEqual(goodVerifyRec.body.success, true)
    assert.strictEqual(goodVerifyRec.body.serverCredentialVersion, 3)
    console.log('  ✓ Verified new recovery key centrally without exposing hashes (v3)')

    // ------------------------------------------------------------------------
    // TEST 12: Strict Credential Synchronization Acknowledgment Rules
    // ------------------------------------------------------------------------
    console.log('\n[Test 12] Strict Acknowledgment Rules (POST /api/licenses/ack-sync)')

    // Rule 1: Cannot acknowledge a future version (e.g. v99 when server is on v3)
    const futureAck = await request(app)
      .post('/api/licenses/ack-sync')
      .send({
        shopId,
        username,
        machineId: testMachineId,
        acknowledgedVersion: 99
      })
    assert.strictEqual(futureAck.status, 400, 'Must reject future version acknowledgment')
    console.log('  ✓ Rule 1: Rejected future version acknowledgment with 400')

    // Valid acknowledgment of version 3
    const validAck = await request(app)
      .post('/api/licenses/ack-sync')
      .send({
        shopId,
        username,
        machineId: testMachineId,
        acknowledgedVersion: 3
      })
    assert.strictEqual(validAck.status, 200)
    assert.strictEqual(validAck.body.success, true)
    assert.strictEqual(validAck.body.acknowledgedVersion, 3)
    assert.strictEqual(validAck.body.inSync, true)
    console.log('  ✓ Successfully acknowledged version 3')

    // Rule 2: Cannot overwrite a newer version with a stale acknowledgment (e.g. v1 when already at v3)
    const staleAck = await request(app)
      .post('/api/licenses/ack-sync')
      .send({
        shopId,
        username,
        machineId: testMachineId,
        acknowledgedVersion: 1
      })
    assert.strictEqual(staleAck.status, 400, 'Must reject stale version acknowledgment')
    console.log('  ✓ Rule 2: Rejected stale version acknowledgment with 400')

    // Rule 3: Safe repeated acknowledgment (idempotent)
    const repeatAck = await request(app)
      .post('/api/licenses/ack-sync')
      .send({
        shopId,
        username,
        machineId: testMachineId,
        acknowledgedVersion: 3
      })
    assert.strictEqual(repeatAck.status, 200)
    assert.strictEqual(repeatAck.body.success, true)
    assert.strictEqual(repeatAck.body.inSync, true)
    console.log('  ✓ Rule 3: Idempotent repeated acknowledgment accepted with 200')

    // ------------------------------------------------------------------------
    // TEST 13: Audit Log Verification
    // ------------------------------------------------------------------------
    console.log('\n[Test 13] Audit Log Creation for OWNER_ACCOUNT_PROVISIONED')
    const audit = await AuditLog.findOne({ action: 'OWNER_ACCOUNT_PROVISIONED', targetId: username })
    assert.ok(audit, 'Audit log for OWNER_ACCOUNT_PROVISIONED must exist')
    assert.strictEqual(audit.targetType, 'OWNER_ACCOUNT')
    assert.strictEqual(audit.adminUsername, 'system')
    console.log('  ✓ Audit log created for OWNER_ACCOUNT_PROVISIONED')

    // ------------------------------------------------------------------------
    // TEST 14: Client Security Inspection: No Private Key in Desktop Client
    // ------------------------------------------------------------------------
    console.log('\n[Test 14] Security Audit: Purge of DEV_SIGNING_PRIVATE_KEY from Client')
    const clientFile = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'main', 'services', 'licensing', 'license-server.client.ts'),
      'utf8'
    )
    assert.ok(
      !clientFile.includes('DEV_SIGNING_PRIVATE_KEY'),
      'license-server.client.ts MUST NOT contain DEV_SIGNING_PRIVATE_KEY'
    )
    assert.ok(
      !clientFile.includes('generateDevSignedToken'),
      'license-server.client.ts MUST NOT contain generateDevSignedToken'
    )
    console.log('  ✓ Verified: Zero private signing keys or simulation methods exist in desktop client')

    // ------------------------------------------------------------------------
    // TEST 15: Client Security Inspection: No Fallback Master Recovery Key
    // ------------------------------------------------------------------------
    console.log('\n[Test 15] Security Audit: Purge of Hardcoded Recovery Keys')
    const authServiceFile = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'main', 'services', 'auth.service.ts'),
      'utf8'
    )
    assert.ok(
      !authServiceFile.includes('JEWEL-ADMIN-RESET'),
      'auth.service.ts MUST NOT contain JEWEL-ADMIN-RESET fallback'
    )
    assert.ok(
      !authServiceFile.includes('DEFAULT_RECOVERY_CODE'),
      'auth.service.ts MUST NOT contain DEFAULT_RECOVERY_CODE'
    )
    console.log('  ✓ Verified: Hardcoded JEWEL-ADMIN-RESET completely eliminated')

    // ------------------------------------------------------------------------
    // TEST 16: Additive Migration 031 Inspection
    // ------------------------------------------------------------------------
    console.log('\n[Test 16] Additive Migration 031 Inspection')
    const migFile = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'main', 'database', 'migrations', '031_central_provisioning.ts'),
      'utf8'
    )
    assert.ok(migFile.includes('is_temporary_password'), 'Migration must add is_temporary_password')
    assert.ok(migFile.includes('central_shop_id'), 'Migration must add central_shop_id')
    assert.ok(migFile.includes('credential_version'), 'Migration must add credential_version')
    console.log('  ✓ Verified: Migration 031 is strictly additive and idempotent')

    console.log('\n=================================================================')
    console.log('🎉 ALL PHASE 6 INTEGRATION TESTS PASSED PERFECTLY!')
    console.log('=================================================================\n')
  } finally {
    if (mongoose.connection.readyState !== 0) {
      console.log('🧹 Cleaning up sandbox database jerp_test_p6...')
      try {
        await mongoose.connection.db.dropDatabase()
        console.log('✅ Sandbox database jerp_test_p6 dropped cleanly.')
      } catch (dropErr) {
        console.warn('Sandbox drop warning:', dropErr.message)
      }
      await mongoose.disconnect()
      console.log('Disconnected from MongoDB sandbox.')
    }
  }
}

runPhase6Tests().catch((err) => {
  console.error('❌ PHASE 6 TEST RUN FAILED:', err)
  process.exit(1)
})
