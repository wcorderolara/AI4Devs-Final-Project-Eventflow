# EventFlow — Component Foundations

## Document metadata

| Campo | Valor |
| --- | --- |
| Nombre del documento | EventFlow — Component Foundations |
| Versión | 1.0 |
| Estado | Ready for Product Owner, UX, and frontend review |
| Fecha | 2026-07-21 |
| Idioma | Español neutro (Latinoamérica) |
| Producto | EventFlow (MVP) |
| Audiencia | Product Design, UX/UI, Figma, Frontend Engineering, QA, Accessibility Review, AI coding agents |
| Alcance | Fundamentos de componentes para el MVP (anatomía, variantes, estados, accesibilidad, tokens, responsive, guía Figma/Frontend/Testing). No incluye código de producción, componentes Figma ni stories de Storybook. |
| Artefactos relacionados | `docs/ux-ui/EventFlow-UI-Foundations.md`, `docs/ux-ui/EventFlow-Design-Tokens.md`, `docs/ux-ui/EventFlow-Visual-Language-Reference.md`, `docs/2-Product-Owner-Decisions.md`, `docs/3-MVP-Scope-Definition.md`, `docs/4-Business-Rules-Document.md`, `docs/5-User-Roles-Permissions-Matrix.md`, `docs/7-AI-Features-Specification.md`, `docs/8-Use-Cases-Specification.md`, `docs/9-Functional-Requirements-Document.md`, `docs/10-Non-Functional-Requirements.md`, `docs/15-Frontend-Architecture-Design.md`, `docs/17-AI-Architecture-and-PromptOps-Design.md`, `docs/20-Testing-Strategy.md` |
| Fuente de verdad | Este documento es la fuente de verdad para la anatomía, variantes, estados, accesibilidad y consumo de tokens de los componentes MVP. UI Foundations define intención visual; Design Tokens define valores reutilizables; este documento define componentes. |
| Próximos artefactos aguas abajo | Figma component library (component sets + variants + token binding), Storybook catalog, React component APIs, visual regression baselines, development tasks de user stories que consumen componentes. |

---

## 1. Purpose

Este documento traduce los `EventFlow-UI-Foundations.md` y `EventFlow-Design-Tokens.md` aprobados en un modelo de componentes coherente, accesible y proporcional al MVP.

Existe para:

- Fijar la anatomía, variantes, estados y comportamientos accesibles de cada componente antes de construir la librería en Figma o implementarlos en React.
- Establecer un contrato compartido entre Product Design, UX/UI, Figma, Frontend Engineering, QA, revisión de accesibilidad y agentes de IA de codificación.
- Prevenir duplicación de componentes por rol, explosión de variantes y valores hardcoded que se salgan del sistema de tokens.
- Garantizar que las interacciones asistidas por IA sigan un modelo human-in-the-loop y que el contenido sugerido nunca se confunda con datos confirmados.

Este documento **no** es:

- Código de producción (React, TSX, CSS, Tailwind).
- Definición de props / interfaces TypeScript.
- La librería final de Figma (component sets con variant properties, boolean properties y auto-layout ya terminados).
- El catálogo Storybook.
- La especificación de rutas, endpoints, esquemas Zod, mappers ni tests.

Consumidores previstos: Product Owner (aprobación), UX/UI (Figma), Frontend Engineering (implementación), QA (planes de prueba y accesibilidad), agentes de IA que generan código (referencia de comportamiento y anatomía).

---

## 2. Scope

### 2.1 Included

- Principios del sistema de componentes.
- Arquitectura y composición (foundation → composite → feature composition → page).
- Convenciones de naming.
- Plantilla estándar de especificación por componente.
- Modelo global de estados y modelo global de tamaños.
- Foundation components (Button, IconButton, Link, Text, Heading, Badge, Avatar, Divider, Spinner, Skeleton).
- Form components (FormField, Label, Input, Textarea, Select, Checkbox, RadioGroup, Switch, DateInput, CurrencyInput, SearchInput, FileUpload, FormError, FormHelperText).
- Navigation components (AppSidebar, SidebarItem, MobileNavigationDrawer, TopBar, Breadcrumb, UserMenu, LanguageSelector, Pagination).
- Feedback components (Alert, Toast, InlineMessage, ProgressIndicator, StatusBadge, EmptyState, ErrorState, PermissionDeniedState, NotFoundState).
- Data-display components (Card, MetricCard, List, Table, DataTable foundation, FilterBar, Tabs, Accordion, Timeline, ProgressSummary, DescriptionList, PriceDisplay, CurrencyDisplay).
- Overlay components (Modal, ConfirmationDialog, Drawer, DropdownMenu, Popover, Tooltip).
- AI components (AIRecommendation, AILabel, AILoadingState, AIFallbackState, AIErrorState, AIActionGroup).
- Marketing components (MarketingHeader, Hero, CTAGroup, FeatureCard, ContentSection, MarketingFooter, ProductPreview).
- Guía de uso por rol (`organizer`, `vendor`, `admin`) reutilizando el sistema compartido.
- Iconografía como requisito independiente de la librería final.
- Reglas de microcopy y comportamiento responsive.
- Matriz de accesibilidad WCAG 2.1 AA y matriz de consumo de tokens.
- Guía no ejecutable para Figma y para implementación Frontend.
- Guía de testing (unit/component, integración, visual regression, accesibilidad).
- Registro de decisiones, decisiones diferidas, riesgos y preguntas abiertas.

### 2.2 Not included

- Implementación React, JSX, TSX.
- Definición de props TypeScript, interfaces, tipos o composición APIs.
- Clases Tailwind, configuración `tailwind.config.ts`, CSS custom properties finales.
- Storybook stories.
- Componentes Figma finales (variant properties concretos, auto-layout resuelto, instance-swap resueltos).
- Screens pixel-perfect.
- Dark mode.
- Temas por rol.
- Data visualization avanzada (gráficos complejos, dashboards analíticos).
- Componentes nativos móviles.
- Features post-MVP (chat conversacional AI, generación de imágenes, pasarela de pago, firma electrónica).
- Documentación completa del design system.
- Definición de rutas y layouts finales.
- Lógica de backend, contratos OpenAPI, seeds, migraciones.

---

## 3. Sources

Se leyeron y consumieron las siguientes fuentes:

| Fuente | Contribución |
| --- | --- |
| `docs/ux-ui/EventFlow-UI-Foundations.md` | Autoridad visual: paleta, tipografía, radius, layout, navegación, principios AI-UX, WCAG 2.1 AA, i18n, moneda, motion, riesgos y decisiones UI-DEC-001..015. |
| `docs/ux-ui/EventFlow-Design-Tokens.md` | Autoridad de tokens: primitives, semantics, aliases de componente (Button, Input, Card, Sidebar item, AI recommendation), contrast matrix, decisiones TOK-DEC-001..024. |
| `docs/ux-ui/EventFlow-Visual-Language-Reference.md` | Inspiración visual (Jurny) — solo referencia. Confirma marketing warmth vs. platform calm; explicita qué NO copiar (blobs decorativos, glifos, illustration set). |
| `docs/2-Product-Owner-Decisions.md` | Decisiones vinculantes: light theme, WCAG 2.1 AA, 4 locales, human-in-the-loop AI, no dark mode, no image generation, no chat, sin pagos/firma. |
| `docs/3-MVP-Scope-Definition.md` | Alcance funcional: journeys `organizer` / `vendor` / `admin`; superficies UI necesarias. |
| `docs/4-Business-Rules-Document.md` | Reglas de negocio con impacto UI (currency inmutable, no conversión, lifecycle eventos, soft-delete, aprobaciones vendor, quote workflow, booking sin pago, AI-HITL). |
| `docs/5-User-Roles-Permissions-Matrix.md` | Diferencias por rol en navegación, badges y CTAs sin temas visuales. |
| `docs/7-AI-Features-Specification.md` | 8 features AI (plan, checklist, budget, categorías, brief, comparativa, bio vendor, priorización) → variantes de `AIRecommendation`. |
| `docs/8-Use-Cases-Specification.md` | Casos de uso concretos que dictan modales, wizards, listas, filtros y estados. |
| `docs/9-Functional-Requirements-Document.md` | FRs que dictan formularios, tablas, notificaciones y wizards. |
| `docs/10-Non-Functional-Requirements.md` | A11y, i18n, performance (skeletons + streaming AI), seguridad de upload, error envelope. |
| `docs/15-Frontend-Architecture-Design.md` | Stack: Next.js 14 App Router, TanStack Query 5, React Hook Form 7 + Zod, next-intl, Tailwind + tokens, Headless UI + Radix selectivos, lucide-react, TanStack Table selectivo. Determina server vs. client components y ownership de loading/error states. |
| `docs/17-AI-Architecture-and-PromptOps-Design.md` | Modelo de errores (`AITimeoutError`, `AIInvalidOutputError`, `AIProviderUnavailableError`, `AIProviderNotConfiguredError`), correlation IDs, 60 s timeout, fallback mock, HITL obligatorio. |
| `docs/20-Testing-Strategy.md` | Coverage esperado por nivel; MSW; Playwright para journeys AI; a11y con axe-core recomendado. |

```text
Fuentes no disponibles
```

Ninguna de las fuentes primarias faltó. La `DESIGN_SYSTEM_SETUP_REFERENCE` no fue provista con ruta concreta y se omitió sin efecto en el resto del documento.

---

## 4. Authority and conflict resolution

Orden de autoridad aplicado en este documento:

1. `EventFlow-UI-Foundations.md`.
2. `EventFlow-Design-Tokens.md`.
3. Product Owner Decisions.
4. MVP Scope Definition.
5. Business Rules.
6. Roles and Permissions.
7. Functional Requirements.
8. Non-Functional Requirements.
9. Frontend Architecture.
10. AI Architecture and PromptOps.
11. Testing Strategy.
12. EventFlow Visual Language Reference.
13. Design System Setup reference image.
14. Recomendaciones generales de sistemas de componentes.

Reglas:

- UI Foundations define **intención visual**.
- Design Tokens define **valores reutilizables** (primitives, semantics, aliases).
- Component Foundations define **anatomía, variantes, estados, comportamiento, accesibilidad y consumo de tokens**.
- Figma y Frontend deben implementar estas decisiones; ninguno puede introducir valores hardcoded que evadan tokens.
- La referencia Figma externa (Jurny) es únicamente inspiración: no es autoridad de anatomía, comportamiento, contenido, branding, ni navegación autenticada.

Cuando una regla de este documento entra en conflicto con una fuente inferior, prevalece este documento en lo que se refiere a componentes; cuando entra en conflicto con UI Foundations o Design Tokens, prevalecen las fuentes superiores y se registra la desviación como decisión revisable.

---

## 5. Component-system principles

1. **Composición sobre variantes**. Preferir componer componentes existentes en vez de agregar variantes universales configurables.
2. **Accesibilidad es parte de la anatomía**. Cada componente interactivo incluye foco visible, nombre accesible, orden de teclado y semántica programática desde su definición.
3. **Tokens semánticos primero**. Los componentes consumen semantics + component aliases; nunca primitives ni valores hardcoded.
4. **Un solo sistema para todos los roles**. `organizer`, `vendor`, `admin` comparten componentes. Las diferencias se expresan por contenido, permisos, etiquetas, métricas, visibilidad de navegación, role badges y acciones contextuales.
5. **Marketing y plataforma comparten fundamentos**, con variantes contextuales (por ejemplo dark CTA en landing vs. violet CTA en plataforma).
6. **Estados obligatorios**. Cada componente interactivo declara: default, hover, focus, active, disabled, loading y error cuando aplican.
7. **Estados de producto son de primera clase**. Empty, loading, error y permission-denied son parte del contrato del componente/página.
8. **La IA nunca se confunde con datos confirmados**. Cualquier salida IA en estado pending o editing se distingue visual y semánticamente del contenido aceptado.
9. **Mobile es parte del componente**, no una capa aparte.
10. **Cuatro locales**. Los componentes se diseñan considerando expansión 20–30 % del texto en `es-LATAM`, `es-ES`, `pt`, `en`.
11. **Etiquetas largas y traducidas**. El wrapping, truncado y respiración vertical deben tolerarlo.
12. **Complejidad proporcional al MVP**. Sin data-grid empresarial, sin dark mode, sin temas por rol.
13. **Nada para features fuera del MVP**. No se especifican componentes para chat AI conversacional, generación de imágenes ni pasarela de pagos.
14. **No duplicar por rol**.
15. **Composición extensible antes que un componente universal ultra configurable**.
16. **Backend es la autoridad de autorización**. Estados frontend `disabled` u ocultos son ayudas de UX, no controles de seguridad.
17. **Reutilizar tokens existentes**. Si existe un token semántico o alias, usarlo antes de proponer valor nuevo.
18. **Sin valores hardcoded** en el componente.
19. **Preferir composición** sobre APIs universales.
20. **Anatomía + comportamiento**, no implementación.

---

## 6. Component architecture

```text
Design Tokens
    ↓
Foundation Components (Button, Input, Badge, Text, Card, Spinner, Skeleton, ...)
    ↓
Composite Components (FormField, StatusBadge, DataTable, AIRecommendation, Alert, ...)
    ↓
Feature Compositions (QuoteSummaryCard, EventProgressPanel, VendorApprovalRow, AIChecklistPanel, ...)
    ↓
Pages (EventDashboard, VendorDirectory, AdminApprovalQueue, ...)
```

Definiciones:

- **Foundation components**: piezas reutilizables sin lógica de dominio.
- **Composite components**: combinan foundations para resolver patrones recurrentes (por ejemplo `FormField` = Label + control + helper + error).
- **Feature compositions**: componentes específicos de un dominio de EventFlow que reutilizan foundations y composites pero **no** se promueven al design system global. Viven dentro de `features/<feature>/components/`.
- **Pages**: composiciones de layout + secciones + feature compositions dentro del App Router de Next.js.

Reglas:

- Un componente se promueve al design system global solo si se usa en ≥ 2 features y su anatomía es estable.
- Antes de crear un componente nuevo, evaluar si una composición de existentes cubre el caso.
- No generalizar componentes con lógica que solo aplica a un feature; mantenerlos como feature compositions.
- Los feature compositions **sí** deben consumir tokens y foundations; nunca hardcodean estilos.

---

## 7. Naming conventions

- **Component names**: `PascalCase` semántico (`AIRecommendation`, `StatusBadge`, `QuoteSummaryCard`).
- **Variants**: `PascalCase` breve orientado al propósito (`Primary`, `Secondary`, `Ghost`, `Destructive`, `Info`, `Success`, `Warning`, `Error`).
- **Sizes**: `sm`, `md`, `lg`. Solo estos tres. Evitar `xs`, `xl`, sizes intermedios.
- **States**: `Default`, `Hover`, `Focus`, `Active`, `Selected`, `Disabled`, `ReadOnly`, `Loading`, `Success`, `Warning`, `Error`, `Empty`, `Pending`, `Accepted`, `Edited`, `Rejected`, `Fallback`, `Timeout`.
- **Slots**: nombres semánticos (`header`, `body`, `footer`, `media`, `leadingIcon`, `trailingIcon`, `actions`).
- **Composite components**: nombran el patrón (`FormField`, `Alert`, `DataTable`), no el dominio.
- **Feature-specific components**: incluyen el dominio (`QuoteSummaryCard`, `EventProgressPanel`, `VendorApprovalRow`, `AIChecklistPanel`).
- **Figma naming**: `Category/Component/Variant`. Ejemplos: `Foundation/Button/Primary`, `Feedback/Alert/Warning`, `AI/AIRecommendation/Pending`.
- **Storybook naming (guía)**: `Category/Component` como grupo; una story por variante o estado significativo (no combinatoria completa).
- **Test identifiers**: `data-testid="componentName.slot"` en formato lowerCamelCase (por ejemplo `aiRecommendation.actions.accept`). Se prefiere `getByRole` / `getByLabelText`; los `data-testid` son de respaldo, especialmente en E2E cuando el router de Next monta announcers con roles conflictivos.

Prohibido nombrar componentes solo por apariencia (`PurpleCard`, `BigButton`, `RoundedBox`). Prohibido incluir tokens en el nombre del componente (`Button--violet700`).

---

## 8. Component specification template

Cada componente en este documento se describe con la siguiente estructura ligera:

### Component name

#### Purpose

Qué problema de UX resuelve.

#### Priority

`P0` | `P1` | `P2` | `Out of Scope`.

#### Contexts

Superficies donde aparece (marketing, platform, admin, AI, etc.).

#### Anatomy

Partes visibles y slots.

#### Variants

Variantes justificadas por casos reales.

#### Sizes

Tamaños permitidos (`sm`, `md`, `lg` cuando aplica).

#### States

Estados relevantes del catálogo global.

#### Behavior

Interacciones esperadas.

#### Responsive behavior

Cambios en mobile / tablet / desktop.

#### Accessibility

Requisitos WCAG 2.1 AA específicos.

#### Token dependencies

Tokens semánticos y aliases que consume; qué está prohibido hardcodear.

#### Content rules

Reglas de microcopy y contenido.

#### Usage guidelines

Cuándo usarlo y cuándo no.

#### Anti-patterns

Patrones a evitar.

#### Open decisions

Preguntas abiertas específicas del componente, si existen.

Este template se aplica en las secciones 11–32. Cuando un ítem no aplica, se omite explícitamente.

---

## 9. Global state model

Vocabulario compartido:

| Estado | Aplicable a | Descripción |
| --- | --- | --- |
| `Default` | Todos los interactivos | Estado inicial idle. |
| `Hover` | Punteros | Mouse encima. |
| `Focus` | Todos los interactivos (`focus-visible`) | Foco por teclado o programático. |
| `Active` | Interactivos | Presionado. |
| `Selected` | Ítems seleccionables (SidebarItem, Tab, Checkbox, Radio, filtro) | Estado activo persistente. |
| `Disabled` | Interactivos y form controls | Deshabilitado por UX; no reemplaza autorización backend. |
| `ReadOnly` | Form controls, `<Money>`, campos derivados | Solo lectura visible. |
| `Loading` | Buttons, forms, panels AI, listas, tablas | Operación en curso. |
| `Success` | Alerts, Toasts, InlineMessage, StatusBadge, ProgressIndicator | Confirmación. |
| `Warning` | Alerts, Toasts, InlineMessage, StatusBadge, BudgetSummary | Requiere atención sin bloquear. |
| `Error` | Form controls, Alerts, Toasts, StatusBadge, panels AI, listas | Falla o entrada inválida. |
| `Empty` | Listas, tablas, panels, feature compositions | Sin datos. |
| `Pending` | `AIRecommendation`, StatusBadge de flujos de aprobación, Quote | Esperando acción humana. |
| `Accepted` | `AIRecommendation`, Quote | Confirmado por usuario; en AI implica materializar como dato normal. |
| `Edited` | `AIRecommendation`, campos AI-generados | Aceptado con modificaciones; conserva audit trail. |
| `Rejected` | `AIRecommendation`, Quote, VendorProfile | Descartado. |
| `Regenerating` | `AIRecommendation` | Nueva generación reemplazando la anterior. |
| `Fallback` | `AIRecommendation`, `AIFallbackState`, Toast | Se usó `MockAIProvider` o plantilla base. |
| `Timeout` | `AIRecommendation`, `AIErrorState` | La IA excedió el timeout de 60 s. |

Reglas:

- No se fuerzan estados irrelevantes (por ejemplo `Loading` en un `Divider`).
- `Selected` es visualmente distinto de `Active` y `Focus`.
- El color nunca es la única señal (los estados semánticos exponen icono y/o texto).
- `Accepted` en AI **debe** transitar a la presentación de dato normal, no permanecer visualmente como una sugerencia.
- `ReadOnly` no visualmente idéntico a `Disabled`; `Disabled` implica no operable.

---

## 10. Global size model

Vocabulario de tamaño:

- `sm` — compacto: tablas densas, filter bars, acciones secundarias, admin queues.
- `md` — **default**: formularios, cards de plataforma, acciones primarias en flujos autenticados.
- `lg` — prominente: CTAs de landing, hero forms, acciones críticas destacadas.

Mapeo conceptual a tokens existentes (no redefinen valores):

| Size | Height / control | Padding vertical | Padding horizontal | Tipografía | Notas |
| --- | --- | --- | --- | --- | --- |
| `sm` | `size.control.sm` (32 px) | `space.3` (6) | `space.5` (12) | `typography.button.md` o `font.size.body.sm` | Debe respetar `size.touch.minimum` (44 px) cuando el control es táctil. Se logra con área táctil ampliada aun cuando el visual mida 32 px. |
| `md` | `size.control.md` (40 px) | `space.4` (8) | `space.6` (16) | `typography.button.md` | Default. |
| `lg` | `size.control.lg` (48 px) | `space.5` (12) | `space.7` (20) | `typography.button.lg` | CTAs de landing y acciones destacadas. |

Reglas:

- `md` es el default.
- Controles icon-only siempre garantizan touch target 44 × 44 px sin importar el tamaño visual del icono.
- No se aceptan tamaños intermedios sin decisión formal (`Deferred`).

---

## 11. Buttons

### Button

#### Purpose

Acción primaria o secundaria del usuario en cualquier superficie.

#### Priority

`P0`.

#### Contexts

Landing (marketing CTA), plataforma autenticada, formularios, modales, filtros, empty states.

#### Anatomy

`[leadingIcon?] · Label · [trailingIcon?]` dentro de un contenedor con radius `radius.button` (8 px), altura según `size.control.*`, foco visible según `focus.ring.*`.

#### Variants

- **Primary — Platform**: `button.primary.*` con `color.action.primary.background` violeta.
- **Primary — Marketing**: alias `color.marketing.cta.*` en dark neutral. Se implementa como variante contextual del mismo componente, no un componente separado.
- **Secondary**: `button.secondary.*` con borde y fondo neutro.
- **Ghost**: transparente, hover `color.action.ghost.hover`.
- **Destructive**: `color.action.destructive.*`. Nunca violeta/lila/coral.
- **Link-style**: solo cuando la acción es navegacional o secundaria dentro de un texto; ver §12.

#### Sizes

`sm`, `md`, `lg` (§10).

#### States

Default, Hover, Focus, Active, Disabled, Loading. Sin estado Selected en Button.

#### Behavior

- `Loading`: el label se sustituye por spinner + texto de acción en participio (`Guardando…`, `Enviando…`); el botón sigue anunciando su nombre accesible. La acción no debe dispararse dos veces (guardas de doble-click a nivel de implementación).
- `Disabled`: no dispara acción; se comunica programáticamente (`aria-disabled` o `disabled` real; los interactivos que necesitan foco por descubrimiento usan `aria-disabled`).
- Destructive: cuando la consecuencia es irreversible, delegar en `ConfirmationDialog` (§30).
- Leading/trailing icons: puramente decorativos si el label ya describe la acción; con label vacío ver `IconButton`.

#### Responsive behavior

- Botones primarios de acción crítica pueden ser `full-width` en mobile (por ejemplo CTAs de landing, submit de formulario largo).
- Los botones de un `AIActionGroup` en mobile deben apilarse verticalmente cuando el ancho no alcanza para ubicarlos horizontalmente sin recortar labels.

#### Accessibility

- Nombre accesible obligatorio (label visible o `aria-label` si icon-only).
- Foco visible con `focus.ring.color` (violet-700) + `focus.ring.offset` (2 px, blanco) para asegurar contraste ≥ 3:1 incluso sobre CTAs violet-600.
- Touch target ≥ 44 × 44 px (§10).
- `Loading` anunciado (`aria-busy="true"`).
- `Disabled` no debe ser la única forma de comunicar falta de permisos; usar copy o `PermissionDeniedState` cuando aplique.

#### Token dependencies

Consume: `button.primary.*`, `button.secondary.*`, `color.action.destructive.*`, `color.action.ghost.*`, `color.marketing.cta.*`, `radius.button`, `size.control.*`, `typography.button.*`, `focus.ring.*`, `motion.control.hover`, `motion.control.press`. Prohibido hardcodear color, radius, height, padding, font-size, transition duration.

#### Content rules

- Label imperativo y específico (`Crear evento`, `Enviar cotización`, `Confirmar reserva`).
- Evitar labels genéricos (`Continuar`, `Aceptar`) cuando existe uno más específico.
- En destructive, nombrar la consecuencia (`Eliminar borrador`, `Cancelar reserva`).
- Sentence case en `es-LATAM`, `es-ES`, `pt`; title case natural en `en` para CTAs de marketing.

#### Usage guidelines

- Usar Primary para la acción principal de la vista; solo una Primary por sección típica.
- Secondary/Ghost para acciones alternativas.
- Destructive solo cuando la acción destruye o cambia irreversiblemente estado.
- No usar Button para navegación pura (usar `NavigationLink` / `TextLink`).

#### Anti-patterns

- Rojo destructive para reject de sugerencia AI (usar Ghost o Secondary neutro).
- Múltiples Primary compitiendo.
- Label que solo dice `OK` en un `ConfirmationDialog`.
- Colores decorativos (violet/lila/coral) para success/error.
- Iconos solos sin `aria-label`.

#### Open decisions

Ninguna bloqueante.

### IconButton

#### Purpose

Acción compacta en la que un icono comunica claramente el propósito.

#### Priority

`P0`.

#### Anatomy

Área táctil ≥ 44 × 44 px con un icono de `icon.size.md` (o `sm` en tablas densas) centrado.

#### Sizes

`sm` (visual 32, área táctil 44), `md` (40), `lg` (48). En `sm` es obligatorio ampliar el hit-area sin distorsionar el layout.

#### States

Default, Hover, Focus, Active, Disabled, Loading.

#### Behavior

- Siempre debe tener `aria-label` o `aria-labelledby`.
- `Tooltip` se muestra en hover y focus; el tooltip no reemplaza el nombre accesible.
- `Loading` reemplaza el icono con `Spinner sm` conservando el label accesible.

#### Accessibility

- Nombre accesible obligatorio.
- Foco visible.
- Touch target ≥ 44 × 44 px.
- No usar IconButton como única acción destructive crítica; combinar con `ConfirmationDialog` o etiqueta visible (`Button` con `leadingIcon` + label).

#### Token dependencies

Consume: los mismos que `Button` para color/radius/focus; `icon.size.*`, `icon.stroke.*`.

#### Anti-patterns

- IconButton sin `aria-label`.
- IconButton destructive sin confirmación.
- IconButton con hit-area < 44 px.

---

## 12. Links and inline actions

### TextLink

Enlace textual dentro de contenido.

- Color: `color.text.link` (violet-700) por default; hover `color.text.linkHover`.
- Subrayado: visible por default (o subrayado en hover con línea inferior siempre presente en foco).
- Foco visible con `focus.ring.*`.
- Estado `visited` no se altera en superficies transaccionales para evitar ruido visual; puede usarse en catálogos si aporta claridad.

### NavigationLink

Enlace estructural en navegación (sidebar, breadcrumb, top bar).

- Estado `Selected` cuando la ruta coincide.
- Nombre accesible = label visible.
- No renderiza como botón (`role="link"` por semántica de `<a href>`).

### InlineAction

Botón con apariencia de link dentro de una tabla o card cuando la acción no navega (por ejemplo `Ver detalle`).

- Semánticamente `<button>` con estilos de link (no `<a>` sin `href`).
- Usa `typography.body.md` o `typography.body.sm`; nunca solo color para diferenciarse.

### External-link indicator

Cuando el destino sale de EventFlow, mostrar icono externo pequeño + `aria-label` que anuncia "abre en nueva pestaña". Usar solo con `target="_blank" rel="noopener noreferrer"`.

### Reglas

- No usar semántica de `<button>` para navegación ni `<a>` para acciones sin destino.
- No usar solo color para indicar interactividad; siempre subrayado, underline en hover, o icono asociado.

---

## 13. Typography components

Los componentes tipográficos son wrappers semánticos delgados. La jerarquía HTML **manda** sobre la apariencia.

### Heading

- Renderiza `<h1>` a `<h6>` según nivel semántico.
- Consume `typography.marketing.*` (landing) o `typography.platform.*` (plataforma).
- Nunca elegir nivel por tamaño visual; el orden semántico es prioridad de accesibilidad.

### Text

- Wrapper `<p>` o `<span>` para body copy.
- Consume `typography.body.default` o `typography.body.supporting`.

### Label

- Etiqueta de formulario asociada a un control (`<label for="…">`). Ver §15.
- Consume `typography.form.label`.

### Caption

- Metadatos secundarios y helpers.
- Consume `typography.data.caption` o `font.size.caption`.

### NumericValue

- Cifras destacadas en `MetricCard`, `ProgressSummary`, `BudgetSummary`.
- Consume `typography.data.value` y respeta tabular-numbers cuando el token lo declare.
- No se estiliza con `font.family.mono`; el mono se reserva para identificadores técnicos.

Reglas:

- No crear un componente tipográfico por cada token.
- Semántica HTML antes que apariencia (`<h1>` no debe existir dos veces por página; nunca usar `<h2>` para dar visual "medio" si el orden semántico no lo requiere).

---

## 14. Badges, statuses, and tags

### Badge

Etiqueta compacta para metadata.

- Usos: rol (`organizer`, `vendor`, `admin`), categoría de vendor, idioma preferido, workspace.
- Anatomía: `[icono opcional] · label`, `radius.badge` (full pill).
- Sizes: `sm`, `md`. `lg` solo en contextos hero de marketing (poco frecuente).
- Colores: neutros (`color.surface.subtle`, `color.text.secondary`). No usar decorativos (lilac/coral) para transmitir estado.

### StatusBadge

Badge cuyo propósito es comunicar estado de una entidad de EventFlow.

- Usos: estado de evento (`draft`, `active`, `completed`, `cancelled`), estado de vendor (`pending`, `approved`, `rejected`, `hidden`), estado de quote (`sent`, `viewed`, `responded`, `expired`, `cancelled`), booking intent, estado AI cuando aplique (`pending`, `accepted`, `edited`, `rejected`, `fallback`).
- Anatomía: `[icono semántico] · label`, colores derivados de `color.feedback.*`.
- Reglas:
  - Semántica no depende solo de color: incluye label textual y opcionalmente icono.
  - No usar colores decorativos para success/warning/error.
  - Contraste texto ≥ 4.5:1.
  - Iconos consistentes por estado (mismo glifo por estado a través de toda la aplicación).

Mapeo de tokens recomendado por estado:

| Estado | Surface | Border | Text | Icono |
| --- | --- | --- | --- | --- |
| `Success` / `accepted` / `approved` / `active` | `color.feedback.success.surface` | `color.feedback.success.border` | `color.feedback.success.text` | success glyph |
| `Warning` / `pending` / `viewed` | `color.feedback.warning.surface` | `color.feedback.warning.border` | `color.feedback.warning.text` | warning glyph |
| `Error` / `rejected` / `cancelled` | `color.feedback.error.surface` | `color.feedback.error.border` | `color.feedback.error.text` | error glyph |
| `Info` / `sent` / `edited` / `fallback` | `color.feedback.info.surface` | `color.feedback.info.border` | `color.feedback.info.text` | info glyph |
| `Neutral` / `draft` / `hidden` / `completed` / `expired` | `color.surface.subtle` | `color.border.subtle` | `color.text.secondary` | glyph neutro |

### AILabel

Etiqueta que anuncia contenido generado por IA.

- Texto visible: `Sugerencia de IA` (o su traducción en `es-ES`, `pt`, `en`).
- Icono: sparkle glyph AI compartido (ver §34 e Icon decision en §31).
- Anatomía: `sparkle · Sugerencia de IA`.
- Consume: `aiRecommendation.label` (color de texto), `color.ai.icon`, `radius.badge`.
- Requiere texto visible en superficies importantes (AIRecommendation, panels AI, badges en tareas y items de budget con `ai_generated: true` pendientes de confirmación).
- Prohibido: animated glow, gradient text sin contraste, glifos sci-fi (robot, magic wand).

Anti-patrones globales de badges:

- Uso excesivo en tarjetas y tablas.
- Colores decorativos como señal semántica.
- Iconos sin label cuando el estado es crítico.
- Pills en cada celda de una tabla admin.

---

## 15. Forms architecture

`FormField` es la composición estándar de formularios.

Anatomía:

```
Label + [required/optional indicator]
Control (Input / Textarea / Select / DateInput / CurrencyInput / etc.)
HelperText (opcional)
FormError (cuando aplica)
```

Reglas:

- Label siempre visible (los labels ocultos solo se aceptan cuando el control tiene un affordance visual inequívoco, como el ícono de búsqueda en `SearchInput` global).
- Placeholder **no** reemplaza label.
- `required` / `optional` se marca consistentemente en todo el formulario (uno de los dos, no ambos).
- Character count solo cuando hay límite de longitud relevante (bio de vendor 50–1000 chars, helper text con contador).
- Loading (por ejemplo mientras se cargan opciones de un Select) y ReadOnly (moneda inmutable, campos derivados) tienen presentación diferenciada.
- Field grouping: `<fieldset>` + `<legend>` para grupos relacionados (`Contacto`, `Ubicación`).
- Form sections: encabezadas con `Heading` de nivel apropiado.
- Form actions: al pie del formulario, alineadas a la derecha en desktop, apiladas full-width en mobile.
- Sticky actions solo cuando el formulario es largo (wizard, edición de perfil vendor) y no crean solapamiento con el teclado móvil.
- Validación: la presentación UI debe estar alineada con el error envelope `{ error: { code, message, details?, correlationId } }`. Los mensajes de campo se obtienen por `code`/`field` de `details`, no por parseo del texto.
- Zod (React Hook Form + `@hookform/resolvers/zod`) y validación backend son responsabilidad de implementación; este documento describe la presentación.

Tokens consumidos: `space.form.fieldGap`, `space.form.groupGap`, `typography.form.label`, `typography.form.helper`, `typography.form.error`, `input.*`, `radius.input`.

---

## 16. Input components

### Input

#### Purpose

Entrada de texto de una línea.

#### Priority

`P0`.

#### Variants (por tipo)

Text, Email, Password, Number, Search, Currency, Date (donde la implementación lo soporte).

#### Anatomy

`[leadingContent?] · [input field] · [trailingContent?]` dentro de un contenedor con `radius.input`, borde `input.border`, altura `input.height`.

#### Sizes

`sm`, `md` (default), `lg`.

#### States

Default, Hover, Focus (`input.borderFocus`), Active, Disabled, ReadOnly, Error, Loading (cuando aplica).

#### Behavior

- Leading/trailing: iconos decorativos o accesibles, botones (por ejemplo clear, toggle password), prefijos/sufijos (por ejemplo `$`, `MXN`).
- Clear action: sobre inputs de búsqueda y campos que el usuario limpiaría con frecuencia.
- Error: borde `color.feedback.error.border`, texto de error asociado por `aria-describedby`.
- ReadOnly: `color.surface.disabled` + `color.text.disabled` sin apariencia de deshabilitado permanente.
- Loading: usar cuando la validación async es visible (por ejemplo verificación de email o slug).

#### Responsive behavior

- En mobile, teclados adecuados: `type="email"`, `type="tel"`, `inputmode="numeric"`, `inputmode="decimal"` para moneda.
- Los prefijos/sufijos no deben empujar el input fuera de área táctil.

#### Accessibility

- Label asociado.
- Error asociado por `aria-describedby`.
- Autocomplete adecuado en campos personales (`autocomplete="email"`, `autocomplete="new-password"`).
- Password toggle debe anunciar estado (`Mostrar contraseña` / `Ocultar contraseña`).

#### Token dependencies

`input.*`, `border.input.default`, `border.input.focus`, `focus.ring.*`, `typography.form.*`, `radius.input`, `size.control.*`, `color.feedback.error.*`.

#### Content rules

Labels claros; helper text explicativo cuando el campo lo requiera; errores en lenguaje humano (nunca códigos técnicos ni mensajes crudos del backend).

#### Anti-patterns

- Placeholder como único label.
- Errores solo por cambio de color.
- Toggle de password sin nombre accesible.

### Textarea

- Resize vertical permitido; horizontal deshabilitado.
- Min/max heights recomendados: min `input.height` × 3, max flexible por contenido.
- Character count obligatorio cuando hay límite (por ejemplo bio vendor 1000 chars).
- Contenido inicial generado por IA (bio, quote brief) llega como texto editable pre-populado dentro de una superficie que anuncia claramente su origen (ver §31). Nada se guarda hasta acción explícita.

### SearchInput

- Icono de búsqueda leading.
- Clear control trailing cuando hay valor.
- Debounce es detalle de implementación (no incluido en este documento).
- Loading: cuando la búsqueda dispara consulta async.
- Estado empty search: coordina con `EmptyState` de resultados (mismo contexto, distinta capa).
- Nombre accesible: `Buscar…` con contexto (`Buscar proveedores`, `Buscar tareas`).

### CurrencyInput

#### Purpose

Ingreso de montos monetarios con formato consistente al locale y moneda del evento.

#### Priority

`P0`.

#### Anatomy

`[currencyCode / símbolo prefix] · [input decimal] · [helperText]`.

#### Behavior

- Muestra siempre el `currencyCode` ISO cuando el símbolo es ambiguo (`$` compartido por MXN/COP/USD).
- Formato locale-aware al render y parsing tolerante en input (acepta `1.234,56` o `1,234.56` según locale).
- **Sin conversión de moneda** (BR-BUDGET-007). Nunca mostrar equivalencias en otras monedas.
- **Contexto de moneda inmutable** (BR-EVENT-007): tras la creación del evento, la moneda es fija; en formularios de edición, el `CurrencyInput` puede seguir aceptando montos pero la moneda es `ReadOnly`.
- Error y helper text: montos negativos según reglas de negocio (`planned` / `committed` no negativos).

#### Accessibility

- `aria-label` incluye la moneda ISO (`Monto en MXN`).
- `inputmode="decimal"` en mobile.

#### Token dependencies

`input.*`, `typography.data.currency`, `color.text.primary`, `color.surface.disabled` (cuando ReadOnly).

#### Anti-patterns

- Símbolo sin código cuando la moneda es ambigua.
- Selector de moneda editable después de la creación del evento.
- Sugerir conversión.

---

## 17. Selection controls

### Select

- Anatomía: label + trigger + listbox.
- Estados: Default, Hover, Focus, Open, Selected, Disabled, Loading (mientras se cargan opciones), Error.
- Keyboard: `Space`/`Enter` abre; `↑`/`↓` navega; `Esc` cierra; `Home`/`End` extremos; búsqueda por typeahead cuando la lista es larga.
- Mobile: puede delegar a select nativo cuando la implementación lo prefiera (decisión de implementación).
- La decisión nativo vs. custom queda a implementación (Frontend Architecture sugiere Headless UI/Radix para consistencia con foco y `aria-*`).

### Checkbox

- Independiente múltiple.
- Estados: Default, Hover, Focus, Checked, Indeterminate (grupo padre parcialmente seleccionado), Disabled, Error.
- Label clickeable en su totalidad.

### RadioGroup

- Selección única entre opciones visibles.
- `role="radiogroup"` con nombre accesible; navegación `↑`/`↓` entre opciones.
- No usar cuando hay más de 6 opciones visibles; a partir de ahí, `Select`.

### Switch

- Prioridad `P1` en foundation, uso justificado por: task state toggle rápido, favorito vendor, quote "preferido", filtro AI vs. confirmado, admin hide review.
- Anatomía: track + thumb + label.
- Nombre accesible obligatorio; estado anunciado (`aria-checked`).
- No usarse como sustituto de Checkbox en formularios; Switch es cambio inmediato de preferencia, Checkbox se guarda con submit.
- No inventar screens de settings para justificar switches.

---

## 18. Date and event-related controls

### DateInput / DatePicker foundation

- Presenta un input de fecha con formato locale-aware (`Intl.DateTimeFormat`).
- Estados: Default, Hover, Focus, Disabled, ReadOnly, Error.
- Restricciones: fechas mínimas/máximas según lifecycle del evento (por ejemplo `event.date` no en el pasado en creación; task `due_date` dentro del rango del evento cuando aplique).
- Keyboard: navegación por flechas dentro del calendario; `Esc` cierra el picker; `Enter` confirma.
- Mobile: puede delegar en `input type="date"` nativo cuando el navegador provea buena UX; caso contrario, popover accesible.
- Sin asumir integración con calendarios externos (Google/Outlook fuera del MVP).
- Sin componentes de calendar-sync.

Consumo de tokens: `input.*`, `radius.input`, `focus.ring.*`, `typography.data.value` para fechas mostradas.

Foundation reutilizable por: fecha del evento en el wizard, `due_date` de tareas, `valid_until` de cotizaciones.

---

## 19. File upload

### FileUpload

#### Purpose

Adjuntar archivos (imágenes de portafolio, imágenes adjuntas a tareas).

#### Priority

`P1`.

#### Contexts

Vendor profile (portafolio: máximo 10 imágenes por trabajo), otros adjuntos si aplican en el MVP.

#### Anatomy

`[Dropzone o trigger de selección]` + `[Lista de archivos]` + `[per-item: nombre, tamaño, progreso, error, remove action]`.

#### States

Default, Hover, Focus (dropzone y trigger), Dragging (dropzone), Uploading (progress), Success, Error (invalid type, size exceeded, upload failure), Disabled, ReadOnly.

#### Behavior

- Restricciones de negocio: MIME allowlist `image/jpeg`, `image/png`, `image/webp`; tamaño máx 5 MB; server resize long-edge ≤ 2048 px.
- Progreso por archivo.
- Errores por archivo específicos: tipo no permitido, tamaño excedido, fallo de red.
- Remove action: soft-delete a nivel producto (metadata preservada para audit trail); UI muestra "Eliminado" cuando el usuario lo remueve pero mantiene registro en admin.
- Alternativa accesible al drag-and-drop: siempre hay un botón `Seleccionar archivo` con `<input type="file">` semántico.

#### Accessibility

- Nombre accesible del trigger y del dropzone.
- Cambios de estado anunciados (`aria-live="polite"`).
- Foco visible en trigger, dropzone y en cada item.

#### Content rules

- Ayudas de límite visibles (`Máximo 5 MB, formatos JPG/PNG/WebP`).
- Errores humanos (`El archivo supera 5 MB`), no mensajes crudos del backend.

#### Anti-patterns

- Solo drag-and-drop sin alternativa por click.
- No mostrar tamaño ni tipo del archivo.
- No comunicar el límite antes del error.
- Exponer el path del archivo en el server.

Sin definir storage backend, endpoints ni APIs de upload.

---

## 20. Navigation foundations

### AppSidebar

#### Purpose

Navegación principal del área autenticada en desktop.

#### Priority

`P0`.

#### Anatomy

- Header (logo o wordmark).
- Workspace/role badge (`organizer`, `vendor`, `admin`).
- Navigation groups (por ejemplo `Planeación`, `Cotizaciones`, `Administración`).
- SidebarItems.
- Footer opcional (idioma, ayuda, user shortcut).
- User context integrado o delegado en `UserMenu` del `TopBar`.

#### States

Default (expanded), Hover, Focus, Active (item), Disabled (item), Loading (rare — solo si se cargan menús condicionales).

#### Behavior

- **Expanded** es el estado default y único requerido para el MVP.
- Los items visibles se derivan de rol y permisos; ítems sin permiso se ocultan (el frontend no es autoridad, es UX).
- Ítems reciben `Active` cuando la ruta actual coincide.
- Labels largos traducidos deben caber; el ancho `layout.sidebar.width` (256 px) contempla ~24 chars en la fuente base.

#### Responsive behavior

- En viewports < `breakpoint.lg` (1024 px) la sidebar desaparece y se sustituye por `MobileNavigationDrawer`.

#### Accessibility

- `<nav aria-label="Navegación principal">`.
- Ítem activo con `aria-current="page"`.
- Foco visible en cada item.

#### Token dependencies

`color.platform.sidebar.*`, `layout.sidebar.width`, `sidebar.item.*`, `space.component.padding.*`, `typography.body.md`, `focus.ring.*`.

#### Explicit constraints

- **Collapsed sidebar no es requerido para el MVP.**
- `layout.sidebar.widthCollapsed` permanece **Provisional** (TOK-DEC-023).
- No se requieren estados de collapse, persistencia de preferencia, ni tooltip-only navigation.
- Si un futuro User Story aprobado justifica collapse, se especificará entonces.

### SidebarItem

- Anatomía: `[icono]` + `label` + `[badge/count opcional]`.
- Estados: Default, Hover, Focus, Active, Disabled.
- Ítem activo: `sidebar.item.activeBackground` + `sidebar.item.activeForeground`.
- Badge opcional (por ejemplo notificaciones pendientes, cotizaciones nuevas).
- Long labels: truncado con `title` fallback o wrapping controlado.

### MobileNavigationDrawer

- Trigger: IconButton en `TopBar` con `aria-label="Abrir menú"`; touch target ≥ 44 × 44 px.
- Overlay: `color.overlay.scrim` con `shadow.overlay.modal`.
- Focus management: al abrirse recibe foco; al cerrarse regresa al trigger.
- Escape cierra; tap fuera cierra.
- Ítem actual: `aria-current="page"`.
- Body-scroll locking: detalle de implementación.
- Consume `motion.drawer.enter` / `motion.drawer.exit`.

### TopBar

- Contenido: contexto de página (título opcional o breadcrumb), trigger de menú en mobile, `UserMenu`, `LanguageSelector` cuando se ubica globalmente, notificaciones cuando aplica.
- Altura `layout.header.height` (64 desktop, 56 mobile).
- Sticky opcional; se comporta consistentemente entre marketing y platform.

### Breadcrumb

- Uso: solo cuando la jerarquía beneficia la comprensión (por ejemplo `Directorio › Proveedor › Portafolio › Trabajo`).
- No requerido en cada página.
- Separator visual + `aria-current="page"` en el último ítem.

### UserMenu

- Anatomía: trigger (avatar + name opcional) → dropdown (perfil, idioma/preferencias, logout).
- Rol/badge visible cuando aporta.
- Keyboard: `Enter`/`Space` abre; `↑`/`↓` navega ítems; `Esc` cierra.

### LanguageSelector

- Opciones: `es-LATAM`, `es-ES`, `pt`, `en`.
- Global (user preference) y contextual (event language en wizard).
- Cada opción muestra su nombre en su propio idioma (`Español (LATAM)`, `Español (España)`, `Português`, `English`).

### Pagination

- Anatomía: `Previous` + `[Page numbers | Current/Total]` + `Next`.
- Estados: Disabled en extremos.
- Keyboard: `Tab` navega, `Enter`/`Space` activa.
- Mobile: simplificar a `Anterior · N de M · Siguiente` cuando el ancho no permite listar páginas.
- Nunca reemplazar por infinite scrolling en el MVP.

---

## 21. Tabs, accordion, and disclosure

### Tabs

- Uso: vistas relacionadas dentro del mismo contexto (por ejemplo perfil vendor: `Servicios`, `Portafolio`, `Reseñas`).
- `role="tablist"`, `role="tab"`, `role="tabpanel"`; `aria-selected` en tab activo.
- Keyboard: `←`/`→` entre tabs, `Home`/`End` extremos, `Enter`/`Space` activa; foco entra al panel con `Tab`.
- Responsive overflow: horizontal scroll con indicadores, o transición a `Select` cuando el ancho es muy limitado.
- Evitar tabs anidadas; si son necesarias, revisar la arquitectura de la vista.

### Accordion

- Uso: divulgación progresiva de contenido secundario (por ejemplo detalles de una tarea, contexto de una recomendación AI).
- Headers son `<button>` dentro de heading semántico (`<h3>` u otro nivel apropiado).
- `aria-expanded` refleja estado.
- Keyboard: `Enter`/`Space` alterna; `↑`/`↓` mueve entre headers.
- No ocultar campos de formulario esenciales por default dentro de accordions.

---

## 22. Cards and surfaces

### Card

#### Purpose

Contenedor visual para agrupar información relacionada.

#### Priority

`P0`.

#### Variants

- **Default (Platform)**: fondo `card.background`, borde `card.border`, sombra `card.shadow` sutil, radius `radius.card` (12 px).
- **Interactive**: mismo default con hover elevado (`shadow.surface.raised`), foco visible y `role="button"` o wrapper `<a>` según naveguen.
- **Elevated Marketing**: `radius.card.prominent` (16 px), `shadow.marketing.floating`, sin borde.
- **Subtle Operational**: `color.surface.subtle` + borde ligero, sin sombra; para agrupar sin destacar.
- La **AIRecommendation** no es una variante de Card; es un componente propio (§31).

#### Anatomy

`[media?] · Header (title + optional actions) · Body · [Footer con actions]`.

#### States

Default, Hover, Focus (cuando interactiva), Selected (cuando aplica a selección múltiple), Loading (skeleton), Empty (rare — usar `EmptyState` a nivel de sección).

#### Responsive behavior

- Grids de cards colapsan de 3–4 columnas (desktop) a 2 (tablet) a 1 (mobile).
- Padding interno adapta con `space.component.padding.*`.

#### Anti-patterns

- Card para cada bloque de UI (produce ruido visual).
- Card con sombras pesadas o glassmorphism (prohibido por UI Foundations).
- Card interactiva sin foco visible.

### MetricCard

- Usos: dashboard (organizer/vendor/admin), progress summaries.
- Anatomía: `Label` (caption) + `NumericValue` (primary value) + `Supporting context` (texto o `Trend`).
- Trend solo cuando existe dato real; no inventar tendencias.
- Loading: skeleton del valor; Empty: mensaje contextual (`Sin datos aún`).
- No inventar métricas.

### FeatureCard

- Solo landing / marketing.
- Anatomía: icono/imagen + título + descripción + link opcional.
- No afirmar features que no existen.

---

## 23. Lists and tables

### List

- Usos: tareas, notificaciones, cotizaciones recibidas, actividad reciente.
- Estados: Default, Loading (skeleton items), Empty (`EmptyState`), Error (`ErrorState`).
- Ordenamiento y filtros vienen de `FilterBar` externo o de controles a nivel de sección.
- Cada ítem puede exponer un `menu contextual` o acciones inline según el patrón.

### Table

#### Purpose

Presentación de datos tabulares para comparación estructurada, admin, cotizaciones.

#### Priority

`P0`.

#### Anatomy

`<table>` con `<thead>`, `<tbody>`; `<th scope="col">` en headers; `<caption>` opcional para contexto accesible.

#### Behavior

- Row actions: menú por fila (DropdownMenu) o botones inline; siempre nombre accesible.
- Sorting indicators cuando se soporta (`aria-sort="ascending" | "descending" | "none"`).
- Selección de filas solo cuando el flujo la requiere (por ejemplo aceptar N cotizaciones o aprobar N vendors).
- Pagination coordinada con la tabla (ver §24).
- Loading: skeleton rows; Empty: `EmptyState` contextual; Error: `ErrorState`.
- Horizontal scroll controlado en mobile cuando la tabla no puede transformarse.
- Mobile: transformar a lista de cards apiladas cuando el patrón lo permita.

#### Accessibility

- `<th scope>` obligatorio.
- Foco visible en headers ordenables y en row actions.
- Nombre accesible en acciones.

#### Token dependencies

`space.table.cellX`, `space.table.cellY`, `border.table.default`, `typography.data.table`, `color.surface.*`.

### DataTable foundation

- Solo cubre los patrones necesarios en el MVP: ordenamiento simple, paginación server-side, filter bar externa, row actions, loading/empty/error.
- **Excluido**: column pinning, grouping complejo, virtualización, edición spreadsheet, export avanzado.
- Se apoya en TanStack Table únicamente en las superficies donde aporta valor (admin queues, directorio).

Anti-patrones: recrear enterprise data grid, ocultar información esencial en columnas colapsables, sorting sin `aria-sort`, tablas sin `<th scope>`.

---

## 24. Filters and pagination

### FilterBar

- Anatomía: `SearchInput` + `Select`(s) + `Applied filters summary` (chips removibles) + `Clear all`.
- Loading: cuando la búsqueda o filtros disparan consulta; coordinar con lista/tabla.
- Mobile: los filtros pueden agruparse en `Drawer` cuando exceden el ancho disponible.
- Cada filtro debe tener label accesible; no depender solo del placeholder.

### Pagination

Ver §20; se referencia aquí porque suele acoplarse con `FilterBar` + `Table` / `List`.

---

## 25. Progress and planning components

### ProgressIndicator

- Determinate (evento planificación %, task completion) o indeterminate (loading global).
- Anatomía: barra + label + valor numérico o textual (`60 %`, `18 de 30 tareas`).
- Color-independent: label textual acompaña siempre.
- Accessibility: `role="progressbar"` con `aria-valuenow`, `aria-valuemin`, `aria-valuemax` en determinate; en indeterminate omite `aria-valuenow`.

### Stepper

- Uso: wizard multi-step (creación de evento, cotización).
- Estados por step: Upcoming, Current, Completed, Error.
- Navegación no-lineal solo cuando la lógica del wizard lo permita (por ejemplo revisar un paso previo con datos guardados).
- Mobile: colapsar a `Paso N de M` con progreso lineal.
- Accessibility: cada step con nombre accesible; el actual anunciado (`aria-current="step"`).

### Timeline

- Uso: milestones del evento, cronología de tareas, historial de cambios en admin.
- Foundation simple: item con timestamp/label + contenido; sin calendar planner ni scheduling.
- Loading/Empty/Error apropiados.

---

## 26. Price, budget, and currency display

### CurrencyDisplay (`<Money>`)

- Locale-aware via `Intl.NumberFormat`.
- Currency code visible cuando el símbolo es ambiguo; ISO code en `title` + `aria-label` full name (US-083).
- **Sin conversión** — nunca mostrar equivalencia en otra moneda.
- Tratamiento de negativos consistente (paréntesis o signo `−` según regla contable, se define en microcopy pero no en tokens).
- Screen-reader-friendly: el `aria-label` contiene monto + código ISO deletreado.

Tokens: `typography.data.currency`, `color.text.primary` (o `color.text.secondary` en usos secundarios).

### BudgetSummary

- Presenta `Planned`, `Committed`, `Remaining`.
- Warning cuando `Committed > Planned` (banner o InlineMessage `Warning`, no bloqueante — FR-BUDGET-005).
- Loading: skeleton por métrica; Empty: mensaje contextual.
- Estados semánticos con label + color + icono, no solo color.

### PriceDisplay

- Uso: precios referenciales en cotizaciones y servicios de vendor.
- No usar para pagos ni checkout (fuera de scope).
- Consistente con `CurrencyDisplay`.

---

## 27. Feedback components

### Alert

#### Variants

Info, Success, Warning, Error.

#### Anatomy

`[icono] · [Title opcional] · Body · [Action opcional] · [Dismiss cuando aplica]`.

#### Behavior

- Persistente hasta que se resuelva la causa o el usuario la descarte.
- Warning banner presupuestal, disclaimer booking, aviso de fallback AI cuando aplique globalmente.
- Dismiss disponible cuando la alerta es informativa; no dismissible cuando comunica un estado de sistema crítico.

#### Accessibility

- `role="alert"` para errores críticos o `role="status"` para info/success.
- Nombre accesible; icono decorativo si el texto ya comunica el estado.

#### Tokens

`color.feedback.*`, `radius.card` (o `radius.lg`), `border.feedback.strong`.

### InlineMessage

- Se coloca cerca del contenido que refiere (por ejemplo debajo de un `FormField` o dentro de una card).
- Mismos variants que `Alert` pero visualmente menor.

### Toast

- Uso: confirmaciones transitorias (`Cambios guardados`, `Cotización enviada`).
- Duración suficiente para leer (mínimo ~4 s; extender para textos largos).
- Anuncios accesibles (`role="status"` para no interrumpir; `role="alert"` solo cuando el mensaje es crítico y no hay Alert persistente).
- Nunca es el único lugar para errores críticos: los errores importantes también aparecen en `Alert` o `InlineMessage`.
- Evitar apilamientos excesivos; agrupar cuando corresponda.

### StatusBadge

Ver §14. Se lista aquí para no duplicar la especificación.

---

## 28. Loading components

### Spinner

- Uso: acciones locales pequeñas (dentro de un `Button`, celda de tabla, IconButton).
- Sizes: `sm`, `md`, `lg`.
- Accessibility: si comunica progreso, usar `role="status"` con nombre accesible (`Cargando…`).

### Skeleton

- Uso: contenido predecible (cards, listas, tablas, panels AI mientras cargan).
- Debe representar la forma real del contenido (no cuadrados genéricos).
- `aria-hidden="true"` si el estado de carga se anuncia por otro medio.

### PageLoadingState

- Uso: carga a nivel de ruta (`loading.tsx` en App Router).
- No bloquea toda la aplicación; solo la sección.
- Preserva sidebar/topbar cuando el layout ya está montado.

Reglas:

- No bloquear página entera por acciones pequeñas (usar Spinner local).
- Preserva contexto (breadcrumb, título) durante loading.
- AI loading debe declarar que se está generando una sugerencia (ver `AILoadingState`, §31).

---

## 29. Empty, error, and permission states

### EmptyState

- Anatomía: título claro + explicación + acción primaria + visual opcional (icono grande, ilustración simple aprobada).
- Contextos: sin eventos, sin tareas, sin proveedores, sin cotizaciones, sin notificaciones, sin resultados de búsqueda/filtros.
- Nunca datos fake (`Aquí verás tus tareas` sí; `Ejemplo: pedir catering` no si no es real).

### ErrorState

- Anatomía: descripción clara + acción de recuperación + retry cuando aplica + correlation ID en contexto técnico o soporte (no en el mensaje principal al usuario).
- Nunca exponer detalles sensibles (stack trace, secret, prompt AI).
- Consume el error envelope; el `code` guía qué copy mostrar.

### PermissionDeniedState

- Mensaje adecuado al rol (`No tienes permiso para acceder a esta sección`).
- Acción segura de navegación (volver al dashboard del rol).
- No divulga información restringida (no confirma existencia del recurso).
- Se diferencia de `NotFoundState`.

### NotFoundState

- Mensaje `No encontramos lo que buscas`.
- Acción de recuperación (`Volver al inicio`, `Ver mis eventos`).
- No debe confundirse con permission denied (el frontend elige uno u otro según el error envelope).

---

## 30. Overlay components

### Modal

- Uso: formularios focales, detalles, decisiones no destructivas, confirmaciones con contenido rico.
- Anatomía: `Title` + `Description opcional` + `Content` + `Actions` (primaria + secundaria) + `Close control`.
- Behavior: `Esc` cierra; overlay click cierra cuando la interacción no está en riesgo de perder datos; retornar foco al elemento que abrió el modal; focus trap.
- Mobile: puede convertirse a full-screen sheet cuando el contenido lo requiera.
- Consume `radius.modal`, `shadow.overlay.modal`, `color.overlay.scrim`, `motion.overlay.enter/exit`.

### ConfirmationDialog

- Uso: acciones destructivas o irreversibles, transiciones de estado importantes (cancelar evento, eliminar borrador, cerrar cotización, `soft-delete` de review).
- Labels específicos (`Cancelar evento`, `Enviar cotización`, `Ocultar reseña`), nunca solo `OK`.
- Loading durante la ejecución; botón primary disabled hasta que los requisitos se cumplen (por ejemplo escribir el nombre del evento para confirmar cancelación cuando el patrón lo pide).
- Doble confirmación en operaciones de seed/demo reset.

### Drawer

- Uso: navegación mobile (`MobileNavigationDrawer`), filtros mobile, workflows contextuales secundarios (por ejemplo detalle de una notificación).
- Focus management análogo a Modal.
- Slide desde borde apropiado (mobile: izquierda para nav, derecha para filters/context).
- Consume `motion.drawer.enter/exit`, `shadow.overlay.modal`, `color.overlay.scrim`.

### DropdownMenu

- Acciones contextuales compactas (menú de fila, opciones de perfil).
- Keyboard: `↑`/`↓` navega, `Enter`/`Space` activa, `Esc` cierra.
- Ítem con nombre accesible y separadores semánticos cuando corresponde.
- Consume `shadow.overlay.dropdown`, `radius.md`.

### Popover

- Uso: contenido rico anclado a un elemento (por ejemplo detalle de un vendor en el mapa/directorio si se implementa).
- Distinto de Tooltip: soporta interacción y foco.

### Tooltip

- Uso: clarificación complementaria.
- Nunca fuente única de información obligatoria.
- Aparece en hover y focus; oculto en touch o convertido a affordance visible.
- Delay corto para evitar ruido; `aria-describedby` en el trigger.

---

## 31. AI recommendation component family

Esta sección es normativa y debe leerse como contrato para Figma e implementación. Consume los tokens `color.ai.*` y `aiRecommendation.*` definidos en Design Tokens.

### AIRecommendation

#### Purpose

Presentar sugerencias generadas por IA que requieren revisión humana antes de convertirse en datos confirmados.

#### Priority

```text
P0
```

#### Contexts

Wizard de creación de evento (plan sugerido), Dashboard (checklist AI, budget AI, priorización de tareas), directorio y creación de cotizaciones (categorías sugeridas, brief AI), comparación de cotizaciones (resumen AI), edición de perfil vendor (bio AI, descripción de servicio AI).

#### Anatomy

Como mínimo:

- Icono AI (sparkle glyph compartido).
- Label visible `Sugerencia de IA` (traducido según locale).
- Título opcional (`Plan sugerido para tu boda`).
- Contenido de la sugerencia (texto, lista, tabla resumen).
- Nota de fuente o contexto cuando esté disponible (`Basado en tu tipo de evento y número de invitados`).
- StatusBadge del estado actual (`Pending`, `Editing`, `Fallback`, `Regenerating`, `Timeout`, `Error`, `Accepted`, `Edited`, `Rejected`).
- `AIActionGroup` con acciones aplicables.
- Región editable opcional cuando `Editing`.
- `AILoadingState`, `AIFallbackState`, `AIErrorState` embebidos según corresponda.
- Texto de estado accesible (invisible o visible según el caso) para anuncios `aria-live`.

#### Variants

Se derivan por composición desde 8 features AI reales; no crear un componente distinto por cada uno:

- Plan suggestion (AI-001).
- Checklist suggestion (AI-002).
- Budget suggestion (AI-003).
- Vendor-category suggestion (AI-004).
- Quote-brief suggestion (AI-005).
- Quote-comparison summary (AI-006).
- Vendor bio suggestion (AI-007) — cuando aplique al MVP.
- Urgent task prioritization (AI-008).

Si el contenido de una variante requiere una composición interna distinta (por ejemplo tabla comparativa), se resuelve con **feature composition** (`AIQuoteCompareSummary`) reutilizando `AIRecommendation` como base.

#### Sizes

`md` default. `lg` en superficies destacadas (Dashboard hero, wizard). No usar `sm` (compromete la legibilidad del label y de las acciones).

#### States

- `Pending review`: sugerencia lista, esperando acción humana. StatusBadge Info/Pending.
- `Editing`: usuario está modificando el contenido; controles inline visibles; indicador dirty.
- `Accepted`: contenido aceptado sin cambios. Debe abandonar la presentación de sugerencia y renderizarse como dato normal (con marca sutil de origen `ai_generated: true` cuando aplique al dato subyacente, pero no como `AIRecommendation`).
- `Edited & accepted`: aceptado con cambios; badge sutil `Confirmado (editado)`.
- `Rejected`: descartado; no se elimina del audit trail pero desaparece del panel de sugerencias activas.
- `Regenerating`: nueva generación en curso; contenido previo atenuado; skeleton nuevo.
- `Loading`: primera generación en curso.
- `Timeout`: excedió 60 s (BR-AI-009).
- `Fallback`: se usó `MockAIProvider` o plantilla base (`aiMeta.fallbackUsed === true`).
- `Error`: `AI_PROVIDER_UNAVAILABLE`, `AI_INVALID_OUTPUT`, `AI_MISSING_INPUT`, `AI_UNSUPPORTED_LANGUAGE`, `AI_EMPTY_TASKS`, `AI_UNKNOWN_CATEGORY`, `AI_INVALID_PERCENTAGE_SUM`.

#### Actions (AIActionGroup)

Cuando soportadas por el feature:

- **Accept** (primary): confirma la sugerencia; puede materializarla como `EventTask`, `BudgetItem`, `QuoteRequest.brief`, `VendorProfile.bio`, etc.
- **Edit** (secondary): habilita edición inline; al aceptar cambios pasa a `Edited & accepted`.
- **Reject** (ghost o secondary neutro): descarta; **no usar destructive rojo** salvo que la rechazo produzca consecuencias destructivas reales.
- **Regenerate** (secondary): dispara nueva generación; comunica que el contenido actual será reemplazado.

Reglas:

- No mostrar acciones no soportadas por el feature.
- Labels explícitos, sentence case, orientados a la consecuencia.
- Acceptance debe ser intencional (nunca auto-accept implícito).
- Post-acceptance el contenido sale de la presentación de sugerencia.
- Rejected no debe permanecer visualmente igual a un pending activo.
- Regeneración debe comunicar qué se reemplaza (por ejemplo `Reemplazar sugerencia actual con una nueva`).

#### Visual treatment

- Consume `aiRecommendation.*` aliases (background, border, radius, label, icon, padding).
- Fondo `color.ai.surface` (lilac muy claro).
- Borde `color.ai.border` (violet-500 por default; ver validación abajo).
- Icono `color.ai.icon` (violet-700).
- Label `color.ai.label` (violet-700).
- Prohibido: animated glow, gradient text, iconografía sci-fi (robot, magic wand), colores decorativos (coral) como elementos semánticos, glow constante.

#### Border validation

- Por default se usa `color.ai.border` (violet-500). Contrast measurement reportada por Design Tokens: `color.ai.border` sobre `color.ai.surface` ≈ 3.05:1 (borderline).
- Requiere **validación visual en navegador y Figma** al ancho de renderizado real.
- El foco visible del componente debe ser claramente distinguible del borde default (usar `focus.ring.color` violet-700 + offset blanco 2 px).
- Si la validación indica que el borde default se percibe débil en producción, se promueve el token a `color.violet.600` como **ajuste de tokens** (no un override hardcoded en el componente).
- Se prohíbe que un componente individual cambie el color del borde por su cuenta.
- Esta validación se registra como requisito no bloqueante para Component Foundations pero bloqueante para el `visual regression baseline` final.

#### Icon decision

- Semántica: el icono AI comunica origen "generado por IA".
- Requiere label visible en superficies importantes.
- No depender del glifo exacto: el glifo final se elige tras la selección de la librería de iconos.
- Validación UX temprana antes de compositions finales en Figma.
- El icono es decorativo cuando acompaña al label visible (`aria-hidden="true"`); es informativo cuando aparece solo (por ejemplo micro-badge en una fila de tabla) y exige `aria-label`.

#### Accessibility

- Estado de generación anunciado (`role="status"` + `aria-live="polite"`; `role="alert"` solo en errores críticos).
- Loading anunciado sin repetición excesiva.
- Errores y fallback comunicados en texto, no solo por color.
- Acciones keyboard-accesibles (`Tab` navega; `Enter`/`Space` activa; `Esc` sale de Editing sin guardar).
- Estado `Accepted` claramente comunicado en texto (`Sugerencia aceptada`).
- Estado `Editing` etiquetado (`Editando sugerencia`).
- Orden de foco lógico: label → contenido → acciones.
- Contenido traducido puede expandirse 20–30 %; el layout debe tolerarlo.
- Screen-reader labels alineados al contenido visible.

#### Content rules

- Label siempre incluye la palabra "Sugerencia" (o su traducción); no depender solo del icono.
- Cuando `fallback` esté activo, indicar que el contenido proviene de una plantilla o proveedor alternativo (`Generado a partir de plantilla base`).
- Errores en lenguaje humano; correlation ID solo si el usuario está en soporte técnico o si la superficie es admin/AI audit.

#### Token dependencies

`aiRecommendation.*`, `color.ai.*`, `radius.card`, `space.component.padding.*`, `typography.body.*`, `focus.ring.*`, `motion.overlay.enter/exit` cuando expande/regenera.

#### Anti-patterns

- Animated glow.
- Robot mascot como icono default.
- Semántica de "magic wand" (idea de "IA que resuelve mágicamente").
- Presentar contenido AI como confirmado antes de la aceptación explícita.
- Auto-accept implícito al continuar el flujo.
- Ocultar la acción de rechazar.
- Gradient text con contraste insuficiente.
- Solo color para distinguir estados.
- IconButtons sin `aria-label` en acciones AI.

#### Open decisions

- Glifo exacto del sparkle AI (no bloqueante; ver §34 y §46).
- Validación visual final del borde AI (no bloqueante; ver §31 border validation).

### AILabel

Ver §14. Se aplica en `AIRecommendation`, en badges dentro de tareas/items de budget con `ai_generated: true` **pendientes** de confirmación, y en cards de admin donde se audita origen.

- Texto `Sugerencia de IA` (traducido).
- Icono sparkle compartido.
- Semántica de status/badge (`role="status"` o simplemente descriptivo con texto visible + `aria-hidden` en el icono).
- No usar animated glow.

### AIActionGroup

- Contenedor de las acciones sobre una `AIRecommendation`.
- Orden por default: `Accept` (primary), `Edit` (secondary), `Regenerate` (secondary), `Reject` (ghost).
- No usar rojo destructive para `Reject` salvo que rechazar tenga consecuencias destructivas reales.
- Responsive: en mobile se apilan verticalmente cuando el ancho no alcanza; nunca overflow horizontal oculto.
- Foco visible en cada botón.

### AILoadingState

- Mensaje claro de generación (`Generando sugerencia…`).
- Skeleton opcional en el área de contenido.
- Progreso no falsamente cuantificado (no simular %).
- Cancel disponible solo cuando el flujo lo soporta (no en todos los features del MVP).
- Timeout: a los 60 s transiciona a `Timeout` o `Fallback` según configuración.

### AIFallbackState

- Copy explícito: la salida se generó a partir de plantilla base o de un proveedor alternativo (`aiMeta.fallbackUsed === true`).
- No implica que el output vino del LLM primario.
- Preserva el workflow: el contenido sigue siendo editable/aceptable.
- Semántica visual Info o Warning según defina la política de producto (por default Info; escalar a Warning cuando el fallback compromete calidad esperada).
- Anunciado `role="status"`.

### AIErrorState

- Descripción clara y humana (no expone el mensaje crudo del proveedor).
- Nunca revela prompt, provider secret, ni detalles internos.
- Acción de recuperación evidente (`Reintentar`, `Regenerar`, `Volver`).
- Retry cuando el error es transitorio (`AI_PROVIDER_TIMEOUT`, `AI_PROVIDER_UNAVAILABLE`).
- `aria-live="assertive"` o `role="alert"` para errores críticos.

---

## 32. Marketing component foundations

### MarketingHeader

- Logo/wordmark a la izquierda, navegación centrada o derecha, CTA primary a la derecha.
- Mobile: trigger de menú con `Drawer`.
- Sticky opcional (justificado cuando el scroll de la landing es largo).
- Nombre accesible en cada link.

### Hero

- Anatomía: `[Eyebrow opcional] · Heading · Supporting copy · CTAGroup · [Media / ProductPreview]` + capas decorativas (formas suaves lilac/coral).
- Responsive stacking: media debajo del texto en mobile.
- Evitar anchos fijos de texto que rompan traducciones (`max-width` relativo).
- No copiar blobs/kites de la referencia Jurny.

### CTAGroup

- Primary dark CTA (landing) + secondary outlined/ghost.
- Mobile: full-width; secondary debajo de primary.
- Consume `color.marketing.cta.*` y `button.secondary.*`.

### FeatureCard

- Icono/imagen + título + descripción + link opcional.
- Sin afirmaciones no soportadas por el producto.
- Grid 3–4 columnas desktop, 2 tablet, 1 mobile.

### ContentSection

- Wrapper de sección de landing.
- Constrained (`layout.container.marketing.max` 1280 px) o full-bleed.
- Alternancia de composición (imagen/texto) permitida sin patrones fijos.
- Responsive stacking.

### ProductPreview

- Mockup real o aprobado del producto (dashboard, panel AI).
- Alt text descriptivo obligatorio.
- No mostrar funcionalidad fake ni features que no existen.

### MarketingFooter

- Navegación secundaria, links legales cuando existan, acceso a idiomas, disclaimers.
- No inventar redes sociales; incluir solo cuando existan cuentas reales.

Regla general: no generar el copy de la landing en este documento.

---

## 33. Role-specific component usage

Ningún tema por rol; los tres roles comparten el mismo sistema y se diferencian por contenido, permisos, badges y navegación.

### `organizer`

Priorizar:

- Event cards (dashboard, listado).
- Task lists (checklist con estado, filtros por rango).
- ProgressIndicator (planeación).
- BudgetSummary + BudgetItem rows.
- AIRecommendation (plan, checklist, budget, categorías, brief, priorización).
- Directory search results (VendorCard).
- Quote comparison (Table + panel AI opcional).
- StatusBadge de estado de evento y booking intent.
- Modal `ConfirmationDialog` para cancelación y cambios de estado.

### `vendor`

Priorizar:

- Formulario de perfil con section `Aprobación` (StatusBadge `pending`/`approved`/`rejected`/`hidden`).
- Portfolio (FileUpload agrupado por trabajo, máx 10 imágenes).
- Service/package cards.
- Quote inbox (List/Table con StatusBadge).
- Quote response form (submit + `valid_until`).
- Review summary (List + rating).
- AIRecommendation para bio/descripciones (P2 según feature).
- InlineMessage/Alert cuando la edición mayor dispara re-`pending`.

### `admin`

Priorizar:

- Admin queues (Table + FilterBar + row actions con ConfirmationDialog).
- Category y EventType CRUD (Table + Modal).
- Review moderation (Table + Modal con reason input).
- AdminAction log viewer (Table read-only).
- AIRecommendation audit log viewer (Table read-only).
- Seed panel (con doble confirmación).
- MetricCard en dashboard operativo/gobernanza/AI.

Reglas:

- Reutilizar el mismo Table / Card / Modal para todos los roles.
- No crear temas por rol ni paletas alternativas.
- Admin puede usar densidad `sm` con más frecuencia (tablas densas), pero sin tipografía ni colores propios.
- No construir enterprise data-grid ni componentes especializados por rol.

---

## 34. Iconography requirements

- **Una librería coherente** para todo el MVP: outlined o rounded, no mezclar familias.
- Sizes derivados de `icon.size.*` (16/20/24) y stroke de `icon.stroke.*` (1.5/2).
- Nombre accesible obligatorio en `IconButton` y otros controles icon-only; `aria-hidden="true"` cuando el icono acompaña texto.
- Iconos semánticos consistentes por estado (mismo glifo para `success` en toda la app, mismo glifo para `pending`, etc.).
- Iconos decorativos permitidos en marketing con `aria-hidden`.
- Icon+label spacing: `space.inline.sm` o `space.inline.md` según el tamaño del control.
- Touch targets ≥ 44 × 44 px aun cuando el icono visual sea 16 o 20 px.

Selección exacta de librería:

```text
Non-blocking open decision
```

- Frontend Architecture propone `lucide-react` como preferencia de implementación.
- UI Foundations aún no confirma (UI-Q-002).
- La selección definitiva debe cerrarse antes de: (a) final Figma component binding, (b) implementación de producción de icon-only controls, (c) baselines de visual regression.
- Este documento no bloquea por esta decisión.

Sparkle AI glyph: pendiente (§46). Preservar accesibilidad y label visible sin importar el glifo elegido.

---

## 35. Content and microcopy rules

- Labels de acción explícitos (`Guardar cambios`, `Enviar cotización`, `Confirmar reserva`), evitar `Continuar` cuando existe uno más específico.
- Sentence case en `es-LATAM`, `es-ES`, `pt`; title case natural en `en` para CTAs de marketing y algunos badges.
- Status labels breves y consistentes (`Pendiente`, `Aprobado`, `Rechazado`, `Enviado`).
- Preservar flexibilidad de traducción: componentes no deben forzar longitudes fijas.
- No embeber copy de producto en el componente; el copy viene de `next-intl` catalogs.
- Distinguir helper (`neutral, explicativo`), warning (`atención`), error (`falla o input inválido`), confirmation (`resultado positivo`).
- Contenido AI se identifica como sugerencia (`Sugerencia de IA`, `Generado por IA`).
- Destructive actions nombran la consecuencia (`Eliminar borrador`, `Cancelar reserva`).
- Errores nunca usan terminología técnica del backend (`500`, `NullPointerException`).
- Currency/locale nunca ambiguo: siempre acompañar `$` con código ISO cuando el usuario opera con múltiples monedas.
- No generar el copy deck completo del producto en este documento.

---

## 36. Responsive behavior model

- Mobile stacking: cards en columna, form fields al ancho completo, hero apilado.
- Full-width primary actions cuando el patrón lo justifica (CTA de landing, submit de wizard).
- Drawer navigation reemplaza sidebar en `<breakpoint.lg` (1024 px).
- Filter collapse: `FilterBar` transiciona a `Drawer` cuando el ancho no permite mostrar filtros horizontalmente.
- Table adaptation: preferir transformación a cards apiladas en mobile; permitir horizontal scroll controlado solo si la tabla es inherentemente tabular (comparación de cotizaciones, admin queues).
- Modal→Drawer: modales largos pueden convertirse a full-screen sheet en mobile.
- Long-label wrapping: labels en botones y sidebar deben tolerar wrap en 2 líneas o truncado con `title` fallback.
- Touch targets ≥ 44 × 44 px en todos los interactivos.
- Hero stacking: media debajo del texto en mobile; sin overlap.
- Card grids: 3–4 (desktop) → 2 (tablet) → 1 (mobile).
- Action-group wrapping: cuando el ancho no alcanza, apilar verticalmente sin overflow horizontal.
- AI recommendation actions en mobile: apilar (`Accept` arriba, `Edit`, `Regenerate`, `Reject` debajo).
- File upload fallback: siempre botón alternativo a drag-and-drop.
- Evitar horizontal scroll fuera de data tables (cuando sea inevitable).
- No incluir patrones nativos móviles (bottom tab bar nativa, pull-to-refresh nativo, etc.).

Breakpoints: `breakpoint.sm` (640), `.md` (768), `.lg` (1024, sidebar visible), `.xl` (1280, marketing max), `.2xl` (1536).

---

## 37. Accessibility requirements by component category

| Category | Requirement | Components affected | Blocking |
| --- | --- | --- | --- |
| Keyboard access | Todos los interactivos operables por teclado (`Tab`, `Enter`/`Space`, `Esc`, flechas donde aplique) | Button, IconButton, Link, Select, Checkbox, RadioGroup, Switch, DateInput, Tabs, Accordion, Modal, Drawer, DropdownMenu, Popover, SidebarItem, AIRecommendation | Sí |
| Focus visibility | `focus-visible` con `focus.ring.*` y offset blanco | Todos los interactivos | Sí |
| Accessible name | Nombre accesible en todo control (`aria-label`, label visible, `aria-labelledby`) | Button, IconButton, Input, Textarea, Select, Checkbox, Radio, Switch, FileUpload, Toast, StatusBadge | Sí |
| Label association | `<label for>` o wrapper para form controls | Input, Textarea, Select, Checkbox, Radio, Switch, DateInput, CurrencyInput | Sí |
| Error association | `aria-describedby` con FormError | Todos los form controls | Sí |
| Status announcements | `role="status"` o `role="alert"` con `aria-live` | Toast, Alert, AILoadingState, AIRecommendation transitions, ProgressIndicator, form submit results | Sí |
| Touch target | ≥ 44 × 44 px | Button, IconButton, SidebarItem, Tabs trigger, Checkbox/Radio hit area | Sí |
| Contrast | ≥ 4.5:1 texto normal; ≥ 3:1 texto grande y elementos no textuales críticos | Todo texto, iconos semánticos, bordes semánticos | Sí |
| Modal focus | Focus trap + retorno al trigger | Modal, ConfirmationDialog | Sí |
| Drawer focus | Focus trap + retorno al trigger | Drawer, MobileNavigationDrawer | Sí |
| Tooltip access | Visible en hover y focus; no fuente única de info | Tooltip | Sí (tooltip como única fuente de info es falla WCAG) |
| Table semantics | `<th scope>`, `<caption>` opcional, `aria-sort` cuando aplica | Table, DataTable | Sí |
| AI state announcements | Loading, timeout, fallback, error, accepted, rejected anunciados en texto | AIRecommendation family | Sí |
| Reduced motion | Respetar `prefers-reduced-motion` colapsando duraciones a `motion.reduced.duration` (0) | Todos los que animan (Modal, Drawer, hover, AI transitions) | Sí |
| Locale expansion | Tolerancia 20–30 % de expansión en `es-ES`, `pt`, `en` sin overflow | Todos los componentes con texto | Sí |
| Zoom and reflow | Legible al 200 % sin scroll horizontal (excepto tablas complejas) | Todo el layout y componentes | Sí |
| Autocomplete | `autocomplete` adecuado en campos personales | Input (email, name, password) | Sí |
| Color-independence | Estados semánticos no dependen solo de color | Alert, Toast, StatusBadge, InlineMessage, ProgressIndicator, form errors | Sí |

Todas las fallas de WCAG 2.1 AA son bloqueantes.

---

## 38. Token-consumption matrix

| Component | Primary semantic tokens | Component aliases | Prohibited hardcoding |
| --- | --- | --- | --- |
| Button | `color.action.primary.*`, `color.action.secondary.*`, `color.action.destructive.*`, `color.action.ghost.*`, `color.marketing.cta.*`, `focus.ring.*`, `motion.control.*` | `button.primary.*`, `button.secondary.*` | color, radius, height, padding, font-size, transition duration |
| Input | `color.text.*`, `color.background.*`, `color.feedback.error.*`, `color.focus.ring`, `border.input.*`, `focus.ring.*` | `input.*` | color, radius, height, borde |
| Card | `color.surface.default`, `color.border.subtle`, `shadow.surface.subtle`, `radius.card` | `card.*` | fondo, borde, radius, sombra, padding |
| SidebarItem | `color.text.*`, `color.platform.sidebar.*`, `focus.ring.*` | `sidebar.item.*` | color, radius, padding, iconos hardcoded |
| Alert | `color.feedback.{info,success,warning,error}.*`, `border.feedback.strong`, `radius.card` | — (usar semantics directos) | color, iconos, radius |
| StatusBadge | `color.feedback.*` o `color.surface.subtle`+`color.text.secondary` para neutro, `radius.badge` | — | color, radius, tipografía |
| Modal | `color.overlay.scrim`, `color.surface.elevated`, `radius.modal`, `shadow.overlay.modal`, `motion.overlay.*` | — | overlay, radius, sombra, motion |
| Table | `color.text.*`, `color.border.subtle`, `space.table.cellX`, `space.table.cellY`, `border.table.default`, `typography.data.table` | — | padding, borde, tipografía tabular |
| AIRecommendation | `color.ai.*`, `radius.card`, `space.component.padding.*`, `focus.ring.*`, `motion.overlay.*` | `aiRecommendation.*` | borde, fondo, iconografía AI, glow |
| Hero | `typography.marketing.{display,h1,h2,eyebrow}`, `color.text.primary`, `color.marketing.hero.surface`, `space.layout.section.marketing` | — | tipografía hero, spacing, fondo |
| Marketing CTA | `color.marketing.cta.*`, `radius.button`, `size.control.lg`, `typography.button.lg` | `button.primary.*` (variante Marketing) | color CTA dark, radius, tipografía |

Regla general: los componentes consumen semantics + component aliases. Nunca primitives directamente.

---

## 39. Figma component guidance

- **Component sets** por componente (Button, Input, Card, StatusBadge, Modal, AIRecommendation, etc.).
- **Variants** limitadas a las justificadas por este documento; evitar combinatoria completa (por ejemplo Button: Variant × Size × State, no incluir toda combinación destructive+lg+loading si no aporta).
- **Boolean properties** para toggles anatómicos (`showLeadingIcon`, `showTrailingIcon`, `dismissible`).
- **Instance-swap properties** para iconos (permitiendo intercambiar el glifo dentro del sparkle o del status).
- **Text properties** para labels traducibles.
- **Auto Layout** obligatorio (padding, spacing según tokens de spacing).
- **Responsive constraints** en Frame de página (grid 12/8/4).
- **Token binding** vía Figma Variables (colecciones `_Primitives` y `Semantic`, light mode); componentes bindados a semantic tokens y aliases.
- **Light theme únicamente** (colección Light).
- **Shared foundations** entre roles (una sola librería).
- **AI component states** representados como variantes o property con enum (`Pending`, `Editing`, `Accepted`, `Edited`, `Rejected`, `Regenerating`, `Loading`, `Timeout`, `Fallback`, `Error`).
- **Naming conventions**: `Category/Component/Variant` (ver §7).
- **Description fields** en cada componente Figma con: propósito, cuándo usar, referencia a esta sección.
- **Accessibility annotations**: incluir marks visibles en el archivo (foco visible, touch target, `aria-*` esperados) como capa de handoff.

Recomendación: comenzar por Foundation components + AIRecommendation + Form controls (P0) antes de composites y marketing.

---

## 40. Frontend implementation guidance

- **Next.js 14 App Router** con route groups (`(public)`, `(auth)`, `(app)`, `(admin)`).
- **Server vs. Client Components**:
  - Marketing y perfiles públicos: Server Components por SEO, con `revalidate` ISR.
  - Autenticado, admin, formularios, panels AI: Client Components (`'use client'` en el componente más cercano que lo requiera, no en el layout).
  - Los foundation components sin estado (Text, Heading, Divider, Skeleton) pueden ser Server Components por defecto.
- **Token consumption**: vía `tailwind.config.ts` extendido con semantics + aliases; nunca clases arbitrarias con valores hardcoded.
- **Form behavior**: React Hook Form + Zod (`@hookform/resolvers/zod`). Controlled vs. uncontrolled es decisión de implementación; la especificación no lo fija.
- **Accessibility primitives**: Headless UI y Radix UI selectivos (Modal, Popover, Tooltip, DropdownMenu, Tabs, RadioGroup, Switch). La selección concreta librería-por-componente queda como decisión de implementación.
- **Reuse vs. feature composition**: promover al design system solo cuando el patrón se usa en ≥ 2 features y su anatomía es estable.
- **Prop explosion**: preferir composición (`Card.Header`, `Card.Body`, `Card.Footer` con children) sobre props ultra configurables.
- **Loading-state ownership**: los componentes exponen presentación de loading; la lógica de fetching pertenece al feature (TanStack Query + hooks).
- **Error-state ownership**: los componentes exponen presentación de error; el mapeo de error envelope a mensajes pertenece al feature (mappers).
- **API authorization boundaries**: el frontend nunca es la autoridad; el backend responde 401/403 y el componente muestra `PermissionDeniedState` o redirige.
- **i18n**: `next-intl` con catalogs por locale; nunca strings hardcoded en componentes.
- **Currency**: `<Money>` en todas las presentaciones monetarias; el componente consume `Intl.NumberFormat` con locale + código ISO.
- **Testing**: los componentes deben ser testables con Testing Library (queries por rol y label preferidas; `data-testid` como fallback en E2E cuando Next monta announcers en conflicto).
- **Visual regression**: baselines mediante Chromatic o Playwright snapshots una vez la librería Figma esté congelada.

No se generan APIs React ni interfaces TypeScript en este documento.

---

## 41. Testing guidance

### Unit or component tests

Cubrir por componente:

- Render por variante.
- Estados Default, Disabled, Loading, Error, Empty cuando aplican.
- Nombre accesible (`getByRole` + `name`).
- Keyboard behavior (`Tab`, `Enter`, `Esc`, flechas).
- Error association (`aria-describedby` presente y correcto).
- Status text (`role="status"` o `role="alert"` con el mensaje esperado).
- AI state transitions (Pending → Editing → Accepted / Edited / Rejected; Loading → Timeout / Fallback / Error).

### Integration tests

- Formularios con RHF + Zod (submit válido, submit inválido, error del backend mapeado).
- Validaciones inline y on-submit.
- Modal workflows (abrir, focus trap, cerrar por `Esc`, cerrar por overlay).
- Drawer navigation (mobile nav y filtros).
- AI accept/edit/reject/regenerate por feature.
- Table + FilterBar + Pagination coordinados.
- File upload en cada estado.

### Visual regression

- Variantes core (Button, IconButton, Input, Card, StatusBadge, Alert, Modal, Table, AIRecommendation).
- Focus visible.
- Error state.
- Loading state.
- Mobile.
- Traducciones largas (`es-ES`, `pt`, `en`).
- AI border y surface (validación específica de `color.ai.border` sobre `color.ai.surface`).
- Marketing CTA en dark background.
- Platform CTA en violet.
- Contraste de violet action.

### Accessibility tests

- Automated checks con axe-core (recomendado).
- Keyboard testing manual y automatizado.
- Screen-reader spot checks (NVDA/VoiceOver) en superficies críticas (auth, wizard, AIRecommendation, admin queues).
- Contrast validation al 100 % zoom y 200 % zoom.
- Reflow al 200 % zoom sin scroll horizontal (excepto tablas).
- Modal focus (trap + retorno).
- Drawer focus (trap + retorno).

Alinear con `docs/20-Testing-Strategy.md` (Vitest + Testing Library para unit/component; MSW para integración; Playwright para E2E; MockAIProvider para AI). Este documento no genera código de test.

---

## 42. Component inventory

| Component | Category | Priority | MVP status | Main contexts | Detailed specification required later |
| --- | --- | --- | --- | --- | --- |
| Button | Foundation | P0 | In MVP | Todo el producto | Storybook stories + Figma variants |
| IconButton | Foundation | P0 | In MVP | Row actions, top bar, modales, AI actions | Figma set + tokens de hit-area |
| TextLink | Foundation | P0 | In MVP | Contenido, footers, breadcrumbs | Figma set |
| NavigationLink | Foundation | P0 | In MVP | Sidebar, breadcrumb, top bar | Figma set |
| InlineAction | Foundation | P1 | In MVP | Tablas y cards | Figma variant |
| Heading | Foundation | P0 | In MVP | Todo el producto | Figma text styles |
| Text | Foundation | P0 | In MVP | Todo el producto | Figma text styles |
| Label | Foundation | P0 | In MVP | Forms | Figma text styles |
| Caption | Foundation | P1 | In MVP | Meta info | Figma text styles |
| NumericValue | Foundation | P1 | In MVP | Metrics, budget, ratings | Figma text styles + tabular numbers |
| Badge | Foundation | P0 | In MVP | Roles, categorías, contexto | Figma set |
| StatusBadge | Composite | P0 | In MVP | Estados de eventos, quotes, vendors, AI, bookings | Figma set + iconografía consistente |
| AILabel | AI | P0 | In MVP | AIRecommendation + tareas/items con `ai_generated` pendientes | Figma variant |
| Avatar | Foundation | P1 | In MVP | UserMenu, listas | Figma set |
| Divider | Foundation | P1 | In MVP | Estructura visual | Figma variant |
| Spinner | Foundation | P0 | In MVP | Loading local | Figma variant |
| Skeleton | Foundation | P0 | In MVP | Loading predecible | Figma variant |
| FormField | Composite | P0 | In MVP | Todos los formularios | Figma pattern + React hook composition |
| Input | Form | P0 | In MVP | Auth, wizard, edición | Figma set con tipos + estados |
| Textarea | Form | P0 | In MVP | Bio vendor, brief, notas | Figma set |
| Select | Form | P0 | In MVP | Filtros, forms | Figma set + decisión nativo vs. custom |
| Checkbox | Form | P0 | In MVP | Bulk actions, formularios | Figma set |
| RadioGroup | Form | P1 | In MVP | Opciones exclusivas visibles | Figma set |
| Switch | Form | P1 | In MVP | Task toggle, favorito, quote preferido, admin hide | Figma set |
| DateInput | Form | P0 | In MVP | Event date, task due date, quote valid_until | Figma set + decisión de picker |
| CurrencyInput | Form | P0 | In MVP | Budget, quote | Figma set + Intl behavior |
| SearchInput | Form | P0 | In MVP | Directorio, listas, admin | Figma variant de Input |
| FileUpload | Form | P1 | In MVP | Portafolio vendor | Figma set + estados de progreso |
| FormError | Composite | P0 | In MVP | Todos los formularios | Figma variant |
| FormHelperText | Composite | P0 | In MVP | Todos los formularios | Figma variant |
| AppSidebar | Navigation | P0 | In MVP | Plataforma desktop | Figma pattern + variantes por rol |
| SidebarItem | Navigation | P0 | In MVP | AppSidebar | Figma set |
| MobileNavigationDrawer | Navigation | P0 | In MVP | Plataforma mobile | Figma pattern |
| TopBar | Navigation | P0 | In MVP | Plataforma (desktop y mobile) | Figma pattern |
| Breadcrumb | Navigation | P1 | In MVP | Vendors → portafolio → trabajo, admin | Figma set |
| UserMenu | Navigation | P0 | In MVP | TopBar | Figma set |
| LanguageSelector | Navigation | P0 | In MVP | TopBar / wizard | Figma set con 4 opciones |
| Pagination | Navigation | P0 | In MVP | Listas y tablas | Figma set |
| Alert | Feedback | P0 | In MVP | Global, budget warning, disclaimer booking | Figma set 4 variantes |
| InlineMessage | Feedback | P0 | In MVP | Cerca de campos y bloques | Figma set |
| Toast | Feedback | P0 | In MVP | Confirmaciones transitorias | Figma set + a11y `role` |
| ProgressIndicator | Feedback | P0 | In MVP | Planeación, tareas, upload | Figma set |
| EmptyState | Feedback | P0 | In MVP | Sin datos en cualquier lista | Figma pattern |
| ErrorState | Feedback | P0 | In MVP | Fallo de fetch, errores de flujo | Figma pattern |
| PermissionDeniedState | Feedback | P0 | In MVP | 403 responses | Figma pattern |
| NotFoundState | Feedback | P0 | In MVP | 404 responses | Figma pattern |
| Card | Data-display | P0 | In MVP | Todo el producto | Figma set + variantes |
| MetricCard | Data-display | P0 | In MVP | Dashboards | Figma set |
| List | Data-display | P0 | In MVP | Tareas, notificaciones, quotes | Figma set |
| Table | Data-display | P0 | In MVP | Admin, quotes, directorio | Figma set + variantes de row |
| DataTable foundation | Data-display | P1 | In MVP (limitado) | Admin y directorio con paginación | Guía técnica; no data-grid |
| FilterBar | Data-display | P0 | In MVP | Listas y tablas | Figma pattern |
| Tabs | Data-display | P1 | In MVP | Perfil vendor, dashboards | Figma set |
| Accordion | Data-display | P1 | In MVP | Detalles progresivos | Figma set |
| Timeline | Data-display | P1 | In MVP | Milestones, historial admin | Figma set simple |
| ProgressSummary | Data-display | P1 | In MVP | Dashboards | Figma set (composición de MetricCard + ProgressIndicator) |
| DescriptionList | Data-display | P1 | In MVP | Detalles de recursos | Figma set |
| PriceDisplay | Data-display | P0 | In MVP | Quotes, servicios | Figma variant de CurrencyDisplay |
| CurrencyDisplay (`<Money>`) | Data-display | P0 | In MVP | Todo el producto | Figma set + behavior i18n |
| Modal | Overlay | P0 | In MVP | Formularios focales, detalles | Figma set + a11y focus trap |
| ConfirmationDialog | Overlay | P0 | In MVP | Destructive, transiciones | Figma variant de Modal |
| Drawer | Overlay | P0 | In MVP | Mobile nav, filtros, workflows secundarios | Figma set |
| DropdownMenu | Overlay | P0 | In MVP | Row actions, user menu, contextual | Figma set |
| Popover | Overlay | P1 | In MVP | Detalles ricos anclados | Figma set |
| Tooltip | Overlay | P0 | In MVP | Clarificación complementaria | Figma set |
| AIRecommendation | AI | P0 | In MVP | 8 features AI | Figma set + estados detallados |
| AIActionGroup | AI | P0 | In MVP | Interior de AIRecommendation | Figma pattern |
| AILoadingState | AI | P0 | In MVP | Interior de AIRecommendation | Figma variant |
| AIFallbackState | AI | P0 | In MVP | Cuando `aiMeta.fallbackUsed === true` | Figma variant |
| AIErrorState | AI | P0 | In MVP | Cuando LLM falla / timeout | Figma variant |
| MarketingHeader | Marketing | P0 | In MVP | Landing | Figma pattern |
| Hero | Marketing | P0 | In MVP | Landing | Figma pattern |
| CTAGroup | Marketing | P0 | In MVP | Landing | Figma set |
| FeatureCard | Marketing | P1 | In MVP | Landing | Figma set |
| ContentSection | Marketing | P1 | In MVP | Landing | Figma pattern |
| ProductPreview | Marketing | P1 | In MVP | Landing con mockups reales | Figma pattern |
| MarketingFooter | Marketing | P1 | In MVP | Landing | Figma pattern |
| Testimonial foundation | Marketing | P2 | Optional (solo con contenido real aprobado) | Landing | Figma set |
| SocialProof foundation | Marketing | P2 | Optional (solo con contenido real o seed aprobado) | Landing | Figma set |
| Stepper | Feedback | P1 | In MVP (wizard) | Wizard eventos, wizard cotización | Figma set |
| Collapsed AppSidebar | Navigation | Out of Scope | Deferred | — | Post-MVP |
| Dark mode variants | Global | Out of Scope | Deferred | — | Post-MVP |
| Role-specific themes | Global | Out of Scope | Deferred | — | Post-MVP |
| Advanced charts (line, bar, donut) | Data-display | Out of Scope | Deferred | — | Post-MVP |
| Enterprise data grid | Data-display | Out of Scope | Deferred | — | Post-MVP |
| Native-mobile components | Global | Out of Scope | Deferred | — | Post-MVP |
| Custom illustration system | Marketing | Out of Scope | Deferred | — | Post-MVP |
| High-density mode | Global | Out of Scope | Deferred | — | Post-MVP |
| Advanced motion | Global | Out of Scope | Deferred | — | Post-MVP |
| Payment/checkout components | Data-display | Out of Scope | Excluded by product scope | — | No aplica |
| Contract signing components | Overlay | Out of Scope | Excluded by product scope | — | No aplica |
| Chat/conversational AI | AI | Out of Scope | Excluded by product scope | — | No aplica |
| AI image generation | AI | Out of Scope | Excluded by product scope | — | No aplica |

---

## 43. Decision register

| ID | Decisión | Estado | Fuente / justificación |
| --- | --- | --- | --- |
| CMP-DEC-001 | Un sistema compartido de componentes para `organizer`, `vendor`, `admin` | Approved | UI-DEC-008 / UI-DEC-009 |
| CMP-DEC-002 | Modelo de tamaños `sm` / `md` / `lg` con `md` como default | Recommended | Este documento §10; Design Tokens `size.control.*` |
| CMP-DEC-003 | Composición sobre variantes universales | Approved | Principios UI-DEC / este documento §5 |
| CMP-DEC-004 | Sidebar expanded como default MVP | Approved | UI-DEC-008; TOK-DEC-023 |
| CMP-DEC-005 | Sidebar collapsed no requerido para MVP | Deferred | TOK-DEC-023; este documento §20 |
| CMP-DEC-006 | Selección de icon library no bloqueante para Component Foundations | Provisional | UI-Q-002; TOK-Q-005; Frontend Architecture recomienda `lucide-react` |
| CMP-DEC-007 | AI icon definido semánticamente; glifo exacto diferido | Deferred | UI-Q-005; TOK-Q-004 |
| CMP-DEC-008 | Validación visual del borde `color.ai.border` (~3.05:1) requerida antes de baselines finales | Provisional | Design Tokens §32; este documento §31 |
| CMP-DEC-009 | Contenido AI aceptado transita a presentación de dato confirmado normal | Derived | BR-AI-001; UI-DEC-010 |
| CMP-DEC-010 | `FormField` como composición estándar de formularios (Label + Control + Helper + Error) | Recommended | UI Foundations §19; Frontend Architecture (RHF + Zod) |
| CMP-DEC-011 | Table vs. List: Table para datos estructurados y comparación; List para colecciones simples y flujos mobile | Recommended | UI Foundations §20; NFR-USAB-005 |
| CMP-DEC-012 | Light theme únicamente | Approved | UI-DEC-013 |
| CMP-DEC-013 | Marketing vs. platform: mismo componente Button con variantes contextuales (dark CTA landing, violet CTA platform) | Approved | UI-DEC-003 |
| CMP-DEC-014 | Estados semánticos independientes del color; icono/label obligatorios | Approved | UI-DEC-014 |
| CMP-DEC-015 | WCAG 2.1 AA como baseline mandatorio | Approved | UI-DEC-015; PO decisions |
| CMP-DEC-016 | Sin enterprise data grid en el MVP | Approved | Este documento §23; Frontend Architecture (TanStack Table selectivo) |
| CMP-DEC-017 | Este artefacto no genera código, componentes Figma finales ni Storybook stories | Approved | Prompt del artefacto; este documento §2 |
| CMP-DEC-018 | Switch se incluye en foundations (P1) con usos justificados (task toggle, favorito, quote preferido, filtro AI, admin hide review) | Recommended | Casos reales identificados en Doc 5 / Doc 8 |
| CMP-DEC-019 | AIRecommendation es un componente propio, no una variante de Card | Approved | Este documento §31 |
| CMP-DEC-020 | `<Money>` es el componente único para presentación monetaria; sin conversión, con ISO code visible cuando el símbolo es ambiguo | Approved | UI Foundations §25; BR-EVENT-007 / BR-BUDGET-007; US-083 |
| CMP-DEC-021 | Mobile navigation por Drawer; no bottom-tab bar nativa | Approved | UI-DEC-008 |
| CMP-DEC-022 | Toast no es fuente única de errores críticos; los errores importantes se duplican en Alert o InlineMessage | Recommended | Este documento §27 |
| CMP-DEC-023 | Currency selector visible solo en creación de evento; ReadOnly posteriormente | Approved | BR-EVENT-007 |
| CMP-DEC-024 | 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`) obligatorios; expansión 20–30 % tolerada por componentes | Approved | UI Foundations §24; PO decisions |

---

## 44. Deferred decisions

### Icon selection

- Exact icon library.
- Exact sparkle glyph para AI.
- Final icon mapping (por estado, por acción, por sección).

Non-blocking para Component Foundations. **Requerido antes de**: final Figma component binding, implementación de producción de icon-only controls, visual regression baselines. Frontend Architecture ya recomienda `lucide-react`; falta ratificación por UI/Product.

### Figma component library

- Nombres exactos de variant properties.
- Organización final de component sets.
- Composiciones responsive finales por breakpoint.
- Visual QA final por variante.

### Storybook y frontend implementation

- APIs React de cada componente (props, slots, composición).
- Nombres de props.
- Composition APIs (`Card.Header` vs. props).
- Clases Tailwind y utilidades.
- Selección de librería de accessibility primitives por componente (Headless UI vs. Radix vs. custom cuando aplique).
- Estrategia final de form controls (controlled vs. uncontrolled; validación en tiempo real vs. on blur).
- Librería exacta de date picker.
- Implementación exacta de Select/Combobox.
- Primitivas exactas de Modal/Drawer/DropdownMenu.
- Paquete final de iconos.

### Post-MVP

- Collapsed sidebar.
- Persistencia de preferencia de sidebar.
- Dark mode.
- Role themes.
- Advanced data grid.
- Complex charts (line, bar, donut, area).
- Custom illustration system propio de EventFlow.
- High-density mode.
- Advanced motion (scroll-linked, parallax, spring physics).
- Native mobile components (React Native / mobile app).

---

## 45. Risks and mitigations

| Riesgo | Impacto | Mitigación | Owner |
| --- | --- | --- | --- |
| Explosión de variantes en Figma y en código | Complejidad, mantenimiento, drift | Enforzar principio de composición (§5); limitar variantes justificadas; revisión periódica del inventario | UX/UI + Frontend |
| Valores hardcoded evadiendo tokens | Drift visual, cambios manuales por múltiples archivos | Linters (`eslint-plugin-tailwindcss`, `stylelint`); code review; tokens obligatorios | Frontend |
| Copias role-específicas del mismo componente | Duplicación y drift entre roles | Regla explícita (§33): un solo sistema; diferencias por content/permisos | UX/UI + Frontend |
| Sugerencias AI que se leen como datos confirmados | Confianza rota, decisiones erróneas | Sección §31 obligatoria: label + estados diferenciados; aceptación explícita; transición visual post-accept | UX/UI + Product |
| Borde AI (`color.ai.border` ≈ 3.05:1) percibido débil | Componente pierde límite visual claro | Validación en navegador y Figma; escalado a `color.violet.600` como ajuste de tokens, no override componente | UX/UI + Frontend |
| Glifo exacto sparkle AI retrasa Figma | Bloqueo perceptivo del componente AI | Definir icono como decisión no bloqueante (§34); usar placeholder consistente hasta cerrar la selección de librería | Product + UX |
| Icon library drift (mezcla de familias) | Inconsistencia visual grave | Regla `una sola librería` (§34); revisar en code review; sólo introducir un glifo custom con aprobación de UX | UX/UI |
| Collapsed sidebar scope creep | Aumento de superficie sin US aprobada | Regla explícita (§20): no requerido para MVP; token permanece Provisional | Product |
| Tables fallan en mobile | Datos incomprensibles, scroll caótico | Adaptación a cards o stacked rows por default; scroll horizontal solo cuando la tabla lo requiere (§23) | UX/UI + Frontend |
| Long translations desbordan | Overflow, layout roto | Componentes con auto-height/wrapping; tests con `es-ES`, `pt`, `en` largos | Frontend + QA |
| Sobre-uso de cards | Ruido visual, dilución de jerarquía | Regla explícita (§22): no toda sección es una card; usar densidad y separadores | UX/UI |
| Accesibilidad añadida al final | Reworks costosos, fallas WCAG AA | Matriz §37 obligatoria; a11y como parte de anatomía; testing con axe-core y screen readers | UX/UI + Frontend + QA |
| Estilos de marketing filtrándose a formularios operativos | Ruido, inconsistencia | Diferenciar variantes contextuales (§5, §11) y no mezclar tokens marketing en platform | UX/UI |
| Toast como única fuente de errores críticos | Errores perdidos, sin recovery clara | Regla explícita (§27): errores críticos también en Alert/InlineMessage | UX/UI + Frontend |
| Hidden labels por default | Falla WCAG y confusión | Regla explícita (§15): labels visibles por default; ocultos solo con affordance inequívoco | UX/UI |
| Símbolos de moneda ambiguos (`$`) | Confusión de monedas | Regla explícita (§16 CurrencyInput, §26 CurrencyDisplay): código ISO visible | Product + Frontend |
| Drift entre componentes Figma y código | La librería deja de reflejar el sistema | Baseline compartido (este documento); tokens compartidos; revisiones periódicas Figma ↔ código | UX/UI + Frontend |

---

## 46. Open questions

| ID | Pregunta | Impacto | Owner | Required before | Blocking |
| --- | --- | --- | --- | --- | --- |
| CMP-Q-001 | ¿Se ratifica `lucide-react` como icon library o se elige alternativa (Material Symbols, Heroicons, custom)? | Consistencia visual y peso de bundle | UX/UI + Frontend | Final Figma binding + implementación de icon-only controls | No |
| CMP-Q-002 | ¿Cuál es el glifo exacto del sparkle AI y su comportamiento (mono vs. duotone)? | Reconocimiento consistente de AI | UX/UI + Product | Compositions finales de AIRecommendation | No |
| CMP-Q-003 | Validación visual final de `color.ai.border` (~3.05:1) — ¿mantener violet-500 o promover a violet-600? | Legibilidad del contenedor AI | UX/UI + Frontend | Visual regression baselines | No |
| CMP-Q-004 | Implementación exacta del control de fecha (native vs. Radix vs. dedicated date picker) | Consistencia y accesibilidad | Frontend | Implementación de wizard y quote valid_until | No |
| CMP-Q-005 | Implementación exacta del Select/Combobox (Headless UI vs. Radix vs. native mobile) | Consistencia y accesibilidad | Frontend | Implementación de filtros y forms | No |
| CMP-Q-006 | Librería exacta de accessibility primitives (Headless UI vs. Radix por componente) | Consistencia de comportamiento a11y | Frontend | Implementación de Modal/Drawer/DropdownMenu/Tabs | No |

```text
No existen preguntas bloqueantes para iniciar Figma components, Storybook planning o frontend component implementation.
```

---

## 47. Approval checklist

- [x] UI Foundations were read completely.
- [x] Design Tokens were read completely.
- [x] Component principles are defined.
- [x] Component architecture is defined.
- [x] Naming conventions are defined.
- [x] Standard specification template is defined.
- [x] Global state model is defined.
- [x] Global size model is defined.
- [x] Button foundations are defined.
- [x] Form foundations are defined.
- [x] Navigation foundations are defined.
- [x] Expanded sidebar is the MVP default.
- [x] Collapsed sidebar is deferred.
- [x] Feedback components are defined.
- [x] Data-display foundations are defined.
- [x] Overlay foundations are defined.
- [x] AI component family is defined.
- [x] AI content supports human-in-the-loop.
- [x] Exact AI glyph is not treated as blocking.
- [x] AI border requires visual validation.
- [x] Icon requirements are defined independently from a library.
- [x] Icon-library selection remains non-blocking.
- [x] Marketing components are defined.
- [x] Role-specific usage reuses shared components.
- [x] Responsive behavior is documented.
- [x] WCAG 2.1 AA requirements are mandatory.
- [x] Four locales are considered.
- [x] Currency behavior is respected.
- [x] Token consumption is documented.
- [x] Figma guidance is included.
- [x] Frontend guidance is included.
- [x] Testing guidance is included.
- [x] Component inventory is included.
- [x] Decision register is included.
- [x] Deferred decisions are separated.
- [x] No React code was generated.
- [x] No Tailwind code was generated.
- [x] No Storybook stories were generated.
- [x] No Figma components were generated.
- [x] No dark-mode components were introduced.
- [x] No role themes were introduced.
- [x] No third-party component designs were copied.
- [x] No post-MVP functionality was introduced.

---

## 48. Final recommendation

Component Foundations están **listos para revisión de Product Owner, UX y frontend**.

Son suficientes para:

- **Iniciar la construcción de componentes en Figma** (component sets + variants + estados) sobre el sistema de tokens ya aprobado.
- **Planificar Storybook** (definir el catálogo por categoría, priorizar P0 antes que P1/P2, alinear a las variantes y estados aquí especificados).
- **Guiar la implementación de componentes en frontend** (Next.js 14 App Router, React, TanStack Query, RHF + Zod, next-intl, Tailwind + tokens, Headless UI + Radix selectivos, `lucide-react` propuesto), con ownership claro de loading/error/permission states y consumo estricto de tokens semánticos + aliases.

Métricas de cierre:

- **Blocking questions: 0**.
- **Provisional decisions: 3** (CMP-DEC-006 icon library non-blocking, CMP-DEC-007/008 AI glyph + AI border validation).
- **Non-blocking recommendations:**
  - Ratificar `lucide-react` como librería única antes del binding final en Figma.
  - Validar visualmente `color.ai.border` en navegador y Figma; promover a `color.violet.600` vía ajuste de tokens si es necesario.
  - Definir un placeholder consistente para el sparkle AI hasta cerrar el glifo definitivo.
  - Adoptar `eslint-plugin-tailwindcss` y `stylelint` para prevenir valores hardcoded.
  - Alinear el uso de `data-testid` con la nota operativa sobre el route announcer de Next (patrón ya observado en E2E US-081).

Próximo artefacto recomendado:

```text
docs/ux-ui/EventFlow-Figma-Component-Library-Plan.md
```

(plan de construcción de la librería Figma — organización de páginas, orden de creación por prioridad, mapping componente ↔ tokens ↔ variantes, y cronograma para validación visual del borde AI y de la selección final de la icon library).
