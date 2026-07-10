'use client';

import { NextIntlClientProvider, useTranslations, type AbstractIntlMessages } from 'next-intl';
import type { ReactNode } from 'react';
import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from 'react-error-boundary';

function FallbackContent({ resetErrorBoundary }: FallbackProps) {
  const tErrors = useTranslations('errors');
  const tCommon = useTranslations('common');
  return (
    <main
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-8"
    >
      <h1 className="text-2xl font-bold">{tErrors('envelope.UNEXPECTED')}</h1>
      <button
        type="button"
        onClick={resetErrorBoundary}
        className="rounded border border-neutral-300 px-4 py-2 focus:outline-none focus:ring-2"
      >
        {tCommon('retry')}
      </button>
    </main>
  );
}

/**
 * `<ErrorBoundary>` raíz (AC-05) con `react-error-boundary`. Captura errores de **render** (no de
 * queries — esos los maneja TanStack Query). Como se monta por fuera del `<NextIntlClientProvider>`
 * principal, el fallback recibe `locale`/`messages` para poder traducir aunque el árbol falle (D1).
 */
export function ErrorBoundary({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => (
        <NextIntlClientProvider locale={locale} messages={messages}>
          <FallbackContent {...props} />
        </NextIntlClientProvider>
      )}
      onError={(error, info) => {
        // eslint-disable-next-line no-console
        console.error('ErrorBoundary caught', error, info);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
