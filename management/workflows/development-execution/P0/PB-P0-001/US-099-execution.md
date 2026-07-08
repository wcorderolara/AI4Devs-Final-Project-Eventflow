# Execution Record — PB-P0-001 / US-099: Definir schema Prisma declarativo por dominio MVP

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-099 |
| User Story Title | Definir schema Prisma declarativo por dominio MVP |
| Phase | P0 |
| Backlog Position | PB-P0-001 |
| User Story Path | management/user-stories/US-099-prisma-schema.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-001/US-099-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-001/US-099-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 (Current=documentación; Target parcialmente materializado por esta US) |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-P0-001 |
| Initial Commit Hash | f4cc3392cc27766e433d1343bf5fd424dda90f0a |
| Started At | 2026-07-08T19:03:52Z |
| Last Updated At | 2026-07-08T19:11:30Z |
| Completed At | 2026-07-08T19:11:30Z |
| Claude Session ID | 911fe277-4844-478f-8efa-12f648b8c5c0 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `validate-inputs.sh` exit 0
- [x] User Story ID coincide en las 3 rutas (nombre + contenido): US-099
- [x] Phase coincide entre Tech Spec y Tasks: P0
- [x] Backlog Position coincide entre Tech Spec y Tasks: PB-P0-001
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: TASK-PB-P0-001-US-099-OPS-001 … TASK-PB-P0-001-US-099-DOC-004; 27 tareas base)

## 3. Readiness Gate

- Resultado: **READY_WITH_WARNINGS**
- Checks: User Story `Approved` (2026-06-09) con `Ready for Development Tasks: Yes`; 11 AC testables; Tech Spec `Ready for Task Breakdown`; Tasks File con 27 tareas identificables; `DEVELOPMENT_CONVENTIONS.md` legible; historia presente en backlog priorizado (PB-P0-001); sin execution record previo.
- Warnings:
  - **W-01 (dependencia PB-P0-002 no materializada):** el backend bootstrap (`backend/`, `package.json`, tsconfig, Vitest) **no existía**. US-099 depende de PB-P0-002 solo para que `prisma generate` corra "dentro del módulo backend"; la Tech Spec §18 admite que el backend "se prepara en paralelo". Se creó el andamiaje **mínimo** Node/Prisma que OPS-001 requiere (package.json, tsconfig, .env.example, vitest.config, .gitignore). No se implementó ningún módulo de aplicación, Express, controllers ni use cases (eso permanece en PB-P0-002). El warning no altera arquitectura, comportamiento de aceptación, seguridad ni scope de US-099.
  - **W-02 (estado Current del repo):** no existían `package.json`, `prisma/`, `.github/workflows/`. Consistente con §2 de la skill; validaciones ejecutadas realmente tras materializar la tooling.
- Blockers: Ninguno.
- Decision files relacionados: `management/user-stories/decision-resolutions/US-099-decision-resolution.md` (referenciado por Tech Spec; 11 decisiones incorporadas, ninguna reabierta).
- Refinement files relacionados: no inspeccionado archivo dedicado; decisiones consolidadas en User Story §"PO/BA Decisions Applied" y Tech Spec §1/§5.

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Tasks vs Tech Spec: cada tarea deriva de §4–§19; cobertura completa (OPS/DB/BE/SEC/QA/DOC). Sin scope no aprobado.
- Tech Spec vs Conventions: stack PostgreSQL+Prisma+Node+TS (ADR-BE-001/ADR-DB-001); gestor `npm` canónico (`docs/21`); backend en `backend/` con `backend/prisma/schema.prisma` y `backend/tests/` (DEVELOPMENT_CONVENTIONS.md §"Estructura Target"). Alineado.
- Tasks vs Acceptance Criteria (mapeo): AC-01→DB-002..DB-007/QA-001; AC-02→DB-001/QA-004/QA-005; AC-03→QA-008; AC-04→QA-008; AC-05→QA-008; AC-06→QA-002; AC-07→QA-003; AC-08→DB-004/QA-008; AC-09→DB-002/QA-006; AC-10→DB-007/QA-007; AC-11→BE-001/OPS-004. Todos cubiertos con evidencia.
- Notas de alineación (menores; registradas, ejecución continúa):
  - **N-01 (naming `Attachment`):** el Tasks File ilustra `entityType`/`entityId`; Doc 18 §19 (nivel de precedencia superior, §4) usa `owner_type`/`owner_id` con enum `attachment_owner_type` e índices polimórficos. Se adoptó el naming canónico de Doc 18: Prisma `ownerType`/`ownerId` → columnas `owner_type`/`owner_id`. Polimórfico sin FK; consistencia de owner → capa de aplicación / US-102.
  - **N-02 (`LanguageCode` con guion):** Prisma prohíbe `-` en identificadores de enum; valores `es-LATAM`/`es-ES` se declaran como `es_LATAM @map("es-LATAM")` / `es_ES @map("es-ES")` para preservar el valor físico.
  - **N-03 (enums auxiliares por entidad):** además de los 10 status requeridos se declararon `EventTaskStatus` (Doc 18 `task_status`) y `EventTaskOrigin` (manual/ai) para tipar campos que el Tasks File pide en `EventTask`. Entidad-específicos; no reutilizan un enum genérico `Status` (VR-08 respetado).
  - **N-04 (`AIRecommendationStatus`):** unión de Doc 18 (`pending, accepted, rejected, discarded, failed, expired`) + `edited` requerido por el flujo HITL de la User Story.
- Hallazgos de arquitectura: Ninguno bloqueante. Sin sustitución de tecnología, sin nueva cola/servicio, sin bypass de autorización, sin fuga de Prisma al frontend.
- Ajustes requeridos: Ninguno (subpasos cubiertos dentro de las tareas base; sin tareas emergentes).

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P0-001-US-099-OPS-001 | Instalar Prisma y configurar datasource/generator | 1 | — | Done | 2026-07-08T19:03Z | 2026-07-08T19:05Z | AC-11 (precond.) | package.json + schema (generator/datasource) + .env.example dummy |
| TASK-PB-P0-001-US-099-OPS-002 | Agregar npm scripts db:validate/db:generate | 2 | OPS-001 | Done | 2026-07-08T19:04Z | 2026-07-08T19:05Z | AC-01, AC-11 | scripts db:validate/db:generate/db:format/db:check + README |
| TASK-PB-P0-001-US-099-DB-001 | Declarar enums base y de status por entidad | 3 | OPS-001 | Done | 2026-07-08T19:05Z | 2026-07-08T19:06Z | AC-02 | 4 base + 10 status + 2 aux; validate Passed |
| TASK-PB-P0-001-US-099-DB-002 | Modelos Platform/Shared (User, Location, ServiceCategory, EventType) | 4 | DB-001 | Done | 2026-07-08T19:05Z | 2026-07-08T19:06Z | AC-01,03,04,05,06,07,09 | EventType UUID PK + code @unique; soft delete en 3 |
| TASK-PB-P0-001-US-099-DB-003 | Modelos Vendor (VendorProfile, VendorService, Attachment) | 5 | DB-001, DB-002 | Done | 2026-07-08T19:05Z | 2026-07-08T19:06Z | AC-01,03,04,05,06,07,08 | Decimal(14,2) price_min/max; Attachment polimórfico |
| TASK-PB-P0-001-US-099-DB-004 | Modelos Event (Event, EventTask, Budget, BudgetItem) | 6 | DB-001, DB-002 | Done | 2026-07-08T19:05Z | 2026-07-08T19:06Z | AC-01,03,04,05,06,08 | Cascade exclusivo en BudgetItem.budgetId |
| TASK-PB-P0-001-US-099-DB-005 | Modelos Quote (QuoteRequest, Quote, BookingIntent) | 7 | DB-001..004 | Done | 2026-07-08T19:05Z | 2026-07-08T19:06Z | AC-01,03,04,05,06,08 | aiBriefMeta JsonB; amount Decimal(14,2) |
| TASK-PB-P0-001-US-099-DB-006 | Modelos transversales (Review, Notification) | 8 | DB-001,002,003,005 | Done | 2026-07-08T19:05Z | 2026-07-08T19:06Z | AC-01,03,04,05,06,07 | Review deletedAt; Notification.payload JsonB |
| TASK-PB-P0-001-US-099-DB-007 | Modelos Admin/AI (AdminAction, AIRecommendation, AIPromptVersion) | 9 | DB-001,002,004 | Done | 2026-07-08T19:05Z | 2026-07-08T19:06Z | AC-01,03,04,05,06,10 | @@unique([promptKey,version]); AIPromptVersion sin isSeed |
| TASK-PB-P0-001-US-099-DB-008 | Cross-cutting review + prisma validate final | 10 | DB-001..007 | Done | 2026-07-08T19:06Z | 2026-07-08T19:11Z | AC-01..AC-10 | 19 modelos, 7 soft delete, 1 Cascade; validate Passed |
| TASK-PB-P0-001-US-099-BE-001 | Generar Prisma Client + smoke type-level | 11 | DB-008 | Done | 2026-07-08T19:06Z | 2026-07-08T19:11Z | AC-11 | generate Passed; tsc --noEmit Passed |
| TASK-PB-P0-001-US-099-OPS-003 | Job CI prisma-validate | 12 | OPS-002 | Done | 2026-07-08T19:09Z | 2026-07-08T19:09Z | AC-01 (VR-01) | job `prisma-validate` en ci.yml |
| TASK-PB-P0-001-US-099-OPS-004 | Job CI prisma-generate | 13 | OPS-002 | Done | 2026-07-08T19:09Z | 2026-07-08T19:09Z | AC-11 (VR-02) | job `prisma-generate` en ci.yml |
| TASK-PB-P0-001-US-099-OPS-005 | Job CI tests estructurales | 14 | OPS-002, QA-001 | Done | 2026-07-08T19:09Z | 2026-07-08T19:09Z | AC-01..AC-10 | job `schema-structural-tests` (generate+typecheck+test) |
| TASK-PB-P0-001-US-099-SEC-001 | Secret scan defensivo sobre schema.prisma | 15 | OPS-001 | Done | 2026-07-08T19:07Z | 2026-07-08T19:07Z | SEC-01,02,03 | secret-scan.spec.ts (4 tests Passed) + job gitleaks |
| TASK-PB-P0-001-US-099-QA-001 | 19 modelos MVP presentes | 16 | DB-002..007 | Done | 2026-07-08T19:07Z | 2026-07-08T19:07Z | AC-01, NT-01 | QA-001 Passed |
| TASK-PB-P0-001-US-099-QA-002 | isSeed en modelos operativos | 17 | DB-002..007 | Done | 2026-07-08T19:07Z | 2026-07-08T19:07Z | AC-06 | QA-002 Passed (excluye AIPromptVersion) |
| TASK-PB-P0-001-US-099-QA-003 | deletedAt en 7 modelos soft delete | 18 | DB-002,003,006 | Done | 2026-07-08T19:07Z | 2026-07-08T19:07Z | AC-07 | QA-003 Passed |
| TASK-PB-P0-001-US-099-QA-004 | 4 enums base | 19 | DB-001 | Done | 2026-07-08T19:07Z | 2026-07-08T19:07Z | AC-02 | QA-004 Passed |
| TASK-PB-P0-001-US-099-QA-005 | 10 enums status + ausencia genérico | 20 | DB-001 | Done | 2026-07-08T19:07Z | 2026-07-08T19:07Z | AC-02 (VR-08, NT-06) | QA-005 Passed |
| TASK-PB-P0-001-US-099-QA-006 | EventType UUID PK + code @unique | 21 | DB-002 | Done | 2026-07-08T19:07Z | 2026-07-08T19:07Z | AC-09 (NT-07) | QA-006 Passed |
| TASK-PB-P0-001-US-099-QA-007 | AIPromptVersion declarado | 22 | DB-007 | Done | 2026-07-08T19:07Z | 2026-07-08T19:07Z | AC-10 (NT-08) | QA-007 Passed |
| TASK-PB-P0-001-US-099-QA-008 | @@map/@map + tipos PG + @relation | 23 | DB-002..007 | Done | 2026-07-08T19:07Z | 2026-07-08T19:07Z | AC-03,04,08 | QA-008 Passed (Cascade único verificado) |
| TASK-PB-P0-001-US-099-DOC-001 | Amendar Doc 18 §11/§12 (EventType PK) | 24 | DB-002 | Done | 2026-07-08T19:10Z | 2026-07-08T19:10Z | AC-09 (Doc Align) | Doc 18 §11 (línea 279), §12 (línea 311), §14.2 amendados |
| TASK-PB-P0-001-US-099-DOC-002 | Amendar Doc 18 §26 (soft delete uniforme) | 25 | DB-008 | Done | 2026-07-08T19:10Z | 2026-07-08T19:10Z | AC-07 (Doc Align) | Doc 18 §26 tabla + nota `deletedAt` canónico |
| TASK-PB-P0-001-US-099-DOC-003 | Amendar PB-P0-001 description | 26 | — | Done | 2026-07-08T19:10Z | 2026-07-08T19:10Z | Doc Align | Backlog línea 194: EventTask/Attachment/AIPromptVersion |
| TASK-PB-P0-001-US-099-DOC-004 | Alias US-DB-001 en EPIC Map | 27 | — | Done | 2026-07-08T19:10Z | 2026-07-08T19:10Z | Doc Align | EPIC Map línea 1255 anotado (ID oficial US-099) |

> IDs y títulos copiados **verbatim** del Tasks File; sin renumeración.

## 6. Emergent Tasks

Ninguna. Los subpasos descubiertos (`@types/node` para el smoke/tests; `EventTaskStatus`/`EventTaskOrigin` para tipar `EventTask`) fueron **detalles de implementación local** bajo BE-001 / DB-001 / DB-004, no expansión de scope.

## 7. Evidence by Task

### Andamiaje (OPS-001, OPS-002)
- Files created: `backend/package.json`, `backend/tsconfig.json`, `backend/.env.example`, `backend/.gitignore`, `backend/vitest.config.ts`, `backend/README.md`, `backend/package-lock.json`.
- Commands executed: `npm install` → exit 0 (53+1 packages); (auditoría reporta vulnerabilidades transitivas de dev toolchain — no bloqueante para US-099, seguimiento en DevOps general).
- DB validation: `npx prisma validate` → exit 0 → **Passed**.
- Security checks: `.env.example` con `DATABASE_URL` dummy; `.env` real ignorado por `.gitignore`; sin secretos en repo → **Passed**.
- Acceptance Criteria cubiertos: AC-01/AC-11 (precondición).
- Deviations: Ninguna material (ver W-01: andamiaje mínimo por ausencia de PB-P0-002).

### Schema declarativo (DB-001..DB-008)
- Files created: `backend/prisma/schema.prisma` (19 modelos, 16 enums).
- Files modified: `backend/prisma/schema.prisma` (reformateado por `prisma format`, idempotente).
- Migrations created: N/A (fuera de scope — US-100).
- Commands executed:
  - `npx prisma validate` → exit 0 → **Passed** ("The schema at prisma/schema.prisma is valid").
  - `npx prisma format` → exit 0 → **Passed** (idempotente).
- DB validation: `prisma validate` **Passed**; `prisma format` **Passed**.
- Acceptance Criteria cubiertos: AC-01..AC-10.
- Convenciones verificadas: `@@map` snake_case_plural (19/19); `@map` en camelCase divergente; `@db.Decimal(14,2)` (7 campos monetarios); `@db.Timestamptz(6)` (created/updated/deleted/date); `@db.JsonB` (5 campos); `@relation` explícito con `onDelete`; `Restrict` default + `Cascade` único (BudgetItem.budgetId); UUID PK universal; `isSeed` en 18 operativos (no AIPromptVersion); `deletedAt` en 7 modelos.
- Deviations: N-01..N-04 (ver §4, notas de alineación). Ninguna material.
- Technical debt: Ninguna. (Enforcement append-only de `ai_prompt_versions`, unique parciales, check constraints e índices funcionales delegados a US-101/US-102 por diseño.)

### Prisma Client + smoke (BE-001)
- Files created: `backend/src/infrastructure/prisma/client.ts`.
- Files modified: `backend/package.json` (agregado `@types/node`).
- Commands executed:
  - `npx prisma generate` → exit 0 → **Passed** ("Generated Prisma Client (v5.22.0)").
  - `npx tsc --noEmit` → exit 0 → **Passed**.
- Build/Typecheck: **Passed**. Import surface de los 19 modelos + enums disponible desde `@prisma/client`.
- Acceptance Criteria cubiertos: AC-11.
- Deviations: Ninguna. El smoke instancia `new PrismaClient()` sin `connect()` (type-level).

### CI (OPS-003, OPS-004, OPS-005) + Security (SEC-001)
- Files created: `.github/workflows/ci.yml`.
- Jobs: `prisma-validate` (VR-01), `prisma-generate` (VR-02), `schema-structural-tests` (generate+typecheck+test), `secret-scan-schema` (gitleaks).
- Commands executed (local): YAML sin tabs, 76 líneas, parseable.
- CI checks: **Not Run** (razón: no hay runner de GitHub Actions disponible en el entorno local; los jobs se validaron sintácticamente y ejecutan los mismos comandos ya verdes localmente). Se ejecutarán en el pipeline al abrir el PR.
- Security checks: `secret-scan.spec.ts` (4 tests) → **Passed**; scanner gitleaks configurado en CI.
- Acceptance Criteria cubiertos: AC-01/AC-11 (gates CI); SEC-01/02/03.

### Tests estructurales (QA-001..QA-008)
- Files created: `backend/tests/schema/helpers.ts`, `backend/tests/schema/schema-structure.spec.ts`, `backend/tests/schema/secret-scan.spec.ts`.
- Commands executed: `npx vitest run` → exit 0 → **Passed** (2 files, **25 tests**).
- Tests: **Passed** (25/25). Cobertura: 19 modelos, isSeed, deletedAt (7), 4 enums base, 10 status + ausencia genérico, EventType UUID PK+code, AIPromptVersion+relación, `@@map`/`@map`/Decimal/Timestamptz/JsonB/`@relation`, Cascade único, secret scan.
- Acceptance Criteria cubiertos: AC-01..AC-10 + NT-01..NT-08 (cobertura estructural).

### Documentación (DOC-001..DOC-004)
- Files modified: `docs/18-Database-Physical-Design.md` (§11, §12, §14.2, §26), `management/artifacts/4-Product-Backlog-Prioritized.md` (línea 194), `management/artifacts/1-EventFlow-Epic-Map.md` (línea 1255).
- Validación: revisión de contenido + verificación de rutas → **Passed**. Ediciones quirúrgicas, trazabilidad a ADR-DB-002/ADR-DB-004/US-099 preservada; sin reescritura de decisiones históricas.
- Acceptance Criteria cubiertos: Documentation Alignment Required (no bloqueante).

## 8. Blockers

Ninguno. Sin blockers durante la ejecución.

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D-01 | `Attachment.entityType/entityId` (Tasks File) | `ownerType/ownerId` → `owner_type/owner_id` | Doc 18 §19 (mayor precedencia, §4) es canónico | Naming físico alineado a Doc 18 | Naming DB | §10 Relations | No | Aceptada (nota N-01) |
| D-02 | `LanguageCode` con valores `es-LATAM` | `es_LATAM @map("es-LATAM")` | Prisma prohíbe `-` en identificadores enum | Ninguno (valor físico preservado) | Enum naming | §10 | No | Aceptada (nota N-02) |
| D-03 | Backend provisto por PB-P0-002 | Andamiaje mínimo creado en US-099 | PB-P0-002 no materializado; Tech Spec §18 lo admite en paralelo | Se materializa `backend/` base | Estructura | §5, §18 | No | Aceptada (warning W-01) |

Ninguna desviación material sin resolver.

## 10. Final Validation

- Task completion: 27/27 (0 In Progress, 0 Blocked, 0 Rework, 0 Skipped)
- Acceptance Criteria coverage: 11/11 (AC-01..AC-11)
- Lint: Not Run (razón: no hay script/config de ESLint en el repo; DEVELOPMENT_CONVENTIONS lo marca Target; no incluido en scope de US-099)
- Typecheck: **Passed** (`tsc --noEmit`, exit 0)
- Tests: **Passed** (Vitest 25/25)
- Build: Not Applicable (US-099 no produce build ejecutable; `prisma generate` cubre el artefacto Client → Passed)
- Migrations: Not Applicable (fuera de scope — US-100)
- Seed: Not Applicable (fuera de scope — EPIC-SEED-001; `isSeed` declarado como precondición)
- Authorization: Not Applicable (declaración estática; sin runtime)
- Security: **Passed** (secret scan 4/4; sin secretos; `.env` ignorado; `env("DATABASE_URL")` idiomático)
- Accessibility: Not Applicable (sin UI)
- i18n: Not Applicable (sin UI; `LanguageCode` declarado)
- Documentation: **Passed** (DOC-001..DOC-004 aplicados; alignment items de Tech Spec §16 cerrados)
- Unresolved debt: Ninguna. Enforcement avanzado (append-only, unique parciales, check constraints, índices funcionales/GIN) delegado por diseño a US-100/US-101/US-102.
- Final status: **Done**

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-08T19:03:52Z | Initialized | Execution record creado; git limpio en foundation/PB-P0-001 @ f4cc339 |
| 2026-07-08T19:04:00Z | Source Validation | validate-inputs.sh exit 0 (US-099 / P0 / PB-P0-001) |
| 2026-07-08T19:04:10Z | Readiness | READY_WITH_WARNINGS (W-01 PB-P0-002, W-02 repo Current) |
| 2026-07-08T19:04:20Z | Alignment | ALIGNED_WITH_NOTES (N-01..N-04) |
| 2026-07-08T19:05:00Z | OPS-001/002 | Andamiaje backend + scripts (Done) |
| 2026-07-08T19:06:00Z | DB-001..DB-008 | schema.prisma: 19 modelos + 16 enums; prisma validate Passed |
| 2026-07-08T19:11:00Z | BE-001 | prisma generate Passed; tsc --noEmit Passed |
| 2026-07-08T19:07:00Z | QA-001..008 / SEC-001 | Vitest 25/25 Passed |
| 2026-07-08T19:09:00Z | OPS-003/004/005 | ci.yml con 4 jobs (CI Not Run local, sintaxis validada) |
| 2026-07-08T19:10:00Z | DOC-001..004 | Doc 18 §11/§12/§14.2/§26, backlog, epic map amendados |
| 2026-07-08T19:11:30Z | Done | Validación agregada verde; User Story → Done |
