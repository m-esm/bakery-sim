import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Site root at https://bakery.moshes.io
  base: '/',
  server: {
    host: '127.0.0.1',
    port: 43123,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
