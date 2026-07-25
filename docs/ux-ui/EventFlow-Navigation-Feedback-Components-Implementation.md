# EventFlow — Navigation & Feedback Components · Implementation Record

| Campo | Valor |
|---|---|
| Documento | EventFlow — Navigation & Feedback Components Implementation Record |
| Versión | 1.0 |
| Fecha | 2026-07-25 |
| Alcance | Componentes reutilizables de **Navigation** y **Feedback / Status** en `web/src/shared/design-system/`, normalización del shell autenticado existente y adopción en un conjunto representativo de consumidores. No incluye la migración de toda la aplicación ni el grupo de overlays. |
| Estado | Completado — format, lint, typecheck, tests, a11y y build en verde |
| Input aprobado | `EventFlow-UI-Foundations.md` · `EventFlow-Design-Tokens.md` · `EventFlow-Component-Foundations.md` · `EventFlow-Stitch-Foundations-Frontend-Validation.md` · `EventFlow-Frontend-Design-Tokens-Implementation.md` · `EventFlow-Actions-Forms-Components-Implementation.md` |

---

## 1. Purpose

Construir los componentes reutilizables de **navegación** (shell, sidebar desktop, drawer mobile,
topbar, menús, breadcrumb, filtros) y de **feedback y estado** (badges, alerts, toasts, estados
vacío/error/permiso, spinner, skeleton, progreso) sobre la capa de tokens (PB-P2-027) y sobre los
componentes de Actions & Forms (PB-P2-028), y demostrarlos migrando el shell autenticado real y un
conjunto pequeño de consumidores, sin cambiar comportamiento de producto.

Antes de esta tarea `web/src/shared/design-system/` sólo contenía `actions/` y `forms/`. La
navegación vivía en `web/src/shared/navigation/` con markup ad-hoc, y **el route group `(app)`
—organizer y vendor— no tenía sidebar de desktop en absoluto**, incumpliendo UI-DEC-008. No existía
ningún componente compartido de `Alert`, `StatusBadge`, `EmptyState`, `ErrorState`, `Toast`,
`Skeleton` ni `ProgressIndicator`: cada feature reimplementaba el suyo con paleta cruda.

## 2. Stitch screens inspected

| Recurso | Identificador |
|---|---|
| Proyecto | `projects/10889252267442839867` — "EventFlow AI Planning Workspace" |
| Screen desktop | `projects/10889252267442839867/screens/511d11caa1ee4f4dadcfe7abd69c3c10` — "EventFlow — Component Design System (Navigation & Feedback)" (DESKTOP, 2560 × 2048) |
| Screen móvil | `projects/10889252267442839867/screens/ebfb2eca245b4024bead6d26983a26ce` — "EventFlow — Component Design System (Navigation & Feedback - Móvil)" (MOBILE, 780 × 4840) |

## 3. Desktop and mobile resources retrieved

| Recurso | Detalle |
|---|---|
| Metadata de ambos screens | `mcp__stitch__get_screen` — título, `deviceType`, dimensiones y URLs firmadas |
| HTML desktop | `projects/10889252267442839867/files/1336259527005398068` — descargado (13 703 bytes) y leído íntegro |
| HTML móvil | `projects/10889252267442839867/files/12262933412530581984` — descargado (21 727 bytes) y leído íntegro |
| Screenshot desktop | `projects/10889252267442839867/files/6999815845618749887` — descargado e inspeccionado visualmente |
| Screenshot móvil | `projects/10889252267442839867/files/15934038475801718033` — descargado e inspeccionado visualmente |
| DESIGN.md / design system | No se volvió a solicitar: `EventFlow-Stitch-Foundations-Frontend-Validation.md` §2.1 ya inspeccionó las 3 versiones y registró sus divergencias |

**Stitch se usó como evidencia visual, no como autoridad de tokens ni de comportamiento.**

Lo que aportó el screen **desktop**: la anatomía de la `AppSidebar` (cabecera de workspace →
grupos con encabezado → items con icono + label + badge de contador → pie), la del `TopBar`
(acciones a la derecha, avatar con iniciales, separador ligero), la del `Breadcrumb` (separador
chevron + página actual en peso fuerte) y la fila de status badges y alerts.

Lo que aportó el screen **móvil**: el drawer a pantalla parcial con cabecera (título + cierre) y
bloque de cuenta al pie, el patrón de chips de filtro que envuelven/scrollean, el empty state
centrado con acción a ancho completo y el tratamiento de alerts y toast a ancho completo.

Lo que **se descartó** de su HTML por contradecir la documentación aprobada:

| Valor Stitch | Motivo | Valor EventFlow usado |
|---|---|---|
| `primary: #683ec9`, `surface-tint: #6b41cc`, `primary-container: #815ae4` | Capa Material bajo los overrides de marca | `action.primary` `#7B4EE8` / `sidebar.item.active` `#F5F1FE` |
| `background: #fcf9f8`, `surface-container-*` | Paleta Material no aprobada | `background.default` `#FFFFFF`, `surface.subtle` `#FAFAFA` |
| `error: #ba1a1a`, `error-container: #ffdad6` | Familia no aprobada (UI-DEC-014) | `feedback.error.*` (`#DC2626` / `#FEF2F2` / `#FECACA`) |
| Material Symbols (`dashboard`, `event`, `notifications`, `menu`, `close`, `expand_more`, `tune`, `event_busy`, `auto_awesome`) | Segunda familia de iconos | `lucide-react` (`LayoutDashboard`, `Calendar`, `Bell`, `Menu`, `X`, `ChevronDown`, `SlidersHorizontal`, `CalendarX`, `Sparkles`) |
| Font Awesome (`fa-calendar-check`, `fa-magnifying-glass`) | Tercera familia de iconos | `lucide-react` |
| Inter para headings (`font-headline-*` con familia Inter Tight sólo en algunos roles) | UI-DEC-004 separa headings | `font-heading` (Inter Tight) / `font-body` · `font-ui` (Inter) |
| `darkMode: "class"` | UI-DEC-013 | Light theme únicamente |
| **Bottom navigation bar fija** (screen móvil) | CMP-DEC-021 y Component Foundations §36 prohíben patrones nativos móviles | `MobileNavigationDrawer` como única navegación primaria en mobile |
| **Buscador global** en el `TopBar` | Sin requisito de producto que lo respalde | No se añadió; `TopBar` lo permitiría por composición si un US lo aprueba |
| Punto rojo permanente en el icono de notificaciones | Señal de "no leídas" sin dato detrás | `NotificationBadge` sólo aparece con `count > 0` |
| Rutas y labels inventados (`Catálogo`, `Configuración`, `Resource Management & Allocation System`) | El documento prohíbe inventar navegación | `ORGANIZER_NAV_ITEMS` / `VENDOR_NAV_ITEMS` / `ADMIN_NAV_GROUPS` existentes, sin cambios |
| `bg-lilac-tint` como superficie de alerta AI | Lila es decorativo, nunca feedback (UI-DEC-002) | `ai.*` para superficies AI; `feedback.*` para estados |
| `w-2 h-2` para el indicador de estado | El color no puede ser la única señal | Badge con número o `StatusBadge` con texto |

## 4. Documentation read

Leídos completos antes de implementar: `EventFlow-UI-Foundations.md` (899 líneas),
`EventFlow-Design-Tokens.md`, `EventFlow-Component-Foundations.md` (2 106),
`EventFlow-Stitch-Foundations-Frontend-Validation.md`,
`EventFlow-Frontend-Design-Tokens-Implementation.md` (332) y
`EventFlow-Actions-Forms-Components-Implementation.md` (455).

Inspeccionados además: los 4 layouts de route group (`(app)`, `(admin)`, `(auth)`, `(public)`),
`shared/navigation/**` (11 archivos), `shared/design-system/**`, `shared/design-tokens/**`,
`shared/i18n/**`, `shared/ui/`, `tailwind.config.ts`, `globals.css`, los 4 catálogos de
`messages/`, `.eslintrc.cjs`, `vitest.config.ts`, las suites `tests/unit/navigation/`,
`tests/a11y/` y los specs E2E de layouts, más los consumidores de feedback existentes.

## 5. Existing navigation inventory

| Patrón existente | Dónde | Clasificación | Resultado |
|---|---|---|---|
| `Topbar` (hamburguesa + logo + acciones) | `shared/navigation/Topbar.tsx` | **Normalize** | Delega en `TopBar` del DS; conserva qué monta |
| `Sidebar` (modo plano y agrupado) | `shared/navigation/Sidebar.tsx` | **Normalize** | Delega en `AppSidebar`; misma API de props |
| `MobileNav` (Headless UI `Dialog`) | `shared/navigation/MobileNav.tsx` | **Normalize** | Delega en `MobileNavigationDrawer`; gana título accesible, pie de cuenta y objetivos táctiles |
| `NavLink` | `shared/navigation/NavLink.tsx` | **Normalize** | Wrapper sobre `SidebarItem`; API previa intacta |
| `UserMenu` (Headless UI `Menu` + sesión) | `shared/navigation/UserMenu.tsx` | **Normalize** | La presentación pasa al DS; queda sesión + `profileHrefForRole` + logout |
| `NotificationsBadge` (placeholder) | `shared/navigation/NotificationsBadge.tsx` | **Normalize** | Pasa a `NotificationButton`; se retira el punto rojo fijo |
| `LanguageSelector` (Headless UI `Listbox` + `useLocaleSwitcher`) | `shared/i18n/LanguageSelector.tsx` | **Extend** | La vista pasa al DS; `next-intl`, optimistic UI y rollback intactos |
| `SkipLink`, `Logo`, `Footer` | `shared/navigation/` | **Reuse as-is** | Sin cambios |
| Layout `(admin)` con sidebar + drawer | `app/(admin)/layout.tsx` | **Replace safely** | Adopta `AppShell` |
| Layout `(app)` **sin sidebar desktop** | `app/(app)/layout.tsx` | **Replace safely** | Adopta `AppShell` **y suma la sidebar que faltaba** |
| Headers de `(auth)` y `(public)` | `app/(auth)/layout.tsx`, `app/(public)/layout.tsx` | **Out of scope** | No son el shell autenticado; `TopBar` está pensado para plataforma |
| Definición de navegación (`navItems.ts`) | `shared/navigation/navItems.ts` | **Reuse as-is** | Rutas, grupos, iconos y claves i18n **sin ningún cambio** |
| `Pagination`, `PageSizeSelector` | `shared/ui/` | **Reuse as-is** | Fuera del grupo de esta tarea |
| Paneles de filtros por feature (`ReviewFiltersPanel`, `AdminEventFiltersPanel`, `VendorFiltersPanel`, `AdminActionsFiltersPanel`, `EventFilters`, `TaskFilters`, `VendorFilters`) | 7 archivos | **Normalize** | `FilterBar` + `AppliedFilterChip`; migrado 1 (los 6 restantes, diferidos) |
| Breadcrumb | — | **Feature-specific → creado** | No existía ninguno en el repositorio |
| Bottom tab bar | Sólo en el screen Stitch | **Out of scope** | Prohibido por CMP-DEC-021 |

Problemas encontrados en el inventario:

1. **Sidebar duplicada de facto**: `Sidebar.tsx` y `MobileNav.tsx` repetían el bloque de grupos +
   `<ul>` + `NavLink` con las mismas clases; cualquier cambio había que hacerlo dos veces.
2. **Estilo de ruta activa duplicado** en los mismos dos archivos.
3. **`(app)` sin sidebar de desktop** — desviación real de UI-DEC-008.
4. **Objetivos táctiles por debajo de 44 px** en los items de navegación (`px-3 py-2` ≈ 36 px).
5. **Estado activo dependiente sólo del color** (`bg-sidebar-item-active` + `font-medium`).
6. **Icon button sin `aria-controls`** en la hamburguesa; el drawer no tenía título accesible.
7. **Punto de notificaciones sin dato detrás** (señal falsa de no leídas).
8. **`uppercase tracking-wide`** en los encabezados de grupo, con `text-caption` (12 px): límite de
   legibilidad; se conserva por paridad visual pero queda anotado.

## 6. Existing feedback inventory

| Patrón existente | Dónde | Clasificación | Resultado |
|---|---|---|---|
| `EventStatusBadge` (`bg-neutral/green/blue/red-100`) | `features/events/` | **Normalize** | Diferido: su test fija `bg-blue-100`/`text-blue-800` y su E2E depende del `role="status"`; migrar requiere decidir el tono de `completed` (§14 lo pone en neutral, hoy es info) |
| `VendorStatusBadge` (`blue/emerald/red/amber-50`) | `features/admin/vendors/` | **Replace safely** | **Migrado** a `StatusBadge` |
| `StatusBadge` de quotes (`amber/blue/emerald/neutral/red-100` + `ring`) | `features/quotes/` | **Normalize** | Diferido |
| `AdminActionBadge`, `ReadOnlyBadge`, `QRLimitBadge`, `UnreadBadge` | admin / quotes / notifications | **Normalize** | Diferidos |
| `AIBadge` | `features/ai/event-plan/` | **Reuse as-is** | Ya migrado a `ai.*` en PB-P2-027; es familia AI, no feedback genérico |
| `EmptyBudgetState` (borde punteado + 2 links `purple-700`) | `features/budget/` | **Replace safely** | **Migrado** a `EmptyState` + `TextLink` |
| `EmptyChecklistState` (clases CSS propias `btn btn--primary`) | `features/tasks/` | **Normalize** | Diferido: depende de hojas de estilo propias fuera del sistema |
| `error.tsx` × 4 route groups (`role="alert"` + botón ad-hoc) | `app/**` | **Normalize** | Diferido |
| `loading.tsx` × 4 (`animate-pulse` + caja gris) | `app/**` | **Normalize** | Diferido a `Skeleton` |
| Página 403 (`<h1>` + link subrayado) | `app/(public)/403/` | **Replace safely** | **Migrado** a `PermissionDeniedState` |
| `ProgressBar` (`role="progressbar"` + `bg-emerald-600`) | `features/tasks/progress/` | **Normalize** | Diferido: formatea con `Intl` y tiene test dedicado (US-033) |
| Toast inline de `TaskStatusQuickToggle` | `features/tasks/quick-action/` | **Normalize** | Diferido: necesita provider/cola, no sólo el primitivo |
| ~134 archivos con `role="alert"` / `role="status"` ad-hoc | `src/**` | **Normalize** | Diferidos |
| 29 archivos con `animate-pulse` propio | `src/**` | **Normalize** | Diferidos |
| Sistema de toasts | — | **No existe** | Se implementa el primitivo `Toast`; la cola/portal se difiere (no se instaló ninguna librería) |

Problemas encontrados en el inventario:

1. **Estado comunicado sólo por color en varios badges** (sin icono, sólo texto y color).
2. **Colores de feedback inconsistentes**: `emerald` y `green`, `blue-50` y `blue-100`, `amber-50`
   y `amber-100` conviviendo para el mismo significado.
3. **`pending` con familia azul** en `VendorStatusBadge` cuando §14 lo asigna a warning.
4. **Empty states sin título** (`EmptyBudgetState` sólo tenía cuerpo).
5. **Toast como único canal de fallo** en el flujo de cambio de estado de tarea (riesgo
   CMP-DEC-022; el error se pierde al desvanecerse el aviso).
6. **Skeletons genéricos** que no representan la forma del contenido.
7. **`aria-live="polite"` permanente** en el `StatusBadge` de quotes: anuncia también en el render
   inicial.

## 7. Components reused

- `shared/design-tokens/**` — **no se creó ni modificó ningún token**.
- `shared/design-system/actions/**` — `Button`, `IconButton` y `TextLink` los consumen
  `MobileNavigationTrigger`, `FilterBar`, `ErrorState` y los consumidores migrados.
- `shared/design-system/internal/**` — `cx`, `a11y` y el glifo `Spinner` (el `Spinner` público lo
  envuelve; no se duplicó la animación ni el `motion-reduce`).
- `.focus-ring` / `.hit-area` de `globals.css` — **sin cambios en el CSS global**.
- `@headlessui/react` (ya instalado) — `Dialog` para el drawer, `Menu` para `UserMenu`, `Listbox`
  para `LanguageSelector`.
- `lucide-react`, `next/link`, `next-intl` — ya instalados.
- `shared/navigation/navItems.ts`, `SkipLink`, `Logo`, `Footer` — sin cambios.
- **Cero dependencias nuevas.**

## 8. Components extended

- `shared/navigation/{Topbar,Sidebar,MobileNav,NavLink,UserMenu,NotificationsBadge}.tsx` — pasan a
  ser adaptadores: conservan su API pública y su lógica (sesión, rutas por rol, logout, i18n) y
  delegan la presentación en el design system.
- `shared/i18n/LanguageSelector.tsx` — mantiene `useLocaleSwitcher`, el cambio optimista, el
  rollback y los `data-testid` previos; delega el control en el DS.
- `shared/design-system/index.ts` — añade los barriles `navigation` y `feedback`.
- `shared/design-system/README.md` — catálogo ampliado con los dos grupos nuevos.

## 9. Components created

`web/src/shared/design-system/navigation/`

| Archivo | Componente |
|---|---|
| `navigationModel.ts` | `NavigationItem` / `NavigationSection` — modelo compartido desktop ↔ mobile |
| `AppShell.tsx` | `AppShell` — composición del área autenticada |
| `AppSidebar.tsx` | `AppSidebar` — sidebar expandida de desktop (`lg+`) |
| `SidebarSection.tsx` | `SidebarSection` — grupo con título opcional/oculto |
| `SidebarItem.tsx` | `SidebarItem` — item con icono, label, badge y activo |
| `TopBar.tsx` | `TopBar` — barra superior con altura `layout.header.height` |
| `MobileNavigationTrigger.tsx` | `MobileNavigationTrigger` |
| `MobileNavigationDrawer.tsx` | `MobileNavigationDrawer` |
| `UserMenu.tsx` | `UserMenu` — presentacional |
| `LanguageSelector.tsx` | `LanguageSelector` — presentacional |
| `NotificationButton.tsx` | `NotificationButton` |
| `NotificationBadge.tsx` | `NotificationBadge` |
| `Breadcrumb.tsx` | `Breadcrumb` |
| `FilterBar.tsx` | `FilterBar` |
| `AppliedFilterChip.tsx` | `AppliedFilterChip` |

`web/src/shared/design-system/feedback/`

| Archivo | Componente |
|---|---|
| `Badge.tsx` | `Badge` — neutral / role / seed / count |
| `StatusBadge.tsx` | `StatusBadge` + `STATUS_BADGE_TONE` |
| `Alert.tsx` | `Alert` — info / success / warning / error |
| `InlineMessage.tsx` | `InlineMessage` — helper / info / success / warning / error |
| `Toast.tsx` | `Toast` |
| `EmptyState.tsx` | `EmptyState` — section / page |
| `ErrorState.tsx` | `ErrorState` — section / page |
| `PermissionDeniedState.tsx` | `PermissionDeniedState` |
| `Spinner.tsx` | `Spinner` — sm / md / lg |
| `Skeleton.tsx` | `Skeleton` — text / card / listRow / tableRow / navItem |
| `ProgressIndicator.tsx` | `ProgressIndicator` — determinate / indeterminate |

`web/src/shared/navigation/useNavigationSections.tsx` — adaptador aplicación ↔ design system
(`isNavItemActive` + `useNavigationSections`).

Decisiones de API relevantes:

- **Todo el copy llega por props**, incluidos los nombres accesibles (`ariaLabel`, `closeLabel`,
  `removeLabel`, `dismissLabel`, `retryLabel`). Los componentes son locale-agnósticos y compatibles
  con la regla `react/jsx-no-literals` del repositorio.
- **El modelo de navegación llega resuelto** (label traducido + `active` calculado). El design
  system no importa `next-intl` ni `usePathname`, y por tanto no puede inventar rutas ni permisos.
- **Regiones vivas opt-in** (`live`): `Alert`, `InlineMessage` y `EmptyState` sólo emiten
  `role="alert"` / `role="status"` cuando el consumidor declara que el mensaje aparece de forma
  dinámica. Evita anuncios redundantes en el render inicial.
- **`ErrorState` sólo acepta texto**: no hay prop que reciba un `Error`, la respuesta de la API ni
  `details` del envelope; por construcción no puede filtrar stack traces ni secretos.
- **`NotificationButton` recibe el nombre accesible completo** ya interpolado: el plural lo resuelve
  `next-intl`.
- **`FilterBar` no conoce ningún filtro de negocio**; los controles llegan por `children`.
- **Sin `class-variance-authority`**: mapas `Record<Variant, string>` + `cx()`, como en PB-P2-028.

## 10. Navigation data model

```text
navItems.ts                     useNavigationSections            design-system
NavItem { href, labelKey,   →   NavigationItem { href,       →   AppSidebar  (desktop, lg+)
          icon, exact }             label, icon, active,          MobileNavigationDrawer (mobile)
NavGroup { titleKey, items }        badge?, disabled? }
                                NavigationSection { id, label?, labelHidden?, items }
```

- La **fuente única** sigue siendo `navItems.ts`: `ORGANIZER_NAV_ITEMS`, `VENDOR_NAV_ITEMS` y
  `ADMIN_NAV_GROUPS` **no se tocaron** (mismas rutas, mismos grupos, mismos iconos, mismas claves).
- `useNavigationSections` resuelve traducción y ruta activa (`isNavItemActive` conserva la regla
  previa: `exact` compara el pathname completo, si no compara prefijo de ruta).
- `Sidebar` y `MobileNav` llaman **al mismo hook con la misma entrada**: no existe una segunda
  definición de navegación. Verificado por test (`navigation.test.tsx` compara los `href` de ambos)
  y por guardarraíl (`token-guardrails.test.ts`).

## 11. Responsive behavior

| Transformación | Implementación |
|---|---|
| `AppSidebar` → `MobileNavigationDrawer` | La sidebar es `hidden lg:flex`; el drawer y su trigger son `lg:hidden`. Breakpoint `lg` = 1024 px (`breakpoint.lg`) |
| `TopBar` desktop → mobile | Misma barra `h-header`; el trigger aparece por debajo de `lg`, y el bloque título/breadcrumb se oculta por debajo de `md` para no comprimir las acciones |
| `FilterBar` horizontal → apilada | `grid-cols-1` → `md:grid-cols-2` → `lg:grid-cols-3`; acciones `flex-col` → `sm:flex-row sm:justify-end`; `collapsible` colapsa los controles tras un disclosure por debajo de `lg` |
| Chips de filtro | `flex-wrap` en una `<ul>`: envuelven sin overflow horizontal |
| `UserMenu` en mobile | El nombre pasa a `sr-only` (sigue en el árbol de accesibilidad); el popup usa `max-w-[calc(100vw-2rem)]` |
| `LanguageSelector` en mobile | Trigger `min-h-touch`; opciones `min-h-touch`; popup acotado al viewport |
| Alerts y estados | `EmptyState` / `ErrorState` apilan sus acciones (`flex-col` → `sm:flex-row`) y limitan el texto a `max-w-form` |
| `StatusBadge` | Conserva siempre el texto; `truncate` sólo dentro del propio badge |
| Touch targets | `SidebarItem` `min-h-touch`; `MobileNavigationTrigger` e `IconButton` ≥ 44 × 44; chips y descartes con `.hit-area` o `min-h-touch` |
| Zoom 200 % / reflow | Tipografía en `rem`, sin anchos fijos; `AppShell` usa `overflow-x-clip` para que el shell nunca provoque scroll horizontal de página |
| Labels traducidos largos | `SidebarItem` envuelve (`break-words`) en lugar de recortar: ningún destino pierde su nombre |

Desktop y mobile usan **la misma API de componente** (`NavigationSection[]`) y **los mismos datos**.

**No validado en navegador**: la comprobación visual a 200 % de zoom, el reflow real y el drawer en
dispositivo táctil quedan como verificación no bloqueante (§19). Los tests corren en jsdom, que no
aplica CSS.

## 12. Accessibility decisions

1. **Landmarks**: `AppShell` monta un único `<main id="main-content">` destino del skip link;
   `AppSidebar` y el drawer exponen `<nav>` con nombre accesible propio; el `TopBar` es `<header>`.
2. **Ruta activa**: `aria-current="page"` **más** peso tipográfico **más** barra de acento — tres
   señales, ninguna de ellas sólo color (UI-DEC-014 / §37).
3. **Grupos de navegación**: `<section aria-labelledby>` + `<h2>` + `<ul>`/`<li>`. Con
   `labelHidden` el encabezado pasa a `sr-only` y el grupo **conserva** su nombre accesible.
4. **Drawer**: `Dialog` de Headless UI aporta focus trap, `Escape`, clic fuera, retorno del foco al
   trigger y bloqueo del scroll del body. Se añade `DialogTitle` (nombre accesible del diálogo) y
   `aria-controls`/`aria-expanded` en el trigger. Los cuatro comportamientos están testeados.
5. **`UserMenu` sin `aria-label` en el trigger**: el nombre accesible se compone de un texto
   `sr-only` («Menú de usuario») más el nombre visible de la sesión. Un `aria-label` habría
   **ocultado** el nombre visible al lector de pantalla y roto el selector del E2E de logout.
6. **Contadores anunciados una sola vez**: el número es `aria-hidden` y la descripción va en un
   `sr-only`; `NotificationButton` recibe el nombre completo ya interpolado.
7. **Regiones vivas opt-in**: sin `live` no hay `role="alert"`/`role="status"`. Un `Alert` presente
   desde el render inicial no debe anunciarse.
8. **`Toast` no es el único canal de error crítico** (CMP-DEC-022): documentado en el componente y
   verificado por un test que monta `Alert` persistente + `Toast` a la vez.
9. **`Spinner` con `role="status"` + `aria-label`**: el rol `status` no toma nombre del contenido,
   así que el label se expone también como `aria-label`. Sin label el spinner es decorativo.
10. **`Skeleton` siempre `aria-hidden`**: el estado de carga lo comunica la región contenedora.
11. **`ProgressIndicator` indeterminado omite `aria-valuenow`** y no simula porcentaje.
12. **Touch targets ≥ 44 px** en todos los controles de navegación (items incluidos).
13. **Reduced motion**: `motion-reduce:animate-none` en spinner, skeleton y barra indeterminada;
    las transiciones usan los tokens de motion que `globals.css` ya colapsa a 0 ms.
14. **`PermissionDeniedState` no acepta identificador del recurso**: por API no puede confirmar su
    existencia.
15. **Sin ARIA redundante**: no se añade `role="navigation"` a `<nav>` ni `role="list"` a `<ul>`; el
    grupo de chips es una `<ul>` real para que `aria-label` sea expuesto.

Resultado axe-core sobre los dos catálogos completos (shell, menú abierto, drawer abierto y
feedback): **0 violaciones de cualquier severidad**, no sólo 0 críticas.

## 13. Token usage

| Aspecto | Utilidades semánticas consumidas |
|---|---|
| Sidebar | `bg-sidebar-item-active` · `text-sidebar-item-active` · `bg-sidebar-item-hover` · `w-sidebar` |
| Layout | `h-header` · `max-w-content` · `max-w-form` · `p-page-mobile` / `md:p-page-tablet` |
| Superficie / borde | `bg-surface` · `bg-surface-subtle` · `bg-surface-elevated` · `bg-surface-disabled` · `border-subtle` · `border-default` |
| Acción | `bg-action-primary` · `text-action-primary-foreground` · `hover:bg-action-ghost-hover` · `bg-action-secondary-hover` |
| Feedback | `bg-feedback-{success,warning,error,info}` · `border-feedback-*` · `text-feedback-*` · `text-feedback-*-icon` · `bg-feedback-error-strong` |
| Texto | `text-primary` · `text-secondary` · `text-muted` · `text-disabled` · `text-inverse` · `text-link` · `text-link-hover` |
| Foco | `.focus-ring` (`ring-focus`, `ring-offset-focus`) |
| Forma | `rounded-button` · `rounded-card` · `rounded-badge` · `rounded-sm` |
| Elevación | `shadow-surface-subtle` · `shadow-overlay-dropdown` · `shadow-overlay-modal` |
| Tipografía | `font-heading` · `font-body` · `font-ui` · `text-h2/h3` · `text-body-md/sm` · `text-label` · `text-caption` · `tracking-ef-wide` |
| Tamaño / táctil | `min-h-touch` · `min-w-touch` · `h-icon-sm/md/lg` · `.hit-area` |
| Motion | `duration-fast` · `duration-standard` · `ease-standard` · `motion-reduce:animate-none` |
| Capas / overlay | `z-drawer` · `bg-scrim-light` |

Verificado por test: **0 utilidades de paleta cruda, 0 hex/rgb literales, 0 `dark:`, 0 temas por
rol y 0 iconos fuera de Lucide** en todo `shared/design-system/`.

## 14. Tests added or updated

**Añadidos — 119 tests en 3 archivos:**

| Archivo | Tests | Cobertura |
|---|---|---|
| `src/tests/unit/design-system/navigation.test.tsx` | 49 | `SidebarItem` (activo/`aria-current`, señal no-color, label visible, badge con nombre accesible, contador 0, label largo, foco, disabled). `AppSidebar` (landmark, grupos, sólo los ítems recibidos, un único activo, `hidden`/`lg:flex`/`w-sidebar`, header/footer, label oculto con nombre). `MobileNavigationDrawer` (cerrado por defecto, apertura, título accesible, `Escape`, botón de cierre + retorno de foco, focus trap, bloqueo/restauración del scroll, ruta activa, pie). **Modelo compartido**: `Sidebar` y `MobileNav` producen los mismos `href`. `TopBar` (composición, `h-header`, trigger `lg:hidden`, sin buscador). `NotificationButton`/`NotificationBadge` (nombre con contador, 0, tope, táctil, loading, `href`). `UserMenu` (nombre del trigger, teclado, email/rol, destino recibido, logout, `Escape` + retorno de foco). `LanguageSelector` (locale actual, 4 locales en su idioma, selección, teclado, pending). `Breadcrumb`. `FilterBar`/`AppliedFilterChip`. `AppShell`. |
| `src/tests/unit/design-system/feedback.test.tsx` | 60 | `Badge` (4 variantes, no es control). `StatusBadge` (9 estados con texto, mapeo §14, icono + texto, `showIcon={false}`, `role="status"` opt-in). `Alert` (4 variantes, tokens de feedback sin lila/coral, `live` por severidad, descarte, acción). `InlineMessage` (helper sin glifo, 4 tonos, `live` + `id`). `Toast` (status vs alert, descarte, auto-dismiss, persistente, acción). `EmptyState` (acciones, nivel de heading, `live`, sin copy propio). `ErrorState` (alert + reintento, sin botón, correlation ID secundario, imposibilidad de filtrar traza, navegación segura). `PermissionDeniedState`. `Spinner` (label, visible, decorativo, 3 tamaños, reduced motion). `Skeleton` (5 variantes ocultas, repetición, reduced motion). `ProgressIndicator` (determinate, valor visible, indeterminate sin porcentaje, acotado, rango no-cero). Consumidores migrados (`EmptyBudgetState`, `VendorStatusBadge`). Regresión CMP-DEC-022. |
| `src/tests/a11y/design-system-navigation-feedback.axe.test.tsx` | 5 | axe sobre el shell completo, con el menú de usuario abierto, con el drawer abierto y sobre el catálogo de feedback; más verificación de nombre accesible en todos los controles. Umbral endurecido a **0 violaciones de cualquier severidad**. |

**Actualizados (sin debilitar ninguna aserción):**

- `src/tests/unit/design-system/token-guardrails.test.ts` — se añaden 5 guardarraíles: catálogo de
  Navigation & Feedback presente (25 archivos), ninguna librería de toasts/navegación/iconos nueva,
  desktop y mobile comparten `navigationModel`, el drawer conserva la primitiva con focus trap, y el
  estado semántico nunca usa lila ni coral. Las 7 aserciones previas quedan intactas.
- `src/tests/unit/design-tokens/integration.test.ts` — el test «el shell de navegación consume
  tokens semánticos» **conserva las mismas aserciones** (`bg-sidebar-item-active`,
  `text-sidebar-item-active`, `focus-ring`, ausencia de `primary-50`, `w-sidebar`, `border-subtle`)
  y las apunta al archivo que ahora consume cada token (`SidebarItem.tsx` / `AppSidebar.tsx`),
  añadiendo que `NavLink` delega en `SidebarItem`.
- `src/tests/e2e/layouts.role.spec.ts` — las tres aserciones de sidebar se acotan al landmark
  `getByRole('navigation', { name: … })`. Es un **endurecimiento**: antes cualquier enlace de la
  página podía satisfacerlas; ahora deben venir de la navegación. Necesario porque `(app)` ya monta
  la sidebar de desktop y los mismos labels pueden aparecer también en el contenido.

Total de la suite tras la tarea: **141 archivos / 1 122 tests en verde, 1 skipped** (antes: 138 /
1 003).

## 15. Existing consumers migrated

| # | Consumidor | Área | Componentes adoptados | Cobertura previa |
|---|---|---|---|---|
| 1 | `app/(admin)/layout.tsx` | Shell autenticado admin (desktop) | `AppShell`, `AppSidebar` (vía `Sidebar`), `TopBar`, `Badge` | `tests/e2e/layouts.role.spec.ts`, `routing.role-guard.spec.ts` |
| 2 | `app/(app)/layout.tsx` | Shell autenticado organizer / vendor (desktop **y** mobile) | `AppShell`, `AppSidebar`, `MobileNavigationDrawer`, `TopBar`, `Badge` | `tests/e2e/layouts.role.spec.ts`, `layouts.mobile.spec.ts`, `routing.app-guard.spec.ts` |
| 3 | `features/admin/reviews/components/ReviewFiltersPanel.tsx` | Filtros de lista admin | `FilterBar`, `AppliedFilterChip`, `InlineMessage` | `tests/unit/us077-review-filters-panel.test.tsx` (7 tests, sin editar) |
| 4 | `features/budget/view/components/EmptyBudgetState.tsx` | Estado vacío de página | `EmptyState`, `TextLink` | `tests/unit/budget/us035-us036-budget-components.test.tsx` (sin editar) |
| 5 | `features/admin/vendors/components/VendorStatusBadge.tsx` | Consumidor de status badge | `StatusBadge` | Cubierto vía `VendorModerationTable` |
| 6 | `app/(public)/403/page.tsx` | Estado de permiso denegado | `PermissionDeniedState`, `TextLink` | `tests/contract/authorization-errors.test.ts` |

Más la **normalización** de 7 componentes compartidos (`Topbar`, `Sidebar`, `MobileNav`, `NavLink`,
`UserMenu`, `NotificationsBadge`, `i18n/LanguageSelector`), que no son adopciones nuevas sino la
reescritura de los existentes sobre el design system conservando su API.

Preservado en todos: rutas, grupos de navegación, guards, permisos, visibilidad por rol, sesión,
comportamiento de `next-intl`, contratos de API, claves de localización existentes y todos los
tests previos. **Ninguna ruta, regla de autorización ni contrato cambió.**

Cambios visibles deliberados, todos derivados de la documentación aprobada:

1. **`(app)` gana la sidebar de desktop** que le faltaba (UI-DEC-008). Mismos destinos, mismo
   modelo, ningún permiso nuevo.
2. **Contexto de workspace** en la cabecera de la sidebar: `Badge` con el rol (UI-DEC-009 lo pide
   explícitamente: la diferenciación por rol se hace con badge y título de workspace, no con color).
3. **`VendorStatusBadge` `pending` pasa de azul a warning** (Component Foundations §14).
4. **Se retira el punto rojo fijo** del icono de notificaciones: era una señal de "no leídas" sin
   dato detrás.
5. **El drawer gana título accesible, pie de cuenta y objetivos táctiles de 44 px**.
6. **`ReviewFiltersPanel` gana chips de filtros aplicados** — la pieza que faltaba respecto de §24.

Claves i18n **añadidas** (ninguna modificada ni eliminada), en los 4 locales:
`navigation.mobile.title`, `navigation.userMenu.label`, `navigation.userMenu.role.{organizer,vendor,admin}`,
`navigation.workspace.{organizer,vendor,admin}`, `admin.review.panel.filters.appliedFilters`,
`admin.review.panel.filters.removeFilter`, `budget.empty.title`, `errors.forbidden.body`.

## 16. Commands executed

Comandos descubiertos en `web/package.json` y ejecutados desde `web/`:

| Comando | Resultado |
|---|---|
| `npx prettier --check` sobre los archivos de esta tarea | ✅ conformes |
| `npx next lint --max-warnings=0` (`npm run lint`) | ✅ sin warnings ni errores |
| `npx tsc --noEmit` (`npm run typecheck`) | ✅ sin errores |
| `npx vitest run` (`npm run test`) | ✅ **141 archivos / 1 122 tests pasan, 1 skipped** |
| `npx vitest run src/tests/unit/design-system` (component tests) | ✅ 185 tests |
| `npx vitest run src/tests/a11y` (`npm run test:a11y`) | ✅ suites de accesibilidad en verde, incluida la nueva |
| `npm run build` (`next build`) | ✅ compila; 40 rutas emitidas |

No se usó `--force` ni se suprimió ningún fallo.

`npm run test:e2e` (Playwright) **no se ejecutó**: requiere levantar el servidor y, en varios specs,
un backend demo con seed (`E2E_DEMO_READY`). Está fuera del gate de esta tarea; el único spec
tocado (`layouts.role.spec.ts`) se endureció, no se relajó.

## 17. Results

| Criterio | Estado |
|---|---|
| Ambos screens Stitch recuperados e inspeccionados (HTML + screenshot) | ✅ desktop y móvil |
| Inventario de navegación existente | ✅ 15 patrones clasificados + 8 problemas registrados |
| Inventario de feedback existente | ✅ 15 patrones clasificados + 7 problemas registrados |
| Componentes de navegación desktop implementados | ✅ 8 + modelo compartido |
| Navegación mobile responsive implementada | ✅ drawer propio, no la sidebar encogida |
| Desktop y mobile usan la misma configuración de navegación | ✅ verificado por test y por guardarraíl |
| Componentes de feedback implementados | ✅ 11 |
| Consumen los tokens EventFlow existentes | ✅ verificado por test |
| `lucide-react` sigue siendo la única librería de iconos | ✅ verificado por test |
| Accesibilidad WCAG 2.1 AA | ✅ 0 violaciones axe de cualquier severidad |
| Tests | ✅ 119 nuevos; 1 122 en total en verde |
| Consumidores representativos migrados | ✅ 6 |
| Sin cambios de rutas, permisos ni comportamiento de la aplicación | ✅ toda la suite previa pasa sin debilitar aserciones |
| Dependencias nuevas | ✅ ninguna |
| Implementation record | ✅ este documento |

## 18. Deferred consumers

En orden de valor sugerido:

1. **Paneles de filtros admin restantes** → `FilterBar` + `AppliedFilterChip`:
   `AdminEventFiltersPanel`, `VendorFiltersPanel`, `AdminActionsFiltersPanel`, `AdminUsersView`.
   Mismo patrón que el ya migrado; el más barato.
2. **Filtros de producto**: `EventFilters`, `TaskFilters`, `TaskRangeFilter`, `VendorFilters`,
   `NotificationsFilterToggle`.
3. **Status badges restantes** → `StatusBadge`: `EventStatusBadge` (requiere decidir el tono de
   `completed` — §14 lo pone en neutral y hoy es info — y actualizar su test de clases y su E2E),
   `StatusBadge` de quotes, `AdminActionBadge`, `ReadOnlyBadge`, `QRLimitBadge`, `UnreadBadge`,
   `QuoteStatusIndicator`.
4. **`error.tsx` de los 4 route groups** → `ErrorState`, y `app/not-found.tsx` →
   `NotFoundState` (aún sin implementar; ver §19).
5. **`loading.tsx` de los 4 route groups** y los 29 archivos con `animate-pulse` propio →
   `Skeleton` con la forma real del contenido.
6. **Estados vacíos restantes** → `EmptyState`: `EmptyChecklistState` (requiere retirar las clases
   CSS propias `btn btn--*`), listas de cotizaciones, notificaciones, directorio y ejecuciones AI.
7. **`ProgressBar` de tareas** → `ProgressIndicator` (conservando el formateo `Intl` de US-033).
8. **`Breadcrumb`**: no tiene aún ningún consumidor. El candidato natural es el detalle de vendor
   (`Directorio › Proveedor › Portafolio`) y el detalle de evento.
9. **Toast**: adoptar el primitivo en `TaskStatusQuickToggle` y en los flujos de mutación, una vez
   exista el provider/cola.
10. **Headers de `(auth)` y `(public)`**: podrían componerse con `TopBar`, aunque no son el shell
    autenticado y su anatomía es distinta.

## 19. Known limitations

1. **Validación visual en navegador pendiente** (no bloqueante): 200 % de zoom, reflow real, drawer
   en dispositivo táctil y la sidebar recién añadida en `(app)` sobre las vistas reales de organizer
   y vendor. Los tests corren en jsdom, que no aplica CSS.
2. **No hay provider ni cola de toasts.** `Toast` es el primitivo presentacional; el portal, el
   apilamiento, el `aria-live` de región compartida y la deduplicación dependen del grupo de
   overlays. Deliberadamente **no** se instaló ninguna librería.
3. **El "filter drawer" de mobile es un disclosure, no un `Drawer`.** `FilterBar` colapsa los
   controles con `aria-expanded`/`aria-controls` manteniendo visibles búsqueda, chips y acciones. El
   `Drawer` completo requiere la primitiva de overlay, fuera del alcance de esta tarea.
4. **`NotFoundState` no se implementó**: el prompt de esta tarea no lo lista y `app/not-found.tsx`
   no era uno de los consumidores a migrar. Component Foundations §29 lo especifica; queda para el
   grupo de estados de página.
5. **La sidebar no es sticky.** Se conserva la arquitectura existente (hijo de un flex row, sin
   `position: sticky`). Hacerla sticky exige fijar también el `TopBar` y validar el resultado en
   navegador; queda diferido para no introducir un cambio visual sin verificación.
6. **`AppShell` no impone fondo ni padding**: cada route group conserva los suyos (`p-6` en admin,
   `flex` en `(app)`). Adoptar `bg-page` y el padding por breakpoint es un cambio visual que
   pertenece a la migración de vistas.
7. **`Badge` variante `seed` no tiene consumidor todavía**: existe porque el prompt la exige y UI
   Foundations §21 pide un indicador discreto de datos de demo, pero ninguna vista lo consume aún.
8. **Encabezados de grupo en `text-caption` (12 px) + `uppercase`**: se conserva la apariencia
   previa por paridad, aunque está en el límite de legibilidad. Revisarlo pertenece a una revisión
   de tipografía, no a esta migración.
9. **El estado activo de la sidebar sigue siendo prefijo de ruta** (`startsWith`) para los ítems sin
   `exact`. Es la regla previa, conservada sin cambios; puede marcar como activo un padre cuando se
   está en una subruta profunda.
10. **Deuda preexistente sin tocar**: siguen ~1 900 utilidades de paleta cruda en el resto de
    `src/**`, y `prettier --check` falla en archivos previos (el gate del repositorio es
    `npm run lint`, que no ejecuta Prettier). Los archivos de esta tarea sí están formateados.

## 20. Recommended next component group

**Overlays** (`Modal`, `ConfirmationDialog`, `Drawer`, `DropdownMenu`, `Popover`, `Tooltip`), por
este orden:

1. Es el grupo con más duplicación restante: cada diálogo de admin y de cotizaciones reimplementa
   su propio focus trap, `Esc`, scrim y banner de error (`ModerationDialog`,
   `VendorModerationDialog`, `SeedResetDialog`, `AddBudgetItemModal`, `RejectQuoteDialog`,
   `CancelQRDialog`, `CategoryFormDialog`, `EventTypeFormDialog`, `CreateTaskDialog`,
   `DeleteTaskDialog`, `CategoryInactiveErrorDialog`).
2. **Desbloquea las tres limitaciones de esta tarea**: el provider de `Toast`, el `Drawer` de
   filtros de `FilterBar` y el `Tooltip` que `IconButton` dejó pendiente en PB-P2-028.
3. Cierra CMP-Q-006 (Headless UI vs. Radix para overlays) con un caso de uso real; el repositorio ya
   usa Headless UI en `Dialog`, `Menu` y `Listbox`, así que la decisión tiene evidencia.
4. Desbloquea la migración de los formularios diferidos de PB-P2-028 §18, que en su mayoría viven
   **dentro** de un modal.

Después: **data-display** (`Card`, `MetricCard`, `Table` / `DataTable`, `Tabs`, `Accordion`,
`Timeline`, `DescriptionList`), que consumirá `EmptyState`, `ErrorState`, `Skeleton` y `StatusBadge`
ya implementados aquí; y por último la familia **AI**, que ya tiene su tratamiento de tokens y sólo
necesita consolidación de anatomía.

---

## Anexo — Trazabilidad

| Elemento | Referencia |
|---|---|
| Proyecto Stitch | `projects/10889252267442839867` |
| Screen desktop | `projects/10889252267442839867/screens/511d11caa1ee4f4dadcfe7abd69c3c10` |
| Screen móvil | `projects/10889252267442839867/screens/ebfb2eca245b4024bead6d26983a26ce` |
| HTML desktop | `projects/10889252267442839867/files/1336259527005398068` (13 703 bytes, leído íntegro) |
| HTML móvil | `projects/10889252267442839867/files/12262933412530581984` (21 727 bytes, leído íntegro) |
| Screenshot desktop | `projects/10889252267442839867/files/6999815845618749887` (inspeccionado) |
| Screenshot móvil | `projects/10889252267442839867/files/15934038475801718033` (inspeccionado) |
| Catálogo de uso | `web/src/shared/design-system/README.md` |
| Modelo de navegación | `web/src/shared/navigation/navItems.ts` (sin cambios) + `web/src/shared/navigation/useNavigationSections.tsx` |
| Tokens consumidos | `web/src/shared/design-tokens/` (sin modificar) |

**Stitch se utilizó como evidencia visual de anatomía, layout, proporciones, variantes, estados y
composición responsive. No es autoridad de tokens, tipografía, iconografía, accesibilidad,
navegación, permisos ni arquitectura frontend.** Cuando divergió de la documentación aprobada,
prevaleció el valor EventFlow (§3).
