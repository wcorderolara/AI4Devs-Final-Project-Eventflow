import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

/** Contenido crudo de `prisma/schema.prisma`. */
export const schema: string = readFileSync(
  resolve(here, '../../prisma/schema.prisma'),
  'utf8',
);

/** Extrae el cuerpo `{ ... }` de un bloque `model <name>` del schema. */
export function modelBlock(name: string): string | null {
  const re = new RegExp(`model\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const m = schema.match(re);
  return m ? m[1] : null;
}

/** Extrae el cuerpo `{ ... }` de un bloque `enum <name>`. */
export function enumBlock(name: string): string | null {
  const re = new RegExp(`enum\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const m = schema.match(re);
  return m ? m[1] : null;
}

/** Nombres de todos los modelos declarados. */
export function declaredModels(): string[] {
  return [...schema.matchAll(/^\s*model\s+(\w+)\s*\{/gm)].map((m) => m[1]);
}

/** Nombres de todos los enums declarados. */
export function declaredEnums(): string[] {
  return [...schema.matchAll(/^\s*enum\s+(\w+)\s*\{/gm)].map((m) => m[1]);
}

/** Los 19 modelos MVP canónicos (AC-01). */
export const MVP_MODELS = [
  'User',
  'Event',
  'EventType',
  'EventTask',
  'Budget',
  'BudgetItem',
  'VendorProfile',
  'VendorService',
  'ServiceCategory',
  'Location',
  'QuoteRequest',
  'Quote',
  'BookingIntent',
  'Review',
  'Notification',
  'Attachment',
  'AdminAction',
  'AIRecommendation',
  'AIPromptVersion',
] as const;

/** Modelos operativos que deben declarar `isSeed` (AC-06). Excluye AIPromptVersion (append-only). */
export const SEED_MODELS = MVP_MODELS.filter((m) => m !== 'AIPromptVersion');

/** Los 7 modelos con soft delete requerido (AC-07). */
export const SOFT_DELETE_MODELS = [
  'Review',
  'Attachment',
  'VendorProfile',
  'VendorService',
  'ServiceCategory',
  'EventType',
  'Location',
] as const;

/** Enums base (AC-02). */
export const BASE_ENUMS = ['UserRole', 'CurrencyCode', 'LanguageCode', 'LLMProvider'] as const;

/** Los 10 enums de status por entidad requeridos (AC-02). */
export const STATUS_ENUMS = [
  'EventStatus',
  'QuoteRequestStatus',
  'QuoteStatus',
  'BookingIntentStatus',
  'ReviewStatus',
  'NotificationStatus',
  'AttachmentStatus',
  'VendorProfileStatus',
  'VendorServiceStatus',
  'AIRecommendationStatus',
] as const;
