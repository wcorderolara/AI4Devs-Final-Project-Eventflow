// US-025 (PB-P1-016 / BE-001) — Adapter Prisma del `AIRecommendationHITLRepository`. Usa
// `updateMany({ where: { id, status: 'pending' } })` para idempotencia natural sin `If-Match`
// (Doc 16 §35.3). Los campos HITL (`edited`, `applied_entity_type`, `applied_entity_id`,
// `decided_by_user_id`, `decided_at`) se persisten dentro de `ai_meta` JSON (DEV-01 de US-025).
import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  AIRecommendationHITLRepository,
  HitlUpdateResult,
  MarkAcceptedInput,
  MarkDiscardedInput,
} from '../ports/ai-recommendation-hitl.repository.js';
import type { AiRecommendationView, AiMeta } from '../domain/ai-recommendation.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

interface HitlAiMetaExtension {
  edited?: boolean;
  appliedEntityType?: string | null;
  appliedEntityId?: string | null;
  decidedByUserId?: string;
  /** ISO-8601 UTC. */
  decidedAt?: string;
}

function toView(r: {
  id: string;
  eventId: string | null;
  vendorProfileId: string | null;
  quoteRequestId: string | null;
  requestedByUserId: string;
  kind: string;
  status: string;
  inputPayload: unknown;
  outputPayload: unknown;
  aiMeta: unknown;
  createdAt: Date;
}): AiRecommendationView {
  return {
    id: r.id,
    type: r.kind,
    status: r.status as AiRecommendationView['status'],
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

export class PrismaAIRecommendationHitlRepository implements AIRecommendationHITLRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findById(id: string): Promise<AiRecommendationView | null> {
    const rec = await this.prisma.aIRecommendation.findUnique({ where: { id } });
    return rec ? toView(rec) : null;
  }

  async markAccepted(tx: Prisma.TransactionClient, input: MarkAcceptedInput): Promise<HitlUpdateResult> {
    const existing = await tx.aIRecommendation.findUnique({ where: { id: input.id }, select: { aiMeta: true } });
    const prevMeta = ((existing?.aiMeta as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
    const nextMeta: Record<string, unknown> = {
      ...prevMeta,
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      ...({
        edited: input.edited,
        appliedEntityType: input.appliedEntityType,
        appliedEntityId: input.appliedEntityId,
        decidedByUserId: input.actorId,
        decidedAt: new Date().toISOString(),
      } satisfies HitlAiMetaExtension),
    };
    const data: Prisma.AIRecommendationUpdateManyMutationInput = {
      status: 'accepted',
      aiMeta: nextMeta as unknown as Prisma.InputJsonValue,
      ...(input.overwriteOutputPayload
        ? { outputPayload: input.finalOutput as unknown as Prisma.InputJsonValue }
        : {}),
    };
    const result = await tx.aIRecommendation.updateMany({
      where: { id: input.id, status: 'pending' },
      data,
    });
    return { updatedCount: result.count };
  }

  async markDiscarded(tx: Prisma.TransactionClient, input: MarkDiscardedInput): Promise<HitlUpdateResult> {
    const existing = await tx.aIRecommendation.findUnique({ where: { id: input.id }, select: { aiMeta: true } });
    const prevMeta = ((existing?.aiMeta as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
    const nextMeta: Record<string, unknown> = {
      ...prevMeta,
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      ...({
        decidedByUserId: input.actorId,
        decidedAt: new Date().toISOString(),
      } satisfies HitlAiMetaExtension),
    };
    const result = await tx.aIRecommendation.updateMany({
      where: { id: input.id, status: 'pending' },
      data: {
        status: 'discarded',
        aiMeta: nextMeta as unknown as Prisma.InputJsonValue,
      },
    });
    return { updatedCount: result.count };
  }
}
