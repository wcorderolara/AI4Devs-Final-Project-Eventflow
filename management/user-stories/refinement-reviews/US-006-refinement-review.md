# User Story Refinement Review — `US-006`

## Source User Story File
management/user-stories/US-006-view-edit-own-profile.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-006-decision-resolution.md (no generado — no quedan decisiones PO bloqueantes)

## Review Date
2026-06-25

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story ID                              | US-006                                                                                      |
| File Path                                  | management/user-stories/US-006-view-edit-own-profile.md                                     |
| Backlog Item                               | PB-P1-005 — Perfil propio + cambio de idioma                                                |
| Epic                                       | EPIC-AUTH-001 — Authentication & User Access                                                |
| Estado actual                              | Draft → actualizado a `Ready for Approval`                                                  |
| Estado recomendado                         | Ready for Approval                                                                          |
| Nivel de riesgo                            | Bajo                                                                                        |
| Calidad general                            | Alta                                                                                        |
| Requiere decisión PO                       | No (decisiones ya formalizadas en PB-P1-005)                                                |
| Requiere decisión técnica                  | No bloqueante (selección de librería de validación de teléfono se difiere al Technical Spec) |
| Requiere decisión QA                       | No                                                                                          |
| Requiere decisión Seguridad                | No (Doc 19 §11.2 y ADR-SEC-001/003 cubren la postura)                                         |
| Decision Resolution artifact found         | No                                                                                          |
| User Story file updated                    | Yes                                                                                         |
| Refinement review artifact created/updated | Yes                                                                                         |
| Refinement review path                     | management/user-stories/refinement-reviews/US-006-refinement-review.md                      |

---

## 2. Diagnóstico PO/BA

US-006 cubre la gestión del perfil propio del usuario autenticado (lectura, edición de campos básicos, cambio de idioma y cambio de contraseña). Es una historia clara, de tamaño contenido y con valor directo para los tres roles del MVP. Su Backlog Item (PB-P1-005) ya formaliza las decisiones clave: email no editable, invalidación de otras sesiones al cambiar password, selector de idioma con nombres nativos, aplicación inmediata. La US original no listaba el Backlog Item en metadata, no incluía la sección `PO/BA Decisions Applied`, y arrastraba decisiones ya resueltas como preguntas abiertas en `Notes`. El refinamiento incorpora todas las decisiones, alinea los endpoints con la convención del proyecto (`/api/v1/users/me*`), separa la edición de idioma en su endpoint dedicado, formaliza los códigos de error, integra la política de contraseñas (Doc 19 §11.2) y mantiene el alcance estrictamente MVP.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                | Impacto                                                                                              | Recomendación                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Alta      | El archivo original no incluía `Backlog Item` ni la sección `PO/BA Decisions Applied`, dejando decisiones PB-P1-005 sin huella en la historia.            | Riesgo de re-litigio en Approval Gate y en Technical Spec.                                            | Aplicado: se añadió `Backlog Item: PB-P1-005` y la sección `PO/BA Decisions Applied` con las 8 decisiones formalizadas.                     |
| Alta      | Endpoint de cambio de contraseña como `POST /api/v1/users/me/password` no coincide con Doc 16 §23 / Doc 19 §12 / US-094 (`/me/change-password`, 204).     | Contrato inconsistente entre US y especificación; tasks no implementables sin alinear.                | Aplicado: se cambió a `POST /api/v1/users/me/change-password` con `204 No Content` y se documentó alineación con US-094 y Doc 16 §23.       |
| Alta      | Faltaba el endpoint dedicado `PATCH /api/v1/users/me/preferred-language` definido por Doc 16 §23.2 y US-094.                                              | El AC-03 (cambio inmediato de idioma) era ambiguo respecto al endpoint canónico.                     | Aplicado: añadido como endpoint adicional (la edición vía PATCH genérico también está soportada).                                            |
| Alta      | EC-02 indicaba `400 INVALID_CURRENT_PASSWORD`. Doc 16 §23.2 declara `401, 422` para este endpoint; Doc 19 §9.5 usa 401 para credenciales incorrectas.    | Frontend manejaría un código diferente al real.                                                       | Aplicado: EC-02 pasa a `401 INVALID_CURRENT_PASSWORD`, manteniendo `422` para política y `422 CURRENT_PASSWORD_REQUIRED` por VR-05.          |
| Media     | "Confirmar política de cerrar otras sesiones al cambiar password" estaba en `Notes` como pregunta abierta, pero PB-P1-005 ya la responde explícitamente. | Se interpretaba como blocker PO inexistente.                                                          | Aplicado: la decisión pasó a `PO/BA Decisions Applied` (#2). Nota técnica restante sólo sobre el mecanismo de invalidación (Doc 19 §9.6).    |
| Media     | Traceability listaba `BR-USER-001..006`, demasiado amplio (BR-USER-003/004 no aplican).                                                                 | Trazabilidad poco precisa para QA y para el Technical Spec.                                          | Aplicado: limitado a BR-USER-001, BR-USER-005, BR-USER-006, BR-I18N-001/003 y BR-PRIVACY-002/008.                                            |
| Media     | UC referenciado era únicamente `UC-AUTH-006` (Cambiar idioma), pero el alcance principal corresponde a `UC-AUTH-005` (Ver/Editar perfil).                | Lectura confusa para QA y para traceability.                                                          | Aplicado: ahora referencia `UC-AUTH-005` (principal), `UC-AUTH-006` y `UC-I18N-001`.                                                          |
| Media     | VR-04 mencionaba "política" sin especificarla; Doc 19 §11.2 la define (≥10, alfanumérica, no localpart).                                                 | Riesgo de validaciones divergentes entre frontend/backend.                                            | Aplicado: VR-04 incorpora la política completa y EC-04 cubre el caso de violación.                                                          |
| Media     | VR-05 mezclaba "requerida" y "incorrecta" en un solo mensaje.                                                                                            | QA podía esperar un código uniforme cuando son escenarios distintos.                                  | Aplicado: VR-05 distingue `422 CURRENT_PASSWORD_REQUIRED` y `401 INVALID_CURRENT_PASSWORD`.                                                  |
| Baja      | UX no recogía el requisito del selector con nombres nativos definido en PB-P1-005 acceptance summary y PO US-007.                                        | Implementación podía usar códigos `es-LATAM` en lugar de `Español LATAM`.                              | Aplicado: la sección UX y AC-03 explicitan los nombres nativos y la aplicación inmediata.                                                    |
| Baja      | Faltaban tests de invalidación de otras sesiones y rate limit.                                                                                          | Cobertura QA incompleta.                                                                              | Aplicado: agregados TS-07, AUTH-TS-05 y NT-09 (rate limit `429`).                                                                            |
| Baja      | Notes incluía la pregunta de librería de teléfono sin clasificación.                                                                                    | Confusión sobre si es decisión PO o técnica.                                                          | Reclasificada como decisión técnica para Technical Spec (no bloquea Approval).                                                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                          |
| ------------------------------------ | --------- | --------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No toca pagos.                                                                                      |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                          |
| No introduce WhatsApp/chat/push      | Pass      | UX limitada a la pantalla `/profile` y toasts.                                                      |
| Respeta human-in-the-loop IA         | N/A       | No invoca IA.                                                                                       |
| Respeta backend como source of truth | Pass      | Toda autorización y validación se ejecutan en backend; frontend sólo presenta.                      |
| Respeta seed/demo si aplica          | Pass      | No requiere cambios de seed (los usuarios demo ya existen).                                          |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                          |
| No introduce multi-tenant enterprise | Pass      | Ownership policy estándar.                                                                          |
| No introduce P4/Future scope         | Pass      | Se excluyen MFA, eliminación de cuenta auto-servicio, cambio de email, listado de sesiones, avatar. |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                          | Acción recomendada                                                                     |
| ----- | ------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| AC-01 | Clear        | Original no especificaba el contrato exacto del payload.    | Aplicado: AC-01 lista los campos devueltos y aclara que `email`/`role` son sólo lectura. |
| AC-02 | Clear        | Faltaba referencia al evento `user.profile.updated`.        | Aplicado: añadido evento y `correlationId`.                                              |
| AC-03 | Clear        | No existía AC dedicado al cambio inmediato de idioma.       | Aplicado: nuevo AC-03 con endpoint dedicado y aplicación inmediata (FR-I18N-002).        |
| AC-04 | Clear        | Original no formalizaba `204`, `argon2.verify`, ni evento.  | Aplicado: AC-04 (era AC-03) cubre 204, ADR-SEC-003, invalidación y logging.              |

Cobertura de happy path AC-01..AC-04 y de edge cases EC-01..EC-05.

---

## 6. Gaps Detectados

### Producto / Negocio
* Aplicado: añadidos selector de idioma con nombres nativos, aplicación inmediata, y exclusión explícita de cambio de moneda (BR-I18N-008).

### Backend / API
* Aplicado: contratos completos por endpoint, separación clara entre PATCH genérico y endpoint dedicado de idioma, política de password integrada.

### Frontend / UX
* Aplicado: tabs/acordeón Datos básicos / Seguridad; locale switcher con aplicación inmediata; mensajes localizados.

### Base de Datos
* Sin migraciones nuevas. Notado el check constraint de `preferred_language`.

### Seguridad / Autorización
* Aplicado: 8 reglas SEC-01..SEC-08 cubriendo sesión, ownership, hashing, whitelist, invalidación, rate limit y respuesta segura del `GET`.

### IA / PromptOps
* No aplica — esta historia no invoca IA directamente. Nota añadida que aclara que `preferred_language` del usuario no afecta el idioma del `LLMProvider`.

### QA / Testing
* Aplicado: ampliado TS-01..TS-08, NT-01..NT-10, AUTH-TS-01..AUTH-TS-05, accesibilidad.

### Seed / Demo
* No requiere cambios de seed/demo.

### Documentación / Trazabilidad
* Aplicado: traceability refinada; documentadas alineaciones pendientes (Doc 16 §23 path `/me` vs `/users/me`).

---

## 7. Preguntas Pendientes

No pending blocking questions.

Notas técnicas no bloqueantes (a resolver en Technical Spec):
* Librería de validación de teléfono (E.164 vs `libphonenumber-js`) — Tech Lead.
* Estrategia técnica final de invalidación de otras sesiones (rotación de cookie vs revocación de `sid`) — Tech Lead, alineada con Doc 19 §9.6 y US-005.

---

## 8. Documentation Alignment Required

| Documento / Fuente                  | Conflicto detectado                                                                  | Decisión vigente                                            | Acción recomendada                                                                    | ¿Bloquea aprobación? |
| ----------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------- |
| Doc 16 §23.2; Doc 19 §9.5/§12       | Endpoints declarados como `/me`, `/me/preferred-language`, `/me/change-password`.    | El proyecto adopta `/api/v1/users/me*` (Epic Map, US-094).  | Unificar Doc 16 o emitir ADR de endpoint canónico antes del snapshot OpenAPI.         | No                   |
| FRD line 329 (FR-USER-002 → UC-AUTH-006) | UC-AUTH-006 está definido en Doc 8 como "Cambiar idioma preferido", no edición general. | UC-AUTH-005 es el caso de uso principal de esta historia.   | Considerar corrección de mapeo en FRD; no bloquea esta US.                            | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                         |
| User Story file path                       | `management/user-stories/US-006-view-edit-own-profile.md`                                   |
| User Story ID verified                     | Yes (US-006)                                                                                |
| Decision Resolution artifact found         | No                                                                                          |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-006-decision-resolution.md` (no requerido) |
| Refinement review artifact created/updated | Yes                                                                                         |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-006-refinement-review.md`                    |
| Final recommended status                   | Ready for Approval                                                                          |
| Next recommended skill                     | eventflow-user-story-approval                                                               |
| Reason                                     | Todas las decisiones PO ya estaban resueltas en PB-P1-005; el refinamiento sólo alineó endpoints, errores, traceability y agregó la sección `PO/BA Decisions Applied`. |

---

## 10. Cambios Aplicados o Recomendados

### Metadata
* Añadido `Backlog Item: PB-P1-005`.
* Añadidos `Approved By`, `Approval Date`, `Ready for Development Tasks` (pendientes).
* `Status` actualizado a `Ready for Approval`.
* `Last Updated` actualizado a 2026-06-25.

### Business Context
* `Context Summary` reformulado con referencias explícitas a PB-P1-005, Doc 19 §11.2 y BR aplicables.
* `Assumptions` actualizado para incluir mantenimiento de sesión actual en cambio de password.
* `Dependencies` ampliadas (US-094, PB-P0-004/006).

### PO/BA Decisions Applied
* Nueva sección con 8 decisiones formalizadas (email no editable, invalidación de otras sesiones, selector con nombres nativos, endpoint canónico, idioma dedicado, política de password, rol no editable, datos derivados).

### Traceability
* FRD: añadido FR-I18N-002.
* UC: incluidos UC-AUTH-005 (principal), UC-AUTH-006, UC-I18N-001.
* BR: precisado a BR-USER-001/005/006, BR-I18N-001/003, BR-PRIVACY-002/008.
* NFR/ADR: añadidos ADR-SEC-003 y NFR observabilidad.
* Documentation Alignment Required documentado.

### Scope Guardrails
* `Out of Scope` ampliado con MFA, re-login forzado y cambio de moneda.

### Acceptance Criteria
* AC-01 (Ver perfil), AC-02 (Editar datos), AC-03 nuevo (Idioma inmediato), AC-04 (Cambiar contraseña con 204, invalidación, evento).

### Technical Notes
* Endpoints corregidos a `/api/v1/users/me*`.
* Añadido endpoint dedicado de idioma.
* Reutilización de PB-P0-006/PB-P0-007 explicitada.

### QA Notes
* Ampliados TS, NT y AUTH-TS con casos para invalidación, rate limit, política de password.

### Definition of Ready
* Sin cambios estructurales; ahora cubierto excepto Approval Gate.

### Definition of Done
* Reescrito con verificaciones específicas por endpoint y por escenario clave.

### Notes
* Resuelta la pregunta de invalidación de otras sesiones (movida a PO/BA Decisions).
* Reclasificada la decisión de librería de teléfono como técnica (no bloqueante).
* Añadida nota sobre Documentation Alignment Required.

---

## 11. Recomendación Final

`Ready for Approval`.

El refinamiento incorporó todas las decisiones PO ya formalizadas en PB-P1-005 y documentación de referencia, alineó contratos API con la convención adoptada por US-094 y Doc 16 §23 (`/api/v1/users/me*`), introdujo la política de contraseñas de Doc 19 §11.2 en las VR/EC, y dejó cubiertos los escenarios de invalidación de sesiones, rate limit y cambio inmediato de idioma. No quedan preguntas PO bloqueantes. Las dos notas técnicas restantes (librería de teléfono y mecanismo de invalidación de sesiones) son decisiones de Technical Spec y no bloquean el Approval Gate.
