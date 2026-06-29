# Technical Specification — US-005: Cerrar sesión

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-005 |
| Source User Story | `management/user-stories/US-005-logout-session.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-005-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-003 |
| Backlog Title | Login con email/password + logout |
| Backlog Execution Order | Tercer ítem de P1 dentro de EPIC-AUTH-001 (después de PB-P1-001 y PB-P1-002) |
| User Story Position in Backlog Item | 2 de 2 (logout, después de US-003 login) |
| Related User Stories in Backlog Item | US-003 (login), US-005 (logout) |
| Epic | EPIC-AUTH-001 — Authentication & User Access |
| Backlog Item Dependencies | PB-P0-004 (REST API foundation), PB-P0-006 (`SessionCookieIssuer`), US-003 (emisión de cookie) |
| Feature | Logout explícito |
| Module / Domain | Auth |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-25 |
| Last Updated | 2026-06-25 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-003 entrega el ciclo completo de sesión: US-003 emite la cookie y US-005 la invalida. US-005 cierra el backlog item y habilita la verificación de seguridad básica (no reuso, multi-pestaña).

### Execution Order Rationale

US-005 ejecuta después de US-003 porque depende de la cookie emitida por el login. Sus dependencias (`SessionCookieIssuer`, `authMiddleware`, error envelope) ya están entregadas en P0/US-003.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-003 | Login con email/password + cookie firmada | 1 |
| US-005 | Logout explícito (invalida cookie) | 2 |

---

## 3. Executive Technical Summary

Implementar `LogoutUseCase` y el endpoint REST `POST /api/v1/auth/logout`, protegido por `authMiddleware`, que rota la cookie de sesión (`Set-Cookie: session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`) reutilizando `SessionCookieIssuer.invalidate()` (PB-P0-006) y responde `204 No Content`. Sin sesión válida → `401 AUTHENTICATION_REQUIRED`. El frontend entrega `LogoutButton`/`UserMenu` con mutation `useLogout` (TanStack Query) que tras éxito o `401` invalida las queries `auth.*`/`me.*` y redirige a `/[locale]/auth/login`. Sin migraciones, sin nuevas tablas, sin invocación de IA. Sin selección de proveedor adicional.

---

## 4. Scope Boundary

### In Scope

- Endpoint `POST /api/v1/auth/logout` con `authMiddleware`.
- Rotación de cookie con flags canónicos (`HttpOnly`, `Secure` no-local, `SameSite=Lax`, `Path=/`, `Max-Age=0`).
- Respuesta `204 No Content` en éxito; `401 AUTHENTICATION_REQUIRED` sin sesión; `405 METHOD_NOT_ALLOWED` ante métodos inválidos.
- `LogoutButton` en `UserMenu` para los tres layouts (organizer / vendor / admin).
- `useLogout` con invalidación de queries `auth.*`/`me.*` y redirección a login.
- Manejo global de `401` post-logout en pestañas adicionales (gancho ya presente para US-003; se valida aquí).
- Eventos `auth.logout.success` y `auth.logout.no_session` con `correlationId`.
- Tests API, E2E para 3 roles y multi-pestaña.

### Out of Scope

- Logout selectivo por dispositivo (Future).
- Listado de sesiones activas (Future).
- Logout SSO / federated.
- Tabla `sessions` con `sid` revocado (Doc 19 §9.6 alternativa; reservada post-MVP con ADR).
- Logout silencioso por inactividad (Future).
- Modal de confirmación previo (Decisión PO US-005 #4).

### Explicit Non-Goals

- No persistir el evento de logout en base de datos.
- No exponer información sobre la existencia previa de la sesión.
- No rotar `SESSION_SECRET` en este flujo.

---

## 5. Architecture Alignment

### Backend Architecture

- Node.js + Express + TypeScript dentro de `modules/auth` (Doc 14).
- `LogoutUseCase` orquesta: lectura del `userId` y `correlationId` desde `RequestContext` (provisto por `authMiddleware`) → invocación a `SessionCookieIssuer.invalidate(res)` → emisión del evento `auth.logout.success`.
- Controlador delgado `POST /auth/logout` con cadena `correlationMiddleware → loggingMiddleware → authMiddleware → controller`.

### Frontend Architecture

- Next.js App Router. `LogoutButton` reutilizable montado dentro de `UserMenu` en los layouts autenticados.
- `useLogout` (TanStack Query mutation) consume `authApi.logout()` con `credentials: 'include'`. En `onSettled`, ejecuta `queryClient.removeQueries({ predicate: q => /^(auth|me)/.test(String(q.queryKey[0])) })` y `router.replace('/[locale]/auth/login')`.
- Interceptor global de `401` ya disponible para US-003: aquí solo se confirma que dispara la redirección.

### Database Architecture

No aplica.

### API Architecture

- REST `/api/v1/auth/logout` siguiendo Doc 16 §22.3.
- Error envelope estándar para `401` y `405` (Doc 16 §22.6 / §29).

### AI / PromptOps Architecture

No aplica.

### Security Architecture

- `authMiddleware` valida la cookie firmada (PB-P0-006) antes del use case.
- `SessionCookieIssuer.invalidate(res)` emite `Set-Cookie` con `Max-Age=0` y el resto de atributos canónicos.
- `SameSite=Lax` + método `POST` mitiga CSRF (Doc 19 §10, THR-004).
- Logs no exponen token, cookie firmada ni `Authorization`.

### Testing Architecture

- Vitest + Supertest para unit/integration/API.
- Playwright para E2E con 3 roles y escenarios multi-pestaña (`browser.newContext`).
- Tests de seguridad: no reuso de cookie (comparar request protegido antes y después).

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — Logout exitoso | `LogoutUseCase` se invoca con sesión válida; rota la cookie y responde `204`. Emite `auth.logout.success`. | Backend, API, Security |
| AC-02 — Estado cliente limpio | `useLogout.onSettled` invalida queries `auth.*`/`me.*` y redirige al login. | Frontend |
| AC-03 — Reuso de cookie | Cualquier request post-logout que conserve la cookie original sigue válida hasta su `Max-Age=30d` salvo que el navegador la haya descartado. Se documenta la limitación MVP en el Spec, no constituye AC bloqueante (Doc 19 §9.6 alternativa reservada para post-MVP). | Security (documentado) |
| EC-01 — Sin sesión | `authMiddleware` devuelve `401 AUTHENTICATION_REQUIRED`; frontend redirige al login. Evento `auth.logout.no_session`. | Backend, Frontend |
| EC-02 — Multi-pestaña | Pestañas adicionales detectan la pérdida cuando reciben `401` en su próximo request protegido; el interceptor global redirige. | Frontend |
| EC-03 — Método no permitido | Router responde `405 METHOD_NOT_ALLOWED` antes de invocar el use case. | API |

> Nota sobre AC-03: la rotación con `Max-Age=0` aplica sólo al cliente que ejecuta el logout. Una cookie persistida fuera del navegador (snapshot, copia) podría seguir siendo aceptada por la firma hasta su expiración. Esta limitación es la elección MVP documentada (Decisión PO US-005 #3). Si se requiere invalidación global, se promueve por ADR a la alternativa `sessions`.

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- `modules/auth` (controllers, use cases).
- Reutiliza `SessionCookieIssuer` de `modules/security` (PB-P0-006).
- Reutiliza `authMiddleware`, `correlationMiddleware`, `loggingMiddleware` de `modules/platform` (PB-P0-004/PB-P0-007).

### Use Cases / Application Services

- `LogoutUseCase.execute(ctx: RequestContext): void` — sin output.

### Controllers / Routes

- `POST /api/v1/auth/logout` (`AuthController.logout`).
- Cadena: `correlationMiddleware → loggingMiddleware → authMiddleware → controller`.
- `methodNotAllowedHandler` (PB-P0-004) atiende `GET/PUT/DELETE/PATCH/...`.

### DTOs / Schemas

- Sin body. No requiere Zod.

### Repository / Persistence

- No aplica.

### Validation Rules

- VR-01: cuerpo opcional ignorado.
- VR-03: respuesta sin body (`204`).
- VR-04: sesión obligatoria.

### Error Handling

| Caso | HTTP | `errorCode` |
|---|---|---|
| Sin sesión válida | 401 | `AUTHENTICATION_REQUIRED` |
| Método no permitido | 405 | `METHOD_NOT_ALLOWED` |

### Transactions

No requiere.

### Observability

- Eventos: `auth.logout.success` (level `info`), `auth.logout.no_session` (level `info`).
- Métricas: `auth_logout_total{result}`, `auth_logout_latency_seconds`.
- Logs incluyen `correlationId`, `userId` cuando aplica; nunca el token.

---

## 8. Frontend Technical Design

### Routes / Pages

- Disponible en todos los layouts autenticados via `UserMenu`.

### Components

- `UserMenu` (existente o nuevo).
- `LogoutButton`.

### Forms

- No aplica.

### State Management

- TanStack Query mutation `useLogout` con `mutationFn: authApi.logout`.
- En `onSettled`: `queryClient.removeQueries({ predicate })` para `auth.*` y `me.*`, luego `router.replace('/[locale]/auth/login')`.
- Interceptor global de `401` ya consume el mismo handler para multi-pestaña.

### Data Fetching

- `authApi.logout()` ejecuta `fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })`.

### Loading / Empty / Error / Success States

- Loading: spinner breve en `LogoutButton`.
- Error de red: toast genérico; el botón vuelve a habilitarse.
- `401`: tratado igual que éxito (redirección).

### Accessibility

- Botón con `aria-label` cuando se usa como ícono.
- Focus visible y tabbable.

### i18n

- Mensaje `userMenu.logout` en `es-LATAM`, `es-ES`, `pt`, `en`.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/logout` | Cerrar sesión | Sí (cookie) | sin body | `204 No Content` + `Set-Cookie: session=; Max-Age=0; ...` | `401 AUTHENTICATION_REQUIRED`, `405 METHOD_NOT_ALLOWED` |

Cabeceras emitidas en `204`:

- `Set-Cookie: session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`.

---

## 10. Database / Prisma Design

No aplica. No se introduce ni modifica ningún modelo. La alternativa con tabla `sessions` queda explícitamente fuera del alcance (Decisión PO US-005 #3).

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

- `authMiddleware` (PB-P0-006) decodifica la cookie firmada antes del controlador.

### Authorization

- Cualquier rol autenticado puede invocar logout.

### Ownership Rules

- El logout solo afecta la cookie del cliente actual.

### Role Rules

- No se diferencia comportamiento por rol.

### Negative Authorization Scenarios

- Sin cookie → `401 AUTHENTICATION_REQUIRED`.
- Cookie inválida (firma incorrecta, expirada) → `401`.
- `GET/PUT/DELETE/PATCH` → `405 METHOD_NOT_ALLOWED`.

### Audit Requirements

- Eventos `auth.logout.success` y `auth.logout.no_session` con `correlationId`.
- `AdminAction`: no requerido.

### Sensitive Data Handling

- No registrar el valor del token de sesión.

---

## 13. Testing Strategy

### Unit Tests

- `LogoutUseCase` (éxito; ausencia de side effects más allá de la rotación de cookie y el log).
- `SessionCookieIssuer.invalidate` (cobertura ya esperada en PB-P0-006; aquí se valida la composición en el controlador).

### Integration Tests

- Composición `correlation → logging → auth → controller`.
- `authMiddleware` con cookie válida vs inválida.

### API Tests (Supertest)

- `204 No Content` con `Set-Cookie: session=; Max-Age=0; HttpOnly; Secure; SameSite=Lax; Path=/`.
- `401 AUTHENTICATION_REQUIRED` sin cookie.
- `401` con cookie alterada.
- `405 METHOD_NOT_ALLOWED` ante `GET /auth/logout`.
- Validación de que el siguiente `GET /me` con la cookie rotada devuelve `401`.

### E2E Tests (Playwright)

- Logout para 3 roles desde el `UserMenu` y redirección a `/[locale]/auth/login`.
- Multi-pestaña: hacer logout en una pestaña; en la otra, el siguiente request protegido recibe `401` global y redirige.

### Security Tests

- Tras logout, el cliente no puede invocar endpoints protegidos sin nuevo login (la cookie del cliente quedó rotada).
- Cookie no aparece en logs ni en respuestas.

### Accessibility Tests

- `axe` sobre `UserMenu` con `LogoutButton` visible.
- Navegación por teclado.

### AI Tests

No aplica.

### Seed / Demo Tests

- Cubierto por E2E de 3 roles.

### CI Checks

- Cobertura mínima módulo `auth` ≥ 85%.

---

## 14. Observability & Audit

### Logs

- `auth.logout.success`: `info`; payload `correlationId`, `userId`, `role`.
- `auth.logout.no_session`: `info`; payload `correlationId`, `ip`.

### Correlation ID

- Provisto por `correlationMiddleware`.

### AdminAction

- No requerido.

### Error Tracking

- Reporta `401`/`405` por nivel.

### Metrics

- `auth_logout_total{result}`, `auth_logout_latency_seconds`.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

- Reutiliza usuarios seed de Doc 11 para los 3 roles.

### Demo Scenario Supported

- Cierre limpio de sesión durante la demo académica.

### Reset / Isolation Notes

- No requiere reset adicional.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 19 §9.6 | Doc 19 presenta dos alternativas (rotación / `sessions` revocadas) sin elegir una. | Rotación de cookie con `Max-Age=0` para MVP (Decisión PO US-005 #3). | Anotar la elección en Doc 19 §9.6; ADR sólo si se promueve a `sessions` en el futuro. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Reuso de cookie original conservada fuera del navegador | El portador puede mantener sesión hasta `Max-Age` original | Limitación documentada (Decisión PO US-005 #3); promoción a `sessions` con ADR si el riesgo crece. |
| Race condition: cookie expira entre carga del UserMenu y clic en logout | Usuario recibe `401` en vez de `204` | Frontend trata `401` igual que éxito (redirige al login). |
| Tests E2E multi-pestaña inestables | Falsos negativos | Usar contextos separados y `expect.poll` en Playwright. |
| Configuración `Secure` en local | Cookie no rotada en HTTP local | Mantener la convención de US-003 (`Secure` solo en no-local). |

---

## 18. Implementation Guidance for Coding Agents

- Archivos/carpetas probablemente impactados:
  - Backend: `apps/api/src/modules/auth/application/use-cases/LogoutUseCase.ts`; `apps/api/src/modules/auth/interfaces/http/AuthController.logout`; ruta `POST /api/v1/auth/logout`.
  - Frontend: `apps/web/components/auth/{LogoutButton.tsx,UserMenu.tsx}`; `apps/web/lib/api/authApi.ts` (`logout`); `apps/web/lib/hooks/useLogout.ts`; `apps/web/messages/{es-LATAM,es-ES,pt,en}/userMenu.json`.
  - Tests: `apps/api/test/modules/auth/logout.*.test.ts`; `e2e/logout-3-roles.spec.ts`; `e2e/logout-multitab.spec.ts`.
- Orden recomendado:
  1. Backend: `LogoutUseCase` + ruta + Set-Cookie + middlewares.
  2. Tests API.
  3. Frontend: `LogoutButton` + `useLogout` + integración con `UserMenu`.
  4. E2E 3 roles y multi-pestaña.
  5. Documentation Alignment (Doc 19 §9.6).
- Decisiones que no deben reabrirse:
  - Endpoint estricto (`401` sin sesión).
  - `204` éxito sin body.
  - Rotación de cookie (sin tabla `sessions`).
  - Sin modal de confirmación.
- Lo que no debe implementarse:
  - Tabla `sessions`.
  - Logout selectivo o lista de sesiones.
  - Modal de confirmación.
- Supuestos a preservar:
  - El backend es la única fuente de verdad de autorización.
  - Las cookies son `HttpOnly`.

---

## 19. Task Generation Notes

- Grupos sugeridos:
  - `auth-be-logout`: use case + controller + middleware + cookie rotation.
  - `auth-fe-logout`: `LogoutButton`, `useLogout`, integración `UserMenu`, i18n.
  - `auth-qa-logout`: unit, integration, API, E2E 3 roles, multi-pestaña, accesibilidad.
  - `auth-obs-logout`: eventos y métricas.
  - `auth-doc-logout`: alineación Doc 19 §9.6.
- Tareas QA obligatorias:
  - Verificación de `Set-Cookie` con `Max-Age=0`.
  - Cookie post-logout no abre sesión.
  - Multi-pestaña.
- Tareas de seguridad:
  - `authMiddleware` aplicado.
  - Logs sin token.
- Tareas seed/demo:
  - E2E con 3 roles.
- Documentación:
  - Anotar Doc 19 §9.6.
- Dependencias:
  - `auth-fe-logout` depende de `auth-be-logout` por contratos.
  - `auth-qa-logout` depende de ambos.
- `tasks.md` consolidado:
  - Recomendado consolidar `tasks.md` de PB-P1-003 ahora que US-003 y US-005 entregan el ciclo completo de sesión.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | Pass |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass |
| DB impact clear | N/A |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

La US-005 está aprobada (Approved with Minor Notes), con decisiones PO/BA formalizadas y dependencias resueltas por US-003 y P0. Documentation Alignment con Doc 19 §9.6 no bloqueante. Próxima skill: `eventflow-user-story-to-development-tasks`.
