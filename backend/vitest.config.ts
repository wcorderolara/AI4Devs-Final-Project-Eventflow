import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
    // Los tests de integración comparten una BD PostgreSQL; ejecutarlos en serie
    // (sin paralelismo entre archivos) evita carreras sobre datos compartidos.
    fileParallelism: false,
  },
});
