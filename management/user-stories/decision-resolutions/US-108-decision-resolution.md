# PO/BA Decision Resolution — US-108

## Source User Story File

`management/user-stories/US-108-configure-httponly-cookies.md`

## Source Refinement Review File

`management/user-stories/refinement-reviews/US-108-refinement-review.md`

## Decision Date

2026-06-15

## 1. Resumen Ejecutivo

| Campo | Valor |
| ----- | ----- |
| User Story ID | US-108 |
| User Story file path | `management/user-stories/US-108-configure-httponly-cookies.md` |
| Refinement review artifact path | `management/user-stories/refinement-reviews/US-108-refinement-review.md` |
| Existing decision resolution found | No |
| Backlog Item | PB-P0-006 — Security Cookies HTTP-Only + Captcha |
| Epic | EPIC-SEC-001 — Security & Authorization |
| Estado antes de decisiones | Ready for Approval |
| Cantidad de preguntas revisadas | 0 bloqueantes · 2 `Documentation Alignment Required` |
| Decisiones PO/BA tomadas | 2 |
| Decisiones técnicas recomendadas | 0 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |
| Decision Resolution artifact created/updated | Yes |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-108-decision-resolution.md` |
| Próximo paso recomendado | Run `eventflow-user-story-approval` |

US-108 no tenía preguntas bloqueantes pendientes. El refinement review identificó dos diferencias documentales no bloqueantes: lifetime de cookie de 30 días vs 24 horas, y `SameSite=Lax` vs `SameSite=None; Secure` para despliegue cross-site. Este artefacto formaliza esas decisiones para evitar que futuros ciclos las reabran como incertidumbre.

La User Story permanece en `Ready for Approval`. Sólo se agregó una fila breve en `PO/BA Decisions Applied` para referenciar esta resolución.

---

## 2. Decisiones Respondidas

## Decisión 1 — Lifetime de cookie de sesión

### Pregunta original

> PB-P0-006 indica lifetime de sesión de 30 días, mientras Doc 19 §10 menciona 24 horas. ¿Cuál valor debe gobernar US-108?

### Respuesta PO/BA

US-108 debe aplicar lifetime MVP de **30 días** para la cookie de sesión, configurable por `SESSION_COOKIE_MAX_AGE_DAYS` con default `30`.

### Decisión formal

```text
La cookie de sesión MVP usa Max-Age de 30 días por default, configurable mediante SESSION_COOKIE_MAX_AGE_DAYS. La referencia de 24 horas en Doc 19 §10 queda como documentación a alinear y no bloquea US-108.
```

### Rationale

PB-P0-006 es el backlog item específico de esta historia y contiene la decisión operacional vigente para cookies HTTP-only. La historia ya está alineada con esa decisión y no contradice ningún ADR aceptado. Un default configurable permite mantener el valor de negocio definido por PO y ajustar entornos si Tech Lead/Security Lead lo requieren sin cambiar el contrato de la historia.

### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| PO/BA Decisions Applied | Formalizada la alineación documental mediante fila `Alineación documental`. |
| Assumptions | Ya indicaba 30 días por PB-P0-006; sin cambio adicional. |
| Acceptance Criteria | AC-01 ya exige `Max-Age` equivalente a 30 días por default; sin cambio adicional. |
| Validation Rules | VR-05 ya fija default 30 días; sin cambio adicional. |
| Technical Notes | No requiere cambio adicional. |
| QA Notes | No requiere cambio adicional; QA debe verificar el default de 30 días. |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — Política `SameSite` por entorno y despliegue cross-site

### Pregunta original

> Doc 16/Doc 19 usan `SameSite=Lax`, mientras Doc 21 y ADR-SEC-002 contemplan `SameSite=None; Secure` para Amplify ↔ App Runner. ¿Cuál política debe aplicar US-108?

### Respuesta PO/BA

US-108 debe usar `SameSite=Lax` como default MVP y permitir `SameSite=None; Secure` sólo cuando el despliegue sea cross-site y exista CORS allowlist con `credentials=true` y mitigación CSRF compatible con ADR-SEC-006.

### Decisión formal

```text
SameSite=Lax es el default MVP. SameSite=None; Secure sólo se permite para hosting cross-site, con Secure=true, CORS allowlist explícita, credentials=true y mitigación CSRF compatible con ADR-SEC-006.
```

### Rationale

La política mantiene el principio de seguridad por defecto en entornos same-site y permite el despliegue documentado Amplify ↔ App Runner sin romper sesiones por navegador. La condición `None; Secure` no debilita el modelo porque queda atada a CORS allowlist y mitigación CSRF, tal como exigen ADR-SEC-002 y ADR-SEC-006.

### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| PO/BA Decisions Applied | Formalizada la alineación documental mediante fila `Alineación documental`. |
| Assumptions | Ya indicaba default `SameSite=Lax` y excepción cross-site; sin cambio adicional. |
| Acceptance Criteria | AC-02 ya define default Lax y excepción `None; Secure`; sin cambio adicional. |
| Scope Guardrails | Ya excluye CSRF complejo salvo activación de `SameSite=None`; sin cambio adicional. |
| Validation Rules | VR-03 y VR-04 ya cubren reglas de `SameSite=None`; sin cambio adicional. |
| Technical Notes | No requiere cambio adicional. |
| QA Notes | QA debe cubrir ambos modos si el entorno cross-site se usa en Demo/QA. |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

| # | Tema | Decisión | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
| -: | ---- | -------- | ---- | ---------------------- | -------------------- |
| 1 | Lifetime de cookie | `Max-Age` default 30 días, configurable por `SESSION_COOKIE_MAX_AGE_DAYS`; Doc 19 §10 requiere alineación documental. | PO / BA | No | No requiere |
| 2 | `SameSite` por entorno | Default `SameSite=Lax`; permitir `SameSite=None; Secure` sólo para cross-site con CORS allowlist, credentials y mitigación CSRF compatible. | PO / BA | No | No requiere |

---

## 4. Cambios Aplicados a la User Story

### Metadata

Sin cambios. La historia ya estaba en `Ready for Approval` y `Last Updated` permanece en `2026-06-15`.

### Business Context

Sin cambios.

### PO/BA Decisions Applied

Se agregó una fila:

```text
Alineación documental — Las diferencias documentales sobre lifetime de 30 días vs 24 horas y SameSite=Lax vs SameSite=None; Secure quedan resueltas por PB-P0-006 y ADR-SEC-002/006; no bloquean approval.
```

### Assumptions

Sin cambios. Ya reflejaban ambas decisiones.

### Scope Guardrails

Sin cambios. Ya delimitaban la excepción CSRF para `SameSite=None`.

### Acceptance Criteria

Sin cambios. AC-01 y AC-02 ya eran consistentes con las decisiones formalizadas.

### Technical Notes

Sin cambios.

### QA Notes

Sin cambios. Las expectativas QA existentes cubren headers, config fail-fast, logs y modo credentials.

### Definition of Ready

Sin cambios.

### Definition of Done

Sin cambios.

### Notes

Sin cambios adicionales; el detalle completo vive en este Decision Resolution artifact.

---

## 5. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| PB-P0-006 vs Doc 19 §10 | PB-P0-006 indica lifetime 30 días; Doc 19 §10 menciona 24 horas. | US-108 aplica 30 días configurable por ser decisión específica del backlog. | Actualizar Doc 19 §10 o registrar en technical spec como decisión aplicada. | No |
| Doc 16/Doc 19 vs Doc 21/ADR-SEC-002 | Doc 16/Doc 19 usan `SameSite=Lax`; Doc 21 requiere `SameSite=None; Secure` para Amplify ↔ App Runner. | Default `SameSite=Lax`; `SameSite=None; Secure` permitido sólo para cross-site con CORS allowlist y mitigación CSRF compatible. | Alinear documentación de deploy/security por entorno o reflejarlo en technical spec. | No |

---

## 6. File Update Result

| Campo | Valor |
| ----- | ----- |
| User Story file updated | Yes |
| User Story file path | `management/user-stories/US-108-configure-httponly-cookies.md` |
| Decision Resolution artifact created/updated | Yes |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-108-decision-resolution.md` |
| New User Story status | Ready for Approval |
| Remaining blockers | No |
| Reason | Las diferencias documentales fueron formalizadas como alineación no bloqueante y la US ya contenía los ACs y reglas correctas. |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`.

US-108 está lista para el approval gate. No hay blockers PO, BA, QA, Security ni Tech Lead. Las decisiones formalizadas no introducen scope creep, no contradicen ADRs aceptados y mantienen backend como source of truth para sesión/autorización.

---

## 8. Próximo Paso Recomendado

1. Revisar la User Story actualizada.
2. Ejecutar `eventflow-user-story-refinement` sólo si se desea una segunda validación.
3. Ejecutar `eventflow-user-story-approval` para el formal approval gate.
