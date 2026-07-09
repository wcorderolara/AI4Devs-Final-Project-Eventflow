// ESLint base + import boundaries del backend (US-089 / BE-001, US-090 / OPS-001).
// El paquete es ESM (`"type": "module"`), por lo que la config CommonJS de ESLint usa `.cjs`.
//
// Import boundaries (AC-03, ADR-ARCH-001 / ADR-ARCH-002):
//  - Tipo 1 (cross-module): un módulo no puede importar de otro módulo → `eslint-plugin-boundaries`.
//  - Tipo 2 (domain→infra): la capa `domain/` no puede importar Prisma/Express/SDKs → `no-restricted-imports`.

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'boundaries'],
  env: { node: true, es2022: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist/', 'node_modules/', 'prisma/generated/'],
  settings: {
    'import/resolver': {
      typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
    },
    'boundaries/elements': [
      { type: 'app-config', pattern: 'src/config', mode: 'folder' },
      { type: 'app-infra', pattern: 'src/infrastructure', mode: 'folder' },
      { type: 'shared', pattern: 'src/shared', mode: 'folder' },
      { type: 'module', pattern: 'src/modules/*', mode: 'folder', capture: ['moduleName'] },
    ],
    'boundaries/ignore': ['tests/**/*', '**/*.spec.ts'],
  },
  rules: {
    // Underscore-prefixed args/vars son intencionalmente no usados (stubs de middleware, etc.).
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // Tipo 1 — Cross-module imports (ADR-ARCH-001). Solo aplica a módulos y shared kernel.
      files: ['src/modules/**/*.ts', 'src/shared/**/*.ts'],
      rules: {
        'boundaries/element-types': ['error', {
          default: 'disallow',
          message: 'Import boundary violation (ADR-ARCH-001): comunicación entre módulos solo vía barrels públicos.',
          rules: [
            // Un módulo puede importar `src/shared`, config, el Prisma client legacy y su PROPIO módulo.
            { from: ['module'], allow: ['shared', 'app-config', 'app-infra', ['module', { moduleName: '${from.moduleName}' }]] },
            // El shared kernel puede importar shared, config y el Prisma client legacy (re-export).
            { from: ['shared'], allow: ['shared', 'app-config', 'app-infra'] },
            { from: ['app-infra'], allow: ['app-infra', 'app-config', 'shared'] },
          ],
        }],
      },
    },
    {
      // US-092 / OPS-001 — Prohíbe `.passthrough()` en schemas Zod (ADR-API-003, VR-02).
      // `.passthrough()` permite que campos no declarados pasen silenciosamente al controlador,
      // un riesgo de seguridad (inyección de campos). Todos los DTOs deben usar `.strict()`.
      // Aplica a los DTOs por módulo y al shared kernel; NO a los tests (pueden usar mocks laxos).
      files: ['src/modules/*/dto/**/*.ts', 'src/shared/**/*.ts'],
      excludedFiles: ['**/*.spec.ts', '**/*.test.ts'],
      rules: {
        'no-restricted-syntax': ['error', {
          selector: "CallExpression[callee.property.name='passthrough']",
          message: '`.passthrough()` está prohibido en schemas Zod (ADR-API-003 / VR-02). Usa `.strict()`.',
        }],
      },
    },
    {
      // Tipo 2 — Domain no importa infraestructura/framework/SDK (ADR-ARCH-002).
      files: ['src/modules/*/domain/**/*.ts', 'src/shared/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            {
              group: ['@prisma/client', 'express', 'openai', 'aws-sdk', 'multer', '**/infrastructure/**', '**/interface/**'],
              message: 'Domain layer must not import infrastructure/framework/SDK (ADR-ARCH-002).',
            },
          ],
        }],
      },
    },
  ],
};
