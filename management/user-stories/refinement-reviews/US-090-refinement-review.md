# User Story Refinement Review — US-090

## Source User Story File
management/user-stories/US-090-feature-first-domain-modules.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-090-decision-resolution.md

## Review Date
2026-06-11

---

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                       |
| ------------------------------------------ | ---------------------------------------------------------------- |
| User Story ID                              | US-090                                                           |
| File Path                                  | management/user-stories/US-090-feature-first-domain-modules.md   |
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
| Refinement review path                     | management/user-stories/refinement-reviews/US-090-refinement-review.md |

---

## 2. Diagnóstico PO/BA

US-090 representa la convención de carpetas del monolito modular. Su valor de entrega es indispensable: sin la estructura feature-first ningún developer puede saber dónde colocar código nuevo y las reglas arquitectónicas de ADR-ARCH-001 y ADR-ARCH-002 no tienen soporte estructural.

La versión Draft era un clon casi exacto del template genérico de US-089, con los mismos problemas:

1. **AC totalmente no testeables** — "cumple NFR referenciado" y "funciona consistentemente" no describen ningún comportamiento observable de la estructura de directorios.
2. **EC-01 inadecuado para la historia** — "Configuración faltante al boot" no aplica a una historia de estructura de archivos. El edge case relevante es la violación de import boundary entre módulos.
3. **NFR IDs incorrectos** — `NFR-PERF-API-001` no existe; `NFR-OBS-001` no aplica.
4. **Falta ADR-ARCH-002** — la Clean/Hexagonal Architecture dentro de módulos es la ADR central de esta historia pero no estaba referenciada.
5. **Lista de bounded contexts ausente** — Doc 14 §9 define 16 módulos pero la US no los enumeraba.
6. **Shared kernel scope no definido** — Doc 14 §7.1 y §24.1 definen claramente los tipos base del shared kernel pero la US no lo mencionaba.
7. **Herramienta de enforcement no referenciada** — La regla ESLint de import boundaries es el mecanismo central de esta historia (Doc 14 §6 Principio 2 + ADR-ARCH-001 implicaciones).

Todos los problemas se resolvieron mediante los ADRs y la documentación técnica existente. No se requirieron nuevas decisiones.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                     | Impacto                                                                                  | Recomendación                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Alta      | `NFR-PERF-API-001` no existe en Doc 10.                                                                                                     | Trazabilidad rota.                                                                       | Reemplazado por `NFR-OBS-006` y `NFR-SEC-001`. Aplicado.                                                              |
| Alta      | `NFR-OBS-001` no aplica (AdminAction logging).                                                                                              | Confusión QA sobre NFR aplicable.                                                        | Removido. Reemplazado por NFRs correctos. Aplicado.                                                                   |
| Alta      | AC-01 y AC-02 no testeables ("cumple NFR", "funciona consistentemente").                                                                    | QA no puede derivar test cases de la estructura de archivos.                             | Reemplazados por 5 AC específicos y verificables. Aplicado.                                                           |
| Alta      | EC-01 ("Configuración faltante al boot") no es aplicable a una historia de estructura de directorios.                                       | EC irrelevante; oculta los edge cases arquitectónicos reales.                            | Reemplazado por EC-01 (cross-module import) y EC-02 (domain importa infraestructura). Aplicado.                       |
| Alta      | ADR-ARCH-002 (Clean/Hex Architecture inside modules) ausente — es la ADR central de esta historia.                                         | Decisión vinculante no referenciada; implementación podría ignorar la regla inviolable.  | Agregado a Traceability. Aplicado.                                                                                    |
| Alta      | Los 16 bounded contexts de Doc 14 §9 no estaban listados. AC-01 no podía verificarse sin conocer la lista.                                  | QA y Tech Lead no pueden saber qué verificar.                                            | Lista completa de 16 módulos incluida en AC-01 y Scope Notes. Aplicado.                                               |
| Media     | Shared kernel scope no definido. Doc 14 §7.1 y §24.1 especifican `Result`, `Id`, `CorrelationId`, `ClockPort`, errores base.                | Sin scope claro el developer podría crear un shared kernel incompleto o sobre-ingeniado. | AC-02 y Technical Notes especifican el contenido mínimo del shared kernel. Aplicado.                                  |
| Media     | Mecanismo de enforcement de import boundaries no referenciado (ESLint rule).                                                                 | Sin la regla ESLint, la restricción de imports cruzados es solo comentario en ADR.       | AC-03, EC-01, EC-02, VR-02/VR-03 y Technical Notes incluyen la regla ESLint. Aplicado.                               |
| Baja      | VR-01 original ("Validación de configuración — Fail-fast") no aplica a una historia de estructura.                                          | Validación irrelevante para esta historia.                                               | Reemplazado por VR-01 (16 bounded contexts con 5 capas), VR-02 (cross-module import), VR-03 (domain boundary). Aplicado.|
| Baja      | Technical Notes no referenciaban Doc 14 §24.1 (folder structure) ni §7.1 (shared kernel).                                                  | Tech Lead no tenía guía concreta para implementación.                                    | Technical Notes enriquecidas con referencias específicas. Aplicado.                                                   |
| Baja      | Test Scenarios sin herramientas (faltaba tsc, ESLint, script CI).                                                                           | QA no podía seleccionar qué herramienta usar.                                            | Columna `Tool` agregada con tsc, ESLint y script CI. Aplicado.                                                        |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                              |
| ------------------------------------ | --------- | ----------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | Capacidad técnica de estructura; no hay flujos de pago.                 |
| No introduce contratos firmados      | Pass      | N/A.                                                                    |
| No introduce WhatsApp/chat/push      | Pass      | N/A.                                                                    |
| Respeta human-in-the-loop IA         | Pass      | N/A — no invoca IA.                                                     |
| Respeta backend como source of truth | Pass      | Esta historia crea la estructura que habilita ese principio.            |
| Respeta seed/demo si aplica          | N/A       | No requiere seed/demo. El módulo `seed-demo` se crea como placeholder.  |
| No introduce RAG/vector DB           | Pass      | N/A.                                                                    |
| No introduce multi-tenant enterprise | Pass      | N/A.                                                                    |
| No introduce P4/Future scope         | Pass      | Scope acotado a los 16 bounded contexts del MVP. Sin módulos adicionales.|

---

## 5. Revisión de Acceptance Criteria

### AC originales (Draft)

| AC    | Calidad      | Problema detectado                                                     | Acción aplicada                                                                      |
| ----- | ------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| AC-01 | Not Testable | "Cumple FR/NFR referenciado" — sin criterio de éxito estructural       | Reemplazado por AC-01 (16 bounded contexts con 5 capas)                              |
| AC-02 | Not Testable | "Funciona consistentemente en multi-entorno" — sin criterio de éxito  | Integrado en AC-04 (compilación tsc) y AC-03 (ESLint)                               |

### AC refinados (Ready for Approval)

| AC    | Calidad | Problema detectado | Acción |
| ----- | ------- | ------------------ | ------ |
| AC-01 | Clear   | —                  | —      |
| AC-02 | Clear   | —                  | —      |
| AC-03 | Clear   | —                  | —      |
| AC-04 | Clear   | —                  | —      |
| AC-05 | Clear   | —                  | —      |

---

## 6. Gaps Detectados

### Producto / Negocio
US-090 es capacidad técnica pura. Sin gaps de producto/negocio.

### Backend / API
* Gap resuelto: lista de bounded contexts no enumerada → AC-01 con los 16 módulos de Doc 14 §9.
* Gap resuelto: shared kernel content no especificado → AC-02 con tipos base de Doc 14 §7.1 y §24.1.
* Gap resuelto: ESLint import boundary rule no referenciada → AC-03, EC-01, EC-02 y Technical Notes.
* Gap resuelto: convenciones de nombrado no mencionadas → AC-05 con referencia a Doc 14 §24.2.

### Frontend / UX
No aplica.

### Base de Datos
No aplica en esta US — sin migraciones, sin tablas.

### Seguridad / Autorización
* Aclaración aplicada: N/A explícito — esta historia no introduce endpoints ni runtime authorization.

### IA / PromptOps
No aplica — historia no invoca IA directamente.

### QA / Testing
* Gap resuelto: herramientas de testing no especificadas → tsc, ESLint, script CI en Test Scenarios.
* Gap resuelto: negative tests para import boundary violations agregados (NT-01, NT-02).

### Seed / Demo
No requiere cambios de seed/demo.

### Documentación / Trazabilidad
* Gap resuelto: ADR-ARCH-002 ausente → agregado a Traceability.
* Gap resuelto: NFR IDs incorrectos → corregidos.
* No se detectaron documentation alignment issues en esta historia.

---

## 7. Preguntas Pendientes

No pending blocking questions.

Todas las decisiones relevantes están formalizadas en:
* ADR-ARCH-001 (Modular Monolith, estructura `/src/modules/<bounded-context>/`)
* ADR-ARCH-002 (Clean/Hex, reglas inviolables de capas)
* ADR-BE-001 (TypeScript strict mode)
* Doc 14 §6 (Principios de diseño backend, en particular Principio 2: import boundary)
* Doc 14 §7.1 (Shared kernel: `Result`, `Id`, `CorrelationId`, errores base)
* Doc 14 §9 (Lista de 16 bounded contexts)
* Doc 14 §24.1 (Folder structure propuesta)
* Doc 14 §24.2 (Convenciones de nombrado)

---

## 8. Documentation Alignment Required

No documentation alignment issues detected.

---

## 9. File Update Result

| Campo                                      | Valor                                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                       |
| User Story file path                       | `management/user-stories/US-090-feature-first-domain-modules.md`                         |
| User Story ID verified                     | Yes                                                                                       |
| Decision Resolution artifact found         | No                                                                                        |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-090-decision-resolution.md`             |
| Refinement review artifact created/updated | Yes                                                                                       |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-090-refinement-review.md`                 |
| Final recommended status                   | Ready for Approval                                                                        |
| Next recommended skill                     | eventflow-user-story-approval                                                             |
| Reason                                     | Todos los issues son de calidad interna. No quedan preguntas bloqueantes. Los 16 bounded contexts, el shared kernel y el mecanismo ESLint de import boundaries están completamente especificados desde ADRs y Doc 14. |

---

## 10. Cambios Aplicados

### Metadata
* `Status`: Draft → Ready for Approval
* `Last Updated`: 2026-06-09 → 2026-06-11
* `Feature`: "Estructura feature-first" → "Estructura feature-first" (sin cambio de título)
* Título: enriquecido a "Carpetas por módulo de dominio (feature-first + Clean/Hex)"

### User Story Statement
* Enriquecida la narrativa: especifica 16 bounded contexts, 5 capas por módulo, shared kernel con `Result`, `Id`, `CorrelationId`, errores base, y ESLint import boundary como entregables concretos.

### Business Context
* Agregado: US-089 como prerequisito; US-091 como dependiente.
* Agregado: referencias a ADR-ARCH-001, ADR-ARCH-002, Doc 14 §7.1.
* Assumptions explicitadas: US-089 completado, naming conventions, shared kernel scope.

### Traceability
* `NFR Reference(s)`: reemplazados `NFR-PERF-API-001` (inexistente) y `NFR-OBS-001` (no aplicable) por `NFR-OBS-006` y `NFR-SEC-001`.
* `Related ADR(s)`: agregado `ADR-ARCH-002`.
* `Related Document(s)`: reducidos a /docs/12, /docs/13, /docs/14 (los directamente relevantes para estructura backend).
* `API Endpoint(s)`: N/A explícito.
* `Permission Rule(s)`: N/A explícito.

### Scope Guardrails
* Out of Scope: agregados "implementación de lógica de dominio/use cases", "pipeline de middlewares (US-091)", "migraciones DB".
* Scope Notes: lista completa de los 16 bounded contexts; aclaración sobre shared-kernel vs shared-kernel; stubs/placeholders.

### Acceptance Criteria
* AC-01 y AC-02 originales (no testeables) reemplazados por 5 AC verificables:
  * AC-01: 16 bounded contexts con 5 capas cada uno.
  * AC-02: shared kernel con tipos base compilables.
  * AC-03: ESLint import boundary rule configurada y operativa.
  * AC-04: TypeScript strict compilation sin errores.
  * AC-05: convenciones de nombrado aplicadas en placeholders.

### Edge Cases
* EC-01 original ("configuración faltante") removido — inaplicable.
* EC-01 nuevo: cross-module import detectado por ESLint.
* EC-02 nuevo: domain layer importa infraestructura, detectado por ESLint.

### Validation Rules
* VR-01 original reemplazado: ahora cubre los 16 bounded contexts con 5 capas.
* VR-02: cross-module import prohibido.
* VR-03: domain layer boundary.

### Authorization & Security Rules
* SEC-01: N/A explícito (no hay endpoints de runtime).

### Technical Notes
* Backend: estructura detallada de `src/modules/`, `src/shared/` conforme a Doc 14 §24.1.
* API: N/A explícito.
* Observability: N/A explícito.

### QA / Testing
* Test Scenarios: herramientas (tsc, ESLint, script CI) agregadas.
* NT-01 y NT-02: casos negativos de import boundary.
* Authorization Tests: N/A explícito.

### Task Breakdown
* Tareas de backend especificadas por directorio y tipo de archivo (Doc 14 §24.1).
* Tarea de ESLint import boundary configuration agregada.

### Definition of Ready / Done
* Checklist actualizado: ADR-ARCH-002, import boundaries, shared kernel, convenciones.

---

## 11. Recomendación Final

**Ready for Approval**

La historia US-090 está completamente alineada con las decisiones arquitectónicas formalizadas en ADR-ARCH-001 y ADR-ARCH-002, con la estructura de módulos definida en Doc 14 §9 y §24.1, y con los tipos del shared kernel de Doc 14 §7.1.

Los 5 AC son específicos y verificables: existencia de directorios, shared kernel compilable, ESLint import boundary operativa, compilación TypeScript limpia, y convenciones de nombrado aplicadas. Los edge cases cubren las violaciones arquitectónicas más críticas (cross-module imports y domain layer contaminada con infraestructura).

No quedan preguntas pendientes bloqueantes.

**Próximo paso:** ejecutar `eventflow-user-story-approval` sobre US-090.
