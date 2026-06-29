# User Story Refinement Review — US-040

## Source User Story File
management/user-stories/US-040-create-vendor-profile.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-040-decision-resolution.md

## Review Date
2026-06-27 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)

Tras el `eventflow-po-ba-decision-resolver` y la actualización en sitio, esta segunda pasada confirma: Q1–Q5 incorporadas, `languages_supported` añadido a campos obligatorios, slug auto-generado con desambiguación, log estructurado emitido. Traceability corregida (FR-VENDOR-001/010, BR-VENDOR-001/002/003, BR-SERVICE-003). 4 Documentation Alignment Required no bloqueantes. **Estado recomendado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| User Story ID                              | US-040                                                                                                                                    |
| Backlog Item                               | PB-P1-024 — VendorProfile: crear y editar                                                                                                |
| Epic                                       | EPIC-VND-001 — Vendor Directory & Profile                                                                                                  |
| Estado actual                              | Draft                                                                                                                                     |
| Estado recomendado                         | Needs Refinement                                                                                                                          |
| Nivel de riesgo                            | Medio                                                                                                                                     |
| Calidad general                            | Media                                                                                                                                     |
| Requiere decisión PO                       | Sí                                                                                                                                        |
| Requiere decisión técnica                  | No                                                                                                                                        |
| Decision Resolution artifact found         | No                                                                                                                                        |
| User Story file updated                    | No                                                                                                                                        |

---

## 2. Diagnóstico PO/BA

US-040 inicia el módulo Vendors entregando la creación del `VendorProfile` con estado `pending` por el endpoint canónico `POST /api/v1/vendors/me` (ya catalogado en `docs/16 §M07`). La US es Must Have del MVP, demoable y precondición para todo el flujo de directorio público (`BR-VENDOR-001` / `FR-VENDOR-003`), aprobación admin (`UC-ADMIN-004`), servicios del vendor (`FR-VENDOR-009`) y posteriormente QuoteRequest/BookingIntent. El alcance respeta MVP guardrails (sin KYC, sin verificación bancaria, sin suscripción).

Sin embargo, la historia llega con varios huecos:

1. **Campo `languages_supported` ausente**. `BR-VENDOR-002` exige 5 campos mínimos: `business_name`, `bio`, `location_id` (ciudad), `languages_supported`, `categories`. US-040 solo enumera 4 (omite `languages_supported`).
2. **Límite de categorías iniciales sin política**. US dice "1-3 categorías iniciales" pero `BR-VENDOR-004` se refiere a 5 cambios acumulados POST-aprobación, no al límite inicial. PB-P1-025 (`US-042`) cubre el contador. Falta clarificar el cap inicial.
3. **Mecanismo de notificación al admin sin formalizar**. AC-01 dice "notifica al admin"; el documento no especifica si es `AdminAction` (auditoría), `Notification` entity in-app, o ambas.
4. **Estado inicial: `pending` vs flujo con `submit-approval`**. `docs/16 §M07` cataloga `POST /vendors/me/submit-approval`; sugiere flujo en dos pasos. ¿US-040 crea directamente en `pending` o queda en estado intermedio `draft`/no-state hasta `submit-approval`? El enum canónico (`pending|approved|rejected|hidden`) no incluye `draft`.
5. **Bio mínimo no definido**. US-040 dice `bio ≤ 1000` chars; no especifica mínimo. Para perfil aprobable (`BR-VENDOR-002`), debería tener un piso significativo.

Hay también minor issues:
- `NFR-PERF-API-001` → `NFR-PERF-001`.
- Faltan AC/Tests para auth (401) explícito, idiomas soportados, slug generation (`docs/16 §slug público`).
- Traceability incompleta: añadir `FR-VENDOR-010` (ciclo de vida), `BR-VENDOR-003` (estados), `BR-SERVICE-003` (vendors no crean categorías).
- `Backlog Item: PB-P1-024` no declarado en metadata.
- `Currency Notes: Moneda base del vendor` no aplica a US-040 (la moneda emerge en `VendorService` / `Quote`, US-043+).
- "Considerar autosave del wizard" en Notes — debe quedar como mejora opcional Out of Scope.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                                    | Impacto                                                                                                                                  | Recomendación                                                                                                                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Alta      | Campo `languages_supported` ausente del payload, contradiciendo `BR-VENDOR-002`.                                                                                                                                              | Perfil creado no sería aprobable porque le faltaría un campo obligatorio.                                                                | Añadir `languages_supported: LanguageCode[]` (mín. 1) al request body y AC. Corrección objetiva.                                                                                                                       |
| Alta      | Estado inicial: el catálogo `docs/16 §M07` incluye `POST /vendors/me/submit-approval`. ¿US-040 crea en `pending` directamente o requiere un paso de submit?                                                                  | Riesgo de implementar el endpoint con semántica errónea.                                                                                  | Resolver Q1 (PO): recomendado **crear directamente en `pending`** (consistente con `FR-VENDOR-001` "Estado inicial pending"); `POST /submit-approval` queda para US-041 cuando el vendor edite tras `rejected`.        |
| Alta      | Límite inicial de categorías no definido. `BR-VENDOR-004` cubre cambios post-aprobación; US-040 propone "1-3 categorías iniciales".                                                                                            | Implementación arbitraria.                                                                                                                | Resolver Q2 (PO): recomendado **1-3 categorías iniciales** (alineado con la asunción original) con validación `1 ≤ categories.length ≤ 3` en Zod.                                                                       |
| Alta      | Mecanismo de notificación al admin no formalizado.                                                                                                                                                                            | Implementación inconsistente con futuras stories de admin (US-016/PB-P1-038 admin approval).                                              | Resolver Q3 (PO): recomendado **registrar entrada en `Notification` in-app para todos los admins activos** (responsabilidad del módulo Notifications, US futura) o, MVP-first, **emitir log estructurado `vendor.profile.created` que el dashboard admin lea**. Ver §7. |
| Alta      | Traceability incompleta: faltan `FR-VENDOR-010` (ciclo de vida), `BR-VENDOR-003` (estados), `BR-SERVICE-003` (vendors no crean categorías).                                                                                  | Trazabilidad académica rota.                                                                                                              | Corrección objetiva.                                                                                                                                                                                                    |
| Media     | `bio` sin mínimo. Para aprobación significativa, debe tener piso (e.g., 50 chars).                                                                                                                                            | Bios vacías o triviales pasan validación.                                                                                                | Resolver Q4 (PO): recomendado `bio: 50-1000 chars`.                                                                                                                                                                     |
| Media     | `NFR-PERF-API-001` no existe; canónico `NFR-PERF-001`.                                                                                                                                                                       | Métrica inconsistente.                                                                                                                   | Corregir.                                                                                                                                                                                                                |
| Media     | Slug generation no documentado. El directorio público usa `/api/v1/public/vendors/:vendorSlug` (`docs/16 §M07`).                                                                                                              | Slug debe generarse al crear o al aprobar; sin clarificación, el vendor aprobado podría quedar sin slug.                                  | Resolver Q5 (PO): recomendado **generar slug en US-040 a partir de `business_name` con desambiguación numérica** (e.g., `acme-catering`, `acme-catering-2`). Vive en `VendorProfile.slug`.                                |
| Media     | Faltan AC/Tests para auth 401, admin 403 (admin no crea por vendor), organizer 403 (ya documentado en NT pero falta AC), uniqueness (`UNIQUE vendor_user_id`).                                                                | Cobertura QA insuficiente.                                                                                                               | Añadir AC.                                                                                                                                                                                                              |
| Baja      | `Currency Notes: Moneda base del vendor` no aplica a US-040.                                                                                                                                                                  | Confusión menor.                                                                                                                          | Eliminar de UX notes; vive en VendorService (US-043+).                                                                                                                                                                  |
| Baja      | "Considerar autosave del wizard" en Notes.                                                                                                                                                                                    | Decisión menor de UX.                                                                                                                     | Mover a Out of Scope (Future).                                                                                                                                                                                          |
| Baja      | `i18n Notes: 4 locales` sin enumerar.                                                                                                                                                                                       | Riesgo menor de QA.                                                                                                                       | Enumerar `es-LATAM`, `es-ES`, `pt`, `en`.                                                                                                                                                                                |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                          |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica (sin suscripción).                                                                                       |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                                          |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                                          |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA en US-040 (bio IA es US-023 opcional).                                                                  |
| Respeta backend como source of truth | Pass      | Estado y validaciones server-side.                                                                                  |
| Respeta seed/demo si aplica          | Pass      | `BR-SEED-002`: 10-20 proveedores en seed; este endpoint los crea.                                                   |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                                          |
| No introduce multi-tenant enterprise | Pass      | Vendor por `vendor_user_id` único.                                                                                 |
| No introduce P4/Future scope         | Pass      | KYC, verificación bancaria explícitamente Out of Scope.                                                            |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                                                          | Problema                                                                                                                                       | Acción recomendada                                                                                                                                                                                                                  |
| ----- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail                                                      | No documenta shape del body (categories, languages_supported), response, generación de slug (Q5), mecanismo de notificación (Q3).               | Reescribir tras Q1/Q2/Q3/Q5.                                                                                                                                                                                              |
| AC-02 | Needs Detail                                                      | "Banner en revisión" UX correcto pero no documenta el endpoint de lectura (`GET /vendors/me`).                                                | Añadir referencia explícita.                                                                                                                                                                                              |

Faltantes:
- AC para shape del response 201.
- AC para auth 401 explícito.
- AC para slug único.
- AC para `vendor_user_id` único (409 `PROFILE_EXISTS`).
- AC para A11Y wizard accesible (con detalle).
- AC para i18n 4 locales.

---

## 6. Gaps Detectados

### Producto / Negocio
- Estado inicial confirm (Q1).
- Cap inicial de categorías (Q2).
- Mecanismo de notificación (Q3).
- Mínimo `bio` (Q4).
- Estrategia de slug (Q5).

### Backend / API
- DTO Zod con todos los campos requeridos por `BR-VENDOR-002`.
- Generación de slug determinística con desambiguación.
- `UNIQUE vendor_user_id` y `UNIQUE slug` constraints.
- Reuso de `EventOwnershipPolicy`-equivalente para vendor (`VendorOwnershipPolicy`).
- Notification flow (Q3).

### Frontend / UX
- Wizard `VendorProfileWizard` con pasos (Datos / Categorías / Idiomas / Confirmación).
- Selección de ciudades desde catálogo `Location`.
- Selección de categorías desde catálogo `ServiceCategory` con cap 1-3.
- Multi-select de `languages_supported`.
- A11Y completo.

### Base de Datos
- `vendor_profile` con columnas: id, vendor_user_id, business_name, bio, location_id, languages_supported (array), slug, status, created_at, updated_at, soft delete (`deleted_at`).
- Tabla `vendor_profile_categories` (M:N con `service_categories`).
- Índices: `vendor_user_id` UNIQUE, `slug` UNIQUE, `status`.
- Reuso del schema entregado por PB-P0-001.

### Seguridad / Autorización
- `VendorRoleGuard` + ownership `vendor_user_id = currentUser.id`.
- `adminExclusionGuard` (admin no crea por vendor).
- `organizerExclusionGuard` (consistente con role guards de otros surfaces).
- No-revelación 404 ante recurso ajeno (no aplica aquí porque es `/me`).

### IA / PromptOps
No aplica (US-023 cubre bio IA opcional).

### QA / Testing
- TS funcional, NT (uniqueness, categorías inválidas, languages vacíos, ciudad inválida), AUTH, PERF, A11Y, CONTRACT.

### Seed / Demo
- `BR-SEED-002`: 10-20 vendors. El seed debe crear vendors con estado mixto (pending/approved) para demoar el flujo de aprobación.

### Documentación / Trazabilidad
- IDs incorrectos en NFR.
- Falta `Backlog Item: PB-P1-024`.
- Falta `FR-VENDOR-010`, `BR-VENDOR-003`, `BR-SERVICE-003` en traceability.

---

## 7. Preguntas Pendientes

| Tipo  | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                                       | Bloquea aprobación | Responsable     |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------- |
| PO    | Q1. ¿Estado inicial al crear? Opciones: (a) `pending` directamente (consistente con `FR-VENDOR-001` "Estado inicial pending"); (b) sin estado / `draft` hasta `POST /vendors/me/submit-approval`. Recomendado (a); `submit-approval` queda para US-041 cuando el vendor edite tras `rejected`.                                                                                                                                                          | Sí                 | Product Owner  |
| PO    | Q2. ¿Límite inicial de categorías? Opciones: (a) **1-3** al crear (consistente con la asunción original); (b) 1-5 (alineado con `BR-VENDOR-004` que cubre cambios post-aprobación); (c) sin límite numérico. Recomendado (a).                                                                                                                                                                                                                          | Sí                 | Product Owner  |
| PO    | Q3. ¿Mecanismo de notificación al admin? Opciones: (a) emitir log estructurado `vendor.profile.created` que el dashboard admin (US-016/admin queue) lee; (b) crear entrada en tabla `Notification` in-app dirigida a todos los admins activos (requiere entidad/tabla nueva, posiblemente fuera de US-040); (c) ambas. Recomendado (a) para MVP; (b) queda para US futura del módulo Notifications.                                                | Sí                 | Product Owner  |
| PO    | Q4. ¿Mínimo de `bio`? Opciones: (a) 50 chars (significativo); (b) 30 chars (mínimo); (c) sin mínimo. Recomendado (a).                                                                                                                                                                                                                                                                                                                                  | Sí                 | Product Owner  |
| PO    | Q5. ¿Estrategia de slug? Opciones: (a) generar en US-040 a partir de `business_name` (`slugify(business_name)`) con desambiguación numérica (e.g., `acme-catering`, `acme-catering-2`); (b) generar al aprobar (US-041/PB-P1-038); (c) input opcional del vendor con regla. Recomendado (a) por simplicidad y porque el directorio público lo necesita una vez aprobado; el slug solo se hace visible al `approved` pero se persiste al crear. | Sí                 | Product Owner  |

---

## 8. Documentation Alignment Required

| Documento                  | Conflicto                                                                                          | Acción                                                                                                                          | Bloquea |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `docs/10`                  | `NFR-PERF-API-001` no existe.                                                                       | Housekeeping `NFR-PERF-001`.                                                                                                    | No      |
| `docs/16 §M07 Vendor Profiles` | El endpoint `/vendors/me` está catalogado; el shape del body debe documentarse formalmente.   | Tras Q1–Q5, actualizar shape en `docs/16`.                                                                                       | No      |
| `docs/6 §VendorProfile`     | Confirmar que `slug` está en el modelo (debería estar; verificar columna).                          | Verificar y, si falta, abrir tarea DOC / migración menor.                                                                       | No      |
| `docs/4 §BR-VENDOR-002`     | No menciona el cap inicial de categorías.                                                            | Tras Q2, nota interpretativa.                                                                                                   | No      |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                          |
| User Story file path                       | `management/user-stories/US-040-create-vendor-profile.md`                                   |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-040-decision-resolution.md`                |
| Refinement review artifact created/updated | Yes                                                                                         |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-040-refinement-review.md`                    |
| Final recommended status                   | Needs Refinement                                                                            |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                         |
| Reason                                     | 5 preguntas PO requeridas. Resolverlas obliga a reescribir AC, EC, VR, Technical Notes.       |

---

## 10. Cambios Aplicados o Recomendados

(Lista prescriptiva para aplicar tras Q1–Q5.)

### Metadata
- Añadir `Backlog Item: PB-P1-024`.

### Business Context
- `Context Summary` reformulado con flujo en un solo paso (Q1).
- `Assumptions`: cap 1-3 (Q2), bio 50-1000 (Q4), slug auto-generado (Q5), notificación vía log (Q3).
- `Dependencies`: US-002, US-016 (admin queue consumidor), US-041 (edición + submit-approval), Location catalog (`/api/v1/locations`), ServiceCategory catalog.

### PO/BA Decisions Applied
- Sección nueva D1–D5.

### Traceability
- `FRD Requirement(s)`: FR-VENDOR-001, FR-VENDOR-010 (ciclo de vida).
- `Use Case(s)`: UC-VENDOR-001.
- `Business Rule(s)`: BR-VENDOR-001, BR-VENDOR-002, BR-VENDOR-003, BR-SERVICE-003.
- `Data Entity / Entities`: VendorProfile, ServiceCategory, Location.
- `API Endpoint(s)`: POST /api/v1/vendors/me.
- `NFR Reference(s)`: NFR-PERF-001.
- Related: `/docs/4 §BR-VENDOR-001..003`, `/docs/6 §VendorProfile §Location §ServiceCategory`, `/docs/8 §UC-VENDOR-001`, `/docs/9 §FR-VENDOR-001/010`, `/docs/16 §M07`.

### Scope Guardrails
- Out of Scope: KYC, verificación bancaria, suscripción, autosave wizard (Future), submit-approval re-flow (US-041), creación de categorías por vendor.

### Acceptance Criteria
- AC-01 reescrito: body completo (business_name, bio, location_id, languages_supported, categories[1-3]), 201 con response shape, slug generado, log notificación admin.
- AC-02 reescrito: `GET /vendors/me` retorna perfil con `status='pending'`; UI muestra banner.
- AC-03 nuevo: uniqueness violations (`vendor_user_id`, `slug` desambiguado).
- AC-04 nuevo: shape canónico del response.
- AC-05 nuevo: A11Y wizard.
- AC-06 nuevo: i18n 4 locales.
- AC-07 nuevo: P95 NFR.

### Edge Cases
- EC-01 reescrito (PROFILE_EXISTS).
- EC-02 reescrito (categoría inexistente).
- EC-03 nuevo: ciudad inactiva.
- EC-04 nuevo: slug colisión con desambiguación.
- EC-05 nuevo: languages_supported vacío.

### Validation Rules
- VR-01..04 ampliados.
- VR-05 nuevo: 1-3 categories.
- VR-06 nuevo: languages_supported mín 1.
- VR-07 nuevo: bio 50-1000.
- VR-08 nuevo: UUIDs válidos.
- VR-09 nuevo: no-auth → 401.

### Authorization & Security Rules
- SEC-01 ownership `vendor_user_id` desde sesión.
- SEC-02 `VendorRoleGuard`.
- SEC-03 `adminExclusionGuard` + `organizerExclusionGuard`.
- SEC-04 logging sin PII.

### Technical Notes
- Backend: `CreateVendorProfileUseCase`, `VendorProfileRepository`, slug generation helper, log estructurado.
- Frontend: `VendorProfileWizard` con multi-step + selectores de Location/ServiceCategory/Languages.
- Database: reuso schema PB-P0-001; verificar `slug` column existe.
- Observability: log `vendor.profile.created`.

### Test Scenarios
- Funcional: TS-01 happy path, TS-02 E2E onboarding, TS-03 slug auto-generado, TS-04 slug desambiguación, TS-05 idiomas en payload.
- Negative: NT-01..05 (uniqueness, categoría/ciudad inválida, languages vacío, organizer/admin).
- AUTH: AUTH-TS-01..04.
- PERF-01.
- A11Y-01 wizard.
- CONTRACT-01.

---

## 11. Recomendación Final

`Needs Refinement`

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver` sobre este review.

---

User Story file updated: No
Path: management/user-stories/US-040-create-vendor-profile.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-040-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
