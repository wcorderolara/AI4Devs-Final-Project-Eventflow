# Technical Specification — PB-P2-025 / US-148: Trazabilidad US → FRD/UC/BR

## 1. Metadata

| Field                                | Value                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| User Story ID                        | US-148                                                                             |
| Source User Story                    | `management/user-stories/US-148-us-frd-uc-traceability.md`                         |
| Decision Resolution Artifact         | N/A — no existe `management/user-stories/decision-resolutions/US-148-decision-resolution.md` |
| Priority                             | P2 (Should Have)                                                                   |
| Backlog ID                           | PB-P2-025                                                                          |
| Backlog Title                        | Trazabilidad US ↔ FRD/UC/BR (matriz canónica) — "ADR index + matriz canónica"      |
| Backlog Execution Order              | 25 (vigésimo quinto ítem de P2)                                                    |
| User Story Position in Backlog Item  | 2 de 2 (US-147 índice de ADRs; US-148 matriz de trazabilidad)                      |
| Related User Stories in Backlog Item | US-147, US-148                                                                     |
| Epic                                 | EPIC-ACAD-001 — Academic Traceability                                             |
| Backlog Item Dependencies            | —                                                                                 |
| Feature                              | Traceability matrix US                                                             |
| Module / Domain                      | Demo / Académica                                                                   |
| User Story Status                    | Approved with Minor Notes                                                          |
| Backlog Alignment Status             | Found (mapping dual PB-P2-025 / PB-P3-009 resuelto a PB-P2-025)                    |
| Technical Spec Status                | Ready for Task Breakdown                                                           |
| Created Date                         | 2026-07-07                                                                         |
| Last Updated                         | 2026-07-07                                                                         |

---

## 2. Source Validation

| Source                       | Found | Used | Notes                                    |
| ---------------------------- | ----- | ---- | ---------------------------------------- |
| User Story                   | Yes   | Yes  | `Approved with Minor Notes`.              |
| Technical Specification      | N/A   | N/A  | Este documento.                          |
| Decision Resolution Artifact | No    | No   | No existe para US-148.                    |
| Product Backlog Prioritized  | Yes   | Yes  | US-148 en PB-P2-025 y PB-P3-009; canónico PB-P2-025. |
| Coverage Matrix              | Yes   | Yes  | `management/artifacts/2-User-Stories-Coverage-Matrix.md` (Epic→Feature→US). |

---

## 3. Backlog Execution Context

### Product Backlog Item

**PB-P2-025 — ADR index + matriz canónica de trazabilidad** (EPIC-ACAD-001, P2, Should Have). (a) índice de ADRs ≥5 aceptados; (b) `management/artifacts/User-Stories-Traceability-Matrix.md` con mapping US ↔ FRD/UC/BR/NFR/ADR. Acceptance: matriz cubre 100% US; validación de cobertura en CI opcional. Dependencias: —.

**Alcance de US-148 dentro de PB-P2-025:** la parte **(b) matriz de trazabilidad**. La parte (a) índice de ADRs corresponde a **US-147**.

### Execution Order Rationale

Vigésimo quinto ítem de P2. Historia académica sin dependencias de código. US-148 aparece también en PB-P3-009 (P3, validación/reporte de gaps); el ítem canónico de entrega es **PB-P2-025** (creación/mantenimiento de la matriz), consistente con la decisión del PO para US-147. PB-P3-009 (validación) es una historia separada.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-147     | Índice de ADRs (parte a)                       | 1               |
| US-148     | Matriz de trazabilidad US ↔ FRD/UC/BR (parte b)| 2               |

---

## 3.1 Executive Technical Summary

Se debe crear/mantener una **matriz canónica de trazabilidad** — `management/artifacts/User-Stories-Traceability-Matrix.md` — que mapee cada **User Story** a sus **FRD / UC / BR / NFR / ADR** de origen, con **cobertura del 100%** de las US del backlog (~150). La fuente es la sección `Traceability` de cada US; las US transversales/foundation (DevOps, QA) se marcan como `Transversal` sin inventar IDs. La matriz se mantiene **viva** (sincronizada) y, opcionalmente, una **validación de cobertura en CI** confirma el 100% de las US.

Es un artefacto **documental** (Markdown); complementa la matriz de cobertura existente (`2-User-Stories-Coverage-Matrix.md`, Epic→Feature→US). No incluye la **validación/reporte de gaps** (PB-P3-009), el índice de ADRs (US-147), ni la autoría de requisitos.

---

## 4. Scope Boundary

### In Scope

* Artefacto `management/artifacts/User-Stories-Traceability-Matrix.md` (Markdown).
* Mapping **US ↔ FRD/UC/BR/NFR/ADR** con **cobertura 100%** de las US.
* Marcado de US **transversales/foundation** como `Transversal` (sin IDs inventados).
* Proceso de **sincronización** documentado (matriz viva); generación manual o script.
* **Validación de cobertura en CI opcional** (no bloqueante).

### Out of Scope

* Herramienta de **validación/reporte de gaps** FRD/UC/BR por US (US-148 / **PB-P3-009**).
* Índice de ADRs (US-147).
* Autoría/modificación de FRD/UC/BR/NFR/ADR.

### Explicit Non-Goals

* No inventar IDs de FRD/UC/BR/NFR/ADR.
* No reemplazar las secciones `Traceability` de las US ni los documentos fuente.
* No convertir la validación de CI en compuerta bloqueante obligatoria.

---

## 5. Architecture Alignment

### Backend / Frontend / Database / API / AI Architecture

No aplica — artefacto documental.

### Security Architecture

Sin secretos; artefacto público de documentación.

### Testing Architecture

Verificación de cobertura 100% de US; consistencia con las secciones `Traceability`; validación opcional en CI.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (matriz canónica) | Crear la matriz con columnas US·Título·Epic/Feature·FRD·UC·BR·NFR·ADR·Notas. | Documentación |
| AC-02 (100% US) | Incluir todas las US del backlog (~150). | Documentación |
| AC-03 (referencias mínimas) | ≥1 FRD/UC/BR por US funcional; `Transversal` cuando no aplica. | Documentación |
| AC-04 (matriz viva) | Documentar proceso de sincronización (manual o script). | Documentación/DevOps |
| AC-05 (CI opcional) | Validación de cobertura 100% (opcional, no bloqueante). | CI (opcional) |

---

## 7. Backend Technical Design

No aplica — artefacto documental. (Opcional) script que consolida las secciones `Traceability` de las US.

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

No aplica autorización runtime. Sin secretos en la matriz.

---

## 13. Testing Strategy

### Documentation / Coverage Tests
* Verificar que la matriz lista el 100% de las US.
* Verificar ≥1 FRD/UC/BR por US funcional; US transversales marcadas.
* (Opcional) Validación de cobertura 100% en CI.

### Negative Tests
* US ausente de la matriz → incompleta.
* ID de trazabilidad inventado → corregir.

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
| Mapping de backlog dual (PB-P2-025 vs PB-P3-009) | US-148 referenciada en dos ítems | Canónico PB-P2-025 (matriz); PB-P3-009 = validación (separada) | Documentar la decisión | No |
| Relación con la matriz de cobertura existente | `2-User-Stories-Coverage-Matrix.md` cubre Epic→Feature→US | La matriz de trazabilidad la complementa (US↔FRD/UC/BR) | Documentar la distinción | No |
| Activación de la validación en CI | Opcional | No obligatoria | Confirmar si se activa | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Matriz desactualizada vs US | Evidencia inconsistente | Proceso de sincronización documentado; validación opcional en CI |
| IDs de trazabilidad inventados | Trazabilidad falsa | Regla: no inventar; usar `Transversal` cuando no aplica |
| Confusión con la matriz de cobertura | Duplicación aparente | Documentar la distinción (cobertura vs trazabilidad) |
| Volumen alto de US (~150) | Esfuerzo manual | Considerar script que consolide las secciones `Traceability` |

---

## 18. Implementation Guidance for Coding Agents

* **Archivos/carpetas probablemente impactados:** `management/artifacts/User-Stories-Traceability-Matrix.md` (nuevo); opcionalmente un script que consolida las secciones `Traceability` de las US y un paso de CI (opcional).
* **Orden recomendado:** (1) definir columnas de la matriz (US·Título·Epic/Feature·FRD·UC·BR·NFR·ADR·Notas); (2) poblar desde las secciones `Traceability` de todas las US (100%); (3) marcar transversales; (4) documentar el proceso de sincronización; (5) opcional: script + validación de cobertura en CI.
* **Decisiones que no deben reabrirse:** PB-P2-025 canónico; alcance = matriz (la validación es PB-P3-009); no inventar IDs.
* **Qué no implementar:** validación/reporte de gaps (PB-P3-009); índice de ADRs (US-147); nuevos requisitos.
* **Suposiciones a preservar:** cada US tiene su sección `Traceability`; los documentos fuente existen.

---

## 19. Task Generation Notes

* **Grupos de tareas sugeridos:** (DOC) crear la matriz de trazabilidad; (DOC) documentar el proceso de sincronización; (QA) verificar cobertura 100%; (OPS opcional) validación de cobertura en CI.
* **Tareas QA requeridas:** verificar cobertura 100% y consistencia con las secciones `Traceability`.
* **Tareas de seguridad requeridas:** ninguna.
* **Tareas de seed/demo requeridas:** ninguna.
* **Tareas de documentación requeridas:** la matriz y su proceso de sincronización (núcleo de la historia).
* **Dependencias entre tareas:** definir columnas antes de poblar; poblar antes de la validación opcional.
* **Consolidación:** PB-P2-025 puede consolidar sus tareas (US-147 + US-148) en un `tasks.md` propio.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P2-025) |
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

La historia está aprobada, mapeada a PB-P2-025, con alcance claro (matriz canónica de trazabilidad US ↔ FRD/UC/BR/NFR/ADR con cobertura 100%), delimitada frente a US-147 (índice de ADRs) y PB-P3-009 (validación/reporte de gaps). Es un artefacto documental sin impacto de backend/DB/AI. Las alertas de Documentation Alignment (mapping dual resuelto; distinción vs matriz de cobertura; validación CI opcional) son **no bloqueantes**. Documentación y verificación están suficientemente definidas para generar Development Tasks.
