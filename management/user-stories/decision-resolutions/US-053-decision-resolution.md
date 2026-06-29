# PO/BA Decision Resolution — US-053

## Source User Story File
management/user-stories/US-053-quote-validity-15-days.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-053-refinement-review.md

## Decision Date
2026-06-27

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| User Story ID                                | US-053                                                                           |
| User Story file path                         | management/user-stories/US-053-quote-validity-15-days.md                         |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-053-refinement-review.md           |
| Existing decision resolution found           | No                                                                               |
| Backlog Item                                 | PB-P1-031 — Vendor visualiza y responde Quote                                   |
| Epic                                         | EPIC-QR-001                                                                      |
| Estado antes de decisiones                   | Needs Refinement                                                                 |
| Cantidad de preguntas revisadas              | 5                                                                                |
| Decisiones PO/BA tomadas                     | 5                                                                                |
| ¿Desbloquea aprobación?                      | Sí                                                                               |
| User Story file updated                      | Yes                                                                              |
| Decision Resolution artifact created/updated | Yes                                                                              |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — Job de expiración in scope US-053

```text
US-053 incluye el job `ExpireQuotesJob` que cumple FR-QUOTE-009 + BR-QUOTE-016. El backlog item PB-P1-031 sólo queda cerrado cuando el sistema marca automáticamente Quotes vencidas y notifica al vendor. Sin el job, la regla de negocio existe pero no se aplica.
```

### Rationale
FR-QUOTE-009 es Must Have MVP y no tiene otro hogar en el backlog.

---

## Decisión 2 — Frecuencia del job

```text
Cron diario `00:05 UTC` con jitter aleatorio ±5min. Reuso del scheduler existente o introducción de un scheduler básico (`node-cron` o equivalente) consistente con el patrón del job de auto-complete event (PB-P1-009). Sin ejecuciones intra-day en MVP.
```

### Rationale
Diario es suficiente granularidad para MVP. `00:05 UTC` evita coincidencia con backups/0:00. Jitter previene picos sincronizados si hay múltiples instancias.

---

## Decisión 3 — Notificación al vendor por expiración

```text
Al expirar cada Quote, el job inserta DOS rows en `notifications` (dentro de la misma transacción de batch):
1. `channel='in_app'`, `recipient_user_id=quote.vendor_profile.user_id`, `event='quote.expired'`, `delivery_status='delivered'`, payload `{ quote_id, quote_request_id, valid_until }`.
2. `channel='email_simulated'`, `delivery_status='simulated'`, payload idéntico.

Paridad con US-049 D6 y US-052 D5. Cumple BR-NOTIF-002 (in-app obligatoria + email cuando exista).
```

### Rationale
Paridad de canales + auditoría completa para demo académica.

---

## Decisión 4 — Convención del corte

```text
Una Quote es válida HASTA el final del día `valid_until` inclusive (zona horaria del sistema en UTC para el job). El job ejecutado el día `D` marca como `expired` todas las Quotes con `status='sent' AND valid_until < D` (es decir, las que vencieron al menos el día `D-1`).

Ejemplo: Quote con `valid_until='2026-07-12'` está vigente todo el 12; el job del `2026-07-13` la marca expirada.
```

### Rationale
Convención clara, fácil de explicar al vendor y al organizador. Consistente con `valid_until` siendo de tipo `date` (sin hora).

---

## Decisión 5 — Idempotencia y batching del job

```text
El job es idempotente:
- Query: `WHERE status='sent' AND valid_until < CURRENT_DATE`.
- Batching: procesa hasta `100` Quotes por transacción; commits intermedios.
- Reintento: en fallo de batch, log de error + reintento automático en la próxima ejecución (sin reintento intra-run).
- Lock: usa `SELECT ... FOR UPDATE SKIP LOCKED` para evitar contención con otras instancias.
- Métricas: contador `quotes.expired.total` por ejecución; log estructurado `quote.expired.batch` por batch.

Re-ejecutar el job en el mismo día no afecta Quotes ya expiradas (filtro por `status='sent'`).
```

### Rationale
SKIP LOCKED + batching protege contra contención y permite escalabilidad. Idempotencia garantiza recuperación tras fallos.

---

## 3. Consolidated Decision Table

|  # | Tema                              | Decisión                                                                                                                                                          | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- | -------------------- |
|  1 | Job en US-053                       | In scope.                                                                                                                                                          | PO      | Sí                     | No                   |
|  2 | Frecuencia                          | Cron diario `00:05 UTC` con jitter ±5min.                                                                                                                          | Tech    | Sí                     | No                   |
|  3 | Notif vendor                        | 2 Notifications atómicas (`in_app` + `email_simulated`).                                                                                                          | PO      | Sí                     | No                   |
|  4 | Convención corte                    | Válida hasta el final del día `valid_until`; expiration al inicio del día siguiente.                                                                              | PO      | Sí                     | No                   |
|  5 | Idempotencia + batching             | `WHERE status='sent' AND valid_until < CURRENT_DATE`; batch 100; `FOR UPDATE SKIP LOCKED`; reintento next-run.                                                    | Tech    | Sí                     | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                |
| User Story file path                         | `management/user-stories/US-053-quote-validity-15-days.md`                         |
| Decision Resolution artifact created/updated | Yes                                                                                |
| New User Story status                        | Ready for Approval                                                                 |
| Remaining blockers                           | No                                                                                 |
| Reason                                       | 5/5 decisiones PO/Tech formalizadas.                                               |

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
