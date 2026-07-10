// SeedReport (US-085 AC-06). Reporte estructurado por dominio con correlationId y duración.

export type SeedDomainName =
  | 'catalogs'
  | 'identities'
  | 'vendors'
  | 'events'
  | 'quotes'
  | 'bookings'
  | 'reviews'
  | 'ai'
  | 'notifications'
  | 'adminActions';

export interface DomainCounts {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
}

export type SeedExitCode = 0 | 1 | 2;

export interface SeedReport {
  correlationId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  scriptVersion: string;
  domains: Record<string, DomainCounts>;
  exitCode: SeedExitCode;
  failedDomain?: string;
}

export function emptyCounts(): DomainCounts {
  return { created: 0, updated: 0, unchanged: 0, skipped: 0 };
}
