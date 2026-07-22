// US-068 (PB-P2-005 / BE-003). Catálogo i18n para el aviso `quote_request_received`.
// Se define en TypeScript por type-safety (paridad con `t7-templates.ts` de US-034).
// Placeholders permitidos EXCLUSIVAMENTE: `categoryCode` (SEC-02 no-PII — nunca se
// interpola displayName, email ni brief content).
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export type QrReceivedTemplateKey = 'categoryCode';

interface QrReceivedTemplate {
  subject: string;
  body: string;
}

const CATALOG: Record<SupportedLanguage, QrReceivedTemplate> = {
  'es-LATAM': {
    subject: 'Nueva solicitud de cotización recibida',
    body: 'Recibiste una nueva solicitud de cotización para la categoría {categoryCode}. Revisá tu bandeja para responderla.',
  },
  'es-ES': {
    subject: 'Nueva solicitud de presupuesto recibida',
    body: 'Has recibido una nueva solicitud de presupuesto para la categoría {categoryCode}. Revisa tu bandeja para responderla.',
  },
  pt: {
    subject: 'Nova solicitação de cotação recebida',
    body: 'Você recebeu uma nova solicitação de cotação para a categoria {categoryCode}. Revise sua caixa para respondê-la.',
  },
  en: {
    subject: 'New quote request received',
    body: 'You received a new quote request for the {categoryCode} category. Review your inbox to respond.',
  },
};

function interpolate(template: string, values: Record<QrReceivedTemplateKey, string>): string {
  return template.replace(/\{categoryCode\}/g, values.categoryCode);
}

export interface RenderedQrReceivedTemplate {
  subject: string;
  body: string;
}

/** Renderiza subject/body para `language` con el único placeholder `categoryCode`. */
export function renderQrReceivedTemplate(
  language: SupportedLanguage,
  values: Record<QrReceivedTemplateKey, string>,
): RenderedQrReceivedTemplate {
  const template = CATALOG[language];
  return {
    subject: interpolate(template.subject, values),
    body: interpolate(template.body, values),
  };
}

/** Locales soportados por el catálogo QR-received (expuesto para tests exhaustivos). */
export function supportedQrReceivedLanguages(): readonly SupportedLanguage[] {
  return Object.keys(CATALOG) as SupportedLanguage[];
}
