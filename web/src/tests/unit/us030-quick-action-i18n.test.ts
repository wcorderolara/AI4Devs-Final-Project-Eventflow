// US-030 (PB-P1-018 / FE-003) — Verificación programática de claves i18n cross-locale.
// Reemplaza al "linter build-time" del Tech Spec §8 con un unit test que falla si alguna
// clave nueva de `status.quick_action.*` / `status.error.*` / `status.disabled.*` falta en
// alguno de los 4 locales soportados (`es-LATAM`, `es-ES`, `pt`, `en`).
import { describe, it, expect } from 'vitest';
import esLatam from '@/messages/es-LATAM/tasks.json';
import esEs from '@/messages/es-ES/tasks.json';
import pt from '@/messages/pt/tasks.json';
import en from '@/messages/en/tasks.json';

type Msgs = Record<string, unknown>;

const REQUIRED_PATHS = [
  'status.quick_action.label.check_done',
  'status.quick_action.label.uncheck_done',
  'status.quick_action.label.skip',
  'status.quick_action.label.resume',
  'status.quick_action.aria.check_done',
  'status.quick_action.aria.uncheck_done',
  'status.quick_action.aria.skip',
  'status.quick_action.aria.resume',
  'status.quick_action.announce.done',
  'status.quick_action.announce.in_progress',
  'status.quick_action.announce.skipped',
  'status.error.invalid_transition',
  'status.error.event_not_mutable',
  'status.error.not_found_or_forbidden',
  'status.error.transient',
  'status.error.retry',
  'status.disabled.event_locked',
  'status.disabled.mutation_pending',
] as const;

function getPath(obj: Msgs, path: string): string | undefined {
  const segments = path.split('.');
  let cur: unknown = obj;
  for (const s of segments) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Msgs)[s];
  }
  return typeof cur === 'string' ? cur : undefined;
}

const LOCALES: Array<[string, Msgs]> = [
  ['es-LATAM', esLatam as Msgs],
  ['es-ES', esEs as Msgs],
  ['pt', pt as Msgs],
  ['en', en as Msgs],
];

describe('US-030 i18n cross-locale (FE-003)', () => {
  it.each(LOCALES)('todos los paths canónicos existen en %s/tasks.json', (locale, msgs) => {
    const missing: string[] = [];
    for (const path of REQUIRED_PATHS) {
      const value = getPath(msgs, path);
      if (typeof value !== 'string' || value.trim() === '') {
        missing.push(path);
      }
    }
    expect(missing, `${locale} missing keys: ${missing.join(', ')}`).toEqual([]);
  });
});
