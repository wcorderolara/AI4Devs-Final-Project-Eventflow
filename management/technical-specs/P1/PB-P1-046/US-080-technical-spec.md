# Technical Specification — US-080: AdminAction Log Viewer

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-080 |
| Source User Story | `management/user-stories/US-080-admin-action-log-viewer.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-080-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-046 |
| Backlog Title | Visor del log AdminAction |
| Backlog Execution Order | 80 |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-080 |
| Epic | EPIC-ADM-001 |
| Backlog Item Dependencies | PB-P0-001, US-067, US-066/US-077 |
| Feature | Endpoint admin único listado audit log con filtros + cursor |
| Module / Domain | Admin / Audit |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-29 |
| Last Updated | 2026-06-29 |

---

## 2. Backlog Execution Context

PB-P1-046 single-story. Execution order 80. **Cierra EPIC-ADM-001**.

---

## 3. Executive Technical Summary

**Backend**:
- `ListAdminActionsUseCase`: lectura paginada con cursor + filtros (admin_id, target_type, target_id, action, fechas).
- Controller único `GET /api/v1/admin/admin-actions`.
- AdminRoleGuard reuso US-067.
- **Inmutabilidad arquitectónica**: módulo SOLO expone GET.

**Frontend**:
- `AdminActionsTable` + `AdminActionsFiltersPanel` + `AdminActionRowExpansion` para payload completo.
- `adminApi.adminActions.list(filters)`.

---

## 4. Scope Boundary

### In Scope
- UseCase + Controller + UI table + row expansion + i18n.

### Out of Scope
- Endpoints de mutación.
- Self-log al consultar.
- Search full-text.
- Rol auditor granular.
- Export.

---

## 5. Architecture Alignment

Reuso AdminGuard US-067 + cursor utility US-066. Nuevo módulo `admin/admin-actions`.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 listado filtros | UseCase + filtros compuestos | BE |
| AC-02 admin info + payload | Include + mapper | BE |
| AC-03 inmutabilidad arquitectónica | Solo GET expuesto | BE |
| AC-04 self-log evitado | NO crea AdminAction al consultar | BE |
| EC-01..04 | Validaciones | BE |

---

## 7. Backend Technical Design

### Use Case

```ts
class ListAdminActionsUseCase {
  async execute({ filters }) {
    const cursor = filters.cursor ? decodeCursor(filters.cursor) : null;
    const pageSize = filters.pageSize ?? 25;

    const where: any = {};
    if (filters.admin_id) where.admin_id = filters.admin_id;
    if (filters.target_type) where.target_type = filters.target_type;
    if (filters.target_id) where.target_id = filters.target_id;
    if (filters.action) where.action = filters.action;
    if (filters.created_at_from || filters.created_at_to) {
      where.created_at = {};
      if (filters.created_at_from) where.created_at.gte = filters.created_at_from;
      if (filters.created_at_to) where.created_at.lte = filters.created_at_to;
    }
    if (cursor) {
      where.OR = [
        { created_at: { lt: cursor.created_at } },
        { created_at: cursor.created_at, id: { lt: cursor.id } },
      ];
    }

    const actions = await prisma.admin_actions.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      include: {
        admin: { select: { id: true, business_name: true, email: true } },
      },
    });

    const hasMore = actions.length > pageSize;
    const items = actions.slice(0, pageSize).map(mapToAdminActionItem);
    const nextCursor = hasMore
      ? encodeCursor({ created_at: items.at(-1).created_at, id: items.at(-1).id })
      : null;

    // IMPORTANTE: NO crear AdminAction aquí (self-log evitado por D6)
    logger.info('admin.admin_actions.viewed', { filterCount: countFilters(filters) });

    return { items, pagination: { next_cursor: nextCursor, page_size: pageSize } };
  }
}
```

### Routes
```ts
// SOLO GET expuesto en el módulo
router.get('/admin/admin-actions', adminRoleGuard, asyncHandler(controller.list));

// NO POST/PATCH/DELETE — arquitectónicamente prohibido
```

### DTOs

```ts
export const adminActionsQuery = z.object({
  admin_id: z.string().uuid().optional(),
  target_type: z.enum(['review', 'vendor_profile', 'service_category', 'event_type', 'event']).optional(),
  target_id: z.string().uuid().optional(),
  action: z.string().min(1).max(64).optional(),
  created_at_from: z.coerce.date().optional(),
  created_at_to: z.coerce.date().optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(25),
  cursor: z.string().optional(),
}).strict()
.refine(d => !d.created_at_from || !d.created_at_to || d.created_at_from <= d.created_at_to, { message: 'created_at_from must be <= created_at_to' });
```

### Error Handling
`400 INVALID_*`, `401`, `403`.

---

## 8. Frontend Technical Design

### Componentes

- Page `/admin/admin-actions`: tabla con filtros panel.
- `AdminActionsTable`: columnas {created_at, admin, target_type, target_id, action, reason, [expand]}.
- `AdminActionsFiltersPanel`: form controlled con debounce.
- `AdminActionRowExpansion`: muestra `payload` JSON formateado al expandir row.

### State Management
- `useInfiniteQuery` con queryKey `['admin.admin-actions', filters]`.

### Forms
RHF + Zod.

### i18n
`admin.admin-actions.*` en 4 locales.

---

## 9. API Contract

| Method | Endpoint | Query | Response | Errors |
|---|---|---|---|---|
| GET | `/api/v1/admin/admin-actions` | filtros + cursor + pageSize | `200 {items, pagination}` | 400, 401, 403 |

---

## 10. Database / Prisma Design

### Models Impacted
`AdminAction` (read), `User` (read for admin info).

### Indexes
Verificar/crear:
- `(created_at DESC)` general.
- `(admin_id, created_at DESC)` para filter por actor.
- `(target_type, target_id, created_at DESC)` para audit de entity específica.

### Migration
Posible 1 migración menor si índices faltan.

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design
Admin only. AdminGuard. Sin endpoints de mutación.

## 13. Testing Strategy

### Unit
- DTO + UseCase branches.

### Integration
- TS-01..TS-05.
- Architectural test: verificar NO existen POST/PATCH/DELETE.
- Verificar NO se crea AdminAction al consultar (count `admin_actions` antes y después).

### API
Supertest.

### Security
- Admin only.
- Self-log evitado.
- Inmutabilidad enforced.

### Accessibility
- Tabla + expand.

### Performance
- `< 500ms p95` con filtros.

---

## 14. Observability & Audit

Log `admin.admin_actions.viewed` (estándar). NO AdminAction.

---

## 15. Seed / Demo
Reuso. Los AdminActions generados por US-067/047/075/076/079/etc. proveen data.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar endpoint visor | Documentar. | Actualizar. | No |
| `docs/14` | Documentar inmutabilidad arquitectónica del módulo | Documentar. | Actualizar. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Endpoint de mutación accidental añadido | Violación FR-ADMIN-006 inmutabilidad | Architectural test (QA-003) |
| Self-log loop | Audit table grow exponencial | NO INSERT AdminAction en este UseCase |
| Queries sin index | Performance degraded | DB-001 + DB-002 si necesario |
| Payload JSON grandes en items | Response size | Aceptable MVP; considerar `select_payload` query param post-MVP |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/admin/admin-actions/dto/admin-actions.query.ts`
- `src/modules/admin/admin-actions/use-cases/list-admin-actions.use-case.ts`
- `src/modules/admin/admin-actions/mappers/admin-action.mapper.ts`
- `src/modules/admin/admin-actions/controllers/admin-actions.controller.ts`
- `src/modules/admin/admin-actions/routes/admin-actions.routes.ts` (SOLO GET)

**Frontend**:
- `app/[locale]/admin/admin-actions/page.tsx`
- `components/admin/admin-actions/AdminActionsTable.tsx`
- `components/admin/admin-actions/AdminActionsFiltersPanel.tsx`
- `components/admin/admin-actions/AdminActionRowExpansion.tsx`
- `lib/api/adminApi.ts` (extender)
- `messages/{4 locales}.json`

### Orden sugerido
1. DB-001.
2. DTO + Mapper + UT.
3. UseCase + UT.
4. Controller + ruta (SOLO GET).
5. Frontend API + MSW.
6. Componentes + Page.
7. i18n.
8. Tests IT + Architectural + AUTH + Performance.
9. Documentación.

### Decisiones que no deben reabrirse
D1–D8.

### Qué no implementar
- Endpoints de mutación.
- Self-log.
- Search full-text.

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
| Security clear (inmutable) | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-080 entrega endpoint admin único de listado del log AdminAction inmutable + filtros + cursor + self-log evitado. **Cierra EPIC-ADM-001 — Admin Governance** (7 PBIs completos: PB-P1-040/041/042/043/044/045/046).
