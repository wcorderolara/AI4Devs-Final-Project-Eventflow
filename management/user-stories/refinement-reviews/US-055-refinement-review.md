# User Story Refinement Review — US-055

## Source User Story File
management/user-stories/US-055-auto-expire-quotes-job.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-055-decision-resolution.md

## Review Date
2026-06-28 (revalidación: 2026-06-28)

## Revalidation Result (2026-06-28)
Q1–Q7 resueltas. La US-055 declara `Backlog Item: PB-P1-033`, `PO/BA Decisions Applied` D1–D7, trazabilidad corregida (`FR-QUOTE-006/009`, `UC-QUOTE-010`, `BR-QUOTE-005/009/016`, `C-015`, `NFR-OBS-005/PERF-001`). Scope ajustado a `ExpireQuoteRequestsJob` nuevo + refactor cron US-053; `ClockPort` introducido; 30 días configurable; sin notificación; AC-01..AC-05, EC-01..EC-04, VR-01..VR-02, SEC-01..SEC-03, TS-01..TS-06. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| User Story ID                              | US-055                                                                    |
| File Path                                  | management/user-stories/US-055-auto-expire-quotes-job.md                  |
| Backlog Item                               | PB-P1-033 — Jobs de expiración QR / Quote                                 |
| Epic                                       | EPIC-QR-001                                                               |
| Estado actual                              | Draft                                                                     |
| Estado recomendado                         | Needs Refinement                                                          |
| Nivel de riesgo                            | Medio                                                                     |
| Calidad general                            | Media                                                                     |
| Requiere decisión PO                       | Sí                                                                        |
| Requiere decisión técnica                  | Sí (clock injectable + reconciliación de scheduler)                       |
| Requiere decisión QA                       | No                                                                        |
| Requiere decisión Seguridad                | No                                                                        |
| Decision Resolution artifact found         | No                                                                        |
| User Story file updated                    | No                                                                        |
| Refinement review artifact created/updated | Yes                                                                       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-055-refinement-review.md    |

---

## 2. Diagnóstico PO/BA

US-055 cubre los jobs de expiración. PB-P1-033 description literal: "(1) marca `QuoteRequest` como `expired` si pasaron 30 días sin respuesta; (2) marca `Quote` como `expired` cuando `valid_until <= today`. Clock injectable."

**Hallazgo clave: solapamiento con US-053.** US-053 ya entregó `ExpireQuotesJob` cubriendo el caso Quote (Decisión PO 8.1 #4 + #13). PB-P1-033 menciona ambos jobs como si fueran nuevos.

Interpretación correcta para US-055:

A) **NUEVO**: `ExpireQuoteRequestsJob` que marca QRs como `expired` cuando pasaron 30 días sin respuesta.
B) **REUSO**: el `ExpireQuotesJob` ya fue entregado por US-053 y refactorizado para usar `QuoteNotificationService` en US-054. US-055 documenta la coordinación pero no reimplementa.

Hallazgos adicionales:

1. **Trazabilidad incorrecta**: cita `FR-QUOTE-009` (Quote expired — US-053), `UC-QUOTE-006` (comparativa side-by-side), `BR-QUOTE-011` (solo proveedor responde). Las correctas son **`FR-QUOTE-006`** (lifecycle QR `sent → viewed → responded | expired | cancelled`), **`UC-QUOTE-010`** (historial de cotizaciones expiradas), **`BR-QUOTE-005`** (estados QR), **`BR-QUOTE-009`** (estados "activas"), **`BR-QUOTE-016`** (expiración Quote — ya en US-053). El backlog item cita `FR-QUOTE-012..013, BR-QUOTE-019..020` que son incorrectos (preferred y permission). `NFR-OBS-001` → `NFR-OBS-005`.
2. **Conflicto de horario**: backlog dice 01:00 UTC. US-053 D2 dice 00:05 UTC + jitter ±5min. Hay que reconciliar.
3. **Falta declarar `Backlog Item: PB-P1-033`**.
4. **N=30 días** para QR sin respuesta. Confirmar.
5. **Estados origen para expirar QR**: `sent` y `viewed` (per BR-QUOTE-009). Hay que excluir `responded`/`preferred`/`cancelled`/`rejected`.
6. **Notificación**: ¿QR expirada notifica al vendor y/o al organizer? BR-NOTIF-002 sólo menciona Quote rechazada/expirada al proveedor; QR expirada NO está en la lista. PO debe decidir.
7. **Clock injectable**: cómo se inyecta. Dependency injection vs `Date.now()` override.
8. **Idempotencia + batching + SKIP LOCKED**: paridad con US-053 D5.
9. **Convención del corte para QR**: ¿"30 días sin respuesta" = `sent_at < CURRENT_DATE - INTERVAL '30 days'`? Hay que aclarar referencia (sent_at, last_viewed_at, etc.).
10. **AC-01 duplica US-053**: la expiración de Quote ya está en US-053. Reescribir como referencia.
11. **EC-01 idempotencia**: heredado del patrón US-053.
12. **Frontend `QuoteStatusBadge`**: ya cubierto por componentes de US-051 (StatusBadge). Out of scope US-055 o mejora opcional.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                          | Impacto                                                                                                                                | Recomendación                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Solapamiento con US-053 (ExpireQuotesJob ya entregado).                                                                                                          | Reimplementación o duplicación.                                                                                                        | Resolver Q1 (PO/Tech). Recomendado: US-055 entrega SOLO `ExpireQuoteRequestsJob` (nuevo). El job de Quote es reuso de US-053 (referenciar, no reimplementar).                                                                                  |
| Alta      | Conflicto de horario: 01:00 UTC (backlog) vs 00:05 UTC (US-053 D2).                                                                                                | Inconsistencia operativa.                                                                                                              | Resolver Q2 (PO/Tech). Recomendado: **unificar a 01:00 UTC** ambos jobs (per backlog PB-P1-033) con jitter ±5min. Refactorizar US-053 si necesario (sin breaking; sólo cambio de cron string).                                                |
| Alta      | Trazabilidad incorrecta: FR-QUOTE-009, UC-QUOTE-006, BR-QUOTE-011 no aplican (o aplican parcialmente).                                                            | Trazabilidad rota.                                                                                                                     | Reemplazar/añadir: `FR-QUOTE-006, FR-QUOTE-009`, `UC-QUOTE-010`, `BR-QUOTE-005, BR-QUOTE-009, BR-QUOTE-016`, `C-015`, `NFR-OBS-005`.                                                                                                          |
| Alta      | N=30 días para QR sin respuesta.                                                                                                                                  | Confirmación PO.                                                                                                                       | Resolver Q3 (PO). Recomendado: **30 días calendario** desde `sent_at` (per backlog).                                                                                                                                                          |
| Alta      | Estados origen para expirar QR.                                                                                                                                  | Implementación ambigua.                                                                                                                | Resolver Q4 (PO). Recomendado: sólo desde `status IN ('sent', 'viewed')`. Otros estados (`responded`/`preferred`/`cancelled`/`rejected`) no se tocan.                                                                                          |
| Alta      | Notificación por QR expirada.                                                                                                                                     | FR-QUOTE-006 / BR-NOTIF-002 silentes.                                                                                                  | Resolver Q5 (PO). Recomendado: **sin notificación MVP** — la QR expirada se refleja en el listado del organizer (US futura). No hay regla MVP que exija notif. Mantiene scope ajustado.                                                       |
| Alta      | Clock injectable: cómo se implementa.                                                                                                                              | Implementación arbitraria.                                                                                                            | Resolver Q6 (Tech). Recomendado: `ClockPort` con `LocalClockAdapter` (`new Date()`) en producción y `FrozenClockAdapter` en tests. Inyectable vía DI.                                                                                          |
| Alta      | Convención del corte para QR.                                                                                                                                     | Implementación arbitraria.                                                                                                            | Resolver Q7 (PO). Recomendado: `sent_at < CURRENT_DATE - INTERVAL '30 days'` (es decir, la QR enviada hace 30 días o más sin pasar a estados no-activos).                                                                                     |
| Media     | Falta declarar `Backlog Item: PB-P1-033`.                                                                                                                          | Trazabilidad incompleta.                                                                                                              | Añadir en Metadata.                                                                                                                                                                                                                            |
| Media     | AC-01 duplica US-053.                                                                                                                                              | Redundancia.                                                                                                                          | Reescribir como referencia/coordinación; AC nuevos para QR.                                                                                                                                                                                  |
| Media     | Frontend `QuoteStatusBadge`.                                                                                                                                       | Posible duplicación con `StatusBadge` de US-051.                                                                                      | Out of Scope US-055 (reuso de existente).                                                                                                                                                                                                   |
| Baja      | `Notes` plantea "30 días" — ya en backlog.                                                                                                                         | Obsoleta.                                                                                                                              | Eliminar tras Q3.                                                                                                                                                                                                                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                  |
| ------------------------------------ | --------- | --------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                  |
| No introduce contratos firmados      | Pass      | No aplica.                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                  |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                |
| Respeta backend como source of truth | Pass      | Job server-side.                                                            |
| Respeta seed/demo si aplica          | Pass      | Reuso seed; QR con `sent_at` viejo para demo.                              |
| No introduce P4/Future scope         | Pass      | Recordatorios pre-vencimiento Out of Scope.                                |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                          | Acción recomendada                                                                                                                                                                                              |
| ----- | ------------ | ----------------------------------------------------------- | -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail | Duplica US-053. Confunde QR con Quote.                       | Reescribir tras Q1: AC nuevo para QR (`sent_at` viejo); referenciar US-053 para Quote.                                                                                                                       |
| AC-02 | Needs Detail | "N días configurable" — sin spec.                            | Reescribir tras Q3: 30 días.                                                                                                                                                                                |
| EC-01 | Needs Detail | "Ya expirada" sin detalles.                                  | Mantener idempotencia con filtro `status IN ('sent','viewed')`.                                                                                                                                              |

Faltan AC para:
- Job a 01:00 UTC con jitter (Q2).
- Clock injectable verificado en tests (Q6).
- Convención del corte 30 días (Q7).
- Sin notificación al vendor/organizer (Q5).
- Batching + SKIP LOCKED (paridad US-053).

---

## 6. Gaps Detectados

### Producto / Negocio
- Faltan decisiones (Q1..Q7).

### Backend / API
- Nuevo `ExpireQuoteRequestsJob` y `ExpireQuoteRequestsUseCase`.
- `ClockPort` + `LocalClockAdapter` + `FrozenClockAdapter`.
- Refactor de cron de US-053 a 01:00 UTC (si Q2 lo aprueba).

### Frontend / UX
- `QuoteStatusBadge` ya cubierto por US-051 — out of scope US-055.

### Base de Datos
- Verificar índice por `(status, sent_at)` para QR.

### Seguridad / Autorización
- Sistema sin user context.

### IA / PromptOps
- No aplica.

### QA / Testing
- Tests con `FrozenClockAdapter` para determinismo.
- Idempotencia.
- Batching.

### Seed / Demo
- QR con `sent_at` de hace 31 días para demo.

### Documentación / Trazabilidad
- Corregir FR/UC/BR/NFR.
- Documentar job en `docs/14 §Jobs` y `docs/21 §Cron`.

---

## 7. Preguntas Pendientes

| Tipo     | Pregunta                                                                                                                                                                                                                                          | Bloquea aprobación | Responsable |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| PO/Tech  | **Q1** — Scope: US-055 entrega `ExpireQuoteRequestsJob` (nuevo); `ExpireQuotesJob` se reusa de US-053 (sin reimplementar).                                                                                                                       | Sí                 | PO/Tech     |
| PO/Tech  | **Q2** — Horario unificado. Recomendado: **01:00 UTC** ambos jobs (per backlog) con jitter ±5min. Refactorizar el cron de US-053 (sólo cambio de string).                                                                                       | Sí                 | PO/Tech     |
| PO       | **Q3** — N días para QR sin respuesta. Recomendado: **30 días calendario** desde `sent_at` (per backlog PB-P1-033 + decisión PO US-055).                                                                                                       | Sí                 | PO          |
| PO       | **Q4** — Estados origen. Recomendado: sólo `status IN ('sent','viewed')`.                                                                                                                                                                       | Sí                 | PO          |
| PO       | **Q5** — Notificación por QR expirada. Recomendado: **sin notificación MVP**. BR-NOTIF-002 no la exige.                                                                                                                                          | Sí                 | PO          |
| Tech     | **Q6** — Clock injectable. Recomendado: `ClockPort` con `LocalClockAdapter` (prod) y `FrozenClockAdapter` (tests).                                                                                                                              | Sí                 | Tech        |
| PO       | **Q7** — Convención del corte. Recomendado: `sent_at < CURRENT_DATE - INTERVAL '30 days'` (estricto). QR enviada el día `D` se expira el día `D + 30` (o posterior si el job no corrió).                                                       | Sí                 | PO          |

---

## 8. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                          | Decisión vigente                       | Acción recomendada                                                | ¿Bloquea aprobación? |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-QUOTE-006/009`      | La US cita FR incorrectos.                                                    | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/8 §UC-QUOTE-010`          | La US cita `UC-QUOTE-006`.                                                    | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/4 §BR-QUOTE-005/009/016`  | La US cita `BR-QUOTE-011`.                                                    | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| PB-P1-033 Traceability          | El backlog item cita `FR-QUOTE-012..013, BR-QUOTE-019..020` incorrectos.     | Trazabilidad real registrada en US.    | Housekeeping del backlog.                                          | No                   |
| US-053 cron                     | Conflicto 00:05 vs 01:00 UTC.                                                | Unificar a 01:00 UTC.                  | Refactor del cron string en `expire-quotes.job.ts` de US-053.    | No                   |
| `docs/14 §Jobs`, `docs/21 §Cron`| Falta documentar `ExpireQuoteRequestsJob`.                                   | Documentar.                            | Actualizar.                                                        | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | `management/user-stories/US-055-auto-expire-quotes-job.md`                            |
| User Story ID verified                     | Yes                                                                                   |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-055-refinement-review.md`              |
| Final recommended status                   | Needs Refinement                                                                      |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                   |
| Reason                                     | 7 decisiones PO/Tech bloqueantes + trazabilidad incorrecta + solapamiento con US-053. |

---

## 11. Recomendación Final

`Needs Refinement`.

```text
User Story file updated: No
Path: management/user-stories/US-055-auto-expire-quotes-job.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-055-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
