# 🧾 User Story: Autocompletar brief de QuoteRequest con IA (AI-005)

## 🆔 Metadata

| Field              | Value                                                  |
| ------------------ | ------------------------------------------------------ |
| ID                 | US-021                                                 |
| Epic               | EPIC-AIP-001 — AI-Assisted Event Planning              |
| Backlog Item       | PB-P1-015 — AI Brief de cotización autocompletado (AI-005) |
| UI Surface         | Formulario "Nueva solicitud de cotización" del organizador |
| Feature            | AI-005 — Brief autocompletado de QuoteRequest          |
| Module / Domain    | AI / Quotes                                            |
| User Role          | Organizer                                              |
| Priority           | Must Have                                              |
| Status             | Approved                                               |
| Owner              | Product Owner / Business Analyst                       |
| Approved By        | PO/BA Review                                            |
| Approval Date      | 2026-06-26                                             |
| Ready for Development Tasks | Yes                                            |
| Sprint / Milestone | MVP                                                    |
| Created Date       | 2026-06-09                                             |
| Last Updated       | 2026-06-26                                             |

---

## 🎯 User Story

**As an** organizador a punto de enviar una `QuoteRequest` a un proveedor
**I want** que la IA autocomplete un brief estructurado (resumen, requerimientos, preguntas, restricciones) a partir del evento y la categoría
**So that** envíe solicitudes claras y consistentes sin escribir todo desde cero

---

## 🧠 Business Context

### Context Summary

AI-005 genera un brief estructurado (`brief`, `requirements[]`, `questions[]`, `constraints[]`) que precarga el formulario de creación de `QuoteRequest`. El backend invoca al `LLMProvider` con `QuoteBriefPrompt v1`, valida el JSON con Zod, persiste `AIRecommendation { type='quote_brief', status='pending' }` y devuelve el brief editable. El organizador puede aceptar, editar o descartar el contenido antes de enviar la `QuoteRequest` (HITL). Al enviarse la solicitud (US-023 / PB-P1-030), el brief final pasa a `QuoteRequest.brief` con `ai_generated_brief=true` y `ai_recommendation_id` poblado.

### Related Domain Concepts

* `AIRecommendation { type='quote_brief', status='pending' }`.
* `LLMProvider` (`OpenAIProvider` / `MockAIProvider` / `AnthropicProvider` stub).
* `QuoteRequest` (`brief`, `ai_generated_brief`, `ai_recommendation_id`).
* `ServiceCategory` (categoría destino del brief, debe estar `is_active=true`).
* `AIPromptVersion` (`QuoteBriefPrompt v1`).

### Assumptions

* El organizador ya seleccionó la categoría de proveedor objetivo (`service_category_code`) antes de pedir el brief.
* La categoría debe existir en el catálogo y estar `is_active=true` (`BR-SERVICE-001`).
* El idioma del evento (`event.language_code`) se propaga al prompt y se persiste en `AIRecommendation.language_code` (`BR-AI-011`, `BR-QUOTE-008`).
* El brief no contiene PII del organizador (email, teléfono, dirección) — el prompt y la validación lo prohíben explícitamente (`UC-AI-006` notas QA).
* El proveedor objetivo (vendor) es opcional en este endpoint; si está presente se incluye su resumen público no sensible para personalizar el brief.

### Dependencies

* PB-P1-011 / US-017 — Fundación AI-001 (`LLMProvider`, `MockAIProvider`, prompt registry, `AIRecommendation`, rate limit aplicado).
* PB-P1-006 — Evento creado con datos completos (`event_type_code`, `event_date`, `guest_count`, `budget_estimated`, `currency_code`, `language_code`, `city`).
* PB-P1-019 — Catálogo `ServiceCategory` activo (validación de categoría destino).
* PB-P1-030 — Creación de `QuoteRequest` (consumidor del brief final en US-023).
* PB-P0-007 — Rate limit IA (`SEC-POL-AI-007`).
* PB-P0-009..011 — Fundación IA.
* PB-P0-014 — Observabilidad IA.

---

## 🔗 Traceability

| Source                 | Reference                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P1-015                                                                                 |
| FRD Requirement(s)     | FR-AI-005 (brief autocompletado), FR-AI-009 (timeout/fallback), FR-AI-011 (badge IA), FR-AI-012 (no conversión automática a entidad oficial), FR-AI-017 (idioma), FR-QUOTE-004 (autocompletar brief desde datos del evento) |
| Use Case(s)            | UC-AI-005 (canónico FRD para AI-005), UC-QUOTE-001 (envío posterior)                      |
| Business Rule(s)       | BR-AI-001..004 (HITL), BR-AI-005..006 (LLMProvider/Mock), BR-AI-007..011 (trazabilidad, timeout, prompt versionado, idioma), BR-QUOTE-002 (brief estructurado obligatorio), BR-QUOTE-003 (edición previa al envío), BR-QUOTE-008 (idioma del evento), BR-SERVICE-001 (categoría activa) |
| Permission Rule(s)     | Ownership del evento; rate limit IA `SEC-POL-AI-007` (20/usuario/hora)                     |
| Data Entity / Entities | `Event`, `ServiceCategory`, `AIRecommendation`, `AIPromptVersion`, `QuoteRequest` (consumidor) |
| API Endpoint(s)        | `POST /api/v1/events/:eventId/ai/quote-brief`                                              |
| NFR Reference(s)       | NFR-AI-001 (editable), NFR-AI-003 (timeout 60s), NFR-AI-005 (validación JSON con 1 reintento), NFR-AI-007 (`LLMProvider`), NFR-AI-008 (`MockAIProvider` determinista) |
| Related ADR(s)         | ADR-AI-001 (LLMProvider abstraction)                                                       |
| PO Decision(s)         | Decisión PO 8.1 #9 (timeout/fallback), Decisión PO 8.1 #15 (Anthropic stub)                |
| Related Document(s)    | `/docs/7` (AI-005), `/docs/8` (UC-AI-005/UC-AI-006), `/docs/9` (FR-AI-005, FR-QUOTE-004), `/docs/16` (`QuoteBriefOutputDto`), `/docs/17` (AI Architecture & PromptOps), `/docs/19` (`SEC-POL-AI-007`), `/docs/6` (`AIRecommendation.type='quote_brief'`, `QuoteRequest.ai_generated_brief`), `/docs/4` (BR-AI-*/BR-QUOTE-*), `/docs/8.1` (#9, #15) |

---

## 🧩 PO/BA Decisions Applied

1. **Decisión PO 8.1 #9** — Timeout LLM 60 s; en producción error controlado, en demo fallback `MockAIProvider`. Plantilla estática por categoría queda como último recurso si ambos providers fallan.
2. **Decisión PO 8.1 #15** — `AnthropicProvider` solo stub en MVP; sin selector dinámico en UI ni failover automático.
3. **HITL canónico (`BR-AI-001..004`, `NFR-AI-001`)** — El brief IA se entrega como sugerencia editable (`AIRecommendation.status='pending'`); la `QuoteRequest` solo se crea con acción humana explícita (US-023). No hay conversión automática a entidad oficial (`FR-AI-012`).
4. **Rate limit IA global (`SEC-POL-AI-007`)** — 20 invocaciones IA por usuario por hora; `429 RATE_LIMITED` al exceder, sin persistir `AIRecommendation`.
5. **Endpoint canónico** — `POST /api/v1/events/:eventId/ai/quote-brief` conforme a `/docs/16` (sección 35, fila 1516).
6. **`AIRecommendation.type`** — Valor canónico `'quote_brief'`.
7. **Status enum canónico** — `(pending, accepted, rejected, discarded, failed, expired)`; flag `edited` boolean para distinguir contenido modificado.
8. **DTO canónico de salida** — `QuoteBriefOutputDto { brief: string, requirements: string[], questions: string[], constraints: string[] }` (`/docs/16` líneas 1600–1605). Las propuestas previas de `{ objective, scope }` quedan absorbidas en `brief` y `constraints`.
9. **Sin PII automática** — El prompt y el validador prohíben incluir email, teléfono o dirección del organizador en el brief (`UC-AI-006` notas QA, `BR-AI-002`).
10. **Categoría obligatoria** — `service_category_code` debe enviarse en el request y debe existir en el catálogo con `is_active=true` (`BR-SERVICE-001`); si no existe o está inactiva → `400 VALIDATION` / `404 NOT_FOUND` antes de invocar al LLM.
11. **Persistencia del brief final** — El contenido final tras "Enviar" se persiste en `QuoteRequest.brief` con `ai_generated_brief=true` y `ai_recommendation_id` poblado (`UC-AI-006`). Esa persistencia es responsabilidad de US-023 / PB-P1-030 (creación de `QuoteRequest`).
12. **Descarte controlado** — Cuando el organizador descarta el brief antes de enviar, la UI limpia el formulario y la API actualiza `AIRecommendation.status='discarded'` vía endpoint común HITL (US-025 / PB-P1-016).

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Envío automático del brief al proveedor (la `QuoteRequest` se crea en US-023 con acción humana).
* Negociación automática IA con el proveedor.
* Persistencia del brief final en `QuoteRequest` (delegado a US-023 / PB-P1-030).
* Selección automática del proveedor objetivo (la categoría y el vendor opcional son input del organizador).
* `AnthropicProvider` operativo (solo stub).
* Generación de adjuntos / referencias visuales con IA en MVP.
* Persistencia de feedback "no relevante" sobre el brief (futuro).

### Scope Notes

* La IA precarga; el organizador revisa, edita y decide.
* Regenerar crea un nuevo `AIRecommendation`; el anterior conserva su `status`.
* No introduce migraciones nuevas (reusa `ai_recommendations`, `ai_prompt_versions`).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Brief generado con HITL pending

**Given** un organizador autenticado dueño de un evento con datos completos (`event_type_code`, `event_date`, `guest_count`, `budget_estimated`, `currency_code`, `city`, `language_code`) y una categoría activa (`service_category_code`)
**When** invoca `POST /api/v1/events/:eventId/ai/quote-brief` con `{ service_category_code, vendor_id? }`
**Then** el backend ejecuta `GenerateQuoteBriefUseCase` vía `LLMProvider`, valida el JSON con Zod contra `QuoteBriefOutputDto`, persiste `AIRecommendation { type='quote_brief', status='pending', edited=false, fallback_used=false, language_code=event.language_code }` y devuelve `200` con `{ brief, requirements[], questions[], constraints[], ai_recommendation_id }`
**And** **no** se crea `QuoteRequest` ni ninguna otra entidad oficial (`FR-AI-012`).

### AC-02: Precarga editable del formulario

**Given** la respuesta exitosa del endpoint
**When** la UI recibe el payload
**Then** el formulario "Nueva solicitud de cotización" se precarga con el contenido del brief
**And** el badge "Sugerido por IA" (`AIBadge`) es visible
**And** todos los campos del brief son editables antes de enviar (`BR-AI-002`, `BR-QUOTE-003`, `NFR-AI-001`).

### AC-03: Idioma respetado

**Given** un evento con `language_code='pt'`
**When** se genera el brief
**Then** `brief`, `requirements`, `questions` y `constraints` están en portugués
**And** `AIRecommendation.language_code='pt'` (`BR-AI-011`, `BR-QUOTE-008`).

### AC-04: Trazabilidad completa de la sugerencia IA

**Given** un brief generado
**When** se persiste el `AIRecommendation`
**Then** incluye `prompt_version_id` (apuntando a `QuoteBriefPrompt v1`), `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms`, `correlation_id`, `event_id`, `service_category_code`, `vendor_id?`, `type='quote_brief'`, `status='pending'`, `edited=false`, `created_at` (`BR-AI-007`, `BR-AI-010`).

### AC-05: Sin PII del organizador en el brief

**Given** un brief generado
**When** el backend valida el contenido antes de devolverlo
**Then** el payload no contiene email, número telefónico ni dirección postal del organizador
**And** si la validación detecta PII, el brief se reintenta una vez con prompt reforzado; si persiste, retorna `5xx AI_INVALID_OUTPUT` y persiste `AIRecommendation { status='failed' }`.

---

## ⚠️ Edge Cases

### EC-01: Descartar brief antes de enviar

**Given** un brief precargado en el formulario
**When** el organizador hace click en "Descartar"
**Then** la UI limpia el contenido del formulario
**And** se invoca el endpoint común HITL (US-025) que actualiza `AIRecommendation.status='discarded'`
**And** no se crea `QuoteRequest`.

#### Handling

* La UI vuelve al estado vacío con CTA "Autocompletar con IA".

---

### EC-02: Regenerar brief

**Given** un brief precargado
**When** el organizador hace click en "Regenerar"
**Then** se invoca nuevamente `POST /api/v1/events/:eventId/ai/quote-brief`
**And** el `AIRecommendation` anterior conserva su `status`; se crea uno nuevo `status='pending'`
**And** el formulario se actualiza con el nuevo contenido (con confirmación si ya había ediciones manuales).

---

### EC-03: Categoría inválida o inactiva

**Given** un `service_category_code` que no existe o tiene `is_active=false`
**When** se invoca el endpoint
**Then** el backend rechaza con `400 VALIDATION` (formato inválido) o `404 NOT_FOUND` (categoría no encontrada/inactiva) **antes** de invocar al LLM
**And** no se consume cuota IA ni se persiste `AIRecommendation`.

---

### EC-04: Timeout 60s (`NFR-AI-003`, Decisión PO 8.1 #9)

**Given** la llamada al LLM excede 60 s
**When** el sistema detecta el timeout
**Then** en producción retorna `5xx AI_TIMEOUT` y persiste `AIRecommendation { status='failed', fallback_used=false }`
**And** en modo demo (`LLM_PROVIDER=mock` o flag equivalente) cae a `MockAIProvider` con `fallback_used=true`.

---

### EC-05: Provider no disponible

**Given** `OpenAIProvider` responde con 5xx persistente o `AI_PROVIDER_ERROR`
**When** se invoca
**Then** en demo se usa `MockAIProvider`; en producción retorna `5xx AI_PROVIDER_ERROR`
**And** si Mock también falla, se sirve plantilla estática por categoría (`AI-005` fallback FRD), persistiendo `AIRecommendation { status='failed', fallback_used=true }`.

---

### EC-06: JSON inválido del LLM

**Given** el LLM devuelve un payload que no satisface `QuoteBriefOutputDto`
**When** Zod falla la validación
**Then** se reintenta una vez con prompt reforzado (`NFR-AI-005`)
**And** si vuelve a fallar, retorna `5xx AI_INVALID_OUTPUT` y persiste `AIRecommendation { status='failed' }`.

---

### EC-07: Rate limit IA excedido (`SEC-POL-AI-007`)

**Given** el organizador ya ejecutó 20 invocaciones IA en la última hora
**When** invoca este endpoint
**Then** el backend retorna `429 RATE_LIMITED` con `Retry-After` y **no** persiste `AIRecommendation` ni invoca al LLM.

---

## 🚫 Validation Rules

| ID    | Rule                                                                              | Message / Behavior          |
| ----- | --------------------------------------------------------------------------------- | --------------------------- |
| VR-01 | `eventId` debe ser UUID v4                                                        | `400 VALIDATION`            |
| VR-02 | El evento debe existir y pertenecer al organizador autenticado                    | `403 FORBIDDEN` o `404 NOT_FOUND` |
| VR-03 | El evento no debe estar en `status ∈ {cancelled, completed, deleted}`             | `409 CONFLICT`              |
| VR-04 | `service_category_code` requerido y existente en `ServiceCategory` con `is_active=true` | `400 VALIDATION` / `404 NOT_FOUND` |
| VR-05 | `vendor_id` (opcional) debe existir y estar `approved`                            | `404 NOT_FOUND` (si se envía y no es válido) |
| VR-06 | `language_code` (derivado del evento) ∈ `{es, en, pt, fr}`                        | `400 VALIDATION`            |
| VR-07 | Output IA: `brief` ≤ 2.000 caracteres                                              | Truncar al persistir / `AI_INVALID_OUTPUT` si excede límite extremo |
| VR-08 | Output IA: cada elemento de `requirements[]`, `questions[]`, `constraints[]` ≤ 240 caracteres; arrays con máximo 10 ítems | Truncar / reintentar / `AI_INVALID_OUTPUT` |
| VR-09 | Output IA: no debe contener email, teléfono o dirección postal del organizador     | Reintentar / `AI_INVALID_OUTPUT` |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                |
| ------ | --------------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership obligatoria sobre el evento (`event.owner_user_id === actor.id`).                          |
| SEC-02 | Rate limit IA `SEC-POL-AI-007`: 20 invocaciones por usuario por hora; respuesta `429 RATE_LIMITED`.   |
| SEC-03 | Logs estructurados sin PII completa; redactar email, teléfono y direcciones del organizador.          |
| SEC-04 | Backend-only: el frontend nunca llama directamente al LLM.                                            |
| SEC-05 | Persistir `AIRecommendation` con `correlation_id` y metadata canónica.                                |
| SEC-06 | `OPENAI_API_KEY` solo en backend vía Secrets Manager.                                                  |
| SEC-07 | El prompt no debe incluir datos sensibles del organizador (email, teléfono, dirección, documento).    |

### Negative Authorization Scenarios

* Organizer no dueño → `403`/`404`.
* Vendor autenticado → `403`.
* Admin autenticado → `403` (no es flujo admin).
* Anónimo / sesión inválida → `401`.

---

## 🤖 AI Behavior

### AI Involvement

* AI Feature: AI-005 (`QuoteBriefPrompt v1`).
* Provider Layer: `LLMProvider` (`OpenAIProvider` / `MockAIProvider` / `AnthropicProvider` stub).
* Human Validation Required: Yes (el brief precarga; el organizador edita y envía manualmente).
* Persist `AIRecommendation`: Yes (`type='quote_brief'`).
* Fallback Required: Yes (Mock en demo; plantilla estática por categoría como último recurso, `AI-005` FRD).

### AI Input

* `event.event_type_code`
* `event.event_date`
* `event.guest_count`
* `event.budget_estimated`
* `event.currency_code`
* `event.city`
* `event.language_code`
* `service_category.code` y `service_category.name`
* `vendor_summary?` — resumen público no sensible del proveedor objetivo, si se envió `vendor_id` (categorías que sirve, ciudad, idiomas, paquetes públicos)

### AI Output

* JSON estructurado validado con Zod (`QuoteBriefOutputDto`):
  ```jsonc
  {
    "brief": "Resumen ejecutivo del evento y el alcance solicitado al proveedor.",
    "requirements": [
      "Cobertura completa de ceremonia y recepción (8 h)."
    ],
    "questions": [
      "¿Cuál es el costo de hora adicional?"
    ],
    "constraints": [
      "Presupuesto referencial: 5.000 USD."
    ]
  }
  ```
* `brief` ≤ 2.000 caracteres; cada ítem de los arrays ≤ 240 caracteres; máximo 10 ítems por array; sin PII del organizador.

### Human-in-the-loop Rules

* El brief se entrega como sugerencia editable (`status='pending'`).
* El organizador puede aceptar, editar, descartar o regenerar antes de enviar.
* Si se envía la `QuoteRequest` (US-023), el contenido final se persiste en `QuoteRequest.brief` con `ai_generated_brief=true` y `ai_recommendation_id` poblado.
* Regenerar crea un nuevo `AIRecommendation`; el anterior conserva su `status`.

### AI Error / Fallback Behavior

* Timeout 60 s → `AI_TIMEOUT` (o fallback Mock en demo).
* JSON inválido o con PII → 1 reintento con prompt reforzado; si falla, `AI_INVALID_OUTPUT`.
* Provider error → fallback Mock en demo / `AI_PROVIDER_ERROR` en producción.
* Falla en cascada (provider + Mock) → plantilla estática por categoría como último recurso.
* Toda falla persiste `AIRecommendation { status='failed' }` con metadata canónica.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| Screen / Route      | `/[locale]/organizer/events/:id/quotes/new`                                          |
| Main UI Pattern     | Formulario "Nueva solicitud" con sección "IA precargada" + editor por campo          |
| Primary Action      | "Enviar al proveedor" (delegado a US-023)                                            |
| Secondary Actions   | "Autocompletar con IA", "Regenerar", "Descartar"                                     |
| Empty State         | Formulario vacío con CTA "Autocompletar con IA"                                       |
| Loading State       | Skeleton + mensaje "Generando brief con IA. Puede tomar hasta 60 segundos." con `aria-live="polite"` |
| Error State         | Banner por `error.code` traducido + opción "Reintentar"                              |
| Success State       | Formulario precargado con badge "Sugerido por IA" en cada campo                       |
| Accessibility Notes | Cada campo con `label` y `aria-describedby`; badge IA con `aria-label="Contenido generado por IA, editable"`; anuncio `aria-live="polite"` al completarse la generación |
| Responsive Notes    | Mobile-first                                                                         |
| i18n Notes          | Contenido del brief en `event.language_code`; copy de UI en `locale` de la app        |
| Currency Notes      | El brief puede mencionar montos en `event.currency_code`                              |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: `/[locale]/organizer/events/:id/quotes/new`.
* Components: `QuoteRequestForm`, `AIBriefAutocomplete`, `AIBadge` (reusado de US-017), `AIBriefField` (textarea con badge).
* State Management: TanStack `useGenerateAIQuoteBrief` (mutation) + cache `['ai','event', eventId, 'quote-brief', service_category_code, vendor_id?]`.
* Forms: React Hook Form + Zod (`quoteRequestFormSchema`).
* API Client: `aiApi.generateQuoteBrief({ eventId, serviceCategoryCode, vendorId? })`; el envío posterior usa `quotesApi.createRequest` (US-023).

### Backend

* Use Case / Service: `GenerateQuoteBriefUseCase` (orquesta `LLMProvider`, validación Zod, detección de PII, retry, persistencia).
* Controller / Route: `POST /api/v1/events/:eventId/ai/quote-brief`.
* Authorization Policy: Ownership + rate limit `SEC-POL-AI-007`.
* Validation: Zod `eventQuoteBriefParamsSchema` (path), `quoteBriefRequestBodySchema` (body con `service_category_code`, `vendor_id?`), `QuoteBriefOutputDto` (output).
* Transaction Required: Sí, para persistir `AIRecommendation` (no se tocan otras entidades; la creación de `QuoteRequest` es responsabilidad de US-023).

### Database

* Main Tables:
  * `ai_recommendations` (insert, `type='quote_brief'`, FK `event_id`, columna `service_category_code` / metadata JSON con `vendor_id` cuando aplique).
  * `ai_prompt_versions` (read; semilla de `QuoteBriefPrompt v1`).
  * `events` (read).
  * `service_categories` (read; `is_active=true`).
  * `vendor_profiles` (read si `vendor_id` provisto; `status='approved'`).
* Constraints: reutiliza enums (`ai_recommendation_type`, `ai_recommendation_status`).
* Index Considerations: reutiliza `ai_recommendations(event_id, type, status, created_at)`.

### API

| Method | Endpoint                                            | Purpose                            |
| ------ | --------------------------------------------------- | ---------------------------------- |
| POST   | `/api/v1/events/:eventId/ai/quote-brief`            | Generar brief IA para `QuoteRequest` |

### Observability / Audit

* Correlation ID Required: Yes.
* Log Event Required: Yes (`ai.quote-brief.requested|generated|failed|fallback|invalid_output|pii_detected|rate_limited`).
* AdminAction Required: No.
* AIRecommendation Required: Yes (siempre, incluso en falla).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                            | Type        |
| ----- | ------------------------------------------------------------------- | ----------- |
| TS-01 | Generación exitosa con `MockAIProvider` y precarga del formulario   | Integration |
| TS-02 | Persistencia de `AIRecommendation` con metadata completa            | Integration |
| TS-03 | Generación con `language_code='pt'` retorna contenido en pt          | Integration |
| TS-04 | Generación con `vendor_id` válido incluye contexto del proveedor    | Integration |
| TS-05 | Edición libre del brief y envío de `QuoteRequest` (delegado a US-023) | E2E         |
| TS-06 | Descartar el brief actualiza `AIRecommendation.status='discarded'`   | Integration |
| TS-07 | Regenerar crea un nuevo `AIRecommendation` sin afectar el anterior   | Integration |

### Negative Tests

| ID    | Scenario                                                       | Expected Result          |
| ----- | -------------------------------------------------------------- | ------------------------ |
| NT-01 | `service_category_code` inexistente o inactiva                   | `400`/`404` sin invocar LLM |
| NT-02 | Evento ajeno                                                    | `403`/`404`              |
| NT-03 | Vendor invoca                                                   | `403`                    |
| NT-04 | Admin invoca                                                    | `403`                    |
| NT-05 | `language_code` no soportado                                    | `400 VALIDATION`         |
| NT-06 | Evento `cancelled`/`completed`/`deleted`                        | `409 CONFLICT`           |
| NT-07 | Anónimo                                                         | `401 UNAUTHORIZED`       |
| NT-08 | `eventId` con formato inválido                                  | `400 VALIDATION`         |

### AI Tests

| ID       | Scenario                                                       | Expected Result                                  |
| -------- | -------------------------------------------------------------- | ------------------------------------------------ |
| AI-TS-01 | `MockAIProvider` devuelve `QuoteBriefOutputDto` válido          | `AIRecommendation` pending con metadata           |
| AI-TS-02 | Salida con PII detectada → retry exitoso                       | Brief sin PII; pending                           |
| AI-TS-03 | Salida con PII tras retry                                      | `5xx AI_INVALID_OUTPUT`; failed                  |
| AI-TS-04 | JSON inválido → retry exitoso                                  | Brief válido; pending                            |
| AI-TS-05 | Timeout 60 s en producción                                     | `5xx AI_TIMEOUT` + failed                        |
| AI-TS-06 | Timeout 60 s en modo demo                                      | Fallback Mock; `fallback_used=true`; pending     |
| AI-TS-07 | `OpenAIProvider` 5xx → fallback Mock en demo                   | Pending con `fallback_used=true`                  |
| AI-TS-08 | `OpenAIProvider` 5xx en producción                              | `5xx AI_PROVIDER_ERROR`                          |
| AI-TS-09 | Provider y Mock fallan → plantilla estática por categoría       | `failed` + `fallback_used=true`                   |
| AI-TS-10 | Rate limit excedido                                            | `429 RATE_LIMITED` con `Retry-After`             |
| AI-TS-11 | `MockAIProvider` determinista (snapshot por evento+categoría)   | Mismo brief para mismos inputs                    |

### Authorization Tests

| ID         | Scenario           | Expected Result    |
| ---------- | ------------------ | ------------------ |
| AUTH-TS-01 | Organizer dueño    | `200`              |
| AUTH-TS-02 | Organizer no dueño | `403`/`404`        |
| AUTH-TS-03 | Vendor             | `403`              |
| AUTH-TS-04 | Admin              | `403`              |
| AUTH-TS-05 | Anónimo            | `401`              |

### Accessibility Tests

* Cada campo del brief con `label` y `aria-describedby` mencionando "Editable".
* Badge IA con `aria-label="Contenido generado por IA, editable"`.
* Anuncio `aria-live="polite"` al completarse la generación.
* Navegación por teclado para acciones "Regenerar" / "Descartar" / "Enviar".

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Tasa de envío de `QuoteRequest`; calidad percibida por proveedores |
| Expected Impact     | Reduce fricción de escritura del organizador          |
| Success Criteria    | ≥ 50% de briefs IA enviados sin re-escritura completa |
| Academic Demo Value | Conecta IA con el flujo marketplace (categorías → brief → QuoteRequest) |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Componente `AIBriefAutocomplete` integrado al `QuoteRequestForm`.
* Componente `AIBriefField` con badge IA y textarea editable.
* Hook `useGenerateAIQuoteBrief` y cliente `aiApi.generateQuoteBrief`.
* Acciones "Regenerar" y "Descartar" con confirmación si hay ediciones manuales.
* Telemetría `ai.quote-brief.generated|edited|discarded|regenerated`.
* i18n para 4 locales.

### Potential Backend Tasks

* `GenerateQuoteBriefUseCase` + integración `LLMProvider`.
* Validación Zod (`QuoteBriefOutputDto`) + detección de PII + retry.
* Endpoint con rate limit `SEC-POL-AI-007` y autorización por ownership.
* Logging estructurado + métricas + log `pii_detected`.
* Plantilla estática por categoría (fallback de último recurso).

### Potential Database Tasks

* Verificación de fundación IA (sin migraciones nuevas).

### Potential AI / PromptOps Tasks

* Registrar `QuoteBriefPrompt v1` (US-121 + `ai_prompt_versions`).
* Respuestas deterministas en `MockAIProvider` por idioma con `service_category_code` y `vendor_id?` anclados.
* Snapshot tests del Mock para evento+categoría.

### Potential QA Tasks

* Tests deterministas con Mock.
* Tests de validación de PII y retry.
* Tests de rate limit y autorización.
* Tests E2E de edición y envío posterior (junto a US-023).

### Potential DevOps / Config Tasks

* Verificación de Secrets Manager (`OPENAI_API_KEY`).

---

## ✅ Definition of Ready

* [x] Rol claro (Organizer dueño del evento).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (`FR-AI-005/009/011/012/017`, `FR-QUOTE-004`, `UC-AI-005`, `BR-AI-001..011`, `BR-QUOTE-002/003/008`, `BR-SERVICE-001`).
* [x] Permisos identificados (ownership + `SEC-POL-AI-007`).
* [x] Entidades listadas (`Event`, `ServiceCategory`, `AIRecommendation`, `AIPromptVersion`, `QuoteRequest`).
* [x] AC en GWT (HITL, precarga editable, idioma, trazabilidad, sin PII).
* [x] Edge cases documentados (descartar, regenerar, categoría inválida, timeout, provider error, JSON inválido, rate limit).
* [x] Validación clara.
* [x] Out of Scope explícito (envío automático, persistencia en `QuoteRequest`, Anthropic operativo, feedback futuro).
* [x] Dependencias conocidas (PB-P1-011, PB-P1-006, PB-P1-019, PB-P1-030, PB-P0-007/009..011/014).
* [x] UX states identificados.
* [x] API definida (`POST /api/v1/events/:eventId/ai/quote-brief`).
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint y UI funcionales con HITL enforced (`status='pending'`, editable, badge IA).
* [ ] `AIRecommendation` persistido con trazabilidad completa.
* [ ] Validación de PII enforced; sin email/teléfono/dirección del organizador en el brief.
* [ ] DTO canónico `QuoteBriefOutputDto` respetado (`/docs/16`).
* [ ] Fallback `MockAIProvider` operativo en demo y determinista en tests.
* [ ] Plantilla estática por categoría como último recurso operativa.
* [ ] Rate limit IA `SEC-POL-AI-007` aplicado y verificado.
* [ ] Tests funcionales, negativos, IA y de autorización verdes en CI.
* [ ] PO valida en demo (categorías → brief → edición → handoff a US-023).

---

## 📝 Notes

* Documentation Alignment Required: `/docs/8-Use-Cases-Specification.md` etiqueta `UC-AI-005` como "Recomendar categorías de proveedor con IA" (línea 1763) y describe el brief en `UC-AI-006` (línea 1826), mientras `/docs/9-FRD.md` (líneas 366 y 689) mapea canónicamente `FR-AI-005 → UC-AI-005` para el brief. Se sigue la autoridad del FRD; queda pendiente cleanup en `/docs/8`. La misma alineación se aplicó en US-020 para AI-004.
* Documentation Alignment Required: `/docs/16-API-Design-Specification.md` ya documenta `POST /events/:eventId/ai/quote-brief` y `QuoteBriefOutputDto`; verificar regeneración del snapshot OpenAPI vía US-098.
* Documentation Alignment Required: `/docs/7-AI-Features-Specification.md` AI-005 menciona fallback "plantilla estática por categoría"; `BR-AI-009` y la decisión PO 8.1 #9 establecen `MockAIProvider` como fallback en demo. La cadena canónica acordada es: producción → error controlado; demo → Mock; último recurso (ambos fallan) → plantilla estática. Aclaración liviana en `/docs/7`.
* La persistencia del brief final en `QuoteRequest.brief` con `ai_generated_brief=true` y `ai_recommendation_id` es responsabilidad de US-023 / PB-P1-030 (creación de `QuoteRequest`); este endpoint solo entrega la sugerencia editable y persiste el `AIRecommendation`.
* El descarte (`status='discarded'`) y la aceptación se gestionan vía endpoints comunes HITL definidos en US-025 / PB-P1-016.
* `MockAIProvider` debe ser determinista para los mismos `(event_id, service_category_code, vendor_id?, language_code)` (`NFR-AI-008`).
