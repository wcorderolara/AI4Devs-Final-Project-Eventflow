# User Story Refinement Review — US-110

## Source User Story File

`management/user-stories/US-110-rate-limiting-auth-and-ai.md`

## Decision Resolution Artifact

`management/user-stories/decision-resolutions/US-110-decision-resolution.md`

## Review Date

2026-06-16

## 1. Resultado Ejecutivo

| Campo | Evaluación |
| ----- | ---------- |
| User Story ID | US-110 |
| File Path | `management/user-stories/US-110-rate-limiting-auth-and-ai.md` |
| Backlog Item | PB-P0-007 — Rate limiting en login/recovery/AI y cadena de middlewares en orden |
| Epic | EPIC-SEC-001 — Security & Authorization |
| Estado actual | Draft |
| Estado recomendado | Needs Refinement |
| Nivel de riesgo | Alto |
| Calidad general | Baja |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Requiere decisión QA | Sí |
| Requiere decisión Seguridad | Sí |
| Decision Resolution artifact found | No |
| User Story file updated | No |
| Refinement review artifact created/updated | Yes |
| Refinement review path | `management/user-stories/refinement-reviews/US-110-refinement-review.md` |

US-110 es valiosa y pertenece al MVP porque mitiga fuerza bruta en autenticación, abuso de recuperación de contraseña y costo IA descontrolado. Sin embargo, la historia actual todavía es un placeholder genérico: no referencia PB-P0-007, no lista endpoints, no define buckets, no separa responsabilidades con US-091/US-109/US-111, no define comportamiento 429, y no fija umbrales para endpoints IA.

La historia **no debe actualizarse aún** porque faltan decisiones bloqueantes sobre el rate limit de endpoints IA y algunos detalles operativos de almacenamiento/estado. La parte de auth sí tiene decisiones suficientes en ADR-SEC-004 y Doc 16: login 10 intentos/IP/10 min, register 5/IP/10 min, password reset request 3/email/hora.

## 2. Diagnóstico PO/BA

La intención de negocio es correcta: proteger endpoints sensibles sin agregar fricción innecesaria al MVP. Está alineada con PB-P0-007, EPIC-SEC-001, Doc 16, Doc 19, Doc 20, Doc 21 y ADR-SEC-004. También complementa la decisión de US-091: US-091 cubre el rate limit global laxo del middleware pipeline; US-110 debe cubrir límites estrictos por endpoint sensible.

La historia actual no está lista para approval gate porque sus Acceptance Criteria no son específicos ni testeables. Además, mezcla tres subdominios con reglas distintas:

- Auth público: login, register y password reset request.
- AI authenticated endpoints: generación IA y posiblemente regeneración.
- Middleware chain / Helmet: parte de PB-P0-007, pero debe quedar en US-111 para evitar duplicación.

La corrección requiere decisiones PO/BA y técnicas antes de reescribir la historia original.

## 3. Hallazgos Principales

| Severidad | Hallazgo | Impacto | Recomendación |
| --------- | -------- | ------- | ------------- |
| Alta | La historia no referencia PB-P0-007 y mantiene trazabilidad genérica. | No queda claro el backlog item real ni su relación con US-111. | Resolver metadata y traceability contra PB-P0-007. |
| Alta | Acceptance Criteria actuales son placeholders no testeables. | QA no puede derivar tests de 429, headers, buckets, ventanas, keying ni exclusiones. | Reescribir ACs por endpoint, bucket, umbral, respuesta y observabilidad. |
| Alta | Umbrales de endpoints IA no están formalizados. | Riesgo de bloquear usuarios legítimos o permitir gasto OpenAI excesivo; no se puede aprobar sin política concreta. | PO/Tech/Security deben definir límites IA por usuario/evento/sesión y ventana. |
| Alta | No está definido el keying exacto para rate limit IA. | Sin keying no se puede implementar ni testear de forma consistente. | Definir si AI usa `userId`, `eventId`, feature, IP o combinación. |
| Media | La historia mezcla scope con US-111. | Puede duplicar orden de middleware y Helmet, generando historias solapadas. | US-110 debe limitarse a rate limiting; US-111 debe cubrir orden de middleware y Helmet. |
| Media | No aclara interacción con US-091. | Puede duplicar el rate limit global laxo o reemplazarlo incorrectamente. | Declarar que US-110 agrega límites estrictos por endpoint sobre la capa global de US-091. |
| Media | No define storage del rate limiter para MVP. | Implementación puede variar entre memoria, Redis/Memcached o DB sin criterio. | Confirmar almacenamiento por proceso para MVP, consistente con ADR-SEC-004, y dejar Redis/Memcached como futuro si se escala. |
| Media | No define headers ni error envelope de 429. | Frontend y QA no pueden verificar contrato estable. | Usar `RATE_LIMIT_EXCEEDED`, HTTP 429, `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining` cuando aplique. |
| Baja | AI Behavior es genérico y condicional. | Confunde la historia: rate limiting protege IA, pero no invoca LLM por sí misma. | Marcar como no invoca IA directamente; sólo envuelve endpoints IA existentes. |

## 4. Validación de Alcance MVP

| Check | Resultado | Comentario |
| ----- | --------- | ---------- |
| No introduce pagos reales | Pass | No aplica. |
| No introduce contratos firmados | Pass | No aplica. |
| No introduce WhatsApp/chat/push | Pass | No aplica. |
| Respeta human-in-the-loop IA | Pass | La historia no cambia HITL; sólo limita requests a endpoints IA. |
| Respeta backend como source of truth | Pass | Rate limiting debe ejecutarse en backend. |
| Respeta seed/demo si aplica | Pass | No requiere seed; sí requiere configuración demo/CI determinista. |
| No introduce RAG/vector DB | Pass | No aplica. |
| No introduce multi-tenant enterprise | Pass | No aplica. |
| No introduce P4/Future scope | Pass con condición | Debe evitar rate limiting avanzado enterprise; Redis/Memcached sólo como futuro si escala. |

## 5. Revisión de Acceptance Criteria

| AC | Calidad | Problema detectado | Acción recomendada |
| -- | ------- | ------------------ | ------------------ |
| AC-01 original | Not Testable | "Capacidad operativa" no describe endpoints, ventanas, límites, keying ni respuesta esperada. | Reemplazar por ACs específicos de auth y AI. |
| AC-02 original | Not Testable | "Smoke tests pasan" no valida rate limit ni casos negativos. | Reemplazar por pruebas verificables de 429, headers y no ejecución del handler. |

### Suggested Rewritten Acceptance Criteria

Estas propuestas deben aplicarse después de resolver las preguntas pendientes.

#### AC-01: Login aplica rate limit estricto por IP

**Given** un cliente anónimo supera 10 intentos contra `POST /api/v1/auth/login` desde la misma IP dentro de 10 minutos  
**When** envía otro intento dentro de la misma ventana  
**Then** el backend responde `429 RATE_LIMIT_EXCEEDED`, incluye `Retry-After` cuando aplique, no ejecuta validación de credenciales y registra un evento seguro de rate limit.

#### AC-02: Registro aplica rate limit estricto por IP

**Given** un cliente anónimo supera 5 intentos contra `POST /api/v1/auth/register` desde la misma IP dentro de 10 minutos  
**When** envía otro intento dentro de la misma ventana  
**Then** el backend responde `429 RATE_LIMIT_EXCEEDED` y no crea `User`, `Credential` ni `VendorProfile`.

#### AC-03: Password reset request aplica rate limit por email normalizado

**Given** un cliente solicita `POST /api/v1/auth/password/reset-request` más de 3 veces para el mismo email normalizado dentro de 1 hora  
**When** envía otra solicitud dentro de la misma ventana  
**Then** el backend responde `429 RATE_LIMIT_EXCEEDED`, no genera nuevo reset token, no dispara email simulado y mantiene mensajes anti-enumeración.

#### AC-04: AI generation endpoints aplican rate limit de costo controlado

**Given** un usuario autenticado supera el límite configurado para endpoints de generación IA  
**When** intenta invocar otro endpoint `POST /api/v1/.../ai/*` dentro de la ventana configurada  
**Then** el backend responde `429 RATE_LIMIT_EXCEEDED`, no llama a `LLMProvider`, no crea `AIRecommendation` nueva y registra el evento sin payload sensible.

#### AC-05: Configuración fail-fast para rate limit

**Given** variables de rate limit inválidas, ausentes o inseguras  
**When** la aplicación inicia  
**Then** el backend falla el boot con error seguro y accionable, sin exponer secretos ni stack trace al cliente.

#### AC-06: Headers y error envelope son consistentes

**Given** cualquier endpoint protegido por rate limit  
**When** la respuesta se emite antes o después de exceder el límite  
**Then** el backend usa el error envelope estándar con `RATE_LIMIT_EXCEEDED` para 429 y expone headers `X-RateLimit-Limit`, `X-RateLimit-Remaining` y `Retry-After` cuando aplique.

#### AC-07: Observabilidad segura

**Given** un request es rate limited  
**When** el backend registra el evento  
**Then** el log incluye `correlationId`, route pattern, limiter policy, key type, remaining/reset metadata y status, pero no incluye password, token captcha, reset token, prompt completo, respuesta LLM, cookies ni email completo.

#### AC-08: Tests cubren límites y exclusiones

**Given** la suite de backend se ejecuta en CI  
**When** corren tests unitarios e integración  
**Then** se verifica login/register/reset/AI con límite excedido, reset de ventana determinista, no ejecución del handler protegido, headers 429, y que endpoints fuera de scope no quedan rate limited por políticas estrictas.

## 6. Gaps Detectados

### Producto / Negocio

Falta decidir la política concreta para limitar costo IA sin romper la demo. El backlog indica "Rate limit IA protege costo OpenAI", pero no define límites, ventanas ni diferencias entre Local/CI/QA/Demo.

### Backend / API

Falta definir:

- Endpoints exactos protegidos por US-110.
- Keying por endpoint: IP, email normalizado, `userId`, `eventId`, feature, o combinación.
- Storage del rate limiter: memoria por proceso para MVP vs Redis/Memcached futuro.
- Comportamiento cuando `TRUST_PROXY=true` y hay proxies en QA/Demo.
- Si se incluyen headers de rate limit en respuestas no limitadas o sólo en 429.

### Frontend / UX

No requiere UI nueva, pero debe aclarar que el frontend consume `429 RATE_LIMIT_EXCEEDED` y muestra mensaje genérico/reintentable. No debe implementar decisiones de rate limit en cliente.

### Base de Datos

No se requieren tablas ni migraciones si se confirma storage por proceso para MVP. Si se decide persistir counters en DB, eso sería una decisión técnica adicional con mayor impacto y debe evaluarse contra alcance MVP.

### Seguridad / Autorización

Falta confirmar que:

- Login/register usan IP.
- Password reset request usa email normalizado sin revelar existencia de cuenta.
- IA usa usuario autenticado y ownership ya validado antes de consumir cuota costosa.
- Logs redactan PII y prompts.
- No se usa captcha token, password ni reset token como key.

### IA / PromptOps

La historia no invoca IA directamente, pero protege endpoints IA. Falta decidir si aplica a todos los endpoints de generación de Doc 16 §35.3 o sólo a subset MVP de P0/P1. También falta decidir si la regeneración US-026 usa este limiter o sólo el cap funcional de 5 regeneraciones.

### QA / Testing

Falta definir estrategia de tests deterministas para ventanas temporales y counters:

- Fake timers o clock inyectable.
- Reset de store entre tests.
- Pruebas de no llamada a `LLMProvider` al exceder límite.
- Pruebas de no creación de `AIRecommendation`.
- Pruebas de headers y error envelope.

### Seed / Demo

No requiere cambios de seed/demo. Sí requiere valores de env para Demo que no bloqueen el guion académico. Debe evitarse que la demo falle por límites demasiado agresivos durante repetición de flujos.

### Documentación / Trazabilidad

La historia debe actualizar trazabilidad a PB-P0-007, ADR-SEC-004, Doc 16 §10.4/§18.2/§35, Doc 19, Doc 20, Doc 21, US-091 y US-111. El texto actual aún referencia PB/FR/UC genéricos.

## 7. Preguntas Pendientes

| Tipo | Pregunta | Bloquea aprobación | Responsable |
| ---- | -------- | ------------------ | ----------- |
| PO / Security | ¿Qué endpoints exactos de IA protege US-110: todos los `POST /api/v1/.../ai/*` de Doc 16 §35.3, sólo los endpoints MVP Must Have, o sólo generación con proveedor real? | Sí | Product Owner + Security Lead |
| PO / Tech | ¿Cuál es el límite por defecto para AI generation endpoints y su ventana? Ejemplo a decidir: `AI_RATE_LIMIT_MAX=10` por usuario por hora, o límites por feature. | Sí | Product Owner + Tech Lead |
| Tech / Security | ¿Cuál será la key del limiter IA: `userId`, `userId + feature`, `userId + eventId + feature`, IP, o combinación? | Sí | Tech Lead + Security Lead |
| PO / Tech | ¿El límite IA debe variar por entorno (`Local/CI`, `QA`, `Demo`, `Production-like`) para proteger demo sin afectar tests deterministas? | Sí | Product Owner + Tech Lead |
| Tech | ¿El storage MVP del rate limiter será in-memory por proceso, como sugiere ADR-SEC-004, dejando Redis/Memcached como futuro si escala? | Sí | Tech Lead |
| QA | ¿La suite debe usar fake timers/clock inyectable y store reseteable para validar ventanas sin esperas reales? | Sí | QA Lead |
| Security | ¿Qué campos se permiten en logs de rate limit y cuáles quedan prohibidos para auth y AI? | Sí | Security Lead |
| PO / BA | ¿US-110 excluye explícitamente orden de middlewares y Helmet, delegándolos a US-111, aunque PB-P0-007 los mencione juntos? | Sí | Product Owner / BA |

## 8. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| NFR-SEC-004 / BR-AUTH-011 vs ADR-SEC-004 / Doc 16 | Algunos documentos describen captcha/anti-bot en registro/login, mientras ADR-SEC-004 y Doc 16 incluyen también password reset request y rate limit. | Para rate limit auth: login, register y password reset request aplican con umbrales de ADR-SEC-004. | Alinear BR/NFR en revisión documental futura. | No |
| Doc 14 | Menciona rate limiting por IP global laxo, por IP estricto en auth y crear QuoteRequest; PB-P0-007 menciona AI generations. | US-091 ya cubre global laxo; US-110 debe cubrir auth y AI según PB-P0-007. QuoteRequest no entra en US-110 salvo decisión futura. | Documentar alcance de US-110 y no extender a QuoteRequest. | No |
| PB-P0-007 | Incluye rate limiting, orden de middlewares y Helmet en el mismo backlog item. | US-110 debe cubrir rate limiting; US-111 debe cubrir orden de middlewares y Helmet si se confirma. | Formalizar separación US-110/US-111 en decision resolution. | Sí, hasta confirmación PO/BA |

## 9. File Update Result

| Campo | Valor |
| ----- | ----- |
| User Story file updated | No |
| User Story file path | `management/user-stories/US-110-rate-limiting-auth-and-ai.md` |
| User Story ID verified | Yes |
| Decision Resolution artifact found | No |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-110-decision-resolution.md` |
| Refinement review artifact created/updated | Yes |
| Refinement review path | `management/user-stories/refinement-reviews/US-110-refinement-review.md` |
| Final recommended status | Needs Refinement |
| Next recommended skill | `eventflow-po-ba-decision-resolver` |
| Reason | Existen preguntas bloqueantes sobre límites y keying de endpoints IA, storage del rate limiter, strategy QA y separación de scope con US-111. |

## 10. Recomendación Final

`Needs Refinement`.

No se actualizó `management/user-stories/US-110-rate-limiting-auth-and-ai.md` porque la historia aún requiere decisiones PO/Tech/QA/Security antes de poder refinarse de forma segura. El siguiente paso recomendado es ejecutar `eventflow-po-ba-decision-resolver` usando este artifact para formalizar la política de rate limiting de IA, la estrategia de almacenamiento MVP, la separación con US-111 y los criterios de QA.
