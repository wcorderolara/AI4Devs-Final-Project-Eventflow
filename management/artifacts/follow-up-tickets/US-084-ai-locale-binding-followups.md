# US-084 (PB-P1-049) — Tickets de seguimiento AI locale binding

## Contexto

US-084 formaliza el contrato `LLMProvider.generate({ languageCode: SupportedLanguage })` +
`composeLocaleInstruction(locale)` + persistencia denormalizada `AIRecommendation.locale` /
`AIRecommendation.locale_fallback` + logs de dominio `ai.locale.applied` / `ai.locale.fallback`
en el **motor central** `GenerateAiRecommendationUseCase` (US-097).

Ese motor ya invoca las 8 features AI del MVP (event-scoped y quote-request-scoped) — por lo
tanto **el binding server-side ya aplica end-to-end** para todas ellas por herencia de US-082
+ US-084. Estos tickets NO son bloqueantes para el cierre del EPIC-I18N-001; capturan revisiones
puntuales de "outputs por locale" que cada feature AI puede querer refinar.

## Tickets abiertos (post-MVP / hardening)

| Ticket | Feature | User Story fuente | Objetivo |
|---|---|---|---|
| FUP-084-01 | `event_plan` | US-017 | Añadir fixture PT/EN al `MockAIProvider` con phraseology específica del locale (más allá del fallback genérico) y test heurístico de tokens PT ("você", "cerimônia") + EN ("you", "ceremony"). |
| FUP-084-02 | `checklist` | US-018 | Fixture por locale + heurística de tokens; hoy usa base output. |
| FUP-084-03 | `budget_suggestion` | US-019 | Fixture por locale + heurística; categoría names traducibles. |
| FUP-084-04 | `vendor_categories` | US-020 | Fixture por locale + heurística. |
| FUP-084-05 | `quote_brief` | US-021 | Fixture por locale + heurística (contexto quote request). |
| FUP-084-06 | `quote_comparison` | US-022 | Fixture por locale + heurística sobre criterios comparativos. |
| FUP-084-07 | `vendor_bio` | US-023 | Fixture por locale + heurística. Nota: `vendor_bio` es scope vendor, no event — el binding hoy usa el `languageCode` del comando/preferido del vendor. |
| FUP-084-08 | `task_prioritization` | US-024 / US-025 | Fixture por locale + heurística. |

## Notas de implementación

Cada ticket es de esfuerzo XS–S (1–2 horas c/u): añadir 4 fixtures adicionales al
`MockAIProvider` (una por locale de la whitelist) y un test heurístico que verifique tokens
naturales del idioma. **No** requiere cambios de puerto ni de use case; toda la infraestructura
(binding + logs + persistencia denormalizada) queda entregada por US-084.

## Deviations respecto al Technical Spec §18

- Los prompts NO viven en `infrastructure/llm/prompts/vN/*.ts` como sugiere docs/14 §20.1 — el
  registry real es PB-P0-010 (US-121). Hasta entonces, las variantes por locale se materializan
  como fixtures del `MockAIProvider` (`mock-fixtures.ts`) y como system prompts inline en
  `OpenAIProvider`. Los tickets aquí se abrirán como historias de refinamiento del registry
  (`PromptRegistry`) cuando ese esté disponible.
