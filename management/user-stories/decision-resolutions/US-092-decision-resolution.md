# PO/BA Decision Resolution — US-092

## Source User Story File
management/user-stories/US-092-zod-validation.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-092-refinement-review.md

## Decision Date
2026-06-11

---

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story ID                                | US-092                                                                             |
| User Story file path                         | management/user-stories/US-092-zod-validation.md                                   |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-092-refinement-review.md             |
| Existing decision resolution found           | No                                                                                 |
| Backlog Item                                 | PB-P0-003 — Backend Validation, Error Envelope & Logger                            |
| Epic                                         | EPIC-BE-001 — Backend Modular Monolith                                             |
| Estado antes de decisiones                   | Draft (refinado a Ready for Approval durante el refinement)                        |
| Cantidad de preguntas revisadas              | 0 (no había preguntas bloqueantes pendientes — todo resuelto en refinement)        |
| Decisiones PO/BA tomadas                     | 4 (aplicadas durante el refinement; formalizadas aquí)                             |
| Decisiones técnicas recomendadas             | 0                                                                                  |
| ¿Desbloquea aprobación?                      | Sí — la historia ya estaba en Ready for Approval al entrar al resolver             |
| User Story file updated                      | No — la historia ya está en estado correcto; no se requieren cambios adicionales   |
| Decision Resolution artifact created/updated | Yes                                                                                |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-092-decision-resolution.md         |
| Próximo paso recomendado                     | Run `eventflow-user-story-approval`                                                |

---

## Contexto de Ejecución

La User Story US-092 llegó al `eventflow-po-ba-decision-resolver` con **estado `Ready for Approval`**, ya que el `eventflow-user-story-refinement` resolvió todos los gaps directamente desde documentación existente (ADR-API-003 Accepted, Doc 14 §14, PB-P0-003) sin requerir preguntas bloqueantes al PO/BA.

Este artifact cumple el propósito del resolver de:

1. Formalizar las 4 decisiones que se aplicaron durante el refinement.
2. Registrar los 2 items de Documentation Alignment (no bloqueantes).
3. Confirmar que la historia está en condiciones de proceder al Approval Gate.
4. Prevenir que futuras pasadas de refinement reabran estas decisiones.

---

## 2. Decisiones Respondidas

### Decisión 1 — Librería de validación de DTOs: Zod

#### Pregunta original

> ¿Qué librería debe usarse para la validación de DTOs en la capa Interface del backend?

#### Respuesta PO/BA

Zod es la herramienta formalizada en ADR-API-003 (Accepted). `class-validator` fue evaluado y rechazado por requerir decoradores y `reflect-metadata`, lo cual aumenta la superficie y se desvía del enfoque mínimo del MVP.

#### Decisión formal

```text
Se usa Zod como única librería de validación de DTOs en el backend.
class-validator y alternativas similares están fuera del stack del MVP.
```

#### Rationale

ADR-API-003 (Accepted, 2026-06-09) formalizó esta decisión explícitamente. La justificación es: inferencia de tipos TypeScript desde una sola definición de schema, sin decoradores, sin `reflect-metadata`, reutilizable entre backend y frontend. La decisión está alineada con Doc 14 §14.3.

#### Impacto en la User Story

| Sección                 | Cambio requerido                                                            |
| ----------------------- | --------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Decisión registrada — **Aplicado en refinement**                            |
| Traceability            | ADR-API-003 agregado como ADR principal — **Aplicado en refinement**        |
| Technical Notes         | Patrón `validateRequestMiddleware(schema)` documentado — **Aplicado en refinement** |

#### ¿Bloqueaba aprobación?

No — la decisión ya estaba formalizada en ADR-API-003 antes del refinement.

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 2 — `.strict()` por defecto; `.passthrough()` prohibido

#### Pregunta original

> ¿Deben los schemas Zod usar `.strict()` por defecto, y está prohibido `.passthrough()`?

#### Respuesta PO/BA

Sí. ADR-API-003 establece explícitamente `.strict()` por defecto. `.passthrough()` implica que campos no declarados pasan silenciosamente al controlador, lo cual es un riesgo de seguridad (inyección de campos no esperados) y viola el principio de contrato explícito.

#### Decisión formal

```text
Todos los Request DTOs de la capa Interface usan Zod .strict() por defecto.
El uso de .passthrough() está prohibido y debe detectarse con una lint rule en CI.
Un campo no declarado en el schema genera 400 VALIDATION_ERROR.
```

#### Rationale

ADR-API-003 y Doc 14 §14.3 son explícitos. `.strict()` es la primera línea de defensa contra campos inesperados que podrían bypassear lógica de negocio o inyectar datos no validados. La lint rule (NT-06) garantiza que ningún schema introduzca `.passthrough()` accidentalmente, como indica ADR-API-003 §Riesgos.

#### Impacto en la User Story

| Sección                 | Cambio requerido                                                        |
| ----------------------- | ----------------------------------------------------------------------- |
| PO/BA Decisions Applied | Decisión registrada — **Aplicado en refinement**                        |
| Validation Rules        | VR-01 (`.strict()`), VR-02 (`.passthrough()` prohibido) — **Aplicado** |
| Test Scenarios          | NT-06 (lint rule en CI) — **Aplicado**                                  |
| Definition of Done      | Lint rule activa como criterio — **Aplicado**                           |

#### ¿Bloqueaba aprobación?

No — la decisión ya estaba formalizada en ADR-API-003.

#### Validación adicional requerida

Requiere validación Tech Lead — para confirmar la configuración específica de la lint rule en el proyecto (ESLint custom rule o Biome rule). No bloquea la aprobación de la User Story.

---

### Decisión 3 — Organización de schemas en `src/modules/<module>/dto/`

#### Pregunta original

> ¿Dónde deben residir los schemas Zod de entrada y salida de cada módulo?

#### Respuesta PO/BA

Cada módulo de dominio organiza sus schemas Zod en `src/modules/<module>/dto/`. Esta estructura sigue el patrón feature-first del Modular Monolith (ADR-ARCH-001) y la estrategia de DTOs de Doc 14 §14.

#### Decisión formal

```text
Los schemas Zod de Request, Response, Query e IA se ubican en src/modules/<module>/dto/.
No existe un directorio global de schemas; cada feature es dueña de sus propios DTOs.
```

#### Rationale

ADR-ARCH-001 (Modular Monolith) y Doc 14 §14 establecen la estructura feature-first. Centralizar schemas rompería el encapsulamiento modular y crearía acoplamiento entre dominios. La carpeta `dto/` dentro de cada módulo es el lugar natural para schemas de Interface y Application layers.

#### Impacto en la User Story

| Sección                 | Cambio requerido                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Decisión registrada — **Aplicado en refinement**                                    |
| Technical Notes         | Ruta `src/modules/<module>/dto/` especificada — **Aplicado en refinement**          |
| Validation Rules        | VR-03 (schemas en `dto/` por convención) — **Aplicado en refinement**              |

#### ¿Bloqueaba aprobación?

No — la estructura está definida en Doc 14 §14.

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 4 — Output de IA validado con Zod antes de persistir

#### Pregunta original

> ¿El scope de esta historia incluye la validación Zod de los outputs del LLM antes de persistirlos?

#### Respuesta PO/BA

Sí. Doc 14 §14.2 establece que la capa AI tiene su propia validación: "Schema de output (Zod) antes de persistir y aceptar". ADR-API-003 también confirma el reuso de schemas Zod entre Interface, Application (AI output validation) y tests. US-092 debe cubrir los schemas de output IA (e.g., `EventPlanAIOutput`) como parte de la estrategia de validación.

#### Decisión formal

```text
US-092 incluye la definición y uso de schemas Zod para validar el output del LLM antes de persistirlo.
Si el output de IA no cumple el schema, se rechaza, se registra el error con correlationId y se notifica al usuario.
Los schemas de output IA se declaran en src/modules/<module>/dto/ del módulo correspondiente.
```

#### Rationale

Doc 14 §14.2 y §14.3 son explícitos sobre la validación Zod en la capa AI. La validación de outputs de IA es parte de la estrategia de validación de DTOs del backend, no una feature separada. Si se dejara fuera de US-092, habría un gap entre la validación de inputs HTTP (US-092) y la validación de outputs IA, dejando un camino no validado hacia la base de datos.

#### Impacto en la User Story

| Sección                 | Cambio requerido                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Decisión registrada — **Aplicado en refinement**                                         |
| Acceptance Criteria     | AC-04 (validación de output IA) — **Aplicado en refinement**                            |
| Edge Cases              | EC-03 (output IA no conforme) — **Aplicado en refinement**                              |
| Validation Rules        | VR-04 (output IA validado con Zod antes de persistir) — **Aplicado en refinement**      |
| Test Scenarios          | NT-05 (output IA no conforme rechazado) — **Aplicado en refinement**                    |

#### ¿Bloqueaba aprobación?

No — la decisión ya estaba implícita en Doc 14 §14.2 y ADR-API-003.

#### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

| # | Tema | Decisión | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
|--:| ---- | -------- | ---- | ---------------------- | -------------------- |
| 1 | Librería de validación | Zod; `class-validator` rechazado | PO (via ADR-API-003) | No | No requiere |
| 2 | `.strict()` por defecto; `.passthrough()` prohibido | `.strict()` en todos los schemas; lint rule en CI | PO (via ADR-API-003) | No | Tech Lead — config lint rule específica |
| 3 | Ubicación de schemas | `src/modules/<module>/dto/` por módulo | BA (via Doc 14 §14) | No | No requiere |
| 4 | Validación output IA | Zod en output LLM antes de persistir; incluido en US-092 | PO/BA (via Doc 14 §14.2) | No | No requiere |

---

## 4. Cambios Aplicados a la User Story

El archivo de la User Story **no fue modificado** en esta pasada del resolver. El `eventflow-user-story-refinement` ya actualizó el archivo con todos los cambios necesarios. El estado actual (`Ready for Approval`) es correcto.

Los cambios que se aplicaron **en el refinement** y que quedan formalizados aquí son:

### Metadata

* Backlog Item PB-P0-003 agregado.
* Status: `Ready for Approval`.
* Last Updated: 2026-06-11.

### Business Context

* Context Summary expandido con contexto de ADR-API-003 y Doc 14 §14.3.
* Related Domain Concepts completado (5 conceptos clave).
* Assumptions reescritas con prerequisitos específicos (US-089, US-093, `.passthrough()` prohibido).
* Dependencies: US-089 y US-093 referenciados explícitamente.

### PO/BA Decisions Applied

* Sección creada con las 4 decisiones formalizadas en este artifact.

### Traceability

* ADR-API-003 agregado como ADR principal.
* NFR-PERF-API-001 (inexistente) reemplazado por NFR-SEC-007.
* NFR-OBS-001 (inaplicable) removido; NFR-TEST-001 y NFR-TEST-002 agregados.

### Scope Guardrails

* `zod-to-openapi` (PB-P0-005/US-098) y error envelope (US-093) explicitados como Out of Scope.

### Acceptance Criteria

* AC-01 a AC-05 reescritos con GWT específicos.
* EC-01 (env vars, plantilla de US-089) reemplazado por ECs Zod reales (campos inesperados, tipo inválido, output IA no conforme).

### Validation Rules

* VR-01 a VR-04 específicos para Zod (`.strict()`, `.passthrough()` prohibido, dto/ folder, output IA).

### Technical Notes

* Pattern `validateRequestMiddleware(schema)`, estructura `dto/`, `.strict()` y registro en pipeline Express documentados.

### QA Notes / Test Scenarios

* NT-01 a NT-06 con escenarios específicos y resultados esperados.
* AUTH-TS-01 reescrito: rechazo de campos inesperados.

### Definition of Done

* 6 criterios específicos y verificables.

---

## 5. Documentation Alignment Required

| Documento / Fuente                    | Conflicto detectado                                                       | Decisión vigente                                           | Acción recomendada                                                              | ¿Bloquea aprobación? |
| ------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------- |
| NFR-PERF-API-001 (en US-092 Draft)    | ID inexistente en Doc 10 — NFR-PERF solo llega a NFR-PERF-006            | NFR-SEC-007 es el NFR aplicable para validación de inputs  | Corrección ya aplicada en refinement; no se requiere actualizar Doc 10          | No                   |
| NFR-OBS-001 (en US-092 Draft)         | Aplica a AdminAction (acciones administrativas), no a validación Zod      | NFR-OBS-001 no aplica a esta historia                      | Corrección ya aplicada en refinement; NFR-OBS-001 sigue siendo válido para AdminAction | No              |

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | No — historia ya en estado correcto (Ready for Approval)                           |
| User Story file path                         | `management/user-stories/US-092-zod-validation.md`                                 |
| Decision Resolution artifact created/updated | Yes                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-092-decision-resolution.md`       |
| New User Story status                        | Ready for Approval                                                                 |
| Remaining blockers                           | No                                                                                 |
| Reason                                       | Todas las decisiones estaban formalizadas en ADR-API-003 y Doc 14 §14; el refinement las aplicó sin requerir preguntas bloqueantes |

---

## 7. Estado recomendado después de aplicar decisiones

**Ready for Approval**

La User Story US-092 está en estado `Ready for Approval`. Todos los gaps detectados en el refinement se resolvieron desde documentación existente. Las 4 decisiones aplicadas están formalizadas en la sección `PO/BA Decisions Applied` de la historia y en este artifact. No hay preguntas pendientes bloqueantes. Los 2 items de Documentation Alignment son correcciones de IDs incorrectos en el Draft original, ya aplicadas.

La única validación técnica pendiente (Decisión 2 — configuración específica de la lint rule para `.passthrough()`) es una tarea de implementación, no un bloqueante para el Approval Gate.

---

## 8. Próximo Paso Recomendado

```text
1. Revisar el archivo de User Story actualizado:
   management/user-stories/US-092-zod-validation.md

2. Ejecutar `eventflow-user-story-approval` directamente.
   No es necesario re-ejecutar `eventflow-user-story-refinement` — no hay cambios pendientes.

3. Después del Approval Gate, ejecutar `eventflow-user-story-to-development-tasks`
   para generar las tareas de desarrollo de US-092.
```
