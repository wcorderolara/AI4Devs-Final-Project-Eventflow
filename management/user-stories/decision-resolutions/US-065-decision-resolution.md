# PO/BA Decision Resolution — US-065

## Source User Story File
management/user-stories/US-065-create-verified-review.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-065-refinement-review.md

## Decision Date
2026-06-28

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-065 |
| Backlog Item | PB-P1-038 |
| Decisiones tomadas | 9 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Comentario opcional `[0..2000]`
```
Body: `comment?: string` máx 2000 caracteres. Ausente o cadena vacía ⇒ persistir `null`.
```

### D2 — Status inicial `published`
```
INSERT reviews con `status='published'`. Sin moderación previa en MVP.
Moderación reversible vía US-066 (flag) / US-067 (admin remove) cambia a `status='hidden'` o `'deleted'`.
```

### D3 — Ventana 30 días post `event.completed`
```
Validación server-side:
- `event.completed_at IS NOT NULL` (evento ya cerrado por job de US-015).
- `NOW() <= event.completed_at + INTERVAL '30 days'`.

Fuera de ventana ⇒ `403 NOT_ELIGIBLE` con `details.reason = 'window_expired'`.
Evento no completado ⇒ `details.reason = 'event_not_completed'`.
```

### D4 — Denormalize atómico de VendorProfile
```
Dentro de prisma.$transaction:
1. INSERT review (status='published').
2. UPDATE vendor_profiles SET
     rating_avg = (SELECT AVG(rating) FROM reviews WHERE vendor_profile_id=:vpId AND status='published'),
     reviews_count = (SELECT COUNT(*) FROM reviews WHERE vendor_profile_id=:vpId AND status='published')
   WHERE id=:vpId.

Recálculo total (no incremental) garantiza coherencia con moderación posterior.
```

### D5 — Notif al vendor
```
2 Notifications atómicas (`in_app` + `email_simulated`) con `event='review.published'` payload:
{ review_id, event_id, vendor_profile_id, rating, has_comment: boolean }.

Reusa `QuoteEventNotificationService` extendido a 9 eventos: añade `'review.published'`.

(Sin contenido del comentario en payload para privacy/i18n; el vendor accede al detalle vía `GET /vendor/reviews/:id` US futura.)
```

### D6 — `403 NOT_ELIGIBLE` con `details.reason`
```
Códigos de elegibilidad:
- 'no_booking': no existe BookingIntent confirmed_intent del organizer con vendor.
- 'event_not_completed': event.completed_at IS NULL.
- 'window_expired': fuera de los 30 días post-completed.
- 'already_reviewed': ya existe review por (event, vendor).

`403 NOT_ELIGIBLE` con `details.reason` permite UX clara al organizer (no es information leakage porque el organizer conoce su propio evento).

Para escenarios de ownership ajeno o event/vendor inexistente ⇒ `404 NOT_FOUND` uniforme (sin revelar existencia).
```

### D7 — Soft delete obligatorio
```
Schema `reviews.status TEXT NOT NULL DEFAULT 'published'`:
- 'published'
- 'hidden' (moderado por admin US-067)
- 'deleted' (soft delete US-067 más agresivo)

Cambio de status en US-066/067 dispara recálculo de denormalize en VendorProfile.
```

### D8 — Body shape
```
{
  event_id: uuid (requerido),
  vendor_profile_id: uuid (requerido),
  rating: integer (1..5, requerido),
  comment?: string (max 2000)
}

DTO Zod `.strict()` rechaza campos extra.
```

### D9 — Endpoint namespace
```
`POST /api/v1/organizer/reviews` (paridad con resto de endpoints organizer).

Response 201:
{
  id: uuid,
  event_id, vendor_profile_id,
  rating, comment, status: 'published',
  created_at, author_user_id
}
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Comment | Opcional [0..2000] |
| 2 | Status inicial | published |
| 3 | Ventana | 30 días post event.completed_at |
| 4 | Denormalize | Atómico, recálculo total |
| 5 | Notif vendor | 2 Notifications via service común extendido a 9 eventos |
| 6 | 403 NOT_ELIGIBLE | Con details.reason |
| 7 | Soft delete | status: published/hidden/deleted |
| 8 | Body | event_id + vendor_profile_id + rating + comment? |
| 9 | Endpoint | POST /api/v1/organizer/reviews |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-065-create-verified-review.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
