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
      },
    });
    return toView(rec);
  }

  async existsPromptVersion(promptVersionId: string, options?: RepositoryWriteOptions): Promise<boolean> {
    const count = await this.db(options).aIPromptVersion.count({ where: { id: promptVersionId } });
    return count > 0;
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
