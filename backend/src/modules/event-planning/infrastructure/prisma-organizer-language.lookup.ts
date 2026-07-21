// Adapter Prisma — OrganizerLanguageLookup (US-082 / BE-002; D3). Devuelve el `preferredLanguage`
// del usuario (mapeado del enum Prisma al código API) o `null` si el usuario no existe. NO valida
// role/estado — el guard de rol ya se aplicó en la ruta.
import type { PrismaClient } from '@prisma/client';
import type { OrganizerLanguageLookup } from '../ports/organizer-language.lookup.js';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';
import {
  PRISMA_TO_API_LANGUAGE,
  type PrismaLanguage,
} from '../../../shared/constants/languages.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

export class PrismaOrganizerLanguageLookup implements OrganizerLanguageLookup {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findPreferredLanguage(userId: string): Promise<SupportedLanguage | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredLanguage: true },
    });
    if (!row) return null;
    return PRISMA_TO_API_LANGUAGE[row.preferredLanguage as PrismaLanguage] ?? null;
  }
}
