// Cliente API de la feature AI Checklist (US-018 / FE-001).
// Contrato: POST /api/v1/events/:eventId/ai/checklist. Auth por cookie HTTP-Only vía httpClient.
// Backend aplica filtro T-x cuando el input incluye `days_to_event` (US-018 EC-01, AI-003).
import {
  createAIGenerator,
  type AIGenerationResponse,
} from '@/features/ai/shared/api/createAIGenerator';

export type ChecklistPhase = 'T-180' | 'T-90' | 'T-30' | 'T-7' | 'T-1';
export type ChecklistPriority = 'low' | 'medium' | 'high';

export interface ChecklistTask {
  title: string;
  description: string;
  category: string;
  due_relative_days: number;
  phase: ChecklistPhase;
  priority: ChecklistPriority;
}

export interface ChecklistOutput {
  tasks: ChecklistTask[];
}

export type GenerateChecklistResponse = AIGenerationResponse<ChecklistOutput>;

export interface ChecklistInput {
  eventTypeCode?: string;
  eventDate?: string;
  guestCount?: number;
  city?: string;
  days_to_event?: number;
}

/** US-018 / AC-01: genera el checklist IA para un evento. Timeout de cliente 65s. */
export const aiChecklistApi = createAIGenerator<ChecklistInput, ChecklistOutput>('checklist');

/** Grupos por fase para el viewer. Preserva el orden T-180 → T-1. */
export const PHASE_ORDER: readonly ChecklistPhase[] = ['T-180', 'T-90', 'T-30', 'T-7', 'T-1'];

export function groupTasksByPhase(tasks: ChecklistTask[]): Record<ChecklistPhase, ChecklistTask[]> {
  const groups: Record<ChecklistPhase, ChecklistTask[]> = {
    'T-180': [],
    'T-90': [],
    'T-30': [],
    'T-7': [],
    'T-1': [],
  };
  for (const t of tasks) groups[t.phase].push(t);
  return groups;
}
