# EventFlow UI Foundations — Artifact Generation Prompt

## Role

Act as a Senior Product Designer, UX Architect, Design Systems Architect, Accessibility Specialist, and Product Owner advisor.

You are working on EventFlow, an AI-assisted event-planning platform for organizers, vendors, and administrators.

Your task is to generate the official UI Foundations artifact for the EventFlow MVP.

You must transform the approved Product Owner decisions, the EventFlow visual-language reference, the frontend architecture, and the functional product context into a clear and stable UI foundation.

Do not generate frontend code, Figma components, Tailwind configuration, CSS variables, React components, or implementation tasks.

---

## Action

Generate the following document:

```text
docs/ux-ui/EventFlow-UI-Foundations.md
````

The generated document must become the official source of truth for the foundational visual and interaction decisions of EventFlow.

It must define:

1. The official EventFlow visual direction.
2. The distinction between the landing page and the authenticated platform.
3. The foundational color strategy.
4. The typography strategy.
5. Layout, grid, spacing, density, shape, borders, and elevation principles.
6. The shared navigation model.
7. The visual treatment of AI-assisted experiences.
8. The treatment of photography, imagery, and decorative graphics.
9. Responsive-design rules.
10. Accessibility requirements.
11. Internationalization and currency-display considerations.
12. Which patterns from the third-party Figma reference are adopted, adapted, or rejected.
13. Which decisions are approved for the MVP.
14. Which decisions are intentionally deferred to future artifacts.
15. The implementation guardrails that future Design Tokens, component specifications, Figma designs, and frontend code must follow.

The document must be normative enough to guide future UI work, but proportional to an MVP.

Avoid unnecessary detail, enterprise-level design-system complexity, or speculative rules.

---

## Audience

Write the document for:

* Product Owner.
* Business Analyst.
* UX/UI designers.
* Frontend engineers.
* QA engineers.
* AI coding agents.
* Academic evaluators.
* Future maintainers of EventFlow.

---

## Output Language

Write the complete artifact in neutral Latin American Spanish.

Keep the following elements in their original language:

* File paths.
* Technology names.
* Package names.
* CSS terminology.
* Token names.
* Component names.
* Technical identifiers.
* Product roles such as `organizer`, `vendor`, and `admin`.
* WCAG terminology.
* Code literals.

Use clear, direct, professional, and implementation-oriented language.

Do not use promotional or vague language.

---

## Required Sources

Read all available source documents completely before generating the artifact.

Use the exact paths provided by the operator.

Do not invent child paths, filenames, folders, or document locations.

Required sources:

```text
VISUAL_LANGUAGE_REFERENCE:
<VISUAL_LANGUAGE_REFERENCE_PATH>/EventFlow-Visual-Language-Reference.md

PRODUCT_OWNER_DECISIONS:
<PRODUCT_OWNER_DECISIONS_PATH>/2-Product-Owner-Decisions.md

MVP_SCOPE:
<MVP_SCOPE_PATH>/3-MVP-Scope-Definition.md

BUSINESS_RULES:
<BUSINESS_RULES_PATH>/4-Business-Rules-Document.md

ROLES_AND_PERMISSIONS:
<ROLES_PERMISSIONS_PATH>/5-User-Roles-Permissions-Matrix.md

AI_FEATURES:
<AI_FEATURES_PATH>/7-AI-Features-Specification.md

USE_CASES:
<USE_CASES_PATH>/8-Use-Cases-Specification.md

FUNCTIONAL_REQUIREMENTS:
<FRD_PATH>/9-Functional-Requirements-Document.md

NON_FUNCTIONAL_REQUIREMENTS:
<NFR_PATH>/10-Non-Functional-Requirements.md

FRONTEND_ARCHITECTURE:
<FRONTEND_ARCHITECTURE_PATH>/15-Frontend-Architecture-Design.md

AI_ARCHITECTURE:
<AI_ARCHITECTURE_PATH>/17-AI-Architecture-and-PromptOps-Design.md
```

Also inspect the Design System Setup reference image when available:

```text
DESIGN_SYSTEM_SETUP_IMAGE:
<DESIGN_SYSTEM_SETUP_IMAGE_PATH>
```

The image is supporting visual evidence only.

It must not override:

* Approved EventFlow Product Owner decisions.
* MVP scope.
* Accessibility requirements.
* Frontend architecture.
* Human-in-the-loop AI principles.
* Original EventFlow identity.

If a required source is unavailable:

1. Record it under a section named `Fuentes no disponibles`.
2. Do not invent its contents.
3. Continue only when the remaining sources provide sufficient evidence.
4. Mark any affected conclusion as provisional.

---

## Source Authority

Apply this authority order when resolving conflicts:

1. Approved Product Owner decisions.
2. MVP Scope Definition.
3. Business Rules and Roles & Permissions.
4. Functional and Non-Functional Requirements.
5. Frontend and AI Architecture.
6. EventFlow Visual Language Reference.
7. Design System Setup reference image.
8. General UX/UI recommendations.

The third-party Figma design is only a visual reference.

Never treat it as a source of truth for:

* EventFlow functionality.
* Navigation permissions.
* Business rules.
* Roles.
* Feature scope.
* Product copy.
* Branding.
* Logos.
* Proprietary assets.
* Authenticated-platform behavior.

---

## Approved Product Owner UI Decisions

Treat every decision in this section as approved and binding for the EventFlow MVP.

Do not reopen these decisions unless they conflict with accessibility, functional requirements, or a higher-authority source.

### UI-DEC-001 — Visual direction

EventFlow must use a balanced visual direction.

#### Landing page

The landing page must feel:

* Warm.
* Aspirational.
* Editorial.
* Premium.
* Human.
* Celebratory.
* Spacious.

#### Authenticated platform

The authenticated platform must feel:

* Clean.
* Functional.
* Structured.
* Calm.
* Clear.
* Productivity-oriented.
* Easier to scan than the landing page.

EventFlow must not feel like:

* A generic corporate SaaS.
* A highly playful consumer application.
* A direct clone of the third-party Figma reference.
* A visually overloaded enterprise dashboard.

### UI-DEC-002 — Base color palette

Use the following approved palette as the foundation:

| Role             | Value     |
| ---------------- | --------- |
| Main text        | `#262626` |
| Secondary text   | `#525252` |
| Primary violet   | `#946DF8` |
| Decorative lilac | `#C4B7E5` |
| Decorative coral | `#EE8C8D` |
| Main background  | `#FFFFFF` |

Rules:

* `#946DF8` is the primary functional brand color of the authenticated platform.
* `#C4B7E5` and `#EE8C8D` are primarily decorative.
* Lilac and coral must not be used as body-text colors.
* Lilac and coral must not represent success, warning, or error states.
* Accessible variants may be adjusted later during Design Tokens.
* The final implementation must preserve WCAG 2.1 AA contrast.
* Semantic colors must remain independent from brand colors.
* White is the main background for the MVP.
* The interface must use a light theme only.

### UI-DEC-003 — Primary CTA strategy

Use a mixed CTA strategy.

#### Landing page

* Primary CTA: dark.
* Secondary CTA: white, outlined, neutral, or ghost.
* Decorative violet may support visual emphasis but should not dominate every marketing action.

#### Authenticated platform

* Primary CTA: violet.
* Secondary actions: outlined, neutral, white, or ghost.
* Destructive actions: semantic destructive red.
* Destructive actions must never use violet, lilac, or coral.
* Disabled actions must remain visibly distinct and accessible.

### UI-DEC-004 — Typography

Use:

```text
Headings: Inter Tight
Body and UI: Inter
```

Use a limited conceptual hierarchy for the MVP:

* Display.
* H1.
* H2.
* H3.
* Body large.
* Body regular.
* Body small.
* Label.
* Caption.

Rules:

* Do not create an excessive type scale.
* Landing-page headings may be larger and more editorial.
* Platform headings must be more restrained and operational.
* Form labels must prioritize clarity over visual minimalism.
* Typography must support all required EventFlow languages.
* The document must define purpose and hierarchy, not final pixel-perfect tokens.

### UI-DEC-005 — Interface density

Use intermediate density.

#### Landing page

* Generous whitespace.
* Large section separation.
* Strong visual hierarchy.
* Limited simultaneous information.

#### Authenticated platform

* Comfortable dashboard spacing.
* Clear forms.
* Efficient use of available width.
* Tables, filters, and admin interfaces may be slightly more compact.
* Avoid excessive whitespace in operational screens.
* Avoid highly dense enterprise interfaces.

### UI-DEC-006 — Radius strategy

Use the following foundation-level direction:

```text
Buttons: moderate radius
Inputs: moderate radius
Cards: soft radius
Modals and drawers: soft radius
Badges and pills: fully rounded
```

Recommended starting ranges:

```text
Buttons: 8 px
Inputs: 8 px
Cards: 12–16 px
Modals and drawers: 16 px
Pills: 999 px
```

These are recommendations for future Design Tokens.

Do not present them as immutable implementation values.

### UI-DEC-007 — Borders and elevation

Use a mixed treatment.

#### Landing page

* Soft shadows.
* Minimal borders.
* Floating cards may use restrained elevation.
* Decorative surfaces may overlap when readability is preserved.

#### Authenticated platform

* Light visible borders.
* Very subtle shadows.
* Clear surface separation.
* Inputs, tables, filters, panels, and interactive regions must have visible boundaries.
* Shadows must not be the only mechanism used to separate surfaces.

Avoid:

* Heavy drop shadows.
* Strong glassmorphism.
* Excessive blur.
* Deep elevation systems.
* Decorative shadows in dense operational views.

### UI-DEC-008 — Navigation

Use one shared platform-shell model:

```text
Desktop: left sidebar
Mobile: drawer
```

Apply the same shell structure to:

* `organizer`.
* `vendor`.
* `admin`.

Rules:

* Only navigation options, permissions, content, and role-specific metrics change.
* Do not create three separate visual systems.
* Do not create role-specific color themes.
* The sidebar must support clear active, hover, focus, disabled, and collapsed states when applicable.
* Mobile navigation must not reproduce the full desktop sidebar permanently.
* Route visibility in the frontend is a UX aid; backend authorization remains the source of truth.

### UI-DEC-009 — Role differentiation

Do not create role-based color themes.

Differentiate roles using:

* Role badge.
* Workspace title.
* Navigation options.
* Iconography.
* Content.
* Metrics.
* Permissions.
* Contextual labels.

The overall EventFlow visual identity must remain consistent across all roles.

### UI-DEC-010 — AI-assisted UX

AI-generated or AI-suggested content must be visually distinguishable from confirmed EventFlow data.

Use:

* A recognizable AI icon, such as a sparkle.
* An explicit label such as `Sugerencia de IA`.
* A very light lilac or neutral surface.
* A violet border or accent.
* Clear actions such as:

  * `Aceptar`.
  * `Editar`.
  * `Rechazar`.
  * `Regenerar`, only when supported by the use case.
* Visible loading state.
* Visible fallback state.
* Visible error state.
* Clear distinction between pending and accepted content.

Rules:

* Do not communicate AI status using color alone.
* Do not make AI-generated content appear official before human confirmation.
* Accepted AI content must transition into the normal visual language of confirmed system data.
* Edited AI content must remain traceable when the functional requirements require it.
* AI visual treatment must support human-in-the-loop behavior.
* Avoid strong gradients, animated glows, or science-fiction styling.
* The AI treatment must feel assistive, calm, and trustworthy.

### UI-DEC-011 — Photography and illustration

Use a mixed visual approach for the landing page:

* Real event photography.
* Abstract decorative shapes.
* Lilac, coral, and violet accents.
* Product screenshots or realistic UI mockups.
* Carefully controlled gradients when appropriate.

For the MVP:

* Do not require custom illustration systems.
* Do not require expensive original editorial photography.
* Do not depend on AI-generated imagery.
* Do not use third-party Figma assets without authorization.
* Avoid generic corporate stock photography.
* Prefer imagery that represents real social and corporate events relevant to LATAM.

The authenticated platform must prioritize product UI over decorative imagery.

### UI-DEC-012 — Grid and responsive structure

Use:

```text
Desktop: 12 columns
Tablet: 8 columns
Mobile: 4 columns
```

Foundation guidance:

```text
Marketing max-width: approximately 1280 px
Authenticated platform: fluid layout
Form content: approximately 720 px maximum width when appropriate
```

Rules:

* Treat these as foundation guidance.
* Final breakpoint values belong to Design Tokens or frontend implementation.
* Forms should not stretch unnecessarily across wide screens.
* Tables may use wider fluid containers.
* Landing sections may use constrained or full-bleed compositions.
* Mobile layouts must prioritize vertical flow and touch usability.

### UI-DEC-013 — Dark mode

Dark mode is not part of the EventFlow MVP.

Rules:

* Define and implement only the light theme.
* Do not duplicate tokens for a hypothetical dark theme.
* Do not create dark-mode component variants.
* Dark mode may be reconsidered post-MVP.

### UI-DEC-014 — Semantic colors

Use independent semantic color families:

| State               | Color family |
| ------------------- | ------------ |
| Success             | Green        |
| Warning             | Amber        |
| Error / destructive | Red          |
| Info                | Blue         |

Rules:

* Brand violet is not a success color.
* Coral is not an error color.
* Lilac is not an information-state color.
* Semantic states must include iconography, text, or labels.
* Color must not be the only method used to communicate meaning.
* Final shades belong to the Design Tokens artifact.

### UI-DEC-015 — Accessibility

The MVP accessibility baseline is WCAG 2.1 AA.

Mandatory principles:

* Visible keyboard focus.
* Keyboard operability.
* Minimum touch target of approximately 44 × 44 px.
* Sufficient text and component contrast.
* Form labels must be visible and programmatically associated.
* Errors must be linked to the relevant field.
* Status must not depend only on color.
* Support reduced motion.
* Maintain logical heading hierarchy.
* Provide clear loading, empty, error, and success states.
* Support content expansion in all required languages.
* Avoid text embedded inside decorative images.
* Icons without visible labels must have accessible names.
* Modal and drawer focus must be managed correctly.
* Tables must remain understandable through semantic structure or accessible alternatives.

Do not require WCAG AAA for the MVP.

---

## Product Context That Must Influence UI Foundations

The document must remain aligned with the EventFlow MVP.

EventFlow is:

* A responsive web platform.
* An AI-assisted event-planning workspace.
* A simplified vendor-directory and quote-flow platform.
* A product for `organizer`, `vendor`, and `admin`.
* A light-theme MVP.
* A multi-language product.
* A product where currency belongs to the event and is not automatically converted.
* A human-in-the-loop AI product.
* A platform demonstrated using reproducible seed data.

The UI Foundations must not introduce or imply:

* Real payments.
* Commission handling.
* Digital contracts.
* Chat in real time.
* WhatsApp integration.
* Native mobile applications.
* RSVP.
* Seating plans.
* Advanced collaboration.
* Autonomous AI decisions.
* AI-generated images.
* Automated review moderation.
* Marketplace transaction workflows.

---

## Required Document Structure

Generate the document using the following structure.

Do not omit sections.

Keep the detail proportional to an MVP.

# EventFlow — UI Foundations

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

## 1. Purpose

Explain:

* Why the document exists.
* What decisions it establishes.
* Which future artifacts depend on it.
* Why it is different from the Visual Language Reference.

## 2. Scope

### 2.1 Included

Cover:

* Visual direction.
* Color strategy.
* Typography.
* Layout.
* Density.
* Shape.
* Elevation.
* Navigation.
* AI-assisted UX.
* Imagery.
* Responsive principles.
* Accessibility.
* i18n.
* Currency display.
* System states.
* Landing and authenticated-platform foundations.

### 2.2 Not included

Explicitly exclude:

* Final design tokens.
* Complete component specifications.
* Pixel-perfect Figma mockups.
* React implementation.
* Tailwind implementation.
* CSS variables.
* Storybook implementation.
* Detailed animation system.
* Dark mode.
* Post-MVP features.

## 3. Source documents

List every source actually read.

For each source, explain its contribution.

Include a subsection named:

```text
Fuentes no disponibles
```

when applicable.

## 4. Source authority and decision hierarchy

Define the conflict-resolution hierarchy from this prompt.

Explain that the Figma project is a reference, not the EventFlow design authority.

## 5. Product and experience context

Summarize only the UI-relevant product context:

* Product purpose.
* User roles.
* Main MVP journeys.
* AI human-in-the-loop.
* Responsive web.
* Multi-language.
* Currency behavior.
* Scope restrictions.

Do not repeat the complete FRD.

## 6. Official EventFlow experience direction

Define:

* The balanced direction.
* Marketing personality.
* Authenticated-platform personality.
* Emotional characteristics.
* Functional characteristics.
* Characteristics EventFlow must avoid.

Include a short list of official UI principles.

Recommended foundation principles:

1. Premium but approachable.
2. Warm marketing, calm product.
3. Clear hierarchy before decoration.
4. AI suggestions are always distinguishable.
5. Human confirmation is explicit.
6. Responsive by default.
7. Accessibility is a baseline.
8. One shared system across roles.
9. Semantic states remain independent from branding.
10. MVP simplicity over visual overengineering.

Adapt this list when needed, while preserving the approved meaning.

## 7. Landing-page foundations

Define:

* General composition.
* Whitespace.
* Hero hierarchy.
* CTA behavior.
* Use of photography.
* Decorative shapes.
* Product screenshots.
* Section rhythm.
* Cards.
* Trust and social-proof presentation.
* Footer direction.
* Responsive adaptation.

Do not define final landing-page copy.

Do not invent testimonials, metrics, customer logos, or product claims.

## 8. Authenticated-platform foundations

Define:

* Shared application shell.
* Sidebar behavior.
* Page headers.
* Content containers.
* Dashboards.
* Forms.
* Tables.
* Filters.
* Cards.
* Modals.
* Drawers.
* Empty states.
* Operational density.
* Role consistency.

Make clear that the third-party Figma reference did not define these patterns and that they are EventFlow-specific foundations derived from product and architecture requirements.

## 9. Role-specific experience guidance

Create concise subsections for:

### 9.1 Organizer

Focus on:

* Event progress.
* Tasks.
* Budget.
* AI recommendations.
* Quotes.
* Booking intent.
* Calm planning experience.

### 9.2 Vendor

Focus on:

* Profile completion.
* Approval status.
* Services.
* Quote requests.
* Quote responses.
* Portfolio.
* Clear business actions.

### 9.3 Admin

Focus on:

* Governance.
* Approval queues.
* Moderation.
* Metrics.
* Audit visibility.
* Higher information density without changing the shared visual identity.

Do not define different color themes.

## 10. Color foundations

Document:

* Approved base palette.
* Functional role of each approved color.
* Decorative restrictions.
* Landing versus platform use.
* Semantic-color separation.
* Contrast requirements.
* Accessibility adjustments permitted during Design Tokens.
* Colors that must not be used for text.
* Guidance for backgrounds, surfaces, borders, and muted content.

Do not create full color scales such as `50–950`.

That belongs to the Design Tokens artifact.

## 11. Typography foundations

Document:

* Inter Tight for headings.
* Inter for body and UI.
* Conceptual hierarchy.
* Landing versus platform typography.
* Readability rules.
* Label rules.
* Long-form content.
* Numeric content.
* Table content.
* Multi-language expansion.
* Responsive type behavior.

Do not define every font size.

## 12. Layout and grid foundations

Document:

* 12/8/4-column strategy.
* Marketing max-width.
* Fluid application layout.
* Form max-width.
* Full-width versus constrained sections.
* Sidebar and content relationship.
* Page-padding principles.
* Mobile stacking.
* Tablet adaptation.
* Wide-screen behavior.

Do not define final breakpoint numbers unless explicitly present in a higher-authority source.

## 13. Spacing and density foundations

Define:

* Intermediate density.
* Marketing whitespace.
* Platform spacing.
* Form spacing.
* Table density.
* Admin density.
* Repeated spacing rhythm.
* Relationship between hierarchy and spacing.

Do not generate a complete spacing-token scale.

## 14. Shape, borders, and elevation

Document:

* Radius strategy.
* Suggested starting ranges.
* Card treatment.
* Input treatment.
* Button treatment.
* Modal and drawer treatment.
* Pill treatment.
* Landing shadows.
* Platform borders.
* Elevation restrictions.
* Surface-separation principles.

Mark numeric values as recommended starting points rather than approved immutable tokens.

## 15. Navigation foundations

Document:

* Desktop sidebar.
* Mobile drawer.
* Shared shell across roles.
* Active states.
* Hover and focus.
* Role badge.
* Workspace title.
* Permission-based navigation visibility.
* Breadcrumb use when appropriate.
* Page-header relationship.
* Mobile behavior.
* Backend authorization authority.

Do not define final route names unless they are explicitly supported by the source documents.

## 16. AI-assisted UX foundations

Document:

* Visual distinction of AI content.
* AI label.
* Iconography.
* Surface treatment.
* Pending state.
* Accepted state.
* Edited state.
* Rejected state.
* Regeneration state when supported.
* Loading.
* Timeout.
* Fallback.
* Error handling.
* Human confirmation.
* Transition from suggestion to official data.
* Accessibility of AI states.
* Avoidance of decorative AI clichés.

Align this section with the AI Features Specification and AI Architecture.

## 17. Imagery and visual assets

Document:

* Photography direction.
* LATAM relevance.
* Product screenshots.
* Decorative abstract shapes.
* Gradient use.
* Illustration limitations.
* Asset licensing.
* Third-party reference restrictions.
* Authenticated-platform imagery restrictions.
* Accessibility requirements for images.

## 18. Iconography

Define a simple MVP direction:

* Consistent icon family.
* Functional rather than decorative use.
* Clear stroke or fill consistency.
* Accessible labels.
* Minimum touch targets.
* Role differentiation through context, not separate icon systems.
* AI icon treatment.
* Status-icon treatment.

Do not select a library unless it is already approved by the sources.

## 19. Forms and input foundations

Define:

* Visible labels.
* Helper text.
* Required and optional indicators.
* Validation timing.
* Error presentation.
* Focus treatment.
* Disabled and read-only states.
* Currency fields.
* Date fields.
* Multi-step event creation.
* Long forms.
* Form width.
* Mobile behavior.
* Human confirmation for AI-populated values.

Do not specify every field in the product.

## 20. Data-display foundations

Define:

* Cards.
* Lists.
* Tables.
* Badges.
* Progress indicators.
* Budget values.
* Quote comparison.
* Status labels.
* Filters.
* Pagination.
* Empty states.
* Loading states.
* Responsive alternatives to wide tables.

Keep the section foundational rather than component-exhaustive.

## 21. System states and feedback

Define mandatory treatment for:

* Loading.
* Skeleton.
* Empty.
* Success.
* Warning.
* Error.
* Information.
* Disabled.
* Offline or unavailable dependency when relevant.
* AI timeout.
* AI fallback.
* Permission denied.
* Not found.
* Seed/demo indicators when needed.

Do not use brand colors as semantic-state replacements.

## 22. Responsive-design foundations

Define:

* Mobile-first implementation expectation.
* Desktop, tablet, and mobile behavior.
* Sidebar-to-drawer transformation.
* Touch targets.
* Form stacking.
* Table adaptation.
* CTA stacking.
* Typography reduction.
* Image cropping.
* Horizontal-scroll restrictions.
* Long translated-content handling.

Reaffirm that the MVP is responsive web, not a native mobile application.

## 23. Accessibility foundations

Include the complete WCAG 2.1 AA baseline approved by the Product Owner.

Cover:

* Contrast.
* Focus.
* Keyboard.
* Labels.
* Error association.
* Heading hierarchy.
* Touch targets.
* ARIA.
* Modal focus.
* Drawer focus.
* Reduced motion.
* Color independence.
* Table semantics.
* Image alternatives.
* Dynamic status announcements.
* AI-state accessibility.
* Language support.

Mark these requirements as mandatory.

## 24. Internationalization foundations

Document support for:

* `es-LATAM`.
* `es-ES`.
* `pt`.
* `en`.

Include:

* Flexible layouts.
* Text expansion.
* No text embedded in images.
* Locale-aware dates.
* Locale-aware number formatting.
* Avoidance of fixed-width text controls.
* Translation-safe buttons and navigation.
* Language-switcher considerations.
* Content fallback behavior when defined by the architecture.

Do not create translations.

## 25. Currency-display foundations

Document:

* Currency belongs to each event.
* No automatic conversion.
* Currency must remain visible in budget and quote contexts.
* Do not rely only on the currency symbol when ambiguity exists.
* Use locale-aware formatting.
* Immutable-currency UX must be understandable.
* Locked values should show explanatory text or status.
* The UI must not imply exchange-rate functionality.

## 26. Motion and interaction feedback

For the MVP define only lightweight principles:

* Motion supports orientation and feedback.
* Avoid decorative animation overload.
* Use short transitions.
* Respect reduced motion.
* Do not require complex page transitions.
* Avoid continuous AI glows or animated gradients.
* Loading animations must not block understanding.
* Modal, drawer, hover, and accordion motion should be restrained.

Do not define a complete motion-token system.

## 27. Adopt, Adapt, Reject

Create a table with columns:

| Pattern | Decision | Reason | EventFlow treatment |

Classify relevant patterns from the Visual Language Reference as:

* Adopt.
* Adapt.
* Reject.

At minimum evaluate:

* Inter Tight headings.
* Inter body text.
* Editorial landing-page hierarchy.
* Generous marketing whitespace.
* Lilac and coral decorative accents.
* Violet functional accent.
* Floating marketing cards.
* Soft shadows.
* Large hero typography.
* Gradient navigation text.
* Decorative light colors used as text.
* Third-party branding.
* Third-party copy.
* Third-party assets.
* Third-party authenticated-platform assumptions.

Do not copy visual patterns literally.

## 28. Approved MVP decisions

Create a concise decision register containing:

* Decision ID.
* Decision.
* Status.
* Scope.
* Rationale.
* Downstream artifact impacted.

Include `UI-DEC-001` through `UI-DEC-015`.

All must have status:

```text
Approved
```

## 29. Deferred decisions

List decisions intentionally deferred to:

### Design Tokens

Examples:

* Full color scales.
* Exact type sizes.
* Exact spacing scale.
* Exact shadow values.
* Exact breakpoints.
* Focus-ring values.
* Semantic shades.

### Component Specifications

Examples:

* Complete button variants.
* Complete input variants.
* Table variants.
* Modal anatomy.
* Toast anatomy.
* AI recommendation component anatomy.

### Figma

Examples:

* Pixel-perfect layout.
* Responsive mockups.
* Final image crops.
* Exact card compositions.
* Final landing-page art direction.

### Implementation

Examples:

* Tailwind classes.
* CSS variables.
* React component APIs.
* Storybook stories.
* Animation libraries.
* Exact icon library when not yet approved.

### Post-MVP

Examples:

* Dark mode.
* Advanced themes.
* Custom illustration system.
* Advanced data visualizations.
* Role-specific themes.
* Complex motion system.

## 30. Implementation guardrails

State that future implementation must:

* Use Tailwind CSS and design tokens according to the frontend architecture.
* Avoid hardcoded one-off visual values when a token exists.
* Preserve accessibility.
* Preserve human-in-the-loop AI treatment.
* Keep backend authorization as source of truth.
* Maintain shared visual identity across roles.
* Avoid introducing dark mode.
* Avoid copying the third-party reference.
* Avoid adding post-MVP components or flows.
* Keep marketing and platform visual density distinct.
* Remain compatible with four locales.
* Keep currency behavior accurate.

Do not generate actual code.

## 31. Relationship with future artifacts

Explain the relationship between:

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

Clarify what authority each artifact has.

## 32. Risks and mitigations

Include only relevant MVP risks, such as:

* Copying too much from the Figma reference.
* Low contrast in decorative colors.
* Inconsistent role interfaces.
* AI suggestions appearing official.
* Operational screens becoming too spacious.
* Landing visual language leaking into tables and forms.
* Translation overflow.
* Currency ambiguity.
* Scope creep into a full design system.
* Accessibility deferred until implementation.

For each risk provide a concise mitigation.

## 33. Open questions

Only include questions that remain genuinely unresolved after applying all approved decisions and source documents.

Do not reopen approved decisions.

Do not invent unnecessary questions.

For each question include:

* ID.
* Question.
* Impact.
* Owner.
* Required before.
* MVP-blocking: Yes / No.

When no blocking questions remain, state it explicitly.

## 34. Approval checklist

Include a checklist confirming:

* [ ] Visual direction is documented.
* [ ] Landing and authenticated platform are differentiated.
* [ ] Approved palette is included.
* [ ] Typography is documented.
* [ ] Grid and responsive foundations are documented.
* [ ] Density is documented.
* [ ] Radius, border, and shadow strategy is documented.
* [ ] Shared navigation model is documented.
* [ ] Role-specific themes are excluded.
* [ ] AI treatment supports human-in-the-loop.
* [ ] Photography and imagery direction is documented.
* [ ] Dark mode is excluded from MVP.
* [ ] Semantic colors are independent from brand colors.
* [ ] WCAG 2.1 AA requirements are mandatory.
* [ ] Four locales are supported.
* [ ] Currency display behavior is documented.
* [ ] Adopt / Adapt / Reject decisions are present.
* [ ] Approved UI decisions are registered.
* [ ] Deferred decisions are clearly separated.
* [ ] No frontend code was generated.
* [ ] No final Design Tokens were generated.
* [ ] No third-party branding or assets were authorized for reuse.
* [ ] No out-of-scope product functionality was introduced.

## 35. Final recommendation

Conclude with:

* Whether the UI Foundations are ready for Product Owner approval.
* Whether they are sufficient to generate `EventFlow-Design-Tokens.md`.
* Any non-blocking recommendations.
* Any blocking issue, only when supported by evidence.

---

## Required Classification Labels

When distinguishing the origin of a decision, use:

| Label          | Meaning                                                         |
| -------------- | --------------------------------------------------------------- |
| `Approved`     | Explicitly approved by the Product Owner                        |
| `Derived`      | Logically derived from approved product or architecture sources |
| `Reference`    | Observed in the third-party Figma reference                     |
| `Recommended`  | Suggested specifically for EventFlow                            |
| `Deferred`     | Intentionally postponed to another artifact or phase            |
| `Out of Scope` | Explicitly excluded from the MVP                                |

Do not use `Observed` findings from the third-party design as if they were automatically approved for EventFlow.

---

## Traceability Requirements

Every important foundation must be traceable to at least one of:

* Approved Product Owner UI decision.
* Product Owner Decisions document.
* MVP Scope.
* Business Rule.
* Roles and Permissions.
* Functional Requirement.
* Non-Functional Requirement.
* Use Case.
* Frontend Architecture.
* AI Architecture.
* Visual Language Reference.

Use concise traceability references.

Do not invent requirement IDs.

When an exact ID cannot be confirmed, reference the source document and section conceptually rather than fabricating an identifier.

---

## Quality Rules

The document must:

* Be internally consistent.
* Remain within MVP scope.
* Be useful to UX and engineering.
* Avoid repeated content.
* Clearly distinguish approved decisions from recommendations.
* Clearly distinguish foundations from final tokens.
* Clearly distinguish EventFlow identity from the third-party visual reference.
* Treat accessibility as mandatory.
* Treat AI human confirmation as mandatory.
* Avoid unnecessary design-system complexity.
* Avoid speculative future features.
* Avoid generic design advice not connected to EventFlow.
* Avoid describing the UI as complete or pixel-perfect.
* Avoid presenting recommended numeric values as final tokens.
* Avoid overexplaining common UX concepts.
* Avoid creating implementation tasks.

---

## Prohibited Output

Do not generate:

* React code.
* JSX.
* TSX.
* CSS.
* SCSS.
* Tailwind configuration.
* Tailwind class lists.
* CSS variables.
* JSON token files.
* Figma component definitions.
* Storybook stories.
* Component prop APIs.
* API contracts.
* Database changes.
* Development tasks.
* User stories.
* Wireframes.
* Mermaid UI diagrams unless strictly necessary.
* Dark-mode tokens.
* A complete design-system component catalog.
* Third-party logos, copy, or assets.
* Invented product features.
* Invented route structures.
* Invented testimonials or marketing metrics.

---

## Completion Criteria

The task is complete only when:

1. `EventFlow-UI-Foundations.md` has been created at the exact provided output path.
2. All required source documents have been read or reported as unavailable.
3. Every approved Product Owner UI decision is represented.
4. Landing and authenticated-platform foundations are clearly separated.
5. The role-specific experience guidance is included.
6. AI-assisted UX explicitly supports human-in-the-loop.
7. Accessibility requirements are mandatory.
8. Internationalization and currency behavior are covered.
9. Adopt / Adapt / Reject analysis is included.
10. Approved and deferred decisions are clearly separated.
11. The document does not contain frontend implementation code.
12. The document does not define final Design Tokens.
13. The document remains proportional to an MVP.
14. The final recommendation indicates readiness for the next artifact.

---

## Final Execution Instruction

Read the sources first.

Resolve conflicts using the declared authority hierarchy.

Generate the complete artifact directly at:

```text
docs/ux-ui/EventFlow-UI-Foundations.md
```

Do not ask for additional clarification when the approved decisions and source documents provide enough information.

When a genuinely blocking ambiguity remains:

1. Document it under `Open questions`.
2. Mark it as blocking.
3. Do not invent the missing decision.
4. Complete all unaffected sections.

At the end of the execution, report only:

```text
Artifact created: docs/ux-ui/EventFlow-UI-Foundations.md
Status: Ready for Product Owner review
Blocking questions: <number>
Next recommended artifact: EventFlow-Design-Tokens.md
```
