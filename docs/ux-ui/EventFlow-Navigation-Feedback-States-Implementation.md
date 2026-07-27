# EventFlow — Navigation, Feedback & States Components · Implementation Record

| Campo | Valor |
|---|---|
| Documento | EventFlow — Navigation, Feedback & States Components Implementation Record |
| Versión | 1.0 |
| Fecha | 2026-07-25 |
| Alcance | Verificación de deduplicación, extensión y normalización de los componentes de **Navigation**, **Feedback** y **States** ya existentes en `web/src/shared/design-system/`, más la adopción de 3 consumidores representativos. **No** se recrea ningún componente compartido existente. |
| Estado | Completado — format, lint, typecheck, tests, a11y y build en verde |
| Input aprobado | `EventFlow-UI-Foundations.md` · `EventFlow-Design-Tokens.md` · `EventFlow-Component-Foundations.md` · `EventFlow-Stitch-Foundations-Frontend-Validation.md` · `EventFlow-Frontend-Design-Tokens-Implementation.md` · `EventFlow-Actions-Forms-Components-Implementation.md` · `EventFlow-Navigation-Feedback-Components-Implementation.md` |
| Tarea previa | PB-P2-029 (`EventFlow-Navigation-Feedback-Components-Implementation.md`) |

---

## 1. Purpose

Usar el screen Stitch *«Component Design System (Navigation, Feedback & States — Full Height)»*
como **evidencia visual** para completar los componentes reutilizables de navegación, feedback y
estado de EventFlow.

La tarea previa (PB-P2-029) ya había implementado **los 22 componentes** que el screen representa.
Por tanto el trabajo real de esta tarea fue:

1. Inventariar cada componente del screen contra la implementación existente.
2. **No** crear ningún duplicado.
3. Extender los que carecían de estados o props exigidos.
4. Normalizar los que exponían semántica accesible incorrecta.
5. Añadir la cobertura de test que faltaba.
6. Adoptar los componentes en 3 consumidores representativos aún sin migrar.

**Resultado de la deduplicación: 0 componentes creados, 0 duplicados introducidos.** Se extendieron
6 componentes, se normalizaron 3 y se reutilizaron 16 sin cambios.

## 2. Stitch screen inspected

| Recurso | Identificador |
|---|---|
| Proyecto | `projects/10889252267442839867` — "EventFlow AI Planning Workspace" |
| Screen | `projects/10889252267442839867/screens/19e34fc844be45a39f7e86e00ae2980c` — "EventFlow — Component Design System (Navigation, Feedback & States - Full Height)" |
| Device | `DESKTOP`, 2560 × 5636 |

Es un screen **distinto** de los dos que inspeccionó PB-P2-029 (`511d11ca…` desktop y `ebfb2eca…`
móvil): añade la sección **3. Estados (States)** —empty, error, permission denied, spinners,
progreso y skeletons— que aquellos no cubrían, y muestra la sidebar a altura completa con
navegación scrollable y pie.

## 3. Resources retrieved

| Recurso | Detalle |
|---|---|
| Metadata del screen | `mcp__stitch__get_screen` — título, `deviceType`, dimensiones y URLs firmadas |
| HTML generado | Descargado con `curl -L` (27 567 bytes, 524 líneas) y **leído íntegro** |
| Screenshot | Descargado con `curl -L` (38 197 bytes) e **inspeccionado visualmente** |
| DESIGN.md / design system | No se volvió a solicitar: `EventFlow-Stitch-Foundations-Frontend-Validation.md` §2.1 ya inspeccionó las 3 versiones del design system Stitch y registró sus divergencias |

### Qué aportó el screen (anatomía y composición)

- **AppSidebar a altura completa**: cabecera de workspace → grupos con encabezado → items con
  icono + label + badge de contador → **navegación scrollable** → **pie de navegación**.
- **TopBar**: acciones a la derecha, avatar con iniciales, separador vertical, menú de usuario
  abierto con item enfocado y logout en familia de error.
- **FilterBar** en dos filas: búsqueda + selects arriba, **rango de fechas** + acciones abajo, y
  chips de filtros aplicados al pie.
- **Badges de metadata**: metadata neutra, rol, marcador de seed y contador circular.
- **Status badges**: `draft`, `active`, `completed`, `cancelled`, `warning`, `info`.
- **Alerts** con barra de acento lateral, icono, título, cuerpo, acción y descarte.
- **Inline messages** en cuatro tonos, una línea con glifo.
- **Toasts** con icono, texto y acción.
- **Empty state** centrado: glifo en círculo → título → descripción → acción primaria.
- **Permission denied** y **error de sección con correlation ID + reintento**.
- **Loading**: spinner suelto, spinner en botón, spinner inline con texto, barra determinada con
  porcentaje y barra indeterminada.
- **Skeleton de card**: círculo de avatar + dos líneas de texto.

### Qué se descartó de su HTML (Stitch no es autoridad)

| Valor Stitch | Motivo | Valor EventFlow usado |
|---|---|---|
| `primary: #683ec9`, `primary-container: #815ae4`, `surface-tint: #6b41cc` | Capa Material bajo los overrides de marca | `action.primary` (`bg-action-primary`), `sidebar.item.active` |
| `background: #fcf9f8`, `surface-container-*`, `inverse-surface: #303030` | Paleta Material no aprobada | `bg-surface`, `bg-surface-subtle`, `bg-surface-elevated` |
| `error: #ba1a1a`, `error-container: #ffdad6` | Familia no aprobada (UI-DEC-014) | `feedback.error.*` |
| Hex crudos en badges y alerts: `#dcfce7`/`#166534`, `#fef08a`/`#854d0e`, `#e0f2fe`/`#075985`, `#f3e8ff`/`#6b21a8`, `#dbeafe`/`#1e40af`, `#22c55e`, `#4ade80`, `#f87171` | Color literal copiado del generador | `feedback.{success,warning,info,error}.*`, `surface.selected`, `action.primary` |
| **`Completado` en verde** | Component Foundations §14 asigna `completed` → **neutral** | `STATUS_BADGE_TONE.completed = 'neutral'` (sin cambios) |
| Material Symbols (`dashboard`, `event`, `group`, `inventory_2`, `settings`, `notifications`, `info`, `check_circle`, `error`) | Segunda familia de iconos | `lucide-react` |
| Font Awesome (`fa-calendar-check`, `fa-magnifying-glass`, `fa-chevron-down`, `fa-globe`, `fa-xmark`, `fa-ban`, `fa-circle-notch`, `fa-spinner`, `fa-calendar-xmark`…) | Tercera familia de iconos | `lucide-react` |
| `darkMode: "class"` + `<html class="light">` | UI-DEC-013 | Light theme únicamente |
| **Buscador global en el `TopBar`** | Sin requisito de producto que lo respalde | **No se añadió** (igual que en PB-P2-029) |
| **Punto rojo permanente** en notificaciones (`w-2 h-2 bg-error`) | Señal de "no leídas" sin dato detrás; además el color sería la única señal | `NotificationBadge` sólo con `count > 0` |
| Rutas y labels inventados: `Catálogo`, `Configuración`, `Usuarios` en organizer, `Premium Planning`, `J. Pérez` / `Juan Pérez` / `Administrador` | Prohibido inventar navegación, datos de usuario o roles | `ORGANIZER_NAV_ITEMS` / `VENDOR_NAV_ITEMS` / `ADMIN_NAV_GROUPS` existentes, sin cambios |
| **Lista de locales incompleta** (es-LATAM, en-US, pt-BR; falta `es-ES`) | La autoridad es `shared/i18n/config.ts` | Los 4 locales aprobados: `es-LATAM`, `es-ES`, `pt`, `en` |
| `REINTENTAR`, `DESHACER` en mayúsculas | Copy con `text-transform` decidido por el generador | El copy llega por props desde `next-intl`, sin mayúsculas forzadas |
| Barra de progreso indeterminada con `translate-x-full` y `w-1/3` | Ancho inline copiado del mockup | `ProgressIndicator` con `aria-busy` y sin porcentaje simulado |
| Toast sobre `inverse-surface` oscuro | Conflicto con los tokens de superficie aprobados | `feedback.*` + `shadow-overlay-dropdown` |
| `min-h`/`py-2` en items de navegación (≈ 36 px) | Por debajo del objetivo táctil | `min-h-touch` (44 px) |

**Stitch se usó como evidencia visual de anatomía, composición, proporciones, variantes y estados.
No es autoridad de tokens, tipografía, iconografía, accesibilidad, rutas, permisos, datos de
navegación ni comportamiento de negocio.**

## 4. Documentation read

Leídos antes de tocar código:

- `docs/ux-ui/EventFlow-UI-Foundations.md` (898 líneas)
- `docs/ux-ui/EventFlow-Design-Tokens.md` (1 335)
- `docs/ux-ui/EventFlow-Component-Foundations.md` (2 105) — con foco en §10, §11, §14, §20, §24,
  §25, §27, §28, §29, §34, §37 y §38
- `docs/ux-ui/EventFlow-Stitch-Foundations-Frontend-Validation.md` (876)
- `docs/ux-ui/EventFlow-Frontend-Design-Tokens-Implementation.md` (332)
- `docs/ux-ui/EventFlow-Actions-Forms-Components-Implementation.md` (455)
- `docs/ux-ui/EventFlow-Navigation-Feedback-Components-Implementation.md` (541)

Inspeccionados además: `web/src/shared/design-tokens/` (4 archivos), `web/src/shared/design-system/`
(**42 archivos**, los 25 componentes del catálogo + barriles + internos), `web/src/shared/navigation/`
(11 archivos), `web/src/shared/i18n/`, `web/src/shared/providers/`, los 4 route groups de
`web/src/app/`, los 4 catálogos de `web/src/messages/`, `web/package.json`, y las suites
`src/tests/unit/design-system/` (7 archivos), `src/tests/a11y/`, `src/tests/unit/navigation/` y
`src/tests/unit/tasks/`.

## 5. Deduplication inventory

Clasificación de **todos** los componentes representados en el screen Stitch.

### Navigation

| Componente | Existe en | Clasificación | Resultado |
|---|---|---|---|
| `AppSidebar` | `design-system/navigation/AppSidebar.tsx` | **Reuse** | Ya cumple: `hidden lg:flex`, `w-sidebar`, `<nav>` con nombre accesible, `header`/`footer` opcionales y **`overflow-y-auto` + `min-h-0`** para la navegación scrollable que muestra el screen. Sin cambios. |
| `SidebarSection` | `design-system/navigation/SidebarSection.tsx` | **Reuse** | `<section aria-labelledby>` + `<h2>` + `<ul>/<li>`; `labelHidden` conserva el nombre accesible. Sin cambios. |
| `SidebarItem` | `design-system/navigation/SidebarItem.tsx` | **Normalize** | El contador pasa a usar `Badge srLabel`; se elimina el markup `sr-only` duplicado dentro del ítem. Mismo nombre accesible, mismo `aria-current`, mismo `min-h-touch`. |
| `TopBar` | `design-system/navigation/TopBar.tsx` | **Reuse** | `h-header`, contexto de página, acciones, trigger mobile. **Sin buscador global** (Stitch lo muestra; no hay requisito). Sin cambios. |
| `UserMenu` | `design-system/navigation/UserMenu.tsx` | **Reuse** | Identidad, rol, destinos recibidos por props, logout, teclado, `Escape` y retorno de foco (Headless UI `Menu`). Sin cambios. |
| `LanguageSelector` | `design-system/navigation/LanguageSelector.tsx` + `shared/i18n/LanguageSelector.tsx` | **Reuse** | Los 4 locales aprobados; `next-intl`, cambio optimista y rollback intactos. Sin cambios. |
| `NotificationButton` | `design-system/navigation/NotificationButton.tsx` | **Reuse** | Nombre accesible completo interpolado, sin tiempo real ni push. Sin cambios. |
| `NotificationBadge` | `design-system/navigation/NotificationBadge.tsx` | **Reuse** | `count === 0` ⇒ no renderiza; `aria-hidden` para no duplicar el anuncio. Sin cambios. |
| `FilterBar` | `design-system/navigation/FilterBar.tsx` | **Reuse** | Búsqueda, controles por `children`, aplicar, limpiar, chips y disclosure mobile. El rango de fechas del screen se compone con dos `DateInput` de *Actions & Forms*: **no** se empotra en el componente reutilizable. Sin cambios. |
| `AppliedFilterChip` | `design-system/navigation/AppliedFilterChip.tsx` | **Reuse** | Chip no focusable + botón de quitar con nombre accesible interpolado. Sin cambios. |
| `AppShell`, `Breadcrumb`, `MobileNavigationDrawer`, `MobileNavigationTrigger` | `design-system/navigation/` | **Reuse** | Fuera de lo que muestra este screen o ya conformes. Sin cambios. |
| Sidebar colapsada | — | **Out of scope** | CMP-DEC-005 la excluye del MVP; el propio screen anota «Evitar: Colapsar en escritorio sin necesidad». |
| Buscador global del `TopBar` | — | **Omit** | Sin requisito de producto. |
| Rutas `Catálogo` / `Configuración` | — | **Omit** | Inventadas por el generador. |

### Feedback

| Componente | Existe en | Clasificación | Resultado |
|---|---|---|---|
| `Badge` | `design-system/feedback/Badge.tsx` | **Extend** | Se añade `srLabel` para el etiquetado contextual del contador (§14 + Phase 4). Las 4 variantes (`neutral`, `role`, `seed`, `count`) ya existían: **no se creó una variante por cada color del screen**. |
| `StatusBadge` | `design-system/feedback/StatusBadge.tsx` | **Reuse** | Los 9 estados exigidos ya existen con texto obligatorio, glifo por tono y `STATUS_BADGE_TONE` exportado para el mapeo dominio → tono. Se añade cobertura de mapeo a tokens. |
| `Alert` | `design-system/feedback/Alert.tsx` | **Extend** | Se añade **reenvío de `ref`** (`forwardRef`, misma convención que `Button`) y `tabIndex`, para poder enfocar el resumen de errores tras un envío fallido. |
| `InlineMessage` | `design-system/feedback/InlineMessage.tsx` | **Extend** | **Genera su `id`** con `useId()` cuando no se le pasa uno, de modo que siempre puede referenciarse desde `aria-describedby`. |
| `Toast` | `design-system/feedback/Toast.tsx` | **Reuse** | Cuatro variantes, acción, descarte con nombre accesible, `role` por severidad, duración configurable y persistencia (`autoDismissMs = null`). **No se instaló ninguna librería de toasts** ni se creó un segundo primitivo. |

### States

| Componente | Existe en | Clasificación | Resultado |
|---|---|---|---|
| `EmptyState` | `design-system/feedback/EmptyState.tsx` | **Extend** | Se añade la variante **`compact`** (escala de título, icono y espaciado). `section` y `page` sin cambios. |
| `ErrorState` | `design-system/feedback/ErrorState.tsx` | **Extend** | Se preservan los **saltos de línea** de los mensajes localizados (`whitespace-pre-line`) y se añade `technicalDetails` como texto secundario, sólo `string`. |
| `PermissionDeniedState` | `design-system/feedback/PermissionDeniedState.tsx` | **Extend** | Se añade `secondaryAction` (segunda salida segura) y preservación de multilínea. |
| `Spinner` | `design-system/feedback/Spinner.tsx` | **Reuse** | 3 tamaños, label accesible opcional, uso inline y standalone, `motion-reduce`. El spinner de botón sigue siendo el de `Button` (`internal/Spinner`): **no se duplicó**. |
| `Skeleton` | `design-system/feedback/Skeleton.tsx` | **Extend** | Se añade la variante **`avatar`** (círculo dimensionado con `h-icon-lg`). Las otras 5 ya existían. |
| `ProgressIndicator` | `design-system/feedback/ProgressIndicator.tsx` | **Normalize** | `aria-valuenow` se **acota al rango** declarado; un rango degenerado (`max <= min`) se degrada a indeterminado; `description` se asocia con `aria-describedby`. |
| `NotFoundState` | — | **Out of scope** | Component Foundations §29 lo especifica pero este prompt no lo lista. Sigue diferido (ver §20). |
| Directorio `design-system/states/` | — | **Omit** | El prompt lo proponía; el repositorio ya organiza los estados dentro de `feedback/` (organización aprobada en PB-P2-029). Crearlo habría producido **dos** `EmptyState`, `ErrorState`, `Skeleton`, `Spinner` y `ProgressIndicator`. Verificado por guardarraíl. |

### Feature-specific (fuera del design system)

| Pieza | Dónde | Motivo |
|---|---|---|
| `EventStatusBadge`, `StatusBadge` de quotes, `AdminActionBadge`, `ReadOnlyBadge`, `QRLimitBadge`, `UnreadBadge`, `QuoteStatusIndicator` | `features/**` | El vocabulario de dominio se traduce a un **tono** en el feature; el primitivo no conoce estados de negocio. Migración diferida (§19). |
| `AIBadge`, `AILoadingState`, `AIErrorState` | `features/ai/**` | Familia AI (Component Foundations §31), no feedback genérico. |
| Paneles de filtros por feature (`AdminEventFiltersPanel`, `VendorFiltersPanel`, `EventFilters`, `TaskFilters`…) | `features/**` | Componen `FilterBar` con sus opciones de negocio; los filtros nunca viven dentro del componente reutilizable. |
| `ProgressBar` de tareas | `features/tasks/progress/` | Formatea con `Intl` y tiene test dedicado (US-033). Consumirá `ProgressIndicator`; diferido. |

## 6. Components reused without changes

16 componentes, sin una sola línea modificada:

`AppShell` · `AppSidebar` · `SidebarSection` · `TopBar` · `MobileNavigationTrigger` ·
`MobileNavigationDrawer` · `UserMenu` · `LanguageSelector` · `NotificationButton` ·
`NotificationBadge` · `Breadcrumb` · `FilterBar` · `AppliedFilterChip` · `StatusBadge` · `Toast` ·
`Spinner`.

Más: `shared/design-tokens/**` (**ningún token creado ni modificado**), `shared/design-system/actions/**`,
`shared/design-system/forms/**`, `shared/design-system/internal/**`, `shared/navigation/navItems.ts`,
`shared/navigation/useNavigationSections.tsx`, `.focus-ring` / `.hit-area` de `globals.css`.

**Cero dependencias nuevas.** `package.json` no cambió.

## 7. Components extended

| Componente | Qué se añadió | Por qué |
|---|---|---|
| `Badge` | `srLabel?: string` | Phase 4 + §14: un contador aislado (`42`) no significa nada para el lector de pantalla. Con `srLabel` el dígito pasa a `aria-hidden` y se anuncia la descripción. |
| `Alert` | `forwardRef<HTMLDivElement>` + `tabIndex?: number` | Phase 5. Convención existente del repositorio (`Button` ya usa `forwardRef`). Permite mover el foco al resumen de errores tras un envío fallido. |
| `InlineMessage` | `id` generado con `useId()` cuando no se aporta | Phase 6: el mensaje siempre debe poder referenciarse desde `aria-describedby`. Requirió marcar el módulo como `'use client'`. |
| `EmptyState` | Variante `compact` (+ escalas de título, icono y espaciado por variante) | Phase 8: estado vacío dentro de una card o un panel sin dominar la vista. |
| `ErrorState` | `whitespace-pre-line` en la descripción + `technicalDetails?: string` | Phase 9: preservar mensajes localizados multilínea y exponer metadata técnica como texto secundario. `string` y no `ReactNode`/`Error`: por construcción no puede filtrar un stack trace. |
| `PermissionDeniedState` | `secondaryAction?: ReactNode` + preservación de multilínea | Phase 10: segunda salida segura. **No** se añadió ninguna sugerencia de «contacta a un administrador»: el producto no expone ese canal. |
| `Skeleton` | Variante `avatar` | Phase 12. Dimensionada con `h-icon-lg`/`w-icon-lg`, no con un ancho arbitrario. |

## 8. Components normalized

| Componente | Qué estaba mal | Corrección |
|---|---|---|
| `ProgressIndicator` | `aria-valuenow` recibía el **valor crudo**: `value={250} max={100}` exponía `aria-valuenow="250"`, fuera de `[aria-valuemin, aria-valuemax]`. Sólo el ancho visual estaba acotado, así que la barra decía «100 %» y el lector de pantalla «250». WAI-ARIA declara ese estado inválido. | El valor se acota con `Math.max(min, Math.min(max, value))` **antes** de exponerlo; la barra y la capa accesible dicen ahora lo mismo. Cubierto por test (valor alto y valor negativo). |
| `ProgressIndicator` | Un rango degenerado o invertido (`max <= min`) producía `ratio = 0` pero seguía anunciándose como determinado, con un rango imposible. | Se degrada a **indeterminado**: sin `aria-valuenow`, sin `aria-valuemin`/`aria-valuemax`, con `aria-busy`. |
| `ProgressIndicator` | `description` era texto suelto, no asociado a la barra. | Se asocia con `aria-describedby` mediante un `id` generado. |
| `SidebarItem` | Reimplementaba dentro del ítem el patrón `sr-only` + dígito `aria-hidden` que ahora ofrece el propio `Badge`. | Delega en `Badge srLabel`. Mismo nombre accesible del enlace, verificado por los tests previos de navegación (sin editarlos). |

## 9. Components created

**Ninguno.**

Los 22 componentes que representa el screen ya existían y cumplían su propósito semántico. Crear
cualquiera de ellos habría introducido un duplicado. La única pieza nueva de esta tarea es un
archivo de **tests** (`states-adoption.test.tsx`).

## 10. Components omitted as duplicates

| Pieza propuesta | Ya cubierta por | Motivo |
|---|---|---|
| Directorio `design-system/states/` con `EmptyState`, `ErrorState`, `PermissionDeniedState`, `Spinner`, `Skeleton`, `ProgressIndicator`, `index.ts` | `design-system/feedback/` | La organización existente es la aprobada en PB-P2-029; el prompt permite conservarla («Adjust this only when the repository already uses another approved organization»). Un guardarraíl bloquea la aparición de un directorio nuevo. |
| Segundo `Spinner` público | `feedback/Spinner.tsx` + `internal/Spinner.tsx` (glifo) | El glifo interno ya respeta `prefers-reduced-motion` y lo consumen `Button`, `SearchInput` y `NotificationButton`. |
| Spinner propio dentro de `Button` | Estado `isLoading` de `Button` | Phase 11 lo prohíbe explícitamente. |
| Provider/librería de toasts | `feedback/Toast.tsx` (primitivo) | No existe provider en el repositorio y Phase 7 no lo exige; instalar una librería está prohibido. Sigue diferido al grupo de overlays (§19). |
| `Badge` por cada color del screen (`#f3e8ff`, `#dbeafe`, `#dcfce7`, `#fef08a`, `#e0f2fe`) | 4 variantes semánticas de `Badge` + 5 tonos de `StatusBadge` | Phase 4: «Do not create one variant for every raw Stitch color». |
| Buscador global en `TopBar` | — | Sin requisito de producto. |
| Bottom navigation bar | `MobileNavigationDrawer` | CMP-DEC-021. |

## 11. Components left feature-specific

Ver la tabla de §5 («Feature-specific»). En resumen: los badges de estado de dominio, la familia AI,
los paneles de filtros con opciones de negocio y la barra de progreso de checklist permanecen en sus
features y **consumen** el design system en lugar de vivir dentro de él.

## 12. APIs and variants

Sólo se listan las **superficies nuevas o modificadas** en esta tarea; el resto del contrato es el
publicado en PB-P2-029 y no cambió.

```ts
// feedback/Badge.tsx
interface BadgeProps {
  variant?: 'neutral' | 'role' | 'seed' | 'count';   // sin cambios
  size?: 'sm' | 'md';                                // sin cambios
  icon?: ReactNode;
  srLabel?: string;        // NUEVO — descripción contextual; silencia el texto visible
  children: ReactNode;
}

// feedback/Alert.tsx — ahora forwardRef<HTMLDivElement, AlertProps>
interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: ReactNode; children?: ReactNode; action?: ReactNode;
  onDismiss?: () => void; dismissLabel?: string; icon?: ReactNode;
  live?: boolean;
  tabIndex?: number;       // NUEVO — para enfocar la alerta programáticamente
}

// feedback/InlineMessage.tsx — 'use client'
interface InlineMessageProps {
  tone?: 'helper' | 'info' | 'success' | 'warning' | 'error';
  id?: string;             // AHORA OPCIONAL DE VERDAD: si falta, se genera con useId()
  live?: boolean; icon?: ReactNode; children: ReactNode;
}

// feedback/EmptyState.tsx
type EmptyStateVariant = 'compact' | 'section' | 'page';   // 'compact' NUEVO

// feedback/ErrorState.tsx
interface ErrorStateProps {
  /* … */
  correlationId?: string; correlationLabel?: string;
  technicalDetails?: string;   // NUEVO — sólo string, texto secundario
}

// feedback/PermissionDeniedState.tsx
interface PermissionDeniedStateProps {
  /* … */
  action?: ReactNode;
  secondaryAction?: ReactNode; // NUEVO
}

// feedback/Skeleton.tsx
type SkeletonVariant = 'text' | 'avatar' | 'card' | 'listRow' | 'tableRow' | 'navItem';  // 'avatar' NUEVO

// feedback/ProgressIndicator.tsx — 'use client'
// Misma firma; cambia el comportamiento: aria-valuenow acotado, rango degenerado ⇒ indeterminado,
// description asociada por aria-describedby.
```

Principios de API conservados de PB-P2-029: **todo el copy llega por props** (incluidos los nombres
accesibles), **las regiones vivas son opt-in** (`live`), **`ErrorState` sólo acepta texto**, y
**ningún componente importa `next-intl` ni `usePathname`**, de modo que no puede inventar rutas,
permisos ni traducciones.

## 13. Token mappings

Ninguna utilidad nueva; todas las extensiones consumen tokens ya implementados.

| Superficie | Utilidades semánticas |
|---|---|
| `Badge` neutral / role / seed / count | `bg-surface-subtle` `text-secondary` · `bg-surface-selected` `text-link` · `bg-feedback-info` `text-feedback-info` · `bg-action-primary` `text-action-primary-foreground` |
| `StatusBadge` (5 tonos) | `bg-feedback-{success,warning,error,info}` · `border-feedback-*` · `text-feedback-*` · neutral → `bg-surface-subtle` / `border-subtle` / `text-secondary` |
| `Alert` / `Toast` | `bg-feedback-*` · `border-feedback-*` · `text-feedback-*-icon` · `text-feedback-*` · `shadow-overlay-dropdown` · `rounded-card` |
| `InlineMessage` | `text-secondary` (helper) · `text-feedback-*` |
| `EmptyState` (3 variantes) | `bg-surface-subtle` · `border-dashed border-default` · `bg-surface` (caja del icono) · `text-muted` · `rounded-card` · `rounded-badge` · `max-w-form` |
| `ErrorState` | `bg-feedback-error` · `border-feedback-error` · `text-feedback-error` · `text-feedback-error-icon` · `text-muted` (correlation ID y metadata) |
| `PermissionDeniedState` | `bg-surface` · `border-subtle` · `bg-surface-subtle` (caja del icono) · `text-secondary` · `text-muted` |
| `Skeleton` (6 variantes) | `bg-surface-disabled` · `border-subtle` · `bg-surface` · `h-icon-lg` / `w-icon-lg` (avatar) · `rounded-badge` |
| `ProgressIndicator` | `bg-surface-disabled` (pista) · `bg-action-primary` (relleno) · `text-secondary` · `text-primary` · `text-muted` · `rounded-badge` · `duration-standard` `ease-standard` |
| `SidebarItem` + contador | `bg-sidebar-item-active` · `text-sidebar-item-active` · `bg-sidebar-item-hover` · `bg-action-primary` (badge) · `min-h-touch` · `.focus-ring` |
| Motion | `motion-reduce:animate-none` en `Skeleton`, `Spinner` y barra indeterminada |

Verificado por test: **0 utilidades de paleta cruda, 0 hex/rgb literales, 0 `dark:`, 0 temas por rol
y 0 iconos fuera de Lucide** en todo `shared/design-system/`, y también en los 3 consumidores
migrados.

## 14. Accessibility decisions

1. **`aria-valuenow` siempre dentro del rango.** La corrección central de esta tarea: la barra
   visual y el valor anunciado ya no pueden contradecirse.
2. **Rango imposible ⇒ indeterminado.** Preferible a exponer `aria-valuemin > aria-valuemax`.
3. **El progreso indeterminado sigue sin simular porcentaje** y su `description` se asocia por
   `aria-describedby`, no queda como texto huérfano.
4. **Contador anunciado una sola vez.** `Badge srLabel` pone el dígito en `aria-hidden` y expone la
   descripción; sustituye al markup manual que tenía `SidebarItem`.
5. **`InlineMessage` siempre referenciable.** Con `id` generado, un control externo puede apuntarle
   con `aria-describedby` sin inventar identificadores.
6. **`Alert` enfocable bajo demanda.** `ref` + `tabIndex={-1}`: el foco se mueve al resumen de
   errores tras un envío fallido, sin convertir la alerta en un control tabulable por defecto.
7. **La región contenedora comunica la carga, no el skeleton.** `app/(app)/loading.tsx` monta
   `role="status"` + `aria-busy="true"` + `aria-label` (el rol `status` no toma nombre del
   contenido, mismo tratamiento que `Spinner`), y todos los placeholders siguen `aria-hidden`.
8. **`role="alert"` sin `aria-live` redundante.** Al migrar `TaskStatusQuickToggle` se retira el
   `aria-live="assertive"` manual: el rol `alert` ya lo implica y duplicarlo provoca anuncios
   repetidos.
9. **Un solo canal de anuncio por fallo.** El aviso de la acción rápida es un `Alert` persistente,
   no un `Toast`: CMP-DEC-022 exige que el error crítico permanezca en la página.
10. **`PermissionDeniedState` sigue sin aceptar identificador del recurso**, ni siquiera con la
    nueva `secondaryAction`: por API no puede confirmar su existencia ni exponer la regla de
    autorización incumplida. El backend sigue siendo la autoridad.
11. **`ErrorState` no puede filtrar detalle interno**: `technicalDetails` es `string`, nunca un
    `Error` ni el envelope. El boundary migrado tampoco muestra `error.message` ni `error.digest`.
12. **Movimiento reducido** respetado en las 6 variantes de `Skeleton`, el `Spinner` y la barra
    indeterminada.
13. **Sin ARIA redundante**: no se añade `role` a elementos nativos que ya lo aportan.

Resultado axe-core sobre los tres catálogos (navegación, feedback y **el nuevo catálogo de estados
extendidos**): **0 violaciones de cualquier severidad**, no sólo 0 críticas.

## 15. Tests added or updated

**48 tests nuevos.** Ninguna aserción previa se debilitó ni se eliminó.

| Archivo | Δ | Cobertura añadida |
|---|---|---|
| `src/tests/unit/design-system/feedback.test.tsx` | 60 → **96** (+36) | `Badge`: `srLabel` describe el contador y silencia el dígito; sin `srLabel` el texto visible sigue siendo el contenido; mapeo de las 4 variantes a utilidades semánticas. `StatusBadge`: mapeo estado → tokens de tono para los 6 estados del screen y glifo distinto por estado de dominio. `Alert`: reenvío de `ref` y foco programático. `InlineMessage`: id generado, asociación real por `aria-describedby` (`toHaveAccessibleDescription`) y envoltura de texto largo. `EmptyState`: variante `compact`, escalas `section`/`page`, los 3 ejemplos de uso (sin eventos / sin usuarios que coincidan con los filtros / sin ejecuciones de IA) y ausencia de dependencias de imagen. `ErrorState`: multilínea preservada, metadata técnica secundaria y no filtración. `PermissionDeniedState`: doble salida segura sin revelar el recurso. `Skeleton`: variante `avatar`, las 6 variantes sin texto en el árbol de accesibilidad y tamaños del sistema. `ProgressIndicator`: `aria-valuenow` acotado por arriba y por abajo, rango degenerado, descripción asociada y porcentaje sólo cuando lo formatea el consumidor. |
| `src/tests/unit/design-system/states-adoption.test.tsx` | **nuevo** (7) | Los 3 consumidores migrados: el boundary conserva `role="alert"`, copy y `reset`, y no filtra `message` ni `digest`; la UI de carga expone región viva con nombre accesible y placeholders decorativos con forma real; la acción rápida conserva sus controles, no crea región viva sin fallo y su aviso no es un toast que se desvanezca. |
| `src/tests/unit/design-system/token-guardrails.test.ts` | 12 → **15** (+3) | **Deduplicación**: la estructura de `design-system/` sigue siendo exactamente `actions · feedback · forms · internal · navigation` (un directorio `states/` significaría componentes duplicados); ningún nombre de componente aparece dos veces en el catálogo; los 3 consumidores migrados importan del design system y no reintroducen paleta cruda. |
| `src/tests/a11y/design-system-navigation-feedback.axe.test.tsx` | 5 → **7** (+2) | Nuevo `StatesCatalog` con las extensiones de esta tarea (`Badge srLabel`, `EmptyState compact`, `ErrorState` multilínea + metadata, `PermissionDeniedState` con dos acciones, `Skeleton avatar`, `ProgressIndicator` descrito) auditado con axe a **0 violaciones de cualquier severidad**, más verificación de los nombres accesibles de las barras de progreso. |

**Cobertura ya existente que se verificó y se dejó intacta** (Phase 16, sin duplicar tests):
`navigation.test.tsx` (49 tests) ya cubre ruta activa, `aria-current`, badges opcionales, teclado
del `UserMenu`, selección de idioma, aplicar/limpiar filtros y eliminación de chips aplicados;
`feedback.test.tsx` ya cubría las 4 variantes de `Alert` con acción, descarte y semántica, las
duraciones y la persistencia del `Toast`, y los 3 tamaños del `Spinner` con `motion-reduce`.

## 16. Consumers migrated

Tres consumidores, uno por cada categoría permitida por Phase 17 que **no** había migrado ya
PB-P2-029:

| # | Consumidor | Categoría Phase 17 | Componentes adoptados | Cobertura |
|---|---|---|---|---|
| 1 | `src/app/(app)/error.tsx` | Page-level error state | `ErrorState` (`variant="page"`) | 3 tests nuevos + `tests/e2e/routing.app-guard.spec.ts` |
| 2 | `src/app/(app)/loading.tsx` | Loading consumer | `Skeleton` (`text`, `card`, `listRow`) | 2 tests nuevos |
| 3 | `src/features/tasks/quick-action/TaskStatusQuickToggle.tsx` | Alert consumer | `Alert` (`variant="error"`, `live`) + `Button` | 2 tests nuevos + `tests/unit/tasks/us030-quick-toggle-component.test.tsx` (10 tests previos, **sin editar**) |

Categorías **no** migradas por estar ya cubiertas en PB-P2-029 (el prompt prohíbe re-migrar):
empty state de página (`EmptyBudgetState`), permission denied (`app/(public)/403/page.tsx`) y
consumidor de status badge (`VendorStatusBadge`).

Preservado en los tres: rutas, guards, permisos, sesión, claves de localización (**ninguna clave
i18n nueva, modificada ni eliminada**), contratos de API, el `console.error` de observabilidad del
boundary, el `reset` de Next, la lógica de reintento de la acción rápida y todos los tests previos.

Cambios visibles deliberados:

1. El boundary de `(app)` gana título de estado, glifo e icono de error y jerarquía de heading, y
   deja de usar paleta cruda.
2. La UI de carga de `(app)` pasa de una caja gris a una forma que representa el contenido, y su
   región contenedora anuncia la carga con nombre accesible.
3. El aviso de fallo de la acción rápida deja las clases CSS propias (`banner banner--error`,
   `btn btn--secondary btn--small`) y adopta los tokens de feedback y el `Button` del sistema.

## 17. Commands executed

Descubiertos en `web/package.json` y ejecutados desde `web/`:

| Comando | Script | Resultado |
|---|---|---|
| `npx prettier --check` sobre los archivos de esta tarea | — | ✅ conformes |
| `npx next lint --max-warnings=0` | `npm run lint` | ✅ sin warnings ni errores |
| `npx tsc --noEmit` | `npm run typecheck` | ✅ sin errores |
| `npx vitest run` | `npm run test` | ✅ **142 archivos / 1 170 tests pasan, 1 skipped** |
| `npx vitest run src/tests/unit/design-system` | component tests | ✅ 228 tests (antes 185) |
| `npx vitest run src/tests/a11y` | `npm run test:a11y` | ✅ 55 tests, incluido el catálogo nuevo |
| `npx next build` | `npm run build` | ✅ compila; 40 rutas emitidas |

No se usó `--force` ni se suprimió ningún fallo.

`npm run test:e2e` (Playwright) **no se ejecutó**: requiere levantar el servidor y, en varios specs,
un backend demo con seed (`E2E_DEMO_READY`). Está fuera del gate de esta tarea y **ningún spec E2E
se modificó**.

## 18. Results

| Criterio | Estado |
|---|---|
| Screen Stitch recuperado e inspeccionado (metadata + HTML + screenshot) | ✅ |
| Inventario de deduplicación de los 22 componentes del screen | ✅ §5 |
| Componentes duplicados omitidos explícitamente | ✅ 7 piezas, §10 |
| Componentes conformes reutilizados sin cambios | ✅ 16 |
| Componentes con estados faltantes extendidos | ✅ 7 extensiones sobre 6 componentes |
| Componentes con semántica incorrecta normalizados | ✅ `ProgressIndicator` (3 correcciones) + `SidebarItem` |
| Componentes creados | ✅ **0** — ninguno faltaba |
| Feedback y estados consumen los tokens EventFlow existentes | ✅ verificado por test |
| `lucide-react` sigue siendo la única librería de iconos | ✅ verificado por test |
| Accesibilidad WCAG 2.1 AA | ✅ 0 violaciones axe de cualquier severidad |
| Tests | ✅ 48 nuevos; 1 170 en total en verde |
| Consumidores representativos migrados | ✅ 3 (uno por categoría no cubierta previamente) |
| Sin cambios de rutas, permisos, i18n ni comportamiento de negocio | ✅ toda la suite previa pasa sin debilitar aserciones |
| Dependencias nuevas | ✅ ninguna — `package.json` intacto |
| Implementation record | ✅ este documento |

## 19. Deferred consumers

Los diferidos de PB-P2-029 §18 siguen vigentes salvo los 3 migrados aquí. En orden de valor:

1. **Paneles de filtros restantes** → `FilterBar` + `AppliedFilterChip`: `AdminEventFiltersPanel`,
   `VendorFiltersPanel`, `AdminActionsFiltersPanel`, `AdminUsersView`, `EventFilters`,
   `TaskFilters`, `TaskRangeFilter`, `VendorFilters`, `NotificationsFilterToggle`.
2. **Status badges restantes** → `StatusBadge`: `EventStatusBadge` (requiere decidir el tono de
   `completed` —§14 lo pone en neutral, hoy es info— y actualizar su test de clases y su E2E),
   `StatusBadge` de quotes, `AdminActionBadge`, `ReadOnlyBadge`, `QRLimitBadge`, `UnreadBadge`,
   `QuoteStatusIndicator`.
3. **`error.tsx` de los otros 3 route groups** (`(admin)`, `(auth)`, `(public)`) → `ErrorState`, y
   `app/not-found.tsx` → `NotFoundState` (aún sin implementar).
4. **`loading.tsx` de los otros 3 route groups** y los ~29 archivos con `animate-pulse` propio →
   `Skeleton` con la forma real del contenido.
5. **Banners `banner banner--error` restantes** → `Alert`: `EventChecklistPage`, `DeleteTaskDialog`,
   `TaskStatusMenu`, `TaskItemInlineEdit`, `CreateTaskDialog` (5 archivos; el mismo patrón ya
   migrado en `TaskStatusQuickToggle`). Varios viven dentro de un modal, así que se benefician de
   hacerse junto con el grupo de overlays.
6. **Estados vacíos restantes** → `EmptyState`: `EmptyChecklistState` (requiere retirar las clases
   CSS propias `btn btn--*`), listas de cotizaciones, notificaciones, directorio y ejecuciones AI.
   La variante `compact` añadida aquí es la indicada para los vacíos dentro de card.
7. **`ProgressBar` de tareas** → `ProgressIndicator`, conservando el formateo `Intl` de US-033.
8. **`Breadcrumb`**: sigue sin consumidor. Candidatos: detalle de vendor y detalle de evento.
9. **`Toast`**: adoptarlo en los flujos de mutación una vez exista el provider/cola.
10. **`Skeleton variant="avatar"`**: añadido aquí, aún sin consumidor (candidato natural: filas del
    directorio de proveedores y el `UserMenu` durante la carga de sesión).

## 20. Known limitations

1. **Validación visual en navegador pendiente** (no bloqueante): 200 % de zoom, reflow real, la
   variante `compact` de `EmptyState` sobre vistas reales y el nuevo `loading.tsx` en navegación
   real. Los tests corren en jsdom, que no aplica CSS.
2. **Sigue sin haber provider ni cola de toasts.** `Toast` es el primitivo presentacional; el
   portal, el apilamiento, la región `aria-live` compartida y la deduplicación dependen del grupo de
   overlays. Deliberadamente **no** se instaló ninguna librería y **no** se creó un provider: Phase 7
   pide reutilizar el existente y no exige construir uno.
3. **`NotFoundState` sigue sin implementar.** Component Foundations §29 lo especifica; este prompt no
   lo lista entre los componentes a inventariar. Pertenece al grupo de estados de página.
4. **`EmptyState variant="page"` y `compact` no tienen consumidor todavía**; sólo `section` está en
   uso real (`EmptyBudgetState`).
5. **`Badge variant="seed"` consume tokens de `feedback.info`.** §14 pide colores neutros para
   `Badge`, pero un marcador de datos de demo indistinguible del badge neutro perdería su función.
   Se conserva la decisión de PB-P2-029 y queda anotada para una revisión de tokens; **no** se
   cambió sin autoridad. Sigue sin consumidor.
6. **`InlineMessage` y `ProgressIndicator` pasan a ser client components** (`'use client'`) porque
   usan `useId()`. No pueden renderizarse como server components; sus props siguen siendo
   serializables desde un server component. Ningún consumidor actual se ve afectado.
7. **`app/(app)/loading.tsx` es ahora un client component** para poder usar `useTranslations` y ser
   testeable. El route group ya es cliente en su totalidad (`(app)/layout.tsx` lleva `'use client'`),
   así que no añade una frontera nueva.
8. **`TaskStatusQuickToggle.tsx` no está formateado con Prettier**, igual que antes de esta tarea:
   es deuda preexistente de ese archivo (el gate del repositorio es `npm run lint`, que no ejecuta
   Prettier). Los archivos nuevos y el resto de los tocados sí están formateados.
9. **La deuda de paleta cruda del resto de `src/**` sigue intacta** (~1 900 utilidades). Esta tarea
   sólo la retiró de los 3 consumidores migrados.
10. **El estado activo de la sidebar sigue siendo prefijo de ruta** (`startsWith`) para los ítems sin
    `exact`: regla previa, conservada sin cambios.

---

## Anexo — Trazabilidad

| Elemento | Referencia |
|---|---|
| Proyecto Stitch | `projects/10889252267442839867` |
| Screen inspeccionado | `projects/10889252267442839867/screens/19e34fc844be45a39f7e86e00ae2980c` |
| HTML | `fileEntries/html` — descargado (27 567 bytes, 524 líneas) y leído íntegro |
| Screenshot | `fileEntries/screenshot` — descargado (38 197 bytes) e inspeccionado |
| Catálogo de uso | `web/src/shared/design-system/README.md` (actualizado) |
| Tokens consumidos | `web/src/shared/design-tokens/` (**sin modificar**) |
| Modelo de navegación | `web/src/shared/navigation/navItems.ts` (**sin modificar**) |
| Registro de la tarea previa | `docs/ux-ui/EventFlow-Navigation-Feedback-Components-Implementation.md` |

### Archivos tocados

**Creados (1)**

- `web/src/tests/unit/design-system/states-adoption.test.tsx`
- (+ este documento)

**Modificados (16)**

- `web/src/shared/design-system/feedback/Badge.tsx`
- `web/src/shared/design-system/feedback/Alert.tsx`
- `web/src/shared/design-system/feedback/InlineMessage.tsx`
- `web/src/shared/design-system/feedback/EmptyState.tsx`
- `web/src/shared/design-system/feedback/ErrorState.tsx`
- `web/src/shared/design-system/feedback/PermissionDeniedState.tsx`
- `web/src/shared/design-system/feedback/Skeleton.tsx`
- `web/src/shared/design-system/feedback/ProgressIndicator.tsx`
- `web/src/shared/design-system/navigation/SidebarItem.tsx`
- `web/src/shared/design-system/README.md`
- `web/src/app/(app)/error.tsx`
- `web/src/app/(app)/loading.tsx`
- `web/src/features/tasks/quick-action/TaskStatusQuickToggle.tsx`
- `web/src/tests/unit/design-system/feedback.test.tsx`
- `web/src/tests/unit/design-system/token-guardrails.test.ts`
- `web/src/tests/a11y/design-system-navigation-feedback.axe.test.tsx`

**Eliminados**: ninguno.

**Stitch se utilizó como evidencia visual de anatomía, layout, proporciones, variantes, estados y
composición. No es autoridad de tokens, tipografía, iconografía, accesibilidad, rutas, permisos,
datos de navegación ni arquitectura frontend.** Cuando divergió de la documentación aprobada,
prevaleció el valor EventFlow (§3).
