# Technical Specification — US-084: AIProviderPort + Locale Enforcement

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-084 |
| Source User Story | `management/user-stories/US-084-ai-prompts-respect-event-language.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-084-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-049 |
| Backlog Title | Prompts IA respetan idioma del evento |
| Backlog Execution Order | 84 |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-084 |
| Epic | EPIC-I18N-001 |
| Backlog Item Dependencies | US-082, US-017 |
| Feature | Port refactor + LOCALE_LABEL helper + DB migration + US-017 refactor |
| Module / Domain | I18N / AI |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-29 |
| Last Updated | 2026-06-29 |

---

## 2. Backlog Execution Context

PB-P1-049 single-story. Execution order 84. **Cierra EPIC-I18N-001**.

---

## 3. Executive Technical Summary

**Backend**:
- `AIProviderPort.generate({locale, ...})` signature breaking change.
- 3 Adapters (OpenAIAdapter, AnthropicAdapter, MockAIProvider) implementan locale.
- Helper `LOCALE_LABEL` con mapping + función para componer prompt con instrucción de idioma.
- US-017 refactor representativo.
- Migración menor 2 columnas en `ai_recommendations`.

**Tickets de seguimiento** (no en US-084): US-018, US-019, US-020, US-021, US-022, US-023, US-024, US-025.

---

## 4. Scope Boundary

### In Scope
- Port + adapters + helper + DB migration + US-017 + tests heurísticos.

### Out of Scope
- Refactor de US-018..025.
- Language detection lib externa.
- Multi-idioma en mismo output.

---

## 5. Architecture Alignment

Refactor del Port adheres a Hexagonal Architecture. Cambio breaking pero scoped.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 TS rejects sin locale | Interface change | BE (compile-time) |
| AC-02 helper inyecta | LOCALE_LABEL + prompt compose | BE |
| AC-03 US-017 pasa locale | Refactor use case | BE |
| AC-04 heurística PT | Test heurístico | QA |
| AC-05 fallback | Catch + template estático | BE |
| EC-01..03 | Edge handling | BE/QA |

---

## 7. Backend Technical Design

### Port refactor

```ts
// src/modules/ai/ports/ai-provider.port.ts
export type Locale = 'es-LATAM' | 'es-ES' | 'pt' | 'en';

export interface AIProviderPort {
  generate(input: {
    promptTemplate: string;
    context: Record<string, unknown>;
    locale: Locale;  // <-- nuevo OBLIGATORIO
  }): Promise<AIResult>;
}
```

### Helper LOCALE_LABEL

```ts
// src/shared/i18n/locale-label.ts
export const LOCALE_LABEL: Record<Locale, string> = {
  'es-LATAM': 'español latinoamericano',
  'es-ES': 'español de España',
  'pt': 'português brasileiro',
  'en': 'English',
};

export function composeLocaleInstruction(locale: Locale): string {
  return `IMPORTANTE: Responde estrictamente en ${LOCALE_LABEL[locale]}. No mezcles idiomas.\n\n`;
}
```

### Adapter implementation pattern

```ts
// OpenAIAdapter (example)
async generate({ promptTemplate, context, locale }) {
  const interpolated = interpolate(promptTemplate, context);
  const finalPrompt = composeLocaleInstruction(locale) + interpolated;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: finalPrompt }],
    });
    return { ok: true, output: response.choices[0].message.content, locale_fallback: false };
  } catch (err) {
    logger.warn('ai.locale.fallback', { locale, error: err.message });
    return { ok: false, output: getStaticTemplate(locale), locale_fallback: true };
  }
}
```

### US-017 refactor representativo

```ts
// AIPlanUseCase (US-017)
async execute({ currentUser, eventId }) {
  const event = await this.eventsRepo.findOwnedById(eventId, currentUser.id);
  if (!event) throw new EventNotFoundError();

  const result = await this.aiProviderPort.generate({
    promptTemplate: PLAN_TEMPLATE,
    context: { eventTitle: event.title, eventDate: event.event_date, /* ... */ },
    locale: event.language,  // <-- nuevo
  });

  const recommendation = await prisma.ai_recommendations.create({
    data: {
      event_id: event.id,
      recommendation_type: 'event_plan',
      payload: result.output,
      locale: event.language,  // <-- nuevo persistido
      locale_fallback: result.locale_fallback,  // <-- nuevo
    },
  });

  return recommendation;
}
```

---

## 8. Frontend Technical Design

No aplica directamente. UI heredadas de US-017..025.

---

## 9. API Contract

Sin endpoints nuevos.

---

## 10. Database / Prisma Design

### Migración menor

```sql
ALTER TABLE ai_recommendations
  ADD COLUMN locale text NOT NULL DEFAULT 'es-LATAM',
  ADD COLUMN locale_fallback boolean NOT NULL DEFAULT false;

-- Backfill: rows existentes obtienen locale del event asociado
UPDATE ai_recommendations
SET locale = events.language
FROM events
WHERE ai_recommendations.event_id = events.id;
```

---

## 11. AI / PromptOps Design

### Locale enforcement strategy
- Inyección sistémica al inicio del prompt.
- Modelos modernos (GPT-4, Claude 3.5+) respetan la instrucción.
- Fallback template si error o timeout.

---

## 12. Security & Authorization Design

Heredada de cada AI use case (US-017..025).

## 13. Testing Strategy

### Unit
- LOCALE_LABEL mapping (4 entries).
- composeLocaleInstruction (4 outputs).
- Adapter wrapper logic.

### Integration
- US-017 con `event.language='pt'`: AIRecommendation.locale='pt'.
- US-017 con mock fallback: locale_fallback=true.
- Migration backfill correcto.

### Heurísticas
- Mock con respuesta en pt: tokens PT esperados ("você", "evento", etc.) + tokens castellanos ausentes.

### Type safety
- TS compile error si llamada sin locale.

### Performance
- Helper síncrono; despreciable.

---

## 14. Observability & Audit

Logs `ai.locale.applied`, `ai.locale.fallback`. AIRecommendation persiste locale para audit DB.

---

## 15. Seed / Demo
Reuso de seed events con varios languages para validar end-to-end.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/15` (i18n strategy) | Documentar AIProviderPort contract con locale | Documentar. | Actualizar. | No |
| `docs/14` (AI architecture) | Documentar helper LOCALE_LABEL | Documentar. | Actualizar. | No |
| US-018..025 tickets | Refactor obligatorio | Crear tickets seguimiento | Tickets abiertos. | No |
| Schema ai_recommendations | 2 columnas nuevas | Migración | Aplicar. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Adapter no actualizado | Runtime error | TS interface obliga implementación |
| LLM ignora instrucción | Output incorrecto | LLMs modernos confiables; opcional detection post |
| Backfill incorrecto | Data integrity | Migration test valida JOIN events |
| US-018..025 olvidados | Outputs inconsistentes | Tickets de seguimiento documentados |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/ai/ports/ai-provider.port.ts` (refactor signature)
- `src/modules/ai/adapters/openai.adapter.ts` (extend con locale)
- `src/modules/ai/adapters/anthropic.adapter.ts` (extend)
- `src/modules/ai/adapters/mock.adapter.ts` (extend)
- `src/shared/i18n/locale-label.ts` (nuevo)
- `src/modules/ai/use-cases/generate-event-plan.use-case.ts` (US-017 refactor representativo)
- Migración Prisma `add_locale_to_ai_recommendations`.

### Orden sugerido
1. DB-001 migración + backfill + UT migration.
2. BE: LOCALE_LABEL helper + UT.
3. BE: Port signature refactor.
4. BE: 3 adapters update.
5. BE: US-017 refactor + AIRecommendation persistence con locale.
6. Tests integration heurísticos.
7. Documentación contrato + tickets US-018..025.

### Decisiones que no deben reabrirse
D1–D7.

### Qué no implementar
- Refactor de US-018..025 (tickets separados).
- Language detection lib.
- Multi-idioma.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 1 (migración + backfill) |
| BE | 5 (helper + port + 3 adapters refactor agrupado + US-017) |
| QA | 4 (UT helper, IT US-017, Heurísticas, Migration backfill) |
| DOC | 1 (contrato + tickets) |
| **Total** | 11 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Cross-AI impact clear (tickets US-018..025) | Pass |
| Security clear | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-084 entrega Port refactor + helper + DB migration + US-017 representativo + tests heurísticos + tickets seguimiento. **Cierra EPIC-I18N-001 — Internationalization & Currency** con 4 PBIs operativos (PB-P1-047/048/049 + integraciones cross-cutting).
