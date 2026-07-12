// Adapter Prisma — PasswordResetTokenRepository (US-094 / BE-003). AC-06/AC-07; EC-06.
// Persiste SOLO el hash del token. `consumeAndUpdatePassword` ejecuta en UNA transacción el
// consumo del token (guard contra reuso) + el cambio de hash de contraseña (atomicidad AC-07).
import type { PrismaClient } from '@prisma/client';
import type { PasswordResetTokenRepository } from '../../shared/auth/ports.js';
import { UnauthorizedError } from '../../shared/domain/errors/unauthorized.error.js';
import { prisma as defaultPrisma } from '../prisma/client.js';

export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.prisma.passwordResetToken.create({
      data: { userId: input.userId, tokenHash: input.tokenHash, expiresAt: input.expiresAt },
    });
  }

  async findValidByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<{ id: string; userId: string } | null> {
    const token = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, consumedAt: null, expiresAt: { gt: now } },
      select: { id: true, userId: true },
    });
    return token ?? null;
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<{ id: string; userId: string; expiresAt: Date; consumedAt: Date | null } | null> {
    // US-004 EC-01..03: lookup sin filtro de estado para diferenciar inválido/usado/expirado.
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, consumedAt: true },
    });
    return token ?? null;
  }

  async consumeAndUpdatePassword(input: {
    tokenId: string;
    userId: string;
    passwordHash: string;
    now: Date;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Guard atómico contra reuso: consume solo si el token sigue sin consumir.
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: input.tokenId, consumedAt: null },
        data: { consumedAt: input.now },
      });
      if (consumed.count === 0) {
        // Otra transacción ya lo consumió (carrera) → rechazo genérico.
        throw new UnauthorizedError('Invalid or expired reset token');
      }
      await tx.user.update({
        where: { id: input.userId },
        data: { passwordHash: input.passwordHash },
      });
      // Revoca todas las sesiones activas del usuario tras un reset (higiene de seguridad).
      await tx.session.updateMany({
        where: { userId: input.userId, revokedAt: null },
        data: { revokedAt: input.now },
      });
    });
  }
}
