# Execution Record — PB-P1-041 / US-047: Admin moderate VendorProfile (approve/reject/hide/unhide + AdminAction chain + 2 notifs vendor)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-047 |
| User Story Title | Admin modera VendorProfile (approve/reject/hide/unhide con AdminAction + notif) |
| Phase | P1 |
| Backlog Position | PB-P1-041 |
| User Story Path | management/user-stories/US-047-admin-approve-reject-vendor.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-041/US-047-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-041/US-047-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-041 |
| Initial Commit Hash | a614ea7 |
| Started At | 2026-07-20T13:00:00Z |
| Completed At | 2026-07-20T13:30:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] `validate-inputs.sh` OK — US-047 / P1 / PB-P1-041 coherentes (US=US-047 PHASE=P1 BACKLOG=PB-P1-041).
- [x] User Story `Approved` (Approval Date 2026-06-29), Ready for Development Tasks = Yes.
- [x] Tech Spec `Ready for Task Breakdown` (Last Updated 2026-06-29).
- [x] Decision Resolution existe (9/9 D1..D9).
- [x] 15 tareas extraídas (2 DB + 6 BE + 6 QA + 1 DOC; FE en US-074).

## 3. Readiness Gate

- Resultado: `READY`.
- Dependencias satisfechas:
  - US-067 (Done — pattern `ModerateReviewUseCase` establece SELECT FOR UPDATE + AdminAction chain + audit columns + reason en metadata sin logear).
  - US-065/066 (Done — service común `QuoteEventNotificationService` operativo con 9 eventos, extensible al patrón `emit({eventName, tx})`).
  - US-016 (Done — `roleMiddleware(['admin'])` reusable como AdminGuard sin nuevo código).
  - US-045/046 (Done — public lookups filtran por `status='approved'`, listos para agregar `is_hidden=false`).
  - PB-P0-001 (schema base + AdminAction append-only con `metadata` JsonB + `correlationId`).
- Whitelist de transiciones (Decisión PO D5) NO estaba codificada previamente — se introduce como constante en `moderate-vendor.use-case.ts` (fuente única de verdad server-side; el cliente replica con propósito UX pero el backend es autoridad).

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`.
- **Desviaciones documentadas**:
  - **DEV-01** — `AdminRoleGuard`: el Tech Spec §7 menciona "AdminRoleGuard reuso US-067". Se reusa `roleMiddleware(['admin'])` existente (US-091 / US-016 / US-086 / US-067) tal cual — NO se crea `admin-role.guard.ts` nuevo. El "guard" es efectivamente ese middleware compuesto con `sessionAuth`. Paridad EXACTA con `adminReviewRouter`.
  - **DEV-02** — Bloqueo pesimista: el Tech Spec §17 lista `SELECT FOR UPDATE` como mitigación de race. Prisma no expone `FOR UPDATE` tipado — se emite raw SQL scoped al mismo `tx` (`tx.$queryRaw` — misma técnica de `ModerateReviewUseCase`).
  - **DEV-03** — Código de error `VENDOR_NOT_FOUND`: la Decisión PO D7 exige `404 VENDOR_NOT_FOUND` **uniforme**. Se reutiliza el código ya existente en el catálogo (introducido por US-046 para el detalle público) porque el admin está autorizado a ver el estado del vendor: exponer un código específico de dominio vendor no revela información privada. NO se crea `ADMIN_VENDOR_NOT_FOUND` distinto.
  - **DEV-04** — Códigos de validación no promovidos a top-level: la User Story lista `INVALID_ACTION`, `REASON_REQUIRED`, `INVALID_REASON_LENGTH`, `INVALID_UUID`, `INVALID_BODY` como códigos estables. El middleware global mapea toda validación Zod a `400 VALIDATION_ERROR` con `details=[{field, message}]` (mismo patrón que US-067 DEV-04). Se preserva la semántica en `details` (ej. `{field:'body.reason', message:'REASON_REQUIRED'}` via `superRefine` custom message) sin cambiar la infraestructura de mapping general. El status HTTP (400) es idéntico al que exigen las Validation Rules.
  - **DEV-05** — `INVALID_TRANSITION`: reutiliza el código ya existente del catálogo (US-029 EventTaskStatus + US-067 review). El envelope `details = [{from_status},{from_is_hidden},{to_status},{to_is_hidden},{action},{allowed}]` es más rico que el de US-067 (`[{from},{to},{allowed}]`) porque US-047 necesita distinguir `status` de `is_hidden` (Decisión PO D2 flag ortogonal). Mapping en `error-handler.middleware.ts` en un bloque nuevo `if (err instanceof InvalidVendorTransitionError)` justo después del bloque `InvalidReviewTransitionError`.
  - **DEV-06** — Log `vendor.moderated` **NO incluye `reason`** (SEC-05/09; paridad exacta con `review.moderated` de US-067). El AdminAction persiste el reason en `metadata.reason`; el log estructurado sólo emite metadatos safe: `{vendorProfileId, adminUserId, action, fromStatus, toStatus, fromIsHidden, toIsHidden, adminActionId}`. `DomainEventLogger` extendido con `fromIsHidden`/`toIsHidden` (boolean) sin romper backward-compat.
  - **DEV-07** — Chain `vendor.admin_action_id`: implementado como **dos UPDATE** dentro de la misma tx (primero audit columns + status/is_hidden, luego el chain al AdminAction insertado en medio). Misma técnica que US-067; overhead aceptable frente a la claridad del flujo — la fila ya está lockeada así que el segundo UPDATE es barato.
  - **DEV-08** — Fan-out de notifications: el Tech Spec §7 describe la notif con `vendorId, action, reason, moderated_by, moderated_at` como payload. Se emite via `QuoteEventNotificationService.emit(...)` (paridad con US-054/060/061/062/065). El service común se extiende a 13 eventos (los 9 previos + 4 `vendor.*`). Sin `correlationId` en el payload notif — viaja como argumento del `emit` para el log agregado.
  - **DEV-09** — Efecto cruzado en US-045 (directorio) y US-046 (detalle público): ambos filtros ya restringían `status='approved' AND deleted_at IS NULL`. Se **añade** `is_hidden = false` a los dos predicados (`prisma-vendor-search.repository.ts` raw SQL + `prisma-public-vendor.repository.ts` Prisma builder). QA-002 TS-06 verifica end-to-end que un `hide` saca al vendor del detalle público. También se añade la misma exclusión a `get-vendor-reviews.use-case.ts` (US-066) para preservar coherencia — un vendor `approved+hidden` desaparece del listado público de reviews (admin ve todo por `sees-all` D3 US-066).
  - **DEV-10** — Seed demo: se añade `seedVendorModerations` como paso nuevo del orquestador que aplica escenarios `hide` (vendors[3]) y `reject` (vendors[4]) con audit chain completo. Idempotente vía guard `admin_action_id IS NOT NULL` (segunda pasada suma `unchanged`). `SeedDomainName` extendido con `'vendor-moderations'`. El seedAdminActions legacy (que crea `action='vendor.approve'` sin chain) queda intacto por backward-compat con US-085 IT.
  - **DEV-11** — `ModerateVendorBodySchema` es `ZodEffects` (por `superRefine` cross-field D4). `zod-to-openapi` requiere `ZodObject`; se expone `ModerateVendorBodyBaseSchema` (sin refine) al snapshot OpenAPI — mismo criterio que `AdminReviewsQueryBaseSchema` de US-077. El shape del contrato es idéntico; el refine es sólo validación runtime.
  - **DEV-12** — Seed slug del test IT (`us047-${rnd()}`): `rnd()` genera dígitos + underscore; el regex del path `^[a-z0-9-]+$` rechaza `_`. Se aplica `.replace(/_/g, '-')` sólo en el generador de test — el UseCase / DTO no requieren cambios.

## 5. Task Inventory

| Task ID | Título | Status | Evidencia (resumen) |
| ------- | ------ | ------ | ------- |
| DB-001 | Verificar schema vendor_profiles + admin_actions | Done | `AdminAction` model preexistente con `adminUserId`, `action`, `targetEntity`, `targetId`, `metadata` JsonB, `correlationId` (US-041 D3). `VendorProfile` requería 4 columnas audit + `is_hidden` — resueltas en DB-002. |
| DB-002 | Migración audit + is_hidden defensivo | Done | Migración `20260720160000_us047_vendor_profiles_moderation_audit_columns/migration.sql` — `ALTER TABLE vendor_profiles ADD is_hidden boolean NOT NULL DEFAULT false, ADD moderated_by uuid, ADD moderated_at timestamptz, ADD moderation_reason text, ADD admin_action_id uuid` + FKs a `users(id)` y `admin_actions(id)` con `ON DELETE RESTRICT` + `CREATE INDEX idx_vendor_profiles_status_hidden ON vendor_profiles (status, is_hidden) WHERE deleted_at IS NULL`. Schema Prisma actualizado con relaciones `moderator: User? @relation("VendorProfileModerator")` y `adminAction: AdminAction? @relation("VendorProfileAdminAction")` + relaciones inversas en `User.vendorProfilesModerated` y `AdminAction.moderatedVendorProfiles`. `IF NOT EXISTS` en las 5 columnas por defensa (Tech Spec §10). `prisma format` + `prisma validate` OK; `prisma migrate deploy` aplicado. |
| BE-001 | DTO `ModerateVendorBodySchema` (Zod `.strict()` + cross-field refine) | Done | `src/modules/admin-governance/interface/moderate-vendor.dto.ts` — `ModerateVendorBodyBaseSchema = z.object({action: z.enum(['approve','reject','hide','unhide']), reason: z.string().min(10).max(500).optional()}).strict()` + `ModerateVendorBodySchema = base.superRefine((data, ctx) => reject/hide sin reason ⇒ addIssue REASON_REQUIRED)` + `ModerateVendorParamsSchema` con `id: z.string().uuid()`. UT: 9/9 branches (approve/unhide sin reason, reject/hide con reason, VR-02 enum, VR-04 length, VR-05 strict, D4 REASON_REQUIRED en reject/hide, params UUID). |
| BE-002 | Extender service común con 4 eventos `vendor.*` | Done | `src/modules/quote-flow/services/quote-event-notification.service.ts` — `QuoteEventName` extendido a 13 eventos: `+ 'vendor.approved' | 'vendor.rejected' | 'vendor.hidden' | 'vendor.unhidden'`. Backward-compatible (los 9 eventos previos siguen operativos por regresión US-054/056/060/061/062/065/067). Test openapi + suites US-054..067 regresión verde (12+9+13 tests). |
| BE-003 | `ModerateVendorUseCase` atómico + domain errors + error handler mapping | Done | `src/modules/admin-governance/application/moderate-vendor.use-case.ts` — `prisma.$transaction` con 7 pasos: SELECT FOR UPDATE (raw, deleted_at check) → validación transición (whitelist ALLOWED_ACTIONS_BY_STATE) → UPDATE status/is_hidden + audit columns → INSERT AdminAction (metadata con reason + snapshot from/to) → UPDATE chain `admin_action_id` → fan-out `vendorEvents.emit({eventName, tx})` → log `vendor.moderated`. Domain errors `VendorNotFoundForModerationError` (404 uniforme, D7) + `InvalidVendorTransitionError` (409 con from_status/from_is_hidden/to_status/to_is_hidden/action/allowed) en `domain/us047.errors.ts`. Mapping añadido a `error-handler.middleware.ts` justo después de US-067. UT: 18/18 branches. |
| BE-004 | Controller + ruta `POST /admin/vendors/:id/moderate` | Done | `interface/admin-vendor.controller.ts` (delgado, delega al UC, actor via `req.user`); `interface/admin-vendor.routes.ts` (guards + validation + async handler; composition root reusa `PrismaQuoteNotificationSenderAdapter` + `QuoteEventNotificationService`). Barrel `interface/index.ts` exporta `adminVendorRouter` + `AdminVendorController`. Montado en `app.ts` bajo `apiV1.use('/admin/vendors', adminVendorRouter)` justo después de `/admin/reviews`. OpenAPI actualizado (`op(...)` con `ModerateVendorBodyBaseSchema` + response envelope + errores 400/401/403/404/409); `openapi:generate` regenerado (49 paths, +2); `openapi.spec.ts` 9/9 verde. |
| BE-005 | Logger `vendor.moderated` (7 campos + adminActionId) | Done | Integrado dentro del UseCase paso 7. `DomainEventLogger` interface extendida con `fromIsHidden?/toIsHidden?` (boolean) — backward-compat. Log NO expone `moderation_reason` (SEC-05/09) — verificado en UT (`expect(logged).not.toHaveProperty('reason')`). |
| BE-006 | Seed demo vendors moderados | Done | `seed-demo-data.use-case.ts` — nuevo paso `vendor-moderations` (dominio en `SeedDomainName`) que aplica: `vendors[3] → hide` (is_hidden=true + AdminAction action='hide' + chain) y `vendors[4] → reject` (status='rejected' + AdminAction action='reject' + chain). Idempotente vía guard `admin_action_id IS NOT NULL`. Test US-085 seed integration: 7/7 verde. |
| QA-001 | UT (DTO + UseCase branches) | Done | `backend/tests/unit/us047-moderate-vendor.spec.ts` — 18/18 Passed. Cobertura: DTO 9 tests (VR-02 enum, VR-04 length min/max, VR-05 strict, D3 approve/unhide sin reason, D4 reject/hide sin reason ⇒ REASON_REQUIRED, D4 reject/hide con reason OK, params UUID); UseCase 9 tests (AC-01 approve, AC-02 reject, AC-03 hide, AC-04 unhide, EC-01 approved+approve doble, EC-02 pending+hide, EC-03 rejected+approve OUT MVP, vendor inexistente, vendor soft-deleted). Asserts críticos: 2 UPDATE en vendor, 1 INSERT AdminAction con metadata snapshot completo, notify emit con eventName correcto, log SIN `reason` (SEC-05/09). |
| QA-002 | IT (4 acciones + AdminAction + denormalize + regresión US-040 + service común) | Done | `backend/tests/api/us047-moderate-vendor.integration.spec.ts` — 17/17 Passed contra Postgres real. TS-01 approve pending + audit + AdminAction chain + 2 notifs; TS-02 reject; TS-03 hide (status intacto); TS-04 unhide; TS-06 lookup público `GET /public/vendors/:slug` retorna 200 antes de hide, 404 después; EC-01..EC-03 transiciones inválidas; EC-04 reject sin reason ⇒ 400 con `{field:'body.reason', message:'REASON_REQUIRED'}`; EC-05..EC-07 validaciones DTO. Regresión service común: la suite US-067 pasa 13/13 sin cambios; suites US-054/060/061/062/065 pasan por delta (verificadas por el full-run diff pre/post: mismos 11 archivos pre-existentes fallando, sin nuevas regresiones). |
| QA-003 | Authorization tests (AUTH-TS-01..04) | Done | Incluidos en IT US-047: AUTH-TS-01 admin ⇒ 200 (cubierto por TS-01); AUTH-TS-02 organizer ⇒ 403 FORBIDDEN; AUTH-TS-03 vendor ⇒ 403 FORBIDDEN; AUTH-TS-04 sin sesión ⇒ 401 AUTHENTICATION_REQUIRED. `404 VENDOR_NOT_FOUND` uniforme verificado en EC-06. |
| QA-004 | Concurrencia (2 moderate simultáneos) | Done | IT test dedicado: 2 `POST /moderate` con `action='hide'` simultáneos vía `Promise.all` sobre el mismo vendor `approved+visible` — assert statuses `[200, 409]` (uno gana, otro cae en INVALID_TRANSITION porque tras el 1er UPDATE el vendor ya es `approved+is_hidden=true` — regla whitelist: `hide` requiere `is_hidden=false`). Assert final `count(AdminAction) = 1` — el SELECT FOR UPDATE serializó ambas transacciones. |
| QA-005 | Security: no hard delete + AdminAction obligatorio | Done | Cubierto por diseño + IT: (1) el UseCase NO expone endpoint DELETE — sólo POST /moderate; el error handler retorna 404 natural para métodos ajenos; (2) cada acción exitosa persiste exactamente 1 AdminAction (verificado en TS-01/02/03/04 + concurrencia QA-004); (3) reason enforcement via cross-field refine (EC-04 test); (4) `moderationReason` persiste en `vendor_profiles.moderation_reason` + en `admin_actions.metadata.reason` (append-only). Sin AI (SEC-05) — el `ModerateVendorUseCase` no depende de `AIProviderPort` (inspección del constructor: sólo `QuoteEventNotificationService | ClockPort | DomainEventLogger | PrismaClient`). |
| QA-006 | Performance `< 500ms p95` | Done | IT smoke `QA-006 perf`: happy path approve ejecuta en < 500 ms wall-clock single-shot (medido con `performance.now()`). Nota de deuda: single-shot no equivale a p95 con concurrencia; un load test dedicado queda como Should con caveat (§Technical Debt). |
| DOC-001 | Documentar endpoint + AdminAction chain VendorProfile | Done | `docs/16-API-Design-Specification.md §27.8` — nueva subsección US-047 completa (whitelist transiciones, body strict + refine, response 200, errores estables, atomicidad 7 pasos, efecto cruzado en US-040/045/046, prohibiciones). Tabla §27.3 endpoints ampliada con la fila `POST /admin/vendors/:id/moderate`. `docs/14-Backend-Technical-Design.md` §Tabla de UseCases con transacciones: filas `ApproveVendorProfileUseCase`/`RejectVendorProfileUseCase` anotadas como reemplazadas por `ModerateVendorUseCase` (US-047); nueva fila `ModerateVendorUseCase` documentando whitelist, SELECT FOR UPDATE, log SIN `reason`, extensión del service común a 13 eventos, prohibiciones. |

## 6. Emergent Tasks

- **EMERGENT-001** — Filtrar `is_hidden=false` en `get-vendor-reviews.use-case.ts` (US-066): coherencia con el listado público — un vendor `approved+hidden` desaparece del listado público de reviews (admin `sees-all` conserva visibilidad total). Documentado en DEV-09. Sin nueva ruta ni DTO — sólo un predicado en el `where` del vendor lookup gate.

## 7. Deviations Log

Ver §4 (DEV-01..DEV-12).

## 8. Technical Debt

- Un futuro US podrá agregar re-approve de vendors `rejected` (Out of Scope US-047 D5). El chain `admin_action_id` ya soporta el patrón: bastaría un nuevo `action='reapprove'` en el whitelist + audit metadata `from_status='rejected'`.
- El endpoint no soporta bulk moderation (Out of Scope): moderar 100 vendors requiere 100 requests. Si el volumen operativo lo exige, una historia futura podría añadir `POST /admin/vendors/moderate-bulk` con límite por batch.
- QA-006 perf: single-shot no equivale a p95 con concurrencia real. Un load test dedicado con k6/artillery contra un shard con carga sintética queda como deuda (marcada Should, no bloquea DoD).
- El seed legacy (`seedAdminActions` con `action='vendor.approve'` y sin chain) coexiste con el nuevo `seedVendorModerations`. Housekeeping opcional futuro: unificar los dos en un único paso con audit chain completo. No urgente porque US-085 IT sigue verde con ambos.
- 2 tests de `us046-public-vendor.api.spec.ts` **pre-existentes** siguen fallando (`SEC-02/03 whitelist "no expone id"` y `AC-01 shape whitelist`). Verificados como baseline via `git stash` — NO fueron introducidos por US-047. Fuera de scope de esta ejecución; ticket separado sugerido para el mapper `PublicVendorMapper`.

## 9. Final Validation

- **Readiness:** `READY` (dependencias US-067 + service común + AdminGuard + PB-P0-001).
- **Alignment:** `ALIGNED_WITH_NOTES` (DEV-01..DEV-12 documentados).
- **Tareas:** 15/15 `Done`.
- **Validaciones ejecutadas**:
  - Backend `typecheck` (`npx tsc --noEmit`) ✅ sin errores.
  - Backend UT `us047-moderate-vendor.spec.ts` 18/18 ✅.
  - Backend IT `us047-moderate-vendor.integration.spec.ts` 17/17 ✅ (Postgres real).
  - Backend `openapi:generate` — 49 paths (+2 respecto de 47).
  - Backend `openapi.spec.ts` — 9/9 ✅ sin drift.
  - Regresión US-067 IT — 13/13 ✅.
  - Regresión US-085 seed IT — 7/7 ✅.
  - Diff full-suite pre/post (`git stash` baseline): mismos 11 archivos pre-existentes fallando, 0 nuevas regresiones atribuibles a US-047.
- **AC coverage:**
  - AC-01 (approve pending) cubierto por UT + IT TS-01.
  - AC-02 (reject pending) cubierto por UT + IT TS-02.
  - AC-03 (hide approved) cubierto por UT + IT TS-03.
  - AC-04 (unhide approved+hidden + directorio público excluye rejected/hidden) cubierto por UT + IT TS-04 + IT TS-06.
  - EC-01..EC-07 cubiertos por UT + IT (transiciones + validaciones DTO + 404 uniforme).
  - AUTH-TS-01..04 cubiertos por IT.
  - Concurrencia (QA-004) + Security (QA-005) + Perf smoke (QA-006) cubiertos por IT.
- **Definition of Done US-047**:
  - Endpoint funcional con 4 acciones ✅.
  - AdminAction registrada en cada acción (append-only + chain) ✅.
  - 2 Notifications atómicas via service común extendido a 13 eventos ✅.
  - Audit columns persistidos ✅.
  - Tests verdes + regresión US-040 lookup + service común ✅ (sin nuevas regresiones full-suite).

## 10. Result

`DONE`.
