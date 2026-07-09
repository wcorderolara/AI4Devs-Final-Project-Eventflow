// Adapter Prisma — SessionRepository (US-094 / BE-003, SEC-001). Sesión server-side para el
// transporte por cookie firmada. `findValid` resuelve identidad + rol (join a User) solo si la
// sesión no está revocada ni expirada; `revoke` habilita logout efectivo (AC-05 → 401 posterior).
import type { PrismaClient } from '@prisma/client';
import type { SessionRepository } from '../../shared/auth/ports.js';
import type { ResolvedSession } from '../../shared/auth/types.js';
import { prisma as defaultPrisma } from '../prisma/client.js';

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async create(input: { userId: string; expiresAt: Date }): Promise<{ id: string }> {
    const session = await this.prisma.session.create({
      data: { userId: input.userId, expiresAt: input.expiresAt },
      select: { id: true },
    });
    return { id: session.id };
  }

  async findValid(sessionId: string, now: Date): Promise<ResolvedSession | null> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, revokedAt: null, expiresAt: { gt: now } },
      select: { userId: true, user: { select: { role: true } } },
    });
    if (!session) return null;
    return { userId: session.userId, role: session.user.role };
  }

  async revoke(sessionId: string, now: Date): Promise<void> {
    // Idempotente: solo marca las sesiones aún no revocadas. `updateMany` no falla si no existe.
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
