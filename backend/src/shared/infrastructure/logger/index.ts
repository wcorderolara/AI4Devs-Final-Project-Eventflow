// Logger único del backend (US-091 / US-108 / US-113). Pino emite JSON lines a stdout
// (`docker logs` → CloudWatch) con shape `{level, time, service, env, version, correlationId,
// msg?, ...campos}`; `correlationId` sale de AsyncLocalStorage salvo que el payload lo traiga.
// Toda línea pasa por `redactSecrets` + `redactPII` antes de serializarse (AC-03/04, SEC-07).
//
// `logger` es una fachada sobre Pino que acepta las dos formas de llamada del código:
//   logger.info({ event, ...campos })          → tal cual (también `({...}, 'msg')` estilo Pino)
//   logger.info('event', { ...campos })        → { event, ...campos }
import pino, { type DestinationStream, type Logger, type LoggerOptions } from 'pino';
import { loggingConfig as config } from '../../../config/logging-config.js';
import { getAppVersion } from '../../config/app-version.js';
import { getCorrelationId } from '../../context/correlation-id.js';
import { redactPII, redactSecrets } from './redactors.js';

const SERVICE_NAME = 'backend-api';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type AppLogger = Record<LogLevel, (...args: unknown[]) => void>;

/** `destination` permite a los tests capturar la salida real (con redacción) en memoria. */
export function createPinoLogger(destination?: DestinationStream): Logger {
  const version = getAppVersion();
  const options: LoggerOptions = {
    level: config.LOG_LEVEL,
    messageKey: 'msg',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      log: (obj) =>
        redactPII(redactSecrets(obj), config.NODE_ENV, config.LOG_INCLUDE_PII) as Record<string, unknown>,
    },
    mixin: () => ({
      service: SERVICE_NAME,
      env: config.NODE_ENV,
      version,
      correlationId: getCorrelationId(),
    }),
    // Un campo `undefined` del payload (p. ej. `correlationId: input.correlationId`) no pisa el del mixin.
    mixinMergeStrategy: (mergeObject, mixinObject) => {
      for (const [key, value] of Object.entries(mergeObject)) {
        if (value !== undefined) (mixinObject as Record<string, unknown>)[key] = value;
      }
      return mixinObject;
    },
  };
  if (destination) return pino(options, destination);
  // `pino-pretty` sólo en development (env.ts hace fail-fast fuera de dev).
  return pino(config.LOG_PRETTY ? { ...options, transport: { target: 'pino-pretty' } } : options);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Error);

function emit(target: Logger, level: LogLevel, args: unknown[]): void {
  const [first, second] = args;
  if (typeof first === 'string') {
    if (second === undefined) target[level](first);
    else target[level](isRecord(second) ? { event: first, ...second } : { event: first, detail: second });
    return;
  }
  if (typeof second === 'string') target[level](first as object, second);
  else target[level](first as object);
}

export function createLogger(target: Logger): AppLogger {
  return {
    info: (...args) => emit(target, 'info', args),
    warn: (...args) => emit(target, 'warn', args),
    error: (...args) => emit(target, 'error', args),
    debug: (...args) => emit(target, 'debug', args),
  };
}

export const logger: AppLogger = createLogger(createPinoLogger());
