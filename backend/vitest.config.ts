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
    // US-126 (PB-P2-014 · AC-03 · AC-05) — Coverage con umbrales bloqueantes.
    //
    // Baseline medida al setear estos umbrales:
    //   Statements 67.87% · Branches 86.34% · Functions 68.94% · Lines 67.87%.
    // US-126 exige ≥50% sobre lógica crítica (Doc 20 meta aspiracional 60/80%). Se fijan
    // umbrales conservadores por debajo del baseline actual (~55/75/55/55) para dejar buffer
    // contra fluctuaciones normales pero atrapar regresiones material (>10pp de caída). El
    // gate se activa vía `npm run test:coverage` (script) y el job coverage-gate del pipeline
    // `pr.yml` (US-126 · OPS-002).
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      exclude: ['dist/**', 'node_modules/**', 'prisma/generated/**', 'tests/**', '**/*.config.*', 'src/scripts/**'],
      thresholds: {
        lines: 55,
        statements: 55,
        functions: 55,
        branches: 75,
      },
    },
  },
});
