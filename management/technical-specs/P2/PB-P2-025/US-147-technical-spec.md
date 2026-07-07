# Technical Specification — PB-P2-025 / US-147: Crear índice de ADRs

## 1. Metadata

| Field                                | Value                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| User Story ID                        | US-147                                                                             |
| Source User Story                    | `management/user-stories/US-147-adr-index.md`                                      |
| Decision Resolution Artifact         | N/A — no existe `management/user-stories/decision-resolutions/US-147-decision-resolution.md` |
| Priority                             | P2 (Should Have)                                                                   |
| Backlog ID                           | PB-P2-025                                                                          |
| Backlog Title                        | Trazabilidad US ↔ FRD/UC/BR (matriz canónica) — "ADR index + matriz canónica"      |
| Backlog Execution Order              | 25 (vigésimo quinto ítem de P2)                                                    |
| User Story Position in Backlog Item  | 1 de 2 (US-147 índice de ADRs; US-148 matriz de trazabilidad)                      |
| Related User Stories in Backlog Item | US-147, US-148                                                                     |
| Epic                                 | EPIC-ACAD-001 — Academic Traceability                                             |
| Backlog Item Dependencies            | — (sin dependencias de backlog)                                                    |
| Feature                              | Índice ADRs                                                                        |
| Module / Domain                      | Demo / Académica                                                                   |
| User Story Status                    | Approved with Minor Notes                                                          |
| Backlog Alignment Status             | Found (mapping dual PB-P2-025 / PB-P3-008 resuelto por PO a PB-P2-025)             |
| Technical Spec Status                | Ready for Task Breakdown                                                           |
| Created Date                         | 2026-07-07                                                                         |
| Last Updated                         | 2026-07-07                                                                         |

---

## 2. Source Validation

| Source                       | Found | Used | Notes                                    |
| ---------------------------- | ----- | ---- | ---------------------------------------- |
| User Story                   | Yes   | Yes  | `Approved with Minor Notes`.              |
| Technical Specification      | N/A   | N/A  | Este documento.                          |
| Decision Resolution Artifact | No    | No   | No existe para US-147.                    |
| Product Backlog Prioritized  | Yes   | Yes  | US-147 referenciada en PB-P2-025 y PB-P3-008; PO eligió PB-P2-025. |
| ADRs                         | Yes   | Yes  | Doc 22 (46 ADRs aceptados).               |

---

## 3. Backlog Execution Context

### Product Backlog Item

**PB-P2-025 — Trazabilidad US ↔ FRD/UC/BR (matriz canónica)** (EPIC-ACAD-001, P2, Should Have). Crear y mantener: (a) **índice de ADRs ≥5 aceptados**, (b) `management/artifacts/User-Stories-Traceability-Matrix.md` con mapping US ↔ FRD/UC/BR/NFR/ADR. Acceptance: índice ADR vivo; matriz cubre 100% US; validación de cobertura en CI opcional. Dependencias: —. Trazabilidad: Doc 22 · Decisión PO US-148.

**Alcance de US-147 dentro de PB-P2-025:** la parte **(a) índice de ADRs**. La parte (b) matriz de trazabilidad corresponde a **US-148**.

### Execution Order Rationale

Vigésimo quinto ítem de P2. Historia académica (EPIC-ACAD-001) sin dependencias de código. US-147 aparece también en PB-P3-008 (P3, dedicado al índice de ADRs); el Product Owner resolvió la ambigüedad eligiendo **PB-P2-025** como ítem canónico de entrega.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-147     | Índice de ADRs (parte a)                       | 1               |
| US-148     | Matriz de trazabilidad US ↔ FRD/UC/BR (parte b)| 2               |

---

## 3.1 Executive Technical Summary

Se debe crear/mantener un **índice maestro navegable de ADRs aceptados** como evidencia académica (EPIC-ACAD-001). El ADR Log canónico vive en `docs/22-Architecture-Decision-Records.md` (actualmente **46 ADRs aceptados**, superando ampliamente el umbral de ≥5). El índice lista cada ADR aceptado con **título, estado, categoría y enlace** (ancla) a su sección del Doc 22, y se mantiene **vivo** (sincronizado ante altas/cambios/`Superseded`). Opcionalmente, una **validación de cobertura en CI** compara el índice con la tabla del Doc 22.

Es un artefacto **documental** (Markdown); no implica backend, frontend, BD ni IA. No incluye la matriz de trazabilidad (US-148) ni la autoría/modificación de ADRs.

---

## 4. Scope Boundary

### In Scope

* Artefacto de **índice maestro de ADRs** (Markdown) con título, estado, categoría y enlace a Doc 22.
* Cobertura de **≥5 ADRs aceptados** (Doc 22 ya tiene 46).
* **Navegabilidad** (anclas/links a las secciones del Doc 22).
* Estados **claros** (`Accepted`/`Superseded`/etc.) reflejando el Doc 22.
* Proceso de **sincronización** documentado (índice vivo); generación manual o script.
* **Validación de cobertura en CI opcional** (no bloqueante).

### Out of Scope

* Matriz canónica de trazabilidad US ↔ FRD/UC/BR/NFR/ADR (US-148).
* Autoría de nuevos ADRs o modificación de ADRs existentes.
* Cambios de gobernanza del ADR Log.

### Explicit Non-Goals

* No reemplazar el Doc 22 (fuente de verdad).
* No convertir la validación de CI en compuerta bloqueante obligatoria.

---

## 5. Architecture Alignment

### Backend / Frontend / Database / API / AI Architecture

No aplica — artefacto documental.

### Security Architecture

Sin secretos; artefacto público de documentación.

### Testing Architecture

Verificación de cobertura del índice vs Doc 22 (opcional en CI); revisión de estados/enlaces.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (índice de aceptados) | Generar índice con título/estado/categoría/enlace de los ADRs aceptados del Doc 22. | Documentación |
| AC-02 (navegable) | Anclas/links a secciones del Doc 22. | Documentación |
| AC-03 (estados claros) | Reflejar el estado de cada ADR según Doc 22. | Documentación |
| AC-04 (índice vivo) | Documentar proceso de sincronización (manual o script). | Documentación/DevOps |
| AC-05 (CI opcional) | Validación de cobertura índice↔Doc 22 (opcional, no bloqueante). | CI (opcional) |

---

## 7. Backend Technical Design

No aplica — artefacto documental.

---

## 8. Frontend Technical Design

No aplica.

---

## 9. API Contract Design

No aplica.

---

## 10. Database / Prisma Design

No aplica.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

No aplica autorización runtime. Sin secretos en el índice.

---

## 13. Testing Strategy

### Documentation / Coverage Tests
* Verificar que el índice lista ≥5 ADRs aceptados con título/estado/enlace.
* Verificar que cada entrada enlaza a su sección del Doc 22.
* (Opcional) Validación de cobertura en CI: el índice cubre los ADRs aceptados del Doc 22.

### Negative Tests
* ADR aceptado ausente del índice → señalado como desactualizado.
* Entrada sin estado/enlace → inválida.

### CI Checks
Validación de cobertura opcional (no bloqueante).

---

## 14. Observability & Audit

No aplica — artefacto documental.

---

## 15. Seed / Demo Data Impact

No aplica.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Mapping de backlog dual (PB-P2-025 vs PB-P3-008) | US-147 referenciada en dos ítems | El PO eligió PB-P2-025 (P2) como canónico | Documentar la decisión; PB-P3-008 queda como su duplicado P3 | No |
| Ubicación del índice | `management/artifacts/ADR-Index.md` vs índice dentro del Doc 22 | Sugerido `management/artifacts/ADR-Index.md` | Confirmar con Tech Lead | No |
| Activación de la validación en CI | Opcional | No obligatoria | Confirmar si se activa | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Índice desactualizado vs Doc 22 | Evidencia inconsistente | Proceso de sincronización documentado; validación opcional en CI |
| Duplicación de fuente de verdad | Confusión | El índice referencia el Doc 22; no lo reemplaza |
| Enlaces rotos a secciones | Navegación fallida | Usar anclas estables; verificar enlaces |

---

## 18. Implementation Guidance for Coding Agents

* **Archivos/carpetas probablemente impactados:** `management/artifacts/ADR-Index.md` (nuevo) referenciando `docs/22-Architecture-Decision-Records.md`; opcionalmente un script de generación/validación y un paso de CI (opcional).
* **Orden recomendado:** (1) definir formato del índice (título, estado, categoría, enlace); (2) poblar con los ADRs aceptados del Doc 22 (≥5; hoy 46); (3) documentar el proceso de sincronización; (4) opcional: script de generación desde la tabla del Doc 22 + validación de cobertura en CI.
* **Decisiones que no deben reabrirse:** Doc 22 como fuente de verdad; PB-P2-025 como ítem canónico; alcance = índice de ADRs (la matriz es US-148).
* **Qué no implementar:** la matriz de trazabilidad (US-148); nuevos ADRs; validación bloqueante obligatoria.
* **Suposiciones a preservar:** el Doc 22 existe y contiene ≥5 ADRs aceptados.

---

## 19. Task Generation Notes

* **Grupos de tareas sugeridos:** (DOC) crear el índice maestro de ADRs; (DOC) documentar el proceso de sincronización; (QA/OPS opcional) validación de cobertura en CI.
* **Tareas QA requeridas:** verificar cobertura del índice vs Doc 22.
* **Tareas de seguridad requeridas:** ninguna.
* **Tareas de seed/demo requeridas:** ninguna.
* **Tareas de documentación requeridas:** el índice y su proceso de sincronización (núcleo de la historia).
* **Dependencias entre tareas:** definir formato antes de poblar; poblar antes de la validación opcional.
* **Consolidación:** PB-P2-025 puede consolidar sus tareas (US-147 + US-148) en un `tasks.md` propio.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P2-025, resuelto por PO) |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass (documental) |
| API impact clear | N/A |
| DB impact clear | N/A |
| AI impact clear | N/A |
| Security impact clear | N/A |
| Testing strategy clear | Pass (cobertura opcional) |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La historia está aprobada, mapeada a PB-P2-025 (decisión del PO), con alcance claro (índice maestro navegable de ADRs aceptados como evidencia académica), delimitada frente a US-148 (matriz de trazabilidad). Es un artefacto documental sin impacto de backend/DB/AI. Las alertas de Documentation Alignment (mapping dual resuelto; ubicación del índice; validación CI opcional) son **no bloqueantes**. Documentación y verificación están suficientemente definidas para generar Development Tasks.
