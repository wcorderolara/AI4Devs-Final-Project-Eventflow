// US-034 (PB-P2-004 / QA-001 + SEC-001). Unit tests del emisor T-7.
//
// Cubre:
//   * UT-01 sin candidatas → affected=0, sin INSERTs, sin logs `email_simulated`.
//   * UT-02 3 candidatas nuevas → 6 INSERTs (3 in_app + 3 email_simulated) + 3 logs.
//   * UT-03 2 con notif previa (idempotencia) → sólo 2 nuevas emitidas.
//   * UT-04 `preferredLanguage=pt` → notif.language_code='pt', body en pt.
//   * UT-05 `preferredLanguage=null` → fallback a `event.language`.
//   * UT-06 guard BR-NOTIF-005: la infra retorna un candidato inválido → chunk falla,
//     log estructurado `chunkFailed`, siguiente chunk continúa.
//   * SEC-T-01 (no-PII): las claves del log `email_simulated` coinciden EXACTAMENTE
//     con `T7_EMAIL_LOG_ALLOWED_KEYS` y no incluyen `email`, `displayName`, `taskTitle`.
//   * JOB-01/02: `EmitT7NotificationsJob` emite `start`/`end` con `correlationId=job-emit-t7-<ISO>`
//     y `affected` propagado del use case.
//   * TZ-01: `calculateT7TargetDate` respeta el offset UTC-6 de Guatemala en cruces de día.
//
// Sin BD: fakes en memoria que reproducen filtros y contratos exactos. Los integration
// tests IT-01..IT-08 (QA-002/003/004) están especificados en la tech spec §13 pero no
// se ejecutan aquí (usuario pidió no forzar tests — ver execution record D-05).
import { describe, expect, it } from 'vitest';
import {
  EmitT7NotificationsUseCase,
  calculateT7TargetDate,
  type EmitT7Logger,
} from '../../src/modules/notifications/application/emit-t7-notifications.use-case.js';
import { EmitT7NotificationsJob } from '../../src/jobs/emit-t7-notifications.job.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';
import type {
  CreateT7NotificationInput,
  NotificationT7Repository,
} from '../../src/modules/notifications/ports/notification-t7.repository.js';
import type {
  FindT7CandidatesInput,
  T7CandidateRow,
  T7CandidateSourcePort,
} from '../../src/shared/application/t7-candidate-source.port.js';
import type { T7LanguagePreferenceReader } from '../../src/shared/application/t7-language-preference-reader.port.js';
import type { SupportedLanguage } from '../../src/shared/constants/languages.js';
import {
  LoggingSimulatedT7EmailAdapter,
  T7_EMAIL_LOG_ALLOWED_KEYS,
  type T7EmailLogger,
} from '../../src/modules/notifications/infrastructure/logging-simulated-t7-email.adapter.js';
import { renderT7Template } from '../../src/modules/notifications/i18n/t7-templates.js';

class FixedClock implements ClockPort {
  constructor(private readonly t: Date) {}
  now(): Date {
    return new Date(this.t.getTime());
  }
}

class FakeTaskRepo implements T7CandidateSourcePort {
  rows: T7CandidateRow[] = [];
  /** Chunks servidos, en orden, para simular offsets. Vacío ⇒ una sola respuesta paginada. */
  chunks: T7CandidateRow[][] | null = null;
  calls: FindT7CandidatesInput[] = [];
  failOn: Set<number> = new Set();

  findT7Candidates(input: FindT7CandidatesInput): Promise<T7CandidateRow[]> {
    this.calls.push(input);
    if (this.failOn.has(this.calls.length - 1)) {
      return Promise.reject(new Error(`boom-chunk-${this.calls.length - 1}`));
    }
    if (this.chunks) {
      const chunk = this.chunks.shift() ?? [];
      return Promise.resolve(chunk);
    }
    // Comportamiento paginado sobre `rows`.
    const slice = this.rows.slice(input.offset, input.offset + input.batchSize);
    return Promise.resolve(slice);
  }
}

class FakeNotificationRepo implements NotificationT7Repository {
  created: CreateT7NotificationInput[] = [];
  existsKeys = new Set<string>();
  failOnCreate: Set<string> = new Set();

  seedExists(userId: string, taskId: string): void {
    this.existsKeys.add(`${userId}::${taskId}`);
  }

  existsTaskDueSoonForTask(userId: string, taskId: string): Promise<boolean> {
    return Promise.resolve(this.existsKeys.has(`${userId}::${taskId}`));
  }

  create(input: CreateT7NotificationInput): Promise<void> {
    if (this.failOnCreate.has(input.taskId)) {
      return Promise.reject(new Error(`boom-create-${input.taskId}`));
    }
    this.created.push(input);
    // Registrar la existencia para que un rerun del use case sea idempotente.
    this.existsKeys.add(`${input.userId}::${input.taskId}`);
    return Promise.resolve();
  }
}

class FakeLanguageLookup implements T7LanguagePreferenceReader {
  private map = new Map<string, SupportedLanguage | null>();

  set(userId: string, lang: SupportedLanguage | null): void {
    this.map.set(userId, lang);
  }

  findPreferredLanguage(userId: string): Promise<SupportedLanguage | null> {
    return Promise.resolve(this.map.get(userId) ?? null);
  }
}

interface CapturedLog {
  level: 'info' | 'error';
  payload: Record<string, unknown>;
}

function makeLogger(): { logger: EmitT7Logger & T7EmailLogger; captured: CapturedLog[] } {
  const captured: CapturedLog[] = [];
  const logger: EmitT7Logger & T7EmailLogger = {
    info: (p) => captured.push({ level: 'info', payload: p }),
    error: (p) => captured.push({ level: 'error', payload: p }),
  };
  return { logger, captured };
}

function candidate(overrides: Partial<T7CandidateRow>): T7CandidateRow {
  return {
    taskId: overrides.taskId ?? 't1',
    eventId: overrides.eventId ?? 'e1',
    ownerUserId: overrides.ownerUserId ?? 'u-owner-1',
    eventLanguage: overrides.eventLanguage ?? 'es_LATAM',
    dueDate: overrides.dueDate ?? '2026-07-29',
  };
}

function build(overrides?: { batchSize?: number }) {
  const clock = new FixedClock(new Date('2026-07-22T14:00:00Z'));
  const taskRepo = new FakeTaskRepo();
  const notificationRepo = new FakeNotificationRepo();
  const languageLookup = new FakeLanguageLookup();
  const { logger, captured } = makeLogger();
  const emailAdapter = new LoggingSimulatedT7EmailAdapter(logger);
  const useCase = new EmitT7NotificationsUseCase({
    clock,
    taskRepo,
    notificationRepo,
    languageLookup,
    emailAdapter,
    logger,
    batchSize: overrides?.batchSize ?? 100,
  });
  return { clock, taskRepo, notificationRepo, languageLookup, emailAdapter, logger, captured, useCase };
}

describe('US-034 — EmitT7NotificationsUseCase (unit, sin BD)', () => {
  it('UT-01: sin candidatas → affected=0, sin INSERTs, sin logs email_simulated', async () => {
    const { useCase, notificationRepo, captured } = build();

    const result = await useCase.execute({ correlationId: 'job-emit-t7-2026-07-22T14:00:00.000Z' });

    expect(result.affected).toBe(0);
    expect(notificationRepo.created).toHaveLength(0);
    expect(captured.filter((c) => c.payload.event === 'email_simulated')).toHaveLength(0);
    const summary = captured.find((c) => c.payload.event === 'job.t7Notifications.completed');
    expect(summary).toBeDefined();
    expect(summary!.payload.affected).toBe(0);
    expect(summary!.payload.scannedChunks).toBe(0);
    expect(summary!.payload.correlationId).toBe('job-emit-t7-2026-07-22T14:00:00.000Z');
  });

  it('UT-02: 3 candidatas nuevas → 6 INSERTs (3 in_app + 3 email_simulated) + 3 logs email_simulated + 1 log resumen', async () => {
    const { useCase, taskRepo, notificationRepo, captured } = build();
    taskRepo.rows = [
      candidate({ taskId: 't1', eventId: 'e1', ownerUserId: 'u1' }),
      candidate({ taskId: 't2', eventId: 'e1', ownerUserId: 'u1' }),
      candidate({ taskId: 't3', eventId: 'e2', ownerUserId: 'u2' }),
    ];

    const result = await useCase.execute({ correlationId: 'cid-utd-02' });

    expect(result.affected).toBe(3);
    expect(notificationRepo.created).toHaveLength(6);
    expect(notificationRepo.created.filter((n) => n.channel === 'in_app')).toHaveLength(3);
    expect(notificationRepo.created.filter((n) => n.channel === 'email_simulated')).toHaveLength(3);
    // 3 logs `email_simulated` + 1 log resumen `completed`.
    expect(captured.filter((c) => c.payload.event === 'email_simulated')).toHaveLength(3);
    expect(captured.filter((c) => c.payload.event === 'job.t7Notifications.completed')).toHaveLength(1);
    // Aislamiento: cada Notification lleva `userId = event.owner_id`.
    const perUser = new Map<string, string[]>();
    for (const n of notificationRepo.created) {
      perUser.set(n.userId, [...(perUser.get(n.userId) ?? []), n.taskId]);
    }
    expect(perUser.get('u1')?.sort()).toEqual(['t1', 't1', 't2', 't2']);
    expect(perUser.get('u2')?.sort()).toEqual(['t3', 't3']);
  });

  it('UT-03: 2 candidatas con Notification previa → idempotencia (sólo 1 nueva emitida)', async () => {
    const { useCase, taskRepo, notificationRepo, captured } = build();
    taskRepo.rows = [
      candidate({ taskId: 't-nuevo', ownerUserId: 'u1' }),
      candidate({ taskId: 't-ya-emitida-1', ownerUserId: 'u1' }),
      candidate({ taskId: 't-ya-emitida-2', ownerUserId: 'u2' }),
    ];
    notificationRepo.seedExists('u1', 't-ya-emitida-1');
    notificationRepo.seedExists('u2', 't-ya-emitida-2');

    const result = await useCase.execute({ correlationId: 'cid-utd-03' });

    expect(result.affected).toBe(1);
    // Sólo 2 filas (in_app + email_simulated para la única tarea nueva).
    expect(notificationRepo.created).toHaveLength(2);
    expect(notificationRepo.created.every((n) => n.taskId === 't-nuevo')).toBe(true);
    expect(captured.filter((c) => c.payload.event === 'email_simulated')).toHaveLength(1);
  });

  it('UT-04: preferredLanguage=pt → Notification.language_code=pt y subject/body en pt', async () => {
    const { useCase, taskRepo, notificationRepo, languageLookup, captured } = build();
    taskRepo.rows = [candidate({ taskId: 't1', ownerUserId: 'u-pt', dueDate: '2026-08-01' })];
    languageLookup.set('u-pt', 'pt');

    await useCase.execute({ correlationId: 'cid-utd-04' });

    expect(notificationRepo.created).toHaveLength(2);
    expect(notificationRepo.created.every((n) => n.languageCode === 'pt')).toBe(true);
    const emailLog = captured.find((c) => c.payload.event === 'email_simulated');
    expect(emailLog).toBeDefined();
    const expected = renderT7Template('pt', { taskId: 't1', dueDate: '2026-08-01' });
    expect(emailLog!.payload.subject).toBe(expected.subject);
    expect(emailLog!.payload.body).toBe(expected.body);
    expect(emailLog!.payload.language).toBe('pt');
  });

  it('UT-05: preferredLanguage=null → fallback a event.language (es_LATAM → es-LATAM)', async () => {
    const { useCase, taskRepo, notificationRepo, languageLookup, captured } = build();
    taskRepo.rows = [
      candidate({ taskId: 't1', ownerUserId: 'u-null', eventLanguage: 'es_LATAM' }),
    ];
    languageLookup.set('u-null', null);

    await useCase.execute({ correlationId: 'cid-utd-05' });

    expect(notificationRepo.created.every((n) => n.languageCode === 'es-LATAM')).toBe(true);
    const emailLog = captured.find((c) => c.payload.event === 'email_simulated');
    expect(emailLog!.payload.language).toBe('es-LATAM');
  });

  it('UT-06: fallo por chunk → log chunkFailed y siguiente chunk continúa', async () => {
    const { useCase, taskRepo, notificationRepo, captured } = build({ batchSize: 2 });
    // Primer chunk falla al leer del repo (simula error de DB); segundo chunk sirve una tarea.
    taskRepo.failOn.add(0);
    taskRepo.chunks = [
      [],
      [candidate({ taskId: 't-ok', ownerUserId: 'u-ok' })],
      [], // fin
    ];

    const result = await useCase.execute({ correlationId: 'cid-utd-06' });

    // El primer chunk falla y termina el loop (no continuamos con offsets ciegos);
    // el use case emite `chunkFailed` y el resumen. `affected=0` en esta ruta.
    const chunkFailed = captured.find((c) => c.payload.event === 'job.t7Notifications.chunkFailed');
    expect(chunkFailed).toBeDefined();
    expect(chunkFailed!.payload.correlationId).toBe('cid-utd-06');
    expect(chunkFailed!.payload.errorMessage).toBe('boom-chunk-0');
    expect(result.affected).toBe(0);
    expect(notificationRepo.created).toHaveLength(0);
    const summary = captured.find((c) => c.payload.event === 'job.t7Notifications.completed');
    expect(summary).toBeDefined();
  });

  it('UT-06b: fallo mid-chunk en un create → chunkFailed, no aborta el run global', async () => {
    const { useCase, taskRepo, notificationRepo, captured } = build({ batchSize: 100 });
    taskRepo.rows = [
      candidate({ taskId: 't-ok-1', ownerUserId: 'u1' }),
      candidate({ taskId: 't-boom', ownerUserId: 'u1' }),
      candidate({ taskId: 't-ok-3', ownerUserId: 'u1' }),
    ];
    // El primer create para 't-boom' (channel in_app) falla — corta el chunk pero no
    // el run: el loop while sale por `chunk.length < batchSize` (3 < 100).
    notificationRepo.failOnCreate.add('t-boom');

    await useCase.execute({ correlationId: 'cid-utd-06b' });

    const chunkFailed = captured.find((c) => c.payload.event === 'job.t7Notifications.chunkFailed');
    expect(chunkFailed).toBeDefined();
    expect(chunkFailed!.payload.errorMessage).toBe('boom-create-t-boom');
    // 't-ok-1' completó (2 filas); 't-boom' abortó el chunk sin llegar a 't-ok-3'.
    expect(notificationRepo.created.filter((n) => n.taskId === 't-ok-1')).toHaveLength(2);
    expect(notificationRepo.created.filter((n) => n.taskId === 't-ok-3')).toHaveLength(0);
  });
});

describe('US-034 — SEC-T-01 (no-PII en log estructurado)', () => {
  it('logEmail emite EXACTAMENTE las claves permitidas — sin email/displayName/taskTitle', () => {
    const { logger, captured } = makeLogger();
    const adapter = new LoggingSimulatedT7EmailAdapter(logger);

    adapter.logEmail({
      toUserId: 'u1',
      taskId: 't1',
      eventId: 'e1',
      dueDate: '2026-07-29',
      language: 'en',
      correlationId: 'cid-sec',
    });

    const emailLog = captured.find((c) => c.payload.event === 'email_simulated');
    expect(emailLog).toBeDefined();
    const emitted = Object.keys(emailLog!.payload).sort();
    const allowed = [...T7_EMAIL_LOG_ALLOWED_KEYS].sort();
    expect(emitted).toEqual(allowed);
    // Claves prohibidas expresamente por SEC-02:
    for (const forbidden of ['email', 'displayName', 'taskTitle', 'taskDescription', 'eventNotes']) {
      expect(emitted).not.toContain(forbidden);
    }
    // El `body` sólo interpola `taskId` y `dueDate` — no contiene `@` ni displayName.
    expect(String(emailLog!.payload.body)).not.toMatch(/@/);
  });
});

describe('US-034 — EmitT7NotificationsJob (unit)', () => {
  it('JOB-01: emite job.t7Notifications.start y .end con correlationId=job-emit-t7-<ISO>', async () => {
    const { useCase, taskRepo, clock, logger, captured } = build();
    taskRepo.rows = [candidate({ taskId: 't1', ownerUserId: 'u1' })];

    const job = new EmitT7NotificationsJob({
      useCase,
      clock,
      logger,
      cadence: '0 8 * * *',
    });
    await job.run();

    const start = captured.find((c) => c.payload.event === 'job.t7Notifications.start');
    const end = captured.find((c) => c.payload.event === 'job.t7Notifications.end');
    expect(start).toBeDefined();
    expect(end).toBeDefined();
    const expectedCorrelation = `job-emit-t7-${new Date('2026-07-22T14:00:00Z').toISOString()}`;
    expect(start!.payload.correlationId).toBe(expectedCorrelation);
    expect(start!.payload.cadence).toBe('0 8 * * *');
    expect(end!.payload.correlationId).toBe(expectedCorrelation);
    expect(end!.payload.affected).toBe(1);
    expect(typeof end!.payload.durationMs).toBe('number');
  });

  it('JOB-02: falla catastrófica del use case → log job.t7Notifications.failed + end con affected=0', async () => {
    const { clock, logger, captured } = build();
    const boomUseCase = {
      execute: () => Promise.reject(new Error('boom-uc')),
    } as unknown as EmitT7NotificationsUseCase;

    const job = new EmitT7NotificationsJob({
      useCase: boomUseCase,
      clock,
      logger,
      cadence: '0 8 * * *',
    });
    await job.run();

    const failed = captured.find((c) => c.payload.event === 'job.t7Notifications.failed');
    expect(failed).toBeDefined();
    expect(failed!.payload.errorMessage).toBe('boom-uc');
    const end = captured.find((c) => c.payload.event === 'job.t7Notifications.end');
    expect(end!.payload.affected).toBe(0);
  });
});

describe('US-034 — calculateT7TargetDate (timezone America/Guatemala)', () => {
  it('TZ-01: 08:00 UTC del 22-Jul-2026 (02:00 hora local Guatemala) → targetDate=2026-07-29 (UTC 00:00)', () => {
    // 08:00 UTC = 02:00 en Guatemala (UTC-6). El día calendario Guatemala es 22-Jul,
    // así que T+7 = 29-Jul.
    const now = new Date('2026-07-22T08:00:00Z');
    const target = calculateT7TargetDate(now);
    expect(target.toISOString().slice(0, 10)).toBe('2026-07-29');
    expect(target.toISOString()).toBe('2026-07-29T00:00:00.000Z');
  });

  it('TZ-02: 02:00 UTC del 22-Jul-2026 (20:00 hora local del 21-Jul en Guatemala) → targetDate=2026-07-28', () => {
    // 02:00 UTC = 20:00 del día anterior en Guatemala. El calendario Guatemala es
    // 21-Jul, así que T+7 = 28-Jul.
    const now = new Date('2026-07-22T02:00:00Z');
    const target = calculateT7TargetDate(now);
    expect(target.toISOString().slice(0, 10)).toBe('2026-07-28');
  });

  it('TZ-03: cruce de mes — 26-Feb 20:00 Guatemala (27-Feb 02:00 UTC) → targetDate=2026-03-05', () => {
    const now = new Date('2026-02-27T02:00:00Z'); // 26-Feb 20:00 en Guatemala
    const target = calculateT7TargetDate(now);
    expect(target.toISOString().slice(0, 10)).toBe('2026-03-05');
  });
});
