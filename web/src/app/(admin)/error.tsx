'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const tErrors = useTranslations('errors');
  const tCommon = useTranslations('common');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-4 p-8">
      <p>{tErrors('envelope.UNEXPECTED')}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded border border-neutral-300 px-4 py-2"
      >
        {tCommon('retry')}
      </button>
    </div>
  );
}
