import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  EVENT_TYPES,
  LOCATIONS,
  ORGANIZER_NAMES,
  SERVICE_CATEGORIES,
  VENDOR_BUSINESSES,
} from '../infrastructure/data/latam-data.js';
import { seedEmail } from '../domain/seed-key.js';
import { type DomainCounts, emptyCounts, type SeedReport } from '../domain/seed-report.js';

const SCRIPT_VERSION = '1.0.0';
// Hash placeholder determinista (no verifica; el seed no crea sesiones reales). Sin PII.
const SEED_PASSWORD_HASH = '$2b$10$seedseedseedseedseedseeQ0seedseedseedseedseedseedse';
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
  'vendor_bio',
  'task_prioritization',
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
        (tx) => this.seedQuotes(tx, c, events, catalogs.categories, vendors),
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
        (tx) => this.seedNotifications(tx, c, [identities.admin, ...identities.organizers, ...identities.vendorUsers]),
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

    const finishedAt = new Date();
    report.finishedAt = finishedAt.toISOString();
    report.durationMs = finishedAt.getTime() - startedAt.getTime();
    return report;
  }

  private async seedCatalogs(tx: Tx, counts: DomainCounts) {
    const eventTypes = [];
    for (const et of EVENT_TYPES) {
      eventTypes.push(
        await ensure(
          () => tx.eventType.findUnique({ where: { code: et.code } }),
          () => tx.eventType.create({ data: { code: et.code, label: et.label, isActive: true, isSeed: true } }),
          counts,
        ),
      );
    }
    const categories = [];
    for (const cat of SERVICE_CATEGORIES) {
      categories.push(
        await ensure(
          () => tx.serviceCategory.findUnique({ where: { code: cat.code } }),
          () =>
            tx.serviceCategory.create({
              data: { code: cat.code, label: cat.label, depthLevel: cat.depthLevel, isActive: true, isSeed: true },
            }),
          counts,
        ),
      );
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
    locations: { id: string }[],
  ) {
    const vendors = [];
    for (let i = 0; i < vendorUsers.length; i += 1) {
      const user = vendorUsers[i]!;
      // US-042 SEED-001: el primer vendor demo carga `categoryChangeCount=4` para poder
      // demostrar el bloqueo `409 CATEGORY_CHANGE_LIMIT` al 5to/6to cambio sin scripting.
      const isCategoryLimitDemoVendor = i === 0;
      const profile = await ensure(
        () => tx.vendorProfile.findUnique({ where: { userId: user.id } }),
        () =>
          tx.vendorProfile.create({
            data: {
              userId: user.id,
              businessName: VENDOR_BUSINESSES[i]!,
              bio: `${VENDOR_BUSINESSES[i]} — proveedor demo de eventos LATAM.`,
              status: 'approved',
              locationId: locations[i % locations.length]!.id,
              languagesSupported: ['es-LATAM', 'es-ES'],
              categoryChangeCount: isCategoryLimitDemoVendor ? 4 : 0,
              requiresAdminReview: isCategoryLimitDemoVendor,
              isSeed: true,
            },
          }),
        counts,
      );
      // Un servicio por vendor, categoría rotada.
      const category = categories[i % categories.length]!;
      await ensure(
        () =>
          tx.vendorService.findFirst({
            where: { vendorProfileId: profile.id, serviceCategoryId: category.id, isSeed: true },
          }),
        () =>
          tx.vendorService.create({
            data: {
              vendorProfileId: profile.id,
              serviceCategoryId: category.id,
              packageName: `${VENDOR_BUSINESSES[i]} — ${category.code}`,
              description: `Paquete demo de ${VENDOR_BUSINESSES[i]} en la categoría ${category.code}. Incluye servicios base para eventos.`,
              basePrice: 1000,
              currencyCode: 'GTQ',
              isActive: true,
              isSeed: true,
            },
          }),
        counts,
      );
      // US-042: pobla la M:N `vendor_profile_categories` alineada con la categoría del
      // servicio del vendor. La PK compuesta previene duplicados en re-runs (idempotente).
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
      vendors.push({ id: profile.id, userId: user.id });
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
    eventTypes: { id: string }[],
    locations: { id: string }[],
  ) {
    const eventCount = 12;
    // US-087 AC-01 — Mix garantizado: draft≥2, active≥4, completed≥2, cancelled≥1 (total 10–15).
    // Plan por defecto (12): completed×3, active×5, draft×2, cancelled×2. El hook `eventStatusPlan`
    // (US-087 override) puede sustituirlo, pero el default ya satisface los AC.
    const defaultPlan: Array<'draft' | 'active' | 'completed' | 'cancelled'> = [
      'completed', 'completed', 'completed',
      'active', 'active', 'active', 'active', 'active',
      'draft', 'draft',
      'cancelled', 'cancelled',
    ];
    const statusPlan = this.hooks.eventStatusPlan?.(eventCount) ?? defaultPlan;

    // AC-04 — Un mismo organizador (organizers[0]) ancla un evento en cada estado.
    const ANCHOR_COMPLETED = 0;
    const ANCHOR_ACTIVE = 3;
    const ANCHOR_DRAFT = 8;
    const ANCHOR_CANCELLED = 10;
    const anchorIndices = new Set([ANCHOR_COMPLETED, ANCHOR_ACTIVE, ANCHOR_DRAFT, ANCHOR_CANCELLED]);

    const events = [];
    for (let i = 0; i < eventCount; i += 1) {
      // AC-04: los índices ancla van al organizador 0; el resto rota.
      const organizer = anchorIndices.has(i) ? organizers[0]! : organizers[i % organizers.length]!;
      const eventType = eventTypes[i % eventTypes.length]!;
      const title = `Evento Demo #${i + 1}`;
      const status = statusPlan[i] ?? 'draft';
      // AC-03 — Multi-currency (GTQ/USD) y multi-locale (es-LATAM/en) por paridad de índice.
      const currency = i % 2 === 0 ? 'GTQ' : 'USD';
      const language = i % 2 === 0 ? 'es_LATAM' : 'en';
      // AC-02 — Un evento completed con auto_completed=true + completed_at; y un evento active
      // "cercano a auto-completar" con event_date = hoy − 2 días (dinámico, EC-03).
      const autoCompleted = i === ANCHOR_COMPLETED;
      const completedAt =
        status === 'completed'
          ? autoCompleted
            ? relativeSeedDate(-1)
            : new Date('2026-05-01T00:00:00Z')
          : null;
      const eventDate = i === ANCHOR_ACTIVE ? relativeSeedDate(-2) : new Date('2026-08-15T00:00:00Z');
      // El schema MVP (US-099) no tiene `cancelled_reason`; la traza de cancelación va en `notes`
      // (ver desviación D1 de US-087). Migraciones nuevas son responsabilidad de US-100.
      const notes = status === 'cancelled' ? 'Cancelado (demo): proveedor no disponible en la fecha.' : null;
      const event = await ensure(
        () => tx.event.findFirst({ where: { title, isSeed: true } }),
        () =>
          tx.event.create({
            data: {
              userId: organizer.id,
              eventTypeId: eventType.id,
              locationId: locations[i % locations.length]!.id,
              title,
              status,
              currency,
              language,
              eventDate,
              guestsCount: 50 + i * 10,
              estimatedBudget: 20000 + i * 5000,
              autoCompleted,
              completedAt,
              notes,
              isSeed: true,
            },
          }),
        counts,
      );
      // Budget 1:1 + 2 items.
      const budget = await ensure(
        () => tx.budget.findUnique({ where: { eventId: event.id } }),
        () => tx.budget.create({ data: { eventId: event.id, totalPlanned: 20000, totalCommitted: 5000, isSeed: true } }),
        counts,
      );
      for (const label of ['Catering', 'Decoración']) {
        await ensure(
          () => tx.budgetItem.findFirst({ where: { budgetId: budget.id, label, isSeed: true } }),
          () => tx.budgetItem.create({ data: { budgetId: budget.id, label, amountPlanned: 8000, amountCommitted: 2000, isSeed: true } }),
          counts,
        );
      }
      // Una tarea por evento.
      await ensure(
        () => tx.eventTask.findFirst({ where: { eventId: event.id, title: 'Confirmar proveedores', isSeed: true } }),
        () => tx.eventTask.create({ data: { eventId: event.id, title: 'Confirmar proveedores', status: 'pending', origin: 'manual', isSeed: true } }),
        counts,
      );
      events.push({ id: event.id, userId: organizer.id });
    }
    return events;
  }

  private async seedQuotes(
    tx: Tx,
    counts: DomainCounts,
    events: { id: string }[],
    categories: { id: string }[],
    vendors: { id: string }[],
  ) {
    const quoteRequests: { id: string; eventId: string; serviceCategoryId: string; vendorProfileId: string }[] = [];
    const quotes: { id: string; quoteRequestId: string; vendorProfileId: string; amount: number }[] = [];
    const chains = 20;
    for (let k = 0; k < chains; k += 1) {
      const event = events[Math.floor(k / 2) % events.length]!;
      const category = categories[k % categories.length]!;
      const vendor = vendors[k % vendors.length]!;
      const qr = await ensure(
        () =>
          tx.quoteRequest.findFirst({
            where: { eventId: event.id, serviceCategoryId: category.id, vendorProfileId: vendor.id, isSeed: true },
          }),
        () =>
          tx.quoteRequest.create({
            data: {
              eventId: event.id,
              serviceCategoryId: category.id,
              vendorProfileId: vendor.id,
              status: 'responded',
              brief: { summary: 'Solicitud demo', requirements: ['LATAM'] },
              isSeed: true,
            },
          }),
        counts,
      );
      quoteRequests.push({ id: qr.id, eventId: event.id, serviceCategoryId: category.id, vendorProfileId: vendor.id });
      const quote = await ensure(
        () => tx.quote.findFirst({ where: { quoteRequestId: qr.id, vendorProfileId: vendor.id, isSeed: true } }),
        () =>
          tx.quote.create({
            data: {
              quoteRequestId: qr.id,
              vendorProfileId: vendor.id,
              // US-058 (PB-P1-035 / DB-002): columnas denormalizadas ahora requeridas.
              eventId: event.id,
              serviceCategoryId: category.id,
              amount: 5000 + k * 250,
              currency: 'GTQ',
              status: 'accepted',
              // US-058: UNIQUE parcial `(event_id, service_category_id) WHERE is_preferred=true`
              // exige que sólo UNA Quote por (event, category) sea preferred. Se relaja el patrón
              // `k % 3 === 0` a `k === 0` para garantizar unicidad — cada iteración usa una
              // combinación distinta de (event, category) por diseño del loop, pero la seguridad
              // se refuerza con esta simplificación.
              isPreferred: k === 0,
              isSeed: true,
            },
          }),
        counts,
      );
      quotes.push({ id: quote.id, quoteRequestId: qr.id, vendorProfileId: vendor.id, amount: 5000 + k * 250 });
    }

    // US-056 (BE-007): QR viewed sin Quote para el demo del "cancel válido" (AC-01). El
    // demo del "cancel bloqueado por confirmed_intent" (EC-01) queda cubierto por los índices
    // de `bookingPlan` con `kind: 'confirmed'` en `seedBookingsAndReviews` — cancelar los QRs
    // asociados a esos quotes falla con `QR_HAS_CONFIRMED_BOOKING`.
    if (events.length > 0 && categories.length > 0 && vendors.length > 0) {
      const demoEvent = events[0]!;
      const demoCategory = categories[categories.length - 1]!;
      const demoVendor = vendors[vendors.length - 1]!;
      await ensure(
        () =>
          tx.quoteRequest.findFirst({
            where: {
              eventId: demoEvent.id,
              serviceCategoryId: demoCategory.id,
              vendorProfileId: demoVendor.id,
              status: 'viewed',
              isSeed: true,
            },
          }),
        () =>
          tx.quoteRequest.create({
            data: {
              eventId: demoEvent.id,
              serviceCategoryId: demoCategory.id,
              vendorProfileId: demoVendor.id,
              status: 'viewed',
              brief: { summary: 'QR demo cancelable (US-056)', requirements: ['LATAM'] },
              viewedAt: new Date('2026-05-01T10:00:00Z'),
              isSeed: true,
            },
          }),
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
    _categories: { id: string }[],
    organizers: { id: string }[],
    admin: { id: string },
    events: { id: string; userId: string }[],
  ) {
    // US-060 (PB-P1-036 / DB-002): `booking_intents.created_by` es `NOT NULL`. Se resuelve por
    // `eventId → event.userId` (organizer dueño del evento — semántica de la creación real vía
    // POST /booking-intents). Fallback defensivo a `organizers[0]` si el mapeo faltara.
    const eventOwnerByEventId = new Map(events.map((e) => [e.id, e.userId]));
    const reviewCounts = report.domains.reviews ?? emptyCounts();
    report.domains.reviews = reviewCounts;

    // US-088 AC-01/AC-02 — Matriz de BookingIntent (8): 5 confirmed_intent, 1 pending,
    // 1 cancelado-desde-pending, 1 cancelado-desde-confirmed. Los confirmed usan quotes de EVENTOS
    // DISTINTOS (índices 0,2,4,6,8) → (event, category) distinto (uq confirmed C-037) y presupuesto
    // no ambiguo (AC-05). FKs a quotes `accepted` de seedQuotes. is_simulated + is_seed siempre.
    const CONFIRMED_AT = new Date('2026-05-10T00:00:00Z');
    const CANCELLED_AT = new Date('2026-05-15T00:00:00Z'); // > confirmedAt (BR-BOOKING-009, EC-03).
    const bookingPlan: Array<{ idx: number; kind: 'confirmed' | 'pending' | 'cancelled_pending' | 'cancelled_confirmed' }> = [
      { idx: 0, kind: 'confirmed' }, { idx: 2, kind: 'confirmed' }, { idx: 4, kind: 'confirmed' },
      { idx: 6, kind: 'confirmed' }, { idx: 8, kind: 'confirmed' },
      { idx: 1, kind: 'pending' },
      { idx: 3, kind: 'cancelled_pending' },
      { idx: 5, kind: 'cancelled_confirmed' },
    ];

    const confirmedBookings: { id: string; eventId: string; vendorProfileId: string; amount: number }[] = [];

    for (const { idx, kind } of bookingPlan) {
      const quote = quotes.quotes[idx]!;
      const qr = quotes.quoteRequests.find((r) => r.id === quote.quoteRequestId)!;
      const status = kind === 'confirmed' ? 'confirmed_intent' : kind === 'pending' ? 'pending' : 'cancelled';
      const cancelledFromConfirmed = kind === 'cancelled_confirmed';
      const confirmedAt = kind === 'confirmed' || cancelledFromConfirmed ? CONFIRMED_AT : null;
      const isCancelled = status === 'cancelled';
      const booking = await ensure(
        () => tx.bookingIntent.findFirst({ where: { eventId: qr.eventId, serviceCategoryId: qr.serviceCategoryId, isSeed: true } }),
        () =>
          tx.bookingIntent.create({
            data: {
              quoteId: quote.id,
              eventId: qr.eventId,
              serviceCategoryId: qr.serviceCategoryId,
              vendorProfileId: qr.vendorProfileId,
              createdBy: eventOwnerByEventId.get(qr.eventId) ?? organizers[0]!.id,
              status,
              isSimulated: true,
              confirmedAt,
              cancelledAt: isCancelled ? CANCELLED_AT : null,
              cancelledBy: isCancelled ? organizers[0]!.id : null,
              cancellationReason: isCancelled
                ? cancelledFromConfirmed
                  ? 'Cancelado tras confirmación (demo): cambio de fecha del evento.'
                  : 'Cancelado desde pendiente (demo): el cliente eligió otro proveedor.'
                : null,
              isSeed: true,
            },
          }),
        counts,
      );
      if (kind === 'confirmed') {
        confirmedBookings.push({ id: booking.id, eventId: qr.eventId, vendorProfileId: qr.vendorProfileId, amount: quote.amount });
      }
    }

    // US-088 AC-05 — `BudgetItem.committed` refleja el monto del quote por cada confirmed_intent.
    // Set fijo (idempotente): re-ejecutar deja el mismo valor. Eventos distintos → sin sobreescritura.
    // US-039 (SEED-001): además del monto en el item, marca `booking_intents.committed_synced_at`
    // y `committed_synced_amount` para reflejar el estado post-sync del handler
    // `UpdateCommittedFromBookingIntent`. Consistente con la demo D1 (idempotencia).
    const SYNCED_AT = new Date('2026-05-10T00:00:01Z');
    for (const cb of confirmedBookings) {
      const budget = await tx.budget.findUnique({ where: { eventId: cb.eventId }, select: { id: true } });
      if (!budget) continue;
      const item = await tx.budgetItem.findFirst({ where: { budgetId: budget.id, isSeed: true }, orderBy: { label: 'asc' }, select: { id: true } });
      if (item) await tx.budgetItem.update({ where: { id: item.id }, data: { amountCommitted: cb.amount } });
      await tx.bookingIntent.update({
        where: { id: cb.id },
        data: { committedSyncedAt: SYNCED_AT, committedSyncedAmount: cb.amount },
      });
    }

    // US-088 AC-03/EC-04 — Reseñas (24): asociadas SOLO a confirmed_intent; ~70/20/10
    // published/hidden/removed; multi-locale (es-LATAM/en); rating 1..5; (booking, author) distinto.
    const REVIEW_TOTAL = 24;
    const nConfirmed = confirmedBookings.length;
    for (let i = 0; i < REVIEW_TOTAL; i += 1) {
      const booking = confirmedBookings[i % nConfirmed]!;
      const author = organizers[Math.floor(i / nConfirmed) % organizers.length]!;
      const status = i < 17 ? 'published' : i < 22 ? 'hidden' : 'removed';
      const review = await ensure(
        () => tx.review.findFirst({ where: { bookingIntentId: booking.id, authorId: author.id, isSeed: true } }),
        () =>
          tx.review.create({
            data: {
              bookingIntentId: booking.id,
              vendorProfileId: booking.vendorProfileId,
              authorId: author.id,
              rating: 1 + (i % 5),
              comment: i % 2 === 0
                ? 'Excelente servicio, muy recomendado. Superó nuestras expectativas (demo).'
                : 'Outstanding service, highly recommended. Exceeded our expectations (demo).',
              status,
              isSeed: true,
            },
          }),
        reviewCounts,
      );
      // US-088 AC-04 — Trazabilidad de moderación: `AdminAction` por cada review hidden/removed.
      // US-067 (PB-P1-040 / BE-006): además del AdminAction se pueblan las 4 columnas audit
      // en `reviews` (`moderated_by`, `moderated_at`, `moderation_reason`, `admin_action_id`)
      // introducidas por la migración `20260720150000_us067_reviews_moderation_audit_columns`.
      // Esto habilita la demo del admin panel — `ReviewModerationTable` muestra el badge del
      // AdminAction y el `moderatedAt` sin depender de una moderación runtime posterior. El
      // UPDATE es idempotente: `ensure` no lo re-ejecuta si el `admin_action_id` ya está seteado.
      if (status !== 'published') {
        // Nombres canónicos del contrato admin US-067 (`hide` | `remove`). Se preservan las
        // constantes históricas del seed (`HIDE_REVIEW`/`REMOVE_REVIEW`) sólo si ya existieran
        // en snapshots previos — no las usamos aquí para mantener paridad EXACTA con el shape
        // que produce `ModerateReviewUseCase` en runtime (Decisión PO D8).
        const action = status === 'hidden' ? 'hide' : 'remove';
        const reason = status === 'hidden'
          ? 'Contenido marcado para revisión (demo).'
          : 'Reseña eliminada por incumplir políticas (demo).';
        const moderatedAt = new Date('2026-05-20T12:00:00Z'); // determinista
        const adminAction = await ensure(
          () => tx.adminAction.findFirst({ where: { action, targetEntity: 'review', targetId: review.id, isSeed: true } }),
          () =>
            tx.adminAction.create({
              data: {
                adminUserId: admin.id,
                action,
                targetEntity: 'review',
                targetId: review.id,
                metadata: {
                  reason,
                  from_status: 'published',
                  to_status: status,
                  rating_snapshot: review.rating,
                  comment_snapshot: review.comment,
                },
                isSeed: true,
              },
            }),
          counts,
        );
        // UPDATE idempotente de columnas audit + chain al AdminAction (BR-ADMIN-011).
        if (review.adminActionId !== adminAction.id) {
          await tx.review.update({
            where: { id: review.id },
            data: {
              moderatedBy: admin.id,
              moderatedAt,
              moderationReason: reason,
              adminActionId: adminAction.id,
            },
          });
        }
      }
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
      // US-087 default plan: events[0..2]=completed, events[3..7]=active, events[8..9]=draft.
      // El seed genera events con currency alternado por índice (GTQ pares, USD impares).
      // El mock provider genera `budget_suggestion.currencyCode='GTQ'` por default (sin
      // `input.currencyCode`), por lo que necesitamos un evento editable **y** con
      // currency='GTQ' para evitar `CurrencyMismatchError` en el apply (AC-08 defensa profunda).
      const editableEvents = await tx.event.findMany({
        where: {
          id: { in: events.map((e) => e.id) },
          status: { in: ['draft', 'active'] },
          currency: 'GTQ',
        },
        select: { id: true },
        take: 1,
      });
      const pendingBudgetEventTarget = editableEvents[0] ?? events[0]!;
      const pendingBudgetGen = generated.find((g) => g.feature === 'budget_suggestion');
      if (pendingBudgetGen) {
        await ensure(
          () =>
            tx.aIRecommendation.findFirst({
              where: {
                kind: 'budget_suggestion',
                status: 'pending',
                eventId: pendingBudgetEventTarget.id,
                isSeed: true,
              },
            }),
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
                amountPlanned: 3500,
                amountCommitted: 0,
                aiRecommendationId: acceptedRec.id,
                isSeed: true,
              },
              {
                budgetId: budgetOfMainEvent.id,
                label: 'Catering (IA previo)',
                categoryCode: 'catering',
                amountPlanned: 2500,
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

  private async seedNotifications(tx: Tx, counts: DomainCounts, users: { id: string }[]) {
    for (let i = 0; i < users.length && i < 18; i += 1) {
      const user = users[i]!;
      const type = `seed.demo.welcome.${i}`;
      await ensure(
        () => tx.notification.findFirst({ where: { userId: user.id, type, isSeed: true } }),
        () =>
          tx.notification.create({
            data: { userId: user.id, type, payload: { message: 'Bienvenido a EventFlow (demo)' }, status: 'unread', isSeed: true },
          }),
        counts,
      );
    }
    return {};
  }

  private async seedAdminActions(tx: Tx, counts: DomainCounts, admin: { id: string }, vendors: { id: string }[]) {
    for (let i = 0; i < vendors.length && i < 6; i += 1) {
      const vendor = vendors[i]!;
      await ensure(
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
              metadata: { note: 'Aprobación demo' },
              isSeed: true,
            },
          }),
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
        reason: 'Perfil ocultado temporalmente por revisión de contenido (demo seed).',
        updateData: { isHidden: true },
        metadataDelta: { from_status: 'approved', to_status: 'approved', from_is_hidden: false, to_is_hidden: true },
      },
      {
        vendorIndex: 4,
        action: 'reject',
        reason: 'Documentación insuficiente para publicación en el directorio (demo seed).',
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
        select: { id: true },
      });
      if (existingChain !== null) {
        counts.unchanged = (counts.unchanged ?? 0) + 1;
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
}

function featureScope(feature: SeedAiFeature): 'event' | 'vendor' | 'quote' {
  if (feature === 'vendor_bio') return 'vendor';
  if (feature === 'quote_brief' || feature === 'quote_comparison') return 'quote';
  return 'event';
}

function seedInputForFeature(feature: SeedAiFeature): Record<string, unknown> {
  return { feature, scenario: 'seed-demo', locale: 'es-LATAM' };
}
