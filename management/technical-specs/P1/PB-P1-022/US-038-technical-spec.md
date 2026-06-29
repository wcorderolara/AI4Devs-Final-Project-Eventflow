# Technical Specification — US-038: Ver warning con delta y badges per-item cuando committed > total

## 1. Metadata

| Field                                | Value                                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| User Story ID                        | US-038                                                                                                                                                             |
| Source User Story                    | `management/user-stories/US-038-budget-overcommitted-warning.md`                                                                                                   |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-038-decision-resolution.md`                                                                                       |
| Priority                             | P1                                                                                                                                                                 |
| Backlog ID                           | PB-P1-022                                                                                                                                                          |
| Backlog Title                        | Warning de overcommit del presupuesto                                                                                                                              |
| Backlog Execution Order              | 40 (P0: 18 items + P1: 22 items)                                                                                                                                   |
| User Story Position in Backlog Item  | 1 de 1                                                                                                                                                              |
| Related User Stories in Backlog Item | US-038                                                                                                                                                              |
| Epic                                 | EPIC-BUD-001 — Budget Management & Currency                                                                                                                        |
| Backlog Item Dependencies            | PB-P1-020 (US-035 productor, US-036 mutaciones)                                                                                                                    |
| Feature                              | Warning de sobrecompromiso (delta + badges per-item)                                                                                                                |
| Module / Domain                      | Budget                                                                                                                                                              |
| User Story Status                    | Approved with Minor Notes                                                                                                                                          |
| Backlog Alignment Status             | Found                                                                                                                                                              |
| Technical Spec Status                | Ready for Task Breakdown                                                                                                                                            |
| Created Date                         | 2026-06-27                                                                                                                                                          |
| Last Updated                         | 2026-06-27                                                                                                                                                          |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-022 — Warning de overcommit del presupuesto` cierra el detalle del indicador de sobrecompromiso enriqueciendo el contrato server-side ya entregado por `PB-P1-020 / US-035` (`summary.over_committed`). Aporta delta + badges per-item + tolerancia adaptativa por moneda. Sin endpoint nuevo, sin migraciones. Consume el catálogo `Currency` para `decimal_places`.

### Execution Order Rationale

US-038 va después de US-035 y US-036:
1. US-035 entregó el `GetBudgetUseCase`, el DTO de response, los componentes `BudgetSummary`, `BudgetItemsTable`, `OvercommitWarning` y la query key TanStack `['event', eventId, 'budget']`.
2. US-036 entregó el patrón de invalidación tras mutaciones (PATCH/POST/DELETE) que disparan el cambio del warning.
3. US-039 (sync de `committed` por BookingIntent) consume el mismo cache; US-038 es transparente a su flujo.

PB-P1-022 ocupa la posición 40 en el Product Backlog Prioritized.

### Related User Stories in Same Backlog Item

| User Story                                              | Role in Backlog Item                                                            | Suggested Order |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------- |
| US-038 — Warning con delta + badges per-item             | Extensión incremental del contrato server-side de US-035                         | 1               |

---

## 3. Executive Technical Summary

US-038 extiende el `GetBudgetUseCase` (US-035) con cálculo de tolerancia adaptativa (`tolerance = 10^(-currency.decimal_places)`) y tres campos nuevos en el response (`summary.overcommitted_amount`, `items[].over_committed`, `items[].overcommitted_amount`). El cálculo se hace en la misma transacción de lectura del use case existente. Frontend extiende `BudgetSummary`, `BudgetItemsTable` y `OvercommitWarning` (US-035) con: render del delta debajo del banner, badge accesible per-fila con `aria-label` localizado, y CTA único "Editar items" con scroll + focus a la primera fila `over_committed=true`. Backend introduce un nuevo port `CurrencyReadPort` (en `modules/budget`) con adapter en `modules/catalog` para resolver `decimal_places`; fallback defensivo a `decimal_places=2` con log warning. Logger `budget.viewed` (US-035) se extiende con `overcommitted_amount` y `over_committed_items_count`. Sin migraciones, sin nuevos endpoints, sin breaking changes (campos nuevos siempre presentes con `0` por default). Reuso íntegro de policies/guards de US-035.

---

## 4. Scope Boundary

### In Scope

* Extensión de `GetBudgetUseCase` con cálculo de `tolerance`, `overcommitted_amount` (summary y per-item), `over_committed` (per-item).
* `CurrencyReadPort` (nuevo en `modules/budget`) con adapter en `modules/catalog` para `findByCode(code): { decimal_places }`.
* Extensión del DTO Zod del response (`BudgetSummaryDto` y `BudgetItemDto` de US-035) con campos nuevos.
* Extensión de `BudgetSummary`, `BudgetItemsTable`, `OvercommitWarning` (US-035) con render del delta, badges y CTA.
* Hook `useEventBudget` (US-035) ya consume los campos extendidos (sin cambios en el contrato del hook).
* Anchor + focus management para CTA "Editar items".
* i18n con 4 locales: claves `budget.overcommit.delta_label`, `budget.overcommit.item_badge`, `budget.overcommit.item_aria_label`, `budget.overcommit.cta_edit_items`.
* Logger estructurado extendido.
* Tests unit/integration/E2E/perf/a11y/contract.

### Out of Scope

* Endpoint nuevo (reuso de `GET /api/v1/events/:eventId/budget`).
* Persistencia del flag/delta en BD (es derivado).
* Bloqueo de gastos (`BR-BUDGET-004` warning sin bloqueo).
* CTA "Ajustar total" (descartada por D1 de US-035: `total` es derivado).
* Conversión FX / multi-moneda (`BR-BUDGET-007`).
* Cache server-side adicional.
* Métricas Prometheus nuevas (reuso del histogram de US-035).
* Cambios estructurales al schema (`budget`, `budget_items`, `currencies`).

### Explicit Non-Goals

* No introducir cálculos client-side (consistente con US-035 VR-05 y US-038 VR-01).
* No exponer la tolerancia en el response (es detalle de implementación; el cliente recibe campos finales).
* No modificar el `OvercommitWarning` para reemplazar el copy existente; solo agregar el delta debajo.

---

## 5. Architecture Alignment

### Backend Architecture

* **Stack**: Node.js + Express + TypeScript + Prisma + PostgreSQL.
* **Patrón**: Clean / Hexagonal.
* **Reuso**: `GetBudgetUseCase`, `BudgetReadRepository`, `BudgetSummaryDto`, `BudgetItemDto`, `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard` (todos entregados por US-035).
* **Nuevo**:
  * `CurrencyReadPort` en `modules/budget/ports/currency-read.port.ts`.
  * Adapter en `modules/catalog` o `modules/i18n-currency`.
  * Helper puro `calculateOvercommitFields({ summary, items, decimalPlaces })` para mantener el cálculo testeable.

### Frontend Architecture

* **Stack**: Next.js App Router + TypeScript + TanStack Query + Tailwind + next-intl.
* **Reuso de US-035**: ruta, query key, `useEventBudget`, componentes base.
* **Extensión**: `BudgetSummary`, `BudgetItemsTable`, `OvercommitWarning`; nuevo helper `useOvercommitFocus(eventId)` para gestionar foco/scroll.

### Database Architecture

* **Modelos**: `Budget`, `BudgetItem` (sin cambios). `Currency` (lookup read-only para `decimal_places`).
* **Sin migraciones**.
* **Índices**: reuso. `currencies.code` ya debería ser unique (PB-P0-001).

### API Architecture

* **Endpoint**: reuso de `GET /api/v1/events/:eventId/budget`.
* **Response extendido**: campos nuevos `summary.overcommitted_amount`, `items[].over_committed`, `items[].overcommitted_amount`. Cliente sin `aria-busy` adicional.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

* Reuso íntegro de US-035 SEC-01..05.
* No-revelación 404.
* Logging sin PII.

### Testing Architecture

* Vitest (unit + integration), Supertest (API), Playwright (E2E), jest-axe (A11Y), snapshot contractual contra OpenAPI.

---

## 6. Functional Interpretation

| Acceptance Criterion                                          | Technical Interpretation                                                                                                                                                                                                                                | Impacted Layer(s)                |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| AC-01 Shape extendido                                          | Extensión de los DTOs Zod del response con tres campos nuevos siempre presentes (default `0` o `false`).                                                                                                                                                  | BE, API                          |
| AC-02 Tolerancia adaptativa                                    | `GetBudgetUseCase` invoca `CurrencyReadPort.findByCode(event.currency_code)`. Si retorna `null` ⇒ fallback `decimal_places=2` + log warning. `tolerance = Math.pow(10, -decimal_places)`.                                                                  | BE                                |
| AC-03 Badge per-item accesible                                  | UI renderiza badge cuando `item.over_committed=true` con `role="status"` o `role="img"` + `aria-label` localizado interpolando `overcommitted_amount` con `Intl.NumberFormat`.                                                                            | FE                                |
| AC-04 CTA "Editar items"                                       | UI extiende `OvercommitWarning` con botón que dispara `useOvercommitFocus`. Helper localiza la primera fila `over_committed=true` por `data-attribute`, hace scrollIntoView({behavior:'smooth'}) y focus({preventScroll:true}).                            | FE                                |
| AC-05 Cache invalidation                                       | Heredado: hooks de US-036/US-039 ya invalidan `['event', eventId, 'budget']`. US-038 NO añade invalidadores.                                                                                                                                                | FE (regresión)                    |
| AC-06 Performance                                              | Cálculo de campos extendidos es O(N) sobre items + 1 lookup de currency. PERF-01 valida sin regresión vs US-035.                                                                                                                                          | BE, QA                            |
| AC-07 A11Y                                                     | `role="img"`/`role="status"`, `aria-label`, contraste AA, foco programático.                                                                                                                                                                              | FE                                |
| EC-01..06                                                      | Cubiertos por validaciones del use case + render condicional UI.                                                                                                                                                                                       | BE, FE                            |
| VR-01..04                                                      | Implementadas en UseCase + helper puro.                                                                                                                                                                                                                | BE, FE                            |
| SEC-01                                                         | Reuso íntegro.                                                                                                                                                                                                                                          | BE, SEC                           |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `modules/budget` (extensión).
* `modules/catalog` (o `modules/i18n-currency`): provee adapter para `CurrencyReadPort`.

### Use Cases / Application Services

* `GetBudgetUseCase` (US-035) — **extender**:
  1. Tras autorización + lectura del budget/items, invoca `currencyReadPort.findByCode(event.currency_code)`.
  2. Si retorna `null` ⇒ `decimal_places = 2` + emitir log warning `currency.decimal_places.missing`.
  3. Calcular `tolerance = Math.pow(10, -decimal_places)`.
  4. Invocar helper puro `calculateOvercommitFields({ summary, items, tolerance })` que retorna:
     - `summary.overcommitted_amount`.
     - `items[].over_committed` y `items[].overcommitted_amount`.
  5. Componer el response final con los campos nuevos.
  6. Emitir log `budget.viewed` extendido.

### Helper Puro

```ts
// apps/api/src/modules/budget/domain/overcommit-calculator.ts
export function calculateOvercommitFields(input: {
  totalPlanned: number;
  totalCommitted: number;
  items: { committed: number; planned: number }[];
  tolerance: number;
}): {
  summaryOvercommittedAmount: number;
  itemsOvercommit: { over_committed: boolean; overcommitted_amount: number }[];
} {
  const delta = input.totalCommitted - input.totalPlanned;
  return {
    summaryOvercommittedAmount: Math.max(0, delta),
    itemsOvercommit: input.items.map((item) => {
      const itemDelta = item.committed - item.planned;
      return {
        over_committed: itemDelta > input.tolerance,
        overcommitted_amount: Math.max(0, itemDelta),
      };
    }),
  };
}
```

(El código es ilustrativo para guiar la implementación; el Tech Spec no genera producción.)

### Controllers / Routes

* **Sin cambios**: reuso del controller de US-035.

### DTOs / Schemas

```ts
// Extensión de BudgetSummaryDto (US-035)
export const budgetSummaryDto = z.object({
  // ... campos existentes de US-035 ...
  overcommitted_amount: z.number().nonnegative(),
});

// Extensión de BudgetItemDto (US-035)
export const budgetItemDto = z.object({
  // ... campos existentes de US-035 ...
  over_committed: z.boolean(),
  overcommitted_amount: z.number().nonnegative(),
});
```

### Repository / Persistence

* `BudgetReadRepository` (US-035) — **sin cambios estructurales**.
* `CurrencyReadPort` (nuevo en `modules/budget`):
  * `findByCode(code: string): Promise<{ code: string; decimal_places: number } | null>`.
* Adapter en `modules/catalog`:
  * `prisma.currency.findUnique({ where: { code }, select: { code: true, decimal_places: true } })`.

### Validation Rules

| ID    | Implementación                                                                                  |
| ----- | ----------------------------------------------------------------------------------------------- |
| VR-01 | Cálculo en `GetBudgetUseCase`; DTOs Zod garantizan response sin campos faltantes.               |
| VR-02 | Fallback defensivo en el use case con log warning.                                              |
| VR-03 | Garantía por `Math.max(0, ...)`; Zod `nonnegative()` valida.                                    |
| VR-04 | Responsabilidad de US-036/US-039 (heredado).                                                    |

### Error Handling

* Sin códigos nuevos. Reuso del catálogo de US-035 (401/403/404).
* Si `currencyReadPort` lanza error inesperado (no `null`), se propaga como 500 con log estructurado.

### Transactions

* No requeridas; lectura única en US-035.

### Observability

* Logger estructurado `budget.viewed` (US-035) extendido:

  ```json
  {
    "event": "budget.viewed",
    "...": "campos existentes de US-035",
    "overcommitted_amount": 1250.00,
    "over_committed_items_count": 3
  }
  ```

* Logger adicional `currency.decimal_places.missing` (warning) cuando se aplica fallback:

  ```json
  {
    "event": "currency.decimal_places.missing",
    "currency_code": "XXX",
    "fallback_decimal_places": 2,
    "eventId": "<uuid>",
    "correlationId": "<id>"
  }
  ```

* Métricas: sin nuevas.

---

## 8. Frontend Technical Design

### Routes / Pages

* Reuso de la página de US-035.

### Components

* `BudgetSummary` (US-035) — **extender** con render condicional de `overcommitted_amount` con formato CLDR debajo del banner.
* `OvercommitWarning` (US-035) — **extender**:
  * Recibe nueva prop `eventId` para construir el handler del CTA.
  * Renderiza CTA "Editar items" como `<button>` que invoca `useOvercommitFocus(eventId).focusFirstOvercommitItem()`.
  * Mantiene `role="alert"` heredado.
* `BudgetItemsTable` (US-035) — **extender**:
  * Renderiza badge (`<span role="status" aria-label={...}>`) cuando `item.over_committed = true`.
  * Añade `data-overcommit="true"` y `id={`item-row-${item.id}`}` a las filas correspondientes para que el helper de focus pueda localizarlas.

### Hooks / Helpers

* `useOvercommitFocus(eventId)` (nuevo):
  ```ts
  function useOvercommitFocus(eventId: string) {
    const focusFirstOvercommitItem = () => {
      const firstRow = document.querySelector('[data-overcommit="true"]');
      if (firstRow instanceof HTMLElement) {
        firstRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstRow.focus({ preventScroll: true });
      } else {
        // fallback: scroll a la tabla
        const table = document.querySelector('[data-budget-items-table]');
        if (table instanceof HTMLElement) table.scrollIntoView({ behavior: 'smooth' });
      }
    };
    return { focusFirstOvercommitItem };
  }
  ```

### Forms

No aplica.

### State Management

* `useEventBudget` (US-035) ya entrega los campos extendidos sin cambios en su firma.

### Data Fetching

* Sin cambios. El response extendido fluye automáticamente.

### Loading / Empty / Error / Success States

* Heredados de US-035. Solo se enriquece `Success` con el delta + badges.

### Accessibility

* Badge con `role="status"` o `role="img"` (decisión de implementación; `role="img"` es más explícito para badges sin update dinámico interno).
* `aria-label` localizado interpolando el delta.
* Contraste AA del badge y del CTA.
* Foco programático en el CTA (`focus({ preventScroll: true })` + `scrollIntoView`).

### i18n

* Claves nuevas en `messages/<locale>.json`:
  * `budget.overcommit.delta_label`: "Excede por {amount}".
  * `budget.overcommit.item_badge`: "Sobrecomprometido".
  * `budget.overcommit.item_aria_label`: "Categoría sobrecomprometida por {amount}".
  * `budget.overcommit.cta_edit_items`: "Editar items".
* Formateo con `Intl.NumberFormat(locale, { style: 'currency', currency: summary.currency_code })`.

---

## 9. API Contract Design

| Method | Endpoint                                | Purpose                                                                                                            | Auth Required        | Request                                                                  | Response                                                                                                                                                  | Error Cases             |
| ------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| GET    | `/api/v1/events/:eventId/budget`         | Reuso US-035; response extendido con campos `overcommitted_amount` (summary), `over_committed` y `overcommitted_amount` (items[]). | Sí (cookie sesión)   | Path: `eventId` UUID. Sin body. Sin query params.                       | `200 { summary: BudgetSummaryDto (extendido), items: BudgetItemDto[] (extendido) }`                                                                       | 400, 401, 403, 404, 500 |

### Notas del contrato

* Campos nuevos **siempre presentes** (default `0` o `false` cuando no aplica). Forward-compatible: clientes existentes de US-035 ignoran los campos nuevos sin romperse.
* Documentation Alignment Required: actualizar `docs/16 §M06` con el shape extendido. Snapshot OpenAPI por US-098.

---

## 10. Database / Prisma Design

### Models Impacted

* `Budget`, `BudgetItem` (sin cambios).
* `Currency` (lookup read-only).

### Fields / Columns

* `currencies.decimal_places: integer` — debe existir desde PB-P0-001. Si falta, abrir tarea DOC con sugerencia de migración mínima en una US futura (US-038 usa fallback defensivo `2`).

### Relations

* Sin cambios.

### Indexes

* Reuso. `currencies.code` unique (PB-P0-001).

### Constraints

* Sin cambios.

### Migrations Impact

**Ninguna**.

### Seed Impact

* Garantizar al menos un evento demo con `over_committed = true` Y al menos un item con `committed > planned + tolerance` para demoar el badge.
* Recomendado adicionalmente: un evento demo con `currency_code = 'CLP'` (decimal_places = 0) para validar la tolerancia adaptativa.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

* Cookie HTTP-only (middleware existente).

### Authorization

* `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard` (reuso íntegro de US-035).

### Ownership Rules

* Sin cambios.

### Role Rules

* Sin cambios.

### Negative Authorization Scenarios

Heredados de US-035.

### Audit Requirements

* Sin nuevos. Log `budget.viewed` extendido.

### Sensitive Data Handling

* No expone PII; montos numéricos auditables.

---

## 13. Testing Strategy

### Unit Tests

| ID    | Scenario                                                                                       | Layer       |
| ----- | ---------------------------------------------------------------------------------------------- | ----------- |
| UT-01 | Helper `calculateOvercommitFields` con `delta = tolerance` ⇒ `over_committed = false`           | BE          |
| UT-02 | Helper con `delta = tolerance + ε` ⇒ `over_committed = true`                                    | BE          |
| UT-03 | Helper con `committed < planned` ⇒ `over_committed = false`, `overcommitted_amount = 0`         | BE          |
| UT-04 | `tolerance = 1` (CLP) con `delta = 0.5` ⇒ false; con `delta = 1.5` ⇒ true                       | BE          |
| UT-05 | DTOs Zod aceptan `overcommitted_amount = 0` y rechazan negativos                                 | BE          |
| UT-06 | `currencyReadPort.findByCode` retorna null ⇒ fallback `2` + log warning                         | BE          |
| UT-07 | `useOvercommitFocus.focusFirstOvercommitItem` con fila `data-overcommit="true"` hace focus       | FE          |
| UT-08 | Sin filas overcommit ⇒ fallback scroll a la tabla                                                 | FE          |
| UT-09 | `BudgetItemsTable` renderiza badge con `aria-label` localizado interpolando el delta             | FE          |
| UT-10 | `BudgetSummary` renderiza delta con `Intl.NumberFormat`                                          | FE          |

### Integration Tests

| ID    | Scenario                                                                            | Layer       |
| ----- | ----------------------------------------------------------------------------------- | ----------- |
| IT-01 | Response extendido con `currency_code = 'USD'` ⇒ tolerance = 0.01                    | BE + DB     |
| IT-02 | Response extendido con `currency_code = 'CLP'` ⇒ tolerance = 1                        | BE + DB     |
| IT-03 | Response con `currency_code` desconocido ⇒ fallback + log warning                     | BE + DB     |
| IT-04 | Sin items ⇒ `overcommitted_amount = 0`, `items = []`                                 | BE + DB     |
| IT-05 | Item con `planned = 0 ∧ committed > 0` ⇒ `over_committed = true`                     | BE + DB     |
| IT-06 | Evento `cancelled`/`completed` ⇒ 200 con cálculo real                                 | BE + DB     |
| IT-07 | Regresión: clientes que solo leen campos de US-035 no se rompen (forward-compat)     | BE + API    |

### API Tests

Cubiertos por Integration Tests.

### E2E Tests

| ID    | Scenario                                                                                       | Tipo       |
| ----- | ---------------------------------------------------------------------------------------------- | ---------- |
| E2E-01 | Banner + delta visible cuando `summary.over_committed = true`                                   | Playwright |
| E2E-02 | Badge per-item visible en categoría sobrecomprometida                                            | Playwright |
| E2E-03 | CTA "Editar items" hace scroll + focus a la primera fila over_committed                          | Playwright |
| E2E-04 | Tras mutación en US-036 (reducir committed), banner y badges desaparecen tras refetch            | Playwright |

### Security Tests

Heredados de US-035 (sin tareas dedicadas).

### Accessibility Tests

| ID       | Scenario                                                                                  | Tipo                        |
| -------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| A11Y-01  | Badge con `role="img"`/`role="status"` + `aria-label`                                       | jest-axe + @testing-library |
| A11Y-02  | CTA "Editar items" accesible por teclado, foco visible                                      | jest-axe                    |
| A11Y-03  | Delta en banner con contraste AA y formato CLDR                                             | jest-axe                    |

### AI Tests

No aplica.

### Seed / Demo Tests

| ID         | Scenario                                                                                                | Tipo    |
| ---------- | ------------------------------------------------------------------------------------------------------- | ------- |
| SEED-T-01  | Seed contiene al menos un evento con `over_committed = true` Y un item con badge demoable                 | Vitest  |

### Performance Tests

| ID      | Scenario                                                                                  | Expected               |
| ------- | ----------------------------------------------------------------------------------------- | ---------------------- |
| PERF-01 | Endpoint extendido con 30 items + 1 lookup currency                                        | P95 < 1.5 s sin regresión vs US-035 |

### Contract Tests

| ID           | Scenario                                                                | Expected                                |
| ------------ | ----------------------------------------------------------------------- | --------------------------------------- |
| CONTRACT-01  | Shape extendido `{ summary, items[] }` vs OpenAPI snapshot                | Match exacto (handoff US-098)           |

### CI Checks

* Vitest verde.
* Playwright verde.
* Cobertura ≥ 50% del módulo budget.
* Lint, typecheck, build.

---

## 14. Observability & Audit

### Logs

* `budget.viewed` extendido (definido en §7).
* `currency.decimal_places.missing` (warning) cuando se aplica fallback.

### Correlation ID

* Heredado.

### AdminAction

No aplica.

### Error Tracking

* Sin cambios.

### Metrics

* Reuso del histogram existente. Sin nuevas.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Garantizar:
  * 1 evento demo con `summary.over_committed = true`.
  * 1 item en ese evento con `committed > planned + tolerance` (badge demoable).
  * 1 evento demo opcional con `currency_code = 'CLP'` para validar tolerance = 1.

### Demo Scenario Supported

* Banner + delta + badge en categoría sobrecomprometida.
* CTA scroll/focus operativo.

### Reset / Isolation Notes

Sin notas adicionales.

---

## 16. Documentation Alignment Required

| Document / Source                          | Conflict                                                                                                          | Current Decision                                                                                            | Recommended Action                                                                                                                              | Blocks Implementation? |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `docs/16 §M06 Budget`                       | Response no documenta `summary.overcommitted_amount`, `items[].over_committed`, `items[].overcommitted_amount`.    | D1 (decision resolution US-038).                                                                            | Actualizar `docs/16 §M06`. Snapshot OpenAPI por US-098. No bloquea.                                                                              | No                     |
| `docs/4 §BR-BUDGET-004`                     | No detalla tolerancia adaptativa.                                                                                  | D3 (decision resolution US-038).                                                                            | Nota interpretativa en BR-BUDGET-004 referenciando D3. No bloquea.                                                                              | No                     |
| `docs/6 §Currency` / `currencies` (PB-P0-001) | Verificar que `decimal_places` está expuesto en el dominio y schema.                                              | D3 depende de este campo; fallback defensivo a `2`.                                                          | Verificar y, si falta, abrir DOC + migración menor en US futura. No bloquea US-038 gracias al fallback.                                          | No                     |
| `docs/10`                                   | Algunas US usan `NFR-PERF-API-001`.                                                                                | `NFR-PERF-001`.                                                                                              | Housekeeping en backlog. Ya alineado en US-032..037.                                                                                            | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                                              | Impact                                          | Mitigation                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `currencies.decimal_places` puede no existir en el schema entregado por PB-P0-001.                                  | Fallback defensivo a `2` aplica siempre; pierde precisión para CLP/JPY. | Verificar en `prisma schema`. Si falta, abrir tarea DOC + migración menor; US-038 sigue funcional gracias al fallback con log warning.       |
| Forward-compat del DTO de US-035 puede romper clientes existentes si los campos nuevos llegan como opcionales.    | Cliente desactualizado falla al parsear.        | Hacer los campos **siempre presentes** con default `0`/`false`. CONTRACT-01 verifica.                                                       |
| Focus management con `scrollIntoView + focus` no funciona si la tabla está en un contenedor con scroll propio.    | UX confuso.                                     | Tests E2E E2E-03 validan; añadir `preventScroll: false` como fallback si es necesario.                                                       |
| `Math.pow(10, -decimal_places)` puede generar inexactitud para `decimal_places=2` (`0.010000000000000002`).         | Tolerancia ligeramente off.                     | Usar `tolerance = decimal_places === 0 ? 1 : Number((10 ** (-decimal_places)).toFixed(decimal_places))` o tabla lookup.                       |
| Documentation Alignment Required no se ejecuta y queda residual.                                                    | Documentación divergente.                       | Tareas DOC explícitas (Should, no bloqueantes).                                                                                              |

---

## 18. Implementation Guidance for Coding Agents

### Archivos / Carpetas probablemente impactadas

**Backend** (`apps/api`):

* `src/modules/budget/domain/overcommit-calculator.ts` — **nuevo** (helper puro).
* `src/modules/budget/ports/currency-read.port.ts` — **nuevo**.
* `src/modules/catalog/adapters/currency-read.adapter.ts` — **nuevo**.
* `src/modules/budget/use-cases/get-budget.use-case.ts` — **extender** (US-035) para invocar el port y el helper.
* `src/modules/budget/dto/budget-summary.dto.ts` — **extender** con `overcommitted_amount`.
* `src/modules/budget/dto/budget-item.dto.ts` — **extender** con `over_committed`, `overcommitted_amount`.
* `src/shared/logging/budget-events.ts` — **extender** schema de `budget.viewed`; añadir `currency.decimal_places.missing`.

**Frontend** (`apps/web`):

* `components/events/budget/BudgetSummary.tsx` — **extender** con render del delta.
* `components/events/budget/BudgetItemsTable.tsx` — **extender** con badge per-fila + `data-overcommit`.
* `components/events/budget/OvercommitWarning.tsx` — **extender** con CTA "Editar items".
* `hooks/useOvercommitFocus.ts` — **nuevo**.
* `messages/{es-LATAM,es-ES,pt,en}.json` — **añadir** claves `budget.overcommit.*`.

**Documentación**:

* `docs/16 §M06` — DOC.
* `docs/4 §BR-BUDGET-004` — DOC.
* Verificación de `currencies.decimal_places` — DOC.

### Orden recomendado de implementación

1. Backend foundations:
   * Port + adapter de `Currency`.
   * Helper puro `calculateOvercommitFields` (sin dependencias).
2. Extensión DTOs Zod.
3. Extensión `GetBudgetUseCase` con lookup, fallback y composición del response.
4. Extensión del logger.
5. Frontend:
   * Hook `useOvercommitFocus`.
   * Extensión de `BudgetSummary` y `BudgetItemsTable`.
   * Extensión de `OvercommitWarning` con CTA.
   * i18n en 4 locales.
6. Tests por capa: UT → IT → A11Y → E2E → PERF → CONTRACT.
7. Documentación.

### Decisiones que no deben reabrirse

* D1: extensión incremental sin endpoint nuevo.
* D2: CTA único "Editar items"; sin "Ajustar total".
* D3: tolerancia adaptativa por `currency.decimal_places` con fallback `2`.
* D4: condición del badge per-item con `> tolerance`.

### Qué NO debe implementarse

* Endpoint nuevo.
* Persistencia del flag/delta en BD.
* Cálculo client-side de los campos.
* Cache server-side adicional.
* Bloqueo de gastos.

### Asunciones a preservar

* US-035 entrega los componentes y la query key.
* US-036/US-039 ya invalidan el cache.
* `currencies.code` es unique.
* Campos nuevos siempre presentes en el response (forward-compat).

---

## 19. Task Generation Notes

### Suggested Task Groups

| Grupo | Cantidad estimada | Notas                                                                                                                                                |
| ----- | :---------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB    | 0                 | Sin migraciones. Verificación de `currencies.decimal_places` queda en DOC.                                                                              |
| BE    | 5                 | Helper puro, Port + adapter, extensión DTOs, extensión UseCase, extensión logger.                                                                      |
| API   | 0                 | Cubierto por BE.                                                                                                                                       |
| SEC   | 0                 | Reuso íntegro.                                                                                                                                         |
| OBS   | 0                 | Cubierto por BE (extensión de logger).                                                                                                                 |
| FE    | 5                 | Hook focus, extensión BudgetSummary, extensión BudgetItemsTable, extensión OvercommitWarning con CTA, i18n.                                              |
| SEED  | 1                 | Garantizar evento con overcommit + badge demoable; opcional currency CLP.                                                                              |
| QA    | 7                 | UT, IT, PERF, A11Y, CONTRACT, E2E, SEED test.                                                                                                          |
| AI    | 0                 | No aplica.                                                                                                                                            |
| OPS   | 0                 | Sin cambios.                                                                                                                                          |
| DOC   | 3                 | `docs/16 §M06`, `docs/4 §BR-BUDGET-004`, verificación `currencies.decimal_places`.                                                                      |

**Total estimado**: ~21 tareas.

### Required QA Tasks

* UT del helper, lookup currency, fallback.
* IT con USD, CLP, currency desconocida, cancelled/completed, planned=0.
* PERF-01 sin regresión.
* A11Y de badge y CTA.
* CONTRACT-01.
* E2E del flujo completo.
* SEED test.

### Required Security Tasks

Sin tareas dedicadas; reuso íntegro.

### Required Seed / Demo Tasks

* SEED-01: garantizar escenarios canónicos.

### Required Documentation Tasks

* DOC-01: docs/16 §M06.
* DOC-02: docs/4 §BR-BUDGET-004.
* DOC-03: verificación currencies.decimal_places.

### Dependencies Between Tasks

```
BE-001 (Helper) ─┐
BE-002 (Port + adapter) ─┤
BE-003 (DTOs) ───────────┼─→ BE-004 (UseCase extension) → BE-005 (Logger)
                          └─→ FE-002 (BudgetSummary) ──┐
                              FE-003 (BudgetItemsTable) ├─→ FE-004 (OvercommitWarning + CTA)
                              FE-001 (Hook focus) ─────┤        ↓
                                                       └→ FE-005 (i18n)
SEED-001 (paralelo)
QA-001..007 dependen de los BE/FE relevantes
DOC-01..03 (paralelos)
```

### Consolidated `tasks.md` para el Backlog Item

No es estrictamente necesario; PB-P1-022 contiene un solo US.

---

## 20. Technical Spec Readiness

| Check                                                       | Status |
| ----------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec    | Pass   |
| Product Backlog mapping found                               | Pass   |
| Decision Resolution reviewed if present                     | Pass   |
| Scope clear                                                 | Pass   |
| Architecture alignment clear                                | Pass   |
| API impact clear                                            | Pass   |
| DB impact clear                                             | Pass   |
| AI impact clear                                             | N/A    |
| Security impact clear                                       | Pass   |
| Testing strategy clear                                      | Pass   |
| Ready for Development Task Breakdown                        | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

US-038 es una extensión incremental implementation-ready de `GetBudgetUseCase` (US-035) con tres campos nuevos en el response y tres componentes UI enriquecidos. La lógica nueva vive en un helper puro testeable + un port hexagonal para el lookup de `Currency.decimal_places`. Sin migraciones, sin endpoints nuevos, sin breaking changes. Forward-compat garantizado por contract test. Las 4 decisiones (D1–D4) están materializadas. Las 4 Documentation Alignment Required son housekeeping no bloqueante. Próximo paso: `eventflow-user-story-to-development-tasks`.
