// Fixture HTTP de eventos: crea un evento del organizer autenticado y lo activa.
// Requiere el event_type `wedding` y la location semillados por el spec (DB-gated).
import type { Agent } from '../http.js';

export interface ActiveEventOverrides {
  guestsCount?: number;
  estimatedBudget?: string;
}

/** POST /events + /activate con el `agent` dueño; devuelve el id del evento. */
export async function createActiveEvent(
  agent: Agent,
  locationId: string,
  overrides: ActiveEventOverrides = {},
): Promise<string> {
  const created = await agent.post('/api/v1/events').send({
    eventTypeCode: 'wedding',
    eventDate: '2026-12-31',
    guestsCount: overrides.guestsCount ?? 100,
    locationId,
    estimatedBudget: overrides.estimatedBudget ?? '10000.00',
    currencyCode: 'GTQ',
    languageCode: 'es-LATAM',
  });
  const id = created.body.data.id as string;
  await agent.post(`/api/v1/events/${id}/activate`);
  return id;
}
