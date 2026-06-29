# 🧾 User Story: Ver perfil público SEO de un vendor

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-046                                                                      |
| Backlog Item       | PB-P1-029 — Perfil público SEO del vendor                                   |
| Epic               | EPIC-VND-001                                                                |
| Feature            | Vista pública SEO (Server Component + ISR + JSON-LD)                        |
| Module / Domain    | Vendors                                                                     |
| User Role          | Anonymous                                                                   |
| Priority           | Must Have                                                                   |
| Status             | Approved                                                                    |
| Owner              | Product Owner / Business Analyst                                            |
| Sprint / Milestone | MVP                                                                         |
| Created Date       | 2026-06-09                                                                  |
| Last Updated       | 2026-06-27                                                                  |
| Approved By        | PO/BA Review                                                                |
| Approval Date      | 2026-06-27                                                                  |
| Ready for Development Tasks | Yes                                                                 |

---

## 🎯 User Story

**As an** anonymous (sin sesión)
**I want** ver el perfil público SEO de un vendor aprobado en `/vendors/:slug`
**So that** descubra proveedores sin estar registrado y comparta el enlace en redes sociales con rich previews

---

## 🧠 Business Context

### Context Summary

Página pública renderizada con Server Components (Next.js App Router, ADR-FE-001). Incluye metadata (title, description, canonical), Open Graph, Twitter Card y JSON-LD `LocalBusiness` (`docs/15 §14.2`). Sólo `VendorProfile.status='approved'` Y `deleted_at IS NULL` retorna `200`; cualquier otro estado o slug inexistente ⇒ `404 VENDOR_NOT_FOUND`. ISR con `revalidate: 300`. Endpoint público con rate limit `60 req/min` por IP.

### PO/BA Decisions Applied

| #  | Decisión                                                                                                                                                                                                                                       |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | Whitelist explícita de campos públicos. Públicos: `slug, business_name, bio, location {display, code}, categories[] {code, name}, rating_avg, reviews_count, packages[] {package_name, base_price, currency_code, description, service_category_code}, portfolio[] {work_label, thumbnails}, reviews[] {rating, comment, created_at, reviewer_display_name}`. Privados nunca expuestos. |
| D2 | JSON-LD `LocalBusiness` in scope MVP (`@context, @type, name, description, image, address, aggregateRating, url`).                                                                                                                            |
| D3 | URL canónica `/vendors/:slug` sin prefijo de locale. Locale por cookie `NEXT_LOCALE` / `Accept-Language`. `hreflang` placeholders preparados; SEO localizado completo es Future.                                                              |
| D4 | ISR Next.js `export const revalidate = 300`. Endpoint API público con `Cache-Control: public, max-age=60, stale-while-revalidate=300`. Invalidación on-demand al editar perfil es Future.                                                     |
| D5 | SSR muestra primeras `10` reviews `published` ordenadas `created_at DESC`. Campo `reviews_total_published` indica el total. Paginación adicional es Future.                                                                                  |
| D6 | Sólo `status='approved'` Y `deleted_at IS NULL` retorna `200`. Cualquier otro estado o slug inexistente ⇒ `404 VENDOR_NOT_FOUND` (sin distinción para evitar information leakage).                                                            |
| D7 | Rate limit `60 req/min` por IP (clave `public:vendor_profile`). Excedido ⇒ `429` con `Retry-After`. Reuso del middleware de PB-P0-007.                                                                                                       |

### Related Domain Concepts

* `vendor_profiles` (slug UNIQUE, status, deleted_at, location_id, rating_avg, reviews_count).
* `vendor_profile_categories` (M:N).
* `vendor_services` (`is_active=true`).
* `attachments` (`owner_type='vendor_work'`, `status='active'`).
* `reviews` (`status='published'`).
* `locations`.
* `service_categories`.

### Assumptions

* `slug` es URL-safe y único (entregado por US-040).
* Server Components renderizan la página completa.
* ISR mantiene freshness aceptable sin invalidación on-demand en MVP.

### Dependencies

* US-040 (slug + approved profile).
* US-043 (portfolio attachments).
* US-044 (packages).
* US-047 (admin approve para que existan `approved`).
* US de reviews (cuando exista; mientras tanto el endpoint retorna `reviews: []` para vendors sin reseñas).
* PB-P0-007 (rate limiting middleware).
* PB-P0-001 (schema + slug index).

---

## 🔗 Traceability

| Source                 | Reference                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-VENDOR-003, FR-REVIEW-006, FR-SERVICE-004                             |
| Use Case(s)            | UC-VENDOR-006                                                             |
| Business Rule(s)       | BR-VENDOR-001, BR-REVIEW-004                                              |
| Permission Rule(s)     | Anonymous (público sólo lectura)                                          |
| Data Entity / Entities | VendorProfile, VendorService, Review, Attachment, ServiceCategory, Location |
| API Endpoint(s)        | GET /api/v1/public/vendors/:slug                                          |
| NFR Reference(s)       | NFR-PERF-001                                                              |
| Related ADR(s)         | ADR-FE-001 (Next.js + TypeScript + App Router)                            |
| Related Document(s)    | /docs/15 §14, §30.5, §37 / /docs/4 §BR-VENDOR-001 / /docs/9 §FR-VENDOR-003 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Comentarios / chat público.
* Sitemap.xml dinámico (Future).
* `robots.txt` dinámico por vendor.
* Invalidación on-demand del ISR al editar perfil (Future).
* Reviews paginadas (más de 10).
* SEO localizado completo (`hreflang` real Future per `docs/15 §31.5`).
* `priceRange` y `telephone` en JSON-LD (Future).
* Exposición de email/teléfono/PII.

### Scope Notes

* Sólo lectura. Whitelist explícita.
* Cache + rate limit obligatorios.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Página pública con metadata + JSON-LD

**Given** un vendor con `status='approved'` Y `deleted_at IS NULL` y `slug='estudio-fotografico-xyz'`
**When** un anonymous navega a `/vendors/estudio-fotografico-xyz`
**Then** Next.js renderiza un Server Component que:
- llama `GET /api/v1/public/vendors/estudio-fotografico-xyz`,
- recibe `200` con la whitelist de campos públicos (D1),
- renderiza HTML con `<title>`, `<meta description>`, canonical link,
- inserta `<meta property="og:*">` (title, description, image, type=profile),
- inserta `<meta name="twitter:card" content="summary_large_image">`,
- inserta `<script type="application/ld+json">` con `LocalBusiness` (D2),
- aplica ISR con `revalidate: 300`,
- responde con HTTP `Cache-Control` apropiado.

### AC-02: Vendor no válido para visibilidad

**Given** un vendor con `status ∈ {pending, rejected, hidden}` o `deleted_at IS NOT NULL`, o slug inexistente
**When** anonymous abre la URL
**Then** el endpoint API retorna `404 VENDOR_NOT_FOUND` y la página renderiza el 404 page de Next.js accesible.

### AC-03: Reviews públicas

**Given** un vendor approved con 15 reviews (12 `published`, 3 `hidden`)
**When** la página se renderiza
**Then** SSR muestra las 10 primeras reviews `published` por `created_at DESC` con `reviews_total_published=12`. Reviews ocultas no aparecen.

### AC-04: Cache headers + ISR

**Given** la página renderizada
**When** la response llega al cliente
**Then** el HTML server-rendered se sirve con headers de Next.js ISR; el endpoint API retorna `Cache-Control: public, max-age=60, stale-while-revalidate=300`.

### AC-05: Rate limit excedido

**Given** una IP que envía 61 requests en 60s
**When** la 61ª request llega
**Then** el endpoint retorna `429 Too Many Requests` con `Retry-After: <segundos>`.

---

## ⚠️ Edge Cases

### EC-01: Vendor oculto por admin (`status='hidden'`)

**Given** vendor con `vendor_profile.status='hidden'`
**When** anonymous abre URL
**Then** `404 VENDOR_NOT_FOUND`. Mismo trato que `pending`/`rejected`/soft-deleted.

#### Handling

* Whitelist por status (D6).

### EC-02: Vendor sin portfolio ni reviews

**Given** vendor approved recién creado sin imágenes ni reseñas
**When** se renderiza
**Then** `portfolio: []`, `reviews: []`, `reviews_count: 0`, `rating_avg: null`. JSON-LD omite `image` y `aggregateRating`. Página renderiza con sección "Sin reseñas aún".

### EC-03: Slug con caracteres especiales

**Given** slug malformado (no matches `^[a-z0-9\-]+$`)
**When** se valida
**Then** `400 INVALID_SLUG`.

---

## 🚫 Validation Rules

| ID    | Rule                                                              | Message / Behavior                              |
| ----- | ----------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | Slug existe Y `status='approved'` Y `deleted_at IS NULL`           | `404 VENDOR_NOT_FOUND`                          |
| VR-02 | Slug matches `^[a-z0-9\-]+$` con longitud `[1..200]`                | `400 INVALID_SLUG`                              |
| VR-03 | Rate limit `60 req/min` por IP                                     | `429 TOO_MANY_REQUESTS` + `Retry-After`         |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| SEC-01 | Endpoint público (sin sesión).                                                                |
| SEC-02 | Whitelist explícita de campos públicos (D1).                                                  |
| SEC-03 | No exponer email, teléfono, IDs internos, PII.                                                |
| SEC-04 | Rate limit `60 req/min` por IP (D7).                                                          |
| SEC-05 | `404 VENDOR_NOT_FOUND` uniforme para no aprobados / soft-deleted / inexistentes (D6).          |
| SEC-06 | XSS-safe: bio y description renderizadas con escape (sin permitir HTML).                       |

### Negative Authorization Scenarios

* Cualquier sesión activa puede ver la página (no requiere logout).
* Bots indexadores SEO (Googlebot, etc.) son tratados como anonymous con misma respuesta.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input

* Not applicable for this story.

### AI Output

* Not applicable for this story.

### Human-in-the-loop Rules

* Not applicable for this story.

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Screen / Route      | `/vendors/:slug` (sin prefijo locale, per D3).                                                  |
| Main UI Pattern     | Página de perfil con hero (logo + name + rating), bio, galería de portfolio, lista de paquetes, lista de reviews. |
| Primary Action      | "Crear cuenta y solicitar cotización" (deep-link a registro de organizador).                   |
| Secondary Actions   | "Iniciar sesión".                                                                              |
| Empty State         | "Sin reseñas aún" cuando `reviews_count=0`.                                                    |
| Loading State       | SSR (sin loading); el HTML llega completo.                                                     |
| Error State         | 404 page de Next.js accesible (con encabezado semántico + CTA "Volver al directorio").         |
| Success State       | Página completa con metadata + JSON-LD.                                                        |
| Accessibility Notes | Encabezados semánticos (`<h1>` único con `business_name`); imágenes con `alt`; landmarks ARIA. |
| Responsive Notes    | Mobile-first.                                                                                  |
| i18n Notes          | 4 locales: `es-LATAM`, `es-ES`, `pt`, `en` (UI). SEO en locale canónico del vendor (default `es-LATAM`). |
| Currency Notes      | Cada paquete muestra precio con `currency_code` (sin conversión).                              |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * `app/vendors/[slug]/page.tsx` (Server Component, ISR `revalidate: 300`).
* Components:
  * `PublicVendorProfile` (orquestador).
  * `VendorHero`, `PortfolioGallery`, `PackageList`, `ReviewList`.
  * `JsonLdLocalBusiness` (script tag).
* State Management:
  * Sin client state (SSR).
* Forms:
  * No aplica.
* API Client:
  * `vendorsApi.public.get(slug)` (server-side fetch).

### Backend

* Use Case / Service:
  * `GetPublicVendorBySlugUseCase`.
* Controller / Route:
  * `GET /api/v1/public/vendors/:slug` con rate limit middleware.
* Authorization Policy:
  * Público (sin guard de auth).
* Validation:
  * Zod del path param + verificación de visibility por status.
* Transaction Required:
  * No.
* Cache headers:
  * `Cache-Control: public, max-age=60, stale-while-revalidate=300`.

### Database

* Main Tables:
  * `vendor_profiles`, `vendor_profile_categories`, `vendor_services`, `attachments`, `reviews`, `service_categories`, `locations`.
* Constraints:
  * `status='approved'` AND `deleted_at IS NULL` filtros obligatorios.
* Index Considerations:
  * `slug UNIQUE` (PB-P0-001).
  * Reuso de índices de US-043/044.

### API

| Method | Endpoint                            | Purpose                                                       |
| ------ | ----------------------------------- | ------------------------------------------------------------- |
| GET    | `/api/v1/public/vendors/:slug`      | Perfil público (whitelist de campos).                          |

#### Response shape (200)

```json
{
  "slug": "...",
  "businessName": "...",
  "bio": "...",
  "location": { "display": "Ciudad de Guatemala", "code": "GT-GUA" },
  "categories": [{ "code": "catering", "name": { "es-LATAM": "Catering", ... } }],
  "ratingAvg": 4.6,
  "reviewsCount": 24,
  "reviewsTotalPublished": 12,
  "packages": [
    { "packageName": "...", "basePrice": "150.00", "currencyCode": "GTQ", "description": "...", "serviceCategoryCode": "..." }
  ],
  "portfolio": [
    { "workLabel": "boda-pareja-2024", "thumbnails": ["..."] }
  ],
  "reviews": [
    { "rating": 5, "comment": "...", "createdAt": "2026-...", "reviewerDisplayName": "Ana M." }
  ]
}
```

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: No (sólo log estándar de request)
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                  | Type        |
| ----- | ------------------------------------------------------------------------- | ----------- |
| TS-01 | Página renderiza con metadata + Open Graph + Twitter Card + JSON-LD.       | E2E         |
| TS-02 | JSON-LD valida contra schema.org `LocalBusiness` shape.                   | E2E         |
| TS-03 | 10 reviews published mostradas + `reviewsTotalPublished` correcto.        | Integration |
| TS-04 | Cache-Control headers presentes (`max-age=60`, `swr=300`).                | API         |
| TS-05 | ISR `revalidate: 300` configurado correctamente.                          | Frontend    |
| TS-06 | Sin portfolio ni reviews: JSON-LD omite `image` y `aggregateRating`.      | E2E         |

### Negative Tests

| ID    | Scenario                                              | Expected Result                  |
| ----- | ----------------------------------------------------- | -------------------------------- |
| NT-01 | Slug inexistente                                       | `404 VENDOR_NOT_FOUND`           |
| NT-02 | Vendor `pending`                                       | `404 VENDOR_NOT_FOUND`           |
| NT-03 | Vendor `rejected`                                      | `404 VENDOR_NOT_FOUND`           |
| NT-04 | Vendor `hidden`                                        | `404 VENDOR_NOT_FOUND`           |
| NT-05 | Vendor soft-deleted                                    | `404 VENDOR_NOT_FOUND`           |
| NT-06 | Slug malformado                                        | `400 INVALID_SLUG`               |
| NT-07 | 61 requests en 60s desde misma IP                      | `429 TOO_MANY_REQUESTS`          |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario           | Expected Result                       |
| ---------- | ------------------ | ------------------------------------- |
| AUTH-TS-01 | Anonymous          | `200`                                  |
| AUTH-TS-02 | Sesión activa      | `200` (mismo response que anonymous)   |

### Accessibility Tests

* `<h1>` único con `business_name`.
* Imágenes con `alt` descriptivo (incluyendo `work_label` para portfolio).
* Landmarks `<main>`, `<nav>`, `<aside>`.
* JSON-LD inline no afecta navegación de screen readers.

---

## 📊 Business Impact

| Field               | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| KPI Affected        | SEO traffic, conversión anonymous → registered.        |
| Expected Impact     | Atracción de organizadores nuevos vía buscadores.     |
| Success Criteria    | TTFB `< 500ms`; JSON-LD válido; rich snippets en Google. |
| Academic Demo Value | Demuestra SEO + SSR + ISR + JSON-LD + rate limiting.   |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Page Server Component + `generateMetadata`.
* JSON-LD component.
* Componentes hero, gallery, packages, reviews.
* 404 page.
* i18n 4 locales (UI).

### Potential Backend Tasks

* `GetPublicVendorBySlugUseCase`.
* DTO Zod del path param.
* Repository con whitelist mapper.
* Controller + ruta con rate limit middleware.
* Cache-Control headers.

### Potential Database Tasks

* Verificación documental.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* TS metadata + JSON-LD + cache + rate limit + visibilidad.
* A11Y E2E.

### Potential DevOps / Config Tasks

* Sitemap.xml en futuro.
* Configuración de CDN headers en futuro.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (FR-VENDOR-003, FR-REVIEW-006, FR-SERVICE-004, UC-VENDOR-006, BR-VENDOR-001, BR-REVIEW-004).
* [x] Permisos identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida (endpoint + whitelist).
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Página SSR operativa con ISR.
* [ ] OG tags + Twitter Card + JSON-LD `LocalBusiness` válidos.
* [ ] Cache-Control headers verificados.
* [ ] Rate limit `60 req/min` operativo.
* [ ] `404 VENDOR_NOT_FOUND` uniforme.
* [ ] TTFB `< 500ms` en seed.
* [ ] Tests verdes (functional, negative, auth, accessibility, security).
* [ ] i18n 4 locales para UI.

---

## 📝 Notes

* Sitemap.xml, invalidación on-demand del ISR y SEO localizado completo son Future.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-046-decision-resolution.md §5`.
