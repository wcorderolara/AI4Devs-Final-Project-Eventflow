# EventFlow — Visual Language Reference

> Análisis visual y de UX derivado de un diseño Figma de terceros usado **solo como referencia**.
> **No** se reutiliza branding, logo, nombre, copy, ni assets del proyecto original.
> Este documento captura el lenguaje visual observado y traduce recomendaciones para EventFlow.

- **Fecha de análisis:** 2026-07-21
- **Origen (referencia únicamente):** Figma file `7AiddoLnguvLGIqGAdEV6Z` — landing marketing de un event-organizer de terceros.
- **Método:** Figma MCP — `get_metadata` (estructura) + `get_variable_defs` (tokens) + `get_design_context` sobre el Hero (`10703:18`) + screenshot de página completa.
- **Alcance:** Extraer fundamentos visuales y patrones. Los frames no inspeccionados individualmente están marcados **[I]** (inferido).

**Leyenda de trazabilidad**
- **[O]** — Directamente observado en Figma
- **[I]** — Inferido a partir de patrones recurrentes
- **[EF]** — Recomendación específica para EventFlow

---

## A. Fundamentos visuales extraídos

### A.1 Identidad visual
- **Estética [O]:** Editorial-marketing moderno. Tipografía display muy grande, mucho espacio en blanco, cards flotantes sobre un gradiente suave. Se lee como *premium-lifestyle*, no como SaaS corporativo.
- **Personalidad de marca [I]:** Cálida, aspiracional, orientada a eventos/experiencias. Los acentos pastel + anclas navy suavizan el tono.
- **Tono emocional [I]:** Acogedor, celebratorio, humano. La combinación lilac + coral y el ícono de "gift-card" en "1K+ Event Handled" refuerzan el feel social/celebratorio.
- **Rasgos [I]:** Modern ✅ · Premium ✅ · Editorial ✅ · Playful (leve, vía pasteles) ✅ · Corporate ❌ · Minimalist (parcial — grid limpia pero no austera).

### A.2 Sistema de color
Los tokens son canónicos **[O]**; los roles están **[I]**.

| Token | Hex | Rol observado |
|---|---|---|
| `Heading` | `#1A2634` | Texto de headings; también botones oscuros, acentos oscuros. |
| `blue dark` | `#111022` | Fondo del botón CTA primario (casi negro). |
| `Main Text` | `#525252` | Body copy, etiquetas secundarias. |
| `line` | `#8F8F8F` | Bordes de social buttons outline + rellenos de image placeholders. |
| `Grey` | `#EFEFEF` | Superficie neutra. |
| `BG Grey` | `#FAFAFA` | Fondo de sección/página. |
| `Light grey` | `#F1F3F6` | Divisor inferior del navbar. |
| `White` | `#FFFFFF` | Superficie de cards, botón secundario. |
| `black` | `#000000` | No observado en body — probablemente reservado para logos/iconos. |
| `color accent 1` | `#C4B7E5` (lilac) | Panel decorativo del hero, primera social pill, formas de acento. |
| `color accent 2` | `#EE8C8D` (coral) | Panel decorativo derecho del hero, formas de gradiente. |
| `Yellow` | `#FEC200` | Definido pero no observado en frames inspeccionados — probable rating/highlight. |
| `gradient color` | *(vacío)* | Referenciado pero indefinido; el gradiente full-page (lilac → coral → magenta) se aplica vía clusters de ellipse/polygon decorativos, no vía token **[O]**. |

- **Colores de feedback/estado [O]:** No definidos en variables. El token Yellow probablemente dobla como warning/rating accent **[I]**.
- **Riesgos de contraste [I]:**
  - El nav item "Home" usa un radial gradient text fill (`rgba(148,109,248) → (238,140,141)`) sobre blanco — límite WCAG AA según en qué parte del gradiente se lea. Los stops rosados están en riesgo.
  - Body `#525252` sobre `#FFFFFF` ≈ 7.4:1 ✅ AAA.
  - Heading `#1A2634` sobre `#FFFFFF` ≈ 15.6:1 ✅ AAA.
  - `line` `#8F8F8F` sobre blanco ~2.8:1 — decorativo, no para texto.
  - Coral `#EE8C8D` y lilac `#C4B7E5` son **puramente decorativos** — nunca para texto/icono.

### A.3 Tipografía
Dos familias **[O]**:
- **Inter Tight** — todos los headings y display type (SemiBold/Medium).
- **Inter** — body copy y button labels (Regular/SemiBold/Bold).

Escala tipográfica **[O — tokens]**:

| Estilo | Familia | Peso | Size / LH / LS |
|---|---|---|---|
| H1 | Inter Tight | 600 | 90 / 96 / -1 |
| H2 | Inter Tight | 600 | 67 / 72 / -1 |
| H3 | Inter Tight | 600 | 50 / 64 / -1 |
| H4 | Inter Tight | 500 | 38 / 40 / -1 |
| H5 | Inter Tight | 600 | 28 / 36 / -1 |
| H6 | Inter Tight | 500 | 21 / 32 / -1 |
| H7 | Inter Tight | 600 | 16 / 24 / -1 |
| Sub Heading (eyebrow) | Inter Tight | 700 | 20 / 1.55 / **11 tracking** |
| Body P1 | Inter | 400 | 16 / 25 / 0 |
| Body P2 | Inter | 400 | 12 / 16 / 0 |
| Button text | Inter | 600 | 21 / 100 / **5.5 tracking** |
| H6 Underline | Inter | 700 | 16 / 32 / 0 |

- **Patrón de jerarquía [O]:** Display H1 de 90 px emparejado con body de 16 px — contraste enorme típico de sitios marketing editoriales.
- **Letter-spacing [O]:** Todos los headings usan tracking negativo (-1) para compactar; los eyebrow labels y buttons usan tracking positivo muy amplio (5.5–11) para elegancia.
- **Line-height 100 en button text es inusual [O]** — probable artefacto de Figma; en render efectivo se comporta como auto/normal.

### A.4 Sistema de layout
- **Ancho de canvas [O]:** 1440 px. **Safe area del contenido: x=98 → x=1342**, dando **~1244 px de content width** y **98 px de gutters** laterales.
- **Alturas de sección [O]:** Hero 1024 · About 344 · Services 789 · Schedule 621 · Pricing 887 · Testimonials 701 · Blog 949 · CTA 256 · Footer 504. Ritmo editorial — sin altura fija, cada sección dimensiona a su contenido.
- **Grid [O — en Hero + Schedule]:** Dos frames decorativos "Group 8" renderizan una **grilla de líneas 12-col × 5-row** usada puramente como textura visual, no como layout.
- **Alineación [O]:** Títulos de sección **centrados** (Services, Pricing, Testimonials, Blog); hero y About **alineados a la izquierda**. Ritmo deliberado: intro-sections a la izquierda, list-sections al centro.
- **Whitespace [I]:** Muy generoso — cards con 24–40 px de padding interno y gaps de 40+ px entre ellos.
- **Responsive [O]:** Solo existe el frame desktop de 1440 px — **no hay frames de tablet/mobile**. El comportamiento responsive no se puede inspeccionar.

### A.5 Sistema de spacing
Valores numéricos recurrentes observados:
- **4, 8, 16, 20, 24, 40, 56, 64, 80, 96, 98** px.
- Padding interno de cards: **24 px** (Services/Blog/Testimonials) o **40 px** (Pricing) **[O]**.
- Gaps de contenido: **8 px** (icon↔text en botones), **24 px** (heading↔body), **40 px** (entre items agrupados).
- Sección-a-sección: sin cadencia fija; las secciones arrancan en offsets naturales **[O]**.
- **Escala probable [I]:** `4 / 8 / 16 / 24 / 40 / 64 / 96` — escala base-4 con hueco entre 24 y 40 (no hay 32).

### A.6 Forma y elevación
- **Border-radius:** **0 px** en la mayoría de cards y botones **[O]** — las esquinas cuadradas son una elección estilística fuerte. Excepciones: **image placeholders + social pills ~27 px** (pill/circle) e **icon badges 80 px** (fully round).
- **Bordes:** `#8F8F8F` a **0.5 px** para social buttons outline; `#F1F3F6` a **1 px** para el divisor del navbar **[O]**.
- **Sombras — dos tokens definidos [O]:**
  - `shadow 5` (sutil): `0 49 57 -18 #0F0D1A@10%` + `0 37 30 -33 #0F0D1A@9%`
  - `Shadow` (fuerte): mismos offsets, primera capa a **22% alpha**.
  Ambas son de **large-y-offset, negative-spread** — feel **floating-panel**, no Material tray.
- **Layering:** Cards flotan sobre el gradiente de página con la sombra sutil; stat cards del hero flotan sobre bloques de imagen.

### A.7 Componentes UI (variantes observadas)
- **Botones:**
  - Primary — `#111022` bg, texto blanco, esquinas rectas, padding 24×20, ícono de flecha trailing (`east`). **[O]**
  - Secondary — bg blanco, texto `#1A2634`, misma forma, flecha oculta. **[O]**
  - CTA "Subscribe" en footer — mismo tratamiento primary. **[O]**
- **Icon badges:** círculos 40×40 (`rounded-[80px]`), navy o blanco — usados como acento dentro de cards. **[O]**
- **Nav items:** 16 px Inter Tight SemiBold, tracking negativo. Estado activo con **radial gradient text fill** (lilac → coral). **[O]**
- **Cards:**
  - Service card (388 × 427): imagen arriba, título, subtítulo, body. **[O]**
  - Schedule/Event card (602 × 405): imagen con date-tag chip superpuesto, título, categoría. **[O]**
  - Testimonial card (388 × 275): avatar + nombre + handle + quote + 5-star rating + score numérico. **[O]**
  - Pricing card (388 × 525): nombre, `$99.99` + `per month`, check-list de 5 items, footnote. **[O]**
  - Blog card (602 × 587): imagen, título, byline, excerpt, "Read more". **[O]**
- **Tags/Chips:** rounded pill dentro del image placeholder, 123–132 × 48 px, likely lilac fill **[I]**.
- **Star rating:** 5 estrellas de 20 px + score numérico (e.g. "4.9"). **[O]**
- **Inputs/forms:** **No presentes** en el file inspeccionado — no hay formularios visibles.
- **Modals / Tabs / Tables / Empty states:** **No presentes**.

### A.8 Patrones de landing page
- **Header [O]:** 80 px de alto, logo a la izquierda, menú de 4 items a la derecha (Home / About Us / Services / Contact Us), divisor inferior fino.
- **Hero [O]:**
  - Columna izquierda (541 px): eyebrow "Keep Smile" → H1 (90 px) → body → **dos botones side-by-side** → cuatro social pills.
  - Columna derecha: **collage asimétrico imagen + bloque de color** superpuesto con **stat cards flotantes** (`1K+ Event Handled`, `Joined Members`).
  - Bottom: **strip horizontal de logos** — 5 partner/press logos con 98 px de gap.
- **About [O]:** Full-width, dos columnas de headline + párrafo, seguido de **4 stat blocks** en fila.
- **Services [O]:** Heading centrado + grid 3-up de cards.
- **Schedule [O]:** Tabs verticales a la izquierda (`December / January / February`) con controles de flecha up/down + 2 event cards grandes a la derecha (carousel horizontal implicado **[I]**).
- **Pricing [O]:** Heading centrado + 3-up de plan cards, plan del medio destacado visualmente vía formas decorativas.
- **Testimonials [O]:** Heading centrado + 3-up de quote cards + controles de flecha prev/next + dot pagination.
- **Blog [O]:** Heading centrado + 2-up de article cards grandes.
- **CTA strip [O]:** Banda full-width, "Get Started With Us Today" a la izquierda, único botón **Subscribe** a la derecha.
- **Footer [O]:** 3 columnas (logo/descripción/social — contact — location con imagen de mapa estática) sobre bg oscuro, copyright bar debajo.
- **Ilustración [O]:** **Clusters de ellipse + polygon (blob/kite)** en lilac/coral distribuidos como acentos decorativos en los bordes de los frames. Este es el motivo visual signature.

### A.9 Patrones de plataforma autenticada
- **No presentes [O].** El file es solo una landing marketing. No se encontró sidebar nav, dashboard, tabla de datos, filtros, formularios ni vistas autenticadas.
- Cualquier patrón "app-like" para EventFlow debe **diseñarse original**, no se puede extraer de aquí.

### A.10 Interacción y motion
- **Variantes de componente observadas [O]:** Los nav items incluyen variantes ocultas de **chevron / expand_more** → implica menús dropdown. El botón "learn More" tiene un `east` arrow oculto → implica un **patrón de hover-reveal arrow**.
- **Hover / focus / active / disabled [O]:** Solo el estado **active** del nav (gradient text fill) es visible. **No existen focus rings, disabled variants, ni tokens de transición** en el file. Motion no se puede inspeccionar.

### A.11 Accesibilidad — hallazgos
- **Contraste [I]:**
  - Nav gradient text (violeta→coral sobre blanco): el extremo coral (~#EE8C8D) falla WCAG AA para texto de 16 px — el estado activo está en riesgo de ser ilegible en los stops rosados.
  - Body `#525252` sobre `#FFFFFF` ≈ 7.4:1 ✅ AAA.
  - Heading `#1A2634` sobre `#FFFFFF` ≈ 15.6:1 ✅ AAA.
  - `line` `#8F8F8F` sobre blanco ~2.8:1 — solo decorativo, no para texto.
  - Coral `#EE8C8D` y lilac `#C4B7E5` son **puramente decorativos** — nunca para texto/icono.
- **Small text [O]:** `Main Text/P2` a 12 px / 16 lh es borderline; usado para `@accountname` handles y copyright. Debe reservarse solo para meta.
- **Focus visibility [O]:** **No definido.** No existe estilo de focus ring en el file.
- **Touch targets [O]:** Social pills 40 × 40 (mínimo recomendado 44, borderline). Icon badges 40 × 40. Nav items 24 px de alto — **por debajo del mínimo 44 px**; requiere padding para touch.
- **Semántica [O]:** El file contiene typos en nombres de layers (`Butoon`, `label opy=tion`) — señal de higiene, no accesibilidad per se, pero sugiere que estos componentes no han pasado por review de a11y.

---

## B. Lenguaje de landing page (patrones candidatos)

Patrones que vale la pena adoptar en el sitio marketing de EventFlow **[I / EF]**:

1. **Hero editorial asimétrico** — headline display enorme + collage de imágenes + "proof cards" flotantes. Muy efectivo para tono premium.
2. **Stack eyebrow + H1 + body + dual button** — patrón F limpio, bien probado.
3. **Fila de 4 stats bajo About** — social proof sin copy pesado.
4. **Grid de service cards** (image-top, título, subtítulo, body) — reutilizable en marketing.
5. **Headings de sección centrados** para list-style; **left-aligned** para narrativa.
6. **Pricing 3-up** con plan del medio destacado (vía shape decorativo, no solo color).
7. **Testimonial cards con avatar + handle + quote + star rating**.
8. **CTA strip full-width** con un único primary action antes del footer.
9. **Strip de logos partner/press** justo debajo del hero.
10. **Blobs decorativos de gradiente** — estilo signature; agrega calidez sin imagery.

---

## C. Lenguaje de plataforma autenticada

**No presente en la referencia. [O]**
La referencia contribuye **cero patrones de app** — no se inspeccionó sidebar, dashboard, tabla ni form. La experiencia autenticada de EventFlow debe diseñarse de forma independiente, informada solo por los **fundamentos** (tokens, escala tipográfica, radius, sombras) que decidamos reutilizar.

---

## D. Patrones de diseño reutilizables

| Patrón | Veredicto de reuso | Notas |
|---|---|---|
| Escala tipográfica (Inter Tight + Inter) | ✅ Reutilizable **[EF]** | Ambas libres, multi-idioma, legibles. Mantener progresión H1–H7; considerar bajar H1 a 72 px para densidad de app. |
| Paleta neutra (`#1A2634`, `#525252`, `#FAFAFA`, `#F1F3F6`) | ✅ Reutilizable **[EF]** | Excelente contraste; brand-agnóstica. |
| Tokens de sombra (suaves, large-y, negative-spread) | ✅ Reutilizable **[EF]** | Feel signature para marketing cards. Para app UI definir un set de sombras **más apretado**. |
| Radius 0 en botones/cards | ⚠️ Adaptar **[EF]** | Editorial y fuerte, pero potencialmente frío para un SaaS amigable. Considerar **8–12 px** para cards y **6 px** para botones en EventFlow. |
| Icon badges circulares (40 px, `rounded-full`) | ✅ Reutilizable **[EF]** | Excelentes dentro de cards; mantener. |
| Patrón dual-button hero | ✅ Reutilizable **[EF]** | |
| Stat proof-row | ✅ Reutilizable **[EF]** | |
| Pricing 3-up | ✅ Reutilizable **[EF]** | |
| Testimonial card con star rating | ✅ Reutilizable **[EF]** | |
| CTA strip antes del footer | ✅ Reutilizable **[EF]** | |

---

## E. Hallazgos de accesibilidad (consolidado)

- **Adoptar pero re-afinar el color system para a11y [EF]:**
  - Mantener neutrales como están (todos pasan AAA sobre blanco).
  - Restringir `color accent 1` (lilac) y `color accent 2` (coral) a **uso decorativo/background** — nunca texto o ícono.
  - Agregar un **accent hover/active** que pase 4.5:1 sobre blanco (un violeta o magenta más oscuro tipo `#5B3B9E`).
- **Definir tokens de focus que la referencia no tiene [EF]:** `focus-ring: 2 px solid <accent-strong> + 2 px offset`.
- **Touch targets del nav:** padear a ≥44 × 44 px **[EF]**.
- **No adoptar el radial-gradient text fill para nav activo** — reemplazar con subrayado o color sólido que cumpla contraste **[EF]**.
- **Star ratings** deben cargar un equivalente en texto (ya presente como "4.9") — mantener ese patrón **[EF]**.

---

## F. Adaptaciones recomendadas para EventFlow

1. **Fundamentos [EF]**
   - Reusar: Inter/Inter Tight, escala de spacing, paleta neutra, estilo de sombra.
   - Reemplazar: los dos accents decorativos por un duo propio de EventFlow. Sugerencia: un pairing **teal→amber** o **indigo→amber** que cargue semántica de "event / spotlight" y nos dé un accent oscuro accesible para texto.
   - Agregar: colores de estado que la referencia no define — success, warning, danger, info.
2. **Radius [EF]:** Introducir un **soft 8–12 px** como default para cards y 6 px para botones — retiene calidez manteniendo el feel editorial de los headings tightly-tracked.
3. **Tipografía [EF]:** Capar H1 en 72 px para pantallas de app; reservar 90 px solo para hero marketing.
4. **Motion [EF]:** Definir transiciones que la referencia omite — 150 ms ease-out para hover, 250 ms para card lift, 400 ms para reveal de sección.
5. **Sistema de app [EF]:** Diseñar **desde cero** usando los fundamentos reusados — sidebar nav, dashboard KPIs, event list/detail, attendee tables, form controls, empty states, modals — ninguno existe en esta referencia.
6. **Sitio marketing:** Los 9 patrones de landing de la sección B son puntos de partida viables. Rework de copy/imagery al storytelling de EventFlow.

---

## G. Elementos que NO deben copiarse literalmente

- **El logo/wordmark "Jurny"** (`imgJurny`, `imgGroup45`) **[O]** — marca propietaria.
- **Todos los assets raster/vector** referenciados por las URLs `imgLayer12`, `imgLayer22`, `imgGroup8`, `imgVector`, `imgCardGiftcard`, `imgPersonAddAlt1`, `imgEast`, `imgTw`, `imgFb`, `imgGroup1`, `imgGroup2`, `imgImagePlacehlder2` — asset store de terceros, expiran en ~7 días de todos modos.
- **Logos partner "Growtify" / "Gold Fish"** del hero **[O]** — marcas de terceros.
- **El Lorem Europan Ipsum body copy** y cualquier string producto-específico (`Keep Smile`, `Your Premier Event Partner`, `Get Started With Us Today`, nombres de planes, nombres de testimonials) **[O]**.
- **El duo exacto lilac + coral** como signature de EventFlow — esa es la identidad de Jurny. Reusar el *patrón* (dos accents suaves), no la *paleta*.
- **El radial gradient text fill del nav activo** — styling propietario + riesgo de a11y. Reemplazar.
- **Los clusters decorativos de blob/kite** — es la firma visual de la referencia; imitarlos se leería como derivativo.

---

## H. Preguntas abiertas para Product Owner / UX

1. **Paridad marketing vs. app** — ¿el app autenticado de EventFlow debe compartir el carácter editorial del sitio marketing (tipografía grande, cards flotantes, accents decorativos), o mantenerse más cercano a un SaaS data-dense?
2. **Brand accents** — ¿locamos un duo propio de EventFlow (e.g. indigo + amber, teal + coral, forest + gold), o esperamos a un ejercicio de brand?
3. **Lenguaje de radius** — sharp (0 px, editorial) vs. soft (8–12 px, friendly SaaS). Recomendación: soft; requiere sign-off.
4. **Escala de H1 en hero** — 90 px es fuerte; ¿lo queremos así de loud, o bajamos a 64–72 px?
5. **Estrategia responsive** — la referencia no tiene frames tablet/mobile; ¿diseñamos mobile-first y derivamos desktop, o al revés?
6. **Dark mode** — la referencia es single-mode; ¿dark mode entra en scope para MVP?
7. **Sistema de motion** — indefinido en referencia; ¿hay budget para una pasada dedicada de micro-interacción?
8. **Component library** — ¿construimos sobre una base (Radix / shadcn / MUI) o hand-roll? Impacta qué tan tightly podemos matchear este visual language.
9. **El token `gradient color` indefinido** — placeholder en la referencia. ¿EventFlow quiere un gradiente signature (aurora / sunset / dawn)?
10. **Iconografía** — la referencia usa Material icons (`east`, `expand_more`, `card_giftcard`, `person_add_alt_1`). ¿Adoptamos Material Symbols, Lucide, o un set custom?

---

## Caveats de confianza

- **Todos los tokens, escala tipográfica, colores, estructura y código del componente Hero son directamente observados.**
- **Los internals de componentes no-Hero (shapes de pricing, sombra de blog card, color de star fill de testimonials) son inferidos** desde el metadata tree + screenshot general; no se llamó `get_design_context` individualmente sobre esos frames. Si alguno de esos detalles inferidos es load-bearing para una decisión, se puede volver a la fuente y extraer el frame específico.
- **No existen datos responsive, motion, dark-mode, focus-state ni app-autenticada** en este file. Esas secciones están explícitamente marcadas como "no presente" en vez de fabricadas.

---

## Anexo — Referencia de tokens en formato copy-paste

Para acelerar la implementación en Tailwind / CSS custom properties, aquí están los valores canónicos observados. **Todavía deben ser validados contra la paleta oficial de EventFlow** antes de codificarlos.

```txt
# Colores neutros (candidatos directos de reuso)
--color-heading:      #1A2634
--color-blue-dark:    #111022
--color-text:         #525252
--color-line:         #8F8F8F
--color-grey:         #EFEFEF
--color-bg-grey:      #FAFAFA
--color-light-grey:   #F1F3F6
--color-white:        #FFFFFF

# Accents decorativos (NO reusar tal cual — reemplazar por duo de EventFlow)
--color-accent-1:     #C4B7E5   # lilac — solo decorativo
--color-accent-2:     #EE8C8D   # coral — solo decorativo
--color-yellow:       #FEC200   # rating/highlight

# Sombra sutil (para cards en marketing)
--shadow-soft: 0 49px 57px -18px rgba(15,13,26,0.10),
               0 37px 30px -33px rgba(15,13,26,0.09);

# Sombra fuerte
--shadow-strong: 0 49px 57px -18px rgba(15,13,26,0.22),
                 0 37px 30px -33px rgba(15,13,26,0.09);

# Type scale (adaptar sizes para app density antes de codificar)
h1: Inter Tight 600 90/96 -1
h2: Inter Tight 600 67/72 -1
h3: Inter Tight 600 50/64 -1
h4: Inter Tight 500 38/40 -1
h5: Inter Tight 600 28/36 -1
h6: Inter Tight 500 21/32 -1
h7: Inter Tight 600 16/24 -1
eyebrow: Inter Tight 700 20/1.55 +11
body-p1: Inter 400 16/25 0
body-p2: Inter 400 12/16 0
button:  Inter 600 21 +5.5
```
