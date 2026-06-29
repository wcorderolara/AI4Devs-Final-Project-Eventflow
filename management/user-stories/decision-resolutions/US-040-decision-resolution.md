# PO/BA Decision Resolution — US-040

## Source User Story File
management/user-stories/US-040-create-vendor-profile.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-040-refinement-review.md

## Decision Date
2026-06-27

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-040                                                                                                         |
| Cantidad de preguntas revisadas              | 5 (Q1–Q5)                                                                                                      |
| Decisiones PO/BA tomadas                     | 5                                                                                                              |
| ¿Desbloquea aprobación?                      | Sí                                                                                                             |
| User Story file updated                      | Yes                                                                                                            |
| Próximo paso recomendado                     | Run `eventflow-user-story-approval`                                                                            |

---

## 2. Decisiones Respondidas

### D1 — Estado inicial: `pending` directo

**Decisión**: El `POST /api/v1/vendors/me` crea el `VendorProfile` con `status='pending'` directamente, alineado con `FR-VENDOR-001` ("Estado inicial `pending`"). El endpoint `POST /vendors/me/submit-approval` (catalogado en `docs/16 §M07`) queda para US-041 cuando el vendor edite después de `rejected` y necesite re-someter.

**Rationale**: `FR-VENDOR-001` y el enum canónico `VendorStatus = pending|approved|rejected|hidden` (`docs/6 §VendorStatus`) no incluyen `draft`. Aplicar dos pasos en US-040 introduciría un estado fantasma.

### D2 — Cap inicial de categorías: 1-3

**Decisión**: `1 ≤ categories.length ≤ 3` al crear el perfil. Validado por Zod. El contador `category_change_count` que rige los cambios post-aprobación (`BR-VENDOR-004`) inicia en 0; US-042 (PB-P1-025) gestiona el cap acumulado de 5 cambios.

**Rationale**: Coincide con la asunción original de US-040 y mantiene la decisión de PB-P1-025 separada para no superponer.

### D3 — Notificación al admin: log estructurado MVP-first

**Decisión**: US-040 emite el log estructurado `vendor.profile.created` con `vendorProfileId`, `vendor_user_id`, `business_name`, `slug`, `status`, `categories`, `location_id`, `languages_supported`, `correlationId`. El dashboard admin de US-016 (admin queue) consume este log o, alternativamente, consulta `GET /vendors?status=pending` (cuando US futura del módulo Admin entregue ese endpoint).

La creación de una entidad `Notification` in-app dirigida a admins se considera **Out of Scope para US-040** y vive en una US futura del módulo Notifications. La auditoría de la creación es responsabilidad de US-040 (vía log); la aprobación/rechazo persiste `AdminAction` (US-041 + US futura admin).

**Rationale**: MVP-first; evita acoplar US-040 con un módulo Notifications que aún no existe. El admin queue puede consumir el log estructurado vía agregación o filtro `GET /vendors?status=pending`.

### D4 — Bio mínimo: 50 chars

**Decisión**: `bio: string, 50 ≤ length ≤ 1000`. Validado por Zod.

**Rationale**: 50 chars garantiza contenido significativo para la curación admin sin ser opresivo. Consistente con prácticas comunes de marketplaces.

### D5 — Slug auto-generado con desambiguación

**Decisión**: US-040 genera el `slug` server-side a partir de `business_name`:
1. Normalizar (`slugify(business_name)` → minúsculas, sin tildes, espacios → guiones, eliminar caracteres especiales).
2. Si el slug ya existe en `vendor_profile.slug`, anexar sufijo numérico: `<slug>-2`, `<slug>-3`, etc.
3. Persistir en `vendor_profile.slug` con índice UNIQUE.
4. El slug se calcula al crear y queda inmutable en US-040; cualquier cambio futuro lo gestiona US-041.

**Rationale**: El directorio público (`docs/16 §M07`: `GET /api/v1/public/vendors/:vendorSlug`) requiere slug único. Generar al crear (aunque el perfil no sea público hasta aprobación) evita lógica adicional al aprobar y permite previsualizar la URL definitiva en la respuesta.

---

## 3. Consolidated Decision Table

|  # | Tema                  | Decisión                                                                                              | Tipo | ¿Bloqueaba? |
| -: | --------------------- | ----------------------------------------------------------------------------------------------------- | ---- | ----------- |
|  1 | Estado inicial         | `status='pending'` directo en POST.                                                                    | PO   | Sí          |
|  2 | Cap categorías         | 1-3 categorías al crear.                                                                              | PO   | Sí          |
|  3 | Notificación admin     | Log estructurado `vendor.profile.created`; entidad Notification queda Out of Scope (US futura).        | PO   | Sí          |
|  4 | Bio mínimo             | 50 chars.                                                                                              | PO   | Sí          |
|  5 | Slug                   | Auto-generado server-side con desambiguación numérica; inmutable en US-040.                            | PO   | Sí          |

---

## 4. Documentation Alignment Required

| Documento                  | Conflicto                                                                                          | Acción                                                                                                  | Bloquea |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------- |
| `docs/10`                  | `NFR-PERF-API-001` no existe.                                                                       | Housekeeping `NFR-PERF-001`.                                                                            | No      |
| `docs/16 §M07`             | Documentar shape del body con `languages_supported`, `categories[1-3]`, response con `slug`.        | Tras D1–D5, actualizar `docs/16`.                                                                       | No      |
| `docs/6 §VendorProfile`    | Confirmar columna `slug` UNIQUE.                                                                    | Verificar PB-P0-001.                                                                                    | No      |
| `docs/4 §BR-VENDOR-002`    | Sin cap inicial de categorías.                                                                       | Nota interpretativa D2.                                                                                  | No      |

---

## 5. Estado recomendado

`Ready for Approval`

Las 5 decisiones quedan formalizadas y consistentes con `FR-VENDOR-001`, `BR-VENDOR-001/002/003`, `docs/16 §M07` y `docs/6 §VendorProfile`. US-040 se actualiza en sitio.

---

## 6. Próximo paso

```text
1. Revisar US-040 actualizada.
2. Ejecutar `eventflow-user-story-refinement` para revalidación.
3. Ejecutar `eventflow-user-story-approval`.
4. Tech Spec + Development Tasks.
```

---

User Story file updated: Yes
Path: management/user-stories/US-040-create-vendor-profile.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-040-decision-resolution.md
Next step: Run `eventflow-user-story-approval`.
