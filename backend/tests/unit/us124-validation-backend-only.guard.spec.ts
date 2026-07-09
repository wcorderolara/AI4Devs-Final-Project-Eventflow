// US-124 / AUTH-TS-01 (AC-02, AC-09) — guard backend-only. La capa de validación de output no
// introduce superficie HTTP (Express/router/controller) ni persistencia directa.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/modules/ai-assistance/application/ai-validation',
);

function tsFiles(d: string): string[] {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const full = join(d, e.name);
    if (e.isDirectory()) return tsFiles(full);
    return e.name.endsWith('.ts') ? [full] : [];
  });
}

describe('US-124 — validación de output es backend-only sin superficie HTTP', () => {
  const files = tsFiles(dir);

  it('encuentra los archivos del módulo ai-validation', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('ningún archivo importa express/router ni PrismaClient (sin persistencia directa)', () => {
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(/from ['"]express['"]/);
      expect(src).not.toMatch(/\bRouter\(\)/);
      expect(src).not.toMatch(/new PrismaClient/);
    }
  });
});
