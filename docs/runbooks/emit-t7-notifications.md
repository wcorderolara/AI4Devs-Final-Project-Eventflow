# Runbook — `EmitT7NotificationsJob` (US-034 / PB-P2-004)

> Cómo verificar, disparar manualmente e inspeccionar el emisor T-7 en dev, QA y demo.
> Alcance: single-process MVP con `node-cron` (docs/14 §23.1 / §23.2).

## 1. Qué hace

Cron único diario `0 8 * * *` en zona `America/Guatemala` (D1). Por cada `EventTask`
cuya `due_date` calendario cae exactamente en `today_in_Guatemala + 7 días` y cuyo
`Event.status='active'`, crea:

- 1 `Notification(type='task_due_soon', payload.channel='in_app')`
- 1 `Notification(type='task_due_soon', payload.channel='email_simulated')`
- 1 log estructurado `event='email_simulated'` (NFR-OBS-004).

Idempotente por `payload->>'taskId'` (D2). Aislamiento BR-NOTIF-005 verificado en
código (`notification.user_id === event.owner_id`).

## 2. Configuración

| Variable | Default | Rol |
| --- | --- | --- |
| `JOBS_ENABLED` | `false` | Gate global de todos los schedulers. `true` sólo en una réplica. |
| `JOBS_EMIT_T7_ENABLED` | `true` | Gate específico dentro del gate global. `false` deshabilita sólo el emisor T-7. |
| `JOBS_EMIT_T7_CRON` | `0 8 * * *` | Expresión cron. Cambio requiere ADR si altera D1. |
| `JOBS_EMIT_T7_TZ` | `America/Guatemala` | Timezone IANA. Cambio requiere ADR (multi-timezone es Future). |
| `JOBS_EMIT_T7_BATCH_SIZE` | `100` | Tamaño de chunk del `findT7Candidates`. |

## 3. Preparar dataset demo

Para que el organizer demo reciba una notificación T-7:

1. Correr el seed (`npm run seed`). El seed setea `EventTask.dueDate = event.eventDate - 7 días` en la tarea `"Confirmar proveedores"` de cada evento demo (SEED-001).
2. Para forzar la coincidencia con la fecha del run:
   - Ajustar el `event_date` de un evento demo a `today + 14 días`, o
   - Correr el UC con `Clock` fijo apuntando a `event.event_date - 14 días` (patrón de tests).

## 4. Disparar el job

### 4.1 Automático

Con `JOBS_ENABLED=true` y `JOBS_EMIT_T7_ENABLED=true`, `node-cron` dispara el UC a las
08:00 hora local Guatemala. El bootstrap emite al arrancar:

```json
{
  "event": "jobs.registry.enabled",
  "jobs": ["auto-complete-past-events", "expire-quotes", "expire-quote-requests", "emit-t7-notifications"],
  "cadence": { "emitT7": "0 8 * * * (America/Guatemala)" }
}
```

### 4.2 Manual desde REPL o script

No hay endpoint HTTP (SEC-01). Para un run ad-hoc:

```ts
import { PrismaClient } from '@prisma/client';
import { EmitT7NotificationsUseCase } from './src/modules/notifications/application/emit-t7-notifications.use-case.js';
import { PrismaEventTaskT7Repository } from './src/modules/task-management/infrastructure/prisma-event-task-t7.repository.js';
import { PrismaNotificationT7Repository } from './src/modules/notifications/infrastructure/prisma-notification-t7.repository.js';
import { LoggingSimulatedT7EmailAdapter } from './src/modules/notifications/infrastructure/logging-simulated-t7-email.adapter.js';
import { PrismaOrganizerLanguageLookup } from './src/modules/event-planning/infrastructure/prisma-organizer-language.lookup.js';
import { SystemClock } from './src/infrastructure/time/system-clock.js';
import { logger } from './src/shared/infrastructure/logger/index.js';

const prisma = new PrismaClient();
const uc = new EmitT7NotificationsUseCase({
  clock: new SystemClock(),
  taskRepo: new PrismaEventTaskT7Repository(prisma),
  notificationRepo: new PrismaNotificationT7Repository(prisma),
  languageLookup: new PrismaOrganizerLanguageLookup(prisma),
  emailAdapter: new LoggingSimulatedT7EmailAdapter(),
  logger,
});
const cid = `manual-emit-t7-${new Date().toISOString()}`;
await uc.execute({ correlationId: cid });
console.log('done', cid);
```

## 5. Inspeccionar logs

Grep del `correlationId` del run:

```bash
grep 'job-emit-t7-' backend.log | jq -c 'select(.event | startswith("job.t7Notifications") or startswith("email_simulated"))'
```

Eventos canónicos:

| `event` | Nivel | Cuándo | Claves | Notas |
| --- | --- | --- | --- | --- |
| `job.t7Notifications.start` | info | Al arrancar el run del job | `correlationId, cadence, scheduledAt` | Emitido por el wrapper `EmitT7NotificationsJob`. |
| `email_simulated` | info | Por cada tarea nueva emitida | `event, template=notif.t7, correlationId, to, userId, taskId, eventId, dueDate, language, subject, body` | **SEC-02 no-PII**: nunca `email`, `displayName`, `taskTitle`. |
| `job.t7Notifications.completed` | info | Al finalizar la ejecución del UC | `correlationId, affected, scannedChunks` | AC-05. |
| `job.t7Notifications.chunkFailed` | error | Al fallar un chunk (DB o create) | `correlationId, chunkIndex, firstTaskId?, lastTaskId?, errorMessage` | Continúa con el siguiente chunk. |
| `job.t7Notifications.failed` | error | Falla catastrófica del UC | `correlationId, errorMessage` | Se sigue emitiendo `end` con `affected=0`. |
| `job.t7Notifications.end` | info | Cierre del wrapper | `correlationId, durationMs, affected, scannedChunks` | Se emite siempre en el `finally`. |

## 6. Verificar en DB

```sql
-- Notificaciones T-7 emitidas por el organizer demo, últimas 24h.
SELECT id, user_id, payload->>'channel' AS channel, payload->>'languageCode' AS lang,
       payload->>'taskId' AS task_id, payload->>'dueDate' AS due_date, created_at
FROM notifications
WHERE type = 'task_due_soon'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

Cada tarea T-7 emitida produce exactamente 2 filas (`in_app` + `email_simulated`) con
el mismo `taskId`. Un rerun del mismo día no agrega filas (idempotencia D2).

## 7. Troubleshooting

| Síntoma | Causa probable | Acción |
| --- | --- | --- |
| No hay logs `job.t7Notifications.start` al arranque | `JOBS_ENABLED=false` o `JOBS_EMIT_T7_ENABLED=false` | Verificar `.env` y `jobs.registry.enabled`. |
| Job se dispara pero `affected=0` | No hay tareas con `due_date = today_GT + 7 días` en eventos `active` | Ajustar `event.event_date` o usar clock fijo (§4.2). |
| Log `chunkFailed` con `errorMessage="ECONNREFUSED"` | Postgres no disponible | Revisar `DATABASE_URL` y health de la BD. |
| `affected` duplica en dos réplicas | `JOBS_ENABLED=true` en más de una réplica | Dejar sólo una réplica primaria con `true` (ADR-BE-004). |
| Locale no coincide con `User.preferredLanguage` | Preferencia vacía → fallback a `event.language` (D6) | Verificar `SELECT preferred_language FROM users WHERE id=$1`. |

## 8. Referencias

- User Story: `management/user-stories/US-034-inapp-notification-t-minus-7.md`
- Technical Spec: `management/technical-specs/P2/PB-P2-004/US-034-technical-spec.md`
- Execution record: `management/workflows/development-execution/P2/PB-P2-004/US-034-execution.md`
- Backend design: `docs/14 §23.2` fila `EmitT7NotificationsJob`.
- NFR: `docs/10 §NFR-OBS-004` (email simulado por log).
