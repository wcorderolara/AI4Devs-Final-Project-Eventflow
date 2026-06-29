# Technical Specification — US-046: Perfil público SEO del vendor

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-046                                                                                                         |
| Source User Story                    | `management/user-stories/US-046-public-vendor-profile-seo.md`                                                  |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-046-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-029                                                                                                      |
| Backlog Title                        | Perfil público SEO del vendor                                                                                   |
| Backlog Execution Order              | 48                                                                                                              |
| User Story Position in Backlog Item  | 1 de 1                                                                                                          |
| Related User Stories in Backlog Item | US-046                                                                                                         |
| Epic                                 | EPIC-VND-001                                                                                                   |
| Backlog Item Dependencies            | PB-P1-024 (US-040), PB-P1-026 (US-043), PB-P1-027 (US-044), US-047, PB-P0-001, PB-P0-007 (rate limit)           |
| Feature                              | Página pública SEO con Server Components + ISR + JSON-LD                                                        |
| Module / Domain                      | Vendors                                                                                                        |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-27                                                                                                     |
| Last Updated                         | 2026-06-27                                                                                                     |

---

## 2. Backlog Execution Context

PB-P1-029 single-story. Execution order 48. Depende de varios US previos para producir datos públicos.

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-046     | Perfil público SEO con ISR + JSON-LD.          | 1               |

---

## 3. Executive Technical Summary

US-046 introduce:

**Backend** (`modules/vendors-public`):
- `GetPublicVendorBySlugUseCase`: lookup por slug, filtro `status='approved' AND deleted_at IS NULL`, fetch joins (categories, packages activos, portfolio thumbnails, reviews published top 10), whitelist mapper.
- `PublicVendorController` con `GET /api/v1/public/vendors/:slug` + rate limit middleware (60 req/min por IP) + Cache-Control headers.
- Zod del path param (`slug` regex).

**Frontend** (`app/vendors/[slug]/page.tsx`):
- Server Component que llama al endpoint público y renderiza la página completa.
- `generateMetadata` con title, description, canonical, Open Graph, Twitter Card.
- `JsonLdLocalBusiness` inline `<script type="application/ld+json">`.
- ISR `export const revalidate = 300`.
- 404 page (`app/vendors/[slug]/not-found.tsx`).

Sin migraciones. Reuso de schema PB-P0-001.

---

## 4. Scope Boundary

### In Scope
- `GetPublicVendorBySlugUseCase` con whitelist mapper.
- Controller + ruta + rate limit + cache headers.
- Server Component page + `generateMetadata` + JSON-LD.
- Componentes UI: hero, gallery, packages, reviews.
- 404 page.
- i18n UI (4 locales).
- Tests.

### Out of Scope
- Sitemap.xml dinámico.
- Invalidación on-demand del ISR.
- SEO localizado completo (`hreflang` real).
- Reviews paginadas (>10).
- Comentarios / chat público.
- Exposición de PII.

### Explicit Non-Goals
- No expone campos privados.
- No introduce nuevas tablas.

---

## 5. Architecture Alignment

### Backend
Reuso del stack. Nuevo sub-módulo `modules/vendors-public` (o sub-feature en `modules/vendors`).

### Frontend
Next.js App Router con Server Components (ADR-FE-001). ISR + `generateMetadata`.

### Database
Sin migraciones.

### API
REST público bajo `/api/v1/public/...`. Cache-Control headers.

### AI / PromptOps
No aplica.

### Security
Rate limit + whitelist + `404` uniforme + XSS-safe rendering (Next.js auto-escape).

### Testing
Vitest + Supertest + Playwright + axe + smoke de TTFB.

---

## 6. Functional Interpretation

| Acceptance Criterion       | Technical Interpretation                                                                          | Impacted Layer(s) |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 página + metadata     | Server Component + `generateMetadata` + JSON-LD inline.                                            | FE                |
| AC-02 404 uniforme           | Use case retorna `null` para no `approved`; controller mapea a `404 VENDOR_NOT_FOUND`; FE muestra not-found. | BE, FE            |
| AC-03 reviews 10 published   | Repository limita 10 + count total.                                                                | BE                |
| AC-04 cache headers          | Cache-Control + ISR `revalidate`.                                                                  | BE, FE            |
| AC-05 rate limit             | Middleware PB-P0-007 con key `public:vendor_profile`.                                                | BE                |
| EC-01..03                    | Verificación de status + slug regex.                                                                | BE                |
| AUTH-TS-01..02              | Sin auth requerida.                                                                                | BE                |
| A11Y                       | Encabezados semánticos + alt + landmarks.                                                          | FE                |
| i18n 4 locales              | next-intl en UI.                                                                                  | FE                |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

`modules/vendors-public` (nuevo sub-módulo) o sub-feature en `modules/vendors`.

### Use Cases / Application Services

**`GetPublicVendorBySlugUseCase`**

1. Recibe `{ slug }`.
2. Valida slug con regex.
3. `vendor = publicVendorRepository.findApprovedBySlug(slug)`. Si null ⇒ retorna null (controller mapea a `404`).
4. Fetch joins:
   - `categories` (vía `vendor_profile_categories` + `service_categories.is_active=true`).
   - `packages` (`vendor_services` con `is_active=true`).
   - `portfolio` (`attachments` con `owner_type='vendor_work' AND status='active'`, agrupados por `work_label`, primeros thumbnails).
   - `reviews` (`status='published'` LIMIT 10 ORDER BY `created_at DESC`) + count total.
   - `location` (resolve `location_id`).
5. Aplica whitelist mapper.
6. Retorna `PublicVendorDto`.

### Controllers / Routes

```ts
router.get(
  '/public/vendors/:slug',
  rateLimitMiddleware({ key: 'public:vendor_profile', limit: 60, windowSeconds: 60 }),
  asyncHandler(async (req, res) => {
    const dto = await useCase.execute({ slug: req.params.slug });
    if (!dto) {
      return res.status(404).json({ error: { code: 'VENDOR_NOT_FOUND' } });
    }
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return res.json(dto);
  })
);
```

### DTOs / Schemas

```ts
export const slugParam = z.object({
  slug: z.string().regex(/^[a-z0-9\-]+$/).min(1).max(200),
});
```

### Repository / Persistence

```ts
class PublicVendorRepository {
  findApprovedBySlug(slug: string): Promise<VendorWithRelations | null>
  countPublishedReviews(vendorProfileId: string): Promise<number>
  findFirstNPublishedReviews(vendorProfileId: string, n: number): Promise<Review[]>
}
```

Implementación con joins eager (Prisma `include`) o con `$queryRaw` si necesario para performance.

### Validation Rules

Ver §VR-01..VR-03.

### Error Handling

`400 INVALID_SLUG`, `404 VENDOR_NOT_FOUND`, `429 TOO_MANY_REQUESTS`.

### Transactions

No requeridas.

### Observability

Sólo log estándar de request + `correlation_id`.

---

## 8. Frontend Technical Design

### Routes / Pages

- `app/vendors/[slug]/page.tsx` (Server Component con `revalidate: 300`).
- `app/vendors/[slug]/not-found.tsx`.

### Components

- `PublicVendorProfile` (orquestador).
- `VendorHero` (logo + name + rating + location).
- `PortfolioGallery` (grupos por `workLabel` con thumbnails).
- `PackageList` (cards con precio + currency).
- `ReviewList` (10 reviews + "10 de N" si `reviewsTotalPublished > 10`).
- `JsonLdLocalBusiness` (script tag).

### Forms

N/A.

### State Management

Server-side. Sin client state.

### Data Fetching

`vendorsApi.public.get(slug)` (server-side fetch).

### `generateMetadata`

```ts
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const vendor = await vendorsApi.public.get(params.slug);
  if (!vendor) return { title: 'Proveedor no encontrado' };
  return {
    title: `${vendor.businessName} | EventFlow`,
    description: vendor.bio.slice(0, 160),
    alternates: { canonical: `/vendors/${vendor.slug}` },
    openGraph: {
      title: vendor.businessName,
      description: vendor.bio.slice(0, 160),
      type: 'profile',
      images: vendor.portfolio[0]?.thumbnails[0] ? [vendor.portfolio[0].thumbnails[0]] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: vendor.businessName,
      description: vendor.bio.slice(0, 160),
    },
  };
}
```

### JSON-LD `LocalBusiness`

```tsx
function JsonLdLocalBusiness({ vendor }: { vendor: PublicVendorDto }) {
  const ld: any = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: vendor.businessName,
    description: vendor.bio,
    url: `${SITE_URL}/vendors/${vendor.slug}`,
    address: { '@type': 'PostalAddress', addressLocality: vendor.location.display },
  };
  if (vendor.portfolio[0]?.thumbnails[0]) ld.image = vendor.portfolio[0].thumbnails[0];
  if (vendor.reviewsCount > 0 && vendor.ratingAvg) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: vendor.ratingAvg.toFixed(1),
      reviewCount: vendor.reviewsCount,
    };
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />;
}
```

### Loading / Empty / Error / Success States

- Loading: SSR (sin loading visible).
- Empty (sin portfolio/reviews): se omite la sección o se muestra "Sin reseñas aún".
- Error: 404 page.
- Success: página completa.

### Accessibility

- `<h1>` único.
- `alt` descriptivo.
- Landmarks `<main>`, `<nav>`, `<aside>`.

### i18n

next-intl con detección por cookie/header. UI traducida; SEO en locale canónico del vendor.

---

## 9. API Contract Design

| Method | Endpoint                            | Purpose                              | Auth Required | Request                          | Response                                                  | Error Cases                                                    |
| ------ | ----------------------------------- | ------------------------------------ | ------------- | -------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| GET    | `/api/v1/public/vendors/:slug`      | Perfil público del vendor.            | No            | Path param `slug` (regex).        | `200 PublicVendorDto` (ver §7 US).                        | `400 INVALID_SLUG`, `404 VENDOR_NOT_FOUND`, `429 TOO_MANY_REQUESTS`. |

Headers de response: `Cache-Control: public, max-age=60, stale-while-revalidate=300`.

---

## 10. Database / Prisma Design

### Models Impacted

`VendorProfile`, `VendorService`, `Attachment`, `Review`, `ServiceCategory`, `Location` (todos read-only).

### Indexes

Reuso de existentes (`vendor_profiles.slug UNIQUE`, `idx_vendor_services_active`, `idx_attachments_vendor_work_active`).

### Migrations Impact

Ninguna.

### Seed Impact

Reuso. Verificar que al menos 1 vendor approved con perfil completo (portfolio + paquetes + ≥ 1 review published) está en el seed para demo.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

No requerida.

### Authorization

Público + rate limit.

### Negative Authorization Scenarios

- Slug ilegal → `400`.
- Vendor no `approved` → `404`.
- Rate excedido → `429`.

### Audit Requirements

N/A.

### Sensitive Data Handling

Whitelist explícita. XSS-safe rendering (Next.js auto-escape; bio NO permite HTML).

---

## 13. Testing Strategy

### Unit Tests

- DTO slug Zod.
- Whitelist mapper (no leak de campos privados).
- Use case branches (not found, approved, sin portfolio/reviews).

### Integration Tests

- TS-01..TS-06 + NT-01..NT-07.
- Cache headers presentes.
- Rate limit operativo.

### API Tests

Supertest cubriendo todos los códigos.

### E2E Tests

Playwright:
- Página renderiza con metadata + OG + Twitter + JSON-LD.
- 404 page accesible.

### Security Tests

- Whitelist: assert que email/teléfono/PII no aparecen en response.
- XSS: bio con `<script>` se renderiza como texto.

### Accessibility Tests

- axe sobre page + 404.
- Encabezados semánticos.

### AI Tests

No aplica.

### Seed / Demo Tests

Reuso.

### CI Checks

Lint + Vitest + Supertest + Playwright (opcional).

### Performance

Smoke de TTFB `< 500ms` con seed.

---

## 14. Observability & Audit

### Logs

Sólo log estándar + `correlation_id`.

### Correlation ID

Heredado.

### AdminAction

N/A.

### Metrics

Opcional: contador de requests por slug (útil para popularidad).

---

## 15. Seed / Demo Data Impact

Verificar que al menos 1 vendor approved con perfil completo está en el seed.

---

## 16. Documentation Alignment Required

| Document / Source            | Conflict                                                              | Current Decision                              | Recommended Action                                          | Blocks Implementation? |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| `docs/16 §M07`               | Falta documentar el endpoint público.                                  | Documentar.                                    | Actualizar `docs/16`.                                       | No                     |
| PB-P1-029 Traceability        | Backlog item cita `FR-VENDOR-007` (incorrecto).                       | Trazabilidad real registrada en US.            | Housekeeping del backlog item.                              | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                            | Impact                | Mitigation                                              |
| --------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| Whitelist mapper deja escapar campos privados.                   | PII leak.             | Mapper explícito + test que detecta leaks.              |
| ISR mantiene cache de vendor desaprobado.                        | Vendor `pending` visible por hasta 5 min. | Aceptable trade-off MVP; invalidación on-demand Future. |
| Rate limit muy estricto bloquea bots SEO legítimos.              | SEO impact.            | 60 req/min es generoso; ajustar si Google reporta errores. |
| JSON-LD inválido rechazado por Google.                            | SEO impact.            | Test de schema.org validator en CI.                    |
| TTFB > 500ms.                                                    | UX y SEO.              | ISR + cache; índice slug UNIQUE.                        |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/vendors-public/dto/slug.param.ts`
- `src/modules/vendors-public/use-cases/get-public-vendor-by-slug.use-case.ts`
- `src/modules/vendors-public/repositories/public-vendor.repository.ts`
- `src/modules/vendors-public/mappers/public-vendor.mapper.ts`
- `src/modules/vendors-public/controllers/public-vendor.controller.ts`
- `src/modules/vendors-public/routes/public-vendor.routes.ts`

**Frontend**:
- `app/vendors/[slug]/page.tsx`
- `app/vendors/[slug]/not-found.tsx`
- `components/public-vendor/PublicVendorProfile.tsx`
- `components/public-vendor/VendorHero.tsx`
- `components/public-vendor/PortfolioGallery.tsx`
- `components/public-vendor/PackageList.tsx`
- `components/public-vendor/ReviewList.tsx`
- `components/public-vendor/JsonLdLocalBusiness.tsx`
- `lib/api/vendorsApi.ts` (extender con namespace `public`)
- `messages/{es-LATAM,es-ES,pt,en}.json` (extender con `public_vendor.*`)

### Orden sugerido

1. DB-001 (verificación).
2. DTO slug + UT.
3. Repository + mapper + UT.
4. Use case + UT.
5. Controller + rate limit + cache headers.
6. Frontend `vendorsApi.public.get` + MSW.
7. Page Server Component + `generateMetadata`.
8. Componentes UI.
9. JSON-LD component.
10. Not-found page.
11. i18n.
12. Tests integración + E2E + A11Y + security.
13. Documentación.

### Decisiones que no deben reabrirse

D1–D7.

### Qué no implementar

- Sitemap.xml dinámico.
- ISR invalidación on-demand.
- SEO localizado completo.
- Reviews paginadas.

### Assumptions to preserve

- Schema entregado por PB-P0-001.
- Rate limit middleware de PB-P0-007.

---

## 19. Task Generation Notes

| Grupo | Tasks |
| ----- | ----: |
| DB    | 1 (verificación) |
| BE    | 6 (DTO, repository, mapper, use case, controller, rate limit + cache wiring) |
| FE    | 6 (page + generateMetadata, JsonLd, hero, gallery + packages + reviews, not-found, i18n) |
| QA    | 6 (UT, IT, AUTH, E2E SEO, Security/whitelist, Performance) |
| DOC   | 1 (`docs/16 §M07`) |

**Total estimado ~20 tareas.**

### Required QA tasks

- UT + IT + AUTH + E2E + Security (whitelist) + Performance smoke.

### Required security tasks

- Whitelist mapper test.
- XSS test.
- Rate limit verification.

### Required seed/demo tasks

- Verificación.

### Required documentation tasks

- `docs/16 §M07`.

### Dependencies between tasks

- DB → BE → FE → QA.

### Backlog consolidated `tasks.md`

Single-story.

---

## 20. Technical Spec Readiness

| Check                                                       | Status |
| ----------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec    | Pass   |
| Product Backlog mapping found                                | Pass   |
| Decision Resolution reviewed if present                      | Pass   |
| Scope clear                                                  | Pass   |
| Architecture alignment clear                                 | Pass   |
| API impact clear                                             | Pass   |
| DB impact clear                                              | Pass   |
| AI impact clear                                              | N/A    |
| Security impact clear                                        | Pass   |
| Testing strategy clear                                       | Pass   |
| Ready for Development Task Breakdown                         | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-046 cierra PB-P1-029 con Server Components + ISR + JSON-LD + endpoint público con rate limit y whitelist. Sin migraciones. 2 acciones documentales no bloqueantes.
