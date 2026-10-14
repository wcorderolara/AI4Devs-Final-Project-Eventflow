import type { Metadata } from 'next';
import { Bodoni_Moda, Figtree } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { SessionProvider } from '@/shared/auth-session';
import type { Locale } from '@/shared/i18n/config';
import { mapToBcp47 } from '@/shared/i18n/format';
import { ErrorBoundary, MSWProvider, QueryProvider } from '@/shared/providers';
import './globals.css';

/**
 * Tipografía (UI-DEC-004 rev. 2 / Design Tokens §12.1): `Figtree` para toda la interfaz y
 * `Bodoni Moda` —la letra de las invitaciones impresas— sólo para los momentos display (titular
 * de la landing, nombre y fecha del evento). Se cargan con `next/font/google` (self-hosted en
 * build) y se exponen como CSS variables que consume `theme.fontFamily` en `tailwind.config.ts`.
 *
 * `subsets: ['latin', 'latin-ext']` cubre los 4 locales del MVP (es-LATAM, es-ES, pt, en).
 */
const sans = Figtree({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const display = Bodoni_Moda({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EventFlow',
  description: 'EventFlow — plataforma de gestión de eventos.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();

  // `lang` dinámico en BCP-47 efectivo (`es-LATAM → es-419`). Orden de providers (US-106 AC-01):
  // ErrorBoundary → QueryProvider → MSWProvider → SessionProvider → NextIntlClientProvider.
  return (
    <html lang={mapToBcp47(locale)} className={`${sans.variable} ${display.variable}`}>
      <head>
        <link rel="alternate" hrefLang="x-default" href="/" />
      </head>
      <body className="font-body">
        <ErrorBoundary locale={locale} messages={messages}>
          <QueryProvider>
            <MSWProvider>
              <SessionProvider>
                <NextIntlClientProvider locale={locale} messages={messages}>
                  {children}
                </NextIntlClientProvider>
              </SessionProvider>
            </MSWProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
