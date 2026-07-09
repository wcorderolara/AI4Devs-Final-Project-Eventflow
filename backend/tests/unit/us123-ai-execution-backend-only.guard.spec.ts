// US-123 / SEC-003, AUTH-TS-01 (AC-03, AC-06) — guard backend-only. La capa de ejecución AI no
// introduce superficie HTTP (Express/router/controller) ni permite activar fallback desde frontend.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const execDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/modules/ai-assistance/application/ai-execution',
);

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return tsFiles(full);
    return e.name.endsWith('.ts') ? [full] : [];
  });
}

describe('US-123 SEC-003 — AI execution es backend-only sin superficie HTTP', () => {
  const files = tsFiles(execDir);

  it('encuentra los archivos del módulo ai-execution', () => {
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
});
