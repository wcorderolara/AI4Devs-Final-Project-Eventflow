# PO/BA Decision Resolution — US-055

## Source User Story File
management/user-stories/US-055-auto-expire-quotes-job.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-055-refinement-review.md

## Decision Date
2026-06-28

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| User Story ID                                | US-055                                                                           |
| User Story file path                         | management/user-stories/US-055-auto-expire-quotes-job.md                         |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-055-refinement-review.md           |
| Existing decision resolution found           | No                                                                               |
| Backlog Item                                 | PB-P1-033 — Jobs de expiración QR / Quote                                       |
| Epic                                         | EPIC-QR-001                                                                      |
| Estado antes de decisiones                   | Needs Refinement                                                                 |
| Cantidad de preguntas revisadas              | 7                                                                                |
| Decisiones PO/BA tomadas                     | 7                                                                                |
| ¿Desbloquea aprobación?                      | Sí                                                                               |
| User Story file updated                      | Yes                                                                              |
| Decision Resolution artifact created/updated | Yes                                                                              |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — Scope: sólo `ExpireQuoteRequestsJob` (nuevo)

```text
US-055 entrega un único job nuevo `ExpireQuoteRequestsJob` que marca QRs vencidas (30 días sin respuesta) como `expired`. El `ExpireQuotesJob` ya entregado por US-053 NO se reimplementa; US-055 sólo reconcilia su horario (D2 abajo).
```

### Rationale
Evita duplicación. Mantiene scope ajustado al hallazgo único (QR expirada).

---

## Decisión 2 — Horario unificado 01:00 UTC

```text
Ambos jobs (`ExpireQuotesJob` de US-053 + `ExpireQuoteRequestsJob` nuevo) corren diariamente a las **01:00 UTC** con jitter aleatorio ±5min. El cron string en `expire-quotes.job.ts` de US-053 se actualiza de `5 0 * * *` a `0 1 * * *`. Sin breaking changes funcionales — sólo cambio de hora.

Orden de ejecución dentro del mismo arranque: primero `ExpireQuoteRequestsJob`, luego `ExpireQuotesJob` (irrelevante porque son independientes; orden para tests deterministas).
```

### Rationale
Backlog PB-P1-033 fija 01:00 UTC. Unificar evita confusión operativa.

---

## Decisión 3 — N = 30 días para QR sin respuesta

```text
Una QR se considera expirada cuando han pasado al menos 30 días calendario desde `sent_at`. Constante `QR_EXPIRATION_DAYS = 30` (configurable via env `QR_EXPIRATION_DAYS=30` con default 30 en código).
```

### Rationale
Backlog PB-P1-033 + Notes del draft. Configurable via env para flexibilidad operativa.

---

## Decisión 4 — Estados origen permitidos

```text
Sólo se transiciona desde `quote_requests.status IN ('sent', 'viewed')` a `'expired'`. Otros estados (`responded`, `preferred`, `cancelled`, `rejected`, `expired`) NO se tocan. Esto es coherente con BR-QUOTE-009 (estados "activas").
```

### Rationale
QRs activas son `sent`/`viewed`/`responded`/`preferred`, pero `responded`/`preferred` ya recibieron respuesta — no aplica expiración por timeout. Sólo `sent`/`viewed` están en espera del vendor.

---

## Decisión 5 — Sin notificación por QR expirada en MVP

```text
La expiración de una `QuoteRequest` NO genera Notification ni para el vendor ni para el organizer en MVP. La QR expirada se refleja únicamente en los listados (US futura). BR-NOTIF-002 no exige notif para QR expirada (sólo Quote expirada/rechazada, cubiertas por US-054).
```

### Rationale
Mantiene scope ajustado. PO puede agregar notif en US futura sin retrabajos.

---

## Decisión 6 — Clock injectable via `ClockPort`

```text
Se introduce `ClockPort` con método `now(): Date`:
- `LocalClockAdapter` (producción): retorna `new Date()`.
- `FrozenClockAdapter` (tests): retorna una fecha fija configurable + permite `advance(days)`.

`ExpireQuoteRequestsUseCase` y `ExpireQuotesUseCase` (US-053 refactor) inyectan `ClockPort` en lugar de usar `new Date()` directamente.

En PostgreSQL, las queries que usan `CURRENT_DATE` se reemplazan por `WHERE sent_at < $clock_now::date - INTERVAL '${QR_EXPIRATION_DAYS} days'` con `$clock_now` pasado por la app, garantizando determinismo en tests.
```

### Rationale
Tests deterministas + reuso del puerto en futuras US.

---

## Decisión 7 — Convención del corte 30 días estrictos

```text
Filtro SQL del job:
`WHERE status IN ('sent', 'viewed') AND sent_at < $clock_now::date - INTERVAL '30 days'`

Ejemplo: QR con `sent_at='2026-05-29'` se expira el `2026-06-28 01:00 UTC` (30 días completos). QR con `sent_at='2026-06-28'` se expira el `2026-07-28 01:00 UTC`.
```

### Rationale
Estricto facilita explicabilidad y tests.

---

## 3. Consolidated Decision Table

|  # | Tema                              | Decisión                                                                                                                                                          | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- | -------------------- |
|  1 | Scope                                | Sólo `ExpireQuoteRequestsJob` nuevo; Quote viene de US-053.                                                                                                       | PO/Tech | Sí                     | No                   |
|  2 | Horario                              | 01:00 UTC con jitter ±5min ambos jobs. Refactor del cron de US-053.                                                                                              | PO/Tech | Sí                     | No                   |
|  3 | N días                                | 30 días desde `sent_at`. Configurable via env.                                                                                                                    | PO      | Sí                     | No                   |
|  4 | Estados origen                       | Sólo `sent` y `viewed`.                                                                                                                                          | PO      | Sí                     | No                   |
|  5 | Notif QR expirada                    | Sin notificación MVP.                                                                                                                                            | PO      | Sí                     | No                   |
|  6 | Clock injectable                     | `ClockPort` con `LocalClockAdapter` y `FrozenClockAdapter`.                                                                                                       | Tech    | Sí                     | No                   |
|  7 | Convención                            | `sent_at < $clock_now::date - INTERVAL '30 days'`.                                                                                                                | PO      | Sí                     | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                |
| User Story file path                         | `management/user-stories/US-055-auto-expire-quotes-job.md`                         |
| Decision Resolution artifact created/updated | Yes                                                                                |
| New User Story status                        | Ready for Approval                                                                 |
| Remaining blockers                           | No                                                                                 |
| Reason                                       | 7/7 decisiones PO/Tech formalizadas.                                              |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`.

---

## 8. Próximo Paso Recomendado

```text
1. Revisar el archivo de User Story actualizado.
2. Ejecutar `eventflow-user-story-refinement` para revalidación.
3. Si no quedan blockers, ejecutar `eventflow-user-story-approval`.
```
