# PO/BA Decision Resolution — US-073

## Source User Story File
management/user-stories/US-073-vendor-quote-rejected-notification-surface.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-073-refinement-review.md

## Decision Date
2026-07-07

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-073                                                                                                            |
| User Story file path                         | `management/user-stories/US-073-vendor-quote-rejected-notification-surface.md`                                    |
| Refinement review artifact path              | `management/user-stories/refinement-reviews/US-073-refinement-review.md`                                          |
| Existing decision resolution found           | No                                                                                                                |
| Backlog Item                                 | PB-P2-009 — Surface vendor de notificaciones de rechazo/expiración (P2, Must Have, posición 1 de 1)               |
| Epic                                         | EPIC-NOT-001                                                                                                      |
| Estado antes de decisiones                   | Needs Refinement                                                                                                  |
| Cantidad de preguntas revisadas              | 6 (Q1–Q5 bloqueantes + Q6 parcial)                                                                                |
| Decisiones PO/BA tomadas                     | 6 (D1 bandeja unificada vendor; D2 deep links por tipo; D3 sin filtros por tipo en MVP; D4 design tokens variant; D5 mark-as-read reuso US-072; D6 vendor layout — task explícito de foundation) |
| Decisiones técnicas recomendadas             | 2 (D1 y D2 requieren validación Tech Lead durante Technical Spec)                                                  |
| ¿Desbloquea aprobación?                      | Sí                                                                                                                |
| User Story file updated                      | Yes                                                                                                               |
| Decision Resolution artifact created/updated | Yes                                                                                                               |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-073-decision-resolution.md`                                      |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` (revalidación) y luego `eventflow-user-story-approval`.                     |

---

## 2. Decisiones Respondidas

## Decisión 1 — Bandeja unificada vendor (Q1)

### Respuesta PO/BA

El endpoint canónico `GET /api/v1/notifications` (`docs/16 §34.2`) es genérico y filtra por `user_id = session.userId`; no distingue rol. Restringir US-073 a 2 tipos obliga al vendor a operar 2 bandejas o dejar gap para otros tipos que el vendor recibe (`quote_request_received` de US-068, `booking_confirmed` de US-070). El patrón US-071 D1 (bandeja unificada organizer) es el análogo directo. Aplicando el mismo patrón, US-073 se convierte en la bandeja vendor unificada, cerrando el gap identificado en US-068 D4 y US-070 D4.

### Decisión formal

```text
US-073 entrega la BANDEJA UNIFICADA del vendor. Muestra TODAS las notifs del usuario con `user_id = session.userId` sin filtro por `type`, siguiendo el patrón US-071 D1. Ordenamiento default: `unread first, sent_at DESC`. Los items reciben destacado visual por tipo (D4). Reuso 1:1 del `NotificationsBell`, `NotificationsDropdown`, hooks y query keys canónicas de US-071.

Con esta decisión, el gap identificado en US-068 D4 y US-070 D4 ("bandeja vendor genérica = Future US no listada") queda CERRADO por US-073. No se requiere Future US adicional para bandeja vendor.
```

### Rationale

* Reuso máximo del patrón US-071 aprobado.
* Cierra el gap sin nueva US.
* Alineado con FR-NOTIF-002 (consulta todas las notifs propias) y con el endpoint canónico.
* Consistente con la política "una sola bandeja por usuario" observable en apps productivas.

### Impacto

| Sección              | Cambio                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D1.                                                                                                                                    |
| Metadata             | `Feature`: "Bandeja unificada de notificaciones vendor con destacado visual por tipo".                                                          |
| Business Context     | Ampliar Context Summary declarando el cierre de gap US-068 D4 / US-070 D4.                                                                     |
| Scope Guardrails     | Reformular Out of Scope: sin filtros por tipo (D3), sin mark-as-read (D5), sin realtime.                                                       |
| Acceptance Criteria  | AC-01..AC-09 heredados de US-071 con adaptación variant por tipo.                                                                                |
| Documentation Alignment | Actualizar PB-P2-009 `Description` + Coverage Matrix.                                                                                        |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 2 — Deep links por tipo para vendor (Q2)

### Respuesta PO/BA

Extiende la tabla `LINK_STRATEGY_BY_TYPE` iniciada por US-071 D3 y ampliada por US-068/US-069/US-070 con las filas del vendor lado receptor. Rutas canónicas basadas en el patrón `/vendor/quotes/{quoteId}` para acceder al detalle de la Quote afectada (aceptada, rechazada o expirada).

### Decisión formal

```text
Se agregan a la tabla `LINK_STRATEGY_BY_TYPE` del `NotificationLinkResolver`:

- `quote_rejected` → `/vendor/quotes/{payload.quoteId}`.
- `quote_expired`  → `/vendor/quotes/{payload.quoteId}`.

El `payload` para ambos tipos incluye al menos `{quoteId, quoteRequestId, eventId, organizerId}` (sin totales monetarios; sin PII). El resolver retorna `null` si el `quoteId` referenciado no existe (patrón fallback ya establecido en US-071 D3).

Se ratifica Documentation Alignment con `docs/16 §34.3`: la tabla `link generation by type` debe crecer con estas 2 filas.
```

### Rationale

* Extiende la tabla existente sin cambiar el patrón.
* Ruta `/vendor/quotes/{id}` es coherente con `docs/8 §UC-QUOTE-009/010` (vendor accede a su Quote afectada).
* Payload sin PII financiera protegida (paralelo D3 US-068/US-069/US-070).

### Impacto

| Sección              | Cambio                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D2.                                                                                        |
| Acceptance Criteria  | AC declara link server-side por tipo.                                                              |
| Technical Notes      | Backend: extensión del resolver con 2 estrategias adicionales.                                     |
| Documentation Alignment | 2 filas nuevas en `docs/16 §34.3`.                                                                |
| Test Scenarios       | TS verifica ambos links.                                                                            |

### ¿Bloqueaba aprobación? Sí. **Requires Tech Lead Validation** para confirmar retrocompatibilidad con estrategias existentes (paralelo QA-003 US-070).

---

## Decisión 3 — Filtros por tipo desde UI (Q3)

### Respuesta PO/BA

PB-P2-009 Acceptance Summary menciona "Filtros por tipo". US-071 (bandeja organizer aprobada) los definió como Out of Scope: "Filtro por tipo desde UI (no requerido en MVP; se puede agregar en Future si el volumen lo justifica)". Aplicar la misma política a US-073 preserva simetría entre bandejas y evita divergencia UX. Para el demo, el destacado visual por tipo (D4) basta para reconocer visualmente rechazo/expiración.

### Decisión formal

```text
US-073 NO implementa filtros por tipo desde UI en MVP. Se conservan los filtros heredados de US-071 D2 (`?status=unread` opcional). El destacado visual por tipo (D4) provee la señal para distinguir tipos. Toggle "Filtrar por tipo" = Future US no listada; requiere ADR si se promueve.

Se aplica Documentation Alignment con PB-P2-009 Acceptance Summary: "Filtros por tipo" se reformula como "Destacado visual por tipo".
```

### Rationale

* Simetría US-071 ↔ US-073.
* Simplicidad MVP.
* El destacado visual + orden `unread first` cubren la mayoría de casos.

### Impacto

| Sección              | Cambio                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D3.                                                                                        |
| Scope Guardrails     | `Explicitly Out of Scope`: filtros por tipo desde UI.                                              |
| Documentation Alignment | PB-P2-009 Acceptance Summary reformulado.                                                          |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 4 — Design tokens variant por tipo (Q4)

### Respuesta PO/BA

Alineado con el design system MVP y con NFR-A11Y-005 (contraste mínimo WCAG). Semántica visual pragmática y accesible: usar color acompañado siempre de texto/icono para no depender exclusivamente del color (NFR-A11Y evita el "color-only signaling").

### Decisión formal

```text
El componente `NotificationItem` recibe la prop `variant` derivada de `notification.type` mediante un mapping declarativo `TYPE_TO_VARIANT`:

| type                     | variant       | color semántico (design token) |
| ------------------------ | ------------- | ------------------------------ |
| quote_rejected            | destructive   | rojo                            |
| quote_expired             | warning       | amarillo                        |
| quote_request_received    | info          | azul                            |
| booking_confirmed         | success       | verde                           |
| task_due_soon             | info          | azul                            |
| review_received           | neutral       | gris                            |
| vendor_approved           | success       | verde                           |
| vendor_rejected           | destructive   | rojo                            |
| (default / desconocido)   | neutral       | gris                            |

CADA variant DEBE combinar color + icono + texto localizado (NFR-A11Y-005 anti color-only). El nombre del `type` NO se muestra literal al usuario; se traduce a copy localizado (`title`/`body` heredados del DTO ya localizados server-side).
```

### Rationale

* Alineado con NFR-A11Y-005 (accesibilidad de color).
* Extensible: nuevos types entran con variant `neutral` por default.
* Design tokens reduce fragmentación visual entre US-071 y US-073.

### Impacto

| Sección              | Cambio                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D4.                                                                                        |
| Acceptance Criteria  | AC de A11Y menciona explícitamente "color + icono + texto".                                        |
| Technical Notes      | Frontend documenta mapping `TYPE_TO_VARIANT`.                                                       |
| Test Scenarios       | A11Y verifica contraste + presencia de texto complementario.                                        |
| UX / UI Notes        | Actualizado con la tabla de variants.                                                              |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 5 — Mark-as-read reuso US-072 (Q5)

### Respuesta PO/BA

US-072 (aprobada) provee mark-as-read cross-role. US-071 D6 ya declaró que "US-071 NO dispara mark-as-read; alcance exclusivo de US-072". Aplicar la misma política a US-073 preserva simetría y evita duplicación de mutations TanStack.

### Decisión formal

```text
US-073 NO implementa mutations mark-as-read. Reusa 1:1 los componentes `MarkAsReadButton` y `MarkAllAsReadButton` de US-072 (aprobada) y sus hooks `useMarkNotificationAsRead` / `useMarkAllNotificationsAsRead`. La invalidación TanStack coordina automáticamente el badge unread del vendor sin código propio en US-073.

Ratificación paralela a US-071 D6: mark-as-read es SIEMPRE explícito (botón por item + botón "Marcar todas" en el footer).
```

### Rationale

* Simetría US-071 ↔ US-073.
* Reuso máximo de US-072 aprobada.
* Sin duplicación.

### Impacto

| Sección              | Cambio                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D5.                                                                                        |
| Scope Guardrails     | `Explicitly Out of Scope`: mark-as-read → US-072 aprobada.                                          |
| Technical Notes      | Frontend documenta reuso de componentes y hooks de US-072.                                          |
| Test Scenarios       | Sin tests de mutations; contract test verifica invalidación coordinada.                             |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 6 — Vendor layout (Q6, parcial)

### Respuesta PO/BA

Al momento de esta refinación no se verifica en el repositorio la existencia de un layout vendor específico (`apps/web/app/(authenticated)/vendor/layout.tsx`). Dos escenarios: (a) el layout ya existe como parte de US-040 (create-vendor-profile) o alguna foundational; (b) no existe. Si (b), US-073 debe crearlo como task de foundation con estructura mínima (header + slot para NotificationsBell + main). Como es un prerequisite bloqueador para montar el bell, se resuelve declarando la task explícitamente en el Technical Spec + Dev Tasks con dependencia clara.

### Decisión formal

```text
La existencia del vendor layout es prerequisito. Durante Technical Spec, el Tech Lead verifica su existencia y:
- Si existe: reusar; agregar el `NotificationsBell` como slot en el header.
- Si NO existe: crear layout mínimo (`apps/web/app/(authenticated)/vendor/layout.tsx`) como task de foundation dentro de US-073, con estructura simétrica al layout organizer usado por US-071.

El path exacto se ratifica durante Technical Spec (`docs/15 §Client Components` puede tener recomendaciones adicionales).
```

### Rationale

* Prerequisite práctico bloqueado técnicamente pero no funcionalmente.
* Delegar a Technical Spec Tech Lead evita over-especificación en refinación.

### Impacto

| Sección              | Cambio                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D6.                                                                                        |
| Technical Notes      | Backend/Frontend documentado con "verificar/crear layout".                                          |
| Task Generation Notes | Task explícita: "Verificar/crear vendor layout".                                                    |

### ¿Bloqueaba aprobación? Parcial. Requires Tech Lead Validation en Technical Spec.

---

## 3. Consolidated Decision Table

|  # | Tema                                | Decisión                                                                                                        | Tipo                | ¿Bloqueaba aprobación? | Validación adicional                            |
| -: | ----------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------- | ----------------------------------------------- |
|  1 | Alcance bandeja                     | Bandeja unificada vendor (patrón US-071 D1). Cierra gap de US-068 D4 y US-070 D4.                              | Tech Recommendation | Sí                     | Requires Tech Lead Validation en Technical Spec |
|  2 | Deep links por tipo                 | `quote_rejected` y `quote_expired` → `/vendor/quotes/{quoteId}`. Extensión de `LINK_STRATEGY_BY_TYPE`.           | Tech Recommendation | Sí                     | Requires Tech Lead Validation en Technical Spec |
|  3 | Filtros por tipo desde UI           | Sin filtros en MVP (simetría US-071). Toggle Future.                                                            | PO                  | Sí                     | No requiere                                     |
|  4 | Design tokens variant               | Mapping `TYPE_TO_VARIANT` con color + icono + texto (NFR-A11Y-005).                                             | PO                  | Sí                     | No requiere                                     |
|  5 | Mark-as-read                        | Reuso 1:1 de US-072 aprobada. Sin mutations propias.                                                            | PO                  | Sí                     | No requiere                                     |
|  6 | Vendor layout                       | Verificar existencia; si no, crear layout mínimo como task de foundation (delegado a Technical Spec).            | Tech Recommendation | Parcial                | Requires Tech Lead Validation en Technical Spec |

---

## 4. Cambios Aplicados a la User Story

Aplicados durante la reescritura del archivo. Ver `management/user-stories/US-073-vendor-quote-rejected-notification-surface.md`.

Resumen:
- Metadata (Backlog Item, Feature, Status → Ready for Approval, Approval Metadata).
- Business Context (Context Summary declarando cierre de gap; Dependencies ampliadas con US-054/068/070/071/072).
- PO/BA Decisions Applied D1..D6.
- Traceability con IDs canónicos.
- Scope Guardrails ampliado.
- AC-01..AC-09 (heredados de US-071 con adaptación variant + link por tipo).
- EC-01..EC-05.
- VR-01..VR-05.
- SEC-01..SEC-03.
- Technical Notes con reuso 1:1 del patrón US-071 y extensiones concretas.
- UX / UI Notes con mapping `TYPE_TO_VARIANT`.
- Test Scenarios heredados de US-071 + específicos de US-073.
- DoR/DoD.
- Notes con handoffs explícitos y Documentation Alignment.

---

## 5. Documentation Alignment Required

| Documento / Fuente                                | Conflicto                                                                                                                    | Decisión vigente                                                                     | Acción recomendada                                                                                                        | ¿Bloquea aprobación? |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| `docs/16 §34.3` (tabla `link generation by type`) | Faltan filas `quote_rejected` y `quote_expired`.                                                                              | D2 extiende la tabla.                                                                | Agregar 2 filas: `quote_rejected` y `quote_expired` → `/vendor/quotes/{payload.quoteId}`.                                | No                   |
| PB-P2-009 `Description`                            | Dice "tipos `quote_rejected` y `quote_expired`"; D1 amplía a unificada.                                                     | Bandeja unificada (D1).                                                              | Actualizar `Description` a: "Bandeja unificada del vendor con destacado visual por tipo, cubriendo `quote_rejected`, `quote_expired`, `quote_request_received`, `booking_confirmed` y futuros types del vendor". | No                   |
| PB-P2-009 Acceptance Summary                       | Dice "Filtros por tipo"; D3 los mueve a Future.                                                                              | Sin filtros en MVP (D3).                                                             | Reformular a "Destacado visual por tipo".                                                                                | No                   |
| PB-P2-009 Traceability                             | Verificar completitud.                                                                                                        | US-073 refinada declara IDs canónicos.                                              | Ampliar Traceability con `FR-QUOTE-009/010, FR-NOTIF-001/002/005, UC-NOTIF-001, UC-QUOTE-009/010, BR-NOTIF-002/005, NFR-A11Y-001..003, NFR-PERF-001 · Decisión PO 8.1 #13`. | No                   |
| `management/artifacts/2-User-Stories-Coverage-Matrix.md` | Coverage matrix declara US-073 como "Surface US-054"; con D1 pasa a bandeja vendor unificada.                             | D1 amplía.                                                                          | Actualizar la matriz.                                                                                                     | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                                                                                                                |
| User Story file path                         | `management/user-stories/US-073-vendor-quote-rejected-notification-surface.md`                                                                                                     |
| Decision Resolution artifact created/updated | Yes                                                                                                                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-073-decision-resolution.md`                                                                                                       |
| New User Story status                        | Ready for Approval                                                                                                                                                                 |
| Remaining blockers                           | No                                                                                                                                                                                 |
| Reason                                       | 6 decisiones D1–D6 formalizadas con respaldo documental (docs/16 §34.2/§34.3, docs/9 FR-QUOTE-009/010 + FR-NOTIF-001/002/005, docs/4 BR-NOTIF-002/005, docs/10 NFR-A11Y-001..005, US-054 aprobada, US-071 D1-D6 aprobadas, US-072 aprobada). D1, D2 y D6 marcadas como Tech Recommendation. |

---

## 7. Estado recomendado

`Ready for Approval`

---

## 8. Próximo Paso Recomendado

```text
1. (Opcional) Run `eventflow-user-story-refinement` para revalidación.
2. Run `eventflow-user-story-approval`.
3. Run `eventflow-user-story-technical-spec`.
4. Run `eventflow-user-story-to-development-tasks`.
```

User Story file updated: Yes
Path: management/user-stories/US-073-vendor-quote-rejected-notification-surface.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-073-decision-resolution.md
Next step: Run `eventflow-user-story-refinement` (revalidación) o `eventflow-user-story-approval`.
