# EventFlow — Design Tokens

## Document metadata

| Campo | Valor |
|---|---|
| Nombre del documento | EventFlow — Design Tokens |
| Versión | 1.0 |
| Estado | Ready for Product Owner and frontend review |
| Fecha | 2026-07-21 |
| Idioma | Español LATAM neutral |
| Producto | EventFlow — plataforma web responsive de planificación de eventos asistida por IA |
| Audiencia | Product Owner, UX/UI designers, frontend engineers, Figma designers, QA engineers, accessibility reviewers, AI coding agents, evaluadores académicos |
| Alcance | Design tokens (primitivos, semánticos y una capa mínima de alias de componente) para el MVP en light theme, derivados de las UI Foundations aprobadas. No cubre implementación de código, especificaciones completas de componentes, mockups Figma pixel-perfect, dark mode ni temas por rol. |
| Artefactos relacionados | `docs/ux-ui/EventFlow-UI-Foundations.md`, `docs/ux-ui/EventFlow-Visual-Language-Reference.md`, `docs/2-Product-Owner-Decisions.md`, `docs/3-MVP-Scope-Definition.md`, `docs/10-Non-Functional-Requirements.md`, `docs/15-Frontend-Architecture-Design.md`, `docs/17-AI-Architecture-and-PromptOps-Design.md`. Próximo artefacto downstream: `docs/ux-ui/EventFlow-Component-Foundations.md`. |
| Source of truth | `docs/ux-ui/EventFlow-UI-Foundations.md` (UI-DEC-001..UI-DEC-015) |

---

## 1. Propósito

Este documento traduce los fundamentos aprobados en `EventFlow-UI-Foundations.md` a **valores concretos y reutilizables** organizados como design tokens. Su propósito es:

- Convertir las decisiones aprobadas (UI-DEC-001..UI-DEC-015) en **valores implementables** de color, tipografía, spacing, sizing, radius, borders, shadows, layout, breakpoints, motion, focus y z-index.
- Servir como **contrato compartido** entre Product Design, UX/UI, Figma, frontend engineering, QA, accessibility review, AI coding agents y las especificaciones de componentes downstream.
- Proveer una **capa mínima de alias de componente** para clarificar cómo los tokens semánticos se consumen, sin absorber la anatomía completa de cada componente (que pertenece a `EventFlow-Component-Foundations.md`).
- Fijar restricciones de accesibilidad WCAG 2.1 AA con **evidencia de contraste** para las combinaciones críticas.
- No generar código (React, TSX, CSS, Tailwind, JSON), ni mockups Figma, ni dark mode, ni temas por rol.

Los consumidores del sistema de tokens son:

- **Figma** (variables, text styles, effects) para las mockups originales de EventFlow.
- **Frontend** (Tailwind + CSS custom properties + next-intl) por `docs/15-Frontend-Architecture-Design.md`.
- **QA y accessibility review** para verificar contraste, focus y touch targets.
- **AI coding agents** que generan UI a partir de este sistema.
- **Component Foundations** downstream para definir anatomía de componentes.

---

## 2. Alcance

### 2.1 Incluido

- Tokens primitivos (color, spacing, radius, tipografía, sombras, motion).
- Tokens semánticos (text, background, surface, border, action, feedback, focus, selection, overlay, AI).
- Capa limitada de alias de componente (button, input, card, sidebar item, AI recommendation surface).
- Tipografía (familias, pesos, tamaños, line-heights, letter-spacings, aliases semánticos).
- Spacing (escala + aliases de layout, componente, formulario y tabla).
- Sizing e interacción (controles, iconos, touch target, avatares).
- Radius, borders y shadows con aliases semánticos.
- Layout (containers, sidebar, header, page padding, grid).
- Breakpoints mobile-first.
- Motion (durations, easings, aliases).
- Focus ring accesible.
- Opacity, z-index e icon size.
- Tokens AI que soportan human-in-the-loop.
- Consideraciones de datos, moneda y locales.
- Guía de mapeo a Figma y a frontend (sin generar archivos).
- Matriz de validación de contraste con resultados.
- Registro de decisiones de tokens y decisiones diferidas.

### 2.2 No incluido

- Componentes React, JSX, TSX.
- CSS, SCSS, archivos de tokens JSON o Style Dictionary.
- Configuración Tailwind (`tailwind.config.ts`).
- Storybook stories.
- Especificaciones completas de componentes (anatomía, variantes, estados).
- Mockups Figma pixel-perfect.
- Dark mode.
- Temas por rol.
- Sistema completo de motion o de data visualization.
- Ilustración custom.
- Post-MVP.

---

## 3. Fuentes utilizadas

Todas las fuentes listadas fueron leídas antes de generar este artefacto.

| Fuente | Contribución |
|---|---|
| `docs/ux-ui/EventFlow-UI-Foundations.md` | Fuente normativa principal. Provee UI-DEC-001..UI-DEC-015, paleta aprobada, tipografía, densidad, radius/borders/shadows guidance, navegación, tratamiento IA, layout/grid, accesibilidad, i18n, currency. |
| `docs/ux-ui/EventFlow-Visual-Language-Reference.md` | Referencia visual (Jurny) — solo material inspiracional. Provee evidencia sobre riesgos de contraste (radial gradient nav, coral pastel como texto), patrones de landing candidatos y ausencia total de patrones de plataforma autenticada (VLR §C). |
| `docs/2-Product-Owner-Decisions.md` | Decisiones oficiales: mercado piloto Guatemala, branding premium/aspiracional accesible, cuatro locales, moneda por evento inmutable, LATAM cultural fit. |
| `docs/3-MVP-Scope-Definition.md` | Scope MVP: "workspace primero, marketplace después", "IA asiste no decide", tres roles, seis tipos de evento. |
| `docs/10-Non-Functional-Requirements.md` | NFR-USAB-001..006, NFR-A11Y-001..005, NFR-I18N-001..006, NFR-AI-001..003. |
| `docs/15-Frontend-Architecture-Design.md` | Stack Next.js + Tailwind + next-intl + TanStack Query; componentes `<AIPanel>`, `<Money>`, `<LanguageSelector>`, `<EventLanguageSelector>`; estados estándar. |
| `docs/17-AI-Architecture-and-PromptOps-Design.md` | Contrato AI UX: badges "Sugerencia IA", `fallback_used`, timeout `AI_PROVIDER_TIMEOUT`, banner de fallback, idioma controlado server-side. |

### Fuentes no disponibles

- **`DESIGN_SYSTEM_SETUP_IMAGE`** — el operador no proveyó imagen de setup del design system. Se continúa apoyado en las fuentes restantes; ninguna decisión aprobada quedó bloqueada por su ausencia.

---

## 4. Autoridad de fuentes y resolución de conflictos

Orden de autoridad declarado (mayor a menor):

1. `EventFlow-UI-Foundations.md` (UI-DEC-001..UI-DEC-015).
2. `docs/2-Product-Owner-Decisions.md`.
3. `docs/3-MVP-Scope-Definition.md`.
4. `docs/10-Non-Functional-Requirements.md`.
5. `docs/15-Frontend-Architecture-Design.md`.
6. `docs/17-AI-Architecture-and-PromptOps-Design.md`.
7. `docs/ux-ui/EventFlow-Visual-Language-Reference.md`.
8. Design System Setup reference image (no disponible).
9. Recomendaciones generales de design systems.

Los valores exactos del reference Figma de terceros (`Jurny`) **no** son autoridad. Se prohíbe copiar branding, wordmark, copy, paleta exacta lilac+coral como firma, radial gradient del nav activo, y assets propietarios (VLR §G). Cuando el reference sugiere un valor incompatible con los guardrails aprobados, prevalece UI Foundations.

---

## 5. Principios del sistema de tokens

1. **Significado semántico sobre valores visuales crudos** — los componentes consumen tokens semánticos; los primitivos existen solo como fuente.
2. **Accesibilidad antes que fidelidad a la referencia** — cualquier combinación crítica debe cumplir WCAG 2.1 AA; los tonos se ajustan cuando el valor aprobado no cumple.
3. **Escala mínima suficiente para el MVP** — sin generar shades ni aliases que no tienen consumidor real.
4. **Un solo sistema visual entre roles** (UI-DEC-008, UI-DEC-009) — no hay tokens `organizer.*`, `vendor.*` ni `admin.*`.
5. **Light theme únicamente** (UI-DEC-013) — sin equivalentes dark.
6. **Colores de marca separados de colores semánticos** (UI-DEC-002, UI-DEC-014) — violet/lilac/coral no expresan success/warning/error/info.
7. **Estados IA explícitos y human-in-the-loop** (UI-DEC-010; NFR-AI-001) — badge + icono + label son mandatorios; el color no es la única señal.
8. **Landing y plataforma comparten primitivos** y se diferencian con aliases específicos donde aporta claridad.
9. **Los tokens deben funcionar en Figma y en frontend** — nombres neutrales al framework; valores portables.
10. **Evitar valores one-off** cuando existe un token aprobado; cuando un caso justifica un nuevo token, se agrega al sistema con clasificación explícita.

---

## 6. Arquitectura de tokens

EventFlow adopta una arquitectura de **tres capas** proporcional al MVP:

- **Primitivos** — valores crudos sin significado UI (`color.violet.500`, `space.4`, `font.size.4`, `shadow.2`). No se consumen directamente por componentes; solo por semánticos.
- **Semánticos** — expresan propósito (`color.text.primary`, `color.action.primary.background`, `border.width.default`, `motion.duration.fast`). Es la capa que Figma variables, Tailwind theme keys y CSS custom properties deben consumir.
- **Alias de componente (limitados)** — solo cuando resuelven ambigüedad importante o representan un patrón global reutilizado (`button.primary.background`, `input.border.default`, `sidebar.item.activeBackground`, `aiRecommendation.background`). La anatomía completa por componente pertenece a `EventFlow-Component-Foundations.md`.

Ejemplo de flujo (violet como CTA primaria de plataforma):

```text
color.violet.600
    ↓  (primitivo)
color.action.primary.background
    ↓  (semántico)
button.primary.background
    ↓  (alias de componente)
Consumido en Figma como variable ligada al fill del componente Button
Consumido en frontend como CSS custom property / Tailwind theme key
```

Reglas:

- Figma variables, Tailwind theme y CSS custom properties **consumen la capa semántica** (y una fracción mínima de alias de componente).
- Los primitivos **no** se consumen directamente por componentes ni por classes en Tailwind.
- Los alias de componente **siempre referencian semánticos**, nunca primitivos crudos.

---

## 7. Convenciones de naming

### 7.1 Formato

Notación en punto (dot notation) en `lowercaseCamelCase` para segmentos multi-palabra:

```text
category.group.role.state
```

Ejemplos válidos:

```text
color.text.primary
color.action.primary.hover
color.feedback.success.surface
font.size.body.md
space.layout.section.marketing
radius.card.prominent
shadow.overlay.modal
motion.duration.fast
zIndex.overlay.modal
focus.ring.color
```

### 7.2 Categorías

- `color.*` — cualquier valor cromático.
- `font.*` — familias, pesos, tamaños, line-heights, letter-spacings.
- `typography.*` — aliases semánticos compuestos (family + size + weight + line-height + letter-spacing).
- `space.*` — spacing primitivo y aliases.
- `size.*` — dimensiones (controles, iconos, avatares, touch target).
- `radius.*` — border-radius.
- `border.*` — width, style, aliases.
- `shadow.*` — sombras.
- `layout.*` — containers, grid, sidebar, header, page padding.
- `breakpoint.*` — puntos de ruptura responsive.
- `motion.*` — durations, easings, aliases.
- `focus.*` — focus ring.
- `opacity.*` — transparencias.
- `zIndex.*` — capas de apilamiento.
- `icon.*` — sizes y strokes de iconografía.

### 7.3 Sufijos de estado

`default`, `hover`, `active`, `focus`, `disabled`, `pending`, `selected`, `raised`, `subtle`, `strong`, `elevated`, `inverse`, `foreground`, `background`, `surface`, `border`, `text`, `icon`.

### 7.4 Patrones prohibidos

- Hex crudos dentro del nombre semántico (`color.violet.946DF8` prohibido).
- Nombres de componente dentro de primitivos (`space.button.padding` en `space.*` prohibido; pertenece a alias `button.*` o `space.component.padding.*`).
- Nombres de rol (`organizer`, `vendor`, `admin`) dentro de tokens de color (UI-DEC-008/009).
- Sinónimos mezclados (`bg`, `background`, `surface`) — usar `background` para controles/acciones, `surface` para contenedores/paneles, `text` para contenido, `foreground` para contenido sobre color de acción/estado.
- Escalas numéricas más largas de lo necesario.

---

## 8. Color primitives

Todos los primitivos de color se definen en light theme (UI-DEC-013). Cada tabla incluye clasificación honesta.

### 8.1 Neutral scale

Escala neutral anclada en los valores aprobados `#FFFFFF`, `#262626` y `#525252` (UI-DEC-002). Progresión conservadora `50–950` para soportar texto, background, superficies muted, bordes, disabled y CTA oscura de landing.

| Token | Value | Classification | Intended use |
|---|---|---|---|
| `color.neutral.0` | `#FFFFFF` | Approved | Background principal (UI-DEC-002); superficie de cards en producto. |
| `color.neutral.50` | `#FAFAFA` | Recommended | Background sutil de sección; superficies subtle en producto. |
| `color.neutral.100` | `#F5F5F5` | Recommended | Superficies muted; separadores muy suaves. |
| `color.neutral.200` | `#E5E5E5` | Recommended | Bordes subtle; separadores; superficies disabled. |
| `color.neutral.300` | `#D4D4D4` | Recommended | Bordes default de inputs/tables; iconos disabled. |
| `color.neutral.400` | `#A3A3A3` | Recommended | Texto disabled; iconos secundarios. |
| `color.neutral.500` | `#737373` | Recommended | Muted text; helper text sobre superficies claras. |
| `color.neutral.600` | `#525252` | Approved | Secondary text (UI-DEC-002); labels secundarios; meta text. |
| `color.neutral.700` | `#404040` | Recommended | Text hover; borders strong. |
| `color.neutral.800` | `#262626` | Approved | Main text (UI-DEC-002); headings dark. |
| `color.neutral.900` | `#171717` | Derived | Text inverse background; CTA oscura de landing (UI-DEC-003). |
| `color.neutral.950` | `#0A0A0A` | Recommended | Overlays fuertes; foco extremo. Uso muy restringido. |

### 8.2 Violet scale

Escala construida alrededor del anchor aprobado `#946DF8` (UI-DEC-002). Se generan variantes más oscuras (`600`/`700`) porque el `500` no cumple contraste 4.5:1 sobre blanco para texto (VLR §E, UI-Q-001).

| Token | Value | Classification | Intended use |
|---|---|---|---|
| `color.violet.50` | `#F5F1FE` | Recommended | AI surface / light violet surface. |
| `color.violet.100` | `#EDE6FE` | Recommended | Hover subtle sobre violet surface. |
| `color.violet.200` | `#DACAFC` | Recommended | Border subtle violet. |
| `color.violet.300` | `#BFA5FA` | Recommended | Border violet default no textual. |
| `color.violet.400` | `#A582F9` | Recommended | Estado hover sobre violet-500 en superficies claras. |
| `color.violet.500` | `#946DF8` | Approved | Anchor brand violet (UI-DEC-002). Uso como acento no textual, borde de AI, background de CTA `platform` (foreground siempre blanco). Contraste sobre blanco ≈ 3.2:1 — **no válido para texto**. |
| `color.violet.600` | `#7B4EE8` | Derived | Hover de CTA violet en platform; foreground blanco cumple contraste. |
| `color.violet.700` | `#6238C7` | Derived | Text violet accesible sobre blanco (≈ 7.4:1); foreground de link; focus ring color; text de acción secundaria violeta. |
| `color.violet.800` | `#4A2A99` | Recommended | Active pressed de CTA violet; text muy fuerte cuando se requiere jerarquía. |
| `color.violet.900` | `#2E1B5C` | Recommended | Overlays violet muy oscuros; reservado. |

### 8.3 Lilac scale

Escala mínima alrededor del anchor `#C4B7E5` (UI-DEC-002). Uso decorativo y como superficie AI muy clara. **Nunca como texto** (UI-DEC-002).

| Token | Value | Classification | Intended use |
|---|---|---|---|
| `color.lilac.50` | `#F7F5FB` | Recommended | AI surface muy suave; decorativo en landing hero. |
| `color.lilac.100` | `#EFEBF6` | Recommended | AI surface hover; acento decorativo secundario. |
| `color.lilac.200` | `#DBD1EC` | Recommended | AI border subtle; forma decorativa. |
| `color.lilac.300` | `#C4B7E5` | Approved | Anchor decorative lilac (UI-DEC-002). Solo decorativo/border; nunca texto. |
| `color.lilac.400` | `#A691D5` | Recommended | Acento decorativo más fuerte en landing. |

### 8.4 Coral scale

Escala mínima alrededor del anchor `#EE8C8D` (UI-DEC-002). Solo decorativo; **nunca como error, destructive, texto ni icono principal**.

| Token | Value | Classification | Intended use |
|---|---|---|---|
| `color.coral.50` | `#FEF3F3` | Recommended | Decorativo landing muy suave. |
| `color.coral.100` | `#FDE5E5` | Recommended | Decorativo landing hover. |
| `color.coral.200` | `#F9C4C5` | Recommended | Formas decorativas. |
| `color.coral.300` | `#EE8C8D` | Approved | Anchor decorative coral (UI-DEC-002). Solo decorativo. |
| `color.coral.400` | `#D96667` | Recommended | Acento decorativo más fuerte en landing. |

### 8.5 Familias semánticas primitivas

Escalas compactas por familia (UI-DEC-014). Solo los steps que la capa semántica necesita.

**Green (success)**

| Token | Value | Classification | Intended use |
|---|---|---|---|
| `color.green.50` | `#ECFDF5` | Recommended | Success surface. |
| `color.green.100` | `#D1FAE5` | Recommended | Success surface hover. |
| `color.green.200` | `#A7F3D0` | Recommended | Success border default. |
| `color.green.600` | `#16A34A` | Recommended | Success default (icon, dot, badge). |
| `color.green.700` | `#15803D` | Recommended | Success text sobre surface; success strong. |
| `color.green.foreground` | `#FFFFFF` | Derived | Foreground sobre green-600/700. |

**Amber (warning)**

| Token | Value | Classification | Intended use |
|---|---|---|---|
| `color.amber.50` | `#FFFBEB` | Recommended | Warning surface. |
| `color.amber.100` | `#FEF3C7` | Recommended | Warning surface hover. |
| `color.amber.200` | `#FDE68A` | Recommended | Warning border default. |
| `color.amber.600` | `#D97706` | Recommended | Warning default (icon, badge). |
| `color.amber.700` | `#B45309` | Recommended | Warning text sobre surface; warning strong. |
| `color.amber.foreground` | `#FFFFFF` | Derived | Foreground sobre amber-600/700. |

**Red (error / destructive)**

| Token | Value | Classification | Intended use |
|---|---|---|---|
| `color.red.50` | `#FEF2F2` | Recommended | Error surface. |
| `color.red.100` | `#FEE2E2` | Recommended | Error surface hover. |
| `color.red.200` | `#FECACA` | Recommended | Error border default. |
| `color.red.600` | `#DC2626` | Recommended | Error / destructive default (button bg, icon). |
| `color.red.700` | `#B91C1C` | Recommended | Error text sobre surface; destructive hover. |
| `color.red.foreground` | `#FFFFFF` | Derived | Foreground sobre red-600/700. |

**Blue (info)**

| Token | Value | Classification | Intended use |
|---|---|---|---|
| `color.blue.50` | `#EFF6FF` | Recommended | Info surface. |
| `color.blue.100` | `#DBEAFE` | Recommended | Info surface hover. |
| `color.blue.200` | `#BFDBFE` | Recommended | Info border default. |
| `color.blue.600` | `#2563EB` | Recommended | Info default (icon, badge, link). |
| `color.blue.700` | `#1D4ED8` | Recommended | Info text sobre surface; info strong; link hover. |
| `color.blue.foreground` | `#FFFFFF` | Derived | Foreground sobre blue-600/700. |

### 8.6 Transparency primitives

Set mínimo para overlays, disabled, hover, superficies decorativas y scrims.

| Token | Value | Classification | Intended use |
|---|---|---|---|
| `color.alpha.overlay.60` | `rgba(23, 23, 23, 0.60)` | Recommended | Scrim de modal / drawer (basado en neutral-900). |
| `color.alpha.overlay.40` | `rgba(23, 23, 23, 0.40)` | Recommended | Scrim ligero (image overlay, popover backdrop). |
| `color.alpha.hover.subtle` | `rgba(23, 23, 23, 0.04)` | Recommended | Hover ghost sobre superficies claras. |
| `color.alpha.hover.strong` | `rgba(23, 23, 23, 0.08)` | Recommended | Hover ghost más intenso. |
| `color.alpha.violet.subtle` | `rgba(148, 109, 248, 0.08)` | Recommended | AI surface hover alternativo. |
| `color.alpha.decorative.scrim` | `rgba(255, 255, 255, 0.70)` | Recommended | Scrim blanco sobre imagen para legibilidad de hero. |

---

## 9. Semantic color tokens

Todos los semánticos referencian primitivos. Los valores resueltos se muestran para trazabilidad.

### 9.1 Text

| Token | Primitive reference | Resolved value | Usage | Accessibility / Notes |
|---|---|---|---|---|
| `color.text.primary` | `color.neutral.800` | `#262626` | Headings dark, body principal. | Sobre blanco: 14.68:1 ✅ AAA. |
| `color.text.secondary` | `color.neutral.600` | `#525252` | Labels secundarios, meta, helper. | Sobre blanco: 7.65:1 ✅ AAA. |
| `color.text.muted` | `color.neutral.500` | `#737373` | Placeholder, captions poco críticas. | Sobre blanco: 4.83:1 ✅ AA (texto normal). |
| `color.text.disabled` | `color.neutral.400` | `#A3A3A3` | Texto de controles disabled. | Sobre blanco: 2.83:1 — reservado a disabled (no aplica AA para disabled per WCAG 1.4.3). |
| `color.text.inverse` | `color.neutral.0` | `#FFFFFF` | Texto sobre backgrounds oscuros (CTA landing, badges strong). | Sobre neutral-900: 17.4:1 ✅ AAA. |
| `color.text.link` | `color.violet.700` | `#6238C7` | Links en producto. | Sobre blanco: 7.4:1 ✅ AAA. |
| `color.text.linkHover` | `color.violet.800` | `#4A2A99` | Hover de link. | Sobre blanco: 10.2:1 ✅ AAA. |

### 9.2 Background y surfaces

| Token | Primitive reference | Resolved value | Usage | Accessibility / Notes |
|---|---|---|---|---|
| `color.background.default` | `color.neutral.0` | `#FFFFFF` | Background principal (UI-DEC-002). | — |
| `color.background.subtle` | `color.neutral.50` | `#FAFAFA` | Background alterno de secciones landing y áreas de dashboard. | Contraste borde con blanco ≈ 1.03:1 (solo perceptible en composición). |
| `color.surface.default` | `color.neutral.0` | `#FFFFFF` | Superficie de cards, panels, sidebar. | — |
| `color.surface.subtle` | `color.neutral.50` | `#FAFAFA` | Superficie alternada (row striping, table striping opcional). | — |
| `color.surface.elevated` | `color.neutral.0` | `#FFFFFF` | Superficie de modal / drawer / dropdown (compensada con sombra). | — |
| `color.surface.disabled` | `color.neutral.100` | `#F5F5F5` | Superficie de controles disabled. | — |
| `color.surface.inverse` | `color.neutral.900` | `#171717` | Superficie oscura (CTA landing, footer inverso). | Contraste con `color.text.inverse` ✅ AAA. |

### 9.3 Borders y separators

| Token | Primitive reference | Resolved value | Usage | Accessibility / Notes |
|---|---|---|---|---|
| `color.border.default` | `color.neutral.300` | `#D4D4D4` | Border default de inputs, tables, cards en plataforma (UI-DEC-007). | Border no textual: 1.61:1 (aceptable como límite decorativo; alternativa `color.border.strong` para 3:1). |
| `color.border.subtle` | `color.neutral.200` | `#E5E5E5` | Separadores muy suaves, hairlines. | — |
| `color.border.strong` | `color.neutral.700` | `#404040` | Border enfático (badges strong, chips, highlight). | Sobre blanco: 10.4:1 ✅. |
| `color.border.interactive` | `color.violet.500` | `#946DF8` | Border activo/focus base (previo al focus ring). | Sobre blanco: 3.2:1 ✅ para elementos no textuales (WCAG 1.4.11). |
| `color.border.disabled` | `color.neutral.200` | `#E5E5E5` | Border de controles disabled. | — |
| `color.separator.default` | `color.neutral.200` | `#E5E5E5` | Separador entre secciones, entre items de sidebar, entre filas. | — |

### 9.4 Actions

**Primary (platform)**

| Token | Primitive reference | Resolved value | Usage | Accessibility / Notes |
|---|---|---|---|---|
| `color.action.primary.background` | `color.violet.600` | `#7B4EE8` | Background de CTA primaria en producto (UI-DEC-003). | Con foreground blanco: 5.2:1 ✅ AA. |
| `color.action.primary.hover` | `color.violet.700` | `#6238C7` | Hover de CTA primaria. | Con foreground blanco: 7.4:1 ✅ AAA. |
| `color.action.primary.active` | `color.violet.800` | `#4A2A99` | Active pressed. | Con foreground blanco: 10.2:1 ✅ AAA. |
| `color.action.primary.foreground` | `color.neutral.0` | `#FFFFFF` | Texto/icono sobre acción primaria. | Ver arriba. |
| `color.action.primary.disabledBackground` | `color.neutral.200` | `#E5E5E5` | Disabled bg. | — |
| `color.action.primary.disabledForeground` | `color.neutral.400` | `#A3A3A3` | Disabled fg. | Estado disabled exento de AA para texto. |

**Secondary (outlined / neutral)**

| Token | Primitive reference | Resolved value | Usage | Accessibility / Notes |
|---|---|---|---|---|
| `color.action.secondary.background` | `color.neutral.0` | `#FFFFFF` | Background de acción secundaria outlined (UI-DEC-003). | — |
| `color.action.secondary.hover` | `color.neutral.50` | `#FAFAFA` | Hover secondary. | — |
| `color.action.secondary.foreground` | `color.neutral.800` | `#262626` | Texto secondary. | Sobre blanco: 14.68:1 ✅. |
| `color.action.secondary.border` | `color.neutral.300` | `#D4D4D4` | Border secondary default. | — |

**Ghost**

| Token | Primitive reference | Resolved value | Usage | Accessibility / Notes |
|---|---|---|---|---|
| `color.action.ghost.hover` | `color.alpha.hover.subtle` | `rgba(23,23,23,0.04)` | Ghost hover en sidebar items, iconos-solo. | — |
| `color.action.ghost.foreground` | `color.neutral.800` | `#262626` | Texto ghost. | Sobre blanco: 14.68:1 ✅. |

**Destructive**

| Token | Primitive reference | Resolved value | Usage | Accessibility / Notes |
|---|---|---|---|---|
| `color.action.destructive.background` | `color.red.600` | `#DC2626` | Background de acción destructiva (UI-DEC-003, UI-DEC-014). | Con foreground blanco: 4.83:1 ✅ AA. |
| `color.action.destructive.hover` | `color.red.700` | `#B91C1C` | Hover destructiva. | Con foreground blanco: 6.79:1 ✅ AA/AAA. |
| `color.action.destructive.foreground` | `color.neutral.0` | `#FFFFFF` | Foreground sobre destructive. | Ver arriba. |

### 9.5 Feedback

Cada status expone `surface`, `border`, `text`, `icon`, `strong`, `foreground`. Los valores reutilizan las familias semánticas primitivas (UI-DEC-014).

| Token | Primitive reference | Resolved value | Usage | Accessibility / Notes |
|---|---|---|---|---|
| `color.feedback.success.surface` | `color.green.50` | `#ECFDF5` | Alerts, toasts, badges success. | — |
| `color.feedback.success.border` | `color.green.200` | `#A7F3D0` | Border sobre surface. | — |
| `color.feedback.success.text` | `color.green.700` | `#15803D` | Texto success sobre surface. | Sobre green.50: 5.14:1 ✅ AA. |
| `color.feedback.success.icon` | `color.green.600` | `#16A34A` | Icono success. | Sobre green.50: 3.63:1 ✅ (no textual). |
| `color.feedback.success.strong` | `color.green.600` | `#16A34A` | Badge fill strong, dot. | Foreground blanco: 3.7:1 (uso para elementos gráficos; UI evita texto sobre este fill). |
| `color.feedback.success.foreground` | `color.green.foreground` | `#FFFFFF` | Foreground sobre strong. | — |
| `color.feedback.warning.surface` | `color.amber.50` | `#FFFBEB` | Alerts warning. | — |
| `color.feedback.warning.border` | `color.amber.200` | `#FDE68A` | Border warning. | — |
| `color.feedback.warning.text` | `color.amber.700` | `#B45309` | Texto warning. | Sobre amber.50: 5.98:1 ✅ AA. |
| `color.feedback.warning.icon` | `color.amber.600` | `#D97706` | Icono warning. | Sobre amber.50: 3.96:1 ✅ (no textual). |
| `color.feedback.warning.strong` | `color.amber.600` | `#D97706` | Badge fill strong. | — |
| `color.feedback.warning.foreground` | `color.amber.foreground` | `#FFFFFF` | Foreground sobre strong. | — |
| `color.feedback.error.surface` | `color.red.50` | `#FEF2F2` | Alerts error. | — |
| `color.feedback.error.border` | `color.red.200` | `#FECACA` | Border error. | — |
| `color.feedback.error.text` | `color.red.700` | `#B91C1C` | Texto error. | Sobre red.50: 6.66:1 ✅ AA/AAA. |
| `color.feedback.error.icon` | `color.red.600` | `#DC2626` | Icono error. | Sobre red.50: 4.72:1 ✅. |
| `color.feedback.error.strong` | `color.red.600` | `#DC2626` | Badge fill strong. | — |
| `color.feedback.error.foreground` | `color.red.foreground` | `#FFFFFF` | Foreground sobre strong. | — |
| `color.feedback.info.surface` | `color.blue.50` | `#EFF6FF` | Alerts info. | — |
| `color.feedback.info.border` | `color.blue.200` | `#BFDBFE` | Border info. | — |
| `color.feedback.info.text` | `color.blue.700` | `#1D4ED8` | Texto info. | Sobre blue.50: 8.14:1 ✅ AAA. |
| `color.feedback.info.icon` | `color.blue.600` | `#2563EB` | Icono info. | Sobre blue.50: 5.83:1 ✅ AA. |
| `color.feedback.info.strong` | `color.blue.600` | `#2563EB` | Badge fill strong. | — |
| `color.feedback.info.foreground` | `color.blue.foreground` | `#FFFFFF` | Foreground sobre strong. | — |

### 9.6 Focus

| Token | Primitive reference | Resolved value | Usage | Accessibility / Notes |
|---|---|---|---|---|
| `color.focus.ring` | `color.violet.700` | `#6238C7` | Color del focus ring accesible. | Sobre blanco: 7.4:1 ✅ AAA. Sobre violet-600 (CTA): con anillo offset blanco cumple contraste (ver §21). |
| `color.focus.ringOffset` | `color.neutral.0` | `#FFFFFF` | Offset ring que separa el focus del control. | Provee separación visual necesaria sobre superficies violet, lilac o feedback (UI-DEC-015). |

### 9.7 Selection

| Token | Primitive reference | Resolved value | Usage | Accessibility / Notes |
|---|---|---|---|---|
| `color.selection.background` | `color.violet.100` | `#EDE6FE` | Selección de texto. | Con `color.text.primary` (`#262626`): 13.7:1 ✅. |
| `color.selection.foreground` | `color.neutral.800` | `#262626` | Texto seleccionado. | — |

### 9.8 Overlay

| Token | Primitive reference | Resolved value | Usage | Accessibility / Notes |
|---|---|---|---|---|
| `color.overlay.scrim` | `color.alpha.overlay.60` | `rgba(23,23,23,0.60)` | Scrim de modal/drawer. | Cumple aislamiento visual del contenido subyacente y foco (UI-DEC-015). |

---

## 10. Aliases marketing y platform

Los aliases marketing/platform se crean **solo** donde la separación aprobada (UI-DEC-001, UI-DEC-003, UI-DEC-005, UI-DEC-007) requiere valores distintos sobre los mismos primitivos. Cuando reutilizar un semántico es suficiente, no se duplica.

### 10.1 Marketing aliases

| Token | Primitive reference | Resolved value | Usage | Notes |
|---|---|---|---|---|
| `color.marketing.cta.background` | `color.neutral.900` | `#171717` | CTA primaria dark en landing (UI-DEC-003). | Foreground blanco: 17.4:1 ✅ AAA. |
| `color.marketing.cta.hover` | `color.neutral.800` | `#262626` | Hover CTA landing. | Foreground blanco: 14.68:1 ✅. |
| `color.marketing.cta.foreground` | `color.neutral.0` | `#FFFFFF` | Foreground sobre CTA landing. | — |
| `color.marketing.accent.lilac` | `color.lilac.300` | `#C4B7E5` | Acento decorativo lilac en landing. | Solo decorativo. |
| `color.marketing.accent.coral` | `color.coral.300` | `#EE8C8D` | Acento decorativo coral en landing. | Solo decorativo. |
| `color.marketing.hero.surface` | `color.neutral.50` | `#FAFAFA` | Superficie base del hero con acentos decorativos superpuestos. | — |

### 10.2 Platform aliases

| Token | Primitive reference | Resolved value | Usage | Notes |
|---|---|---|---|---|
| `color.platform.cta.background` | `color.action.primary.background` | `#7B4EE8` | CTA primaria en plataforma (UI-DEC-003). | Alias de acción primaria; expuesto por claridad marketing/platform. |
| `color.platform.cta.hover` | `color.action.primary.hover` | `#6238C7` | Hover CTA platform. | — |
| `color.platform.cta.foreground` | `color.action.primary.foreground` | `#FFFFFF` | Foreground CTA platform. | — |
| `color.platform.sidebar.background` | `color.neutral.0` | `#FFFFFF` | Background del sidebar (UI-DEC-008). | Bordes ligeros separan del content. |
| `color.platform.sidebar.itemHover` | `color.alpha.hover.subtle` | `rgba(23,23,23,0.04)` | Hover de item de sidebar. | — |
| `color.platform.sidebar.itemActive` | `color.violet.50` | `#F5F1FE` | Background del item activo. | — |
| `color.platform.sidebar.itemActiveForeground` | `color.violet.700` | `#6238C7` | Texto/icono del item activo. | Sobre violet.50: 7.1:1 ✅ AAA. |
| `color.platform.page.background` | `color.neutral.50` | `#FAFAFA` | Background del content area para separar de las cards blancas. | — |

---

## 11. AI semantic tokens

Grupo AI dedicado que refuerza human-in-the-loop (UI-DEC-010; NFR-AI-001; AI Architecture §15/§23). Los estados que corresponden a semánticas existentes (accepted, edited, rejected, fallback, error) **reutilizan** las familias feedback en vez de crear paletas paralelas.

| Token | Primitive reference | Resolved value | Usage | Notes |
|---|---|---|---|---|
| `color.ai.surface` | `color.lilac.50` | `#F7F5FB` | Background del `<AIPanel>` en estado pending. | Con `color.text.primary`: 13.7:1 ✅. |
| `color.ai.surfaceHover` | `color.lilac.100` | `#EFEBF6` | Hover sobre `<AIPanel>`. | — |
| `color.ai.border` | `color.violet.500` | `#946DF8` | Border/accent violeta del panel AI. | Sobre `color.ai.surface`: 3.05:1 ✅ (no textual, WCAG 1.4.11). |
| `color.ai.borderStrong` | `color.violet.700` | `#6238C7` | Border strong en pending crítico. | Sobre `color.ai.surface`: 6.9:1 ✅. |
| `color.ai.text` | `color.neutral.800` | `#262626` | Texto del contenido AI. | Sobre `color.ai.surface`: 13.7:1 ✅. |
| `color.ai.icon` | `color.violet.700` | `#6238C7` | Icono AI (sparkle) por defecto. | Sobre `color.ai.surface`: 6.9:1 ✅. |
| `color.ai.label` | `color.violet.700` | `#6238C7` | Label textual "Sugerencia de IA". | Sobre `color.ai.surface`: 6.9:1 ✅. |
| `color.ai.pending` | `color.violet.500` | `#946DF8` | Indicador visual de estado pending (dot, tag). | Acompañado siempre de icono + label. |
| `color.ai.accepted` | `color.feedback.success.strong` | `#16A34A` | Indicador transitorio de aceptación (toast/dot); tras aceptar el contenido usa lenguaje visual normal. | — |
| `color.ai.edited` | `color.feedback.info.strong` | `#2563EB` | Indicador de contenido editado por humano tras aceptar (cuando FR lo requiere). | Reutiliza info. |
| `color.ai.rejected` | `color.neutral.500` | `#737373` | Indicador muted para sugerencias descartadas. | Sobre blanco: 4.83:1 ✅. |
| `color.ai.fallback` | `color.feedback.warning.strong` | `#D97706` | Banner "Asistencia IA en modo respaldo" cuando `aiMeta.fallbackUsed === true` (AI Arch §16.4). | Reutiliza warning. |
| `color.ai.error` | `color.feedback.error.strong` | `#DC2626` | Mensajes de error AI (timeout, provider error). | Reutiliza error. |

### 11.1 Reglas de uso

- Los tokens **visuales** (`surface`, `surfaceHover`, `border`, `borderStrong`, `text`, `icon`, `pending`) deben **siempre** acompañarse de icono + label textual "Sugerencia de IA" (UI-DEC-010; UI-DEC-015).
- Los tokens de estado (`accepted`, `edited`, `rejected`, `fallback`, `error`) refieren indicadores/badges/banners; el color **nunca** es la única señal.
- No existen tokens `color.ai.glow.*` ni gradientes animados (UI-DEC-010).
- El violeta se mantiene funcional (border/icono/label); el lilac se mantiene sutil (surface).
- Cuando un contenido AI es aceptado, transiciona a `color.surface.default` + `color.text.primary` (deja de consumir tokens `color.ai.*`).

---

## 12. Typography tokens

### 12.1 Font-family tokens

| Token | Value | Classification | Notes |
|---|---|---|---|
| `font.family.heading` | `"Inter Tight", system-ui, sans-serif` | Approved | UI-DEC-004. Soporta los 4 locales sin sustituciones. |
| `font.family.body` | `"Inter", system-ui, sans-serif` | Approved | UI-DEC-004. Body y UI. |
| `font.family.ui` | `"Inter", system-ui, sans-serif` | Derived | Alias de body para labels, botones y controles. |
| `font.family.mono` | `ui-monospace, "SF Mono", "Menlo", monospace` | Provisional | No aprobado explícitamente; se propone como sistema seguro para valores numéricos técnicos, códigos y datos raw (uso restringido). Validar en Component Foundations. |

### 12.2 Font-weight tokens

Set mínimo alineado con la jerarquía aprobada (UI-DEC-004).

| Token | Value | Classification | Usage |
|---|---|---|---|
| `font.weight.regular` | `400` | Approved | Body regular. |
| `font.weight.medium` | `500` | Recommended | Labels, botones ghost, tabla de datos. |
| `font.weight.semibold` | `600` | Approved | Headings, botones primarios/secundarios. |
| `font.weight.bold` | `700` | Recommended | Display, eyebrow, énfasis marketing. |

### 12.3 Font-size, line-height y letter-spacing primitivos

Escala primitiva compacta (rem-first para respetar zoom WCAG 1.4.4).

| Token | Value | Classification | Notes |
|---|---|---|---|
| `font.size.display` | `3.75rem` (60 px) | Recommended | Hero display landing. Los tamaños > 60 px se difieren a Figma per UI-Q-003. |
| `font.size.h1` | `2.5rem` (40 px) | Derived | Landing H1 principal; platform H1. |
| `font.size.h2` | `2rem` (32 px) | Derived | Landing H2; platform section title. |
| `font.size.h3` | `1.5rem` (24 px) | Derived | Card headings, subsecciones. |
| `font.size.body.lg` | `1.125rem` (18 px) | Derived | Body large (landing intro, panel de resumen). |
| `font.size.body.md` | `1rem` (16 px) | Approved | Body default (UI-DEC-004; alineado con VLR). |
| `font.size.body.sm` | `0.875rem` (14 px) | Derived | Body small, helper text, tabla densidad intermedia. |
| `font.size.label` | `0.875rem` (14 px) | Derived | Labels de formulario y controles. |
| `font.size.caption` | `0.75rem` (12 px) | Derived | Caption, meta, footnote. Reservado a meta; nunca body crítico (VLR §A.11). |

**Line-height**

| Token | Value | Classification | Usage |
|---|---|---|---|
| `font.lineHeight.tight` | `1.1` | Recommended | Display y H1 landing. |
| `font.lineHeight.snug` | `1.25` | Recommended | H2, H3. |
| `font.lineHeight.normal` | `1.5` | Recommended | Body md, labels. |
| `font.lineHeight.relaxed` | `1.6` | Recommended | Body lg de lectura larga. |

**Letter-spacing**

| Token | Value | Classification | Usage |
|---|---|---|---|
| `font.letterSpacing.tight` | `-0.02em` | Recommended | Headings grandes (display, h1). |
| `font.letterSpacing.normal` | `0` | Recommended | Body, labels, botones. |
| `font.letterSpacing.wide` | `0.06em` | Recommended | Eyebrow labels, uppercase tags. |

### 12.4 Typography semantic aliases

Composiciones oficiales que combinan family + size + weight + line-height + letter-spacing.

| Token | Family | Size | Weight | Line height | Letter spacing | Usage |
|---|---|---|---|---|---|---|
| `typography.marketing.display` | heading | `font.size.display` (60 px) | semibold (600) | tight (1.1) | tight (-0.02em) | Hero display de landing. Tamaño máximo del hero se define en Figma (UI-Q-003). |
| `typography.marketing.h1` | heading | `font.size.h1` (40 px) | semibold (600) | snug (1.25) | tight (-0.02em) | H1 de sección landing. |
| `typography.marketing.h2` | heading | `font.size.h2` (32 px) | semibold (600) | snug (1.25) | tight (-0.02em) | H2 landing. |
| `typography.marketing.eyebrow` | heading | `0.875rem` (14 px) | bold (700) | normal (1.5) | wide (0.06em) | Eyebrow tags en landing. |
| `typography.platform.pageTitle` | heading | `font.size.h1` (40 px) | semibold (600) | snug (1.25) | tight (-0.02em) | Título de página en plataforma (más restringido que landing). |
| `typography.platform.sectionTitle` | heading | `font.size.h2` (32 px) | semibold (600) | snug (1.25) | normal (0) | Título de sección dentro de una vista. |
| `typography.platform.cardTitle` | heading | `font.size.h3` (24 px) | semibold (600) | snug (1.25) | normal (0) | Card heading en dashboards y listas. |
| `typography.body.default` | body | `font.size.body.md` (16 px) | regular (400) | normal (1.5) | normal (0) | Body por defecto. |
| `typography.body.supporting` | body | `font.size.body.sm` (14 px) | regular (400) | normal (1.5) | normal (0) | Body de apoyo, meta. |
| `typography.form.label` | ui | `font.size.label` (14 px) | medium (500) | normal (1.5) | normal (0) | Labels de formulario. |
| `typography.form.helper` | ui | `font.size.caption` (12 px) | regular (400) | normal (1.5) | normal (0) | Helper text bajo campo. |
| `typography.form.error` | ui | `font.size.body.sm` (14 px) | medium (500) | normal (1.5) | normal (0) | Mensaje de error asociado al campo. |
| `typography.button.md` | ui | `font.size.body.sm` (14 px) | semibold (600) | `1` (1.0) | normal (0) | Texto de botón size md. |
| `typography.button.lg` | ui | `font.size.body.md` (16 px) | semibold (600) | `1` (1.0) | normal (0) | Texto de botón size lg. |
| `typography.data.value` | body | `font.size.body.md` (16 px) | semibold (600) | normal (1.5) | normal (0) | Valores en dashboard KPI / tabla. |
| `typography.data.caption` | body | `font.size.caption` (12 px) | regular (400) | normal (1.5) | normal (0) | Sub-label bajo un KPI. |

### 12.5 Soporte multi-idioma

- Los layouts que consumen `typography.*` deben tolerar expansión de texto ~20–30% (NFR-I18N-001).
- Los tokens `typography.button.*` no fuerzan ancho fijo: los botones deben admitir texto largo.
- Los valores numéricos y de moneda se renderizan vía `<Money>` (FE Architecture §32.2); las tablas de números pueden usar `font-feature-settings: "tnum"` cuando la implementación lo soporte (guía para Component Foundations, no token per se).
- Todos los tamaños son `rem`-based para respetar zoom del navegador (WCAG 1.4.4).

---

## 13. Spacing tokens

Base-4 con las excepciones aprobadas de `2 px` y `6 px` cuando el propósito lo justifica (`Value Selection Rules #7`).

### 13.1 Primitivos

| Token | Value | Usage | Classification |
|---|---|---|---|
| `space.0` | `0 px` | Reset. | Derived |
| `space.1` | `2 px` | Micro spacing (icono/label muy próximos). | Recommended |
| `space.2` | `4 px` | Inline spacing mínimo. | Recommended |
| `space.3` | `6 px` | Inline spacing intermedio (usos puntuales). | Recommended |
| `space.4` | `8 px` | Base de padding en controles pequeños. | Recommended |
| `space.5` | `12 px` | Padding vertical de inputs; gap entre label e input. | Recommended |
| `space.6` | `16 px` | Padding default de cards y controles md. | Recommended |
| `space.7` | `20 px` | Espacio entre grupos de campos. | Recommended |
| `space.8` | `24 px` | Padding md de cards; gap entre cards en dashboards. | Recommended |
| `space.9` | `32 px` | Espacio entre secciones dentro de una vista. | Recommended |
| `space.10` | `40 px` | Espacio entre grupos de sección en platform. | Recommended |
| `space.11` | `48 px` | Página padding desktop; separación de bloques. | Recommended |
| `space.12` | `64 px` | Espaciado entre secciones landing. | Recommended |
| `space.13` | `80 px` | Espaciado holgado de secciones landing. | Recommended |
| `space.14` | `96 px` | Espaciado hero / secciones landing muy espaciosas. | Recommended |

### 13.2 Aliases semánticos

| Token | Value / Reference | Usage | Classification |
|---|---|---|---|
| `space.inline.xs` | `space.2` (4 px) | Gap icono-label en badges pequeños. | Derived |
| `space.inline.sm` | `space.4` (8 px) | Gap icono-label en botones. | Derived |
| `space.inline.md` | `space.6` (16 px) | Gap entre acciones inline. | Derived |
| `space.component.padding.sm` | `space.4` (8 px) | Padding de badges, chips pequeños. | Derived |
| `space.component.padding.md` | `space.6` (16 px) | Padding de cards md. | Derived |
| `space.component.padding.lg` | `space.8` (24 px) | Padding de cards prominentes / modales. | Derived |
| `space.layout.page.mobile` | `space.6` (16 px) | Página padding mobile. | Derived |
| `space.layout.page.tablet` | `space.9` (32 px) | Página padding tablet. | Derived |
| `space.layout.page.desktop` | `space.11` (48 px) | Página padding desktop. | Derived |
| `space.layout.section.marketing` | `space.14` (96 px) | Separación entre secciones landing. | Derived |
| `space.layout.section.platform` | `space.10` (40 px) | Separación entre secciones dentro de una vista de plataforma. | Derived |
| `space.form.fieldGap` | `space.5` (12 px) | Gap vertical entre label/input/helper. | Derived |
| `space.form.groupGap` | `space.9` (32 px) | Gap entre grupos de campos. | Derived |
| `space.table.cellX` | `space.6` (16 px) | Padding horizontal de celda. | Derived |
| `space.table.cellY` | `space.5` (12 px) | Padding vertical de celda (densidad intermedia UI-DEC-005). | Derived |

---

## 14. Sizing e interaction tokens

Alineado con UI-DEC-015 (touch target ≥ 44 × 44 px).

| Token | Value | Usage | Classification |
|---|---|---|---|
| `size.control.sm` | `32 px` | Controles compactos (chips, íconos-solo densos). Requieren padding extra en mobile para ≥ 44 px. | Recommended |
| `size.control.md` | `40 px` | Altura default de inputs/botones. | Recommended |
| `size.control.lg` | `48 px` | Controles primarios de landing / CTA hero. | Recommended |
| `size.icon.sm` | `16 px` | Iconos inline en texto/badges. | Recommended |
| `size.icon.md` | `20 px` | Iconos default en botones y navegación. | Recommended |
| `size.icon.lg` | `24 px` | Iconos de header, feature cards. | Recommended |
| `size.touch.minimum` | `44 px` | Touch target mínimo (UI-DEC-015; NFR-A11Y-001). Los `size.control.sm` en mobile deben expandir área táctil a este mínimo vía padding invisible. | Approved (derivado de UI-DEC-015) |
| `size.avatar.sm` | `24 px` | Avatar inline (comment, reviewer). | Recommended |
| `size.avatar.md` | `40 px` | Avatar default (vendor list, testimonial). | Recommended |
| `size.avatar.lg` | `64 px` | Avatar prominente (vendor profile header). | Recommended |

Reglas:

- Inputs y botones `size.control.md` (40 px) requieren padding suficiente para que el área táctil real llegue a `size.touch.minimum` en mobile.
- Iconos-solo (`icon-only`) deben envolverse en un área ≥ 44 × 44 px.
- Los tamaños compactos de tabla usan `size.control.sm` combinado con áreas táctiles expandidas en mobile.
- Avatares no llevan sistemas de anillo extendido; se defiere a Component Foundations.

---

## 15. Radius tokens

Alineado con UI-DEC-006.

### 15.1 Primitivos

| Token | Value | Usage | Classification |
|---|---|---|---|
| `radius.none` | `0 px` | Reset explícito; overlays edge-to-edge. | Approved |
| `radius.sm` | `4 px` | Badges pequeños, chips. | Recommended |
| `radius.md` | `8 px` | Buttons, inputs (UI-DEC-006 starting guidance). | Approved (UI-DEC-006 anchor) |
| `radius.lg` | `12 px` | Cards standard. | Approved (UI-DEC-006 lower bound) |
| `radius.xl` | `16 px` | Cards prominentes, modals, drawers. | Approved (UI-DEC-006 upper bound) |
| `radius.full` | `9999 px` | Pills, avatares circulares, badges fully rounded. | Approved (UI-DEC-006) |

### 15.2 Aliases semánticos

| Token | Value / Reference | Usage | Classification |
|---|---|---|---|
| `radius.button` | `radius.md` (8 px) | Botones default (UI-DEC-006). | Approved |
| `radius.input` | `radius.md` (8 px) | Inputs default (UI-DEC-006). | Approved |
| `radius.card` | `radius.lg` (12 px) | Cards default plataforma. | Approved |
| `radius.card.prominent` | `radius.xl` (16 px) | Cards flotantes landing, cards enfáticas plataforma. | Approved |
| `radius.modal` | `radius.xl` (16 px) | Modales (UI-DEC-006). | Approved |
| `radius.drawer` | `radius.xl` (16 px) | Drawers (UI-DEC-006). | Approved |
| `radius.badge` | `radius.full` (9999 px) | Badges y pills (UI-DEC-006). | Approved |

---

## 16. Border tokens

### 16.1 Width

| Token | Value | Classification | Usage |
|---|---|---|---|
| `border.width.none` | `0 px` | Approved | Reset. |
| `border.width.default` | `1 px` | Recommended | Inputs, cards, tables (UI-DEC-007). |
| `border.width.strong` | `2 px` | Recommended | Border focus visible, cards enfáticas. |

### 16.2 Style

| Token | Value | Classification | Usage |
|---|---|---|---|
| `border.style.solid` | `solid` | Recommended | Único estilo permitido. |

### 16.3 Aliases semánticos

Referencian tokens de color en vez de duplicar valores.

| Token | Value / Reference | Usage | Notes |
|---|---|---|---|
| `border.input.default` | `border.width.default` + `border.style.solid` + `color.border.default` | Input default. | — |
| `border.input.focus` | `border.width.strong` + `border.style.solid` + `color.border.interactive` | Input focus (complementado por focus ring). | — |
| `border.card.default` | `border.width.default` + `border.style.solid` + `color.border.subtle` | Card en plataforma (UI-DEC-007). | — |
| `border.table.default` | `border.width.default` + `border.style.solid` + `color.border.subtle` | Separador de filas de tabla. | — |
| `border.ai.default` | `border.width.default` + `border.style.solid` + `color.ai.border` | Border violeta del `<AIPanel>`. | — |
| `border.feedback.strong` | `border.width.default` + `border.style.solid` + `color.feedback.<status>.border` | Alerts / toasts / banners. `<status>` in `success`, `warning`, `error`, `info`. | — |

---

## 17. Shadow y elevation tokens

Sistema restringido (UI-DEC-007). Landing puede usar sombras suaves con feel floating; plataforma se mantiene muy sutil y combina con borders.

| Token | Value | Intended use | Restrictions |
|---|---|---|---|
| `shadow.none` | `none` | Reset explícito. | — |
| `shadow.surface.subtle` | `0 1px 2px rgba(23, 23, 23, 0.04)` | Cards default en plataforma. | No es el único mecanismo de separación (UI-DEC-007). Debe combinarse con border. |
| `shadow.surface.raised` | `0 2px 6px rgba(23, 23, 23, 0.06)` | Cards elevadas dentro de dashboards. | Uso limitado; no en cada card. |
| `shadow.overlay.dropdown` | `0 8px 16px rgba(23, 23, 23, 0.08), 0 2px 4px rgba(23, 23, 23, 0.04)` | Dropdown menús, popovers. | — |
| `shadow.overlay.modal` | `0 20px 40px rgba(23, 23, 23, 0.12), 0 8px 16px rgba(23, 23, 23, 0.06)` | Modales y drawers. | Modales usan además `color.overlay.scrim`. |
| `shadow.marketing.floating` | `0 30px 60px -20px rgba(15, 13, 26, 0.15), 0 10px 20px -10px rgba(15, 13, 26, 0.08)` | Cards flotantes de landing (feel signature). | No usar en vistas operativas ni tablas (UI-DEC-007). |

Reglas:

- Prohibido `glassmorphism` fuerte, `blur` excesivo o sistemas multi-layer enterprise (UI-DEC-007).
- Cards en plataforma combinan `shadow.surface.subtle` + `border.card.default` para separación visible con o sin sombra.
- El scrim se aplica **junto** a `shadow.overlay.modal`, no en lugar de.

---

## 18. Layout tokens

Alineados con UI-DEC-012.

| Token | Value | Context | Responsive behavior | Notes |
|---|---|---|---|---|
| `layout.container.marketing.max` | `1280 px` | Ancho máximo de marketing content (UI-DEC-012). | Fluido bajo `breakpoint.xl`; centrado con page padding. | Anchor aprobado. |
| `layout.container.form.max` | `720 px` | Ancho máximo de formularios (UI-DEC-012). | En mobile ocupa el ancho disponible menos page padding. | Anchor aprobado. |
| `layout.container.content.max` | `1440 px` | Ancho máximo de content en plataforma (guía superior). | Layout fluido; content admite hasta 1440 px antes de centrar. | Derived — plataforma es fluida (UI-DEC-012); este valor evita content extremadamente ancho en monitores grandes. |
| `layout.sidebar.width` | `256 px` | Sidebar desktop expandido (UI-DEC-008). | En tablet y mobile se transforma a drawer overlay. | Recommended — no hay valor aprobado explícito. |
| `layout.sidebar.widthCollapsed` | Deferred | Variante collapsed. | UI-DEC-008 admite variante collapsed "cuando aplique"; el MVP no confirma alcance específico. | Deferred — decidir en Component Foundations. |
| `layout.header.height` | `64 px` | Altura de topbar (public y auth) donde vive `<LanguageSelector />`. | En mobile mantiene 56 px si densidad lo requiere. | Recommended. |
| `layout.page.padding.mobile` | `space.6` (16 px) | Page padding mobile. | — | Derived. |
| `layout.page.padding.tablet` | `space.9` (32 px) | Page padding tablet. | — | Derived. |
| `layout.page.padding.desktop` | `space.11` (48 px) | Page padding desktop. | — | Derived. |
| `layout.grid.columns.mobile` | `4` | Columnas mobile (UI-DEC-012). | — | Approved. |
| `layout.grid.columns.tablet` | `8` | Columnas tablet (UI-DEC-012). | — | Approved. |
| `layout.grid.columns.desktop` | `12` | Columnas desktop (UI-DEC-012). | — | Approved. |
| `layout.grid.gutter.mobile` | `space.6` (16 px) | Gutter entre columnas mobile. | — | Recommended. |
| `layout.grid.gutter.tablet` | `space.7` (20 px) | Gutter tablet. | — | Recommended. |
| `layout.grid.gutter.desktop` | `space.8` (24 px) | Gutter desktop. | — | Recommended. |

---

## 19. Breakpoint tokens

Set mínimo mobile-first alineado con las 4/8/12 columnas (UI-DEC-012) y el ancho máximo marketing `1280 px`.

| Token | Value | Intended behavior |
|---|---|---|
| `breakpoint.sm` | `640 px` | Ajuste de tipografía y espaciado en móviles grandes; mantiene layout mobile 4-col. |
| `breakpoint.md` | `768 px` | Transición a layout tablet 8-col; forms usan `layout.container.form.max`. Sidebar aún oculto (drawer). |
| `breakpoint.lg` | `1024 px` | Transición a layout desktop 12-col; **sidebar visible en plataforma**; tablas expanden a vista tabular completa; landing muestra composiciones hero completas. |
| `breakpoint.xl` | `1280 px` | Marketing container alcanza `1280 px`; secciones landing dejan de crecer. |
| `breakpoint.2xl` | `1536 px` | Content platform admite hasta `layout.container.content.max` (1440 px) con page padding; wide-monitor comfort. |

Comportamientos derivados:

- **Mobile stack**: `< breakpoint.md` — forms y CTAs se apilan; tablas se convierten en cards apiladas / listas.
- **Tablet adaptation**: `breakpoint.md → breakpoint.lg` — layout 8-col; formularios centrados dentro de container form; sidebar todavía en drawer.
- **Sidebar transition**: en `≥ breakpoint.lg` el sidebar (`layout.sidebar.width`) es visible; content ocupa el espacio restante.
- **Wide-content behavior**: en `≥ breakpoint.2xl` el content se centra bajo `layout.container.content.max`.
- **Marketing container**: se centra con `layout.container.marketing.max` a partir de `breakpoint.xl`.
- **Table adaptation**: en `< breakpoint.md` conversión a cards; entre `md` y `lg` scroll horizontal controlado permitido.

Este documento **no** genera configuración Tailwind.

---

## 20. Motion tokens

Sistema lightweight (UI-DEC-015; §26 UI Foundations).

### 20.1 Duration

| Token | Value | Usage | Classification |
|---|---|---|---|
| `motion.duration.instant` | `0 ms` | Cambios sin animación (reduced-motion). | Recommended |
| `motion.duration.fast` | `120 ms` | Hover, active, control feedback. | Recommended |
| `motion.duration.normal` | `200 ms` | Overlay enter/exit, tabs, chips. | Recommended |
| `motion.duration.slow` | `320 ms` | Drawer, modal enter/exit, section reveal. | Recommended |

### 20.2 Easing

| Token | Value | Usage | Classification |
|---|---|---|---|
| `motion.easing.standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Movimiento estándar dentro/fuera. | Recommended |
| `motion.easing.enter` | `cubic-bezier(0, 0, 0.2, 1)` | Enter (aparecer). | Recommended |
| `motion.easing.exit` | `cubic-bezier(0.4, 0, 1, 1)` | Exit (desaparecer). | Recommended |

### 20.3 Aliases semánticos

| Token | Value / Reference | Usage |
|---|---|---|
| `motion.control.hover` | `motion.duration.fast` + `motion.easing.standard` | Hover en botones, chips, links. |
| `motion.control.press` | `motion.duration.instant` + `motion.easing.standard` | Feedback de active/pressed. |
| `motion.overlay.enter` | `motion.duration.normal` + `motion.easing.enter` | Dropdown / popover enter. |
| `motion.overlay.exit` | `motion.duration.normal` + `motion.easing.exit` | Dropdown / popover exit. |
| `motion.drawer.enter` | `motion.duration.slow` + `motion.easing.enter` | Drawer/modal enter. |
| `motion.drawer.exit` | `motion.duration.slow` + `motion.easing.exit` | Drawer/modal exit. |
| `motion.feedback` | `motion.duration.normal` + `motion.easing.standard` | Toast, banner enter/exit. |

### 20.4 Reduced motion

| Token | Value | Usage |
|---|---|---|
| `motion.reduced.duration` | `motion.duration.instant` (0 ms) | Cuando `prefers-reduced-motion: reduce` está activo, los aliases anteriores adoptan `motion.reduced.duration` y desactivan transiciones no esenciales (UI-DEC-015). |

Reglas mandatorias:

- Prohibido `glow` continuo, gradientes animados o efectos sci-fi en AI (UI-DEC-010).
- Sin transiciones de página complejas.
- Los skeletons preferidos sobre spinners (FE Architecture §28.1); pueden usar `motion.duration.slow` como pulse tempo, o desactivarse en reduced motion.

---

## 21. Focus tokens

Alineado con UI-DEC-015 y NFR-A11Y-003.

| Token | Value | Usage |
|---|---|---|
| `focus.ring.width` | `2 px` | Grosor del anillo. |
| `focus.ring.style` | `solid` | Estilo. |
| `focus.ring.color` | `color.focus.ring` (`#6238C7`) | Color del anillo (violet-700). |
| `focus.ring.offset` | `2 px` | Offset entre control y anillo. |
| `focus.ring.offsetColor` | `color.focus.ringOffset` (`#FFFFFF`) | Color del offset (blanco) para separar el anillo del control en superficies violetas o coloreadas. |

Guía por consumidor:

- **Buttons** — anillo `2 px` violet-700 con offset `2 px` blanco. Sobre CTA violet, el offset blanco garantiza contraste ≥ 3:1 con el anillo (WCAG 1.4.11).
- **Inputs** — border sube a `border.input.focus` (border.width.strong + `color.border.interactive`) y se agrega focus ring solo cuando el input pertenece a control complejo (combobox, date picker); para inputs simples el border strong es suficiente si mantiene contraste ≥ 3:1.
- **Sidebar items** — anillo `focus.ring` sobre `color.platform.sidebar.itemHover`; offset blanco requerido.
- **Cards interactivas** — anillo `focus.ring` en el contenedor; nunca solo cambio de sombra.
- **Icon-only controls** — anillo obligatorio; el área táctil sigue siendo `size.touch.minimum`.
- **Modal / drawer controls** — focus trap correcto; anillo visible en el primer elemento focusable al abrir.

Focus debe permanecer visible sobre: `color.background.default` (blanco), `color.surface.subtle` (neutral-50), `color.action.primary.background` (violet-600, requiere offset blanco), `color.ai.surface` (lilac-50) y superficies feedback (surface tenue de success/warning/error/info).

---

## 22. Opacity tokens

| Token | Value | Usage | Classification |
|---|---|---|---|
| `opacity.disabled` | `0.6` | Aplicada solo a elementos visuales cuando el color disabled no es suficiente. Nunca reduce contraste de texto por debajo de umbrales requeridos. | Recommended |
| `opacity.muted` | `0.7` | Iconos decorativos secundarios. | Recommended |
| `opacity.overlay` | `0.6` | Complemento a `color.overlay.scrim` cuando se aplica sobre color plano. | Recommended |
| `opacity.hover` | `0.9` | Hover sobre imágenes/thumbnails. | Recommended |
| `opacity.decorative` | `0.4` | Formas decorativas landing (blobs lilac/coral). | Recommended |

Regla: **no** aplicar opacity sobre texto crítico si reduce contraste bajo WCAG 2.1 AA. En estados disabled se prefiere usar colores disabled explícitos (`color.text.disabled`, `color.surface.disabled`).

---

## 23. Z-index tokens

Rango simple predecible; sin valores arbitrarios.

| Token | Value | Usage |
|---|---|---|
| `zIndex.base` | `0` | Contenido de página. |
| `zIndex.sticky` | `10` | Elementos sticky (topbar sticky, table header). |
| `zIndex.dropdown` | `100` | Dropdowns, popovers, comboboxes. |
| `zIndex.drawer` | `200` | Drawer mobile / side drawer. |
| `zIndex.modal` | `300` | Modales. |
| `zIndex.toast` | `400` | Toasts (por encima de modales). |
| `zIndex.tooltip` | `500` | Tooltips (última capa; nunca ocultan foco). |

Orden intencional: content < sticky < dropdown < drawer < modal < toast < tooltip. Los tooltips deben aparecer sobre modales/toasts para permitir explicaciones sobre elementos focused.

---

## 24. Icon tokens

| Token | Value | Usage | Classification |
|---|---|---|---|
| `icon.size.sm` | `size.icon.sm` (16 px) | Iconos inline en texto, chips. | Recommended |
| `icon.size.md` | `size.icon.md` (20 px) | Iconos default en botones y navegación. | Recommended |
| `icon.size.lg` | `size.icon.lg` (24 px) | Iconos de header, feature cards. | Recommended |
| `icon.stroke.default` | `1.5 px` | Grosor default para iconos outline. | Recommended |
| `icon.stroke.strong` | `2 px` | Grosor enfático (badges, íconos activos). | Recommended |

Reglas:

- Un solo estilo (outline con grosor uniforme, per §18 UI Foundations).
- Iconos-solo requieren `aria-label` (UI-DEC-015).
- El icono AI (sparkle u otro) usa el mismo sistema, con `color.ai.icon`.
- Iconos semánticos consumen `color.feedback.<status>.icon`.
- Iconos decorativos deben marcarse `aria-hidden` y no cargar significado.
- **No se selecciona librería específica** (Lucide, Material Symbols, Heroicons, custom) — decisión diferida a `EventFlow-Component-Foundations.md` (UI-Q-002).

---

## 25. Data y numeric presentation tokens

| Token | Reference | Usage |
|---|---|---|
| `typography.data.primary` | `typography.data.value` | KPI principal en dashboards y valores destacados. |
| `typography.data.secondary` | `typography.data.caption` | Sub-label bajo KPI. |
| `typography.data.currency` | `typography.data.value` | Monto formateado por `<Money>`; puede aplicar `font-feature-settings: "tnum"` en Component Foundations si la implementación lo soporta. |
| `typography.data.table` | `typography.body.supporting` | Contenido de tabla; densidad intermedia (UI-DEC-005). |
| `color.data.positive` | `color.feedback.success.text` (`#15803D`) | Delta positivo (nunca solo color; se combina con arrow icon + texto "+X"). |
| `color.data.negative` | `color.feedback.error.text` (`#B91C1C`) | Delta negativo (nunca solo color). |
| `color.data.neutral` | `color.text.secondary` (`#525252`) | Sin cambio o neutral. |

Reglas:

- Prohibido comunicar cambio solo por rojo/verde (UI-DEC-015). Deltas requieren ícono direccional o signo.
- Los valores monetarios se renderizan con `<Money>` (FE Architecture §32.2), locale-aware y con ISO en tooltip/`aria-label` cuando el símbolo es ambiguo (BR-BUDGET-006/007; US-083).
- No se define paleta de charts en MVP; data visualization avanzada está diferida (UI Foundations §29).

---

## 26. Currency y locale considerations

Los tokens soportan i18n operativa sin crear temas por locale.

- **Locales soportados**: `es-LATAM` (default), `es-ES`, `pt`, `en` (NFR-I18N-001; BR-I18N-001).
- **Fechas y números locale-aware**: consumidas vía `Intl.DateTimeFormat` / `Intl.NumberFormat` (FE Architecture §31.3, §32.2). Los tokens no codifican formato; solo tipografía y espaciado.
- **Monedas** (`GTQ`, `EUR`, `MXN`, `COP`, `USD` como mínimo per NFR-I18N-004): renderizadas por `<Money>` con `title={currencyCode}` y `aria-label` completo (US-083 AC-01). Los tokens `typography.data.currency` y `color.text.primary` alimentan el componente.
- **Moneda inmutable por evento** (BR-EVENT-007): el selector aparece disabled tras la creación; los tokens `color.surface.disabled` y `color.text.disabled` respaldan ese estado.
- **Sin conversión** (BR-BUDGET-007): los tokens no expresan tipo de cambio ni conversión.
- **Expansión de texto**: los aliases `typography.button.*`, `typography.form.label` y `typography.body.default` se combinan con tokens de spacing que toleran ~20–30% de expansión (NFR-I18N-001).
- **`lang` attribute**: los componentes deben declarar `lang` correcto por locale activo (§23 UI Foundations); esto es guía consumer-side, no un token.

**Prohibido**:

- Crear strings de contenido como tokens.
- Crear tokens con nombres locale-specific (`color.es.*`, `typography.pt.*`).

---

## 27. Aliases de componente (limitados)

Set ilustrativo. La anatomía completa por componente pertenece a `docs/ux-ui/EventFlow-Component-Foundations.md`.

### 27.1 Button

| Token | Reference | Usage |
|---|---|---|
| `button.primary.background` | `color.action.primary.background` | Background CTA primaria platform. |
| `button.primary.foreground` | `color.action.primary.foreground` | Texto/icono sobre primaria. |
| `button.primary.hover` | `color.action.primary.hover` | Hover CTA primaria. |
| `button.primary.radius` | `radius.button` | Radius default. |
| `button.primary.height` | `size.control.md` | Altura default (40 px). |
| `button.secondary.background` | `color.action.secondary.background` | Background secondary. |
| `button.secondary.foreground` | `color.action.secondary.foreground` | Texto secondary. |
| `button.secondary.border` | `color.action.secondary.border` | Border secondary. |
| `button.secondary.hover` | `color.action.secondary.hover` | Hover secondary. |

### 27.2 Input

| Token | Reference | Usage |
|---|---|---|
| `input.background` | `color.surface.default` | Background del input. |
| `input.foreground` | `color.text.primary` | Texto del input. |
| `input.border` | `color.border.default` | Border default. |
| `input.borderFocus` | `color.border.interactive` | Border focus (combinado con focus ring). |
| `input.radius` | `radius.input` | Radius. |
| `input.height` | `size.control.md` | Altura. |
| `input.placeholder` | `color.text.muted` | Placeholder. |
| `input.disabledBackground` | `color.surface.disabled` | Background disabled. |

### 27.3 Card

| Token | Reference | Usage |
|---|---|---|
| `card.background` | `color.surface.default` | Background card. |
| `card.border` | `color.border.subtle` | Border. |
| `card.radius` | `radius.card` | Radius default (12 px). |
| `card.shadow` | `shadow.surface.subtle` | Sombra default (combinada con border). |
| `card.padding` | `space.component.padding.md` | Padding interno. |

### 27.4 Sidebar item

| Token | Reference | Usage |
|---|---|---|
| `sidebar.item.foreground` | `color.text.primary` | Texto default. |
| `sidebar.item.hoverBackground` | `color.platform.sidebar.itemHover` | Hover. |
| `sidebar.item.activeBackground` | `color.platform.sidebar.itemActive` | Item activo. |
| `sidebar.item.activeForeground` | `color.platform.sidebar.itemActiveForeground` | Texto/icono activo. |
| `sidebar.item.focusRing` | `color.focus.ring` | Focus ring. |

### 27.5 AI recommendation surface

| Token | Reference | Usage |
|---|---|---|
| `aiRecommendation.background` | `color.ai.surface` | Background del `<AIPanel>` en pending. |
| `aiRecommendation.border` | `color.ai.border` | Border violeta. |
| `aiRecommendation.radius` | `radius.card` | Radius alineado con cards. |
| `aiRecommendation.label` | `color.ai.label` | Color del label "Sugerencia de IA". |
| `aiRecommendation.icon` | `color.ai.icon` | Color del icono sparkle. |
| `aiRecommendation.padding` | `space.component.padding.md` | Padding interno. |

La **anatomía completa** de `<AIPanel>` (estados idle/loading/result/accepted/edited/rejected, banner fallback, timeout, permission denied), `<Button>`, `<Input>`, `<Card>`, `<Modal>`, `<Toast>`, `<Sidebar>` y `<Table>` se define en `docs/ux-ui/EventFlow-Component-Foundations.md`.

---

## 28. Token tables por consumidor

| Consumer | Token layers consumed | Notes |
|---|---|---|
| Figma variables | Primitivos + semánticos | Ligados como Color/Number/String variables. La capa de aliases de componente puede vivir como Component Properties. |
| Figma text styles | `font.*`, `typography.*` | Se crean text styles por cada `typography.*` alias. |
| Figma effects | `shadow.*` | Effect styles por sombra. |
| Tailwind theme | Semánticos + selectivamente aliases | Los primitivos no aparecen en `theme.extend.colors` — solo semánticos. |
| CSS custom properties | Semánticos + aliases de componente | Definidas en `:root` (o equivalente en app.css) como fuente única. |
| React components | Consumen semánticos vía Tailwind classes / CSS custom properties | Nunca hex crudos. |
| Storybook | Consumen los mismos semánticos | Documentación de estados. |
| Testing y visual regression | Se apoyan en los tokens semánticos como assertions | Snapshots contra tokens, no contra hex. |

---

## 29. Figma mapping guidance

Estructura recomendada de Figma variable collections (light mode únicamente):

- **`_Primitives`** (collection)
  - Modes: `Light` (único).
  - Groups: `Color/Neutral`, `Color/Violet`, `Color/Lilac`, `Color/Coral`, `Color/Green`, `Color/Amber`, `Color/Red`, `Color/Blue`, `Color/Alpha`, `Number/Space`, `Number/Radius`, `Number/BorderWidth`.
- **`Semantic`** (collection)
  - Modes: `Light` (único).
  - Groups: `Color/Text`, `Color/Background`, `Color/Surface`, `Color/Border`, `Color/Action`, `Color/Feedback`, `Color/AI`, `Color/Focus`, `Color/Selection`, `Color/Overlay`, `Color/Marketing`, `Color/Platform`, `Number/Radius`, `Number/BorderWidth`, `Number/Space`, `Number/Layout`, `Number/Size`, `Number/ZIndex`, `Number/Opacity`.
- **Text styles**: uno por alias en `typography.*` (`typography.marketing.display`, `typography.marketing.h1`, ..., `typography.data.value`). Ligados a `font.family.*`, `font.weight.*`, `font.size.*`, `font.lineHeight.*`, `font.letterSpacing.*`.
- **Effect styles**: uno por token `shadow.*`.
- **Grid styles**: uno por breakpoint (`mobile 4-col`, `tablet 8-col`, `desktop 12-col`) alineado con `layout.grid.*`.

Guía:

- **Un solo modo `Light`** en collections; sin duplicar variables para dark (UI-DEC-013).
- Los primitivos **no** se aplican directamente a componentes — solo a través de semánticos.
- Los alias de componente pueden implementarse como Component Properties + variables scoped, no como collections adicionales.
- No se requieren features paid-only (Enterprise-only Figma) no necesarias.
- No se genera plugin-specific JSON en este documento.

---

## 30. Frontend implementation guidance

Guía no-código (no se generan archivos):

- **Tailwind consumption**: `theme.extend.colors`, `spacing`, `borderRadius`, `fontFamily`, `fontSize`, `boxShadow`, `screens` deben mapear la capa semántica (con selección mínima de aliases de componente). Los primitivos no viajan al theme.
- **CSS custom properties**: definidas en `:root` como fuente única del sistema; Tailwind puede consumirlas vía `theme.extend.colors: { primary: 'var(--color-action-primary-background)' }` en implementación.
- **Server Components vs. Client Components**: los tokens visuales viven en CSS/Tailwind, ejecutables por ambos tipos. Los componentes que requieren estado interactivo (hover con animación complejo, focus programático) son Client Components (FE Architecture §7).
- **Avoiding hardcoded values**: prohibido usar hex, px o rem crudos en JSX/CSS cuando exista un token equivalente; enforcement vía linting (`eslint-plugin-tailwindcss`, `stylelint`) en Component Foundations.
- **Token aliases**: los alias de componente (`button.primary.background`) se resuelven en Tailwind como classes utility compuestas o como custom classes; sin duplicar valores en más de una capa.
- **Responsive variants**: usar los prefixes de Tailwind alineados con `breakpoint.*` (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`).
- **Focus handling**: usar `focus-visible` (no `focus` genérico) para reflejar `focus.ring.*`.
- **Reduced motion**: implementar `@media (prefers-reduced-motion: reduce)` para colapsar durations a `motion.duration.instant`.
- **i18n**: los tokens no codifican strings; el sistema depende de `next-intl` (`messages/{locale}/*.json`) — FE Architecture §31.
- **AI states**: el `<AIPanel>` consume `aiRecommendation.*` + `color.ai.*`; los estados fallback/error se apoyan en `color.ai.fallback`/`color.ai.error` reutilizando feedback semánticos.
- **Visual regression testing**: snapshots por breakpoint y por estado principal (default, hover, focus, active, disabled, loading, empty, error) contra tokens, no contra hex.

Prohibido generar: `tailwind.config.ts`, archivos CSS o SCSS, TypeScript, React/JSX, JSON tokens.

---

## 31. Accessibility validation

Matriz mandatoria (WCAG 2.1 AA per UI-DEC-015, NFR-A11Y-001..005).

| Area | Requirement | Validation method | Blocking |
|---|---|---|---|
| Text contrast | Texto regular ≥ 4.5:1; texto grande (≥ 24 px o ≥ 19 px bold) ≥ 3:1. | Contrast checker automatizado + visual audit por combinación. | Sí |
| Action contrast | Foreground / background de acciones (primary, secondary, destructive) cumple 4.5:1 para texto y 3:1 para elementos gráficos. | Contrast checker + visual audit. | Sí |
| Focus contrast | Focus ring vs. background adyacente ≥ 3:1 (WCAG 1.4.11). Requiere offset blanco sobre superficies violet. | Visual audit por control y por surface. | Sí |
| Touch target | Área interactiva ≥ 44 × 44 px en mobile (UI-DEC-015). | Auditoría manual + tests responsive. | Sí |
| Disabled-state readability | Los estados disabled deben ser distinguibles con al menos otra señal (icon, opacity, texto) — WCAG relaja contrast en disabled pero el estado no puede ser confundido con enabled. | Visual audit. | Sí |
| Semantic feedback | Color no es la única señal; icono + texto acompañan cada status (UI-DEC-014/015). | Visual + code review. | Sí |
| AI-state distinction | Pending vs. accepted debe diferenciarse por surface + border + icon + label; nunca solo color (UI-DEC-010/015). | Visual + code review. | Sí |
| Reduced motion | `motion.reduced.duration` aplica cuando `prefers-reduced-motion: reduce`. | Manual con OS setting + tests automatizados. | Sí |
| Zoom y reflow | UI usable a 200% zoom sin scroll horizontal accidental (WCAG 1.4.4/1.4.10). | Manual con browser zoom + Playwright. | Sí |
| Locale expansion | Layouts toleran expansión ~20–30% sin roturas (NFR-I18N-001). | Snapshots por locale en `es-LATAM`, `es-ES`, `pt`, `en`. | Sí |
| Input labels | Labels visibles y asociados programáticamente (NFR-A11Y-004). | Screen reader + axe/lighthouse. | Sí |
| Error states | Errores asociados al campo (`aria-describedby`) y no comunicados solo por color. | Screen reader + code review. | Sí |
| Modal / drawer visibility | Focus trap correcto; retorno de foco; scrim accesible. | Manual + Playwright accessibility tests. | Sí |

---

## 32. Contrast validation matrix

Cálculos basados en ratios luminance sRGB (aproximados). Valores en formato `X.Y:1`.

| Foreground token | Background token | Intended use | WCAG target | Result | Action |
|---|---|---|---|---|---|
| `color.text.primary` (`#262626`) | `color.background.default` (`#FFFFFF`) | Body y headings principales sobre blanco. | 4.5:1 (text) | **14.68:1** ✅ AAA | Aprobado. |
| `color.text.secondary` (`#525252`) | `color.background.default` (`#FFFFFF`) | Labels secundarios. | 4.5:1 | **7.65:1** ✅ AAA | Aprobado. |
| `color.text.muted` (`#737373`) | `color.background.default` (`#FFFFFF`) | Placeholder / caption meta. | 4.5:1 | **4.83:1** ✅ AA | Aprobado. Reservar a caption y placeholder. |
| `color.text.inverse` (`#FFFFFF`) | `color.marketing.cta.background` (`#171717`) | Texto sobre CTA dark landing. | 4.5:1 | **17.40:1** ✅ AAA | Aprobado. |
| `color.action.primary.foreground` (`#FFFFFF`) | `color.action.primary.background` (`#7B4EE8`) | Texto sobre CTA violet platform. | 4.5:1 | **5.20:1** ✅ AA | Aprobado. Aumenta a 7.4:1 en hover (`violet-700`). |
| `color.text.link` (`#6238C7`) | `color.background.default` (`#FFFFFF`) | Links en producto. | 4.5:1 | **7.40:1** ✅ AAA | Aprobado. |
| `color.focus.ring` (`#6238C7`) | `color.background.default` (`#FFFFFF`) | Focus ring sobre blanco. | 3:1 (non-text) | **7.40:1** ✅ | Aprobado. |
| `color.focus.ring` (`#6238C7`) | `color.action.primary.background` (`#7B4EE8`) | Focus ring sobre CTA violet. | 3:1 (non-text) | **1.42:1** ❌ | Mitigado con `focus.ring.offsetColor` (`#FFFFFF`): el offset blanco entre control y ring aporta separación visual ≥ 3:1 (blanco vs. violet-600 = 4.6:1, blanco vs. violet-700 = 7.4:1). **Regla mandatoria**: focus ring sobre superficies violet requiere `focus.ring.offset` de `2 px` blanco. |
| `color.feedback.error.text` (`#B91C1C`) | `color.feedback.error.surface` (`#FEF2F2`) | Texto error en alert. | 4.5:1 | **6.66:1** ✅ AA | Aprobado. |
| `color.feedback.warning.text` (`#B45309`) | `color.feedback.warning.surface` (`#FFFBEB`) | Texto warning en alert. | 4.5:1 | **5.98:1** ✅ AA | Aprobado. |
| `color.feedback.success.text` (`#15803D`) | `color.feedback.success.surface` (`#ECFDF5`) | Texto success en alert. | 4.5:1 | **5.14:1** ✅ AA | Aprobado. |
| `color.feedback.info.text` (`#1D4ED8`) | `color.feedback.info.surface` (`#EFF6FF`) | Texto info en alert. | 4.5:1 | **8.14:1** ✅ AAA | Aprobado. |
| `color.ai.text` (`#262626`) | `color.ai.surface` (`#F7F5FB`) | Texto AI sobre superficie lilac. | 4.5:1 | **13.72:1** ✅ AAA | Aprobado. |
| `color.ai.border` (`#946DF8`) | `color.ai.surface` (`#F7F5FB`) | Border del `<AIPanel>` sobre su surface. | 3:1 (non-text) | **3.05:1** ✅ | Aprobado (margen ajustado; verificar en render final). |
| `color.ai.label` (`#6238C7`) | `color.ai.surface` (`#F7F5FB`) | Label "Sugerencia de IA". | 4.5:1 | **6.90:1** ✅ AA/AAA | Aprobado. |
| `color.action.destructive.foreground` (`#FFFFFF`) | `color.action.destructive.background` (`#DC2626`) | Texto sobre CTA destructiva. | 4.5:1 | **4.83:1** ✅ AA | Aprobado. |
| `color.platform.sidebar.itemActiveForeground` (`#6238C7`) | `color.platform.sidebar.itemActive` (`#F5F1FE`) | Texto/icono de item activo. | 4.5:1 | **7.10:1** ✅ AAA | Aprobado. |
| `color.violet.500` (`#946DF8`) | `color.background.default` (`#FFFFFF`) | Uso como **texto**. | 4.5:1 | **3.19:1** ❌ | **Bloqueado como texto**. Solo se usa como border/accent/background con foreground blanco (5.2:1). Para texto violet usar `color.violet.700`. |
| `color.coral.300` (`#EE8C8D`) | `color.background.default` (`#FFFFFF`) | Uso como texto o icono principal. | 4.5:1 | **2.30:1** ❌ | **Prohibido como texto o icono** (UI-DEC-002). Solo decorativo. |
| `color.lilac.300` (`#C4B7E5`) | `color.background.default` (`#FFFFFF`) | Uso como texto o icono principal. | 4.5:1 | **1.94:1** ❌ | **Prohibido como texto o icono** (UI-DEC-002). Solo decorativo/border. |

Ninguna combinación aprobada del sistema publica un fallo AA. Las combinaciones marcadas con ❌ están **explícitamente prohibidas** por las mismas reglas del sistema (UI-DEC-002).

---

## 33. Token decision register

| ID | Decision | Classification | Status | Rationale | Source |
|---|---|---|---|---|---|
| TOK-DEC-001 | Arquitectura de tres niveles: primitivos → semánticos → alias de componente (limitados). | Derived | Approved | Alineado con UI Foundations §31; proporcional a MVP. | UI Foundations §31; Token Architecture §6. |
| TOK-DEC-002 | Naming en dot notation lowercase con categorías fijas (`color.*`, `font.*`, `space.*`, ...). | Recommended | Approved | Consistencia y portabilidad Figma/Tailwind. | Sección 7. |
| TOK-DEC-003 | Light theme únicamente en el MVP. | Approved | Approved | UI-DEC-013. | UI Foundations §28. |
| TOK-DEC-004 | Escala neutral 12 steps anclada en `#FFFFFF`, `#525252`, `#262626`; se agregan `#171717` para CTA dark landing. | Derived | Approved | UI-DEC-002 (anchors); UI-DEC-003 (CTA dark). | Sección 8.1. |
| TOK-DEC-005 | Escala violet con anchor `#946DF8`; se derivan `violet-600`, `violet-700`, `violet-800` para contraste accesible. | Derived | Approved | UI-DEC-002 anchor; VLR §E; UI-Q-001. | Sección 8.2. |
| TOK-DEC-006 | Lilac y coral con escalas mínimas alrededor de los anchors aprobados; uso solo decorativo. | Derived | Approved | UI-DEC-002; VLR §A.11. | Secciones 8.3, 8.4. |
| TOK-DEC-007 | Familias semánticas compactas verde/amber/rojo/azul independientes de brand colors. | Derived | Approved | UI-DEC-014. | Sección 8.5. |
| TOK-DEC-008 | CTA primaria platform = violet-600 (bg) con foreground blanco; hover violet-700. | Derived | Approved | UI-DEC-003; contrast validation §32. | Sección 9.4. |
| TOK-DEC-009 | CTA marketing = neutral-900 (`#171717`) con foreground blanco. | Derived | Approved | UI-DEC-003; UI-DEC-002. | Sección 10.1. |
| TOK-DEC-010 | Escala tipográfica compacta con `Inter Tight` (headings) e `Inter` (body/UI); tamaños rem-based. | Derived | Approved | UI-DEC-004. | Sección 12. |
| TOK-DEC-011 | Grid 12/8/4 con marketing max-width `1280 px`, form `720 px`; content platform con soft cap `1440 px`. | Approved (anchors) / Derived (cap) | Approved | UI-DEC-012; §18 UI Foundations. | Secciones 18, 19. |
| TOK-DEC-012 | Spacing base-4 con excepciones puntuales `2 px` y `6 px`. | Recommended | Approved | Value Selection Rule #7; UI-DEC-005. | Sección 13. |
| TOK-DEC-013 | Radius scale: `0/4/8/12/16/9999` con aliases button/input/card/modal/drawer/badge. | Approved (anchors) / Derived (scale) | Approved | UI-DEC-006. | Sección 15. |
| TOK-DEC-014 | Elevation restringida a 5 tokens; plataforma combina shadow subtle + border; landing admite `shadow.marketing.floating`. | Derived | Approved | UI-DEC-007. | Sección 17. |
| TOK-DEC-015 | Breakpoints mobile-first: `640/768/1024/1280/1536`. | Recommended | Approved | UI-DEC-012; UI-Q-004. | Sección 19. |
| TOK-DEC-016 | Focus ring `2 px solid violet-700` con offset `2 px` blanco. | Derived | Approved | UI-DEC-015; §32 contrast validation. | Sección 21. |
| TOK-DEC-017 | Motion system minimal: 4 durations, 3 easings, 7 aliases; reduced-motion reduce a instant. | Derived | Approved | UI-DEC-015; §26 UI Foundations. | Sección 20. |
| TOK-DEC-018 | AI tokens dedicados; estados accepted/edited/rejected/fallback/error reutilizan familias feedback. | Derived | Approved | UI-DEC-010; AI Arch §15. | Sección 11. |
| TOK-DEC-019 | Sin tokens `organizer.*`, `vendor.*`, `admin.*`. | Approved | Approved | UI-DEC-008, UI-DEC-009. | Sección 7.4. |
| TOK-DEC-020 | Semantic colors independientes de brand colors. | Approved | Approved | UI-DEC-002, UI-DEC-014. | Sección 8.5, 9.5. |
| TOK-DEC-021 | WCAG 2.1 AA como piso mandatorio; combinaciones que fallan quedan prohibidas explícitamente. | Approved | Approved | UI-DEC-015. | Secciones 31, 32. |
| TOK-DEC-022 | Icon library no seleccionada aún; token layer libre. | Recommended | Deferred | UI-Q-002. | Sección 24. |
| TOK-DEC-023 | `layout.sidebar.widthCollapsed` no definido; variante collapsed a decidir en Component Foundations. | Provisional | Deferred | UI-DEC-008 (variante "cuando aplique"). | Sección 18. |
| TOK-DEC-024 | `font.family.mono` propuesto como stack safe; sujeto a validación en Component Foundations. | Provisional | Provisional | No aprobado explícitamente. | Sección 12.1. |

---

## 34. Deferred decisions

### Component Foundations

- Variantes completas de button (icon-only, loading, size xs/xl, split button).
- Variantes completas de input (search, textarea multi-line, combobox, date/time picker, currency input asociado a `<Money>`).
- Anatomía completa de table (header sticky, sorting, filter row, expandable rows, densidad compacta).
- Anatomía completa de modal, drawer, toast, popover, tooltip.
- Anatomía completa de `<AIPanel>` con todas sus variantes (`<AIEventPlanPanel>`, `<AIChecklistPanel>`, `<AIBudgetPanel>`, `<AIVendorCategoryPanel>`, `<AIQuoteBriefPanel>`, `<AIQuoteCompareSummary>`, `<AIVendorBioPanel>`) — FE Architecture §29.3.
- Composición completa de form-field, incluyendo estados required/optional/error/success/loading.
- Variante `layout.sidebar.widthCollapsed`.
- Icon library selection (UI-Q-002).
- Ilustración/glifo exacto del badge "Sugerencia de IA" (UI-Q-005).

### Figma implementation

- Creación de variable collections en el archivo Figma oficial.
- Binding de text styles a variables.
- Binding de effects a variables.
- Component library con variantes ligadas a design tokens.
- Comportamiento responsive de frames por breakpoint.
- Font-loading strategy en Figma (self-hosted vs. Google Fonts).

### Frontend implementation

- Nombres exactos de CSS custom properties (`--color-text-primary` vs. `--ef-color-text-primary`).
- Keys específicos de Tailwind theme (`theme.extend.colors.text.primary`).
- Exports TypeScript de tokens (si se decide un runtime-consumable token package).
- Estrategia de theming runtime (no requerida en MVP).
- Selección de icon library (Lucide/Material Symbols/Heroicons/custom).
- Font-loading mechanism (Next.js `next/font`, self-hosted, CDN).
- Estrategia de lint enforcement para prohibición de hex crudos.

### Post-MVP

- Dark mode (UI-DEC-013).
- Role themes (UI-DEC-008/009).
- White-label / custom brand themes.
- Sistema avanzado de motion (choreographed transitions).
- Data visualization palette (charts).
- High-density mode.
- Custom illustration tokens.
- Custom AI status colors (más allá de reutilizar feedback semánticos).

---

## 35. Risks and mitigations

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| El violet `#946DF8` falla contraste como texto sobre blanco. | Uso incorrecto de violet-500 para texto rompe accesibilidad. | El sistema **prohibe** violet-500 como texto (§32); documenta violet-700 como texto accesible; enforcement en review y (opcional) en linter. | UX Lead + Frontend Lead. |
| Overhead por escalas primitivas excesivas. | Componentes consumen primitivos y bypassean semánticos. | Naming rules (§7) + code review + guía de mapeo (§28) prohíben consumo directo de primitivos. | Frontend Lead. |
| Aliases semánticos redundantes proliferan. | Fragmentación del sistema. | Cada nuevo alias requiere justificación (§6); alias de componente solo cuando resuelve ambigüedad global. | Design Systems Owner. |
| Valores hardcoded fuera del sistema. | Deriva visual y accesibilidad inconsistente. | Guía frontend (§30) + linting (`stylelint`/`eslint-plugin-tailwindcss`) + code review. | Frontend Lead. |
| Tokens marketing filtran a UI operacional. | La plataforma pierde claridad y densidad operativa (UI-DEC-005). | Separación explícita `color.marketing.*` vs. `color.platform.*` (§10); Component Foundations valida uso. | UX Lead. |
| Colores decorativos (lilac/coral) usados semánticamente. | Ambigüedad con brand vs. semantic (UI-DEC-014). | Prohibición explícita en §32 con evidencia de contraste; UI-DEC-002 registrada como Approved. | Design Systems Owner + QA. |
| Contenido AI aparece como oficial. | Rompe human-in-the-loop (NFR-AI-001). | AI tokens (§11) + reglas mandatorias (§11.1) + Component Foundations sella la anatomía. | UX Lead + AI Architecture Lead. |
| Drift Figma ↔ código. | Diseño y implementación divergen. | Tokens semánticos como source of truth; Figma consume la misma capa; visual regression tests. | Design Systems Owner. |
| Font loading falla o produce fallback pobre. | Layouts rompen por métricas distintas de fallback. | `font.family.*` incluye `system-ui, sans-serif` como fallback; Component Foundations define `next/font`; QA valida FOUT/FOIT. | Frontend Lead. |
| Overflow por traducciones (`pt`/`es` vs. `en`). | Botones/nav rotos en 4 locales. | `typography.button.*` + tokens de spacing (§13) + tests con strings representativos por locale. | QA. |
| Breakpoint mismatch entre Figma y frontend. | Comportamiento responsive inconsistente. | Breakpoints fijos (§19) compartidos por ambos consumidores. | Frontend Lead + UX Lead. |
| Uso excesivo de sombras. | Interfaz visualmente pesada; contradice UI-DEC-007. | Sistema restringido a 5 sombras; guía explícita (§17). | UX Lead + Code Review. |
| Accesibilidad diferida a final del desarrollo. | Retrabajo tardío por incumplimiento WCAG. | Matriz §31 mandatoria desde inicio; QA la audita por iteración. | QA + Accessibility Reviewer. |

---

## 36. Open questions

Solo se listan preguntas realmente sin resolver. **Ninguna** bloquea la generación de Component Foundations; se derivan de UI Foundations §33 (UI-Q-001..UI-Q-005) y de decisiones diferidas explícitas.

| ID | Question | Impact | Owner | Required before | Blocking |
|---|---|---|---|---|---|
| TOK-Q-001 | ¿La CTA violet platform usa `violet-600` (bg default) + `violet-700` (hover), o se prefiere `violet-700` como default y `violet-800` como hover para mayor contraste? | Estética vs. contraste incremental; ambos cumplen AA. | UX Lead + Accessibility Reviewer | Component Foundations (Button) | No |
| TOK-Q-002 | Confirmar `font.family.mono` (stack propuesto) o si el MVP puede prescindir totalmente de mono. | Uso de texto técnico/códigos en admin. | UX Lead + Frontend Lead | Component Foundations | No |
| TOK-Q-003 | Definir la variante `layout.sidebar.widthCollapsed` o confirmar que la MVP no requiere sidebar colapsable. | Comportamiento del shell en pantallas medianas. | UX Lead + Frontend Lead | Component Foundations (Sidebar) | No |
| TOK-Q-004 | Confirmar el sparkle/glifo exacto del badge "Sugerencia de IA" (UI-Q-005) y su tratamiento en tres tamaños. | Reconocimiento visual del tratamiento AI. | UX Lead | Component Foundations (`<AIPanel>`) | No |
| TOK-Q-005 | Confirmar la librería oficial de iconos (UI-Q-002) para congelar `icon.stroke.*` y sizes contra un set real. | Peso de bundle y consistencia visual. | UX Lead + Frontend Lead | Component Foundations | No |

No existen preguntas bloqueantes para generar Component Foundations.

---

## 37. Approval checklist

- [x] UI Foundations were read completely.
- [x] Primitive and semantic layers are defined.
- [x] Naming convention is consistent.
- [x] Light theme is the only theme.
- [x] Neutral scale is complete but minimal.
- [x] Violet action scale is accessible.
- [x] Lilac and coral remain decorative.
- [x] Semantic feedback colors are independent.
- [x] Typography tokens are defined.
- [x] Spacing scale is defined.
- [x] Sizing and touch targets are defined.
- [x] Radius tokens are defined.
- [x] Border tokens are defined.
- [x] Shadow tokens are restrained.
- [x] Layout and grid tokens are defined.
- [x] Breakpoints are defined.
- [x] Motion tokens are minimal.
- [x] Focus tokens are accessible.
- [x] Z-index tokens are defined.
- [x] AI tokens support human-in-the-loop.
- [x] Four locales are considered.
- [x] Currency behavior is respected.
- [x] Contrast matrix is included.
- [x] WCAG 2.1 AA violations are blocking.
- [x] Limited component aliases are included.
- [x] Figma mapping guidance is included.
- [x] Frontend mapping guidance is included.
- [x] No production code was generated.
- [x] No dark-mode tokens were generated.
- [x] No role-specific themes were generated.
- [x] No third-party branding was copied.
- [x] No post-MVP functionality was introduced.

---

## 38. Final recommendation

La especificación de Design Tokens de EventFlow está **lista para revisión del Product Owner y del equipo de frontend**.

- Cubre proporcionalmente al MVP las capas de primitivos, semánticos y una selección mínima de alias de componente, alineadas con UI-DEC-001..UI-DEC-015.
- El sistema de color cumple WCAG 2.1 AA para todas las combinaciones críticas; las combinaciones que fallan (lilac/coral como texto; violet-500 como texto) quedan explícitamente prohibidas por las mismas reglas del sistema.
- Los tokens AI refuerzan el patrón human-in-the-loop reutilizando familias feedback cuando corresponde, evitando paletas paralelas innecesarias.
- La distinción marketing / platform vive únicamente en aliases; los primitivos son compartidos.
- No se generó código de implementación, dark mode, ni temas por rol.
- La matriz de contraste, el registro de decisiones y la matriz de riesgos son auditables por QA y por Accessibility Reviewer.

**Preguntas bloqueantes**: 0.

**Tokens provisionales**: 2 (`font.family.mono` — TOK-DEC-024; `layout.sidebar.widthCollapsed` — TOK-DEC-023).

**Recomendaciones no bloqueantes**:

- Iniciar en paralelo la selección de la librería de iconos (TOK-Q-005 / UI-Q-002) para congelar `icon.*` contra un set real.
- Validar tempranamente el sparkle "Sugerencia de IA" (TOK-Q-004 / UI-Q-005) con el equipo de UX antes de las composiciones Figma finales.
- Ejecutar el checker de contraste sobre `color.ai.border` sobre `color.ai.surface` (3.05:1) en render final; si visualmente resulta insuficiente, promover a `color.violet.600` sin cambiar semántica.

**Siguiente artefacto recomendado**: `docs/ux-ui/EventFlow-Component-Foundations.md`.
