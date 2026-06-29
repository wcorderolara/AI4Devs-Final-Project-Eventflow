# User Story Refinement Review — US-021

## Source User Story File
management/user-stories/US-021-ai-quote-brief-autocompletion.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-021-decision-resolution.md

## Review Date
2026-06-26

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                       |
| ------------------------------------------ | ---------------------------------------------------------------- |
| User Story ID                              | US-021                                                           |
| File Path                                  | management/user-stories/US-021-ai-quote-brief-autocompletion.md  |
| Backlog Item                               | PB-P1-015                                                        |
| Epic                                       | EPIC-AIP-001 — AI-Assisted Event Planning                        |
| Estado actual                              | Draft → Ready for Approval                                       |
| Estado recomendado                         | Ready for Approval                                                |
| Nivel de riesgo                            | Bajo                                                              |
| Calidad general                            | Alta                                                              |
| Requiere decisión PO                       | No                                                                |
| Requiere decisión técnica                  | No                                                                |
| Requiere decisión QA                       | No                                                                |
| Requiere decisión Seguridad                | No                                                                |
| Decision Resolution artifact found         | No                                                                |
| User Story file updated                    | Yes                                                               |
| Refinement review artifact created/updated | Yes                                                               |
| Refinement review path                     | management/user-stories/refinement-reviews/US-021-refinement-review.md |

---

## 2. Diagnóstico PO/BA

US-021 entrega valor claro al organizador: reducir la fricción de redactar `QuoteRequest` desde cero, manteniendo el brief totalmente editable. Está perfectamente alineada con EPIC-AIP-001 y PB-P1-015. El alcance MVP es disciplinado: la IA precarga, el humano decide. No hay scope creep. Las decisiones formalizadas para la familia AI (PO 8.1 #9 / #15, BR-AI-001..011, SEC-POL-AI-007, NFR-AI-001/003/005/007/008) gobiernan esta historia sin ambigüedades; la lógica reusa la fundación de US-017 y comparte patrón con US-018/019/020.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                            | Impacto                                                         | Recomendación                                                                                                      |
| --------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Media     | Trazabilidad original con `FR-AI-007` (vendor bio) y `FR-QUOTE-002` (límite 5 QR) era incorrecta para AI-005. | Confusión semántica entre features AI; riesgo de implementación errónea. | Corregido en refinamiento: `FR-AI-005`, `FR-QUOTE-004`, `UC-AI-005`. Mantiene autoridad del FRD. |
| Media     | Documentation Alignment Required: `/docs/8` etiqueta `UC-AI-005` como categorías y describe brief en `UC-AI-006`, mientras `/docs/9` mapea `FR-AI-005 → UC-AI-005`. | Inconsistencia documental; no bloquea ejecución. | Seguir autoridad del FRD; flag para cleanup en `/docs/8` (mismo patrón que US-020). |
| Media     | `AI Output` original (`brief: { objective, scope, requirements[], questions[] }`) no coincide con `QuoteBriefOutputDto` canónico de `/docs/16`. | Riesgo de divergencia entre frontend, backend y OpenAPI. | Corregido: usar DTO canónico `{ brief, requirements[], questions[], constraints[] }`. |
| Baja      | Falta validación explícita de ausencia de PII del organizador en el brief.            | Riesgo de privacidad y de incumplimiento de `UC-AI-006` notas QA. | Agregado AC-05, VR-09 y SEC-07. |
| Baja      | Categoría destino implícita; no definía cómo se valida.                                | Riesgo de invocar al LLM con categoría inválida.                | Agregado VR-04, EC-03 y body request `service_category_code`. |
| Baja      | Faltaban casos de regenerar y descartar el brief.                                       | Cobertura QA incompleta para HITL.                              | Agregado EC-01 (descartar) y EC-02 (regenerar) con referencia a US-025. |
| Baja      | Falta de claridad sobre dónde se persiste el brief final.                              | Acoplamiento difuso con creación de `QuoteRequest`.              | Documentado: persistencia final en US-023 / PB-P1-030; este endpoint solo entrega sugerencia y persiste `AIRecommendation`. |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                            |
| ------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No hay flujo de pagos.                                                                                |
| No introduce contratos firmados      | Pass      | No hay e-signature.                                                                                   |
| No introduce WhatsApp/chat/push      | Pass      | No hay notificaciones MVP+1.                                                                          |
| Respeta human-in-the-loop IA         | Pass      | Brief editable, `status='pending'`, sin conversión automática.                                         |
| Respeta backend como source of truth | Pass      | Backend-only LLM; ownership y rate limit enforced server-side.                                         |
| Respeta seed/demo si aplica          | Pass      | Mock determinista por idioma y categoría.                                                              |
| No introduce RAG/vector DB           | Pass      | Solo `LLMProvider` con prompt versionado.                                                              |
| No introduce multi-tenant enterprise | Pass      | No aplica.                                                                                            |
| No introduce P4/Future scope         | Pass      | `AnthropicProvider` operativo y feedback "no relevante" quedan explícitamente fuera.                  |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado | Acción recomendada |
| ----- | ------------ | ------------------ | ------------------ |
| AC-01 | Clear        | Ninguno            | Mantener.          |
| AC-02 | Clear        | Ninguno (nuevo)    | Mantener.          |
| AC-03 | Clear        | Ninguno (nuevo)    | Mantener.          |
| AC-04 | Clear        | Ninguno (nuevo)    | Mantener.          |
| AC-05 | Clear        | Ninguno (nuevo)    | Mantener.          |

---

## 6. Gaps Detectados

### Producto / Negocio

* Cubierto: HITL explícito, KPI (≥ 50% briefs IA enviados sin re-escritura completa), handoff claro a US-023.

### Backend / API

* Cubierto: endpoint canónico, ownership, rate limit `SEC-POL-AI-007`, validación Zod del DTO canónico, retry, persistencia `AIRecommendation`.

### Frontend / UX

* Cubierto: `QuoteRequestForm`, `AIBriefAutocomplete`, `AIBriefField`, badge IA, estados loading/error/success, acciones HITL.

### Base de Datos

* Cubierto: sin migraciones nuevas; reuso de `ai_recommendations`, `ai_prompt_versions`, índices existentes.

### Seguridad / Autorización

* Cubierto: ownership, rate limit, redacción de PII en logs, prompt sin datos sensibles, OPENAI_API_KEY en Secrets Manager, validación de ausencia de PII en el output.

### IA / PromptOps

* Cubierto: `QuoteBriefPrompt v1` versionado, `MockAIProvider` determinista, cadena de fallback (Mock en demo, plantilla estática como último recurso), trazabilidad en `AIRecommendation`.

### QA / Testing

* Cubierto: tests funcionales, negativos, IA, autorización, accesibilidad y E2E (junto a US-023).

### Seed / Demo

* Cubierto: Mock determinista por `(event_id, service_category_code, vendor_id?, language_code)`; sin cambios de seed adicionales requeridos.

### Documentación / Trazabilidad

* Pendiente: cleanup en `/docs/8` (UC-AI-005 vs UC-AI-006), aclaración en `/docs/7` sobre cadena de fallback, snapshot OpenAPI vía US-098 (cubierto por `Documentation Alignment Required`).

---

## 7. Preguntas Pendientes

```text
No pending blocking questions.
```

Todas las decisiones requeridas están formalizadas en:
* Decisiones PO 8.1 #9 (timeout/fallback) y #15 (Anthropic stub).
* `/docs/4-Business-Rules-Document.md` BR-AI-001..011, BR-QUOTE-002/003/008, BR-SERVICE-001.
* `/docs/9-Functional-Requirements-Document.md` FR-AI-005/009/011/012/017, FR-QUOTE-004.
* `/docs/10-Non-Functional-Requirements.md` NFR-AI-001/003/005/007/008.
* `/docs/16-API-Design-Specification.md` endpoint y `QuoteBriefOutputDto`.
* `/docs/19-Security-and-Authorization-Design.md` SEC-POL-AI-007.
* `/docs/22-Architecture-Decision-Records.md` ADR-AI-001.

---

## 8. Documentation Alignment Required

| Documento / Fuente                         | Conflicto detectado                                                                                       | Decisión vigente                                                                 | Acción recomendada                                                                                          | ¿Bloquea aprobación? |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------- |
| `/docs/8-Use-Cases-Specification.md`       | UC-AI-005 etiquetado como "Recomendar categorías" (línea 1763); el brief vive en UC-AI-006 (línea 1826).   | FRD mapea `FR-AI-005 → UC-AI-005` para AI-005 (brief).                            | Cleanup en `/docs/8`: alinear títulos UC-AI-005/006 con FRD. No bloquea.                                    | No                   |
| `/docs/16-API-Design-Specification.md`     | Endpoint y DTO ya canónicos; el snapshot OpenAPI debe regenerarse al ejecutar US-098.                      | Endpoint `/events/:eventId/ai/quote-brief`, `QuoteBriefOutputDto` canónico.       | Regenerar snapshot OpenAPI con US-098. No bloquea.                                                            | No                   |
| `/docs/7-AI-Features-Specification.md`     | AI-005 menciona fallback "plantilla estática"; BR-AI-009 y PO 8.1 #9 priorizan Mock en demo.               | Cadena: producción → error controlado; demo → Mock; último recurso → plantilla.   | Aclaración liviana en `/docs/7` AI-005 sobre la cadena completa de fallback. No bloquea.                    | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                   |
| User Story file path                       | `management/user-stories/US-021-ai-quote-brief-autocompletion.md`                      |
| User Story ID verified                     | Yes                                                                                   |
| Decision Resolution artifact found         | No                                                                                    |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-021-decision-resolution.md`           |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-021-refinement-review.md`               |
| Final recommended status                   | Ready for Approval                                                                    |
| Next recommended skill                     | eventflow-user-story-approval                                                          |
| Reason                                     | Decisiones formalizadas; trazabilidad corregida; AC/EC/VR/SEC/AI/Test completos; sin blockers. |

---

## 10. Cambios Aplicados

### Metadata

* `Status: Ready for Approval`.
* `Last Updated: 2026-06-26`.
* Agregados `Backlog Item: PB-P1-015`, `UI Surface`.

### Business Context

* `Context Summary` ampliado con el flujo completo backend + handoff a US-023.
* `Related Domain Concepts` enriquecido con `AIPromptVersion`, `QuoteRequest.ai_generated_brief/ai_recommendation_id`.
* `Assumptions` explícitas: categoría activa, idioma del evento propagado, sin PII automática, vendor opcional.
* `Dependencies` actualizadas: PB-P1-011, PB-P1-006, PB-P1-019, PB-P1-030, PB-P0-007/009..011/014.

### PO/BA Decisions Applied

* Nueva sección con 12 decisiones formalizadas (PO 8.1 #9/#15, HITL, rate limit, endpoint canónico, DTO canónico, sin PII, categoría obligatoria, persistencia final delegada, descarte controlado).

### Traceability

* Corregido `FR-AI-007 → FR-AI-005`.
* Corregido `FR-QUOTE-002 → FR-QUOTE-004`.
* Agregado `FR-AI-009/011/012/017`.
* `UC-AI-005, UC-QUOTE-001` (mantiene autoridad FRD).
* `BR-AI-001..011`, `BR-QUOTE-002/003/008`, `BR-SERVICE-001`.
* `NFR-AI-001/003/005/007/008`.

### Scope Guardrails

* Out of Scope explícito: envío automático, persistencia en `QuoteRequest` (delegado US-023), `AnthropicProvider` operativo, adjuntos IA, feedback futuro.

### Acceptance Criteria

* AC-01 reescrito con endpoint canónico, DTO canónico y HITL.
* AC-02 (precarga editable con badge IA) — nuevo.
* AC-03 (idioma respetado) — nuevo.
* AC-04 (trazabilidad completa) — nuevo.
* AC-05 (sin PII del organizador) — nuevo.

### Edge Cases

* EC-01 (descartar) ampliado con endpoint común HITL.
* EC-02 (regenerar) — nuevo.
* EC-03 (categoría inválida) — nuevo.
* EC-04 (timeout 60s) — nuevo.
* EC-05 (provider no disponible) — nuevo, con cadena de fallback completa.
* EC-06 (JSON inválido) — nuevo.
* EC-07 (rate limit) — nuevo.

### Validation Rules

* VR-01..VR-09 con cobertura de UUID, ownership, estado del evento, categoría activa, vendor opcional, idioma, invariantes del output y ausencia de PII.

### Technical Notes

* Frontend: cliente y mutation TanStack con cache key consistente.
* Backend: `GenerateQuoteBriefUseCase`, validación de PII, retry, sin tocar otras entidades.
* Database: sin migraciones nuevas.
* API: endpoint canónico documentado.
* Observability: log events `ai.quote-brief.*` definidos.

### QA Notes

* AI Tests AI-TS-01..11 con cobertura de DTO, PII, JSON inválido, timeout, fallback chain, rate limit y determinismo del Mock.
* Authorization Tests AUTH-TS-01..05.
* Accessibility con badge IA, `aria-live`, navegación por teclado.

### Definition of Ready

* Marcados los checks pendientes; falta solo `PO/BA validó` (se cerrará en `eventflow-user-story-approval`).

### Definition of Done

* Ampliada con DTO canónico, validación de PII, cadena de fallback y rate limit.

### Notes

* Tres `Documentation Alignment Required` documentadas (`/docs/8`, `/docs/16` snapshot, `/docs/7` cadena de fallback).
* Persistencia final delegada a US-023.
* Determinismo del Mock por `(event_id, service_category_code, vendor_id?, language_code)`.

---

## 11. Recomendación Final

`Ready for Approval`.

Justificación: la historia está completa, alineada con la fundación AI formalizada (US-017..US-020 sirvieron de patrón), las decisiones PO/Tech/QA/Security están todas resueltas en documentación aprobada (BR-AI-*/NFR-AI-*/SEC-POL-AI-007/PO 8.1 #9/#15) y no introduce scope creep. Los tres `Documentation Alignment Required` son no bloqueantes y se atienden vía cleanups documentales / US-098. Próximo paso: `eventflow-user-story-approval`.
