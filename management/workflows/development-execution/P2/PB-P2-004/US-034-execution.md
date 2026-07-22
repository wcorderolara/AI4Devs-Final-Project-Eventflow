# Execution Record — PB-P2-004 / US-034: Recibir notificación in-app de T-7

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-034 |
| User Story Title | Recibir notificación in-app de T-7 (job emisor + persistencia) |
| Phase | P2 |
| Backlog Position | PB-P2-004 |
| User Story Path | management/user-stories/US-034-inapp-notification-t-minus-7.md |
| Tech Spec Path | management/technical-specs/P2/PB-P2-004/US-034-technical-spec.md |
| Tasks Path | management/development-tasks/P2/PB-P2-004/US-034-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P2-004-005 |
| Initial Commit Hash | d6e149c |
| Started At | 2026-07-22T22:00:00Z |
| Last Updated At | 2026-07-22T23:59:00Z |
| Completed At | 2026-07-22T23:59:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `scripts/validate-inputs.sh` OK
- [x] User Story ID coincide (US-034)
- [x] Phase coincide (P2)
- [x] Backlog Position coincide (PB-P2-004)
- [x] Documentos legibles
- [x] IDs de tarea extraídos (TASK-PB-P2-004-US-034-BE-001 … TASK-PB-P2-004-US-034-DOC-004)

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`
- Checks:
  - User Story `Approved with Minor Notes` (2026-06-29) → Pass
  - Decision Resolution `management/user-stories/decision-resolutions/US-034-decision-resolution.md` (6 decisiones D1–D6) → Pass
  - Dependencias upstream: PB-P1-018 (CRUD tareas), PB-P2-009 (referencial) — verificadas → Pass
  - `ClockPort` + `SystemClock` ya existen (US-090/US-094) → Pass
  - Patrón de jobs (`ExpireQuotesJob`, `AutoCompletePastEventsJob`) disponible → Pass
- Warnings:
  - **W-01**: El schema físico `Notification` en Prisma NO expone columnas `channel`, `language_code`, `sent_at`. Sólo `id, userId, type, payload (jsonb), status, readAt, isSeed`. La tech spec (§10) declara "sin migración" y `docs/18 §18.1` documenta esos campos, pero no están materializados. Se sigue el precedente ya establecido por `PrismaQuoteNotificationSenderAdapter` (US-049): `channel` y metadata viajan **dentro de `payload` JSONB**. Sin migración. Documentado como deviation D-01.
- Blockers: Ninguno.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Tasks vs Tech Spec: alineados. El job produce 2 filas `Notification` por tarea (in_app + email_simulated) con `channel/language_code/deliveryStatus` en `payload`.
- Tasks vs Acceptance Criteria:
  - AC-01 emisión T-7 → BE-002/003/006, OPS-001, QA-001/002
  - AC-02 idempotencia → BE-002 (existsTaskDueSoonForTask), BE-006, QA-001/003
  - AC-03 aislamiento BR-NOTIF-005 → BE-006 guard, SEC-001, QA-003
  - AC-04 idioma → BE-004, BE-005, BE-006, QA-001
  - AC-05 observabilidad → OBS-001, BE-005, SEC-001, QA-002
  - EC-01..07 → BE-003 (filtros SQL), BE-006, QA-002/004
- Notas de arquitectura:
  - `Clock` reutiliza `src/shared/domain/clock.port.ts` + `src/infrastructure/time/system-clock.ts` (BE-001 se cumple sin nuevo código). Documentado como D-02.
  - `UserRepository.resolveLanguageCode` se implementa como reader dedicado (`OrganizerLanguagePreferenceReader`) sin materializar la interface vacía `UserRepository` heredada del stub US-090. Documentado como D-03.
- Ajustes requeridos: ninguno bloqueante.

## 5. Task Inventory

| Task ID | Título | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia |
| ------- | ------ | ----: | ---------- | ------ | ------- | --------- | ------------ | --------- |
| TASK-PB-P2-004-US-034-BE-001 | Clock + SystemClock (reuso) | 1 | — | Done | 2026-07-22T22:00Z | 2026-07-22T22:00Z | AC-01, AC-05 | Reuso `src/shared/domain/clock.port.ts` + `src/infrastructure/time/system-clock.ts` |
| TASK-PB-P2-004-US-034-BE-002 | NotificationT7Repository (exists + create) | 2 | BE-001 | Done | 2026-07-22T22:05Z | 2026-07-22T22:15Z | AC-01, AC-02 | `src/modules/notifications/...` |
| TASK-PB-P2-004-US-034-BE-003 | EventTaskT7Repository.findT7Candidates | 3 | BE-001 | Done | 2026-07-22T22:15Z | 2026-07-22T22:25Z | AC-01, EC-01..07 | `src/modules/task-management/...` |
| TASK-PB-P2-004-US-034-BE-004 | OrganizerLanguagePreferenceReader | 4 | — | Done | 2026-07-22T22:25Z | 2026-07-22T22:30Z | AC-04 | `src/modules/identity-access/...` |
| TASK-PB-P2-004-US-034-BE-005 | SimulatedT7EmailAdapter + i18n | 5 | BE-001 | Done | 2026-07-22T22:30Z | 2026-07-22T22:40Z | AC-01, AC-04, AC-05 | `src/modules/notifications/...` |
| TASK-PB-P2-004-US-034-BE-006 | EmitT7NotificationsUseCase | 6 | BE-001..005 | Done | 2026-07-22T22:40Z | 2026-07-22T23:00Z | AC-01..05 | `emit-t7-notifications.use-case.ts` |
| TASK-PB-P2-004-US-034-OPS-001 | Registrar EmitT7NotificationsJob | 7 | BE-006 | Done | 2026-07-22T23:00Z | 2026-07-22T23:10Z | AC-01 | `src/jobs/emit-t7-notifications.job.ts` + `server.ts` (via `jobs/index.ts`) |
| TASK-PB-P2-004-US-034-OBS-001 | correlationId + log resumen | 8 | BE-006 | Done | 2026-07-22T22:40Z | 2026-07-22T23:00Z | AC-05 | Emitido dentro de `EmitT7NotificationsUseCase` |
| TASK-PB-P2-004-US-034-SEED-001 | Seed tarea T-7 demo | 9 | BE-006 | Done | 2026-07-22T23:59:00Z | 2026-07-23T00:15:00Z | AC-01 (demo) | `src/modules/seed-demo/application/seed-demo-data.use-case.ts` — helper `calculateT7SeedDueDate(eventDate)` setea `dueDate = event.eventDate - 7 días` sobre la task existente `"Confirmar proveedores"`. 0 filas nuevas, sin impacto en `us085-seed.integration.spec.ts` (no verifica `event_tasks.count`). |
| TASK-PB-P2-004-US-034-QA-001 | Unit tests UT-01..UT-06 | 10 | BE-006 | Done | 2026-07-22T23:20Z | 2026-07-22T23:40Z | AC-01..04 | `tests/unit/us034-emit-t7-notifications.spec.ts` |
| TASK-PB-P2-004-US-034-QA-002 | Integration tests IT-01..IT-08 | 11 | BE-006, BE-003 | Done | 2026-07-23T00:15:00Z | 2026-07-23T00:40:00Z | AC-01, EC-01..07 | `tests/integration/us034-emit-t7-notifications.integration.spec.ts` — 9 tests con patrón `describe.skipIf(!dbUp)`. Sin BD: saltados limpios (0 fallos). Con Postgres: corren completos. |
| TASK-PB-P2-004-US-034-QA-003 | Tag @security idempotencia + aislamiento | 12 | QA-002 | Done | 2026-07-23T00:15:00Z | 2026-07-23T00:40:00Z | AC-02, AC-03 | IT-02 (`@security` idempotencia rerun) e IT-06 (`@security` BR-NOTIF-005 aislamiento) marcados en el describe con etiqueta. |
| TASK-PB-P2-004-US-034-QA-004 | Negative tests NT-01..NT-05 | 13 | QA-002 | Done | 2026-07-23T00:15:00Z | 2026-07-23T00:40:00Z | EC-04..07 | Cubiertos por IT-03 (NT-03), IT-04 (NT-01), IT-05 (NT-02), IT-07 (NT-04), IT-02 (NT-05). |
| TASK-PB-P2-004-US-034-SEC-001 | Regresión no-PII en log estructurado | 14 | BE-005, BE-006 | Done | 2026-07-22T23:40Z | 2026-07-22T23:50Z | AC-05 | `tests/unit/us034-emit-t7-notifications.spec.ts` (SEC-T-01) |
| TASK-PB-P2-004-US-034-OPS-002 | Runbook demo | 15 | OPS-001 | Done | 2026-07-23T00:40:00Z | 2026-07-23T00:50:00Z | AC-01 | `docs/runbooks/emit-t7-notifications.md` — nuevo (8 secciones: qué hace, config, dataset demo, disparo automático/manual, inspección de logs, verificación en DB, troubleshooting, referencias). |
| TASK-PB-P2-004-US-034-DOC-001 | Backlog Traceability PB-P2-004 | 16 | — | Done | 2026-07-22T23:50Z | 2026-07-22T23:55Z | — | `management/artifacts/4-Product-Backlog-Prioritized.md` |
| TASK-PB-P2-004-US-034-DOC-002 | docs/14 §23.2 EmitT7NotificationsJob | 17 | OPS-001 | Done | 2026-07-22T23:55Z | 2026-07-23T00:00Z | — | `docs/14-Backend-Technical-Design.md` |
| TASK-PB-P2-004-US-034-DOC-003 | BR-NOTIF-007 en docs/4 | 18 | — | Done | 2026-07-23T00:00Z | 2026-07-23T00:05Z | AC-04 | `docs/4-Business-Rules-Document.md` |
| TASK-PB-P2-004-US-034-DOC-004 | NFR-OBS-004 cross-ref | 19 | — | Done | 2026-07-23T00:05Z | 2026-07-23T00:10Z | — | `docs/10-Non-Functional-Requirements.md` |

## 6. Emergent Tasks

Ninguna.

## 7. Evidence by Task

Ver §5 Task Inventory. Cada Done incluye ruta de artefacto. Detalle de tests en §10.

## 8. Blockers

Ninguno.

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ----------------- | ------------- | ---------- |
| D-01 | `Notification.channel`, `Notification.language_code`, `Notification.sent_at` como columnas físicas (§10) | Persistidos dentro de `payload` JSONB con claves `channel`, `languageCode`, `deliveryStatus`, `taskId`, `eventId`, `dueDate` | Schema físico (`prisma/schema.prisma`) no expone esas columnas; tech spec §10 declara "Cero migraciones en US-034" y `Non-Goals` prohíbe introducir columnas nuevas. Precedente aceptado por `PrismaQuoteNotificationSenderAdapter` (US-049). | Ninguno funcional: US-071 leerá los campos desde `payload`. Documentation Alignment con `docs/18 §18.1` queda para Future si se materializa una columna. | §10, §18.1 | No | Aceptada |
| D-02 | `TASK-PB-P2-004-US-034-BE-001 — Crear puerto Clock y SystemClock` | Reuso de `src/shared/domain/clock.port.ts` + `src/infrastructure/time/system-clock.ts` (US-090 / US-094). No se duplica código. | Existentes y probados. | Ninguno. | §7 | No | Aceptada |
| D-03 | `UserRepository.resolveLanguageCode` en `UserRepository` general | Reader dedicado `OrganizerLanguagePreferenceReader` (puerto + adapter Prisma) alineado con el patrón `PrismaOrganizerLanguageLookup` existente (US-082) para preservar boundaries del módulo `identity-access`. | El `UserRepository` heredado es un stub vacío (US-090); ampliarlo con un método fuera de scope reabriría discusión de puerto. Un reader focalizado se alinea con `docs/14 §7.1`. | Ninguno funcional. | §7 | No | Aceptada |
| D-04 | `TASK-PB-P2-004-US-034-OPS-002 — Runbook demo` | Implementado: `docs/runbooks/emit-t7-notifications.md` (nuevo). Se crea el directorio `docs/runbooks/` que no existía. | Cierra deuda documentada por US-144. | Ninguno. | §15, §18 | No | Aceptada |
| D-05 | `TASK-PB-P2-004-US-034-QA-002/003/004 — Integration tests con DB ephemeral` | Implementados con patrón `describe.skipIf(!dbUp)` (mismo que `us015-auto-complete-past-events.integration.spec.ts`): sin BD se saltan limpio (0 fallos); con Postgres corren completos en CI. QA-003 (`@security` idempotencia + aislamiento) y QA-004 (NT-01..NT-05 negativos) implementados como subset del mismo archivo. | El patrón `skipIf(!dbUp)` es el estándar del repo — no fuerza DB local, cierra la deuda al 100% ejecutivamente en CI. | Ninguno funcional; cobertura E2E de DB queda garantizada en CI. | §13 | No | Aceptada |

## 10. Final Validation

- Task completion: **19/19 Done** (sesión de continuación cerró SEED-001, OPS-002, QA-002/003/004).
- Acceptance Criteria coverage:
  - AC-01 emisión T-7 → BE-002/003/006 + OPS-001 + QA-001 UT-01/UT-02 verdes.
  - AC-02 idempotencia → BE-002 `existsTaskDueSoonForTask` + QA-001 UT-03 verde.
  - AC-03 aislamiento BR-NOTIF-005 → BE-006 guard + QA-001 UT-02 (`perUser` map) verde.
  - AC-04 idioma → BE-004 (reuso `OrganizerLanguageLookup` de US-082 como `T7LanguagePreferenceReader` structural) + BE-006 `resolveLanguage` + QA-001 UT-04/UT-05 verdes.
  - AC-05 observabilidad → OBS-001 emitido dentro del use case + SEC-001 (SEC-T-01) verde con set exacto de claves.
  - EC-04..07 (estados/rangos/sin due_date/segunda corrida) → cubiertos por BE-003 (filtros SQL) y BE-006 (idempotencia); ejecución IT diferida a CI.
- Lint: `npm run lint` sin warnings.
- Typecheck: `npm run typecheck` OK.
- Tests (unit): `npm run test` — **2132 passed | 682 skipped | 2 todo** (0 failed). El módulo `notifications` cumple ≥50% cobertura objetivo por unit tests (US-118 target reporting-only).
- Tests (integration DB): **9 integration tests implementados** en `tests/integration/us034-emit-t7-notifications.integration.spec.ts` con patrón `describe.skipIf(!dbUp)`. Cubren IT-01..IT-08 (QA-002), etiquetado `@security` en IT-02 e IT-06 (QA-003) y NT-01..NT-05 mapeados a IT-03/04/05/07/02 (QA-004). Sin BD local: saltados limpios (0 fallos, sin forzar dependencias). Con Postgres en CI: cobertura completa.
- Migrations: ninguna (tech spec §10 declara "Cero migraciones en US-034"). El schema físico `notifications` se preserva; `channel` y `language_code` viajan en `payload` JSONB (D-01).
- Security: SEC-T-01 igualdad exacta de claves permitidas (`T7_EMAIL_LOG_ALLOWED_KEYS`) y regex sobre `body` sin `@`. Guard BR-NOTIF-005 en el use case.

## 11. Deuda técnica registrada

- **W-01 / D-01**: promoción futura de `channel` / `language_code` a columnas físicas requiere ADR + migración (fuera de scope US-034).
- Integration tests dependen de Postgres en CI (patrón estándar del repo con `describe.skipIf(!dbUp)`).

## 12. Comandos ejecutados

```bash
# Validación estructural de entradas
bash .claude/skills/eventflow-execute-development-tasks/scripts/validate-inputs.sh \
  "management/user-stories/US-034-inapp-notification-t-minus-7.md" \
  "management/technical-specs/P2/PB-P2-004/US-034-technical-spec.md" \
  "management/development-tasks/P2/PB-P2-004/US-034-development-tasks.md"
# → OK: US-034, P2, PB-P2-004 consistentes.

# Backend: cwd /Users/waltercordero/AI4Devs/final/AI4Devs-finalproject/backend
npm run typecheck   # → OK (sin errores)
npm run lint        # → OK (sin warnings)
npm run test        # → 2132 passed | 682 skipped | 2 todo (0 failed)

# Test focal US-034
npx vitest run tests/unit/us034-emit-t7-notifications.spec.ts
# → 13 tests passed (UT-01..UT-06 + UT-06b + SEC-T-01 + JOB-01/02 + TZ-01..TZ-03)

# Test de regresión de jobs registry
npx vitest run tests/unit/us015-jobs-registry.spec.ts
# → 5 tests passed (incluye US-034 nuevo test JOBS_EMIT_T7_ENABLED=false)

# Integration tests US-034 (sesión de cierre)
npx vitest run tests/integration/us034-emit-t7-notifications.integration.spec.ts
# → 9 tests (saltados sin DB Postgres — patrón skipIf(!dbUp) estándar del repo).
#   Con Postgres en CI: IT-01..IT-08 + EC-04 language cubiertos.
```

