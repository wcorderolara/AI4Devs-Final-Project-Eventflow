# PO/BA Decision Resolution — US-063

## Source User Story File
management/user-stories/US-063-booking-disclaimer-visible.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-063-refinement-review.md

## Decision Date
2026-06-28

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-063 |
| Backlog Item | PB-P1-037 |
| Decisiones tomadas | 7 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Enforcement server-side bilateral (refactor de US-061 D8)
```
US-063 establece enforcement server-side OBLIGATORIO también en US-061 (confirm vendor), por paridad con US-060 (create). El body de `POST /vendor/booking-intents/:id/confirm` ahora requiere `disclaimer_accepted: true`. Esto refactoriza la Decisión PO US-061 D8.

Esto introduce trabajo de refactor en US-061 (controller + DTO + UI). US-063 incluye estas tareas como parte de su scope.
```

### D2 — Persistencia con 2 columnas separadas
```
Añadir a `booking_intents`:
- `disclaimer_accepted_at_create timestamptz NOT NULL` (set en US-060 create)
- `disclaimer_accepted_at_confirm timestamptz NULL` (set en US-061 confirm)

Migración menor.

Para BookingIntents existentes pre-migración: `disclaimer_accepted_at_create = created_at` (backfill); `disclaimer_accepted_at_confirm = confirmed_at` si `status='confirmed_intent'`.
```

### D3 — Copy del disclaimer (versión v1)
```
Texto en 4 locales (`booking.disclaimer.v1.body`):
- es-LATAM: "El acuerdo final, el pago y cualquier contrato ocurren fuera de EventFlow. La plataforma no procesa pagos ni cobra penalizaciones. Al continuar, confirmas que entiendes y aceptas estas condiciones."
- es-ES: equivalente con localismos.
- pt: traducción profesional.
- en: traducción profesional.

Constante: `BOOKING_DISCLAIMER_COPY_VERSION = 'v1'`.

Copy revisado por legal (Documentation Alignment no bloqueante para implementación).
```

### D4 — Componente compartido `BookingDisclaimer`
```
Client Component `<BookingDisclaimer mode="create" | "confirm" onAcceptedChange={(accepted: boolean) => void} />`.

Renderiza:
- Texto del disclaimer (i18n) con `aria-describedby`.
- Checkbox con label asociado.
- Versión visible (footer pequeño: "v1").

Reusable en `CreateBookingDialog` (US-060) y `ConfirmBookingDialog` (US-061). US-063 lo introduce y refactoriza los 2 dialogs para consumirlo.
```

### D5 — Log event `disclaimer.accepted`
```
Cada vez que el use case acepta el disclaimer (en create o confirm), emite log estructurado:
logger.info('disclaimer.accepted', {
  userId,
  bookingIntentId,
  action: 'create' | 'confirm',
  agreementCopyVersion: 'v1',
  acceptedAt: timestamp,
})

Audit trail completo.
```

### D6 — Sin disclaimer en cancel
```
La cancelación (US-062) NO requiere disclaimer adicional. La cancel sin penalty (BR-BOOKING-009) está suficientemente cubierta por el disclaimer aceptado en create y confirm.
```

### D7 — Versionado del copy
```
Constante `BOOKING_DISCLAIMER_COPY_VERSION = 'v1'` exportada de `src/shared/booking/disclaimer.ts`. Si el copy cambia (futuro), bump a `'v2'` y el log lo refleja automáticamente. Esto permite auditoría legal de qué versión aceptó cada user.

Almacenar `agreement_copy_version` en `booking_intents` también:
- `disclaimer_copy_version_create text NOT NULL DEFAULT 'v1'`.
- `disclaimer_copy_version_confirm text NULL`.

Migración menor (incluida en D2).
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Enforcement bilateral | Server-side en create + confirm (refactor US-061 D8) |
| 2 | Persistencia | 2 columnas timestamp + 2 columnas versión |
| 3 | Copy disclaimer | Texto único v1 en 4 locales |
| 4 | Componente | `BookingDisclaimer` shared client |
| 5 | Log | `disclaimer.accepted` audit estructurado |
| 6 | Cancel | Sin disclaimer adicional |
| 7 | Versionado | Constante + columnas version en DB |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-063-booking-disclaimer-visible.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
