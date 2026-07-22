// US-034 (PB-P2-004 / BE-006). `EmitT7NotificationsUseCase`.
//
// Orquesta el emisor T-7:
//   1. Calcula `targetDate = today_in_America_Guatemala + 7 días` (calendario, sin
//      componente horario). Guatemala es UTC-6 sin DST, así que el shift es exacto.
//   2. Itera `EventTaskT7Repository.findT7Candidates` por chunks de `batchSize` hasta
//      que la última página retorne < `batchSize` filas.
//   3. Por cada candidato:
//        * `existsTaskDueSoonForTask` → skip silencioso si ya emitido (idempotencia D2).
//        * Resuelve `languageCode` vía `OrganizerLanguageLookup`, fallback al
//          `event.language` (D6).
//        * Guard invariante `notification.user_id = event.owner_id` (BR-NOTIF-005).
//        * Crea 2 filas `Notification` (canal `in_app` + `email_simulated`) con el
//          mismo `payload` (D5).
//        * Emite el log estructurado `email_simulated` (NFR-OBS-004).
//   4. Emite un log resumen `job.t7Notifications.completed` con `correlationId`,
//      `affected`, `scannedChunks` (AC-05).
//
// El `correlationId` lo provee el job caller (patrón `AutoCompletePastEventsJob`).
// Errores por chunk no abortan el run: se loggean como `job.t7Notifications.chunkFailed`
// y el use case continúa con el siguiente chunk (§7 spec).
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type {
  SupportedLanguage,
} from '../../../shared/constants/languages.js';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';
import type {
  T7CandidateRow,
  T7CandidateSourcePort,
} from '../../../shared/application/t7-candidate-source.port.js';
import type { T7LanguagePreferenceReader } from '../../../shared/application/t7-language-preference-reader.port.js';
import type { NotificationT7Repository } from '../ports/notification-t7.repository.js';
import type { SimulatedT7EmailPort } from '../ports/simulated-t7-email.port.js';
import {
  BrNotif005InvariantViolationError,
  type NotificationChannel,
} from '../domain/index.js';

/** Contrato mínimo del logger consumido por el use case. Los tests capturan estructurado. */
export interface EmitT7Logger {
  info(payload: Record<string, unknown>): void;
  error(payload: Record<string, unknown>): void;
}

export interface EmitT7NotificationsDeps {
  clock: ClockPort;
  taskRepo: T7CandidateSourcePort;
  notificationRepo: NotificationT7Repository;
  languageLookup: T7LanguagePreferenceReader;
  emailAdapter: SimulatedT7EmailPort;
  logger: EmitT7Logger;
  /** Chunk size del `findT7Candidates`. Default 100 (tech spec §7). */
  batchSize?: number;
}

export interface EmitT7Result {
  affected: number;
  correlationId: string;
  scannedChunks: number;
}

export interface EmitT7RunInput {
  correlationId: string;
}

const DEFAULT_BATCH_SIZE = 100;
/** Guatemala: UTC-6 fijo (sin DST). Fuente: docs/1 §Mercado piloto. */
const GUATEMALA_UTC_OFFSET_HOURS = -6;

export class EmitT7NotificationsUseCase {
  constructor(private readonly deps: EmitT7NotificationsDeps) {}

  async execute(input: EmitT7RunInput): Promise<EmitT7Result> {
    const { clock, taskRepo, logger } = this.deps;
    const batchSize = this.deps.batchSize ?? DEFAULT_BATCH_SIZE;
    const { correlationId } = input;

    const targetDate = calculateT7TargetDate(clock.now());
    let affected = 0;
    let offset = 0;
    let scannedChunks = 0;

    // Loop por chunks hasta agotar candidatos. El repo ordena por (event_id, task_id)
    // para determinismo (tech spec §7).
    // eslint-disable-next-line no-constant-condition -- ver break interno; salida por batch.length
    while (true) {
      let chunk: T7CandidateRow[];
      try {
        chunk = await taskRepo.findT7Candidates({ targetDate, batchSize, offset });
      } catch (err) {
        logger.error({
          event: 'job.t7Notifications.chunkFailed',
          correlationId,
          chunkIndex: scannedChunks,
          offset,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
        // Fallo al leer un chunk: no continuar (sin visibilidad del siguiente offset).
        break;
      }
      if (chunk.length === 0) break;
      scannedChunks += 1;

      const firstTaskId = chunk[0]!.taskId;
      const lastTaskId = chunk[chunk.length - 1]!.taskId;

      try {
        for (const row of chunk) {
          const created = await this.processCandidate(row, correlationId);
          if (created) affected += 1;
        }
      } catch (err) {
        logger.error({
          event: 'job.t7Notifications.chunkFailed',
          correlationId,
          chunkIndex: scannedChunks - 1,
          firstTaskId,
          lastTaskId,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
        // Continúa con el siguiente chunk (tech spec §7).
      }

      if (chunk.length < batchSize) break;
      offset += chunk.length;
    }

    logger.info({
      event: 'job.t7Notifications.completed',
      correlationId,
      affected,
      scannedChunks,
    });

    return { affected, correlationId, scannedChunks };
  }

  /**
   * Procesa un candidato: chequeo de idempotencia, resolución de idioma, guard
   * BR-NOTIF-005, doble INSERT (in_app + email_simulated) y emisión del log de email.
   * Retorna `true` si emitió un par nuevo, `false` si el par ya existía (idempotencia).
   * Un `BrNotif005InvariantViolationError` interno se relanza para que el chunk lo
   * loggee y salte al siguiente.
   */
  private async processCandidate(
    row: T7CandidateRow,
    correlationId: string,
  ): Promise<boolean> {
    const { notificationRepo, languageLookup, emailAdapter } = this.deps;

    // Guard defensivo: BR-NOTIF-005. `user_id` sólo puede ser `event.owner_id`.
    if (row.ownerUserId.length === 0) {
      throw new BrNotif005InvariantViolationError(row.ownerUserId, row.ownerUserId);
    }

    const alreadyEmitted = await notificationRepo.existsTaskDueSoonForTask(
      row.ownerUserId,
      row.taskId,
    );
    if (alreadyEmitted) return false;

    const language = await resolveLanguage(
      languageLookup,
      row.ownerUserId,
      row.eventLanguage,
    );

    const commonPayload = {
      userId: row.ownerUserId,
      taskId: row.taskId,
      eventId: row.eventId,
      dueDate: row.dueDate,
      languageCode: language,
    };

    // Doble INSERT (D5). Orden fijo (in_app primero) para determinismo en tests.
    const channels: NotificationChannel[] = ['in_app', 'email_simulated'];
    for (const channel of channels) {
      await notificationRepo.create({ ...commonPayload, channel });
    }

    emailAdapter.logEmail({
      toUserId: row.ownerUserId,
      taskId: row.taskId,
      eventId: row.eventId,
      dueDate: row.dueDate,
      language,
      correlationId,
    });

    return true;
  }
}

/**
 * Calcula la fecha objetivo T-7 como `today_in_America_Guatemala + 7 días` a
 * medianoche UTC (compatible con `due_date::date` de Postgres).
 *
 * Guatemala = UTC-6 sin DST: sumamos el offset al `now` antes de extraer año/mes/día,
 * luego construimos un `Date` a medianoche UTC del día objetivo. El resultado es
 * estable independientemente de la timezone del proceso Node (por ejemplo, TZ=UTC en CI).
 */
export function calculateT7TargetDate(now: Date): Date {
  // Convertir a "wall clock" de Guatemala restando 6h. Ejemplo: 00:00 UTC del 22-Jul
  // en Guatemala son las 18:00 del 21-Jul del día anterior; el shift preserva la
  // aritmética calendario (D4).
  const guatemalaMs = now.getTime() + GUATEMALA_UTC_OFFSET_HOURS * 3_600_000;
  const guatemalaNow = new Date(guatemalaMs);
  const y = guatemalaNow.getUTCFullYear();
  const m = guatemalaNow.getUTCMonth();
  const d = guatemalaNow.getUTCDate();
  // Sumar 7 días calendario (D4). `Date.UTC` normaliza cruces de mes/año.
  return new Date(Date.UTC(y, m, d + 7, 0, 0, 0, 0));
}

/**
 * Resuelve el idioma del destinatario: `preferredLanguage` del usuario si está
 * catalogado, sino fallback al `eventLanguage` (D6). Si el `eventLanguage` tampoco
 * está catalogado (por ejemplo un enum futuro no soportado por el catálogo T-7),
 * cae en `es-LATAM` (default de negocio de `docs/6 §Event.language`) — última
 * defensa que evita emitir `Notification.language_code` sin plantilla asociada.
 */
async function resolveLanguage(
  lookup: T7LanguagePreferenceReader,
  userId: string,
  eventLanguage: string,
): Promise<SupportedLanguage> {
  const preferred = await lookup.findPreferredLanguage(userId);
  if (preferred) return preferred;
  const eventLangApi = coerceToSupported(eventLanguage);
  if (eventLangApi) return eventLangApi;
  return 'es-LATAM';
}

/** Traduce un enum Prisma (`es_LATAM`) o un código API (`es-LATAM`) a `SupportedLanguage`. */
function coerceToSupported(value: string): SupportedLanguage | null {
  const normalized = value.replace('_', '-') as SupportedLanguage;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(normalized)
    ? normalized
    : null;
}
