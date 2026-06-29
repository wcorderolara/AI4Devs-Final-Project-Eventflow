# Technical Specification — US-065: Create Verified Review + atomic denormalize

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-065 |
| Source User Story | `management/user-stories/US-065-create-verified-review.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-065-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-038 |
| Backlog Title | Crear reseña verificada (1–5) |
| Backlog Execution Order | 65 |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-065 |
| Epic | EPIC-REV-001 — Reviews & Moderation |
| Backlog Item Dependencies | US-061, US-015, US-049..064, PB-P0-001 |
| Feature | Endpoint review + denormalize atómico VendorProfile + notif vendor |
| Module / Domain | Reviews / Vendor |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-28 |
| Last Updated | 2026-06-28 |

---

## 2. Backlog Execution Context

PB-P1-038 single-story, abre EPIC-REV-001. Execution order 65.

---

## 3. Executive Technical Summary

**Backend**:
- `CreateReviewUseCase` con `prisma.$transaction`: validaciones de elegibilidad (4 razones) + INSERT review + UPDATE denormalize en VendorProfile + 2 notifs vendor.
- Extensión del service común a 9 eventos: `'review.published'`.
- DTO Zod `.strict()` con rating int 1..5.
- Controller `POST /api/v1/organizer/reviews`.
- Logger.
- Migración menor: verificar/agregar `events.completed_at`, `vendor_profiles.rating_avg/reviews_count`, `reviews` UNIQUE (event_id, vendor_profile_id).

**Frontend**:
- `ReviewForm` con `StarRating` accesible (radiogroup) + textarea opcional + eligibility banner.
- `organizerApi.reviews.create` + MSW + i18n 4 locales.

---

## 4. Scope Boundary

### In Scope
- UseCase atómico + DTO + controller + ruta + service refactor.
- Frontend form + componente accesible + i18n.
- Migración menor.
- Tests + regresión.

### Out of Scope
- Edición (FR-REVIEW-007).
- Respuesta vendor (FR-REVIEW-008).
- Moderación (US-066/067).
- Reseñas anónimas / con media.

---

## 5. Architecture Alignment

Nuevo `modules/reviews`. Reuso del service común.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 crear + denormalize | UseCase transaccional 3-step | BE, DB |
| AC-02 comment opcional | Service maneja null | BE |
| AC-03 unicidad | UNIQUE constraint + 403 NOT_ELIGIBLE | BE, DB |
| AC-04 inmutabilidad | Sin endpoint PATCH | BE |
| EC-01..07 | Validaciones bilaterales | BE |
| AUTH-TS-01..06 | Guards + 404 uniforme | BE |
| A11Y | StarRating + textarea | FE |
| i18n | `organizer.review.*` | FE |

---

## 7. Backend Technical Design

### Use Case

```ts
class CreateReviewUseCase {
  async execute({ currentUser, body }) {
    return prisma.$transaction(async (tx) => {
      // 1. Verificar Event ownership + existencia
      const event = await tx.events.findFirst({ where: { id: body.event_id } });
      if (!event) throw new NotFoundError();
      if (event.organizer_user_id !== currentUser.id) throw new NotFoundError(); // uniforme

      const vendor = await tx.vendor_profiles.findUnique({ where: { id: body.vendor_profile_id } });
      if (!vendor) throw new NotFoundError();

      // 2. Elegibilidad
      if (!event.completed_at) throw new NotEligibleError('event_not_completed');

      const windowExpiresAt = new Date(event.completed_at);
      windowExpiresAt.setDate(windowExpiresAt.getDate() + 30);
      if (new Date() > windowExpiresAt) throw new NotEligibleError('window_expired');

      const confirmedBooking = await tx.booking_intents.findFirst({
        where: {
          status: 'confirmed_intent',
          quote: {
            vendor_profile_id: body.vendor_profile_id,
            quote_request: { event_id: body.event_id },
          },
        },
      });
      if (!confirmedBooking) throw new NotEligibleError('no_booking');

      // 3. Unicidad
      const existing = await tx.reviews.findFirst({
        where: { event_id: body.event_id, vendor_profile_id: body.vendor_profile_id, status: { not: 'deleted' } },
      });
      if (existing) throw new NotEligibleError('already_reviewed');

      // 4. INSERT review
      const review = await tx.reviews.create({
        data: {
          event_id: body.event_id,
          vendor_profile_id: body.vendor_profile_id,
          author_user_id: currentUser.id,
          rating: body.rating,
          comment: body.comment || null,
          status: 'published',
        },
      });

      // 5. Recálculo denormalize total
      const stats = await tx.reviews.aggregate({
        where: { vendor_profile_id: body.vendor_profile_id, status: 'published' },
        _avg: { rating: true },
        _count: { id: true },
      });

      await tx.vendor_profiles.update({
        where: { id: body.vendor_profile_id },
        data: {
          rating_avg: stats._avg.rating ?? 0,
          reviews_count: stats._count.id,
        },
      });

      // 6. Notif vendor
      await quoteEventNotificationService.emit({
        recipientUserId: vendor.user_id,
        eventName: 'review.published',
        payload: {
          review_id: review.id,
          event_id: event.id,
          vendor_profile_id: vendor.id,
          rating: review.rating,
          has_comment: !!review.comment,
        },
        tx,
      });

      logger.info('review.published', {
        reviewId: review.id,
        vendorProfileId: vendor.id,
        eventId: event.id,
        organizerUserId: currentUser.id,
        rating: review.rating,
      });

      return review;
    });
  }
}
```

### Service Refactor
Type extendido (9 eventos):
```ts
type QuoteEventName = ... | 'review.published';
```

### Routes
```ts
router.post(
  '/organizer/reviews',
  organizerRoleGuard,
  vendorExclusionGuard,
  adminExclusionGuard,
  asyncHandler(controller.create.bind(controller))
);
```

### DTOs

```ts
export const createReviewBody = z.object({
  event_id: z.string().uuid(),
  vendor_profile_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
}).strict();
```

### Error Handling
Códigos: `400 INVALID_UUID`, `400 INVALID_BODY`, `400 INVALID_COMMENT_LENGTH`, `401`, `403`, `403 NOT_ELIGIBLE` (con `details.reason`), `404 NOT_FOUND`.

---

## 8. Frontend Technical Design

### Componentes

- `ReviewForm` (Client Component): RHF + Zod, contiene `StarRating` + textarea opcional + CTA "Publicar reseña".
- `StarRating` (accesible): `<div role="radiogroup" aria-labelledby="rating-label">` con 5 `<button role="radio" aria-checked aria-valuenow>` para cada estrella. Navegación con flechas.
- `ReviewEligibilityBanner`: muestra mensaje contextual si elegibilidad falla (consume `error.details.reason`).

### State Management
TanStack mutation + invalidación de queries de vendor profile + review list.

### Data Fetching
`organizerApi.reviews.create({event_id, vendor_profile_id, rating, comment?})`.

### Loading / Empty / Error / Success States
- Loading: spinner CTA.
- Error: banner i18n. Si `403 NOT_ELIGIBLE`, renderiza `ReviewEligibilityBanner` con razón específica.
- Success: toast + redirect a perfil vendor.

### Accessibility
- StarRating: `radiogroup` + teclado.
- Comment textarea: label + `aria-describedby`.

### i18n
`organizer.review.create.*` + `organizer.review.eligibility.{no_booking|event_not_completed|window_expired|already_reviewed}` en 4 locales.

---

## 9. API Contract

| Method | Endpoint | Request | Response | Errors |
|---|---|---|---|---|
| POST | `/api/v1/organizer/reviews` | `{event_id, vendor_profile_id, rating, comment?}` | `201 Review` | 400 (UUID/BODY/COMMENT_LENGTH), 401, 403, 403 NOT_ELIGIBLE (4 razones), 404 NOT_FOUND |

---

## 10. Database / Prisma Design

### Models Impacted
`Review` (insert), `VendorProfile` (update), `BookingIntent` (read), `Quote` (read), `QuoteRequest` (read), `Event` (read), `Notification` (write).

### Migración menor
Verificar/agregar:
- `events.completed_at timestamptz NULL` (puede existir vía US-015).
- `vendor_profiles.rating_avg numeric(3,2) NOT NULL DEFAULT 0`.
- `vendor_profiles.reviews_count integer NOT NULL DEFAULT 0`.
- `reviews.status text NOT NULL DEFAULT 'published'`.
- UNIQUE parcial `(event_id, vendor_profile_id) WHERE status != 'deleted'`.
- Index `(vendor_profile_id, status)`.

### Seed Impact
Reviews seed deben cumplir BR-SEED-007 (asociadas a BookingIntent confirmed_intent existente). Añadir ≥1 seed review.

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design
Ver §SEC US.

## 13. Testing Strategy

### Unit
- DTO + UseCase branches (creación, elegibilidad 4 razones, comment null, unicidad).

### Integration
- TS-01..TS-04 + regresión US-053..064 con service común extendido a 9 eventos.
- Concurrencia: 2 POST simultáneos ⇒ uno gana, otro `403 NOT_ELIGIBLE` reason='already_reviewed'.

### API
Supertest cubriendo todos los códigos.

### Security
- `404 NOT_FOUND` uniforme para ownership.
- `403 NOT_ELIGIBLE` con razones específicas (no leakage porque organizer conoce su propio evento).

### Accessibility
- `StarRating` radiogroup + teclado + axe.

### Performance
- `< 500ms` p95.
- Recálculo total denormalize con `AVG`/`COUNT` debe ser eficiente con índice `(vendor_profile_id, status)`.

---

## 14. Observability & Audit
Log `review.published` con 5 campos.

---

## 15. Seed / Demo Data Impact
Seed reviews respetando BR-SEED-007 (asociadas a BookingIntent confirmed_intent + dentro de ventana).

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar endpoint review | Documentar. | Actualizar. | No |
| `docs/14` | Documentar nuevo módulo Reviews + denormalize chain | Documentar. | Actualizar. | No |
| Schema reviews UNIQUE | Verificar | Migración. | Aplicar. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Race 2 reviews simultáneas | Doble review | UNIQUE parcial + early check |
| Denormalize incorrecto | Datos inconsistentes | Recálculo total (no incremental) |
| Service común breaking | Regresión 8 eventos | Tests integrales |
| StarRating no accesible | A11Y degradada | radiogroup + tests axe |
| Ventana 30 días timezone | Edge cases | Asume UTC; tests con clock injectable (futuro) |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/reviews/dto/create-review.body.ts` (nuevo)
- `src/modules/reviews/use-cases/create-review.use-case.ts` (nuevo)
- `src/modules/reviews/controllers/organizer-review.controller.ts` (nuevo)
- `src/modules/reviews/routes/organizer-review.routes.ts` (nuevo)
- `src/modules/quotes/services/quote-event-notification.service.ts` (extender type)
- `src/shared/logging/review-events.ts` (nuevo)
- Migración Prisma si columnas faltan.

**Frontend**:
- `components/organizer/review/ReviewForm.tsx` (nuevo)
- `components/shared/StarRating.tsx` (nuevo accesible)
- `components/organizer/review/ReviewEligibilityBanner.tsx` (nuevo)
- `lib/api/organizerApi.ts` (extender con `reviews.create`)
- `messages/{4 locales}.json` (`organizer.review.*`)

### Orden sugerido
1. DB-001 + migración + seeds.
2. Extender service común + UT.
3. DTO + UT.
4. UseCase + UT (todas las branches).
5. Controller + ruta.
6. Logger.
7. Frontend API + MSW.
8. StarRating accesible.
9. ReviewForm + EligibilityBanner.
10. i18n.
11. Tests IT + regresión + concurrencia + AUTH + A11Y + Security.
12. Documentación.

### Decisiones que no deben reabrirse
D1–D9.

### Qué no implementar
- Edición.
- Respuesta vendor.
- Moderación (US-066/067).
- Reseñas anónimas/media.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 2 |
| BE | 6 |
| FE | 4 |
| QA | 6 |
| DOC | 1 |
| **Total** | 19 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Cross-domain impact clear | Pass (Review → Vendor denormalize) |
| Security clear | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-065 abre EPIC-REV-001 con endpoint atómico, denormalize cross-domain (Review → Vendor) y service común extendido a 9 eventos. Cierra el ciclo demo MVP. US-066 y US-067 completarán el epic con moderación.
