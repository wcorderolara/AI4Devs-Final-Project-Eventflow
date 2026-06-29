# Technical Specification — US-061: Confirmar BookingIntent + UPDATE committed atómico

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-061 |
| Source User Story | `management/user-stories/US-061-vendor-confirm-booking-intent.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-061-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-036 |
| Backlog Title | BookingIntent: crear, confirmar, cancelar |
| Backlog Execution Order | 61 |
| User Story Position in Backlog Item | 2 de 3 |
| Related User Stories in Backlog Item | US-060, US-061, US-062 |
| Epic | EPIC-CMP-001 |
| Backlog Item Dependencies | US-060, US-035..038 (Budget), PB-P0-001 |
| Feature | Endpoint vendor confirm + UPDATE/INSERT BudgetItem.committed + notif organizer |
| Module / Domain | Booking / Budget |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-28 |
| Last Updated | 2026-06-28 |

---

## 2. Backlog Execution Context

US-061 es 2 de 3 en PB-P1-036. Execution order 61.

---

## 3. Executive Technical Summary

**Backend**:
- `ConfirmBookingIntentUseCase` con `prisma.$transaction`: SELECT FOR UPDATE BookingIntent + Quote + QR + BudgetItem; validación vendor target + estado; UPDATE BookingIntent → `confirmed_intent`; UPDATE BudgetItem.committed o INSERT si falta; 2 notifs organizer vía service común.
- Extensión del type a `'booking_intent.confirmed'` (7 eventos).
- Controller `POST /api/v1/vendor/booking-intents/:id/confirm`.
- Logger.

**Frontend**:
- `ConfirmBookingDialog` accesible con disclaimer informativo.
- `vendorApi.bookings.confirm` + MSW + i18n.

Sin migraciones obligatorias (verificar índice `budget_items (budget_id, service_category_id)`).

---

## 4. Scope Boundary

### In Scope
- UseCase atómico + DTO + controller + ruta + service refactor.
- Auto-create BudgetItem cuando falta.
- Frontend dialog + API + i18n.
- Tests + regresión.

### Out of Scope
- Pagos.
- Cancelación (US-062).
- Edición del committed por el vendor.

---

## 5. Architecture Alignment

Extensión de `modules/booking`. Reuso del service común.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 confirm + UPDATE | UseCase transaccional 3-step | BE, DB |
| AC-02 auto-create BudgetItem | INSERT en branch | BE |
| AC-03 idempotencia | Early return si confirmed_intent | BE |
| EC-01..04 | Validaciones | BE |
| AUTH-TS-01..05 | Guards + 404 uniforme | BE |
| A11Y | Dialog + disclaimer | FE |
| i18n | `vendor.booking.confirm.*` | FE |

---

## 7. Backend Technical Design

### Use Case

```ts
class ConfirmBookingIntentUseCase {
  async execute({ currentUser, bookingIntentId }) {
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

      // Auth: vendor target
      if (intent.quote.vendor_profile.user_id !== currentUser.id) {
        throw new BookingIntentNotFoundError(); // uniforme
      }

      // Idempotency
      if (intent.status === 'confirmed_intent') return intent;
      if (intent.status !== 'pending') throw new BookingIntentNotConfirmableError(intent.status);

      const qr = intent.quote.quote_request;
      const event = qr.event;
      const budget = event.budget;
      const totalPrice = intent.quote.total_price;
      const categoryId = qr.service_category_id;

      // Currency sanity check
      if (intent.quote.currency_code !== event.currency_code) {
        logger.warn('booking.confirm.currency_mismatch', {
          bookingIntentId, eventCurrency: event.currency_code, quoteCurrency: intent.quote.currency_code,
        });
      }

      // 1) Update intent
      const updatedIntent = await tx.booking_intents.update({
        where: { id: bookingIntentId },
        data: { status: 'confirmed_intent', confirmed_at: new Date() },
      });

      // 2) Update/Insert BudgetItem
      const existingItem = await tx.budget_items.findFirst({
        where: { budget_id: budget.id, service_category_id: categoryId },
      });

      if (existingItem) {
        const newCommitted = existingItem.committed.plus(totalPrice);
        await tx.budget_items.update({
          where: { id: existingItem.id },
          data: { committed: newCommitted },
        });

        // Warning si excede planned (sin bloquear)
        if (newCommitted.greaterThan(budget.total_planned ?? 0)) {
          logger.warn('budget.committed_exceeds_planned', {
            budgetId: budget.id, committed: newCommitted.toString(),
          });
        }
      } else {
        await tx.budget_items.create({
          data: {
            budget_id: budget.id,
            service_category_id: categoryId,
            planned: 0,
            committed: totalPrice,
          },
        });
        logger.info('budget_item.auto_created_on_booking_confirm', {
          budgetId: budget.id, categoryId, bookingIntentId,
        });
      }

      // 3) Notify organizer
      await quoteEventNotificationService.emit({
        recipientUserId: event.organizer_user_id,
        eventName: 'booking_intent.confirmed',
        payload: {
          booking_intent_id: updatedIntent.id,
          quote_id: intent.quote_id,
          quote_request_id: qr.id,
          event_id: event.id,
          vendor_profile_id: intent.quote.vendor_profile_id,
          total_price: totalPrice.toString(),
          currency_code: event.currency_code,
        },
        tx,
      });

      logger.info('booking_intent.confirmed', { bookingIntentId, vendorUserId: currentUser.id });

      return updatedIntent;
    });
  }
}
```

### Service Refactor
Type extendido:
```ts
type QuoteEventName = ... | 'booking_intent.created' | 'booking_intent.confirmed'; // 7 events
```

### Routes
```ts
router.post(
  '/vendor/booking-intents/:id/confirm',
  vendorRoleGuard,
  organizerExclusionGuard,
  adminExclusionGuard,
  asyncHandler(controller.confirm.bind(controller))
);
```

### DTOs

```ts
export const bookingIntentIdParam = z.object({ id: z.string().uuid() });
```

Body vacío (sin disclaimer enforcement server por D8).

### Error Handling
Códigos: `400 INVALID_UUID`, `401`, `403`, `404 BOOKING_INTENT_NOT_FOUND`, `409 BOOKING_INTENT_NOT_CONFIRMABLE`.

---

## 8. Frontend Technical Design

- `ConfirmBookingDialog` (Client Component): modal `role="dialog"` con focus trap, ESC; texto del disclaimer FR-BOOKING-006 con `aria-describedby`; CTA "Confirmar".
- TanStack mutation con invalidate.
- Display de `total_price` + `currency_code` (read-only).

---

## 9. API Contract

| Method | Endpoint | Request | Response | Errors |
|---|---|---|---|---|
| POST | `/api/v1/vendor/booking-intents/:id/confirm` | (body vacío) | `200 { booking_intent_id, status: "confirmed_intent", confirmed_at }` | 400 (UUID), 401, 403, 404 BOOKING_INTENT_NOT_FOUND, 409 BOOKING_INTENT_NOT_CONFIRMABLE |

---

## 10. Database / Prisma Design

### Models Impacted
`BookingIntent` (update), `BudgetItem` (update/insert), `Budget` (read), `Quote` (read), `QuoteRequest` (read), `Event` (read), `VendorProfile` (read), `Notification` (write).

### Indexes
Verificar (DB-001):
- `budget_items (budget_id, service_category_id)` para UPDATE eficiente.
- Considerar UNIQUE en `(budget_id, service_category_id)` para evitar duplicados (UPSERT semantics).

### Migrations Impact
Posible 1 migración menor (UNIQUE en budget_items si falta).

### Seed Impact
Reuso del seed de US-060 (BookingIntent `pending` + Budget existente).

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design
Ver §SEC US.

## 13. Testing Strategy

### Unit
- UseCase branches: confirm + auto-create + idempotencia + cancelled + currency mismatch + committed > planned.

### Integration
- TS-01..TS-05.
- Regresión: US-053/054/056/058/060 siguen funcionando con service común extendido.
- Concurrencia: 2 confirms simultáneos del mismo BookingIntent ⇒ uno gana, otro idempotente.

### API
Supertest.

### Security
- `404 BOOKING_INTENT_NOT_FOUND` uniforme.

### Accessibility
axe + RTL del dialog.

### Performance
`< 500ms`.

---

## 14. Observability & Audit

Logs `booking_intent.confirmed`, `budget_item.auto_created_on_booking_confirm`, `budget.committed_exceeds_planned`, `booking.confirm.currency_mismatch`.

---

## 15. Seed / Demo

Reuso (US-060 ya prevé BookingIntent `pending` demo + presupuesto con BudgetItem o sin él para validar auto-create).

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Falta documentar endpoint vendor confirm | Documentar. | Actualizar. | No |
| `docs/14 §Booking/Budget` | Documentar interacción cross-module. | Documentar. | Actualizar. | No |
| Schema budget_items UNIQUE | Posible falta | Verificar. | Migración menor si corresponde. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Race 2 confirms simultáneos | Doble actualización committed | SELECT FOR UPDATE + idempotencia |
| BudgetItem ausente | Falla del flujo | Auto-create con `planned=0` |
| Currency mismatch | Inconsistencia presupuesto | Log warn; en producción real es imposible por BR-QUOTE-019 |
| Service común breaking | Regresión | Tests integrales |
| Decimal arithmetic errors | Cálculos incorrectos | Usar `Prisma.Decimal` |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/booking/use-cases/confirm-booking-intent.use-case.ts` (nuevo)
- `src/modules/booking/controllers/vendor-booking.controller.ts` (nuevo)
- `src/modules/booking/routes/vendor-booking.routes.ts` (nuevo)
- `src/modules/quotes/services/quote-event-notification.service.ts` (extender type)
- `src/shared/logging/booking-events.ts` (extender)

**Frontend**:
- `components/vendor/booking/ConfirmBookingDialog.tsx`
- `lib/api/vendorApi.ts` (extender con `bookings.confirm`)
- `messages/{4 locales}.json`

### Orden sugerido
1. DB-001 (índice + UNIQUE opcional).
2. Extender service común + UT.
3. UseCase + UT (todas las branches).
4. Controller + ruta.
5. Logger.
6. Frontend API + MSW.
7. Dialog accesible.
8. i18n.
9. Tests IT + regresión + concurrencia + AUTH + A11Y.
10. Documentación.

### Decisiones que no deben reabrirse
D1–D8.

### Qué no implementar
- Cancelación (US-062).
- Edición committed por vendor.
- Disclaimer server-side enforcement.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 1 |
| BE | 5 |
| FE | 3 |
| QA | 6 |
| DOC | 1 |
| **Total** | 16 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Cross-module impact clear | Pass (Booking → Budget) |
| Security clear | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-061 entrega el efecto cross-domain (Booking → Budget) con auto-create de BudgetItem ausente, idempotencia, y extensión del service común a 7 eventos. US-062 cerrará PB-P1-036 con la cancelación.
