# Technical Specification — US-024: AI Task Priority Top 3

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-024 |
| Source User Story | `management/user-stories/US-024-ai-task-prioritization.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-024-decision-resolution.md` |
| Priority | P2 (Should Have) |
| Backlog ID | PB-P2-002 |
| Backlog Title | AI-008: Top 3 tareas urgentes IA |
| Backlog Execution Order | 2 (P2.2) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-024 |
| Epic | EPIC-AI-001 / EPIC-TASK-001 |
| Backlog Item Dependencies | US-028, US-031, US-082, US-084, US-022 (rate limit middleware) |
| Feature | AI task priority endpoint + cache signature + locale binding + audit |
| Module / Domain | AI / Tasks |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-29 |
| Last Updated | 2026-06-29 |

---

## 2. Backlog Execution Context

PB-P2-002 single-story. Execution order 53.

---

## 3. Executive Technical Summary

**Backend**:
- `PrioritizeTasksUseCase`: ownership + load tareas elegibles + cache lookup (signature) + AIProviderPort.generate({locale}) + Zod validate output + persist AIRecommendation con audit completo + log.
- `TaskPriorityCacheService` in-memory shared con TTL 5 min (paridad MetricsCacheService US-079).
- Prompt `TaskPriorityPrompt v1` versionado.
- Rate limit middleware shared (de US-022).
- Controller `POST /api/v1/events/:id/ai/task-priority`.

**Frontend**:
- `AITaskPriorityCard` accesible.
- Integración en dashboard del evento.
- Deep-link a US-030 (mark done) y US-018 (generate checklist).

---

## 4. Scope Boundary

### In Scope
- UseCase + cache service + prompt + Controller + card + i18n.

### Out of Scope
- Reordenamiento automático del checklist (HITL).
- Push notifications.
- Edit del top por user.
- Multi-event priorización.

---

## 5. Architecture Alignment

Reuso de AIProviderPort (US-084) + rate limit middleware (US-022) + pattern cache (US-079) + HITL AI pattern.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 top 3 | UseCase + Zod + persist | BE |
| AC-02 empty state | top:[] + UI sugerencia | BE+FE |
| AC-03 <3 tasks | Retornar todas | BE |
| AC-04 cache hit | Cache lookup signature | BE |
| AC-05 cache miss tras edit | Signature recompute | BE |
| AC-06 locale binding | US-084 contract | BE |
| AC-07 fallback | Try/catch | BE |
| EC-01..04 | Edge handling | BE |

---

## 7. Backend Technical Design

### Use Case

```ts
class PrioritizeTasksUseCase {
  async execute({ currentUser, eventId }) {
    // 1. Ownership
    const event = await prisma.events.findFirst({
      where: { id: eventId, organizer_user_id: currentUser.id },
    });
    if (!event) throw new EventNotFoundError();

    // 2. Tareas elegibles
    const tasks = await prisma.event_tasks.findMany({
      where: {
        event_id: eventId,
        status: { in: ['pending', 'in_progress'] },
        is_ai_pending: false,
      },
      select: {
        id: true, title: true, due_date: true, priority: true,
        status: true, updated_at: true,
      },
      orderBy: { due_date: 'asc' },
    });

    if (tasks.length === 0) {
      return { top: [], rationale_summary: null, locale: event.language, locale_fallback: false, cache_hit: false };
    }

    // 3. Compute signature
    const signature = computeChecklistSignature(tasks);

    // 4. Cache lookup
    const cached = this.cacheService.get(eventId, signature);
    if (cached) {
      logger.info('ai.task_priority.cache.hit', { eventId, signature });
      return { ...cached.payload, cache_hit: true, ai_recommendation_id: cached.ai_recommendation_id };
    }
    logger.info('ai.task_priority.cache.miss', { eventId, signature });

    // 5. AI generate
    const context = {
      event_title: event.title,
      event_date: event.event_date,
      tasks: tasks.map(t => ({
        task_id: t.id, title: t.title, due_date: t.due_date,
        priority: t.priority, status: t.status,
      })),
    };

    let parsedOutput;
    let localeFallback = false;
    try {
      const result = await this.aiProviderPort.generate({
        promptTemplate: TASK_PRIORITY_PROMPT_V1,
        context,
        locale: event.language,
      });
      parsedOutput = taskPriorityOutputSchema.parse(JSON.parse(result.output));

      // Validar task_ids ∈ set elegible
      const eligibleIds = new Set(tasks.map(t => t.id));
      const validTop = parsedOutput.top.filter(item => eligibleIds.has(item.task_id));
      if (validTop.length === 0) throw new Error('All task_ids invalid');
      parsedOutput.top = validTop.slice(0, 3);  // safety: max 3
      localeFallback = result.locale_fallback;
    } catch (err) {
      logger.warn('ai.task_priority.output_malformed', { eventId, error: err.message });
      parsedOutput = FALLBACK_PAYLOAD;
      localeFallback = true;
    }

    // 6. Persist AIRecommendation
    const aiRec = await prisma.ai_recommendations.create({
      data: {
        event_id: eventId,
        recommendation_type: 'task_priority',
        payload: {
          ...parsedOutput,
          task_ids_snapshot: tasks.map(t => t.id),
          signature,
          cache_hit: false,
          prompt_version: 'v1',
        },
        locale: event.language,
        locale_fallback: localeFallback,
      },
    });

    // 7. Cache populate
    this.cacheService.set(eventId, signature, {
      ai_recommendation_id: aiRec.id,
      payload: { ...parsedOutput, locale: event.language, locale_fallback: localeFallback },
    });

    logger.info('ai.task_priority.generated', { eventId, taskCount: tasks.length, localeFallback });

    return {
      ai_recommendation_id: aiRec.id,
      ...parsedOutput,
      locale: event.language,
      locale_fallback: localeFallback,
      cache_hit: false,
      generated_at: aiRec.created_at,
    };
  }
}
```

### Cache Service

```ts
// src/modules/ai/services/task-priority-cache.service.ts
class TaskPriorityCacheService {
  private cache = new Map<string, { value: any; expiresAt: number }>();
  private readonly TTL_MS = 5 * 60 * 1000;

  get(eventId: string, signature: string) {
    const key = `${eventId}:${signature}`;
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(eventId: string, signature: string, value: any) {
    const key = `${eventId}:${signature}`;
    this.cache.set(key, { value, expiresAt: Date.now() + this.TTL_MS });
  }
}
```

### Signature helper

```ts
function computeChecklistSignature(tasks: Array<{id:string;status:string;updated_at:Date}>): string {
  const sortedIds = tasks
    .map(t => `${t.id}|${t.status}|${t.updated_at.toISOString()}`)
    .sort();
  return crypto.createHash('sha256').update(sortedIds.join('\n')).digest('hex');
}
```

### Output Schema (Zod)

```ts
const topItemSchema = z.object({
  task_id: z.string().uuid(),
  reason: z.string().max(200),
  urgency_score: z.number().int().min(1).max(10),
});

export const taskPriorityOutputSchema = z.object({
  top: z.array(topItemSchema).max(3),
  rationale_summary: z.string().max(300).optional(),
});
```

### Prompt v1 (extracto)

```
Eres un asistente de gestión de tareas. El organizador "{{event_title}}" tiene un checklist activo con tareas pendientes.

IMPORTANTE: Tu rol es INFORMAR. NO marques tareas como hechas. NO reordenes el checklist oficial.

Identifica las 3 tareas MÁS urgentes (máximo 3) considerando:
- due_date próximo
- priority alta
- bloqueos dependientes
- estado in_progress

Devuelve estrictamente JSON:
{
  "top": [{ "task_id": "<uuid>", "reason": "...", "urgency_score": 1-10 }],
  "rationale_summary": "..." (opcional, max 300 chars)
}

Tareas:
{{tasks_json}}
```

(Instrucción de idioma inyectada por `composeLocaleInstruction` del helper US-084.)

### Routes

```ts
router.post(
  '/events/:id/ai/task-priority',
  organizerRoleGuard,
  aiRateLimit,
  asyncHandler(controller.prioritize.bind(controller))
);
```

### Error Handling
`400 INVALID_UUID`, `401`, `403`, `404 EVENT_NOT_FOUND`, `429 AI_RATE_LIMITED`.

---

## 8. Frontend Technical Design

### Componentes

```tsx
// components/organizer/ai/AITaskPriorityCard.tsx
'use client';

function AITaskPriorityCard({ eventId }: { eventId: string }) {
  const t = useTranslations('organizer.ai.task_priority');
  const { data, isLoading, error, mutate, isPending } = useTaskPriority({ eventId });

  useEffect(() => { mutate(); }, []);  // auto-fetch on mount

  if (isLoading || isPending) return <Skeleton count={3} />;
  if (error) return <ErrorBanner onRetry={() => mutate()} />;
  if (data?.top.length === 0) return <EmptyState />;

  return (
    <Card aria-labelledby="ai-priority-heading">
      <Heading id="ai-priority-heading">{t('title')}</Heading>
      <ul role="list">
        {data.top.map(item => (
          <li key={item.task_id}>
            <TaskLink taskId={item.task_id} />
            <UrgencyBadge score={item.urgency_score} />
            <p>{item.reason}</p>
            <button onClick={() => markDone(item.task_id)}>{t('mark_done')}</button>
          </li>
        ))}
      </ul>
      {data.rationale_summary && <footer>{data.rationale_summary}</footer>}
      <button onClick={() => mutate()}>{t('regenerate')}</button>
      {data.locale_fallback && <FallbackBadge />}
    </Card>
  );
}
```

### State Management
TanStack mutation + queryKey `['ai.task-priority', eventId]`.

### i18n
`organizer.ai.task_priority.*` en 4 locales: title, mark_done, regenerate, empty_state, error.

---

## 9. API Contract

| Method | Endpoint | Response | Errors |
|---|---|---|---|
| POST | `/api/v1/events/:id/ai/task-priority` | `200 {top, rationale_summary?, locale, locale_fallback, cache_hit, generated_at, ai_recommendation_id}` | 400, 401, 403, 404, 429 |

---

## 10. Database / Prisma Design

### Models Impacted
`AIRecommendation` (insert), `EventTask` (read), `Event` (read).

### Indexes
Reuso `(event_id, status)` ya existente.

### Migration
Sin migraciones obligatorias.

---

## 11. AI / PromptOps Design

### Prompt versioning
`TaskPriorityPrompt v1`.

### Output validation
Zod schema strict + validación adicional task_ids ∈ set elegible.

### Cache
5 min TTL con signature; key invalidada automáticamente al cambiar checklist.

### Rate limit
5 req/min/user heredado de US-022.

### Fallback
Template estático.

---

## 12. Security & Authorization Design

- Sesión organizer + ownership.
- Rate limit AI.
- `404 EVENT_NOT_FOUND` uniforme.
- HITL: NO altera tasks.

## 13. Testing Strategy

### Unit
- DTO + UseCase branches.
- Signature helper.
- Cache service (set/get/expiry).
- Output schema + task_ids validation.

### Integration
- TS-01..TS-06.

### AI Tests (mocks)
- AI-TS-01..AI-TS-04.

### API
Supertest.

### Security
- 404 uniforme + rate limit + HITL.

### Accessibility
- Card + role=list + axe.

### Performance
- Cache hit <200ms; miss <5s p95.

---

## 14. Observability & Audit

Logs `ai.task_priority.requested/cache.hit/cache.miss/generated/output_malformed`, `ai.locale.applied/fallback`.

---

## 15. Seed / Demo
Events demo con tasks en varios estados.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar endpoint task-priority | Documentar. | Actualizar. | No |
| `docs/7` (AI specs) | Documentar AI-008 prompt v1 + cache strategy | Documentar. | Actualizar. | No |
| PB-P2-002 Traceability | Backlog cita `FR-AI-020` inexistente | Trazabilidad real registrada. | Housekeeping. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Output AI con task_ids inválidos | Persist garbage | Validar contra set elegible + fallback |
| Cache stale tras race condition | UX mostraría top obsoleto | TTL 5min limita exposición + signature recompute en cada call |
| LLM ignora HITL "no decidas" | Rompe principio | Prompt explícito |
| Memory leak cache | OOM | TTL + lazy expiry; opcional: max size eviction |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/ai/dto/task-priority.body.ts` (puede ser empty `z.object({}).strict()`)
- `src/modules/ai/use-cases/prioritize-tasks.use-case.ts` (nuevo)
- `src/modules/ai/prompts/task-priority.v1.ts` (nuevo)
- `src/modules/ai/schemas/task-priority-output.schema.ts` (Zod)
- `src/modules/ai/services/task-priority-cache.service.ts` (nuevo)
- `src/shared/hash/checklist-signature.ts` (nuevo helper)
- `src/modules/ai/controllers/ai-task-priority.controller.ts` (nuevo)
- `src/modules/ai/routes/ai-task-priority.routes.ts` (nuevo)

**Frontend**:
- `components/organizer/ai/AITaskPriorityCard.tsx` (nuevo)
- `hooks/useTaskPriority.ts` (nuevo)
- `lib/api/aiApi.ts` (extender con `generateTaskPriority`)
- `messages/{4 locales}.json` (`organizer.ai.task_priority.*`)

### Orden sugerido
1. BE: Signature helper + UT.
2. BE: Output schema + UT.
3. BE: Prompt v1.
4. BE: Cache service + UT.
5. BE: UseCase + UT.
6. BE: Controller + ruta.
7. FE: API + MSW.
8. FE: Card + hook + i18n.
9. Tests IT + AI mocks + heurísticas locale.
10. Documentación.

### Decisiones que no deben reabrirse
D1–D9.

### Qué no implementar
- Auto-reorder.
- Push notifications.
- Edit del top.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| BE | 6 (Signature helper, Output schema, Prompt, Cache service, UseCase, Controller) |
| FE | 3 (Card + hook, API+MSW, i18n) |
| QA | 5 (UT, IT cache, AI mocks, AUTH+HITL, A11Y) |
| DOC | 1 |
| **Total** | 15 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| AI binding (US-084) | Pass |
| Cache strategy | Pass |
| Rate limit | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-024 entrega AI task priority Top 3 con HITL strict + cache signature 5min + locale binding US-084 + AIRecommendation audit + fallback. **Cierra PB-P2-002**.
