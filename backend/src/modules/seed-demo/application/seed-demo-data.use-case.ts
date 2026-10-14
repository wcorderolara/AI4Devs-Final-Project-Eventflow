import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  EVENT_TYPES,
  EVENTS,
  LOCAL_CURRENCY,
  LOCATIONS,
  ORGANIZER_NAMES,
  REVIEWS,
  SERVICE_CATEGORIES,
  VENDOR_BUSINESSES,
  VENDORS,
  WELCOME_NOTIFICATION,
  legacyEventTitle,
  roundPrice,
  seedPrice,
  type SeedCurrency,
} from '../infrastructure/data/latam-data.js';
import { seedEmail } from '../domain/seed-key.js';
import { type DomainCounts, emptyCounts, type SeedReport } from '../domain/seed-report.js';

const SCRIPT_VERSION = '1.0.0';
// Hash bcrypt REAL de la contraseña demo `Demo1234!` (cost=12). Permite login efectivo con
// usuarios seed (`admin@seed.eventflow.test`, `organizerN@…`, `vendorN@…`) sin pasos manuales
// post-reset. La contraseña es intencionalmente pública y para uso EXCLUSIVO en entornos demo
// (SEED_DEMO_ENABLED=true, nunca en producción).
const SEED_PASSWORD_HASH = '$2b$12$F.WAgAMCJz/k9w29z9jT9ezKIPVZV6DH3Z5VZdtPbdnyTOYa1SQWu';
const TX_OPTS = { timeout: 30_000, maxWait: 10_000 } as const;

type Tx = Prisma.TransactionClient;

// Puerto AI estructural local (evita import cross-module — ADR-ARCH-001 boundaries). `MockAIProvider`
// del módulo `ai-assistance` es estructuralmente compatible y se inyecta desde el CLI/tests.
export const SEED_AI_FEATURES = [
  'event_plan',
  'checklist',
  'budget_suggestion',
  'vendor_categories',
  'quote_brief',
  'quote_comparison',
  // US-022 (PB-P2-001): incluido en la unión estructural para preservar compatibilidad con
  // `MockAIProvider` (misma cardinalidad que `AiFeatureType`). El seed actual no invoca esta
  // feature — se mantiene aquí sólo por paridad de tipo.
  'quote_compare_summary',
  'vendor_bio',
  'task_prioritization',
  // US-024 (PB-P2-002): incluido en la unión estructural para preservar cardinalidad con
  // `MockAIProvider` (misma familia que `AiFeatureType`). El seed actual no invoca esta feature
  // — se mantiene aquí sólo por paridad de tipo (misma razón que `quote_compare_summary`).
  'task_priority',
] as const;
export type SeedAiFeature = (typeof SEED_AI_FEATURES)[number];

export interface SeedAiProvider {
  generate(request: {
    feature: SeedAiFeature;
    input: Record<string, unknown>;
    languageCode: string;
  }): Promise<{ output: unknown; promptVersion: unknown; latencyMs: number; fallbackUsed: boolean }>;
}

/** Hooks públicos para que US-087 (mix de estados) y US-088 (confirmed_intent + review) extiendan. */
export interface SeedHooks {
  /** US-087: dado el nº de eventos, devuelve el estado de cada uno (default: mix 3 completed/5 active/resto draft). */
  eventStatusPlan?: (count: number) => Array<'draft' | 'active' | 'completed' | 'cancelled'>;
  /** US-088: extensión post-bookings (garantías extra de confirmed_intent / reviews verificadas). */
  extendBookingsAndReviews?: (tx: Tx, ctx: SeedContext) => Promise<void>;
}

export interface SeedContext {
  organizers: { id: string }[];
  vendors: { id: string; userId: string }[];
  events: { id: string; userId: string }[];
  categories: { id: string; code: string }[];
}

export interface SeedDeps {
  prisma: PrismaClient;
  ai: SeedAiProvider;
  correlationId?: string;
  hooks?: SeedHooks;
}

// US-087 (EC-03) — Fecha relativa dinámica: el evento "cercano a auto-completar" debe calcularse
// respecto al reloj del sistema (no un literal congelado) para que QA de `AutoCompleteEventsJob`
// (NFR-REL-005) sea reproducible cada día. UTC para evitar drift por zona horaria.
export function relativeSeedDate(daysOffset: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysOffset);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * US-034 (PB-P2-004 / SEED-001): calcula `dueDate` para la tarea T-7 demo. Devuelve
 * `event.eventDate - 7 días` a medianoche UTC. Si `eventDate` es nulo (evento demo
 * sin fecha), devuelve `null` — el emisor T-7 excluye tareas sin `due_date` (EC-06).
 */
export function calculateT7SeedDueDate(eventDate: Date | null): Date | null {
  if (!eventDate) return null;
  const d = new Date(eventDate.getTime());
  d.setUTCDate(d.getUTCDate() - 7);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Slug del vendor demo. Replica `slugify` de `vendor-management` (no importable cross-module,
 * ADR-ARCH-001): minúsculas, sin diacríticos, sólo `[a-z0-9-]`.
 */
function seedVendorSlug(businessName: string): string {
  return businessName
    .toLowerCase()
    .normalize('NFD')
    // eslint-disable-next-line no-misleading-character-class
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensure<T>(
  find: () => Promise<T | null>,
  create: () => Promise<T>,
  counts: DomainCounts,
): Promise<T> {
  const existing = await find();
  if (existing) {
    counts.unchanged += 1;
    return existing;
  }
  const created = await create();
  counts.created += 1;
  return created;
}

/** Igualdad tolerante a Date, Decimal (vs number), null/undefined y orden de claves de jsonb. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (a === null || a === undefined || b === null || b === undefined) return (a ?? null) === (b ?? null);
  if (typeof b === 'number' && typeof a === 'object') return Number(String(a)) === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ra = a as Record<string, unknown>;
    const rb = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(ra), ...Object.keys(rb)]);
    return [...keys].every((k) => sameValue(ra[k], rb[k]));
  }
  return a === b;
}

/**
 * Como `ensure`, pero además alinea los campos de `desired` en filas ya existentes (contenido demo
 * y fechas relativas). Cuenta exactamente uno de created/updated/unchanged: una segunda corrida el
 * mismo día no encuentra diferencias y reporta `unchanged`.
 */
async function syncSeed<T extends object>(
  find: () => Promise<T | null>,
  create: () => Promise<T>,
  desired: object,
  update: (existing: T) => Promise<T>,
  counts: DomainCounts,
): Promise<T> {
  const existing = await find();
  if (!existing) {
    const created = await create();
    counts.created += 1;
    return created;
  }
  const current = existing as Record<string, unknown>;
  const drift = Object.entries(desired).some(([k, v]) => !sameValue(current[k], v));
  if (!drift) {
    counts.unchanged += 1;
    return existing;
  }
  const updated = await update(existing);
  counts.updated += 1;
  return updated;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Partidas base del presupuesto de cada evento demo (porcentaje del presupuesto estimado). */
const BUDGET_ITEM_TEMPLATES = [
  { label: 'Catering', categoryCode: 'catering', share: 0.35 },
  { label: 'Decoración', categoryCode: 'decoration', share: 0.12 },
] as const;

/** Evento sembrado con lo que necesitan los pasos posteriores (cotizaciones, reservas, reseñas). */
interface SeededEvent {
  id: string;
  userId: string;
  eventTypeId: string;
  locationId: string | null;
  currency: SeedCurrency;
  eventDate: Date;
  daysFromSeed: number;
  guestsCount: number;
  estimatedBudget: number;
}

export class SeedDemoDataUseCase {
  private readonly prisma: PrismaClient;
  private readonly ai: SeedAiProvider;
  private readonly correlationId: string;
  private readonly hooks: SeedHooks;

  constructor(deps: SeedDeps) {
    this.prisma = deps.prisma;
    this.ai = deps.ai;
    this.correlationId = deps.correlationId ?? randomUUID();
    this.hooks = deps.hooks ?? {};
  }

  async execute(): Promise<SeedReport> {
    const startedAt = new Date();
    const report: SeedReport = {
      correlationId: this.correlationId,
      startedAt: startedAt.toISOString(),
      finishedAt: startedAt.toISOString(),
      durationMs: 0,
      scriptVersion: SCRIPT_VERSION,
      domains: {},
      exitCode: 0,
    };

    const run = async <T>(domain: string, fn: (counts: DomainCounts) => Promise<T>): Promise<T> => {
      const counts = emptyCounts();
      report.domains[domain] = counts;
      try {
        return await fn(counts);
      } catch (err) {
        report.failedDomain = domain;
        report.exitCode = 1;
        throw err;
      }
    };

    const catalogs = await run('catalogs', (c) =>
      this.prisma.$transaction((tx) => this.seedCatalogs(tx, c), TX_OPTS),
    );
    const identities = await run('identities', (c) =>
      this.prisma.$transaction((tx) => this.seedIdentities(tx, c), TX_OPTS),
    );
    const vendors = await run('vendors', (c) =>
      this.prisma.$transaction(
        (tx) => this.seedVendors(tx, c, identities.vendorUsers, catalogs.categories, catalogs.locations),
        TX_OPTS,
      ),
    );
    // US-043 SEED-001: extiende el seed con los escenarios demo del portafolio del vendor.
    // Vendor A: 9 imágenes en `boda-pareja-2024` (demo del 10º upload). Vendor B: 10 imágenes en
    // `xv-anos-2024` (demo del bloqueo del 11º). Vendor C: `status='hidden'` (AUTH-TS-04).
    // Idempotente: usa `isSeed=true` y `findFirst` como guard.
    await run('vendor-portfolios', (c) =>
      this.prisma.$transaction((tx) => this.seedVendorPortfolios(tx, c, vendors), TX_OPTS),
    );
    const events = await run('events', (c) =>
      this.prisma.$transaction(
        (tx) => this.seedEvents(tx, c, identities.organizers, catalogs.eventTypes, catalogs.locations),
        TX_OPTS,
      ),
    );
    const quotes = await run('quotes', (c) =>
      this.prisma.$transaction(
        (tx) => this.seedQuotes(tx, c, events, vendors),
        TX_OPTS,
      ),
    );
    await run('bookings', (c) =>
      this.prisma.$transaction(async (tx) => {
        const result = await this.seedBookingsAndReviews(
          tx,
          c,
          report,
          quotes,
          catalogs.categories,
          identities.organizers,
          identities.admin,
          events,
        );
        if (this.hooks.extendBookingsAndReviews) {
          await this.hooks.extendBookingsAndReviews(tx, {
            organizers: identities.organizers,
            vendors,
            events,
            categories: catalogs.categories,
          });
        }
        return result;
      }, TX_OPTS),
    );
    await run('ai', (c) => this.seedAIRecommendations(c, events, vendors, quotes.quoteRequests, identities.organizers));
    await run('notifications', (c) =>
      this.prisma.$transaction(
        (tx) =>
          this.seedNotifications(tx, c, [
            { id: identities.admin.id, role: 'admin' as const },
            ...identities.organizers.map((u) => ({ id: u.id, role: 'organizer' as const })),
            ...identities.vendorUsers.map((u) => ({ id: u.id, role: 'vendor' as const })),
          ]),
        TX_OPTS,
      ),
    );
    await run('adminActions', (c) =>
      this.prisma.$transaction((tx) => this.seedAdminActions(tx, c, identities.admin, vendors), TX_OPTS),
    );
    // US-047 (PB-P1-041 / BE-006): escenarios demo de moderación de VendorProfile con audit
    // chain completo (approved+hidden y rejected). Idempotente: cada UPDATE queda como noop
    // en re-runs. Alinea el estado seed con el shape que produce `ModerateVendorUseCase` en
    // runtime — permite demoar el panel admin US-074 sin scripting manual.
    await run('vendor-moderations', (c) =>
      this.prisma.$transaction(
        (tx) => this.seedVendorModerations(tx, c, identities.admin, vendors),
        TX_OPTS,
      ),
    );
    // US-045 (PB-P1-028 / DB-001): recompone `rating_avg` y `reviews_count` denormalizados en
    // `vendor_profiles` a partir de las reviews sembradas. Idempotente: fija el estado exacto
    // en cada ejecución (setea 0/NULL si no hay reviews).
    await this.recomputeVendorRatingAggregates();
    await this.recomputeSeedBudgetTotals();

    const finishedAt = new Date();
    report.finishedAt = finishedAt.toISOString();
    report.durationMs = finishedAt.getTime() - startedAt.getTime();
    return report;
  }

  private async seedCatalogs(tx: Tx, counts: DomainCounts) {
    // US-076 (PB-P1-043 / DB-003): FR-EVENT-013 exige los 6 EventTypes obligatorios con
    // i18n en 4 locales y `sortOrder` explícito. Idempotente: si la fila ya existe, se
    // rehidrata con `nameI18n`, `descriptionI18n` y `sortOrder` sin duplicar. `label` se
    // mantiene sincronizado con `nameI18n['es-LATAM']` (fallback denormalizado).
    const eventTypes = [];
    for (const et of EVENT_TYPES) {
      const row = await ensure(
        () => tx.eventType.findUnique({ where: { code: et.code } }),
        () =>
          tx.eventType.create({
            data: {
              code: et.code,
              label: et.label,
              nameI18n: et.nameI18n as Prisma.InputJsonObject,
              descriptionI18n: et.descriptionI18n
                ? (et.descriptionI18n as Prisma.InputJsonObject)
                : undefined,
              sortOrder: et.sortOrder,
              isActive: true,
              isSeed: true,
            },
          }),
        counts,
      );
      // Backfill idempotente para filas seed pre-US-076.
      await tx.eventType.update({
        where: { id: row.id },
        data: {
          label: et.label,
          nameI18n: et.nameI18n as Prisma.InputJsonObject,
          descriptionI18n: et.descriptionI18n
            ? (et.descriptionI18n as Prisma.InputJsonObject)
            : undefined,
          sortOrder: et.sortOrder,
        },
      });
      eventTypes.push(row);
    }
    // US-075 (PB-P1-042 / DB-003): 2 pasadas para respetar la self-ref `parent_id`.
    //   1) Crea roots (`parentCode=null`) — no dependen de nadie.
    //   2) Crea/actualiza subs enlazando al `parent_id` ya insertado.
    // Idempotente: si la fila ya existe pero le faltan campos de US-075 (`nameI18n`,
    // `parentId`, `sortOrder`) se rehidrata sin duplicar. `label` se conserva para
    // callers legacy y se mantiene sincronizado con `nameI18n['es-LATAM']`.
    const categories: { id: string; code: string }[] = [];
    const byCode = new Map<string, { id: string }>();
    const roots = SERVICE_CATEGORIES.filter((c) => c.parentCode === null);
    const subs = SERVICE_CATEGORIES.filter((c) => c.parentCode !== null);
    for (const cat of roots) {
      const row = await ensure(
        () => tx.serviceCategory.findUnique({ where: { code: cat.code } }),
        () =>
          tx.serviceCategory.create({
            data: {
              code: cat.code,
              label: cat.label,
              nameI18n: cat.nameI18n as Prisma.InputJsonObject,
              descriptionI18n: cat.descriptionI18n
                ? (cat.descriptionI18n as Prisma.InputJsonObject)
                : undefined,
              depthLevel: cat.depthLevel,
              sortOrder: cat.sortOrder,
              parentId: null,
              isActive: true,
              isSeed: true,
            },
          }),
        counts,
      );
      // Backfill idempotente de campos US-075 en filas seed pre-US-075.
      await tx.serviceCategory.update({
        where: { id: row.id },
        data: {
          label: cat.label,
          nameI18n: cat.nameI18n as Prisma.InputJsonObject,
          descriptionI18n: cat.descriptionI18n
            ? (cat.descriptionI18n as Prisma.InputJsonObject)
            : undefined,
          sortOrder: cat.sortOrder,
          depthLevel: cat.depthLevel,
          parentId: null,
        },
      });
      byCode.set(cat.code, { id: row.id });
      categories.push({ id: row.id, code: cat.code });
    }
    for (const cat of subs) {
      const parent = byCode.get(cat.parentCode as string);
      if (!parent) continue; // safety: parent debe existir por el orden de pasadas.
      const row = await ensure(
        () => tx.serviceCategory.findUnique({ where: { code: cat.code } }),
        () =>
          tx.serviceCategory.create({
            data: {
              code: cat.code,
              label: cat.label,
              nameI18n: cat.nameI18n as Prisma.InputJsonObject,
              descriptionI18n: cat.descriptionI18n
                ? (cat.descriptionI18n as Prisma.InputJsonObject)
                : undefined,
              depthLevel: cat.depthLevel,
              sortOrder: cat.sortOrder,
              parentId: parent.id,
              isActive: true,
              isSeed: true,
            },
          }),
        counts,
      );
      await tx.serviceCategory.update({
        where: { id: row.id },
        data: {
          label: cat.label,
          nameI18n: cat.nameI18n as Prisma.InputJsonObject,
          descriptionI18n: cat.descriptionI18n
            ? (cat.descriptionI18n as Prisma.InputJsonObject)
            : undefined,
          sortOrder: cat.sortOrder,
          depthLevel: cat.depthLevel,
          parentId: parent.id,
        },
      });
      categories.push({ id: row.id, code: cat.code });
    }
    const locations = [];
    for (const loc of LOCATIONS) {
      const created = await ensure(
        () => tx.location.findFirst({ where: { country: loc.country, city: loc.city, isSeed: true } }),
        () =>
          tx.location.create({
            data: {
              code: loc.code,
              country: loc.country,
              region: loc.region,
              city: loc.city,
              isSeed: true,
            },
          }),
        counts,
      );
      // Backfill idempotente del `code` en filas seed pre-US-045 (creadas antes de que el campo
      // existiera). No sobrescribe si ya está poblado.
      if (created.code !== loc.code) {
        await tx.location.update({ where: { id: created.id }, data: { code: loc.code } });
        created.code = loc.code;
      }
      locations.push(created);
    }
    return { eventTypes, categories, locations };
  }

  private async seedIdentities(tx: Tx, counts: DomainCounts) {
    const admin = await ensure(
      () => tx.user.findUnique({ where: { email: 'admin@seed.eventflow.test' } }),
      () =>
        tx.user.create({
          data: {
            email: 'admin@seed.eventflow.test',
            passwordHash: SEED_PASSWORD_HASH,
            fullName: 'Admin Demo',
            role: 'admin',
            status: 'active',
            preferredLanguage: 'es_LATAM',
            isSeed: true,
          },
        }),
      counts,
    );

    // US-008 (SEED-001, opcional): usuario demo SOLO-OAuth (sin contraseña) con `google_sub`, para
    // demostrar el login OAuth de un usuario existente (AC-01). El `google_sub` coincide con la
    // identidad por defecto del `MockOAuthProvider`, de modo que en Local/CI/Demo el botón
    // "Continuar con Google" inicia sesión directamente en esta cuenta. Idempotente (por email).
    await ensure(
      () => tx.user.findUnique({ where: { email: 'demo.google@seed.eventflow.test' } }),
      () =>
        tx.user.create({
          data: {
            email: 'demo.google@seed.eventflow.test',
            passwordHash: null,
            googleSub: 'mock-google-sub-demo',
            fullName: 'Demo Google',
            role: 'organizer',
            status: 'active',
            preferredLanguage: 'es_LATAM',
            isSeed: true,
          },
        }),
      counts,
    );

    const organizers = [];
    for (let i = 0; i < ORGANIZER_NAMES.length; i += 1) {
      const email = seedEmail('organizer', i);
      organizers.push(
        await ensure(
          () => tx.user.findUnique({ where: { email } }),
          () =>
            tx.user.create({
              data: {
                email,
                passwordHash: SEED_PASSWORD_HASH,
                fullName: ORGANIZER_NAMES[i],
                role: 'organizer',
                status: 'active',
                preferredLanguage: 'es_LATAM',
                isSeed: true,
              },
            }),
          counts,
        ),
      );
    }

    const vendorUsers = [];
    for (let i = 0; i < VENDOR_BUSINESSES.length; i += 1) {
      const email = seedEmail('vendor', i);
      vendorUsers.push(
        await ensure(
          () => tx.user.findUnique({ where: { email } }),
          () =>
            tx.user.create({
              data: {
                email,
                passwordHash: SEED_PASSWORD_HASH,
                fullName: `Contacto ${VENDOR_BUSINESSES[i]}`,
                role: 'vendor',
                status: 'active',
                preferredLanguage: 'es_LATAM',
                isSeed: true,
              },
            }),
          counts,
        ),
      );
    }

    return { admin, organizers, vendorUsers };
  }

  private async seedVendors(
    tx: Tx,
    counts: DomainCounts,
    vendorUsers: { id: string }[],
    categories: { id: string; code: string }[],
    locations: { id: string; code: string | null }[],
  ) {
    const vendors = [];
    for (let i = 0; i < vendorUsers.length; i += 1) {
      const user = vendorUsers[i]!;
      const seed = VENDORS[i]!;
      // Categoría y ubicación explícitas por proveedor (coherentes con su nombre).
      const category = categories.find((c) => c.code === seed.categoryCode)!;
      const location = locations.find((l) => l.code === seed.locationCode)!;
      const currency = LOCAL_CURRENCY[seed.locationCode];
      // US-042 SEED-001: el primer vendor demo carga `categoryChangeCount=4` para poder
      // demostrar el bloqueo `409 CATEGORY_CHANGE_LIMIT` al 5to/6to cambio sin scripting.
      const isCategoryLimitDemoVendor = i === 0;
      // El directorio y el perfil público navegan por `slug` (`/vendors/:slug`): sin él la card
      // enlaza a `/vendors/null`. `VENDOR_BUSINESSES` son únicos, así que el slug también.
      const profileData = {
        slug: seedVendorSlug(seed.businessName),
        businessName: seed.businessName,
        bio: seed.bio,
        locationId: location.id,
      };
      const profile = await syncSeed(
        () => tx.vendorProfile.findUnique({ where: { userId: user.id } }),
        () =>
          tx.vendorProfile.create({
            data: {
              userId: user.id,
              ...profileData,
              status: 'approved',
              languagesSupported: ['es-LATAM', 'es-ES'],
              categoryChangeCount: isCategoryLimitDemoVendor ? 4 : 0,
              requiresAdminReview: isCategoryLimitDemoVendor,
              isSeed: true,
            },
          }),
        profileData,
        (p) => tx.vendorProfile.update({ where: { id: p.id }, data: profileData }),
        counts,
      );
      // Un paquete por vendor. Se busca por vendor (no por categoría) para corregir en sitio
      // filas sembradas antes con otra categoría.
      const serviceData = {
        serviceCategoryId: category.id,
        packageName: seed.packageName,
        description: seed.packageDescription,
        basePrice: seedPrice(seed.referencePriceGtq, currency),
        currencyCode: currency,
        isActive: true,
      };
      await syncSeed(
        () =>
          tx.vendorService.findFirst({
            where: { vendorProfileId: profile.id, isSeed: true },
            orderBy: { createdAt: 'asc' },
          }),
        () => tx.vendorService.create({ data: { vendorProfileId: profile.id, ...serviceData, isSeed: true } }),
        serviceData,
        (s) => tx.vendorService.update({ where: { id: s.id }, data: serviceData }),
        counts,
      );
      // US-042: la M:N `vendor_profile_categories` queda alineada con la categoría del paquete.
      // La PK compuesta previene duplicados; los vínculos de categorías previas se retiran.
      await tx.vendorProfileCategory.deleteMany({
        where: { vendorProfileId: profile.id, serviceCategoryId: { not: category.id } },
      });
      const existingLink = await tx.vendorProfileCategory.findUnique({
        where: {
          vendorProfileId_serviceCategoryId: {
            vendorProfileId: profile.id,
            serviceCategoryId: category.id,
          },
        },
      });
      if (!existingLink) {
        await tx.vendorProfileCategory.create({
          data: { vendorProfileId: profile.id, serviceCategoryId: category.id },
        });
      }
      vendors.push({ id: profile.id, userId: user.id, categoryId: category.id });
    }
    return vendors;
  }

  /**
   * US-043 SEED-001 — Escenarios demo del portafolio del vendor.
   * - `vendors[0]`: 9 imágenes activas en `boda-pareja-2024` (demo del 10º upload permitido).
   * - `vendors[1]` (si existe): 10 imágenes activas en `xv-anos-2024` (demo del 11º bloqueado).
   * - Marca `vendors[2]` (si existe) como `status='hidden'` para AUTH-TS-04. Se mantiene
   *   `deletedAt=null` para diferenciar del soft-deleted (US-041).
   *
   * Idempotente: cada attachment se crea sólo si no existe otro `isSeed=true` con el mismo
   * `(ownerId, workLabel)` — el `count` alinea la re-ejecución sin duplicar binarios lógicos.
   */
  private async seedVendorPortfolios(
    tx: Tx,
    counts: DomainCounts,
    vendors: { id: string; userId: string }[],
  ): Promise<void> {
    if (vendors.length === 0) return;

    const scenarios: { vendorIndex: number; workLabel: string; count: number }[] = [
      { vendorIndex: 0, workLabel: 'boda-pareja-2024', count: 9 },
    ];
    if (vendors.length > 1) {
      scenarios.push({ vendorIndex: 1, workLabel: 'xv-anos-2024', count: 10 });
    }

    for (const scenario of scenarios) {
      const vendor = vendors[scenario.vendorIndex]!;
      // Idempotente vía `ensure` por índice (fileName determinista): la primera pasada crea
      // N attachments, la segunda encuentra los mismos → suma a `unchanged` (US-085 TS-02).
      for (let i = 0; i < scenario.count; i += 1) {
        const fileName = `${scenario.workLabel}-${i + 1}.jpg`;
        await ensure(
          () =>
            tx.attachment.findFirst({
              where: {
                ownerType: 'vendor_work',
                ownerId: vendor.id,
                workLabel: scenario.workLabel,
                fileName,
                isSeed: true,
              },
            }),
          () =>
            tx.attachment.create({
              data: {
                ownerType: 'vendor_work',
                ownerId: vendor.id,
                status: 'active',
                url: `seed/${vendor.id}/${fileName}`,
                fileName,
                mimeType: 'image/jpeg',
                workLabel: scenario.workLabel,
                sizeBytes: 200_000 + i * 1_000,
                uploadedBy: vendor.userId,
                isSeed: true,
              },
            }),
          counts,
        );
      }
    }

    // Escenario `hidden` — sólo si hay ≥3 vendors demo. Idempotente vía `ensure`: la primera
    // pasada aplica el UPDATE (via `create` sintético que hace update); la segunda encuentra
    // el vendor ya `hidden` y suma `unchanged`.
    if (vendors.length > 2) {
      const hiddenVendor = vendors[2]!;
      await ensure(
        () =>
          tx.vendorProfile.findFirst({
            where: { id: hiddenVendor.id, status: 'hidden' },
            select: { id: true },
          }),
        () =>
          tx.vendorProfile.update({
            where: { id: hiddenVendor.id },
            data: { status: 'hidden' },
            select: { id: true },
          }),
        counts,
      );
    }
  }

  private async seedEvents(
    tx: Tx,
    counts: DomainCounts,
    organizers: { id: string }[],
    eventTypes: { id: string; code: string }[],
    locations: { id: string; code: string | null }[],
  ): Promise<SeededEvent[]> {
    const eventCount = EVENTS.length;
    // US-087 AC-01 — Mix garantizado: draft≥2, active≥4, completed≥2, cancelled≥1 (total 10–15).
    // Plan por defecto (12): completed×4, active×4, draft×2, cancelled×2, definido en `EVENTS`.
    // Los eventos 0..4 (con reservas confirmadas y reseñas) ya ocurrieron. El hook
    // `eventStatusPlan` (US-087 override) puede sustituir el plan.
    const statusPlan = this.hooks.eventStatusPlan?.(eventCount) ?? EVENTS.map((e) => e.status);

    // AC-04 — Un mismo organizador (organizers[0]) ancla un evento en cada estado.
    const ANCHOR_COMPLETED = 0;
    const ANCHOR_ACTIVE = 3;
    const ANCHOR_DRAFT = 8;
    const ANCHOR_CANCELLED = 10;
    const anchorIndices = new Set([ANCHOR_COMPLETED, ANCHOR_ACTIVE, ANCHOR_DRAFT, ANCHOR_CANCELLED]);

    const events: SeededEvent[] = [];
    for (let i = 0; i < eventCount; i += 1) {
      const seed = EVENTS[i]!;
      // AC-04: los índices ancla van al organizador 0; el resto rota.
      const organizer = anchorIndices.has(i) ? organizers[0]! : organizers[i % organizers.length]!;
      const eventType = eventTypes.find((t) => t.code === seed.eventTypeCode)!;
      const locationId = locations.find((l) => l.code === seed.locationCode)?.id ?? null;
      const status = statusPlan[i] ?? seed.status;
      // Fechas relativas al día de la corrida: activos/borradores en el futuro, completados y
      // cancelados en el pasado. Si el hook cambia el estado, se ajusta el signo del offset.
      // AC-02 / EC-03: el ancla activa queda en hoy − 2 días (cercano a auto-completar).
      const isPast = status === 'completed' || status === 'cancelled';
      const daysFromSeed =
        i === ANCHOR_ACTIVE || status === seed.status
          ? seed.daysFromSeed
          : isPast
            ? -Math.abs(seed.daysFromSeed)
            : Math.abs(seed.daysFromSeed);
      const eventDate = relativeSeedDate(daysFromSeed);
      // AC-02 — Un evento completed con auto_completed=true (job T+2 → completed_at = fecha + 2);
      // el resto de completados se cerró manualmente al día siguiente del evento.
      const autoCompleted = i === ANCHOR_COMPLETED;
      const completedAt =
        status === 'completed' ? addDays(eventDate, autoCompleted ? 2 : 1) : null;
      // El schema MVP (US-099) no tiene `cancelled_reason`; la traza de cancelación va en `notes`
      // (ver desviación D1 de US-087).
      const notes =
        status === 'cancelled' ? (seed.notes ?? 'Cancelado: cambio de planes de los anfitriones.') : null;
      const eventData = {
        userId: organizer.id,
        eventTypeId: eventType.id,
        locationId,
        title: seed.title,
        status,
        currency: seed.currency,
        language: seed.language,
        eventDate,
        guestsCount: seed.guestsCount,
        estimatedBudget: seed.estimatedBudget,
        autoCompleted,
        completedAt,
        notes,
      };
      // Clave estable: título actual o el legado (`Evento Demo #N`) de BDs sembradas antes.
      const event = await syncSeed(
        () =>
          tx.event.findFirst({
            where: { title: { in: [seed.title, legacyEventTitle(i)] }, isSeed: true },
          }),
        () => tx.event.create({ data: { ...eventData, isSeed: true } }),
        eventData,
        (e) => tx.event.update({ where: { id: e.id }, data: eventData }),
        counts,
      );
      // Budget 1:1 + partidas base. Montos y comprometido los alinea `syncBudgetItems`.
      const budget = await ensure(
        () => tx.budget.findUnique({ where: { eventId: event.id } }),
        () => tx.budget.create({ data: { eventId: event.id, totalPlanned: 0, totalCommitted: 0, isSeed: true } }),
        counts,
      );
      for (const item of BUDGET_ITEM_TEMPLATES) {
        await ensure(
          () => tx.budgetItem.findFirst({ where: { budgetId: budget.id, label: item.label, isSeed: true } }),
          () =>
            tx.budgetItem.create({
              data: {
                budgetId: budget.id,
                label: item.label,
                categoryCode: item.categoryCode,
                amountPlanned: Math.round(seed.estimatedBudget * item.share),
                amountCommitted: 0,
                isSeed: true,
              },
            }),
          counts,
        );
      }
      // Una tarea por evento. US-034 (PB-P2-004 / SEED-001): `dueDate = event.eventDate - 7 días`
      // para que el `EmitT7NotificationsJob` pueda emitir la notificación T-7 del organizer demo.
      const taskData = { dueDate: calculateT7SeedDueDate(eventDate) };
      await syncSeed(
        () => tx.eventTask.findFirst({ where: { eventId: event.id, title: 'Confirmar proveedores', isSeed: true } }),
        () =>
          tx.eventTask.create({
            data: {
              eventId: event.id,
              title: 'Confirmar proveedores',
              status: 'pending',
              origin: 'manual',
              ...taskData,
              isSeed: true,
            },
          }),
        taskData,
        (t) => tx.eventTask.update({ where: { id: t.id }, data: taskData }),
        counts,
      );
      events.push({
        id: event.id,
        userId: organizer.id,
        eventTypeId: eventType.id,
        locationId,
        currency: seed.currency,
        eventDate,
        daysFromSeed,
        guestsCount: seed.guestsCount,
        estimatedBudget: seed.estimatedBudget,
      });
    }
    return events;
  }

  private async seedQuotes(
    tx: Tx,
    counts: DomainCounts,
    events: SeededEvent[],
    vendors: { id: string; categoryId: string }[],
  ) {
    const quoteRequests: { id: string; eventId: string; serviceCategoryId: string; vendorProfileId: string }[] = [];
    const quotes: { id: string; quoteRequestId: string; vendorProfileId: string; amount: number }[] = [];
    // Brief con el shape canónico de US-049 (lo que guarda una solicitud real).
    const briefFor = (event: SeededEvent, vendorIndex: number, budget: number) => ({
      budget: String(budget),
      currency_code: event.currency,
      message: VENDORS[vendorIndex]!.briefMessage,
      source: 'manual',
      aiGenerated: false,
      event_snapshot: {
        event_type_id: event.eventTypeId,
        event_date: event.eventDate.toISOString(),
        location_id: event.locationId,
        guests_count: event.guestsCount,
      },
    });
    // 20 cadenas: el evento e recibe cotizaciones de los proveedores 2e y 2e+1 (mismo país), cada
    // una en la categoría del proveedor y en la moneda del evento.
    const chains = 20;
    for (let k = 0; k < chains; k += 1) {
      const event = events[Math.floor(k / 2) % events.length]!;
      const vendorIndex = k % vendors.length;
      const vendor = vendors[vendorIndex]!;
      const reference = VENDORS[vendorIndex]!.referencePriceGtq;
      const amount = seedPrice(reference * (1 + ((k % 3) - 1) * 0.06), event.currency);
      const qrData = {
        serviceCategoryId: vendor.categoryId,
        brief: briefFor(event, vendorIndex, seedPrice(reference * 1.15, event.currency)),
      };
      // Clave estable (evento, proveedor): única por diseño de las cadenas.
      const qr = await syncSeed(
        () => tx.quoteRequest.findFirst({ where: { eventId: event.id, vendorProfileId: vendor.id, isSeed: true } }),
        () =>
          tx.quoteRequest.create({
            data: { eventId: event.id, vendorProfileId: vendor.id, status: 'responded', ...qrData, isSeed: true },
          }),
        qrData,
        (r) => tx.quoteRequest.update({ where: { id: r.id }, data: qrData }),
        counts,
      );
      quoteRequests.push({ id: qr.id, eventId: event.id, serviceCategoryId: vendor.categoryId, vendorProfileId: vendor.id });
      const quoteData = { serviceCategoryId: vendor.categoryId, amount, currency: event.currency };
      const quote = await syncSeed(
        () => tx.quote.findFirst({ where: { quoteRequestId: qr.id, vendorProfileId: vendor.id, isSeed: true } }),
        () =>
          tx.quote.create({
            data: {
              quoteRequestId: qr.id,
              vendorProfileId: vendor.id,
              // US-058 (PB-P1-035 / DB-002): columnas denormalizadas requeridas.
              eventId: event.id,
              ...quoteData,
              status: 'accepted',
              // US-058: UNIQUE parcial `(event_id, service_category_id) WHERE is_preferred=true`;
              // sólo la primera cadena queda preferida.
              isPreferred: k === 0,
              isSeed: true,
            },
          }),
        quoteData,
        (q) => tx.quote.update({ where: { id: q.id }, data: quoteData }),
        counts,
      );
      quotes.push({ id: quote.id, quoteRequestId: qr.id, vendorProfileId: vendor.id, amount });
    }

    // US-056 (BE-007): QR viewed sin Quote para el demo del "cancel válido" (AC-01). El
    // demo del "cancel bloqueado por confirmed_intent" (EC-01) queda cubierto por los índices
    // de `bookingPlan` con `kind: 'confirmed'` en `seedBookingsAndReviews` — cancelar los QRs
    // asociados a esos quotes falla con `QR_HAS_CONFIRMED_BOOKING`.
    if (events.length > 0 && vendors.length > 0) {
      const demoEvent = events[0]!;
      const demoVendorIndex = vendors.length - 1;
      const demoVendor = vendors[demoVendorIndex]!;
      const viewedData = {
        serviceCategoryId: demoVendor.categoryId,
        brief: briefFor(demoEvent, demoVendorIndex, seedPrice(VENDORS[demoVendorIndex]!.referencePriceGtq, demoEvent.currency)),
        viewedAt: relativeSeedDate(Math.min(demoEvent.daysFromSeed - 20, -1)),
      };
      await syncSeed(
        () =>
          tx.quoteRequest.findFirst({
            where: { eventId: demoEvent.id, vendorProfileId: demoVendor.id, status: 'viewed', isSeed: true },
          }),
        () =>
          tx.quoteRequest.create({
            data: { eventId: demoEvent.id, vendorProfileId: demoVendor.id, status: 'viewed', ...viewedData, isSeed: true },
          }),
        viewedData,
        (r) => tx.quoteRequest.update({ where: { id: r.id }, data: viewedData }),
        counts,
      );
    }

    return { quoteRequests, quotes };
  }

  private async seedBookingsAndReviews(
    tx: Tx,
    counts: DomainCounts,
    report: SeedReport,
    quotes: {
      quoteRequests: { id: string; eventId: string; serviceCategoryId: string; vendorProfileId: string }[];
      quotes: { id: string; quoteRequestId: string; vendorProfileId: string; amount: number }[];
    },
    categories: { id: string; code: string }[],
    organizers: { id: string }[],
    admin: { id: string },
    events: SeededEvent[],
  ) {
    // US-060 (PB-P1-036 / DB-002): `booking_intents.created_by` es `NOT NULL`. Se resuelve por
    // `eventId → event.userId` (organizer dueño del evento — semántica de la creación real vía
    // POST /booking-intents).
    const eventById = new Map(events.map((e) => [e.id, e]));
    const reviewCounts = report.domains.reviews ?? emptyCounts();
    report.domains.reviews = reviewCounts;

    // US-088 AC-01/AC-02 — Matriz de BookingIntent (8): 5 confirmed_intent, 1 pending,
    // 1 cancelado-desde-pending, 1 cancelado-desde-confirmed. Los confirmed usan quotes de EVENTOS
    // DISTINTOS (índices 0,2,5,6,8 → eventos 0..4, ya realizados) → (event, category) distinto
    // (uq confirmed C-037) y presupuesto no ambiguo (AC-05). Se eligen proveedores visibles en el
    // directorio donde se puede, para que sus reseñas se vean. is_simulated + is_seed siempre.
    const bookingPlan: Array<{ idx: number; kind: 'confirmed' | 'pending' | 'cancelled_pending' | 'cancelled_confirmed' }> = [
      { idx: 0, kind: 'confirmed' }, { idx: 2, kind: 'confirmed' }, { idx: 5, kind: 'confirmed' },
      { idx: 6, kind: 'confirmed' }, { idx: 8, kind: 'confirmed' },
      { idx: 1, kind: 'pending' },
      { idx: 3, kind: 'cancelled_pending' },
      { idx: 4, kind: 'cancelled_confirmed' },
    ];
    const confirmedBookings: { id: string; eventId: string; vendorProfileId: string; serviceCategoryId: string; amount: number }[] = [];

    for (const { idx, kind } of bookingPlan) {
      const quote = quotes.quotes[idx]!;
      const qr = quotes.quoteRequests.find((r) => r.id === quote.quoteRequestId)!;
      const event = eventById.get(qr.eventId)!;
      const status = kind === 'confirmed' ? 'confirmed_intent' : kind === 'pending' ? 'pending' : 'cancelled';
      const cancelledFromConfirmed = kind === 'cancelled_confirmed';
      const isCancelled = status === 'cancelled';
      // Fechas relativas: la reserva se confirma ~1 mes antes del evento (nunca en el futuro) y la
      // cancelación ocurre después de la confirmación (BR-BOOKING-009, EC-03).
      const confirmedDay = Math.min(event.daysFromSeed - 30, -5);
      const confirmedAt = kind === 'confirmed' || cancelledFromConfirmed ? relativeSeedDate(confirmedDay) : null;
      const cancelledAt = isCancelled ? relativeSeedDate(cancelledFromConfirmed ? confirmedDay + 3 : Math.min(event.daysFromSeed - 25, -3)) : null;
      const bookingData = {
        serviceCategoryId: qr.serviceCategoryId,
        vendorProfileId: qr.vendorProfileId,
        status,
        confirmedAt,
        cancelledAt,
        cancelledBy: isCancelled ? event.userId : null,
        cancellationReason: isCancelled
          ? cancelledFromConfirmed
            ? 'Cambiamos la fecha del evento y el proveedor ya no tenía disponibilidad.'
            : 'Elegimos otra propuesta que se ajustaba mejor al presupuesto.'
          : null,
        // US-039 (SEED-001): estado post-sync del handler `UpdateCommittedFromBookingIntent`.
        committedSyncedAt: kind === 'confirmed' ? new Date(confirmedAt!.getTime() + 1000) : null,
        committedSyncedAmount: kind === 'confirmed' ? quote.amount : null,
      } as const;
      // Clave estable: el quote (1 reserva por quote en el plan).
      const booking = await syncSeed(
        () => tx.bookingIntent.findFirst({ where: { quoteId: quote.id, isSeed: true } }),
        () =>
          tx.bookingIntent.create({
            data: {
              quoteId: quote.id,
              eventId: qr.eventId,
              createdBy: event.userId,
              isSimulated: true,
              ...bookingData,
              createdAt: relativeSeedDate(confirmedDay - 3),
              isSeed: true,
            },
          }),
        bookingData,
        (b) => tx.bookingIntent.update({ where: { id: b.id }, data: bookingData }),
        counts,
      );
      if (kind === 'confirmed') {
        confirmedBookings.push({
          id: booking.id,
          eventId: qr.eventId,
          vendorProfileId: qr.vendorProfileId,
          serviceCategoryId: qr.serviceCategoryId,
          amount: quote.amount,
        });
      }
    }

    // US-088 AC-05 — `BudgetItem.committed` refleja el monto del quote por cada confirmed_intent,
    // en la partida de la misma categoría (se crea si el evento no la tenía).
    const categoryById = new Map(categories.map((c) => [c.id, c.code]));
    for (const event of events) {
      const budget = await tx.budget.findUnique({ where: { eventId: event.id }, select: { id: true } });
      if (!budget) continue;
      const booked = confirmedBookings.filter((b) => b.eventId === event.id);
      const items = BUDGET_ITEM_TEMPLATES.map((t) => ({
        label: t.label as string,
        categoryCode: t.categoryCode as string,
        planned: Math.round(event.estimatedBudget * t.share),
      }));
      for (const b of booked) {
        const code = categoryById.get(b.serviceCategoryId)!;
        if (!items.some((it) => it.categoryCode === code)) {
          const label = SERVICE_CATEGORIES.find((c) => c.code === code)?.label ?? code;
          items.push({ label, categoryCode: code, planned: 0 });
        }
      }
      for (const it of items) {
        const committed = booked.find((b) => categoryById.get(b.serviceCategoryId) === it.categoryCode)?.amount ?? 0;
        const itemData = {
          categoryCode: it.categoryCode,
          amountPlanned: Math.max(it.planned, committed > 0 ? roundPrice(committed * 1.1, event.currency) : 0),
          amountCommitted: committed,
        };
        await syncSeed(
          () => tx.budgetItem.findFirst({ where: { budgetId: budget.id, label: it.label, isSeed: true } }),
          () => tx.budgetItem.create({ data: { budgetId: budget.id, label: it.label, ...itemData, isSeed: true } }),
          itemData,
          (row) => tx.budgetItem.update({ where: { id: row.id }, data: itemData }),
          counts,
        );
      }
    }
    // US-088 AC-03/EC-04 — Reseñas (24): asociadas SOLO a confirmed_intent; ~70/20/10
    // published/hidden/removed; rating 1..5 coherente con el texto; (booking, author) distinto.
    const nConfirmed = confirmedBookings.length;
    for (let i = 0; i < REVIEWS.length; i += 1) {
      const booking = confirmedBookings[i % nConfirmed]!;
      const author = organizers[Math.floor(i / nConfirmed) % organizers.length]!;
      const status = i < 17 ? 'published' : i < 22 ? 'hidden' : 'removed';
      const event = eventById.get(booking.eventId)!;
      // Publicada unos días después del evento, nunca en el futuro.
      const reviewData = {
        vendorProfileId: booking.vendorProfileId,
        rating: REVIEWS[i]!.rating,
        comment: REVIEWS[i]!.comment,
        createdAt: new Date(relativeSeedDate(Math.min(event.daysFromSeed + 1 + (i % 3), -1)).getTime() + i * 3_600_000),
      };
      const review = await syncSeed(
        () => tx.review.findFirst({ where: { bookingIntentId: booking.id, authorId: author.id, isSeed: true } }),
        () =>
          tx.review.create({
            data: { bookingIntentId: booking.id, authorId: author.id, status, ...reviewData, isSeed: true },
          }),
        reviewData,
        (r) => tx.review.update({ where: { id: r.id }, data: reviewData }),
        reviewCounts,
      );
      // US-088 AC-04 — Trazabilidad de moderación: `AdminAction` por cada review hidden/removed.
      // US-067 (PB-P1-040 / BE-006): además del AdminAction se pueblan las 4 columnas audit
      // en `reviews` (`moderated_by`, `moderated_at`, `moderation_reason`, `admin_action_id`)
      // con el mismo shape que produce `ModerateReviewUseCase` en runtime (Decisión PO D8).
      if (status !== 'published') {
        const action = status === 'hidden' ? 'hide' : 'remove';
        const reason = status === 'hidden'
          ? 'La reseña incluye datos de contacto; queda oculta mientras se revisa.'
          : 'El contenido no corresponde al servicio contratado.';
        const actionData = {
          metadata: {
            reason,
            from_status: 'published',
            to_status: status,
            rating_snapshot: review.rating,
            comment_snapshot: review.comment,
          },
        };
        const adminAction = await syncSeed(
          () => tx.adminAction.findFirst({ where: { action, targetEntity: 'review', targetId: review.id, isSeed: true } }),
          () =>
            tx.adminAction.create({
              data: {
                adminUserId: admin.id,
                action,
                targetEntity: 'review',
                targetId: review.id,
                ...actionData,
                isSeed: true,
              },
            }),
          actionData,
          (a) => tx.adminAction.update({ where: { id: a.id }, data: actionData }),
          counts,
        );
        // UPDATE idempotente de columnas audit + chain al AdminAction (BR-ADMIN-011).
        const auditData = {
          moderatedBy: admin.id,
          moderatedAt: addDays(review.createdAt, 1),
          moderationReason: reason,
          adminActionId: adminAction.id,
        };
        if (Object.entries(auditData).some(([k, v]) => !sameValue((review as Record<string, unknown>)[k], v))) {
          await tx.review.update({ where: { id: review.id }, data: auditData });
        }
      }
    }
    // EC-04: una BD sembrada con un plan de reservas anterior puede tener reseñas seed colgadas de
    // reservas seed que ya no están confirmadas; se retiran junto con su AdminAction seed.
    const stale = await tx.review.findMany({
      where: { isSeed: true, bookingIntent: { isSeed: true }, bookingIntentId: { notIn: confirmedBookings.map((b) => b.id) } },
      select: { id: true },
    });
    if (stale.length > 0) {
      const ids = stale.map((r) => r.id);
      await tx.review.deleteMany({ where: { id: { in: ids } } });
      await tx.adminAction.deleteMany({ where: { targetEntity: 'review', targetId: { in: ids }, isSeed: true } });
    }
    return {};
  }

  private async seedAIRecommendations(
    counts: DomainCounts,
    events: { id: string }[],
    vendors: { id: string }[],
    quoteRequests: { id: string }[],
    organizers: { id: string }[],
  ) {
    const event = events[0]!;
    const vendor = vendors[0]!;
    const quoteRequest = quoteRequests[0]!;
    const organizer = organizers[0]!;

    // Prompt version seed (append-only; upsert por (promptKey, version)).
    const promptVersion = await ensure(
      () => this.prisma.aIPromptVersion.findUnique({ where: { promptKey_version: { promptKey: 'seed.demo', version: '1' } } }),
      () =>
        this.prisma.aIPromptVersion.create({
          data: {
            promptId: randomUUID(),
            promptKey: 'seed.demo',
            version: '1',
            status: 'active',
            provider: 'mock',
            templateChecksum: 'sha256:seed-demo-template',
          },
        }),
      counts,
    );

    // Genera outputs deterministas (fuera de transacción; el mock no toca red).
    const generated = await Promise.all(
      SEED_AI_FEATURES.map(async (feature) => {
        const result = await this.ai.generate({ feature, input: seedInputForFeature(feature), languageCode: 'es-LATAM' });
        return { feature, result };
      }),
    );

    await this.prisma.$transaction(async (tx) => {
      for (const { feature, result } of generated) {
        const scope = featureScope(feature);
        await ensure(
          () => tx.aIRecommendation.findFirst({ where: { kind: feature, isSeed: true } }),
          () =>
            tx.aIRecommendation.create({
              data: {
                kind: feature,
                aiPromptVersionId: promptVersion.id,
                requestedByUserId: organizer.id,
                eventId: scope === 'vendor' ? null : event.id,
                vendorProfileId: scope === 'vendor' ? vendor.id : null,
                quoteRequestId: scope === 'quote' ? quoteRequest.id : null,
                inputPayload: seedInputForFeature(feature) as Prisma.InputJsonValue,
                outputPayload: (result.output ?? {}) as Prisma.InputJsonValue,
                aiMeta: {
                  provider: 'mock',
                  promptVersion: result.promptVersion,
                  latencyMs: result.latencyMs,
                  fallbackUsed: result.fallbackUsed,
                  languageCode: 'es-LATAM',
                } as Prisma.InputJsonValue,
                status: 'accepted',
                isSeed: true,
              },
            }),
          counts,
        );
      }

      // ── US-037 SEED-001 ────────────────────────────────────────────────
      // Garantiza:
      //  1. Al menos un AIRecommendation { type='budget_suggestion', status='pending' } sobre
      //     un evento **editable** (draft o active) para demoar el flujo HITL de US-037
      //     (D5 rechaza cancelled/completed con 409 EVENT_NOT_EDITABLE).
      //  2. Al menos un BudgetItem con `aiRecommendationId` de la recomendación previa
      //     `accepted` de budget_suggestion, para demoar el reemplazo D2.
      // El mock provider genera `budget_suggestion.currencyCode='GTQ'` por default, así que el
      // evento debe ser editable, futuro (el job T+2 no lo cerrará) y en GTQ para evitar
      // `CurrencyMismatchError` en el apply (AC-08). Orden determinista (el de `EVENTS`).
      const editableIds = new Set(
        (
          await tx.event.findMany({
            where: {
              id: { in: events.map((e) => e.id) },
              status: { in: ['draft', 'active'] },
              currency: 'GTQ',
              eventDate: { gt: new Date() },
            },
            select: { id: true },
          })
        ).map((e) => e.id),
      );
      const pendingBudgetEventTarget = events.find((e) => editableIds.has(e.id)) ?? events[0]!;
      const pendingBudgetGen = generated.find((g) => g.feature === 'budget_suggestion');
      if (pendingBudgetGen) {
        const pendingData = { eventId: pendingBudgetEventTarget.id };
        await syncSeed(
          () => tx.aIRecommendation.findFirst({ where: { kind: 'budget_suggestion', status: 'pending', isSeed: true } }),
          () =>
            tx.aIRecommendation.create({
              data: {
                kind: 'budget_suggestion',
                aiPromptVersionId: promptVersion.id,
                requestedByUserId: organizer.id,
                eventId: pendingBudgetEventTarget.id,
                vendorProfileId: null,
                quoteRequestId: null,
                inputPayload: seedInputForFeature('budget_suggestion') as Prisma.InputJsonValue,
                outputPayload: (pendingBudgetGen.result.output ?? {}) as Prisma.InputJsonValue,
                aiMeta: {
                  provider: 'mock',
                  promptVersion: pendingBudgetGen.result.promptVersion,
                  latencyMs: pendingBudgetGen.result.latencyMs,
                  fallbackUsed: pendingBudgetGen.result.fallbackUsed,
                  languageCode: 'es-LATAM',
                } as Prisma.InputJsonValue,
                status: 'pending',
                isSeed: true,
              },
            }),
          pendingData,
          (r) => tx.aIRecommendation.update({ where: { id: r.id }, data: pendingData }),
          counts,
        );
      }

      // Ítems previos AI en el evento principal para demoar D2 (reemplazo). Enlazan a la
      // recomendación `accepted` del primer evento (creada en el loop de arriba).
      const acceptedRec = await tx.aIRecommendation.findFirst({
        where: { kind: 'budget_suggestion', status: 'accepted', eventId: event.id, isSeed: true },
        select: { id: true },
      });
      const budgetOfMainEvent = await tx.budget.findUnique({
        where: { eventId: event.id },
        select: { id: true },
      });
      if (acceptedRec && budgetOfMainEvent) {
        const existingAi = await tx.budgetItem.findFirst({
          where: { budgetId: budgetOfMainEvent.id, aiRecommendationId: acceptedRec.id, isSeed: true },
          select: { id: true },
        });
        if (!existingAi) {
          await tx.budgetItem.createMany({
            data: [
              {
                budgetId: budgetOfMainEvent.id,
                label: 'Salón (IA previo)',
                categoryCode: 'venue',
                amountPlanned: 18000,
                amountCommitted: 0,
                aiRecommendationId: acceptedRec.id,
                isSeed: true,
              },
              {
                budgetId: budgetOfMainEvent.id,
                label: 'Catering (IA previo)',
                categoryCode: 'catering',
                amountPlanned: 30000,
                amountCommitted: 0,
                aiRecommendationId: acceptedRec.id,
                isSeed: true,
              },
            ],
          });
        }
      }
    }, TX_OPTS);
    return {};
  }

  private async seedNotifications(
    tx: Tx,
    counts: DomainCounts,
    users: { id: string; role: keyof typeof WELCOME_NOTIFICATION }[],
  ) {
    for (let i = 0; i < users.length && i < 18; i += 1) {
      const user = users[i]!;
      // El `type` es la clave estable; título y cuerpo van en el payload (lo que lee la bandeja).
      const type = `seed.demo.welcome.${i}`;
      const data = { payload: { ...WELCOME_NOTIFICATION[user.role], channel: 'in_app', languageCode: 'es-LATAM' } };
      await syncSeed(
        () => tx.notification.findFirst({ where: { userId: user.id, type, isSeed: true } }),
        () => tx.notification.create({ data: { userId: user.id, type, ...data, status: 'unread', isSeed: true } }),
        data,
        (n) => tx.notification.update({ where: { id: n.id }, data }),
        counts,
      );
    }
    return {};
  }

  private async seedAdminActions(tx: Tx, counts: DomainCounts, admin: { id: string }, vendors: { id: string }[]) {
    const data = { metadata: { note: 'Perfil revisado y aprobado para el directorio.' } };
    for (let i = 0; i < vendors.length && i < 6; i += 1) {
      const vendor = vendors[i]!;
      await syncSeed(
        () =>
          tx.adminAction.findFirst({
            where: { adminUserId: admin.id, action: 'vendor.approve', targetId: vendor.id, isSeed: true },
          }),
        () =>
          tx.adminAction.create({
            data: {
              adminUserId: admin.id,
              action: 'vendor.approve',
              targetEntity: 'VendorProfile',
              targetId: vendor.id,
              ...data,
              isSeed: true,
            },
          }),
        data,
        (a) => tx.adminAction.update({ where: { id: a.id }, data }),
        counts,
      );
    }
    return {};
  }

  /**
   * US-047 (PB-P1-041 / BE-006): 2 escenarios de moderación en el mismo shape que produce
   * `ModerateVendorUseCase` en runtime — permite que el panel admin US-074 muestre casos
   * `hide` y `reject` sin scripting manual.
   *
   * - `vendors[3]` (si existe) → action='hide' aplicada sobre `approved+visible`:
   *     `is_hidden=true` + audit columns pobladas + AdminAction (`action='hide'`) + chain
   *     `admin_action_id`.
   * - `vendors[4]` (si existe) → action='reject' aplicada sobre `approved` (simulando que se
   *     rechaza tras haber sido aprobado previamente por review admin): `status='rejected'`
   *     + audit + AdminAction (`action='reject'`) + chain.
   *
   * `ensure(...)` sobre `vendor_profiles.admin_action_id != NULL` mantiene idempotencia:
   * la primera pasada crea el AdminAction y linkea; la segunda encuentra la cadena ya
   * establecida y suma a `unchanged` (US-085 TS-02).
   */
  private async seedVendorModerations(
    tx: Tx,
    counts: DomainCounts,
    admin: { id: string },
    vendors: { id: string }[],
  ): Promise<Record<string, never>> {
    const scenarios: Array<{
      vendorIndex: number;
      action: 'hide' | 'reject';
      reason: string;
      updateData: { status?: 'rejected'; isHidden?: boolean };
      metadataDelta: { from_status: string; to_status: string; from_is_hidden: boolean; to_is_hidden: boolean };
    }> = [
      {
        vendorIndex: 3,
        action: 'hide',
        reason: 'Perfil ocultado temporalmente mientras se verifican las fotos del portafolio.',
        updateData: { isHidden: true },
        metadataDelta: { from_status: 'approved', to_status: 'approved', from_is_hidden: false, to_is_hidden: true },
      },
      {
        vendorIndex: 4,
        action: 'reject',
        reason: 'Falta documentación del negocio para publicar el perfil en el directorio.',
        updateData: { status: 'rejected' },
        metadataDelta: { from_status: 'approved', to_status: 'rejected', from_is_hidden: false, to_is_hidden: false },
      },
    ];

    for (const scenario of scenarios) {
      if (scenario.vendorIndex >= vendors.length) continue;
      const vendor = vendors[scenario.vendorIndex]!;

      // Guard idempotencia: si el vendor ya tiene `admin_action_id` seteado por US-047, saltamos
      // (unchanged — la ejecución previa dejó el estado deseado). NO se re-usa `vendor.approve`
      // legacy porque el seedAdminActions histórico apunta al mismo `targetId`; el chain nuevo
      // referencia una AdminAction distinta (action='hide'|'reject').
      const existingChain = await tx.vendorProfile.findFirst({
        where: { id: vendor.id, adminActionId: { not: null } },
        select: { id: true, adminActionId: true, moderationReason: true },
      });
      if (existingChain !== null) {
        // Sólo se realinea el texto del motivo (BDs sembradas con el texto anterior).
        if (existingChain.moderationReason === scenario.reason) {
          counts.unchanged += 1;
          continue;
        }
        await tx.vendorProfile.update({ where: { id: vendor.id }, data: { moderationReason: scenario.reason } });
        const action = await tx.adminAction.findUnique({ where: { id: existingChain.adminActionId! } });
        if (action) {
          await tx.adminAction.update({
            where: { id: action.id },
            data: { metadata: { ...(action.metadata as Record<string, unknown>), reason: scenario.reason } },
          });
        }
        counts.updated += 1;
        continue;
      }

      const adminAction = await tx.adminAction.create({
        data: {
          adminUserId: admin.id,
          action: scenario.action,
          targetEntity: 'vendor_profile',
          targetId: vendor.id,
          metadata: {
            correlationId: null,
            reason: scenario.reason,
            ...scenario.metadataDelta,
          },
          isSeed: true,
        },
        select: { id: true },
      });

      await tx.vendorProfile.update({
        where: { id: vendor.id },
        data: {
          ...scenario.updateData,
          moderatedBy: admin.id,
          moderationReason: scenario.reason,
          adminActionId: adminAction.id,
        },
        select: { id: true },
      });
      counts.created = (counts.created ?? 0) + 1;
    }

    return {};
  }

  /**
   * US-045 (PB-P1-028 / DB-001): recompone `vendor_profiles.rating_avg` y `reviews_count`
   * desde `reviews` publicadas y no soft-deleted. Fija el estado exacto (setea `0`/`NULL` en
   * vendors sin reviews) para preservar idempotencia entre corridas. No usa `$transaction`
   * porque la operación es autocontenida y no debe abortar el batch previo si falla.
   */
  private async recomputeVendorRatingAggregates(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      UPDATE "vendor_profiles" vp
      SET
        "rating_avg" = agg."avg",
        "reviews_count" = COALESCE(agg."cnt", 0)
      FROM (
        SELECT
          vp2."id" AS vpid,
          ROUND(AVG(r."rating")::numeric, 2) AS "avg",
          COUNT(r."id")::int AS "cnt"
        FROM "vendor_profiles" vp2
        LEFT JOIN "reviews" r
          ON r."vendor_profile_id" = vp2."id"
         AND r."status" = 'published'
         AND r."deleted_at" IS NULL
        GROUP BY vp2."id"
      ) agg
      WHERE vp."id" = agg.vpid
    `);
  }

  /**
   * Totales del presupuesto = suma de sus partidas (mismo criterio que `recomputeBudgetTotals` en
   * budget-management). Sólo toca presupuestos seed y sólo si cambian.
   */
  private async recomputeSeedBudgetTotals(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      UPDATE "budgets" b
      SET "total_planned" = agg."planned", "total_committed" = agg."committed"
      FROM (
        SELECT b2."id" AS bid,
          COALESCE(SUM(i."amount_planned"), 0) AS "planned",
          COALESCE(SUM(i."amount_committed"), 0) AS "committed"
        FROM "budgets" b2
        LEFT JOIN "budget_items" i ON i."budget_id" = b2."id"
        WHERE b2."is_seed" = true
        GROUP BY b2."id"
      ) agg
      WHERE b."id" = agg.bid
        AND (b."total_planned" <> agg."planned" OR b."total_committed" <> agg."committed")
    `);
  }
}

function featureScope(feature: SeedAiFeature): 'event' | 'vendor' | 'quote' {
  if (feature === 'vendor_bio') return 'vendor';
  if (feature === 'quote_brief' || feature === 'quote_comparison') return 'quote';
  return 'event';
}

function seedInputForFeature(feature: SeedAiFeature): Record<string, unknown> {
  return { feature, scenario: 'seed-demo', locale: 'es-LATAM' };
}
