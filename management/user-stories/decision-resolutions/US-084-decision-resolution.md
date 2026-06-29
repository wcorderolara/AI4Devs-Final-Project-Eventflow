# PO/BA Decision Resolution — US-084

## Source User Story File
management/user-stories/US-084-ai-prompts-respect-event-language.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-084-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-084 |
| Backlog Item | PB-P1-049 |
| Decisiones tomadas | 7 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — `AIProviderPort` signature refactor
```ts
// Antes
interface AIProviderPort {
  generate(input: { promptTemplate: string; context: Record<string, unknown> }): Promise<AIResult>;
}

// Después
interface AIProviderPort {
  generate(input: {
    promptTemplate: string;
    context: Record<string, unknown>;
    locale: 'es-LATAM' | 'es-ES' | 'pt' | 'en';  // <-- nuevo OBLIGATORIO
  }): Promise<AIResult>;
}
```

OpenAIAdapter + AnthropicAdapter + MockAIProvider implementan el nuevo parameter.
```

### D2 — Locale → label natural en prompts
```
Mapping helper:

const LOCALE_LABEL: Record<Locale, string> = {
  'es-LATAM': 'español latinoamericano',
  'es-ES': 'español de España',
  'pt': 'português brasileiro',
  'en': 'English',
};

Cada prompt template se inyecta con instruction sistémica:
"IMPORTANTE: Responde estrictamente en {{language_label}}. No mezcles idiomas."

Esto se compone automáticamente en `AIProviderPort.generate` antes de enviar al provider.
```

### D3 — Use cases AI a refactorizar
```
TODOS los AI use cases existentes deben refactorizarse para pasar `locale: event.language` al port:
- US-017 — generate AI plan.
- US-018 — generate AI checklist.
- US-019 — generate AI budget distribution.
- US-020 — recommended categories.
- US-021 — quote brief autocompletion.
- US-022 — quote summary.
- US-023..025 — otros AI use cases si existen.

ESTA US implementa solo el **refactor del port + US-017 como caso representativo**. US-018..025 quedan como tickets de seguimiento (uno por US).
```

### D4 — Validación output con heurísticas
```
Tests integration por idioma:
- Crear AIRecommendation con `locale='pt'` mockeado a respuesta en portugués.
- Verificar palabras clave esperadas: por ejemplo, output PT debe contener tokens portugueses ("você", "evento", etc.) y NO contener tokens castellanos típicos ("ustedes", "vosotros").

Heurística simple; sin librería de language detection externa. Si falla en CI ⇒ test rojo.

Para US-017 representativo: TS-05 verifica binding + heurística.
```

### D5 — Fallback si provider no soporta
```
Si provider retorna error o respuesta en idioma incorrecto (improbable con LLMs modernos):
1. Log warn `ai.locale.fallback` con context.
2. Usar `MockAIProvider` template estático en es-LATAM como fallback.
3. AIRecommendation marca `locale_fallback=true`.

Detección de idioma incorrecto: opcional vía heurística post-respuesta; MVP confía en LLM.
```

### D6 — Persistencia locale en AIRecommendation
```
Añadir columna `locale text NOT NULL DEFAULT 'es-LATAM'` en `ai_recommendations`.
Añadir columna `locale_fallback boolean NOT NULL DEFAULT false`.

Migración menor + backfill: existing rows → locale = event.language (via JOIN) o default es-LATAM.

Permite auditar qué idioma se generó para cada AIRecommendation.
```

### D7 — Strategy refactor masivo
```
- **US-084**: implementa port refactor + AIProviderPort signature + Locale helper + DB migración + US-017 refactor representativo + tests heurísticos.
- **Tickets de seguimiento** (no parte de US-084): cada US AI individual (US-018..025) refactor para pasar locale. Cada ticket es Small (1-2 hours work).

Esto evita una US monstruosa y mantiene scope manejable.

US-084 documenta el contrato en `docs/15` para que otros tickets puedan implementar.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Port signature | Locale obligatorio |
| 2 | Label natural | Helper + prompt injection |
| 3 | Use cases | Todos refactor; US-017 en esta US, resto tickets |
| 4 | Validación | Heurísticas en tests |
| 5 | Fallback | Template estático es-LATAM + AIRecommendation marca |
| 6 | Persistencia | Columnas locale + locale_fallback en ai_recommendations |
| 7 | Strategy | US-084 port + US-017 representative + tickets para resto |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-084-ai-prompts-respect-event-language.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
