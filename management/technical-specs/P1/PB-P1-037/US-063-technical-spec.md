# Technical Specification — US-063: BookingDisclaimer shared + audit + refactor US-061

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-063 |
| Source User Story | `management/user-stories/US-063-booking-disclaimer-visible.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-063-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-037 |
| Backlog Title | Disclaimer visible + committed sincronizado |
| Backlog Execution Order | 63 |
| User Story Position in Backlog Item | 1 de 2 (US-063 → US-064) |
| Related User Stories in Backlog Item | US-063, US-064 |
| Epic | EPIC-CMP-001 |
| Backlog Item Dependencies | US-060, US-061, PB-P0-001 |
| Feature | BookingDisclaimer shared + audit fields + enforcement bilateral |
| Module / Domain | Booking / Compliance |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-28 |
| Last Updated | 2026-06-28 |

---

## 2. Backlog Execution Context

US-063 abre PB-P1-037. Execution order 63.

---

## 3. Executive Technical Summary

**Backend**:
- Constante `BOOKING_DISCLAIMER_COPY_VERSION = 'v1'` en `src/shared/booking/disclaimer.ts`.
- Refactor `CreateBookingIntentUseCase` (US-060): persistir `disclaimer_accepted_at_create=NOW(), disclaimer_copy_version_create='v1'` + log `disclaimer.accepted action=create`.
- Refactor `ConfirmBookingIntentUseCase` (US-061): añadir DTO `disclaimer_accepted: literal(true)` + persistir `disclaimer_accepted_at_confirm=NOW(), disclaimer_copy_version_confirm='v1'` + log `disclaimer.accepted action=confirm`.
- Refactor controller del confirm para parsear body.

**Frontend**:
- `BookingDisclaimer` shared Client Component.
- Refactor `CreateBookingDialog` (US-060) y `ConfirmBookingDialog` (US-061) para consumirlo.
- i18n 4 locales para copy v1.

**Database**:
- Migración: añadir `disclaimer_accepted_at_create/confirm` + `disclaimer_copy_version_create/confirm` + backfill.

---

## 4. Scope Boundary

### In Scope
- Componente shared + refactor 2 dialogs.
- Refactor backend de 2 use cases.
- Migración + backfill.
- i18n + copy v1.
- Tests + regresión.

### Out of Scope
- Versionado dinámico del copy (sólo v1 MVP).
- Contratos digitales.
- Disclaimer en cancel.

---

## 5. Architecture Alignment

Refactor minimal. Reuso de pattern existente.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 create | Refactor UseCase + dialog | BE, FE, DB |
| AC-02 confirm | Refactor UseCase + DTO + dialog | BE, FE, DB |
| AC-03 componente shared | Implementación + 2 usos | FE |
| AC-04 backfill | Migration | DB |
| EC-01..03 | Validaciones + fallback i18n | BE, FE |

---

## 7. Backend Technical Design

### Constante

```ts
// src/shared/booking/disclaimer.ts
export const BOOKING_DISCLAIMER_COPY_VERSION = 'v1';
```

### Refactor `CreateBookingIntentUseCase` (US-060)

```ts
// Dentro de la transacción, al INSERT del booking_intent:
const intent = await tx.booking_intents.create({
  data: {
    quote_id: body.quote_id,
    status: 'pending',
    created_by: currentUser.id,
    disclaimer_accepted_at_create: new Date(),
    disclaimer_copy_version_create: BOOKING_DISCLAIMER_COPY_VERSION,
  },
});

logger.info('disclaimer.accepted', {
  userId: currentUser.id,
  bookingIntentId: intent.id,
  action: 'create',
  agreementCopyVersion: BOOKING_DISCLAIMER_COPY_VERSION,
  acceptedAt: intent.disclaimer_accepted_at_create.toISOString(),
});
```

### Refactor `ConfirmBookingIntentUseCase` (US-061)

```ts
// Cambio en DTO:
export const confirmBookingIntentBody = z.object({
  disclaimer_accepted: z.literal(true),
}).strict();

// Dentro de la transacción, antes de UPDATE intent:
const now = new Date();
const updated = await tx.booking_intents.update({
  where: { id: bookingIntentId },
  data: {
    status: 'confirmed_intent',
    confirmed_at: now,
    disclaimer_accepted_at_confirm: now,
    disclaimer_copy_version_confirm: BOOKING_DISCLAIMER_COPY_VERSION,
  },
});

logger.info('disclaimer.accepted', {
  userId: currentUser.id,
  bookingIntentId,
  action: 'confirm',
  agreementCopyVersion: BOOKING_DISCLAIMER_COPY_VERSION,
  acceptedAt: now.toISOString(),
});
```

### Controllers

Refactor del controller de `POST /vendor/booking-intents/:id/confirm` para parsear body con DTO.

### Error Handling

- Bypass de `disclaimer_accepted` ⇒ `400 DISCLAIMER_REQUIRED` (paridad con US-060).

---

## 8. Frontend Technical Design

### Componente shared

```tsx
// components/booking/BookingDisclaimer.tsx
type Props = {
  mode: 'create' | 'confirm';
  onAcceptedChange: (accepted: boolean) => void;
};

export function BookingDisclaimer({ mode, onAcceptedChange }: Props) {
  const t = useTranslations('booking.disclaimer.v1');
  return (
    <div role="region" aria-labelledby="disclaimer-title">
      <h3 id="disclaimer-title">{t('title')}</h3>
      <p id="disclaimer-body" aria-describedby="disclaimer-body">{t('body')}</p>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          onChange={(e) => onAcceptedChange(e.target.checked)}
          aria-describedby="disclaimer-body"
        />
        <span>{t('checkbox')}</span>
      </label>
      <span className="text-xs text-muted">v{BOOKING_DISCLAIMER_COPY_VERSION}</span>
    </div>
  );
}
```

### Refactor dialogs

`CreateBookingDialog` y `ConfirmBookingDialog` importan `BookingDisclaimer` y mantienen `agreementAccepted` en local state. CTA `disabled={!agreementAccepted}`.

`ConfirmBookingDialog`: además incluye `disclaimer_accepted: true` en el body del POST (nuevo).

---

## 9. API Contract

Sin endpoints nuevos. Cambios:

| Endpoint | Cambio |
|---|---|
| `POST /api/v1/organizer/booking-intents` | Backend persiste audit fields (transparente al cliente; body sigue igual). |
| `POST /api/v1/vendor/booking-intents/:id/confirm` | Body refactor: ahora requiere `{ disclaimer_accepted: true }`. Backward incompatible (sólo en MVP, sin clientes externos). |

---

## 10. Database / Prisma Design

### Migración

```sql
ALTER TABLE booking_intents
  ADD COLUMN disclaimer_accepted_at_create timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN disclaimer_accepted_at_confirm timestamptz NULL,
  ADD COLUMN disclaimer_copy_version_create text NOT NULL DEFAULT 'v1',
  ADD COLUMN disclaimer_copy_version_confirm text NULL;

-- Backfill
UPDATE booking_intents
  SET disclaimer_accepted_at_create = created_at,
      disclaimer_copy_version_create = 'v1';

UPDATE booking_intents
  SET disclaimer_accepted_at_confirm = confirmed_at,
      disclaimer_copy_version_confirm = 'v1'
  WHERE status = 'confirmed_intent' AND confirmed_at IS NOT NULL;

-- Remove DEFAULT después del backfill (opcional, mantiene como safety net)
```

### Indexes
Sin nuevos índices necesarios (audit fields no se consultan filtrados).

### Seed Impact
Reuso (los seeds existentes generarán BookingIntents que pasarán por el use case refactorizado).

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design

- Enforcement server-side bilateral.
- Audit trail completo persistido.
- Log estructurado para auditoría externa.

## 13. Testing Strategy

### Unit
- DTO confirm con `disclaimer_accepted: true` requerido.
- UseCase create y confirm persisten audit fields.

### Integration
- TS-01..TS-05 + regresión US-053..062 con audit fields nuevos.
- Bypass de `disclaimer_accepted` ⇒ 400 (ambos endpoints).
- Backfill: BookingIntents pre-migración tienen audit fields no nulos.

### API
Supertest.

### Security
- Bypass server-side bloqueado.

### Accessibility
- `BookingDisclaimer` axe + RTL + screen reader.

### Performance
- Negligible (sólo 2 columnas + 1 log adicional).

---

## 14. Observability & Audit

Log `disclaimer.accepted` con 5 campos. Audit trail completo en DB.

---

## 15. Seed / Demo
Reuso. Verificar que demo data muestra audit fields completos post-migración.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar refactor del body del confirm | Documentar. | Actualizar. | No |
| `docs/14` | Documentar audit fields + componente shared | Documentar. | Actualizar. | No |
| Schema `booking_intents` | Nuevas columnas | Migración. | Aplicar. | No |
| Copy legal v1 | Validación legal | Pendiente | Coordinar con legal. | No (asumido v1 inicial) |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Refactor del confirm body breaks clientes existentes | Frontend rompe | Aplicar refactor coordinado (BE+FE en mismo PR), MSW actualizado |
| Backfill incompleto | Data integrity | Validar post-migración: `SELECT COUNT(*) WHERE disclaimer_accepted_at_create IS NULL` debe ser 0 |
| Componente shared no captura todos los casos | Inconsistencia UX | Tests E2E en ambos flujos |
| Copy v1 no aprobado legalmente | Compliance | Marcar como tentativo + bloqueo de release real hasta validación |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/shared/booking/disclaimer.ts` (nuevo - constante version)
- `src/modules/booking/use-cases/create-booking-intent.use-case.ts` (US-060 — refactor)
- `src/modules/booking/use-cases/confirm-booking-intent.use-case.ts` (US-061 — refactor)
- `src/modules/booking/dto/confirm-booking-intent.body.ts` (nuevo, antes era body vacío)
- `src/modules/booking/controllers/vendor-booking.controller.ts` (US-061 — refactor para parsear body)
- Migración Prisma: `add_disclaimer_audit_to_booking_intents`.

**Frontend**:
- `components/booking/BookingDisclaimer.tsx` (nuevo)
- `components/organizer/booking/CreateBookingDialog.tsx` (US-060 — refactor)
- `components/vendor/booking/ConfirmBookingDialog.tsx` (US-061 — refactor)
- `lib/api/vendorApi.ts` (extender el body de `bookings.confirm`)
- `messages/{4 locales}.json` (extender con `booking.disclaimer.v1.*`)

### Orden sugerido
1. DB-001 + migración + backfill.
2. Constante version + i18n copy v1.
3. `BookingDisclaimer` shared component + UT.
4. Refactor UseCases backend + UT.
5. Refactor DTO confirm + Controller.
6. Refactor dialogs FE + API client.
7. Tests IT + regresión + Backfill validation + AUTH + A11Y.
8. Documentación.

### Decisiones que no deben reabrirse
D1–D7.

### Qué no implementar
- Versionado dinámico.
- Contratos.
- Disclaimer en cancel.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 2 (verify + migración con backfill) |
| BE | 5 (constante, refactor 2 UseCases, DTO, controller) |
| FE | 4 (shared component, refactor 2 dialogs, API+MSW, i18n) |
| QA | 5 (UT, IT regresión, Backfill, AUTH, A11Y) |
| DOC | 1 (`docs/16` + `docs/14`) |
| **Total** | 17 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Migration plan clear | Pass |
| Backfill plan clear | Pass |
| Security clear | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-063 consolida el disclaimer del flujo BookingIntent con componente shared, audit trail completo y enforcement bilateral. Refactoriza US-061 D8 para paridad server-side. US-064 cerrará PB-P1-037 con la visibilidad del committed en dashboard.
