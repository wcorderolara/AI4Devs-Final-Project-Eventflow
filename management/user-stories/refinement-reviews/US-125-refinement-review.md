# User Story Refinement Review — US-125

## Source User Story File
management/user-stories/US-125-configure-vitest-supertest-playwright-msw.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-125-decision-resolution.md

## Review Date
2026-06-22

---

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| User Story ID                              | US-125                                                                           |
| File Path                                  | management/user-stories/US-125-configure-vitest-supertest-playwright-msw.md      |
| Backlog Item                               | PB-P0-015 — QA Tooling Setup                                                     |
| Epic                                       | EPIC-QA-001 — Testing & Quality Gates                                            |
| Estado actual                              | Draft → Ready for Approval                                                       |
| Estado recomendado                         | Ready for Approval                                                               |
| Nivel de riesgo                            | Bajo                                                                             |
| Calidad general                            | Alta (después de refinamiento)                                                   |
| Requiere decisión PO                       | No                                                                               |
| Requiere decisión técnica                  | No                                                                               |
| Requiere decisión QA                       | No                                                                               |
| Requiere decisión Seguridad                | No                                                                               |
| Decision Resolution artifact found         | No                                                                               |
| User Story file updated                    | Yes                                                                              |
| Refinement review artifact created/updated | Yes (evidencia post-refinamiento, no bloqueante)                                 |
| Refinement review path                     | management/user-stories/refinement-reviews/US-125-refinement-review.md           |

---

## 2. Diagnóstico PO/BA

US-125 es una historia de **foundation P0** asociada 1:1 al backlog item **PB-P0-015** y totalmente respaldada por **ADR-TEST-001** (Vitest + Supertest en backend) y **ADR-TEST-002** (MSW + Playwright en frontend/E2E), ambos `Accepted`. Su valor es estrictamente habilitador: sin este setup, las historias siguientes no pueden implementar quality gates desde el primer commit y el pipeline de PB-P0-017 no tiene scripts npm consistentes a invocar.

En su versión Draft la historia mostraba el patrón de plantilla genérica: AC y test scenarios boilerplate, traceability vacía, secciones UX/AI/API que no aplican pero no estaban marcadas como `No aplica`, y omisiones críticas para una historia de tooling: scripts npm concretos, configuración de MSW (`onUnhandledRequest`), modo de uso de Supertest sobre la app Express, comportamiento de Playwright ante browsers faltantes, y delimitación clara del out-of-scope frente a PB-P2-014/015/016 y PB-P0-017.

El refinamiento normaliza al contexto correcto:

* Story statement reescrito explicitando el alcance "setup base", no suites funcionales.
* `PO/BA Decisions Applied` agrega referencias formales a ADR-TEST-001, ADR-TEST-002 y a la separación de scope con PB-P2-014/015/016 / PB-P0-017.
* Traceability completa con PB-P0-015, NFR-TEST-*, ADRs y Docs (20, 14, 15, 21, 22, 11).
* Siete AC específicos y testeables por herramienta (Vitest backend, Supertest, Vitest+MSW frontend, Playwright, scripts npm, MSW dev/test wiring, documentación).
* Cuatro edge cases operacionales (DB ausente, browsers Playwright ausentes, requests sin handler MSW, conflicto de puertos).
* Reglas de seguridad SEC-01..04 que cubren secretos en tests y `baseURL` de Playwright.
* Out of Scope explícito frente a suites funcionales, CI wiring, umbrales de cobertura bloqueantes, visual regression, mutation testing y AI tests.
* DoR/DoD alineadas a AC reales y al gate de Tech Lead.

No se detectan blockers PO/Tech/QA/Security: todas las decisiones materiales están en ADRs aceptados o en Doc 20.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                  | Impacto                                                                                | Recomendación                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Media     | Versión Draft no diferenciaba "setup base" vs "suites completas".                                          | Riesgo de scope creep hacia PB-P2-014/015/016 dentro de un P0 foundation.              | Out of Scope explícito y nota dirigida a PB-P2-* (aplicado).                                                    |
| Media     | Faltaba ADR-TEST-002 en Traceability; sólo aparecía ADR-TEST-001.                                          | Decisión MSW+Playwright quedaba sin respaldo formal en la historia.                    | Agregada referencia (aplicado).                                                                                 |
| Media     | AC y tests genéricos ("capacidad operativa") no validan herramientas concretas.                            | Imposible determinar Done de manera objetiva.                                          | Reescritos siete AC por herramienta y agregados test scenarios concretos (aplicado).                            |
| Baja      | Story statement contenía caracteres literales `\n` en lugar de saltos reales.                              | Renderizado pobre, ruido visual.                                                       | Reescrito (aplicado).                                                                                           |
| Baja      | Edge cases describían dependencias caídas de forma genérica.                                               | Sin guía operativa para Tech Lead y QA.                                                | Reemplazados por 4 edge cases específicos al stack (DB efímera, Playwright browsers, MSW, puertos) (aplicado).  |
| Baja      | Secciones UX/AI/API/Observability mezclaban "Si aplica" y "N/A".                                          | Ambigüedad para QA y revisores.                                                        | Normalizadas con `No aplica` explícito (aplicado).                                                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                  |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | Tooling de testing.                                                                          |
| No introduce contratos firmados      | Pass      | N/A.                                                                                         |
| No introduce WhatsApp/chat/push      | Pass      | N/A.                                                                                         |
| Respeta human-in-the-loop IA         | N/A       | No invoca IA.                                                                                |
| Respeta backend como source of truth | Pass      | Supertest opera contra `app` Express; MSW solo en frontend.                                  |
| Respeta seed/demo si aplica          | Pass      | Reconoce Doc 11; suite E2E sobre seed se entrega en PB-P2-016, no aquí.                      |
| No introduce RAG/vector DB           | Pass      | N/A.                                                                                         |
| No introduce multi-tenant enterprise | Pass      | N/A.                                                                                         |
| No introduce P4/Future scope         | Pass      | Mutation testing y visual regression listados como out-of-scope.                              |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad   | Problema detectado                                                              | Acción recomendada                                                              |
| ----- | --------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| AC-01 | Clear     | —                                                                               | Mantener.                                                                       |
| AC-02 | Clear     | —                                                                               | Mantener.                                                                       |
| AC-03 | Clear     | —                                                                               | Mantener.                                                                       |
| AC-04 | Clear     | —                                                                               | Mantener.                                                                       |
| AC-05 | Clear     | —                                                                               | Mantener.                                                                       |
| AC-06 | Clear     | —                                                                               | Mantener.                                                                       |
| AC-07 | Clear     | Doc mínima podría ampliarse; aceptable para P0 foundation.                       | Tech Lead puede sugerir nivel de detalle en revisión.                            |

---

## 6. Gaps Detectados

### Producto / Negocio
No aplica.

### Backend / API
* Convención exacta de carpeta de tests (`tests/`, `__tests__/`, co-located) queda como decisión técnica menor a confirmar en implementación. Documentado en Notes — no bloquea aprobación.

### Frontend / UX
* Si PB-P0-013 (TanStack Query + MSW + Layouts) ya inicializó parte del wiring MSW, el equipo debe extender, no duplicar. Documentado en Notes.

### Base de Datos
* `DATABASE_URL` esperada por la suite de integración debe documentarse en `README`. Documentado en Notes y AC-07.

### Seguridad / Autorización
No aplica al runtime. Reglas SEC-01..04 cubren secretos y `baseURL` Playwright.

### IA / PromptOps
No aplica.

### QA / Testing
* Umbrales de cobertura bloqueantes quedan fuera de scope (reporting-only en P0). Confirmado por out-of-scope.

### Seed / Demo
No requiere cambios de seed/demo. La suite E2E sobre seed se entrega en PB-P2-016.

### Documentación / Trazabilidad
* AC-07 cubre `README` mínimo. Sin gaps adicionales.

---

## 7. Preguntas Pendientes

No pending blocking questions.

---

## 8. Documentation Alignment Required

No documentation alignment issues detected.

---

## 9. File Update Result

| Campo                                      | Valor                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                         |
| User Story file path                       | `management/user-stories/US-125-configure-vitest-supertest-playwright-msw.md`               |
| User Story ID verified                     | Yes                                                                                         |
| Decision Resolution artifact found         | No                                                                                          |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-125-decision-resolution.md` (no existe)    |
| Refinement review artifact created/updated | Yes                                                                                         |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-125-refinement-review.md`                    |
| Final recommended status                   | Ready for Approval                                                                          |
| Next recommended skill                     | eventflow-user-story-approval                                                               |
| Reason                                     | Decisiones materiales formalizadas en ADR-TEST-001/002 y Doc 20; sin blockers PO/Tech/QA/Sec. |

---

## 10. Cambios Aplicados

### Metadata
* Agregado `Backlog Item: PB-P0-015`.
* `Status: Draft → Ready for Approval`.
* `Last Updated: 2026-06-22`.

### Business Context
* `Context Summary`, `Related Domain Concepts`, `Assumptions`, `Dependencies` reescritos con referencias a Doc 20 §7, Doc 11, PB-P0-002, PB-P0-012 y ADRs.

### PO/BA Decisions Applied
* Sección nueva agregada con 5 decisiones formalizadas (ADR-TEST-001, ADR-TEST-002, separación con PB-P2-*, alineación con PB-P0-017, MSW vs OpenAPI).

### Traceability
* Reemplazado por: PB-P0-015, NFR-TEST-*, ADR-TEST-001, ADR-TEST-002, ADR-DEVOPS-001, Docs 20/14/15/21/22/11.
* FR/UC/BR marcados como "Transversal — no implementa directamente un FR/UC".

### Scope Guardrails
* Out of Scope explícito (suites funcionales, CI wiring, umbrales bloqueantes, visual regression, mutation testing, AI tests).
* Scope Notes aclaran "setup + tests de humo".

### Acceptance Criteria
* AC-01..07 reescritos al stack concreto (Vitest backend, Supertest, Vitest+MSW frontend, Playwright, scripts npm, MSW wiring, doc).
* EC-01..04 reescritos a fallos operacionales reales del tooling.

### Technical Notes
* Setup esperado documentado para frontend (`src/test/setup.ts`, `src/mocks/*`) y backend (`vitest.config.ts`, setup global DB efímera).
* API consume solo `GET /healthz` para test de humo.

### QA Notes
* Test scenarios TS-01..05 concretos.
* Negative tests NT-01..04 alineados a edge cases.
* `AI Tests: No aplica`.

### Definition of Ready
* Checklist actualizada con referencias reales; único pendiente: validación Tech Lead.

### Definition of Done
* DoD reescrita con criterios verificables (scripts, MSW, doc, gate CI compatible).

### Notes
* Aclaración de foundation-only, herencia de scaffold, convención de carpetas como decisión técnica menor.

---

## 11. Recomendación Final

**Ready for Approval.**

La historia queda totalmente alineada con PB-P0-015 y los ADRs vigentes; sus AC son verificables herramienta-por-herramienta; el out-of-scope evita confusión con PB-P2-014/015/016 y PB-P0-017; no hay decisiones bloqueantes pendientes. Próximo paso: ejecutar `eventflow-user-story-approval`.
