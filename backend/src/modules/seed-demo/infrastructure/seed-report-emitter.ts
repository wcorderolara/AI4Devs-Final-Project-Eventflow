import type { SeedReport } from '../domain/seed-report.js';

// SeedReportEmitter (US-085 AC-06). Emite el reporte legible (markdown) + una línea NDJSON para
// parseo automático en CI. `DATABASE_URL` nunca se incluye (SEC / mascarado).

export function formatSeedReportHuman(report: SeedReport): string {
  const lines: string[] = [];
  lines.push('# Seed Report');
  lines.push(`- correlationId: ${report.correlationId}`);
  lines.push(`- scriptVersion: ${report.scriptVersion}`);
  lines.push(`- startedAt: ${report.startedAt}`);
  lines.push(`- finishedAt: ${report.finishedAt}`);
  lines.push(`- durationMs: ${report.durationMs}`);
  lines.push(`- exitCode: ${report.exitCode}`);
  if (report.failedDomain) lines.push(`- failedDomain: ${report.failedDomain}`);
  lines.push('');
  lines.push('| domain | created | updated | unchanged | skipped |');
  lines.push('| ------ | ------: | ------: | --------: | ------: |');
  for (const [domain, c] of Object.entries(report.domains)) {
    lines.push(`| ${domain} | ${c.created} | ${c.updated} | ${c.unchanged} | ${c.skipped} |`);
  }
  return lines.join('\n');
}

export function formatSeedReportNdjson(report: SeedReport): string {
  return JSON.stringify(report);
}

export function emitSeedReport(report: SeedReport, out: (line: string) => void = console.log): void {
  out(formatSeedReportHuman(report));
  out(formatSeedReportNdjson(report));
}
