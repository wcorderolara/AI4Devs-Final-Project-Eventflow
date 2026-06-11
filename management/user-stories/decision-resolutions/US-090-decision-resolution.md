# PO/BA Decision Resolution — US-090

## Source User Story File
management/user-stories/US-090-feature-first-domain-modules.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-090-refinement-review.md

## Decision Date
2026-06-11

---

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                              |
| -------------------------------------------- | ------------------------------------------------------------------ |
| User Story ID                                | US-090                                                             |
| User Story file path                         | management/user-stories/US-090-feature-first-domain-modules.md     |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-090-refinement-review.md |
| Existing decision resolution found           | No                                                                 |
| Backlog Item                                 | PB-P0-002 — Backend Modular Monolith Bootstrap                     |
| Epic                                         | EPIC-BE-001 — Backend Modular Monolith                             |
| Estado antes de decisiones                   | Ready for Approval (refinement ya aplicado en ciclo anterior)      |
| Cantidad de preguntas revisadas              | 0 bloqueantes · 0 Documentation Alignment Required                 |
| Decisiones PO/BA tomadas                     | 6 (formalizadas desde decisiones ya aplicadas en refinement)       |
| Decisiones técnicas recomendadas             | 0                                                                  |
| ¿Desbloquea aprobación?                      | N/A — no había bloqueantes; se formaliza el estado existente       |
| User Story file updated                      | Yes (sección `PO/BA Decisions Applied` agregada)                   |
| Decision Resolution artifact created/updated | Yes                                                                |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-090-decision-resolution.md |
| Próximo paso recomendado                     | Run `eventflow-user-story-approval`                                |

---

## Contexto de esta ejecución

La US-090 llegó a este skill con **status Ready for Approval** tras el ciclo de refinement previo. El refinement review reportó cero preguntas bloqueantes y ningún item de Documentation Alignment Required. Todos los issues eran de calidad interna (NFR IDs incorrectos, AC no testeables, technical notes genéricas) y fueron resueltos directamente durante el refinement usando ADRs aceptados y documentación técnica existente (Doc 14 §9, §24.1, §24.2, §7.1).

Este ciclo del skill tiene como único objetivo:
1. Formalizar las decisiones aplicadas en `PO/BA Decisions Applied` dentro de la US.
2. Crear el Decision Resolution artifact como registro permanente.

---

## 2. Decisiones Respondidas

### Decisión 1 — Lista canónica de bounded contexts

#### Pregunta original

> El Draft contenía una lista incompleta o genérica de bounded contexts. ¿Cuál es la lista canónica y completa para esta US?

#### Respuesta PO/BA

Los 16 bounded contexts de Doc 14 §9 son el scope definitivo de la estructura de módulos del monolito de EventFlow MVP:

`identity-access`, `user-profile`, `event-planning`, `task-management`, `budget-management`, `vendor-management`, `service-catalog`, `quote-flow`, `booking-intent`, `reviews-moderation`, `notifications`, `ai-assistance`, `admin-governance`, `attachments`, `localization`, `seed-demo`.

No se crean módulos adicionales ni se omiten módulos de esta lista en el scope de esta US. Cada bounded context recibe la estructura de 5 capas: `interface`, `application`, `domain`, `ports`, `infrastructure`.

#### Decisión formal

```
Los 16 bounded contexts de Doc 14 §9 son el scope definitivo.
Cada módulo recibe las 5 capas: interface, application, domain, ports, infrastructure.
No se agregan ni eliminan módulos sin actualizar Doc 14 §9 y la ADR correspondiente.
```

#### Rationale

Doc 14 §9 es el documento de diseño técnico del backend y es la fuente de verdad para la lista de bounded contexts. La historia de US-090 establece la estructura base de todos los módulos; omitir o agregar módulos aquí afectaría directamente los contratos y dependencias de las historias de implementación subsecuentes.

#### Impacto en la User Story

| Sección              | Cambio                                                                    |
| -------------------- | ------------------------------------------------------------------------- |
| Technical Notes      | Lista de los 16 bounded contexts referenciados explícitamente.            |
| PO/BA Decisions Applied | Decisión formalizada con lista completa.                              |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 2 — NFR IDs aplicables a estructura de módulos

#### Pregunta original

> `NFR-PERF-API-001` y `NFR-OBS-001` referenciados en el Draft no existen o no aplican. ¿Cuáles son los NFR IDs correctos para US-090?

#### Respuesta PO/BA

Los NFR aplicables a la historia de estructura de módulos y shared kernel son:
- **NFR-OBS-006**: Logging estructurado a stdout — el shared kernel exporta el tipo base de logger para uso por cada módulo.
- **NFR-SEC-001**: Autenticación requerida en todos los endpoints protegidos — la separación de módulos con boundaries claros es prerrequisito para aplicar políticas de seguridad por módulo.

`NFR-PERF-API-001` no existe en Doc 10. `NFR-OBS-001` aplica exclusivamente a AdminAction logging de acciones administrativas y no a la estructura de directorios del proyecto.

#### Decisión formal

```
Los NFR IDs aplicables a US-090 son: NFR-OBS-006, NFR-SEC-001.
NFR-PERF-API-001 es un ID inexistente y debe eliminarse de cualquier referencia.
NFR-OBS-001 no aplica a historias de estructura de proyectos o scaffolding.
```

#### Rationale

Los NFR IDs deben existir en Doc 10 y ser relevantes para el comportamiento de la historia. Referenciar NFRs inexistentes rompe la trazabilidad y genera confusión en la validación QA.

#### Impacto en la User Story

| Sección       | Cambio                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| Traceability  | `NFR Reference(s)` actualizado a los 2 IDs correctos. Ya aplicado.      |
| PO/BA Decisions Applied | Decisión formalizada.                                           |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 3 — Contenido mínimo del shared kernel

#### Pregunta original

> ¿Qué debe incluir el shared kernel en el scope de US-090? ¿Incluye entidades de dominio o use cases?

#### Respuesta PO/BA

El shared kernel de US-090 expone únicamente los tipos base definidos en Doc 14 §7.1 y §24.1:

- `Result<T, E>` — tipo de retorno de operaciones falibles
- `Id` — tipo value-object para identidades
- `CorrelationId` — tipo para trazabilidad de solicitudes
- `ClockPort` — port para tiempo (inyectable, testeable)
- `AppError` — error base del dominio
- `ValidationError` — error de validación derivado de `AppError`
- `AuthorizationError` — error de autorización derivado de `AppError`

El shared kernel **no incluye** lógica de feature, entidades de dominio de ningún bounded context, ni use cases. Esas pertenecen a los módulos de cada bounded context.

#### Decisión formal

```
El shared kernel en US-090 contiene exclusivamente: Result<T,E>, Id, CorrelationId,
ClockPort, AppError, ValidationError, AuthorizationError (per Doc 14 §7.1 y §24.1).
No incluye entidades de dominio, use cases, ni lógica de feature.
```

#### Rationale

Un shared kernel que incluye lógica de feature crea acoplamiento entre bounded contexts, lo cual viola ADR-ARCH-001 (modular monolith) y ADR-ARCH-002 (clean architecture). La separación estricta garantiza que los módulos puedan compilarse y probarse de forma independiente.

#### Impacto en la User Story

| Sección              | Cambio                                                                    |
| -------------------- | ------------------------------------------------------------------------- |
| Scope Guardrails     | Out of Scope ya incluye "lógica de feature, entidades de dominio".        |
| Technical Notes      | Lista de tipos del shared kernel ya incluida.                             |
| PO/BA Decisions Applied | Decisión formalizada.                                                 |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 4 — Mecanismo de enforcement de import boundaries

#### Pregunta original

> ¿Es suficiente que el ADR documente la restricción de imports entre módulos, o se requiere enforcement automático?

#### Respuesta PO/BA

El enforcement automático mediante ESLint es **obligatorio** para esta US, no opcional. La restricción de no importar directamente entre módulos (ADR-ARCH-001) y la restricción de no importar infraestructura desde el dominio (ADR-ARCH-002) deben estar configuradas en ESLint usando `import/no-restricted-paths` o `eslint-plugin-boundaries`. El AC-03 de la US requiere que `npm run lint` falle si se crea un import cross-module directo.

Sin enforcement automático, las restricciones arquitectónicas se violan inadvertidamente durante el desarrollo y no se detectan hasta revisión manual de código.

#### Decisión formal

```
ESLint (import/no-restricted-paths o eslint-plugin-boundaries) es el mecanismo de
enforcement obligatorio para las restricciones de import boundaries.
La configuración ESLint debe estar presente y activa en esta US (AC-03).
No es suficiente documentar la restricción solo en el ADR.
```

#### Rationale

Las reglas arquitectónicas sin enforcement automático se degradan con el tiempo. La experiencia de proyectos modulares muestra que sin lint rules, los cross-module imports aparecen en semanas. Esta decisión protege la integridad arquitectónica del proyecto durante todo el ciclo de vida del MVP.

#### Impacto en la User Story

| Sección              | Cambio                                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| Acceptance Criteria  | AC-03 ya especifica que ESLint falla ante cross-module import directo.          |
| Edge Cases           | EC-01 y EC-02 ya documentan el comportamiento cuando se viola la restricción.   |
| PO/BA Decisions Applied | Decisión formalizada.                                                        |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 5 — Nombre del directorio del shared kernel

#### Pregunta original

> ¿El directorio del shared kernel se llama `src/shared/` o `src/shared-kernel/`?

#### Respuesta PO/BA

El directorio se llama **`src/shared/`** conforme a Doc 14 §24.1. El nombre `src/shared-kernel/` no aparece en ningún documento técnico y sería una inconsistencia. Esta decisión aplica a todos los imports, rutas en `tsconfig.json` (`@shared/*`), y referencias en otras User Stories.

#### Decisión formal

```
El directorio del shared kernel es src/shared/ (no src/shared-kernel/).
Fuente de verdad: Doc 14 §24.1.
Todos los imports y path aliases usan src/shared/ como raíz.
```

#### Rationale

Consistencia con Doc 14 §24.1 previene inconsistencias entre US y artefactos de implementación. El path alias `@shared/*` mapea a `src/shared/*` en `tsconfig.json`, lo que facilita la navegación y el refactor.

#### Impacto en la User Story

| Sección              | Cambio                                                                    |
| -------------------- | ------------------------------------------------------------------------- |
| Technical Notes      | Ya usa `src/shared/` consistentemente.                                    |
| Acceptance Criteria  | AC-02 referencia `src/shared/` como raíz del shared kernel.               |
| PO/BA Decisions Applied | Decisión formalizada.                                                 |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 6 — Convención de nombrado de archivos placeholder

#### Pregunta original

> ¿Qué convención de nombrado deben seguir los archivos placeholder creados en esta US?

#### Respuesta PO/BA

Doc 14 §24.2 es la fuente de verdad para las convenciones de nombrado. Los archivos placeholder deben seguir estas convenciones desde el inicio para evitar renombrados masivos al implementar:

| Capa            | Patrón                                         | Ejemplo                              |
| --------------- | ---------------------------------------------- | ------------------------------------ |
| Application     | `<verb>-<entity>.use-case.ts`                  | `create-event.use-case.ts`           |
| Domain          | `<entity>.entity.ts`, `<entity>.value-object.ts` | `event.entity.ts`                  |
| Ports           | `<entity>.repository.ts`                       | `event.repository.ts`               |
| Infrastructure  | `prisma-<entity>.repository.ts`                | `prisma-event.repository.ts`         |
| Interface       | `<feature>.controller.ts`, `<feature>.routes.ts` | `events.controller.ts`             |

El scope de US-090 incluye crear stubs o archivos `index.ts` por capa, no implementaciones.

#### Decisión formal

```
Doc 14 §24.2 es la fuente de verdad para convenciones de nombrado de todos los archivos.
Los placeholders de US-090 siguen estas convenciones desde el inicio.
Los archivos placeholder son stubs (index.ts por capa o archivos vacíos); la implementación
pertenece a las US de feature de cada bounded context.
```

#### Rationale

Adoptar las convenciones de nombrado desde los placeholders evita renombrados masivos posteriores y mantiene la consistencia del tooling (imports, tests, generadores). La convención de Doc 14 §24.2 refleja las mejores prácticas de Clean Architecture para TypeScript/Node.js.

#### Impacto en la User Story

| Sección              | Cambio                                                                    |
| -------------------- | ------------------------------------------------------------------------- |
| Technical Notes      | Tabla de naming conventions ya incluida con referencia a Doc 14 §24.2.   |
| Scope Guardrails     | Out of Scope ya indica que la implementación pertenece a feature US.      |
| PO/BA Decisions Applied | Decisión formalizada.                                                 |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

| # | Tema | Decisión | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
|--:|------|----------|------|------------------------|----------------------|
| 1 | Lista de bounded contexts | 16 módulos de Doc 14 §9, 5 capas cada uno | PO/BA | No | No requiere |
| 2 | NFR IDs aplicables | `NFR-OBS-006`, `NFR-SEC-001` | BA / Traceability | No | No requiere |
| 3 | Contenido del shared kernel | `Result<T,E>`, `Id`, `CorrelationId`, `ClockPort`, `AppError`, `ValidationError`, `AuthorizationError` per Doc 14 §7.1 | BA / Tech | No | No requiere |
| 4 | Enforcement de import boundaries | ESLint obligatorio (`import/no-restricted-paths` o `eslint-plugin-boundaries`); no solo ADR | PO/BA / Arch | No | No requiere |
| 5 | Nombre del directorio shared kernel | `src/shared/` per Doc 14 §24.1 (no `src/shared-kernel/`) | BA / Tech | No | No requiere |
| 6 | Convención de nombrado de placeholders | Doc 14 §24.2 como fuente de verdad; stubs desde el inicio | BA / Tech | No | No requiere |

---

## 4. Cambios Aplicados a la User Story

### PO/BA Decisions Applied

Sección `### PO/BA Decisions Applied` creada bajo `## 🧠 Business Context → ### Dependencies` con las 6 decisiones formalizadas en tabla.

### Resto de la User Story

Sin cambios adicionales. El refinement previo ya había aplicado todos los cambios necesarios (AC específicos con los 16 módulos, NFR IDs correctos, Technical Notes con estructura completa, EC-01/EC-02 de ESLint, VR-01..VR-03 de validación arquitectónica). Este ciclo solo agrega la sección de decisiones formalizadas.

---

## 5. Documentation Alignment Required

No se detectaron conflictos de documentación para US-090. La estructura de módulos, el shared kernel y las convenciones de nombrado están consistentemente documentados en Doc 14 §7.1, §9, §24.1, §24.2.

---

## 6. File Update Result

| Campo                                        | Valor                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                       |
| User Story file path                         | `management/user-stories/US-090-feature-first-domain-modules.md`                         |
| Decision Resolution artifact created/updated | Yes                                                                                       |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-090-decision-resolution.md`             |
| New User Story status                        | Ready for Approval                                                                        |
| Remaining blockers                           | No                                                                                        |
| Reason                                       | No había preguntas bloqueantes. Las 6 decisiones derivadas de ADRs y documentación técnica existente se formalizaron en `PO/BA Decisions Applied`. |

---

## 7. Estado recomendado después de aplicar decisiones

**Ready for Approval**

US-090 tenía status `Ready for Approval` desde el ciclo de refinement previo. Este ciclo formaliza las decisiones en el artefacto permanente y añade la sección `PO/BA Decisions Applied` a la US. No hay preguntas bloqueantes pendientes ni items que requieran Tech Lead, QA Lead o Security Lead adicionales.

---

## 8. Próximo Paso Recomendado

```
1. Revisar la sección PO/BA Decisions Applied en la User Story para confirmar que las
   decisiones están correctamente expresadas.
2. Ejecutar eventflow-user-story-approval sobre US-090.
3. Continuar con eventflow-po-ba-decision-resolver sobre US-091.
```
