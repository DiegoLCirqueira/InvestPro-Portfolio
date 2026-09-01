import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/investpro?schema=public',
      JWT_SECRET: 'investpro-dev-jwt-secret-2024',
      JWT_REFRESH_SECRET: 'investpro-dev-refresh-secret-2024',
      NODE_ENV: 'development',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/modules/**/*.service.ts', 'src/modules/**/lib/**/*.ts', 'src/modules/**/*.domain.ts'],
      exclude: ['src/modules/**/__tests__/**'],
    },
  },
})