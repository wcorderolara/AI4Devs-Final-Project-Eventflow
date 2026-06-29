# User Story Refinement Review — US-084

## Source User Story File
management/user-stories/US-084-ai-prompts-respect-event-language.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-084-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)
Q1–Q7 resueltas. La US-084 declara `Backlog Item: PB-P1-049`, `PO/BA Decisions Applied` D1–D7, trazabilidad corregida (FR-AI-017 confuso → FR-I18N-005 + FR-AI-008 + UC-AI-001..009 + BR-AI-011; NFR-PERF-API-001→NFR-PERF-001). Port refactor con locale obligatorio + LOCALE_LABEL helper + DB migración + US-017 representative + tests heurísticos + tickets seguimiento US-018..025. AC-01..AC-05, EC-01..EC-03, VR-01..VR-02, SEC-01..SEC-03. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-084 |
| Backlog Item | PB-P1-049 — Prompts IA respetan idioma del evento |
| Epic | EPIC-I18N-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-084-refinement-review.md |

## 2. Diagnóstico

US-084 cierra EPIC-I18N-001 con enforcement formal del contrato AI binding documentado en US-082 D5. Backend infra refactor del `AIProviderPort` para aceptar `locale` parameter + refactor de todos los AI use cases existentes (US-017..025).

### Hallazgos

1. **Trazabilidad**: cita `FR-AI-017` (no confirmado en docs). Correctos: **`FR-I18N-005`** (AI respeta idioma seleccionado), **`BR-AI-011`** (i18n AI prompts). `UC-AI-001..009` ✓. Agregar `FR-AI-008` (PromptOps determinismo). NFR-PERF-API-001 → NFR-PERF-001.
2. **Falta declarar `Backlog Item: PB-P1-049`**.
3. **ACs genéricos**.
4. **API**: NO endpoints nuevos. Refactor de `AIProviderPort` interface + cada AI use case existente.
5. **Locale parameter en AIProviderPort**: signature change → `generate({ context, locale, ... })`.
6. **Locale mapping a labels naturales**: `es-LATAM → "español latinoamericano"`, etc. para inclusión en prompts (modelos LLM entienden mejor labels naturales que codes ISO).
7. **Cada AI use case existente** (US-017 plan, US-018 checklist, US-019 budget, US-020 categories, US-021 brief, US-022 summary, US-023..025) debe refactorizarse.
8. **Validación output**: tests verifican respuesta en idioma correcto (heurística: presencia de palabras clave por locale, o validación lenguaje vía detector).
9. **Fallback si provider no soporta locale**: log warn + usar es-LATAM template estático.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | Tech | `AIProviderPort` signature | Refactor: añadir `locale: 'es-LATAM' \| 'es-ES' \| 'pt' \| 'en'` parameter obligatorio (no opcional). |
| Q2 | Tech | Locale → label natural | Mapeo: es-LATAM → "español latinoamericano", es-ES → "español de España", pt → "português brasileiro", en → "English". Inyectado en prompt template como "Responde en {{language_label}}." |
| Q3 | PO | Use cases AI a refactorizar | TODOS los AI use cases existentes (US-017..025). Cada uno debe extraer `event.language` y pasarlo al provider. |
| Q4 | PO | Validación output | Tests por idioma con heurísticas (palabras clave detectables o language detection lib). Si validación falla en CI ⇒ test rojo. |
| Q5 | Tech | Fallback no soportado | Si provider no soporta locale (raro con GPT/Claude modernos): log `ai.locale.fallback` warn + usar template estático en es-LATAM. AIRecommendation marca `locale_fallback=true`. |
| Q6 | Tech | AIRecommendation persistencia | Añadir columna `locale` en `ai_recommendations` para auditoría (qué idioma se solicitó). |
| Q7 | PO | Refactor masivo strategy | Esta US implementa el **contrato del port** + **refactor de US-017** como caso representativo. US-018..025 se refactorizan en tickets separados (uno por US) con esta US como dependencia. |

## 9. Recomendación

`Needs Refinement` — 7 decisiones PO/Tech bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
