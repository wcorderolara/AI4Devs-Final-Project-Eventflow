#!/usr/bin/env node
// Validador (no bloqueante) del catálogo de evidencia de prompts (US-149 / PB-P2-026 / OPS-001).
//
// Verifica DOS cosas sobre `management/artifacts/AI-Prompt-Evidence-Catalog.md`:
//   1. Cobertura: existe una sección por cada una de las 7 features de IA del MVP (AC-01, VR-01).
//   2. Sanitización: no hay patrones de secretos ni claves reales (AC-03, SEC-02/03, NT-02).
//
// No modifica nada. Exit 1 si falta cobertura o detecta un secreto. Uso:
//   node scripts/check-ai-prompt-catalog.mjs
//
// Diseñado para ser no bloqueante en CI (usar `continue-on-error: true` si se cablea).
// Sin dependencias externas: Node >= 18, ESM puro.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CATALOG = resolve(HERE, '..', 'management/artifacts/AI-Prompt-Evidence-Catalog.md');

// Las 7 features del MVP (AI-007 excluida: no forma parte del MVP). Cada una debe tener su sección.
const REQUIRED_FEATURES = [
  { id: 'AI-001', kind: 'event_plan' },
  { id: 'AI-002', kind: 'checklist' },
  { id: 'AI-003', kind: 'budget_suggestion' },
  { id: 'AI-004', kind: 'vendor_categories' },
  { id: 'AI-005', kind: 'quote_brief' },
  { id: 'AI-006', kind: 'quote_compare_summary' },
  { id: 'AI-008', kind: 'task_priority' },
];

// Patrones de secretos REALES (no la mera mención de la variable en prosa/JSON de ejemplo).
const SECRET_PATTERNS = [
  { name: 'OpenAI API key (sk-…)', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: 'OPENAI_API_KEY con valor real', re: /OPENAI_API_KEY\s*[:=]\s*["']?sk-[A-Za-z0-9]{10,}/ },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Bearer token largo', re: /\bBearer\s+[A-Za-z0-9._-]{30,}/ },
];

function main() {
  let content;
  try {
    content = readFileSync(CATALOG, 'utf8');
  } catch {
    console.error(`[ai-catalog] ERROR: no existe ${CATALOG} (ejecutar US-149 DOC-001/002).`);
    process.exit(1);
  }

  const problems = [];

  // 1) Cobertura por feature.
  for (const f of REQUIRED_FEATURES) {
    // Requiere el ID de feature y su `kind` presentes en una sección (encabezado `## AI-00X …`).
    const hasHeading = new RegExp(`^##\\s+${f.id}\\b.*\`${f.kind}\``, 'm').test(content);
    if (!hasHeading) problems.push(`falta la sección de la feature ${f.id} (\`${f.kind}\`)`);
  }

  // 2) Secret-scan.
  for (const p of SECRET_PATTERNS) {
    const m = content.match(p.re);
    if (m) problems.push(`posible secreto detectado (${p.name}): "${m[0].slice(0, 24)}…"`);
  }

  if (problems.length > 0) {
    console.error('[ai-catalog] FALLÓ:');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }

  console.log(`[ai-catalog] OK: ${REQUIRED_FEATURES.length}/7 features cubiertas; sin secretos detectados.`);
}

main();
