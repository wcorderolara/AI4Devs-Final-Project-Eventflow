import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
    // Pobla env vars de test seguros antes de importar módulos que parsean config (US-089).
    setupFiles: ['tests/setup/env.setup.ts'],
    // Los tests de integración comparten una BD PostgreSQL; ejecutarlos en serie
    // (sin paralelismo entre archivos) evita carreras sobre datos compartidos.
    fileParallelism: false,
  },
});
