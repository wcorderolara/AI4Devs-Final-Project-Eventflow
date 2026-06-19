# PO/BA Decision Resolution — US-110

## Source User Story File

`management/user-stories/US-110-rate-limiting-auth-and-ai.md`

## Source Refinement Review File

`management/user-stories/refinement-reviews/US-110-refinement-review.md`

## Decision Date

2026-06-16

## 1. Resumen Ejecutivo

| Campo | Valor |
| ----- | ----- |
| User Story ID | US-110 |
| User Story file path | `management/user-stories/US-110-rate-limiting-auth-and-ai.md` |
| Refinement review artifact path | `management/user-stories/refinement-reviews/US-110-refinement-review.md` |
| Existing decision resolution found | No |
| Backlog Item | PB-P0-007 — Rate limiting en login/recovery/AI y cadena de middlewares en orden |
| Epic | EPIC-SEC-001 |
| Estado antes de decisiones | Needs Refinement / Draft |
| Cantidad de preguntas revisadas | 8 |
| Decisiones PO/BA tomadas | 8 |
| Decisiones técnicas recomendadas | 3, aplicadas por estar alineadas con ADR-SEC-004, Doc 14, Doc 16 y Doc 20 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |
| Decision Resolution artifact created/updated | Yes |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-110-decision-resolution.md` |
| Próximo paso recomendado | `eventflow-user-story-refinement` opcional o `eventflow-user-story-approval` |

Las preguntas bloqueantes de US-110 fueron resueltas. La User Story fue reescrita para cubrir rate limiting estricto de auth y endpoints IA, con separación explícita frente a US-111. El estado queda en `Ready for Approval`.

## 2. Decisiones Respondidas

### Decisión 1 — Endpoints IA cubiertos por US-110

#### Pregunta original

> ¿Qué endpoints exactos de IA protege US-110: todos los `POST /api/v1/.../ai/*` de Doc 16 §35.3, sólo los endpoints MVP Must Have, o sólo generación con proveedor real?

#### Respuesta PO/BA

US-110 protege todos los endpoints `POST` de generación IA implementados en el MVP bajo `/api/v1/.../ai/*`, conforme a Doc 16 §35.3. No protege `GET /ai-recommendations/:id`, `apply` ni `discard`, porque esas operaciones no invocan generación LLM. Si un endpoint IA futuro/optional no se implementa en el MVP, US-110 no lo crea.

#### Decisión formal

```text
US-110 aplica rate limiting a endpoints POST de generación IA implementados en el MVP. No crea endpoints IA nuevos y no aplica a lectura/aplicación/descarte de AIRecommendation.
```

#### Rationale

PB-P0-007 indica que el rate limit IA protege costo OpenAI. El costo se produce en generación, no en lectura ni aplicación HITL. Esta decisión protege el MVP sin expandir scope.

#### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| PO/BA Decisions Applied | Agregar endpoints IA cubiertos. |
| Acceptance Criteria | Agregar AC de AI generation. |
| API | Listar endpoints IA cubiertos. |
| Out of Scope | Indicar que no se crean endpoints IA futuros. |

#### ¿Bloqueaba aprobación?

Sí. Resuelto.

---

### Decisión 2 — Límite default para AI generation

#### Pregunta original

> ¿Cuál es el límite por defecto para AI generation endpoints y su ventana?

#### Respuesta PO/BA

El default MVP será `AI_RATE_LIMIT_MAX=10` generaciones por usuario autenticado por ventana de `AI_RATE_LIMIT_WINDOW_MS=3600000` (1 hora), agregado a través de los endpoints IA cubiertos.

#### Decisión formal

```text
AI generation usa un límite default de 10 generaciones por usuario autenticado por 1 hora, configurable por env vars.
```

#### Rationale

Doc 20 indica que el costo IA debe controlarse con máximo configurable por sesión. PB-P0-007 identifica explícitamente el riesgo de costo OpenAI. Diez generaciones por hora permite completar el guion demo normal sin permitir abuso sostenido.

#### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| PO/BA Decisions Applied | Agregar default IA. |
| Acceptance Criteria | Definir límite de 10/user/hora. |
| Technical Notes | Agregar env vars. |
| Test Scenarios | Agregar pruebas de límite IA. |

#### ¿Bloqueaba aprobación?

Sí. Resuelto.

---

### Decisión 3 — Key del limiter IA

#### Pregunta original

> ¿Cuál será la key del limiter IA: `userId`, `userId + feature`, `userId + eventId + feature`, IP, o combinación?

#### Respuesta PO/BA

La key canónica será `ai:user:{userId}`. El backend puede registrar `feature` y route pattern para observabilidad, pero el límite default es agregado por usuario para controlar costo total.

#### Decisión formal

```text
AI rate limiting usa key agregada por usuario autenticado: `ai:user:{userId}`. Feature y route pattern son metadatos de observabilidad, no keys default.
```

#### Rationale

Un límite por feature permitiría multiplicar costos recorriendo varias features IA. Un límite por evento sería útil a futuro, pero complica el MVP. El límite por usuario es simple, testeable y protege costo total.

#### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| PO/BA Decisions Applied | Agregar key canónica IA. |
| Validation Rules | Agregar VR para `ai:user:{userId}`. |
| Security Rules | Evitar keys sensibles. |
| Observability | Registrar key type y key hash/redacted. |

#### ¿Bloqueaba aprobación?

Sí. Resuelto.

---

### Decisión 4 — Comportamiento por entorno

#### Pregunta original

> ¿El límite IA debe variar por entorno (`Local/CI`, `QA`, `Demo`, `Production-like`) para proteger demo sin afectar tests deterministas?

#### Respuesta PO/BA

QA/Demo usan defaults seguros salvo override explícito documentado. Local/CI pueden sobrescribir valores con ventanas y máximos pequeños para tests deterministas. Demo no desactiva rate limit.

#### Decisión formal

```text
Rate limiting permanece activo en todos los entornos MVP. Local/CI pueden usar overrides de test; QA/Demo usan defaults seguros o overrides documentados, nunca desactivación silenciosa.
```

#### Rationale

Demo-first no significa desactivar controles de seguridad. La demo debe ser reproducible y segura; los tests necesitan valores pequeños para no esperar ventanas reales.

#### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| PO/BA Decisions Applied | Agregar comportamiento por entorno. |
| Edge Cases | Agregar caso demo rate limited. |
| DevOps / Config | Documentar env vars. |
| Seed / Demo Tests | Agregar smoke demo. |

#### ¿Bloqueaba aprobación?

Sí. Resuelto.

---

### Decisión 5 — Storage MVP del rate limiter

#### Pregunta original

> ¿El storage MVP del rate limiter será in-memory por proceso, como sugiere ADR-SEC-004, dejando Redis/Memcached como futuro si escala?

#### Respuesta PO/BA

Sí. El storage MVP será in-memory per process. Redis/Memcached o rate limiting distribuido queda fuera de scope hasta que exista escalamiento horizontal real.

#### Decisión formal

```text
US-110 usa rate limiter in-memory por proceso para MVP. Redis/Memcached/distributed rate limiting queda fuera de scope y requiere decisión futura si se escala.
```

#### Rationale

ADR-SEC-004 indica almacenamiento por proceso y Memcached/Redis sólo si se escala. Para MVP académico/demo, in-memory reduce complejidad y evita nuevas dependencias.

#### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| Assumptions | Agregar in-memory per process. |
| Scope Guardrails | Excluir Redis/Memcached. |
| Technical Notes | Definir store MVP. |
| Database | Confirmar sin persistencia. |

#### ¿Bloqueaba aprobación?

Sí. Resuelto.

---

### Decisión 6 — Estrategia QA para ventanas y counters

#### Pregunta original

> ¿La suite debe usar fake timers/clock inyectable y store reseteable para validar ventanas sin esperas reales?

#### Respuesta PO/BA

Sí. La suite debe usar fake timers o clock inyectable y store reseteable para validar ventanas sin esperas reales ni contaminación entre tests.

#### Decisión formal

```text
QA valida rate limiting con fake timers o clock inyectable y store reseteable. No se usan esperas reales para probar ventanas.
```

#### Rationale

Doc 20 exige pruebas determinísticas en CI. Esperar ventanas reales haría la suite lenta y frágil.

#### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| PO/BA Decisions Applied | Agregar QA strategy. |
| Test Scenarios | Agregar fake timers/store reset. |
| Definition of Done | Requerir tests determinísticos. |

#### ¿Bloqueaba aprobación?

Sí. Resuelto.

---

### Decisión 7 — Campos permitidos y prohibidos en logs

#### Pregunta original

> ¿Qué campos se permiten en logs de rate limit y cuáles quedan prohibidos para auth y AI?

#### Respuesta PO/BA

Permitidos: `correlationId`, route pattern, limiter policy, key type, hashed/normalized key identifier, remaining/reset metadata y status. Prohibidos: password, cookies, JWT, reset tokens, captcha tokens, prompt completo, respuesta LLM, secrets, email completo y raw request body.

#### Decisión formal

```text
Rate limit logs son estructurados y redactados: permiten metadata operativa mínima y prohíben secretos, tokens, credenciales, prompts completos, respuestas LLM, email completo y raw body.
```

#### Rationale

ADR-SEC-001 y Doc 14 exigen no exponer tokens, secretos ni PII innecesaria. Rate limiting requiere observabilidad, pero no payload sensible.

#### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| Authorization & Security Rules | Agregar redacción. |
| Observability / Audit | Listar campos permitidos/prohibidos. |
| Security Tests | Agregar pruebas de logs. |

#### ¿Bloqueaba aprobación?

Sí. Resuelto.

---

### Decisión 8 — Separación US-110 vs US-111

#### Pregunta original

> ¿US-110 excluye explícitamente orden de middlewares y Helmet, delegándolos a US-111, aunque PB-P0-007 los mencione juntos?

#### Respuesta PO/BA

Sí. US-110 cubre políticas de rate limiting. US-111 cubre orden de middlewares, `helmet`, CORS y error handler. PB-P0-007 agrupa ambos temas, pero las historias separan responsabilidades para evitar duplicidad.

#### Decisión formal

```text
US-110 excluye orden de middlewares, Helmet y CORS. US-111 los cubre. US-110 sólo debe integrarse en la posición definida por el pipeline.
```

#### Rationale

US-111 ya fue refinada para cubrir middleware chain order y hardening global. Mantener US-110 enfocada evita historias solapadas y facilita tareas técnicas.

#### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| PO/BA Decisions Applied | Agregar separación US-111. |
| Scope Guardrails | Excluir orden/Helmet/CORS. |
| Dependencies | Referenciar US-111. |
| Documentation Alignment | Registrar separación no bloqueante. |

#### ¿Bloqueaba aprobación?

Sí. Resuelto.

## 3. Consolidated Decision Table

| # | Tema | Decisión | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
| --: | ---- | -------- | ---- | ---------------------- | -------------------- |
| 1 | Endpoints IA cubiertos | POST de generación IA implementados en MVP; no GET/apply/discard | PO / Security | Sí | No requiere |
| 2 | Límite IA default | 10 generaciones/user/1 h | PO / Tech | Sí | No requiere |
| 3 | Key IA | `ai:user:{userId}` | Tech / Security | Sí | No requiere |
| 4 | Entornos | Activo en todos; Local/CI pueden override para tests | PO / Tech | Sí | No requiere |
| 5 | Storage | In-memory per process; Redis/Memcached futuro | Tech | Sí | No requiere |
| 6 | QA | Fake timers/clock inyectable + store reseteable | QA | Sí | No requiere |
| 7 | Logs | Metadata segura permitida; secretos/PII/prompt prohibidos | Security | Sí | No requiere |
| 8 | Scope vs US-111 | US-110 rate limit; US-111 orden/Helmet/CORS | PO / BA | Sí | No requiere |

## 4. Cambios Aplicados a la User Story

| Sección | Cambio aplicado |
| ------- | --------------- |
| Metadata | Status cambiado a `Ready for Approval`; módulo actualizado a `Security / Identity Access / AI Assistance`; Last Updated `2026-06-16`. |
| User Story | Reescrita con foco en auth + AI rate limiting. |
| Business Context | Contexto ampliado, dependencias reales y sección `PO/BA Decisions Applied`. |
| Traceability | Referencias actualizadas a PB-P0-007, FR/UC/BR/NFR/ADR/docs aplicables. |
| Scope Guardrails | Out-of-scope explícito para US-111, US-109, US-108, Redis/Memcached, DB counters y scope no MVP. |
| Acceptance Criteria | Reescritos 8 ACs testeables. |
| Edge Cases | Agregados casos de proxy/IP, email inválido, expiración de ventana y demo. |
| Validation Rules | Agregadas reglas de env vars, keying y no side effects. |
| Security Rules | Agregadas reglas de backend-only, keying seguro, anti-enumeración y redacción. |
| AI Behavior | Marcado como no invoca IA; define no llamada a `LLMProvider` si rate limited. |
| Technical Notes | Agregados defaults de configuración, store MVP, endpoints y observabilidad. |
| Test Scenarios | Agregados tests funcionales, negativos, AI, authorization, security y demo. |
| Definition of Ready / Done | Agregadas checklists específicas. |

## 5. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| NFR-SEC-004 / BR-AUTH-011 vs ADR-SEC-004 / Doc 16 | Algunos documentos enfatizan captcha/anti-bot en register/login, mientras ADR-SEC-004 y Doc 16 incluyen password reset request y rate limit. | Rate limit auth aplica a login, register y password reset request con umbrales de ADR-SEC-004. | Alinear BR/NFR en revisión documental futura. | No |
| Doc 14 | Menciona rate limit por IP global laxo, por IP estricto en auth y crear QuoteRequest; PB-P0-007 menciona AI generations. | US-091 cubre global laxo; US-110 cubre auth y AI. QuoteRequest no entra en US-110. | Documentar QuoteRequest rate limit en historia futura si se promueve. | No |
| PB-P0-007 | Agrupa rate limiting, middleware order y Helmet. | US-110 cubre rate limiting; US-111 cubre middleware order, Helmet y CORS. | Mantener separación en technical specs y tasks. | No |
| Doc 16 §35.3 | Lista endpoint `POST /vendors/me/ai/bio`, pero vendor AI bio/package puede ser future/optional según guardrails. | US-110 sólo protege endpoints IA implementados en MVP; no crea endpoints futuros. | Si AI-007 se mantiene fuera del MVP, no generar ruta por US-110. | No |

## 6. Estado recomendado después de aplicar decisiones

**Ready for Approval**

Todas las preguntas bloqueantes fueron resueltas y aplicadas en la User Story. No quedan blockers de PO, Tech, QA ni Security para pasar al approval gate.

## 7. Próximo Paso Recomendado

```text
Ejecutar eventflow-user-story-refinement opcional para una segunda validación, o avanzar directamente a eventflow-user-story-approval para US-110.
```
