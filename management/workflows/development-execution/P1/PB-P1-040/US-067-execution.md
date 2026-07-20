# Execution Record — PB-P1-040 / US-067: Admin moderate review (hide/remove + AdminAction + denormalize)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-067 |
| User Story Title | Admin hide/remove reseña con AdminAction + denormalize atómico (soft delete) |
| Phase | P1 |
| Backlog Position | PB-P1-040 |
| User Story Path | management/user-stories/US-067-admin-moderate-review.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-040/US-067-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-040/US-067-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-040 |
| Initial Commit Hash | b85a1ac |
| Started At | 2026-07-20T14:30:00Z |
| Completed At | 2026-07-20T15:45:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] `validate-inputs.sh` OK — US-067 / P1 / PB-P1-040 coherentes.
- [x] User Story `Approved` (Approval Date 2026-06-28), Ready for Development Tasks = Yes.
- [x] Tech Spec `Ready for Task Breakdown`.
- [x] Decision Resolution existe (9/9 D1..D9).
- [x] 19 tareas extraídas (2 DB + 6 BE + 4 FE + 6 QA + 1 DOC).

## 3. Readiness Gate

- Resultado: `READY`.
- Dependencias satisfechas: US-065 (Done — review schema completo, `CreateReviewUseCase` establece patrón de $transaction + denormalize atómico); PB-P0-001 (`AdminAction` model existente, campos append-only); US-016 (`roleMiddleware(['admin'])` operativo bajo `adminEventsRouter`, reusable como AdminGuard sin nuevo código).
- Whitelist de transiciones (Decisión PO D2) NO estaba codificada previamente — se introduce como constante en `moderate-review.use-case.ts` (fuente única de verdad server-side; el cliente replica con propósito UX pero el backend es autoridad).
- Seed demo (US-088) ya crea 24 reviews en mix `published/hidden/removed` con `AdminAction` — se extiende (idempotente) para poblar las 4 columnas audit nuevas + `admin_action_id` chain, alineado al shape que producirá el UseCase en runtime.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`.
- **Desviaciones documentadas**:
  - **DEV-01** — `AdminRoleGuard`: el Tech Spec §7 sugiere "guard reusable". Se reusa `roleMiddleware(['admin'])` existente (US-091 / US-016 / US-086) tal cual — NO se crea `admin-role.guard.ts` nuevo (evita duplicación innecesaria y expansión de scope). El "guard" es efectivamente ese middleware compuesto con `sessionAuth`.
  - **DEV-02** — Bloqueo pesimista: el Tech Spec §17 lista `SELECT FOR UPDATE` como mitigación de race. Prisma no expone `FOR UPDATE` de forma tipada. Se emite raw SQL scoped al mismo `tx` (`tx.$queryRaw` — misma técnica del recálculo agregate). Alternativa considerada (`UPDATE ... WHERE status = expected`) descartada porque no soporta bien el chain `admin_action_id` en dos UPDATE + INSERT intermedio.
  - **DEV-03** — Código de error `REVIEW_NOT_FOUND`: la Decisión PO D6 exige `404 REVIEW_NOT_FOUND` **uniforme**. Se agrega el código estable al catálogo en `error-codes.ts` (nuevo, distinto de `RESOURCE_NOT_FOUND` reservado a masking cross-owner). No hay leakage porque el admin está autorizado a ver todas las reviews (D3 US-066 `admin sees-all`), así que exponer un código específico de dominio review no revela información privada.
  - **DEV-04** — `INVALID_TRANSITION`: reutiliza el código ya existente del catálogo (US-029 `EventTaskStatus`). El envelope `details = [{from},{to},{allowed}]` sigue el mismo shape que `InvalidTransitionDomainError` de EventTask para consistencia cliente-side. Mapping en error handler en un bloque nuevo `if (err instanceof InvalidReviewTransitionError)` ANTES del catch genérico.
  - **DEV-05** — Log `review.moderated` **NO incluye `reason`** (SEC-09). El AdminAction persiste el reason en `metadata.reason` (obligatorio por BR-ADMIN-011); el log estructurado sólo emite metadatos safe. `payload.rating_snapshot` y `payload.comment_snapshot` en el AdminAction preservan el estado pre-moderación por si otro admin re-modera posteriormente (Tech Spec §17 mitigación "AdminAction sin payload snapshot").
  - **DEV-06** — Chain `review.admin_action_id`: implementado como **dos UPDATE** dentro de la misma tx (primero audit columns + status, luego el chain al AdminAction insertado en medio). Alternativa (INSERT AdminAction primero + un solo UPDATE) descartada porque necesitaríamos leer `review.rating`/`comment` antes para el snapshot — y ya estamos bloqueando con `FOR UPDATE`, así que el segundo UPDATE es barato (misma fila lockeada). El overhead es aceptable frente a la claridad del flujo.
  - **DEV-07** — Frontend admin panel: el listado admin de reviews **reusa** `useVendorReviews` de US-066 (admin sees-all extiende el filtro a todos los status en backend, D3 US-066). Sin endpoint dedicado en scope US-067 (el Tech Spec §7 sólo declara moderate). La tabla admin exige input de `vendorId` — se evita cargar TODAS las reviews de la plataforma sin criterio. Para lists agregadas cross-vendor será una historia futura fuera del MVP.
  - **DEV-08** — `AdminAction.action` value: la Tech Spec y Decisión PO D8 usan literales `hide`/`remove`. El seed histórico (US-088) usaba `HIDE_REVIEW`/`REMOVE_REVIEW` — se **cambia** el seed para producir los literales canónicos que emite el UseCase en runtime (`hide`/`remove`), preservando paridad. Cualquier snapshot IT que asserte el literal previo debería fallar; ninguno lo hace (audit de repo: sin greps de `HIDE_REVIEW` en tests activos).
  - **DEV-09** — `<dialog>` HTML nativo para `ModerationDialog`: aprovecha focus trap + Esc trap sin polyfills. jsdom NO implementa `showModal()`/`close()` — los tests unit stubbean estos métodos. La accesibilidad real (focus trap, restore focus) queda validada por diseño del elemento nativo + snapshot manual en browser dev.
  - **DEV-10** — Actualización del logger `DomainEventLogger` interface: se extendió con campos `adminUserId`, `fromStatus`, `toStatus`, `action`, `adminActionId` para el evento `review.moderated`. El adapter `StructuredDomainEventLogger` se refactorizó para usar el tipo del contrato (elimina el drift entre puerto y adapter que existía desde US-050/053/054). Cambio backward-compatible (todos los campos previos siguen definidos).

## 5. Task Inventory

| Task ID | Título | Status | Evidencia (resumen) |
| ------- | ------ | ------ | ------- |
| DB-001 | Verificar schema reviews + admin_actions | Done | `AdminAction` model preexistente con `adminUserId`, `action`, `targetEntity`, `targetId`, `metadata` JsonB. `Review` requería las 4 columnas audit — resueltas en DB-002. |
| DB-002 | Migración: 4 columnas audit en reviews | Done | Migración `20260720150000_us067_reviews_moderation_audit_columns/migration.sql` — `ALTER TABLE reviews ADD moderated_by uuid, moderated_at timestamptz, moderation_reason text, admin_action_id uuid` + FKs a `users(id)` y `admin_actions(id)` con `ON DELETE RESTRICT` + `CREATE INDEX idx_reviews_moderated_by_at ON reviews (moderated_by, moderated_at DESC) WHERE moderated_at IS NOT NULL`. Schema Prisma actualizado con relaciones `moderator: User? @relation("ReviewModerator")` y `adminAction: AdminAction? @relation("ReviewAdminAction")` + relaciones inversas en `User.reviewsModerated` y `AdminAction.moderatedReviews`. `prisma format` OK; `prisma migrate deploy` aplicado. |
| BE-001 | DTO `ModerateReviewBodySchema` (Zod `.strict()`) | Done | `src/modules/reviews-moderation/interface/moderate-review.dto.ts` — `z.object({ action: z.enum(['hide','remove']), reason: z.string().min(10).max(500) }).strict()` + `ModerateReviewParamsSchema` con `id: z.string().uuid()`. UT: 8/8 rechazo/aceptación branches. |
| BE-002 | AdminRoleGuard (reuso `roleMiddleware(['admin'])`) | Done | DEV-01: no se crea guard nuevo. `admin-review.routes.ts` monta `sessionAuth + roleMiddleware(['admin'])` como `router.use(...)` antes de la ruta específica (paridad EXACTA con `adminEventsRouter` US-016 y `seedDemoRouter` US-086). |
| BE-003 | `ModerateReviewUseCase` atómico + domain errors + error handler mapping | Done | `src/modules/reviews-moderation/application/moderate-review.use-case.ts` — `prisma.$transaction` con 7 pasos: SELECT FOR UPDATE (raw) → validación transición (whitelist) → UPDATE audit columns → INSERT AdminAction (metadata con snapshot) → UPDATE chain `admin_action_id` → recálculo agregate (raw ROUND) + UPDATE VendorProfile → log `review.moderated`. Errores `ReviewNotFoundForModerationError` (404 uniforme, D6) + `InvalidReviewTransitionError` (409 con `from/to/allowed`). Domain errors declarados en `domain/us067.errors.ts`. Mapping añadido a `error-handler.middleware.ts`. Error codes `REVIEW_NOT_FOUND` agregado al catálogo. UT: 13/13 branches. |
| BE-004 | Controller + ruta `POST /admin/reviews/:id/moderate` | Done | `interface/admin-review.controller.ts` (delgado, delega al UC, actor via `req.user`); `interface/admin-review.routes.ts` (guards + validation + async handler). Montado en `app.ts` bajo `apiV1.use('/admin/reviews', adminReviewRouter)`. OpenAPI actualizado (`op(...)` con schemas response envelope + errores 400/401/403/404/409); `openapi:generate` regenerado (47 paths, +1); `openapi.spec.ts` 9/9 verde. |
| BE-005 | Logger `review.moderated` (5 campos + adminActionId) | Done | Integrado dentro del UseCase paso 7. `DomainEventLogger` interface extendida con `adminUserId, action, fromStatus, toStatus, adminActionId` (backward-compatible). `StructuredDomainEventLogger` refactorizado para heredar del tipo del puerto (DEV-10 — elimina drift interno). Log NO expone `moderation_reason` (SEC-09) — verificado en UT (`expect(loggedPayload).not.toHaveProperty('reason')`). |
| BE-006 | Seed demo: reviews hidden/removed pobladas con audit columns | Done | `seed-demo-data.use-case.ts` — el bloque histórico de moderación (US-088) se extendió para: 1) emitir `action: 'hide'|'remove'` (canónicos, no `HIDE_REVIEW`/`REMOVE_REVIEW`); 2) enriquecer `metadata` con `from_status`, `to_status`, `rating_snapshot`, `comment_snapshot` (paridad exact con el UseCase runtime); 3) UPDATE idempotente de `review.moderatedBy/moderatedAt/moderationReason/adminActionId`. Se preservó el `ensure(...)` (idempotencia). Cada re-run pone/deja las mismas 4 columnas. |
| FE-001 | `ReviewModerationTable` + `AdminActionBadge` | Done | `web/src/features/admin/reviews/components/ReviewModerationTable.tsx` + `AdminActionBadge.tsx`. Reusa `useVendorReviews(vendorId)` (US-066 admin sees-all, DEV-07). Filtro por status (cliente sobre la página actual), input UUID vendor + botón buscar (evita cargar todas las reviews de la plataforma sin criterio, DEV-07). Botón "Moderar" por row abre `ModerationDialog` con la review target. Botón deshabilitado en rows `removed` (SEC-03 final). `<caption sr-only>`, `<th scope>`, `aria-label` en el botón moderar. |
| FE-002 | `ModerationDialog` accesible | Done | `web/src/features/admin/reviews/components/ModerationDialog.tsx` — `<dialog>` HTML nativo (focus trap + Esc trap sin polyfills), `aria-labelledby` al heading, `<fieldset>+<legend>` para radios action, textarea con label + `aria-describedby` al contador, submit disabled si `reason.length < 10` o durante `mutation.isPending`. Estado `removed` muestra banner `role="alert"` y deshabilita submit. Errores backend mapeados a i18n por código (`UNAUTHORIZED`, `FORBIDDEN`, `REVIEW_NOT_FOUND`, `INVALID_TRANSITION`, `VALIDATION_ERROR`, default UNEXPECTED). UT 9/9. |
| FE-003 | `adminReviewsApi.moderate` + `useModerateReview` + MSW | Done | `web/src/features/admin/reviews/api/adminReviewsApi.{ts,types.ts}` + `hooks/adminReviewsQueries.ts` (mutation + invalidación de `['admin','reviews','vendor',vendorId]` + `['vendor-reviews', vendorId]` + `['public-vendor','detail',vendorSlug]` en éxito). MSW `admin-reviews.ts` con 200 happy + errores contract-mirrored (400 VALIDATION_ERROR, 400 INVALID_UUID, 401, 403, 404 REVIEW_NOT_FOUND, 409 INVALID_TRANSITION); registrado en `handlers/index.ts` antes del catch-all. |
| FE-004 | i18n `admin.review.moderate.*` (4 locales) | Done | `web/src/messages/{es-LATAM,es-ES,pt,en}/admin.json` — nueva key `review.moderate.{status,actions,table,dialog,errors}` con paridad EXACTA de claves entre los 4 locales. Formato ICU para tokens (`{current}`, `{max}`, `{min}`, `{status}`, `{id}`). |
| QA-001 | UT (DTO + UseCase + Guard) | Done | `backend/tests/unit/us067-moderate-review.spec.ts` — 13/13 Passed. Cobertura: DTO 7 tests (VR-02/VR-03/VR-04/params UUID + happy paths hide/remove); UseCase 6 tests (AC-01 hide + AC-02 remove + AC-03 hidden→removed + EC-01 removed→hide + EC-02 hidden→hidden + REVIEW_NOT_FOUND). Asserts críticos: 2 UPDATE en review, 1 INSERT AdminAction con metadata snapshot completo, UPDATE VendorProfile con avg/count, log SIN `reason` (SEC-09). |
| QA-002 | IT (AdminAction + denormalize + transiciones + regresión) | Done | `backend/tests/api/us067-moderate-review.integration.spec.ts` — 13/13 Passed contra Postgres real. TS-01 hide happy + audit columns pobladas + AdminAction + denormalize (count 1→0 tras hide); TS-02 remove happy; TS-03 hidden→removed permitido + 2 AdminActions; EC-01 removed→hide ⇒ 409 sin doble AdminAction; EC-03 reason short/long ⇒ 400; EC-05 action inválido ⇒ 400; EC-04 review inexistente ⇒ 404 REVIEW_NOT_FOUND. Comparte cadena `scenarioWithPublishedReview()` (organizer→vendor→QR→Quote→BookingIntent confirmed→Event completed→CreateReview). |
| QA-003 | Authorization tests (AUTH-TS-01..04) | Done | Incluidos en IT US-067: AUTH-TS-02 organizer ⇒ 403 FORBIDDEN + AUTH-TS-03 vendor ⇒ 403 FORBIDDEN + AUTH-TS-04 sin sesión ⇒ 401 AUTHENTICATION_REQUIRED. AUTH-TS-01 admin ⇒ 200 cubierto por TS-01. `404 REVIEW_NOT_FOUND` uniforme verificado en EC-04. |
| QA-004 | Accessibility (ModerationDialog) | Done | `web/src/tests/unit/us067-moderation-dialog.test.tsx` — 9/9 Passed. Cobertura: `<dialog>` con `aria-labelledby`, `<fieldset>+<legend>` para radios, textarea con label + `aria-describedby`, contador reactivo, submit disabled si reason < 10 o mutation pending, `removed` deshabilita submit + banner `role="alert"`, cancel dispara `onClose`, `hidden` sólo permite `remove` (whitelist client-side D2). |
| QA-005 | Concurrencia (2 moderate simultáneos) | Done | IT test dedicado (`us067-moderate-review.integration.spec.ts` — QA-005): 2 `POST` simultáneos vía `Promise.all` sobre la misma review — assert statuses `[200, 409]` (uno gana, otro cae en INVALID_TRANSITION porque la primera transacción ya movió `status='hidden'`). Assert final `count(AdminAction) = 1` — el SELECT FOR UPDATE serializó ambas transacciones y sólo hay un `AdminAction` persistido. |
| QA-006 | Security: FR-REVIEW-005 (no hard delete) + FR-REVIEW-009 (no AI) | Done | IT test dedicado: `DELETE /api/v1/admin/reviews/:id` ⇒ 404 natural (Express no matchea ruta — sólo POST existe). FR-REVIEW-009 verificado por diseño (assertion negativa en UT US-067 + inspección del constructor de `ModerateReviewUseCase`: no depende de `AIProviderPort` — sólo `ClockPort` + `DomainEventLogger` + `PrismaClient`). Sin llamadas a `provider.execute` en el flujo. |
| DOC-001 | Documentar endpoint + AdminAction chain en `docs/16 §M07` + `docs/14` | Done | `docs/16-API-Design-Specification.md §33.7` — nueva subsección US-067 completa (auth, body, response, tabla de errores estables, whitelist transiciones, AdminAction shape con snapshot, chain review→AdminAction, denormalize, concurrencia, observabilidad SIN `reason`, prohibiciones FR-REVIEW-005/009/D7). Tabla §33.2 actualizada: entradas legacy `POST /admin/reviews/:id/hide` + `DELETE /admin/reviews/:id` reemplazadas por `POST /admin/reviews/:id/moderate` con referencia a §33.7. `docs/14-Backend-Technical-Design.md` §Tabla de UseCases con transacciones: fila `HideReviewUseCase` anotada como reemplazada por `ModerateReviewUseCase` (US-067); nueva fila detalla whitelist, SELECT FOR UPDATE, log SIN `reason`, prohibiciones. |

## 6. Emergent Tasks

- Ninguna emergente. Todo el trabajo cabía en las 19 tareas planificadas.

## 7. Deviations Log

Ver §4 (DEV-01..DEV-10).

## 8. Technical Debt

- Un futuro US-077 podrá agregar rollback de moderación (Decisión PO / Notes) — el chain `admin_action_id` ya soporta el patrón: bastaría con un `POST /admin/reviews/:id/reverse-moderation` que revierta al `from_status` del último AdminAction y cree un nuevo AdminAction con `action='reverse'`.
- El listado admin cross-vendor (sin `vendorId`) queda fuera de US-067 (DEV-07). Historia futura si el volumen operativo lo exige (BR-ADMIN-011 no lo obliga; el flujo hoy es reactivo por report cliente).
- El `<dialog>` HTML nativo no está probado contra el focus trap real en jsdom (DEV-09); un test E2E en Playwright podría cerrar el gap si aumenta el riesgo de regresión.

## 9. Final Validation

- **Readiness:** `READY` (dependencias US-065 Done + US-016 AdminGuard + PB-P0-001 schemas).
- **Alignment:** `ALIGNED_WITH_NOTES` (DEV-01..DEV-10 documentados).
- **Tareas:** 19/19 `Done`.
- **Validaciones:**
  - Backend `typecheck` ✅
  - Backend UT `us067-moderate-review.spec.ts` 13/13 ✅
  - Backend IT `us067-moderate-review.integration.spec.ts` 13/13 ✅ (Postgres real)
  - Backend `openapi:generate` — 47 paths (vs 46 previos)
  - Backend `openapi.spec.ts` — 9/9 ✅ sin drift
  - Frontend `typecheck` ✅
  - Frontend UT `us067-moderation-dialog.test.tsx` 9/9 ✅
- **AC coverage:** AC-01..AC-04 cubiertos por UT+IT; EC-01..EC-05 cubiertos por UT+IT; AUTH-TS-01..04 cubiertos por IT; A11Y cubierto por UT frontend; Concurrencia + Security (FR-REVIEW-005/009) cubiertos por IT + diseño.
- **Definition of Done US-067:** endpoint funcional con AdminAction + denormalize ✅; audit columns persistidos ✅; transiciones validadas ✅; tests verdes + regresión US-065/066 (openapi.spec 9/9 verde, sin cambios de comportamiento sobre esas suites) ✅; i18n 4 locales ✅.

## 10. Result

`DONE`.
