# User Story Refinement Review — US-114

## Source User Story File
management/user-stories/US-114-correlation-id-propagation.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-114-decision-resolution.md

## Review Date
2026-07-07 (revalidación: 2026-07-07)

## Revalidation Result (2026-07-07)

Tras la ejecución de `eventflow-po-ba-decision-resolver`:

| Verificación                                                                                                                                             | Resultado |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Q1 (UUID v4) resuelta: `crypto.randomUUID()` nativo per ADR-API-004.                                                                                     | OK        |
| Q2 (header `X-Correlation-Id`) resuelta: wire canonical con case-insensitive matching.                                                                   | OK        |
| Q3 (read-or-generate + 400 si inválido) resuelta: fail-fast con envelope de error server-generated.                                                       | OK        |
| Q4 (envelope + header echo) resuelta: `meta.correlationId` success, `error.correlationId` error, invariante header==body.                                | OK        |
| Q5 (integración US-113) resuelta: reuso 1:1 del singleton `correlationContext`; orden US-114 → US-113.                                                    | OK        |
| Q6 (frontend fetch interceptor) resuelta: `apps/web/lib/api/client.ts` con `crypto.randomUUID()` por request.                                             | OK        |
| Q7 (helper para jobs) resuelta: `generateCorrelationId(prefix?)` colocado con singleton de US-113.                                                        | OK        |
| Traceability corregida: `NFR-OBS-006`, ADRs canónicos (`ADR-API-004` primario, `ADR-SEC-001`, `ADR-DEVOPS-001`), Backlog Item declarado.                    | OK        |
| Plantilla genérica reescrita con contenido específico del correlation ID.                                                                                | OK        |
| AC reescritos (AC-01..AC-08), EC ampliados (EC-01..EC-05), VR/SEC/Test ampliados con foco en fail-fast e invariante header==body.                          | OK        |
| Sin conflictos con `docs/22 §ADR-API-004`, `docs/16 §envelope`, `docs/18 §ai_rec`, US-113 Approved.                                                        | OK        |
| Sin scope creep (OpenTelemetry, session-scoped, WebSocket permanecen Out of Scope).                                                                       | OK        |

**Estado recomendado final**: `Ready for Approval`.
**Próximo paso**: `eventflow-user-story-approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| User Story ID                              | US-114                                                                                                  |
| File Path                                  | `management/user-stories/US-114-correlation-id-propagation.md`                                          |
| Backlog Item                               | PB-P2-011 — Correlation IDs end-to-end (P2, Should Have, posición 1 de 1)                               |
| Epic                                       | EPIC-OBS-001                                                                                            |
| Estado actual                              | Draft                                                                                                    |
| Estado recomendado                         | Needs Refinement                                                                                        |
| Nivel de riesgo                            | Bajo                                                                                                    |
| Calidad general                            | Baja (plantilla genérica)                                                                               |
| Requiere decisión PO                       | No                                                                                                       |
| Requiere decisión técnica                  | Sí (todas Tech Recommendations)                                                                          |
| Requiere decisión QA                       | No                                                                                                       |
| Requiere decisión Seguridad                | No                                                                                                       |
| Decision Resolution artifact found         | No                                                                                                      |
| User Story file updated                    | No                                                                                                      |
| Refinement review artifact created/updated | Yes                                                                                                      |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-114-refinement-review.md`                                |

---

## 2. Diagnóstico PO/BA

US-114 es el gemelo de US-113 (Approved) dentro de EPIC-OBS-001. Mientras que US-113 provee el logger + `correlationContext` (AsyncLocalStorage), **US-114 es la OWNER del `X-Correlation-Id` middleware** que lee/genera el UUID v4 y lo puebla en el store. Además, US-114 propaga el ID a: (a) response header, (b) `meta.correlationId` en success responses, (c) `error.correlationId` en error responses, y (d) `ai_recommendations.correlation_id` (indirectamente vía consumidores).

La documentación es rica y decidida:

* `docs/22 §ADR-API-004`: "Cada request entrante recibe (o genera) un `X-Correlation-Id` (UUID v4). El ID se propaga a logs, respuestas (`meta.correlationId`, `error.correlationId`) y a `ai_recommendations`". Implementación: "Middleware al inicio del pipeline. AsyncLocalStorage o `req.context.correlationId` propagado".
* `docs/16 §426`: "Toda respuesta incluye `meta.correlationId` y `meta.timestamp` (ISO 8601 UTC)".
* `docs/16 §652/§653`: response envelope + error envelope llevan `meta.correlationId`.
* `docs/18 §110/§869/§1110`: `ai_recommendations` YA tiene columna `correlation_id` con índice `idx_ai_rec_correlation_id`. No requiere migración.
* PB-P2-011 Acceptance Summary: "Header presente en respuestas. Aparece en logs de todas las capas. Frontend lo propaga en `fetch`".

Handoffs claros:

* **Upstream**: PB-P2-010 (US-113 Approved) provee el `correlationContext` y el logger que consume el ID.
* **Downstream**: US-115 (métricas IA) escribe `correlation_id` en `ai_recommendations`; US-116 (healthcheck) usa el logger que hereda el ID.
* **Consumidores backend**: todos los use cases y jobs; US-034 D5 ya declara `correlationId=job-emit-t7-<timestamp>` para operar fuera de HTTP context.
* **Consumidores frontend**: cada llamada `fetch/ky` debe adjuntar el header. `docs/15 §Frontend Architecture` puede tener sugerencias adicionales (verificar).

Sin embargo, el archivo llega con los mismos cuatro bloques de problemas identificados en US-113:

1. **Plantilla genérica.** Metadata, statement, AC, EC, VR, Notes son placeholders ("Capacidad operativa", "cumple FR/NFR").
2. **Traceability abstracta.** Declara `NFR-SEC-*, NFR-OBS-*, NFR-PERF-*` sin IDs. Canónicos: `NFR-OBS-006`, plus `ADR-API-004, ADR-SEC-001, ADR-DEVOPS-001`. Backlog Item no declarado.
3. **Decisiones técnicas abiertas pero deterministas.** UUID v4 (ADR-API-004), header `X-Correlation-Id`, propagación read-or-generate, response envelope (`meta.correlationId` / `error.correlationId` per docs/16 §426), frontend fetch interceptor.
4. **AC no ejecutable.** Placeholders. Faltan AC para: (a) generación UUID v4; (b) read-through desde header entrante; (c) response header echo; (d) success envelope; (e) error envelope; (f) integración con AsyncLocalStorage de US-113; (g) frontend fetch propagation.

Adicionalmente, la sección `AI Behavior` y `UX/UI Notes` incluyen boilerplate "si aplica" que confunde el alcance real. Deben marcarse como "No aplica — historia técnica; sin UI directa aunque toca el fetch client".

Sin resolver Q1–Q7 (todas Tech Recommendations resolubles desde docs), no pueden reescribirse los AC/Technical Notes de forma consistente con ADR-API-004, docs/16 §envelope, y US-113 Approved.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                                                             | Impacto                                                                                                                    | Recomendación                                                                                                                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Plantilla genérica no refleja el alcance real.                                                                                                                                                                                                        | AC no testeables; contrato ambiguo con US-113 (approved) y con consumidores (US-034, US-068..072, US-115, US-116).           | Reescribir Metadata, statement, AC-01..AC-08, EC, VR con contenido específico de correlation ID.                                                                                                                                                          |
| Alta      | Traceability abstracta (`NFR-SEC-*`, `NFR-OBS-*`).                                                                                                                                                                                                    | Rompe trazabilidad académica.                                                                                              | Reemplazar por IDs canónicos: NFR = `NFR-OBS-006`; ADRs = `ADR-API-004` (primario), `ADR-SEC-001`, `ADR-DEVOPS-001`. Backlog Item: PB-P2-011.                                                                                                              |
| Alta      | Versión UUID no declarada. `ADR-API-004` es explícito: UUID v4.                                                                                                                                                                                        | Sin decisión, colisiones posibles con v1/v7.                                                                               | Resolver Q1 (Tech). Recomendación: **UUID v4** (ADR-API-004 explícito). Usar `crypto.randomUUID()` (Node 20+ nativo).                                                                                                                                       |
| Alta      | Nombre canónico del header no declarado. `ADR-API-004` dice `X-Correlation-Id`.                                                                                                                                                                        | Sin decisión, distintos módulos usan distintos casings.                                                                    | Resolver Q2 (Tech). Header canónico: **`X-Correlation-Id`** (case-insensitive per HTTP RFC 7230). Wire canonical: `X-Correlation-Id`.                                                                                                                        |
| Alta      | Estrategia de generación/propagación. `ADR-API-004`: "recibe (o genera)".                                                                                                                                                                             | Sin decisión, riesgo de sobreescribir IDs upstream.                                                                        | Resolver Q3 (Tech). Recomendación: si header entrante presente Y válido (UUID v4) → REUSAR; sino → GENERAR nuevo UUID v4. Header inválido = fail-fast → 400 `INVALID_CORRELATION_ID`.                                                                     |
| Alta      | Propagación en response envelope. `docs/16 §426`: "Toda respuesta incluye `meta.correlationId`".                                                                                                                                                       | Sin implementación, ADR-API-004 no cumplido.                                                                              | Resolver Q4 (Tech). Backend agrega en `meta.correlationId` (success) + `error.correlationId` (error). Response header `X-Correlation-Id` echoed en TODAS las responses. Response envelope canonical de `docs/16`.                                          |
| Alta      | Integración con US-113 (approved). US-113 D4 declara `correlationContext = new AsyncLocalStorage<...>()`.                                                                                                                                             | Sin integración explícita, ambos middleware corren descoordinados.                                                          | Resolver Q5 (Tech). US-114 middleware corre `correlationContext.run({ correlationId }, next)` para propagar a US-113 logger. Orden middlewares: US-114 → US-113 (request-logger) → auth → ...                                                                |
| Alta      | Frontend fetch propagation. PB-P2-011 dice "Frontend lo propaga en `fetch`". `docs/15 §Frontend Architecture` no lo declara explícitamente.                                                                                                            | Sin decisión, cada llamada frontend queda sin correlationId.                                                                | Resolver Q6 (Tech). Recomendación: fetch interceptor global (`apps/web/lib/api/client.ts`) que genera `X-Correlation-Id` = `crypto.randomUUID()` por request y adjunta al header outbound. Persistir en memoria por session opcional (Future).             |
| Media     | AC-01 no ejecutable.                                                                                                                                                                                                                                    | QA no puede asertar.                                                                                                        | Reescribir con AC-01..AC-08 específicos (UUID v4, header canonical, read-or-generate, echo en response, meta.correlationId, error.correlationId, AsyncLocalStorage integration, fetch client interceptor).                                                 |
| Media     | Ausencia de política ante header entrante inválido. Retornar 400 o generar nuevo silenciosamente.                                                                                                                                                     | Comportamiento no determinístico.                                                                                          | Resolver Q3 (Tech). Recomendación: 400 `INVALID_CORRELATION_ID` con mensaje descriptivo. Alternativa: silent generate + log warn — MENOS defensive.                                                                                                        |
| Media     | Boilerplate `AI Behavior` y `UX/UI Notes`.                                                                                                                                                                                                             | Confunde alcance.                                                                                                          | Marcar explícitamente como "No aplica — historia técnica; el fetch client se toca sin cambios UX visibles".                                                                                                                                                 |
| Media     | Dependencies vacía. PB-P2-011 depende de PB-P2-010 (US-113 Approved).                                                                                                                                                                                    | Ambigüedad.                                                                                                                | Declarar `PB-P2-010 / US-113` como dependencia hard; notar handoffs downstream con US-034 (job correlationId), US-115 (ai_recommendations.correlation_id), US-116 (healthcheck).                                                                            |
| Media     | Test de trazabilidad cross-capa no declarado. `ADR-API-004`: "Tests verifican presencia del header y meta en cada response".                                                                                                                           | Riesgo de regresión en trazabilidad.                                                                                        | Añadir tests: (a) request sin header → response tiene UUID v4 en header + meta; (b) request con header válido → response echoes mismo ID; (c) request con header inválido → 400.                                                                          |
| Baja      | Backlog Item no declarado.                                                                                                                                                                                                                              | Pérdida de trazabilidad.                                                                                                    | Agregar `Backlog Item: PB-P2-011`.                                                                                                                                                                                                                          |
| Baja      | Priority "Should Have" alineado con PB.                                                                                                                                                                                                                | —                                                                                                                          | Ratificar.                                                                                                                                                                                                                                                 |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                              |
| ------------------------------------ | --------- | ----------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | —                                                                       |
| No introduce contratos firmados      | Pass      | —                                                                       |
| No introduce WhatsApp/chat/push      | Pass      | —                                                                       |
| Respeta human-in-the-loop IA         | N/A       | No invoca IA.                                                            |
| Respeta backend como source of truth | Pass      | Middleware backend genera/valida el ID.                                  |
| Respeta seed/demo si aplica          | N/A       | Sin seed.                                                                |
| No introduce RAG/vector DB           | Pass      | —                                                                       |
| No introduce multi-tenant enterprise | Pass      | —                                                                       |
| No introduce P4/Future scope         | Pass      | Sin OpenTelemetry/distributed tracing (rechazado explícitamente por ADR-API-004). |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                     | Problema detectado                                                        | Acción recomendada                                                                                                                                                                                                                                                                                                                                                     |
| ----- | --------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail / Not Testable | "Capacidad operativa" es placeholder.                                     | Reescribir tras Q1..Q5. Ejemplo: "Dado un request HTTP entrante SIN header `X-Correlation-Id`, cuando el middleware corre, entonces genera un UUID v4 nuevo, lo setea en `correlationContext` (US-113), lo agrega como response header `X-Correlation-Id`, y lo incluye en `meta.correlationId` del envelope de éxito."                                              |
| AC-02 | Needs Detail / Not Testable | "Validación end-to-end" es placeholder.                                   | Reescribir tras Q3, Q4. Ejemplo: "Dado un request con header entrante `X-Correlation-Id: 123e4567-e89b-12d3-a456-426614174000` válido, cuando el middleware corre, entonces REUSA el mismo ID en el store, en el response header, y en el envelope (`meta.correlationId` o `error.correlationId` según status)."                                                        |

AC faltantes:
- AC para header entrante inválido → 400.
- AC para error envelope con `error.correlationId`.
- AC para AsyncLocalStorage disponible dentro del handler.
- AC para frontend fetch interceptor generando ID por request outbound.
- AC para propagación en jobs fuera de HTTP context (job seteando su propio ID como US-034 D5).
- AC para consistencia entre response header y body `meta.correlationId`.

---

## 6. Gaps Detectados

### Producto / Negocio
- Sin decisiones PO reales; historia técnica de foundation. Documentación provee todas las respuestas.

### Backend / API
- Implementar `correlation-id.middleware.ts` en `src/infrastructure/middleware/`.
- Validar header entrante con Zod (UUID v4).
- Integrar con `correlationContext.run(...)` de US-113.
- Setear response header echo.
- Coordinar con response envelope: los controllers ya emiten `meta.correlationId` (via helper `respond.success` / `respond.error`); asegurar que el helper lea del contexto.
- Ratificar el helper de envelope de `docs/16 §426` (por confirmar dónde vive el helper: `src/shared/http/response.ts` o similar).

### Frontend / UX
- Crear fetch interceptor global.
- Generar `X-Correlation-Id` = `crypto.randomUUID()` por outbound request.
- Persistir el ID recibido en response (opcional para debug).

### Base de Datos
- No aplica: `ai_recommendations.correlation_id` ya existe (docs/18 §110/§869); US-115 lo escribe.

### Seguridad / Autorización
- Header `X-Correlation-Id` NO es secret; no requiere redacción.
- La validación UUID v4 previene injection (`ADR-SEC-001`): fuerza formato conocido.

### QA / Testing
- UT: middleware genera UUID v4 si no viene header.
- UT: middleware reutiliza header entrante válido.
- UT: middleware rechaza header inválido con 400.
- IT: response header + `meta.correlationId` coinciden; error envelope `error.correlationId` coincide.
- IT: dentro del handler, `correlationContext.getStore()?.correlationId` retorna el mismo ID.
- IT (frontend con MSW): fetch interceptor adjunta header; MSW verifica presencia y formato.
- E2E opcional: verificar cross-capa desde frontend fetch → backend log → response header.
- Contract test con MSW.

### Seed / Demo
- No aplica.

### Documentación / Trazabilidad
- Ampliar Traceability con IDs canónicos.
- Backlog Item declarado.

---

## 7. Preguntas Pendientes

Todas Tech Recommendations resolubles desde documentación aprobada.

| Tipo         | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                              | Bloquea aprobación | Responsable        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------ |
| Tech         | Q1. Versión UUID. Recomendación: **UUID v4** (ADR-API-004 explícito, docs/22 §2456). Node 20+ nativo con `crypto.randomUUID()`.                                                                                                                                                                                                                                                                                                        | Sí                 | Tech Lead          |
| Tech         | Q2. Nombre canónico del header. Recomendación: **`X-Correlation-Id`** (ADR-API-004 explícito, docs/22 §2456). Case-insensitive per RFC 7230; wire canonical `X-Correlation-Id`.                                                                                                                                                                                                                                                       | Sí                 | Tech Lead          |
| Tech         | Q3. Estrategia read-or-generate + política ante header inválido. Recomendación: si header presente Y matchea UUID v4 → REUSAR; ausente → GENERAR nuevo UUID v4; presente pero inválido → **400 `INVALID_CORRELATION_ID`** con mensaje "X-Correlation-Id must be UUID v4 format". Alternativa (silent generate) descartada por menor observabilidad.                                                                                     | Sí                 | Tech Lead          |
| Tech         | Q4. Response envelope. Recomendación (per `docs/16 §426/§652/§653`): (a) response header `X-Correlation-Id` echoed en TODAS las responses (2xx, 4xx, 5xx); (b) success envelope tiene `meta.correlationId`; (c) error envelope tiene `error.correlationId`. Coordinar con el helper de envelope existente (`respond.success` / `respond.error`).                                                                                        | Sí                 | Tech Lead          |
| Tech         | Q5. Integración con US-113 (Approved). Recomendación: el middleware US-114 corre `correlationContext.run({ correlationId }, next)` (US-113 D4). Registro en `app.ts`: **primero US-114 middleware**, luego US-113 `request-logger.middleware.ts`, luego auth/role/ownership/validation/rate-limit. US-113 lo declara explícitamente en su spec §7.                                                                                        | Sí                 | Tech Lead          |
| Tech + PO    | Q6. Frontend fetch propagation. PB-P2-011: "Frontend lo propaga en `fetch`". Recomendación: interceptor global en `apps/web/lib/api/client.ts` (o equivalente) que genera `X-Correlation-Id` = `crypto.randomUUID()` (browser API) por outbound request. Sin persistencia cross-request en MVP (cada fetch nuevo genera nuevo ID); persistencia por sesión = Future.                                                                     | Sí                 | Tech Lead + PO     |
| Tech         | Q7 (opcional). Jobs fuera de HTTP context. Recomendación: cada job genera su propio `correlationId = 'job-<name>-<uuid v4>'` (patrón US-034 D5). US-114 provee helper `generateCorrelationId(prefix?)` en `src/shared/context/correlation-id.ts` (junto al AsyncLocalStorage) para uso desde jobs sin depender del middleware HTTP.                                                                                                    | Parcial            | Tech Lead          |

---

## 8. Documentation Alignment Required

| Documento / Fuente     | Conflicto detectado                                | Decisión vigente                                       | Acción recomendada                                          | ¿Bloquea aprobación? |
| ---------------------- | -------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------- | -------------------- |
| PB-P2-011 Traceability | Sin IDs explícitos.                                | US-114 refinada declara `NFR-OBS-006`, ADRs canónicos. | Ampliar Traceability del backlog item.                      | No                   |
| `docs/16 §426/§652/§653` | Ya declara `meta.correlationId` obligatorio.        | Ratificar por US-114.                                   | Sin cambios; US-114 implementa lo declarado.                 | No                   |
| `docs/22 §ADR-API-004`  | Ya especifica UUID v4, header, propagación, ALS.   | Ratificar por US-114.                                   | Sin cambios; US-114 implementa lo declarado.                 | No                   |
| `docs/15 §Frontend`    | Confirmar que menciona fetch interceptor o similar. | Pendiente verificación.                                 | Si docs/15 no lo declara, US-114 lo introduce; Documentation Alignment. | No                   |
| `docs/18 §110 §869`    | Ya declara `ai_recommendations.correlation_id`.    | Ratificar; sin migración.                              | Sin cambios.                                                | No                   |

**Conclusión**: mismo patrón que US-113 — no hay conflictos documentales. US-114 sólo materializa lo escrito en `docs/22 §ADR-API-004`, `docs/16 §envelope`, `docs/18 §ai_rec`.

---

## 9. File Update Result

| Campo                                      | Valor                                                                                                                                                                                                                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                                                                                                                                                                                                            |
| User Story file path                       | `management/user-stories/US-114-correlation-id-propagation.md`                                                                                                                                                                                                                |
| User Story ID verified                     | Yes                                                                                                                                                                                                                                                                            |
| Decision Resolution artifact found         | No                                                                                                                                                                                                                                                                            |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-114-decision-resolution.md`                                                                                                                                                                                                 |
| Refinement review artifact created/updated | Yes                                                                                                                                                                                                                                                                            |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-114-refinement-review.md`                                                                                                                                                                                                     |
| Final recommended status                   | Needs Refinement                                                                                                                                                                                                                                                              |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                                                                                                                                                                                                           |
| Reason                                     | Aunque no requiere decisiones PO reales, la historia debe pasar por el resolver para (a) materializar Q1–Q7 como Tech Recommendations basadas en docs aprobados; (b) reescribir la plantilla genérica con contenido específico; (c) declarar Backlog Item + Traceability canónicos + Dependencies con US-113 aprobada. |

---

## 10. Cambios Aplicados o Recomendados

(No aplicados; prescriptivos para tras la resolución.)

### Metadata
- `Backlog Item: PB-P2-011 (posición 1 de 1)`.
- `Feature`: "Correlation ID por request (X-Correlation-Id) end-to-end: middleware, envelope, logger integration y fetch client".
- `Status → Ready for Approval` tras aplicar todos los cambios.

### Business Context
- `Context Summary` ampliado: "Middleware que lee/genera `X-Correlation-Id` (UUID v4) por request, lo propaga via AsyncLocalStorage (US-113 D4), lo agrega al response header + envelope (`meta.correlationId` per docs/16 §426), y provee interceptor frontend para outbound fetch."
- `Assumptions`: "US-113 (Approved) provee `correlationContext` y logger que consume el ID. `docs/16 §envelope` ya define `meta.correlationId`. Node 20+ para `crypto.randomUUID()`."
- `Dependencies`: **PB-P2-010 / US-113** (upstream Approved); handoffs downstream con US-034 (job pattern), US-115 (métricas IA + correlation), US-116 (healthcheck).

### PO/BA Decisions Applied
- Sección nueva con D1..D7 (todas Tech Recommendations).

### Traceability
- FRD → — (foundation).
- UC → — (transversal).
- BR → — (foundation).
- Permission → Sistema.
- Data Entity → No aplica directamente (`ai_recommendations.correlation_id` existente en docs/18; US-114 no lo escribe).
- API Endpoint → No aplica directamente (middleware afecta a TODOS los endpoints via envelope + header echo).
- NFR → `NFR-OBS-006`.
- Related ADR → `ADR-API-004` (primario), `ADR-SEC-001`, `ADR-DEVOPS-001`.
- Related Documents → `/docs/10 §NFR-OBS-006`, `/docs/12`, `/docs/13`, `/docs/14 §middleware §logger`, `/docs/15 §Frontend §API Client`, `/docs/16 §426 §652 §653 §envelope`, `/docs/17`, `/docs/18 §110 §869 §ai_recommendations`, `/docs/19`, `/docs/20`, `/docs/21`, `/docs/22 §ADR-API-004 §ADR-SEC-001 §ADR-DEVOPS-001`.
- Backlog Item.

### Scope Guardrails
- Out of Scope: OpenTelemetry / distributed tracing (rechazado por ADR-API-004), persistencia frontend cross-request del ID en sesión (Future), header custom distinto de `X-Correlation-Id`, mutación de logs para inyectar ID retroactivamente (heredado de US-113), correlation en WebSocket (no aplica MVP).

### Acceptance Criteria
- AC-01 generación UUID v4 si no viene header.
- AC-02 reuso de header entrante válido.
- AC-03 400 ante header inválido.
- AC-04 response header echo en TODAS las responses.
- AC-05 `meta.correlationId` en success envelope.
- AC-06 `error.correlationId` en error envelope.
- AC-07 AsyncLocalStorage disponible dentro del handler.
- AC-08 fetch client frontend adjunta `X-Correlation-Id` por outbound request.

### Edge Cases
- EC-01 header entrante con UUID v4 válido → reuso.
- EC-02 header entrante inválido → 400.
- EC-03 múltiples requests concurrentes → cada uno tiene su propio store aislado (garantía de AsyncLocalStorage).
- EC-04 handler async downstream (ej. background job disparado) → si opta por seguir dentro del context, `correlationContext.getStore()` funciona; si opta por generar nuevo (patrón job), usar helper.

### Validation Rules
- VR-01 header entrante debe matchear regex UUID v4 estricta.
- VR-02 header echo obligatorio en cada response.
- VR-03 `meta.correlationId` obligatorio en success envelope.
- VR-04 `error.correlationId` obligatorio en error envelope.

### Authorization & Security Rules
- SEC-01 header `X-Correlation-Id` no es secret; sin redacción.
- SEC-02 validación UUID v4 previene injection (`ADR-SEC-001`).
- SEC-03 no persistir el header cross-user (cada request es independiente).

### Technical Notes (Backend)
- Path canónico: `src/infrastructure/middleware/correlation-id.middleware.ts`.
- Helper: `src/shared/context/correlation-id.ts` (colocado con `correlationContext` de US-113) exporta `generateCorrelationId(prefix?)` para jobs.
- Zod schema para el header entrante en `src/shared/validation/correlation-id.schema.ts`.
- Envelope helpers: `src/shared/http/response.ts` (probable ubicación) — asegurar que `respond.success` y `respond.error` leen del `correlationContext`.
- Orden middlewares en `app.ts`:
  1. `correlation-id.middleware.ts` (US-114 — OWNER).
  2. `request-logger.middleware.ts` (US-113 — CONSUME).
  3. auth, role, ownership, validation, rate limit, captcha, upload, error handler.

### Technical Notes (Frontend)
- Path canónico: `apps/web/lib/api/client.ts` (fetch interceptor global).
- Cada `apiClient.request` adjunta header `X-Correlation-Id: crypto.randomUUID()`.
- Log el `correlationId` recibido en response (opcional para debug con `LOG_LEVEL=debug`).

### UX / UI Notes
- Reemplazar por "No aplica — cambio transparente al usuario final; sólo afecta network layer".

### AI Behavior
- Reemplazar por "No aplica — historia técnica; sin invocación IA. `ai_recommendations.correlation_id` es escrito por US-115, no por US-114".

### Test Scenarios
- TS-01 request sin header → response header + envelope tienen UUID v4.
- TS-02 request con header válido → reuso en response + envelope.
- TS-03 request con header inválido → 400 con `error.code = 'INVALID_CORRELATION_ID'`.
- TS-04 error envelope tiene `error.correlationId`.
- TS-05 success envelope tiene `meta.correlationId`.
- TS-06 dentro del handler, `correlationContext.getStore()?.correlationId` matches response header.
- TS-07 (frontend) fetch interceptor adjunta `X-Correlation-Id` en headers; MSW verifica formato UUID v4.
- TS-08 (frontend) response con `X-Correlation-Id` → cliente puede acceder a él (opcional).
- IT-01 request completo backend: header entrante → response header + `meta.correlationId` + log emitido con mismo ID (via US-113 logger).
- IT-02 error backend: request → 500 → `error.correlationId` + log emitido.
- E2E-01 (Playwright) frontend fetch → backend log emitido con el ID del frontend.
- Contract test MSW: verificar shape de `meta.correlationId` y `error.correlationId` en fixtures.
- NT-01 header inválido → 400.
- NT-02 header vacío → 400 (fail-fast) o silent-generate según Q3.

### Definition of Ready / Done
- DoR: Tech Lead validó (Q1–Q7).
- DoD: middleware backend + interceptor frontend + envelope helpers verificados; tests verdes; contract test verde; smoke Docker (via US-113 logger) verde para header + log matching.

### Notes
- Handoff explícito con US-113 (Approved) — coordinación de orden middlewares en `app.ts`.
- Handoff con US-034 (job pattern usa `job-emit-t7-<timestamp>`; US-114 provee helper `generateCorrelationId('job-emit-t7')` para consistencia).
- Handoff con US-115 (`ai_recommendations.correlation_id` = valor del contexto).
- Handoff con US-116 (healthcheck usa el logger de US-113 que hereda el ID).
- `docs/15 §Frontend` puede requerir Documentation Alignment si no menciona el fetch interceptor (por confirmar en Technical Spec).
- Priority "Should Have" alineada con PB-P2-011 MoSCoW.
- Sin decisiones PO reales; todas Tech Recommendations resueltas por docs.

---

## 11. Recomendación Final

`Needs Refinement`

Las 7 preguntas son deterministas desde `docs/22 §ADR-API-004`, `docs/16 §426/§652/§653`, `docs/18 §110/§869`, US-113 Approved. No hay decisiones PO reales; todas Tech Recommendations. La US requiere reescritura mayor de plantilla genérica a contenido específico + integración explícita con US-113.

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver` para materializar Q1–Q7 como decisiones formalizadas y reescribir la US.

---

User Story file updated: No
Path: management/user-stories/US-114-correlation-id-propagation.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-114-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
