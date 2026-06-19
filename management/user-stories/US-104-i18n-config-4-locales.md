# 🧾 User Story: Configurar `next-intl` con 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`), detección por cookie + `Accept-Language`, locale switcher y catálogos base por área

## 🆔 Metadata

| Field                       | Value                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------- |
| ID                          | US-104                                                                                 |
| Epic                        | EPIC-FE-001 — Frontend Next.js Application Foundation                                  |
| Backlog Item                | PB-P0-012 — Frontend Next.js Bootstrap & i18n                                          |
| Feature                     | i18n setup — `next-intl` 4 locales + cookie detection + locale switcher                 |
| Module / Domain             | Platform / FE / I18N                                                                   |
| User Role                   | System                                                                                 |
| Priority                    | Must Have (P0)                                                                         |
| Status                      | Approved                                                                               |
| Owner                       | Tech Lead / Frontend Lead                                                              |
| Approved By                 | PO/BA Review (Approved with Minor Notes)                                               |
| Approval Date               | 2026-06-19                                                                             |
| Ready for Development Tasks | Yes                                                                                    |
| Sprint / Milestone          | MVP                                                                                    |
| Created Date                | 2026-06-09                                                                             |
| Last Updated                | 2026-06-19 (PO/BA approval gate)                                                       |

---

## 🎯 User Story

**As the** sistema EventFlow
**I want** configurar `next-intl` 3.x sobre el bootstrap de Next.js (US-103) con los 4 locales soportados (`es-LATAM` por defecto, `es-ES`, `pt`, `en`), detección de locale por cookie `eventflow_locale` + header `Accept-Language` (sin prefijo de URL en MVP), middleware de locale, `<IntlProvider>` en el root layout, locale switcher cliente y catálogos base por área (`common`, `navigation`, `errors`, `validation`)
**So that** todas las historias subsiguientes (auth, eventos, vendors, quotes, IA, admin) consuman traducciones vía `t('clave')` sin strings hardcoded, respeten NFR-I18N-001..006 y propaguen el locale activo al backend para los flujos IA (Doc 15 §31.4, FR-I18N-005, BR-AI-011).

---

## 🧠 Business Context

### Context Summary

US-103 dejó instaladas las dependencias frontend (incluida `next-intl 3.x`) y la carpeta `shared/i18n/` + `messages/` vacías. Esta historia entrega la **configuración funcional de i18n**: middleware Next.js que detecta y persiste el locale (cookie + `Accept-Language`, sin prefijo URL en MVP — Doc 15 §17/§31.2), `<IntlProvider>` en el root layout, locale switcher cliente, catálogos base segmentados por área transversal (`common`, `navigation`, `errors`, `validation`), helpers de fecha/número/currency display locale-aware (Doc 15 §31.3/§32), y propagación del locale activo al backend vía header `Accept-Language` para los requests IA (Doc 15 §31.4 / FR-I18N-005).

US-104 cierra el **scaffolding de i18n** para que EPIC-FE-001 (US-105 route groups, US-106 TanStack Query + MSW, US-107 layouts) y todas las historias de producto (US-AUTH-*, US-EVENT-*, US-VENDOR-*, US-AI-*) consuman `t('clave')` desde el día 1 sin pretender traducir hoy toda la UI: cada feature aporta sus propias claves de catálogo cuando se implemente.

Sin US-104, las historias frontend posteriores chocarían con strings hardcoded, no podrían cumplir NFR-I18N-001 (4 idiomas soportados), no podrían enviar `Accept-Language` al backend para los flujos IA, y no podrían cumplir la regla "prohibido hardcodear strings en componentes" (Doc 15 §31.3, BR-AI-011).

### Related Domain Concepts

* **next-intl 3.x** (Doc 15 §7/§31.1) con catálogos JSON en `src/messages/` y carga lazy por locale activo.
* **Locales soportados MVP** (Doc 15 §31.1, FR-I18N-001, NFR-I18N-001): `es-LATAM` (default), `es-ES`, `pt`, `en`. El inglés es **no negociable** (Doc 2 decisión #15).
* **Detección por cookie + header sin prefijo URL** (Doc 15 §17/§31.2, ADR-FE-007 — pendiente de formalizar en Doc 22).
* **Convenciones de claves** (Doc 15 §31.3): jerárquicas (`events.create.title`, `errors.validation.required`), ICU MessageFormat para plurales/género, sin strings hardcoded.
* **Locale ↔ IA** (Doc 15 §31.4, FR-I18N-005, BR-AI-011): el frontend envía `Accept-Language` en requests IA; el backend genera contenido en ese locale.
* **Currency display locale-aware** (Doc 15 §32): `Intl.NumberFormat(locale, { style: 'currency', currency })`, sin conversión automática. US-104 entrega el helper base `<Money>` mínimo, no la UX completa.

### PO/BA Decisions Applied

| Decision                                                | Resolution                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope de US-104                                          | US-104 entrega exclusivamente: (a) configuración funcional `next-intl 3.x` (config + `i18n.ts` request handler); (b) `middleware.ts` de detección de locale por cookie + `Accept-Language`; (c) `<IntlProvider>` en root layout; (d) locale switcher cliente; (e) catálogos base por área (`common`, `navigation`, `errors`, `validation`); (f) helpers `formatDate`, `formatNumber`, `formatCurrency`, `<Money>` mínimo; (g) propagación de `Accept-Language` al backend vía interceptor del `httpClient` (cuando exista; si US-106 aún no lo entrega, US-104 deja la utilidad lista para ser inyectada). |
| Boundary con US-103 / US-105 / US-106 / US-107            | US-103 dejó instalado `next-intl` + carpetas vacías; US-104 lo configura funcionalmente. Route groups por rol → **US-105**. `QueryClient` y `httpClient` → **US-106** (US-104 deja preparado el inyector de `Accept-Language` para ese client; si llega antes, US-104 lo inyecta; si llega después, US-106 lo cablea citando esta historia). Layouts por rol → **US-107**.                |
| Locales y default                                         | Cuatro locales obligatorios (Doc 15 §31.1, FR-I18N-001, NFR-I18N-001): `es-LATAM` (default), `es-ES`, `pt`, `en`. Tag BCP-47 efectivo para `es-LATAM` resuelto como `es-419` para `Intl.*` cuando aplique (Doc 15 §31.3 implica `Intl.DateTimeFormat`/`NumberFormat` locale-aware).                          |
| Estrategia de detección                                   | Cookie `eventflow_locale` (preferida) → fallback a `Accept-Language` (negociación con lista soportada) → fallback a `es-LATAM`. Sin prefijo de URL en MVP (Doc 15 §17/§31.2). El locale switcher actualiza la cookie y dispara reload del provider.                                                          |
| Persistencia de locale por usuario                        | El locale **operativo** vive en cookie cliente (NFR-I18N-002 cobertura UX). La persistencia en el perfil de usuario (`users.language_code`, FR-I18N-002, FR-USER-003) la entrega la historia de "User profile / Preferences" (out of scope aquí). US-104 deja un hook `useLocale()` y el switcher listos para que esa historia sincronice cookie ↔ backend.                |
| Locale del evento                                         | El idioma del evento (`events.language_code`, FR-I18N-003/005, NFR-I18N-003, BR-AI-011) **NO se decide aquí**: vive en la historia de creación de evento y en las historias IA. US-104 solo expone la utilidad `getActiveLocale()` y la propagación de `Accept-Language` que esas historias consumirán.       |
| Propagación al backend                                    | Header `Accept-Language: <locale>` para **todos** los requests REST (Doc 15 §31.4, Doc 15 §26 `httpClient`). US-104 entrega la función `attachLocaleHeader(config)` consumible por interceptors. Si `httpClient` aún no existe (US-106 pendiente), US-104 lo deja exportado como utilidad lista; US-106 lo cableará.                |
| Lint anti-hardcode                                        | Activar regla ESLint que prohíba strings literales en JSX (alineado a Doc 15 §31.3 "prohibido hardcodear strings"). Acordado: `react/jsx-no-literals` con allowList mínima (símbolos, números, espacios, marcas) y `eslint-plugin-formatjs/no-literal-string-in-jsx` solo si el primero genera ruido excesivo. Decisión final del set exacto vive en el PR; el principio (no hardcoded strings) es no negociable. |
| Catálogos base por área                                    | US-104 entrega únicamente catálogos **transversales**: `common.json`, `navigation.json`, `errors.json` (mensajes Zod genéricos + envelope errors), `validation.json`. Cada feature (auth, events, vendors, etc.) aporta su catálogo cuando se implemente. Default `es-LATAM` 100% completo; los otros 3 locales pueden tener claves vacías o fallback a `es-LATAM` con marca `[ES-LATAM]` para detectar gaps en QA.                 |
| Estrategia de fallback de mensajes                        | `next-intl` con `getMessageFallback` que devuelve la clave anotada (`[locale][key]`) en desarrollo y la traducción `es-LATAM` en producción. Loguear claves faltantes en dev console.                                                                                                                       |
| Plurales / género                                          | ICU MessageFormat (Doc 15 §31.3). Documentado en `web/README.md` con ejemplo.                                                                                                                                                                                                                              |
| Locale switcher UI                                         | Componente `<LocaleSwitcher>` Client Component minimalista (`Headless UI`/`Radix UI` para a11y), accesible por teclado, con `aria-label` i18n y opción visible en `PublicLayout` / `AuthLayout` / `AppLayout` (las layouts las arma US-107; US-104 entrega el componente standalone listo para insertarse).   |
| Currency display                                           | US-104 entrega solo `<Money amount currency />` mínimo (Doc 15 §32.2): usa `Intl.NumberFormat(locale, { style: 'currency', currency })`. La UX de currency lock visible (Doc 15 §32.3) vive en la historia de creación de evento.                                                                            |
| Fechas y números                                           | Helpers `formatDate(date, locale, options?)`, `formatNumber(value, locale, options?)`, `formatCurrency(amount, currency, locale)`, todos delegando en `Intl.*` (Doc 15 §31.3).                                                                                                                              |
| Env vars                                                   | Confirmar en `.env.local.example` (declaradas en US-103): `NEXT_PUBLIC_DEFAULT_LOCALE=es-LATAM`, `NEXT_PUBLIC_SUPPORTED_LOCALES=es-LATAM,es-ES,pt,en` (Doc 15 §47.1700). Si US-103 las declaró con otro nombre, US-104 las normaliza a estos.                                                                |
| Cookie técnica                                             | `eventflow_locale`, `path=/`, `Max-Age=31536000` (1 año), `SameSite=Lax`, **no HTTP-only** (la lee el cliente para el switcher), **no Secure flag forzado en dev** (sí en producción). Sin PII. Sin firma (no es cookie de sesión).                                                                          |
| SEO localizado                                             | Out of scope MVP (Doc 15 §31.5): no se construye `/en/...`, `/pt/...`. US-104 prepara `hreflang` placeholder en el `<head>` del root layout solo cuando el archivo `metadata` lo permita sin romper Doc 21 SEO baseline.                                                                                    |
| Tests E2E                                                  | Playwright: (a) cambiar idioma vía switcher persiste cookie y re-renderiza la página en el nuevo locale; (b) sin cookie y con `Accept-Language: pt-PT`, la primera visita renderiza en `pt`; (c) locale no soportado cae a `es-LATAM`. Sin tests de IA (esa cadena vive en historias IA).                       |

### Assumptions

* US-103 mergeada: `next-intl` instalado, `src/shared/i18n/` y `src/messages/` vacíos, `.env.local.example` con `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY`.
* Node 20 LTS y pipeline canónico Doc 21 §9.2 verde (heredado de US-103).
* El backend acepta `Accept-Language` con los 4 locales (alineado a FR-I18N-005/Doc 14); si aún no lo cumple, el frontend lo envía y el backend degrada a `es-LATAM`. Sin bloqueo.
* La cookie de sesión auth real (`HTTP-only Secure SameSite=Lax`) es responsabilidad de SEC stories (US-108). La cookie `eventflow_locale` es de **preferencia UX**, no de autenticación, por eso no requiere HTTP-only.

### Dependencies

* `US-103 — Bootstrap Next.js + dependencias` (mergeada). Sin esta, no hay proyecto donde configurar `next-intl`.
* `Doc 15 — Frontend Architecture Design` §17 (locale strategy MVP), §31 (i18n completo), §32 (currency display), §47 (env vars), §49 (ADR-FE-007).
* `Doc 14 — Backend Technical Design` (consumo de `Accept-Language` en endpoints IA; no bloqueante).
* `Doc 22 — ADRs` ADR-FE-001 (Next.js + App Router), ADR-FE-007 (i18n, pendiente de formalizar — Documentation Alignment).
* `Doc 9 — FRD` FR-I18N-001..006, FR-USER-003, FR-EVENT-014 (referencia).
* `Doc 10 — NFRs` NFR-I18N-001..006.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-I18N-001 (4 idiomas), FR-I18N-002 (cambio inmediato en UI — cobertura UX vía switcher; persistencia backend en User Profile story), FR-I18N-004 (traducción de labels/errores/notificaciones — habilita la infra), FR-I18N-005 (locale en salida IA — habilita propagación `Accept-Language`), FR-I18N-006 (`es-LATAM` por defecto) |
| Use Case(s)            | UC-I18N-001 (selector de idioma) — cobertura UX del switcher; UC-I18N-002 (idioma del evento) — habilita la propagación, pero la UX vive en historia de creación de evento                       |
| Business Rule(s)       | BR-USER-006 (idioma preferido cambia dinámicamente — cookie UX), BR-AI-011 (idioma propagado a IA — header `Accept-Language`), BR-I18N-001 (4 idiomas, inglés obligatorio)                       |
| Permission Rule(s)     | No aplica runtime — el frontend es UX-only (ADR-FE-003). Cualquier usuario (incluido anonymous) puede cambiar de locale                                                                          |
| Data Entity / Entities | Cookie cliente `eventflow_locale` (no persistencia DB en esta historia). Future: `users.language_code` (FR-USER-003) via historia User Profile                                                    |
| API Endpoint(s)        | No introduce endpoints. Modifica el comportamiento de **todos** los requests REST agregando header `Accept-Language: <locale>` (Doc 15 §26.7)                                                     |
| NFR Reference(s)       | NFR-I18N-001 (4 idiomas), NFR-I18N-002 (persistencia preferred locale — cobertura cookie + handoff a User Profile story), NFR-I18N-003 (idioma del evento → IA — habilita propagación), NFR-I18N-006 (seed multi-idioma — no aplica directo), NFR-A11Y-* (switcher accesible WCAG 2.1 AA), NFR-OBS-001 (logging de claves faltantes en dev)  |
| Related ADR(s)         | ADR-ARCH-001, ADR-FE-001, ADR-FE-003, ADR-FE-007 (next-intl + cookie/header, no URL prefix — referenciada en Doc 15 §49, pendiente de redactar en Doc 22)                                        |
| Related Document(s)    | `/docs/15-Frontend-Architecture-Design.md` §17/§26.7/§31/§32/§47/§49, `/docs/9-Functional-Requirements-Document.md` FR-I18N-*/FR-USER-003, `/docs/10-Non-Functional-Requirements.md` NFR-I18N-001..006, `/docs/14-Backend-Technical-Design.md` (Accept-Language), `/docs/20-Testing-Strategy.md`, `/docs/22-Architecture-Decision-Records.md` |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: **In Scope**
* MVP Relevance: **Must Have (P0)**
* Delivery Type: **Technical foundation + cross-cutting capability**
* Scope Boundary: **`next-intl` config + middleware de locale + `<IntlProvider>` + locale switcher + catálogos base transversales + helpers `formatDate/Number/Currency` + `<Money>` mínimo + propagación `Accept-Language` + tests E2E de detección y switcher**

### Explicitly Out of Scope

* **Persistencia de `users.language_code` en backend** (FR-I18N-002, FR-USER-003, NFR-I18N-002) → historia **User Profile / Preferences**. US-104 deja el switcher listo para que esa historia sincronice cookie ↔ API.
* **`events.language_code`** y UX de selección de idioma del evento (FR-I18N-003, NFR-I18N-003) → **historia de creación de evento**. US-104 expone helpers; la UX vive allá.
* **Currency lock visible** (Doc 15 §32.3 mensajes UX, selector disabled tras creación) → **historia de creación/edición de evento**. US-104 entrega solo `<Money>` mínimo.
* **Traducciones completas de UI por feature** (auth screens, event wizard, vendor directory, etc.) → cada historia de feature aporta su catálogo (`features/<feature>/i18n/<locale>.json` o sección en `messages/<locale>.json`).
* **SEO localizado** (`/en/...`, `/pt/...`, sitemaps multi-locale, `hreflang` real) → **Future** (Doc 15 §31.5, ADR-FE-005 diferida).
* **Route groups por rol** → **US-105**.
* **`QueryClient` y MSW handlers** → **US-106**. US-104 prepara `attachLocaleHeader` consumible por el `httpClient`; si US-106 ya está mergeada, US-104 lo cablea; si no, lo exporta listo.
* **Layouts por rol y navegación** → **US-107**.
* **Catálogos completos para los 4 locales en US-104**: solo `es-LATAM` está 100% poblado en las áreas transversales; `es-ES`, `pt`, `en` pueden tener gaps detectables vía fallback `[ES-LATAM]`. La completitud total se logra incrementalmente por feature.
* **Notificaciones reales i18n** (push/email) → no aplica MVP (sin push) y notificaciones in-app viven en historia de notificaciones.
* **Switcher de currency** (Doc 15 §32) → historia de evento.
* **Server Actions, API Routes BFF** → prohibidos (Doc 15 §6, ADR-FE-002/003).

### Scope Notes

* Default locale **inmutable** en MVP: `es-LATAM`. Cambiar el default requiere ADR.
* La cookie `eventflow_locale` **no es de sesión**: no entra en conflicto con la cookie HTTP-only de auth de US-108.
* Cualquier string en JSX nuevo introducido por esta historia (en componentes propios) usa `t('clave')`. Strings de configuración/comentarios/logs internos quedan en inglés.
* El middleware `middleware.ts` introducido aquí solo gestiona **locale**. US-105 lo extenderá con guardas UX por rol; ambos co-existen en el mismo archivo con responsabilidades claramente separadas (función `localeMiddleware` + función `roleGuardMiddleware`, ambas componibles).
* `<IntlProvider>` se monta en el **root layout** (`src/app/layout.tsx`) creado parcialmente en US-103. US-104 actualiza este layout sin invadir el espacio de US-107 (layouts por rol).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: `next-intl` configurado funcionalmente con 4 locales

**Given** US-103 mergeada con `next-intl 3.x` instalado
**When** se inspecciona `web/src/shared/i18n/`
**Then** existen y son válidos:

| Archivo | Contenido esperado |
| --- | --- |
| `src/shared/i18n/config.ts` | Exporta `locales = ['es-LATAM', 'es-ES', 'pt', 'en'] as const`, `defaultLocale = 'es-LATAM' as const`, `cookieName = 'eventflow_locale'`, `localeLabels` (label nativo por locale) |
| `src/shared/i18n/request.ts` | `getRequestConfig` de `next-intl/server` que carga `messages` desde `messages/<locale>/*.json`, configura `getMessageFallback` (clave anotada en dev, `es-LATAM` en prod), formateadores `Intl.*` |
| `src/shared/i18n/format.ts` | Exporta `formatDate(date, locale, options?)`, `formatNumber(value, locale, options?)`, `formatCurrency(amount, currency, locale)` delegando en `Intl.DateTimeFormat`/`NumberFormat` |
| `src/shared/i18n/Money.tsx` | Componente `<Money amount currency />` Client Component mínimo que usa `formatCurrency` y el locale activo (Doc 15 §32.2) |
| `src/shared/i18n/LocaleSwitcher.tsx` | Client Component accesible (WCAG 2.1 AA), `aria-label="navigation.localeSwitcher.label"`, persiste cookie y dispara re-render |
| `src/shared/i18n/useLocale.ts` | Hook que devuelve `{ locale, supportedLocales, setLocale(next) }` |
| `src/shared/i18n/attachLocaleHeader.ts` | Utilidad que devuelve `{ 'Accept-Language': <locale> }` para inyectarse en interceptors del `httpClient` |

---

### AC-02: Middleware de locale operativo

**Given** la app construida con US-104
**When** se inspecciona `web/src/middleware.ts`
**Then** existe un `middleware.ts` que:

1. Lee la cookie `eventflow_locale`; si su valor está en `locales`, lo usa.
2. Si la cookie falta o tiene valor inválido, negocia el header `Accept-Language` contra `locales` (best match BCP-47).
3. Si no hay match, usa `defaultLocale = 'es-LATAM'`.
4. Propaga el locale resuelto al request via `NextResponse.headers.set('x-locale', <locale>)` (consumible por el server renderer / `getRequestConfig`).
5. **No** redirige por prefijo URL (sin `/[locale]`).
6. **No** maneja autorización por rol (eso es US-105) — la función está separada en módulos componibles dentro de `middleware.ts`.
**And** `matcher` excluye `/_next/*`, `/api/*` (no aplican aún), `/static/*`, `favicon`.

---

### AC-03: `<IntlProvider>` en root layout

**Given** `src/app/layout.tsx` creado parcialmente en US-103
**When** se inspecciona el layout
**Then** monta `NextIntlClientProvider` (de `next-intl`) con `locale` y `messages` resueltos en server side, sin romper Server Components por defecto
**And** declara `<html lang={locale}>` dinámico
**And** el `<head>` incluye un `<link rel="alternate" hrefLang="x-default" href="/" />` placeholder (sin generar otros `hreflang` reales — eso es Future).

---

### AC-04: Catálogos base por área transversal

**Given** `web/src/messages/`
**When** se inspecciona la estructura
**Then** existen:

```text
src/messages/
├── es-LATAM/
│   ├── common.json
│   ├── navigation.json
│   ├── errors.json
│   └── validation.json
├── es-ES/
│   └── (mismas claves; valores pueden caer a fallback `[ES-LATAM]`)
├── pt/
│   └── (idem)
└── en/
    └── (idem)
```

**And** `es-LATAM` está 100% completo para esas 4 áreas
**And** los otros 3 locales contienen al menos las claves declaradas (valores `""` o placeholder `[ES-LATAM]` para detección de gaps; el fallback resuelve en runtime)
**And** las claves cubren al menos: saludo/títulos genéricos (`common.appName`, `common.loading`, `common.error`, `common.retry`, `common.save`, `common.cancel`); navegación base (`navigation.login`, `navigation.register`, `navigation.logout`, `navigation.localeSwitcher.label`); envelope de errores backend (`errors.envelope.<code>` para los códigos Doc 14/16 base); mensajes Zod (`validation.required`, `validation.email`, `validation.minLength`, `validation.maxLength`, `validation.pattern`).

---

### AC-05: Locale switcher accesible y funcional

**Given** la app corriendo
**When** el usuario abre la página raíz `/` y interactúa con `<LocaleSwitcher>`
**Then** puede seleccionar cualquiera de los 4 locales por teclado (Tab, flechas, Enter)
**And** al confirmar:

* La cookie `eventflow_locale` se persiste con valor del nuevo locale, `path=/`, `Max-Age=31536000`, `SameSite=Lax`, `Secure` solo en producción.
* La página re-renderiza (router refresh) con los textos en el nuevo locale.
* El `<html lang>` se actualiza dinámicamente.

**And** el switcher cumple WCAG 2.1 AA: `aria-label` i18n, focus visible, contraste, role correcto.

---

### AC-06: Detección por `Accept-Language` cuando la cookie falta

**Given** un usuario que llega por primera vez sin cookie `eventflow_locale`
**When** envía `Accept-Language: pt-BR,pt;q=0.9,en;q=0.5`
**Then** el middleware resuelve `pt` (best match en `locales`)
**And** la página renderiza en portugués
**And** **no** se setea cookie automáticamente (la cookie se persiste solo cuando el usuario usa el switcher explícitamente).

---

### AC-07: Fallback a `es-LATAM` cuando no hay match

**Given** un usuario sin cookie y con `Accept-Language: fr,de;q=0.9` (locales no soportados)
**When** entra a la app
**Then** el middleware resuelve `es-LATAM`
**And** la página renderiza en español LATAM.

---

### AC-08: Propagación de `Accept-Language` al backend

**Given** la utilidad `attachLocaleHeader` exportada por US-104
**When** una historia que consume el `httpClient` (US-106+) inyecta esta utilidad como interceptor
**Then** **todos** los requests REST salen con `Accept-Language: <locale-activo>`
**And** la utilidad acepta tanto contexto cliente (lee cookie / hook) como server (lee del request) y devuelve el header correcto.

**Nota de boundary**: si US-106 (httpClient) aún no está mergeada al momento de cerrar US-104, el cableado del interceptor queda como TODO documentado en US-106 (con referencia explícita a `attachLocaleHeader`). US-104 entrega la utilidad lista, testeada unitariamente y exportada vía `shared/i18n/index.ts`.

---

### AC-09: Helpers `formatDate`, `formatNumber`, `formatCurrency` y `<Money>`

**Given** los helpers exportados por `shared/i18n/format.ts` y `<Money>`
**When** se ejecutan unit tests con distintos locales y valores
**Then**:

| Caso | Input | Output esperado |
| --- | --- | --- |
| `formatDate(new Date('2026-06-15'), 'es-LATAM')` | — | `'15 jun 2026'` o equivalente locale-aware (sin asserts brittle sobre puntuación; verificar `Intl` invocado con locale correcto) |
| `formatNumber(1234.5, 'pt')` | — | Formato con separadores decimales pt (coma) |
| `formatCurrency(2500, 'MXN', 'es-LATAM')` | — | Cadena con símbolo `$` y código `MXN` según locale |
| `<Money amount={1000} currency="USD" />` con locale activo `en` | — | `$1,000.00` (verificar invocación de `Intl.NumberFormat`) |

**And** `<Money>` no realiza ninguna lógica de conversión (Doc 15 §32.2).

---

### AC-10: Lint anti-hardcoded strings activo en el proyecto

**Given** la configuración ESLint del repo
**When** un dev escribe un componente con un string literal en JSX (`<button>Submit</button>`)
**Then** ESLint reporta error (regla `react/jsx-no-literals` o equivalente acordada en PR)
**And** la regla tiene allowList mínima para símbolos no traducibles (`·`, `/`, números puros, marca registrada).

---

### AC-11: Tests E2E de i18n

**Given** Playwright configurado (US-103)
**When** se ejecuta `npm run test:e2e`
**Then** pasan:

* `tests/e2e/i18n.switcher.spec.ts`: cambiar idioma vía switcher persiste cookie y re-renderiza la página en el nuevo locale.
* `tests/e2e/i18n.detection.spec.ts`: sin cookie y con `Accept-Language: pt-PT`, la primera visita renderiza en `pt`.
* `tests/e2e/i18n.fallback.spec.ts`: locale no soportado cae a `es-LATAM`.

---

### AC-12: Pipeline canónico verde y sin artefactos fuera de scope

**Given** el PR de US-104
**When** corren `npm ci && npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e`
**Then** todos los comandos terminan con exit 0
**And** el PR NO contiene: catálogos completos por feature (auth/event/vendor/etc.), route groups por rol, `QueryClient`/`QueryProvider`/MSW handlers, layouts por rol, lógica de currency lock visible, persistencia `users.language_code` en backend, Server Actions, API Routes BFF, `next.config` con `i18n` legacy de Pages Router (next-intl con App Router NO usa `next.config.i18n`).

---

## ⚠️ Edge Cases

### EC-01: Cookie con valor adulterado

**Given** un usuario con cookie `eventflow_locale=zh-CN` (no soportado, manipulado)
**When** el middleware procesa el request
**Then** descarta la cookie inválida y cae a `Accept-Language` → `es-LATAM`.

#### Handling

* Validar contra `locales` (whitelist) en el middleware antes de aceptar.
* Loguear (server side, sin PII) `locale.invalid_cookie` para observabilidad básica.

---

### EC-02: Catálogo de feature incompleto en un locale

**Given** la historia X agrega claves a `messages/es-LATAM/events.json` pero olvida `messages/pt/events.json`
**When** un usuario con `pt` navega esa pantalla
**Then** `next-intl` devuelve la traducción `es-LATAM` (fallback `getMessageFallback`) en producción
**And** en dev, console.warn detecta `missing key: events.create.title (locale=pt)`.

#### Handling

* Documentar la convención en `web/README.md` y en el catálogo: agregar la clave en los 4 locales aunque sea con placeholder.
* Lint custom opcional (Future, no MVP): script `scripts/i18n-coverage.ts` que valida que todas las claves existen en los 4 locales — no bloqueante en US-104, anotar como follow-up.

---

### EC-03: SSR con `Accept-Language` mal formado

**Given** un bot envía `Accept-Language: ` (vacío) o malformado
**When** el middleware corre el negociador
**Then** cae a `defaultLocale = 'es-LATAM'` sin throw.

#### Handling

* `try/catch` alrededor del negociador BCP-47 con fallback al default.

---

### EC-04: Locale switcher en página que requiere refresh server

**Given** una página Server Component sin Client Component intermedio (Future cuando US-107 monte layouts)
**When** el usuario cambia el locale
**Then** `router.refresh()` recarga el segmento y propaga el nuevo locale al server renderer.

#### Handling

* `useLocale.setLocale` invoca `router.refresh()` tras persistir cookie.

---

### EC-05: `<Money>` con currency desconocida por `Intl.NumberFormat`

**Given** un código de moneda no soportado por ICU (caso raro, ej. moneda histórica)
**When** se renderiza `<Money amount={100} currency="XYZ" />`
**Then** `Intl.NumberFormat` puede lanzar `RangeError`.

#### Handling

* `try/catch` que cae a `formato genérico: ${amount} ${currency}` y loguea warning en dev.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                                                                          | Message / Behavior                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| VR-01 | `locales` y `defaultLocale` viven en `src/shared/i18n/config.ts` como `as const`; cualquier consumo de "locale válido" pasa por esa fuente única                 | TypeScript no compila si se hardcodean strings de locale en otros archivos |
| VR-02 | El middleware valida la cookie contra el array `locales` (whitelist) antes de aceptar                                                                          | EC-01 cubierto; test unit obligatorio                |
| VR-03 | Catálogos `es-LATAM` 100% completos para `common`, `navigation`, `errors`, `validation`                                                                         | Lint/test estructural falla → bloquea merge          |
| VR-04 | Strings literales en JSX prohibidos (regla ESLint activa, AC-10)                                                                                                | Lint falla → bloquea merge                           |
| VR-05 | El PR NO modifica `next.config` con `i18n` legacy de Pages Router (next-intl con App Router usa middleware y request config)                                    | Revisión PR falla                                    |
| VR-06 | El PR NO introduce persistencia `users.language_code` ni endpoints backend de preferencia de idioma (out of scope)                                              | Revisión PR falla                                    |
| VR-07 | El PR NO introduce traducciones completas por feature (auth/event/vendor/etc.) en US-104; solo catálogos transversales                                          | Revisión PR falla                                    |
| VR-08 | Pipeline canónico Doc 21 §9.2 verde + tests E2E i18n verdes                                                                                                    | CI falla → bloquea merge                             |
| VR-09 | Cookie `eventflow_locale` sin PII; no firmada; expira en 1 año; `SameSite=Lax`; `Secure` solo en prod                                                          | Revisión PR / test middleware falla                  |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | El frontend sigue siendo UX-only (ADR-FE-003). US-104 no agrega ningún check de role/ownership.                                                         |
| SEC-02 | Cookie `eventflow_locale` **no es de sesión**: sin PII, sin firma, `SameSite=Lax`, `Secure` en prod, **no HTTP-only** (la lee el cliente para el switcher). |
| SEC-03 | `Accept-Language` propagado al backend **no** expone secretos ni tokens; es metadata pública por diseño HTTP.                                            |
| SEC-04 | Sin secrets en catálogos `messages/*.json`. Sin URLs de endpoints internos. Sin valores de captcha/keys.                                                |
| SEC-05 | El middleware nunca loguea el contenido completo de `Accept-Language` (puede ser fingerprint); solo el locale resuelto.                                  |
| SEC-06 | XSS prevention: las claves de mensajes son JSON estático versionado en repo; nunca se construyen con input usuario en US-104.                            |

### Negative Authorization Scenarios

No aplica directamente — esta historia no introduce endpoints, runtime authorization ni UX guards de rol. Anonymous puede usar el switcher (es UX). Los tests negativos de RBAC viven en US-112.

---

## 🤖 AI Behavior

This story does not invoke AI directly, but **habilita** la propagación de locale a las historias IA futuras.

### AI Involvement

| Field                     | Value                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------- |
| AI Feature                | None directamente                                                                      |
| Provider Layer            | Not applicable                                                                         |
| Human Validation Required | Not applicable                                                                         |
| Persist AIRecommendation  | No                                                                                     |
| Fallback Required         | Not applicable                                                                         |

### Human-in-the-loop Rules

No aplica — US-104 no genera ni renderiza output IA. Las historias IA consumirán el helper `attachLocaleHeader` para que `Accept-Language` viaje al backend y el `LLMProvider` reciba el `locale` como parámetro (FR-I18N-005, BR-AI-011, Doc 17 PromptOps).

---

## 🎨 UX / UI Notes

| UX Area              | Notes                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screens              | No agrega nuevas screens. Modifica el root layout (`src/app/layout.tsx`) para montar `<IntlProvider>` y `<html lang>` dinámico                       |
| Componentes          | `<LocaleSwitcher>` (Client, accesible), `<Money>` (Client, mínimo)                                                                                  |
| Primary Action       | Cambiar idioma (botón/select del switcher)                                                                                                          |
| Secondary Actions    | N/A                                                                                                                                                  |
| Loading State        | `common.loading` clave disponible para layouts/pages futuros                                                                                         |
| Error State          | `common.error`, `common.retry`, `errors.envelope.<code>` disponibles                                                                                 |
| Empty State          | N/A en US-104                                                                                                                                        |
| Success State        | Switcher: tras cambiar idioma, refresca silenciosamente (no toast forzado)                                                                            |
| Accessibility Notes  | Switcher cumple WCAG 2.1 AA: focus visible, `aria-label` i18n, navegable por teclado, contraste, opción seleccionada announceable (`aria-current`)    |
| Responsive Notes     | Switcher es compacto (icono globo + dropdown) en mobile; texto del locale en desktop                                                                  |
| i18n Notes           | El propio switcher se traduce: label, opciones (en cada locale el listado muestra el nombre nativo, ej. `Português` aún en vista `en`)                |
| Currency Notes       | `<Money>` mínimo entregado aquí; UX completa de currency lock visible (selector disabled, tooltip, mensajes Doc 15 §32.3) vive en historia de evento  |

---

## 🛠 Technical Notes

### Frontend

| Topic                | Guidance                                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route / Page         | `src/app/layout.tsx` (root) y `src/middleware.ts` modificados; sin nuevas rutas                                                                          |
| Components           | `<LocaleSwitcher>` (Client), `<Money>` (Client mínimo)                                                                                                   |
| State Management     | `useLocale()` hook lee/escribe la cookie cliente; el server renderer recibe el locale via `x-locale` header propagado por middleware                       |
| Forms                | No aplica (RHF/Zod siguen sin integrarse en esta historia)                                                                                                |
| API Client           | `attachLocaleHeader` exportado en `shared/i18n/index.ts` para ser consumido por `httpClient` (US-106). Si US-106 no está mergeada, US-106 lo cableará       |
| Path alias           | Importar via `@/shared/i18n/...` heredado de US-103                                                                                                       |

---

### Backend

No aplica en esta historia. El backend ya debería aceptar `Accept-Language` por contrato (Doc 14/16); si no lo hace, degrada a `es-LATAM` sin bloquear el frontend.

---

### Database

No aplica. La persistencia de `users.language_code` y `events.language_code` vive en historias separadas (User Profile, Event Creation).

---

### API

| Method | Endpoint | Purpose                                                                                                                 |
| ------ | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| ALL    | Todos los REST | Header `Accept-Language: <locale>` propagado por interceptor (consumido por `httpClient` US-106)                  |

---

### Observability / Audit

| Topic                             | Required                                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Correlation ID                    | No introduce; el middleware propaga `x-locale` adicional al posible `X-Correlation-Id`                                                |
| Runtime logs                      | Dev console: `missing key: <key> (locale=<locale>)` para detectar gaps; producción: silencioso, fallback `es-LATAM`                  |
| AdminAction                       | No aplica                                                                                                                            |
| AIRecommendation runtime creation | No aplica                                                                                                                            |
| CI logs                           | Lint + typecheck + test + build + test:e2e (heredado de US-103 + tests i18n nuevos)                                                   |

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                          | Type        |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | `locales`, `defaultLocale`, `cookieName` exportados desde `config.ts` como `as const`                              | Unit        |
| TS-02 | `getRequestConfig` resuelve `messages` desde `messages/<locale>/*.json` con merge de áreas (`common`, `navigation`, `errors`, `validation`) | Unit |
| TS-03 | `getMessageFallback` devuelve clave anotada en dev y traducción `es-LATAM` en prod                                | Unit        |
| TS-04 | `formatDate`/`formatNumber`/`formatCurrency` invocan `Intl.*` con el locale correcto                              | Unit        |
| TS-05 | `<Money>` usa `formatCurrency` y NO realiza conversión                                                            | Component   |
| TS-06 | `<LocaleSwitcher>` accesible (test con Testing Library + `@testing-library/jest-dom`/`jest-axe` si está disponible) | Component  |
| TS-07 | Middleware resuelve cookie válida → la usa                                                                         | Integration |
| TS-08 | Middleware con cookie inválida + `Accept-Language: pt` → resuelve `pt`                                            | Integration |
| TS-09 | Middleware con `Accept-Language: fr` → cae a `es-LATAM`                                                            | Integration |
| TS-10 | `attachLocaleHeader` devuelve `{ 'Accept-Language': '<locale>' }` tanto en contexto cliente como server            | Unit        |
| TS-11 | Pipeline canónico Doc 21 §9.2 verde con tests nuevos                                                              | CI          |

---

### Negative Tests

| ID    | Scenario                                                                                                            | Expected Result                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| NT-01 | Cookie `eventflow_locale=zh-CN`                                                                                      | Middleware descarta y cae a `Accept-Language` → `es-LATAM`     |
| NT-02 | `Accept-Language: ""` o malformado                                                                                   | Middleware cae a `es-LATAM` sin throw                          |
| NT-03 | `<Money amount={100} currency="XYZ" />` con código no soportado por ICU                                              | `try/catch` devuelve formato genérico y warn en dev            |
| NT-04 | El PR introduce `next.config.mjs` con `i18n` legacy de Pages Router                                                  | Revisión PR falla (VR-05)                                       |
| NT-05 | El PR introduce strings literales en JSX en un componente nuevo                                                      | ESLint falla (VR-04)                                            |
| NT-06 | El PR introduce catálogos completos por feature (auth/event/vendor/etc.) en US-104                                   | Revisión PR falla (VR-07)                                       |
| NT-07 | El PR modifica `users` schema, agrega endpoint de preferencia de idioma o lógica `events.language_code` UX           | Revisión PR falla (VR-06)                                       |
| NT-08 | El catálogo `es-LATAM/common.json` tiene claves faltantes en `es-LATAM`                                              | Lint/test estructural falla (VR-03)                              |
| NT-09 | Locale switcher persiste cookie sin `SameSite=Lax` o con `Secure=true` en dev                                        | Test middleware falla (VR-09)                                    |

---

### AI Tests

No aplica para esta historia. La cadena `locale → IA` se verifica en las historias IA (US-122/US-124).

### Authorization Tests

No aplica para esta historia. Anonymous puede usar el switcher. Negative RBAC vive en US-112.

### Accessibility Tests

| ID         | Scenario                                                              | Expected Result                                  |
| ---------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| A11Y-TS-01 | Navegar el switcher solo por teclado                                  | Tab/flechas/Enter funcionan; focus visible       |
| A11Y-TS-02 | `aria-label` del switcher proviene de `t('navigation.localeSwitcher.label')` | Test verifica resolución vía `t()`         |
| A11Y-TS-03 | Locale seleccionado anunciado con `aria-current="true"` o equivalente | Lectores de pantalla anuncian opción activa      |

---

## 📊 Business Impact

| Field               | Value                                                                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KPI Affected        | Cobertura i18n (NFR-I18N-001..006), tiempo a feature por locale, evidencia de soporte multilingüe para evaluación académica                                              |
| Expected Impact     | Habilita todas las historias frontend posteriores con `t()` desde día 1; habilita propagación de locale a IA; cumple NFR-I18N-001 (4 idiomas) y FR-I18N-006 (default `es-LATAM`) |
| Success Criteria    | PR mergeado + pipeline CI verde + 3 tests E2E (switcher, detección por header, fallback) + catálogos transversales `es-LATAM` completos + lint anti-hardcoded activo      |
| Academic Demo Value | Demo multilingüe disponible desde el inicio del MVP (switcher visible en cualquier vista futura); evidencia de cumplimiento de "inglés no negociable" (Doc 2 decisión #15) |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Crear `src/shared/i18n/config.ts` con `locales`, `defaultLocale`, `cookieName`, `localeLabels` como `as const`.
* Crear `src/shared/i18n/request.ts` con `getRequestConfig` (carga `messages`, `getMessageFallback`, formateadores `Intl`).
* Crear `src/shared/i18n/format.ts` con helpers.
* Crear `src/shared/i18n/Money.tsx` mínimo.
* Crear `src/shared/i18n/LocaleSwitcher.tsx` accesible.
* Crear `src/shared/i18n/useLocale.ts` hook.
* Crear `src/shared/i18n/attachLocaleHeader.ts`.
* Crear `src/middleware.ts` con `localeMiddleware` componible.
* Modificar `src/app/layout.tsx` para montar `<NextIntlClientProvider>` y `<html lang>` dinámico.
* Crear catálogos `src/messages/<locale>/{common,navigation,errors,validation}.json` (es-LATAM completos, otros 3 con placeholders).
* Configurar ESLint regla anti-hardcode (`react/jsx-no-literals` o equivalente con allowList mínima).

### Potential Backend Tasks

Ninguna en esta historia. La aceptación de `Accept-Language` debe estar contemplada en Doc 14 / OpenAPI snapshot (PB-P0-005); si falta, abrir issue/ticket separado.

### Potential Database Tasks

Ninguna.

### Potential AI / PromptOps Tasks

Ninguna directamente. Las historias IA (US-122/US-124) consumirán `Accept-Language` cuando aparezcan.

### Potential QA Tasks

* Tests unit/component de helpers, hook, switcher (TS-01..TS-06, TS-10, A11Y-TS-01..03).
* Tests integration del middleware (TS-07..TS-09, NT-01..NT-02).
* Tests E2E Playwright (AC-11).
* Verificar pipeline canónico verde.

### Potential DevOps / Config Tasks

* Normalizar/confirmar `.env.local.example` con `NEXT_PUBLIC_DEFAULT_LOCALE=es-LATAM` y `NEXT_PUBLIC_SUPPORTED_LOCALES=es-LATAM,es-ES,pt,en`.
* Actualizar `web/README.md` con sección "i18n" (convenciones, cómo agregar claves, ICU, fallback).

### Potential Documentation Tasks

* Sección "i18n" en `web/README.md` (claves jerárquicas, ICU MessageFormat, no hardcoded strings, fallback, cómo agregar locales en el futuro).
* Housekeeping post-merge: formalizar **ADR-FE-007** en `/docs/22-Architecture-Decision-Records.md` (referenciado en Doc 15 §49, no redactado todavía).
* Housekeeping post-merge: validar que `next-intl` aparezca en el listado oficial de stack Doc 15 §7 (ya aparece como `3.x`).

---

## ✅ Definition of Ready

* [x] Rol claro: System.
* [x] Goal técnico claro: configuración funcional `next-intl` + middleware + switcher + catálogos transversales + helpers + propagación `Accept-Language`.
* [x] Boundary formalizado con US-103, US-105 (route groups), US-106 (httpClient), US-107 (layouts) y con la historia User Profile (persistencia backend).
* [x] Decisiones cerradas (Doc 15 §17/§31, FR-I18N-*, NFR-I18N-*): locales, default, detección, propagación, cookie técnica, currency display mínimo.
* [x] Acceptance Criteria testables y atómicos (AC-01..AC-12).
* [x] Edge cases documentados (cookie adulterada, catálogos incompletos, `Accept-Language` malformado, refresh server, currency desconocida).
* [x] Out of Scope explícito (persistencia backend, traducciones por feature, currency lock UX, SEO localizado, route groups, layouts, QueryClient/MSW).
* [x] Validation rules y SEC rules claros.
* [x] Tests definidos (TS-01..TS-11, NT-01..NT-09, A11Y-TS-01..03, E2E).
* [x] Trazabilidad a Doc 9/10/14/15/20/22 y ADRs FE-001/003/007.
* [ ] Tech Lead frontend validó.

---

## 🏁 Definition of Done

* [ ] `next-intl 3.x` configurado funcionalmente: `config.ts`, `request.ts`, `format.ts`, `useLocale.ts`, `attachLocaleHeader.ts`, `Money.tsx`, `LocaleSwitcher.tsx`, `middleware.ts` operativos.
* [ ] `<IntlProvider>` montado en root layout con `<html lang>` dinámico.
* [ ] Catálogos `src/messages/<locale>/{common,navigation,errors,validation}.json` versionados (es-LATAM 100%, otros 3 con placeholders detectables).
* [ ] Lint anti-hardcoded strings activo (AC-10).
* [ ] Pipeline canónico Doc 21 §9.2 verde.
* [ ] Tests unit/component/integration verdes (TS-01..TS-11, NT-01..NT-09, A11Y-TS-01..03).
* [ ] 3 tests E2E Playwright verdes (switcher, detección header, fallback).
* [ ] `web/README.md` con sección "i18n" actualizada.
* [ ] `.env.local.example` con `NEXT_PUBLIC_DEFAULT_LOCALE` y `NEXT_PUBLIC_SUPPORTED_LOCALES`.
* [ ] PR revisado por Tech Lead frontend.

---

## 📝 Notes

* US-104 es la **capacidad i18n base** de EPIC-FE-001. Bloquea (de hecho) cualquier feature frontend que quiera traducir strings, pero no bloquea US-105 ni US-106 técnicamente (pueden mergearse en paralelo).
* Estrategia de **detección por cookie + `Accept-Language` sin prefijo URL** (Doc 15 §17/§31.2): SEO localizado vía URL es Future (Doc 15 §31.5, ADR-FE-005 diferida).
* La persistencia de `users.language_code` en backend (FR-I18N-002, NFR-I18N-002) es **out of scope**: vive en la historia User Profile. US-104 deja el switcher listo para sincronizar cookie ↔ API cuando esa historia exista.
* El **idioma del evento** (FR-I18N-003/005, BR-AI-011) vive en historias de evento e IA; US-104 solo habilita la propagación de `Accept-Language`.
* El **lint anti-hardcoded** es no negociable; el set exacto de reglas se acuerda en el PR pero la regla `react/jsx-no-literals` (o equivalente) debe estar activa.

### Documentation Alignment Required (no bloqueante)

* **ADR-FE-007** está **referenciada** en Doc 15 §49 (línea 1790) pero **no redactada** en Doc 22 (que solo contiene ADR-FE-001..004). La decisión técnica es inequívoca (Doc 15 §31), por lo que esta historia no la bloquea. Acción recomendada: redactar ADR-FE-007 formal en Doc 22 como housekeeping post-merge.
* **Doc 15 §17** marca "decisión a confirmar en ADR" para la estrategia "cookie/header sin prefijo URL". US-104 implementa esa decisión; la formalización del ADR queda como housekeeping (mismo housekeeping que el punto anterior).
* **Default locale en `Intl.*`**: `es-LATAM` no es un tag BCP-47 estándar (lo correcto sería `es-419`). US-104 trata `es-LATAM` como **etiqueta lógica interna** y al invocar `Intl.*` puede mapear a `es-419` (o `es-MX`) para producir formatos correctos. Documentar este mapeo explícitamente en `format.ts`. No bloquea aprobación; es un detalle de implementación.
