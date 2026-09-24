# Technical Specification — US-008: Iniciar sesión con Google (OAuth)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-008 |
| Source User Story | management/user-stories/US-008-login-with-google.md |
| Decision Resolution Artifact | No aplica (promoción formalizada vía ADR-ARCH-005; ver `PO/BA Decisions Applied`) |
| Priority | P4 (promovida a delivery actual vía ADR-ARCH-005) |
| Backlog ID | PB-P4-001 |
| Backlog Title | OAuth Google login |
| Backlog Execution Order | Backlog P4 (promovido); ejecutar tras el flujo Auth base US-001…US-007 |
| User Story Position in Backlog Item | 1 de 1 (PB-P4-001 agrupa únicamente US-008) |
| Related User Stories in Backlog Item | US-008 |
| Epic | EPIC-AUTH-001 — Authentication & User Access |
| Backlog Item Dependencies | US-001/US-002 (registro tradicional), US-003 (login email/password), EPIC-SEC-001 (cookies de sesión) |
| Feature | OAuth Google (promovida desde Could Have / v1.1) |
| Module / Domain | Auth |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-08-13 |
| Last Updated | 2026-08-13 |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P4-001 — OAuth Google login** (`4-Product-Backlog-Prioritized.md` §11). Originalmente diferido a v1.1 por decisión PO. **Promovido a la fase de delivery actual** por decisión PO 2026-08-13, formalizada en **ADR-ARCH-005** (override de la diferición). El item agrupa únicamente a US-008.

### Execution Order Rationale

US-008 extiende el flujo de autenticación ya existente (US-001…US-007). Debe ejecutarse **después** de que la base de Auth esté disponible: entidad `User`, emisión de cookie de sesión HTTP-only (ADR-SEC-002), políticas `requireAuth`/`requireRole` (ADR-SEC-003) y hardening de `/auth/*` (ADR-SEC-004/006). No introduce dependencias nuevas hacia otros dominios.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-008 | Único item del backlog PB-P4-001 | 1 |

---

## 3. Executive Technical Summary

Implementar autenticación federada con Google mediante OAuth2 / OIDC (Authorization Code flow) en el backend como source of truth. El backend inicia el flujo (`GET /api/v1/auth/google`) generando `state` + `nonce` anti-CSRF, redirige a Google, y procesa el callback (`GET /api/v1/auth/google/callback`) verificando el `id_token` contra las JWK públicas del proveedor (`aud`, `iss`, `exp`, `email_verified`). Según el resultado:

- **Login** de usuario existente vinculado (`google_sub` coincide).
- **Signup** de nuevo usuario con selección de rol (`organizer`/`vendor`).
- **Vinculación** de `google_sub` a una cuenta email/password existente, previa confirmación explícita del usuario.

Tras éxito se emite la cookie de sesión HTTP-only firmada (misma mecánica que login tradicional) y se redirige por rol. El `id_token` nunca se expone al frontend. Se agrega el campo `google_sub` (nullable, UNIQUE, indexado) a `users` y se ajusta `password_hash` para admitir cuentas creadas solo por OAuth.

---

## 4. Scope Boundary

### In Scope

- Endpoints backend `GET /api/v1/auth/google` y `GET /api/v1/auth/google/callback`.
- Verificación de `id_token` con JWK del proveedor y validación de `aud`/`iss`/`exp`/`email_verified`.
- `state` + `nonce` anti-CSRF con almacenamiento temporal server-side (o cookie firmada de corta vida).
- Login, signup (con selección de rol) y vinculación a cuenta existente con confirmación.
- Migración `users.google_sub` (nullable UNIQUE + índice) y ajuste de `password_hash`.
- Emisión de cookie de sesión reutilizando el mecanismo actual.
- Frontend: botón "Continuar con Google", pantalla de selección de rol en primer signup, pantalla de confirmación de vinculación, manejo de estados loading/error.
- i18n en 4 locales; accesibilidad del botón.
- Observabilidad: eventos `auth.oauth.google.success/failure` con correlation ID.

### Out of Scope

- OAuth de otros proveedores (Facebook, Apple, GitHub).
- MFA combinado con OAuth.
- Multi-rol por usuario (sigue single-role; PB-P4-015 es item aparte).
- Cuenta admin vía Google (prohibido; admin solo por seed/admin).
- Almacenar el `id_token` o tokens de acceso de Google (solo se persiste `google_sub`).

### Explicit Non-Goals

- No reemplaza el login email/password (sigue siendo el flujo canónico).
- No habilita refresh tokens de Google ni acceso a APIs de Google (Calendar, etc.).

---

## 5. Architecture Alignment

### Backend Architecture

Módulo `auth` (Modular Monolith, Clean/Hexagonal). Controllers finos → casos de uso de aplicación → puertos. Nuevo **Port** `OAuthProvider` (interfaz) con implementación `GoogleOAuthProvider` en Infrastructure, para permitir tests deterministas con un mock (paralelo conceptual a `LLMProvider`). Reutiliza el servicio de emisión de sesión existente.

### Frontend Architecture

Next.js App Router. El botón redirige por navegación directa al endpoint backend (no fetch), por lo que el flujo OAuth es server-driven. Pantallas cliente para selección de rol y confirmación de vinculación consumen endpoints REST vía TanStack Query. next-intl para i18n.

### Database Architecture

PostgreSQL + Prisma. Se agrega `google_sub` a `users` como `String? @unique` con índice; `password_hash` pasa a nullable para cuentas OAuth-only. Migración Prisma reproducible (ADR-DB-005).

### API Architecture

REST `/api/v1` (ADR-API-001). Los dos endpoints OAuth son `GET` con redirecciones 302; el envelope estándar aplica solo a respuestas JSON de error donde corresponda (ADR-API-002). Validación Zod del `state`/query params (ADR-API-003). Correlation ID (ADR-API-004).

### AI / PromptOps Architecture

No aplica — esta historia no invoca IA.

### Security Architecture

Backend como source of truth (ADR-SEC-003). Verificación criptográfica del `id_token` con JWK, validación de `aud`/`iss`/`exp`/`email_verified` (SEC-01/SEC-02). `state`+`nonce` anti-CSRF (SEC-03). Cookie HTTP-only firmada tras éxito (ADR-SEC-002, SEC-04). No exponer `id_token` al frontend (SEC-05). Rate limiting/hardening de `/auth/*` (ADR-SEC-004/006). Habilitado por ADR-SEC-007 (SSO/OAuth) vía ADR-ARCH-005.

### Testing Architecture

Vitest + Supertest (backend), Playwright + MSW (frontend/E2E) con **mock OAuth provider** determinista. Tests negativos de seguridad como quality gate (ADR-TEST-004).

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Login OAuth existente | Callback verifica `id_token`, busca `User` por `google_sub`, emite cookie, redirige por rol. | Backend, DB, API, Frontend |
| AC-02 Primer login (signup) | Sin `User` con ese email → pantalla de selección de rol → crear `User` con `google_sub` y sesión. | Backend, DB, Frontend |
| AC-03 Vinculación cuenta existente | `User` por email sin `google_sub` → solicitar confirmación explícita → vincular `google_sub`; si no confirma, no vincula y queda anónimo. | Backend, DB, Frontend |
| EC-01 `email_verified=false` | Rechazo con mensaje neutro; log de evento. | Backend, API |
| EC-02 Cancelación consentimiento | Redirección a login, sesión anónima, mensaje neutro. | Backend, Frontend |
| VR-01 `id_token` válido/firma | Verificación JWK; falla → 400. | Backend |
| VR-02 `email_verified=true` | Validación claim; falla → 400. | Backend |
| VR-03 Rol requerido en signup | Selección obligatoria `organizer`/`vendor`; sin rol → error de validación. | Backend, Frontend |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Módulo `auth`. Nuevos artefactos internos: `OAuthProvider` (port), `GoogleOAuthProvider` (infra), casos de uso `OAuthLoginUseCase`, `OAuthSignupUseCase`, `OAuthLinkAccountUseCase` (o un `HandleGoogleCallbackUseCase` que orquesta los tres caminos).

### Use Cases / Application Services

- `StartGoogleOAuthUseCase`: genera `state`+`nonce`, persiste server-side (con TTL corto), construye la URL de autorización de Google.
- `HandleGoogleCallbackUseCase`: valida `state`, intercambia `code` por `id_token`, verifica el `id_token`, resuelve el camino (login/signup/link), y delega la emisión de sesión.
- Signup requiere transacción (creación de `User`); vinculación requiere transacción (update atómico de `google_sub`).

### Controllers / Routes

- `GET /api/v1/auth/google` → 302 a Google.
- `GET /api/v1/auth/google/callback` → procesa y redirige (302) a la ruta por rol, o a la pantalla de selección de rol/confirmación de vinculación cuando aplica.

### DTOs / Schemas

- Zod schema para query del callback: `code`, `state` (requeridos), `error`/`error_description` (cancelación).
- Schema para el endpoint de completar signup (rol seleccionado) y para confirmar vinculación (token de continuación de corta vida).

### Repository / Persistence

Extender `UserRepository` con `findByGoogleSub(sub)`, `findByEmail(email)`, `linkGoogleSub(userId, sub)` y `createOAuthUser({ email, googleSub, role })`. Acceso solo vía Prisma (ADR-BE-002).

### Validation Rules

VR-01/VR-02/VR-03 según §6. `state` debe existir y no haber expirado. `google_sub` único; colisión → conflicto controlado.

### Error Handling

Mensajes neutros al usuario ("No fue posible iniciar sesión" / "No fue posible completar"). Códigos: `state` inválido → 400; `id_token` expirado/ inválido → 400; `email_verified=false` → 400; sesión ya activa iniciando OAuth → 409 o redirect (AUTH-TS-02). Nunca filtrar detalle del proveedor.

### Transactions

Requerida en signup (crear `User`) y en vinculación (set `google_sub`), para atomicidad e idempotencia ante reintentos del callback.

### Observability

Emitir `auth.oauth.google.success` y `auth.oauth.google.failure` con `correlationId`; nunca loggear `id_token` ni PII sensible (redacción, ADR-SEC-001).

---

## 8. Frontend Technical Design

### Routes / Pages

- `/[locale]/auth/login`: incluye botón "Continuar con Google".
- Pantalla de selección de rol (primer signup) y pantalla de confirmación de vinculación (cuenta existente). Ruta de retorno del callback manejada por el backend con redirect.

### Components

`GoogleSignInButton`, `RoleSelectorOnSignup`, `LinkAccountConfirmation`.

### Forms

No hay formulario tradicional para el login; sí un control de selección de rol (POST al endpoint de completar signup) y confirmación de vinculación (acción explícita). React Hook Form + Zod donde aplique.

### State Management

Redirección server-driven + estado local mínimo. TanStack Query para las llamadas de completar signup / confirmar vinculación.

### Data Fetching

El inicio de OAuth es navegación directa (`window.location`/`<a>`), no fetch. Las acciones post-callback usan el API client REST.

### Loading / Empty / Error / Success States

Loading: spinner durante redirección. Error: mensaje neutro. Success: redirect al layout por rol. Empty: no aplica.

### Accessibility

Botón Google con label accesible e ícono con `aria`-adecuado; foco visible; contraste correcto.

### i18n

4 locales (next-intl). Mensajes neutros de error/estado traducidos.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| GET | `/api/v1/auth/google` | Iniciar flujo OAuth | No (Anonymous) | — (setea `state`/`nonce`) | 302 → Google | 409 si ya hay sesión activa (AUTH-TS-02) |
| GET | `/api/v1/auth/google/callback` | Procesar callback | No (Anonymous) | query: `code`, `state`, opcional `error` | 302 → ruta por rol / selección de rol / confirmación de vinculación; setea cookie de sesión en éxito | 400 `state` inválido, 400 `id_token` inválido/expirado, 400 `email_verified=false`, redirect en cancelación (EC-02) |
| POST | `/api/v1/auth/google/complete-signup` | Completar signup con rol | Continuación (token corto del callback) | body: `{ role: "organizer" \| "vendor" }` | 200 + cookie de sesión | 400 rol inválido/faltante (VR-03), 401/410 token de continuación inválido/expirado |
| POST | `/api/v1/auth/google/confirm-link` | Confirmar vinculación a cuenta existente | Continuación (token corto del callback) | body: `{ confirm: true }` | 200 + cookie de sesión | 400/410 si no confirma o token expiró (no vincula) |

> Los endpoints POST de continuación se proponen para separar el paso interactivo (rol / confirmación) del callback; la Technical Spec los deja como diseño recomendado y su naming final se valida en Task Breakdown.

---

## 10. Database / Prisma Design

### Models Impacted

`User` (`users`).

### Fields / Columns

- Agregar `googleSub String? @unique @map("google_sub")`.
- Modificar `passwordHash` a `String?` (`password_hash` nullable) para cuentas creadas solo por OAuth.

### Relations

Sin nuevas relaciones.

### Indexes

Índice UNIQUE sobre `google_sub` (implícito por `@unique`); considerar índice explícito si se requieren búsquedas parciales.

### Constraints

- UNIQUE (`google_sub`).
- Invariante de aplicación: un `User` debe tener `password_hash` **o** `google_sub` (al menos un método de autenticación). Se valida en capa de aplicación (no como CHECK, salvo que se decida en Task Breakdown).

### Migrations Impact

Migración Prisma aditiva: nueva columna nullable + índice unique + relajar NOT NULL de `password_hash`. Reproducible; sin backfill destructivo. Cuentas existentes conservan `password_hash`.

### Seed Impact

Opcional: un usuario seed con `google_sub` de ejemplo para demo de login OAuth existente. No obligatorio para el MVP de esta historia.

---

## 11. AI / PromptOps Design

No aplica — esta historia no invoca IA.

---

## 12. Security & Authorization Design

### Authentication

Authorization Code flow OIDC. Verificación del `id_token` con JWK del proveedor; validar firma, `aud` (client_id propio), `iss` (Google), `exp`, y `email_verified=true`. `nonce` emitido en el request y verificado en el `id_token`.

### Authorization

Endpoints Anonymous para iniciar/recibir el callback. Emisión de sesión reutiliza RBAC single-role. Admin nunca se crea/eleva vía Google.

### Ownership Rules

La vinculación solo procede sobre la cuenta cuyo email coincide con el verificado por Google y requiere confirmación explícita del usuario (AC-03).

### Role Rules

Signup exige selección `organizer`/`vendor` (VR-03). `role=admin` forzado a `organizer`/`vendor` (NT-04). Single-role.

### Negative Authorization Scenarios

`state` inválido → 400; `id_token` expirado → 400; `email_verified=false` → 400; intento de `role=admin` → rechazado/forzado. Todos con mensaje neutro.

### Audit Requirements

Log de eventos `auth.oauth.google.success/failure` con `correlationId`. `AdminAction` no requerido.

### Sensitive Data Handling

No se persiste el `id_token` ni tokens de acceso; solo `google_sub`. Redacción de tokens/PII en logs (ADR-SEC-001). `state`/`nonce` con TTL corto y de un solo uso.

---

## 13. Testing Strategy

### Unit Tests

- Verificación de `id_token` (firma/claims) con JWK mockeadas.
- Lógica de resolución de camino (login/signup/link) en `HandleGoogleCallbackUseCase`.
- Generación/validación de `state`+`nonce`.

### Integration Tests

- TS-01 Login OAuth existente exitoso.
- TS-02 Signup primer OAuth con selección de rol.
- TS-03 Vinculación de cuenta existente por email (con confirmación).
- NT-01 `id_token` expirado → 400; NT-02 `state` inválido → 400; NT-03 `email_verified=false` → 400; NT-04 `role=admin` → forzado.

### API Tests

- AUTH-TS-01 Anónimo inicia OAuth → 302 a Google.
- AUTH-TS-02 Sesión activa → 409/redirect.

### E2E Tests

- TS-04 Flujo E2E con **mock OAuth provider** (Playwright), cubriendo login, signup con rol y cancelación (EC-02).

### Security Tests

- CSRF/`state` tampering, `id_token` con `aud`/`iss` incorrectos, replay de `nonce`, no exposición del `id_token` al cliente. Incluidos en la suite negativa de seguridad (quality gate).

### Accessibility Tests

- Botón Google con label accesible; foco visible.

### AI Tests

No aplica.

### Seed / Demo Tests

Si se agrega usuario seed con `google_sub`, verificar login OAuth existente en demo.

### CI Checks

lint, typecheck, unit, integración, build, `prisma migrate validate`, smoke E2E (ADR-DEVOPS-006).

---

## 14. Observability & Audit

### Logs

`auth.oauth.google.success` / `auth.oauth.google.failure` estructurados.

### Correlation ID

Requerido y propagado (ADR-API-004).

### AdminAction

No requerido.

### Error Tracking

Fallos de verificación registrados sin filtrar detalle del proveedor ni tokens.

### Metrics

Opcional: tasa de éxito/latencia del flujo OAuth (objetivo < 5s, Business Impact).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

Opcional: 1 usuario seed con `google_sub` para demostrar AC-01.

### Demo Scenario Supported

Demostración de login federado y de signup con selección de rol.

### Reset / Isolation Notes

`is_seed=true` para datos de demo; `state`/`nonce` no persisten entre corridas.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| docs/3-MVP-Scope-Definition.md | Lista OAuth Google como "Could / opcional / no obligatorio". | Promovida a delivery actual (ADR-ARCH-005). | Alinear el MVP Scope con la promoción. | No |
| docs/19-Security-and-Authorization-Design.md (§32, §54, §1322, ROAD-SEC-002) | Describe OAuth como no obligatorio / roadmap futuro. | Habilitado vía ADR-SEC-007 + ADR-ARCH-005. | Actualizar D19 para reflejar OAuth Google habilitado; mover ROAD-SEC-002 a implementado. | No |
| docs/22 ADR-SEC-007 | SSO/OAuth como candidato futuro. | Habilitado para US-008 por ADR-ARCH-005. | Nota de reconciliación en ADR-SEC-007. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `password_hash` nullable debilita invariante de auth | Cuenta sin método de login | Validación de aplicación: exigir `password_hash` o `google_sub`. |
| Vinculación no consentida (account takeover por email) | Alto | Confirmación explícita obligatoria (AC-03) + `email_verified=true`. |
| Replay/CSRF en callback | Alto | `state`+`nonce` de un solo uso con TTL corto; verificación de `nonce` en `id_token`. |
| Rotación de JWK de Google | Fallos intermitentes de verificación | Cachear JWK con refresh por `kid`/expiración. |
| Fuga de `id_token` al frontend | Exposición de PII/token | Flujo server-driven; nunca enviar `id_token` al cliente. |

---

## 18. Implementation Guidance for Coding Agents

- **Archivos/áreas probables:** `backend/prisma/schema.prisma` (+ migración), módulo `auth` del backend (controllers, use cases, port `OAuthProvider`, infra `GoogleOAuthProvider`, repositorio `User`), config de credenciales (env/Secrets Manager), frontend `auth/login` + componentes `GoogleSignInButton`/`RoleSelectorOnSignup`/`LinkAccountConfirmation`, i18n de 4 locales, tests backend/E2E.
- **Orden recomendado:** (1) migración `google_sub` + `password_hash` nullable; (2) port + provider + verificación `id_token`; (3) casos de uso callback (login/signup/link) + emisión de sesión; (4) endpoints + Zod; (5) frontend (botón, selección de rol, confirmación); (6) i18n; (7) observabilidad; (8) tests.
- **Decisiones que no se reabren:** single-role; admin nunca por Google; no persistir `id_token`; backend como source of truth; cookie HTTP-only.
- **Qué NO implementar:** otros proveedores OAuth, MFA, multi-rol, acceso a APIs de Google.
- **Assumptions a preservar:** existen credenciales OAuth de Google Cloud y redirect URIs configuradas; la sesión se establece igual que en login tradicional.

---

## 19. Task Generation Notes

- **Grupos sugeridos:** DB/Migración, Backend (port+provider, verificación id_token, use cases, endpoints, validación), Frontend (botón, selección de rol, confirmación de vinculación, i18n), Seguridad (state/nonce, negativos), QA (unit/integration/E2E con mock provider), Observabilidad, DevOps/Config (credenciales + redirect URIs), Documentación (alinear D3/D19/ADR-SEC-007).
- **QA obligatorio:** TS-01…TS-04, NT-01…NT-04, AUTH-TS-01/02, tests negativos de seguridad.
- **Seguridad obligatorio:** `state`+`nonce`, verificación JWK, no exposición de `id_token`, redacción de logs.
- **Seed/demo:** opcional (usuario con `google_sub`).
- **Documentación:** tareas de alineación D3/D19/ADR-SEC-007.
- **Dependencias entre tareas:** migración antes de repositorio/use cases; provider antes de use cases; endpoints antes de frontend/E2E.
- **Consolidated tasks.md:** PB-P4-001 agrupa solo US-008; no requiere consolidación multi-US.

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
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown.**

US-008 está aprobada y promovida formalmente al delivery actual (ADR-ARCH-005). El alcance técnico es claro: dos endpoints OAuth server-driven, verificación de `id_token` con JWK, `state`+`nonce`, migración `google_sub` + `password_hash` nullable, y frontend para selección de rol y confirmación de vinculación. Las notas no bloqueantes de aprobación (librería de verificación de `id_token`, UX de vinculación) quedan resueltas a nivel de diseño en esta especificación. No hay bloqueos ni contradicciones con ADRs aceptados.
