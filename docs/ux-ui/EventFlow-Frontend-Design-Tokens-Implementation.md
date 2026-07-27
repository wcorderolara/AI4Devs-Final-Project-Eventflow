# EventFlow — Frontend Design Tokens · Implementation Record

| Campo | Valor |
|---|---|
| Documento | EventFlow — Frontend Design Tokens Implementation Record |
| Versión | 1.0 |
| Fecha | 2026-07-24 |
| Alcance | Implementación de la **capa fundacional** de design tokens en `web/`. No incluye la migración completa de componentes. |
| Estado | Completado — todos los gates en verde |
| Input aprobado | `docs/ux-ui/EventFlow-Stitch-Foundations-Frontend-Validation.md` |

---

## 1. Summary

Se implementó la arquitectura de design tokens aprobada en el frontend `web/`, que hasta ahora
**no tenía ninguna**: `globals.css` contenía sólo tres directivas `@tailwind`,
`tailwind.config.ts` mapeaba cuatro escalas crudas de Tailwind (`primary: colors.blue`), y
`src/shared/design-tokens/` estaba vacío.

Lo que cambia de forma observable:

1. **La marca ya es violeta.** La acción primaria pasó de `blue-600` (`#2563EB`) a la escala
   violeta aprobada (`#7B4EE8` / hover `#6238C7`).
2. **Las tipografías aprobadas se cargan.** `Inter` e `Inter Tight` vía `next/font/google`
   (self-hosted en build, 14 archivos `.woff2` emitidos). Antes no existía ninguna carga de
   fuentes y la app renderizaba con la pila `system-ui` por defecto.
3. **El foco tiene un tratamiento único y accesible.** Una sola clase `.focus-ring`
   (`focus-visible`, 2 px `#6238C7`, offset blanco 2 px) sustituye a los 7 colores de anillo
   previos. Se eliminaron los **10 archivos** con `focus:ring-purple-400` (2.64:1 — fallo
   WCAG 2.1 AA 1.4.11).
4. **Se corrigió un defecto en producción.** Las 7 clases `brand-*` inexistentes de
   `QuoteRequestForm.tsx` dejaban el botón de envío **sin fondo y sin indicador de foco**.
5. **La IA usa su familia aprobada.** `AIBadge` (compartido por 4 familias AI) consume
   `ai.surface` / `ai.border` / `ai.label` / `ai.icon` y añade el icono `Sparkles` de Lucide,
   cumpliendo la regla de UI-DEC-010 de no depender sólo del color.

No se realizó redesign, ni migración masiva, ni cambios de rutas, permisos, lógica o contratos.

---

## 2. Source documents

Leídos y aplicados en este orden de autoridad:

1. `docs/ux-ui/EventFlow-UI-Foundations.md` (UI-DEC-001..015).
2. `docs/ux-ui/EventFlow-Design-Tokens.md` (TOK-DEC-001..024) — origen directo de los valores.
3. `docs/ux-ui/EventFlow-Component-Foundations.md` (§34 iconografía, §37 a11y, §38 matriz de
   consumo, §43 decisiones).
4. `docs/ux-ui/EventFlow-Stitch-Foundations-Frontend-Validation.md` — mapa de implementación
   (FC-01..16, MT-01..19, plan §13).

No se usó el MCP de Stitch: todos los valores necesarios estaban en los documentos aprobados.

---

## 3. Files created

| Archivo | Propósito |
|---|---|
| `web/src/shared/design-tokens/primitives.ts` | Capa 1: escalas crudas (color, tipografía, spacing, sizing, radius, borders, shadows, layout, breakpoints, motion, focus, opacity, z-index, iconos). |
| `web/src/shared/design-tokens/semantic.ts` | Capa 2: tokens con propósito (text, background, surface, borders, acciones, feedback, AI, platform, marketing, focus, selection, overlay, radii, elevation). |
| `web/src/shared/design-tokens/components.ts` | Capa 3: alias limitados (button, input, card, sidebarItem, aiRecommendation). |
| `web/src/shared/design-tokens/index.ts` | Barrel + objeto `tokens` + tipos. |
| `web/src/shared/design-tokens/README.md` | Documentación de uso, reglas, aliases deprecados, provisionales y estrategia de migración. |
| `web/src/tests/unit/design-tokens/tokens.test.ts` | Fija los valores aprobados de las tres capas. |
| `web/src/tests/unit/design-tokens/integration.test.ts` | Sincronización TS ↔ CSS ↔ Tailwind + restricciones de alcance + consumidores migrados. |
| `web/src/tests/a11y/design-tokens-contrast.test.ts` | Matriz de contraste WCAG 2.1 AA sobre tokens reales. |

`web/src/shared/design-tokens/.gitkeep` queda obsoleto (el directorio ya tiene contenido); se
mantiene sin efecto.

## 4. Files modified

| Archivo | Cambio |
|---|---|
| `web/tailwind.config.ts` | Reescrito: importa la capa de tokens y expone utilidades semánticas. `primary: colors.blue` → escala violeta. |
| `web/src/app/globals.css` | `:root` con la capa semántica como CSS variables, defaults de `body`, `::selection`, `prefers-reduced-motion` y la clase `.focus-ring`. |
| `web/src/app/layout.tsx` | Carga de `Inter` + `Inter_Tight` con `next/font/google`; variables en `<html>`; `font-body` en `<body>`. |
| `web/src/shared/navigation/{NavLink,Sidebar,Topbar,MobileNav,UserMenu,NotificationsBadge,SkipLink,Logo}.tsx` | Shell migrado a tokens semánticos. |
| `web/src/shared/i18n/LanguageSelector.tsx` | Migrado a tokens semánticos. |
| `web/src/features/quotes/components/QuoteRequestForm.tsx` | Clases `brand-*` inexistentes → acción y foco semánticos. |
| `web/src/features/ai/event-plan/components/AIBadge.tsx` | Superficie AI representativa: familia `ai.*` + icono `Sparkles`. |
| `web/src/features/ai/event-plan/components/AISuggestionViewer.tsx` | Contenedor del panel AI migrado a `ai.*` + tokens de card. |
| `web/src/features/ai/{budget-suggestion,checklist,quote-brief,vendor-categories,event-plan}/components/*.tsx` (9 archivos) | Sustitución del anillo `purple-400` (fallo WCAG) por `.focus-ring`; `focus:border-purple-500` → `focus-visible:border-interactive`. |
| `web/src/tests/a11y/us131-focus-trap-modal.test.tsx` | Las combinaciones de contraste se anclan a los tokens; se elimina `#171717` como "texto principal". |

**Archivos eliminados:** ninguno.

---

## 5. Token architecture

Tres capas, según Design Tokens §6:

```text
primitives.ts  →  semantic.ts  →  components.ts
   (crudo)         (propósito)      (alias limitados)
```

Tres consumidores, **una sola fuente**:

- **Tailwind** importa el módulo TS directamente (`import { … } from './src/shared/design-tokens'`)
  — consumo real, sin copia de valores.
- **CSS custom properties** en `globals.css` espejan la capa semántica; la sincronización está
  testeada valor por valor.
- **TypeScript** para los casos que necesitan el valor en JS.

No se creó un sistema paralelo, no se añadieron dependencias, no se generó JSON ni Style
Dictionary.

---

## 6. Implemented primitive groups

| Grupo | Contenido |
|---|---|
| Neutral | 12 pasos `0–950`, anclados en `#FFFFFF` / `#525252` / `#262626`. |
| Violet | 10 pasos; ancla `#946DF8`, derivadas accesibles `600` `#7B4EE8`, `700` `#6238C7`, `800` `#4A2A99`. |
| Lilac / Coral | 5 pasos cada una; anclas `#C4B7E5` y `#EE8C8D` (decorativos). |
| Green / Amber / Red / Blue | Escalas compactas independientes (`50/100/200/600/700/foreground`). |
| Alpha | Overlays, hover ghost, scrims. |
| Tipografía | 3 familias, 4 pesos, 9 tamaños rem-first, 5 line-heights, 3 letter-spacings. |
| Spacing / Sizing | Escala base-4 (15 pasos) + controles, iconos, avatares, touch target. |
| Radius / Borders | `0/4/8/12/16/9999`; widths `0/1/2`; style `solid`. |
| Shadows | Los 5 aprobados, con sus valores exactos. |
| Layout / Breakpoints | Containers, sidebar, header, page padding, grid, gutters; `640/768/1024/1280/1536`. |
| Motion / Focus / Opacity / Z-index / Icon | 4 duraciones, 3 easings; focus ring canónico; 5 opacidades; 7 capas; tamaños y strokes de icono. |

## 7. Implemented semantic groups

`text` · `background` · `surface` · `borderColor` + `borderWidth` · `actionPrimary` ·
`actionSecondary` · `actionGhost` · `actionDestructive` · `actionMarketing` · `feedback`
(success/warning/error/info × surface/border/text/icon/strong/foreground) · `ai` ·
`platform` (sidebar, page) · `marketing` (CTA, acentos, hero) · `focusRing` · `selection` ·
`overlay` · `radii` · `elevation`.

Los estados AI (`accepted`, `edited`, `rejected`, `fallback`, `error`) **reutilizan** las familias
de feedback — no se crearon paletas paralelas (Design Tokens §11).

## 8. Component aliases

`button` (primary / secondary / destructive / marketing) · `input` · `card` · `sidebarItem` ·
`aiRecommendation`. Todos referencian semánticos; verificado por test.

---

## 9. Font configuration

```ts
const inter = Inter({ subsets: ['latin', 'latin-ext'], weight: ['400','500','600','700'],
                      variable: '--font-inter', display: 'swap' });
const interTight = Inter_Tight({ subsets: ['latin', 'latin-ext'], weight: ['400','500','600','700'],
                                 variable: '--font-inter-tight', display: 'swap' });
```

- Variables aplicadas en `<html>`; `font-body` en `<body>`.
- `subsets: ['latin', 'latin-ext']` cubre `es-LATAM`, `es-ES`, `pt`, `en`.
- Sin `<link>` a `fonts.googleapis.com` — self-hosted en build (14 `.woff2` en `.next/static/media`).
- Fallback `system-ui, sans-serif` en el token, para que un fallo de carga no rompa métricas.
- Los headings **pueden** optar por Inter Tight con `font-heading`; no se forzó globalmente para
  no alterar vistas aún sin migrar.

## 10. Tailwind integration

`tailwind.config.ts` importa los tokens y extiende `colors`, `textColor`, `backgroundColor`,
`borderColor`, `ringColor`, `ringOffsetColor`, `ringWidth`, `ringOffsetWidth`, `outlineColor`,
`fontFamily`, `fontSize`, `letterSpacing`, `borderRadius`, `boxShadow`, `spacing`, `maxWidth`,
`minHeight`, `minWidth`, `height`, `width`, `gridTemplateColumns`, `transitionDuration`,
`transitionTimingFunction`, `zIndex`, `opacity`, y declara `screens` explícitos.

**Decisión deliberada:** se **añaden** aliases de forma y elevación (`rounded-button`,
`shadow-surface-subtle`, …) en vez de redefinir `rounded-md` / `shadow-sm`. Redefinirlos
cambiaría el render de 649 usos de radius y 76 de sombra de golpe; ese cambio pertenece a la
migración de componentes, no a la capa fundacional.

Aliases de compatibilidad conservados y remapeados a valores aprobados (`primary`→violeta,
`secondary`→neutral, `danger`→red, `success`→green), marcados `@deprecated`. Tras migrar el shell
**ya no tienen consumidores**; se eliminan al cerrar la migración.

## 11. CSS-variable integration

`:root` en `@layer base` con ~90 variables kebab-case (`--color-*`, `--focus-ring-*`,
`--radius-*`, `--shadow-*`, `--layout-*`, `--motion-*`, `--icon-*`, `--z-*`).

Defaults globales añadidos: `body` (fondo, color, familia, antialiasing), `::selection`, y
`@media (prefers-reduced-motion: reduce)` colapsando duraciones a `0ms`. **No** se estilaron
controles individuales, para no alterar layouts existentes.

Clase canónica en `@layer components`:

```css
.focus-ring {
  @apply outline-none focus-visible:ring-2 focus-visible:ring-focus
         focus-visible:ring-offset-2 focus-visible:ring-offset-focus;
}
```

## 12. Minimal migrated consumers

| Consumidor | Motivo |
|---|---|
| `QuoteRequestForm.tsx` | Corrección obligatoria: `brand-*` inexistente dejaba el botón sin fondo ni foco. |
| Shell de navegación (8 componentes) + `LanguageSelector` | Superficie compartida por los 3 roles; demuestra tokens de sidebar, superficie, borde, foco, tipografía e iconos. Único consumidor de los aliases `primary-*`/`danger-*`. |
| `AIBadge.tsx` | **Superficie AI representativa**: la reutilizan event-plan, checklist, budget-suggestion y vendor-categories, de modo que migrarla propaga los tokens `ai.*` a las 4 familias sin tocar sus layouts. Cubierta por las 6 suites de `src/tests/integration/ai/`. |
| `AISuggestionViewer.tsx` | Contenedor directo del badge; demuestra `bg-ai-surface` + `border-ai` + tokens de card. |
| 9 componentes AI adicionales | **Sólo** sustitución del anillo `purple-400` que fallaba WCAG. Sin cambios de layout. |

## 13. Tests added or updated

**Añadidos — 100 tests en 3 archivos** (24 + 53 + 23):

- `tokens.test.ts` (24) — primitivos, semánticos, AI, foco, forma, elevación, layout, motion,
  z-index, iconos, tipografía, arquitectura de capas. Incluye regresiones explícitas: la acción
  primaria no puede ser `#2563EB`; los valores Stitch (`#10B981`, `#F59E0B`, `#EF4444`, `#3B82F6`,
  `#683EC9`, `#FDF7FF`) no pueden aparecer.
- `integration.test.ts` (53) — sincronización valor-por-valor TS ↔ CSS (38 variables); Tailwind
  expone las utilidades; **no** hay dark mode (`darkMode` ausente, 0 variantes `dark:`, sin
  `prefers-color-scheme`); **no** hay temas por rol; Font Awesome ausente y `lucide-react`
  presente; fuentes por `next/font` sin `<link>`; 0 clases `brand-*`; 0 anillos `purple-400`;
  y los consumidores migrados usan utilidades semánticas.
- `design-tokens-contrast.test.ts` (23) — matriz WCAG 2.1 AA sobre tokens reales, más las
  combinaciones **prohibidas** (`violet.500`, `lilac.300`, `coral.300` como texto) y la
  demostración de que el focus ring sin offset blanco no cumple sobre la CTA violeta.

**Actualizado:**

- `us131-focus-trap-modal.test.tsx` — las combinaciones de contraste se anclan a los tokens
  importados. Se elimina la fila que trataba `#171717` como texto principal (desviación FC-11) y
  se conserva `#171717` donde es legítimo (fondo de `text.inverse`). Umbral intacto en 4.5:1; se
  amplió de 6 a 7 combinaciones. **Ninguna aserción se debilitó.**

## 14. Commands executed

| Comando | Resultado |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | ✅ sin errores |
| `npm run lint` (`next lint --max-warnings=0`) | ✅ sin warnings ni errores |
| `npm run test` (`vitest run`) | ✅ **132 archivos / 929 tests pasan, 1 skipped** |
| `npx vitest run src/tests/unit/design-tokens src/tests/a11y/design-tokens-contrast.test.ts` | ✅ **100 tests pasan** |
| `npx vitest run src/tests/a11y` | ✅ suites de accesibilidad en verde |
| `npm run build` (`next build`) | ✅ compila; 14 `.woff2` self-hosted; tokens presentes en el CSS emitido |
| `npx prettier --check` sobre los 30 archivos tocados | ✅ conformes |

Verificación en el CSS compilado: `--color-action-primary:#7b4ee8`, `--color-ai-surface:#f7f5fb`,
`--focus-ring-color:#6238c7`, `--color-text-primary:#262626`, `--radius-card:12px`,
`--layout-sidebar-width:256px`.

## 15. Results

| Criterio | Estado |
|---|---|
| `shared/design-tokens/` contiene la fuente de tokens | ✅ 5 archivos + README |
| `globals.css` expone CSS custom properties semánticas | ✅ ~90 variables |
| `tailwind.config.ts` expone utilidades semánticas | ✅ importando los tokens |
| Inter + Inter Tight con `next/font/google` | ✅ self-hosted |
| Acción primaria violeta | ✅ `#7B4EE8` |
| Focus-visible canónico | ✅ `.focus-ring`, offset blanco |
| Tokens AI implementados | ✅ familia `ai.*` completa |
| `lucide-react` única librería de iconos | ✅ 0 dependencias de iconos añadidas |
| `brand-*` inválidas corregidas | ✅ 7 → 0 |
| Shell + superficie AI consumen tokens | ✅ |
| Sin dark mode / sin temas por rol | ✅ verificado por test |
| Lint, typecheck, tests, build | ✅ todos en verde |

**Pre-existente, no introducido por esta tarea:** 318 archivos no cumplen `prettier --check`
(el gate del repo es `npm run lint`, que no ejecuta Prettier). Evidencia: p. ej.
`src/tests/unit/us065-star-rating.test.tsx` falla el check y no fue tocado. Los 30 archivos de
esta tarea sí están formateados. No se corrigió el resto por quedar fuera de alcance.

## 16. Remaining raw utility count

| Métrica | Antes | Después |
|---|---|---|
| Utilidades de paleta cruda en `src/**/*.tsx` | **2 006** | **1 954** |
| Archivos con utilidades crudas (excl. tests) | **172** | **163** |
| Clases `brand-*` inexistentes | **7** | **0** |
| Archivos con `focus:ring-purple-400` (2.64:1) | **10** | **0** |
| Variantes `dark:` | 0 | **0** |
| `purple-*` restantes en `features/ai/**` | 53 | **31** |

**No se afirma que se hayan eliminado los valores hardcoded**: quedan 1 954 utilidades crudas
por migrar. Esta tarea entrega la capa que hace posible esa migración.

## 17. Deferred migration work

1. **~1 954 utilidades crudas en ~163 archivos** — migrar por feature, con regresión visual.
2. **31 usos de `purple-*` en `features/ai/**`** — fondos, textos y botones de los generadores AI;
   `AIBadge`/`AISuggestionViewer` ya migrados como referencia.
3. **Forma y elevación** — `rounded-md` (6 px) → `rounded-button` (8 px), `rounded-lg` (8 px) →
   `rounded-card` (12 px), `shadow-sm/lg/xl` → sombras semánticas. Cambian el render: por componente.
4. **Consolidación de duplicados** — `neutral-900/800/700` como texto, `red-800/700`,
   `amber-800/900`, familias `emerald`/`green`.
5. **Eliminar los aliases de compatibilidad** (`primary`, `secondary`, `danger`, `success`) — ya
   sin consumidores.
6. **Linting anti-hardcode** (`eslint-plugin-tailwindcss` / `stylelint`) exigido por Design
   Tokens §30.
7. **`z-[60]` y `text-[10px]`** — sustituir por `z-*` de la escala y por `text-caption`.
8. **Tipografía de headings** — adoptar `font-heading` + `text-h1/h2/h3` en las vistas.

## 18. Provisional values

| Token | Estado | Nota |
|---|---|---|
| `ai.border` = `violet.500` (`#946DF8`) | Provisional | 3.35:1 sobre `ai.surface`; cumple 3:1 con margen estrecho. CMP-Q-003 pide validación visual en navegador. **No se promovió** a `violet.600` porque el informe lo marca como provisional, no aprobado. |
| `provisional.sidebarWidthCollapsed` | Declarado como `null`, no usado | TOK-DEC-023 / CMP-DEC-005 lo difieren fuera del MVP. No expuesto a Tailwind. |
| `font.family.mono` | No implementado | TOK-DEC-024 lo deja provisional y sin consumidor real en el MVP. |
| Márgenes de contraste de warning y success | Informativo | Recalculados: 4.84:1 y 4.76:1 (el documento indica 5.98 y 5.14). Ambos cumplen AA; los tokens **no** deben aclararse. Corregir las cifras en `EventFlow-Design-Tokens.md` §32 en una revisión futura. |

## 19. Risks

| Riesgo | Mitigación |
|---|---|
| Coexistencia temporal de tokens y utilidades crudas durante la migración. | Los valores crudos que quedan coinciden en su mayoría con los tokens aprobados (el sistema derivó del mismo palette), así que la incoherencia visual es mínima. |
| Cambio de marca visible: la acción primaria pasa de azul a violeta. | Es el objetivo aprobado (FC-01). Cubierto por test de regresión. |
| El shell de navegación cambia de color de acento. | Migración verificada por los tests de `NavLink`, `SkipLink` y `UserMenu`, que asertan comportamiento y no clases. |
| Añadir el icono `Sparkles` al `AIBadge` altera su DOM. | El icono es `aria-hidden`; el `aria-label` del `role="status"` no cambia. Las 6 suites AI siguen en verde. |
| Deriva TS ↔ CSS ↔ Tailwind. | Test de sincronización valor-por-valor. |
| Reintroducción de dark mode, temas por rol o Font Awesome. | Tests de restricción de alcance que fallan si aparecen. |
| Redefinir `rounded-md`/`shadow-sm` globalmente rompería el render. | Deliberadamente **no** se hizo; se añadieron aliases y se difirió a la migración por componente. |

## 20. Recommended next task

**Migrar los componentes por feature a las utilidades semánticas**, empezando por las familias AI
restantes (`features/ai/**`, 31 usos de `purple-*`) por ser las que más se desvían del sistema
aprobado, y siguiendo por `features/admin/**` (mayor densidad de `neutral-*`).

Para esa US: incluir snapshots de regresión visual, añadir el linting anti-hardcode y eliminar los
aliases de compatibilidad al terminar.

Antes de congelar baselines visuales, cerrar **CMP-Q-003** (validación visual de `ai.border` en
navegador) — es la única cuestión provisional con impacto perceptivo.
