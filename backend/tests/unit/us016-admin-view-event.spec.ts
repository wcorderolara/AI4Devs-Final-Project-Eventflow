// US-016 / QA-001 — Unit tests del use case AdminViewEvent con fakes en memoria (sin BD).
// AC-01, VR-02, EC-01, EC-02 + fallo transaccional. Cubre los 4 escenarios mínimos §7 Testing.
import { describe, it, expect, beforeEach } from 'vitest';
import { AdminViewEventUseCase } from '../../src/modules/admin-governance/application/admin-view-event.use-case.js';
import type {
  AdminEventRepository,
  AdminEventRow,
} from '../../src/modules/admin-governance/ports/admin-event.repository.js';
import type {
  AdminActionRepository,
  AdminActionCreateInput,
  PrismaTx,
} from '../../src/modules/admin-governance/ports/admin-action.repository.js';
import { NotFoundError } from '../../src/shared/domain/errors/not-found.error.js';

function row(over: Partial<AdminEventRow> = {}): AdminEventRow {
  return {
    id: over.id ?? 'e-1',
    ownerId: over.ownerId ?? 'org-1',
    eventTypeCode: over.eventTypeCode ?? 'wedding',
    name: over.name ?? 'Boda demo',
    eventDate: over.eventDate ?? '2026-12-31',
    guestsCount: over.guestsCount ?? 100,
    locationId: over.locationId ?? 'loc-1',
    estimatedBudget: over.estimatedBudget ?? '1500.00',
    currencyCode: over.currencyCode ?? 'GTQ',
    languageCode: over.languageCode ?? 'es-LATAM',
    status: over.status ?? 'active',
    notes: over.notes ?? null,
    autoCompleted: over.autoCompleted ?? false,
    completedAt: over.completedAt ?? null,
    createdAt: over.createdAt ?? '2026-07-01T00:00:00.000Z',
    updatedAt: over.updatedAt ?? '2026-07-01T00:00:00.000Z',
    deletedAt: over.deletedAt ?? null,
    owner: over.owner ?? { id: 'org-1', displayName: 'Organizer Demo' },
  };
}

class FakeAdminEventRepo implements AdminEventRepository {
  byId = new Map<string, AdminEventRow>();
  seed(r: AdminEventRow): void {
    this.byId.set(r.id, r);
  }
  findByIdIncludingDeleted(id: string): Promise<AdminEventRow | null> {
    return Promise.resolve(this.byId.get(id) ?? null);
  }
}

class FakeAdminActionRepo implements AdminActionRepository {
  saved: AdminActionCreateInput[] = [];
  shouldThrow = false;
  create(_tx: PrismaTx, input: AdminActionCreateInput): Promise<{ id: string; createdAt: Date }> {
    if (this.shouldThrow) return Promise.reject(new Error('audit insert failed'));
    this.saved.push(input);
    return Promise.resolve({ id: `aa-${this.saved.length}`, createdAt: new Date() });
  }
}

/** Fake prisma con `$transaction(fn)` que invoca `fn(tx)` con un stub trivial y respeta throws. */
function fakePrismaWithTx(): unknown {
  return {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  };
}

describe('US-016 / QA-001 — AdminViewEventUseCase', () => {
  let events: FakeAdminEventRepo;
  let actions: FakeAdminActionRepo;
  let uc: AdminViewEventUseCase;

  beforeEach(() => {
    events = new FakeAdminEventRepo();
    actions = new FakeAdminActionRepo();
    uc = new AdminViewEventUseCase(
      events,
      actions,
      fakePrismaWithTx() as unknown as ConstructorParameters<typeof AdminViewEventUseCase>[2],
    );
  });

  it('AC-01: happy path retorna DTO whitelisted y registra AdminAction(view_event)', async () => {
    events.seed(row({ id: 'e-1' }));
    const view = await uc.execute({ eventId: 'e-1', actorUserId: 'admin-1', correlationId: 'cid-1' });
    expect(view.id).toBe('e-1');
    expect(view.deleted).toBe(false);
    expect(view.owner.displayName).toBe('Organizer Demo');
    // VR-02: campos internos sensibles no aparecen (whitelist explícita).
    expect((view as unknown as Record<string, unknown>).userId).toBeUndefined();
    // AC-01: se persistió una AdminAction con correlationId.
    expect(actions.saved).toHaveLength(1);
    expect(actions.saved[0]).toMatchObject({
      adminUserId: 'admin-1',
      action: 'view_event',
      targetEntity: 'event',
      targetId: 'e-1',
      correlationId: 'cid-1',
    });
  });

  it('EC-01: evento soft-deleted → DTO con deleted=true y AdminAction registrado', async () => {
    events.seed(row({ id: 'e-2', deletedAt: '2026-06-01T00:00:00.000Z' }));
    const view = await uc.execute({ eventId: 'e-2', actorUserId: 'admin-1', correlationId: 'cid-2' });
    expect(view.deleted).toBe(true);
    expect(view.deletedAt).toBe('2026-06-01T00:00:00.000Z');
    expect(actions.saved).toHaveLength(1); // auditoría preservada aún con soft delete
  });

  it('EC-02: evento inexistente lanza NotFoundError y NO registra AdminAction', async () => {
    await expect(
      uc.execute({ eventId: 'missing', actorUserId: 'admin-1', correlationId: 'cid-3' }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(actions.saved).toHaveLength(0);
  });

  it('Fallo de auditoría propaga el error (rollback conjunto conceptual)', async () => {
    events.seed(row({ id: 'e-3' }));
    actions.shouldThrow = true;
    await expect(
      uc.execute({ eventId: 'e-3', actorUserId: 'admin-1', correlationId: 'cid-4' }),
    ).rejects.toThrow(/audit insert failed/);
    expect(actions.saved).toHaveLength(0);
  });
});
