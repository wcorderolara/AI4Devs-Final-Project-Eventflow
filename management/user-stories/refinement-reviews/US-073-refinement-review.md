# User Story Refinement Review — US-073

## Source User Story File
management/user-stories/US-073-vendor-quote-rejected-notification-surface.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-073-decision-resolution.md

## Review Date
2026-07-07 (revalidación: 2026-07-07)

## Revalidation Result (2026-07-07)

Tras la ejecución de `eventflow-po-ba-decision-resolver` (ver `management/user-stories/decision-resolutions/US-073-decision-resolution.md`) y la actualización en sitio de la User Story:

| Verificación                                                                                                                                                | Resultado |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Q1 (alcance) resuelta: bandeja unificada vendor; cierra gap identificado en US-068 D4 y US-070 D4.                                                          | OK        |
| Q2 (deep links) resuelta: `quote_rejected` y `quote_expired` → `/vendor/quotes/{payload.quoteId}`.                                                          | OK        |
| Q3 (filtros por tipo) resuelta: sin filtros en MVP (simetría US-071). Toggle Future.                                                                        | OK        |
| Q4 (design tokens) resuelta: mapping `TYPE_TO_VARIANT` con color + icono + texto (NFR-A11Y-005 anti color-only).                                            | OK        |
| Q5 (mark-as-read) resuelta: reuso 1:1 de US-072 aprobada.                                                                                                    | OK        |
| Q6 (vendor layout) resuelta: verificar/crear como task de foundation (delegado a Technical Spec Tech Lead).                                                 | OK        |
| Traceability corregida: `FR-QUOTE-009/010, FR-NOTIF-001/002/005, UC-NOTIF-001, UC-QUOTE-009/010, BR-NOTIF-001/002/005/007, NFR-PERF-001, NFR-A11Y-001..005`. | OK        |
| Backlog Item declarado. Dependencies ampliadas con US-054/068/070/071/072.                                                                                   | OK        |
| AC reescritos (AC-01..AC-09), EC ampliados (EC-01..EC-05), VR/SEC ampliados con reuso claro de patrones aprobados.                                          | OK        |
| Documentation Alignment Required (5 ítems, no bloqueantes).                                                                                                  | OK        |
| Sin scope creep (filtros por tipo, realtime, mark-as-read propio permanecen Out of Scope).                                                                  | OK        |

**Estado recomendado final**: `Ready for Approval`.
**Próximo paso**: `eventflow-user-story-approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| User Story ID                              | US-073                                                                                                                                            |
| File Path                                  | `management/user-stories/US-073-vendor-quote-rejected-notification-surface.md`                                                                    |
| Backlog Item                               | PB-P2-009 — Surface vendor de notificaciones de rechazo/expiración (P2, Must Have, posición 1 de 1)                                              |
| Epic                                       | EPIC-NOT-001                                                                                                                                      |
| Estado actual                              | Draft                                                                                                                                              |
| Estado recomendado                         | Needs Refinement                                                                                                                                   |
| Nivel de riesgo                            | Medio                                                                                                                                              |
| Calidad general                            | Media                                                                                                                                              |
| Requiere decisión PO                       | Sí                                                                                                                                                 |
| Requiere decisión técnica                  | Sí                                                                                                                                                 |
| Requiere decisión QA                       | No                                                                                                                                                 |
| Requiere decisión Seguridad                | No                                                                                                                                                 |
| Decision Resolution artifact found         | No                                                                                                                                                |
| User Story file updated                    | No                                                                                                                                                |
| Refinement review artifact created/updated | Yes                                                                                                                                                |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-073-refinement-review.md`                                                                          |

---

## 2. Diagnóstico PO/BA

US-073 es la bandeja UI del vendor que consume las notifs `quote_rejected` y `quote_expired` emitidas por **US-054** (aprobada, `PB-P1-032`). Es la contraparte simétrica a US-071 (surface organizer aprobada). Además, resuelve implícitamente el gap identificado en US-068 D4 y US-070 D4 ("bandeja vendor genérica = Future US no listada"): si US-073 entrega el `NotificationsBell` para el vendor, todos los tipos de notif del vendor (`quote_request_received` de US-068, `booking_confirmed` de US-070, `quote_rejected`/`quote_expired` de US-054, y `vendor_approved`/`vendor_rejected` per docs/6 §Notification) pueden visualizarse en él.

Fuentes canónicas:

* `FR-QUOTE-009` (`docs/9 §467`) — Quote expired + notif al vendor.
* `FR-QUOTE-010` (`docs/9 §468`) — Quote rejected + notif al vendor.
* `FR-NOTIF-001` (in-app), `FR-NOTIF-002` (consulta + mark), `FR-NOTIF-005` (aislamiento).
* `UC-NOTIF-001` (recibir notifs in-app), `UC-QUOTE-009` (rechazo — fuente del disparo), `UC-QUOTE-010` (expiración — fuente del disparo por job).
* `BR-NOTIF-001/002/005/007`.

El archivo llega con cinco bloques de problemas:

1. **Traceability con IDs INCORRECTOS.** `FR-NOTIF-003` es "email simulado por log" — no es el primario del listado. `UC-NOTIF-002` es "Marcar como leída" (alcance de US-072). `BR-NOTIF-003` es "email simulado por log". Los canónicos primarios son `FR-QUOTE-009/010` (origen), `FR-NOTIF-002` (surface listado), `UC-NOTIF-001` + `UC-QUOTE-009/010` (fuente disparo), `BR-NOTIF-002/005`.

2. **Alcance ambiguo entre "sólo rechazo/expiración" y "bandeja unificada vendor".** El título dice "Quote rechazada/expirada" y PB-P2-009 `Description` dice "UI del centro de notificaciones del vendor con tipos `quote_rejected` y `quote_expired`". Pero el endpoint canónico `GET /api/v1/notifications` (`docs/16 §34.2`) es genérico. Restringir a 2 tipos obliga al vendor a mirar 2 bandejas (una unificada Future + una filtrada aquí). Recomendación: bandeja unificada vendor (patrón US-071 D1) con destacado visual por tipo. Cierra el gap de US-068/US-070.

3. **Solapamiento de alcance con US-072 (mark-as-read) y con US-071 (patrón).** UX/UI declara "Marcar leída" como Secondary Action; Backend note dice "Compartido con US-071" pero no explicita boundaries. Recomendación: recortar mark-as-read a US-072 (aprobada) y declarar reuso del patrón US-071 completo (hooks, componentes, contract).

4. **Filtros por tipo declarados en PB pero no en US.** PB-P2-009 Acceptance Summary dice "Filtros por tipo". US-073 no menciona filtros. Recomendación: mantener bandeja unificada por default (patrón US-071) con toggle opcional por tipo Future; para MVP demo, destacado visual basta.

5. **AC delgados.** AC-01 "ve item" sin definir orden, paginación, destacado visual, link, i18n, A11Y. Falta AC para: 401, aislamiento (403/404 no-revelación), paginación estable, empty/loading/error, performance, contract con `NotificationLinkResolver` para `quote_rejected`/`quote_expired`, ratificación mark-as-read via US-072.

Documentation Alignment: el `NotificationLinkResolver` (US-071 D3 + US-068/US-069/US-070) requiere agregar filas para `quote_rejected` y `quote_expired`. Rutas canónicas per `docs/8 §UC-QUOTE-009/010`: `/vendor/quotes/{quoteId}` (el vendor accede al detalle de su Quote rechazada/expirada).

Adicionalmente, la existencia del vendor layout `apps/web/app/(authenticated)/vendor/layout.tsx` es prerequisito no verificado; requiere Q6.

Sin resolver Q1–Q5 (bloqueantes) + Q6 opcional, no pueden reescribirse AC/Technical Notes de forma consistente con US-054 (upstream), US-071 (patrón), US-072 (mark-as-read).

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                                                             | Impacto                                                                                                                          | Recomendación                                                                                                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Traceability con IDs INCORRECTOS: `FR-NOTIF-003` (email log), `UC-NOTIF-002` (marcar leída), `BR-NOTIF-003` (email log).                                                                                                                              | Rompe trazabilidad académica.                                                                                                     | Reemplazar por canónicos: FR = `FR-QUOTE-009/010` (origen) + `FR-NOTIF-001/002/005`; UC = `UC-NOTIF-001, UC-QUOTE-009/010`; BR = `BR-NOTIF-001/002/005/007`; NFR = `NFR-PERF-001, NFR-USAB-001, NFR-A11Y-001..003`.                    |
| Alta      | Alcance ambiguo: bandeja unificada vendor vs filtrada por 2 tipos. `docs/16 §34.2` es genérico. US-068 D4 y US-070 D4 identificaron el gap de bandeja vendor.                                                                                        | Sin decisión, vendor tendría 2 bandejas o gap para otros tipos.                                                                    | Resolver Q1 (PO+Tech). Recomendación: bandeja unificada (patrón US-071 D1) con destacado visual por tipo. Cierra el gap identificado en US-068 D4 y US-070 D4.                                                                       |
| Alta      | Deep links por tipo faltantes. `NotificationLinkResolver` (US-071 D3) requiere ampliación para `quote_rejected` y `quote_expired`.                                                                                                                    | Click en item sin link definido; UX rota.                                                                                          | Resolver Q2 (Tech). Rutas: `quote_rejected` → `/vendor/quotes/{payload.quoteId}`; `quote_expired` → `/vendor/quotes/{payload.quoteId}`. Ampliar la tabla `LINK_STRATEGY_BY_TYPE` (Documentation Alignment con `docs/16 §34.3`).       |
| Alta      | Solapamiento con US-072 (mark-as-read). US-073 declara "Marcar leída" como Secondary Action.                                                                                                                                                          | Duplicación de mutation TanStack.                                                                                                  | Resolver Q5 (PO). Recomendación: reuso 1:1 de US-072 aprobada; US-073 no implementa mutations. Ratificación paralela a US-071 D6.                                                                                                     |
| Alta      | Prerequisito vendor layout no verificado. `apps/web/app/(authenticated)/vendor/layout.tsx` (o equivalente) debe existir para montar `NotificationsBell`.                                                                                              | Sin layout, no hay entry point UX.                                                                                                | Resolver Q6 (Tech). Ratificar existencia o incluir Task explícito para crearlo (Backend/DevOps).                                                                                                                                       |
| Media     | AC-01 muy delgado.                                                                                                                                                                                                                                    | QA no puede asertar.                                                                                                                | Reescribir con AC-01..AC-09 (patrón US-071 aprobada).                                                                                                                                                                                  |
| Media     | Filtros por tipo declarados en PB pero no en US.                                                                                                                                                                                                       | Ambigüedad sobre alcance UX del filtro.                                                                                            | Resolver Q3 (PO). Recomendación: sin filtros por tipo en MVP; destacado visual basta. Toggle Future.                                                                                                                                    |
| Media     | Destacado visual "rojo/amarillo" declarado en UX/UI Notes sin design tokens.                                                                                                                                                                          | UX inconsistente con design system.                                                                                                | Resolver Q4 (PO). Ratificar semántica visual: `quote_rejected` → destructive/rojo; `quote_expired` → warning/amarillo; `quote_request_received` → info/azul (US-068); `booking_confirmed` → success/verde (US-070). Design tokens.     |
| Media     | Backlog Item no declarado en Metadata.                                                                                                                                                                                                                | Pérdida de trazabilidad.                                                                                                            | Agregar `Backlog Item: PB-P2-009`.                                                                                                                                                                                                     |
| Media     | Priority = "Must Have" pero PB-P2-009 dice "MoSCoW: Must Have". Consistente pero Prioridad global del backlog es P2 (Should Have contextual). Verificar en Metadata.                                                                                  | Confusión "Must Have" vs P2. Alineado con Decisión PO 8.1 #13.                                                                     | Mantener "Must Have" alineado con PB. Documentar como excepción en `Notes` (contexto: cierre del loop bilateral, Decisión PO 8.1 #13).                                                                                                 |
| Baja      | i18n locales no enumerados.                                                                                                                                                                                                                            | QA puede no cubrir.                                                                                                                | Enumerar (`es-LATAM, es-ES, pt, en`).                                                                                                                                                                                                 |
| Baja      | Dependencies `US-054` correcto pero incompleto. Debería incluir US-071 (patrón bandeja), US-072 (mark-as-read), y opcionalmente US-068/070 (otros tipos que aparecerán si Q1 = unificada).                                                             | Handoff poco explícito.                                                                                                            | Ampliar Dependencies.                                                                                                                                                                                                                  |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                              |
| ------------------------------------ | --------- | ----------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | —                                                                       |
| No introduce contratos firmados      | Pass      | —                                                                       |
| No introduce WhatsApp/chat/push      | Pass      | Sin surface push.                                                       |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                            |
| Respeta backend como source of truth | Pass      | Consumo canonical; sin lógica de negocio en cliente.                    |
| Respeta seed/demo si aplica          | Pass      | Reuso del seed de US-054 (que crea notifs demo).                        |
| No introduce RAG/vector DB           | Pass      | —                                                                       |
| No introduce multi-tenant enterprise | Pass      | Ownership por `user_id`.                                                 |
| No introduce P4/Future scope         | Pass      | Filtros por tipo, mark-as-unread, realtime siguen Future.               |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                     | Problema detectado                                                                                                | Acción recomendada                                                                                                                                                                                                                                                                                                                                                                                     |
| ----- | --------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail / Not Testable | "Ve item" sin definir orden, paginación, destacado visual, link, i18n, A11Y.                                       | Reescribir tras Q1..Q4. Ejemplo: "Dado un vendor autenticado con notifs `type ∈ {quote_rejected, quote_expired, quote_request_received, booking_confirmed}`, cuando abre el `NotificationsBell` del layout vendor, entonces recibe `GET /api/v1/notifications?page=1&pageSize=10` (default `channel=in_app`) con destacado visual por tipo (rojo/amarillo/azul/verde) y link server-side por tipo (D2)." |

AC faltantes:
- AC para 401.
- AC para aislamiento (BR-NOTIF-005): sólo el vendor ve sus notifs.
- AC para paginación estable (heredado de US-071 AC-05).
- AC para empty/loading/error (heredado de US-071 AC-06).
- AC para A11Y del dropdown (heredado de US-071 AC-07).
- AC para i18n en 4 locales (heredado de US-071 AC-08).
- AC para performance P95 < 1.5 s (heredado de US-071 AC-09).
- AC para deep link server-side por tipo (Q2).
- AC para mark-as-read reuso (Q5) — click en botón de item invoca US-072.
- AC para bulk de rechazos (EC-01) — sin agrupar, paginado.

---

## 6. Gaps Detectados

### Producto / Negocio
- Definir alcance bandeja (Q1: unificada).
- Ratificar filtros por tipo (Q3: sin filtros en MVP; toggle Future).
- Design tokens por tipo (Q4).

### Backend / API
- Reuso 1:1 del endpoint canónico `GET /api/v1/notifications` y del `ListMyNotificationsUseCase` extendido en US-071 (con query params `channel, status, page, pageSize`).
- Extensión del `NotificationLinkResolver` con `quote_rejected` y `quote_expired` (Q2).

### Frontend / UX
- Reuso 1:1 de los componentes de US-071: `NotificationsBell`, `NotificationsDropdown`, `NotificationItem` (con extensión de variant visual por tipo), `NotificationsEmptyState`, `NotificationsErrorBanner`, `UnreadBadge`.
- Mount point vendor: `apps/web/app/(authenticated)/vendor/layout.tsx` (Q6).
- Extensión de `NotificationItem` con variant visual por tipo (D4/Q4).
- Reuso de i18n de US-071 + extensión con copy específico de `quote_rejected`/`quote_expired` (título/body ya llegan localizados server-side por US-054 D6 equivalente).

### Base de Datos
- Sin migración. Reuso de índices.

### Seguridad / Autorización
- Reuso de `NotificationOwnerPolicy` (US-071 SEC-02).
- Aislamiento BR-NOTIF-005 verificado por el `WHERE user_id = session.userId` en el use case.

### QA / Testing
- IT reusa los patrones de US-071 (401, aislamiento, paginación, orden).
- Nuevos IT específicos: destacado visual por tipo, link resolver para `quote_rejected`/`quote_expired`.
- E2E: click en item T-7 vendor → aterriza en `/vendor/quotes/{id}`.
- A11Y con Axe.
- Contract test MSW.

### Seed / Demo
- Reuso del seed de US-054 (que crea al menos 1 notif `quote_rejected` demo).
- Confirmar que el vendor demo tenga al menos 1 notif por cada tipo relevante para probar el destacado visual.

### Documentación / Trazabilidad
- IDs canónicos, Backlog Item, `Related Document(s)` ampliado.
- Documentation Alignment: agregar filas `quote_rejected` y `quote_expired` a la tabla `LINK_STRATEGY_BY_TYPE` en `docs/16 §34.3`.
- Actualizar EPIC-NOT-001 en Coverage Matrix: US-073 = bandeja vendor unificada (no sólo rechazo/expiración).

---

## 7. Preguntas Pendientes

| Tipo         | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                    | Bloquea aprobación | Responsable        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------ |
| PO + Tech    | Q1. Alcance: ¿bandeja unificada vendor (patrón US-071 D1, muestra todos los tipos `quote_rejected, quote_expired, quote_request_received, booking_confirmed` + futuros) o filtrada a los 2 tipos declarados por PB-P2-009? Recomendación: unificada. Cierra el gap identificado en US-068 D4 y US-070 D4 sin nueva US futura.                                                                                                | Sí                 | Product Owner + Tech Lead |
| Tech + PO    | Q2. Deep links por tipo para vendor: `quote_rejected` → `/vendor/quotes/{payload.quoteId}`; `quote_expired` → `/vendor/quotes/{payload.quoteId}`. Ratificar en `NotificationLinkResolver` (US-071 D3). Se agrega Documentation Alignment con `docs/16 §34.3`.                                                                                                                                                                | Sí                 | Product Owner + Tech Lead |
| PO           | Q3. Filtros por tipo en la UI. PB-P2-009 los pide; US-071 no los tiene (Future). Recomendación: sin filtros por tipo en MVP; destacado visual basta. Toggle por tipo = Future US.                                                                                                                                                                                                                                            | Sí                 | Product Owner     |
| PO           | Q4. Design tokens por tipo (variant visual). Recomendación: `quote_rejected` → destructive/rojo; `quote_expired` → warning/amarillo; `quote_request_received` → info/azul (US-068); `booking_confirmed` → success/verde (US-070). Alineado con design system.                                                                                                                                                                | Sí                 | Product Owner     |
| PO           | Q5. Mark-as-read en US-073: ¿alcance propio o reuso de US-072? Recomendación: reuso 1:1 de US-072 (aprobada). US-073 no implementa mutations; sólo consume el botón/hook de US-072 en el `NotificationItem` compartido. Ratificación paralela a US-071 D6.                                                                                                                                                                    | Sí                 | Product Owner     |
| Tech + PO    | Q6 (opcional). Prerequisito: ¿existe `apps/web/app/(authenticated)/vendor/layout.tsx` (o equivalente)? Si no, US-073 lo crea o depende de una US foundational.                                                                                                                                                                                                                                                              | Parcial            | Tech Lead + PO     |

---

## 8. Documentation Alignment Required

| Documento / Fuente                                | Conflicto detectado                                                                                             | Decisión vigente                                                                                              | Acción recomendada                                                                                                                                                     | ¿Bloquea aprobación? |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/16 §34.3` (tabla `link generation by type`) | Faltan filas `quote_rejected` y `quote_expired`.                                                                | D2 US-073 extiende la tabla iniciada por US-071 y ampliada por US-068/US-069/US-070.                          | Agregar 2 filas: `quote_rejected` y `quote_expired` → `/vendor/quotes/{payload.quoteId}`.                                                                             | No                   |
| PB-P2-009 Traceability                             | Verificar completitud (verificar si menciona `FR-QUOTE-009/010`, `UC-QUOTE-009/010`).                            | US-073 refinada declara IDs canónicos.                                                                        | Ampliar Traceability del backlog item con IDs canónicos y `Decisión PO 8.1 #13`.                                                                                     | No                   |
| PB-P2-009 `Description`                            | Dice "tipos `quote_rejected` y `quote_expired`"; Q1 (unificada) amplía el alcance.                              | Bandeja unificada (D1).                                                                                       | Actualizar `Description` a "Bandeja unificada del vendor con destacado visual por tipo, cubriendo `quote_rejected`, `quote_expired`, `quote_request_received`, `booking_confirmed`". | No                   |
| `management/artifacts/2-User-Stories-Coverage-Matrix.md` | Coverage matrix declara US-073 como "Surface US-054"; con D1 pasa a ser bandeja vendor unificada.               | D1 amplía.                                                                                                    | Actualizar la matriz.                                                                                                                                                  | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                                                                                                                                                                                                                                                                                       |
| User Story file path                       | `management/user-stories/US-073-vendor-quote-rejected-notification-surface.md`                                                                                                                                                                                                                                                                           |
| User Story ID verified                     | Yes                                                                                                                                                                                                                                                                                                                                                       |
| Decision Resolution artifact found         | No                                                                                                                                                                                                                                                                                                                                                       |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-073-decision-resolution.md`                                                                                                                                                                                                                                                                             |
| Refinement review artifact created/updated | Yes                                                                                                                                                                                                                                                                                                                                                       |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-073-refinement-review.md`                                                                                                                                                                                                                                                                                 |
| Final recommended status                   | Needs Refinement                                                                                                                                                                                                                                                                                                                                         |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                                                                                                                                                                                                                                                                                      |
| Reason                                     | 5 preguntas bloqueantes Q1–Q5 + Q6 parcial. Q1 (bandeja unificada vs filtrada) determina si US-073 cierra el gap de US-068 D4 y US-070 D4 o si esos gaps quedan como Future US. Q2 amplía la tabla `LINK_STRATEGY_BY_TYPE`. Reescritura de AC/Technical Notes depende de las decisiones. |

---

## 10. Cambios Aplicados o Recomendados

(No aplicados; prescriptivos para tras la resolución.)

### Metadata
- `Backlog Item: PB-P2-009 (posición 1 de 1)`.
- `Feature`: "Bandeja unificada de notificaciones vendor con destacado visual por tipo".
- `Status → Ready for Approval` tras aplicar todos los cambios.

### Business Context
- `Context Summary` ampliado: "Bandeja unificada del vendor que consume `GET /api/v1/notifications` (canonical de `docs/16 §34.2`) y muestra todos los tipos de notif del vendor con destacado visual por tipo. Cierra el gap identificado en US-068 D4 y US-070 D4."
- Dependencies ampliadas: US-054 (upstream — emite quote_rejected/expired), US-068 (upstream — emite quote_request_received), US-070 (upstream — emite booking_confirmed vendor recipient), US-071 (patrón bandeja aprobada — reuso 1:1 de componentes y hooks), US-072 (mark-as-read aprobada).

### PO/BA Decisions Applied
- Sección nueva con D1..D6.

### Traceability
- FRD → `FR-QUOTE-009` (Quote expired notif), `FR-QUOTE-010` (Quote rejected notif), `FR-NOTIF-001, FR-NOTIF-002, FR-NOTIF-005`.
- UC → `UC-NOTIF-001` (recibir notifs in-app), `UC-QUOTE-009` (rechazo — fuente disparo), `UC-QUOTE-010` (expiración — fuente disparo).
- BR → `BR-NOTIF-001, BR-NOTIF-002, BR-NOTIF-005, BR-NOTIF-007`.
- Permission → `Owner (user_id = session.userId)`.
- Data Entity → `Notification, Quote, User, VendorProfile`.
- API → `GET /api/v1/notifications` (canonical, `docs/16 §34.2`; ya extendido por US-071 con query params).
- NFR → `NFR-PERF-001, NFR-USAB-001, NFR-A11Y-001, NFR-A11Y-002, NFR-A11Y-003`.
- Related Documents → `/docs/4 §BR-NOTIF-001/002/005/007`, `/docs/6 §Notification`, `/docs/8 §UC-NOTIF-001 §UC-QUOTE-009 §UC-QUOTE-010`, `/docs/9 §FR-QUOTE-009 §FR-QUOTE-010 §FR-NOTIF-001/002/005`, `/docs/10 §NFR-PERF-001 §NFR-A11Y-001..003 §NFR-USAB-001`, `/docs/14 §Notifications`, `/docs/15 §Client Components §Vendor Layout`, `/docs/16 §34.2 §34.3`, `/docs/18 §18.1`.
- Backlog Item.
- Decisión PO 8.1 #13.

### Scope Guardrails
- `Explicitly Out of Scope`: mark-as-read (→ US-072 aprobada), filtros por tipo desde UI (Future), toggle "Sólo no leídas" (heredado US-071 D2 — se reusa vía patrón), realtime WebSocket, push/SMS/WhatsApp, notif de otros roles (organizer) — nunca.
- `Scope Notes`: reformular como "Bandeja vendor unificada; reuso del patrón US-071 aprobado; sin mutations (US-072 provee mark-as-read); cierra el gap de bandeja vendor de US-068 D4 y US-070 D4".

### Acceptance Criteria
- AC-01..AC-09 reescritos (patrón US-071 aprobado + variant visual por tipo).

### Edge Cases
- EC-01 (bulk de rechazos) — reformular con paginación.
- EC-02 (notif `link=null` para recurso eliminado — heredado de US-071 EC-03).
- EC-03 (vendor sin sesión — 401).
- EC-04 (aislamiento — vendor B no ve notifs de vendor A).
- EC-05 (types futuros no soportados por el resolver — mostrar sin destacado y sin link).

### Validation Rules
- VR-01: sesión activa → 401.
- VR-02: `user_id = session.userId` (heredado US-071 D5).
- VR-03..VR-05: heredados de US-071 (canonical extendido).

### Authorization & Security
- SEC-01: Ownership por `NotificationOwnerPolicy` (reuso US-071).
- SEC-02: 401/403/404 no-revelación (heredado US-071 + US-072).
- SEC-03: aislamiento BR-NOTIF-005.

### Technical Notes (Frontend)
- **Reuso 1:1 del patrón US-071 aprobado**:
  * Componentes: `NotificationsBell`, `NotificationsDropdown`, `NotificationsList`, `NotificationItem`, `NotificationsEmptyState`, `NotificationsErrorBanner`, `UnreadBadge`.
  * Hooks: `useNotifications`, `useUnreadNotificationsCount` (query keys canónicas de US-071).
  * API client: `notificationsApi.list` (US-071).
- **Extensión**: `NotificationItem` recibe prop `variant` derivado de `notification.type`:
  * `quote_rejected` → destructive/rojo.
  * `quote_expired` → warning/amarillo.
  * `quote_request_received` → info/azul.
  * `booking_confirmed` → success/verde.
  * (Otros/futuros) → neutral/default.
- **Mount point**: `apps/web/app/(authenticated)/vendor/layout.tsx` (o equivalente; Q6 ratifica existencia).
- **Mark-as-read**: reuso de `MarkAsReadButton` y `MarkAllAsReadButton` de US-072 aprobada.

### Technical Notes (Backend)
- **Sin cambios**: reuso 1:1 del endpoint canónico `GET /api/v1/notifications` y del `ListMyNotificationsUseCase` extendido en US-071.
- **Extensión del `NotificationLinkResolver`**: agregar 2 estrategias `quote_rejected` y `quote_expired` (Q2 D2).

### Database
- Sin migración.

### API
- Sin cambios.

### Observability / Audit
- Reuso.

### Test Scenarios
- TS-01..TS-05 heredados de US-071 (401, aislamiento, paginación, orden).
- TS específicos de US-073:
  * TS variant visual por tipo (Playwright + snapshot).
  * TS deep link para `quote_rejected` → `/vendor/quotes/{id}`.
  * TS deep link para `quote_expired` → `/vendor/quotes/{id}`.
- E2E: login vendor demo → abrir campanita → click en notif `quote_rejected` → aterriza en `/vendor/quotes/{id}`.
- A11Y con Axe (variant visual accesible con texto complementario, no sólo color).
- Contract test MSW.

### Definition of Ready / Done
- DoR: PO/BA validó.
- DoD: bandeja funcional para vendor demo, 4 tipos con destacado visual + link correcto, A11Y verde (texto complementario al color), i18n 4 locales, PO valida en demo.

### Notes
- Handoff explícito con US-054, US-068, US-070 (upstream — emisores), US-071 (patrón aprobado — reuso), US-072 (mark-as-read).
- Documentation Alignment con `docs/16 §34.3` (link table), PB-P2-009 Description + Traceability, Coverage Matrix.
- Priority "Must Have" alineada con Decisión PO 8.1 #13 (cierre bilateral).

---

## 11. Recomendación Final

`Needs Refinement`

Q1–Q5 bloqueantes + Q6 parcial. Q1 en particular tiene alto impacto: convierte US-073 en la bandeja vendor unificada, cerrando el gap identificado en US-068 D4 y US-070 D4 sin necesidad de nueva US. Todas las decisiones son deterministas desde documentación aprobada y del patrón US-071 aprobado.

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver`.

---

User Story file updated: No
Path: management/user-stories/US-073-vendor-quote-rejected-notification-surface.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-073-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
