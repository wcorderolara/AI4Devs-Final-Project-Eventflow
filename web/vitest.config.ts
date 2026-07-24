import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Vitest corre unit/integration/contract/a11y (`*.test.ts(x)`). El E2E Playwright usa
    // `*.spec.ts`. US-131 (PB-P2-019) suma `src/tests/a11y/**` — auditorías axe-core + tests de
    // teclado/foco/ARIA/contraste; el gate bloquea el merge ante violaciones críticas.
    include: ['src/tests/{unit,integration,contract,a11y}/**/*.test.{ts,tsx}'],
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
