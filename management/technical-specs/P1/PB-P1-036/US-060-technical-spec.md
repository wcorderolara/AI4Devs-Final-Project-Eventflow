# Technical Specification — US-060: Crear BookingIntent (aceptación atómica)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-060 |
| Source User Story | `management/user-stories/US-060-create-booking-intent.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-060-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-036 |
| Backlog Title | BookingIntent: crear, confirmar, cancelar |
| Backlog Execution Order | 60 |
| User Story Position in Backlog Item | 1 de 3 (US-060 → US-061 → US-062) |
| Related User Stories in Backlog Item | US-060, US-061, US-062 |
| Epic | EPIC-CMP-001 |
| Backlog Item Dependencies | PB-P1-031, PB-P1-035, US-054/056/058 (service común), PB-P0-001 |
| Feature | Endpoint atómico Quote→accepted + BookingIntent→pending + 2 notifs |
| Module / Domain | Booking |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-28 |
| Last Updated | 2026-06-28 |

---

## 2. Backlog Execution Context

US-060 abre PB-P1-036. Execution order 60.

---

## 3. Executive Technical Summary

US-060 entrega:

**Backend**:
- `CreateBookingIntentUseCase` con `prisma.$transaction`: SELECT FOR UPDATE Quote/Event + verificación ownership + UPDATE Quote `accepted` + INSERT BookingIntent `pending` + invoca `QuoteEventNotificationService.emit({eventName:'booking_intent.created'})`.
- Extensión del type del service común para `'booking_intent.created'`.
- DTO Zod `.strict()` que rechaza campos de pago.
- Controller `POST /api/v1/organizer/booking-intents`.
- Logger.
- Migración menor: UNIQUE parcial `booking_intents (quote_id) WHERE status IN ('pending','confirmed_intent')`. Verificar `quotes.accepted_at`.

**Frontend**:
- `CreateBookingDialog` accesible con checkbox disclaimer.
- `organizerApi.bookings.create` + MSW.
- i18n 4 locales.

---

## 4. Scope Boundary

### In Scope
- UseCase atómico + DTO `.strict()` + controller + ruta.
- Refactor minimal del service común (extender type).
- Migración menor (UNIQUE parcial).
- Frontend dialog + API + i18n.
- Tests + regresión service común.

### Out of Scope
- Pagos reales (FR-BOOKING-007).
- Confirmación vendor (US-061).
- Cancelación (US-062).
- Contratos.

### Explicit Non-Goals
- No introducir nuevas tablas más allá del schema base.

---

## 5. Architecture Alignment

Extensión de `modules/booking` (nuevo módulo o sub-módulo de quotes). Reuso del service común de notifs.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 creación atómica | UseCase transaccional + service | BE, DB |
| AC-02 disclaimer | DTO validación server-side | BE |
| AC-03 no pagos | DTO `.strict()` | BE |
| EC-01..05 | Validaciones | BE |
| AUTH-TS-01..05 | Guards + 404 uniforme | BE |
| A11Y | Modal + disclaimer accesible | FE |
| i18n | `organizer.booking.create.*` | FE |

---

## 7. Backend Technical Design

### Use Case

```ts
class CreateBookingIntentUseCase {
  async execute({ currentUser, body }) {
    return prisma.$transaction(async (tx) => {
      const quote = await tx.quotes.findFirst({ where: { id: body.quote_id } /* SELECT FOR UPDATE */ });
      if (!quote) throw new QuoteNotFoundError();

      const qr = await tx.quote_requests.findUnique({
        where: { id: quote.quote_request_id },
        select: { event_id: true, vendor_profile_id: true },
      });
      const event = await tx.events.findUnique({
        where: { id: qr.event_id },
        select: { organizer_user_id: true },
      });
      if (event.organizer_user_id !== currentUser.id) throw new QuoteNotFoundError(); // uniforme

      const ALLOWED = ['sent','responded','preferred'];
      if (!ALLOWED.includes(quote.status)) throw new QuoteNotAcceptableError(quote.status);

      const today = new Date();
      if (quote.valid_until && new Date(quote.valid_until) < today) {
        throw new QuoteExpiredError(quote.valid_until);
      }

      const existing = await tx.booking_intents.findFirst({
        where: { quote_id: body.quote_id, status: { in: ['pending','confirmed_intent'] } },
        select: { id: true },
      });
      if (existing) throw new BookingIntentAlreadyExistsError(existing.id);

      const vendor = await tx.vendor_profiles.findUnique({
        where: { id: qr.vendor_profile_id },
        select: { user_id: true },
      });

      // 1) Update Quote
      await tx.quotes.update({
        where: { id: body.quote_id },
        data: { status: 'accepted', accepted_at: today },
      });

      // 2) Insert BookingIntent
      const intent = await tx.booking_intents.create({
        data: {
          quote_id: body.quote_id,
          status: 'pending',
          created_by: currentUser.id,
        },
      });

      // 3) Notify vendor
      await quoteEventNotificationService.emit({
        recipientUserId: vendor.user_id,
        eventName: 'booking_intent.created',
        payload: {
          booking_intent_id: intent.id,
          quote_id: body.quote_id,
          quote_request_id: quote.quote_request_id,
          event_id: qr.event_id,
        },
        tx,
      });

      logger.info('booking_intent.created', {
        bookingIntentId: intent.id,
        quoteId: body.quote_id,
        organizerUserId: currentUser.id,
      });

      return intent;
    });
  }
}
```

### Service Refactor

Type extendido:
```ts
type QuoteEventName =
  | 'quote.rejected'
  | 'quote.expired'
  | 'quote_request.cancelled'
  | 'quote.marked_preferred'
  | 'quote.unmarked_preferred'
  | 'booking_intent.created';  // <-- new
```

(El nombre del service puede mantenerse `QuoteEventNotificationService` ya que opera sobre eventos del lifecycle Quote/Booking. Alternativa cosmética: renombrar a `BookingLifecycleNotificationService` en US futura — no obligatorio para MVP.)

### Routes

```ts
router.post(
  '/organizer/booking-intents',
  organizerRoleGuard,
  vendorExclusionGuard,
  adminExclusionGuard,
  asyncHandler(controller.create.bind(controller))
);
```

### DTOs

```ts
export const createBookingIntentBody = z.object({
  quote_id: z.string().uuid(),
  disclaimer_accepted: z.literal(true),
}).strict();
```

`.strict()` garantiza FR-BOOKING-007: cualquier campo de pago ⇒ `400 INVALID_BODY`.

### Error Handling
Códigos: `400 INVALID_UUID`, `400 INVALID_BODY`, `400 DISCLAIMER_REQUIRED`, `401`, `403`, `404 QUOTE_NOT_FOUND`, `409 QUOTE_NOT_ACCEPTABLE`, `409 QUOTE_EXPIRED`, `409 BOOKING_INTENT_ALREADY_EXISTS`.

---

## 8. Frontend Technical Design

- `CreateBookingDialog` (Client Component): modal `role="dialog"`, focus trap, ESC, checkbox disclaimer con `aria-describedby` para el texto legal i18n. CTA habilitado solo cuando `disclaimerAccepted === true`.
- TanStack `useMutation` con invalidate de queries de Quote/comparador.
- Display del precio + currency del evento (read-only).

---

## 9. API Contract

| Method | Endpoint | Request | Response | Errors |
|---|---|---|---|---|
| POST | `/api/v1/organizer/booking-intents` | `{ quote_id, disclaimer_accepted: true }` | `201 { booking_intent_id, quote_id, status: "pending", created_at }` | 400 (INVALID_UUID/INVALID_BODY/DISCLAIMER_REQUIRED), 401, 403, 404 QUOTE_NOT_FOUND, 409 (QUOTE_NOT_ACCEPTABLE/QUOTE_EXPIRED/BOOKING_INTENT_ALREADY_EXISTS) |

---

## 10. Database / Prisma Design

### Models Impacted
`BookingIntent` (insert), `Quote` (update), `QuoteRequest` (read), `Event` (read), `VendorProfile` (read), `Notification` (write).

### Migración menor

1. Verificar `quotes.accepted_at timestamptz NULL`. Si falta, añadir.
2. Verificar `booking_intents.created_by uuid NOT NULL`. Si falta, añadir + FK a `users.id`.
3. UNIQUE parcial: `CREATE UNIQUE INDEX uq_booking_intents_active_per_quote ON booking_intents (quote_id) WHERE status IN ('pending','confirmed_intent');`.

### Indexes
UNIQUE parcial nuevo.

### Seed Impact
Añadir BookingIntent `pending` y BookingIntent `confirmed_intent` para demos de US-061/062.

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design

- Sesión organizer + ownership del evento.
- `404 QUOTE_NOT_FOUND` uniforme.
- DTO `.strict()` (FR-BOOKING-007).
- Sin captura ni almacenamiento de medios de pago.
- Disclaimer enforcement server-side.

## 13. Testing Strategy

### Unit
- DTO + UseCase branches (mark, sin disclaimer, sin pagos, estados, vencido, UNIQUE).

### Integration
- TS-01..TS-05.
- Regresión: US-053/054/056/058 siguen funcionando con service común extendido.
- Concurrencia: 2 POST simultáneos ⇒ uno gana, otro `409 BOOKING_INTENT_ALREADY_EXISTS`.

### API
Supertest cubriendo todos los códigos.

### E2E
Playwright para `CreateBookingDialog` con disclaimer.

### Security
- DTO `.strict()` rechaza `payment_method`, `card_token`, `amount_paid`, `payment_intent_id`.
- `404 QUOTE_NOT_FOUND` uniforme.
- FR-BOOKING-007 explícito.

### Accessibility
axe + RTL del modal + checkbox.

### Performance
`< 500ms` por POST.

---

## 14. Observability & Audit

Log `booking_intent.created` + `quote.notification.emitted`.

---

## 15. Seed / Demo Data Impact

Quote `responded` propia del organizer + opcional flujo demo.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Falta documentar endpoint | Documentar. | Actualizar `docs/16`. | No |
| `docs/14 §Jobs/Module` | Documentar `modules/booking`. | Documentar. | Actualizar `docs/14`. | No |
| Schema `booking_intents` | UNIQUE parcial | Migración. | Aplicar. | No (migración menor) |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Race 2 POST simultáneos | Doble BookingIntent | UNIQUE parcial + SELECT FOR UPDATE de Quote |
| Service común breaking | US-053..058 fallan | Tests regresión integral |
| DTO laxa permite campos de pago | FR-BOOKING-007 violation | `.strict()` enforced + test seguridad |
| Notif falla → Quote queda accepted sin BookingIntent | Inconsistencia | Transacción rollback |
| Disclaimer bypass desde cliente | Compliance | Server-side enforcement obligatorio |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/booking/dto/create-booking-intent.body.ts` (nuevo)
- `src/modules/booking/use-cases/create-booking-intent.use-case.ts` (nuevo)
- `src/modules/booking/controllers/organizer-booking.controller.ts` (nuevo)
- `src/modules/booking/routes/organizer-booking.routes.ts` (nuevo)
- `src/modules/quotes/services/quote-event-notification.service.ts` (extender type)
- `src/shared/logging/booking-events.ts` (nuevo)
- Migración Prisma: `add_uq_booking_intents_active_per_quote_and_audit_columns`.

**Frontend**:
- `components/organizer/booking/CreateBookingDialog.tsx`
- `lib/api/organizerApi.ts` (extender con `bookings.create`)
- `messages/{4 locales}.json`

### Orden sugerido

1. DB-001 + migración.
2. DTO + UT.
3. Extender service común + UT.
4. UseCase + UT (todas las branches).
5. Controller + ruta.
6. Logger.
7. Frontend API + MSW.
8. Dialog accesible.
9. i18n.
10. Tests IT + Concurrencia + Security + A11Y + regresión.
11. Documentación.

### Decisiones que no deben reabrirse
D1–D8.

### Qué no implementar
- Pagos.
- Confirmación vendor (US-061).
- Cancelación (US-062).
- Endpoint separado de "accept Quote".

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
| Migration plan clear | Pass |
| Security clear | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-060 abre PB-P1-036 con endpoint atómico de aceptación + creación de BookingIntent + extensión del service común a 6 eventos + UNIQUE parcial nuevo + DTO `.strict()` que enforcea FR-BOOKING-007 (sin pagos). US-061 (confirm vendor) y US-062 (cancel) completarán el ciclo.
