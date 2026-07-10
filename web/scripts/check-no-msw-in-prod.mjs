// Build check (SEC-07 / VR-05): MSW NUNCA debe aparecer en los chunks de producción.
// Falla con exit 1 si encuentra referencias a `msw` en `.next/static/chunks/*.js`.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const chunksDir = '.next/static/chunks';

let files;
try {
  files = readdirSync(chunksDir, { recursive: true }).filter((f) => String(f).endsWith('.js'));
} catch {
  console.error(`[check-no-msw-in-prod] No existe ${chunksDir}. Ejecuta "npm run build" primero.`);
  process.exit(1);
}

const offenders = [];
for (const file of files) {
  const full = join(chunksDir, String(file));
  const content = readFileSync(full, 'utf8');
  // Marcadores propios del runtime de MSW (evita falsos positivos con substrings casuales).
  if (content.includes('setupWorker') || content.includes('mockServiceWorker') || content.includes('msw/browser')) {
    offenders.push(String(file));
  }
}

if (offenders.length > 0) {
  console.error('[check-no-msw-in-prod] ❌ MSW encontrado en chunks de producción:');
  for (const file of offenders) console.error(`  - ${file}`);
  process.exit(1);
}

console.log('[check-no-msw-in-prod] ✓ MSW no está presente en los chunks de producción.');
