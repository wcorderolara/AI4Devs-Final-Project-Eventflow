// US-034 (PB-P2-004 / BE-005). Catálogo i18n para el email simulado T-7. Se define en
// TypeScript (no JSON) para preservar type-safety y evitar dependencia de resolvers
// dinámicos: los cuatro locales soportados por MVP están cubiertos exhaustivamente y
// el interpolador acepta ÚNICAMENTE las claves `taskId` y `dueDate` (SEC-02 no-PII).
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

/** Claves permitidas en las plantillas T-7. Cualquier otra clave se descarta al render. */
export type T7TemplateKey = 'taskId' | 'dueDate';

interface T7Template {
  subject: string;
  body: string;
}

const CATALOG: Record<SupportedLanguage, T7Template> = {
  'es-LATAM': {
    subject: 'Recordatorio: tienes una tarea que vence en 7 días',
    body: 'La tarea {taskId} vence el {dueDate}. Revisa tu checklist para no perder detalles.',
  },
  'es-ES': {
    subject: 'Recordatorio: tienes una tarea que vence en 7 días',
    body: 'La tarea {taskId} vence el {dueDate}. Revisa tu checklist para no dejar cabos sueltos.',
  },
  pt: {
    subject: 'Lembrete: você tem uma tarefa que vence em 7 dias',
    body: 'A tarefa {taskId} vence em {dueDate}. Revise sua checklist para não perder detalhes.',
  },
  en: {
    subject: 'Reminder: you have a task due in 7 days',
    body: 'Task {taskId} is due on {dueDate}. Review your checklist to stay on track.',
  },
};

/**
 * Interpola `{taskId}` y `{dueDate}` en `template`. Cualquier otra clave enviada por
 * error se ignora silenciosamente (defensa en profundidad SEC-02).
 */
function interpolate(template: string, values: Record<T7TemplateKey, string>): string {
  return template
    .replace(/\{taskId\}/g, values.taskId)
    .replace(/\{dueDate\}/g, values.dueDate);
}

export interface RenderedT7Template {
  subject: string;
  body: string;
}

/** Renderiza el par subject/body para `language` con placeholders sólo `taskId` y `dueDate`. */
export function renderT7Template(
  language: SupportedLanguage,
  values: Record<T7TemplateKey, string>,
): RenderedT7Template {
  const template = CATALOG[language];
  return {
    subject: interpolate(template.subject, values),
    body: interpolate(template.body, values),
  };
}

/** Locales soportados por el catálogo T-7. Expuesto para tests exhaustivos. */
export function supportedT7Languages(): readonly SupportedLanguage[] {
  return Object.keys(CATALOG) as SupportedLanguage[];
}
