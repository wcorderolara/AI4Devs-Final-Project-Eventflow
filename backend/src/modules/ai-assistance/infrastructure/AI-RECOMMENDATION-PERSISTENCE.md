# AIRecommendation — persistencia con metadata completa (US-122 / PB-P0-010)

Capacidad **backend-only** para persistir cada resultado IA validado como `AIRecommendation`
trazable, en estado **HITL `pending`**, sin materializar datos oficiales del dominio. Consume la
metadata de prompt version de US-121 (ADR-AI-006) y la metadata de ejecución del provider (US-117).

> Alcance US-122: NO invoca `LLMProvider`, NO orquesta fallback/retry/timeout, NO implementa
> PromptRegistry, NO crea endpoints/UI, NO implementa accept/edit/discard y NO materializa dominio.

## Componentes

| Archivo | Responsabilidad |
|---|---|
| `application/persist-ai-recommendation.service.ts` | `PersistAIRecommendationService.persist()` / `persistFailure()` — validación, output validado, estado pending, contexto por tipo, delega al repo. |
| `application/ai-recommendation-payload-sanitizer.ts` | Minimiza/redacta `inputPayload` (AC-06). |
| `application/ai-recommendation-persist-logger.ts` | Logs seguros `ai.recommendation.persisted` / `persist_failed`. |
| `ports/ai-recommendation.repository.ts` | Port extendido: `create`/`createFailed`/`existsPromptVersion`/`upsertPromptVersion` (+ `tx`). |
| `infrastructure/prisma-ai-recommendation.repository.ts` | Adapter Prisma con transaction client. |
| `infrastructure/ai-prompt-version-sync.ts` | Sync idempotente del export `AIPromptVersion` de US-121 (bridge AC-03/AC-07). |
| `domain/errors/ai-recommendation-persistence.errors.ts` | Errores tipados controlados. |

## Estado HITL inicial — mapping `status` vs `accepted` (DOC-001)

El schema real (`prisma/schema.prisma`) usa el enum **`AIRecommendationStatus`**
(`pending | accepted | edited | rejected | discarded | failed | expired`) — **no** un boolean
`accepted`. Por tanto:

- Semántica primaria: **`status = pending`** al crear (AC-02). No existe columna `accepted`; la
  equivalencia "`accepted = false`" de la User Story se representa como `status = pending`.
- Las transiciones (accept/edit/discard/reject) pertenecen a historias HITL posteriores; US-122 sólo
  crea el estado inicial y NO materializa entidades oficiales.
- `failed` se usa para failure records controlados (AC-08).

## Minimización y seguridad de payload (DOC-002)

- `inputPayload` se **sanitiza/minimiza** antes de persistir: se remueven claves sensibles
  (secrets, tokens, cookies, API keys, credenciales, PII de contacto) a cualquier profundidad, y se
  poda anidamiento/tamaño excesivo (anti full-domain-object). Ver `ai-recommendation-payload-sanitizer.ts`.
- `outputPayload` se persiste **sólo si** está validado por el schema del feature (`OUTPUT_SCHEMAS`).
  Output inválido → `AIRecommendationInvalidOutputError`, **no** se crea record `pending`.
- **Failure records** (`status=failed`) guardan **sólo metadata segura** (error code, provider,
  prompt version, correlation, timing). Nunca raw provider output ni input sensible.
- Logs y errores transportan sólo metadata segura (id, type, provider, fallbackUsed, latency,
  timeout, correlationId, status, errorCode) — nunca prompt completo, payload completo ni secrets.

## Mapping de schema (Deviations)

- **D1 — columnas:** provider / languageCode / fallbackUsed / latencyMs / correlationId / tokenCount
  se persisten dentro de `ai_meta` (JSONB); `timeoutMs` es columna. NO existe columna `quoteId`
  (sólo `quoteRequestId`). `kind` (String) = `type`.
- **D2 — ubicación:** se EXTIENDE el `PrismaAIRecommendationRepository` y el port existentes (US-097)
  en lugar de crear un repository paralelo, para evitar duplicación (US-097 usaba un AIPromptVersion
  placeholder; US-122 habilita el linkage real vía `ai-prompt-version-sync`).
- **D3 — provider en success:** `anthropic` es stub no funcional (US/spec §11); sólo se admite en
  failure records, no como record `pending` exitoso.

## Linkage de prompt version (AC-03 / AC-07)

`syncPromptVersionsFromRegistry(repo)` materializa (upsert idempotente) el export determinístico de
US-121 en la tabla `AIPromptVersion`. El service valida `existsPromptVersion(promptVersionId)` antes
de insertar; ausencia/inexistencia → `AIPromptVersionNotFoundError`. Así cada `AIRecommendation`
referencia una versión de prompt real y reproducible para auditoría.

## Uso (por use cases IA futuros)

```ts
const repo = new PrismaAIRecommendationRepository();
await syncPromptVersionsFromRegistry(repo);            // una vez / en seed (bridge US-121)
const service = new PersistAIRecommendationService(repo);
await service.persist({ requestedByUserId, type, promptVersionId, provider, languageCode,
  fallbackUsed, timeoutMs, latencyMs, correlationId, inputPayload, outputPayload, schemaValid: true,
  eventId /* o vendorProfileId / quoteRequestId según scope */ });
```
