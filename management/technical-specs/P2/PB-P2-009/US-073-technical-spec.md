# Technical Specification — US-073: Bandeja unificada de notificaciones vendor

## 1. Metadata

| Field                                | Value                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-073                                                                                              |
| Source User Story                    | `management/user-stories/US-073-vendor-quote-rejected-notification-surface.md`                      |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-073-decision-resolution.md`                        |
| Priority                             | P2 (Must Have — Decisión PO 8.1 #13)                                                                |
| Backlog ID                           | PB-P2-009                                                                                           |
| Backlog Title                        | Surface vendor de notificaciones de rechazo/expiración → Bandeja unificada vendor                    |
| Backlog Execution Order              | 9 (noveno ítem de P2)                                                                               |
| User Story Position in Backlog Item  | 1 de 1                                                                                              |
| Related User Stories in Backlog Item | US-073                                                                                              |
| Epic                                 | EPIC-NOT-001                                                                                        |
| Backlog Item Dependencies            | US-054 (aprobada), US-068 (Ready for Sprint Planning), US-070 (Ready for Sprint Planning), US-071 (aprobada), US-072 (aprobada) |
| Feature                              | Bandeja unificada de notificaciones vendor con destacado visual por tipo                             |
| Module / Domain                      | Notifications                                                                                       |
| User Story Status                    | Approved with Minor Notes                                                                           |
| Backlog Alignment Status             | Found                                                                                               |
| Technical Spec Status                | Ready for Task Breakdown                                                                            |
| Created Date                         | 2026-07-07                                                                                          |
| Last Updated                         | 2026-07-07                                                                                          |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P2-009 — Surface vendor de notificaciones de rechazo/expiración → Bandeja unificada vendor** (P2, Must Have — Decisión PO 8.1 #13). Depende de PB-P1-032 (US-054) upstream y de US-071/US-072 (patrón + mutations aprobados). Con D1 se amplía a bandeja unificada (cierra gap identificado en US-068 D4 y US-070 D4).

### Execution Order Rationale

Se implementa después de US-071 (patrón aprobado), US-072 (mark-as-read aprobada) y US-054 (upstream aprobada). US-068 y US-070 (Ready for Sprint Planning) pueden ir en paralelo. US-073 es principalmente extensión frontend + 2 líneas del resolver backend.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                                                          | Suggested Order |
| ---------- | ----------------------------------------------------------------------------- | --------------- |
| US-073     | Bandeja unificada vendor con reuso máximo del patrón US-071 y componentes US-072 | 1               |

---

## 3. Executive Technical Summary

Implementar la bandeja unificada del vendor mediante:

1. **Frontend (mayoría del alcance)**:
   - Verificar/crear `apps/web/app/(authenticated)/vendor/layout.tsx` (D6).
   - Montar el `NotificationsBell` de US-071 en el vendor layout header.
   - Extender el `NotificationItem` de US-071 con prop `variant` derivada del mapping `TYPE_TO_VARIANT` (D4) — combinando color + icono + texto para NFR-A11Y-005.
   - Reuso 1:1 de `MarkAsReadButton` y `MarkAllAsReadButton` (US-072 aprobada).
   - Extender i18n con `aria-label` por variant en 4 locales.

2. **Backend (mínimo)**:
   - Extender `NotificationLinkResolver.LINK_STRATEGY_BY_TYPE` con 2 estrategias adicionales: `quote_rejected` y `quote_expired` → `/vendor/quotes/{payload.quoteId}` (D2).
   - Regresión sobre callers existentes (US-068/US-069/US-070/US-071) para retrocompatibilidad.

3. **Sin cambios**:
   - Sin migración.
   - Sin nuevos endpoints (reuso 1:1 del canonical `GET /api/v1/notifications` extendido por US-071).
   - Sin nuevas mutations (reuso 1:1 de US-072).
   - Sin realtime.

---

## 4. Scope Boundary

### In Scope

* Frontend: vendor layout (verificar/crear), montaje de `NotificationsBell`, extensión de `NotificationItem` con `variant`, i18n `aria-label` por variant × 4 locales, tests A11Y + E2E + snapshot.
* Backend: extensión del `NotificationLinkResolver` con 2 estrategias adicionales.
* Documentation Alignment: 5 ítems.

### Out of Scope

* Cambios al endpoint canonical `GET /api/v1/notifications` (ya extendido por US-071).
* Cambios a las mutations de US-072.
* Filtros por tipo desde UI (Future).
* Realtime WebSocket/SSE (Future).
* Nuevos hooks TanStack (reuso de US-071 y US-072).
* Cambios al schema Prisma.
* Notifs de otros roles (aislamiento server-side impide cross-rol).
* Nuevas mutations en `NotificationRepository`.

### Explicit Non-Goals

* Introducir cambios a la firma existente del `NotificationLinkResolver` (que ya fue extendida por US-070 D3 con `{recipientRole}`).
* Cambiar el orden default o las query keys de US-071.
* Cambiar el patrón `PATCH single` + `POST mark-all-read` de US-072.

---

## 5. Architecture Alignment

### Backend Architecture

* Módulo `notifications` (`docs/14 §443`).
* Reuso del `NotificationLinkResolver` de US-071 (extensión con 2 estrategias).
* Sin nuevos use cases, controllers, ni middleware.

### Frontend Architecture

* Next.js + TanStack Query + Tailwind + next-intl (`docs/15`).
* Vendor layout `apps/web/app/(authenticated)/vendor/layout.tsx` (D6).
* Client Components (mismo patrón que US-071).
* MSW para contract tests.

### Database Architecture

* Sin cambios. Reuso del contrato de US-071.

### API Architecture

* Sin cambios. Reuso del canonical `docs/16 §34.2` extendido por US-071.

### AI / PromptOps Architecture

`No aplica`.

### Security Architecture

* Reuso del `NotificationOwnerPolicy` (US-071 SEC-02).
* Aislamiento BR-NOTIF-005 server-side.
* No-revelación 404 heredada de US-072.

### Testing Architecture

* Vitest + Testing Library + MSW (frontend).
* Playwright + Axe (E2E + A11Y con verificación anti color-only NFR-A11Y-005).
* Regresión backend para el resolver.

---

## 6. Functional Interpretation

| Acceptance Criterion              | Technical Interpretation                                                                                                          | Impacted Layer(s)               |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| AC-01 — Bandeja unificada         | Reuso del hook `useNotifications` de US-071. `NotificationItem` extendido con `variant`.                                          | Frontend                         |
| AC-02 — Deep link por tipo        | Extensión del `NotificationLinkResolver` con `quote_rejected` y `quote_expired`. Frontend usa `link` server-side.                 | Backend (resolver), Frontend    |
| AC-03..AC-05                      | Heredados de US-071 sin cambios.                                                                                                   | Backend (existente), Frontend    |
| AC-06 — Empty/Loading/Error       | Heredado US-071.                                                                                                                    | Frontend                         |
| AC-07 — A11Y del dropdown         | Heredado US-071 + variant con color + icono + texto (D4, NFR-A11Y-005).                                                            | Frontend                         |
| AC-08 — i18n                      | Extensión con `aria-label` por variant × 4 locales.                                                                                | Frontend                         |
| AC-09 — Performance               | Heredado US-071.                                                                                                                    | Backend (existente)              |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* Módulo `notifications` (`docs/14 §443`).

### Use Cases / Application Services

* **Sin cambios** en `ListMyNotificationsUseCase` (US-071).
* **Sin cambios** en `MarkNotificationAsReadUseCase` / `MarkAllNotificationsAsReadUseCase` (US-072).
* Única extensión: `NotificationLinkResolver` (servicio) con 2 filas nuevas en su tabla `LINK_STRATEGY_BY_TYPE`.

### Controllers / Routes

`No aplica` — sin nuevas rutas.

### DTOs / Schemas

* Sin cambios al `NotificationResponseDto`.

### Repository / Persistence

* Sin cambios.

### Validation Rules

* Reuso de US-071 (Zod schemas de query params).

### Error Handling

* Reuso de US-071/US-072.

### Transactions

* No aplica (read-only).

### Observability

* Reuso.

### Detalle de la extensión del resolver

```ts
// docs/14 §Notifications — NotificationLinkResolver (US-071 D3 + extensiones)
const LINK_STRATEGY_BY_TYPE: Record<NotificationType, LinkStrategy> = {
  // ... estrategias existentes de US-071, US-068, US-069, US-070 ...

  // NUEVO en US-073 (D2):
  quote_rejected: (n, { recipientRole } = {}) => {
    const quoteId = n.payload?.quoteId;
    if (!quoteId || !isValidUuid(quoteId)) return null;
    // TODO: opcionalmente verificar existencia via QuoteRepository.exists(quoteId)
    return `/vendor/quotes/${quoteId}`;
  },
  quote_expired: (n, { recipientRole } = {}) => {
    const quoteId = n.payload?.quoteId;
    if (!quoteId || !isValidUuid(quoteId)) return null;
    return `/vendor/quotes/${quoteId}`;
  },
};
```

El parámetro `recipientRole` (agregado por US-070 D3) se ignora para `quote_rejected` y `quote_expired` porque el receptor es siempre vendor.

---

## 8. Frontend Technical Design

### Routes / Pages

* `apps/web/app/(authenticated)/vendor/layout.tsx` — verificar existencia (D6):
  * **Si existe**: agregar `NotificationsBell` como slot en el header.
  * **Si NO existe**: crear layout mínimo simétrico al organizer (US-071):
    ```tsx
    export default function VendorLayout({ children }) {
      return (
        <div>
          <header>
            {/* branding + user menu + <NotificationsBell /> */}
          </header>
          <main>{children}</main>
        </div>
      );
    }
    ```
  * Ratificar path exacto durante implementación (`docs/15 §Client Components §Vendor Layout` puede tener recomendaciones).

### Components

* **Reuso 1:1 de US-071**:
  * `NotificationsBell` (botón + badge).
  * `NotificationsDropdown` (contenedor accesible).
  * `NotificationsList` (renderiza `NotificationItem[]`).
  * `NotificationsEmptyState`, `NotificationsErrorBanner`, `UnreadBadge`.
* **Extensión de `NotificationItem`** (única modificación frontend):
  * Recibir prop opcional `variant?: 'destructive' | 'warning' | 'info' | 'success' | 'neutral'`.
  * Si no se provee, derivar del `notification.type` mediante `TYPE_TO_VARIANT`:
    ```ts
    export const TYPE_TO_VARIANT: Record<NotificationType, ItemVariant> = {
      quote_rejected: 'destructive',
      quote_expired: 'warning',
      quote_request_received: 'info',
      booking_confirmed: 'success',
      task_due_soon: 'info',
      review_received: 'neutral',
      vendor_approved: 'success',
      vendor_rejected: 'destructive',
    };
    export function getVariantForType(type: string): ItemVariant {
      return TYPE_TO_VARIANT[type as NotificationType] ?? 'neutral';
    }
    ```
  * Renderizar color de fondo/borde según design tokens del variant + icono acompañante + texto complementario (`title`/`body` ya localizados).
  * `aria-label` combinado: `t('notifications.item.aria', { variant: t(`notifications.variants.${variant}.aria`) })`.
* **Reuso 1:1 de US-072**:
  * `MarkAsReadButton` por item.
  * `MarkAllAsReadButton` en el footer del dropdown.

### Forms

`No aplica`.

### State Management

* **Reuso 1:1 de US-071**:
  * `useNotifications({ status, page, pageSize })` con las mismas query keys canónicas.
  * `useUnreadNotificationsCount()`.
* **Reuso 1:1 de US-072**:
  * `useMarkNotificationAsRead()`.
  * `useMarkAllNotificationsAsRead()`.
* Sin nuevos hooks en US-073.

### Data Fetching

* Reuso de `notificationsApi.list` (US-071) y `notificationsApi.markAsRead` + `markAllAsRead` (US-072).

### Loading / Empty / Error / Success States

* Heredados 1:1 de US-071.

### Accessibility

* Cumplir NFR-A11Y-001..005.
* **Especialmente NFR-A11Y-005**: variant NO depende sólo del color; combina color + icono + texto complementario.
* Verificación con Axe.

### i18n

* **Reuso** de catálogos de US-071 (empty, error, "Cargar más", "Marcar leída", etc.).
* **Extensión**: keys nuevas por variant:
  ```
  notifications.variants.destructive.aria
  notifications.variants.warning.aria
  notifications.variants.info.aria
  notifications.variants.success.aria
  notifications.variants.neutral.aria
  ```
  × 4 locales = 20 keys nuevas.
* `title` y `body` del DTO llegan localizados server-side (patrón US-034 D6).

---

## 9. API Contract Design

`No aplica` — reuso 1:1 del contrato canonical `docs/16 §34.2` extendido por US-071.

Documentation Alignment: tabla `link generation by type` de `docs/16 §34.3` se amplía con 2 filas (D2).

---

## 10. Database / Prisma Design

### Models Impacted

Sólo lectura vía el endpoint existente. Sin escrituras nuevas.

### Fields / Columns

Sin cambios.

### Relations

Sin cambios.

### Indexes

Reuso.

### Constraints

Sin cambios.

### Migrations Impact

**Cero migraciones.**

### Seed Impact

* Reuso del seed de US-054 (que emite `quote_rejected`/`quote_expired`).
* Recomendado: seed adicional con al menos 1 notif de cada tipo relevante para el vendor demo (`quote_request_received`, `booking_confirmed`) para permitir prueba visual de cada variant.

---

## 11. AI / PromptOps Design

`No aplica`.

---

## 12. Security & Authorization Design

### Authentication

* Session middleware existente.

### Authorization

* Reuso de `NotificationOwnerPolicy` (US-071 SEC-02).

### Ownership Rules

* Server-side `WHERE user_id = session.userId` (US-071 use case).

### Role Rules

* Vendor puede ver sus notifs (incluyendo tipos organizer si por bug backend crea alguna con `user_id=vendor.user_id`; el aislamiento server-side lo previene).

### Negative Authorization Scenarios

* Sin sesión → 401.
* Admin → 200 con sólo sus notifs.
* Query param inválido → 400.

### Audit Requirements

* No aplica.

### Sensitive Data Handling

* Sin PII en `payload` (heredado de la política de US-068/US-069/US-070).
* `Quote.total` protegido en payload de US-054/US-068/US-069/US-070.

---

## 13. Testing Strategy

### Unit Tests

* Backend:
  * UT-01: `NotificationLinkResolver` para `quote_rejected` con `payload.quoteId` válido → URL correcta.
  * UT-02: `NotificationLinkResolver` para `quote_expired` con `payload.quoteId` válido → URL correcta.
  * UT-03: `NotificationLinkResolver` retorna `null` si `payload.quoteId` inválido/ausente.

* Frontend:
  * UT-04: `getVariantForType('quote_rejected')` → `'destructive'`.
  * UT-05: `getVariantForType('unknown_type')` → `'neutral'` (fallback).
  * UT-06: `NotificationItem` con `variant='destructive'` renderiza clase CSS + icono + `aria-label` correctos.
  * UT-07: `NotificationItem` con `link=null` deshabilita CTA (heredado US-071 UT-09).

### Integration Tests

* IT-01: `GET /api/v1/notifications` con seed vendor demo → retorna 4 tipos con `link` correcto por tipo (regresión del resolver).
* IT-02: Aislamiento — vendor B no ve notifs de vendor A (heredado US-071 IT-03; regresión).

### API Tests

Cubiertos por IT.

### E2E Tests

* E2E-01 (Playwright): login como vendor demo → abrir campanita → ver 4 items con variants distintos → click en `quote_rejected` → aterriza en `/vendor/quotes/{id}`.
* E2E-02: click en `quote_expired` → aterriza en `/vendor/quotes/{id}`.

### Security Tests

* SEC-T-01: heredado de US-071 (aislamiento) + US-072 (no-revelación 404); regresión.

### Accessibility Tests

* A11Y-01 (Playwright + `@axe-core/playwright`): dropdown vendor abierto sin violaciones críticas.
* A11Y-02: **anti color-only** — cada variant tiene icono + texto complementario visible (NFR-A11Y-005). Test con simulación grayscale falla si un variant sólo se distingue por color.
* A11Y-03: navegación por teclado.

### AI Tests

`No aplica`.

### Seed / Demo Tests

* SEED-T-01: tras seed, vendor demo tiene al menos 1 notif de cada tipo relevante (`quote_rejected`, `quote_expired`, `quote_request_received`, `booking_confirmed`).

### Regression Tests (crítico por extensión del resolver)

* REG-01: callers existentes del `NotificationLinkResolver` no se rompen:
  * `task_due_soon` (US-071) → link organizer.
  * `quote_request_received` (US-068) → link vendor.
  * `quote_received` (US-069) → link organizer.
  * `booking_confirmed` (US-070) → link organizer y vendor según `recipientRole`.

### Contract Tests

* MSW contract test: `NotificationResponseDto` con `type ∈ {quote_rejected, quote_expired}` y `link` correcto.

### CI Checks

* Lint, type-check, tests. Cobertura ≥ 50% del módulo `notifications`.

---

## 14. Observability & Audit

### Logs

* Reuso.

### Correlation ID

* Middleware estándar.

### AdminAction

`No aplica`.

### Error Tracking

* Heredado.

### Metrics

* Sin métricas dedicadas.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Reuso del seed de US-054, US-068, US-070.
* Recomendado: garantizar diversidad de tipos para el vendor demo.

### Demo Scenario Supported

* Login como vendor demo → abrir campanita → ver al menos 4 items con variants distintos.

### Reset / Isolation Notes

* Sin cambios al `SeedResetJob`.

---

## 16. Documentation Alignment Required

| Document / Source                                | Conflict                                                                                              | Current Decision                                                                                | Recommended Action                                                                                                                    | Blocks Implementation? |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `docs/16 §34.3` (tabla `link generation by type`) | Faltan filas `quote_rejected` y `quote_expired`.                                                       | D2 extiende la tabla.                                                                            | Agregar 2 filas: `quote_rejected` y `quote_expired` → `/vendor/quotes/{payload.quoteId}`.                                            | No                     |
| PB-P2-009 `Description`                          | Dice "tipos `quote_rejected` y `quote_expired`"; D1 amplía a unificada.                                | Bandeja unificada (D1).                                                                          | Actualizar `Description`.                                                                                                             | No                     |
| PB-P2-009 Acceptance Summary                     | Dice "Filtros por tipo"; D3 los mueve a Future.                                                        | Destacado visual por tipo (D4).                                                                  | Reformular Acceptance Summary.                                                                                                        | No                     |
| PB-P2-009 Traceability                           | Verificar completitud.                                                                                | US-073 refinada declara IDs canónicos.                                                          | Ampliar Traceability con `FR-QUOTE-009/010, FR-NOTIF-001/002/005, UC-NOTIF-001, UC-QUOTE-009/010, BR-NOTIF-002/005, NFR-*`.       | No                     |
| Coverage Matrix                                   | Declara US-073 como "Surface US-054".                                                                 | D1 amplía a bandeja vendor unificada.                                                            | Actualizar la matriz.                                                                                                                 | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                                     | Impact                              | Mitigation                                                                                                                        |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Extensión del `NotificationLinkResolver` rompe callers existentes                                        | Regresión US-068/069/070/071        | REG-01 tests explícitos; parámetro `recipientRole` opcional se ignora para los nuevos types.                                       |
| Vendor layout NO existe                                                                                  | Task de foundation adicional        | D6 delega a Tech Lead durante implementación; crear layout mínimo simétrico al organizer.                                          |
| Payload de US-054 no incluye `quoteId`                                                                    | Deep link retorna null               | Ratificar durante implementación; US-054 aprobada debe incluir `payload.quoteId`.                                                  |
| Variant `neutral` fallback confunde al usuario para tipos futuros                                         | UX pobre                             | Mapping declarativo con default explícito + copy genérico "Notificación" localizado.                                              |
| Color-only signaling                                                                                     | NFR-A11Y-005 fail                    | A11Y-02 test explícito con simulación grayscale.                                                                                    |
| Ventana 60s entre tabs (heredado US-072)                                                                 | UX pobre multi-tab                   | Riesgo aceptado (heredado).                                                                                                         |

---

## 18. Implementation Guidance for Coding Agents

### Archivos / carpetas impactados

```
backend/
  src/
    modules/
      notifications/
        application/
          services/
            notification-link-resolver.ts               # extender (2 filas nuevas + tests regresión)
            notification-link-resolver.spec.ts          # extender

apps/web/
  app/
    (authenticated)/
      vendor/
        layout.tsx                                       # verificar/crear (D6)
  components/
    notifications/
      NotificationItem.tsx                                # extender con prop `variant`
      variantMapping.ts                                    # nuevo (TYPE_TO_VARIANT + getVariantForType)
      variantMapping.spec.ts                               # nuevo
  messages/
    en/notifications.json                                # extender con variants.*.aria
    es-LATAM/notifications.json                          # idem
    es-ES/notifications.json                             # idem
    pt/notifications.json                                # idem
tests/
  e2e/
    notifications-vendor-inbox.spec.ts                    # E2E-01, E2E-02
  regression/
    notification-link-resolver.regression.spec.ts         # REG-01
```

### Orden de implementación recomendado

1. Backend: extender `NotificationLinkResolver` con `quote_rejected` y `quote_expired`.
2. Backend: REG-01 tests de regresión sobre callers existentes.
3. Frontend: crear `variantMapping.ts` (`TYPE_TO_VARIANT` + `getVariantForType`).
4. Frontend: extender `NotificationItem` con prop `variant` (backward compatible).
5. Frontend: extender i18n × 4 locales × 5 variants.
6. Frontend: verificar/crear vendor layout (D6).
7. Frontend: montar `NotificationsBell` en el vendor layout.
8. Testing: UT-01..UT-07 + IT-01..IT-02 + REG-01.
9. Testing: A11Y-01..A11Y-03 (anti color-only).
10. Testing: E2E-01..E2E-02 + contract MSW.
11. Testing: SEED-T-01.
12. Documentation Alignment (5 ítems).

### Decisiones que no deben reabrirse

* Bandeja unificada (D1) — cierre de gap.
* Deep links por tipo (D2).
* Sin filtros por tipo (D3).
* Mapping `TYPE_TO_VARIANT` con color + icono + texto (D4).
* Reuso 1:1 de US-072 (D5).
* Vendor layout como task de foundation (D6).

### Lo que no se debe implementar

* Nuevos endpoints.
* Nuevas mutations.
* Filtros por tipo desde UI.
* Realtime WebSocket.
* Cambios al `NotificationResponseDto`.
* Cambios al schema Prisma.
* Nuevos hooks TanStack (reuso).

### Asunciones a preservar

* `NotificationOwnerPolicy` disponible (US-071).
* Query keys canónicas de US-071.
* Firma del `NotificationLinkResolver` con `{recipientRole}` opcional (US-070 D3) — retrocompatible.
* Payload de US-054 incluye `quoteId` (a ratificar).

---

## 19. Task Generation Notes

### Suggested task groups

1. Backend — extensión del resolver + regresión.
2. Frontend — mapping variant + extensión `NotificationItem`.
3. Frontend — i18n × 4 locales.
4. Frontend — vendor layout (verificar/crear).
5. Frontend — montaje del `NotificationsBell`.
6. Testing — UT + IT + REG + A11Y + E2E + contract + SEED.
7. Documentation Alignment (5 ítems).

### Required QA tasks

* UT backend (resolver).
* UT frontend (mapping + item).
* IT backend (regresión).
* A11Y (anti color-only).
* E2E.
* Contract MSW.
* SEED verification.

### Required security tasks

* Reuso 1:1 de US-071/US-072; sin nueva superficie.

### Required seed/demo tasks

* Verificación en QA (SEED-T-01).

### Required documentation tasks

* 5 ítems (docs/16 §34.3 + PB-P2-009 Description + Acceptance Summary + Traceability + Coverage Matrix).

### Dependencies between tasks

```
Resolver ext → Regresión backend
Variant mapping → NotificationItem ext → i18n → Vendor layout → NotificationsBell montaje
NotificationItem ext → E2E + A11Y
```

### Consolidated tasks.md guidance

Opcional: PB-P2-009 tiene una sola US.

---

## 20. Technical Spec Readiness

| Check                                                    | Status |
| -------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec | Pass   |
| Product Backlog mapping found                            | Pass   |
| Decision Resolution reviewed if present                  | Pass   |
| Scope clear                                              | Pass   |
| Architecture alignment clear                             | Pass   |
| API impact clear                                         | N/A    |
| DB impact clear                                          | N/A    |
| AI impact clear                                          | N/A    |
| Security impact clear                                    | Pass   |
| Testing strategy clear                                   | Pass   |
| Ready for Development Task Breakdown                     | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

D1–D6 materializadas. Reuso máximo (patrón US-071 + componentes US-072 + upstream US-054/068/070). Sin migración, sin endpoint nuevo, sin schema change. Extensión mínima backend (2 filas del resolver) con regresión explícita. Frontend principalmente extensión de `NotificationItem` + variant mapping + vendor layout. Cierra el gap de bandeja vendor identificado en US-068 D4 y US-070 D4.

---

Technical Specification created: Yes
Path: `management/technical-specs/P2/PB-P2-009/US-073-technical-spec.md`
Status: Ready for Task Breakdown
Backlog ID: PB-P2-009
Execution Order: 9 (noveno ítem de P2)
Next step: Run `eventflow-user-story-to-development-tasks`.

Product Backlog mapping: Found (PB-P2-009, P2, posición 1 de 1).
Decision Resolution artifact used: Yes.
Documentation alignment warnings: 5 ítems no bloqueantes (§16).
