# EventFlow — UI Foundations

## Document metadata

| Campo | Valor |
|---|---|
| Nombre del documento | EventFlow — UI Foundations |
| Versión | 1.0 |
| Estado | Ready for Product Owner review |
| Fecha | 2026-07-21 |
| Idioma | Español LATAM neutral |
| Producto | EventFlow — plataforma web responsive de planificación de eventos asistida por IA |
| Audiencia | Product Owner, Business Analyst, UX/UI designers, frontend engineers, QA engineers, AI coding agents, evaluadores académicos, futuros mantenedores |
| Alcance | Fundamentos visuales y de interacción para el MVP (landing marketing + plataforma autenticada). No cubre Design Tokens finales, especificaciones completas de componentes, mockups Figma pixel-perfect ni implementación frontend |
| Artefactos relacionados | `docs/ux-ui/EventFlow-Visual-Language-Reference.md`, `docs/2-Product-Owner-Decisions.md`, `docs/3-MVP-Scope-Definition.md`, `docs/4-Business-Rules-Document.md`, `docs/5-User-Roles-Permissions-Matrix.md`, `docs/7-AI-Features-Specification.md`, `docs/8-Use-Cases-Specification.md`, `docs/9-Functional-Requirements-Document.md`, `docs/10-Non-Functional-Requirements.md`, `docs/15-Frontend-Architecture-Design.md`, `docs/17-AI-Architecture-and-PromptOps-Design.md`. Próximo artefacto downstream: `docs/ux-ui/EventFlow-Design-Tokens.md` |

---

## 1. Propósito

Este documento establece los **fundamentos visuales y de interacción oficiales** de EventFlow para el MVP. Su propósito es:

- Traducir las **decisiones aprobadas del Product Owner** (UI-DEC-001..UI-DEC-015), el análisis visual del reference Figma de terceros y el contexto funcional y arquitectónico del producto en una base normativa estable.
- Servir como **fuente de verdad** para los siguientes artefactos downstream: `EventFlow-Design-Tokens.md`, `EventFlow-Component-Foundations.md`, los diseños Figma originales de EventFlow y la implementación frontend en Next.js + Tailwind.
- Fijar la separación entre la **landing marketing** (personalidad editorial, cálida, aspiracional) y la **plataforma autenticada** (limpia, funcional, escaneable) sin fragmentar la identidad de marca.
- Establecer las reglas para el **tratamiento visual de la IA** (human-in-the-loop), la **accesibilidad WCAG 2.1 AA**, la **internacionalización a cuatro locales** y la **visualización de moneda inmutable por evento**.
- Diferenciarse del `EventFlow-Visual-Language-Reference.md`, cuyo alcance es solo **describir e inspeccionar** el reference Figma externo (`Jurny`) y traducir hallazgos como **candidatos**. Este documento en cambio es **normativo y aprobado**: define qué se adopta, qué se adapta y qué se rechaza para EventFlow.

Los artefactos que dependen de este documento son:

- `EventFlow-Design-Tokens.md` — traduce estas foundations a valores concretos (color scales, spacing scale, breakpoints, shadows, radius, focus rings).
- `EventFlow-Component-Foundations.md` — define anatomía y variantes de componentes.
- Figma screen designs — mockups pixel-perfect de landing y pantallas autenticadas.
- Frontend implementation — Tailwind CSS + Next.js App Router + next-intl (per `docs/15-Frontend-Architecture-Design.md`).

---

## 2. Alcance

### 2.1 Incluido

- Dirección visual oficial de EventFlow.
- Estrategia de color foundational (paleta base aprobada, restricciones decorativas, separación semántica).
- Estrategia tipográfica (familias, jerarquía conceptual, diferenciación landing vs. plataforma).
- Layout, grid, spacing, densidad, forma, bordes y elevación.
- Modelo de navegación compartida entre roles (`organizer`, `vendor`, `admin`).
- Tratamiento visual de la experiencia asistida por IA (human-in-the-loop).
- Tratamiento de fotografía, imagery, iconografía y formas decorativas.
- Reglas de responsive design (`desktop`, `tablet`, `mobile`).
- Requisitos de accesibilidad WCAG 2.1 AA (obligatorios).
- Internacionalización (`es-LATAM`, `es-ES`, `pt`, `en`) y visualización de moneda inmutable.
- Estados de sistema (loading, empty, error, success, warning, info, disabled, AI timeout/fallback, permission denied, not found).
- Diferenciación entre foundations de la **landing marketing** y de la **plataforma autenticada**.
- Registro de decisiones aprobadas y decisiones deferidas.

### 2.2 No incluido

- Design tokens finales (color scales `50–950`, tipo escalas en px, spacing scale, breakpoints, shadow values, focus-ring exactos) — pertenecen a `EventFlow-Design-Tokens.md`.
- Especificaciones completas de componentes (button anatomy, input variants, table variants, modal anatomy, toast anatomy) — pertenecen a `EventFlow-Component-Foundations.md`.
- Mockups Figma pixel-perfect ni final art direction de la landing.
- Implementación React/TSX, clases Tailwind, CSS variables o Storybook stories.
- Sistema detallado de animación / motion tokens.
- Dark mode (excluido del MVP per UI-DEC-013).
- Features post-MVP: pagos reales, contratos digitales, chat en tiempo real, WhatsApp, RSVP, seating plans, app móvil nativa, moderación IA automática, generación de imágenes IA.

---

## 3. Fuentes utilizadas

Todas las fuentes listadas fueron leídas antes de generar este artefacto.

| Fuente | Contribución al documento |
|---|---|
| `docs/ux-ui/EventFlow-Visual-Language-Reference.md` | Análisis visual del reference Figma de terceros (`Jurny`). Provee vocabulario para las decisiones Adopt / Adapt / Reject y evidencia sobre riesgos de contraste, patrones de landing y ausencia total de patrones de plataforma autenticada. |
| `docs/2-Product-Owner-Decisions.md` | Decisiones oficiales del PO: mercado piloto Guatemala, branding premium/aspiracional accesible, cuatro locales soportados, moneda por evento sin conversión, LATAM cultural fit, seed data como base de demo. |
| `docs/3-MVP-Scope-Definition.md` | Scope funcional del MVP, principios "workspace primero, marketplace después" y "IA asiste, no decide". Roles, tipos de evento, y features Must/Should/Could. |
| `docs/4-Business-Rules-Document.md` | Reglas de negocio críticas para UI: BR-EVENT-007 (moneda inmutable), BR-BUDGET-006/007 (moneda configurable sin conversión), BR-AI-003 (distinción visual sugerencia IA vs. confirmado), BR-AI-011 (idioma como parámetro IA), BR-I18N-001 (cuatro idiomas). |
| `docs/5-User-Roles-Permissions-Matrix.md` | Matriz de permisos para `organizer`, `vendor`, `admin`. Base para navegación por rol y visibilidad de secciones. |
| `docs/7-AI-Features-Specification.md` | Catálogo de features IA del MVP y su expectativa de human-in-the-loop. Alimenta las reglas visuales de AI-assisted UX. |
| `docs/8-Use-Cases-Specification.md` | Casos de uso E2E que la UI debe soportar (creación de evento, generación IA, cotización, comparación, booking intent, reseñas). |
| `docs/9-Functional-Requirements-Document.md` | Requerimientos funcionales que fijan comportamiento visible (FR-EVENT-*, FR-AI-*, FR-QUOTE-*, FR-BUDGET-*, FR-I18N-*, FR-ADMIN-*). |
| `docs/10-Non-Functional-Requirements.md` | NFRs mandatorios: NFR-USAB-001..006, NFR-A11Y-001..005, NFR-I18N-001..006, NFR-AI-001..003. Fijan responsive, distinción visual IA, dashboards por rol, i18n operativa y moneda inmutable. |
| `docs/15-Frontend-Architecture-Design.md` | Stack (Next.js App Router + Tailwind + next-intl + TanStack Query), Server vs. Client Components, autenticación cookie HTTP-only, RBAC + ownership-aware UX, estados estándar (loading/empty/error/success), componente `<AIPanel>`, componente `<Money>`, `<LanguageSelector />`, `<EventLanguageSelector />`. |
| `docs/17-AI-Architecture-and-PromptOps-Design.md` | Contrato AI UX del frontend: badges obligatorios "Sugerencia IA", `fallback_used`, aplicar/editar/descartar, timeout `AI_PROVIDER_TIMEOUT`, banner de fallback, restricción de que el frontend nunca llama a OpenAI/Anthropic directamente. |

### Fuentes no disponibles

- **`DESIGN_SYSTEM_SETUP_IMAGE`** — el operador indicó explícitamente que no se provee imagen de setup del design system. Se continúa el trabajo apoyado en las fuentes restantes; ninguna decisión aprobada quedó bloqueada por su ausencia.

---

## 4. Autoridad de fuentes y jerarquía de decisión

Cuando dos fuentes entran en conflicto, aplica el siguiente orden de autoridad (de mayor a menor):

1. **Decisiones aprobadas del Product Owner** (UI-DEC-001..UI-DEC-015 y `docs/2-Product-Owner-Decisions.md`).
2. **MVP Scope Definition** (`docs/3-MVP-Scope-Definition.md`).
3. **Business Rules** (`docs/4-Business-Rules-Document.md`) y **Roles & Permissions** (`docs/5-User-Roles-Permissions-Matrix.md`).
4. **Functional Requirements** (`docs/9-Functional-Requirements-Document.md`) y **Non-Functional Requirements** (`docs/10-Non-Functional-Requirements.md`).
5. **Frontend Architecture** (`docs/15-Frontend-Architecture-Design.md`) y **AI Architecture** (`docs/17-AI-Architecture-and-PromptOps-Design.md`).
6. **EventFlow Visual Language Reference** (`docs/ux-ui/EventFlow-Visual-Language-Reference.md`) — inspección del reference Figma de terceros.
7. **Design System Setup reference image** — no disponible en esta iteración.
8. **Recomendaciones generales de UX/UI**.

El reference Figma de terceros (`Jurny`) es **solo material de consulta visual**. Nunca se considera fuente de verdad para: funcionalidad de EventFlow, permisos de navegación, reglas de negocio, roles, alcance de features, copy del producto, branding, logos, assets propietarios o comportamiento de la plataforma autenticada. Los assets, logos, wordmark, copy y paleta exacta del reference están explícitamente **prohibidos de ser copiados**.

---

## 5. Contexto de producto y experiencia

EventFlow MVP es una **web responsive multilenguaje** que:

- **Convierte una idea suelta de evento en un plan accionable** (timeline + checklist + presupuesto + categorías de proveedor) con asistencia de IA (`Approved`, PB-P1 MVP scope §2, §3).
- Soporta tres **roles** con permisos y flujos distintos pero **una sola identidad visual** compartida (`Approved`, UI-DEC-008, UI-DEC-009):
  - `organizer` — planifica eventos, usa IA, envía `QuoteRequest`, compara `Quotes`, confirma `BookingIntent`, deja `Review`.
  - `vendor` — mantiene `VendorProfile` aprobado, define `VendorService`, responde `Quotes`, confirma `BookingIntent`.
  - `admin` — aprueba proveedores, cura `ServiceCategory`, modera `Review`, consulta métricas y `AdminAction`.
- Cubre seis **tipos de evento** priorizados: `wedding`, `xv`, `baptism`, `baby_shower`, `birthday`, `corporate` (`Derived`, MVP §6).
- Usa **IA como copiloto human-in-the-loop**, nunca como agente autónomo (`Approved`, NFR-AI-002; BR-AI-004). Toda salida IA es **sugerencia editable** hasta que el humano la confirma (`Approved`, NFR-AI-001; UI-DEC-010).
- Es **responsive web**, no app nativa (`Approved`, NFR-USAB-001; PO decisión #6).
- Soporta **cuatro locales**: `es-LATAM` (base), `es-ES`, `pt`, `en` (`Approved`, NFR-I18N-001; BR-I18N-001).
- Asigna **moneda por evento** en creación; **inmutable** posteriormente; **no realiza conversión** entre monedas (`Approved`, BR-EVENT-007, BR-BUDGET-006/007; NFR-I18N-004/005).
- Se demuestra con **datos seed reproducibles** (`Derived`, MVP §7.16).

Restricciones de alcance para UI (no introducir ni implicar en la UI Foundations):

- Pagos reales, procesamiento de tarjetas, comisiones, contratos digitales, firma electrónica.
- Chat en tiempo real, WhatsApp, SMS, push notifications.
- App móvil nativa, RSVP, seating plans, lista de invitados, calendario de disponibilidad avanzado.
- Colaboración multi-usuario por evento, marketplace transaccional completo.
- Decisiones autónomas de IA, moderación automática con IA, generación IA de imágenes/decoración, chatbot conversacional libre.

---

## 6. Dirección oficial de experiencia EventFlow

EventFlow adopta una **dirección visual balanceada** (`Approved`, UI-DEC-001) que separa dos personalidades dentro de una sola identidad:

**Landing marketing** — cálida, aspiracional, editorial, premium, humana, celebratoria, espaciosa.

**Plataforma autenticada** — limpia, funcional, estructurada, calmada, clara, orientada a productividad, más fácil de escanear que la landing.

EventFlow **no** debe percibirse como:

- Un SaaS corporativo genérico.
- Una app de consumidor altamente playful.
- Un clon del reference Figma de terceros.
- Un dashboard enterprise visualmente sobrecargado.

### Principios oficiales de UI (foundation principles)

1. **Premium pero accesible** — elegante y aspiracional sin volverse corporativo frío ni cerrado a públicos amplios (`Approved`, PO Decisions §5).
2. **Marketing cálido, producto calmado** — la landing puede ser editorial y grande; el producto autenticado prioriza escaneabilidad (`Approved`, UI-DEC-001, UI-DEC-005).
3. **Jerarquía antes que decoración** — la información y las acciones vienen primero; el ornamento nunca compite con la lectura (`Derived`).
4. **Las sugerencias IA son siempre distinguibles** — badge, superficie, y label explícita separan sugerido de confirmado (`Approved`, UI-DEC-010; BR-AI-003; NFR-USAB-002).
5. **La confirmación humana es explícita** — ninguna salida IA se materializa como dato oficial sin que la persona la acepte (`Approved`, NFR-AI-001; AI Architecture §15).
6. **Responsive por defecto** — mobile-first en implementación; adaptaciones deliberadas por breakpoint (`Approved`, NFR-USAB-001; UI-DEC-012).
7. **La accesibilidad es baseline** — WCAG 2.1 AA como piso mínimo, no como upgrade opcional (`Approved`, UI-DEC-015; NFR-A11Y-001..005).
8. **Un solo sistema visual compartido entre roles** — la diferenciación se hace por badge, contenido y navegación, no por color (`Approved`, UI-DEC-008, UI-DEC-009).
9. **Los colores semánticos son independientes de los colores de marca** — violeta, lilac y coral no representan éxito, warning ni error (`Approved`, UI-DEC-002, UI-DEC-014).
10. **Simplicidad MVP sobre sobre-ingeniería visual** — la profundidad se difiere a Design Tokens y Component Foundations (`Derived`, MVP §4 principio #6).

---

## 7. Fundamentos de landing page

La landing marketing de EventFlow proyecta la personalidad **cálida, aspiracional, editorial** aprobada. Sus fundamentos son:

- **Composición general** (`Recommended`, derivado de UI-DEC-001 + VLR §B): jerarquía editorial con hero grande, secciones diferenciadas por ritmo y whitespace, cards flotantes moderadas.
- **Whitespace** (`Approved`, UI-DEC-005): generoso; separación amplia entre secciones; información simultánea limitada. Evita densidad enterprise.
- **Jerarquía del hero** (`Recommended`): stack `eyebrow` → `H1 display` → `body large` → CTAs → apoyo visual (imagen, product mockup o composición decorativa). El H1 puede ser más grande que en el producto per UI-DEC-004.
- **Comportamiento de CTAs** (`Approved`, UI-DEC-003):
  - CTA primaria en landing: **oscura**.
  - CTA secundaria: **blanca / outlined / neutral / ghost**.
  - El violeta decorativo puede acompañar pero no domina cada acción marketing.
- **Fotografía** (`Approved`, UI-DEC-011): eventos reales (bodas, XV años, baby showers, corporativos) con relevancia cultural LATAM. Evitar stock corporativo genérico. Sin imagen generada por IA.
- **Formas decorativas** (`Approved`, UI-DEC-011): shapes abstractos, acentos lilac / coral / violeta, gradientes controlados. Se toma el **patrón** de decoración con blobs, no las paletas ni composiciones exactas del reference (ver §7 del VLR).
- **Product screenshots o mockups realistas** (`Approved`, UI-DEC-011): permitidos para reforzar credibilidad; deben mostrar UI real o mockups fieles, nunca UI ficticia.
- **Ritmo de secciones** (`Derived`): las secciones list-style pueden centrar headings; las secciones narrativas pueden alinear a la izquierda. Alturas variables; sin altura fija impuesta.
- **Cards** (`Approved`, UI-DEC-006, UI-DEC-007): radius soft (~12–16 px como punto de partida en Design Tokens), sombras suaves permitidas.
- **Trust y social proof** (`Recommended`): pueden usarse patrones tipo stat row, logo strip o testimonial cards, siempre con **contenido real** aprobado por PO. Este documento **no** inventa testimonials, métricas, logos de clientes ni claims de producto.
- **Footer** (`Derived`): agrupa navegación, información legal, selector de idioma (per US-081, `<LanguageSelector />`) y accesos secundarios. Contraste y jerarquía visible.
- **Adaptación responsive** (`Approved`, UI-DEC-012): apila secciones verticalmente en mobile; hero admite composiciones full-bleed en desktop; forms/CTAs se apilan en mobile.

Restricciones explícitas para la landing:

- No copiar assets, wordmark, copy, ni la paleta exacta lilac + coral del reference (`Reference` → `Reject`, VLR §G).
- No usar decorative light colors (lilac, coral) como color de texto (`Approved`, UI-DEC-002; VLR §A.11).
- No usar radial gradient text fill para nav activo (riesgo de contraste, `Reject`).
- No usar radius 0 estilo editorial fuerte por defecto (adoptar radius soft per UI-DEC-006).

---

## 8. Fundamentos de la plataforma autenticada

La plataforma autenticada de EventFlow proyecta la personalidad **limpia, funcional, estructurada, calmada, escaneable** aprobada.

> Nota importante: el reference Figma inspeccionado **no contiene ningún patrón de plataforma autenticada** (VLR §A.9, §C). Todos los patrones de esta sección son foundations **EventFlow-específicas**, derivadas de `docs/15-Frontend-Architecture-Design.md`, `docs/9-Functional-Requirements-Document.md` y los principios aprobados por el PO.

- **Application shell compartido** (`Approved`, UI-DEC-008): sidebar en desktop, drawer en mobile. Un solo shell para los tres roles.
- **Sidebar** (`Approved`, UI-DEC-008; `Derived` de FE Architecture §20): navegación por rol (organizer / vendor / admin), items con estados **default, hover, active, focus, disabled** y variante **collapsed** cuando aplique. La visibilidad de items depende del rol y de la ownership; el backend es la autoridad final (BR-AUTH-009/010; FE Architecture §22).
- **Page headers** (`Recommended`): título de página, breadcrumb cuando la profundidad lo justifique, acciones primarias contextuales alineadas a la derecha, badge de rol visible cuando aporta claridad.
- **Content containers** (`Approved`, UI-DEC-012): layout fluido; forms limitados a un ancho de lectura razonable (referencia inicial ≈ 720 px máximo); tables pueden usar contenedores más anchos.
- **Dashboards** (`Derived`, NFR-USAB-003): cada rol tiene un dashboard con métricas y accesos relevantes. Densidad **intermedia** (UI-DEC-005): comfortable, no enterprise-dense.
- **Formularios** (`Approved`, UI-DEC-004; `Derived` de FE Architecture §27): labels visibles, helper text, indicadores de required/optional, mensajes de validación claros y accionables (NFR-USAB-004).
- **Tablas** (`Derived`): densidad ligeramente más compacta que forms; encabezados legibles; estados visibles (loading, empty, error); alternativas responsive en mobile (ver §22).
- **Filtros** (`Derived`): superficie clara, agrupados, con estado activo visible; deben poder reset-earse.
- **Cards** (`Approved`, UI-DEC-006): radius soft (12–16 px starting range), superficie separada del fondo por borde ligero o sombra sutil (UI-DEC-007).
- **Modales y drawers** (`Approved`, UI-DEC-006): radius 16 px starting; foco correctamente gestionado (UI-DEC-015); fondo dimmed accesible.
- **Empty states** (`Approved`, UI-DEC-015; `Derived` FE Architecture §28.1): título + descripción breve + CTA relevante. Nunca dejar la pantalla vacía sin contexto.
- **Densidad operativa** (`Approved`, UI-DEC-005): comfortable en dashboards y formularios; ligeramente más compacta en tablas y listas admin. Evitar whitespace excesivo en pantallas operacionales.
- **Consistencia entre roles** (`Approved`, UI-DEC-008, UI-DEC-009): idéntico shell, idéntica tipografía, idéntica paleta funcional. Solo cambian navegación, contenido, métricas, iconografía contextual y badge de rol.

---

## 9. Guía de experiencia por rol

### 9.1 Organizer

El foco visual es el **progreso del evento y la calma del planificador**.

- Enfatiza: progreso del evento (dashboard), próximas tareas del checklist, presupuesto (planned / committed), sugerencias IA pendientes, cotizaciones activas, `BookingIntent` en curso.
- Tono: calmado, orientado a control, con jerarquía muy clara entre "qué sigue" y "qué está terminado".
- Componentes clave: `<AIEventPlanPanel>`, `<AIChecklistPanel>`, `<AIBudgetPanel>`, `<AIVendorCategoryPanel>`, `<AIQuoteBriefPanel>`, `<AIQuoteCompareSummary>` (per FE Architecture §29.3).
- Trazabilidad: FR-EVENT-004, FR-AI-011..017, FR-BUDGET-*, FR-QUOTE-*, UC-EVENT-*, UC-AI-*, UC-QUOTE-*.

### 9.2 Vendor

El foco visual es el **estado del negocio y las acciones claras**.

- Enfatiza: estado de aprobación de `VendorProfile` (pending / approved / rejected), completitud del portafolio, `QuoteRequest` entrantes, `Quote` en borrador y enviadas, `Review` recibidas, `BookingIntent` a confirmar.
- Tono: profesional, business-oriented, con estados visibles (aprobado / pendiente / rechazado) y CTAs bien delimitadas.
- Componentes: `<AIVendorBioPanel>` opcional para asistencia de bio y descripciones (FE Architecture §29.3).
- Trazabilidad: FR-VENDOR-*, FR-QUOTE-*, FR-REVIEW-*, UC-VENDOR-*, UC-QUOTE-*.

### 9.3 Admin

El foco visual es la **gobernanza, la moderación y la visibilidad auditable**.

- Enfatiza: colas de aprobación de proveedores, moderación de reseñas, gestión de categorías, métricas básicas, log `AdminAction`, gestión de seed/demo.
- Tono: neutral, informativo, con densidad de información **ligeramente mayor** que organizer/vendor (`Approved`, UI-DEC-005) pero **sin cambiar la identidad visual compartida** (`Approved`, UI-DEC-008, UI-DEC-009).
- Trazabilidad: FR-ADMIN-*, FR-VENDOR-005/006, FR-REVIEW-003/004, UC-ADMIN-*, `AdminAction`.

Nota: **no se crean temas de color por rol** (`Approved`, UI-DEC-009). La diferenciación se hace únicamente vía badge de rol, título de workspace, opciones de navegación, iconografía contextual, contenido, métricas, permisos y labels contextuales.

---

## 10. Fundamentos de color

### 10.1 Paleta base aprobada (`Approved`, UI-DEC-002)

| Rol | Valor |
|---|---|
| Main text | `#262626` |
| Secondary text | `#525252` |
| Primary violet (funcional) | `#946DF8` |
| Decorative lilac | `#C4B7E5` |
| Decorative coral | `#EE8C8D` |
| Main background | `#FFFFFF` |

### 10.2 Rol funcional de cada color

- **Main text `#262626`** — color primario de texto en headings y body oscuros.
- **Secondary text `#525252`** — labels secundarios, meta text, helper text.
- **Primary violet `#946DF8`** — color de marca funcional de la plataforma autenticada. CTA primaria en producto, acento primario, borde/superficie AI accent (UI-DEC-010).
- **Decorative lilac `#C4B7E5`** — solo decorativo (backgrounds suaves, shapes, superficies AI muy claras). **Nunca** color de texto ni de icono principal.
- **Decorative coral `#EE8C8D`** — solo decorativo (acentos landing, shapes). **Nunca** color de texto ni de icono principal.
- **White `#FFFFFF`** — background principal MVP; la interfaz usa **light theme únicamente** (UI-DEC-013).

### 10.3 Reglas y restricciones

- Lilac y coral **no pueden** ser color de body text ni de UI text (`Approved`, UI-DEC-002).
- Lilac, coral y violeta **no pueden** representar success, warning ni error (`Approved`, UI-DEC-002, UI-DEC-014).
- Los colores semánticos deben permanecer **independientes** de los colores de marca (`Approved`, UI-DEC-014).
- El violeta primario puede requerir **variantes accesibles** (por ejemplo un tono más oscuro para hover/text) durante Design Tokens, para garantizar contraste ≥ 4.5:1 con texto sobre blanco (`Derived`, VLR §E).
- La implementación final debe preservar **WCAG 2.1 AA** (`Approved`, UI-DEC-015; NFR-A11Y-005).
- Los colores de background, superficies (surface), bordes (border) y contenido muted específicos se **defieren a Design Tokens**.

### 10.4 Landing vs. plataforma

- **Landing**: violeta, lilac y coral pueden co-existir como acentos decorativos y sostener la personalidad cálida. CTA primaria oscura (UI-DEC-003).
- **Plataforma**: violeta es el acento funcional dominante; lilac se reserva a superficies AI muy claras y otros usos decorativos discretos; coral se usa con moderación. CTA primaria violeta (UI-DEC-003).

### 10.5 No incluido aquí

- Color scales completas (`50–950`) — se defieren a `EventFlow-Design-Tokens.md`.
- Tonos exactos para success/warning/error/info — se defieren a Design Tokens; solo se define la **familia** (verde/amber/rojo/azul, UI-DEC-014).
- Dark mode — excluido del MVP (`Out of Scope`, UI-DEC-013).

---

## 11. Fundamentos de tipografía

### 11.1 Familias (`Approved`, UI-DEC-004)

- **Headings**: `Inter Tight`.
- **Body y UI**: `Inter`.

Ambas soportan los cuatro locales requeridos (`es-LATAM`, `es-ES`, `pt`, `en`) sin sustituciones (`Derived`, NFR-I18N-001).

### 11.2 Jerarquía conceptual del MVP (`Approved`, UI-DEC-004)

- `Display`
- `H1`
- `H2`
- `H3`
- `Body large`
- `Body regular`
- `Body small`
- `Label`
- `Caption`

Este documento **no fija tamaños en px** para cada nivel; esos valores viven en `EventFlow-Design-Tokens.md`.

### 11.3 Reglas

- No crear una escala tipográfica excesiva; el MVP se mantiene deliberadamente acotado.
- Los headings de la **landing** pueden ser más grandes y editoriales.
- Los headings de la **plataforma autenticada** deben ser más restringidos y operacionales.
- Los labels de formulario deben priorizar **claridad sobre minimalismo visual** (visibles y programáticamente asociados; UI-DEC-015; NFR-A11Y-004).
- Contenido numérico (montos, cantidades, ratings) debe usar variantes tabulares o proportional según el contexto; los presupuestos y montos se renderizan con `<Money>` locale-aware (FE Architecture §32.2).
- Contenido de tablas debe mantener line-height cómodo para lectura escaneable sin sacrificar densidad intermedia (UI-DEC-005).
- **Multi-language expansion**: los layouts deben tolerar expansión de texto (típicamente 20–30% en español y portugués vs. inglés) sin roturas (`Derived`, NFR-I18N-001; UI-DEC-015).
- **Responsive type**: los tamaños se ajustan por breakpoint (headings más grandes en desktop, más contenidos en mobile). Los valores finales pertenecen a Design Tokens.

---

## 12. Fundamentos de layout y grid

### 12.1 Estrategia de columnas (`Approved`, UI-DEC-012)

- **Desktop**: 12 columnas.
- **Tablet**: 8 columnas.
- **Mobile**: 4 columnas.

### 12.2 Guía de anchos foundational (`Approved`, UI-DEC-012)

- **Marketing max-width**: aproximadamente `1280 px`.
- **Plataforma autenticada**: layout **fluido**.
- **Ancho máximo de formularios**: aproximadamente `720 px` cuando aplique.

Los breakpoints finales pertenecen a `EventFlow-Design-Tokens.md`.

### 12.3 Reglas

- Los forms no deben estirarse innecesariamente en pantallas anchas.
- Las tables pueden usar contenedores fluidos más anchos.
- Las secciones de landing pueden usar composiciones constrained o full-bleed.
- Los layouts mobile deben priorizar **flujo vertical** y usabilidad touch (UI-DEC-015).
- El shell autenticado (sidebar + content) usa un layout fluido: el sidebar tiene ancho fijo o colapsable; el content se expande al espacio restante.
- Los page-paddings deben ser consistentes por breakpoint (los valores concretos se defieren a Design Tokens).

---

## 13. Fundamentos de spacing y densidad

- **Densidad intermedia** (`Approved`, UI-DEC-005).
- **Marketing whitespace**: generoso, con separación amplia entre secciones y jerarquía visual fuerte.
- **Platform spacing**: comfortable en dashboards y formularios; scanable sin agotar horizontalmente.
- **Form spacing**: separación clara entre grupos de campos; espacio vertical entre label, input y helper text.
- **Table density**: ligeramente más compacta; padding vertical de fila reducido comparado con cards, pero manteniendo touch targets (UI-DEC-015).
- **Admin density**: ligeramente mayor densidad de información que organizer/vendor, sin cambiar la identidad visual.
- **Ritmo de spacing repetido**: usar múltiplos consistentes (base-4 o base-8) para mantener coherencia; la escala exacta pertenece a Design Tokens.
- **Relación jerarquía–spacing**: el espacio comunica agrupación; más espacio separa grupos, menos espacio agrupa elementos relacionados.

Este documento **no** genera una escala completa de spacing tokens.

---

## 14. Forma, bordes y elevación

### 14.1 Estrategia de radius (`Approved`, UI-DEC-006)

Dirección foundation:

- **Buttons**: radius moderado.
- **Inputs**: radius moderado.
- **Cards**: radius soft.
- **Modales y drawers**: radius soft.
- **Badges y pills**: fully rounded.

Rangos **recomendados** de arranque (no valores inmutables):

- Buttons: `~8 px`
- Inputs: `~8 px`
- Cards: `~12–16 px`
- Modales y drawers: `~16 px`
- Pills: `~999 px`

Los valores finales pertenecen a `EventFlow-Design-Tokens.md`.

### 14.2 Bordes y elevación (`Approved`, UI-DEC-007)

**Landing**:

- Sombras suaves.
- Bordes mínimos.
- Cards flotantes con elevación moderada.
- Superficies decorativas pueden overlaparse cuando la legibilidad se preserva.

**Plataforma autenticada**:

- Bordes ligeros visibles.
- Sombras muy sutiles.
- Separación clara entre superficies.
- Inputs, tablas, filtros, paneles y regiones interactivas deben tener **límites visibles**.
- Las sombras **no** son el único mecanismo de separación de superficies (color independence, UI-DEC-015).

### 14.3 A evitar (`Approved`, UI-DEC-007)

- Heavy drop shadows.
- Glassmorphism fuerte.
- Blur excesivo.
- Sistemas de elevación profundos con muchos niveles.
- Sombras decorativas en vistas operativas densas.

---

## 15. Fundamentos de navegación

- **Modelo compartido** (`Approved`, UI-DEC-008): desktop → sidebar izquierdo; mobile → drawer.
- **Un solo shell** aplicado a `organizer`, `vendor` y `admin`. Solo cambian navegación, permisos, contenido y métricas.
- **Estados de item** (`Approved`, UI-DEC-008, UI-DEC-015): default, hover, focus visible, active, disabled y variante collapsed cuando aplique.
- **Badge de rol** y **título de workspace** para diferenciar contexto (`Approved`, UI-DEC-009).
- **Visibilidad por permisos** (`Derived`, FE Architecture §20, §22): el frontend muestra/oculta según rol y ownership; el backend es autoridad final (BR-AUTH-009/010; NFR-USAB-003).
- **Breadcrumbs**: se usan cuando la profundidad de navegación lo justifica (por ejemplo dentro de un evento con múltiples sub-secciones), no en cada vista.
- **Page header** — relacionado al sidebar: complementa la navegación con el título de la vista, breadcrumb opcional y acciones primarias.
- **Mobile behavior**: la navegación mobile **no** replica el sidebar desktop de forma permanente. El drawer se abre desde un trigger visible en el header mobile (touch target ≥ 44 × 44 px per UI-DEC-015).
- **Autoridad backend**: la visibilidad de rutas en el frontend es un UX aid; la autorización real ocurre en el backend (`Approved`, UI-DEC-008; NFR mandatorio).

Este documento **no** define rutas finales; la estructura conceptual está descrita en `docs/15-Frontend-Architecture-Design.md` §11 y §20.

---

## 16. Fundamentos de UX asistida por IA

Los principios de esta sección son mandatorios y no negociables (`Approved`, UI-DEC-010; NFR-AI-001..002; BR-AI-003; BR-AI-004; FE Architecture §29–§30; AI Architecture §15–§23).

### 16.1 Distinción visual del contenido IA

- Todo contenido **generado o sugerido por IA** debe ser visualmente distinguible del contenido confirmado.
- Se usa una combinación de: **icono de IA** reconocible (por ejemplo sparkle), **label textual explícito** (`Sugerencia de IA` en el locale activo), **superficie muy clara** (lilac muy tenue o neutral) y **borde/acento violeta**.
- La distinción **no puede** depender únicamente del color (UI-DEC-015; NFR-A11Y-005).

### 16.2 Estados del ciclo IA

- **Idle** — el panel invita a "Generar sugerencia".
- **Loading** — skeleton específico + estado con `aria-live` para lectores de pantalla (FE Architecture §29.2).
- **Result (pending)** — sugerencia renderizada con badge "Sugerencia IA" y acciones explícitas: **Aceptar**, **Editar**, **Regenerar** (solo cuando el caso de uso lo soporta), **Descartar**.
- **Accepted** — la sugerencia se materializa en datos oficiales (por ejemplo `EventTask`, `BudgetItem`) con `ai_generated: true` y `ai_recommendation_id` (AI Architecture §12.3, §15). El contenido transiciona al **lenguaje visual normal** del sistema.
- **Edited** — el humano edita antes de aceptar; el sistema conserva trazabilidad (AI Architecture §12.4).
- **Rejected / Discarded** — la sugerencia queda persistida con estado `discarded` y no se materializa.
- **Regenerated** — se dispara una nueva llamada al mismo endpoint (solo si el caso de uso lo permite).

### 16.3 Timeout, fallback y errores

- **Timeout**: el frontend muestra mensaje claro `AI_PROVIDER_TIMEOUT` con opción de regenerar (FE Architecture §28.4; AI Architecture §16). Timeout máximo `60 000 ms` (NFR-AI-003).
- **Fallback**: si `aiMeta.fallbackUsed === true`, el frontend muestra un **banner discreto** (por ejemplo "Asistencia IA en modo respaldo") sin bloquear la lectura (FE Architecture §28.4, §30; AI Architecture §16.4, §23).
- **Errores**: los mensajes al usuario son amigables, basados en `error.code`; nunca exponen stack traces (AI Architecture §17).

### 16.4 Reglas mandatorias

- El estado IA **no** se comunica solo por color (UI-DEC-015).
- El contenido IA **no** puede aparecer como oficial antes de la confirmación humana (NFR-AI-001; BR-AI-001/002).
- El contenido IA **aceptado** transiciona al lenguaje visual normal.
- El contenido IA **editado** debe permanecer trazable cuando los FR lo requieran (AI Architecture §12.4).
- El tratamiento visual de IA soporta explícitamente el **human-in-the-loop** (UI-DEC-010; AI Architecture §15).
- Se evitan **gradients fuertes, glows animados, o styling estilo ciencia ficción**. El tratamiento debe sentirse **asistivo, calmado y confiable**.
- El **idioma** del contenido IA se controla server-side desde `event.languageCode` (US-084; AI Architecture §20; BR-AI-011); el frontend no invoca directamente a OpenAI/Anthropic (AI Architecture §23).

---

## 17. Imagery y assets visuales

- **Fotografía** (`Approved`, UI-DEC-011): fotografía real de eventos, con relevancia cultural LATAM (bodas, XV años, baby showers, cumpleaños, corporativos). Priorizar imagery representativa del mercado piloto (Guatemala) y de LATAM en general (PO Decisions #1, #2).
- **Product screenshots o mockups realistas** (`Approved`): permitidos para reforzar credibilidad en la landing.
- **Formas decorativas** (`Approved`): abstractas, en violeta, lilac o coral, con opacidad controlada. Complementan sin competir con el contenido.
- **Gradientes** (`Approved`): permitidos cuando son controlados y no dominan la composición. Evitar gradientes animados o continuos (UI-DEC-010).
- **Ilustración custom**: **no requerida** para el MVP (`Deferred`, UI-DEC-011).
- **Licencia de assets** (`Derived`): toda imagen debe tener licencia comercial válida. Prohibido reutilizar assets del reference Figma de terceros (`Approved`, VLR §G).
- **Restricción del reference de terceros**: prohibido reutilizar logo, wordmark, copy, paleta exacta lilac+coral como firma, blobs decorativos específicos y assets raster/vector del reference (`Approved`, VLR §G).
- **Imagery en plataforma autenticada** (`Approved`, UI-DEC-011): la plataforma autenticada prioriza **UI de producto** sobre imagery decorativa. Se admiten avatares, thumbnails de portafolio de vendors y attachments funcionales; se evitan hero images decorativos dentro del producto.
- **Accesibilidad de imágenes** (`Approved`, UI-DEC-015; NFR-A11Y-*): imágenes con texto embebido **prohibidas**; todas las imágenes informativas requieren `alt` significativo; las decorativas se marcan como decorativas (rol/atributo apropiado).

---

## 18. Iconografía

Dirección MVP simple (`Recommended`, alineada con UI-DEC-010 y UI-DEC-015):

- **Familia consistente**: usar una sola familia de iconos en toda la aplicación.
- **Uso funcional antes que decorativo**: los íconos comunican acción, estado o categoría; no ornamento.
- **Consistencia de stroke o fill**: mantener un solo estilo (por ejemplo outline con grosor uniforme).
- **Labels accesibles**: íconos sin texto visible acompañante requieren `aria-label` u equivalente accesible (UI-DEC-015).
- **Touch targets**: mínimo aproximadamente `44 × 44 px` cuando el ícono es interactivo (UI-DEC-015).
- **Diferenciación por rol**: se logra por contexto y contenido, no por sistemas de íconos separados (UI-DEC-009).
- **Icono de IA**: un sparkle (u otro glifo reconocible) acompaña el label "Sugerencia IA" en todos los `<AIPanel>` (UI-DEC-010).
- **Iconos de estado**: cada familia semántica (success/warning/error/info) usa un ícono representativo además del color (UI-DEC-014, UI-DEC-015).

Este documento **no** selecciona una librería de íconos concreta (por ejemplo Lucide, Material Symbols o Heroicons). La selección se defiere a Design Tokens o a Component Foundations (`Deferred`).

---

## 19. Fundamentos de formularios e inputs

- **Labels visibles y asociados** (`Approved`, UI-DEC-015; NFR-A11Y-004).
- **Helper text**: cuando aporta contexto o instrucciones; debajo del input, con tipografía secundaria.
- **Indicadores required / optional**: consistentes en toda la aplicación; visibles no solo por color.
- **Timing de validación** (`Derived`, FE Architecture §27): inline en blur para campos individuales; on submit para el formulario completo. Los errores permanecen visibles hasta que el usuario los corrige.
- **Presentación de errores** (`Approved`, UI-DEC-015; NFR-USAB-004): mensaje claro, específico, accionable, **asociado programáticamente** al campo, no solo comunicado por color.
- **Focus visible** (`Approved`, UI-DEC-015; NFR-A11Y-003): todos los campos y controles deben mostrar un focus ring accesible.
- **Estados disabled y read-only**: visualmente distintos entre sí y del estado activo; se mantienen accesibles (UI-DEC-003, UI-DEC-015).
- **Campos de moneda** (`Approved`, BR-EVENT-007, BR-BUDGET-006/007): el selector de currency se muestra solo en creación del evento; tras creación aparece **disabled** con tooltip i18n explicativo (FE Architecture §32.1). Los montos se editan sin conversión.
- **Campos de fecha** (`Derived`): usar `Intl.DateTimeFormat` locale-aware para display; el picker debe soportar teclado y ser accesible.
- **Wizard de creación de evento** (`Derived`, MVP §7.2, FE Architecture §27.4): multi-step; cada step con validación clara; navegación entre pasos preservando estado. El wizard incluye el `<EventLanguageSelector />` per US-082.
- **Long forms**: agrupar campos por sección con headings claros; permitir scroll; en mobile apilar.
- **Ancho de formulario**: aproximadamente `720 px` como referencia (UI-DEC-012); no estirar más allá en desktop.
- **Comportamiento mobile**: apilar campos verticalmente; touch targets ≥ `44 × 44 px` (UI-DEC-015).
- **Confirmación humana para valores populados por IA** (`Approved`, UI-DEC-010; NFR-AI-001): cuando un valor viene de IA, el campo o bloque muestra el badge "Sugerencia IA" hasta que el humano lo acepta o edita.

---

## 20. Fundamentos de data display

- **Cards**: unidad principal de agrupación en dashboards y listas de resumen. Radius soft, borde/sombra sutil (UI-DEC-006, UI-DEC-007).
- **Listas**: para colecciones sin necesidad de comparación columnar; densidad intermedia; separadores sutiles.
- **Tablas**: para datos comparables. Encabezados semánticos (`<th>`, scope) y filas accesibles (UI-DEC-015); permiten filtros y paginación.
- **Badges**: pills fully-rounded (UI-DEC-006). Usados para estado (por ejemplo `pending`, `active`, `completed`, `approved`), rol y categoría. El color no es la única señal (UI-DEC-014, UI-DEC-015).
- **Progress indicators**: barras o steppers para wizards y para progreso del evento (dashboard organizer).
- **Valores de presupuesto** (`Approved`, BR-BUDGET-006/007): renderizados con `<Money>` locale-aware (FE Architecture §32.2). Nunca se convierten; siempre visibles con su código de moneda (ver §25).
- **Comparación de cotizaciones** (`Approved`, NFR-USAB-005; FR-QUOTE-006): vista lado a lado; si las `Quote` están en monedas distintas, la UI **lo indica explícitamente** sin convertir (FE Architecture §32.1).
- **Status labels**: consistentes entre eventos, cotizaciones, reseñas y tareas (`Approved`, NFR-USAB-006). Traducibles (BR-I18N-001).
- **Filtros**: superficie clara, estado activo visible, resetables.
- **Paginación**: presente cuando la colección puede crecer; controles accesibles con teclado (UI-DEC-015).
- **Empty states**: título + descripción + CTA relevante (FE Architecture §28.1).
- **Loading states**: skeletons por vista (FE Architecture §28.1).
- **Alternativas responsive a tablas anchas** (`Approved`, UI-DEC-012, UI-DEC-015): en mobile las tablas pueden convertirse en cards apiladas, listas resumidas o vistas con scroll horizontal controlado.

---

## 21. Estados de sistema y feedback

Cada vista relevante implementa (per FE Architecture §28.1) tratamiento mandatorio para:

| Estado | Tratamiento |
|---|---|
| Loading | Skeleton específico de la vista + `aria-live` cuando aplica. |
| Skeleton | Placeholder estructural que anticipa la forma del contenido; no bloquea comprensión. |
| Empty | Título + descripción breve + CTA relevante. |
| Success | Toast breve para mutaciones + confirmación inline cuando aporta claridad. |
| Warning | Familia amber; ícono + texto (UI-DEC-014). |
| Error | Familia rojo; ícono + texto + acción para recuperación; código si aporta (FE Architecture §28.4). |
| Info | Familia azul; ícono + texto (UI-DEC-014). |
| Disabled | Distinto visualmente pero accesible; explicable con tooltip cuando aporta. |
| Offline o dependency unavailable | Banner o inline con instrucciones cuando el flujo lo requiere. |
| AI timeout | Mensaje claro con opción de regenerar (FE Architecture §28.4, §16.3 de este documento). |
| AI fallback | Banner discreto "Asistencia IA en modo respaldo" cuando `fallback_used = true` (§16.3). |
| Permission denied | Mensaje "No tienes permiso para esta acción" (FE Architecture §28.4; UI-DEC-008). |
| Not found | Página 404 o inline "No encontramos este recurso" (FE Architecture §28.4). |
| Seed / demo indicators | Cuando aplique, los datos seed se marcan con un indicador discreto para transparencia en la demo. |

Regla mandatoria: los colores de marca (violeta, lilac, coral) **no** reemplazan colores semánticos (`Approved`, UI-DEC-002, UI-DEC-014).

---

## 22. Fundamentos de responsive design

- **Mobile-first** en implementación (`Derived`, buena práctica; alineado con NFR-USAB-001).
- **Desktop, tablet, mobile**: layout, densidad y jerarquía adaptados por breakpoint (UI-DEC-012).
- **Sidebar → drawer**: la navegación desktop se transforma a drawer en mobile (UI-DEC-008).
- **Touch targets**: mínimo aproximadamente `44 × 44 px` en cualquier control interactivo (UI-DEC-015).
- **Form stacking**: los campos se apilan verticalmente en mobile; los grupos de acciones se apilan cuando hace falta.
- **Table adaptation**: cards apiladas, listas resumidas o scroll horizontal controlado (§20).
- **CTA stacking**: los grupos de botones se apilan en mobile respetando prioridad visual (primary sobre secondary).
- **Typography reduction**: tamaños de heading disminuyen en breakpoints menores; el body permanece legible.
- **Image cropping**: imágenes responsive con `object-fit` apropiado; los focal points deben respetarse.
- **Horizontal-scroll restrictions**: prohibido scroll horizontal accidental de página; scroll horizontal controlado permitido dentro de contenedores específicos (tablas, carousels).
- **Long translated content** (`Approved`, UI-DEC-015; NFR-I18N-001): botones, badges y elementos de navegación deben tolerar strings más largos sin roturas.
- **Reafirmación de alcance** (`Approved`, NFR-USAB-001; PO Decisions #6): el MVP es **web responsive**, no app nativa iOS/Android.

---

## 23. Fundamentos de accesibilidad

Baseline mandatorio: **WCAG 2.1 AA** (`Approved`, UI-DEC-015; NFR-A11Y-001..005). No se requiere WCAG AAA para el MVP.

Requisitos mandatorios:

- **Contraste**: ratio ≥ 4.5:1 para texto regular; ≥ 3:1 para texto grande y componentes no textuales críticos (NFR-A11Y-005).
- **Focus visible**: en todos los elementos interactivos (NFR-A11Y-003).
- **Operabilidad por teclado** en los flujos principales (login, creación de evento, comparación de cotizaciones) (NFR-A11Y-002).
- **Labels visibles y asociados programáticamente** en formularios (NFR-A11Y-004).
- **Error association**: los errores se asocian al campo relevante con `aria-describedby` o equivalente.
- **Jerarquía lógica de headings**: sin saltos de nivel; solo un `H1` por página cuando aplique.
- **Touch targets** ≥ aproximadamente `44 × 44 px` (UI-DEC-015).
- **ARIA**: usar roles y atributos apropiados; preferir HTML semántico (`<button>`, `<nav>`, `<main>`, `<dialog>`) sobre ARIA cuando exista un equivalente nativo (NFR-A11Y-001).
- **Foco en modales y drawers**: focus trap correcto; retorno de foco al elemento disparador al cerrar.
- **Reduced motion**: respetar `prefers-reduced-motion` (UI-DEC-015; §26 de este documento).
- **Independencia del color**: cualquier estado se comunica con al menos otra señal (ícono, texto, patrón) (UI-DEC-015; UI-DEC-014).
- **Semántica de tablas**: `<th scope="col|row">`, captions y alternativas responsive accesibles.
- **Alternativas de imágenes**: `alt` significativo para informativas; marcadas como decorativas cuando corresponda; nunca texto crítico embebido en imagen.
- **Anuncios dinámicos**: usar `aria-live` apropiado para carga de sugerencias IA (FE Architecture §29.2) y para actualizaciones importantes (por ejemplo cambio de estado tras `apply`).
- **Accesibilidad de estados IA**: los estados idle / loading / result / accepted / edited / rejected deben ser comprensibles por lectores de pantalla; el label "Sugerencia IA" debe ser leído junto con el contenido.
- **Language support**: la aplicación debe declarar `lang` correcto por locale activo; el switcher (`<LanguageSelector />`, US-081) debe ser accesible con teclado.

---

## 24. Fundamentos de internacionalización

Locales soportados (`Approved`, NFR-I18N-001; BR-I18N-001; PO Decisions #15):

- `es-LATAM` — base (default).
- `es-ES`
- `pt`
- `en` (obligatorio)

Requisitos:

- **Layouts flexibles**: tolerar expansión de texto (~20–30%) sin roturas (`Derived`, UI-DEC-015).
- **Sin texto embebido en imágenes** (UI-DEC-015).
- **Fechas locale-aware** con `Intl.DateTimeFormat` (FE Architecture §31.3).
- **Números locale-aware** con `Intl.NumberFormat`; para moneda ver §25.
- **Evitar controles de texto de ancho fijo** que no toleren expansión (`Derived`, UI-DEC-015).
- **Botones y navegación translation-safe**: deben tolerar labels más largos.
- **Language switcher**: `<LanguageSelector />` global montado en Topbar de layouts `(public)` y `(auth)` (US-081; FE Architecture §31.2). Optimista, con revert en caso de error y sincronización a `PATCH /api/v1/users/me/preferred-language` en background para usuarios autenticados.
- **Selector de idioma del evento**: `<EventLanguageSelector />` en el wizard (US-082; FE Architecture §31.2), disabled cuando `event.status ∈ {completed, cancelled}`.
- **Fallback de contenido** cuando la arquitectura lo define (AI Architecture §20): si el prompt no tiene versión activa en el locale requerido, degrada a `es-LATAM` con logging.
- **IA respeta el idioma**: el idioma del evento (`event.languageCode`) se resuelve server-side y se pasa a la capa LLM (`Approved`, BR-AI-011; NFR-I18N-003; US-084).

Este documento **no** crea traducciones.

---

## 25. Fundamentos de visualización de moneda

Reglas mandatorias (`Approved`, BR-EVENT-007, BR-BUDGET-006/007; NFR-I18N-004/005; FE Architecture §32):

- **La moneda pertenece al evento** y se configura **exclusivamente en la creación**.
- **La moneda es inmutable** tras la creación del evento (BR-EVENT-007).
- **Sin conversión automática** entre monedas (BR-BUDGET-007).
- **La moneda debe permanecer visible** en contextos de presupuesto y cotizaciones.
- **No confiar solo en el símbolo** cuando exista ambigüedad (por ejemplo `$` puede ser USD, MXN, COP): renderizar código ISO junto con el monto o exponerlo vía tooltip/`aria-label` (FE Architecture §32.2).
- **Formato locale-aware**: usar `Intl.NumberFormat` con `style: 'currency'` (FE Architecture §32.2; helper `formatCurrency`).
- **UX de moneda inmutable**: en edición del evento, el selector de currency aparece disabled con tooltip i18n explicativo (FE Architecture §32.1).
- **Valores bloqueados**: cuando un valor no puede modificarse (por ejemplo moneda tras creación), la UI debe mostrar texto explicativo o estado; no dejar el estado disabled sin contexto.
- **La UI no debe implicar** funcionalidad de tipo de cambio ni conversión (BR-BUDGET-007).
- **Componente canónico**: `<Money>` (FE Architecture §32.2) con `title={currencyCode}` y `aria-label` con nombre completo de la moneda (US-083 AC-01). Los nombres de moneda viven en `messages/{locale}/common.json` bajo `common.currency.<CODE>`.
- **Cotizaciones multi-moneda**: cuando un `organizer` compara `Quotes` en monedas distintas, la vista comparativa **lo indica explícitamente** sin convertir (FE Architecture §32.1).

Monedas soportadas como mínimo: `GTQ`, `EUR`, `MXN`, `COP`, `USD` (NFR-I18N-004; MVP §7.15).

---

## 26. Motion e interaction feedback

Principios lightweight para el MVP (`Recommended`, alineados con UI-DEC-015 y UI-DEC-010):

- **La motion apoya orientación y feedback**, no ornamento.
- **Evitar overload decorativo** de animación.
- **Transiciones cortas**: preferir duraciones breves (rangos típicos entre 100–300 ms según el componente; los valores finales se defieren a Design Tokens).
- **Respetar `prefers-reduced-motion`**: cuando el usuario lo indica, reducir o eliminar animaciones no esenciales (UI-DEC-015).
- **No requerir transiciones de página complejas** (Next.js App Router no requiere page transitions custom en el MVP).
- **Evitar glows continuos, gradientes animados o efectos "sci-fi" en IA** (UI-DEC-010).
- **Loading animations no deben bloquear** la comprensión ni ocultar la estructura del contenido (por eso preferir skeletons a spinners genéricos, FE Architecture §28.1).
- **Modales, drawers, hover y acordeones** con motion **restringido**: solo lo suficiente para señalar la transición de estado.

Este documento **no** define un sistema completo de motion tokens (`Deferred`).

---

## 27. Adopt / Adapt / Reject

Análisis de patrones observados en el reference Figma de terceros (`docs/ux-ui/EventFlow-Visual-Language-Reference.md`) y su tratamiento oficial para EventFlow.

| Patrón | Decisión | Razón | Tratamiento en EventFlow |
|---|---|---|---|
| Inter Tight headings | Adopt | Familia libre, multi-idioma, legible; coincide con UI-DEC-004. | Se adopta como familia oficial de headings. |
| Inter body text | Adopt | Familia libre, multi-idioma, legible; coincide con UI-DEC-004. | Se adopta como familia oficial de body/UI. |
| Jerarquía editorial de landing (H1 grande + body 16) | Adapt | Alineada con personalidad cálida/aspiracional (UI-DEC-001) pero excesiva (`H1 90 px`) para densidad. | Se adopta la jerarquía **conceptual**; los tamaños finales se defieren a Design Tokens con headings más restringidos en la plataforma autenticada (UI-DEC-004). |
| Whitespace generoso en marketing | Adopt | Coincide con UI-DEC-005 (landing = generoso). | Se adopta para landing; se ajusta a densidad intermedia en la plataforma autenticada. |
| Acentos decorativos lilac y coral | Adapt | UI-DEC-002 aprueba lilac `#C4B7E5` y coral `#EE8C8D` como decorativos, pero prohíbe copiar el duo exacto del reference como firma (VLR §G). | Se usan como acentos decorativos aprobados en EventFlow, no como firma imitativa del reference. Nunca como texto ni como color semántico. |
| Acento funcional violeta | Adopt | UI-DEC-002 aprueba `#946DF8` como color de marca funcional para la plataforma autenticada. | Se adopta como CTA primaria en producto, acento primario y borde AI (UI-DEC-003, UI-DEC-010). |
| Floating marketing cards | Adopt | Coincide con UI-DEC-007 (sombras suaves en landing). | Se adopta en landing con radius soft y sombra restringida. |
| Soft shadows | Adopt | Coincide con UI-DEC-007. | Se adoptan en landing; en plataforma autenticada se combinan con bordes ligeros (UI-DEC-007). |
| Large hero typography (`H1 90 px`) | Adapt | Editorial pero desmedida para producto y para densidad LATAM/multi-idioma. | En landing se puede usar tamaño grande (Design Tokens definirá el máximo); en plataforma autenticada se restringe (UI-DEC-004). |
| Gradient navigation text (radial `violeta → coral`) | Reject | Riesgo de contraste WCAG AA en los stops coral (VLR §A.11, §E). Contradice UI-DEC-015 y UI-DEC-014 (color no puede ser la única señal). | Se rechaza. El estado activo del nav se resuelve con color sólido accesible + underline o marcador (UI-DEC-008, UI-DEC-015). |
| Decorative light colors (lilac/coral) used as text | Reject | UI-DEC-002 prohíbe usarlos como color de texto. | Se rechaza. Lilac y coral son exclusivamente decorativos. |
| Third-party branding (logo/wordmark `Jurny`) | Reject | Marca propietaria del reference. | Prohibido reutilizar. |
| Third-party copy (`Keep Smile`, testimonials, nombres de planes) | Reject | Copy propietario del reference; UI-DEC-011 y §7 de este documento prohíben inventar testimonials/metrics/copy. | Prohibido reutilizar; el copy real de EventFlow se define en artefactos posteriores con aprobación del PO. |
| Third-party assets (imágenes, ilustraciones, iconos del reference) | Reject | Assets propietarios; expiran; sin licencia (VLR §G). | Prohibido reutilizar. Se usan assets con licencia propia o comercial válida. |
| Third-party authenticated-platform assumptions | Reject | El reference **no** contiene patrones de plataforma autenticada (VLR §A.9, §C). | La plataforma autenticada se diseña original apoyándose en FE Architecture y este documento. |

Regla mandatoria: **no copiar patrones visuales literalmente** del reference. Solo se adoptan **conceptos** (jerarquía, familias tipográficas, uso de shapes decorativos, radius soft, sombras suaves) cuando coinciden con decisiones aprobadas.

---

## 28. Decisiones MVP aprobadas

Registro de decisiones oficiales aprobadas por el Product Owner. Todas con estado `Approved`, scope `MVP`.

| ID | Decisión | Estado | Scope | Rationale | Artefacto downstream impactado |
|---|---|---|---|---|---|
| UI-DEC-001 | Dirección visual balanceada: landing cálida/aspiracional/editorial/premium/humana/celebratoria/espaciosa; plataforma autenticada limpia/funcional/estructurada/calmada/clara/productivity-oriented/escaneable. EventFlow **no** debe sentirse como SaaS corporativo genérico, app consumer playful, clon del reference ni dashboard enterprise sobrecargado. | Approved | MVP | Coherencia con posicionamiento premium/aspiracional del PO (PO Decisions §5) y diferenciación entre marketing y producto. | Design Tokens, Component Foundations, Figma, implementación frontend. |
| UI-DEC-002 | Paleta base: `Main text #262626`, `Secondary text #525252`, `Primary violet #946DF8`, `Decorative lilac #C4B7E5`, `Decorative coral #EE8C8D`, `Main background #FFFFFF`. Violet es color funcional; lilac y coral son decorativos, nunca como texto ni como estado semántico; light theme only; preservar WCAG 2.1 AA; semantic colors independientes de brand colors. | Approved | MVP | Fija la paleta oficial y sus restricciones; evita ambigüedad brand vs. semantic; garantiza accesibilidad. | Design Tokens (color scales), Figma, implementación. |
| UI-DEC-003 | Estrategia mixta de CTA. Landing: primary dark; secondary white/outlined/neutral/ghost. Producto: primary violet; secondary outlined/neutral/white/ghost; destructive semantic red; destructive nunca violet/lilac/coral; disabled visualmente distinto y accesible. | Approved | MVP | Refuerza personalidad diferenciada landing vs. plataforma y separación brand/semantic. | Component Foundations (buttons), Figma, implementación. |
| UI-DEC-004 | Tipografía: `Inter Tight` para headings, `Inter` para body/UI. Jerarquía conceptual limitada: Display, H1, H2, H3, Body large, Body regular, Body small, Label, Caption. Landing puede usar headings más grandes/editoriales; plataforma más restringidos y operacionales; labels priorizan claridad; tipografía soporta los 4 locales; el documento define propósito y jerarquía, no tokens pixel-perfect. | Approved | MVP | Fija familias y jerarquía sin sobre-escalar; asegura multi-idioma. | Design Tokens (type scale), Figma, implementación. |
| UI-DEC-005 | Densidad intermedia. Landing: whitespace generoso, gran separación entre secciones, jerarquía fuerte, información simultánea limitada. Plataforma: dashboard spacing comfortable, forms claros, uso eficiente del ancho, tablas/filtros/admin ligeramente más compactas. Evitar whitespace excesivo en operacionales y densidad enterprise. | Approved | MVP | Separa personalidad landing vs. producto sin caer en extremos. | Design Tokens (spacing scale), Component Foundations, Figma, implementación. |
| UI-DEC-006 | Estrategia de radius: buttons moderate, inputs moderate, cards soft, modales/drawers soft, badges/pills fully rounded. Rangos de arranque recomendados (`~8 / ~8 / ~12–16 / ~16 / ~999 px`), no valores inmutables. | Approved | MVP | Consistencia visual sin imponer tokens finales. | Design Tokens (radius scale), Component Foundations, Figma. |
| UI-DEC-007 | Bordes y elevación mixtos. Landing: sombras suaves, bordes mínimos, cards flotantes con elevación moderada, superficies decorativas pueden overlaparse. Plataforma: bordes ligeros visibles, sombras muy sutiles, separación clara, límites visibles en inputs/tablas/filtros/paneles, sombras no son el único mecanismo de separación. Evitar heavy shadows, glassmorphism fuerte, blur excesivo, elevación profunda, sombras decorativas en vistas operativas densas. | Approved | MVP | Refuerza escaneabilidad del producto y personalidad de la landing; garantiza accesibilidad (color-independence). | Design Tokens (shadows, borders), Component Foundations, Figma. |
| UI-DEC-008 | Un shell de plataforma compartido: sidebar en desktop, drawer en mobile. Aplica a `organizer`, `vendor`, `admin`. Solo cambian navegación, permisos, contenido y métricas por rol; no crear tres sistemas visuales ni temas de color por rol. Sidebar con estados active/hover/focus/disabled/collapsed cuando aplique. Mobile no reproduce el sidebar permanentemente. Visibilidad frontend es UX aid; backend es autoridad. | Approved | MVP | Un solo sistema visual coherente; navegación clara y responsive; alineado con FE Architecture §20–§22. | Component Foundations (Sidebar, Drawer, Nav), Figma, implementación. |
| UI-DEC-009 | Diferenciación de rol sin temas de color por rol. Se diferencia por: role badge, workspace title, opciones de navegación, iconografía, contenido, métricas, permisos, labels contextuales. La identidad visual permanece consistente entre roles. | Approved | MVP | Evita fragmentar la marca por rol; mantiene coherencia visual. | Component Foundations, Figma, implementación. |
| UI-DEC-010 | Tratamiento UX de IA: sugerencias visualmente distinguibles con ícono reconocible (por ejemplo sparkle), label explícita `Sugerencia de IA`, superficie muy clara (lilac tenue o neutral), borde/acento violeta, acciones claras (`Aceptar`, `Editar`, `Rechazar`, `Regenerar` cuando aplique), estados loading/fallback/error visibles, distinción pending vs. accepted. Reglas: color no es la única señal; contenido IA no aparece oficial antes de confirmación; accepted transiciona al lenguaje visual normal; edited permanece trazable cuando aplica; soporte human-in-the-loop; evitar gradientes fuertes, glows animados, styling sci-fi; treatment assistivo, calmado, confiable. | Approved | MVP | Mandato de seguridad + trazabilidad IA; alineado con BR-AI-003, NFR-AI-001/002 y AI Architecture §15, §23. | Component Foundations (`<AIPanel>` y variantes), Figma, implementación. |
| UI-DEC-011 | Fotografía e ilustración mixta para landing: fotografía real de eventos, formas decorativas abstractas, acentos lilac/coral/violet, product screenshots o mockups realistas, gradientes controlados. MVP: no requiere sistema de ilustración custom, no requiere fotografía editorial cara, no depende de imagery generada por IA, no reutiliza assets del reference sin autorización, evita stock corporativo genérico, prefiere imagery LATAM. La plataforma autenticada prioriza UI de producto sobre imagery decorativa. | Approved | MVP | Alinea imagery con posicionamiento premium/LATAM sin costo de sistema ilustrativo custom. | Figma, implementación, asset pipeline. |
| UI-DEC-012 | Grid: desktop 12 columnas, tablet 8, mobile 4. Guía foundation: marketing max-width `~1280 px`; plataforma autenticada fluida; forms `~720 px` cuando aplique. Los valores finales de breakpoints pertenecen a Design Tokens o implementación. Forms no se estiran innecesariamente; tables pueden usar contenedores más anchos; landing puede usar constrained o full-bleed; mobile prioriza flujo vertical y usabilidad touch. | Approved | MVP | Foundation clara para responsive sin fijar tokens finales. | Design Tokens (breakpoints), Component Foundations, Figma, implementación. |
| UI-DEC-013 | Dark mode fuera del MVP. Definir e implementar solo light theme. No duplicar tokens ni variantes de componentes para dark. Reconsiderable post-MVP. | Approved | MVP | Reduce alcance; foco en calidad del light theme. | Design Tokens, Component Foundations, Figma. |
| UI-DEC-014 | Colores semánticos independientes: Success = verde; Warning = amber; Error/destructive = rojo; Info = azul. Brand violet no es success; coral no es error; lilac no es info; los estados semánticos deben incluir icono, texto o label; el color no es el único mecanismo. Las shades finales pertenecen a Design Tokens. | Approved | MVP | Evita ambigüedad brand vs. semantic; garantiza accesibilidad. | Design Tokens (semantic scales), Component Foundations, Figma. |
| UI-DEC-015 | Baseline de accesibilidad WCAG 2.1 AA. Principios mandatorios: focus visible por teclado, operabilidad por teclado, touch target ≥ `~44 × 44 px`, contraste suficiente, labels visibles y asociados programáticamente, errores asociados al campo, estado no depende solo de color, `prefers-reduced-motion`, jerarquía lógica de headings, estados loading/empty/error/success claros, soporte de expansión multi-idioma, sin texto embebido en imágenes decorativas, íconos sin label visible tienen accessible name, foco correcto en modal/drawer, tablas comprensibles vía semántica o alternativas accesibles. No se requiere WCAG AAA en MVP. | Approved | MVP | Accesibilidad como baseline no negociable; alineado con NFR-A11Y-001..005. | Design Tokens (focus rings, contrast), Component Foundations, Figma, implementación, QA. |

---

## 29. Decisiones deferidas

### Design Tokens (`Deferred`)

- Color scales completas (por ejemplo `50–950`).
- Tamaños exactos de tipo por nivel.
- Escala exacta de spacing.
- Valores exactos de sombras.
- Breakpoints exactos.
- Valores de focus-ring.
- Shades semánticos.

### Component Specifications (`Deferred`)

- Variantes completas de button.
- Variantes completas de input.
- Variantes de tabla.
- Anatomía de modal.
- Anatomía de toast.
- Anatomía completa del componente de recomendación IA (`<AIPanel>` y variantes).

### Figma (`Deferred`)

- Layouts pixel-perfect.
- Mockups responsive completos.
- Crops finales de imagen.
- Composiciones exactas de cards.
- Art direction final de la landing.

### Implementation (`Deferred`)

- Clases Tailwind.
- CSS variables.
- APIs de componentes React.
- Storybook stories.
- Librerías de animación.
- Librería de íconos exacta cuando aún no está aprobada por las fuentes.

### Post-MVP (`Out of Scope`)

- Dark mode.
- Temas avanzados / white-label.
- Sistema de ilustración custom.
- Data visualizations avanzadas.
- Temas por rol.
- Sistema de motion complejo.

---

## 30. Guardrails de implementación

La implementación futura debe cumplir:

- Usar **Tailwind CSS y design tokens** según `docs/15-Frontend-Architecture-Design.md`.
- Evitar valores visuales hardcoded one-off cuando exista un token.
- Preservar **accesibilidad WCAG 2.1 AA** (UI-DEC-015; NFR-A11Y-*).
- Preservar el tratamiento **human-in-the-loop** de la IA (UI-DEC-010; NFR-AI-001; AI Architecture §15).
- Mantener al **backend como autoridad de autorización** (UI-DEC-008; BR-AUTH-009/010; FE Architecture §22).
- Mantener **identidad visual compartida** entre roles (UI-DEC-008, UI-DEC-009).
- **No introducir dark mode** (UI-DEC-013).
- **No copiar** el reference de terceros (VLR §G).
- **No introducir** componentes ni flujos post-MVP.
- Mantener **distinta la densidad visual** de marketing y de plataforma (UI-DEC-005).
- Permanecer **compatible con los cuatro locales** (`es-LATAM`, `es-ES`, `pt`, `en`) (NFR-I18N-001).
- Preservar el comportamiento correcto de moneda (BR-EVENT-007, BR-BUDGET-006/007).

Este documento **no** genera código.

---

## 31. Relación con artefactos futuros

```text
EventFlow-Visual-Language-Reference.md
        ↓
EventFlow-UI-Foundations.md
        ↓
EventFlow-Design-Tokens.md
        ↓
EventFlow-Component-Foundations.md
        ↓
Figma screen designs
        ↓
Frontend implementation
```

Autoridad de cada artefacto:

- **`EventFlow-Visual-Language-Reference.md`** — **informativo**. Describe hallazgos visuales de un reference Figma de terceros. **No es autoridad** para EventFlow; solo aporta vocabulario y candidatos.
- **`EventFlow-UI-Foundations.md`** (este documento) — **normativo, aprobado**. Fuente de verdad para foundations visuales y de interacción del MVP.
- **`EventFlow-Design-Tokens.md`** — **normativo**. Traduce foundations a valores concretos (color scales, spacing, breakpoints, radius, sombras, focus rings, semantic scales).
- **`EventFlow-Component-Foundations.md`** — **normativo**. Anatomía y variantes de componentes.
- **Figma screen designs** — **informativo/preescriptivo por pantalla**. Autoridad de layout y composición pixel-perfect por vista, dentro de los guardrails de los documentos anteriores.
- **Frontend implementation** — **operativo**. Debe cumplir todos los documentos anteriores; ninguna decisión visual puede introducirse en código sin trazabilidad hacia un artefacto normativo.

---

## 32. Riesgos y mitigaciones

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | Copiar demasiado del reference Figma de terceros. | §27 (Adopt / Adapt / Reject) es mandatorio. Prohibido reutilizar assets, logo, wordmark, copy y paleta exacta del reference (VLR §G). Revisión visual antes de aprobar Figma screens. |
| 2 | Bajo contraste en colores decorativos (lilac/coral). | UI-DEC-002 prohíbe usarlos como texto. Design Tokens debe validar contraste; QA revisa con contrast checker (NFR-A11Y-005). |
| 3 | Interfaces inconsistentes entre roles. | UI-DEC-008, UI-DEC-009 fijan un solo shell y prohíben temas por rol. Component Foundations y Figma revisan consistencia. |
| 4 | Las sugerencias IA aparecen como oficiales. | UI-DEC-010 mandatoria; NFR-AI-001; BR-AI-003; AI Architecture §15, §23. Distinción visual + acciones explícitas + persistencia con estado. |
| 5 | Pantallas operativas se vuelven demasiado espaciosas. | UI-DEC-005: densidad intermedia; landing generosa vs. producto comfortable. Revisión de Figma screens contra estos rangos. |
| 6 | El lenguaje visual de landing se filtra a tablas y formularios. | §7 vs. §8 diferenciados. UI-DEC-005 y UI-DEC-007 explícitos. Component Foundations distingue landing components de app components. |
| 7 | Overflow por traducciones (portugués/español pueden expandir vs. inglés). | UI-DEC-015 mandatoria: layouts flexibles, botones translation-safe. QA verifica los cuatro locales (NFR-I18N-001). |
| 8 | Ambigüedad de moneda (por ejemplo `$` = USD o COP). | §25 mandatorio: `<Money>` con tooltip ISO + `aria-label`, código explícito, sin conversión (US-083 AC-01; FE Architecture §32.2). |
| 9 | Scope creep hacia un design system enterprise. | Este documento cierra scope a foundations MVP. §29 defiere explícitamente tokens finales, component specs y post-MVP. |
| 10 | Accesibilidad tratada como polish final. | UI-DEC-015 y NFR-A11Y-001..005 son mandatorios desde el inicio. QA la audita en cada iteración; no es upgrade opcional. |

---

## 33. Preguntas abiertas

Después de aplicar todas las decisiones aprobadas y las fuentes disponibles, **no quedan preguntas bloqueantes** para pasar al siguiente artefacto (`EventFlow-Design-Tokens.md`).

Preguntas no bloqueantes que pueden abordarse en Design Tokens o en Figma:

| ID | Pregunta | Impacto | Owner | Requerida antes de | MVP-blocking |
|---|---|---|---|---|---|
| UI-Q-001 | Definir el tono exacto de violeta accesible para texto/hover a partir de `#946DF8` (posible variante más oscura para pasar 4.5:1). | Contraste de texto sobre blanco y estados hover. | UX Lead + Accessibility Specialist | Design Tokens finales | No |
| UI-Q-002 | Seleccionar la librería de íconos oficial (por ejemplo Lucide, Material Symbols, Heroicons) alineada con la personalidad EventFlow. | Consistencia y peso de bundle. | UX Lead + Frontend Lead | Component Foundations | No |
| UI-Q-003 | Confirmar el `hero max-size` de headings para la landing (rango sugerido entre `~64 px` y `~90 px`), considerando expansión multi-idioma. | Impacto en art direction landing. | UX Lead + PO | Figma landing final | No |
| UI-Q-004 | Confirmar los breakpoints numéricos exactos (por ejemplo `sm/md/lg/xl`) alineados a los rangos aprobados (12/8/4 columnas + max-width `~1280 px`). | Implementación responsive coherente. | Frontend Lead | Design Tokens | No |
| UI-Q-005 | Definir la ilustración/glifo exacto para el badge "Sugerencia IA" (sparkle u otro) y su tratamiento en distintos tamaños. | Reconocimiento visual del tratamiento IA. | UX Lead | Component Foundations (`<AIPanel>`) | No |

**Ninguna pregunta bloquea la aprobación de este documento ni la generación del siguiente artefacto.**

---

## 34. Checklist de aprobación

- [x] Dirección visual documentada.
- [x] Landing y plataforma autenticada diferenciadas.
- [x] Paleta aprobada incluida.
- [x] Tipografía documentada.
- [x] Grid y foundations responsive documentados.
- [x] Densidad documentada.
- [x] Estrategia de radius, bordes y sombras documentada.
- [x] Modelo de navegación compartido documentado.
- [x] Temas por rol excluidos.
- [x] Tratamiento IA soporta human-in-the-loop.
- [x] Dirección de fotografía e imagery documentada.
- [x] Dark mode excluido del MVP.
- [x] Colores semánticos independientes de colores de marca.
- [x] WCAG 2.1 AA como mandatorio.
- [x] Cuatro locales soportados.
- [x] Comportamiento de currency display documentado.
- [x] Decisiones Adopt / Adapt / Reject presentes.
- [x] Decisiones UI aprobadas registradas (UI-DEC-001..UI-DEC-015).
- [x] Decisiones deferidas claramente separadas.
- [x] No se generó código frontend.
- [x] No se generaron Design Tokens finales.
- [x] No se autorizó reutilización de branding o assets de terceros.
- [x] No se introdujo funcionalidad fuera del alcance MVP.

---

## 35. Recomendación final

Las UI Foundations están **listas para aprobación del Product Owner**.

- Cubren de forma proporcional al MVP la dirección visual, la separación landing / plataforma autenticada, la paleta aprobada, la tipografía, el layout, la densidad, el sistema de forma/borde/elevación, la navegación, el tratamiento IA human-in-the-loop, imagery, iconografía, formularios, data display, estados de sistema, responsive, accesibilidad WCAG 2.1 AA, i18n a cuatro locales y currency display inmutable.
- Todas las decisiones aprobadas del PO (UI-DEC-001..UI-DEC-015) quedan registradas con status `Approved`.
- Las decisiones deferidas están claramente separadas del baseline aprobado.
- La comparación Adopt / Adapt / Reject frente al reference Figma de terceros deja explícitas las líneas rojas de reutilización.

Este documento es **suficiente para generar `EventFlow-Design-Tokens.md`** como siguiente artefacto.

**Recomendaciones no bloqueantes:**

- Iniciar en paralelo la exploración de la variante accesible del violeta primario (UI-Q-001) y la selección de la librería de íconos (UI-Q-002) para acelerar Component Foundations.
- Validar early la expansión multi-idioma en labels de navegación y CTAs primarias usando strings representativos en `es-LATAM`, `es-ES`, `pt` y `en`.
- Confirmar con el PO el nivel de tamaño máximo de heading en el hero (UI-Q-003) antes del arte final de la landing.

**Blocking issues:** ninguno detectado con la evidencia disponible.
