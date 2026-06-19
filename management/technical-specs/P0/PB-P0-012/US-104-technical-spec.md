# Technical Specification — US-104: Configurar `next-intl` con 4 locales, detección por cookie + `Accept-Language`, locale switcher y catálogos base por área

## 1. Metadata

| Field                                  | Value                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| User Story ID                          | US-104                                                                                                                                 |
| Source User Story                      | `management/user-stories/US-104-i18n-config-4-locales.md`                                                                               |
| Decision Resolution Artifact           | No existe — la historia refinada incorporó las decisiones directamente en `PO/BA Decisions Applied` (sin preguntas bloqueantes)         |
| Priority                               | P0                                                                                                                                     |
| Backlog ID                             | PB-P0-012                                                                                                                              |
| Backlog Title                          | Frontend Next.js Bootstrap & i18n                                                                                                      |
| Backlog Execution Order                | 12 (de 18 items P0 priorizados)                                                                                                        |
| User Story Position in Backlog Item    | 2 de 3                                                                                                                                 |
| Related User Stories in Backlog Item   | US-103 (bootstrap), US-104 (i18n functional), US-105 (route groups por rol)                                                              |
| Epic                                   | EPIC-FE-001 — Frontend Next.js Application Foundation                                                                                  |
| Backlog Item Dependencies              | — (foundation; PB-P0-012 no depende de otros items P0)                                                                                  |
| Feature                                | i18n setup — `next-intl` 4 locales + cookie detection + locale switcher                                                                |
| Module / Domain                        | Platform / FE / I18N                                                                                                                   |
| User Story Status                      | Approved with Minor Notes                                                                                                              |
| Backlog Alignment Status               | Found                                                                                                                                  |
| Technical Spec Status                  | Ready for Task Breakdown                                                                                                               |
| Created Date                           | 2026-06-19                                                                                                                             |
| Last Updated                           | 2026-06-19                                                                                                                             |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P0-012 — Frontend Next.js Bootstrap & i18n**. Item P0 foundation que entrega la app Next.js con App Router + TypeScript + Tailwind + next-intl con 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`) y route groups por rol. Sin dependencias con otros items P0. Trazabilidad: Doc 15, NFR-A11Y-*, NFR-I18N-*, ADR-FE-001.

### Execution Order Rationale

PB-P0-012 se ejecuta en la **posición 12 de 18**. US-104 es la **segunda historia** del item y depende exclusivamente de US-103 (bootstrap), que ya está aprobada y especificada. Una vez US-103 esté mergeada (proyecto Next.js + stack instalado + carpetas `shared/i18n/` y `messages/` vacías + `next-intl` como dep), US-104 puede iniciarse en paralelo con US-105 (route groups). US-104 no bloquea a US-105 técnicamente, pero US-105 extenderá el `middleware.ts` creado en US-104 con `localeMiddleware`, por lo que la secuencia recomendada sigue siendo US-103 → US-104 → US-105.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                                                                                       | Suggested Order |
| ---------- | --------------------------------------------------------------------------------------------------------- | --------------- |
| US-103     | Bootstrap del proyecto + stack + configuración base + estructura Doc 15 §15 (incluye `next-intl` instalado) | 1               |
| US-104     | Configuración funcional `next-intl` 4 locales + middleware locale + switcher + catálogos transversales + `<Money>` mínimo + `attachLocaleHeader` | 2 |
| US-105     | 4 route groups + middleware UX role guard componible con `localeMiddleware` (extiende US-104) + SEO baseline | 3              |

---

## 3. Executive Technical Summary

US-104 entrega la **configuración funcional de internacionalización** sobre el bootstrap de US-103 cumpliendo Doc 15 §17/§31/§32 y los requisitos FR-I18N-001/002/004/005/006, NFR-I18N-001..003/006 y BR-AI-011. La historia introduce:

* **`next-intl 3.x` configurado**: `config.ts` (locales `['es-LATAM','es-ES','pt','en']`, default `es-LATAM`, cookie `eventflow_locale`), `request.ts` (`getRequestConfig` con merge de áreas y `getMessageFallback`), `format.ts` (helpers `Intl.*` con mapeo `es-LATAM ↔ es-419`), `Money.tsx` mínimo (Doc 15 §32.2).
* **`middleware.ts` con `localeMiddleware`** (componible con el futuro `roleGuardMiddleware` de US-105) que detecta locale por cookie → `Accept-Language` → fallback `es-LATAM`, sin prefijo URL (Doc 15 §17/§31.2).
* **`<NextIntlClientProvider>` en root layout** (`src/app/layout.tsx`) con `<html lang>` dinámico.
* **`<LocaleSwitcher>` accesible WCAG 2.1 AA**: persiste cookie `eventflow_locale` (no HTTP-only, `SameSite=Lax`, `Secure` en prod, sin PII).
* **Catálogos base transversales** (`common`, `navigation`, `errors`, `validation`) con `es-LATAM` 100% completo y placeholders detectables en los otros 3.
* **`attachLocaleHeader`** exportable para que el `httpClient` (US-106) propague `Accept-Language: <locale>` al backend (Doc 15 §31.4 / FR-I18N-005 / BR-AI-011).
* **Lint anti-hardcoded** strings (`react/jsx-no-literals` o equivalente acordada en PR).

La historia **NO** persiste `users.language_code` en backend (User Profile story), **NO** maneja el idioma del evento (historia de creación de evento + historias IA), **NO** traduce features completas por dominio (cada historia aporta su catálogo), **NO** configura layouts/route groups (US-105/US-107) ni `QueryClient`/MSW (US-106). Tres `Documentation Alignment Required` no bloqueantes: ADR-FE-007 por redactar en Doc 22, marca "decisión a confirmar" en Doc 15 §17, mapeo `es-LATAM ↔ es-419` para `Intl.*` documentado en `format.ts`.

---

## 4. Scope Boundary

### In Scope

* `src/shared/i18n/config.ts` (`locales`, `defaultLocale`, `cookieName`, `localeLabels` como `as const`).
* `src/shared/i18n/request.ts` (`getRequestConfig` de `next-intl/server` con merge de áreas + `getMessageFallback`).
* `src/shared/i18n/format.ts` (`formatDate`, `formatNumber`, `formatCurrency` con `Intl.*` + mapeo `es-LATAM → es-419`).
* `src/shared/i18n/Money.tsx` (Client Component mínimo Doc 15 §32.2).
* `src/shared/i18n/LocaleSwitcher.tsx` (Client Component accesible WCAG 2.1 AA).
* `src/shared/i18n/useLocale.ts` (hook).
* `src/shared/i18n/attachLocaleHeader.ts` (utilidad cliente y server).
* `src/shared/i18n/index.ts` (barrel export).
* `src/middleware.ts` (creado en US-104 con `localeMiddleware`; matcher excluye `_next/*`, `static/*`, `api/*`, `favicon.ico`).
* Actualización de `src/app/layout.tsx` (de US-103): montar `<NextIntlClientProvider>`, `<html lang>` dinámico, `<link rel="alternate" hrefLang="x-default" href="/" />` placeholder.
* `src/messages/<locale>/{common,navigation,errors,validation}.json` (4 locales × 4 áreas; `es-LATAM` 100% completo, los otros con placeholders detectables).
* Lint anti-hardcoded strings activo en ESLint (`react/jsx-no-literals` con allowList mínima o regla equivalente).
* `.env.local.example` normalizado: `NEXT_PUBLIC_DEFAULT_LOCALE=es-LATAM` y `NEXT_PUBLIC_SUPPORTED_LOCALES=es-LATAM,es-ES,pt,en`.
* Tests unit/component/integration + 3 E2E Playwright (switcher, detección por header, fallback) + tests A11Y.
* `web/README.md` § "i18n" con convenciones (claves jerárquicas, ICU MessageFormat, no hardcoded strings, fallback, cómo agregar locales).

### Out of Scope

* **Persistencia `users.language_code` en backend** (FR-I18N-002, FR-USER-003, NFR-I18N-002) → historia User Profile.
* **`events.language_code` y UX de selección de idioma del evento** (FR-I18N-003, NFR-I18N-003) → historia de creación de evento.
* **Currency lock visible** (Doc 15 §32.3, selector disabled + tooltip) → historia de creación/edición de evento.
* **Traducciones completas por feature** (auth, events, vendors, quotes, IA, admin) → cada historia aporta su catálogo.
* **Route groups por rol** y `roleGuardMiddleware` → US-105 (extiende `middleware.ts`).
* **`QueryClient`, `<QueryProvider>`, MSW handlers** → US-106. US-104 deja `attachLocaleHeader` listo.
* **Layouts completos por rol** (sidebars, navegación) → US-107.
* **SEO localizado por URL** (`/en/...`, `/pt/...`, `hreflang` real, sitemaps multi-locale) → Future (Doc 15 §31.5).
* **Notificaciones reales i18n** (push/email; sin push en MVP).
* **Switcher de currency** (Doc 15 §32) → historia de evento.
* **`script` de cobertura i18n** que valide claves en los 4 locales → Future (anotar como follow-up).

### Explicit Non-Goals

* No se modifica el backend ni la base de datos.
* No se introduce `users.language_code` ni endpoints de preferencia de idioma.
* No se compromete ADR-FE-003 (frontend UX-only).
* No se introduce `next.config.i18n` legacy de Pages Router.
* No se introducen Server Actions ni API Routes BFF.
* No se introduce Sentry ni observability cliente full.

---

## 5. Architecture Alignment

### Backend Architecture

No aplica. US-104 no toca backend. El consumo de `Accept-Language` por endpoints IA está contemplado por Doc 14 y FR-I18N-005; si el backend aún no lo cumple, degrada a `es-LATAM` sin bloquear el frontend.

### Frontend Architecture

Cumple íntegramente Doc 15:

* **Doc 15 §17/§31.1/§31.2**: 4 locales, default `es-LATAM`, detección cookie + `Accept-Language` sin prefijo URL.
* **Doc 15 §31.3**: claves jerárquicas, ICU MessageFormat, prohibido hardcoded strings.
* **Doc 15 §31.4**: locale propagado al backend en IA y requests REST.
* **Doc 15 §32.1/§32.2**: `<Money>` mínimo con `Intl.NumberFormat`, sin conversión automática.
* **Doc 15 §15**: `shared/i18n/` y `messages/` se llenan; estructura preservada.
* **ADR-FE-001/003/007** (FE-007 a redactar): Next.js + App Router + frontend UX-only + next-intl con cookie/header sin prefijo URL.

### Database Architecture

No aplica. La persistencia de `users.language_code` (NFR-I18N-002) vive en User Profile story.

### API Architecture

US-104 no introduce endpoints. Modifica el **comportamiento outbound**: `attachLocaleHeader` agrega `Accept-Language: <locale>` a todos los requests REST cuando el `httpClient` (US-106) lo invoque como interceptor.

### AI / PromptOps Architecture

No invoca IA directamente. **Habilita la cadena**: el header `Accept-Language` propagado por `attachLocaleHeader` permitirá a las historias IA (US-122/US-124 y siguientes) cumplir FR-I18N-005 / BR-AI-011 (Doc 17 PromptOps: el `LLMProvider` recibirá el `locale` como parámetro).

### Security Architecture

* **ADR-FE-003** invariante: sin checks de role/ownership/permission en cliente.
* **Cookie técnica `eventflow_locale`**: no HTTP-only, sin PII, sin firma, `SameSite=Lax`, `Secure` solo en prod. Distinta y separada de la cookie de sesión auth de US-108.
* **`Accept-Language`** es metadata pública por diseño HTTP; no expone secretos.
* **XSS prevention**: catálogos son JSON estático versionado; nunca se construyen con input usuario.
* **Logs**: middleware no imprime contenido completo de `Accept-Language` (puede ser fingerprint); solo el locale resuelto.

### Testing Architecture

* **Vitest + Testing Library + jsdom**: unit (config, request, format, attachLocaleHeader) + component (`<LocaleSwitcher>`, `<Money>`).
* **Integration**: middleware contra mocks de `NextRequest` para cubrir las reglas de detección.
* **Playwright**: 3 E2E (switcher, detección por header, fallback).
* **A11Y**: Testing Library + reglas semánticas; `jest-axe` opcional si está disponible.
* Pipeline canónico Doc 21 §9.2 verde.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|----------------------|--------------------------|-------------------|
| AC-01 `next-intl` configurado funcionalmente con 4 locales | Crear `config.ts`, `request.ts`, `format.ts`, `Money.tsx`, `LocaleSwitcher.tsx`, `useLocale.ts`, `attachLocaleHeader.ts` en `src/shared/i18n/` con las firmas exactas declaradas en el AC. | FE Lib (i18n) |
| AC-02 Middleware de locale operativo | `src/middleware.ts` con `localeMiddleware` (cookie whitelist → `Accept-Language` BCP-47 best match → default), propaga `x-locale` header al request, sin redirect por prefijo URL, sin role guard (eso es US-105). Matcher excluye `_next/*`, `static/*`, `api/*`, `favicon`. | FE Middleware |
| AC-03 `<IntlProvider>` en root layout | Actualizar `src/app/layout.tsx` (creado en US-103): leer locale en server side, montar `<NextIntlClientProvider locale messages>`, `<html lang={locale}>` dinámico, `<link rel="alternate" hrefLang="x-default" href="/" />`. | FE Layout |
| AC-04 Catálogos base por área transversal | Crear estructura `src/messages/<locale>/{common,navigation,errors,validation}.json`. `es-LATAM` 100% completo con claves listadas en AC-04. Los otros 3 locales con mismas claves y valores placeholder `[ES-LATAM]` o vacíos para detección. | FE i18n Catalogs |
| AC-05 Locale switcher accesible y funcional | `<LocaleSwitcher>` Client Component con `<select>` o `Headless UI Listbox`, navegable por teclado, `aria-label` i18n, focus visible, persistencia de cookie con flags correctos, `router.refresh()` tras seleccionar. | FE Component |
| AC-06 Detección por `Accept-Language` cuando la cookie falta | El middleware negocia `Accept-Language` contra `locales` usando best match BCP-47 (`Intl.LocaleMatcher` polyfill / `accept-language-parser` o implementación interna). Sin setear cookie automáticamente. | FE Middleware |
| AC-07 Fallback a `es-LATAM` cuando no hay match | Si no hay cookie válida y `Accept-Language` no tiene match en `locales`, retornar `defaultLocale = 'es-LATAM'`. `try/catch` alrededor del negociador para casos malformados. | FE Middleware |
| AC-08 Propagación de `Accept-Language` al backend | `attachLocaleHeader(context)` retorna `{ 'Accept-Language': <locale> }`. En cliente lee cookie/hook; en server lee del request via `getLocale()` de `next-intl/server` o del `x-locale` header. Documentar boundary con US-106. | FE Lib + Server |
| AC-09 Helpers y `<Money>` | `formatDate`/`formatNumber`/`formatCurrency` delegando en `Intl.DateTimeFormat`/`NumberFormat` con mapeo `es-LATAM → es-419`. `<Money>` usa `formatCurrency` sin conversión. | FE Lib |
| AC-10 Lint anti-hardcoded strings | Habilitar `react/jsx-no-literals` (o `eslint-plugin-formatjs/no-literal-string`) con allowList: símbolos (`·`, `/`, `&`), números puros, marcas registradas. | FE Tooling |
| AC-11 Tests E2E de i18n | Crear `tests/e2e/i18n.switcher.spec.ts`, `tests/e2e/i18n.detection.spec.ts`, `tests/e2e/i18n.fallback.spec.ts` con Playwright manipulando cookies y headers. | FE E2E |
| AC-12 Pipeline canónico verde y sin artefactos fuera de scope | CI: `npm ci && npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e` exit 0. Revisión PR contra lista negativa de artefactos. | FE CI |

---

## 7. Backend Technical Design

No aplica. US-104 no toca backend. Documentación: el backend acepta `Accept-Language` por contrato Doc 14/16; si no lo cumple aún, degrada a `es-LATAM`.

---

## 8. Frontend Technical Design

### Routes / Pages

* Modificar `src/app/layout.tsx` (root) para montar `<NextIntlClientProvider>` y `<html lang>` dinámico.
* Sin nuevas rutas. El `<LocaleSwitcher>` se entrega como componente standalone para que los layouts de US-107 lo monten en `PublicLayout` / `AuthLayout` / `AppLayout`.

### Components

| Componente            | Tipo            | Responsabilidad                                                                                      |
| --------------------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| `<LocaleSwitcher>`    | Client          | Permite cambiar locale, persiste cookie `eventflow_locale`, dispara `router.refresh()`              |
| `<Money>`             | Client          | Renderiza `{ amount, currency }` con `Intl.NumberFormat(locale, { style: 'currency', currency })`   |

### Forms

No aplica directamente. RHF + Zod (instalados en US-103) consumirán `validation.*` claves de i18n cuando aparezcan los forms reales.

### State Management

* **`useLocale()`**: hook cliente que devuelve `{ locale, supportedLocales, setLocale(next) }`. `setLocale` escribe la cookie y llama `router.refresh()`.
* **Server side**: `getLocale()` y `getMessages()` de `next-intl/server` para hidratar el provider en root layout.

### Data Fetching

US-104 no agrega data fetching propio. **Sí prepara** la propagación de `Accept-Language` para cuando aparezca el `httpClient` (US-106): `attachLocaleHeader` se exporta listo.

### Loading / Empty / Error / Success States

* `common.loading`, `common.error`, `common.retry`, `errors.envelope.<code>` disponibles en catálogos para uso por features posteriores.
* `<LocaleSwitcher>` no requiere loading (cambio síncrono + router refresh).

### Accessibility

* `<LocaleSwitcher>` WCAG 2.1 AA: focus visible, `aria-label` desde `t('navigation.localeSwitcher.label')`, navegable Tab/flechas/Enter, `aria-current="true"` o equivalente en opción seleccionada.
* `<html lang>` dinámico permite a lectores de pantalla anunciar correctamente el idioma.
* Lint `jsx-a11y` (heredado de US-103) continúa activo.

### i18n

Es **toda** la historia. Detalles:

* **Locales y default**: `['es-LATAM','es-ES','pt','en'] as const`, default `es-LATAM`.
* **Mapeo BCP-47 efectivo**: `es-LATAM → es-419`, `es-ES → es-ES`, `pt → pt-BR` (o `pt`), `en → en-US` (o `en`). Documentar el mapeo en `format.ts` y `web/README.md`.
* **Detección**: cookie `eventflow_locale` (preferida, whitelist) → `Accept-Language` (best match BCP-47) → `es-LATAM`.
* **Catálogos**: 4 áreas transversales por locale. `es-LATAM` 100% completo. Otros con placeholders detectables.
* **Fallback**: `getMessageFallback` devuelve clave anotada en dev (`[<locale>] <key>`) y traducción `es-LATAM` en prod.
* **ICU MessageFormat**: plurales y género documentados con ejemplo en `web/README.md`.
* **Propagación al backend**: `attachLocaleHeader` listo para interceptor.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|--------|----------|---------|---------------|---------|----------|-------------|
| ALL    | Todos los REST `/api/v1/*` | El frontend agrega `Accept-Language: <locale>` cuando el `httpClient` (US-106) consuma `attachLocaleHeader` como interceptor. US-104 NO ejecuta requests; solo entrega la utilidad. | N/A | header `Accept-Language` | N/A | N/A |

No aplica más allá del header outbound preparado.

---

## 10. Database / Prisma Design

No aplica. La persistencia de `users.language_code` y `events.language_code` vive en otras historias.

---

## 11. AI / PromptOps Design

No aplica directamente. US-104 **habilita** la cadena para que las historias IA propaguen `locale` al backend y el `LLMProvider` (Doc 17) lo reciba como parámetro (FR-I18N-005, BR-AI-011, NFR-I18N-003). La integración real vive en US-122/US-124.

---

## 12. Security & Authorization Design

### Authentication

No aplica. La cookie HTTP-only de sesión la emite el backend en US-108; US-104 no la lee ni procesa.

### Authorization

No aplica. **ADR-FE-003**: backend es la única fuente de autorización. US-104 no introduce checks de role/ownership/permission en cliente.

### Ownership Rules

No aplica.

### Role Rules

No aplica. Anonymous puede usar el `<LocaleSwitcher>` (es UX).

### Negative Authorization Scenarios

No aplica directamente. Los tests negativos de RBAC viven en US-112.

### Audit Requirements

No aplica. Sin `AdminAction` en US-104.

### Sensitive Data Handling

* **Cookie `eventflow_locale`**: no HTTP-only (cliente la lee para el switcher), sin PII, sin firma, `SameSite=Lax`, `Secure` en prod, `Max-Age=31536000` (1 año), `path=/`. No es cookie de sesión.
* **`Accept-Language`**: metadata pública por diseño; sin secretos.
* **Catálogos**: JSON estático versionado en repo; sin secrets, sin URLs internas, sin captcha keys.
* **Logs**: middleware no imprime contenido completo de `Accept-Language` (fingerprint risk); solo locale resuelto y acción.
* **XSS prevention**: las claves de mensajes se cargan desde JSON estático; nunca se construyen con input usuario en US-104.

---

## 13. Testing Strategy

### Unit Tests

* `tests/unit/i18n/config.test.ts`: `locales`, `defaultLocale`, `cookieName` exportados como `as const`.
* `tests/unit/i18n/request.test.ts`: `getRequestConfig` resuelve `messages` con merge de áreas; `getMessageFallback` devuelve clave anotada en dev y `es-LATAM` en prod.
* `tests/unit/i18n/format.test.ts`: `formatDate`/`formatNumber`/`formatCurrency` invocan `Intl.*` con el mapeo correcto (`es-LATAM → es-419`).
* `tests/unit/i18n/attachLocaleHeader.test.ts`: cliente y server contexts devuelven `{ 'Accept-Language': '<locale>' }`.

### Integration Tests

* `tests/integration/middleware/locale.test.ts`: contra mocks de `NextRequest`, cubrir las reglas: cookie válida → la usa; cookie inválida + `Accept-Language: pt` → `pt`; sin cookie ni header → `es-LATAM`; `Accept-Language: ""` malformado → `es-LATAM` sin throw.

### Component Tests

* `tests/unit/i18n/LocaleSwitcher.test.tsx`: render con Testing Library, navegación por teclado, `aria-label` resuelto vía `t()`, `aria-current` en opción activa, click setea cookie + llama `router.refresh()`.
* `tests/unit/i18n/Money.test.tsx`: render con distintas combinaciones (`{amount, currency}` × locale activo); verifica que `formatCurrency` se invoca; verifica fallback `try/catch` con currency inválida.

### API Tests

No aplica.

### E2E Tests

* `tests/e2e/i18n.switcher.spec.ts`: cambiar idioma vía switcher persiste cookie y re-renderiza la página en el nuevo locale; `<html lang>` se actualiza.
* `tests/e2e/i18n.detection.spec.ts`: sin cookie + `Accept-Language: pt-PT,pt;q=0.9,en;q=0.5` → primera visita renderiza en `pt`.
* `tests/e2e/i18n.fallback.spec.ts`: sin cookie + `Accept-Language: fr,de;q=0.9` → renderiza en `es-LATAM`.

### Security Tests

* Test estructural / regex sobre el PR: no introduce `next.config.i18n` legacy, no introduce Server Actions, no introduce secrets en catálogos.
* `npm audit --omit=dev` High/Critical bloquea merge.

### Accessibility Tests

* A11Y-TS-01 a A11Y-TS-03: navegación por teclado del switcher, `aria-label` vía `t()`, `aria-current` para opción activa.
* `jest-axe` opcional contra `<LocaleSwitcher>` y `<Money>` si está disponible.

### AI Tests

No aplica. La cadena `locale → IA` se valida en US-122/US-124.

### Seed / Demo Tests

No aplica.

### CI Checks

Pipeline canónico Doc 21 §9.2 verde:

```bash
npm ci
npm run lint        # --max-warnings=0
npm run typecheck
npm run test        # incluye unit + component + integration
npm run build
npm run test:e2e    # incluye los 3 E2E i18n
```

Lint anti-hardcoded strings activo (AC-10).

---

## 14. Observability & Audit

### Logs

* **Dev**: `next-intl` reporta `missing key: <key> (locale=<locale>)` en console; middleware loguea `i18n.locale.resolved { locale, source: cookie|header|default }`.
* **Prod**: silencioso; `getMessageFallback` devuelve traducción `es-LATAM` sin warn.
* No imprimir contenido completo de `Accept-Language` (SEC-05).

### Correlation ID

No introducido aquí. Cuando aparezca el `httpClient` (US-106), el `attachLocaleHeader` se compondrá con el interceptor de `X-Correlation-Id` (Doc 14).

### AdminAction

No aplica.

### Error Tracking

* `error.tsx` por route group lo introducirá US-105. US-104 deja las claves `errors.envelope.UNEXPECTED`, `common.retry` listas para usarse.

### Metrics

No aplica en US-104 (sin runtime calls). Sentry / observability cliente full es Future.

---

## 15. Seed / Demo Data Impact

No aplica directamente. **Habilita** NFR-I18N-006 (seed multi-idioma): EPIC-SEED-001 podrá crear eventos con `language_code` distinto y la UI los renderizará correctamente sin cambios adicionales.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|-------------------|----------|------------------|--------------------|------------------------|
| Doc 22 — ADR-FE-007 | Referenciada en Doc 15 §49 pero NO redactada en Doc 22 (que solo tiene ADR-FE-001..004). | La decisión técnica está formalizada en Doc 15 §31 (next-intl + cookie/header sin prefijo URL). | Redactar ADR-FE-007 formal en Doc 22 como housekeeping post-merge de PB-P0-012. | No |
| Doc 15 §17 | Marca "decisión a confirmar en ADR" para cookie/header sin prefijo URL. | US-104 implementa esa estrategia; queda alineado con ADR-FE-007 cuando se redacte. | Retirar la marca "decisión a confirmar" tras redactar ADR-FE-007. | No |
| Mapeo `es-LATAM ↔ es-419` para `Intl.*` | `es-LATAM` no es BCP-47 estándar; `Intl.*` necesita `es-419` (o `es-MX`) para producir formatos correctos. | Tratar `es-LATAM` como etiqueta lógica interna; mapear a `es-419` en `format.ts`. | Documentar el mapeo en `format.ts` y `web/README.md` § i18n. | No |
| Doc 15 §15 ubicación `middleware.ts` | Doc 15 §15 muestra `app/middleware.ts`; la convención App Router es `src/middleware.ts` (project-root). | US-104 colocará el archivo en `src/middleware.ts`. | Amender Doc 15 §15 post-merge para reflejar ubicación efectiva. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `next-intl` en App Router con Server Components + middleware tiene curva de aprendizaje. | Errores de hidratación, "Server/Client mismatch" en `<html lang>` o providers. | Seguir el patrón oficial App Router de `next-intl`: `getRequestConfig` en server, `<NextIntlClientProvider>` en root layout, `useLocale`/`useTranslations` en Client Components. Validar con el smoke E2E. |
| BCP-47 best matcher inconsistente entre runtimes (Edge vs Node). | Detección de locale incorrecta en algunos entornos. | Implementar el matcher con `@formatjs/intl-localematcher` (dep estable y testeada) o usar `Negotiator` con whitelist. Tests integration cubren los casos. |
| Cookie `eventflow_locale` colisiona con cookie de sesión auth de US-108. | Confusión de naming o flags inconsistentes. | Naming explícito (`eventflow_locale` vs cookie de sesión a definir en US-108); flags claramente distintos (no HTTP-only vs HTTP-only); documentar en `web/README.md` § cookies. |
| `react/jsx-no-literals` produce falsos positivos masivos. | Bloquea desarrollo; tentación de desactivar la regla. | Configurar allowList mínima (`['·', '/', '&', '—']` + permitir números puros via `noStrings: false` para Children numéricos). Si insoportable, sustituir por `eslint-plugin-formatjs/no-literal-string-in-jsx`. La decisión final del set vive en el PR. |
| `[ES-LATAM]` placeholders quedan en producción si una feature olvida traducir. | UX degradada en `es-ES`/`pt`/`en`. | `getMessageFallback` en prod devuelve `es-LATAM` (no `[ES-LATAM]`); en dev se loguea warn. Documentar convención en `web/README.md`. Script de cobertura i18n diferido como follow-up. |
| `Intl.NumberFormat` con currency inválida lanza `RangeError`. | `<Money>` crashea en runtime. | `try/catch` que cae a formato genérico `${amount} ${currency}` + warn en dev (cubierto en EC-05). |
| `httpClient` no existe aún (US-106 pendiente). | `attachLocaleHeader` queda sin cablear. | US-104 entrega la utilidad lista, testeada unitariamente y exportada en `shared/i18n/index.ts`. US-106 la cableará. Documentar el handoff en `web/README.md` § "HTTP client" cuando llegue. |
| `Documentation Alignment Required` se olvida post-merge. | Doc 15/§49/§17/Doc 22 quedan inconsistentes. | Tarea de housekeeping explícita en `tasks.md` del backlog PB-P0-012 (redactar ADR-FE-007, amender Doc 15 §17/§15, documentar mapeo `es-419`). |

---

## 18. Implementation Guidance for Coding Agents

### Files / folders likely impacted

* `web/src/shared/i18n/config.ts`
* `web/src/shared/i18n/request.ts`
* `web/src/shared/i18n/format.ts`
* `web/src/shared/i18n/Money.tsx`
* `web/src/shared/i18n/LocaleSwitcher.tsx`
* `web/src/shared/i18n/useLocale.ts`
* `web/src/shared/i18n/attachLocaleHeader.ts`
* `web/src/shared/i18n/index.ts`
* `web/src/middleware.ts` (nuevo en US-104)
* `web/src/app/layout.tsx` (modificado: monta `<NextIntlClientProvider>` + `<html lang>` dinámico)
* `web/src/messages/<locale>/{common,navigation,errors,validation}.json` (4 locales × 4 áreas = 16 archivos)
* `web/.env.local.example` (normalizar `NEXT_PUBLIC_DEFAULT_LOCALE`, `NEXT_PUBLIC_SUPPORTED_LOCALES`)
* `web/.eslintrc.cjs` o `web/eslint.config.mjs` (agregar regla anti-hardcoded)
* `web/src/tests/unit/i18n/*.test.ts(x)`
* `web/src/tests/integration/middleware/locale.test.ts`
* `web/src/tests/e2e/i18n.{switcher,detection,fallback}.spec.ts`
* `web/README.md` (sección "i18n")

### Recommended order of implementation

1. Crear `src/shared/i18n/config.ts` con `locales`, `defaultLocale`, `cookieName`, `localeLabels` como `as const`.
2. Crear `src/shared/i18n/format.ts` con helpers `Intl.*` y mapeo `es-LATAM → es-419`.
3. Crear `src/shared/i18n/request.ts` con `getRequestConfig` (carga `messages`, `getMessageFallback`, formateadores).
4. Crear estructura de catálogos `src/messages/<locale>/{common,navigation,errors,validation}.json` con `es-LATAM` 100% completo y placeholders en los otros.
5. Crear `src/shared/i18n/useLocale.ts` (hook cliente).
6. Crear `src/shared/i18n/attachLocaleHeader.ts` (cliente + server).
7. Crear `src/shared/i18n/Money.tsx`.
8. Crear `src/shared/i18n/LocaleSwitcher.tsx`.
9. Crear `src/shared/i18n/index.ts` (barrel).
10. Crear `src/middleware.ts` con `localeMiddleware` (con matcher) y export componible.
11. Modificar `src/app/layout.tsx`: leer locale en server, montar `<NextIntlClientProvider>`, `<html lang>` dinámico, `hreflang` placeholder.
12. Normalizar `.env.local.example` (agregar `NEXT_PUBLIC_DEFAULT_LOCALE` y `NEXT_PUBLIC_SUPPORTED_LOCALES`).
13. Activar lint anti-hardcoded strings (`react/jsx-no-literals` con allowList o equivalente).
14. Escribir tests unit + integration + component.
15. Escribir 3 E2E Playwright.
16. Validar pipeline canónico Doc 21 §9.2 en local.
17. Actualizar `web/README.md` § "i18n".

### Decisions that must not be reopened

* 4 locales obligatorios (`es-LATAM`, `es-ES`, `pt`, `en`); default `es-LATAM`.
* Detección por cookie + `Accept-Language` sin prefijo URL (Doc 15 §17/§31.2).
* Cookie `eventflow_locale` no HTTP-only, `SameSite=Lax`, `Secure` en prod, sin firma, sin PII.
* npm como gestor canónico (heredado de US-103).
* ADR-FE-003 invariante: frontend UX-only.
* Sin Server Actions, sin API Routes BFF, sin `next.config.i18n` legacy.
* Persistencia `users.language_code` queda fuera (User Profile story).
* Currency display sin conversión automática (Doc 15 §32).
* Catálogos transversales en US-104; traducciones por feature en sus historias.

### What must not be implemented

* Traducciones completas por feature (auth/event/vendor/etc.).
* Persistencia `users.language_code` en backend.
* Selector de idioma del evento.
* Currency lock visible (selector disabled + tooltip).
* SEO localizado por URL (`/en/...`, `/pt/...`).
* Route groups, `roleGuardMiddleware`, layouts por rol.
* `QueryClient`, `<QueryProvider>`, MSW handlers.
* `httpClient` real (solo se prepara `attachLocaleHeader`).
* Sentry / observability cliente full.
* `next.config.i18n` legacy de Pages Router.

### Assumptions to preserve

* US-103 está mergeada (proyecto Next.js + `next-intl` instalado + carpetas `shared/i18n/` y `messages/` vacías).
* Node 20 LTS en local y CI.
* Backend acepta `Accept-Language` por contrato; si no, degrada a `es-LATAM`.
* Cookie de sesión auth (US-108) será HTTP-only y distinta de `eventflow_locale`.

---

## 19. Task Generation Notes

### Suggested Task Groups

1. **FE-104-CORE** — `config.ts`, `format.ts`, `request.ts`, `useLocale.ts`, `attachLocaleHeader.ts`, `index.ts`.
2. **FE-104-CATALOGS** — Estructura `messages/<locale>/{common,navigation,errors,validation}.json`; `es-LATAM` 100%; otros 3 con placeholders.
3. **FE-104-COMPONENTS** — `Money.tsx`, `LocaleSwitcher.tsx`.
4. **FE-104-MIDDLEWARE** — `src/middleware.ts` con `localeMiddleware` componible.
5. **FE-104-LAYOUT** — Modificar `src/app/layout.tsx`: `<NextIntlClientProvider>` + `<html lang>` dinámico + `hreflang` placeholder.
6. **FE-104-LINT** — Activar regla anti-hardcoded en ESLint con allowList mínima.
7. **FE-104-ENV** — Normalizar `.env.local.example` con `NEXT_PUBLIC_DEFAULT_LOCALE` y `NEXT_PUBLIC_SUPPORTED_LOCALES`.
8. **FE-104-TESTS-UNIT** — Unit + component tests (config, request, format, attachLocaleHeader, Money, LocaleSwitcher).
9. **FE-104-TESTS-INTEGRATION** — Middleware integration tests.
10. **FE-104-TESTS-E2E** — 3 E2E Playwright (switcher, detección, fallback).
11. **FE-104-DOCS** — `web/README.md` § "i18n" + nota de mapeo `es-419`.
12. **FE-104-HOUSEKEEPING** (post-merge, opcional) — Redactar ADR-FE-007 en Doc 22; amender Doc 15 §17/§15.

### Required QA Tasks

* Validar `npm ci && npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e` exit 0.
* Validar lint anti-hardcoded activo con `--max-warnings=0`.
* Validar coverage mínima de `shared/i18n/` (unit + component).
* Validar `<LocaleSwitcher>` accesible: navegación por teclado, `aria-label`, `aria-current`.

### Required Security Tasks

* Confirmar SEC-01..SEC-06 cumplidos: cookie técnica vs auth, sin secrets en catálogos, XSS prevention con JSON estático, redacción de logs.
* `npm audit --omit=dev` High/Critical bloqueante.

### Required Seed/Demo Tasks

No aplica directamente. Coordinación informativa con EPIC-SEED-001 sobre NFR-I18N-006 (seed multi-idioma).

### Required Documentation Tasks

* `web/README.md` § "i18n": convenciones, ICU MessageFormat, no hardcoded strings, fallback en runtime, cómo agregar locales, mapeo `es-LATAM → es-419`.
* Housekeeping post-merge: redactar ADR-FE-007 en Doc 22, amender Doc 15 §17/§15.

### Dependencies between Tasks

* `FE-104-CORE` → `FE-104-CATALOGS` (los tests de request leen catálogos) y `FE-104-COMPONENTS`.
* `FE-104-MIDDLEWARE` puede ejecutarse en paralelo con `FE-104-CORE`/`FE-104-COMPONENTS`.
* `FE-104-LAYOUT` requiere `FE-104-CORE` (consumes `getRequestConfig`).
* `FE-104-LINT` puede ejecutarse antes de los componentes para forzar la disciplina desde el día 1.
* `FE-104-TESTS-*` corren al final, antes de `FE-104-DOCS`.
* `FE-104-HOUSEKEEPING` es post-merge (no bloquea el PR de implementación).

### Consolidated `tasks.md` for PB-P0-012?

Sí. Cuando US-105 también genere su technical spec y development tasks, recomendado consolidar `management/development-tasks/P0/PB-P0-012/tasks.md` con el orden end-to-end del bootstrap frontend: tasks US-103 → US-104 → US-105.

---

## 20. Technical Spec Readiness

| Check                                                  | Status |
| ------------------------------------------------------ | ------ |
| User Story approved or explicitly allowed for draft spec | Pass   |
| Product Backlog mapping found                          | Pass   |
| Decision Resolution reviewed if present                | N/A    |
| Scope clear                                            | Pass   |
| Architecture alignment clear                           | Pass   |
| API impact clear                                       | Pass (solo header outbound preparado) |
| DB impact clear                                        | N/A    |
| AI impact clear                                        | Pass (habilitación de cadena `Accept-Language`) |
| Security impact clear                                  | Pass   |
| Testing strategy clear                                 | Pass   |
| Ready for Development Task Breakdown                   | Yes    |

---

## 21. Final Recommendation

**Ready for Task Breakdown**.

US-104 entrega un scaffolding funcional de i18n con decisiones cerradas (Doc 15 §17/§31/§32, FR-I18N-*, NFR-I18N-*, ADR-FE-001/003/007), 12 Acceptance Criteria atómicos y testables, boundary explícito con 5 historias adyacentes (US-103 heredada, US-105/US-106/US-107 owners de áreas diferidas, User Profile story para persistencia backend), tests unit + integration + component + 3 E2E Playwright, SEC rules claras y propagación de `Accept-Language` al backend preparada para US-106. Sin gaps bloqueantes. Cuatro `Documentation Alignment Required` no bloqueantes (ADR-FE-007 por redactar, Doc 15 §17, mapeo `es-419`, Doc 15 §15 ubicación middleware) ya enmarcados como housekeeping post-merge. Lista para invocar `eventflow-user-story-to-development-tasks`.
