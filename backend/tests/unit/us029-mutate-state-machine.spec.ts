// US-029 (PB-P1-018 / QA-001) — Tests unit del `EventTaskStateMachineService`.
// Cubre AC-02 + EC-02 + EC-03 (matriz completa de transiciones).
import { describe, it, expect } from 'vitest';
import {
  EventTaskStateMachineService,
  InvalidTransitionError,
  TaskStatusTransitionsTable,
  type CanonicalEventTaskStatus,
} from '../../src/modules/task-management/mutate/domain/EventTaskStateMachineService.js';

const svc = new EventTaskStateMachineService();

describe('US-029 EventTaskStateMachineService — allowedTransitionsFrom', () => {
  it('pending → in_progress, done, skipped', () => {
    expect(svc.allowedTransitionsFrom('pending').sort()).toEqual(['done', 'in_progress', 'skipped']);
  });
  it('in_progress → done, skipped', () => {
    expect(svc.allowedTransitionsFrom('in_progress').sort()).toEqual(['done', 'skipped']);
  });
  it('done y skipped son terminales', () => {
    expect(svc.allowedTransitionsFrom('done')).toEqual([]);
    expect(svc.allowedTransitionsFrom('skipped')).toEqual([]);
  });
  it('TaskStatusTransitionsTable es Object.freeze', () => {
    expect(Object.isFrozen(TaskStatusTransitionsTable)).toBe(true);
  });
});

describe('US-029 EventTaskStateMachineService — assertCanTransition (AC-02, EC-02)', () => {
  const VALID: Array<[CanonicalEventTaskStatus, CanonicalEventTaskStatus]> = [
    ['pending', 'in_progress'],
    ['pending', 'done'],
    ['pending', 'skipped'],
    ['in_progress', 'done'],
    ['in_progress', 'skipped'],
  ];
  const INVALID: Array<[CanonicalEventTaskStatus, CanonicalEventTaskStatus]> = [
    ['done', 'pending'],
    ['done', 'in_progress'],
    ['done', 'skipped'],
    ['skipped', 'pending'],
    ['skipped', 'in_progress'],
    ['skipped', 'done'],
    ['in_progress', 'pending'],
  ];

  it.each(VALID)('permite %s → %s', (from, to) => {
    expect(() => svc.assertCanTransition(from, to)).not.toThrow();
  });

  it.each(INVALID)('rechaza %s → %s con InvalidTransitionError', (from, to) => {
    let err: unknown;
    try {
      svc.assertCanTransition(from, to);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InvalidTransitionError);
    const ite = err as InvalidTransitionError;
    expect(ite.current).toBe(from);
    expect(ite.requested).toBe(to);
    expect(Array.isArray(ite.allowed)).toBe(true);
  });
});

describe('US-029 EventTaskStateMachineService — isSameState (EC-03)', () => {
  it('same-state es idempotente y no lanza', () => {
    (['pending', 'in_progress', 'done', 'skipped'] as CanonicalEventTaskStatus[]).forEach((s) => {
      expect(svc.isSameState(s, s)).toBe(true);
      expect(() => svc.assertCanTransition(s, s)).not.toThrow();
    });
  });
  it('detecta cambio real', () => {
    expect(svc.isSameState('pending', 'in_progress')).toBe(false);
  });
});
