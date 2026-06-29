# PO/BA Decision Resolution — US-046

## Source User Story File
management/user-stories/US-046-public-vendor-profile-seo.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-046-refinement-review.md

## Decision Date
2026-06-27

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| User Story ID                                | US-046                                                                           |
| User Story file path                         | management/user-stories/US-046-public-vendor-profile-seo.md                      |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-046-refinement-review.md           |
| Existing decision resolution found           | No                                                                               |
| Backlog Item                                 | PB-P1-029 — Perfil público SEO del vendor                                       |
| Epic                                         | EPIC-VND-001                                                                     |
| Estado antes de decisiones                   | Needs Refinement                                                                 |
| Cantidad de preguntas revisadas              | 7 (Q1–Q7)                                                                        |
| Decisiones PO/BA tomadas                     | 7                                                                                |
| Decisiones técnicas recomendadas             | 0 (todas derivadas de `docs/15 §14/§30/§37` y patrones EventFlow)                |
| ¿Desbloquea aprobación?                      | Sí                                                                               |
| User Story file updated                      | Yes                                                                              |
| Decision Resolution artifact created/updated | Yes                                                                              |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-046-decision-resolution.md       |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — Lista de campos públicos

### Pregunta original

> Lista campos públicos vs privados.

### Respuesta PO/BA

**Públicos**: `slug`, `business_name`, `bio`, `location` (display + code), `categories[]` (códigos + nombres i18n), `rating_avg`, `reviews_count`, `packages[]` (`package_name`, `base_price`, `currency_code`, `description`, `service_category_code`), `portfolio[]` (`work_label`, thumbnails `storage_url` o derivado), `reviews[]` (`rating`, `comment`, `created_at`, `reviewer_display_name`).

**Privados** (nunca expuestos): `email`, `phone`, `vendor_user_id`, `category_change_count`, `last_category_change_at`, `requires_admin_review`, `ai_generated_*` flags, `created_at`/`updated_at` internos, IDs de relaciones (excepto cuando son slugs públicos), `is_seed`, `deleted_by`.

### Decisión formal

```text
El endpoint `GET /api/v1/public/vendors/:slug` retorna sólo la lista de campos públicos enumerada en D1. Campos privados nunca aparecen en el payload. El mapper público es explícito (whitelist), no implícito (blacklist).
```

### Rationale

Whitelist explícita previene leaks accidentales al evolucionar el schema. Permite SEO sin exponer PII.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D1.                                              |
| Acceptance Criteria     | AC con response shape.                                  |
| Authorization & Security| SEC explícita whitelist.                                |
| API                     | Response shape documentado.                             |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — JSON-LD schema.org in scope MVP

### Pregunta original

> JSON-LD.

### Respuesta PO/BA

**In scope MVP**. Tipo `LocalBusiness` (per `docs/15 §14.2`).

### Decisión formal

```text
La página renderiza un bloque `<script type="application/ld+json">` con schema.org `LocalBusiness` que incluye al menos: `@context`, `@type`, `name`, `description`, `image` (primera del portfolio si existe), `address` (location), `aggregateRating` (rating_avg + reviews_count si reviews_count > 0), `url` canónica. Sin campos opcionales (`telephone`, `priceRange` valuable pero sensitive — Future).
```

### Rationale

`docs/15 §14.2` lista JSON-LD `LocalBusiness` como Should Have MVP. Permite rich snippets en Google.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D2.                                              |
| Acceptance Criteria     | AC para JSON-LD.                                        |
| Technical Notes         | Frontend: `generateMetadata` + JSON-LD inline.          |
| Scope Guardrails        | Mover de Future a In Scope.                              |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 3 — URL sin prefijo de locale

### Pregunta original

> Estructura URL.

### Respuesta PO/BA

URL canónica sin prefijo de locale: `/vendors/:slug`. Locale resuelto por cookie/header (consistente con `docs/15 §30.5`).

### Decisión formal

```text
La URL canónica del perfil público es `/vendors/:slug` (sin segmento `[locale]`). El layout de Next.js detecta locale por cookie `NEXT_LOCALE` o `Accept-Language` header. La página renderiza UI en el locale detectado pero el contenido SEO (metadata, JSON-LD) se mantiene en el locale canónico del vendor (por default `es-LATAM`; configurable por vendor en Future). `<link rel="alternate" hreflang="..." href="...">` placeholders preparados para SEO localizado completo (Future, `docs/15 §31.5`).
```

### Rationale

Evita fragmentación SEO. `docs/15` lo formaliza.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D3.                                              |
| UX / UI                 | Route corregida.                                        |
| Acceptance Criteria     | AC URL.                                                 |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 4 — Caching strategy

### Pregunta original

> Caching.

### Respuesta PO/BA

ISR con `revalidate: 300` (5 minutos). `Cache-Control: public, max-age=60, stale-while-revalidate=300` en el endpoint API público.

### Decisión formal

```text
La page usa Next.js ISR con `export const revalidate = 300`. El endpoint `GET /api/v1/public/vendors/:slug` retorna headers `Cache-Control: public, max-age=60, stale-while-revalidate=300`. Invalidación on-demand al editar perfil (vía `revalidatePath('/vendors/:slug')`) queda como Future no bloqueante (será US complementaria al panel del vendor).
```

### Rationale

ISR balancea freshness vs performance. `stale-while-revalidate` permite respuestas instantáneas mientras se regenera.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D4.                                              |
| Acceptance Criteria     | AC para cache headers.                                  |
| Technical Notes         | Frontend ISR + Backend Cache-Control.                   |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 5 — Reviews públicas en SSR

### Pregunta original

> Reviews públicas.

### Respuesta PO/BA

SSR muestra **primeras 10 reviews `published` ordenadas por `created_at DESC`**. Paginación "Ver más" queda Future.

### Decisión formal

```text
El endpoint público incluye `reviews[]` con máximo 10 entradas, filtradas por `status='published'`, ordenadas `created_at DESC`. Si hay más de 10, el campo `reviews_total_published` indica el total para que la UI muestre "10 de N". Paginación adicional queda Future.
```

### Rationale

10 es suficiente para SEO y demo sin SSR pesado.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D5.                                              |
| Acceptance Criteria     | AC para reviews.                                        |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 6 — Vendor soft-deleted y hidden

### Pregunta original

> Vendor con `deleted_at IS NOT NULL`.

### Respuesta PO/BA

`404` consistente para `status ∈ {pending, rejected, hidden}` Y `deleted_at IS NOT NULL`. Sólo `status='approved'` AND `deleted_at IS NULL` retorna `200`.

### Decisión formal

```text
El endpoint responde `200` SOLO cuando `vendor_profile.status='approved'` AND `vendor_profile.deleted_at IS NULL`. Cualquier otro estado (`pending`, `rejected`, `hidden`, soft-deleted) ⇒ `404 VENDOR_NOT_FOUND`. Mismo trato para slug inexistente. Sin distinción para evitar information leakage.
```

### Rationale

Consistente con US-041/US-042/US-043/US-044/US-045. Idempotencia perceptual.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D6.                                              |
| Acceptance Criteria     | AC-02 reescrito; EC-01 reescrito.                      |
| Validation Rules        | VR-01 actualizado.                                      |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 7 — Rate limiting endpoint público

### Pregunta original

> Rate limiting.

### Respuesta PO/BA

**60 req/min por IP** para `/api/v1/public/vendors/:slug` usando middleware de `PB-P0-007`.

### Decisión formal

```text
El endpoint `GET /api/v1/public/vendors/:slug` aplica rate limit `60 req/min` por IP (clave `public:vendor_profile`). Excedido ⇒ `429 Too Many Requests` con `Retry-After` header. Reuso del middleware de `PB-P0-007` (Rate Limiting & Middleware Chain).
```

### Rationale

Sin sesión, los endpoints públicos son blanco fácil de scraping/DoS. 60 req/min es generoso para usuarios reales y restrictivo para scrapers agresivos.

### Impacto en la User Story

| Sección                 | Cambio requerido                                       |
| ----------------------- | ------------------------------------------------------ |
| PO/BA Decisions Applied | Añadir D7.                                              |
| Authorization & Security| SEC rate limit.                                         |
| Acceptance Criteria     | AC para `429`.                                          |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                              | Decisión                                                                                                                                                          | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- | -------------------- |
|  1 | Campos públicos                    | Whitelist explícita (slug, business_name, bio, location, categories, rating_avg, reviews_count, packages, portfolio thumbnails, reviews published). Privados nunca expuestos. | PO      | Sí                     | No                   |
|  2 | JSON-LD                            | In scope MVP — `LocalBusiness`.                                                                                                                                  | PO      | Sí                     | No                   |
|  3 | URL                                | `/vendors/:slug` sin prefijo locale.                                                                                                                              | PO/Tech | Sí                     | No                   |
|  4 | Caching                            | ISR revalidate=300; Cache-Control public max-age=60 swr=300.                                                                                                      | PO/Tech | Sí                     | No                   |
|  5 | Reviews                            | Primeras 10 published, `created_at DESC`; total en `reviews_total_published`.                                                                                    | PO      | Sí                     | No                   |
|  6 | Vendor soft-deleted/hidden         | Sólo `approved` + `deleted_at IS NULL` retorna `200`; resto `404 VENDOR_NOT_FOUND`.                                                                              | PO      | Sí                     | No                   |
|  7 | Rate limiting                      | `60 req/min` por IP; reuso middleware PB-P0-007.                                                                                                                 | PO/Sec  | Sí                     | No                   |

---

## 4. Cambios Aplicados a la User Story

### Metadata
- `Backlog Item: PB-P1-029`. `Status: Ready for Approval`. `Last Updated: 2026-06-27`.

### Business Context
- Aclaración SSR + ISR + JSON-LD + endpoint público con rate limit.

### PO/BA Decisions Applied
- D1–D7.

### Traceability
- `FR-VENDOR-007` → `FR-VENDOR-003, FR-REVIEW-006, FR-SERVICE-004`.
- `UC-VENDOR-007` → `UC-VENDOR-006`.
- `BR-VENDOR-008` → `BR-VENDOR-001, BR-REVIEW-004`.
- `NFR-PERF-WEB-001` → `NFR-PERF-001`.

### Acceptance Criteria
- Reescribir AC-01/02, EC-01 + nuevos AC para JSON-LD, cache, rate limit, reviews.

### Technical Notes
- Backend: endpoint público con rate limit + cache headers + whitelist mapper.
- Frontend: `generateMetadata` + JSON-LD + ISR.

### QA Notes
- TS metadata + JSON-LD + cache + rate limit.

### Definition of Ready
- `PO/BA validó` ✅.

### Definition of Done
- JSON-LD válido, cache headers, rate limit, i18n.

### Notes
- Mover JSON-LD a in scope.

---

## 5. Documentation Alignment Required

Ver §8 del refinement review (todas no bloqueantes).

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                |
| User Story file path                         | `management/user-stories/US-046-public-vendor-profile-seo.md`                      |
| Decision Resolution artifact created/updated | Yes                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-046-decision-resolution.md`       |
| New User Story status                        | Ready for Approval                                                                 |
| Remaining blockers                           | No                                                                                 |
| Reason                                       | 7/7 decisiones PO formalizadas.                                                    |

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
Path: management/user-stories/US-046-public-vendor-profile-seo.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-046-decision-resolution.md
Next step: Run `eventflow-user-story-approval`.
```
