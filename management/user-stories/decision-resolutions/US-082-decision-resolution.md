# PO/BA Decision Resolution — US-082

## Source User Story File
management/user-stories/US-082-configure-event-language.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-082-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-082 |
| Backlog Item | PB-P1-047 |
| Decisiones tomadas | 7 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Reuso endpoints US-009 + US-010
```
- `POST /api/v1/events` (US-009): añadir `language` opcional al body. Si no se provee, default = organizer.preferred_language || 'es-LATAM'.
- `PATCH /api/v1/events/:id` (US-010): añadir `language` opcional. Validar inmutabilidad.

US-082 verifica/extiende ambos DTOs sin crear endpoints nuevos.
```

### D2 — Inmutabilidad por status
```
Editable: `event.status IN ('draft', 'planning', 'in_progress')`.
NO editable: `event.status IN ('completed', 'cancelled')` ⇒ `409 EVENT_LANGUAGE_NOT_EDITABLE` con `details.current_status`.
```

### D3 — Default heredado del organizer
```
Al CREATE event:
1. Si body incluye `language`, usar ese.
2. Sino: `event.language = organizer.preferred_language || 'es-LATAM'`.

Backend resuelve default; no requiere selección explícita en wizard (pero UI puede mostrar default actual con opción de cambiar).
```

### D4 — Validación enum
```
DTO:
```ts
language: z.enum(['es-LATAM', 'es-ES', 'pt', 'en']).optional()
```
Otros valores ⇒ `400 INVALID_LANGUAGE`.
```

### D5 — AI calls usan event.language
```
Todos los use cases de AI (US-017 plan, US-018 checklist, US-019 budget, US-020 categories, US-021 brief, US-022 summary) deben extraer `event.language` y pasarlo como `locale` param al `AIProviderPort.generate(...)`.

Implementación: cada AI use case ya carga `event` para context — solo agregar `locale: event.language` al prompt context.

US-082 documenta el contrato; cada US AI implementa el binding.
```

### D6 — UI ubicación
```
- Event creation wizard (US-009): paso de configuración con selector `language` precargado con default del organizer + opción de cambiar.
- Event detail page (US-010): campo editable inline o en modal de edición.

Selector visual con labels nativos (igual que US-081 LanguageSelector pero scoped a Event).
```

### D7 — Sin retroactivo en AIRecommendations
```
AIRecommendations existentes (generadas con language anterior) NO se regeneran al cambiar event.language. Solo afecta llamadas AI futuras.

UI puede mostrar mensaje informativo "Este cambio afectará nuevas generaciones IA; los resultados anteriores conservarán su idioma original."
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Endpoints | Reuso POST US-009 + PATCH US-010 |
| 2 | Inmutabilidad | Editable hasta status completed/cancelled |
| 3 | Default | organizer.preferred_language || es-LATAM |
| 4 | Validation | Zod enum |
| 5 | AI impact | Cada US AI debe usar event.language como locale |
| 6 | UI | Wizard + edición inline detail page |
| 7 | Retroactivo | NO; solo futuras AI calls |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-082-configure-event-language.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
