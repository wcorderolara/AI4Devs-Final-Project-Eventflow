# PO/BA Decision Resolution — US-047

## Source User Story File
management/user-stories/US-047-admin-approve-reject-vendor.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-047-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-047 |
| Backlog Item | PB-P1-041 |
| Decisiones tomadas | 9 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — 1 endpoint con `action` enum
```
POST /api/v1/admin/vendors/:id/moderate
Body: { action: 'approve' | 'reject' | 'hide' | 'unhide', reason?: string }
DTO Zod `.strict()`.

Paridad con US-067. Más simple de mantener que 4 endpoints separados.
```

### D2 — Hide semantics: `is_hidden` flag separado
```
`approved` vendors pueden tener `is_hidden=true` (oculto del directorio público) o `false` (visible). `hide` action mueve `approved + is_hidden=false → is_hidden=true`. Status NO se vuelve `hidden`; sigue siendo `approved`.

Esto coincide con FR-VENDOR-010 (lifecycle solo `pending → approved | rejected`) + flag operativo.
```

### D3 — Unhide permitido
```
`unhide` action mueve `approved + is_hidden=true → is_hidden=false`. Sin reason requerido (operación reversible neutra).
```

### D4 — Reason según acción
```
- `approve`: opcional [0..500].
- `reject`: REQUERIDO [10..500].
- `hide`: REQUERIDO [10..500].
- `unhide`: opcional [0..500].

Ausente cuando required ⇒ `400 REASON_REQUIRED`. Out of range ⇒ `400 INVALID_REASON_LENGTH`.
```

### D5 — Transiciones permitidas
```
Whitelist:
- `pending → approved` via action='approve'.
- `pending → rejected` via action='reject'.
- `approved + is_hidden=false` → `is_hidden=true` via action='hide'.
- `approved + is_hidden=true` → `is_hidden=false` via action='unhide'.

Cualquier otra combinación (e.g. `rejected → approved`, `pending + hide`, `approved + approve` doble) ⇒ `409 INVALID_TRANSITION` con `details.from_status, from_is_hidden, action`.

`rejected → ANY` y "re-aprobar" están OUT OF MVP.
```

### D6 — Notif vendor: 2 Notifications via service común
```
4 eventos nuevos en service común extendido (de 9 a 13 eventos):
- `vendor.approved`
- `vendor.rejected`
- `vendor.hidden`
- `vendor.unhidden`

2 Notifications atómicas por acción (`in_app` + `email_simulated`) con payload:
{ vendor_profile_id, action, reason, moderated_by, moderated_at }

Reusa `QuoteEventNotificationService` extendido (renombre cosmético a `LifecycleNotificationService` opcional, no obligatorio MVP).
```

### D7 — Authorization
```
Sesión `admin`. Otros (organizer/vendor) ⇒ `403`. Vendor inexistente ⇒ `404 VENDOR_NOT_FOUND` uniforme.
```

### D8 — Atomicidad
```
prisma.$transaction:
1. SELECT FOR UPDATE vendor_profile.
2. Validar transición (D5).
3. UPDATE vendor_profile fields (status si applies + is_hidden si applies + moderated_by/at/reason).
4. INSERT AdminAction.
5. UPDATE vendor_profile.admin_action_id.
6. Invocar service común (2 notifs).
7. Log `vendor.moderated`.
```

### D9 — Audit fields en VendorProfile
```
Migración menor: añadir a `vendor_profiles`:
- `moderated_by uuid NULL` (FK users.id)
- `moderated_at timestamptz NULL`
- `moderation_reason text NULL`
- `admin_action_id uuid NULL` (FK admin_actions.id)

Backfill: NULL para vendors no moderados.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Endpoint | 1 POST moderate con action enum |
| 2 | Hide semantics | is_hidden flag separado |
| 3 | Unhide | Permitido sin reason |
| 4 | Reason | Required en reject/hide [10..500]; opcional en approve/unhide |
| 5 | Transiciones | Whitelist explícita |
| 6 | Notif | 2 Notifications via service común extendido a 13 eventos |
| 7 | Auth | Admin only; 404 uniforme |
| 8 | Atomicidad | prisma.$transaction completa |
| 9 | Audit | Migración menor 4 columnas |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-047-admin-approve-reject-vendor.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
