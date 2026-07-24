// US-131 / PB-P2-019 — Helper de render con providers para la suite A11Y (OPS-001).
// Envuelve `render` de Testing Library con `NextIntlClientProvider` (i18n activo, Doc 20 §a11y:
// las auditorías deben funcionar con el catálogo) + `QueryClientProvider` (data layer de US-106).
// Los mensajes se pasan como namespace parcial para evitar cargar todos los catálogos por test
// (patrón preexistente en us056/us061/us073). MSW ya está listo desde `vitest.setup.ts`.
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';

export type Locale = 'es-LATAM' | 'pt' | 'es-ES' | 'en';

/** Cliente Query de test — sin retries para que los errores de MSW se reflejen inmediato. */
function testQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

/** Wrapper con `NextIntl` + `QueryClientProvider`. `messages` es el subset relevante al test. */
function Providers({
  children,
  messages,
  locale = 'es-LATAM',
}: {
  children: React.ReactNode;
  messages: AbstractIntlMessages;
  locale?: Locale;
}): React.JSX.Element {
  const qc = testQueryClient();
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

/**
 * Renderiza un componente con providers de i18n + Query. Devuelve el `RenderResult` de RTL para
 * componer con `screen`, `container`, `user-event`, `auditA11y`, etc.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  {
    messages,
    locale = 'es-LATAM',
    ...renderOptions
  }: { messages: AbstractIntlMessages; locale?: Locale } & Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  return render(ui, {
    wrapper: ({ children }) => (
      <Providers messages={messages} locale={locale}>
        {children}
      </Providers>
    ),
    ...renderOptions,
  });
}
