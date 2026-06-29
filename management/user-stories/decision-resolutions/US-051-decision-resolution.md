# PO/BA Decision Resolution — US-051

## Source User Story File
management/user-stories/US-051-vendor-mark-quote-request-viewed.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-051-refinement-review.md

## Decision Date
2026-06-27

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| User Story ID                                | US-051                                                                           |
| User Story file path                         | management/user-stories/US-051-vendor-mark-quote-request-viewed.md               |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-051-refinement-review.md           |
| Existing decision resolution found           | No                                                                               |
| Backlog Item                                 | PB-P1-031 — Vendor visualiza y responde Quote                                   |
| Epic                                         | EPIC-QR-001                                                                      |
| Estado antes de decisiones                   | Needs Refinement                                                                 |
| Cantidad de preguntas revisadas              | 6                                                                                |
| Decisiones PO/BA tomadas                     | 6                                                                                |
| ¿Desbloquea aprobación?                      | Sí                                                                               |
| User Story file updated                      | Yes                                                                              |
| Decision Resolution artifact created/updated | Yes                                                                              |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — Separación GET vs POST mark-viewed

```text
Dos endpoints:
- `GET /api/v1/vendor/quote-requests/:id` retorna el detalle sin transición de estado.
- `POST /api/v1/vendor/quote-requests/:id/mark-viewed` ejecuta la transición `sent → viewed` idempotente.

El frontend, al montar la página de detalle, llama PRIMERO al GET para mostrar; luego (si `status === 'sent'`) emite el POST mark-viewed en background. El backend nunca transiciona implícitamente en el GET.
```

### Rationale
Cumple la semántica HTTP (GET es safe e idempotent). Evita transiciones falsas por pre-fetch de browsers o crawlers. Mantiene la UX automática (frontend orquesta).

---

## Decisión 2 — Política de transición a `viewed`

```text
POST mark-viewed transiciona SÓLO cuando `status='sent'`. Otros estados (`viewed`, `responded`, `preferred`, `cancelled`, `expired`, `rejected`) responden `200 OK` con la QR actual SIN cambios (no-op idempotente). Esto incluye QRs vencidas en filtro lazy (`expires_at IS NULL OR expires_at > NOW()`).
```

### Rationale
Idempotencia perceptual + permite re-emitir el POST sin efectos secundarios.

---

## Decisión 3 — Persistir `viewed_by` y `viewed_at`

```text
En la primera transición exitosa de `sent → viewed`, el backend persiste:
- `quote_requests.viewed_at = NOW()`
- `quote_requests.viewed_by = currentUser.id` (vendor's user_id)

En subsiguientes POST mark-viewed (status ya no es `sent`), no se modifica nada.
```

### Rationale
Auditoría completa de quién vio y cuándo. `viewed_by` apunta a `users.id` para traceability futura.

---

## Decisión 4 — `404 QR_NOT_FOUND` uniforme

```text
GET y POST mark-viewed responden `404 Not Found` con `{ error: { code: 'QR_NOT_FOUND' } }` para:
- QR no existe (UUID inexistente).
- QR pertenece a otro vendor (`vendor_profile_id != currentUser.vendor_profile.id`).
- `quote_requests.deleted_at IS NOT NULL` (Future si aplica).
- Vendor profile en `status='hidden'` o soft-deleted.

Sin distinción para evitar information leakage (BR-QUOTE-006 + patrón EventFlow).
```

### Rationale
Consistente con US-046/US-048/US-050. Protege contra enumeración de UUIDs.

---

## Decisión 5 — Notificación al organizer (in-app)

```text
Al transicionar exitosamente `sent → viewed`, dentro de la misma transacción:
- INSERT `notifications(channel='in_app', recipient_user_id=event.organizer_user_id, event='quote_request.viewed', delivery_status='delivered', payload={ quote_request_id, vendor_profile_id, viewed_at })`.

Sin email simulado en esta US (a diferencia de US-049 D6); el organizer ya recibe in-app cuando el vendor confirma la vista. Email simulado para "viewed" queda como Future.
```

### Rationale
Da feedback temprano al organizer ("tu solicitud fue vista") sin saturar el canal email.

---

## Decisión 6 — Listado de QRs del vendor fuera de scope US-051

```text
US-051 cubre exclusivamente el detalle de una QR (GET por ID) y la transición a viewed (POST mark-viewed). El listado `GET /api/v1/vendor/quote-requests` (sin `:id`) queda como US futura del backlog de vendor (PB-P2-006 — notificaciones a vendor por Quote rechazada/expirada — o US separada del directorio del vendor).
```

### Rationale
Scope ajustado al título de la US y al alcance de PB-P1-031. El listado tiene su propio modelado (filtros, paginación) que merece otra US.

---

## 3. Consolidated Decision Table

|  # | Tema                              | Decisión                                                                                                                                                          | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- | -------------------- |
|  1 | REST design                        | GET sin side-effect + POST `mark-viewed` idempotente.                                                                                                            | Tech    | Sí                     | No                   |
|  2 | Estados origen                      | Sólo desde `sent`; otros no-op idempotente `200`.                                                                                                                | PO      | Sí                     | No                   |
|  3 | `viewed_by` + `viewed_at`           | Persistir ambos en la primera transición.                                                                                                                         | PO      | Sí                     | No                   |
|  4 | Error code                          | `404 QR_NOT_FOUND` uniforme.                                                                                                                                      | PO/Sec  | Sí                     | No                   |
|  5 | Notificación al organizer           | In-app dentro de la misma transacción.                                                                                                                            | PO      | Sí                     | No                   |
|  6 | Listado QRs                         | Fuera de scope US-051.                                                                                                                                            | PO      | Sí                     | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                |
| User Story file path                         | `management/user-stories/US-051-vendor-mark-quote-request-viewed.md`               |
| Decision Resolution artifact created/updated | Yes                                                                                |
| New User Story status                        | Ready for Approval                                                                 |
| Remaining blockers                           | No                                                                                 |
| Reason                                       | 6/6 decisiones PO/Tech formalizadas.                                               |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`.

---

## 8. Próximo Paso Recomendado

```text
1. Revisar el archivo de User Story actualizado.
2. Ejecutar `eventflow-user-story-refinement` para revalidación.
3. Si no quedan blockers, ejecutar `eventflow-user-story-approval`.
```
