# PO/BA Decision Resolution — US-044

## Source User Story File
management/user-stories/US-044-manage-vendor-services.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-044-refinement-review.md

## Decision Date
2026-06-27

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| User Story ID                                | US-044                                                                           |
| User Story file path                         | management/user-stories/US-044-manage-vendor-services.md                         |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-044-refinement-review.md           |
| Existing decision resolution found           | No                                                                               |
| Backlog Item                                 | PB-P1-027 — VendorService (paquetes)                                            |
| Epic                                         | EPIC-VND-001                                                                     |
| Estado antes de decisiones                   | Needs Refinement                                                                 |
| Cantidad de preguntas revisadas              | 6 (Q1–Q6)                                                                        |
| Decisiones PO/BA tomadas                     | 6                                                                                |
| Decisiones técnicas recomendadas             | 0 (derivadas de docs aprobados)                                                  |
| ¿Desbloquea aprobación?                      | Sí                                                                               |
| User Story file updated                      | Yes                                                                              |
| Decision Resolution artifact created/updated | Yes                                                                              |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-044-decision-resolution.md       |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — Política por status del `VendorProfile`

### Pregunta original

> Política por status del `VendorProfile`.

### Respuesta PO/BA

* CRUD permitido en `pending`/`approved`/`rejected`.
* Bloqueado en `hidden` ⇒ `409 PROFILE_HIDDEN`.
* Soft-deleted del perfil ⇒ `404`.
* **Visibilidad pública** sólo cuando `vendor_services.is_active=true` AND `vendor_profile.status='approved'` AND `vendor_profile.deleted_at IS NULL`.

### Decisión formal

```text
Los endpoints `GET/POST/PATCH/DELETE /api/v1/vendors/me/services[/:id]` están permitidos cuando `vendor_profile.status ∈ {pending, approved, rejected}` y `deleted_at IS NULL`. Bloqueado con `409 PROFILE_HIDDEN` en `hidden` y con `404` si el perfil está soft-deleted. El directorio público sólo expone servicios con `is_active=true` AND perfil `approved` AND `deleted_at IS NULL` (BR-SERVICE-001).
```

### Rationale

Consistente con US-041/US-042/US-043. Permite al vendor preparar su catálogo antes de aprobación admin sin exponerlo públicamente hasta que el perfil sea `approved`.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D1.                                              |
| Acceptance Criteria     | EC para hidden + soft-deleted del perfil + visibilidad. |
| Authorization & Security| SEC política por status.                                |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — Soft delete via `is_active=false`

### Pregunta original

> Soft delete.

### Respuesta PO/BA

DELETE setea `is_active=false`. Hard delete prohibido en MVP. PATCH permite reactivar con `{ "is_active": true }`.

### Decisión formal

```text
`DELETE /api/v1/vendors/me/services/:id` ejecuta soft delete vía `vendor_services.is_active=false`. Responde `204 No Content`. Hard delete no se expone en MVP. La reactivación se realiza vía `PATCH /api/v1/vendors/me/services/:id` con `{ "is_active": true }`.
```

### Rationale

Schema `docs/18 §15.2` modela soft delete con `is_active` (no `deleted_at`). Permite reactivar y mantiene historial referencial para QuoteRequests/Quotes pasados.

### Impacto en la User Story

| Sección                 | Cambio requerido                                              |
| ----------------------- | ------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D2.                                                     |
| Acceptance Criteria     | AC para DELETE soft + reactivación vía PATCH.                  |
| Technical Notes         | Backend: UPDATE único; sin migración.                          |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 3 — Endpoint GET

### Pregunta original

> Endpoint GET.

### Respuesta PO/BA

`GET /api/v1/vendors/me/services` retorna todos los servicios del vendor (incluyendo `is_active=false`) ordenados por `created_at desc`. Sin paginación MVP.

### Decisión formal

```text
`GET /api/v1/vendors/me/services` retorna `{ items: VendorService[] }` con todos los servicios del vendor autenticado (activos e inactivos), ordenados por `created_at desc`. Sin paginación en MVP. El directorio público usa endpoints separados (US-045).
```

### Rationale

El vendor necesita ver tanto activos como inactivos para gestionarlos. Sin paginación porque el tope (D5) de 50 hace innecesaria la paginación inicial.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D3.                                              |
| Acceptance Criteria     | AC para GET.                                            |
| API                     | Endpoint GET documentado.                               |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 4 — Validación de `currency_code`

### Pregunta original

> Validación de `currency_code`.

### Respuesta PO/BA

Validar contra el enum del proyecto. Set mínimo: `GTQ`, `EUR`, `MXN`, `COP`, `USD`. `currency_code` requerido en POST; opcional en PATCH.

### Decisión formal

```text
`currency_code` es requerido en POST y opcional en PATCH. Se valida contra el enum `currency_code` del schema (incluye `GTQ`, `EUR`, `MXN`, `COP`, `USD` como mínimo). Inválido ⇒ `400 INVALID_CURRENCY`.
```

### Rationale

`docs/18 §15.2` muestra que `currency_code` vive en `vendor_services` directamente (cada paquete su moneda). Esto permite a vendors multi-mercado configurar precios en distintas monedas.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D4.                                              |
| Validation Rules        | VR-04 currency.                                         |
| Acceptance Criteria     | EC currency inválida.                                   |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 5 — Tope de `VendorService` por vendor

### Pregunta original

> Tope de servicios por vendor.

### Respuesta PO/BA

**Máximo 50 servicios activos por vendor**.

### Decisión formal

```text
El backend valida `COUNT(*) WHERE vendor_profile_id = ? AND is_active = true < 50` antes de crear un nuevo servicio o reactivar uno inactivo. Excedido ⇒ `409 SERVICE_LIMIT_REACHED`. Servicios inactivos no cuentan.
```

### Rationale

Cap defensivo previene spam de catálogo y mantiene la UI manejable sin paginación. 50 es generoso para un vendor MVP.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D5.                                              |
| Acceptance Criteria     | EC tope alcanzado.                                      |
| Validation Rules        | VR-05 tope.                                             |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 6 — Longitudes de `package_name` y `description`

### Pregunta original

> Longitudes.

### Respuesta PO/BA

`package_name`: 2..150 chars. `description`: 10..2000 chars.

### Decisión formal

```text
`package_name` ∈ `[2..150]` caracteres (trim previo). `description` ∈ `[10..2000]` caracteres. Inválido ⇒ `400 INVALID_PACKAGE_NAME` o `400 INVALID_DESCRIPTION`.
```

### Rationale

`package_name` 2..150 alinea con `business_name` de US-041. `description` 10..2000 permite suficiente detalle sin ser abusivo.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D6.                                              |
| Validation Rules        | VR-01, VR-06.                                            |
| Acceptance Criteria     | EC longitudes.                                          |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                              | Decisión                                                                                                                                                          | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- | -------------------- |
|  1 | Política por status                | CRUD permitido en `pending`/`approved`/`rejected`; `hidden` `409`; soft-deleted del perfil `404`. Visibilidad pública sólo si `is_active=true` Y `status='approved'`. | PO      | Sí                     | No                   |
|  2 | Soft delete via `is_active=false`  | DELETE setea flag; PATCH permite reactivar; hard delete prohibido.                                                                                                | PO      | Sí                     | No                   |
|  3 | Endpoint GET                       | `GET /api/v1/vendors/me/services` (todos los servicios del vendor, sin paginación MVP, orden `created_at desc`).                                                  | PO/Tech | Sí                     | No                   |
|  4 | `currency_code`                    | Requerido en POST; enum `GTQ/EUR/MXN/COP/USD` mínimo; inválido ⇒ `400 INVALID_CURRENCY`.                                                                          | PO      | Sí                     | No                   |
|  5 | Tope                                | 50 activos por vendor; excedido ⇒ `409 SERVICE_LIMIT_REACHED`; inactivos no cuentan.                                                                              | PO      | Sí                     | No                   |
|  6 | Longitudes                          | `package_name 2..150`, `description 10..2000`.                                                                                                                    | PO/BA   | Sí                     | No                   |

---

## 4. Cambios Aplicados a la User Story

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
- `BR-VENDOR-006` → `BR-SERVICE-001, BR-SERVICE-002, BR-SERVICE-006, BR-SERVICE-003`.
- `NFR-PERF-API-001` → `NFR-PERF-001` + `NFR-OBS-005`.

### Acceptance Criteria
- AC-01a (POST `201`), AC-01b (PATCH `200`), AC-01c (DELETE soft `204`), AC-01d (GET `200`).
- Múltiples EC.

### Technical Notes
- 4 use cases. UPDATE para soft delete (TOCTOU-safe).

### QA Notes
- TS visibilidad pública.

### Definition of Ready
- `PO/BA validó` ✅.

### Definition of Done
- 4 endpoints, log, i18n, accesibilidad.

### Notes
- Eliminadas dudas resueltas.

---

## 5. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                          | Decisión vigente                       | Acción recomendada                                                | ¿Bloquea aprobación? |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-VENDOR-009`         | La US citaba `FR-VENDOR-005`.                                                | Trazabilidad corregida.                | Housekeeping cerrado.                                              | No                   |
| `docs/8 §UC-VENDOR-004`         | La US citaba `UC-VENDOR-005`.                                                | Trazabilidad corregida.                | Housekeeping cerrado.                                              | No                   |
| `docs/4 §BR-SERVICE-*`          | La US citaba `BR-VENDOR-006`.                                                | Trazabilidad corregida.                | Housekeeping cerrado.                                              | No                   |
| `docs/10 §NFR-PERF-001`         | `NFR-PERF-API-001` no existe.                                                | Trazabilidad corregida.                | Housekeeping cerrado.                                              | No                   |
| `docs/16 §M07`                  | Falta documentar 4 endpoints.                                                | Documentar.                            | Actualizar `docs/16`.                                              | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                |
| User Story file path                         | `management/user-stories/US-044-manage-vendor-services.md`                         |
| Decision Resolution artifact created/updated | Yes                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-044-decision-resolution.md`       |
| New User Story status                        | Ready for Approval                                                                 |
| Remaining blockers                           | No                                                                                 |
| Reason                                       | 6/6 decisiones PO formalizadas y aplicadas.                                        |

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
Path: management/user-stories/US-044-manage-vendor-services.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-044-decision-resolution.md
Next step: Run `eventflow-user-story-approval` (o revalidación con `eventflow-user-story-refinement`).
```
