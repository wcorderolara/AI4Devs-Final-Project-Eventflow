// US-082 / QA-002 — Integration tests contra Postgres real: verifica los dos adapters
// nuevos (PrismaOrganizerLanguageLookup, PrismaEventLanguageReader) end-to-end contra el
// schema real. Cubre AC-01 (herencia desde organizer) y AC-05 (binding event.languageCode
// hacia el provider AI). Sigue el patrón `skipIf(!dbUp)` del repo — corre en CI donde hay
// Postgres, se salta silenciosamente en dev sin BD.
import { PrismaClient, Prisma } from '@prisma/client';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { PrismaOrganizerLanguageLookup } from '../../src/modules/event-planning/infrastructure/prisma-organizer-language.lookup.js';
import { PrismaEventLanguageReader } from '../../src/infrastructure/readers/prisma-access-readers.js';

const prisma = new PrismaClient();

let dbUp = false;
try {
  await Promise.race([
    prisma.$queryRawUnsafe('SELECT 1'),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
  ]);
  dbUp = true;
} catch {
  dbUp = false;
}

const suffix = `us082_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

describe.skipIf(!dbUp)('US-082 QA-002 — adapters idioma (Postgres test)', () => {
  let userId: string;
  let eventTypeId: string;
  let locationId: string;

  beforeAll(async () => {
    // Reusa un event_type y location activos ya sembrados; falla explícita si no hay catálogos.
    const et = await prisma.eventType.findFirst({ where: { isActive: true, deletedAt: null }, select: { id: true } });
    const loc = await prisma.location.findFirst({ where: { deletedAt: null }, select: { id: true } });
    if (!et || !loc) throw new Error('Catalogs missing — seed required for US-082 IT');
    eventTypeId = et.id;
    locationId = loc.id;
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      `DELETE FROM events WHERE title LIKE '${suffix}_%'`,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM users WHERE email LIKE '${suffix}_%@eventflow.test'`,
    );
    await prisma.$disconnect();
  });

  it('AC-01 herencia: PrismaOrganizerLanguageLookup devuelve preferredLanguage del user (pt)', async () => {
    const user = await prisma.user.create({
      data: {
        email: `${suffix}_org_pt@eventflow.test`,
        passwordHash: 'x',
        fullName: 'US082 Org PT',
        role: 'organizer',
        preferredLanguage: 'pt',
      },
      select: { id: true },
    });
    userId = user.id;

    const lookup = new PrismaOrganizerLanguageLookup(prisma);
    const found = await lookup.findPreferredLanguage(userId);
    expect(found).toBe('pt');
  });

  it('PrismaOrganizerLanguageLookup devuelve null para usuario inexistente', async () => {
    const lookup = new PrismaOrganizerLanguageLookup(prisma);
    // UUID que no existe en users.
    const found = await lookup.findPreferredLanguage('00000000-0000-4000-8000-000000000000');
    expect(found).toBeNull();
  });

  it('AC-05 binding: PrismaEventLanguageReader devuelve event.languageCode traducido al código API', async () => {
    // Crear un event con language='pt' (Prisma enum: 'pt').
    const owner = await prisma.user.create({
      data: {
        email: `${suffix}_owner@eventflow.test`,
        passwordHash: 'x',
        fullName: 'US082 Owner',
        role: 'organizer',
      },
      select: { id: true },
    });
    const event = await prisma.event.create({
      data: {
        userId: owner.id,
        eventTypeId,
        locationId,
        title: `${suffix}_evt_pt`,
        status: 'draft',
        currency: 'GTQ',
        language: 'pt',
        guestsCount: 100,
        estimatedBudget: new Prisma.Decimal('1000.00'),
      },
      select: { id: true },
    });

    const reader = new PrismaEventLanguageReader(prisma);
    const found = await reader.getLanguage(event.id);
    expect(found).toBe('pt');
  });

  it('PrismaEventLanguageReader devuelve null si el evento no existe', async () => {
    const reader = new PrismaEventLanguageReader(prisma);
    const found = await reader.getLanguage('00000000-0000-4000-8000-000000000000');
    expect(found).toBeNull();
  });
});
