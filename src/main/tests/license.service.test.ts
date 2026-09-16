import assert from 'node:assert'
import { licenseService } from '../services/licensing/license.service'
import { licenseStorageService } from '../services/licensing/license-storage.service'
import { machineIdentityService } from '../services/licensing/machine-identity.service'
import { signLicensePayload, verifyLicenseSignature } from '../services/licensing/license.crypto'
import type { LicensePayload } from '../services/licensing/license.types'

const TEST_SIGNING_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIOlBcKxNlSkKKoDHRx6/Fou1Cj2vSh4mZ8VUhT5mO8tk
-----END PRIVATE KEY-----`

export async function runLicensingTests(): Promise<void> {
  console.log('=== RUNNING COMMERCIAL LICENSING (MODEL A) TESTS ===')

  // Setup / reset
  licenseService.deactivateLicense()

  // Test 1
  console.log('Test 1: Unlicensed state when no license.dat exists...')
  {
    const status = licenseService.getLicenseStatus()
    assert.strictEqual(status.status, 'UNLICENSED')
    assert.strictEqual(status.isLicensed, false)
    assert.strictEqual(status.license, null)
    assert.match(status.machineId, /^MID-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
    console.log('  ✓ Passed')
  }

  // Test 2
  console.log('Test 2: Online activation with valid product key & machine binding...')
  {
    const result = await licenseService.activateLicense('JERP-PRO-7K4M-92XA-PL8Q')
    assert.strictEqual(result.success, true)
    assert.strictEqual(result.status, 'ACTIVE')
    assert.strictEqual(result.license?.edition, 'PROFESSIONAL')
    assert.strictEqual(result.license?.isExpired, false)
    assert.ok(result.license?.features.includes('FEATURE_SALES'))
    assert.ok(result.license?.features.includes('FEATURE_BARCODE'))
    console.log('  ✓ Passed')
  }

  // Test 3
  console.log('Test 3: Invalid product key rejection...')
  {
    const result = await licenseService.activateLicense('INVALID_KEY')
    assert.strictEqual(result.success, false)
    assert.strictEqual(result.status, 'INVALID')
    assert.ok(result.message.includes('Invalid product key format'))
    console.log('  ✓ Passed')
  }

  // Test 4
  console.log('Test 4: 100% offline local validation from DPAPI/encrypted license.dat...')
  {
    await licenseService.activateLicense('JERP-ENT-8N3V-19YB-QM4Z')
    assert.strictEqual(licenseStorageService.hasLicenseFile(), true)

    const offlineStatus = licenseService.validateLocalLicense()
    assert.strictEqual(offlineStatus.isLicensed, true)
    assert.strictEqual(offlineStatus.status, 'ACTIVE')
    assert.strictEqual(offlineStatus.license?.edition, 'ENTERPRISE')
    assert.ok(offlineStatus.license?.features.includes('FEATURE_CONSIGNMENT'))
    console.log('  ✓ Passed')
  }

  // Test 5
  console.log('Test 5: Tampered license payload fails cryptographic Ed25519 verification...')
  {
    const machineId = machineIdentityService.getMachineId()
    const validPayload: LicensePayload = {
      licenseId: 'LIC-2026-99999',
      product: 'JEWELLERY_ERP',
      edition: 'BASIC',
      status: 'ACTIVE',
      machineId,
      activatedAt: new Date().toISOString(),
      expiresAt: null,
      features: ['FEATURE_SALES'],
      version: 1
    }

    const signature = signLicensePayload(validPayload, TEST_SIGNING_PRIVATE_KEY)

    // Tamper with payload
    const tamperedPayload: LicensePayload = {
      ...validPayload,
      edition: 'ENTERPRISE',
      features: ['FEATURE_SALES', 'FEATURE_CONSIGNMENT']
    }

    const isValid = verifyLicenseSignature(tamperedPayload, signature)
    assert.strictEqual(isValid, false)

    licenseStorageService.saveLicense({ payload: tamperedPayload, signature }, machineId)

    const status = licenseService.validateLocalLicense()
    assert.strictEqual(status.status, 'INVALID')
    assert.strictEqual(status.isLicensed, false)
    assert.ok(status.message?.includes('Cryptographic signature verification failed'))
    console.log('  ✓ Passed')
  }

  // Test 6
  console.log('Test 6: Rejection of license bound to another computer (Machine Mismatch)...')
  {
    const otherMachineId = 'MID-AAAA-BBBB-CCCC-DDDD'
    const payload: LicensePayload = {
      licenseId: 'LIC-2026-11111',
      product: 'JEWELLERY_ERP',
      edition: 'PROFESSIONAL',
      status: 'ACTIVE',
      machineId: otherMachineId,
      activatedAt: new Date().toISOString(),
      expiresAt: null,
      features: ['FEATURE_SALES'],
      version: 1
    }

    const signature = signLicensePayload(payload, TEST_SIGNING_PRIVATE_KEY)
    licenseStorageService.saveLicense({ payload, signature }, otherMachineId)

    const status = licenseService.validateLocalLicense()
    assert.strictEqual(status.status, 'INVALID')
    assert.strictEqual(status.isLicensed, false)
    assert.ok(status.message?.includes('bound to another device'))
    console.log('  ✓ Passed')
  }

  // Test 7
  console.log('Test 7: Expired license detection...')
  {
    const machineId = machineIdentityService.getMachineId()
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const payload: LicensePayload = {
      licenseId: 'LIC-2025-00001',
      product: 'JEWELLERY_ERP',
      edition: 'PROFESSIONAL',
      status: 'ACTIVE',
      machineId,
      activatedAt: '2025-01-01T00:00:00Z',
      expiresAt: pastDate,
      features: ['FEATURE_SALES'],
      version: 1
    }

    const signature = signLicensePayload(payload, TEST_SIGNING_PRIVATE_KEY)
    licenseStorageService.saveLicense({ payload, signature }, machineId)

    const status = licenseService.validateLocalLicense()
    assert.strictEqual(status.status, 'EXPIRED')
    assert.strictEqual(status.isLicensed, false)
    assert.strictEqual(status.license?.isExpired, true)
    console.log('  ✓ Passed')
  }

  // Test 8
  console.log('Test 8: Feature entitlements verification per edition...')
  {
    await licenseService.activateLicense('JERP-BAS-1111-2222-3333')
    assert.strictEqual(licenseService.isFeatureLicensed('FEATURE_SALES'), true)
    assert.strictEqual(licenseService.isFeatureLicensed('FEATURE_BARCODE'), false)
    assert.strictEqual(licenseService.isFeatureLicensed('FEATURE_CONSIGNMENT'), false)

    await licenseService.activateLicense('JERP-ENT-9999-8888-7777')
    assert.strictEqual(licenseService.isFeatureLicensed('FEATURE_BARCODE'), true)
    assert.strictEqual(licenseService.isFeatureLicensed('FEATURE_CONSIGNMENT'), true)
    console.log('  ✓ Passed')
  }

  // Test 9
  console.log('Test 9: System clock rollback detection...')
  {
    const machineId = machineIdentityService.getMachineId()
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    const payload: LicensePayload = {
      licenseId: 'LIC-2026-CLOCK',
      product: 'JEWELLERY_ERP',
      edition: 'PROFESSIONAL',
      status: 'ACTIVE',
      machineId,
      activatedAt: new Date().toISOString(),
      expiresAt: futureDate,
      features: ['FEATURE_SALES'],
      version: 1
    }

    const signature = signLicensePayload(payload, TEST_SIGNING_PRIVATE_KEY)
    licenseStorageService.saveLicense({ payload, signature }, machineId)
    licenseStorageService.updateLastVerifiedTimestamp(Date.now() + 10 * 24 * 60 * 60 * 1000)

    const status = licenseService.validateLocalLicense()
    assert.strictEqual(status.status, 'INVALID')
    assert.strictEqual(status.isLicensed, false)
    assert.ok(status.message?.includes('clock tampering'))
    console.log('  ✓ Passed')
  }

  // Cleanup
  licenseService.deactivateLicense()
  console.log('=== ALL 9 LICENSING TESTS PASSED SUCCESSFULLY! ===\n')
}
