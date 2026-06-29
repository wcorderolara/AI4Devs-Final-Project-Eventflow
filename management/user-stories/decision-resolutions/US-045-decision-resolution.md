# PO/BA Decision Resolution — US-045

## Source User Story File
management/user-stories/US-045-search-vendors.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-045-refinement-review.md

## Decision Date
2026-06-27

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| User Story ID                                | US-045                                                                           |
| User Story file path                         | management/user-stories/US-045-search-vendors.md                                 |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-045-refinement-review.md           |
| Existing decision resolution found           | No                                                                               |
| Backlog Item                                 | PB-P1-028 — Búsqueda de directorio de proveedores (organizer)                   |
| Epic                                         | EPIC-VND-001                                                                     |
| Estado antes de decisiones                   | Needs Refinement                                                                 |
| Cantidad de preguntas revisadas              | 8 (Q1–Q8)                                                                        |
| Decisiones PO/BA tomadas                     | 8                                                                                |
| Decisiones técnicas recomendadas             | 0 (todas derivadas de docs y patrones)                                           |
| ¿Desbloquea aprobación?                      | Sí                                                                               |
| User Story file updated                      | Yes                                                                              |
| Decision Resolution artifact created/updated | Yes                                                                              |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-045-decision-resolution.md       |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — Paginación cursor

### Pregunta original

> Paginación.

### Respuesta PO/BA

Cursor opaque base64 + `limit`.

### Decisión formal

```text
Paginación cursor con `cursor` opaque base64-encoded `{ created_at, id }`. Query param `cursor` (opcional) y `limit` (default 20, máx 50). Response: `{ items: [...], page: { cursor: string|null, limit: number, hasNext: boolean } }`. `cursor=null` indica fin de paginación.
```

### Rationale

Cursor pagination ofrece consistencia bajo concurrencia (inserts no reordenan páginas). Base64 protege la opacidad. `limit` máx 50 protege contra DoS.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D1.                                              |
| Acceptance Criteria     | AC para paginación.                                     |
| Technical Notes         | Backend: helper `encodeCursor/decodeCursor`.            |
| API                     | Query params documentados.                              |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — Ordenamiento default

### Pregunta original

> Ordenamiento default.

### Respuesta PO/BA

`(rating_avg DESC NULLS LAST, created_at DESC, id DESC)`.

### Decisión formal

```text
Orden default: `ORDER BY rating_avg DESC NULLS LAST, created_at DESC, id DESC`. Determinista, estable bajo paginación cursor. Sin override de orden en MVP (param `sort` queda Future).
```

### Rationale

Prioriza vendors con mejor rating (UX); `created_at` es secondary tiebreak (vendors nuevos antes que viejos en empates); `id` garantiza determinismo absoluto.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D2.                                              |
| Acceptance Criteria     | AC explicita el orden.                                  |
| Technical Notes         | Backend: índice compuesto sugerido.                     |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 3 — Política de filtros inválidos

### Pregunta original

> Filtros inválidos.

### Respuesta PO/BA

**Strict** — valores inválidos ⇒ `400`; ausentes/vacíos ⇒ ignorados.

### Decisión formal

```text
Filtros con valores inválidos (UUID malformado, code inexistente, `priceMin > priceMax`, etc.) ⇒ `400 INVALID_FILTERS` con `details.invalid: [...]`. Filtros ausentes o con string vacío se ignoran silenciosamente.
```

### Rationale

Strict reduce errores silenciosos. Ausente=ignorar permite UX limpia (clear filter sin error).

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D3.                                              |
| Acceptance Criteria     | EC reescrito.                                           |
| Validation Rules        | VR-02..VR-04.                                            |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 4 — Semántica del filtro de precio

### Pregunta original

> Semántica del filtro de precio.

### Respuesta PO/BA

Requiere al menos un `vendor_services` activo en `[priceMin, priceMax]`.

### Decisión formal

```text
El filtro `priceMin`/`priceMax` se aplica a `vendor_services.base_price` donde `vendor_services.is_active=true` Y `vendor_services.vendor_profile_id = vendor_profile.id`. El vendor aparece en resultados si **al menos un servicio activo** cae en el rango (semántica EXISTS, no AVG).
```

### Rationale

EXISTS es semánticamente claro (¿hay un servicio en mi presupuesto?) y eficiente con el índice `idx_vendor_services_active`.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D4.                                              |
| Acceptance Criteria     | AC explicita la semántica.                              |
| Technical Notes         | Query SQL con EXISTS subquery.                          |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 5 — Currency en filtro de precio

### Pregunta original

> Currency en filtro de precio.

### Respuesta PO/BA

`currency` requerido cuando se envía `priceMin`/`priceMax`; sin conversión automática.

### Decisión formal

```text
Si la query incluye `priceMin` o `priceMax`, también debe incluir `currency` (enum del schema). Ausente ⇒ `400 INVALID_FILTERS` con `details.invalid: ['currency_required_with_price']`. El filtro de precio aplica solo a `vendor_services.currency_code = ?currency`. Sin conversión automática (BR-BUDGET-007).
```

### Rationale

Sin conversión automática evita ambigüedades y se mantiene consistente con la política multi-currency de EventFlow.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D5.                                              |
| Validation Rules        | VR currency.                                            |
| Acceptance Criteria     | AC currency.                                            |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 6 — Rol autorizado

### Pregunta original

> Rol autorizado.

### Respuesta PO/BA

Todos los roles autenticados (`organizer`, `vendor`, `admin`) pueden buscar (sólo lectura). Sin sesión ⇒ `401`.

### Decisión formal

```text
`GET /api/v1/vendors` requiere sesión válida. Roles permitidos: `organizer`, `vendor`, `admin`. Sin sesión ⇒ `401`. Vendor autenticado puede ver otros vendors pero no a sí mismo en la lista (`WHERE vendor_user_id != currentUser.id` cuando rol es vendor). Versión pública anónima vive en US-046 (perfil individual SEO).
```

### Rationale

Permitir vendor consultar competencia es útil para benchmarking. Excluir self-listing evita confusión. Admin necesita acceso para soporte.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D6.                                              |
| Authorization & Security| Roles permitidos.                                       |
| Test Scenarios          | AUTH-TS reescrito.                                      |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 7 — Shape de query params

### Pregunta original

> Shape de `category` y `city`.

### Respuesta PO/BA

`categoryCode` (slug) y `locationCode` (slug); backend resuelve a IDs.

### Decisión formal

```text
Query params: `categoryCode` (slug de `service_categories.code`), `locationCode` (slug de `locations.code`). `priceMin`, `priceMax` (decimales 14,2), `currency` (enum), `cursor` (opaque base64), `limit` (1..50). Backend resuelve `categoryCode` y `locationCode` a IDs; valores inexistentes ⇒ `400 INVALID_FILTERS`.
```

### Rationale

Slugs son URL-friendly y deep-link-friendly. Backend protege contra IDs filtrados.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D7.                                              |
| API                     | Query params documentados.                              |
| Technical Notes         | Backend resuelve slugs.                                 |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 8 — Empty state sin sugerencias

### Pregunta original

> Empty state con "sugerencias".

### Respuesta PO/BA

MVP no implementa sugerencias; empty state genérico.

### Decisión formal

```text
Empty state: cuando la query retorna `items.length === 0`, frontend muestra mensaje i18n genérico ("No encontramos proveedores con esos filtros") + CTA "Limpiar filtros". Sugerencias automáticas (ciudades cercanas, categorías similares) son Future.
```

### Rationale

Mantiene MVP scope. Sugerencias requerirían embeddings o reglas heurísticas no aprobadas.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D8.                                              |
| Acceptance Criteria     | AC-02 reescrito.                                        |
| UX / UI                 | Empty state simple.                                     |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                              | Decisión                                                                                                                                                          | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- | -------------------- |
|  1 | Paginación                         | Cursor opaque base64 `{ created_at, id }` + `limit` default 20, máx 50.                                                                                          | PO/Tech | Sí                     | No                   |
|  2 | Ordenamiento                       | `rating_avg DESC NULLS LAST, created_at DESC, id DESC`.                                                                                                          | PO      | Sí                     | No                   |
|  3 | Filtros inválidos                  | Strict; inválidos ⇒ `400 INVALID_FILTERS`; ausentes/vacíos ignorados.                                                                                            | PO      | Sí                     | No                   |
|  4 | Semántica precio                   | EXISTS sobre `vendor_services` activos en rango.                                                                                                                 | PO      | Sí                     | No                   |
|  5 | Currency                           | `currency` requerido con precio; sin conversión.                                                                                                                 | PO      | Sí                     | No                   |
|  6 | Roles autorizados                  | `organizer`/`vendor`/`admin` autenticados; vendor no se ve a sí mismo; sin sesión ⇒ `401`.                                                                       | PO      | Sí                     | No                   |
|  7 | Shape query                        | `categoryCode`, `locationCode` (slugs); backend resuelve a IDs.                                                                                                  | PO/Tech | Sí                     | No                   |
|  8 | Empty state                        | Mensaje genérico + CTA "Limpiar filtros"; sin sugerencias en MVP.                                                                                                | PO      | Sí                     | No                   |

---

## 4. Cambios Aplicados a la User Story

### Metadata
- `Backlog Item: PB-P1-028`. `Status: Ready for Approval`. `Last Updated: 2026-06-27`.

### Business Context
- Aclaración de cursor pagination + ordenamiento + EXISTS para precio.

### PO/BA Decisions Applied
- D1–D8.

### Traceability
- `FR-VENDOR-006` → `FR-VENDOR-003, FR-SERVICE-004`.
- `BR-VENDOR-007` → `BR-VENDOR-001`.
- `NFR-PERF-API-001` → `NFR-PERF-001`.

### Acceptance Criteria
- Reescritos AC-01/02 + nuevos AC-03 (auth), AC-04 (paginación).

### Technical Notes
- Backend: helper cursor, query SQL con joins + EXISTS, índice compuesto.

### QA Notes
- TS visibilidad por status + paginación + filtros inválidos.

### Definition of Ready
- `PO/BA validó` ✅.

### Definition of Done
- Performance < 1s p95, índices, i18n, accesibilidad.

### Notes
- Mover cache a Out of Scope.

---

## 5. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                          | Decisión vigente                       | Acción recomendada                                                | ¿Bloquea aprobación? |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-VENDOR-003`         | La US citaba `FR-VENDOR-006`.                                                | Trazabilidad corregida.                | Housekeeping cerrado.                                              | No                   |
| `docs/4 §BR-VENDOR-001`         | La US citaba `BR-VENDOR-007`.                                                | Trazabilidad corregida.                | Housekeeping cerrado.                                              | No                   |
| `docs/10 §NFR-PERF-001`         | `NFR-PERF-API-001` no existe.                                                | Trazabilidad corregida.                | Housekeeping cerrado.                                              | No                   |
| PB-P1-028 Traceability          | El backlog item hereda IDs incorrectos.                                       | Trazabilidad real registrada en US.    | Housekeeping del backlog item.                                     | No                   |
| `docs/16 §M07`                  | Falta documentar el endpoint.                                                | Documentar.                            | Actualizar `docs/16`.                                              | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                |
| User Story file path                         | `management/user-stories/US-045-search-vendors.md`                                 |
| Decision Resolution artifact created/updated | Yes                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-045-decision-resolution.md`       |
| New User Story status                        | Ready for Approval                                                                 |
| Remaining blockers                           | No                                                                                 |
| Reason                                       | 8/8 decisiones PO formalizadas y aplicadas.                                        |

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

```text
User Story file updated: Yes
Path: management/user-stories/US-045-search-vendors.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-045-decision-resolution.md
Next step: Run `eventflow-user-story-approval`.
```
