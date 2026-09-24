# User Story Refinement Review — US-008

## Source User Story File
management/user-stories/US-008-login-with-google.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-008-decision-resolution.md

## Review Date
2026-08-13

## Estado de Resolución (Actualizado 2026-08-13)

> **RESUELTO — NO BLOQUEANTE.** El Product Owner promovió US-008 a la fase de delivery actual mediante **ADR-ARCH-005** (override de la diferición PB-P4-001). Se aplicó `PO/BA Decisions Applied` en la US, se reconcilió la metadata y la trazabilidad, y el archivo se actualizó a `Status: Ready for Approval`. El hallazgo de bloqueo de scope de las secciones 3, 4, 7 y 11 queda **cerrado**. Estado recomendado final: **Ready for Approval**.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story ID                              | US-008                                                                                       |
| File Path                                  | management/user-stories/US-008-login-with-google.md                                          |
| Backlog Item                               | PB-P4-001 (Backlog P4 — Future / Out of Scope)                                               |
| Epic                                       | EPIC-AUTH-001 — Authentication & User Access                                                 |
| Estado actual                              | Draft                                                                                        |
| Estado recomendado                         | Blocked                                                                                      |
| Nivel de riesgo                            | Alto                                                                                         |
| Calidad general                            | Alta (redacción sólida; el bloqueo es de scope, no de calidad)                              |
| Requiere decisión PO                       | Sí                                                                                           |
| Requiere decisión técnica                  | No                                                                                           |
| Requiere decisión QA                       | No                                                                                           |
| Requiere decisión Seguridad                | No                                                                                           |
| Decision Resolution artifact found         | No                                                                                           |
| User Story file updated                    | No                                                                                           |
| Refinement review artifact created/updated | Yes                                                                                          |
| Refinement review path                     | management/user-stories/refinement-reviews/US-008-refinement-review.md                       |

---

## 2. Diagnóstico PO/BA

La User Story está bien escrita: el rol, el objetivo y el valor son claros, los Acceptance Criteria están en formato GWT, cubren happy path, edge cases y casos negativos, y la trazabilidad interna (FR-AUTH-010 Could, UC-AUTH-008, BR-AUTH-010, NFR-SEC-003, ADR-SEC-001) es coherente. La calidad de redacción no es el problema.

El problema es de **alcance MVP**. Existe una **decisión de Product Owner ya formalizada** que difiere US-008 fuera del MVP:

- `management/artifacts/4-Product-Backlog-Prioritized.md` §4.1 (Decisiones PO aplicadas): "US-008 — Login con Google — Diferir a **P4 / Future / v1.1** — Movida a Backlog P4 — no entra al MVP."
- `management/artifacts/4-Product-Backlog-Prioritized.md` §11, item **PB-P4-001**: "US-008 / EPIC-AUTH-001 — OAuth Google login — No bloquea MVP académico ni el flujo E2E; el flujo email/password + captcha es suficiente. **Decisión PO.** — Recommended target: v1.1."
- `management/artifacts/3-Product-Backlog-Prioritization-Input.md`: "US-008 — Diferir a Future / v1.1 — Excluir del MVP inicial" y "Auth básico: US-001 a US-007, excluyendo US-008."
- `docs/22-Architecture-Decision-Records.md`: OAuth listado como funcionalidad **fuera del MVP** (Sección 9); **ADR-SEC-007** mantiene "MFA y SSO/OAuth" para "cuando se requiera login federado" (futuro).

En consecuencia, procesar US-008 hacia Approval → Technical Specification → Development Tasks **contradice la decisión PO vigente**. La guardrail de MVP del skill de refinamiento indica explícitamente marcar como `Blocked` cualquier "Google OAuth if marked Future", salvo que sea promovido formalmente mediante decisión PO + ADR de override. No existe tal ADR de promoción.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                              | Impacto                                                                                          | Recomendación                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | US-008 está formalmente diferida a P4/Future/v1.1 por decisión PO (Product Backlog Prioritized §4.1 y PB-P4-001). No entra al MVP.                                    | Continuar el delivery generaría alcance fuera del MVP y contradiría una decisión PO formalizada. | Bloquear. Requiere decisión PO explícita + ADR de override para promover al MVP, o confirmar la diferición y detener el workflow.                          |
| Alta      | La guardrail de MVP del skill exige marcar `Blocked` para "Google OAuth if marked Future" sin promoción formal (PO + ADR).                                            | Riesgo de scope creep en Auth (US-001…US-007 es el alcance de Auth del MVP, excluyendo US-008).  | No aprobar US-008 hasta que exista promoción formal.                                                                                                       |
| Media     | El propio archivo de la US mantiene `Status: Draft`, `Priority: Could Have` y el DoR "PO confirma incluir en MVP o diferir" sin marcar, sin reflejar la diferición.  | La US no está reconciliada con la decisión de backlog ya tomada; genera ambigüedad.             | Tras la decisión PO, reconciliar metadata (Status/Priority/Backlog Item) con el resultado (diferir o promover). No modificar el archivo mientras bloquea. |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                   |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------ |
| No introduce pagos reales            | Pass      | No aplica.                                                                                                    |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                                    |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                                    |
| Respeta human-in-the-loop IA         | N/A       | La historia no invoca IA.                                                                                     |
| Respeta backend como source of truth | Pass      | El backend valida id_token y emite cookie; el frontend no recibe el id_token.                                |
| Respeta seed/demo si aplica          | N/A       | No requiere cambios de seed/demo.                                                                             |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                                    |
| No introduce multi-tenant enterprise | Pass      | No aplica.                                                                                                    |
| No introduce P4/Future scope         | **Fail**  | US-008 = OAuth Google está formalmente en **Backlog P4 / Future (PB-P4-001)**; procesarla introduce P4/Future al delivery. |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                    | Problema detectado                                                                 | Acción recomendada                                                                 |
| ----- | -------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| AC-01 | Clear                      | Ninguno de forma — depende del bloqueo de scope.                                  | Mantener. Sujeto a la decisión PO de promover/diferir.                            |
| AC-02 | Clear                      | Ninguno de forma — depende del bloqueo de scope.                                  | Mantener. Sujeto a la decisión PO.                                                |
| AC-03 | Needs Detail (no bloqueante) | La vinculación de `google_sub` a cuenta email/password existente requiere definir el paso de confirmación (¿re-autenticación con password?). | Detallar tras promoción, si aplica. No es el bloqueo principal.                   |

Los AC son testeables y coherentes. La revisión de AC no es la causa del bloqueo; el bloqueo es de alcance MVP.

---

## 6. Gaps Detectados

### Producto / Negocio
Decisión de scope pendiente de formalizar como override: la US está diferida (PB-P4-001) pero se está intentando ejecutar dentro del delivery del MVP.

### Backend / API
No aplica como bloqueo. (De promoverse: endpoints `GET /api/v1/auth/google` y `/callback`, verificación de id_token con JWK, state+nonce.)

### Frontend / UX
No aplica como bloqueo.

### Base de Datos
No aplica como bloqueo. (De promoverse: migración `users.google_sub` nullable UNIQUE + índice.)

### Seguridad / Autorización
No aplica — la historia no introduce un gap de seguridad; su modelo (validar id_token, aud/iss/exp/email_verified, state+nonce, cookie HTTP-only) es correcto. El bloqueo no es de seguridad.

### IA / PromptOps
No aplica — esta historia no invoca IA directamente.

### QA / Testing
No aplica como bloqueo.

### Seed / Demo
No requiere cambios de seed/demo.

### Documentación / Trazabilidad
Desalineación entre `docs/3-MVP-Scope-Definition.md` (lista OAuth Google como "Could / opcional") y la priorización final (`4-Product-Backlog-Prioritized.md` + PB-P4-001, que difiere a Future). Ver sección 8.

---

## 7. Preguntas Pendientes

| Tipo | Pregunta                                                                                                                                                                                                                     | Bloquea aprobación | Responsable    |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------- |
| PO   | US-008 está formalmente diferida a P4/Future/v1.1 (PB-P4-001, Product Backlog Prioritized §4.1). ¿Se **promueve** US-008 al MVP mediante decisión PO explícita + ADR de override de PB-P4-001, o se **mantiene diferida**?   | Sí                 | Product Owner  |
| PO   | Si se promueve: ¿se crea el ADR de override correspondiente (que también reconcilie ADR-SEC-007, hoy futuro) y se reubica US-008 desde el Backlog P4 a un item priorizado del MVP?                                          | Sí                 | Product Owner  |

Esta decisión **no puede resolverse desde la documentación aprobada**, porque la documentación aprobada ya resuelve el tema en sentido contrario (diferir). Promover requiere una **nueva** decisión PO + ADR, no derivable por el `eventflow-po-ba-decision-resolver`.

---

## 8. Documentation Alignment Required

| Documento / Fuente                                    | Conflicto detectado                                                                                        | Decisión vigente                                                        | Acción recomendada                                                                                              | ¿Bloquea aprobación? |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------- |
| docs/3-MVP-Scope-Definition.md (líneas ~148, ~295)    | Lista "OAuth opcional con Google (recomendado, no obligatorio)" y "OAuth Google — Could".                  | Product Backlog Prioritized + PB-P4-001: diferir a P4/Future/v1.1.       | Alinear el MVP Scope Definition con la priorización final (marcar OAuth Google como Future/PB-P4-001).          | No (informativo)     |
| management/user-stories/US-008-login-with-google.md   | Metadata `Priority: Could Have`, `Status: Draft`, DoR "PO confirma incluir en MVP o diferir" sin resolver. | Diferida a P4/Future (PB-P4-001).                                        | Reconciliar tras la decisión PO (no modificar mientras el bloqueo esté abierto).                               | No (informativo)     |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | management/user-stories/US-008-login-with-google.md                                   |
| User Story ID verified                     | Yes                                                                                   |
| Decision Resolution artifact found         | No                                                                                    |
| Decision Resolution path                   | management/user-stories/decision-resolutions/US-008-decision-resolution.md            |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | management/user-stories/refinement-reviews/US-008-refinement-review.md                |
| Final recommended status                   | Blocked                                                                               |
| Next recommended skill                     | eventflow-po-ba-decision-resolver (si el PO promueve) — de lo contrario, detener      |
| Reason                                     | US-008 (Google OAuth) está formalmente diferida a P4/Future/v1.1 por decisión PO (PB-P4-001). La guardrail de MVP exige `Blocked` sin promoción formal (PO + ADR). |

---

## 10. Cambios Aplicados o Recomendados

No se aplicaron cambios al archivo de la User Story (bloqueo de scope abierto). Cambios recomendados **solo si el PO promueve formalmente US-008 al MVP**:

### Metadata
Actualizar `Backlog Item` a un item priorizado del MVP (reubicar desde PB-P4-001), ajustar `Priority`/`Sprint / Milestone` y `Last Updated`.

### PO/BA Decisions Applied
Agregar una sección `PO/BA Decisions Applied` que registre la decisión de promoción y el ADR de override de PB-P4-001 / ADR-SEC-007.

### Traceability
Referenciar el nuevo ADR de override y el nuevo Backlog Item.

### Scope Guardrails
Actualizar "Scope Classification" (de "Requires PO Decision" a "In MVP" tras la promoción).

### Acceptance Criteria
Detallar el paso de confirmación de vinculación en AC-03.

### Definition of Ready / Definition of Done
Marcar "PO confirma incluir en MVP o diferir" con el resultado de la decisión.

Si el PO **mantiene la diferición**: no modificar el archivo salvo, opcionalmente, alinear metadata/DoR para reflejar explícitamente el estado "Future / PB-P4-001", y detener el delivery de US-008.

---

## 11. Recomendación Final

**Blocked.**

US-008 (Login con Google / OAuth) está formalmente diferida a **P4 / Future / v1.1** por decisión de Product Owner (`4-Product-Backlog-Prioritized.md` §4.1 y **PB-P4-001**), y ADR-SEC-007 mantiene SSO/OAuth como capacidad futura. La guardrail de MVP del skill de refinamiento exige marcar como `Blocked` cualquier Google OAuth marcado como Future que no haya sido **promovido formalmente** mediante decisión PO explícita + ADR de override. No existe dicho ADR de promoción.

El workflow no puede continuar hacia Approval, Technical Specification ni Development Tasks sin una decisión PO explícita que promueva la historia al MVP (con su ADR de override), o bien la confirmación de mantenerla diferida y detener el delivery.

---

User Story file updated: No
Path: management/user-stories/US-008-login-with-google.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-008-refinement-review.md
Status: Blocked
Next step: Decisión explícita de Product Owner (promover con ADR de override, o confirmar diferición). No apto para `eventflow-po-ba-decision-resolver` porque la documentación aprobada ya resuelve el tema como "diferir".
