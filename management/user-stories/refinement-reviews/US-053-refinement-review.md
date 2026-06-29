# User Story Refinement Review — US-053

## Source User Story File
management/user-stories/US-053-quote-validity-15-days.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-053-decision-resolution.md

## Review Date
2026-06-27 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)
Q1–Q5 resueltas. La US-053 declara `Backlog Item: PB-P1-031`, `PO/BA Decisions Applied` D1–D5, trazabilidad corregida (`FR-QUOTE-005/009`, `UC-QUOTE-004/010`, `BR-QUOTE-015/016`, `BR-NOTIF-002/003`, `NFR-OBS-005/PERF-001`, `C-019`, `C-031`). Scope expandido a UX `ValidUntilPicker` + Job `ExpireQuotesJob` idempotente con batching SKIP LOCKED, AC-01..AC-04, EC-01..EC-04, VR-01..VR-03, SEC-01..SEC-04, TS-01..TS-06. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| User Story ID                              | US-053                                                                    |
| File Path                                  | management/user-stories/US-053-quote-validity-15-days.md                  |
| Backlog Item                               | PB-P1-031 — Vendor visualiza y responde Quote                            |
| Epic                                       | EPIC-QR-001                                                               |
| Estado actual                              | Draft                                                                     |
| Estado recomendado                         | Needs Refinement                                                          |
| Nivel de riesgo                            | Bajo                                                                      |
| Calidad general                            | Media                                                                     |
| Requiere decisión PO                       | Sí                                                                        |
| Requiere decisión técnica                  | Sí (job de expiración + scheduler)                                       |
| Requiere decisión QA                       | No                                                                        |
| Requiere decisión Seguridad                | No                                                                        |
| Decision Resolution artifact found         | No                                                                        |
| User Story file updated                    | No                                                                        |
| Refinement review artifact created/updated | Yes                                                                       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-053-refinement-review.md    |

---

## 2. Diagnóstico PO/BA

US-053 cierra PB-P1-031 con el manejo de validez de `Quote`. El concepto declarado es estrecho ("vendor define `valid_until` con default 15 días"), pero gran parte del enforcement ya quedó cubierto por US-052 D3 (rango `[today+1, today+90]` + default `created_at::date + 15d`). El verdadero diferenciador en MVP es:

A) **UX del `ValidUntilPicker`** (date picker accesible con prefill del default y validación cliente).
B) **Job de expiración automática** que cumple **`FR-QUOTE-009`** y **`BR-QUOTE-016`** (marcar Quote como `expired` cuando `valid_until < today` y notificar al vendor in-app + email_simulated).

Sin el job, la decisión PO 8.1 #4 + #13 queda parcialmente entregada (la regla existe pero no se aplica automáticamente).

Hallazgos adicionales:

1. **Trazabilidad incorrecta**: cita `FR-QUOTE-008` (vendor responde con Quote — eso es US-052), `UC-QUOTE-005` (editar borrador — no aplica MVP), `BR-QUOTE-010` (cancelación organizador — no aplica). Las correctas son **`FR-QUOTE-005`** (validez default), **`FR-QUOTE-009`** (expiración automática + notificación al vendor), **`UC-QUOTE-010`** (historial de cotizaciones expiradas + notificación), **`BR-QUOTE-015`** (default 15 días), **`BR-QUOTE-016`** (expiración por vigencia), **`BR-NOTIF-002`** (notificación al vendor por Quote expirada). `C-019` (default 15 días) y `C-031` (default en service layer).
2. **Falta declarar `Backlog Item: PB-P1-031`**.
3. **Scope del job**: ¿in scope US-053 o US futura? El backlog title menciona "validez 15 días default" sin job. Pero `FR-QUOTE-009` es Must Have MVP y no tiene otro hogar — debería entrar aquí.
4. **Frecuencia del job**: no definida.
5. **Idempotencia del job**: no especificada.
6. **`VR-01` "valid_until > hoy"** ya cubierto por US-052 D3 — duplicado.
7. **AC-01/02**: ya cubiertos por US-052 AC-01/02. La US sólo aporta valor en el UX del picker y el job.
8. **Cuenta el día**: ¿`valid_until = '2026-07-12'` significa válida HASTA el final del día 12 o expira AL llegar el 12? Convención MVP necesaria.
9. **Notas "Confirmar máximo de validez (sugerido 90d)"** ya resuelto en US-052 D3 (90 días). Eliminar.
10. **AdminAction al expirar**: ¿se registra? Recomendado: sólo log + Notification (no AdminAction, sigue el patrón de US-049 D6).
11. **Notif al vendor de expiración**: in-app + email_simulated o sólo in-app (per FR-QUOTE-009 + BR-NOTIF-002 "in-app obligatoria + email cuando exista"). Confirmar.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                            | Impacto                                                                                                                                | Recomendación                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad incorrecta: `FR-QUOTE-008`, `UC-QUOTE-005`, `BR-QUOTE-010`.                                                                                            | Trazabilidad rota.                                                                                                                     | Reemplazar por **`FR-QUOTE-005, FR-QUOTE-009`**, **`UC-QUOTE-004, UC-QUOTE-010`**, **`BR-QUOTE-015, BR-QUOTE-016, BR-NOTIF-002`**, `C-019`, `C-031`, `NFR-OBS-005`.                                                                              |
| Alta      | Scope del job de expiración.                                                                                                                                       | `FR-QUOTE-009` huérfana si no entra aquí.                                                                                              | Resolver Q1 (PO). Recomendado: **incluir job de expiración en US-053**; sin él, PB-P1-031 queda incompleto.                                                                                                                                       |
| Alta      | Frecuencia del job.                                                                                                                                                | Implementación arbitraria.                                                                                                            | Resolver Q2 (Tech). Recomendado: cron diario `00:05 UTC` con jitter ±5min. Reuso del scheduler de PB-P1-009 (auto-complete event T+2).                                                                                                          |
| Alta      | Notificación al vendor de expiración: in-app + email_simulated.                                                                                                    | Inconsistencia con US-049/US-052.                                                                                                     | Resolver Q3 (PO). Recomendado: 2 Notifications (`in_app` + `email_simulated`) al vendor por cada Quote expirada (paridad US-049 D6).                                                                                                            |
| Alta      | Convención del corte (`valid_until = '2026-07-12'` ¿expira al inicio o al final del día?).                                                                          | Implementación arbitraria.                                                                                                            | Resolver Q4 (PO). Recomendado: **válida HASTA el final del día `valid_until` inclusive**; el job marca `expired` cuando `today > valid_until` (es decir, al inicio del día `valid_until + 1`).                                                  |
| Alta      | Idempotencia y batching del job.                                                                                                                                    | Re-ejecuciones inconsistentes.                                                                                                        | Resolver Q5 (Tech). Recomendado: job idempotente (`WHERE status='sent' AND valid_until < CURRENT_DATE`); transacción por batch de 100; reintento automático en fallo.                                                                            |
| Alta      | `AC-01/02` duplican US-052 D3.                                                                                                                                      | Redundancia.                                                                                                                          | Reescribir AC-01/02 enfocados al UX del picker + AC nuevos para el job.                                                                                                                                                                          |
| Media     | Falta declarar `Backlog Item: PB-P1-031`.                                                                                                                          | Trazabilidad incompleta.                                                                                                              | Añadir en Metadata.                                                                                                                                                                                                                            |
| Media     | VR-01 duplica VR-05 de US-052.                                                                                                                                      | Redundancia.                                                                                                                          | Reusar (no duplicar).                                                                                                                                                                                                                          |
| Baja      | `Notes` "Confirmar máximo 90d" ya resuelto en US-052 D3.                                                                                                            | Obsoleta.                                                                                                                              | Eliminar.                                                                                                                                                                                                                                       |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                  |
| ------------------------------------ | --------- | --------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                  |
| No introduce contratos firmados      | Pass      | No aplica.                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                  |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                |
| Respeta backend como source of truth | Pass      | Job server-side.                                                            |
| Respeta seed/demo si aplica          | Pass      | Reuso seed; Quote con `valid_until` pasado para demo.                       |
| No introduce P4/Future scope         | Pass      | Auto-renovación correctamente Out of Scope.                                |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                          | Acción recomendada                                                                                                                                                                                              |
| ----- | ------------ | ----------------------------------------------------------- | -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail | Duplica US-052 AC-01.                                        | Reescribir enfocado al UX del picker: "el form pre-rellena `today + 15d` editable".                                                                                                                            |
| AC-02 | Needs Detail | Duplica US-052 AC-02.                                        | Reescribir enfocado al UX: vendor puede modificar el valor del picker dentro del rango con feedback inline.                                                                                                  |
| EC-01 | Needs Detail | Duplica US-052 EC-06.                                        | Mantener referenciando a US-052; o eliminar.                                                                                                                                                                |

Faltan AC para:
- Job marca Quotes expiradas (Q1).
- Job emite 2 Notifications al vendor (Q3).
- Job es idempotente (Q5).
- UX del picker accesible (Q4 convención).

---

## 6. Gaps Detectados

### Producto / Negocio
- Faltan decisiones (Q1..Q5).

### Backend / API
- Job dedicado `ExpireQuotesJob`.
- Scheduler (cron diario).
- `NotificationSenderPort` reuso.

### Frontend / UX
- `ValidUntilPicker` accesible con default 15d + range validation cliente.

### Base de Datos
- Reuso de `idx_quotes_valid_until_active (valid_until) WHERE status = 'sent'` (PB-P0-001).

### Seguridad / Autorización
- Job ejecuta como sistema; sin user context.

### IA / PromptOps
- No aplica.

### QA / Testing
- Tests del job (idempotencia, batching, notif).
- A11Y del picker.

### Seed / Demo
- Quote con `valid_until` pasado para demo del job.

### Documentación / Trazabilidad
- Corregir FR/UC/BR.
- Documentar job en `docs/14 §Jobs` y `docs/21 §Cron`.

---

## 7. Preguntas Pendientes

| Tipo     | Pregunta                                                                                                                                                                                                                                          | Bloquea aprobación | Responsable |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| PO       | **Q1** — Job de expiración in scope US-053. Recomendado: sí, incluir; FR-QUOTE-009 lo requiere y no tiene otro hogar.                                                                                                                          | Sí                 | PO          |
| Tech     | **Q2** — Frecuencia del job. Recomendado: cron diario `00:05 UTC` con jitter ±5min.                                                                                                                                                            | Sí                 | Tech        |
| PO       | **Q3** — Notif al vendor. Recomendado: 2 Notifications `in_app` + `email_simulated` (paridad US-049 D6).                                                                                                                                       | Sí                 | PO          |
| PO       | **Q4** — Convención del corte. Recomendado: válida HASTA el final del día `valid_until`; job marca `expired` cuando `today > valid_until` (al inicio del día `valid_until + 1`).                                                                | Sí                 | PO          |
| Tech     | **Q5** — Idempotencia + batching. Recomendado: WHERE `status='sent' AND valid_until < CURRENT_DATE`; batch de 100; reintento automático en fallo.                                                                                                | Sí                 | Tech        |

---

## 8. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                          | Decisión vigente                       | Acción recomendada                                                | ¿Bloquea aprobación? |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-QUOTE-005/009`      | La US cita `FR-QUOTE-008` (US-052).                                          | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/8 §UC-QUOTE-004/010`      | La US cita `UC-QUOTE-005` (editar borrador).                                  | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/4 §BR-QUOTE-015/016`      | La US cita `BR-QUOTE-010` (cancelación organizador).                          | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/14 §Jobs`, `docs/21 §Cron` | Falta documentar `ExpireQuotesJob`.                                          | Documentar tras Q1/Q2/Q5.              | Actualizar.                                                        | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | `management/user-stories/US-053-quote-validity-15-days.md`                            |
| User Story ID verified                     | Yes                                                                                   |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-053-refinement-review.md`              |
| Final recommended status                   | Needs Refinement                                                                      |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                   |
| Reason                                     | 5 decisiones PO/Tech bloqueantes + trazabilidad incorrecta + scope incompleto (job).  |

---

## 11. Recomendación Final

`Needs Refinement`.

```text
User Story file updated: No
Path: management/user-stories/US-053-quote-validity-15-days.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-053-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
