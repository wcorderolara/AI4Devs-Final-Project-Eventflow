# Constraints Validation Matrix — PB-P0-001 (C-001..C-062)

> Entregable de **US-102** (AC-06). Clasifica **cada** constraint del catálogo Doc 6 §17 /
> Doc 18 §24 por mecanismo físico + historia owner + evidencia. Es evidencia de validación,
> **no** re-implementación. Fuente del catálogo: `docs/6-Domain-Data-Model.md` §17 (líneas 1483+).
>
> **Leyenda de mecanismo:**
> - `DB US-099` — schema declarativo (FK / NOT NULL / enum / `@unique`/`@@unique` / default), baseline US-100.
> - `DB US-101` — índice funcional (`uq_users_email_lower`).
> - `DB US-102 check` — `CHECK` constraint raw SQL (esta historia).
> - `DB US-102 unique` — unique parcial raw SQL (esta historia).
> - `Service` — capa de aplicación (historia owner).
> - `Job` — job programado (historia owner).
> - `Middleware` — capa de seguridad/middleware (historia owner).
> - `Convención` — invariante por ausencia de código/tabla (sin enforcement técnico).
>
> **Nota de reconciliación (BLK-001, resuelto por decisión de autoridad):** el schema que US-099
> entregó es un subconjunto del Domain Data Model. US-102 amplió el schema (columnas + 1 enum +
> 2 FKs) para materializar los constraints DB-enforceable del catálogo. Adaptaciones registradas:
> `budget_items` sin `paid`; `vendor_services` sobre `price_min/price_max`; `quotes` sobre `amount`.
> Se recomienda ADR/rework formal de US-099 que consolide estas columnas (ver execution record US-102 §D-01).

## 1. Matriz

| C-ID | Regla (resumen) | Entidad | Mecanismo | Historia owner | Evidencia |
|---|---|---|---|---|---|
| C-001 | `email` único (case-insensitive) | User | DB US-099 (`@unique`) + DB US-101 (`uq_users_email_lower`) | US-099 / US-101 | `critical-indexes.integration.spec.ts` (QA-002) |
| C-002 | `role IN (organizer,vendor,admin)` | User | DB US-099 (enum `UserRole`) | US-099 | `schema-structure.spec.ts` |
| C-003 | `admin` no vía registro público | User | Service | US-089+ (auth) | Matriz (clasificación) |
| C-004 | `owner_id NOT NULL` + role organizer | Event | DB US-099 (NOT NULL FK) + Service | US-099 / US-089+ | schema + matriz |
| C-005 | `event_type` en catálogo cerrado | Event | DB US-099 (FK `event_type_id`) + Service | US-099 | schema |
| C-006 | Transiciones lineales de `status` | Event | Service | US-090+ | matriz |
| C-007 | Solo eventos `active` generan QuoteRequest | Event/QuoteRequest | Service | US-092+ | matriz |
| C-008 | `currency_code` inmutable | Event | Service (trigger descartado, Doc 18 §14.1) | US-090+ | matriz |
| C-009 | `guests_count >= 1` | Event | **DB US-102 check** `chk_events_guests_count_positive` | US-102 | `db-constraints.integration.spec.ts` QA-002 |
| C-010 | `estimated_budget >= 0` | Event | **DB US-102 check** `chk_events_estimated_budget_nonneg` | US-102 | QA-002 |
| C-011 | `EventTask.event_id NOT NULL` | EventTask | DB US-099 (NOT NULL FK) | US-099 | schema |
| C-012 | Tareas IA arrancan `pending` | EventTask | Service | US-091+ | matriz |
| C-013 | Transiciones de `EventTask.status` | EventTask | Service | US-091+ | matriz |
| C-014 | Sin cambios en eventos `cancelled` | EventTask | Service | US-091+ | matriz |
| C-015 | `Budget.event_id` único (1:1) | Budget | DB US-099 (`@unique`) | US-099 | schema |
| C-016 | `Budget.currency = Event.currency` | Budget | Service | US-093+ | matriz |
| C-017 | montos de `BudgetItem >= 0` | BudgetItem | **DB US-102 check** `chk_budget_items_amounts_nonneg` (sin `paid`) | US-102 | QA-002 |
| C-018 | `committed` se ajusta al confirmar booking | BudgetItem | Service | US-093+ | matriz |
| C-019 | `VendorProfile.user_id` único (1:1) | VendorProfile | DB US-099 (`@@unique`) | US-099 | schema |
| C-020 | Solo `approved` visible | VendorProfile | Service + DB US-101 (`idx_vendor_profiles_status_location`) | US-094+ | matriz |
| C-021 | Transiciones de `VendorProfile.status` | VendorProfile | Service | US-094+ | matriz |
| C-022 | ≤ 10 imágenes por trabajo | VendorProfile/Attachment | Service (conteo) + DB US-101 (`idx_attachments_vendor_work_active`) | US-094+ | matriz |
| C-022b | `category_change_count <= 5` | VendorProfile | **DB US-102 check** `chk_vendor_profiles_category_change_max` | US-102 | QA-002 |
| C-023 | `VendorService` apunta a perfil propio | VendorService | Service | US-094+ | matriz |
| C-024 | `service_category_id` existe | VendorService | DB US-099 (FK) | US-099 | schema |
| C-025 | `ServiceCategory` CRUD solo admin | ServiceCategory | Service | US-095+ | matriz |
| C-026 | Soft delete de `ServiceCategory` | ServiceCategory | DB US-099 (`deletedAt`) + Service | US-099 / US-095+ | schema |
| C-026b | Profundidad `<= 2` | ServiceCategory | **DB US-102 check** `chk_service_categories_depth_level` | US-102 | QA-002 |
| C-026c | `EventType` con eventos no hard-delete | EventType | DB US-099 (`deletedAt`/`isActive`) + Service | US-099 / US-095+ | schema |
| C-027 | Unique QuoteRequest activa `(event,vendor)` | QuoteRequest | **DB US-102 unique** `uq_quote_requests_event_vendor_active` | US-102 | `db-constraints.integration.spec.ts` QA-003 |
| C-027b | Máx 5 QuoteRequest activas `(event,category)` | QuoteRequest | Service (conteo) | US-092+ | matriz |
| C-028 | Visibilidad de `QuoteRequest` | QuoteRequest | Service | US-092+ | matriz |
| C-029 | `brief` no vacío | QuoteRequest | Service | US-092+ | matriz |
| C-030 | Unique Quote vigente por request | Quote | **DB US-102 unique** `uq_quotes_request_active` | US-102 | QA-003 |
| C-031 | `valid_until NOT NULL` + default 15d | Quote | Service (DEFAULT motor descartado, DR-102 D7) | US-052/US-053 | matriz |
| C-032 | `valid_until` pasado ⇒ `expired` | Quote | Job | US-055 | matriz |
| C-033 | Quote editable solo en `draft` | Quote | Service | US-052+ | matriz |
| C-034 | `Quote.currency = Event.currency` | Quote | Service | US-052+ | matriz |
| C-035 | BookingIntent solo si Quote `accepted` | BookingIntent | Service | US-096+ | matriz |
| C-036 | `confirmed_intent` requiere confirmación | BookingIntent | Service | US-096+ | matriz |
| C-037 | Único `confirmed_intent` `(event,category)` | BookingIntent | **DB US-102 unique** `uq_booking_intents_event_category_confirmed` | US-102 | QA-003 |
| C-038 | `is_simulated = true` | BookingIntent | **DB US-102 check** `chk_booking_intents_is_simulated` | US-102 | QA-002 |
| C-039 | Review requiere booking confirmado | Review | Service | US-097+ | matriz |
| C-040 | Único Review `(event,vendor)` | Review | Service / US-099 (unique declarativo **no hallado** en schema — gap US-099) | US-097+ | matriz (gap anotado) |
| C-041 | `rating BETWEEN 1 AND 5` | Review | **DB US-102 check** `chk_reviews_rating_range` | US-102 | QA-002 |
| C-042 | Review no editable tras publicar | Review | Service | US-097+ | matriz |
| C-043 | Solo admin `hidden/removed` + AdminAction | Review | Service | US-097+ | matriz |
| C-043b | Vendor no responde reseñas (MVP) | Review | Convención (ausencia de feature) | — | matriz |
| C-044 | `Notification.user_id NOT NULL` | Notification | DB US-099 (NOT NULL FK) | US-099 | schema |
| C-045 | `channel IN (in_app,email_simulated)` | Notification | Service (columna `channel` no en schema US-099 — gap) | US-098+ | matriz (gap anotado) |
| C-046 | `AIRecommendation.accepted` default false | AIRecommendation | Service (modelado como `status` default `pending` en US-099) | US-099 / US-091+ | matriz |
| C-047 | Referencia a `AIPromptVersion` | AIRecommendation | DB US-099 (NOT NULL FK) | US-099 | schema |
| C-048 | `language_code` coincide con evento/usuario | AIRecommendation | Service | US-091+ | matriz |
| C-049 | Entidades tras aceptar IA `ai_generated=true` | EventTask/BudgetItem | Service (EventTask `origin=ai` en US-099) | US-091+ | matriz |
| C-050 | `AdminAction` append-only | AdminAction | Convención + Service (`REVOKE` diferido, DR-102 D4; Doc 18 §20.1) | US-099 / US-137+ | matriz |
| C-051 | `admin_id` desde sesión | AdminAction | Service | US-089+ | matriz |
| C-052 | Attachment owner existe | Attachment | Service | US-094+ | matriz |
| C-053 | Sin conversión de moneda | money fields | Convención (ausencia) | — | matriz |
| C-054 | Seed `is_seed=true` | todas con `is_seed` | DB US-099 (`isSeed`) + DB US-101 (`idx_*_is_seed`) | US-099 / US-101 | schema + `critical-indexes.integration.spec.ts` QA-004 |
| C-055 | Sin medios de pago | todas | Convención (ausencia) | — | matriz |
| C-056 | Cierre automático de eventos | Event | Job | US-015/US-055 | matriz |
| C-057 | Cancelación de booking con campos de auditoría | BookingIntent | Service (campos `cancelled_by`/`cancelled_at` no en schema — gap) | US-096+ | matriz (gap anotado) |
| C-058 | Timeout IA 60 000 ms + fallback | AIRecommendation | DB US-102 check `chk_ai_recommendations_timeout_positive` (default 60000) + Service | US-102 / US-091+ | QA-002 |
| C-059 | Captcha/anti-bot en auth | Auth | Middleware | US-109..111 | matriz |
| C-060 | Attachment soft delete | Attachment | DB US-099 (`deletedAt`) + Service | US-099 / US-094+ | schema |
| C-061 | Notificar al vendor en reject/expire | Notification/Quote | Service + Job | US-098+/US-055 | matriz |
| C-062 | Anthropic no funcional (stub) | AIRecommendation | Convención (enum stub en US-099) | US-099 | schema |

### Checks Doc 18 sin C-ID (data quality, entregados por US-102)

| Constraint | Regla | Fuente | Evidencia |
|---|---|---|---|
| `chk_users_email_not_empty` | `email <> ''` | Doc 18 §13.3 | QA-002 |
| `chk_users_password_hash_not_empty` | `password_hash <> ''` | Doc 18 §13.3 | QA-002 |
| `chk_budgets_totals_nonneg` | `total_planned/total_committed >= 0` | Doc 18 §14.4 | QA-002 |
| `chk_vendor_profiles_languages_not_empty` | `cardinality(languages_supported) > 0` | Doc 18 §15.1 | QA-002 |
| `chk_vendor_services_base_price_nonneg` | `price_min/price_max >= 0` | Doc 18 §15.2 | QA-002 |
| `chk_quotes_total_price_nonneg` | `amount >= 0` | Doc 18 §16.2 | QA-002 |
| `chk_attachments_size_bytes_nonneg` | `size_bytes >= 0` | Doc 18 §19.1 | QA-002 |
| `chk_ai_recommendations_retry_max` | `retry_count BETWEEN 0 AND 1` | Doc 18 §21.1 | QA-002 |
| `uq_prompt_versions_active` | una versión `active` por `prompt_id` | Doc 18 §21.2 | QA-003 |

## 2. Resumen por mecanismo

| Mecanismo | Constraints |
|---|---|
| DB US-102 check (16) | chk_users_email_not_empty, chk_users_password_hash_not_empty, C-009, C-010, chk_budgets_totals_nonneg, C-017, C-022b, chk_vendor_profiles_languages_not_empty, chk_vendor_services_base_price_nonneg, C-026b, chk_quotes_total_price_nonneg, C-038, C-041, chk_attachments_size_bytes_nonneg, C-058 (timeout), chk_ai_recommendations_retry_max |
| DB US-102 unique (4) | C-027, C-030, C-037, uq_prompt_versions_active |
| DB US-101 (funcional/parcial soporte) | C-001 (uq_users_email_lower), C-020/C-022/C-054 (índices parciales) |
| DB US-099 baseline | C-001, C-002, C-004, C-005, C-011, C-015, C-019, C-024, C-026, C-026c, C-044, C-047, C-054, C-060, C-062 |
| Service layer | C-003, C-006, C-007, C-008, C-012..C-014, C-016, C-018, C-020, C-021, C-023, C-025, C-027b, C-028, C-029, C-031, C-033..C-036, C-039, C-040, C-042, C-043, C-045, C-046, C-048, C-049, C-051, C-052, C-057, C-061 |
| Job | C-032, C-056, C-061 (parcial) |
| Middleware | C-059 |
| Convención (ausencia) | C-043b, C-050 (parcial), C-053, C-055, C-062 |

## 3. Gaps anotados (para ADR/rework US-099)

- **C-040** (`uq_reviews_event_vendor`): la Boundary de US-102 lo asignó a US-099, pero el schema US-099 **no** declara ese unique (Review no tiene `event_id`). Requiere decisión: agregar el unique en el rework o mantenerlo en service layer.
- **C-045** (`Notification.channel`): columna `channel` ausente en US-099. Clasificado service layer.
- **C-057** (campos de cancelación de booking): `cancelled_by/cancelled_at/cancellation_reason` ausentes. Service layer / rework futuro.
- **`paid`** en `budget_items`: ausente; el check C-017 cubre `amount_planned/amount_committed`.

## 4. Cobertura

- **67 filas** del catálogo (C-001..C-062 + C-022b, C-026b, C-026c, C-027b, C-043b) **clasificadas**; cero filas sin mecanismo ni owner.
- **20 objetos DB-enforced por US-102** (16 checks + 4 unique parciales) verificados por tests de violación (`db-constraints.integration.spec.ts`) y estructurales (`db-constraints-structure.spec.ts`).
