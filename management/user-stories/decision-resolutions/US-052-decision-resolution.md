# PO/BA Decision Resolution — US-052

## Source User Story File
management/user-stories/US-052-vendor-respond-quote.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-052-refinement-review.md

## Decision Date
2026-06-27

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| User Story ID                                | US-052                                                                           |
| User Story file path                         | management/user-stories/US-052-vendor-respond-quote.md                           |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-052-refinement-review.md           |
| Existing decision resolution found           | No                                                                               |
| Backlog Item                                 | PB-P1-031 — Vendor visualiza y responde Quote                                   |
| Epic                                         | EPIC-QR-001                                                                      |
| Estado antes de decisiones                   | Needs Refinement                                                                 |
| Cantidad de preguntas revisadas              | 7                                                                                |
| Decisiones PO/BA tomadas                     | 7                                                                                |
| ¿Desbloquea aprobación?                      | Sí                                                                               |
| User Story file updated                      | Yes                                                                              |
| Decision Resolution artifact created/updated | Yes                                                                              |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — Schema del breakdown

```text
`breakdown` es un array JSON `[{ label: string [1..150], amount: numeric(14,2) >= 0 }]` con `1..20` items. El backend valida `Math.abs(SUM(amount) - total_price) <= 0.01` (tolerancia de redondeo). Sin sublíneas ni cantidades en MVP (Future: `quantity`, `unit`, `tax`).
```

### Rationale
Estructura simple permite validar la suma y mostrar el desglose en UI consistente. Tolerancia ±0.01 absorbe redondeos de currency con 2 decimales.

---

## Decisión 2 — Envío directo single-shot

```text
US-052 implementa exclusivamente envío directo: `POST /api/v1/vendor/quote-requests/:id/respond` crea la `Quote` y la transiciona a `status='sent'` atómicamente. No hay CRUD de borradores en MVP. El UI "Guardar borrador" queda Out of Scope; el draft CRUD (POST draft + PATCH + POST send) es Future.
```

### Rationale
Reduce complejidad MVP. El vendor compone localmente en la UI (estado React) y envía cuando termina.

---

## Decisión 3 — `valid_until` rango y default

```text
`valid_until` se valida en el rango `[today+1, today+90]` días calendario. Si el body no incluye `valid_until`, el backend asigna `valid_until = (created_at::date + INTERVAL '15 days')` (default per BR-QUOTE-015 / C-031, decisión PO 8.1 #4). Fuera del rango ⇒ `400 INVALID_VALID_UNTIL`.
```

### Rationale
90 días es el techo MVP aprobado en PB-P1-031. `today+1` evita Quotes que expiran el mismo día.

---

## Decisión 4 — Currency heredada del evento

```text
El backend infiere `currency_code` de `events.currency_code` (BR-QUOTE-019). El cliente NO envía `currency_code` en el body. Si lo envía, el backend lo ignora silenciosamente y usa el del evento.
```

### Rationale
Consistencia obligatoria + evita errores de conversión.

---

## Decisión 5 — 2 Notifications al organizer

```text
Al transicionar la Quote a `sent`, dentro de `prisma.$transaction`:
1. INSERT `notifications(channel='in_app', recipient_user_id=event.organizer_user_id, event='quote.sent', delivery_status='delivered', payload={ quote_id, quote_request_id, total_price, currency_code, valid_until })`.
2. INSERT `notifications(channel='email_simulated', recipient_user_id=event.organizer_user_id, event='quote.sent', delivery_status='simulated', payload=...)`.

Paridad con US-049 D6. Email real es Future.
```

### Rationale
Paridad de canales + auditoría completa para demo.

---

## Decisión 6 — Estados origen y código de error

```text
Permitido sólo cuando `quote_requests.status IN ('sent','viewed')` Y `(expires_at IS NULL OR expires_at > NOW())`. Cualquier otro estado o vencida ⇒ `409 QR_NOT_RESPONDABLE` con `details: { current_status, expires_at }`.

Si ya existe una `Quote` vigente (`status NOT IN ('expired','rejected')`) para esa QR ⇒ `409 QUOTE_ALREADY_EXISTS` con `details.existing_quote_id` (consistente con C-030).

QR ajena, inexistente o vendor profile no válido ⇒ `404 QR_NOT_FOUND` uniforme (heredado US-051 D4).
```

### Rationale
Cobertura completa de transiciones inválidas + protección contra information leakage.

---

## Decisión 7 — Total `> 0`

```text
`total_price > 0` (regla de negocio MVP). Body con `total_price <= 0` ⇒ `400 INVALID_TOTAL`. El CHECK del schema (`>= 0`) sigue siendo defensivo en DB pero el service layer es más estricto.
```

### Rationale
Una Quote con total cero no tiene sentido comercial.

---

## 3. Consolidated Decision Table

|  # | Tema                              | Decisión                                                                                                                                                          | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- | -------------------- |
|  1 | breakdown schema                    | `[{label, amount}]` `1..20`; suma con tolerancia ±0.01.                                                                                                          | PO/BA   | Sí                     | No                   |
|  2 | Flujo                                | Envío directo single-shot. Sin draft CRUD en MVP.                                                                                                                | PO      | Sí                     | No                   |
|  3 | `valid_until`                        | Rango `[today+1, today+90]`; default 15 días.                                                                                                                    | PO      | Sí                     | No                   |
|  4 | Currency                             | Heredada del evento; cliente no la envía.                                                                                                                         | PO/Tech | Sí                     | No                   |
|  5 | Notificaciones                       | 2 Notifications atómicas (`in_app` + `email_simulated`).                                                                                                          | PO      | Sí                     | No                   |
|  6 | Estados origen + códigos             | QR `sent/viewed` no vencida ⇒ permitido. Otros ⇒ `409 QR_NOT_RESPONDABLE`. Existe Quote vigente ⇒ `409 QUOTE_ALREADY_EXISTS`. Acceso ajeno ⇒ `404 QR_NOT_FOUND`. | PO      | Sí                     | No                   |
|  7 | Total                                | `> 0` ⇒ `400 INVALID_TOTAL` si `<= 0`.                                                                                                                            | PO      | Sí                     | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                |
| User Story file path                         | `management/user-stories/US-052-vendor-respond-quote.md`                           |
| Decision Resolution artifact created/updated | Yes                                                                                |
| New User Story status                        | Ready for Approval                                                                 |
| Remaining blockers                           | No                                                                                 |
| Reason                                       | 7/7 decisiones PO formalizadas.                                                    |

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
