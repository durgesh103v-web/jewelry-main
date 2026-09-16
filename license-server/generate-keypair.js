const crypto = require('crypto')

console.log('Generating new Ed25519 Cryptographic Keypair...\n')

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
})

console.log('===============================================================')
console.log('🔑 1. PRIVATE SIGNING KEY (For your license-server/.env):')
console.log('===============================================================')
console.log(privateKey)
console.log('Formatted for .env (single line):')
console.log(`ED25519_PRIVATE_KEY="${privateKey.replace(/\r?\n/g, '\\n')}"\n`)

console.log('===============================================================')
console.log('🔓 2. PUBLIC VERIFICATION KEY (For src/main/.../license.public-key.ts):')
console.log('===============================================================')
console.log(publicKey)
console.log('===============================================================')
