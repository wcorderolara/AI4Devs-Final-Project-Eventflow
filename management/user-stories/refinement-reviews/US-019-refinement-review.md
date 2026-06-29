# User Story Refinement Review — US-019

## Source User Story File
management/user-stories/US-019-ai-budget-distribution.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-019-decision-resolution.md (no requerido / no creado)

## Review Date
2026-06-26

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story ID                              | US-019                                                                                      |
| File Path                                  | management/user-stories/US-019-ai-budget-distribution.md                                    |
| Backlog Item                               | PB-P1-013                                                                                   |
| Epic                                       | EPIC-AIP-001 — AI-Assisted Event Planning                                                   |
| Estado actual                              | Ready for Approval                                                                          |
| Estado recomendado                         | Ready for Approval                                                                          |
| Nivel de riesgo                            | Medio (feature IA financiera + alcance corregido)                                            |
| Calidad general                            | Alta                                                                                        |
| Requiere decisión PO                       | No (lista de categorías resuelta vía `ServiceCategory`; cap por evento delegado a US-037)    |
| Requiere decisión técnica                  | No                                                                                          |
| Requiere decisión QA                       | No                                                                                          |
| Requiere decisión Seguridad                | No                                                                                          |
| Decision Resolution artifact found         | No                                                                                          |
| User Story file updated                    | Yes                                                                                         |
| Refinement review artifact created/updated | Yes (no bloqueante, como evidencia)                                                          |
| Refinement review path                     | management/user-stories/refinement-reviews/US-019-refinement-review.md                      |

---

## 2. Diagnóstico PO/BA

US valiosa y MVP-crítica para AI-003. La versión previa mezclaba **generación** con **aplicación** (creación de `BudgetItem`) que pertenece a US-037, y usaba IDs no canónicos para el `type='budget_distribution'` y el endpoint `/ai/budget`. Tras la corrección de scope, trazabilidad y enums, queda alineada con PB-P1-013, `FR-AI-003`, `BR-AI-*`, `BR-BUDGET-006/007/008/009` y NFR-AI canónicos. Sin preguntas bloqueantes.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                            | Impacto                                                                          | Recomendación                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Alta      | Scope creep: AC-02 (aplicación), endpoint `apply-ai`, `ApplyAIBudgetUseCase`, `BudgetItemEditor`, `budgetApi.applyAIBudget`, TS-01 (aceptación crea BudgetItems). | Solapamiento con US-037 / PB-P1-020.                                              | Removido. US-019 cubre solo la generación; aplicación vive en US-037.                                          |
| Alta      | Enum `AIRecommendation.type` incorrecto: `'budget_distribution'` no existe; canon = `'budget_suggestion'`.                                            | Persistencia rota.                                                               | Corregido.                                                                                                      |
| Alta      | Endpoint canónico: `POST /api/v1/events/:eventId/ai/budget-suggestion`, no `/ai/budget`.                                                              | Mismatch con `/docs/16`.                                                          | Corregido.                                                                                                      |
| Media     | Trazabilidad FR incorrecta: `FR-AI-005` aplica a brief IA de cotización. Canon AI-003 = `FR-AI-003`.                                                  | Trazabilidad rota.                                                               | Corregido. Agregados `FR-AI-009/011/017`.                                                                       |
| Media     | NFRs incorrectos (`NFR-AI-001/002`).                                                                                                                  | Trazabilidad rota.                                                               | Corregido a `NFR-AI-003/005/007/008`.                                                                           |
| Media     | Faltaban BR-AI-007..011 y BR-BUDGET-006/007/008/009 que sustentan el flujo HITL + moneda inmutable + edición libre.                                    | Cobertura de reglas incompleta.                                                  | Agregadas.                                                                                                      |
| Media     | Faltaba Backlog Item PB-P1-013, dependencias (`PB-P1-011, PB-P1-019, PB-P0-007/009..011/014`) y UI surface `PB-P1-044`.                              | Planificación de sprint dificultada.                                              | Agregadas.                                                                                                      |
| Media     | Rate limit IA no cuantificado; faltaba EC dedicado al `429`.                                                                                          | Operación sin criterio.                                                          | Cuantificado a 20/usuario/h (`SEC-POL-AI-007`); agregado EC-06 y AI-TS-08.                                       |
| Media     | Categorías canónicas no especificadas: el output debe mapear a `ServiceCategory.code` activos.                                                        | Datos no integrables al modelo.                                                  | Documentado en assumption, AI Input, AI Output, AC y validador.                                                  |
| Baja      | "Confirmar lista canónica de categorías base" en Notes.                                                                                                | No es pregunta PO abierta.                                                       | Resuelta: usar `ServiceCategory.code` activos.                                                                  |
| Baja      | Falta cobertura para casos `cancelled/completed/deleted`, admin invoca, idioma no soportado, categoría desconocida.                                    | QA insuficiente.                                                                  | Agregados NT-03..NT-07, VR-04..07, AI-TS-04, EC-03/EC-04/EC-06.                                                  |
| Baja      | UI ruta `/events/:id/budget` ambigua con vista de presupuesto.                                                                                         | Confusión UX.                                                                    | Cambiada a `/[locale]/organizer/events/:id/ai/budget`.                                                          |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                          |
| ------------------------------------ | --------- | ----------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | Sólo sugerencia                                                                     |
| No introduce contratos firmados      | Pass      | N/A                                                                                 |
| No introduce WhatsApp/chat/push      | Pass      | Sólo HTTP                                                                            |
| Respeta human-in-the-loop IA         | Pass      | `AIRecommendation` pending; `BudgetItem` en US-037                                   |
| Respeta backend como source of truth | Pass      | LLM solo desde backend                                                               |
| Respeta seed/demo si aplica          | Pass      | `MockAIProvider` determinista por idioma/moneda                                      |
| No introduce RAG/vector DB           | Pass      | Out of Scope                                                                         |
| No introduce multi-tenant enterprise | Pass      | N/A                                                                                  |
| No introduce P4/Future scope         | Pass      | `AnthropicProvider` stub                                                              |
| Sin conversión automática de moneda   | Pass      | `BR-BUDGET-007`                                                                       |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad         | Problema detectado                                                                | Acción recomendada                          |
| ----- | --------------- | --------------------------------------------------------------------------------- | ------------------------------------------- |
| AC-01 | Clear           | Faltaba HITL inicial y mapeo a categorías canónicas.                              | Reescrito.                                   |
| AC-02 | Movido          | Aplicación pertenece a US-037.                                                     | Removido aquí; documentado en US-037.       |
| AC-02 (nuevo) | Clear | Idioma y moneda respetados.                                                        | Agregado.                                    |
| AC-03 | Clear           | Trazabilidad completa.                                                             | Agregado.                                    |
| AC-04 | Clear (nuevo)   | Estructura de la distribución (suma=100, mapping de categorías).                   | Agregado.                                    |
| EC-01 | Clear           | `budget_estimated <= 0` → 400 `INVALID_BUDGET`.                                    | Mantenido y endurecido.                      |
| EC-02 | Clear           | Suma ≠ 100 → retry + failed.                                                       | Reescrito.                                   |
| EC-03 | Clear (nuevo)   | Categoría desconocida → retry + failed.                                            | Agregado.                                    |
| EC-04 | Clear           | Timeout 60 s.                                                                      | Diferenciado prod vs demo.                   |
| EC-05 | Clear (nuevo)   | Provider error.                                                                    | Agregado.                                    |
| EC-06 | Clear (nuevo)   | Rate limit `429`.                                                                  | Agregado.                                    |

---

## 6. Gaps Detectados

### Producto / Negocio

* Scope corregido a generación únicamente; aplicación delegada a US-037.

### Backend / API

* Endpoint canónico aplicado; aplicación removida.

### Frontend / UX

* Componentes renombrados; forms RHF removidos (viven en US-037).

### Base de Datos

* `budget_items` no se toca aquí.
* Sin migraciones.

### Seguridad / Autorización

* SEC-02 cuantificado; SEC-06 (Secrets Manager) agregado.
* Matriz negativa extendida.

### IA / PromptOps

* HITL inicial documentado; validador estricto (suma + categorías).

### QA / Testing

* AI-TS-02..08, NT-01..07, EC-01..06 cubiertos.

### Seed / Demo

* `MockAIProvider` debe respetar `currency_code` activo del evento.

### Documentación / Trazabilidad

* Backlog ID, UI surface y trazabilidad canónica agregadas.

---

## 7. Preguntas Pendientes

No pending blocking questions.

(La pregunta sobre lista de categorías queda resuelta por `ServiceCategory.code` activos.)

---

## 8. Documentation Alignment Required

| Documento / Fuente                                | Conflicto detectado                                                                | Decisión vigente                                              | Acción recomendada                                                                | ¿Bloquea aprobación? |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------- |
| `/docs/16-API-Design-Specification.md`            | Confirmar snapshot OpenAPI con códigos `429`/`5xx`.                                | Endpoint canónico ya documentado.                              | Regenerar snapshot vía US-098.                                                    | No                   |
| `/docs/8-Use-Cases-Specification.md`              | `UC-AI-003` se describe como "Generar checklist con IA"; `/docs/9` lo mapea a AI-003. | Mantener el mapeo del FRD.                                    | Aclaración liviana en `/docs/8`.                                                  | No                   |
| `/docs/9-Functional-Requirements-Document.md`     | Versión previa referenciaba `FR-AI-005`.                                            | Canon: `FR-AI-003` + `FR-AI-009/011/017`.                      | Mantener mapeo canónico.                                                          | No                   |
| `/docs/10-Non-Functional-Requirements.md`         | Versión previa referenciaba `NFR-AI-001/002`.                                       | Canon: `NFR-AI-003/005/007/008`.                              | Mantener mapeo canónico.                                                          | No                   |
| `/docs/7-AI-Features-Specification.md`            | Invariante `Σ percentage = 100` no está explícita.                                  | Implementación lo enforced por Zod.                            | Registrar como invariante del output IA en `/docs/7`.                              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                |
| User Story file path                       | `management/user-stories/US-019-ai-budget-distribution.md`                         |
| User Story ID verified                     | Yes                                                                                |
| Decision Resolution artifact found         | No                                                                                 |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-019-decision-resolution.md`        |
| Refinement review artifact created/updated | Yes                                                                                |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-019-refinement-review.md`           |
| Final recommended status                   | Ready for Approval                                                                 |
| Next recommended skill                     | eventflow-user-story-approval                                                      |
| Reason                                     | Sin preguntas bloqueantes; correcciones de scope, trazabilidad y enums aplicadas. |

---

## 10. Cambios Aplicados o Recomendados

### Metadata

* Backlog Item `PB-P1-013`, UI Surface `PB-P1-044`, `Status → Ready for Approval`, `Last Updated → 2026-06-26`.

### Business Context

* Reescritura para reflejar que la generación crea solo `AIRecommendation` y que la materialización es responsabilidad de US-037; agregadas dependencias canónicas.

### PO/BA Decisions Applied

* Nueva sección con 10 decisiones formalizadas (PO 8.1 #7/#9/#15; HITL `BR-AI-*`; rate limit; endpoint; tipo canónico; status enum; categorías = `ServiceCategory.code`; moneda inmutable y sin conversión).

### Traceability

* `FR-AI-003/009/011/017`, `UC-AI-003`, `BR-AI-001..011`, `BR-BUDGET-001/006/007/008/009`, `NFR-AI-003/005/007/008`, `ADR-AI-001`, `SEC-POL-AI-007`, `PB-P1-013`, PO 8.1 #7/#9/#15.

### Scope Guardrails

* `Out of Scope` endurecido (aplicación en US-037, AnthropicProvider operativo, conversión automática).

### Acceptance Criteria

* AC-01 reescrito (sin `BudgetItem`).
* AC-02 (aplicación) movido a US-037.
* AC-02 (nuevo), AC-03, AC-04 agregados.
* EC-01..06 normalizados; EC-03 (categoría desconocida) y EC-06 (429) agregados.

### Technical Notes

* Endpoint canónico; ruta UI renombrada; sin migraciones; aplicación y edición previa movidos a US-037.

### QA Notes

* AI-TS-02..08, NT-03..07, EC-03/EC-04/EC-06 agregados.

### Definition of Ready

* Todas las casillas marcadas salvo PO/BA validó.

### Definition of Done

* Reformulada (HITL pending sin `BudgetItem`, validación suma=100, mapeo a `ServiceCategory.code`, rate limit).

### Notes

* Documentation Alignment Required y delegación a US-037 explícitas.

---

## 11. Recomendación Final

**Ready for Approval.** Scope, trazabilidad, AC, edge cases, validación financiera (suma=100, moneda inmutable) y seguridad alineados con la documentación canónica. Próximo paso: ejecutar `eventflow-user-story-approval`.
