// US-085 QA-001 — Unit: SeedReport emitter (AC-06).
import { describe, expect, it } from 'vitest';
import { emptyCounts, type SeedReport } from '../../src/modules/seed-demo/domain/seed-report.js';
import {
  formatSeedReportHuman,
  formatSeedReportNdjson,
} from '../../src/modules/seed-demo/infrastructure/seed-report-emitter.js';

const report: SeedReport = {
  correlationId: 'abc-123',
  startedAt: '2026-07-10T00:00:00.000Z',
  finishedAt: '2026-07-10T00:00:01.000Z',
  durationMs: 1000,
  scriptVersion: '1.0.0',
  domains: { catalogs: { ...emptyCounts(), created: 21 } },
  exitCode: 0,
};

describe('US-085 — SeedReportEmitter', () => {
  it('incluye correlationId, durationMs y tabla por dominio', () => {
    const human = formatSeedReportHuman(report);
    expect(human).toContain('correlationId: abc-123');
    expect(human).toContain('durationMs: 1000');
    expect(human).toContain('| catalogs | 21 |');
  });

  it('NDJSON es parseable y no filtra DATABASE_URL', () => {
    const line = formatSeedReportNdjson(report);
    const parsed = JSON.parse(line);
    expect(parsed.correlationId).toBe('abc-123');
    expect(line).not.toContain('postgresql://');
  });
});
