# EventFlow — Data Display & Overlays · Implementation record

> **Stitch se usó como evidencia visual.** No es autoridad sobre tokens, tipografía, iconografía,
> accesibilidad, alcance de producto, rutas, permisos, contratos de API ni comportamiento de
> negocio. Los valores generados por Stitch (`primary: #683ec9`, `background: #fcf9f8`,
> semánticos hexadecimales, Material Symbols, Font Awesome, `darkMode: "class"`, la configuración
> Tailwind inline y sus sombras) **no se propagan**.

---

## 1. Propósito

Implementar el tercer grupo del design system de EventFlow —**Data Display** y **Overlays**—
como componentes reutilizables de producción, con tests y una adopción representativa acotada.
El grupo extiende `web/src/shared/design-system/`; no crea un sistema paralelo.

## 2. Pantalla Stitch inspeccionada

| Campo    | Valor                                                          |
| -------- | -------------------------------------------------------------- |
| Proyecto | EventFlow AI Planning Workspace — `10889252267442839867`        |
| Pantalla | EventFlow — Component Design System (Data & Overlays)           |
| ID       | `5c4e958ce5c644c2ba3e54a908dae57d`                              |
| Device   | DESKTOP · 2560 × 6244                                           |

## 3. Recursos recuperados

- Metadatos de la pantalla (MCP Stitch `get_screen`).
- HTML generado (descargado a scratchpad; **no** se copió a producción).
- Screenshot alojado (descargado a scratchpad).
- No hay `DESIGN.md` asociado al proyecto; la información de sistema de diseño proviene de la
  documentación aprobada del repositorio.

Anatomía observada y usada como referencia: fila de cards (Default · Interactive · Subtle ·
superficie destacada), grid de métricas 3→1 con estados default/loading/empty, tabla de
escritorio con pie de paginación (`Rows per page` + rango + flechas) que pivota a cards de
resumen en móvil, tab list con contador, acordeón cerrado/abierto, modal con cabecera y pie de
acciones, diálogo destructivo, menú desplegable con separador, popover con título y tooltip.

## 4. Documentación leída

- `docs/ux-ui/EventFlow-UI-Foundations.md`
- `docs/ux-ui/EventFlow-Design-Tokens.md`
- `docs/ux-ui/EventFlow-Component-Foundations.md` (§13, §20–§26, §30, §36–§38)
- `docs/ux-ui/EventFlow-Stitch-Foundations-Frontend-Validation.md`
- `docs/ux-ui/EventFlow-Frontend-Design-Tokens-Implementation.md`
- `docs/ux-ui/EventFlow-Actions-Forms-Components-Implementation.md`
- `docs/ux-ui/EventFlow-Navigation-Feedback-Components-Implementation.md`
- `docs/ux-ui/EventFlow-Navigation-Feedback-States-Implementation.md`
- `web/src/shared/design-system/README.md`, `web/src/shared/design-tokens/` (los cuatro archivos)
  y `web/tailwind.config.ts`

## 5. Inventario de deduplicación

| Componente Stitch          | Clasificación      | Resolución                                                                                       |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| Card                       | **Create**         | `data-display/Card.tsx` (+ Header/Title/Description/Content/Footer)                               |
| Interactive card           | **Create**         | Mismo `Card`: la interactividad la declara `href` / `onSelect`, no una variante visual            |
| MetricCard                 | **Create** + Normalize | Canónico en `data-display/MetricCard.tsx`; `features/admin/metrics/MetricCard` pasa a componerlo |
| Table                      | **Create**         | `data-display/Table.tsx` (Table/Head/Body/Row/HeaderCell/Cell/StatusRow)                          |
| Responsive table → cards   | **Create**         | `data-display/ResponsiveTable.tsx` (+ `ResponsiveSummaryRow`)                                     |
| Pagination                 | **Create** + Normalize | Canónico en `data-display/Pagination.tsx`; `features/tasks/list/Pagination` pasa a componerlo   |
| Tabs                       | **Create**         | `data-display/Tabs.tsx`                                                                            |
| Accordion                  | **Create**         | `data-display/Accordion.tsx`                                                                       |
| DescriptionList            | **Create**         | `data-display/DescriptionList.tsx`                                                                 |
| CurrencyDisplay            | **Create** + Normalize | `data-display/CurrencyDisplay.tsx`; `shared/i18n/Money` pasa a componerlo                       |
| Modal                      | **Create**         | `overlays/Modal.tsx` sobre el `Dialog` de Headless UI ya instalado                                 |
| ConfirmationDialog         | **Create**         | `overlays/ConfirmationDialog.tsx` sobre `Modal`                                                    |
| Drawer                     | **Omit**           | `MobileNavigationDrawer` ya cubre el único requisito verificado; no se crea un segundo drawer      |
| DropdownMenu               | **Create**         | `overlays/DropdownMenu.tsx` sobre el `Menu` de Headless UI (misma primitiva que `UserMenu`)         |
| Popover                    | **Create**         | `overlays/Popover.tsx` sobre el `Popover` de Headless UI                                            |
| Tooltip                    | **Create**         | `overlays/Tooltip.tsx` (no hay primitiva instalada; Headless UI no la expone)                       |
| Button / IconButton        | **Reuse**          | `actions/` (PB-P2-028)                                                                             |
| Input / Select             | **Reuse**          | `forms/` (PB-P2-028) — `Select` alimenta el selector de tamaño de página                            |
| StatusBadge / Badge        | **Reuse** + Extend | `feedback/` (PB-P2-029); `StatusBadge` gana el opt-in `live`                                        |
| Skeleton                   | **Reuse**          | `feedback/Skeleton` alimenta el estado de carga de `MetricCard`                                     |
| EmptyState / ErrorState    | **Reuse**          | `feedback/` — se componen dentro de `TableStatusRow` y de las páginas                               |
| AIRecommendation / AI Card | **Out of scope**   | Familia AI propia (Component Foundations §31); Card **no** recrea su estilo                         |
| Top navigation             | **Omit** (duplicado) | `navigation/TopBar` + `AppShell` (PB-P2-029)                                                      |
| Footer                     | **Omit** (duplicado) | `shared/navigation/Footer`                                                                        |
| Invitar colaboradores      | **Out of scope**   | Funcionalidad fuera del MVP; el Modal se entrega vacío                                              |
| Conversión de divisa       | **Out of scope**   | BR-BUDGET-007: sin conversión ni tipo de cambio, ni en el texto del Tooltip                          |

## 6. Componentes reutilizados

`Button`, `IconButton`, `TextLink`, `Select`, `Skeleton`, `StatusBadge`, `Badge`, `Alert`,
`EmptyState`, `ErrorState`, `Spinner`, `AppShell` / `TopBar` / `AppSidebar`, `Footer`,
`formatCurrency` de `shared/i18n` y el `Dialog` / `Menu` / `Popover` de `@headlessui/react`
(ya instalado desde el grupo de navegación). **No se instaló ninguna dependencia.**

## 7. Componentes extendidos

| Componente               | Extensión                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `feedback/StatusBadge`   | `live?: boolean` — opt-in de región viva, igual que `Alert` / `InlineMessage` / `Toast`. Con `ariaLabel` y sin `live` el badge usa `role="img"`: aporta su nombre accesible sin que N filas de una tabla se anuncien solas al renderizar. |

## 8. Componentes normalizados

| Archivo                                              | Antes                                                | Después                                                       |
| ---------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| `features/admin/metrics/components/MetricCard.tsx`   | `<section>` propio con `neutral-*` crudo             | Compone `MetricCard` + `DescriptionList`; misma API pública     |
| `features/tasks/list/components/Pagination.tsx`      | Botones propios sin tokens                           | Compone `Pagination`; la paginación por URL sigue en el feature |
| `features/events/components/ConfirmDialog.tsx`       | Overlay nativo, sin focus trap ni scroll lock        | Compone `ConfirmationDialog`; misma API pública                 |
| `features/budget/view/components/BudgetItemsTable.tsx` | Tabla con `red-100` / `amber-100` y `<Money>` suelto | `Table` + `ResponsiveTable` + `CurrencyDisplay` + `StatusBadge` |
| `features/events/pages/EventsListPage.tsx`           | `<li>` con borde crudo, paginación inline            | `Card` + `Skeleton` + `EmptyState` + `ErrorState` + `Pagination` |
| `shared/i18n/Money.tsx`                              | `<span>` propio                                       | Compone `CurrencyDisplay`; conserva locale, AC-03 y `aria-label` |

## 9. Componentes creados

```text
shared/design-system/data-display/
├── Card.tsx              Card · CardHeader · CardTitle · CardDescription · CardContent · CardFooter
├── MetricCard.tsx
├── Table.tsx             Table · TableHead · TableBody · TableRow · TableHeaderCell · TableCell · TableStatusRow
├── ResponsiveTable.tsx   ResponsiveTable · ResponsiveSummaryRow
├── Pagination.tsx
├── Tabs.tsx
├── Accordion.tsx         Accordion · AccordionItem · AccordionTrigger · AccordionPanel
├── DescriptionList.tsx   DescriptionList · DescriptionListItem
├── CurrencyDisplay.tsx
└── index.ts

shared/design-system/overlays/
├── Modal.tsx
├── ConfirmationDialog.tsx
├── DropdownMenu.tsx
├── Popover.tsx
├── Tooltip.tsx
└── index.ts
```

## 10. Componentes omitidos

- **Drawer genérico** — el único requisito verificado es la navegación móvil, ya cubierta por
  `MobileNavigationDrawer`. Crearlo «porque aparece en la documentación» duplicaría focus trap y
  modelo de foco sin consumidor. Guardado por test (`token-guardrails`).
- **Top navigation y Footer** de la pantalla Stitch — ya implementados en el grupo anterior.
- **Botón, Input, Badge, Skeleton, EmptyState** dibujados en Stitch — se reutilizan.
- **Invitar colaboradores**, **exportar**, **conversión de divisa**, **tipo de cambio diario** —
  fuera del alcance de producto; no se implementan aunque aparezcan en la pantalla.
- **Data grid empresarial** (pinning, reordenación, agrupación, edición spreadsheet, selección
  masiva, virtualización) y **gráficas** — excluidos explícitamente por Component Foundations §23.

## 11. Composiciones específicas de feature

Se quedan fuera del design system porque conocen datos, permisos o rutas:

- `features/budget/view/components/BudgetItemsTable.tsx` — la card de resumen móvil decide **qué
  datos son críticos** en un presupuesto; eso no es una traducción mecánica de columnas.
- `features/events/pages/EventsListPage.tsx` — layout, filtros y estado de página.
- `features/admin/metrics/components/MetricCard.tsx` — mapea el modelo de métricas de admin.
- `features/tasks/list/components/Pagination.tsx` — paginación por `?page=`.
- `features/events/components/ConfirmDialog.tsx` — copy y mutaciones de eventos.

## 12. APIs de los componentes

Resumen; el contrato completo está en los tipos exportados y en
`web/src/shared/design-system/README.md` §4.

- **`Card`** — `variant` (`default` · `interactive` · `subtle` · `selected` · `marketing`),
  `padding`, `as`, `href`, `onSelect`, `selected`, `aria-label`. Con `href` renderiza `next/link`;
  con `onSelect`, `<button type="button">`. `variant="interactive"` sin acción emite un error de
  desarrollo. Subcomponentes: `CardHeader` (`icon`, `action`), `CardTitle` (`headingLevel`),
  `CardDescription`, `CardContent`, `CardFooter`.
- **`MetricCard`** — `label`, `value`, `valueDescription`, `icon`,
  `trend { direction, label, intent?, ariaLabel? }`, `comparison`,
  `state` (`ready` · `loading` · `empty` · `error`), `loadingLabel`, `emptyLabel`,
  `emptyDescription`, `errorLabel`, `children`, `footer`, `headingLevel`.
- **`Table`** — `caption`, `captionVisible`, `ariaLabel`, `density`. `TableHeaderCell`:
  `align` (`start` · `center` · `end` · `numeric`), `scope`, `sortable`, `sortDirection`,
  `onSort`, `sortLabel`. `TableCell`: `align`, `header`, `description`. `TableRow`: `interactive`.
  `TableStatusRow`: `colSpan`, `live`.
- **`ResponsiveTable<T>`** — `items`, `getRowKey`, `renderSummary`, `summaryLabel`, `breakpoint`,
  `children` (la `<Table>`).
- **`Pagination`** — `ariaLabel`, `page`, `totalPages`, `onPageChange`, `previousLabel`,
  `nextLabel`, `summary`, `live`, `pageSize { value, options, onChange, label, ariaLabel? }`,
  `disabled`.
- **`Tabs`** — `items [{ id, label, badge?, disabled? }]`, `ariaLabel`, `value` / `defaultValue`,
  `onChange`, `children: (activeId) => ReactNode`.
- **`Accordion`** — `type` (`single` · `multiple`), `value` / `defaultValue`, `onChange`;
  `AccordionItem { value, disabled }`, `AccordionTrigger { headingLevel }`, `AccordionPanel`.
- **`DescriptionList`** — `columns` (1 · 2), `compact`, `dividers`;
  `DescriptionListItem { term, emptyText, numeric }`.
- **`CurrencyDisplay`** — `amount`, `currencyCode`, `locale`, `notation`, `signDisplay`,
  `fractionDigits`, `showCurrencyCode`, `accessibleLabel`, `formatOptions`, `tone`.
- **`Modal`** — `open`, `onClose`, `title`, `description`, `closeLabel`, `footer`, `size`,
  `closeOnOverlayClick`, `closeOnEscape`, `showCloseButton`, `initialFocus`, `role`.
- **`ConfirmationDialog`** — todo lo de `Modal` más `confirmLabel`, `cancelLabel`, `onConfirm`
  (sync o async), `variant` (`standard` · `destructive`), `isLoading`, `loadingLabel`,
  `confirmDisabled`, `icon`.
- **`DropdownMenu`** — `trigger`, `triggerAriaLabel`, `iconOnly`, `align`, `disabled`,
  `items` de tres formas: acción (`onSelect`, `destructive?`, `checked?` + `checkedLabel`),
  enlace (`kind: 'link'`, `href`) y separador (`kind: 'separator'`).
- **`Popover`** — `trigger`, `triggerAriaLabel`, `iconOnly`, `title`, `side`, `align`,
  `children` como nodo o `({ close }) => ReactNode`.
- **`Tooltip`** — `content`, `children` (un único elemento focalizable), `placement`, `delayMs`.

## 13. Patrones responsive

| Superficie                 | Comportamiento                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| Grids de cards             | El grid lo aporta el feature; `Card` es fluida y su padding baja de `p-6` a `p-4` en móvil     |
| MetricCard                 | `p-4` → `sm:p-6`; el valor y la tendencia envuelven en vez de desbordar                        |
| Tabla                      | `overflow-x-auto` **en el contenedor**: una tabla ancha nunca provoca scroll horizontal de página |
| Tabla → cards              | `ResponsiveTable`: `hidden md:block` vs `md:hidden`, mutuamente excluyentes y sobre la misma lista |
| Pagination                 | Columna en móvil, fila desde `sm`; las etiquetas de las flechas pasan de `sr-only` a visibles   |
| Tabs                       | `overflow-x-auto` con `pb-1` para no recortar el anillo de foco; labels sin truncar             |
| DescriptionList            | `columns={2}` es `grid-cols-1 sm:grid-cols-2`: siempre una columna en móvil                     |
| Modal                      | Anclado abajo en móvil (`items-end`) y centrado desde `sm`; `max-h-[90vh]` con scroll interno y márgenes `p-4` |
| ConfirmationDialog         | Acciones en `flex-col-reverse` (la primaria arriba al alcance del pulgar) y en fila desde `sm`   |
| DropdownMenu / Popover     | `anchor` de Headless UI reposiciona dentro del viewport; ancho `max-w-[calc(100vw-2rem)]`        |
| Tooltip                    | Portal a `document.body` con posición medida al abrir: no lo recorta un contenedor con `overflow` |

## 14. Mapeo de tokens

| Concepto             | Token / utilidad                                                                |
| -------------------- | -------------------------------------------------------------------------------- |
| Superficie de card   | `bg-surface` · `border-subtle` · `rounded-card` · `shadow-surface-subtle`         |
| Card hover           | `hover:border-interactive` · `hover:shadow-surface-raised`                        |
| Card subtle          | `bg-surface-subtle` sin sombra                                                     |
| Card seleccionada    | `bg-surface-selected` · `border-interactive`                                       |
| Card marketing       | `rounded-card-prominent` · `shadow-marketing-floating`, sin borde                  |
| Cabeceras de tabla   | `bg-surface-subtle` · `text-secondary` · `text-label`                              |
| Separadores de fila  | `divide-separator`                                                                  |
| Cifras y montos      | `tabular-nums` + `text-right`                                                       |
| Tendencia            | `text-feedback-success` / `text-feedback-error` / `text-secondary` según `intent`   |
| Tab activo           | `border-interactive` · `text-link` · `font-semibold`                                |
| Scrim del modal      | `bg-scrim` (`overlay.scrim`)                                                         |
| Superficie de modal  | `bg-surface-elevated` · `rounded-modal` · `shadow-overlay-modal` · `z-modal`         |
| Menú / popover       | `bg-surface-elevated` · `rounded-card` · `shadow-overlay-dropdown` · `z-dropdown`     |
| Tooltip              | `bg-surface-inverse` · `text-inverse` · `z-tooltip`                                  |
| Acción destructiva   | `bg-action-destructive` · `text-feedback-error` (familia error, nunca coral/lila)     |
| Foco                 | `.focus-ring` (`focus-visible` + offset blanco)                                       |
| Objetivo táctil      | `min-h-touch` / `min-w-touch` (44 px) en triggers, items de menú y de acordeón         |
| Motion               | `duration-fast` · `ease-standard` + `motion-reduce:transition-none`                   |
| Iconos               | `lucide-react`, dimensionados con `h-icon-sm|md|lg`                                   |

Guardado por test: ninguna utilidad de paleta cruda, ningún hex/rgb literal, ningún `dark:`, ningún
z-index arbitrario, ninguna librería de iconos distinta de Lucide.

## 15. Decisiones de accesibilidad

1. **Una card interactiva es un `<a>` o un `<button>` real.** `variant="interactive"` sin `href`
   ni `onSelect` emite `console.error` en desarrollo y test. Nunca `div` + `cursor-pointer`.
2. **Una card no interactiva no recibe foco** — no entra en el orden de tabulación.
3. **Tabla semántica**: `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<th scope="col">` /
   `<td>` / `<caption>`. `aria-sort` **sólo** en columnas ordenables. Los estados de carga, vacío
   y error viven dentro del `<tbody>` (`TableStatusRow`) para no dejar una tabla anunciada con
   cero filas sin explicación. Las filas nunca se convierten en `div` clicables.
4. **Sin ARIA redundante** sobre elementos nativos: no hay `role="table"`, `role="row"` ni
   `role="button"` sobre `<button>`.
5. **`Tabs`** implementa el patrón APG: roving tabindex, `←`/`→` con activación automática y
   salto de deshabilitados, `Home`/`End`, `aria-selected`, `aria-controls` y `tabpanel`
   focalizable. El estado activo añade peso tipográfico y barra: no es sólo color.
6. **`Accordion`**: `<button>` nativo dentro de heading semántico, `aria-expanded`,
   `aria-controls`, ids estables por `useId`, `↑`/`↓`/`Home`/`End` entre cabeceras. El panel
   cerrado **se desmonta**: no se anima la altura.
7. **`DescriptionList`** usa `dl`/`dt`/`dd`; un valor ausente muestra `emptyText` en vez de una
   `<dd>` vacía. El texto sigue siendo seleccionable y copiable.
8. **`CurrencyDisplay`**: ISO en `title`, nombre accesible con contexto de moneda, numeración
   tabular. Sin conversión (BR-BUDGET-007).
9. **`Pagination`**: `<nav aria-label>`, flechas con etiqueta textual siempre presente en el
   árbol de accesibilidad (`sr-only sm:not-sr-only`), extremos deshabilitados y **ningún rango
   inválido**: con `totalPages = 0` no se anuncia página alguna.
10. **`Modal`**: focus trap, foco inicial configurable, retorno del foco al disparador, bloqueo
    del scroll del body, `aria-modal`, título asociado y descripción asociada, todo aportado por
    el `Dialog` de Headless UI. `Escape` y clic en overlay son **decisiones independientes**: el
    backdrop marca su origen en `mousedown` y el handler consulta la bandera correspondiente.
11. **`ConfirmationDialog`**: `role="alertdialog"`, foco inicial en **Cancelar** (la opción
    segura), etiquetas explícitas, y durante una confirmación asíncrona no admite cierre ni
    segundo envío. No afirma irreversibilidad salvo que el consumidor lo escriba.
12. **`DropdownMenu`**: acción = `<button>`, navegación = `Link` de Next; nunca un `<a>` sin
    destino. El estado «seleccionado» no depende del glifo: exige `checkedLabel` sr-only.
13. **`Tooltip`**: se asocia con `aria-describedby`, **nunca** aporta el nombre accesible;
    aparece en hover **y** en focus; `Escape` lo descarta; `pointer-events-none` impide alojar
    controles.
14. **Sin movimiento innecesario**: el grupo no introduce animaciones de entrada/salida. Las
    únicas transiciones son de color/sombra y la rotación del chevron, todas con tokens de motion
    y `motion-reduce:transition-none`.
15. **Reflow**: el scroll horizontal vive siempre en el contenedor de la tabla; ninguna primitiva
    provoca scroll horizontal de página.

## 16. Tests añadidos o actualizados

**Nuevos**

- `web/src/tests/unit/design-system/data-display.test.tsx` — Card (variantes, semántica
  interactiva, activación por teclado, foco visible, card estática fuera del tab order),
  MetricCard (valor, descripción accesible, tendencia con `intent` explícito en ambos sentidos,
  neutro por defecto, loading, empty, error), Table (semántica, `caption`, alineación numérica,
  `aria-sort` controlado, acciones con nombre, estados dentro del `tbody`), ResponsiveTable
  (fuente única, exclusión mutua de vistas, nombre de la lista móvil), Pagination
  (prev/next, extremos, rango vacío, selector de tamaño), Tabs (activo, `←`/`→` saltando
  deshabilitados, `Home`/`End`, asociaciones, controlado), Accordion (abrir/cerrar, single vs
  multiple, `aria-expanded`, asociación estable, item deshabilitado), DescriptionList
  (semántica, 1 y 2 columnas, valor vacío) y CurrencyDisplay (GTQ, USD, formato por locale,
  contexto de moneda, sin conversión).
- `web/src/tests/unit/design-system/overlays.test.tsx` — Modal (abrir/cerrar, `Escape`
  configurable, overlay configurable de forma independiente, focus trap, foco inicial, retorno
  de foco, título y descripción accesibles, scroll lock), ConfirmationDialog (confirmar,
  cancelar, variante destructiva, carga, prevención de doble envío, foco seguro), DropdownMenu
  (teclado, acción, enlace, deshabilitado, destructivo, `Escape` + retorno de foco, trigger
  icon-only sin nombre), Popover (abrir/cerrar, clic fuera, `Escape`, foco) y Tooltip (hover,
  focus, asociación, contenido complementario).
- `web/src/tests/a11y/design-system-data-overlays.axe.test.tsx` — auditoría axe con **0
  violaciones de cualquier severidad** sobre el catálogo de data display, los disparadores de
  overlay, el modal abierto, el diálogo destructivo, el menú abierto y el tooltip visible.

**Actualizados**

- `web/src/tests/unit/design-system/token-guardrails.test.ts` — inventario del nuevo grupo,
  estructura de directorios (`data-display`, `overlays`), ausencia de `Drawer.tsx`, reutilización
  de Headless UI en los overlays y delegación del formateo de moneda en el helper compartido.
- `web/src/tests/unit/design-system/feedback.test.tsx` — cobertura del opt-in `live` de
  `StatusBadge` en sus tres modos.
- `web/src/tests/integration/events/events.test.tsx` — `role="dialog"` → `role="alertdialog"`
  en los diálogos de cancelar y eliminar, consecuencia directa de la migración a
  `ConfirmationDialog`. Ninguna aserción se relajó.

## 17. Consumidores migrados

| # | Categoría              | Consumidor                                              |
| - | ---------------------- | ------------------------------------------------------- |
| 1 | Composición de card    | `features/events/pages/EventsListPage.tsx`              |
| 2 | Grupo de métricas      | `features/admin/metrics/components/MetricCard.tsx` (sirve a los dashboards organizer, vendor y admin sin tocar ninguna llamada) |
| 3 | Tabla + resumen móvil  | `features/budget/view/components/BudgetItemsTable.tsx`  |
| 4 | Paginación             | `features/tasks/list/components/Pagination.tsx`         |
| 5 | Modal + confirmación   | `features/events/components/ConfirmDialog.tsx`          |
| 6 | Moneda                 | `shared/i18n/Money.tsx`                                 |

Sin cambios en rutas, permisos, contratos de API, data fetching, comportamiento de TanStack Query
ni localización.

## 18. Comandos ejecutados

```bash
npx prettier --check <archivos tocados>   # ver nota
npm run lint           # next lint --max-warnings=0
npm run typecheck      # tsc --noEmit
npm run test           # vitest run  (unit + integration + contract + a11y)
npm run test:a11y      # vitest run src/tests/a11y
npm run build          # next build
```

> **Nota sobre el formato.** `npm run format` es `prettier --write "src/**/*"`: reescribe todo el
> árbol y arrastra la deriva de formato preexistente de ~290 archivos ajenos a esta tarea. Para
> mantener el diff acotado se ejecutó `prettier --check` sobre los archivos tocados. La deriva
> global preexistente sigue ahí y merece su propio commit de formato.

## 19. Resultados

| Comando            | Resultado                                   |
| ------------------ | ------------------------------------------- |
| Formato            | ✅ todos los archivos tocados en estilo Prettier |
| Lint               | ✅ 0 warnings, 0 errores                      |
| Typecheck          | ✅ sin errores                                |
| Tests (unit+integr.+contract+a11y) | ✅ 145 archivos · 1249 pasados · 1 saltado |
| Tests de accesibilidad | ✅ 10 archivos · 61 pasados               |
| Build de producción | ✅ exit 0                                    |

No se usó `--force` ni se suprimió ningún fallo. No había fallos previos en el baseline: los tres
fallos aparecidos durante la tarea fueron regresiones propias y se corrigieron (dos aserciones del
guardarraíl demasiado literales y una consulta de `BudgetItemsTable` que debía acotarse a la vista
de escritorio tras el pivote responsive).

## 20. Consumidores diferidos

- ~~Tablas de admin: `AdminActionsTable`, `AdminEventTable`, `ReviewModerationTable`,
  `VendorModerationTable`, `AdminUsersView`, `VendorServiceTable`, `QuoteComparisonTable`.~~
  **Migradas el 2026-07-26 — ver §23.** No queda ninguna tabla con markup propio en producción.
- Paginación: `EventsListPage` ya migrada; quedan `shared/ui/Pagination` (modo cursor con
  selector de tamaño, usado por los listados admin) y `PublicVendorProfile`.
- Diálogos: `CreateTaskDialog`, `DeleteTaskDialog`, `AddBudgetItemModal`,
  `DeleteBudgetItemDialog`, `CancelBookingDialog`, `ConfirmBookingDialog`,
  `CreateBookingDialog`, `RejectQuoteDialog`, `CancelQRDialog`, `ModerationDialog`,
  `VendorModerationDialog`, `CategoryFormDialog`, `CategoryDeleteDialog`,
  `EventTypeFormDialog`, `EventTypeDeleteDialog`, `SeedResetDialog`, `AIRegenerateDialog`,
  `ApplyAIBudgetDialog`, `ReplaceConfirmationDialog`, `CategoryInactiveErrorDialog`,
  `DeleteImageDialog`, `DeleteProfileDialog`, `DeactivateServiceDialog`, `CreateServiceDialog`.
- Menús: `TaskStatusMenu` (menú propio con `role="menu"` acoplado a la máquina de estados de
  tarea) y `NotificationsBell` (candidato natural a `Popover`).
- Cards: `OrganizerDashboard` / `VendorDashboard` conservan sus enlaces rápidos con markup propio;
  `WorkGrid`, `AIBudgetViewer` y el resto de superficies con contenedores propios.

## 21. Limitaciones conocidas

- **Sin animación de entrada/salida en overlays.** Se descartó el `transition` de Headless UI
  porque depende de `transitionend`, que jsdom no dispara: el diálogo podría no desmontarse en
  test. El grupo cumple *reduced motion* por ausencia de movimiento; añadir animación exigirá
  tokens de motion y un test que no dependa de eventos de transición.
- **`ResponsiveTable` decide por CSS, no por `matchMedia`.** Ambas vistas están en el DOM y la
  exclusión la hace `display:none` (que sí retira del árbol de accesibilidad y del orden de
  foco). En jsdom no hay media queries, por lo que el test verifica la exclusión mutua de las
  clases, no el render efectivo por viewport.
- **`Tooltip` mide la posición al abrir** y se cierra ante scroll o resize en vez de seguir al
  disparador; no hay librería de posicionamiento instalada y no se añadió ninguna.
- **`CurrencyDisplay` espera un locale de EventFlow** (`es-LATAM`, `es-ES`, `pt`, `en`): un tag
  BCP-47 arbitrario degrada al locale por defecto, comportamiento heredado de `formatCurrency`.
- **`Tabs` no es *route-aware*.** No existe ese patrón en el repositorio; introducirlo sería
  inventar acoplamiento con el router.
- **Validación visual pendiente.** No hay regresión visual automatizada ni Storybook (CMP-Q-003
  sigue abierta sobre `ai.border`); el contraste se valida por tokens, no por captura.

## 22. Siguiente grupo recomendado

**AI & Progress**: `AIRecommendation`, `AILabel`, `AIActionGroup`, `AILoadingState`,
`AIFallbackState`, `AIErrorState` (Component Foundations §31) junto con `Stepper` y `Timeline`
(§25). Es el único grupo P0 que queda sin catálogo compartido, ya tiene tokens dedicados
(`ai.*`, `aiRecommendation.*`) y hoy vive disperso en `features/ai/*` con markup propio. Se
apoyará en `Card`, `Modal`, `ConfirmationDialog` y `Accordion` de este grupo. Después de él, el
**provider y la cola de `Toast`**, que sigue siendo la única pieza de feedback sin infraestructura.

---

## 23. Revisión 2026-07-26 — migración de todas las tablas de producción

### 23.1 Hallazgo

Auditoría de las páginas con tabla: de **12** `<table>` en producción, **una** (`BudgetItemsTable`,
§17) usaba las primitivas del design system. Las **11** restantes montaban markup propio con
clases de paleta cruda de Tailwind. La causa era la decisión de alcance de §20 («consumidores
diferidos»), no un defecto puntual.

Desviaciones de token encontradas, por gravedad:

| # | Desviación | Dónde | Regla incumplida |
|---|---|---|---|
| 1 | CTA primaria en `bg-blue-600` | `ApplyAIBudgetDialog` | FC-01 / UI-DEC-003: la acción primaria es violeta, **nunca** azul |
| 2 | Acento e interacción en escala `indigo` | `QuoteComparisonTable` | UI-DEC-002: la marca es violeta; indigo no existe en el sistema |
| 3 | Barra de progreso en `bg-purple-600` | `AIBudgetViewer` | `purple` de Tailwind está fuera del sistema (§ tokens AI) |
| 4 | CTA de creación en `bg-neutral-900` | `VendorServiceTable` | La CTA oscura es de **marketing** (UI-DEC-003), no de plataforma |
| 5 | Badges de estado como tablas de clases ad-hoc | `AdminEventTable`, `AdminUsersView`, `VendorServiceTable`, `AdminActionBadge` | Component Foundations §14: el mapeo estado → tono vive en el feature, la pintura en `StatusBadge` |
| 6 | `neutral-*` / `red-*` para texto, borde, divisores y estados | Las 11 tablas | Design Tokens §6 y §30: los componentes consumen semánticos, nunca primitivos |

### 23.2 Migración

| Archivo | Cambio |
|---|---|
| `admin/admin-actions/AdminActionsTable` (+ `AdminActionRowExpansion`) | `Table` · `Button` · `ErrorState` / `EmptyState`; fila de expansión sobre `bg-surface-subtle` |
| `admin/events/AdminEventTable` | `Table` · `StatusBadge` (vía `STATUS_BADGE_TONE`) · `Badge` · `TextLink` para la acción de navegación |
| `admin/reviews/ReviewModerationTable` (+ `AdminActionBadge`) | `Table` · `Button`; el badge pasa a `StatusBadge` con mapeo `published→neutral`, `hidden→warning`, `removed→error` |
| `admin/vendors/VendorModerationTable` | `Table` · `Button` (el `VendorStatusBadge` ya usaba `StatusBadge` desde PB-P2-029) |
| `admin/users/AdminUsersView` | `Table` + `TableStatusRow` para el vacío dentro del `<tbody>` · `StatusBadge` · `Badge variant="seed"` · `Skeleton` · filtros a `FormField` + `Select` / `SearchInput` |
| `admin/metrics/AIMetricsCard` | `Card` + `Table`; se elimina un `aria-describedby` redundante que apuntaba al propio `<caption>` |
| `admin/seed/SeedDemoPanel` | `Table` en las tres tablas de conteos · `Alert` (aviso y reporte) · `Card` + `DescriptionList` · `Button` · `Skeleton` |
| `vendor-services/VendorServiceTable` | `Table` · `StatusBadge` · `Button` (CTA primaria violeta, acciones de fila `destructive`/`secondary`) |
| `quotes/QuoteComparisonTable` | `Table` con columna de etiquetas fija (`sticky` sobre `bg-surface`) · `TextLink` · `Alert`; indigo eliminado |
| `ai/budget-suggestion/AIBudgetViewer` | `Card` + `Table`; la barra de porcentaje conserva su ARIA y pasa a `bg-action-primary` sobre `bg-surface-disabled` |
| `ai/hitl/budget/ApplyAIBudgetDialog` | `Table` · `Checkbox` · `Input` · `Button` · `Alert`; CTA primaria deja de ser azul |

**Semántica accesible preservada en todas**: `<caption>` (sr-only por defecto), `scope="col"` /
`scope="row"`, `aria-expanded` + `aria-controls` de la fila expandible, `aria-label` de las
acciones por fila, `aria-live` de los contadores y `role="progressbar"` con su rango. Alineación
numérica homogénea con `align="numeric"` (derecha + `tabular-nums`).

**Superficie**: las tablas que se apoyan directamente en el lienzo de contenido reciben
`containerClassName="rounded-card border border-subtle bg-surface"`. Sin ello, tras la adopción
del lienzo cálido (`EventFlow-Main-Layout-Implementation.md` §17) la cabecera `bg-surface-subtle`
(`#FAFAFA`) quedaba a un paso indistinguible del fondo (`#FCF9F8`).

### 23.3 Excepciones conscientes

- **`ProgressIndicator` no sustituye la barra en línea de `AIBudgetViewer`**: la primitiva
  renderiza su propio label visible sobre la barra, pensado para progreso de sección. Dentro de
  una celda duplicaría la columna de categoría. Se conservan ARIA y tokens.
- **`ApplyAIBudgetDialog` sigue con su shell de diálogo propio**: los overlays siguen en la lista
  de diferidos de §20; esta revisión sólo cubre tablas y los tokens de lo que las rodea.
- **`AIBudgetViewer` no adopta `AIRecommendationCard`**: pertenece al grupo AI (§22), no a éste.

### 23.4 Verificación

| Comando | Resultado |
|---|---|
| `npm run lint` | ✔ 0 warnings / 0 errores |
| `npm run typecheck` | Verde |
| `npm run test` | **151 archivos / 1356 tests** en verde, 1 saltado |
| `npm run build` | Verde |
| Barrido `grep` de `<table>` en producción | 0 fuera del design system |
| Barrido `grep` de paleta cruda en los archivos migrados | 0 |

Se añadió la clave `admin.users.filters.clearSearch` en los cuatro locales (`es-LATAM`, `es-ES`,
`pt`, `en`) para el botón de limpiar de `SearchInput`. Ninguna otra clave cambió.
