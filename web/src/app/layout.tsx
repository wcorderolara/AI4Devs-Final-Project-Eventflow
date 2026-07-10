import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { SessionProvider } from '@/shared/auth-session';
import type { Locale } from '@/shared/i18n/config';
import { mapToBcp47 } from '@/shared/i18n/format';
import { ErrorBoundary, MSWProvider, QueryProvider } from '@/shared/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'EventFlow',
  description: 'EventFlow — plataforma de gestión de eventos.',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();

  // `lang` dinámico en BCP-47 efectivo (`es-LATAM → es-419`). Orden de providers (US-106 AC-01):
  // ErrorBoundary → QueryProvider → MSWProvider → SessionProvider → NextIntlClientProvider.
  return (
    <html lang={mapToBcp47(locale)}>
      <head>
        <link rel="alternate" hrefLang="x-default" href="/" />
      </head>
      <body>
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
