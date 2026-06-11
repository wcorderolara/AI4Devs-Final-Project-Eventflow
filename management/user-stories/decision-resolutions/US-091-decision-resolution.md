# PO/BA Decision Resolution — US-091

## Source User Story File
management/user-stories/US-091-middleware-pipeline.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-091-refinement-review.md

## Decision Date
2026-06-11

---

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                              |
| -------------------------------------------- | ------------------------------------------------------------------ |
| User Story ID                                | US-091                                                             |
| User Story file path                         | management/user-stories/US-091-middleware-pipeline.md             |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-091-refinement-review.md |
| Existing decision resolution found           | No                                                                 |
| Backlog Item                                 | PB-P0-002 — Backend Modular Monolith Bootstrap                     |
| Epic                                         | EPIC-BE-001 — Backend Modular Monolith                             |
| Estado antes de decisiones                   | Ready for Approval (refinement ya aplicado en ciclo anterior)      |
| Cantidad de preguntas revisadas              | 0 bloqueantes · 0 Documentation Alignment Required                 |
| Decisiones PO/BA tomadas                     | 7 (formalizadas desde decisiones ya aplicadas en refinement)       |
| Decisiones técnicas recomendadas             | 0                                                                  |
| ¿Desbloquea aprobación?                      | N/A — no había bloqueantes; se formaliza el estado existente       |
| User Story file updated                      | Yes (sección `PO/BA Decisions Applied` agregada)                   |
| Decision Resolution artifact created/updated | Yes                                                                |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-091-decision-resolution.md |
| Próximo paso recomendado                     | Run `eventflow-user-story-approval`                                |

---

## Contexto de esta ejecución

La US-091 llegó a este skill con **status Ready for Approval** tras el ciclo de refinement previo. El refinement review reportó cero preguntas bloqueantes y ningún item de Documentation Alignment Required. Todos los issues eran de calidad interna (AC no testeables, NFR IDs incorrectos, ADRs de seguridad ausentes, tabla de negative scenarios vacía) y fueron resueltos directamente usando ADRs aceptados (ADR-SEC-001/003/004/006) y Doc 14 §8.2/§16/§17 y Doc 19.

Este ciclo tiene como único objetivo:
1. Formalizar las decisiones aplicadas en `PO/BA Decisions Applied` dentro de la US.
2. Crear el Decision Resolution artifact como registro permanente.

---

## 2. Decisiones Respondidas

### Decisión 1 — NFR IDs aplicables al pipeline de middlewares

#### Pregunta original

> `NFR-PERF-API-001` y `NFR-OBS-001` referenciados en el Draft no existen o no aplican. ¿Cuáles son los NFR IDs correctos para US-091?

#### Respuesta PO/BA

Los NFR aplicables al pipeline de middlewares de seguridad son:
- **NFR-SEC-001**: Autenticación requerida en todos los endpoints protegidos — `authMiddleware` lo implementa.
- **NFR-SEC-002**: Tokens firmados con HMAC-SHA256 y expiración — aplica al JWT verificado por `authMiddleware`.
- **NFR-SEC-003**: RBAC con roles predefinidos — `roleMiddleware` lo implementa.
- **NFR-SEC-004**: Rate limiting en flujos de auth — `rateLimitMiddleware` + `captchaVerificationMiddleware` lo implementan.
- **NFR-SEC-007**: Headers HTTP de seguridad activos en todas las respuestas — `helmet` lo implementa.
- **NFR-OBS-003**: Log de intentos fallidos de autenticación — `requestLoggerMiddleware` + `authMiddleware` lo implementan.
- **NFR-OBS-006**: Logging estructurado a stdout suficiente — aplica a todos los middlewares de logging.

`NFR-PERF-API-001` no existe en Doc 10. `NFR-OBS-001` aplica exclusivamente a AdminAction logging de acciones administrativas, no al logging de fallos de autenticación.

#### Decisión formal

```
Los NFR IDs aplicables a US-091 son: NFR-SEC-001, NFR-SEC-002, NFR-SEC-003,
NFR-SEC-004, NFR-SEC-007, NFR-OBS-003, NFR-OBS-006.
NFR-PERF-API-001 es un ID inexistente y debe eliminarse de cualquier referencia.
NFR-OBS-001 no aplica a historias de pipeline de middlewares.
```

#### Rationale

Los NFR IDs deben existir en Doc 10 y ser relevantes para el comportamiento de la historia. US-091 implementa el stack de seguridad transversal del backend; los NFRs de seguridad y observabilidad son directamente verificables contra los AC de esta US.

#### Impacto en la User Story

| Sección       | Cambio                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| Traceability  | `NFR Reference(s)` actualizado a los 7 IDs correctos. Ya aplicado.      |
| PO/BA Decisions Applied | Decisión formalizada.                                           |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 2 — ADRs centrales del pipeline de middlewares

#### Pregunta original

> El Draft no referenciaba ADR-SEC-001, ADR-SEC-003, ADR-SEC-004 ni ADR-SEC-006. ¿Cuáles son los ADRs aplicables?

#### Respuesta PO/BA

Los ADRs aplicables y ya aceptados para el pipeline de middlewares de EventFlow son:

- **ADR-BE-001**: Express.js + TypeScript como framework del backend — base tecnológica de todos los middlewares.
- **ADR-SEC-001**: Prevención de inyección y exposición de tokens — aplica a `authMiddleware` (JWT) y `errorHandlerMiddleware` (sin stack en responses).
- **ADR-SEC-003**: RBAC + ownership + assignment como modelo de autorización — aplica a `roleMiddleware` y `ownershipMiddleware`.
- **ADR-SEC-004**: Captcha + rate limiting en flujos sensibles — aplica a `captchaVerificationMiddleware` y `rateLimitMiddleware`.
- **ADR-SEC-006**: CORS, security headers, CSRF mitigado por SameSite, error handling seguro — aplica a `corsMiddleware`, `helmet` y `errorHandlerMiddleware`.

Estos ADRs están aceptados y son vinculantes. Su ausencia en el Draft impedía que los desarrolladores identificaran las decisiones de seguridad que gobiernan cada middleware.

#### Decisión formal

```
Los ADRs aplicables a US-091 son: ADR-BE-001, ADR-SEC-001, ADR-SEC-003,
ADR-SEC-004, ADR-SEC-006. Todos están aceptados y son vinculantes.
No se requieren nuevas ADRs para esta US.
```

#### Rationale

Las ADRs de seguridad deben estar explícitamente referenciadas en la US para que el Tech Lead pueda verificar que la implementación las respeta. Sin estas referencias, los desarrolladores podrían implementar el pipeline ignorando decisiones de arquitectura ya tomadas.

#### Impacto en la User Story

| Sección              | Cambio                                                                    |
| -------------------- | ------------------------------------------------------------------------- |
| Traceability         | `Related ADR(s)` actualizado. Ya aplicado.                                |
| Authorization & Security Rules | SEC-01..SEC-07 referencian los ADRs específicos.            |
| PO/BA Decisions Applied | Decisión formalizada.                                                 |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 3 — Distinción 401 vs 403 vs 404 enmascarado

#### Pregunta original

> ¿Qué código HTTP retorna cada middleware de autorización en escenario negativo? ¿Cuándo aplica 404 en lugar de 403?

#### Respuesta PO/BA

La distinción está formalizada en Doc 14 §17.2 y debe ser uniforme en todo el backend:

- **`authMiddleware`** → `401 Unauthorized` siempre que el token esté ausente o sea inválido. Nunca `403`. El `403` implica que el usuario está autenticado pero no tiene permisos; el `401` indica ausencia de identidad válida.
- **`roleMiddleware`** → `403 Forbidden` cuando el usuario está autenticado pero su rol no cumple el requisito de la ruta.
- **`ownershipMiddleware`** → `404 Not Found` enmascarado cuando el usuario está autenticado y autorizado por rol, pero el recurso solicitado pertenece a otro usuario. El `404` enmascarado previene la enumeración de IDs de recursos privados — un atacante no puede distinguir si el recurso no existe o si existe pero es de otro usuario.

#### Decisión formal

```
authMiddleware → 401 (token ausente o inválido).
roleMiddleware → 403 (rol incorrecto; usuario autenticado).
ownershipMiddleware → 404 enmascarado (recurso privado de otro usuario) per Doc 14 §17.2.
Esta distinción es obligatoria y uniforme en todo el backend del MVP.
```

#### Rationale

La distinción 401/403/404 tiene implicaciones de seguridad directas. Un `403` en lugar de `404` para ownership violations revela la existencia del recurso y facilita la enumeración de IDs. Esta decisión protege la privacidad de los datos de los usuarios y es consistente con las prácticas de seguridad documentadas en Doc 14 §17 y ADR-SEC-003.

#### Impacto en la User Story

| Sección              | Cambio                                                                    |
| -------------------- | ------------------------------------------------------------------------- |
| EC-02                | Especifica `401` para JWT ausente o expirado.                             |
| EC-03                | Especifica `404 enmascarado` para ownership violation.                    |
| VR-01..VR-03         | HTTP codes exactos por tipo de control. Ya aplicado.                      |
| Negative Authorization Scenarios | Tabla con 7 escenarios y HTTP code exacto por middleware.  |
| PO/BA Decisions Applied | Decisión formalizada.                                                 |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional — derivado directamente de Doc 14 §17.2 y ADR-SEC-003.

---

### Decisión 4 — Scope del captcha: endpoints aplicables

#### Pregunta original

> ¿A qué endpoints se aplica `captchaVerificationMiddleware`? ¿Solo a `/auth/register` y `/auth/login`?

#### Respuesta PO/BA

El `captchaVerificationMiddleware` se aplica exclusivamente a los tres endpoints de alta sensibilidad en el flujo de autenticación:

1. `POST /auth/register`
2. `POST /auth/login`
3. `POST /auth/password-reset/request`

Esto está definido en BR-AUTH-011 ("captcha obligatorio en registro y login") y ADR-SEC-004 (captcha + rate limiting en flujos sensibles). No se aplica a ningún otro endpoint en el MVP.

La aplicación a `/auth/password-reset/request` — que va más allá de BR-AUTH-011 (que menciona solo registro y login) — es consistente con la intención de ADR-SEC-004 (proteger flujos que pueden ser explotados para spam o enumeración de cuentas) y fue validada en el refinement.

#### Decisión formal

```
captchaVerificationMiddleware se aplica exclusivamente a:
  POST /auth/register
  POST /auth/login
  POST /auth/password-reset/request
Fuente: BR-AUTH-011 + ADR-SEC-004.
No se aplica a otros endpoints en el MVP.
```

#### Rationale

Extender el captcha a todos los endpoints introduciría fricción innecesaria y comprometería la usabilidad del MVP. Limitarlo a los tres endpoints de autenticación más vulnerables es el balance correcto entre seguridad y UX para el MVP académico.

#### Impacto en la User Story

| Sección              | Cambio                                                                    |
| -------------------- | ------------------------------------------------------------------------- |
| AC-05                | Lista explícita de los 3 endpoints de captcha. Ya aplicado.               |
| SEC-04               | Lista los 3 endpoints explícitamente. Ya aplicado.                        |
| PO/BA Decisions Applied | Decisión formalizada.                                                 |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 5 — Mock de captcha para tests deterministas

#### Pregunta original

> ¿Cómo se prueba el captcha en tests sin llamadas externas? ¿Qué valor de token se usa?

#### Respuesta PO/BA

El modo mock de captcha para tests está definido en Doc 19 §captcha:

- Variable de entorno: `CAPTCHA_PROVIDER=mock`
- Token aceptado: `'__test__'` (cualquier otro valor es rechazado)
- Comportamiento: `captchaVerificationMiddleware` acepta `'__test__'` como token válido y rechaza cualquier otro cuando está en modo mock

Este comportamiento es determinista, no requiere red externa y permite que los tests de integración (Supertest) sean reproducibles en cualquier entorno CI/CD.

#### Decisión formal

```
CAPTCHA_PROVIDER=mock activa el mock del captcha.
Token válido en modo mock: '__test__' (hardcodeado; solo para desarrollo y tests).
Cualquier otro valor en modo mock es rechazado con 400 Bad Request.
Fuente: Doc 19 §captcha.
```

#### Rationale

Los tests de integración deben ser deterministas y no depender de servicios externos. El mock de captcha con token fijo garantiza reproducibilidad en CI/CD sin comprometer la seguridad del entorno de producción (donde `CAPTCHA_PROVIDER` no es `mock`).

#### Impacto en la User Story

| Sección              | Cambio                                                                    |
| -------------------- | ------------------------------------------------------------------------- |
| AC-05                | Especifica `'__test__'` como token aceptado en modo mock. Ya aplicado.    |
| Assumptions          | `CAPTCHA_PROVIDER=mock` con token fijo para pruebas. Ya aplicado.         |
| Notes                | Comportamiento del mock documentado. Ya aplicado.                         |
| PO/BA Decisions Applied | Decisión formalizada.                                                 |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 6 — Scope del rate limit en esta US vs. feature stories

#### Pregunta original

> ¿Esta US implementa solo el rate limit global o también los límites estrictos por endpoint de auth?

#### Respuesta PO/BA

Esta US implementa **únicamente el rate limit global laxo**:
- `RATE_LIMIT_WINDOW_MS`: ventana de tiempo (por defecto configurable)
- `RATE_LIMIT_MAX`: máximo de requests por IP en la ventana

Los límites estrictos por endpoint (e.g., `/auth/login`: máximo 10 requests por IP por 10 minutos) se configuran en las feature stories del módulo `identity-access` cuando se implementen las rutas concretas de autenticación. Esto evita que US-091 dependa de decisiones de configuración específicas de cada feature que aún no están implementadas.

#### Decisión formal

```
US-091 implementa el rate limit global laxo (RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS).
Los límites estrictos por endpoint se configuran en las feature stories de identity-access.
No hay duplicación — son dos capas complementarias del mismo control.
Fuente: ADR-SEC-004, Scope Notes de US-091.
```

#### Rationale

El rate limit tiene dos capas en EventFlow: una global laxo que aplica a todos los endpoints (esta US) y una estricta por endpoint sensible (feature stories). Mantener esta separación evita scope creep en US-091 y permite que cada feature story defina sus propios umbrales sin modificar el pipeline global.

#### Impacto en la User Story

| Sección              | Cambio                                                                    |
| -------------------- | ------------------------------------------------------------------------- |
| Scope Guardrails     | Out of Scope incluye "rate limit estricto por feature". Ya aplicado.      |
| Scope Notes          | Clarificación sobre rate limit global vs. per-endpoint. Ya aplicado.      |
| Notes                | Límites estrictos de auth en identity-access module. Ya aplicado.         |
| PO/BA Decisions Applied | Decisión formalizada.                                                 |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 7 — Scope de `fileUploadMiddleware`: genérico vs. específico por feature

#### Pregunta original

> ¿`fileUploadMiddleware` implementa la lista completa de MIME types permitidos para todos los flujos (portafolio de vendor, brief de quote)?

#### Respuesta PO/BA

En el scope de US-091, `fileUploadMiddleware` se implementa como un middleware **base genérico**:
- MIME allow-list genérica (tipos comunes: image/jpeg, image/png, application/pdf, etc.)
- Size limit configurable por variable de entorno (`FILE_SIZE_LIMIT`)

Los tipos MIME específicos por flujo se configuran en las feature stories que los usan:
- Portafolio de vendor → feature story de `vendor-management` o `attachments`
- Brief de quote → feature story de `quote-flow` o `attachments`

Esto permite que la US-091 establezca la infraestructura del middleware sin necesitar conocer los casos de uso específicos de cada módulo.

#### Decisión formal

```
fileUploadMiddleware en US-091 establece el middleware base con MIME allow-list genérica
y size limit configurable.
Los MIME types permitidos específicos por flujo (portafolio vendor, brief quote) se
configuran en las feature stories de attachments/vendor-management/quote-flow.
Fuente: Scope Notes de US-091.
```

#### Rationale

El middleware base de upload es infraestructura transversal; los MIME types específicos son decisiones de feature. Separar estas responsabilidades evita que US-091 dependa de requisitos funcionales de features que aún no están implementadas y permite que las feature stories configuren el middleware sin modificar la infraestructura base.

#### Impacto en la User Story

| Sección              | Cambio                                                                    |
| -------------------- | ------------------------------------------------------------------------- |
| Scope Notes          | Clarificación explícita del scope de fileUploadMiddleware. Ya aplicado.   |
| Technical Notes      | Tabla de middlewares: `fileUploadMiddleware` incluye nota sobre config por feature. Ya aplicado. |
| Notes                | Detalle sobre MIME types específicos en feature stories. Ya aplicado.     |
| PO/BA Decisions Applied | Decisión formalizada.                                                 |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

| # | Tema | Decisión | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
|--:|------|----------|------|------------------------|----------------------|
| 1 | NFR IDs aplicables | `NFR-SEC-001/002/003/004/007`, `NFR-OBS-003`, `NFR-OBS-006` | BA / Traceability | No | No requiere |
| 2 | ADRs centrales | `ADR-BE-001`, `ADR-SEC-001`, `ADR-SEC-003`, `ADR-SEC-004`, `ADR-SEC-006` | BA / Arch | No | No requiere |
| 3 | Distinción 401 / 403 / 404 | `authMiddleware`→401, `roleMiddleware`→403, `ownershipMiddleware`→404 enmascarado per Doc 14 §17.2 | PO/BA / Sec | No | No requiere |
| 4 | Scope del captcha | Solo `POST /auth/register`, `/auth/login`, `/auth/password-reset/request` per BR-AUTH-011 | PO/BA | No | No requiere |
| 5 | Mock de captcha | `CAPTCHA_PROVIDER=mock` + token `'__test__'` per Doc 19 §captcha | BA / Tech | No | No requiere |
| 6 | Scope del rate limit | Global laxo en esta US; estricto por endpoint en feature stories de identity-access | PO/BA | No | No requiere |
| 7 | Scope de fileUploadMiddleware | Base genérico en esta US; MIME types específicos en feature stories | PO/BA | No | No requiere |

---

## 4. Cambios Aplicados a la User Story

### PO/BA Decisions Applied

Sección `### PO/BA Decisions Applied` creada bajo `## 🧠 Business Context → ### Dependencies` con las 7 decisiones formalizadas en tabla.

### Resto de la User Story

Sin cambios adicionales. El refinement previo ya había aplicado todos los cambios necesarios (8 AC con HTTP codes exactos, 7 NFR IDs correctos, 5 ADRs de seguridad, tabla de 14 middlewares, negative authorization scenarios con 7 escenarios, SEC-01..SEC-07, VR-01..VR-06, 15 test cases). Este ciclo solo agrega la sección de decisiones formalizadas.

---

## 5. Documentation Alignment Required

No documentation alignment issues detected.

La US-091 es consistente con Doc 14 §8.2 (orden de middlewares), §16 (diseño de cada middleware), §17.2 (401 vs 403 vs 404), Doc 19 §captcha (mock), y todas las ADRs de seguridad aceptadas.

---

## 6. File Update Result

| Campo                                        | Valor                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                       |
| User Story file path                         | `management/user-stories/US-091-middleware-pipeline.md`                                  |
| Decision Resolution artifact created/updated | Yes                                                                                       |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-091-decision-resolution.md`             |
| New User Story status                        | Ready for Approval                                                                        |
| Remaining blockers                           | No                                                                                        |
| Reason                                       | No había preguntas bloqueantes. Las 7 decisiones derivadas de ADRs aceptados y documentación técnica existente se formalizaron en `PO/BA Decisions Applied`. |

---

## 7. Estado recomendado después de aplicar decisiones

**Ready for Approval**

US-091 tenía status `Ready for Approval` desde el ciclo de refinement previo. Este ciclo formaliza las decisiones en el artefacto permanente y añade la sección `PO/BA Decisions Applied` a la US. No hay preguntas bloqueantes pendientes.

La historia cubre el stack completo de seguridad transversal del backend: 14 middlewares con comportamientos observables, HTTP codes exactos, mock de captcha determinista para tests, y separación clara de scope entre rate limit global y por endpoint. El Tech Lead tiene toda la información necesaria para implementar y verificar los middlewares conforme a los ADRs aceptados.

---

## 8. Próximo Paso Recomendado

```
1. Revisar la sección PO/BA Decisions Applied en la User Story para confirmar que las
   decisiones están correctamente expresadas.
2. Ejecutar eventflow-user-story-approval sobre US-091.
3. Las tres US del trilogy PB-P0-002 (US-089, US-090, US-091) están ahora en
   Ready for Approval con Decision Resolutions formalizadas. Se puede proceder al
   approval de las tres en secuencia.
```
