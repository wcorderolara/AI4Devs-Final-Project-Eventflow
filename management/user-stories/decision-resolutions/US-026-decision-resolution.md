# PO/BA Decision Resolution — US-026

## Source User Story File
management/user-stories/US-026-regenerate-ai-suggestion-with-feedback.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-026-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-026 |
| Backlog Item | PB-P2-003 |
| Decisiones tomadas | 10 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Schema: `parent_recommendation_id` + `root_recommendation_id`
```
Migración menor:

ALTER TABLE ai_recommendations
  ADD COLUMN parent_recommendation_id uuid NULL,
  ADD COLUMN root_recommendation_id uuid NULL,
  ADD COLUMN regeneration_feedback text NULL,  -- feedback del user para esta regeneración
  ADD CONSTRAINT fk_parent_recommendation
    FOREIGN KEY (parent_recommendation_id) REFERENCES ai_recommendations(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_root_recommendation
    FOREIGN KEY (root_recommendation_id) REFERENCES ai_recommendations(id) ON DELETE SET NULL;

CREATE INDEX idx_ai_recommendations_root ON ai_recommendations(root_recommendation_id);
CREATE INDEX idx_ai_recommendations_parent ON ai_recommendations(parent_recommendation_id);

-- Backfill: rows existentes → root_recommendation_id = id (self-root)
UPDATE ai_recommendations SET root_recommendation_id = id WHERE root_recommendation_id IS NULL;
```

### D2 — Counting por linaje raíz
```
`regeneration_count = COUNT(*) WHERE root_recommendation_id = parent.root_recommendation_id AND id <> root_recommendation_id`.

Si count >= AI_MAX_REGENERATIONS_PER_LINEAGE (default 5) ⇒ `429 REGENERATION_LIMIT` con `details.current_count, details.max`.

Esto evita escape walking linaje (ej. regenerar de un nieto crea otra rama).
```

### D3 — Calcular root_recommendation_id al insertar
```
Lógica en UseCase:

new_child.root_recommendation_id =
  parent.root_recommendation_id ?? parent.id;

Para AIRecommendations originales (sin padre), root_recommendation_id = self.id (set en INSERT).
```

### D4 — Estado válido del parent: cualquier AIRecommendation no eliminada
```
Sin restricción de "status pending" (AIRecommendation no tiene status). Solo verificar:
1. Parent existe y no soft-deleted.
2. Ownership matches.
3. Count límite no excedido.
4. Rate limit no excedido.

EC-02 reescrito: si parent fue eliminado (FK ON DELETE SET NULL) ⇒ `404 AI_RECOMMENDATION_NOT_FOUND`.
```

### D5 — Locale binding: hereda del parent
```
`new_child.locale = parent.locale` (consistencia). Mantener idioma original aunque event.language haya cambiado, para no romper experiencia conversacional.

`new_child.locale_fallback = result.locale_fallback` (puede cambiar si AI falla esta vez).
```

### D6 — Feedback injection en prompt
```
Helper compartido `injectFeedbackForRegeneration(originalPromptTemplate, feedback)`:

return originalPromptTemplate + `\n\n[USER_FEEDBACK_FOR_REGENERATION]:\n${feedback || '(sin feedback adicional)'}\n[END_FEEDBACK]`;

Si feedback vacío/null, igual incluir el bloque con placeholder. PromptOps gestiona.
```

### D7 — Authorization polimórfico
```
Mapping `recommendation_type → owner_resolver`:

const TYPE_OWNERSHIP = {
  'event_plan': 'organizer',        // US-017
  'event_checklist': 'organizer',   // US-018
  'budget_distribution': 'organizer', // US-019
  'service_categories': 'organizer', // US-020
  'task_priority': 'organizer',      // US-024
  'quote_compare_summary': 'organizer', // US-022
  'quote_brief': 'vendor',           // US-021
};

UseCase resuelve el dueño según type, verifica `currentUser` matches, sino → `404 AI_RECOMMENDATION_NOT_FOUND` uniforme.
```

### D8 — Rate limit AI
```
Heredado patrón: 5 req/min/user vía `aiRateLimit` middleware shared (de US-022 BE-006). Excede ⇒ `429 AI_RATE_LIMITED`.

Rate limit separado del cap de regenerations (uno es velocidad, otro es total).
```

### D9 — Fallback
```
Si AIProviderPort timeout/error o output malformado:
- Persiste child AIRecommendation con payload fallback estático (heredado del type original) + `locale_fallback=true`.
- UI muestra mensaje claro + sugerencia "Reintentar más tarde".

NO se incrementa el contador de regeneraciones si el fallback ocurrió ANTES de invocar AI exitosamente — pero SÍ se persiste el child (audit). El contador suma cualquier child del linaje.
```

### D10 — Configurable env var
```
`AI_MAX_REGENERATIONS_PER_LINEAGE=5` (default).

Exposto via config service: `aiConfig.maxRegenerationsPerLineage`. Tests pueden override.

Backlog PB-P2-003 ya confirma "5" como decisión PO.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Schema | parent_id + root_id + feedback columns + indexes + backfill |
| 2 | Count | Por linaje raíz |
| 3 | root_id | Set en INSERT (parent.root_id ?? parent.id) |
| 4 | Estado parent | Cualquier no eliminada |
| 5 | Locale | Hereda del parent |
| 6 | Feedback injection | Helper PromptOps shared |
| 7 | Authorization | Polimórfica por type → owner resolver |
| 8 | Rate limit | 5/min/user shared |
| 9 | Fallback | Idéntico use case original + persiste child con locale_fallback |
| 10 | Env var | AI_MAX_REGENERATIONS_PER_LINEAGE=5 |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-026-regenerate-ai-suggestion-with-feedback.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
