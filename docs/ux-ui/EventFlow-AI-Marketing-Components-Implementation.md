# EventFlow — AI & Marketing · Implementation record

> **Stitch se usó como evidencia visual.** No es autoridad sobre tokens, tipografía, iconografía,
> accesibilidad, comportamiento de la IA, reglas human-in-the-loop, alcance de producto,
> afirmaciones de marketing, rutas, permisos, contratos de API ni arquitectura de componentes.
>
> La propia pantalla incluye una sección «Notas de Consolidación» con cuatro decisiones. **Ninguna
> se adopta**: el lila de IA generado no sustituye a `ai.surface`; el borde AI no es
> `border-primary` genérico sino el token `ai.border`; **no** se instala Font Awesome —Lucide
> sigue siendo la única librería—; y el ritmo vertical no se rige por un `margin-desktop` de
> 40 px sino por los tokens de layout aprobados.

---

## 1. Propósito

Implementar el cuarto y último grupo del design system de EventFlow —**AI** y **Marketing**— como
componentes reutilizables de producción, y **validar** contra el catálogo ya existente los
patrones responsivos y de accesibilidad que la pantalla ejemplifica (FilterBar, objetivos
táctiles, focus ring, errores de formulario, movimiento).

## 2. Pantalla Stitch inspeccionada

| Campo    | Valor                                                                |
| -------- | -------------------------------------------------------------------- |
| Proyecto | EventFlow AI Planning Workspace — `10889252267442839867`              |
| Pantalla | EventFlow — Component Design System (AI, Marketing & Final Notes)     |
| ID       | `4a31c481974d41cbae96eb32ad45539d`                                    |
| Device   | DESKTOP · 2560 × 7360                                                 |

## 3. Recursos recuperados

- Metadatos de la pantalla (MCP Stitch `get_screen`).
- HTML generado (descargado a scratchpad; **no** se copió a producción).
- Screenshot alojado (descargado a scratchpad).
- El proyecto no expone `DESIGN.md`; la información de sistema de diseño proviene de la
  documentación aprobada del repositorio.

Anatomía observada y usada como referencia: cuatro estados de la AI Recommendation Card
(pending · loading · editing · applied), hero de marketing con eyebrow + display + par de CTA,
rejilla de tres feature cards, comparativa de FilterBar horizontal vs apilado, ejemplos de área
táctil, focus ring y error de formulario con icono + texto.

## 4. Documentación leída

- `docs/ux-ui/EventFlow-UI-Foundations.md`
- `docs/ux-ui/EventFlow-Design-Tokens.md`
- `docs/ux-ui/EventFlow-Component-Foundations.md` (§14, §31 familia AI, §32 marketing, §36–§38)
- `docs/ux-ui/EventFlow-Stitch-Foundations-Frontend-Validation.md`
- `docs/ux-ui/EventFlow-Frontend-Design-Tokens-Implementation.md`
- `docs/ux-ui/EventFlow-Actions-Forms-Components-Implementation.md`
- `docs/ux-ui/EventFlow-Navigation-Feedback-Components-Implementation.md`
- `docs/ux-ui/EventFlow-Navigation-Feedback-States-Implementation.md`
- `docs/ux-ui/EventFlow-Data-Overlays-Components-Implementation.md`
- `web/src/shared/design-system/README.md`, `web/src/shared/design-tokens/`, `web/tailwind.config.ts`
- Las 15 superficies AI existentes en `web/src/features/ai/**` y la landing en
  `web/src/app/(public)/`

## 5. Inventario de deduplicación

| Elemento de la pantalla        | Clasificación        | Resolución                                                                   |
| ------------------------------ | -------------------- | ---------------------------------------------------------------------------- |
| AIRecommendationCard           | **Create**           | `ai/AIRecommendationCard.tsx` — un componente, ocho estados                    |
| AI loading state               | **Create**           | `ai/AIRecommendationLoading.tsx` (skeleton + label; sin % inventado)           |
| AI editing state               | **Create**           | Estado `editing` del card + slot `editor` con `FormField`/`Input`/`Textarea`   |
| AI accepted / edited state     | **Create**           | Estados `accepted` / `edited`: abandonan la superficie de IA                    |
| AI rejected state              | **Create**           | Estado `rejected`                                                              |
| AI error state                 | **Create**           | Estado `error` (`role="alert"` + reintento, catálogo cerrado de mensajes)       |
| AI fallback state              | **Create**           | Estado `fallback` (sigue siendo revisable, no nombra proveedor)                 |
| AI action group                | **Create**           | `ai/AIRecommendationActions.tsx` — orden canónico del sistema                   |
| AI disclosure label            | **Create** + Normalize | `ai/AILabel.tsx`; `features/ai/event-plan/AIBadge` pasa a componerlo          |
| MarketingHero                  | **Create**           | `marketing/MarketingHero.tsx`                                                  |
| MarketingSection               | **Create**           | `marketing/MarketingSection.tsx`                                               |
| MarketingFeatureCard           | **Create**           | `marketing/MarketingFeatureCard.tsx` (compone el `Card` canónico)              |
| MarketingFeatureGrid           | **Create**           | `marketing/MarketingFeatureGrid.tsx` (+ `Item`)                                |
| MarketingCTAGroup              | **Create**           | `marketing/MarketingCTAGroup.tsx`                                              |
| Marketing badge / eyebrow      | **Omit** (duplicado) | Es la prop `eyebrow` de `MarketingHero` / `MarketingSection`; no un componente  |
| FilterBar desktop/mobile       | **Reuse** + validar  | `navigation/FilterBar` (PB-P2-029). **No** se crea una segunda implementación   |
| Áreas táctiles                 | **Reuse** + validar  | `Button` (`.hit-area`) e `IconButton` (`min-h-touch`) — verificado por test      |
| Focus ring                     | **Reuse** + validar  | `.focus-ring` canónico — verificado por test                                    |
| Errores de formulario          | **Reuse** + validar  | `FormField` (`aria-invalid` + `aria-describedby` + icono) — verificado por test  |
| Motion / reduced motion        | **Reuse** + validar  | `Skeleton` con `motion-reduce:animate-none` — verificado por test               |
| Button · Input · Textarea · Card · Badge · StatusBadge · Alert · Skeleton · Spinner · ProgressIndicator · Modal · Navegación | **Reuse** | Grupos anteriores; ninguno se recrea |
| Barra de navegación de la demo | **Omit** (duplicado) | `TopBar` / `AppShell` ya existen                                                |
| Notas de consolidación         | **Omit**             | Es documentación de la pantalla, no un componente                               |
| Personalización por historial de eventos | **Out of scope** | «Basado en tus eventos anteriores» no está soportado; el copy no se reproduce  |
| Gestión de invitados · mesas · RSVP | **Out of scope** | No existen en el MVP                                                            |
| Seguimiento de presupuesto en tiempo real | **Out of scope** | Ninguna API lo respalda                                                     |
| IA proactiva / autónoma        | **Out of scope**     | Contradice human-in-the-loop (UI-DEC-010 / NFR-AI-001)                          |
| Prueba gratuita · agenda de demos | **Out of scope**  | No hay flujo de suscripción ni comercial                                        |

## 6. Componentes reutilizados

`Button`, `IconButton`, `TextLink`, `FormField`, `Input`, `Textarea`, `Select`, `SearchInput`,
`Card` (+ `CardTitle`/`CardDescription`), `Badge`, `StatusBadge`, `Alert`, `EmptyState`,
`Skeleton`, `Spinner`, `Modal`, `ConfirmationDialog`, `FilterBar` y la navegación pública
existente. **No se instaló ninguna dependencia.**

## 7. Componentes extendidos

Ninguno. El grupo se apoyó en los componentes existentes tal cual; el único cambio de API en
piezas previas fue el `live` de `StatusBadge`, que ya se había introducido en PB-P2-031.

## 8. Componentes normalizados

| Archivo                                                    | Antes                                                            | Después                                                                    |
| ---------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `features/ai/event-plan/components/AIBadge.tsx`             | Markup propio con tokens `ai.*`                                  | Compone `AILabel`; sólo aporta el copy. Se propaga a las 4 familias AI       |
| `features/ai/task-priority/components/AITaskPriorityCard.tsx` | Paleta cruda (`red-100`, `amber-50`, `blue-50`, `neutral-*`), skeleton, badges, empty y error propios | `AIRecommendationCard` + `AIRecommendationActions` + `StatusBadge` + `Badge` + `EmptyState` + `TextLink` |
| `features/ai/hitl/components/HITLActions.tsx`               | Tres `<button>` sin estilo y dos overlays `div[role=dialog]` sin focus trap ni bloqueo de scroll | `AIRecommendationActions` + `Modal` + `ConfirmationDialog`                 |
| `features/ai/vendor-categories/components/AICategoryCard.tsx` | `hover:border-purple-400`, `text-purple-700`, `neutral-*`        | Alias semánticos (`border-interactive`, `text-link`, `text-secondary`)      |
| `app/(public)/page.tsx`                                     | Stub `appName` + `welcome`                                        | `MarketingHero` + `MarketingSection` + `MarketingFeatureGrid`               |

## 9. Componentes creados

```text
shared/design-system/ai/
├── AILabel.tsx
├── AIRecommendationCard.tsx
├── AIRecommendationActions.tsx
├── AIRecommendationLoading.tsx
└── index.ts

shared/design-system/marketing/
├── MarketingHero.tsx
├── MarketingSection.tsx
├── MarketingFeatureCard.tsx
├── MarketingFeatureGrid.tsx     (+ MarketingFeatureGridItem)
├── MarketingCTAGroup.tsx
└── index.ts
```

## 10. Componentes omitidos como duplicados

- **Marketing badge / eyebrow**: es una prop de `MarketingHero` y `MarketingSection`. Un
  componente para un `<p>` con dos clases sería fragmentación, no reutilización.
- **Barra de navegación y footer** de la pantalla: `TopBar`, `AppShell` y `Footer` ya existen.
- **FilterBar**: se valida el canónico; crear una variante «mobile» sería una segunda
  implementación del mismo patrón.
- **Button, Input, Card, Badge, Skeleton** dibujados en la pantalla: se reutilizan.
- **AIRecommendationHeader**: la propuesta de estructura lo sugería, pero la cabecera son ocho
  líneas dentro del card y no tiene responsabilidad semántica propia.

## 11. Componentes omitidos por alcance de producto

Gestión de invitados, listas de invitados, RSVP, planos de mesas, equipos colaborativos y
múltiples colaboradores, seguimiento de presupuesto en tiempo real, selección automática de
proveedores, acciones autónomas o proactivas de IA, generación de imágenes, chat asistente,
pagos, contratos, WhatsApp, app nativa, conversión de moneda, prueba gratuita y suscripciones.

## 12. API del componente AI

**`AIRecommendationCard`**

| Grupo      | Props                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| Estado     | `state`                                                                                                    |
| Divulgación | `aiLabel` (obligatoria), `aiLabelAriaLabel`, `statusLabel`                                                |
| Contenido  | `title`, `headingLevel`, `recommendationType`, `description`, `children`, `contextNote`, `meta`             |
| Carga      | `loadingLabel`, `loadingHint`                                                                              |
| Fallback   | `fallbackLabel`, `fallbackAriaLabel`                                                                       |
| Error      | `errorMessage` (`string`), `correlationId`, `correlationLabel`, `onRetry`+`retryLabel`, `onDismiss`+`dismissLabel` |
| Edición    | `editor`, `onCancelEdit`+`cancelEditLabel`, `onSaveEdit`+`saveEditLabel`, `isSubmitting`, `submittingLabel` |
| Revisión   | `actions` (canónicamente un `AIRecommendationActions`)                                                     |

**`AIRecommendationActions`** — `groupLabel` + `accept` / `edit` / `regenerate` / `reject`, cada
uno un `AIActionDescriptor` (`label`, `ariaLabel?`, `onSelect`, `disabled?`, `isLoading?`,
`loadingLabel?`), más `isBusy`.

**`AILabel`** — `label` (obligatorio), `ariaLabel?`, `fallbackLabel?`, `fallbackAriaLabel?`, `live?`.

**`AIRecommendationLoading`** — `label`, `hint?`, `lines?`.

Restricciones respetadas: sin `any`, sin DTOs del backend, sin llamadas de red, sin mutaciones de
TanStack Query, sin permisos ni esquemas dentro de la primitiva, y sin explosión de props
booleanas (las acciones son descriptores, no una batería de flags).

## 13. Modelo de estados AI

| Estado      | Superficie | Contenido                        | Controles                          |
| ----------- | ---------- | -------------------------------- | ---------------------------------- |
| `loading`   | `ai.*`     | Skeleton + label (sin %)          | Ninguno                            |
| `pending`   | `ai.*`     | Sugerencia                        | `actions` (revisión)               |
| `fallback`  | `ai.*`     | Sugerencia + aviso de plantilla   | `actions` (revisión)               |
| `editing`   | `ai.*`     | `editor` del feature              | Cancelar / Guardar                 |
| `accepted`  | neutra     | Dato confirmado                   | Ninguno                            |
| `edited`    | neutra     | Dato confirmado (editado)         | Ninguno                            |
| `rejected`  | neutra atenuada | Registro del descarte        | Ninguno                            |
| `error`     | borde error | Mensaje seguro (`role="alert"`)  | Reintentar / Descartar             |

Tonos de `StatusBadge` por estado: `pending`/`editing`/`edited` → info · `fallback` → warning ·
`accepted` → success · `rejected` → neutral · `error` → error. **Siempre acompañados de texto.**

## 14. Comportamiento human-in-the-loop

1. **Una sugerencia no es un dato.** En `pending` y `fallback` el contenido vive sobre `ai.*`,
   visiblemente distinto de la superficie de un dato confirmado.
2. **Aceptar es intencional.** No hay auto-aceptación al continuar el flujo; la acción existe
   sólo si el feature aporta `onSelect` y su label.
3. **Aceptar cambia la presentación.** `accepted` / `edited` pasan a superficie neutra y el card
   deja de renderizar los controles de revisión aunque el consumidor los siga pasando —lo
   verifica un test—: un dato aplicado no puede seguir ofreciendo «Aceptar».
4. **`edited` se distingue de `accepted`.** Tono y `data-state` diferentes para que «confirmado
   con cambios» no se confunda con «confirmado tal cual».
5. **Rechazar no es destructivo** ni se oculta: variante `ghost`, nunca la familia error.
6. **El fallback no interrumpe el flujo**: sigue siendo editable y aceptable, y declara su origen
   en texto sin nombrar al proveedor.
7. **El doble envío está bloqueado** en el componente (`isSubmitting` deshabilita guardar;
   `isBusy` bloquea el grupo entero), no en cada consumidor.
8. `AITaskPriorityCard` conserva su contrato HITL estricto: **no declara `accept` ni `reject`**
   porque no altera datos; sus CTA siguen siendo deep-links.

## 15. API de los componentes de marketing

- **`MarketingHero`** — `eyebrow?`, `heading` (se renderiza como `h1`), `description?`,
  `primaryCta?`, `secondaryCta?`, `ctaGroupLabel?`, `media?`, `layout` (`centered` | `split`).
- **`MarketingSection`** — `eyebrow?`, `heading?`, `headingLevel` (2 | 3), `description?`,
  `children?`, `background` (`plain` | `subtle` | `inverse`), `align`, `width`.
- **`MarketingFeatureCard`** — `icon?`, `title`, `description?`, `headingLevel`, `href?`,
  `ariaLabel?`, `emphasis?`.
- **`MarketingFeatureGrid`** — `ariaLabel?`, `columns` (2 | 3 | 4); `MarketingFeatureGridItem`.
- **`MarketingCTAGroup`** — `primary`, `secondary?`, `ariaLabel?`, `align`.

Ninguno contiene copy, rutas ni lógica de negocio.

## 16. Afirmaciones de producto validadas

La landing migrada afirma **sólo** capacidades existentes:

| Afirmación                                            | Respaldo                                        |
| ----------------------------------------------------- | ----------------------------------------------- |
| Convertir la idea del evento en un plan accionable     | AI-001 plan sugerido                             |
| Checklist editable                                     | AI-002 generación de checklist                   |
| Presupuesto sugerido y editable                        | AI-003 sugerencia de presupuesto                 |
| Directorio de proveedores aprobados                    | Directorio + moderación de vendors               |
| Cotizaciones estructuradas y comparación               | Flujo de quote requests + comparador             |
| Cada sugerencia queda pendiente de revisión            | HITL (UI-DEC-010 / NFR-AI-001)                   |

Retiradas de los ejemplos de la pantalla por no estar respaldadas: prueba gratuita, agenda de
demostraciones, gestión de invitados y mesas, confirmaciones de asistencia, control financiero en
tiempo real, recomendaciones proactivas y personalización basada en eventos anteriores. Un test
del catálogo (`ai-marketing.test.tsx` §alcance de producto) falla si alguna de esas frases
reaparece en los componentes del grupo.

## 17. Comportamiento responsive

| Superficie                | Comportamiento                                                                    |
| ------------------------- | --------------------------------------------------------------------------------- |
| `AIRecommendationCard`    | `p-4` → `sm:p-6`; cabecera con `flex-wrap`; el contenido nunca se recorta           |
| `AIRecommendationActions` | Apiladas a ancho completo en móvil, en fila con `flex-wrap` desde `sm`               |
| Edición AI                | Los controles heredan el ancho completo de `FormField`; botones apilados en móvil    |
| `MarketingHero`           | `text-h1` → `sm:text-display`; `text-balance` + ancho relativo tolera traducciones largas; en `split`, media debajo del texto en móvil |
| `MarketingCTAGroup`       | Columna a ancho completo en móvil, fila desde `sm`; orden DOM = orden visual         |
| `MarketingFeatureGrid`    | 3 → 2 → 1 columnas; `items-stretch` + `h-full` igualan alturas con contenido desigual |
| `MarketingSection`        | `px-page-mobile` → `sm:px-page-tablet`; contenedor acotado a `max-w-marketing`        |
| `FilterBar` (validado)    | Rejilla 1 → 2 → 3 columnas y disclosure por debajo de `lg`; una sola implementación   |

Ningún componente del grupo introduce scroll horizontal de página.

## 18. Decisiones de accesibilidad

1. **La divulgación de IA es texto**, en todos los estados. El glifo `Sparkles` va `aria-hidden`
   porque el label ya lo dice; `AILabel` exige `label: string`, así que es imposible montar el
   componente sin ella.
2. **El estado nunca es sólo color**: cada estado exige `statusLabel` para pintar el badge, y un
   test recorre los siete estados visibles comprobando que el texto está presente.
3. **Región viva opt-in**: `AILabel` usa `role="img"` con `ariaLabel` y sólo `role="status"` con
   `live`, para que un listado no anuncie N badges al renderizar.
4. **Carga**: `aria-busy` en la región, `role="status"` + `aria-live="polite"` con el mensaje, un
   único patrón visual y **sin porcentaje**. `motion-reduce:animate-none` lo aporta `Skeleton`.
5. **Error**: `role="alert"`, mensaje de un catálogo cerrado de códigos conocidos; un código
   desconocido cae en `UNEXPECTED`, de modo que el texto del proveedor no puede llegar a pantalla.
   El correlation ID es metadata secundaria opcional.
6. **Edición**: los campos son `FormField` + `Input`/`Textarea`, con `aria-invalid` y
   `aria-describedby` ya resueltos; el error lleva icono y texto, no sólo color.
7. **Teclado**: todas las acciones AI son `Button` nativos con `.focus-ring`; el orden de foco es
   label → contenido → acciones.
8. **Objetivos táctiles**: `IconButton` ≥ 44 px reales; `Button sm` amplía con `.hit-area`.
   Verificado por test sobre los componentes canónicos.
9. **Jerarquía de encabezados**: el hero es el único `h1`; `MarketingSection` usa `h2`;
   `MarketingFeatureCard` acepta `headingLevel`. `MarketingSection` y `MarketingHero` se nombran
   por su propio encabezado (`aria-labelledby`).
10. **Sin ARIA redundante**: nada de `role="button"` sobre `<button>` ni `role="list"` sobre `<ul>`.
11. **Iconos decorativos** siempre que el texto ya aporte el significado (feature cards, badges).
12. **Nada obligatorio vive sólo en un tooltip**: el grupo no usa tooltips.

## 19. Mapeo de tokens

| Concepto                     | Token / utilidad                                              |
| ---------------------------- | ------------------------------------------------------------- |
| Superficie de sugerencia     | `bg-ai-surface` (`ai.surface`)                                 |
| Borde de sugerencia          | `border-ai` (`ai.border`)                                      |
| Label / icono de IA          | `text-ai-label` / `text-ai-icon` (`ai.label`, `ai.icon`)       |
| Texto de IA                  | `text-ai-text` (`ai.text`)                                     |
| Fallback                     | familia `feedback-warning`                                     |
| Aceptado / editado / error   | `feedback-success` / `feedback-info` / `feedback-error`        |
| Superficie confirmada        | `bg-surface` + `border-subtle` (deja de ser una sugerencia)     |
| CTA de marketing             | `bg-action-marketing` + `hover:bg-action-marketing-hover`       |
| CTA secundaria               | `bg-action-secondary` + `border-action-secondary`               |
| Fondo de sección             | `bg-marketing-hero` (`marketing.heroSurface`)                   |
| Contenedor de marketing      | `max-w-marketing` (1280 px)                                     |
| Padding de página            | `px-page-mobile` / `sm:px-page-tablet`                          |
| Foco                         | `.focus-ring`                                                   |
| Objetivo táctil              | `min-h-touch` / `.hit-area`                                     |
| Motion                       | `duration-fast` · `ease-standard` + `motion-reduce:*`           |
| Iconos                       | `lucide-react` con `h-icon-sm|md|lg`                            |

Sin `#f5f3ff`, sin `purple-*` genérico, sin Font Awesome, sin Material Symbols, sin `darkMode`,
sin glow ni degradados. Todo verificado por `token-guardrails.test.ts`.

## 20. Tests añadidos o actualizados

**Nuevos**

- `web/src/tests/unit/design-system/ai-marketing.test.tsx` — 34 tests: `AILabel` (texto visible,
  icono decorativo, `live`, fallback); `AIRecommendationCard` en los ocho estados (pending con
  acciones, loading sin % y con `aria-busy`, reduced motion, editing con `FormField`/`Textarea` +
  cancelar/guardar + bloqueo de doble envío, accepted sin controles pendientes y fuera de la
  superficie AI, edited distinguible, rejected, fallback revisable y sin nombre de proveedor,
  error con `role="alert"` sin stack ni payload, estado siempre con texto, divulgación en todos
  los estados); `AIRecommendationActions` (orden canónico, sólo lo aportado, reject no
  destructivo, `isBusy`, teclado + `aria-label` propio); `MarketingHero` (h1, dos CTA en orden,
  apilado móvil, sin rutas codificadas, layout split); `MarketingSection` (jerarquía, región);
  `MarketingFeatureCard` y `Grid` (estática vs enlace, icono decorativo, `Card` canónico,
  contenido largo, lista semántica y colapso de columnas); `MarketingCTAGroup` (orden de
  tabulación); y un guard de alcance de producto sobre el código fuente del grupo.
- `web/src/tests/a11y/design-system-ai-marketing.axe.test.tsx` — 8 tests: auditoría axe con **0
  violaciones de cualquier severidad** sobre los ocho estados AI y sobre la composición de
  marketing; asociación del error de formulario dentro de la edición; teclado y foco visible en
  las acciones AI; jerarquía de encabezados; validación del `FilterBar` canónico (una sola
  implementación, rejilla 1→2→3, orden de foco); objetivos táctiles; y reduced motion.

**Actualizados**

- `web/src/tests/unit/design-system/token-guardrails.test.ts` — inventario del grupo, estructura
  de directorios (`ai`, `marketing`), ausencia de anti-patterns de §31 (glow, degradados,
  iconografía sci-fi) y verificación de que `MarketingFeatureCard` compone el `Card` canónico.
- `web/src/tests/unit/design-tokens/integration.test.ts` — la auditoría de tokens `ai.*` se mueve
  de `AIBadge` a `AILabel` (donde ahora viven, y para todos sus consumidores) y se añade un test
  que verifica que `AIBadge` delega en la primitiva.

Los tests existentes de `AITaskPriorityCard` (8) y `HITLActions` (4) **no se modificaron**: las
migraciones preservan roles, nombres accesibles y comportamiento.

## 21. Consumidores migrados

| # | Categoría                     | Consumidor                                                       |
| - | ----------------------------- | ---------------------------------------------------------------- |
| 1 | Feature de recomendación AI   | `features/ai/task-priority/components/AITaskPriorityCard.tsx`     |
| 2 | Estado de carga AI            | El mismo card (pasa al patrón único aprobado)                     |
| 3 | Flujo de confirmación humana  | `features/ai/hitl/components/HITLActions.tsx`                     |
| 4 | Divulgación de IA             | `features/ai/event-plan/components/AIBadge.tsx` (sirve a event-plan, checklist, budget-suggestion y vendor-categories) |
| 5 | Hero de marketing             | `app/(public)/page.tsx`                                           |
| 6 | Grupo de feature cards        | El mismo `page.tsx`                                               |
| 7 | Defecto de accesibilidad      | `features/ai/vendor-categories/components/AICategoryCard.tsx` (`purple-*` genérico como color de marca) |

`FilterBar` **no** se migró: la validación confirmó que la implementación canónica ya cumple.

Sin cambios en rutas, permisos, contratos de API, lógica de negocio, mutaciones, comportamiento de
TanStack Query, persistencia de recomendaciones ni transiciones accepted/edited/rejected.

## 22. Comandos ejecutados

```bash
npx prettier --check <archivos tocados>   # ver nota en §23
npm run lint           # next lint --max-warnings=0
npm run typecheck      # tsc --noEmit
npm run test           # vitest run  (unit + integration + contract + a11y)
npm run test:a11y      # vitest run src/tests/a11y
npm run build          # next build
```

## 23. Resultados

| Comando                            | Resultado                                        |
| ---------------------------------- | ------------------------------------------------ |
| Formato                            | ✅ archivos tocados en estilo Prettier            |
| Lint                               | ✅ 0 warnings, 0 errores                          |
| Typecheck                          | ✅ sin errores                                    |
| Tests (unit + integración + contract + a11y) | ✅ 147 archivos · 1295 pasados · 1 saltado |
| Tests de accesibilidad             | ✅ 11 archivos · 69 pasados                       |
| Build de producción                | ✅ exit 0                                         |

> **Nota sobre el formato.** `npm run format` es `prettier --write "src/**/*"`: reescribe todo el
> árbol y arrastra la deriva de formato preexistente de ~290 archivos ajenos a esta tarea (deuda
> ya registrada en el record de PB-P2-031). Para mantener el diff acotado se ejecutó
> `prettier --check` sobre los archivos tocados.

No se usó `--force` ni se suprimió ningún fallo. No había fallos previos en el baseline; las
incidencias aparecidas durante la tarea fueron regresiones propias y se corrigieron (dos
guardarraíles que había que ampliar al nuevo grupo, un literal hexadecimal en un comentario, y un
guard de alcance de producto que capturaba su propia documentación).

## 24. Consumidores diferidos

- **Superficies AI**: `AISuggestionViewer`, `AIChecklistViewer`, `AIBudgetViewer`,
  `AIBudgetSuggestion`, `AIChecklistGenerator`, `AIPlanGenerator`, `AIRecommendedCategories`,
  `AIComparisonSummary`, `AIBriefAutocomplete`, `AIBriefField`, `AIRegenerateDialog`,
  `BudgetApplyContainer` y los tres diálogos de `hitl/budget`.
- **Marketing**: `MarketingHeader` y `MarketingFooter` (la landing sigue usando el header y el
  footer del layout público), `ProductPreview` y las páginas públicas de directorio y perfil de
  proveedor (`VendorHero`, `PublicVendorProfile`).
- **Estados AI sin consumidor todavía**: `accepted`, `edited`, `rejected` y `editing` están
  implementados y probados, pero ninguna superficie migrada los usa aún — el flujo de aceptación
  vive hoy en `HITLActions` + los diálogos de presupuesto.

## 25. Limitaciones conocidas

- **`Regenerating` no es un estado propio.** Component Foundations lo lista; aquí una regeneración
  se representa con `loading` (o con `isBusy` en las acciones). Añadir «contenido previo atenuado
  + skeleton nuevo» exige un consumidor que lo pida; hoy ninguno lo hace.
- **`Timeout` se trata como `error`.** El código `AI_TIMEOUT` ya tiene su mensaje en el catálogo;
  no se creó un noveno estado para una variante de error con el mismo comportamiento.
- **La validación visual del borde AI sigue abierta** (CMP-Q-003 / §31 border validation):
  `ai.border` sobre `ai.surface` mide ≈3.05:1 y requiere revisión en navegador al ancho real.
  Promoverlo a `violet.600` sería un ajuste de tokens, no un override en el componente; no se
  aplica en esta tarea.
- **Sin regresión visual automatizada ni Storybook**: el contraste se valida por tokens y axe, no
  por captura.
- **El glifo AI definitivo sigue abierto** (§34 / §46): se usa `Sparkles` de Lucide, coherente con
  lo que ya había en el repositorio.
- **La landing usa clases utilitarias para sus CTA** en lugar de `Button`, porque son enlaces de
  navegación (`next/link`) y `Button` renderiza `<button>`. Un `Button` polimórfico (`asChild`)
  resolvería el caso; no se introdujo para no cambiar la API de un componente ya adoptado.
- **`app/(public)/layout.tsx` conserva su header propio** con `border-neutral-200`: migrarlo
  entraba en «rediseñar páginas completas» y queda diferido junto a `MarketingHeader`.
