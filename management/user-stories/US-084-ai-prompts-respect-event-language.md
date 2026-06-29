# 🧾 User Story: AIProviderPort refactor con locale + enforcement contrato AI binding (US-017 representativo)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-084 |
| Backlog Item | PB-P1-049 — Prompts IA respetan idioma del evento |
| Epic | EPIC-I18N-001 |
| Feature | `AIProviderPort` con locale obligatorio + helper LOCALE_LABEL + DB migración + US-017 refactor representativo |
| Module / Domain | I18N / AI |
| User Role | System |
| Priority | Must Have |
| Status | Approved |
| Owner | Product Owner / Business Analyst |
| Sprint / Milestone | MVP |
| Created Date | 2026-06-09 |
| Last Updated | 2026-06-29 |
| Approved By | PO/BA Review |
| Approval Date | 2026-06-29 |
| Ready for Development Tasks | Yes |

---

## 🎯 User Story

**As the** sistema IA
**I want** que `AIProviderPort` exija `locale` en cada `generate()`, que el helper `LOCALE_LABEL` inyecte la instrucción de idioma en el prompt, y que `AIRecommendation` persista el locale solicitado
**So that** todas las salidas IA estén en el idioma esperado del evento con auditoría trazable (FR-I18N-005 + BR-AI-011)

---

## 🧠 Business Context

### Context Summary

US-084 cierra EPIC-I18N-001 con enforcement formal del contrato AI binding documentado en US-082 D5. Entrega: refactor del `AIProviderPort` (signature change), helper `LOCALE_LABEL`, migración menor (`ai_recommendations.locale + locale_fallback`), US-017 refactor representativo, tests heurísticos. **Tickets de seguimiento** para US-018..025 (cada uno refactor minimal).

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | `AIProviderPort.generate` añade parámetro `locale` obligatorio. Todos los adapters (OpenAI/Anthropic/Mock) implementan. |
| D2 | Helper `LOCALE_LABEL` inyecta instrucción "Responde estrictamente en {language_label}" en cada prompt. |
| D3 | TODOS los AI use cases (US-017..025) refactor. US-084 implementa US-017 representativo; resto via tickets. |
| D4 | Tests con heurísticas (tokens detectables por idioma) verifican output. |
| D5 | Fallback: si error o idioma incorrecto, template estático es-LATAM + `locale_fallback=true`. |
| D6 | Migración menor: `ai_recommendations.locale` + `locale_fallback`. |
| D7 | Strategy: US-084 entrega port + US-017; tickets de seguimiento para US-018..025. |

### Related Domain Concepts

* `AIProviderPort` interface change.
* `LOCALE_LABEL` helper mapping.
* `ai_recommendations.locale` audit field.

### Assumptions

* US-082 entregó `event.language` field con contrato documentado.
* US-017 entregado o avanzando.

### Dependencies

* US-082 (event language), US-017 (AI plan use case representative), PB-P0-001.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-I18N-005, FR-AI-008 |
| Use Case(s) | UC-AI-001..009 (todos), UC-AI-001 (representativo) |
| Business Rule(s) | BR-AI-011 |
| Permission Rule(s) | System (sin permisos públicos) |
| Data Entity / Entities | AIRecommendation, Event |
| API Endpoint(s) | Refactor de endpoints POST /events/:id/ai/* (heredados de US-017..025) |
| NFR Reference(s) | NFR-PERF-001 |
| Related Document(s) | /docs/9 §FR-I18N-005, /docs/15 i18n strategy, /docs/4 §BR-AI-011 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* Refactor de US-018..025 (tickets separados).
* Auto-detect del idioma del output (heurística MVP).
* Library de language detection externa.
* Multi-idioma en mismo output (es 1 locale por call).

### Scope Notes
* Port + helper + DB migration + US-017 representative + tests heurísticos.

---

## ✅ Acceptance Criteria

### AC-01: AIProviderPort acepta locale
**Given** llamada a `AIProviderPort.generate({...})` sin locale
**When** TypeScript compila
**Then** error de tipo (locale obligatorio).

### AC-02: Helper inyecta instrucción
**Given** llamada con `locale='pt'`
**When** se compone el prompt final
**Then** prompt incluye "Responde estrictamente en português brasileiro. No mezcles idiomas."

### AC-03: US-017 refactor representativo
**Given** event con `language='pt'`, organizer llama AI plan
**When** se ejecuta US-017
**Then** Port recibe `locale='pt'` + AIRecommendation persiste `locale='pt'`.

### AC-04: Heurística output PT detectada
**Given** US-017 generate con `locale='pt'`, mock retorna texto en portugués
**When** test verifica
**Then** output contiene tokens portugueses esperados + AIRecommendation.locale='pt'.

### AC-05: Fallback con locale_fallback=true
**Given** mock simula error o response unparseable
**When** US-017 maneja error
**Then** fallback template es-LATAM + AIRecommendation con `locale_fallback=true`.

---

## ⚠️ Edge Cases

### EC-01: Locale no soportado por provider
Improbable con LLMs modernos. Si ocurre: log warn + fallback.

### EC-02: Output en idioma incorrecto
**Given** provider retorna en es-LATAM aunque se pidió pt
**When** heurística post-respuesta detecta (opcional MVP)
**Then** log warn `ai.locale.mismatch_detected`; respuesta retornada igualmente. PO confirma comportamiento.

### EC-03: AIRecommendations existentes pre-migración
**Given** rows existentes sin `locale`
**When** se aplica migración
**Then** backfill via JOIN events.language (o default es-LATAM si event no encontrado).

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | AIProviderPort.generate locale obligatorio | TS compile error |
| VR-02 | locale enum valid en runtime | `400 INVALID_LOCALE` (improbable, validado por DTO upstream) |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | System-level (sin exposición externa del port) |
| SEC-02 | Backend valida event.language enum antes de llamar |
| SEC-03 | AIRecommendation.locale persistido para audit |

### Negative Authorization Scenarios
* Heredados de cada AI use case (organizer owner del event).

---

## 🤖 AI Behavior

**Esta US ES la infraestructura AI**. Define el contrato.

* AI Feature: Cross-cutting refactor of AI infrastructure.
* Provider Layer: `AIProviderPort` + Adapters (OpenAI, Anthropic, Mock).
* Human Validation Required: Heredado de cada AI use case (HITL en US-017..025).
* Persist AIRecommendation: Sí, con `locale` audit.
* Fallback Required: Sí, template estático es-LATAM + `locale_fallback=true`.

### AI Input
Cada use case pasa `event.language` como `locale`.

### AI Output
LLM responde en el idioma instruido por LOCALE_LABEL.

### Human-in-the-loop Rules
Heredados de cada AI use case.

### AI Error / Fallback Behavior
Si provider falla o devuelve unparseable, fallback al template estático en es-LATAM + marca `locale_fallback=true` en AIRecommendation.

---

## 🎨 UX / UI Notes

No aplica directamente (es backend infra). Las US AI individuales (US-017..025) tienen sus propias UIs.

---

## 🛠 Technical Notes

### Backend
* Refactor: `src/modules/ai/ports/ai-provider.port.ts` interface.
* Adapters: `OpenAIAdapter`, `AnthropicAdapter`, `MockAIProvider` implementan locale.
* Helper: `src/shared/i18n/locale-label.ts` con LOCALE_LABEL.
* US-017 refactor: extender call a port con `locale: event.language`.

### Database
* Migración menor: `ai_recommendations.locale text NOT NULL DEFAULT 'es-LATAM'` + `locale_fallback boolean NOT NULL DEFAULT false`.
* Backfill: JOIN events.

### API
Sin endpoints nuevos.

### Observability
* Log: `ai.locale.applied`, `ai.locale.fallback`, opcional `ai.locale.mismatch_detected`.

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | TypeScript rechaza llamada sin locale | Compile |
| TS-02 | Helper LOCALE_LABEL retorna labels correctos | Unit |
| TS-03 | Prompt final incluye instrucción de idioma | Unit |
| TS-04 | US-017 pasa locale=event.language al port | Integration |
| TS-05 | Heurística output PT detectada | Integration |
| TS-06 | Fallback funcional con locale_fallback=true | Integration |
| TS-07 | Migración backfill correcto | Migration test |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Llamada sin locale | TS error |
| NT-02 | Output incorrecto idioma | Log warn |

### AI Tests
TS-04, TS-05 son AI binding verification.

### Authorization
Heredado de cada AI use case.

### Accessibility
N/A (backend).

### Performance
Negligible (helper síncrono).

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Calidad i18n + audit IA |
| Expected Impact | AI outputs siempre en idioma del evento + trazabilidad locale |
| Success Criteria | 100% AI calls con locale + AIRecommendations persisten locale |
| Academic Demo Value | Demo i18n end-to-end con LLM real |

---

## 🧩 Task Breakdown Readiness

* BE: Port refactor + adapters + helper + US-017 refactor.
* DB: Migración menor 2 columnas + backfill.
* QA: UT helper + TS strict compile + IT US-017 + heurísticas.
* DOC: Contrato port + tickets US-018..025.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] AIProviderPort signature refactorizado.
* [ ] Adapters implementan locale.
* [ ] Helper LOCALE_LABEL operativo.
* [ ] US-017 refactor + tests heurísticos verdes.
* [ ] Migración aplicada + backfill validado.
* [ ] Tickets US-018..025 creados.
* [ ] docs/15 actualizado.

---

## 📝 Notes

* US-084 cierra EPIC-I18N-001 con contrato AI enforcement.
* Tickets de seguimiento obligatorios para US-018..025.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-084-decision-resolution.md`.
