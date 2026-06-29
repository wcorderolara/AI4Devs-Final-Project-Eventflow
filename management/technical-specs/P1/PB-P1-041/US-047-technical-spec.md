# Technical Specification — US-047: Admin moderate VendorProfile

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-047 |
| Source User Story | `management/user-stories/US-047-admin-approve-reject-vendor.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-047-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-041 |
| Backlog Title | Admin: aprobar / rechazar / ocultar vendor |
| Backlog Execution Order | 47 |
| User Story Position in Backlog Item | 1 de 2 (US-047 + US-074) |
| Related User Stories in Backlog Item | US-047, US-074 |
| Epic | EPIC-VND-001 / EPIC-ADM-001 |
| Backlog Item Dependencies | US-040, PB-P0-001, PB-P1-024 |
| Feature | Endpoint admin único moderate + 4 acciones + AdminAction + 2 notifs |
| Module / Domain | Vendors / Admin |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-29 |
| Last Updated | 2026-06-29 |

---

## 2. Backlog Execution Context

PB-P1-041 multi-story. US-047 abre. Execution order 47. US-074 cierra con UI.

---

## 3. Executive Technical Summary

**Backend**:
- `ModerateVendorUseCase` con `prisma.$transaction`: SELECT FOR UPDATE vendor + validación transición + UPDATE vendor (status o is_hidden según acción) + INSERT AdminAction + UPDATE vendor.admin_action_id + invocar service común (2 notifs) + log.
- DTO Zod `.strict()` con cross-field refinement (reason required en reject/hide).
- Controller `POST /api/v1/admin/vendors/:id/moderate`.
- AdminRoleGuard reuso US-067.
- Extensión del service común a 13 eventos.
- Migración menor: 4 columnas audit en `vendor_profiles`.

**Frontend**:
- N/A en US-047. US-074 entrega panel + dialog.

---

## 4. Scope Boundary

### In Scope
- UseCase atómico + DTO + controller + ruta + service refactor.
- Migración menor 4 columnas.
- Tests + regresión.

### Out of Scope
- UI (US-074).
- AI moderation.
- Bulk.
- Re-approve rejected.

---

## 5. Architecture Alignment

Reuso de AdminRoleGuard (US-067), service común (US-054..067).

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 approve | UseCase + status update | BE |
| AC-02 reject | UseCase + status + reason | BE |
| AC-03 hide | UseCase + is_hidden flag | BE |
| AC-04 unhide | UseCase + is_hidden=false | BE |
| EC-01..07 | Validaciones + transición whitelist | BE |
| AUTH-TS-01..04 | AdminGuard | BE |

---

## 7. Backend Technical Design

### Use Case

```ts
type Action = 'approve' | 'reject' | 'hide' | 'unhide';

class ModerateVendorUseCase {
  async execute({ currentUser, vendorId, body }) {
    return prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor_profiles.findFirst({
        where: { id: vendorId },
        include: { user: { select: { id: true } } },
      });
      if (!vendor) throw new VendorNotFoundError();

      // Validate transition
      validateTransition(vendor.status, vendor.is_hidden, body.action);

      // Apply changes
      let updateData: any = {
        moderated_by: currentUser.id,
        moderated_at: new Date(),
        moderation_reason: body.reason ?? null,
      };

      if (body.action === 'approve') updateData.status = 'approved';
      if (body.action === 'reject') updateData.status = 'rejected';
      if (body.action === 'hide') updateData.is_hidden = true;
      if (body.action === 'unhide') updateData.is_hidden = false;

      const updated = await tx.vendor_profiles.update({
        where: { id: vendorId },
        data: updateData,
      });

      // Insert AdminAction
      const adminAction = await tx.admin_actions.create({
        data: {
          admin_id: currentUser.id,
          target_type: 'vendor_profile',
          target_id: vendorId,
          action: body.action,
          reason: body.reason ?? null,
          payload: {
            from_status: vendor.status,
            to_status: updated.status,
            from_is_hidden: vendor.is_hidden,
            to_is_hidden: updated.is_hidden,
          },
        },
      });

      await tx.vendor_profiles.update({
        where: { id: vendorId },
        data: { admin_action_id: adminAction.id },
      });

      // Notify vendor
      const eventNameMap: Record<Action, string> = {
        approve: 'vendor.approved',
        reject: 'vendor.rejected',
        hide: 'vendor.hidden',
        unhide: 'vendor.unhidden',
      };

      await quoteEventNotificationService.emit({
        recipientUserId: vendor.user.id,
        eventName: eventNameMap[body.action],
        payload: {
          vendor_profile_id: vendorId,
          action: body.action,
          reason: body.reason ?? null,
          moderated_by: currentUser.id,
          moderated_at: updated.moderated_at,
        },
        tx,
      });

      logger.info('vendor.moderated', {
        vendorId, adminId: currentUser.id, action: body.action,
        fromStatus: vendor.status, toStatus: updated.status,
        fromIsHidden: vendor.is_hidden, toIsHidden: updated.is_hidden,
        adminActionId: adminAction.id,
      });

      return { ...updated, admin_action_id: adminAction.id };
    });
  }
}

function validateTransition(fromStatus, fromHidden, action) {
  const map: any = {
    pending: { approve: true, reject: true },
    approved: { hide: !fromHidden, unhide: fromHidden },
    rejected: {},
  };
  if (!map[fromStatus]?.[action]) throw new InvalidTransitionError(fromStatus, fromHidden, action);
}
```

### Service Refactor

Type extendido (13 eventos):
```ts
type QuoteEventName = ... 
  | 'vendor.approved' | 'vendor.rejected' | 'vendor.hidden' | 'vendor.unhidden';
```

### Routes
```ts
router.post(
  '/admin/vendors/:id/moderate',
  adminRoleGuard,
  organizerExclusionGuard,
  vendorExclusionGuard,
  asyncHandler(controller.moderate.bind(controller))
);
```

### DTOs

```ts
export const moderateVendorBody = z.object({
  action: z.enum(['approve', 'reject', 'hide', 'unhide']),
  reason: z.string().min(10).max(500).optional(),
}).strict()
.refine(
  d => !(['reject', 'hide'].includes(d.action)) || !!d.reason,
  { message: 'reason is required for reject/hide actions', path: ['reason'] }
);
```

### Error Handling
`400 INVALID_UUID`, `400 INVALID_ACTION`, `400 REASON_REQUIRED`, `400 INVALID_REASON_LENGTH`, `400 INVALID_BODY`, `401`, `403`, `404 VENDOR_NOT_FOUND`, `409 INVALID_TRANSITION`.

---

## 8. Frontend Technical Design

N/A. US-074 entrega UI.

---

## 9. API Contract

| Method | Endpoint | Request | Response | Errors |
|---|---|---|---|---|
| POST | `/api/v1/admin/vendors/:id/moderate` | `{action, reason?}` | `200 {id, status, is_hidden, moderated_at, moderated_by, moderation_reason, admin_action_id}` | 400, 401, 403, 404 VENDOR_NOT_FOUND, 409 INVALID_TRANSITION |

---

## 10. Database / Prisma Design

### Models Impacted
`VendorProfile` (update), `AdminAction` (insert), `User` (read), `Notification` (write).

### Migración menor

```sql
ALTER TABLE vendor_profiles
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN moderated_by uuid NULL REFERENCES users(id),
  ADD COLUMN moderated_at timestamptz NULL,
  ADD COLUMN moderation_reason text NULL,
  ADD COLUMN admin_action_id uuid NULL REFERENCES admin_actions(id);

CREATE INDEX IF NOT EXISTS idx_vendor_profiles_status_hidden
  ON vendor_profiles (status, is_hidden)
  WHERE status IN ('approved', 'pending');
```

`is_hidden` puede ya existir; el `IF NOT EXISTS` es defensivo.

### Seed Impact
Opcional: ≥1 vendor approved + ≥1 hidden + ≥1 rejected con AdminAction para demo.

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design
Ver §SEC US.

## 13. Testing Strategy

### Unit
- DTO (cross-field refine reason required).
- UseCase branches (4 acciones + transiciones inválidas).

### Integration
- TS-01..TS-06 + regresión service común (9 eventos previos → 13 con vendor.*).
- Verificar US-040 lookup excluye rejected y is_hidden=true.
- Concurrencia: 2 moderate simultáneos sobre el mismo vendor.

### API
Supertest cubriendo todos los códigos.

### Security
- `404 VENDOR_NOT_FOUND` uniforme.
- AdminAction creado por cada acción.

### Performance
- `< 500ms` p95.

---

## 14. Observability & Audit

Log `vendor.moderated` + AdminAction obligatorio.

---

## 15. Seed / Demo
Vendors en diferentes estados para demo de panel admin (US-074).

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar endpoint moderate | Documentar. | Actualizar. | No |
| `docs/14` | Documentar AdminAction chain VendorProfile | Documentar. | Actualizar. | No |
| Schema vendor_profiles audit | 4 columnas + is_hidden defensivo | Migración. | Aplicar. | No |
| PB-P1-041 Traceability | El backlog cita `FR-ADMIN-001..002` (no aplica). | Trazabilidad real registrada. | Housekeeping del backlog. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Race 2 moderate simultáneos | Doble AdminAction + estado inconsistente | SELECT FOR UPDATE |
| Cross-field refinement Zod | Errors no claros | Test explícitos de DTO |
| Effect en US-040 lookup | Vendor moderado sigue apareciendo | Verificar query US-040 filtra `status='approved' AND is_hidden=false` |
| Service común breaking | 9 eventos previos rotos | Tests regresión |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/admin/dto/moderate-vendor.body.ts` (nuevo)
- `src/modules/admin/use-cases/moderate-vendor.use-case.ts` (nuevo)
- `src/modules/admin/controllers/admin-vendor.controller.ts` (nuevo)
- `src/modules/admin/routes/admin-vendor.routes.ts` (nuevo)
- `src/modules/quotes/services/quote-event-notification.service.ts` (extender type a 13)
- `src/shared/logging/vendor-events.ts` (nuevo)
- Migración Prisma: `add_moderation_audit_to_vendor_profiles`.

### Orden sugerido
1. DB-001 + migración.
2. Extender service común + UT.
3. DTO + UT (incluye cross-field refine).
4. UseCase + UT (todas las branches y transiciones).
5. Controller + ruta.
6. Logger.
7. Tests IT + regresión + concurrencia + AUTH + Security + lookup US-040.
8. Documentación.

### Decisiones que no deben reabrirse
D1–D9.

### Qué no implementar
- UI (US-074).
- AI moderation.
- Bulk.
- Re-approve rejected.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 2 |
| BE | 6 |
| QA | 6 |
| DOC | 1 |
| **Total** | 15 |

(FE viene en US-074.)

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Cross-domain impact clear | Pass (vendor → notif + AdminAction + US-040 lookup) |
| Security clear | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-047 entrega endpoint admin único de moderación VendorProfile + AdminAction + 4 acciones + service común extendido a 13 eventos + migración menor audit. US-074 cerrará PB-P1-041 con la UI del panel admin.
