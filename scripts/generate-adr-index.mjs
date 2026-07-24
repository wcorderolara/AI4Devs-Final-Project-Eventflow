#!/usr/bin/env node
// Generador/validador del índice maestro de ADRs (US-147 / PB-P2-025).
//
// Fuente de verdad ÚNICA: la tabla "## 6. Inventario de ADRs" de
// `docs/22-Architecture-Decision-Records.md`. Este script NO edita el Doc 22 ni crea ADRs;
// sólo deriva de él un índice navegable (`management/artifacts/ADR-Index.md`) con enlaces de
// ancla a cada sección detallada. Es el mecanismo que mantiene el índice "vivo" (AC-04) y la
// validación de cobertura (AC-05).
//
// Uso:
//   node scripts/generate-adr-index.mjs            # (re)genera el índice en disco
//   node scripts/generate-adr-index.mjs --check    # NO escribe; falla (exit 1) si el índice
//                                                  # está desactualizado o falta cobertura
//
// Sin dependencias externas: Node >= 18, ESM puro.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const DOC22_PATH = resolve(REPO_ROOT, 'docs/22-Architecture-Decision-Records.md');
const INDEX_PATH = resolve(REPO_ROOT, 'management/artifacts/ADR-Index.md');
// Enlace relativo desde `management/artifacts/` hacia `docs/`.
const DOC22_REL = '../../docs/22-Architecture-Decision-Records.md';

/**
 * Slug de ancla compatible con GitHub (github-slugger) para los títulos ASCII de los ADRs:
 * minúsculas, se eliminan los caracteres que no sean [a-z0-9], espacio, guion o guion bajo
 * (el em-dash "—" y "/" se eliminan, dejando sus espacios adyacentes), y los espacios pasan a
 * guiones. Deriva el mismo ancla que GitHub genera para el encabezado `## <id> — <título>`.
 */
export function githubAnchor(headingText) {
  return headingText
    .toLowerCase()
    .replace(/[^a-z0-9 \-_]/g, '')
    .replace(/ /g, '-');
}

/** Extrae el bloque de la tabla del "## 6. Inventario de ADRs" del Doc 22. */
function extractInventoryTable(doc) {
  const lines = doc.split('\n');
  const start = lines.findIndex((l) => /^##\s+6\.\s+Inventario de ADRs/.test(l));
  if (start === -1) throw new Error('No se encontró "## 6. Inventario de ADRs" en el Doc 22.');
  const rows = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('## ')) break; // fin de la sección
    if (!line.startsWith('|')) continue;
    rows.push(line);
  }
  return rows;
}

/** Parsea una fila de tabla Markdown `| a | b | c |` a un arreglo de celdas. */
function parseRow(line) {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/** Convierte la tabla del inventario en registros {id,title,category,status,scope,sourceType,docs}. */
function parseInventory(doc) {
  const rows = extractInventoryTable(doc);
  const adrs = [];
  for (const row of rows) {
    const cells = parseRow(row);
    const id = cells[0];
    if (!/^ADR-[A-Z]+-\d+$/.test(id)) continue; // salta encabezado y separador `|---|`
    adrs.push({
      id,
      title: cells[1],
      category: cells[2],
      status: cells[3],
      scope: cells[4] ?? '',
      sourceType: cells[5] ?? '',
      docs: cells[6] ?? '',
    });
  }
  return adrs;
}

/** IDs de ADR presentes como sección detallada `## <id> — ...` (excluye la plantilla). */
function detailedHeadingIds(doc) {
  const ids = new Map(); // id -> headingText
  const re = /^##\s+(ADR-[A-Z]+-\d+)\s+—\s+(.+?)\s*$/gm;
  let m;
  while ((m = re.exec(doc)) !== null) ids.set(m[1], m[2]);
  return ids;
}

/** Enlaza cualquier `ADR-XXX-NNN` mencionado en el texto de estado hacia su ancla. */
function linkifyStatus(status, anchorById) {
  return status.replace(/ADR-[A-Z]+-\d+/g, (id) => {
    const anchor = anchorById.get(id);
    return anchor ? `[${id}](${DOC22_REL}#${anchor})` : id;
  });
}

/** Construye el contenido Markdown del índice a partir de los ADRs del inventario. */
function buildIndex(adrs, headings) {
  const anchorById = new Map(
    adrs.map((a) => [a.id, githubAnchor(`${a.id} — ${a.title}`)]),
  );

  const byStatus = new Map();
  for (const a of adrs) {
    const key = a.status.startsWith('Superseded') ? 'Superseded' : a.status;
    byStatus.set(key, (byStatus.get(key) ?? 0) + 1);
  }

  // Orden de categorías tal como aparecen en el inventario.
  const categories = [];
  for (const a of adrs) if (!categories.includes(a.category)) categories.push(a.category);

  const out = [];
  out.push('<!-- GENERADO por scripts/generate-adr-index.mjs — NO editar a mano. -->');
  out.push('<!-- Fuente de verdad: docs/22-Architecture-Decision-Records.md (## 6. Inventario de ADRs). -->');
  out.push('<!-- Regenerar: `node scripts/generate-adr-index.mjs`; validar: `node scripts/generate-adr-index.mjs --check`. -->');
  out.push('');
  out.push('# 📇 Índice maestro de ADRs — EventFlow');
  out.push('');
  out.push('> Índice **navegable** de los Architecture Decision Records (ADRs) de EventFlow, derivado');
  out.push('> automáticamente del ADR Log canónico');
  out.push(`> [\`docs/22-Architecture-Decision-Records.md\`](${DOC22_REL}). Este índice **no reemplaza** el`);
  out.push('> Doc 22 (fuente de verdad); lo resume y enlaza para la evaluación académica (EPIC-ACAD-001,');
  out.push('> US-147 / PB-P2-025).');
  out.push('');

  // Resumen de estados.
  const total = adrs.length;
  const accepted = byStatus.get('Accepted') ?? 0;
  const superseded = byStatus.get('Superseded') ?? 0;
  out.push('## Resumen');
  out.push('');
  out.push('| Métrica | Valor |');
  out.push('| --- | ---: |');
  out.push(`| ADRs totales en el inventario | ${total} |`);
  out.push(`| \`Accepted\` | ${accepted} |`);
  out.push(`| \`Superseded\` | ${superseded} |`);
  for (const [status, count] of byStatus) {
    if (status === 'Accepted' || status === 'Superseded') continue;
    out.push(`| \`${status}\` | ${count} |`);
  }
  out.push(`| Categorías | ${categories.length} |`);
  out.push('');
  out.push('> Umbral de la historia: ≥5 ADRs aceptados (VR-01). Estado actual: **' + accepted + ' `Accepted`**.');
  out.push('');

  // Navegación por categoría.
  out.push('## Categorías');
  out.push('');
  for (const cat of categories) {
    const n = adrs.filter((a) => a.category === cat).length;
    out.push(`- [${cat}](#${githubAnchor(cat)}) — ${n} ADR(s)`);
  }
  out.push('');

  // Tablas por categoría.
  for (const cat of categories) {
    out.push(`## ${cat}`);
    out.push('');
    out.push('| ADR | Título | Estado |');
    out.push('| --- | --- | --- |');
    for (const a of adrs.filter((x) => x.category === cat)) {
      const anchor = anchorById.get(a.id);
      const link = `[${a.id}](${DOC22_REL}#${anchor})`;
      const status = linkifyStatus(a.status, anchorById);
      // Escapa `|` del título por si aparece (no ocurre hoy, pero mantiene la tabla robusta).
      const title = a.title.replace(/\|/g, '\\|');
      out.push(`| ${link} | ${title} | ${status} |`);
    }
    out.push('');
  }

  // Mantenimiento / sincronización (AC-04, EC-01, EC-02).
  out.push('## Mantenimiento y sincronización (índice vivo)');
  out.push('');
  out.push('Este índice se mantiene **sincronizado** con el Doc 22 mediante un generador determinista:');
  out.push('');
  out.push('1. **Fuente de verdad:** la tabla `## 6. Inventario de ADRs` del');
  out.push(`   [\`Doc 22\`](${DOC22_REL}). Cualquier alta, cambio de estado o \`Superseded\` se hace **allí**.`);
  out.push('2. **Regenerar el índice** tras editar el Doc 22:');
  out.push('   ```bash');
  out.push('   node scripts/generate-adr-index.mjs');
  out.push('   ```');
  out.push('3. **Validar cobertura** (no destructivo; útil en revisión o CI opcional, AC-05):');
  out.push('   ```bash');
  out.push('   node scripts/generate-adr-index.mjs --check');
  out.push('   ```');
  out.push('   Falla (exit 1) si el índice quedó desactualizado (EC-01) o si algún ADR del inventario');
  out.push('   no tiene su sección detallada. La validación es **no bloqueante** por diseño (se sugiere');
  out.push('   `continue-on-error: true` si se cablea en un workflow).');
  out.push('4. **`Superseded` (EC-02):** el estado se copia verbatim del Doc 22 y el ADR que lo reemplaza');
  out.push('   (p. ej. `ADR-DEVOPS-008`) queda **enlazado** automáticamente a su ancla.');
  out.push('');
  out.push('> Los anclas se derivan con el mismo algoritmo de slug de GitHub aplicado al encabezado');
  out.push('> `## <id> — <título>` del Doc 22, por lo que la navegación permanece estable mientras el');
  out.push('> título no cambie. Si un título cambia en el Doc 22, regenerar este índice actualiza el ancla.');
  out.push('');

  // Nota de cobertura de headings (consistencia).
  const missing = adrs.filter((a) => !headings.has(a.id));
  if (missing.length > 0) {
    out.push('> ⚠️ ADRs del inventario **sin** sección detallada en el Doc 22: ' +
      missing.map((a) => a.id).join(', ') + '.');
    out.push('');
  }

  return out.join('\n') + '\n';
}

// --- Ejecución --------------------------------------------------------------

function main() {
  const check = process.argv.includes('--check');
  const doc = readFileSync(DOC22_PATH, 'utf8');
  const adrs = parseInventory(doc);
  const headings = detailedHeadingIds(doc);

  if (adrs.length === 0) {
    console.error('[adr-index] ERROR: el inventario del Doc 22 está vacío o no se pudo parsear.');
    process.exit(1);
  }

  const content = buildIndex(adrs, headings);

  // Validación de cobertura (ambas direcciones).
  const problems = [];
  for (const a of adrs) {
    if (!headings.has(a.id)) {
      problems.push(`inventario tiene ${a.id} pero falta su sección "## ${a.id} — ..." en el Doc 22`);
    } else if (headings.get(a.id) !== a.title) {
      problems.push(`título de ${a.id} difiere entre inventario ("${a.title}") y sección detallada ("${headings.get(a.id)}")`);
    }
  }
  const inventoryIds = new Set(adrs.map((a) => a.id));
  for (const id of headings.keys()) {
    if (!inventoryIds.has(id)) {
      problems.push(`sección detallada ${id} no está en el inventario "## 6"`);
    }
  }

  const accepted = adrs.filter((a) => a.status === 'Accepted').length;
  if (accepted < 5) {
    problems.push(`sólo ${accepted} ADRs Accepted (<5, VR-01)`);
  }

  if (check) {
    let current = '';
    try {
      current = readFileSync(INDEX_PATH, 'utf8');
    } catch {
      problems.push(`el índice ${INDEX_PATH} no existe (ejecutar sin --check para generarlo)`);
    }
    if (current && current !== content) {
      problems.push('el índice en disco está DESACTUALIZADO respecto al Doc 22 (regenerar)');
    }
    if (problems.length > 0) {
      console.error('[adr-index] --check FALLÓ:');
      for (const p of problems) console.error('  - ' + p);
      process.exit(1);
    }
    console.log(`[adr-index] OK: ${adrs.length} ADRs (${accepted} Accepted); índice sincronizado y con cobertura completa.`);
    return;
  }

  writeFileSync(INDEX_PATH, content, 'utf8');
  console.log(`[adr-index] índice generado: ${adrs.length} ADRs (${accepted} Accepted) → management/artifacts/ADR-Index.md`);
  if (problems.length > 0) {
    console.warn('[adr-index] advertencias de cobertura:');
    for (const p of problems) console.warn('  - ' + p);
  }
}

main();
