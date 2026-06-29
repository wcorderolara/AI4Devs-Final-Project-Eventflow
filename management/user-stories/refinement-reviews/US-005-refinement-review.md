# User Story Refinement Review — US-005

## Source User Story File

management/user-stories/US-005-logout-session.md

## Decision Resolution Artifact

management/user-stories/decision-resolutions/US-005-decision-resolution.md

## Review Date

2026-06-25

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| User Story ID                              | US-005                                                                  |
| File Path                                  | management/user-stories/US-005-logout-session.md                        |
| Backlog Item                               | PB-P1-003 — Login con email/password + logout                            |
| Epic                                       | EPIC-AUTH-001 — Authentication & User Access                             |
| Estado actual                              | Draft                                                                   |
| Estado recomendado                         | Needs Refinement                                                        |
| Nivel de riesgo                            | Medio                                                                   |
| Calidad general                            | Media                                                                   |
| Requiere decisión PO                       | Sí                                                                      |
| Requiere decisión técnica                  | No                                                                      |
| Requiere decisión QA                       | No                                                                      |
| Requiere decisión Seguridad                | No                                                                      |
| Decision Resolution artifact found         | No                                                                      |
| User Story file updated                    | No                                                                      |
| Refinement review artifact created/updated | Yes                                                                     |
| Refinement review path                     | management/user-stories/refinement-reviews/US-005-refinement-review.md   |

---

## 2. Diagnóstico PO/BA

US-005 cubre un flujo Must Have del MVP (cierre de sesión por cookie firmada) alineado con PB-P1-003. El alcance respeta MVP (sin SSO, sin logout federado, sin gestión avanzada de sesiones). Problemas detectados:

1. Trazabilidad incorrecta a documentos no relacionados con logout.
2. Decisiones PO no formalizadas sobre comportamiento de logout (idempotente vs estricto), código de respuesta (`200` vs `204`), estrategia de invalidación de sesión (rotación de cookie vs `sessions` revocadas) y necesidad/no de modal de confirmación.
3. Conflicto entre el AC-01/EC-01 propuesto (`200` idempotente) y Doc 16 + Doc 19 que documentan `204` y `401` cuando no hay sesión.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                       | Impacto                                                                                                                | Recomendación                                                                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad incorrecta: `FR-AUTH-009` (acceso admin) y `UC-AUTH-005` (perfil) no aplican a logout. `BR-AUTH-009` (aislamiento) tampoco aplica. | Trazabilidad inválida con FRD/UC/BR.                                                                                   | Reemplazar por `FR-AUTH-005` (logout), `UC-AUTH-003` (cerrar sesión), `BR-AUTH-003` (sesión persistente) y `BR-PRIVACY-009`.                                                                          |
| Alta      | Comportamiento del endpoint: la US propone `200` idempotente incluso sin sesión, pero Doc 16 §22.3 y SEC-POL-AUTH-009 documentan `auth required` + `204` éxito y `401` sin sesión. | Contrato API divergente y posible scope creep encubierto.                                                              | Decisión PO US-005 #1: ¿logout idempotente (`204` aun sin sesión) o estricto (`401` sin sesión, alineado con Doc 16 §22.3 y SEC-POL-AUTH-009)?                                                       |
| Alta      | Código de respuesta: la US dice `200`; Doc 16 §22.3 dice `204 No Content`.                                                                     | Inconsistencia con error envelope y catálogo de respuestas estándar.                                                   | Decisión PO US-005 #2: `204 No Content` por simetría con el resto del catálogo y NFR-API-005, salvo que PO solicite otro código.                                                                     |
| Alta      | Estrategia de invalidación de sesión no especificada. Doc 19 §9.6 ofrece dos alternativas: rotación con `Max-Age=0` (simple) o tabla `sessions` con `sid` revocado (más robusto multi-instancia). | Sin decisión, no se pueden cerrar AC ni Technical Spec.                                                                | Decisión PO US-005 #3: rotación de cookie con `Max-Age=0` (recomendado MVP) salvo que PO solicite tabla `sessions`.                                                                                  |
| Media     | Confirmación previa (modal) mencionada como "opcional para admin" en Notes. No decidida.                                                       | UX inconsistente entre roles.                                                                                          | Decisión PO US-005 #4: ¿se exige modal de confirmación (todos / sólo admin / ninguno)?                                                                                                                |
| Media     | Dependencia `EPIC-SEC-001` no existe como Epic formal.                                                                                         | Trazabilidad imprecisa.                                                                                                | Reemplazar por `PB-P0-006` (cookies firmadas) y `PB-P0-004` (REST API foundation).                                                                                                                    |
| Media     | EC-02 (múltiples pestañas) se apoya en que el frontend "maneja `401` globalmente" pero esto solo aplica si el endpoint puede devolver `401`. Si se elige idempotencia, la propagación ocurrirá en la primera request protegida posterior. | Ambiguo sin la decisión PO #1.                                                                                         | Reescribir EC-02 una vez decidido #1: si idempotente, propagación al próximo request protegido; si estricto, propagación al recibir `401` global.                                                   |
| Media     | VR-01 dice "200 OK incluso sin body". Doc 16 documenta `204 No Content` y `application/problem+json` solo para errores.                       | Validación inconsistente.                                                                                              | Alinear con `204 No Content`.                                                                                                                                                                       |
| Baja      | `NT-01` propone `405 Method Not Allowed` en GET; Doc 16 lo trata vía el router. No requiere AC adicional, pero documentar.                    | Riesgo bajo.                                                                                                           | Mantener `NT-01` y verificar que el `methodNotAllowedHandler` del router lo maneje (PB-P0-004).                                                                                                       |
| Baja      | Logging de evento `auth.logout` sin distinguir resultado (success/no-session).                                                                | Observabilidad limitada.                                                                                               | Diferenciar `auth.logout.success` y `auth.logout.noop` (si #1 = idempotente).                                                                                                                        |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                          |
| ------------------------------------ | --------- | ------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      |                                                                     |
| No introduce contratos firmados      | Pass      |                                                                     |
| No introduce WhatsApp/chat/push      | Pass      |                                                                     |
| Respeta human-in-the-loop IA         | N/A       | No invoca IA.                                                       |
| Respeta backend como source of truth | Pass      | Sesión y revocación viven en backend.                               |
| Respeta seed/demo si aplica          | Pass      | Reutiliza seeds para 3 roles.                                       |
| No introduce RAG/vector DB           | Pass      |                                                                     |
| No introduce multi-tenant enterprise | Pass      |                                                                     |
| No introduce P4/Future scope         | Pass      | Logout selectivo y lista de sesiones declarados Out of Scope.       |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                | Problema detectado                                                                                                          | Acción recomendada                                                                                                                                                                                                                                                                                                                            |
| ----- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail           | "Set-Cookie con expiración pasada" + "responde 200" ambigüo. No define atributos completos ni `204` canónico.               | Reescribir post decisión #2: backend invalida la sesión, emite `Set-Cookie: session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax` y responde `204 No Content`. Frontend redirige a `/[locale]/auth/login`.                                                                                                                                |
| AC-02 | Clear                  | OK conceptualmente.                                                                                                          | Mantener y agregar invalidación explícita de `useUserMe` y cualquier query autenticada en TanStack Query, además del store local.                                                                                                                                                                                                              |
| EC-01 | Out of Scope as written | Depende de decisión PO #1 (idempotente vs estricto).                                                                         | Si idempotente: `204` aun sin sesión válida. Si estricto: `401 AUTHENTICATION_REQUIRED` con redirección frontend a login.                                                                                                                                                                                                                       |
| EC-02 | Needs Detail           | Propagación depende de #1.                                                                                                   | Reescribir según #1.                                                                                                                                                                                                                                                                                                                          |

---

## 6. Gaps Detectados

### Producto / Negocio

- Falta `PO/BA Decisions Applied` con: (i) comportamiento idempotente vs estricto, (ii) status code, (iii) estrategia de invalidación, (iv) modal de confirmación.

### Backend / API

- DTO de respuesta no aplica (`204`). Falta declarar contrato `Set-Cookie` exacto y middleware `requireSession` o `optionalSession` según #1.
- Falta mencionar `correlationId` y el handler de errores.
- No se cita `SessionCookieIssuer.invalidate(...)` (heredado de PB-P0-006).

### Frontend / UX

- Falta declarar invalidación de TanStack Query (todas las queries autenticadas) y reset del cliente.
- Falta declarar comportamiento ante `204` (redirección sin parsing).
- Falta mencionar locales i18n para el botón y textos.

### Base de Datos

- Si la decisión PO #3 elige tabla `sessions`, se introduce nueva entidad. Si elige rotación, no aplica.

### Seguridad / Autorización

- Falta listar atributos canónicos del `Set-Cookie` de invalidación y la rotación de `SESSION_SECRET` como opción a futuro.
- Falta documentar la mitigación frente a Replay (THR-015 de Doc 19).

### IA / PromptOps

- No aplica.

### QA / Testing

- Faltan tests de reutilización post-logout (token no debe volver a funcionar).
- Faltan tests de propagación multi-pestaña (E2E con dos contextos del navegador).

### Seed / Demo

- Reutiliza seeds existentes; sin cambios.

### Documentación / Trazabilidad

- Corregir `FR-AUTH-009` → `FR-AUTH-005`.
- Corregir `UC-AUTH-005` → `UC-AUTH-003`.
- Corregir `BR-AUTH-009` → `BR-AUTH-003`, `BR-PRIVACY-009`.
- Reemplazar dependencia `EPIC-SEC-001` por `PB-P0-006` y `PB-P0-004`.

---

## 7. Preguntas Pendientes

| Tipo | Pregunta                                                                                                                                                                                  | Bloquea aprobación | Responsable    |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------- |
| PO   | ¿`/auth/logout` es idempotente (`204` aun sin sesión) o estricto (`401` sin sesión, alineado con Doc 16 §22.3 y SEC-POL-AUTH-009)?                                                          | Sí                 | Product Owner  |
| PO   | ¿Código de éxito `204 No Content` (alineado a Doc 16 §22.3) o `200 OK`?                                                                                                                    | Sí                 | Product Owner  |
| PO   | Estrategia de invalidación de sesión: ¿rotación de cookie con `Max-Age=0` (simple, MVP-friendly, Doc 19 §9.6 alternativa) o tabla `sessions` con `sid` revocado (más robusto multi-instancia)? | Sí                 | Product Owner  |
| PO   | ¿Se exige modal de confirmación antes de cerrar sesión (todos los roles / sólo admin / ninguno)?                                                                                            | Sí                 | Product Owner  |

---

## 8. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado                                                                          | Decisión vigente                                                  | Acción recomendada                                                                | ¿Bloquea aprobación? |
| ------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------- |
| Doc 16 §22.3       | Doc 16 documenta `204 No Content` y `auth required`. La US propone `200` idempotente.        | Pendiente de Decisiones PO US-005 #1 y #2.                       | Resolver decisiones PO; alinear el documento sólo después de la resolución.       | Sí (vía decisiones)  |
| Doc 19 §9.6        | Doc 19 deja la estrategia abierta entre rotación con `Max-Age=0` y `sessions` revocadas.     | Pendiente de Decisión PO US-005 #3.                              | Resolver decisión PO #3 antes de la Technical Spec.                              | Sí (vía decisión)    |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                     |
| User Story file path                       | `management/user-stories/US-005-logout-session.md`                                      |
| User Story ID verified                     | Yes                                                                                    |
| Decision Resolution artifact found         | No                                                                                     |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-005-decision-resolution.md`            |
| Refinement review artifact created/updated | Yes                                                                                    |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-005-refinement-review.md`                |
| Final recommended status                   | Needs Refinement                                                                       |
| Next recommended skill                     | eventflow-po-ba-decision-resolver                                                      |
| Reason                                     | 4 decisiones PO bloqueantes deben formalizarse antes de aprobar y generar Technical Spec. |

---

## 10. Cambios Aplicados o Recomendados

La User Story file no fue actualizada. Cambios a aplicar tras resolución:

### Metadata

- `Status` → `Ready for Approval` (post-resolución).
- `Last Updated` → fecha de la actualización.
- Agregar `Backlog Item: PB-P1-003`.

### Business Context

- Reescribir `Context Summary` para citar estrategia de invalidación elegida e idempotencia.
- Reemplazar `EPIC-SEC-001` por `PB-P0-006` y `PB-P0-004` en Dependencies.
- Agregar dependencia `US-003` (login) explícita.

### PO/BA Decisions Applied

- Crear sección con las 4 decisiones formales.

### Traceability

- `FRD Requirement(s)`: `FR-AUTH-004, FR-AUTH-005`.
- `Use Case(s)`: `UC-AUTH-003`.
- `Business Rule(s)`: `BR-AUTH-003, BR-PRIVACY-009`.
- `Related ADR(s)`: `ADR-SEC-001`.
- `Related Document(s)`: `/docs/19 §9.6, §10`, `/docs/16 §22.3`, `/docs/8 UC-AUTH-003`.

### Scope Guardrails

- Sin cambios; reafirmar Out of Scope.

### Acceptance Criteria

- Reescribir AC-01, EC-01, EC-02 según decisiones #1/#2/#3.
- Confirmar AC-02 con invalidación de TanStack Query y store local.
- Si decisión #4 ≠ "ninguno", agregar AC para confirmación modal.

### Technical Notes

- Backend: `LogoutUseCase` invoca `SessionCookieIssuer.invalidate` (rotación de cookie) o `SessionRepository.revoke(sid)` (alternativa). Controller responde `204` o `401` según #1.
- Frontend: `useLogout` invoca `authApi.logout()` y luego `queryClient.removeQueries({ predicate: q => q.queryKey[0]?.startsWith('auth') })` y redirección.

### QA Notes

- Agregar tests de no-reutilización de cookie, multi-pestaña, multi-locale.

### Definition of Ready

- Marcar `PO/BA validó` post-resolución.

### Definition of Done

- Añadir verificación de `Set-Cookie` con `Max-Age=0` y respuesta canónica.

### Notes

- Quitar TODOs ya resueltos por decisiones #1..#4.

---

## 11. Recomendación Final

`Needs Refinement`.

La historia es valiosa pero requiere cuatro decisiones PO formales antes de aprobarse. Próxima skill recomendada: `eventflow-po-ba-decision-resolver`.
