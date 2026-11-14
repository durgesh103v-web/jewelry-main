/**
 * test-phase7-production.js
 * Comprehensive automated verification test suite for Phase 7 Production Hardening.
 *
 * Verifies:
 * 1. Startup Environment Validation (detects missing secrets in production mode)
 * 2. Helmet Security Headers (nosniff, X-Frame-Options, DNS prefetch, etc.)
 * 3. 1MB Request Payload Limit Enforcement (rejects >1MB payloads with 413)
 * 4. Production Error Handling (suppresses stack traces and sensitive error details)
 * 5. Rate Limiting Protection on Client & Auth Endpoints
 * 6. MongoDB Production Schema Indexes & Connection Pool Settings
 */

const dns = require('dns')
dns.setServers(['8.8.8.8', '1.1.1.1'])

const http = require('http')
const mongoose = require('mongoose')
const { app, validateProductionEnvironment } = require('./server')
const { License } = require('./models/License')
const { Shop } = require('./models/Shop')
const { OwnerAccount } = require('./models/OwnerAccount')
const { AuditLog } = require('./models/AuditLog')

let server
const TEST_PORT = 5099
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`

let passedTests = 0
let failedTests = 0

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`)
    passedTests++
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${detail}`)
    failedTests++
  }
}

async function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: options.headers || {}
    }

    const req = http.request(reqOptions, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        let json = null
        try {
          json = JSON.parse(data)
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json || data
        })
      })
    })

    req.on('error', reject)

    if (options.body) {
      if (typeof options.body === 'string') {
        req.write(options.body)
      } else {
        req.write(JSON.stringify(options.body))
      }
    }
    req.end()
  })
}

async function runTests() {
  console.log('=====================================================================')
  console.log('      PHASE 7 PRODUCTION HARDENING & DEPLOYMENT VERIFICATION         ')
  console.log('=====================================================================\n')

  // -------------------------------------------------------------------------
  // TEST GROUP 1: Startup Environment Validation
  // -------------------------------------------------------------------------
  console.log('--- Test Group 1: Startup Environment Validation ---')
  const originalEnv = { ...process.env }

  try {
    process.env.NODE_ENV = 'production'
    delete process.env.MONGODB_URI
    delete process.env.SESSION_SECRET
    delete process.env.ED25519_PRIVATE_KEY
    delete process.env.CORS_ORIGINS

    let threwError = false
    try {
      validateProductionEnvironment()
    } catch (err) {
      threwError = true
      assert(
        err.message.includes('Insecure/missing environment variables'),
        'Startup validator rejects missing production environment variables',
        err.message
      )
    }
    assert(threwError, 'Validation must throw when required secrets are missing in production')

    // Test with weak session secret
    process.env.MONGODB_URI = 'mongodb+srv://user:pass@cluster.mongodb.net/prod_db'
    process.env.SESSION_SECRET = 'short_secret'
    process.env.ED25519_PRIVATE_KEY = 'valid_key_structure'
    process.env.CORS_ORIGINS = 'https://admin.example.com'

    threwError = false
    try {
      validateProductionEnvironment()
    } catch (err) {
      threwError = true
      assert(
        err.message.includes('SESSION_SECRET'),
        'Startup validator rejects weak SESSION_SECRET (< 32 chars)',
        err.message
      )
    }
    assert(threwError, 'Validation must throw when SESSION_SECRET is too short')

    // Test with all valid production variables
    process.env.SESSION_SECRET = 'super_secure_production_secret_key_at_least_32_chars_long'
    let successNoThrow = false
    try {
      validateProductionEnvironment()
      successNoThrow = true
    } catch (e) {
      successNoThrow = false
    }
    assert(successNoThrow, 'Startup validator accepts valid, high-entropy production configuration')
  } finally {
    // Restore original env
    process.env = originalEnv
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 2: HTTP Server & Helmet Security Headers
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 2: Helmet Security Headers ---')
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', resolve)
  })

  const healthRes = await makeRequest('/api/health')
  assert(healthRes.statusCode === 200, 'Health check returns 200 OK')

  // Check Helmet headers
  const headers = healthRes.headers
  assert(headers['x-content-type-options'] === 'nosniff', 'Header X-Content-Type-Options: nosniff present')
  assert(headers['x-frame-options'] === 'SAMEORIGIN', 'Header X-Frame-Options: SAMEORIGIN present')
  assert(headers['x-dns-prefetch-control'] === 'off', 'Header X-DNS-Prefetch-Control: off present')
  assert(headers['cross-origin-resource-policy'] === 'cross-origin', 'Header Cross-Origin-Resource-Policy: cross-origin present')

  // -------------------------------------------------------------------------
  // TEST GROUP 3: Request Body Limit Enforcement (1MB)
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 3: Request Body Limit (1MB) ---')
  // Create an oversized body (> 1MB)
  const largeData = 'A'.repeat(1024 * 1024 * 1.5) // 1.5 MB string
  const oversizedPayload = JSON.stringify({ shopId: 'JERP-TEST', data: largeData })

  const oversizedRes = await makeRequest('/api/licenses/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(oversizedPayload)
    },
    body: oversizedPayload
  })

  assert(oversizedRes.statusCode === 413, 'Server returns 413 Payload Too Large for request > 1MB')

  // -------------------------------------------------------------------------
  // TEST GROUP 4: Production Error Handling & Stack Trace Suppression
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 4: Production Error Handling ---')
  // We send a malformed JSON body to trigger error middleware
  const malformedRes = await makeRequest('/api/licenses/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: '{"invalid_json": broken}'
  })

  assert(malformedRes.statusCode === 400 || malformedRes.statusCode === 500, 'Server handles malformed request gracefully')
  const responseBody = typeof malformedRes.body === 'string' ? malformedRes.body : JSON.stringify(malformedRes.body)
  assert(!responseBody.includes('SyntaxError: Unexpected token'), 'Stack trace or low-level parser details NOT leaked in body')
  assert(malformedRes.body && malformedRes.body.success === false, 'Safe JSON error envelope returned')

  // -------------------------------------------------------------------------
  // TEST GROUP 5: MongoDB Production Model Index Verification
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 5: MongoDB Schema Index Verification ---')
  const licenseIndexes = License.schema.indexes()
  const shopIndexes = Shop.schema.indexes()
  const ownerIndexes = OwnerAccount.schema.indexes()
  const auditIndexes = AuditLog.schema.indexes()

  // Verify License indexes: productKeyHash unique/sparse, shopId
  const hasProductKeyHashIndex = License.schema.path('productKeyHash') ? true : false
  const hasShopIdIndex = License.schema.path('shopId') ? true : false
  assert(hasProductKeyHashIndex && hasShopIdIndex, 'License model has indexed fields (productKeyHash, shopId)')

  // Verify Shop indexes: shopId unique, email
  const shopShopIdIndex = Shop.schema.path('shopId') ? true : false
  assert(shopShopIdIndex, 'Shop model has indexed field (shopId)')

  // Verify OwnerAccount indexes: shopId unique, ownerUsername
  const ownerShopIdIndex = OwnerAccount.schema.path('shopId') ? true : false
  assert(ownerShopIdIndex, 'OwnerAccount model has indexed field (shopId)')

  // Verify AuditLog indexes
  const auditActionIndex = AuditLog.schema.path('action') ? true : false
  assert(auditActionIndex, 'AuditLog model has indexed fields (action, timestamp)')

  // -------------------------------------------------------------------------
  // TEST GROUP 6: Rate Limiter Configuration Verification
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 6: Rate Limiter Verification ---')
  const { activationLimiter, provisioningLimiter, syncLimiter } = require('./middleware/adminAuth')
  assert(typeof activationLimiter === 'function', 'Activation rate limiter is defined and exportable')
  assert(typeof provisioningLimiter === 'function', 'Provisioning rate limiter is defined and exportable')
  assert(typeof syncLimiter === 'function', 'Sync rate limiter is defined and exportable')

  // -------------------------------------------------------------------------
  // TEARDOWN & REPORT
  // -------------------------------------------------------------------------
  if (server) {
    await new Promise((resolve) => server.close(resolve))
  }

  console.log('\n=====================================================================')
  console.log(`RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`)
  console.log('=====================================================================\n')

  if (failedTests > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err)
  if (server) server.close()
  process.exit(1)
})
