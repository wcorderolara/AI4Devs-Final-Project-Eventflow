# User Story Refinement Review — US-044

## Source User Story File
management/user-stories/US-044-manage-vendor-services.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-044-decision-resolution.md

## Review Date
2026-06-27 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)
Q1–Q6 resueltas. La US-044 ahora declara `Backlog Item: PB-P1-027`, `PO/BA Decisions Applied` D1–D6, trazabilidad corregida (`FR-VENDOR-009`, `UC-VENDOR-004`, `BR-SERVICE-001/002/003/006`, `BR-AUTH-007`, `NFR-PERF-001`, `NFR-OBS-005`), 4 endpoints `GET/POST/PATCH/DELETE /vendors/me/services[/:id]`, AC-01a..AC-01d, EC-01..EC-09, VR-01..VR-08, SEC-01..SEC-04, TS-01..TS-06, NT-01..NT-09, AUTH-TS-01..AUTH-TS-08. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| User Story ID                              | US-044                                                                    |
| File Path                                  | management/user-stories/US-044-manage-vendor-services.md                  |
| Backlog Item                               | PB-P1-027 — VendorService (paquetes)                                      |
| Epic                                       | EPIC-VND-001                                                              |
| Estado actual                              | Draft                                                                     |
| Estado recomendado                         | Needs Refinement                                                          |
| Nivel de riesgo                            | Medio                                                                     |
| Calidad general                            | Media                                                                     |
| Requiere decisión PO                       | Sí                                                                        |
| Requiere decisión técnica                  | Sí (alineación schema + endpoint GET)                                     |
| Requiere decisión QA                       | No                                                                        |
| Requiere decisión Seguridad                | No                                                                        |
| Decision Resolution artifact found         | No                                                                        |
| User Story file updated                    | No                                                                        |
| Refinement review artifact created/updated | Yes                                                                       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-044-refinement-review.md    |

---

## 2. Diagnóstico PO/BA

US-044 cierra PB-P1-027 con el CRUD de `VendorService` (Decisión PO 8.1 / `BR-SERVICE-001..006`). El alcance se entiende, pero la US tiene problemas estructurales:

1. **Trazabilidad incorrecta**: cita `FR-VENDOR-005` (que es "requires_admin_review" tras cambio de categorías — US-042), `UC-VENDOR-005` (portafolio — US-043), `BR-VENDOR-006` (verificación manual del vendor) y `NFR-PERF-API-001` (no existe). Las correctas son **`FR-VENDOR-009`** (CRUD VendorService), **`UC-VENDOR-004`** (Gestionar servicios y paquetes), **`BR-SERVICE-001/002/006`** (pertenencia, datos mínimos, precio referencial) y **`NFR-PERF-001`**.
2. **Endpoint GET ausente**: la US lista POST/PATCH/DELETE pero no GET. La UI necesita listar los servicios para edición.
3. **"Soft delete opcional"** ambiguo: el schema `docs/18 §15.2` indica que la eliminación lógica se modela con `is_active=false` (no `deleted_at`). Hay que explicitar.
4. **Falta declarar `Backlog Item: PB-P1-027`**.
5. **`currency_code`** vive en `vendor_services` (cada paquete su moneda). La US dice "Moneda base"; aclarar y validar contra catálogo.
6. **Política por status del `VendorProfile`** no definida. UC-VENDOR-004 dice "Servicios sólo visibles si perfil `approved`" pero no aclara si el CRUD se permite en `pending`/`rejected`/`hidden`/soft-deleted.
7. **Tope de servicios por vendor**: docs no fija un máximo. Sin tope MVP o cap defensivo.
8. **Longitudes** de `package_name` y `description` no documentadas.
9. **Cambio de categoría** del servicio: ¿libre o requiere admin review? UC-VENDOR-002/US-042 limita los cambios de categoría del perfil, pero esto es a nivel servicio (no perfil); presumiblemente libre.
10. **Visibilidad pública**: confirmar que sólo `is_active=true` + `vendor_profile.status='approved'` se exponen al directorio (BR-SERVICE-001).
11. **AC-01 demasiado lacónico**: no nombra campos, response codes, ni el flag `is_active`.
12. **Notes "Definir si paquetes inactivos se ocultan"** — exactamente la decisión que falta formalizar.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                       | Impacto                                                                                                          | Recomendación                                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad estructuralmente incorrecta: `FR-VENDOR-005`, `UC-VENDOR-005`, `BR-VENDOR-006`, `NFR-PERF-API-001` no aplican.                                                       | Trazabilidad rota; aprobación inválida.                                                                          | Reemplazar por **`FR-VENDOR-009`, `UC-VENDOR-004`, `BR-SERVICE-001/002/006`, `NFR-PERF-001`** + añadir `BR-SERVICE-003` (catálogo curado) y `BR-SERVICE-005` (jerarquía ≤ 2).                                                                       |
| Alta      | Endpoint GET ausente.                                                                                                                                                            | UI no puede listar para edición.                                                                                  | Resolver Q3 (PO/Tech). Recomendado: **`GET /api/v1/vendors/me/services`** (paginación opcional MVP).                                                                                                                                                |
| Alta      | "Soft delete opcional" no operativo.                                                                                                                                            | Riesgo de hard delete o inconsistencia con docs.                                                                  | Resolver Q2 (PO). Recomendado: **soft delete por `is_active=false`** (DELETE setea el flag; sin `deleted_at` en este modelo). Hard delete prohibido en MVP.                                                                                         |
| Alta      | Política por status del `VendorProfile` no definida.                                                                                                                              | Comportamiento ambiguo en estados no `approved`.                                                                  | Resolver Q1 (PO). Recomendado: **CRUD permitido en `pending`/`approved`/`rejected`**; bloqueado en `hidden` (`409 PROFILE_HIDDEN`) y soft-deleted del perfil (`404`). Visibilidad pública sólo si `is_active=true` Y `vendor_profile.status='approved'`. |
| Alta      | `currency_code` por servicio no aclarado (validación contra catálogo).                                                                                                            | Riesgo de moneda inválida.                                                                                       | Resolver Q4 (PO). Recomendado: validar `currency_code` contra el enum `currency_code` documentado (`GTQ, EUR, MXN, COP, USD` mínimo).                                                                                                              |
| Alta      | Tope de servicios por vendor.                                                                                                                                                    | Riesgo de spam o cap arbitrario.                                                                                  | Resolver Q5 (PO). Recomendado: **máximo 50 `VendorService` activos por vendor** (cap defensivo) o **sin tope**. PO decide.                                                                                                                          |
| Alta      | Longitudes de `package_name` y `description`.                                                                                                                                    | Implementación arbitraria.                                                                                       | Resolver Q6 (PO/BA). Recomendado: `package_name` `2..150`, `description` `10..2000`.                                                                                                                                                                |
| Media     | Falta declarar `Backlog Item: PB-P1-027`.                                                                                                                                        | Trazabilidad incompleta.                                                                                          | Añadir en Metadata.                                                                                                                                                                                                                                |
| Media     | AC-01 demasiado lacónico.                                                                                                                                                        | AC subespecificado.                                                                                              | Reescribir AC-01 (POST + PATCH + DELETE separados) con response codes, campos persistidos y log estructurado.                                                                                                                                       |
| Media     | Falta listado de error codes (`INVALID_CATEGORY`, `INVALID_CURRENCY`, `INVALID_PRICE`, `SERVICE_LIMIT_REACHED`, `SERVICE_NOT_FOUND`).                                              | Inconsistencia.                                                                                                  | Añadir tras Q3–Q6.                                                                                                                                                                                                                                  |
| Media     | Falta especificar campo `ai_generated_description` (default `false`). US-023 (AI bio/description) podría setearlo en una US futura.                                                | Confusión con US-023.                                                                                            | Aclarar Out of Scope para US-044 (el flag se persiste como `false` por defecto al crear/editar manualmente).                                                                                                                                       |
| Baja      | `Notes` plantea exactamente la duda Q1/Q2.                                                                                                                                       | Indica US no cerrada.                                                                                            | Eliminar tras resolver.                                                                                                                                                                                                                            |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                          |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | Precio referencial (BR-SERVICE-006).                                                                                |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                                          |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                                          |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA directamente (UC-AI-009 es opcional y vive en otra US).                                                |
| Respeta backend como source of truth | Pass      | Enforcement server-side.                                                                                            |
| Respeta seed/demo si aplica          | Pass      | Reuso del seed de US-040; extensión opcional.                                                                       |
| No introduce RAG/vector DB           | Pass      | N/A.                                                                                                                |
| No introduce multi-tenant enterprise | Pass      | N/A.                                                                                                                |
| No introduce P4/Future scope         | Pass      | Variantes complejas explícitamente fuera de scope.                                                                  |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                                                            | Acción recomendada                                                                                                                                                                                                                                                                              |
| ----- | ------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail | No separa POST/PATCH/DELETE/GET; falta detallar campos persistidos, codes y `is_active`.       | Dividir en AC-01a (POST `201`), AC-01b (PATCH `200`), AC-01c (DELETE soft `204` con `is_active=false`), AC-01d (GET `200`).                                                                                                                                                                  |
| EC-01 | Needs Detail | No nombra code.                                                                                | Reescribir con `400 INVALID_PRICE` y rango exacto (`>= 0`).                                                                                                                                                                                                                                  |

Faltan AC para:
- Categoría inactiva (`400 INVALID_CATEGORY`).
- Currency inválida (`400 INVALID_CURRENCY`).
- Bloqueo en `hidden` y soft-deleted del perfil (Q1).
- Visibilidad pública sólo si `is_active=true` Y perfil `approved` (BR-SERVICE-001).
- Tope (Q5).
- Longitudes (Q6).

---

## 6. Gaps Detectados

### Producto / Negocio
- Faltan decisiones PO (Q1–Q6).

### Backend / API
- Endpoint GET ausente.
- Validación de currency contra enum.
- Validación de categoría activa (`service_categories.is_active=true`).

### Frontend / UX
- Falta CTA "Activar/Desactivar" o decisión sobre cómo se gestiona `is_active` desde la UI.
- Falta confirmación accesible para DELETE.

### Base de Datos
- Confirmar `vendor_services` (entregado por PB-P0-001).
- Sin migraciones nuevas.

### Seguridad / Autorización
- Ownership por sesión OK.
- Heredar política por status del perfil.

### IA / PromptOps
- No aplica directamente (US-023 cubre AI bio/description en futura iteración).

### QA / Testing
- Añadir TS de visibilidad pública.
- Añadir NT por currency inválida, categoría inactiva.
- Añadir AUTH-TS por status del perfil.

### Seed / Demo
- Reuso de seed de US-040.

### Documentación / Trazabilidad
- Corregir FR/UC/BR/NFR.
- Documentar 4 endpoints en `docs/16 §M07`.

---

## 7. Preguntas Pendientes

| Tipo     | Pregunta                                                                                                                                                                                                                                          | Bloquea aprobación | Responsable |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| PO       | **Q1** — Política por status del `VendorProfile`. Recomendado: CRUD permitido en `pending`/`approved`/`rejected`; bloqueado en `hidden` (`409 PROFILE_HIDDEN`) y soft-deleted (`404`). Visibilidad pública sólo si `is_active=true` Y `status='approved'`. | Sí                 | PO          |
| PO       | **Q2** — Soft delete via `is_active=false`. Recomendado: DELETE setea `is_active=false`; hard delete prohibido en MVP. PATCH con `is_active` en body permite reactivar.                                                                          | Sí                 | PO          |
| PO/Tech  | **Q3** — Endpoint GET. Recomendado: `GET /api/v1/vendors/me/services` retorna todos los servicios del vendor (incluyendo `is_active=false`) ordenados por `created_at desc`. Sin paginación MVP.                                                  | Sí                 | PO/Tech     |
| PO       | **Q4** — Validación de `currency_code`. Recomendado: validar contra el enum del proyecto (`GTQ`, `EUR`, `MXN`, `COP`, `USD` como mínimo). Default = currency del primer servicio o requerido en body.                                              | Sí                 | PO          |
| PO       | **Q5** — Tope de `VendorService` por vendor. Recomendado: **máximo 50 activos por vendor** (cap defensivo).                                                                                                                                       | Sí                 | PO          |
| PO/BA    | **Q6** — Longitudes de `package_name` y `description`. Recomendado: `package_name 2..150`, `description 10..2000`.                                                                                                                                | Sí                 | PO/BA       |

---

## 8. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                                                            | Decisión vigente                       | Acción recomendada                                                | ¿Bloquea aprobación? |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-VENDOR-009`         | La US cita `FR-VENDOR-005` (que es `requires_admin_review`).                                                    | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/8 §UC-VENDOR-004`         | La US cita `UC-VENDOR-005` (portafolio).                                                                        | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/4 §BR-SERVICE-001/002/006`| La US cita `BR-VENDOR-006` (verificación manual del vendor).                                                    | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/10 §NFR-PERF-001`         | `NFR-PERF-API-001` no existe.                                                                                  | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/16 §M07`                  | Falta documentar GET, POST, PATCH, DELETE de `/vendors/me/services`.                                            | Documentar tras Q1–Q6.                  | Actualizar `docs/16`.                                              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | `management/user-stories/US-044-manage-vendor-services.md`                            |
| User Story ID verified                     | Yes                                                                                   |
| Decision Resolution artifact found         | No                                                                                    |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-044-decision-resolution.md`          |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-044-refinement-review.md`              |
| Final recommended status                   | Needs Refinement                                                                      |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                   |
| Reason                                     | 6 decisiones PO/Tech bloqueantes + trazabilidad estructuralmente incorrecta + endpoint GET ausente. |

---

## 10. Cambios Aplicados o Recomendados

(Se aplicarán tras Decision Resolver.)

### Metadata
- `Backlog Item: PB-P1-027`.
- `Status: Ready for Approval`.
- `Last Updated: 2026-06-27`.

### Business Context
- Aclaración del modelo: precio referencial, currency por servicio, soft delete via `is_active`.

### PO/BA Decisions Applied
- Sección con D1–D6.

### Traceability
- `FR-VENDOR-005` → `FR-VENDOR-009`.
- `UC-VENDOR-005` → `UC-VENDOR-004`.
- `BR-VENDOR-006` → `BR-SERVICE-001, BR-SERVICE-002, BR-SERVICE-006` (+ `BR-SERVICE-003`).
- `NFR-PERF-API-001` → `NFR-PERF-001` + añadir `NFR-OBS-005`.

### Scope Guardrails
- Out of Scope: variantes complejas, hard delete físico, AI description (US-023), CRUD de categorías (admin), reordenamiento, bulk operations.

### Acceptance Criteria
- AC-01a..AC-01d (POST/PATCH/DELETE/GET).
- EC para currency, categoría inactiva, tope, longitudes, hidden, soft-deleted del perfil.

### Technical Notes
- Backend: 4 use cases (`CreateVendorServiceUseCase`, `UpdateVendorServiceUseCase`, `DeactivateVendorServiceUseCase`, `ListVendorServicesUseCase`).
- DB: `vendor_services` reuso de PB-P0-001.

### QA Notes
- Añadir TS de visibilidad pública.
- AUTH-TS para `pending`/`approved`/`rejected`/`hidden`/soft-deleted.

### Definition of Ready
- `PO/BA validó` ✅.

### Definition of Done
- 4 endpoints, log estructurado, i18n, accesibilidad de modal DELETE.

### Notes
- Mover "definir paquetes inactivos" a resuelto (Q1 + Q2).

---

## 11. Recomendación Final

`Needs Refinement`.

US-044 captura el CRUD de `VendorService` pero requiere resolución explícita de seis decisiones PO/Tech y corrección estructural de trazabilidad antes de poder aprobarse. Tras `eventflow-po-ba-decision-resolver`, revalidar y aprobar.

```text
User Story file updated: No
Path: management/user-stories/US-044-manage-vendor-services.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-044-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
