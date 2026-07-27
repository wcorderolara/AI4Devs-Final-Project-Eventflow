# EventFlow — Main Authenticated Layout · Implementation Record

| Campo | Valor |
|---|---|
| Documento | EventFlow — Main Authenticated Layout Implementation Record |
| Versión | 1.0 |
| Fecha | 2026-07-25 |
| Alcance | Shell autenticado reutilizable de `organizer`, `vendor` y `admin`: resolución del rol desde la sesión, modelo de navegación centralizado por rol, integración en el App Router y bloque de identidad en la navegación. **No** incluye páginas de feature, rutas nuevas ni cambios de autorización backend. |
| Estado | Completado — lint, typecheck, tests unit/integration/a11y, build y E2E de layout en verde |
| Input aprobado | `EventFlow-UI-Foundations.md` (UI-DEC-008, UI-DEC-009) · `EventFlow-Component-Foundations.md` §20 · `EventFlow-Design-Tokens.md` · `EventFlow-Navigation-Feedback-Components-Implementation.md` · `DEVELOPMENT_CONVENTIONS.md` |

---

## 1. Purpose

PB-P2-029 llevó el shell autenticado a los componentes del design system (`AppShell`,
`AppSidebar`, `TopBar`, `MobileNavigationDrawer`) y sumó la sidebar de desktop al route group
`(app)`. Quedaron abiertos tres puntos que esta tarea cierra:

1. **El rol se deducía de la URL.** `(app)/layout.tsx` elegía el menú con
   `pathname.startsWith('/vendor')`, de modo que la navegación dependía del destino y no de quién
   había iniciado sesión.
2. **Se pintaban dos sidebars en desktop.** `(app)/organizer/layout.tsx` y
   `(app)/vendor/layout.tsx` seguían montando su propia `<Sidebar>` dentro del shell que ya
   montaba una, produciendo dos landmarks `<nav>` con el mismo nombre accesible.
3. **No había una resolución tipada y única de "qué ve cada rol".** Tres constantes sueltas se
   seleccionaban ad-hoc en JSX.

## 2. Stitch screen inspected

| Recurso | Identificador |
|---|---|
| Proyecto | `projects/10889252267442839867` — "EventFlow AI Planning Workspace" |
| Screen | `projects/10889252267442839867/screens/d1d8a7612a6a41ba84a183ec9a53f434` — "EventFlow - Layout Principal (Base)" (DESKTOP, 2560 × 2048) |
| HTML | `projects/10889252267442839867/files/062d45b05d9b4c7a9ef10f44e83b9265` — descargado (10 758 bytes) y leído íntegro |
| Screenshot | `projects/10889252267442839867/files/1d39dd9644ca427c914a299a379bd18e` — descargado (2560 × 2048) e inspeccionado |
| Screen móvil | No existe para este layout: el proyecto sólo publica la variante DESKTOP |

Los ficheros temporales se inspeccionaron fuera del árbol de fuentes y se eliminaron al terminar.
**Ningún recurso alojado por Stitch se referencia desde producción.**

Lo que aportó el screen: la anatomía del shell (sidebar fija a la izquierda con marca arriba,
navegación en el centro y **tarjeta de identidad al pie**; header con acciones a la derecha —
notificaciones con marca de no leídas y avatar de cuenta—; área de contenido con su propio
padding). Esa tarjeta de identidad al pie es la única pieza estructural que el shell aún no
montaba.

## 3. Existing implementation inventory

Todo lo relevante ya existía; la tarea es de integración, no de construcción.

| Responsabilidad | Módulo existente | Decisión |
|---|---|---|
| Shell principal | `shared/design-system/navigation/AppShell.tsx` | Reutilizado sin cambios |
| Sidebar desktop | `shared/design-system/navigation/AppSidebar.tsx` (+ `SidebarSection`, `SidebarItem`) | Reutilizado sin cambios |
| Drawer mobile | `shared/design-system/navigation/MobileNavigationDrawer.tsx` | Reutilizado sin cambios |
| Trigger del drawer | `shared/design-system/navigation/MobileNavigationTrigger.tsx` | Reutilizado sin cambios |
| Topbar | `shared/design-system/navigation/TopBar.tsx` | Reutilizado sin cambios |
| Menú de cuenta | `shared/design-system/navigation/UserMenu.tsx` + `shared/navigation/UserMenu.tsx` | Reutilizado sin cambios |
| Notificaciones | `shared/navigation/NotificationsBadge.tsx` → `NotificationButton` | Reutilizado sin cambios |
| Breadcrumb | `shared/design-system/navigation/Breadcrumb.tsx` | Reutilizado (slot ya disponible en `Topbar`; ninguna vista de esta tarea lo alimenta) |
| Marca | `shared/navigation/Logo.tsx` | Reutilizado sin cambios |
| Avatar | Iniciales en `UserMenu` del design system | Reutilizado; sin componente `Avatar` nuevo |
| Dropdown / sheet | `@headlessui/react` (`Menu`, `Dialog`) vía design system | Reutilizado sin cambios |
| Adaptador de navegación | `shared/navigation/useNavigationSections.tsx` | Reutilizado sin cambios |
| Rol y sesión | `shared/authorization/types.ts` (`Role`, `isRole`, `COOKIE_ROLE`) · `shared/auth-session/useSession.ts` | Reutilizados; **no** se creó un segundo modelo de rol |
| Guard de routing | `shared/authorization/roleGuardMiddleware.ts` | Sin cambios |

**Ningún componente nuevo del design system.** No se introdujo Font Awesome, ni una segunda
librería de iconos (`lucide-react` se conserva), ni un segundo sistema de tokens, ni Server
Actions, ni otro estado global.

## 4. Components created

| Archivo | Por qué no bastaba lo existente |
|---|---|
| `shared/navigation/roleNavigation.ts` | No existía ninguna función que, dado un rol, devolviera la navegación permitida. La selección vivía dispersa en JSX y se hacía por URL. Es lógica de aplicación (rutas y permisos), así que no puede vivir en el design system, que es deliberadamente agnóstico de rutas. |
| `shared/navigation/AuthenticatedShell.tsx` | La composición del shell estaba **duplicada** en `(app)/layout.tsx` y `(admin)/layout.tsx`, cada una con su propia lógica de rol. Se unifica en un solo componente cliente, consistente con UI-DEC-008 (un único shell). |
| `shared/navigation/SidebarAccount.tsx` | El bloque de identidad al pie de la navegación no existía. Se monta en los slots `footer` que `AppSidebar` y `MobileNavigationDrawer` **ya exponían** y que nadie usaba, así que es composición pura sin primitiva nueva. |

## 5. Components extended

Dos extensiones mínimas y retrocompatibles:

| Archivo | Cambio |
|---|---|
| `shared/navigation/Sidebar.tsx` | Nueva prop opcional `footer`, propagada al `footer` que `AppSidebar` ya soportaba. |
| `shared/navigation/Topbar.tsx` | `onMenuOpen` pasa a ser opcional; sin él no se monta el trigger del drawer (caso del shell sin navegación). |

## 6. Role resolution

Orden de resolución, implementado en `AuthenticatedShell`:

1. `useSession().role` — lo que el backend afirmó en `GET /users/me`. **Es la autoridad.**
2. `initialRole` — claim UX de la cookie `eventflow_role`, leída **en el servidor** por el layout
   con `cookies()`. Es la misma señal que `roleGuardMiddleware` ya usa para permitir la entrada a
   la ruta, así que no añade una segunda fuente de verdad. Cubre el primer render y la hidratación:
   el HTML del servidor ya trae la navegación correcta, sin flash de opciones de otro rol.
3. Sin ninguna de las dos → `null` ⇒ **shell sin navegación**. Nunca se cae a `organizer`.

Cuando la sesión responde de forma definitiva que no hay rol (401 o rol no soportado), la
navegación desaparece: se falla cerrado. El claim de cookie sólo se conserva mientras la sesión
está cargando o ha fallado de forma transitoria (red / 5xx), para no vaciar la sidebar ante un
error recuperable.

El rol **no** se infiere de la URL, no se hardcodea, no se lee de query params y no vive sólo en
estado de cliente. El filtrado frontend es UX: el backend valida cada request y el middleware
protege el routing aunque la URL se escriba a mano (ADR-FE-003, BR-AUTH-009/010).

## 7. Navigation model

`NavItem` gana `allowedRoles: readonly Role[]`, declarado en **todas** las entradas.
`getRoleNavigation(role)` filtra por él y descarta las secciones que se quedan sin ítems visibles,
de modo que la exclusión entre roles es una propiedad del modelo y no de cada vista.

Organizer y vendor conservan su lista plana; admin conserva sus cinco grupos. Las entradas
repetidas entre roles con la misma responsabilidad (`notifications`, `profile`) se definen una vez
mediante factorías parametrizadas por área, y cada rol las coloca en su propio orden — se comparte
la definición sin imponer un orden común.

Las acciones de cuenta comunes a los **tres** roles (perfil, idioma, cerrar sesión) no se duplican:
viven una única vez en el `UserMenu` / `LanguageSelector` del `Topbar`.

### Entradas por rol

| Rol | Destinos |
|---|---|
| organizer | `/organizer`, `/organizer/events`, `/organizer/vendors`, `/organizer/notifications`, `/organizer/profile` |
| vendor | `/vendor`, `/vendor/profile`, `/vendor/portfolio`, `/vendor/services`, `/vendor/quotes`, `/vendor/reviews`, `/vendor/notifications` |
| admin | `/admin/metrics` · `/admin/events`, `/admin/categories`, `/admin/event-types` · `/admin/vendors`, `/admin/reviews` · `/admin/users` · `/admin/admin-actions`, `/admin/seed` |
| comunes (`UserMenu`) | Mi perfil (destino según rol), idioma, cerrar sesión |

Los destinos son exactamente los que ya existían: **no se añadió ni se inventó ninguna ruta**, y
todos corresponden a `page.tsx` reales. Rutas existentes deliberadamente ausentes del menú porque
son sub-vistas contextuales y no destinos de primer nivel: `/organizer/events/[eventId]/**`
(tasks, budget, quotes, compare, ai/*), `/vendor/quotes/[id]/**`, `/vendor/profile/edit/**`,
`/vendor/onboarding`, `/admin/events/[id]`. `/admin` no aparece porque redirige a `/admin/metrics`.

## 8. Layout hierarchy and component boundaries

```
app/layout.tsx                      Server — locale, fuentes, providers
└── (app)/layout.tsx                Server — lee eventflow_role, mainClassName="flex"
    └── AuthenticatedShell          Client — sesión, drawer, ruta activa
        ├── SkipLink / TopBar / AppSidebar / MobileNavigationDrawer
        └── (app)/organizer|vendor/layout.tsx   Server — sólo caja de contenido (p-6)
(admin)/layout.tsx                  Server — lee eventflow_role, mainClassName="p-6"
```

Los cuatro layouts del App Router pasan a ser **Server Components** (antes los cuatro eran
`'use client'`). La frontera cliente queda acotada a `AuthenticatedShell` y a los componentes que
ya eran clientes por interacción real (drawer, menús, ruta activa vía `usePathname`).

Los layouts anidados de `organizer` y `vendor` dejan de montar navegación y conservan
exactamente su contenedor de densidad (`p-6`), por lo que ninguna vista existente cambia de caja.

## 9. Responsive behavior

Desktop y mobile consumen **la misma** salida de `getRoleNavigation`; no hay menús separados.

- **Desktop (≥ lg)**: sidebar persistente (`w-sidebar`), estado activo visible, sin trigger de
  drawer, sin scroll horizontal de página.
- **Tablet / mobile (< lg)**: la sidebar se sustituye por el drawer. `Dialog` de Headless UI aporta
  focus trap, `Escape`, clic fuera, retorno de foco al trigger y bloqueo de scroll del body.
  Navegar cierra el drawer.

Verificado en 1440 / 834 / 390 px para los tres roles: un solo landmark de navegación en desktop,
`sidebarVisible=false` + trigger visible por debajo de `lg`, destinos del drawer idénticos a los de
la sidebar y `horizontalOverflow=false` en los nueve casos.

## 10. Accessibility

- Landmarks `header` / `nav` / `main` correctos y, tras retirar la sidebar duplicada, **un único**
  `<nav>` con cada nombre accesible.
- `aria-current="page"` en la ruta activa; el activo no depende sólo del color (peso tipográfico +
  marca vertical, ya aportados por `SidebarItem`).
- Nombre accesible en todos los controles sólo-icono (`Abrir menú`, `Notificaciones`, `Cerrar`).
- Los ítems no permitidos **no se renderizan**: no hay enlaces ocultos fuera de pantalla.
- El avatar del pie es `aria-hidden`; la identidad la aporta el nombre visible contiguo.
- Auditoría axe-core sin violaciones críticas para los tres roles, con y sin drawer abierto.

## 11. Internationalization

Ningún texto nuevo hardcodeado. Todas las etiquetas visibles y los nombres accesibles salen del
namespace `navigation` ya existente (labels, grupos, workspace, menú de usuario, drawer, skip
link). El bloque de identidad reutiliza `userMenu.role.*`, de modo que **no hizo falta añadir
claves** en ninguno de los cuatro locales (`es-LATAM`, `es-ES`, `pt`, `en`). Los tests renderizan
con los ficheros de mensajes reales de `es-LATAM` y `en`.

## 12. Stitch adaptations

| Decisión de Stitch | Resolución | Motivo |
|---|---|---|
| Buscador global en el header | Omitido | `TopBar` ya documenta el rechazo: no hay requisito de producto que lo respalde. |
| Botón de ayuda en el header | Omitido | No existe destino de ayuda implementado; no se crean páginas falsas. |
| Marca dentro de la sidebar | Se conserva en el `TopBar` | Composición ya aprobada en PB-P2-029; la cabecera de la sidebar lleva el badge de workspace que exige UI-DEC-009. |
| Tarjeta de identidad al pie de la sidebar | **Adoptado** | Cubre la responsabilidad "área de identidad" y usa slots ya existentes. |
| Punto rojo fijo de no leídas | Omitido | Sería una marca sin dato detrás; `NotificationButton` ya lo documenta y aceptará `count` cuando exista el contador real. |
| Iconos Material Symbols + Google Fonts por `<link>` | Sustituidos | `lucide-react` es la librería aprobada; las fuentes se auto-hospedan con `next/font`. |
| Paleta de **superficies** del cromo (lienzo, sidebar, hover, ítem activo) | **Adoptada** (revisión 2026-07-25, §16) | Es el look & feel aprobado del layout principal. Entra por la capa de tokens (`color.canvas` → `platform.*`), no como hex sueltos. |
| Resto de la config Tailwind del CDN (semánticos Material, tipografía, spacing) | Descartada | Se usan los tokens semánticos aprobados; la marca violeta ya está en el sistema. |
| Nav genérica (Users, Metrics, Inventory, Settings) | No propagada | `Inventory` y `Settings` no tienen ruta; `Users`/`Metrics` son de admin y ya existen en su menú. |
| Script de micro-interacción con `mousemove` | Descartado | Movimiento decorativo sin soporte de `prefers-reduced-motion`. |

## 13. Token correction — page background

Revisando el resultado visual se detectó que **`color.platform.page.background` no se aplicaba en
ningún componente**. Design Tokens §10 lo define como `neutral.50` (`#FAFAFA`) con un propósito
explícito: *"Background del content area para separar de las cards blancas"*. Estaba declarado en
`design-tokens/semantic.ts` (`background.page`, `platform.pageBackground`), expuesto en Tailwind
como `bg-page` y listado en el README de tokens — pero sin un solo consumidor, así que el área de
contenido se renderizaba blanca y las cards (`bg-surface`, blancas) no tenían separación.

Corregido en `AppShell`: el `<main>` pasa a `bg-page`, antes de `mainClassName` para que un
consumidor pueda sustituirlo. El cromo (topbar y sidebar) se queda en `bg-surface`. Verificado por
estilo computado en el navegador: `<main>` = `rgb(250,250,250)`, sidebar = `rgb(255,255,255)`.

El resto de superficies del shell ya eran correctas y **no se tocaron**: sidebar blanca
(`platform.sidebarBackground` = `neutral.0` — el fondo tintado de Stitch no está en la capa
aprobada), item activo `violet.50` + texto `violet.700` (7.1:1, AAA), badge de rol sobre
`surface.selected`. No se hardcodeó ningún color ni se introdujo ninguna paleta nueva.

> **Revisado el 2026-07-25 — ver §17.** El párrafo anterior refleja el estado en el momento de
> esta entrega. La decisión de mantener el cromo blanco quedó revertida: el fondo tintado del
> screen Stitch **sí** se incorpora, ahora como capa aprobada de tokens.

## 14. Tests added or updated

| Archivo | Contenido |
|---|---|
| `tests/unit/navigation/roleNavigation.test.ts` (nuevo) | Matriz de aislamiento por rol sin DOM: destinos exactos de cada rol, coherencia de `allowedRoles`, exclusión cruzada organizer/vendor/admin, rol ausente o no soportado → sin navegación. 9 casos. |
| `tests/unit/navigation/AuthenticatedShell.test.tsx` (nuevo) | Comportamiento público del shell: landmarks y `children`; navegación de los tres roles y sus exclusiones; acciones de cuenta comunes; la URL no decide el rol; ruta activa; claim del servidor durante la carga sin flash; sesión por encima del claim; rol desconocido; drawer (apertura, mismos destinos que desktop, cierre por botón, `Escape` y navegación); nombres accesibles; labels traducidos en `en`. 18 casos. |
| `tests/a11y/authenticated-shell.axe.test.tsx` (nuevo) | axe-core sobre el shell compuesto, tres roles × (desktop, drawer abierto). 6 casos. |
| `tests/unit/navigation/NavLink.test.tsx` | Fixture actualizada al nuevo `NavItem` (`allowedRoles`). |

Los E2E existentes (`layouts.role.spec.ts`, `layouts.mobile.spec.ts`) no necesitaron cambios y
pasan: la corrección de la sidebar duplicada elimina la ambigüedad de selector que arrastraban.

## 15. Commands executed

| Comando | Resultado |
|---|---|
| `npx prettier --check` (archivos tocados) | Verde tras `--write` |
| `npm run lint` | ✔ No ESLint warnings or errors |
| `npm run typecheck` | Verde |
| `npm run test` | **150 archivos / 1328 tests pasan**, 1 skipped |
| `npm run build` | Verde — 56 rutas compiladas |
| `npx playwright test layouts.role layouts.mobile` | 4 passed |
| `npx playwright test --grep @smoke` | 2 passed |
| Validación visual (Playwright, 3 roles × 3 anchos) | Verde — ver §9 |

## 16. Known limitations

- **Pre-existente, ajeno a esta tarea:** 6 E2E (`auth-logout.spec.ts` ×3, `i18n.detection`,
  `i18n.fallback`, `i18n.switcher`) fallan al recolectar con
  `Playwright Test did not expect test.use() to be called here`, síntoma de dos versiones de
  `@playwright/test` en el árbol de dependencias. Verificado en baseline: fallan igual con los
  cambios de esta tarea revertidos.
- **Pre-existente:** `prettier --check` reporta ~282 archivos del repositorio con formato
  divergente. Los archivos tocados aquí quedan formateados.
- El breadcrumb tiene slot en el `Topbar` pero ninguna vista lo alimenta todavía; alimentarlo es
  trabajo de cada feature, no del shell.
- La sidebar colapsable sigue fuera de alcance (CMP-DEC-005, Post-MVP).
- El contador real de notificaciones sigue pendiente del Future US que lo introduzca.

---

## 17. Revisión 2026-07-25 — adopción de la paleta de superficies de Stitch

### 17.1 Qué motivó la revisión

Revisión de producto sobre el screen Stitch *EventFlow - Layout Principal (Base)*: **el layout
implementado no reproducía sus colores**. El screen define el cromo con una rampa de grises
cálidos (lienzo `#FCF9F8`, sidebar `#F6F3F2`) e ítem de navegación activo **relleno** en violeta
con texto blanco; la implementación pintaba todo el cromo blanco (`neutral.0`), el lienzo en
`neutral.50` y el ítem activo como chip violeta claro.

**Causa:** decisión documentada, no defecto de código. §12 descartó "paleta y config Tailwind del
CDN" en bloque y §13 dejó constancia de que *"el fondo tintado de Stitch no está en la capa
aprobada"*. El criterio era correcto para los **semánticos** de Material (feedback, marca,
iconografía), pero arrastró con él las **superficies del cromo**, que son precisamente el look &
feel aprobado del layout principal. Esta revisión separa ambas cosas.

### 17.2 Alcance

Sólo el **cromo del shell autenticado**: lienzo de contenido, topbar, sidebar (fondo, pie,
hover, ítem activo) y drawer mobile. **No** cambian: cards, inputs, overlays, familias de
feedback, tratamiento de IA, marca violeta, tipografía, spacing, radios ni iconografía.

### 17.3 Tokens

Nuevo primitivo `color.canvas` (`primitives.ts`), transcrito del `tailwind.config` incrustado en
el HTML del screen:

| Token | Valor | Origen en Stitch |
|---|---|---|
| `canvas.bright` | `#FCF9F8` | `surface` / `background` / `surface-bright` |
| `canvas.low` | `#F6F3F2` | `surface-container-low` |
| `canvas.container` | `#F0EDED` | `surface-container` |
| `canvas.high` | `#EAE7E7` | `surface-container-high` |
| `canvas.highest` / `canvas.dim` | `#E4E2E1` / `#DCD9D9` | `surface-container-highest` / `surface-dim` |
| `canvas.outlineVariant` | `#CBC3D6` | `outline-variant` |
| `canvas.onSurface` / `canvas.onSurfaceVariant` | `#1B1C1C` / `#494454` | `on-surface` / `on-surface-variant` |

Semánticos afectados (`semantic.ts`), todos dentro de `platform.*` más `background.page`:

| Token | Antes | Ahora |
|---|---|---|
| `background.page` / `platform.pageBackground` | `neutral.50` `#FAFAFA` | `canvas.bright` `#FCF9F8` |
| `platform.headerBackground` | *(no existía; topbar en `surface`)* | `canvas.bright` `#FCF9F8` |
| `platform.sidebarBackground` | `neutral.0` `#FFFFFF` | `canvas.low` `#F6F3F2` |
| `platform.sidebarFooterBackground` | *(no existía)* | `canvas.container` `#F0EDED` |
| `platform.sidebarItemHover` | `alpha.hoverSubtle` | `canvas.high` `#EAE7E7` |
| `platform.sidebarItemActive` | `violet.50` `#F5F1FE` | `violet.600` `#7B4EE8` |
| `platform.sidebarItemActiveForeground` | `violet.700` | `neutral.0` `#FFFFFF` |
| `platform.chromeBorder` | *(no existía; `border-subtle`)* | `canvas.outlineVariant` `#CBC3D6` |

**El violeta de marca no se toca.** El screen usa `primary-container: #815AE4`; se consume
`violet.600` (`#7B4EE8`), que es el valor aprobado, visualmente equivalente y con mejor contraste
sobre blanco (5.12:1 frente a 4.66:1). No se introduce un segundo violeta en el sistema.

Utilidades Tailwind nuevas: `bg-page`, `bg-header`, `bg-sidebar`, `bg-sidebar-footer`,
`bg-sidebar-item-active-foreground`, `border-chrome`. Las custom properties equivalentes se
espejan en `globals.css` y el test de integración TS ↔ CSS las cubre.

### 17.4 Componentes tocados

| Componente | Cambio |
|---|---|
| `AppSidebar` | `bg-surface` → `bg-sidebar`; separadores `border-subtle` → `border-chrome`; pie con `bg-sidebar-footer`. |
| `TopBar` | `bg-surface` → `bg-header`; separador `border-chrome`. |
| `SidebarItem` | Píldora `rounded-card` (12 px); activo = relleno violeta + texto blanco + `shadow-surface-subtle`; reposo `text-secondary` con `hover:text-primary`; marca de acento invertida a blanco. |
| `MobileNavigationDrawer` | Mismo cromo que la sidebar de desktop. |
| `SidebarAccount` | Tarjeta blanca (`bg-surface` + `rounded-card` + `shadow-surface-subtle`) sobre el pie tintado, como en el screen. |
| `AppShell` | Sin cambios de clase (`bg-page` ya estaba); sólo se actualiza la nota que explicaba el cromo blanco. |

### 17.5 Accesibilidad

| Par | Contraste | Requisito |
|---|---|---|
| Texto blanco sobre ítem activo `#7B4EE8` | **5.12:1** | ✔ 4.5:1 (AA texto normal) |
| `text-secondary` `#525252` sobre sidebar `#F6F3F2` | **7.4:1** | ✔ AAA |
| `text-primary` `#262626` sobre lienzo `#FCF9F8` | **13.9:1** | ✔ AAA |
| `text-primary` sobre hover `#EAE7E7` | **11.8:1** | ✔ AAA |

El estado activo **sigue sin depender sólo del color** (UI-DEC-014): relleno + `font-semibold` +
marca vertical (ahora blanca sobre el relleno, antes invisible si se hubiera dejado violeta) +
`aria-current="page"`. El focus ring canónico y su offset blanco no cambian.

### 17.6 Verificación

| Comando | Resultado |
|---|---|
| `npm run lint` | ✔ No ESLint warnings or errors |
| `npm run typecheck` | Verde |
| `npm run test` (unit + a11y) | **128 archivos / 1233 tests** en verde |
| `npm run build` | Verde |
| Render con la config Tailwind real (Playwright, 1440 px) | Verde — cromo tintado, píldora violeta rellena, tarjeta de identidad blanca |

Tests actualizados o añadidos: `tokens.test.ts` (rampa `canvas.*` y `platform.*` fijados como
valores aprobados), `integration.test.ts` (nuevas custom properties TS ↔ CSS y consumo de
`bg-sidebar` / `bg-header` / `border-chrome`), `navigation.test.tsx` (marca de acento invertida).
