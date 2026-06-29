# Technical Specification — US-074: Admin Vendor Panel (list + filters + UI)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-074 |
| Source User Story | `management/user-stories/US-074-admin-approve-reject-vendor-extended.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-074-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-041 |
| Backlog Title | Admin: aprobar / rechazar / ocultar vendor |
| Backlog Execution Order | 74 |
| User Story Position in Backlog Item | 2 de 2 (cierra) |
| Related User Stories in Backlog Item | US-047, US-074 |
| Epic | EPIC-ADM-001 / EPIC-VND-001 |
| Backlog Item Dependencies | US-047, US-066/US-077 (cursor pattern) |
| Feature | Endpoint admin global + UI panel + integración con US-047 |
| Module / Domain | Admin / Vendors |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-29 |
| Last Updated | 2026-06-29 |

---

## 2. Backlog Execution Context

PB-P1-041 multi-story. US-074 cierra. Execution order 74.

---

## 3. Executive Technical Summary

**Backend**:
- `ListVendorsForAdminUseCase`: lectura paginada con cursor + filtros combinados (status multi, is_hidden, fechas, business_name ILIKE) + include owner email + last admin_action.
- Controller `GET /api/v1/admin/vendors`.
- AdminRoleGuard reuso US-067.

**Frontend**:
- Page `/admin/vendors` integra `VendorModerationTable` + `VendorFiltersPanel` + `VendorModerationDialog` + hook `useModerateVendor` (consume endpoint US-047).
- `adminApi.vendor.list(filters)` + `adminApi.vendor.moderate(id, body)` (reuso US-047).

---

## 4. Scope Boundary

### In Scope
- UseCase + DTO filtros + Controller.
- 3 componentes nuevos FE + hook.
- i18n.
- Tests + regresión US-047.

### Out of Scope
- Bulk, exports, búsqueda full-text.

---

## 5. Architecture Alignment

Reuso máximo de US-066 (cursor) + US-067 (AdminGuard) + US-047 (endpoint moderate). Pattern análogo a US-077.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 listado default pending | UseCase + frontend pre-aplica filter | BE, FE |
| AC-02 filtros combinados | DTO + WHERE compuesto | BE |
| AC-03 owner email + last_admin_action | Mapper | BE |
| AC-04 UI panel | Page + 3 componentes | FE |
| AC-05 refresh post-moderate | useModerateVendor con invalidate | FE |
| EC-01..05 | Validaciones | BE |
| AUTH-TS-01..04 | AdminGuard | BE |

---

## 7. Backend Technical Design

### Use Case

```ts
class ListVendorsForAdminUseCase {
  async execute({ filters }) {
    const cursor = filters.cursor ? decodeCursor(filters.cursor) : null;
    const pageSize = filters.pageSize ?? 25;

    const where: any = {};
    if (filters.status?.length) where.status = { in: filters.status };
    if (filters.is_hidden !== undefined) where.is_hidden = filters.is_hidden;
    if (filters.created_at_from || filters.created_at_to) {
      where.created_at = {};
      if (filters.created_at_from) where.created_at.gte = filters.created_at_from;
      if (filters.created_at_to) where.created_at.lte = filters.created_at_to;
    }
    if (filters.business_name?.trim()) {
      where.business_name = { contains: filters.business_name.trim(), mode: 'insensitive' };
    }
    if (cursor) {
      where.OR = [
        { created_at: { lt: cursor.created_at } },
        { created_at: cursor.created_at, id: { lt: cursor.id } },
      ];
    }

    const vendors = await prisma.vendor_profiles.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      include: {
        user: { select: { id: true, email: true } },
        admin_action: { select: { action: true, reason: true, admin_id: true, created_at: true } },
      },
    });

    const hasMore = vendors.length > pageSize;
    const items = vendors.slice(0, pageSize).map(mapToAdminVendor);
    const nextCursor = hasMore
      ? encodeCursor({ created_at: items.at(-1).created_at, id: items.at(-1).id })
      : null;

    return { items, pagination: { next_cursor: nextCursor, page_size: pageSize } };
  }
}
```

### Mapper

```ts
function mapToAdminVendor(v): AdminVendorListItem {
  return {
    id: v.id,
    business_name: v.business_name,
    slug: v.slug,
    status: v.status,
    is_hidden: v.is_hidden,
    created_at: v.created_at.toISOString(),
    owner: { user_id: v.user.id, email: v.user.email },
    last_admin_action: v.admin_action ? {
      action: v.admin_action.action,
      reason: v.admin_action.reason,
      admin_id: v.admin_action.admin_id,
      created_at: v.admin_action.created_at.toISOString(),
    } : null,
  };
}
```

### Routes
```ts
router.get(
  '/admin/vendors',
  adminRoleGuard, // reuso US-067
  asyncHandler(controller.list.bind(controller))
);
```

### DTOs

```ts
const STATUS = z.enum(['pending', 'approved', 'rejected']);

export const adminVendorsQuery = z.object({
  status: z.union([STATUS, z.array(STATUS)]).optional().transform(toArray),
  is_hidden: z.coerce.boolean().optional(),
  created_at_from: z.coerce.date().optional(),
  created_at_to: z.coerce.date().optional(),
  business_name: z.string().min(1).max(100).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(25),
  cursor: z.string().optional(),
}).strict()
.refine(d => !d.created_at_from || !d.created_at_to || d.created_at_from <= d.created_at_to, { message: 'created_at_from must be <= created_at_to' });
```

### Error Handling
`400 INVALID_FILTERS`, `400 INVALID_CURSOR`, `400 INVALID_PAGE_SIZE`, `401`, `403`.

---

## 8. Frontend Technical Design

### Componentes

- Page `/admin/vendors` (Server Component shell + Client island con pre-applied filter `status=pending`).
- `VendorModerationTable`: tabla con columnas {business_name, status, is_hidden, owner.email, created_at, last_admin_action_action, actions}.
- `VendorFiltersPanel`: status multi-checkbox, is_hidden toggle, date pickers, business_name search debounced 300ms.
- `VendorModerationDialog`: action selector (radio: approve/reject/hide/unhide) + textarea reason (required condicionalmente según action).

### State Management
- `useInfiniteQuery` con queryKey `['admin.vendors', filters]`.
- `useModerateVendor`: mutation a US-047 endpoint con `onSuccess` invalidate `['admin.vendors']` + `['vendor.profile', vendorId]`.

### Forms
RHF + Zod alineado backend + DTO de US-047.

### i18n
`admin.vendor.panel.*`, `admin.vendor.filters.*`, `admin.vendor.moderate.*`, `admin.vendor.actions.*` en 4 locales.

---

## 9. API Contract

| Method | Endpoint | Query | Response | Errors |
|---|---|---|---|---|
| GET | `/api/v1/admin/vendors` | filtros + cursor + pageSize | `200 {items, pagination}` | 400, 401, 403 |

---

## 10. Database / Prisma Design

### Models Impacted
`VendorProfile` (read), `User` (read for owner), `AdminAction` (read).

### Index
Considerar `(status, created_at DESC)` parcial. Para `business_name ILIKE` evaluar trigram (`gin_trgm_ops`) post-MVP.

### Migration
Sin migraciones obligatorias.

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design
Admin only. AdminGuard reuso US-067.

## 13. Testing Strategy

### Unit
- DTO filtros + refines.
- Mapper.
- UseCase WHERE compuesto.

### Integration
- TS-01..TS-05 + regresión US-047 (endpoint moderate continúa funcional + invalidación).

### API
Supertest.

### Security
- Admin only.

### Accessibility
- Tabla + dialog + filtros.

### Performance
- `< 500ms` p95 con filtros combinados.
- ILIKE puede degradarse con muchos vendors; reconsiderar trigram post-MVP.

---

## 14. Observability & Audit
Log estándar.

---

## 15. Seed / Demo
Reuso. Verificar ≥5 vendors en diferentes estados para demo del panel.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar endpoint admin vendors list | Documentar. | Actualizar. | No |
| `docs/14` | Documentar panel admin vendors | Documentar. | Actualizar. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| ILIKE lento con muchos vendors | Performance | MVP aceptable; evaluar trigram post-MVP |
| Refresh ruidoso post-moderate | UX | Invalidate específico con queryKey filters |
| Filtros combinados sin index | Latencia | Considerar `(status, created_at DESC)` parcial |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/admin/dto/admin-vendors.query.ts` (nuevo)
- `src/modules/admin/use-cases/list-vendors-for-admin.use-case.ts` (nuevo)
- `src/modules/admin/mappers/admin-vendor.mapper.ts` (nuevo)
- `src/modules/admin/controllers/admin-vendor.controller.ts` (extender con `list`)
- `src/modules/admin/routes/admin-vendor.routes.ts` (extender)

**Frontend**:
- `app/[locale]/admin/vendors/page.tsx` (nuevo)
- `components/admin/vendors/VendorModerationTable.tsx` (nuevo)
- `components/admin/vendors/VendorFiltersPanel.tsx` (nuevo)
- `components/admin/vendors/VendorModerationDialog.tsx` (nuevo)
- `hooks/useModerateVendor.ts` (nuevo)
- `lib/api/adminApi.ts` (extender con `vendor.list` y `vendor.moderate`)
- `messages/{4 locales}.json` (`admin.vendor.*`)

### Orden sugerido
1. DTO + Mapper + UT.
2. UseCase + UT.
3. Controller + ruta.
4. Frontend API + MSW.
5. Hook moderate.
6. Componentes UI.
7. Page + i18n.
8. Tests IT + regresión US-047 + AUTH + A11Y.
9. Documentación.

### Decisiones que no deben reabrirse
D1–D8.

### Qué no implementar
- Bulk, exports, full-text.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 1 |
| BE | 4 |
| FE | 5 |
| QA | 5 |
| DOC | 1 |
| **Total** | 16 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Reuso clear | Pass |
| Security clear | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-074 cierra PB-P1-041 con endpoint admin global de vendors + panel UI completo. Reuso máximo de US-047 (endpoint moderate + AdminGuard), US-066/US-077 (cursor). Sin migraciones.
