const esbuild = require('esbuild')
const { spawnSync } = require('child_process')
const path = require('path')

console.log('Building desktop integration test runner...')
esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'testDesktopIntegration.ts')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  external: ['electron', 'better-sqlite3', 'mongoose', 'supertest'],
  outfile: path.join(__dirname, '../out/test-desktop-integration.cjs'),
  alias: {
    '@shared': path.join(__dirname, '../src/shared')
  }
})

console.log('Executing desktop integration tests inside Electron runtime...\n')
const licenseServerNodeModules = path.join(__dirname, '../license-server/node_modules')
const nodePath = licenseServerNodeModules + path.delimiter + (process.env.NODE_PATH || '')
const electronBinary = require('electron')

const result = spawnSync(electronBinary, [path.join(__dirname, '../out/test-desktop-integration.cjs')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_PATH: nodePath,
    ELECTRON_RUN_AS_NODE: '1'
  }
})

process.exit(result.status || 0)
