import { describe, it, expect } from 'vitest';
import { dbConstraintsMigrationSql, dbConstraintsMigrationDir } from './helpers.js';

/**
 * QA-001 (US-102; AC-01, AC-08, VR-01..VR-03, VR-08, TS-08, NT-09, NT-10) —
 * Test estructural sobre `<ts>_db_constraints/migration.sql`.
 */

const sql = dbConstraintsMigrationSql();

const EXPECTED_CHECKS = [
  'chk_users_email_not_empty',
  'chk_users_password_hash_not_empty',
  'chk_events_guests_count_positive',
  'chk_events_estimated_budget_nonneg',
  'chk_budgets_totals_nonneg',
  'chk_budget_items_amounts_nonneg',
  'chk_vendor_profiles_category_change_max',
  'chk_vendor_profiles_languages_not_empty',
  'chk_vendor_services_base_price_nonneg',
  'chk_service_categories_depth_level',
  'chk_quotes_total_price_nonneg',
  'chk_booking_intents_is_simulated',
  'chk_reviews_rating_range',
  'chk_attachments_size_bytes_nonneg',
  'chk_ai_recommendations_timeout_positive',
  'chk_ai_recommendations_retry_max',
];

const EXPECTED_UNIQUE = [
  'uq_quote_requests_event_vendor_active',
  'uq_quotes_request_active',
  'uq_booking_intents_event_category_confirmed',
  'uq_prompt_versions_active',
];

// Prohibidos en US-102 (DR-102): triggers, REVOKE, índice funcional de US-101, DEFAULT valid_until, GIN, extensiones.
const FORBIDDEN = [
  { label: 'trigger/función', re: /CREATE\s+(?:OR\s+REPLACE\s+)?(?:TRIGGER|FUNCTION)\b/i },
  { label: 'REVOKE', re: /\bREVOKE\b/i },
  { label: 'índice funcional de US-101 (uq_users_email_lower)', re: /uq_users_email_lower/i },
  { label: 'DEFAULT sobre valid_until', re: /valid_until[^;]*DEFAULT/i },
  { label: 'índice GIN', re: /USING\s+gin/i },
  { label: 'CREATE EXTENSION', re: /CREATE\s+EXTENSION/i },
];

const SECRETS = [
  { label: 'DATABASE_URL=', re: /DATABASE_URL\s*=/i },
  { label: 'cadena postgres con credenciales', re: /postgres(?:ql)?:\/\/[^\s"']*:[^\s"'@]+@/i },
];

describe('QA-001: estructura de la migración de constraints', () => {
  it('la migración existe con nombre `<ts>_db_constraints`', () => {
    expect(dbConstraintsMigrationDir()).toMatch(/^\d{14}_db_constraints$/);
    expect(sql.trim().length).toBeGreaterThan(0);
  });

  for (const chk of EXPECTED_CHECKS) {
    it(`declara el check ${chk}`, () => {
      const re = new RegExp(`ADD CONSTRAINT "${chk}" CHECK`, 'i');
      expect(sql).toMatch(re);
    });
  }

  for (const uq of EXPECTED_UNIQUE) {
    it(`declara el unique parcial ${uq} con WHERE`, () => {
      const re = new RegExp(`CREATE UNIQUE INDEX "${uq}"[^;]*\\sWHERE\\s`, 'i');
      expect(sql).toMatch(re);
    });
  }

  it('cada CHECK / UNIQUE INDEX raw va precedido de comentario `-- Raw SQL:` (VR-01)', () => {
    const lines = sql.split('\n');
    const targets = lines
      .map((l, i) => ({ l: l.trim(), i }))
      .filter(({ l }) => /ADD CONSTRAINT "chk_/i.test(l) || /^CREATE UNIQUE INDEX "uq_/i.test(l));
    expect(targets.length).toBe(20);
    for (const { i } of targets) {
      let j = i - 1;
      while (j >= 0 && lines[j]?.trim() === '') j--;
      expect(lines[j]).toMatch(/^--\s*Raw SQL:/i);
    }
  });

  it('naming Doc 18 §7/§13.3 (chk_*/uq_*) en todos los objetos raw (VR-02)', () => {
    const checks = [...sql.matchAll(/ADD CONSTRAINT "([^"]+)" CHECK/gi)].map((m) => m[1]);
    const uniques = [...sql.matchAll(/CREATE UNIQUE INDEX "([^"]+)"[^;]*WHERE/gi)].map((m) => m[1]);
    expect(checks.length).toBe(16);
    expect(uniques.length).toBe(4);
    for (const n of checks) expect(n).toMatch(/^chk_/);
    for (const n of uniques) expect(n).toMatch(/^uq_/);
  });

  for (const { label, re } of FORBIDDEN) {
    it(`NO contiene ${label} (VR-03)`, () => {
      expect(sql).not.toMatch(re);
    });
  }

  for (const { label, re } of SECRETS) {
    it(`NO contiene secreto: ${label} (VR-08)`, () => {
      expect(sql).not.toMatch(re);
    });
  }
});
