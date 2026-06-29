# PO/BA Decision Resolution — US-083

## Source User Story File
management/user-stories/US-083-view-amounts-in-event-currency.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-083-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-083 |
| Backlog Item | PB-P1-048 |
| Decisiones tomadas | 8 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Helper utility `formatCurrency`
```
Función pura compartida (FE + BE compatible):

formatCurrency(
  amount: string | Decimal | number,
  currencyCode: 'GTQ' | 'EUR' | 'MXN' | 'COP' | 'USD',
  locale: 'es-LATAM' | 'es-ES' | 'pt' | 'en'
): string

Implementación: `Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode })`. Handle `es-LATAM` mapeando a `es-419` para Intl. Decimal precision por defecto del Intl (2 dígitos).
```

### D2 — Backend guard inmutabilidad
```
`UpdateEventUseCase` (US-010) refactor:
- DTO: `currency_code` no se acepta en updateEventBody (omit).
- Alternativa: si presente y distinto del existente ⇒ `409 CURRENCY_NOT_EDITABLE` con `details.current_currency`.

Recomendado: `.omit({ currency_code })` en Zod schema. Más simple y explícito.
```

### D3 — Surface UI completo
```
Componente `<MoneyDisplay value={...} currencyCode={...} />` aplicado en:
- Budget summary cards (US-038, US-064).
- BudgetItem rows (US-036).
- Quote items (US-052, US-057).
- BookingIntent confirmation (US-060/061).
- AI budget output (US-019).
- Dashboard cards.
- Detail pages de Quote/BookingIntent.

Audit en QA: assertion que NO hay `${amount}` raw display fuera de `<MoneyDisplay>`.
```

### D4 — Locale del usuario, no del evento
```
`formatCurrency` usa `useLocale()` del client (user's UI locale). Separación clara:
- Contenido (event.language) → afecta AI output, notifs in-app del organizer.
- Presentación (user locale) → afecta cómo se renderizan números/fechas/monedas.

Ej: Organizer en `pt` ve un evento con `currency='GTQ'` → "Q 500,00" (separador pt con coma).
```

### D5 — Símbolo + tooltip ISO
```
Display: símbolo nativo + valor (ej. "Q500.00", "$500.00 USD" si ambiguo).

`<MoneyDisplay>` añade `title="GTQ"` (tooltip nativo) o `aria-label="500 Quetzales guatemaltecos"` para accesibilidad.

Para currencies con símbolo `$` ambiguo (USD/MXN/COP), añadir el código ISO inline para claridad: "MX$500.00" o "USD 500.00".
```

### D6 — Currencies enum: 5 obligatorias
```
Enum backend: `z.enum(['GTQ', 'EUR', 'MXN', 'COP', 'USD'])`.

Validación en CreateEventUseCase (US-009): rechaza otros ⇒ `400 INVALID_CURRENCY`.

Post-MVP: ampliar via admin endpoint (out of scope).
```

### D7 — SSR-compatible
```
`Intl.NumberFormat` funciona en Node + browser. Helper compartido en `src/shared/format/money.ts` consumible desde Server Components, Client Components, y backend (para emails simulados, AI prompts).
```

### D8 — Sin moneda mixta MVP
```
Cada surface es event-scoped. Vistas cross-event (dashboard que agrupa varios eventos): display sin agregar (mostrar cada evento con su moneda). Sin sumar/convertir.

Cuando futuro requiera agregación cross-currency, abrir nueva US con FX rates explícitos.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Helper | `formatCurrency` con Intl.NumberFormat |
| 2 | Inmutabilidad | DTO omit en US-010 |
| 3 | Surface | `<MoneyDisplay>` componente reusable + audit no raw |
| 4 | Locale | User locale (no event.language) |
| 5 | Display | Símbolo + tooltip ISO + ambiguous handling |
| 6 | Enum | 5 currencies obligatorias |
| 7 | SSR | Compatible Node + browser |
| 8 | Mixta | Out of MVP; cada surface event-scoped |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-083-view-amounts-in-event-currency.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
