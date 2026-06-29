# Technical Specification — US-083: Currency Display + Inmutabilidad

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-083 |
| Source User Story | `management/user-stories/US-083-view-amounts-in-event-currency.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-083-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-048 |
| Backlog Title | Moneda inmutable y display consistente |
| Backlog Execution Order | 83 |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-083 |
| Epic | EPIC-I18N-001 |
| Backlog Item Dependencies | US-009, US-010, US-036/038/052/057/060/061/064/019 |
| Feature | Helper formatCurrency + MoneyDisplay + backend guard inmutabilidad |
| Module / Domain | I18N / Currency |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-29 |
| Last Updated | 2026-06-29 |

---

## 2. Backlog Execution Context

PB-P1-048 single-story. Execution order 83.

---

## 3. Executive Technical Summary

**Shared (BE + FE)**:
- Helper `formatCurrency(amount, currencyCode, locale)` SSR-compatible con `Intl.NumberFormat`.

**Frontend**:
- `<MoneyDisplay value, currencyCode />` componente que llama helper con user locale.
- Refactor de surfaces para usar `<MoneyDisplay>` consistentemente.

**Backend**:
- Refactor `updateEventBody` DTO (US-010): `.omit({ currency_code })` para inmutabilidad.

**i18n**:
- Currency names en 4 locales para `aria-label`.

---

## 4. Scope Boundary

### In Scope
- Helper shared + componente + refactor surfaces.
- DTO guard inmutabilidad.

### Out of Scope
- FX conversion.
- Currencies adicionales.
- Cross-currency aggregation.

---

## 5. Architecture Alignment

Helper compartido FE+BE. Componente reusable.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 display básico | MoneyDisplay + helper | FE |
| AC-02 locale formatting | useLocale + Intl | FE |
| AC-03 ambiguo USD | Format con código ISO inline | FE |
| AC-04 backend guard | DTO omit | BE |
| AC-05 audit no raw | Lint rule + test | FE/QA |
| EC-01..04 | Helper handling | FE |

---

## 7. Backend Technical Design

### Helper compartido

```ts
// src/shared/format/money.ts
type CurrencyCode = 'GTQ' | 'EUR' | 'MXN' | 'COP' | 'USD';
type Locale = 'es-LATAM' | 'es-ES' | 'pt' | 'en';

const LOCALE_MAP: Record<Locale, string> = {
  'es-LATAM': 'es-419',  // Intl best-fit para LATAM
  'es-ES': 'es-ES',
  'pt': 'pt-BR',
  'en': 'en-US',
};

export function formatCurrency(
  amount: string | number | Prisma.Decimal,
  currencyCode: CurrencyCode,
  locale: Locale,
): string {
  const amountNum = typeof amount === 'string' ? parseFloat(amount)
    : amount instanceof Prisma.Decimal ? amount.toNumber()
    : amount;

  const intlLocale = LOCALE_MAP[locale] ?? 'es-419';
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountNum);
}
```

### Refactor US-010 DTO

```ts
// Antes (hipotético)
export const updateEventBody = z.object({
  title: z.string().optional(),
  currency_code: z.enum([...]).optional(), // <-- prohibido
  // ...
}).strict();

// Después
export const updateEventBody = z.object({
  title: z.string().optional(),
  // SIN currency_code
  language: z.enum(['es-LATAM','es-ES','pt','en']).optional(),
  // ... otros fields
}).strict();
```

Cualquier intento de incluir `currency_code` ⇒ `400 INVALID_BODY` (Zod rechaza por `.strict()`).

---

## 8. Frontend Technical Design

### Componente

```tsx
// components/common/MoneyDisplay.tsx
'use client';

type Props = {
  value: string | number;
  currencyCode: 'GTQ' | 'EUR' | 'MXN' | 'COP' | 'USD';
  className?: string;
};

export function MoneyDisplay({ value, currencyCode, className }: Props) {
  const locale = useLocale() as Locale;
  const t = useTranslations('common.currency');

  const formatted = formatCurrency(value, currencyCode, locale);
  const currencyName = t(currencyCode); // e.g. "Quetzales guatemaltecos"

  // Para $ ambiguo (USD/MXN/COP), prepend código ISO
  const isAmbiguous = ['USD', 'MXN', 'COP'].includes(currencyCode);
  const displayValue = isAmbiguous && locale === 'en'
    ? `${currencyCode} ${formatted.replace(/^[^\d-]+/, '')}` // strip symbol, prefix code
    : formatted;

  return (
    <span
      className={className}
      title={currencyCode}
      aria-label={`${value} ${currencyName}`}
    >
      {displayValue}
    </span>
  );
}
```

### Refactor de surfaces

Identificar y migrar todos los usos actuales de display de cifras. Audit con grep o lint rule.

### i18n

`messages/{4 locales}.json`:
```json
{
  "common": {
    "currency": {
      "GTQ": "Quetzales guatemaltecos",
      "EUR": "Euros",
      "MXN": "Pesos mexicanos",
      "COP": "Pesos colombianos",
      "USD": "Dólares estadounidenses"
    }
  }
}
```

---

## 9. API Contract

Sin endpoints nuevos. Cambio:

| Endpoint | Cambio |
|---|---|
| `PATCH /events/:id` (US-010) | Body NO acepta `currency_code` (Zod omit). |

---

## 10. Database / Prisma Design

Sin migraciones. `events.currency_code` ya existe. Opcional: DB-level constraint vía trigger (no obligatorio si DTO enforce ya cubre).

---

## 11. AI / PromptOps Design

AI use cases que pasan currency al prompt deben usar `event.currency_code` (ya inmutable). Sin refactor obligatorio aquí.

---

## 12. Security & Authorization Design
Heredada de surfaces individuales.

## 13. Testing Strategy

### Unit
- `formatCurrency` con 5 currencies × 4 locales = 20 escenarios.

### Component
- `<MoneyDisplay>` render + aria-label.

### Integration
- PATCH /events/:id con currency_code ⇒ 400.

### Audit
- Lint rule o grep test que verifica no hay raw display fuera de MoneyDisplay.

### Accessibility
- axe + aria-label correcto.

### Performance
- Helper síncrono; despreciable.

---

## 14. Observability & Audit
N/A (display only).

---

## 15. Seed / Demo
Reuso. Eventos demo con varias currencies para validar display.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/15` (i18n strategy) | Documentar currency display strategy | Documentar. | Actualizar. | No |
| `docs/16 §M07` | Documentar inmutabilidad PATCH /events | Documentar. | Actualizar. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Surfaces no migradas | Display inconsistente | Audit + lint rule |
| Locale mapping incorrecto Intl | Format raro | Tests UT por locale |
| FX expectation usuario | Confusión | Disclaimer en docs UI |
| Decimal precision loss | Cifras incorrectas | Usar Prisma.Decimal en backend; convertir solo en helper |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Shared**:
- `src/shared/format/money.ts` (nuevo helper)
- `src/shared/format/money.test.ts` (UT)

**Backend**:
- `src/modules/events/dto/update-event.body.ts` (refactor omit currency_code)

**Frontend**:
- `components/common/MoneyDisplay.tsx` (nuevo)
- `messages/{4 locales}.json` (extender con `common.currency.*`)
- Refactor (grep) todos los display actuales para usar `<MoneyDisplay>`.

### Orden sugerido
1. Helper + UT 20 escenarios.
2. MoneyDisplay componente + component test.
3. i18n currency names.
4. Refactor US-010 DTO + IT.
5. Audit surfaces actuales + migrar a MoneyDisplay.
6. Lint rule o test para audit.
7. Documentación.

### Decisiones que no deben reabrirse
D1–D8.

### Qué no implementar
- FX conversion.
- Currencies adicionales.
- Cross-currency aggregation.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| BE | 2 (helper + DTO refactor) |
| FE | 3 (MoneyDisplay + i18n + refactor surfaces) |
| QA | 4 (UT helper + Component test + IT + Audit) |
| DOC | 1 |
| **Total** | 10 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-083 entrega helper shared + componente reusable + backend guard inmutabilidad + audit. **PB-P1-048 single-story cierra**.
