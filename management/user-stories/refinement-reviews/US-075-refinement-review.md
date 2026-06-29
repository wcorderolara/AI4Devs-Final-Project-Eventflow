# User Story Refinement Review — US-075

## Source User Story File
management/user-stories/US-075-admin-crud-service-categories.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-075-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)
Q1–Q10 resueltas. La US-075 declara `Backlog Item: PB-P1-042`, `PO/BA Decisions Applied` D1–D10, trazabilidad corregida (FR-ADMIN-002 inaplicable→FR-ADMIN-004+FR-SERVICE-001/002/003/005/006; UC-ADMIN-003→UC-ADMIN-007; NFR-PERF-API-001→NFR-PERF-001; agregados BR-ADMIN-002/012). 5 endpoints REST (4 admin + 1 público), jerarquía 2 niveles enforcement, soft delete con guards, AdminAction obligatorio, i18n con fallback. AC-01..AC-06, EC-01..EC-07, VR-01..VR-12, SEC-01..SEC-06, TS-01..TS-07, NT-01..NT-09, AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-075 |
| Backlog Item | PB-P1-042 — CRUD ServiceCategory (jerarquía 2 niveles) |
| Epic | EPIC-ADM-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-075-refinement-review.md |

## 2. Diagnóstico

US-075 single-story. CRUD admin completo de ServiceCategory con jerarquía 2 niveles (Decisión PO 8.1 #18). Pattern análogo a moderación de US-067/US-047 pero CRUD completo.

### Hallazgos

1. **Trazabilidad incorrecta**: cita `FR-ADMIN-002` (no aplica) y `UC-ADMIN-003` (probable login). Correctos:
   - **`FR-ADMIN-004`** (admin CRUD ServiceCategory con jerarquía 2).
   - **`FR-SERVICE-001`** (catálogo admin-only).
   - **`FR-SERVICE-002`** (jerarquía max 2 niveles).
   - **`FR-SERVICE-003`** (no hard delete con dependencias; soft delete).
   - **`FR-SERVICE-005`** (vendor asigna, no crea).
   - **`FR-SERVICE-006`** (admin activa/desactiva/edita/reordena).
   - **`UC-ADMIN-007`** ✓.
   - **`BR-SERVICE-003/005/007`**, **`BR-ADMIN-002/011/012`**.
   - `NFR-PERF-API-001` → `NFR-PERF-001`.
2. **Falta declarar `Backlog Item: PB-P1-042`**.
3. **ACs genéricos** — necesitan reescribirse con detalles de CRUD + jerarquía + soft delete + reorder.
4. **API**: la US dice `POST/PATCH/DELETE /admin/service-categories` sin granularidad. Definir 5 endpoints REST estándar:
   - `GET /admin/service-categories` (listado tree + flat options)
   - `POST /admin/service-categories` (create)
   - `PATCH /admin/service-categories/:id` (update name, description, is_active, sort_order)
   - `DELETE /admin/service-categories/:id` (soft delete con guard)
   - `POST /admin/service-categories/:id/reorder` (opcional o vía PATCH sort_order)
5. **Jerarquía 2 niveles**: enforcement server-side (parent_id null = root; child con parent_id != null no puede tener children).
6. **Soft delete enforcement**: FR-SERVICE-003 prohibe hard delete con dependencias (servicios o subcategorías). Soft delete = `is_active=false`.
7. **AdminAction obligatorio** (BR-ADMIN-011 + BR-ADMIN-012): create/update/delete deben registrar AdminAction con `target_type='service_category'`.
8. **i18n**: `name_i18n` (jsonb por locale) para soportar 4 idiomas.
9. **Listado público**: ya existe via US-040 categorías (¿o lo entrega esta US? probable `GET /service-categories` público + `GET /admin/service-categories` con todos).

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | Tech | Endpoints granulares vs unified | 5 endpoints REST estándar: `GET, POST, PATCH /:id, DELETE /:id, POST /:id/reorder` (o `sort_order` vía PATCH). PO confirma. Recomendado: vía PATCH para reducir endpoints. |
| Q2 | PO | Listado admin shape | `GET /admin/service-categories` retorna tree completo + flat options (incluye `is_active=false` para admin; activos para vendor). |
| Q3 | PO | i18n del name | `name_i18n: { 'es-LATAM': '...', 'es-ES': '...', 'pt': '...', 'en': '...' }` requerido al menos en es-LATAM; otros opcionales con fallback. |
| Q4 | Tech | Jerarquía 2 niveles enforcement | Validación server-side: si `parent_id IS NOT NULL`, entonces la categoría parent NO puede tener `parent_id` (es root). Si ya tiene children, NO se puede asignar parent (sería 3er nivel). |
| Q5 | PO/Tech | Soft delete con dependencias | DELETE intenta:<br>- Si tiene `vendor_services` asociados ⇒ `409 CATEGORY_IN_USE`.<br>- Si tiene subcategorías activas ⇒ `409 CATEGORY_HAS_CHILDREN`.<br>- Sino, `is_active=false` (soft delete). NO hard delete físico (FR-SERVICE-003). |
| Q6 | PO | Reactivar categoría | PATCH con `is_active=true` permitido. |
| Q7 | Tech | AdminAction obligatorio | INSERT AdminAction con `target_type='service_category'` para cada create/update/delete. Action: `create | update | soft_delete`. |
| Q8 | PO | Reorder | `sort_order integer` via PATCH; ordenamiento entre siblings (mismo parent o roots). |
| Q9 | Sec | 404 uniforme | `404 SERVICE_CATEGORY_NOT_FOUND`. |
| Q10 | PO | Endpoint público listado | `GET /service-categories` público (autenticado) ya existe o se incluye en esta US? Si no existe, agregar como parte. Recomendado: incluir endpoint público en esta US (listado tree para vendors y formularios de QR). |

## 9. Recomendación

`Needs Refinement` — 10 decisiones PO/Tech/Sec bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
