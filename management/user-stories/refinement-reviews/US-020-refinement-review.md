# User Story Refinement Review — US-020

## Source User Story File
management/user-stories/US-020-ai-recommended-categories.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-020-decision-resolution.md (no requerido / no creado)

## Review Date
2026-06-26

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story ID                              | US-020                                                                                      |
| File Path                                  | management/user-stories/US-020-ai-recommended-categories.md                                  |
| Backlog Item                               | PB-P1-014                                                                                   |
| Epic                                       | EPIC-AIP-001 — AI-Assisted Event Planning                                                   |
| Estado actual                              | Ready for Approval                                                                          |
| Estado recomendado                         | Ready for Approval                                                                          |
| Nivel de riesgo                            | Bajo-Medio (feature IA informativa, sin escrituras downstream)                               |
| Calidad general                            | Alta                                                                                        |
| Requiere decisión PO                       | No (feedback "no relevante" delegado a mejoras futuras)                                      |
| Requiere decisión técnica                  | No                                                                                          |
| Requiere decisión QA                       | No                                                                                          |
| Requiere decisión Seguridad                | No                                                                                          |
| Decision Resolution artifact found         | No                                                                                          |
| User Story file updated                    | Yes                                                                                         |
| Refinement review artifact created/updated | Yes (no bloqueante)                                                                          |
| Refinement review path                     | management/user-stories/refinement-reviews/US-020-refinement-review.md                      |

---

## 2. Diagnóstico PO/BA

US clara y valiosa (CTR a directorio). Tras corregir enum (`'vendor_categories'`), endpoint canónico (`/ai/vendor-categories`), trazabilidad (FR/NFR) y formalizar el filtro contra `ServiceCategory.is_active`, queda alineada con PB-P1-014 y la fundación IA existente. Sin preguntas bloqueantes.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                            | Impacto                                                                          | Recomendación                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Alta      | Enum `AIRecommendation.type` incorrecto: `'priority_categories'` no existe; canon = `'vendor_categories'`.                                            | Persistencia rota.                                                               | Corregido.                                                                                                      |
| Alta      | Endpoint canónico: `POST /api/v1/events/:eventId/ai/vendor-categories`, no `/ai/categories`.                                                          | Mismatch con `/docs/16`.                                                          | Corregido.                                                                                                      |
| Media     | FR incorrecto: `FR-AI-006` aplica a resumen IA de cotizaciones. Canon AI-004 = `FR-AI-004`.                                                           | Trazabilidad rota.                                                               | Corregido. Agregados `FR-AI-009/011/012/017`.                                                                  |
| Media     | NFRs incorrectos (`NFR-AI-001`).                                                                                                                      | Trazabilidad rota.                                                               | Corregido a `NFR-AI-003/005/007/008`.                                                                           |
| Media     | Faltaba Backlog Item PB-P1-014, dependencias canónicas y UI surface.                                                                                  | Planificación de sprint dificultada.                                              | Agregadas.                                                                                                      |
| Media     | Filtro contra `ServiceCategory.is_active=true` no explícito en AC/validador.                                                                          | Datos no integrables.                                                            | Aplicado en AC-01, EC-01..02 y validador.                                                                       |
| Media     | Rate limit IA no cuantificado; faltaba EC dedicado al `429`.                                                                                          | Operación sin criterio.                                                          | Cuantificado (`SEC-POL-AI-007`); agregado EC-05 y AI-TS-07.                                                     |
| Baja      | Click-through informal (`/vendors?...`); ruta canónica del organizer es `/[locale]/organizer/vendors?...`.                                            | Inconsistencia de routing.                                                       | Alineado con US-045.                                                                                            |
| Baja      | Invariantes del output (`priority_score ∈ [0,1]`, `reason` ≤ 240) no documentadas.                                                                     | Posible salida ambigua del LLM.                                                  | Agregadas como VR-05/VR-06; documentar en `/docs/7`.                                                            |
| Baja      | "Feedback no relevante" en Notes — pregunta PO de bajo impacto.                                                                                        | No aplica MVP.                                                                   | Reclasificado como fuera de scope MVP.                                                                          |
| Baja      | Cobertura de matriz negativa y AI behaviors limitada.                                                                                                  | QA insuficiente.                                                                  | Agregados NT-03..NT-07, AI-TS-02..07, TS-03/TS-04.                                                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                          |
| ------------------------------------ | --------- | ----------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | N/A                                                                                  |
| No introduce contratos firmados      | Pass      | N/A                                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | Sólo HTTP                                                                            |
| Respeta human-in-the-loop IA         | Pass      | Lista informativa; no crea entidades oficiales                                       |
| Respeta backend como source of truth | Pass      | LLM solo desde backend; filtro contra catálogo                                       |
| Respeta seed/demo si aplica          | Pass      | `MockAIProvider` determinista por idioma                                              |
| No introduce RAG/vector DB           | Pass      | N/A                                                                                  |
| No introduce multi-tenant enterprise | Pass      | N/A                                                                                  |
| No introduce P4/Future scope         | Pass      | `AnthropicProvider` stub                                                              |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad         | Problema detectado                                                                | Acción recomendada                          |
| ----- | --------------- | --------------------------------------------------------------------------------- | ------------------------------------------- |
| AC-01 | Clear           | Reescrito con HITL pending y filtro estricto contra catálogo activo.              | Aplicada.                                    |
| AC-02 | Clear           | Click-through alineado con `/[locale]/organizer/vendors?...` (US-045).            | Aplicada.                                    |
| AC-03 | Clear (nuevo)   | Trazabilidad completa.                                                             | Agregada.                                    |
| AC-04 | Clear (renombrado) | Telemetría de click agregada.                                                    | Aplicada.                                    |
| EC-01 | Clear           | Categoría desconocida → omitir + log.                                              | Aplicada.                                    |
| EC-02 | Clear (nuevo)   | Lista vacía tras filtro → retry; si falla, `AI_INVALID_OUTPUT`.                    | Agregada.                                    |
| EC-03 | Clear           | Timeout diferenciado prod vs demo.                                                 | Aplicada.                                    |
| EC-04 | Clear (nuevo)   | Provider error.                                                                    | Agregada.                                    |
| EC-05 | Clear (nuevo)   | Rate limit `429`.                                                                  | Agregada.                                    |

---

## 6. Gaps Detectados

### Producto / Negocio

* Feedback "no relevante" reclasificado como fuera de scope MVP.

### Backend / API

* Endpoint canónico y enum corregidos; filtro estricto contra catálogo aplicado.

### Frontend / UX

* Click-through alineado con US-045.

### Base de Datos

* Sin migraciones; reutiliza enums y FKs existentes.

### Seguridad / Autorización

* SEC-02 cuantificado; SEC-06 (Secrets Manager) agregado; matriz negativa extendida.

### IA / PromptOps

* HITL inicial documentado; validador estricto (`priority_score`, `reason`, catálogo activo).

### QA / Testing

* TS-04 (categoría desconocida), AI-TS-02..07, NT-03..07 agregados.

### Seed / Demo

* `MockAIProvider` debe respetar `service_categories_active`.

### Documentación / Trazabilidad

* Backlog ID, UI surface y trazabilidad canónica agregadas.

---

## 7. Preguntas Pendientes

No pending blocking questions.

---

## 8. Documentation Alignment Required

| Documento / Fuente                                | Conflicto detectado                                                                | Decisión vigente                                              | Acción recomendada                                                                | ¿Bloquea aprobación? |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------- |
| `/docs/16-API-Design-Specification.md`            | Confirmar snapshot OpenAPI con códigos `429`/`5xx`.                                | Endpoint canónico ya documentado.                              | Regenerar snapshot vía US-098.                                                    | No                   |
| `/docs/8-Use-Cases-Specification.md`              | `UC-AI-004` se describe como "distribución de presupuesto"; backlog y `/docs/9` lo mapean a AI-004 (categorías). | Mantener el mapeo canónico.                                  | Aclaración liviana en `/docs/8`.                                                  | No                   |
| `/docs/9-Functional-Requirements-Document.md`     | Versión previa referenciaba `FR-AI-006`.                                            | Canon: `FR-AI-004` (+ `FR-AI-009/011/012/017`).                | Mantener mapeo canónico.                                                          | No                   |
| `/docs/10-Non-Functional-Requirements.md`         | Versión previa referenciaba `NFR-AI-001`.                                            | Canon: `NFR-AI-003/005/007/008`.                              | Mantener mapeo canónico.                                                          | No                   |
| `/docs/7-AI-Features-Specification.md`            | Invariantes del output (`priority_score ∈ [0,1]`, `reason` ≤ 240, filtro estricto) no explícitas. | Implementación las enforced.                                  | Registrar en `/docs/7`.                                                          | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                |
| User Story file path                       | `management/user-stories/US-020-ai-recommended-categories.md`                       |
| User Story ID verified                     | Yes                                                                                |
| Decision Resolution artifact found         | No                                                                                 |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-020-decision-resolution.md`        |
| Refinement review artifact created/updated | Yes                                                                                |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-020-refinement-review.md`           |
| Final recommended status                   | Ready for Approval                                                                 |
| Next recommended skill                     | eventflow-user-story-approval                                                      |
| Reason                                     | Sin preguntas bloqueantes; correcciones de trazabilidad, enum y endpoint aplicadas. |

---

## 10. Cambios Aplicados o Recomendados

### Metadata

* Backlog Item `PB-P1-014`, UI Surface (dashboard del evento), `Status → Ready for Approval`, `Last Updated → 2026-06-26`.

### Business Context

* Reescritura para reflejar HITL informativo, filtro contra catálogo y click-through canónico.
* Dependencias canónicas agregadas.

### PO/BA Decisions Applied

* Nueva sección con 9 decisiones formalizadas.

### Traceability

* `FR-AI-004/009/011/012/017`, `UC-AI-004`, `BR-AI-001..011`, `BR-SERVICE-001`, `NFR-AI-003/005/007/008`, `ADR-AI-001`, `SEC-POL-AI-007`, `PB-P1-014`.

### Scope Guardrails

* `Out of Scope` endurecido (feedback, recomendación de vendors, enriquecimiento de catálogo, AnthropicProvider operativo).

### Acceptance Criteria

* AC-01 reescrito; AC-02 alineado con US-045; AC-03 y AC-04 agregados.
* EC-01..05 normalizados; EC-02 (lista vacía) y EC-05 (429) agregados.

### Technical Notes

* Endpoint canónico; componentes actualizados; sin migraciones.

### QA Notes

* AI-TS-02..07, NT-03..07, TS-03/TS-04 agregados.

### Definition of Ready

* Todas las casillas marcadas salvo PO/BA validó.

### Definition of Done

* Reformulada (HITL, filtro estricto, click-through canónico, rate limit).

### Notes

* Documentation Alignment Required explícita.

---

## 11. Recomendación Final

**Ready for Approval.** Scope, trazabilidad, AC, edge cases y seguridad alineados con la documentación canónica. Próximo paso: ejecutar `eventflow-user-story-approval`.
