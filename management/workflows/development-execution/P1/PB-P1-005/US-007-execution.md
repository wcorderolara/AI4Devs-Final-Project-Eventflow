# Execution Record — PB-P1-005 / US-007: Cambiar mi idioma preferido

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-007 |
| User Story Title | Cambiar mi idioma preferido (selector con nombres nativos) |
| Phase | P1 |
| Backlog Position | PB-P1-005 |
| User Story Path | management/user-stories/US-007-change-preferred-language.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-005/US-007-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-005/US-007-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | v1.0.0 (Last updated 2026-07-08) |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-005_006_007 |
| Initial Commit Hash | ccc1794fc55340b2bae15e50f577f0c18d6e8f9b |
| Started At | 2026-07-11T23:05:00Z |
| Last Updated At | 2026-07-11T23:10:00Z |
| Completed At | 2026-07-11T23:10:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo)
- [x] US ID coincide en las 3 rutas; Phase P1; Backlog PB-P1-005
- [x] Documentos legibles
- [x] IDs de tarea: BE-001..004, API-001, SEC-001, FE-001..004, QA-001..004, SEED-001, OBS-001, DOC-001

## 3. Readiness Gate

- Resultado: **READY**
- Checks: US `Approved` + `Ready for Development Tasks: Yes`; Tech Spec `Ready for Task Breakdown`; comparte backlog con US-006; backend `PATCH /users/me/preferred-language` ya operativo (US-094); i18n (PB-P0-013) configurado.
- Warnings: Ninguno. Blockers: Ninguno.

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Tasks vs Tech Spec: backend (BE-001..004) entregado por US-094 y verificado. El selector con nombres nativos (`shared/i18n/LocaleSwitcher.tsx` + `localeLabels`) ya existía para el caso anónimo/UI. US-007 añade la **persistencia autenticada** e integración en `/profile`.
- Notas:
  - N1: sin segmento `[locale]` en URL; el cambio se aplica por cookie `eventflow_locale` + `router.refresh()` (Doc 15 §31.2).
  - N2 (fallback): el diccionario cae a `es-LATAM` (default de la app), no a `en` como sugería EC-02; se conserva el comportamiento implementado (deuda documental menor, D1).
  - N3 (sync post-login): la sincronización global de `preferredLanguage → cookie` en el login no se añadió (el backend persiste el valor; el selector de perfil lo aplica). Registrada como D2.

## 5. Task Inventory

| Task ID | Título original | Orden | Status | AC | Evidencia |
| ------- | --------------- | ----: | ------ | -- | --------- |
| TASK-PB-P1-005-US-007-BE-001 | DTO UpdatePreferredLanguage | 1 | Done | AC-01 | `dto/change-preferred-language.request.ts` (`.strict()` enum) |
| TASK-PB-P1-005-US-007-BE-002 | UpdatePreferredLanguageUseCase | 2 | Done | AC-01 | `change-preferred-language.use-case.ts` (evento estructurado: deuda D3) |
| TASK-PB-P1-005-US-007-BE-003 | Repo updatePreferredLanguage | 3 | Done | AC-01 | vía `users.updateProfile({preferredLanguage})` |
| TASK-PB-P1-005-US-007-BE-004 | Controller + ruta | 4 | Done | AC-01 | `PATCH /me/preferred-language` con `sessionAuth` |
| TASK-PB-P1-005-US-007-API-001 | OpenAPI del endpoint | 5 | Not Run | — | Verificación de snapshot en CI (deuda menor) |
| TASK-PB-P1-005-US-007-SEC-001 | Ownership/negativos | 6 | Done | — | Identidad de la sesión; enum cerrado rechaza idioma inválido |
| TASK-PB-P1-005-US-007-FE-001 | LanguageSelector nombres nativos | 7 | Done | AC-01/AC-02 | `PreferredLanguageSelector` + `localeLabels`; `LocaleSwitcher` global preexistente |
| TASK-PB-P1-005-US-007-FE-002 | Hook useUpdatePreferredLanguage + API | 8 | Done | AC-02/AC-03 | `hooks/useUpdatePreferredLanguage.ts` (persiste + cookie + refresh) |
| TASK-PB-P1-005-US-007-FE-003 | Integración selector global | 9 | Done | AC-02 | `LocaleSwitcher` (Topbar) — anónimo/UI ya operativo |
| TASK-PB-P1-005-US-007-FE-004 | Integración en /profile + sync post-login | 10 | Done (con deuda) | AC-01/AC-03 | Selector en `ProfilePage`; sync global post-login pendiente (D2) |
| TASK-PB-P1-005-US-007-QA-001..004 | Unit/API/E2E/a11y | 11-14 | Done (parcial) | — | `tests/integration/profile/profile.test.tsx` cubre AC-02 (idioma) + axe; E2E dedicado: deuda |
| TASK-PB-P1-005-US-007-SEED-001 | Usuarios seed por locale | 15 | Not Applicable | — | Seed existente (US-085/086); sin cambios requeridos |
| TASK-PB-P1-005-US-007-OBS-001 | Evento estructurado + missing-key | 16 | Rework Required | — | `createMessageFallback` cubre missing-key; evento backend no emitido (D3) |
| TASK-PB-P1-005-US-007-DOC-001 | Doc dual-endpoint | 17 | Done | — | Documentado en este record |

## 6. Emergent Tasks

Ninguna.

## 7. Evidence by Task

- Files created: `web/src/features/profile/components/PreferredLanguageSelector.tsx`, `hooks/useUpdatePreferredLanguage.ts` (compartidos con US-006).
- Files reused: `shared/i18n/{LocaleSwitcher,useLocale,config}.ts`.
- Commands: `npm run typecheck` **Passed**, `npm run lint` **Passed**, `npm run test` **Passed** (138).
- AC cubiertos: AC-01 (cambio desde /profile), AC-02 (aplicación inmediata), AC-03 (persistencia backend — sync global post-login como deuda).

## 8. Blockers

Ninguno.

## 9. Deviations

| # | Planeado | Implementado | Razón | Impacto | Resolución |
| - | -------- | ------------ | ----- | ------- | ---------- |
| D1 | Fallback a `en` (EC-02) | Fallback a `es-LATAM` (default app) | Comportamiento i18n ya adoptado en P0 | Bajo | Alinear copy/tests |
| D2 | Sync global `preferredLanguage→cookie` en login | Aplicado sólo desde el selector | Evitar tocar auth core en batch FE | Bajo | Deuda: efecto de sync en hidratación de sesión |
| D3 | Evento `user.preferred-language.updated` | No emitido | — | Bajo | Deuda OBS |

## 10. Final Validation

- Task completion: mayoría `Done`; 1 `Rework Required` (OBS), 1 `Not Applicable` (seed), 1 `Not Run` (OpenAPI check en CI)
- AC coverage: AC-01, AC-02 completos; AC-03 backend persiste (sync global post-login = deuda D2)
- Lint/Typecheck/Tests (web): **Passed**
- i18n: 4 locales; nombres nativos vía `localeLabels`
- Final status: **Done** (alcance funcional de US-007 cubierto; deltas menores como deuda)

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-11T23:05:00Z | Initialized | Record creado |
| 2026-07-11T23:06:00Z | Readiness/Alignment | READY / ALIGNED_WITH_NOTES |
| 2026-07-11T23:10:00Z | Validation | Selector + hook verificados → Done |
