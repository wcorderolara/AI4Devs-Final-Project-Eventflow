# PO/BA Decision Resolution — US-067

## Source User Story File
management/user-stories/US-067-admin-moderate-review.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-067-refinement-review.md

## Decision Date
2026-06-28

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-067 |
| Backlog Item | PB-P1-040 |
| Decisiones tomadas | 9 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Semántica hidden vs removed
```
- `hidden`: review oculta al público pero visible al admin (reversible por US-077 si aplica). Excluida del denormalize del VendorProfile.
- `removed`: review marcada como eliminada (soft delete con audit preservada). Oculta a todos excepto admin. Excluida del denormalize.

Ambos estados son terminales para el flujo público; admin puede inspeccionarlos.
```

### D2 — Transiciones permitidas
```
US-067 maneja exclusivamente:
- `published → hidden`
- `published → removed`
- `hidden → removed`

`removed → ANY` es OUT OF SCOPE en US-067 (US-077 si existe maneja rollback). Cualquier otra transición ⇒ `409 INVALID_TRANSITION` con `details.from`+`details.to`.
```

### D3 — Persistencia FR-REVIEW-004 columns
```
Migración menor: añadir a `reviews`:
- `moderated_by uuid NULL` (FK users.id)
- `moderated_at timestamptz NULL`
- `moderation_reason text NULL`
- `admin_action_id uuid NULL` (FK admin_actions.id)

Backfill: NULL para reviews no moderadas.
```

### D4 — Atomicidad transaccional con denormalize
```
prisma.$transaction:
1. SELECT FOR UPDATE review.
2. Validar transición permitida (D2).
3. UPDATE review SET status, moderated_by, moderated_at, moderation_reason, admin_action_id (placeholder).
4. INSERT AdminAction (D8) y obtener su id.
5. UPDATE review.admin_action_id = adminAction.id.
6. Recálculo total denormalize de VendorProfile (rating_avg, reviews_count solo published).
7. Log `review.moderated` con `action, reviewId, adminUserId, fromStatus, toStatus`.

Rollback completo en cualquier error.
```

### D5 — Reason length [10..500]
```
Body requiere `reason: string [10..500]`. Mínimo 10 evita reasons triviales ("spam"). Persiste en `moderation_reason` y `admin_actions.reason`.
```

### D6 — `404 REVIEW_NOT_FOUND` uniforme
```
Review inexistente ⇒ `404 REVIEW_NOT_FOUND`. Admin tiene visibilidad universal; no aplica filtro de ownership.
```

### D7 — Sin notif al organizer/vendor en MVP
```
US-067 NO emite Notifications al organizer ni al vendor. Decisión PO 8.1 #11 no obliga. PO puede agregar notif en US futura post-MVP. La moderación queda registrada únicamente en AdminAction (audit trail).
```

### D8 — AdminAction shape
```
INSERT admin_actions:
{
  id: uuid (autogen),
  admin_id: currentUser.id,
  target_type: 'review',
  target_id: reviewId,
  action: 'hide' | 'remove',
  reason: body.reason,
  payload: { from_status, to_status, rating_snapshot, comment_snapshot? } (opcional),
  created_at: NOW()
}
```

### D9 — Body shape + DTO
```
POST /api/v1/admin/reviews/:id/moderate
Body: `{ action: 'hide' | 'remove', reason: string [10..500] }`
DTO Zod `.strict()`.

Response 200: `{ id, status, moderated_at, moderated_by, admin_action_id }`.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | hidden vs removed | hidden reversible, removed soft delete final |
| 2 | Transiciones | published→hidden/removed, hidden→removed |
| 3 | Columnas FR-REVIEW-004 | Migración menor 4 columnas |
| 4 | Atomicidad | prisma.$transaction completa con AdminAction + denormalize |
| 5 | Reason | [10..500] chars |
| 6 | 404 | REVIEW_NOT_FOUND uniforme |
| 7 | Notif | Sin notif MVP |
| 8 | AdminAction | shape estandarizado |
| 9 | Body | action enum + reason |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-067-admin-moderate-review.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
