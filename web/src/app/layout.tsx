import type { Metadata } from 'next';
import { Inter, Inter_Tight } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { SessionProvider } from '@/shared/auth-session';
import type { Locale } from '@/shared/i18n/config';
import { mapToBcp47 } from '@/shared/i18n/format';
import { ErrorBoundary, MSWProvider, QueryProvider } from '@/shared/providers';
import './globals.css';

/**
 * Tipografía aprobada (UI-DEC-004 / Design Tokens §12.1): `Inter` para body y UI,
 * `Inter Tight` para headings. Se cargan con `next/font/google` (self-hosted en build,
 * sin `<link>` a red en runtime) y se exponen como CSS variables que consume
 * `theme.fontFamily` en `tailwind.config.ts`.
 *
 * Pesos: sólo los aprobados por el sistema (400 / 500 / 600 / 700).
 * `subsets: ['latin', 'latin-ext']` cubre los 4 locales del MVP (es-LATAM, es-ES, pt, en).
 */
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const interTight = Inter_Tight({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter-tight',
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
    <html lang={mapToBcp47(locale)} className={`${inter.variable} ${interTight.variable}`}>
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
