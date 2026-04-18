import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app/**', 'lib/**', 'components/**'],
      exclude: [
        'app/api/auth/**', // Legacy auth
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        'lib/prisma.ts', // Primarily configuration
        '**/*.ico',
        '**/*.css',
        '**/.DS_Store',
        'app/favicon.ico',
        'app/globals.css',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
})
