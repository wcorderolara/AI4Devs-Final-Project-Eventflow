# Technical Specification — US-023: (Vendor) Generar bio y paquetes con IA

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-023 |
| Source User Story | management/user-stories/US-023-ai-vendor-bio-packages.md |
| Decision Resolution Artifact | No aplica (promoción formalizada vía ADR-ARCH-005) |
| Priority | P4 (promovida a delivery actual vía ADR-ARCH-005) |
| Backlog ID | PB-P4-002 |
| Backlog Title | Vendor genera bio/paquetes con IA (AI-007) |
| Backlog Execution Order | Backlog P4 (promovido); tras base de Vendors (EPIC-VND-001) e IA (EPIC-AI-001) |
| User Story Position in Backlog Item | 1 de 1 (PB-P4-002 agrupa únicamente US-023) |
| Related User Stories in Backlog Item | US-023 |
| Epic | EPIC-AIP-001 — AI-Assisted Event Planning |
| Backlog Item Dependencies | EPIC-VND-001 (perfil vendor), EPIC-AI-001 (infra IA: LLMProvider, AIRecommendation, PromptRegistry) |
| Feature | AI-007 Bio/paquetes IA del proveedor (promovida desde Could Have / v1.1) |
| Module / Domain | AI / Vendors |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-08-13 |
| Last Updated | 2026-08-13 |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P4-002 — Vendor genera bio/paquetes con IA (AI-007)** (`4-Product-Backlog-Prioritized.md` §11). Diferido originalmente a v1.1 por decisión PO; **promovido a la fase de delivery actual** por decisión PO 2026-08-13 (ADR-ARCH-005). Agrupa únicamente a US-023.

### Execution Order Rationale

US-023 se apoya en dos capacidades ya existentes: el perfil de vendor (`VendorProfile`/`VendorService`, EPIC-VND-001) y la infraestructura de IA (`LLMProvider`, `AIRecommendation`, Prompt Registry, flujo `apply/discard`, EPIC-AI-001). Se ejecuta después de esas bases; no introduce dependencias nuevas hacia otros dominios.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-023 | Único item de PB-P4-002 | 1 |

---

## 3. Executive Technical Summary

Agregar dos capacidades de generación asistida por IA al perfil del vendor: **bio** y **descripciones de paquetes**. El backend expone `POST /api/v1/vendors/me/ai/bio` y `POST /api/v1/vendors/me/ai/packages`, que invocan el `LLMProvider` con prompts versionados (`PROMPT-VENDOR-BIO-V1`, `PROMPT-VENDOR-PACKAGES-V1`), validan la salida contra un JSON schema estricto y persisten una `AIRecommendation` en estado `pending` (`kind='vendor_bio'`/`'vendor_packages'`, `vendorProfileId` seteado, `eventId=null`). La IA **no publica**: el vendor revisa y aplica vía el flujo HITL existente `POST /ai-recommendations/:id/apply` (escribe `VendorProfile.bio` o `VendorService.description`) o `discard`. Se reutiliza el `MockAIProvider` para tests deterministas y el fallback por timeout. Autorización estricta: solo el vendor sobre su propio perfil (ownership); organizer/admin → 403. No hay moderación automática de texto ni generación de imágenes.

---

## 4. Scope Boundary

### In Scope

- Endpoints `POST /api/v1/vendors/me/ai/bio` y `POST /api/v1/vendors/me/ai/packages`.
- Casos de uso `GenerateVendorBioUseCase`, `GenerateVendorPackagesUseCase`.
- Prompts versionados en el Prompt Registry (`PROMPT-VENDOR-BIO-V1`, `PROMPT-VENDOR-PACKAGES-V1`).
- Persistencia de `AIRecommendation` (`kind='vendor_bio'`/`'vendor_packages'`) en `pending`.
- Aplicación vía flujo HITL existente `apply/discard` (escritura a `VendorProfile.bio` / `VendorService.description`).
- Validación Zod de input y JSON schema de output; fallback por timeout/error.
- Rate limiting de IA; ownership; backend-only.
- Frontend: editor con botones "Generar bio IA" / "Generar descripciones", regenerar, descartar, guardar; estados loading/error; banner de EC-01; i18n.
- Observabilidad: eventos IA con correlation ID; `AIRecommendation` como auditoría.

### Out of Scope

- Moderación automática de texto por IA (guardrail MVP).
- Generación de imágenes.
- Auto-publicación sin revisión del vendor.
- Regeneración con feedback avanzado (linaje existe en el esquema; el detalle de UX de regeneración iterativa pertenece a US-026 y no se amplía aquí más allá de un "Regenerar" simple).

### Explicit Non-Goals

- La IA no toma decisiones autónomas (ADR-AI-005).
- El frontend nunca consume llaves de OpenAI/Anthropic (P-API-11 / S-13).

---

## 5. Architecture Alignment

### Backend Architecture

Módulo `vendors` (o submódulo `vendors/ai`) en el Modular Monolith. Controllers finos → `GenerateVendorBioUseCase` / `GenerateVendorPackagesUseCase` → puerto `LLMProvider` (infra `OpenAIProvider`/`MockAIProvider`). Persistencia de `AIRecommendation` vía repositorio Prisma. Reutiliza `AcceptAIRecommendationUseCase`/`DiscardAIRecommendationUseCase` existentes para el paso `apply/discard`.

### Frontend Architecture

Next.js App Router, Client Components en `/[locale]/vendor/profile/edit`. TanStack Query para las mutaciones de generación y apply/discard; React Hook Form + Zod para el formulario del perfil. Badges "sugerencia IA" y manejo de timeout según el contrato de consumo de IA (D15). next-intl.

### Database Architecture

Sin nuevas tablas. Se usa `AIRecommendation` (ya soporta `vendor_bio`: `vendorProfileId` nullable, `eventId` nullable, `kind String`). Escritura final en `VendorProfile.bio` (existe) y `VendorService.description` al aplicar.

### API Architecture

REST `/api/v1` (ADR-API-001). Dos endpoints POST de generación + reutilización de `/ai-recommendations/:id/apply|discard`. Envelope estándar (ADR-API-002), Zod (ADR-API-003), correlation ID (ADR-API-004).

### AI / PromptOps Architecture

`LLMProvider` (ADR-AI-001), `OpenAIProvider` primario (ADR-AI-002), `MockAIProvider` para demo/test (ADR-AI-003). Prompts versionados en el registry estático + `AIPromptVersion` (ADR-AI-006). HITL obligatorio: `AIRecommendation.status` arranca `pending` y nada se materializa sin `apply` (ADR-AI-005). Validación de schema estricta (ADR-AI-007). Timeout/fallback a template estático.

### Security Architecture

Ownership: vendor solo sobre su propio perfil (ADR-SEC-003). Rate limit de IA. Backend-only; llaves nunca al frontend. 403 para organizer/admin.

### Testing Architecture

Vitest + Supertest (backend), `MockAIProvider` para IA determinista (ADR-TEST-003), Playwright + MSW (E2E/frontend), tests negativos de autorización (ADR-TEST-004).

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Bio generada | `POST /vendors/me/ai/bio` → LLMProvider con `PROMPT-VENDOR-BIO-V1` → `AIRecommendation(pending, kind='vendor_bio')`; no publica. | Backend, AI, API, Frontend |
| AC-02 Paquetes generados | `POST /vendors/me/ai/packages` → `PROMPT-VENDOR-PACKAGES-V1` → `AIRecommendation(pending, kind='vendor_packages')`; vendor revisa y guarda vía apply. | Backend, AI, API, Frontend |
| EC-01 Texto sensible | Banner "Revisa cumplimiento antes de publicar" en la UI; HITL refuerza responsabilidad. | Frontend |
| VR-01 Solo vendor sobre su perfil | Middleware ownership; organizer/admin → 403. | Backend, Security |
| VR-02 Bio ≤ 1000 caracteres | Truncado/validación en output y al aplicar. | Backend, AI |
| AI-TS-02 Timeout | Fallback por timeout con `fallbackUsed=true` en `aiMeta`. | Backend, AI |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Módulo `vendors` con submódulo de IA. Reutiliza el módulo `ai` (LLMProvider, AIRecommendation repo, apply/discard use cases).

### Use Cases / Application Services

- `GenerateVendorBioUseCase(vendorUserId, inputs)`: valida ownership, construye el input del prompt, invoca `LLMProvider`, valida output (JSON schema), persiste `AIRecommendation(pending, kind='vendor_bio')`.
- `GenerateVendorPackagesUseCase(vendorUserId, inputs)`: análogo, `kind='vendor_packages'`, output `packages: [{ id, description }]`.
- Aplicación: reutiliza `AcceptAIRecommendationUseCase` (escribe `VendorProfile.bio` o `VendorService.description[]`) y `DiscardAIRecommendationUseCase`.

### Controllers / Routes

- `POST /api/v1/vendors/me/ai/bio`
- `POST /api/v1/vendors/me/ai/packages`
- (Reutilizados) `POST /api/v1/ai-recommendations/:id/apply`, `POST /api/v1/ai-recommendations/:id/discard`.

### DTOs / Schemas

- Input Zod: `{ category, city, yearsExperience, specialties[] }` (bio); `{ packages: [{ id, name, basePriceHint? }] }` (packages).
- Output JSON schema estricto: `{ bio: string }` (≤ 1000) / `{ packages: [{ id, description }] }`.

### Repository / Persistence

`AIRecommendationRepository` (existente) para crear/leer. `VendorProfileRepository`/`VendorServiceRepository` para la escritura al aplicar.

### Validation Rules

VR-01 ownership; VR-02 bio ≤ 1000 (truncar/validar). Output fuera de schema → fallback/error controlado.

### Error Handling

403 para no-owner; 422/estructura inválida de output → fallback a template estático con `fallbackUsed=true`; mensajes neutros. Nunca filtrar detalle del provider ni llaves.

### Transactions

No requerida en la generación (solo se crea `AIRecommendation`). La aplicación (`apply`) usa la transacción del use case existente.

### Observability

Eventos de IA (`ai.vendor_bio.*`, `ai.vendor_packages.*`) con `correlationId`, `provider`, `promptVersion`, `latencyMs`, `fallbackUsed` en `aiMeta`. Sin PII/llaves en logs (ADR-SEC-001).

---

## 8. Frontend Technical Design

### Routes / Pages

`/[locale]/vendor/profile/edit`.

### Components

`AIVendorBio`, `AIVendorPackages` (botones Generar/Regenerar/Descartar, editor editable, badge "sugerencia IA").

### Forms

React Hook Form + Zod; el texto generado es editable antes de guardar.

### State Management

TanStack Query para generar (POST) y apply/discard.

### Data Fetching

`aiApi.vendorBio`, `aiApi.vendorPackages`; apply/discard vía el cliente de AIRecommendation existente.

### Loading / Empty / Error / Success States

Loading: skeleton. Empty: IA como opcional. Error: banner. Success: texto editable. EC-01: banner de cumplimiento antes de publicar.

### Accessibility

Editor accesible; foco visible; botones con label.

### i18n

Locale del vendor (next-intl); si el texto menciona montos, respetar locale/moneda del vendor (no conversión automática).

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/vendors/me/ai/bio` | Generar bio IA | Vendor + ownership | `{ category, city, yearsExperience, specialties[] }` | 200 `AIRecommendation` (pending, `kind='vendor_bio'`, `outputPayload.bio`) | 403 no-owner (VR-01), 422 input inválido, 200 con fallback en timeout |
| POST | `/api/v1/vendors/me/ai/packages` | Generar descripciones IA | Vendor + ownership | `{ packages: [{ id, name, basePriceHint? }] }` | 200 `AIRecommendation` (pending, `kind='vendor_packages'`, `outputPayload.packages[]`) | 403 no-owner, 422 input inválido, 200 con fallback |
| POST | `/api/v1/ai-recommendations/:id/apply` | Aplicar (guardar) sugerencia | Vendor + ownership | — | 200 perfil/servicio actualizado | 403, 404, 409 si ya aplicada |
| POST | `/api/v1/ai-recommendations/:id/discard` | Descartar sugerencia | Vendor + ownership | — | 200 | 403, 404 |

---

## 10. Database / Prisma Design

### Models Impacted

`AIRecommendation` (lectura/escritura), `VendorProfile` (`bio`), `VendorService` (`description`).

### Fields / Columns

Sin cambios de esquema. `AIRecommendation.kind` acepta `'vendor_bio'`/`'vendor_packages'`; `vendorProfileId` seteado; `eventId=null`; `aiMeta` con metadatos del provider.

### Relations

Existentes (`AIRecommendation.vendorProfileId` → `VendorProfile`).

### Indexes

Existentes (por `vendor_profile_id`). No se agregan.

### Constraints

Ownership a nivel de aplicación (`vendor_user_id == requester`). `bio` ≤ 1000 a nivel de aplicación.

### Migrations Impact

**No aplica** — sin cambios de esquema (el modelo ya soporta `vendor_bio`).

### Seed Impact

Opcional: un vendor seed con inputs base para demostrar generación en la demo.

---

## 11. AI / PromptOps Design

### AI Feature

AI-007 — Bio y paquetes del vendor.

### Provider

`LLMProvider` → `OpenAIProvider` (primario) / `MockAIProvider` (demo/test).

### Prompt Version

`PROMPT-VENDOR-BIO-V1`, `PROMPT-VENDOR-PACKAGES-V1` en el registry estático + `AIPromptVersion`.

### Input Schema

Bio: `{ category, city, yearsExperience, specialties[] }`. Packages: `{ packages: [{ id, name, basePriceHint? }] }`.

### Output Schema

Bio: `{ bio: string (≤1000) }`. Packages: `{ packages: [{ id: string, description: string }] }`. Validación estricta (ADR-AI-007).

### Human-in-the-loop

Obligatorio: `AIRecommendation.status='pending'`; nada se publica sin `apply` explícito del vendor (ADR-AI-005).

### Fallback

Timeout/error del provider o output fuera de schema → template estático con `fallbackUsed=true` en `aiMeta`.

### Persistence

`AIRecommendation` con `inputPayload`, `outputPayload`, `aiMeta` (provider/promptVersion/latencyMs/fallbackUsed/languageCode).

### Safety Rules

Sin decisiones autónomas; sin moderación automática; sanitización de prompt; llaves solo en backend.

---

## 12. Security & Authorization Design

### Authentication

Sesión de vendor (cookie HTTP-only existente).

### Authorization

Ownership: vendor solo sobre su propio perfil (ADR-SEC-003). Backend como source of truth.

### Ownership Rules

`vendor_user_id` del perfil debe coincidir con el usuario autenticado.

### Role Rules

Solo `vendor`. Organizer/admin → 403 (NT-01/NT-02).

### Negative Authorization Scenarios

Organizer → 403; Admin → 403; vendor sobre perfil ajeno → 403.

### Audit Requirements

`AIRecommendation` como evidencia; eventos de IA logueados. `AdminAction` no requerido.

### Sensitive Data Handling

No exponer llaves ni respuestas crudas del provider; redacción en logs (ADR-SEC-001). Rate limit de IA (SEC-02).

---

## 13. Testing Strategy

### Unit Tests

- Construcción de input de prompt; validación de output schema; truncado de bio (VR-02).
- Lógica de fallback por timeout.

### Integration Tests

- TS-01 Bio generada y editable; TS-02 Paquetes generados.
- NT-01 Organizer → 403; NT-02 Admin → 403.
- AUTH-TS-01 Vendor → 200; AUTH-TS-02 Organizer → 403.

### API Tests

- Contrato de los dos endpoints y de apply/discard.

### E2E Tests

- TS-03 Flujo E2E de perfil vendor con `MockAIProvider` (generar → editar → guardar).

### Security Tests

- Ownership negativo; rate limit; no exposición de llaves.

### Accessibility Tests

- Editor accesible; foco visible.

### AI Tests

- AI-TS-01 Mock genera bio (texto mostrado); AI-TS-02 Timeout → fallback.

### Seed / Demo Tests

- Si se agrega vendor seed, verificar generación en demo.

### CI Checks

lint, typecheck, unit, integración, build, smoke E2E (ADR-DEVOPS-006).

---

## 14. Observability & Audit

### Logs

`ai.vendor_bio.success/failure`, `ai.vendor_packages.success/failure`.

### Correlation ID

Requerido y propagado (ADR-API-004).

### AdminAction

No requerido.

### Error Tracking

Timeouts/fallback registrados con `fallbackUsed`.

### Metrics

Opcional: tasa de uso de IA por vendor (KPI ≥ 30%).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

Opcional: 1 vendor seed con inputs base (categoría, ciudad, años, especialidades) para demo.

### Demo Scenario Supported

Demostración de IA del lado del vendor (generar bio/paquetes, revisar y guardar).

### Reset / Isolation Notes

`is_seed=true`; `MockAIProvider` para determinismo.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| docs/3-MVP-Scope-Definition.md | AI-007 listado como Could/diferible. | Promovida a delivery actual (ADR-ARCH-005). | Alinear el MVP Scope con la promoción. | No |
| docs/7-AI-Features-Specification.md | AI-007 puede figurar como futura/diferible. | Habilitada por ADR-ARCH-005. | Marcar AI-007 como habilitada en delivery actual. | No |
| Backlog §4.1 / §11 | US-023 figuraba como diferida. | Promovida (anotado con ADR-ARCH-005). | Ya reconciliado en el backlog. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Output IA con afirmaciones sensibles/legales | Reputacional/legal | HITL + banner EC-01; sin auto-publicación. |
| Output fuera de schema | Datos inválidos | Validación estricta + fallback a template. |
| Abuso/costo de IA | Costo/latencia | Rate limit de IA (SEC-02). |
| Escritura a perfil ajeno | Seguridad | Ownership estricto (ADR-SEC-003). |
| Exposición de llaves del provider | Alta | Backend-only; redacción de logs. |

---

## 18. Implementation Guidance for Coding Agents

- **Archivos/áreas probables:** módulo `vendors` (use cases + controllers), reutilización del módulo `ai` (LLMProvider, AIRecommendation repo, apply/discard), Prompt Registry (`PROMPT-VENDOR-BIO-V1`/`PROMPT-VENDOR-PACKAGES-V1`), frontend `vendor/profile/edit` + `AIVendorBio`/`AIVendorPackages`, i18n, tests.
- **Orden recomendado:** (1) prompts en el registry + schemas de I/O; (2) use cases de generación + persistencia de AIRecommendation; (3) endpoints + Zod + ownership; (4) reutilizar apply/discard para escritura; (5) frontend (botones, editor, badges, banner EC-01); (6) observabilidad; (7) tests con MockAIProvider.
- **Decisiones que no se reabren:** HITL obligatorio; sin moderación IA; sin imágenes; sin auto-publicación; llaves solo backend; ownership vendor.
- **Qué NO implementar:** moderación automática, generación de imágenes, regeneración iterativa avanzada (US-026), decisiones autónomas.
- **Assumptions a preservar:** el vendor provee inputs mínimos; `AIRecommendation` ya soporta `vendor_bio`; `VendorProfile.bio` y `VendorService.description` existen.

---

## 19. Task Generation Notes

- **Grupos sugeridos:** AI/PromptOps (prompts + schemas + fallback), Backend (use cases, endpoints, ownership), Frontend (componentes, editor, badges, banner, i18n), Seguridad (ownership + rate limit + negativos), QA (unit/integration/E2E/AI), Observabilidad, Seed/demo (opcional), Documentación (alinear D3/D7).
- **QA obligatorio:** TS-01/02/03, NT-01/02, AUTH-TS-01/02, AI-TS-01/02.
- **Seguridad obligatorio:** ownership negativos, rate limit, no exposición de llaves.
- **Seed/demo:** opcional (vendor con inputs base).
- **Documentación:** alinear D3/D7 (AI-007 habilitada).
- **Dependencias entre tareas:** prompts/schemas antes de use cases; use cases antes de endpoints; endpoints antes de frontend/E2E; reutilizar apply/discard existentes.
- **Consolidated tasks.md:** PB-P4-002 agrupa solo US-023; no requiere consolidación.

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
| DB impact clear | Pass (sin cambios de esquema) |
| AI impact clear | Pass |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown.**

US-023 está aprobada y promovida formalmente (ADR-ARCH-005). El diseño reutiliza íntegramente la infraestructura de IA existente (LLMProvider, AIRecommendation con soporte `vendor_bio`, flujo HITL `apply/discard`, Prompt Registry) y el perfil de vendor, sin cambios de esquema. Respeta todos los guardrails (HITL, sin moderación IA, sin imágenes, llaves solo backend) y la autorización por ownership. Las notas no bloqueantes de aprobación (nombres de prompt versions y parámetros de rate limit) quedan resueltas a nivel de diseño. No hay bloqueos ni contradicciones con ADRs aceptados.
