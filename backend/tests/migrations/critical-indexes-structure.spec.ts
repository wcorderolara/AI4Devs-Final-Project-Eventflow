import { describe, it, expect } from 'vitest';
import { criticalIndexesMigrationSql, criticalIndexesMigrationDir } from './helpers.js';

/**
 * QA-001 (US-101; AC-01, AC-08, VR-01..VR-03, TS-08, NT-02, NT-03, NT-06) —
 * Test estructural sobre la migración `<ts>_critical_indexes/migration.sql`:
 * comentarios `-- Raw SQL:`, naming `idx_*`/`uq_*`, y ausencia de artefactos de otras historias.
 */

const sql = criticalIndexesMigrationSql();

// Los 12 índices parciales de negocio (AC-03) + el funcional.
const EXPECTED_PARTIAL = [
  'idx_events_status_event_date_active',
  'idx_events_auto_complete_candidates',
  'idx_event_tasks_due_date_pending',
  'idx_vendor_profiles_status_location',
  'idx_vendor_services_active',
  'idx_service_categories_active',
  'idx_quote_requests_event_category_active',
  'idx_quotes_valid_until_active',
  'idx_reviews_vendor_status_published',
  'idx_notifications_user_unread',
  'idx_attachments_vendor_work_active',
  'idx_ai_rec_pending_expires',
];

// Patrones prohibidos (pertenecen a US-102 o están diferidos).
const FORBIDDEN = [
  { label: 'unique parcial (CREATE UNIQUE INDEX ... WHERE) — US-102', re: /CREATE\s+UNIQUE\s+INDEX[^;]*\sWHERE\s/i },
  { label: 'check constraint — US-102', re: /\bCHECK\s*\(/i },
  { label: 'trigger / función — US-102', re: /CREATE\s+(?:OR\s+REPLACE\s+)?(?:TRIGGER|FUNCTION)\b/i },
  { label: 'CREATE EXTENSION (pg_trgm) — diferido', re: /CREATE\s+EXTENSION/i },
  { label: 'índice GIN — diferido', re: /USING\s+gin/i },
];

const SECRETS = [
  { label: 'DATABASE_URL=', re: /DATABASE_URL\s*=/i },
  { label: 'cadena postgres con credenciales', re: /postgres(?:ql)?:\/\/[^\s"']*:[^\s"'@]+@/i },
];

describe('QA-001: estructura de la migración de índices críticos', () => {
  it('la migración existe con nombre `<ts>_critical_indexes`', () => {
    expect(criticalIndexesMigrationDir()).toMatch(/^\d{14}_critical_indexes$/);
    expect(sql.trim().length).toBeGreaterThan(0);
  });

  it('el índice funcional único uq_users_email_lower está presente (LOWER(email))', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX "uq_users_email_lower" ON "users" \(LOWER\("email"\)\)/i);
  });

  for (const idx of EXPECTED_PARTIAL) {
    it(`declara el índice parcial ${idx} con WHERE`, () => {
      const re = new RegExp(`CREATE INDEX "${idx}"[^;]*\\sWHERE\\s`, 'i');
      expect(sql).toMatch(re);
    });
  }

  it('cada CREATE INDEX/UNIQUE INDEX va precedido de un comentario `-- Raw SQL:` (VR-01)', () => {
    // Todo statement CREATE ... INDEX debe tener un comentario raw SQL en la línea previa no vacía.
    const lines = sql.split('\n');
    const createLines = lines
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => /^CREATE (UNIQUE )?INDEX/i.test(l.trim()));
    expect(createLines.length).toBeGreaterThanOrEqual(31);
    for (const { i } of createLines) {
      // buscar hacia atrás la línea previa no vacía
      let j = i - 1;
      while (j >= 0 && lines[j]?.trim() === '') j--;
      expect(lines[j]).toMatch(/^--\s*Raw SQL:/i);
    }
  });

  it('todos los índices siguen el naming Doc 18 §7 (idx_* o uq_*) (VR-02)', () => {
    const names = [...sql.matchAll(/CREATE (?:UNIQUE )?INDEX "([^"]+)"/gi)].map((m) => m[1]);
    expect(names.length).toBeGreaterThanOrEqual(31);
    for (const n of names) {
      expect(n).toMatch(/^(idx|uq)_/);
    }
  });

  for (const { label, re } of FORBIDDEN) {
    it(`NO contiene ${label} (VR-03)`, () => {
      expect(sql).not.toMatch(re);
    });
  }

  for (const { label, re } of SECRETS) {
    it(`NO contiene secreto: ${label} (VR-07)`, () => {
      expect(sql).not.toMatch(re);
    });
  }
});
