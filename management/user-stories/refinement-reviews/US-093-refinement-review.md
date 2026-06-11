# User Story Refinement Review — US-093

## Source User Story File
management/user-stories/US-093-unified-error-envelope.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-093-decision-resolution.md

## Review Date
2026-06-11

---

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| User Story ID                              | US-093                                                                                                  |
| File Path                                  | management/user-stories/US-093-unified-error-envelope.md                                                |
| Backlog Item                               | PB-P0-003 — Backend Validation, Error Envelope & Logger                                                 |
| Epic                                       | EPIC-BE-001 — Backend Modular Monolith                                                                  |
| Estado actual                              | Draft                                                                                                   |
| Estado recomendado                         | Ready for Approval                                                                                      |
| Nivel de riesgo                            | Bajo                                                                                                    |
| Calidad general                            | Alta (post-refinement)                                                                                  |
| Requiere decisión PO                       | No                                                                                                      |
| Requiere decisión técnica                  | No                                                                                                      |
| Requiere decisión QA                       | No                                                                                                      |
| Requiere decisión Seguridad                | No                                                                                                      |
| Decision Resolution artifact found         | No                                                                                                      |
| User Story file updated                    | Yes                                                                                                     |
| Refinement review artifact created/updated | Yes                                                                                                     |
| Refinement review path                     | management/user-stories/refinement-reviews/US-093-refinement-review.md                                 |

---

## 2. Diagnóstico PO/BA

La User Story US-093 cubre una capacidad técnica fundacional del backend: el error envelope unificado (ADR-API-002) y el Correlation ID (ADR-API-004). Su valor es alto — sin un contrato de errores consistente, el frontend, MSW y los agentes IA deben tratar formatos distintos por endpoint. La versión Draft era idéntica en estructura al Draft de US-092: plantilla genérica sin contextualización específica, con ACs intesteables, EC de env vars al boot ajeno a esta historia, y NFRs incorrectos.

Todos los problemas se resolvieron desde documentación existente (ADR-API-002 Accepted, ADR-API-004 Accepted, Doc 14 §18, Doc 16 §14). No se requieren decisiones de PO, Tech Lead, QA ni Seguridad.

---

## 3. Hallazgos Principales (todos resueltos)

| Severidad | Hallazgo                                                                                                         | Acción tomada                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Alta      | ACs genéricos e intesteables — plantilla idéntica a la de US-092 Draft                                          | Reescritos con GWT específicos de ADR-API-002/ADR-API-004            |
| Alta      | ADR-API-002 y ADR-API-004 no referenciados (los ADRs principales de esta historia)                               | Agregados a Traceability y PO/BA Decisions Applied                    |
| Alta      | NFR-PERF-API-001 (no existe) y NFR-OBS-001 (AdminAction, no aplica) como referencias                            | Reemplazados por NFR-OBS-003, NFR-OBS-006, NFR-TEST-001               |
| Alta      | EC-01 sobre env vars al boot — plantilla de US-089, completamente fuera de scope                                 | Reemplazado por ECs reales: sin header correlationId, error no mapeado, VALIDATION_ERROR con details[], masking 403→404 |
| Alta      | Story statement genérico ("retornar errores con un sobre uniforme") sin especificar los artefactos técnicos      | Reescrito nombrando `errorHandlerMiddleware`, `correlationIdMiddleware`, helpers, jerarquía de errores, catálogo de códigos |
| Media     | Faltaba Backlog Item PB-P0-003 en metadata                                                                       | Agregado                                                             |
| Media     | Business Context de 1 línea ("Definir esquema y aplicarlo en errorHandler.")                                     | Expandido con contexto de ADR-API-002, ADR-API-004, valor para frontend/MSW/IA |
| Media     | VR-01 sobre configuración fail-fast — plantilla de bootstrap, no de error envelope                               | Reemplazado con VRs específicos del error envelope (5 reglas)        |
| Media     | AUTH-TS-01 "Setup completado" sin sentido en esta historia                                                       | Reemplazado con tests de masking 403→404 y seguridad de 500          |
| Media     | Dependencias vagas ("Dependencias técnicas del epic.")                                                           | US-089 referenciado explícitamente                                   |
| Baja      | Falta sección PO/BA Decisions Applied                                                                            | Creada con 6 decisiones de ADRs y Docs relevantes                    |
| Baja      | Technical Notes genéricas; no mencionan pipeline Express, `src/shared/`, helpers, jerarquía                     | Reescritas con ubicaciones y patrones específicos                    |
| Baja      | Task Breakdown genérico ("Configuración + boot.")                                                                | Reescrito con tareas específicas: jerarquía, catálogo, helpers, middlewares |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                              |
| ------------------------------------ | --------- | --------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica                                                                               |
| No introduce contratos firmados      | Pass      | No aplica                                                                               |
| No introduce WhatsApp/chat/push      | Pass      | No aplica                                                                               |
| Respeta human-in-the-loop IA         | Pass      | La historia define códigos AI_PROVIDER_TIMEOUT/UNAVAILABLE en el catálogo; su uso es de features IA |
| Respeta backend como source of truth | Pass      | Error envelope y correlation ID en el backend son la fuente de verdad del contrato      |
| Respeta seed/demo si aplica          | N/A       | No requiere cambios de seed/demo                                                        |
| No introduce RAG/vector DB           | Pass      | No aplica                                                                               |
| No introduce multi-tenant enterprise | Pass      | No aplica                                                                               |
| No introduce P4/Future scope         | Pass      | OpenTelemetry/APM explícitamente Out of Scope (NFR-OBS-006)                            |

---

## 5. Revisión de Acceptance Criteria

### Versión Draft (pre-refinement)

| AC    | Calidad          | Problema detectado                                                    | Acción tomada          |
| ----- | ---------------- | --------------------------------------------------------------------- | ---------------------- |
| AC-01 | Not Testable     | Genérico — "Capacidad técnica habilitada / cumple FR/NFR"             | Reescrito — **Aplicado** |
| AC-02 | Needs Detail     | "Compatibilidad multi-environment" sin criterio medible               | Absorbido en AC-06     |
| EC-01 | Out of Scope     | Env var al boot — plantilla de US-089                                 | Reemplazado — **Aplicado** |

### Versión refinada (post-refinement)

| AC    | Calidad | Observación                                                                                      |
| ----- | ------- | ------------------------------------------------------------------------------------------------ |
| AC-01 | Clear   | GWT: error de dominio → envelope `{error: {code, message, correlationId}}`; no expone stack      |
| AC-02 | Clear   | GWT: correlationId generado o propagado; presente en header, meta y error                        |
| AC-03 | Clear   | GWT: mapeo completo de jerarquía de errores → HTTP + código de catálogo                          |
| AC-04 | Clear   | GWT: helpers `success()` / `failure()` producen envelope correcto con meta tipado                |
| AC-05 | Clear   | GWT: UnexpectedError → 500 INTERNAL_ERROR; stack solo en logs                                    |
| AC-06 | Clear   | GWT: tests cubren 7 códigos de error (400, 401, 403, 404, 409, 422, 500) + correlationId        |
| EC-01 | Clear   | Request sin X-Correlation-Id → UUID v4 generado                                                  |
| EC-02 | Clear   | Excepción no mapeada → 500 INTERNAL_ERROR                                                        |
| EC-03 | Clear   | VALIDATION_ERROR → details[] obligatorio                                                         |
| EC-04 | Clear   | AuthorizationError con masking → 404 al cliente; 403 real en logs                               |

---

## 6. Gaps Detectados

### Producto / Negocio

No aplica — historia técnica fundacional. El valor es la consistencia y trazabilidad de todos los errores API.

### Backend / API

Resuelto en refinement:
- `errorHandlerMiddleware` como último middleware del pipeline documentado.
- `correlationIdMiddleware` como primer middleware documentado.
- Helpers `success()` / `failure()` y ubicación en `src/shared/response/` especificados.
- Jerarquía de errores en `src/shared/errors/` especificada.
- Catálogo en `src/shared/errors/ErrorCodes.ts` especificado.

### Frontend / UX

No aplica — el frontend consume `error.code` y `error.message`; documentado en UX Notes.

### Base de Datos

No aplica — infraestructura de respuesta sin acceso a BD.

### Seguridad / Autorización

Resuelto en refinement:
- SEC-01/SEC-02: no exponer stack al cliente.
- SEC-03: masking 403→404 para recursos privados (EC-04, AUTH-TS-01).
- AUTH-TS-02: error 500 no expone información de exploración.

### IA / PromptOps

No aplica en esta historia. Los códigos AI_PROVIDER_TIMEOUT/UNAVAILABLE se declaran en el catálogo pero su uso es responsabilidad de las historias de features IA.

### QA / Testing

Resuelto en refinement:
- 5 tests funcionales (TS-01 a TS-05) y 10 tests negativos (NT-01 a NT-10) específicos.
- Cobertura de los 7 códigos HTTP principales del error envelope.

### Seed / Demo

No requiere cambios de seed/demo.

### Documentación / Trazabilidad

Resuelto en refinement:
- ADR-API-002 y ADR-API-004 agregados.
- NFRs corregidos (NFR-OBS-003, NFR-OBS-006, NFR-TEST-001).
- PB-P0-003 agregado como Backlog Item.
- Documentation Alignment (VALIDATION_FAILED vs VALIDATION_ERROR) documentado en Notes.

---

## 7. Preguntas Pendientes

No pending blocking questions.

Todos los aspectos de la historia se resolvieron desde documentación existente: ADR-API-002 (Accepted), ADR-API-004 (Accepted), Doc 14 §18, Doc 16 §14, PB-P0-003.

---

## 8. Documentation Alignment Required

| Documento / Fuente           | Conflicto detectado                                                              | Decisión vigente                                              | Acción recomendada                                                   | ¿Bloquea aprobación? |
| ---------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------- |
| Doc 14 §18.3 (Backend Design) | Usa `VALIDATION_FAILED` como code de ejemplo para ValidationError               | ADR-API-002 (Accepted) y Doc 16 §14.2 establecen `VALIDATION_ERROR` | Actualizar Doc 14 §18.3 para usar `VALIDATION_ERROR` en línea con ADR-API-002 | No                   |
| NFR-PERF-API-001 (US Draft)  | El ID referenciado no existe en Doc 10                                            | NFR-OBS-003 y NFR-OBS-006 son los NFRs aplicables             | Corrección aplicada en refinement                                    | No                   |
| NFR-OBS-001 (US Draft)       | Aplica a AdminAction, no a error envelope                                         | No aplica a esta historia                                     | Corrección aplicada en refinement                                    | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                               |
| User Story file path                       | `management/user-stories/US-093-unified-error-envelope.md`                                        |
| User Story ID verified                     | Yes — US-093                                                                                      |
| Decision Resolution artifact found         | No                                                                                                |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-093-decision-resolution.md`                      |
| Refinement review artifact created/updated | Yes                                                                                               |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-093-refinement-review.md`                          |
| Final recommended status                   | Ready for Approval                                                                                |
| Next recommended skill                     | eventflow-user-story-approval                                                                     |
| Reason                                     | Todos los gaps resueltos desde documentación existente; no hay preguntas bloqueantes pendientes   |

---

## 10. Cambios Aplicados

### Metadata

* Agregado campo `Backlog Item: PB-P0-003`.
* `Status` cambiado de `Draft` a `Ready for Approval`.
* `Last Updated` actualizado a `2026-06-11`.
* `Epic` ampliado a `EPIC-BE-001 — Backend Modular Monolith`.

### User Story Statement

* Reescrito para nombrar explícitamente: `errorHandlerMiddleware`, `correlationIdMiddleware`, helpers `success()`/`failure()`, jerarquía de errores, catálogo de códigos y `X-Correlation-Id`.

### Business Context

* `Context Summary` reescrito con contexto de ADR-API-002 y ADR-API-004: valor del envelope consistente, pipeline de middlewares, helpers, contrato con frontend/MSW/IA.
* `Related Domain Concepts` completado: 7 conceptos técnicos clave.
* `Assumptions` reescrita: prerequisito US-089, contrato con US-092, `details[]` obligatorio en ciertos códigos.
* `Dependencies` actualizada: US-089 explícitamente referenciado.

### PO/BA Decisions Applied

* Sección creada con 6 decisiones de ADR-API-002, ADR-API-004 y Doc 14 §18.

### Traceability

* `NFR Reference(s)`: reemplazados NFR-PERF-API-001 (inexistente) y NFR-OBS-001 (incorrecto) por NFR-OBS-003, NFR-OBS-006, NFR-TEST-001.
* `Related ADR(s)`: ADR-API-002 y ADR-API-004 agregados como ADRs principales; ADR-BE-001 mantenido.
* `Related Document(s)`: acotado a /docs/14 §18, /docs/16 §14, /docs/22 §ADR-API-002, /docs/22 §ADR-API-004.

### Scope Guardrails

* Out of Scope ampliado: logger estructurado delegado, US-092 delegado, códigos de negocio específicos en features, OpenTelemetry fuera del MVP.

### Acceptance Criteria

* AC-01, AC-02 completamente reescritos con GWT específicos.
* Agregados AC-03 (mapeo jerarquía→HTTP), AC-04 (helpers), AC-05 (stack no expuesto), AC-06 (cobertura de tests 7 códigos).
* EC-01 reemplazado (sin X-Correlation-Id header).
* Agregados EC-02 (excepción no mapeada), EC-03 (VALIDATION_ERROR con details), EC-04 (masking 403→404).

### Validation Rules

* VR-01 reescrito: message seguro sin stack.
* Agregados VR-02 (correlationId siempre presente), VR-03 (details obligatorio en VALIDATION_ERROR/BUSINESS_RULE_VIOLATION), VR-04 (helpers obligatorios en controladores), VR-05 (catálogo como enum/constante TypeScript).

### Authorization & Security Rules

* SEC-01/SEC-02 reescritos específicamente para este middleware.
* SEC-03 agregado: masking 403→404.
* SEC-04/SEC-05: mantenidos.
* Negative Authorization Scenarios: aclarado que aplica solo el masking 403→404.

### AI Behavior

* Sección completada: no invoca IA; códigos AI_* declarados en catálogo pero su uso en historias de features.

### Technical Notes

* Backend completamente reescrito: posición en el pipeline, ubicaciones de artefactos en `src/shared/`, helpers, jerarquía, catálogo.
* API table: `ALL /api/v1/*` (handler global).

### QA / Test Scenarios

* 5 tests funcionales (TS-01 a TS-05) específicos para correlationId y helpers.
* 10 tests negativos (NT-01 a NT-10) cubriendo toda la jerarquía de errores.
* AUTH-TS-01/AUTH-TS-02: tests de seguridad de masking y INTERNAL_ERROR.

### Definition of Ready

* Actualizada para reflejar ADR-API-002, ADR-API-004, Doc 14 §18, estructura `src/shared/`, dependencias.

### Definition of Done

* Reescrito con 7 criterios específicos y verificables (middlewares, jerarquía, catálogo, helpers, lint rule, NT tests, Tech Lead).

### Notes

* Documentation Alignment documentado: VALIDATION_FAILED (Doc 14) vs VALIDATION_ERROR (ADR-API-002, Doc 16).
* Nota sobre inspiración RFC 7807 sin adherencia literal.
* Nota sobre códigos de negocio específicos en historias de features.

---

## 11. Recomendación Final

**Ready for Approval**

La User Story US-093 fue refinada completamente desde documentación existente (ADR-API-002 Accepted, ADR-API-004 Accepted, Doc 14 §18, Doc 16 §14, PB-P0-003). Los Acceptance Criteria cubren los 4 artefactos técnicos clave (correlationIdMiddleware, errorHandlerMiddleware, helpers, jerarquía+catálogo) con GWT específicos y testeables. La única Documentation Alignment detectada (VALIDATION_FAILED vs VALIDATION_ERROR entre Doc 14 y ADR-API-002) no bloquea la aprobación — la decisión vigente está formalizada en ADR-API-002. No hay preguntas bloqueantes de PO, Tech Lead, QA ni Seguridad.

**Siguiente paso:** ejecutar `eventflow-user-story-approval`.
