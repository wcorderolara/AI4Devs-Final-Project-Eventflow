# User Story Refinement Review — US-046

## Source User Story File
management/user-stories/US-046-public-vendor-profile-seo.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-046-decision-resolution.md

## Review Date
2026-06-27 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)
Q1–Q7 resueltas. La US-046 ahora declara `Backlog Item: PB-P1-029`, `PO/BA Decisions Applied` D1–D7, trazabilidad corregida (`FR-VENDOR-003 + FR-REVIEW-006 + FR-SERVICE-004`, `UC-VENDOR-006`, `BR-VENDOR-001 + BR-REVIEW-004`, `NFR-PERF-001`, `ADR-FE-001`), endpoint `GET /api/v1/public/vendors/:slug` con whitelist y rate limit, URL canónica `/vendors/:slug` sin prefijo locale, ISR + Cache-Control, JSON-LD `LocalBusiness` in scope MVP, AC-01..AC-05, EC-01..EC-03, VR-01..VR-03, SEC-01..SEC-06, TS-01..TS-06, NT-01..NT-07. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| User Story ID                              | US-046                                                                    |
| File Path                                  | management/user-stories/US-046-public-vendor-profile-seo.md               |
| Backlog Item                               | PB-P1-029 — Perfil público SEO del vendor                                 |
| Epic                                       | EPIC-VND-001                                                              |
| Estado actual                              | Draft                                                                     |
| Estado recomendado                         | Needs Refinement                                                          |
| Nivel de riesgo                            | Medio                                                                     |
| Calidad general                            | Media                                                                     |
| Requiere decisión PO                       | Sí                                                                        |
| Requiere decisión técnica                  | Sí (caching, JSON-LD, locale routing)                                     |
| Requiere decisión QA                       | No                                                                        |
| Requiere decisión Seguridad                | No                                                                        |
| Decision Resolution artifact found         | No                                                                        |
| User Story file updated                    | No                                                                        |
| Refinement review artifact created/updated | Yes                                                                       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-046-refinement-review.md    |

---

## 2. Diagnóstico PO/BA

US-046 entrega la página pública SEO del vendor para usuarios anónimos. La intención está clara y se alinea con `docs/15 §14` y `§37` (Server Components + metadata + Open Graph + JSON-LD). Sin embargo:

1. **Trazabilidad incorrecta**: cita `FR-VENDOR-007` (que es `work_label` portfolio), `UC-VENDOR-007` (vendor lee reseñas recibidas), `BR-VENDOR-008` (generación IA opcional). Las correctas son **`FR-VENDOR-003`** (visibilidad directorio approved), **`FR-REVIEW-006`** (sólo `published` en perfil público), **`FR-SERVICE-004`** (categorías activas), **`UC-VENDOR-006`** (lectura del directorio), **`BR-VENDOR-001`** (visibilidad por approved). `NFR-PERF-WEB-001` no existe; las relevantes son **`NFR-PERF-001`** y conceptos SEO documentados en `docs/15 §14`.
2. **`is_hidden=true` en EC-01 es incorrecto**: el modelo usa `vendor_profile.status` enum con valor `hidden` (no flag `is_hidden`).
3. **Lista de campos públicos**: SEC-02 dice "no email/teléfono" pero falta la lista positiva (qué SÍ se expone).
4. **JSON-LD schema.org**: `docs/15 §14.2` lista como **Should Have MVP** (`LocalBusiness` o `Service`). La US dice "considerar en futuro" — desalineado.
5. **Estructura URL y locale**: `docs/15 §30.5` indica MVP detecta locale por cookie/header **sin prefijo de locale en URL** para evitar fragmentar SEO. La US dice `/[locale]/vendors/:slug` (con prefijo). Necesita aclaración.
6. **`hreflang`**: `docs/15 §31.5` indica MVP con placeholders, SEO localizado completo es Future. Aclarar.
7. **Caching**: la US no especifica TTL ni cache headers. Decisión necesaria (ISR + revalidate / Cache-Control).
8. **Endpoint REST `/api/v1/public/vendors/:slug`**: ¿el SSR consume internamente este endpoint vía fetch o accede directo al repository? Mejor mantener el endpoint REST público para consistencia y caching independiente.
9. **Reviews públicas**: `FR-REVIEW-006` dice `published` only. ¿Cuántas se muestran en SSR? ¿Paginación?
10. **Vendor con `deleted_at IS NOT NULL`**: ¿404 también? Heredar de US-041 D4.
11. **Rate limiting**: público sin sesión, requiere rate limit para DoS protection.
12. **Falta declarar `Backlog Item: PB-P1-029`**.
13. **AC-01 lacónico**: no nombra metadata específica, JSON-LD ni cache headers.
14. **Currency Notes "Moneda del vendor"**: aclarar que se muestra junto al precio del paquete (de US-044).

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                            | Impacto                                                                                                                                | Recomendación                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad estructuralmente incorrecta: `FR-VENDOR-007`, `UC-VENDOR-007`, `BR-VENDOR-008`, `NFR-PERF-WEB-001` no aplican.                                          | Trazabilidad rota.                                                                                                                     | Reemplazar por **`FR-VENDOR-003`, `FR-REVIEW-006`, `FR-SERVICE-004`, `UC-VENDOR-006`, `BR-VENDOR-001`, `BR-REVIEW-004`, `NFR-PERF-001`** + `ADR-FE-001` (correcto, mantener).                                                                  |
| Alta      | Lista de campos públicos vs privados sin definir.                                                                                                                  | Riesgo de leak de PII.                                                                                                                | Resolver Q1 (PO). Recomendado: **públicos** (`slug`, `business_name`, `bio`, `location`, `categories[]`, `rating_avg`, `reviews_count`, paquetes con `package_name/base_price/currency_code/description`, portfolio thumbnails, reseñas publicadas); **privados** (email, teléfono, `vendor_user_id`, IDs internos, `category_change_count`, `requires_admin_review`). |
| Alta      | JSON-LD schema.org desalineado con `docs/15 §14.2` (Should Have MVP).                                                                                              | Pérdida de oportunidad SEO.                                                                                                           | Resolver Q2 (PO). Recomendado: **in scope MVP** — `LocalBusiness` JSON-LD (per `docs/15 §14.2`).                                                                                                                                              |
| Alta      | Estructura URL con `[locale]` vs sin prefijo de locale.                                                                                                            | Fragmentación SEO.                                                                                                                    | Resolver Q3 (PO/Tech). Recomendado: URL sin prefijo `/vendors/:slug`; locale por cookie/header (consistente con `docs/15 §30.5`).                                                                                                              |
| Alta      | Caching strategy sin especificar.                                                                                                                                   | Impacto en TTFB y carga.                                                                                                              | Resolver Q4 (PO/Tech). Recomendado: ISR Next.js con `revalidate: 300` (5 min) + `Cache-Control: public, max-age=60, stale-while-revalidate=300` en response del API público. Invalidación on-demand al editar perfil (Future).                  |
| Alta      | Reviews públicas: cantidad y paginación.                                                                                                                            | Riesgo de SSR pesado.                                                                                                                 | Resolver Q5 (PO). Recomendado: SSR muestra **primeras 10 reviews `published` ordenadas por `created_at DESC`**; "Ver más" lleva a endpoint paginado (Future US si requerido).                                                                  |
| Alta      | Política vendor con `deleted_at IS NOT NULL`.                                                                                                                       | Inconsistencia con US-041.                                                                                                            | Resolver Q6 (PO). Recomendado: `404` (heredar de US-041 D4).                                                                                                                                                                                  |
| Alta      | Rate limiting endpoint público.                                                                                                                                     | DoS / abuso.                                                                                                                          | Resolver Q7 (PO/Sec). Recomendado: rate limit por IP `60 req/min` para `/api/v1/public/vendors/:slug` (reuso del middleware de PB-P0-007).                                                                                                       |
| Media     | EC-01 cita `is_hidden=true`; el modelo usa `status='hidden'`.                                                                                                       | Confusión semántica.                                                                                                                  | Reescribir EC-01 con `status='hidden'`.                                                                                                                                                                                                       |
| Media     | Falta declarar `Backlog Item: PB-P1-029`.                                                                                                                          | Trazabilidad incompleta.                                                                                                              | Añadir en Metadata.                                                                                                                                                                                                                            |
| Media     | AC-01 demasiado lacónico (no especifica metadata, JSON-LD, cache headers).                                                                                          | AC subespecificado.                                                                                                                   | Reescribir con campos exactos.                                                                                                                                                                                                                 |
| Media     | hreflang placeholders vs SEO localizado completo.                                                                                                                  | Confusión scope MVP.                                                                                                                  | Aclarar: placeholders MVP, SEO localizado completo es Future.                                                                                                                                                                                  |
| Baja      | `Notes` plantea JSON-LD como future — desalineado con docs.                                                                                                         | Posible omisión de capacidad.                                                                                                         | Mover JSON-LD a in scope tras Q2.                                                                                                                                                                                                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                  |
| ------------------------------------ | --------- | --------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                  |
| No introduce contratos firmados      | Pass      | No aplica.                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | Comentarios/chat público explícitamente fuera de scope.                    |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                |
| Respeta backend como source of truth | Pass      | Endpoint público server-side.                                               |
| Respeta seed/demo si aplica          | Pass      | Reuso de seed.                                                              |
| No introduce RAG/vector DB           | Pass      | N/A.                                                                         |
| No introduce multi-tenant enterprise | Pass      | N/A.                                                                         |
| No introduce P4/Future scope         | Pass      | Sitemap.xml movido a Future correctamente.                                  |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                                                            | Acción recomendada                                                                                                                                                                                                                                       |
| ----- | ------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail | No nombra metadata específica, JSON-LD, cache headers.                                          | Reescribir tras Q1–Q4 con campos exactos.                                                                                                                                                                                                            |
| AC-02 | Needs Detail | Sólo cubre `pending`/`rejected`; falta `hidden` y `deleted_at`.                                 | Reescribir tras Q6 incluyendo `hidden` y soft-deleted (`404`).                                                                                                                                                                                       |
| EC-01 | Needs Detail | Usa `is_hidden`.                                                                                | Reescribir con `status='hidden'`.                                                                                                                                                                                                                   |

Faltan AC para:
- JSON-LD presente en HTML.
- Cache headers verificados.
- Rate limit verificado (Q7).
- Reviews `published` only (Q5).

---

## 6. Gaps Detectados

### Producto / Negocio
- Faltan decisiones PO (Q1–Q7).

### Backend / API
- Endpoint público con rate limit.
- Response shape con campos públicos seleccionados.

### Frontend / UX
- `generateMetadata` con OG + Twitter Card + JSON-LD.
- Layout Server Component.
- 404 page accesible.

### Base de Datos
- Sin cambios; índice `slug UNIQUE` ya existe (PB-P0-001).

### Seguridad / Autorización
- Rate limiting por IP.
- Allow CORS si el SSR consume desde dominio distinto (probablemente no en monolito).

### IA / PromptOps
- No aplica.

### QA / Testing
- TS para metadata + JSON-LD presence.
- TS para Cache-Control headers.
- TS para visibilidad por status (`pending`/`rejected`/`hidden`/soft-deleted → 404).
- TS para rate limit.

### Seed / Demo
- Reuso del seed; al menos 1 vendor approved con perfil completo.

### Documentación / Trazabilidad
- Corregir FR/UC/BR/NFR.
- Documentar endpoint público en `docs/16 §M07`.

---

## 7. Preguntas Pendientes

| Tipo     | Pregunta                                                                                                                                                                                                                                          | Bloquea aprobación | Responsable |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| PO       | **Q1** — Lista campos públicos vs privados. Recomendado: públicos (slug, business_name, bio, location, categories, rating_avg, reviews_count, packages con package_name/base_price/currency_code/description, portfolio thumbnails, published reviews); privados (email, teléfono, vendor_user_id, IDs internos, category_change_count, requires_admin_review). | Sí                 | PO          |
| PO       | **Q2** — JSON-LD schema.org. Recomendado: in scope MVP (`LocalBusiness`) según `docs/15 §14.2` (Should Have).                                                                                                                                  | Sí                 | PO          |
| PO/Tech  | **Q3** — Estructura URL y locale routing. Recomendado: `/vendors/:slug` sin prefijo locale; locale por cookie/header (consistente con `docs/15 §30.5`).                                                                                          | Sí                 | PO/Tech     |
| PO/Tech  | **Q4** — Caching. Recomendado: ISR con `revalidate: 300`; `Cache-Control: public, max-age=60, stale-while-revalidate=300` en API público.                                                                                                       | Sí                 | PO/Tech     |
| PO       | **Q5** — Reviews públicas. Recomendado: SSR muestra primeras 10 `published` ordenadas `created_at DESC`. "Ver más" se queda Future.                                                                                                            | Sí                 | PO          |
| PO       | **Q6** — Vendor soft-deleted (`deleted_at IS NOT NULL`). Recomendado: `404` (heredar US-041 D4).                                                                                                                                                | Sí                 | PO          |
| PO/Sec   | **Q7** — Rate limiting endpoint público. Recomendado: `60 req/min` por IP usando middleware de PB-P0-007.                                                                                                                                       | Sí                 | PO/Sec      |

---

## 8. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                          | Decisión vigente                       | Acción recomendada                                                | ¿Bloquea aprobación? |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-VENDOR-003/REVIEW-006` | La US citaba `FR-VENDOR-007`.                                                | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/8 §UC-VENDOR-006`         | La US citaba `UC-VENDOR-007`.                                                | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/4 §BR-VENDOR-001/REVIEW-004` | La US citaba `BR-VENDOR-008`.                                                | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/10 §NFR-PERF-001`         | `NFR-PERF-WEB-001` no existe.                                                | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/15 §14.2`                 | JSON-LD listado como Should Have MVP; la US lo lista como Future.            | In scope MVP (D-Q2).                   | Housekeeping en US.                                                | No                   |
| `docs/15 §30.5`                 | URL con `[locale]` en US vs sin prefijo recomendado.                          | Sin prefijo (D-Q3).                    | Housekeeping en US.                                                | No                   |
| `docs/16 §M07`                  | Falta documentar `GET /api/v1/public/vendors/:slug`.                          | Documentar.                            | Actualizar `docs/16`.                                              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | `management/user-stories/US-046-public-vendor-profile-seo.md`                         |
| User Story ID verified                     | Yes                                                                                   |
| Decision Resolution artifact found         | No                                                                                    |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-046-decision-resolution.md`          |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-046-refinement-review.md`              |
| Final recommended status                   | Needs Refinement                                                                      |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                   |
| Reason                                     | 7 decisiones PO/Tech/Sec bloqueantes + trazabilidad estructuralmente incorrecta + desalineación con `docs/15` §14/§30. |

---

## 10. Cambios Aplicados o Recomendados

(Se aplicarán tras Decision Resolver.)

### Metadata
- `Backlog Item: PB-P1-029`. `Status: Ready for Approval`. `Last Updated: 2026-06-27`.

### Business Context
- Aclaración del modelo: Server Components + metadata + JSON-LD + ISR + endpoint público con rate limit.

### PO/BA Decisions Applied
- Sección con D1–D7.

### Traceability
- Corregir FR/UC/BR/NFR.

### Acceptance Criteria
- Reescribir AC-01/02/EC-01 + nuevos AC para JSON-LD, cache headers, rate limit, reviews.

### Technical Notes
- Backend: endpoint público con rate limit y response shape.
- Frontend: `generateMetadata` + JSON-LD.

### QA Notes
- TS para metadata + JSON-LD + cache + rate limit.

### Definition of Ready
- `PO/BA validó` ✅.

### Definition of Done
- TTFB < 500ms, JSON-LD válido, cache headers, rate limit, i18n.

### Notes
- Mover JSON-LD a in scope.

---

## 11. Recomendación Final

`Needs Refinement`.

US-046 requiere resolución explícita de siete decisiones PO/Tech/Sec y corrección estructural de trazabilidad antes de aprobación. Tras Decision Resolver, revalidar y aprobar.

```text
User Story file updated: No
Path: management/user-stories/US-046-public-vendor-profile-seo.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-046-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
