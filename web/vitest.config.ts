import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Vitest corre unit/integration/contract (`*.test.ts(x)`). El E2E Playwright usa `*.spec.ts`.
    include: ['src/tests/{unit,integration,contract}/**/*.test.{ts,tsx}'],
    // Base URL absoluta para que el httpClient construya URLs que MSW (`*/api/v1/*`) intercepta.
    env: {
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001/api/v1',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
