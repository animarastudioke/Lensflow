import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import path from 'path'

// Separate from vitest.config.ts on purpose: these tests hit the real
// Supabase project (there is no lower-tier branch/staging environment
// available - see tests/integration/README.md) to verify RLS actually
// enforces workspace isolation, which a mocked unit test cannot prove.
// Kept out of the default `npm test` / `vitest run` include pattern so
// they never run implicitly in a normal dev/CI loop - only via
// `npm run test:integration`, deliberately.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (!(key in process.env)) process.env[key] = value
  }

  return {
    test: {
      environment: 'node',
      include: ['tests/integration/**/*.test.ts'],
      globals: true,
      testTimeout: 30_000,
      hookTimeout: 30_000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/lib': path.resolve(__dirname, './src/lib'),
      },
    },
  }
})
