# User Story Refinement Review — US-091

## Source User Story File
management/user-stories/US-091-middleware-pipeline.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-091-decision-resolution.md

## Review Date
2026-06-11

---

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                       |
| ------------------------------------------ | ---------------------------------------------------------------- |
| User Story ID                              | US-091                                                           |
| File Path                                  | management/user-stories/US-091-middleware-pipeline.md            |
| Backlog Item                               | PB-P0-002 — Backend Modular Monolith Bootstrap                   |
| Epic                                       | EPIC-BE-001 — Backend Modular Monolith                           |
| Estado actual                              | Draft                                                            |
| Estado recomendado                         | Ready for Approval                                               |
| Nivel de riesgo                            | Bajo                                                             |
| Calidad general                            | Alta (después de refinamiento)                                   |
| Requiere decisión PO                       | No                                                               |
| Requiere decisión técnica                  | No                                                               |
| Requiere decisión QA                       | No                                                               |
| Requiere decisión Seguridad                | No                                                               |
| Decision Resolution artifact found        | No                                                               |
| User Story file updated                    | Yes                                                              |
| Refinement review artifact created/updated | Yes (este archivo — evidencia post-refinamiento)                 |
| Refinement review path                     | management/user-stories/refinement-reviews/US-091-refinement-review.md |

---

## 2. Diagnóstico PO/BA

US-091 es la historia de mayor carga de seguridad del trilogy de bootstrap (US-089/090/091). Implementa los 14 middlewares transversales que habilitan autenticación, RBAC, ownership, captcha, rate limiting, validación, correlación, logging y manejo seguro de errores en todos los endpoints del MVP.

La versión Draft era idéntica al template genérico utilizado en US-089 y US-090 — completamente inadecuado para una historia con esta densidad de requisitos de seguridad y comportamiento. Los problemas eran graves:

1. **AC no testeables** — "cumple NFR referenciado" y "funciona consistentemente" son criterios vacíos para una historia que debe especificar 14 comportamientos observables con HTTP codes exactos.
2. **EC totalmente inaplicable** — "Configuración faltante al boot" no es un edge case del pipeline de middlewares; los EC relevantes son JWT expirado, ownership violation, CORS bloqueado, etc.
3. **NFR IDs incorrectos** — `NFR-PERF-API-001` no existe; `NFR-OBS-001` es AdminAction logging, no logging de fallos de autenticación.
4. **ADRs de seguridad ausentes** — ADR-SEC-001, ADR-SEC-003, ADR-SEC-004 y ADR-SEC-006 son las ADRs centrales de esta historia y ninguna estaba referenciada.
5. **Tabla de Negative Authorization Scenarios vacía** — Para una historia que implementa el stack de seguridad del backend, esta es la sección más crítica.
6. **Technical Notes sin los 14 middlewares** — Doc 14 §16 define cada middleware con su alcance, input, output y código de error. La US no referenciaba ninguno.
7. **VR solo tenía "Validación de configuración — Fail-fast"** — Inaplicable; las VR relevantes son los HTTP codes exactos por escenario (401 vs 403 vs 404 enmascarado).

Todo se resolvió con los ADRs aceptados y Doc 14 §8.2/§16/§17. No se requirieron nuevas decisiones.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                       | Impacto                                                                                          | Recomendación                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Alta      | `NFR-PERF-API-001` no existe en Doc 10.                                                                                                                       | Trazabilidad rota.                                                                               | Reemplazado por `NFR-SEC-001..004`, `NFR-SEC-007`, `NFR-OBS-003`, `NFR-OBS-006`. Aplicado.                                    |
| Alta      | `NFR-OBS-001` no aplica (AdminAction logging).                                                                                                                 | Confusión QA.                                                                                    | Reemplazado por `NFR-OBS-003` (logging de fallos de auth) y `NFR-OBS-006` (stdout suficiente). Aplicado.                     |
| Alta      | AC-01 y AC-02 no testeables para una historia de pipeline de seguridad.                                                                                        | QA no puede derivar ningún test case concreto.                                                   | Reemplazados por 8 AC con HTTP codes exactos y comportamientos observables. Aplicado.                                         |
| Alta      | EC-01 ("configuración faltante al boot") inaplicable; los EC relevantes son JWT expirado, ownership violation, CORS bloqueado, body oversized.                  | EC ocultan los riesgos reales del pipeline de seguridad.                                         | EC-01..EC-05 reemplazados por escenarios de seguridad reales (Doc 14 §16, §17). Aplicado.                                    |
| Alta      | ADR-SEC-001, ADR-SEC-003, ADR-SEC-004, ADR-SEC-006 ausentes — son las ADRs centrales de esta historia.                                                         | Decisiones vinculantes de seguridad sin referencia; implementación podría ignorarlas.            | Todos los ADR-SEC relevantes agregados a Traceability. Aplicado.                                                              |
| Alta      | Tabla de Negative Authorization Scenarios vacía ("N/A directamente") — inaceptable para la historia que implementa autenticación, RBAC y ownership.            | Sin escenarios negativos explícitos, QA no tiene base para pruebas de seguridad.                 | Tabla completa de 7 negative scenarios con HTTP code y middleware responsable. Aplicado.                                     |
| Alta      | Technical Notes sin los 14 middlewares de Doc 14 §16.                                                                                                          | Tech Lead no tiene guía de implementación desde la US.                                           | Tabla completa de 14 middlewares con alcance, comportamiento y código de error en Technical Notes. Aplicado.                  |
| Alta      | VR-01 inaplicable ("Validación de configuración — Fail-fast"). Los VR deben especificar HTTP codes exactos por escenario.                                       | Sin VR de HTTP codes, el contrato de respuesta queda indefinido; front/QA no saben qué esperar.  | VR-01..VR-06 con HTTP codes, error codes y payloads específicos. Aplicado.                                                    |
| Media     | Authorization & Security Rules (SEC-01..SEC-03) eran genéricos e inaplicables a un middleware pipeline.                                                        | Reglas de seguridad sin comportamiento concreto.                                                 | SEC-01..SEC-07 con comportamiento específico por tipo de control (CORS, helmet, JWT, captcha, rate limit, logging). Aplicado. |
| Media     | Test Scenarios sin herramientas (faltaba Vitest + Supertest per Doc 20).                                                                                       | QA no podía seleccionar framework.                                                               | Columnas `Tool` con Vitest y Supertest en 15 test cases. Aplicado.                                                           |
| Media     | La distinción entre middlewares globales vs. por ruta no estaba especificada.                                                                                   | Developer no sabría dónde registrar `authMiddleware` vs. `correlationIdMiddleware`.              | Columna "Alcance" (Global vs. Por ruta) en la tabla de Technical Notes. Aplicado.                                             |
| Baja      | Scope Notes no diferenciaban entre el rate limit global (esta US) y el rate limit estricto por endpoint (feature stories de auth).                             | Posible duplicación de lógica o scope creep.                                                     | Scope Notes aclara explícitamente el boundary. Aplicado.                                                                      |
| Baja      | La distinción `401 vs 403 vs 404 enmascarado` no estaba capturada.                                                                                             | Confusión en QA y frontend sobre qué código esperar en cada escenario de auth.                  | VR-01, VR-02, VR-03 y Negative Authorization Scenarios documentan la distinción. Aplicado.                                   |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                   |
| ------------------------------------ | --------- | ---------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | N/A.                                                                         |
| No introduce contratos firmados      | Pass      | N/A.                                                                         |
| No introduce WhatsApp/chat/push      | Pass      | N/A.                                                                         |
| Respeta human-in-the-loop IA         | Pass      | N/A — no invoca IA.                                                          |
| Respeta backend como source of truth | Pass      | Esta historia implementa el principio: auth en backend, no en frontend.      |
| Respeta seed/demo si aplica          | N/A       | No requiere seed/demo.                                                       |
| No introduce RAG/vector DB           | Pass      | N/A.                                                                         |
| No introduce multi-tenant enterprise | Pass      | N/A.                                                                         |
| No introduce P4/Future scope         | Pass      | CSRF token complejo y Google OAuth OAuth marcados como Out of Scope explícito.|

---

## 5. Revisión de Acceptance Criteria

### AC originales (Draft)

| AC    | Calidad      | Problema detectado                                                          | Acción aplicada                                                                      |
| ----- | ------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| AC-01 | Not Testable | "Cumple FR/NFR referenciado" — sin comportamiento observable del middleware | Reemplazado por 8 AC con comportamientos específicos y HTTP codes exactos            |
| AC-02 | Not Testable | "Funciona consistentemente en multi-entorno"                                | Integrado en AC-04 (rate limit) y AC-08 (orden de middlewares)                      |

### AC refinados (Ready for Approval)

| AC    | Calidad | Notas                                                   |
| ----- | ------- | ------------------------------------------------------- |
| AC-01 | Clear   | Correlation ID: comportamiento con y sin cabecera       |
| AC-02 | Clear   | authMiddleware: token válido → req.user poblado         |
| AC-03 | Clear   | roleMiddleware: rol incorrecto → 403                    |
| AC-04 | Clear   | rateLimitMiddleware: excedido → 429 + Retry-After       |
| AC-05 | Clear   | captchaMiddleware: solo en /auth sensibles, mock en test |
| AC-06 | Clear   | validateRequestMiddleware: 400 con detalles Zod         |
| AC-07 | Clear   | errorHandlerMiddleware: envelope sin stack trace        |
| AC-08 | Clear   | Orden de middlewares exacto (Doc 14 §8.2)               |

---

## 6. Gaps Detectados

### Producto / Negocio
US-091 es capacidad técnica de seguridad. Sin gaps de producto/negocio.

### Backend / API
* Gap resuelto: los 14 middlewares no estaban listados → tabla completa en Technical Notes con Doc 14 §16.
* Gap resuelto: comportamiento del `ownershipMiddleware` (404 enmascarado) no estaba especificado → EC-03 y VR-03.
* Gap resuelto: distinción global vs. por ruta no documentada → columna "Alcance" en tabla de middlewares.
* Gap resuelto: mock de captcha para tests no mencionado → AC-05 y Notes con `CAPTCHA_PROVIDER=mock`.

### Frontend / UX
No aplica.

### Base de Datos
* Aclaración: `ownershipMiddleware` usa puertos de repositorio (definidos en US-090); sin nuevas tablas.

### Seguridad / Autorización
* Gap resuelto: Negative Authorization Scenarios vacía → tabla completa con 7 escenarios.
* Gap resuelto: ADR-SEC-003/004/006 ausentes → agregados a Traceability y Technical Notes.
* Gap resuelto: SEC-01..SEC-03 genéricos → SEC-01..SEC-07 con reglas específicas por tipo de control.

### IA / PromptOps
No aplica.

### QA / Testing
* Gap resuelto: 0 test cases concretos → 15 test cases con herramientas (Vitest + Supertest).
* Gap resuelto: NT-01..NT-09 cubren todos los scenarios negativos de seguridad.
* Gap resuelto: AUTH-TS-01..AUTH-TS-04 cubren la matriz de authorization.

### Seed / Demo
No requiere cambios de seed/demo.

### Documentación / Trazabilidad
* Gap resuelto: NFR IDs incorrectos → NFR-SEC-001..004, NFR-SEC-007, NFR-OBS-003, NFR-OBS-006.
* Gap resuelto: ADRs de seguridad ausentes → ADR-SEC-001, ADR-SEC-003, ADR-SEC-004, ADR-SEC-006.
* No se detectaron documentation alignment issues en esta historia.

---

## 7. Preguntas Pendientes

No pending blocking questions.

Todas las decisiones relevantes están formalizadas en:
* ADR-BE-001 (Express + TypeScript)
* ADR-SEC-001 (injection prevention, token exposure)
* ADR-SEC-003 (RBAC + ownership + assignment)
* ADR-SEC-004 (captcha + rate limiting en flujos sensibles)
* ADR-SEC-006 (CORS, CSRF, security headers, error handling seguro)
* Doc 14 §8.2 (orden de middlewares)
* Doc 14 §16 (diseño de cada middleware: alcance, input, output, error)
* Doc 14 §17 (authorization design: 401 vs 403 vs 404 enmascarado)
* Doc 19 (security design, captcha mock en tests)
* BR-AUTH-001 (auth obligatoria)
* BR-AUTH-011 (captcha obligatorio en register/login)

---

## 8. Documentation Alignment Required

No documentation alignment issues detected.

---

## 9. File Update Result

| Campo                                      | Valor                                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                       |
| User Story file path                       | `management/user-stories/US-091-middleware-pipeline.md`                                  |
| User Story ID verified                     | Yes                                                                                       |
| Decision Resolution artifact found         | No                                                                                        |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-091-decision-resolution.md`             |
| Refinement review artifact created/updated | Yes                                                                                       |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-091-refinement-review.md`                 |
| Final recommended status                   | Ready for Approval                                                                        |
| Next recommended skill                     | eventflow-user-story-approval                                                             |
| Reason                                     | Todos los issues son de calidad interna. No quedan preguntas bloqueantes. Los 14 middlewares, sus HTTP codes, el orden de pipeline, el mock de captcha y las VR de autorización están completamente especificados desde ADRs aceptados y Doc 14. |

---

## 10. Cambios Aplicados

### Metadata
* `Status`: Draft → Ready for Approval
* `Last Updated`: 2026-06-09 → 2026-06-11
* Título enriquecido: "Pipeline de middlewares global (Express)"

### User Story Statement
* Enriquecida: especifica 14 middlewares, Doc 14 §8.2, comportamiento seguro por defecto, y objetivo transversal.

### Business Context
* Agregado: ADR-SEC-003, ADR-SEC-004, ADR-SEC-006 como conceptos de dominio.
* Assumptions: mock de captcha en dev/test; JWT_SECRET en env vars; US-089/090 como prereqs.
* Dependencies: US-089 y US-090 como prereqs; feature stories como dependientes.

### Traceability
* `NFR Reference(s)`: NFR-SEC-001..004, NFR-SEC-007, NFR-OBS-003, NFR-OBS-006 (reemplazando IDs inexistentes).
* `Related ADR(s)`: agregados ADR-SEC-001, ADR-SEC-003, ADR-SEC-004, ADR-SEC-006.
* `Related Document(s)`: reducidos a /docs/14, /docs/16, /docs/19, /docs/20.
* `Business Rule(s)`: BR-AUTH-001 agregado junto a BR-AUTH-011.
* `API Endpoint(s)`: "Transversal — aplica a todos los endpoints protegidos de /api/v1".
* `Permission Rule(s)`: descripción específica por tipo de middleware.

### Scope Guardrails
* Out of Scope: CSRF token complejo, APM/distributed tracing, Google OAuth, rate limit estricto por feature.
* Scope Notes: clarificación sobre fileUploadMiddleware, ownershipMiddleware, rate limit scope.

### Acceptance Criteria
* AC-01 y AC-02 originales reemplazados por 8 AC específicos con HTTP codes, payloads y comportamientos observables.

### Edge Cases
* EC-01 original ("config faltante") removido — inaplicable.
* EC-01..EC-05 nuevos: correlationId ausente, JWT expirado/ausente, ownership violation, body oversized, CORS bloqueado.

### Validation Rules
* VR-01 original ("config — fail-fast") removido.
* VR-01..VR-06 con HTTP codes exactos y payloads de error para cada escenario de auth/validation.

### Authorization & Security Rules
* SEC-01..SEC-03 genéricos reemplazados por SEC-01..SEC-07 con reglas específicas por tipo de control.
* Negative Authorization Scenarios: tabla completa con 7 escenarios, HTTP codes y middleware responsable.

### Technical Notes
* Backend: tabla de 14 middlewares con alcance, comportamiento clave y código de error (Doc 14 §16).
* API: "Transversal" explícito.
* Observability: correlationId y logging requeridos con comportamiento específico.

### QA / Testing
* 15 test cases totales (6 funcionales + 9 negativos + 4 de autorización) con herramientas Vitest + Supertest.

### Task Breakdown
* 14 tareas de backend detalladas (una por middleware) + env vars.

### Definition of Ready / Done
* Checklist completo con ADRs de seguridad, HTTP codes, sin stack en 5xx, sin secrets en logs.

---

## 11. Recomendación Final

**Ready for Approval**

La historia US-091 está completamente alineada con ADR-SEC-001, ADR-SEC-003, ADR-SEC-004 y ADR-SEC-006 (todos aceptados), con el diseño de middlewares de Doc 14 §16 y el orden de pipeline de Doc 14 §8.2.

Los 8 AC son específicos y testeables: correlation ID, autenticación JWT, RBAC, rate limit, captcha, validación Zod, error envelope seguro y orden de registro. Los 9 NT cubren los escenarios de seguridad negativos críticos. Los VR documentan los HTTP codes exactos esperados (401 vs 403 vs 404 enmascarado).

No quedan preguntas pendientes bloqueantes.

**Próximo paso:** ejecutar `eventflow-user-story-approval` sobre US-091.
