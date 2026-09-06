const esbuild = require('esbuild')
const { spawnSync } = require('child_process')
const path = require('path')

console.log('Building development seed runner...')
esbuild.buildSync({
  entryPoints: [path.join(__dirname, '../src/main/database/seed/runDevelopmentSeed.ts')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  external: ['electron', 'better-sqlite3'],
  outfile: path.join(__dirname, '../out/seed.cjs'),
  alias: {
    '@shared': path.join(__dirname, '../src/shared')
  }
})

console.log('Executing development seed inside Electron runtime...\n')
const electronBinary = require('electron')
const result = spawnSync(electronBinary, [path.join(__dirname, '../out/seed.cjs')], {
  stdio: 'inherit',
  env: process.env
})

process.exit(result.status || 0)
