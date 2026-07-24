#!/usr/bin/env node
// Generador/validador de la matriz canónica de trazabilidad US ↔ FRD/UC/BR/NFR/ADR
// (US-148 / PB-P2-025).
//
// Fuente de verdad ÚNICA: la sección `## 🔗 Traceability` y la metadata de cada User Story en
// `management/user-stories/US-*.md`. Este script NO inventa IDs (VR-03): copia verbatim lo que
// cada US declara. Consolida el 100% de las US en
// `management/artifacts/User-Stories-Traceability-Matrix.md`. Es el mecanismo que mantiene la
// matriz "viva" (AC-04) y la validación de cobertura (AC-05).
//
// Uso:
//   node scripts/generate-traceability-matrix.mjs           # (re)genera la matriz en disco
//   node scripts/generate-traceability-matrix.mjs --check   # NO escribe; falla (exit 1) si la
//                                                           # matriz está desactualizada o incompleta
//
// Sin dependencias externas: Node >= 18, ESM puro.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const US_DIR = resolve(REPO_ROOT, 'management/user-stories');
const MATRIX_PATH = resolve(REPO_ROOT, 'management/artifacts/User-Stories-Traceability-Matrix.md');
// Enlace relativo desde `management/artifacts/` hacia `management/user-stories/`.
const US_REL_DIR = '../user-stories';

// Etiquetas de fila de la sección Traceability que consolidamos (se comparan tras `trim`).
const ROW_LABELS = {
  frd: 'FRD Requirement(s)',
  uc: 'Use Case(s)',
  br: 'Business Rule(s)',
  nfr: 'NFR Reference(s)',
  adr: 'Related ADR(s)',
};

/** Lista de archivos de User Story (excluye README y subdirectorios como decision-resolutions). */
function listUserStoryFiles() {
  return readdirSync(US_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && /^US-\d+.*\.md$/.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => usNumber(a) - usNumber(b));
}

/** Extrae el número de US desde un nombre de archivo o ID (`US-007-...` → 7). */
function usNumber(s) {
  const m = s.match(/US-(\d+)/);
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
}

/** Devuelve el bloque de líneas de una sección `## <título>` hasta el próximo `## `. */
function sectionLines(lines, headingMatcher) {
  const start = lines.findIndex((l) => /^##\s/.test(l) && headingMatcher(l));
  if (start === -1) return [];
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out;
}

/** Parsea una fila de tabla Markdown `| a | b |` a celdas (sin las barras extremas). */
function parseRow(line) {
  const t = line.trim();
  if (!t.startsWith('|')) return null;
  return t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

/** Mapa etiqueta→valor de una tabla `| Field | Value |` dentro de un bloque de líneas. */
function tableToMap(blockLines) {
  const map = new Map();
  for (const line of blockLines) {
    const cells = parseRow(line);
    if (!cells || cells.length < 2) continue;
    if (/^-+$/.test(cells[0].replace(/[:\s]/g, '-'))) continue; // separador |---|
    map.set(cells[0], cells.slice(1).join(' | ').trim());
  }
  return map;
}

/** Normaliza el contenido de una celda para la matriz (colapsa espacios, escapa `|`). */
function cell(value) {
  const v = (value ?? '').replace(/\s+/g, ' ').trim();
  if (v === '' || v === '—' || v === '-') return '—';
  return v.replace(/\|/g, '\\|');
}

/** ¿La US es transversal? (no declara ningún ID real FR-/UC-/BR- en FRD+UC+BR). */
function isTransversal(frd, uc, br) {
  const joined = `${frd} ${uc} ${br}`;
  return !/\b(FR-[A-Z]|UC-[A-Z]|BR-[A-Z])/.test(joined);
}

/** Extrae el registro de trazabilidad de una User Story. */
function parseUserStory(fileName) {
  const raw = readFileSync(resolve(US_DIR, fileName), 'utf8');
  const lines = raw.split('\n');

  const id = (fileName.match(/US-\d+/) || ['?'])[0];

  // Título: primer `# ` — formato `# 🧾 User Story: <título>`.
  const h1 = lines.find((l) => /^#\s/.test(l)) ?? '';
  const title = h1.replace(/^#\s+/, '').replace(/^🧾\s*/, '').replace(/^User Story:\s*/i, '').trim();

  const meta = tableToMap(sectionLines(lines, (l) => /Metadata/.test(l)));
  const trace = tableToMap(sectionLines(lines, (l) => /Traceability/.test(l)));

  const get = (map, label) => {
    for (const [k, v] of map) if (k.trim() === label) return v;
    return '';
  };

  const frd = get(trace, ROW_LABELS.frd);
  const uc = get(trace, ROW_LABELS.uc);
  const br = get(trace, ROW_LABELS.br);
  const nfr = get(trace, ROW_LABELS.nfr);
  const adr = get(trace, ROW_LABELS.adr);

  return {
    id,
    num: usNumber(id),
    title,
    epic: get(meta, 'Epic'),
    feature: get(meta, 'Feature'),
    backlog: get(meta, 'Backlog Item'),
    frd,
    uc,
    br,
    nfr,
    adr,
    hasTraceability: trace.size > 0,
    transversal: isTransversal(frd, uc, br),
    metaId: get(meta, 'ID'),
  };
}

/** Recorta un texto largo para la columna Epic·Feature manteniéndolo legible. */
function epicFeature(us) {
  const epicCode = (us.epic.match(/EPIC-[A-Z0-9-]+/) || [us.epic])[0];
  const feat = us.feature ? ` · ${us.feature}` : '';
  return cell(`${epicCode}${feat}`);
}

/** Construye el contenido Markdown de la matriz. */
function buildMatrix(stories) {
  const total = stories.length;
  const transversal = stories.filter((s) => s.transversal).length;
  const funcional = total - transversal;

  const out = [];
  out.push('<!-- GENERADO por scripts/generate-traceability-matrix.mjs — NO editar a mano. -->');
  out.push('<!-- Fuente de verdad: la sección "## 🔗 Traceability" y la metadata de cada management/user-stories/US-*.md. -->');
  out.push('<!-- Regenerar: `node scripts/generate-traceability-matrix.mjs`; validar: `node scripts/generate-traceability-matrix.mjs --check`. -->');
  out.push('');
  out.push('# 🧭 Matriz canónica de trazabilidad — User Stories ↔ FRD/UC/BR/NFR/ADR');
  out.push('');
  out.push('> Matriz de trazabilidad de EventFlow: cada User Story mapeada a sus **FRD / UC / BR / NFR /');
  out.push('> ADR** de origen, derivada automáticamente de la sección `Traceability` de cada US');
  out.push(`> ([\`management/user-stories/\`](${US_REL_DIR})). Evidencia académica (EPIC-ACAD-001, US-148 /`);
  out.push('> PB-P2-025). **No reemplaza** las User Stories ni los documentos fuente; los consolida.');
  out.push('>');
  out.push('> Complementa a [`2-User-Stories-Coverage-Matrix.md`](2-User-Stories-Coverage-Matrix.md)');
  out.push('> (Epic → Feature → US) aportando la trazabilidad detallada hacia requisitos.');
  out.push('');
  out.push('## Resumen');
  out.push('');
  out.push('| Métrica | Valor |');
  out.push('| --- | ---: |');
  out.push(`| User Stories totales (cobertura) | ${total} |`);
  out.push(`| Funcionales (declaran ≥1 FR-/UC-/BR-) | ${funcional} |`);
  out.push(`| Transversales / foundation | ${transversal} |`);
  out.push('');
  out.push('> Cobertura objetivo: **100%** de las US del backlog (VR-01). Estado actual: **' + total + ' US**.');
  out.push('> `Tipo` = `Transversal` cuando la US no declara ningún ID FR-/UC-/BR- (EC-01); en caso');
  out.push('> contrario `Funcional`. Los valores se copian **verbatim** de cada US (sin inventar IDs, VR-03).');
  out.push('');
  out.push('## Matriz');
  out.push('');
  out.push('| US | Título | Epic · Feature | FRD | UC | BR | NFR | ADR | Tipo |');
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const s of stories) {
    const fileName = s.fileName;
    const usLink = `[${s.id}](${US_REL_DIR}/${fileName})`;
    const tipo = s.transversal ? 'Transversal' : 'Funcional';
    out.push(
      `| ${usLink} | ${cell(s.title)} | ${epicFeature(s)} | ${cell(s.frd)} | ${cell(s.uc)} | ` +
      `${cell(s.br)} | ${cell(s.nfr)} | ${cell(s.adr)} | ${tipo} |`,
    );
  }
  out.push('');
  out.push('## Mantenimiento y sincronización (matriz viva)');
  out.push('');
  out.push('Esta matriz se mantiene **sincronizada** con las User Stories mediante un generador determinista:');
  out.push('');
  out.push('1. **Fuente de verdad:** la sección `## 🔗 Traceability` y la metadata de cada');
  out.push(`   [\`management/user-stories/US-*.md\`](${US_REL_DIR}). Cualquier alta o cambio de trazabilidad`);
  out.push('   se hace **en la US**, no aquí.');
  out.push('2. **Regenerar la matriz** tras crear o editar una US:');
  out.push('   ```bash');
  out.push('   node scripts/generate-traceability-matrix.mjs');
  out.push('   ```');
  out.push('3. **Validar cobertura** (no destructivo; útil en revisión o CI opcional, AC-05):');
  out.push('   ```bash');
  out.push('   node scripts/generate-traceability-matrix.mjs --check');
  out.push('   ```');
  out.push('   Falla (exit 1) si la matriz quedó desactualizada (EC-02) o si alguna US no aparece.');
  out.push('   La validación es **no bloqueante** por diseño (se sugiere `continue-on-error: true` si');
  out.push('   se cablea en un workflow).');
  out.push('4. **US transversales (EC-01):** se marcan `Transversal` automáticamente cuando no declaran');
  out.push('   ningún ID `FR-`/`UC-`/`BR-`; **no se inventan** IDs (VR-03).');
  out.push('');
  out.push('> Alcance: esta matriz es la parte (b) de PB-P2-025 (US-148). El **índice de ADRs** es la parte');
  out.push('> (a) — ver [`ADR-Index.md`](ADR-Index.md) (US-147). La **validación/reporte de gaps** FRD/UC/BR');
  out.push('> por US es una historia separada (PB-P3-009), fuera de este alcance.');
  out.push('');
  return out.join('\n');
}

// --- Ejecución --------------------------------------------------------------

function main() {
  const check = process.argv.includes('--check');
  const files = listUserStoryFiles();
  if (files.length === 0) {
    console.error('[traceability] ERROR: no se encontraron User Stories en management/user-stories/.');
    process.exit(1);
  }

  const stories = files.map((f) => ({ ...parseUserStory(f), fileName: f }));
  const content = buildMatrix(stories) + '\n';

  // Validación de cobertura/consistencia.
  const problems = [];
  for (const s of stories) {
    if (!s.hasTraceability) problems.push(`${s.id} (${s.fileName}) no tiene sección Traceability`);
    if (!s.title) problems.push(`${s.id} (${s.fileName}) no tiene título H1`);
    if (s.metaId && s.metaId !== s.id) {
      problems.push(`${s.fileName}: ID de metadata (${s.metaId}) difiere del nombre de archivo (${s.id})`);
    }
  }
  // Duplicados de US ID.
  const seen = new Map();
  for (const s of stories) seen.set(s.id, (seen.get(s.id) ?? 0) + 1);
  for (const [id, n] of seen) if (n > 1) problems.push(`US ID duplicado: ${id} (${n} archivos)`);

  if (check) {
    let current = '';
    try {
      current = readFileSync(MATRIX_PATH, 'utf8');
    } catch {
      problems.push(`la matriz ${basename(MATRIX_PATH)} no existe (ejecutar sin --check para generarla)`);
    }
    if (current && current !== content) {
      problems.push('la matriz en disco está DESACTUALIZADA respecto a las User Stories (regenerar)');
    }
    if (problems.length > 0) {
      console.error('[traceability] --check FALLÓ:');
      for (const p of problems) console.error('  - ' + p);
      process.exit(1);
    }
    console.log(`[traceability] OK: ${stories.length} US cubiertas (100%); matriz sincronizada y consistente.`);
    return;
  }

  writeFileSync(MATRIX_PATH, content, 'utf8');
  const transversal = stories.filter((s) => s.transversal).length;
  console.log(
    `[traceability] matriz generada: ${stories.length} US ` +
    `(${stories.length - transversal} funcionales, ${transversal} transversales) → ` +
    'management/artifacts/User-Stories-Traceability-Matrix.md',
  );
  if (problems.length > 0) {
    console.warn('[traceability] advertencias:');
    for (const p of problems) console.warn('  - ' + p);
  }
}

main();
