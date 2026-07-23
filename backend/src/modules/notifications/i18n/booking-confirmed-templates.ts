// US-070 (PB-P2-007 / BE-003). Catálogo i18n para el aviso `booking_confirmed`
// bilateral — se emite tanto al organizer como al vendor cuando el vendor
// confirma un `BookingIntent`. Se define en TypeScript por type-safety (paridad
// con `quote-received-templates.ts` de US-069).
//
// Placeholders permitidos EXCLUSIVAMENTE: ninguno.
// SEC-02 no-PII — nunca se interpola displayName, email, total ni breakdown de
// la Quote. Los subject/body son FIJOS por locale y por rol para prevenir fugas
// por interpolación accidental. La UI (US-071) resuelve el detalle cuando el
// destinatario navega al deep link.
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export type BookingConfirmedRole = 'organizer' | 'vendor';

interface BookingConfirmedTemplate {
  subject: string;
  body: string;
}

const CATALOG: Record<BookingConfirmedRole, Record<SupportedLanguage, BookingConfirmedTemplate>> = {
  organizer: {
    'es-LATAM': {
      subject: 'Reserva confirmada',
      body: 'El proveedor confirmó la reserva. Revisá el detalle para continuar con la organización.',
    },
    'es-ES': {
      subject: 'Reserva confirmada',
      body: 'El proveedor ha confirmado la reserva. Revisa el detalle para continuar con la organización.',
    },
    pt: {
      subject: 'Reserva confirmada',
      body: 'O prestador confirmou a reserva. Revise o detalhe para continuar com a organização.',
    },
    en: {
      subject: 'Booking confirmed',
      body: 'The vendor confirmed the booking. Open the detail to continue planning.',
    },
  },
  vendor: {
    'es-LATAM': {
      subject: 'Reserva confirmada',
      body: 'Registraste la confirmación de la reserva. Revisá el detalle para coordinar los siguientes pasos.',
    },
    'es-ES': {
      subject: 'Reserva confirmada',
      body: 'Has registrado la confirmación de la reserva. Revisa el detalle para coordinar los siguientes pasos.',
    },
    pt: {
      subject: 'Reserva confirmada',
      body: 'Você registrou a confirmação da reserva. Revise o detalhe para coordenar os próximos passos.',
    },
    en: {
      subject: 'Booking confirmed',
      body: 'You confirmed the booking. Open the detail to coordinate the next steps.',
    },
  },
};

export interface RenderedBookingConfirmedTemplate {
  subject: string;
  body: string;
}

/** Renderiza subject/body para `language` × `role`. Sin placeholders (SEC-02). */
export function renderBookingConfirmedTemplate(
  role: BookingConfirmedRole,
  language: SupportedLanguage,
): RenderedBookingConfirmedTemplate {
  const template = CATALOG[role][language];
  return { subject: template.subject, body: template.body };
}

/** Locales soportados (expuesto para tests exhaustivos). */
export function supportedBookingConfirmedLanguages(): readonly SupportedLanguage[] {
  return Object.keys(CATALOG.organizer) as SupportedLanguage[];
}
