# PO/BA Decision Resolution — US-075

## Source User Story File
management/user-stories/US-075-admin-crud-service-categories.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-075-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-075 |
| Backlog Item | PB-P1-042 |
| Decisiones tomadas | 10 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Endpoints REST estándar
```
- GET /api/v1/admin/service-categories (listado tree admin)
- POST /api/v1/admin/service-categories (create)
- PATCH /api/v1/admin/service-categories/:id (update name/desc/is_active/sort_order/parent_id)
- DELETE /api/v1/admin/service-categories/:id (soft delete con guards)

Reorder vía PATCH `sort_order` (sin endpoint dedicado).
```

### D2 — Listado admin shape
```
GET response: tree completo + flat para selects.

{
  tree: [
    {
      id, code, name_i18n, description_i18n?, sort_order, is_active,
      children: [ { id, code, name_i18n, ..., parent_id, sort_order, is_active } ]
    }
  ],
  flat: [ { id, code, name_i18n, parent_id, full_path, is_active } ]
}

Admin ve `is_active=false` también; público (US-040) filtra solo activos.
```

### D3 — i18n name + description
```
`name_i18n jsonb NOT NULL`: requiere al menos `es-LATAM`. Otros locales opcionales con fallback a es-LATAM.

`description_i18n jsonb NULL`: opcional, mismas reglas.

Body de create/update incluye `name_i18n` completo (no merge parcial).
```

### D4 — Jerarquía 2 niveles server-side
```
Reglas:
- Root: `parent_id IS NULL`.
- Child: `parent_id IS NOT NULL` Y el parent debe tener `parent_id IS NULL`.

Validaciones:
- POST con `parent_id` apuntando a un child ⇒ `409 INVALID_HIERARCHY_DEPTH`.
- PATCH para asignar `parent_id` cuando la categoría YA tiene children ⇒ `409 INVALID_HIERARCHY_DEPTH`.
- Cualquier intento de crear nivel 3 ⇒ `409 INVALID_HIERARCHY_DEPTH`.
```

### D5 — Soft delete con guards
```
DELETE /admin/service-categories/:id:
1. Verificar dependencias:
   - `EXISTS vendor_services WHERE service_category_id=:id` ⇒ `409 CATEGORY_IN_USE` con `details.usage_count`.
   - `EXISTS service_categories WHERE parent_id=:id AND is_active=true` ⇒ `409 CATEGORY_HAS_CHILDREN`.
2. Si sin dependencias: UPDATE `is_active=false`. NO hard delete físico.

`active service_categories WHERE parent_id=:id AND is_active=false` (children inactivos) NO bloquean.
```

### D6 — Reactivar categoría
```
PATCH con `is_active=true` reactiva soft-deleted. Permitido siempre que la categoría exista. AdminAction action='reactivate'.
```

### D7 — AdminAction obligatorio
```
Por cada operación CRUD (create/update/soft_delete/reactivate), INSERT admin_actions con:
{ admin_id, target_type='service_category', target_id, action, reason?, payload: snapshot }

Reason opcional [0..500] excepto para soft_delete que es REQUERIDO [10..500].
```

### D8 — Reorder via sort_order
```
PATCH con `sort_order: integer` cambia orden entre siblings (mismo parent o roots).

`sort_order` debe ser >= 0. No-unique entre siblings; en empate, fallback `name_i18n.es-LATAM ASC`.

Bulk reorder out of scope MVP (cada PATCH es individual).
```

### D9 — `404 SERVICE_CATEGORY_NOT_FOUND` uniforme
```
Categoría inexistente ⇒ `404 SERVICE_CATEGORY_NOT_FOUND`.
```

### D10 — Endpoint público listado incluido en esta US
```
GET /api/v1/service-categories (público autenticado):
- Solo `is_active=true`.
- Tree + flat.
- Sin AdminAction info.

US-075 entrega ambos endpoints (admin + público). El público se reusará en US-040, vendor service creation, QR creation forms.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Endpoints | 5 REST estándar (sin reorder dedicated) |
| 2 | Listado shape | tree + flat con is_active flag |
| 3 | i18n | name_i18n + description_i18n jsonb |
| 4 | Jerarquía | 2 niveles enforcement server-side |
| 5 | Soft delete | guards EXISTS services/children + is_active=false |
| 6 | Reactivar | PATCH is_active=true |
| 7 | AdminAction | obligatorio por cada op |
| 8 | Reorder | sort_order via PATCH |
| 9 | 404 | uniforme |
| 10 | Endpoint público | incluido (`GET /service-categories`) |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-075-admin-crud-service-categories.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
