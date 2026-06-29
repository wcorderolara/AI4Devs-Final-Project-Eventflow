# Technical Specification — US-076: CRUD admin EventType + público

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-076 |
| Source User Story | `management/user-stories/US-076-admin-manage-event-types.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-076-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-043 |
| Backlog Title | Gestión de EventType (sin hard delete con eventos) |
| Backlog Execution Order | 76 |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-076 |
| Epic | EPIC-ADM-001 |
| Backlog Item Dependencies | PB-P0-001, US-067, US-075 |
| Feature | CRUD admin + endpoint público + guard EXISTS events |
| Module / Domain | Admin / Catalog |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-29 |
| Last Updated | 2026-06-29 |

---

## 2. Backlog Execution Context

PB-P1-043 single-story. Execution order 76. Pattern paridad US-075.

---

## 3. Executive Technical Summary

**Backend** — 4 UseCases (paridad US-075 simplificado, sin jerarquía):
- `ListEventTypesUseCase` (admin/public variants).
- `CreateEventTypeUseCase`: validación code único + AdminAction.
- `UpdateEventTypeUseCase`: PATCH name/desc/sort/is_active + AdminAction (con detección reactivate).
- `SoftDeleteEventTypeUseCase`: guard `EXISTS events` + UPDATE `is_active=false` + AdminAction.

**Frontend**:
- `EventTypeTable` simple (no tree, sin jerarquía).
- `EventTypeFormDialog`, `EventTypeDeleteDialog`.

**Database**:
- Verificar/migrar columnas i18n + sort_order + audit.
- Seed obligatorio 6 EventTypes (FR-EVENT-013).

---

## 4. Scope Boundary

### In Scope
- 5 endpoints + 4 use cases + UI table simple.
- Seed obligatorio.

### Out of Scope
- Hard delete físico.
- Jerarquía.
- Bulk reorder.
- AI EventTypes.

---

## 5. Architecture Alignment

Reuso AdminGuard US-067. Pattern de US-075.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 create | UseCase + code unique + AdminAction | BE, DB |
| AC-02 update | UseCase + detección reactivate | BE |
| AC-03 soft delete | UseCase + guard EXISTS events + AdminAction | BE, DB |
| AC-04 listado admin | UseCase admin variant | BE |
| AC-05 listado público | UseCase public variant | BE |
| EC-01..05 | Validaciones | BE |

---

## 7. Backend Technical Design

### DTOs

```ts
const NAME_I18N = z.record(z.string()).refine(v => !!v['es-LATAM'], { message: 'es-LATAM is required' });

export const createEventTypeBody = z.object({
  code: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/),
  name_i18n: NAME_I18N,
  description_i18n: z.record(z.string()).optional(),
  sort_order: z.number().int().min(0).optional().default(0),
}).strict();

export const updateEventTypeBody = z.object({
  name_i18n: NAME_I18N.optional(),
  description_i18n: z.record(z.string()).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  reason: z.string().min(0).max(500).optional(),
}).strict();

export const deleteEventTypeBody = z.object({
  reason: z.string().min(10).max(500),
}).strict();
```

### Use Case (SoftDelete con guard)

```ts
class SoftDeleteEventTypeUseCase {
  async execute({ currentUser, id, body }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.event_types.findUnique({ where: { id } });
      if (!existing) throw new EventTypeNotFoundError();

      const usageCount = await tx.events.count({ where: { event_type_id: id } });
      if (usageCount > 0) throw new EventTypeInUseError(usageCount);

      const updated = await tx.event_types.update({
        where: { id },
        data: { is_active: false },
      });

      await tx.admin_actions.create({
        data: {
          admin_id: currentUser.id,
          target_type: 'event_type',
          target_id: id,
          action: 'soft_delete',
          reason: body.reason,
          payload: { snapshot: existing },
        },
      });

      logger.info('event_type.soft_deleted', { eventTypeId: id, adminUserId: currentUser.id });
      return updated;
    });
  }
}
```

### Use Case (List)

```ts
class ListEventTypesUseCase {
  async execute({ includeInactive = false }) {
    const where = includeInactive ? {} : { is_active: true };
    return prisma.event_types.findMany({
      where,
      orderBy: [{ sort_order: 'asc' }, { name_i18n: 'asc' }],
    });
  }
}
```

### Routes
```ts
// Admin
router.get('/admin/event-types', adminRoleGuard, asyncHandler(controller.adminList));
router.post('/admin/event-types', adminRoleGuard, asyncHandler(controller.create));
router.patch('/admin/event-types/:id', adminRoleGuard, asyncHandler(controller.update));
router.delete('/admin/event-types/:id', adminRoleGuard, asyncHandler(controller.softDelete));

// Público
router.get('/event-types', authGuard, asyncHandler(controller.publicList));
```

### Error Handling
`400 INVALID_*`, `400 REASON_REQUIRED`, `401`, `403`, `404 EVENT_TYPE_NOT_FOUND`, `409 DUPLICATE_CODE`, `409 EVENT_TYPE_IN_USE`.

---

## 8. Frontend Technical Design

- Page `/admin/event-types`: tabla simple con CRUD.
- `EventTypeTable`: lista plana ordenada por sort_order.
- `EventTypeFormDialog`: RHF + Zod + i18n multi-locale.
- `EventTypeDeleteDialog`: confirmación con reason required.

---

## 9. API Contract

5 endpoints según §7.

---

## 10. Database / Prisma Design

### Models Impacted
`EventType` (read/write), `AdminAction` (insert), `Event` (read for guard).

### Migración menor (si faltan)

```sql
ALTER TABLE event_types
  ADD COLUMN IF NOT EXISTS name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS description_i18n jsonb NULL,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD CONSTRAINT IF NOT EXISTS event_types_code_unique UNIQUE (code);

CREATE INDEX IF NOT EXISTS idx_event_types_active_sort
  ON event_types (is_active, sort_order);
```

### Seed Impact
**Obligatorio** (FR-EVENT-013): 6 EventTypes con codes fijos `wedding, xv, baptism, baby_shower, birthday, corporate` con i18n en 4 locales.

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design
Admin only para CRUD. Auth required para público.

## 13. Testing Strategy

### Unit
- DTOs + UseCases branches.

### Integration
- TS-01..TS-06 + smoke público.

### API
Supertest.

### Security
- `404 EVENT_TYPE_NOT_FOUND` uniforme.
- AdminAction obligatorio.

### Accessibility
- Tabla + dialogs.

### Performance
- `< 500ms` p95.

---

## 14. Observability & Audit

Logs `event_type.created/updated/soft_deleted/reactivated` + AdminAction.

---

## 15. Seed / Demo
**Seed obligatorio** 6 EventTypes (FR-EVENT-013) con i18n 4 locales.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar 5 endpoints | Documentar. | Actualizar. | No |
| `docs/14` | Documentar módulo EventType en Catalog | Documentar. | Actualizar. | No |
| Schema event_types | Verificar columnas | Migración menor. | Aplicar. | No |
| PB-P1-043 Traceability | Backlog cita `FR-ADMIN-004` (ServiceCategory) incorrecto | Trazabilidad real registrada. | Housekeeping. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Hard delete accidental | Pérdida data + FK rotas | Solo soft delete; sin endpoint físico |
| Guard EXISTS lento | Latencia | Index sobre `events.event_type_id` |
| Seed faltante de 6 obligatorios | Wizard de Event creation rompe | Seed reproducible + IT validation |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/event-types/dto/{create,update,delete}.body.ts`
- `src/modules/event-types/use-cases/{list,create,update,soft-delete}.use-case.ts`
- `src/modules/event-types/controllers/{admin,public}-event-type.controller.ts`
- `src/modules/event-types/routes/{admin,public}.routes.ts`
- Migración Prisma.
- Seed actualizado con 6 obligatorios.

**Frontend**:
- `app/[locale]/admin/event-types/page.tsx`
- `components/admin/event-types/EventTypeTable.tsx`
- `components/admin/event-types/EventTypeFormDialog.tsx`
- `components/admin/event-types/EventTypeDeleteDialog.tsx`
- `lib/api/adminApi.ts` (extender)
- `lib/api/eventTypesApi.ts` (nuevo público)
- `messages/{4 locales}.json` (`admin.event-type.*`)

### Orden sugerido
1. DB-001 + migración + seed obligatorio.
2. DTOs + UT.
3. 4 UseCases + UT.
4. Controllers + rutas.
5. Frontend API + MSW.
6. Componentes UI.
7. Page + i18n.
8. Tests IT + AUTH + A11Y.
9. Documentación.

### Decisiones que no deben reabrirse
D1–D10.

### Qué no implementar
- Hard delete, jerarquía, bulk, AI.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 3 (verify + migración + seed obligatorio) |
| BE | 6 (DTOs(3), 4 UseCases, 2 Controllers — agrupados) |
| FE | 4 (Page, Table, FormDialog, DeleteDialog, API+MSW+i18n agrupado) |
| QA | 5 (UT, IT, AUTH, A11Y, Performance) |
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
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-076 entrega CRUD admin + endpoint público para EventType con guard EXISTS events + seed obligatorio 6 (FR-EVENT-013) + AdminAction. Pattern paridad US-075 sin jerarquía. PB-P1-043 single-story cierra.
