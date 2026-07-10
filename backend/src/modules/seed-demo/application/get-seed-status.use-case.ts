// US-086 (PB-P0-014) BE-006 — Estado del seed tras el reset. Deriva `lastRunAt` del último
// `AdminAction` con `action='SEED_RESET'` y `recordCount` por entidad contando filas `is_seed=true`.
import type { PrismaClient } from '@prisma/client';
import type { SeedStatusResponseDto } from '../interface/seed-demo.dto.js';

export class GetSeedStatusUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(): Promise<SeedStatusResponseDto> {
    const lastReset = await this.prisma.adminAction.findFirst({
      where: { action: 'SEED_RESET', targetEntity: 'seed-demo' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const [users, events, vendorProfiles, quoteRequests, quotes, bookingIntents, reviews, aiRecommendations, serviceCategories, eventTypes] =
      await Promise.all([
        this.prisma.user.count({ where: { isSeed: true } }),
        this.prisma.event.count({ where: { isSeed: true } }),
        this.prisma.vendorProfile.count({ where: { isSeed: true } }),
        this.prisma.quoteRequest.count({ where: { isSeed: true } }),
        this.prisma.quote.count({ where: { isSeed: true } }),
        this.prisma.bookingIntent.count({ where: { isSeed: true } }),
        this.prisma.review.count({ where: { isSeed: true } }),
        this.prisma.aIRecommendation.count({ where: { isSeed: true } }),
        this.prisma.serviceCategory.count({ where: { isSeed: true } }),
        this.prisma.eventType.count({ where: { isSeed: true } }),
      ]);

    return {
      lastRunAt: lastReset ? lastReset.createdAt.toISOString() : null,
      preset: null, // MVP: preset no persistido (Doc 16 §39.3 lo admite null).
      recordCount: {
        users,
        events,
        vendorProfiles,
        quoteRequests,
        quotes,
        bookingIntents,
        reviews,
        aiRecommendations,
        serviceCategories,
        eventTypes,
      },
    };
  }
}
