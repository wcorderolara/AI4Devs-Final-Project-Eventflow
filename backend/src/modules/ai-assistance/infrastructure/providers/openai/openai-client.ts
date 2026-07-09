// Cliente HTTP de OpenAI encapsulado en Infrastructure (US-118 / BE-002, AC-03/AC-08). Node 22
// `fetch` nativo — sin SDK ni dependencia nueva. El transport es una interfaz inyectable para que
// los tests usen un fake sin red real (VR-06/VR-07). El SDK/cliente concreto NO sale de esta carpeta.
import type { OpenAIConfig } from './openai-config.js';

export interface OpenAIChatMessage {
  role: 'system' | 'user';
  content: string;
}

export interface OpenAIChatRequest {
  model: string;
  messages: ReadonlyArray<OpenAIChatMessage>;
  /** Structured output: fuerza JSON parseable compatible con el schema del feature (AC-03). */
  responseFormat: { type: 'json_object' };
}

export interface OpenAIChatResponse {
  /** Contenido textual del mensaje del assistant (se espera JSON string). */
  content: string;
}

export interface OpenAIChatTransport {
  createChatCompletion(req: OpenAIChatRequest, signal: AbortSignal): Promise<OpenAIChatResponse>;
}

/** Error interno de transporte con status HTTP del provider; el provider lo normaliza a error tipado. */
export class OpenAIHttpError extends Error {
  constructor(readonly status: number) {
    super(`OpenAI HTTP ${status}`);
    this.name = 'OpenAIHttpError';
  }
}

/** Respuesta del provider sin contenido utilizable → el provider la mapea a AiInvalidOutputError. */
export class OpenAIMalformedResponseError extends Error {
  constructor() {
    super('OpenAI response missing message content');
    this.name = 'OpenAIMalformedResponseError';
  }
}

interface OpenAIChatCompletionBody {
  choices?: Array<{ message?: { content?: string | null } }>;
}

/** Transport real basado en `fetch`. Sólo se usa fuera de tests; CI usa fakes (AC-08). */
export function createFetchOpenAIChatTransport(cfg: OpenAIConfig): OpenAIChatTransport {
  return {
    async createChatCompletion(req: OpenAIChatRequest, signal: AbortSignal): Promise<OpenAIChatResponse> {
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: req.model,
          messages: req.messages,
          response_format: req.responseFormat,
        }),
        signal,
      });
      if (!res.ok) {
        throw new OpenAIHttpError(res.status);
      }
      const body = (await res.json()) as OpenAIChatCompletionBody;
      const content = body.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new OpenAIMalformedResponseError();
      }
      return { content };
    },
  };
}
