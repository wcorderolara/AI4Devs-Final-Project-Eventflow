# EventFlow — Frontend (`web/`)

Aplicación frontend de EventFlow: **Next.js 14 (App Router) + TypeScript 5 estricto**, con el
stack MVP cerrado por Doc 15 §7. Esta carpeta es el **bootstrap** entregado por **US-103**
(PB-P0-012). Es un scaffolding arrancable, type-safe y lint-limpio; la funcionalidad real llega
en las historias siguientes (ver [Out of Scope](#out-of-scope-us-103)).

---

## Setup

Requiere **Node 20 LTS** (fijado en `.nvmrc` y `engines.node`).

```bash
nvm use                     # selecciona Node 20 (ver .nvmrc)
npm ci                      # instala dependencias de forma reproducible (lockfile)
cp .env.local.example .env.local   # completa los valores locales (no versionado)
npm run dev                 # http://localhost:3000
```

> Usa **`npm ci`** (no `npm install`) para reproducibilidad — es el comando canónico del pipeline
> (Doc 21 §9.2). `npm install` puede regenerar el `package-lock.json` con versiones distintas.

---

## Scripts

| Script | Comando | Propósito |
| ------ | ------- | --------- |
| `dev` | `next dev` | Servidor de desarrollo en `http://localhost:3000`. |
| `build` | `next build` | Build de producción optimizado (`.next/`). |
| `start` | `next start` | Sirve el build de producción. |
| `lint` | `next lint --max-warnings=0` | ESLint (`next/core-web-vitals` + `jsx-a11y` + Prettier), CI estricto. |
| `lint:fix` | `next lint --fix` | Autofix de ESLint (uso local). |
| `format` | `prettier --write "src/**/*.{ts,tsx,js,jsx,json,md}"` | Formatea el código. |
| `typecheck` | `tsc --noEmit` | Chequeo de tipos (`strict` + `noUncheckedIndexedAccess`). |
| `test` | `vitest run` | Unit/component (Vitest + Testing Library + jsdom). |
| `test:watch` | `vitest` | Vitest en modo watch. |
| `test:e2e` | `playwright test` | E2E (Playwright, chromium). |
| `test:e2e:install` | `playwright install --with-deps chromium` | Descarga el browser de Playwright. |

**Pipeline canónico (Doc 21 §9.2)** — verde en local y CI:

```bash
npm ci && npm run lint && npm run typecheck && npm run test && npm run build
# + E2E:
npm run test:e2e:install && npm run test:e2e
```

---

## Env vars

Solo variables públicas con prefijo `NEXT_PUBLIC_*` (Doc 21 §9.3). Declaradas en
`.env.local.example` **sin valores reales**. Sin secrets en el repo.

| Variable | Descripción |
| -------- | ----------- |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL del backend REST (Doc 16). En deploy se configura en Amplify. |
| `NEXT_PUBLIC_APP_ENV` | Entorno lógico: `local` \| `staging` \| `production`. |
| `NEXT_PUBLIC_CAPTCHA_SITE_KEY` | Site key pública del captcha (sin valor en el repo). |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Locale por defecto (informativo; fuente de verdad: `src/shared/i18n/config.ts`). |
| `NEXT_PUBLIC_SUPPORTED_LOCALES` | Lista de locales soportados (informativo). |

> `.env.local` **no** se versiona (`.gitignore` ignora `.env*` excepto `.env.local.example`).
> US-103 no agrega validación runtime de env vars; llega con el `apiClient` (US-106+).

---

## Stack (versiones efectivas)

Estricto a Doc 15 §7. Cualquier dependencia fuera del listado requiere ADR previo (VR-02).

| Categoría | Paquete | Versión |
| --------- | ------- | ------- |
| Framework | `next` | 14.2.35 |
| Lenguaje | `typescript` | ^5 |
| React | `react` / `react-dom` | 18.3.1 |
| Server state | `@tanstack/react-query` | ^5 |
| Forms | `react-hook-form` | ^7 |
| Validation | `zod` / `@hookform/resolvers` | zod ^3 |
| i18n | `next-intl` | ^3 |
| Styling | `tailwindcss` / `postcss` / `autoprefixer` | tailwind ^3.4 |
| Componentes base | `@headlessui/react`, `@radix-ui/react-slot` | últimas estables |
| Iconos | `lucide-react` | última estable |
| Fechas | `date-fns` | última estable |
| Unit/Component | `vitest`, `@testing-library/*`, `jsdom` | últimas estables |
| E2E | `@playwright/test` | última estable |
| Mocking | `msw` | ^2 |
| Lint/Format | `eslint`, `eslint-config-next`, `eslint-config-prettier`, `eslint-plugin-jsx-a11y`, `prettier` | últimas estables |
| i18n matcher | `@formatjs/intl-localematcher` | ^0.5 |
| Error boundary | `react-error-boundary` | ^6 (excepción de stack aprobada en el gate de US-106) |

---

## i18n (US-104)

Internacionalización con **next-intl** en App Router **sin prefijo de URL** (Doc 15 §17/§31.2).

### Locales

4 locales soportados, default **`es-LATAM`** (Doc 15 §31.1 / FR-I18N-001): `es-LATAM`, `es-ES`,
`pt`, `en`. La **fuente única de verdad** es `src/shared/i18n/config.ts` (`locales`,
`defaultLocale`, `cookieName`, `localeLabels`).

### Detección de locale

Middleware (`src/middleware.ts`, función `localeMiddleware` componible):
`cookie eventflow_locale` (whitelist) → `Accept-Language` (best match BCP-47 vía
`@formatjs/intl-localematcher`) → `defaultLocale`. El locale resuelto se propaga al render
server-side vía el header `x-locale`. El middleware **no** setea cookie automáticamente (solo el
switcher escribe) ni redirige por URL.

### Mapeo `es-LATAM → es-419`

`es-LATAM` es una **etiqueta lógica interna**; no es un tag BCP-47 válido. Para `Intl.*` y para el
atributo `<html lang>` se mapea a **`es-419`** (Español de Latinoamérica) mediante `mapToBcp47()`
en `src/shared/i18n/format.ts`. El resto de locales ya son tags BCP-47 válidos.

### Convención de claves y catálogos

Claves jerárquicas por área transversal (`common`, `navigation`, `errors`, `validation`) en
`src/messages/<locale>/<area>.json`. Ejemplo: `navigation.localeSwitcher.label`,
`errors.envelope.UNEXPECTED`. Los catálogos transversales están completos en los 4 locales; cada
**feature** aportará su propio catálogo cuando se implemente (no en US-104).

**ICU MessageFormat** para interpolación/plurales:

```json
{ "validation": { "minLength": "Debe tener al menos {min} caracteres" } }
```

```json
{ "items": "{count, plural, one {# elemento} other {# elementos}}" }
```

### Fallback de mensajes

Los mensajes del locale activo se mergean sobre la base `es-LATAM`: una clave faltante cae
automáticamente a su traducción `es-LATAM`. Para claves ausentes incluso en `es-LATAM`,
`getMessageFallback` devuelve `[<locale>] <namespace>.<key>` en **dev** (alerta visual) y la ruta
de la clave en **prod**.

### Lint anti-hardcoded

`react/jsx-no-literals` está **activo** (AC-10 / Doc 15 §31.3): los strings de UI en JSX deben
usar `t('clave')`. AllowList mínima de símbolos: `·`, `/`, `&`, `—`, `:`. Los tests quedan
exceptuados. Atributos (p. ej. `aria-label`) no se revisan (se resuelven vía `t()` igualmente).

### Cómo agregar un locale nuevo

1. Agregar el tag a `locales` y su label a `localeLabels` en `config.ts`.
2. Si no es BCP-47 válido, añadir el mapeo en `mapToBcp47` (`format.ts`) y en `BCP47_TO_LOCALE`
   (`middleware.ts`).
3. Crear `src/messages/<locale>/{common,navigation,errors,validation}.json`.

### HTTP client (handoff US-106)

`attachLocaleHeader(locale?)` (en `src/shared/i18n`) devuelve `{ 'Accept-Language': <BCP-47> }`
listo para inyectarse como interceptor del `httpClient`. **US-106 lo cableará** (US-104 lo entrega
testeado y exportado). Server: pasar `await getLocale()`. Cliente: llamar sin argumento (lee la cookie).

---

## Routing (US-105)

App Router con **4 route groups** (los paréntesis son marcadores de grupo — **no** aparecen en la
URL). Segmentos URL **estables en inglés** (no se traducen por locale, Doc 15 §17).

| Route group | URL(s) | Propósito | Guard |
| ----------- | ------ | --------- | ----- |
| `(public)` | `/`, `/vendors`, `/403` | Landing, directorio, acceso denegado (indexable) | — |
| `(auth)` | `/login`, `/register`, `/forgot-password` | Autenticación (placeholders; forms reales en US-AUTH-*) | redirect a dashboard si hay sesión |
| `(app)` | `/organizer`, `/vendor` | Workspaces autenticados | requiere sesión |
| `(admin)` | `/admin` | Panel admin | requiere sesión + rol `admin` |

### Middleware UX (composición)

`src/middleware.ts` compone `localeMiddleware` (US-104) **→** `roleGuardMiddleware` (US-105). El
role guard es **UX-only** (ADR-FE-003/015): **no** es un security boundary, **no** decodifica JWT
ni valida firma. Lee la **presencia** de `eventflow_session` y el **valor whitelisted** de
`eventflow_role` (`{organizer, vendor, admin}`). El backend (US-094..097, US-112) valida cada
request de forma independiente. `matcher` excluye `/_next`, `/static`, `/api`, `favicon.ico`,
`/robots.txt`, `/sitemap.xml`.

### 13 reglas de redirección (AC-02)

| Ruta | Estado | Acción |
| ---- | ------ | ------ |
| `/`, `/vendors`, `/vendors/*`, `/403` | cualquiera | pass-through |
| `/login`, `/register`, `/forgot-password` | sin sesión | pass-through |
| `/login`, `/register`, `/forgot-password` | sesión `organizer` | → `/organizer` |
| `/login`, `/register`, `/forgot-password` | sesión `vendor` | → `/vendor` |
| `/login`, `/register`, `/forgot-password` | sesión `admin` | → `/admin` |
| `/organizer`, `/organizer/*` | sin sesión | → `/login?from=<path>` |
| `/organizer`, `/organizer/*` | con sesión (cualquier rol) | pass-through |
| `/vendor`, `/vendor/*` | sin sesión | → `/login?from=<path>` |
| `/vendor`, `/vendor/*` | con sesión | pass-through |
| `/admin`, `/admin/*` | sin sesión | → `/login?from=<path>` |
| `/admin`, `/admin/*` | sesión, rol ≠ `admin` (incl. inválido/ausente) | → `/403` |
| `/admin`, `/admin/*` | sesión, rol `admin` | pass-through |
| cookie `eventflow_role` fuera de whitelist | — | tratada como sin rol |

> **Decisión UX MVP**: un `admin` puede escribir manualmente `/organizer` o `/vendor` y ver el
> placeholder (la navegación de US-107 no le ofrecerá esos links). La autorización real de datos
> sigue en el backend.

### SEO baseline

- `robots.ts` → `/robots.txt`: `Allow: /` y `/vendors`; `Disallow` para `/login`, `/register`,
  `/forgot-password`, `/organizer`, `/vendor`, `/admin`, `/403`; `Sitemap: <baseUrl>/sitemap.xml`.
- `sitemap.ts` → `/sitemap.xml`: placeholder con `/` y `/vendors` (vendors reales en su historia owner).
- `<baseUrl>` = `NEXT_PUBLIC_SITE_URL` (fallback `http://localhost:3000`).

### Open redirect prevention (handoff US-AUTH-*)

El middleware redirige rutas privadas a `/login?from=<path-interno-encoded>`. **US-AUTH-*** debe
validar `from` como ruta **interna** (regex `^/[a-zA-Z0-9_/\-?=&]*$`; rechazar `http(s)://`, `//`)
antes de `router.push` (EC-04). TODO documentado en `(auth)/login/page.tsx`.

### `<SessionProvider>` (esqueleto)

`@/shared/authorization` expone `<SessionProvider>` (montado en el root layout) y `useSession()`,
que devuelven `{ isAuthenticated: false, role: null }` hasta que **US-106** hidrate la sesión real
vía `GET /me`. No consumirlo como sesión hidratada todavía.

---

## Data Layer (US-106)

Capa de datos global: **TanStack Query** (server state) + **`httpClient`** + **MSW** + sesión
hidratada. Sin Server Actions ni API Routes BFF (ADR-FE-002/003).

### Providers (orden en `RootLayout`)

```
<ErrorBoundary> → <QueryProvider> → <MSWProvider> → <SessionProvider> → <NextIntlClientProvider>
```

- **`<QueryProvider>`** (`shared/providers`): `QueryClient` con instancia única por request
  (`useState(() => new QueryClient(...))`). Defaults: `staleTime 30s`, `gcTime 5min`,
  `refetchOnWindowFocus/Reconnect`, `retry` que excluye errores no-retryables (401/403/404/422),
  `mutations.retry 0`. Devtools solo en dev (dynamic import). `QueryCache.onError` → `handleQueryError`.
- **`<MSWProvider>`**: arranca el worker MSW solo con `NEXT_PUBLIC_API_MOCKING=enabled` (dev). El
  `import()` vive dentro de un bloque `NODE_ENV !== 'production'` → **MSW nunca entra al bundle de
  prod** (verificado por `npm run check-no-msw-in-prod`).
- **`<ErrorBoundary>`** (`react-error-boundary`): captura errores de **render** (no de queries).
  Recibe `locale`/`messages` para traducir el fallback aunque el árbol falle.
- **`<SessionProvider>`** (`shared/auth-session`): hidrata la sesión con `useQuery(['me'])` →
  `authApi.me()`. Un **401 = sesión anónima** (no error).

### `httpClient` (`shared/api-client`)

`httpGet/httpPost/httpPatch/httpPut/httpDelete<T, B>(path, opts?)`. Cada request:
`credentials: 'include'` (cookie de sesión automática), `Accept-Language` (US-104),
`X-Correlation-Id` (UUID v4), `Content-Type` si hay body, timeout 10s (30s si `opts.isAI`).
Errores → **`ApiError`** `{ code, message, details?, correlationId?, status, isRetryable }`.
`isRetryable`: `true` para network/timeout (0), 408, 429, 5xx.

### Patrón `featureApi → mapper → frontend model` (Doc 15 §24)

```
feature/<feature>/api/<feature>Api.ts   // DTOs + funciones REST (httpClient)
feature/<feature>/api/<feature>Mappers.ts // mappers PUROS (DTO → frontend model)
feature/<feature>/types/                // frontend models
```

Reglas: **NO** devolver DTOs crudos al UI; el mapper aísla cambios de contrato; errores siempre
tipados como `ApiError`; cada endpoint tiene su handler MSW. Ejemplo real: `authApi.me()`
(`AuthSessionResponseDTO` → `mapAuthSessionResponseToAuthSession` → `AuthSession`).

**Agregar un `featureApi` nuevo**: (1) crear `<feature>Api.ts` con DTO + función `httpGet/httpPost`;
(2) definir el frontend model en `types/`; (3) escribir el mapper puro (+ test); (4) crear el hook
`useX()` con TanStack Query; (5) agregar el MSW handler **antes** del catch-all en
`src/tests/msw/handlers/`.

### MSW

`NEXT_PUBLIC_API_MOCKING=enabled` activa el worker en dev (backend simulado). Handlers en
`src/tests/msw/handlers/` (`/auth/me` 401 por defecto, `/health` 200, catch-all 501). Tests Vitest:
`server` en `vitest.setup.ts`. **Setup**: `npx msw init public/` genera `public/mockServiceWorker.js`
(ya versionado). El endpoint real `GET /api/v1/auth/me` lo entrega **US-108**.

### Sesión (`useSession()`)

Devuelve `{ user, role, isAuthenticated, isLoading, isError, refetch }`. Refleja solo lo que el
backend afirmó en `GET /me` (ADR-FE-003). **No** expone `permissions` (backend) ni `locale`
(`useLocale()` de US-104). Un **401 global** en una query distinta de `['me']` limpia el cache y
redirige a `/login?from=<path>` si el path está en `(app)`/`(admin)`; `['me']` 401 = anónimo (sin loop).

---

## Layouts & Navigation (US-107)

Layouts completos por área (Doc 15 §19-20) que reemplazan los esqueletos de US-105. Copy 100 %
i18n (`t()`), iconos `lucide-react`, WCAG 2.1 AA.

### Layouts

| Layout | Tipo | Contenido |
| ------ | ---- | --------- |
| `(public)` | Server | `<SkipLink>` + header (`<Logo>`, nav Directorio/Login/Register, `<LocaleSwitcher>`) + `<main>` + `<Footer>` |
| `(auth)` | Server | `<SkipLink>` + header (`<Logo>`, switcher) + card centrado |
| `(app)` | Client | `<SkipLink>` + `<Topbar>` + `<MobileNav>` (drawer) + `<main>`. Sidebar la ponen los sub-layouts |
| `(app)/organizer` · `(app)/vendor` | Client | `<Sidebar>` contextual + `<section>` |
| `(admin)` | Client | `<SkipLink>` + `<Topbar>` + `<MobileNav>` + `<Sidebar>` admin + `<main>` |

### Componentes (`src/shared/navigation/`)

`<Topbar>`, `<Sidebar>`, `<NavLink>` (`aria-current="page"`), `<UserMenu>` (Headless UI `Menu`,
iniciales + logout placeholder), `<MobileNav>` (Headless UI `Dialog`: focus trap + `Escape` +
overlay), `<NotificationsBadge>` (placeholder), `<SkipLink>`, `<Footer>`, `<Logo>`. Items de nav en
`navItems.ts` (`ORGANIZER_NAV_ITEMS`/`VENDOR_NAV_ITEMS`/`ADMIN_NAV_ITEMS`).

### `<RoleGuard>` (`src/shared/authorization/`)

`<RoleGuard allow={Role[]} fallback?>` — **UX guard, NO security boundary** (ADR-FE-003). Oculta
children si el rol de `useSession()` no está en `allow`; durante `isLoading` renderiza `fallback`
(evita flash). No lanza ni redirige. El backend valida cada request de forma independiente.

### Logout placeholder

El `<UserMenu>` incluye "Cerrar sesión" **placeholder** (US-107): limpia la cookie UX
`eventflow_role` (no HttpOnly), invalida `['me']` y redirige a `/login`. **No** llama a
`POST /auth/logout`; la cookie de sesión `HttpOnly` permanece hasta el logout real (**US-AUTH-***).

### Responsive & A11y

Mobile-first, breakpoint `lg` (1024 px): sidebar fija en desktop, `<MobileNav>` drawer en mobile.
`<SkipLink>` primer focusable → `#main-content`. `<nav aria-label>` por sidebar. Paleta semántica
mínima en `tailwind.config.ts` (`primary`→blue, `secondary`→slate, `danger`→red, `success`→emerald).

### Placeholders de sidebar

US-107 crea 12 `page.tsx` placeholder (3 organizer + 5 vendor + 4 admin) para que los links de nav
no rompan. Cada historia de feature reemplaza su placeholder dueño sin tocar layouts.

---

## Cookies

| Cookie | Tipo | Flags | Notas |
| ------ | ---- | ----- | ----- |
| `eventflow_locale` | Preferencia UX de idioma (US-104) | `path=/`, `Max-Age=31536000` (1 año), `SameSite=Lax`, `Secure` **solo en prod**, **sin `HttpOnly`** | La lee el cliente para el switcher. Sin PII, sin firma. **No es cookie de sesión.** |
| `eventflow_session` | Sesión auth (emitida por backend en **US-108**) | `HttpOnly`, `Secure`, `SameSite=Lax` | US-105 solo lee su **presencia** en el middleware (no decodifica). |
| `eventflow_role` | Claim de rol UX (emitida por backend en **US-108**) | `SameSite=Lax`, `Secure` en prod, **sin `HttpOnly`**, sin firma | Valor ∈ `{organizer, vendor, admin}` (whitelist). Claim UX no autoritativo; el backend siempre revalida. |

> Mientras **US-108** no esté mergeada, los E2E "con sesión" simulan `eventflow_session` y
> `eventflow_role` con `context.addCookies()` de Playwright. La emisión/limpieza reales de ambas
> cookies (`POST /auth/login` / `POST /auth/logout`) son responsabilidad de US-108.

---

## Security

- Frontend **UX-only** (ADR-FE-003): sin checks de role/ownership/permission en cliente. La
  autorización efectiva vive siempre en el backend.
- Sin secrets en el repo; solo `NEXT_PUBLIC_*` en `.env.local.example`.
- Sin Server Actions ni API Routes BFF; sin rewrites a OpenAI/`/api/v1/*` (Doc 15 §6, ADR-API-001).
- **Política `npm audit`**: `npm audit --omit=dev` con vulnerabilidades **High/Critical** sin issue
  de seguimiento **bloquea el merge** (SEC-06).

### Vulnerabilidades conocidas (con seguimiento — no bloqueantes)

| Paquete | Severidad | Estado |
| ------- | --------- | ------ |
| `next` (advisory agregada `9.3.4 – 16.3.0-canary.5`) | High | **Sin fix estable disponible** que salga del rango del advisory sin romper el pin **Next 14** (ADR-FE-001, decisión que no se reabre). Se fija la última 14.2.x parcheada por CVE individual (14.2.35). Seguimiento: revisar al aparecer una release estable fuera del rango del advisory. |
| `next-intl` (`<=4.9.1`) | Moderate | El fix es `next-intl@4` (breaking) y viola el pin `^3` de la historia. No bloquea (Moderate). Migración a v4 se evalúa en housekeeping/US-104. |
| `postcss` (nested en `next`) | Moderate | Dep interna de Next; se resuelve al actualizar Next. No bloquea (Moderate). El `postcss` top-level ya está en `^8.5.16` (parcheado). |

---

## Out of Scope (US-103)

US-103 entrega solo el bootstrap. Lo siguiente llega en historias posteriores:

- **i18n funcional** (middleware `next-intl`, catálogos `messages/*.json`, switcher) → **US-104**.
- **Route groups por rol** (`(public)`, `(auth)`, `(app)`, `(admin)`) + `middleware.ts` → **US-105**.
- **`QueryClient` global, `<QueryProvider>`, `<MSWProvider>`, handlers MSW** → **US-106**.
- **Layouts y navegación por rol** → **US-107**.
- **Design system completo**, `apiClient`, features de dominio, auth/captcha, observability cliente
  full, TanStack Table, Sentry → historias posteriores / Future.

---

## Documentation Alignment (housekeeping — no bloqueante)

Estos ítems son **housekeeping post-merge** y no bloquean el merge. La redacción del ADR y la
edición de Doc 15/22 se difieren (crear/superar ADRs requiere autorización explícita), pero quedan
**registrados** aquí como seguimiento:

1. **Doc 15 §7 — gestor de paquetes**: "pnpm preferido o npm" vs Doc 21 §9.2 (`npm ci` canónico).
   US-103 adopta **npm** (alineado a Doc 21). Amender Doc 15 §7 → "npm canónico MVP, pnpm Future".
2. **Doc 15 §17 — locale URL strategy**: US-104 **implementa** la estrategia cookie/header sin
   prefijo URL. Retirar la marca "decisión a confirmar en ADR" tras redactar ADR-FE-007.
3. **ADR-FE-007** referenciada en Doc 15 §49 pero no redactada en Doc 22 (que solo tiene
   ADR-FE-001..004). La decisión técnica está formalizada en Doc 15 §31; redactar el ADR formal
   como housekeeping.
4. **Doc 15 §15 — ubicación de `middleware.ts`**: Doc 15 §15 muestra `app/middleware.ts`; la
   convención App Router (y US-104) usa **`src/middleware.ts`** (project-root). Amender Doc 15 §15.
5. **Mapeo `es-LATAM → es-419`**: documentado en `format.ts` y en § i18n de este README. Reflejarlo
   también en Doc 15 § i18n.
6. **Doc 19 — cookie `eventflow_role`** (US-105): Doc 19 define solo cookies HTTP-only de sesión; no
   lista la cookie auxiliar `eventflow_role` (no HTTP-only, claim UX no firmado). Amender Doc 19
   post-merge para listarla y justificar que **no** es source of truth (coherente con ADR-FE-003/015).
7. **Contrato con US-108** (US-105): el backend debe emitir `eventflow_session` (HTTP-only) +
   `eventflow_role` (no HTTP-only) en `POST /auth/login` y limpiar ambas en `POST /auth/logout`
   (`Max-Age=0`). Issue de seguimiento pendiente para US-108.
8. **SEC `from=` para US-AUTH-*** (US-105, EC-04): validar `from` como ruta interna antes de
   `router.push` (TODO en `(auth)/login/page.tsx`). Issue de seguimiento pendiente para US-AUTH-*.
9. **Decisión "admin entra a `(app)`"** (US-105): el middleware permite a un admin ver placeholders
   de `/organizer`/`/vendor` por URL manual (UX MVP). Revisar en US-107 si el negocio prefiere bloquear.
10. **Doc 15 §21.2 — shape de `SessionContext`** (US-106): Doc lista `user, role, permissions,
    isAuthenticated, locale`; US-106 entrega `{ user, role, isAuthenticated, isLoading, isError, refetch }`.
    `permissions` se deriva en backend per-request (ADR-FE-003); `locale` vive en `useLocale()` (US-104).
    Amender Doc 15 §21.2.
11. **Doc 15 §23.1 — Authorization** (US-106): Doc menciona "cookie automática o Bearer"; US-106 adopta
    **cookie HTTP-only** (Doc 19 + US-105/108). La rama Bearer queda Future. Amender Doc 15 §23.1.
12. **Contrato `GET /api/v1/auth/me`** (US-106): shape documentada en la spec/README; **US-108** lo
    implementa en backend. Coordinar; si diverge, DR explícito antes de cerrar US-108.
13. **Doc 15 §19 — footer público** (US-107): US-107 simplifica el footer a logo + copyright (links
    legales `/about`/`/terms`/etc. son Future). Amender Doc 15 §19.
14. **Doc 15 §20 — paths de navegación** (US-107): US-107 formaliza los paths efectivos por rol
    (`/organizer/events`, `/vendor/portfolio`, `/admin/vendors`, etc.) en `navItems.ts`. Amender
    Doc 15 §20. Impersonación admin (§20.3) confirmada **fuera de scope** (Future).

> DOC-002 de US-105/US-106/US-107: la edición efectiva de Doc 15/19/22 y la apertura de issues quedan
> **diferidas post-merge** (guardrail: no editar docs base ni crear ADRs sin autorización explícita);
> registradas aquí como seguimiento.

---

## Estructura (Doc 15 §15)

```text
src/
├── app/                 # App Router (mínimo en US-103; route groups en US-105)
├── features/            # feature-first (Doc 15 §16) — vacío
├── shared/
│   ├── api-client/      design-system/  design-tokens/  hooks/  lib/  observability/
│   ├── i18n/            # next-intl config → US-104
│   ├── providers/       # Query/Intl/Theme providers → US-106/US-107
│   ├── auth-session/    authorization/ (UX-only, ADR-FE-003)  error-handling/
├── tests/{e2e,unit,integration,msw}/
└── messages/            # catálogos i18n → US-104
```

## Testing (US-125 / PB-P0-015)

Tres niveles con **Vitest** (unit/componente), **Testing Library + MSW** (componentes con red mockeada)
y **Playwright** (E2E chromium). Cobertura con `@vitest/coverage-v8` (reporting-only en P0).

| Comando | Propósito |
| ------- | --------- |
| `npm test` | Vitest unit/componente (`src/tests/unit/**`). |
| `npm run test:watch` | Vitest en watch. |
| `npm run test:coverage` | Reporte de cobertura en `coverage/` (v8). |
| `npm run test:ci` | Corrida CI (`--reporter=verbose`). |
| `npm run test:e2e` | Playwright E2E (`src/tests/e2e/**`). |
| `npm run test:e2e:install` | Instala el browser chromium (`playwright install --with-deps chromium`). |

- **Ubicación**: `src/tests/{unit,integration,e2e,msw}/`.
- **MSW**: el server de Node se inicializa en `vitest.setup.ts` con `onUnhandledRequest: 'error'` — toda
  request sin handler **falla de forma determinista**. Los handlers viven en `src/tests/msw/handlers/`;
  para agregar uno nuevo, añádelo a ese módulo y expórtalo en el arreglo de `handlers`.
- **Playwright**: `baseURL` se parametriza con `E2E_BASE_URL` (default `http://localhost:3000`, nunca
  producción). En un entorno limpio, corre `npm run test:e2e:install` antes del primer E2E.
- `.env*`, `/coverage`, `/playwright-report` y `/test-results` están en `.gitignore`.
