# Technical Specification — US-051: Vendor ve QR y marca como viewed

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-051                                                                                                         |
| Source User Story                    | `management/user-stories/US-051-vendor-mark-quote-request-viewed.md`                                           |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-051-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-031                                                                                                      |
| Backlog Title                        | Vendor visualiza y responde Quote (validez 15 días default)                                                    |
| Backlog Execution Order              | 51                                                                                                              |
| User Story Position in Backlog Item  | 1 de 3 (US-051 → US-052 → US-053)                                                                              |
| Related User Stories in Backlog Item | US-051, US-052, US-053                                                                                         |
| Epic                                 | EPIC-QR-001                                                                                                    |
| Backlog Item Dependencies            | US-049 (QR creation con `status='sent'`), PB-P0-001 (schema), `NotificationSenderPort` (US-049)               |
| Feature                              | GET detalle + POST mark-viewed transaccional                                                                    |
| Module / Domain                      | Quotes                                                                                                         |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-27                                                                                                     |
| Last Updated                         | 2026-06-27                                                                                                     |

---

## 2. Backlog Execution Context

PB-P1-031 cubre US-051 (vendor ve QR), US-052 (vendor responde con Quote) y US-053 (validez 15 días default). US-051 es posición 1 de 3. Execution order 51.

---

## 3. Executive Technical Summary

US-051 extiende `modules/quotes` con:

- `GetVendorQrDetailUseCase` (read-only). Verifica assignment + status visible.
- `MarkVendorQrViewedUseCase` (write transaccional). `prisma.$transaction`: SELECT FOR UPDATE de QR con guard `status='sent'`, UPDATE `status='viewed' + viewed_at + viewed_by`, INSERT Notification in-app al organizer.
- Controller `VendorQuoteRequestController` con `GET` y `POST mark-viewed`.
- Logger `quote_request.viewed`.

Frontend: `app/[locale]/vendor/quote-requests/[id]/page.tsx` orquesta GET inicial + `useEffect` que dispara POST mark-viewed cuando `status === 'sent'`. `aria-live` anuncia la transición.

Sin migraciones obligatorias (verificar columnas `viewed_at`/`viewed_by` en DB-001; si faltan, migración menor).

---

## 4. Scope Boundary

### In Scope
- 2 use cases (GET + POST mark-viewed).
- DTOs Zod del path param.
- Repository extension.
- Controller + 2 rutas.
- Logger extension.
- Reuso `NotificationSenderPort` de US-049.
- Frontend page + orquestación.
- i18n 4 locales.
- Tests.
- Documentación.

### Out of Scope
- Listado de QRs del vendor.
- Cambios de estado posteriores a `viewed` (US-052/US-053).
- Email simulado para `viewed`.
- Marcar como no-vista.

### Explicit Non-Goals
- No introducir tablas nuevas.

---

## 5. Architecture Alignment

### Backend
Extensión del módulo `modules/quotes`. Use cases en aplicación.

### Frontend
Next.js Server Component para fetch inicial + Client Component para orquestación POST.

### Database
Reuso. Verificar columnas `viewed_at` (timestamptz nullable) y `viewed_by` (uuid nullable FK a users).

### API
REST JSON. `404 QR_NOT_FOUND` uniforme.

### AI / PromptOps
No aplica.

### Security
Assignment-based + `404` uniforme.

### Testing
Vitest + Supertest + RTL + axe.

---

## 6. Functional Interpretation

| Acceptance Criterion       | Technical Interpretation                                                                          | Impacted Layer(s) |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 primera transición    | UseCase transaccional + Notification + log.                                                       | BE, DB            |
| AC-02 GET sin side-effect    | UseCase puro de lectura.                                                                          | BE                |
| AC-03 idempotencia POST      | Guard `WHERE status='sent'` + retorno actual state.                                                | BE                |
| AC-04 estados distintos      | Branch idempotente.                                                                                | BE                |
| EC-01 vencida lazy           | Filtro `(expires_at IS NULL OR expires_at > NOW())` en SELECT FOR UPDATE.                          | BE                |
| EC-02..04                    | `404 QR_NOT_FOUND` uniforme.                                                                       | BE                |
| EC-05 UUID malformado        | Zod path param.                                                                                   | BE                |
| AUTH-TS-01..05              | Guards + middleware.                                                                              | BE                |
| A11Y                       | `aria-live`.                                                                                       | FE                |
| i18n                       | `vendor.qr.detail.*` en 4 locales.                                                                | FE                |

---

## 7. Backend Technical Design

### Use Cases

**`GetVendorQrDetailUseCase`** (read-only)

```ts
async execute({ currentUser, qrId }) {
  const vendorProfile = await vendorProfileRepo.findActiveByUserId(currentUser.id);
  if (!vendorProfile || vendorProfile.status === 'hidden' || vendorProfile.deleted_at) {
    throw new QrNotFoundError(); // uniforme
  }
  const qr = await quoteRequestsRepo.findByIdAndVendorProfile(qrId, vendorProfile.id);
  if (!qr) throw new QrNotFoundError();
  return qr;
}
```

**`MarkVendorQrViewedUseCase`** (write transaccional)

```ts
async execute({ currentUser, qrId }) {
  return prisma.$transaction(async (tx) => {
    const vendorProfile = await vendorProfileRepo.findActiveByUserId(currentUser.id, { tx });
    if (!vendorProfile || vendorProfile.status === 'hidden' || vendorProfile.deleted_at) {
      throw new QrNotFoundError();
    }

    const qr = await tx.quote_requests.findFirst({
      where: { id: qrId, vendor_profile_id: vendorProfile.id },
      // SELECT FOR UPDATE
    });
    if (!qr) throw new QrNotFoundError();

    // No-op if not 'sent' or expired lazily
    if (qr.status !== 'sent' || (qr.expires_at && qr.expires_at <= new Date())) {
      return qr;
    }

    const updated = await tx.quote_requests.update({
      where: { id: qrId },
      data: { status: 'viewed', viewed_at: new Date(), viewed_by: currentUser.id },
    });

    const event = await tx.events.findUnique({ where: { id: qr.event_id }, select: { organizer_user_id: true } });

    await notificationSenderPort.notify({
      channel: 'in_app',
      recipientUserId: event.organizer_user_id,
      event: 'quote_request.viewed',
      deliveryStatus: 'delivered',
      payload: { quote_request_id: qrId, vendor_profile_id: vendorProfile.id, viewed_at: updated.viewed_at },
      tx,
    });

    logger.info('quote_request.viewed', { qrId, vendorProfileId: vendorProfile.id, organizerUserId: event.organizer_user_id });

    return updated;
  });
}
```

### Controllers / Routes

```ts
router.get(
  '/vendor/quote-requests/:id',
  vendorRoleGuard,
  organizerExclusionGuard,
  adminExclusionGuard,
  asyncHandler(controller.detail.bind(controller))
);
router.post(
  '/vendor/quote-requests/:id/mark-viewed',
  vendorRoleGuard,
  organizerExclusionGuard,
  adminExclusionGuard,
  asyncHandler(controller.markViewed.bind(controller))
);
```

### DTOs / Schemas

```ts
export const qrIdParam = z.object({ id: z.string().uuid() });
```

### Repository / Persistence

Extensión `QuoteRequestsRepository`:

```ts
findByIdAndVendorProfile(qrId: string, vendorProfileId: string): Promise<QuoteRequest | null>
```

### Validation Rules

Ver §VR US.

### Error Handling

Códigos: `400 INVALID_UUID`, `401`, `403`, `404 QR_NOT_FOUND`.

### Transactions

POST mark-viewed: `prisma.$transaction` con SELECT FOR UPDATE.

### Observability

Log `quote_request.viewed` sólo en transición real.

---

## 8. Frontend Technical Design

### Routes / Pages

- `app/[locale]/vendor/quote-requests/[id]/page.tsx` (Server Component fetch inicial).
- `app/[locale]/vendor/quote-requests/[id]/not-found.tsx`.

### Components

- `QuoteRequestDetail` (Client orquestador).
- `EventBriefSnapshot`.
- `StatusBadge` con `aria-live`.

### Forms

N/A.

### State Management

TanStack Query `useQuery(['qr', id])` + mutation `useMarkViewed`. `useEffect` dispara mutation si `data.status === 'sent'`.

### Data Fetching

`vendorApi.qr.detail(id)`, `vendorApi.qr.markViewed(id)`.

### Loading / Empty / Error / Success States

- Loading: skeleton.
- Error: 404 page.
- Success: detalle visible; `aria-live` anuncia "Marcada como vista".

### Accessibility

`aria-live="polite"` en badge.

### i18n

`vendor.qr.detail.*`.

---

## 9. API Contract Design

| Method | Endpoint                                              | Purpose                              | Auth Required | Request | Response       | Error Cases                                              |
| ------ | ----------------------------------------------------- | ------------------------------------ | ------------- | ------- | -------------- | -------------------------------------------------------- |
| GET    | `/api/v1/vendor/quote-requests/:id`                   | Detalle.                              | Sí (vendor)   | -       | `200 QR`.       | `400 INVALID_UUID`, `401`, `403`, `404 QR_NOT_FOUND`.   |
| POST   | `/api/v1/vendor/quote-requests/:id/mark-viewed`       | Transición idempotente.               | Sí (vendor)   | -       | `200 QR`.       | `400 INVALID_UUID`, `401`, `403`, `404 QR_NOT_FOUND`.   |

---

## 10. Database / Prisma Design

### Models Impacted

`QuoteRequest` (read + write), `Notification` (write), `VendorProfile` (read), `Event` (read).

### Fields / Columns

Confirmar (DB-001): `viewed_at` (timestamptz nullable), `viewed_by` (uuid nullable FK users).

### Indexes

Reuso de `idx_quote_requests_vendor_status` + PK.

### Migrations Impact

Posible 1 migración menor si faltan `viewed_at`/`viewed_by`.

### Seed Impact

Reuso de seed de US-049. Asegurar al menos 1 QR en `sent` para el vendor demo.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

Ver §SEC US.

---

## 13. Testing Strategy

### Unit Tests

- DTO + use case branches (no-op por estado/expired, transición real).

### Integration Tests

- TS-01..TS-05 + NT-01..NT-05.
- Notification creada al transicionar.
- Idempotencia verificada.

### API Tests

Supertest cubriendo códigos.

### E2E Tests

Opcional Playwright para el flujo completo.

### Security Tests

- `404 QR_NOT_FOUND` uniforme.

### Accessibility Tests

- `aria-live` + 404 page.

### AI Tests

No aplica.

### Performance

`< 1s p95`.

---

## 14. Observability & Audit

Log `quote_request.viewed` con `correlation_id`.

---

## 15. Seed / Demo Data Impact

Verificar reuso.

---

## 16. Documentation Alignment Required

| Document / Source            | Conflict                                                              | Current Decision                              | Recommended Action                                          | Blocks Implementation? |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| `docs/16 §M07`               | Falta documentar GET + POST.                                          | Documentar.                                    | Actualizar `docs/16`.                                       | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                            | Impact                | Mitigation                                              |
| --------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| Race entre 2 POST mark-viewed simultáneos.                       | Doble Notification.   | UPDATE con guard `WHERE status='sent'` + `SELECT FOR UPDATE`. |
| Notification insert falla.                                       | Estado inconsistente. | Transacción rollback.                                    |
| Frontend dispara POST múltiples veces por re-render.             | Llamadas innecesarias.| `useEffect` con dependency `[id]` + idempotencia BE.    |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/quotes/dto/qr-id.param.ts`
- `src/modules/quotes/use-cases/get-vendor-qr-detail.use-case.ts`
- `src/modules/quotes/use-cases/mark-vendor-qr-viewed.use-case.ts`
- `src/modules/quotes/repositories/quote-request.repository.ts` (extender)
- `src/modules/quotes/controllers/vendor-quote-request.controller.ts`
- `src/modules/quotes/routes/vendor-quote-request.routes.ts`
- `src/shared/logging/quote-events.ts` (extender con `quote_request.viewed`)

**Frontend**:
- `app/[locale]/vendor/quote-requests/[id]/page.tsx`
- `app/[locale]/vendor/quote-requests/[id]/not-found.tsx`
- `components/vendor/qr/QuoteRequestDetail.tsx`
- `components/vendor/qr/EventBriefSnapshot.tsx`
- `components/vendor/qr/StatusBadge.tsx`
- `lib/api/vendorApi.ts` (extender con namespace `qr.detail` + `qr.markViewed`)
- `messages/{es-LATAM,es-ES,pt,en}.json`

### Orden sugerido

1. DB-001.
2. DTO + UT.
3. Repository extension.
4. Use cases + UT.
5. Controller + 2 rutas.
6. Logger extension.
7. Frontend `vendorApi.qr.*` + MSW.
8. Page + orquestación.
9. i18n.
10. Tests IT + AUTH + A11Y.
11. Documentación.

### Decisiones que no deben reabrirse

D1–D6.

### Qué no implementar

- Listado del vendor.
- Cambios posteriores de estado (US-052/US-053).
- Email simulado.

---

## 19. Task Generation Notes

| Grupo | Tasks |
| ----- | ----: |
| DB    | 1 |
| BE    | 6 |
| FE    | 4 |
| QA    | 4 |
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

US-051 introduce 2 use cases + 2 endpoints + UX orquestada en frontend. Transición atómica con `SELECT FOR UPDATE` + Notification al organizer. Sin migraciones obligatorias. 1 acción documental no bloqueante.
