import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const wrapper = resolve(here, '../../scripts/db-migrate-reset.sh');

function runWrapper(env: Record<string, string | undefined>) {
  return spawnSync('bash', [wrapper], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

/**
 * QA-004 (AC-10 parcial, SEC-05, NT-03) — Verifica el guard env-aware del wrapper
 * `db-migrate-reset.sh`: bloquea en CI/QA/Demo, permite en local.
 */
describe('QA-004: wrapper db-migrate-reset.sh env-aware', () => {
  it('CI=true → falla con exit code != 0 y mensaje de bloqueo', () => {
    const r = runWrapper({ CI: 'true', NODE_ENV: undefined });
    expect(r.status).not.toBe(0);
    expect(`${r.stderr}${r.stdout}`).toContain('bloqueado en CI/QA/Demo');
  });

  it('NODE_ENV=production → falla con exit code != 0', () => {
    const r = runWrapper({ CI: undefined, NODE_ENV: 'production' });
    expect(r.status).not.toBe(0);
    expect(`${r.stderr}${r.stdout}`).toContain('bloqueado en CI/QA/Demo');
  });

  it('NODE_ENV=qa → falla con exit code != 0', () => {
    const r = runWrapper({ CI: undefined, NODE_ENV: 'qa' });
    expect(r.status).not.toBe(0);
  });

  it('local (sin CI, NODE_ENV=local) → supera el guard (dry-run, exit 0)', () => {
    const r = runWrapper({ CI: undefined, NODE_ENV: 'local', EF_MIGRATE_RESET_DRY_RUN: '1' });
    expect(r.status).toBe(0);
    expect(`${r.stderr}${r.stdout}`).not.toContain('bloqueado en CI/QA/Demo');
    expect(r.stdout).toContain('DRY-RUN');
  });

  it('local (sin CI ni NODE_ENV) → supera el guard (dry-run, exit 0)', () => {
    const r = runWrapper({ CI: undefined, NODE_ENV: undefined, EF_MIGRATE_RESET_DRY_RUN: '1' });
    expect(r.status).toBe(0);
    expect(`${r.stderr}${r.stdout}`).not.toContain('bloqueado en CI/QA/Demo');
  });
});
