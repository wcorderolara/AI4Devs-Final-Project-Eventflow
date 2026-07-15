import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

/** Ruta absoluta al directorio `prisma/migrations`. */
export const migrationsDir: string = resolve(here, '../../prisma/migrations');

/** Directorios de migración (excluye `migration_lock.toml`), orden cronológico por nombre. */
export function migrationDirs(): string[] {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/** Directorio de la baseline init migration (`<ts>_init`). */
export function initMigrationDir(): string {
  const init = migrationDirs().find((name) => /^\d{14}_init$/.test(name));
  if (!init) throw new Error('No se encontró la baseline `<YYYYMMDDHHMMSS>_init` en prisma/migrations');
  return init;
}

/** Contenido crudo del `migration.sql` de la baseline init. */
export function initMigrationSql(): string {
  return readFileSync(resolve(migrationsDir, initMigrationDir(), 'migration.sql'), 'utf8');
}

/** Directorio de la migración de índices críticos (`<ts>_critical_indexes`) — US-101. */
export function criticalIndexesMigrationDir(): string {
  const dir = migrationDirs().find((name) => /^\d{14}_critical_indexes$/.test(name));
  if (!dir) throw new Error('No se encontró la migración `<ts>_critical_indexes` en prisma/migrations');
  return dir;
}

/** Contenido crudo del `migration.sql` de la migración de índices críticos (US-101). */
export function criticalIndexesMigrationSql(): string {
  return readFileSync(resolve(migrationsDir, criticalIndexesMigrationDir(), 'migration.sql'), 'utf8');
}

/** Directorio de la migración de constraints (`<ts>_db_constraints`) — US-102. */
export function dbConstraintsMigrationDir(): string {
  const dir = migrationDirs().find((name) => /^\d{14}_db_constraints$/.test(name));
  if (!dir) throw new Error('No se encontró la migración `<ts>_db_constraints` en prisma/migrations');
  return dir;
}

/** Contenido crudo del `migration.sql` de la migración de constraints (US-102). */
export function dbConstraintsMigrationSql(): string {
  return readFileSync(resolve(migrationsDir, dbConstraintsMigrationDir(), 'migration.sql'), 'utf8');
}

/** Contenido concatenado de TODOS los `migration.sql` bajo prisma/migrations. */
export function allMigrationSql(): { file: string; content: string }[] {
  return migrationDirs().map((name) => ({
    file: `${name}/migration.sql`,
    content: readFileSync(resolve(migrationsDir, name, 'migration.sql'), 'utf8'),
  }));
}

/** Las 19 tablas físicas MVP esperadas (US-100 §10; AC-01/AC-02/AC-05). */
export const MVP_TABLES = [
  'users',
  'events',
  'event_types',
  'event_tasks',
  'budgets',
  'budget_items',
  'vendor_profiles',
  'vendor_services',
  'service_categories',
  'locations',
  'quote_requests',
  'quotes',
  'booking_intents',
  'reviews',
  'notifications',
  'attachments',
  'admin_actions',
  'ai_recommendations',
  'ai_prompt_versions',
] as const;

/**
 * Los 14 enums físicos canónicos requeridos por AC-05 (nombres físicos PostgreSQL).
 * Nota: US-099 (nota N-03) añadió 2 enums auxiliares (`EventTaskStatus`, `EventTaskOrigin`);
 * los tests verifican la *presencia* de estos 14 (superset permitido), no un conteo exacto.
 */
export const CANONICAL_ENUMS = [
  'UserRole',
  'CurrencyCode',
  'LanguageCode',
  'LLMProvider',
  'EventStatus',
  'QuoteRequestStatus',
  'QuoteStatus',
  'BookingIntentStatus',
  'ReviewStatus',
  'NotificationStatus',
  'AttachmentStatus',
  'VendorProfileStatus',
  'AIRecommendationStatus',
] as const;
