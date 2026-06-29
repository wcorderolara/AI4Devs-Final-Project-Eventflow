# Technical Specification — US-006: Ver y editar mi perfil propio

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-006 |
| Source User Story | `management/user-stories/US-006-view-edit-own-profile.md` |
| Decision Resolution Artifact | No requerido (no quedaron blockers tras refinement; decisiones formalizadas en `PO/BA Decisions Applied` y PB-P1-005) |
| Priority | P1 |
| Backlog ID | PB-P1-005 |
| Backlog Title | Perfil propio + cambio de idioma |
| Backlog Execution Order | 23 (18 P0 items + PB-P1-001..004 = 22, esta es la 5ª de P1) |
| User Story Position in Backlog Item | 1 de 2 |
| Related User Stories in Backlog Item | US-006 (perfil + password + cambio de idioma), US-007 (selector de idioma con nombres nativos / detalle UX i18n) |
| Epic | EPIC-AUTH-001 — Authentication & User Access |
| Backlog Item Dependencies | PB-P1-003 (sesión activa); transitivamente PB-P0-004 (REST API foundation), PB-P0-006 (cookies HTTP-only), PB-P0-007 (rate limiting / middleware chain), PB-P0-008 (RBAC + ownership negative tests), PB-P0-012/013 (frontend bootstrap + TanStack Query + i18n) |
| Feature | Gestión de perfil propio + cambio de idioma |
| Module / Domain | Auth / Users |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-25 |
| Last Updated | 2026-06-25 |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-005 — Perfil propio + cambio de idioma` agrupa la pantalla `/[locale]/profile` para los tres roles autenticados (organizer, vendor, admin). El backlog item formaliza cuatro decisiones de aceptación: email no editable en MVP, cambio de password invalida otras sesiones, selector de idioma con nombres nativos (`Español LATAM`, `Español`, `Português`, `English`) y aplicación inmediata del cambio en la UI. Depende de `PB-P1-003` (login + logout) para disponer de una sesión activa real.

### Execution Order Rationale

Las 18 historias P0 establecen la fundación (esquema DB, REST API, cookies, captcha, RBAC, frontend bootstrap, i18n, TanStack Query, seed, QA tooling, CI). En P1, el orden lógico es: registro (PB-P1-001/002), login + logout (PB-P1-003), reset password (PB-P1-004) y, sobre esa base autenticada, la gestión del perfil propio (PB-P1-005). Sin sesión consolidada y sin `argon2` operativo (PB-P0-007), no es posible verificar `currentPassword` ni invalidar otras sesiones. US-006 se ejecuta como primera de PB-P1-005 porque cubre el flujo principal (ver/editar/contraseña); US-007 puede ejecutarse en paralelo o inmediatamente después, ya que se enfoca en el detalle del selector i18n.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-006 — Ver y editar mi perfil propio | Núcleo del backlog item: lectura/edición de perfil, cambio de idioma propio y cambio de contraseña con invalidación de otras sesiones. | 1 |
| US-007 — (companion) Selector de idioma con nombres nativos y cambio inmediato | Refina la UX del selector y casos de prueba i18n específicos. | 2 (paralelizable tras los componentes base de US-006) |

---

## 3. Executive Technical Summary

Construir la pantalla autenticada `/[locale]/profile` (Next.js App Router + next-intl) que consume cuatro endpoints REST bajo `/api/v1/users/me*` ya provistos por la implementación de `PB-P0-007 / US-094`: `GET`, `PATCH`, `PATCH /preferred-language` y `POST /change-password`. La capa backend reutiliza el `authMiddleware`, el wrapper `argon2id` y el `SessionCookieIssuer` (estrategia consistente con la rotación adoptada por US-005 / Doc 19 §9.6). Los DTOs (`UpdateProfileRequestDto`, `UpdatePreferredLanguageRequestDto`, `ChangePasswordRequestDto`) usan validación Zod alineada con Doc 19 §11.2 (política de password) y Doc 16 §23 (whitelist `name`, `phone`, `preferredLanguage`). El cambio de password se ejecuta en una transacción Prisma que actualiza `password_hash` e invalida las "otras sesiones" del usuario manteniendo la sesión actual. La UI se compone de dos secciones (Datos básicos / Seguridad) con React Hook Form + Zod, TanStack Query hooks (`useMe`, `useUpdateProfile`, `useUpdatePreferredLanguage`, `useChangePassword`) y un `LanguageSelector` que aplica el cambio inmediatamente (FR-I18N-002) re-hidratando `next-intl`. No hay impacto en la capa AI ni nuevas migraciones (los campos ya existen en `users`).

---

## 4. Scope Boundary

### In Scope

- Pantalla `/[locale]/profile` con dos secciones: Datos básicos y Seguridad.
- Lectura del perfil propio (AC-01) consumiendo `GET /api/v1/users/me`.
- Edición parcial de `name`, `phone`, `preferredLanguage` (AC-02) vía `PATCH /api/v1/users/me`.
- Cambio inmediato de idioma (AC-03) vía `PATCH /api/v1/users/me/preferred-language` + re-hidratación de `next-intl`.
- Cambio de contraseña (AC-04) vía `POST /api/v1/users/me/change-password` con verificación `argon2.verify`, política Doc 19 §11.2, invalidación de "otras sesiones" y conservación de la sesión actual.
- Whitelist estricta de campos editables.
- Rate limit en `change-password` (Doc 19 §12: 5/usuario/h).
- Eventos estructurados de observabilidad (`user.profile.updated`, `user.preferred-language.updated`, `user.password.changed`, `user.password.change.failed`, `auth.ownership.violation`).
- Tests TS-01..08, NT-01..10, AUTH-TS-01..05, accesibilidad.

### Out of Scope

- Cambio de email (Future con re-verificación obligatoria).
- Cambio de rol por el usuario (siempre admin/seed).
- Eliminación de cuenta auto-servicio.
- Avatar / foto del `User`.
- MFA / 2FA.
- Listado de sesiones activas y logout selectivo.
- Re-login forzado tras cambio de password.
- Cambio de moneda preferida del usuario (BR-I18N-008).
- Migraciones de DB (los campos ya existen).
- Implementación inicial de los endpoints `/api/v1/users/me*` (la entrega operativa pertenece a US-094 / PB-P0-007).

### Explicit Non-Goals

- No reabrir las decisiones formalizadas en PB-P1-005 (email no editable, mantenimiento de la sesión actual, selector con nombres nativos).
- No introducir tabla `sessions` persistente: la invalidación se logra mediante la estrategia ya adoptada (rotación de cookie consistente con US-005) y, si fuera necesario, una lista in-memory de revocados.
- No exponer `password_hash` ni metadatos sensibles en `GET /api/v1/users/me`.

---

## 5. Architecture Alignment

### Backend Architecture

- Modular Monolith con Clean/Hexagonal Architecture. Bounded context: `auth` (subdominio `users/me`).
- Use cases en `application/`; controllers thin en `interface/http/`; repositorios Prisma en `infrastructure/db/`.
- Reutiliza wrappers `argon2id` y `SessionCookieIssuer` provistos por PB-P0-006/PB-P0-007.
- Errores siguen el error envelope estándar PB-P0-003/PB-P0-004.

### Frontend Architecture

- Next.js App Router. Página `/[locale]/profile` como Client Component (requiere sesión y mutaciones).
- TanStack Query (PB-P0-013) para `useMe`, `useUpdateProfile`, `useUpdatePreferredLanguage`, `useChangePassword`.
- React Hook Form + Zod para formularios; schemas duplicados/co-located con los del backend para single source of truth (idealmente un paquete compartido o copia controlada).
- next-intl para i18n; el cambio de idioma re-hidrata el contexto sin recargar la página.

### Database Architecture

- Sin migraciones nuevas. Modelo `User` ya contiene `name`, `phone`, `preferred_language`, `password_hash`, `created_at`, `updated_at`, `role`, `email`.
- Si Doc 18 no incluye check constraint sobre `preferred_language`, se documenta como validación a nivel aplicación (Zod) sin requerir migración en esta US.

### API Architecture

- REST JSON bajo `/api/v1/users/me*`. Cuatro endpoints listados en §9.
- Endpoint dedicado `PATCH /preferred-language` se conserva por compatibilidad con Doc 16 §23.2 y US-094 además del PATCH genérico.
- Cookies HTTP-only con atributos canónicos (Doc 19 §10): `HttpOnly`, `Secure` (no-local), `SameSite=Lax`, `Path=/`.

### AI / PromptOps Architecture

No aplica. Esta historia no invoca `LLMProvider`. El cambio de `preferred_language` del usuario no propaga al motor IA (BR-I18N-004/007 indican que el idioma efectivo para IA proviene del `Event`).

### Security Architecture

- Backend como source of truth: `authMiddleware` verifica la cookie de sesión antes de cualquier handler.
- Ownership policy implícita por uso exclusivo de `/users/me*` (no se exponen rutas con `userId` en path para edición de perfil — Doc 5 §9.1, §10).
- Hashing argon2id (ADR-SEC-003) con verificación en tiempo constante.
- Rate limit por usuario sobre `change-password` (5/usuario/h, Doc 19 §12).
- Redacción de logs de password/hash/tokens (Doc 19 §11.3, ADR-SEC-001).

### Testing Architecture

- Backend: Vitest + Supertest sobre los cuatro endpoints.
- Frontend: Vitest + Testing Library + MSW para los hooks y formularios.
- E2E: Playwright cubriendo el flujo completo (ver, editar, cambiar idioma, cambiar password).
- Tests negativos de autorización (PB-P0-008 ya cubre el patrón general; aquí se incorporan los específicos de `users/me*`).
- Tests de accesibilidad básicos sobre `/profile`.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (Ver perfil) | `useMe` consume `GET /api/v1/users/me`; el handler invoca `GetMyProfileUseCase` que retorna un `UserProfileResponseDto` (sin `password_hash`). La UI renderiza campos; `email` y `role` son `readOnly`. | Frontend, Backend, API |
| AC-02 (Editar datos básicos) | `useUpdateProfile` envía `PATCH /api/v1/users/me` con `{name?, phone?, preferredLanguage?}`. Zod aplica VR-01..VR-03 y VR-06. `UpdateOwnProfileUseCase` ejecuta whitelist y `prisma.user.update`. Emite `user.profile.updated`. | Frontend, Backend, API, Observability |
| AC-03 (Cambio inmediato de idioma) | `useUpdatePreferredLanguage` invoca `PATCH /api/v1/users/me/preferred-language`. La UI re-hidrata `next-intl` con el nuevo locale sin recargar la página y navega al mismo path con el segmento `[locale]` actualizado. Emite `user.preferred-language.updated`. | Frontend, Backend, API, i18n, Observability |
| AC-04 (Cambiar contraseña) | `useChangePassword` envía `POST /api/v1/users/me/change-password`. `ChangePasswordUseCase` ejecuta `argon2.verify(currentPassword, password_hash)` en tiempo constante, valida política Doc 19 §11.2 sobre `newPassword`, abre transacción Prisma, actualiza `password_hash`, invalida "otras sesiones" del usuario manteniendo la actual, retorna `204`. Emite `user.password.changed`. | Frontend, Backend, API, Security, Observability |
| EC-01 (cambio de email ignorado) | Whitelist Zod en `UpdateProfileRequestDto` con `.strict()` ajustado para ignorar (no rechazar) campos extra: el DTO usa `pickKnownFields()` antes de validar para ignorar `email` y `role` sin emitir error. | Backend, API |
| EC-02 (`currentPassword` errónea) | `argon2.verify` falla → use case retorna `Result.fail("INVALID_CURRENT_PASSWORD")`; controlador mapea a `401 INVALID_CURRENT_PASSWORD` y registra `user.password.change.failed`. Rate limiter aplica counter. | Backend, API, Security, Observability |
| EC-03 (editar perfil ajeno) | No existe ruta `PATCH /api/v1/users/:userId` en MVP; router devuelve `404`. Si una ruta especulativa llegara al backend, el ownership middleware emite `403 FORBIDDEN`. | Backend, API, Security |
| EC-04 (newPassword no cumple política) | Zod schema con regla compuesta (longitud, alfanumérico, no localpart del email). Falla → `422 PASSWORD_POLICY_VIOLATION` con `details[]`. | Backend, API |
| EC-05 (idioma no soportado) | Enum Zod con `['es-LATAM','es-ES','pt','en']`. Falla → `422 UNSUPPORTED_LANGUAGE`. Selector frontend cerrado al set. | Frontend, Backend, API |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- Subdominio `auth/users/me` dentro del módulo `auth`.
- Comparte infraestructura con `auth/login` (`SessionCookieIssuer`, `argon2`).

### Use Cases / Application Services

- `GetMyProfileUseCase` — lectura del `User` autenticado.
- `UpdateOwnProfileUseCase` — aplica whitelist y `prisma.user.update`.
- `UpdatePreferredLanguageUseCase` — atajo que sólo actualiza `preferred_language`.
- `ChangePasswordUseCase` — verifica `currentPassword`, valida política, actualiza hash, invalida otras sesiones, todo en transacción.

### Controllers / Routes

- `UsersMeController` bajo `/api/v1/users/me`.
- Métodos: `getMe`, `updateMe`, `updatePreferredLanguage`, `changePassword`.
- Cada handler pasa por `authMiddleware`; `changePassword` pasa adicionalmente por `rateLimitMiddleware` configurado a 5/usuario/h.

### DTOs / Schemas

```ts
// Request DTOs (Zod)
const UpdateProfileRequestDto = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().regex(E164_REGEX).nullable().optional(),
  preferredLanguage: z.enum(['es-LATAM', 'es-ES', 'pt', 'en']).optional(),
}).strip(); // descarta silenciosamente campos no listados (email, role, etc.)

const UpdatePreferredLanguageRequestDto = z.object({
  preferredLanguage: z.enum(['es-LATAM', 'es-ES', 'pt', 'en']),
}).strict();

const ChangePasswordRequestDto = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordPolicySchema, // ≥10, ≥1 letra, ≥1 número, comparado con email del usuario actual fuera del schema
}).strict();

// Response DTO
type UserProfileResponseDto = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  preferredLanguage: 'es-LATAM' | 'es-ES' | 'pt' | 'en';
  role: 'organizer' | 'vendor' | 'admin';
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
};
```

### Repository / Persistence

- `UserRepository.findById(userId)` — para hidratar el perfil.
- `UserRepository.updateProfile(userId, patch)` — `prisma.user.update` con campos whitelisted.
- `UserRepository.updatePasswordHash(userId, newHash)` — invoca dentro de la transacción de `ChangePasswordUseCase`.
- Si la estrategia de invalidación adopta lista in-memory (consistente con US-005), se reutiliza el servicio correspondiente; si adopta tabla `sessions`, se evalúa pero no se introduce aquí (out-of-scope de la US).

### Validation Rules

| Regla | Implementación |
|---|---|
| VR-01 `name` 2..120 (post-trim) | Zod `.trim().min(2).max(120)` |
| VR-02 `phone` E.164 opcional | Zod `.regex(E164_REGEX).nullable().optional()`. La elección entre regex E.164 puro y `libphonenumber-js` queda como decisión técnica menor; el spec recomienda regex E.164 por simplicidad MVP y reservar la librería como mejora futura. |
| VR-03 `preferredLanguage` ∈ set | Zod `enum` |
| VR-04 `newPassword` política | `passwordPolicySchema` con `.min(10).regex(/[a-zA-Z]/).regex(/\d/)` + check extra contra `localpart(email)` en el use case |
| VR-05 `currentPassword` | requerida en DTO; verificada con `argon2.verify` en el use case |
| VR-06 whitelist | Zod `.strip()` para silent ignore de `email`, `role`, etc. |

### Error Handling

| Caso | Código HTTP | Error code | Notas |
|---|---|---|---|
| Sin sesión | 401 | `AUTHENTICATION_REQUIRED` | `authMiddleware` |
| `currentPassword` incorrecta | 401 | `INVALID_CURRENT_PASSWORD` | mensaje genérico, no distingue |
| `currentPassword` faltante | 422 | `CURRENT_PASSWORD_REQUIRED` | falla Zod en DTO |
| `newPassword` no cumple política | 422 | `PASSWORD_POLICY_VIOLATION` | `details[]` con check fallido |
| `preferredLanguage` fuera del set | 422 | `UNSUPPORTED_LANGUAGE` | falla Zod enum |
| `phone` inválido | 422 | `VALIDATION_FAILED` | path `phone` |
| Rate limit excedido | 429 | `TOO_MANY_REQUESTS` | `Retry-After` |
| Ruta `userId` especulativa | 404 / 403 | `NOT_FOUND` / `FORBIDDEN` | EC-03 |
| Error genérico | 500 | `INTERNAL_SERVER_ERROR` | envelope estándar |

### Transactions

- `ChangePasswordUseCase` envuelve `prisma.$transaction([updatePasswordHash, invalidateOtherSessions])` para garantizar atomicidad. Si la invalidación es in-memory (lista de revocados), la "transacción" combina la operación DB con la operación de servicio, encadenada con manejo de error que revierte el cambio de hash si la invalidación falla (rollback explícito) — esta política se documenta y queda registrada como decisión técnica.

### Observability

- Pino logger con redacción de campos sensibles (PB-P0-003).
- Eventos estructurados (campo `event`):
  - `user.profile.viewed`
  - `user.profile.updated` (incluye `changedFields[]`, sin valores).
  - `user.preferred-language.updated` (`from`, `to`).
  - `user.password.changed` (sin hashes/passwords; incluye `sessionsInvalidatedCount` si está disponible).
  - `user.password.change.failed` (`reason`).
  - `auth.ownership.violation` (si aplica EC-03).
- Cada evento incluye `correlationId` y `userId`.

---

## 8. Frontend Technical Design

### Routes / Pages

- `app/[locale]/profile/page.tsx` (Client Component) — gating por sesión; redirige a `/[locale]/login` si `useMe` devuelve 401.

### Components

- `ProfileForm` — datos básicos (`name`, `phone`, `preferredLanguage`).
- `ChangePasswordForm` — `currentPassword`, `newPassword`, `confirmNewPassword` (validación cliente: igual a `newPassword`).
- `LanguageSelector` — lista con nombres nativos (`Español LATAM` → `es-LATAM`, `Español` → `es-ES`, `Português` → `pt`, `English` → `en`).
- `ProfileTabs` — tabs / acordeón Datos básicos / Seguridad.

### Forms

- React Hook Form + Zod en el cliente, espejando los schemas backend.
- Schemas frontend pueden vivir en `@/lib/api/users-me/schemas.ts` para reuso por hooks/forms.

### State Management

- TanStack Query hooks:
  - `useMe()` — `GET /api/v1/users/me`. `staleTime` moderado; invalidación tras cualquier `useUpdateProfile`/`useUpdatePreferredLanguage`/`useChangePassword`.
  - `useUpdateProfile()` — `PATCH /api/v1/users/me`.
  - `useUpdatePreferredLanguage()` — `PATCH /api/v1/users/me/preferred-language`.
  - `useChangePassword()` — `POST /api/v1/users/me/change-password`.
- Tras el éxito de `useUpdatePreferredLanguage`, ejecutar `router.replace` al mismo path con el nuevo segmento `[locale]` y `queryClient.invalidateQueries(['me'])`.

### Data Fetching

- Llamadas vía `usersApi` (axios/fetch wrapper con `credentials: 'include'`, mapeo de error envelope a `ApiError`).
- MSW en dev/test simula las cuatro rutas.

### Loading / Empty / Error / Success States

- Loading: skeleton al cargar `GET /me`; spinner inline en cada submit.
- Empty: no aplica.
- Error: mensajes inline por campo + banner global para `401/403/429/5xx`. Mensajes localizados.
- Success: toast `Perfil actualizado` o `Contraseña actualizada`.

### Accessibility

- Labels asociados (`htmlFor`/`id`).
- `aria-invalid` y `aria-describedby` en errores.
- `role="status"` / `aria-live="polite"` para anuncios de éxito.
- Foco gestionado tras submit (mover foco al primer error o al toast).
- Selector de idioma operable por teclado.

### i18n

- next-intl: claves para todos los textos UI, mensajes de error y opciones del selector.
- Al cambiar idioma, re-hidratar el contexto y persistir el nuevo locale en la URL.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| GET | `/api/v1/users/me` | Obtener perfil propio | Sí | — | 200 `UserProfileResponseDto` | 401 `AUTHENTICATION_REQUIRED` |
| PATCH | `/api/v1/users/me` | Actualizar `name`, `phone`, `preferredLanguage` | Sí | `UpdateProfileRequestDto` | 200 `UserProfileResponseDto` | 401, 422 `VALIDATION_FAILED` / `UNSUPPORTED_LANGUAGE` |
| PATCH | `/api/v1/users/me/preferred-language` | Atajo dedicado para cambio de idioma | Sí | `UpdatePreferredLanguageRequestDto` | 200 `UserProfileResponseDto` | 401, 422 `UNSUPPORTED_LANGUAGE` |
| POST | `/api/v1/users/me/change-password` | Cambiar contraseña (mantiene sesión actual, invalida otras) | Sí | `ChangePasswordRequestDto` | 204 No Content | 401 `INVALID_CURRENT_PASSWORD`, 422 `CURRENT_PASSWORD_REQUIRED` / `PASSWORD_POLICY_VIOLATION`, 429 `TOO_MANY_REQUESTS` |

> `Documentation Alignment Required` (no bloqueante): Doc 16 §23 declara estos endpoints como `/me`, `/me/preferred-language`, `/me/change-password`. El proyecto adopta `/api/v1/users/me*` (Epic Map, US-094). Se conserva la convención del proyecto; unificación de Doc 16 pendiente antes del snapshot OpenAPI (PB-P0-005).

---

## 10. Database / Prisma Design

### Models Impacted

- `User` (sin cambios estructurales).

### Fields / Columns

- Lectura: `id`, `email`, `name`, `phone`, `preferred_language`, `role`, `created_at`, `updated_at`.
- Escritura permitida: `name`, `phone`, `preferred_language`, `password_hash`, `updated_at` (Prisma).

### Relations

- No se introducen ni modifican relaciones.

### Indexes

- Sin índices nuevos (PK `id` y unique `email` ya existen).

### Constraints

- `email` único e inmutable (BR-USER-002): no se altera.
- `preferred_language`: en MVP la validación queda a nivel aplicación (Zod). Si Doc 18 ya define un check constraint, no se modifica.

### Migrations Impact

- Ninguna migración nueva.

### Seed Impact

- Sin cambios al seed (los usuarios demo ya disponen de `preferred_language` y `password_hash`).

---

## 11. AI / PromptOps Design

No aplica. Esta historia no invoca `LLMProvider`. Se documenta explícitamente que `preferred_language` del usuario no se propaga al motor IA: BR-I18N-004/007 establecen que el idioma efectivo para llamadas IA proviene del `Event`.

---

## 12. Security & Authorization Design

### Authentication

- `authMiddleware` (PB-P0-007) verifica cookie HTTP-only firmada antes de cada handler `/users/me*`.
- Sesión expirada o ausente → `401 AUTHENTICATION_REQUIRED`.

### Authorization

- Implícita por uso exclusivo de `/users/me*`: el `userId` se deriva del `sessionContext`.
- RBAC permite `organizer | vendor | admin` (Doc 16 §23.2, Doc 5 §10 entries 4–5).
- No existen rutas `/users/:userId` para edición de perfil en MVP.

### Ownership Rules

- El `User` actualizado es siempre el de la sesión (`me`).
- Cualquier intento de manipular `userId` se rechaza por arquitectura (la ruta no lo acepta).

### Role Rules

- `role` excluido de la whitelist; nunca se actualiza desde el endpoint de perfil propio.

### Negative Authorization Scenarios

- Anónimo / sesión expirada → `401`.
- Ruta especulativa `PATCH /api/v1/users/:userId` → `404` (no registrada).
- Intento de cambiar `email`/`role` vía PATCH → silent ignore (200 sin cambios).
- Acceso post cambio de password desde otra sesión → `401` (cookie invalidada en la "otra" cookie).

### Audit Requirements

- Eventos estructurados listados en §7 Observability. `correlationId` obligatorio.
- `AdminAction` no aplica (no es una acción admin sobre usuario ajeno).

### Sensitive Data Handling

- `password_hash` jamás retornado.
- `currentPassword` y `newPassword` redactados en logs (lista de campos sensibles del logger).
- `argon2.verify` en tiempo constante; sin mensajes que distingan "usuario no existe" (no aplica aquí porque requiere sesión).

---

## 13. Testing Strategy

### Unit Tests

- `passwordPolicySchema` con casos: longitud, sin letra, sin número, igual a localpart.
- `pickKnownFields` / `.strip()` del `UpdateProfileRequestDto` ignora `email` y `role`.
- `ChangePasswordUseCase` mockeando `argon2` y `UserRepository`: éxito, `INVALID_CURRENT_PASSWORD`, `PASSWORD_POLICY_VIOLATION`, fallo de invalidación → rollback.

### Integration Tests

- `prisma.user.update` con whitelist y persistencia de `updated_at`.
- Transacción `ChangePasswordUseCase` revierte hash si la invalidación de otras sesiones falla.
- Hook frontend `useUpdatePreferredLanguage` re-hidrata `next-intl` (con MSW).

### API Tests (Supertest)

| ID | Caso | Resultado |
|---|---|---|
| TS-01 | `GET /users/me` con sesión válida | 200 con DTO esperado |
| TS-02 | `PATCH /users/me` con `name` válido | 200 actualizado |
| TS-03 | `PATCH /users/me` con `phone` E.164 | 200 actualizado |
| TS-04 | `PATCH /users/me` con `preferredLanguage` | 200 actualizado |
| TS-05 | `PATCH /users/me/preferred-language` | 200 actualizado |
| TS-06 | `POST /users/me/change-password` éxito | 204; sesión actual persiste |
| TS-07 | Otras sesiones quedan inválidas | 401 al reusar cookie alternativa |
| NT-02 | PATCH con `email`/`role` | 200 sin cambios |
| NT-03 | `currentPassword` errónea | 401 `INVALID_CURRENT_PASSWORD` |
| NT-04 | Falta `currentPassword` | 422 `CURRENT_PASSWORD_REQUIRED` |
| NT-05 | Idioma fuera del set | 422 `UNSUPPORTED_LANGUAGE` |
| NT-06 | `newPassword` corta | 422 `PASSWORD_POLICY_VIOLATION` |
| NT-07 | `newPassword` igual a localpart | 422 `PASSWORD_POLICY_VIOLATION` |
| NT-08 | `phone` inválido | 422 `VALIDATION_FAILED` |
| NT-09 | 6º intento en 1 hora | 429 `TOO_MANY_REQUESTS` |
| NT-10 | Llamada sin sesión | 401 `AUTHENTICATION_REQUIRED` |
| AUTH-TS-03 | Ruta especulativa con `userId` | 404/403 |

### E2E Tests (Playwright)

- `TS-08`: Login → abrir `/profile` → editar nombre → cambiar idioma a `English` (UI re-renderiza) → cambiar password con datos válidos → toast → recargar → verificar persistencia.
- Validar focus management y mensajes de error tras enviar formularios inválidos.

### Security Tests

- Verificar redacción de logs (`password`, `newPassword`, `currentPassword`, cookies).
- Tiempo constante de `argon2.verify` (timing-attack resistance check no exhaustivo: documentar, no implementar test estricto en MVP).
- Negativos AUTH-TS-01..05.

### Accessibility Tests

- axe-core sobre `/profile`.
- Validar labels, navegación por teclado y anuncios accesibles.

### AI Tests

No aplica.

### Seed / Demo Tests

- Verificar que con seed (PB-P0-014) cada rol demo puede ejecutar el flujo completo.

### CI Checks

- Pipeline ejecuta unit, integration, API, accessibility y E2E (los E2E pueden quedar en stage separado por costo).
- Lint y type-check obligatorios.
- Verificación de redacción en logger como gate adicional si existe la utilidad.

---

## 14. Observability & Audit

### Logs

- Eventos estructurados listados en §7. Nivel:
  - `user.profile.viewed`: `debug`.
  - `user.profile.updated` / `user.preferred-language.updated`: `info`.
  - `user.password.changed`: `info`.
  - `user.password.change.failed`: `warn`.
  - `auth.ownership.violation`: `warn`.

### Correlation ID

- Middleware existente (PB-P0-003) propaga `correlationId` desde el header `X-Correlation-Id` o lo genera.

### AdminAction

- No aplica.

### Error Tracking

- Reusa la integración estándar de PB-P0-003.

### Metrics

- Sin métricas dedicadas en MVP; los eventos estructurados habilitan análisis posterior.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

- Ninguno adicional. Los usuarios demo (PB-P0-014) ya tienen `password_hash`, `preferred_language` y campos requeridos.

### Demo Scenario Supported

- Demo del MVP incluye: login → abrir perfil → cambiar idioma a `en` (acompañando UC-I18N-001) → cambiar nombre → cambiar password manteniendo sesión.

### Reset / Isolation Notes

- `pnpm seed` restablece los usuarios demo a sus datos iniciales (operación idempotente PB-P0-014).

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 16 §23.2 | Endpoints declarados como `/me`, `/me/preferred-language`, `/me/change-password`. | El proyecto adopta `/api/v1/users/me*` (Epic Map, US-094). | Unificar Doc 16 o emitir ADR de endpoint canónico antes del snapshot OpenAPI (PB-P0-005). | No |
| FRD línea 329 | FR-USER-002 mapeado a UC-AUTH-006, cuando UC-AUTH-006 = "Cambiar idioma preferido". | UC-AUTH-005 es el caso de uso principal de la edición de perfil. | Corregir mapeo en FRD; sin impacto en la implementación. | No |
| Doc 19 §9.6 | Estrategia de invalidación de sesión sin decisión final formal. | Reutilizar el patrón adoptado en US-005 (rotación / lista in-memory). | Documentar la estrategia definitiva en el primer Tech Spec que la introduzca o en un ADR ligero. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Falta de unificación entre Doc 16 (`/me`) y la convención del proyecto (`/users/me`) genera inconsistencia en el snapshot OpenAPI. | Medio | Documentado como alignment; tarea de DOC consolidará la decisión antes de PB-P0-005 snapshot. |
| Invalidación parcial de "otras sesiones" (rollback parcial si falla la operación de cookies/sid). | Medio | Transacción con rollback explícito en `ChangePasswordUseCase`; tests cubren el caso de fallo de invalidación. |
| Cambio inmediato de idioma falla por desincronización entre `next-intl` y la URL `[locale]`. | Bajo | Patrón explícito en hook: invalidar query `me`, `router.replace` con nuevo segmento, re-render del provider. Tests E2E lo verifican. |
| Brute force sobre `change-password` (aunque autenticado, podría afectar a un usuario comprometido). | Medio | Rate limit 5/usuario/h (Doc 19 §12); evento `user.password.change.failed` para detección. |
| Aceptación silenciosa de `email`/`role` confunde al QA si espera 4xx. | Bajo | `Documentación` y `tests negativos NT-02` formalizan que el comportamiento es silent ignore (200 sin cambios). |
| Selección de librería de teléfono fuera del MVP. | Bajo | Adoptar regex E.164 en MVP; reservar `libphonenumber-js` como mejora documentada. |

---

## 18. Implementation Guidance for Coding Agents

### Files / Folders likely impacted

- Backend
  - `src/modules/auth/users-me/application/{GetMyProfile,UpdateOwnProfile,UpdatePreferredLanguage,ChangePassword}UseCase.ts`
  - `src/modules/auth/users-me/interface/http/UsersMeController.ts`
  - `src/modules/auth/users-me/infrastructure/UserRepository.ts` (extensiones si aplican)
  - `src/shared/validation/passwordPolicy.ts` (si no existe ya)
  - Rutas registradas en `src/interface/http/routes/usersMe.routes.ts`
  - Middlewares: reutilizar `authMiddleware`, `rateLimitMiddleware` (5/u/h en `change-password`)
- Frontend
  - `apps/web/app/[locale]/profile/page.tsx`
  - `apps/web/components/profile/{ProfileForm,ChangePasswordForm,LanguageSelector,ProfileTabs}.tsx`
  - `apps/web/lib/api/users-me/{client.ts,schemas.ts}`
  - `apps/web/hooks/{useMe,useUpdateProfile,useUpdatePreferredLanguage,useChangePassword}.ts`
- Tests
  - `apps/api/tests/users-me/*.spec.ts` (unit + integration + API)
  - `apps/web/tests/profile/*.spec.tsx` (component + hook)
  - `e2e/profile.spec.ts` (Playwright)
- MSW handlers: `apps/web/mocks/handlers/users-me.ts`

### Recommended order of implementation

1. Backend: DTOs + Zod schemas + password policy util.
2. Backend: `GetMyProfileUseCase` + `UpdateOwnProfileUseCase` + controller + ruta `GET/PATCH /users/me`.
3. Backend: `UpdatePreferredLanguageUseCase` + ruta dedicada.
4. Backend: `ChangePasswordUseCase` con transacción + rate limit + invalidación de otras sesiones.
5. Backend: tests unit + API + integración.
6. Frontend: `usersApi` + schemas + hooks TanStack Query.
7. Frontend: componentes (`ProfileForm`, `ChangePasswordForm`, `LanguageSelector`, `ProfileTabs`) + página.
8. Frontend: MSW handlers para dev/test.
9. Tests frontend + E2E.
10. Observability final (verificar todos los eventos emiten correctamente).
11. Documentación / `tasks.md` consolidado del backlog item al final.

### Decisions that must not be reopened

- Email no editable en MVP (PB-P1-005 + UC-AUTH-005).
- Cambio de password mantiene sesión actual e invalida las otras (PB-P1-005 línea 120).
- Selector de idioma con nombres nativos.
- Endpoints bajo `/api/v1/users/me*` (alineado con US-094, Epic Map; alignment con Doc 16 §23 documentado).
- Política de password Doc 19 §11.2.
- argon2id como algoritmo (ADR-SEC-003).

### What must not be implemented

- Cambio de email, cambio de rol por el usuario, eliminación de cuenta, avatar, MFA, listado de sesiones, re-login forzado, cambio de moneda.
- Migraciones nuevas de DB.
- Reescritura de los endpoints existentes ya entregados por US-094 (si la implementación física ya existe, esta US los consume; si no, se implementan como parte de esta US sin desviar del contrato).
- Propagación de `preferred_language` del usuario al motor IA.

### Assumptions to preserve

- `authMiddleware` y `SessionCookieIssuer` ya disponibles (PB-P0-006/PB-P0-007).
- `argon2` wrapper disponible.
- Logger con redacción de campos sensibles operativo.
- next-intl y TanStack Query (PB-P0-012/013) configurados.

---

## 19. Task Generation Notes

### Suggested task groups

- BE: DTOs + schemas + password policy util.
- BE: `Get/Update/UpdatePreferredLanguage/ChangePassword` use cases + controller + rutas.
- BE: Transacción + invalidación de otras sesiones (`SEC-001`).
- API: registrar rutas en router central; verificar contratos con tests Supertest.
- FE: `usersApi` + hooks TanStack Query + MSW.
- FE: componentes `ProfileForm`, `ChangePasswordForm`, `LanguageSelector`, `ProfileTabs`.
- FE: página `/[locale]/profile` y locale switch inmediato.
- QA: TS-01..08, NT-01..10, AUTH-TS-01..05, accesibilidad.
- SEC: rate limit policy + verificación de redacción de logs.
- OBS: eventos estructurados con `correlationId`.
- DOC: actualizar `tasks.md` consolidado del backlog item PB-P1-005 (incluir US-006 + US-007 cuando corresponda).

### Required QA tasks

- QA-001 API tests Supertest cubriendo TS y NT.
- QA-002 Integration test de invalidación de otras sesiones.
- QA-003 E2E Playwright completo.
- QA-004 a11y axe-core sobre `/profile`.

### Required security tasks

- SEC-001 rate limit `change-password` (5/u/h).
- SEC-002 verificación de redacción en logger.

### Required seed/demo tasks

- No requiere cambios de seed. Documentar en `tasks.md` que el seed actual basta.

### Required documentation tasks

- DOC-001 actualizar/iniciar `tasks.md` consolidado de PB-P1-005 con tareas de US-006 (US-007 se sumará al ejecutarse).

### Dependencies between tasks

- `BE-001 (DTOs)` precede a `BE-002..004 (use cases)`.
- `BE-004 (ChangePassword)` depende de `SEC-001 (rate limit)` operativo en middleware chain.
- `FE-001 (api/hooks)` precede a `FE-002 (componentes)` y `FE-003 (página)`.
- `QA-002` requiere `BE-004` y `BE-005 (invalidación)` listos.
- `DOC-001` se actualiza al cierre de las tareas BE/FE/QA.

### Whether parent backlog item should later generate a consolidated `tasks.md`

Sí. PB-P1-005 debe tener un `tasks.md` consolidado que combine US-006 y US-007. Esta US lo inicializa; al procesar US-007 se reanudará y consolidará.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P1-005) |
| Decision Resolution reviewed if present | N/A (no se requirió artifact) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass |
| DB impact clear | Pass (sin migraciones) |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

La especificación se apoya en decisiones formalizadas (PB-P1-005, Doc 16 §23, Doc 19 §11.2, ADR-SEC-001/003), reutiliza componentes ya entregados por PB-P0-006/007 y US-094, y no introduce migraciones ni dependencias nuevas. Las notas de alineación documental son no bloqueantes y se trazan en §16. El siguiente paso es generar las Development Tasks vía `eventflow-user-story-to-development-tasks` consumiendo este Technical Spec.
