// US-121 / SEC-003 (AC-01, AC-06) — guard backend-only. Verifica que el módulo PromptRegistry no
// introduce superficie HTTP (Express/router/controller) ni edición dinámica de prompts: los prompts
// se editan por cambio de código + nueva versión (ADR-AI-006), no vía endpoint ni DB.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const registryDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/modules/ai-assistance/infrastructure/prompt-registry',
);

function collectTsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectTsFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

describe('US-121 SEC-003 — PromptRegistry es backend-only sin superficie HTTP ni edición dinámica', () => {
  const files = collectTsFiles(registryDir);

  it('encuentra los archivos del módulo prompt-registry', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('ningún archivo importa express ni define routers/controllers', () => {
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(/from ['"]express['"]/);
      expect(src).not.toMatch(/\bRouter\(\)/);
      expect(src).not.toMatch(/\.(get|post|put|patch|delete)\(['"]\//);
    }
  });

  it('no expone API mutable de edición dinámica (no PrismaClient ni upsert de prompts en runtime)', () => {
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      // El registry es estático en código; el export es metadata, no persistencia mutable.
      expect(src).not.toMatch(/new PrismaClient/);
      expect(src).not.toMatch(/prisma\.aIPromptVersion\.(update|upsert|delete)/);
    }
  });
});
