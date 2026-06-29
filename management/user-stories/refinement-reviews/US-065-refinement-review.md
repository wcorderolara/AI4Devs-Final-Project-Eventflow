# User Story Refinement Review — US-065

## Source User Story File
management/user-stories/US-065-create-verified-review.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-065-decision-resolution.md

## Review Date
2026-06-28 (revalidación: 2026-06-28)

## Revalidation Result (2026-06-28)
Q1–Q9 resueltas. La US-065 declara `Backlog Item: PB-P1-038`, `PO/BA Decisions Applied` D1–D9, trazabilidad corregida (agregados `FR-REVIEW-002/003/007/008`, `FR-VENDOR-013`, `BR-REVIEW-003/007/008/009`, `BR-BOOKING-010`; `NFR-PERF-API-001` → `NFR-PERF-001`). Endpoint `POST /api/v1/organizer/reviews` con elegibilidad bilateral 30 días + denormalize atómico + 2 notifs via service común. AC-01..AC-04, EC-01..EC-07, VR-01..VR-10, SEC-01..SEC-06, NT-01..NT-12, AUTH-TS-01..AUTH-TS-06. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-065 |
| Backlog Item | PB-P1-038 — Crear reseña verificada (1–5) |
| Epic | EPIC-REV-001 — Reviews & Moderation |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-065-refinement-review.md |

## 2. Diagnóstico

US-065 cubre la creación de reseña verificada (PB-P1-038, single-story). Núcleo del EPIC-REV-001. Cierra el ciclo demo MVP (organizer → vendor confirmado → reseña).

### Hallazgos

1. **Trazabilidad incompleta**: cita `FR-REVIEW-001` y `BR-REVIEW-001/002`. Faltan **`FR-REVIEW-002`** (escala 1-5), **`FR-REVIEW-003`** (unicidad event+vendor), **`FR-REVIEW-007`** (no editable), **`FR-REVIEW-008`** (no respuesta vendor), **`FR-VENDOR-013`** (denormalize rating_avg/reviews_count), **`BR-REVIEW-003`** (escala), **`BR-REVIEW-009`** (denormalize). `NFR-PERF-API-001` no existe ⇒ `NFR-PERF-001`.
2. **Falta declarar `Backlog Item: PB-P1-038`**.
3. **Ventana temporal**: Decisión PO US-065 + PB-P1-038 explicitan **30 días calendario post `event.completed`**. La US dice "confirmar ventana temporal" pero ya está decidido.
4. **Comentario opcional vs required**: VR-02 dice "≤ 2000 chars" pero no aclara requerido. Recomendado opcional.
5. **Denormalize `VendorProfile.rating_avg/reviews_count`**: FR-VENDOR-013 + BR-REVIEW-009. Atómico con el INSERT.
6. **Status inicial**: `published` (sin moderación previa en MVP — la moderación es post-publicación vía US-066/067).
7. **Soft delete**: para no perder historial al moderar. Verificar si schema lo soporta.
8. **Notif vendor**: ¿Se le notifica al vendor cuando recibe una reseña? Aclarar.
9. **Inmutabilidad**: FR-REVIEW-007 prohibe editar. Sin PATCH endpoint.
10. **Vendor target identification**: ¿`vendor_profile_id` viene del body o se deriva del `booking_intent_id`? Recomendado: body include ambos `event_id` + `vendor_profile_id` y backend verifica EXISTS de BookingIntent confirmado.
11. **Naming endpoint**: `POST /api/v1/reviews` — considerar `POST /api/v1/organizer/reviews` para consistencia con namespace.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | PO | Comentario opcional/required + max | Opcional, `[0..2000]`. |
| Q2 | PO | Status inicial | `published` (sin moderación previa MVP). |
| Q3 | PO/Tech | Ventana temporal enforcement | 30 días calendario post `event.completed`. Validación server-side: `NOW() <= event.completed_at + INTERVAL '30 days'`. Eventos sin `completed_at` (no terminados) ⇒ no eligible. |
| Q4 | Tech | Denormalize atómico | Dentro de `prisma.$transaction`: INSERT review + recálculo de `vendor_profiles.rating_avg = AVG(rating)` + `reviews_count = COUNT(*)` desde reviews `status='published'`. |
| Q5 | PO | Notif vendor | Sí: 2 Notifications atómicas (`in_app` + `email_simulated`) con `event='review.published'` vía `QuoteEventNotificationService` (extendido a 9 eventos). |
| Q6 | PO/Sec | 404 vs 403 ELIGIBLE_BOOKING_NOT_FOUND | `403 NOT_ELIGIBLE` con `details.reason` ('no_booking', 'window_expired', 'already_reviewed', 'event_not_completed'). PO confirma 403 (no 404) para dar feedback explícito al organizer. |
| Q7 | PO | Soft delete vs hard | Soft delete obligatorio (`status='deleted'`) para preservar historial + permitir moderación reversible (US-066/067). |
| Q8 | Tech | Body shape | `{ event_id: uuid, vendor_profile_id: uuid, rating: 1..5, comment?: string [0..2000] }`. |
| Q9 | Tech | Namespace endpoint | `POST /api/v1/organizer/reviews` (paridad con resto de endpoints organizer). |

## 9. Recomendación

`Needs Refinement` — 9 decisiones PO/Tech/Sec bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
