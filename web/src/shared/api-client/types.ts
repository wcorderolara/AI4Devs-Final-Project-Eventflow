export interface HttpClientOptions<B = unknown> {
  body?: B;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** `true` extiende el timeout a 30 s para endpoints IA (NFR-PERF-AI-001). */
  isAI?: boolean;
}
