# Technical Specification — US-026: AI Regenerate with Feedback (Cross-Cutting)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-026 |
| Source User Story | `management/user-stories/US-026-regenerate-ai-suggestion-with-feedback.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-026-decision-resolution.md` |
| Priority | P2 (Should Have) |
| Backlog ID | PB-P2-003 |
| Backlog Title | Regenerar sugerencia IA con feedback (cap 5) |
| Backlog Execution Order | 3 (P2.3) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-026 |
| Epic | EPIC-AI-001 (transversal) |
| Backlog Item Dependencies | US-017..US-024, US-022, US-082, US-084 |
| Feature | Schema migration + cross-cutting UseCase + owner resolver polimórfico + PromptOps helper + dialog shared |
| Module / Domain | AI / Cross-cutting |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-29 |
| Last Updated | 2026-06-29 |

---

## 2. Backlog Execution Context

PB-P2-003 single-story. Execution order 54.

---

## 3. Executive Technical Summary

**Database**:
- Migración 3 columnas (`parent_recommendation_id`, `root_recommendation_id`, `regeneration_feedback`) + 2 FKs + 2 indexes + backfill `root_recommendation_id=id` para rows existentes.

**Backend**:
- `RegenerateAIRecommendationUseCase` cross-cutting: lookup parent + auth polimórfica + count linaje + AIProviderPort.generate({locale: parent.locale}) per US-084 + persist child con audit (parent_id, root_id, regeneration_feedback, locale_fallback).
- `AIRecommendationOwnerResolver` con mapping `recommendation_type → owner`.
- Helper `injectFeedbackForRegeneration` PromptOps shared.
- Resolver de prompt template + Zod output schema según type (lookup por type).
- Controller + ruta.

**Frontend**:
- `AIRegenerateDialog` componente shared (genérico, callable desde cualquier vista AI).
- Hook `useRegenerateAIRecommendation`.

---

## 4. Scope Boundary

### In Scope
- Schema migration + UseCase cross-cutting + owner resolver + helper PromptOps + dialog + i18n.

### Out of Scope
- Comparison side-by-side parent vs child.
- Auto-rollback.
- Streaming SSE.

---

## 5. Architecture Alignment

Reuso de AIProviderPort (US-084) + rate limit (US-022) + Pattern AI use case. Cross-cutting requiere polimorfismo controlado.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 regen exitosa | UseCase + INSERT child | BE, DB |
| AC-02 límite linaje | Count query + 429 | BE |
| AC-03 feedback vacío | Helper inyecta placeholder | BE |
| AC-04 padre eliminado | Lookup → 404 uniforme | BE |
| AC-05 auth polimórfica | OwnerResolver | BE |
| AC-06 locale heredado | child.locale = parent.locale | BE |
| AC-07 rate limit | Middleware | BE |
| AC-08 fallback persiste y cuenta | Try/catch + INSERT child fallback | BE |

---

## 7. Backend Technical Design

### Use Case

```ts
class RegenerateAIRecommendationUseCase {
  constructor(
    private aiProviderPort: AIProviderPort,
    private ownerResolver: AIRecommendationOwnerResolver,
    private promptResolver: PromptTemplateResolver,  // by type
    private outputSchemaResolver: OutputSchemaResolver, // by type
    private config: AIConfig,
  ) {}

  async execute({ currentUser, recommendationId, body }) {
    return prisma.$transaction(async (tx) => {
      // 1. Lookup parent
      const parent = await tx.ai_recommendations.findUnique({
        where: { id: recommendationId },
        include: { event: { select: { organizer_user_id: true, language: true } } },
      });
      if (!parent) throw new AIRecommendationNotFoundError();

      // 2. Auth polimórfica
      const ownerType = this.ownerResolver.resolve(parent.recommendation_type);
      if (!this.ownerResolver.matches(currentUser, parent, ownerType)) {
        throw new AIRecommendationNotFoundError();  // uniforme
      }

      // 3. Compute root_id
      const rootId = parent.root_recommendation_id ?? parent.id;

      // 4. Count linaje
      const count = await tx.ai_recommendations.count({
        where: {
          root_recommendation_id: rootId,
          id: { not: rootId },  // children only, no root
        },
      });
      if (count >= this.config.maxRegenerationsPerLineage) {
        throw new RegenerationLimitError({ current_count: count, max: this.config.maxRegenerationsPerLineage });
      }

      // 5. Prompt + schema lookup por type
      const promptTemplate = this.promptResolver.getByType(parent.recommendation_type);
      const outputSchema = this.outputSchemaResolver.getByType(parent.recommendation_type);

      // 6. Inject feedback
      const trimmedFeedback = (body.feedback ?? '').trim();
      const finalPrompt = injectFeedbackForRegeneration(promptTemplate, trimmedFeedback);

      // 7. AI generate
      let parsedOutput;
      let localeFallback = false;
      try {
        const result = await this.aiProviderPort.generate({
          promptTemplate: finalPrompt,
          context: parent.payload,  // reuso context original
          locale: parent.locale,
        });
        parsedOutput = outputSchema.parse(JSON.parse(result.output));
        localeFallback = result.locale_fallback;
      } catch (err) {
        logger.warn('ai.regenerate.fallback', { recommendationId, error: err.message });
        parsedOutput = getStaticFallback(parent.recommendation_type);
        localeFallback = true;
      }

      // 8. INSERT child
      const child = await tx.ai_recommendations.create({
        data: {
          event_id: parent.event_id,
          recommendation_type: parent.recommendation_type,
          payload: parsedOutput,
          locale: parent.locale,
          locale_fallback: localeFallback,
          parent_recommendation_id: parent.id,
          root_recommendation_id: rootId,
          regeneration_feedback: trimmedFeedback || null,
        },
      });

      logger.info('ai.regenerate.generated', { recommendationId, childId: child.id, lineageCount: count + 1 });

      return child;
    });
  }
}
```

### Owner Resolver

```ts
// src/modules/ai/services/owner-resolver.service.ts
const TYPE_OWNERSHIP: Record<string, 'organizer' | 'vendor'> = {
  event_plan: 'organizer',
  event_checklist: 'organizer',
  budget_distribution: 'organizer',
  service_categories: 'organizer',
  task_priority: 'organizer',
  quote_compare_summary: 'organizer',
  quote_brief: 'vendor',
};

class AIRecommendationOwnerResolver {
  resolve(type: string): 'organizer' | 'vendor' {
    const owner = TYPE_OWNERSHIP[type];
    if (!owner) throw new InternalError(`No owner mapping for type ${type}`);
    return owner;
  }

  matches(currentUser, parent, ownerType: 'organizer' | 'vendor'): boolean {
    if (ownerType === 'organizer') {
      return parent.event?.organizer_user_id === currentUser.id;
    }
    if (ownerType === 'vendor') {
      // Para quote_brief, payload contiene vendor_id; o JOIN según design del use case
      return parent.payload?.vendor_user_id === currentUser.id;
    }
    return false;
  }
}
```

### Helper PromptOps

```ts
// src/modules/ai/prompts/inject-feedback.helper.ts
export function injectFeedbackForRegeneration(originalTemplate: string, feedback: string): string {
  const feedbackBlock = `\n\n[USER_FEEDBACK_FOR_REGENERATION]\n${feedback || '(sin feedback adicional)'}\n[END_FEEDBACK]`;
  return originalTemplate + feedbackBlock;
}
```

### Prompt + Output schema resolvers

```ts
// Type → prompt template
class PromptTemplateResolver {
  private templates = {
    event_plan: EVENT_PLAN_PROMPT_V1,
    event_checklist: EVENT_CHECKLIST_PROMPT_V1,
    // ... etc por type
  };
  getByType(type: string) { return this.templates[type]; }
}

// Type → Zod output schema
class OutputSchemaResolver {
  private schemas = {
    event_plan: eventPlanOutputSchema,
    quote_compare_summary: quoteSummaryOutputSchema,
    task_priority: taskPriorityOutputSchema,
    // ... etc
  };
  getByType(type: string) { return this.schemas[type]; }
}
```

### Routes

```ts
router.post(
  '/ai-recommendations/:id/regenerate',
  authGuard,  // accepts organizer OR vendor
  aiRateLimit,
  asyncHandler(controller.regenerate.bind(controller))
);
```

### DTOs

```ts
export const regenerateBody = z.object({
  feedback: z.string().max(500).optional(),
}).strict();
```

### Error Handling
`400 INVALID_BODY`, `401`, `404 AI_RECOMMENDATION_NOT_FOUND`, `429 REGENERATION_LIMIT`, `429 AI_RATE_LIMITED`, `500 INTERNAL_ERROR`.

---

## 8. Frontend Technical Design

### Componente shared

```tsx
// components/ai/AIRegenerateDialog.tsx
type Props = {
  recommendationId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (child: AIRecommendation) => void;
};

export function AIRegenerateDialog({ recommendationId, open, onClose, onSuccess }: Props) {
  const t = useTranslations('ai.regenerate');
  const { register, handleSubmit, watch, formState } = useForm({
    resolver: zodResolver(z.object({ feedback: z.string().max(500).optional() })),
  });
  const mutation = useRegenerateAIRecommendation();
  const feedbackLength = watch('feedback')?.length ?? 0;

  const onSubmit = async (data) => {
    const child = await mutation.mutateAsync({ recommendationId, feedback: data.feedback });
    onSuccess(child);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="regen-title">
      <h2 id="regen-title">{t('title')}</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <label htmlFor="feedback">{t('feedback_label')}</label>
        <textarea id="feedback" {...register('feedback')} maxLength={500} />
        <span aria-live="polite">{feedbackLength}/500</span>
        {mutation.error && <ErrorBanner error={mutation.error} />}
        <button type="submit" disabled={mutation.isPending}>{t('regenerate')}</button>
        <button type="button" onClick={onClose}>{t('cancel')}</button>
      </form>
    </Dialog>
  );
}
```

### Hook

```ts
export function useRegenerateAIRecommendation() {
  return useMutation({
    mutationFn: ({ recommendationId, feedback }) =>
      aiApi.regenerate({ recommendationId, feedback }),
    onSuccess: (child) => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
    },
  });
}
```

### i18n
`ai.regenerate.*` en 4 locales (title, feedback_label, regenerate, cancel, errors).

---

## 9. API Contract

| Method | Endpoint | Request | Response | Errors |
|---|---|---|---|---|
| POST | `/api/v1/ai-recommendations/:id/regenerate` | `{feedback?}` | `201 AIRecommendation` | 400, 401, 404, 429 (REGENERATION_LIMIT / AI_RATE_LIMITED), 500 |

---

## 10. Database / Prisma Design

### Migration

```sql
ALTER TABLE ai_recommendations
  ADD COLUMN parent_recommendation_id uuid NULL,
  ADD COLUMN root_recommendation_id uuid NULL,
  ADD COLUMN regeneration_feedback text NULL;

ALTER TABLE ai_recommendations
  ADD CONSTRAINT fk_ai_rec_parent
    FOREIGN KEY (parent_recommendation_id) REFERENCES ai_recommendations(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_ai_rec_root
    FOREIGN KEY (root_recommendation_id) REFERENCES ai_recommendations(id) ON DELETE SET NULL;

CREATE INDEX idx_ai_recommendations_root ON ai_recommendations(root_recommendation_id);
CREATE INDEX idx_ai_recommendations_parent ON ai_recommendations(parent_recommendation_id);

-- Backfill
UPDATE ai_recommendations SET root_recommendation_id = id WHERE root_recommendation_id IS NULL;
```

### Prisma schema (extracto)
```prisma
model AIRecommendation {
  id                          String              @id @default(uuid())
  // ... existing fields
  parent_recommendation_id    String?
  root_recommendation_id      String?
  regeneration_feedback       String?

  parent                      AIRecommendation?   @relation("Lineage", fields: [parent_recommendation_id], references: [id], onDelete: SetNull)
  children                    AIRecommendation[]  @relation("Lineage")

  root                        AIRecommendation?   @relation("Root", fields: [root_recommendation_id], references: [id], onDelete: SetNull)
  rootChildren                AIRecommendation[]  @relation("Root")

  @@index([root_recommendation_id])
  @@index([parent_recommendation_id])
}
```

---

## 11. AI / PromptOps Design

### Prompt resolver
Lookup por type. Reuso de prompts versionados ya existentes (US-017..024).

### Output schema resolver
Lookup por type. Reuso de schemas Zod ya existentes.

### Feedback injection
Helper shared apendiza bloque al final.

### Locale binding
Hereda del parent (consistencia).

### Fallback
Estático por type, heredado del use case original.

---

## 12. Security & Authorization Design

- Autenticación: sesión válida.
- Authorization polimórfica por type.
- `404 AI_RECOMMENDATION_NOT_FOUND` uniforme.
- Rate limit AI shared.

## 13. Testing Strategy

### Unit
- DTO + UseCase branches (linaje, fallback, types varios).
- OwnerResolver matrix (organizer/vendor x types).
- Helper injectFeedback (con/sin feedback).
- Count linaje.

### Integration
- TS-01..TS-08.

### AI Tests (mocks)
- AI-TS-01..AI-TS-03 por al menos 2 types (event_plan + quote_brief).

### Migration test
- Backfill root_id correcto.

### API
Supertest.

### Security
- 404 uniforme + rate + cap.

### Accessibility
- Dialog focus trap + axe.

### Performance
- `< 5s p95`.

---

## 14. Observability & Audit

Logs `ai.regenerate.requested/generated/limit_exceeded/rate_limited/fallback`. AIRecommendation child persiste lineage para audit DB.

---

## 15. Seed / Demo
Reuso. Verificar seed crea AIRecommendation root con root_id=self.id.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar endpoint regenerate | Documentar. | Actualizar. | No |
| `docs/7` (AI specs) | Documentar UC-AI-010 + linaje + cap 5 + env var | Documentar. | Actualizar. | No |
| `docs/4` (BR) | Confirmar BR-AI-008..010 cubren regeneración límite | Verificar. | Si falta, añadir BR. | No |
| Schema ai_recommendations | 3 columnas nuevas + FKs + indexes | Migración menor | Aplicar. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Owner resolver inconsistente | Bypass auth | Type-driven mapping + UT exhaustivo |
| Linaje circular | Loop | FK self-referente + INSERT solo con `parent_id < self_id` lógico (nunca update) |
| Count linaje lento | UX | Index `(root_recommendation_id)` |
| Prompt/schema resolver no encuentra type | Defensiva 500 | Test covers each registered type |
| Feedback inyección rompe prompt original | AI output raro | Helper format estable [USER_FEEDBACK]...[END_FEEDBACK] |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Database**:
- Migración Prisma `add_lineage_to_ai_recommendations`.

**Backend**:
- `src/modules/ai/dto/regenerate.body.ts` (nuevo)
- `src/modules/ai/use-cases/regenerate-ai-recommendation.use-case.ts` (nuevo)
- `src/modules/ai/services/owner-resolver.service.ts` (nuevo)
- `src/modules/ai/services/prompt-template-resolver.service.ts` (nuevo)
- `src/modules/ai/services/output-schema-resolver.service.ts` (nuevo)
- `src/modules/ai/prompts/inject-feedback.helper.ts` (nuevo)
- `src/modules/ai/controllers/ai-regenerate.controller.ts` (nuevo)
- `src/modules/ai/routes/ai-regenerate.routes.ts` (nuevo)
- `src/config/ai.config.ts` (extender con `maxRegenerationsPerLineage`)

**Frontend**:
- `components/ai/AIRegenerateDialog.tsx` (shared genérico)
- `hooks/useRegenerateAIRecommendation.ts` (nuevo)
- `lib/api/aiApi.ts` (extender con `regenerate`)
- `messages/{4 locales}.json` (`ai.regenerate.*`)

### Orden sugerido
1. DB-001 migración + backfill + UT migration.
2. BE: config env var.
3. BE: OwnerResolver + UT.
4. BE: PromptTemplateResolver + OutputSchemaResolver + UT.
5. BE: injectFeedback helper + UT.
6. BE: UseCase + UT (branches).
7. BE: Controller + ruta.
8. FE: Dialog + hook + i18n.
9. Tests IT + AI mocks (event_plan + quote_brief mínimo).
10. Documentación.

### Decisiones que no deben reabrirse
D1–D10.

### Qué no implementar
- Comparison side-by-side.
- Auto-rollback.
- SSE streaming.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 1 (migración + backfill) |
| BE | 7 (DTO, OwnerResolver, PromptResolver, SchemaResolver, helper, UseCase, Controller) |
| FE | 3 (Dialog, hook+API, i18n) |
| QA | 6 (UT, IT linaje, IT auth polimórfica, AI mocks por type, A11Y, Migration) |
| DOC | 1 |
| **Total** | 18 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Cross-cutting design coherente | Pass |
| Polimorfismo controlado | Pass |
| AI binding (US-084) | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-026 entrega regeneración IA cross-cutting con schema lineage + owner resolver polimórfico + helper PromptOps + cap 5 por linaje + locale heredado + fallback. **Cierra PB-P2-003**. Habilita HITL iterativo para TODAS las AI features (US-017..024).
