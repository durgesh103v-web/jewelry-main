const assert = require('assert')
const {
  hashSecretKey,
  hashPassword,
  verifyPassword,
  generateProductKey,
  generateRecoveryKey,
  generateTemporaryPassword,
  generateShopId,
  generateSuggestedUsername
} = require('./services/credential.service')

async function runTests() {
  console.log('🧪 Running Phase 1 Unit Tests...')

  // Test 1: Argon2id password hashing and verification
  console.log('Test 1: Argon2id password hashing & verification');
  const rawPass = 'SecureShowroomSecret!2026'
  const hash = await hashPassword(rawPass)
  assert(hash.startsWith('$argon2id$'), 'Hash should be Argon2id')
  const isValid = await verifyPassword(hash, rawPass)
  assert.strictEqual(isValid, true, 'Correct password must verify')
  const isInvalid = await verifyPassword(hash, 'WrongPassword123')
  assert.strictEqual(isInvalid, false, 'Wrong password must be rejected')
  console.log('  ✅ Passed');

  // Test 2: Product Key generation format
  console.log('Test 2: Product Key generation format');
  const proKey = generateProductKey('PROFESSIONAL')
  assert(/^JERP-PRO-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/.test(proKey), `Key failed regex: ${proKey}`)
  const entKey = generateProductKey('ENTERPRISE')
  assert(entKey.startsWith('JERP-ENT-'), `Enterprise key should start with JERP-ENT-: ${entKey}`)
  console.log('  ✅ Passed');

  // Test 3: Master Recovery Key format
  console.log('Test 3: Master Recovery Key format');
  const recKey = generateRecoveryKey()
  assert(/^REC-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/.test(recKey), `Recovery key failed regex: ${recKey}`)
  console.log('  ✅ Passed');

  // Test 4: Temporary password length and entropy
  console.log('Test 4: Temporary password entropy');
  const tempPass = generateTemporaryPassword()
  assert.strictEqual(tempPass.length, 12, 'Temporary password should be 12 chars')
  console.log('  ✅ Passed');

  // Test 5: Secret key deterministic SHA-256 hash
  console.log('Test 5: Secret key deterministic SHA-256 hash');
  const key1 = 'JERP-PRO-7K4M-92XA-PL8Q'
  const hash1 = hashSecretKey(key1)
  const hash2 = hashSecretKey('jerp-pro-7k4m-92xa-pl8q ') // case and whitespace normalized
  assert.strictEqual(hash1, hash2, 'Hash must be case and whitespace insensitive')
  console.log('  ✅ Passed');

  // Test 6: Shop ID formatting
  console.log('Test 6: Shop ID generation format');
  const shopId = generateShopId()
  assert(/^SHOP-\d{4}-[0-9A-F]{5}$/.test(shopId), `Shop ID failed regex: ${shopId}`)
  console.log('  ✅ Passed');

  // Test 7: Username generation
  console.log('Test 7: Suggested username generation');
  const username = generateSuggestedUsername('Shree Ganesh Jewellers')
  assert(username.startsWith('shreeganes_admin_'), `Username format mismatch: ${username}`)
  console.log('  ✅ Passed');

  console.log('\n🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!\n')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
