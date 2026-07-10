// ESLint config (eslintrc, ESLint 8 — usado por `next lint`).
// `eslint-config-prettier` va al final para desactivar reglas de formato en conflicto con Prettier.
module.exports = {
  root: true,
  extends: ['next/core-web-vitals', 'plugin:jsx-a11y/recommended', 'prettier'],
  rules: {
    // US-104 AC-10 / Doc 15 §31.3: prohibido hardcodear strings en JSX. Usar `t('clave')`.
    // allowList mínima de símbolos no traducibles; los atributos (aria-label, etc.) no se revisan.
    'react/jsx-no-literals': ['error', { allowedStrings: ['·', '/', '&', '—', ':'] }],
  },
  overrides: [
    {
      // Los tests renderizan fixtures con texto literal; la regla anti-hardcode aplica a UI de producto.
      files: ['**/*.test.ts', '**/*.test.tsx', 'src/tests/**'],
      rules: { 'react/jsx-no-literals': 'off' },
    },
  ],
};
