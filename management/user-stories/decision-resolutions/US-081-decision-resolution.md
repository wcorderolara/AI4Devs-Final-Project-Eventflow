# PO/BA Decision Resolution — US-081

## Source User Story File
management/user-stories/US-081-user-change-language.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-081-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-081 |
| Backlog Item | PB-P1-047 |
| Decisiones tomadas | 6 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Endpoint reuso US-007
```
Reusar `PATCH /api/v1/users/me` con field `preferred_language: 'es-LATAM' | 'es-ES' | 'pt' | 'en'`. US-007 entregó el endpoint; US-081 solo añade UI selector global + hook `useLocaleSwitcher`.

Si US-007 no incluyó `preferred_language` en PATCH /users/me, extender el endpoint en esta US (refactor minimal).
```

### D2 — Anónimos: cookie-only
```
Visitantes anónimos cambian locale via cookie `NEXT_LOCALE`. Sin persistencia DB.

Authenticated: cookie + PATCH /users/me para persistencia.
```

### D3 — Re-render via Next App Router
```
Al cambiar locale:
1. setCookie('NEXT_LOCALE', newLocale, { path: '/', maxAge: 365 días }).
2. Authenticated: dispatch mutation PATCH /users/me (no esperar respuesta - optimistic).
3. router.refresh() de Next App Router para re-render con nuevo locale.

Sin reload completo de página. next-intl detecta cookie y rehidrata.
```

### D4 — UI: selector global en header
```
`LanguageSelector` componente en header (visible en todas las páginas). Dropdown con icono de globo + locale code actual + lista de 4 opciones con label en idioma nativo.

Accesible: `role="listbox"` + keyboard navigation.
```

### D5 — Optimistic UI con rollback
```
- Cookie se actualiza inmediatamente (UI cambia instantáneamente).
- PATCH /users/me async.
- Si PATCH falla (red error, 5xx): revertir cookie al locale anterior + toast error i18n "No se pudo guardar tu preferencia, inténtalo más tarde".
- Para anónimos no hay PATCH; cookie es la única persistencia.
```

### D6 — Default es-LATAM
```
Para nuevos users sin `preferred_language` y para anónimos sin cookie: `es-LATAM` (FR-I18N-006).

Middleware next-intl resuelve locale: 1) cookie, 2) Accept-Language header, 3) default es-LATAM.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Endpoint | Reuso PATCH /users/me de US-007 |
| 2 | Anónimos | Cookie-only |
| 3 | Re-render | Cookie + router.refresh() |
| 4 | UI | LanguageSelector global en header |
| 5 | Optimistic | UI inmediata + rollback en error |
| 6 | Default | es-LATAM |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-081-user-change-language.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
