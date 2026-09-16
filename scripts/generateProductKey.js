const crypto = require('crypto');

// Ed25519 Private Key for generating signed licenses
const DEV_SIGNING_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIOlBcKxNlSkKKoDHRx6/Fou1Cj2vSh4mZ8VUhT5mO8tk
-----END PRIVATE KEY-----`;

function generateRandomKey(edition = 'PRO') {
  const p1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const p2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const p3 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `JERP-${edition.toUpperCase()}-${p1}-${p2}-${p3}`;
}

console.log('====================================================');
console.log('     JEWELLERY ERP — OFFICIAL PRODUCT KEY GENERATOR  ');
console.log('====================================================\n');

console.log('Use any of these keys in the Activate Jewellery ERP screen:\n');

console.log('💎 ENTERPRISE EDITION (All Features + Consignment + RFID + Manufacturing):');
console.log('   Key 1: JERP-ENT-8N3V-19YB-QM4Z');
console.log('   Key 2: ' + generateRandomKey('ENT'));
console.log('   Key 3: ' + generateRandomKey('ENT') + '\n');

console.log('👑 PROFESSIONAL EDITION (Wholesale + Retail + Barcode + Job Work + Ledgers):');
console.log('   Key 1: JERP-PRO-7K4M-92XA-PL8Q');
console.log('   Key 2: ' + generateRandomKey('PRO'));
console.log('   Key 3: ' + generateRandomKey('PRO') + '\n');

console.log('🏷️ BASIC EDITION (Core Sales, Purchase, Inventory, GST & Reports):');
console.log('   Key 1: JERP-BAS-4K1L-90ZA-PT2W');
console.log('   Key 2: ' + generateRandomKey('BAS'));
console.log('   Key 3: ' + generateRandomKey('BAS') + '\n');

console.log('====================================================');
console.log('How it works:');
console.log('1. Copy any product key above.');
console.log('2. Paste it into the "Activate Jewellery ERP" screen.');
console.log('3. Click "Activate Jewellery ERP".');
console.log('====================================================');
