# EventFlow — Stitch Foundations and Frontend Token Validation

| Campo | Valor |
|---|---|
| Nombre del documento | EventFlow — Stitch Foundations and Frontend Token Validation |
| Versión | 1.0 |
| Estado | Ready for review — análisis, sin implementación |
| Fecha | 2026-07-24 |
| Tipo | Validación de alineación (Stitch ↔ documentación aprobada ↔ frontend) |
| Alcance | Extracción de la página Stitch de Foundations, comparación contra `docs/ux-ui/*`, e inspección del estado actual de tokens en `web/`. **No modifica código.** |
| Autoridad aplicada | 1) `EventFlow-UI-Foundations.md` · 2) `EventFlow-Design-Tokens.md` · 3) `EventFlow-Component-Foundations.md` · 4) otros `docs/ux-ui` · 5) página Stitch Foundations · 6) Stitch DESIGN.md / Design DNA · 7) implementación frontend |

---

## 1. Executive summary

| Ítem | Resultado |
|---|---|
| Proyecto Stitch inspeccionado | **EventFlow AI Planning Workspace** (`projects/10889252267442839867`) |
| Página Stitch inspeccionada | **EventFlow — Component Design System (Foundations)** (`screens/7e87f6578fec4e1ebc4ef76e2abda1f3`, DESKTOP, 2560 × 9914) — coincidencia exacta única |
| Documentos UX/UI leídos | **4** (`EventFlow-UI-Foundations.md`, `EventFlow-Design-Tokens.md`, `EventFlow-Component-Foundations.md`, `EventFlow-Visual-Language-Reference.md`) |
| Frontend descubierto | `web/` — Next.js 14 App Router + Tailwind CSS 3.4 + next-intl + TanStack Query |
| Arquitectura de tokens actual | **No existe.** `web/tailwind.config.ts` sólo re-mapea 4 escalas del palette de Tailwind; `web/src/app/globals.css` contiene únicamente las 3 directivas `@tailwind`; `web/src/shared/design-tokens/` y `web/src/shared/design-system/` están vacíos (sólo `.gitkeep`) |
| Estado global de alineación | **Documentación ↔ Stitch: parcialmente alineados** (marca y familias tipográficas coinciden; semánticos, focus, escala tipográfica e iconografía divergen). **Documentación ↔ frontend: no alineados** — el frontend no implementa el sistema aprobado |
| Approved matches (valor) | **49** clasificaciones en las matrices §6–§8 |
| Compatible Derived | **24** clasificaciones |
| Frontend conflicts | **26** clasificaciones, consolidadas en **16 conflictos distintos** (FC-01..FC-16, §10) |
| Stitch conflicts | **34** clasificaciones, agrupadas en **14 divergencias distintas** (§16) |
| Stitch matches | **19** clasificaciones |
| Missing frontend tokens | **35** clasificaciones, agrupadas en **19 grupos** de tokens (MT-01..MT-19, §11) |
| Duplicates | **9** definiciones semánticas duplicadas (§12.1) |
| Hardcoded usages | **2 006** utilidades de paleta cruda de Tailwind en **173** archivos `.tsx` (excluyendo tests); **3** clases `brand-*` que no existen en la configuración (defecto funcional) |
| Provisional values | **11** clasificaciones, sobre **5** cuestiones distintas (Q-02, Q-05, Q-07 y los bordes < 3:1 de §9.2) |
| Blocking questions | **0** |
| ¿Listo para corregir tokens? | **Sí.** No hay decisión bloqueante pendiente. La corrección debe empezar por crear la capa de tokens (hoy inexistente), no por refactorizar componentes |

### Hallazgo principal

El frontend **no contradice masivamente los valores aprobados** — contradice la **arquitectura** aprobada.

Muchos valores neutrales y semánticos que el código usa hoy (`neutral-800` = `#262626`, `neutral-600` = `#525252`, `red-600` = `#DC2626`, `blue-700` = `#1D4ED8`, `amber-50` = `#FFFBEB`) **coinciden exactamente** con los tokens aprobados, porque `EventFlow-Design-Tokens.md` derivó sus escalas semánticas del mismo palette de Tailwind. Lo que falta es la capa que les da significado: no hay custom properties, no hay `theme.extend` semántico, y los componentes consumen primitivos crudos — precisamente lo que `EventFlow-Design-Tokens.md` §6 y §30 prohíben.

Sobre eso se apilan cuatro desviaciones de alto impacto:

1. **La marca no está implementada.** El color de acción primaria aprobado es violeta (`#7B4EE8`); `tailwind.config.ts` define `primary: colors.blue`. EventFlow se renderiza hoy como un producto azul.
2. **Las tipografías aprobadas no se cargan.** No hay `next/font`, ni `<link>` a Google Fonts, ni `fontFamily` en la configuración de Tailwind. `Inter` e `Inter Tight` están ausentes del proyecto; la UI se renderiza con la pila `ui-sans-serif, system-ui` por defecto de Tailwind.
3. **El focus ring no es un token.** Se usan **7 colores distintos** de anillo en 37 declaraciones; ninguno es el `#6238C7` aprobado, ninguno aplica el offset blanco obligatorio, y `focus:ring-purple-400` (11 usos, todos en paneles de IA) mide **2.64:1** sobre blanco — falla WCAG 2.1 AA 1.4.11.
4. **El tratamiento de IA usa la familia equivocada.** Los paneles de IA consumen el `purple` de Tailwind (`#7e22ce`, `#faf5ff`, `#d8b4fe`) en lugar de la escala violeta/lilac aprobada (`#7B4EE8`, `#F7F5FB`, `#946DF8`).

Ninguno de estos requiere una decisión de producto para resolverse: la documentación ya fija el valor correcto en todos los casos.

### Nota sobre iconografía (instrucción del operador)

La página Stitch rotula su sección de iconos como **"Iconography (Font Awesome)"** y el DESIGN.md de Stitch declara *"Use Font Awesome Free only"*. **Esto no es autoridad.** La documentación aprobada nunca seleccionó Font Awesome: `UI-Q-002`, `TOK-Q-005` y `CMP-Q-001` dejan la librería como decisión abierta no bloqueante, y `docs/15-Frontend-Architecture-Design.md` **recomienda explícitamente `lucide-react`** (citado en `EventFlow-Component-Foundations.md` líneas 105, 1623, 1952 y 2086).

El operador ratifica **`lucide-react`** como la librería única del proyecto. Esto **cierra** `UI-Q-002` / `TOK-Q-005` / `CMP-Q-001` sin contradecir ningún documento aprobado, y es consistente con el estado real del código: `lucide-react@^1.24.0` está instalado y en uso en 8 archivos de producción, y **no existe ninguna dependencia ni referencia a Font Awesome en todo el repositorio**. La mención de Font Awesome en Stitch queda registrada como **Stitch Conflict** y **Out of Scope**; no debe propagarse al frontend.

---

## 2. Sources inspected

### 2.1 Stitch (vía MCP)

| Recurso | Identificador | Obtenido |
|---|---|---|
| Herramientas MCP disponibles | `list_projects`, `get_project`, `list_screens`, `get_screen`, `list_design_systems`, `create_project`, `delete_project`, `generate_screen_from_text`, `edit_screens`, `generate_variants`, `apply_design_system`, `create_design_system`, `create_design_system_from_design_md`, `update_design_system`, `upload_design_md` | Sí — sólo se usaron las de lectura |
| Proyecto | `projects/10889252267442839867` — "EventFlow AI Planning Workspace" | Sí |
| Screens del proyecto | 57 screens / instancias | Sí |
| **Página objetivo** | `projects/10889252267442839867/screens/7e87f6578fec4e1ebc4ef76e2abda1f3` — "EventFlow — Component Design System (Foundations)" | Sí |
| HTML generado de la página | `projects/10889252267442839867/files/2139071298270458983` (29 797 bytes) — descargado y leído completo | Sí |
| Screenshot de la página | `projects/10889252267442839867/files/10501114987485782649` (1200 × 4669) — inspeccionado visualmente | Sí |
| Design systems del proyecto | 3 versiones: `assets/7dbbdd58…`, `assets/8683e03f…`, `assets/c38b5ae8…` | Sí |
| DESIGN.md / Design DNA | Front-matter YAML + guías de estilo de las 3 versiones | Sí |
| `designTheme` del proyecto | `namedColors`, `typography`, `spacing`, `roundness`, overrides de marca | Sí |

**Página exacta encontrada: una sola coincidencia.** No hubo ambigüedad. Existen variantes relacionadas que **no** se usaron como fuente: `(Foundations - Móvil)`, `(Desktop)`, `(Actions & Forms)`, `(Navigation & Feedback)`, `(Data & Overlays)`, `(AI, Marketing & Final Notes)`.

**No expuesto por el MCP** (registrado explícitamente como no disponible): jerarquía de nodos / árbol de capas, variables o estilos ligados, anotaciones de accesibilidad estructuradas, tokens de motion, y specs responsive por breakpoint. Toda la evidencia de valores proviene del **HTML generado** (que incluye el bloque `tailwind.config` incrustado) y del **DESIGN.md**, no de inferencias sobre el screenshot.

### 2.2 Documentación UX/UI (rutas reales verificadas)

| Ruta | Líneas | Lectura |
|---|---|---|
| `docs/ux-ui/EventFlow-UI-Foundations.md` | 899 | Completa |
| `docs/ux-ui/EventFlow-Design-Tokens.md` | 1 335 | Completa |
| `docs/ux-ui/EventFlow-Component-Foundations.md` | 2 105 | Secciones normativas de tokens, iconografía, a11y, matriz de consumo, decisiones y preguntas abiertas (§34, §37, §38, §40, §43, §44, §45, §46) |
| `docs/ux-ui/EventFlow-Visual-Language-Reference.md` | 304 | Estructura y secciones de accesibilidad / no-copiar (informativo, sin autoridad) |

El directorio `docs/ux-ui/` contiene exactamente estos 4 archivos. No existe ningún documento previo de extracción Stitch ni de alineación de design system.

### 2.3 Frontend inspeccionado

| Ruta | Rol | Estado |
|---|---|---|
| `web/tailwind.config.ts` | Única fuente de tokens existente | 4 alias de color; sin `fontFamily`, `fontSize`, `spacing`, `borderRadius`, `boxShadow`, `screens` |
| `web/src/app/globals.css` | Hoja global | Sólo `@tailwind base/components/utilities` — 0 custom properties |
| `web/src/app/layout.tsx` | Root layout | **Sin carga de fuentes**; `<body>` sin clase tipográfica |
| `web/postcss.config.mjs` | Pipeline | `tailwindcss` + `autoprefixer` |
| `web/package.json` | Dependencias | `lucide-react@^1.24.0`, `tailwindcss@^3.4.1`; **sin** `@fortawesome/*`, **sin** `next/font` en uso |
| `web/src/shared/design-tokens/` | Destino previsto de tokens | **Vacío** (`.gitkeep`) |
| `web/src/shared/design-system/` | Destino previsto de primitivas | **Vacío** (`.gitkeep`) |
| `web/src/shared/ui/` | Primitivas compartidas | Sólo `Pagination.tsx` + `index.ts` |
| `web/src/shared/navigation/` | Shell | `Sidebar`, `Topbar`, `NavLink`, `MobileNav`, `UserMenu`, `Logo`, `SkipLink`, `Footer`, `NotificationsBadge` |
| `web/src/shared/i18n/` | i18n + moneda | `LanguageSelector.tsx`, `Money.tsx`, `format.ts` |
| `web/src/features/ai/**` | Paneles IA | 7 familias (`event-plan`, `checklist`, `budget-suggestion`, `vendor-categories`, `quote-brief`, `quote-summary`, `hitl`) |
| `web/src/features/**`, `web/src/app/**` | Superficie total | 341 archivos `.tsx` |

---

## 3. Stitch foundations extraction

Valores extraídos del HTML generado de la página Foundations (bloque `tailwind.config` incrustado + marcado) y del DESIGN.md del design system. **No se infirió ningún valor que Stitch no exponga.**

### 3.1 Colors — marca (declarados explícitamente en la página)

| Muestra en la página | Valor Stitch |
|---|---|
| Violeta | `#946DF8` |
| Lila | `#C4B7E5` |
| Coral | `#EE8C8D` |
| Texto Principal | `#262626` |
| Secundario | `#525252` |
| Superficie base | `#FFFFFF` (`surface`) |

### 3.2 Colors — configuración incrustada (extracto relevante)

| Clave Stitch | Valor |
|---|---|
| `brand-violet` / `brand-lilac` / `brand-coral` | `#946DF8` / `#C4B7E5` / `#EE8C8D` |
| `surface` | `#FFFFFF` |
| `background` | `#fdf7ff` |
| `on-surface` / `on-surface-variant` | `#262626` / `#525252` |
| `on-background` | `#1d1a23` |
| `primary` / `on-primary` | `#683ec9` / `#ffffff` |
| `primary-container` / `surface-tint` | `#815ae4` / `#6b41cc` |
| `outline` / `outline-variant` | `#E5E5E5` / `#cbc3d6` |
| `success` / `warning` / `error` / `info` | `#10B981` / `#F59E0B` / `#EF4444` / `#3B82F6` |
| `ai-surface` / `ai-border` | `#F5F3FF` / `#946DF8` |
| Material-derived (≈40 claves) | `surface-container-*`, `tertiary-*`, `*-fixed`, `inverse-*`, `secondary-*` |

En una de las tres versiones del design system, el DESIGN.md declara además `ai-border-fallback: '#6D28D9'`, `success: '#10B981'`, `warning: '#F59E0B'`, `error: '#EF4444'`, `info: '#3B82F6'`, y `focus-ring: '2px solid #946DF8, offset 2px'`.

### 3.3 Typography

Familias en la configuración: `display`, `h1`, `h1-mobile`, `h2`, `h3` → **Inter Tight**; `body-lg`, `body-md`, `body-sm`, `label`, `caption` → **Inter**.

| Nivel | Familia | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|
| Display | Inter Tight | 48 px | 600 | 1.1 | no declarado en la página |
| H1 | Inter Tight | 32 px | 600 | 1.2 | — |
| H1 mobile | Inter Tight | 28 px | 600 | 1.2 | — |
| H2 | Inter Tight | 24 px | 600 | 1.3 | — |
| H3 | Inter Tight | 20 px | 600 | 1.4 | — |
| Body Large | Inter | 18 px | 400 | 1.5 | — |
| Body Regular | Inter | 16 px | 400 | 1.5 | — |
| Body Small | Inter | 14 px | 400 | 1.4 | — |
| Label | Inter | 14 px | 500 | 1.0 | renderizado `uppercase tracking-wide` |
| Caption | Inter | 12 px | 400 | 1.3 | — |
| Numeric | Inter `tabular-nums` | 16 px | no declarado | — | — |

> Inconsistencia interna de Stitch: el `designTheme` del proyecto reporta `headlineFont: "INTER"` / `headlineFontFamily: "Inter"`, mientras el DESIGN.md y la página generada usan **Inter Tight** para headings. La página generada es la evidencia más fiable y coincide con lo aprobado.

### 3.4 Spacing

Ritmo declarado: **8 px**. Demostrado en la página: `gap-2` = 8 px, `gap-4` = 16 px, padding de card `p-6` = 24 px, margen de sección `mb-8` = 32 px.
Configuración: `gutter` 24 px · `margin-desktop` 32 px · `margin-mobile` 16 px · `max-width` 1280 px.

### 3.5 Radius

Rotulado en la página: **8 px** (Buttons / Inputs) · **12–16 px** (Cards) · **16 px** (Modals) · **Pill** (Badges).
Configuración incrustada (escala desplazada respecto de las etiquetas): `DEFAULT` 0.25 rem (4 px), `lg` 0.5 rem (8 px), `xl` 0.75 rem (12 px), `full` 9999 px.

### 3.6 Borders

| Muestra | Implementación Stitch |
|---|---|
| Borde por defecto | `border` 1 px `outline` (`#E5E5E5`) |
| Borde fuerte | `border-2` `on-surface-variant` (`#525252`) |
| Borde de input (DESIGN.md) | 1 px `#D4D4D4`, en foco pasa a violeta primario |

### 3.7 Shadows

En la página: `shadow-sm` (sombra operativa sutil), `shadow-md` (sombra de marketing), `shadow-xl` (sombra de modal) — utilidades por defecto de Tailwind, sin valores propios.
En el DESIGN.md (una de las versiones): `operational: 0 2px 4px rgba(0,0,0,0.04)` · `marketing: 0 12px 24px rgba(0,0,0,0.08)` · `overlay: 0 20px 40px rgba(0,0,0,0.12)`.

### 3.8 Focus

Dos tratamientos, mutuamente inconsistentes:

- **Página Foundations** — muestra "Anillo de enfoque": `border border-brand-violet` + `ring-4 ring-brand-violet/20` (anillo violeta al **20 % de opacidad**).
- **Sección Actions** — botones "Focused": `outline outline-2 outline-offset-2 outline-primary` (2 px sólido, offset 2 px, color `#683ec9`).
- **DESIGN.md** — `focus-ring: '2px solid #946DF8, offset 2px'`.

Ninguno usa un offset **blanco**.

### 3.9 Icons

Familia rotulada: **Font Awesome** (`fa-solid`, cargado desde CDN). Tamaños demostrados: **S 14 px · M 16 px · L 20 px · XL 24 px**. Contenedor de alineación 24 × 24 px (DESIGN.md).
**Contradicción dentro de la propia página:** la tarjeta de IA no usa Font Awesome sino **Material Symbols** (`<span class="material-symbols-outlined">auto_awesome</span>`), con la hoja de estilo de Google cargada en el `<head>`. La página mezcla dos familias de iconos.

### 3.10 Layout

| Elemento | Valor Stitch |
|---|---|
| Sidebar | `w-64` = **256 px**, `border-r`, sticky, full height |
| Contenedor principal | `max-w-max-width` = **1280 px**, centrado |
| Padding de página | `p-8` → `lg:p-12` → `xl:p-16` (32 / 48 / 64 px) |
| Grid (DESIGN.md) | 12 columnas desktop · 8 tablet · 4 mobile · gutter 24 px |
| Touch target (DESIGN.md) | mínimo 44 × 44 px |
| Altura de botón | `h-11` = 44 px |

### 3.11 Responsive foundations

La página usa los breakpoints por defecto de Tailwind sin sobrescribirlos: `md` 768 px, `lg` 1024 px, `xl` 1280 px. El sidebar se oculta bajo `md`. No se expone una tabla de breakpoints propia.

### 3.12 Anotaciones de accesibilidad expuestas

| Anotación en la página | Verificación |
|---|---|
| "Violeta on White — Passes WCAG AA for normal text" | **Falso.** `#946DF8` sobre `#FFFFFF` = **3.62:1**. `EventFlow-Design-Tokens.md` §32 lo declara explícitamente **bloqueado como texto** |
| "White on Texto Principal — Passes WCAG AAA for normal text" | **Correcto.** `#FFFFFF` sobre `#262626` = 15.13:1 |

### 3.13 No disponible en Stitch

Motion / durations / easings · z-index · opacity · escala de spacing completa con nombres de token · tokens de selección y scrim · `prefers-reduced-motion` · anotaciones ARIA estructuradas · tokens de tabla y formulario.

---

## 4. Approved EventFlow foundations (resumen normativo)

Fuente: `EventFlow-UI-Foundations.md` (UI-DEC-001..015) y `EventFlow-Design-Tokens.md` (TOK-DEC-001..024).

**Marca (UI-DEC-002).** Texto principal `#262626` · texto secundario `#525252` · violeta funcional `#946DF8` · lila decorativo `#C4B7E5` · coral decorativo `#EE8C8D` · fondo `#FFFFFF`. Light theme únicamente (UI-DEC-013). Sin temas por rol (UI-DEC-009). Lila y coral **nunca** como texto ni como estado semántico.

**Escala violeta derivada.** `violet.500` `#946DF8` (ancla, sólo acento/borde/fondo) · `violet.600` `#7B4EE8` (fondo de CTA de plataforma) · `violet.700` `#6238C7` (texto violeta accesible, link, focus ring) · `violet.800` `#4A2A99` (pressed) · `violet.50` `#F5F1FE` (item activo de sidebar).

**Acciones (UI-DEC-003).** Plataforma: primaria `#7B4EE8` / hover `#6238C7` / foreground `#FFFFFF`. Marketing: CTA oscura `#171717` / hover `#262626`. Destructiva: `#DC2626` / hover `#B91C1C`.

**Semánticos independientes (UI-DEC-014).** success `#16A34A` / texto `#15803D` / surface `#ECFDF5` · warning `#D97706` / texto `#B45309` / surface `#FFFBEB` · error `#DC2626` / texto `#B91C1C` / surface `#FEF2F2` · info `#2563EB` / texto `#1D4ED8` / surface `#EFF6FF`.

**IA (UI-DEC-010, §11).** `ai.surface` `#F7F5FB` (lilac-50) · `ai.border` `#946DF8` · `ai.label` / `ai.icon` `#6238C7` · texto `#262626`. Estados accepted/edited/rejected/fallback/error **reutilizan** las familias de feedback. Sin glow ni gradientes animados. El color nunca es la única señal.

**Tipografía (UI-DEC-004).** Headings `"Inter Tight", system-ui, sans-serif` · body/UI `"Inter", system-ui, sans-serif`. Escala rem-first: display 60 px · h1 40 px · h2 32 px · h3 24 px · body-lg 18 px · body-md 16 px · body-sm 14 px · label 14 px · caption 12 px. Pesos 400/500/600/700. Line-heights 1.1 / 1.25 / 1.5 / 1.6. Letter-spacing −0.02em / 0 / 0.06em.

**Forma (UI-DEC-006).** radius: 0 / 4 / **8** (button, input) / **12** (card) / **16** (card prominente, modal, drawer) / **9999** (badge).

**Bordes (UI-DEC-007).** width 1 px default, 2 px strong. `border.default` `#D4D4D4` · `border.subtle` `#E5E5E5` · `border.strong` `#404040` · `border.interactive` `#946DF8`.

**Sombras (TOK-DEC-014).** `surface.subtle` `0 1px 2px rgba(23,23,23,.04)` · `surface.raised` `0 2px 6px rgba(23,23,23,.06)` · `overlay.dropdown` `0 8px 16px rgba(23,23,23,.08), 0 2px 4px rgba(23,23,23,.04)` · `overlay.modal` `0 20px 40px rgba(23,23,23,.12), 0 8px 16px rgba(23,23,23,.06)` · `marketing.floating` `0 30px 60px -20px rgba(15,13,26,.15), 0 10px 20px -10px rgba(15,13,26,.08)`.

**Focus (TOK-DEC-016).** `2 px solid #6238C7` con **offset de 2 px blanco (`#FFFFFF`)**. Obligatorio el offset blanco sobre superficies violeta. Implementar con `focus-visible`, no `focus`.

**Iconos.** `icon.size` 16 / 20 / 24 px · `icon.stroke` 1.5 / 2 px · una sola librería outline · `aria-label` en icon-only · touch target ≥ 44 × 44 px. Librería: **`lucide-react`** (recomendada por `docs/15-Frontend-Architecture-Design.md`; ratificada por el operador en esta iteración).

**Layout (UI-DEC-012).** marketing max 1280 px · form max 720 px · content platform soft cap 1440 px · sidebar 256 px · header 64 px · page padding 16 / 32 / 48 px · grid 12 / 8 / 4 · gutter 16 / 20 / 24 px.

**Breakpoints (TOK-DEC-015).** 640 / 768 / 1024 / 1280 / 1536. Sidebar visible desde `lg` (1024 px).

**Motion (TOK-DEC-017).** durations 0 / 120 / 200 / 320 ms · easings standard / enter / exit · reduced-motion colapsa a 0 ms.

**Z-index.** base 0 · sticky 10 · dropdown 100 · drawer 200 · modal 300 · toast 400 · tooltip 500.

**Accesibilidad (UI-DEC-015).** WCAG 2.1 AA mandatorio y **bloqueante**. Prohibidos como texto: `violet.500`, `lilac.300`, `coral.300`.

---

## 5. Frontend token architecture

### 5.1 Dónde viven hoy los tokens

**En un solo archivo, y de forma mínima:** `web/tailwind.config.ts` (19 líneas).

```ts
theme: { extend: { colors: {
  primary:   colors.blue,
  secondary: colors.slate,
  danger:    colors.red,
  success:   colors.emerald,
} } }
```

Su propio comentario documenta el estado provisional: *"US-107: paleta semántica mínima mapeada a escalas Tailwind existentes (Doc 15 §20). El design system completo (tokens definitivos, componentes base) es Future."* Es decir, **la configuración actual nunca pretendió implementar el sistema aprobado.**

### 5.2 Cómo se consumen

- **CSS variables:** ninguna. `globals.css` contiene sólo las tres directivas `@tailwind`. No hay bloque `:root`.
- **Tailwind theme:** sin `fontFamily`, `fontSize`, `lineHeight`, `letterSpacing`, `spacing`, `borderRadius`, `boxShadow`, `screens`, `zIndex`. Todo cae en los valores por defecto de Tailwind.
- **Objetos de tema en JS/TS:** ninguno.
- **Consumo real:** los 341 componentes `.tsx` aplican **utilidades de paleta cruda de Tailwind** directamente en `className`. **2 006** ocurrencias en **173** archivos de producción.
- **Alias definidos:** los 4 alias existentes (`primary`, `secondary`, `danger`, `success`) se usan en **5 lugares en total**, todos en `shared/navigation/`. El resto del código los ignora.

Distribución de las utilidades crudas por familia:

| Familia | Ocurrencias |
|---|---|
| `neutral` | 1 268 |
| `red` | 394 |
| `amber` | 92 |
| `blue` | 91 |
| `purple` | 53 |
| `emerald` | 37 |
| `green` | 29 |
| `indigo` | 20 |
| `gray` | 16 |
| `rose` | 6 |

### 5.3 ¿Existen sistemas de tokens duplicados?

**No.** Existe **uno solo, incompleto**, más dos directorios reservados y vacíos (`shared/design-tokens/`, `shared/design-system/`). Esto es favorable: la corrección puede poblar la estructura prevista sin desmontar nada ni arriesgar un segundo sistema en paralelo.

Sí existe **duplicación semántica dentro del código** (§12): tres neutrales distintos usados como "texto principal", dos familias verdes para "éxito", siete colores de anillo de foco.

### 5.4 Dark mode y temas por rol

| Verificación | Resultado |
|---|---|
| `darkMode` en `tailwind.config.ts` | **Ausente** ✅ conforme a UI-DEC-013 |
| Variantes `dark:` en el código | **0 ocurrencias** ✅ |
| Temas por rol (`organizerTheme`, `vendorTheme`, `adminTheme`, mapas de tema) | **0 ocurrencias** ✅ conforme a UI-DEC-009 |

Ambas restricciones aprobadas se cumplen hoy. La corrección de tokens **no debe introducirlas**.

### 5.5 Carga de fuentes

**No existe.** `web/src/app/layout.tsx` no importa `next/font`, no inyecta `<link>` a Google Fonts, y el `<body>` no lleva clase tipográfica. `tailwind.config.ts` no define `fontFamily`. Consecuencia: toda la aplicación se renderiza con la pila por defecto de Tailwind (`ui-sans-serif, system-ui, -apple-system, …`). **`Inter` e `Inter Tight` no están presentes en el proyecto de ninguna forma.**

### 5.6 Iconografía

`lucide-react@^1.24.0` instalado y usado en 8 archivos de producción (`OrganizerDashboard`, `VendorDashboard`, `SeedDemoPanel`, `UserMenu`, `Topbar`, `NotificationsBadge`, `MobileNav`, `LanguageSelector`). Tamaño predominante `h-4 w-4` (16 px = `icon.size.sm`). `aria-hidden="true"` correctamente aplicado en `NavLink`.
**No hay ninguna dependencia ni referencia a Font Awesome en el repositorio.** El frontend ya está alineado con la ratificación de `lucide-react`.

---

## 6. Color validation matrix

Clasificación por **valor**. La columna "Acción requerida" distingue el valor del mecanismo: casi todo lo que hoy es correcto en valor sigue siendo **Hardcoded Usage** a nivel de arquitectura y debe migrar a token.

### 6.1 Brand

| Rol semántico | Token/valor aprobado | Valor Stitch | Valor frontend | Clasificación | Acción requerida |
|---|---|---|---|---|---|
| Brand violet (ancla) | `color.violet.500` `#946DF8` | `#946DF8` ✅ | — ausente | **Missing in Frontend** · Stitch Match | Añadir escala violeta a `theme.extend.colors` |
| Decorative lilac | `color.lilac.300` `#C4B7E5` | `#C4B7E5` ✅ | — ausente | **Missing in Frontend** · Stitch Match | Añadir; sólo decorativo |
| Decorative coral | `color.coral.300` `#EE8C8D` | `#EE8C8D` ✅ | — ausente | **Missing in Frontend** · Stitch Match | Añadir; sólo decorativo |
| Marca aplicada a acción | `color.action.primary.background` `#7B4EE8` | `primary` `#683ec9` | `primary` = Tailwind **blue** | **Frontend Conflict** · **Stitch Conflict** | Reemplazar `primary: colors.blue` por la escala violeta aprobada |

### 6.2 Text

| Rol semántico | Aprobado | Stitch | Frontend | Clasificación | Acción requerida |
|---|---|---|---|---|---|
| `color.text.primary` | `#262626` | `on-surface` `#262626` ✅ | `text-neutral-800` `#262626` (112 usos) | **Approved Match** + Hardcoded | Exponer como `text-primary`; migrar utilidades |
| `color.text.primary` (uso alterno) | `#262626` | — | `text-neutral-900` `#171717` (109 usos) | **Duplicate** · Frontend Conflict | `#171717` está reservado a superficie inversa / CTA marketing, no a texto de cuerpo |
| `color.text.secondary` | `#525252` | `on-surface-variant` `#525252` ✅ | `text-neutral-600` `#525252` (139 usos) | **Approved Match** + Hardcoded | Exponer como `text-secondary` |
| `color.text.muted` | `#737373` | — | `text-neutral-500` `#737373` (150 usos) | **Approved Match** + Hardcoded | Exponer como `text-muted` |
| `color.text.disabled` | `#A3A3A3` | — | `text-neutral-400` | **Approved Match** + Hardcoded | Exponer como `text-disabled` |
| `color.text.inverse` | `#FFFFFF` | `on-primary` `#ffffff` ✅ | `text-white` | **Approved Match** + Hardcoded | Exponer como `text-inverse` |
| `color.text.link` | `#6238C7` | no expuesto | ausente (links heredan neutral/blue) | **Missing in Frontend** | Añadir `text-link` |
| `color.text.linkHover` | `#4A2A99` | no expuesto | ausente | **Missing in Frontend** | Añadir |
| Texto secundario alterno | — | — | `text-neutral-700` `#404040` (161 usos) | **Duplicate** | Consolidar en `text.primary` o `text.secondary` según jerarquía |

### 6.3 Background

| Rol semántico | Aprobado | Stitch | Frontend | Clasificación | Acción requerida |
|---|---|---|---|---|---|
| `color.background.default` | `#FFFFFF` | `surface` `#FFFFFF` ✅ / `background` `#fdf7ff` ❌ | `bg-white` | **Approved Match** · **Stitch Conflict** | Ignorar el `#fdf7ff` de Stitch (residuo de Material) |
| `color.background.subtle` | `#FAFAFA` | `surface-container-low` `#f8f1fd` ❌ | `bg-neutral-50` `#FAFAFA` (96 usos) | **Approved Match** · Stitch Conflict | Exponer como `bg-subtle` |
| `color.platform.page.background` | `#FAFAFA` | — | no aplicado como fondo de área de contenido | **Missing in Frontend** | Añadir alias |

### 6.4 Surface

| Rol semántico | Aprobado | Stitch | Frontend | Clasificación | Acción requerida |
|---|---|---|---|---|---|
| `color.surface.default` | `#FFFFFF` | `#FFFFFF` ✅ | `bg-white` | **Approved Match** + Hardcoded | Exponer como `surface` |
| `color.surface.subtle` | `#FAFAFA` | — | `bg-neutral-50` | **Approved Match** + Hardcoded | Exponer |
| `color.surface.elevated` | `#FFFFFF` | — | `bg-white` en modales | **Approved Match** + Hardcoded | Exponer |
| `color.surface.disabled` | `#F5F5F5` | — | `bg-neutral-100` `#F5F5F5` (58 usos) | **Approved Match** + Hardcoded | Exponer |
| `color.surface.inverse` | `#171717` | `inverse-surface` `#322f38` ❌ | `bg-neutral-900` (37 usos) | **Approved Match** · **Stitch Conflict** | Exponer como `surface-inverse` |

### 6.5 Border

| Rol semántico | Aprobado | Stitch | Frontend | Clasificación | Acción requerida |
|---|---|---|---|---|---|
| `color.border.default` | `#D4D4D4` | `outline-variant` `#cbc3d6` ❌ (DESIGN.md sí dice `#D4D4D4`) | `border-neutral-300` `#D4D4D4` (213 usos) | **Approved Match** · **Stitch Conflict** | Exponer como `border-default` |
| `color.border.subtle` | `#E5E5E5` | `outline` `#E5E5E5` ✅ | `border-neutral-200` `#E5E5E5` (98 usos) | **Approved Match** · Stitch Match | Exponer como `border-subtle` |
| `color.border.strong` | `#404040` | `border-2 on-surface-variant` `#525252` ❌ | ausente | **Missing in Frontend** · Stitch Conflict | Añadir |
| `color.border.interactive` | `#946DF8` | `brand-violet` ✅ | `focus:border-purple-500` / `focus:border-brand-500` | **Frontend Conflict** | Reemplazar por violeta aprobado |
| `color.separator.default` | `#E5E5E5` | `outline` ✅ | `border-neutral-200` | **Approved Match** + Hardcoded | Exponer |

### 6.6 Actions

| Rol semántico | Aprobado | Stitch | Frontend | Clasificación | Acción requerida |
|---|---|---|---|---|---|
| `action.primary.background` | `#7B4EE8` | `#683ec9` ❌ | `bg-blue-600` / `bg-purple-700` (mezclados) | **Frontend Conflict** · **Stitch Conflict** | Fijar en `#7B4EE8` |
| `action.primary.hover` | `#6238C7` | `surface-tint` `#6b41cc` ❌ | `hover:bg-blue-700` / `hover:bg-purple-800` | **Frontend Conflict** · Stitch Conflict | Fijar en `#6238C7` |
| `action.primary.foreground` | `#FFFFFF` | `#ffffff` ✅ | `text-white` | **Approved Match** | Exponer |
| `action.primary.active` | `#4A2A99` | no expuesto | ausente | **Missing in Frontend** | Añadir |
| `action.primary.disabledBackground` | `#E5E5E5` | `surface-variant` ❌ | `disabled:bg-neutral-300` / `disabled:opacity-60` | **Compatible Derived** | Consolidar en el token aprobado |
| `action.secondary.*` | bg `#FFFFFF`, fg `#262626`, border `#D4D4D4`, hover `#FAFAFA` | outline `#E5E5E5` (parcial) | `bg-white border-neutral-300` | **Approved Match** + Hardcoded | Exponer como alias `button.secondary.*` |
| `action.ghost.hover` | `rgba(23,23,23,.04)` | `hover:bg-surface-container` | `hover:bg-neutral-100` `#F5F5F5` | **Compatible Derived** | Aceptable; documentar o migrar al alpha aprobado |
| `action.destructive.background` | `#DC2626` | `error` `#EF4444` ❌ | `bg-red-600` `#DC2626` (13 usos) | **Approved Match** · **Stitch Conflict** | Exponer como `action-destructive` |
| `action.destructive.hover` | `#B91C1C` | — | `bg-red-700` `#B91C1C` (19 usos) | **Approved Match** + Hardcoded | Exponer |
| `marketing.cta.background` | `#171717` | no expuesto (la landing no está en esta página) | `bg-neutral-900` ad hoc | **Compatible Derived** | Formalizar como alias `marketing-cta` |

### 6.7 Feedback

| Rol semántico | Aprobado | Stitch | Frontend | Clasificación | Acción requerida |
|---|---|---|---|---|---|
| `feedback.success.strong` | `#16A34A` | `#10B981` ❌ | `bg-emerald-*` (37 usos) mezclado con `green-*` (29) | **Frontend Conflict** · **Stitch Conflict** | Unificar en la familia `green` aprobada |
| `feedback.success.surface` | `#ECFDF5` | — | `bg-emerald-50` `#ECFDF5` | **Approved Match** + Hardcoded | Exponer |
| `feedback.success.text` | `#15803D` | — | `text-green-800` `#166534` | **Compatible Derived** (pasa AA, 6.77:1) | Alinear a `#15803D` |
| `feedback.warning.strong` | `#D97706` | `#F59E0B` ❌ | `bg-amber-*` | **Stitch Conflict** · Compatible Derived | Fijar `#D97706` |
| `feedback.warning.surface` | `#FFFBEB` | — | `bg-amber-50` `#FFFBEB` (20 usos) | **Approved Match** + Hardcoded | Exponer |
| `feedback.warning.text` | `#B45309` | — | `text-amber-800` `#92400E` (15) / `amber-900` `#78350F` (11) | **Duplicate** · Compatible Derived | Consolidar en `#B45309` |
| `feedback.error.strong` | `#DC2626` | `#EF4444` ❌ | `bg-red-600` | **Approved Match** · **Stitch Conflict** | Exponer |
| `feedback.error.surface` | `#FEF2F2` | — | `bg-red-50` `#FEF2F2` (87 usos) | **Approved Match** + Hardcoded | Exponer |
| `feedback.error.text` | `#B91C1C` | — | `text-red-700` `#B91C1C` (68) / `text-red-800` `#991B1B` (84) | **Duplicate** | Consolidar en `#B91C1C` |
| `feedback.info.strong` | `#2563EB` | `#3B82F6` ❌ | `bg-blue-600` `#2563EB` (18 usos) | **Approved Match** · **Stitch Conflict** | Exponer |
| `feedback.info.surface` | `#EFF6FF` | — | `bg-blue-50` `#EFF6FF` (13 usos) | **Approved Match** + Hardcoded | Exponer |
| `feedback.info.text` | `#1D4ED8` | — | `text-blue-700` `#1D4ED8` (13 usos) | **Approved Match** + Hardcoded | Exponer |
| `feedback.*.border` | `#A7F3D0` / `#FDE68A` / `#FECACA` / `#BFDBFE` | — | `border-red-300`, `border-amber-300`, `border-purple-300` | **Frontend Conflict** | Usar el step `200` aprobado por familia |

### 6.8 Focus

| Rol semántico | Aprobado | Stitch | Frontend | Clasificación | Acción requerida |
|---|---|---|---|---|---|
| `focus.ring.color` | `#6238C7` | `ring-brand-violet/20` y `outline-primary` `#683ec9` (inconsistentes) | 7 colores distintos: `purple-400`(11), `blue-500`(8), `indigo-500`(4), `neutral-900`(4), `brand-500`(3, **inexistente**), `neutral-500`(2), `neutral-400`(2), `red-500/600`(3) | **Frontend Conflict** · **Duplicate** · **Stitch Conflict** | Token único `#6238C7` |
| `focus.ring.width` | `2 px` | `ring-4` / `outline-2` (inconsistentes) | `ring-2` (25), `ring-1` (4) | **Duplicate** | Fijar 2 px |
| `focus.ring.offset` | `2 px` | `outline-offset-2` (sólo en Actions) | `ring-offset-2` en sólo 5 de 37 declaraciones | **Missing in Frontend** | Obligatorio |
| `focus.ring.offsetColor` | `#FFFFFF` | **no existe** | **no existe** | **Missing in Frontend** · **Stitch Conflict** | Mandatorio sobre superficies violeta |
| Mecanismo | `focus-visible` | — | `focus:` (25) predomina sobre `focus-visible:` (11) | **Frontend Conflict** | `EventFlow-Design-Tokens.md` §30 exige `focus-visible` |

### 6.9 AI

| Rol semántico | Aprobado | Stitch | Frontend | Clasificación | Acción requerida |
|---|---|---|---|---|---|
| `color.ai.surface` | `#F7F5FB` (lilac-50) | `ai-surface` `#F5F3FF` | `bg-purple-50` `#FAF5FF` (sólo en `AIBadge`); los paneles usan `bg-white` | **Frontend Conflict** · **Stitch Conflict** (cercano) | Fijar `#F7F5FB` y aplicarlo a los contenedores de panel IA |
| `color.ai.border` | `#946DF8` | `ai-border` `#946DF8` ✅ | `border-purple-300` `#D8B4FE` | **Frontend Conflict** · Stitch Match | Fijar `#946DF8` |
| `color.ai.label` | `#6238C7` | `text-ai-border` `#946DF8` ❌ | `text-purple-800` `#6B21A8` | **Frontend Conflict** · **Stitch Conflict** | Fijar `#6238C7` |
| `color.ai.icon` | `#6238C7` | Material Symbols `auto_awesome` en `#946DF8` | Lucide, sin color de token | **Frontend Conflict** · **Stitch Conflict** | Fijar `#6238C7` con glifo Lucide |
| `color.ai.text` | `#262626` | `on-surface` ✅ | `text-neutral-900` `#171717` | **Compatible Derived** | Alinear a `#262626` |
| `color.ai.pending` | `#946DF8` | — | `border-purple-500` en spinner | **Frontend Conflict** | Fijar |
| `color.ai.accepted/edited/rejected/fallback/error` | reutilizan feedback | no expuestos | `amber-*` para fallback (correcto en familia) | **Compatible Derived** | Formalizar como alias |
| Botón de acción IA | `action.primary.background` `#7B4EE8` | `bg-ai-border` `#946DF8` ❌ | `bg-purple-700` `#7E22CE` | **Frontend Conflict** · **Stitch Conflict** | Usar la acción primaria aprobada |

---

## 7. Typography validation matrix

**Premisa que afecta a toda la tabla:** el frontend no carga `Inter` ni `Inter Tight` y no define `fontFamily`. Por tanto **ninguna** fila puede clasificarse como Approved Match en familia; la columna "Valor frontend" refleja el tamaño efectivo de la utilidad de Tailwind usada, con la familia por defecto del sistema.

| Rol | Familia/estilo aprobado | Valor Stitch | Valor frontend | Clasificación | Acción requerida |
|---|---|---|---|---|---|
| **Familia headings** | `"Inter Tight", system-ui, sans-serif` | Inter Tight ✅ | **ausente** (`ui-sans-serif, system-ui`) | **Missing in Frontend** · Stitch Match | Cargar vía `next/font` y declarar `fontFamily.heading` |
| **Familia body/UI** | `"Inter", system-ui, sans-serif` | Inter ✅ | **ausente** | **Missing in Frontend** · Stitch Match | Cargar y declarar `fontFamily.body` |
| Display | Inter Tight · 60 px · 600 · 1.1 · −0.02em | Inter Tight · 48 px · 600 · 1.1 | sin equivalente | **Missing in Frontend** · **Stitch Conflict** (48 vs 60) | Definir `fontSize.display` |
| H1 | Inter Tight · 40 px · 600 · 1.25 · −0.02em | Inter Tight · 32 px · 600 · 1.2 | `text-xl` (20 px) en títulos de página | **Frontend Conflict** · **Stitch Conflict** | Definir `fontSize.h1` |
| H2 | Inter Tight · 32 px · 600 · 1.25 · 0 | Inter Tight · 24 px · 600 · 1.3 | `text-lg` (18 px) | **Frontend Conflict** · **Stitch Conflict** | Definir `fontSize.h2` |
| H3 | Inter Tight · 24 px · 600 · 1.25 · 0 | Inter Tight · 20 px · 600 · 1.4 | `text-base` / `text-sm` | **Frontend Conflict** · **Stitch Conflict** | Definir `fontSize.h3` |
| Body large | Inter · 18 px · 400 · 1.6 | Inter · 18 px · 400 · 1.5 | `text-base` (16 px) | **Frontend Conflict** · Compatible Derived (Stitch) | Definir `fontSize.body.lg` |
| Body regular | Inter · 16 px · 400 · 1.5 | Inter · 16 px · 400 · 1.5 ✅ | `text-base` (16 px) — tamaño correcto, familia incorrecta | **Compatible Derived** · **Stitch Match** | Ligar a la familia body |
| Body small | Inter · 14 px · 400 · 1.5 | Inter · 14 px · 400 · 1.4 | `text-sm` (14 px) — predominante en toda la app | **Compatible Derived** · Compatible Derived (Stitch) | Ligar a token |
| Label | Inter · 14 px · 500 · 1.5 · 0 | Inter · 14 px · 500 · 1.0 + `uppercase tracking-wide` | `text-sm font-medium` | **Compatible Derived** · **Stitch Conflict** (uppercase y tracking no aprobados para `label`) | Definir `typography.form.label`; no aplicar uppercase |
| Caption | Inter · 12 px · 400 · 1.5 | Inter · 12 px · 400 · 1.3 | `text-xs` (12 px) y `text-[10px]` (5 usos) | **Compatible Derived** · **Duplicate** (`text-[10px]` fuera de escala) | Definir `fontSize.caption`; eliminar `10px` |
| Numeric / data value | Inter · 16 px · 600 · `tnum` | Inter `tabular-nums` · 16 px (peso no declarado) | sin `tabular-nums` en `Money.tsx` | **Missing in Frontend** · Compatible Derived (Stitch) | Definir `typography.data.value` con `font-feature-settings: "tnum"` |
| Button md | Inter · 14 px · 600 · 1.0 | `font-label text-label` (14/500) | `text-sm font-medium` (14/500) | **Compatible Derived** · Compatible Derived | Alinear peso a 600 |
| Pesos | 400 / 500 / 600 / 700 | 400 / 500 / 600 / 700 ✅ | `font-medium`(500), `font-semibold`(600), `font-bold`(700) | **Approved Match** · **Stitch Match** | Ninguna |
| Line-heights | 1.1 / 1.25 / 1.5 / 1.6 | 1.1 / 1.2 / 1.3 / 1.4 / 1.5 | por defecto de Tailwind | **Missing in Frontend** · **Stitch Conflict** | Definir tokens |
| Letter-spacing | −0.02em / 0 / 0.06em | −0.02em / −0.01em declarados en DESIGN.md | `tracking-wide` (0.025em) ad hoc | **Missing in Frontend** · Compatible Derived | Definir tokens |
| Expansión multi-idioma | tolerar 20–30 % | no evidenciado | sin anchos fijos en botones (favorable) | **Provisional** | Validar con snapshots por locale |

---

## 8. Supporting foundations validation

### 8.1 Spacing

| Token aprobado | Valor | Stitch | Frontend | Clasificación | Acción |
|---|---|---|---|---|---|
| Base de escala | base-4 (con 2 y 6 px puntuales) | ritmo 8 px | escala Tailwind por defecto (base-4) | **Approved Match** | Ninguna en la base |
| `space.4` / `.6` / `.8` / `.9` | 8 / 16 / 24 / 32 px | 8 / 16 / 24 / 32 px demostrados | `gap-2`, `p-4`, `p-6`, `gap-8` en uso | **Approved Match** | Ninguna |
| `space.layout.page.mobile` | 16 px | `margin-mobile` 16 px ✅ | `px-4` (16 px) | **Approved Match** | Formalizar alias |
| `space.layout.page.tablet` | 32 px | `p-8` (32 px) ✅ | no diferenciado por breakpoint | **Missing in Frontend** | Añadir alias responsive |
| `space.layout.page.desktop` | 48 px | `margin-desktop` 32 px ❌ / `lg:p-12` 48 px ✅ | no diferenciado | **Missing in Frontend** · **Stitch Conflict** | Añadir alias |
| `space.layout.section.marketing` | 96 px | no expuesto | no existe landing tokenizada | **Missing in Frontend** | Añadir |
| `space.layout.section.platform` | 40 px | no expuesto | `space-y-6` (24 px) ad hoc | **Missing in Frontend** | Añadir |
| `space.table.cellX` / `.cellY` | 16 / 12 px | no expuesto | `px-3 py-2` ad hoc | **Missing in Frontend** | Añadir |
| `space.form.fieldGap` / `.groupGap` | 12 / 32 px | no expuesto | `mt-1`, `space-y-4` ad hoc | **Missing in Frontend** | Añadir |

### 8.2 Radius

| Token aprobado | Valor | Stitch | Frontend | Clasificación | Acción |
|---|---|---|---|---|---|
| `radius.sm` | 4 px | `DEFAULT` 0.25 rem | `rounded` (4 px) — **325 usos** | **Approved Match** (valor) | Reservar a badges/chips, no a botones |
| `radius.button` / `radius.input` | **8 px** | rotulado 8 px ✅ | `rounded-md` (**6 px**) — 229 usos | **Frontend Conflict** · Stitch Match | Redefinir `borderRadius.button/input` = 8 px |
| `radius.card` | **12 px** | rotulado 12–16 px ✅ | `rounded-lg` (8 px) — 57 usos | **Frontend Conflict** · Stitch Match | Definir `radius.card` = 12 px |
| `radius.card.prominent` / `radius.modal` / `radius.drawer` | **16 px** | rotulado 16 px ✅ | ausente (`rounded-lg` en modales) | **Missing in Frontend** · Stitch Match | Definir = 16 px |
| `radius.badge` | 9999 px | Pill ✅ | `rounded-full` — 38 usos | **Approved Match** · Stitch Match | Formalizar alias |

### 8.3 Borders

| Token aprobado | Valor | Stitch | Frontend | Clasificación | Acción |
|---|---|---|---|---|---|
| `border.width.default` | 1 px | 1 px ✅ | `border` (1 px) | **Approved Match** | Ninguna |
| `border.width.strong` | 2 px | `border-2` ✅ | `border-2` en spinners | **Approved Match** | Ninguna |
| `border.style.solid` | solid | solid ✅ | solid | **Approved Match** | Ninguna |
| `border.input.default` | 1 px `#D4D4D4` | 1 px `#D4D4D4` (DESIGN.md) ✅ | `border border-neutral-300` | **Approved Match** + Hardcoded | Exponer alias `input.border` |
| `border.input.focus` | 2 px `#946DF8` | violeta en foco ✅ | `focus:border-purple-500` / `brand-500` | **Frontend Conflict** | Fijar al violeta aprobado |
| `border.card.default` | 1 px `#E5E5E5` | 1 px `#E5E5E5` ✅ | `border-neutral-200` | **Approved Match** + Hardcoded | Exponer `card.border` |
| `border.ai.default` | 1 px `#946DF8` | 1 px `#946DF8` ✅ | `border-purple-300` `#D8B4FE` | **Frontend Conflict** · Stitch Match | Fijar `#946DF8` |

### 8.4 Shadows

| Token aprobado | Valor | Stitch | Frontend | Clasificación | Acción |
|---|---|---|---|---|---|
| `shadow.surface.subtle` | `0 1px 2px rgba(23,23,23,.04)` | `shadow-sm` genérico / DESIGN.md `0 2px 4px rgba(0,0,0,.04)` | `shadow-sm` — 47 usos | **Compatible Derived** · **Stitch Conflict** | Definir `boxShadow` propio |
| `shadow.surface.raised` | `0 2px 6px rgba(23,23,23,.06)` | no expuesto | ausente | **Missing in Frontend** | Añadir |
| `shadow.overlay.dropdown` | `0 8px 16px …, 0 2px 4px …` | `shadow-md` genérico | `shadow-lg` — 14 usos | **Compatible Derived** | Definir |
| `shadow.overlay.modal` | `0 20px 40px rgba(23,23,23,.12), 0 8px 16px …` | `shadow-xl` genérico / DESIGN.md `0 12px 32px` | `shadow-xl` — 14 usos | **Compatible Derived** · **Stitch Conflict** | Definir |
| `shadow.marketing.floating` | `0 30px 60px -20px …, 0 10px 20px -10px …` | no expuesto | ausente | **Missing in Frontend** | Añadir |
| Regla "la sombra no es el único separador" | UI-DEC-007 | cumplida (borde + sombra) ✅ | cumplida (borde + sombra) ✅ | **Approved Match** | Ninguna |

### 8.5 Focus

| Token aprobado | Valor | Stitch | Frontend | Clasificación | Acción |
|---|---|---|---|---|---|
| `focus.ring.width` | 2 px | `ring-4` / `outline-2` | `ring-2` (25) / `ring-1` (4) | **Duplicate** · Stitch Conflict | Fijar 2 px |
| `focus.ring.style` | solid | solid ✅ | solid | **Approved Match** | Ninguna |
| `focus.ring.color` | `#6238C7` | `#946DF8`@20 % / `#683ec9` | 7 colores distintos | **Frontend Conflict** · **Stitch Conflict** | Token único |
| `focus.ring.offset` | 2 px | sólo en Actions | 5 de 37 declaraciones | **Missing in Frontend** | Obligatorio |
| `focus.ring.offsetColor` | `#FFFFFF` | ausente | ausente | **Missing in Frontend** · **Stitch Conflict** | Obligatorio |
| Mecanismo `focus-visible` | obligatorio | n/a | `focus:` predomina; `focus:outline-none` × 46 | **Frontend Conflict** | Migrar a `focus-visible` |

### 8.6 Icon sizes

| Token aprobado | Valor | Stitch | Frontend | Clasificación | Acción |
|---|---|---|---|---|---|
| `icon.size.sm` | 16 px | S 14 px ❌ / M 16 px ✅ | `h-4 w-4` (16 px) predominante | **Approved Match** · **Stitch Conflict** (introduce un 14 px no aprobado) | Formalizar |
| `icon.size.md` | 20 px | L 20 px ✅ | uso puntual | **Approved Match** · Stitch Match | Formalizar |
| `icon.size.lg` | 24 px | XL 24 px ✅ | uso puntual | **Approved Match** · Stitch Match | Formalizar |
| `icon.stroke.default` / `.strong` | 1.5 / 2 px | n/a (Font Awesome es fill) | por defecto de Lucide (2 px) | **Provisional** | Fijar `strokeWidth` 1.5 por defecto |
| Librería | **`lucide-react`** (ratificada) | **Font Awesome** + Material Symbols mezclados | `lucide-react`, familia única | **Approved Match** · **Stitch Conflict** | Ninguna en el frontend; **no** adoptar Font Awesome |
| Touch target | ≥ 44 × 44 px | `h-11` = 44 px ✅ | `h-8` × 9, `h-10` × 1, `h-11` × 2 | **Frontend Conflict** | Auditar controles icon-only |

### 8.7 Layout

| Token aprobado | Valor | Stitch | Frontend | Clasificación | Acción |
|---|---|---|---|---|---|
| `layout.sidebar.width` | 256 px | `w-64` = 256 px ✅ | `w-60` = **240 px** | **Frontend Conflict** · Stitch Match | Ajustar a 256 px |
| `layout.container.marketing.max` | 1280 px | 1280 px ✅ | ausente | **Missing in Frontend** · Stitch Match | Añadir |
| `layout.container.form.max` | 720 px | no expuesto | `max-w-2xl` (672) / `max-w-3xl` (768) mezclados | **Duplicate** · Compatible Derived | Definir alias 720 px |
| `layout.container.content.max` | 1440 px | no expuesto | `max-w-6xl` (1152) / `max-w-5xl` (1024) | **Missing in Frontend** | Añadir |
| `layout.header.height` | 64 px | no expuesto | no tokenizado | **Missing in Frontend** | Añadir |
| Grid 12 / 8 / 4 | UI-DEC-012 | declarado en DESIGN.md ✅ | sin sistema de grid explícito | **Missing in Frontend** · Stitch Match | Definir en la implementación de layout |
| Sidebar visible desde `lg` | 1024 px | oculto bajo `md` ❌ | `lg:block` (1024 px) ✅ | **Approved Match** · **Stitch Conflict** | Ninguna |

### 8.8 Breakpoints

| Token aprobado | Valor | Stitch | Frontend | Clasificación | Acción |
|---|---|---|---|---|---|
| `breakpoint.sm` | 640 px | Tailwind default 640 | Tailwind default 640 | **Approved Match** | Ninguna |
| `breakpoint.md` | 768 px | 768 | 768 | **Approved Match** | Ninguna |
| `breakpoint.lg` | 1024 px | 1024 | 1024 | **Approved Match** | Ninguna |
| `breakpoint.xl` | 1280 px | 1280 | 1280 | **Approved Match** | Ninguna |
| `breakpoint.2xl` | 1536 px | 1536 | 1536 | **Approved Match** | Ninguna |

Los breakpoints por defecto de Tailwind coinciden exactamente con TOK-DEC-015. **No requieren cambio**; conviene declararlos explícitamente en `screens` para hacer explícita la trazabilidad.

### 8.9 Motion, z-index, opacity

| Área | Aprobado | Stitch | Frontend | Clasificación | Acción |
|---|---|---|---|---|---|
| Durations | 0 / 120 / 200 / 320 ms | no expuesto | `transition`/`transition-colors` por defecto (150 ms) | **Missing in Frontend** | Añadir |
| Easings | standard / enter / exit | no expuesto | por defecto | **Missing in Frontend** | Añadir |
| `prefers-reduced-motion` | obligatorio | no expuesto | **no implementado** | **Missing in Frontend** | Añadir bloque `@media` en `globals.css` |
| Z-index | 0/10/100/200/300/400/500 | no expuesto | `z-50`, `z-[60]` ad hoc | **Missing in Frontend** · Hardcoded | Añadir escala |
| Opacity | 0.4 / 0.6 / 0.7 / 0.9 | `opacity-50` en disabled | `disabled:opacity-60` | **Compatible Derived** | Formalizar |

---

## 9. Accessibility and contrast results

Ratios calculados con la fórmula de luminancia relativa sRGB de WCAG 2.1. Umbrales: **4.5:1** texto normal (1.4.3) · **3:1** texto grande y componentes/indicadores no textuales (1.4.11).

### 9.1 Combinaciones aprobadas (validación del sistema documentado)

| Foreground | Background | Uso previsto | Resultado | Estado | Recomendación |
|---|---|---|---|---|---|
| `text.primary` `#262626` | `background.default` `#FFFFFF` | Texto principal | **15.13:1** | ✅ AAA | Ninguna |
| `text.secondary` `#525252` | `#FFFFFF` | Texto secundario | **7.81:1** | ✅ AAA | Ninguna |
| `text.muted` `#737373` | `#FFFFFF` | Placeholder / caption | **4.74:1** | ✅ AA | Reservar a caption/placeholder |
| `action.primary.foreground` `#FFFFFF` | `action.primary.background` `#7B4EE8` | CTA primaria plataforma | **5.13:1** | ✅ AA | Ninguna |
| `text.inverse` `#FFFFFF` | `marketing.cta.background` `#171717` | CTA oscura de landing | **17.93:1** | ✅ AAA | Ninguna |
| `text.link` `#6238C7` | `#FFFFFF` | Links en producto | **7.22:1** | ✅ AAA | Ninguna |
| `focus.ring` `#6238C7` | `#FFFFFF` | Focus sobre blanco | **7.22:1** | ✅ | Ninguna |
| `focus.ring` `#6238C7` | `#7B4EE8` (sin offset) | Focus sobre CTA violeta | **1.41:1** | ❌ | **Mitigación aprobada**: offset blanco de 2 px (`#FFFFFF` vs `#7B4EE8` = **5.13:1** ✅). Obligatorio |
| `feedback.error.text` `#B91C1C` | `#FEF2F2` | Texto de error | **5.91:1** | ✅ AA | Ninguna |
| `feedback.warning.text` `#B45309` | `#FFFBEB` | Texto de warning | **4.84:1** | ✅ AA | Margen ajustado; no reducir |
| `feedback.success.text` `#15803D` | `#ECFDF5` | Texto de éxito | **4.76:1** | ✅ AA | Margen ajustado; no reducir |
| `feedback.info.text` `#1D4ED8` | `#EFF6FF` | Texto informativo | **6.16:1** | ✅ AA | Ninguna |
| `ai.text` `#262626` | `ai.surface` `#F7F5FB` | Texto en panel IA | **13.99:1** | ✅ AAA | Ninguna |
| `ai.label` `#6238C7` | `#F7F5FB` | "Sugerencia de IA" | **6.67:1** | ✅ AA | Ninguna |
| `ai.border` `#946DF8` | `#F7F5FB` | Borde del panel IA | **3.35:1** | ✅ (no textual) | **Provisional** — margen estrecho; CMP-Q-003 pide validación visual. Promover a `#7B4EE8` si resulta débil |
| `violet.500` `#946DF8` | `#FFFFFF` | Como **texto** | **3.62:1** | ❌ | **Prohibido como texto** (Design Tokens §32). Usar `violet.700` |
| `lilac.300` `#C4B7E5` | `#FFFFFF` | Como texto/icono | **1.87:1** | ❌ | **Prohibido** (UI-DEC-002). Sólo decorativo |
| `coral.300` `#EE8C8D` | `#FFFFFF` | Como texto/icono | **2.39:1** | ❌ | **Prohibido** (UI-DEC-002). Sólo decorativo |

**Conclusión:** el sistema aprobado no publica ninguna combinación que falle AA. Las tres que fallan están explícitamente prohibidas por sus propias reglas, y el fallo del focus ring sobre violeta tiene mitigación normativa obligatoria.

> Discrepancia menor y no bloqueante: `EventFlow-Design-Tokens.md` §32 declara 14.68:1 para `#262626`/blanco, 5.98:1 para warning y 5.14:1 para success; el recálculo da 15.13:1, 4.84:1 y 4.76:1. Todas las conclusiones AA/AAA se mantienen, pero los márgenes reales de warning y success son menores que los documentados. Registrado como **Provisional** — conviene corregir los números del documento en una revisión futura y no reducir esos tonos.

### 9.2 Combinaciones reales del frontend

| Foreground | Background | Uso previsto | Resultado | Estado | Recomendación |
|---|---|---|---|---|---|
| `text-neutral-800` `#262626` | blanco | Texto principal | **15.13:1** | ✅ AAA | Migrar a token `text.primary` |
| `text-neutral-900` `#171717` | blanco | Texto principal (alterno) | **17.93:1** | ✅ AAA (contraste OK, **token incorrecto**) | Consolidar en `#262626` |
| `text-neutral-700` `#404040` | blanco | Texto de cuerpo | **10.37:1** | ✅ AAA | Consolidar |
| `text-neutral-600` `#525252` | blanco | Texto secundario | **7.81:1** | ✅ AAA | Migrar a token |
| `text-neutral-500` `#737373` | blanco | Meta/muted | **4.74:1** | ✅ AA | Reservar a meta |
| `text-neutral-500` `#737373` | `bg-neutral-50` `#FAFAFA` | Muted sobre superficie sutil | **4.54:1** | ✅ AA (margen mínimo) | No usar sobre fondos más oscuros |
| blanco | `bg-blue-600` `#2563EB` | Botón primario actual | **5.17:1** | ✅ AA (contraste OK, **color de marca incorrecto**) | Reemplazar por `#7B4EE8` (5.13:1) |
| blanco | `bg-purple-700` `#7E22CE` | CTA de paneles IA | **6.98:1** | ✅ AA (**familia incorrecta**) | Reemplazar por `#7B4EE8` |
| blanco | `bg-neutral-900` `#171717` | CTA oscura | **17.93:1** | ✅ AAA | Formalizar como `marketing.cta` |
| blanco | `bg-red-600` `#DC2626` | Acción destructiva | **4.83:1** | ✅ AA | Migrar a token |
| `text-purple-800` `#6B21A8` | `bg-purple-50` `#FAF5FF` | Badge "Sugerido por IA" | **8.13:1** | ✅ AAA (**tokens incorrectos**) | Reemplazar por `#6238C7` sobre `#F7F5FB` (6.67:1) |
| `text-red-800` `#991B1B` | `bg-red-50` `#FEF2F2` | Banner de error | **7.60:1** | ✅ AAA | Consolidar en `#B91C1C` |
| `text-red-700` `#B91C1C` | `bg-red-50` | Error inline | **5.91:1** | ✅ AA | Migrar a token |
| `text-amber-800` `#92400E` | `bg-amber-50` `#FFFBEB` | Warning | **6.84:1** | ✅ AAA | Consolidar en `#B45309` |
| `text-green-800` `#166534` | `bg-emerald-50` `#ECFDF5` | Éxito | **6.77:1** | ✅ AAA (**familias mezcladas**) | Unificar en la familia green aprobada |
| `text-blue-700` `#1D4ED8` | `bg-blue-50` `#EFF6FF` | Info | **6.16:1** | ✅ AA | Migrar a token |
| **`focus:ring-purple-400` `#C084FC`** | **blanco** | **Focus ring de paneles IA (11 usos)** | **2.64:1** | ❌ **FALLA WCAG 1.4.11** | **Reemplazar por `#6238C7` (7.22:1)** |
| **`focus:ring-purple-400` `#C084FC`** | **`bg-purple-700` `#7E22CE`** | **Focus sobre botón IA** | **2.64:1** | ❌ **FALLA WCAG 1.4.11** | **`#6238C7` + offset blanco de 2 px** |
| `focus-visible:ring-blue-500` `#3B82F6` | blanco | Focus | **3.68:1** | ✅ (color incorrecto) | Migrar a `#6238C7` |
| `focus:ring-indigo-500` `#6366F1` | blanco | Focus | **4.47:1** | ✅ (color incorrecto) | Migrar |
| `focus-visible:ring-neutral-900` | blanco | Focus | **17.93:1** | ✅ (color incorrecto) | Migrar |
| **`focus:ring-brand-500`** | blanco | **Focus (3 usos)** | **n/a — la clase no existe** | ❌ **Sin indicador de foco** | **Definir el token; hoy no se renderiza ningún anillo** |
| `border-purple-300` `#D8B4FE` | `bg-purple-50` | Borde de contenedor IA | **1.65:1** | ⚠️ **Provisional** | Reemplazar por `#946DF8` sobre `#F7F5FB` (3.35:1) |
| `border-red-300` `#FCA5A5` | `bg-red-50` | Borde de alerta | **1.74:1** | ⚠️ Provisional | Usar `#FECACA`… el estado se comunica además por icono+texto |
| `border-amber-300` `#FCD34D` | `bg-amber-50` | Borde de alerta | **1.39:1** | ⚠️ Provisional | Ídem |
| `border-neutral-300` `#D4D4D4` | blanco | Borde de input | **1.48:1** | ⚠️ Provisional (aceptado por el sistema) | `EventFlow-Design-Tokens.md` §9.3 lo acepta como límite decorativo; el foco aporta el indicador de 3:1 |

**Fallos accionables de accesibilidad: 2** (más 1 defecto funcional).

1. **`focus:ring-purple-400` — 2.64:1, 11 ocurrencias.** Incumple WCAG 2.1 AA 1.4.11 (Non-text Contrast) para indicadores de foco. Afecta a todos los paneles de IA. **El valor aprobado ya existe** (`focus.ring.color` `#6238C7`, 7.22:1) — no requiere decisión.
2. **`focus:ring-brand-500` — clase inexistente, 3 ocurrencias** en `QuoteRequestForm.tsx`. Tailwind no genera nada: esos controles quedan **sin indicador de foco visible** además de sin fondo (`bg-brand-600`). Es simultáneamente un fallo de accesibilidad y un defecto visual.
3. **Ausencia total del offset blanco** en el focus ring. Con la marca violeta implementada, `EventFlow-Design-Tokens.md` §32 lo vuelve **obligatorio** para el foco sobre CTA violeta (sin él, 1.41:1).

Bordes de contenedor por debajo de 3:1 (`purple-300`, `red-300`, `amber-300`, `neutral-300`): clasificados **Provisional**, no fallo. El estado semántico se comunica también por icono y texto (`AIBadge` usa `role="status"` + `aria-label`), de modo que WCAG 1.4.1 se cumple; y el sistema aprobado acepta explícitamente `border.default` a 1.61:1 como límite decorativo. Aun así, el borde del panel IA debe subir al `#946DF8` aprobado por ser el elemento que delimita el contenedor.

### 9.3 Otras verificaciones

| Verificación | Resultado |
|---|---|
| `focus:outline-none` sin reemplazo garantizado | **46 ocurrencias** — auditar que cada una aporte un anillo equivalente |
| `focus-visible` vs `focus` | 11 vs 25 — la guía aprobada exige `focus-visible` |
| `prefers-reduced-motion` | **no implementado** — UI-DEC-015 lo exige |
| Dark mode | 0 ocurrencias ✅ conforme |
| Temas por rol | 0 ocurrencias ✅ conforme |
| Colores decorativos como texto | 0 ocurrencias de lilac/coral ✅ conforme (no están implementados) |
| Touch targets | `h-8` (32 px) × 9 — auditar controles icon-only frente al mínimo de 44 px |

---

## 10. Frontend conflicts

| # | Archivo | Valor actual | Valor aprobado | Impacto | Reemplazo recomendado | ¿Seguro a nivel de token? |
|---|---|---|---|---|---|---|
| FC-01 | `web/tailwind.config.ts:12` | `primary: colors.blue` | escala violeta; `action.primary.background` `#7B4EE8` | **Alto** — la marca no se aplica; el producto se ve azul | Escala violeta aprobada (50/500/600/700/800) | **Sí** — cambio de un valor; se propaga a los 5 consumidores |
| FC-02 | `web/tailwind.config.ts:14` | `success: colors.emerald` | familia green (`#16A34A`/`#15803D`/`#ECFDF5`) | Medio — dos familias verdes conviven | Familia green aprobada | **Sí** |
| FC-03 | `web/src/app/layout.tsx` | sin carga de fuentes | `Inter` + `Inter Tight` vía `next/font` | **Alto** — la identidad tipográfica no existe | `next/font/google` con ambas familias + `fontFamily` en Tailwind | **Sí** — aditivo |
| FC-04 | `web/tailwind.config.ts` | sin `fontSize`/`lineHeight`/`letterSpacing` | escala completa §12 | **Alto** — jerarquía tipográfica ausente | Definir la escala aprobada | **Sí** — aditivo |
| FC-05 | 11 archivos `features/ai/**` | `focus:ring-purple-400` (2.64:1) | `focus.ring` `#6238C7` (7.22:1) | **Alto** — falla WCAG 1.4.11 | Token de foco único + offset blanco | **Sí** vía token; requiere pasada de clases |
| FC-06 | `features/quotes/components/QuoteRequestForm.tsx:135,155,170` | `bg-brand-600`, `focus:ring-brand-500`, `hover:bg-brand-700` — **clases inexistentes** | acción primaria violeta | **Alto** — botón sin fondo y sin foco visible | Definir el token `brand`/violeta; las clases pasan a resolver | **Sí** — definir el token corrige las 3 al instante |
| FC-07 | `shared/navigation/NavLink.tsx:22` | `bg-primary-50 text-primary-700` (azul) | `sidebar.item.activeBackground` `#F5F1FE` / `activeForeground` `#6238C7` | Medio — el estado activo no es de marca | Alias de sidebar violeta | **Sí** — se corrige al arreglar FC-01 |
| FC-08 | `shared/navigation/Sidebar.tsx:19` | `w-60` (240 px) | `layout.sidebar.width` 256 px | Bajo | `w-64` o token de layout | **Sí** |
| FC-09 | 229 usos de `rounded-md` (6 px) | 6 px en botones/inputs | `radius.button`/`radius.input` **8 px** | Medio — forma fuera de sistema | Redefinir `borderRadius` en el theme | **Sí** — redefinir `md` = 8 px propaga sin tocar componentes |
| FC-10 | 57 usos de `rounded-lg` en cards | 8 px | `radius.card` **12 px** | Medio | Alias `rounded-card` = 12 px | Parcial — requiere distinguir card de control |
| FC-11 | 109 usos de `text-neutral-900` | `#171717` como texto de cuerpo | `text.primary` `#262626` | Medio — `#171717` está reservado a superficie inversa | `text-neutral-800` / token | **Sí** a nivel de token |
| FC-12 | 46 usos de `focus:outline-none` | supresión del contorno | anillo equivalente obligatorio | Medio | Auditar; combinar siempre con `focus-visible:ring-*` | Requiere auditoría |
| FC-13 | 7 colores de anillo en 37 declaraciones | `purple-400`, `blue-500`, `indigo-500`, `neutral-900/500/400`, `red-500/600`, `brand-500` | un único `#6238C7` | **Alto** — foco inconsistente | Utilidad/token único de foco | **Sí** vía token + pasada de clases |
| FC-14 | paneles `features/ai/**` | `bg-white`, `border-purple-300`, `text-purple-800` | `ai.surface` `#F7F5FB`, `ai.border` `#946DF8`, `ai.label` `#6238C7` | **Alto** — el tratamiento IA no es el aprobado (UI-DEC-010) | Tokens `ai.*` | **Sí** vía token |
| FC-15 | 84 usos de `text-red-800` / 15 de `text-amber-800` / 11 de `amber-900` | tonos fuera de token | `#B91C1C` / `#B45309` | Bajo — todos pasan AA | Consolidar en el token aprobado | **Sí** |
| FC-16 | `globals.css` | sin `@media (prefers-reduced-motion)` | obligatorio (UI-DEC-015) | Medio — incumple accesibilidad | Añadir bloque global | **Sí** — aditivo |

---

## 11. Missing tokens

Tokens aprobados sin ninguna representación en el frontend. Agrupados por familia (19 grupos).

| # | Grupo | Tokens ausentes | Prioridad |
|---|---|---|---|
| MT-01 | **Familias tipográficas** | `font.family.heading`, `font.family.body`, `font.family.ui` (+ carga real de Inter / Inter Tight) | **P0** |
| MT-02 | **Escala tipográfica** | `font.size.*` (9), `font.lineHeight.*` (4), `font.letterSpacing.*` (3) | **P0** |
| MT-03 | **Alias tipográficos** | `typography.marketing.*` (4), `typography.platform.*` (3), `typography.body.*` (2), `typography.form.*` (3), `typography.button.*` (2), `typography.data.*` (4) | P1 |
| MT-04 | **Escala violeta** | `color.violet.50/100/200/300/400/500/600/700/800/900` | **P0** |
| MT-05 | **Escalas decorativas** | `color.lilac.*` (5), `color.coral.*` (5) | P2 (landing) |
| MT-06 | **Alias de texto** | `color.text.link`, `color.text.linkHover` | P1 |
| MT-07 | **Tokens de foco** | `focus.ring.width/style/color/offset/offsetColor` | **P0** |
| MT-08 | **Tokens de IA** | `color.ai.surface/surfaceHover/border/borderStrong/text/icon/label/pending/accepted/edited/rejected/fallback/error` | **P0** |
| MT-09 | **Alias de plataforma** | `color.platform.cta.*`, `color.platform.sidebar.*` (4), `color.platform.page.background` | P1 |
| MT-10 | **Alias de marketing** | `color.marketing.cta.*` (3), `color.marketing.accent.*` (2), `color.marketing.hero.surface` | P2 |
| MT-11 | **Bordes semánticos** | `color.border.strong`, `color.border.interactive`, `color.border.disabled` | P1 |
| MT-12 | **Sombras** | `shadow.surface.subtle/raised`, `shadow.overlay.dropdown/modal`, `shadow.marketing.floating` | P1 |
| MT-13 | **Radius** | `radius.button/input` (8), `radius.card` (12), `radius.card.prominent`/`modal`/`drawer` (16), `radius.badge` | P1 |
| MT-14 | **Layout** | `layout.container.marketing.max` (1280), `.form.max` (720), `.content.max` (1440), `layout.sidebar.width` (256), `layout.header.height` (64), `layout.page.padding.*` (3), `layout.grid.*` | P1 |
| MT-15 | **Spacing semántico** | `space.inline.*` (3), `space.component.padding.*` (3), `space.layout.*` (5), `space.form.*` (2), `space.table.*` (2) | P2 |
| MT-16 | **Motion** | `motion.duration.*` (4), `motion.easing.*` (3), aliases (7), `motion.reduced.duration` | P1 |
| MT-17 | **Z-index** | `zIndex.base/sticky/dropdown/drawer/modal/toast/tooltip` | P2 |
| MT-18 | **Opacity / selección / overlay** | `opacity.*` (5), `color.selection.*` (2), `color.overlay.scrim` | P2 |
| MT-19 | **Iconos y sizing** | `icon.size.*` (3), `icon.stroke.*` (2), `size.control.*` (3), `size.touch.minimum` (44), `size.avatar.*` (3) | P1 |

Además, **la capa de CSS custom properties completa** (`:root`) no existe — `EventFlow-Design-Tokens.md` §28 y §30 la designan como fuente única del sistema.

---

## 12. Duplicate and hardcoded values

### 12.1 Duplicados semánticos

| Propósito semántico | Valores en uso | Aprobado | Ocurrencias |
|---|---|---|---|
| Texto principal | `neutral-900` `#171717` · `neutral-800` `#262626` · `neutral-700` `#404040` | `#262626` | 109 · 112 · 161 |
| Texto de error | `red-800` `#991B1B` · `red-700` `#B91C1C` · `red-900` `#7F1D1D` | `#B91C1C` | 84 · 68 · 10 |
| Texto de warning | `amber-800` `#92400E` · `amber-900` `#78350F` | `#B45309` | 15 · 11 |
| Familia de éxito | `emerald-*` · `green-*` | green (`#16A34A`/`#15803D`) | 37 · 29 |
| Color de foco | `purple-400`, `blue-500`, `indigo-500`, `neutral-900`, `neutral-500`, `neutral-400`, `red-500`, `red-600`, `brand-500` | `#6238C7` | 37 declaraciones / 9 valores |
| Grosor de foco | `ring-2` · `ring-1` | 2 px | 25 · 4 |
| Ancho de formulario | `max-w-2xl` (672) · `max-w-3xl` (768) | 720 px | mezclados |
| Ancho de contenido | `max-w-5xl` (1024) · `max-w-6xl` (1152) | 1440 px cap | mezclados |
| Radio de control | `rounded` (4) · `rounded-md` (6) · `rounded-lg` (8) | 8 px botones/inputs, 12 px cards | 325 · 229 · 57 |

### 12.2 Utilidades de paleta cruda (hardcoded a nivel de arquitectura)

**2 006 ocurrencias en 173 archivos `.tsx`** de producción. Ninguna consume un token semántico. Es la desviación estructural principal frente a `EventFlow-Design-Tokens.md` §30 ("prohibido usar hex, px o rem crudos en JSX/CSS cuando exista un token equivalente") y §5 principio 1 ("los componentes consumen tokens semánticos").

Advertencia importante: la mayoría **no son valores incorrectos**, son valores correctos expresados por el mecanismo equivocado. Eso hace que la corrección de tokens sea de bajo riesgo, pero la migración de clases sea de alto volumen.

### 12.3 Clases inexistentes (defecto funcional)

| Archivo | Línea | Clase | Efecto |
|---|---|---|---|
| `features/quotes/components/QuoteRequestForm.tsx` | 170 | `bg-brand-600` | Botón **sin color de fondo** |
| `features/quotes/components/QuoteRequestForm.tsx` | 170 | `hover:bg-brand-700` | Sin estado hover |
| `features/quotes/components/QuoteRequestForm.tsx` | 135, 155, 170 | `focus:ring-brand-500`, `focus:border-brand-500` | **Sin indicador de foco visible** |

`brand` no existe en `tailwind.config.ts`. Definir el token violeta bajo ese nombre — o renombrar las clases — resuelve las tres de forma inmediata.

### 12.4 Colores hex literales

**0 en código de producción.** Los 8 literales encontrados están todos en `src/tests/a11y/us131-focus-trap-modal.test.tsx` como valores esperados de un test de contraste — uso legítimo. Nota: ese test codifica `#171717` como "texto principal", con lo que **fijará la desviación FC-11** y deberá actualizarse cuando se consolide `#262626`.

### 12.5 Valores arbitrarios de Tailwind

| Valor | Usos | Comentario |
|---|---|---|
| `text-[10px]` | 5 | Fuera de la escala aprobada (mínimo `caption` 12 px) |
| `z-[60]` | 3 | Debe consumir la escala `zIndex.*` |
| `w-[min(640px,92vw)]`, `w-[min(560px,90vw)]`, `w-[min(520px,90vw)]` | 6 | Anchos de modal; deberían derivar de tokens de layout |
| `grid-cols-[...]` | 6 | Rejillas de tabla — aceptable como composición |
| `min-h-[60vh]`, `max-h-[50vh]`, `max-w-[80vw]` | 3 | Aceptables |

Sin declaraciones `style={{ color }}` ni `style={{ background }}` en línea. Sin `@font-face` propios.

**No se recomienda todavía un refactor amplio de componentes** — véase §13.

---

## 13. Proposed implementation plan

Secuencia mínima segura, ordenada por relación impacto/riesgo. Los pasos 1–7 son cambios a nivel de token, casi todos aditivos y propagables sin tocar componentes.

**Paso 1 — Corregir la carga de fuentes.**
`web/src/app/layout.tsx`: importar `Inter` e `Inter Tight` con `next/font/google`, exponerlos como CSS variables y aplicarlas al `<html>`/`<body>`. Declarar `fontFamily.heading` / `fontFamily.body` / `fontFamily.ui` en `web/tailwind.config.ts`. Resuelve MT-01 y FC-03. Sin cambios en componentes.

**Paso 2 — Establecer la capa de custom properties.**
En `web/src/app/globals.css`, crear el bloque `:root` con la capa semántica completa (color, focus, radius, shadow, layout, motion, z-index), como fuente única (`EventFlow-Design-Tokens.md` §28/§30). Añadir el bloque `@media (prefers-reduced-motion: reduce)` (FC-16). Aditivo.

**Paso 3 — Corregir los primitivos de marca.**
En `tailwind.config.ts`, sustituir `primary: colors.blue` por la escala violeta aprobada y `success: colors.emerald` por la familia green. Añadir las escalas lilac y coral. Definir `brand` apuntando al violeta para que las clases rotas de FC-06 resuelvan. Resuelve FC-01, FC-02, FC-06, FC-07 y MT-04.

**Paso 4 — Corregir los alias semánticos.**
Mapear en `theme.extend.colors` los semánticos aprobados (`text.*`, `surface.*`, `background.*`, `border.*`, `action.*`, `feedback.*`, `marketing.*`, `platform.*`) contra las custom properties del paso 2. Resuelve MT-06, MT-09, MT-10, MT-11.

**Paso 5 — Corregir los tokens de foco.**
Definir `focus.ring.*` incluyendo el **offset blanco obligatorio**. Publicar una única utilidad o clase de componente para el foco. Sustituir de inmediato los 11 `focus:ring-purple-400` (fallo WCAG confirmado) y los 3 `focus:ring-brand-500` (sin renderizado). Migrar `focus:` a `focus-visible:`. Resuelve MT-07, FC-05, FC-12, FC-13.

**Paso 6 — Corregir los tokens de IA.**
Definir `color.ai.*` con los valores aprobados y aplicarlos a los contenedores, badges, labels e iconos de `features/ai/**`. Mantener el glifo sparkle en **Lucide**. Resuelve MT-08 y FC-14. Es el paso con mayor impacto de producto (UI-DEC-010 es mandatorio).

**Paso 7 — Corregir forma, elevación, layout y escala tipográfica.**
Definir `borderRadius` (8/12/16/full), `boxShadow` (los 5 aprobados), `fontSize`/`lineHeight`/`letterSpacing`, `screens` explícitos, `zIndex`, y los tokens de layout (sidebar 256, header 64, containers 720/1280/1440). Corregir `w-60` → `w-64`. Resuelve MT-02, MT-12, MT-13, MT-14, MT-16, MT-17, MT-19, FC-08, FC-09.

**Paso 8 — Eliminar duplicados a nivel de token.**
Consolidar texto principal en `#262626`, error en `#B91C1C`, warning en `#B45309`, éxito en la familia green. Actualizar `src/tests/a11y/us131-focus-trap-modal.test.tsx`, que hoy codifica `#171717` como texto principal. Resuelve FC-11 y FC-15.

**Paso 9 — Validar.**
`npm run lint` · `npm run typecheck` · `npm run test` · `npm run test:a11y` · `npm run build`. Re-ejecutar la matriz de contraste. Verificar los 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`) frente a la expansión de texto del 20–30 %. Verificar que no se introdujeron variantes `dark:` ni temas por rol.

**Paso 10 — Refactor de componentes (fase posterior, US separada).**
Migrar las 2 006 utilidades crudas a clases de token. **No forma parte de esta corrección.** Debe planificarse por feature, con snapshots de regresión visual, tras congelar la capa de tokens. Añadir en ese momento el linting (`eslint-plugin-tailwindcss` / `stylelint`) que `EventFlow-Design-Tokens.md` §30 exige para impedir la reaparición de valores crudos.

---

## 14. Files proposed for modification

Ningún archivo fue modificado en esta tarea.

| Archivo | Cambio propuesto | Motivo | Riesgo |
|---|---|---|---|
| `web/src/app/layout.tsx` | Añadir `next/font/google` para `Inter` e `Inter Tight`; aplicar las variables al `<html>`/`<body>` | UI-DEC-004; MT-01; FC-03 | **Bajo** — aditivo; no altera estructura ni providers |
| `web/src/app/globals.css` | Añadir bloque `:root` con la capa semántica + `@media (prefers-reduced-motion)` | Design Tokens §28/§30; UI-DEC-015 | **Bajo** — aditivo; hoy el archivo tiene 3 líneas |
| `web/tailwind.config.ts` | Reescribir `theme.extend`: colores semánticos, `fontFamily`, `fontSize`, `lineHeight`, `letterSpacing`, `borderRadius`, `boxShadow`, `screens`, `zIndex`, `spacing` de layout | UI-DEC-002/004/006/007/012; TOK-DEC-004..017 | **Medio** — `primary` pasa de azul a violeta y afecta a 5 consumidores; redefinir `rounded-md` a 8 px se propaga a 229 usos (efecto deseado, pero visible) |
| `web/src/shared/design-tokens/` | Poblar con el módulo de tokens (hoy sólo `.gitkeep`) | Ubicación ya prevista por la arquitectura | **Bajo** — directorio vacío reservado |
| `web/src/features/ai/**/components/*.tsx` (≈12 archivos) | Sustituir `purple-*` por los tokens `ai.*` y el foco aprobado | UI-DEC-010 mandatorio; fallo WCAG confirmado | **Medio** — toca componentes, pero sólo clases de presentación |
| `web/src/features/quotes/components/QuoteRequestForm.tsx` | Resolver las clases `brand-*` inexistentes | Defecto funcional: botón sin fondo, control sin foco | **Bajo** — se corrige al definir el token |
| `web/src/shared/navigation/NavLink.tsx` | Estado activo a los alias violeta de sidebar | `sidebar.item.active*` | **Bajo** — se corrige al arreglar `primary` |
| `web/src/shared/navigation/Sidebar.tsx` | `w-60` → `w-64` (256 px) | `layout.sidebar.width` | **Bajo** |
| `web/src/tests/a11y/us131-focus-trap-modal.test.tsx` | Actualizar `#171717` → `#262626` como texto principal esperado | El test fija hoy la desviación FC-11 | **Bajo** — el nuevo valor sigue pasando AAA (15.13:1) |

---

## 15. Decisions and open questions

| # | Cuestión | Clasificación | Nota |
|---|---|---|---|
| Q-01 | Librería de iconos (`UI-Q-002` / `TOK-Q-005` / `CMP-Q-001`) | **Resuelta** | El operador ratifica **`lucide-react`**. Consistente con `docs/15-Frontend-Architecture-Design.md` y con el estado real del código. El "Font Awesome" de Stitch se descarta. Puede cerrarse formalmente en los tres documentos |
| Q-02 | `color.ai.border` `#946DF8` sobre `ai.surface` = 3.35:1 (`CMP-Q-003`) | **Provisional** | Cumple 3:1 con margen estrecho. Validar en render real; alternativa aprobada: promover a `#7B4EE8`. No bloquea |
| Q-03 | CTA violeta: `violet-600` por defecto vs `violet-700` (`TOK-Q-001`) | **No bloqueante** | Ambas cumplen AA. El plan asume `#7B4EE8` / hover `#6238C7` según §9.4 de Design Tokens |
| Q-04 | Glifo sparkle de IA (`UI-Q-005` / `TOK-Q-004` / `CMP-Q-002`) | **No bloqueante** | Con Lucide ratificado, `Sparkles` es el candidato natural. Cerrar con UX |
| Q-05 | `font.family.mono` (`TOK-Q-002`) | **Provisional** | Stack propuesto sin aprobar. El MVP puede prescindir; no incluir hasta que exista consumidor |
| Q-06 | `layout.sidebar.widthCollapsed` (`TOK-Q-003` / `CMP-DEC-005`) | **Diferida** | Fuera del MVP. No implementar |
| Q-07 | Márgenes de contraste documentados vs recalculados (warning 5.98 → 4.84; success 5.14 → 4.76) | **Provisional / no bloqueante** | Todas siguen cumpliendo AA. Corregir las cifras en `EventFlow-Design-Tokens.md` §32 en una revisión futura; **no** oscurecer ni aclarar esos tonos |
| Q-08 | Migración de las 2 006 utilidades crudas | **Diferida** | Fase posterior con US propia, tras congelar los tokens. No forma parte de esta corrección |
| Q-09 | ¿Debe corregirse el design system de Stitch para reflejar los tokens aprobados? | **No bloqueante** | Stitch es evidencia visual, no autoridad. Alinearlo (vía `update_design_system` / `upload_design_md`) evitaría que futuras generaciones reintroduzcan `#683ec9`, `#EF4444` y Font Awesome. Recomendado, no requerido |

**Preguntas bloqueantes: 0.**

---

## 16. Final recommendation

**¿Stitch y la documentación están alineados?** **Parcialmente.**
Coinciden en lo esencial de la identidad: los seis colores de marca (`#946DF8`, `#C4B7E5`, `#EE8C8D`, `#262626`, `#525252`, `#FFFFFF`), las dos familias tipográficas (Inter Tight / Inter), el ritmo de 8 px, la escala de radius rotulada (8 / 12–16 / 16 / pill), el ancho de sidebar (256 px), el contenedor de marketing (1280 px) y la rejilla 12/8/4.
Divergen en 14 puntos, todos originados en que Stitch arrastra una capa Material Design bajo los overrides de marca: `primary` `#683ec9` en lugar de `#7B4EE8`, `background` `#fdf7ff` en lugar de `#FFFFFF`, semánticos `#10B981`/`#F59E0B`/`#EF4444`/`#3B82F6` en lugar de `#16A34A`/`#D97706`/`#DC2626`/`#2563EB`, una escala tipográfica un paso por debajo de la aprobada (48/32/24/20 vs 60/40/32/24), un focus ring al 20 % de opacidad sin offset blanco, Font Awesome mezclado con Material Symbols, y una anotación de accesibilidad **incorrecta** ("Violeta on White passes WCAG AA" — mide 3.62:1 y está explícitamente bloqueado).
**Ninguna de estas divergencias debe propagarse al frontend.** La documentación prevalece.

**¿Los tokens del frontend están alineados?** **No.**
No existe capa de tokens. La marca no está implementada (azul en lugar de violeta), las fuentes aprobadas no se cargan, el focus ring tiene 7 colores y ninguno es el aprobado, y el tratamiento de IA usa la familia de color equivocada. Al mismo tiempo, **24 valores coinciden exactamente** con los tokens aprobados, porque el sistema se derivó del mismo palette de Tailwind que el código ya usa. La brecha es de arquitectura más que de valores, lo que hace la corrección tratable.

**¿Puede procederse con la corrección de tokens?** **Sí.**
No hay decisión de producto pendiente. Todos los valores necesarios están fijados en `EventFlow-Design-Tokens.md`. La única decisión que estaba abierta —la librería de iconos— queda ratificada en `lucide-react`, y el frontend ya la cumple. Los directorios `shared/design-tokens/` y `shared/design-system/` están vacíos y reservados: no hay sistema competidor que desmontar ni riesgo de duplicar tokens. Dark mode y temas por rol están correctamente ausentes y deben seguir así.

**¿Queda alguna decisión bloqueante?** **No. Cero.**

**Dos hallazgos merecen atención inmediata, con independencia del calendario de tokens:**

1. `focus:ring-purple-400` (2.64:1, 11 usos en paneles de IA) **falla WCAG 2.1 AA 1.4.11**. La accesibilidad es baseline bloqueante por UI-DEC-015 y NFR-A11Y-003.
2. `bg-brand-600` / `focus:ring-brand-500` en `QuoteRequestForm.tsx` referencian un token inexistente: el botón se renderiza **sin fondo y sin indicador de foco**. Es un defecto en producción, no sólo una desviación de sistema.

**Acción siguiente recomendada:** revisar y aprobar este informe; a continuación ejecutar los pasos 1–9 de §13 como una User Story de corrección de tokens acotada a `layout.tsx`, `globals.css`, `tailwind.config.ts`, `shared/design-tokens/` y los componentes de `features/ai/**`, dejando la migración masiva de utilidades (paso 10) para una fase posterior con regresión visual.

---

## Anexo — Evidencia y reproducibilidad

| Elemento | Referencia |
|---|---|
| Proyecto Stitch | `projects/10889252267442839867` |
| Screen Foundations | `projects/10889252267442839867/screens/7e87f6578fec4e1ebc4ef76e2abda1f3` |
| HTML generado | `projects/10889252267442839867/files/2139071298270458983` (29 797 bytes, leído íntegro) |
| Screenshot | `projects/10889252267442839867/files/10501114987485782649` (1200 × 4669, inspeccionado) |
| Design systems | `assets/7dbbdd58d21b46b39d586308b6619b5e`, `assets/8683e03f6796443f8aed86fa687212b4`, `assets/c38b5ae86ab146c792432fd873ac84ff` |
| Método de contraste | Luminancia relativa sRGB según WCAG 2.1; umbrales 4.5:1 (1.4.3) y 3:1 (1.4.11) |
| Método de conteo | `grep` sobre `web/src/**/*.tsx`, excluyendo `src/tests/**` salvo donde se indica |
| Alcance de la modificación | **Ninguna.** Sólo se creó este documento |
