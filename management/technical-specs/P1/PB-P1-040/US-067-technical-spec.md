# Technical Specification — US-067: Admin moderate review (soft delete + AdminAction + denormalize)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-067 |
| Source User Story | `management/user-stories/US-067-admin-moderate-review.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-067-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-040 |
| Backlog Title | Moderación admin de reseñas (soft delete) |
| Backlog Execution Order | 67 |
| User Story Position in Backlog Item | 1 de 2 (US-067 + US-077 según backlog) |
| Related User Stories in Backlog Item | US-067, US-077 |
| Epic | EPIC-REV-001 |
| Backlog Item Dependencies | US-065, PB-P0-001 |
| Feature | Endpoint admin con AdminAction + recálculo denormalize cross-domain |
| Module / Domain | Reviews / Admin |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-28 |
| Last Updated | 2026-06-28 |

---

## 2. Backlog Execution Context

PB-P1-040 multi-story (US-067 + US-077). US-067 abre. Execution order 67.

---

## 3. Executive Technical Summary

**Backend**:
- `ModerateReviewUseCase` con `prisma.$transaction`: SELECT FOR UPDATE review + validación transición + UPDATE review + INSERT AdminAction + UPDATE review.admin_action_id + recálculo denormalize de VendorProfile + log.
- DTO Zod `.strict()` con action enum + reason 10..500.
- Controller `POST /api/v1/admin/reviews/:id/moderate`.
- AdminGuard reusable.
- Logger.
- Migración menor: 4 columnas audit en `reviews`.

**Frontend**:
- `ReviewModerationTable` admin con filtros básicos por status.
- `ModerationDialog` accesible con textarea reason + action selector.
- `adminApi.review.moderate` + MSW + i18n 4 locales.

---

## 4. Scope Boundary

### In Scope
- UseCase atómico + DTO + controller + ruta + guard.
- Migración menor 4 columnas.
- Frontend table + dialog accesible + i18n.
- Tests + regresión.

### Out of Scope
- AI moderation (FR-REVIEW-009).
- Hard delete (FR-REVIEW-005).
- Notif organizer/vendor MVP.
- Rollback (US-077).
- Bulk moderation.

---

## 5. Architecture Alignment

Reuso del módulo Reviews + nuevo admin sub-module. Reuso del módulo Admin.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 hide | UseCase + AdminAction + denormalize | BE, DB |
| AC-02 remove | Idem | BE, DB |
| AC-03 hidden→removed | Validación transición + nueva AdminAction | BE |
| AC-04 denormalize correcto | Recálculo excluyendo hidden/removed | BE |
| EC-01..05 | Validaciones | BE |
| AUTH-TS-01..04 | AdminGuard | BE |
| A11Y | Dialog accesible | FE |
| i18n | `admin.review.moderate.*` | FE |

---

## 7. Backend Technical Design

### Use Case

```ts
class ModerateReviewUseCase {
  async execute({ currentUser, reviewId, body }) {
    return prisma.$transaction(async (tx) => {
      const review = await tx.reviews.findFirst({
        where: { id: reviewId },
        include: { vendor_profile: { select: { id: true } } },
      });
      if (!review) throw new ReviewNotFoundError();

      const targetStatus = body.action === 'hide' ? 'hidden' : 'removed';
      const fromStatus = review.status;

      // Validate transition
      const ALLOWED: Record<string, string[]> = {
        published: ['hidden', 'removed'],
        hidden: ['removed'],
      };
      if (!ALLOWED[fromStatus]?.includes(targetStatus)) {
        throw new InvalidTransitionError(fromStatus, targetStatus);
      }

      const now = new Date();

      // 1. UPDATE review (fields excepto admin_action_id)
      await tx.reviews.update({
        where: { id: reviewId },
        data: {
          status: targetStatus,
          moderated_by: currentUser.id,
          moderated_at: now,
          moderation_reason: body.reason,
        },
      });

      // 2. INSERT AdminAction
      const adminAction = await tx.admin_actions.create({
        data: {
          admin_id: currentUser.id,
          target_type: 'review',
          target_id: reviewId,
          action: body.action,
          reason: body.reason,
          payload: {
            from_status: fromStatus,
            to_status: targetStatus,
            rating_snapshot: review.rating,
            comment_snapshot: review.comment,
          },
        },
      });

      // 3. UPDATE review.admin_action_id
      const updatedReview = await tx.reviews.update({
        where: { id: reviewId },
        data: { admin_action_id: adminAction.id },
      });

      // 4. Recálculo denormalize VendorProfile (solo published)
      const stats = await tx.reviews.aggregate({
        where: { vendor_profile_id: review.vendor_profile.id, status: 'published' },
        _avg: { rating: true },
        _count: { id: true },
      });

      await tx.vendor_profiles.update({
        where: { id: review.vendor_profile.id },
        data: {
          rating_avg: stats._avg.rating ?? 0,
          reviews_count: stats._count.id,
        },
      });

      logger.info('review.moderated', {
        reviewId, adminUserId: currentUser.id,
        action: body.action, fromStatus, toStatus: targetStatus,
        adminActionId: adminAction.id,
      });

      return updatedReview;
    });
  }
}
```

### Routes
```ts
router.post(
  '/admin/reviews/:id/moderate',
  adminRoleGuard,
  organizerExclusionGuard,
  vendorExclusionGuard,
  asyncHandler(controller.moderate.bind(controller))
);
```

### DTOs

```ts
export const moderateReviewBody = z.object({
  action: z.enum(['hide', 'remove']),
  reason: z.string().min(10).max(500),
}).strict();
```

### Error Handling
`400 INVALID_UUID`, `400 INVALID_ACTION`, `400 INVALID_REASON_LENGTH`, `400 INVALID_BODY`, `401`, `403`, `404 REVIEW_NOT_FOUND`, `409 INVALID_TRANSITION`.

---

## 8. Frontend Technical Design

### Componentes

- `ReviewModerationTable` (Client Component): tabla paginada con filter por status (`published/hidden/removed`).
- `ModerationDialog`: modal `role="dialog"` con focus trap, action selector (radio o select) + textarea reason con contador 10..500.
- `AdminActionBadge`: muestra el último AdminAction de la review.

### State Management
TanStack mutation + invalidate de `['admin.reviews']` + `['vendor.reviews', vendorId]` (paridad US-066 cache invalidation).

### Data Fetching
`adminApi.review.moderate(reviewId, {action, reason})`.

### Accessibility
- Modal con `aria-labelledby`, focus trap.
- Textarea con label asociado y `aria-describedby` para contador.

### i18n
`admin.review.moderate.*`, `admin.review.actions.*`, `admin.review.errors.*` en 4 locales.

---

## 9. API Contract

| Method | Endpoint | Request | Response | Errors |
|---|---|---|---|---|
| POST | `/api/v1/admin/reviews/:id/moderate` | `{action: 'hide'|'remove', reason: string [10..500]}` | `200 {id, status, moderated_at, moderated_by, moderation_reason, admin_action_id}` | 400, 401, 403, 404 REVIEW_NOT_FOUND, 409 INVALID_TRANSITION |

---

## 10. Database / Prisma Design

### Models Impacted
`Review` (update), `AdminAction` (insert), `VendorProfile` (update).

### Migración menor

```sql
ALTER TABLE reviews
  ADD COLUMN moderated_by uuid NULL REFERENCES users(id),
  ADD COLUMN moderated_at timestamptz NULL,
  ADD COLUMN moderation_reason text NULL,
  ADD COLUMN admin_action_id uuid NULL REFERENCES admin_actions(id);

CREATE INDEX IF NOT EXISTS idx_reviews_moderated_by_at
  ON reviews (moderated_by, moderated_at DESC)
  WHERE moderated_at IS NOT NULL;
```

### Seed Impact
Opcional: 1 review `hidden` y 1 `removed` con AdminAction para demo.

---

## 11. AI / PromptOps Design
No aplica. FR-REVIEW-009 prohibe AI moderation.

## 12. Security & Authorization Design
Ver §SEC US.

## 13. Testing Strategy

### Unit
- DTO + UseCase branches (hide, remove, hidden→removed, transiciones inválidas).

### Integration
- TS-01..TS-05 + regresión US-065/066.
- Concurrencia: 2 moderate simultáneos sobre el mismo review.

### API
Supertest.

### Security
- `404 REVIEW_NOT_FOUND` uniforme.
- AdminAction creado en cada acción exitosa.
- Sin endpoints de hard delete.

### Accessibility
- ModerationDialog accesible.

### Performance
- `< 500ms` p95.

---

## 14. Observability & Audit

Log `review.moderated` + AdminAction record obligatorio.

---

## 15. Seed / Demo
Opcional review `hidden`/`removed` para demo del admin panel.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar endpoint moderate | Documentar. | Actualizar. | No |
| `docs/14` | Documentar AdminAction chain | Documentar. | Actualizar. | No |
| Schema reviews audit | 4 columnas nuevas | Migración. | Aplicar. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Race 2 moderate simultáneos | Doble AdminAction + denormalize incorrecto | SELECT FOR UPDATE review |
| Denormalize incorrecto | Datos inconsistentes | Recálculo total (no incremental) |
| AdminAction sin payload snapshot | Auditoría incompleta | Snapshot rating + comment en payload |
| Transición permisiva | Estado inconsistente | Whitelist explícita en código + 409 |
| Reason vacío "spam" | Audit pobre | Min 10 chars + revisión humana |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/reviews/dto/moderate-review.body.ts` (nuevo)
- `src/modules/reviews/use-cases/moderate-review.use-case.ts` (nuevo)
- `src/modules/reviews/controllers/admin-review.controller.ts` (nuevo)
- `src/modules/reviews/routes/admin-review.routes.ts` (nuevo)
- `src/modules/admin/guards/admin-role.guard.ts` (reuso o nuevo)
- `src/shared/logging/review-events.ts` (extender)
- Migración Prisma: `add_moderation_audit_to_reviews`.

**Frontend**:
- `components/admin/reviews/ReviewModerationTable.tsx` (nuevo)
- `components/admin/reviews/ModerationDialog.tsx` (nuevo)
- `components/admin/reviews/AdminActionBadge.tsx` (nuevo)
- `lib/api/adminApi.ts` (extender con `review.moderate`)
- `messages/{4 locales}.json` (`admin.review.moderate.*`)

### Orden sugerido
1. DB-001 + migración.
2. DTO + UT.
3. UseCase + UT (todas las branches y transiciones).
4. AdminRoleGuard + UT.
5. Controller + ruta.
6. Logger.
7. Frontend API + MSW.
8. ModerationDialog accesible.
9. ReviewModerationTable + AdminActionBadge.
10. i18n.
11. Tests IT + regresión + concurrencia + AUTH + A11Y + Security.
12. Documentación.

### Decisiones que no deben reabrirse
D1–D9.

### Qué no implementar
- AI moderation.
- Hard delete.
- Rollback (US-077).
- Notif organizer/vendor.

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
| Security clear | Pass |
| Cross-domain impact clear | Pass (Review→VendorProfile) |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-067 cierra EPIC-REV-001 con moderación admin manual, AdminAction obligatorio, recálculo cross-domain del denormalize y audit completa (4 columnas + AdminAction record). US-077 podrá manejar rollback si aplica.
