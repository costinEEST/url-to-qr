import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // `?inline` style imports return empty stubs unless CSS is processed.
    css: true,
    include: ['tests/**/*.test.ts'],
  },
})
