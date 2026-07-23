// US-126 (PB-P2-014 / BE-001). Helper `test-db` para pruebas de integración.
//
// Estrategia (deviation D-03 del execution record): el patrón real del repo es
// `describe.skipIf(!dbUp)` con un check upfront de connectividad (patrón
// establecido en US-084/US-122 y adoptado por 60+ specs de integration/api). Este
// helper centraliza el patrón para evitar boilerplate.
//
// Aislamiento (§7 Tech Spec US-126): `truncateAll()` limpia el estado antes de
// cada suite que muta. Se usa `TRUNCATE ... RESTART IDENTITY CASCADE` — coincide
// con el patrón validado en `us080-admin-actions-list.integration.spec.ts:97-99`.
// NO se usa transaction rollback porque Prisma tiene fricción con nested
// transactions y muchos flujos (job schedulers, notification handlers in-tx)
// commitea explícitamente.
//
// Uso típico:
//
//   import { describe } from 'vitest';
//   import { getTestPrisma, dbUp, truncateAll } from '../helpers/test-db.js';
//
//   const prisma = getTestPrisma();
//
//   describe.skipIf(!dbUp)('mi suite integration', () => {
//     beforeAll(async () => { await truncateAll(prisma); });
//     afterAll(async () => { await prisma.$disconnect(); });
//     it('mi caso', async () => { ... });
//   });
//
// Nota: `dbUp` es una CONSTANTE evaluada al importar el módulo (top-level await).
// Su valor NO cambia durante la ejecución de la suite. Esto permite `describe.skipIf`
// sin evaluar la conexión múltiples veces (EC-01 fail-fast).
import { PrismaClient } from '@prisma/client';

/** Timeout duro para la connectividad inicial (EC-01: fail-fast en 4s). */
const CONNECT_TIMEOUT_MS = 4_000;

let cachedPrisma: PrismaClient | null = null;

/** Singleton `PrismaClient` para tests — reusable entre specs. */
export function getTestPrisma(): PrismaClient {
  if (cachedPrisma === null) cachedPrisma = new PrismaClient();
  return cachedPrisma;
}

async function checkDbUp(prisma: PrismaClient): Promise<boolean> {
  try {
    await Promise.race([
      prisma.$queryRawUnsafe('SELECT 1'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), CONNECT_TIMEOUT_MS)),
    ]);
    return true;
  } catch {
    return false;
  }
}

/** Constante evaluada al load-time del módulo. `true` sólo si Postgres responde `SELECT 1`. */
export const dbUp: boolean = await checkDbUp(getTestPrisma());

/**
 * Lista canónica de tablas que se truncan por defecto en `truncateAll()`. Cubre las tablas
 * mutadas por la mayoría de suites integration del repo. Ordenadas para respetar dependencias
 * FK (Prisma usa `CASCADE` así que el orden estricto no importa, pero se lista de forma
 * legible por dominio).
 */
export const DEFAULT_TRUNCATE_TABLES: readonly string[] = Object.freeze([
  'reviews',
  'notifications',
  'booking_intents',
  'quotes',
  'quote_requests',
  'budget_items',
  'budgets',
  'event_tasks',
  'ai_recommendations',
  'events',
  'sessions',
  'password_reset_tokens',
  'admin_actions',
  'users',
  'event_types',
  'locations',
  'service_categories',
  'vendor_profile_categories',
  'vendor_services',
  'vendor_profiles',
]);

/**
 * Trunca las tablas listadas (default: DEFAULT_TRUNCATE_TABLES) con `RESTART IDENTITY CASCADE`.
 * NO trunca `ai_prompt_versions` — se preserva para no invalidar FKs de otras suites que corren
 * en el mismo runner (patrón consolidado en US-115 integration spec).
 *
 * Sin BD alcanzable: no-op silencioso (deja el flujo a `describe.skipIf(!dbUp)`).
 */
export async function truncateAll(
  prisma: PrismaClient = getTestPrisma(),
  tables: readonly string[] = DEFAULT_TRUNCATE_TABLES,
): Promise<void> {
  if (!dbUp) return;
  const list = tables.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}

/** Alias de `describe.skipIf(!dbUp)` para expresar la condición de forma legible. */
export const skipIfNoDb = !dbUp;
