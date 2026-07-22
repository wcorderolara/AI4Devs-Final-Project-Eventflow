// Adapter Prisma — AIRecommendationRepository (US-097 / BE-002; extendido US-122 / DB-002). `kind`=type;
// `ai_meta` JSONB (provider/fallback/latency/language/correlation; Deviation D1). US-122 agrega
// `create`/`createFailed`/`existsPromptVersion`/`upsertPromptVersion` con transaction client opcional.
import { Prisma, type PrismaClient, type AIRecommendation as PrismaRec } from '@prisma/client';
import type { AIRecommendationRepository, RepositoryWriteOptions } from '../ports/ai-recommendation.repository.js';
import type {
  AiMeta,
  AiMetaFull,
  AiRecommendationView,
  CreateAiRecommendationData,
  PersistAiRecommendationInput,
  PersistAiRecommendationFailureInput,
  AIPromptVersionSyncRow,
} from '../domain/ai-recommendation.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

/** Cliente de escritura: transaction client si se provee, si no el PrismaClient base. */
type WriteClient = PrismaClient | Prisma.TransactionClient;

function toView(r: PrismaRec): AiRecommendationView {
  return {
    id: r.id,
    type: r.kind,
    status: r.status,
    requestedByUserId: r.requestedByUserId,
    eventId: r.eventId ?? null,
    vendorProfileId: r.vendorProfileId ?? null,
    quoteRequestId: r.quoteRequestId ?? null,
    input: r.inputPayload,
    output: r.outputPayload,
    aiMeta: (r.aiMeta as AiMeta | null) ?? null,
    // US-084: expone las columnas denormalizadas hacia el dominio/use cases/tests.
    locale: r.locale,
    localeFallback: r.localeFallback,
    createdAt: r.createdAt.toISOString(),
  };
}

export class PrismaAIRecommendationRepository implements AIRecommendationRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  private db(options?: RepositoryWriteOptions): WriteClient {
    return options?.tx ?? this.prisma;
  }

  /**
   * `ai_prompt_version_id` es requerido (invariante US-099) pero el prompt registry real es
   * PB-P0-010. US-097 usa un AIPromptVersion placeholder estático (upsert idempotente) hasta
   * entonces — la promptVersion "real" viaja además en `aiMeta.promptVersion`.
   */
  private async placeholderPromptVersionId(): Promise<string> {
    const pv = await this.prisma.aIPromptVersion.upsert({
      where: { promptKey_version: { promptKey: 'us097-endpoint-foundation', version: 'v1' } },
      update: {},
      create: {
        promptId: '00000000-0000-4000-8000-000000000097',
        promptKey: 'us097-endpoint-foundation',
        version: 'v1',
        status: 'active',
        provider: 'mock',
        templateChecksum: 'us097-static-placeholder',
        description: 'Placeholder prompt version (US-097; real registry en PB-P0-010)',
      },
      select: { id: true },
    });
    return pv.id;
  }

  async createPending(data: CreateAiRecommendationData): Promise<AiRecommendationView> {
    const aiPromptVersionId = await this.placeholderPromptVersionId();
    const rec = await this.prisma.aIRecommendation.create({
      data: {
        requestedByUserId: data.requestedByUserId,
        aiPromptVersionId,
        eventId: data.eventId,
        vendorProfileId: data.vendorProfileId,
        quoteRequestId: data.quoteRequestId,
        kind: data.type,
        inputPayload: data.input as Prisma.InputJsonValue,
        outputPayload: data.output as Prisma.InputJsonValue,
        aiMeta: data.aiMeta as unknown as Prisma.InputJsonValue,
        status: 'pending',
        // US-084 (PB-P1-049 / BE-004 · AC-03, AC-05): denormaliza a columnas dedicadas.
        locale: data.aiMeta.languageCode,
        localeFallback: data.aiMeta.fallbackUsed,
      },
    });
    return toView(rec);
  }

  async findById(id: string): Promise<AiRecommendationView | null> {
    const rec = await this.prisma.aIRecommendation.findUnique({ where: { id } });
    return rec ? toView(rec) : null;
  }

  async markStatus(id: string, status: 'accepted' | 'discarded'): Promise<AiRecommendationView> {
    const rec = await this.prisma.aIRecommendation.update({ where: { id }, data: { status } });
    return toView(rec);
  }

  // ── US-122 — persistencia con metadata completa ────────────────────────────

  async create(input: PersistAiRecommendationInput, options?: RepositoryWriteOptions): Promise<AiRecommendationView> {
    const aiMeta: AiMetaFull = {
      provider: input.provider,
      promptVersion: input.promptVersionLabel ?? input.promptVersionId,
      latencyMs: input.latencyMs,
      fallbackUsed: input.fallbackUsed,
      languageCode: input.languageCode,
      correlationId: input.correlationId,
      timeoutMs: input.timeoutMs,
      tokenCount: input.tokenCount,
    };
    const rec = await this.db(options).aIRecommendation.create({
      data: {
        requestedByUserId: input.requestedByUserId,
        aiPromptVersionId: input.promptVersionId,
        eventId: input.eventId ?? null,
        vendorProfileId: input.vendorProfileId ?? null,
        quoteRequestId: input.quoteRequestId ?? null,
        kind: input.type,
        inputPayload: input.inputPayload as Prisma.InputJsonValue,
        outputPayload: input.outputPayload as Prisma.InputJsonValue,
        aiMeta: aiMeta as unknown as Prisma.InputJsonValue,
        status: 'pending',
        timeoutMs: input.timeoutMs,
        isSeed: input.isSeed ?? false,
        // US-084 (BE-004 · AC-03/AC-05): columnas denormalizadas para auditoría i18n.
        locale: input.languageCode,
        localeFallback: input.fallbackUsed,
      },
    });
    return toView(rec);
  }

  async createFailed(
    input: PersistAiRecommendationFailureInput,
    options?: RepositoryWriteOptions,
  ): Promise<AiRecommendationView> {
    // Sólo metadata segura: sin raw output ni input sensible (AC-08). outputPayload no puede ser null
    // en el schema (JsonB requerido); se persiste un objeto seguro con el error code.
    const aiMeta: AiMetaFull = {
      provider: input.provider,
      promptVersion: input.promptVersionId,
      latencyMs: input.latencyMs,
      fallbackUsed: input.fallbackUsed,
      languageCode: input.languageCode,
      correlationId: input.correlationId,
      timeoutMs: input.timeoutMs,
      errorCode: input.errorCode,
    };
    const rec = await this.db(options).aIRecommendation.create({
      data: {
        requestedByUserId: input.requestedByUserId,
        aiPromptVersionId: input.promptVersionId,
        eventId: input.eventId ?? null,
        vendorProfileId: input.vendorProfileId ?? null,
        quoteRequestId: input.quoteRequestId ?? null,
        kind: input.type,
        inputPayload: {} as Prisma.InputJsonValue,
        outputPayload: { errorCode: input.errorCode } as Prisma.InputJsonValue,
        aiMeta: aiMeta as unknown as Prisma.InputJsonValue,
        status: 'failed',
        timeoutMs: input.timeoutMs,
        isSeed: input.isSeed ?? false,
        // US-084 (BE-004 · AC-05): incluso en `failed`, se persiste el locale solicitado y el
        // flag de fallback para observabilidad. `fallbackUsed=true` en records fallidos indica
        // que el path degradó al mock antes de fallar; ambos casos son auditables.
        locale: input.languageCode,
        localeFallback: input.fallbackUsed,
      },
    });
    return toView(rec);
  }

  async existsPromptVersion(promptVersionId: string, options?: RepositoryWriteOptions): Promise<boolean> {
    const count = await this.db(options).aIPromptVersion.count({ where: { id: promptVersionId } });
    return count > 0;
  }

  /**
   * US-059 (PB-P2-001 / BE-002): último `AIRecommendation` por `(event_id, kind,
   * inputPayload.category_code)` ordenado por `createdAt DESC`. Usa Prisma JSON filter
   * `path: ['category_code']` sobre `input_payload` — apoyado por el índice combinado
   * `(event_id, recommendation_type, created_at DESC)` para la selección; el filtro por
   * `category_code` reduce el resultset dentro del cubo (event, kind).
   */
  async findLatestByEventTypeAndCategory(input: {
    eventId: string;
    kind: string;
    categoryCode: string;
  }): Promise<AiRecommendationView | null> {
    const rec = await this.prisma.aIRecommendation.findFirst({
      where: {
        eventId: input.eventId,
        kind: input.kind,
        inputPayload: { path: ['category_code'], equals: input.categoryCode },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rec ? toView(rec) : null;
  }

  // ── US-026 (PB-P2-003) — Linaje de regeneración ───────────────────────────

  async countLineageChildren(input: {
    rootRecommendationId: string;
    options?: RepositoryWriteOptions;
  }): Promise<number> {
    const client = this.db(input.options);
    // Cuenta descendientes del linaje (excluye la raíz para preservar la semántica del cap D2:
    // "hasta 5 REGENERACIONES por linaje raíz" — la raíz misma no cuenta como regeneración).
    return client.aIRecommendation.count({
      where: {
        rootRecommendationId: input.rootRecommendationId,
        id: { not: input.rootRecommendationId },
      },
    });
  }

  async createRegeneration(
    input: CreateAiRecommendationData & {
      parentRecommendationId: string;
      rootRecommendationId: string;
      regenerationFeedback: string | null;
    },
    options?: RepositoryWriteOptions,
  ): Promise<AiRecommendationView> {
    // Reuso del placeholder promptVersion de US-097 — el registry real (PB-P0-010) sirve la
    // versión "real" en aiMeta.promptVersion; el `aiPromptVersionId` es un FK obligatorio del
    // schema (invariante US-099) que se satisface con el placeholder estático.
    const aiPromptVersionId = await this.placeholderPromptVersionId();
    const rec = await this.db(options).aIRecommendation.create({
      data: {
        requestedByUserId: input.requestedByUserId,
        aiPromptVersionId,
        eventId: input.eventId,
        vendorProfileId: input.vendorProfileId,
        quoteRequestId: input.quoteRequestId,
        kind: input.type,
        inputPayload: input.input as Prisma.InputJsonValue,
        outputPayload: input.output as Prisma.InputJsonValue,
        aiMeta: input.aiMeta as unknown as Prisma.InputJsonValue,
        status: 'pending',
        locale: input.aiMeta.languageCode,
        localeFallback: input.aiMeta.fallbackUsed,
        // US-026 (DB-001): linaje explícito.
        parentRecommendationId: input.parentRecommendationId,
        rootRecommendationId: input.rootRecommendationId,
        regenerationFeedback: input.regenerationFeedback,
      },
    });
    return toView(rec);
  }

  async findByIdWithLineage(id: string): Promise<{
    view: AiRecommendationView;
    parentRecommendationId: string | null;
    rootRecommendationId: string | null;
    regenerationFeedback: string | null;
  } | null> {
    const rec = await this.prisma.aIRecommendation.findUnique({ where: { id } });
    if (!rec) return null;
    return {
      view: toView(rec),
      parentRecommendationId: rec.parentRecommendationId ?? null,
      rootRecommendationId: rec.rootRecommendationId ?? null,
      regenerationFeedback: rec.regenerationFeedback ?? null,
    };
  }

  async upsertPromptVersion(row: AIPromptVersionSyncRow, options?: RepositoryWriteOptions): Promise<void> {
    // Idempotente por (promptKey, version); no muta versiones históricas de forma insegura.
    await this.db(options).aIPromptVersion.upsert({
      where: { promptKey_version: { promptKey: row.promptKey, version: row.version } },
      update: { status: row.status, templateChecksum: row.templateChecksum, description: row.description },
      create: {
        id: row.id,
        promptId: row.promptId,
        promptKey: row.promptKey,
        version: row.version,
        status: row.status,
        provider: row.provider,
        templateChecksum: row.templateChecksum,
        description: row.description,
      },
    });
  }
}
