# Technical Specification — US-140: Reset surgical del entorno Demo desde panel admin

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-140 |
| Source User Story | `management/user-stories/US-140-seed-reset-endpoint-demo.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-140-decision-resolution.md` (no existe; no requerido) |
| Priority | P3 |
| Backlog ID | PB-P3-001 |
| Backlog Title | Reset surgical del entorno Demo desde panel admin |
| Backlog Execution Order | P3 #1 (primer item del bloque P3 — Demo Polish / Academic Evidence) |
| User Story Position in Backlog Item | 1 de 1 (única US del backlog item) |
| Related User Stories in Backlog Item | US-140 |
| Epic | EPIC-OPS-001 / EPIC-SEED-001 |
| Backlog Item Dependencies | PB-P0-014 (US-085/US-086), PB-P2-022, PB-P2-023, PB-P2-024 |
| Feature | Reset del entorno Demo (panel admin) |
| Module / Domain | Admin / Seed / DevOps (frontend admin sobre backend reutilizado) |
| User Story Status | Approved with Minor Notes (2026-07-07) |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-07-07 |
| Last Updated | 2026-07-07 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P3-001 (Reset surgical del entorno Demo desde panel admin) pertenece al bloque **P3 — Demo Polish / Academic Evidence** del backlog priorizado y entrega la **experiencia operativa** para reiniciar el entorno Demo bajo demanda desde el panel admin. Su valor es habilitar una demo reproducible (FR-DEMO-001 / UC-DEMO-001) sin redeploy ni intervención manual en base de datos.

El backlog item es MoSCoW **Must Have**, con Acceptance Summary: `404` si no es Demo, acción auditada, reset idempotente. Depende de:

* **PB-P0-014 (US-085/US-086)** — provee el core `ResetDemoUseCase`, el endpoint `POST /api/v1/admin/seed/reset` y el contrato `ResetReportDto` que US-140 reutiliza verbatim.
* **PB-P2-022 / PB-P2-023 / PB-P2-024** — deploy backend en AWS, RDS PostgreSQL gestionado y Secrets Manager (entorno Demo desplegado con secretos gestionados).

US-140 no reimplementa el motor de reset; entrega el control frontend gated por entorno, el modal de confirmación, la integración TanStack Query contra el endpoint reutilizado, el render del `ResetReport` y la verificación del contrato de auditoría/observabilidad.

### Execution Order Rationale

El orden de ejecución no lo define el ID de la User Story sino la posición dentro del Product Backlog Prioritized. En el bloque P3 (`management/artifacts/4-Product-Backlog-Prioritized.md` §10), el orden de implementación sugerido es: **Demo seed → Demo script → Pre-demo checklist → Toggle Mock/OpenAI → Smoke Demo URL → Reporte académico final**. PB-P3-001 es el **primer** item listado de P3 y encabeza la etapa "Demo seed"; por lo tanto su orden de ejecución dentro de P3 es **#1**. Su dependencia dura (PB-P0-014 / US-086) ya fue especificada y entregada en P0, de modo que US-140 puede ejecutarse tan pronto arranca el bloque P3, y precede a los items que la referencian como dependencia (PB-P3-004 checklist pre-demo, PB-P3-007 smoke test).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-140 | Panel admin (frontend) que dispara el reset reutilizando el endpoint de US-086 | 1 (única US del backlog item) |

---

## 3. Executive Technical Summary

Implementar la **experiencia operativa frontend** que permite a un admin del entorno Demo disparar un reset surgical desde el panel admin. La solución es primariamente frontend (Next.js App Router, TypeScript, TanStack Query, React Hook Form, Zod, Tailwind, next-intl) y consume el endpoint HTTP `POST /api/v1/admin/seed/reset` ya entregado por **US-086 (PB-P0-014)**, tipando la respuesta con el contrato reutilizado `ResetReportDto`.

El control operativo se renderiza de forma condicional al flag `SEED_DEMO_ENABLED` (equivalente operativo de `APP_ENV=demo`): fuera del entorno Demo el backend no registra la ruta y responde `404`, por lo que el panel oculta/deshabilita el control y muestra un estado informativo neutro sin revelar la existencia del endpoint (Doc 19 §THR-012). Dentro de Demo, el flujo es: botón "Reset del entorno Demo" → **modal de confirmación** obligatorio (`reason` opcional ≤ 500 chars) → mutation TanStack Query contra el endpoint → render del `ResetReport` (`entitiesDeleted`, `entitiesReseeded`, `seedVersion`, `durationMs`, `correlationId`). Una query TanStack contra `GET /api/v1/admin/seed/status` alimenta el estado empty (`lastRunAt`, `recordCount`).

El backend permanece como única fuente de verdad de autorización (ADR-SEC-003): US-140 no implementa lógica de autorización propia. La spec verifica que el contrato reutilizado (autorización doble-gate, auditoría obligatoria en `AdminAction`, propagación de `X-Correlation-Id`, idempotencia) se cumpla y se refleje correctamente en la UI (estados loading/empty/error/success, accesibilidad, i18n). No hay use case backend nuevo, ni migraciones de base de datos, ni invocación de IA.

---

## 4. Scope Boundary

### In Scope

* Sección operativa Demo dentro del panel admin con **render condicional** al flag `SEED_DEMO_ENABLED`.
* Botón "Reset del entorno Demo" + **modal de confirmación** accesible (`reason` opcional, validación cliente alineada al `ResetRequestSchema` de US-086).
* **TanStack Query mutation** para `POST /api/v1/admin/seed/reset` y **query** para `GET /api/v1/admin/seed/status`.
* Cliente API tipado (`resetDemoSeed()`, `getSeedStatus()`) con tipos `ResetReportDto` y `SeedStatusResponseDto` reutilizados verbatim de US-086.
* Render del `ResetReport` (conteos por entidad, `seedVersion`, `durationMs`, `correlationId`).
* Estados **loading / empty / error / success** y manejo de códigos `202 / 400 / 401 / 403 / 404 / 409 / 500`.
* Accesibilidad (teclado, gestión de foco en modal, labels/ARIA) e **i18n** (`es-LATAM`, `es-ES`, `pt`, `en`) vía next-intl.
* Verificación del contrato backend reutilizado: doble gate de autorización, `404` fuera de Demo, `AdminAction` auditado con `correlationId`, idempotencia.
* Tests frontend (Vitest + Testing Library + MSW), E2E (Playwright), negativos de autorización y accesibilidad; reuso de contract tests (Supertest) de US-086 para regresión del contrato.

### Out of Scope

* **Motor de reset core** (`ResetDemoUseCase`, deletes por lote filtrados por `is_seed=true`, orden FK, lock de concurrencia) → **US-086 (PB-P0-014)**. Se reutiliza, no se reimplementa.
* Definición o cambio del contrato `ResetReportDto` / `ResetRequestSchema` → propiedad de US-086.
* Endpoint `POST /api/v1/admin/seed/reset` y `GET /api/v1/admin/seed/status` (backend) → US-086.
* Runner CLI `npm run seed` / `seed:reset` → US-085 (PB-P0-014).
* Resets parciales por entidad, snapshots, backups previos o reset programado (cron).
* Aplicación o reversión de migraciones Prisma.
* Ejecución del reset en producción o fuera del entorno Demo.

### Explicit Non-Goals

* No introduce use case backend nuevo (`Backend section = reutiliza US-086`).
* No introduce cambios de esquema ni migraciones (`DB section = No aplica`).
* No invoca IA (`AI section = No aplica`).
* No reabre decisiones formalizadas en US-086 (reset surgical, `404` ante flag apagado, `AdminAction` obligatorio, repoblado idempotente delegado a `SeedDemoDataUseCase`).
* No implementa lógica de autorización en el frontend; el backend es la única fuente de verdad.

---

## 5. Architecture Alignment

### Backend Architecture

Reutiliza US-086; **ningún use case nuevo**. El backend (`SeedDemoController`, `ResetDemoUseCase`, middlewares `requireAuth` + `requireRole('admin')` + registro condicional al flag) ya está especificado y entregado en `management/technical-specs/P0/PB-P0-014/US-086-technical-spec.md`. US-140 lo consume tal cual y verifica que el contrato se cumpla. No modifica controllers, use cases, repositorios ni error mapping del backend.

### Frontend Architecture

* Stack: Next.js App Router, TypeScript, TanStack Query 5.x, React Hook Form 7.x, Zod, Tailwind + design tokens, next-intl 3.x, MSW 2.x para tests (Doc 15 §Framework/Stack).
* Área autenticada admin dentro del route group `(admin)` (Doc 15 §route groups `(public)/(app)/(admin)`), renderizada como **Client Component** por ser workflow autenticado con data fetching vía TanStack Query.
* Componentes presentacionales puros + hooks con MSW handlers para testabilidad (Doc 15 principio 11 y 13: no overengineering; sin Redux/Zustand).
* Sin strings hardcoded; toda copy vía `next-intl` (Doc 15 principio 7).
* El control se monta condicionalmente según `SEED_DEMO_ENABLED`; el frontend trata `404` como señal autoritativa de "no disponible en este entorno".

### Database Architecture

No aplica — US-140 no introduce modelos, columnas, índices ni migraciones. Toda escritura (incluida la auditoría `AdminAction`) la ejecuta el backend de US-086.

### API Architecture

* REST JSON API bajo `/api/v1` (Doc 16 §3.1). US-140 **consume** dos endpoints existentes:
  * `POST /api/v1/admin/seed/reset` (US-086) → `202 Accepted` + `ResetReportDto`.
  * `GET /api/v1/admin/seed/status` (US-086) → `200 OK` + `SeedStatusResponseDto`.
* Auth: JWT vía cookie HTTP-only; header `X-Correlation-Id` propagado y leído desde la respuesta.
* US-140 no define contratos nuevos; los tipa desde el contrato reutilizado.

### AI / PromptOps Architecture

No aplica — el flujo no invoca IA. Las `AIRecommendation` se resiembran vía `SeedDemoDataUseCase` (US-085/US-086) durante el repoblado, no por esta historia.

### Security Architecture

* Backend como única fuente de verdad de autorización (ADR-SEC-003, Doc 19). El panel **no** implementa lógica de autorización; solo refleja el resultado del backend.
* Doble gate operativo verificado en backend: `requireAuth()` + `requireRole('admin')` + `SEED_DEMO_ENABLED=true` (SEC-POL-ADMIN-003, Doc 19 §678).
* Fuera de Demo la ruta no se registra → `404` (no `403`) para evitar fingerprinting (THR-012, Doc 19 §194). La UI no revela la existencia del endpoint ante `404`.
* Sin secretos ni tokens en logs, en el estado del cliente ni en la respuesta renderizada (NFR-SEC-008, ADR-SEC-005); secretos solo vía Secrets Manager (PB-P2-024).
* Auditoría obligatoria (`AdminAction`) garantizada por el backend (NFR-OBS-001, BR-ADMIN-004/011).

### Testing Architecture

* Vitest + Testing Library + MSW para unit/component y hooks (mutation/query, estados, gating).
* Playwright para E2E del flujo panel → confirmación → reset → reporte, y para el negativo de gating.
* Tests de accesibilidad (teclado, foco, ARIA) sobre botón y modal.
* Reuso de contract tests Supertest de US-086 (ADR-TEST-001) como regresión del contrato consumido; US-140 no los reimplementa.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — Reset disparado desde el panel en Demo → `202` + `ResetReport` | Client Component monta el control (flag on); modal de confirmación → `useMutation` invoca `resetDemoSeed()` → `POST /api/v1/admin/seed/reset`; al recibir `202` renderiza `ResetReportDto`. | Frontend (component, hook, api client) |
| AC-02 — Reset idempotente | La idempotencia la garantiza el core de US-086; el panel permite reejecutar y muestra que los conteos por entidad convergen. Verificado en E2E/integración (doble ejecución). | Frontend (UX), Backend (reutilizado), QA |
| AC-03 — Acción auditada con `correlationId` | El backend registra `AdminAction` (`SEED_RESET`/`SEED_RESET_FAILED`) con el mismo `correlationId` que aparece en la respuesta y en `X-Correlation-Id`. El panel lee y muestra el `correlationId`. | Backend (reutilizado), Frontend (render), Observability |
| EC-01 — Entorno no Demo → `404` / control no expuesto | El backend responde `404` (ruta no registrada); el panel oculta/deshabilita el control y muestra estado informativo neutro. | Frontend (gating, error handling), Backend (reutilizado) |
| EC-02 — Reset en curso (concurrencia) → `409` | El backend devuelve `409 seed_reset_in_progress`; el panel deshabilita el botón durante el request (loading) y muestra "reset en curso" sin reintentar. | Frontend (state), Backend (reutilizado) |
| EC-03 — Falla parcial → `500` controlado | El backend responde `500 { code: 'seed_reset_failed', correlationId }`; el panel muestra error neutral con `correlationId`, sin stack traces ni SQL. | Frontend (error state), Backend (reutilizado) |
| VR-01 — Solo si `SEED_DEMO_ENABLED=true` | Render condicional en el cliente + `404` autoritativo del backend. | Frontend, Backend (reutilizado) |
| VR-02 — Confirmación explícita obligatoria | Modal de confirmación bloquea la invocación hasta acción explícita del admin. | Frontend |
| VR-03 — Body opcional `reason` (Zod strict, ≤ 500) | Validación cliente con Zod alineada al `ResetRequestSchema`; el backend re-valida (`400` ante campo desconocido). | Frontend, Backend (reutilizado) |

---

## 7. Backend Technical Design

**Reutiliza US-086; ningún use case nuevo.** US-140 no crea ni modifica módulos, use cases, controllers, DTOs, repositorios, validaciones, transacciones ni error handling del backend. El diseño backend completo (con `ResetDemoUseCase`, `SeedDemoController`, `ResetRequestSchema`, `ResetReportDto`, lock de concurrencia, orden de deletes FK, `AdminAction`, logs `seed.reset.*`) reside en `management/technical-specs/P0/PB-P0-014/US-086-technical-spec.md` §7 y §9.

Verificaciones que US-140 debe confirmar contra el contrato entregado (sin reimplementar):

* `POST /api/v1/admin/seed/reset` responde `202 Accepted` con `ResetReportDto` (`entitiesDeleted`, `entitiesReseeded`, `seedVersion`, `correlationId`, `durationMs`).
* Códigos de error contractuales: `400` (Zod), `401`, `403`, `404` (flag off), `409 seed_reset_in_progress`, `500 seed_reset_failed`.
* `GET /api/v1/admin/seed/status` responde `200 OK` con `SeedStatusResponseDto` (`lastRunAt`, `preset`, `recordCount`).
* Header `X-Correlation-Id` siempre presente en la respuesta.
* `AdminAction` persistido en éxito y fallo con el mismo `correlationId`.

### Observability

El backend (US-086) emite `seed.reset.{started,completed,failed}` y propaga `X-Correlation-Id`. US-140 consume el `correlationId` desde el payload/response para mostrarlo en la UI. No agrega logging backend.

---

## 8. Frontend Technical Design

### Routes / Pages

* Sección operativa Demo dentro del panel admin, en el route group `(admin)` (Doc 15). Sugerido: `app/(admin)/admin/seed/page.tsx` (o subsección dentro del dashboard admin existente). Client Component por ser workflow autenticado.
* Render condicional: el control operativo solo se monta cuando el entorno es Demo. La señal se obtiene de `GET /api/v1/admin/seed/status` (disponibilidad → flag on) y/o de una variable de entorno pública de build; el `404` del backend es la señal autoritativa de "no disponible".

### Components

* `DemoResetPanel` — contenedor de la sección: orquesta status query, botón, modal y panel de resultado; decide gating (control visible/deshabilitado + estado informativo ante no-Demo).
* `DemoResetButton` — botón "Reset del entorno Demo" (primario), con estados enabled/disabled/loading, labels y ARIA.
* `DemoResetConfirmModal` — modal de confirmación accesible con `reason` opcional (React Hook Form + Zod); acciones Confirmar / Cancelar; gestión de foco.
* `ResetReportView` — render del `ResetReportDto` (tabla de conteos por entidad `entitiesDeleted`/`entitiesReseeded`, `seedVersion`, `durationMs`, `correlationId`).
* `SeedStatusView` — empty state con `lastRunAt` y `recordCount` desde `seed/status`.
* Componentes presentacionales puros; la lógica de datos vive en hooks.

### Forms

* `DemoResetConfirmModal` usa React Hook Form + Zod. Schema cliente alineado verbatim al `ResetRequestSchema` de US-086: `{ reason?: string (min 1, max 500) }` con `.strict()`. Confirmación explícita obligatoria (VR-02) antes de disparar la mutation.

### State Management

* TanStack Query como server-state (Doc 15). Sin Redux/Zustand (principio 13).
  * `useSeedStatusQuery()` — `GET /api/v1/admin/seed/status` (query; alimenta empty/gating).
  * `useResetDemoMutation()` — `POST /api/v1/admin/seed/reset` (mutation; on success invalida la query de status para refrescar `lastRunAt`/`recordCount`).
* Estado UI local (modal abierto/cerrado, foco) con estado de componente; sin store global.

### Data Fetching

* Cliente API tipado con los contratos reutilizados de US-086:
  * `resetDemoSeed(input?: { reason?: string }): Promise<ResetReportDto>`.
  * `getSeedStatus(): Promise<SeedStatusResponseDto>`.
* Envío con credenciales (cookie HTTP-only); lectura de `X-Correlation-Id` desde headers/response para diagnóstico.
* Mapeo de códigos HTTP a estados de UI: `202` → success; `409` → "reset en curso"; `404` → no disponible; `401/403` → sin permiso (delegado al backend); `400` → error de validación; `500` → error controlado.

### Loading / Empty / Error / Success States

| Estado | Comportamiento |
|---|---|
| Loading | Botón deshabilitado + spinner mientras el request está en vuelo; sin reintento automático. |
| Empty | Sin ejecuciones previas: mostrar `SeedStatusView` con `lastRunAt`/`recordCount` de `seed/status`. |
| Error | Mensaje neutral con `correlationId` visible; sin stack traces, SQL ni datos sensibles. `409` → "reset en curso"; `404` → "no disponible en este entorno". |
| Success | `ResetReportView` con conteos por entidad, `seedVersion`, `durationMs`, `correlationId`; refresco del status. |

### Accessibility

* Modal accesible: role/aria-modal, focus trap, foco inicial en acción segura, retorno de foco al disparador al cerrar, cierre con teclado (Esc/cancelar).
* Botón con label accesible y estado `aria-disabled`/`aria-busy` durante loading.
* Anuncio de resultado (success/error) por región `aria-live` para lectores de pantalla.

### i18n

* Toda copy vía next-intl en los cuatro locales requeridos: `es-LATAM` (default), `es-ES`, `pt`, `en`. Claves para botón, modal, estados, mensajes de error y reporte. Sin strings hardcoded (Doc 15 principio 7).

---

## 9. API Contract Design

US-140 no define contratos nuevos; **consume** los contratos reutilizados de US-086 (definidos en `management/technical-specs/P0/PB-P0-014/US-086-technical-spec.md` §9).

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/admin/seed/reset` | Disparar reset surgical + repoblado idempotente (reutilizado de US-086) | Sí (admin + flag) | `ResetRequestSchema` (body opcional `{ reason? }`) | `202 Accepted` con `ResetReportDto` | `400` (Zod), `401` (sin token), `403` (rol no admin), `404` (flag off), `409` (`seed_reset_in_progress`), `500` (`seed_reset_failed`) |
| GET | `/api/v1/admin/seed/status` | Estado del seed para empty state (reutilizado de US-086) | Sí (admin + flag) | — | `200 OK` con `SeedStatusResponseDto` (`lastRunAt`, `preset`, `recordCount`) | `401`, `403`, `404` (flag off) |

Contratos reutilizados verbatim (US-086):

```ts
type ResetReportDto = {
  entitiesDeleted: Record<string, number>;
  entitiesReseeded: Record<string, number>;
  seedVersion: string;
  correlationId: string;
  durationMs: number;
};

type SeedStatusResponseDto = {
  lastRunAt: string | null;
  preset: 'minimal' | 'full' | null;
  recordCount: Record<string, number>;
};

// Body opcional (validación cliente alineada)
const ResetRequestSchema = z.object({ reason: z.string().min(1).max(500).optional() }).strict();
```

Headers: request con cookie HTTP-only y `X-Correlation-Id` opcional; response siempre con `X-Correlation-Id`.

---

## 10. Database / Prisma Design

No aplica / sin migraciones. US-140 no introduce ni modifica modelos, columnas, relaciones, índices ni constraints. Toda persistencia (incluida `AdminAction` de auditoría y el repoblado seed) la ejecuta el backend reutilizado de US-086 (ver `management/technical-specs/P0/PB-P0-014/US-086-technical-spec.md` §10).

---

## 11. AI / PromptOps Design

No aplica. El flujo no invoca IA. Las `AIRecommendation` se resiembran vía `SeedDemoDataUseCase` (US-085/US-086) con `MockAIProvider` determinista durante el repoblado, fuera del alcance de esta historia.

---

## 12. Security & Authorization Design

### Authentication

JWT vía cookie HTTP-only (Doc 19 §6). El frontend envía credenciales; no almacena tokens en localStorage. La verificación de sesión es responsabilidad del backend.

### Authorization

Backend como única fuente de verdad (ADR-SEC-003). US-140 **no** implementa lógica de autorización; el doble gate `requireAuth()` + `requireRole('admin')` + `SEED_DEMO_ENABLED=true` (SEC-POL-ADMIN-003, Doc 19 §678) vive en US-086. El panel solo refleja el resultado.

### Ownership Rules

No aplica — la acción es global de entorno, no por entidad.

### Role Rules

| Rol | Resultado (enforced por backend) |
|---|---|
| `anonymous` | `401` → UI sin permiso / redirección de sesión |
| `organizer` | `403` → UI sin permiso |
| `vendor` | `403` → UI sin permiso |
| `admin` (Demo, flag on) | `202` → flujo permitido |
| `admin` (no Demo, flag off) | `404` → control no expuesto, estado informativo neutro |

### Negative Authorization Scenarios

* Usuario anónimo → `401 unauthorized`.
* Usuario `organizer` / `vendor` → `403 forbidden`.
* Admin en entorno no Demo (`SEED_DEMO_ENABLED=false`) → `404 not found` (ruta no registrada). La UI no revela la existencia del endpoint (THR-012).
* Token expirado → `401 unauthorized`.
* Segundo disparo con reset en curso → `409 seed_reset_in_progress`.

### Audit Requirements

Toda invocación (éxito o fallo) queda auditada en `AdminAction` (`SEED_RESET` / `SEED_RESET_FAILED`) por el backend, con el mismo `correlationId` presente en la respuesta y en `X-Correlation-Id` (NFR-OBS-001, BR-ADMIN-004/011). US-140 verifica que el `correlationId` mostrado coincida con el auditado.

### Sensitive Data Handling

* Sin secretos ni tokens en el estado del cliente, en logs de navegador ni en la UI (NFR-SEC-008, ADR-SEC-005).
* Los estados de error muestran solo mensajes neutrales + `correlationId`; nunca stack traces, SQL ni PII.
* El `ResetReport` solo contiene metadatos agregados (conteos, versión, duración, id de correlación).

---

## 13. Testing Strategy

### Unit Tests (Vitest + Testing Library)

* `DemoResetButton`: estados enabled/disabled/loading; label y ARIA.
* `DemoResetConfirmModal`: validación `reason` (Zod strict, ≤ 500); confirmación obligatoria; cancelar no dispara la mutation.
* `ResetReportView`: render correcto de `ResetReportDto` (conteos, `seedVersion`, `durationMs`, `correlationId`).
* `SeedStatusView`: render de empty state con `lastRunAt`/`recordCount`.
* Hooks `useResetDemoMutation` / `useSeedStatusQuery`: mapeo de `202/400/401/403/404/409/500` a estados de UI; invalidación de la query de status tras éxito.

### Integration Tests (MSW)

* Handlers MSW simulan `POST /seed/reset` y `GET /seed/status`. Verifican gating (flag on/off), success con `ResetReport`, empty state, errores y estado "reset en curso".

### API Tests (contract reuse — Supertest)

* Reuso de los contract/API tests de US-086 (Supertest) como regresión del contrato consumido. US-140 no reimplementa el backend; asegura que los tipos consumidos coinciden con el contrato entregado.

### E2E Tests (Playwright)

* TS-01: admin en Demo → confirmar → `202` + `ResetReport` renderizado.
* TS-02: doble ejecución consecutiva → estado idempotente (conteos equivalentes en la UI).
* TS-04: `SeedStatusView` refleja `lastRunAt`/`recordCount` tras el reset.
* NT-01: entorno no Demo (`SEED_DEMO_ENABLED=false`) → control no expuesto / estado informativo (`404`).
* NT-02: reset en curso + segundo disparo → mensaje "reset en curso" (`409`).
* NT-03: falla inyectada → error neutral con `correlationId` (`500`), sin stack traces.

### Security Tests

* AUTH-TS-01: admin en Demo dispara reset → `202`.
* AUTH-TS-02: `organizer`/`vendor` → `403` reflejado como sin permiso.
* AUTH-TS-03: anónimo → `401`.
* AUTH-TS-04: `404` no revela la existencia del endpoint (sin headers reveladores ni fingerprinting).

### Accessibility Tests

* Navegación por teclado del botón y del modal.
* Focus trap y retorno de foco al disparador al cerrar el modal.
* Labels/ARIA en el control; anuncio de resultado por `aria-live`.

### AI Tests

No aplica.

### Seed / Demo Tests

* Verificar (vía E2E sobre entorno Demo) que tras el reset el estado converge al seed conocido y que la UI lo refleja. La verificación de invariantes de datos (`is_seed=false` preservado, volúmenes BR-SEED-002) es cubierta por los tests de US-086.

### CI Checks

* `vitest` (unit + integration con MSW) y `playwright` en el pipeline frontend.
* Lint + type-check obligatorios (el type-check valida el consumo correcto de `ResetReportDto`).
* Sin cambios de migración Prisma.

---

## 14. Observability & Audit

### Logs

Sin logging backend nuevo. El backend (US-086) emite `seed.reset.{started,completed,failed}`. El frontend puede registrar eventos de UI no sensibles (sin PII ni secretos) para diagnóstico.

### Correlation ID

`X-Correlation-Id` se propaga por el backend y siempre está presente en la respuesta. El panel lee y muestra el `correlationId` en success y error para trazabilidad end-to-end (NFR-OBS-001).

### AdminAction

Registrado por el backend (US-086) en éxito (`SEED_RESET`) y fallo (`SEED_RESET_FAILED`) con el `correlationId` correspondiente. US-140 no escribe `AdminAction`; verifica la coincidencia del `correlationId` mostrado.

### Error Tracking

MVP usa logs estructurados a stdout en backend (NFR-OBS-006); sin APM/Sentry. El frontend muestra errores controlados con `correlationId`.

### Metrics

No aplica en frontend. Métricas opcionales de reset (`seed_reset_total`, `seed_reset_duration_ms`) las expone el backend (US-086).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

Ninguna creación de seed adicional. US-140 dispara el reset que reutiliza la siembra de US-085/US-087/US-088.

### Demo Scenario Supported

* Demo guiada 10–15 min (FR-DEMO-001 / UC-DEMO-001): reinicio reproducible del entorno entre sesiones desde el panel, sin redeploy.
* Habilita PB-P3-004 (checklist pre-demo) y PB-P3-007 (smoke test sobre Demo URL), que dependen de PB-P3-001.

### Reset / Isolation Notes

* El reset es surgical (solo `is_seed=true`), garantizado por el core de US-086.
* Disponible únicamente en entorno Demo (`SEED_DEMO_ENABLED=true`); fuera de Demo el control no se expone y el backend responde `404`.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 19 §587 / §1205 | Indican `403` para admin sin `SEED_DEMO_ENABLED=true` al invocar seed endpoints, mientras THR-012 (§194), PB-P3-001 y la spec de US-086 formalizan `404` (ruta no registrada, anti-fingerprinting). | Adoptar **`404`** como comportamiento vigente (ruta no registrada fuera de Demo). | Alinear en una próxima revisión Doc 19 §587/§1205 para reflejar `404` en seed endpoints, coherente con THR-012 y SEC-POL-ADMIN-003. | No |
| Backlog PB-P3-001 vs gate técnico | El backlog describe el gate como `APP_ENV=demo`; el gate técnico efectivo es el feature flag `SEED_DEMO_ENABLED=true`, activo solo en Demo/Dev. | Tratarlos como **equivalentes**; el flag `SEED_DEMO_ENABLED=true` es la señal operativa. | Documentar en runbook la equivalencia `APP_ENV=demo` ⇔ `SEED_DEMO_ENABLED=true`. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Divergencia entre el tipo cliente y el `ResetReportDto` real de US-086 | Errores de render / runtime en la UI | Reusar el tipo `ResetReportDto` verbatim de US-086; type-check en CI; reuso de contract tests de US-086. |
| Fuga de la existencia del endpoint ante entorno no Demo | Fingerprinting (THR-012) | Tratar `404` como "no disponible"; no exponer el control ni mensajes que revelen el endpoint; test AUTH-TS-04. |
| Doble disparo del reset (usuario impaciente) | Confusión / `409` | Deshabilitar botón durante loading; mostrar "reset en curso" ante `409`; sin reintento automático. |
| Mostrar datos sensibles/stack en error state | Fuga de información | Mensajes neutrales + solo `correlationId`; nunca stack/SQL; test NT-03. |
| Modal no accesible por teclado/lector de pantalla | Barrera de accesibilidad | Focus trap, `aria-modal`, retorno de foco, `aria-live`; tests de accesibilidad. |
| Copy hardcodeada rompe i18n | Inconsistencia de locales | Todas las cadenas vía next-intl en los 4 locales; lint contra strings hardcoded. |
| Cambio futuro del contrato en US-086 | Ruptura del consumo | El contrato es propiedad de US-086; cualquier cambio se coordina allí; los contract tests detectan la ruptura. |

---

## 18. Implementation Guidance for Coding Agents

### Files / folders likely impacted (frontend)

* `apps/web/app/(admin)/admin/seed/page.tsx` (o subsección del dashboard admin) — Client Component contenedor.
* `apps/web/src/features/admin-seed/components/` — `DemoResetPanel`, `DemoResetButton`, `DemoResetConfirmModal`, `ResetReportView`, `SeedStatusView`.
* `apps/web/src/features/admin-seed/hooks/` — `useResetDemoMutation.ts`, `useSeedStatusQuery.ts`.
* `apps/web/src/features/admin-seed/api/seed-admin.client.ts` — `resetDemoSeed()`, `getSeedStatus()`.
* `apps/web/src/features/admin-seed/types/` — reexport/import de `ResetReportDto`, `SeedStatusResponseDto`, `ResetRequestSchema` (contratos de US-086).
* `apps/web/messages/{es-LATAM,es-ES,pt,en}.json` — claves i18n del panel.
* Tests: `__tests__/` con Vitest + Testing Library + MSW; `e2e/` con Playwright.

### Recommended order of implementation

1. Cliente API tipado (`seed-admin.client.ts`) reusando los contratos de US-086.
2. Hooks TanStack (`useSeedStatusQuery`, `useResetDemoMutation`) con manejo de códigos.
3. Componentes presentacionales (`SeedStatusView`, `ResetReportView`, `DemoResetButton`).
4. `DemoResetConfirmModal` (RHF + Zod) accesible.
5. `DemoResetPanel` orquestando gating (flag/`404`), estados y flujo.
6. i18n de las 4 locales.
7. Tests unit/integration (MSW), accesibilidad y E2E (Playwright).

### Decisions that must not be reopened

* Reset surgical (solo `is_seed=true`) y repoblado idempotente delegado a `SeedDemoDataUseCase` — US-086.
* `404` ante flag apagado (no `403` ni `503`) — THR-012 / PB-P3-001 / US-086.
* `AdminAction` obligatorio con `correlationId` — BR-ADMIN-004/011, NFR-OBS-001.
* Backend como única fuente de verdad de autorización — ADR-SEC-003.
* Ningún use case backend nuevo — el motor de reset pertenece a US-086.

### What must not be implemented

* Motor de reset core, deletes por lote, lock de concurrencia, contrato `ResetReportDto` (pertenecen a US-086).
* Lógica de autorización en el frontend.
* Resets parciales, snapshots, backups, reset programado.
* Migraciones Prisma o cambios de esquema.
* Invocación de IA.

### Assumptions to preserve

* US-086 (endpoint + `ResetDemoUseCase` + `ResetReportDto`) está disponible y estable.
* `SEED_DEMO_ENABLED=true` activo solo en Demo/Dev; en el resto la ruta responde `404`.
* Existe cuenta admin sembrada (SEED-USER-001) para operar el panel.
* El layout admin autenticado (route group `(admin)`) está disponible (dependencia P2 de frontend admin).

---

## 19. Task Generation Notes

### Suggested task groups

* **FE**: cliente API tipado, hooks TanStack (mutation/query), componentes (`DemoResetPanel`, `DemoResetButton`, `DemoResetConfirmModal`, `ResetReportView`, `SeedStatusView`), gating condicional al flag/`404`, manejo de estados.
* **FE-A11Y**: accesibilidad de botón y modal (teclado, foco, ARIA, `aria-live`).
* **FE-I18N**: claves next-intl en `es-LATAM`, `es-ES`, `pt`, `en`.
* **QA**: unit/integration (Vitest + Testing Library + MSW), E2E (Playwright), negativos de autorización, idempotencia y auditoría; reuso de contract tests de US-086.
* **SEC**: verificación del gating `404`/`401`/`403`, no exposición del endpoint, sin datos sensibles en UI.
* **DOC**: actualizar documentación del panel admin y runbook de demo; registrar equivalencia `APP_ENV=demo` ⇔ `SEED_DEMO_ENABLED=true`.

### Required QA tasks

* E2E del flujo panel → confirmación → reset → reporte (TS-01), idempotencia (TS-02), status post-reset (TS-04).
* Negativos: no Demo/`404` (NT-01), concurrencia/`409` (NT-02), falla/`500` (NT-03).
* Autorización: AUTH-TS-01..04. Accesibilidad: teclado/foco/ARIA.

### Required security tasks

* Verificar que ante `404` el control no se expone y no se revela la existencia del endpoint.
* Verificar que el error state no expone stack/SQL/PII y que no hay secretos en el cliente.

### Required seed/demo tasks

* Verificar (E2E Demo) que tras el reset la UI refleja el estado seed conocido; asegurar `SEED_DEMO_ENABLED=true` solo en Demo (coordinar con PB-P2-024 / DevOps).

### Required documentation tasks

* Documentar el panel de reset Demo (uso, estados, gating) y actualizar el runbook de demo. Registrar la alineación documental de §16 (adopción de `404`; equivalencia del gate).

### Dependencies between tasks

* FE-api-client → FE-hooks → FE-components → FE-panel → FE-i18n.
* QA-integration (MSW) puede correr en paralelo a los componentes; QA-E2E requiere el panel integrado y el backend de US-086 desplegado en Demo.
* SEC depende del gating implementado en FE-panel.

### Consolidated `tasks.md` for PB-P3-001

Recomendado: al ser US-140 la única US del backlog item PB-P3-001, las tareas pueden consolidarse directamente en un `tasks.md` del backlog item para el seguimiento de readiness de la demo (R4).

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass (contrato reutilizado de US-086) |
| DB impact clear | N/A (sin migraciones) |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown.**

US-140 (PB-P3-001) tiene un alcance claro y acotado: entrega la **experiencia frontend** del panel admin para disparar el reset surgical del entorno Demo, reutilizando verbatim el endpoint `POST /api/v1/admin/seed/reset`, el `GET /api/v1/admin/seed/status` y el contrato `ResetReportDto` ya especificados y entregados por US-086 (PB-P0-014). No introduce use case backend, ni migraciones de base de datos, ni IA. Las dos alineaciones documentales (adopción de `404` sobre `403`; equivalencia `APP_ENV=demo` ⇔ `SEED_DEMO_ENABLED=true`) son no bloqueantes y ya están formalizadas por THR-012 / PB-P3-001 / US-086. El backend permanece como única fuente de verdad de autorización. No hay decisiones técnicas pendientes ni contradicciones bloqueantes. Siguiente paso: ejecutar `eventflow-user-story-to-development-tasks` sobre esta Technical Specification.
