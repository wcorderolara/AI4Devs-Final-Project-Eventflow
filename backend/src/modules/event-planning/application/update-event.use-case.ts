// UpdateEventUseCase (US-095 / BE-004; US-082 D2). AC-04/AC-05; EC-03/EC-04/EC-05.
// Reglas: `currencyCode` presente → 409 CURRENCY_IMMUTABLE (antes de tocar la BD); ownership
// masked 404; estados terminales no editables → 422 para campos genéricos, 409
// EVENT_LANGUAGE_NOT_EDITABLE cuando específicamente se intenta modificar `languageCode` en
// `completed`/`cancelled` (US-082 AC-04); valida catálogos si cambian; emite
// `event.language.changed` cuando el idioma efectivamente cambia (US-082 OBS).
import type {
  EventRepository,
  EventTypeRepository,
  LocationRepository,
} from '../ports/event.repository.js';
import type { EventAuditLogger } from '../ports/event-audit-logger.js';
import type { EventView, UpdateEventData } from '../domain/event.js';
import type { UpdateEventRequest } from '../dto/index.js';
import { isMutable } from '../domain/event-lifecycle.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import { CurrencyImmutableError } from '../../../shared/domain/errors/currency-immutable.error.js';
import { EventLanguageNotEditableError } from '../../../shared/domain/errors/event-language-not-editable.error.js';
import { BusinessRuleViolationError } from '../../../shared/domain/errors/business-rule-violation.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';
import type { EventUseCaseContext } from './context.js';

export class UpdateEventUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly eventTypes: EventTypeRepository,
    private readonly locations: LocationRepository,
    private readonly audit: EventAuditLogger,
  ) {}

  async execute(
    ownerId: string,
    eventId: string,
    input: UpdateEventRequest,
    ctx: EventUseCaseContext = {},
  ): Promise<EventView> {
    // Currency inmutable (AC-05): se rechaza ANTES de leer/mutar (no persiste cambio).
    if (input.currencyCode !== undefined) {
      this.audit.emit('event.currency_immutable_violation', {
        correlationId: ctx.correlationId,
        actorId: ownerId,
        eventId,
      });
      throw new CurrencyImmutableError();
    }

    const existing = await this.events.findByIdForOwner(eventId, ownerId);
    if (!existing) throw new NotFoundError('Event not found');

    // US-082 AC-04 / VR-03: si se intenta modificar `languageCode` sobre un evento en estado
    // terminal (`completed` / `cancelled`), responder 409 EVENT_LANGUAGE_NOT_EDITABLE. Se
    // antepone al bloqueo genérico de mutabilidad para que el FE muestre el mensaje específico
    // y oculte el selector.
    if (input.languageCode !== undefined && !isMutable(existing.status)) {
      const terminal = existing.status as 'completed' | 'cancelled';
      this.audit.emit('event.language.not_editable_violation', {
        correlationId: ctx.correlationId,
        actorId: ownerId,
        eventId,
        currentStatus: terminal,
      });
      throw new EventLanguageNotEditableError(terminal);
    }

    if (!isMutable(existing.status)) {
      this.audit.emit('event.lifecycle_transition_rejected', {
        correlationId: ctx.correlationId,
        actorId: ownerId,
        eventId,
        reason: `not editable in status ${existing.status}`,
      });
      throw new BusinessRuleViolationError(
        ErrorCodes.BUSINESS_RULE_VIOLATION,
        'Event cannot be edited in a terminal state',
        [{ field: 'status', message: `Event is ${existing.status}` }],
      );
    }

    const patch: UpdateEventData = {};
    if (input.eventTypeCode !== undefined) {
      const eventTypeId = await this.eventTypes.findActiveIdByCode(input.eventTypeCode);
      if (!eventTypeId) throw new NotFoundError('Event type not found');
      patch.eventTypeId = eventTypeId;
    }
    if (input.locationId !== undefined) {
      const ok = await this.locations.existsActive(input.locationId);
      if (!ok) throw new NotFoundError('Location not found');
      patch.locationId = input.locationId;
    }
    if (input.name !== undefined) patch.name = input.name;
    if (input.eventDate !== undefined) patch.eventDate = input.eventDate;
    if (input.guestsCount !== undefined) patch.guestsCount = input.guestsCount;
    if (input.estimatedBudget !== undefined) patch.estimatedBudget = input.estimatedBudget;
    if (input.languageCode !== undefined) patch.language = input.languageCode;
    if (input.notes !== undefined) patch.notes = input.notes;

    const view = await this.events.update(eventId, patch);
    this.audit.emit('event.updated', { correlationId: ctx.correlationId, actorId: ownerId, eventId });
    // US-082: si el idioma cambió efectivamente (no es no-op), auditar la transición con
    // `fromLanguage` (existente) → `toLanguage` (nuevo). Ignora casos donde el body incluye
    // el mismo valor previo.
    if (input.languageCode !== undefined && input.languageCode !== existing.languageCode) {
      this.audit.emit('event.language.changed', {
        correlationId: ctx.correlationId,
        actorId: ownerId,
        eventId,
        fromLanguage: existing.languageCode,
        toLanguage: input.languageCode,
      });
    }
    return view;
  }
}
