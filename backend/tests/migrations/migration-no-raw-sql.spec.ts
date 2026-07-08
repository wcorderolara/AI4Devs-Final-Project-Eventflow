import { describe, it, expect } from 'vitest';
import { allMigrationSql } from './helpers.js';

/**
 * QA-003 (AC-09, VR-04, TS-08, NT-05, NT-06) — La baseline US-100 es schema-only.
 * NO debe contener raw SQL que pertenece a US-101 (índices funcionales/GIN/parciales)
 * ni a US-102 (check constraints, unique parciales, enforcement append-only).
 *
 * Patrones idiomáticos generados por Prisma desde el schema (permitidos):
 *   - `CREATE INDEX ... ON t("col")`            (btree simple desde @@index)
 *   - `CREATE UNIQUE INDEX ... ON t("col")`     (unique simple desde @unique/@@unique)
 *   - FKs con `ON DELETE ... ON UPDATE ...`
 */

/** Patrones raw SQL prohibidos en US-100 (delegados a US-101/US-102). */
const FORBIDDEN_PATTERNS: { label: string; re: RegExp; owner: string }[] = [
  {
    label: 'índice funcional (lower/upper/trim/coalesce)',
    re: /CREATE\s+(?:UNIQUE\s+)?INDEX[^;]*\((?:lower|upper|trim|coalesce)\s*\(/i,
    owner: 'US-101',
  },
  {
    label: 'índice GIN',
    re: /CREATE\s+(?:UNIQUE\s+)?INDEX[^;]*USING\s+gin/i,
    owner: 'US-101',
  },
  {
    label: 'índice parcial (WHERE)',
    re: /CREATE\s+(?:UNIQUE\s+)?INDEX[^;]*\sWHERE\s/i,
    owner: 'US-101 / US-102',
  },
  {
    label: 'check constraint',
    re: /\bCHECK\s*\(/i,
    owner: 'US-102',
  },
  {
    label: 'trigger de enforcement append-only',
    re: /CREATE\s+(?:OR\s+REPLACE\s+)?(?:TRIGGER|FUNCTION)\b/i,
    owner: 'US-102',
  },
];

describe('QA-003: la baseline NO contiene raw SQL de US-101/US-102', () => {
  const migrations = allMigrationSql();

  for (const { file, content } of migrations) {
    describe(file, () => {
      for (const { label, re, owner } of FORBIDDEN_PATTERNS) {
        it(`no contiene ${label} (pertenece a ${owner})`, () => {
          expect(content).not.toMatch(re);
        });
      }
    });
  }

  it('sí contiene índices simples y FKs idiomáticos de Prisma (sanity)', () => {
    const sql = migrations.map((m: { content: string }) => m.content).join('\n');
    expect(sql).toMatch(/CREATE UNIQUE INDEX "users_email_key"/);
    expect(sql).toMatch(/ON DELETE RESTRICT/);
  });
});
