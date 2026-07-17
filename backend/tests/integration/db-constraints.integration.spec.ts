import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

/**
 * Tests de integración US-102 (QA-002/003/004) contra PostgreSQL real.
 * Verifican rechazo del motor (SQLSTATE 23514 checks / 23505 unique) + coexistencia histórica
 * + definiciones estructurales. Skip limpio si no hay BD alcanzable.
 */

const prisma = new PrismaClient();

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

/** Ejecuta SQL que debe fallar; devuelve el mensaje de error (o '' si no falló). */
async function violation(sql: string): Promise<string> {
  try {
    await prisma.$executeRawUnsafe(sql);
    return '';
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

async function q<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  return prisma.$queryRawUnsafe<T[]>(sql);
}

// IDs del grafo base válido.
const ID: Record<string, string> = {};

describe.skipIf(!dbUp)('US-102 integración: constraints físicos', () => {
  beforeAll(async () => {
    // BD de test dedicada: slate limpio determinista (CASCADE respeta FKs). No toca _prisma_migrations.
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE users, locations, service_categories, event_types, vendor_profiles, vendor_services, attachments, events, event_tasks, budgets, budget_items, quote_requests, quotes, booking_intents, reviews, notifications, admin_actions, ai_recommendations, ai_prompt_versions RESTART IDENTITY CASCADE`,
    );

    // Grafo base válido, capturando UUIDs generados.
    const row = async (sql: string) => (await q<{ id: string }>(sql))[0]!.id;

    ID.user = await row(`INSERT INTO users (id,email,password_hash,role,updated_at) VALUES (gen_random_uuid(),'qa102_org@eventflow.demo','x','organizer',now()) RETURNING id`);
    ID.vuser = await row(`INSERT INTO users (id,email,password_hash,role,updated_at) VALUES (gen_random_uuid(),'qa102_vendor@eventflow.demo','x','vendor',now()) RETURNING id`);
    ID.author = await row(`INSERT INTO users (id,email,password_hash,role,updated_at) VALUES (gen_random_uuid(),'qa102_author@eventflow.demo','x','organizer',now()) RETURNING id`);
    ID.etype = await row(`INSERT INTO event_types (id,code,label,updated_at) VALUES (gen_random_uuid(),'qa102_et','ET',now()) RETURNING id`);
    ID.scat = await row(`INSERT INTO service_categories (id,code,label,depth_level,updated_at) VALUES (gen_random_uuid(),'qa102_sc','SC',1,now()) RETURNING id`);
    ID.vprofile = await row(`INSERT INTO vendor_profiles (id,user_id,business_name,category_change_count,languages_supported,updated_at) VALUES (gen_random_uuid(),'${ID.vuser}','VP',0,ARRAY['es'],now()) RETURNING id`);
    ID.event = await row(`INSERT INTO events (id,user_id,event_type_id,title,updated_at) VALUES (gen_random_uuid(),'${ID.user}','${ID.etype}','E',now()) RETURNING id`);
    ID.budget = await row(`INSERT INTO budgets (id,event_id,updated_at) VALUES (gen_random_uuid(),'${ID.event}',now()) RETURNING id`);
    ID.qreq = await row(`INSERT INTO quote_requests (id,event_id,service_category_id,updated_at) VALUES (gen_random_uuid(),'${ID.event}','${ID.scat}',now()) RETURNING id`);
    // US-058 (PB-P1-035 / DB-002): columnas denormalizadas `event_id`/`service_category_id`
    // ahora son `NOT NULL` en `quotes` y sostienen el UNIQUE parcial de preferred.
    ID.quote = await row(`INSERT INTO quotes (id,quote_request_id,vendor_profile_id,event_id,service_category_id,amount,updated_at) VALUES (gen_random_uuid(),'${ID.qreq}','${ID.vprofile}','${ID.event}','${ID.scat}',100,now()) RETURNING id`);
    ID.booking = await row(`INSERT INTO booking_intents (id,quote_id,event_id,service_category_id,updated_at) VALUES (gen_random_uuid(),'${ID.quote}','${ID.event}','${ID.scat}',now()) RETURNING id`);
    ID.apv = await row(`INSERT INTO ai_prompt_versions (id,prompt_id,prompt_key,version,provider,template_checksum,status,updated_at) VALUES (gen_random_uuid(),gen_random_uuid(),'qa102_k','1','mock','x','active',now()) RETURNING id`);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── QA-002 (AC-04): violación de los 16 checks → 23514 con nombre del constraint ──
  describe('QA-002: rechazo de checks (SQLSTATE 23514)', () => {
    const cases: { name: string; sql: () => string }[] = [
      { name: 'chk_users_email_not_empty', sql: () => `INSERT INTO users (id,email,password_hash,role,updated_at) VALUES (gen_random_uuid(),'','x','organizer',now())` },
      { name: 'chk_users_password_hash_not_empty', sql: () => `INSERT INTO users (id,email,password_hash,role,updated_at) VALUES (gen_random_uuid(),'qa102_pw@eventflow.demo','','organizer',now())` },
      { name: 'chk_events_guests_count_positive', sql: () => `INSERT INTO events (id,user_id,event_type_id,title,guests_count,updated_at) VALUES (gen_random_uuid(),'${ID.user}','${ID.etype}','E',0,now())` },
      { name: 'chk_events_estimated_budget_nonneg', sql: () => `INSERT INTO events (id,user_id,event_type_id,title,estimated_budget,updated_at) VALUES (gen_random_uuid(),'${ID.user}','${ID.etype}','E',-1,now())` },
      { name: 'chk_budgets_totals_nonneg', sql: () => `UPDATE budgets SET total_planned = -1 WHERE id = '${ID.budget}'` },
      { name: 'chk_budget_items_amounts_nonneg', sql: () => `INSERT INTO budget_items (id,budget_id,label,amount_planned,updated_at) VALUES (gen_random_uuid(),'${ID.budget}','x',-1,now())` },
      { name: 'chk_vendor_profiles_category_change_max', sql: () => `UPDATE vendor_profiles SET category_change_count = 6 WHERE id = '${ID.vprofile}'` },
      { name: 'chk_vendor_profiles_languages_not_empty', sql: () => `INSERT INTO vendor_profiles (id,user_id,business_name,category_change_count,languages_supported,updated_at) VALUES (gen_random_uuid(),'${ID.author}','VP2',0,ARRAY[]::text[],now())` },
      { name: 'chk_vendor_services_base_price_nonneg', sql: () => `INSERT INTO vendor_services (id,vendor_profile_id,service_category_id,package_name,description,base_price,updated_at) VALUES (gen_random_uuid(),'${ID.vprofile}','${ID.scat}','x','descripción demo con longitud',-1,now())` },
      { name: 'chk_service_categories_depth_level', sql: () => `INSERT INTO service_categories (id,code,label,depth_level,updated_at) VALUES (gen_random_uuid(),'qa102_sc3','x',3,now())` },
      { name: 'chk_quotes_total_price_nonneg', sql: () => `INSERT INTO quotes (id,quote_request_id,vendor_profile_id,event_id,service_category_id,amount,updated_at) VALUES (gen_random_uuid(),'${ID.qreq}','${ID.vprofile}','${ID.event}','${ID.scat}',-1,now())` },
      { name: 'chk_booking_intents_is_simulated', sql: () => `INSERT INTO booking_intents (id,quote_id,event_id,service_category_id,is_simulated,updated_at) VALUES (gen_random_uuid(),'${ID.quote}','${ID.event}','${ID.scat}',false,now())` },
      { name: 'chk_reviews_rating_range', sql: () => `INSERT INTO reviews (id,booking_intent_id,vendor_profile_id,author_id,rating,comment,updated_at) VALUES (gen_random_uuid(),'${ID.booking}','${ID.vprofile}','${ID.author}',6,'qa102',now())` },
      { name: 'chk_attachments_size_bytes_nonneg', sql: () => `INSERT INTO attachments (id,owner_type,owner_id,url,size_bytes,updated_at) VALUES (gen_random_uuid(),'vendor_work','${ID.vprofile}','http://x',-1,now())` },
      { name: 'chk_ai_recommendations_timeout_positive', sql: () => `INSERT INTO ai_recommendations (id,event_id,ai_prompt_version_id,requested_by_user_id,kind,input_payload,output_payload,timeout_ms,updated_at) VALUES (gen_random_uuid(),'${ID.event}','${ID.apv}','${ID.user}','qa102','{}','{}',0,now())` },
      { name: 'chk_ai_recommendations_retry_max', sql: () => `INSERT INTO ai_recommendations (id,event_id,ai_prompt_version_id,requested_by_user_id,kind,input_payload,output_payload,retry_count,updated_at) VALUES (gen_random_uuid(),'${ID.event}','${ID.apv}','${ID.user}','qa102','{}','{}',2,now())` },
    ];

    for (const c of cases) {
      it(`${c.name} rechaza la violación (23514)`, async () => {
        const msg = await violation(c.sql());
        expect(msg, `esperaba violación de ${c.name}`).toContain(c.name);
        expect(msg).toMatch(/23514/);
      });
    }

    it('casos de frontera válidos (rating 1 y 5) son aceptados', async () => {
      for (const r of [1, 5]) {
        const msg = await violation(
          `INSERT INTO reviews (id,booking_intent_id,vendor_profile_id,author_id,rating,comment,updated_at) VALUES (gen_random_uuid(),'${ID.booking}','${ID.vprofile}','${ID.author}',${r},'qa102',now())`,
        );
        expect(msg, `rating ${r} debería ser válido: ${msg}`).toBe('');
      }
    });

    it('NULL en columna nullable (size_bytes) pasa el check', async () => {
      const msg = await violation(
        `INSERT INTO attachments (id,owner_type,owner_id,url,updated_at) VALUES (gen_random_uuid(),'vendor_work','${ID.vprofile}','http://x',now())`,
      );
      expect(msg).toBe('');
    });
  });

  // ── QA-003 (AC-05): unique parciales — duplicado activo rechazado, histórico permitido ──
  describe('QA-003: unique parciales (23505) + coexistencia histórica', () => {
    it('uq_quotes_request_active: 2ª quote vigente misma request → 23505; permitida si la previa está rejected', async () => {
      // La quote base (ID.quote) ya está 'draft' (dentro del predicado NOT IN expired/rejected).
      const dup = await violation(
        `INSERT INTO quotes (id,quote_request_id,vendor_profile_id,event_id,service_category_id,amount,updated_at) VALUES (gen_random_uuid(),'${ID.qreq}','${ID.vprofile}','${ID.event}','${ID.scat}',50,now())`,
      );
      // Postgres reporta las columnas del índice único, no su nombre.
      expect(dup).toMatch(/23505/);
      expect(dup).toContain('quote_request_id');
      // Coexistencia histórica: con TODAS las quotes de la request fuera del predicado
      // (rejected/expired), una nueva vigente SÍ entra.
      await prisma.$executeRawUnsafe(`UPDATE quotes SET status = 'rejected' WHERE quote_request_id = '${ID.qreq}'`);
      const ok = await violation(
        `INSERT INTO quotes (id,quote_request_id,vendor_profile_id,event_id,service_category_id,amount,status,updated_at) VALUES (gen_random_uuid(),'${ID.qreq}','${ID.vprofile}','${ID.event}','${ID.scat}',60,'draft',now())`,
      );
      expect(ok, `coexistencia histórica debería permitirse: ${ok}`).toBe('');
    });

    it('uq_prompt_versions_active: 2ª versión activa mismo prompt_id → 23505; permitida si la previa está deprecated', async () => {
      const pid = (await q<{ prompt_id: string }>(`SELECT prompt_id FROM ai_prompt_versions WHERE id = '${ID.apv}'`))[0]!.prompt_id;
      const dup = await violation(
        `INSERT INTO ai_prompt_versions (id,prompt_id,prompt_key,version,provider,template_checksum,status,updated_at) VALUES (gen_random_uuid(),'${pid}','qa102_k','2','mock','x','active',now())`,
      );
      expect(dup).toMatch(/23505/);
      expect(dup).toContain('prompt_id');
      await prisma.$executeRawUnsafe(`UPDATE ai_prompt_versions SET status = 'deprecated' WHERE id = '${ID.apv}'`);
      const ok = await violation(
        `INSERT INTO ai_prompt_versions (id,prompt_id,prompt_key,version,provider,template_checksum,status,updated_at) VALUES (gen_random_uuid(),'${pid}','qa102_k','3','mock','x','active',now())`,
      );
      expect(ok, `versión activa tras deprecar la previa debería permitirse: ${ok}`).toBe('');
    });

    it('uq_quote_requests_event_vendor_active: 2ª request activa mismo (event,vendor) → 23505', async () => {
      await prisma.$executeRawUnsafe(
        `INSERT INTO quote_requests (id,event_id,service_category_id,vendor_profile_id,status,updated_at) VALUES (gen_random_uuid(),'${ID.event}','${ID.scat}','${ID.vprofile}','sent',now())`,
      );
      const dup = await violation(
        `INSERT INTO quote_requests (id,event_id,service_category_id,vendor_profile_id,status,updated_at) VALUES (gen_random_uuid(),'${ID.event}','${ID.scat}','${ID.vprofile}','viewed',now())`,
      );
      expect(dup).toMatch(/23505/);
      expect(dup).toContain('vendor_profile_id');
    });

    it('uq_booking_intents_event_category_confirmed: 2º confirmed_intent mismo (event,category) → 23505', async () => {
      await prisma.$executeRawUnsafe(`UPDATE booking_intents SET status = 'confirmed_intent' WHERE id = '${ID.booking}'`);
      const dup = await violation(
        `INSERT INTO booking_intents (id,quote_id,event_id,service_category_id,status,updated_at) VALUES (gen_random_uuid(),'${ID.quote}','${ID.event}','${ID.scat}','confirmed_intent',now())`,
      );
      expect(dup).toMatch(/23505/);
      expect(dup).toContain('service_category_id');
      await prisma.$executeRawUnsafe(`UPDATE booking_intents SET status = 'pending' WHERE id = '${ID.booking}'`);
    });
  });

  // ── QA-004 (AC-02, AC-03): definiciones estructurales ──
  describe('QA-004: definiciones en pg_constraint / pg_indexes', () => {
    it('los 16 checks existen (contype=c)', async () => {
      const rows = await q<{ conname: string }>(
        `SELECT conname FROM pg_constraint WHERE contype='c' AND conname LIKE 'chk_%'`,
      );
      expect(rows.length).toBe(16);
    });

    it('los 4 unique parciales existen con WHERE', async () => {
      const rows = await q<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE indexname LIKE 'uq_%' AND indexdef ILIKE '%where%'`,
      );
      const names = rows.map((r) => r.indexname).sort();
      expect(names).toEqual(
        [
          'uq_booking_intents_event_category_confirmed',
          'uq_prompt_versions_active',
          'uq_quote_requests_event_vendor_active',
          'uq_quotes_request_active',
        ].sort(),
      );
    });
  });
});
