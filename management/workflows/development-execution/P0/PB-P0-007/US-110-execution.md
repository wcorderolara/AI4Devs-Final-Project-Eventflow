# Execution Record — PB-P0-007 / US-110: Rate limiting en auth y endpoints IA

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-110 |
| User Story Title | Rate limiting en auth y endpoints IA |
| Phase | P0 |
| Backlog Position | PB-P0-007 |
| User Story Path | management/user-stories/US-110-rate-limiting-auth-and-ai.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-007/US-110-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-007/US-110-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-P0-007 |
| Initial Commit Hash | b1f6b8cbdd74f87efc9c12cc44699d3b93fede26 |
| Started At | 2026-07-09T15:01:02Z |
| Last Updated At | 2026-07-09T15:14:00Z |
| Completed At | 2026-07-09T15:14:00Z |
| Claude Session ID | 7e3a6366-b628-4c2c-8eec-6232a628289b |
| Executor Type | Claude Code |

> Nota Git: `foundation/PB-P0-007` parte de `b1f6b8c` (= tip de `main` tras el merge de PB-P0-006).
> El trabajo de US-108/US-109 (cookies/captcha) está presente. Working tree limpio al iniciar.

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `validate-inputs.sh` EXIT=0
- [x] User Story ID coincide (US-110) · Phase P0 · Backlog PB-P0-007
- [x] Documentos legibles · IDs de tarea extraídos (PO-001 … DOC-002, 25 tareas)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Checks: US-110 `Approved`/`Ready: Yes`; AC-01..AC-08 testeables; Tech Spec `Ready for Task Breakdown`; 25 tareas `TASK-...`; deps PB-P0-002/004/006 (Done/merged); Decision Resolution y Refinement Review **existen** e incorporados (8 decisiones, sin blockers); backlog PB-P0-007 presente → Pass.
- Warnings:
  - **W1** — Repo backend-only: sin módulo `frontend/`. FE-001 (manejo de 429 en API client) no implementable como código; se difiere con justificación (impacto mínimo; el backend es source of truth y ya emite el envelope/headers).
- Blockers: Ninguno.
- Decision files: `decision-resolutions/US-110-decision-resolution.md` (incorporado). Refinement: `refinement-reviews/US-110-refinement-review.md`.

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: cobertura config/store/evaluator/policies/route-wiring/headers/observability/QA/docs. Sin scope no aprobado (sin Redis, sin DB counters, sin endpoints IA nuevos).
- Tasks vs AC: AC-01/02/03 → BE-004/006/QA; AC-04 → BE-005/007/AI-001/QA; AC-05 → BE-001/OPS/QA-001; AC-06 → BE-003/API-001/QA-003; AC-07 → OBS-001/SEC-003/QA-006; AC-08 → QA-*.
- Arquitectura: sin contradicción con ADR-SEC-004; store in-memory por proceso (MVP); backend source of truth; sin side effects tras 429.
- Notas de implementación (no bloqueantes):
  - **N1 (reuse de express-rate-limit)** — La Tech Spec §7 esboza un `RateLimiterPolicyEvaluator`/store bespoke. El repo ya implementa los limiters con **express-rate-limit** (US-091/094/097): store in-memory por proceso, ventanas, headers y keyGenerator. Se **reutiliza** esa base (cambio mínimo coherente) en vez de construir un store paralelo. Tests deterministas vía fake timers + `resetKey`/instancias frescas + overrides de config. No bloqueante.
  - **N2 (AI defaults)** — US-097 dejó el limiter IA en 30/min. US-110 (autoritativa) lo fija en **10/usuario/1h** (`AI_RATE_LIMIT_MAX=10`, `AI_RATE_LIMIT_WINDOW_MS=3600000`) con key `ai:user:{userId}`. Deviation D1.
  - **N3 (testabilidad)** — Los limiters usaban `skip: NODE_ENV==='test'` (no enforce en tests). Se cambia a `skip: () => !config.RATE_LIMIT_ENABLED` con `RATE_LIMIT_ENABLED=false` en el setup global de tests (preserva la suite existente) y opt-in `true` en los tests de US-110. Deviation D2.
  - **N4 (headers)** — Para AC-06 se emiten `X-RateLimit-Limit`/`X-RateLimit-Remaining` (legacy headers) + `Retry-After` explícito además de los `RateLimit-*` estándar.
  - **N5 (env)** — Sin `APP_ENV`; comportamiento por `NODE_ENV`. `TRUST_PROXY` (SEC-001) se documenta; Express `trust proxy` no se altera globalmente (pertenece a US-111 middleware chain) — la key por IP usa `req.ip` seguro.
- Ajustes requeridos: Ninguno bloqueante.

## 5. Task Inventory

| Task ID | Título | Depends On | Status | AC |
| ------- | ------ | ---------- | ------ | -- |
| TASK-PB-P0-007-US-110-PO-001 | Confirmar scope/endpoints/no-goals | — | Done | AC-01..04 |
| TASK-PB-P0-007-US-110-BE-001 | Config validada rate limiting (fail-fast) | PO-001 | Done | AC-05 |
| TASK-PB-P0-007-US-110-BE-002 | Store in-memory + clock inyectable | BE-001 | Done | AC-08 |
| TASK-PB-P0-007-US-110-BE-003 | Evaluator/middleware genérico + headers/envelope | BE-002 | Done | AC-06,07 |
| TASK-PB-P0-007-US-110-BE-004 | Policies auth (login/register/reset) | BE-003 | Done | AC-01,02,03 |
| TASK-PB-P0-007-US-110-BE-005 | Policy AI agregada por user | BE-003 | Done | AC-04 |
| TASK-PB-P0-007-US-110-BE-006 | Aplicar policies a rutas auth | BE-004 | Done | AC-01,02,03,06 |
| TASK-PB-P0-007-US-110-BE-007 | Aplicar policy AI a rutas POST IA | BE-005 | Done | AC-04,06 |
| TASK-PB-P0-007-US-110-API-001 | Documentar 429 + headers (OpenAPI) | BE-006,007 | Done | AC-06 |
| TASK-PB-P0-007-US-110-SEC-001 | Validar IP/proxy trust | BE-004,OPS-001 | Done | AC-01,02 |
| TASK-PB-P0-007-US-110-SEC-002 | Anti-enumeración en reset limit | BE-004,006 | Done | AC-03,07 |
| TASK-PB-P0-007-US-110-SEC-003 | Redacción de datos sensibles | BE-003,OBS-001 | Done | AC-07 |
| TASK-PB-P0-007-US-110-AI-001 | No-call/no-persistence IA rate limited | BE-007 | Done | AC-04 |
| TASK-PB-P0-007-US-110-FE-001 | Manejo de 429 en API client | API-001 | Skipped | AC-06 |
| TASK-PB-P0-007-US-110-OPS-001 | Env templates + overrides CI | BE-001 | Done | AC-05,08 |
| TASK-PB-P0-007-US-110-OBS-001 | Logs estructurados rate limit | BE-003 | Done | AC-07 |
| TASK-PB-P0-007-US-110-SEED-001 | Impacto demo sin seed | OPS-001,BE-007 | Done | AC-04,08 |
| TASK-PB-P0-007-US-110-QA-001 | Unit config/store/ventanas | BE-001,002 | Done | AC-05,08 |
| TASK-PB-P0-007-US-110-QA-002 | Unit policies auth/IA | BE-004,005 | Done | AC-01..04 |
| TASK-PB-P0-007-US-110-QA-003 | Integration/API auth 429 | BE-006,API-001 | Done | AC-01,02,03,06 |
| TASK-PB-P0-007-US-110-QA-004 | Integration/API AI 429 | BE-007,AI-001 | Done | AC-04,06 |
| TASK-PB-P0-007-US-110-QA-005 | Security tests authz/no side effects | SEC-001,002,AI-001 | Done | AC-03,04,07 |
| TASK-PB-P0-007-US-110-QA-006 | Redacción/logs/demo smoke | SEC-003,OBS-001,SEED-001 | Done | AC-07,08 |
| TASK-PB-P0-007-US-110-DOC-001 | Documentar config/comportamiento | OPS-001,API-001 | Done | AC-05,06,08 |
| TASK-PB-P0-007-US-110-DOC-002 | Notas alineación documental | DOC-001 | Done | AC-01..04 |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Status |
| -- | ------ | ----------- | ------ |
| — | (ninguna aún) | | |

> Resumen: **24 Done · 1 Skipped** (FE-001 — sin módulo frontend; Should, diferida con justificación) · 0 In Progress · 0 Blocked · 0 Rework.

## 7. Evidence by Task

### Config + store (BE-001, BE-002, OPS-001)
- Files modified: `src/config/env.ts` (8 vars rate-limit `.int().positive()` + `RATE_LIMIT_ENABLED`; AI default 10/1h), `backend/.env.example`, `tests/setup/env.setup.ts` (`RATE_LIMIT_ENABLED=false` global).
- Store = MemoryStore in-memory por proceso de `express-rate-limit` (N1). Reset determinista vía `resetKey` (QA-005).
- Commands: `npm run typecheck` → Passed; `npm run lint` → Passed.

### Middleware/policies + headers + log (BE-003..007, OBS-001, SEC-002, SEC-003)
- Files created: `src/shared/interface/http/rate-limit-response.ts` (handler 429 + headers `X-RateLimit-*`/`Retry-After` + log `security.rate_limit.exceeded` con `keyId` sha256 truncado).
- Files modified: `auth-rate-limits.ts` (config-driven; login/register key IP, reset key email normalizado; factories + singletons; `skip` por `RATE_LIMIT_ENABLED`), `ai-rate-limit.ts` (key `ai:user:{userId}`, 10/1h, cuota agregada).
- Rutas ya cableadas (BE-006 identity-access.routes.ts; BE-007 ai.routes.ts) — nombres de singleton preservados, sin cambios de wiring. AI limiter corre tras `sessionAuth`+`role` y antes del handler (no `LLMProvider`/`AIRecommendation` tras 429).

### API-001 (OpenAPI)
- `429 RateLimited` ya documentado en los 11 endpoints cubiertos (auth login/register/reset + 7 AI + vendor bio). `npm run openapi:check` → OK (sin drift). Headers documentados en README (DOC-001).

### SEC-001 (IP/proxy)
- Default seguro: sin `trust proxy` → `req.ip` = IP de socket; `X-Forwarded-For` arbitrario no se confía. Documentado (README). `trust proxy` explícito pertenece a US-111.

### AI-001 (no-call)
- QA-004 prueba que tras 429 el handler downstream (proxy de `LLMProvider`/`AIRecommendation`) no se ejecuta (`spy` no llamado).

### QA (tests)
- Files created: `tests/unit/us110-rate-limit-config.spec.ts` (33), `tests/api/us110-rate-limit.spec.ts` (6).
- Command: `vitest run` → **458 passed | 78 skipped | 2 todo** (sin fallos; 78 skip = DB-gated sin Postgres). US-110 nuevos: 39 Passed.

### FE-001 — Skipped
- Sin módulo `frontend/` en el repo. El backend ya emite `RATE_LIMIT_EXCEEDED` + `correlationId` + headers; el consumo en el API client se difiere a la historia frontend/auth. Should priority; no bloquea el DoD (todo backend).

## 8. Blockers

| Blocker ID | Tarea | Tipo | Descripción | Estado |
| ---------- | ----- | ---- | ----------- | ------ |
| — | | | (ninguno) | |

## 9. Deviations

| # | Planeado | Implementado | Razón | ADR | Resolución |
| - | -------- | ------------ | ----- | --- | ---------- |
| D1 | AI limiter 30/min (US-097) | 10/user/1h key `ai:user:{userId}` | US-110 autoritativa (ADR-SEC-004) | No | N2; DOC-001 |
| D2 | `skip: NODE_ENV==='test'` | `skip: () => !config.RATE_LIMIT_ENABLED` (false global en tests) | Testabilidad de 429 sin romper suite | No | N3 |

## 10. Final Validation

- Task completion: **24/25 Done**, 1 Skipped (FE-001 — Should, sin frontend).
- Acceptance Criteria coverage:
  - AC-01 (login 10/IP/10min) → Cubierto (BE-004/006; QA-003 verde).
  - AC-02 (register 5/IP/10min) → Cubierto (BE-004/006; QA-002 verde).
  - AC-03 (reset 3/email normalizado/1h, anti-enumeración) → Cubierto (BE-004/006, SEC-002; QA-002/006).
  - AC-04 (IA 10/user/1h agregado, sin provider) → Cubierto (BE-005/007, AI-001; QA-004).
  - AC-05 (config fail-fast) → Cubierto (BE-001; QA-001 33 tests).
  - AC-06 (429 envelope + `X-RateLimit-*`/`Retry-After`) → Cubierto backend (BE-003, API-001; QA-003). Consumo frontend (FE-001) diferido.
  - AC-07 (observabilidad segura + redacción) → Cubierto (OBS-001, SEC-003; QA-006 — `keyId` hasheado, sin email/IP crudo).
  - AC-08 (tests deterministas de límites/exclusiones) → Cubierto (QA-001..006; sin sleeps reales).
- Lint: Passed. Typecheck: Passed. OpenAPI: Passed (sin drift). Tests: **458 passed | 78 skipped | 2 todo**.
- Migrations / Seed: Not Applicable (rate limit stateless in-memory; sin cambios).
- Authorization: Passed (AI limiter tras auth/role; anónimo → 401 antes de la cuota por user).
- Security: Passed (key IP segura sin trust proxy; email normalizado; sin side effects tras 429; logs redactados + key hasheada; sin persistencia).
- Documentation: Passed (README §Rate limiting; DOC-001/DOC-002).
- Unresolved debt:
  - **DEBT-1** — FE-001 (Should): manejo de `429`/`Retry-After` en el API client frontend, diferido por ausencia de módulo frontend. Riesgo bajo: el backend es source of truth y ya emite el contrato.
- Final status: **Done**. Todos los DoD (backend) se cumplen; la única tarea Skipped (FE-001) es Should-priority con justificación aceptada (sin módulo frontend) y no bloquea ningún AC de backend.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-09T15:01:02Z | Initialized | Execution record creado |
| 2026-07-09T15:01:02Z | Readiness | READY_WITH_WARNINGS (W1: repo backend-only) |
| 2026-07-09T15:01:02Z | Alignment | ALIGNED_WITH_NOTES (N1 reuse express-rate-limit, N2 AI defaults, N3 skip, N4 headers, N5 proxy) |
| 2026-07-09T15:06:00Z | BE-001..007 | Config fail-fast + `RATE_LIMIT_ENABLED` + limiters config-driven + AI key + headers/log seguro |
| 2026-07-09T15:10:00Z | QA-001..006 | 39 tests US-110 (config, policies, 429/headers/no-side-effects, AI aggregate, redacción) |
| 2026-07-09T15:14:00Z | Finalized | Done — 24 Done, 1 Skipped (FE-001 sin frontend); suite 458 verde; lint/typecheck/openapi OK |
