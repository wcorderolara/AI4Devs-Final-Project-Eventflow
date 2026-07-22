export interface SeedStatusDTO {
  lastRunAt: string | null;
  preset: 'minimal' | 'full' | null;
  recordCount: Record<string, number>;
}

export interface SeedResetReportDTO {
  entitiesDeleted: Record<string, number>;
  entitiesReseeded: Record<string, number>;
  seedVersion: string;
  correlationId: string;
  durationMs: number;
}

export interface SeedStatusEnvelope {
  data: SeedStatusDTO;
  meta: { correlationId: string; timestamp: string };
}

export interface SeedResetEnvelope {
  data: SeedResetReportDTO;
  meta: { correlationId: string; timestamp: string };
}

export interface SeedResetInput {
  reason?: string;
}
