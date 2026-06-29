# Technical Specification — US-075: CRUD admin ServiceCategory + público

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-075 |
| Source User Story | `management/user-stories/US-075-admin-crud-service-categories.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-075-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-042 |
| Backlog Title | CRUD ServiceCategory (jerarquía 2 niveles) |
| Backlog Execution Order | 75 |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-075 |
| Epic | EPIC-ADM-001 |
| Backlog Item Dependencies | PB-P0-001, US-067 |
| Feature | CRUD admin + endpoint público + jerarquía + soft delete + AdminAction |
| Module / Domain | Admin / Catalog |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-29 |
| Last Updated | 2026-06-29 |

---

## 2. Backlog Execution Context

PB-P1-042 single-story. Execution order 75.

---

## 3. Executive Technical Summary

**Backend** — 4 UseCases:
- `ListServiceCategoriesUseCase` (admin variant con `is_active=false`; public variant solo activas).
- `CreateServiceCategoryUseCase`: validación jerarquía + code único + AdminAction.
- `UpdateServiceCategoryUseCase`: PATCH name/desc/parent/sort/is_active + validación jerarquía + AdminAction (reactivate si aplica).
- `SoftDeleteServiceCategoryUseCase`: guards (vendor_services, children activos) + UPDATE `is_active=false` + AdminAction.

**Controllers**:
- Admin: 4 endpoints.
- Público: 1 endpoint.

**Frontend**:
- `CategoryTreeView`, `CategoryFormDialog`, `CategoryDeleteDialog`.
- `adminApi.category.*`, `categoriesApi.list()` público.

**Database**:
- Verificar/migrar columnas i18n + jerarquía + audit.

---

## 4. Scope Boundary

### In Scope
- 5 endpoints + 4 use cases + controllers + tree UI + i18n.

### Out of Scope
- Jerarquía 3+, hard delete, bulk reorder, AI categories.

---

## 5. Architecture Alignment

Reuso AdminGuard US-067. Nuevo módulo `service-categories` o sub-módulo de admin.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 create root | UseCase + AdminAction | BE, DB |
| AC-02 create child | Idem + validación parent | BE, DB |
| AC-03 update | Idem + reactivate detection | BE |
| AC-04 soft delete | UseCase + guards EXISTS + UPDATE is_active=false | BE |
| AC-05 listado admin | UseCase admin variant | BE, FE |
| AC-06 listado público | UseCase public variant | BE, FE |
| EC-01..07 | Validaciones server-side | BE |

---

## 7. Backend Technical Design

### DTOs

```ts
const NAME_I18N = z.record(z.string()).refine(v => !!v['es-LATAM'], { message: 'es-LATAM is required' });

export const createServiceCategoryBody = z.object({
  code: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  name_i18n: NAME_I18N,
  description_i18n: z.record(z.string()).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().min(0).optional().default(0),
}).strict();

export const updateServiceCategoryBody = z.object({
  name_i18n: NAME_I18N.optional(),
  description_i18n: z.record(z.string()).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  reason: z.string().min(0).max(500).optional(),
}).strict();

export const deleteServiceCategoryBody = z.object({
  reason: z.string().min(10).max(500),
}).strict();
```

### Use Case (Create)

```ts
class CreateServiceCategoryUseCase {
  async execute({ currentUser, body }) {
    return prisma.$transaction(async (tx) => {
      // Validación parent jerarquía
      if (body.parent_id) {
        const parent = await tx.service_categories.findUnique({ where: { id: body.parent_id } });
        if (!parent) throw new InvalidParentIdError();
        if (parent.parent_id !== null) throw new InvalidHierarchyDepthError();
      }

      // Code único
      const dup = await tx.service_categories.findUnique({ where: { code: body.code } });
      if (dup) throw new DuplicateCodeError();

      const created = await tx.service_categories.create({
        data: {
          code: body.code,
          name_i18n: body.name_i18n,
          description_i18n: body.description_i18n ?? null,
          parent_id: body.parent_id ?? null,
          sort_order: body.sort_order,
          is_active: true,
        },
      });

      await tx.admin_actions.create({
        data: {
          admin_id: currentUser.id,
          target_type: 'service_category',
          target_id: created.id,
          action: 'create',
          payload: { code: created.code, name_i18n: created.name_i18n, parent_id: created.parent_id },
        },
      });

      logger.info('service_category.created', { categoryId: created.id, adminUserId: currentUser.id });
      return created;
    });
  }
}
```

### Use Case (Update con validación reactivate)

```ts
class UpdateServiceCategoryUseCase {
  async execute({ currentUser, id, body }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.service_categories.findUnique({
        where: { id },
        include: { _count: { select: { children: true } } },
      });
      if (!existing) throw new ServiceCategoryNotFoundError();

      // Validar parent_id si cambia
      if (body.parent_id !== undefined && body.parent_id !== existing.parent_id) {
        if (body.parent_id) {
          const parent = await tx.service_categories.findUnique({ where: { id: body.parent_id } });
          if (!parent || parent.parent_id !== null) throw new InvalidHierarchyDepthError();
          // Si esta categoría tiene children, no puede pasar a ser child
          if (existing._count.children > 0) throw new InvalidHierarchyDepthError();
        }
      }

      const wasActive = existing.is_active;
      const willBeActive = body.is_active ?? wasActive;
      const isReactivating = !wasActive && willBeActive;

      const updated = await tx.service_categories.update({
        where: { id },
        data: {
          ...(body.name_i18n !== undefined && { name_i18n: body.name_i18n }),
          ...(body.description_i18n !== undefined && { description_i18n: body.description_i18n }),
          ...(body.parent_id !== undefined && { parent_id: body.parent_id }),
          ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
          ...(body.is_active !== undefined && { is_active: body.is_active }),
        },
      });

      await tx.admin_actions.create({
        data: {
          admin_id: currentUser.id,
          target_type: 'service_category',
          target_id: id,
          action: isReactivating ? 'reactivate' : 'update',
          reason: body.reason ?? null,
          payload: { from: existing, to: updated },
        },
      });

      logger.info('service_category.updated', { categoryId: id, adminUserId: currentUser.id, isReactivating });
      return updated;
    });
  }
}
```

### Use Case (Soft Delete con guards)

```ts
class SoftDeleteServiceCategoryUseCase {
  async execute({ currentUser, id, body }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.service_categories.findUnique({ where: { id } });
      if (!existing) throw new ServiceCategoryNotFoundError();

      const usageCount = await tx.vendor_services.count({ where: { service_category_id: id } });
      if (usageCount > 0) throw new CategoryInUseError(usageCount);

      const activeChildrenCount = await tx.service_categories.count({
        where: { parent_id: id, is_active: true },
      });
      if (activeChildrenCount > 0) throw new CategoryHasChildrenError(activeChildrenCount);

      const updated = await tx.service_categories.update({
        where: { id },
        data: { is_active: false },
      });

      await tx.admin_actions.create({
        data: {
          admin_id: currentUser.id,
          target_type: 'service_category',
          target_id: id,
          action: 'soft_delete',
          reason: body.reason,
          payload: { snapshot: existing },
        },
      });

      logger.info('service_category.soft_deleted', { categoryId: id, adminUserId: currentUser.id });
      return updated;
    });
  }
}
```

### Use Case (List)

```ts
class ListServiceCategoriesUseCase {
  async execute({ includeInactive = false }) {
    const where = includeInactive ? {} : { is_active: true };
    const all = await prisma.service_categories.findMany({
      where,
      orderBy: [{ sort_order: 'asc' }, { name_i18n: 'asc' }],
    });

    // Tree
    const rootMap = new Map();
    for (const c of all.filter(c => c.parent_id === null)) {
      rootMap.set(c.id, { ...c, children: [] });
    }
    for (const c of all.filter(c => c.parent_id !== null)) {
      const parent = rootMap.get(c.parent_id);
      if (parent) parent.children.push(c);
    }

    const tree = Array.from(rootMap.values());
    const flat = all.map(c => ({ ...c, full_path: getFullPath(c, all) }));

    return { tree, flat };
  }
}
```

### Routes
```ts
// Admin
router.get('/admin/service-categories', adminRoleGuard, asyncHandler(controller.adminList));
router.post('/admin/service-categories', adminRoleGuard, asyncHandler(controller.create));
router.patch('/admin/service-categories/:id', adminRoleGuard, asyncHandler(controller.update));
router.delete('/admin/service-categories/:id', adminRoleGuard, asyncHandler(controller.softDelete));

// Público
router.get('/service-categories', authGuard, asyncHandler(controller.publicList));
```

### Error Handling
`400 INVALID_*`, `400 REASON_REQUIRED`, `401`, `403`, `404 SERVICE_CATEGORY_NOT_FOUND`, `409 INVALID_HIERARCHY_DEPTH`, `409 DUPLICATE_CODE`, `409 CATEGORY_IN_USE`, `409 CATEGORY_HAS_CHILDREN`.

---

## 8. Frontend Technical Design

### Componentes

- Page `/admin/categories`: Server Component shell + Client island con `CategoryTreeView`.
- `CategoryTreeView`: render recursivo del tree con expand/collapse + acciones por nodo.
- `CategoryFormDialog`: modal RHF+Zod con i18n input multi-locale + parent selector (solo roots).
- `CategoryDeleteDialog`: confirmación con textarea reason required.

### Hooks
- `useServiceCategoriesAdmin`: TanStack Query con queryKey `['admin.categories']`.
- `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`: mutations con invalidate.

### Forms
RHF + Zod. Input multi-locale para `name_i18n` (4 fields, es-LATAM required).

### i18n
`admin.category.tree.*`, `admin.category.form.*`, `admin.category.delete.*`, `admin.category.errors.*` en 4 locales.

---

## 9. API Contract

5 endpoints según §7.

---

## 10. Database / Prisma Design

### Models Impacted
`ServiceCategory` (read/write), `AdminAction` (insert), `VendorService` (read for guard).

### Migración menor (si faltan)

```sql
ALTER TABLE service_categories
  ADD COLUMN IF NOT EXISTS name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS description_i18n jsonb NULL,
  ADD COLUMN IF NOT EXISTS parent_id uuid NULL REFERENCES service_categories(id),
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD CONSTRAINT IF NOT EXISTS service_categories_code_unique UNIQUE (code);

CREATE INDEX IF NOT EXISTS idx_service_categories_parent_active
  ON service_categories (parent_id, is_active, sort_order);
```

### Seed Impact
Seed con catálogo cultural LATAM (BR-SERVICE-004): catering, salón/venue, decoración, fotografía, video, música (DJ, mariachi, marimba, hora loca), pastel/mesa de dulces, makeup/peinado, etc.

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design

Admin only para CRUD endpoints. Auth required (cualquier rol) para público.

## 13. Testing Strategy

### Unit
- DTOs + UseCases branches (jerarquía, guards, reactivate, code unique).

### Integration
- TS-01..TS-07 + smoke del endpoint público.

### API
Supertest.

### Security
- Vendor/Organizer en admin endpoints → 403.
- Sin sesión en público → 401.

### Accessibility
- Tree + dialogs.

### Performance
- `< 500ms` p95.

---

## 14. Observability & Audit

Logs `service_category.created/updated/soft_deleted` + AdminAction obligatorio.

---

## 15. Seed / Demo
Seed con ~15 categorías culturalmente coherentes LATAM (BR-SERVICE-004), incluyendo ~3 con subcategorías para demo de jerarquía.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar 5 endpoints | Documentar. | Actualizar. | No |
| `docs/14` | Documentar módulo Catalog | Documentar. | Actualizar. | No |
| Schema service_categories | Verificar columnas i18n + jerarquía | Migración menor. | Aplicar. | No |
| PB-P1-042 Traceability | Backlog cita `FR-ADMIN-003` (no es CRUD; es moderación vendor). | Trazabilidad real registrada. | Housekeeping. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Jerarquía 3+ bypass | Catálogo desordenado | Whitelist validación en create + update |
| Hard delete accidental | Pérdida de data + FKs rotas | Solo soft delete; sin endpoint DELETE físico |
| Guards EXISTS lentos | Latencia | Indexes apropiados |
| i18n parcial sin fallback | UX degradada | Validación required es-LATAM + fallback runtime |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/service-categories/dto/{create,update,delete}.body.ts` (nuevos)
- `src/modules/service-categories/use-cases/{create,update,soft-delete,list}.use-case.ts` (4 nuevos)
- `src/modules/service-categories/controllers/admin-service-category.controller.ts` (nuevo)
- `src/modules/service-categories/controllers/public-service-category.controller.ts` (nuevo)
- `src/modules/service-categories/routes/{admin,public}.routes.ts`
- `src/shared/logging/service-category-events.ts` (nuevo)
- Migración Prisma.
- Seed actualizado.

**Frontend**:
- `app/[locale]/admin/categories/page.tsx`
- `components/admin/categories/CategoryTreeView.tsx`
- `components/admin/categories/CategoryFormDialog.tsx`
- `components/admin/categories/CategoryDeleteDialog.tsx`
- `hooks/useServiceCategoriesAdmin.ts`
- `lib/api/adminApi.ts` (extender)
- `lib/api/categoriesApi.ts` (nuevo público)
- `messages/{4 locales}.json` (`admin.category.*`)

### Orden sugerido
1. DB-001 + migración + seed cultural.
2. DTOs + UT.
3. 4 UseCases + UT (incluye jerarquía + guards).
4. Controllers + rutas.
5. Logger.
6. Frontend API + MSW.
7. Componentes UI.
8. Page + i18n.
9. Tests IT + AUTH + A11Y + Performance.
10. Documentación.

### Decisiones que no deben reabrirse
D1–D10.

### Qué no implementar
- Jerarquía 3+.
- Hard delete.
- Bulk reorder.
- AI categories.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 2 (verify + migración + seed) |
| BE | 7 (DTOs, 4 UseCases, 2 Controllers) |
| FE | 5 (Page, Tree, FormDialog, DeleteDialog, API+MSW+i18n) |
| QA | 6 (UT, IT admin, IT público, AUTH, A11Y, Performance) |
| DOC | 1 |
| **Total** | 21 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Cross-module impact clear | Pass |
| Security clear | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-075 entrega CRUD admin completo + endpoint público para ServiceCategory con jerarquía 2 niveles + soft delete con guards + AdminAction obligatorio + i18n + seed cultural LATAM. Single-story de PB-P1-042.
