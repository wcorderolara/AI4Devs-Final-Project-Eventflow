// CreateEventUseCase (US-095 / BE-004; US-082 D3). AC-01; EC-04. Valida catálogos (EventType
// activo por code, Location activa), resuelve FKs y persiste un evento `draft` con
// `autoCompleted=false` e `currencyCode` inmutable. El role/ownership los aplican los guards
// antes del use case.
//
// US-082 D3: el `languageCode` es opcional en el body. Si viene, se usa (source='body'). Si no,
// se hereda de `organizer.preferredLanguage` vía `OrganizerLanguageLookup` (source='inherited').
// Si el organizer no tiene preferencia resoluble (usuario no encontrado o sin lookup), se aplica
// el fallback `es-LATAM` (source='default', EC-01). Se emite `event.language.set` con la fuente.
import type {
  EventRepository,
  EventTypeRepository,
  LocationRepository,
} from '../ports/event.repository.js';
import type { OrganizerLanguageLookup } from '../ports/organizer-language.lookup.js';
import type {
  EventAuditLogger,
  EventLanguageSource,
} from '../ports/event-audit-logger.js';
import type { EventView } from '../domain/event.js';
import type { CreateEventRequest } from '../dto/index.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';
import type { EventUseCaseContext } from './context.js';

const FALLBACK_LANGUAGE: SupportedLanguage = 'es-LATAM';

export class CreateEventUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly eventTypes: EventTypeRepository,
    private readonly locations: LocationRepository,
    private readonly audit: EventAuditLogger,
    // Opcional para permitir composición y tests unitarios con fakes que no requieren lookup real.
    // Si se omite, el use case solo puede resolver `body → 'es-LATAM'` (sin herencia).
    private readonly organizerLanguage?: OrganizerLanguageLookup,
  ) {}

  async execute(
    ownerId: string,
    input: CreateEventRequest,
    ctx: EventUseCaseContext = {},
  ): Promise<EventView> {
    const eventTypeId = await this.eventTypes.findActiveIdByCode(input.eventTypeCode);
    if (!eventTypeId) {
      throw new NotFoundError('Event type not found');
    }
    const locationExists = await this.locations.existsActive(input.locationId);
    if (!locationExists) {
      throw new NotFoundError('Location not found');
    }

    const { language, source } = await this.resolveLanguage(ownerId, input.languageCode);

    const view = await this.events.create({
      ownerId,
      eventTypeId,
      name: input.name?.trim() || `Evento ${input.eventTypeCode}`,
      eventDate: input.eventDate,
      guestsCount: input.guestsCount,
      locationId: input.locationId,
      estimatedBudget: input.estimatedBudget,
      currency: input.currencyCode,
      language,
      notes: input.notes ?? null,
    });

    this.audit.emit('event.created', {
      correlationId: ctx.correlationId,
      actorId: ownerId,
      eventId: view.id,
    });
    this.audit.emit('event.language.set', {
      correlationId: ctx.correlationId,
      actorId: ownerId,
      eventId: view.id,
      languageSource: source,
      toLanguage: language,
    });
    return view;
  }

  private async resolveLanguage(
    ownerId: string,
    fromBody: SupportedLanguage | undefined,
  ): Promise<{ language: SupportedLanguage; source: EventLanguageSource }> {
    if (fromBody) return { language: fromBody, source: 'body' };
    if (this.organizerLanguage) {
      const inherited = await this.organizerLanguage.findPreferredLanguage(ownerId);
      if (inherited) return { language: inherited, source: 'inherited' };
    }
    return { language: FALLBACK_LANGUAGE, source: 'default' };
  }
}
