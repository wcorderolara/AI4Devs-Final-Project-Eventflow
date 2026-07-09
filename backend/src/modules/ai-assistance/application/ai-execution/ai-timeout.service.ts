// Timeout wrapper testeable (US-123 / BE-002, AC-01). Corta la espera al provider en `timeoutMs`.
// Usa `setTimeout` global → compatible con `vi.useFakeTimers()` (tests no esperan 60s reales).
// El port `LLMProvider.generate` no expone `AbortSignal`, así que un resultado tardío se IGNORA
// (guard `settled`): nunca se resuelve dos veces ni se produce doble efecto (AC-01 handling).
import { AiProviderTimeoutError } from '../../../../shared/domain/errors/ai.errors.js';

export interface TimeoutOptions {
  timeoutMs: number;
  /** Mensaje/metadata segura para el error de timeout. */
  onTimeoutMessage?: string;
}

/**
 * Ejecuta `op()` con un límite de `timeoutMs`. Resuelve con el valor si el provider responde a
 * tiempo; lanza `AiProviderTimeoutError` si excede el límite. El resultado tardío se descarta.
 */
export function withTimeout<T>(op: () => Promise<T>, options: TimeoutOptions): Promise<T> {
  const { timeoutMs, onTimeoutMessage } = options;
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new AiProviderTimeoutError(onTimeoutMessage ?? 'AI provider timed out', { timeoutMs }));
    }, timeoutMs);

    op().then(
      (value) => {
        if (settled) return; // llegó después del timeout → se ignora
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
