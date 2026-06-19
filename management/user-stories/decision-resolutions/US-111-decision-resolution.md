# PO/BA Decision Resolution — US-111

## Source User Story File

`management/user-stories/US-111-middleware-chain-order.md`

## Source Refinement Review File

`management/user-stories/refinement-reviews/US-111-refinement-review.md`

## Decision Date

2026-06-16

## 1. Resumen Ejecutivo

| Campo | Valor |
| ----- | ----- |
| User Story ID | US-111 |
| User Story file path | `management/user-stories/US-111-middleware-chain-order.md` |
| Refinement review artifact path | `management/user-stories/refinement-reviews/US-111-refinement-review.md` |
| Existing decision resolution found | No |
| Backlog Item | PB-P0-007 — Rate limiting en login/recovery/AI y cadena de middlewares en orden |
| Epic | EPIC-SEC-001 |
| Estado antes de decisiones | Ready for Approval |
| Cantidad de preguntas revisadas | 0 preguntas bloqueantes; 5 decisiones ya aplicadas formalizadas |
| Decisiones PO/BA tomadas | 5 |
| Decisiones técnicas recomendadas | 0 nuevas; se aplican decisiones existentes de PB-P0-007, Doc 14, Doc 16, ADR-SEC-003, ADR-SEC-006 y US-091 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | No |
| Decision Resolution artifact created/updated | Yes |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-111-decision-resolution.md` |
| Próximo paso recomendado | `eventflow-user-story-approval` |

El refinement review de US-111 no contiene preguntas pendientes bloqueantes. La User Story ya fue refinada y contiene una sección `PO/BA Decisions Applied` suficiente para evitar reabrir decisiones. Este artifact formaliza esas decisiones sin modificar la historia original.

## 2. Decisiones Respondidas

### Decisión 1 — Scope de US-111

#### Pregunta original

No hubo pregunta bloqueante. El refinement review identificó posible solapamiento con US-110 y lo dejó resuelto en la User Story.

#### Respuesta PO/BA

US-111 cubre exclusivamente el orden seguro de middlewares, la aplicación global de `helmet`/CORS/error handler y los tests que verifican la composición del pipeline.

#### Decisión formal

```text
US-111 cubre middleware chain order, `helmet`, CORS, `notFoundMiddleware`, `errorHandlerMiddleware` y pruebas de composición. No define umbrales, ventanas ni keying de rate limit.
```

#### Rationale

PB-P0-007 agrupa rate limiting y middleware order, pero separar US-110 y US-111 evita duplicidad y mantiene historias implementables. US-110 resuelve políticas de rate limit; US-111 valida composición y hardening global.

#### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| PO/BA Decisions Applied | Ya aplicado. |
| Scope Guardrails | Ya aplicado. |
| Dependencies | Ya aplicado. |

#### ¿Bloqueaba aprobación?

No. Formalizado.

---

### Decisión 2 — Orden canónico por ruta protegida

#### Pregunta original

No hubo pregunta bloqueante. La historia refinada ya contiene la secuencia requerida.

#### Respuesta PO/BA

Las rutas protegidas deben ejecutar autenticación antes de rol, rol antes de ownership/assignment, ownership/policy antes de validación y validación antes del handler.

#### Decisión formal

```text
El orden canónico por ruta protegida es `authMiddleware → roleMiddleware → ownershipMiddleware/assignmentMiddleware → policyMiddleware → validateRequestMiddleware → handler`.
```

#### Rationale

ADR-SEC-003 exige RBAC + ownership + assignment en backend. Ejecutar validation antes de auth puede filtrar detalles a usuarios anónimos; ejecutar handler antes de authorization crea bypasses.

#### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| Acceptance Criteria | Ya aplicado en AC-02 y AC-07. |
| Validation Rules | Ya aplicado en VR-04. |
| Authorization & Security Rules | Ya aplicado en SEC-01..SEC-05. |

#### ¿Bloqueaba aprobación?

No. Formalizado.

---

### Decisión 3 — Orden global y hardening HTTP

#### Pregunta original

No hubo pregunta bloqueante. El refinement review detectó que `helmet` y CORS no estaban descritos en el placeholder original y fueron incorporados.

#### Respuesta PO/BA

El pipeline global debe garantizar `correlationId` antes de logging y rutas, CORS y `helmet` globales, body parser limitado, rutas `/api/v1`, `notFoundMiddleware` después de rutas y `errorHandlerMiddleware` al final.

#### Decisión formal

```text
El pipeline global de US-111 incluye `correlationIdMiddleware`, logging, CORS, `helmet`, body parser limitado, global rate limit laxo, rutas `/api/v1`, `notFoundMiddleware` y `errorHandlerMiddleware` en orden determinístico.
```

#### Rationale

ADR-SEC-006 exige CORS allowlist, security headers y safe error handling. Doc 14 define `app.ts`/`server.ts` con orden correcto de middlewares, `notFoundMiddleware` penúltimo y `errorHandlerMiddleware` último.

#### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| Acceptance Criteria | Ya aplicado en AC-01, AC-04, AC-05 y AC-06. |
| Technical Notes | Ya aplicado. |
| Test Scenarios | Ya aplicado. |

#### ¿Bloqueaba aprobación?

No. Formalizado.

---

### Decisión 4 — Backend como source of truth

#### Pregunta original

No hubo pregunta bloqueante. La historia refinada ya expresa esta decisión.

#### Respuesta PO/BA

El frontend puede reflejar UX, pero toda autorización efectiva se valida en backend mediante `authMiddleware`, `roleMiddleware`, `ownershipMiddleware`, assignment checks y policies antes del handler.

#### Decisión formal

```text
US-111 preserva backend as source of truth: autorización y ownership se verifican en backend antes de ejecutar handlers o side effects.
```

#### Rationale

ADR-SEC-003 y los principios EventFlow exigen que el frontend no sea fuente de verdad de autorización. Esta decisión previene bypasses y fugas de datos entre roles/owners.

#### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| Authorization & Security Rules | Ya aplicado. |
| Negative Authorization Scenarios | Ya aplicado. |
| Acceptance Criteria | Ya aplicado en AC-02 y AC-08. |

#### ¿Bloqueaba aprobación?

No. Formalizado.

---

### Decisión 5 — Error handling seguro y observabilidad

#### Pregunta original

No hubo pregunta bloqueante. La historia refinada ya cubre error envelope, `correlationId` y redacción.

#### Respuesta PO/BA

Todo error generado por middleware o handler debe pasar a `errorHandlerMiddleware`, devolver error envelope estándar con `correlationId`, registrar logs estructurados y no exponer stack traces, SQL, tokens, cookies, prompts completos, secrets ni PII innecesaria.

#### Decisión formal

```text
`errorHandlerMiddleware` es el último middleware global y responde con envelope seguro, `correlationId` y redacción estricta de datos sensibles.
```

#### Rationale

ADR-SEC-001, ADR-SEC-006 y ADR-API-002 exigen evitar exposición de tokens/secrets y usar error envelope estándar. La observabilidad debe preservar trazabilidad sin filtrar datos sensibles.

#### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| Acceptance Criteria | Ya aplicado en AC-05 y AC-08. |
| Observability / Audit | Ya aplicado. |
| Security Tests | Ya aplicado. |

#### ¿Bloqueaba aprobación?

No. Formalizado.

## 3. Consolidated Decision Table

| # | Tema | Decisión | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
| --: | ---- | -------- | ---- | ---------------------- | -------------------- |
| 1 | Scope US-111 | US-111 cubre orden de middlewares, `helmet`, CORS, `notFound` y `errorHandler`; no rate limit thresholds | PO / BA | No | No requiere |
| 2 | Orden por ruta protegida | `auth → role → ownership/assignment → policy → validation → handler` | Security / Architecture | No | No requiere |
| 3 | Orden global | Correlation/logging/CORS/helmet/body limit/rutas/notFound/errorHandler en orden determinístico | Architecture / Security | No | No requiere |
| 4 | Backend source of truth | AuthZ/ownership/policy se verifican en backend antes del handler | Security | No | No requiere |
| 5 | Error handling seguro | Error envelope con `correlationId`, sin stack/secrets/tokens/PII sensible | Security / API | No | No requiere |

## 4. Cambios Aplicados a la User Story

| Sección | Cambio aplicado |
| ------- | --------------- |
| Metadata | Sin cambios en este ciclo; ya estaba `Ready for Approval`. |
| PO/BA Decisions Applied | Sin cambios; decisiones ya estaban aplicadas. |
| Acceptance Criteria | Sin cambios; ACs ya estaban testeables y completos. |
| Scope Guardrails | Sin cambios; separación con US-110/US-109/US-108 ya estaba explícita. |
| Security / QA / Technical Notes | Sin cambios; refinement previo ya resolvió los gaps. |

No se modificó `management/user-stories/US-111-middleware-chain-order.md` porque no existían blockers ni decisiones nuevas que aplicar. Este artifact formaliza las decisiones ya presentes.

## 5. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| PB-P0-007 vs separación US-110/US-111 | PB-P0-007 agrupa rate limiting, orden de middlewares y Helmet; las historias los separan para ejecución. | US-110 cubre políticas de rate limit; US-111 cubre orden de middlewares, Helmet y CORS. | Mantener separación en technical specs y development tasks. | No |
| Doc 14 order table vs PB-P0-007 simplified order | Doc 14 lista middlewares globales adicionales; PB-P0-007 resume la cadena de seguridad de ruta. | US-111 consolida ambos: orden global completo + orden protegido resumido. | No requiere cambio documental; usar US-111 como consolidación para spec. | No |

## 6. Estado recomendado después de aplicar decisiones

**Ready for Approval**

US-111 no tenía preguntas pendientes. Las decisiones ya aplicadas fueron formalizadas y la historia permanece lista para el approval gate.

## 7. Próximo Paso Recomendado

```text
Ejecutar eventflow-user-story-approval para US-111.
```
