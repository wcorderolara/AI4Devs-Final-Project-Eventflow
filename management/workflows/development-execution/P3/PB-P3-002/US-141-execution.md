# Execution Record — PB-P3-002 / US-141: Monitoring CloudWatch mínimo (logs, métricas y alarmas)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-141 |
| User Story Title | Monitoring CloudWatch mínimo (logs, métricas y alarmas) |
| Phase | P3 |
| Backlog Position | PB-P3-002 |
| User Story Path | management/user-stories/US-141-healthcheck-readiness-monitoring.md |
| Tech Spec Path | management/technical-specs/P3/PB-P3-002/US-141-technical-spec.md |
| Tasks Path | management/development-tasks/P3/PB-P3-002/US-141-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | repo state @ mvp/PB-P3-002 |
| Execution Record Status | Partially Completed |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | REQUIRES_TECH_SPEC_UPDATE |
| Branch | mvp/PB-P3-002 |
| Initial Commit Hash | ec35795b154657975078fa74478be1f1611d1fa3 |
| Started At | 2026-07-28T15:00:00Z |
| Last Updated At | 2026-07-28T15:28:00Z |
| Completed At | null |
| Claude Session ID | (no disponible) |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo)
- [x] User Story ID coincide en las 3 rutas: `US-141`
- [x] Phase coincide entre Tech Spec y Tasks: `P3`
- [x] Backlog Position coincide entre Tech Spec y Tasks: `PB-P3-002`
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: `TASK-PB-P3-002-US-141-OPS-001` … `TASK-PB-P3-002-US-141-DOC-002`, 20 tareas)

## 3. Readiness Gate

- Resultado: **READY_WITH_WARNINGS**
- Checks: US aprobada (Approved with Minor Notes); backlog mapping `Found` (PB-P3-002); Tech Spec `Ready for Task Breakdown`. Superficie de código base ya entregada (US-108/113/114/116/123): logger estructurado, redacción, correlationId, healthcheck, safe-logs de IA.
- Warnings:
  - **Historia de infraestructura**: la mayoría de las tareas (OPS/OBS/QA de CloudWatch) requieren una **cuenta AWS con el entorno desplegado** para aplicarse/verificarse en vivo; no son ejecutables desde el repo local. Se entregan como **config reproducible** (script + runbook) + `--check` fail-fast.
  - **Dependencia de log shipping no cableada en EC2** (ver BLK-001): en EC2 (ADR-DEVOPS-008) el envío de stdout→CloudWatch **no es automático** (a diferencia de App Runner); el `docker run` del backend no usa el driver `awslogs`, por lo que hoy **no hay Log Group** al cual adjuntar retención/metric-filters/alarmas. Ese wiring pertenece a US-136 (dependencia declarada de US-141), no a US-141.
- Blockers: BLK-001 (dependencia de log shipping EC2). No bloquea la entrega de config; bloquea la verificación runtime de AC-01..04.
- Decision files: `management/user-stories/decision-resolutions/US-141-decision-resolution.md` → No existe (no requerido).

## 4. Alignment Gate

- Resultado: **REQUIRES_TECH_SPEC_UPDATE**
- Tasks vs Tech Spec: alineadas en intención (logs + métricas + 2 alarmas), pero la Tech Spec asume **App Runner** (`AWS/AppRunner`, log groups de App Runner).
- **Conflicto Tech Spec ↔ ADR (precedencia §4)**: **ADR-DEVOPS-008 (Accepted)** despliega el backend en **EC2 (Docker + Caddy)** y **supersede ADR-DEVOPS-003 (App Runner)**. `ADR-DEVOPS-007 (Accepted)` mandata CloudWatch. La Tech Spec de US-141 se construyó sobre App Runner (superseded) → **debe actualizarse a EC2 + enfoque log-driven**. Ver Deviation D-01.
- Resolución adoptada (sin reabrir ADR): implementación **log-driven, independiente de plataforma** — métricas derivadas de los logs estructurados del backend (funciona en EC2 y en App Runner). No se usa el namespace `AWS/AppRunner`.
- Tasks vs Acceptance Criteria: AC-01 → OPS-001/OBS-001; AC-02 → BE-001/OBS-002/OBS-003; AC-03 → OPS-002/OPS-004/QA-003; AC-04/EC-01 → OPS-003/QA-004; EC-02 → OPS-002/QA-006; VR-01/02 → OPS-004; VR-03/SEC → BE-002/SEC-001/QA-005; SEC-01 → SEC-002/QA-007.

## 5. Task Inventory

| Task ID | Título (resumen) | Depends On | Status | Evidencia / Nota |
| ------- | ---------------- | ---------- | ------ | ---------------- |
| TASK-PB-P3-002-US-141-OPS-001 | Log Group + retención 14–30d | — | Blocked | Config en `provision-cloudwatch.sh` (put-retention-policy). Aplicación/verificación live requiere EC2 desplegado + log shipping (BLK-001) |
| TASK-PB-P3-002-US-141-OPS-002 | Alarma 5xx (umbral + periodos) | OBS-002 | Blocked | Alarma `eventflow-backend-5xx` sobre metric filter `{ $.res.status >= 500 }` (log-driven). Live: BLK-001 + entorno |
| TASK-PB-P3-002-US-141-OPS-003 | Alarma healthcheck/disponibilidad | OBS-002 | Blocked | Alarma `eventflow-backend-healthcheck-down` sobre `HealthReadyDown` (evento readiness `health.ready.dependency_down`, EC-01). Live: BLK-001 + entorno |
| TASK-PB-P3-002-US-141-OPS-004 | Fail-fast de config (setup/IaC) | OPS-001..003 | Done | Modo `--check` implementado (verifica 2 alarmas + retención, exit≠0 si falta). Sintaxis `bash -n` OK; reproducible (base de NT-01) |
| TASK-PB-P3-002-US-141-OBS-001 | Logs JSON + correlationId visibles | OPS-001, BE-002 | Blocked | Logs pino JSON con `correlationId` ya emitidos (US-113/114); visibilidad en CloudWatch requiere log shipping (BLK-001) |
| TASK-PB-P3-002-US-141-OBS-002 | Métricas básicas del servicio | OPS-001 | Blocked | Con enfoque log-driven la métrica de 5xx es `EventFlow/Backend Http5xx` (metric filter). Consultabilidad live: entorno |
| TASK-PB-P3-002-US-141-OBS-003 | Métricas operativas de IA (`EventFlow/AI`) | BE-001 | Blocked | Metric filters `AiTimeouts`/`AiErrors`/`AiFallbackToMock` (subcadena sobre eventos US-123). `AiInvocations` documentada como gap honesto. Live: entorno |
| TASK-PB-P3-002-US-141-BE-001 | Shipping de métricas de IA | — | Done | **Sin código nuevo** (no se añade SDK/dependencia): los eventos de IA ya se emiten de forma segura (US-123, verificado por `us123-ai-execution-safe-logs`). El shipping se hace por **metric filters** (config), en línea con Tech Spec §14 y la convención `bulk-confirm-telemetry` |
| TASK-PB-P3-002-US-141-BE-002 | Verificar logger/redacción/correlationId | — | Done | Redacción central (`redact`/`redactSecrets`/`redactPII`, US-108/113) + correlationId (US-114). Tests verdes: `us108-log-redaction` (7), `us113-pino-logger` |
| TASK-PB-P3-002-US-141-SEC-001 | Sin secretos/PII en logs/métricas | BE-002, OBS-003 | Done | Redacción verificada (tests); métricas solo contadores/dimensiones (nunca prompts/PII). Documentado en runbook §6 |
| TASK-PB-P3-002-US-141-SEC-002 | IAM mínimo + healthcheck público | — | Blocked | Permisos IAM mínimos documentados en runbook §1/§6; healthcheck público verificado (QA-007). Aplicación IAM live: entorno |
| TASK-PB-P3-002-US-141-QA-001 | TS-01 logs consultables | OBS-001 | Blocked | Requiere CloudWatch Logs Insights sobre entorno desplegado (procedimiento en runbook §5) |
| TASK-PB-P3-002-US-141-QA-002 | TS-02 métricas llegando | OBS-002/003 | Blocked | Requiere CloudWatch Metrics del entorno desplegado |
| TASK-PB-P3-002-US-141-QA-003 | TS-03 alarma 5xx a ALARM | OPS-002 | Blocked | Requiere inyección de 5xx en entorno de prueba |
| TASK-PB-P3-002-US-141-QA-004 | TS-04 alarma healthcheck a ALARM | OPS-003 | Blocked | Requiere readiness fallido sostenido en entorno de prueba |
| TASK-PB-P3-002-US-141-QA-005 | UT-01/UT-02/NT-02 | BE-001/002, SEC-001 | Done | Cubierto por tests existentes verdes: `us123-ai-execution-safe-logs` (UT-01, 3), `us108-log-redaction` (UT-02/NT-02, 7), `us122-payload-sanitizer` |
| TASK-PB-P3-002-US-141-QA-006 | NT-01/NT-03 (fail-fast / pico transitorio) | OPS-004/002 | Blocked | NT-01 (fail-fast) reproducible vía `--check` (Done a nivel script); NT-03 (pico transitorio) requiere entorno con la alarma calibrada |
| TASK-PB-P3-002-US-141-QA-007 | AUTH-TS-01 `/health` público | SEC-002 | Done | Verificado por `us116-platform-health` (21) + `health.spec` (3): `GET /health` 200 sin auth, payload liviano |
| TASK-PB-P3-002-US-141-DOC-001 | Naming `/healthz` `/readyz` → `/health` `/health/ready` | — | Done | Unificado en artefactos de backlog/épica (Epic Map, Coverage Matrix, Backlog Prioritized). Meta que documenta el rechazo (`NO /healthz/readyz`) preservada |
| TASK-PB-P3-002-US-141-DOC-002 | Nota de alarmas mínimas al MVP + namespaces/retención | OPS-002/003 | Done | `docs/runbooks/cloudwatch-monitoring.md` (retención, namespaces `EventFlow/Backend` `EventFlow/AI`, alarmas MVP; latencia/LLM = futuro) |

> IDs y títulos originales verbatim; nunca renumerados.

## 6. Emergent Tasks

Ninguna. El wiring del log shipping en EC2 se clasifica como **dependencia de US-136** (BLK-001), no como tarea emergente de US-141 (§14: cambio fuera del boundary de esta US).

## 7. Evidence by Task (cambios de esta sesión)

### Files created
- `infra/cloudwatch/provision-cloudwatch.sh` — provisión idempotente **log-driven** (retención + metric filters 5xx/healthcheck/IA + 2 alarmas) + modo `--check` fail-fast (OPS-001..004). `bash -n` OK; exec bit set (paridad con `infra/*/provision-*.sh`).
- `docs/runbooks/cloudwatch-monitoring.md` — runbook (prereq log shipping EC2, retención, metric filters, alarmas, IAM, hallazgo App Runner→EC2, alineaciones §16).

### Files modified (DOC-001)
- `management/artifacts/1-EventFlow-Epic-Map.md`, `management/artifacts/2-User-Stories-Coverage-Matrix.md`, `management/artifacts/4-Product-Backlog-Prioritized.md` — `/healthz` `/readyz` → `/health` `/health/ready` (4 ocurrencias en backlog + 1 epic + 1 coverage; meta line de rechazo preservada).

### Comandos ejecutados
- `bash -n infra/cloudwatch/provision-cloudwatch.sh` → exit 0 → **Sintaxis: Passed**
- `vitest run tests/unit/us108-log-redaction tests/unit/us123-ai-execution-safe-logs tests/unit/us116-platform-health tests/api/health` → **34 passed (4 files)** → **Tests (subset verificable): Passed**

### Validación agregada
- Sintaxis bash: **Passed**
- Tests de código (redacción, safe-logs IA, healthcheck público): **Passed** (34)
- Aplicación/verificación CloudWatch en vivo (logs, métricas, transición de alarmas): **Not Run** — requiere cuenta AWS + EC2 desplegado + log shipping (`awslogs`) habilitado.

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --- | ------ |
| BLK-001 | OPS-001..003, OBS-001..003, QA-001..004/006 | Dependency | En EC2 (ADR-DEVOPS-008) el envío de stdout→CloudWatch no es automático; el `docker run` del backend no usa `--log-driver=awslogs`, por lo que no hay Log Group. Wiring pertenece a US-136. Sin él, AC-01..04 no verificables. | 2026-07-28T15:20:00Z | Cablear `awslogs` en el `docker run` de US-136/EC2 (snippet en runbook §1) + desplegar | DevOps / US-136 | Open |

## 9. Deviations

| # | Planeado (Tech Spec) | Implementado | Razón | Impacto | ADR | Resolución |
| - | -------------------- | ------------ | ----- | ------- | --- | ---------- |
| D-01 | Monitoreo sobre **App Runner** (`AWS/AppRunner` metrics, log groups de App Runner) | Monitoreo **log-driven** independiente de plataforma (metric filters sobre logs estructurados), correcto para **EC2** | ADR-DEVOPS-008 (Accepted) supersede App Runner (ADR-DEVOPS-003); precedencia §4 (ADR > Tech Spec) | La Tech Spec de US-141 debe actualizarse a EC2/log-driven (REQUIRES_TECH_SPEC_UPDATE). No requiere ADR nuevo (ADR-DEVOPS-008 ya vigente) | ADR-DEVOPS-008 (vigente) | Adoptada; recomendado actualizar Tech Spec §5/§14 |
| D-02 | BE-001 "shipping de métricas de IA" (posible custom metrics SDK) | **Sin SDK ni dependencia**: metric filters sobre los eventos de log ya emitidos | Tech Spec §14 permite "metric filters sobre logs"; evita nueva dependencia y respeta la convención del repo (`bulk-confirm-telemetry`) | Ninguno negativo; `AiInvocations` sin evento dedicado se documenta como gap honesto | — | Adoptada |

## 10. Final Validation

- Task completion: 6 `Done`, 14 `Blocked` (por BLK-001 + entorno AWS)
- Acceptance Criteria coverage: código-base y config **entregados y (subset) verificados**; AC-01..04 en vivo **bloqueados** por dependencia de log shipping EC2 + entorno desplegado
- Sintaxis bash: **Passed**
- Tests: **Passed** (34, subset verificable local)
- Security: **Passed** (redacción verificada; healthcheck público; sin secretos/PII en métricas)
- CloudWatch live (logs/metrics/alarms): **Not Run** (BLK-001 + entorno)
- Documentation: **Passed** (runbook + DOC-001 naming)
- Unresolved debt / handoff: (1) cablear `awslogs` en el `docker run` de EC2 (US-136); (2) desplegar y ejecutar TS-01..TS-04 (runbook §5); (3) actualizar Tech Spec de US-141 a EC2/log-driven; (4) `AiInvocations` requiere log de éxito o proxy.
- Final status: **Partially Completed** — config reproducible (script + runbook) + subset de código verificado + alineaciones documentales entregados; verificación runtime de las alarmas/logs bloqueada por dependencia de log shipping EC2 (US-136) y entorno AWS desplegado.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-28T15:00:00Z | Initialized | Execution record creado |
| 2026-07-28T15:05:00Z | Readiness | READY_WITH_WARNINGS (infra story; deps mayormente entregadas) |
| 2026-07-28T15:12:00Z | Alignment | REQUIRES_TECH_SPEC_UPDATE — Tech Spec sobre App Runner (superseded por EC2 ADR-DEVOPS-008) |
| 2026-07-28T15:15:00Z | BLK-001 | Log shipping EC2→CloudWatch no cableado (`awslogs`); dependencia US-136 |
| 2026-07-28T15:20:00Z | OPS/DOC | `provision-cloudwatch.sh` (log-driven + `--check`) + runbook `cloudwatch-monitoring.md` |
| 2026-07-28T15:24:00Z | DOC-001 | Naming `/healthz` `/readyz` → `/health` `/health/ready` en backlog/épica |
| 2026-07-28T15:27:00Z | Validation | `bash -n` OK; 34 tests subset verdes; CloudWatch live Not Run |
