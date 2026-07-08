import { describe, it, expect } from 'vitest';
import {
  initMigrationSql,
  initMigrationDir,
  MVP_TABLES,
  CANONICAL_ENUMS,
} from './helpers.js';

const sql = initMigrationSql();

// ─────────────────────────────────────────────────────────────────────────────
// QA-001 — 19 `CREATE TABLE` presentes (AC-01, NT-01)
// ─────────────────────────────────────────────────────────────────────────────
describe('QA-001: baseline migration crea las 19 tablas MVP', () => {
  it('existe la baseline `<ts>_init/migration.sql` y no está vacía', () => {
    expect(initMigrationDir()).toMatch(/^\d{14}_init$/);
    expect(sql.trim().length).toBeGreaterThan(0);
  });

  it('contiene exactamente 19 sentencias CREATE TABLE', () => {
    const count = (sql.match(/CREATE TABLE /g) ?? []).length;
    expect(count).toBe(19);
  });

  for (const table of MVP_TABLES) {
    it(`declara CREATE TABLE "${table}"`, () => {
      expect(sql).toContain(`CREATE TABLE "${table}" (`);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// QA-002 — 14 enums canónicos presentes (AC-01, AC-05)
// ─────────────────────────────────────────────────────────────────────────────
describe('QA-002: baseline migration declara los 14 enums canónicos', () => {
  for (const enumName of CANONICAL_ENUMS) {
    it(`declara CREATE TYPE "${enumName}" AS ENUM`, () => {
      expect(sql).toContain(`CREATE TYPE "${enumName}" AS ENUM`);
    });
  }

  it('el total de CREATE TYPE es >= 14 (superset por enums auxiliares de US-099)', () => {
    const count = (sql.match(/CREATE TYPE /g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(14);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Foreign keys: ON DELETE RESTRICT por defecto + CASCADE exclusivo (AC-01)
// ─────────────────────────────────────────────────────────────────────────────
describe('Foreign keys: RESTRICT por defecto, CASCADE exclusivo en budget_items.budget_id', () => {
  it('la única FK ON DELETE CASCADE es budget_items.budget_id', () => {
    // `[^;]*?` evita cruzar el `;` que separa cada sentencia ADD CONSTRAINT.
    const cascades = [...sql.matchAll(/ADD CONSTRAINT "([^"]+)"[^;]*?ON DELETE CASCADE/g)].map(
      (m) => m[1],
    );
    expect(cascades).toEqual(['budget_items_budget_id_fkey']);
  });

  it('el resto de FKs usan ON DELETE RESTRICT (una por cada FK excepto la CASCADE)', () => {
    const totalFks = (sql.match(/ADD CONSTRAINT "[^"]+_fkey" FOREIGN KEY/g) ?? []).length;
    const restricts = (sql.match(/ON DELETE RESTRICT/g) ?? []).length;
    expect(totalFks).toBeGreaterThan(0);
    expect(restricts).toBe(totalFks - 1);
  });
});
