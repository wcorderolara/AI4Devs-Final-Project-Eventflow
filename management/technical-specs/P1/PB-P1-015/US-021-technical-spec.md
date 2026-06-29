# Technical Specification — US-021: Autocompletar brief de QuoteRequest con IA (AI-005)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-021 |
| Source User Story | `management/user-stories/US-021-ai-quote-brief-autocompletion.md` |
| Decision Resolution Artifact | No aplica (decisiones PO ya formalizadas: 8.1 #9, #15) |
| Priority | P1 |
| Backlog ID | PB-P1-015 |
| Backlog Title | AI Brief de cotización autocompletado (AI-005) |
| Backlog Execution Order | 33 (P0: 18 + posición 15 en P1) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-021 |
| Epic | EPIC-AIP-001 — AI-Assisted Event Planning |
| Backlog Item Dependencies | PB-P1-011, PB-P1-006, PB-P1-019, PB-P1-030, PB-P0-007, PB-P0-009, PB-P0-010, PB-P0-011, PB-P0-014 |
| Feature | AI-005 — Brief autocompletado de QuoteRequest |
| Module / Domain | AI / Quotes |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-26 |
| Last Updated | 2026-06-26 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-015 — AI Brief de cotización autocompletado (AI-005). Habilita el flujo AI-005 que genera un brief estructurado (`brief`, `requirements[]`, `questions[]`, `constraints[]`) para precargar el formulario "Nueva solicitud de cotización" del organizador. Depende de la fundación IA (PB-P0-009..011 + PB-P1-011), del catálogo activo `ServiceCategory` (PB-P1-019), del evento con datos completos (PB-P1-006) y conecta downstream con la creación de `QuoteRequest` (PB-P1-030 / US-023), la cual persiste el brief final con `ai_generated_brief=true` y `ai_recommendation_id`.

### Execution Order Rationale

Se ejecuta tras US-017/018/019/020 reutilizando toda la fundación IA (`LLMProvider`, `MockAIProvider`, `AIRecommendation`, prompt registry, rate limit `SEC-POL-AI-007`) sin migraciones nuevas. Es habilitador directo de PB-P1-030 (US-023) y desbloquea el embudo "Categorías → Brief → QuoteRequest". El handoff de persistencia final queda formalmente delegado a US-023.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-021 | Generación de brief estructurado con HITL editable | 1 |

---

## 3. Executive Technical Summary

Implementar `POST /api/v1/events/:eventId/ai/quote-brief` que orquesta `GenerateQuoteBriefUseCase`: valida ownership y estado del evento, valida que `service_category_code` exista y esté `is_active=true`, opcionalmente compone `vendor_summary` no sensible si `vendor_id` está aprobado, invoca `LLMProvider` con `QuoteBriefPrompt v1` (key `PROMPT-QUOTE-BRIEF-V1` en `ai_prompt_versions`), valida el JSON con Zod (`QuoteBriefOutputDto`: `brief ≤ 2.000` caracteres; `requirements/questions/constraints` arrays con ítems ≤ 240 caracteres y máx. 10 ítems), detecta PII del organizador (email, teléfono, dirección), aplica 1 reintento ante PII o JSON inválido (`NFR-AI-005`), persiste `AIRecommendation { type='quote_brief', status='pending', edited=false }` con metadata canónica completa y devuelve `200` con el brief precargable. **No** crea `QuoteRequest` ni ninguna entidad oficial (`FR-AI-012`). Aplica rate limit `SEC-POL-AI-007` (20/usuario/hora). Cadena de fallback: producción → error controlado; demo → `MockAIProvider` con `fallback_used=true`; último recurso (provider+Mock fallan) → plantilla estática por categoría. Toda invocación —exitosa o no— persiste `AIRecommendation` con metadata canónica. El frontend implementa `AIBriefAutocomplete` integrado al `QuoteRequestForm` en `/[locale]/organizer/events/:id/quotes/new` con badge "Sugerido por IA" por campo, acciones "Autocompletar IA", "Regenerar" y "Descartar", y handoff a US-023 al enviar.

---

## 4. Scope Boundary

### In Scope

* `POST /api/v1/events/:eventId/ai/quote-brief` con ownership + rate limit.
* `GenerateQuoteBriefUseCase` (lookup evento+categoría+vendor opcional, payload del prompt, invocación LLM, validación Zod, detección de PII, retry, fallback chain, persistencia).
* Registro de `QuoteBriefPrompt v1` (key `PROMPT-QUOTE-BRIEF-V1`) en `ai_prompt_versions` + archivo `prompts/QuoteBriefPrompt/v1.yaml`.
* Extensión de `MockAIProvider` con respuesta determinista para `quote_brief` por `(event_id, service_category_code, vendor_id?, language_code)` (`NFR-AI-008`).
* `QuoteBriefOutputValidator` (Zod estricto: `brief ≤ 2000`, ítems de arrays ≤ 240, máx. 10 por array).
* `OrganizerPiiDetector` (heurísticas regex: email, teléfono internacional, dirección postal del organizador).
* `VendorSummaryComposer` para incluir resumen público no sensible si `vendor_id` está provisto y aprobado.
* Persistencia transaccional de `AIRecommendation` (éxito y falla).
* Logging estructurado `ai.quote-brief.*` con `correlation_id` y métricas.
* Componente `AIBriefAutocomplete` integrado al `QuoteRequestForm` en `/[locale]/organizer/events/:id/quotes/new` con badge IA por campo y acciones "Regenerar" / "Descartar".
* Cliente `aiApi.generateQuoteBrief`, hook `useGenerateAIQuoteBrief`.
* i18n para 4 locales (`es`, `en`, `pt`, `fr`).
* Suite de pruebas: unit, integration, AI, autorización, rate limit, accesibilidad.

### Out of Scope

* Persistencia del brief final en `QuoteRequest.brief` con `ai_generated_brief=true` y `ai_recommendation_id` (delegado a US-023 / PB-P1-030).
* Endpoints comunes HITL `accept` / `edit` / `discard` / `reject` sobre `AIRecommendation` (cubiertos por US-025 / PB-P1-016; este endpoint solo deja el `AIRecommendation` en `pending`).
* `AnthropicProvider` operativo.
* Selección automática del proveedor objetivo (vendor) por la IA.
* Generación de adjuntos / referencias visuales con IA.
* Persistencia de feedback "no relevante" sobre el brief.
* Negociación automática con el proveedor.

### Explicit Non-Goals

* No tocar `quote_requests` (escritura): la creación es responsabilidad de US-023.
* No introducir migraciones nuevas.
* No introducir nuevos enums (`type='quote_brief'` ya existe en `ai_recommendation_type`).
* No introducir nuevos middlewares de rate limit (reutiliza el de PB-P0-007).
* No streaming de respuestas IA en MVP (recomendado, no obligatorio en `/docs/7`).

---

## 5. Architecture Alignment

### Backend Architecture

* Capa Interface: `AIQuoteBriefController.generate`.
* Capa Application: `GenerateQuoteBriefUseCase`, `QuoteBriefOutputValidator` (Zod), `OrganizerPiiDetector`, `VendorSummaryComposer`, `QuoteBriefAssembler`, `StaticQuoteBriefFallback` (plantilla por categoría).
* Capa Domain: `Event` (read), `ServiceCategory` (read activos), `VendorProfile` (read si aplica), `AIRecommendation` (creación), `AIPromptVersion` (lookup), `LLMProvider` port.
* Capa Infrastructure: `OpenAIProvider`, `MockAIProvider.quoteBrief` (extensión), `AIRecommendationPrismaRepository` (compartido US-017), `AIPromptVersionPrismaRepository` (compartido), `ServiceCategoryPrismaRepository.findActiveByCode` (reuso US-019/US-020), `VendorProfilePrismaRepository.findApprovedById` (read-only), `EventPrismaRepository.findOwnedById` (reuso US-017).
* Cross-cutting: `requireAuth`, `requireRole('organizer')`, ownership guard, `aiRateLimitMiddleware`, `withCorrelationId`, error mapper unificado.
* Transacción: insert de `AIRecommendation` dentro de `prisma.$transaction` (sin tocar otras entidades; la persistencia del brief final en `QuoteRequest` es de US-023).

### Frontend Architecture

* Next.js App Router; client component `AIBriefAutocomplete` integrado a `QuoteRequestForm` en `/[locale]/organizer/events/[id]/quotes/new/page.tsx`.
* `useGenerateAIQuoteBrief` (TanStack `useMutation`) con `queryKey: ['ai','event', eventId, 'quote-brief', service_category_code, vendor_id?]`.
* Reuso de `AIBadge` (US-017); nuevo `AIBriefField` (textarea + badge IA).
* React Hook Form + Zod (`quoteRequestFormSchema`).
* `next-intl` para 4 locales.

### Database Architecture

* Tablas afectadas (sin cambios estructurales):
  * `ai_recommendations` (insert, `type='quote_brief'`).
  * `ai_prompt_versions` (read; semilla de `QuoteBriefPrompt v1`).
  * `events` (read).
  * `service_categories` (read; `is_active=true`).
  * `vendor_profiles` (read si `vendor_id` provisto; `status='approved'`).
* Reutiliza enums (`ai_recommendation_status`, `ai_recommendation_type`).
* Reutiliza índices entregados por PB-P0-001 / US-101 (`(event_id, type, status, created_at)`).

### API Architecture

* REST JSON `/api/v1` (`ADR-API-001`).
* `POST /api/v1/events/:eventId/ai/quote-brief` (canónico en `/docs/16` §35).
* Respuestas: `200`, `400`, `401`, `403`, `404`, `409`, `429`, `5xx` con envelope unificado y `x-correlation-id`.

### AI / PromptOps Architecture

* Prompt: `QuoteBriefPrompt v1`, key `PROMPT-QUOTE-BRIEF-V1`, archivo `prompts/QuoteBriefPrompt/v1.yaml` + registro en `ai_prompt_versions` (US-121).
* Reuso del port `LLMProvider`.
* Selección de provider por env (`LLM_PROVIDER`, `AI_DEMO_MODE`).
* Reintento de validación: 1 sola vez si falla Zod o si el detector de PII bloquea (`NFR-AI-005`).
* Fallback chain canónica: producción → error controlado; demo → `MockAIProvider`; último recurso (provider+Mock fallan) → `StaticQuoteBriefFallback` por categoría.
* Persistencia siempre (éxito y falla), dentro de transacción.

### Security Architecture

* Backend como source of truth; cookies HTTP-Only signed (`ADR-SEC-002`).
* RBAC `requireRole('organizer')` + ownership guard.
* Rate limit `SEC-POL-AI-007` (20/usuario/hora) compartido con el resto de endpoints IA.
* `OPENAI_API_KEY` solo en backend vía Secrets Manager.
* Redacción de PII en logs (no se loguea el contenido del brief crudo; solo metadata).
* Prompt y output prohíben incluir email/teléfono/dirección del organizador.

### Testing Architecture

* Unit: use case + validator + PII detector + vendor summary composer + assembler + static fallback.
* Integration: endpoint contra BD test + `MockAIProvider`.
* AI tests: timeout, retry, fallback chain (provider→Mock→estática), rate limit, PII bloqueada y retry, JSON inválido y retry.
* Autorización: AUTH-TS-01..05 + matriz NT.
* E2E Playwright con seed (precarga + edición + handoff a US-023).
* A11y con axe sobre el formulario.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01: Brief generado con HITL pending | Pipeline: ownership → estado del evento → lookup `ServiceCategory` activa → lookup `VendorProfile` aprobado si aplica → lookup prompt activo → invocar `LLMProvider` con payload → validar Zod → detector PII → persistir `AIRecommendation(pending)` → `200` con `QuoteBriefOutputDto + ai_recommendation_id`. Nunca crea `QuoteRequest`. | Backend, DB, API, Frontend |
| AC-02: Precarga editable del formulario | Cliente recibe el payload y prefilla `QuoteRequestForm`; `AIBriefField` muestra badge "Sugerido por IA" por sección y permite edición libre. | Frontend |
| AC-03: Idioma respetado | Payload incluye `language_code=event.language_code`; `MockAIProvider` determinista por idioma; persistir `language_code` en `AIRecommendation`. | Backend, AI, DB |
| AC-04: Trazabilidad completa | Insert con metadata canónica completa (`prompt_version_id`, `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms`, `correlation_id`, `event_id`, `service_category_code`, `vendor_id?`). | Backend, DB, OBS |
| AC-05: Sin PII del organizador | `OrganizerPiiDetector` escanea `brief` y arrays. Si detecta PII → reintenta una vez con prompt reforzado; si persiste → `AI_INVALID_OUTPUT` + `AIRecommendation { status='failed' }`. | Backend, AI, Security |
| EC-01: Descartar pre-envío | UI vacía el form e invoca endpoint común HITL (US-025) que setea `AIRecommendation.status='discarded'`. Este endpoint no maneja descartes. | Frontend, Backend (delegado) |
| EC-02: Regenerar brief | Nueva invocación crea `AIRecommendation` nuevo (`pending`); el anterior conserva su `status`. UI confirma si había ediciones manuales. | Backend, Frontend |
| EC-03: Categoría inválida/inactiva | `ServiceCategoryRepository.findActiveByCode` → `null` ⇒ `404 NOT_FOUND` antes de invocar al LLM, sin consumir cuota ni persistir `AIRecommendation`. | Backend, API |
| EC-04: Timeout 60s | Prod: `AI_TIMEOUT` + `AIRecommendation { status='failed', fallback_used=false }`. Demo: fallback Mock + `fallback_used=true`. | Backend, AI |
| EC-05: Provider error | Prod: `AI_PROVIDER_ERROR`. Demo: Mock. Si ambos fallan → `StaticQuoteBriefFallback` por `service_category_code` + `AIRecommendation { status='failed', fallback_used=true }`. | Backend, AI |
| EC-06: JSON inválido del LLM | Zod falla → retry con prompt reforzado (`NFR-AI-005`). Si vuelve a fallar → `AI_INVALID_OUTPUT` + `failed`. | Backend, AI |
| EC-07: Rate limit excedido | Middleware `aiRateLimitMiddleware` → `429 RATE_LIMITED` con `Retry-After`, sin invocar LLM ni persistir `AIRecommendation`. | Backend, Security |
| VR-01..09 | Validación Zod (path/body/output) + invariantes + chequeo de estado + invariantes del output IA. | Backend, API |
| SEC-01..07 | Middlewares + Secrets Manager + redacción de PII en logs + PII guard sobre output. | Backend, Security, OPS |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `modules/ai/quote-brief/`:
  * `interface/AIQuoteBriefController.ts`
  * `application/GenerateQuoteBriefUseCase.ts`
  * `application/QuoteBriefOutputValidator.ts`
  * `application/OrganizerPiiDetector.ts`
  * `application/VendorSummaryComposer.ts`
  * `application/QuoteBriefAssembler.ts`
  * `application/StaticQuoteBriefFallback.ts`
  * `infrastructure/prompts/quote-brief.v1.yaml`
* Reuso de `modules/ai/llm-provider/`, `modules/ai/prompt-registry/`, `modules/ai/recommendations/` (US-017).
* Reuso de `EventPrismaRepository.findOwnedById` (US-017), `ServiceCategoryPrismaRepository.findActiveByCode` (US-019/US-020), `VendorProfilePrismaRepository.findApprovedById`.

### Use Cases / Application Services

* `GenerateQuoteBriefUseCase.execute({ eventId, serviceCategoryCode, vendorId?, actor, correlationId })`:
  1. `EventRepository.findOwnedById(eventId, actor.id)` → `Event | null`. Si `null` → `404`/`403`.
  2. Validar `event.status ∉ {cancelled, completed, deleted}` → `409 CONFLICT` si no.
  3. `ServiceCategoryRepository.findActiveByCode(serviceCategoryCode)` → `null` ⇒ `404 NOT_FOUND` antes de invocar al LLM.
  4. Si `vendorId` provisto: `VendorProfileRepository.findApprovedById(vendorId)` → si `null` ⇒ `404 NOT_FOUND`.
  5. `vendorSummary = VendorSummaryComposer.compose(vendorProfile?)` — solo datos públicos no sensibles.
  6. `AIPromptVersionRepository.findActiveByPromptKey('PROMPT-QUOTE-BRIEF-V1')`.
  7. `LLMProvider.generateStructured(prompt, payload, QuoteBriefOutputSchema, { timeoutMs: 60_000 })` — payload con campos del evento + categoría + `vendorSummary?`.
  8. Validación: Zod schema + `OrganizerPiiDetector.scan(output, organizerPiiSet)`. Si falla → 1 reintento con prompt reforzado (refuerza "no incluir PII", "respetar invariantes del schema").
  9. Si tras reintento persiste falla → `AIInvalidOutputError` y persistir `AIRecommendation { status='failed' }`.
  10. Fallback chain ante timeout/provider error:
      * Producción → `AITimeoutError` / `AIProviderError` + `failed`.
      * Demo → `MockAIProvider` (`fallback_used=true`).
      * Si Mock también falla → `StaticQuoteBriefFallback.byCategory(serviceCategoryCode, language)` + `failed` + `fallback_used=true`.
  11. Insert `AIRecommendation { type='quote_brief', status='pending', edited=false, ... }` dentro de `prisma.$transaction`.
  12. Retornar `QuoteBriefResponseDTO`.

* `QuoteBriefOutputValidator`: Zod + `superRefine` (invariantes de longitud y cardinalidad).
* `OrganizerPiiDetector.scan(output, organizerPiiSet)`: regex pura para email (`/[\w.+-]+@[\w-]+\.[\w.-]+/`), teléfono (E.164 y formatos comunes), dirección postal (heurística por palabras clave + matching contra calle del organizador si conocida); retorna `{ ok: boolean, matches: string[] }`. Testeable como unidad pura.
* `VendorSummaryComposer.compose(vendorProfile?)`: extrae solo `categories_served[]`, `city`, `languages[]`, `public_packages[]`; nunca email, teléfono ni nombre del titular.
* `QuoteBriefAssembler`: mapea `AIRecommendation` + output a `QuoteBriefResponseDTO`.
* `StaticQuoteBriefFallback.byCategory(serviceCategoryCode, languageCode)`: plantillas estáticas por categoría e idioma (registro `prompts/QuoteBriefPrompt/static-templates.json`).

### Controllers / Routes

* `AIQuoteBriefController.generate`: stack `requireAuth`, `requireRole('organizer')`, `validateParams`, `validateBody`, `aiRateLimitMiddleware`, `withCorrelationId`; mapping de errores → envelope unificado.

### DTOs / Schemas

* `eventQuoteBriefParamsSchema`: `{ eventId: z.string().uuid() }`.
* `quoteBriefRequestBodySchema`:
  ```ts
  z.object({
    service_category_code: z.string().min(1),
    vendor_id: z.string().uuid().optional()
  }).strict()
  ```
* `QuoteBriefInputSchema` (payload al prompt):
  ```ts
  z.object({
    event_type_code: z.string(),
    event_date: z.string(), // ISO
    guest_count: z.number().int().positive(),
    budget_estimated: z.number().nonnegative(),
    currency_code: z.string().length(3),
    city: z.string().min(1),
    language_code: z.enum(['es','en','pt','fr']),
    service_category: z.object({ code: z.string(), name: z.string() }),
    vendor_summary: z.object({
      categories_served: z.array(z.string()).optional(),
      city: z.string().optional(),
      languages: z.array(z.string()).optional(),
      public_packages: z.array(z.object({ name: z.string(), description: z.string().optional() })).optional()
    }).optional()
  }).strict()
  ```
* `QuoteBriefOutputSchema` (canónico `/docs/16` líneas 1600–1605):
  ```ts
  z.object({
    brief: z.string().min(1).max(2000),
    requirements: z.array(z.string().min(1).max(240)).max(10),
    questions: z.array(z.string().min(1).max(240)).max(10),
    constraints: z.array(z.string().min(1).max(240)).max(10)
  }).strict()
  ```
* `QuoteBriefResponseDTO`:
  ```ts
  {
    recommendation: {
      id: string;
      type: 'quote_brief';
      status: 'pending';
      edited: false;
      created_at: string;
      prompt_version_id: string;
      llm_provider: 'openai'|'mock'|'static';
      language_code: 'es'|'en'|'pt'|'fr';
      latency_ms: number;
      fallback_used: boolean;
      timeout_ms: number;
    };
    brief: string;
    requirements: string[];
    questions: string[];
    constraints: string[];
  }
  ```

### Repository / Persistence

* `EventPrismaRepository.findOwnedById` (reuso US-017).
* `ServiceCategoryPrismaRepository.findActiveByCode` (reuso US-019/US-020).
* `VendorProfilePrismaRepository.findApprovedById` (read-only nuevo helper si no existe; status `approved`).
* `AIRecommendationPrismaRepository.create` (compartido).
* `AIPromptVersionPrismaRepository.findActiveByPromptKey` (compartido).

### Validation Rules

* VR-01..09 mapeados como `400`/`404`/`409`/filtrado interno (truncar/retry) según severidad.
* `language_code` derivado del evento; si no soportado → `400 VALIDATION`.

### Error Handling

* Mismo set que US-017..US-020: `NotFoundError`, `ForbiddenError`, `ConflictError`, `ZodError`, `AIRateLimitError`, `AITimeoutError`, `AIInvalidOutputError`, `AIProviderError`, `AIPiiDetectedError` (mapeado internamente a `AIInvalidOutputError` tras retry).

### Transactions

* `prisma.$transaction` envuelve solo el insert de `AIRecommendation`.

### Observability

* Logs `ai.quote-brief.requested|generated|failed|fallback|invalid_output|pii_detected|rate_limited` con `correlation_id` y metadata canónica (sin contenido del brief).
* Métricas: contadores por `provider`, `fallback_used`, `result`, `pii_detected_count`; histograma de latencia.

---

## 8. Frontend Technical Design

### Routes / Pages

* `/[locale]/organizer/events/[id]/quotes/new/page.tsx` (Client Component para el flujo HITL).

### Components

* `QuoteRequestForm` (contenedor del formulario; el envío final pertenece a US-023).
* `AIBriefAutocomplete` (CTA "Autocompletar con IA", "Regenerar", "Descartar" + skeletons + banners de error).
* `AIBriefField` (textarea + badge IA por sección: `brief`, `requirements`, `questions`, `constraints`).
* `AIBadge` (reusado de US-017).

### Forms

* React Hook Form + Zod (`quoteRequestFormSchema`). Campos: `service_category_code` (requerido), `vendor_id?` (opcional), `brief`, `requirements[]`, `questions[]`, `constraints[]`.
* Confirmación al "Regenerar" si hay ediciones manuales.

### State Management

* `useGenerateAIQuoteBrief(eventId)` (TanStack `useMutation`).
* `queryKey: ['ai','event', eventId, 'quote-brief', service_category_code, vendor_id?]`.

### Data Fetching

* `aiApi.generateQuoteBrief({ eventId, serviceCategoryCode, vendorId? })` con cookie auth.
* Envío de `QuoteRequest` posterior usa `quotesApi.createRequest` (delegado a US-023).

### Loading / Empty / Error / Success States

* Empty: formulario vacío con CTA "Autocompletar con IA".
* Loading: skeleton + "Generando brief con IA. Puede tomar hasta 60 segundos." con `aria-live="polite"`.
* Error: banner por `error.code` (`AI_TIMEOUT`, `AI_INVALID_OUTPUT`, `AI_PROVIDER_ERROR`, `RATE_LIMITED`, `VALIDATION`, `CONFLICT`, `NOT_FOUND`).
* Success: formulario precargado con badge "Sugerido por IA" por sección.

### Accessibility

* Cada campo del brief con `label` y `aria-describedby` mencionando "Editable".
* Badge IA con `aria-label="Contenido generado por IA, editable"`.
* Anuncio `aria-live="polite"` al completarse la generación.
* Navegación por teclado para "Regenerar" / "Descartar" / "Enviar".
* Contraste WCAG AA en badges.

### i18n

* Claves `ai.quoteBrief.*` (CTAs, banners, headings, errores) en 4 locales.
* El contenido del brief queda en `event.language_code`; el copy de UI en `locale` de la app.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/events/:eventId/ai/quote-brief` | Generar brief estructurado IA para `QuoteRequest` | Yes — Organizer dueño | Path: `eventId: uuid`. Body: `{ service_category_code: string, vendor_id?: uuid }`. | `200 OK` con `QuoteBriefResponseDTO`. Header `x-correlation-id`. | `400 VALIDATION`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND` (evento/categoría/vendor), `409 CONFLICT` (estado de evento), `429 RATE_LIMITED` (con `Retry-After`), `5xx AI_TIMEOUT`/`AI_INVALID_OUTPUT`/`AI_PROVIDER_ERROR`. |

Documentation Alignment Required: regenerar snapshot OpenAPI vía US-098.

---

## 10. Database / Prisma Design

### Models Impacted

* `Event` (read), `AIRecommendation` (insert), `AIPromptVersion` (read), `ServiceCategory` (read), `VendorProfile` (read si aplica). `QuoteRequest` no se toca en esta US (delegado a US-023).

### Fields / Columns

* `ai_recommendations.type='quote_brief'`; metadata canónica completa (`event_id`, `service_category_code`, `vendor_id?` en metadata JSON, `prompt_version_id`, `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms`, `correlation_id`, `status`, `edited`).

### Relations

* `ai_recommendations.event_id → events.id`.
* `ai_recommendations.prompt_version_id → ai_prompt_versions.id`.

### Indexes

* Sin nuevos índices (reutiliza `(event_id, type, status, created_at)`).

### Constraints

* Enum `ai_recommendation_type` ya incluye `'quote_brief'`.

### Migrations Impact

* Sin migraciones nuevas.
* Semilla del prompt vía registry US-121.

### Seed Impact

* Sembrar `QuoteBriefPrompt v1` (`PROMPT-QUOTE-BRIEF-V1`).
* Asegurar al menos un evento por idioma con datos completos y una categoría destino activa.
* Asegurar un `VendorProfile` aprobado por categoría para escenarios con `vendor_id`.

---

## 11. AI / PromptOps Design

### AI Feature

AI-005 — Generación de brief de cotización.

### Provider

`OpenAIProvider` (principal) / `MockAIProvider` (demo y tests) / `AnthropicProvider` stub (no operativo).

### Prompt Version

* Key: `PROMPT-QUOTE-BRIEF-V1`.
* Archivo: `prompts/QuoteBriefPrompt/v1.yaml`.
* Trazabilidad: `FR-AI-005`, `BR-AI-008..010`, `NFR-AI-005`.

### Input Schema

`QuoteBriefInputSchema` (§7), con `vendor_summary` opcional no sensible.

### Output Schema

`QuoteBriefOutputSchema` (§7) — DTO canónico de `/docs/16` líneas 1600–1605.

### Human-in-the-loop

* `AIRecommendation.status='pending'` y `edited=false`.
* No se crean entidades downstream sin acción humana (`FR-AI-012`).
* La persistencia final en `QuoteRequest.brief` con `ai_generated_brief=true` y `ai_recommendation_id` corresponde a US-023.
* Aceptación/descarte vía endpoints comunes HITL (US-025).

### Fallback

* Demo: timeout/provider error → `MockAIProvider`.
* Prod: error explícito.
* Último recurso (provider + Mock fallan): `StaticQuoteBriefFallback` por categoría.
* Documentation Alignment: cadena canónica aclarada respecto a `/docs/7` (la "plantilla estática" queda como último recurso, no como fallback primario).

### Persistence

* Siempre persistir `AIRecommendation` con metadata, incluso en falla.
* Cada regeneración crea un nuevo `AIRecommendation`; el anterior preserva su `status`.

### Safety Rules

* `OrganizerPiiDetector` enforce ausencia de email/teléfono/dirección del organizador en el output (`UC-AI-006` QA notes, `BR-AI-002`).
* Sin decisiones autónomas; sin RAG; sin streaming en MVP.
* Logs sin contenido del brief crudo (solo metadata).
* Secretos solo en backend.

---

## 12. Security & Authorization Design

### Authentication

Cookie HTTP-Only signed (`ADR-SEC-002`).

### Authorization

`requireRole('organizer')` + ownership guard sobre `Event`.

### Ownership Rules

`event.owner_user_id === actor.id`.

### Role Rules

* Organizer dueño → `200`.
* Otros → `403`/`401`.

### Negative Authorization Scenarios

* Organizer no dueño → `403`/`404`.
* Vendor autenticado → `403`.
* Admin autenticado → `403`.
* Anónimo → `401`.
* Exceso de rate → `429 RATE_LIMITED` con `Retry-After`.

### Audit Requirements

* No `AdminAction`.
* `AIRecommendation` actúa como audit trail (siempre persistido).

### Sensitive Data Handling

* PII del organizador prohibida en el brief (enforcement por detector).
* Redacción de PII en logs (no se loguea el contenido del brief).
* `OPENAI_API_KEY` solo en backend vía Secrets Manager.
* Prompt no incluye documento del organizador ni credenciales.

---

## 13. Testing Strategy

### Unit Tests

* `GenerateQuoteBriefUseCase` con repos/provider mockeados (happy + ramas de error: categoría inválida, vendor inválido, timeout prod/demo, provider error prod/demo, PII detectada con/ sin retry, JSON inválido con/sin retry, rate limit).
* `QuoteBriefOutputValidator` (longitud `brief`, longitud por ítem, cardinalidad máx. 10).
* `OrganizerPiiDetector` (email, teléfono internacional, dirección postal).
* `VendorSummaryComposer` (omisión de campos sensibles).
* `QuoteBriefAssembler` (mapeo).
* `StaticQuoteBriefFallback` (cobertura por categoría e idioma).

### Integration Tests

* TS-01 happy + persistencia del `AIRecommendation` con metadata completa.
* TS-02 verificación de campos canónicos (`prompt_version_id`, `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms`, `correlation_id`).
* TS-03 `language_code='pt'` → contenido en pt.
* TS-04 `vendor_id` válido incluye contexto del proveedor en el payload.
* TS-06 EC-01 delegado a US-025 (verificar contrato del endpoint común HITL).
* TS-07 EC-02 regenerar crea un nuevo `AIRecommendation`.

### API Tests

* NT-01..08 (matriz negativa).
* AUTH-TS-01..05.

### E2E Tests

* TS-05: organizer abre el formulario, autocompleta con IA, edita y envía la `QuoteRequest` (handoff a US-023) — Playwright + seed + Mock.

### Security Tests

* AI-TS-10: rate limit → `429 RATE_LIMITED` + `Retry-After`.
* SEC-03/SEC-07: logs sin PII; output sin PII.

### Accessibility Tests

* axe sobre `/[locale]/organizer/events/[id]/quotes/new`.

### AI Tests

* AI-TS-01: Mock determinista → output válido y pending.
* AI-TS-02: PII en output → retry exitoso.
* AI-TS-03: PII en output tras retry → `AI_INVALID_OUTPUT` + failed.
* AI-TS-04: JSON inválido → retry exitoso.
* AI-TS-05: Timeout prod → `AI_TIMEOUT` + failed.
* AI-TS-06: Timeout demo → fallback Mock + `fallback_used=true`.
* AI-TS-07: Provider 5xx → fallback Mock en demo.
* AI-TS-08: Provider 5xx en prod → `AI_PROVIDER_ERROR`.
* AI-TS-09: Provider + Mock fallan → `StaticQuoteBriefFallback` + failed + `fallback_used=true`.
* AI-TS-11: Mock determinista (snapshot por evento+categoría+idioma).

### Seed / Demo Tests

* Verificar `QuoteBriefPrompt v1` activo en `ai_prompt_versions`.
* Verificar evento por idioma con categoría destino activa y `VendorProfile` aprobado.

### CI Checks

* Quality gates de PB-P1-024 / US-132.

---

## 14. Observability & Audit

### Logs

* `ai.quote-brief.requested|generated|failed|fallback|invalid_output|pii_detected|rate_limited` con `correlation_id`, `event_id`, `service_category_code`, `vendor_id?`, `language_code`, `latency_ms`, `fallback_used`, `result`, `pii_detected_count` (sin contenido del brief).

### Correlation ID

* `withCorrelationId` propaga `x-correlation-id` al log y al `AIRecommendation.correlation_id`.

### AdminAction

No aplica.

### Error Tracking

* Errores no controlados al pipeline estándar (Sentry equivalente).

### Metrics

* Contadores por `provider`, `fallback_used`, `result`, `pii_detected_count`; histograma de latencia (`NFR-OBS-001`).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* `QuoteBriefPrompt v1` activo en `ai_prompt_versions` (key `PROMPT-QUOTE-BRIEF-V1`).
* Plantillas estáticas por categoría e idioma para `StaticQuoteBriefFallback`.
* Al menos un evento por idioma (`es`, `en`, `pt`, `fr`) con datos completos.
* Catálogo `service_categories` activo (PB-P1-019).
* Al menos un `VendorProfile` aprobado por categoría para escenarios con `vendor_id`.

### Demo Scenario Supported

* "Organizer entra al formulario de nueva `QuoteRequest`, hace clic en 'Autocompletar con IA', revisa el brief y se prepara para enviarlo (handoff a US-023)".

### Reset / Isolation Notes

* `ai_recommendations` se truncate en reset demo; `service_categories`, `vendor_profiles` y `ai_prompt_versions` se conservan.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `/docs/8-Use-Cases-Specification.md` | `UC-AI-005` está etiquetado para categorías y describe el brief en `UC-AI-006`; el FRD mapea canónicamente `FR-AI-005 → UC-AI-005` para el brief. | Mantener autoridad del FRD. | Cleanup editorial en `/docs/8`. | No |
| `/docs/16-API-Design-Specification.md` | Confirmar snapshot OpenAPI con el endpoint y `QuoteBriefOutputDto`. | Endpoint y DTO canónicos documentados. | Regenerar snapshot vía US-098. | No |
| `/docs/7-AI-Features-Specification.md` | AI-005 menciona fallback "plantilla estática"; la cadena canónica acordada es prod=error / demo=Mock / último recurso=estática. | Documentar la cadena formalmente. | Aclaración liviana en `/docs/7`. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| LLM filtra PII del organizador en el brief | Riesgo legal/UX. | `OrganizerPiiDetector` + retry + plantilla estática como último recurso; tests dedicados. |
| Output excede longitud (`brief > 2000` o ítems > 240) | Validación falla. | Schema Zod estricto + invariantes documentadas en el prompt + tests. |
| Latencia LLM cercana al timeout (60s) | Timeouts frecuentes. | Métricas + fallback Mock solo en demo + comunicación clara en UI ("hasta 60 segundos"). |
| `vendor_summary` filtra datos sensibles del vendor | Privacidad. | `VendorSummaryComposer` solo expone campos públicos no sensibles; tests dedicados. |
| Cambios en el catálogo `ServiceCategory` durante la sesión | Inconsistencia. | Validación previa a invocar al LLM; resolver `code` al inicio del use case. |
| Confusión entre persistencia del brief y creación de `QuoteRequest` | Doble responsabilidad. | Esta US solo persiste `AIRecommendation`; la persistencia del brief final queda en US-023, documentada explícitamente. |

---

## 18. Implementation Guidance for Coding Agents

### Files or folders likely impacted

* Backend:
  * `apps/api/src/modules/ai/quote-brief/interface/AIQuoteBriefController.ts`
  * `apps/api/src/modules/ai/quote-brief/application/GenerateQuoteBriefUseCase.ts`
  * `apps/api/src/modules/ai/quote-brief/application/QuoteBriefOutputValidator.ts`
  * `apps/api/src/modules/ai/quote-brief/application/OrganizerPiiDetector.ts`
  * `apps/api/src/modules/ai/quote-brief/application/VendorSummaryComposer.ts`
  * `apps/api/src/modules/ai/quote-brief/application/QuoteBriefAssembler.ts`
  * `apps/api/src/modules/ai/quote-brief/application/StaticQuoteBriefFallback.ts`
  * `apps/api/src/modules/ai/quote-brief/infrastructure/prompts/quote-brief.v1.yaml`
  * `apps/api/src/modules/ai/quote-brief/infrastructure/prompts/static-templates.json`
  * `apps/api/src/modules/ai/llm-provider/MockAIProvider.quoteBrief.ts` (extensión)
  * `apps/api/src/routes/events/ai.routes.ts` (alta de la ruta)
* Frontend:
  * `apps/web/src/features/ai/quote-brief/components/AIBriefAutocomplete.tsx`
  * `apps/web/src/features/ai/quote-brief/components/AIBriefField.tsx`
  * `apps/web/src/features/quotes/components/QuoteRequestForm.tsx`
  * `apps/web/src/features/ai/quote-brief/hooks/useGenerateAIQuoteBrief.ts`
  * `apps/web/src/features/ai/quote-brief/api/aiApi.generateQuoteBrief.ts`
  * Integración en `apps/web/src/app/[locale]/organizer/events/[id]/quotes/new/page.tsx`
  * `apps/web/src/i18n/messages/{es,en,pt,fr}/ai.quote-brief.json`

(Rutas exactas según convención feature-first.)

### Recommended order of implementation

1. Verificar fundación IA (US-017), rate limit (US-018), `ServiceCategoryRepository.findActiveByCode` (US-019/US-020) y `EventRepository.findOwnedById` (US-017).
2. Registrar `QuoteBriefPrompt v1` (`PROMPT-QUOTE-BRIEF-V1`) en `ai_prompt_versions` y `prompts/QuoteBriefPrompt/v1.yaml`.
3. Implementar `OrganizerPiiDetector` y `VendorSummaryComposer` (puros, testeables).
4. Implementar `QuoteBriefOutputValidator` y `StaticQuoteBriefFallback`.
5. Extender `MockAIProvider` con respuesta determinista para `quote_brief` por idioma + categoría.
6. Implementar `GenerateQuoteBriefUseCase` con la cadena de fallback completa.
7. Implementar `AIQuoteBriefController` + middlewares + rate limit + error mapping.
8. Tests unitarios y de integración.
9. Implementar cliente, hook, componentes UI y `QuoteRequestForm` (sin envío final).
10. i18n + a11y + telemetría.
11. E2E con seed (precarga + edición + handoff a US-023).

### Decisions that must not be reopened

* Timeout 60 s (PO 8.1 #9); `AnthropicProvider` solo stub (PO 8.1 #15); HITL solo `AIRecommendation`; endpoint canónico `POST /api/v1/events/:eventId/ai/quote-brief`; `AIRecommendation.type='quote_brief'`; status enum canónico; rate limit `SEC-POL-AI-007` (20/h); `QuoteBriefOutputDto` canónico de `/docs/16`; cadena de fallback prod→error / demo→Mock / último recurso→estática; persistencia del brief final delegada a US-023; descartes/aceptaciones vía endpoints comunes HITL US-025.

### What must not be implemented

* Creación de `QuoteRequest` ni escritura sobre `quote_requests` (US-023).
* Endpoints de `accept`/`edit`/`discard`/`reject` sobre `AIRecommendation` (US-025).
* `AnthropicProvider` operativo.
* RAG / vector DB / streaming de respuestas IA en MVP.
* Negociación automática con vendor.
* Feedback "no relevante" persistente.

### Assumptions to preserve

* `ServiceCategory` provee catálogo curado con `is_active`.
* `MockAIProvider` siempre disponible.
* La fundación IA (`AIRecommendation`, prompt registry, rate limit) está operativa por US-017 y dependencias P0.
* `VendorProfile` solo se expone como `vendor_summary` no sensible.

---

## 19. Task Generation Notes

### Suggested task groups

* AI: prompt v1, Mock determinista, validator, PII detector, vendor summary composer, fallback estática.
* BE: use case, controller, repos, assembler.
* API: schemas Zod (path/body/output) y envelope unificado.
* SEC: rate limit; Secrets Manager; redacción de PII en logs; PII guard sobre output.
* FE: `AIBriefAutocomplete`, `AIBriefField`, hook, cliente, `QuoteRequestForm` (sin submit), i18n, a11y, telemetría.
* OBS: logs + métricas + correlation ID.
* QA: unit, integration, AI behaviors, autorización, rate limit, PII tests, E2E, a11y.
* SEED: prompt + plantillas estáticas + eventos por idioma + categoría + vendor aprobado.
* DOC: snapshot OpenAPI (US-098) + aclaración `/docs/8` (UC-AI-005 vs UC-AI-006) + aclaración `/docs/7` (cadena de fallback).

### Required QA tasks

* Suite IA con Mock; tests de PII (output limpio, retry, falla); tests de fallback chain; rate limit; E2E precarga + edición + handoff; a11y.

### Required security tasks

* Rate limit; Secrets/PII redaction en logs; PII guard sobre output.

### Required seed/demo tasks

* Verificación de prompt v1, plantillas estáticas, eventos por idioma, categoría destino activa, `VendorProfile` aprobado.

### Required documentation tasks

* OpenAPI vía US-098; aclaración `/docs/8` y `/docs/7`.

### Dependencies between tasks

* FE depende de BE/API (MSW en local mientras BE no esté).
* QA E2E depende de FE + seed + Mock determinista.
* SEC depende de BE-controller + middleware.
* AI tasks (prompt, Mock, detector) preceden al use case.
* US-023 (creación de `QuoteRequest`) consume el contrato `ai_recommendation_id` + brief final.

### Whether the parent backlog item should later generate a consolidated `tasks.md`

* PB-P1-015 tiene una sola US; no se requiere `tasks.md` consolidado.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass |
| DB impact clear | Pass |
| AI impact clear | Pass |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown.** US aprobada (Approved with Minor Notes), mapeo a PB-P1-015 confirmado (execution order 33), decisiones formalizadas (PO 8.1 #9/#15, BR-AI-001..011, BR-QUOTE-002/003/008, NFR-AI-001/003/005/007/008, SEC-POL-AI-007), arquitectura cubierta por la fundación IA sin migraciones nuevas y handoff explícito a US-023 para la persistencia final en `QuoteRequest.brief`. Las alineaciones documentales (`/docs/8`, `/docs/16`, `/docs/7`) se atienden como tareas ligeras y no bloquean el breakdown.
