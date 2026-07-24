// Build check (VR-01 / VR-03 / VR-04 / EC-02 · US-135): fail-fast de variables de entorno del
// frontend antes del `next build` en Amplify.
//
// Reglas que aplica:
//   1. Toda variable pública REQUERIDA debe estar presente y no vacía (VR-03/VR-04/EC-02).
//      Si falta una, el build falla con exit 1 y mensaje claro (Amplify no promueve el build).
//   2. `NEXT_PUBLIC_API_BASE_URL` debe ser una URL http(s) válida por ambiente (VR-04).
//   3. Higiene de superficie pública (VR-01 · SEC-03 · Doc 21 §9.3/§9.8): ninguna variable con
//      nombre de aspecto sensible (OPENAI/SECRET/PASSWORD/PRIVATE/TOKEN/DATABASE_URL/...) debe
//      llevar el prefijo `NEXT_PUBLIC_` — eso la expondría al cliente. Si aparece, el build falla.
//
// Sólo inspecciona `process.env`; NO imprime valores (sin secretos en logs de build · SEC-03).
// Uso en Amplify preBuild: `node scripts/check-public-env.mjs`.

// Variables públicas REQUERIDAS por ambiente (Doc 21 §9.3, US-135 AC-03/AC-04).
const REQUIRED_PUBLIC = ['NEXT_PUBLIC_API_BASE_URL', 'NEXT_PUBLIC_APP_ENV'];

// `NEXT_PUBLIC_CAPTCHA_SITE_KEY` es requerida sólo si el proveedor de captcha no es `mock`
// (US-001 / FE-003). En local/CI con `mock` puede ir vacía.
const captchaProvider = (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER ?? 'mock').toLowerCase();
if (captchaProvider !== 'mock') {
  REQUIRED_PUBLIC.push('NEXT_PUBLIC_CAPTCHA_SITE_KEY');
}

// Marcadores de aspecto sensible que NUNCA deben viajar con prefijo público (VR-01/SEC-03).
const SENSITIVE_MARKERS = [
  'SECRET',
  'PASSWORD',
  'PRIVATE',
  'OPENAI',
  'DATABASE_URL',
  'DB_PASSWORD',
  'SESSION_SECRET',
  'JWT',
  'AWS_SECRET',
  'SMTP_PASS',
];

const errors = [];

// (1) Presencia y no-vacío de requeridas.
for (const key of REQUIRED_PUBLIC) {
  const value = process.env[key];
  if (value === undefined || String(value).trim() === '') {
    errors.push(`Variable pública requerida ausente o vacía: ${key} (VR-03/EC-02).`);
  }
}

// (2) Forma válida de la API base.
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
if (apiBase && String(apiBase).trim() !== '') {
  try {
    const url = new URL(String(apiBase));
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      errors.push('NEXT_PUBLIC_API_BASE_URL debe usar protocolo http(s) (VR-04).');
    }
  } catch {
    errors.push('NEXT_PUBLIC_API_BASE_URL no es una URL válida (VR-04).');
  }
}

// (3) Higiene de superficie pública: NEXT_PUBLIC_* con nombre de aspecto sensible.
for (const key of Object.keys(process.env)) {
  if (!key.startsWith('NEXT_PUBLIC_')) continue;
  const upper = key.toUpperCase();
  if (SENSITIVE_MARKERS.some((marker) => upper.includes(marker))) {
    errors.push(
      `Variable con prefijo público expone un aspecto sensible al cliente: ${key} (VR-01/SEC-03). ` +
        'Renómbrala sin NEXT_PUBLIC_ y provéela por Secrets Manager.',
    );
  }
}

if (errors.length > 0) {
  console.error('[check-public-env] ❌ Configuración de entorno inválida para el build:');
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(
  `[check-public-env] ✓ Variables públicas requeridas presentes y válidas ` +
    `(APP_ENV=${process.env.NEXT_PUBLIC_APP_ENV}, captchaProvider=${captchaProvider}).`,
);
