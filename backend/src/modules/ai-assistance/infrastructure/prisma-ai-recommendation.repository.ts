// Adapter Prisma — AIRecommendationRepository (US-097 / BE-002). `kind`=type; `ai_meta` JSONB.
import { Prisma, type PrismaClient, type AIRecommendation as PrismaRec } from '@prisma/client';
import type { AIRecommendationRepository } from '../ports/ai-recommendation.repository.js';
import type { AiMeta, AiRecommendationView, CreateAiRecommendationData } from '../domain/ai-recommendation.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

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
}
