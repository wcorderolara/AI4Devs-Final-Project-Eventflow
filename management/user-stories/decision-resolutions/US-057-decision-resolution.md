# PO/BA Decision Resolution — US-057

## Source User Story File
management/user-stories/US-057-compare-quotes-side-by-side.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-057-refinement-review.md

## Decision Date
2026-06-28

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| User Story ID                                | US-057                                                                           |
| User Story file path                         | management/user-stories/US-057-compare-quotes-side-by-side.md                    |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-057-refinement-review.md           |
| Existing decision resolution found           | No                                                                               |
| Backlog Item                                 | PB-P1-035 — Comparador lado a lado + marca preferred                            |
| Epic                                         | EPIC-CMP-001                                                                     |
| Estado antes de decisiones                   | Needs Refinement                                                                 |
| Cantidad de preguntas revisadas              | 5                                                                                |
| Decisiones PO/BA tomadas                     | 5                                                                                |
| ¿Desbloquea aprobación?                      | Sí                                                                               |
| User Story file updated                      | Yes                                                                              |
| Decision Resolution artifact created/updated | Yes                                                                              |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — `categoryCode` requerido

```text
El endpoint `GET /api/v1/events/:id/quotes/compare` requiere `categoryCode` como query param. Ausente ⇒ `400 INVALID_FILTERS` con `details: ['category_required']`. Cumple BR-QUOTE-021 ("para una misma categoría de servicio").
```

### Rationale
Comparación side-by-side sólo tiene sentido por categoría. Slug coherente con US-045 D7.

---

## Decisión 2 — Estados mostrados

```text
Backend retorna TODAS las Quotes de la `(event_id, service_category_id)` con `status IN ('sent','responded','preferred','accepted','expired','rejected')`. El frontend muestra todos con indicador visual:
- `sent`/`responded`/`preferred`/`accepted` ⇒ activos comparables.
- `expired` ⇒ marcado claramente, no seleccionable para marcar preferred (PB-P1-035).
- `rejected` ⇒ visible para auditoría histórica, no seleccionable.

`draft` se excluye (no entregadas).
```

### Rationale
Trazabilidad histórica + cumple "Quotes expiradas marcadas claramente" del backlog.

---

## Decisión 3 — Empty state

```text
0 Quotes: response `{ items: [], category: {code, name} }`. Frontend muestra mensaje i18n "Aún no has recibido cotizaciones en esta categoría" + CTA "Volver al evento".

1 Quote: response normal `{ items: [singleQuote] }`. Frontend muestra vista de detalle única con CTA "Marcar preferred" (deep-link US-058).

≥ 2 Quotes: vista comparativa estándar.
```

### Rationale
UX progresivo. Permite consumir el mismo endpoint en todos los casos.

---

## Decisión 4 — Resumir IA deep-link a US-022

```text
US-057 NO genera el resumen IA. El frontend muestra CTA "Resumir con IA" sólo cuando `items.length >= 2`. El click navega a la vista de US-022 (`/organizer/events/:id/quotes/compare/ai-summary?categoryCode=...`). US-022 entrega el endpoint AI y la UX del resumen.
```

### Rationale
Scope ajustado. FR-AI-006 es Should Have y tiene su propia US.

---

## Decisión 5 — Endpoint shape

```text
`GET /api/v1/events/:id/quotes/compare?categoryCode=<slug>`

Response 200:
{
  "category": { "code": "catering", "name": { "es-LATAM": "Catering", ... } },
  "currency_code": "GTQ", // heredado del evento
  "items": [
    {
      "quote_id": "<uuid>",
      "vendor": { "profile_id": "<uuid>", "business_name": "...", "slug": "...", "rating_avg": 4.6, "reviews_count": 24 },
      "status": "sent" | "responded" | "preferred" | "accepted" | "expired" | "rejected",
      "total_price": "5000.00",
      "breakdown": [{"label": "...", "amount": "..."}],
      "valid_until": "2026-07-12",
      "conditions": "...",
      "is_preferred": false,
      "created_at": "2026-..."
    }
  ]
}

Ordenado por `is_preferred DESC, status (active primero), total_price ASC`.
```

### Rationale
Estructura completa para la UI comparativa + datos del vendor + soporte ordering visual.

---

## 3. Consolidated Decision Table

|  # | Tema                              | Decisión                                                                                                                                                          | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- | -------------------- |
|  1 | categoryCode                         | Requerido como query param.                                                                                                                                       | PO      | Sí                     | No                   |
|  2 | Estados mostrados                    | Todos los relevantes excepto `draft`; expired/rejected con indicador visual no seleccionable.                                                                    | PO      | Sí                     | No                   |
|  3 | Empty state                          | Response uniforme; frontend maneja 0/1/≥2.                                                                                                                        | PO      | Sí                     | No                   |
|  4 | Resumir IA                            | Deep-link a US-022; sin generación en US-057.                                                                                                                    | PO      | Sí                     | No                   |
|  5 | Endpoint shape                       | `{ category, currency_code, items[] }` con shape detallada en D5; orden estable.                                                                                  | PO/Tech | Sí                     | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                |
| User Story file path                         | `management/user-stories/US-057-compare-quotes-side-by-side.md`                    |
| Decision Resolution artifact created/updated | Yes                                                                                |
| New User Story status                        | Ready for Approval                                                                 |
| Remaining blockers                           | No                                                                                 |
| Reason                                       | 5/5 decisiones PO formalizadas.                                                    |

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
