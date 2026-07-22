// US-069 (PB-P2-006 / BE-003). Catálogo i18n para el aviso `quote_received`
// dirigido al organizer cuando el vendor envía la Quote (status → 'sent').
// Se define en TypeScript por type-safety (paridad con `qr-received-templates.ts`
// de US-068 y `t7-templates.ts` de US-034).
//
// Placeholders permitidos EXCLUSIVAMENTE: ninguno.
// SEC-02 no-PII — nunca se interpola displayName del vendor, email, total ni
// breakdown. Los subject/body son fijos por locale para prevenir fugas por
// interpolación accidental.
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

interface QuoteReceivedTemplate {
  subject: string;
  body: string;
}

const CATALOG: Record<SupportedLanguage, QuoteReceivedTemplate> = {
  'es-LATAM': {
    subject: 'Nueva cotización recibida',
    body: 'Recibiste una nueva cotización. Ingresá al comparador para revisarla.',
  },
  'es-ES': {
    subject: 'Nuevo presupuesto recibido',
    body: 'Has recibido un nuevo presupuesto. Entra al comparador para revisarlo.',
  },
  pt: {
    subject: 'Nova cotação recebida',
    body: 'Você recebeu uma nova cotação. Acesse o comparador para revisá-la.',
  },
  en: {
    subject: 'New quote received',
    body: 'You received a new quote. Open the comparator to review it.',
  },
};

export interface RenderedQuoteReceivedTemplate {
  subject: string;
  body: string;
}

/** Renderiza subject/body para `language`. Sin placeholders (SEC-02). */
export function renderQuoteReceivedTemplate(
  language: SupportedLanguage,
): RenderedQuoteReceivedTemplate {
  const template = CATALOG[language];
  return { subject: template.subject, body: template.body };
}

/** Locales soportados por el catálogo quote-received (expuesto para tests exhaustivos). */
export function supportedQuoteReceivedLanguages(): readonly SupportedLanguage[] {
  return Object.keys(CATALOG) as SupportedLanguage[];
}
