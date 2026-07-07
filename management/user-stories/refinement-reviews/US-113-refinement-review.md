# User Story Refinement Review — US-113

## Source User Story File
management/user-stories/US-113-structured-logger.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-113-decision-resolution.md

## Review Date
2026-07-07 (revalidación: 2026-07-07)

## Revalidation Result (2026-07-07)

Tras la ejecución de `eventflow-po-ba-decision-resolver` (ver `management/user-stories/decision-resolutions/US-113-decision-resolution.md`) y la actualización en sitio de la User Story:

| Verificación                                                                                                                    | Resultado |
| ------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Q1 (Pino) resuelta: `docs/14 §1659` confirma Pino canónico.                                                                     | OK        |
| Q2 (formato JSON base) resuelta: `{timestamp, level, service, env, version, correlationId, msg, context}` con orden estable.    | OK        |
| Q3 (redacción secrets + PII) resuelta: `redactSecrets()` + `redactPII()` con sets exactos + guards de env.                       | OK        |
| Q4 (AsyncLocalStorage) resuelta: `docs/22 §2478` (ADR-API-004) confirma; coexistencia con US-114.                                | OK        |
| Q5 (stdout único) resuelta: `NFR-OBS-006` confirma; sin APM/ELK/file.                                                          | OK        |
| Q6 (LOG_LEVEL + fail-fast) resuelta: env vars con guards; `LOG_PRETTY`/`LOG_INCLUDE_PII` prohibidos en prod.                    | OK        |
| Traceability corregida: NFRs canónicos + ADRs correctos + Backlog Item declarado.                                              | OK        |
| Plantilla genérica reescrita completamente con contenido específico del logger.                                                  | OK        |
| AC reescritos (AC-01..AC-08), EC ampliados (EC-01..EC-05), VR/SEC/Test ampliados con foco en seguridad y regresión.            | OK        |
| Sin conflictos con `docs/14`, `docs/22`, `docs/10`, `docs/19`. Sólo materializa lo declarado.                                    | OK        |
| Sin scope creep (APM/ELK/tracing/file permanecen Out of Scope).                                                                 | OK        |

**Estado recomendado final**: `Ready for Approval`.
**Próximo paso**: `eventflow-user-story-approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| User Story ID                              | US-113                                                                                                  |
| File Path                                  | `management/user-stories/US-113-structured-logger.md`                                                   |
| Backlog Item                               | PB-P2-010 — Logger estructurado JSON (P2, Should Have, posición 1 de 1)                                 |
| Epic                                       | EPIC-OBS-001                                                                                            |
| Estado actual                              | Draft                                                                                                    |
| Estado recomendado                         | Needs Refinement                                                                                        |
| Nivel de riesgo                            | Bajo                                                                                                    |
| Calidad general                            | Baja (plantilla genérica)                                                                               |
| Requiere decisión PO                       | No                                                                                                       |
| Requiere decisión técnica                  | Sí (mayoritariamente)                                                                                   |
| Requiere decisión QA                       | No                                                                                                       |
| Requiere decisión Seguridad                | No                                                                                                       |
| Decision Resolution artifact found         | No                                                                                                      |
| User Story file updated                    | No                                                                                                      |
| Refinement review artifact created/updated | Yes                                                                                                      |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-113-refinement-review.md`                                |

---

## 2. Diagnóstico PO/BA

US-113 es una historia técnica de foundation dentro de EPIC-OBS-001 (Observability & Audit). Implementa el logger estructurado JSON que consumen todos los módulos de EventFlow. Es prerequisito operativo para:

* Log `[EMAIL]` de notificaciones simuladas (NFR-OBS-004, consumido por US-034, US-068, US-069, US-070, US-072).
* Log de cambios críticos (NFR-OBS-005, consumido por US-015, US-055, EmitT7NotificationsJob).
* `correlationId` end-to-end (ADR-API-004, US-114).
* Métricas IA JSON (US-115).
* Redacción de secrets/PII en producción (NFR-PRIV-004, ADR-SEC-001).

La documentación es rica y decidida en múltiples fuentes autoritativas:

* `docs/14 §1659`: "Pino recomendado (alto rendimiento, JSON estructurado nativo)".
* `docs/14 §1886`: checklist "Logger estructurado (Pino)".
* `docs/14 §1427/1537/1538/1544`: estructura `src/infrastructure/logger/pino-logger.ts` + `middleware/request-logger.middleware.ts`.
* `docs/22 §1851`: "Centralización de redacción mediante `redactSecrets()` y `redactPII()` en el logger".
* `docs/22 §1887`: "Secret redaction tests: capturan logs en escenarios sensibles y verifican que no contienen secretos".
* `docs/22 §2478`: "AsyncLocalStorage o `req.context.correlationId` propagado" (ADR-API-004).
* `docs/22 §3256`: "Middleware de correlación emite `X-Correlation-Id` y lo propaga al logger".
* `docs/10 §NFR-OBS-006`: "stdout suficiente; sin APM enterprise en MVP".
* `docs/10 §NFR-PRIV-004`: "excluir tokens/contraseñas/PII de logs".
* PB-P0-002: "middlewares ordenados (correlation, logging, ...)" — dependency confirmada.

Sin embargo, el archivo llega con cuatro bloques de problemas:

1. **Plantilla genérica.** Metadata, statement, AC, EC, VR, Notes son genéricos con placeholders ("Capacidad operativa", "cumple FR/NFR y pasa pruebas", "N/A (técnica)", "IA si aplica"). No refleja la especificidad del logger.

2. **Traceability abstracta.** Declara `NFR-SEC-*, NFR-OBS-*, NFR-PERF-*` sin IDs concretos. Los canónicos aplicables son `NFR-OBS-004, NFR-OBS-005, NFR-OBS-006, NFR-PRIV-004`. ADRs correctos: `ADR-SEC-001, ADR-API-004, ADR-DEVOPS-001`. Backlog Item no declarado.

3. **Decisiones técnicas abiertas pero deterministas.** Pino vs Winston (docs/14 recomienda Pino), niveles configurables por env, sink stdout (NFR-OBS-006), redacción con `redactSecrets()` + `redactPII()` (docs/22), integración con correlation middleware (ADR-API-004), path canónico (`src/infrastructure/logger/pino-logger.ts` per docs/14 §1538). Ninguna requiere PO input; todas resueltas desde docs.

4. **AC no ejecutable.** "Capacidad operativa" y "Validación end-to-end" son placeholders. Faltan AC específicos para: (a) formato JSON con campos base; (b) niveles configurables por env; (c) redacción de secrets; (d) redacción de PII; (e) integración con correlationId; (f) sink stdout; (g) tests de secret redaction.

Adicionalmente, la sección `AI Behavior` y `UX/UI Notes` incluyen texto boilerplate "si aplica" que no aporta valor y confunde el alcance. Deben marcarse claramente como "No aplica" para historia técnica sin UI y sin IA.

Sin resolver Q1–Q6 (todas bloqueantes pero resueltas por docs), no pueden reescribirse los AC/Technical Notes de forma consistente con `docs/14`, `docs/22` y `docs/19`.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                                                              | Impacto                                                                                                                    | Recomendación                                                                                                                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Alta      | Plantilla genérica no refleja el alcance real de la historia.                                                                                                                                                                                          | AC no testeables; contrato ambiguo con consumidores (US-034, US-068..US-072, US-114, US-115).                              | Reescribir Metadata, statement, AC-01..AC-08, EC, VR con contenido específico del logger Pino.                                                                                                                                             |
| Alta      | Traceability abstracta (`NFR-SEC-*`, `NFR-OBS-*`, `NFR-PERF-*`).                                                                                                                                                                                       | Rompe trazabilidad académica.                                                                                              | Reemplazar por IDs canónicos: `NFR-OBS-004, NFR-OBS-005, NFR-OBS-006, NFR-PRIV-004`. ADRs: `ADR-SEC-001, ADR-API-004, ADR-DEVOPS-001`. Backlog Item: PB-P2-010.                                                                             |
| Alta      | Elección Pino vs Winston abierta. `docs/14 §1659` recomienda Pino explícitamente.                                                                                                                                                                       | Sin decisión, dos implementaciones incompatibles pueden convivir.                                                          | Resolver Q1 (Tech). Recomendación: Pino (per `docs/14 §1659`).                                                                                                                                                                              |
| Alta      | Formato JSON base sin definir. Campos esperados: `timestamp, level, service, env, version, correlationId, msg, context`.                                                                                                                              | Consumidores (US-034 `[EMAIL]`, US-114 correlationId, US-115 métricas IA) tendrán contratos distintos.                     | Resolver Q2 (Tech). Especificar campos base + serialización estable.                                                                                                                                                                        |
| Alta      | Política de redacción abierta. `docs/22 §1851` cita `redactSecrets()` + `redactPII()`.                                                                                                                                                                | Sin política, riesgo de fuga de secrets/PII en logs (BR-PRIVACY-008, NFR-PRIV-004).                                          | Resolver Q3 (Tech). Definir set exacto de campos redactados: `password, token, apiKey, secret, authorization, cookie, session, refresh_token` (secrets) + `email, phone, taxId, address` (PII). Formato de redacción: `[REDACTED]`.        |
| Alta      | Integración con correlationId (ADR-API-004) no declarada. `docs/22 §2478` recomienda AsyncLocalStorage.                                                                                                                                               | correlationId no propagado; observabilidad rota (rompe US-114).                                                             | Resolver Q4 (Tech). Recomendación: AsyncLocalStorage (Node.js `async_hooks`) inyectado por el `request-logger.middleware.ts`.                                                                                                              |
| Media     | Sink no declarado. `NFR-OBS-006` es explícito: "stdout suficiente".                                                                                                                                                                                    | Sin decisión, podría escribirse a archivo con problemas de disco/permisos.                                                 | Resolver Q5 (Tech). Recomendación: stdout único; sin file transport; sin APM (per NFR-OBS-006).                                                                                                                                            |
| Media     | Niveles configurables por env. PB-P2-010 Acceptance Summary dice "Nivel configurable por env".                                                                                                                                                          | Sin decisión, default puede ser demasiado verboso o silencioso.                                                            | Resolver Q6 (Tech). Recomendación: `LOG_LEVEL` env var; default `info` en prod, `debug` en dev, `warn` en test. Fail-fast si valor inválido.                                                                                                |
| Media     | Boilerplate `AI Behavior` y `UX/UI Notes` con "si aplica" en historia sin IA ni UI.                                                                                                                                                                    | Confunde alcance real.                                                                                                     | Marcar explícitamente como "No aplica — historia técnica de foundation" en ambas secciones.                                                                                                                                                 |
| Media     | Dependencies "Dependencias del epic" vacío. PB-P2-010 depende de PB-P0-002 (`Related US-089, US-090, US-091`).                                                                                                                                          | Ambigüedad sobre precondiciones.                                                                                            | Declarar `PB-P0-002` como dependencia + notar handoffs con US-114 (correlation), US-115 (métricas IA), US-116 (healthcheck).                                                                                                                |
| Media     | Tests de secret redaction no declarados. `docs/22 §1887` los exige.                                                                                                                                                                                    | Riesgo de regresión de seguridad.                                                                                          | Añadir tests explícitos: (a) invocar logger con payload con `password` → verificar `[REDACTED]`; (b) idem con email; (c) idem con Authorization header.                                                                                    |
| Baja      | Backlog Item no declarado en Metadata.                                                                                                                                                                                                                  | Pérdida de trazabilidad.                                                                                                    | Agregar `Backlog Item: PB-P2-010`.                                                                                                                                                                                                          |
| Baja      | Priority "Should Have" alineado con PB pero `Notes` menciona "Confirmar con Tech Lead" — debe formalizarse como Tech Recommendation.                                                                                                                    | Ambigüedad menor.                                                                                                          | Marcar Q1–Q6 como Tech Recommendation en el Decision Resolution.                                                                                                                                                                            |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                              |
| ------------------------------------ | --------- | ----------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | —                                                                       |
| No introduce contratos firmados      | Pass      | —                                                                       |
| No introduce WhatsApp/chat/push      | Pass      | —                                                                       |
| Respeta human-in-the-loop IA         | N/A       | No invoca IA.                                                            |
| Respeta backend como source of truth | Pass      | Logger backend-only; frontend no aplica.                                 |
| Respeta seed/demo si aplica          | N/A       | Sin seed.                                                                |
| No introduce RAG/vector DB           | Pass      | —                                                                       |
| No introduce multi-tenant enterprise | Pass      | —                                                                       |
| No introduce P4/Future scope         | Pass      | Sin APM enterprise (NFR-OBS-006).                                        |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                     | Problema detectado                                                                                     | Acción recomendada                                                                                                                                                                                                                                                                                                                                     |
| ----- | --------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail / Not Testable | "Capacidad operativa" es placeholder.                                                                   | Reescribir tras Q1..Q2. Ejemplo: "Dado el backend inicializado (PB-P0-002), cuando cualquier módulo invoca `logger.info({ ... })`, entonces emite a stdout una línea JSON con campos base `{timestamp, level, service, env, version, correlationId, msg, context}` (Q2)." |
| AC-02 | Needs Detail / Not Testable | "Validación end-to-end" es placeholder.                                                                | Reescribir tras Q3. Ejemplo: "Dado un log con payload `{ password: 'abc', token: 'xyz', email: 'a@b.c' }`, cuando el logger serializa, entonces los campos sensibles se emiten como `[REDACTED]` sin exponer el valor original." |

AC faltantes:
- AC para configuración por env (`LOG_LEVEL`) con validación fail-fast (Q6).
- AC para integración con correlationId via AsyncLocalStorage (Q4).
- AC para stdout único (Q5).
- AC para performance/impact mínimo (NFR-PERF-*).
- AC para no exponer PII de emails/phones (Q3).
- AC para redacción de headers Authorization/Cookie.

---

## 6. Gaps Detectados

### Producto / Negocio
- Sin decisiones PO reales; historia técnica de foundation. La documentación provee todas las respuestas.

### Backend / API
- Implementar `pino-logger.ts` en `src/infrastructure/logger/` (per docs/14 §1538).
- Implementar `request-logger.middleware.ts` (per docs/14 §1544).
- Implementar `redactSecrets()` + `redactPII()` centralizados (per docs/22 §1851).
- Configurar `LOG_LEVEL` env var con validación Zod al boot.
- Integrar AsyncLocalStorage para correlationId (per docs/22 §2478).
- Registrar el logger como singleton exportable desde `shared/logger`.

### Frontend / UX
- No aplica.

### Base de Datos
- No aplica.

### Seguridad / Autorización
- Redacción de secrets es mandatoria (BR-PRIVACY-008, NFR-PRIV-004, ADR-SEC-001).
- Redacción de PII (email, phone) en producción.
- Test de regresión que capture logs y valide ausencia de patrones sensibles.

### IA / PromptOps
- No aplica directamente. Handoff con US-115 (métricas IA JSON): el logger provee la base; US-115 define el schema de las métricas.

### QA / Testing
- UT: redacción de campos sensibles.
- UT: propagación correlationId via AsyncLocalStorage.
- UT: niveles configurables (LOG_LEVEL).
- IT: request pasa por el middleware y emite log con correlationId.
- Regression: captura de logs prod-like y verificación de ausencia de patrones sensibles (`docs/22 §1887`).
- Smoke test: contenedor arranca con `LOG_LEVEL=info` y emite al menos un log JSON válido.

### Seed / Demo
- No aplica.

### Documentación / Trazabilidad
- Ampliar Traceability con IDs canónicos.
- Backlog Item declarado.
- Related Documents ya listado correcto (docs 12/13/17/19/20/21/22); agregar docs/14 y docs/10.

---

## 7. Preguntas Pendientes

Todas las preguntas son **Tech Recommendations** resolubles desde documentación aprobada, sin decisión PO.

| Tipo         | Pregunta                                                                                                                                                                                                                                                                                                                                                                                    | Bloquea aprobación | Responsable        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------ |
| Tech         | Q1. Librería logger: Pino o Winston. Recomendación: **Pino** (docs/14 §1659 "recomendado, alto rendimiento, JSON estructurado nativo"; docs/14 §1538 usa `pino-logger.ts`).                                                                                                                                                                                                                    | Sí                 | Tech Lead          |
| Tech         | Q2. Formato JSON base. Recomendación: `{timestamp, level, service, env, version, correlationId, msg, context}`. `service='backend-api'`, `env=NODE_ENV`, `version=package.json`. `timestamp` en ISO-8601 UTC.                                                                                                                                                                                    | Sí                 | Tech Lead          |
| Tech         | Q3. Política de redacción. Recomendación: `redactSecrets()` con set `[password, token, apiKey, secret, authorization, cookie, session, refresh_token]` + `redactPII()` con set `[email, phone, taxId, address, ip]` en prod. Formato: reemplazar por `[REDACTED]`. Aplicado recursivamente al `context`.                                                                                        | Sí                 | Tech Lead          |
| Tech         | Q4. Integración con correlationId. Recomendación: **AsyncLocalStorage** (`async_hooks`) inyectado por el `request-logger.middleware.ts` per ADR-API-004 (`docs/22 §2478`). Fuera de request context, `correlationId` es `null`.                                                                                                                                                                | Sí                 | Tech Lead          |
| Tech         | Q5. Sink de salida. Recomendación: **stdout único** (NFR-OBS-006). Sin file transport, sin APM/ELK.                                                                                                                                                                                                                                                                                            | Sí                 | Tech Lead          |
| Tech         | Q6. Niveles configurables. Recomendación: env var `LOG_LEVEL ∈ {trace, debug, info, warn, error, fatal}` (niveles Pino). Default `info` en prod, `debug` en dev, `warn` en test. Fail-fast si valor inválido (VR-01).                                                                                                                                                                          | Sí                 | Tech Lead          |

---

## 8. Documentation Alignment Required

| Documento / Fuente                    | Conflicto detectado                                                                     | Decisión vigente                                                                                | Acción recomendada                                                                                | ¿Bloquea aprobación? |
| ------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------- |
| PB-P2-010 Traceability                | Sin IDs explícitos.                                                                     | US-113 refinada declara `NFR-OBS-004/005/006, NFR-PRIV-004`, ADRs canónicos.                    | Ampliar Traceability del backlog item.                                                            | No                   |
| `docs/14 §logger`                     | Ya recomienda Pino (§1659); ya lista `pino-logger.ts` y `request-logger.middleware.ts`. | Ratificar por US-113.                                                                            | Sin cambios; US-113 implementa lo declarado.                                                     | No                   |
| `docs/22 §1851 §1887 §2478 §3256`     | Ya especifica redacción centralizada y AsyncLocalStorage.                              | Ratificar por US-113.                                                                            | Sin cambios; US-113 implementa lo declarado.                                                     | No                   |
| `docs/10 §NFR-OBS-006 §NFR-PRIV-004`   | Ya declara stdout + exclusión de PII.                                                  | Ratificar por US-113.                                                                            | Sin cambios; US-113 cumple.                                                                       | No                   |

**Conclusión**: no hay conflictos documentales. US-113 sólo materializa decisiones ya escritas en `docs/14`, `docs/22`, `docs/10`, `docs/19`. Ningún Documentation Alignment bloqueante.

---

## 9. File Update Result

| Campo                                      | Valor                                                                                                                                                                                                                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                                                                                                                                                                                                |
| User Story file path                       | `management/user-stories/US-113-structured-logger.md`                                                                                                                                                                                                             |
| User Story ID verified                     | Yes                                                                                                                                                                                                                                                                |
| Decision Resolution artifact found         | No                                                                                                                                                                                                                                                                |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-113-decision-resolution.md`                                                                                                                                                                                     |
| Refinement review artifact created/updated | Yes                                                                                                                                                                                                                                                                |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-113-refinement-review.md`                                                                                                                                                                                          |
| Final recommended status                   | Needs Refinement                                                                                                                                                                                                                                                  |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                                                                                                                                                                                               |
| Reason                                     | Aunque no requiere decisiones PO reales, la historia debe pasar por el resolver para (a) materializar Q1–Q6 como Tech Recommendations basadas en docs aprobados; (b) reescribir la plantilla genérica con contenido específico; (c) declarar Backlog Item + Traceability canónicos. |

---

## 10. Cambios Aplicados o Recomendados

(No aplicados; prescriptivos para tras la resolución.)

### Metadata
- `Backlog Item: PB-P2-010 (posición 1 de 1)`.
- `Feature`: "Logger estructurado JSON con Pino, redacción de secrets/PII y correlationId end-to-end".
- `Status → Ready for Approval` tras aplicar todos los cambios.

### Business Context
- `Context Summary` ampliado: "Implementar el logger estructurado JSON que consumen todos los módulos backend. Base de observabilidad para NFR-OBS-004 (email log), NFR-OBS-005 (cambios críticos), correlationId (ADR-API-004), y redacción centralizada de secrets/PII (docs/22 §1851)."
- `Assumptions`: "Backend bootstrap (PB-P0-002) provee el orden de middlewares. `NODE_ENV`, `LOG_LEVEL` y `SERVICE_VERSION` disponibles como env vars."
- `Dependencies`: **PB-P0-002** (upstream); handoffs downstream con US-114 (correlation), US-115 (métricas IA), US-116 (healthcheck).

### PO/BA Decisions Applied
- Sección nueva con D1..D6 (todas Tech Recommendations).

### Traceability
- FRD → — (historia técnica, sin FR funcional directo).
- UC → — (transversal).
- BR → `BR-PRIVACY-008` (hashing seguro; contexto de por qué redactar contraseñas en logs), `BR-PRIVACY-011` (soft-delete; contexto de retención).
- Permission → Sistema (interno).
- Data Entity → No aplica.
- API Endpoint → No aplica (biblioteca compartida).
- NFR → `NFR-OBS-004, NFR-OBS-005, NFR-OBS-006, NFR-PRIV-004`.
- Related ADR → `ADR-SEC-001, ADR-API-004, ADR-DEVOPS-001`.
- Related Documents → `/docs/10 §NFR-OBS-004..006 §NFR-PRIV-004`, `/docs/12`, `/docs/13`, `/docs/14 §logger §23.x §1659 §1886`, `/docs/17`, `/docs/19 §670 §1297`, `/docs/20`, `/docs/21`, `/docs/22 §ADR-SEC-001 §ADR-API-004 §ADR-DEVOPS-001 §1851 §1887 §2478 §3256`.
- Backlog Item.

### Scope Guardrails
- Out of Scope explícito: APM/ELK/distributed tracing (NFR-OBS-006), archivos de log en disco (stdout único), Winston (Pino canonical), enriquecimiento con datos de negocio en el logger core (los consumidores enriquecen).

### Acceptance Criteria
- AC-01 formato JSON base (Q2).
- AC-02 niveles configurables + fail-fast (Q6).
- AC-03 redacción de secrets (Q3).
- AC-04 redacción de PII (Q3).
- AC-05 integración correlationId (Q4).
- AC-06 stdout único (Q5).
- AC-07 headers `Authorization`/`Cookie` redactados (Q3).
- AC-08 impacto de performance mínimo (Pino async).

### Edge Cases
- EC-01 configuración `LOG_LEVEL` inválida → fail-fast al boot.
- EC-02 fuera de request context → `correlationId=null`.
- EC-03 payload circular/muy grande → truncar y loggear warning.
- EC-04 error en la serialización → fallback a `msg` simple.

### Validation Rules
- VR-01 `LOG_LEVEL` válido al boot; fail-fast si no.
- VR-02 `SERVICE_VERSION` presente al boot; leer de `package.json`.

### Authorization & Security Rules
- SEC-01 nunca loggear valores en set `redactSecrets`.
- SEC-02 nunca loggear valores en set `redactPII` en prod (permitido en dev con flag `LOG_INCLUDE_PII=true`).
- SEC-03 secrets del sistema (env vars con `SECRET`, `TOKEN`, `KEY`, `PASSWORD`) se redactan por default.

### Technical Notes (Backend)
- Path: `src/infrastructure/logger/pino-logger.ts` (docs/14 §1538).
- Path: `src/infrastructure/middleware/request-logger.middleware.ts` (docs/14 §1544).
- Path: `src/shared/logger.ts` (singleton export).
- Path: `src/shared/context/correlation-id.ts` (AsyncLocalStorage helper).
- Redactores: `src/infrastructure/logger/redactors.ts` con `redactSecrets` + `redactPII`.
- Config: `src/config/env.ts` valida `LOG_LEVEL` con Zod.

### UX / UI Notes
- Reemplazar por "No aplica — historia técnica de foundation; sin componentes frontend".

### AI Behavior
- Reemplazar por "No aplica — historia técnica; sin invocación IA".

### Test Scenarios
- TS-01 emisión JSON con campos base.
- TS-02 `LOG_LEVEL` respetado.
- TS-03 redacción secrets (contraseña, token, apiKey, authorization).
- TS-04 redacción PII (email, phone).
- TS-05 correlationId propagado desde middleware.
- TS-06 fuera de request context → `correlationId=null`.
- TS-07 payload con circular → sin crash.
- TS-08 emisión a stdout confirmada.
- REG-01 captura de logs con payloads reales de US-034 (email simulado), US-070 (booking notif) → sin PII/secrets.
- NT-01 `LOG_LEVEL` inválido → fail-fast al boot.
- Smoke: contenedor emite al menos un log JSON válido al arranque.

### Definition of Ready / Done
- DoR: Tech Lead validó (Q1–Q6).
- DoD: logger publicado como singleton, consumido por health check bootstrap, tests verdes, smoke docker verde, redacción regresión verde.

### Notes
- Handoff explícito con US-114 (correlation middleware provee el ID que este logger consume via AsyncLocalStorage), US-115 (métricas IA JSON usan el logger), US-116 (healthcheck usa el logger).
- Priority "Should Have" alineada con PB-P2-010 MoSCoW.
- Sin decisiones PO reales; todas Tech Recommendations resueltas por docs.

---

## 11. Recomendación Final

`Needs Refinement`

Las 6 preguntas son deterministas desde `docs/14 §logger`, `docs/22 §ADR-SEC-001/§ADR-API-004`, `docs/10 §NFR-OBS-006/§NFR-PRIV-004`, y `docs/19 §670 §1297`. No hay decisiones PO reales; todas Tech Recommendations. La US requiere reescritura mayor de plantilla genérica a contenido específico.

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver` para materializar Q1–Q6 como decisiones formalizadas y reescribir la US.

---

User Story file updated: No
Path: management/user-stories/US-113-structured-logger.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-113-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
