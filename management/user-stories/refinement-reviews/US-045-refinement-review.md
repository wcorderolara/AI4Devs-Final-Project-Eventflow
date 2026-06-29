# User Story Refinement Review — US-045

## Source User Story File
management/user-stories/US-045-search-vendors.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-045-decision-resolution.md

## Review Date
2026-06-27 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)
Q1–Q8 resueltas. La US-045 ahora declara `Backlog Item: PB-P1-028`, `PO/BA Decisions Applied` D1–D8, trazabilidad corregida (`FR-VENDOR-003`, `FR-SERVICE-004`, `UC-VENDOR-006`, `BR-VENDOR-001`, `BR-VENDOR-003`, `BR-SERVICE-001`, `BR-BUDGET-007`, `NFR-PERF-001`), endpoint canónico `GET /api/v1/vendors` con query params slug-based (D7), cursor opaque (D1), orden estable (D2), EXISTS para precio (D4), currency requerido con precio (D5), roles autorizados (D6), AC-01..AC-04, EC-01..EC-05, VR-01..VR-06, SEC-01..SEC-04, TS-01..TS-07, NT-01..NT-07, AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| User Story ID                              | US-045                                                                    |
| File Path                                  | management/user-stories/US-045-search-vendors.md                          |
| Backlog Item                               | PB-P1-028 — Búsqueda de directorio de proveedores (organizer)             |
| Epic                                       | EPIC-VND-001                                                              |
| Estado actual                              | Draft                                                                     |
| Estado recomendado                         | Needs Refinement                                                          |
| Nivel de riesgo                            | Medio                                                                     |
| Calidad general                            | Media                                                                     |
| Requiere decisión PO                       | Sí                                                                        |
| Requiere decisión técnica                  | Sí (paginación, filtros, ordenamiento)                                    |
| Requiere decisión QA                       | No                                                                        |
| Requiere decisión Seguridad                | No                                                                        |
| Decision Resolution artifact found         | No                                                                        |
| User Story file updated                    | No                                                                        |
| Refinement review artifact created/updated | Yes                                                                       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-045-refinement-review.md    |

---

## 2. Diagnóstico PO/BA

US-045 cubre la búsqueda del directorio de proveedores aprobados para organizadores autenticados (`docs/8 §UC-VENDOR-006`, `docs/4 §BR-VENDOR-001`). El intent del backlog item PB-P1-028 está claro, pero la US tiene problemas:

1. **Trazabilidad incorrecta**: cita `FR-VENDOR-006` (que es portfolio uploads), `BR-VENDOR-007` (suscripción simulada — irrelevante), `NFR-PERF-API-001` (no existe). Las correctas son **`FR-VENDOR-003`** (visibilidad de directorio sólo approved), **`FR-SERVICE-004`** (listado público de categorías activas), **`UC-VENDOR-006`** (ya correcto), **`BR-VENDOR-001`** (aprobación previa a visibilidad), **`NFR-PERF-001`**. El backlog item hereda los mismos IDs incorrectos en su traceability; documentar el alignment.
2. **Falta declarar `Backlog Item: PB-P1-028`**.
3. **Paginación**: Assumptions dice "cursor" sin shape. ¿`cursor` opaque base64 con `id` + `created_at`, o `offset` simple? Decisión necesaria.
4. **Ordenamiento**: no especificado. ¿Por relevancia, `created_at desc`, `rating_avg desc`?
5. **Filtros inválidos**: EC-01 dice "ignorada o 400" — ambiguo. PO debe decidir.
6. **Rango de precio**: no especifica si aplica a `vendor_services.base_price` (con `is_active=true`) o a algún otro campo. ¿Sólo perfiles que tengan al menos un servicio en el rango (D6 currency)?
7. **Currency en el filtro de precio**: ¿filtrar por servicios cuya `currency_code` coincide con el organizador, o ignorar moneda?
8. **AUTH-TS-02**: dice "Vendor → 200 sólo ve". Confusión con SEC-01 ("Organizer"). ¿Vendors autenticados también pueden buscar?
9. **`category` parametrización**: ¿se pasa `categoryId` (UUID) o `categoryCode` (slug)? El frontend ya usa filtros URL-friendly.
10. **`city` parametrización**: ¿`locationId` (UUID) o `cityCode`?
11. **Estado vacío "con sugerencias"**: la US menciona sugerencias sin definirlas; necesita aclaración.
12. **Servicios `is_active=true`**: la búsqueda debe excluir vendors cuyos servicios estén todos inactivos cuando filter por precio aplica.
13. **AC-01 demasiado lacónico**: no nombra response shape, paginación, ordenamiento.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                            | Impacto                                                                                                                                | Recomendación                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad estructuralmente incorrecta: `FR-VENDOR-006`, `BR-VENDOR-007`, `NFR-PERF-API-001` no aplican.                                                            | Trazabilidad rota.                                                                                                                     | Reemplazar por **`FR-VENDOR-003`, `FR-SERVICE-004`, `UC-VENDOR-006`, `BR-VENDOR-001`, `NFR-PERF-001`**.                                                                                                                                          |
| Alta      | Paginación sin especificar.                                                                                                                                       | Implementación arbitraria.                                                                                                            | Resolver Q1 (PO/Tech). Recomendado: cursor pagination con `cursor` opaque base64 (`{ created_at, id }`) + `limit` default 20, máx 50.                                                                                                          |
| Alta      | Ordenamiento sin especificar.                                                                                                                                       | Resultados no determinísticos.                                                                                                        | Resolver Q2 (PO). Recomendado: orden determinista por defecto `(rating_avg DESC NULLS LAST, created_at DESC, id DESC)` para tiebreak estable.                                                                                                  |
| Alta      | Política de filtros inválidos.                                                                                                                                     | Inconsistencia.                                                                                                                       | Resolver Q3 (PO). Recomendado: **strict** — filtros con valores inválidos (UUID/Code inexistente, rango invertido) ⇒ `400` con `details.invalid`. Filtros ausentes son OK; filtros vacíos son ignorados.                                       |
| Alta      | Definir si `priceMin`/`priceMax` aplica a `vendor_services.base_price` con `is_active=true` Y vendor `approved`.                                                     | Falta semántica de precio.                                                                                                            | Resolver Q4 (PO). Recomendado: el filtro de precio requiere que **al menos un `vendor_services` activo del vendor** caiga en `[priceMin, priceMax]`.                                                                                            |
| Alta      | Currency en filtro de precio.                                                                                                                                       | Filtro multi-currency ambiguo.                                                                                                        | Resolver Q5 (PO). Recomendado: `currency` es param requerido cuando se envía `priceMin` o `priceMax` (sin conversión automática en MVP, consistente con BR-BUDGET-007).                                                                       |
| Alta      | ¿Vendor autenticado puede buscar?                                                                                                                                  | Conflicto AUTH-TS-02 vs SEC-01.                                                                                                       | Resolver Q6 (PO). Recomendado: **sí** — `organizer`, `vendor` y `admin` autenticados pueden buscar (sólo lectura). Sin sesión ⇒ `401` (versión pública vive en US-046).                                                                       |
| Alta      | Shape de `category` y `city` (UUID vs Code).                                                                                                                       | Inconsistencia API.                                                                                                                   | Resolver Q7 (PO/Tech). Recomendado: usar **`categoryCode` (slug)** y **`locationCode` (slug)** en query params (más URL-friendly y SEO-friendly); backend resuelve internamente a IDs.                                                          |
| Alta      | "Estado vacío con sugerencias" sin definir.                                                                                                                       | Funcionalidad ambigua.                                                                                                                | Resolver Q8 (PO). Recomendado: **MVP no implementa sugerencias** — empty state genérico con CTA "Limpiar filtros". Sugerencias avanzadas son Future.                                                                                          |
| Media     | Falta declarar `Backlog Item: PB-P1-028`.                                                                                                                          | Trazabilidad incompleta.                                                                                                              | Añadir en Metadata.                                                                                                                                                                                                                            |
| Media     | AC-01 demasiado lacónico.                                                                                                                                          | AC subespecificado.                                                                                                                   | Reescribir con response shape, paginación y ordenamiento.                                                                                                                                                                                      |
| Media     | Currency Notes "Moneda del vendor" ambiguo.                                                                                                                         | UX inconsistente.                                                                                                                     | Aclarar: cada card muestra precio con su currency; el filtro requiere currency single.                                                                                                                                                          |
| Baja      | `Notes` plantea "considerar cache de búsqueda popular" — Future.                                                                                                    | Posible scope creep.                                                                                                                  | Mover a Out of Scope.                                                                                                                                                                                                                           |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                  |
| ------------------------------------ | --------- | --------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                  |
| No introduce contratos firmados      | Pass      | No aplica.                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                  |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                |
| Respeta backend como source of truth | Pass      | Query server-side.                                                          |
| Respeta seed/demo si aplica          | Pass      | Reuso del seed de US-040+044.                                               |
| No introduce RAG/vector DB           | Pass      | Full-text avanzado fuera de scope.                                          |
| No introduce multi-tenant enterprise | Pass      | N/A.                                                                         |
| No introduce P4/Future scope         | Pass      | Cache + geoespacial explícitos como Out of Scope.                          |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                                                            | Acción recomendada                                                                                                                                                                                                                                       |
| ----- | ------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail | No nombra response shape, paginación, ordenamiento, currency.                                  | Reescribir tras Q1–Q7 con response `{ items: [...], page: { cursor: string|null, limit: number, hasNext: boolean } }`.                                                                                                                              |
| AC-02 | Needs Detail | "Sugerencias" no definidas (Q8).                                                                | Tras Q8: empty state con CTA "Limpiar filtros" + texto i18n.                                                                                                                                                                                       |
| EC-01 | Needs Detail | Ambiguo "ignorada o 400".                                                                        | Tras Q3: filtros con valores inválidos ⇒ `400`. Filtros vacíos se ignoran.                                                                                                                                                                            |

Faltan AC para:
- Visibilidad: sólo perfiles `approved` Y `deleted_at IS NULL` (BR-VENDOR-001).
- Filtro de precio requiere currency (Q5).
- Pagina siguiente: cursor opaque (Q1).
- Sin sesión ⇒ `401` (Q6).

---

## 6. Gaps Detectados

### Producto / Negocio
- Faltan decisiones PO (Q1–Q8).

### Backend / API
- Query params shape (slug vs UUID).
- Performance: índices necesarios (categorías M:N, location, base_price).

### Frontend / UX
- URL state para filtros (deep linking).
- Empty state genérico.
- Card de vendor: campos mínimos (logo, name, location, rating, packages count, price range).

### Base de Datos
- Verificar índices: `idx_vendor_profiles_status_location` (parcial), `idx_vendor_services_active`, `idx_vendor_profile_categories_*`.
- Considerar índice compuesto para sort `(rating_avg, created_at, id)`.

### Seguridad / Autorización
- Aclarar Q6.

### IA / PromptOps
- No aplica.

### QA / Testing
- Añadir TS para perfiles `hidden`/`pending`/`rejected`/soft-deleted (no deben aparecer).
- Añadir NT para currency missing cuando hay rango de precio.
- Añadir TS para paginación (next page con cursor).

### Seed / Demo
- Reuso seed de US-040 + US-044 (vendors aprobados con servicios variados).

### Documentación / Trazabilidad
- Corregir FR/BR/NFR.
- Documentar endpoint en `docs/16 §M07`.

---

## 7. Preguntas Pendientes

| Tipo     | Pregunta                                                                                                                                                                                                                                          | Bloquea aprobación | Responsable |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| PO/Tech  | **Q1** — Paginación. Recomendado: cursor opaque base64 `{ created_at, id }` + `limit` default 20, máx 50.                                                                                                                                       | Sí                 | PO/Tech     |
| PO       | **Q2** — Ordenamiento default. Recomendado: `(rating_avg DESC NULLS LAST, created_at DESC, id DESC)`.                                                                                                                                          | Sí                 | PO          |
| PO       | **Q3** — Filtros inválidos. Recomendado: strict — valores inválidos ⇒ `400`; ausentes/vacíos ⇒ ignorados.                                                                                                                                       | Sí                 | PO          |
| PO       | **Q4** — Semántica del filtro de precio. Recomendado: requiere que al menos un `vendor_services` activo caiga en `[priceMin, priceMax]`.                                                                                                          | Sí                 | PO          |
| PO       | **Q5** — Currency en filtro de precio. Recomendado: `currency` requerido si se envía `priceMin`/`priceMax`; sin conversión automática.                                                                                                            | Sí                 | PO          |
| PO       | **Q6** — Rol autorizado. Recomendado: organizer, vendor y admin autenticados pueden buscar (sólo lectura). Sin sesión ⇒ `401`.                                                                                                                  | Sí                 | PO          |
| PO/Tech  | **Q7** — Shape de query params. Recomendado: `categoryCode` (slug) y `locationCode` (slug); backend resuelve a IDs.                                                                                                                              | Sí                 | PO/Tech     |
| PO       | **Q8** — Empty state con "sugerencias". Recomendado: MVP no implementa sugerencias; empty state genérico con CTA "Limpiar filtros".                                                                                                              | Sí                 | PO          |

---

## 8. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                                                                  | Decisión vigente                                                              | Acción recomendada                                                                                                                       | ¿Bloquea aprobación? |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-VENDOR-003/SERVICE-004` | La US cita `FR-VENDOR-006`.                                                                                          | Trazabilidad corregida.                                                       | Housekeeping en US.                                                                                                                       | No                   |
| `docs/4 §BR-VENDOR-001`         | La US cita `BR-VENDOR-007` (suscripción simulada).                                                                   | Trazabilidad corregida.                                                       | Housekeeping en US.                                                                                                                       | No                   |
| `docs/10 §NFR-PERF-001`         | `NFR-PERF-API-001` no existe.                                                                                        | Trazabilidad corregida.                                                       | Housekeeping en US.                                                                                                                       | No                   |
| PB-P1-028 Traceability          | El backlog item cita `FR-VENDOR-006 · BR-VENDOR-007` (incorrectos).                                                  | Trazabilidad real: `FR-VENDOR-003, FR-SERVICE-004, UC-VENDOR-006, BR-VENDOR-001`. | Housekeeping en el backlog tras D-correction.                                                                                              | No                   |
| `docs/16 §M07`                  | Falta documentar el endpoint con query params, response shape, error codes.                                          | Documentar tras Q1–Q7.                                                        | Actualizar `docs/16`.                                                                                                                       | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | `management/user-stories/US-045-search-vendors.md`                                    |
| User Story ID verified                     | Yes                                                                                   |
| Decision Resolution artifact found         | No                                                                                    |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-045-decision-resolution.md`          |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-045-refinement-review.md`              |
| Final recommended status                   | Needs Refinement                                                                      |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                   |
| Reason                                     | 8 decisiones PO/Tech bloqueantes + trazabilidad estructuralmente incorrecta.          |

---

## 10. Cambios Aplicados o Recomendados

### Metadata
- `Backlog Item: PB-P1-028`.
- `Status: Ready for Approval`.

### Business Context
- Aclaración: query con cursor pagination, ordenamiento estable, sólo perfiles `approved` + `deleted_at IS NULL`.

### PO/BA Decisions Applied
- Sección con D1–D8.

### Traceability
- Corregir FR/BR/NFR.

### Acceptance Criteria
- Reescribir AC-01/02, añadir AC para paginación + auth.

### Technical Notes
- Backend: query con joins; índices.

### QA Notes
- Añadir TS visibilidad y paginación.

### Definition of Ready
- `PO/BA validó` ✅.

### Definition of Done
- Performance < 1s p95, índices, i18n.

### Notes
- Mover cache a Out of Scope.

---

## 11. Recomendación Final

`Needs Refinement`.

US-045 requiere resolución explícita de ocho decisiones PO/Tech y corrección estructural de trazabilidad antes de aprobación.

```text
User Story file updated: No
Path: management/user-stories/US-045-search-vendors.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-045-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
