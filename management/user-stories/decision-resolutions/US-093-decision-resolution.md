# PO/BA Decision Resolution — US-093

## Source User Story File
management/user-stories/US-093-unified-error-envelope.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-093-refinement-review.md

## Decision Date
2026-06-11

---

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| User Story ID                                | US-093                                                                                          |
| User Story file path                         | management/user-stories/US-093-unified-error-envelope.md                                        |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-093-refinement-review.md                          |
| Existing decision resolution found           | No                                                                                              |
| Backlog Item                                 | PB-P0-003 — Backend Validation, Error Envelope & Logger                                         |
| Epic                                         | EPIC-BE-001 — Backend Modular Monolith                                                          |
| Estado antes de decisiones                   | Draft (refinado a Ready for Approval durante el refinement)                                     |
| Cantidad de preguntas revisadas              | 0 bloqueantes + 1 Documentation Alignment con decisión PO requerida                            |
| Decisiones PO/BA tomadas                     | 6 (aplicadas en refinement; formalizadas aquí) + 1 decisión de alineación documental            |
| Decisiones técnicas recomendadas             | 0                                                                                               |
| ¿Desbloquea aprobación?                      | Sí — la historia ya estaba en Ready for Approval; el doc alignment se confirma como no bloqueante |
| User Story file updated                      | No — la historia ya está en estado correcto; no se requieren cambios adicionales                |
| Decision Resolution artifact created/updated | Yes                                                                                             |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-093-decision-resolution.md                      |
| Próximo paso recomendado                     | Run `eventflow-user-story-approval`                                                             |

---

## Contexto de Ejecución

La User Story US-093 llegó al `eventflow-po-ba-decision-resolver` con **estado `Ready for Approval`**, ya que el `eventflow-user-story-refinement` resolvió todos los gaps directamente desde documentación existente (ADR-API-002 Accepted, ADR-API-004 Accepted, Doc 14 §18, Doc 16 §14, PB-P0-003) sin requerir preguntas bloqueantes al PO/BA.

Este artifact cumple el propósito del resolver de:

1. Formalizar las 6 decisiones que se aplicaron durante el refinement.
2. Tomar la decisión PO formal sobre el conflicto de documentación `VALIDATION_FAILED` vs `VALIDATION_ERROR`.
3. Registrar los items de Documentation Alignment y sus resoluciones.
4. Confirmar que la historia está en condiciones de proceder al Approval Gate.
5. Prevenir que futuras pasadas de refinement reabran estas decisiones.

---

## 2. Decisiones Respondidas

### Decisión 1 — Error Envelope: formato estándar y estructura

#### Pregunta original

> ¿Cuál es el formato canónico del error envelope para todos los endpoints del backend?

#### Respuesta PO/BA

ADR-API-002 (Accepted) formaliza el error envelope: `{ error: { code, message, details?, correlationId } }`. El envelope de éxito es `{ data: {...}, pagination?: {...}, meta: { correlationId, timestamp } }`. Los helpers `success()` y `failure()` garantizan que todos los controladores lo produzcan consistentemente.

#### Decisión formal

```text
El error envelope canónico es:
{ error: { code: string, message: string, details?: any[], correlationId: string } }

El success envelope canónico es:
{ data: T, pagination?: PaginationMeta, meta: { correlationId: string, timestamp: string } }

Los helpers success() y failure() son obligatorios en todos los controladores.
Ningún controlador construye el envelope manualmente.
```

#### Rationale

ADR-API-002 está Accepted y documenta exactamente esta estructura. Sin un helper único, cada controlador podría construir el envelope de forma diferente, rompiendo el contrato con el frontend y con los mocks MSW. El helper actúa como punto de control single-responsibility.

#### Impacto en la User Story

| Sección                 | Cambio requerido                                                            |
| ----------------------- | --------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Decisión registrada — **Aplicado en refinement**                            |
| Acceptance Criteria     | AC-01, AC-04 — **Aplicados en refinement**                                  |
| Technical Notes         | Ubicación de helpers en `src/shared/response/` — **Aplicado en refinement** |
| Validation Rules        | VR-04 (helpers obligatorios, lint rule) — **Aplicado en refinement**        |

#### ¿Bloqueaba aprobación?

No — la decisión ya estaba formalizada en ADR-API-002 antes del refinement.

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 2 — Catálogo de códigos: constantes estables (no strings literales)

#### Pregunta original

> ¿Los códigos de error deben ser strings literales dispersos en el código o constantes tipadas centralizadas?

#### Respuesta PO/BA

Los códigos deben ser un enum o constantes TypeScript en `src/shared/errors/ErrorCodes.ts`. ADR-API-002 establece que los códigos son el contrato estable que consume el frontend programáticamente. Usar strings literales genera typos indetectables y rompe el contrato sin error de compilación.

#### Decisión formal

```text
Los códigos de error se declaran como constantes TypeScript (enum o const object)
en src/shared/errors/ErrorCodes.ts.
No se usan strings literales para códigos en código de producción.
El código base canónico para validación de inputs es VALIDATION_ERROR (ver Decisión 7).
```

#### Rationale

Doc 16 §14.2 establece el catálogo completo. Un enum/const garantiza que el compilador detecte usos de códigos inválidos y que el frontend pueda importar los mismos valores si comparte tipos con el backend.

#### Impacto en la User Story

| Sección                 | Cambio requerido                                                                  |
| ----------------------- | --------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Decisión registrada — **Aplicado en refinement**                                  |
| Validation Rules        | VR-05 (catálogo como enum/constante) — **Aplicado en refinement**                |
| Technical Notes         | `src/shared/errors/ErrorCodes.ts` especificado — **Aplicado en refinement**       |

#### ¿Bloqueaba aprobación?

No — la decisión ya estaba implícita en ADR-API-002 y Doc 16 §14.2.

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 3 — Correlation ID: estrategia de propagación

#### Pregunta original

> ¿Cómo se genera y propaga el `X-Correlation-Id` a través del request lifecycle?

#### Respuesta PO/BA

ADR-API-004 (Accepted) define la estrategia: el `correlationIdMiddleware` es el primer middleware del pipeline. Lee `X-Correlation-Id` del header entrante o genera un UUID v4. Lo almacena en `req.correlationId` y lo retorna en el response header. El ID se propaga a logs (`pino` con `correlationId` en cada línea) y a todas las respuestas (`meta.correlationId` en éxito, `error.correlationId` en error). Jobs artificiales usan `job-<name>-<timestamp>` como correlationId.

#### Decisión formal

```text
El correlationIdMiddleware es el PRIMER middleware en el pipeline Express.
Lee X-Correlation-Id del header si está presente; genera UUID v4 si no.
El ID se propaga a: req.correlationId, response header X-Correlation-Id,
meta.correlationId en éxito, error.correlationId en error, y todos los logs.
AsyncLocalStorage o req.context.correlationId para propagación cross-capa.
```

#### Rationale

ADR-API-004 es explícito. Sin correlationId como primer middleware, cualquier error antes de que el pipeline procese la solicitud perdería la trazabilidad. La propagación garantiza que un request pueda rastrearse desde el cliente hasta los logs internos usando un solo ID.

#### Impacto en la User Story

| Sección                 | Cambio requerido                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Decisión registrada — **Aplicado en refinement**                                         |
| Acceptance Criteria     | AC-02 (generación/propagación del ID) — **Aplicado en refinement**                      |
| Technical Notes         | Posición del middleware en pipeline y mecanismo de propagación — **Aplicado en refinement** |
| Edge Cases              | EC-01 (request sin header) — **Aplicado en refinement**                                  |

#### ¿Bloqueaba aprobación?

No — la decisión ya estaba formalizada en ADR-API-004.

#### Validación adicional requerida

Requiere validación Tech Lead — para confirmar el mecanismo específico de propagación cross-capa (AsyncLocalStorage vs `req.context`). No bloquea el Approval Gate de la User Story.

---

### Decisión 4 — Stack traces: solo en logs internos, nunca al cliente

#### Pregunta original

> ¿Qué nivel de detalle técnico puede exponerse en los mensajes de error de la API?

#### Respuesta PO/BA

El `message` del error envelope debe ser seguro para el usuario: sin stack traces, sin nombres de archivos internos, sin queries SQL, sin API keys, sin nombres de variables internas. El `errorHandlerMiddleware` loguea el stack completo internamente con correlationId, pero retorna al cliente solo `code`, `message` genérico y `correlationId`. Los errores 500 siempre usan el mensaje genérico `INTERNAL_ERROR`.

#### Decisión formal

```text
Ningún error HTTP expone stack traces, SQL, paths internos, API keys ni datos sensibles.
El errorHandlerMiddleware loguea el stack internamente y retorna al cliente
solo: code, message (seguro), correlationId.
Errores 500 → message: "Error inesperado." (o equivalente localizable).
```

#### Rationale

ADR-API-002 y Doc 14 §18.2 son explícitos. Exponer stack traces es una vulnerabilidad OWASP Top 10 (A05 Security Misconfiguration). El correlationId permite al equipo de soporte correlacionar el error del cliente con el log interno sin exponer detalles técnicos.

#### Impacto en la User Story

| Sección                 | Cambio requerido                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Decisión registrada — **Aplicado en refinement**                                       |
| Acceptance Criteria     | AC-05 (stack no expuesto), AC-01 (message seguro) — **Aplicados en refinement**        |
| Authorization & Security Rules | SEC-01, SEC-02 (no exponer stack) — **Aplicados en refinement**               |
| Test Scenarios          | NT-08, NT-09 (error 500 sin stack en response) — **Aplicados en refinement**           |

#### ¿Bloqueaba aprobación?

No — la decisión ya estaba formalizada en ADR-API-002 y Doc 14 §18.2.

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 5 — `details[]` obligatorio en `VALIDATION_ERROR` y `BUSINESS_RULE_VIOLATION`

#### Pregunta original

> ¿En qué códigos de error es obligatorio el campo `details[]` con información por campo?

#### Respuesta PO/BA

Doc 16 §14.3 establece que `details` es opcional pero **obligatorio** en `VALIDATION_ERROR` y `BUSINESS_RULE_VIOLATION` con `details[].field`. En otros códigos, `details` puede omitirse. El helper `failure()` debe forzar este campo cuando se usa alguno de esos dos códigos.

#### Decisión formal

```text
details[] es obligatorio cuando code === "VALIDATION_ERROR" o code === "BUSINESS_RULE_VIOLATION".
Formato: details: [{ field: string, message: string }]
Para todos los demás códigos, details es opcional.
El tipo TypeScript del helper failure() debe reflejar esta obligatoriedad.
```

#### Rationale

Sin `details[]` el frontend no puede mostrar mensajes de error por campo en formularios. `VALIDATION_ERROR` sin campo específico no es accionable para el usuario. El tipado en TypeScript garantiza que el compilador detecte usos incorrectos del helper.

#### Impacto en la User Story

| Sección                 | Cambio requerido                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------ |
| PO/BA Decisions Applied | Decisión registrada — **Aplicado en refinement**                                     |
| Validation Rules        | VR-03 (details obligatorio) — **Aplicado en refinement**                             |
| Edge Cases              | EC-03 (VALIDATION_ERROR con details[]) — **Aplicado en refinement**                  |
| Test Scenarios          | NT-01 (400 VALIDATION_ERROR con details[] presente) — **Aplicado en refinement**     |

#### ¿Bloqueaba aprobación?

No — la decisión ya estaba en Doc 16 §14.3.

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 6 — Masking 403 → 404 para recursos privados

#### Pregunta original

> ¿Cuándo debe el backend retornar 404 en lugar de 403 ante un error de autorización?

#### Respuesta PO/BA

Doc 14 §17.3 establece: para evitar enumeración de IDs, las fallas de ownership en recursos **privados** pueden responder 404 en vez de 403. `AuthorizationError` acepta un flag `maskedAs404` para este caso. El log interno registra el error real (403) con correlationId para debugging. Recursos públicos que no admiten mutación por el usuario retornan 403 normalmente.

#### Decisión formal

```text
AuthorizationError con flag maskedAs404=true → responde 404 RESOURCE_NOT_FOUND al cliente.
El log interno registra que fue un error de autorización (403) con correlationId.
Se usa cuando el recurso es privado y exponer 403 revelaría su existencia a usuarios no autorizados.
Recursos públicos con operación no autorizada → 403 FORBIDDEN normalmente.
```

#### Rationale

El masking 403→404 es una mitigación estándar contra IDOR (Insecure Direct Object Reference) — un atacante no puede distinguir entre "el recurso no existe" y "no tienes acceso a él". Doc 14 §17.3 es explícito. La clase `AuthorizationError` con un flag hace el masking explícito y auditable.

#### Impacto en la User Story

| Sección                 | Cambio requerido                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Decisión registrada — **Aplicado en refinement**                                       |
| Acceptance Criteria     | AC-03 (mapeo AuthorizationError → 403/404) — **Aplicado en refinement**               |
| Authorization & Security Rules | SEC-03 (masking 403→404) — **Aplicado en refinement**                         |
| Edge Cases              | EC-04 (AuthorizationError con masking) — **Aplicado en refinement**                   |
| Test Scenarios          | NT-04 (masking verifica 404 en response; 403 en logs), AUTH-TS-01 — **Aplicados**     |

#### ¿Bloqueaba aprobación?

No — la decisión ya estaba en Doc 14 §17.3.

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 7 — Documentation Alignment: `VALIDATION_FAILED` vs `VALIDATION_ERROR`

#### Pregunta original (Documentation Alignment)

> Doc 14 §18.3 usa `VALIDATION_FAILED` como code de ejemplo para `ValidationError`, mientras ADR-API-002 y Doc 16 §14.2 usan `VALIDATION_ERROR`. ¿Cuál es el código canónico?

#### Respuesta PO/BA

**`VALIDATION_ERROR` es el código canónico.** ADR-API-002 (Accepted) y Doc 16 §14.2 son los documentos de referencia de contrato de API — son posteriores y más específicos que Doc 14. `VALIDATION_FAILED` en Doc 14 §18.3 es un ejemplo ilustrativo que no se alineó con el estándar final establecido en ADR-API-002. Dado que ADR-API-002 es un ADR Accepted, su decisión tiene precedencia sobre ejemplos en documentos de diseño.

#### Decisión formal

```text
El código canónico para errores de validación de inputs es: VALIDATION_ERROR
Source of truth: ADR-API-002 (Accepted), Doc 16 §14.2.
VALIDATION_FAILED en Doc 14 §18.3 es un error tipográfico/histórico sin vigencia.
Doc 14 §18.3 debe actualizarse para usar VALIDATION_ERROR en línea con ADR-API-002.
Esta corrección no requiere un nuevo ADR — es alineación con ADR existente.
```

#### Rationale

ADR-API-002 tiene precedencia sobre Doc 14 como source of truth del contrato de API. El catálogo de códigos estable del error envelope (que es el contrato con el frontend, MSW y agentes IA) debe estar alineado con ADR-API-002. Mantener `VALIDATION_FAILED` en Doc 14 crearía confusión durante la implementación si un desarrollador lo usa como referencia y genera código inconsistente con el estándar.

#### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| Notes                   | La nota sobre el conflicto ya está en la historia — confirmar que `VALIDATION_ERROR` es el canónico — **Confirmado** |

#### Impacto en documentación del proyecto

| Documento | Acción requerida |
| --------- | ---------------- |
| `/docs/14-Backend-Technical-Design.md §18.3` | Actualizar `VALIDATION_FAILED` a `VALIDATION_ERROR` en la tabla de mapeo de errores — trabajo de Documentation Alignment, no bloquea ninguna US |

#### ¿Bloqueaba aprobación?

No — la decisión vigente (ADR-API-002 con `VALIDATION_ERROR`) es la que se implementa en US-093 y US-092.

#### Validación adicional requerida

No requiere validación adicional de PO/BA. El equipo técnico puede actualizar Doc 14 §18.3 como tarea de mantenimiento de documentación.

---

## 3. Consolidated Decision Table

| #  | Tema | Decisión | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
|---:| ---- | -------- | ---- | ---------------------- | -------------------- |
| 1 | Formato del error envelope | `{ error: { code, message, details?, correlationId } }`; helpers obligatorios | PO (via ADR-API-002) | No | No requiere |
| 2 | Catálogo de códigos | Constantes TypeScript en `ErrorCodes.ts`; no strings literales | PO/BA (via ADR-API-002, Doc 16 §14.2) | No | No requiere |
| 3 | Correlación de requests | `correlationIdMiddleware` como primer middleware; UUID v4 si no hay header | PO (via ADR-API-004) | No | Tech Lead — mecanismo propagación cross-capa |
| 4 | Stack traces | Solo en logs internos; never al cliente | PO (via ADR-API-002, Doc 14 §18.2) | No | No requiere |
| 5 | `details[]` obligatorio | En `VALIDATION_ERROR` y `BUSINESS_RULE_VIOLATION`; tipado en helper `failure()` | PO/BA (via Doc 16 §14.3) | No | No requiere |
| 6 | Masking 403→404 | En recursos privados con `AuthorizationError(maskedAs404=true)` | PO/BA (via Doc 14 §17.3) | No | No requiere |
| 7 | Código canónico de validación | `VALIDATION_ERROR` (no `VALIDATION_FAILED`); Doc 14 §18.3 debe actualizarse | PO (Documentation Alignment) | No | Doc 14 actualización — tarea de mantenimiento |

---

## 4. Cambios Aplicados a la User Story

El archivo de la User Story **no fue modificado** en esta pasada del resolver. El `eventflow-user-story-refinement` ya actualizó el archivo con todos los cambios necesarios. El estado actual (`Ready for Approval`) es correcto.

Los cambios que se aplicaron **en el refinement** y que quedan formalizados aquí son:

### Metadata

* Backlog Item PB-P0-003 agregado.
* Status: `Ready for Approval`.
* Last Updated: 2026-06-11.

### User Story Statement

* Reescrito mencionando `errorHandlerMiddleware`, `correlationIdMiddleware`, helpers `success()`/`failure()`, jerarquía de errores, catálogo de códigos y `X-Correlation-Id`.

### Business Context

* Context Summary expandido con contexto de ADR-API-002 y ADR-API-004.
* Related Domain Concepts completado (7 conceptos clave: middlewares, envelope, helpers, jerarquía, catálogo, Shared Kernel).
* Assumptions reescritas (prerequisito US-089, contrato con US-092, `details[]` obligatorio).
* Dependencies: US-089 explícitamente referenciado.

### PO/BA Decisions Applied

* Sección creada con las 6 decisiones formalizadas en Decisiones 1–6 de este artifact.

### Traceability

* ADR-API-002 y ADR-API-004 agregados como ADRs principales.
* NFR-PERF-API-001 (inexistente) y NFR-OBS-001 (inaplicable) reemplazados por NFR-OBS-003, NFR-OBS-006, NFR-TEST-001.

### Scope Guardrails

* Logger estructurado, validateRequestMiddleware (US-092), códigos de negocio específicos y OpenTelemetry explicitados como Out of Scope.

### Acceptance Criteria

* AC-01 a AC-06 reescritos con GWT específicos.
* EC-01 a EC-04 reemplazando el EC de env vars al boot (plantilla de US-089).

### Validation Rules

* VR-01 a VR-05 específicos para el error envelope y correlationId.

### Authorization & Security Rules

* SEC-01 a SEC-05 reescritos; SEC-03 cubre el masking 403→404.

### Technical Notes

* Pipeline de middlewares, ubicaciones de artefactos (`src/shared/errors/`, `src/shared/response/`), helpers y catálogo documentados.

### QA / Test Scenarios

* TS-01 a TS-05 (funcionales), NT-01 a NT-10 (negativos), AUTH-TS-01/AUTH-TS-02 reescritos con escenarios específicos.

### Definition of Done

* 7 criterios específicos y verificables.

### Notes

* Documentation Alignment VALIDATION_FAILED vs VALIDATION_ERROR documentado; Decisión 7 de este artifact lo resuelve formalmente.

---

## 5. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                                  | Decisión vigente                                                  | Acción recomendada                                                           | ¿Bloquea aprobación? |
| ------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------- |
| Doc 14 §18.3 (Backend Design)   | Usa `VALIDATION_FAILED` como code de ejemplo para `ValidationError`                  | ADR-API-002 (Accepted) y Doc 16 §14.2 establecen `VALIDATION_ERROR` como código canónico | Actualizar tabla de mapeo en Doc 14 §18.3 para usar `VALIDATION_ERROR` — tarea de mantenimiento de documentación | No |
| NFR-PERF-API-001 (US-093 Draft) | ID inexistente en Doc 10; el Draft lo referenciaba incorrectamente                   | NFR-OBS-003, NFR-OBS-006, NFR-TEST-001 son los NFRs aplicables    | Corrección ya aplicada en refinement; no se requiere actualizar Doc 10       | No                   |
| NFR-OBS-001 (US-093 Draft)      | Aplica a AdminAction (acciones administrativas), no al error envelope                | No aplica a esta historia                                         | Corrección ya aplicada en refinement                                         | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| User Story file updated                      | No — historia ya en estado correcto (Ready for Approval)                                        |
| User Story file path                         | `management/user-stories/US-093-unified-error-envelope.md`                                      |
| Decision Resolution artifact created/updated | Yes                                                                                             |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-093-decision-resolution.md`                    |
| New User Story status                        | Ready for Approval                                                                              |
| Remaining blockers                           | No                                                                                              |
| Reason                                       | Todas las decisiones formalizadas desde ADR-API-002, ADR-API-004, Doc 14 §18, Doc 16 §14; el único Documentation Alignment (VALIDATION_FAILED vs VALIDATION_ERROR) fue resuelto formalmente con PO decisión a favor de VALIDATION_ERROR |

---

## 7. Estado recomendado después de aplicar decisiones

**Ready for Approval**

La User Story US-093 está en estado `Ready for Approval`. Las 6 decisiones aplicadas en el refinement están formalizadas. El conflicto de documentación `VALIDATION_FAILED` vs `VALIDATION_ERROR` fue resuelto formalmente: `VALIDATION_ERROR` es el código canónico por ADR-API-002 (Accepted). No quedan preguntas bloqueantes. La actualización de Doc 14 §18.3 es una tarea de mantenimiento de documentación que no bloquea el Approval Gate.

La validación técnica pendiente (Decisión 3 — mecanismo de propagación de correlationId cross-capa: AsyncLocalStorage vs req.context) es una decisión de implementación que el Tech Lead tomará durante el desarrollo; no bloquea la aprobación de la User Story.

---

## 8. Próximo Paso Recomendado

```text
1. Revisar el archivo de User Story actualizado:
   management/user-stories/US-093-unified-error-envelope.md

2. Ejecutar `eventflow-user-story-approval` directamente.
   No es necesario re-ejecutar `eventflow-user-story-refinement` — no hay cambios pendientes.

3. Tarea de mantenimiento de documentación (no bloqueante):
   Actualizar /docs/14-Backend-Technical-Design.md §18.3
   — cambiar VALIDATION_FAILED → VALIDATION_ERROR en la tabla de mapeo de errores.

4. Después del Approval Gate, ejecutar `eventflow-user-story-to-development-tasks`
   para generar las tareas de desarrollo de US-093.
```
