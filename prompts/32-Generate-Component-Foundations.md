# EventFlow Component Foundations — Artifact Generation Prompt

## Role

Act as a Senior Design Systems Architect, Senior Product Designer, UX Architect, Frontend Architect, Accessibility Specialist, and Component API Designer.

You are working on EventFlow, an AI-assisted event-planning platform for organizers, vendors, and administrators.

Your task is to generate the official Component Foundations specification for the EventFlow MVP.

You must transform the approved UI Foundations and Design Tokens into a coherent, accessible, implementation-oriented component model without generating production code.

The resulting artifact must serve as the contract between:

- Product Design.
- UX/UI.
- Figma.
- Frontend engineering.
- QA.
- Accessibility review.
- AI coding agents.
- Future Storybook and frontend implementation.

The component system must remain proportional to an MVP.

Do not create an enterprise-scale component library, exhaustive variant matrices, role-specific component themes, dark-mode variants, or speculative components for post-MVP features.

---

## Action

Generate the following artifact:

```text
docs/ux-ui/EventFlow-Component-Foundations.md
````

The document must translate the approved EventFlow UI Foundations and Design Tokens into a concise, reusable, accessible component foundation.

It must define:

1. Component architecture.
2. Component naming conventions.
3. Component composition principles.
4. State and variant conventions.
5. Accessibility requirements.
6. Token consumption rules.
7. Responsive behavior.
8. Form-control foundations.
9. Navigation foundations.
10. Feedback and system-state foundations.
11. Data-display foundations.
12. Overlay foundations.
13. AI recommendation component foundations.
14. Landing-page component foundations.
15. Authenticated-platform component foundations.
16. Role-specific usage guidance without role-specific visual themes.
17. Figma guidance.
18. Frontend implementation guidance without generating code.
19. Testing guidance.
20. Deferred decisions.
21. Approval checklist.

The document must define enough detail to guide Figma components, Storybook stories, React component APIs, visual tests, and implementation tasks in later phases.

Do not generate:

* React code.
* JSX.
* TSX.
* CSS.
* Tailwind classes.
* Storybook stories.
* Figma components.
* Production component APIs.
* Development tasks.
* User stories.

---

## Output Language

Write the complete artifact in neutral Latin American Spanish.

Keep the following in their original language:

* File paths.
* Token names.
* Component names.
* Technology names.
* Package names.
* CSS terminology.
* Tailwind terminology.
* Figma terminology.
* React terminology.
* TypeScript terminology.
* Storybook terminology.
* WCAG terminology.
* Code literals.
* Product roles such as `organizer`, `vendor`, and `admin`.

Use direct, professional, implementation-oriented language.

Avoid promotional language and generic design-system theory.

---

## Required Sources

Read all available source documents completely before generating the artifact.

Use the exact paths below.

Do not invent alternate paths, child folders, or filenames.

```text
PRIMARY_UI_FOUNDATIONS:
docs/ux-ui/EventFlow-UI-Foundations.md

PRIMARY_DESIGN_TOKENS:
docs/ux-ui/EventFlow-Design-Tokens.md

VISUAL_LANGUAGE_REFERENCE:
docs/ux-ui/EventFlow-Visual-Language-Reference.md

PRODUCT_OWNER_DECISIONS:
docs/2-Product-Owner-Decisions.md

MVP_SCOPE:
docs/3-MVP-Scope-Definition.md

BUSINESS_RULES:
docs/4-Business-Rules-Document.md

ROLES_AND_PERMISSIONS:
docs/5-User-Roles-Permissions-Matrix.md

AI_FEATURES:
docs/7-AI-Features-Specification.md

USE_CASES:
docs/8-Use-Cases-Specification.md

FUNCTIONAL_REQUIREMENTS:
docs/9-Functional-Requirements-Document.md

NON_FUNCTIONAL_REQUIREMENTS:
docs/10-Non-Functional-Requirements.md

FRONTEND_ARCHITECTURE:
docs/15-Frontend-Architecture-Design.md

AI_ARCHITECTURE:
docs/17-AI-Architecture-and-PromptOps-Design.md

TESTING_STRATEGY:
docs/20-Testing-Strategy.md
```

Also inspect the Design System Setup reference image when available:

```text
DESIGN_SYSTEM_SETUP_REFERENCE:
<DESIGN_SYSTEM_SETUP_IMAGE_PATH>
```

The image is supporting evidence only.

It must not override:

* EventFlow UI Foundations.
* EventFlow Design Tokens.
* Approved Product Owner decisions.
* MVP scope.
* Accessibility requirements.
* Frontend architecture.
* Human-in-the-loop AI principles.

When a source is unavailable:

1. Record it under `Fuentes no disponibles`.
2. Do not invent its contents.
3. Continue only if the remaining sources provide enough evidence.
4. Mark affected component decisions as `Provisional` where necessary.

---

## Source Authority

Resolve conflicts using this order:

1. `EventFlow-UI-Foundations.md`.
2. `EventFlow-Design-Tokens.md`.
3. Approved Product Owner decisions.
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
14. General component-system recommendations.

The third-party Figma project remains visual inspiration only.

Do not copy:

* Third-party branding.
* Third-party names.
* Third-party logos.
* Third-party copy.
* Third-party assets.
* Proprietary component designs.
* Unverified authenticated-platform behavior.
* Unverified navigation models.
* Unverified product functionality.

---

## Approved UI and Token Baseline

Treat the following as binding.

### Visual direction

EventFlow uses a balanced visual direction:

* Landing page: warm, aspirational, editorial, premium, human, celebratory, and spacious.
* Authenticated platform: clean, structured, calm, functional, accessible, and productivity-oriented.

### Shared system

Use one shared component system for:

* `organizer`.
* `vendor`.
* `admin`.

Do not create role-specific visual themes.

Role differences must be expressed through:

* Content.
* Permissions.
* Labels.
* Metrics.
* Navigation visibility.
* Role badges.
* Contextual actions.

### Theme

Use light theme only.

Dark mode is out of scope for the MVP.

### Typography

Use:

```text
Headings: Inter Tight
Body and UI: Inter
```

Consume typography tokens from:

```text
docs/ux-ui/EventFlow-Design-Tokens.md
```

Do not redefine the typography scale.

### Color

Consume semantic and component-alias tokens from the Design Tokens document.

Do not introduce hardcoded component colors unless a missing token is explicitly documented as a required follow-up.

### Radius

Use the approved token mapping for:

* Buttons.
* Inputs.
* Cards.
* Modals.
* Drawers.
* Badges.
* Pills.

Do not redefine radius values inside component specifications.

### Layout

Use:

```text
Desktop: 12-column grid
Tablet: 8-column grid
Mobile: 4-column grid
```

Use:

```text
Desktop authenticated shell: left sidebar
Mobile authenticated shell: drawer
```

### Accessibility

WCAG 2.1 AA is mandatory.

All components must consider:

* Keyboard operation.
* Visible focus.
* Accessible labels.
* Touch targets around 44 × 44 px.
* Programmatic state communication.
* Color-independent meaning.
* Reduced motion.
* Locale expansion.
* Screen-reader status announcements where needed.

### Human-in-the-loop AI

AI-generated content remains a suggestion until explicit human confirmation.

AI components must distinguish:

* Pending.
* Accepted.
* Edited.
* Rejected.
* Regenerating.
* Loading.
* Timeout.
* Fallback.
* Error.

Accepted AI content must transition to the normal presentation of confirmed system data.

---

## Existing Provisional Token Decisions

The Design Tokens artifact contains two provisional tokens.

Treat them as follows.

### Provisional token 1 — `font.family.mono`

Status:

```text
Provisional
```

Rules:

* Do not select or require an additional monospaced web font.
* Do not block Component Foundations because of this token.
* Use the existing provisional system-safe mono stack when a technical display requires it.
* Restrict mono usage to exceptional technical contexts such as:

  * Correlation IDs.
  * Audit identifiers.
  * Technical metadata.
  * Structured payload previews.
  * Admin-only diagnostic information.
* Do not use mono typography in standard EventFlow user-facing content.
* Do not create a dedicated code-editor or developer-console component for the MVP.
* Record final font-loading selection as an implementation decision.

### Provisional token 2 — `layout.sidebar.widthCollapsed`

Status:

```text
Provisional
```

Rules:

* A collapsed sidebar is not required for the MVP.
* Do not make sidebar collapse a mandatory component behavior.
* Do not design persistence of collapsed preference.
* Do not require tooltip-only navigation.
* Do not add component states or tests for collapse unless an approved User Story requires it.
* The primary desktop behavior is an expanded sidebar.
* The primary mobile behavior is a drawer.
* Preserve the token as deferred or provisional for future use.
* Do not remove or redefine it unless the Design Tokens artifact is formally updated.

---

## Non-Blocking Recommendations That Must Be Covered

### Icon library selection

The icon library is not yet approved.

Component Foundations must:

* Define icon requirements independently of a specific library.
* Define a consistent icon style.
* Prefer one coherent family for the entire MVP.
* Avoid mixing filled, outlined, rounded, and sharp icon styles without justification.
* Define expected icon sizes through existing tokens.
* Define accessible-name requirements for icon-only controls.
* Define when icons are decorative and when they communicate meaning.
* Mark exact library selection as a non-blocking implementation decision.
* Include an open decision for the icon library only when it remains unresolved after reading the sources.
* State that icon selection should be completed before final Figma component binding and production implementation.

Do not select a library unless an approved source already contains the decision.

Do not invent an icon-library approval.

### AI sparkle icon

The exact sparkle glyph is not yet approved.

Component Foundations must:

* Define the semantic purpose of the AI icon.
* Require a visible label such as `Sugerencia de IA` in important AI surfaces.
* Avoid depending on the icon alone.
* Allow the final glyph to be selected from the future approved icon library.
* Require consistency across:

  * AI recommendation cards.
  * AI badges.
  * AI actions.
  * AI loading states.
  * AI fallback states.
* Avoid robot heads, magic wands, animated glows, or science-fiction iconography unless later approved.
* Mark the exact glyph as a non-blocking visual decision.
* Require early UX validation before final Figma compositions.
* Preserve accessible labeling regardless of the selected glyph.

### AI border contrast

The Design Tokens artifact reports:

```text
color.ai.border on color.ai.surface ≈ 3.05:1
```

Component Foundations must:

* Use the current `color.ai.border` token by default.
* Require the AI recommendation component to have a visible boundary.
* Require visual validation in browser and Figma.
* Require the border to be evaluated at its actual rendered width.
* Ensure focus treatment remains distinguishable from the default AI border.
* Allow promotion to `color.violet.600` if the current border appears insufficient.
* Treat that promotion as a semantic-preserving token adjustment, not a component-level hardcoded override.
* Prohibit individual components from independently changing the border color.
* Record this as a visual-validation requirement rather than a blocking design decision.

---

## Component-System Principles

Apply the following principles.

1. Composition over excessive variants.
2. Accessibility is part of component anatomy.
3. Semantic tokens over hardcoded visual values.
4. One shared system across roles.
5. Marketing and platform share foundations but may use contextual variants.
6. Every interactive component defines default, hover, focus, active, disabled, loading, and error behavior when applicable.
7. Empty, loading, error, and permission states are first-class product states.
8. AI suggestions are never visually confused with confirmed data.
9. Mobile behavior is defined with each relevant component.
10. Components must support four locales.
11. Components must support long labels and translated content.
12. Component complexity must remain proportional to the MVP.
13. Avoid components for out-of-scope features.
14. Do not duplicate components only because they appear in different roles.
15. Prefer extensible composition rather than deeply configurable universal components.
16. Backend authorization remains the source of truth.
17. Frontend disabled or hidden states are UX aids, not security controls.
18. Reuse existing semantic and component-alias tokens.
19. Do not create one-off component values when a token exists.
20. Component specifications describe behavior and anatomy, not implementation code.

---

## Component Classification

Classify components using these categories.

### Foundation components

Small reusable building blocks:

* Button.
* IconButton.
* Link.
* Text.
* Heading.
* Badge.
* Avatar.
* Divider.
* Spinner.
* Skeleton.

### Form components

* FormField.
* Label.
* Input.
* Textarea.
* Select.
* Checkbox.
* RadioGroup.
* Switch only when supported by a real requirement.
* DateInput or DatePicker foundation.
* CurrencyInput.
* SearchInput.
* FileUpload.
* FormError.
* FormHelperText.

### Navigation components

* AppSidebar.
* SidebarItem.
* MobileNavigationDrawer.
* TopBar.
* Breadcrumb.
* UserMenu.
* LanguageSelector.
* Pagination.

### Feedback components

* Alert.
* Toast.
* InlineMessage.
* ProgressIndicator.
* StatusBadge.
* EmptyState.
* ErrorState.
* PermissionDeniedState.
* NotFoundState.

### Data-display components

* Card.
* MetricCard.
* List.
* Table.
* DataTable foundation.
* FilterBar.
* Tabs.
* Accordion.
* Timeline.
* ProgressSummary.
* DescriptionList.
* PriceDisplay.
* CurrencyDisplay.

### Overlay components

* Modal.
* ConfirmationDialog.
* Drawer.
* DropdownMenu.
* Popover.
* Tooltip.

### AI components

* AIRecommendation.
* AILabel.
* AILoadingState.
* AIFallbackState.
* AIErrorState.
* AIActionGroup.

### Marketing components

* MarketingHeader.
* Hero.
* CTAGroup.
* FeatureCard.
* ContentSection.
* Testimonial foundation only when product content exists.
* SocialProof foundation only when real or approved seed content exists.
* MarketingFooter.
* ProductPreview.

Do not add components for features outside the MVP.

---

## Component Priority

Classify components by MVP priority.

Use:

* `P0 — Required for application shell or critical flows`.
* `P1 — Required for complete MVP journeys`.
* `P2 — Useful but deferrable`.
* `Out of Scope`.

Prioritize according to actual EventFlow journeys.

At minimum, P0 should include the components required for:

* Authentication.
* Application shell.
* Event creation.
* Dashboard.
* Forms.
* AI recommendations.
* Tasks.
* Budget.
* Vendor directory.
* Quote flow.
* Admin governance.
* Loading, empty, and error states.

Do not mark every component as P0.

---

## Required Document Structure

Generate the document using exactly this structure.

Do not omit sections.

# EventFlow — Component Foundations

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
* Next downstream artifacts.

## 1. Purpose

Explain:

* Why the document exists.
* How it translates UI Foundations and Design Tokens into component foundations.
* Who consumes the document.
* Why it is not production code.
* Why it is not yet the final Figma library or Storybook catalog.

## 2. Scope

### 2.1 Included

Cover:

* Component principles.
* Component anatomy.
* Variants.
* States.
* Accessibility.
* Responsive behavior.
* Token usage.
* Composition.
* MVP priority.
* Figma guidance.
* Frontend guidance.
* Testing guidance.
* AI-specific components.
* Landing and platform components.

### 2.2 Not included

Exclude:

* React implementation.
* TypeScript prop definitions.
* Tailwind classes.
* CSS.
* Storybook stories.
* Figma components.
* Pixel-perfect screens.
* Dark mode.
* Role themes.
* Advanced data visualization.
* Native mobile components.
* Post-MVP features.
* Full design-system documentation.
* Route implementation.
* Backend logic.

## 3. Sources

List every source actually read and its contribution.

Include:

```text
Fuentes no disponibles
```

when applicable.

## 4. Authority and conflict resolution

Document the source-authority hierarchy.

Clarify that:

* UI Foundations define intent.
* Design Tokens define reusable values.
* Component Foundations define anatomy, variants, states, and usage.
* Figma and frontend must implement these decisions.
* Third-party Figma reference is not the component authority.

## 5. Component-system principles

Document the approved principles from this prompt.

Keep them concise and enforceable.

## 6. Component architecture

Define:

* Foundation components.
* Composite components.
* Feature compositions.
* Page compositions.
* Difference between reusable component and feature-specific composition.
* When to create a new component.
* When to compose existing components.
* When not to generalize.

Use a simple model such as:

```text
Design Tokens
    ↓
Foundation Components
    ↓
Composite Components
    ↓
Feature Compositions
    ↓
Pages
```

Clarify that feature-specific business components may exist without being promoted into the global design system.

## 7. Naming conventions

Define naming rules for:

* Component names.
* Variants.
* Sizes.
* States.
* Slots.
* Composite components.
* Feature-specific components.
* Figma naming.
* Storybook naming guidance.
* Test identifiers only as non-visual implementation guidance.

Use `PascalCase` for component names in documentation.

Avoid names based only on visual appearance such as:

* `PurpleCard`.
* `BigButton`.
* `RoundedBox`.

Prefer semantic names such as:

* `AIRecommendation`.
* `StatusBadge`.
* `QuoteSummaryCard`.

Do not define production APIs.

## 8. Component specification template

Define the standard format that every component section must follow.

Use:

### Component name

#### Purpose

#### Priority

#### Contexts

#### Anatomy

#### Variants

#### Sizes

#### States

#### Behavior

#### Responsive behavior

#### Accessibility

#### Token dependencies

#### Content rules

#### Usage guidelines

#### Anti-patterns

#### Open decisions

Keep each component specification concise.

## 9. Global state model

Define the shared state vocabulary:

* Default.
* Hover.
* Focus.
* Active.
* Selected.
* Disabled.
* Read-only.
* Loading.
* Success.
* Warning.
* Error.
* Empty.
* Pending.
* Accepted.
* Edited.
* Rejected.
* Fallback.
* Timeout.

Explain which states apply only to certain components.

Do not force irrelevant states onto every component.

## 10. Global size model

Define a limited component-size vocabulary.

Recommended:

* `sm`.
* `md`.
* `lg`.

Rules:

* `md` is the default.
* `sm` is for compact tables, filter bars, or secondary actions.
* `lg` is for landing CTAs or prominent actions.
* Icon-only controls must still meet the minimum touch target.
* Avoid `xs`, `xl`, and multiple intermediate sizes unless justified.

Map sizes conceptually to existing tokens.

Do not redefine token values.

## 11. Buttons

Specify:

### Button

Include:

* Purpose.
* Priority.
* Anatomy.
* Variants:

  * Primary.
  * Secondary.
  * Ghost.
  * Destructive.
  * Link-style only when justified.
* Sizes:

  * `sm`.
  * `md`.
  * `lg`.
* States:

  * Default.
  * Hover.
  * Focus.
  * Active.
  * Disabled.
  * Loading.
* Leading and trailing icons.
* Full-width mobile behavior.
* Loading-label behavior.
* Destructive confirmation guidance.
* Accessible naming.
* Token dependencies.
* Anti-patterns.

Distinguish:

* Dark primary marketing CTA.
* Violet primary platform CTA.

Do not create separate button components for marketing and platform when variants or contextual aliases are sufficient.

### IconButton

Include:

* Accessible name requirement.
* Tooltip guidance.
* Touch-target requirement.
* Icon sizing.
* Disabled and loading behavior.
* Destructive icon-button restrictions.

## 12. Links and inline actions

Specify:

* TextLink.
* NavigationLink.
* InlineAction.
* External-link indicator when needed.
* Focus and hover.
* Visited-state policy.
* Accessible naming.
* Color and underline behavior.
* Avoidance of button behavior on links and link behavior on buttons.

## 13. Typography components

Specify foundational usage for:

* Heading.
* Text.
* Label.
* Caption.
* NumericValue.

Do not create typography components for every token.

Explain when semantic HTML must take precedence over visual style.

## 14. Badges, statuses, and tags

Specify:

### Badge

Use for:

* Role.
* Category.
* Lightweight metadata.

### StatusBadge

Use for:

* Event status.
* Vendor approval status.
* Quote status.
* Booking-intent status.
* AI status when appropriate.

Rules:

* Semantic status must not rely only on color.
* Include label text.
* Icons are optional.
* Do not use decorative brand colors for errors or success.
* Avoid excessive pills across every interface.

### AILabel

Use:

```text
Sugerencia de IA
```

or the translated equivalent.

Require:

* Visible text in important contexts.
* Shared AI icon.
* Accessible semantics.
* No animated glow.

## 15. Forms architecture

Define:

* `FormField` as the standard composition.
* Label.
* Control.
* Helper text.
* Error text.
* Required or optional indicator.
* Character count when necessary.
* Loading and read-only states.
* Field grouping.
* Form sections.
* Form actions.
* Sticky actions only when justified.
* Mobile stacking.

Clarify:

* Zod and backend validation remain implementation responsibilities.
* UI error presentation must align with API error behavior.
* Hidden labels are not the default.
* Placeholder is not a replacement for label.

## 16. Input components

Specify:

### Input

Variants or input types:

* Text.
* Email.
* Password.
* Number.
* Search.
* Currency.
* Date where native or supported.

Define:

* Leading/trailing content.
* Clear action.
* Error.
* Disabled.
* Read-only.
* Loading where applicable.
* Prefix and suffix.
* Mobile keyboard considerations.
* Locale behavior.

### Textarea

Define:

* Minimum and maximum resizing guidance.
* Character count.
* Long brief behavior.
* Error states.
* AI-generated initial content confirmation.

### SearchInput

Define:

* Search icon.
* Clear control.
* Debounce as implementation detail.
* Loading.
* Empty search result relationship.
* Accessible label.

### CurrencyInput

Define:

* Currency code visibility when symbols are ambiguous.
* Locale-aware formatting.
* No currency conversion.
* Immutable event-currency context.
* Error and helper text.

## 17. Selection controls

Specify:

### Select

Include:

* Label.
* Placeholder.
* Selected value.
* Error.
* Disabled.
* Loading options.
* Keyboard navigation.
* Mobile behavior.

Do not decide native versus custom implementation unless a source already does.

### Checkbox

Use for independent multiple selections.

### RadioGroup

Use for one selection among visible options.

### Switch

Only include as `P2` or omit when no approved EventFlow use case requires immediate binary preference toggling.

Do not invent settings pages to justify switches.

## 18. Date and event-related controls

Specify a foundation for event-date selection.

Include:

* Label.
* Locale-aware date display.
* Keyboard accessibility.
* Error handling.
* Mobile behavior.
* Date constraints.
* Relationship with event lifecycle.
* No calendar-integration assumptions.

Do not create calendar-sync components.

## 19. File upload

Specify:

* Dropzone or trigger foundation.
* File list.
* Progress.
* Error.
* Unsupported file type.
* Size limits.
* Remove action.
* Read-only state.
* Portfolio-image context.
* Attachment context.
* Accessible alternative to drag-and-drop.
* Soft-delete awareness as product behavior.
* Security guidance at a conceptual level.

Do not define storage or upload APIs.

## 20. Navigation foundations

Specify:

### AppSidebar

Include:

* Expanded desktop state as MVP default.
* Navigation groups.
* Active item.
* Hover.
* Focus.
* Disabled item when justified.
* Role badge or workspace context.
* Footer area.
* User context.
* Long translated labels.
* Responsive disappearance.

Explicitly state:

* Collapsed sidebar is not required for MVP.
* `layout.sidebar.widthCollapsed` remains provisional.
* Do not require collapse state, persistence, or tooltip-only navigation.

### SidebarItem

Include:

* Icon.
* Label.
* Active state.
* Badge or count when supported.
* Focus.
* Long labels.
* Permission-based visibility.

### MobileNavigationDrawer

Include:

* Trigger.
* Overlay.
* Focus management.
* Escape behavior.
* Close action.
* Current-route visibility.
* Body-scroll locking as implementation detail.
* Accessibility.

### TopBar

Include:

* Page context.
* Menu trigger on mobile.
* User menu.
* Language selector when placed globally.
* Notification access only when required.

### Breadcrumb

Use only when hierarchy benefits comprehension.

Do not require breadcrumbs on every page.

### UserMenu

Include:

* Profile.
* Language or preferences when supported.
* Logout.
* Role context.
* Keyboard support.

## 21. Tabs, accordion, and disclosure

Specify:

### Tabs

Use for closely related views within the same context.

Define:

* Keyboard interaction.
* Active tab.
* Responsive overflow.
* Avoidance of nested tab complexity.

### Accordion

Use for progressive disclosure and secondary content.

Define:

* Heading semantics.
* Expanded/collapsed states.
* Keyboard support.

Do not use accordion to hide essential form fields by default.

## 22. Cards and surfaces

Specify:

### Card

Variants:

* Default.
* Interactive.
* Elevated marketing.
* Subtle operational.
* AI recommendation handled separately.

Define:

* Header.
* Body.
* Footer.
* Optional media.
* Action placement.
* Selected state.
* Responsive behavior.
* Token dependencies.

Avoid making every container a card.

### MetricCard

Use for:

* Dashboard summaries.
* Admin metrics.
* Progress summaries.

Define:

* Label.
* Primary value.
* Supporting context.
* Trend only when real data exists.
* Loading and empty behavior.
* No invented metrics.

### FeatureCard

Use only in landing or marketing contexts.

## 23. Lists and tables

Specify:

### List

Use for:

* Tasks.
* Notifications.
* Quote requests.
* Activity items.
* Simple mobile-friendly data.

### Table

Use for:

* Structured comparisons.
* Administrative data.
* Quote comparison.
* Vendor lists when appropriate.

Define:

* Header semantics.
* Row actions.
* Sorting indicators when supported.
* Pagination relationship.
* Selection only when supported.
* Loading.
* Empty.
* Error.
* Responsive behavior.
* Horizontal-scroll policy.
* Mobile transformation into cards or stacked rows when necessary.

### DataTable foundation

Do not create an enterprise data-grid specification.

Exclude:

* Column pinning.
* Complex grouping.
* Virtualization.
* Spreadsheet editing.
* Advanced export.

Unless explicitly required by source documents.

## 24. Filters and pagination

Specify:

### FilterBar

Include:

* Search.
* Select filters.
* Clear-all.
* Applied-filter summary.
* Mobile wrapping or drawer behavior.
* Loading relationship.
* Accessible labels.

### Pagination

Include:

* Previous.
* Next.
* Current page.
* Total pages when available.
* Keyboard support.
* Mobile simplification.
* Disabled states.

Do not require infinite scrolling.

## 25. Progress and planning components

Specify:

### ProgressIndicator

Use for:

* Event planning progress.
* Multi-step event creation.
* Task completion.

Define:

* Determinate and indeterminate usage.
* Label.
* Numeric or text value.
* Color-independent communication.
* Accessibility.

### Stepper

Use for event-creation wizard only when supported by source use cases.

Define:

* Current step.
* Completed step.
* Upcoming step.
* Error step.
* Mobile behavior.
* Nonlinear navigation only when product rules allow it.

### Timeline

Use for event planning milestones or task chronology.

Keep the foundation simple.

Do not create a calendar planner.

## 26. Price, budget, and currency display

Specify:

### CurrencyDisplay

Include:

* Locale-aware formatting.
* Currency code when symbols are ambiguous.
* No conversion implication.
* Negative-value treatment.
* Screen-reader-friendly output.

### BudgetSummary

Include:

* Planned.
* Committed.
* Remaining.
* Over-budget warning.
* Loading.
* Empty.
* Semantic status.

### PriceDisplay

Use for quotes and vendor services.

Do not create payment or checkout components.

## 27. Feedback components

Specify:

### Alert

Variants:

* Info.
* Success.
* Warning.
* Error.

Include:

* Icon.
* Title.
* Body.
* Optional action.
* Dismiss behavior only when appropriate.
* Accessibility.

### InlineMessage

Use near relevant content or form controls.

### Toast

Use for transient confirmation.

Rules:

* Do not use toast as the only place for critical errors.
* Provide accessible announcements.
* Keep duration sufficient.
* Avoid stacking excessive toasts.

### StatusBadge

Reference the status specification rather than duplicate it.

## 28. Loading components

Specify:

### Spinner

Use for small local actions.

### Skeleton

Use for predictable content layout.

### PageLoadingState

Use for route-level loading when required.

Rules:

* Do not block the entire page for small actions.
* Preserve context where possible.
* Loading labels must be accessible.
* AI loading must clearly state that a suggestion is being generated.

## 29. Empty, error, and permission states

Specify:

### EmptyState

Include:

* Clear title.
* Explanation.
* Primary next action.
* Optional supporting visual.
* No fake data.

Contexts:

* No events.
* No tasks.
* No vendors.
* No quote requests.
* No notifications.

### ErrorState

Include:

* Clear description.
* Recovery action.
* Retry when appropriate.
* Correlation ID only in technical or support context.
* No sensitive details.

### PermissionDeniedState

Include:

* Role-appropriate message.
* Safe navigation action.
* No disclosure of restricted data.

### NotFoundState

Include:

* Clear recovery.
* No ambiguity with permission denial.

## 30. Overlay components

Specify:

### Modal

Use for:

* Focused forms.
* Details.
* Non-destructive decisions.
* Confirmations when content is more than a simple question.

Define:

* Title.
* Description.
* Content.
* Actions.
* Close control.
* Escape behavior.
* Focus trap.
* Return focus.
* Mobile behavior.

### ConfirmationDialog

Use for:

* Destructive or irreversible actions.
* Important state transitions.

Define:

* Explicit action labels.
* Avoid generic `OK`.
* Loading.
* Disabled confirmation until requirements are met when appropriate.

### Drawer

Use for:

* Mobile navigation.
* Mobile filters.
* Secondary contextual workflows.

Define:

* Focus management.
* Overlay.
* Close behavior.
* Responsive use.

### DropdownMenu

Use for compact contextual actions.

### Tooltip

Use only for supplemental clarification.

Do not use tooltip as the only source of required information.

## 31. AI recommendation component family

This section is mandatory and must be detailed enough to guide Figma and implementation.

### AIRecommendation

Define:

#### Purpose

Present AI-generated suggestions that require human review.

#### Priority

```text
P0
```

#### Anatomy

At minimum:

* AI icon.
* Visible `Sugerencia de IA` label.
* Optional title.
* Suggestion content.
* Source or context note when available.
* Status.
* Action group.
* Optional edit region.
* Loading or fallback message.
* Accessible status text.

#### Variants

Use only variants justified by approved AI features, such as:

* Plan suggestion.
* Checklist suggestion.
* Budget suggestion.
* Vendor-category suggestion.
* Quote-brief suggestion.
* Quote-comparison summary.
* Vendor bio suggestion when included in MVP priority.

Avoid creating a separate visual component for every AI feature when composition can handle the difference.

#### States

Define:

* Pending review.
* Editing.
* Accepted.
* Edited and accepted.
* Rejected.
* Regenerating.
* Loading.
* Timeout.
* Fallback.
* Error.

#### Actions

When supported:

* Accept.
* Edit.
* Reject.
* Regenerate.

Rules:

* Do not show unsupported actions.
* Actions must have explicit labels.
* Acceptance must be intentional.
* Accepted content should leave the suggestion presentation and become normal confirmed data.
* Rejected content should not remain visually equivalent to active suggestions.
* Regeneration should preserve user understanding of what will be replaced.

#### Visual treatment

Use:

* `aiRecommendation.*` aliases.
* `color.ai.*` semantic tokens.
* Subtle lilac or neutral surface.
* Violet border or accent.
* Shared AI icon.

#### Border validation

Require:

* Current `color.ai.border` token by default.
* Browser and Figma visual validation.
* Promotion to `color.violet.600` when needed.
* No component-level hardcoded border override.
* Focus ring visually distinct from default border.

#### Icon decision

Require:

* Semantic AI icon behavior.
* Visible label.
* No dependence on exact sparkle glyph.
* Final glyph selected after icon library decision.
* Early UX validation.
* Accessible name or decorative treatment depending on context.

#### Accessibility

Include:

* Status announced when generation completes.
* Loading announced without excessive repetition.
* Error and fallback communicated in text.
* Actions keyboard accessible.
* No color-only distinction.
* Accepted state clearly communicated.
* Editing state labeled.
* Focus order.
* Long translated content.
* Screen-reader-friendly labels.

#### Anti-patterns

Prohibit:

* Animated glow.
* Robot mascot as default icon.
* Magic-wand-only semantics.
* AI content shown as confirmed data.
* Accept-by-default behavior.
* Hidden rejection.
* Gradient text with insufficient contrast.
* Color-only status.
* Unlabeled icon actions.

### AILabel

Define separately but concisely.

### AIActionGroup

Define ordering and responsive behavior.

Recommended action hierarchy:

* Accept as primary when user intent supports it.
* Edit as secondary.
* Reject as ghost or secondary destructive-neutral action.
* Regenerate as contextual secondary action.

Do not use destructive red for rejecting a suggestion unless rejection has destructive consequences.

### AILoadingState

Define:

* Clear generation message.
* Progress not falsely quantified.
* Cancel only when supported.
* Timeout behavior.

### AIFallbackState

Define:

* Explain that a fallback or template was used.
* Preserve workflow.
* Avoid implying the output came from the primary LLM.
* Use info or warning semantics as defined by tokens.

### AIErrorState

Define:

* Clear recovery action.
* Retry when appropriate.
* No raw provider error.
* No secret or prompt leakage.

## 32. Marketing component foundations

Specify concise foundations for:

### MarketingHeader

* Logo area.
* Navigation.
* Primary CTA.
* Mobile menu.
* Sticky behavior only when justified.
* Accessible navigation.

### Hero

* Eyebrow optional.
* Heading.
* Supporting copy.
* CTA group.
* Media or product preview.
* Decorative layers.
* Responsive stacking.
* Avoid fixed text widths that break translations.

### CTAGroup

* Primary dark CTA.
* Secondary action.
* Mobile full-width behavior.

### FeatureCard

* Icon or image.
* Title.
* Description.
* Optional link.
* No unsupported claims.

### ContentSection

* Constrained or full-bleed behavior.
* Alternating composition.
* Responsive stacking.

### ProductPreview

* Real or approved mockup.
* Accessible alternative.
* No fake functionality.

### MarketingFooter

* Navigation.
* Legal links when available.
* Language access when appropriate.
* No invented social links.

Do not generate landing-page copy.

## 33. Role-specific component usage

Create concise guidance for:

### `organizer`

Prioritize:

* Event cards.
* Task lists.
* Progress.
* Budget summaries.
* AI recommendations.
* Vendor results.
* Quote comparison.
* Booking-intent status.

### `vendor`

Prioritize:

* Profile completion.
* Approval status.
* Service cards.
* Quote-request list.
* Quote-response forms.
* Portfolio upload.
* Review summaries.

### `admin`

Prioritize:

* Approval queues.
* Data tables.
* Filters.
* Moderation actions.
* Status badges.
* Audit details.
* Metrics.
* Confirmation dialogs.

Rules:

* Reuse the same foundational components.
* Do not create role-specific themes.
* Allow admin views to use slightly denser configurations.
* Do not create an enterprise data-grid system.

## 34. Iconography requirements

Define:

* One coherent future icon library.
* Consistent stroke or fill style.
* Token-based icon sizes.
* Accessible names.
* Decorative-icon handling.
* Semantic icon mapping.
* AI icon requirements.
* Status icon requirements.
* Icon and label spacing.
* Minimum touch targets.

Record exact icon-library selection as:

```text
Non-blocking open decision
```

unless already resolved by the sources.

Require resolution before:

* Final Figma component binding.
* Final production implementation.
* Visual regression baselines.

Do not block the Component Foundations artifact.

## 35. Content and microcopy rules

Define concise rules:

* Use explicit action labels.
* Avoid vague actions such as `Continuar` when a more specific label exists.
* Use sentence case.
* Keep status labels concise.
* Preserve translation flexibility.
* Do not embed product copy in components.
* Distinguish helper, warning, error, and confirmation language.
* AI content must identify itself as a suggestion.
* Destructive actions must name the consequence.
* Do not use technical backend terminology in user-facing errors.
* Currency and locale language must remain unambiguous.

Do not create the complete product copy deck.

## 36. Responsive behavior model

Define component-level principles for:

* Mobile stacking.
* Full-width primary actions when appropriate.
* Drawer navigation.
* Filter collapse.
* Table adaptation.
* Modal-to-drawer adaptation when justified.
* Long-label wrapping.
* Touch targets.
* Hero stacking.
* Card grids.
* Action-group wrapping.
* AI recommendation actions on mobile.
* File-upload fallback.
* Avoidance of horizontal scroll except for data tables when unavoidable.

Do not create native-mobile patterns.

## 37. Accessibility requirements by component category

Create a validation matrix with:

| Category | Requirement | Components affected | Blocking |

Cover:

* Keyboard access.
* Focus visibility.
* Accessible name.
* Label association.
* Error association.
* Status announcements.
* Touch target.
* Contrast.
* Modal focus.
* Drawer focus.
* Tooltip access.
* Table semantics.
* AI state announcements.
* Reduced motion.
* Locale expansion.
* Zoom and reflow.

Mark WCAG 2.1 AA failures as blocking.

## 38. Token-consumption matrix

Create a concise matrix:

| Component | Primary semantic tokens | Component aliases | Prohibited hardcoding |

Include at minimum:

* Button.
* Input.
* Card.
* SidebarItem.
* Alert.
* StatusBadge.
* Modal.
* Table.
* AIRecommendation.
* Hero.
* Marketing CTA.

Do not repeat full token tables.

Reference tokens by name.

## 39. Figma component guidance

Define non-executable guidance for:

* Component sets.
* Variants.
* Boolean properties.
* Instance-swap properties for icons.
* Text properties.
* Auto Layout.
* Responsive constraints.
* Token binding.
* Light theme only.
* Shared foundations across roles.
* AI component states.
* Naming conventions.
* Description fields.
* Accessibility annotations.

Keep the Figma setup proportional to an MVP.

Do not require variants for every possible combination.

Recommend avoiding combinatorial explosion.

## 40. Frontend implementation guidance

Provide non-code guidance for:

* React composition.
* Server versus Client Component considerations.
* Token consumption.
* Controlled versus uncontrolled form behavior as implementation decision.
* Accessibility primitives.
* Reuse versus feature-specific composition.
* Avoiding prop explosion.
* Loading-state ownership.
* Error-state ownership.
* API authorization boundaries.
* i18n.
* Currency.
* Testing.
* Visual regression.

Do not generate React APIs.

Do not generate TypeScript interfaces.

## 41. Testing guidance

Define what future implementation must test.

### Unit or component tests

Cover:

* Variant rendering.
* Disabled state.
* Loading state.
* Accessible name.
* Keyboard behavior.
* Error association.
* Status text.
* AI state transitions.

### Integration tests

Cover:

* Forms.
* Validation.
* Modal workflows.
* Drawer navigation.
* AI accept/edit/reject.
* Table filters.
* File upload states.

### Visual regression

Cover:

* Core variants.
* Focus.
* Error.
* Loading.
* Mobile.
* Long translations.
* AI border and surface.
* Marketing CTA.
* Dark CTA against light background.
* Violet action contrast.

### Accessibility tests

Cover:

* Automated checks.
* Keyboard testing.
* Screen-reader spot checks.
* Contrast validation.
* Reflow.
* Modal focus.
* Drawer focus.

Align with the Testing Strategy.

Do not generate test code.

## 42. Component inventory

Create a consolidated table:

| Component | Category | Priority | MVP status | Main contexts | Detailed specification required later |

Classify all components discussed.

Use honest prioritization.

Mark components such as advanced charts or dark-mode controls as `Out of Scope`.

## 43. Decision register

Create a component decision register using IDs:

```text
CMP-DEC-001
CMP-DEC-002
...
```

Include decisions for:

* Shared component system across roles.
* Three-size model.
* Composition over excessive variants.
* Expanded sidebar as MVP default.
* Sidebar collapse deferred.
* Icon library non-blocking.
* AI icon semantic definition.
* AI exact glyph deferred.
* AI border validation.
* AI accepted-state transition.
* FormField composition.
* Table versus list behavior.
* Light theme only.
* Marketing versus platform contextual variants.
* Semantic status independence.
* WCAG 2.1 AA.
* No enterprise data grid.
* No component code in this artifact.

Use statuses:

* `Approved`.
* `Derived`.
* `Recommended`.
* `Provisional`.
* `Deferred`.
* `Out of Scope`.

Do not claim Product Owner approval where none exists.

## 44. Deferred decisions

Separate by future artifact or phase.

### Icon selection

Include:

* Exact icon library.
* Exact sparkle glyph.
* Final icon mapping.

State that this is non-blocking for Component Foundations but required before final Figma binding and production implementation.

### Figma component library

Include:

* Exact variant-property names.
* Exact component-set organization.
* Final responsive compositions.
* Final visual QA.

### Storybook and frontend implementation

Include:

* React APIs.
* Prop names.
* Composition APIs.
* Tailwind classes.
* Accessibility-library selection.
* Form-control implementation strategy.
* Exact date-picker library.
* Exact select implementation.
* Exact modal primitives.
* Icon-library package.

### Post-MVP

Include:

* Collapsed sidebar.
* Persisted sidebar preference.
* Dark mode.
* Role themes.
* Advanced data grid.
* Complex charts.
* Custom illustration system.
* High-density mode.
* Advanced motion.
* Native mobile components.

## 45. Risks and mitigations

Include at minimum:

| Risk | Impact | Mitigation | Owner |

Consider:

* Component variant explosion.
* Hardcoded values bypassing tokens.
* Inconsistent role-specific copies of components.
* AI suggestions appearing confirmed.
* AI border contrast appearing weak.
* Exact AI glyph delaying Figma.
* Icon-library drift.
* Collapsed sidebar scope creep.
* Tables failing on mobile.
* Long translations overflowing.
* Too many cards.
* Accessibility added after implementation.
* Marketing styling leaking into operational forms.
* Toast used for critical errors.
* Hidden labels.
* Ambiguous currency symbols.
* Figma and code component drift.

## 46. Open questions

Include only genuinely unresolved questions.

Do not reopen approved decisions.

For each question include:

| ID | Question | Impact | Owner | Required before | Blocking |

At minimum evaluate whether these remain unresolved:

* Exact icon library.
* Exact AI sparkle glyph.
* Final visual validation of `color.ai.border`.
* Exact date-control implementation.
* Exact select or combobox primitive.
* Exact accessibility primitive library.

Do not mark them blocking unless implementation truly cannot proceed.

When no blocking questions remain, state:

```text
No existen preguntas bloqueantes para iniciar Figma components, Storybook planning o frontend component implementation.
```

## 47. Approval checklist

Include:

* [ ] UI Foundations were read completely.
* [ ] Design Tokens were read completely.
* [ ] Component principles are defined.
* [ ] Component architecture is defined.
* [ ] Naming conventions are defined.
* [ ] Standard specification template is defined.
* [ ] Global state model is defined.
* [ ] Global size model is defined.
* [ ] Button foundations are defined.
* [ ] Form foundations are defined.
* [ ] Navigation foundations are defined.
* [ ] Expanded sidebar is the MVP default.
* [ ] Collapsed sidebar is deferred.
* [ ] Feedback components are defined.
* [ ] Data-display foundations are defined.
* [ ] Overlay foundations are defined.
* [ ] AI component family is defined.
* [ ] AI content supports human-in-the-loop.
* [ ] Exact AI glyph is not treated as blocking.
* [ ] AI border requires visual validation.
* [ ] Icon requirements are defined independently from a library.
* [ ] Icon-library selection remains non-blocking.
* [ ] Marketing components are defined.
* [ ] Role-specific usage reuses shared components.
* [ ] Responsive behavior is documented.
* [ ] WCAG 2.1 AA requirements are mandatory.
* [ ] Four locales are considered.
* [ ] Currency behavior is respected.
* [ ] Token consumption is documented.
* [ ] Figma guidance is included.
* [ ] Frontend guidance is included.
* [ ] Testing guidance is included.
* [ ] Component inventory is included.
* [ ] Decision register is included.
* [ ] Deferred decisions are separated.
* [ ] No React code was generated.
* [ ] No Tailwind code was generated.
* [ ] No Storybook stories were generated.
* [ ] No Figma components were generated.
* [ ] No dark-mode components were introduced.
* [ ] No role themes were introduced.
* [ ] No third-party component designs were copied.
* [ ] No post-MVP functionality was introduced.

## 48. Final recommendation

Conclude with:

* Whether Component Foundations are ready for Product Owner, UX, and frontend review.
* Whether they are sufficient to begin Figma component construction.
* Whether they are sufficient to plan Storybook.
* Whether they are sufficient to guide frontend component implementation.
* Number of blocking questions.
* Number of provisional decisions.
* Non-blocking recommendations.
* Recommended next artifact.

---

## Component Specification Depth

Keep component specifications at foundation level.

For each component define:

* Purpose.
* Anatomy.
* Core variants.
* Relevant states.
* Behavior.
* Responsive behavior.
* Accessibility.
* Tokens.
* Usage.
* Anti-patterns.

Do not define:

* Every prop.
* Every icon.
* Every spacing measurement.
* Every possible state combination.
* Every business-field variation.
* Every Figma property.
* Every Storybook story.
* Every test case.

Detailed implementation contracts belong to later artifacts or development tasks.

---

## Classification Rules

Use these classifications consistently:

| Classification | Meaning                                                                |
| -------------- | ---------------------------------------------------------------------- |
| `Approved`     | Explicitly approved by Product Owner, UI Foundations, or Design Tokens |
| `Derived`      | Directly derived from approved requirements or architecture            |
| `Recommended`  | Selected as the simplest suitable MVP approach                         |
| `Provisional`  | Usable now but requiring visual or implementation validation           |
| `Deferred`     | Intentionally postponed                                                |
| `Out of Scope` | Excluded from MVP                                                      |

Do not classify the exact icon library or sparkle glyph as `Approved` unless an approved source explicitly confirms it.

---

## Quality Rules

The artifact must:

* Be internally consistent.
* Remain proportional to the MVP.
* Reuse Design Tokens.
* Avoid hardcoded values.
* Avoid component duplication.
* Avoid role-specific themes.
* Avoid dark mode.
* Avoid enterprise-scale component complexity.
* Preserve marketing versus platform distinction.
* Preserve human-in-the-loop AI behavior.
* Support four locales.
* Support currency display without conversion.
* Treat accessibility as mandatory.
* Define responsive behavior.
* Define system states.
* Define empty and error states.
* Clearly separate foundations from implementation.
* Clearly mark provisional and deferred decisions.
* Avoid repeating the complete UI Foundations or Design Tokens documents.
* Avoid generic component theory.
* Avoid speculative components.
* Avoid out-of-scope product functionality.

---

## Prohibited Output

Do not generate:

* React.
* JSX.
* TSX.
* TypeScript component interfaces.
* CSS.
* SCSS.
* Tailwind classes.
* Tailwind configuration.
* CSS custom-property files.
* JSON token files.
* Storybook stories.
* Figma files.
* Figma plugin files.
* Production component APIs.
* Test code.
* Development tasks.
* User stories.
* API changes.
* Database changes.
* Dark-mode variants.
* Role-specific themes.
* Advanced chart components.
* Enterprise data grids.
* Native-mobile components.
* Third-party branding.
* Third-party assets.
* Invented product functionality.
* Invented route structures.
* Invented marketing content.

---

## Completion Criteria

The task is complete only when:

1. `docs/ux-ui/EventFlow-Component-Foundations.md` has been created.
2. UI Foundations were read completely.
3. Design Tokens were read completely.
4. All available required sources were read.
5. Missing sources were reported without invented content.
6. Component architecture is defined.
7. Naming conventions are defined.
8. State and size models are defined.
9. Foundation components are specified.
10. Form components are specified.
11. Navigation components are specified.
12. Feedback components are specified.
13. Data-display components are specified.
14. Overlay components are specified.
15. AI recommendation components are specified.
16. Marketing components are specified.
17. Role-specific usage guidance reuses shared components.
18. Sidebar collapse remains non-mandatory.
19. Icon requirements are independent from a specific library.
20. Exact icon-library selection remains non-blocking.
21. Exact AI sparkle glyph remains non-blocking.
22. AI border validation is documented.
23. AI border promotion to `color.violet.600` is allowed only through token adjustment.
24. Accessibility requirements are mandatory.
25. Responsive behavior is documented.
26. Four locales are considered.
27. Currency behavior is respected.
28. Token-consumption matrix is included.
29. Figma guidance is included.
30. Frontend guidance is included.
31. Testing guidance is included.
32. Component inventory is included.
33. Decision register is included.
34. Deferred decisions are separated.
35. No production code is generated.
36. No Figma components are generated.
37. No Storybook stories are generated.
38. No dark-mode variants are generated.
39. No role-specific themes are generated.
40. The final recommendation indicates readiness for the next phase.

---

## Final Execution Instruction

Read all sources first.

Resolve conflicts using the declared authority hierarchy.

Generate the complete artifact directly at:

```text
docs/ux-ui/EventFlow-Component-Foundations.md
```

Do not ask for clarification when approved sources provide enough information.

When a genuinely blocking ambiguity exists:

1. Record it under `Open questions`.
2. Mark it as blocking.
3. Do not invent the decision.
4. Complete all unaffected sections.

At the end of the execution, report only:

```text
Artifact created: docs/ux-ui/EventFlow-Component-Foundations.md
Status: Ready for Product Owner, UX, and frontend review
Blocking questions: <number>
Provisional decisions: <number>
Non-blocking recommendations: <number>
Next recommended artifact: <artifact name and path>
```