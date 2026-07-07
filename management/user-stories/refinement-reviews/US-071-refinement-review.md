# User Story Refinement Review — US-071

## Source User Story File
management/user-stories/US-071-inapp-notification-t-minus-7-recipe.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-071-decision-resolution.md

## Review Date
2026-07-06 (revalidación: 2026-07-06)

## Revalidation Result (2026-07-06)

Tras la ejecución de `eventflow-po-ba-decision-resolver` (ver `management/user-stories/decision-resolutions/US-071-decision-resolution.md`) y la actualización en sitio del archivo de la User Story, esta segunda pasada de refinement confirma:

| Verificación                                                                                                                                                     | Resultado |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Q1 (alcance) resuelta: bandeja unificada con ordenamiento `unread first, sent_at DESC` y destacado visual T-7.                                                    | OK        |
| Q2 (unread/badge) resuelta: default sin filtro; toggle opt-in `?status=unread`; badge con formato `9+`.                                                          | OK        |
| Q3 (deep link) resuelta: patrón server-side por tipo. Para `task_due_soon` → `/organizer/events/{eventId}/tasks?range=7d`. `link=null` si el recurso no existe.  | OK        |
| Q4 (evento cerrado) resuelta: navegación procede; el banner read-only de US-032 comunica el estado.                                                              | OK        |
| Q5 (dedup channel) resuelta: query param `channel` opcional con default `in_app`. Filtra `email_simulated` para la campanita.                                    | OK        |
| Q6 (mark-as-read) resuelta como no aplicable: alcance de US-072.                                                                                                  | OK        |
| Traceability corregida: `FR-NOTIF-001/002/005/007`, `UC-NOTIF-001`, `BR-NOTIF-001/002/005/007`, `NFR-PERF-001, NFR-USAB-001, NFR-A11Y-001..003`. Backlog Item declarado. | OK |
| AC reescritos (AC-01..AC-09), EC ampliados (EC-01..EC-05), VR ampliados (VR-01..VR-05), SEC ampliado (SEC-01..SEC-04), tests ampliados (TS-01..TS-13 + A11Y).      | OK        |
| Documentation Alignment Required (5 ítems, no bloqueantes) para `docs/16 §34.2 / §34.3` y `docs/10 §NFR-OBS-001`.                                                | OK        |
| Sin scope creep (push/SMS/WhatsApp, realtime WebSocket y broadcast permanecen Out of Scope).                                                                     | OK        |

**Estado recomendado final**: `Ready for Approval`.
**Próximo paso**: `eventflow-user-story-approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| User Story ID                              | US-071                                                                                          |
| File Path                                  | `management/user-stories/US-071-inapp-notification-t-minus-7-recipe.md`                          |
| Backlog Item                               | PB-P2-004 — Notificación T-7 (tareas) (P2, posición 2 de 2; US-034 = job upstream ya aprobada)   |
| Epic                                       | EPIC-NOT-001                                                                                    |
| Estado actual                              | Draft                                                                                            |
| Estado recomendado                         | Needs Refinement                                                                                 |
| Nivel de riesgo                            | Medio                                                                                            |
| Calidad general                            | Media                                                                                            |
| Requiere decisión PO                       | Sí                                                                                               |
| Requiere decisión técnica                  | Sí                                                                                               |
| Requiere decisión QA                       | No                                                                                               |
| Requiere decisión Seguridad                | No                                                                                               |
| Decision Resolution artifact found         | No                                                                                              |
| User Story file updated                    | No                                                                                              |
| Refinement review artifact created/updated | Yes                                                                                              |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-071-refinement-review.md`                        |

---

## 2. Diagnóstico PO/BA

US-071 entrega el surface UI del organizer para consumir las notificaciones T-7 emitidas por `EmitT7NotificationsJob` (US-034, aprobada). El valor es directo (el organizer abre la campanita y ve avisos T-7) y el alcance es pequeño: componentes `NotificationsBell` + lista, consumo del endpoint canónico `GET /api/v1/notifications` (`docs/16 §34.2`) y navegación al checklist.

Sin embargo, el archivo llega con tres bloques de problemas que impiden refinar en sitio:

1. **Alcance ambiguo entre "sólo T-7" y "todas las notificaciones".** El título dice "Recibir aviso in-app de T-7 (vista organizer)", el statement dice "ver y abrir notifs T-7 generadas por US-034", pero el endpoint canónico `GET /api/v1/notifications` (`docs/16 §34.2`) es genérico y BR-NOTIF-002 enumera múltiples tipos disparadores (T-7, `quote_request_received`, `booking_confirmed`, etc.). La campanita típicamente es una bandeja unificada, no un filtro por tipo. Falta decisión PO explícita.
2. **Traceability incorrecta o incompleta.** `FR-NOTIF-005` (aislamiento) es válido pero no es el FR primario para el listado; el canónico es `FR-NOTIF-002` (el usuario consulta sus notificaciones in-app y las marca como leídas). Faltan `FR-NOTIF-001` (in-app como canal disparador) y `FR-NOTIF-007` (idioma). El `NFR-OBS-001` declarado corresponde a `AdminAction` y no aplica; los NFR canónicos son `NFR-PERF-001` (P95 < 1.5 s, y el propio Business Impact declara "Carga < 500ms") y la familia `NFR-A11Y-001..003` (semántica, teclado, foco visible). El Backlog Item no está declarado.
3. **Acceptance Criteria delgados y no ejecutables sin decisiones.** AC-01 dice "ve lista paginada con T-7 en top" sin definir tamaño de página, ordenamiento default, semántica de "top" (¿por tipo? ¿por unread?), formato del ítem (título/body/link), ni distinción unread/read. AC-02 dice "redirige a checklist filtrado 7d" sin especificar el deep link exacto (US-032 aprobada expone `GET /api/v1/events/:eventId/tasks?range=7d` con `TaskListItemDto` extendido — el frontend debe navegar a la ruta correspondiente en el mismo formato). Falta AC para no-auth (401), para aislamiento (403 al detalle ajeno; VR-01 y NT-01 lo declaran pero sin AC), para paginación, para empty/loading/error/success states, para accesibilidad del dropdown y para i18n.

Adicionalmente hay dos inconsistencias documentales conocidas que impactan la refinación pero no la bloquean por sí solas:

* `docs/16 §34.3` DTO usa `type: "task_due"` mientras que `docs/6 §Notification` y `docs/18 §18.1` usan `task_due_soon`. La US-034 aprobada usa `task_due_soon` (canónico). Documentation Alignment Required.
* `docs/16 §34.2` usa `PATCH /notifications/:notificationId/read`; el mark-as-read pertenece a US-072 (PB-P2-008), pero cualquier click en la campanita que dispara "marcar leída" debe usar el verbo canónico. Handoff a US-072.

Sin resolver Q1 (alcance del listado), Q2 (unread vs all), Q3 (deep link contract), Q4 (evento asociado en estado `cancelled`/`completed`) y Q5 (dedup entre canales `in_app` y `email_simulated`), no se pueden reescribir AC-01/AC-02 ni Technical Notes de manera consistente con el backend real y con US-034.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                                                                                                                    | Impacto                                                                                                                                                | Recomendación                                                                                                                                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Alcance ambiguo: el título/statement acota a T-7 pero el endpoint `GET /api/v1/notifications` (`docs/16 §34.2`) es genérico y BR-NOTIF-002 enumera múltiples tipos.                                                                                                                                          | Sin decisión, el frontend puede quedar con dos implementaciones distintas (filtro `type=task_due_soon` vs bandeja unificada) y romper el patrón esperado. | Resolver Q1 (PO). Recomendación natural: bandeja unificada de todos los tipos, con destacado visual de T-7 y unread al top.                                                                                                       |
| Alta      | Traceability con IDs incorrectos: `FR-NOTIF-005` es aislamiento (no listado), falta el primario `FR-NOTIF-002`, faltan `FR-NOTIF-001` y `FR-NOTIF-007`. `NFR-OBS-001` no aplica (es `AdminAction`).                                                                                                          | Aprobar con estos IDs rompe la trazabilidad académica y la Documentation Alignment.                                                                    | Reemplazar por IDs canónicos durante refinación (`FR-NOTIF-001, FR-NOTIF-002, FR-NOTIF-005, FR-NOTIF-007`), NFR = `NFR-PERF-001, NFR-USAB-001, NFR-A11Y-001..003`.                                                                |
| Alta      | AC-02 sin contrato de deep link. La US-032 aprobada expone `GET /api/v1/events/:eventId/tasks?range=7d`; la ruta frontend correspondiente y el campo `link: string \| null` (`docs/16 §34.3`) requieren decisión sobre generación server-side o cliente.                                                     | AC-02 no testeable; el click puede no navegar y la demo se rompe.                                                                                       | Resolver Q3 (PO + Tech). Recomendación: `link` generado server-side en el DTO como ruta relativa `/organizer/events/:eventId/tasks?range=7d` para `type='task_due_soon'`.                                                          |
| Alta      | AC-01 delgado y no ejecutable. No define tamaño de página, ordenamiento default, semántica de "top", distinción unread/read ni presencia de badge de conteo.                                                                                                                                                 | QA no puede aserciones precisas; el frontend elige defaults por su cuenta.                                                                              | Resolver Q1 + Q2. Definir default (`page=1, pageSize=10, sort=unread_first_then_sent_at_desc`) y semántica del badge.                                                                                                             |
| Media     | Duplicidad por canal: US-034 emite 1 `Notification(channel='in_app')` + 1 `Notification(channel='email_simulated')` por tarea. Si el listado no deduplica ni filtra, la campanita muestra el mismo evento dos veces.                                                                                          | UX confusa: doble aparición del mismo aviso.                                                                                                            | Resolver Q5 (PO + Tech). Recomendación: filtrar `channel='in_app'` en el `GET /api/v1/notifications` por default (nuevo query param `channel` opcional o filtro implícito).                                                       |
| Media     | Tratamiento del evento asociado en `cancelled`/`completed` al hacer click desde una notif preexistente.                                                                                                                                                                                                     | Riesgo de landing en checklist read-only sin explicación (US-032 muestra banners).                                                                     | Resolver Q4 (PO). Recomendación natural: redirigir igual y confiar en el banner read-only de US-032.                                                                                                                              |
| Media     | Marcar como leída figura en `UX / UI Notes` como Secondary Action y como Test AUTH-TS-01 asume 200, pero el mark-as-read es alcance explícito de **US-072** (PB-P2-008). En US-071 sólo puede ocurrir "auto-marcar al abrir/click" si Q6 lo confirma.                                                       | Solapamiento con US-072; posible re-implementación.                                                                                                     | Mover mark-as-read a Out of Scope de US-071 y declarar handoff a US-072. Q6 opcional: ¿el click en la campanita dispara `PATCH .../read` automáticamente o es una acción explícita del usuario en US-072?                        |
| Media     | Empty/Loading/Error states declarados sólo con una palabra ("Vacío", "Skeleton", "Banner"). No hay contrato accesible ni copy localizado.                                                                                                                                                                    | Riesgo de A11Y test fallando en CI y de i18n incompleto.                                                                                                | Definir copy por locale (4 locales según US-007) y `aria-live="polite"`, `aria-busy=true` durante loading, `role="alert"` para error banner.                                                                                     |
| Media     | Cache TanStack sin key ni política de invalidación. Nota mencionada como "Cache TanStack" sin más detalle.                                                                                                                                                                                                    | Riesgo de campanita desactualizada si el frontend no invalida al llegar una nueva notificación (US-034 emite fuera de sesión activa).                    | Definir query key `['notifications', 'me', { filter, page }]` y estrategia `refetchOnWindowFocus=true, refetchInterval=60s` (o similar) como Documentation Alignment con `docs/15`.                                                |
| Baja      | Backlog Item no declarado en la US.                                                                                                                                                                                                                                                                          | Pérdida de trazabilidad académica y operativa.                                                                                                          | Agregar `Backlog Item: PB-P2-004` (posición 2 de 2).                                                                                                                                                                              |
| Baja      | `i18n Notes: 4 locales` sin enumerar (`es-LATAM`, `es-ES`, `pt`, `en` según PB §4.3 / US-007).                                                                                                                                                                                                                | QA puede no cubrir los 4 locales.                                                                                                                       | Enumerar locales canónicos.                                                                                                                                                                                                        |
| Baja      | `docs/16 §34.3` DTO usa `type: "task_due"`; el canónico es `task_due_soon` (docs/6 §Notification, docs/18 §18.1, US-034 aprobada).                                                                                                                                                                            | Documentation Alignment Required.                                                                                                                       | Corregir `docs/16 §34.3` para usar `task_due_soon`. No bloquea aprobación si la US y el consumidor asumen el canónico.                                                                                                             |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                          |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | —                                                                                                                    |
| No introduce contratos firmados      | Pass      | —                                                                                                                    |
| No introduce WhatsApp/chat/push      | Pass      | Out of Scope declara "Push".                                                                                         |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                                                        |
| Respeta backend como source of truth | Pass      | Consumo del endpoint canónico; sin lógica de negocio en cliente.                                                    |
| Respeta seed/demo si aplica          | Pass      | Seed cubierto en US-034 (SEED-001). US-071 sólo lo consume.                                                          |
| No introduce RAG/vector DB           | Pass      | —                                                                                                                    |
| No introduce multi-tenant enterprise | Pass      | Aislamiento por `user_id`.                                                                                           |
| No introduce P4/Future scope         | Pass      | Push permanece Out of Scope; realtime WebSocket no se introduce.                                                    |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                          | Problema detectado                                                                                                                                                                                                | Acción recomendada                                                                                                                                                                                                                                                                                                                                                        |
| ----- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail / Not Testable       | "Lista paginada con T-7 en top" no define paginación (page/pageSize), ordenamiento default, semántica de "top", distinción unread/read, contador de no leídas, formato del ítem (título/body/hora relativa).       | Reescribir tras Q1 + Q2. Ejemplo (sujeto a decisión): "Dado un organizer autenticado con N notificaciones, cuando abre la campanita, entonces recibe `GET /api/v1/notifications?page=1&pageSize=10&channel=in_app` con `NotificationResponseDto` (`docs/16 §34.3`) ordenado por `unread first, sent_at DESC`, con badge de conteo de no leídas visible en el header."       |
| AC-02 | Needs Detail / Not Testable       | "Redirige a checklist filtrado 7d" no define URL exacta; depende del contrato del `link` en `NotificationResponseDto` (`docs/16 §34.3`).                                                                          | Reescribir tras Q3 + Q4. Ejemplo (sujeto a decisión): "Dado un item con `type='task_due_soon'` y `payload={taskId, eventId}`, cuando el organizer hace click, entonces el frontend navega a `/organizer/events/{eventId}/tasks?range=7d` (US-032). El evento en `cancelled`/`completed` respeta los banners read-only de US-032."                                          |

AC faltantes:
- AC para no autenticado → 401 (VR-01 lo declara pero sin AC).
- AC para aislamiento — organizer no ve notifs ajenas (BR-NOTIF-005 + FR-NOTIF-005).
- AC para paginación (siguiente página, sin duplicados).
- AC para empty state (copy localizado, aria-live polite).
- AC para loading state (`aria-busy=true`, sin CLS mayor a 0.1).
- AC para error state (`role="alert"`, retry).
- AC para accesibilidad (`role="menu"` o `role="listbox"` en el dropdown, navegación teclado, foco visible NFR-A11Y-001..003).
- AC para performance (P95 < 1.5 s alineado con `NFR-PERF-001`, Success Criteria "carga < 500 ms" complementa pero no reemplaza).
- AC para i18n (4 locales).
- AC para observabilidad mínima (log de request con `correlationId` si `docs/14` lo requiere para reads autenticados; probable no-aplicable).

---

## 6. Gaps Detectados

### Producto / Negocio
- Falta decisión sobre alcance del listado (Q1) y filtro por unread (Q2).
- Falta política para deep link cuando el evento asociado está `cancelled`/`completed` (Q4).
- Falta decisión sobre auto-mark-as-read al abrir la campanita o al click (Q6, handoff a US-072).

### Backend / API
- Falta declarar reuso del endpoint canónico `GET /api/v1/notifications` (`docs/16 §34.2`) sin modificarlo.
- Falta explicitar filtro `channel='in_app'` para deduplicar contra el registro `channel='email_simulated'` emitido por US-034 (Q5).
- Falta declarar generación server-side del campo `link` para `type='task_due_soon'` (Q3).
- Falta declarar comportamiento del backend cuando `payload->>'event_id'` apunta a un evento eliminado o soft-deleted (defensa: `link=null` y UI muestra badge sin link).

### Frontend / UX
- Falta especificar `useNotifications` con query key exacta y política de invalidación.
- Falta política de badge de no leídas (contador + límite "9+").
- Falta comportamiento de scroll infinito vs paginación explícita (recomendación: paginación con "Ver más").
- Falta responsive: en mobile la campanita puede abrir sheet en lugar de dropdown.
- Falta especificación de foco al abrir/cerrar dropdown (NFR-A11Y-002).

### Base de Datos
- No requiere migraciones nuevas. Reuso de `idx_notifications_user_status_sent`.
- Si Q5 elige "filtro por channel" server-side, el índice existente cubre `WHERE user_id=? AND status=? ORDER BY sent_at DESC` pero no acelera el filtro adicional `channel='in_app'`. Aceptable en MVP.

### Seguridad / Autorización
- Falta declarar reuso explícito del policy `NotificationOwnerPolicy` (por definir en US-072 o en el backend base) para el listado (`user_id = session.userId`).
- Falta AC de aislamiento y test 403 al detalle (parcialmente cubierto por NT-01).
- Falta política CSRF explícita — irrelevante para GET pero conviene documentar defensa por defecto.

### IA / PromptOps
No aplica — esta historia no invoca IA directamente.

### QA / Testing
- Falta test 401 sin sesión.
- Falta test de aislamiento (403 al detalle ajeno) más profundo que NT-01 (varios usuarios en paralelo).
- Falta test de paginación (page 2 no repite items).
- Falta test A11Y con Axe (`role`, `aria-*`, foco).
- Falta test i18n (contenidos localizados por los 4 locales).
- Falta test PERF contra `NFR-PERF-001`.
- Falta contract test frontend/backend con MSW (alineado con PB-P2-015 / US-121).

### Seed / Demo
- No requiere cambios: US-034 SEED-001 ya asegura al menos 1 tarea T-7 demo.
- Confirmar en Q1 que la campanita muestra también las notificaciones seed existentes (no sólo T-7) o filtrar demo.

### Documentación / Trazabilidad
- IDs incorrectos en `FRD Requirement(s)` y `NFR Reference(s)`.
- `Related Document(s)` enumera sólo `/docs/8`; ampliar a `/docs/4 §BR-NOTIF-001/002/005/007`, `/docs/6 §Notification`, `/docs/9 §FR-NOTIF-001/002/005/007`, `/docs/10 §NFR-PERF-001 / §NFR-A11Y-001..003 / §NFR-USAB-001`, `/docs/14 §Notifications`, `/docs/15 §Client Components`, `/docs/16 §34`, `/docs/18 §18.1`.
- Backlog Item no aparece referenciado.
- Documentation Alignment con `docs/16 §34.3` (`task_due` vs `task_due_soon`).

---

## 7. Preguntas Pendientes

| Tipo         | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Bloquea aprobación | Responsable        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------ |
| PO           | Q1. ¿La campanita del organizer muestra sólo notificaciones `type='task_due_soon'` (T-7) o todas las notificaciones del usuario (bandeja unificada)? El endpoint `GET /api/v1/notifications` (`docs/16 §34.2`) es genérico. Recomendación: bandeja unificada con destacado visual y "top" para T-7 unread. Impacta AC-01 y el ordenamiento default.                                                                                                                                                                                                                                                                                                                                | Sí                 | Product Owner     |
| PO           | Q2. ¿La lista por default incluye notificaciones ya leídas o filtra `status='unread'`? ¿El badge del header muestra el conteo total de unread con formato "9+" cuando excede 9? Recomendación: `?filter=unread` por default en la campanita + toggle "Ver todas" + badge con `9+`.                                                                                                                                                                                                                                                                                                                                                                                                | Sí                 | Product Owner     |
| PO + Tech    | Q3. ¿El campo `link` del `NotificationResponseDto` (`docs/16 §34.3`) se genera server-side o el frontend lo compone desde `payload`? Para `type='task_due_soon'`, ¿la ruta canónica es `/organizer/events/{eventId}/tasks?range=7d` (alineada con US-032 approved) o `/events/{eventId}/tasks?range=7d`? La decisión afecta el contrato del DTO y el patrón de generación en el módulo `notifications` del backend.                                                                                                                                                                                                                                                                | Sí                 | Product Owner + Tech Lead |
| PO           | Q4. Cuando el organizer hace click en una notif T-7 cuyo evento asociado ya está en `event.status ∈ {cancelled, completed}`, ¿la navegación (a) sigue igual y confía en el banner read-only de US-032, (b) muestra un toast previo, o (c) el backend marca `link=null` para eventos no-`active` y la UI oculta el CTA?                                                                                                                                                                                                                                                                                                                                                            | Sí                 | Product Owner     |
| PO + Tech    | Q5. US-034 D5 emite 1 `Notification(channel='in_app')` + 1 `Notification(channel='email_simulated')` por tarea. ¿La campanita filtra `channel='in_app'` para deduplicar? ¿El backend agrega un query param `channel` al `GET /api/v1/notifications` o filtra implícitamente para el rol `organizer`? Recomendación: agregar query param `channel` opcional con default `in_app` cuando el consumidor es la campanita.                                                                                                                                                                                                                                                              | Sí                 | Product Owner + Tech Lead |
| PO           | Q6 (opcional, cross-story). ¿El click en un item de la campanita dispara `PATCH /api/v1/notifications/:id/read` automáticamente (auto-mark-as-read) o el mark-as-read es acción explícita del usuario en US-072? Recomendación: auto-mark-as-read al click "abrir" (delegar la llamada al hook `useNotifications` compartido con US-072). No bloquea US-071 si se decide "explícito" (US-072 lo materializa).                                                                                                                                                                                                                                                                       | Parcial            | Product Owner     |

---

## 8. Documentation Alignment Required

| Documento / Fuente                            | Conflicto detectado                                                                                                                                                                                        | Decisión vigente                                                                                                            | Acción recomendada                                                                                                                                                    | ¿Bloquea aprobación? |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/16 §34.3 NotificationResponseDto`       | Enum `type` incluye `task_due`; el canónico es `task_due_soon` (docs/6 §Notification, docs/18 §18.1). US-034 aprobada persiste `task_due_soon`.                                                             | `task_due_soon` es el valor persistido.                                                                                     | Actualizar `docs/16 §34.3` para usar `task_due_soon`. La US y consumidores asumen el canónico.                                                                        | No                   |
| `docs/16 §34.2` (verbo mark-as-read)          | Declara `PATCH /notifications/:notificationId/read`. Alcance real en US-072.                                                                                                                                | Verbo canónico documentado.                                                                                                 | Ratificar en US-072. En US-071, si se decide auto-mark-as-read al click (Q6), consumir `PATCH` según docs/16 §34.2.                                                   | No                   |
| `docs/16 §34.2` (filtro por channel)          | No expone query param `channel` explícito. US-034 D5 crea 2 filas por tarea (`in_app` + `email_simulated`).                                                                                                 | Si Q5 elige filtro server-side, docs/16 §34.2 debe agregar `channel` como query param opcional.                             | Tras Q5, actualizar `docs/16 §34.2` con `?channel=in_app` opcional (o filtro implícito en el use case `ListMyNotifications`).                                          | Sí (Q5)              |
| `docs/16 §34.3` (`link`)                       | El DTO declara `link: string \| null` sin especificar patrón de generación.                                                                                                                                | Sin patrón formal.                                                                                                          | Tras Q3, documentar patrón por `type` (para `task_due_soon`: `/organizer/events/{eventId}/tasks?range=7d`).                                                            | Sí (Q3)              |
| `docs/10 §NFR-OBS-001` / US-071 declaración   | US-071 declara `NFR-OBS-001` (AdminAction) que no aplica.                                                                                                                                                    | NFR canónicos: `NFR-PERF-001`, `NFR-USAB-001`, `NFR-A11Y-001..003`.                                                          | Reemplazar en US-071 durante refinación.                                                                                                                              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                                                                                                                                                                                                                                                                                          |
| User Story file path                       | `management/user-stories/US-071-inapp-notification-t-minus-7-recipe.md`                                                                                                                                                                                                                                                                                     |
| User Story ID verified                     | Yes                                                                                                                                                                                                                                                                                                                                                         |
| Decision Resolution artifact found         | No                                                                                                                                                                                                                                                                                                                                                          |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-071-decision-resolution.md`                                                                                                                                                                                                                                                                                |
| Refinement review artifact created/updated | Yes                                                                                                                                                                                                                                                                                                                                                         |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-071-refinement-review.md`                                                                                                                                                                                                                                                                                    |
| Final recommended status                   | Needs Refinement                                                                                                                                                                                                                                                                                                                                            |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                                                                                                                                                                                                                                                                                         |
| Reason                                     | Existen 5 preguntas bloqueantes (Q1–Q5) que requieren decisión PO + Tech Lead antes de aprobar. La US no puede actualizarse en sitio porque Q1 y Q2 definen la reescritura de AC-01; Q3 define el contrato del `link` y AC-02; Q4 define la política del click sobre eventos cerrados; Q5 evita duplicidad UX contra los registros creados por US-034 D5. |

---

## 10. Cambios Aplicados o Recomendados

(El archivo no fue actualizado. La siguiente lista es prescriptiva para aplicar tras la resolución de Q1–Q5.)

### Metadata
- `Backlog Item` → `PB-P2-004 — Notificación T-7 (tareas) (P2)`.
- `Epic` → mantener `EPIC-NOT-001` (el mapa de US-071 en la matriz de cobertura sitúa la historia dentro de EPIC-NOT-001; PB-P2-004 declara `EPIC-NOT-001 / EPIC-TASK-001`, pero US-071 no toca el módulo de tareas más allá del deep link).
- `Last Updated` → fecha de la próxima ejecución de la skill.
- `Status` → `Ready for Approval` sólo tras aplicar todos los cambios.

### Business Context
- `Assumptions`: reformular como "Las notificaciones ya son emitidas por US-034; el backend expone `GET /api/v1/notifications` (`docs/16 §34.2`) y devuelve `NotificationResponseDto` (`docs/16 §34.3`)".
- `Dependencies`: añadir US-034 (upstream, aprobada), US-032 (deep link a `?range=7d`, aprobada), US-072 (mark-as-read, si Q6 lo requiere).

### PO/BA Decisions Applied
- Añadir sección nueva con las decisiones D1..D5 (y D6 si aplica) tras la ejecución del resolver.

### Traceability
- `FRD Requirement(s)` → `FR-NOTIF-001, FR-NOTIF-002, FR-NOTIF-005, FR-NOTIF-007`.
- `Use Case(s)` → `UC-NOTIF-001` (recibir notificaciones in-app).
- `Business Rule(s)` → `BR-NOTIF-001, BR-NOTIF-002, BR-NOTIF-005, BR-NOTIF-007`.
- `Permission Rule(s)` → `Recipient (user_id = session.userId)`.
- `Data Entity / Entities` → `Notification, User`.
- `API Endpoint(s)` → `GET /api/v1/notifications` (`docs/16 §34.2`).
- `NFR Reference(s)` → `NFR-PERF-001, NFR-USAB-001, NFR-A11Y-001, NFR-A11Y-002, NFR-A11Y-003`.
- `Related Document(s)` → `/docs/4 §BR-NOTIF-001/002/005/007`, `/docs/6 §Notification`, `/docs/9 §FR-NOTIF-001/002/005/007`, `/docs/10 §NFR-PERF-001 / §NFR-A11Y-001..003 / §NFR-USAB-001`, `/docs/14 §Notifications`, `/docs/15 §Client Components`, `/docs/16 §34`, `/docs/18 §18.1`.
- Agregar `Backlog Item: PB-P2-004 (posición 2 de 2)`.

### Scope Guardrails
- `Explicitly Out of Scope`: mantener "Push"; agregar "Mark-as-read explícito (alcance US-072)", "Toast/realtime WebSocket para pushes en vivo (Future)", "Notificaciones broadcast cross-rol (BR-NOTIF-005)".
- `Scope Notes`: reformular como "Sólo surface UI (dropdown + lista + navegación al detalle). No implementa mark-as-read explícito ni auto-refresh realtime".

### Acceptance Criteria
- Reescribir AC-01 con paginación, ordenamiento, unread badge y filtro `channel='in_app'`.
- Reescribir AC-02 con contrato del `link` para `type='task_due_soon'`.
- Añadir AC-03 (401 sin sesión).
- Añadir AC-04 (aislamiento BR-NOTIF-005 — no ve notifs ajenas).
- Añadir AC-05 (paginación — page 2 no repite items).
- Añadir AC-06 (empty/loading/error states con `aria-live`, `aria-busy`, `role="alert"`).
- Añadir AC-07 (A11Y del dropdown — `role`, navegación teclado, foco visible).
- Añadir AC-08 (i18n — 4 locales).
- Añadir AC-09 (performance — P95 < 1.5 s alineado con NFR-PERF-001).

### Edge Cases
- EC-02: notificación cuyo evento asociado está `cancelled`/`completed` (política resultado de Q4).
- EC-03: notificación con `link=null` (payload incompleto) → mostrar item sin CTA.
- EC-04: paginación con eliminación intermedia — nueva página no repite (server-side sort estable).
- EC-05: locale del usuario cambia entre requests — el `NotificationResponseDto` respeta `language_code` persistido.

### Validation Rules
- VR-01: sesión activa → 401 (mantener).
- VR-02: `user_id = session.userId` (implícito en el endpoint; alineado con BR-NOTIF-005).

### Authorization & Security Rules
- SEC-01: mantener "Sólo notifs del usuario".
- SEC-02: agregar reuso explícito de `NotificationOwnerPolicy` (o guard equivalente definido en el backend base).
- SEC-03: 401 sin sesión; 403 al detalle ajeno; no-revelación 404 para IDs desconocidos (alineado con `docs/16 §34.2`).

### Technical Notes (Frontend)
- Route / Page: header persistente (App Router layout `apps/web/app/(authenticated)/organizer/layout.tsx` o equivalente).
- Components: `NotificationsBell`, `NotificationsDropdown`, `NotificationItem`, `NotificationsEmptyState`.
- Hook: `useNotifications({ filter, page, pageSize })` con TanStack Query, key `['notifications', 'me', { filter, page }]`. `refetchOnWindowFocus=true`, `refetchInterval` = 60 s (o valor decidido).
- Empty state, loading, error con copy localizado y roles ARIA.
- Deep link handler para `type='task_due_soon'` usando el `link` server-side.

### Technical Notes (Backend)
- Reuso del endpoint `GET /api/v1/notifications` sin modificarlo (`docs/16 §34.2`).
- Si Q5 = filtro server-side, agregar query param `channel` opcional al `ListMyNotificationsUseCase`.
- Generar `link` en el use case a partir del `type` y `payload` (patrón por tipo).

### Database Notes
- Sin migraciones nuevas.
- Reuso de `idx_notifications_user_status_sent` y `idx_notifications_user_unread`.

### API
- Reafirmar contrato `GET /api/v1/notifications` (`docs/16 §34.2`) y `NotificationResponseDto` (`docs/16 §34.3`).
- Si Q3 formaliza el generador del `link`, documentar patrón en la tabla API de la US.

### Observability / Audit
- Correlation ID: Yes (patrón backend estándar).
- Log Event Required: No (endpoint de lectura no crítico).
- AdminAction: No.
- AIRecommendation: No.

### Test Scenarios
- Mantener TS-01 y reforzarlo con aserción de shape del DTO y paginación.
- Añadir TS-02: 401 sin sesión.
- Añadir TS-03: aislamiento — dos organizers en paralelo, cada uno ve sólo sus notifs.
- Añadir TS-04: paginación — page 2 no duplica items.
- Añadir TS-05: A11Y con Axe (dropdown accesible, foco visible, teclado).
- Añadir TS-06: i18n en 4 locales — subject/body localizado (heredado de US-034 D6).
- Añadir TS-07: PERF — P95 < 1.5 s con 100 notifs seed.
- Añadir TS-08: contract test frontend/backend con MSW (alineado con US-121).
- Añadir NT-02: notif con `link=null` no navega (falla silenciosa) — verifica UX defensiva.
- Añadir AUTH-TS-02: admin no puede leer notifs de organizer.

### Definition of Ready
- Marcar `[x] PO/BA validó` sólo tras aprobación.

### Definition of Done
- Añadir: A11Y verificado con Axe; contract test verde; performance P95 < 1.5 s; i18n en 4 locales; contador de no leídas actualiza al abrir/click.

### Notes
- Reemplazar "Cache TanStack" por la query key + política de refetch decidida.
- Documentar handoff con US-072 (mark-as-read) y con US-034 (job emisor upstream).

---

## 11. Recomendación Final

`Needs Refinement`

La historia no puede actualizarse en sitio porque cinco decisiones (Q1: alcance del listado; Q2: unread vs all + badge; Q3: contrato del `link` para T-7; Q4: política sobre eventos cerrados; Q5: dedup del canal `email_simulated`) están abiertas y bloquean la reescritura de AC-01, AC-02, Technical Notes y Documentation Alignment con `docs/16`. Q6 (auto-mark-as-read) queda como parcialmente bloqueante — se puede aprobar US-071 sin decidirla si se declara el mark-as-read como Out of Scope y se posterga a US-072.

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver` sobre este review para resolver Q1–Q5 desde la documentación aprobada (docs/16 §34, docs/6 §Notification, docs/10 §NFR-PERF-001 / §NFR-A11Y-001..003, US-034 approved, US-032 approved) o, en su defecto, elevarlas a PO formal.

---

User Story file updated: No
Path: management/user-stories/US-071-inapp-notification-t-minus-7-recipe.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-071-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
