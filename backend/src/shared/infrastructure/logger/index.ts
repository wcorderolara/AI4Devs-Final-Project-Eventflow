// Shared kernel — logger stub (US-090 / BE-004). Doc 14 §7.1.
// Placeholder sobre `console`. El logger estructurado (JSON, correlationId, niveles) es
// responsabilidad de PB-P0-003 / US-091.
export const logger = {
  info: (...args: unknown[]): void => console.info(...args),
  warn: (...args: unknown[]): void => console.warn(...args),
  error: (...args: unknown[]): void => console.error(...args),
  debug: (...args: unknown[]): void => console.debug(...args),
};
