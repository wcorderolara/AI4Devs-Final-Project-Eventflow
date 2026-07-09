// Helpers de autorización cross-cutting (US-096 / SEC-001/002). Ownership de evento (organizer) y
// assignment de vendor. Recurso inaccesible → masked 404; vendor sin perfil → 403.
import type { EventAccessReader, VendorProfileReader } from './readers.js';
import { NotFoundError } from '../domain/errors/not-found.error.js';
import { ForbiddenError } from '../domain/errors/forbidden.error.js';

export async function requireEventOwner(
  events: EventAccessReader,
  eventId: string,
  userId: string,
): Promise<void> {
  const ownerId = await events.getOwnerId(eventId);
  if (ownerId !== userId) throw new NotFoundError('Not found');
}

export async function requireVendorProfileId(
  vendors: VendorProfileReader,
  userId: string,
): Promise<string> {
  const id = await vendors.getVendorProfileIdForUser(userId);
  if (!id) throw new ForbiddenError();
  return id;
}
