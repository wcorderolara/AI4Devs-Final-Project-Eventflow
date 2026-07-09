import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

/**
 * Tests de integración US-101 (QA-002..QA-005) contra PostgreSQL real (Docker local / CI service).
 * Requieren una BD con las migraciones aplicadas (`migrate deploy`). Si no hay BD alcanzable
 * (p. ej. jobs CI estructurales con DATABASE_URL dummy), la suite hace **skip** de forma limpia.
 */

const prisma = new PrismaClient();

// Sonda de conectividad (rápida) para decidir skip sin colgar CI.
let dbUp = false;
try {
  await Promise.race([
    prisma.$queryRawUnsafe('SELECT 1'),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
  ]);
  dbUp = true;
} catch {
  dbUp = false;
}

type PgIndexRow = { indexname: string; indexdef: string };

describe.skipIf(!dbUp)('US-101 integración: índices críticos (pg_indexes)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── QA-002 (AC-02, NT-01): índice funcional + unicidad case-insensitive ──
  describe('QA-002: uq_users_email_lower', () => {
    const A = 'qa101_ana@eventflow.demo';
    const B = 'QA101_Ana@eventflow.demo';

    beforeAll(async () => {
      await prisma.$executeRawUnsafe(`DELETE FROM users WHERE lower(email) = lower('${A}')`);
    });
    afterAll(async () => {
      await prisma.$executeRawUnsafe(`DELETE FROM users WHERE lower(email) = lower('${A}')`);
    });

    it('existe como UNIQUE sobre LOWER(email)', async () => {
      const rows = await prisma.$queryRawUnsafe<PgIndexRow[]>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'uq_users_email_lower'`,
      );
      expect(rows.length).toBe(1);
      expect(rows[0]!.indexdef.toLowerCase()).toContain('unique');
      expect(rows[0]!.indexdef.toLowerCase()).toContain('lower(email)');
    });

    it('rechaza email duplicado en distinto case (unique violation)', async () => {
      await prisma.$executeRawUnsafe(
        `INSERT INTO users (id,email,password_hash,role,updated_at) VALUES (gen_random_uuid(),'${A}','x','organizer',now())`,
      );
      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO users (id,email,password_hash,role,updated_at) VALUES (gen_random_uuid(),'${B}','x','organizer',now())`,
        ),
      ).rejects.toThrow();
    });
  });

  // ── QA-003 (AC-03): 12 índices parciales con predicados exactos ──
  // PostgreSQL normaliza el DDL (IN → `= ANY (ARRAY[...::"Enum"])`, casts explícitos),
  // por lo que se verifica de forma tolerante: tabla + WHERE + literales requeridos presentes.
  describe('QA-003: 12 índices parciales', () => {
    const EXPECTED: { name: string; table: string; contains: string[] }[] = [
      { name: 'idx_events_status_event_date_active', table: 'events', contains: ['event_date', "'active'", "'draft'"] },
      { name: 'idx_events_auto_complete_candidates', table: 'events', contains: ['event_date', "'active'"] },
      { name: 'idx_event_tasks_due_date_pending', table: 'event_tasks', contains: ['due_date', "'pending'"] },
      { name: 'idx_vendor_profiles_status_location', table: 'vendor_profiles', contains: ['location_id', "'approved'"] },
      { name: 'idx_vendor_services_active', table: 'vendor_services', contains: ['vendor_profile_id', 'is_active'] },
      { name: 'idx_service_categories_active', table: 'service_categories', contains: ['is_active'] },
      { name: 'idx_quote_requests_event_category_active', table: 'quote_requests', contains: ['event_id', 'service_category_id', "'sent'", "'viewed'", "'responded'"] },
      { name: 'idx_quotes_valid_until_active', table: 'quotes', contains: ['valid_until', "'sent'"] },
      { name: 'idx_reviews_vendor_status_published', table: 'reviews', contains: ['vendor_profile_id', "'published'"] },
      { name: 'idx_notifications_user_unread', table: 'notifications', contains: ['user_id', "'unread'"] },
      { name: 'idx_attachments_vendor_work_active', table: 'attachments', contains: ['owner_id', 'work_label', "'vendor_work'", "'active'"] },
      { name: 'idx_ai_rec_pending_expires', table: 'ai_recommendations', contains: ['expires_at', "'pending'"] },
    ];

    it('los 12 existen con tabla, columnas y literales de predicado correctos', async () => {
      const rows = await prisma.$queryRawUnsafe<PgIndexRow[]>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public'`,
      );
      const byName = new Map(rows.map((r) => [r.indexname, r.indexdef.toLowerCase()]));
      for (const e of EXPECTED) {
        const def = byName.get(e.name);
        expect(def, `falta índice ${e.name}`).toBeTruthy();
        expect(def!).toContain(`on public.${e.table}`);
        expect(def!).toContain('where');
        for (const token of e.contains) {
          expect(def!, `${e.name} sin token ${token}: ${def}`).toContain(token.toLowerCase());
        }
      }
    });
  });

  // ── QA-004 (AC-04, R-5): cobertura is_seed derivada dinámicamente ──
  describe('QA-004: índices is_seed en toda tabla operativa', () => {
    it('cada tabla con columna is_seed tiene su idx_<tabla>_is_seed parcial', async () => {
      const cols = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
        `SELECT table_name FROM information_schema.columns
         WHERE table_schema='public' AND column_name='is_seed'`,
      );
      expect(cols.length).toBeGreaterThan(0);
      const idx = await prisma.$queryRawUnsafe<PgIndexRow[]>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND indexname LIKE '%\\_is\\_seed'`,
      );
      const idxByTable = new Map(
        idx.map((r) => [r.indexname.replace(/^idx_/, '').replace(/_is_seed$/, ''), r.indexdef]),
      );
      for (const { table_name } of cols) {
        const def = idxByTable.get(table_name);
        expect(def, `tabla ${table_name} sin índice is_seed`).toBeTruthy();
        expect(def!.toLowerCase()).toMatch(/where .*is_seed/);
      }
    });
  });

  // ── QA-005 (AC-05, NT-04): inventario §25 + exclusiones + sin duplicados ──
  describe('QA-005: inventario del catálogo §25', () => {
    it('los 31 índices de US-101 existen (funcional + 12 parciales + 18 is_seed)', async () => {
      const rows = await prisma.$queryRawUnsafe<PgIndexRow[]>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public'`,
      );
      const names = new Set(rows.map((r) => r.indexname));
      expect(names.has('uq_users_email_lower')).toBe(true);
      const isSeed = [...names].filter((n) => /_is_seed$/.test(n));
      expect(isSeed.length).toBe(18);
      const partials = [...names].filter((n) => n.startsWith('idx_') && !n.endsWith('_is_seed'));
      // 12 parciales de negocio + los @@index simples de US-099 (idx_* generados por Prisma)
      expect(partials.length).toBeGreaterThanOrEqual(12);
    });

    it('el índice trigram (diferido §25.1) NO existe', async () => {
      // Nota (US-102): los 4 unique parciales estaban EXCLUIDOS del inventario de US-101 y,
      // tras el merge de US-102, existen legítimamente. Aquí solo se afirma que el índice
      // trigram/GIN sigue diferido (DR-101 Decisión 5). Los 4 uniques se verifican en US-102.
      const rows = await prisma.$queryRawUnsafe<PgIndexRow[]>(
        `SELECT indexname FROM pg_indexes WHERE schemaname='public'`,
      );
      const names = new Set(rows.map((r) => r.indexname));
      expect(names.has('idx_vendor_profiles_business_name_trgm')).toBe(false);
    });

    it('no hay nombres de índice duplicados', async () => {
      const rows = await prisma.$queryRawUnsafe<{ indexname: string }[]>(
        `SELECT indexname, count(*) AS c FROM pg_indexes WHERE schemaname='public'
         GROUP BY indexname HAVING count(*) > 1`,
      );
      expect(rows.length).toBe(0);
    });
  });
});
