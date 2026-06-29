# Technical Specification — US-062: Cancelar BookingIntent (bilateral + revert committed)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-062 |
| Source User Story | `management/user-stories/US-062-cancel-booking-intent.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-062-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-036 |
| Backlog Title | BookingIntent: crear, confirmar, cancelar |
| Backlog Execution Order | 62 |
| User Story Position in Backlog Item | 3 de 3 |
| Related User Stories in Backlog Item | US-060, US-061, US-062 |
| Epic | EPIC-CMP-001 |
| Backlog Item Dependencies | US-060, US-061, US-035..038 |
| Feature | Endpoint bilateral cancel + revert atómico committed (condicional) |
| Module / Domain | Booking / Budget |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-28 |
| Last Updated | 2026-06-28 |

---

## 2. Backlog Execution Context

US-062 cierra PB-P1-036 + EPIC-CMP-001. Execution order 62.

---

## 3. Executive Technical Summary

**Backend**:
- `CancelBookingIntentUseCase` con `prisma.$transaction`: SELECT FOR UPDATE BookingIntent + Quote + (BudgetItem opcional); detección de rol cancelador (organizer dueño o vendor target); validación estado; UPDATE intent → `cancelled` + audit fields; UPDATE BudgetItem con `MAX(0, ...)` si previo era `confirmed_intent`; 2 notifs a contraparte vía service común.
- Extensión del type a `'booking_intent.cancelled'` (8 eventos total).
- Controller `POST /api/v1/booking-intents/:id/cancel` (compartido organizer/vendor).
- Logger.
- Migración menor: verificar/agregar `cancelled_at`/`cancelled_by`/`cancellation_reason` en `booking_intents`.

**Frontend**:
- `CancelBookingDialog` accesible compartido (organizer/vendor) con textarea opcional.
- `bookingsApi.cancel` + MSW + i18n.

---

## 4. Scope Boundary

### In Scope
- UseCase bilateral + DTO + controller + ruta + service refactor.
- Migración menor (audit columns si faltan).
- Frontend dialog compartido + API + i18n.
- Tests + regresión.

### Out of Scope
- Penalty.
- Reactivación.
- Pagos / refunds.

---

## 5. Architecture Alignment

Extensión de `modules/booking`. Reuso del service común.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 cancel confirmed_intent | UseCase + revert + notif | BE, DB |
| AC-02 cancel pending | UseCase sin revert + notif | BE |
| AC-03 sin reason | Service maneja null | BE |
| EC-01..06 | Validaciones + underflow | BE |
| AUTH-TS-01..06 | Guards bilaterales | BE |
| A11Y | Dialog accesible | FE |
| i18n | `booking.cancel.*` | FE |

---

## 7. Backend Technical Design

### Use Case

```ts
class CancelBookingIntentUseCase {
  async execute({ currentUser, bookingIntentId, body }) {
    return prisma.$transaction(async (tx) => {
      const intent = await tx.booking_intents.findFirst({
        where: { id: bookingIntentId },
        include: {
          quote: {
            include: {
              quote_request: {
                include: { event: { include: { budget: true } } },
              },
              vendor_profile: { select: { user_id: true } },
            },
          },
        },
        // SELECT FOR UPDATE
      });
      if (!intent) throw new BookingIntentNotFoundError();

      const event = intent.quote.quote_request.event;
      const isOrganizer = event.organizer_user_id === currentUser.id;
      const isVendor = intent.quote.vendor_profile.user_id === currentUser.id;
      if (!isOrganizer && !isVendor) throw new BookingIntentNotFoundError(); // uniforme

      const cancelledByRole: 'organizer' | 'vendor' = isOrganizer ? 'organizer' : 'vendor';

      const ACTIVE = ['pending', 'confirmed_intent'];
      if (!ACTIVE.includes(intent.status)) throw new BookingIntentNotCancellableError(intent.status);

      const wasConfirmed = intent.status === 'confirmed_intent';
      let committedReverted = false;

      // 1) Update intent
      const updated = await tx.booking_intents.update({
        where: { id: bookingIntentId },
        data: {
          status: 'cancelled',
          cancelled_at: new Date(),
          cancelled_by: currentUser.id,
          cancellation_reason: body.reason ?? null,
        },
      });

      // 2) Revert committed (si era confirmed_intent)
      if (wasConfirmed) {
        const qr = intent.quote.quote_request;
        const budget = event.budget;
        const budgetItem = await tx.budget_items.findFirst({
          where: { budget_id: budget.id, service_category_id: qr.service_category_id },
        });

        if (budgetItem) {
          const totalPrice = intent.quote.total_price;
          const newCommitted = budgetItem.committed.minus(totalPrice);

          if (newCommitted.lessThan(0)) {
            logger.warn('budget.committed_underflow_corrected', {
              budgetItemId: budgetItem.id,
              previousCommitted: budgetItem.committed.toString(),
              attemptedSubtraction: totalPrice.toString(),
            });
          }

          await tx.budget_items.update({
            where: { id: budgetItem.id },
            data: { committed: Prisma.Decimal.max(new Prisma.Decimal(0), newCommitted) },
          });

          committedReverted = true;
        }
      }

      // 3) Notify counterpart
      const recipientUserId = isOrganizer
        ? intent.quote.vendor_profile.user_id
        : event.organizer_user_id;

      await quoteEventNotificationService.emit({
        recipientUserId,
        eventName: 'booking_intent.cancelled',
        payload: {
          booking_intent_id: bookingIntentId,
          quote_id: intent.quote_id,
          quote_request_id: intent.quote.quote_request.id,
          event_id: event.id,
          cancelled_by_role: cancelledByRole,
          cancellation_reason: body.reason ?? null,
          committed_reverted: committedReverted,
        },
        tx,
      });

      logger.info('booking_intent.cancelled', {
        bookingIntentId, cancelledByRole, wasConfirmed, committedReverted,
      });

      return { ...updated, cancelled_by_role: cancelledByRole, committed_reverted: committedReverted };
    });
  }
}
```

### Service Refactor
Type extendido (8 eventos):
```ts
type QuoteEventName = ... | 'booking_intent.cancelled';
```

### Routes
```ts
router.post(
  '/booking-intents/:id/cancel',
  bilateralRoleGuard, // permite organizer y vendor
  adminExclusionGuard,
  asyncHandler(controller.cancel.bind(controller))
);
```

### DTOs

```ts
export const bookingIntentIdParam = z.object({ id: z.string().uuid() });
export const cancelBookingIntentBody = z.object({
  reason: z.string().max(500).optional(),
}).strict();
```

### Error Handling
Códigos: `400 INVALID_UUID`, `400 INVALID_CANCELLATION_REASON`, `401`, `403`, `404 BOOKING_INTENT_NOT_FOUND`, `409 BOOKING_INTENT_NOT_CANCELLABLE`.

---

## 8. Frontend Technical Design

- `CancelBookingDialog` (Client Component compartido): modal `role="dialog"` con focus trap, ESC, textarea opcional para reason, CTA "Cancelar BookingIntent".
- Hook `useCancelBooking` con TanStack mutation + invalidate de queries de booking + budget.
- Render condicional según rol (label idéntico).

---

## 9. API Contract

| Method | Endpoint | Request | Response | Errors |
|---|---|---|---|---|
| POST | `/api/v1/booking-intents/:id/cancel` | `{ reason?: string [0..500] }` | `200 { booking_intent_id, status, cancelled_at, cancelled_by, cancelled_by_role, cancellation_reason, committed_reverted }` | 400, 401, 403 (admin), 404 BOOKING_INTENT_NOT_FOUND, 409 BOOKING_INTENT_NOT_CANCELLABLE |

---

## 10. Database / Prisma Design

### Models Impacted
`BookingIntent` (update), `BudgetItem` (update si revert), `Budget` (read), `Quote` (read), `QuoteRequest` (read), `Event` (read), `VendorProfile` (read), `Notification` (write).

### Migración menor
Verificar columnas en `booking_intents`:
- `cancelled_at timestamptz NULL`
- `cancelled_by uuid NULL`
- `cancellation_reason text NULL`

Si faltan, añadir + FK opcional `cancelled_by → users.id`.

### Seed Impact
Reuso (BookingIntents pending + confirmed_intent generados por seeds anteriores).

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design
Ver §SEC US.

## 13. Testing Strategy

### Unit
- DTO + UseCase branches (organizer/vendor, pending/confirmed_intent, sin reason, underflow, cancelled).

### Integration
- TS-01..TS-05.
- Regresión: US-053..061 siguen funcionando con service común a 8 eventos.
- Concurrencia: 2 cancels simultáneos ⇒ uno gana, otro idempotente.

### API
Supertest cubriendo códigos.

### Security
- `404 BOOKING_INTENT_NOT_FOUND` uniforme bilateral.

### Accessibility
axe + RTL del dialog.

### Performance
`< 500ms`.

---

## 14. Observability & Audit

Logs `booking_intent.cancelled`, `budget.committed_underflow_corrected` (warn cuando aplica).

---

## 15. Seed / Demo
Reuso. BookingIntent `confirmed_intent` propio del organizer demo para validar revert.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Falta documentar endpoint cancel bilateral | Documentar. | Actualizar. | No |
| `docs/14` | Documentar interacción Booking → Budget revert. | Documentar. | Actualizar. | No |
| Schema BookingIntent audit | Posible falta de columnas | Verificar | Migración menor si aplica | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Race 2 cancels simultáneos | Doble notif / doble revert | SELECT FOR UPDATE + idempotencia |
| Underflow committed | Datos inconsistentes | `MAX(0, ...)` + log warn |
| Service común breaking | Regresión 7 eventos previos | Tests integrales |
| Notif a contraparte equivocada | UX confusa | Determinación basada en rol cancelador + tests bilaterales |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/booking/dto/cancel-booking-intent.body.ts` (nuevo)
- `src/modules/booking/use-cases/cancel-booking-intent.use-case.ts` (nuevo)
- `src/modules/booking/controllers/booking.controller.ts` (extender o nuevo compartido)
- `src/modules/booking/routes/booking.routes.ts` (extender o nuevo compartido)
- `src/modules/booking/guards/bilateral-role.guard.ts` (nuevo)
- `src/modules/quotes/services/quote-event-notification.service.ts` (extender type)
- `src/shared/logging/booking-events.ts` (extender)
- Migración Prisma si columnas faltan.

**Frontend**:
- `components/booking/CancelBookingDialog.tsx` (compartido)
- `lib/api/bookingsApi.ts` (nuevo, compartido)
- `messages/{4 locales}.json`

### Orden sugerido
1. DB-001 (verificar + migración audit).
2. Extender service común + UT.
3. DTO + UT.
4. UseCase + UT (todas las branches bilaterales).
5. BilateralRoleGuard + UT.
6. Controller + ruta.
7. Logger.
8. Frontend API + MSW.
9. Dialog accesible.
10. i18n.
11. Tests IT + regresión + concurrencia + AUTH bilateral + A11Y.
12. Documentación.

### Decisiones que no deben reabrirse
D1–D8.

### Qué no implementar
- Penalty.
- Reactivación.
- Refunds.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 2 (verify + migración) |
| BE | 6 |
| FE | 3 |
| QA | 6 |
| DOC | 1 |
| **Total** | 18 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Cross-module impact clear | Pass (Booking → Budget revert) |
| Security clear | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-062 cierra PB-P1-036 + EPIC-CMP-001 con cancelación bilateral + revert atómico condicional del committed + extensión del service común a 8 eventos del lifecycle Quote/BookingIntent. La protección de underflow con `MAX(0, ...)` garantiza integridad presupuestaria.
