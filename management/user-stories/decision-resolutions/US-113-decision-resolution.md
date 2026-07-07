# PO/BA Decision Resolution — US-113

## Source User Story File
management/user-stories/US-113-structured-logger.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-113-refinement-review.md

## Decision Date
2026-07-07

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-113                                                                                                            |
| User Story file path                         | `management/user-stories/US-113-structured-logger.md`                                                             |
| Refinement review artifact path              | `management/user-stories/refinement-reviews/US-113-refinement-review.md`                                          |
| Existing decision resolution found           | No                                                                                                                |
| Backlog Item                                 | PB-P2-010 — Logger estructurado JSON (P2, Should Have, posición 1 de 1)                                          |
| Epic                                         | EPIC-OBS-001                                                                                                       |
| Estado antes de decisiones                   | Needs Refinement                                                                                                  |
| Cantidad de preguntas revisadas              | 6 (Q1–Q6)                                                                                                          |
| Decisiones PO/BA tomadas                     | 0 (todas las decisiones son Tech Recommendations sin input PO)                                                     |
| Decisiones técnicas recomendadas             | 6 (D1 Pino; D2 formato JSON base; D3 redacción secrets+PII; D4 AsyncLocalStorage; D5 stdout único; D6 LOG_LEVEL con fail-fast) |
| ¿Desbloquea aprobación?                      | Sí                                                                                                                 |
| User Story file updated                      | Yes                                                                                                                |
| Decision Resolution artifact created/updated | Yes                                                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-113-decision-resolution.md`                                      |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` (revalidación) y luego `eventflow-user-story-approval`.                     |

**Nota crítica**: Todas las decisiones son deterministas desde documentación aprobada (`docs/14`, `docs/22`, `docs/10`, `docs/19`). Se aplican como `Tech Recommendation` conforme al skill rule "cuando la documentación técnica del proyecto ya define la dirección, aplicar la decisión documentada y citarla como decisión del proyecto".

---

## 2. Decisiones Respondidas

## Decisión 1 — Librería logger: Pino (Q1)

### Respuesta PO/BA

`docs/14 §1659`: "**Pino** recomendado (alto rendimiento, JSON estructurado nativo)". `docs/14 §1538`: la estructura sugerida usa `pino-logger.ts`. `docs/14 §1886`: la checklist técnica dice "Logger estructurado (Pino)". No hay ninguna referencia a Winston en la documentación.

### Decisión formal

```text
US-113 implementa el logger con **Pino** (última versión estable compatible con Node.js LTS). Sin Winston. La instancia se centraliza en `src/infrastructure/logger/pino-logger.ts` (per docs/14 §1538) y se expone como singleton desde `src/shared/logger.ts`.
```

### Rationale

* `docs/14 §1659` es explícito y sin ambigüedad.
* Pino es idiomático para Node.js en producción por su rendimiento asíncrono.
* Consistente con `docs/14 §1886` checklist.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D1.                                                                          |
| Technical Notes      | Path canónico `src/infrastructure/logger/pino-logger.ts`.                            |
| Task Generation      | Task explícita para instalar `pino` como dependencia.                                |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional (documentación aprobada).

---

## Decisión 2 — Formato JSON base (Q2)

### Respuesta PO/BA

`docs/22 §ADR-API-004` (correlationId) + `docs/14 §logger` + `NFR-OBS-006` (stdout suficiente) definen el contorno. Los consumidores actuales requieren:

* US-034/068/069/070/072: `correlationId`, `timestamp`, campos de dominio (userId, eventId, etc.).
* US-114 (correlation): `correlationId` propagado.
* US-115 (métricas IA): `level='info'`, `context.metric` estructurado.
* SEC/audit: `service`, `env`, `version` para tracking multi-instancia.

### Decisión formal

```text
Formato JSON base con los siguientes campos por línea:

{
  "timestamp": "<ISO-8601 UTC>",         // ej. "2026-07-07T02:15:00.123Z"
  "level": "<trace|debug|info|warn|error|fatal>",
  "service": "backend-api",              // constante
  "env": "<NODE_ENV>",                   // development | test | production
  "version": "<SERVICE_VERSION>",        // leído de package.json al boot
  "correlationId": "<uuid-v4 | null>",   // extraído de AsyncLocalStorage (D4)
  "msg": "<string>",                     // mensaje humano-leíble
  "context": { ... }                     // objeto arbitrario del caller, redactado (D3)
}

Serialización estable: keys en el orden declarado; nested objects se serializan tal cual. Sin pretty printing en producción; permitido en dev vía `LOG_PRETTY=true`.
```

### Rationale

* Alineado con `docs/22 §ADR-API-004` (correlationId).
* `service='backend-api'` es constante en MVP single-service (docs/13 §Architecture).
* `version` habilita debugging multi-deployment.
* Estructura estable simplifica queries downstream (grep, jq, futuros ELK).

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D2.                                                                          |
| Acceptance Criteria  | AC-01 declara el shape exacto.                                                       |
| Test Scenarios       | TS-01 verifica campos base con matcher estable.                                       |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 3 — Política de redacción secrets + PII (Q3)

### Respuesta PO/BA

`docs/22 §1851`: "Centralización de redacción mediante `redactSecrets()` y `redactPII()` en el logger". `NFR-PRIV-004` (`docs/10 §233`): "excluir datos sensibles (tokens, contraseñas, payloads completos de IA con PII) de los logs". `SEC-POL-AI-008` (`docs/19 §670`): "sólo `AI_LOG_PAYLOADS=true` en dev habilita full payload". `BR-PRIVACY-008`: hashing seguro para contraseñas (contexto de por qué nunca deben aparecer en logs).

### Decisión formal

```text
Dos redactores centralizados aplicados recursivamente al `context` antes de serializar:

1) `redactSecrets(obj)`: reemplaza valores de campos cuyo nombre coincide (case-insensitive) con el set:
   [password, pwd, token, apiKey, api_key, secret, authorization, cookie, session, refresh_token, access_token, jwt, bearer]
   por la string `"[REDACTED]"`.

2) `redactPII(obj)`: reemplaza valores de campos cuyo nombre coincide (case-insensitive) con el set:
   [email, phone, phoneNumber, taxId, address, ip, ipAddress]
   por la string `"[REDACTED]"` cuando `NODE_ENV === 'production'`.
   En `NODE_ENV === 'development'` la redacción PII se puede desactivar con `LOG_INCLUDE_PII=true` para debug local.

3) Headers HTTP: al loguear req/res, los headers `Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Session-Token` se redactan siempre (independiente de env).

4) Nunca se loguea el `body` completo por default. El caller que quiera loguear body debe pasarlo explícitamente por `context.body` y pasa por ambos redactores.

5) La redacción es recursiva pero acotada a profundidad 5 para evitar loops infinitos.
```

### Rationale

* Alineado con `docs/22 §1851 §1887` (tests de secret redaction obligatorios).
* Alineado con `NFR-PRIV-004` y `SEC-POL-AI-008`.
* Nombres case-insensitive porque JS backends mezclan camelCase/snake_case.
* Sets extensibles vía config para futuros campos (Future).

### Impacto

| Sección              | Cambio                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D3.                                                                                |
| Acceptance Criteria  | AC-03 (secrets), AC-04 (PII), AC-07 (headers).                                             |
| Security             | SEC-01..SEC-03 declaran los sets exactos.                                                 |
| Test Scenarios       | TS-03, TS-04 con sets de test; REG-01 captura logs de US-034/068/069/070/072 sin PII.     |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional (respaldado por ADR-SEC-001).

---

## Decisión 4 — Integración correlationId via AsyncLocalStorage (Q4)

### Respuesta PO/BA

`docs/22 §2478` (ADR-API-004): "AsyncLocalStorage o `req.context.correlationId` propagado". `docs/22 §3256`: "Middleware de correlación emite `X-Correlation-Id` y lo propaga al logger".

AsyncLocalStorage es la opción idiomática Node.js 20+ y evita pasar `req` a cada llamada de logger.

### Decisión formal

```text
US-113 usa `AsyncLocalStorage` (Node.js `node:async_hooks`) como mecanismo de propagación de `correlationId`:

1) Se crea un `CorrelationContext` en `src/shared/context/correlation-id.ts`:
   ```ts
   import { AsyncLocalStorage } from 'node:async_hooks';
   export const correlationContext = new AsyncLocalStorage<{ correlationId: string }>();
   ```

2) El `request-logger.middleware.ts` de US-113 invoca `correlationContext.run({ correlationId }, next)` al inicio de cada request. El middleware asume que el `correlationId` fue calculado por un middleware upstream (US-114) que lee/genera el header `X-Correlation-Id` conforme ADR-API-004.

3) El logger extrae `correlationId` con `correlationContext.getStore()?.correlationId ?? null`. Fuera de request context (jobs, boot, tests), retorna `null` explícitamente.

4) US-113 provee HOOK: en el orden de middlewares definido por PB-P0-002, este logger va DESPUÉS de correlationId middleware (US-114) y ANTES de auth. Documentar orden explícito en el Technical Spec.

Handoff con US-114: US-114 es OWNER del `X-Correlation-Id` header y de la generación UUID v4 conforme ADR-API-004. US-113 solamente CONSUME el ID via AsyncLocalStorage. Si US-114 aún no está mergeada, US-113 se auto-inyecta un `correlationId=null` sin fallar.
```

### Rationale

* Alineado con `docs/22 §2478 §3256`.
* AsyncLocalStorage es la opción moderna Node.js sin requerir cambios de firma en cada helper.
* Desacopla US-113 (logger) de US-114 (correlation): coexistencia posible incluso si US-114 aún no está lista.
* `null` explícito para no-request context (fuera de HTTP flow).

### Impacto

| Sección              | Cambio                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D4.                                                                                |
| Acceptance Criteria  | AC-05 (propagación); AC-06 (null fuera de context).                                        |
| Technical Notes      | Backend declara `correlationContext` singleton en `src/shared/context/correlation-id.ts`.  |
| Task Generation      | Task explícita para middleware `request-logger.middleware.ts` que corre `correlationContext.run()`. |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional (respaldado por ADR-API-004).

---

## Decisión 5 — Sink stdout único (Q5)

### Respuesta PO/BA

`NFR-OBS-006` (`docs/10 §340`): "El sistema NO debe requerir observabilidad enterprise (distributed tracing, APM, ELK) en MVP. Logging estructurado a stdout es suficiente". `docs/21 §Deployment` (AWS) captura stdout de containers.

### Decisión formal

```text
El logger emite exclusivamente a `stdout` (proceso Node.js). Sin transports adicionales:
- Sin file transport (no `pino-roll`, no `fs.createWriteStream`).
- Sin transport de red (no `pino-elasticsearch`, no Loki, no Datadog).
- Sin fanout multi-sink.

En dev, el logger puede activar `pino-pretty` via `LOG_PRETTY=true` para lectura humana; en test/prod es siempre JSON crudo a stdout.

Los operadores capturan stdout via el proceso Docker/AWS ECS (fuera de scope de US-113).
```

### Rationale

* Alineado 1:1 con `NFR-OBS-006`.
* MVP-first: sin infra de observabilidad enterprise.
* Reversible: Future ADR puede promover transports adicionales sin cambiar la API del logger.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D5.                                                                          |
| Acceptance Criteria  | AC-06 declara stdout único.                                                          |
| Scope Guardrails     | `Explicitly Out of Scope`: APM, ELK, distributed tracing (NFR-OBS-006), file logs.    |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 6 — `LOG_LEVEL` configurable con fail-fast (Q6)

### Respuesta PO/BA

PB-P2-010 Acceptance Summary: "Nivel configurable por env". Pino soporta niveles `trace|debug|info|warn|error|fatal`. Fail-fast (VR-01 declarada en la US original) al boot es el patrón estándar.

### Decisión formal

```text
Env var `LOG_LEVEL`:
- Enum: `trace | debug | info | warn | error | fatal | silent` (Pino canónicos + silent para tests).
- Defaults por env:
  - `NODE_ENV=production` → `LOG_LEVEL=info`.
  - `NODE_ENV=development` → `LOG_LEVEL=debug`.
  - `NODE_ENV=test` → `LOG_LEVEL=warn`.
- Validación con Zod al boot en `src/config/env.ts`.
- Fail-fast al boot si `LOG_LEVEL` está seteado con valor inválido (mensaje: "Invalid LOG_LEVEL: expected one of trace|debug|info|warn|error|fatal|silent, got <value>").

Env var complementaria `LOG_PRETTY`:
- Bool: `true | false`. Default: `false` (JSON crudo).
- Cuando `NODE_ENV=production`, se ignora (siempre JSON crudo — fail-fast si `LOG_PRETTY=true` en prod).

Env var complementaria `LOG_INCLUDE_PII`:
- Bool: `true | false`. Default: `false`.
- Sólo permite `true` en `NODE_ENV=development`. Fail-fast si `LOG_INCLUDE_PII=true` en prod/test.

Env var complementaria `SERVICE_VERSION`:
- String. Default: leído de `package.json` al boot. Fail-fast si no está disponible ni en env ni en package.json.
```

### Rationale

* PB-P2-010 lo pide.
* Pino soporta los niveles nativamente.
* Defaults sensatos por entorno reducen configuración necesaria.
* Fail-fast previene deploys con logging silencioso o overly verbose por error.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D6.                                                                          |
| Acceptance Criteria  | AC-02 (LOG_LEVEL respetado); NT-01 (fail-fast si inválido).                          |
| Validation Rules     | VR-01, VR-02, VR-03 declaran las env vars y sus rangos.                              |
| Test Scenarios       | TS-02 (niveles), NT-01 (fail-fast).                                                  |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                                    | Decisión                                                                                                                    | Tipo                | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------- | -------------------- |
|  1 | Librería logger                          | Pino (docs/14 §1659). Sin Winston.                                                                                          | Tech Recommendation | Sí                     | No requiere          |
|  2 | Formato JSON base                        | `{timestamp, level, service, env, version, correlationId, msg, context}` con serialización estable a stdout.                | Tech Recommendation | Sí                     | No requiere          |
|  3 | Política redacción secrets + PII         | `redactSecrets()` (12 campos) + `redactPII()` (7 campos, prod only). Headers auth siempre redactados. `body` sólo explícito. | Tech Recommendation | Sí                     | No requiere          |
|  4 | Integración correlationId                | AsyncLocalStorage; consumo desde US-114; `null` fuera de request context.                                                   | Tech Recommendation | Sí                     | No requiere          |
|  5 | Sink stdout                              | Stdout único; sin APM/ELK/file (NFR-OBS-006).                                                                               | Tech Recommendation | Sí                     | No requiere          |
|  6 | LOG_LEVEL configurable + fail-fast       | Env var enum, defaults por env, fail-fast si inválido. `LOG_PRETTY` y `LOG_INCLUDE_PII` con guards contra prod.              | Tech Recommendation | Sí                     | No requiere          |

---

## 4. Cambios Aplicados a la User Story

Aplicados durante la reescritura del archivo. Ver `management/user-stories/US-113-structured-logger.md`.

Resumen: Reescritura mayor de la plantilla genérica a contenido específico:
- Metadata con Backlog Item + Approval Metadata.
- Statement específico del logger.
- Business Context con Assumptions concretas + Dependencies (PB-P0-002, handoffs con US-114/115/116).
- PO/BA Decisions Applied D1..D6.
- Traceability con IDs canónicos (`NFR-OBS-004/005/006, NFR-PRIV-004`, `ADR-SEC-001, ADR-API-004, ADR-DEVOPS-001`).
- Scope Guardrails ampliado (APM/ELK/file logs Out of Scope).
- AC-01..AC-08 específicos (shape JSON, LOG_LEVEL, secrets redaction, PII redaction, correlationId, stdout, headers auth, performance).
- EC-01..EC-04 (config inválida, no-request context, payload circular, error serialización).
- VR-01..VR-04 (env vars).
- SEC-01..SEC-03 (sets exactos).
- Technical Notes con paths canónicos.
- UX/UI y AI Behavior explícitamente "No aplica".
- Test Scenarios TS-01..TS-08 + NT-01 + REG-01 + Smoke.
- DoR/DoD específicos.
- Notes con handoffs.

---

## 5. Documentation Alignment Required

| Documento / Fuente     | Conflicto                                                          | Decisión vigente                                          | Acción recomendada                                          | ¿Bloquea aprobación? |
| ---------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------- | -------------------- |
| PB-P2-010 Traceability | Sin IDs explícitos.                                                | US-113 refinada declara IDs canónicos.                    | Ampliar Traceability del backlog item.                      | No                   |

**Nota**: No hay conflictos con `docs/14`, `docs/22`, `docs/10`, `docs/19`. US-113 sólo materializa lo que esos documentos ya declaran.

---

## 6. File Update Result

| Campo                                        | Valor                                                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                                                                                      |
| User Story file path                         | `management/user-stories/US-113-structured-logger.md`                                                                                                    |
| Decision Resolution artifact created/updated | Yes                                                                                                                                                      |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-113-decision-resolution.md`                                                                             |
| New User Story status                        | Ready for Approval                                                                                                                                       |
| Remaining blockers                           | No                                                                                                                                                       |
| Reason                                       | 6 Tech Recommendations formalizadas con respaldo documental (docs/14 §1659/§1538, docs/22 §1851/§2478/§3256, docs/10 §NFR-OBS-006/§NFR-PRIV-004, docs/19 §670). Sin decisiones PO reales. |

---

## 7. Estado recomendado

`Ready for Approval`

---

## 8. Próximo Paso Recomendado

```text
1. (Opcional) Run `eventflow-user-story-refinement` para revalidación.
2. Run `eventflow-user-story-approval`.
3. Run `eventflow-user-story-technical-spec`.
4. Run `eventflow-user-story-to-development-tasks`.
```

User Story file updated: Yes
Path: management/user-stories/US-113-structured-logger.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-113-decision-resolution.md
Next step: Run `eventflow-user-story-refinement` (revalidación) o `eventflow-user-story-approval`.
