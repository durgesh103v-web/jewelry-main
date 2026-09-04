import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts'),
          test_consignment: resolve('src/main/tests/test_consignment_backend.ts')
        }
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
        '@components': resolve('src/renderer/src/components'),
        '@styles': resolve('src/renderer/src/styles'),
        '@utils': resolve('src/renderer/src/utils'),
        '@constants': resolve('src/shared/constants'),
        '@types': resolve('src/shared/types')
      }
    },
    plugins: [react()]
  }
})
