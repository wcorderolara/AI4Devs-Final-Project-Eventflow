# User Story Refinement Review — US-052

## Source User Story File
management/user-stories/US-052-vendor-respond-quote.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-052-decision-resolution.md

## Review Date
2026-06-27 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)
Q1–Q7 resueltas. La US-052 declara `Backlog Item: PB-P1-031`, `PO/BA Decisions Applied` D1–D7, trazabilidad corregida (`FR-QUOTE-007/008/017/018/019`, `UC-QUOTE-004`, `BR-QUOTE-011..014/017..020`, `C-030/031`, `NFR-PERF-001/OBS-005`). Body estructurado, envío single-shot, currency heredada, 2 Notifications atómicas, rango `valid_until`, AC-01..AC-04, EC-01..EC-07, VR-01..VR-08, SEC-01..SEC-05, TS-01..TS-06, NT-01..NT-10, AUTH-TS-01..AUTH-TS-05. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| User Story ID                              | US-052                                                                    |
| File Path                                  | management/user-stories/US-052-vendor-respond-quote.md                    |
| Backlog Item                               | PB-P1-031 — Vendor visualiza y responde Quote                            |
| Epic                                       | EPIC-QR-001                                                               |
| Estado actual                              | Draft                                                                     |
| Estado recomendado                         | Needs Refinement                                                          |
| Nivel de riesgo                            | Medio                                                                     |
| Calidad general                            | Media                                                                     |
| Requiere decisión PO                       | Sí                                                                        |
| Requiere decisión técnica                  | Sí (breakdown schema + draft flow)                                        |
| Requiere decisión QA                       | No                                                                        |
| Requiere decisión Seguridad                | No                                                                        |
| Decision Resolution artifact found         | No                                                                        |
| User Story file updated                    | No                                                                        |
| Refinement review artifact created/updated | Yes                                                                       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-052-refinement-review.md    |

---

## 2. Diagnóstico PO/BA

US-052 entrega la respuesta del vendor a una QR mediante una `Quote` con total, desglose, condiciones y validez (`docs/8 §UC-QUOTE-004`, `docs/9 §FR-QUOTE-007/008/017/018/019`, `docs/4 §BR-QUOTE-011..020`, `docs/18 §16.2`). Es la posición 2 de 3 en PB-P1-031 (US-051 → US-052 → US-053). Hallazgos:

1. **Trazabilidad incorrecta**: cita `FR-QUOTE-006` (lifecycle QR), `FR-QUOTE-007` (lifecycle Quote, parcial), `BR-QUOTE-008` (idioma del brief). Las correctas son **`FR-QUOTE-008`** (vendor responde con Quote), **`FR-QUOTE-007`** (lifecycle Quote), **`FR-QUOTE-017`** (notif organizer al `sent`), **`FR-QUOTE-018`** (currency heredada), **`FR-QUOTE-019`** (Quote inmutable post-sent), **`UC-QUOTE-004`** (correcto), **`BR-QUOTE-011..020`** (todas las reglas de respuesta), **`C-030`** (UNIQUE parcial vigente), **`C-031`** (default 15 días). `NFR-PERF-API-001` no existe → `NFR-PERF-001`. `BR-QUOTE-015` (validez default) y `FR-QUOTE-005` se entregan en US-053 — referenciar pero no duplicar.
2. **Falta declarar `Backlog Item: PB-P1-031`**.
3. **Schema del `breakdown` JSONB**: el schema `docs/18 §16.2` lo define como `jsonb` "desglose simple" sin estructura formal. La US dice "Desglose suma = total" — requiere estructura validable. Decidir shape: `[{label, amount, quantity?}]`.
4. **Flujo draft vs envío directo**: la US dice "Guardar borrador" como secondary action sin detallar. `BR-QUOTE-017` permite edición sólo en `draft`. ¿US-052 incluye CRUD draft (POST draft + PATCH draft + POST send) o sólo el envío directo en un único POST?
5. **`valid_until` máximo**: PB-P1-031 description dice "max 90". La US no lo cubre.
6. **Currency heredada**: BR-QUOTE-019 obliga `currency_code = events.currency_code`. La US no lo aclara — debe ser inferido server-side, no enviado por el cliente.
7. **Email simulado al organizer**: paridad con US-049 D6 (in-app + email_simulated). Confirmar.
8. **Estados origen permitidos**: QR `sent` o `viewed`. ¿Y si `responded` ya? ¿`409 QR_ALREADY_RESPONDED`?
9. **VR-01**: "Total > 0". El schema dice `CHECK >= 0` (permite cero). Confirmar.
10. **Atomicidad**: la US dice "Transacción Required: Sí (Quote + QR status + notification)". Confirmar `prisma.$transaction`.
11. **Notas "Considerar autosave de borrador"**: queda Future si Q4 dice envío directo.
12. **`404 QR_NOT_FOUND` uniforme**: consistente con US-051 D4.
13. **Una vigente por QR**: `C-030` UNIQUE parcial `WHERE status NOT IN ('expired','rejected')`. Confirmar comportamiento si previa `expired`/`rejected` (permite nueva Quote).

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                          | Impacto                                                                                                          | Recomendación                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad incorrecta/incompleta.                                                                                                                                              | Trazabilidad rota.                                                                                               | Reemplazar/añadir: `FR-QUOTE-007/008/017/018/019`, `UC-QUOTE-004`, `BR-QUOTE-011..014/017..020`, `C-030`, `NFR-PERF-001`, `NFR-OBS-005`. `FR-QUOTE-005` + `BR-QUOTE-015` referenciar desde US-053. |
| Alta      | Estructura del `breakdown` sin formalizar.                                                                                                                                       | Implementación arbitraria; VR-02 no testeable.                                                                   | Resolver Q1 (PO/BA). Recomendado: `breakdown: [{ label: string [1..150], amount: numeric(14,2) >= 0 }]` con `1..20` items. `SUM(amount) === total_price` (tolerancia ±0.01).                                                                  |
| Alta      | Flujo draft vs envío directo.                                                                                                                                                   | Scope MVP confuso.                                                                                               | Resolver Q2 (PO). Recomendado: **envío directo single-shot** en MVP (`POST .../respond` crea Quote y la transiciona a `sent` atómicamente). Borrador con CRUD es Future. "Guardar borrador" del UI queda Out of Scope MVP.                |
| Alta      | `valid_until` máximo.                                                                                                                                                          | Plazos abusivos.                                                                                                | Resolver Q3 (PO). Recomendado: `valid_until` en rango `[today+1, today+90]` días. Default 15 días si ausente.                                                                                                                                |
| Alta      | Currency heredada del evento.                                                                                                                                                    | Body podría enviar currency distinta.                                                                            | Resolver Q4 (PO/Tech). Recomendado: backend infiere `currency_code` del evento (BR-QUOTE-019); cliente NO lo envía. Si lo envía, se ignora.                                                                                                  |
| Alta      | Email simulado al organizer.                                                                                                                                                     | Paridad con US-049 D6.                                                                                            | Resolver Q5 (PO). Recomendado: 2 Notifications (`in_app` + `email_simulated`) al organizer dentro de la transacción (FR-QUOTE-017 + paridad).                                                                                                  |
| Alta      | Estados origen permitidos.                                                                                                                                                       | Implementación ambigua.                                                                                          | Resolver Q6 (PO). Recomendado: permitido sólo desde QR `status IN ('sent','viewed')` Y `(expires_at IS NULL OR expires_at > NOW())`. Otros estados ⇒ `409 QR_NOT_RESPONDABLE` con `details.current_status`.                                  |
| Alta      | Total `> 0` vs `>= 0`.                                                                                                                                                          | Inconsistencia con schema.                                                                                       | Resolver Q7 (PO). Recomendado: `> 0` (la US es correcta; el CHECK del schema es permisivo, la regla de negocio exige mayor).                                                                                                                  |
| Media     | Falta declarar `Backlog Item: PB-P1-031`.                                                                                                                                       | Trazabilidad incompleta.                                                                                          | Añadir en Metadata.                                                                                                                                                                                                                            |
| Media     | AC-01/02 lacónicos.                                                                                                                                                              | Subespecificados.                                                                                                | Reescribir con shape del body y persistencia exacta.                                                                                                                                                                                          |
| Media     | EC-01 `409 QR_EXPIRED`.                                                                                                                                                          | Mensaje correcto pero genérico.                                                                                  | Renombrar a `409 QR_NOT_RESPONDABLE` con `details.current_status` para cubrir `expired`, `cancelled`, `responded`, `preferred`, `rejected`.                                                                                                  |
| Baja      | `Notes` plantea autosave.                                                                                                                                                        | Out of scope MVP tras Q2.                                                                                        | Mover a Future.                                                                                                                                                                                                                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                  |
| ------------------------------------ | --------- | --------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | Precio referencial.                                                          |
| No introduce contratos firmados      | Pass      | No aplica.                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                  |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                |
| Respeta backend como source of truth | Pass      | Validaciones server-side.                                                   |
| Respeta seed/demo si aplica          | Pass      | Reuso seed.                                                                 |
| No introduce P4/Future scope         | Pass      | Multi-quote por QR Out of Scope correcto.                                  |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                                                            | Acción recomendada                                                                                                                                                                                              |
| ----- | ------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail | No nombra shape body, Quote persisted fields, notificaciones (in-app + email_simulated).        | Reescribir.                                                                                                                                                                                                |
| AC-02 | Needs Detail | "default 15 días" — confirmar fuente (`created_at::date + 15 days`) per C-031.                  | Reescribir con regla exacta.                                                                                                                                                                              |
| EC-01 | Needs Detail | Sólo cubre `expired`.                                                                          | Tras Q6: `409 QR_NOT_RESPONDABLE` para todos los estados no permitidos.                                                                                                                                   |

Faltan AC para:
- Currency heredada (Q4).
- `valid_until` rango (Q3).
- `breakdown` validado (Q1).
- Una Quote vigente por QR (BR-QUOTE-013).
- Notificación email_simulated (Q5).
- 404 uniforme.

---

## 6. Gaps Detectados

### Producto / Negocio
- Faltan decisiones PO (Q1..Q7).

### Backend / API
- `breakdown` schema validable.
- Body sin `currency_code` (server-side).
- Transacción atómica con 2 Notifications.

### Frontend / UX
- `QuoteResponseForm` con `BreakdownEditor` que valida suma.
- Mostrar moneda del evento read-only.
- Estado de error si suma != total.

### Base de Datos
- Confirmar `quotes` schema entregado por PB-P0-001.
- UNIQUE parcial `uq_quotes_request_active`.

### Seguridad / Autorización
- Assignment-based (vendor target).
- `404 QR_NOT_FOUND` uniforme.

### IA / PromptOps
- No aplica.

### QA / Testing
- TS atomicidad, suma del breakdown, default 15 días, currency heredada, 2 Notifications, estados no permitidos.

### Seed / Demo
- Vendor demo con QR `viewed` para responder.

### Documentación / Trazabilidad
- Corregir FR/BR/NFR.
- Documentar endpoint en `docs/16 §M07`.

---

## 7. Preguntas Pendientes

| Tipo     | Pregunta                                                                                                                                                                                                                                          | Bloquea aprobación | Responsable |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| PO/BA    | **Q1** — Estructura del `breakdown`. Recomendado: `[{ label string [1..150], amount numeric(14,2) >= 0 }]` con `1..20` items; `SUM(amount) === total_price` (tolerancia ±0.01).                                                                | Sí                 | PO/BA       |
| PO       | **Q2** — Flujo draft. Recomendado: **envío directo single-shot** en MVP; draft CRUD es Future.                                                                                                                                                  | Sí                 | PO          |
| PO       | **Q3** — `valid_until` máximo. Recomendado: rango `[today+1, today+90]` días; default 15.                                                                                                                                                       | Sí                 | PO          |
| PO/Tech  | **Q4** — Currency heredada. Recomendado: backend infiere del evento; cliente no envía `currency_code`.                                                                                                                                          | Sí                 | PO/Tech     |
| PO       | **Q5** — Email simulado al organizer. Recomendado: 2 Notifications (`in_app` + `email_simulated`) atómicas (paridad US-049 D6).                                                                                                                | Sí                 | PO          |
| PO       | **Q6** — Estados origen. Recomendado: sólo QR `sent`/`viewed` Y no vencida. Otros ⇒ `409 QR_NOT_RESPONDABLE` con `details.current_status`.                                                                                                       | Sí                 | PO          |
| PO       | **Q7** — Total `> 0` vs `>= 0`. Recomendado: `> 0` (regla de negocio).                                                                                                                                                                          | Sí                 | PO          |

---

## 8. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                          | Decisión vigente                       | Acción recomendada                                                | ¿Bloquea aprobación? |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-QUOTE-008/017/018/019` | La US no las cita.                                                            | Añadir.                                | Housekeeping en US.                                                | No                   |
| `docs/4 §BR-QUOTE-011..020`     | La US sólo cita `BR-QUOTE-008` (incorrecto).                                  | Reemplazar.                            | Housekeeping en US.                                                | No                   |
| `docs/16 §M07`                  | Falta documentar endpoint.                                                    | Documentar.                            | Actualizar `docs/16`.                                              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | `management/user-stories/US-052-vendor-respond-quote.md`                              |
| User Story ID verified                     | Yes                                                                                   |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-052-refinement-review.md`              |
| Final recommended status                   | Needs Refinement                                                                      |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                   |
| Reason                                     | 7 decisiones PO/Tech bloqueantes + trazabilidad incorrecta.                           |

---

## 11. Recomendación Final

`Needs Refinement`.

```text
User Story file updated: No
Path: management/user-stories/US-052-vendor-respond-quote.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-052-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
