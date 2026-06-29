# Technical Specification — US-054: Reject endpoint + QuoteNotificationService

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-054                                                                                                         |
| Source User Story                    | `management/user-stories/US-054-notify-vendor-quote-rejected-expired.md`                                       |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-054-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-032                                                                                                      |
| Backlog Title                        | Notificación a vendor por Quote rechazada/expirada                                                              |
| Backlog Execution Order              | 54                                                                                                              |
| User Story Position in Backlog Item  | 1 de 1                                                                                                          |
| Related User Stories in Backlog Item | US-054                                                                                                         |
| Epic                                 | EPIC-QR-001                                                                                                    |
| Backlog Item Dependencies            | PB-P1-031 (US-051..053), PB-P0-001, `NotificationSenderPort` (US-049)                                          |
| Feature                              | Endpoint reject + `QuoteNotificationService` reusable + refactor US-053                                         |
| Module / Domain                      | Quotes / Notifications                                                                                         |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-28                                                                                                     |
| Last Updated                         | 2026-06-28                                                                                                     |

---

## 2. Backlog Execution Context

PB-P1-032 single-story. Execution order 54. Depende del módulo `modules/quotes` introducido en US-049/US-051..053.

---

## 3. Executive Technical Summary

US-054 entrega:

**Backend**:
- `QuoteNotificationService` con método `emitQuoteStateChange({ quote, vendorProfileId, eventName: 'quote.rejected' | 'quote.expired', payload, tx })`. Encapsula la inserción de las 2 Notifications (`in_app` + `email_simulated`) usando `NotificationSenderPort`.
- `RejectQuoteUseCase` (`prisma.$transaction`): SELECT FOR UPDATE de Quote + Event + verificación ownership + UPDATE `status='rejected' + rejected_at + rejection_reason?` + invoca `QuoteNotificationService` + log.
- Controller `OrganizerQuoteController` con `POST /api/v1/organizer/quotes/:id/reject`.
- Logger extension `quote.rejected`, `quote.notification.emitted`.
- Refactor del `ExpireQuotesUseCase` (US-053) para invocar `QuoteNotificationService` en lugar de duplicar la lógica.

**Frontend**:
- `RejectQuoteDialog` (modal accesible) integrable en la vista del organizer (US futura). MSW handler + i18n.

**Database**:
- Verificar columnas `quotes.rejection_reason text NULL` y `quotes.rejected_at timestamptz NULL`. Si faltan, migración menor.

---

## 4. Scope Boundary

### In Scope
- DTO Zod + use case + service + controller + ruta + logger.
- Refactor de US-053 para invocar el servicio.
- Frontend: `RejectQuoteDialog` accesible + API client + MSW.
- Tests.
- Documentación.

### Out of Scope
- Inbox del vendor (PB-P2-010).
- Vista comparativa del organizer (PB-P1-033).
- Email real con SMTP.
- Push / SMS.

### Explicit Non-Goals
- No introducir nuevas tablas.

---

## 5. Architecture Alignment

### Backend
Extensión de `modules/quotes`. Service-oriented para `QuoteNotificationService`.

### Frontend
Modal accesible reutilizable.

### Database
Reuso. Posible migración menor para `rejection_reason`/`rejected_at`.

### API
REST JSON.

### AI / PromptOps
No aplica.

### Security
Organizer + ownership + 404 uniforme + FR-NOTIF-005 aislamiento.

### Testing
Vitest + Supertest + RTL + axe.

---

## 6. Functional Interpretation

| Acceptance Criterion       | Technical Interpretation                                                                          | Impacted Layer(s) |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 rechazo               | UseCase transaccional + service común + 2 Notifications.                                          | BE, DB            |
| AC-02 expired reuso         | Refactor de US-053 invoca el mismo servicio.                                                       | BE                |
| AC-03 sin reason            | Service maneja null gracefully.                                                                    | BE                |
| EC-01..05                    | Validaciones server-side.                                                                          | BE                |
| AUTH-TS-01..05              | Guards + uniformidad 404.                                                                          | BE                |
| A11Y                       | `RejectQuoteDialog` accesible.                                                                     | FE                |
| i18n                       | `organizer.quote.reject.*`.                                                                       | FE                |

---

## 7. Backend Technical Design

### Service

```ts
// src/modules/quotes/services/quote-notification.service.ts
class QuoteNotificationService {
  constructor(private notificationSenderPort: NotificationSenderPort) {}

  async emitQuoteStateChange({
    quote,
    vendorUserId,
    eventName, // 'quote.rejected' | 'quote.expired'
    payload,
    tx,
  }): Promise<void> {
    await this.notificationSenderPort.notify({
      channel: 'in_app',
      recipientUserId: vendorUserId,
      event: eventName,
      deliveryStatus: 'delivered',
      payload,
      tx,
    });
    await this.notificationSenderPort.notify({
      channel: 'email_simulated',
      recipientUserId: vendorUserId,
      event: eventName,
      deliveryStatus: 'simulated',
      payload,
      tx,
    });
    logger.info('quote.notification.emitted', { eventName, quoteId: quote.id, vendorUserId });
  }
}
```

### Use Case (`RejectQuoteUseCase`)

```ts
class RejectQuoteUseCase {
  async execute({ currentUser, quoteId, body }) {
    return prisma.$transaction(async (tx) => {
      const quote = await tx.quotes.findFirst({ where: { id: quoteId } /* SELECT FOR UPDATE */ });
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

      if (quote.status !== 'sent') throw new QuoteNotRejectableError(quote.status);

      const vendor = await tx.vendor_profiles.findUnique({
        where: { id: qr.vendor_profile_id },
        select: { user_id: true },
      });

      const updated = await tx.quotes.update({
        where: { id: quoteId },
        data: { status: 'rejected', rejected_at: new Date(), rejection_reason: body.reason ?? null },
      });

      await quoteNotificationService.emitQuoteStateChange({
        quote: updated,
        vendorUserId: vendor.user_id,
        eventName: 'quote.rejected',
        payload: { quote_id: updated.id, quote_request_id: quote.quote_request_id, rejection_reason: body.reason ?? null },
        tx,
      });

      logger.info('quote.rejected', { quoteId, organizerUserId: currentUser.id });

      return updated;
    });
  }
}
```

### Controllers / Routes

```ts
router.post(
  '/organizer/quotes/:id/reject',
  organizerRoleGuard,
  vendorExclusionGuard,
  adminExclusionGuard,
  asyncHandler(controller.reject.bind(controller))
);
```

### DTOs / Schemas

```ts
export const quoteIdParam = z.object({ id: z.string().uuid() });

export const rejectQuoteBody = z.object({
  reason: z.string().max(500).optional(),
}).strict();
```

### Validation Rules

Ver §VR US.

### Error Handling

Códigos: `400 INVALID_UUID`, `400 INVALID_REJECTION_REASON`, `401`, `403`, `404 QUOTE_NOT_FOUND`, `409 QUOTE_NOT_REJECTABLE`.

### Transactions

`prisma.$transaction` con SELECT FOR UPDATE.

### Observability

Logs `quote.rejected`, `quote.notification.emitted`.

### Refactor de US-053

`ExpireQuotesUseCase` (US-053) ahora invoca `quoteNotificationService.emitQuoteStateChange({ quote, vendorUserId, eventName: 'quote.expired', payload: { quote_id, quote_request_id, valid_until }, tx })` en lugar de duplicar la inserción.

---

## 8. Frontend Technical Design

### Components

- `RejectQuoteDialog` (modal accesible: `role="dialog"`, focus trap, ESC, textarea opcional para reason).

### State Management

TanStack mutation `useRejectQuote` + invalidación de queries de Quote.

### Data Fetching

`organizerApi.quotes.reject(id, { reason? })`.

### Loading / Empty / Error / Success States

- Loading: spinner CTA.
- Error: banner i18n por código.
- Success: toast + close + invalidación.

### Accessibility

`role="dialog"`, focus trap, ESC, foco inicial en "Cancelar".

### i18n

`organizer.quote.reject.*` en 4 locales.

---

## 9. API Contract Design

| Method | Endpoint                                              | Purpose                              | Auth Required | Request                                                       | Response       | Error Cases                                                                                                                  |
| ------ | ----------------------------------------------------- | ------------------------------------ | ------------- | ------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/organizer/quotes/:id/reject`                | Rechazar Quote.                       | Sí (organizer) | Body opcional `{ reason?: string [0..500] }`.                | `200 Quote`.    | `400 INVALID_UUID`, `400 INVALID_REJECTION_REASON`, `401`, `403`, `404 QUOTE_NOT_FOUND`, `409 QUOTE_NOT_REJECTABLE`.       |

---

## 10. Database / Prisma Design

### Models Impacted

`Quote` (update), `Notification` (write), `QuoteRequest` (read), `Event` (read), `VendorProfile` (read).

### Fields / Columns

Confirmar en DB-001:
- `quotes.rejection_reason text NULL`.
- `quotes.rejected_at timestamptz NULL` (puede que ya exista per `docs/18 §16.2`).

Si faltan, migración menor.

### Indexes

Reuso de PK por `quote.id`.

### Migrations Impact

Posible 1 migración menor.

### Seed Impact

Añadir Quote `sent` propia del organizer demo para rechazar.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

Ver §SEC US.

---

## 13. Testing Strategy

### Unit Tests

- DTOs + service + use case branches.
- Verificar que el servicio inserta exactamente 2 Notifications.

### Integration Tests

- TS-01..TS-06 + NT-01..NT-07.
- Idempotencia: re-rechazo `409`.
- Aislamiento: vendor sólo ve sus notifs.
- Refactor US-053: job sigue creando 2 Notifications (regression).

### API Tests

Supertest cubriendo códigos.

### E2E Tests

Opcional Playwright para `RejectQuoteDialog`.

### Security Tests

- `404 QUOTE_NOT_FOUND` uniforme.

### Accessibility Tests

- Modal accesible.

### AI Tests

No aplica.

### Performance

`< 500ms` por reject.

---

## 14. Observability & Audit

Logs `quote.rejected`, `quote.notification.emitted`.

---

## 15. Seed / Demo Data Impact

Añadir Quote `sent` propia del organizer demo para rechazar.

---

## 16. Documentation Alignment Required

| Document / Source            | Conflict                                                              | Current Decision                              | Recommended Action                                          | Blocks Implementation? |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| `docs/16 §M07`               | Falta documentar endpoint reject.                                      | Documentar.                                    | Actualizar `docs/16`.                                       | No                     |
| PB-P1-032 Traceability       | El backlog item cita `FR-QUOTE-011` (comparativa).                     | Trazabilidad real registrada en US.            | Housekeeping del backlog.                                  | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                            | Impact                | Mitigation                                              |
| --------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| Race entre 2 POST reject simultáneos.                            | Doble notif.          | UPDATE con guard `WHERE status='sent'` + `SELECT FOR UPDATE`. |
| Notification falla → Quote queda en `rejected` sin notif.        | Estado inconsistente. | Transacción rollback.                                    |
| Refactor de US-053 introduce regresión.                          | Job deja de notificar. | Test de regresión integral en QA-002.                    |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/quotes/dto/reject-quote.body.ts`
- `src/modules/quotes/services/quote-notification.service.ts` (nuevo)
- `src/modules/quotes/use-cases/reject-quote.use-case.ts`
- `src/modules/quotes/use-cases/expire-quotes.use-case.ts` (refactor para invocar el service)
- `src/modules/quotes/controllers/organizer-quote.controller.ts`
- `src/modules/quotes/routes/organizer-quote.routes.ts`
- `src/shared/logging/quote-events.ts` (extender)

**Frontend**:
- `components/organizer/quote/RejectQuoteDialog.tsx`
- `lib/api/organizerApi.ts` (extender con namespace `quotes.reject`)
- `messages/{es-LATAM,es-ES,pt,en}.json` (extender)

### Orden sugerido

1. DB-001.
2. DTO + UT.
3. `QuoteNotificationService` + UT.
4. `RejectQuoteUseCase` + UT.
5. Refactor de `ExpireQuotesUseCase` para invocar el service.
6. Controller + ruta.
7. Logger.
8. Frontend `organizerApi.quotes.reject` + MSW.
9. `RejectQuoteDialog`.
10. i18n.
11. Tests IT + regresión US-053 + AUTH + A11Y.
12. Documentación.

### Decisiones que no deben reabrirse

D1–D8.

### Qué no implementar

- Inbox del vendor.
- Vista comparativa.
- Email real.

---

## 19. Task Generation Notes

| Grupo | Tasks |
| ----- | ----: |
| DB    | 1 |
| BE    | 6 |
| FE    | 3 |
| QA    | 5 |
| DOC   | 1 |

**Total estimado ~16 tareas.**

---

## 20. Technical Spec Readiness

| Check                                                       | Status |
| ----------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec    | Pass   |
| Product Backlog mapping found                                | Pass   |
| Decision Resolution reviewed if present                      | Pass   |
| Scope clear                                                  | Pass   |
| Architecture alignment clear                                 | Pass   |
| API impact clear                                             | Pass   |
| DB impact clear                                              | Pass   |
| AI impact clear                                              | N/A    |
| Security impact clear                                        | Pass   |
| Testing strategy clear                                       | Pass   |
| Ready for Development Task Breakdown                         | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-054 introduce el endpoint reject + servicio común `QuoteNotificationService` + refactor de US-053. Cierra el loop bilateral con paridad de Notifications. 2 acciones documentales no bloqueantes.
