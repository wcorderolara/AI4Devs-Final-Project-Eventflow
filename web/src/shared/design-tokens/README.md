# EventFlow — Design Tokens (frontend)

Capa fundacional del sistema visual de EventFlow. **Toda decisión de color, tipografía, forma,
elevación, foco, layout, motion y z-index del frontend nace aquí.**

---

## 1. Autoridad

Los valores de este directorio **no se inventan ni se ajustan por criterio estético**. Se
transcriben de los documentos normativos aprobados, en este orden:

1. `docs/ux-ui/EventFlow-UI-Foundations.md` — decisiones aprobadas del PO (UI-DEC-001..015).
2. `docs/ux-ui/EventFlow-Design-Tokens.md` — **valores concretos** (TOK-DEC-001..024). Fuente
   directa de casi todo este código.
3. `docs/ux-ui/EventFlow-Component-Foundations.md` — anatomía de componentes.
4. `docs/ux-ui/EventFlow-Stitch-Foundations-Frontend-Validation.md` — mapa de implementación.

Si un valor de aquí discrepa de esos documentos, **el documento gana** y el código se corrige.
Los valores generados por Stitch **no son autoridad** (arrastran una capa Material Design con
`primary: #683ec9`, `background: #fdf7ff`, semánticos `#10B981/#F59E0B/#EF4444/#3B82F6` e
iconografía Font Awesome — todos rechazados).

---

## 2. Capas

```text
primitives.ts   Valores crudos, sin significado de UI (color.violet[600], space[6], radius.md)
      ↓         Los componentes NUNCA los consumen directamente.
semantic.ts     Propósito (text.primary, actionPrimary.background, ai.surface, focusRing.*)
      ↓         Es la capa que consumen Tailwind, las CSS variables y el producto.
components.ts   Alias de componente limitados (button.primary.*, input.*, card.*,
                sidebarItem.*, aiRecommendation.*) — siempre referencian semánticos.
```

Regla (Design Tokens §6): **los alias de componente referencian semánticos, nunca primitivos**, y
**los componentes consumen semánticos, nunca primitivos**.

### Archivos

| Archivo | Contenido |
| --- | --- |
| `primitives.ts` | Escalas neutral / violet / lilac / coral / green / amber / red / blue / alpha; tipografía; spacing; sizing; radius; borders; shadows; layout; breakpoints; motion; focus; opacity; z-index; iconos. |
| `semantic.ts` | `text`, `background`, `surface`, `borderColor`, `actionPrimary/Secondary/Ghost/Destructive/Marketing`, `feedback`, `ai`, `platform`, `marketing`, `focusRing`, `selection`, `overlay`, `radii`, `elevation`. |
| `components.ts` | `button`, `input`, `card`, `sidebarItem`, `aiRecommendation`. |
| `index.ts` | Barrel + objeto `tokens` con las tres capas + tipos. |

---

## 3. Cómo se consume

### 3.1 Tailwind (la vía preferente en JSX)

`tailwind.config.ts` **importa este módulo directamente** — no hay copia de valores:

```ts
import { actionPrimary, ai, text } from './src/shared/design-tokens';
```

Utilidades semánticas disponibles (lista no exhaustiva):

| Categoría | Utilidades |
| --- | --- |
| Texto | `text-primary` `text-secondary` `text-muted` `text-disabled` `text-inverse` `text-link` `text-link-hover` |
| Superficie | `bg-surface` `bg-surface-subtle` `bg-surface-elevated` `bg-surface-disabled` `bg-surface-inverse` `bg-surface-selected` `bg-page` |
| Acciones | `bg-action-primary` `hover:bg-action-primary-hover` `bg-action-primary-active` `text-action-primary-foreground` `bg-action-secondary` `bg-action-ghost-hover` `bg-action-destructive` `bg-action-marketing` |
| Bordes | `border-default` `border-subtle` `border-strong` `border-interactive` `border-separator` |
| Feedback | `bg-feedback-{success,warning,error,info}` `text-feedback-*` `border-feedback-*` `bg-feedback-*-strong` |
| IA | `bg-ai-surface` `bg-ai-surface-hover` `border-ai` `border-ai-strong` `text-ai-label` `text-ai-icon` `text-ai-text` |
| Foco | `.focus-ring` (clase canónica), `ring-focus`, `ring-offset-focus` |
| Tipografía | `font-heading` `font-body` `font-ui` · `text-display` `text-h1` `text-h2` `text-h3` `text-body-lg` `text-body-md` `text-body-sm` `text-label` `text-caption` `text-eyebrow` |
| Forma | `rounded-button` `rounded-input` `rounded-card` `rounded-card-prominent` `rounded-modal` `rounded-drawer` `rounded-badge` |
| Elevación | `shadow-surface-subtle` `shadow-surface-raised` `shadow-overlay-dropdown` `shadow-overlay-modal` `shadow-marketing-floating` |
| Layout | `w-sidebar` `h-header` `max-w-marketing` `max-w-form` `max-w-content` `p-page-mobile/tablet/desktop` `min-h-touch` `min-w-touch` `h-icon-sm/md/lg` |
| Motion | `duration-instant/fast/standard/slow` `ease-standard/enter/exit` |
| Capas | `z-base` `z-sticky` `z-dropdown` `z-drawer` `z-modal` `z-toast` `z-tooltip` |

### 3.2 CSS custom properties

`src/app/globals.css` espeja la capa semántica en `:root` con nombres kebab-case
(`--color-text-primary`, `--color-action-primary`, `--focus-ring-color`, `--radius-card`, …).
Útil para CSS que no puede usar utilidades.

**La sincronización TS ↔ CSS está testeada**: `src/tests/unit/design-tokens/integration.test.ts`
compara cada variable con su token. Si cambias uno, cambia el otro o el test falla.

### 3.3 TypeScript

Sólo cuando el valor se necesita en JS (p. ej. `strokeWidth` de un icono, un cálculo):

```ts
import { icon, ai } from '@/shared/design-tokens';
<Sparkles strokeWidth={icon.stroke.default} />
```

En JSX **prefiere siempre la utilidad Tailwind** sobre importar el token.

---

## 4. Ejemplos

### Aprobado

```tsx
<button className="focus-ring rounded-button bg-action-primary px-4 py-2 text-body-sm
                   font-medium text-action-primary-foreground hover:bg-action-primary-hover">
  {t('actions.submit')}
</button>

<div className="rounded-card border border-ai bg-ai-surface p-6 shadow-surface-subtle">
  <span className="inline-flex items-center gap-1 text-caption text-ai-label">
    <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-ai-icon" />
    {t('badgeSuggested')}
  </span>
</div>

<p className="text-body-sm text-secondary">{helper}</p>
```

### Prohibido

```tsx
{/* Escala cruda de Tailwind en lugar del token semántico */}
<button className="bg-purple-600 text-white hover:bg-purple-700">

{/* Azul como acción primaria: la marca es violeta */}
<button className="bg-blue-600 text-white">

{/* Anillo de foco fuera del sistema (purple-400 = 2.64:1 → falla WCAG 1.4.11) */}
<input className="focus:outline-none focus:ring-2 focus:ring-purple-400" />

{/* `focus` genérico en vez de `focus-visible` */}
<button className="focus:ring-2">

{/* Hex crudo */}
<div style={{ color: '#262626' }}>
```

---

## 5. Reglas no negociables

- **`violet.500` (`#946DF8`) NO es color de texto** — 3.62:1 sobre blanco. Sólo borde, acento o
  fondo con foreground blanco. Para texto violeta usar `text-link` (`violet.700`, 7.22:1).
- **Lilac y coral son SÓLO decorativos.** Nunca texto, icono principal ni estado semántico
  (1.87:1 y 2.39:1 sobre blanco).
- **Los estados semánticos usan las familias independientes** (verde / ámbar / rojo / azul). Los
  colores de marca nunca expresan success/warning/error/info (UI-DEC-014).
- **El color nunca es la única señal.** Todo estado lleva además icono y/o texto (UI-DEC-015).
- **`focus-visible`, no `focus`.** Usa la clase `.focus-ring`. El **offset blanco de 2 px es
  mandatorio**: sin él, el anillo sobre la CTA violeta mide 1.41:1.
- **`#171717` no es texto de cuerpo.** Es `surface.inverse` y CTA oscura de marketing. El texto
  principal es `#262626`.
- **`lucide-react` es la única librería de iconos.** Ratificada (cierra UI-Q-002 / TOK-Q-005 /
  CMP-Q-001). No instalar Font Awesome, Heroicons, Material Symbols ni react-icons.
- **Light theme únicamente** (UI-DEC-013). No añadir `darkMode`, `dark:`, `[data-theme]` ni
  `prefers-color-scheme`.
- **Sin temas por rol** (UI-DEC-009). No hay tokens `organizer.*`, `vendor.*` ni `admin.*`; la
  diferenciación es por contenido, navegación y badge.
- **Touch target ≥ 44 × 44 px** en cualquier control interactivo.

Estas reglas están **testeadas**, no sólo documentadas: ver `src/tests/unit/design-tokens/` y
`src/tests/a11y/design-tokens-contrast.test.ts`.

---

## 6. Aliases de compatibilidad (deprecados)

`tailwind.config.ts` mantiene cuatro aliases heredados de US-107, ya **remapeados a valores
EventFlow aprobados** para no romper consumidores no migrados:

| Alias | Antes | Ahora | Reemplazo |
| --- | --- | --- | --- |
| `primary-*` | `colors.blue` | escala violeta aprobada | `bg-action-primary`, `text-link`, `bg-surface-selected` |
| `secondary-*` | `colors.slate` | escala neutral aprobada | `text-secondary`, `bg-surface-subtle`, `border-subtle` |
| `danger-*` | `colors.red` | escala red aprobada | `bg-action-destructive`, `text-feedback-error` |
| `success-*` | `colors.emerald` | escala green aprobada | `bg-feedback-success-strong`, `text-feedback-success` |

Tras la migración del shell de navegación **ninguno tiene consumidores en el código**; se
conservan como red de seguridad y deben eliminarse al cerrar la migración de componentes.

---

## 7. Tokens provisionales

| Token | Estado | Nota |
| --- | --- | --- |
| `ai.border` = `violet.500` | **Provisional** | 3.35:1 sobre `ai.surface` — cumple 3:1 con margen estrecho. CMP-Q-003 pide validación visual en navegador; si resulta débil, promover a `violet.600` **como cambio de token**, nunca como override en el componente. |
| `provisional.sidebarWidthCollapsed` | **No usado** | TOK-DEC-023 / CMP-DEC-005 lo difieren fuera del MVP. Declarado como `null` sólo para dejar constancia. No consumir. |
| `font.family.mono` | **No implementado** | TOK-DEC-024 lo deja provisional y sin consumidor real en el MVP. Se omite deliberadamente. |

---

## 8. Estrategia de migración

Este directorio implementa **la capa fundacional**, no la migración completa de la UI.

**Hecho:** carga de fuentes, CSS variables, Tailwind semántico, corrección de las clases
`brand-*` inexistentes, eliminación de todos los anillos `purple-400` que fallaban WCAG, y
migración del shell de navegación + la superficie AI representativa (`AIBadge`,
`AISuggestionViewer`).

**Pendiente (fase posterior, US propia):** ~1 954 utilidades de paleta cruda en ~163 archivos.

Reglas para esa fase:

1. Migrar **por feature**, no de forma masiva, con snapshots de regresión visual.
2. Al migrar un archivo, sustituir la utilidad cruda por su token semántico equivalente
   (`text-neutral-800` → `text-primary`, `bg-red-50` → `bg-feedback-error`, …).
3. La forma (`rounded-md` 6 px → `rounded-button` 8 px) y las sombras cambian el render: hacerlo
   dentro de la migración de cada componente, no globalmente.
4. Al terminar, eliminar los aliases de compatibilidad (§6) y añadir el linting que
   `EventFlow-Design-Tokens.md` §30 exige (`eslint-plugin-tailwindcss` / `stylelint`) para
   impedir la reaparición de valores crudos.

**Código nuevo: usar tokens desde el primer commit.** No se aceptan utilidades crudas nuevas.
