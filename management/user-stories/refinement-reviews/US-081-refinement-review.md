# User Story Refinement Review — US-081

## Source User Story File
management/user-stories/US-081-user-change-language.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-081-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)
Q1–Q6 resueltas. La US-081 declara `Backlog Item: PB-P1-047`, `PO/BA Decisions Applied` D1–D6, trazabilidad corregida (FR-USER-003 + FR-I18N-001/002/004/006 + UC-I18N-001 + BR-USER-006; NFR-PERF-API-001→NFR-PERF-001). Reuso endpoint US-007 + LanguageSelector global + optimistic UI con rollback + cookie+DB sync + default es-LATAM. AC-01..AC-05, EC-01..EC-03, VR-01..VR-02, SEC-01..SEC-04, TS-01..TS-05, NT-01..NT-03, AUTH-TS-01..AUTH-TS-02. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-081 |
| Backlog Item | PB-P1-047 — Selector de idioma y configuración del evento |
| Epic | EPIC-I18N-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-081-refinement-review.md |

## 2. Diagnóstico

US-081 es 1 de 2 en PB-P1-047 (US-081 selector idioma usuario + US-082 idioma evento). Surface UI global del `LanguageSelector` en header + endpoint PATCH para `preferred_language`. Complementa US-007 (cambio desde profile).

### Hallazgos

1. **Trazabilidad**: cita `FR-USER-003` + `FR-I18N-001` ✓. Agregar **`FR-I18N-002`** (cambio inmediato en UI), **`FR-I18N-004`** (traducciones de UI), **`FR-I18N-006`** (default es-LATAM). UC-I18N-001 ✓. BR-USER-006 ✓. NFR-PERF-API-001 → NFR-PERF-001.
2. **Falta declarar `Backlog Item: PB-P1-047`**.
3. **ACs genéricos**.
4. **API**: `PATCH /api/v1/users/me` ya posiblemente existe (US-006 view/edit profile + US-007 change language). Esta US no debería duplicar endpoint backend — solo añadir UI selector + invalidations.
5. **Locales soportados**: es-LATAM (default), es-ES, pt, en.
6. **Re-render inmediato**: next-intl + router.refresh() o reload.
7. **Anónimos**: pueden cambiar locale via cookie (sin persistencia user).
8. **Header global**: selector visible en todas las páginas.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | Tech | Endpoint reuso US-007 | Reusar `PATCH /api/v1/users/me` con field `preferred_language`. Si US-007 ya lo entrega, US-081 solo añade UI selector + hook. |
| Q2 | PO | Anónimos | Permitir cambio via cookie sin persistencia. Authenticated cambia cookie + persistencia DB. |
| Q3 | Tech | Re-render mechanism | Cookie `NEXT_LOCALE` actualizada + `router.refresh()` de Next App Router. Sin reload completo. |
| Q4 | PO | UI location | Selector global en header (dropdown o icono globo). Visible en TODAS las páginas. |
| Q5 | Tech | Sync cookie + DB | Authenticated: actualizar cookie inmediatamente + PATCH async (optimistic UI). Si PATCH falla, revertir + toast error. |
| Q6 | PO | Default | `es-LATAM` para nuevos users sin preferred_language. |

## 9. Recomendación

`Needs Refinement` — 6 decisiones PO/Tech bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
