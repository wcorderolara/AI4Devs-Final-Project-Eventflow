// Guards estáticos de arquitectura de la capa AI (US-117…US-124), unificados en una tabla.
// Cada regla conserva el título de su describe/it original (antes `usNNN-*.guard.spec.ts`) para
// mantener la trazabilidad con las historias. Escanean el código fuente; no ejecutan nada.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, sep } from 'node:path';

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const srcDir = resolve(backendDir, 'src');
const aiDir = resolve(srcDir, 'modules/ai-assistance');

type Forbidden = readonly [RegExp, string];

/** Archivos `.ts` bajo `dir` (recursivo por defecto). */
function tsFiles(dir: string, recursive = true): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = resolve(dir, e.name);
    if (e.isDirectory()) return recursive ? tsFiles(full) : [];
    return e.name.endsWith('.ts') ? [full] : [];
  });
}

const read = (file: string): string => readFileSync(file, 'utf8');

/** Ningún archivo contiene alguno de los patrones prohibidos. */
function expectClean(files: string[], forbidden: readonly Forbidden[]): void {
  for (const file of files) {
    const src = read(file);
    for (const [pattern, label] of forbidden) {
      expect(pattern.test(src), `${relative(backendDir, file)} viola: ${label}`).toBe(false);
    }
  }
}

function expectFound(files: string[]): void {
  expect(files.length).toBeGreaterThan(0);
}

const SDK_OPENAI: Forbidden = [/\bfrom\s+['"]openai['"]/, 'SDK openai'];
const SDK_ANTHROPIC: Forbidden = [/\bfrom\s+['"]@anthropic-ai\/sdk['"]/, 'SDK @anthropic-ai/sdk'];
const REQUIRE_OPENAI: Forbidden = [/\brequire\(\s*['"]openai['"]\s*\)/, 'require SDK openai'];
const REQUIRE_ANTHROPIC: Forbidden = [/\brequire\(\s*['"]@anthropic-ai\/sdk['"]\s*\)/, 'require SDK @anthropic-ai/sdk'];
const FETCH: Forbidden = [/\bfetch\s*\(/, 'llamada fetch (red)'];
const ANTHROPIC_KEY: Forbidden = [/\bANTHROPIC_API_KEY\b/, 'secret ANTHROPIC_API_KEY'];
const EXPRESS: Forbidden = [/from ['"]express['"]/, 'import express'];
const ROUTER: Forbidden = [/\bRouter\(\)/, 'Router()'];
const ROUTES: Forbidden = [/\.(get|post|put|patch|delete)\(['"]\//, 'definición de ruta HTTP'];
const NEW_PRISMA: Forbidden = [/new PrismaClient/, 'new PrismaClient'];

const portsDir = resolve(aiDir, 'ports');
const CONTRACT_FILES = ['ai-contract.ts', 'llm-provider.ts', 'index.ts', 'ai-recommendation.repository.ts'];
const OPENAI_ALLOWED_DIR = ['infrastructure', 'providers', 'openai'].join(sep);
const OPENAI_SDK_IMPORT = /\b(?:from\s+['"]openai['"]|require\(\s*['"]openai['"]\s*\))/;
const US122_FILES = [
  'application/persist-ai-recommendation.service.ts',
  'application/ai-recommendation-payload-sanitizer.ts',
  'application/ai-recommendation-persist-logger.ts',
  'infrastructure/ai-prompt-version-sync.ts',
  'domain/errors/ai-recommendation-persistence.errors.ts',
].map((rel) => resolve(aiDir, rel));

const files = {
  srcAll: () => tsFiles(srcDir),
  mock: () => tsFiles(resolve(aiDir, 'infrastructure/providers/mock'), false),
  anthropic: () => tsFiles(resolve(aiDir, 'infrastructure/providers/anthropic'), false),
  promptRegistry: () => tsFiles(resolve(aiDir, 'infrastructure/prompt-registry')),
  aiExecution: () => tsFiles(resolve(aiDir, 'application/ai-execution')),
  aiValidation: () => tsFiles(resolve(aiDir, 'application/ai-validation')),
};

interface GuardRule {
  describe: string;
  its: ReadonlyArray<readonly [string, () => void]>;
}

const RULES: GuardRule[] = [
  {
    // US-117 / SEC-002, QA-004 — AC-07 / EC-03 / NT-01 / SEC-TS-02.
    describe: 'US-117 AC-07 — el puerto no importa SDKs, browser APIs ni frontend',
    its: CONTRACT_FILES.map((file) => [
      `${file} está libre de imports prohibidos`,
      () =>
        expectClean([resolve(portsDir, file)], [
          SDK_OPENAI,
          SDK_ANTHROPIC,
          REQUIRE_OPENAI,
          REQUIRE_ANTHROPIC,
          [/\bwindow\./, 'browser API window'],
          [/\bdocument\./, 'browser API document'],
          [/\blocalStorage\b/, 'browser API localStorage'],
          [/\bnavigator\b/, 'browser API navigator'],
          [/\/(interface|infrastructure)\//, 'import de capa interface/infrastructure'],
        ]),
    ] as const),
  },
  {
    // US-118 / SEC-002, QA-006 — AC-01/AC-08, VR-06, ADR-AI-001.
    describe: 'US-118 AC-01/AC-08 — boundary del SDK OpenAI',
    its: [
      ['encuentra archivos fuente para escanear', () => expectFound(files.srcAll())],
      [
        'el paquete `openai` sólo se importa bajo infrastructure/providers/openai/',
        () => {
          const offenders = files
            .srcAll()
            .filter((f) => OPENAI_SDK_IMPORT.test(read(f)) && !f.includes(OPENAI_ALLOWED_DIR));
          expect(offenders.map((f) => relative(srcDir, f))).toEqual([]);
        },
      ],
    ],
  },
  {
    // US-119 / SEC-001, QA-005 — AC-06 / VR-04/VR-05.
    describe: 'US-119 AC-06 — el mock no usa red, SDKs externos ni secrets',
    its: [
      [
        'los archivos del mock están libres de red/SDK/secrets',
        () =>
          expectClean(files.mock(), [
            SDK_OPENAI,
            SDK_ANTHROPIC,
            [/\bfrom\s+['"]node:https?['"]/, 'cliente HTTP node'],
            FETCH,
            [/\bOPENAI_API_KEY\b/, 'secret OPENAI_API_KEY'],
            ANTHROPIC_KEY,
          ]),
      ],
    ],
  },
  {
    // US-120 / SEC-001, QA-003 — AC-03/AC-08 / VR-03/04/05.
    describe: 'US-120 AC-03/AC-08 — el stub no usa SDK Anthropic, secrets ni red',
    its: [
      [
        'los archivos del stub están libres de SDK/secret/red',
        () => {
          const anthropic = files.anthropic();
          expectFound(anthropic);
          expectClean(anthropic, [SDK_ANTHROPIC, REQUIRE_ANTHROPIC, ANTHROPIC_KEY, FETCH]);
        },
      ],
      [
        'el paquete `@anthropic-ai/sdk` no está declarado como dependencia',
        () => {
          const pkg = JSON.parse(read(resolve(backendDir, 'package.json'))) as {
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
          };
          expect(pkg.dependencies?.['@anthropic-ai/sdk']).toBeUndefined();
          expect(pkg.devDependencies?.['@anthropic-ai/sdk']).toBeUndefined();
        },
      ],
    ],
  },
  {
    // US-121 / SEC-003 (AC-01, AC-06) — prompts editables sólo por código + nueva versión (ADR-AI-006).
    describe: 'US-121 SEC-003 — PromptRegistry es backend-only sin superficie HTTP ni edición dinámica',
    its: [
      ['encuentra los archivos del módulo prompt-registry', () => expectFound(files.promptRegistry())],
      [
        'ningún archivo importa express ni define routers/controllers',
        () => expectClean(files.promptRegistry(), [EXPRESS, ROUTER, ROUTES]),
      ],
      [
        'no expone API mutable de edición dinámica (no PrismaClient ni upsert de prompts en runtime)',
        () =>
          expectClean(files.promptRegistry(), [
            NEW_PRISMA,
            [/prisma\.aIPromptVersion\.(update|upsert|delete)/, 'mutación de aIPromptVersion'],
          ]),
      ],
    ],
  },
  {
    // US-122 / SEC-004 (AC-02, AC-09).
    describe: 'US-122 SEC-004 — persistencia backend-only sin superficie HTTP',
    its: [
      [
        'ningún archivo de US-122 importa express ni define routers/controllers',
        () => expectClean(US122_FILES, [EXPRESS, ROUTER, ROUTES]),
      ],
      [
        'el service no expone accept/edit/discard (HITL downstream fuera de US-122)',
        () =>
          expectClean(
            [resolve(aiDir, 'application/persist-ai-recommendation.service.ts')],
            [[/\b(accept|edit|discard|reject)Recommendation\b/i, 'accept/edit/discard/reject']],
          ),
      ],
    ],
  },
  {
    // US-123 / SEC-003, AUTH-TS-01 (AC-03, AC-06).
    describe: 'US-123 SEC-003 — AI execution es backend-only sin superficie HTTP',
    its: [
      ['encuentra los archivos del módulo ai-execution', () => expectFound(files.aiExecution())],
      [
        'ningún archivo importa express ni define routers/controllers',
        () => expectClean(files.aiExecution(), [EXPRESS, ROUTER, ROUTES]),
      ],
    ],
  },
  {
    // US-124 / AUTH-TS-01 (AC-02, AC-09).
    describe: 'US-124 — validación de output es backend-only sin superficie HTTP',
    its: [
      ['encuentra los archivos del módulo ai-validation', () => expectFound(files.aiValidation())],
      [
        'ningún archivo importa express/router ni PrismaClient (sin persistencia directa)',
        () => expectClean(files.aiValidation(), [EXPRESS, ROUTER, NEW_PRISMA]),
      ],
    ],
  },
];

for (const rule of RULES) {
  describe(rule.describe, () => {
    for (const [title, check] of rule.its) it(title, check);
  });
}
