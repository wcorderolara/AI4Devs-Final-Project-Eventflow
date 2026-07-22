
# EventFlow Design Tokens — Artifact Generation Prompt

## Role

Act as a Senior Design Systems Architect, Senior Product Designer, Frontend Architect, Accessibility Specialist, and Design Token Engineer.

You are working on EventFlow, an AI-assisted event-planning platform for organizers, vendors, and administrators.

Your task is to generate the official Design Tokens specification for the EventFlow MVP.

You must translate the approved UI Foundations into a coherent, accessible, implementation-ready token system without generating production code.

The resulting artifact must serve as the contract between:

- Product Design.
- UX/UI.
- Figma.
- Frontend engineering.
- QA.
- Accessibility review.
- AI coding agents.
- Future component specifications.

The token system must remain proportional to an MVP.

Do not create an enterprise-scale design system, excessive token aliases, role-specific themes, dark mode, or speculative future tokens.

---

## Action

Generate the following artifact:

```text
docs/ux-ui/EventFlow-Design-Tokens.md
````

The document must convert the approved EventFlow UI Foundations into concrete and reusable design-token definitions.

It must define:

1. Token architecture.
2. Token naming conventions.
3. Primitive color tokens.
4. Semantic color tokens.
5. Typography tokens.
6. Spacing tokens.
7. Sizing and interaction tokens.
8. Border-radius tokens.
9. Border tokens.
10. Shadow and elevation tokens.
11. Layout and container tokens.
12. Breakpoint tokens.
13. Motion tokens.
14. Focus tokens.
15. Z-index tokens.
16. Icon-size tokens.
17. AI-specific semantic tokens.
18. Landing-page-specific aliases when justified.
19. Authenticated-platform aliases when justified.
20. Accessibility constraints.
21. Figma mapping guidance.
22. Tailwind and frontend implementation guidance without generating code.
23. Validation rules.
24. Deferred decisions.
25. Approval checklist.

The document must define exact token values where the approved foundations provide enough evidence.

When an exact value is not directly approved, choose the smallest reasonable MVP-ready value set and clearly mark the decision as:

* `Derived`.
* `Recommended`.
* `Provisional`.

Do not leave avoidable values as `TBD`.

Do not invent unnecessary scales.

---

## Output Language

Write the complete artifact in neutral Latin American Spanish.

Keep the following in their original language:

* File paths.
* Token names.
* Technology names.
* Package names.
* CSS terminology.
* Tailwind terminology.
* Figma terminology.
* TypeScript terminology.
* WCAG terminology.
* Code literals.
* Role names such as `organizer`, `vendor`, and `admin`.

Use professional, direct, and implementation-oriented language.

Avoid promotional language and generic design-system theory.

---

## Required Sources

Read all available source documents completely before generating the artifact.

Use the exact paths listed below.

Do not invent alternate paths, child folders, or filenames.

```text
PRIMARY_UI_FOUNDATIONS:
docs/ux-ui/EventFlow-UI-Foundations.md

VISUAL_LANGUAGE_REFERENCE:
docs/ux-ui/EventFlow-Visual-Language-Reference.md

PRODUCT_OWNER_DECISIONS:
docs/2-Product-Owner-Decisions.md

MVP_SCOPE:
docs/3-MVP-Scope-Definition.md

NON_FUNCTIONAL_REQUIREMENTS:
docs/10-Non-Functional-Requirements.md

FRONTEND_ARCHITECTURE:
docs/15-Frontend-Architecture-Design.md

AI_ARCHITECTURE:
docs/17-AI-Architecture-and-PromptOps-Design.md
```

Also inspect the following source when available:

```text
DESIGN_SYSTEM_SETUP_REFERENCE:
<DESIGN_SYSTEM_SETUP_IMAGE_PATH>
```

The image is supporting evidence only.

It must not override:

* Approved Product Owner decisions.
* EventFlow UI Foundations.
* Accessibility requirements.
* Frontend architecture.
* MVP scope.
* Human-in-the-loop AI requirements.

If a source is unavailable:

1. Record it under `Fuentes no disponibles`.
2. Do not invent its contents.
3. Continue only if the remaining sources provide sufficient evidence.
4. Mark affected tokens as `Provisional` when necessary.

---

## Source Authority

Resolve conflicts using this order:

1. `EventFlow-UI-Foundations.md`.
2. Approved Product Owner decisions.
3. MVP Scope Definition.
4. Non-Functional Requirements.
5. Frontend Architecture.
6. AI Architecture and PromptOps.
7. EventFlow Visual Language Reference.
8. Design System Setup reference image.
9. General design-system recommendations.

The third-party Figma reference remains visual inspiration only.

Do not copy:

* Third-party branding.
* Third-party names.
* Third-party logos.
* Third-party copy.
* Third-party assets.
* Proprietary illustrations.
* Unverified component behavior.
* Unverified authenticated-platform patterns.

---

## Approved UI Baseline

Treat the following foundations as approved and binding.

### Visual direction

EventFlow uses a balanced visual direction:

* Landing page: warm, aspirational, editorial, premium, human, celebratory, and spacious.
* Authenticated platform: clean, structured, calm, functional, accessible, and productivity-oriented.

### Base palette

Use these approved base values:

| Role             | Value     |
| ---------------- | --------- |
| Main text        | `#262626` |
| Secondary text   | `#525252` |
| Primary violet   | `#946DF8` |
| Decorative lilac | `#C4B7E5` |
| Decorative coral | `#EE8C8D` |
| Main background  | `#FFFFFF` |

Rules:

* Violet is the primary functional brand color of the authenticated platform.
* Lilac and coral are primarily decorative.
* Lilac and coral must not be used as body-text colors.
* Lilac and coral must not replace semantic success, warning, error, or info colors.
* The final system must meet WCAG 2.1 AA.
* Light theme only.
* Dark mode is out of scope.

### CTA strategy

* Landing-page primary CTA: dark.
* Authenticated-platform primary CTA: violet.
* Secondary actions: neutral, outlined, white, or ghost.
* Destructive actions: semantic red.

### Typography

Use:

```text
Headings: Inter Tight
Body and UI: Inter
```

Approved conceptual hierarchy:

* Display.
* H1.
* H2.
* H3.
* Body large.
* Body regular.
* Body small.
* Label.
* Caption.

### Interface density

Use intermediate density:

* Spacious landing sections.
* Comfortable dashboards and forms.
* Slightly more compact tables, filters, and admin screens.
* No highly dense enterprise layouts.
* No excessive whitespace in operational screens.

### Radius guidance

Use these starting values:

```text
Buttons: 8 px
Inputs: 8 px
Cards: 12–16 px
Modals and drawers: 16 px
Pills: 999 px
```

### Borders and shadows

* Landing: minimal borders and soft shadows.
* Authenticated platform: visible light borders and very subtle shadows.
* Shadows must not be the only surface-separation mechanism.

### Navigation

Use one shared platform shell:

```text
Desktop: left sidebar
Mobile: drawer
```

Do not create separate themes for `organizer`, `vendor`, and `admin`.

### AI-assisted UX

AI content must use:

* Explicit `Sugerencia de IA` label.
* Recognizable AI icon.
* Very light lilac or neutral surface.
* Violet accent or border.
* Clear pending, accepted, edited, rejected, loading, timeout, fallback, and error states.
* Human confirmation before becoming official data.
* No science-fiction glow or excessive gradients.

### Grid

Use:

```text
Desktop: 12 columns
Tablet: 8 columns
Mobile: 4 columns
```

Foundation guidance:

```text
Marketing max-width: approximately 1280 px
Authenticated platform: fluid
Form content: approximately 720 px maximum width
```

### Accessibility

WCAG 2.1 AA is mandatory.

Include:

* Visible focus.
* Keyboard navigation.
* Minimum touch target around 44 × 44 px.
* Sufficient contrast.
* Status not communicated by color alone.
* Reduced motion.
* Accessible forms.
* Accessible dialogs and drawers.
* Four-locale content expansion.
* Semantic data presentation.

---

## Design Token Architecture

Use a three-level token architecture suitable for an MVP.

### Level 1 — Primitive tokens

Raw reusable values without UI meaning.

Examples:

```text
color.violet.500
color.neutral.900
space.4
radius.3
font.size.4
shadow.2
```

### Level 2 — Semantic tokens

Tokens expressing purpose.

Examples:

```text
color.text.primary
color.surface.default
color.action.primary.background
color.border.default
color.feedback.error
color.ai.surface
```

### Level 3 — Component aliases

Create only a limited set of cross-cutting aliases when they are required to clarify implementation.

Examples:

```text
button.primary.background
input.border.default
card.surface.default
sidebar.item.active.background
```

Do not create a full component-token catalog.

Detailed component aliases belong to:

```text
EventFlow-Component-Foundations.md
```

Use component aliases only when they:

* Resolve an important ambiguity.
* Represent an approved global pattern.
* Are reused across several components.
* Help demonstrate how semantic tokens are consumed.

---

## Token Naming Convention

Use lowercase dot notation.

Required format:

```text
category.group.role.state
```

Examples:

```text
color.brand.primary
color.text.primary
color.action.primary.hover
color.feedback.success.surface
font.size.body.md
space.layout.section
radius.component.card
shadow.marketing.floating
motion.duration.fast
zIndex.overlay.modal
```

Rules:

* Names describe purpose, not visual appearance, at the semantic level.
* Do not use component names in primitive tokens.
* Do not use raw hex values inside semantic token names.
* Do not use role names such as `organizer`, `vendor`, or `admin` in color tokens.
* Do not use numeric scales larger than necessary.
* Keep naming consistent across categories.
* Avoid synonyms such as mixing `background`, `bg`, and `surface`.
* Use `background` for action controls and `surface` for containers or panels.
* Use `foreground` for content rendered over an action or status color.
* Use `text` for normal content.
* Use `border` for strokes and separators.

---

## Required Document Structure

Generate the document using exactly this structure.

Do not omit sections.

# EventFlow — Design Tokens

## Document metadata

Include:

* Document name.
* Version.
* Status.
* Date.
* Language.
* Product.
* Audience.
* Scope.
* Related artifacts.
* Source of truth.

## 1. Purpose

Explain:

* Why this document exists.
* How it translates UI Foundations into reusable values.
* Who consumes the token system.
* Why it is not yet a component specification or code implementation.

## 2. Scope

### 2.1 Included

Cover:

* Primitive tokens.
* Semantic tokens.
* Limited component aliases.
* Colors.
* Typography.
* Spacing.
* Sizing.
* Radius.
* Borders.
* Shadows.
* Layout.
* Breakpoints.
* Motion.
* Focus.
* Z-index.
* Icons.
* AI semantics.
* Accessibility constraints.
* Figma and frontend mapping guidance.

### 2.2 Not included

Exclude:

* React components.
* CSS implementation.
* Tailwind configuration.
* JSON token files.
* Style Dictionary configuration.
* Storybook.
* Full component specifications.
* Pixel-perfect screen layouts.
* Dark mode.
* Role themes.
* Advanced data-visualization tokens.
* Post-MVP themes.
* Custom illustration system.

## 3. Sources

List every source actually read and its contribution.

Include:

```text
Fuentes no disponibles
```

when applicable.

## 4. Authority and conflict resolution

Document the declared authority order.

Clarify that UI Foundations override the visual reference.

## 5. Token-system principles

Define concise principles such as:

1. Semantic meaning over raw visual values.
2. Accessibility before fidelity to the reference.
3. Minimum sufficient scale for the MVP.
4. One shared visual system across roles.
5. Light theme only.
6. Brand colors remain separate from feedback colors.
7. AI states are explicit and human-in-the-loop.
8. Landing and platform may use different aliases over shared primitives.
9. Tokens must work in Figma and frontend.
10. Avoid one-off values when an approved token exists.

## 6. Token architecture

Explain:

* Primitive layer.
* Semantic layer.
* Limited component-alias layer.
* How values flow between layers.
* Which layer future Figma styles and frontend implementation should consume.

Include a concise example such as:

```text
color.violet.600
    ↓
color.action.primary.background
    ↓
button.primary.background
```

Do not generate code.

## 7. Naming conventions

Define:

* Dot notation.
* Category names.
* Scale names.
* State suffixes.
* Semantic naming.
* Prohibited naming patterns.
* Examples.

## 8. Color primitives

Create a minimal but sufficient primitive palette.

At minimum include:

### 8.1 Neutral scale

Create an accessible neutral scale with only the steps needed by the MVP.

Recommended scale:

```text
0
50
100
200
300
400
500
600
700
800
900
950
```

Use the approved values as anchors when possible:

* `#FFFFFF`.
* `#262626`.
* `#525252`.

Ensure the resulting scale is coherent and usable for:

* Text.
* Background.
* Muted surfaces.
* Borders.
* Disabled states.
* Dark landing CTA.

### 8.2 Violet scale

Create a compact violet scale around:

```text
#946DF8
```

The scale must provide values for:

* Light surface.
* Subtle border.
* Default action.
* Hover action.
* Active action.
* Focus.
* Accessible text or foreground combinations.

Do not assume `#946DF8` itself automatically meets contrast for every use.

Validate and adjust semantic assignment accordingly.

### 8.3 Lilac scale

Create only the minimum scale needed around:

```text
#C4B7E5
```

Use primarily for:

* Decorative surfaces.
* AI subtle backgrounds.
* Marketing accents.

Do not use as normal text.

### 8.4 Coral scale

Create only the minimum scale needed around:

```text
#EE8C8D
```

Use primarily for:

* Decorative marketing accents.
* Illustration and shape details.

Do not use as error or destructive color.

### 8.5 Semantic primitive families

Create compact scales for:

* Green.
* Amber.
* Red.
* Blue.

Each family only needs enough values for:

* Surface.
* Border.
* Default.
* Strong.
* Foreground when required.

Avoid generating complete enterprise-style palettes unless necessary.

### 8.6 Transparency primitives

Define a small opacity set for:

* Overlay.
* Disabled.
* Hover.
* Decorative backgrounds.
* Image scrims.

Keep the set minimal.

For every primitive-color table include:

| Token | Value | Classification | Intended use |

Where classification is:

* `Approved`.
* `Derived`.
* `Recommended`.
* `Provisional`.

## 9. Semantic color tokens

Define exact semantic mappings for the light theme.

At minimum include:

### Text

```text
color.text.primary
color.text.secondary
color.text.muted
color.text.disabled
color.text.inverse
color.text.link
color.text.linkHover
```

### Background and surfaces

```text
color.background.default
color.background.subtle
color.surface.default
color.surface.subtle
color.surface.elevated
color.surface.disabled
color.surface.inverse
```

### Borders and separators

```text
color.border.default
color.border.subtle
color.border.strong
color.border.interactive
color.border.disabled
color.separator.default
```

### Actions

```text
color.action.primary.background
color.action.primary.hover
color.action.primary.active
color.action.primary.foreground
color.action.primary.disabledBackground
color.action.primary.disabledForeground

color.action.secondary.background
color.action.secondary.hover
color.action.secondary.foreground
color.action.secondary.border

color.action.ghost.hover
color.action.ghost.foreground

color.action.destructive.background
color.action.destructive.hover
color.action.destructive.foreground
```

### Feedback

For each status include:

```text
surface
border
text
icon
strong
foreground
```

Statuses:

* Success.
* Warning.
* Error.
* Info.

### Focus

```text
color.focus.ring
color.focus.ringOffset
```

### Selection

```text
color.selection.background
color.selection.foreground
```

### Overlay

```text
color.overlay.scrim
```

For every semantic token include:

| Token | References primitive | Final value | Usage | Accessibility note |

Do not create dark-theme equivalents.

## 10. Marketing and platform color aliases

Create only a concise alias set that reflects the approved distinction.

### Marketing aliases

At minimum consider:

```text
color.marketing.cta.background
color.marketing.cta.hover
color.marketing.cta.foreground
color.marketing.accent.lilac
color.marketing.accent.coral
color.marketing.hero.surface
```

### Platform aliases

At minimum consider:

```text
color.platform.cta.background
color.platform.cta.hover
color.platform.cta.foreground
color.platform.sidebar.background
color.platform.sidebar.itemHover
color.platform.sidebar.itemActive
color.platform.sidebar.itemActiveForeground
color.platform.page.background
```

Reuse shared semantic tokens whenever possible.

Do not duplicate values without reason.

## 11. AI semantic tokens

Create an explicit AI token group.

At minimum include:

```text
color.ai.surface
color.ai.surfaceHover
color.ai.border
color.ai.borderStrong
color.ai.text
color.ai.icon
color.ai.label
color.ai.pending
color.ai.accepted
color.ai.edited
color.ai.rejected
color.ai.fallback
color.ai.error
```

Rules:

* AI tokens must not make pending content look official.
* Accepted content should transition to normal system semantics.
* AI status must not depend on color alone.
* AI errors reuse or alias semantic error tokens when appropriate.
* AI fallback may use warning or info semantics when appropriate.
* Avoid unique status colors when an existing semantic color is sufficient.
* Keep lilac subtle and violet functional.
* Do not use animated-glow tokens.

Explain which AI tokens are purely visual and which require text/icon support.

## 12. Typography tokens

Define exact MVP-ready typography values.

### 12.1 Font-family tokens

At minimum:

```text
font.family.heading
font.family.body
font.family.ui
font.family.mono
```

Use:

```text
Inter Tight
Inter
```

For `font.family.mono`, use a system-safe recommendation and mark it appropriately if not explicitly approved.

### 12.2 Font-weight tokens

Use a minimal set such as:

```text
font.weight.regular
font.weight.medium
font.weight.semibold
font.weight.bold
```

Do not create unused weights.

### 12.3 Font-size tokens

Define exact values for:

```text
font.size.display
font.size.h1
font.size.h2
font.size.h3
font.size.body.lg
font.size.body.md
font.size.body.sm
font.size.label
font.size.caption
```

Keep the scale proportional to an MVP.

Differentiate marketing and platform using aliases when needed rather than creating unrelated scales.

### 12.4 Line-height tokens

Define exact values matching the type hierarchy.

### 12.5 Letter-spacing tokens

Create only:

* Tight.
* Normal.
* Wide.

Use tight spacing for large headings only when readable.

### 12.6 Typography semantic aliases

At minimum include:

```text
typography.marketing.display
typography.marketing.h1
typography.platform.pageTitle
typography.platform.sectionTitle
typography.body.default
typography.body.supporting
typography.form.label
typography.form.helper
typography.data.value
typography.data.caption
```

For every typography token include:

| Token | Family | Size | Weight | Line height | Letter spacing | Usage |

Ensure the system supports:

* Four locales.
* Long labels.
* Numeric values.
* Tables.
* Currency.
* Mobile resizing.
* WCAG zoom behavior.

## 13. Spacing tokens

Create a compact spacing scale based on a consistent base unit.

Use a practical MVP scale that supports:

* Micro spacing.
* Inline controls.
* Form fields.
* Cards.
* Page padding.
* Landing sections.

Recommended candidate values may include:

```text
0
2
4
6
8
12
16
20
24
32
40
48
64
80
96
```

Do not include a value unless it has a clear purpose.

Create primitive tokens such as:

```text
space.0
space.1
space.2
...
```

Then define semantic spacing aliases such as:

```text
space.inline.xs
space.inline.sm
space.inline.md
space.component.padding.sm
space.component.padding.md
space.component.padding.lg
space.layout.page.mobile
space.layout.page.desktop
space.layout.section.marketing
space.layout.section.platform
space.form.fieldGap
space.form.groupGap
space.table.cellX
space.table.cellY
```

Avoid excessive aliases.

Include:

| Token | Value | Usage | Classification |

## 14. Sizing and interaction tokens

Define exact values for:

```text
size.control.sm
size.control.md
size.control.lg
size.icon.sm
size.icon.md
size.icon.lg
size.touch.minimum
size.avatar.sm
size.avatar.md
size.avatar.lg
```

Use approximately:

```text
size.touch.minimum = 44 px
```

Ensure:

* Buttons and inputs are accessible.
* Icon-only controls meet touch-target requirements.
* Compact table controls remain usable.
* Mobile controls are not undersized.

Do not create extensive avatar systems unless justified.

## 15. Radius tokens

Create a minimal radius scale.

At minimum include:

```text
radius.none
radius.sm
radius.md
radius.lg
radius.xl
radius.full
```

Map semantic aliases:

```text
radius.button
radius.input
radius.card
radius.card.prominent
radius.modal
radius.drawer
radius.badge
```

Use the approved starting guidance:

* Button: 8 px.
* Input: 8 px.
* Card: 12 px.
* Prominent card: 16 px.
* Modal/drawer: 16 px.
* Pill: 999 px.

Include:

| Token | Value | Usage | Classification |

## 16. Border tokens

Define:

### Width

```text
border.width.none
border.width.default
border.width.strong
```

### Style

```text
border.style.solid
```

Do not create unused styles.

### Semantic aliases

```text
border.input.default
border.input.focus
border.card.default
border.table.default
border.ai.default
border.feedback.strong
```

Use color tokens by reference instead of duplicating values.

## 17. Shadow and elevation tokens

Create a restrained elevation system.

At minimum include:

```text
shadow.none
shadow.surface.subtle
shadow.surface.raised
shadow.overlay.dropdown
shadow.overlay.modal
shadow.marketing.floating
```

Rules:

* Platform shadows remain subtle.
* Landing floating cards may use slightly stronger shadows.
* Modals and dropdowns must remain visibly separated.
* Avoid deep, dramatic, or multi-layer enterprise elevation systems.
* Borders remain available for platform separation.

For every shadow include:

| Token | Value | Intended use | Restrictions |

## 18. Layout tokens

Define exact or justified values for:

```text
layout.container.marketing.max
layout.container.form.max
layout.container.content.max
layout.sidebar.width
layout.sidebar.widthCollapsed
layout.header.height
layout.page.padding.mobile
layout.page.padding.tablet
layout.page.padding.desktop
layout.grid.columns.mobile
layout.grid.columns.tablet
layout.grid.columns.desktop
layout.grid.gutter.mobile
layout.grid.gutter.tablet
layout.grid.gutter.desktop
```

Use approved guidance:

```text
Marketing max-width: approximately 1280 px
Form max-width: approximately 720 px
Desktop columns: 12
Tablet columns: 8
Mobile columns: 4
```

Only define `layout.sidebar.widthCollapsed` if a collapsed sidebar is supported or reasonably required by the UI Foundations.

Otherwise mark it deferred.

Do not invent detailed route layouts.

## 19. Breakpoint tokens

Define a minimal breakpoint set.

Use a practical mobile-first approach such as:

```text
breakpoint.sm
breakpoint.md
breakpoint.lg
breakpoint.xl
breakpoint.2xl
```

Avoid too many custom breakpoints.

For each breakpoint include:

| Token | Value | Intended behavior |

Explain:

* Mobile stack.
* Tablet adaptation.
* Sidebar transition.
* Wide-content behavior.
* Marketing-container behavior.
* Table adaptation.

Ensure compatibility with the frontend architecture.

Do not generate Tailwind configuration.

## 20. Motion tokens

Create only a lightweight MVP motion system.

### Duration

At minimum:

```text
motion.duration.instant
motion.duration.fast
motion.duration.normal
motion.duration.slow
```

### Easing

At minimum:

```text
motion.easing.standard
motion.easing.enter
motion.easing.exit
```

### Semantic aliases

```text
motion.control.hover
motion.control.press
motion.overlay.enter
motion.overlay.exit
motion.drawer.enter
motion.drawer.exit
motion.feedback
```

Rules:

* Motion supports orientation and feedback.
* No decorative continuous animation.
* No animated AI glow.
* No complex route transitions.
* Reduced-motion mode must minimize or eliminate nonessential motion.

Define:

```text
motion.reduced.duration
```

or explain how reduced motion maps to existing duration tokens.

## 21. Focus tokens

Define exact tokens for accessible focus treatment.

At minimum:

```text
focus.ring.width
focus.ring.style
focus.ring.color
focus.ring.offset
focus.ring.offsetColor
```

Include guidance for:

* Buttons.
* Inputs.
* Sidebar items.
* Cards with interactive behavior.
* Icon-only controls.
* Modal and drawer controls.

Focus must remain visible against:

* White.
* Neutral surfaces.
* Violet actions.
* AI surfaces.
* Semantic feedback surfaces.

## 22. Opacity tokens

Create a minimal opacity set.

At minimum consider:

```text
opacity.disabled
opacity.muted
opacity.overlay
opacity.hover
opacity.decorative
```

Do not use opacity in a way that reduces required text contrast.

## 23. Z-index tokens

Create only the required layering system.

At minimum include:

```text
zIndex.base
zIndex.sticky
zIndex.dropdown
zIndex.drawer
zIndex.modal
zIndex.toast
zIndex.tooltip
```

Keep the numeric range simple and predictable.

Explain intended stacking order.

Do not use arbitrary large values such as `999999`.

## 24. Icon tokens

Define:

```text
icon.size.sm
icon.size.md
icon.size.lg
icon.stroke.default
icon.stroke.strong
```

Rules:

* One consistent icon style.
* Functional icons first.
* Icon-only controls must include accessible names.
* AI icon uses the shared icon system.
* Semantic icons use semantic colors.
* Decorative icons must not carry essential meaning.

Do not select an icon library unless approved by a source.

## 25. Data and numeric presentation tokens

Create a minimal token group for operational data.

Consider:

```text
typography.data.primary
typography.data.secondary
typography.data.currency
typography.data.table
color.data.positive
color.data.negative
color.data.neutral
```

Rules:

* Do not use red/green alone to communicate change.
* Currency values must remain unambiguous.
* Tabular numeric alignment may be recommended when supported by the font.
* Avoid creating a complete chart-color system.
* Advanced data visualization is deferred.

## 26. Currency and locale token considerations

Document how tokens support:

* `es-LATAM`.
* `es-ES`.
* `pt`.
* `en`.
* Locale-aware dates.
* Locale-aware numbers.
* Locale-aware currencies.
* Text expansion.
* Long buttons and labels.
* Currency code display when symbols are ambiguous.
* No currency conversion.

Do not create content strings as tokens.

Do not create locale-specific visual themes.

## 27. Limited component aliases

Create a small, illustrative set only.

At minimum include aliases for:

### Button

```text
button.primary.background
button.primary.foreground
button.primary.hover
button.primary.radius
button.primary.height

button.secondary.background
button.secondary.foreground
button.secondary.border
button.secondary.hover
```

### Input

```text
input.background
input.foreground
input.border
input.borderFocus
input.radius
input.height
input.placeholder
input.disabledBackground
```

### Card

```text
card.background
card.border
card.radius
card.shadow
card.padding
```

### Sidebar item

```text
sidebar.item.foreground
sidebar.item.hoverBackground
sidebar.item.activeBackground
sidebar.item.activeForeground
sidebar.item.focusRing
```

### AI recommendation surface

```text
aiRecommendation.background
aiRecommendation.border
aiRecommendation.radius
aiRecommendation.label
aiRecommendation.icon
aiRecommendation.padding
```

All aliases must reference semantic or primitive tokens.

Do not define full component anatomy or every state.

State that detailed component specifications belong to:

```text
docs/ux-ui/EventFlow-Component-Foundations.md
```

## 28. Token tables by consumer

Create a concise mapping table for:

| Consumer | Token layers consumed | Notes |

Include:

* Figma variables.
* Figma text styles.
* Figma effects.
* Tailwind theme.
* CSS custom properties.
* React components.
* Storybook.
* Testing and visual regression.

Do not generate implementation files.

## 29. Figma mapping guidance

Define how the token architecture should map to:

* Figma variable collections.
* Primitive color collection.
* Semantic color collection.
* Number variables.
* Typography styles.
* Effects.
* Radius.
* Spacing.
* Light-mode collection only.

Recommend a simple collection structure suitable for an MVP.

Do not require paid Figma features that are not necessary.

Do not generate plugin-specific JSON.

## 30. Frontend implementation guidance

Provide non-code guidance for:

* Tailwind consumption.
* CSS custom-property strategy.
* Server and Client Components.
* Avoiding hardcoded values.
* Token aliases.
* Responsive variants.
* Focus handling.
* Reduced motion.
* i18n.
* AI states.
* Visual regression testing.

Do not generate:

* `tailwind.config.ts`.
* CSS.
* TypeScript.
* React.
* JSON.

## 31. Accessibility validation

Create a validation matrix.

At minimum include:

| Area | Requirement | Validation method | Blocking |

Cover:

* Text contrast.
* Action contrast.
* Focus contrast.
* Touch target.
* Disabled-state readability.
* Semantic feedback.
* AI-state distinction.
* Reduced motion.
* Zoom and reflow.
* Locale expansion.
* Input labels.
* Error states.
* Modal and drawer visibility.

Mark WCAG 2.1 AA violations as blocking.

## 32. Contrast validation matrix

Create a table with important foreground/background pairs.

At minimum validate:

* Main text / white.
* Secondary text / white.
* Inverse text / dark CTA.
* Primary-action foreground / primary-action background.
* Link / white.
* Focus ring / white.
* Focus ring / violet action.
* Error text / error surface.
* Warning text / warning surface.
* Success text / success surface.
* Info text / info surface.
* AI text / AI surface.
* AI border / AI surface.

For each pair include:

| Foreground token | Background token | Intended use | WCAG target | Result | Action |

Calculate or verify contrast where possible.

When a proposed value fails, adjust the token before finalizing the document.

Do not knowingly publish a failing primary interaction combination.

## 33. Token decision register

Create a decision table with:

| ID | Decision | Classification | Status | Rationale | Source |

Use IDs such as:

```text
TOK-DEC-001
TOK-DEC-002
...
```

Include decisions for:

* Three-level architecture.
* Naming convention.
* Light theme only.
* Primitive scales.
* Semantic colors.
* Violet action system.
* Dark marketing CTA.
* Typography scale.
* 4/8/12 grid.
* Spacing base.
* Radius scale.
* Shadow scale.
* Breakpoints.
* Focus ring.
* Motion.
* AI tokens.
* Role-theme exclusion.
* Semantic-color independence.
* WCAG AA.

Statuses may be:

* `Approved`.
* `Derived`.
* `Provisional`.
* `Deferred`.

Do not invent Product Owner approval for values that were not explicitly approved.

## 34. Deferred decisions

Separate deferred decisions by future artifact.

### Component Foundations

Examples:

* Complete button variants.
* Complete input states.
* Table anatomy.
* Modal anatomy.
* Toast anatomy.
* AI recommendation anatomy.
* Form-field composition.

### Figma implementation

Examples:

* Variable collection creation.
* Style binding.
* Component binding.
* Responsive frame behavior.

### Frontend implementation

Examples:

* CSS custom-property names.
* Tailwind theme keys.
* TypeScript token exports.
* Runtime theming strategy.
* Icon library.
* Font-loading mechanism.

### Post-MVP

Examples:

* Dark mode.
* Role themes.
* Custom themes.
* Advanced motion.
* Data-visualization palette.
* High-density mode.
* Custom illustration tokens.

## 35. Risks and mitigations

Include only relevant MVP risks.

At minimum consider:

* Violet failing contrast in some action combinations.
* Excessive primitive scales.
* Too many semantic aliases.
* Hardcoded values outside tokens.
* Marketing tokens leaking into operational UI.
* Decorative colors used semantically.
* AI content appearing official.
* Figma and code token drift.
* Font loading or fallback issues.
* Translation overflow.
* Breakpoint mismatch.
* Shadow overuse.
* Accessibility validation deferred.

For each risk include:

| Risk | Impact | Mitigation | Owner |

## 36. Open questions

Include only genuinely unresolved questions.

Do not reopen approved UI Foundations.

Questions must include:

| ID | Question | Impact | Owner | Required before | Blocking |

When no blocking questions remain, state:

```text
No existen preguntas bloqueantes para generar Component Foundations.
```

## 37. Approval checklist

Include:

* [ ] UI Foundations were read completely.
* [ ] Primitive and semantic layers are defined.
* [ ] Naming convention is consistent.
* [ ] Light theme is the only theme.
* [ ] Neutral scale is complete but minimal.
* [ ] Violet action scale is accessible.
* [ ] Lilac and coral remain decorative.
* [ ] Semantic feedback colors are independent.
* [ ] Typography tokens are defined.
* [ ] Spacing scale is defined.
* [ ] Sizing and touch targets are defined.
* [ ] Radius tokens are defined.
* [ ] Border tokens are defined.
* [ ] Shadow tokens are restrained.
* [ ] Layout and grid tokens are defined.
* [ ] Breakpoints are defined.
* [ ] Motion tokens are minimal.
* [ ] Focus tokens are accessible.
* [ ] Z-index tokens are defined.
* [ ] AI tokens support human-in-the-loop.
* [ ] Four locales are considered.
* [ ] Currency behavior is respected.
* [ ] Contrast matrix is included.
* [ ] WCAG 2.1 AA violations are blocking.
* [ ] Limited component aliases are included.
* [ ] Figma mapping guidance is included.
* [ ] Frontend mapping guidance is included.
* [ ] No production code was generated.
* [ ] No dark-mode tokens were generated.
* [ ] No role-specific themes were generated.
* [ ] No third-party branding was copied.
* [ ] No post-MVP functionality was introduced.

## 38. Final recommendation

Conclude with:

* Whether the Design Tokens specification is ready for Product Owner and frontend review.
* Whether it is sufficient to generate `EventFlow-Component-Foundations.md`.
* Number of blocking questions.
* Any non-blocking recommendation.
* Any provisional token requiring later validation.
* Recommended next artifact.

---

## Required Token Table Format

Whenever tokens are listed, use tables with this structure when applicable:

| Token | Value / Reference | Classification | Usage | Accessibility / Notes |

For semantic tokens:

| Token | Primitive reference | Resolved value | Usage | Accessibility / Notes |

For typography:

| Token | Family | Size | Weight | Line height | Letter spacing | Usage |

For layout:

| Token | Value | Context | Responsive behavior | Notes |

Avoid presenting large unstructured token dumps.

---

## Classification Rules

Use these classifications consistently:

| Classification | Meaning                                                     |
| -------------- | ----------------------------------------------------------- |
| `Approved`     | Explicitly approved in UI Foundations or by Product Owner   |
| `Derived`      | Directly derived from approved foundations or architecture  |
| `Recommended`  | Selected as the simplest suitable MVP value                 |
| `Provisional`  | Usable now but requires visual or implementation validation |
| `Deferred`     | Intentionally postponed                                     |
| `Out of Scope` | Excluded from MVP                                           |

Do not mark a generated shade or breakpoint as `Approved` unless its exact value was explicitly approved.

---

## Value Selection Rules

When choosing exact values:

1. Prefer values explicitly approved in UI Foundations.
2. Reuse values extracted from the visual reference only when they remain compatible with EventFlow.
3. Adjust values to satisfy accessibility.
4. Use conventional, predictable scales.
5. Keep scales minimal.
6. Avoid arbitrary one-off values.
7. Prefer multiples of 4 for spacing and sizing, with limited exceptions such as 2 px or 6 px.
8. Use consistent progression.
9. Use aliases instead of duplicating values.
10. Mark generated values honestly as `Derived`, `Recommended`, or `Provisional`.
11. Do not leave essential MVP tokens unresolved when a reasonable accessible choice can be made.
12. Do not generate unnecessary tokens for hypothetical components.

---

## Quality Rules

The artifact must:

* Be internally consistent.
* Be implementation-ready.
* Remain proportional to an MVP.
* Use accessible color combinations.
* Clearly distinguish primitives, semantics, and aliases.
* Be usable in both Figma and frontend.
* Avoid token duplication.
* Avoid unnecessary abstraction.
* Avoid role-specific themes.
* Avoid dark mode.
* Avoid excessive component tokens.
* Preserve the distinction between marketing and platform.
* Preserve human-in-the-loop AI states.
* Support four locales.
* Support currency display without conversion.
* Include traceability.
* Include validation guidance.
* Clearly mark provisional values.
* Avoid repeating the full UI Foundations document.
* Avoid generic design-system explanations.

---

## Prohibited Output

Do not generate:

* React code.
* JSX.
* TSX.
* CSS.
* SCSS.
* Tailwind configuration.
* Tailwind class strings.
* CSS custom-property files.
* JSON token files.
* Style Dictionary files.
* TypeScript token exports.
* Figma plugin files.
* Storybook stories.
* Component implementations.
* Component prop APIs.
* Wireframes.
* Full Figma screens.
* Dark-mode tokens.
* Role themes.
* Chart palettes.
* Advanced motion systems.
* Third-party branding.
* Third-party assets.
* User stories.
* Development tasks.
* API changes.
* Database changes.
* Product features outside the MVP.

---

## Completion Criteria

The task is complete only when:

1. `docs/ux-ui/EventFlow-Design-Tokens.md` has been created.
2. `EventFlow-UI-Foundations.md` has been read completely.
3. All available required sources have been read.
4. Missing sources are reported without invented content.
5. Primitive token sets are defined.
6. Semantic token sets are defined.
7. A limited component-alias layer is demonstrated.
8. Exact MVP-ready values are provided where possible.
9. Generated values are classified honestly.
10. The color system meets WCAG 2.1 AA for required combinations.
11. The contrast-validation matrix is included.
12. Typography tokens are complete.
13. Spacing and sizing tokens are complete.
14. Radius, border, and shadow tokens are complete.
15. Layout and breakpoint tokens are complete.
16. Motion, focus, opacity, and z-index tokens are complete.
17. AI semantic tokens support human-in-the-loop.
18. Marketing and platform aliases are differentiated without duplicating the system.
19. Figma mapping guidance is included.
20. Frontend mapping guidance is included.
21. Deferred decisions are separated.
22. No production code is generated.
23. No dark-mode tokens are generated.
24. No role-specific themes are generated.
25. The document remains proportional to the MVP.
26. The final recommendation indicates readiness for Component Foundations.

---

## Final Execution Instruction

Read all sources first.

Resolve conflicts using the declared authority hierarchy.

Generate the complete artifact directly at:

```text
docs/ux-ui/EventFlow-Design-Tokens.md
```

Do not ask for clarification when the approved UI Foundations and source documents provide enough information.

When a genuinely blocking ambiguity exists:

1. Record it under `Open questions`.
2. Mark it as blocking.
3. Do not invent the decision.
4. Complete all unaffected sections.

At the end of the execution, report only:

```text
Artifact created: docs/ux-ui/EventFlow-Design-Tokens.md
Status: Ready for Product Owner and frontend review
Blocking questions: <number>
Provisional tokens: <number>
Next recommended artifact: docs/ux-ui/EventFlow-Component-Foundations.md
```
