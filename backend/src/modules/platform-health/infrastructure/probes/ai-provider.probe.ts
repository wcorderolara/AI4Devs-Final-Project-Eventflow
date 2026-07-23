// US-116 (PB-P2-013 / BE-003). Probe config-based (§7.4) — NO invoca al proveedor
// LLM externo. Deriva un status diagnóstico leyendo `LLM_PROVIDER` +
// `OPENAI_API_KEY` del entorno (VR-01: no exponemos valores en el response, sólo
// el status categórico).
//
// Matriz (AC-02, EC-02, EC-03):
//   `LLM_PROVIDER=mock`                       → 'mock'
//   `LLM_PROVIDER=openai` + OPENAI_API_KEY   → 'ok'
//   `LLM_PROVIDER=openai` sin key            → 'down'   (EC-02 · status degraded caller)
//   otro / vacío                              → 'down'
//
// El env parsing global (`config/env.ts`) ya valida el shape al arrancar el
// proceso. Aquí leemos `process.env.*` directamente para permitir cambios
// dinámicos en tests (via `vi.stubEnv`) sin re-parsear la configuración global.
import type { AiProviderStatus } from '../../domain/types.js';

export class AiProviderProbe {
  check(): AiProviderStatus {
    const provider = (process.env.LLM_PROVIDER ?? '').toLowerCase().trim();
    if (provider === 'mock') return 'mock';
    if (provider === 'openai') {
      const key = process.env.OPENAI_API_KEY?.trim() ?? '';
      return key.length > 0 ? 'ok' : 'down';
    }
    return 'down';
  }
}
